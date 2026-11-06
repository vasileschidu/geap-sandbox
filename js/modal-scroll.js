/* Long modal — scroll cue (modal-scroll-v1, 2026-11-06, user: „when we have a longer modal, make it full height with
   some padding only; if there is stuff to scroll, do as Google does: an arrow with grey background, centred, a little
   transparent-to-white gradient, and the arrow disappears when the scroll finishes. Rule for all modals that are longer.”)
   components.md › „Long modal — full height + scroll cue”. CSS: css/modal-scroll.css.

   Auto-attaches to every open dialog of every family (no page code needed):
   - library `.modal-overlay.is-active > .modal` (body `.modal-content`) — BO passport / case / detail / registry modals,
     start dialog, RAP + Cabinet „Vizualizare act”, Ghișeu, classifier page; not the A4 viewers (pinned signature card)
     nor the Form Builder / Process Designer editors;
   - FO dialog shell `.e-permits-fo-doc-modal` (document picker / upload, Cabinet filters); not the A4 viewers;
   - phone bottom sheets `.bottom-sheet .bottom-sheet__panel` (Filtre, Sortează).
   A 0-high `.e-permits-scroll-cue` is inserted right after the scrolling body (before the footer): its fade (64, transparent →
   the surface colour) and the library Medium 40 round icon-only button (arrow down, icon 20, no border, „Derulează în jos”) paint over the bottom
   of the body. Shown while the body can scroll further down (more than 8 px left); hidden at the end, when nothing scrolls
   and while the dialog is closed. Click = smooth scroll by 80 % of the body height (instant with reduced motion).
   Re-measured on scroll, resize, content / attribute changes (tabs, accordions, async content) and image loads. */
(function () {
  if (window.GEAPModalScroll) return;

  const END_SLACK = 8;
  const STEP = 0.8;
  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();
  const REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const visible = (el) => Boolean(el && el.getClientRects().length);

  /* family → { dialog, body(dialog) → scroller, footer(dialog) → the element the cue sits before (null = end) } */
  const FAMILIES = [
    {
      dialog: ".modal-overlay.is-active > .modal:not(.e-permits-builder, .e-permits-detail-modal--doc)",
      body: (d) => d.querySelector(":scope > .modal-content"),
      footer: (d) => d.querySelector(":scope > .modal--footer")
    },
    {
      dialog: ".e-permits-fo-doc-modal-overlay:not([hidden]) > .e-permits-fo-doc-modal:not(.rap-act-modal__dialog):not(:has(> .cab-doc-modal__body--doc))",
      body: (d) => [...d.querySelectorAll(".e-permits-fo-doc-modal__list, .e-permits-fo-doc-modal__upload-content, :scope > .cab-filter__body")].find(visible) || null,
      footer: (d) => d.querySelector(":scope > .e-permits-fo-doc-modal__footer")
    },
    {
      dialog: ".bottom-sheet:not([hidden]) > .bottom-sheet__panel",
      body: (d) => d.querySelector(":scope > .bottom-sheet__content"),
      footer: (d) => d.querySelector(":scope > .bottom-sheet__footer")
    }
  ];
  const SELECTOR = FAMILIES.map((f) => f.dialog).join(", ");
  const tracked = new Map(); /* body → cue */

  const cueHtml = () => `
    <div class="e-permits-scroll-cue__fade">
      <button type="button" class="btn btn-neutral btn-md btn-icon-only btn-rounded e-permits-scroll-cue__btn" aria-label="Derulează în jos" tabindex="-1">
        <svg class="icon" aria-hidden="true"><use href="${SPRITE}#icon-arrow-down"></use></svg>
      </button>
    </div>`;

  const remaining = (body) => body.scrollHeight - body.clientHeight - body.scrollTop;

  const sync = (body, cue) => {
    const show = visible(body) && body.scrollHeight - body.clientHeight > END_SLACK && remaining(body) > END_SLACK;
    cue.classList.toggle("is-visible", show);
  };

  const attach = (dialog, family) => {
    const body = family.body(dialog);
    if (!body) return;
    let cue = tracked.get(body);
    const footer = family.footer(dialog);
    /* the cue sits right after the scroller: before the footer when the scroller is a direct child, else at its end */
    const anchorParent = body.parentElement;
    if (!cue) {
      cue = document.createElement("div");
      cue.className = "e-permits-scroll-cue";
      cue.setAttribute("data-scroll-cue", "");
      cue.innerHTML = cueHtml();
      cue.querySelector("button").addEventListener("click", () => {
        body.scrollBy({ top: Math.round(body.clientHeight * STEP), behavior: REDUCED?.matches ? "auto" : "smooth" });
      });
      tracked.set(body, cue);
      body.addEventListener("scroll", () => sync(body, cue), { passive: true });
      if (window.ResizeObserver) new ResizeObserver(() => sync(body, cue)).observe(body);
    }
    if (cue.previousElementSibling !== body || cue.parentElement !== anchorParent) {
      if (footer && footer.parentElement === anchorParent && body.nextElementSibling === footer) anchorParent.insertBefore(cue, footer);
      else body.after(cue);
    }
    sync(body, cue);
  };

  let frame = 0;
  const scan = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      /* closed dialogs / removed bodies: hide their cue (a re-opened dialog shows it again after its first measure) */
      tracked.forEach((cue, body) => {
        if (!body.isConnected) { cue.remove(); tracked.delete(body); return; }
        if (!body.closest(SELECTOR)) cue.classList.remove("is-visible");
      });
      FAMILIES.forEach((family) => document.querySelectorAll(family.dialog).forEach((dialog) => attach(dialog, family)));
    });
  };

  new MutationObserver((records) => {
    /* our own class flips do not need a re-scan */
    if (records.every((r) => r.type === "attributes" && r.target instanceof Element && r.target.classList.contains("e-permits-scroll-cue"))) return;
    scan();
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "open", "aria-hidden", "aria-expanded", "aria-selected"] });
  window.addEventListener("resize", scan);
  document.addEventListener("load", (event) => { if (event.target instanceof HTMLImageElement) scan(); }, true);
  document.addEventListener("transitionend", (event) => { if (event.target instanceof Element && event.target.matches(SELECTOR)) scan(); }, true);
  scan();

  window.GEAPModalScroll = { refresh: scan };
})();
