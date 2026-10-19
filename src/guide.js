const bot = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 5V2m-2 0h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="5" y="7" width="22" height="20" rx="7" stroke="currentColor" stroke-width="1.7"/><path d="M5 14H2v7h3m22-7h3v7h-3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="10" y="13" width="3" height="4" rx="1.5" fill="currentColor"/><rect x="19" y="13" width="3" height="4" rx="1.5" fill="currentColor"/><path d="M12 22c2 1.5 6 1.5 8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
const close =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const topics = {
  start: {
    title: "Start with a transaction.",
    text: "Copy a confirmed transaction hash or an explorer link. Choose Ethereum, Base or Avalanche, then select Inspect payload. Already have the bytes? Use Raw calldata instead.",
    actions: [
      ["transaction", "Open transaction input"],
      ["calldata", "Use raw calldata"],
    ],
  },
  example: {
    title: "Follow a real signed payload.",
    text: "The official historical AVAX fixture contains three signed packages. Explore each recovered signer and observation without making an RPC request. It is a fixture, not a claimed onchain replay.",
    actions: [["example", "Show the AVAX example"]],
  },
  results: {
    title: "Three things to look for.",
    text: "",
    items: [
      [
        "Observations",
        "Values decoded from the payload. Display decimals are your setting; the median is descriptive.",
      ],
      [
        "Recovered signers",
        "Addresses recovered from signatures. Their authorisation by the consumer is not verified.",
      ],
      [
        "Timing",
        "Compared with the block or your reference time using the default window. Consumer rules may differ.",
      ],
    ],
    actions: [
      ["results", "Show the report"],
      ["method", "Read the methodology"],
    ],
  },
  privacy: {
    title: "Explore without a wallet.",
    text: "Raw calldata is decoded in your browser. Transaction lookup sends only the public hash and network to the site API and public RPC providers. Recent references stay in this browser. No wallet connection or transaction signature is requested.",
    actions: [["method", "Privacy & inspection scope"]],
  },
};
export function setupGuide(onAction) {
  const host = document.createElement("div");
  host.id = "replay-guide";
  document.body.append(host);
  let open = false,
    topic = null;
  function render() {
    const answer = topic ? topics[topic] : null;
    host.innerHTML = `<section class="guide-panel" ${open ? "" : "hidden"} role="dialog" aria-modal="false" aria-labelledby="guide-title"><header class="guide-header"><span class="guide-avatar">${bot}</span><div><h2 id="guide-title">Replay guide</h2><p>A little help with the bytes.</p></div><button class="guide-close" data-guide="close" aria-label="Close Replay guide">${close}</button></header><div class="guide-content"><span class="guide-eyebrow">YOUR NEXT STEP, MADE CLEAR</span><h3>${answer ? answer.title : "Let’s make sense of the payload."}</h3>${
      answer
        ? `<div class="guide-answer" tabindex="-1">${answer.text ? `<p>${answer.text}</p>` : ""}${answer.items ? `<dl>${answer.items.map(([title, text]) => `<div><dt>${title}</dt><dd>${text}</dd></div>`).join("")}</dl>` : ""}<div class="guide-actions">${answer.actions.map(([action, label]) => `<button data-guide-action="${action}">${label}${arrow}</button>`).join("")}</div></div><button class="guide-back" data-guide="back">← All topics</button>`
        : `<p>Choose what you’d like to do. I’ll point you in the right direction.</p><div class="guide-topics">${[
            [
              "start",
              "01",
              "Start an inspection",
              "A hash, a link, or raw calldata.",
            ],
            [
              "example",
              "02",
              "Explore the example",
              "A signed AVAX payload, unpacked.",
            ],
            [
              "results",
              "03",
              "Understand the results",
              "Observations, signers and timing.",
            ],
            [
              "privacy",
              "04",
              "Privacy & scope",
              "Know what this tool can show.",
            ],
          ]
            .map(
              ([id, n, title, subtitle]) =>
                `<button data-guide-topic="${id}"><span class="guide-topic-number">${n}</span><span><strong>${title}</strong><small>${subtitle}</small></span>${arrow}</button>`,
            )
            .join("")}</div>`
    }</div><footer class="guide-footer"><span></span>Guided help · No wallet needed</footer></section><button class="guide-launcher ${open ? "is-open" : ""}" data-guide="toggle" aria-expanded="${open}" aria-controls="guide-panel" aria-label="${open ? "Close" : "Open"} Replay guide">${open ? close : bot}<span>${open ? "Close guide" : "Need a hand?"}</span>${open ? "" : "<i></i>"}</button>`;
    host.querySelector(".guide-panel").id = "guide-panel";
  }
  host.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.guide) {
      if (b.dataset.guide === "back") {
        topic = null;
        render();
        host.querySelector("[data-guide-topic]").focus();
        return;
      }
      open = b.dataset.guide === "close" ? false : !open;
      render();
      host.querySelector(open ? ".guide-close" : ".guide-launcher").focus();
      return;
    }
    if (b.dataset.guideTopic) {
      topic = b.dataset.guideTopic;
      render();
      host.querySelector(".guide-answer").focus();
      return;
    }
    if (b.dataset.guideAction) {
      const action = b.dataset.guideAction;
      open = false;
      render();
      onAction(action);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      open = false;
      render();
      host.querySelector(".guide-launcher").focus();
    }
  });
  render();
}
