/* =====================================================================================
   Working days — the ONE calendar engine of SIA GEAP (calendar-v1, 2026-10-26)
   Feature 93686 „Gestionarea calendarului”: US-283…288. Rule: Monday–Friday are working days; the calendar holds
   only the EXCEPTIONS — official holidays (generated, US-287), extra non-working days and working days moved to a
   weekend (manual, US-284). An exception applies to the whole country (authority null) or to ONE authority; for a
   date the authority's day wins over the country's, and the country's over the weekday (US-283 § Assumptions).
   Absences are NOT here (user decision 2026-10-26: they live only in the user profile, js absences module).

   Loaded synchronously in <head> (before the shell seeds the dossiers) on the BO pages. Data = data/calendar.json
   (seed) or, after a change made in Administrare › Calendar, localStorage `e-permits-calendar-v1` (the demo links
   clear it). Until the seed arrives the engine answers from the generated national holidays, so a synchronous caller
   never gets a pure Monday–Friday answer; wait for `ready` when the exact manual days matter.

   PUBLIC API — window.GEAPWorkingDays (keep it stable: the absences / distribution module reads it)
     dates in = "YYYY-MM-DD" strings or Date objects (local); dates out = "YYYY-MM-DD"; authority = a code („ANSP”)
     ready                                   Promise — the seed (+ local changes) is loaded
     isWorkingDay(date, authority?)          → boolean
     addWorkingDays(date, n, authority?)     → the n-th working day AFTER date (n = 0 → date); n < 0 counts back
     workingDaysBetween(a, b, authority?)    → working days d with a < d ≤ b (negative when b < a; 0 when equal)
     dayStatus(date, authority?)             → { working, exception: day | null } — which rule decided
     holidays(year?, { authority })          → the non-working exceptions in force (national + the authority's), sorted
     days({ year, includeDeleted })          → every exception row (copies) — the Calendar list
     nationalHolidays(year)                  → the US-287 list [{ date, reason, weekend }] (weekend ones are not stored)
     orthodoxEaster(year)                    → the Orthodox Easter Sunday (Julian computus + calendar offset)
     create(days)                            → { isWorkingDay, addWorkingDays, workingDaysBetween } over a candidate
                                               list (what-if previews: „how many deadlines would change”)
     onChange(fn)                            → unsubscribe; fn({ type, day? }) after every saved change
   Writers (js/calendar-admin.js only — the Calendar screens of the Central Admin):
     saveDay(day) · deleteDay(id) · addGenerated(days) · log(entry) · journal() · commit()
   Day shape: { id, date, type: "nelucratoare" | "lucratoare", reason, authority: null | code,
                source: "Generat" | "Manual", deleted: false, createdBy, createdAt, editedBy?, editedAt?,
                deletedBy?, deletedAt? }
   ===================================================================================== */
(function (root) {
  "use strict";

  const STORE_KEY = "e-permits-calendar-v1";
  const DATA_URL = "data/calendar.json";
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toDate = (value) => {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
  };
  const isoOf = (value) => { const d = toDate(value); return d ? iso(d) : ""; };
  const shift = (d, days) => { const next = new Date(d); next.setDate(next.getDate() + days); return next; };
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

  /* ---------------------------------------------------------------- US-287: the national holidays */
  /* Orthodox Easter = the Julian computus (Meeus) moved to the Gregorian calendar: +13 days until 28 Feb 2100,
     +14 in 2100 (the year range of the calendar is 2000–2100). 2026 → 12 April, 2027 → 2 May. */
  function orthodoxEaster(year) {
    const a = year % 4, b = year % 7, c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    const julian = new Date(year, month - 1, day, 12);
    return iso(shift(julian, year >= 2100 ? 14 : 13));
  }
  /* the list of US-287 (Codul muncii, art. 111 — „nu e confirmată juridic”, PO question 9); two holidays on the same
     date become one row with both reasons (Feature 93686) */
  function nationalHolidays(year) {
    const easter = toDate(orthodoxEaster(year));
    const fixed = (m, d, reason) => ({ date: `${year}-${pad(m)}-${pad(d)}`, reason });
    const list = [
      fixed(1, 1, "Anul Nou"),
      fixed(1, 7, "Nașterea lui Iisus Hristos (stil vechi)"),
      fixed(1, 8, "Nașterea lui Iisus Hristos (stil vechi)"),
      fixed(3, 8, "Ziua Internațională a Femeii"),
      { date: iso(easter), reason: "Paștele" },
      { date: iso(shift(easter, 1)), reason: "Paștele (a doua zi)" },
      { date: iso(shift(easter, 8)), reason: "Paștele Blajinilor" },
      fixed(5, 1, "Ziua Internațională a Solidarității Oamenilor Muncii"),
      fixed(5, 9, "Ziua Victoriei și Ziua Europei"),
      fixed(6, 1, "Ziua Ocrotirii Copilului"),
      fixed(8, 27, "Ziua Independenței"),
      fixed(8, 31, "Ziua Limbii Române („Limba noastră”)"),
      fixed(12, 25, "Nașterea lui Iisus Hristos (stil nou)")
    ];
    const byDate = new Map();
    list.forEach((h) => {
      const prev = byDate.get(h.date);
      if (prev) { if (prev.reason !== h.reason) prev.reason = `${prev.reason} · ${h.reason}`; return; }
      byDate.set(h.date, { ...h });
    });
    return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date)).map((h) => ({ ...h, weekend: isWeekend(toDate(h.date)) }));
  }

  /* ---------------------------------------------------------------- the engine over a list of days */
  function create(dayList) {
    const index = new Map(); /* date → { national, byAuthority: Map } — deleted days count for nothing */
    (dayList || []).forEach((day) => {
      if (!day || day.deleted) return;
      const slot = index.get(day.date) || { national: null, byAuthority: new Map() };
      if (day.authority) slot.byAuthority.set(day.authority, day); else slot.national = day;
      index.set(day.date, slot);
    });
    const exceptionOf = (d, authority) => {
      const slot = index.get(iso(d));
      if (!slot) return null;
      return (authority && slot.byAuthority.get(authority)) || slot.national || null;
    };
    const working = (d, authority) => {
      const day = exceptionOf(d, authority);
      if (day) return day.type === "lucratoare";
      return !isWeekend(d);
    };
    const engine = {
      dayStatus(date, authority = null) {
        const d = toDate(date);
        if (!d) return { working: false, exception: null };
        const exception = exceptionOf(d, authority);
        return { working: working(d, authority), exception: exception ? { ...exception } : null };
      },
      isWorkingDay(date, authority = null) {
        const d = toDate(date);
        return d ? working(d, authority) : false;
      },
      addWorkingDays(date, n, authority = null) {
        let d = toDate(date);
        if (!d) return "";
        const step = n < 0 ? -1 : 1;
        let left = Math.abs(Math.trunc(Number(n) || 0));
        /* a guard: at most 10 years of days */
        for (let guard = 0; left > 0 && guard < 3700; guard += 1) {
          d = shift(d, step);
          if (working(d, authority)) left -= 1;
        }
        return iso(d);
      },
      workingDaysBetween(a, b, authority = null) {
        const from = toDate(a), to = toDate(b);
        if (!from || !to) return 0;
        const sign = to < from ? -1 : 1;
        let d = sign > 0 ? from : to;
        const end = sign > 0 ? to : from;
        let count = 0;
        for (let guard = 0; iso(d) < iso(end) && guard < 37000; guard += 1) {
          d = shift(d, 1);
          if (working(d, authority)) count += 1;
        }
        return sign * count;
      }
    };
    return engine;
  }

  /* ---------------------------------------------------------------- data: seed + local changes */
  const generatedFallback = () => {
    const year = new Date().getFullYear();
    const days = [];
    for (let y = year - 1; y <= year + 2; y += 1) {
      nationalHolidays(y).filter((h) => !h.weekend).forEach((h) => days.push({ id: `cal-${h.date}`, date: h.date, type: "nelucratoare", reason: h.reason, authority: null, source: "Generat", deleted: false }));
    }
    return days;
  };
  const S = { days: generatedFallback(), journal: [], seq: 100, seed: null, fromStore: false };
  let live = create(S.days);
  const listeners = new Set();
  const emit = (event) => listeners.forEach((fn) => { try { fn(event); } catch (error) { console.warn(error); } });

  function readStore() {
    try { return JSON.parse(root.localStorage?.getItem(STORE_KEY) || "null"); } catch { return null; }
  }
  function adopt(data) {
    S.days = (data.days || []).map((day) => ({ deleted: false, ...day }));
    S.journal = data.journal || [];
    S.seq = data.seq || 100;
    live = create(S.days);
  }
  /* a change made before the seed arrived (none in practice) is kept: the store wins over the seed */
  const stored = readStore();
  if (stored?.days) { adopt(stored); S.fromStore = true; }
  const ready = (typeof fetch === "function" && root.document)
    ? fetch(DATA_URL, { cache: "no-store" }).then((r) => r.json()).then((seed) => {
      S.seed = seed;
      if (!S.fromStore) adopt(seed);
      return api;
    }).catch((error) => { console.warn("[working-days]", error); return api; })
    : Promise.resolve(null);

  function commit(event = { type: "change" }) {
    live = create(S.days);
    try { root.localStorage?.setItem(STORE_KEY, JSON.stringify({ days: S.days, journal: S.journal, seq: S.seq })); } catch { /* private mode: session only */ }
    emit(event);
  }
  const nextId = (date, authority) => {
    S.seq += 1;
    return `cal-${date}${authority ? `-${String(authority).toLowerCase()}` : ""}-${S.seq}`;
  };

  const api = {
    version: 1,
    ready,
    STORE_KEY,
    isWorkingDay: (date, authority) => live.isWorkingDay(date, authority),
    addWorkingDays: (date, n, authority) => live.addWorkingDays(date, n, authority),
    workingDaysBetween: (a, b, authority) => live.workingDaysBetween(a, b, authority),
    dayStatus: (date, authority) => live.dayStatus(date, authority),
    holidays(year = null, { authority = null } = {}) {
      return S.days
        .filter((day) => !day.deleted && day.type === "nelucratoare" && (!year || day.date.startsWith(`${year}-`)) && (!day.authority || day.authority === authority))
        .filter((day) => (day.authority ? true : !S.days.some((o) => !o.deleted && o.authority && o.authority === authority && o.date === day.date)))
        .map((day) => ({ ...day }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    days({ year = null, includeDeleted = false } = {}) {
      return S.days.filter((day) => (includeDeleted || !day.deleted) && (!year || day.date.startsWith(`${year}-`))).map((day) => ({ ...day }));
    },
    nationalHolidays,
    orthodoxEaster,
    isWeekend: (date) => { const d = toDate(date); return d ? isWeekend(d) : false; },
    iso: isoOf,
    create: (list) => create(list),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /* ---- writers (Administrare › Calendar) */
    saveDay(day) {
      const at = S.days.findIndex((d) => d.id === day.id);
      const row = { deleted: false, ...day, id: day.id || nextId(day.date, day.authority) };
      if (at >= 0) S.days[at] = row; else S.days.push(row);
      commit({ type: at >= 0 ? "edit" : "add", day: { ...row } });
      return { ...row };
    },
    deleteDay(id, { by = "", at = "" } = {}) {
      const day = S.days.find((d) => d.id === id);
      if (!day) return null;
      Object.assign(day, { deleted: true, deletedBy: by, deletedAt: at });
      commit({ type: "delete", day: { ...day } });
      return { ...day };
    },
    /* US-287: the missing national holidays of a year — never over an existing national day (manual or deleted) */
    missingHolidays(year) {
      return nationalHolidays(year).filter((h) => !h.weekend && !S.days.some((d) => !d.authority && d.date === h.date));
    },
    addGenerated(list, { by = "", at = "" } = {}) {
      const added = list.map((h) => ({ id: nextId(h.date, null), date: h.date, type: "nelucratoare", reason: h.reason, authority: null, source: "Generat", deleted: false, createdBy: by, createdAt: at }));
      S.days.push(...added);
      commit({ type: "generate", days: added.map((d) => ({ ...d })) });
      return added;
    },
    log(entry) { S.journal.unshift({ ...entry }); commit({ type: "log" }); },
    journal: () => S.journal.map((e) => ({ ...e })),
    commit
  };
  root.GEAPWorkingDays = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
