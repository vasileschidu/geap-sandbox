/* ==========================================================================================================
   GEAPPager — ONE list pager for every product (audit-fix-v3, 2026-10-21; promoted from CabEvo.pagerHtml)
   = the library Pagination as drawn on the RAP list (rap-table-flat-v1, 2026-10-23): „Se afișează 1–16 din 33 de
   rezultate” · „<sizeLabel>: [16 ⌄]” (library `.select-control` opening the one dropdown item menu) · library
   `.pagination` („‹ Anterior” 1 2 3 4 5 … 9 „Următor ›”, 7 slots; 5 on phones). Used by EVO Cabinet (Actele mele permisive, Solicitările mele), RAP and
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

  /* page window = the library „Pagination Logic” (Components 144:4346, rap-table-flat-v1): at most 7 slots, the
     overflow „…” included — every page up to 7; near the start 1 2 3 4 5 … N; near the end 1 … N−4 … N; in the
     middle 1 … p−1 p p+1 … N */
  function pageList(page, pages, slots = 7) {
    const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
    if (pages <= slots) return range(1, pages);
    const edge = slots - 2; /* 5 of 7 / 3 of 5 next to one „…” */
    const side = (slots - 5) / 2; /* 1 neighbour each side of the current page at 7 slots, none at 5 */
    /* a „…” always hides at least 2 pages (library: never „1 … 3”) */
    if (page <= edge - side) return [...range(1, edge), "…", pages];
    if (page >= pages - edge + 1 + side) return [1, "…", ...range(pages - edge + 1, pages)];
    return [1, "…", ...range(page - side, page + side), "…", pages];
  }

  /* desktop 7 slots, phones 5 (the library: „on smaller screens more pages are truncated, 5 slots minimum”) → ONE
     list: every slot of either window, tagged with the window(s) it belongs to (a „…” sits after page a = position
     2a + 1, so the two windows merge in order) */
  function slotList(page, pages) {
    const at = new Map();
    const add = (list, mode) => list.forEach((p, i) => {
      const pos = p === "…" ? 2 * list[i - 1] + 1 : 2 * p;
      const slot = at.get(pos) || { p, modes: new Set() };
      slot.modes.add(mode);
      at.set(pos, slot);
    });
    add(pageList(page, pages, 7), "wide");
    add(pageList(page, pages, 5), "narrow");
    return [...at.entries()].sort((a, b) => a[0] - b[0]).map(([, slot]) => ({ p: slot.p, only: slot.modes.size === 2 ? "" : [...slot.modes][0] }));
  }

  function html({ total, page = 1, perPage, sizes = [10, 20, 50], prefix = "pager", label = "Paginare", sizeLabel = "Rânduri pe pagină", sprite = SPRITE } = {}) {
    if (!total || total <= sizes[0]) return "";
    const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="${sprite}#${name}"></use></svg>`;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, page), pages);
    const first = (current - 1) * perPage + 1;
    const last = Math.min(total, current * perPage);
    const menuId = `${prefix}-per-page-${++uid}`;
    /* Romanian counts: 20 and up (by the last two digits) take „de” — „1567 de rezultate”, „16 rezultate” */
    const ofCount = (n) => (n % 100 === 0 || n % 100 >= 20 ? `${n} de` : String(n));
    const link = (target, text, { disabled = false, active = false, aria = "", nav = "", only = "" } = {}) => `
      <li class="pagination__item${only ? ` e-permits-pager__item--${only}` : ""}">
        <button class="pagination__link${nav ? ` pagination__link--nav pagination__link--${nav}` : ""}${active ? " pagination__link--active" : ""}${disabled ? " pagination__link--disabled" : ""}" type="button" data-${prefix}-page="${target}"${disabled ? " disabled" : ""}${active ? ' aria-current="page"' : ""}${aria ? ` aria-label="${esc(aria)}"` : ""}>${text}</button>
      </li>`;
    const gap = (only) => `<li class="pagination__item${only ? ` e-permits-pager__item--${only}` : ""}" aria-hidden="true"><span class="pagination__link pagination__link--disabled e-permits-pager__gap">…</span></li>`;
    /* the library Pagination (Components 144:4346; RAP Figma 22080:133246, rap-table-flat-v1): summary left
       („Se afișează 1–16 din 1567 de rezultate” · „<sizeLabel>: [16 ⌄]” = the library select field), the pages right
       („‹ Anterior” · 1 2 3 4 5 … N · „Următor ›”; ≤ 768 the library drops the words and the items to 32) */
    const countText = (n) => { const [num, de] = ofCount(n).split(" "); return `<strong>${num}</strong>${de ? " de" : ""}`; };
    return `
      <div class="e-permits-pager">
        <div class="e-permits-pager__summary">
          <p class="e-permits-pager__range">Se afișează <strong>${first}</strong>–<strong>${last}</strong> din ${countText(total)} rezultate</p>
          <div class="e-permits-pager__size">
            <span class="e-permits-pager__size-label" id="${menuId}-label">${esc(sizeLabel)}:</span>
            <button class="select-control e-permits-pager__trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" aria-labelledby="${menuId}-label ${menuId}-value" data-pager-size-trigger><span class="select-value" id="${menuId}-value">${perPage}</span>${icon("icon-chevron-bottom")}</button>
            <ul class="e-permits-fo-intent-menu e-permits-pager__menu" id="${menuId}" role="menu" aria-label="${esc(sizeLabel)}" hidden>
              ${sizes.map((size) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${size === perPage}" data-${prefix}-per-page="${size}"><span>${size}</span>${size === perPage ? icon("icon-checkmark-large") : ""}</button></li>`).join("")}
            </ul>
          </div>
        </div>
        <nav class="e-permits-pager__nav" aria-label="${esc(label)}">
          <ul class="pagination">
            ${link(current - 1, `${icon("icon-chevron-left")}<span class="pagination__link--text">Anterior</span>`, { disabled: current === 1, aria: "Anterior, pagina anterioară", nav: "prev" })}
            ${slotList(current, pages).map(({ p, only }) => (p === "…" ? gap(only) : link(p, String(p), { active: p === current, aria: `Pagina ${p}`, only }))).join("")}
            ${link(current + 1, `<span class="pagination__link--text">Următor</span>${icon("icon-chevron-right")}`, { disabled: current === pages, aria: "Următor, pagina următoare", nav: "next" })}
          </ul>
        </nav>
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
