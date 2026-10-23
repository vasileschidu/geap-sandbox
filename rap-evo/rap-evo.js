(() => {
  "use strict";

  const DATA_URL = "../data/rap-evo.json?v=act-fields-v1";
  /* „Filtru” = the BO advanced filter (js/facet-filter.js): one facet per column that
     makes sense to filter, values read from the records (no new data) */
  const beneficiaryType = (record) => (record.beneficiary.type === "person" ? "Persoană fizică" : "Persoană juridică");
  /* „Aprobat tacit” in the Statut facet (US-141): a pseudo-status = acts with Aprobare tacită = true,
     whatever their status */
  const FACETS = [
    { key: "status", label: "Statut", get: (record) => [record.status, ...((record.markings || []).includes("Aprobat tacit") ? ["Aprobat tacit"] : [])] },
    { key: "denumire", label: "Denumire act", search: true, get: (record) => record.permit.name },
    { key: "autoritate", label: "Autoritate", search: true, get: (record) => record.authority.name },
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

  /* the trail above the list title and the act profile title = the library breadcrumb as Figma Components 232:5282
     (the component everywhere): the ONE renderer (../js/breadcrumbs.js). Desktop = the PARENT levels only, chevrons
     only between them (no trailing one, breadcrumb-no-trailing-v1) (`parentsOnly`, breadcrumb-v3, user 2026-10-21: „The breadcrumbs should not display
     «Autorizația pentru importul, exportul sau reex…» — it's already there”): the H1 right below is the current page
     (list „Registrul actelor permisive”, profile = the act's name), so the trail never repeats it. Phones = „‹ parent”.
     .rap-breadcrumbs = reveal hook */
  const RAP_CRUMBS = [{ label: "Acasă", href: "../index.html" }, { label: "Resurse utile", href: "#" }];
  /* act-profile-url-v1 (2026-10-22, user: „act permisiv profile should have a unique URL”): every profile is
     ?act=<record id> on this page (static hosting: a query parameter, no server rewrite). The list's address = the
     current one without `act` (and without the demo `state`); the profile's = the list's + `act`. The breadcrumb parent
     and the act name in the table are real links to these addresses (middle-click, new tab, copy link). */
  const pageUrl = (recordId = null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("state");
    if (recordId) url.searchParams.set("act", recordId); else url.searchParams.delete("act");
    url.hash = "";
    return `${url.pathname}${url.search}`;
  };
  const listCrumb = () => ({ label: "Registrul actelor permisive", href: pageUrl(), attr: "data-rap-profile-back" });
  const crumbsHtml = (current = null) => window.GEAPBreadcrumbs?.html(current
    ? [...RAP_CRUMBS, listCrumb(), { label: current }]
    : [...RAP_CRUMBS, { label: "Registrul actelor permisive" }], { parentsOnly: true, className: "rap-breadcrumbs" }) || "";
  const listCrumbs = document.querySelector("[data-rap-list-crumbs]");
  if (listCrumbs) listCrumbs.outerHTML = crumbsHtml();

  const elements = {
    title: document.querySelector("[data-rap-title]"),
    search: document.querySelector("[data-rap-search]"),
    searchClear: document.querySelector("[data-rap-search-clear]"),
    tableBody: document.querySelector("[data-rap-table-body]"),
    tableScroller: document.querySelector("[data-rap-table-scroller]"),
    pagination: document.querySelector("[data-rap-pagination]"),
    empty: document.querySelector("[data-rap-empty]"),
    filterToggle: document.querySelector("[data-rap-filter-toggle]"),
    filterBar: document.querySelector("[data-rap-filters]"),
    filterCount: document.querySelector("[data-rap-filter-count]"),
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
    /* US-162 AC-07: Expirat, Retras, Anulat = red (the BO list, US-196, keeps Expirat grey — PO to align) */
    "Expirat": "danger",
    "Retras": "danger",
    "Anulat": "danger"
  }[status] || "neutral");
  /* the BO renderTag markup (Tag · Small, css/bo-profile-parts.css) */
  const statusTag = (status) => `<span class="${window.GEAPTag.cls(statusTone(status))}">${escapeHtml(status)}</span>`;
  /* tacit approval (Figma comment G. 1868591457; US-139 AC-02, US-142 / US-162 AC-08): an act with
     Aprobare tacită = true (the RAP marking „Aprobat tacit”) that is Valabil shows ONE blue Small tag
     „Aprobare tacită” INSTEAD of „Valabil” (tacit-tag-v1, user 2026-10-21: it implies valid; screen
     readers hear „Aprobare tacită (valabil)”) — in the list, the header and the Stare row alike; any
     other status shows its own tag only. The field „Data aprobării tacite” (date only) stays right above
     „Data eliberării” wherever the act's details are listed (AC-08: badge + date) */
  const TACIT_MARK = "Aprobat tacit";
  const isTacit = (record) => (record.markings || []).includes(TACIT_MARK);
  const showTacitBadge = (record) => isTacit(record) && record.status === "Valabil";
  const tacitTag = () => '<span class="status-tag status-tag--brand is-subtle status-tag--small">Aprobare tacită<span class="u-visually-hidden"> (valabil)</span></span>';
  /* deviation from US-139 AC-02 („alături de Status”), user decision — to confirm with the PO */
  const statusTags = (record) => (showTacitBadge(record) ? tacitTag() : statusTag(record.status));
  /* details (user 2026-10-17): ONE row, in date order before „Data eliberării” — the date only */
  const tacitDateRow = (record, profile) => (isTacit(record) && profile.tacitDate
    ? [["Data aprobării tacite", escapeHtml(profile.tacitDate)]]
    : []);

  /* US-162 AC-17: status-dependent dates — „Data suspendării actului permisiv” (the suspension decision
     was signed) + „Suspendat până la data de” ONLY for Suspendat, „Data retragerii actului permisiv”
     ONLY for Retras; listed in date order after „Valabil din data”, before „Data expirării” (the
     original validity end, kept) */
  const statusDateRows = (record, profile) => [
    ...(record.status === "Suspendat"
      ? [["Data suspendării actului permisiv", profile.suspendedOn], ["Suspendat până la data de", profile.suspendedUntil]]
      : []),
    ...(record.status === "Retras" ? [["Data retragerii actului permisiv", profile.withdrawnOn]] : [])
  ].filter(([, value]) => value);
  /* the header meta beside Stare: a suspended act shows when the suspension ends, a withdrawn one when
     it was withdrawn — never „Valabil din data”, which read as „valid until the expiry date” */
  const headerDateItem = (record, profile) => {
    if (record.status === "Suspendat" && profile.suspendedUntil) return ["Suspendat până la", profile.suspendedUntil];
    if (record.status === "Retras" && profile.withdrawnOn) return ["Retras la", profile.withdrawnOn];
    return ["Valabil din data", profile.validFrom];
  };

  const icon = (name, className = "icon") => `
    <svg class="${className}" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-${name}"></use></svg>
  `;

  const isMaskedValue = (value) => /[•*]/u.test(String(value));

  /* Copy value — the shared component (../js/copy-value.js): profile header, detail rows, the act dialogs; the table
     (Nr. act, IDNO) = the COMPACT variant (no icon, the number itself copies — copy-wrap-v1, 2026-10-21). A masked
     identifier is never copyable. */
  const copyValue = (value, label = "", options = {}) => window.GEAPCopyValue?.html(value, { label: label || `Copiază ${value}`, ...options }) || escapeHtml(value);

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
      suspendedOn: fullMonthDate(profile.suspensionDate),
      suspendedUntil: fullMonthDate(profile.suspendedUntil),
      withdrawnOn: fullMonthDate(profile.withdrawalDate),
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
      <span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${escapeHtml(label)}</span>
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
      ["Stare", statusTags(record), false, true],
      ["Numărul actului permisiv", record.permit.number, true],
      ["Numărul dosarului electronic", record.permit.paperNumber, true],
      ["Seria și nr. documentului tipărit", profile.printedDocumentNumber, true],
      ...tacitDateRow(record, profile).map(([label, value]) => [label, value, false, true]),
      ["Data eliberării", profile.issuedDate],
      ["Valabil din data", profile.validFrom],
      ...statusDateRows(record, profile),
      ["Data expirării", profile.validUntil]
    ];
    const [headerDateLabel, headerDateValue] = headerDateItem(record, profile);
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
        <!-- the shared page header (rap-header-v1, 2026-10-22, user: „the same changes with the header [as the Cabinet
             profiles]: remove the padding, and the same with the actions”): js/page-header.js (GEAPPageHeader, the BO
             renderer) — breadcrumb (parents only) · H1 (wraps) · the action row UNDER the title (actionsPlacement
             "below": long names are never squeezed beside it; one primary, Medium 40 — phones too) · the details.
             Phones: phoneTitle "compact" = H1 20/28, a long name stops at 4 lines with „Mai mult / Mai puțin”
             (js/name-expand.js multi-line mode, scanned after the render).
             The public registry has no location line: the object's address is a specific field, behind „Vezi act
             permisiv” (US-162) -->
        <header class="e-permits-page-header rap-profile__header" data-rap-profile-header>
          <div class="e-permits-page-header__body">
            <div class="e-permits-page-header__top">${window.GEAPPageHeader.top({
              crumbs: [...RAP_CRUMBS, listCrumb(), { label: record.permit.name }],
              title: record.permit.name,
              titleId: "rap-profile-title",
              wrap: true,
              phoneTitle: "compact",
              actionsPlacement: "below",
              actions: `<button class="btn btn-primary btn-md" type="button" aria-haspopup="dialog" data-rap-view-document><span>Vezi act permisiv</span></button>` /* label only, no eye (user 2026-10-23) */
            })}</div>
            <div class="e-permits-page-header__meta" data-rap-profile-meta>
              ${renderProfileSummaryItem("Numărul actului", record.permit.number, { copy: true })}
              ${renderProfileSummaryItem("Stare", statusTags(record), { html: true })}
              ${renderProfileSummaryItem(headerDateLabel, headerDateValue)}
              ${renderProfileSummaryItem("Data expirării", profile.validUntil)}
            </div>
          </div>
        </header>

        <div class="e-permits-dosar-profil__panel">
        <section class="e-permits-dosar-profil__section" aria-labelledby="rap-beneficiary-title">
          <h2 class="e-permits-dosar-profil__section-title" id="rap-beneficiary-title">Beneficiar</h2>
          <div class="rap-profile__beneficiary-card">
            <span class="avatar avatar--md avatar--icon rap-profile__beneficiary-avatar" aria-hidden="true">${icon(beneficiaryIcon)}</span>
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
    window.GEAPNameExpand?.scan(elements.profileView.querySelector("[data-rap-profile-header]"));
    const meta = elements.profileView.querySelector("[data-rap-profile-meta]");
    syncMetaRows(meta);
    metaObserver?.observe(meta);
  };

  /* US-142 AC-16: an unknown ?act= says so, with the way back = the breadcrumb (act-profile-url-v1: the profile's
     header with the parent levels only, then the library empty state; no second „Înapoi” button) */
  const NOT_FOUND = "Actul permisiv nu a fost găsit";
  const renderProfileNotFound = () => {
    elements.profileView.innerHTML = `
      <div class="rap-profile__container">
        <header class="e-permits-page-header rap-profile__header" data-rap-profile-header>
          <div class="e-permits-page-header__body">
            <div class="e-permits-page-header__top">
              <div class="e-permits-page-header__heading">${window.GEAPBreadcrumbs?.html([...RAP_CRUMBS, listCrumb(), { label: NOT_FOUND }], { truncate: true, parentsOnly: true }) || ""}</div>
            </div>
          </div>
        </header>
        <div class="rap-state">
          ${window.GEAPEmptyState.render({ title: NOT_FOUND, text: "Linkul nu mai este valabil sau actul nu există în registru.", icon: "search" })}
        </div>
      </div>
    `;
  };

  /* ---- the act's dialogs — „Vizualizare act” (US-162 AC-12: the BO detail modal with the act's
     specific fields by form section) and its „Descarcă” → „Forma de tipar a actului” (US-143: MDocs A4
     form, paginated, Imprimă) — are the shared GEAPActView (js/act-view.js + css/act-view.css, 2026-10-17:
     the EVO Cabinet owner's act profile opens the same dialogs). Here only the RAP record → view model. */
  const permanentUrl = (record) => `${window.location.origin}${window.location.pathname}?act=${encodeURIComponent(record.id)}`;

  /* the configured groups as they are (simple fields + grids, GEAPActView.normalizeFields reads every shape);
     the older flat address / activity / fields = one untitled group */
  const actSpecificGroups = (record) => {
    const doc = normalizeProfile(record).document || {};
    if (doc.sections?.length) return window.GEAPActView.normalizeFields(doc.sections);
    return window.GEAPActView.normalizeFields([["Adresa obiectului", doc.address], ["Genul de activitate", doc.activity], ...(doc.fields || [])]);
  };

  const toActView = (record) => {
    const profile = normalizeProfile(record);
    return {
      id: record.id,
      name: record.permit.name,
      number: record.permit.number,
      status: record.status,
      tone: statusTone(record.status),
      watermark: record.status !== "Valabil",
      authority: record.authority.name,
      office: profile.office,
      beneficiary: { name: record.beneficiary.name, person: record.beneficiary.type === "person", idType: record.beneficiary.identifierType, id: record.beneficiary.identifier },
      tacitDate: isTacit(record) && profile.tacitDate ? profile.tacitDate : "",
      tacitBadge: showTacitBadge(record),
      issuedDate: profile.issuedDate,
      validFrom: profile.validFrom,
      statusDates: statusDateRows(record, profile),
      validUntil: profile.validUntil,
      paperNumber: record.permit.paperNumber,
      printedNumber: profile.printedDocumentNumber,
      groups: actSpecificGroups(record),
      url: permanentUrl(record)
    };
  };

  let actViewInstance = null;
  const actView = () => {
    actViewInstance ||= window.GEAPActView.create({ copyHtml: (value) => copyValue(value, `Copiază numărul actului ${value}`), onCopy: () => {}, copySelector: "[data-copy-value]", bodyOpenClass: "rap-page--act-open" });
    return actViewInstance;
  };

  const renderBeneficiary = (record) => {
    const icon = record.beneficiary.type === "person" ? "person-filled" : "business-filled";
    return `
      <div class="rap-beneficiary">
        <span class="avatar avatar--xs avatar--icon rap-beneficiary__avatar" aria-hidden="true">
          <svg class="icon"><use href="../assets/icons/sprite.svg#icon-${icon}"></use></svg>
        </span>
        <span class="rap-beneficiary__copy">
          <span class="rap-beneficiary__name rap-clamp" data-cell-tooltip="${escapeHtml(record.beneficiary.name)}">${escapeHtml(record.beneficiary.name)}</span>
          ${isMaskedValue(record.beneficiary.identifier)
            ? `<span class="rap-beneficiary__identifier rap-ellipsis" data-cell-tooltip="${escapeHtml(record.beneficiary.identifier)}">${escapeHtml(record.beneficiary.identifier)}</span>`
            : copyValue(record.beneficiary.identifier, `Copiază ${record.beneficiary.identifierType || "IDNO"} ${record.beneficiary.identifier}`, { compact: true, className: "rap-beneficiary__identifier" })}
        </span>
      </div>
    `;
  };

  /* rap-table-flat-v1 (2026-10-23, user + Ramona): Beneficiar = the key column (widest, 2-line clamp), Denumire act
     2-line clamp — both with the full text in the tooltip only when cut; Autoritate = the abbreviation only, the full
     name in the plain tooltip (hover; keyboard: the row's focus shows it, `data-tooltip-focus`) and in the row's
     name / a visually hidden text for screen readers; the last cell = the bare chevron (aria-hidden; v2 — the bordered
     button of v1 was rejected), the row is the click / keyboard target */
  const renderRow = (record) => `
    <tr tabindex="0" data-tooltip-focus data-record-id="${escapeHtml(record.id)}" aria-label="Deschide ${escapeHtml(record.permit.name)} pentru ${escapeHtml(record.beneficiary.name)}, emis de ${escapeHtml(record.authority.name)}">
      <td>${renderBeneficiary(record)}</td>
      <td>
        <a class="rap-clamp rap-act-link" href="${escapeHtml(pageUrl(record.id))}" tabindex="-1" data-cell-tooltip="${escapeHtml(record.permit.name)}">${escapeHtml(record.permit.name)}</a>
      </td>
      <td>
        <span class="rap-authority" data-tooltip-text="${escapeHtml(record.authority.name)}"><span aria-hidden="true">${escapeHtml(record.authority.code)}</span><span class="visually-hidden">${escapeHtml(record.authority.name)} (${escapeHtml(record.authority.code)})</span></span>
      </td>
      <td>
        <span class="rap-cell-stack">
          ${copyValue(record.permit.number, `Copiază numărul actului ${record.permit.number}`, { compact: true, className: "rap-act-number" })}
          <span class="rap-cell-stack__secondary rap-ellipsis" data-cell-tooltip="${escapeHtml(record.permit.paperNumber)}">Dosar: ${escapeHtml(record.permit.paperNumber)}</span>
        </span>
      </td>
      <td>
        <span class="rap-cell-stack">
          <span class="rap-cell-stack__primary">${escapeHtml(record.permit.validThrough)}</span>
          <span class="rap-cell-stack__secondary">${escapeHtml(record.permit.issuedAt)}</span>
        </span>
      </td>
      <td>${statusTags(record)}</td>
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
        <span class="avatar avatar--md avatar--icon rap-company-summary__avatar" aria-hidden="true">${icon("business-filled")}</span>
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

  /* sideways-scroll cue (rap-table-scroll-v1) = the BO passport tabs fade (syncPassportTabOverflow in
     e-permits-shell.js): fade the edge that hides more columns; none without overflow; no arrows (user) */
  const syncTableOverflow = () => {
    const scroller = elements.tableScroller;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const start = scroller.scrollLeft > 1;
    const end = max - scroller.scrollLeft > 1;
    scroller.classList.toggle("has-overflow-start", start);
    scroller.classList.toggle("has-overflow-end", end);
  };

  const renderTable = () => {
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filteredRecords.slice(start, start + state.pageSize);
    elements.tableBody.innerHTML = rows.map(renderRow).join("");
    elements.empty.hidden = rows.length > 0;
    document.querySelector(".rap-register").hidden = rows.length === 0;
    window.requestAnimationFrame(syncTableOverflow);

    if (rows.length === 0) {
      /* the shared empty state (js/empty-state.js); filters applied → the bar's „Șterge filtrele” */
      const filters = totalActiveFilters();
      elements.empty.innerHTML = window.GEAPEmptyState.noResults("Ne pare rău, nu am găsit niciun rezultat", {
        text: filters ? "Modificați căutarea sau ștergeți filtrele aplicate." : "Verificați ortografia sau încercați alți termeni.",
        actionHtml: filters ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : ""
      });
    }
  };

  /* the list pager = the shared GEAPPager (js/pager.js, audit-fix-v3) */
  const renderPagination = () => {
    elements.pagination.innerHTML = window.GEAPPager.html({
      total: state.filteredRecords.length,
      page: state.page,
      perPage: state.pageSize,
      sizes: state.config.pagination.pageSizes,
      prefix: "rap",
      label: "Paginarea actelor permisive",
      sizeLabel: "Acte pe pagină",
      sprite: "../assets/icons/sprite.svg"
    }).trim();
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
        ? `<span class="status-tag status-tag--brand is-subtle status-tag--small">${TACIT_MARK}</span>` : statusTag(value)),
      total: () => state.filteredRecords.length,
      /* phones: one scrolling chip row + bottom sheets with a live „Arată N rezultate” */
      mobileSheets: true,
      preview: (selection) => state.records.filter((record) => matchesSearch(record) && matchesFacets(record, null, selection)).length,
      apply: () => { state.page = 1; applyFilters(); },
      scrollers: [elements.tableScroller]
    });
  };

  /* cut names in the table: data-cell-tooltip on the ONE tooltip runtime (js/icon-tooltip.js) */
  const hideTooltip = () => window.GEAPTooltip?.hide();

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

  /* opening a profile from the list: the list's history entry first remembers what the list showed (search, company,
     page, page size, scroll), then the profile is PUSHED — Back (browser or breadcrumb) pops it and the list comes
     back as it was; the facet filters live in the page state (and its session key) anyway */
  const updateProfileUrl = (recordId, { replace = false } = {}) => {
    if (recordId && !replace && !state.activeRecord) {
      window.history.replaceState({ ...(window.history.state || {}), rapList: { search: state.search, company: state.companyFilter, page: state.page, pageSize: state.pageSize, scrollY: window.scrollY } }, "", pageUrl());
    }
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ rapRecordId: recordId || null, rapFromList: Boolean(recordId && !state.activeRecord) }, "", pageUrl(recordId));
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

    actViewInstance?.closeDocument({ toData: false });
    actViewInstance?.closeData({ restoreFocus: false });
    if (updateHistory) {
      updateProfileUrl(record.id);
    }
    state.activeRecord = record;
    renderProfile(record);
    elements.listView.hidden = true;
    elements.profileView.hidden = false;
    document.body.classList.add("rap-page--profile");
    document.title = `${record.permit.name} · EVO`;
    facetFilter?.close(false);
    hideTooltip();
    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  };

  const closeProfile = ({ updateHistory = true, scroll = true } = {}) => {
    actViewInstance?.closeDocument({ toData: false });
    actViewInstance?.closeData({ restoreFocus: false });
    state.activeRecord = null;
    elements.profileView.hidden = true;
    elements.listView.hidden = false;
    elements.profileView.innerHTML = "";
    document.body.classList.remove("rap-page--profile");
    document.title = "Registrul actelor permisive · EVO";
    if (updateHistory) {
      updateProfileUrl(null);
    }
    if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
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
      document.title = `${NOT_FOUND} · EVO`;
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    /* back on the list entry the profile was opened from: the list as it was (search, company, page, scroll) */
    const saved = window.history.state?.rapList;
    if (saved) {
      state.companyFilter = saved.company || null;
      state.search = saved.search || "";
      state.page = saved.page || 1;
      state.pageSize = saved.pageSize || state.pageSize;
      elements.search.value = state.search;
      syncSearchState();
      closeProfile({ updateHistory: false, scroll: false });
      applyFilters();
      window.scrollTo({ top: saved.scrollY || 0, behavior: "auto" });
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

    /* the table's scroll cue follows scroll / resize */
    elements.tableScroller?.addEventListener("scroll", syncTableOverflow, { passive: true });
    window.addEventListener("resize", syncTableOverflow);

    elements.pagination.addEventListener("click", (event) => {
      const size = event.target.closest("[data-rap-per-page]");
      if (size) {
        state.pageSize = Number(size.dataset.rapPerPage);
        /* „Afișează mai multe” (phone pager) names the page that keeps the current first row; the size menu → page 1 */
        state.page = Number(size.dataset.rapPage) || 1;
        render();
        return;
      }
      const button = event.target.closest("[data-rap-page]");
      if (!button || button.disabled) {
        return;
      }
      state.page = Number(button.dataset.rapPage);
      render();
      elements.tableScroller.scrollTo({ left: 0, behavior: "smooth" });
      document.querySelector(".rap-register").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.tableBody.addEventListener("click", (event) => {
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
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (window.history.state?.rapFromList) {
          window.history.back();
          return;
        }
        if (state.activeRecord) closeProfile();
        else { window.history.pushState({ rapRecordId: null }, "", pageUrl()); syncViewFromUrl(); }
        return;
      }

      const companyPermitsButton = event.target.closest("[data-rap-company-permits]");
      if (companyPermitsButton && state.activeRecord?.beneficiary.type === "company") {
        showCompanyPermits(state.activeRecord);
        return;
      }

      const viewButton = event.target.closest("[data-rap-view-document]");
      if (viewButton && state.activeRecord) {
        actView().openData(toActView(state.activeRecord), viewButton);
      }
    });

    window.addEventListener("popstate", syncViewFromUrl);
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    let paginationResizeTimer;
    window.addEventListener("resize", () => {
      window.clearTimeout(paginationResizeTimer);
      paginationResizeTimer = window.setTimeout(renderPagination, 100);
    });

    /* the language switch lives in the shared EVO header (js/evo-header.js, evo-header-v1) */
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
      elements.search.placeholder = state.config.page.searchPlaceholder;
      initFacetFilter();
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
