/* table-cells.js — behaviour for the `.cell` component.
   Two delegated concerns, both opt-in via data attributes:
     [data-cell-copy="<value>"]     copy-to-clipboard on a .cell__copy button
     [data-cell-tooltip="<text>"]   full text for a truncated .cell__truncate

   Deliberate choices, and why:
   - The tooltip only appears when the text is ACTUALLY clipped
     (scrollWidth > clientWidth), so untruncated cells stay quiet.
   - It triggers on focus as well as hover. The RAP implementation this
     replaces was pointer-only, which left truncated text unreachable by
     keyboard.
   - The copy handler stops propagation so clicking it never also opens a
     clickable row.
*/
(() => {
  "use strict";

  const COPIED_MS = 1600;
  const HIDE_MS = 150;

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

  /* ---------- truncation tooltip ---------- */

  let tip = null;
  let hideTimer = 0;

  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "cell-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }

  function show(target) {
    // only when the text is genuinely clipped
    if (target.scrollWidth <= target.clientWidth) return;
    const text = target.dataset.cellTooltip || target.textContent.trim();
    if (!text) return;

    const el = ensureTip();
    window.clearTimeout(hideTimer);
    el.textContent = text;
    el.hidden = false;

    const rect = target.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - box.width - 8);
    const above = rect.top - box.height - 6;
    const top = above >= 8 ? above : Math.min(window.innerHeight - box.height - 8, rect.bottom + 6);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;

    void el.offsetWidth; // force reflow so the transition runs
    el.classList.add("is-visible");
  }

  function hide() {
    if (!tip) return;
    tip.classList.remove("is-visible");
    hideTimer = window.setTimeout(() => { tip.hidden = true; }, HIDE_MS);
  }

  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-cell-tooltip]");
    if (t) show(t);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest("[data-cell-tooltip]")) hide();
  });
  // keyboard parity — the gap in the implementation this replaces
  document.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-cell-tooltip]");
    if (t) show(t);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.closest("[data-cell-tooltip]")) hide();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
})();
