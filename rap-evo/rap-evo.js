(() => {
  "use strict";

  const DATA_URL = "../data/rap-evo.json?v=rap-data-v1";
  /* the shared authorities / subdivisions source (BO „Autorități”, US-87…96): names + codes win over the RAP list */
  const AUTHORITIES_URL = "../data/autoritati.json?v=rap-filter-v1";
  /* RAP API failures for the demo (US-141 AC-02/03 + Risks / AC-20): ?rapapi=eroare-autoritati, eroare-tipuri,
     eroare-filtrare (comma-separated) */
  const API_ERRORS = new Set((new URLSearchParams(window.location.search).get("rapapi") || "").split(",").map((v) => v.trim()).filter(Boolean));
  const LIST_UNAVAILABLE = "Lista nu este disponibilă momentan.";
  /* „Filtru” = the shared facet filter (js/facet-filter.js), US-141 (rap-filter-v1, 2026-11-04): AND across facets, OR
     inside one, together with the search; the lists hold only values with ≥ 1 act in the registry (AC-02/03) */
  const beneficiaryType = (record) => (record.beneficiary.type === "person" ? "Persoană fizică" : "Persoană juridică");
  /* Statut (US-141 AC-06): the statuses in the story's order + the pseudo-status „Aprobat tacit” = acts with Aprobare
     tacită = true whatever their status (a separate on/off chip was tried in rap-g and taken back, user 2026-11-04) */
  const STATUS_VALUES = ["Valabil", "Suspendat", "Expirat", "Retras", "Anulat", "Aprobat tacit"];
  /* the act's service (Serviciu facet, rap-g): the RSSP service family of the act name */
  const SERVICE_RULES = [
    [/sanitar-veterinar|fitosanitar|uz veterinar|sanitar-veterinară/i, "Siguranța alimentelor"],
    [/sanitar|biocide|cosmetice|contactul cu alimentele|contactului cu alimentele/i, "Autorizare sanitară"],
    [/medicament|farmaceutic|dispozitiv/i, "Medicamente și dispozitive medicale"],
    [/alcool|tutun|bere/i, "Alcool și tutun"],
    [/energi|gaz|petrolier/i, "Energetică"],
    [/comunicații|frecvențe|numerotare/i, "Comunicații electronice"],
    [/taxi|transportator|transport rutier|dimensiuni sau mase/i, "Transport rutier"],
    [/incendiu/i, "Securitate la incendiu"],
    [/mediu|deșeuri|emisiile|apei|arbori|ozon|subsol|zăcăminte|pescuit|forestier/i, "Mediu și resurse naturale"],
    [/urbanism|construire|desființare|amplasare|publicit|proiect/i, "Urbanism și construcții"],
    [/comerț|alimentație publică|pieței|ambulant/i, "Comerț și alimentație publică"],
    [/conformitate|metrolog|măsurare|origine/i, "Metrologie și conformitate"],
    [/bancar|valutar|asigurare|creditare|broker/i, "Servicii financiare"],
    [/audiovizual/i, "Audiovizual"],
    [/caracter personal/i, "Protecția datelor"],
    [/vamal|antrepozit|agent economic autorizat/i, "Vamă"],
    [/accize|casă și de control/i, "Fiscalitate"],
    [/muncă|forței de muncă/i, "Muncă și ocupare"],
    [/aerian|zbor|aeronav/i, "Aviație civilă"],
    [/nav/i, "Transport naval"],
    [/arme/i, "Arme și muniții"],
    [/radiații/i, "Activități nucleare și radiologice"],
    [/aprobării tacite/i, "Aprobare tacită"]
  ];
  const serviceOf = (name) => (SERVICE_RULES.find(([re]) => re.test(name)) || [null, "Alte acte permisive"])[1];
  /* the address filter (rap-g, Alexandru's comment: „like the FO address”): Raion / municipiu → Localitate → Stradă */
  const PATH_SEP = " › ";
  const addressTree = () => (state.config?.registry?.addresses || []).map((r) => ({
    name: r.raion,
    children: r.localities.map((l) => ({ name: l.name, children: l.streets.map((street) => ({ name: street })) }))
  }));
  /* order (user 2026-11-04, the smart search already finds act numbers, companies / IDNO, addresses, authorities and act
     names): inline Statut · Autoritate emitentă (+ Subdiviziune as soon as an authority is ticked, rap-promote-v1) · Data eliberării · Data expirării; „Mai multe” = Denumire act ·
     Subdiviziune · Serviciu (the cascade: their options follow the ticked authorities / subdivisions) · Adresă (Raion →
     Localitate → Stradă) · Tip beneficiar — a facet with a value shows as its own chip group. Dates = plain De la / Până
     la ranges (US-141 AC-07/08) */
  const FACETS = [
    { key: "status", label: "Statut", get: (record) => [record.status, ...(isTacit(record) ? [TACIT_MARK] : [])] },
    { key: "autoritate", label: "Autoritate emitentă", search: true, get: (record) => record.authority.name, unavailable: () => (API_ERRORS.has("eroare-autoritati") ? LIST_UNAVAILABLE : null) },
    /* Subdiviziune: a chip right after Autoritate while one is ticked (promoteWhen, js/facet-filter.js), else under „Mai multe” */
    { key: "subdiviziune", label: "Subdiviziune", search: true, inMore: true, promoteWhen: (draft) => (draft.autoritate || []).length > 0, get: (record) => record.profile?.office || "" },
    { key: "emitere", label: "Data eliberării", chip: "Eliberat", type: "date", presets: [], get: (record) => record.dates.issued },
    { key: "expirare", label: "Data expirării", chip: "Expiră", type: "date", presets: [], get: (record) => record.dates.expires },
    { key: "denumire", label: "Denumire act", search: true, inMore: true, get: (record) => record.permit.name, unavailable: () => (API_ERRORS.has("eroare-tipuri") ? LIST_UNAVAILABLE : null) },
    { key: "serviciu", label: "Serviciu", search: true, inMore: true, get: (record) => record.service },
    { key: "adresa", label: "Adresă", type: "path", multiLeaf: true, leafPlural: "străzi", inMore: true, levels: ["Raion / municipiu", "Localitate", "Stradă"], tree: addressTree,
      chipText: (path) => (path.length > 1 ? path.slice(1).join(", ") : path[0]), get: (record) => (record.addressPath || []).join(PATH_SEP) },
    { key: "beneficiar", label: "Tip beneficiar", inMore: true, get: beneficiaryType }
  ];
  const facetOf = (key) => FACETS.find((f) => f.key === key);
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
    companySummary: document.querySelector("[data-rap-company-summary]"),
    live: document.querySelector("[data-rap-live]")
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

  /* „4 ian. 2025” / „emis 3 iulie 2030” → ISO day (the date facets match on it) */
  const MONTH_INDEX = { ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6, iul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, noi: 11, dec: 12 };
  const MONTH_SHORT = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
  const isoDay = (text) => {
    const m = /(\d{1,2})\s+([a-zăâîșț]+)\.?\s+(\d{4})/iu.exec(String(text || ""));
    const month = m && MONTH_INDEX[m[2].toLowerCase().slice(0, 4)] || (m && MONTH_INDEX[m[2].toLowerCase().slice(0, 3)]);
    return month ? `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
  };
  const shiftIso = (iso, days) => {
    const [y, mo, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1, d + days)).toISOString().slice(0, 10);
  };
  const shortDate = (iso) => { const [y, mo, d] = iso.split("-").map(Number); return `${d} ${MONTH_SHORT[mo - 1]} ${y}`; };

  /* the issuing authorities of the registry (US-141 AC-02; real Moldovan public authorities + their subdivisions):
     data/rap-evo.json › registry, merged with data/autoritati.json (the BO module's source: its names win, its extra
     authorities / subdivisions join). `noActs` authorities get no act → they never reach the facet. */
  const buildRegistry = (config, shared) => {
    const byCode = new Map((config.registry?.authorities || []).map((a) => [a.code, { code: a.code, name: a.name, subdivisions: [...(a.subdivisions || [])] }]));
    (shared?.authorities || []).filter((a) => a.code && a.active !== false).forEach((a) => {
      const entry = byCode.get(a.code) || { code: a.code, name: a.nameRo, subdivisions: [] };
      entry.name = a.nameRo || entry.name;
      (shared.subdivisions || []).filter((sub) => sub.authorityId === a.id && sub.active !== false).forEach((sub) => { if (!entry.subdivisions.includes(sub.name)) entry.subdivisions.push(sub.name); });
      byCode.set(a.code, entry);
    });
    const noActs = new Set(config.registry?.noActs || []);
    /* the act names (Denumire act, AC-03) with the authorities that issue them */
    const types = (config.registry?.actTypes || []).map((t) => ({ name: t.name, authorities: t.authorities.filter((code) => byCode.has(code) && !noActs.has(code)) })).filter((t) => t.authorities.length);
    return { byCode, types, pool: [...byCode.values()].filter((a) => !noActs.has(a.code)) };
  };

  /* the demo registry: the seed acts as they are, then copies spread over every authority (and one of its
     subdivisions as the issuing office) with issue / expiry dates moved back a few days per copy, so the
     authority list is long and the date ranges have something to find */
  const expandRecords = (seedRecords, total, registry, registryAddresses) => {
    /* the act's object / activity address (the search + suggestions, rap-suggest-v1): the seed's own, else one of the
       registry's addresses (a few acts share each, so „Adrese” can say how many) */
    /* every street of the Raion → Localitate → Stradă tree; the act's address = „<raion>[, <localitate>], <stradă> <nr>” */
    const streets = (registryAddresses || []).flatMap((r) => r.localities.flatMap((l) => l.streets.map((street) => [r.raion, l.name, street])));
    const addressText = ([raion, locality, street], nr) => `${raion}${raion.endsWith(locality) ? "" : `, ${locality}`}, ${street}${nr ? ` ${nr}` : ""}`;
    const pathOfText = (text) => {
      for (const [raion, locality, street] of streets) if (text.includes(raion) && text.includes(locality) && text.includes(street)) return [raion, locality, street];
      return null;
    };
    const withDates = (record, k = 0) => {
      const own = record.profile?.document?.address;
      const path = (record.addressPath?.length && record.addressPath) || (own && pathOfText(own)) || (streets.length ? streets[(k * 7) % streets.length] : null);
      record.addressPath = path || [];
      record.address = own || (path ? addressText(path, 1 + ((k * 13) % 9) * 4) : "");
      record.addressStreet = path ? addressText(path) : "";
      record.service = serviceOf(record.permit.name);
      if (record.profile?.document && !own) record.profile.document = { ...record.profile.document, address: record.address };
      const issued = isoDay(record.permit.issuedAt);
      const expires = isoDay(record.permit.validThrough);
      record.dates = { issued, expires };
      const known = registry.byCode.get(record.authority.code);
      if (known) record.authority.name = known.name;
      return record;
    };
    if (seedRecords.length >= total) {
      return seedRecords.slice(0, total).map((seed, i) => withDates(structuredClone(seed), i));
    }

    /* realistic-data-v1 (user review 2026-11-04: „what is this data?”): the seed acts, then generated acts — many
       different beneficiaries (SRL / SA / ÎI with a 13-digit IDNO, PF anonymised „V*** C***”), each act name issued by
       its own authority (registry.actTypes → issuers; primării only in their municipality), the office = the issuer's
       subdivision of that place when it has one, numbers in the issuer's format („ANSP-2026-01187”, „LIC-2025-2231”,
       „AMDM-10-2026-0118”), dossier „GEAP-<year>-009-0xxxx”, issue dates 2019 … today, validity by act kind, statuses
       mostly Valabil (expired → Expirat). A seeded random, so every load and every demo state sees the same registry. */
    let seedValue = 141;
    const rand = () => { seedValue = (seedValue + 0x6d2b79f5) | 0; let t = Math.imul(seedValue ^ (seedValue >>> 15), 1 | seedValue); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pickOf = (list) => list[Math.floor(rand() * list.length)];
    const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
    const STEMS = ["Agro", "Vin", "Moldo", "Eco", "Nord", "Prut", "Codru", "Nistru", "Bio", "Tehno", "Lacto", "Pan", "Farm", "Construct", "Trans", "Auto", "Energo", "Medi", "Dental", "Alim", "Viti", "Euro", "Basarab", "Dacia", "Floare", "Grâu", "Lumina", "Stejar", "Izvor", "Răzeni", "Carpat", "Delta", "Orizont", "Tezaur", "Real", "Optim", "Prim", "Sigma", "Vector", "Alfa"];
    const ENDS = ["com", "prod", "serv", "grup", "lux", "plus", "trans", "tehnica", "farm", "med", "construct", "impex", "nord", "sud", "vin", "lact", "agro", "market", "logistic", "consult"];
    const FORMS = [["S.R.L.", 0.72], ["S.A.", 0.1], ["Î.I.", 0.18]];
    const form = () => { let x = rand(); for (const [name, w] of FORMS) { if ((x -= w) < 0) return name; } return "S.R.L."; };
    const used = new Set();
    const companies = Array.from({ length: 260 }, () => {
      let name;
      do { name = `${pickOf(STEMS)}${pickOf(ENDS)}`.toUpperCase(); } while (used.has(name));
      used.add(name);
      const f = form();
      return { type: "company", name: f === "Î.I." ? `Î.I. ${name}` : `${name} ${f}`, identifierType: "IDNO", identifier: `10${digits(11)}` };
    });
    const LETTERS = "ABCDEFGHIJLMNOPRSTUVZ";
    const person = () => ({ type: "person", name: `${pickOf([...LETTERS])}*** ${pickOf([...LETTERS])}***`, identifierType: "IDNP", identifier: `${digits(2)}•••••••••${digits(2)}` });
    /* a few busy companies hold many acts, most hold one or two */
    const beneficiary = () => (rand() < 0.16 ? person() : companies[Math.floor(Math.pow(rand(), 1.8) * companies.length)]);
    const PRIMARII = { PMC: "Chișinău", PMB: "Bălți", PCAHUL: "Cahul", PCOMRAT: "Comrat", PORHEI: "Orhei", PUNGHENI: "Ungheni", PSOROCA: "Soroca", PEDINET: "Edineț", PHINCESTI: "Hîncești", PSTRASENI: "Strășeni", PCAUSENI: "Căușeni" };
    const YEARS = (name) => (/urbanism/i.test(name) ? 2 : /construire|desființare/i.test(name) ? 2 : /notificare|înregistrare|certificat de origine/i.test(name) ? 10 : /licență/i.test(name) ? 5 : 1 + Math.floor(rand() * 5));
    const TODAY = "2026-11-04";
    const START = Date.UTC(2019, 0, 1);
    const SPAN = (Date.UTC(2026, 10, 3) - START) / 86400000;
    const numberOf = (code, name, year) => (code === "AMDM" ? `AMDM-10-${year}-${digits(4)}` : /^licență/i.test(name) ? `LIC-${year}-${digits(4)}` : `${code}-${year}-${digits(5)}`);
    /* rap-search-fields-v1 (2026-11-05, Figma comment: the search must find what each service publishes in RAP): the fields
       „Publicare în RAP” of a service puts on the act (label + value) — 1–2 plausible ones per service group for the
       generated acts. Picked from k (NOT from rand, so the seeded registry and every demo record stay as they were). */
    const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const PUBLISHED = {
      "Alcool și tutun": [["Categoria produsului", ["Bere", "Vinuri", "Băuturi spirtoase", "Produse din tutun"]], ["Capacitatea de producție", (k) => `${spaced((20 + (k * 53) % 180) * 1000)} dal / an`]],
      "Comerț și alimentație publică": [["Tipul unității comerciale", ["Magazin", "Restaurant", "Cafenea", "Piață", "Comerț ambulant"]], ["Suprafața comercială", (k) => `${20 + (k * 37) % 480} m²`]],
      "Urbanism și construcții": [["Obiectul autorizat", ["Casă de locuit", "Bloc de locuințe", "Spațiu comercial", "Depozit", "Panou publicitar"]], ["Suprafața construită", (k) => `${60 + (k * 41) % 940} m²`]],
      "Autorizare sanitară": [["Tipul activității", ["Producere alimente", "Depozitare produse alimentare", "Cosmetice", "Servicii de înfrumusețare"]]],
      "Medicamente și dispozitive medicale": [["Tipul activității", ["Farmacie", "Depozit farmaceutic", "Import de medicamente", "Dispozitive medicale"]]],
      "Energetică": [["Tipul activității", ["Furnizare gaze naturale", "Stație de alimentare", "Depozit de produse petroliere", "Producere energie electrică"]], ["Capacitatea", (k) => `${1 + (k * 7) % 48} MW`]],
      "Transport rutier": [["Categoria transportului", ["Taxi", "Marfă", "Pasageri", "Transport internațional"]], ["Numărul de vehicule", (k) => String(1 + (k * 5) % 24)]],
      "Mediu și resurse naturale": [["Resursa", ["Apă", "Deșeuri", "Emisii în atmosferă", "Subsol", "Resurse forestiere"]], ["Volumul anual", (k) => `${spaced((5 + (k * 29) % 90) * 100)} m³`]],
      "Securitate la incendiu": [["Tipul obiectivului", ["Clădire administrativă", "Depozit", "Obiectiv industrial", "Spațiu comercial"]]],
      "Metrologie și conformitate": [["Tipul produsului", ["Mijloace de măsurare", "Jucării", "Echipamente electrice", "Materiale de construcție"]]],
      "Servicii financiare": [["Tipul serviciului", ["Casă de schimb valutar", "Organizație de creditare", "Broker de asigurare", "Servicii de plată"]]]
    };
    const DEFAULT_PUBLISHED = [["Domeniul de activitate", (k, service) => service]];
    const publishedFields = (service, k) => (PUBLISHED[service] || DEFAULT_PUBLISHED).slice(0, k % 3 === 0 ? 1 : 2)
      .map(([label, source], i) => [label, typeof source === "function" ? source(k, service) : source[(k * 7 + i * 3) % source.length]]);
    const generated = Array.from({ length: Math.max(0, total - seedRecords.length) }, (_, k) => {
      const type = registry.types[k % registry.types.length];
      const authority = registry.byCode.get(pickOf(type.authorities));
      const town = PRIMARII[authority.code];
      const places = town ? streets.filter(([, locality]) => locality === town) : streets;
      const path = pickOf(places.length ? places : streets);
      const offices = authority.subdivisions || [];
      const office = offices.find((o) => o.includes(path[1])) || offices[0] || "";
      const issuedIso = new Date(START + Math.floor(rand() * SPAN) * 86400000).toISOString().slice(0, 10);
      const expiresIso = shiftIso(issuedIso, Math.round(YEARS(type.name) * 365.25) - 1);
      const year = issuedIso.slice(0, 4);
      const x = rand();
      const status = expiresIso < TODAY ? "Expirat" : x < 0.04 ? "Suspendat" : x < 0.07 ? "Retras" : x < 0.1 ? "Anulat" : "Valabil";
      const tacit = status === "Valabil" && rand() < 0.06;
      const address = addressText(path, 1 + Math.floor(rand() * 120));
      return {
        id: `rap-${String(10001 + k)}`,
        beneficiary: beneficiary(),
        permit: { name: type.name, number: numberOf(authority.code, type.name, year), paperNumber: `GEAP-${year}-009-0${digits(4)}`, issuedAt: `emis ${shortDate(issuedIso)}`, validThrough: shortDate(expiresIso) },
        authority: { code: authority.code, name: authority.name },
        status,
        markings: tacit ? [TACIT_MARK] : [],
        addressPath: path,
        profile: { office, ...(tacit ? { tacitApprovalDate: shortDate(shiftIso(issuedIso, -2)) } : {}), document: { address, activity: serviceOf(type.name), fields: publishedFields(serviceOf(type.name), k) } }
      };
    });
    /* newest first, as a public register lists them */
    return [...seedRecords.map((seed) => structuredClone(seed)), ...generated]
      .map((record, index) => withDates(record, index))
      .sort((a, b) => b.dates.issued.localeCompare(a.dates.issued));
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
    actViewInstance ||= window.GEAPActView.create({ copyHtml: (value) => copyValue(value, `Copiază numărul actului ${value}`), onCopy: () => {}, copySelector: "[data-copy-value]", bodyOpenClass: "rap-page--act-open", footer: "download" }); /* RAP: no MDocs document, raw data only (2026-10-27) */
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
          ${record.beneficiary.type === "person"
            /* US-141 AC-19 / US-145: a PF beneficiary = „V*** C***”; the IDNP (even masked) is never shown in the list */
            ? '<span class="rap-beneficiary__identifier rap-ellipsis">Persoană fizică</span>'
            : isMaskedValue(record.beneficiary.identifier)
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
    const facet = facetOf(key);
    if (facet?.type === "date") return window.GEAPFacetFilter.dateMatch(values[0], facet.get(record));
    if (facet?.type === "path") { const own = `${facet.get(record)}${PATH_SEP}`; return values.some((value) => own.startsWith(`${value}${PATH_SEP}`)); }
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

  /* rap-g (Alexandru: „agenția mediului” must find the authority): every word of the query must occur, a word of 5+
     letters by its stem (the first 5 letters — Romanian endings: mediului → mediu); the whole phrase still wins */
  const searchMatch = (text, query) => text.includes(query) || query.split(/\s+/).filter(Boolean)
    .every((word) => text.includes(word.length >= 5 ? word.slice(0, 5) : word));

  /* rap-search-fields-v1: every VALUE (never a label) the service publishes on the act — the published activity, the flat
     fields [label, value] and the configured sections (text, a list of values or a grid's rows) */
  const valuesOf = (value) => (Array.isArray(value) ? value.flatMap(valuesOf) : value && typeof value === "object" ? valuesOf(value.rows ?? value.value) : value == null ? [] : [String(value)]);
  const publishedValues = (record) => {
    const doc = record.profile?.document || {};
    const fieldValue = (field) => valuesOf(Array.isArray(field) ? field[1] : field?.rows ?? field?.value);
    return [doc.activity, ...(doc.fields || []).flatMap(fieldValue), ...(doc.sections || []).flatMap((section) => (section.fields || []).flatMap(fieldValue))]
      .filter(Boolean);
  };

  /* the search + company view, before the facets (the facet options are counted on it) */
  const matchesSearch = (record) => {
    const query = normalize(state.search);
    const searchable = normalize([
      record.beneficiary.name,
      record.beneficiary.type === "person" ? "" : record.beneficiary.identifier, /* AC-19: no PF IDNP, not even to search */
      record.permit.name,
      record.permit.number,
      record.permit.paperNumber,
      record.authority.code,
      record.authority.name,
      record.status,
      record.address,
      record.service,
      /* rap-search-fields-v1: the fields the service publishes in RAP (values only) + the published activity */
      ...publishedValues(record)
    ].join(" "));
    /* the company view lists the company's own (seed) records only */
    return (!query || searchMatch(searchable, query))
      && (!state.companyFilter || (record.beneficiary.identifier === state.companyFilter.identifier
        && state.config.records.some((seed) => seed.id === record.id)));
  };

  /* AC-20: the RAP API fails on applying filters (demo ?rapapi=eroare-filtrare) → the system message, no list
     (the bar with „Resetează filtrele” stays, so the visitor can go back to the full list) */
  const filterApiDown = () => API_ERRORS.has("eroare-filtrare") && totalActiveFilters() > 0;

  const applyFilters = () => {
    state.filteredRecords = filterApiDown() ? [] : state.records.filter((record) => matchesSearch(record) && matchesFacets(record));

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
      /* the shared empty state (js/empty-state.js); filters applied → US-141 AC-18 wording + „Resetează filtrele”;
         the API down on applying them → AC-20 system message */
      const filters = totalActiveFilters();
      const reset = '<button class="btn btn-neutral btn-sm" type="button" aria-label="Resetează filtrele" data-filter-clear-all>Resetează</button>';
      elements.empty.innerHTML = filterApiDown()
        ? window.GEAPEmptyState.render({ title: "Serviciul nu este disponibil momentan", text: "Vă rugăm să încercați mai târziu.", icon: "circle-error", actionHtml: reset })
        : filters
          ? window.GEAPEmptyState.noResults("Nu au fost găsite acte pentru filtrele aplicate.", { text: "Modificați criteriile de filtrare și încercați din nou.", actionHtml: reset })
          : window.GEAPEmptyState.noResults("Ne pare rău, nu am găsit niciun rezultat", { text: "Verificați ortografia sau încercați alți termeni." });
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
    if (facet.key === "status") return STATUS_VALUES.map((value) => ({ value, count: counts.get(value) || 0 }));
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ro", { numeric: true }));
  };

  /* a facet is offered when the registry has at least two values for it (as in the BO) */
  const availableFacets = () => FACETS.filter((facet) => {
    if (state.filter.applied[facet.key]?.length || ["date", "path", "toggle"].includes(facet.type) || facet.key === "status" || facet.unavailable?.()) return true;
    const seen = new Set();
    for (const record of state.records) { for (const value of facetValues(facet, record)) seen.add(value); if (seen.size > 1) return true; }
    return false;
  });

  /* screen readers hear the result count after a filter change (the visible line went, AC-17 = the pager summary) */
  const resultsWord = (n) => (n === 1 ? "1 rezultat găsit" : `${n}${n % 100 === 0 || n % 100 >= 20 ? " de" : ""} rezultate găsite`);
  const announceCount = () => {
    if (!elements.live) return;
    elements.live.textContent = "";
    window.setTimeout(() => { elements.live.textContent = filterApiDown() ? "" : resultsWord(state.filteredRecords.length); }, 50);
  };

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
      apply: () => { state.page = 1; applyFilters(); announceCount(); },
      scrollers: [elements.tableScroller],
      /* US-141 AC-13: the applied filters stay visible as chips while active — desktop and phones; the trigger never
         hides them. User 2026-11-04: chips = label + count (dates: the period) + × that clears that filter (AC-14);
         desktop: ticks / dates only change the draft, ONE „Aplică filtre” at the end of the chips row applies it
         (masterApply, US-141 user flow); phones keep the sheet + „Arată N rezultate”.
         The story's wording (AC-09, AC-15, AC-17) */
      hideOnToggle: false,
      /* rap-g: an applied facet = grey pill group [the chip: label + count, tooltip = every value][round ×] — EVO-WEB 3.0
         22622:26715 (AC-13/14) */
      chipGroup: true,
      cascade: { autoritate: ["subdiviziune", "serviciu"], subdiviziune: ["serviciu"] },
      /* desktop: „Resetează” = the chips row's button slot (masterApply); phones: in the applied line */
      barClearDesktop: false,
      masterApply: true,
      phoneChips: true,
      inlineMax: 4,
      /* rap-compact-v1 (user): desktop chips 36, the slot a Small button; search + Filtru stay 40 */
      compact: true,
      text: {
        apply: "Aplică filtre",
        /* user 2026-11-04: „Resetează” (the story's AC-15 says „Resetează filtrele” — the screen-reader name) */
        clear: "Resetează",
        clearName: "Resetează filtrele",
        /* AC-17 (user 2026-11-04): no visible count line — the pager says „Se afișează 1–16 din N”; the count is announced
           (aria-live, `announceCount`) after every apply */
        results: () => "",
        rangeOrder: "Data de început nu poate fi ulterioară datei de sfârșit."
      }
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
    closeSuggest();
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

  /* ---- search suggestions (rap-suggest-v1, 2026-11-04, user; beyond US-140 — PO proposal) ----
     From 2 characters, 200 ms after typing: a dropdown under the search (the menu surface + the ONE dropdown item,
     css/dropdown.css: 40 desktop / 48 · 16/24 phones), groups „Acte” (nr + name) · „Companii” (name + IDNO) ·
     „Adrese” (address + how many acts), ≤ 5 each, the matched part semibold. ARIA combobox + listbox, ↑ / ↓ / Enter /
     Esc. An act → its profile; a company → the company view; an address → the „Adresă” filter (chip + ×). Enter with
     nothing highlighted = the normal full-text search (the list already follows the field). */
  const SUGGEST_MIN = 2;
  const SUGGEST_MAX = 5;
  let suggestTimer = 0;
  let suggestItems = [];
  let suggestActive = -1;
  const suggestEl = document.createElement("ul");
  suggestEl.className = "e-permits-fo-intent-menu rap-suggest";
  suggestEl.id = "rap-suggest";
  suggestEl.setAttribute("role", "listbox");
  suggestEl.setAttribute("aria-label", "Sugestii de căutare");
  suggestEl.hidden = true;
  /* the typed text in semibold inside a value (case- and diacritics-insensitive; one char → one folded char) */
  const markMatch = (text, query) => {
    const chars = [...String(text)];
    const folded = chars.map((c) => normalize(c) || c).join("");
    const at = folded.indexOf(normalize(query));
    if (at < 0 || !query) return escapeHtml(text);
    return `${escapeHtml(chars.slice(0, at).join(""))}<strong>${escapeHtml(chars.slice(at, at + query.length).join(""))}</strong>${escapeHtml(chars.slice(at + query.length).join(""))}`;
  };
  const buildSuggestions = (query) => {
    const q = normalize(query);
    const acts = new Map();
    const companies = new Map();
    const addresses = new Map();
    const authorities = new Map();
    const names = new Map();
    for (const record of state.records) {
      if (authorities.size < SUGGEST_MAX && !authorities.has(record.authority.name) && searchMatch(normalize(`${record.authority.name} ${record.authority.code}`), q)) authorities.set(record.authority.name, record);
      if (acts.size < SUGGEST_MAX && !acts.has(record.permit.number) && normalize(`${record.permit.number} ${record.permit.paperNumber}`).includes(q)) acts.set(record.permit.number, record);
      if (searchMatch(normalize(record.permit.name), q)) names.set(record.permit.name, (names.get(record.permit.name) || 0) + 1);
      if (record.beneficiary.type === "company" && !companies.has(record.beneficiary.identifier) && companies.size < SUGGEST_MAX
        && normalize(`${record.beneficiary.name} ${record.beneficiary.identifier}`).includes(q)) companies.set(record.beneficiary.identifier, record);
      if (record.addressStreet && normalize(record.addressStreet).includes(q)) {
        const entry = addresses.get(record.addressStreet) || { n: 0, path: record.addressPath };
        entry.n += 1;
        addresses.set(record.addressStreet, entry);
      }
    }
    const items = [];
    /* „Acte” = act names (Denumire act; pick → that filter), „Numere de act” = one act by its number / dossier (→ profile) */
    const topNames = [...names.entries()].slice(0, SUGGEST_MAX);
    if (topNames.length) items.push({ group: "Acte" }, ...topNames.map(([name, n]) => ({ kind: "name", name, text: markMatch(name, query), meta: n === 1 ? "1 act" : `${n}${n % 100 === 0 || n % 100 >= 20 ? " de" : ""} acte` })));
    if (acts.size) items.push({ group: "Numere de act" }, ...[...acts.values()].map((record) => ({ kind: "act", record, text: markMatch(record.permit.number, query), meta: escapeHtml(record.permit.name) })));
    if (authorities.size) items.push({ group: "Autorități" }, ...[...authorities.values()].map((record) => ({ kind: "authority", record, text: markMatch(record.authority.name, query), meta: markMatch(record.authority.code, query) })));
    if (companies.size) items.push({ group: "Companii" }, ...[...companies.values()].map((record) => ({ kind: "company", record, text: markMatch(record.beneficiary.name, query), meta: `IDNO ${markMatch(record.beneficiary.identifier, query)}` })));
    const topAddresses = [...addresses.entries()].slice(0, SUGGEST_MAX);
    if (topAddresses.length) items.push({ group: "Adrese" }, ...topAddresses.map(([address, { n, path }]) => ({ kind: "address", address, path, text: markMatch(address, query), meta: n === 1 ? "1 act" : `${n}${n % 100 === 0 || n % 100 >= 20 ? " de" : ""} acte` })));
    return items;
  };
  const setSuggestActive = (i) => {
    const options = [...suggestEl.querySelectorAll("[data-rap-suggest-i]")];
    suggestActive = options.length ? (i + options.length) % options.length : -1;
    options.forEach((el, n) => el.classList.toggle("is-active", n === suggestActive));
    const active = options[suggestActive];
    if (active) { elements.search.setAttribute("aria-activedescendant", active.id); active.scrollIntoView({ block: "nearest" }); }
    else elements.search.removeAttribute("aria-activedescendant");
  };
  const closeSuggest = () => {
    window.clearTimeout(suggestTimer);
    suggestEl.hidden = true;
    suggestActive = -1;
    elements.search.setAttribute("aria-expanded", "false");
    elements.search.removeAttribute("aria-activedescendant");
  };
  const openSuggest = () => {
    const query = elements.search.value.trim();
    if (query.length < SUGGEST_MIN || state.activeRecord) { closeSuggest(); return; }
    suggestItems = buildSuggestions(query);
    let n = -1;
    suggestEl.innerHTML = suggestItems.length ? suggestItems.map((item) => (item.group
      ? `<li class="rap-suggest__group" role="presentation">${escapeHtml(item.group)}</li>`
      : `<li class="e-permits-fo-intent-menu__item rap-suggest__item" role="option" aria-selected="false" id="rap-suggest-${n += 1}" data-rap-suggest-i="${n}">
          <span class="rap-suggest__text" data-cell-tooltip>${item.text}</span><span class="rap-suggest__meta${item.kind === "act" ? "" : " rap-suggest__meta--fixed"}" data-cell-tooltip>${item.meta}</span>
        </li>`)).join("")
      : '<li class="e-permits-fo-intent-menu__item rap-suggest__item is-disabled" role="option" aria-disabled="true" aria-selected="false"><span class="rap-suggest__text">Nicio potrivire</span></li>';
    suggestItems = suggestItems.filter((item) => !item.group);
    suggestEl.hidden = false;
    suggestActive = -1;
    elements.search.setAttribute("aria-expanded", "true");
  };
  const pickSuggestion = (i) => {
    const item = suggestItems[i];
    if (!item) return;
    closeSuggest();
    if (item.kind === "act") { openProfile(item.record.id); return; }
    if (item.kind === "company") { showCompanyPermits(item.record); return; }
    /* an address → the „Adresă” filter (street level); an authority → the „Autoritate emitentă” filter; the typed text
       goes (it was the way to find them) */
    window.clearTimeout(searchTimer);
    state.search = "";
    state.companyFilter = null;
    elements.search.value = "";
    syncSearchState();
    state.filter.applied = item.kind === "authority"
      ? { ...state.filter.applied, autoritate: [...new Set([...(state.filter.applied.autoritate || []), item.record.authority.name])] }
      : item.kind === "name"
        ? { ...state.filter.applied, denumire: [...new Set([...(state.filter.applied.denumire || []), item.name])] }
        : { ...state.filter.applied, adresa: [item.path.join(PATH_SEP)] };
    state.filter.draft = null;
    state.page = 1;
    applyFilters();
    announceCount();
  };
  const bindSuggest = () => {
    elements.search.closest(".search-input")?.appendChild(suggestEl);
    elements.search.setAttribute("role", "combobox");
    elements.search.setAttribute("aria-autocomplete", "list");
    elements.search.setAttribute("aria-controls", suggestEl.id);
    elements.search.setAttribute("aria-expanded", "false");
    elements.search.addEventListener("input", () => {
      window.clearTimeout(suggestTimer);
      suggestTimer = window.setTimeout(openSuggest, 200);
    });
    elements.search.addEventListener("keydown", (event) => {
      if (suggestEl.hidden) { if (event.key === "ArrowDown" && elements.search.value.trim().length >= SUGGEST_MIN) { openSuggest(); setSuggestActive(0); event.preventDefault(); } return; }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSuggestActive(suggestActive + (event.key === "ArrowDown" ? 1 : -1)); return; }
      if (event.key === "Escape") { event.preventDefault(); closeSuggest(); return; }
      if (event.key === "Enter") { event.preventDefault(); if (suggestActive >= 0) pickSuggestion(suggestActive); else closeSuggest(); }
    });
    /* pointerdown keeps the focus in the field while an option is picked */
    suggestEl.addEventListener("pointerdown", (event) => event.preventDefault());
    suggestEl.addEventListener("click", (event) => {
      const option = event.target.closest("[data-rap-suggest-i]");
      if (option) pickSuggestion(Number(option.dataset.rapSuggestI));
    });
    suggestEl.addEventListener("pointermove", (event) => {
      const option = event.target.closest("[data-rap-suggest-i]");
      if (option && Number(option.dataset.rapSuggestI) !== suggestActive) setSuggestActive(Number(option.dataset.rapSuggestI));
    });
    document.addEventListener("pointerdown", (event) => { if (!suggestEl.hidden && !event.target.closest(".rap-search")) closeSuggest(); });
    elements.search.addEventListener("blur", () => window.setTimeout(() => { if (document.activeElement !== elements.search) closeSuggest(); }, 150));
  };

  /* phones (≤ 760): quick-return toolbar (rap-quick-return-v1, 2026-11-04, user): the EVO header and the title scroll
     away, the search row sticks at the top (white, 1px divider, no chip row), hides on scroll DOWN and slides back on the
     first scroll UP; never hides while the search has focus or a sheet is open. `--sticky-toolbar-h` on :root = its
     visible height (0 when hidden / not stuck) for anything that sticks below it. Desktop unchanged. */
  const bindQuickReturn = () => {
    const bar = document.querySelector(".rap-toolbar");
    if (!bar) return;
    const phone = window.matchMedia("(max-width: 760px)");
    let lastY = window.scrollY;
    let hidden = false;
    let frame = 0;
    const setHeight = (stuck) => document.documentElement.style.setProperty("--sticky-toolbar-h", stuck && !hidden ? `${Math.round(bar.offsetHeight + 16)}px` : "0px");
    const sync = () => {
      frame = 0;
      if (!phone.matches || state.activeRecord) {
        bar.classList.remove("is-stuck", "is-hidden");
        hidden = false;
        setHeight(false);
        lastY = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const stuck = y > 0 && bar.getBoundingClientRect().top <= 8.5;
      bar.classList.toggle("is-stuck", stuck);
      const locked = bar.contains(document.activeElement) || document.documentElement.classList.contains("is-filter-sheet-open");
      if (!stuck || locked) hidden = false;
      else if (y > lastY + 4) hidden = true;
      else if (y < lastY - 4) hidden = false;
      bar.classList.toggle("is-hidden", hidden);
      lastY = y;
      setHeight(stuck);
    };
    window.addEventListener("scroll", () => { if (!frame) frame = window.requestAnimationFrame(sync); }, { passive: true });
    bar.addEventListener("focusin", sync);
    phone.addEventListener("change", sync);
    sync();
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
      const shared = await fetch(AUTHORITIES_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      state.registry = buildRegistry(state.config, shared);
      state.records = expandRecords(state.config.records, state.config.meta.totalResults, state.registry, state.config.registry?.addresses);
      state.page = state.config.pagination.initialPage;
      state.pageSize = state.config.pagination.defaultPageSize;
      elements.title.textContent = state.config.page.title;
      elements.search.placeholder = state.config.page.searchPlaceholder;
      initFacetFilter();
      bindEvents();
      bindSuggest();
      bindQuickReturn();
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
