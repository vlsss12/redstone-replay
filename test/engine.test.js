import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RedstonePayload } from "@redstone-finance/protocol";
import { utils } from "ethers";
import {
  analyzeCalldata,
  normalizeCalldata,
  parseTransactionReference,
} from "../src/engine.js";
import { validatePayloadLayout } from "../src/payload-layout.js";
const fixture = JSON.parse(
  readFileSync(new URL("../src/fixtures.json", import.meta.url)),
);
const bytes = utils.arrayify(fixture.calldata);
test("official signed fixture recovers expected observations and addresses", () => {
  const r = analyzeCalldata(fixture.calldata);
  assert.equal(r.packages.length, 3);
  assert.equal(r.uniqueSigners, 3);
  assert.equal(r.feeds[0].id, "AVAX");
  assert.equal(
    r.packages[0].signer,
    "0x109B4a318A4F5ddcbCA6349B45f881B4137deaFB",
  );
  assert.equal(r.timestamps[0], 1678459260000);
  assert.equal(r.defaultWindowPass, null);
  assert.equal(r.feeds[0].displayMedian, "14.689");
  assert.equal(r.selector, "0x43419ea3");
  assert.ok(r.limitations.length >= 5);
});
test("timing boundaries use default second resolution", () => {
  const t = 1678459260000;
  for (const [delta, pass] of [
    [180, true],
    [181, false],
    [-60, true],
    [-61, false],
  ])
    assert.equal(
      analyzeCalldata(fixture.calldata, { referenceTime: t + delta * 1000 })
        .defaultWindowPass,
      pass,
    );
});
test("display scaling does not alter raw evidence", () => {
  const a = analyzeCalldata(fixture.calldata),
    b = analyzeCalldata(fixture.calldata, { decimals: 0 });
  assert.equal(a.feeds[0].rawMedian, b.feeds[0].rawMedian);
  assert.notEqual(a.feeds[0].displayMedian, b.feeds[0].displayMedian);
  for (const decimals of [-1, 37, 1.5, NaN])
    assert.throws(() => analyzeCalldata(fixture.calldata, { decimals }));
});
test("invalid dates cannot enter a report and crash date rendering", () => {
  for (const referenceTime of [Infinity, 1e20, -1, 1.5, NaN])
    assert.throws(
      () => analyzeCalldata(fixture.calldata, { referenceTime }),
      /valid positive date/,
    );
});
test("empty calldata is unsupported and truncated payloads fail safely", () => {
  assert.equal(analyzeCalldata("0x").supported, false);
  assert.throws(
    () => analyzeCalldata("0x000002ed57011e0000"),
    /cannot be parsed/,
  );
  for (const n of [5, 20, 100])
    assert.throws(
      () => analyzeCalldata("0x" + fixture.calldata.slice(2 + n * 2)),
      /cannot be parsed/,
    );
});
test("transaction JSON and limits are validated before traversal", () => {
  assert.equal(normalizeCalldata('{"input":"0xabcd"}'), "0xabcd");
  for (const value of [
    "0xabc",
    '{"input":7}',
    '{"input":null}',
    '{"data":{}}',
    null,
  ])
    assert.throws(() => normalizeCalldata(value));
  assert.throws(() => normalizeCalldata("0x" + "aa".repeat(500001)));
  assert.throws(() => normalizeCalldata(" ".repeat(1016385)));
});
test("references reject prototype-chain names, credentials, ports and wrong paths", () => {
  const h = "0x" + "A".repeat(64);
  assert.deepEqual(parseTransactionReference("https://basescan.org/tx/" + h), {
    hash: h.toLowerCase(),
    chain: "base",
  });
  for (const url of [
    `https://constructor/tx/${h}`,
    `https://__proto__/tx/${h}`,
    `https://etherscan.io:999/tx/${h}`,
    `https://u:p@etherscan.io/tx/${h}`,
    `https://etherscan.io/x/tx/${h}`,
    `https://evil.test/tx/${h}`,
    `http://etherscan.io/tx/${h}`,
  ])
    assert.throws(() => parseTransactionReference(url));
  for (const chain of ["constructor", "__proto__", "toString", "unknown"])
    assert.throws(() => parseTransactionReference(h, chain));
  assert.throws(() => parseTransactionReference({}));
  assert.throws(() => parseTransactionReference("x".repeat(2049)));
});
function changeField(back, length, value) {
  const b = bytes.slice();
  let i = b.length - back - 1;
  for (let j = 0; j < length; j++) {
    b[i - j] = value & 255;
    value = Math.floor(value / 256);
  }
  return b;
}
const metaLength = bytes.slice(-12, -9).reduce((n, b) => n * 256 + b, 0),
  packageBack = 12 + metaLength + 2;
test("untrusted package/point counts and byte widths are bounded before the parser", () => {
  assert.doesNotThrow(() => validatePayloadLayout(bytes));
  for (const b of [
    changeField(12 + metaLength, 2, 65535),
    changeField(9, 3, 16777215),
    changeField(packageBack + 65, 3, 16777215),
    changeField(packageBack + 65 + 3, 4, 0),
    changeField(packageBack + 65 + 3, 4, 33),
  ])
    assert.throws(() => validatePayloadLayout(b));
});
test("duplicate signer observations are counted once for the descriptive median", () => {
  const p = RedstonePayload.parse(bytes);
  const data =
    "0x" +
    RedstonePayload.prepare(
      [...p.signedDataPackages, p.signedDataPackages[0]],
      p.unsignedMetadata,
    );
  const r = analyzeCalldata(data);
  assert.equal(r.packages.length, 4);
  assert.equal(r.feeds[0].uniqueSigners, 3);
  assert.equal(r.feeds[0].duplicateObservations, 1);
  assert.equal(r.feeds[0].displayMedian, "14.689");
});
test("unsigned hostile metadata is preserved as untrusted data, not trusted identity", () => {
  const p = RedstonePayload.parse(bytes),
    metadata = "<img src=x onerror=alert(1)>";
  const data = "0x" + RedstonePayload.prepare(p.signedDataPackages, metadata);
  assert.equal(analyzeCalldata(data).metadata, metadata);
});
