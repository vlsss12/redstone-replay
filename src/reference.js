export const CHAINS = Object.freeze(["ethereum", "base", "avalanche"]);
export const MAX_CALLDATA_BYTES = 500000;
export const MAX_REQUEST_BYTES = 3000;
const EXPLORERS = new Map([
  ["etherscan.io", "ethereum"],
  ["www.etherscan.io", "ethereum"],
  ["basescan.org", "base"],
  ["www.basescan.org", "base"],
  ["snowtrace.io", "avalanche"],
  ["www.snowtrace.io", "avalanche"],
  ["avalanche.routescan.io", "avalanche"],
]);
export function parseTransactionReference(input, selectedChain = "ethereum") {
  if (typeof input !== "string" || input.length > 2048)
    throw new Error(
      "Paste a transaction hash or a supported explorer transaction URL.",
    );
  const text = input.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(text)) {
    if (!CHAINS.includes(selectedChain))
      throw new Error("Choose Ethereum, Base or Avalanche.");
    return { hash: text.toLowerCase(), chain: selectedChain };
  }
  let u;
  try {
    u = new URL(text);
  } catch {
    throw new Error(
      "Paste a transaction hash or a supported explorer transaction URL.",
    );
  }
  const chain = EXPLORERS.get(u.hostname);
  const hash = u.pathname.match(/^\/tx\/(0x[0-9a-fA-F]{64})\/?$/)?.[1];
  if (
    !chain ||
    !hash ||
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error(
      "Supported explorers: Etherscan, Basescan, Snowtrace and Avalanche Routescan.",
    );
  return { hash: hash.toLowerCase(), chain };
}

// Browser storage is untrusted; one damaged item must not discard valid history.
export function normalizeRecentReferences(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.hash !== "string" ||
        !/^0x[0-9a-f]{64}$/i.test(item.hash) ||
        !CHAINS.includes(item.chain)
      )
        return false;
      const key = item.chain + ":" + item.hash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4)
    .map(({ hash, chain }) => ({ hash: hash.toLowerCase(), chain }));
}
