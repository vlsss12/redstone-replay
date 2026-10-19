import { RedstonePayload } from '@redstone-finance/protocol';
import { utils } from 'ethers';

export const MARKER = '000002ed57011e0000';
export const VERSION = '1.0.0';
export const SOURCES = {
  parser: 'https://github.com/redstone-finance/redstone-evm-examples/blob/main/scripts/parse-redstone-payload.js',
  consumer: 'https://github.com/redstone-finance/redstone-oracles-monorepo/blob/main/packages/evm-connector/contracts/core/RedstoneConsumerBase.sol',
  defaults: 'https://github.com/redstone-finance/redstone-oracles-monorepo/blob/main/packages/evm-connector/contracts/core/RedstoneDefaultsLib.sol',
  protocol: 'https://www.npmjs.com/package/@redstone-finance/protocol/v/1.0.0'
};

export function normalizeCalldata(input) {
  let text = String(input ?? '').trim();
  if (text.startsWith('{')) {
    let obj;
    try { obj = JSON.parse(text); } catch { throw new Error('The transaction JSON is not valid. Paste its input/data field or a valid JSON object.'); }
    text = obj.input ?? obj.data ?? '';
  }
  if (typeof text !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(text)) throw new Error('Use an even-length hexadecimal value beginning with 0x.');
  if (text.length > 1000002) throw new Error('Calldata exceeds the 500 KB inspection limit.');
  return text;
}

export function parseTransactionReference(input, selectedChain = 'ethereum') {
  const text = String(input).trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(text)) return { hash: text, chain: selectedChain };
  let u;
  try { u = new URL(text); } catch { throw new Error('Paste a transaction hash or a supported explorer transaction URL.'); }
  const hosts = { 'etherscan.io': 'ethereum', 'www.etherscan.io': 'ethereum', 'basescan.org': 'base', 'www.basescan.org': 'base', 'snowtrace.io': 'avalanche', 'www.snowtrace.io': 'avalanche', 'avalanche.routescan.io': 'avalanche' };
  const hash = u.pathname.match(/\/tx\/(0x[0-9a-fA-F]{64})(?:\/|$)/)?.[1];
  if (!hosts[u.hostname] || !hash || u.protocol !== 'https:') throw new Error('Supported explorers: Etherscan, Basescan, Snowtrace and Avalanche Routescan.');
  return { hash, chain: hosts[u.hostname] };
}

function feedLabel(value) {
  if (typeof value === 'string') return value.replace(/\0/g, '') || '(empty feed ID)';
  try { return utils.toUtf8String(value).replace(/\0/g, ''); } catch { return utils.hexlify(value); }
}

export function analyzeCalldata(input, options = {}) {
  const calldata = normalizeCalldata(input);
  const decimals = Number(options.decimals ?? 8);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Display decimals must be an integer between 0 and 36.');
  const base = { version: VERSION, calldataBytes: (calldata.length - 2) / 2, calldataHash: utils.keccak256(calldata), decimals, sources: SOURCES, context: options.context ?? null };
  if (!calldata.toLowerCase().endsWith(MARKER)) return { ...base, supported: false, reason: 'No trailing RedStone marker was found in the top-level calldata. This does not prove the transaction did not use RedStone: nested calls, stored push feeds and other delivery models are outside this inspector’s scope.', packages: [], feeds: [] };
  let parsed;
  try { parsed = RedstonePayload.parse(utils.arrayify(calldata)); } catch { throw new Error('A RedStone marker is present, but the payload cannot be parsed. It may be truncated, malformed, or use an unsupported encoding.'); }
  if (!parsed.signedDataPackages.length || parsed.signedDataPackages.length > 500) throw new Error('The payload package count is empty or exceeds the inspection limit.');
  let metadata;
  try { metadata = utils.toUtf8String(parsed.unsignedMetadata); } catch { metadata = utils.hexlify(parsed.unsignedMetadata); }
  const packages = parsed.signedDataPackages.map((p, index) => {
    let signer;
    try { signer = p.recoverSignerAddress(); } catch { throw new Error(`Cannot recover the signer of package ${index + 1}. The signature or encoding is invalid.`); }
    const timestamp = p.dataPackage.timestampMilliseconds;
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || timestamp > 8640000000000000) throw new Error('The payload contains an invalid timestamp.');
    return {
      index, signer, timestamp,
      signature: p.serializeSignatureToHex(),
      dataPoints: p.dataPackage.dataPoints.map(dp => ({
        feedId: feedLabel(dp.dataFeedId), rawValue: BigInt(utils.hexlify(dp.value)).toString(),
        value: utils.formatUnits(dp.value, decimals), byteLength: dp.value.length
      }))
    };
  });
  const grouped = new Map();
  for (const p of packages) for (const dp of p.dataPoints) {
    if (!grouped.has(dp.feedId)) grouped.set(dp.feedId, []);
    grouped.get(dp.feedId).push({ ...dp, signer: p.signer, timestamp: p.timestamp, packageIndex: p.index });
  }
  const feeds = [...grouped].map(([id, observations]) => {
    const unique = new Map();
    for (const o of observations) if (!unique.has(o.signer.toLowerCase())) unique.set(o.signer.toLowerCase(), o);
    const values = [...unique.values()].map(o => BigInt(o.rawValue)).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2n;
    return { id, observations, uniqueSigners: unique.size, duplicateObservations: observations.length - unique.size, rawMedian: median.toString(), displayMedian: utils.formatUnits(median.toString(), decimals) };
  });
  const timestamps = [...new Set(packages.map(p => p.timestamp))];
  const referenceTime = options.referenceTime == null ? null : Number(options.referenceTime);
  if (referenceTime !== null && (!Number.isFinite(referenceTime) || referenceTime <= 0)) throw new Error('Reference timestamp must be a positive time in milliseconds.');
  const ageSeconds = referenceTime === null ? null : (Math.floor(referenceTime / 1000) - Math.floor(Math.min(...timestamps) / 1000));
  // Mirrors the default library's second-resolution comparison. A deployed consumer may override it.
  const defaultWindowPass = referenceTime === null ? null : packages.every(p => {
    const delta = Math.floor(referenceTime / 1000) - Math.floor(p.timestamp / 1000);
    return delta <= 180 && delta >= -60;
  });
  return { ...base, supported: true, metadata, prefix: utils.hexlify(parsed.remainderPrefix), selector: utils.hexlify(parsed.remainderPrefix).slice(0,10), packages, feeds, timestamps, timestampConsistent: timestamps.length === 1, uniqueSigners: new Set(packages.map(p=>p.signer.toLowerCase())).size, referenceTime, ageSeconds, defaultWindowPass,
    limitations: ['Recovered signer addresses are not checked against the consumer’s authorised signer set.', 'The decoded median is descriptive: deployed contracts may use a threshold-limited subset or custom aggregation.', 'The display decimal setting is supplied by the viewer, not verified against a feed specification.', 'Top-level calldata inspection is not an EVM execution replay; internal calls and downstream price use are not traced.', 'Unsigned metadata is an untrusted label; it is not evidence of a data service’s identity.'] };
}
