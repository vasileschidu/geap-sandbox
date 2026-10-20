/* Act row — ONE renderer for an issued act in a list (2026-10-17): the FO „Ce vrei să soliciți?” (#intent),
   the Ghișeu request window and the EVO Cabinet „Actele mele permisive” list. Moved as is out of
   js/e-permits-acte-permisive.js (`foActRowHtml`, still exported there as GEAPFormRender.actRowHtml) so pages
   that do not load the FO script (Cabinet) call the same code. The FO / Ghișeu output is byte-identical with the
   defaults below; every new option defaults to the old markup.

   The row = the shared document card (.e-permits-fo-lib-item: padding 12, radius 12, hover) with the blue
   „System Generated” document icon, the title + a Small status tag, the 14/20 secondary meta with the 2px dots
   (number · valabil până la <date> · subdivision) and the „Inițiază un postproces ⌄” pill = the library small
   button (btn-sm, 2026-10-18) with its menu (.e-permits-stack__menu at the one dropdown item size: 32px items,
   14/20 medium, 20 icon, same on touch — components.md „Dropdown item — one size everywhere”, 2026-10-20). A locked act = the subtle notice, full card width under the row.

   GEAPActRow.html(act, opts)
     act  = { id, name, number, status, statusLabel, validUntil (dd.mm.yyyy | ISO | long), subdivision,
              meta (parts, replaces the default; a part = text or { text, long }) }
     The meta line = ONE slot structure for every act / request row (2026-10-20, user: „why do the act and
     request cards have different details?”), built by metaParts():
       1 number (plain text — no copy icon in lists, user 2026-10-20)  ·  2 what (act / service name; request: type · service)  ·  3 authority · subdivision
       ·  4 the key date (act: valabil până la / expirat la; request: Depusă / Creată / Finalizată)
     Desktop (>760) keeps it on ONE line: slot 2 shrinks first (ellipsis), then slot 3; 1 and 4 never shrink.
     opts = { menuId, actionLabel, items [{ id, label, icon, disabled, reason }], pendingTitle + pendingText,
              menuClass,
              // added for the Cabinet (defaults = the FO markup):
              assets = "assets/"            base of the icon / sprite paths (sub-pages: "../assets/")
              attrs = ""                    extra attributes on the <li> (row hooks, tabindex, aria-label)
              tagHtml = null                the status tag markup (null = the FO Small subtle tag)
              extraTagsHtml = ""            tags after the status (e.g. „Aprobare tacită”)
              triggerAttrs = "data-fo-intent-trigger"   the pill's hook
              itemAttrs = null              (pp) → the menu item's hook (null = data-fo-intent-postprocess)
              noticeTone = "warning", noticeIcon = "icon-time", noticeLocks = true   the notice under the row
              hideEmptyAction = false       no pill when there is nothing to start (Cabinet: expired / paper acts)
              // added for the Cabinet „Solicitările mele” rows (2026-10-20, same row look for requests):
              iconSrc = null                the lead icon (null = the blue System Generated document, "" = no icon)
              metaSlots = null              { number, what, authority, subdivision, date } → metaParts()
              noticeHtml = ""               the notice text as ready HTML (live parts, <strong>), instead of pendingTitle / -Text
              actionHtml = null             the right-hand actions, replaces the post-process pill block
              rowClass = ""                 extra classes on the <li> }

   Phones (≤760, 2026-10-20 — user: „the menu is too small for fat fingers … maybe it shows as we do for filters”):
   the same trigger opens an ACTION SHEET instead of the dropdown — the facet-filter phone sheet itself
   (GEAPSheet from js/facet-filter.js: library .bottom-sheet + .e-permits-filter-sheet, header title + ×, scrim,
   16 top gap / radius 16 from css/modal-phone.css, same slide, Esc, Tab trap), modifier --actions: title = the
   trigger's label, subtitle = the act name (no number — rule „no code in a modal header”), the menu's items as
   its 44px option rows with a 24 icon (= 48), a disabled item shows its reason as a second line (touch has no
   tooltip), no footer: a tap acts at once by clicking the ORIGINAL menu item, so every page keeps its own
   handler (confirm modal for consequential post-processes, otherwise go on). Works for every trigger in an
   .e-permits-fo-intent-act__action wrapper (FO #intent, Ghișeu, Cabinet list + act profile header) without
   any change in the pages. Desktop: unchanged (the compact dropdown). components.md „Act post-process menu on
   phones — action sheet”. */
(() => {
  "use strict";

  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const ACT_ROW_TONE = { valabil: "success", suspendat: "accent", expirat: "neutral", anulat: "danger", retras: "danger", respins: "danger" };

  function longDate(value) {
    const m = String(value || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : value;
  }

  function validText(value) {
    if (!value) return "";
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const long = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : longDate(value);
    return `valabil până la ${long}`;
  }

  /* the shared meta slots (see the header): kind "what" shrinks first, the subdivision ("long") next; the number,
     the authority code and the date never (a short part with a min-width would be widened, not protected) */
  function metaParts({ number = "", what = "", authority = "", subdivision = "", date = "" } = {}) {
    return [
      number ? { html: esc(number) } : null,
      what ? { html: esc(what), kind: "what" } : null,
      authority ? { html: esc(authority) } : null,
      subdivision ? { html: esc(subdivision), kind: "long" } : null,
      date ? { html: esc(date) } : null,
    ].filter(Boolean);
  }

  function html(act, {
    menuId = `fo-act-menu-${act.id}`, actionLabel = "Inițiază un postproces", items = [], pendingTitle = "", pendingText = "", menuClass = "",
    assets = "assets/", attrs = "", tagHtml = null, extraTagsHtml = "", triggerAttrs = "data-fo-intent-trigger", itemAttrs = null,
    noticeTone = "warning", noticeIcon = "icon-time", noticeLocks = true, hideEmptyAction = false,
    iconSrc = null, metaSlots = null, actionHtml = null, rowClass = "", noticeHtml = ""
  } = {}) {
    const tone = ACT_ROW_TONE[act.status] || "neutral";
    /* long names (authority / subdivision / service) are the parts that give way on desktop (`long`) */
    const parts = metaSlots ? metaParts(metaSlots)
      : act.meta ? act.meta.map((part) => (part && typeof part === "object" ? part : { text: part })).filter((part) => part.text).map((part) => ({ html: esc(part.text), kind: part.long ? "long" : "" }))
          : metaParts({ number: act.number, subdivision: act.subdivision, date: validText(act.validUntil) });
    const hasNotice = Boolean(pendingTitle || pendingText || noticeHtml);
    const locked = hasNotice && noticeLocks;
    const tag = tagHtml ?? `<span class="status-tag status-tag--${tone} is-subtle status-tag--small e-permits-fo-doc-tag">${esc(act.statusLabel || act.status)}</span>`;
    const itemHook = itemAttrs || ((pp) => `data-fo-intent-postprocess="${esc(pp.id)}"`);
    const action = actionHtml !== null ? actionHtml : hideEmptyAction && !items.length ? "" : `
          <div class="cab-doc__actions e-permits-fo-intent-act__action">
            <button class="btn btn-neutral btn-sm btn-pill e-permits-fo-intent-act__trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${esc(menuId)}" ${triggerAttrs}${locked ? " disabled" : ""}>
              <span>${esc(actionLabel)}</span>
              <svg class="icon small" aria-hidden="true"><use href="${assets}icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu${menuClass && menuClass !== "e-permits-stack__menu" ? ` ${menuClass}` : ""}" id="${esc(menuId)}" role="menu" aria-label="Postprocese pentru ${esc(act.name)}" hidden>
              ${items.map((pp) => `
                <li role="none">
                  <button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" ${itemHook(pp)}${pp.disabled ? ` aria-disabled="true" data-tooltip-reason="${esc(pp.reason || "")}" aria-description="${esc(pp.reason || "")}"` : ""}>
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="${assets}icons/sprite.svg#${esc(pp.icon || "icon-edit")}"></use></svg>
                    <span>${esc(pp.label)}</span>
                  </button>
                </li>`).join("")}
            </ul>
          </div>`;
    return `
        <li data-tooltip-focus class="e-permits-fo-lib-item e-permits-fo-intent-act${rowClass ? ` ${rowClass}` : ""}${locked ? " is-locked" : ""}${hasNotice && !locked ? " has-notice" : ""}" data-fo-intent-act="${esc(act.id)}"${attrs ? ` ${attrs}` : ""}>
          ${iconSrc === "" ? "" : `<img class="e-permits-fo-lib-item__icon" src="${iconSrc || `${assets}icons/document-generated.svg`}" width="24" height="24" alt="">`}
          <div class="e-permits-fo-lib-item__content">
            <div class="e-permits-fo-lib-item__title-row e-permits-fo-doc-title-row">
              <span class="e-permits-fo-lib-item__title" title="${esc(act.name)}">${esc(act.name)}</span>
              ${tag}${extraTagsHtml}
            </div>
            ${parts.length ? `<div class="e-permits-fo-lib-item__meta e-permits-fo-doc-meta"><span class="e-permits-fo-doc-meta__line">${parts.map((part) => `<span class="e-permits-fo-doc-meta__part${part.kind ? ` e-permits-fo-doc-meta__part--${part.kind}` : part.long ? " e-permits-fo-doc-meta__part--long" : ""}">${part.html}</span>`).join("")}</span></div>` : ""}
            ${hasNotice ? `<div class="message message--subtle banner--${noticeTone} e-permits-fo-intent-act__pending"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="${assets}icons/sprite.svg#${noticeIcon}"></use></svg></span><div class="banner__content"><p class="banner__text">${noticeHtml || `${pendingTitle ? `<strong>${esc(pendingTitle)}</strong> ` : ""}${esc(pendingText)}`}</p></div></div>` : ""}
          </div>${action}
        </li>`;
  }

  /* ---- phones: the post-process menu as an action sheet (see the header) ---- */
  const PHONE = window.matchMedia("(max-width: 760px)");
  const TRIGGER = ".e-permits-fo-intent-act__action > button[aria-haspopup]";
  let sheetEl = null;
  let cur = null; /* { trigger, items } while the sheet is open */
  let timer = 0;

  const subtitleOf = (trigger) => (trigger.dataset.actSheetSubtitle
    || trigger.closest(".e-permits-fo-intent-act")?.querySelector(".e-permits-fo-lib-item__title")?.textContent
    || trigger.closest(".e-permits-page-header")?.querySelector("h1")?.textContent
    || "").replace(/\s+/g, " ").trim();

  function rowHtml(item, index, sprite) {
    const label = (item.querySelector("span")?.textContent || item.textContent).replace(/\s+/g, " ").trim();
    const icon = item.querySelector("use")?.getAttribute("href")?.split("#")[1] || "icon-edit";
    const disabled = item.disabled || item.getAttribute("aria-disabled") === "true";
    const reason = disabled ? item.dataset.tooltipReason || item.getAttribute("aria-description") || "" : "";
    const reasonId = `geap-act-sheet-reason-${index}`;
    return `
          <li>
            <button class="e-permits-workplace__filter-option e-permits-filter-sheet__action${item.classList.contains("is-danger") ? " is-danger" : ""}" type="button" data-act-sheet-index="${index}"${disabled ? ` aria-disabled="true"${reason ? ` aria-describedby="${reasonId}"` : ""}` : ""}>
              <svg class="icon" aria-hidden="true"><use href="${esc(sprite)}#${esc(icon)}"></use></svg>
              <span class="e-permits-filter-sheet__action-text">
                <span class="e-permits-workplace__filter-option-label">${esc(label)}</span>${reason ? `
                <span class="e-permits-filter-sheet__action-reason" id="${reasonId}">${esc(reason)}</span>` : ""}
              </span>
            </button>
          </li>`;
  }

  function closeSheet(restoreFocus = true) {
    if (!cur) return;
    const { trigger } = cur;
    cur = null;
    timer = window.GEAPSheet.hide(sheetEl, () => !!cur);
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function ensureSheet(sprite) {
    if (sheetEl) return;
    sheetEl = window.GEAPSheet.create("e-permits-filter-sheet e-permits-filter-sheet--actions", {
      sprite,
      titleId: "geap-act-sheet-title",
      titleHtml: `<div class="e-permits-filter-sheet__heading">
            <h2 class="bottom-sheet__header--title" id="geap-act-sheet-title" data-sheet-title></h2>
            <p class="e-permits-filter-sheet__subtitle" id="geap-act-sheet-subtitle" data-sheet-subtitle></p>
          </div>`
    });
    sheetEl.addEventListener("click", (event) => {
      if (!cur) return;
      if (event.target.closest("[data-sheet-close]")) { closeSheet(); return; }
      const row = event.target.closest("[data-act-sheet-index]");
      if (!row || row.getAttribute("aria-disabled") === "true") return;
      const item = cur.items[Number(row.dataset.actSheetIndex)];
      /* the page's own handler runs on its own menu item: confirm modal or go on, exactly as on desktop */
      closeSheet();
      item?.click();
    });
    sheetEl.addEventListener("keydown", (event) => {
      if (cur && event.key === "Tab") window.GEAPSheet.trapTab(sheetEl, event);
    });
  }

  function openSheet(trigger) {
    const menu = document.getElementById(trigger.getAttribute("aria-controls") || "");
    const items = menu ? [...menu.querySelectorAll("[role='menuitem']")] : [];
    if (!items.length || !window.GEAPSheet) return false;
    const sprite = items[0].querySelector("use")?.getAttribute("href")?.split("#")[0] || "assets/icons/sprite.svg";
    ensureSheet(sprite);
    const subtitle = subtitleOf(trigger);
    sheetEl.querySelector("[data-sheet-title]").textContent = (trigger.querySelector("span")?.textContent || trigger.textContent).replace(/\s+/g, " ").trim();
    const sub = sheetEl.querySelector("[data-sheet-subtitle]");
    sub.textContent = subtitle;
    sub.hidden = !subtitle;
    const panel = sheetEl.querySelector(".bottom-sheet__panel");
    if (subtitle) panel.setAttribute("aria-describedby", "geap-act-sheet-subtitle"); else panel.removeAttribute("aria-describedby");
    sheetEl.querySelector("[data-sheet-body]").innerHTML = `
        <ul class="e-permits-workplace__filter-list e-permits-filter-sheet__list" role="list">${items.map((item, i) => rowHtml(item, i, sprite)).join("")}
        </ul>`;
    if (!menu.hidden) menu.hidden = true; /* a dropdown left open from a wider window */
    cur = { trigger, items };
    window.clearTimeout(timer);
    window.GEAPSheet.show(sheetEl);
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => panel.focus());
    return true;
  }

  /* capture: on phones the pages' own dropdown toggles never see the trigger's click */
  window.addEventListener("click", (event) => {
    if (!PHONE.matches) return;
    const trigger = event.target.closest?.(TRIGGER);
    if (!trigger || trigger.disabled || !openSheet(trigger)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  /* the trigger announces what it opens in the current mode */
  window.addEventListener("focusin", (event) => {
    const trigger = event.target.closest?.(TRIGGER);
    if (trigger) trigger.setAttribute("aria-haspopup", PHONE.matches ? "dialog" : "menu");
  }, true);
  /* Esc closes the sheet only (js/modal.js would close a dialog behind it — Ghișeu window) */
  window.addEventListener("keydown", (event) => {
    if (!cur || event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeSheet();
  }, true);
  PHONE.addEventListener("change", () => closeSheet(false));

  /* ---- long names (2026-10-20, user): desktop (>760) = ONE title line and ONE meta line; the title and the
     long meta parts shrink with an ellipsis (CSS), and whatever is cut gets the plain tooltip with the full text
     (js/icon-tooltip.js data-tooltip-text: hover; keyboard focus on the row shows the title's — data-tooltip-focus).
     Phones: title up to 2 lines, meta wraps — nothing to name. Re-measured on resize / new rows / fonts. ---- */
  const DESKTOP = window.matchMedia("(min-width: 761px)");
  const textOf = (el) => el.textContent.replace(/\s+/g, " ").trim();
  function syncCut() {
    document.querySelectorAll(".e-permits-fo-intent-act").forEach((row) => {
      const title = row.querySelector(".e-permits-fo-lib-item__title");
      const meta = row.querySelector(".e-permits-fo-doc-meta");
      if (title) {
        if (title.hasAttribute("title")) { title.dataset.fullName = title.getAttribute("title"); title.removeAttribute("title"); }
        const cut = DESKTOP.matches && title.scrollWidth > title.clientWidth + 1;
        if (cut) title.dataset.tooltipText = title.dataset.fullName || textOf(title); else delete title.dataset.tooltipText;
      }
      if (meta) {
        const cut = DESKTOP.matches && [...meta.querySelectorAll(":is(.e-permits-fo-doc-meta__part--long, .e-permits-fo-doc-meta__part--what)")].some((part) => part.scrollWidth > part.clientWidth + 1);
        if (cut) meta.dataset.tooltipText = [...meta.querySelectorAll(".e-permits-fo-doc-meta__part")].map(textOf).join(" · ");
        else delete meta.dataset.tooltipText;
      }
    });
  }
  let cutFrame = 0;
  const queueCut = () => { cancelAnimationFrame(cutFrame); cutFrame = requestAnimationFrame(syncCut); };
  window.addEventListener("resize", queueCut);
  DESKTOP.addEventListener("change", queueCut);
  document.fonts?.ready.then(queueCut);
  const startObserver = () => new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1 && (node.matches(".e-permits-fo-intent-act") || node.querySelector?.(".e-permits-fo-intent-act"))))) queueCut();
  }).observe(document.body, { childList: true, subtree: true });
  if (document.body) startObserver(); else document.addEventListener("DOMContentLoaded", startObserver);
  /* a row that was hidden when measured (a list behind a tab / view) is measured again when it is hovered / focused */
  document.addEventListener("pointerover", (event) => { if (event.target.closest?.(".e-permits-fo-intent-act")) queueCut(); }, true);
  document.addEventListener("focusin", (event) => { if (event.target.closest?.(".e-permits-fo-intent-act")) syncCut(); }, true);

  window.GEAPActRow = { html, validText, TONE: ACT_ROW_TONE, closeSheet, isSheetOpen: () => !!cur, syncCut, metaParts };
})();
