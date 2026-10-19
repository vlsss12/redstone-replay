import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STEPS,
  TASKS,
  LESSONS,
  UPDATES,
  LINKS,
} from "../src/community-data.js";
import {
  GOALS,
  TIMES,
  INTERESTS,
  normalizeProgress,
  recommendPath,
  recommendTasks,
  progressFor,
  simulateObservations,
  reviewState,
  contributionDraft,
} from "../src/community-model.js";
test("poisoned or corrupt local progress cannot create arbitrary steps or choices", () => {
  for (const value of [null, [], 7, "bad"])
    assert.equal(normalizeProgress(value).hasPlan, false);
  const r = normalizeProgress({
    hasPlan: "true",
    preferences: { goal: "<img>", time: 999, interest: "constructor" },
    completed: [
      "oracle",
      "oracle",
      "__proto__",
      "constructor",
      "unknown",
      {},
      null,
    ],
  });
  assert.deepEqual(r, {
    hasPlan: false,
    preferences: { goal: "new", time: 5, interest: "learn" },
    completed: ["oracle"],
  });
});
test("every preference combination produces unique known steps within the stated time", () => {
  for (const goal of GOALS)
    for (const time of TIMES)
      for (const interest of INTERESTS) {
        const steps = recommendPath({ goal, time, interest });
        assert.ok(steps.length >= 2);
        assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
        assert.ok(steps.every((s) => Object.hasOwn(STEPS, s.id)));
        assert.ok(steps.reduce((n, s) => n + s.minutes, 0) <= time);
        assert.ok(
          recommendTasks({ goal, time, interest }).every(
            (t) => t.minutes <= time,
          ),
        );
      }
});
test("progress is relative to the current route, not duplicate or unrelated completions", () => {
  const steps = recommendPath({ time: 5 });
  assert.deepEqual(progressFor(steps, ["oracle", "oracle", "contribution"]), {
    done: 1,
    total: 3,
    percent: 33,
  });
  assert.equal(progressFor([], []).percent, 0);
});
test("median illustration and freshness boundary are computed, not hard-coded", () => {
  assert.equal(simulateObservations([99, 100, 150], 30).median, 100);
  assert.equal(simulateObservations([150, 50, 99], 180).median, 99);
  assert.equal(simulateObservations([99, 100, 101], 180).fresh, true);
  assert.equal(simulateObservations([99, 100, 101], 181).fresh, false);
  for (const values of [
    [1, 2, 3],
    [99, 100],
    [NaN, 100, 101],
    [99, Infinity, 100],
  ])
    assert.throws(() => simulateObservations(values, 30));
});
test("review dates turn stale after 30 days and invalid/future dates are never fresh", () => {
  assert.equal(
    reviewState("2026-10-19", new Date("2026-11-18T12:00:00Z")),
    "reviewed",
  );
  assert.equal(
    reviewState("2026-10-19", new Date("2026-11-19T12:00:00Z")),
    "needs-review",
  );
  assert.equal(reviewState("bad", new Date()), "needs-review");
  assert.equal(
    reviewState("2026-02-30", new Date("2026-03-02")),
    "needs-review",
  );
  assert.equal(
    reviewState("2099-01-01", new Date("2026-10-19")),
    "needs-review",
  );
});
test("draft generator requires a real observation and an official HTTPS source", () => {
  const task = TASKS[0],
    note =
      "The first explanation could define a price feed before using that term.";
  const draft = contributionDraft(task, note, LINKS.basics);
  assert.ok(draft.includes(note));
  assert.ok(draft.includes("draft"));
  assert.throws(() => contributionDraft(task, "short", LINKS.basics));
  for (const source of [
    "javascript:alert(1)",
    "https://evil.test",
    "https://redstone.finance.evil.test/",
    "https://u:p@www.redstone.finance/",
  ])
    assert.throws(() => contributionDraft(task, note, source));
  assert.throws(() => contributionDraft({ id: "unknown" }, note, LINKS.basics));
});
test("published explainers and lessons link to primary sources and have coherent dates", () => {
  for (const u of UPDATES) {
    assert.match(u.published, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(u.reviewed >= u.published);
    assert.equal(new URL(u.source).hostname, "www.redstone.finance");
    assert.ok(u.action.length > 20);
  }
  for (const l of LESSONS) {
    assert.ok(l.correct >= 0 && l.correct < l.answers.length);
    assert.ok(Object.hasOwn(STEPS, l.id));
    assert.equal(new URL(l.source).protocol, "https:");
  }
});
