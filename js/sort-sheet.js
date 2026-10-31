/* GEAPSortSheet — „Sortează” on list pages (2026-10-20, user: „looks awful, do components, nice text hierarchy”).
   ONE contract for the sort control, two presentations:
   - desktop (> 760): the page's compact dropdown (css/dropdown.css, 32 rows) built by `menuHtml()` — two groups
     „Sortează după” / „Ordine”, every item a `menuitemradio` with the library radio as its leading affordance;
     the page keeps its own click handler on the items (a key starts in its natural order).
   - phones (≤ 760): `bind(trigger, cfg)` turns the same trigger into a bottom sheet on the shared GEAPSheet
     (js/facet-filter.js): section label + library RADIO group for the key, section label + a second library RADIO
     group for the order (its labels follow the key; v2 — the segmented control of v1 is gone), sticky primary „Aplică”. The choice is a draft until
     „Aplică” (as the filter sheet's „Arată N rezultate”); ×, scrim and Escape cancel; focus returns to the trigger.
   cfg: { title, sprite, keys: [{ value, label }], orders(key) → [{ value, label, name? }] (natural order first),
          current() → { key, order }, apply({ key, order }) } */
(() => {
  const PHONE = window.matchMedia("(max-width: 760px)");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---- desktop: the dropdown body (the page's <ul role=menu> gets it as innerHTML) ---- */
  function menuHtml({ id = "geap-sort", keys, orders, current, keyAttr, orderAttr, keyLabel = "Sortează după", orderLabel = "Ordine" }) {
    const item = (attr, label, name, on) => `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-sort-menu__item" type="button" role="menuitemradio" aria-checked="${on}" ${attr}${name ? ` aria-label="${esc(name)}"` : ""}><span class="radio radio--small" aria-hidden="true"><span class="radio-custom"></span></span><span>${esc(label)}</span></button></li>`;
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
    /* both groups = the same library radio rows (user 2026-10-20: „Ordine” like „Sortează după”, no segmented control) */
    const row = (name, value, label, on, spoken) => `
            <label class="radio radio--medium e-permits-sort-sheet__key">
              <input class="radio-input" type="radio" name="${name}" value="${esc(value)}"${on ? " checked" : ""}${spoken ? ` aria-label="${esc(spoken)}"` : ""}>
              <span class="radio-custom"></span>
              <span class="radio-texts"><span class="radio-label">${esc(label)}</span></span>
            </label>`;
    const radios = cfg.keys.map((k) => row("geap-sort-sheet-key", k.value, k.label, k.value === key)).join("");
    const orders = cfg.orders(key).map((o) => row("geap-sort-sheet-order", o.value, o.label, o.value === order, o.name)).join("");
    return `
        <div class="e-permits-sort-sheet__group">
          <h3 class="e-permits-sort-sheet__label" id="geap-sort-sheet-by">Sortează după</h3>
          <div class="radio-group e-permits-sort-sheet__keys" role="radiogroup" aria-labelledby="geap-sort-sheet-by">${radios}
          </div>
        </div>
        <div class="e-permits-sort-sheet__group">
          <h3 class="e-permits-sort-sheet__label" id="geap-sort-sheet-order">Ordine</h3>
          <div class="radio-group e-permits-sort-sheet__keys e-permits-sort-sheet__order" role="radiogroup" aria-labelledby="geap-sort-sheet-order">${orders}
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
  /* the native radio already shows the choice — no redraw, so arrow keys keep their focus */
  function setOrder(value) {
    const list = cur.cfg.orders(cur.key);
    cur.order = value;
    cur.touched = true;
    cur.reversed = list.findIndex((o) => o.value === value) > 0;
  }
  function renderOrder() {
    const host = sheetEl.querySelector(".e-permits-sort-sheet__order");
    const tmp = document.createElement("div");
    tmp.innerHTML = bodyHtml();
    host.innerHTML = tmp.querySelector(".e-permits-sort-sheet__order").innerHTML;
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
      if (event.target.closest("[data-sort-sheet-apply]")) {
        const { cfg, key, order, trigger } = cur;
        close(false);
        cfg.apply({ key, order });
        if (trigger.isConnected) trigger.focus({ preventScroll: true });
      }
    });
    sheetEl.addEventListener("change", (event) => {
      if (!cur) return;
      if (event.target.name === "geap-sort-sheet-key") setKey(event.target.value);
      if (event.target.name === "geap-sort-sheet-order") setOrder(event.target.value);
    });
    sheetEl.addEventListener("keydown", (event) => {
      if (!cur) return;
      if (event.key === "Tab") window.GEAPSheet.trapTab(sheetEl, event);
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

  /* the whole „Sortează” control (sort-chip-v1, 2026-10-30): chip (icon-sort + current key) + the dropdown menu, one markup
     for every list / journal — cfg = menuHtml's + { triggerAttr, ariaLabel, menuLabel, sprite }. The caller wires
     the clicks on keyAttr / orderAttr and calls bind(trigger, …) after each render for the phone sheet. */
  function controlHtml({ id = "geap-sort", triggerAttr, ariaLabel, menuLabel = "Sortează", label, sprite = "assets/icons/sprite.svg", ...menu }) {
    return `<div class="e-permits-stack__menu-wrap">
      <button type="button" class="chip e-permits-filter-trigger e-permits-sort-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="${esc(id)}-menu" aria-label="${esc(ariaLabel)}" data-stack-menu-trigger ${triggerAttr}>
        <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="${esc(sprite)}#icon-sort"></use></svg></span><span class="chip__label">${esc(label)}</span>
      </button>
      <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-sort-menu" id="${esc(id)}-menu" role="menu" aria-label="${esc(menuLabel)}" hidden data-stack-menu>${menuHtml({ id, ...menu })}</ul>
    </div>`;
  }

  window.GEAPSortSheet = { menuHtml, controlHtml, bind, close: () => close(false), isOpen: () => !!cur };
})();
