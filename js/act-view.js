/* ==========================================================================
   GEAPActView — the act's two dialogs, shared by the public RAP act profile (rap-evo/) and the EVO
   Cabinet act profile (cabinet-evo/, „Actele mele permisive”) — 2026-10-17 alignment: the same permit
   seen by the public and by its owner opens the same dialogs.

   1. „Vizualizare act” (US-162 AC-12 / US-163) = the BO detail modal (#dosar-detail-modal markup:
      library .modal.modal--md + .e-permits-detail-modal, css/bo-profile-parts.css): „Date generale”
      card, the act's configured fields = one BO section per configured group (fieldsHtml below), the
      read-only note; footer Descarcă · Închide.
   2. „Forma de tipar a actului” (US-143) = the FO / Cabinet document modal (grey canvas + A4 page,
      MDocs on demand: loading → page | AC-10/11/12 errors), paginated and fitted by GEAPDocPreview
      (js/doc-preview.js), „Imprimă” prints the pages only. Opened from 1 › Descarcă; closing it comes
      back to 1.
   Markup and class names are the RAP ones (rap-act-*, data-rap-*: moved here unchanged from
   rap-evo.js, so the RAP dialogs stay byte-identical); the CSS is css/act-view.css.

   Usage: const view = GEAPActView.create({ copyHtml, onCopy, copySelector, bodyOpenClass });
          view.openData(act, opener) · view.openDocument(act, opener) · view.closeData() · view.closeDocument()
   act (view model, the page maps its own data):
     { id, name, number, status, tone, watermark, authority, office,
       beneficiary: { name, person, idType, id },
       tacitDate, tacitBadge, issuedDate, validFrom, statusDates: [[label, value]], validUntil,
       paperNumber, printedNumber, groups, url,
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
          : { label: String(column?.label ?? ""), type: column?.type === "number" ? "number" : "text" })),
        rows: (item.rows || []).filter((row) => Array.isArray(row) && row.some(isFilled))
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
        <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
        <span class="e-permits-dosar-profil__row-value">${fieldValueHtml(item.value)}</span>
      </div>`;

  /* a grid: registry-look table (header row, numbers right-aligned, first column pinned,
     its own horizontal scroll); every cell also carries its column label, shown only when ≤ 760 turns the
     rows into stacked mini-cards */
  const tableFieldHtml = (item, extra) => {
    const id = `act-fields-${++fieldsUid}`;
    const collapsible = item.rows.length > ACT_TABLE_ROWS_SHOWN;
    const cell = (column, value) => `<td class="${column.type === "number" ? "is-number" : "is-text"}"><span class="e-permits-act-fields__cell-label">${escapeHtml(column.label)}</span><span class="e-permits-act-fields__cell-value">${isFilled(value) ? escapeHtml(value) : "—"}</span></td>`;
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
            <thead><tr>${item.columns.map((column) => `<th scope="col" class="${column.type === "number" ? "is-number" : "is-text"}"><span>${escapeHtml(column.label)}</span></th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
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
  function fieldsHtml(input, { section = defaultSection, untitled = "Câmpuri specifice actului" } = {}) {
    const groups = normalizeFields(input);
    return groups.map((group, index) => {
      const id = `act-fields-${++fieldsUid}`;
      const collapsible = group.items.length > ACT_FIELDS_LIMIT;
      const items = group.items.map((item, at) => {
        const extra = collapsible && at >= ACT_FIELDS_SHOWN ? " e-permits-act-fields__more" : "";
        return item.columns ? tableFieldHtml(item, extra) : fieldRowHtml(item, extra);
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

  const longStamp = (date) => `${new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(date)}, ${new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(date)}`;

  /* copy: the shared component (js/copy-value.js) handles its own clicks in the capture phase — onCopy /
     copySelector stay for old callers and never fire for .copy-value buttons */
  function create({ sprite = "../assets/icons/sprite.svg", copyHtml = (value) => window.GEAPCopyValue?.html(value, { label: `Copiază numărul actului ${value}` }) || escapeHtml(value), onCopy = () => {}, copySelector = "[data-copy-value]", bodyOpenClass = "" } = {}) {
    const icon = (name, className = "icon") => `
    <svg class="${className}" aria-hidden="true"><use href="${sprite}#icon-${name}"></use></svg>
  `;
    const statusTag = (act) => `<span class="e-permits-workplace__tag e-permits-workplace__tag--${act.tone}">${escapeHtml(act.status)}</span>`;
    const tacitTag = () => '<span class="e-permits-workplace__tag e-permits-workplace__tag--info">Aprobare tacită</span>';
    const tacitDateRow = (act) => (act.tacitDate
      ? [["Data aprobării tacite", `<span>${escapeHtml(act.tacitDate)}</span>${act.tacitBadge ? tacitTag() : ""}`]]
      : []);

    const actModal = { overlay: null, opener: null, run: 0 };
    const actData = { overlay: null, record: null, opener: null, parked: false };

    /* the MDocs page: arms + authority, title, number, the public fields + the act's dynamic fields
       (PF: the anonymised name only, never an IDNP — US-145), signature, QR, footer; a long act
       continues on more A4 pages (paginateActDoc) */
    const renderActPage = (act) => {
      const person = act.beneficiary.person;
      const row = ([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
      const itemRow = (item) => (item.columns
        ? docGridRows(item)
        : `<tr><td>${escapeHtml(item.label)}</td><td>${Array.isArray(item.value) ? item.value.filter(isFilled).map(escapeHtml).join("<br>") : escapeHtml(item.value)}</td></tr>`);
      const rowsHtml = [
        ...[["Beneficiar", act.beneficiary.name], ...(person ? [] : [[act.beneficiary.idType, act.beneficiary.id]])].map(row),
        ...normalizeFields(act.groups).map((group) => `${group.title ? `<tr class="e-permits-doc-page__group"><th colspan="2" scope="colgroup">${escapeHtml(group.title)}</th></tr>` : ""}${group.items.map(itemRow).join("")}`),
        ...[
          ...(act.tacitDate ? [["Data aprobării tacite", act.tacitDate]] : []),
          ["Valabil din data", act.validFrom],
          ...(act.statusDates || []),
          ["Data expirării", act.validUntil],
          ["Numărul dosarului electronic", act.paperNumber],
          ["Seria și nr. documentului tipărit", act.printedNumber]
        ].filter(([, value]) => value).map(row)
      ].join("");
      const url = act.url;
      const watermark = act.watermark
        ? `<span class="rap-act-doc__watermark rap-act-doc__watermark--${act.tone}" aria-hidden="true"><span>${escapeHtml(act.status.toLocaleUpperCase("ro"))}</span></span>`
        : "";
      return `
      <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page rap-act-doc" data-doc-cont="${escapeHtml(`${act.name} · nr. ${act.number} · continuare`)}">
        ${watermark}
        <div class="e-permits-dtpl__surface e-permits-doc-page__surface rap-act-doc__surface">
          <header class="rap-act-doc__head">
            <span class="rap-act-doc__arms" aria-hidden="true"><img src="../assets/logos/gov.svg" alt=""></span>
            <p class="rap-act-doc__country">Republica Moldova</p>
            <p class="rap-act-doc__authority">${escapeHtml(act.authority)}</p>
            ${act.office ? `<p class="rap-act-doc__office">${escapeHtml(act.office)}</p>` : ""}
          </header>
          <h1>${escapeHtml(act.name)}</h1>
          <p class="rap-act-doc__number">nr. ${escapeHtml(act.number)} din ${escapeHtml(act.issuedDate)}</p>
          <table><colgroup><col class="e-permits-doc-page__label-col"><col></colgroup><tbody>${rowsHtml}</tbody></table>
          <p class="rap-act-doc__closing">Actul permisiv se eliberează pentru desfășurarea activității indicate, în condițiile legii.</p>
          <div class="rap-act-doc__foot">
            <div class="rap-act-doc__sign">
              <p class="rap-act-doc__label">Autoritatea emitentă</p>
              <p class="rap-act-doc__strong">${escapeHtml(act.authority)}</p>
              <p class="rap-act-doc__signed">${icon("signature")}<span>Semnat electronic · MSign · ${escapeHtml(act.issuedDate)}</span></p>
            </div>
            <div class="rap-act-doc__qr">
              <span class="rap-act-doc__qr-code" aria-hidden="true">${icon("qr-code")}</span>
              <span class="rap-act-doc__qr-text">
                <strong>Verificați autenticitatea</strong>
                <span>${escapeHtml(url.replace(/^https?:\/\//, ""))}</span>
              </span>
            </div>
          </div>
          <p class="e-permits-doc-page__footer rap-act-doc__footer">Generat prin MDocs la ${escapeHtml(longStamp(new Date()))} · ${escapeHtml(act.source || "Registrul actelor permisive")} · <span data-doc-page-label>Pagina 1 din 1</span></p>
        </div>
      </div>
    `;
    };

    const paginateActDoc = (canvas) => window.GEAPDocPreview?.paginate(canvas, { repeat: ".rap-act-doc__watermark", tail: ".rap-act-doc__closing, .rap-act-doc__foot" });
    const fitActPage = () => window.GEAPDocPreview?.fit(actModal.overlay?.querySelector("[data-rap-act-canvas]"));

    /* view = loading | ready | <error key> */
    const renderActModalBody = (act, view) => {
      const body = actModal.overlay.querySelector("[data-rap-act-body]");
      const footer = actModal.overlay.querySelector("[data-rap-act-footer]");
      const ready = view === "ready";
      body.setAttribute("aria-busy", String(view === "loading"));
      body.innerHTML = ready
        ? `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas" data-rap-act-canvas role="document" aria-label="${escapeHtml(act.name)}, nr. ${escapeHtml(act.number)}">${renderActPage(act)}</div>`
        : `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas e-permits-doc-peek__canvas--state">${view === "loading"
          ? window.GEAPEmptyState.render({ loading: true, bare: true, title: "Se generează documentul", text: "MDocs pregătește actul. Poate dura câteva secunde." })
          : window.GEAPEmptyState.render({ bare: true, icon: "circle-error", text: MDOCS_ERRORS[view] || MDOCS_UNAVAILABLE })}</div>`;
      footer.innerHTML = `
      ${ready ? `<button class="btn btn-neutral btn-rounded rap-act-modal__print" type="button" data-rap-act-print>${window.GEAPDocPreview?.printIcon("icon") || ""}<span>Imprimă</span></button>` : ""}
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

    const showActData = () => {
      const overlay = actData.overlay;
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
      if (restoreFocus && actData.opener?.isConnected) actData.opener.focus();
    };

    /* toData: opened from „Vizualizare act” › Descarcă → closing goes back to that dialog */
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
      const run = ++actModal.run;
      overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal rap-act-modal__dialog">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 class="e-permits-fo-doc-modal__title" id="rap-act-modal-title">Forma de tipar a actului</h2>
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
        <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
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
      ${fieldsHtml(act.groups)}
      <div class="info-box info-box--neutral e-permits-info-note e-permits-readonly-note">
        <span class="info-box__icon">${icon("shield")}</span>
        <div class="info-box__content"><p>Datele personale sunt mascate conform legislației. Sunt afișate doar câmpurile publice ale actului.</p></div>
      </div>`;
    };

    const ensureActData = () => {
      if (actData.overlay) return actData.overlay;
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay rap-act-data";
      overlay.setAttribute("aria-hidden", "true");
      overlay.dataset.rapActData = "";
      overlay.innerHTML = `
      <div class="modal modal--md e-permits-passport__modal e-permits-case-modal e-permits-detail-modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="rap-act-data-title">
        <button type="button" class="modal-close" aria-label="Închide" data-rap-data-close>
          <span class="d-inline-flex">${icon("cross-large", "icon small")}</span>
        </button>
        <div class="modal--header" data-rap-data-header></div>
        <div class="modal-content" data-rap-data-body></div>
        <div class="modal--footer">
          <div class="modal-buttons">
            <button class="btn btn-neutral btn-rounded" type="button" aria-haspopup="dialog" data-rap-data-download>${icon("export", "icon small")}<span>Descarcă</span></button>
            <button class="btn btn-primary btn-rounded" type="button" data-rap-data-close>Închide</button>
          </div>
        </div>
      </div>`;
      document.body.append(overlay);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay || event.target.closest("[data-rap-data-close]")) {
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
        const download = event.target.closest("[data-rap-data-download]");
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
        if (event.key === "Tab") trapTab(overlay, event);
      });
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
      openDocument: openActDocument,
      closeData: closeActData,
      closeDocument: closeActDocument,
      isOpen: () => Boolean(actData.overlay?.classList.contains("is-active") || (actModal.overlay && !actModal.overlay.hidden))
    };
  }

  window.GEAPActView = { create, normalizeFields, fieldsHtml };
})();
