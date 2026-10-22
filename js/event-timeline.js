/* ONE event timeline (istoric-jurnal-v1, 2026-10-22) — the BO „Jurnal de evenimente” (Figma EVO-Cabinet 519:12410,
   the „Istoric complet” pattern of 02c6ccaa) moved out of js/e-permits-shell.js so the EVO Cabinet „Istoric” (act +
   request profiles) renders the SAME element (user: „exactly the same as the Jurnal de evenimente in BO”).
   The shell's renderEventTimeline delegates here; its output is unchanged.

   GEAPEventTimeline.html(title, events, options) → the BO section (heading + grey card) or the shared empty state
   GEAPEventTimeline.listHtml(events, options)    → only the <ol class="e-permits-timeline">

   events, newest first: { at, user, role, type, status, detail, tab }
     at      ISO date („2026-07-08” → „8 iulie 2026”) or date-time („…T14:00” → „8 iulie 2026, 14:00”)
     status  „Reușit” = green check · „Eșuat” = red error + tag · „Schiță” = pen · „Urmează” = empty ring
             (a milestone not reached yet) · anything else = pending (blue clock)
   opt-in item keys (the BO never sets them, so its output stays byte-identical):
     detailHtml  trusted markup for the sentence (a link to a request)
     tone        force a look: success | danger | pending | upcoming (status text kept for the tag)
     statusTag   false = no danger tag (the title already says it: „Act retras”)
   options: meta, actionHtml, empty, openAttrs(item, index) (the item opens its details), titleId, sectionAttrs */
(function () {
  "use strict";

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  /* the BO passport date format (formatLongDate / formatStamp in the shell) */
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const pad2 = (value) => String(value).padStart(2, "0");
  const toDate = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const longDate = (value) => {
    const date = toDate(value);
    return date ? `${date.getDate()} ${RO_MONTHS[date.getMonth()]} ${date.getFullYear()}` : "—";
  };
  const stamp = (value) => {
    const date = toDate(value);
    return date ? `${longDate(value)}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}` : "—";
  };

  const tag = (label, tone = "neutral") => (!label || label === "—"
    ? '<span class="e-permits-workplace__dash">—</span>'
    : `<span class="${window.GEAPTag.cls(esc(tone))}">${esc(label)}</span>`);

  const TONES = {
    "Reușit": { tone: "success", icon: "circle-checkmark-filled" },
    "Eșuat": { tone: "danger", icon: "circle-error-filled" },
    "Schiță": { tone: "pending", icon: "edit" },
    "Urmează": { tone: "upcoming", icon: "" }
  };
  const LOOKS = {
    success: TONES["Reușit"],
    danger: TONES["Eșuat"],
    pending: { tone: "pending", icon: "time-filled" },
    upcoming: TONES["Urmează"]
  };

  const listHtml = (events, options = {}) => `
        <ol class="e-permits-timeline">
          ${events.map((item, index) => {
            const look = (item.tone && LOOKS[item.tone]) || TONES[item.status] || { tone: "pending", icon: "time-filled" };
            /* options.openAttrs(item, index): the item opens its details — the title is an
               underlined button (link signifier), the whole item hovers (Jurnal, US-228) */
            const open = options.openAttrs ? options.openAttrs(item, index) : "";
            const marker = look.icon ? `<svg class="icon"><use href="${SPRITE}#icon-${look.icon}"></use></svg>` : "";
            /* a milestone not reached yet may have no date: then only who, or no stamp line at all */
            const stampHtml = item.at
              ? `<time datetime="${esc(item.at)}">${esc(String(item.at).includes("T") ? stamp(item.at) : longDate(item.at))}</time>${item.user ? ` · ${esc(item.user)}` : ""}${item.role ? ` · ${esc(item.role)}` : ""}`
              : [item.user, item.role].filter(Boolean).map(esc).join(" · ");
            const detail = item.detailHtml || (item.detail ? esc(item.detail) : "");
            return `
              <li class="e-permits-timeline__item e-permits-timeline__item--${look.tone}${open ? " is-clickable" : ""}"${open ? ` ${open}` : ""}>
                <span class="e-permits-timeline__rail" aria-hidden="true">
                  <span class="e-permits-timeline__marker">${marker}</span>
                </span>
                <div class="e-permits-timeline__content">
                  <span class="e-permits-timeline__title">${open ? `<button class="e-permits-timeline__link" type="button" aria-haspopup="dialog">${esc(item.type)}</button>` : esc(item.type)}${item.tab ? tag(item.tab, "neutral") : ""}${look.tone === "danger" && item.statusTag !== false ? tag(item.status, "danger") : ""}</span>
                  ${stampHtml ? `<span class="e-permits-timeline__stamp">${stampHtml}</span>` : ""}
                  ${detail ? `<p class="e-permits-timeline__text">${detail}</p>` : ""}
                </div>
              </li>
            `;
          }).join("")}
        </ol>`;

  const emptyHtml = (title, message, options) => `
    <section class="e-permits-dosar-profil__section"${options.sectionAttrs ? ` ${options.sectionAttrs}` : ""}>
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title"${options.titleId ? ` id="${esc(options.titleId)}"` : ""}>${esc(title)}</h2>
      </div>
      ${window.GEAPEmptyState.render({ text: message, actionHtml: "", icon: "page-text" })}
    </section>
  `;

  const html = (title, events, options = {}) => {
    if (!events.length) {
      return emptyHtml(title, options.empty || "Nu există evenimente înregistrate.", options);
    }

    return `
      <section class="e-permits-dosar-profil__section"${options.sectionAttrs ? ` ${options.sectionAttrs}` : ""}>
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title"${options.titleId ? ` id="${esc(options.titleId)}"` : ""}>${esc(title)}</h2>
          ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(options.meta)}</span>` : ""}
          ${options.actionHtml || ""}
        </div>${listHtml(events, options)}
      </section>
    `;
  };

  window.GEAPEventTimeline = { html, listHtml, TONES };
})();
