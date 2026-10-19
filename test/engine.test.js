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

function payloadFromPackages(packages) {
  return utils.hexConcat([
    ...packages,
    utils.hexZeroPad(utils.hexlify(packages.length), 2),
    "0x000000",
    "0x000002ed57011e0000",
  ]);
}
test("signed bytes must survive parser round-trip before signer recovery", () => {
  const p = RedstonePayload.parse(bytes);
  const one = p.signedDataPackages[0].toBytes();
  const embeddedNull = one.slice();
  embeddedNull[1] = 0;
  // The parser strips this zero and would recover against different bytes.
  assert.throws(
    () => analyzeCalldata(payloadFromPackages([embeddedNull])),
    /cannot preserve exactly/,
  );
  const pointA = one.slice(0, 64),
    pointZ = pointA.slice();
  pointZ.set(utils.arrayify(utils.formatBytes32String("ZZZ")), 0);
  const tail = one.slice(64);
  tail[12] = 2;
  // The parser also sorts observations; reject unsorted signed data rather than alter it.
  const unsorted = utils.concat([pointZ, pointA, tail]);
  assert.throws(
    () => analyzeCalldata(payloadFromPackages([unsorted])),
    /cannot preserve exactly/,
  );
});
test("an even-sized median preserves half a raw unit without floating-point loss", () => {
  const p = RedstonePayload.parse(bytes);
  const packages = p.signedDataPackages.slice(0, 2).map((pkg, i) => {
    const b = pkg.toBytes().slice();
    b.set(utils.arrayify(utils.hexZeroPad(utils.hexlify(100 + i), 32)), 32);
    return b;
  });
  const data = payloadFromPackages(packages);
  const a = analyzeCalldata(data, { decimals: 0 });
  const b = analyzeCalldata(data, { decimals: 2 });
  assert.equal(a.feeds[0].uniqueSigners, 2);
  assert.equal(a.feeds[0].rawMedian, "100.5");
  assert.equal(a.feeds[0].displayMedian, "100.5");
  assert.equal(b.feeds[0].displayMedian, "1.005");
});
test("binary unsigned metadata remains byte-exact and is displayed as hex", () => {
  const p = RedstonePayload.parse(bytes);
  const data =
    "0x" +
    RedstonePayload.prepare(p.signedDataPackages, utils.arrayify("0xff00fe"));
  assert.equal(analyzeCalldata(data).metadata, "0xff00fe");
});

test("damaged recent-history items cannot hide valid references or inject extra fields", async () => {
  const { normalizeRecentReferences } = await import("../src/reference.js");
  const hash = "0x" + "A".repeat(64);
  const value = [
    null,
    7,
    { hash, chain: "ethereum", extra: "discard" },
    { hash: hash.toLowerCase(), chain: "ethereum" },
    { hash, chain: "base" },
    { hash, chain: "__proto__" },
  ];
  assert.deepEqual(normalizeRecentReferences(value), [
    { hash: hash.toLowerCase(), chain: "ethereum" },
    { hash: hash.toLowerCase(), chain: "base" },
  ]);
  for (const input of [null, {}, "bad"])
    assert.deepEqual(normalizeRecentReferences(input), []);
});
