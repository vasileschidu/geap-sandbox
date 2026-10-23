/* ==========================================================================================================
   GEAPPager — ONE list pager for every product (audit-fix-v3, 2026-10-21; promoted from CabEvo.pagerHtml)
   = the library Pagination as drawn on the RAP list (rap-table-flat-v1, 2026-10-23): „Se afișează 1–16 din 33 de
   rezultate” · „<sizeLabel>: [16 ⌄]” (library `.select-control` opening the one dropdown item menu) · library
   `.pagination.pagination--compact` (‹ 1 … 4 5 6 … 9 ›, icon-only arrows; pager-compact-v1). Used by EVO Cabinet (Actele mele permisive, Solicitările mele), RAP and
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

  /* page window (pager-compact-v1, user: „pagination too big, fewer page numbers”): THREE numbered pages around the
     current one (shifted at the ends so there are always 3), plus — wider screens only — the first / last page with a
     „…” when they are far (a „…” never hides a single page: that page is shown instead).
     1 2 3 … 98 · 1 … 49 50 51 … 98 · 1 … 96 97 98 (phones show no numbers — only ‹ Anterior / Următor ›, pager-compact-v2) */
  function pageList(page, pages, ends = true) {
    const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
    if (pages <= 3) return range(1, pages);
    const from = Math.min(Math.max(1, page - 1), pages - 2);
    const to = from + 2;
    const out = range(from, to);
    if (!ends) return out;
    if (from === 3) out.unshift(2);
    if (from > 3) out.unshift("…");
    if (from > 1) out.unshift(1);
    if (to === pages - 2) out.push(pages - 1);
    if (to < pages - 2) out.push("…");
    if (to < pages) out.push(pages);
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
    const step = sizes[0]; /* „Afișează mai multe” adds one smallest page (16 on RAP / BO, 10 on Cabinet) */
    /* Romanian counts: 20 and up (by the last two digits) take „de” — „1567 de rezultate”, „16 rezultate” */
    const ofCount = (n) => (n % 100 === 0 || n % 100 >= 20 ? `${n} de` : String(n));
    const link = (target, text, { disabled = false, active = false, aria = "", nav = "" } = {}) => `
      <li class="pagination__item">
        <button class="pagination__link${nav ? ` pagination__link--nav pagination__link--${nav}` : ""}${active ? " pagination__link--active" : ""}${disabled ? " pagination__link--disabled" : ""}" type="button" data-${prefix}-page="${target}"${disabled ? " disabled" : ""}${active ? ' aria-current="page"' : ""}${aria ? ` aria-label="${esc(aria)}"` : ""}>${text}</button>
      </li>`;
    const gap = () => `<li class="pagination__item" aria-hidden="true"><span class="pagination__link pagination__link--disabled e-permits-pager__gap">…</span></li>`;
    /* the library Pagination, compact (pager-compact-v1): summary left („Se afișează 1–16 din 1567 de rezultate” ·
       „<sizeLabel>: [16 ⌄]” = the library select field, 32), the pages right: icon-only ‹ › + the library compact
       items (`.pagination--compact`, 32; 40 on phones) 4 apart */
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
          <ul class="pagination pagination--compact">
            ${link(current - 1, icon("icon-chevron-left"), { disabled: current === 1, aria: "Pagina anterioară", nav: "prev" })}
            ${pageList(current, pages).map((p) => (p === "…" ? gap() : link(p, String(p), { active: p === current, aria: `Pagina ${p}` }))).join("")}
            ${link(current + 1, icon("icon-chevron-right"), { disabled: current === pages, aria: "Pagina următoare", nav: "next" })}
          </ul>
        </nav>
        <!-- phones (≤ 760, pager-compact-v4, user): LEFT „Afișează mai multe” (library btn-text-primary Medium — blue
             label, no fill at rest, light blue on hover / press = load more: the page size grows by the smallest size,
             the window keeps the current first row; gone when every row shows), RIGHT ‹ › icon-only squares side by side
             (library btn-outline-strict Medium); no range / numbers / size -->
        <nav class="e-permits-pager__steps" tabindex="-1" aria-label="${esc(label)}" data-pager-live="Se afișează ${first}–${last} din ${total}">
          ${last < total ? `<button class="btn btn-text-primary btn-md e-permits-pager__step e-permits-pager__more" type="button" data-${prefix}-per-page="${perPage + step}" data-${prefix}-page="${Math.floor((first - 1) / (perPage + step)) + 1}" data-pager-step="more">Afișează mai multe</button>` : ""}
          <span class="e-permits-pager__arrows">
            <button class="btn btn-outline-strict btn-md btn-icon-only e-permits-pager__step" type="button" data-${prefix}-page="${current - 1}" data-pager-step="prev" aria-label="Pagina anterioară"${current === 1 ? " disabled" : ""}>${icon("icon-chevron-left")}</button>
            <button class="btn btn-outline-strict btn-md btn-icon-only e-permits-pager__step" type="button" data-${prefix}-page="${current + 1}" data-pager-step="next" aria-label="Pagina următoare"${current === pages ? " disabled" : ""}>${icon("icon-chevron-right")}</button>
          </span>
        </nav>
      </div>`;
  }

  /* ---------- the phone buttons keep the focus + announce the new range (pager-compact-v2 / v3) ----------
     the host redraws the pager after a click (at once, or after a skeleton delay) → the pressed button is gone; put
     the focus on its twin in the new pager (else the next enabled step: „Afișează mai multe” disappears once every row
     shows) and say „Se afișează 1–32 din 1567” in ONE persistent live region (a region inside the redrawn markup would
     be new each time and stay silent) */
  let live = null;
  const announce = (text) => {
    if (!live) {
      live = document.createElement("p");
      live.className = "visually-hidden";
      live.setAttribute("aria-live", "polite");
      document.body.append(live);
    }
    live.textContent = "";
    window.setTimeout(() => { live.textContent = text; }, 50);
  };
  document.addEventListener("click", (event) => {
    const step = event.target.closest?.(".e-permits-pager__step[data-pager-step]");
    if (!step) return;
    const which = step.dataset.pagerStep;
    const until = performance.now() + 2500;
    const poll = () => {
      if (step.isConnected) { if (performance.now() < until) window.setTimeout(poll, 100); return; }
      const twins = [...document.querySelectorAll(".e-permits-pager__step[data-pager-step]")].filter((b) => b.getClientRects().length);
      /* nothing left to press (every row shows, one page) → the pager's nav itself (tabindex −1), never <body> */
      const target = twins.find((b) => b.dataset.pagerStep === which && !b.disabled) || twins.find((b) => !b.disabled) || twins[0]?.closest(".e-permits-pager__steps");
      target?.focus({ preventScroll: true });
      const text = (target || twins[0])?.closest("[data-pager-live]")?.dataset.pagerLive;
      if (text) announce(text);
    };
    window.setTimeout(poll, 0);
  });

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
