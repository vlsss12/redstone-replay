import { test } from "node:test";
import assert from "node:assert/strict";
import handler, { replayTransaction } from "../api/replay.js";
const hash = "0x" + "1".repeat(64),
  block = "0x" + "2".repeat(64),
  address = "0x" + "3".repeat(40);
function values() {
  return {
    eth_chainId: "0x1",
    eth_getTransactionByHash: {
      hash,
      blockNumber: "0x10",
      blockHash: block,
      input: "0x",
      from: address,
      to: address,
    },
    eth_getTransactionReceipt: {
      transactionHash: hash,
      blockHash: block,
      blockNumber: "0x10",
      status: "0x1",
      gasUsed: "0x5208",
    },
    eth_getBlockByHash: { hash: block, number: "0x10", timestamp: "0x64" },
  };
}
async function withRpc(edit, run) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, opts) => {
    calls++;
    const { method } = JSON.parse(opts.body);
    let result = values()[method];
    result = edit ? edit({ url, method, result }) : result;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await run(() => calls);
  } finally {
    globalThis.fetch = original;
  }
}
test("wrong-chain provider fails over and consistent evidence is returned", async () =>
  withRpc(
    ({ url, method, result }) =>
      method === "eth_chainId" && url.includes("publicnode") ? "0x2" : result,
    async () => {
      const r = await replayTransaction({ reference: hash, chain: "ethereum" });
      assert.equal(r.context.blockTimestamp, 100000);
      assert.equal(r.context.gasUsed, "21000");
      assert.equal(r.context.rpcHost, "eth.llamarpc.com");
    },
  ));
test("inconsistent receipts and block numbers never produce a successful report", async () => {
  for (const target of ["eth_getTransactionReceipt", "eth_getBlockByHash"])
    await withRpc(
      ({ method, result }) =>
        method === target
          ? {
              ...result,
              [target === "eth_getBlockByHash" ? "number" : "blockNumber"]:
                "0x11",
            }
          : result,
      async () =>
        assert.equal(
          (await replayTransaction({ reference: hash })).status,
          502,
        ),
    );
});
test("malformed RPC calldata and statuses are rejected", async () => {
  for (const status of ["0x2", null])
    await withRpc(
      ({ method, result }) =>
        method === "eth_getTransactionReceipt" ? { ...result, status } : result,
      async () =>
        assert.equal(
          (await replayTransaction({ reference: hash })).status,
          502,
        ),
    );
  await withRpc(
    ({ method, result }) =>
      method === "eth_getTransactionByHash"
        ? { ...result, input: "0xodd" }
        : result,
    async () =>
      assert.equal((await replayTransaction({ reference: hash })).status, 502),
  );
});
test("a stale pending provider does not hide a confirmed transaction on fallback", async () =>
  withRpc(
    ({ url, method, result }) =>
      url.includes("publicnode") && method === "eth_getTransactionReceipt"
        ? null
        : result,
    async () =>
      assert.ok((await replayTransaction({ reference: hash })).context),
  ));
test("pending transactions return 409 when no provider can confirm them", async () =>
  withRpc(
    ({ method, result }) =>
      method === "eth_getTransactionReceipt" ? null : result,
    async () =>
      assert.equal((await replayTransaction({ reference: hash })).status, 409),
  ));
test("invalid references and prototype keys make no outbound RPC calls", async () =>
  withRpc(null, async (calls) => {
    for (const body of [
      null,
      [],
      {},
      { reference: hash, chain: "__proto__" },
      { reference: hash, chain: "constructor" },
    ])
      await assert.rejects(replayTransaction(body));
    assert.equal(calls(), 0);
  }));
function response() {
  return {
    headers: {},
    code: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(v) {
      this.code = v;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
}
test("HTTP handler rejects methods and malformed or oversized JSON before lookup", async () =>
  withRpc(null, async (calls) => {
    for (const [req, status] of [
      [{ method: "GET" }, 405],
      [{ method: "POST", body: "{" }, 400],
      [{ method: "POST", body: [] }, 400],
      [{ method: "POST", body: " ".repeat(3001) }, 413],
      [
        {
          method: "POST",
          body: { reference: hash },
          headers: { "content-length": "3001" },
        },
        413,
      ],
    ]) {
      const r = response();
      await handler(req, r);
      assert.equal(r.code, status);
      assert.equal(r.headers["Cache-Control"], "no-store");
      assert.ok(r.body.error);
      if (status === 405) assert.equal(r.headers.Allow, "POST");
    }
    assert.equal(calls(), 0);
  }));
test("oversized RPC bodies are rejected without exposing their content", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(2000001));
  try {
    const r = await replayTransaction({ reference: hash });
    assert.equal(r.status, 502);
    assert.ok(!r.error.includes("xxxxx"));
  } finally {
    globalThis.fetch = original;
  }
});
