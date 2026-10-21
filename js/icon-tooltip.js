/* GEAPTooltip — the ONE tooltip runtime of the product (tooltip-one-v1, 2026-10-21).
   Every tooltip is the library `.tooltip` (main.css), one shared node `#icon-tooltip` appended to <body>.
   Two looks, both library:
   - plain   `.tooltip.tooltip--small.tooltip--plain` — no arrow, 12/16, padding 4 8, radius 4, `--gray-900`;
             names a control or shows a cut / abbreviated text;
   - hint    `.tooltip.tooltip--small.tooltip--{top|bottom}-center` + `.tooltip-arrow` — 14/20, padding 8 12,
             radius 6, max 240; an explanation (a sentence) next to a control or a mark.

   What opts an element in (read in this order, the innermost matching element wins):
   - `data-tooltip-reason="…"`  why a control is unavailable (any element, text buttons too) — plain;
   - `data-tooltip-hint="…"`    an explanation — hint look; also opens on a TAP on touch screens;
   - `data-tooltip-text="…"`    the full text of a control whose visible text is cut / abbreviated — plain;
   - `data-cell-tooltip[="…"]`  show the element's own text (or the value) ONLY when it is really clipped
                                (ellipsis / line clamp on it or on its clipping parent); `data-cell-tooltip-always`
                                shows it anyway („+N” badges) — plain, 1 s hover delay (table rule 2026-10-02);
   - icon-only `button`, `a[href]`, `[role=button]` (no visible text) — plain, the text = `data-tooltip-label`,
     else `aria-label`, else `title` (a title is moved to `data-tooltip-label`, so the native one never shows);
   - any text clipped inside a table cell (td / th / [role=cell]) — plain, like `data-cell-tooltip`, no attribute.
   Options: `data-tooltip-placement="bottom|top|right|left"` (default bottom for plain, top for hints; flips when
   there is no room, clamped 8 from the viewport edges) · `data-tooltip-delay="<ms>"` · `data-no-tooltip` opts out ·
   `data-tooltip-focus` on a focusable row shows its first `[data-tooltip-text]` child on keyboard focus.

   Behaviour (Material plain tooltip): mouse — after 600 ms (1 s for clipped text); while one shows, or within
   400 ms after, the next one shows at once. Keyboard — on :focus-visible, at once (clipped-text targets on any
   focus). Touch — only hints, on tap. Hides on mouse-out, blur, pointer-down, Escape, window blur, resize;
   follows the target on scroll, hides when it leaves the viewport. Never shown while the control's menu is
   open (`aria-expanded="true"`). A hint is the target's `aria-describedby` while it shows.
   `window.GEAPTooltip` = { show(el), hide(), refresh() } (`window.GEAPIconTooltip` kept as an alias). */
(() => {
  if (window.__iconTooltip) return;
  window.__iconTooltip = true;

  const SHOW_DELAY = 600;
  const CLIP_DELAY = 1000;
  const WARM_WINDOW = 400;
  const GAP = 4;
  const HINT_GAP = 0; /* the library .tooltip box keeps 8 of padding around the bubble = the arrow's room; the arrow tip lands ~4 from the target */
  const EDGE = 8;
  const CONTROL = "button, a[href], [role='button']";
  const EXPLICIT = "[data-tooltip-reason], [data-tooltip-hint], [data-tooltip-text], [data-cell-tooltip]";

  let tip = null;
  let target = null;
  let kind = "";
  let timer = 0;
  let lastHiddenAt = 0;
  let lastPointer = "mouse";

  const hasVisibleText = (el) => [...el.childNodes].some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== "";
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.matches("svg, img, [aria-hidden='true'], .sr-only, .visually-hidden, .u-visually-hidden")) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return hasVisibleText(node);
  });

  /* ---- clipped text ---- */
  const isClipped = (el) => el.clientWidth > 0 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  const clips = (style) => style.overflow !== "visible" || style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none";
  /* the element itself, or (an inline span) its nearest clipping parent */
  const clipBox = (el) => {
    for (let n = el, i = 0; n && i < 4; n = n.parentElement, i += 1) {
      const style = getComputedStyle(n);
      if (style.display !== "inline" && clips(style)) return n;
      if (n.matches("td, th, [role='cell'], [role='gridcell']")) return null;
    }
    return null;
  };
  /* …or a part inside it (an option / chip whose meta line is cut) */
  const clippedNow = (el) => {
    const box = clipBox(el);
    if (box && isClipped(box)) return true;
    return [...el.querySelectorAll("*")].slice(0, 24).some((n) => clips(getComputedStyle(n)) && n.textContent.trim() && isClipped(n));
  };
  /* RULE (2026-10-10): any text clipped inside a table cell shows its full text — no attribute needed */
  const clippedInCell = (node) => {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const cell = el?.closest?.("td, th, [role='cell'], [role='gridcell']");
    if (!cell) return null;
    for (let n = el; n && cell.contains(n); n = n.parentElement) {
      if (clips(getComputedStyle(n)) && n.textContent.trim() && isClipped(n)) return n;
      if (n === cell) break;
    }
    return null;
  };

  /* ---- what a target shows ---- */
  const kindOf = (el) => {
    if (el.dataset.tooltipReason) return "reason";
    if (el.dataset.tooltipHint) return "hint";
    if (el.dataset.tooltipText) return "text";
    if (el.hasAttribute("data-cell-tooltip") || el.__clipAuto) return "clip";
    return "label";
  };
  const labelOf = (el) => {
    const k = kindOf(el);
    if (k === "reason") return el.dataset.tooltipReason.trim();
    if (k === "hint") return el.dataset.tooltipHint.trim();
    if (k === "text") return el.dataset.tooltipText.trim();
    if (k === "clip") return (el.dataset.cellTooltip || el.textContent).trim().replace(/\s+/g, " ");
    if (el.hasAttribute("title")) {
      const title = el.getAttribute("title").trim();
      if (title && !el.dataset.tooltipLabel) el.dataset.tooltipLabel = title;
      if (title && !el.getAttribute("aria-label")) el.setAttribute("aria-label", title);
      el.removeAttribute("title");
    }
    return (el.dataset.tooltipLabel || el.getAttribute("aria-label") || "").trim();
  };

  const candidate = (node) => {
    if (!(node instanceof Element)) return null;
    const el = node.closest(`${EXPLICIT}, ${CONTROL}`);
    if (el && !el.hasAttribute("data-no-tooltip") && !el.hasAttribute("data-tooltip")) {
      const k = kindOf(el);
      if (k === "reason" || k === "hint" || k === "text") return el;
      if (k === "clip") return el.hasAttribute("data-cell-tooltip-always") || clippedNow(el) ? el : null;
      if (!el.disabled && el.getAttribute("aria-disabled") !== "true" && !hasVisibleText(el) && labelOf(el)) return el;
    }
    const auto = clippedInCell(node);
    if (auto && !auto.closest("[data-no-tooltip]")) { auto.__clipAuto = true; return auto; }
    return null;
  };

  /* ---- the node ---- */
  const ensureTip = () => {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.id = "icon-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = '<div class="tooltip-inner"></div><div class="tooltip-arrow"></div>';
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  };

  const sideOf = (el) => {
    const want = el.dataset.tooltipPlacement;
    return ["top", "bottom", "left", "right"].includes(want) ? want : kind === "hint" ? "top" : "bottom";
  };

  const place = () => {
    if (!tip || !target) return;
    const rect = target.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || !target.isConnected) { hide(); return; }
    const box = tip.getBoundingClientRect();
    const gap = kind === "hint" ? HINT_GAP : GAP;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let side = sideOf(target);
    const room = {
      top: rect.top - gap - box.height >= EDGE,
      bottom: rect.bottom + gap + box.height <= vh - EDGE,
      left: rect.left - gap - box.width >= EDGE,
      right: rect.right + gap + box.width <= vw - EDGE
    };
    const flip = { top: "bottom", bottom: "top", left: "right", right: "left" };
    if (!room[side] && room[flip[side]]) side = flip[side];
    let top;
    let left;
    if (side === "top" || side === "bottom") {
      top = side === "top" ? rect.top - gap - box.height : rect.bottom + gap;
      left = rect.left + rect.width / 2 - box.width / 2;
    } else {
      left = side === "left" ? rect.left - gap - box.width : rect.right + gap;
      top = rect.top + rect.height / 2 - box.height / 2;
    }
    left = Math.max(EDGE, Math.min(left, vw - EDGE - box.width));
    top = Math.max(EDGE, Math.min(top, vh - EDGE - box.height));
    tip.dataset.side = side;
    if (kind === "hint") {
      /* the library arrow classes: tooltip--top-center = above the target (arrow on the bubble's bottom edge) */
      tip.classList.remove("tooltip--top-center", "tooltip--bottom-center", "tooltip--left-center", "tooltip--right-center");
      tip.classList.add(`tooltip--${side}-center`);
      const arrow = tip.querySelector(".tooltip-arrow");
      /* the arrow points at the target's centre even when the bubble is clamped (geometry only) */
      if (side === "top" || side === "bottom") {
        const x = rect.left + rect.width / 2 - left;
        arrow.style.left = `${Math.round(Math.max(20, Math.min(x, box.width - 20)))}px`;
      } else arrow.style.left = "";
    }
    tip.style.top = `${Math.round(top + window.scrollY)}px`;
    tip.style.left = `${Math.round(left + window.scrollX)}px`;
  };

  const show = (el) => {
    const label = labelOf(el);
    if (!label || el.getAttribute("aria-expanded") === "true") return;
    ensureTip();
    clearTimeout(timer);
    if (target && target !== el) target.removeAttribute("aria-describedby");
    target = el;
    kind = kindOf(el);
    tip.className = kind === "hint" ? "tooltip tooltip--small tooltip--top-center" : "tooltip tooltip--small tooltip--plain";
    tip.querySelector(".tooltip-arrow").hidden = kind !== "hint";
    tip.querySelector(".tooltip-inner").textContent = label;
    if (kind === "hint" && !el.hasAttribute("aria-describedby") && !(el.getAttribute("aria-label") || "").includes(label)) { el.setAttribute("aria-describedby", tip.id); el.__tipDescribed = true; }
    tip.hidden = false;
    place();
    requestAnimationFrame(() => tip && target === el && tip.classList.add("show"));
  };

  const hide = () => {
    clearTimeout(timer);
    if (tip && !tip.hidden) lastHiddenAt = performance.now();
    if (target?.__tipDescribed) { target.removeAttribute("aria-describedby"); target.__tipDescribed = false; }
    target = null;
    if (tip) { tip.classList.remove("show"); tip.hidden = true; }
  };

  const delayOf = (el) => {
    const own = Number(el.dataset.tooltipDelay);
    if (Number.isFinite(own) && el.dataset.tooltipDelay !== undefined) return own;
    return kindOf(el) === "clip" ? CLIP_DELAY : SHOW_DELAY;
  };

  const schedule = (el) => {
    clearTimeout(timer);
    const warm = performance.now() - lastHiddenAt < WARM_WINDOW || (tip && !tip.hidden);
    const delay = warm ? 0 : delayOf(el);
    if (delay <= 0) { show(el); return; }
    timer = setTimeout(() => show(el), delay);
  };

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const el = candidate(event.target);
    if (!el || el === target) return;
    schedule(el);
  });

  document.addEventListener("pointerout", (event) => {
    const el = candidate(event.target);
    if (!el || (event.relatedTarget instanceof Node && el.contains(event.relatedTarget))) return;
    if (el === target || !target) hide();
  });

  document.addEventListener("focusin", (event) => {
    const inner = event.target.matches?.("[data-tooltip-focus]") ? event.target.querySelector("[data-tooltip-text]") : null;
    const el = candidate(event.target) || inner;
    if (!el) return;
    /* clipped text („+N” badges, cut names) shows on any focus; controls only on keyboard focus */
    const focusEl = el === inner ? event.target : el;
    if (kindOf(el) !== "clip" && !focusEl.matches(":focus-visible")) return;
    hide();
    show(el);
  });

  /* touch: a hint opens on tap (the explanation is otherwise unreachable); everything else stays quiet */
  document.addEventListener("pointerdown", (event) => { lastPointer = event.pointerType || "mouse"; hide(); }, true);
  document.addEventListener("click", (event) => {
    if (lastPointer === "mouse") return;
    const el = event.target instanceof Element ? event.target.closest("[data-tooltip-hint]") : null;
    if (el && !el.hasAttribute("data-no-tooltip")) show(el);
  }, true);

  document.addEventListener("focusout", (event) => { if (!target || event.target === target || event.target.contains?.(target)) hide(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
  window.addEventListener("scroll", () => { if (tip && !tip.hidden) place(); }, true);
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);

  const api = { show: (el) => el && show(el), hide, refresh: () => place() };
  window.GEAPTooltip = api;
  window.GEAPIconTooltip = api; /* older name (name-expand, breadcrumbs) */
})();
