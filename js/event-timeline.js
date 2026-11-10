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
            /* audit-context-v1 (US-262): opt-in `context` = [parts] → a second stamp line (authority · subdivision ·
               „ID corelare …”); the BO lists that do not pass it stay byte-identical */
            const context = Array.isArray(item.context) ? item.context.filter(Boolean).map(esc).join(" · ") : "";
            return `
              <li class="e-permits-timeline__item e-permits-timeline__item--${look.tone}${open ? " is-clickable" : ""}"${open ? ` ${open}` : ""}>
                <span class="e-permits-timeline__rail" aria-hidden="true">
                  <span class="e-permits-timeline__marker">${marker}</span>
                </span>
                <div class="e-permits-timeline__content">
                  <span class="e-permits-timeline__title">${open ? `<button class="e-permits-timeline__link" type="button" aria-haspopup="dialog">${esc(item.type)}</button>` : esc(item.type)}${item.tab ? tag(item.tab, "neutral") : ""}${look.tone === "danger" && item.statusTag !== false ? tag(item.status, "danger") : ""}</span>
                  ${stampHtml ? `<span class="e-permits-timeline__stamp">${stampHtml}</span>` : ""}${context ? `
                  <span class="e-permits-timeline__stamp e-permits-timeline__stamp--context">${context}</span>` : ""}
                  ${detail ? `<p class="e-permits-timeline__text">${detail}</p>` : ""}
                </div>
              </li>
            `;
          }).join("")}
        </ol>`;

  const emptyHtml = (title, message, options) => `
    <section class="e-permits-dosar-profil__section"${options.sectionAttrs ? ` ${options.sectionAttrs}` : ""}>
      <div class="e-permits-dosar-profil__section-heading${options.headingClass ? ` ${esc(options.headingClass)}` : ""}">
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
        <div class="e-permits-dosar-profil__section-heading${options.headingClass ? ` ${esc(options.headingClass)}` : ""}">
          <h2 class="e-permits-dosar-profil__section-title"${options.titleId ? ` id="${esc(options.titleId)}"` : ""}>${esc(title)}</h2>
          ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(options.meta)}</span>` : ""}
          ${options.actionHtml || ""}
        </div>${listHtml(events, options)}
      </section>
    `;
  };

  /* ===== US-262 — the audit event with its context and correlation id (audit-context-v1, 2026-10-25) =====
     audit(event, ctx) → the unique-journal record of a log entry, derived deterministically (the prototype logs only
     { at, user, role, type, status, detail }); ctx = { module, authority, subdivision, objectType, objectId,
     objectVersion, personal, correlation, related: [{ module, type, actor, user, offset }] } (an event may carry its own
     `audit` with the same keys). Fields = the US-262 data model: id, template (+ Activ), message (generated, no IDNP /
     IDNO — AC-10, max 2000 — AC-14), actionAt ≠ registeredAt (AC-09, UTC), actorType Utilizator / Sistem / Sistem extern,
     user (empty for the system), role, authority + subdivision (organizational context — AC-05), ip (empty for the
     system — AC-06), object + type + version (AC-07), result Succes / Eșec / Refuzat, correlation (one id for every event
     of the same action, across modules — AC-08), related (those other events), personal data, MLog transmission. */
  const hash = (text) => {
    let h = 2166136261;
    for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const hex = (value, length = 8) => (value >>> 0).toString(16).padStart(8, "0").slice(0, length);
  const SYSTEM = /^(SIA GEAP|Sistem)$/i;
  const EXTERNAL = /^(MPay|MPass|MDocs|MSign|MNotify|MConnect|MLog|MPower|RSSP|RSUD|SRRE)$/i;
  const actorTypeOf = (user) => (!user || SYSTEM.test(user) ? "Sistem" : EXTERNAL.test(user) ? "Sistem extern" : "Utilizator");
  const RESULTS = { "Reușit": "Succes", "Eșuat": "Eșec", "Refuzat": "Refuzat" };
  const maskIds = (text) => String(text ?? "").replace(/\b\d{13}\b/g, "•••").slice(0, 2000);
  const utc = (date) => `${longDate(date.toISOString().slice(0, 10))}, ${date.toISOString().slice(11, 19)} UTC`;
  const correlationOf = (seed) => { const a = hash(seed); const b = hash(`${seed}#`); return `${hex(a, 8)}-${hex(b, 4)}-${hex(a ^ b, 4)}`; };

  function audit(event = {}, ctx = {}) {
    const own = { ...ctx, ...(event.audit || {}) };
    const at = toDate(event.at) || new Date();
    const actorType = own.actorType || actorTypeOf(event.user);
    const system = actorType !== "Utilizator";
    const seed = `${event.at}|${event.type}|${event.user || ""}`;
    const h = hash(seed);
    const registered = new Date(at.getTime() + 1000 + (h % 2000)); /* MLog / the journal writes after the action (AC-09) */
    const correlation = own.correlation || event.correlation || correlationOf(`${own.objectId || ""}|${event.at}`);
    const template = `TJ-${String(hash(event.type) % 10000).padStart(4, "0")}`;
    const mlogPending = h % 13 === 0;
    const offsetAt = (seconds) => new Date(at.getTime() + seconds * 1000).toISOString();
    const related = (own.related || []).map((item, index) => ({
      at: item.at || offsetAt(item.offset ?? index + 1),
      type: item.type,
      user: item.user || "",
      role: item.actor || actorTypeOf(item.user),
      status: item.status || "Reușit",
      tab: item.module
    }));
    return {
      id: `EV-${hex(h).toUpperCase()}`,
      template: `${template} · ${event.type}`,
      templateState: "Activ",
      message: maskIds(event.detail || event.type),
      actionAt: utc(at),
      registeredAt: utc(registered),
      actorType,
      user: system ? "" : event.user || "",
      systemName: system ? event.user || "SIA GEAP" : "",
      role: system ? "" : event.role || own.role || "",
      authority: own.authority || "",
      subdivision: own.subdivision || "",
      ip: system ? "" : own.ip || (own.module === "FrontOffice" ? `188.237.${h % 200}.${(h >>> 8) % 250}` : `10.12.${h % 200}.${(h >>> 8) % 250}`),
      module: own.module || "BackOffice",
      objectType: own.objectType || "",
      objectId: String(own.objectId || "").slice(0, 64),
      objectVersion: own.objectVersion || "",
      result: RESULTS[event.status] || "Succes",
      correlation,
      personal: Boolean(own.personal),
      related,
      mlog: mlogPending
        ? { state: "De expediat", attempts: 2, id: "", error: "MLog nu a răspuns în 30 de secunde; se reîncearcă automat." }
        : { state: "Expediat", attempts: 1, id: `MLOG-${hex(hash(`${seed}mlog`)).toUpperCase()}`, error: "" }
    };
  }
  /* the unique audit journal of the session (widget-audit-v1, 2026-11-07; Feature 96501 rev 18 „Fiecare operație … se
     înregistrează în Jurnalul de audit”): log(event, ctx) = audit() + kept in ONE shared list (newest first), so a module
     that also keeps its own Istoric writes the same record to the platform journal; journal() reads it back
     (window.GEAPEventTimeline.journal() — demo / QA probe). The prototype has no journal page: an Istoric entry opens
     its record (the shell's audit event detail: context, correlation, MLog transmission). */
  const JOURNAL = [];
  function log(event = {}, ctx = {}) {
    const record = audit(event, ctx);
    JOURNAL.unshift({ ...record, title: event.type || "" });
    return record;
  }
  const journal = () => JOURNAL.slice();
  /* the second stamp line of a row: where it happened + the correlation id (short) */
  const contextOf = (record) => [record.module !== "BackOffice" ? record.module : "", record.authority, record.subdivision, `ID corelare ${record.correlation}`];

  /* ===== US-263 — „Modificări” of an audit event (aud-263-v1, 2026-11-10): ONE section for every event-detail modal
     (Servicii › Jurnal, dossier Jurnalul activităților, Widget / KPI Istoric, Registre › Jurnal evenimente).
     changesHtml(changes, { title }) → "" when the event changed no field (login, consultation — US-263 AC-20), else a BO
     section „Modificări” + „N modificări” and a 3-column table Câmp · Valoare anterioară · Valoare nouă (library `.table`
     rows; phones = one record per row). A change is [field, before, after] or { field | label, before, after, personal,
     added: [], removed: [] }: a list (`added` / `removed`) = one row per item with a Small „Adăugat” / „Eliminat” tag
     (US-263 AC-12…14: added → previous empty, removed → new empty); empty / „—” = „—”; the previous value is struck
     through and muted; long values are clamped to 3 lines with the full text in the Small tooltip; a personal value
     redacted at anonymisation (US-277: „‹redactat›”) = a neutral Small tag with the shield icon. */
  const REDACTED = "‹redactat›";
  const EMPTY = /^(—|-|--|)$/;
  const changeRows = (changes = []) => changes.flatMap((c) => {
    if (Array.isArray(c)) return [{ field: c[0], before: c[1], after: c[2] }];
    const field = c.field || c.label || "";
    const items = [
      ...(c.removed || []).map((item) => ({ field, before: item, after: "", op: "removed" })),
      ...(c.added || []).map((item) => ({ field, before: "", after: item, op: "added" }))
    ];
    if (items.length) return items.map((item) => ({ ...item, personal: c.personal }));
    return [{ field, before: c.before, after: c.after, personal: c.personal, redacted: c.redacted }];
  });
  const changeValue = (value, { before = false, redacted = false } = {}) => {
    const text = String(value ?? "").replace(/<[^>]+>/g, "").trim();
    if (EMPTY.test(text)) return '<span class="e-permits-workplace__dash" aria-label="gol">—</span>';
    if (redacted || text === REDACTED) {
      return window.GEAPTag?.html(REDACTED, "neutral", { icon: "shield-keyhole", sprite: SPRITE, attrs: 'data-tooltip-text="Valoare personală redactată la anonimizare"' }) || esc(text);
    }
    return `<span class="e-permits-audit-changes__value${before ? " is-before" : ""}" data-cell-tooltip>${before ? '<span class="u-visually-hidden">Anterior: </span>' : ""}${esc(text)}</span>`;
  };
  const OPS = { added: ["Adăugat", "success"], removed: ["Eliminat", "danger"] };
  function changesHtml(changes = [], { title = "Modificări" } = {}) {
    const rows = changeRows(changes).filter((r) => r.field);
    if (!rows.length) return "";
    const redacted = rows.some((r) => r.redacted || [r.before, r.after].some((v) => String(v ?? "").trim() === REDACTED));
    const count = rows.length === 1 ? "1 modificare" : `${rows.length}${rows.length >= 20 && (rows.length % 100 === 0 || rows.length % 100 >= 20) ? " de" : ""} modificări`;
    return `
      <section class="e-permits-dosar-profil__section e-permits-audit-changes">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
          <span class="e-permits-dosar-profil__section-meta">${count}</span>
        </div>
        ${redacted ? `<div class="info-box info-box--neutral e-permits-info-note"><span class="info-box__icon"><svg class="icon" aria-hidden="true"><use href="${SPRITE}#icon-circle-info-filled"></use></svg></span><div class="info-box__content"><p>Datele personale au fost redactate la anonimizarea înregistrării. Celelalte valori ale evenimentului au rămas neschimbate.</p></div></div>` : ""}
        <div class="e-permits-audit-changes__wrap">
          <table class="table e-permits-audit-changes__table">
            <caption class="u-visually-hidden">${esc(title)}: câmpul, valoarea anterioară și valoarea nouă</caption>
            <thead><tr class="table__row"><th class="table__head-cell" scope="col">Câmp</th><th class="table__head-cell" scope="col">Valoare anterioară</th><th class="table__head-cell" scope="col">Valoare nouă</th></tr></thead>
            <tbody>${rows.map((r) => `
              <tr class="table__row">
                <th class="table__body-cell e-permits-audit-changes__field" scope="row"><span class="e-permits-audit-changes__name" data-cell-tooltip>${esc(r.field)}</span>${r.op ? window.GEAPTag?.html(OPS[r.op][0], OPS[r.op][1]) || "" : ""}</th>
                <td class="table__body-cell" data-label="Valoare anterioară">${changeValue(r.before, { before: true, redacted: r.redacted })}</td>
                <td class="table__body-cell" data-label="Valoare nouă">${changeValue(r.after, { redacted: r.redacted })}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  /* the field changes of a configuration Istoric entry: its `changes`, else the „Câmp: vechi → nou · …” of its detail;
     publish / restore entries change no field of the object (they record a version) → none */
  const changesOf = (entry = {}) => (/^(Publicarea|Restaurarea|Publicare respinsă)/.test(entry.event || entry.type || "") ? []
    : entry.changes || String(entry.detail || "").split(" · ").map((part) => /^(.+?): (.+?) → (.+)$/.exec(part)).filter(Boolean).map(([, field, before, after]) => ({ field, before, after })));

  window.GEAPEventTimeline = { html, listHtml, TONES, audit, contextOf, log, journal, changesHtml, changeRows, changesOf, REDACTED };
})();
