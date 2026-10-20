/* Icon tooltip — names every icon-only control (a button or link with no visible text)
   with the library tooltip in its plain variant (.tooltip.tooltip--small.tooltip--plain).

   Behaviour follows the Google / Material "plain tooltip" pattern:
   - mouse: appears after a long hover (SHOW_DELAY); once one was shown, moving to a
     neighbouring icon shows the next one at once (WARM_WINDOW);
   - keyboard: appears on :focus-visible without delay;
   - hides on mouse-out, blur, click / pointer-down, scroll, Escape or window blur;
   - placed 4px below and centred on the control, flipped above when there is no room,
     clamped inside the viewport; never steals pointer events.

   The text is the control's data-tooltip-label, else aria-label, else title. A title
   is moved to data-tooltip-label (and copied to aria-label when that is missing) so
   the browser's own tooltip never doubles it. Opt out with data-no-tooltip; controls
   using the rich library tooltip (data-tooltip) are left alone. A control with visible but
   truncated text opts in with data-tooltip-text="<full text>" (2026-10-19); a focusable row with
   data-tooltip-focus shows its first such child's tooltip on keyboard focus (2026-10-20). Delegated once on the
   document, so content rendered later is covered without wiring. */
(() => {
  if (window.__iconTooltip) return;
  window.__iconTooltip = true;

  const SHOW_DELAY = 600;
  const WARM_WINDOW = 400;
  const GAP = 4;
  const EDGE = 8;

  let tip = null;
  let target = null;
  let timer = 0;
  let lastHiddenAt = 0;

  const hasVisibleText = (el) => [...el.childNodes].some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== "";
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.matches("svg, img, [aria-hidden='true'], .sr-only, .visually-hidden")) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return hasVisibleText(node);
  });

  const labelOf = (el) => {
    if (el.dataset.tooltipReason) return el.dataset.tooltipReason.trim();
    if (el.dataset.tooltipText) return el.dataset.tooltipText.trim();
    if (el.hasAttribute("title")) {
      const title = el.getAttribute("title").trim();
      if (title && !el.dataset.tooltipLabel) el.dataset.tooltipLabel = title;
      if (title && !el.getAttribute("aria-label")) el.setAttribute("aria-label", title);
      el.removeAttribute("title");
    }
    return (el.dataset.tooltipLabel || el.getAttribute("aria-label") || "").trim();
  };

  /* data-tooltip-reason opts any control in (text buttons too), typically one that is
     aria-disabled: the tooltip then says why it is unavailable */
  const candidate = (node) => {
    /* [data-tooltip-reason] also covers non-buttons, e.g. a checkbox container whose input is
       disabled (Documente › Obligatoriu while the document is hidden) */
    const el = node instanceof Element ? node.closest("[data-tooltip-reason], [data-tooltip-text], button, a[href], [role='button']") : null;
    if (!el || el.hasAttribute("data-no-tooltip") || el.hasAttribute("data-tooltip")) return null;
    if (el.dataset.tooltipReason) return el;
    /* data-tooltip-text: the full text of a control whose own text is cut (a long name in a
       header, js/name-expand.js) — shown like the plain tooltip; hidden while aria-expanded */
    if (el.dataset.tooltipText) return el;
    if (el.disabled || el.getAttribute("aria-disabled") === "true") return null;
    if (hasVisibleText(el)) return null;
    return labelOf(el) ? el : null;
  };

  const ensureTip = () => {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "tooltip tooltip--small tooltip--plain";
    tip.id = "icon-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = '<div class="tooltip-inner"></div>';
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  };

  const place = () => {
    if (!tip || !target) return;
    const rect = target.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    let top = rect.bottom + GAP;
    if (top + box.height > window.innerHeight - EDGE) top = rect.top - GAP - box.height;
    let left = rect.left + rect.width / 2 - box.width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - box.width));
    tip.style.top = `${Math.round(top + window.scrollY)}px`;
    tip.style.left = `${Math.round(left + window.scrollX)}px`;
  };

  const show = (el) => {
    const label = labelOf(el);
    if (!label || el.getAttribute("aria-expanded") === "true") return;
    ensureTip();
    target = el;
    tip.querySelector(".tooltip-inner").textContent = label;
    tip.hidden = false;
    tip.classList.remove("show");
    place();
    requestAnimationFrame(() => tip && target === el && tip.classList.add("show"));
  };

  const hide = () => {
    clearTimeout(timer);
    if (tip && !tip.hidden) lastHiddenAt = performance.now();
    target = null;
    if (tip) { tip.classList.remove("show"); tip.hidden = true; }
  };

  const schedule = (el, delay) => {
    clearTimeout(timer);
    if (delay <= 0) { show(el); return; }
    timer = setTimeout(() => show(el), delay);
  };

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse") return;
    const el = candidate(event.target);
    if (!el || el === target) return;
    const warm = performance.now() - lastHiddenAt < WARM_WINDOW || (tip && !tip.hidden);
    hide();
    schedule(el, warm ? 0 : SHOW_DELAY);
  });

  document.addEventListener("pointerout", (event) => {
    const el = candidate(event.target);
    if (!el || (event.relatedTarget instanceof Node && el.contains(event.relatedTarget))) return;
    hide();
  });

  document.addEventListener("focusin", (event) => {
    /* data-tooltip-focus (2026-10-20): a focusable container (a list row) shows the tooltip of its first
       truncated child (data-tooltip-text) on keyboard focus — the act / request rows' cut names */
    const inner = event.target.matches?.("[data-tooltip-focus]") ? event.target.querySelector("[data-tooltip-text]") : null;
    const el = candidate(event.target) || inner;
    if (!el || !(el === inner ? event.target : el).matches(":focus-visible")) return;
    hide();
    show(el);
  });

  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);
  /* for controls that change in place (a name that expands with Enter keeps focus) */
  window.GEAPIconTooltip = { hide };
})();
