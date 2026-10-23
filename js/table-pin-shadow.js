/* table-pin-shadow.js — the edge shadow of pinned (sticky) table columns.
   2026-10-23, user: „for scrollable tables with a fixed first and last column, apply the same dropdown
   effect to the columns when content goes under them, so it's clear there is something to scroll”.

   One module for every table that scrolls sideways inside its own box and pins columns with
   `position: sticky` (BO / eKYC / Ghișeu registries `.e-permits-workplace__table`, the classifier
   grid, the act-fields tables of RAP / Cabinet `.e-permits-act-fields__table`). No per-table setup:
   - the pinned columns are read from the CSS (the header row's computed `position` / `left` / `right`),
     so each registry's own pin rules (checkbox + number, name only, actions `pin: "end"`, phones with
     one pinned column) are followed as they are;
   - the INNER edge cell of each side gets `.is-pin-edge-start` (the right-most left-pinned column) /
     `.is-pin-edge-end` (the left-most right-pinned column) on every row whose cells line up with the
     header (colspan rows — group rows, empty states — are skipped);
   - the scroll box gets `.has-pin-shadow` and, while content is hidden under a pinned side,
     `.has-overflow-start` (scrolled away from the start) / `.has-overflow-end` (more to scroll right).
   The look lives in css/table-pin-shadow.css. Scroll events are caught once on the document
   (capture; scroll does not bubble); new / re-rendered tables are found by a MutationObserver and
   size changes by a ResizeObserver — the shell, the Ghișeu and the act view need no call. */
(() => {
  "use strict";

  const TABLES = "table";
  const EDGE_START = "is-pin-edge-start";
  const EDGE_END = "is-pin-edge-end";
  const BOX = "has-pin-shadow";
  /* sub-pixel scroll positions (zoom, fractional widths) must not leave a ghost shadow */
  const SLACK = 1;

  const observed = new WeakSet();
  let resizeObserver = null;
  const observe = (el) => {
    if (!resizeObserver || observed.has(el)) return;
    observed.add(el);
    resizeObserver.observe(el);
  };

  const scrollBoxOf = (table) => {
    for (let el = table.parentElement; el && el !== document.body; el = el.parentElement) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return el;
    }
    return null;
  };

  /* the first row whose cells are one per column: thead first, else the first body row */
  const columnRow = (table) => {
    const rows = [...table.rows];
    return rows.find((row) => row.parentElement?.tagName === "THEAD" && ![...row.cells].some((c) => c.colSpan > 1))
      || rows.find((row) => row.cells.length && ![...row.cells].some((c) => c.colSpan > 1))
      || null;
  };

  const updateBox = (box) => {
    const max = box.scrollWidth - box.clientWidth;
    const left = Math.abs(box.scrollLeft);
    box.classList.toggle("has-overflow-start", max > SLACK && left > SLACK);
    box.classList.toggle("has-overflow-end", max > SLACK && left < max - SLACK);
  };

  const markTable = (table) => {
    const box = scrollBoxOf(table);
    const head = box && columnRow(table);
    let start = -1;
    let end = -1;
    if (head) {
      let startRight = -Infinity;
      let endLeft = Infinity;
      [...head.cells].forEach((cell, i) => {
        const cs = getComputedStyle(cell);
        if (cs.position !== "sticky") return;
        const r = cell.getBoundingClientRect();
        if (!r.width) return;
        if (cs.left !== "auto" && r.right > startRight) { startRight = r.right; start = i; }
        else if (cs.left === "auto" && cs.right !== "auto" && r.left < endLeft) { endLeft = r.left; end = i; }
      });
    }
    const width = head ? head.cells.length : 0;
    [...table.rows].forEach((row) => {
      const aligned = row.cells.length === width && ![...row.cells].some((c) => c.colSpan > 1);
      [...row.cells].forEach((cell, i) => {
        cell.classList.toggle(EDGE_START, aligned && i === start);
        cell.classList.toggle(EDGE_END, aligned && i === end);
      });
    });
    if (!box) return;
    /* a table in a closed dialog / tab has no size yet: its first layout reruns the sync */
    observe(box);
    observe(table);
    const pinned = start > -1 || end > -1;
    box.classList.toggle(BOX, pinned);
    if (!pinned) {
      box.classList.remove("has-overflow-start", "has-overflow-end");
      return;
    }
    updateBox(box);
  };

  const syncAll = () => {
    document.querySelectorAll(TABLES).forEach((table) => {
      /* only tables that pin something, or still carry marks from a wider screen */
      if (hasStickyCell(table) || table.querySelector(`.${EDGE_START}, .${EDGE_END}`)) markTable(table);
    });
  };

  const hasStickyCell = (table) => {
    const row = columnRow(table);
    return !!row && [...row.cells].some((cell) => getComputedStyle(cell).position === "sticky");
  };

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncAll);
  };

  document.addEventListener("scroll", (event) => {
    const box = event.target;
    if (box instanceof Element && box.classList.contains(BOX)) updateBox(box);
  }, { capture: true, passive: true });

  const start = () => {
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(schedule);
    }
    /* re-rendered rows / opened dialogs with a table: only mutations that touch a table count */
    new MutationObserver((records) => {
      for (const rec of records) {
        const t = rec.target;
        if (t instanceof Element && t.closest("table")) { schedule(); return; }
        for (const node of rec.addedNodes) {
          if (node instanceof Element && (node.matches("table, tr, td, th, tbody, thead") || node.querySelector("table"))) { schedule(); return; }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    schedule();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
