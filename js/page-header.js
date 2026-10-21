/* Page header — the ONE renderer of the profile page header (cabinet-header-v1, 2026-10-21; moved out of
   js/e-permits-shell.js so the BO and EVO Cabinet draw the same component). Markup / classes = the BO page header
   (Figma 8993:37914): header.e-permits-page-header > __body > __top (this module's `top`) + __meta (`meta`).
   CSS: e-permits-acte-permisive.css „Back-office page header” (BO + Cabinet) and css/bo-profile-parts.css (pages
   without the BO stylesheets). components.md › „Page header — one renderer”.

   GEAPPageHeader.top({ crumbs, title, titleId, subtitleHtml, wrap, actions, caption, status }) → the __top content:
     crumbs   = the full trail ([{ label, attr? | href? }, …, { label: current }]) — drawn parents-only (breadcrumb-v3)
     title    = the H1 text; one line + tooltip (BO registries) unless `wrap` (EVO Cabinet: the full name wraps,
                never truncated on its own page)
     titleId  = id + tabindex -1 on the H1 (focus after navigation)
     subtitleHtml = a line under the H1 (the Cabinet location with its pin), trusted HTML
     actions  = trusted HTML of the right-aligned action row (one primary · neutral secondaries · ⋮)
     caption / status = the 12/16 line under the actions (BO: „Publicat … · sincronizat …”)
   GEAPPageHeader.meta([[label, valueHtml], …]) → the __meta items (separators by ::before)
   GEAPPageHeader.syncMetaRows(metaEl) → .is-row-start on items that begin a wrapped line (no orphan separator) */
(function () {
  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const top = ({ crumbs = [], title = "", titleId = "", subtitleHtml = "", wrap = false, actions = "", caption = "", status = "" } = {}) => `
    <div class="e-permits-page-header__heading">
      ${window.GEAPBreadcrumbs?.html(crumbs, { truncate: true, parentsOnly: true }) || ""}
      <h1 class="e-permits-page-header__title"${wrap ? "" : " data-cell-tooltip"}${titleId ? ` id="${esc(titleId)}" tabindex="-1"` : ""}>${esc(title)}</h1>${subtitleHtml ? `
      ${subtitleHtml}` : ""}
    </div>
    ${actions || caption || status ? `
      <div class="e-permits-page-header__aside">
        ${actions ? `<div class="e-permits-page-header__actions">${actions}</div>` : ""}
        ${caption || status ? `<p class="e-permits-page-header__caption">${status}${status && caption ? " · " : ""}${esc(caption)}</p>` : ""}
      </div>
    ` : ""}
  `;

  const meta = (items) => items.filter(Boolean).map(([label, valueHtml]) => `
    <div class="e-permits-page-header__meta-item">
      <span class="e-permits-page-header__meta-label">${esc(label)}</span>
      <span class="e-permits-page-header__meta-value">${valueHtml}</span>
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
