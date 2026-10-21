/* GEAPDrawer — the behaviour of the ONE drawer (drawer-v1, 2026-10-21; css/drawer.css, components.md › „Drawer”).
   Delegated once on the document, so every `.drawer-overlay` (static or rendered later) gets it without wiring:
   - focus trap: Tab / Shift+Tab cycle inside the open drawer (the topmost one; never while a library dialog,
     a confirm or a floating list is open above it);
   - Escape: when the drawer's own keydown code did not handle it, the drawer's header × is clicked — so its
     close path (unsaved-changes confirm included) runs, never a bypass;
   - focus return: the element focused before the drawer opened gets the focus back when it closes, unless the
     drawer's own code already moved it somewhere meaningful.
   Each drawer keeps its own open / close functions (content, draft, confirm hooks); they may call
   `GEAPDrawer.open(overlay, { focus })` / `GEAPDrawer.close(overlay, after)` for the shared show / hide + animation. */
(() => {
  if (window.GEAPDrawer) return;
  const CLOSE_MS = 120;
  const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), [contenteditable='true']";
  const ABOVE = ".modal-overlay.is-active, body > .e-permits-fo-select__list, .date-picker-panel:not([hidden]), .e-permits-fo-instance-switch-modal:not([hidden]), .e-permits-fo-doc-modal-overlay:not([hidden])";
  const openers = new WeakMap();
  let lastOutside = null;

  const isOpen = (overlay) => overlay && !overlay.hidden && !overlay.classList.contains("is-closing");
  const topmost = () => [...document.querySelectorAll(".drawer-overlay")].filter(isOpen).pop() || null;
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden]");
  const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter(visible);

  /* who opened it: the last focused element outside every drawer */
  document.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element) || event.target.closest(".drawer-overlay")) return;
    lastOutside = event.target;
  }, true);

  const remember = (overlay) => { if (!openers.has(overlay)) openers.set(overlay, document.activeElement !== document.body ? document.activeElement : lastOutside); };
  const giveBack = (overlay) => {
    const opener = openers.get(overlay);
    openers.delete(overlay);
    const active = document.activeElement;
    const lost = !active || active === document.body || overlay.contains(active);
    if (lost && opener?.isConnected && visible(opener)) opener.focus({ preventScroll: true });
  };

  /* opened / closed by any code: watch the `hidden` attribute of every overlay */
  const watched = new WeakSet();
  const observer = new MutationObserver((records) => {
    records.forEach(({ target }) => {
      if (!target.classList?.contains("drawer-overlay")) return;
      if (target.hidden) { window.setTimeout(() => giveBack(target), 0); return; }
      remember(target);
      document.body.classList.add("is-drawer-open");
    });
  });
  const watch = (root = document) => root.querySelectorAll?.(".drawer-overlay").forEach((overlay) => {
    if (watched.has(overlay)) return;
    watched.add(overlay);
    observer.observe(overlay, { attributes: true, attributeFilter: ["hidden"] });
    if (!overlay.hidden) remember(overlay);
  });
  new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.classList.contains("drawer-overlay")) watch(n.parentElement); else watch(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => watch()); else watch();

  document.addEventListener("keydown", (event) => {
    const overlay = topmost();
    if (!overlay || document.querySelector(ABOVE)) return;
    const drawer = overlay.querySelector(".drawer");
    if (event.key === "Tab") {
      const list = focusables(drawer);
      if (!list.length) { event.preventDefault(); drawer.focus(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!drawer.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && (active === first || active === drawer)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key !== "Escape" || event.defaultPrevented) return;
    /* an Escape that closes a menu / list / popover inside the drawer is not for the drawer */
    if (drawer.querySelector("[aria-expanded='true']")) return;
    /* the drawer's own Escape code runs first (it may ask to save); act only if nothing did */
    window.setTimeout(() => {
      if (event.defaultPrevented || !isOpen(overlay) || topmost() !== overlay || document.querySelector(ABOVE)) return;
      overlay.querySelector(".drawer__header > .modal-close")?.click();
    }, 0);
  });

  const open = (overlay, { focus } = {}) => {
    if (!overlay) return;
    remember(overlay);
    overlay.classList.remove("is-closing");
    overlay.hidden = false;
    document.body.classList.add("is-drawer-open");
    requestAnimationFrame(() => {
      const target = typeof focus === "string" ? overlay.querySelector(focus) : focus;
      (target || overlay.querySelector(".drawer"))?.focus?.();
    });
  };
  const close = (overlay, after) => {
    if (!isOpen(overlay)) return false;
    overlay.classList.add("is-closing");
    window.setTimeout(() => {
      overlay.hidden = true;
      overlay.classList.remove("is-closing");
      if (!topmost()) document.body.classList.remove("is-drawer-open");
      after?.();
    }, CLOSE_MS);
    return true;
  };

  window.GEAPDrawer = { open, close, isOpen, topmost };
})();
