import { STEPS, TASKS } from "./community-data.js";
export const GOALS = ["new", "learn", "contribute"];
export const INTERESTS = ["learn", "explain", "help"];
export const TIMES = [5, 15, 30];
export const DEFAULT_PREFERENCES = Object.freeze({
  goal: "new",
  time: 5,
  interest: "learn",
});
export function normalizePreferences(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  return {
    goal: GOALS.includes(value.goal) ? value.goal : "new",
    time: TIMES.includes(value.time) ? value.time : 5,
    interest: INTERESTS.includes(value.interest) ? value.interest : "learn",
  };
}
// One canonical representation for both sharing and updating the current route.
export function routePath(value) {
  const p = normalizePreferences(value);
  return `/community/?${new URLSearchParams({ goal: p.goal, time: String(p.time), interest: p.interest })}`;
}
export function normalizeProgress(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  return {
    preferences: normalizePreferences(value.preferences),
    hasPlan: value.hasPlan === true,
    completed: Array.isArray(value.completed)
      ? [
          ...new Set(
            value.completed.filter(
              (x) => typeof x === "string" && Object.hasOwn(STEPS, x),
            ),
          ),
        ]
      : [],
  };
}
export function recommendPath(value) {
  const p = normalizePreferences(value);
  let ids =
    p.goal === "contribute"
      ? ["oracle", "source-check", "contribution"]
      : p.goal === "learn"
        ? ["oracle", "playground", "observations"]
        : ["oracle", "playground", "news"];
  // A five-minute introduction never promises a longer contribution exercise.
  if (p.time === 5 && p.goal === "contribute")
    ids = ["oracle", "source-check", "news"];
  if (p.time >= 15)
    ids.push("glossary", p.goal === "contribute" ? "news" : "source-check");
  if (p.time === 30) ids.push("contribution");
  let remaining = p.time;
  return [...new Set(ids)]
    .map((id) => STEPS[id])
    .filter((step) => {
      if (step.minutes > remaining) return false;
      remaining -= step.minutes;
      return true;
    });
}
export function recommendTasks(value) {
  const p = normalizePreferences(value);
  return TASKS.filter((t) => t.minutes <= p.time).sort(
    (a, b) =>
      Number(b.interest === p.interest) - Number(a.interest === p.interest) ||
      a.minutes - b.minutes,
  );
}
export function progressFor(steps, completed) {
  const ids = new Set(completed);
  const done = steps.filter((s) => ids.has(s.id)).length;
  return {
    done,
    total: steps.length,
    percent: steps.length ? Math.round((done / steps.length) * 100) : 0,
  };
}
export function simulateObservations(values, age) {
  if (
    !Array.isArray(values) ||
    values.length !== 3 ||
    values.some(
      (x) => typeof x !== "number" || !Number.isFinite(x) || x < 50 || x > 150,
    ) ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 300
  )
    throw new Error("Use the playground’s supported ranges.");
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: sorted[1],
    spread: sorted[2] - sorted[0],
    fresh: age <= 180,
    age,
  };
}
export function reviewState(reviewed, now = new Date()) {
  const day = new Date(reviewed + "T00:00:00Z");
  if (
    typeof reviewed !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewed) ||
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== reviewed
  )
    return "needs-review";
  const age = Math.floor((now.getTime() - day.getTime()) / 86400000);
  return !Number.isFinite(age) || age < 0 || age > 30
    ? "needs-review"
    : "reviewed";
}
export function contributionDraft(task, note, source) {
  if (!TASKS.some((t) => t.id === task?.id))
    throw new Error("Choose a contribution first.");
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length < 20 || text.length > 1500)
    throw new Error(
      "Add an observation of 20–1500 characters in your own words.",
    );
  let u;
  try {
    u = new URL(source);
  } catch {
    throw new Error("Choose a listed official source.");
  }
  if (
    u.protocol !== "https:" ||
    !["www.redstone.finance", "docs.redstone.finance"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error("Choose a listed official source.");
  return `# Community contribution draft\n\n## Focus\n${task.title}\n\n## Source I checked\n${u.href}\n\n## My observation\n${text}\n\n## Before sharing\n- Confirm the wording against the original source.\n- Add a screenshot or example where useful.\n- Review this draft and choose where to share it yourself.\n\nPrepared locally with the independent RedStone Field Guide. This is not evidence of official approval or role eligibility.\n`;
}
