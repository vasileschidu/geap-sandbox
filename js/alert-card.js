/* Alert card (act-alert-card-v1, 2026-10-22) — the soft, rounded status alert of the EVO Cabinet profiles (act + request).
   User: „round corners, grey background with a coloured icon, a nice title and description and actions, as the Google one”
   (Google Wallet reference = look & feel only). It is a documented MODIFIER of the product Callout:
   `.e-permits-callout.e-permits-callout--card.e-permits-callout--{info|warning|danger|success}` — grey surface, radius 24,
   padding 24 (phones 16), status icon 24 in the tone colour, title 16/24 semibold, text 14/20 secondary, the actions
   inside at the bottom right (library Medium 40 PILL buttons `btn btn-md btn-rounded`; phones stacked full width, primary on top). css/alert-card.css.

   GEAPAlertCard.html({ tone, icon, title, text, actions, id, role, titleTag, attrs, className, sprite })
     tone      info | warning | danger | success (icon colour; the surface stays grey)
     icon      sprite id (default = the tone's filled status icon)
     title     html (escaped by the caller) · text = html, optional
     actions   html of library buttons, in reading order: quiet ones first, the primary LAST (it ends up bottom-right;
               on phones the column is reversed, so it is on top)
     id        element id (the title gets `${id}-title`, the card is labelled by it)
     role      status (default) — the card is not an interruption; pass "alert" only for an error that just happened */
(function () {
  const ICONS = {
    info: "icon-circle-info-filled",
    warning: "icon-warning-filled",
    danger: "icon-circle-error-filled",
    success: "icon-circle-checkmark-filled",
  };
  const TONES = Object.keys(ICONS);

  function html({ tone = "info", icon = "", title = "", text = "", actions = "", id = "", role = "status", titleTag = "h2", attrs = "", className = "", sprite = "../assets/icons/sprite.svg" } = {}) {
    const kind = TONES.includes(tone) ? tone : "info";
    const glyph = icon || ICONS[kind];
    const titleId = id ? `${id}-title` : "";
    const tag = /^h[2-6]$/.test(titleTag) ? titleTag : "h2";
    return `
      <div class="e-permits-callout e-permits-callout--card e-permits-callout--${kind}${className ? ` ${className}` : ""}"${id ? ` id="${id}"` : ""}${role ? ` role="${role}"` : ""}${titleId ? ` aria-labelledby="${titleId}"` : ""}${attrs ? ` ${attrs}` : ""}>
        <span class="e-permits-callout__icon" aria-hidden="true"><svg class="icon medium" aria-hidden="true"><use href="${sprite}#${glyph}"></use></svg></span>
        <div class="e-permits-callout__content">
          <${tag} class="e-permits-callout__title"${titleId ? ` id="${titleId}"` : ""}>${title}</${tag}>
          ${text ? `<p class="e-permits-callout__text">${text}</p>` : ""}
        </div>
        ${actions ? `<div class="e-permits-callout__actions">${actions}</div>` : ""}
      </div>`;
  }

  window.GEAPAlertCard = { html, ICONS };
})();
