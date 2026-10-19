import "./style.css";
import "./community.css";
import { setupGuide } from "./guide.js";
import {
  LINKS,
  LESSONS,
  GLOSSARY,
  UPDATES,
  TASKS,
  REVIEWED,
} from "./community-data.js";
import {
  normalizeProgress,
  routePath,
  normalizePreferences,
  recommendPath,
  recommendTasks,
  progressFor,
  simulateObservations,
  reviewState,
  contributionDraft,
} from "./community-model.js";
const icons = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v15"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
  learn: '<path d="m2 8 10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7m4-2v8"/>',
  heart:
    '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15z"/>',
  news: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h3m3 0h2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 4H3v17h17v-7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.book}</svg>`;
const mark =
  '<svg class="brand-mark" viewBox="0 0 36 42" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 2 15 9-15 9L3 11Zm-15 18 15 9 15-9M3 29l15 10 15-10"/></svg>';
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const external = (url, text, cls = "") =>
  `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}${icon("external")}</a>`;
const formatDate = (d) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const STORAGE = "redstone-field-guide:v1";
let state = normalizeProgress(),
  canStore = true;
try {
  const raw = localStorage.getItem(STORAGE);
  if (raw && raw.length < 20000) state = normalizeProgress(JSON.parse(raw));
} catch {
  canStore = false;
}
const params = new URLSearchParams(location.search);
if (["goal", "time", "interest"].some((k) => params.has(k))) {
  state.preferences = normalizePreferences({
    goal: params.get("goal"),
    time: Number(params.get("time")),
    interest: params.get("interest"),
  });
  state.hasPlan = true;
}
let wizardStep = 0,
  choices = { ...state.preferences },
  activeLesson = null,
  selectedTask = null,
  draft = "",
  note = "";
const save = () => {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
    canStore = true;
  } catch {
    canStore = false;
  }
  const el = document.querySelector("#storage-state");
  if (el)
    el.textContent = canStore
      ? "Saved on this device"
      : "Progress is available for this visit only";
};
let toastTimer;
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3000);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Review before sharing.");
  } catch {
    toast("Clipboard is unavailable. You can select and copy the text.");
  }
}
function jump(id) {
  const section = document.getElementById(id);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  const heading = section.querySelector("h2");
  heading?.focus({ preventScroll: true });
}
function shell() {
  document.querySelector("#app").innerHTML =
    `<div class="shell field-shell"><aside class="sidebar"><a class="brand" href="/">${mark}<div class="brand-name">RedStone<span>REPLAY</span></div></a><div class="side-caption">YOUR FIELD GUIDE</div><nav class="nav"><a class="nav-link active" href="/community/" aria-current="page">${icon("compass")}Start here</a>${[
      ["lessons", "learn", "Learn the basics"],
      ["playground", "compass", "Oracle playground"],
      ["updates", "news", "News, explained"],
      ["contribute", "heart", "Find your contribution"],
      ["glossary", "book", "Plain-English glossary"],
    ]
      .map(
        ([id, ic, label]) =>
          `<button data-jump="${id}">${icon(ic)}${label}</button>`,
      )
      .join(
        "",
      )}<a class="nav-link replay-link" href="/">${icon("code")}Payload inspector${icon("external")}</a></nav><div class="side-bottom"><div class="side-note"><div class="privacy-icon">${icon("heart")}</div><strong>You belong before you build.</strong><p>Curiosity, clear explanations and thoughtful feedback all have a place here.</p></div><div class="maker"><span class="maker-avatar">V</span><span>Built by <strong>VLS</strong><small>Independent community project</small></span></div></div></aside><main class="workspace" id="main"><header class="topbar"><div class="crumb"><span class="workspace-icon">${icon("compass")}</span>Community <span>/</span><strong>Field Guide</strong></div><a class="mobile-brand" href="/community/">${mark} Field Guide</a><div class="top-actions"><a href="/">Payload inspector ${icon("arrow")}</a><span class="version"><span></span>No coding needed</span></div></header><nav class="field-mobile-nav" aria-label="Field guide sections">${[
      ["journey", "My route"],
      ["lessons", "Learn"],
      ["playground", "Playground"],
      ["updates", "News"],
      ["contribute", "Contribute"],
    ]
      .map(([id, label]) => `<button data-jump="${id}">${label}</button>`)
      .join(
        "",
      )}</nav><div class="content field-content"><section class="field-hero"><div><div class="eyebrow"><span class="red-dot"></span>A COMMUNITY GUIDE TO REDSTONE</div><h1>A good place<br>to <em>begin.</em></h1><p>Understand the ideas. Find your people.<br>Contribute something useful — even without writing code.</p><div class="hero-notes"><span>${icon("clock")}Start in 5 minutes</span><span>${icon("lock")}No wallet needed</span></div></div><div class="field-illustration" aria-hidden="true"><div class="map-orbit"></div><div class="map-line line-a"></div><div class="map-line line-b"></div><div class="map-center">${mark}<span>YOUR START</span></div><span class="map-point point-learn">${icon("learn")}LEARN</span><span class="map-point point-explore">${icon("compass")}EXPLORE</span><span class="map-point point-help">${icon("heart")}CONTRIBUTE</span><div class="map-coordinate">A SMALL STEP. A CLEARER VIEW.</div></div></section>
 <section id="journey" class="field-section journey-section"><div class="section-heading"><div><span class="section-kicker">01 / YOUR FIRST STEPS</span><h2 tabindex="-1">A route that feels like you.</h2></div><span class="local-state" id="storage-state">${canStore ? "Saved on this device" : "Progress is available for this visit only"}</span></div><div id="path-content"></div></section>
 <section id="lessons" class="field-section"><div class="section-heading"><div><span class="section-kicker">02 / GET COMFORTABLE</span><h2 tabindex="-1">Small ideas. Less mystery.</h2><p>Short explanations. One quick check. An official source to go deeper.</p></div><span class="quiet-meta">ABOUT 7 MINUTES TOTAL</span></div><div class="lesson-grid">${LESSONS.map((l) => `<button class="lesson-card" data-lesson="${l.id}"><span class="lesson-number">${l.number}<span>${icon(l.id === "oracle" ? "learn" : l.id === "observations" ? "compass" : "news")}</span></span><span class="lesson-tag">${l.tag}</span><h3>${l.title}</h3><p>${l.description}</p><div class="lesson-bottom"><span>${l.time} · Learn & check</span>${icon("arrow")}</div><span class="lesson-done ${state.completed.includes(l.id) ? "" : "is-hidden"}" data-lesson-done="${l.id}">${icon("check")}Completed</span></button>`).join("")}</div></section>
 <section id="playground" class="field-section"><div class="section-heading"><div><span class="section-kicker">03 / LEARN BY DOING</span><h2 tabindex="-1">What happens when the numbers disagree?</h2><p>Move an observation. Let the middle number tell its story.</p></div><span class="demo-badge">ILLUSTRATION · NOT LIVE DATA</span></div><div class="playground-card panel"><div class="playground-controls"><div class="playground-label">THREE INVENTED OBSERVATIONS</div>${[99, 100, 101].map((v, i) => `<label class="observation-control" for="observation-${i}"><span><span class="source-letter">${String.fromCharCode(65 + i)}</span>Observation ${String.fromCharCode(65 + i)}<output id="observation-${i}-value">${v.toFixed(2)}</output></span><input id="observation-${i}" data-observation="${i}" type="range" min="50" max="150" step="1" value="${v}"></label>`).join("")}<div class="scenario-buttons"><button data-scenario="close">Close together</button><button data-scenario="outlier">One outlier</button><button data-scenario="old">Old data</button></div></div><div class="playground-result"><span class="playground-label">THE MIDDLE VALUE</span><output id="median-value" class="median-value">100.00</output><div class="median-caption">Median of three observations</div><div class="median-strip" id="median-strip"></div><p id="median-explanation"></p><label class="age-control" for="data-age"><span>Age of the data<output id="data-age-value">30 seconds</output></span><input id="data-age" type="range" min="0" max="300" step="1" value="30"></label><div id="age-verdict" role="status"></div></div><div class="playground-foot">This illustrates a median and a 180-second age rule. Actual consumers can use different aggregation and timing rules; signatures and authorised signers also matter. ${external(LINKS.defaults, "See the default implementation")}</div></div></section>
 <section id="updates" class="field-section"><div class="section-heading"><div><span class="section-kicker">04 / READ THE CONTEXT</span><h2 tabindex="-1">“What does this mean for me?”</h2><p>Selected announcements, translated into everyday language.</p></div>${external(LINKS.blog, "Official news", "subtle-link")}</div><div class="editorial-note">${icon("news")}Curated explainers, not a live news feed. Sources reviewed ${formatDate(REVIEWED)}. Each card separates the news from any action.</div><div class="update-grid">${UPDATES.map((u) => `<article class="update-card"><div class="update-top"><span>${u.category}</span><time datetime="${u.published}">${formatDate(u.published)}</time></div><h3>${u.title}</h3><p>${u.what}</p><details><summary>Who is it for, and do I need to act? ${icon("arrow")}</summary><dl><dt>Who it matters to</dt><dd>${u.who}</dd><dt>What it means</dt><dd>${u.meaning}</dd><dt>Do I need to do anything?</dt><dd>${u.action}</dd></dl></details><footer>${external(u.source, "Read the original")}<span class="source-reviewed ${reviewState(u.reviewed) === "needs-review" ? "review-due" : ""}">${reviewState(u.reviewed) === "needs-review" ? "Source recheck due" : "Reviewed " + formatDate(u.reviewed)}</span></footer></article>`).join("")}</div></section>
 <section id="contribute" class="field-section"><div class="section-heading"><div><span class="section-kicker">05 / LEAVE SOMETHING USEFUL</span><h2 tabindex="-1">You don’t need code to contribute.</h2><p>A clear explanation or one thoughtful observation is a good start.</p></div></div><div id="task-list"></div><div id="contribution-workspace"></div><div class="contribution-note">These are community-created suggestions. Your checklist is a personal learning record, not an official task, role or reward tracker.</div></section>
 <section id="glossary" class="field-section"><div class="section-heading"><div><span class="section-kicker">06 / NO JARGON REQUIRED</span><h2 tabindex="-1">A small dictionary for the journey.</h2></div><label class="glossary-search"><span class="sr-only">Find a term</span><input id="glossary-search" type="search" placeholder="Find a term…" maxlength="80"></label></div><div id="glossary-list" class="glossary-grid"></div><p id="glossary-empty" hidden>No matching term. Try “oracle”, “median” or “NAV”.</p></section>
 <section class="community-links panel"><div><span class="section-kicker">KEEP EXPLORING</span><h2>Follow the original sources.</h2><p>Use the links published by RedStone. This guide is an independent community project.</p></div><div>${external(LINKS.home, "RedStone website")}${external(LINKS.discord, "Official Discord")}${external(LINKS.x, "Official X")}${external(LINKS.github + "/issues/new/choose", "Suggest a guide improvement")}</div></section>
 <footer class="footer"><div><strong>RedStone Field Guide</strong> · Built by VLS.<br>Independent, source-linked community learning.</div><div class="footer-links"><button class="text-button" data-info="privacy">Privacy & sources</button><button class="text-button" data-reset>Reset my progress</button>${external(LINKS.github, "Open-source on GitHub")}</div></footer></div></main></div><dialog id="field-dialog" aria-labelledby="field-dialog-title"><div class="dialog-head"><h2 id="field-dialog-title"></h2><button class="icon-button" data-dialog-close aria-label="Close dialog">${icon("close")}</button></div><div class="dialog-body" id="field-dialog-body"></div></dialog>`;
  renderPath();
  renderTasks();
  renderGlossary("");
  updatePlayground();
}
const QUESTIONS = [
  {
    key: "goal",
    title: "Where would you like to start?",
    description: "No right answer. Choose the next step you actually want.",
    options: [
      ["new", "I’m new here", "Give me a friendly introduction.", "compass"],
      [
        "learn",
        "I want to understand",
        "Help me make sense of the ideas.",
        "learn",
      ],
      [
        "contribute",
        "I want to help",
        "Find a useful, non-coding contribution.",
        "heart",
      ],
    ],
  },
  {
    key: "time",
    title: "How much time do you have today?",
    description: "We’ll keep the suggested route small enough to start.",
    options: [
      [5, "A small first step", "Around 5 minutes", "clock"],
      [15, "A little room to explore", "Around 15 minutes", "book"],
      [30, "Time to get involved", "Around 30 minutes", "heart"],
    ],
  },
  {
    key: "interest",
    title: "What feels most like you?",
    description: "This helps us suggest a contribution you might enjoy.",
    options: [
      [
        "learn",
        "I like asking questions",
        "Learn something, then ask a focused question.",
        "learn",
      ],
      [
        "explain",
        "I like making ideas clear",
        "Explain, write or translate something small.",
        "book",
      ],
      [
        "help",
        "I notice what could be better",
        "Give thoughtful feedback to help the next person.",
        "heart",
      ],
    ],
  },
];
function renderPath() {
  const el = document.querySelector("#path-content");
  if (!state.hasPlan) {
    const q = QUESTIONS[wizardStep];
    el.innerHTML = `<div class="path-builder panel"><div class="path-builder-head"><span class="step-indicator">${QUESTIONS.map((_, i) => `<span class="${i <= wizardStep ? "filled" : ""}"></span>`).join("")}</span><span>QUESTION ${wizardStep + 1} OF 3</span></div><h3 tabindex="-1" id="wizard-title">${q.title}</h3><p>${q.description}</p><div class="path-options" role="group" aria-labelledby="wizard-title">${q.options.map(([value, title, description, ic]) => `<button class="path-option ${choices[q.key] === value ? "selected" : ""}" data-choice="${value}" data-choice-key="${q.key}" aria-pressed="${choices[q.key] === value}"><span class="choice-icon">${icon(ic)}</span><strong>${title}</strong><small>${description}</small><span class="choice-tick">${choices[q.key] === value ? icon("check") : ""}</span></button>`).join("")}</div><div class="path-builder-foot"><span>${wizardStep ? '<button class="text-button" data-wizard-back>← Back</button>' : "A starting point, not a test."}</span><button class="primary" data-wizard-next>${wizardStep === 2 ? "Build my route" : "Continue"}${icon("arrow")}</button></div></div>`;
    return;
  }
  const steps = recommendPath(state.preferences),
    p = progressFor(steps, state.completed);
  el.innerHTML = `<div class="personal-path panel"><div class="personal-path-header"><div><span class="plan-badge">YOUR ${state.preferences.time}-MINUTE START</span><h3>${state.preferences.goal === "contribute" ? "A useful first contribution starts with understanding." : state.preferences.goal === "learn" ? "A little context goes a long way." : "Start small. Get your bearings."}</h3></div><button class="text-button" data-edit-path>Change my route ${icon("arrow")}</button></div><div class="path-progress"><span>${p.done} of ${p.total} steps checked off</span><progress value="${p.done}" max="${p.total}" aria-label="Your learning checklist"></progress><span>${p.percent}%</span></div><ol class="path-steps">${steps.map((s, i) => `<li class="${state.completed.includes(s.id) ? "step-complete" : ""}"><label class="completion-check"><input type="checkbox" data-complete="${s.id}" ${state.completed.includes(s.id) ? "checked" : ""} aria-label="Mark ${esc(s.title)} complete"><span>${state.completed.includes(s.id) ? icon("check") : String(i + 1).padStart(2, "0")}</span></label><div><h4>${s.title}</h4><p>${s.description}</p></div><button class="path-step-action" data-step="${s.id}">${s.label}${icon("arrow")}</button></li>`).join("")}</ol><div class="path-summary"><span>${icon("lock")}Your personal checklist stays on this device.</span><button class="text-button" data-share-path>${icon("copy")}Copy this route</button></div>${p.done === p.total ? '<div class="path-celebration">A good beginning. You can revisit any step or try a small contribution next.</div>' : ""}</div>`;
}
function renderTasks() {
  const tasks = recommendTasks(state.preferences);
  document.querySelector("#task-list").innerHTML =
    `<div class="task-meta"><span>Matched to ${state.preferences.time} minutes · Change your route to explore other suggestions.</span><button class="text-button" data-edit-path>Adjust my preferences ${icon("arrow")}</button></div><div class="task-grid">${tasks.map((t) => `<article class="task-card"><div class="task-tag">${icon(t.interest === "help" ? "heart" : t.interest === "explain" ? "book" : "learn")} ${t.type}<span>~${t.minutes} min</span></div><h3>${t.title}</h3><p>${t.description}</p><details><summary>What would a useful result look like?</summary><p>${t.deliverable}</p></details><button class="small-btn" data-task="${t.id}">Prepare a contribution${icon("arrow")}</button></article>`).join("")}</div>`;
}
function renderGlossary(query) {
  const q = query.trim().toLowerCase();
  const items = GLOSSARY.filter((g) =>
    (g.term + " " + g.definition).toLowerCase().includes(q),
  );
  document.querySelector("#glossary-list").innerHTML = items
    .map(
      (g) =>
        `<article><h3>${g.term}</h3><p>${g.definition}</p>${external(g.source, "Source")}</article>`,
    )
    .join("");
  document.querySelector("#glossary-empty").hidden = !!items.length;
}
function updatePlayground() {
  const values = [0, 1, 2].map((i) =>
    Number(document.querySelector("#observation-" + i).value),
  );
  const age = Number(document.querySelector("#data-age").value);
  const r = simulateObservations(values, age);
  values.forEach(
    (v, i) =>
      (document.querySelector("#observation-" + i + "-value").textContent =
        v.toFixed(2)),
  );
  document.querySelector("#median-value").textContent = r.median.toFixed(2);
  document.querySelector("#data-age-value").textContent = age + " seconds";
  document.querySelector("#median-strip").innerHTML = [...values]
    .sort((a, b) => a - b)
    .map(
      (v, i) =>
        `<span class="${i === 1 ? "middle" : ""}">${v.toFixed(0)}${i === 1 ? "<small>MIDDLE</small>" : ""}</span>`,
    )
    .join("");
  document.querySelector("#median-explanation").textContent =
    r.spread >= 20
      ? "These observations are spread apart. The median is still the middle value after sorting, not the average."
      : "These observations are close together. The median is the middle number after sorting.";
  document.querySelector("#age-verdict").innerHTML =
    `<span class="age-tag ${r.fresh ? "fresh" : "old"}">${icon(r.fresh ? "check" : "clock")}${r.fresh ? "Within this demo’s 180-second age rule" : "Too old for this demo’s 180-second age rule"}</span>`;
}
function openLesson(id) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) return;
  activeLesson = l;
  const dialog = document.querySelector("#field-dialog");
  document.querySelector("#field-dialog-title").textContent = l.title;
  document.querySelector("#field-dialog-body").innerHTML =
    `<span class="lesson-tag">${l.tag} · ${l.time}</span><p>${l.body}</p><div class="lesson-takeaway"><strong>Take this with you</strong><p>${l.takeaway}</p></div><div class="quick-check"><span class="section-kicker">A QUICK CHECK</span><h3>${l.question}</h3><div class="quiz-answers">${l.answers.map((a, i) => `<button data-answer="${i}">${a}</button>`).join("")}</div><div id="quiz-feedback" role="status"></div></div><div class="lesson-source">${external(l.source, "Read the primary source")}</div>`;
  dialog.showModal();
}
function openTask(id) {
  const task = TASKS.find((t) => t.id === id);
  if (!task) return;
  selectedTask = task;
  draft = "";
  note = "";
  document.querySelector("#contribution-workspace").innerHTML =
    `<form id="contribution-form" class="contribution-workspace panel"><div class="sub-heading"><h3>Your contribution, in your own words.</h3><button type="button" class="icon-button" data-close-task aria-label="Close contribution draft">${icon("close")}</button></div><p class="workspace-subtitle">${task.title}. Nothing is posted or sent automatically.</p><label for="contribution-source">A source you checked</label><select id="contribution-source">${[
      ["basics", "RedStone: an introduction"],
      ["developers", "How RedStone delivers data"],
      ["blog", "Official announcements"],
    ]
      .map(([key, label]) => `<option value="${LINKS[key]}">${label}</option>`)
      .join(
        "",
      )}</select><label for="contribution-note">${task.prompt}</label><textarea id="contribution-note" minlength="20" maxlength="1500" required placeholder="Add one specific observation. Avoid passwords, private keys or personal information."></textarea><div class="contribution-editor-foot"><span>Draft text stays in this open page.</span><button class="primary" type="submit">Prepare my draft ${icon("arrow")}</button></div><div id="draft-error" role="alert"></div><div id="draft-result"></div></form>`;
  document
    .querySelector("#contribution-workspace")
    .scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelector("#contribution-note").focus({ preventScroll: true });
}
function showInfo(kind) {
  const dialog = document.querySelector("#field-dialog");
  document.querySelector("#field-dialog-title").textContent =
    kind === "reset"
      ? "Reset your learning progress?"
      : "Privacy, sources & the scope of this guide";
  document.querySelector("#field-dialog-body").innerHTML =
    kind === "reset"
      ? '<p>This clears this guide’s choices and checklist on this device. It does not change your GitHub, Discord or official RedStone account.</p><button class="primary" data-confirm-reset>Reset this device’s progress</button>'
      : `<p>This is an independent community learning guide. It does not determine official roles, eligibility or rewards.</p><h3>Your information</h3><p>Your route and checked steps are stored in this browser only. Contribution draft text stays in the open page and is not saved to localStorage. There is no account, wallet connection, AI service or automatic posting. Opening an external source follows that site’s privacy practices. Fonts are requested from Google Fonts; hosting may retain ordinary access logs.</p><h3>Where explanations come from</h3><p>Editorial explainers link to the original official article and show publication and review dates. A review older than 30 days is marked for a source recheck. These are selected readings, not live news or a complete list of current activities.</p><p>Lesson and glossary sources are linked at the point of use. Playground numbers are invented. Its median and age check illustrate a concept rather than certify any real feed or consumer.</p><p>${external(LINKS.github + "/blob/main/docs/FIELD_GUIDE.md", "Content and maintenance notes")}</p>`;
  dialog.showModal();
}
function routeAction(action) {
  if (action === "privacy") {
    showInfo("privacy");
    return;
  }
  if (action === "oracle") {
    openLesson("oracle");
    return;
  }
  if (action === "route") {
    jump("journey");
    return;
  }
  if (["playground", "updates", "contribute", "glossary"].includes(action))
    jump(action);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.jump) {
    jump(b.dataset.jump);
    return;
  }
  if (b.dataset.choice) {
    choices[b.dataset.choiceKey] =
      b.dataset.choiceKey === "time"
        ? Number(b.dataset.choice)
        : b.dataset.choice;
    renderPath();
    document
      .querySelector(`[data-choice="${b.dataset.choice}"]`)
      .focus({ preventScroll: true });
    return;
  }
  if (b.hasAttribute("data-wizard-next")) {
    if (wizardStep < 2) {
      wizardStep++;
      renderPath();
      document.querySelector("#wizard-title").focus({ preventScroll: true });
    } else {
      state.preferences = normalizePreferences(choices);
      state.hasPlan = true;
      history.replaceState(
        null,
        "",
        routePath(state.preferences) + location.hash,
      );
      save();
      renderPath();
      renderTasks();
      jump("journey");
    }
    return;
  }
  if (b.hasAttribute("data-wizard-back")) {
    wizardStep = Math.max(0, wizardStep - 1);
    renderPath();
    document.querySelector("#wizard-title").focus({ preventScroll: true });
    return;
  }
  if (b.hasAttribute("data-edit-path")) {
    choices = { ...state.preferences };
    state.hasPlan = false;
    history.replaceState(null, "", location.pathname + location.hash);
    wizardStep = 0;
    save();
    renderPath();
    jump("journey");
    return;
  }
  if (b.dataset.step) {
    const step = recommendPath(state.preferences).find(
      (s) => s.id === b.dataset.step,
    );
    if (step?.action === "lesson") openLesson(step.target);
    else if (step) jump(step.target);
    return;
  }
  if (b.dataset.lesson) {
    openLesson(b.dataset.lesson);
    return;
  }
  if (b.hasAttribute("data-dialog-close")) {
    document.querySelector("#field-dialog").close();
    return;
  }
  if (b.dataset.answer !== undefined && activeLesson) {
    const correct = Number(b.dataset.answer) === activeLesson.correct;
    const el = document.querySelector("#quiz-feedback");
    el.className = correct ? "quiz-correct" : "quiz-retry";
    el.textContent = correct
      ? activeLesson.feedback
      : "Not quite. Read the explanation once more and try again.";
    document
      .querySelectorAll("[data-answer]")
      .forEach((x) => x.classList.toggle("answer-correct", correct && x === b));
    if (correct && !state.completed.includes(activeLesson.id)) {
      state.completed.push(activeLesson.id);
      save();
      renderPath();
      document
        .querySelector(`[data-lesson-done="${activeLesson.id}"]`)
        ?.classList.remove("is-hidden");
    }
    return;
  }
  if (b.dataset.scenario) {
    const values =
      b.dataset.scenario === "outlier" ? [99, 100, 150] : [99, 100, 101];
    values.forEach(
      (v, i) => (document.querySelector("#observation-" + i).value = v),
    );
    document.querySelector("#data-age").value =
      b.dataset.scenario === "old" ? 240 : 30;
    updatePlayground();
    return;
  }
  if (b.dataset.task) {
    openTask(b.dataset.task);
    return;
  }
  if (b.hasAttribute("data-close-task")) {
    document.querySelector("#contribution-workspace").innerHTML = "";
    draft = "";
    note = "";
    return;
  }
  if (b.hasAttribute("data-copy-draft")) {
    copy(draft);
    return;
  }
  if (b.hasAttribute("data-share-path")) {
    copy(location.origin + routePath(state.preferences));
    return;
  }
  if (b.dataset.info) {
    showInfo(b.dataset.info);
    return;
  }
  if (b.hasAttribute("data-reset")) {
    showInfo("reset");
    return;
  }
  if (b.hasAttribute("data-confirm-reset")) {
    state = normalizeProgress();
    choices = { ...state.preferences };
    wizardStep = 0;
    activeLesson = null;
    selectedTask = null;
    draft = "";
    note = "";
    history.replaceState(null, "", location.pathname);
    try {
      localStorage.removeItem(STORAGE);
    } catch {}
    document.querySelector("#field-dialog").close();
    shell();
    toast("Your local learning progress has been reset.");
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.complete) {
    const id = e.target.dataset.complete;
    state.completed = e.target.checked
      ? [...new Set([...state.completed, id])]
      : state.completed.filter((x) => x !== id);
    save();
    renderPath();
    document
      .querySelector(`[data-complete="${id}"]`)
      ?.focus({ preventScroll: true });
    document
      .querySelector(`[data-lesson-done="${id}"]`)
      ?.classList.toggle("is-hidden", !state.completed.includes(id));
  }
});
document.addEventListener("input", (e) => {
  if (e.target.hasAttribute("data-observation") || e.target.id === "data-age")
    updatePlayground();
  if (e.target.id === "glossary-search") renderGlossary(e.target.value);
  if (e.target.id === "draft-output") draft = e.target.value;
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "contribution-form") return;
  e.preventDefault();
  try {
    note = document.querySelector("#contribution-note").value;
    draft = contributionDraft(
      selectedTask,
      note,
      document.querySelector("#contribution-source").value,
    );
    document.querySelector("#draft-error").textContent = "";
    document.querySelector("#draft-result").innerHTML =
      `<label for="draft-output">Your editable draft</label><textarea id="draft-output" maxlength="6000">${esc(draft)}</textarea><div class="draft-result-actions"><button type="button" class="small-btn" data-copy-draft>${icon("copy")}Copy draft</button>${external(LINKS.github + "/issues/new/choose", "Choose where to give feedback")}</div><p>Review and edit the copied text before posting. No submission has been made.</p>`;
  } catch (e) {
    document.querySelector("#draft-error").textContent = e.message;
  }
});
shell();
if (["goal", "time", "interest"].some((k) => params.has(k))) save();
setupGuide(routeAction, {
  title: "Field guide help",
  subtitle: "A friendly starting point.",
  introTitle: "You can start right here.",
  introText: "Pick one question. We’ll take the next step together.",
  footnote: "Local help · No wallet or account",
  menu: [
    ["start", "01", "I’m completely new", "Find a short route into RedStone."],
    [
      "learn",
      "02",
      "What is an oracle?",
      "A simple explanation and a quick check.",
    ],
    [
      "news",
      "03",
      "Do I need to do anything?",
      "Understand an announcement first.",
    ],
    [
      "help",
      "04",
      "How can I contribute?",
      "Useful tasks without writing code.",
    ],
    [
      "privacy",
      "05",
      "Is my progress public?",
      "Your learning record stays on this device.",
    ],
  ],
  topics: {
    start: {
      title: "A small first step is enough.",
      text: "Answer three short questions about your goal, time and interests. You’ll get a checklist with lessons, a playground and sources. You can change it whenever you like.",
      actions: [["route", "Find my route"]],
    },
    learn: {
      title: "A bridge to outside information.",
      text: "An oracle helps a smart contract access information from outside its own blockchain. Open the short lesson, then move an observation in the playground to see what changes.",
      actions: [
        ["oracle", "Open the first lesson"],
        ["playground", "Try the playground"],
      ],
    },
    news: {
      title: "Read the news before taking action.",
      text: "Each explainer separates what happened, who it matters to and whether you need to do anything. Always check the original source and its date. An announcement is not automatically a claim or reward.",
      actions: [["updates", "Read an explainer"]],
    },
    help: {
      title: "Clear explanations count too.",
      text: "Try a short walkthrough review, a focused question or an explanation in your own words. The guide matches ideas to your time and interests, then helps you prepare a draft. Nothing is posted automatically.",
      actions: [["contribute", "Find a contribution"]],
    },
    privacy: {
      title: "Your checklist belongs to you.",
      text: "Your choices and checked steps stay in this browser. Draft text stays in the open page. This is a personal learning guide, not an official role or rewards tracker.",
      actions: [["privacy", "Read privacy & sources"]],
    },
  },
});
