/* ==========================================================================================================
   GEAPPager — ONE list pager for every product (audit-fix-v3, 2026-10-21; promoted from CabEvo.pagerHtml)
   „1–16 din 33” · library `.pagination` (‹ 1 2 3 … 9 ›) · „16 pe pagină ⌄” (library `btn btn-text-neutral btn-sm`
   opening the one dropdown item menu). Used by EVO Cabinet (Actele mele permisive, Solicitările mele), RAP and
   every BO / eKYC / Ghișeu registry (the shell workplace footer). No pager when everything fits on the smallest
   page size.

   GEAPPager.html({ total, page, perPage, sizes, prefix, label, sizeLabel, sprite }) → markup
     data hooks: data-<prefix>-page="N" on the page buttons, data-<prefix>-per-page="N" on the menu items — the
     page keeps its own click handler for both (state + render are the page's).
   The size menu (open / close, keyboard: Enter / Space / ↓ open on the first item, ↑ on the last, ↑ ↓ Home End
   inside, Esc closes and returns focus, Tab and an outside click close) is handled here, once, on the document.
   ========================================================================================================== */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const defaultSprite = () => {
    const src = document.currentScript?.src || "";
    return src ? src.replace(/js\/pager\.js.*$/, "assets/icons/sprite.svg") : "assets/icons/sprite.svg";
  };
  const SPRITE = defaultSprite();
  let uid = 0;

  /* page window: every page up to 7, else 1 … (p − 1) p (p + 1) … N (7 slots) */
  function pageList(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const out = [1];
    let from = Math.max(2, page - 1);
    let to = Math.min(pages - 1, page + 1);
    if (page <= 3) { from = 2; to = 4; }
    if (page >= pages - 2) { from = pages - 3; to = pages - 1; }
    if (from > 2) out.push("…");
    for (let p = from; p <= to; p += 1) out.push(p);
    if (to < pages - 1) out.push("…");
    out.push(pages);
    return out;
  }

  function html({ total, page = 1, perPage, sizes = [10, 20, 50], prefix = "pager", label = "Paginare", sizeLabel = "Rânduri pe pagină", sprite = SPRITE } = {}) {
    if (!total || total <= sizes[0]) return "";
    const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="${sprite}#${name}"></use></svg>`;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, page), pages);
    const first = (current - 1) * perPage + 1;
    const last = Math.min(total, current * perPage);
    const menuId = `${prefix}-per-page-${++uid}`;
    const link = (target, text, { disabled = false, active = false, aria = "" } = {}) => `
      <li class="pagination__item">
        <button class="pagination__link${active ? " pagination__link--active" : ""}${disabled ? " pagination__link--disabled" : ""}" type="button" data-${prefix}-page="${target}"${disabled ? " disabled" : ""}${active ? ' aria-current="page"' : ""}${aria ? ` aria-label="${esc(aria)}"` : ""}>${text}</button>
      </li>`;
    const gap = '<li class="pagination__item" aria-hidden="true"><span class="pagination__link pagination__link--disabled e-permits-pager__gap">…</span></li>';
    return `
      <div class="e-permits-pager">
        <p class="e-permits-pager__range">${first}–${last} din ${total}</p>
        <nav class="e-permits-pager__nav" aria-label="${esc(label)}">
          <ul class="pagination">
            ${link(current - 1, icon("icon-chevron-left-small"), { disabled: current === 1, aria: "Pagina anterioară" })}
            ${pageList(current, pages).map((p) => (p === "…" ? gap : link(p, String(p), { active: p === current, aria: `Pagina ${p}` }))).join("")}
            ${link(current + 1, icon("icon-chevron-right-small"), { disabled: current === pages, aria: "Pagina următoare" })}
          </ul>
        </nav>
        <div class="e-permits-pager__size">
          <button class="btn btn-text-neutral btn-sm e-permits-pager__trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-pager-size-trigger><span>${perPage} pe pagină</span>${icon("icon-chevron-bottom")}</button>
          <ul class="e-permits-fo-intent-menu e-permits-pager__menu" id="${menuId}" role="menu" aria-label="${esc(sizeLabel)}" hidden>
            ${sizes.map((size) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${size === perPage}" data-${prefix}-per-page="${size}"><span>${size} pe pagină</span>${size === perPage ? icon("icon-checkmark-large") : ""}</button></li>`).join("")}
          </ul>
        </div>
      </div>`;
  }

  /* ---------- the size menu (one document listener for every pager) ---------- */
  const itemsOf = (menu) => [...menu.querySelectorAll("[role^='menuitem']")].filter((item) => !item.disabled && item.getClientRects().length);
  const menuOf = (trigger) => document.getElementById(trigger.getAttribute("aria-controls"));
  function close(trigger, focus = false) {
    const menu = trigger && menuOf(trigger);
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (focus) trigger.focus();
  }
  function closeAll(except = null) {
    document.querySelectorAll("[data-pager-size-trigger][aria-expanded='true']").forEach((t) => { if (t !== except) close(t); });
  }
  function open(trigger, focusItem = null) {
    const menu = menuOf(trigger);
    if (!menu) return;
    closeAll(trigger);
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const items = itemsOf(menu);
    if (focusItem === "first") items[0]?.focus();
    if (focusItem === "last") items[items.length - 1]?.focus();
  }
  let keyOpen = null;

  document.addEventListener("keydown", (event) => {
    const trigger = event.target.closest?.("[data-pager-size-trigger]");
    if (trigger) {
      keyOpen = event.key === "Enter" || event.key === " " ? trigger : null;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        open(trigger, event.key === "ArrowDown" ? "first" : "last");
      }
      return;
    }
    const menu = event.target.closest?.(".e-permits-pager__menu");
    if (!menu) return;
    const owner = document.querySelector(`[data-pager-size-trigger][aria-controls="${menu.id}"]`);
    const items = itemsOf(menu);
    const at = items.indexOf(document.activeElement);
    const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[event.key];
    if (go !== undefined && items.length) {
      event.preventDefault();
      items[(go + items.length) % items.length].focus();
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(owner, true); }
    if (event.key === "Tab") close(owner);
  }, true);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-pager-size-trigger]");
    if (trigger) {
      const menu = menuOf(trigger);
      if (menu?.hidden === false) close(trigger);
      else open(trigger, keyOpen === trigger ? "first" : null);
      keyOpen = null;
      return;
    }
    /* a choice or a click anywhere else closes every open size menu (the page's own handler renders the choice) */
    closeAll();
  }, true);

  window.GEAPPager = { html, pageList, closeAll };
})();
