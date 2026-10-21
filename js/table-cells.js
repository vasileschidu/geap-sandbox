/* table-cells.js — behaviour for the `.cell` component.
   Two delegated concerns, both opt-in via data attributes:
     [data-cell-copy="<value>"]     copy-to-clipboard on a .cell__copy button
     [data-cell-tooltip="<text>"]   full text for a truncated .cell__truncate — shown by js/icon-tooltip.js
     [data-cell-tooltip-always]     with it, shown even when nothing is clipped —
                                    e.g. a "+3" overflow badge listing the hidden items
   RULE (2026-10-10): any text clipped inside a table cell (ellipsis or line clamp) shows its
   full text on hover / focus, with no attribute needed — `data-cell-tooltip` only overrides
   the text (e.g. a full name behind an abbreviation).

   Deliberate choices, and why:
   - The tooltip only appears when the text is ACTUALLY clipped
     (scrollWidth > clientWidth), so untruncated cells stay quiet.
   - It triggers on focus as well as hover. The RAP implementation this
     replaces was pointer-only, which left truncated text unreachable by
     keyboard.
   - Hover waits SHOW_DELAY_MS (1s) — sweeping the pointer across a table must
     not flash a tooltip on every cell. Once one is showing, moving straight to
     the next cell (within WARM_MS) shows it at once, so scanning a column does
     not mean waiting again. Keyboard focus shows it immediately.
   - The copy handler stops propagation so clicking it never also opens a
     clickable row.
*/
(() => {
  "use strict";

  const COPIED_MS = 1600;
  const HIDE_MS = 150;
  const SHOW_DELAY_MS = 1000;
  const WARM_MS = 300;

  /* ---------- clipboard ---------- */

  async function writeClipboard(value) {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return;
    }
    // http:// fallback — navigator.clipboard is undefined outside a secure context
    const scratch = document.createElement("textarea");
    scratch.value = value;
    scratch.setAttribute("readonly", "");
    scratch.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    scratch.remove();
    if (!ok) throw new Error("Copy command was rejected.");
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-cell-copy]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation(); // never let a copy click also open the row

    const value = button.dataset.cellCopy || "";
    try {
      await writeClipboard(value);
    } catch {
      return; // leave the button untouched rather than claiming a copy that failed
    }

    window.clearTimeout(button._cellCopyTimer);
    button.classList.add("is-copied");
    const label = button.getAttribute("aria-label");
    if (label) button.setAttribute("aria-label", label.replace(/^Copiază/, "Copiat"));

    button._cellCopyTimer = window.setTimeout(() => {
      button.classList.remove("is-copied");
      const current = button.getAttribute("aria-label");
      if (current) button.setAttribute("aria-label", current.replace(/^Copiat/, "Copiază"));
    }, COPIED_MS);
  }, true);

  /* the truncation tooltip (data-cell-tooltip, clipped text in a cell) lives in the ONE tooltip runtime,
     js/icon-tooltip.js (GEAPTooltip, tooltip-one-v1) — load it next to this file */
})();
