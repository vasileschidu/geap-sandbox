// Run: node test/working-days.test.mjs
// The working-days engine (js/working-days.js, calendar-v1) against the seed data/calendar.json — US-283…288.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WD = require("../js/working-days.js");
const seed = require("../data/calendar.json");

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };
const e = WD.create(seed.days);

check("US-287 AC-03: Orthodox Easter 2026 = 12 April, 2027 = 2 May", () => {
  assert.equal(WD.orthodoxEaster(2026), "2026-04-12");
  assert.equal(WD.orthodoxEaster(2027), "2027-05-02");
});
check("US-287 AC-04/05: Blajini = Easter + 8; weekend holidays flagged (not stored)", () => {
  const y = WD.nationalHolidays(2026);
  assert.equal(y.find((h) => h.reason === "Paștele Blajinilor").date, "2026-04-20");
  assert.deepEqual(y.filter((h) => h.weekend).map((h) => h.date), ["2026-03-08", "2026-04-12", "2026-05-09"]);
  assert.equal(seed.days.filter((d) => d.date.startsWith("2026") && d.source === "Generat").length, 9);
});
check("Monday–Friday rule + national exceptions + a transferred Saturday", () => {
  assert.equal(e.isWorkingDay("2026-10-26"), true);
  assert.equal(e.isWorkingDay("2026-10-25"), false);
  assert.equal(e.isWorkingDay("2026-01-02"), false);
  assert.equal(e.isWorkingDay("2026-01-10"), true);
});
check("the authority's day wins over the country's, the country's over the weekday", () => {
  assert.equal(e.isWorkingDay("2026-04-07", "ANSP"), false);
  assert.equal(e.isWorkingDay("2026-04-07"), true);
  assert.equal(e.isWorkingDay("2026-04-07", "ANTA"), true);
});
check("addWorkingDays skips 27 August and the weekend; 0 = the same day; negative counts back", () => {
  assert.equal(e.addWorkingDays("2026-08-26", 1), "2026-08-28");
  assert.equal(e.addWorkingDays("2026-08-26", 2), "2026-09-01");
  assert.equal(e.addWorkingDays("2026-08-26", 0), "2026-08-26");
  assert.equal(e.addWorkingDays("2026-09-01", -1), "2026-08-28");
});
check("workingDaysBetween counts (a, b]; reversed = negative", () => {
  assert.equal(e.workingDaysBetween("2026-08-26", "2026-08-26"), 0);
  assert.equal(e.workingDaysBetween("2026-08-26", "2026-09-01"), 2);
  assert.equal(e.workingDaysBetween("2026-09-01", "2026-08-26"), -2);
  assert.equal(e.workingDaysBetween("2025-12-31", "2026-01-31"), 19);
});
check("a deleted day counts for nothing", () => {
  const list = seed.days.map((d) => (d.date === "2026-08-27" ? { ...d, deleted: true } : d));
  assert.equal(WD.create(list).isWorkingDay("2026-08-27"), true);
});
console.log(`${passed} checks passed`);
