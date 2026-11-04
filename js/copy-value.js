/* Copy value — ONE copy-to-clipboard component for the whole prototype (2026-10-20, rebuilt 2026-10-21 copy-wrap-v1).

   User (2026-10-20): „the copy code is different, let's use the same everywhere as a component”.
   User (2026-10-21): „The hover should be on the entire element, and do a nice even grey wrap on hover, as we used in the
   first places” + „all should have on hover a nice even „Copiază” tooltip, and on click a smooth transition to „Copiat”
   with a green check … The only exceptions are tables or stacked lists where space is restricted: there, let's not use
   the copy icon, but the behaviour is the same.”

   ONE interactive element: a native <button> that holds the value AND the 16 copy icon, so the whole element is the
   hover / click / focus target and gets one even grey wrap (css/copy-value.css). The value text stays in the button
   (the accessible name „Copiază <label> <value>” already contains it; Enter / Space copy natively).

   Variants (one component):
     default  GEAPCopyValue.html(value, { label })                  value + 16 icon — profiles, header meta, detail rows,
                                                                     identity cards, dialogs, side panels
     compact  GEAPCopyValue.html(value, { label, compact: true })   value only, same wrap / tooltip / „Copiat” — tables,
                                                                     stacked rows, act / request row meta
     link     GEAPCopyValue.html(url, { label, text: "<a …>" })     a value that is itself a link cannot sit inside a
                                                                     button: the link stays outside, the button wraps the
                                                                     icon only (same wrap tokens) — classifier „Link la sursă”

   Markup (default):
     <span class="copy-value">
       <button class="copy-value__button" type="button" data-copy-value="D-2026-004575"
               aria-label="Copiază numărul dosarului D-2026-004575" data-no-tooltip>
         <span class="copy-value__text">D-2026-004575</span>
         <svg class="icon small copy-value__icon" width="16" height="16" aria-hidden="true"><use href="…#icon-copy"></use></svg>
       </button>
     </span>
   compact = `copy-value copy-value--compact`, no svg.

   Feedback = the ONE tooltip body (.tooltip.tooltip--small.tooltip--plain + css/tooltip.css), above the element, 4 away
   (below when there is no room), placed by the shared GEAPTooltip.align (tooltip-edge-v1: left edge on the element's
   left edge, right edge on its right edge near the right gutter, centred only as a last resort; text left-aligned).
   Its own node only for the label morph: „Copiază” on hover (600 ms, at once while warm / on keyboard focus) → on a
   copy „Copiază” slides 8 to the left while fading out, „✓ Copiat” (green 20 check + 12/16 text) fades in, and the box
   width grows to fit it from the anchored edge (225 ms, decelerate; an instant swap with prefers-reduced-motion),
   stays 1 500 ms, then fades out. A polite live region says
   „Copiat”. Clipboard: navigator.clipboard → execCommand("copy") on a hidden textarea → the value text is selected
   and the tooltip says to press Ctrl+C / ⌘C. The click is handled in the CAPTURE phase on the document and stopped
   there, so a row, card or dialog that holds the value never reacts to the copy click. */
(() => {
  if (window.GEAPCopyValue) return;

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();

  const SHOW_DELAY = 600;   /* js/icon-tooltip.js timing */
  const WARM_WINDOW = 400;
  const COPIED_MS = 1500;
  const FADE_MS = 150;      /* the library tooltip opacity transition (0.12 s) + a frame */
  const GAP = 4;            /* tooltip ↔ the grey wrap */
  const EDGE = 8;

  const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘C" : "Ctrl+C";
  const REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, extra = "") => `<svg class="icon small${extra}" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#${name}"></use></svg>`;

  /* value: what is copied (and shown). label: the button's aria-label (default „Copiază <value>”).
     text: optional display HTML when it differs from the value (a shortened hash, a link). compact: list views (no icon).
     className: placement hook on the wrapper (never restyles the control). */
  function html(value, { label = "", text = null, className = "", compact = false } = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const aria = label || `Copiază ${raw}`;
    const shown = text ?? esc(raw);
    const attrs = `type="button" data-copy-value="${esc(raw)}" aria-label="${esc(aria)}" data-no-tooltip`;
    const hook = className ? ` ${esc(className)}` : "";
    /* a value that is interactive itself (a link) cannot live inside a button */
    if (/<(a|button)\b/i.test(shown)) {
      return `<span class="copy-value copy-value--link${hook}"><span class="copy-value__text">${shown}</span><button class="copy-value__button copy-value__button--icon" ${attrs}>${icon("icon-copy", " copy-value__icon")}</button></span>`;
    }
    if (compact) {
      return `<span class="copy-value copy-value--compact${hook}"><button class="copy-value__button" ${attrs}><span class="copy-value__text">${shown}</span></button></span>`;
    }
    return `<span class="copy-value${hook}"><button class="copy-value__button" ${attrs}><span class="copy-value__text">${shown}</span>${icon("icon-copy", " copy-value__icon")}</button></span>`;
  }

  /* ---- clipboard ---------------------------------------------------------------------------- */
  async function writeClipboard(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext !== false) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) { /* permission / focus — try the legacy path */ }
    }
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.className = "copy-value__buffer";
    const keep = document.activeElement;
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    area.remove();
    if (keep instanceof HTMLElement) keep.focus({ preventScroll: true });
    return ok;
  }

  function selectText(button) {
    const text = button.closest(".copy-value")?.querySelector(".copy-value__text");
    const selection = window.getSelection?.();
    if (!text || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /* ---- tooltip (the ONE tooltip body, own node for the morph) ---------------------------------- */
  let tip = null;
  let inner = null;
  let live = null;
  let target = null;
  let timer = 0;
  let copiedTimer = 0;
  let hideTimer = 0;
  let lastHiddenAt = 0;

  const reduced = () => Boolean(REDUCED?.matches);

  /* the three labels share one cell: the active one is in flow (sets the width), the others sit on its left padding,
     transparent — so a switch is a cross-fade + slide while the width animates from the anchored edge */
  const ensureTip = () => {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "tooltip tooltip--small tooltip--plain copy-value__tooltip";
    tip.id = "copy-value-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = `<div class="tooltip-inner copy-value__tip">`
      + `<span class="copy-value__tip-label" data-tip="hint">Copiază</span>`
      + `<span class="copy-value__tip-label copy-value__copied" data-tip="copied"><svg class="icon copy-value__copied-icon" width="20" height="20" aria-hidden="true"><use href="${SPRITE}#icon-checkmark-small"></use></svg><span>Copiat</span></span>`
      + `<span class="copy-value__tip-label" data-tip="select">Apasă ${SHORTCUT} pentru a copia</span>`
      + `</div>`;
    tip.hidden = true;
    inner = tip.querySelector(".copy-value__tip");
    inner.addEventListener("transitionend", (event) => {
      if (event.target === inner && event.propertyName === "width") { inner.classList.remove("is-resizing"); inner.style.width = ""; }
    });
    document.body.appendChild(tip);
    return tip;
  };

  const ensureLive = () => {
    if (live) return live;
    live = document.createElement("div");
    live.className = "u-visually-hidden copy-value__live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
    return live;
  };

  const labels = () => [...inner.querySelectorAll(".copy-value__tip-label")];

  /* above the element (below when there is no room), aligned by the shared GEAPTooltip.align with the WIDEST label, so
     the „Copiat” width change never pushes it into the screen edge. JS writes the anchored edge x: start = the left
     edge, end = the right edge (CSS translate −100 %), center = the centre (−50 %) — the box grows from that edge */
  const place = () => {
    if (!tip || !target || !target.isConnected) return;
    const rect = target.getBoundingClientRect();
    const height = tip.offsetHeight;
    const cs = getComputedStyle(inner);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const widest = Math.max(inner.offsetWidth, ...labels().filter((label) => label.dataset.tip !== "select" || label.classList.contains("is-active")).map((label) => label.offsetWidth + padX));
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const fallback = () => {
      const top = rect.top - GAP - height >= EDGE ? rect.top - GAP - height : rect.bottom + GAP;
      const start = rect.left + widest <= vw - 2 * EDGE; /* the right 16 gutter */
      return { top, left: start ? rect.left : Math.max(EDGE, rect.right - widest), side: top < rect.top ? "top" : "bottom", align: start ? "start" : "end" };
    };
    const at = window.GEAPTooltip?.align ? window.GEAPTooltip.align(rect, widest, height, "top", GAP) : fallback();
    tip.classList.toggle("is-below", at.side === "bottom");
    tip.dataset.align = at.align;
    tip.__tooltipTarget = target; /* read by tools/ui-qa/component-audit.mjs (tooltip-centered) */
    const x = at.align === "end" ? at.left + widest : at.align === "center" ? at.left + widest / 2 : at.left;
    tip.style.top = `${Math.round(at.top + window.scrollY)}px`;
    tip.style.left = `${Math.round(x + window.scrollX)}px`;
  };

  const setKind = (kind, animate) => {
    const from = inner.getBoundingClientRect().width;
    inner.classList.remove("is-resizing");
    inner.style.width = "";
    for (const label of labels()) {
      const on = label.dataset.tip === kind;
      const was = label.classList.contains("is-active");
      label.classList.toggle("is-active", on);
      label.classList.toggle("is-leaving", !on && was && animate);
      if (!on && !(was && animate)) label.classList.remove("is-leaving");
    }
    tip.dataset.kind = kind;
    if (!animate || reduced()) return;
    const to = inner.getBoundingClientRect().width;
    if (Math.abs(to - from) < 0.5) return;
    inner.style.width = `${from}px`;
    void inner.offsetWidth;
    inner.classList.add("is-resizing");
    inner.style.width = `${to}px`;
  };

  const show = (button, kind = "hint") => {
    ensureTip();
    clearTimeout(hideTimer);
    const switching = !tip.hidden && tip.classList.contains("show") && target === button;
    target = button;
    /* a cut value (compact list cell) names itself in the hint */
    const text = button.querySelector(".copy-value__text");
    const cut = text && text.scrollWidth > text.clientWidth + 1;
    tip.querySelector('[data-tip="hint"]').textContent = cut ? `Copiază ${button.dataset.copyValue || text.textContent.trim()}` : "Copiază";
    if (switching) {
      setKind(kind, true);
      place();
      return;
    }
    setKind(kind, false);
    tip.hidden = false;
    tip.classList.remove("show");
    place();
    requestAnimationFrame(() => tip && target === button && tip.classList.add("show"));
  };

  const hide = (immediate = false) => {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    target = null;
    if (!tip || tip.hidden) return;
    lastHiddenAt = performance.now();
    tip.classList.remove("show");
    if (immediate || reduced()) { tip.hidden = true; return; }
    hideTimer = setTimeout(() => { if (!target && tip) tip.hidden = true; }, FADE_MS);
  };

  const isCopied = (button) => button.classList.contains("is-copied");

  async function copy(button) {
    const value = button.dataset.copyValue || button.closest(".copy-value")?.querySelector(".copy-value__text")?.textContent.trim() || "";
    if (!value) return false;
    const ok = await writeClipboard(value);
    clearTimeout(copiedTimer);
    clearTimeout(timer);
    document.querySelectorAll(".copy-value__button.is-copied").forEach((other) => other !== button && other.classList.remove("is-copied"));
    if (ok) {
      button.classList.add("is-copied");
      show(button, "copied");
      ensureLive().textContent = "Copiat";
      /* „Copiat” stays its 1.5 s, then the tooltip fades out (also while the pointer still rests on the value) */
      copiedTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (live) live.textContent = "";
        if (target === button) hide();
      }, COPIED_MS);
    } else {
      selectText(button);
      show(button, "select");
      ensureLive().textContent = `Valoarea este selectată. Apasă ${SHORTCUT} pentru a o copia.`;
      copiedTimer = window.setTimeout(() => { if (target === button) hide(); }, COPIED_MS * 2);
    }
    return ok;
  }

  const buttonOf = (node) => (node instanceof Element ? node.closest(".copy-value__button") : null);

  /* capture phase + stop: the row / card / dialog that holds the value never sees the click */
  document.addEventListener("click", (event) => {
    const button = buttonOf(event.target);
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    copy(button);
  }, true);

  /* Enter / Space on the copy button belong to the button: a row that opens on Enter (RAP / BO tables, act rows) never
     sees them (capture + stop, no preventDefault — the native click still copies) */
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && buttonOf(event.target) === event.target) event.stopPropagation();
  }, true);

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const button = buttonOf(event.target);
    if (!button || button === target) return;
    const warm = performance.now() - lastHiddenAt < WARM_WINDOW || (tip && !tip.hidden && tip.classList.contains("show"));
    hide(true);
    clearTimeout(timer);
    timer = setTimeout(() => show(button, "hint"), warm ? 0 : SHOW_DELAY);
  });

  document.addEventListener("pointerout", (event) => {
    const button = buttonOf(event.target);
    if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
    if (button === target && isCopied(button)) return; /* „Copiat” stays its 1.5 s */
    clearTimeout(timer);
    if (button === target && !button.matches(":focus-visible")) hide();
  });

  document.addEventListener("focusin", (event) => {
    const button = buttonOf(event.target);
    if (!button || !button.matches(":focus-visible")) return;
    if (button === target) return;
    hide(true);
    show(button, isCopied(button) ? "copied" : "hint");
  });

  document.addEventListener("focusout", (event) => {
    const button = buttonOf(event.target);
    if (button && button === target && !isCopied(button)) hide();
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && target) hide(); });
  window.addEventListener("scroll", () => { if (target) place(); }, true);
  window.addEventListener("resize", () => hide(true));
  window.addEventListener("blur", () => hide(true));

  window.GEAPCopyValue = { html, copy, hide, sprite: SPRITE };
})();
