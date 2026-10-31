/* Page header — the ONE renderer of the profile page header (cabinet-header-v1, 2026-10-21; moved out of
   js/e-permits-shell.js so the BO and EVO Cabinet draw the same component). Markup / classes = the BO page header
   (Figma 8993:37914): header.e-permits-page-header > __body > __top (this module's `top`) + __meta (`meta`).
   CSS: e-permits-acte-permisive.css „Back-office page header” (BO + Cabinet) and css/bo-profile-parts.css (pages
   without the BO stylesheets). components.md › „Page header — one renderer”.

   GEAPPageHeader.top({ crumbs, title, titleId, subtitleHtml, wrap, actions, actionsPlacement, phoneTitle, caption, status }) → the __top content:
     crumbs   = the full trail ([{ label, attr? | href? }, …, { label: current }]) — drawn parents-only (breadcrumb-v3)
     title    = the H1 text; one line + tooltip (BO registries) unless `wrap` (EVO Cabinet: the full name wraps,
                never truncated on its own page)
     titleId  = id + tabindex -1 on the H1 (focus after navigation)
     subtitleHtml = a line under the H1 (the Cabinet location with its pin), trusted HTML
     actions  = trusted HTML of the action row (one primary · neutral secondaries · ⋮)
     actionsPlacement = "aside" (default: right-aligned on the title row, BO) | "below" (rap-header-v1, 2026-10-22,
                user: long names get squeezed beside the actions → a left-aligned row under the title / subtitle,
                `.e-permits-page-header__actions--below`)
     phoneTitle = "default" | "compact" (header-actions-below-v1, 2026-10-22, user: „on mobile the title in the profile
                smaller, too big now”): on phones (≤760) the H1 is 20/28 and a long name stops at 4 lines with the
                name-expand toggle „Mai mult ⌄ / Mai puțin ⌃” (js/name-expand.js, multi-line mode); desktop unchanged.
                Implies `wrap`. The page loads js/name-expand.js + css/name-expand.css and calls
                GEAPNameExpand.scan(header) after inserting the header.
     caption / status = the 12/16 line under the actions (BO: „Publicat … · sincronizat …”)
   GEAPPageHeader.meta([[label, valueHtml, captionHtml?], …]) → the __meta items (separators by ::before); captionHtml =
     an optional 12/16 tertiary line UNDER the value (dist-mode-v1: „Specialist” → „Distribuit aleatoriu · 8 iul. 2026”)
   GEAPPageHeader.syncMetaRows(metaEl) → .is-row-start on items that begin a wrapped line (no orphan separator) */
(function () {
  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const top = ({ crumbs = [], title = "", titleId = "", subtitleHtml = "", wrap = false, actions = "", actionsPlacement = "aside", phoneTitle = "default", caption = "", status = "" } = {}) => {
    const compact = phoneTitle === "compact";
    const below = actionsPlacement === "below" && actions;
    const aside = below ? "" : actions;
    return `
    <div class="e-permits-page-header__heading">
      ${window.GEAPBreadcrumbs?.html(crumbs, { truncate: true, parentsOnly: true }) || ""}
      <h1 class="e-permits-page-header__title${compact ? " e-permits-page-header__title--compact" : ""}"${wrap || compact ? "" : " data-cell-tooltip"}${compact ? " data-name-expand data-name-expand-lines" : ""}${titleId ? ` id="${esc(titleId)}" tabindex="-1"` : ""}>${esc(title)}</h1>${subtitleHtml ? `
      ${subtitleHtml}` : ""}${below ? `
      <div class="e-permits-page-header__actions e-permits-page-header__actions--below">${actions}</div>` : ""}
    </div>
    ${aside || caption || status ? `
      <div class="e-permits-page-header__aside">
        ${aside ? `<div class="e-permits-page-header__actions">${aside}</div>` : ""}
        ${caption || status ? `<p class="e-permits-page-header__caption">${status}${status && caption ? " · " : ""}${esc(caption)}</p>` : ""}
      </div>
    ` : ""}
  `;
  };

  const meta = (items) => items.filter(Boolean).map(([label, valueHtml, captionHtml = ""]) => `
    <div class="e-permits-page-header__meta-item${captionHtml ? " e-permits-page-header__meta-item--caption" : ""}">
      <span class="e-permits-page-header__meta-label">${esc(label)}</span>
      <span class="e-permits-page-header__meta-value">${valueHtml}</span>${captionHtml ? `
      <span class="e-permits-page-header__meta-caption">${captionHtml}</span>` : ""}
    </div>
  `).join("");

  const syncMetaRows = (metaEl) => {
    let previousTop = null;
    metaEl?.querySelectorAll(":scope > .e-permits-page-header__meta-item").forEach((item) => {
      const itemTop = item.offsetTop;
      item.classList.toggle("is-row-start", previousTop === null || itemTop > previousTop + 1);
      previousTop = itemTop;
    });
  };

  window.GEAPPageHeader = { top, meta, syncMetaRows };
})();
