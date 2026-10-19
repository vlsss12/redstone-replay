import { normalizeRecentReferences } from "./reference.js";
import { decodePayload } from "./decode.js";
import { setupGuide } from "./guide.js";
import "./style.css";
import {
  analyzeCalldata,
  parseTransactionReference,
  SOURCES,
} from "./engine.js";
import fixture from "./fixtures.json";

const icons = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M7 12H4v9h16v-9h-3"/>',
  book: '<path d="M12 5c-4-3-8-2-10-1v15c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-1-7-2-10 1Zm0 0v14"/>',
  layers: '<path d="m12 2 10 6-10 6L2 8Zm-10 11 10 6 10-6M2 18l10 6 10-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  external: '<path d="M14 3h7v7M21 3 10 14m0-10H3v17h17v-7"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.info}</svg>`;
const mark = `<svg class="brand-mark" viewBox="0 0 36 42" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 15 9-15 9L3 11Zm-15 18 15 9 15-9M3 29l15 10 15-10"/></svg>`;
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const short = (x) => (x ? `${x.slice(0, 8)}…${x.slice(-6)}` : "—");
const date = (t) =>
  new Date(t).toISOString().replace("T", " ").replace(".000Z", " UTC");
let mode = "tx",
  technical = false,
  result,
  example = "signed",
  busy = false;
let inspectionController;
let recent = [];
try {
  const stored = localStorage.getItem("replay-recent");
  if (stored && stored.length < 20000)
    recent = normalizeRecentReferences(JSON.parse(stored));
} catch {}
const drafts = { tx: "", raw: "" };
let chosenChain = "ethereum",
  displayDecimals = "8",
  referenceDate = "";
function saveDraft() {
  const input = document.querySelector("#reference");
  if (input) drafts[mode] = input.value;
  chosenChain = document.querySelector("#chain")?.value || chosenChain;
  displayDecimals =
    document.querySelector("#decimals")?.value ?? displayDecimals;
  referenceDate =
    document.querySelector("#reference-time")?.value ?? referenceDate;
}
function recentMarkup() {
  return recent.length
    ? recent
        .map(
          (r, i) =>
            `<button data-recent="${i}">${esc(r.chain)} · ${short(r.hash)}</button>`,
        )
        .join("")
    : `<div class="empty-recent">${icon("clock")}<p>Your inspected transactions<br>will appear here.</p></div>`;
}
function shell() {
  document.querySelector("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><a class="brand" href="/">${mark}<div class="brand-name">RedStone<span>REPLAY</span></div></a><div class="side-caption">WORKSPACE</div><nav class="nav"><a class="nav-link" href="/community/">${icon("book")}Community guide</a><button class="active" data-action="replay">${icon("search")}Payload inspector</button><button data-action="examples">${icon("layers")}Explore examples</button><button data-action="method">${icon("book")}Methodology</button></nav><div class="side-caption recent-caption">RECENT INSPECTIONS</div><div class="recent-list">${recentMarkup()}</div><div class="side-bottom"><div class="side-note"><div class="privacy-icon">${icon("lock")}</div><strong>Explore with confidence.</strong><p>Read-only inspection. Raw calldata is decoded in your browser.</p></div><div class="maker"><span class="maker-avatar">V</span><span>Built by <strong>VLS</strong><small>Independent community project</small></span></div></div></aside><main class="workspace" id="main"><header class="topbar"><div class="crumb"><span class="workspace-icon">${icon("layers")}</span> Workspace <span>/</span> <strong>Payload inspector</strong></div><a class="mobile-brand" href="/">${mark} RedStone Replay</a><div class="top-actions"><a class="community-entry" href="/community/">${icon("book")}New here? Start here</a><span class="version"><span></span> Read-only workspace</span></div></header><div class="content"><section class="hero"><div><div class="eyebrow"><span class="red-dot"></span> THE REDSTONE PAYLOAD INSPECTOR</div><h1>From calldata<br>to <em>clarity.</em></h1><p>Unpack the data behind a price. Explore signed observations, timestamps and recovered signers in one clear view.</p></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit-core">${mark}</div><span class="orbit-tag tag-one">${icon("code")} CALLDATA</span><span class="orbit-tag tag-two">${icon("check")} SIGNATURES</span><span class="orbit-tag tag-three">${icon("layers")} OBSERVATIONS</span></div></section><form class="panel entry-card" id="inspect-form" novalidate><div class="entry-top"><div class="input-tabs" aria-label="Input type"><button type="button" data-mode="tx" class="${mode === "tx" ? "active" : ""}">${icon("search")}Transaction</button><button type="button" data-mode="raw" class="${mode === "raw" ? "active" : ""}">${icon("code")}Raw calldata</button></div><span class="supported"><span class="network-dot"></span> ETHEREUM / BASE / AVALANCHE</span></div><div class="entry-label"><label for="reference">${mode === "tx" ? "Transaction hash or explorer URL" : "Paste calldata or transaction JSON"}</label>${mode === "tx" ? '<select class="network" id="chain" aria-label="Network"><option value="ethereum">Ethereum</option><option value="base">Base</option><option value="avalanche">Avalanche</option></select>' : ""}</div><div class="${mode === "tx" ? "input-wrap" : "calldata-row"}">${mode === "tx" ? `<div class="input-box">${icon("search")}<input id="reference" maxlength="2048" required autocomplete="off" spellcheck="false" placeholder="0x… or https://etherscan.io/tx/…" aria-label="Transaction hash or explorer URL"></div>` : '<textarea id="reference" maxlength="1016384" required spellcheck="false" placeholder="0x…" aria-label="Raw calldata"></textarea>'}<button class="primary" type="submit" ${busy ? "disabled" : ""}>Inspect payload${icon("arrow")}</button></div><div class="entry-bottom"><span>${icon("lock")}No wallet connection required. Read-only by design.</span><button type="button" class="text-button" data-action="advanced" aria-label="Display settings" aria-controls="advanced" aria-expanded="false">Display settings</button></div><div class="input-advanced" hidden id="advanced"><label>Display decimals<input id="decimals" type="number" min="0" max="36" value="8" required></label>${mode === "raw" ? '<label>Reference time (optional)<input id="reference-time" type="datetime-local" step="1"></label>' : ""}<p>8 decimals is a display assumption. For transactions, timing is compared with the block timestamp; a consumer can override the default window.</p></div><div id="error" role="alert"></div></form><section class="samples-section" id="examples"><div class="section-label"><h2>Explore an example</h2><span>NO TRANSACTION? START HERE</span></div><div class="sample-grid">${[
      [
        "signed",
        "Signed AVAX payload",
        "3 packages. Every observation, decoded.",
        "OFFICIAL FIXTURE",
        "layers",
      ],
      [
        "empty",
        "No RedStone marker",
        "See the limits of top-level inspection.",
        "SCOPE EXAMPLE",
        "search",
      ],
      [
        "broken",
        "Malformed payload",
        "Understand an incomplete data package.",
        "EDGE CASE",
        "code",
      ],
    ]
      .map(
        ([id, title, desc, badge, ic]) =>
          `<button class="sample ${example === id ? "active" : ""}" data-example="${id}"><span class="sample-arrow">${icon("arrow")}</span><div class="sample-top"><span class="sample-icon">${icon(ic)}</span><span class="tiny-badge">${badge}</span></div><h3>${title}</h3><p>${desc}</p></button>`,
      )
      .join(
        "",
      )}</div></section><section class="result-area" id="results" aria-live="polite"></section><footer class="footer"><div><strong>RedStone Replay</strong> · Independent community project.<br>Built by VLS. Open the bytes. Understand the data.</div><div class="footer-links"><button class="text-button" data-action="method">Methodology & privacy</button><a href="${SOURCES.protocol}" target="_blank" rel="noopener">Built with the official parser ↗</a></div></footer></div></main></div><dialog id="method-dialog" aria-labelledby="method-title"><div class="dialog-head"><h2 id="method-title">What this replay actually shows</h2><button class="icon-button" data-action="close" aria-label="Close">${icon("close")}</button></div><div class="dialog-body"><p>Replay makes a signed RedStone pull payload readable. It decodes the bytes attached to a transaction’s top-level calldata using the official protocol library and recovers each package’s signing address.</p><h3>Evidence, with boundaries</h3><ul><li>Recovered signatures identify addresses, but do not prove those addresses are authorised by the receiving contract.</li><li>The median shown is descriptive, deduplicated by signer per feed. A consumer may select a threshold subset or use different aggregation.</li><li>Default timing uses a maximum age of 180 seconds and a future tolerance of 60 seconds, relative to the transaction block. Consumer contracts can override these defaults.</li><li>Display decimals are your setting; they are not verified against a feed specification. Numeric values need not represent USD prices.</li><li>This is not an EVM execution simulator. Nested calls, push feeds and the price actually used by a consumer are outside scope. No marker does not mean no RedStone use.</li><li>The official example is a historical signed fixture, not a claimed onchain transaction. Unsigned metadata is untrusted.</li></ul><h3>Your data</h3><p>Raw calldata stays in this browser. Transaction lookup sends the hash and network to this site’s API, which queries fixed public RPC providers. No wallet or account is required. Recent transaction references are saved locally; share links contain only a public hash and network or a fixture name. Hosting and RPC providers may retain routine request logs.</p><h3>Inspect the implementation</h3><p><a href="${SOURCES.parser}" target="_blank" rel="noopener">Official example</a> · <a href="${SOURCES.consumer}" target="_blank" rel="noopener">Consumer implementation</a> · <a href="${SOURCES.defaults}" target="_blank" rel="noopener">Default timing library</a> · <a href="${SOURCES.protocol}" target="_blank" rel="noopener">Protocol parser v1.0.0</a></p></div></dialog>`;
  document.querySelector("#reference").value = drafts[mode];
  if (document.querySelector("#chain"))
    document.querySelector("#chain").value = chosenChain;
  document.querySelector("#decimals").value = displayDecimals;
  if (document.querySelector("#reference-time"))
    document.querySelector("#reference-time").value = referenceDate;
  renderResult();
}
function check(title, desc, type = "ok") {
  return `<div class="check ${type === "ok" ? "" : type}">${icon(type === "ok" ? "check" : "info")}<div><b>${esc(title)}</b><p>${esc(desc)}</p></div></div>`;
}
function renderResult() {
  const el = document.querySelector("#results");
  if (!result) {
    el.innerHTML = "";
    return;
  }
  if (!result.supported) {
    el.innerHTML = `<div class="outcome">${icon("info")}<h3>No supported top-level payload</h3><p>${esc(result.reason)}</p><p>${result.calldataBytes} bytes inspected · ${esc(short(result.calldataHash))}</p></div>`;
    return;
  }
  const r = result,
    c = r.context;
  el.innerHTML = `<div class="result-heading"><div class="heading-title"><div><span class="section-kicker">THE INSPECTION</span><h2>Inside the payload</h2></div><span class="label">${icon("check")} Decoded</span></div><div class="result-actions"><button class="small-btn" data-action="copy" aria-label="Copy summary">${icon("copy")} Copy summary</button><button class="small-btn" data-action="download" aria-label="Download report">${icon("download")} Export JSON</button><button class="small-btn" data-action="share" aria-label="Copy share link">${icon("share")} Share</button></div></div><div class="result-banner ${c ? "" : "sample-banner"}"><span>${icon("info")}${c ? `${esc(c.chain)} · Block ${c.blockNumber.toLocaleString()} · Receipt: ${esc(c.status)}` : example === "signed" ? '<strong>Example mode</strong><span class="banner-divider"></span> Historical signed fixture. No onchain execution is claimed.' : "Local calldata inspection · Chain context unavailable"}</span>${c ? `<a href="${esc(c.explorer)}" target="_blank" rel="noopener">View transaction ↗</a>` : example === "signed" ? `<a href="${fixture.source}" target="_blank" rel="noopener">View source ↗</a>` : ""}</div><div class="panel report-shell"><div class="report-top"><div class="report-title"><div class="asset-icon">${icon("layers")}</div><div><h3>${r.feeds.map((f) => esc(f.id)).join(" / ")} · Pull payload</h3><p>${esc(date(Math.min(...r.timestamps)))}</p></div></div><div class="view-tabs"><button data-view="simple" class="${!technical ? "active" : ""}">Overview</button><button data-view="technical" class="${technical ? "active" : ""}">Raw details</button></div></div><div class="stats"><div class="stat"><label>Signed packages</label><strong>${r.packages.length}</strong><span>decoded</span></div><div class="stat"><label>Unique signers</label><strong>${r.uniqueSigners}</strong><span>unique</span></div><div class="stat"><label>Feeds found</label><strong>${r.feeds.length}</strong><span>found</span></div><div class="stat"><label>Default time window</label><strong class="small">${r.defaultWindowPass === null ? "No reference" : r.defaultWindowPass ? "Within window" : "Outside window"}</strong></div></div>${technical ? technicalReport(r) : overview(r)}<div class="report-foot">${icon("info")}Payload contents are decoded. Authorised signers, contract acceptance and final price use are not verified. <button class="text-button" data-action="method">Read the methodology ${icon("arrow")}</button></div></div>`;
}
function overview(r) {
  return `<div class="path-panel"><div class="micro-title"><span>01</span> THE PAYLOAD PATH</div><div class="signal-path">${[
    ["code", "Calldata", `${r.calldataBytes} bytes`],
    ["layers", "Signed packages", `${r.packages.length} decoded`],
    ["search", "Recovered signers", `${r.uniqueSigners} addresses`],
    ["info", "Consumer outcome", "Not verified"],
  ]
    .map(
      ([ic, title, sub], i) =>
        `${i ? icon("arrow").replace("<svg", '<svg class="path-arrow"') : ""}<div class="path-node ${i < 3 ? "active" : "last"}"><div class="node-icon">${icon(ic)}</div><b>${title}</b><small>${sub}</small></div>`,
    )
    .join(
      "",
    )}</div></div><div class="report-grid"><div class="observations"><div class="sub-heading"><h4><span class="section-number">02</span> Feed observations</h4><span>${r.decimals} DISPLAY DECIMALS</span></div>${r.feeds.map((f) => `<div class="feed-value"><div class="feed-symbol"><span class="coin">${esc(f.id.slice(0, 1))}</span><div><b>${esc(f.id)}</b><small>${f.uniqueSigners} unique signers${f.duplicateObservations ? ` · ${f.duplicateObservations} duplicates` : ""}</small></div></div><div class="price"><strong>${esc(f.displayMedian)}</strong><span>descriptive median</span></div></div><div class="observation-labels"><span>RECOVERED SIGNER</span><span>VALUE</span></div>${f.observations.map((o) => `<div class="signer-row"><span class="identicon" style="--ident:#${o.signer.slice(2, 8)}"></span><span class="address"><button class="address-button" data-address="${esc(o.signer)}" title="Copy ${esc(o.signer)}" aria-label="Copy signer ${esc(o.signer)}">${short(o.signer)}</button></span><span class="value">${esc(o.value)}</span><button class="copy-sign" data-address="${esc(o.signer)}" aria-label="Copy address ${esc(o.signer)}">${icon("copy")}</button></div>`).join("")}`).join("")}<p class="observations-note">Median uses one observation per signer per feed. Display decimals are viewer-supplied; consumer aggregation may differ.</p></div><div class="checks"><div class="sub-heading"><h4><span class="section-number">03</span> Evidence checks</h4></div>${check("Package signatures recovered", `${r.uniqueSigners} distinct signing addresses. Authorised signer set has not been checked.`, "warn")}${check(r.timestampConsistent ? "Timestamps agree" : "Timestamps differ", r.timestampConsistent ? "All decoded packages carry the same timestamp." : "Packages carry different timestamps.", r.timestampConsistent ? "ok" : "warn")}${check(r.defaultWindowPass === null ? "Timing needs chain context" : r.defaultWindowPass ? "Within the default window" : "Outside the default window", r.defaultWindowPass === null ? "No reference time supplied. Timing cannot be assessed." : `Oldest package age: ${r.ageSeconds}s relative to reference time. Consumer overrides are not checked.`, r.defaultWindowPass === true ? "ok" : "warn")}${check("Consumer acceptance unverified", "No execution tracing or consumer-specific configuration is inspected.", "warn")}</div></div>`;
}
function technicalReport(r) {
  return `<div class="technical"><h4>Inspectable details</h4><div class="technical-grid">${[
    ["Calldata hash", r.calldataHash],
    ["Top-level selector", r.selector],
    ["Unsigned metadata · untrusted", r.metadata],
    [
      "Reference timestamp",
      r.referenceTime ? date(r.referenceTime) : "Not supplied",
    ],
    ["Display scaling", `${r.decimals} decimals · viewer supplied`],
    ["RPC source", r.context?.rpcHost || "Local browser · no RPC request"],
  ]
    .map(
      ([label, value]) =>
        `<div class="tech-item"><label>${label}</label><code>${esc(value)}</code></div>`,
    )
    .join(
      "",
    )}</div><details><summary>Full decoded report · packages, signatures and raw integers</summary><pre>${esc(JSON.stringify(r, null, 2))}</pre></details></div>`;
}
function toast(msg) {
  const el = document.querySelector("#toast");
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2600);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    toast("Clipboard unavailable. Download the JSON report instead.");
  }
}
function showError(e) {
  result = null;
  renderResult();
  document.querySelector("#error").innerHTML =
    `<div class="error-message">${esc(e.message || e)}</div>`;
}
function readDecimals() {
  const text = document.querySelector("#decimals").value;
  const value = Number(text);
  if (!text.trim() || !Number.isInteger(value) || value < 0 || value > 36)
    throw new Error("Display decimals must be an integer between 0 and 36.");
  return value;
}
function reportLink() {
  if (!result?.supported) return null;
  const q = new URLSearchParams();
  if (result.context) {
    q.set("chain", result.context.chain);
    q.set("tx", result.context.hash);
  } else if (example === "signed") q.set("example", "signed");
  else return null;
  if (result.decimals !== 8) q.set("decimals", String(result.decimals));
  return `${location.origin}/?${q}`;
}
function loadExample(id) {
  example = id;
  document.querySelector("#error").innerHTML = "";
  try {
    const decimals = readDecimals();
    result = analyzeCalldata(
      id === "signed"
        ? fixture.calldata
        : id === "empty"
          ? "0x"
          : "0x000002ed57011e0000",
      { decimals },
    );
    renderResult();
    history.replaceState(null, "", reportLink() || `?example=${id}`);
  } catch (e) {
    showError(e);
    history.replaceState(null, "", location.pathname);
  }
  document
    .querySelectorAll("[data-example]")
    .forEach((x) => x.classList.toggle("active", x.dataset.example === id));
}
async function inspect(reference, chain) {
  if (busy) return;
  let decimals;
  try {
    decimals = readDecimals();
    if (!reference.trim())
      throw new Error(
        "Paste a transaction reference or raw calldata to inspect.",
      );
  } catch (e) {
    showError(e);
    return;
  }
  busy = true;
  example = null;
  result = null;
  inspectionController = new AbortController();
  const controller = inspectionController;
  const timeout = setTimeout(() => controller.abort(), 28000);
  const btn = document.querySelector("[type=submit]");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Inspecting…';
  document.querySelector("#error").innerHTML = "";
  const results = document.querySelector("#results");
  results.setAttribute("aria-busy", "true");
  results.innerHTML =
    '<div class="outcome loading"><h3>Inspecting the evidence…</h3><p>Retrieving and decoding the payload. Large inputs are isolated from the page.</p><button class="small-btn" data-action="cancel">Cancel inspection</button></div>';
  try {
    const refTime = document.querySelector("#reference-time")?.value;
    if (mode === "raw") {
      result = await decodePayload(
        reference,
        {
          decimals,
          referenceTime: refTime ? new Date(refTime).getTime() : null,
        },
        controller.signal,
      );
      history.replaceState(null, "", location.pathname);
    } else {
      const ref = parseTransactionReference(reference, chain);
      const res = await fetch("/api/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.hash, chain: ref.chain }),
        signal: controller.signal,
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          "The lookup service returned an unreadable response. Try again or use raw calldata.",
        );
      }
      if (!res.ok || data.error)
        throw new Error(data.error || "Lookup failed.");
      if (
        !data.context ||
        data.context.hash !== ref.hash ||
        data.context.chain !== ref.chain ||
        typeof data.calldata !== "string"
      )
        throw new Error(
          "The lookup service returned incomplete transaction data.",
        );
      result = await decodePayload(
        data.calldata,
        {
          decimals,
          referenceTime: data.context.blockTimestamp,
          context: data.context,
        },
        controller.signal,
      );
      recent = [
        ref,
        ...recent.filter((x) => x.hash !== ref.hash || x.chain !== ref.chain),
      ].slice(0, 4);
      try {
        localStorage.setItem("replay-recent", JSON.stringify(recent));
      } catch {}
      const q = new URLSearchParams({ chain: ref.chain, tx: ref.hash });
      if (decimals !== 8) q.set("decimals", String(decimals));
      history.replaceState(null, "", `?${q}`);
    }
    renderResult();
    document
      .querySelectorAll("[data-example]")
      .forEach((x) => x.classList.remove("active"));
    document.querySelector(".recent-list").innerHTML = recentMarkup();
  } catch (e) {
    showError(
      controller.signal.aborted
        ? new Error(
            "Inspection cancelled or timed out. You can retry or inspect raw calldata.",
          )
        : e,
    );
    history.replaceState(null, "", location.pathname);
  } finally {
    clearTimeout(timeout);
    busy = false;
    inspectionController = null;
    results.removeAttribute("aria-busy");
    btn.disabled = false;
    btn.innerHTML = `Inspect payload${icon("arrow")}`;
  }
}
document.addEventListener("submit", (e) => {
  if (e.target.id === "inspect-form") {
    e.preventDefault();
    inspect(
      document.querySelector("#reference").value,
      document.querySelector("#chain")?.value,
    );
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.action === "cancel") {
    inspectionController?.abort();
    return;
  }
  if (busy && !["method", "close"].includes(b.dataset.action)) return;
  if (b.dataset.mode) {
    saveDraft();
    mode = b.dataset.mode;
    shell();
    document.querySelector("#reference").focus();
    return;
  }
  if (b.dataset.example) {
    loadExample(b.dataset.example);
    return;
  }
  if (b.dataset.view) {
    technical = b.dataset.view === "technical";
    renderResult();
    document
      .querySelector(`[data-view="${b.dataset.view}"]`)
      .focus({ preventScroll: true });
    return;
  }
  if (b.dataset.address) {
    copy(b.dataset.address);
    return;
  }
  if (b.dataset.recent) {
    saveDraft();
    mode = "tx";
    shell();
    const r = recent[Number(b.dataset.recent)];
    document.querySelector("#reference").value = r.hash;
    document.querySelector("#chain").value = r.chain;
    inspect(r.hash, r.chain);
    return;
  }
  switch (b.dataset.action) {
    case "advanced": {
      const x = document.querySelector("#advanced");
      x.hidden = !x.hidden;
      b.setAttribute("aria-expanded", String(!x.hidden));
      break;
    }
    case "method":
      document.querySelector("#method-dialog").showModal();
      break;
    case "close":
      document.querySelector("#method-dialog").close();
      break;
    case "examples":
      document
        .querySelector("#examples")
        .scrollIntoView({ behavior: "smooth" });
      break;
    case "replay":
      document.querySelector("#reference").focus();
      break;
    case "copy":
      copy(
        `RedStone Replay inspection\n${result.feeds.map((f) => `${f.id}: ${f.displayMedian} (${result.decimals} display decimals), ${f.uniqueSigners} recovered signers`).join("\n")}\nPayload time: ${date(Math.min(...result.timestamps))}\nSigner authorisation and consumer execution are not verified.\n${reportLink() || "Local calldata inspection; export the JSON report to share its evidence."}`,
      );
      break;
    case "share": {
      const link = reportLink();
      if (link) copy(link);
      else
        toast(
          "Raw calldata is private to this browser. Download a report to share it.",
        );
      break;
    }
    case "download": {
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { ...result, exportedAt: new Date().toISOString() },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "redstone-replay-report.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Report downloaded");
      break;
    }
  }
});
result = analyzeCalldata(fixture.calldata);
shell();
const query = new URLSearchParams(location.search);
try {
  if (query.has("decimals")) {
    document.querySelector("#decimals").value = query.get("decimals");
    displayDecimals = String(readDecimals());
  }
  if (["signed", "empty", "broken"].includes(query.get("example")))
    loadExample(query.get("example"));
  if (query.has("tx")) {
    const ref = parseTransactionReference(
      query.get("tx"),
      query.get("chain") || "ethereum",
    );
    document.querySelector("#reference").value = ref.hash;
    document.querySelector("#chain").value = ref.chain;
    inspect(ref.hash, ref.chain);
  } else if (!query.has("example") && query.has("decimals"))
    loadExample("signed");
} catch (e) {
  showError(e);
  history.replaceState(null, "", location.pathname);
}

setupGuide((action) => {
  if (action === "community") {
    location.assign("/community/");
    return;
  }
  if (action === "method") {
    document.querySelector("#method-dialog").showModal();
    return;
  }
  if (action === "results") {
    if (!result) {
      toast("Run an inspection or open the AVAX example first.");
      document.querySelector("#reference").focus();
      return;
    }
    document.querySelector("#results").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (busy) {
    toast("An inspection is running. Please wait for the result.");
    return;
  }
  if (action === "example") {
    loadExample("signed");
    document.querySelector("#results").scrollIntoView({ behavior: "smooth" });
    return;
  }
  saveDraft();
  mode = action === "calldata" ? "raw" : "tx";
  shell();
  document
    .querySelector("#inspect-form")
    .scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelector("#reference").focus({ preventScroll: true });
});
