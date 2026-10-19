import {
  MAX_CALLDATA_BYTES,
  MAX_REQUEST_BYTES,
  parseTransactionReference,
} from "../src/reference.js";
const CONFIG = new Map([
  [
    "ethereum",
    {
      id: 1,
      endpoints: [
        "https://ethereum-rpc.publicnode.com",
        "https://eth.llamarpc.com",
      ],
      explorer: "https://etherscan.io",
    },
  ],
  [
    "base",
    {
      id: 8453,
      endpoints: [
        "https://base-rpc.publicnode.com",
        "https://mainnet.base.org",
      ],
      explorer: "https://basescan.org",
    },
  ],
  [
    "avalanche",
    {
      id: 43114,
      endpoints: [
        "https://avalanche-c-chain-rpc.publicnode.com",
        "https://api.avax.network/ext/bc/C/rpc",
      ],
      explorer: "https://snowtrace.io",
    },
  ],
]);
const HASH = /^0x[0-9a-f]{64}$/i;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
function quantity(value) {
  if (typeof value !== "string" || !QUANTITY.test(value))
    throw new Error("Invalid RPC quantity");
  const n = Number(BigInt(value));
  if (!Number.isSafeInteger(n))
    throw new Error("RPC quantity outside safe bounds");
  return n;
}
async function rpc(endpoint, method, params, signal) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!res.ok) throw new Error("RPC unavailable");
  // Keep fixed-provider responses bounded too, including the response-body read.
  let obj;
  if (res.body?.getReader) {
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2000000) throw new Error("RPC response too large");
        chunks.push(value);
      }
    } catch (e) {
      await reader.cancel().catch(() => {});
      throw e;
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    obj = JSON.parse(new TextDecoder().decode(data));
  } else obj = await res.json();
  if (
    !obj ||
    obj.error ||
    obj.jsonrpc !== "2.0" ||
    obj.id !== 1 ||
    !Object.hasOwn(obj, "result")
  )
    throw new Error("Invalid RPC response");
  return obj.result;
}
export async function replayTransaction(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Use a JSON object with a transaction reference.");
  const ref = parseTransactionReference(body.reference, body.chain);
  const config = CONFIG.get(ref.chain);
  let pending = false;
  for (const endpoint of config.endpoints) {
    try {
      // One deadline covers all fetches and body reads for this provider (2 × 11s < function limit).
      const signal = AbortSignal.timeout(11000);
      const [id, tx, receipt] = await Promise.all([
        rpc(endpoint, "eth_chainId", [], signal),
        rpc(endpoint, "eth_getTransactionByHash", [ref.hash], signal),
        rpc(endpoint, "eth_getTransactionReceipt", [ref.hash], signal),
      ]);
      if (quantity(id) !== config.id) continue;
      if (!tx) continue;
      if (typeof tx.hash !== "string" || tx.hash.toLowerCase() !== ref.hash)
        continue;
      if (!tx.blockNumber || !receipt) {
        pending = true;
        continue;
      }
      if (
        !HASH.test(tx.blockHash) ||
        receipt.transactionHash?.toLowerCase() !== ref.hash ||
        receipt.blockHash?.toLowerCase() !== tx.blockHash.toLowerCase()
      )
        continue;
      const blockNumber = quantity(tx.blockNumber);
      if (
        quantity(receipt.blockNumber) !== blockNumber ||
        !["0x0", "0x1"].includes(receipt.status)
      )
        continue;
      if (!ADDRESS.test(tx.from) || !(tx.to === null || ADDRESS.test(tx.to)))
        continue;
      if (typeof tx.input !== "string") continue;
      if (tx.input.length > MAX_CALLDATA_BYTES * 2 + 2)
        return {
          error:
            "This transaction exceeds the 500 KB calldata inspection limit.",
          status: 413,
        };
      if (!/^0x(?:[a-f0-9]{2})*$/i.test(tx.input)) continue;
      const block = await rpc(
        endpoint,
        "eth_getBlockByHash",
        [tx.blockHash, false],
        signal,
      );
      if (
        !block ||
        block.hash?.toLowerCase() !== tx.blockHash.toLowerCase() ||
        quantity(block.number) !== blockNumber
      )
        continue;
      const blockTimestamp = quantity(block.timestamp) * 1000;
      if (
        !Number.isSafeInteger(blockTimestamp) ||
        blockTimestamp <= 0 ||
        blockTimestamp > 8640000000000000
      )
        continue;
      if (
        typeof receipt.gasUsed !== "string" ||
        receipt.gasUsed.length > 66 ||
        !QUANTITY.test(receipt.gasUsed)
      )
        continue;
      return {
        calldata: tx.input,
        context: {
          hash: ref.hash,
          chain: ref.chain,
          chainId: config.id,
          from: tx.from,
          to: tx.to,
          blockNumber,
          blockHash: tx.blockHash,
          blockTimestamp,
          status: receipt.status === "0x1" ? "success" : "reverted",
          gasUsed: BigInt(receipt.gasUsed).toString(),
          explorer: config.explorer + "/tx/" + ref.hash,
          rpcHost: new URL(endpoint).hostname,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch {
      /* Try the second fixed public provider. Never expose provider/internal errors. */
    }
  }
  return pending
    ? {
        error:
          "This transaction is pending. Try again after it is included in a block.",
        status: 409,
      }
    : {
        error:
          "Transaction could not be retrieved. Check its hash and network, or try again: public RPCs can be rate-limited. You can still inspect its raw calldata locally.",
        status: 502,
      };
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  try {
    const declared = Number(req.headers?.["content-length"]);
    if (declared > MAX_REQUEST_BYTES)
      return res.status(413).json({ error: "Request too large." });
    let body = req.body;
    const encoded =
      typeof body === "string" ? body : JSON.stringify(body ?? {});
    if (Buffer.byteLength(encoded) > MAX_REQUEST_BYTES)
      return res.status(413).json({ error: "Request too large." });
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Use a valid JSON object." });
      }
    }
    const result = await replayTransaction(body);
    return res.status(result.status ?? 200).json(result);
  } catch {
    return res
      .status(400)
      .json({
        error:
          "Use a supported transaction hash or explorer URL and choose Ethereum, Base or Avalanche.",
      });
  }
}
