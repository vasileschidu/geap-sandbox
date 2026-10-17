(() => {
  "use strict";

  const DATA_URL = "../data/rap-evo.json?v=acts-v2";
  /* „Filtru” = the BO advanced filter (js/facet-filter.js): one facet per column that
     makes sense to filter, values read from the records (no new data) */
  const beneficiaryType = (record) => (record.beneficiary.type === "person" ? "Persoană fizică" : "Persoană juridică");
  /* „Aprobat tacit” in the Statut facet (US-141): a pseudo-status = acts with Aprobare tacită = true,
     whatever their status */
  const FACETS = [
    { key: "status", label: "Statut", get: (record) => [record.status, ...((record.markings || []).includes("Aprobat tacit") ? ["Aprobat tacit"] : [])] },
    { key: "denumire", label: "Denumire act", get: (record) => record.permit.name },
    { key: "autoritate", label: "Autoritate", get: (record) => record.authority.name },
    { key: "beneficiar", label: "Tip beneficiar", get: beneficiaryType }
  ];
  const state = {
    config: null,
    records: [],
    filteredRecords: [],
    search: "",
    filter: { open: false, applied: {}, draft: null },
    page: 1,
    pageSize: 16,
    activeRecord: null,
    companyFilter: null
  };

  const elements = {
    title: document.querySelector("[data-rap-title]"),
    subtitle: document.querySelector("[data-rap-subtitle]"),
    search: document.querySelector("[data-rap-search]"),
    searchClear: document.querySelector("[data-rap-search-clear]"),
    tableBody: document.querySelector("[data-rap-table-body]"),
    tableScroller: document.querySelector("[data-rap-table-scroller]"),
    resultsSummary: document.querySelector("[data-rap-results-summary]"),
    pageSize: document.querySelector("[data-rap-page-size]"),
    pagination: document.querySelector("[data-rap-pagination]"),
    empty: document.querySelector("[data-rap-empty]"),
    filterToggle: document.querySelector("[data-rap-filter-toggle]"),
    filterBar: document.querySelector("[data-rap-filters]"),
    filterCount: document.querySelector("[data-rap-filter-count]"),
    tooltip: document.querySelector("[data-rap-tooltip]"),
    listView: document.querySelector("[data-rap-list-view]"),
    profileView: document.querySelector("[data-rap-profile-view]"),
    companySummary: document.querySelector("[data-rap-company-summary]")
  };

  let searchTimer;
  let facetFilter = null;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro");

  const expandRecords = (seedRecords, total) => {
    if (seedRecords.length >= total) {
      return seedRecords.slice(0, total);
    }

    return Array.from({ length: total }, (_, index) => {
      const seed = seedRecords[index % seedRecords.length];
      const cycle = Math.floor(index / seedRecords.length);
      if (cycle === 0) {
        return structuredClone(seed);
      }

      const record = structuredClone(seed);
      record.id = `${seed.id}-${cycle + 1}`;
      return record;
    });
  };

  const statusTone = (status) => ({
    "Valabil": "success",
    "Suspendat": "warning",
    "Expirat": "neutral",
    "Retras": "danger",
    "Anulat": "danger"
  }[status] || "neutral");
  /* the BO renderTag markup (Tag · Small, css/bo-profile-parts.css) */
  const statusTag = (status) => `<span class="e-permits-workplace__tag e-permits-workplace__tag--${statusTone(status)}">${escapeHtml(status)}</span>`;
  /* tacit approval (Figma comment G. 1868591457; US-139 AC-02, US-142 / US-162 AC-08): an act with
     Aprobare tacită = true (the RAP marking „Aprobat tacit”) shows the blue Small badge „Aprobare
     tacită” beside its status tag — only while it is Valabil (US-139) — and the field „Data aprobării
     tacite” right above „Data eliberării” wherever the act's details are listed */
  const TACIT_MARK = "Aprobat tacit";
  const isTacit = (record) => (record.markings || []).includes(TACIT_MARK);
  const showTacitBadge = (record) => isTacit(record) && record.status === "Valabil";
  const tacitTag = () => '<span class="e-permits-workplace__tag e-permits-workplace__tag--info">Aprobare tacită</span>';
  const statusTags = (record) => `${statusTag(record.status)}${showTacitBadge(record) ? tacitTag() : ""}`;
  /* the LIST shows only the blue badge for a tacitly approved act (user 2026-10-17, to save space: the
     badge exists only for Valabil acts, so it implies the status); screen readers hear „Valabil, Aprobare
     tacită”. Deviation from US-139 AC-02 („alături de Status”) — to confirm with the PO */
  const listTacitTag = () => '<span class="e-permits-workplace__tag e-permits-workplace__tag--info"><span class="visually-hidden">Valabil, </span>Aprobare tacită</span>';
  /* details (user 2026-10-17): ONE row, in date order before „Data eliberării” — the date of the tacit
     approval with the badge after it; the Stare row keeps the status only */
  const tacitDateRow = (record, profile) => (isTacit(record) && profile.tacitDate
    ? [["Data aprobării tacite", `<span>${escapeHtml(profile.tacitDate)}</span>${showTacitBadge(record) ? tacitTag() : ""}`]]
    : []);

  const icon = (name, className = "icon") => `
    <svg class="${className}" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-${name}"></use></svg>
  `;

  const isMaskedValue = (value) => /[•*]/u.test(String(value));

  const copyValue = (value) => `
    <button class="rap-profile__copy" type="button" data-rap-copy="${escapeHtml(value)}" aria-label="Copiază ${escapeHtml(value)}">
      <span>${escapeHtml(value)}</span>
      ${icon("copy")}
      <span class="rap-profile__copy-tooltip" aria-hidden="true">
        <span data-copy-default>Copiază</span>
        <span data-copy-success>${icon("checkmark-small")} Copiat</span>
      </span>
    </button>
  `;

  // Compact copy element for table cells (IDNO under Beneficiar, Nr. act) — reuses the copy tooltip style.
  const renderCopyCell = (value, variant) => `
    <button class="rap-copy rap-copy--${variant}" type="button" data-rap-copy="${escapeHtml(value)}" aria-label="Copiază ${escapeHtml(value)}">
      <span class="rap-copy__value">${escapeHtml(value)}</span>
      ${icon("copy", "icon rap-copy__icon")}
      <span class="rap-profile__copy-tooltip" aria-hidden="true">
        <span data-copy-default>Copiază</span>
        <span data-copy-success>${icon("checkmark-small")} Copiat</span>
      </span>
    </button>
  `;

  const renderIdentifierCell = (value) => isMaskedValue(value)
    ? `<span class="rap-copy rap-copy--id rap-copy--masked"><span class="rap-copy__value">${escapeHtml(value)}</span></span>`
    : renderCopyCell(value, "id");

  const handleCopyButton = async (copyButton) => {
    try {
      positionCopyTooltip(copyButton);
      await copyText(copyButton.dataset.rapCopy);
      copyButton.classList.add("is-copied");
      copyButton.setAttribute("aria-label", `Copiat ${copyButton.dataset.rapCopy}`);
      window.clearTimeout(copyButton._copyTimer);
      copyButton._copyTimer = window.setTimeout(() => {
        copyButton.classList.remove("is-copied");
        copyButton.setAttribute("aria-label", `Copiază ${copyButton.dataset.rapCopy}`);
      }, 1600);
    } catch (error) {
      console.error(error);
      showToast("Valoarea nu a putut fi copiată.", "error");
    }
  };

  /* the profile writes the full month („4 ianuarie 2025”, the project date rule), the data has
     „4 ian. 2025” */
  const FULL_MONTH = { ian: "ianuarie", feb: "februarie", mar: "martie", apr: "aprilie", mai: "mai", iun: "iunie", iul: "iulie", aug: "august", sep: "septembrie", sept: "septembrie", oct: "octombrie", nov: "noiembrie", noi: "noiembrie", dec: "decembrie" };
  const fullMonthDate = (value) => String(value || "").replace(/\b(\d{1,2})\s+([a-zăâîșț]{3,4})\.?\s+(\d{4})\b/giu,
    (match, day, month, year) => (FULL_MONTH[month.toLowerCase()] ? `${day} ${FULL_MONTH[month.toLowerCase()]} ${year}` : match));

  const normalizeProfile = (record) => {
    const defaults = state.config.profileDefaults || {};
    const profile = { ...defaults, ...(record.profile || {}) };
    const issuedDate = fullMonthDate(profile.issuedDate || record.permit.issuedAt.replace(/^emis\s+/i, ""));
    return {
      ...profile,
      issuedDate,
      validFrom: fullMonthDate(profile.validFrom) || issuedDate,
      validUntil: fullMonthDate(profile.validUntil || record.permit.validThrough),
      tacitDate: fullMonthDate(profile.tacitApprovalDate),
      timeline: record.profile?.timeline || defaults.timeline || [],
      support: { ...(defaults.support || {}), ...(record.profile?.support || {}) }
    };
  };

  /* BO renderPageHeaderMeta item */
  const renderProfileSummaryItem = (label, value, { copy = false, html = false } = {}) => `
    <div class="e-permits-page-header__meta-item">
      <span class="e-permits-page-header__meta-label">${escapeHtml(label)}</span>
      <span class="e-permits-page-header__meta-value">${html ? value : copy ? copyValue(value) : escapeHtml(value)}</span>
    </div>
  `;

  /* BO Date generale row (.e-permits-dosar-profil__row); html = a value already rendered */
  const renderProfileDetailRow = (label, value, { copy = false, html = false } = {}) => `
    <div class="e-permits-dosar-profil__row">
      <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <span class="e-permits-dosar-profil__row-value">${html ? value : copy ? copyValue(value) : escapeHtml(value)}</span>
    </div>
  `;

  /* BO syncPageHeaderMetaRows: an item that starts a line draws no separator */
  const syncMetaRows = (meta) => {
    let previousTop = null;
    meta.querySelectorAll(":scope > .e-permits-page-header__meta-item").forEach((item) => {
      const top = item.offsetTop;
      item.classList.toggle("is-row-start", previousTop === null || top > previousTop + 1);
      previousTop = top;
    });
  };
  const metaObserver = "ResizeObserver" in window ? new ResizeObserver((entries) => entries.forEach((entry) => syncMetaRows(entry.target))) : null;

  const renderTimeline = (timeline) => timeline.map((item) => `
    <li class="rap-profile__timeline-item rap-profile__timeline-item--${escapeHtml(item.state)}">
      <span class="rap-profile__timeline-marker" aria-hidden="true">
        ${icon(item.state === "complete" ? "circle-checkmark-filled" : "time")}
      </span>
      <span class="rap-profile__timeline-content">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.date ? `<time>${escapeHtml(item.date)}</time>` : ""}
        ${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}
      </span>
    </li>
  `).join("");

  const renderProfile = (record) => {
    const profile = normalizeProfile(record);
    const beneficiaryIcon = record.beneficiary.type === "person" ? "person-filled" : "business-filled";
    const details = [
      ["Denumire act permisiv", record.permit.name],
      ["Stare", statusTag(record.status), false, true],
      ["Numărul actului permisiv", record.permit.number, true],
      ["Numărul dosarului electronic", record.permit.paperNumber, true],
      ["Seria și nr. documentului tipărit", profile.printedDocumentNumber, true],
      ...tacitDateRow(record, profile).map(([label, value]) => [label, value, false, true]),
      ["Data eliberării", profile.issuedDate],
      ["Valabil din data", profile.validFrom],
      ["Data expirării", profile.validUntil]
    ];
    /* „Toate actele (N) →” (user 2026-10-17, research: a count gives the link information scent;
       the name stays plain because the target is a filtered list, not a company page) */
    /* the real number of the company's acts: distinct acts in the registry data (not the demo
       padding that repeats the seed rows) — the same list „Toate actele” opens */
    const companyActsCount = record.beneficiary.type === "company"
      ? new Set(state.config.records
        .filter((item) => item.beneficiary.type === "company" && item.beneficiary.identifier === record.beneficiary.identifier)
        .map((item) => item.permit.number)).size
      : 0;
    const companyPermitsAction = companyActsCount > 1 ? `
      <button class="rap-profile__company-permits" type="button" data-rap-company-permits="${escapeHtml(record.beneficiary.identifier)}" aria-label="Vezi toate actele companiei ${escapeHtml(record.beneficiary.name)} (${companyActsCount})">
        Vezi toate (${companyActsCount}) <span aria-hidden="true">→</span>
      </button>
    ` : "";

    elements.profileView.innerHTML = `
      <div class="rap-profile__container">
        <header class="e-permits-page-header rap-profile__header">
          <div class="e-permits-page-header__body">
            <div class="e-permits-page-header__top">
              <div class="e-permits-page-header__heading">
                <nav class="breadcrumbs breadcrumbs--trailing rap-breadcrumbs rap-profile__breadcrumbs" aria-label="Breadcrumb">
                  <ol class="breadcrumbs__list">
                    <li class="breadcrumbs__item"><a class="breadcrumbs__link" href="../index.html">Acasă</a></li>
                    <li class="breadcrumbs__item"><a class="breadcrumbs__link" href="#">Resurse utile</a></li>
                    <li class="breadcrumbs__item"><button class="breadcrumbs__link" type="button" data-rap-profile-back>Registrul actelor permisive</button></li>
                  </ol>
                </nav>
                <nav class="breadcrumbs breadcrumbs--mobile rap-breadcrumbs" aria-label="Breadcrumb">
                  <ol class="breadcrumbs__list">
                    <li class="breadcrumbs__item breadcrumbs__item--back"><button class="breadcrumbs__link" type="button" data-rap-profile-back><span class="rap-breadcrumbs__label">Registrul actelor permisive</span></button></li>
                  </ol>
                </nav>
                <div class="rap-profile__title-row">
                  <h1 class="e-permits-page-header__title" id="rap-profile-title" title="${escapeHtml(record.permit.name)}">${escapeHtml(record.permit.name)}</h1>
                </div>
              </div>
            </div>
            <div class="e-permits-page-header__meta" data-rap-profile-meta>
              ${renderProfileSummaryItem("Numărul actului", record.permit.number, { copy: true })}
              ${renderProfileSummaryItem("Stare", statusTags(record), { html: true })}
              ${renderProfileSummaryItem("Valabil din data", profile.validFrom)}
              ${renderProfileSummaryItem("Data expirării", profile.validUntil)}
            </div>
            <button class="btn btn-primary btn-md rap-profile__document-button" type="button" aria-haspopup="dialog" data-rap-view-document>
              ${icon("eye-open", "icon small")}
              <span>Vezi act permisiv</span>
            </button>
          </div>
        </header>

        <div class="e-permits-dosar-profil__panel">
        <section class="e-permits-dosar-profil__section" aria-labelledby="rap-beneficiary-title">
          <h2 class="e-permits-dosar-profil__section-title" id="rap-beneficiary-title">Beneficiar</h2>
          <div class="rap-profile__beneficiary-card">
            <span class="rap-profile__beneficiary-avatar" aria-hidden="true">${icon(beneficiaryIcon)}</span>
            <span class="rap-profile__beneficiary-copy">
              <strong>${escapeHtml(record.beneficiary.name)}</strong>
              <span class="rap-profile__beneficiary-meta">
                <span>${escapeHtml(record.beneficiary.identifierType)}</span>
                ${isMaskedValue(record.beneficiary.identifier) ? `<code>${escapeHtml(record.beneficiary.identifier)}</code>` : copyValue(record.beneficiary.identifier)}
              </span>
            </span>
            ${companyPermitsAction}
          </div>
        </section>

        <section class="e-permits-dosar-profil__section" aria-labelledby="rap-details-title">
          <h2 class="e-permits-dosar-profil__section-title" id="rap-details-title">Detalii act</h2>
          <div class="e-permits-dosar-profil__card">
            ${details.map(([label, value, copy, html]) => renderProfileDetailRow(label, value, { copy, html })).join("")}
          </div>
        </section>

        <!-- no „Istoric complet” on the public registry page (user 2026-10-17): a dossier timeline
             (Cerere depusă → Dosar în examinare) means nothing for an issued act seen by the public -->

        <!-- „Autoritatea emitentă” (user 2026-10-17) instead of „Ai nevoie de ajutor?” with a fixed ANTA
             contact: the act's own authority + office; phone / e-mail only when the data has them -->
        <section class="e-permits-dosar-profil__section rap-profile__section--support" aria-labelledby="rap-support-title">
          <h2 class="e-permits-dosar-profil__section-title" id="rap-support-title">Autoritatea emitentă</h2>
          <div class="e-permits-dosar-profil__card">
            ${(() => {
              const contact = { ...(state.config.authorityContacts?.[record.authority.code] || {}), ...record.authority };
              const link = (href, text) => `<a class="rap-profile__contact-link" href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
              return [
                ["Denumire", escapeHtml(record.authority.name)],
                ["Cod", escapeHtml(record.authority.code)],
                ["Oficiul", profile.office ? escapeHtml(profile.office) : ""],
                ["Telefon", contact.phone ? link(`tel:${contact.phone.replaceAll(" ", "")}`, contact.phone) : ""],
                ["E-mail", contact.email ? link(`mailto:${contact.email}`, contact.email) : ""]
              ].filter(([, value]) => value)
                .map(([label, value]) => renderProfileDetailRow(label, value, { html: true })).join("");
            })()}
          </div>
        </section>
        </div>
      </div>
    `;
    const meta = elements.profileView.querySelector("[data-rap-profile-meta]");
    syncMetaRows(meta);
    metaObserver?.observe(meta);
  };

  /* US-142 AC-16: an unknown ?act= says so, with a way back to the list */
  const renderProfileNotFound = () => {
    elements.profileView.innerHTML = `
      <div class="rap-profile__container rap-state">
        ${window.GEAPEmptyState.render({ title: "Actul nu a fost găsit", text: "Linkul nu mai este valabil sau actul nu există în registru.", icon: "search", actionHtml: '<a class="btn btn-neutral btn-sm" href="?">Înapoi la registru</a>' })}
      </div>
    `;
  };

  /* ---- „Vizualizare actul” (US-143 · US-162 AC-12): MDocs generates the act on demand and it opens
     in the EVO document modal — the Cabinet / FO doc-modal shell + grey canvas + A4 page
     (css/doc-modal-parts.css), zoomed to the canvas width as in Cabinet / BO. Loading = the shared
     empty state with the spinner (AC-03); errors = the AC texts (AC-10 / AC-11 / AC-12); a status
     other than „Valabil” = a diagonal watermark (AC-14); „Imprimă” prints the page only (AC-09).
     Demo: ?mdocs=incarcare (stays loading) · indisponibil (AC-10) · date (AC-11) · sablon (AC-12). */
  const MDOCS_DELAY = 900;
  const MDOCS_UNAVAILABLE = "Documentul nu poate fi generat momentan. Vă rugăm să încercați mai târziu.";
  const MDOCS_ERRORS = {
    indisponibil: MDOCS_UNAVAILABLE,
    sablon: MDOCS_UNAVAILABLE,
    date: "Datele actului nu sunt disponibile momentan. Vă rugăm să încercați mai târziu."
  };
  /* the printer of the product nav (assets/icons/sidebar-printer-print.svg), stroke = label colour */
  const PRINT_ICON = '<svg class="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.70833 8.95833H5.625M14.375 11.4583V14.375H16.0417C16.9621 14.375 17.7083 13.6288 17.7083 12.7083V7.29167C17.7083 6.37119 16.9621 5.625 16.0417 5.625H3.95833C3.03786 5.625 2.29167 6.37119 2.29167 7.29167V12.7083C2.29167 13.6288 3.03786 14.375 3.95833 14.375H5.625V11.4583H14.375V16.0417C14.375 16.9621 13.6288 17.7083 12.7083 17.7083H7.29167C6.37119 17.7083 5.625 16.9621 5.625 16.0417V11.4583M7.29167 2.29167H12.7083C13.6288 2.29167 14.375 3.03786 14.375 3.95833V5.625H5.625V3.95833C5.625 3.03786 6.37119 2.29167 7.29167 2.29167Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const actModal = { overlay: null, opener: null, run: 0 };

  const longStamp = (date) => `${new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(date)}, ${new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
  const permanentUrl = (record) => `${window.location.origin}${window.location.pathname}?act=${encodeURIComponent(record.id)}`;

  /* „Câmpuri specifice actului” (US-162 / US-163 · US-221 „Câmpuri transmise în RAP”): the act's
     service-configured public fields, in form order, grouped by the form's sections when the data has
     them (document.sections); older records carry a flat list (address, activity, fields) */
  const actSpecificGroups = (record) => {
    const doc = normalizeProfile(record).document || {};
    if (doc.sections?.length) {
      return doc.sections
        .map((section) => ({ title: section.title, rows: (section.fields || []).filter(([, value]) => value) }))
        .filter((group) => group.rows.length);
    }
    const rows = [["Adresa obiectului", doc.address], ["Genul de activitate", doc.activity], ...(doc.fields || [])].filter(([, value]) => value);
    return rows.length ? [{ title: null, rows }] : [];
  };

  /* the MDocs page: arms + authority, title, number, the public fields + the act's dynamic fields
     (PF: the anonymised name only, never an IDNP — US-145), signature, QR, footer; a long act
     continues on more A4 pages (paginateActDoc) */
  const renderActPage = (record) => {
    const profile = normalizeProfile(record);
    const person = record.beneficiary.type === "person";
    const row = ([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
    const rowsHtml = [
      ...[["Beneficiar", record.beneficiary.name], ...(person ? [] : [[record.beneficiary.identifierType, record.beneficiary.identifier]])].map(row),
      ...actSpecificGroups(record).map((group) => `${group.title ? `<tr class="rap-act-doc__group"><th colspan="2" scope="colgroup">${escapeHtml(group.title)}</th></tr>` : ""}${group.rows.map(row).join("")}`),
      ...[
        ...(isTacit(record) && profile.tacitDate ? [["Data aprobării tacite", profile.tacitDate]] : []),
        ["Valabil din data", profile.validFrom],
        ["Data expirării", profile.validUntil],
        ["Numărul dosarului electronic", record.permit.paperNumber],
        ["Seria și nr. documentului tipărit", profile.printedDocumentNumber]
      ].filter(([, value]) => value).map(row)
    ].join("");
    const url = permanentUrl(record);
    const tone = statusTone(record.status);
    const watermark = record.status !== "Valabil"
      ? `<span class="rap-act-doc__watermark rap-act-doc__watermark--${tone}" aria-hidden="true"><span>${escapeHtml(record.status.toLocaleUpperCase("ro"))}</span></span>`
      : "";
    return `
      <div class="e-permits-dtpl__page e-permits-doc-peek__page rap-act-doc" data-rap-act-cont="${escapeHtml(`${record.permit.name} · nr. ${record.permit.number} · continuare`)}">
        ${watermark}
        <div class="e-permits-dtpl__surface rap-act-doc__surface">
          <header class="rap-act-doc__head">
            <span class="rap-act-doc__arms" aria-hidden="true"><img src="../assets/logos/gov.svg" alt=""></span>
            <p class="rap-act-doc__country">Republica Moldova</p>
            <p class="rap-act-doc__authority">${escapeHtml(record.authority.name)}</p>
            ${profile.office ? `<p class="rap-act-doc__office">${escapeHtml(profile.office)}</p>` : ""}
          </header>
          <h1>${escapeHtml(record.permit.name)}</h1>
          <p class="rap-act-doc__number">nr. ${escapeHtml(record.permit.number)} din ${escapeHtml(profile.issuedDate)}</p>
          <table><tbody>${rowsHtml}</tbody></table>
          <p class="rap-act-doc__closing">Actul permisiv se eliberează pentru desfășurarea activității indicate, în condițiile legii.</p>
          <div class="rap-act-doc__foot">
            <div class="rap-act-doc__sign">
              <p class="rap-act-doc__label">Autoritatea emitentă</p>
              <p class="rap-act-doc__strong">${escapeHtml(record.authority.name)}</p>
              <p class="rap-act-doc__signed">${icon("signature")}<span>Semnat electronic · MSign · ${escapeHtml(profile.issuedDate)}</span></p>
            </div>
            <div class="rap-act-doc__qr">
              <span class="rap-act-doc__qr-code" aria-hidden="true">${icon("qr-code")}</span>
              <span class="rap-act-doc__qr-text">
                <strong>Verificați autenticitatea</strong>
                <span>${escapeHtml(url.replace(/^https?:\/\//, ""))}</span>
              </span>
            </div>
          </div>
          <p class="rap-act-doc__footer">Generat prin MDocs la ${escapeHtml(longStamp(new Date()))} · Registrul actelor permisive · <span data-rap-act-page>Pagina 1 din 1</span></p>
        </div>
      </div>
    `;
  };

  /* A4 pages (Figma comment A. 1968940910 — many configured fields): the act is rendered on one
     page, measured unzoomed, and the table rows that do not fit move to continuation pages
     (same shell + watermark, „… · continuare” line, the closing text + signature on the last page,
     „Pagina k din n” in every footer). A section heading never ends a page. */
  const paginateActDoc = (canvas) => {
    const first = canvas.querySelector(".rap-act-doc");
    if (!first) return;
    const style = window.getComputedStyle(first);
    const room = parseFloat(style.minHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const fits = (page) => {
      page.classList.add("is-measuring");
      const height = page.querySelector(".rap-act-doc__surface").scrollHeight;
      page.classList.remove("is-measuring");
      return height <= room + 1;
    };
    const continuation = (from) => {
      const page = document.createElement("div");
      page.className = from.className;
      const watermark = from.querySelector(".rap-act-doc__watermark");
      if (watermark) page.append(watermark.cloneNode(true));
      const surface = document.createElement("div");
      surface.className = from.querySelector(".rap-act-doc__surface").className;
      surface.innerHTML = `<p class="rap-act-doc__cont">${escapeHtml(first.dataset.rapActCont || "")}</p><table><tbody></tbody></table>`;
      surface.append(...from.querySelectorAll(".rap-act-doc__closing, .rap-act-doc__foot"), from.querySelector(".rap-act-doc__footer").cloneNode(true));
      page.append(surface);
      return page;
    };
    let page = first;
    for (let guard = 0; guard < 24 && !fits(page); guard += 1) {
      const next = continuation(page);
      page.after(next);
      const body = page.querySelector("tbody");
      const nextBody = next.querySelector("tbody");
      while (!fits(page) && body.rows.length > 1) nextBody.prepend(body.lastElementChild);
      /* the signature never stands alone: the last page keeps at least two rows of the table */
      while (nextBody.rows.length < 2 && body.rows.length > 2) nextBody.prepend(body.lastElementChild);
      if (body.lastElementChild?.classList.contains("rap-act-doc__group")) nextBody.prepend(body.lastElementChild);
      if (!nextBody.rows.length) nextBody.closest("table").remove();
      page = next;
    }
    const pages = canvas.querySelectorAll(".rap-act-doc");
    pages.forEach((item, index) => { item.querySelector("[data-rap-act-page]").textContent = `Pagina ${index + 1} din ${pages.length}`; });
  };

  const fitActPage = () => {
    const canvas = actModal.overlay?.querySelector("[data-rap-act-canvas]");
    const pages = canvas?.querySelectorAll(".e-permits-doc-peek__page");
    if (!pages?.length || !canvas.clientWidth) return;
    /* the canvas padding is 24 (16 on phones): fit the 794px page into what is left */
    const style = window.getComputedStyle(canvas);
    const room = canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    pages.forEach((page) => { page.style.zoom = String(Math.min(1, room / 794)); });
  };

  /* view = loading | ready | <error key> */
  const renderActModalBody = (record, view) => {
    const body = actModal.overlay.querySelector("[data-rap-act-body]");
    const footer = actModal.overlay.querySelector("[data-rap-act-footer]");
    const ready = view === "ready";
    body.setAttribute("aria-busy", String(view === "loading"));
    body.innerHTML = ready
      ? `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas" data-rap-act-canvas role="document" aria-label="${escapeHtml(record.permit.name)}, nr. ${escapeHtml(record.permit.number)}">${renderActPage(record)}</div>`
      : `<div class="e-permits-doc-peek__canvas rap-act-modal__canvas rap-act-modal__canvas--state">${view === "loading"
        ? window.GEAPEmptyState.render({ loading: true, bare: true, title: "Se generează documentul", text: "MDocs pregătește actul. Poate dura câteva secunde." })
        : window.GEAPEmptyState.render({ bare: true, icon: "circle-error", text: MDOCS_ERRORS[view] || MDOCS_UNAVAILABLE })}</div>`;
    footer.innerHTML = `
      ${ready ? `<button class="btn btn-neutral btn-rounded rap-act-modal__print" type="button" data-rap-act-print>${PRINT_ICON}<span>Imprimă</span></button>` : ""}
      <button class="btn btn-primary btn-rounded" type="button" data-rap-act-close>Închide</button>`;
    if (ready) {
      paginateActDoc(body.querySelector("[data-rap-act-canvas]"));
      fitActPage();
    }
  };

  /* toData: opened from „Vizualizare act” › Descarcă → closing goes back to that dialog */
  const closeActDocument = ({ toData = true } = {}) => {
    if (!actModal.overlay || actModal.overlay.hidden) return;
    actModal.run += 1;
    actModal.overlay.hidden = true;
    document.body.classList.remove("rap-page--act-open");
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
      if (event.target.closest("[data-rap-act-print]")) window.print();
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) handleCopyButton(copyButton);
      const clamp = event.target.closest("[data-rap-clamp-toggle]");
      if (clamp) toggleClamp(clamp);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActDocument();
        return;
      }
      if (event.key !== "Tab") return;
      /* keep the focus inside the dialog */
      const focusables = [...overlay.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => { fitActPage(); syncClamps(overlay); }).observe(overlay);
    actModal.overlay = overlay;
    return overlay;
  };

  const openActDocument = (record, opener) => {
    const overlay = ensureActModal();
    actModal.opener = opener || document.activeElement;
    const run = ++actModal.run;
    overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal rap-act-modal__dialog">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 class="e-permits-fo-doc-modal__title" id="rap-act-modal-title">Forma de tipar a actului</h2>
            ${actSubtitleHtml(record, "e-permits-fo-doc-modal__subtitle")}
          </div>
          <button class="e-permits-fo-doc-modal__close" type="button" aria-label="Închide" data-rap-act-close>${icon("cross-large")}</button>
        </div>
        <div class="rap-act-modal__body" data-rap-act-body aria-live="polite"></div>
        <div class="e-permits-fo-doc-modal__footer" data-rap-act-footer></div>
      </div>`;
    renderActModalBody(record, "loading");
    overlay.hidden = false;
    document.body.classList.add("rap-page--act-open");
    syncClamps(overlay);
    /* AC-03: no second request while MDocs works (the dialog covers the page; the button says so too) */
    opener?.setAttribute("aria-disabled", "true");
    overlay.querySelector(".e-permits-fo-doc-modal__close").focus();
    const demo = new URLSearchParams(window.location.search).get("mdocs");
    if (demo === "incarcare") return;
    window.setTimeout(() => {
      if (run !== actModal.run) return;
      renderActModalBody(record, demo && MDOCS_ERRORS[demo] ? demo : "ready");
      opener?.removeAttribute("aria-disabled");
    }, MDOCS_DELAY);
  };

  /* ---- Long names in a dialog subtitle (coordinator 2026-10-17; research: Material „expandable
     text”, App Store / Google Play „more”, GOV.UK Details — an explicit word reveals the rest; an
     ellipsis alone does not read as clickable (NN/g), and a hover tooltip would be a second, mouse-only
     way to the same text). The act number + copy stay whole; the name is clamped to 1 line (2 on
     phones) and, only when it really overflows, becomes ONE toggle button: the clamped name + „Mai
     mult” / „Mai puțin”, aria-expanded, Enter / Space / click; the header grows, the body scrolls. ---- */
  const actSubtitleHtml = (record, className) => `
    <p class="${className} rap-act-subtitle" data-rap-subtitle>
      <span class="rap-act-subtitle__number">${copyValue(record.permit.number)}</span>
      <span class="rap-act-subtitle__name"><span class="rap-act-subtitle__text">${escapeHtml(record.permit.name)}</span></span>
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

  /* ---- „Vizualizare act” (US-162 AC-12 / Assumptions: the act's specific fields are reached through
     this button, not shown on the details page · US-163 the fields by form section · Figma
     EVO-WEB-3.0 20607:34846): the BO detail modal (#dosar-detail-modal: library modal--md, title +
     subtitle, „Date generale” card, read-only note, Descarcă · Închide) on the RAP page. „Câmpuri
     specifice actului” = BO detail rows; more than ACT_FIELDS_SHOWN + 2 → the first ACT_FIELDS_SHOWN,
     then „Arată toate câmpurile (N)”. Descarcă → the MDocs printable A4 form (US-143), opened in the
     document modal above; closing it comes back here. ---- */
  const ACT_FIELDS_SHOWN = 8;
  const actData = { overlay: null, record: null, opener: null, parked: false };

  const actDataRow = (label, valueHtml, extra = "") => `
    <div class="e-permits-dosar-profil__row${extra}">
      <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
    </div>`;

  const renderActData = (record) => {
    const profile = normalizeProfile(record);
    const general = [
      ["Autoritatea emitentă", escapeHtml(record.authority.name)],
      ["Subdiviziunea", profile.office ? escapeHtml(profile.office) : ""],
      ["Beneficiar", escapeHtml(record.beneficiary.name)],
      ["Numărul actului permisiv", copyValue(record.permit.number)],
      ["Stare", statusTag(record.status)],
      ...tacitDateRow(record, profile),
      ["Data eliberării", escapeHtml(profile.issuedDate)],
      ["Valabil din data", escapeHtml(profile.validFrom)],
      ["Data expirării", profile.validUntil ? escapeHtml(profile.validUntil) : ""]
    ].filter(([, value]) => value);
    const groups = actSpecificGroups(record);
    const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
    const collapsible = total > ACT_FIELDS_SHOWN + 2;
    let index = 0;
    const more = " rap-act-data__more-row";
    const fieldsHtml = groups.map((group) => {
      const startsHidden = collapsible && index >= ACT_FIELDS_SHOWN;
      const rows = group.rows.map(([label, value]) => {
        index += 1;
        return actDataRow(label, escapeHtml(value), collapsible && index > ACT_FIELDS_SHOWN ? more : "");
      }).join("");
      return `${group.title ? `<div class="rap-act-data__group${startsHidden ? more : ""}" role="heading" aria-level="3">${escapeHtml(group.title)}</div>` : ""}${rows}`;
    }).join("");
    return `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Date generale</h2>
        <div class="e-permits-dosar-profil__card">${general.map(([label, value]) => actDataRow(label, value)).join("")}</div>
      </section>
      ${total ? `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Câmpuri specifice actului</h2>
        <div class="e-permits-dosar-profil__card${collapsible ? " is-collapsed" : ""}" id="rap-act-data-fields" data-rap-data-fields>
          ${fieldsHtml}
          ${collapsible ? `<div class="rap-act-data__toggle"><button class="btn btn-text-primary btn-sm btn-rounded" type="button" aria-controls="rap-act-data-fields" data-rap-data-more data-total="${total}">Arată toate câmpurile (${total})</button></div>` : ""}
        </div>
      </section>` : ""}
      <div class="info-box info-box--neutral e-permits-info-note e-permits-readonly-note">
        <span class="info-box__icon">${icon("shield")}</span>
        <div class="info-box__content"><p>Datele personale sunt mascate conform legislației. Sunt afișate doar câmpurile publice ale actului.</p></div>
      </div>`;
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
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        handleCopyButton(copyButton);
        return;
      }
      const clamp = event.target.closest("[data-rap-clamp-toggle]");
      if (clamp) {
        toggleClamp(clamp);
        syncActDataEdges();
        return;
      }
      const moreButton = event.target.closest("[data-rap-data-more]");
      if (moreButton) {
        const card = overlay.querySelector("[data-rap-data-fields]");
        const collapsed = card.classList.toggle("is-collapsed");
        moreButton.textContent = collapsed ? `Arată toate câmpurile (${moreButton.dataset.total})` : "Arată mai puține câmpuri";
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
        closeActData();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = [...overlay.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    overlay.querySelector(".modal-content").addEventListener("scroll", syncActDataEdges, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(() => { syncClamps(overlay); syncActDataEdges(); }).observe(overlay.querySelector(".modal"));
    actData.overlay = overlay;
    return overlay;
  };

  const openActData = (record, opener) => {
    const overlay = ensureActData();
    actData.record = record;
    actData.opener = opener || document.activeElement;
    overlay.querySelector("[data-rap-data-header]").innerHTML = `
      <h2 class="modal--header-title" id="rap-act-data-title">Vizualizare act</h2>
      ${actSubtitleHtml(record, "e-permits-passport__modal-subtitle")}`;
    overlay.querySelector("[data-rap-data-body]").innerHTML = renderActData(record);
    overlay.querySelector("[data-rap-data-body]").scrollTop = 0;
    showActData();
    syncClamps(overlay);
    overlay.querySelector(".modal").focus();
  };

  const renderBeneficiary = (record) => {
    const icon = record.beneficiary.type === "person" ? "person-filled" : "business-filled";
    return `
      <div class="rap-beneficiary">
        <span class="rap-beneficiary__avatar" aria-hidden="true">
          <svg class="icon"><use href="../assets/icons/sprite.svg#icon-${icon}"></use></svg>
        </span>
        <span class="rap-beneficiary__copy">
          <span class="rap-beneficiary__name rap-ellipsis" data-tooltip="${escapeHtml(record.beneficiary.name)}">${escapeHtml(record.beneficiary.name)}</span>
          ${renderIdentifierCell(record.beneficiary.identifier)}
        </span>
      </div>
    `;
  };

  const renderRow = (record) => `
    <tr tabindex="0" data-record-id="${escapeHtml(record.id)}" aria-label="Deschide ${escapeHtml(record.permit.name)} pentru ${escapeHtml(record.beneficiary.name)}">
      <td>${renderBeneficiary(record)}</td>
      <td>
        <a class="rap-ellipsis rap-act-link" href="?act=${encodeURIComponent(record.id)}" tabindex="-1" data-tooltip="${escapeHtml(record.permit.name)}">${escapeHtml(record.permit.name)}</a>
      </td>
      <td>
        <span class="rap-cell-stack">
          <span class="rap-cell-stack__primary rap-ellipsis" data-tooltip="${escapeHtml(record.authority.code)}">${escapeHtml(record.authority.code)}</span>
          <span class="rap-cell-stack__secondary rap-ellipsis" data-tooltip="${escapeHtml(record.authority.name)}">${escapeHtml(record.authority.name)}</span>
        </span>
      </td>
      <td>
        <span class="rap-cell-stack">
          ${renderCopyCell(record.permit.number, "act")}
          <span class="rap-cell-stack__secondary rap-ellipsis" data-tooltip="${escapeHtml(record.permit.paperNumber)}">Dosar: ${escapeHtml(record.permit.paperNumber)}</span>
        </span>
      </td>
      <td>
        <span class="rap-cell-stack">
          <span class="rap-cell-stack__primary">${escapeHtml(record.permit.validThrough)}</span>
          <span class="rap-cell-stack__secondary">${escapeHtml(record.permit.issuedAt)}</span>
        </span>
      </td>
      <td>${showTacitBadge(record) ? listTacitTag() : statusTag(record.status)}</td>
      <td>
        <span class="rap-row-action" aria-hidden="true">
          <svg class="icon"><use href="../assets/icons/sprite.svg#icon-chevron-right"></use></svg>
        </span>
      </td>
    </tr>
  `;

  const totalActiveFilters = () => Object.values(state.filter.applied).reduce((total, values) => total + (values?.length || 0), 0);
  const facetValues = (facet, record) => [].concat(facet.get(record) ?? []).filter(Boolean);
  const matchesFacets = (record, except = null, selection = state.filter.applied) => Object.entries(selection).every(([key, values]) => {
    if (key === except || !values?.length) return true;
    const facet = FACETS.find((f) => f.key === key);
    return !facet || facetValues(facet, record).some((value) => values.includes(value));
  });

  const renderCompanySummary = () => {
    const company = state.companyFilter;
    if (!company || normalize(state.search) !== normalize(company.identifier)) {
      elements.companySummary.hidden = true;
      elements.companySummary.innerHTML = "";
      return;
    }

    const companyRecords = state.config.records.filter((record) => (
      record.beneficiary.type === "company"
      && record.beneficiary.identifier === company.identifier
    ));
    const activeCount = companyRecords.filter((record) => record.status === "Valabil").length;
    const inactiveCount = companyRecords.length - activeCount;
    elements.companySummary.innerHTML = `
      <div class="rap-company-summary__inner">
        <span class="rap-company-summary__avatar" aria-hidden="true">${icon("business-filled")}</span>
        <span class="rap-company-summary__identity">
          <strong>${escapeHtml(company.name)}</strong>
          <span class="rap-company-summary__id">
            <span>${escapeHtml(company.identifierType)}</span>
            <code>${escapeHtml(company.identifier)}</code>
          </span>
        </span>
      </div>
      <div class="rap-company-summary__metrics" role="group" aria-label="Statistica actelor companiei">
          <span class="rap-company-summary__metric">
            <strong>${companyRecords.length}</strong>
            <span>Total acte</span>
          </span>
          <span class="rap-company-summary__metric rap-company-summary__metric--active">
            <strong>${activeCount}</strong>
            <span>Active</span>
          </span>
          <span class="rap-company-summary__metric rap-company-summary__metric--inactive">
            <strong>${inactiveCount}</strong>
            <span>Inactive</span>
          </span>
      </div>
    `;
    elements.companySummary.hidden = false;
  };

  /* the search + company view, before the facets (the facet options are counted on it) */
  const matchesSearch = (record) => {
    const query = normalize(state.search);
    const searchable = normalize([
      record.beneficiary.name,
      record.beneficiary.identifier,
      record.permit.name,
      record.permit.number,
      record.permit.paperNumber,
      record.authority.code,
      record.authority.name,
      record.status
    ].join(" "));
    /* the company view lists the company's own (seed) records only */
    return (!query || searchable.includes(query))
      && (!state.companyFilter || (record.beneficiary.identifier === state.companyFilter.identifier
        && state.config.records.some((seed) => seed.id === record.id)));
  };

  const applyFilters = () => {
    state.filteredRecords = state.records.filter((record) => matchesSearch(record) && matchesFacets(record));

    const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    render();
  };

  const renderTable = () => {
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filteredRecords.slice(start, start + state.pageSize);
    elements.tableBody.innerHTML = rows.map(renderRow).join("");
    elements.empty.hidden = rows.length > 0;
    document.querySelector(".rap-register").hidden = rows.length === 0;

    if (rows.length === 0) {
      elements.resultsSummary.textContent = "Nu există rezultate";
      /* the shared empty state (js/empty-state.js); filters applied → the bar's „Șterge filtrele” */
      const filters = totalActiveFilters();
      elements.empty.innerHTML = window.GEAPEmptyState.noResults("Ne pare rău, nu am găsit niciun rezultat", {
        text: filters ? "Modificați căutarea sau ștergeți filtrele aplicate." : "Verificați ortografia sau încercați alți termeni.",
        actionHtml: filters ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : ""
      });
    }

    if (rows.length > 0) {
      const first = start + 1;
      const last = Math.min(start + state.pageSize, state.filteredRecords.length);
      elements.resultsSummary.innerHTML = `Showing <strong>${first}</strong> to <strong>${last}</strong> of <strong>${state.filteredRecords.length}</strong> results`;
    }
  };

  const getPaginationWindowSize = () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      return 0;
    }
    if (window.matchMedia("(max-width: 1100px)").matches) {
      return 3;
    }
    return 5;
  };

  const getVisiblePages = (current, total, windowSize) => {
    if (windowSize === 0) {
      return [];
    }
    if (total <= windowSize) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const offset = Math.floor(windowSize / 2);
    const start = Math.min(Math.max(current - offset, 1), total - windowSize + 1);
    return Array.from({ length: windowSize }, (_, index) => start + index);
  };

  const renderPagination = () => {
    const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
    const pages = getVisiblePages(state.page, totalPages, getPaginationWindowSize());
    elements.pagination.innerHTML = `
      <button class="rap-page-button rap-page-button--direction" type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>
        <svg class="icon" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-chevron-left"></use></svg>
        <span>Previous</span>
      </button>
      ${pages.map((page) => `
        <button class="rap-page-button${page === state.page ? " is-active" : ""}" type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>
      `).join("")}
      <button class="rap-page-button rap-page-button--direction" type="button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>
        <span>Next</span>
        <svg class="icon" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-chevron-right"></use></svg>
      </button>
    `;
  };

  const render = () => {
    renderCompanySummary();
    renderTable();
    renderPagination();
    facetFilter?.render();
  };

  /* selection: the phone sheets ask for the options / counts of a selection not applied yet */
  const facetOptions = (facet, selection = state.filter.applied) => {
    const counts = new Map();
    for (const record of state.records) {
      if (!matchesSearch(record) || !matchesFacets(record, facet.key, selection)) continue;
      for (const value of new Set(facetValues(facet, record))) counts.set(value, (counts.get(value) || 0) + 1);
    }
    for (const value of selection[facet.key] || []) if (!counts.has(value)) counts.set(value, 0);
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ro", { numeric: true }));
  };

  /* a facet is offered when the registry has at least two values for it (as in the BO) */
  const availableFacets = () => FACETS.filter((facet) => {
    if (state.filter.applied[facet.key]?.length) return true;
    const seen = new Set();
    for (const record of state.records) { for (const value of facetValues(facet, record)) seen.add(value); if (seen.size > 1) return true; }
    return false;
  });

  const initFacetFilter = () => {
    facetFilter = window.GEAPFacetFilter.create({
      bar: elements.filterBar,
      toggle: elements.filterToggle,
      count: elements.filterCount,
      sprite: "../assets/icons/sprite.svg",
      state: () => state.filter,
      facets: availableFacets,
      allFacets: () => FACETS,
      options: facetOptions,
      /* status values read as the table's status tags */
      tag: (value, facet) => (facet.key !== "status" ? null : value === TACIT_MARK
        ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--info">${TACIT_MARK}</span>` : statusTag(value)),
      total: () => state.filteredRecords.length,
      /* phones: one scrolling chip row + bottom sheets with a live „Arată N rezultate” */
      mobileSheets: true,
      preview: (selection) => state.records.filter((record) => matchesSearch(record) && matchesFacets(record, null, selection)).length,
      apply: () => { state.page = 1; applyFilters(); },
      scrollers: [elements.tableScroller]
    });
  };

  const renderPageSizeOptions = () => {
    elements.pageSize.innerHTML = state.config.pagination.pageSizes.map((size) => `
      <option value="${size}" ${size === state.pageSize ? "selected" : ""}>${size}</option>
    `).join("");
  };

  const hideTooltip = () => {
    window.clearTimeout(elements.tooltip._hideTimer);
    elements.tooltip.classList.remove("is-visible");
    elements.tooltip._hideTimer = window.setTimeout(() => {
      elements.tooltip.hidden = true;
    }, 150);
  };

  const showTooltip = (target) => {
    if (target.scrollWidth <= target.clientWidth) {
      return;
    }

    window.clearTimeout(elements.tooltip._hideTimer);
    elements.tooltip.textContent = target.dataset.tooltip;
    elements.tooltip.hidden = false;
    elements.tooltip.classList.remove("is-visible");
    const rect = target.getBoundingClientRect();
    const tooltipRect = elements.tooltip.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - tooltipRect.width - 8
    );
    elements.tooltip.style.left = `${left}px`;
    const above = rect.top - tooltipRect.height - 6;
    elements.tooltip.style.top = `${above >= 8
      ? above
      : Math.min(window.innerHeight - tooltipRect.height - 8, rect.bottom + 6)}px`;
    void elements.tooltip.offsetWidth;
    elements.tooltip.classList.add("is-visible");
  };

  const positionCopyTooltip = (copyButton) => {
    const tooltip = copyButton.querySelector(".rap-profile__copy-tooltip");
    if (!tooltip) {
      return;
    }
    const rect = copyButton.getBoundingClientRect();
    tooltip.style.bottom = "auto";
    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
    tooltip.style.position = "fixed";
    tooltip.style.top = `${Math.max(8, rect.top - 34)}px`;
    tooltip.style.zIndex = "100";
  };

  /* the product toast (../js/toast.js → library .toast) */
  const showToast = (message, type = "info") => {
    window.GEAPToast?.show({ type, message });
  };

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (error) {
        console.warn("Clipboard API unavailable, using document fallback.", error);
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) {
      throw new Error("Copy command was rejected.");
    }
  };

  const findRecord = (recordId) => state.records.find((record) => record.id === recordId);

  const syncSearchState = () => {
    const hasValue = Boolean(elements.search.value);
    const searchContainer = elements.search.closest(".search-input");
    searchContainer?.classList.toggle("has-value", hasValue);
    searchContainer?.classList.toggle("is-ready", hasValue);
    elements.searchClear.disabled = !hasValue;
  };

  const clearSearch = () => {
    window.clearTimeout(searchTimer);
    state.search = "";
    state.companyFilter = null;
    state.page = 1;
    elements.search.value = "";
    syncSearchState();

    const url = new URL(window.location.href);
    url.searchParams.delete("idno");
    window.history.replaceState({ rapCompanyIdno: null }, "", url);
    applyFilters();
    elements.search.focus();
  };

  const updateProfileUrl = (recordId, { replace = false } = {}) => {
    const url = new URL(window.location.href);
    if (recordId) {
      url.searchParams.set("act", recordId);
    } else {
      url.searchParams.delete("act");
    }
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ rapRecordId: recordId || null }, "", url);
  };

  const showCompanyPermits = (record) => {
    state.companyFilter = { ...record.beneficiary };
    state.search = record.beneficiary.identifier;
    state.page = 1;
    elements.search.value = state.search;
    syncSearchState();
    closeProfile({ updateHistory: false });
    applyFilters();

    const url = new URL(window.location.href);
    url.searchParams.delete("act");
    url.searchParams.set("idno", record.beneficiary.identifier);
    window.history.pushState({ rapCompanyIdno: record.beneficiary.identifier }, "", url);
    document.querySelector(".rap-toolbar")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const openProfile = (recordId, { updateHistory = true } = {}) => {
    const record = findRecord(recordId);
    if (!record) {
      return false;
    }

    closeActDocument({ toData: false });
    closeActData({ restoreFocus: false });
    state.activeRecord = record;
    renderProfile(record);
    elements.listView.hidden = true;
    elements.profileView.hidden = false;
    document.body.classList.add("rap-page--profile");
    document.title = `${record.permit.name} · EVO`;
    facetFilter?.close(false);
    hideTooltip();
    if (updateHistory) {
      updateProfileUrl(record.id);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  };

  const closeProfile = ({ updateHistory = true } = {}) => {
    closeActDocument({ toData: false });
    closeActData({ restoreFocus: false });
    state.activeRecord = null;
    elements.profileView.hidden = true;
    elements.listView.hidden = false;
    elements.profileView.innerHTML = "";
    document.body.classList.remove("rap-page--profile");
    document.title = "Registrul actelor permisive · EVO";
    if (updateHistory) {
      updateProfileUrl(null);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const syncViewFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("act");
    if (recordId && openProfile(recordId, { updateHistory: false })) {
      return;
    }
    if (recordId) {
      state.activeRecord = null;
      renderProfileNotFound();
      elements.listView.hidden = true;
      elements.profileView.hidden = false;
      document.body.classList.add("rap-page--profile");
      document.title = "Actul nu a fost găsit · EVO";
      return;
    }
    const companyIdno = params.get("idno");
    const companyRecord = companyIdno
      ? state.records.find((record) => record.beneficiary.type === "company" && record.beneficiary.identifier === companyIdno)
      : null;
    state.companyFilter = companyRecord ? { ...companyRecord.beneficiary } : null;
    state.search = companyRecord ? companyRecord.beneficiary.identifier : "";
    elements.search.value = state.search;
    syncSearchState();
    state.page = 1;
    closeProfile({ updateHistory: false });
    applyFilters();
  };

  const bindEvents = () => {
    elements.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      syncSearchState();
      searchTimer = window.setTimeout(() => {
        state.search = elements.search.value.trim();
        state.companyFilter = null;
        state.page = 1;
        const url = new URL(window.location.href);
        if (url.searchParams.has("idno")) {
          url.searchParams.delete("idno");
          window.history.replaceState({ rapCompanyIdno: null }, "", url);
        }
        applyFilters();
      }, 120);
    });

    elements.searchClear.addEventListener("click", clearSearch);

    elements.pageSize.addEventListener("change", () => {
      state.pageSize = Number(elements.pageSize.value);
      state.page = 1;
      render();
    });

    elements.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) {
        return;
      }
      state.page = Number(button.dataset.page);
      render();
      elements.tableScroller.scrollTo({ left: 0, behavior: "smooth" });
      document.querySelector(".rap-register").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.tableBody.addEventListener("click", (event) => {
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        event.stopPropagation();
        handleCopyButton(copyButton);
        return;
      }

      const link = event.target.closest(".rap-act-link");
      if (link && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) {
        return;
      }
      const row = event.target.closest("[data-record-id]");
      if (row) {
        event.preventDefault();
        openProfile(row.dataset.recordId);
      }
    });

    elements.tableBody.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const row = event.target.closest("[data-record-id]");
        if (row) {
          event.preventDefault();
          openProfile(row.dataset.recordId);
        }
      }
    });

    elements.profileView.addEventListener("click", async (event) => {
      const backButton = event.target.closest("[data-rap-profile-back]");
      if (backButton) {
        closeProfile();
        return;
      }

      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        await handleCopyButton(copyButton);
        return;
      }

      const companyPermitsButton = event.target.closest("[data-rap-company-permits]");
      if (companyPermitsButton && state.activeRecord?.beneficiary.type === "company") {
        showCompanyPermits(state.activeRecord);
        return;
      }

      const viewButton = event.target.closest("[data-rap-view-document]");
      if (viewButton && state.activeRecord) {
        openActData(state.activeRecord, viewButton);
      }
    });

    window.addEventListener("popstate", syncViewFromUrl);

    document.addEventListener("pointerover", (event) => {
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        positionCopyTooltip(copyButton);
      }
      const target = event.target.closest("[data-tooltip]");
      if (target) {
        showTooltip(target);
      }
    });
    document.addEventListener("pointerout", (event) => {
      if (event.target.closest("[data-tooltip]")) {
        hideTooltip();
      }
    });
    window.addEventListener("scroll", hideTooltip, true);
    let paginationResizeTimer;
    window.addEventListener("resize", () => {
      hideTooltip();
      window.clearTimeout(paginationResizeTimer);
      paginationResizeTimer = window.setTimeout(renderPagination, 100);
    });

    document.querySelectorAll(".rap-header__languages button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".rap-header__languages button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });
  };

  const init = async () => {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        throw new Error(`Datele RAP nu au putut fi încărcate (${response.status}).`);
      }

      state.config = await response.json();
      state.records = expandRecords(state.config.records, state.config.meta.totalResults);
      state.page = state.config.pagination.initialPage;
      state.pageSize = state.config.pagination.defaultPageSize;
      elements.title.textContent = state.config.page.title;
      elements.subtitle.textContent = state.config.page.subtitle;
      elements.search.placeholder = state.config.page.searchPlaceholder;
      initFacetFilter();
      renderPageSizeOptions();
      bindEvents();
      applyFilters();
      syncViewFromUrl();
    } catch (error) {
      console.error(error);
      elements.empty.hidden = false;
      elements.empty.innerHTML = window.GEAPEmptyState.render({ title: "Datele nu au putut fi încărcate", text: "Reîncărcați pagina sau încercați mai târziu.", icon: "circle-error" });
      document.querySelector(".rap-register").hidden = true;
    }
  };

  init();
})();
