/* GEAPSortSheet — „Sortează” on list pages (2026-10-20, user: „looks awful, do components, nice text hierarchy”).
   ONE contract for the sort control, two presentations:
   - desktop (> 760): the page's compact dropdown (css/dropdown.css, 32 rows) built by `menuHtml()` — two groups
     „Sortează după” / „Ordine”, every item a `menuitemradio` with the library radio as its leading affordance;
     the page keeps its own click handler on the items (a key starts in its natural order).
   - phones (≤ 760): `bind(trigger, cfg)` turns the same trigger into a bottom sheet on the shared GEAPSheet
     (js/facet-filter.js): section label + library RADIO group for the key, section label + library SEGMENTED
     control for the order (its labels follow the key), sticky primary „Aplică”. The choice is a draft until
     „Aplică” (as the filter sheet's „Arată N rezultate”); ×, scrim and Escape cancel; focus returns to the trigger.
   cfg: { title, sprite, keys: [{ value, label }], orders(key) → [{ value, label, name? }] (natural order first),
          current() → { key, order }, apply({ key, order }) } */
(() => {
  const PHONE = window.matchMedia("(max-width: 760px)");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---- desktop: the dropdown body (the page's <ul role=menu> gets it as innerHTML) ---- */
  function menuHtml({ id = "geap-sort", keys, orders, current, keyAttr, orderAttr, keyLabel = "Sortează după", orderLabel = "Ordine" }) {
    const item = (attr, label, name, on) => `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-sort-menu__item" type="button" role="menuitemradio" aria-checked="${on}" ${attr}${name ? ` aria-label="${esc(name)}"` : ""}><span class="radio radio--medium" aria-hidden="true"><span class="radio-custom"></span></span><span>${esc(label)}</span></button></li>`;
    return `
      <li role="presentation" class="e-permits-sort-menu__label" id="${id}-by">${esc(keyLabel)}</li>
      <li role="none"><ul class="e-permits-sort-menu__group" role="group" aria-labelledby="${id}-by">${keys.map((k) => item(`${keyAttr}="${esc(k.value)}"`, k.label, "", k.value === current.key)).join("")}</ul></li>
      <li role="separator" class="e-permits-sort-menu__separator"></li>
      <li role="presentation" class="e-permits-sort-menu__label" id="${id}-order">${esc(orderLabel)}</li>
      <li role="none"><ul class="e-permits-sort-menu__group" role="group" aria-labelledby="${id}-order">${orders(current.key).map((o) => item(`${orderAttr}="${esc(o.value)}"`, o.label, o.name, o.value === current.order)).join("")}</ul></li>`;
  }

  /* ---- phones: the sheet ---- */
  let sheetEl = null;
  let cur = null; /* { trigger, cfg, key, order, reversed, touched } while open */
  let timer = 0;

  function bodyHtml() {
    const { cfg, key, order } = cur;
    const radios = cfg.keys.map((k) => `
            <label class="radio radio--medium e-permits-sort-sheet__key">
              <input class="radio-input" type="radio" name="geap-sort-sheet-key" value="${esc(k.value)}"${k.value === key ? " checked" : ""}>
              <span class="radio-custom"></span>
              <span class="radio-texts"><span class="radio-label">${esc(k.label)}</span></span>
            </label>`).join("");
    const segments = cfg.orders(key).map((o) => {
      const on = o.value === order;
      return `
            <button class="segment-item${on ? " is-selected" : ""}" type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-sort-sheet-order="${esc(o.value)}"${o.name ? ` aria-label="${esc(o.name)}"` : ""}>${esc(o.label)}</button>`;
    }).join("");
    return `
        <div class="e-permits-sort-sheet__group">
          <h3 class="e-permits-sort-sheet__label" id="geap-sort-sheet-by">Sortează după</h3>
          <div class="radio-group e-permits-sort-sheet__keys" role="radiogroup" aria-labelledby="geap-sort-sheet-by">${radios}
          </div>
        </div>
        <div class="e-permits-sort-sheet__group">
          <h3 class="e-permits-sort-sheet__label" id="geap-sort-sheet-order">Ordine</h3>
          <div class="segmented-control e-permits-sort-sheet__order" role="radiogroup" aria-labelledby="geap-sort-sheet-order">${segments}
          </div>
        </div>`;
  }

  /* the order follows the key: a new key starts in its natural order unless the person already reversed it here */
  function setKey(value) {
    const list = cur.cfg.orders(value);
    cur.key = value;
    cur.order = list[cur.touched && cur.reversed ? 1 : 0]?.value || list[0]?.value;
    renderOrder();
  }
  function setOrder(value, focus = false) {
    const list = cur.cfg.orders(cur.key);
    cur.order = value;
    cur.touched = true;
    cur.reversed = list.findIndex((o) => o.value === value) > 0;
    renderOrder(focus);
  }
  function renderOrder(focus = false) {
    const host = sheetEl.querySelector(".e-permits-sort-sheet__order");
    const tmp = document.createElement("div");
    tmp.innerHTML = bodyHtml();
    host.innerHTML = tmp.querySelector(".e-permits-sort-sheet__order").innerHTML;
    if (focus) host.querySelector('[aria-checked="true"]')?.focus();
  }

  function close(restoreFocus = true) {
    if (!cur) return;
    const { trigger } = cur;
    cur = null;
    timer = window.GEAPSheet.hide(sheetEl, () => !!cur);
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function ensureSheet(sprite) {
    if (sheetEl) return;
    sheetEl = window.GEAPSheet.create("e-permits-filter-sheet e-permits-sort-sheet", {
      sprite,
      titleId: "geap-sort-sheet-title",
      footerHtml: `
        <div class="bottom-sheet__footer e-permits-filter-sheet__footer">
          <button class="btn btn-primary btn-lg e-permits-filter-sheet__apply" type="button" data-sort-sheet-apply>Aplică</button>
        </div>`
    });
    sheetEl.addEventListener("click", (event) => {
      if (!cur) return;
      if (event.target.closest("[data-sheet-close]")) { close(); return; }
      const seg = event.target.closest("[data-sort-sheet-order]");
      if (seg) { setOrder(seg.dataset.sortSheetOrder, true); return; }
      if (event.target.closest("[data-sort-sheet-apply]")) {
        const { cfg, key, order, trigger } = cur;
        close(false);
        cfg.apply({ key, order });
        if (trigger.isConnected) trigger.focus({ preventScroll: true });
      }
    });
    sheetEl.addEventListener("change", (event) => {
      if (cur && event.target.name === "geap-sort-sheet-key") setKey(event.target.value);
    });
    sheetEl.addEventListener("keydown", (event) => {
      if (!cur) return;
      if (event.key === "Tab") { window.GEAPSheet.trapTab(sheetEl, event); return; }
      /* the segmented control is one radio group: arrows move the choice, one tab stop */
      const seg = event.target.closest?.("[data-sort-sheet-order]");
      if (!seg || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const all = [...sheetEl.querySelectorAll("[data-sort-sheet-order]")];
      const i = all.indexOf(seg);
      const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1
        : (i + (/Left|Up/.test(event.key) ? -1 : 1) + all.length) % all.length;
      setOrder(all[next].dataset.sortSheetOrder, true);
    });
  }

  function open(trigger, cfg) {
    if (!window.GEAPSheet) return false;
    ensureSheet(cfg.sprite || "assets/icons/sprite.svg");
    const now = cfg.current();
    const list = cfg.orders(now.key);
    cur = { trigger, cfg, key: now.key, order: now.order, reversed: list.findIndex((o) => o.value === now.order) > 0, touched: false };
    sheetEl.querySelector("[data-sheet-title]").textContent = cfg.title || "Sortează";
    sheetEl.querySelector("[data-sheet-body]").innerHTML = bodyHtml();
    window.clearTimeout(timer);
    window.GEAPSheet.show(sheetEl);
    trigger.setAttribute("aria-expanded", "true");
    const panel = sheetEl.querySelector(".bottom-sheet__panel");
    requestAnimationFrame(() => panel.focus());
    return true;
  }

  function bind(trigger, cfg) {
    if (!trigger || trigger.dataset.sortSheetBound) return;
    trigger.dataset.sortSheetBound = "";
    const mode = () => trigger.setAttribute("aria-haspopup", PHONE.matches ? "dialog" : "menu");
    mode();
    PHONE.addEventListener("change", mode);
    /* target phase: the page's delegated dropdown toggle (document) never sees a phone tap */
    trigger.addEventListener("click", (event) => {
      if (!PHONE.matches || trigger.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const menu = document.getElementById(trigger.getAttribute("aria-controls") || "");
      if (menu && !menu.hidden) menu.hidden = true; /* a dropdown left open from a wider window */
      open(trigger, cfg);
    });
  }

  /* Esc closes the sheet only */
  window.addEventListener("keydown", (event) => {
    if (!cur || event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);
  PHONE.addEventListener("change", () => close(false));

  window.GEAPSortSheet = { menuHtml, bind, close: () => close(false), isOpen: () => !!cur };
})();
