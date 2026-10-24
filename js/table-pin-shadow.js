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
     `.has-overflow-start` (scrolled away from the start) / `.has-overflow-end` (more to scroll right);
   - (v3, sticky-col-shadow-v3) right after the table a 0-high `.table-pin-rail` (aria-hidden) holds one
     sticky `.table-pin-column--start / --end` per pinned side, sized from the pinned cells (`--pin-*`
     geometry properties on the rail) — the WHOLE pinned column as one element carrying the dropdown effect
     (ring + sideways shadows), instead of a shadow per cell.
   - (table-edge-shadow-v1, 2026-10-24, user: „we don't have fixed columns here, but can we put the same shadow +
     stroke at the edges of the screen so it's clear there's something to scroll?”) a side WITHOUT a pinned column
     of a table that scrolls sideways gets the same effect at the scroll box's own edge: the rail also holds a
     `.table-scroll-edges` clip with sticky `.table-scroll-edge--start / --end` segments that hang just outside the
     visible box (only their ring line + inward shadow show), same row runs as the pinned columns; the box gets
     `.has-edge-shadow` and the same `.has-overflow-start / -end` state. A pinned side keeps the column effect.
     Boxes with their own sideways cue (RAP's `.rap-table-scroller` mask fade) are left alone.
   The look lives in css/table-pin-shadow.css. Scroll events are caught once on the document
   (capture; scroll does not bubble); new / re-rendered tables are found by a MutationObserver and
   size changes by a ResizeObserver — the shell, the Ghișeu and the act view need no call. */
(() => {
  "use strict";

  const TABLES = "table";
  const EDGE_START = "is-pin-edge-start";
  const EDGE_END = "is-pin-edge-end";
  const BOX = "has-pin-shadow";
  const EDGE_BOX = "has-edge-shadow";
  const EDGES = "table-scroll-edges";
  const EDGE = "table-scroll-edge";
  /* scroll boxes that draw their own sideways cue (rap-table-scroll-v1 mask fade, rap-evo.js) */
  const OWN_CUE = ".rap-table-scroller";
  const RAIL = "table-pin-rail";
  const COLUMN = "table-pin-column";
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
      if (ox === "auto" || ox === "scroll") return el.matches(OWN_CUE) ? null : el;
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

  /* the rail right after the table: sticky column segments per pinned side (css/table-pin-shadow.css) */
  const railOf = (table, create) => {
    const next = table.nextElementSibling;
    if (next?.classList.contains(RAIL)) return next;
    if (!create) return null;
    const rail = document.createElement("div");
    rail.className = RAIL;
    rail.setAttribute("aria-hidden", "true");
    table.after(rail);
    return rail;
  };

  const setVar = (el, name, px) => {
    const value = `${Math.round(px * 100) / 100}px`;
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  };

  /* runs of consecutive rows that carry the edge cell of a side (header + data rows); a full-width row
     (group row, empty state) ends a run, a row with no height (collapsed / display none) does not */
  const runsOf = (table, has, top, k) => {
    const runs = [];
    let run = null;
    [...table.rows].forEach((row) => {
      const r = row.getBoundingClientRect();
      if (!r.height) return;
      if (has(row)) {
        if (run) run.bottom = (r.bottom - top) / k;
        else { run = { top: (r.top - top) / k, bottom: (r.bottom - top) / k }; runs.push(run); }
      } else run = null;
    });
    return runs;
  };

  const syncSide = (rail, side, runs, base = COLUMN) => {
    const segs = [...rail.children].filter((el) => el.classList.contains(`${base}--${side}`));
    while (segs.length > runs.length) segs.pop().remove();
    while (segs.length < runs.length) {
      const seg = document.createElement("div");
      seg.className = `${base} ${base}--${side}`;
      rail.append(seg);
      segs.push(seg);
    }
    runs.forEach((run, i) => {
      setVar(segs[i], "--pin-seg-top", run.top);
      setVar(segs[i], "--pin-seg-h", run.bottom - run.top);
    });
  };

  /* the box-edge segments live in their own clip (as wide as the table) inside the rail, on a track that is
     one hang wider on each side: a sticky segment can then rest just OUTSIDE the visible box at every scroll
     position (its containing block reaches past the table) without adding to the box's scroll width */
  const edgeTrackOf = (rail, create) => {
    let clip = [...rail.children].find((el) => el.classList.contains(EDGES));
    if (!clip && !create) return null;
    if (!clip) {
      clip = document.createElement("div");
      clip.className = EDGES;
      clip.append(document.createElement("div"));
      clip.firstChild.className = `${EDGES}__track`;
      rail.append(clip);
    }
    return clip.firstChild;
  };

  const syncRail = (table, startSpan, endSpan, k, edges) => {
    if (!startSpan && !endSpan && !edges.start && !edges.end) { railOf(table, false)?.remove(); return; }
    const rail = railOf(table, true);
    const t = table.getBoundingClientRect();
    setVar(rail, "--pin-rail-w", t.width / k);
    /* the rail is 0 high under the table: the segments move up by this much to reach the table's top */
    setVar(rail, "--pin-rail-up", (rail.getBoundingClientRect().top - t.top) / k);
    if (startSpan) { setVar(rail, "--pin-start-left", startSpan.offset); setVar(rail, "--pin-start-w", startSpan.width); }
    if (endSpan) { setVar(rail, "--pin-end-right", endSpan.offset); setVar(rail, "--pin-end-w", endSpan.width); }
    syncSide(rail, "start", startSpan ? runsOf(table, (row) => row.querySelector(`:scope > .${EDGE_START}`), t.top, k) : []);
    syncSide(rail, "end", endSpan ? runsOf(table, (row) => row.querySelector(`:scope > .${EDGE_END}`), t.top, k) : []);
    if (!edges.start && !edges.end) { edgeTrackOf(rail, false)?.parentElement.remove(); return; }
    const track = edgeTrackOf(rail, true);
    const runs = runsOf(table, edges.aligned, t.top, k);
    syncSide(track, "start", edges.start ? runs : [], EDGE);
    syncSide(track, "end", edges.end ? runs : [], EDGE);
  };

  const markTable = (table) => {
    const box = scrollBoxOf(table);
    const head = box && columnRow(table);
    let start = -1;
    let end = -1;
    /* the pinned span of each side, in sticky coordinates (independent of the scroll position):
       offset = the outer cell's `left` / `right`, width = up to the inner edge of the edge cell */
    let startSpan = null;
    let endSpan = null;
    /* rects include transforms (a dialog / section opening with a scale animation): every length read from
       a rect is divided by the table's current scale, so a measure taken mid-animation stays right */
    const k = (table.offsetWidth && table.getBoundingClientRect().width / table.offsetWidth) || 1;
    if (head) {
      let startRight = -Infinity;
      let endLeft = Infinity;
      let minLeft = Infinity;
      let minRight = Infinity;
      [...head.cells].forEach((cell, i) => {
        const cs = getComputedStyle(cell);
        if (cs.position !== "sticky") return;
        const r = cell.getBoundingClientRect();
        if (!r.width) return;
        if (cs.left !== "auto") {
          minLeft = Math.min(minLeft, parseFloat(cs.left) || 0);
          if (r.right > startRight) { startRight = r.right; start = i; startSpan = { far: (parseFloat(cs.left) || 0) + r.width / k }; }
        } else if (cs.right !== "auto") {
          minRight = Math.min(minRight, parseFloat(cs.right) || 0);
          if (r.left < endLeft) { endLeft = r.left; end = i; endSpan = { far: (parseFloat(cs.right) || 0) + r.width / k }; }
        }
      });
      if (startSpan) startSpan = { offset: minLeft, width: startSpan.far - minLeft };
      if (endSpan) endSpan = { offset: minRight, width: endSpan.far - minRight };
    }
    const width = head ? head.cells.length : 0;
    const isAligned = (row) => !!width && row.cells.length === width && ![...row.cells].some((c) => c.colSpan > 1);
    [...table.rows].forEach((row) => {
      const aligned = isAligned(row);
      [...row.cells].forEach((cell, i) => {
        cell.classList.toggle(EDGE_START, aligned && i === start);
        cell.classList.toggle(EDGE_END, aligned && i === end);
      });
    });
    if (!box) { railOf(table, false)?.remove(); return; }
    /* a table in a closed dialog / tab has no size yet: its first layout reruns the sync */
    observe(box);
    observe(table);
    const pinned = start > -1 || end > -1;
    /* a side without a pinned column gets the box-edge effect while the TABLE makes the box scroll sideways (not
       other wide content: a document canvas, a progress bar in a sheet) — only where the 0-high rail can follow
       the table as a block (not a flex / grid item beside it) */
    const flow = getComputedStyle(table.parentElement).display;
    const bs = getComputedStyle(box);
    const tableW = table.getBoundingClientRect().width / k + (parseFloat(bs.paddingLeft) || 0) + (parseFloat(bs.paddingRight) || 0);
    const scrolls = width > 0 && box.scrollWidth - box.clientWidth > SLACK
      && tableW > box.clientWidth + SLACK && tableW >= box.scrollWidth - SLACK - 1
      && (flow === "block" || flow === "flow-root");
    const edges = { start: scrolls && start === -1, end: scrolls && end === -1, aligned: isAligned };
    syncRail(table, start > -1 && startSpan, end > -1 && endSpan, k, edges);
    box.classList.toggle(BOX, pinned);
    box.classList.toggle(EDGE_BOX, edges.start || edges.end);
    /* a framed box (RAP / Cabinet act-field tables: 1px border + radius) already has its stroke on that side —
       the edge then adds only the shadow, not a second line inside the border */
    box.classList.toggle(`${EDGE_BOX}--framed-start`, edges.start && parseFloat(bs.borderLeftWidth) > 0);
    box.classList.toggle(`${EDGE_BOX}--framed-end`, edges.end && parseFloat(bs.borderRightWidth) > 0);
    if (!pinned && !edges.start && !edges.end) {
      box.classList.remove("has-overflow-start", "has-overflow-end");
      return;
    }
    updateBox(box);
  };

  const syncAll = () => {
    document.querySelectorAll(TABLES).forEach((table) => {
      /* tables that pin something, still carry marks / a rail from a wider screen, or sit in a sideways
         scroll box (box-edge effect; its size changes are observed from then on) */
      if (hasStickyCell(table) || table.querySelector(`.${EDGE_START}, .${EDGE_END}`) || railOf(table, false)) markTable(table);
      else if (scrollBoxOf(table)) markTable(table);
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
    if (box instanceof Element && (box.classList.contains(BOX) || box.classList.contains(EDGE_BOX))) updateBox(box);
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
