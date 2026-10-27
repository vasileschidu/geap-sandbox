/* ==========================================================================
   GEAPActView — the act's two dialogs, shared by the public RAP act profile (rap-evo/) and the EVO
   Cabinet act profile (cabinet-evo/, „Actele mele permisive”) — 2026-10-17 alignment: the same permit
   seen by the public and by its owner opens the same dialogs.

   1. „Vizualizare act” (US-162 AC-12 / US-163) = the BO detail modal (#dosar-detail-modal markup:
      library .modal.modal--md + .e-permits-detail-modal, css/bo-profile-parts.css): „Date generale”
      card, the act's configured fields = one BO section per configured group (fieldsHtml below), the
      read-only note; footer „Generează documentul” (opens the A4 form, opt-in) · Închide.
   2. „Forma de tipar a actului” (US-143) = the FO / Cabinet document modal (grey canvas + A4 page,
      MDocs on demand: loading → page | AC-10/11/12 errors), paginated and fitted by GEAPDocPreview
      (js/doc-preview.js), „Imprimă” prints the pages only. Opened from 1 › Generează documentul; closing it comes
      back to 1.
   Markup and class names are the RAP ones (rap-act-*, data-rap-*: moved here unchanged from
   rap-evo.js, so the RAP dialogs stay byte-identical); the CSS is css/act-view.css.

   Usage: const view = GEAPActView.create({ copyHtml, onCopy, copySelector, bodyOpenClass, documentTitle?, onDocumentDownload?, footer? });
          footer (data-footer-v1, 2026-10-27): "generate" (default, Cabinet) = „Generează documentul” → the A4 · Închide;
          "download" (RAP: no MDocs document there, raw data only) = „Descarcă” (icon-export) → a client-side CSV of
          the panel's data (UTF-8 BOM, „;”, section · label · value, file `<număr>.csv`, no toast) · Închide.
          documentTitle / onDocumentDownload (act-profile-v1, EVO Cabinet): the document dialog's title and a
          „Descarcă” (icon-export) in its footer instead of „Imprimă” — defaults = the RAP dialog, unchanged.
          view.openData(act, opener) · view.openDocument(act, opener) · view.closeData() · view.closeDocument()
   act (view model, the page maps its own data):
     { id, name, number, status, tone, watermark, authority, office,
       beneficiary: { name, person, idType, id },
       tacitDate, tacitBadge, issuedDate, validFrom, statusDates: [[label, value]], validUntil,
       paperNumber, printedNumber, groups, url,
       gridDisplay? (records-v1, default since 2026-10-27: grids render as records; "table" = opt-out for the whole modal, see fieldsHtml),
       signed? (doc-viewer-v1: false = a paper act → no signature tray under the page; default signed),
       source? (the A4 footer's „Generat prin MDocs · <source>”, default „Registrul actelor permisive”) }
   groups = the act's configured fields (service passport, 2026-10-19 — Figma comment EVO-WEB-3.0
     20607:34846): an ordered list [{ title, items | fields | rows }], an item = [label, value] |
     { label, value } (text, date, number with unit, or an array = a list of values) | a grid
     { label, columns: [label | { label, type: "number" }], rows: [[…]] }; a flat item list = one
     untitled group (old data keeps working). normalizeFields() reads every shape.
   Configured fields render through ONE renderer, also used outside the dialogs (Cabinet „Solicitările
   mele” › Act / Decizie): GEAPActView.fieldsHtml(groups, { section, untitled }) — each group = a BO
   section over a grey card; > 10 items → first 8 + „Arată toate câmpurile (N)”; a grid = a registry-look
   table in its own horizontal scroll (first column pinned), > 5 rows → first 5 + „Arată toate (N)”;
   ≤ 760 the rows become stacked mini-cards. On the A4 form a grid = a plain bordered table that
   breaks across pages (the header row repeats), every row.
   Demo: ?mdocs=incarcare (stays loading) · indisponibil (AC-10) · date (AC-11) · sablon (AC-12).
   ========================================================================== */
(() => {
  "use strict";

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const MDOCS_DELAY = 900;
  const MDOCS_UNAVAILABLE = "Documentul nu poate fi generat momentan. Vă rugăm să încercați mai târziu.";
  const MDOCS_ERRORS = {
    indisponibil: MDOCS_UNAVAILABLE,
    sablon: MDOCS_UNAVAILABLE,
    date: "Datele actului nu sunt disponibile momentan. Vă rugăm să încercați mai târziu."
  };
  const ACT_FIELDS_SHOWN = 8;
  const ACT_FIELDS_LIMIT = 10;
  const ACT_TABLE_ROWS_SHOWN = 5;
  const ACT_RECORDS_SHOWN = 3;

  /* ---- configured act fields: data model + the one renderer (see the header) ---- */
  const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== "";
  const normItem = (item) => {
    if (Array.isArray(item)) return { label: String(item[0] ?? ""), value: item[1] };
    if (!item || typeof item !== "object") return null;
    if (Array.isArray(item.columns)) {
      return {
        label: String(item.label ?? ""),
        columns: item.columns.map((column) => (typeof column === "string"
          ? { label: column, type: "text" }
          : { label: String(column?.label ?? ""), type: ["number", "short", "wide"].includes(column?.type) ? column.type : "text" })),
        rows: (item.rows || []).filter((row) => Array.isArray(row) && row.some(isFilled)),
        display: item.display === "table" ? "table" : null, /* records are the default; "table" = opt-out for huge datasets */
        titleColumns: Array.isArray(item.titleColumns)
          ? item.titleColumns.map((entry) => (typeof entry === "number" ? { col: entry, prefix: "" } : { col: Number(entry?.col), prefix: String(entry?.prefix ?? "") }))
            .filter((entry) => Number.isInteger(entry.col) && entry.col >= 0 && entry.col < item.columns.length)
          : null,
        numberColumn: Number.isInteger(item.numberColumn) ? item.numberColumn : null,
        numbered: item.numbered !== false
      };
    }
    return { label: String(item.label ?? ""), value: item.value };
  };
  const hasContent = (item) => (item.columns
    ? item.rows.length > 0
    : Array.isArray(item.value) ? item.value.some(isFilled) : isFilled(item.value));
  const isGroup = (entry) => Boolean(entry) && !Array.isArray(entry) && typeof entry === "object"
    && !("label" in entry) && !Array.isArray(entry.columns)
    && [entry.items, entry.fields, entry.rows].some(Array.isArray);

  function normalizeFields(input) {
    const list = Array.isArray(input) ? input : [];
    const groups = list.length && list.every(isGroup)
      ? list.map((group) => ({ title: group.title || null, items: group.items || group.fields || group.rows }))
      : [{ title: null, items: list }];
    return groups
      .map((group) => ({ title: group.title, items: group.items.map(normItem).filter((item) => item && hasContent(item)) }))
      .filter((group) => group.items.length);
  }

  let fieldsUid = 0;
  const toggleHtml = (controls, total, more, less) => `
    <div class="e-permits-act-fields__toggle"><button class="btn btn-text-primary btn-sm btn-rounded" type="button" aria-expanded="false" aria-controls="${controls}" data-act-fields-more data-more="${escapeHtml(more)}" data-less="${escapeHtml(less)}">${escapeHtml(more)}</button></div>`;

  const fieldValueHtml = (value) => (Array.isArray(value)
    ? `<ul class="e-permits-act-fields__list">${value.filter(isFilled).map((part) => `<li>${escapeHtml(part)}</li>`).join("")}</ul>`
    : escapeHtml(value));

  const fieldRowHtml = (item, extra) => `
      <div class="e-permits-dosar-profil__row${extra}">
        <span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${escapeHtml(item.label)}</span>
        <span class="e-permits-dosar-profil__row-value">${fieldValueHtml(item.value)}</span>
      </div>`;

  /* a grid: registry-look table (header row, numbers right-aligned, first column pinned,
     its own horizontal scroll); every cell also carries its column label, shown only when ≤ 760 turns the
     rows into stacked mini-cards */
  /* column type → class: number = right-aligned figures; short (a letter, a code) hugs its content; wide (the long text)
     takes all the remaining width (act-view.css, ≥ 761); default text = the old standard width */
  const colClass = (column) => (column.type === "number" ? "is-number" : `is-text${column.type === "short" ? " is-short" : column.type === "wide" ? " is-wide" : ""}`);
  const tableFieldHtml = (item, extra) => {
    const id = `act-fields-${++fieldsUid}`;
    const collapsible = item.rows.length > ACT_TABLE_ROWS_SHOWN;
    const cell = (column, value) => `<td class="${colClass(column)}"><span class="e-permits-act-fields__cell-label">${escapeHtml(column.label)}</span><span class="e-permits-act-fields__cell-value">${isFilled(value) ? escapeHtml(value) : "—"}</span></td>`;
    const rows = item.rows.map((row, index) => {
      const classes = [
        collapsible && index >= ACT_TABLE_ROWS_SHOWN ? "e-permits-act-fields__more-row" : "",
        collapsible && index === ACT_TABLE_ROWS_SHOWN - 1 ? "e-permits-act-fields__edge-row" : ""
      ].filter(Boolean).join(" ");
      return `<tr${classes ? ` class="${classes}"` : ""}>${item.columns.map((column, col) => cell(column, row[col])).join("")}</tr>`;
    }).join("");
    return `
      <div class="e-permits-act-fields__table-field${extra}">
        <p class="e-permits-act-fields__table-label" id="${id}-label">${escapeHtml(item.label)}</p>
        <div class="e-permits-act-fields__table-wrap" role="region" aria-labelledby="${id}-label">
          <table class="e-permits-act-fields__table${collapsible ? " is-collapsed" : ""}" id="${id}" aria-labelledby="${id}-label">
            <thead><tr>${item.columns.map((column) => `<th scope="col" class="${colClass(column)}"><span>${escapeHtml(column.label)}</span></th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${collapsible ? toggleHtml(id, item.rows.length, `Arată toate (${item.rows.length})`, "Arată mai puține") : ""}
      </div>`;
  };

  /* a grid as RECORDS (records-v1, PO: „too many data types — rows, tables, grey containers”): no table — each grid row
     = a bounded block inside the same grey card: sub-heading (the first column's value) + a thin left rule + the other
     columns as key / value rows. Records collapse independently: > 3 in a run → first 3 + „Arată toate (N)”.
     Optional (records-v2): titleColumns [col | { col, prefix }] = the title is those columns joined by „ · ” (e.g.
     „Parcela 5 · O · parchet 1”), numberColumn = a column whose value replaces the automatic „1. ” number (source
     numbering with gaps); both columns leave the key / value rows; numbered: false = no number (the title already names the record). Default: first column, automatic numbers.
     The A4 form keeps its table (docGridRows). */
  const recordsFieldHtml = (item, extra) => {
    const id = `act-fields-${++fieldsUid}`;
    const collapsible = item.rows.length > ACT_RECORDS_SHOWN;
    const titleParts = item.titleColumns && item.titleColumns.length ? item.titleColumns : [{ col: 0, prefix: "" }];
    const used = new Set(titleParts.map((part) => part.col));
    if (item.numberColumn !== null && item.numberColumn < item.columns.length) used.add(item.numberColumn);
    const records = item.rows.map((row, index) => {
      const rows = item.columns
        .map((column, col) => ({ label: column.label, value: row[col], col }))
        .filter((entry) => !used.has(entry.col) && isFilled(entry.value))
        .map((entry) => fieldRowHtml(entry, ""))
        .join("");
      const title = titleParts.filter((part) => isFilled(row[part.col])).map((part) => `${part.prefix}${row[part.col]}`).join(" · ");
      const number = item.numberColumn !== null && isFilled(row[item.numberColumn])
        ? `${row[item.numberColumn]}. `
        : item.numbered && item.rows.length > 1 ? `${index + 1}. ` : "";
      return `
          <li class="e-permits-act-fields__record${collapsible && index >= ACT_RECORDS_SHOWN ? " e-permits-act-fields__record-more" : ""}">
            <p class="e-permits-act-fields__record-title">${escapeHtml(number)}${title ? escapeHtml(title) : "—"}</p>
            ${rows ? `<div class="e-permits-act-fields__record-rows">${rows}</div>` : ""}
          </li>`;
    }).join("");
    return `
      <div class="e-permits-act-fields__records${extra}">
        <p class="e-permits-act-fields__table-label" id="${id}-label">${escapeHtml(item.label)}</p>
        <ul class="e-permits-act-fields__record-list${collapsible ? " is-collapsed" : ""}" id="${id}" aria-labelledby="${id}-label">${records}</ul>
        ${collapsible ? toggleHtml(id, item.rows.length, `Arată toate (${item.rows.length})`, "Arată mai puține") : ""}
      </div>`;
  };

  const defaultSection = (title, body) => `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
        ${body}
      </section>`;

  /* groups → one BO section each, in the configured order; an untitled group takes `untitled` when it is the
     only one, „Alte câmpuri ale actului” next to titled groups */
  function fieldsHtml(input, { section = defaultSection, untitled = "Câmpuri specifice actului", grids = null } = {}) {
    /* records = default; a grid (item.display) or the whole modal (grids) can opt out with "table" */
    const groups = normalizeFields(input);
    return groups.map((group, index) => {
      const id = `act-fields-${++fieldsUid}`;
      const collapsible = group.items.length > ACT_FIELDS_LIMIT;
      const items = group.items.map((item, at) => {
        const extra = collapsible && at >= ACT_FIELDS_SHOWN ? " e-permits-act-fields__more" : "";
        if (!item.columns) return fieldRowHtml(item, extra);
        return (item.display || grids) === "table" ? tableFieldHtml(item, extra) : recordsFieldHtml(item, extra);
      }).join("");
      const body = `<div class="e-permits-dosar-profil__card e-permits-act-fields${collapsible ? " is-collapsed" : ""}" id="${id}" data-act-fields>${items}${collapsible ? toggleHtml(id, group.items.length, `Arată toate câmpurile (${group.items.length})`, "Arată mai puține câmpuri") : ""}</div>`;
      const title = group.title || (groups.length > 1 ? "Alte câmpuri ale actului" : untitled);
      return section(title, body, index);
    }).join("");
  }

  /* „Arată toate” / „Arată mai puține” for groups and grids, wherever they are rendered */
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act-fields-more]");
    if (!button) return;
    const target = document.getElementById(button.getAttribute("aria-controls"));
    if (!target) return;
    const collapsed = target.classList.toggle("is-collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.textContent = collapsed ? button.dataset.more : button.dataset.less;
    button.dispatchEvent(new CustomEvent("act-fields-toggle", { bubbles: true }));
  });

  /* the A4 form: a grid = rows of the page's flowing table (each row a one-row bordered table with the same
     column units: first column 3, the others 2), so GEAPDocPreview can break it across pages and repeat its
     header row; the label + header rows are kept with the next row */
  let gridUid = 0;
  const docGridRows = (item) => {
    const id = `g${++gridUid}`;
    const units = item.columns.map((column, index) => (index === 0 ? 3 : 2));
    const cols = `<colgroup>${"<col>".repeat(units.reduce((sum, unit) => sum + unit, 0))}</colgroup>`;
    const line = (cells, tag) => `<td colspan="2" class="e-permits-doc-page__grid-cell"><table class="e-permits-doc-page__grid">${cols}<tbody><tr>${cells.map((value, index) => `<${tag} colspan="${units[index]}"${item.columns[index].type === "number" ? ' class="is-number"' : ""}${tag === "th" ? ' scope="col"' : ""}>${isFilled(value) ? escapeHtml(value) : "—"}</${tag}>`).join("")}</tr></tbody></table></td>`;
    return [
      `<tr class="e-permits-doc-page__keep e-permits-doc-page__grid-label"><td colspan="2">${escapeHtml(item.label)}</td></tr>`,
      `<tr class="e-permits-doc-page__keep e-permits-doc-page__grid-head" data-doc-grid="${id}">${line(item.columns.map((column) => column.label), "th")}</tr>`,
      ...item.rows.map((row) => `<tr class="e-permits-doc-page__grid-row" data-doc-grid-of="${id}">${line(item.columns.map((column, index) => row[index]), "td")}</tr>`)
    ].join("");
  };

  /* copy: the shared component (js/copy-value.js) handles its own clicks in the capture phase — onCopy /
     copySelector stay for old callers and never fire for .copy-value buttons */
  function create({ sprite = "../assets/icons/sprite.svg", copyHtml = (value) => window.GEAPCopyValue?.html(value, { label: `Copiază numărul actului ${value}` }) || escapeHtml(value), onCopy = () => {}, copySelector = "[data-copy-value]", bodyOpenClass = "", documentTitle = "Forma de tipar a actului", onDocumentDownload = null, footer = "generate" } = {}) {
    const icon = (name, className = "icon") => `
    <svg class="${className}" aria-hidden="true"><use href="${sprite}#icon-${name}"></use></svg>
  `;
    /* a Valabil act approved tacitly (`tacitBadge`) shows ONE tag, „Aprobare tacită” (it implies valid; screen readers
       hear „(valabil)”) — tacit-tag-v1; the date row keeps only the date */
    const statusTag = (act) => (act.tacitBadge
      ? '<span class="status-tag status-tag--brand is-subtle status-tag--small">Aprobare tacită<span class="u-visually-hidden"> (valabil)</span></span>'
      : `<span class="${window.GEAPTag.cls(act.tone)}">${escapeHtml(act.status)}</span>`);
    const tacitDateRow = (act) => (act.tacitDate ? [["Data aprobării tacite", escapeHtml(act.tacitDate)]] : []);

    const actModal = { overlay: null, opener: null, run: 0, record: null };
    const actData = { overlay: null, record: null, opener: null, parked: false };

    /* the MDocs page = the standard template of an act permisiv (machete-mdocs-v1, US-310 on the US-306 macheta —
       GEAPDocPreview.mdocsHtml): header with the issuing authority + subdivision and their contacts, the act's name,
       „Nr. P-xxxx/anul”, „Eliberat: … · Valabil până la …”, the public fields + the act's configured fields (PF: the
       anonymised name only, never an IDNP — US-145), „Semnat electronic de (funcția) (nume)” per signer (`act.signers`,
       default the authority head), the footer with the QR of the act's permanent RAP address (`act.registryUrl` ||
       `act.url`) + the legal block, on every page; a long act continues on more A4 pages with the simplified header */
    const renderActPage = (act) => {
      const person = act.beneficiary.person;
      const row = ([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
      const itemRow = (item) => (item.columns
        ? docGridRows(item)
        : `<tr><td>${escapeHtml(item.label)}</td><td>${Array.isArray(item.value) ? item.value.filter(isFilled).map(escapeHtml).join("<br>") : escapeHtml(item.value)}</td></tr>`);
      const rowsHtml = [
        ...normalizeFields(act.groups).map((group) => `${group.title ? `<tr class="e-permits-doc-page__group"><th colspan="2" scope="colgroup">${escapeHtml(group.title)}</th></tr>` : ""}${group.items.map(itemRow).join("")}`),
        ...[
          ...(act.tacitDate ? [["Data aprobării tacite", act.tacitDate]] : []),
          ["Valabil din data", act.validFrom],
          ...(act.statusDates || []),
          ["Numărul dosarului electronic", act.paperNumber],
          ["Seria și nr. documentului tipărit", act.printedNumber]
        ].filter(([, value]) => value).map(row)
      ].join("");
      const watermark = act.watermark
        ? `<span class="rap-act-doc__watermark rap-act-doc__watermark--${act.tone}" aria-hidden="true"><span>${escapeHtml(act.status.toLocaleUpperCase("ro"))}</span></span>`
        : "";
      return window.GEAPDocPreview?.mdocsHtml({
        type: "act",
        pageClass: "rap-act-doc",
        repeatHtml: watermark,
        authority: act.authority,
        office: act.office,
        title: act.name,
        number: act.number,
        date: act.issuedDate,
        validUntil: act.validUntil,
        /* mdocs-system-v1: the beneficiary = the party block (PF: the anonymised name only, US-145); the act's status at
           generation = the title block's chip (the watermark still marks a non-valid act across the page) */
        parties: [{ role: "Beneficiar", name: act.beneficiary.name, lines: person ? [] : [[act.beneficiary.idType, act.beneficiary.id].filter(Boolean).join(" ")] }],
        status: act.tacitBadge ? { label: "Aprobare tacită", tone: "brand" } : act.status ? { label: act.status, tone: act.tone } : null,
        rowsHtml,
        closingHtml: '<p class="rap-act-doc__closing">Actul permisiv se eliberează pentru desfășurarea activității indicate, în condițiile legii.</p>',
        signers: act.signers,
        /* the QR link = the act's public RAP address (rap.gov.md/act/<number slug>), never the prototype's own URL */
        qrUrl: act.registryUrl || undefined
      }) || "";
    };

    const paginateActDoc = (canvas) => window.GEAPDocPreview?.paginate(canvas, { repeat: ".rap-act-doc__watermark" });
    const fitActPage = () => window.GEAPDocPreview?.fit(actModal.overlay?.querySelector("[data-rap-act-canvas]"));

    /* view = loading | ready | <error key> */
    const renderActModalBody = (act, view) => {
      const body = actModal.overlay.querySelector("[data-rap-act-body]");
      const footer = actModal.overlay.querySelector("[data-rap-act-footer]");
      const ready = view === "ready";
      body.setAttribute("aria-busy", String(view === "loading"));
      /* doc-viewer-v1 (2026-10-21, GEAP 2.0 11366:6892): the act is a generated document → under the page ONE signature
         tray (badge above „MSign · <issuing authority> · <issue date>”); a paper act (`signed: false`) has none */
      const signature = act.signed === false ? "" : window.GEAPDocPreview?.signatureHtml({ by: act.authority, at: act.issuedDate, sprite }) || "";
      body.innerHTML = ready
        ? `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas" data-rap-act-canvas role="document" aria-label="${escapeHtml(act.name)}, nr. ${escapeHtml(act.number)}">${renderActPage(act)}</div>${signature}`
        : `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas e-permits-doc-peek__canvas--state">${view === "loading"
          ? window.GEAPEmptyState.render({ loading: true, bare: true, title: "Se generează documentul", text: "MDocs pregătește actul. Poate dura câteva secunde." })
          : window.GEAPEmptyState.render({ bare: true, icon: "circle-error", text: MDOCS_ERRORS[view] || MDOCS_UNAVAILABLE })}</div>`;
      const secondary = onDocumentDownload
        ? `<button class="btn btn-neutral btn-rounded" type="button" data-rap-act-download>${icon("export", "icon small")}<span>Descarcă</span></button>`
        : `<button class="btn btn-neutral btn-rounded rap-act-modal__print" type="button" data-rap-act-print>${window.GEAPDocPreview?.printIcon("icon") || ""}<span>Imprimă</span></button>`;
      footer.innerHTML = `
      ${ready ? secondary : ""}
      <button class="btn btn-primary btn-rounded" type="button" data-rap-act-close>Închide</button>`;
      if (ready) {
        paginateActDoc(body.querySelector("[data-rap-act-canvas]"));
        fitActPage();
      }
    };

    /* ---- Long names in a dialog subtitle: the name clamped to 1 line (2 on phones) and, only when it
       really overflows, ONE toggle button „Mai mult” / „Mai puțin” (aria-expanded) ---- */
    const actSubtitleHtml = (act, className) => `
    <p class="${className} rap-act-subtitle" data-rap-subtitle>
      <span class="rap-act-subtitle__name"><span class="rap-act-subtitle__text">${escapeHtml(act.name)}</span></span>
    </p>`;

    const syncClamps = (root) => {
      root?.querySelectorAll("[data-rap-subtitle]").forEach((subtitle) => {
        const name = subtitle.querySelector(".rap-act-subtitle__name");
        if (!name || name.getAttribute("aria-expanded") === "true" || !name.offsetParent) return;
        const text = name.querySelector(".rap-act-subtitle__text");
        name.classList.add("is-measuring");
        const overflows = text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1;
        name.classList.remove("is-measuring");
        const isToggle = name.tagName === "BUTTON";
        if (overflows === isToggle) return;
        const next = document.createElement(overflows ? "button" : "span");
        next.className = "rap-act-subtitle__name";
        next.append(text);
        if (overflows) {
          next.type = "button";
          next.dataset.rapClampToggle = "";
          next.setAttribute("aria-expanded", "false");
          next.insertAdjacentHTML("beforeend", '<span class="rap-act-subtitle__more" aria-hidden="true">Mai mult</span>');
        }
        name.replaceWith(next);
      });
    };

    const toggleClamp = (button) => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      button.querySelector(".rap-act-subtitle__more").textContent = open ? "Mai puțin" : "Mai mult";
      if (!open) syncClamps(button.closest("[data-rap-subtitle]").parentElement);
    };

    const trapTab = (overlay, event) => {
      const focusables = [...overlay.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    /* the BO syncModalScrollEdges: a hairline under the header / over the footer while the body scrolls */
    const syncActDataEdges = () => {
      const modal = actData.overlay?.querySelector(".modal");
      const content = modal?.querySelector(".modal-content");
      if (!content) return;
      const scrollable = content.scrollHeight > content.clientHeight + 1;
      modal.classList.toggle("has-scroll-above", scrollable && content.scrollTop > 0);
      modal.classList.toggle("has-scroll-below", scrollable && content.scrollTop + content.clientHeight < content.scrollHeight - 1);
    };

    /* docked-v1: desktop ≥ 1024 = a right-docked panel over the visible page (no scrim, no focus trap, aria-modal off) */
    const dockedQuery = window.matchMedia("(min-width: 1024px)");
    const isDocked = () => dockedQuery.matches;
    const syncDocked = () => {
      actData.overlay?.querySelector(".modal")?.setAttribute("aria-modal", String(!isDocked()));
    };
    const onDockedEscape = (event) => {
      if (event.key !== "Escape" || !isDocked() || (actModal.overlay && !actModal.overlay.hidden)) return;
      closeActData();
    };

    const showActData = () => {
      const overlay = actData.overlay;
      syncDocked();
      document.addEventListener("keydown", onDockedEscape);
      actData.parked = false;
      overlay.classList.add("is-active");
      overlay.querySelector(".modal").classList.add("is-active");
      overlay.setAttribute("aria-hidden", "false");
      syncActDataEdges();
    };

    const closeActData = ({ restoreFocus = true } = {}) => {
      const overlay = actData.overlay;
      actData.parked = false;
      if (!overlay?.classList.contains("is-active")) return;
      overlay.classList.remove("is-active");
      overlay.querySelector(".modal").classList.remove("is-active");
      overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onDockedEscape);
      if (restoreFocus && actData.opener?.isConnected) actData.opener.focus();
    };

    /* toData: opened from „Vizualizare act” › Generează documentul → closing goes back to that dialog */
    const closeActDocument = ({ toData = true } = {}) => {
      if (!actModal.overlay || actModal.overlay.hidden) return;
      actModal.run += 1;
      actModal.overlay.hidden = true;
      if (bodyOpenClass) document.body.classList.remove(bodyOpenClass);
      actModal.opener?.removeAttribute("aria-disabled");
      if (toData && actData.parked) {
        showActData();
        if (actModal.opener?.isConnected) actModal.opener.focus();
        return;
      }
      actData.parked = false;
      if (actModal.opener?.isConnected) actModal.opener.focus();
    };

    const ensureActModal = () => {
      if (actModal.overlay) return actModal.overlay;
      const overlay = document.createElement("div");
      overlay.className = "e-permits-fo-doc-modal-overlay rap-act-modal";
      overlay.hidden = true;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "rap-act-modal-title");
      overlay.dataset.rapActModal = "";
      document.body.append(overlay);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay || event.target.closest("[data-rap-act-close]")) {
          closeActDocument();
          return;
        }
        if (event.target.closest("[data-rap-act-print]")) window.GEAPDocPreview?.print(overlay.querySelector("[data-rap-act-canvas]"));
        if (event.target.closest("[data-rap-act-download]") && actModal.record) onDocumentDownload?.(actModal.record);
        const copyButton = event.target.closest(copySelector);
        if (copyButton) onCopy(copyButton, event);
        const clamp = event.target.closest("[data-rap-clamp-toggle]");
        if (clamp) toggleClamp(clamp);
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeActDocument();
          return;
        }
        if (event.key === "Tab") trapTab(overlay, event);
      });
      if ("ResizeObserver" in window) new ResizeObserver(() => { fitActPage(); syncClamps(overlay); }).observe(overlay);
      actModal.overlay = overlay;
      return overlay;
    };

    const openActDocument = (act, opener) => {
      const overlay = ensureActModal();
      actModal.opener = opener || document.activeElement;
      actModal.record = act;
      const run = ++actModal.run;
      overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal rap-act-modal__dialog">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 class="e-permits-fo-doc-modal__title" id="rap-act-modal-title">${escapeHtml(documentTitle)}</h2>
            ${actSubtitleHtml(act, "e-permits-fo-doc-modal__subtitle")}
          </div>
          <button class="e-permits-fo-doc-modal__close" type="button" aria-label="Închide" data-rap-act-close>${icon("cross-large")}</button>
        </div>
        <div class="rap-act-modal__body" data-rap-act-body aria-live="polite"></div>
        <div class="e-permits-fo-doc-modal__footer" data-rap-act-footer></div>
      </div>`;
      renderActModalBody(act, "loading");
      overlay.hidden = false;
      if (bodyOpenClass) document.body.classList.add(bodyOpenClass);
      syncClamps(overlay);
      /* AC-03: no second request while MDocs works (the dialog covers the page; the button says so too) */
      opener?.setAttribute("aria-disabled", "true");
      overlay.querySelector(".e-permits-fo-doc-modal__close").focus();
      const demo = new URLSearchParams(window.location.search).get("mdocs");
      if (demo === "incarcare") return;
      window.setTimeout(() => {
        if (run !== actModal.run) return;
        renderActModalBody(act, demo && MDOCS_ERRORS[demo] ? demo : "ready");
        opener?.removeAttribute("aria-disabled");
      }, MDOCS_DELAY);
    };

    const actDataRow = (label, valueHtml, extra = "") => `
      <div class="e-permits-dosar-profil__row${extra}">
        <span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${escapeHtml(label)}</span>
        <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
      </div>`;

    const renderActData = (act) => {
      const general = [
        ["Autoritatea emitentă", escapeHtml(act.authority)],
        ["Subdiviziunea", act.office ? escapeHtml(act.office) : ""],
        ["Beneficiar", escapeHtml(act.beneficiary.name)],
        ["Numărul actului permisiv", copyHtml(act.number)],
        ["Stare", statusTag(act)],
        ...tacitDateRow(act),
        ["Data eliberării", escapeHtml(act.issuedDate)],
        ["Valabil din data", escapeHtml(act.validFrom)],
        ...(act.statusDates || []).map(([label, value]) => [label, escapeHtml(value)]),
        ["Data expirării", act.validUntil ? escapeHtml(act.validUntil) : ""]
      ].filter(([, value]) => value);
      return `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Date generale</h2>
        <div class="e-permits-dosar-profil__card">${general.map(([label, value]) => actDataRow(label, value)).join("")}</div>
      </section>
      ${fieldsHtml(act.groups, { grids: act.gridDisplay })}
      <div class="info-box info-box--neutral e-permits-info-note e-permits-readonly-note">
        <span class="info-box__icon">${icon("shield")}</span>
        <div class="info-box__content"><p>Datele personale sunt mascate conform legislației. Sunt afișate doar câmpurile publice ale actului.</p></div>
      </div>`;
    };

    /* RAP „Descarcă”: the panel's data as a CSV (section;label;value) — Excel-friendly (BOM, „;”); a list value = one
       line per part; a record = one line per field, label prefixed by the record title; masked values stay masked */
    const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const actDataCsv = (act) => {
      const lines = [["Secțiune", "Câmp", "Valoare"]];
      const general = [
        ["Autoritatea emitentă", act.authority], ["Subdiviziunea", act.office], ["Beneficiar", act.beneficiary.name],
        ["Numărul actului permisiv", act.number], ["Stare", act.status], ...tacitDateRow(act).map(([label, value]) => [label, act.tacitDate]),
        ["Data eliberării", act.issuedDate], ["Valabil din data", act.validFrom], ...(act.statusDates || []), ["Data expirării", act.validUntil]
      ].filter(([, value]) => isFilled(value));
      general.forEach(([label, value]) => lines.push(["Date generale", label, value]));
      normalizeFields(act.groups).forEach((group, index, all) => {
        const section = group.title || (all.length > 1 ? "Alte câmpuri ale actului" : "Câmpuri specifice actului");
        group.items.forEach((item) => {
          if (!item.columns) {
            (Array.isArray(item.value) ? item.value.filter(isFilled) : [item.value]).forEach((part) => lines.push([section, item.label, part]));
            return;
          }
          const titleParts = item.titleColumns && item.titleColumns.length ? item.titleColumns : [{ col: 0, prefix: "" }];
          const used = new Set(titleParts.map((part) => part.col));
          if (item.numberColumn !== null && item.numberColumn < item.columns.length) used.add(item.numberColumn);
          item.rows.forEach((row, at) => {
            const title = titleParts.filter((part) => isFilled(row[part.col])).map((part) => `${part.prefix}${row[part.col]}`).join(" · ");
            const number = item.numberColumn !== null && isFilled(row[item.numberColumn]) ? `${row[item.numberColumn]}. ` : item.numbered && item.rows.length > 1 ? `${at + 1}. ` : "";
            item.columns.forEach((column, col) => {
              if (!used.has(col) && isFilled(row[col])) lines.push([section, `${item.label} · ${number}${title} · ${column.label}`, row[col]]);
            });
          });
        });
      });
      return `\uFEFF${lines.map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
    };
    const downloadActData = (act) => {
      const url = URL.createObjectURL(new Blob([actDataCsv(act)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(act.number).replace(/[\\/:*?"<>|]+/g, "-")}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const dataShellHtml = () => `
      <div class="modal modal--md e-permits-passport__modal e-permits-case-modal e-permits-detail-modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="rap-act-data-title">
        <button type="button" class="modal-close" aria-label="Închide" data-rap-data-close>
          <span class="d-inline-flex">${icon("cross-large", "icon small")}</span>
        </button>
        <div class="modal--header" data-rap-data-header></div>
        <div class="modal-content" data-rap-data-body></div>
        <div class="modal--footer">
          <div class="modal-buttons">
            ${footer === "download"
              ? `<button class="btn btn-neutral btn-rounded" type="button" data-rap-data-download>${icon("export", "icon small")}<span>Descarcă</span></button>`
              : `<button class="btn btn-neutral btn-rounded" type="button" aria-haspopup="dialog" data-rap-data-generate>${icon("document", "icon small")}<span>Generează documentul</span></button>`}
            <button class="btn btn-primary btn-rounded" type="button" data-rap-data-close>Închide</button>
          </div>
        </div>
      </div>`;

    /* the modal's static markup (shell + header + body), for side-by-side previews (rap-evo/act-records-preview.html) */
    const dataPreviewHtml = (act) => {
      const shell = document.createElement("div");
      shell.innerHTML = dataShellHtml();
      shell.querySelector("[data-rap-data-header]").innerHTML = `
      <h2 class="modal--header-title">Vizualizare act</h2>
      ${actSubtitleHtml(act, "e-permits-passport__modal-subtitle")}`;
      shell.querySelector("[data-rap-data-body]").innerHTML = renderActData(act);
      return shell.innerHTML;
    };

    const ensureActData = () => {
      if (actData.overlay) return actData.overlay;
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay rap-act-data e-permits-act-data--docked";
      overlay.setAttribute("aria-hidden", "true");
      overlay.dataset.rapActData = "";
      overlay.innerHTML = dataShellHtml();
      document.body.append(overlay);
      overlay.addEventListener("click", (event) => {
        if ((event.target === overlay && !isDocked()) || event.target.closest("[data-rap-data-close]")) {
          closeActData();
          return;
        }
        const copyButton = event.target.closest(copySelector);
        if (copyButton) {
          onCopy(copyButton, event);
          return;
        }
        const clamp = event.target.closest("[data-rap-clamp-toggle]");
        if (clamp) {
          toggleClamp(clamp);
          syncActDataEdges();
          return;
        }
        if (event.target.closest("[data-rap-data-download]") && actData.record) {
          downloadActData(actData.record);
          return;
        }
        const download = event.target.closest("[data-rap-data-generate]");
        if (download && actData.record && download.getAttribute("aria-disabled") !== "true") {
          closeActData({ restoreFocus: false });
          actData.parked = true;
          openActDocument(actData.record, download);
        }
      });
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeActData();
          return;
        }
        if (event.key === "Tab" && !isDocked()) trapTab(overlay, event);
      });
      dockedQuery.addEventListener?.("change", syncDocked);
      overlay.querySelector(".modal-content").addEventListener("scroll", syncActDataEdges, { passive: true });
      overlay.addEventListener("act-fields-toggle", syncActDataEdges);
      if ("ResizeObserver" in window) new ResizeObserver(() => { syncClamps(overlay); syncActDataEdges(); }).observe(overlay.querySelector(".modal"));
      actData.overlay = overlay;
      return overlay;
    };

    const openActData = (act, opener) => {
      const overlay = ensureActData();
      actData.record = act;
      actData.opener = opener || document.activeElement;
      overlay.querySelector("[data-rap-data-header]").innerHTML = `
      <h2 class="modal--header-title" id="rap-act-data-title">Vizualizare act</h2>
      ${actSubtitleHtml(act, "e-permits-passport__modal-subtitle")}`;
      overlay.querySelector("[data-rap-data-body]").innerHTML = renderActData(act);
      overlay.querySelector("[data-rap-data-body]").scrollTop = 0;
      showActData();
      syncClamps(overlay);
      overlay.querySelector(".modal").focus();
    };

    return {
      openData: openActData,
      dataPreviewHtml,
      openDocument: openActDocument,
      closeData: closeActData,
      closeDocument: closeActDocument,
      isOpen: () => Boolean(actData.overlay?.classList.contains("is-active") || (actModal.overlay && !actModal.overlay.hidden))
    };
  }

  window.GEAPActView = { create, normalizeFields, fieldsHtml };
})();
