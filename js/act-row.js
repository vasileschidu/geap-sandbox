/* Act row — ONE renderer for an issued act in a list (2026-10-17): the FO „Ce vrei să soliciți?” (#intent),
   the Ghișeu request window and the EVO Cabinet „Actele mele permisive” list. Moved as is out of
   js/e-permits-acte-permisive.js (`foActRowHtml`, still exported there as GEAPFormRender.actRowHtml) so pages
   that do not load the FO script (Cabinet) call the same code. The FO / Ghișeu output is byte-identical with the
   defaults below; every new option defaults to the old markup.

   The row = the shared document card (.e-permits-fo-lib-item: padding 12, radius 12, hover) with the blue
   „System Generated” document icon, the title + a Small status tag, the 14/20 secondary meta with the 2px dots
   (number · valabil până la <date> · subdivision) and the „Postprocese ⌄” button = the library
   small button (btn-neutral btn-sm, square — action-menu-v1 2026-10-20, user: „only do a square button”; was
   the pill) with its menu (.e-permits-stack__menu at the one dropdown item size: 32px items,
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

   Menu (action-menu-v1, 2026-10-20 — user: „the action does a dropdown menu, as Telegram, not a down modal”):
   ONE anchored dropdown at every width (the phone action sheet of the morning is gone): unavailable items keep
   the tooltip reason on desktop and show it as a 14/20 tertiary second line on phones (`__reason`, aria-hidden —
   the item's aria-description says it); consequential items (Retragere, Anulare — `pp.danger`, else by label)
   are red, last, under a separator. Phones (≤760): `fitMenu` right-aligns the menu to its button, flips it up
   when the screen has no room below, keeps it 16 from the edges; the touch item size lives in
   e-permits-acte-permisive.css „Row action menu on phones”. components.md „Row action menu on phones”. */
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

  /* ONE icon per post-process (act-icons-v1, 2026-10-20, user: „nice central icons, all the same size footprint, like
     Telegram”): one outline family, each glyph optically ~17–20 of the 24 box (measured ink boxes: edit / copy /
     rotate 17.2, cross-large 14.4 → ×0.9 in CSS, lock 15.8×19.8, calendar-add 18.1×19, circle-error 19.8, judge-gavel
     23.3 → ×0.85 in CSS). Picked by id OR label, so the FO / Cabinet data ids and the Ghișeu labels map the same;
     the item's own icon is the fallback. Replaced: pause (10×14, light), cross-small (9.6), flag. components.md
     „Row action menu — icon map”. */
  const PP_ICONS = [
    [/prelung/i, "icon-calendar-add"], [/reperf/i, "icon-edit"], [/duplicat/i, "icon-copy"], [/suspend/i, "icon-lock"],
    [/relu/i, "icon-rotate-arrow"], [/retrag/i, "icon-cross-large"], [/anul/i, "icon-circle-error"], [/contest/i, "icon-judge-gavel"],
  ];
  const ppIcon = (pp) => (PP_ICONS.find(([re]) => re.test(`${pp.id || ""} ${pp.label || ""}`)) || [])[1] || pp.icon || "icon-edit";

  /* consequential post-processes = the danger tone, last, under a separator (action-menu-v1) */
  const isDanger = (pp) => pp.danger ?? /^(retrag|anul)/i.test(String(pp.label || pp.id || ""));
  function menuItemsHtml(items, itemHook, assets) {
    const safe = items.filter((pp) => !isDanger(pp));
    const danger = items.filter(isDanger);
    const item = (pp) => `
                <li role="none">
                  <button class="e-permits-fo-intent-menu__item${isDanger(pp) ? " is-danger" : ""}" type="button" role="menuitem" ${itemHook(pp)}${pp.disabled ? ` aria-disabled="true" data-tooltip-reason="${esc(pp.reason || "")}" aria-description="${esc(pp.reason || "")}"` : ""}>
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="${assets}icons/sprite.svg#${esc(ppIcon(pp))}"></use></svg>
                    <span>${esc(pp.label)}</span>${pp.disabled && pp.reason ? `
                    <span class="e-permits-fo-intent-menu__reason" aria-hidden="true">${esc(pp.reason)}</span>` : ""}
                  </button>
                </li>`;
    return `${safe.map(item).join("")}${safe.length && danger.length ? `
                <li role="separator" class="e-permits-fo-intent-menu__separator"></li>` : ""}${danger.map(item).join("")}`;
  }

  function html(act, {
    menuId = `fo-act-menu-${act.id}`, actionLabel = "Postprocese", items = [], pendingTitle = "", pendingText = "", menuClass = "",
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
            <button class="btn btn-neutral btn-sm e-permits-fo-intent-act__trigger" type="button" aria-label="${esc(actionLabel)} pentru ${esc(act.name)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${esc(menuId)}" ${triggerAttrs}${locked ? " disabled" : ""}>
              <span>${esc(actionLabel)}</span>
              <svg class="icon small" aria-hidden="true"><use href="${assets}icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu${menuClass && menuClass !== "e-permits-stack__menu" ? ` ${menuClass}` : ""}" id="${esc(menuId)}" role="menu" aria-label="Postprocese pentru ${esc(act.name)}" hidden>
              ${menuItemsHtml(items, itemHook, assets)}
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

  /* ---- phones: the anchored dropdown fits the screen (see the header) ---- */
  const PHONE = window.matchMedia("(max-width: 760px)");
  const TRIGGER = ".e-permits-fo-intent-act__action > button[aria-haspopup]";
  const EDGE = 16;
  function fitMenu(trigger) {
    const menu = document.getElementById(trigger.getAttribute("aria-controls") || "");
    if (!menu || menu.classList.contains("cab-menu")) return; /* Cabinet request menus: CabEvo fitMenu */
    if (!PHONE.matches) { menu.classList.remove("is-fit-end", "is-fit-start"); menu.style.removeProperty("--act-menu-max"); return; } /* desktop: as it was */
    menu.classList.remove("is-fit-end", "is-fit-start", "is-open-up");
    menu.style.removeProperty("--act-menu-max");
    if (menu.hidden) return;
    const button = trigger.getBoundingClientRect();
    const width = menu.getBoundingClientRect().width;
    const end = button.right - width >= EDGE || button.right - EDGE >= window.innerWidth - EDGE - button.left;
    menu.classList.add(end ? "is-fit-end" : "is-fit-start");
    /* never wider than the room on its side (a window with its own inset — Ghișeu — leaves less than 100vw − 32);
       a geometry custom property, like the FO floating lists' inline position */
    menu.style.setProperty("--act-menu-max", `${Math.floor(end ? button.right - EDGE : window.innerWidth - EDGE - button.left)}px`);
    const rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - EDGE && button.top - rect.height - EDGE >= EDGE) menu.classList.add("is-open-up");
  }
  /* capture (Cabinet's toggle stops propagation) + the next frame = after the page's own toggle (FO / Ghișeu /
     Cabinet) opened the menu, before it is painted */
  window.addEventListener("click", (event) => {
    const trigger = event.target.closest?.(TRIGGER);
    if (trigger) requestAnimationFrame(() => fitMenu(trigger));
  }, true);
  PHONE.addEventListener("change", () => document.querySelectorAll(`${TRIGGER}[aria-expanded="true"]`).forEach(fitMenu));

  /* ---- long names (2026-10-20, user): desktop (>760) = ONE title line and ONE meta line; the title and the
     long meta parts shrink with an ellipsis (CSS), and whatever is cut gets the plain tooltip with the full text
     (js/icon-tooltip.js data-tooltip-text: hover; keyboard focus on the row shows the title's — data-tooltip-focus).
     Phones: title up to 2 lines, meta wraps — nothing to name. Re-measured on resize / new rows / fonts. ---- */
  const DESKTOP = window.matchMedia("(min-width: 761px)");
  const textOf = (el) => el.textContent.replace(/\s+/g, " ").trim();
  /* phones (act-trigger-fixed-v1, 2026-10-20): the row's trigger (⋮ / „👁 Detalii” / „Postprocese ⌄”) sits in the
     card's top-right corner (CSS „PHONE ROW ANATOMY”) and row 1 reserves its width + 8 through `--row-trigger-w`
     — a geometry custom property (like `--act-menu-max`), written only when it changes. All widths are READ
     first, then written, in one pass (no read / write interleaving). Hidden rows (width 0) keep their value.
     (Replaces the action-menu-v1 `is-action-below` fallback: the button no longer wraps under the meta.) */
  const TRIGGER_BTN = ":scope > :is(.e-permits-fo-intent-act__action, .cab-doc__actions) .btn";
  function syncTriggerWidth(rows) {
    if (DESKTOP.matches) return;
    const widths = rows.map((row) => Math.ceil(row.querySelector(TRIGGER_BTN)?.getBoundingClientRect().width || 0));
    rows.forEach((row, i) => {
      const value = widths[i] ? `${widths[i]}px` : "";
      if (!value || row.style.getPropertyValue("--row-trigger-w") === value) return;
      row.style.setProperty("--row-trigger-w", value);
    });
  }
  function syncCut() {
    const rows = [...document.querySelectorAll(".e-permits-fo-intent-act")];
    syncTriggerWidth(rows);
    rows.forEach((row) => {
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

  window.GEAPActRow = { html, validText, TONE: ACT_ROW_TONE, syncCut, metaParts, isDanger, menuItemsHtml, ppIcon };
})();
