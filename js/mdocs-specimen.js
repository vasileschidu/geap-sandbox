/* =====================================================================================
   MDocs specimen (mdocs-system-v1, 2026-10-25) — mdocs-specimen.html, demo mdoc-sys / mdoc-sys-z (?zone=1).
   The visual spec of the MDocs document system: 00 foundations, 01–05 every module and variant, 06–11 every
   template as it renders (paginated A4 pages). Composed ONLY from GEAPDocPreview.mdoc (MODULES, TEMPLATES, data,
   render) — nothing here draws document markup of its own except the foundations swatches.
   ===================================================================================== */
(function () {
  "use strict";

  const P = window.GEAPDocPreview;
  const root = document.querySelector("[data-mdoc-spec]");
  if (!P?.mdoc || !root) return;
  const { MODULES, data, render } = P.mdoc;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const zones = new URLSearchParams(window.location.search).get("zone") === "1";
  root.classList.toggle("is-zones", zones);
  const zonesLink = root.querySelector("[data-mdoc-spec-zones]");
  if (zonesLink) {
    zonesLink.textContent = zones ? "Ascunde zonele" : "Arată zonele";
    zonesLink.setAttribute("href", zones ? "?" : "?zone=1");
  }

  /* ---- demo data: one dossier of ANSP (the same names as the BO demo dossier D-2026-004575) ---- */
  const base = {
    authority: "Agenția Națională pentru Sănătate Publică",
    office: "Centrul de Sănătate Publică Chișinău",
    request: { number: "C004575/2026", date: "2026-07-08", type: "Eliberare", service: "Autorizație sanitară de funcționare" },
    generatedAt: "2026-10-25T14:32:00"
  };
  const parties = [
    { role: "Solicitant", name: "FARMACIA FAMILIEI S.R.L.", lines: ["IDNO 1003600122384", "mun. Chișinău, str. Alba Iulia 20"] },
    { role: "Reprezentant", name: "Ion Moraru", lines: ["IDNP 2003004005006", "Împuternicire MPower 2026-118"] }
  ];
  const serviceGroup = { title: "Serviciul solicitat", rows: [["Serviciul", "Autorizație sanitară de funcționare"], ["Tipul solicitării", "Eliberare"], ["Subdiviziunea de examinare", "Centrul de Sănătate Publică Chișinău"], ["Canal de depunere", "EVO · Front Office"]] };
  const objectGroup = { title: "Obiectul activității", columns: 2, rows: [["Obiectul", "Farmacia „Familia” nr. 3"], ["Tipul unității", "Farmacie comunitară"], ["Adresa", "mun. Chișinău, str. Alba Iulia 20"], ["Cod cadastral", "0100313.142.01.004"], ["Suprafața totală", "142,5 m²"], ["Regimul de lucru", "Luni – Duminică, 08:00 – 21:00"]] };
  const attachments = [
    { name: "Extras din Registrul de stat al persoanelor juridice", meta: "extras-rsud.pdf · MDocs" },
    { name: "Contract de locațiune a spațiului", meta: "contract-locatiune.pdf · 3 pagini" },
    { name: "Planul încăperilor", meta: "plan-incaperi.pdf · 1 pagină" },
    { name: "Declarație pe propria răspundere", meta: "declaratie.pdf · 1 pagină" }
  ];
  const fees = { title: "Taxe de achitat", columns: [{ label: "Taxa" }, { label: "Nota de plată", width: "medium" }, { label: "Suma, MDL", align: "end", width: "narrow" }], rows: [["Taxa pentru eliberarea autorizației sanitare", "NP-2026-004903", "500"], ["Taxa pentru expertiza documentelor", "NP-2026-004904", "150"]], total: ["Total de achitat", "650 MDL"] };
  const equipment = {
    title: "Spații și echipamente",
    columns: [{ label: "Nr.", width: "num" }, { label: "Încăperea / echipamentul" }, { label: "Destinația", width: "medium" }, { label: "Suprafața, m²", align: "end", width: "narrow" }],
    rows: Array.from({ length: 34 }, (_, i) => {
      const rooms = [["Sala de deservire", "Comercializare"], ["Depozit medicamente", "Păstrare"], ["Camera frigorifică", "Păstrare la rece"], ["Laborator rețete magistrale", "Preparare"], ["Oficiu", "Personal"], ["Grup sanitar", "Personal"]];
      const [room, use] = rooms[i % rooms.length];
      return [String(i + 1), `${room} ${Math.floor(i / rooms.length) + 1}`, use, String(((i * 37) % 60) + 6) + ",0"];
    })
  };

  /* ---- sheet chrome (outside the A4 pages) ---- */
  const page = (inner, d, { footer = true, cls = "" } = {}) => `
      <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page e-permits-mdoc e-permits-mdoc-spec__page${cls ? ` ${cls}` : ""}">
        <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
          <div class="e-permits-mdoc__flow">${inner}</div>
          ${footer ? MODULES.footer(d) : ""}
        </div>
      </div>`;
  const caption = (text) => `<p class="e-permits-mdoc-spec__caption">${esc(text)}</p>`;
  const sheet = (id, title, desc, pagesHtml, { paginate = false } = {}) => `
      <section class="e-permits-mdoc-spec__sheet" id="${id}" aria-labelledby="${id}-title">
        <h2 class="e-permits-mdoc-spec__title" id="${id}-title">${esc(title)}</h2>
        <p class="e-permits-mdoc-spec__desc">${esc(desc)}</p>
        <div class="e-permits-doc-peek__canvas e-permits-mdoc-spec__canvas" role="document" aria-label="${esc(title)}"${paginate ? " data-mdoc-spec-paginate" : ""}>${pagesHtml}</div>
      </section>`;

  const cerere = data({ ...base, type: "cerere", number: "C004575/2026", date: "2026-07-08", parties, groups: [serviceGroup, objectGroup], attachments });

  /* ---- 00 foundations ---- */
  const TYPE = [
    ["Display", "--mdoc-type-display", "19 / 25 pt · 600", "Autorizație sanitară"],
    ["Title", "--mdoc-type-title", "17 / 22 pt · 600", "Cerere privind eliberarea actului"],
    ["Lead", "--mdoc-type-lead", "11 / 15 pt · 600", "Agenția Națională pentru Sănătate Publică"],
    ["Body", "--mdoc-type-body", "9.5 / 14 pt · 400–500", "Farmacia „Familia” nr. 3, mun. Chișinău"],
    ["Small", "--mdoc-type-small", "8.5 / 12 pt · 400", "Subdiviziunea de examinare"],
    ["Caption", "--mdoc-type-caption", "7.5 / 10 pt · 600 · caps +0.1em", "Obiectul activității"],
    ["Micro", "--mdoc-type-micro", "7 / 10 pt · 400", "Documentul conține date cu caracter personal"]
  ];
  const SWATCHES = [
    ["Ink", "--mdoc-ink", "text base default"], ["Ink 2", "--mdoc-ink-2", "text base secondary"], ["Ink 3", "--mdoc-ink-3", "text base tertiary"],
    ["Rule", "--mdoc-rule", "border base secondary · secțiuni"], ["Rule soft", "--mdoc-rule-soft", "border base default · rânduri"], ["Rule sign", "--mdoc-rule-sign", "border base secondary"],
    ["Positive", "positive", "bară + icon pe gri"], ["Warning", "warning", "bară + icon pe gri"], ["Danger", "danger", "bară + icon pe gri"], ["Info", "info", "brand · bară + icon pe gri"]
  ];
  const foundations = page(`
      ${caption("Tipografie · Onest · scara de tipar în pt")}
      <div class="e-permits-mdoc-spec__type">${TYPE.map(([name, token, spec, sample]) => `<div class="e-permits-mdoc-spec__type-row"><p class="e-permits-mdoc__label">${esc(name)}</p><p class="e-permits-mdoc-spec__type-meta">${esc(token)}<br>${esc(spec)}</p><p class="e-permits-mdoc-spec__type-sample e-permits-mdoc-spec__type-sample--${name.toLowerCase()}">${esc(sample)}</p></div>`).join("")}</div>
      ${caption("Culori · tokenuri locale ale paginii, din Foundations")}
      <div class="e-permits-mdoc-spec__swatches">${SWATCHES.map(([name, token, note], index) => `<div class="e-permits-mdoc-spec__swatch"><span class="e-permits-mdoc-spec__chip e-permits-mdoc-spec__chip--${index}" aria-hidden="true"></span><p class="e-permits-mdoc-spec__swatch-name">${esc(name)}</p><p class="e-permits-mdoc-spec__type-meta">${esc(token)} · ${esc(note)}</p></div>`).join("")}</div>
      ${caption("Accentul EVO · singurul accent · banda de 1 mm din capul fiecărei pagini")}
      <div class="e-permits-mdoc-spec__accent"><span class="e-permits-mdoc-spec__band" aria-hidden="true"></span><p class="e-permits-mdoc-spec__type-meta">--mdoc-accent · blue-sky-600 → lavender-600 → purple-600 → magenta-600 (sigla EVO) · tipar alb-negru: o linie gri, fără sens propriu</p></div>
      ${caption("Grilă · A4 210 × 297 mm")}
      <dl class="e-permits-mdoc-spec__grid">${[["Margini", "15 sus · 18 laterale · 12 jos (mm)"], ["Coloana etichetelor", "36 % (tabel cheie–valoare)"], ["Între module", "6 mm · în modul 3 mm · rânduri 1.8 mm"], ["Linii", "1 px (0,75 pt) · secțiuni gray-300 · rânduri gray-250 · se tipăresc și alb-negru"], ["Text gri sub 8 pt", "gray-600 (9,7:1) · minimum 7 pt"], ["Rotunjiri", "doar cipul de statut (full) și chenarul rezultatului (8)"]].map(([k, v]) => `<div class="e-permits-mdoc-kv__row"><dt>${esc(k)}</dt> <dd>${esc(v)}</dd></div>`).join("")}</dl>`, cerere, { footer: false });

  /* ---- 01 header + continuation ---- */
  const headers = page(`
      ${caption("Antet · complet (cerere, decizie)")}${MODULES.header(cerere, { variant: "full" })}
      ${caption("Antet · compact (notificare)")}${MODULES.header(cerere, { variant: "compact" })}
      ${caption("Antet · cu stema (act permisiv, certificat constatator)")}${MODULES.header(cerere, { variant: "emblem" })}
      ${caption("Antet simplificat · paginile 2+ (AC-07)")}${MODULES.continuation(cerere)}`, cerere, { footer: false });

  /* ---- 02 title block ---- */
  const act = data({ ...base, type: "act", title: "Autorizație sanitară de funcționare", number: "P-9031/2026", date: "2026-08-21", validUntil: "2031-08-20", status: { label: "Valabil", tone: "success" } });
  const refusal = data({ ...base, type: "decizie-refuz", number: "C004575/2026", date: "2026-07-29" });
  const titles = page(`
      ${caption("Bloc de titlu · aliniat la stânga · Nr. + Data (cerere, notificare)")}${MODULES.title(cerere, { align: "start" })}
      ${caption("Bloc de titlu · decizie · rândul „privind Cererea …”")}${MODULES.title(refusal, { align: "start" })}
      ${caption("Bloc de titlu · centrat · tip + cip de statut (act, certificat)")}${MODULES.title(act, { align: "center" })}
      ${caption("Cip de statut · tonuri")}<div class="e-permits-mdoc-spec__row">${[["Valabil", "positive"], ["Suspendat", "warning"], ["Retras", "danger"], ["Aprobare tacită", "info"], ["Expirat", "neutral"]].map(([label, tone]) => `<span class="e-permits-mdoc-chip e-permits-mdoc-chip--${tone}">${label}</span>`).join("")}</div>`, cerere, { footer: false });

  /* ---- 03 parties + data ---- */
  const one = data({ ...base, parties: parties.slice(0, 1) });
  const three = data({ ...base, parties: [...parties, { role: "Beneficiar", name: "Farmacia „Familia” nr. 3", lines: ["Obiect al activității"] }] });
  const dataSheet = page(`
      ${caption("Părți · 1 coloană")}${MODULES.parties(one)}
      ${caption("Părți · 2 coloane (solicitant + reprezentant)")}${MODULES.parties(cerere)}
      ${caption("Părți · 3 coloane")}${MODULES.parties(three)}
      ${caption("Date cheie–valoare · 1 coloană")}${MODULES.kv(cerere, {}, serviceGroup)}
      ${caption("Date cheie–valoare · 2 coloane")}${MODULES.kv(cerere, {}, objectGroup)}`, cerere);

  /* ---- 04 table + text ---- */
  const tableData = data({ ...base, tables: [fees], text: { title: "Temeiul legal", paragraphs: ["Decizia se întemeiază pe constatările controlului din 22 iulie 2026 și pe actele anexate la cerere."], points: ["Legea nr. 160/2011 privind reglementarea prin autorizare a activității de întreprinzător, art. 19.", "Hotărârea Guvernului nr. 1063/2016 cu privire la regulamentul sanitar pentru farmacii.", "Codul administrativ al Republicii Moldova, art. 117–123."] } });
  const tableSheet = page(`
      ${caption("Tabel · antet repetat pe fiecare pagină · numere la dreapta · rând total")}${MODULES.table(tableData)}
      ${caption("Text · paragrafe + puncte numerotate")}${MODULES.text(tableData, { key: "text" })}`, cerere);

  /* ---- 05 outcome + signatures + attachments ---- */
  const outcomes = [
    ["approved", "Actul permisiv a fost eliberat", "Autorizația este valabilă până la 20.08.2031."],
    ["refused", "Cererea a fost refuzată", "Agenția a refuzat eliberarea actului permisiv; motivele și temeiul legal sunt mai jos."],
    ["suspended", "Valabilitatea actului permisiv este suspendată", "Suspendarea durează până la remedierea neconformităților, cel mult 30 de zile."],
    ["info", "Examinarea continuă după achitare", "Achitați nota de plată în MPay până la 15.07.2026."]
  ].map(([tone, title, text]) => MODULES.outcome(data({ ...base, outcome: { tone, title, text } }))).join("");
  const signers = data({ ...base, signers: [{ role: "Directorul general", name: "Dumitru Rotaru", signedAt: "2026-08-21T10:32:00" }, { role: "Șefa Centrului de Sănătate Publică Chișinău", name: "Elena Rusu", signedAt: "2026-08-21T09:58:00" }] });
  const pending = data({ ...base, signers: [{ role: "Directorul general", name: "Dumitru Rotaru", pending: true }] });
  const closingSheet = page(`
      ${caption("Rezultat / decizie · aprobat · refuzat · suspendat · informativ")}${outcomes}
      ${caption("Semnături · 1–n semnatari · semnat MSign cu ora")}${MODULES.signatures(signers)}
      ${caption("Semnătură · în așteptare")}${MODULES.signatures(pending)}
      ${caption("Anexe · listă numerotată")}${MODULES.attachments(cerere)}`, cerere);

  /* ---- 06–11 templates: each = TEMPLATES[type] + its data ---- */
  const T = [
    ["s06", "06 · Cerere (US-307)", "header complet · titlu · părți · date · acte anexate", { ...base, type: "cerere", number: "C004575/2026", date: "2026-07-08", parties, groups: [serviceGroup, objectGroup], attachments }],
    ["s07", "07 · Notificare — nota de plată (US-308)", "antet compact · text · rezultat informativ · date · tabelul taxelor", { ...base, type: "notificare", title: "Notificare privind emiterea notei de plată", number: "C004575/2026", date: "2026-07-10", intro: ["Stimate solicitant,", "Pentru cererea dumneavoastră a fost emisă nota de plată. Examinarea continuă după confirmarea achitării prin MPay."], outcome: { tone: "info", title: "Termen de achitare: 15.07.2026", text: "Achitați prin MPay (mpay.gov.md); confirmarea ajunge automat în dosar." }, groups: [{ rows: [["Cererea", "Nr. C004575/2026"], ["Serviciul", "Autorizație sanitară de funcționare"]] }], table: fees }],
    ["s08", "08 · Decizie de refuz (US-309)", "rezultat refuzat · părți · motive · temeiuri numerotate", { ...base, type: "decizie-refuz", number: "C004575/2026", date: "2026-07-29", outcome: { tone: "refused", title: "Cererea a fost refuzată", text: "Agenția Națională pentru Sănătate Publică a refuzat eliberarea actului permisiv; motivele și temeiul legal sunt mai jos." }, parties: parties.slice(0, 1), groups: [{ rows: [["Obiectul", "Farmacia „Familia” nr. 3"], ["Motivele refuzului", "Actele anexate nu confirmă respectarea cerințelor sanitare pentru spațiul de activitate: lipsește sistemul de ventilare în depozit."], ["Recomandări", "Depuneți o cerere nouă după instalarea sistemului de ventilare."]] }], pointsTitle: "Temeiul legal", points: ["Legea nr. 160/2011 privind reglementarea prin autorizare a activității de întreprinzător, art. 19.", "Hotărârea Guvernului nr. 1063/2016, pct. 34."], closing: ["Decizia poate fi contestată în termen de 30 de zile de la comunicare, în condițiile Codului administrativ."] }],
    ["s09", "09 · Decizie de suspendare (US-309)", "același șablon · rezultat suspendat", { ...base, type: "decizie-suspendare", number: "C004575/2026", date: "2026-09-12", request: { ...base.request, type: "Suspendare" }, outcome: { tone: "suspended", title: "Valabilitatea actului permisiv este suspendată", text: "Suspendarea durează până la remedierea neconformităților, cel mult 30 de zile." }, parties: parties.slice(0, 1), groups: [{ rows: [["Actul permisiv", "Autorizație sanitară de funcționare · P-9031/2026"], ["Conținutul deciziei", "Suspendarea valabilității până la remedierea neconformităților constatate la controlul din 10 septembrie 2026."], ["Suspendat până la", "12.10.2026"]] }], pointsTitle: "Temeiul legal", points: ["Legea nr. 160/2011, art. 20."] }],
    ["s10", "10 · Act permisiv — lung, pe mai multe pagini (US-310)", "antet cu stema · titlu centrat + cip · părți · date · tabel care continuă cu antetul repetat · semnatari", { ...base, type: "act", title: "Autorizație sanitară de funcționare", number: "P-9031/2026", date: "2026-08-21", validUntil: "2031-08-20", status: { label: "Valabil", tone: "success" }, parties: [{ role: "Titularul actului", name: "FARMACIA FAMILIEI S.R.L.", lines: ["IDNO 1003600122384"] }], groups: [objectGroup, { title: "Date de emitere", rows: [["Valabil din data", "21 august 2026"], ["Numărul dosarului electronic", "C004575/2026"], ["Seria și nr. documentului tipărit", "A MMIV 041377"]] }], table: equipment, closing: ["Actul permisiv se eliberează pentru desfășurarea activității la adresa indicată, în condițiile legii."], signers: [{ role: "Directorul general", name: "Dumitru Rotaru", signedAt: "2026-08-21T10:32:00" }, { role: "Șefa Centrului de Sănătate Publică Chișinău", name: "Elena Rusu", signedAt: "2026-08-21T09:58:00" }], qrUrl: "https://rap.gov.md/act/p-9031-2026" }],
    ["s11", "11 · Certificat constatator (US-311)", "antet cu stema · titlu centrat · părți · datele constatate · bloc legal SIA GEAP", { ...base, type: "certificat", number: "C004575/2026", date: "2026-07-08", parties: parties.slice(0, 1), groups: [{ rows: [["Serviciul", "Autorizație sanitară de funcționare"], ["Tipul solicitării", "Eliberare"], ["Data și ora depunerii", "8 iulie 2026, 10:14"], ["Canal de depunere", "EVO · Front Office"], ["Termen de examinare", "22 iulie 2026"], ["Statutul dosarului la data generării", "În examinare"]] }] }]
  ];

  root.querySelector("[data-mdoc-spec-sheets]").innerHTML = [
    sheet("s00", "00 · Fundații de tipar", "tipografie · culori · accentul EVO · grilă — tokenuri locale în css/doc-preview.css", foundations),
    sheet("s01", "01 · Antet", "modulul header: complet · compact · cu stema; antetul simplificat al paginilor 2+", headers),
    sheet("s02", "02 · Bloc de titlu", "tip · titlu · numărul și data în formatul tipului · cip de statut", titles),
    sheet("s03", "03 · Părți și date", "parties 1–3 coloane · kv 1 și 2 coloane", dataSheet),
    sheet("s04", "04 · Tabel și text", "table (antet repetat) · text (paragrafe, puncte numerotate)", tableSheet),
    sheet("s05", "05 · Rezultat, semnături, anexe", "outcome · signatures · attachments", closingSheet),
    ...T.map(([id, title, desc, spec]) => sheet(id, title, desc, P.mdocsHtml(spec), { paginate: true }))
  ].join("");

  const canvases = [...root.querySelectorAll(".e-permits-mdoc-spec__canvas")];
  canvases.filter((canvas) => canvas.hasAttribute("data-mdoc-spec-paginate")).forEach((canvas) => P.paginate(canvas));
  const fitAll = () => canvases.forEach((canvas) => P.fit(canvas));
  fitAll();
  if ("ResizeObserver" in window) new ResizeObserver(fitAll).observe(root);
  /* exposed for checks: the document data + markup of every template */
  window.GEAPMdocSpecimen = { templates: T.map(([id, title]) => ({ id, title })) };
  root.dataset.ready = "";
})();
