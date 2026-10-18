/* Act row — ONE renderer for an issued act in a list (2026-10-17): the FO „Ce vrei să soliciți?” (#intent),
   the Ghișeu request window and the EVO Cabinet „Actele mele permisive” list. Moved as is out of
   js/e-permits-acte-permisive.js (`foActRowHtml`, still exported there as GEAPFormRender.actRowHtml) so pages
   that do not load the FO script (Cabinet) call the same code. The FO / Ghișeu output is byte-identical with the
   defaults below; every new option defaults to the old markup.

   The row = the shared document card (.e-permits-fo-lib-item: padding 12, radius 12, hover) with the blue
   „System Generated” document icon, the title + a Small status tag, the 14/20 secondary meta with the 2px dots
   (number · valabil până la <date> · subdivision) and the „Inițiază un postproces ⌄” pill = the library small
   button (btn-sm, 2026-10-18) with its menu (.e-permits-stack__menu + the act-menu size: 40px items, 48 on
   touch, 16/24, 20 icon — components.md „Act row”). A locked act = the subtle notice, full card width under the row.

   GEAPActRow.html(act, opts)
     act  = { id, name, number, status, statusLabel, validUntil (dd.mm.yyyy | ISO | long), subdivision,
              meta (parts, replaces the default) }
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
              hideEmptyAction = false       no pill when there is nothing to start (Cabinet: expired / paper acts) } */
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

  function html(act, {
    menuId = `fo-act-menu-${act.id}`, actionLabel = "Inițiază un postproces", items = [], pendingTitle = "", pendingText = "", menuClass = "",
    assets = "assets/", attrs = "", tagHtml = null, extraTagsHtml = "", triggerAttrs = "data-fo-intent-trigger", itemAttrs = null,
    noticeTone = "warning", noticeIcon = "icon-time", noticeLocks = true, hideEmptyAction = false
  } = {}) {
    const tone = ACT_ROW_TONE[act.status] || "neutral";
    const meta = (act.meta || [act.number, validText(act.validUntil), act.subdivision]).filter(Boolean);
    const hasNotice = Boolean(pendingTitle || pendingText);
    const locked = hasNotice && noticeLocks;
    const tag = tagHtml ?? `<span class="status-tag status-tag--${tone} is-subtle status-tag--small e-permits-fo-doc-tag">${esc(act.statusLabel || act.status)}</span>`;
    const itemHook = itemAttrs || ((pp) => `data-fo-intent-postprocess="${esc(pp.id)}"`);
    const action = hideEmptyAction && !items.length ? "" : `
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
        <li class="e-permits-fo-lib-item e-permits-fo-intent-act${locked ? " is-locked" : ""}${hasNotice && !locked ? " has-notice" : ""}" data-fo-intent-act="${esc(act.id)}"${attrs ? ` ${attrs}` : ""}>
          <img class="e-permits-fo-lib-item__icon" src="${assets}icons/document-generated.svg" width="24" height="24" alt="">
          <div class="e-permits-fo-lib-item__content">
            <div class="e-permits-fo-lib-item__title-row e-permits-fo-doc-title-row">
              <span class="e-permits-fo-lib-item__title" title="${esc(act.name)}">${esc(act.name)}</span>
              ${tag}${extraTagsHtml}
            </div>
            ${meta.length ? `<div class="e-permits-fo-lib-item__meta e-permits-fo-doc-meta"><span class="e-permits-fo-doc-meta__line">${meta.map((part) => `<span class="e-permits-fo-doc-meta__part">${esc(part)}</span>`).join("")}</span></div>` : ""}
            ${hasNotice ? `<div class="message message--subtle banner--${noticeTone} e-permits-fo-intent-act__pending"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="${assets}icons/sprite.svg#${noticeIcon}"></use></svg></span><div class="banner__content"><p class="banner__text">${pendingTitle ? `<strong>${esc(pendingTitle)}</strong> ` : ""}${esc(pendingText)}</p></div></div>` : ""}
          </div>${action}
        </li>`;
  }

  window.GEAPActRow = { html, validText, TONE: ACT_ROW_TONE };
})();
