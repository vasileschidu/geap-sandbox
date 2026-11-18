/* EVO Cabinet v2 — the flag and the menu groups (cab2-foundations-v1, 2026-11-17).
   Loaded in <head>, not deferred: `?shell=2` puts `.cab2` on <html> before the first paint, so the new surfaces
   (cab2.css) never flash in / out. Without the flag nothing changes — the current Cabinet stays as it is until
   Batch 5 makes the new shell the default.
     ?shell=2            the new shell
     ?motion=reduce      forces the reduced-motion base (`.is-motion-reduced`) — demo / tests; the real switch is the
                         system setting (prefers-reduced-motion)
   window.Cab2 = { on, GROUPS, group(id), groupIcon(id, { size, sprite }), card(cfg) }
   GROUPS = the menu groups in menu order (wiki 02 · Structure): one colour (cab2.css › 4. group identity, by
   `data-cab2-group`) + one sprite icon each. `company` = the label of the same slot in a company context. */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const root = document.documentElement;
  /* cab2-s1-v1 (2026-11-17): the new Cabinet has its own page (cabinet-evo/v2.html, `data-cab2-entry` on <html>) —
     isolated from the current Cabinet. On index.html `?shell=2` now only serves the Foundations demo page
     (?view=foundations); every other `?shell=2` address moves to the same place on v2.html. */
  const entry = root.hasAttribute("data-cab2-entry");
  const on = entry || params.get("shell") === "2";
  if (!entry && on && params.get("view") !== "foundations") {
    const view = params.get("view");
    const next = new URLSearchParams();
    ["as", "atentie", "entitati", "motion", "act"].forEach((key) => { if (params.get(key)) next.set(key, params.get(key)); });
    const section = view === "solicitari" ? "cereri" : view === "acte" ? "acte" : view === "notificari" ? "notificari" : params.get("s");
    if (section) next.set("s", section);
    const query = next.toString();
    window.location.replace(`v2.html${query ? `?${query}` : ""}${window.location.hash}`);
  }
  /* a record by id (v2.html?s=cereri|acte&id=<record>) = the views' own record addresses (#dosar/<id> · &act=<id>) */
  if (entry && params.get("id") && ["cereri", "acte"].includes(params.get("s"))) {
    const next = new URLSearchParams(params);
    const id = next.get("id");
    next.delete("id");
    if (next.get("s") === "acte") next.set("act", id);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${next.toString()}${next.get("s") === "cereri" ? `#dosar/${id}` : window.location.hash}`);
  }
  if (on) {
    root.classList.add("cab2");
    if (params.get("motion") === "reduce") root.classList.add("is-motion-reduced");
    /* S1 · structure first (product owner, 2026-11-17): the visual layer of Batch 1 / 2 (grey page, borderless cards,
       hero, entrance motion, group colours) is parked — kept in the code, applied only with ?visual=on (and on the
       Foundations demo page). Default = `data-cab-visual="off"`: white page, BO formats. */
    root.dataset.cabVisual = params.get("visual") === "on" || params.get("view") === "foundations" ? "on" : "off";
  }

  const GROUPS = [
    { id: "acasa", label: "Acasă", icon: "home-line" },
    { id: "cereri", label: "Cereri și acte permisive", icon: "permission" },
    { id: "documente", label: "Documente", icon: "id-card" },
    { id: "bani", label: "Bani și obligații", icon: "wallet" },
    { id: "proprietati", label: "Proprietăți și vehicule", icon: "house" },
    { id: "familie", label: "Familie și sănătate", icon: "health" },
    { id: "munca", label: "Muncă și afaceri", company: "Companie", icon: "business" },
    { id: "acces", label: "Acces și reprezentare", icon: "shield-user" },
  ];
  const group = (id) => GROUPS.find((item) => item.id === id) || null;

  /* the round group icon = the library avatar (40 · icon 20; size "sm" = 32) with the group's two colours */
  const groupIcon = (id, { size = "md", sprite = "../assets/icons/sprite.svg" } = {}) => {
    const item = group(id);
    if (!item) return "";
    return `<span class="avatar avatar--${size === "sm" ? "sm" : "md"} avatar--icon cab2-group-icon" data-cab2-group="${item.id}" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${sprite}#icon-${item.icon}"></use></svg></span>`;
  };

  /* the Cabinet card = the dashboard widget card (js/widget-admin.js cardHtml({ dash }) anatomy, css/widget.css), borderless
     on the grey page: head (title, + the group's round icon) · headline (value + ONE Small tag, then one grey line) ·
     optional body · footer (quiet source line, only when given). With `href` the card is one link: the title link's hit area is
     the whole card and the wrapper carries the shared grey hover surface around it.
     Cab2.card({ title, value, tag, tone, line, source, href, group, level, bodyHtml, attrs, linkAttrs }) → HTML */
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  /* `borderless: false` = the dashboard's own bordered card, for a WHITE page (S1 Acasă tiles, cab2-home-v1); a tag
     without a value sits alone on the headline line (a request tile: its status) */
  const card = ({ title = "", value = "", tag = "", tone = "neutral", line = "", source = "", href = "", group: groupId = "", level = 3, bodyHtml = "", attrs = "", linkAttrs = "", borderless = true } = {}) => {
    const tagHtml = tag ? window.GEAPTag?.html(tag, tone || "neutral") || "" : "";
    const headline = value || line || tagHtml ? `
        <div class="e-permits-wid-card__headline">
          ${value || tagHtml ? `<span class="e-permits-wid-stat__line">${value ? `<span class="e-permits-wid-card__headline-value">${esc(value)}</span>` : ""}${tagHtml}</span>` : ""}
          ${line ? `<span class="e-permits-wid-stat__meta">${esc(line)}</span>` : ""}
        </div>` : "";
    /* the whole card is the link (cab2-tile-link-v1, PO 2026-11-18: no „Deschide”): the title is the one link, stretched over
       the card — its name = the card title, no nested control; the wrapper carries the grey hover + the focus ring */
    const link = Boolean(href);
    const titleHtml = link ? `<a class="cab2-wcard__link" href="${esc(href)}"${linkAttrs}>${esc(title)}</a>` : esc(title);
    const foot = source ? `
          <div class="e-permits-wid-card__foot-row"><span class="e-permits-wid-card__updated">${esc(source)}</span></div>` : "";
    return `
      <div class="cab2-wcard${link ? " e-permits-hover-surface is-hover-within cab2-wcard--link" : ""}"${groupId ? ` data-cab2-group="${esc(groupId)}"` : ""}${attrs}>
        <article class="e-permits-chart e-permits-wid-card e-permits-wid-card--panel e-permits-wid-card--dash${borderless ? " e-permits-wid-card--borderless" : ""}">
          <div class="e-permits-wid-card__head">
            <div class="e-permits-wid-card__title-row">${groupId ? groupIcon(groupId, { size: "sm" }) : ""}<h${level} class="e-permits-wid-card__title">${titleHtml}</h${level}></div>${headline}
          </div>${bodyHtml ? `
          <div class="e-permits-wid-card__body">${bodyHtml}</div>` : ""}${foot}
        </article>${link ? `
        <span class="cab2-go" aria-hidden="true"><svg class="icon medium" focusable="false"><use href="../assets/icons/sprite.svg#icon-chevron-right"></use></svg></span>` : ""}
      </div>`;
  };

  window.Cab2 = { on, entry, visual: () => root.dataset.cabVisual === "on", GROUPS, group, groupIcon, card };
})();
