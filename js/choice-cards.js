/* Choice cards — ONE renderer for the identity / role choice screens (choice-cards-v1, 2026-11-04)
   The FO full-flow „Cum vrei să depui cererea?” (js/e-permits-acte-permisive.js: own identities + the collapsible
   „Cu împuternicire MPower” group), the BO login context screen (US-81, js/bo-login.js) and the BO „Schimbă rolul”
   dialog (US-82, js/e-permits-shell.js) all draw these parts; the classes are the FO ones
   (css/e-permits-acte-permisive.css „.e-permits-fo-auth__role-*”). The collapse toggle is handled here, once,
   for every page (document listener). */
(() => {
  "use strict";
  if (window.GEAPChoiceCards) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const sprite = (id, size = 20) => `<svg class="icon" width="${size}" height="${size}"><use href="assets/icons/sprite.svg#${esc(id)}"></use></svg>`;

  /* the round icon avatar of a card / of the collapse preview (library .avatar--sm + the FO hook + tone) */
  const avatarIcon = (iconId, { tone = "brand", className = "e-permits-fo-auth__role-avatar" } = {}) => `
          <span class="avatar avatar--sm avatar--icon ${className} ${className}--icon ${className}--${esc(tone)}" aria-hidden="true">
            ${sprite(iconId)}
          </span>`;

  /* one card: avatar · name (+ badge) · meta · extra · chevron — `name` is text, the rest HTML */
  /* `nameTooltip`: a cut title shows the library clipped-text tooltip (js/icon-tooltip.js `data-cell-tooltip`) */
  const item = ({ name, avatarHtml = "", badgeHtml = "", metaHtml = "", extraHtml = "", className = "", attrs = "", disabled = false, nameTooltip = false }) => {
    const nameHtml = `<span class="e-permits-fo-auth__role-name"${nameTooltip ? " data-cell-tooltip" : ""}>${esc(name)}</span>`;
    return `
        <button class="e-permits-fo-auth__role-item${className ? ` ${className}` : ""}" type="button" ${attrs} ${disabled ? "disabled aria-disabled=\"true\"" : ""}>
          <span class="e-permits-fo-auth__role-row">
            ${avatarHtml}
            <span class="e-permits-fo-auth__role-text">
              ${badgeHtml ? `
                <span class="e-permits-fo-auth__role-heading">
                  ${nameHtml}
                  ${badgeHtml}
                </span>
              ` : nameHtml}
              ${metaHtml}
              ${extraHtml}
            </span>
            <svg class="e-permits-fo-auth__role-arrow icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-right"></use>
            </svg>
          </span>
        </button>
      `;
  };
  const meta = (text, { tooltip = false } = {}) => (text ? `<span class="e-permits-fo-auth__role-meta"${tooltip ? " data-cell-tooltip" : ""}>${esc(text)}</span>` : "");

  /* the toggle's badge stack: up to 4 avatars, the 4th becomes „+N” when there are more */
  const collapsePreview = (avatarsHtml, total = avatarsHtml.length) => `
        <span class="e-permits-fo-auth__role-collapse-preview" aria-hidden="true">
          <span class="e-permits-fo-auth__role-collapse-stack">
            ${avatarsHtml.slice(0, 4).map((html, index) => (index === 3 && total > 4
              ? `<span class="avatar avatar--sm avatar--initials e-permits-fo-auth__role-collapse-avatar e-permits-fo-auth__role-collapse-avatar--counter">+${esc(total - 3)}</span>`
              : html)).join("")}
          </span>
          <span class="e-permits-fo-auth__role-collapse-arrow">
            <svg class="icon" width="16" height="16">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </span>
        </span>
      `;

  /* `titleInToggle` (BO role screen, user 2026-11-04): no title row — the toggle itself reads the group name (+ icon)
     instead of „Arată mai multe”, open or closed */
  /* a group: title (+ `titleIcon`, a 20 sprite icon left of it — the BO authority's building) + cards; collapsible = the MPower group (toggle „Arată mai multe” + badge stack, cards in the
     collapse panel; a closed panel is inert so its cards stay out of the tab order) */
  const group = ({ title, itemsHtml = [], collapsible = false, expanded = false, previewHtml = "", heading = "h2",
    labelMore = "Arată mai multe", labelLess = "Arată mai puține", attrs = "", titleIcon = "", titleInToggle = false }) => {
    if (!itemsHtml.length) return "";
    const listHtml = `
            <div class="e-permits-fo-auth__role-group-list">
              ${itemsHtml.join("")}
            </div>
          `;
    return `
        <section class="e-permits-fo-auth__role-group${collapsible ? " is-collapsible" : ""}${collapsible && expanded ? " is-expanded" : ""}" aria-label="${esc(title)}" ${collapsible ? "data-fo-role-collapse-group" : ""} ${attrs}>
          ${collapsible && titleInToggle ? "" : `<${heading} class="e-permits-fo-auth__role-group-title${titleIcon ? " e-permits-fo-auth__role-group-title--icon" : ""}">${titleIcon ? `<span aria-hidden="true">${sprite(titleIcon)}</span>` : ""}${titleIcon ? `<span>${esc(title)}</span>` : esc(title)}</${heading}>`}
          ${collapsible ? `
            <button class="e-permits-fo-auth__role-collapse-toggle${titleInToggle ? " e-permits-fo-auth__role-collapse-toggle--title" : ""}" type="button" aria-expanded="${expanded ? "true" : "false"}" data-fo-role-collapse-toggle data-label-more="${esc(labelMore)}" data-label-less="${esc(labelLess)}">
              ${titleInToggle && titleIcon ? `<span class="e-permits-fo-auth__role-collapse-icon" aria-hidden="true">${sprite(titleIcon)}</span>` : ""}
              <span class="e-permits-fo-auth__role-collapse-label" data-fo-role-collapse-label${titleInToggle ? " data-cell-tooltip" : ""}>${esc(expanded ? labelLess : labelMore)}</span>
              ${previewHtml}
            </button>
            <div class="e-permits-fo-auth__role-collapse" data-fo-role-collapse-panel${expanded ? "" : " inert"}>${listHtml}</div>
          ` : listHtml}
        </section>
      `;
  };

  /* open / close one collapsible group (the toggle, a search that found cards inside) */
  const setExpanded = (groupEl, isExpanded) => {
    if (!groupEl) return;
    const toggle = groupEl.querySelector("[data-fo-role-collapse-toggle]");
    const label = toggle?.querySelector("[data-fo-role-collapse-label]");
    groupEl.classList.toggle("is-expanded", isExpanded);
    groupEl.querySelector("[data-fo-role-collapse-panel]")?.toggleAttribute("inert", !isExpanded);
    toggle?.setAttribute("aria-expanded", String(isExpanded));
    if (label) label.textContent = isExpanded ? (toggle.dataset.labelLess || "Arată mai puține") : (toggle.dataset.labelMore || "Arată mai multe");
  };

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-fo-role-collapse-toggle]");
    if (!toggle) return;
    event.preventDefault();
    const groupEl = toggle.closest("[data-fo-role-collapse-group]");
    setExpanded(groupEl, !groupEl?.classList.contains("is-expanded"));
  });

  window.GEAPChoiceCards = { item, meta, group, collapsePreview, avatarIcon, setExpanded, esc };
})();
