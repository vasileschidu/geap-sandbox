/* EVO Cabinet v2 — the shell (cab2-shell-v1 → cab2-s1-v1, 2026-11-17; wiki 02 · Structure, 05 · S1;
   components.md › „Cabinet v2 — shell”; styles cabinet-evo/cab2-shell.css). Runs on cabinet-evo/v2.html only (the new
   Cabinet's own page, isolated from the current one).

   S1 — structure first (product owner, 2026-11-17): BO formats only, white page, the Solicitări content width. The
   Batch 1 / 2 visual layer (borderless widget cards, hero, motion, group colours) is parked behind ?visual=on.

   Addresses (v2.html …):
     ?as=<context>                       for whom you act (CONTEXTS); absent = „Tu”
     &g=<group>                          a group page (menu v3: the sidebar holds the groups; the open group shows its
                                         sections under it); a group with ONE section in the context opens the section
     &s=<section>                        a section page (SECTIONS); cereri / acte / notificari are the copied views
                                         (cab2-cereri.js, cab2-acte.js, cab2-notificari.js)
     &s=cereri#dosar/<id> · &s=acte&act=<id> · &s=<cereri|acte>&id=<id>   a record (cab2.js maps &id=)
     &s=de-rezolvat                      every „De rezolvat” item of the context
   Demo: &rezolvat=1 (everything resolved) · &entitati=una | multe · &indisponibil=asp (a source down) ·
         &as=pf-ion-nou (a new user, no data).
   Reading / keyboard order: header → context line → menu → content (Acasă: the identity hero first) (→ phone bottom bar). */
(() => {
  "use strict";

  const C = window.Cab2Evo;
  const V2 = window.Cab2;
  if (!C || !V2?.entry) return;

  const header = document.querySelector("[data-evo-header]");
  const frame = document.querySelector("[data-cab2-frame]");
  const host = document.querySelector('[data-cab-view="cabinet"]');
  if (!header || !frame || !host) return;

  const M = window.Cab2Motion;
  const VISUAL = V2.visual();
  const { escape, longDate, SPRITE } = C;
  const VIEW = C.VIEW;
  const params = new URLSearchParams(window.location.search);
  /* one clock with the copied data (data/cab2-cereri.json › today) */
  const TODAY = "2026-10-12";
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  const isPhone = () => phoneQuery.matches;
  const ico = (name, cls = "") => `<svg class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true" focusable="false"><use href="${SPRITE}#icon-${name}"></use></svg>`;
  const tag = (label, tone) => window.GEAPTag.html(label, tone);
  const hidden = (text) => `<span class="u-visually-hidden">${escape(text)}</span>`;
  const norm = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const isoOf = (value) => { const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || "")); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value || "").slice(0, 10); };
  const daysUntil = (value) => Math.round((Date.parse(isoOf(value)) - Date.parse(TODAY)) / 86400000);
  const money = (amount) => `${Number(amount || 0).toLocaleString("ro-RO")} lei`;
  const SOURCE_TIME = "actualizate azi, 15:42";

  /* ---------- contexts (wiki 02 › Contexts) ---------- */
  const MANY = params.get("entitati") === "multe";
  const ALL_CONTEXTS = [
    { id: "pf-anastasia", group: "self", kind: "self", name: "Anastasia Cojocaru", first: "Anastasia", initials: "AC", idLabel: "IDNP", idValue: "2990000000002" },
    { id: "pj-global-trader", group: "companies", kind: "company", name: "SRL Global Trader", idLabel: "IDNO", idValue: "1012600000002", via: "admin" },
    { id: "pj-agro-nord", group: "companies", kind: "company", name: "Agro-Nord SRL", idLabel: "IDNO", idValue: "1003600012345", via: "admin" },
    { id: "mpower-pj-lumina", group: "powers", kind: "company", name: "Lumina Office SRL", idLabel: "IDNO", idValue: "1012600000005", via: "mpower", until: "2027-06-30",
      scope: ["cereri", "acte", "plati", "taxe", "contributii"] },
    { id: "notar-pf-maria", group: "powers", kind: "person", name: "Maria Rusu", genitive: "Mariei Rusu", initials: "MR", idLabel: "IDNP", idValue: "2004001234821", via: "notarial",
      act: "1234", until: "2027-03-03", viewOnly: true, scope: ["cereri", "acte", "identitate", "taxe", "amenzi", "imobile", "vehicule"] },
    { id: "mpower-pf-grigore", group: "powers", kind: "person", name: "Grigore Vasilescu", genitive: "lui Grigore Vasilescu", initials: "GV", idLabel: "IDNP", idValue: "2001004567310", via: "mpower",
      until: "2026-10-30", scope: ["cereri", "acte", "plati", "amenzi", "vehicule"] },
    ...(MANY ? [
      ["pj-vita-plant", "«Vita-Plant» SRL", "1012600000001"], ["pj-nord-construct", "Nord Construct SRL", "1015600034512"], ["pj-codru-lemn", "Codru Lemn SRL", "1009600021873"],
      ["pj-bucataria-mamei", "Bucătăria Mamei SRL", "1018600047790"], ["pj-trans-prut", "Trans-Prut SA", "1004600009341"], ["pj-orhei-vin", "Orhei Vin SRL", "1011600028865"],
      ["pj-cooperativa", "Cooperativa de Producție și Comercializare „Valea Nistrului de Jos” SRL", "1017600055512"],
    ].map(([id, name, idno]) => ({ id, group: "companies", kind: "company", name, idLabel: "IDNO", idValue: idno, via: "admin" })) : []),
  ];
  /* a new user (demo) and „only one context” (demo) = one entity, no switcher */
  const NEW_USER = { id: "pf-ion-nou", group: "self", kind: "self", name: "Ion Popescu", first: "Ion", initials: "IP", idLabel: "IDNP", idValue: "2005012345671", newUser: true };
  const CONTEXTS = params.get("as") === NEW_USER.id ? [NEW_USER] : params.get("entitati") === "una" ? [ALL_CONTEXTS[0]] : ALL_CONTEXTS;
  const SINGLE = CONTEXTS.length === 1;
  const contextOf = (id) => CONTEXTS.find((item) => item.id === id) || CONTEXTS[0];
  const identifier = (ctx) => (ctx.idLabel === "IDNP" ? `IDNP se termină în ${ctx.idValue.slice(-4)}` : `${ctx.idLabel} ${ctx.idValue}`);
  const capacity = (ctx, { validity = true } = {}) => {
    if (ctx.via === "admin") return "ca administrator";
    const until = validity && ctx.until ? `, valabilă până la ${longDate(ctx.until)}` : "";
    if (ctx.via === "notarial") return `prin împuternicire notarială nr. ${ctx.act}${until}`;
    if (ctx.via === "mpower") return `prin împuternicire${until}`;
    return "";
  };
  const expiresSoon = (ctx) => (ctx.until && daysUntil(ctx.until) <= 30 ? daysUntil(ctx.until) : null);
  const expiryLabel = (days) => (days <= 0 ? "Expiră astăzi" : days === 1 ? "Expiră mâine" : `Expiră în ${days} zile`);
  const todoText = (count, own) => {
    if (!count) return own ? "Nu ai nimic de rezolvat" : "Nimic de rezolvat";
    if (count === 1) return own ? "Ai un lucru de rezolvat" : "Un lucru de rezolvat";
    return own ? `Ai ${count} lucruri de rezolvat` : `${count} lucruri de rezolvat`;
  };

  /* ---------- menu v3 (product owner 2026-11-17: fewer, general items; the open group shows its sections) ---------- */
  const MENU = {
    person: [
      ["cereri", ["cereri", "acte"]],
      ["documente", ["identitate", "semnatura", "diplome", "frontiera", "fisiere"]],
      ["bani", ["plati", "taxe", "amenzi", "executari"]],
      ["proprietati", ["imobile", "vehicule", "gajuri"]],
      ["familie", ["copii", "sanatate"]],
      ["munca", ["contributii", "companii"]],
      ["acces", ["imputerniciri", "acces-date"]],
    ],
    company: [
      ["cereri", ["cereri", "acte"]],
      ["documente", ["fisiere"]],
      ["bani", ["plati", "taxe", "amenzi", "executari", "contributii"]],
      ["proprietati", ["imobile", "vehicule", "gajuri"]],
      ["munca", ["detalii", "concedii", "controale", "reclamatii"]],
      ["acces", ["imputerniciri", "acces-date"]],
    ],
  };
  /* one sentence per group page (wiki 07 labels) */
  const GROUP_TEXT = {
    cereri: "Cererile depuse și actele permisive emise pe baza lor.",
    documente: { self: "Actele tale de identitate, semnătura electronică, studiile și fișierele încărcate.", company: "Fișierele companiei.", person: "Actele de identitate și documentele persoanei pe care o reprezinți." },
    bani: { self: "Plățile, datoriile, amenzile și executările silite pe numele tău.", company: "Plățile, datoriile, amenzile, executările silite și contribuțiile companiei.", person: "Plățile, datoriile și amenzile persoanei pe care o reprezinți." },
    proprietati: "Bunurile imobile, vehiculele și gajurile înregistrate.",
    familie: "Copiii tăi și asigurarea medicală.",
    munca: { self: "Contribuțiile sociale, pensia și companiile tale.", company: "Datele companiei, concediile angajaților, controalele și reclamațiile." },
    acces: "Cine te poate reprezenta și cine ți-a consultat datele.",
  };
  /* a representative never sees these, whatever the power says (wiki 02 › Contexts) */
  const NEVER_FOR_POWER = ["acces-date", "semnatura", "sanatate", "copii", "frontiera", "fisiere", "imputerniciri"];

  /* section = label (per context) · purpose · source [full, short] · search words · the Batch 2 rows [title, value, tag,
     tone, line] (the group page cards use them as label / value rows) */
  const SECTIONS = {
    cereri: {
      label: { self: "Cererile mele", company: "Cererile companiei", person: (ctx) => `Cererile ${ctx.genitive}` }, view: "solicitari",
      text: "Urmărește cererile depuse și vezi ce ai de făcut la fiecare.", source: ["Sistemul GEAP", "GEAP"], keys: "cerere solicitare dosar extras certificat",
    },
    acte: {
      label: "Acte permisive", view: "acte",
      text: "Actele permisive emise și valabilitatea lor.", source: ["Sistemul GEAP", "GEAP"], keys: "act permisiv autorizatie aviz licenta",
    },
    notificari: {
      label: "Notificări", view: "notificari",
      text: "Evenimentele cererilor tale; le primești și prin e-mail sau SMS.", source: ["MNotify", "MNotify"], keys: "notificare mesaj",
    },
    identitate: {
      label: "Acte de identitate",
      text: "Buletinul, pașaportul, permisul de conducere și actele de stare civilă.", source: ["Agenția Servicii Publice", "ASP"], keys: "buletin pasaport permis carte de identitate stare civila",
      cards: (ctx) => [
        ctx.id === "notar-pf-maria"
          ? ["Buletin de identitate", "Valabil până la 2 decembrie 2026", "Expiră în 51 de zile", "warning", "Se termină în 3307"]
          : ["Buletin de identitate", "Valabil până la 14 mai 2031", "Valabil", "success", "Se termină în 4821"],
        ["Pașaport", "Valabil până la 3 februarie 2031", "Valabil", "success", "Se termină în 0917"],
        ["Permis de conducere", "Valabil până la 9 iulie 2029", "Valabil", "success", "Categoriile B și C · 3 puncte de penalizare"],
        ["Acte de stare civilă", "3 acte", "", "", "Certificat de naștere, certificat de căsătorie, un extras"],
      ].filter(Boolean),
    },
    semnatura: {
      label: "Semnătură electronică",
      text: "Certificatele tale de semnătură electronică și starea lor.", source: ["Serviciul Tehnologia Informației și Securitate Cibernetică", "STISC"], keys: "semnatura msign certificat",
      cards: [
        ["Semnătură mobilă", "Activă până la 22 august 2027", "Activă", "success", "Se termină în 3390"],
        ["Semnătură electronică avansată", "Activă până la 1 ianuarie 2027", "Activă", "success", "Se termină în 7712"],
      ],
    },
    diplome: {
      label: "Diplome și studii",
      text: "Actele de studii înregistrate pe numele tău.", source: ["Ministerul Educației și Cercetării", "MEC"], keys: "diploma studii educatie bacalaureat licenta",
      cards: [
        ["Diplomă de licență", "Universitatea de Stat din Moldova · Drept · 2015", "Verificată", "success", ""],
        ["Diplomă de bacalaureat", "Liceul Teoretic „Mihai Eminescu”, Bălți · 2011", "Verificată", "success", ""],
      ],
    },
    frontiera: {
      label: "Treceri de frontieră",
      text: "Intrările și ieșirile tale din țară, înregistrate la punctele de trecere.", source: ["Poliția de Frontieră", "Poliția de Frontieră"], keys: "frontiera trecere vama calatorie",
      cards: [["Ultima trecere", "2 octombrie 2026 · intrare, Leușeni"], ["Treceri în 2026", "14 treceri"]],
    },
    fisiere: {
      label: { self: "Fișierele mele", company: "Fișierele companiei" },
      text: "Documentele încărcate, pe care le poți refolosi la o cerere.", source: ["Cabinetul EVO", "Cabinetul EVO"], keys: "fisier document incarcat upload",
      cards: [["Fișiere încărcate", "9 fișiere"], ["Ultimul", "Contract de locațiune, 4 octombrie 2026"]],
    },
    plati: {
      label: "Plăți",
      text: "Plățile făcute către stat, cu dovada fiecăreia.", source: ["MPay", "MPay"], keys: "plata mpay chitanta achitare",
      cards: [["Ultima plată", "500 lei · 6 octombrie 2026"], ["Anul acesta", "27 de plăți · 8 615 lei"]],
    },
    taxe: {
      label: "Taxe și datorii",
      text: "Ce datorezi statului și ce ai declarat: datorii, venituri, conturi.", source: ["Serviciul Fiscal de Stat", "SFS"], keys: "taxa impozit datorie fisc sfs situatie fiscala",
      cards: (ctx) => [
        ctx.id === "pj-agro-nord" ? ["Datorii", "2 310 lei · scadente pe 25 septembrie 2026", "Termen depășit", "danger"] : ["Datorii", "0 lei", "La zi", "success"],
        ["Impozit pe bunuri imobile", "412 lei · până la 25 decembrie 2026"],
      ],
    },
    amenzi: {
      label: "Amenzi",
      text: "Amenzile primite și termenele în care le poți achita.", source: ["Ministerul Afacerilor Interne", "MAI"], keys: "amenda amenzi contraventie contraventii proces verbal",
      cards: (ctx) => (todosOf(ctx).some((item) => item.section === "amenzi")
        ? [["Neachitate", "600 lei · jumătate din sumă până la 21 octombrie 2026", "De achitat", "warning"], ["Achitate", "4 amenzi · ultima pe 14 august 2026"]]
        : [["Neachitate", "Nu ai amenzi de achitat"], ["Achitate", "4 amenzi · ultima pe 14 august 2026"]]),
    },
    executari: {
      label: "Executări silite",
      text: "Procedurile de executare silită deschise.", source: ["Uniunea Națională a Executorilor Judecătorești", "UNEJ"], keys: "executare silita executor",
      cards: [["Proceduri active", "Nu ai proceduri deschise"]],
    },
    imobile: {
      label: "Bunuri imobile",
      text: "Bunurile imobile înregistrate în Registrul bunurilor imobile.", source: ["Agenția Servicii Publice", "ASP"], keys: "imobil cadastru apartament casa teren",
      cards: [["Apartament", "62,4 m² · mun. Chișinău · cota 1/2"], ["Teren agricol", "1,2 ha · r-nul Orhei, s. Peresecina"]],
    },
    vehicule: {
      label: "Vehicule",
      text: "Vehiculele înregistrate, cu asigurarea și inspecția tehnică.", source: ["Agenția Servicii Publice", "ASP"], keys: "vehicul masina auto rca asigurare inspectie tehnica",
      cards: [["Dacia Duster · ABC 123", "RCA până la 9 august 2027", "La zi", "success"], ["Škoda Octavia · XYZ 789", "RCA până la 9 august 2027", "La zi", "success"]],
    },
    gajuri: {
      label: "Gajuri",
      text: "Gajurile înregistrate asupra bunurilor.", source: ["Registrul garanțiilor reale mobile", "RGRM"], keys: "gaj garantie ipoteca",
      cards: [["Gajuri active", "1 gaj · Dacia Duster, în favoarea băncii"]],
    },
    copii: {
      label: "Copii",
      text: "Copiii tăi și ce ține de ei: acte, indemnizații, grădiniță și școală.", source: ["Agenția Servicii Publice", "ASP"], keys: "copil copii indemnizatie gradinita scoala nastere",
      cards: [["Daria Cojocaru", "7 ani · elevă în clasa I"], ["Matei Cojocaru", "2 ani · înscris la creșă"]],
    },
    sanatate: {
      label: "Sănătate",
      text: "Asigurarea ta medicală și medicul de familie.", source: ["Compania Națională de Asigurări în Medicină", "CNAM"], keys: "sanatate medic polita asigurare medicala cnam",
      cards: [["Asigurare medicală", "Activă până la 31 decembrie 2026", "Activă", "success"], ["Medic de familie", "Elena Rotaru · Centrul de Sănătate Buiucani"]],
    },
    contributii: {
      label: { self: "Contribuții și pensie", company: "Contribuții sociale" },
      text: { self: "Contribuțiile tale sociale și estimarea pensiei.", company: "Contribuțiile sociale declarate și achitate pentru angajați." },
      source: ["Casa Națională de Asigurări Sociale", "CNAS"], keys: "contributii pensie stagiu cnas asigurari sociale",
      cards: (ctx) => (ctx.kind === "company"
        ? [["Declarate luna trecută", "84 300 lei · septembrie 2026", "Achitat", "success"], ["De achitat", "0 lei"]]
        : [["Stagiu de cotizare", "11 ani și 4 luni"], ["Vârsta de pensionare", "63 de ani · estimat în 2053"]]),
    },
    companii: {
      label: "Companiile mele",
      text: "Companiile în care ești administrator sau fondator.", source: ["Agenția Servicii Publice", "ASP"], keys: "companie firma srl afacere administrator fondator",
      cards: [["SRL Global Trader", "Administrator"], ["Agro-Nord SRL", "Administrator"], ["«Vita-Plant» SRL", "Fondator · cotă de 40 %"]],
    },
    imputerniciri: {
      label: "Împuterniciri",
      text: "Împuternicirile primite și cele date altora.", source: ["MPower", "MPower"], keys: "imputernicire procura mandat mpower notar reprezentare",
      cards: [["Primite", "3 împuterniciri"], ["Date de tine", "1 împuternicire · valabilă până la 1 martie 2027"]],
    },
    "acces-date": {
      label: { self: "Cine mi-a accesat datele", company: "Cine a accesat datele companiei" },
      text: "Vezi ce instituții au consultat datele, când și de ce.", source: ["MConnect", "MConnect"], keys: "acces date personale istoric consultare mconnect",
      cards: [["Luna aceasta", "6 accesări · ultima: Serviciul Fiscal de Stat, 11 octombrie 2026"]],
    },
    detalii: {
      label: "Detalii companie",
      text: "Datele companiei din Registrul de stat al unităților de drept.", source: ["Agenția Servicii Publice", "ASP"], keys: "companie detalii rsud fondator administrator caem",
      cards: [["Stare", "Activă · SRL, înregistrată pe 14 martie 2012", "Activă", "success"], ["Administrator", "Anastasia Cojocaru"]],
    },
    concedii: {
      label: "Concediile angajaților",
      text: "Concediile medicale ale angajaților, transmise de instituțiile medicale.", source: ["Casa Națională de Asigurări Sociale", "CNAS"], keys: "concediu medical angajat angajati",
      cards: [["De confirmat", "1 concediu · primit pe 9 octombrie 2026", "Așteaptă confirmarea ta", "warning"], ["Deschise", "2 concedii"]],
    },
    controale: {
      label: "Controale de stat",
      text: "Controalele de stat planificate și cele efectuate la companie.", source: ["Registrul de stat al controalelor", "Registrul controalelor"], keys: "control inspectie ansa verificare",
      cards: [["Planificate", "1 control · ANSA, 10 decembrie 2026"], ["Efectuate în 2026", "2 controale"]],
    },
    reclamatii: {
      label: "Reclamații despre companie",
      text: "Reclamațiile depuse de consumatori despre companie.", source: ["Agenția pentru Protecția Consumatorilor", "APCSP"], keys: "reclamatie plangere consumator",
      cards: [["Deschise", "Nu ai reclamații în examinare"]],
    },
  };
  const NEW_POWER = "imputernicire-noua";
  const TODO_PAGE = "de-rezolvat";
  /* pages outside the Cabinet that v2 does not have yet (S1 leftover, 2026-11-18: links stay inside v2) — Ajutor, the
     service catalog, the signed-out page → the „not built yet” page, never the old Cabinet (index.html?view=…) */
  const OUTSIDE = {
    ajutor: { title: "Ajutor", text: "Aici vor fi răspunsurile la întrebările frecvente și datele de contact ale suportului." },
    catalog: { title: "Catalogul serviciilor", text: "Aici vei alege serviciul pentru o cerere nouă." },
    iesire: { title: "Ai ieșit din cont", text: "Aici va fi pagina de după ieșirea din cont." },
  };

  const menuOf = (ctx) => (ctx.kind === "company" ? MENU.company : MENU.person)
    .map(([group, ids]) => [group, ctx.scope ? ids.filter((id) => ctx.scope.includes(id) && !NEVER_FOR_POWER.includes(id)) : ids])
    .filter(([, ids]) => ids.length);
  const sectionsOf = (ctx, group) => menuOf(ctx).find(([id]) => id === group)?.[1] || [];
  const inMenu = (ctx, id) => menuOf(ctx).some(([, ids]) => ids.includes(id));
  const groupOf = (ctx, id) => menuOf(ctx).find(([, ids]) => ids.includes(id))?.[0] || "";
  const groupLabel = (ctx, id) => { const g = V2.group(id); return (ctx.kind === "company" && g?.company) || g?.label || ""; };
  const pick = (value, ctx) => {
    if (typeof value === "string" || Array.isArray(value) || typeof value === "function") return value;
    if (!value) return "";
    if (ctx.kind === "self") return value.self;
    if (ctx.kind === "company") return value.company || value.self;
    return typeof value.person === "function" ? value.person(ctx) : value.person || value.self;
  };
  const titleOf = (id, ctx = state.ctx) => (id === "acasa" ? "Acasă" : id === NEW_POWER ? "Adaugă o împuternicire notarială" : id === TODO_PAGE ? "De rezolvat" : SECTIONS[id] ? pick(SECTIONS[id].label, ctx) : "");
  const cardsOf = (ctx, id) => { const cards = SECTIONS[id].cards || []; return typeof cards === "function" ? cards(ctx) : cards; };
  /* a group with one section in this context has no page: the item opens the section (menu v3 exception) */
  const directSection = (ctx, group) => { const ids = sectionsOf(ctx, group); return ids.length === 1 ? ids[0] : ""; };

  /* ---------- data: the new Cabinet's own copies (data/cab2-*.json), read once for every context ---------- */
  const data = { cereri: null, acts: null, services: {} };
  const scenario = (item) => (params.get("rezolvat") === "1" && item?.scenarios?.rezolvat ? { ...item, ...item.scenarios.rezolvat } : item);
  const dosareOf = (ctx) => (data.cereri?.perspectives?.[ctx.id]?.dosare || []).map(scenario);
  const actsOf = (ctx) => (data.acts?.[ctx.id] || []).map(scenario);
  const serviceOf = (code) => data.services[code] || {};
  const OPEN = ["info", "achitare", "derulare"];
  const openRequests = (ctx) => dosareOf(ctx).filter((d) => OPEN.includes(d.status)).sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));

  /* „De rezolvat” (wiki 02 › ranking, never personalised): 1 overdue with a consequence · 2 a deadline that changes the
     cost or the outcome · 3 waiting on the user · 4 expiry in 90 / 30 / 7 days · 5 informational. Levels 1–3 are the
     „things to resolve” counted in the status sentence, the menu badges and the switcher (one number everywhere). */
  /* cab2-home-v1 (product owner 2026-11-18): every level 1–3 item also carries its Acasă ALERT words — `title` (the fact
     in plain words), `body` (what + deadline), `more` (the quiet way in, optional); the row sentence (`text`) stays for
     the group pages and the full „De rezolvat” page */
  const STATIC_TODOS = {
    "pf-anastasia": [
      { level: 2, section: "amenzi", date: "2026-10-21", text: "Achită amenda de 600 lei pentru depășirea vitezei până la 21 octombrie 2026; până atunci plătești jumătate din sumă.", action: "Achită", meta: ["Amenzi", "Ministerul Afacerilor Interne"], solved: true,
        title: "Ai o amendă de 600 lei de achitat", body: "Pentru depășirea vitezei. Dacă o achiți până la 21 octombrie 2026, plătești doar jumătate din sumă.", more: "Vezi amenzile", amount: 600 },
      { level: 2, section: "taxe", date: "2026-12-25", text: "Achită impozitul pe bunuri imobile de 412 lei până la 25 decembrie 2026; după termen se calculează penalități.", action: "Achită", meta: ["Taxe și datorii", "Serviciul Fiscal de Stat"], solved: true,
        title: "Ai de achitat impozitul pe bunuri imobile", body: "412 lei pentru apartamentul din Chișinău, până la 25 decembrie 2026. După termen se calculează penalități.", more: "Vezi taxele" },
    ],
    "pj-global-trader": [
      { level: 3, section: "concedii", text: "Confirmă concediul medical al unui angajat, primit pe 9 octombrie 2026.", action: "Confirmă", meta: ["Concediile angajaților", "CNAS"],
        title: "Ai un concediu medical de confirmat", body: "Concediul unui angajat, primit de la Casa Națională de Asigurări Sociale pe 9 octombrie 2026.", more: "Vezi concediile" },
      { level: 5, section: "controale", text: "Agenția Națională pentru Siguranța Alimentelor a planificat un control pe 10 decembrie 2026.", action: "Vezi controlul", meta: ["Controale de stat", "ANSA"] },
    ],
    "pj-agro-nord": [{ level: 1, section: "taxe", text: "Datoria de 2 310 lei la impozitul pe venit a depășit termenul din 25 septembrie 2026; se calculează penalități.", action: "Achită", meta: ["Taxe și datorii", "Serviciul Fiscal de Stat"],
      title: "Datoria de 2 310 lei a depășit termenul", body: "Impozitul pe venit trebuia achitat până la 25 septembrie 2026. Din 26 septembrie se calculează penalități.", more: "Vezi taxele" }],
    "notar-pf-maria": [
      /* view only: the alert says why there is no „Achită” (cab2-home-v1); `rezolvat=1` hides it (n27) */
      { level: 2, section: "amenzi", date: "2026-10-28", text: "Maria Rusu are o amendă de 300 lei; până pe 28 octombrie 2026 se plătește jumătate din sumă.", action: "Achită", meta: ["Amenzi", "MAI"], solved: true,
        title: "Maria Rusu are o amendă de 300 lei de achitat", body: "Până pe 28 octombrie 2026 se plătește jumătate din sumă. Tu poți doar vedea datele: împuternicirea notarială nu îți permite să achiți pentru Maria Rusu.", more: "Vezi amenzile", amount: 300 },
      { level: 4, section: "identitate", text: "Buletinul de identitate al Mariei Rusu expiră pe 2 decembrie 2026, în 51 de zile.", action: "Vezi buletinul", meta: ["Acte de identitate", "ASP"] },
    ],
    "mpower-pf-grigore": [{ level: 2, section: "amenzi", date: "2026-10-20", text: "Achită amenda de 600 lei până la 20 octombrie 2026; până atunci plătești jumătate din sumă.", action: "Achită", meta: ["Amenzi", "MAI"],
      title: "Grigore Vasilescu are o amendă de 600 lei de achitat", body: "Dacă o achiți până la 20 octombrie 2026, plătești doar jumătate din sumă.", more: "Vezi amenzile", amount: 600 }],
  };
  function todosOf(ctx) {
    const items = [];
    dosareOf(ctx).forEach((d) => {
      const service = serviceOf(d.service);
      const what = d.object || service.title || d.nr;
      /* the alert words (cab2-home-v1): title = the fact, body = the request + the deadline, more = „Vezi cererea” */
      const which = `pentru cererea „${service.title || d.nr}”`;
      const place = d.object ? `${d.object}. ` : "";
      if (d.status === "info") items.push({ level: 3, section: "cereri", id: d.id, date: d.info?.until, text: `Autoritatea așteaptă informații pentru ${what}. Trimite-le până la ${longDate(d.info?.until)}.`, action: "Trimite informația", meta: [service.title], nr: d.nr,
        kind: "info", title: ctx.kind === "self" ? "Ți se cer informații suplimentare" : "Autoritatea cere informații suplimentare", body: `${place}Trimite-le ${which} până la ${longDate(d.info?.until)}; examinarea este suspendată până atunci.`, more: "Vezi cererea" });
      if (d.status === "achitare" && d.payment) items.push({ level: 2, section: "cereri", id: d.id, date: d.payment.due, text: `Achită ${money(d.payment.amount)} pentru ${what} până la ${longDate(d.payment.due)}${d.feeDuringExam ? ", ca examinarea să continue" : "; examinarea începe după plată"}.`, action: "Achită", meta: [service.title], nr: d.nr,
        kind: "pay", amount: d.payment.amount, title: `${ctx.kind === "self" ? "Ai de achitat" : "De achitat"} ${money(d.payment.amount)} ${which}`, body: `${place}Termenul de plată este ${longDate(d.payment.due)}. ${d.feeDuringExam ? "Examinarea continuă după plată." : "Examinarea începe după plată."}`, more: "Vezi cererea" });
    });
    actsOf(ctx).forEach((act) => {
      const title = serviceOf(act.service).actTitle || "Actul permisiv";
      const days = daysUntil(act.validUntil);
      if (act.status === "valabil" && days >= 0 && days <= 90) items.push({ level: 4, section: "acte", id: act.id, date: isoOf(act.validUntil), text: `${title} pentru ${act.name} expiră pe ${longDate(act.validUntil)}, în ${days} de zile.`, action: "Vezi actul", nr: act.number });
      if (act.status === "suspendat") items.push({ level: 5, section: "acte", id: act.id, text: `${title} pentru ${act.name} este suspendată.`, action: "Vezi actul", nr: act.number });
    });
    (STATIC_TODOS[ctx.id] || []).filter((item) => !(item.solved && params.get("rezolvat") === "1")).forEach((item) => items.push(item));
    return items.filter((item) => inMenu(ctx, item.section))
      .sort((a, b) => a.level - b.level || String(a.date || "9999").localeCompare(String(b.date || "9999")));
  }
  /* „De rezolvat” = levels 1–3 only (what the status sentence, the badges and the switcher count); „În curând”
     (user 2026-11-18) = levels 4–5: expiring soon / upcoming / informational, nothing to do yet — nearest date first */
  const isTodo = (item) => item.level <= 3;
  const splitTodos = (items) => ({
    todo: items.filter(isTodo),
    soon: items.filter((item) => !isTodo(item)).sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")) || a.level - b.level),
  });
  const countOf = (ctx, filter = () => true) => todosOf(ctx).filter((item) => item.level <= 3 && filter(item)).length;
  const sectionCount = (ctx, id) => countOf(ctx, (item) => item.section === id);
  const groupCount = (ctx, group) => countOf(ctx, (item) => sectionsOf(ctx, group).includes(item.section));

  /* ---------- state + addresses ---------- */
  const state = { ctx: contextOf(params.get("as")), page: "acasa", group: "", section: "", denied: false };
  const DEMO_KEYS = ["entitati", "motion", "visual", "rezolvat", "indisponibil", "foto", "entrance"];
  const urlOf = ({ g = "", s = "", ctx = state.ctx, set = {}, hash = "" } = {}) => {
    const next = new URLSearchParams();
    if (ctx.id !== CONTEXTS[0].id || ctx.newUser) next.set("as", ctx.id);
    if (g) next.set("g", g);
    if (s) next.set("s", s);
    DEMO_KEYS.forEach((key) => { if (params.get(key)) next.set(key, params.get(key)); });
    Object.entries(set).forEach(([key, value]) => next.set(key, value));
    const query = next.toString();
    return `v2.html${query ? `?${query}` : ""}${hash}`;
  };
  const sectionHref = (s, ctx = state.ctx) => urlOf({ s, ctx });
  const groupHref = (g, ctx = state.ctx) => (directSection(ctx, g) ? sectionHref(directSection(ctx, g), ctx) : urlOf({ g, ctx }));
  const recordHref = (s, id, ctx = state.ctx) => (s === "cereri" ? urlOf({ s, ctx, hash: `#dosar/${id}` }) : s === "acte" ? urlOf({ s, ctx, set: { act: id } }) : sectionHref(s, ctx));
  /* in-page navigation where the shell draws the page (Acasă, groups, sections not built yet); the copied views
     (Cererile, Acte permisive, Notificări) are their own page loads */
  const inPage = (s) => VIEW === "cabinet" && !SECTIONS[s]?.view;
  const goAttr = ({ g = "", s = "", home = false }) => {
    /* a record link (no group / section named) is always a real page load */
    if (!g && !s && !home) return "";
    const target = s || directSection(state.ctx, g) || "";
    if (!inPage(target)) return "";
    return ` data-cab2-go${g && !s && !directSection(state.ctx, g) ? ` data-cab2-g="${escape(g)}"` : ""}${target ? ` data-cab2-s="${escape(target)}"` : ""}`;
  };
  const linkAttrs = (target) => `href="${escape(target.href)}"${goAttr(target)}`;
  const toGroup = (g) => ({ g, href: groupHref(g) });
  const toSection = (s) => ({ s, href: sectionHref(s) });
  const toHome = () => ({ home: true, href: urlOf() });

  /* what the address asks for → what is shown */
  function resolve(ctx, { g = "", s = "" }) {
    if (VIEW !== "cabinet") { const section = { solicitari: "cereri", acte: "acte", notificari: "notificari" }[VIEW]; return { page: "section", section, group: groupOf(ctx, section) }; }
    if (s === NEW_POWER) return ctx.kind === "self" ? { page: "section", section: NEW_POWER } : { page: "acasa", redirect: true };
    if (s === TODO_PAGE) return { page: "todo" };
    if (OUTSIDE[s]) return { page: "outside", section: s };
    if (s && SECTIONS[s]) {
      if (inMenu(ctx, s)) return { page: "section", section: s, group: groupOf(ctx, s) };
      if (ctx.scope) return { page: "section", section: s, denied: true };
      return { page: "acasa", redirect: true };
    }
    if (g && menuOf(ctx).some(([id]) => id === g)) {
      const direct = directSection(ctx, g);
      return direct ? { page: "section", section: direct, group: g, redirect: true } : { page: "group", group: g };
    }
    return { page: "acasa", redirect: Boolean(g || s) };
  }
  const currentTarget = () => (state.page === "group" ? { g: state.group } : state.page === "section" ? { s: state.section } : state.page === "todo" ? { s: TODO_PAGE } : state.page === "outside" ? { s: state.section } : {});

  /* ---------- frame ---------- */
  document.body.insertAdjacentHTML("afterbegin", '<a class="btn btn-secondary btn-md cab2-skip" href="#cab2-content" data-cab2-skip>Sari la conținut</a>');
  header.insertAdjacentHTML("afterend", '<div class="cab2-context" role="region" aria-label="Pentru cine acționezi" data-cab2-context hidden></div>');
  frame.insertAdjacentHTML("afterbegin", '<p class="u-visually-hidden" role="status" aria-live="polite" data-cab2-live></p><a class="btn btn-secondary btn-md cab2-skip" href="#cab2-content" data-cab2-skip>Sari peste meniu</a>');
  document.querySelector("main")?.insertAdjacentHTML("afterend", '<nav class="cab2-bar" aria-label="Navigare rapidă" data-cab2-bar></nav>');
  if (VIEW === "cabinet") host.hidden = false;

  const els = {
    context: document.querySelector("[data-cab2-context]"),
    live: frame.querySelector("[data-cab2-live]"),
    menu: frame.querySelector("[data-cab2-menu]"),
    content: frame.querySelector("[data-cab2-content]"),
    page: host,
    bar: document.querySelector("[data-cab2-bar]"),
    panel: document.querySelector("#fo-avatar-menu"),
    avatar: () => header.querySelector("[data-fo-avatar-trigger]"),
  };
  document.documentElement.classList.add("has-cab2-bar");

  const measure = () => {
    document.documentElement.style.setProperty("--cab2-header-height", `${Math.round(header.getBoundingClientRect().height)}px`);
    document.documentElement.style.setProperty("--cab2-bar-height", `${Math.round(els.bar.getBoundingClientRect().height)}px`);
  };
  if ("ResizeObserver" in window) { const ro = new ResizeObserver(measure); ro.observe(header); ro.observe(els.bar); }
  window.addEventListener("resize", measure);

  /* ---------- context line (M2) ---------- */
  function renderContext() {
    const ctx = state.ctx;
    if (ctx.kind === "self") { els.context.hidden = true; els.context.innerHTML = ""; return; }
    const soon = expiresSoon(ctx);
    const sep = '<span class="cab2-context__sep" aria-hidden="true">·</span>';
    const parts = [
      `<span class="cab2-context__part">Acționezi pentru <strong>${escape(ctx.name)}</strong></span>`,
      `<span class="cab2-context__part">${escape(identifier(ctx))}</span>`,
      `<span class="cab2-context__part">${escape(capacity(ctx))}</span>`,
      soon === null ? "" : `<span class="cab2-context__part">${tag(expiryLabel(soon), "warning")}</span>`,
      ctx.viewOnly ? '<span class="cab2-context__part"><strong>doar vizualizare</strong></span>' : "",
    ].filter(Boolean);
    els.context.hidden = false;
    els.context.innerHTML = `
      <div class="cab2-context__inner">
        <p class="cab2-context__text">${parts.join(sep)}</p>
        ${SINGLE ? "" : `<button class="btn btn-text-primary btn-sm" type="button" aria-haspopup="menu" aria-controls="fo-avatar-menu" aria-expanded="false" data-cab2-switch-open>Schimbă${hidden(" pentru cine acționezi")}</button>`}
      </div>`;
  }

  /* ---------- identity hero (cab2-hero-v1, product owner 2026-11-18: „move the user under — use our switcher; when
     MPower, a smaller icon”) ----------
     The person left the menu: Acasă opens with a centred hero (Google Account / Yandex ID home) — avatar in the brand
     ring (library `--xl` 72, the largest size), the name as H1, one quiet line, „Schimbă” → the existing switcher
     anchored under Acting for someone: the large avatar is the entity, the signed-in person a small apricot badge on its corner; the line
     says it in words. Research: .claude/evo-cabinet/research/account-home-layout.md. */
  const SELF = () => CONTEXTS.find((item) => item.kind === "self") || CONTEXTS[0];
  /* the library avatar of a context: company = `icon-business`, a person = initials on the brand ground */
  const avatarHtml = (ctx, size, cls = "") => (ctx.kind === "company"
    ? `<span class="avatar avatar--${size} avatar--icon${cls ? ` ${cls}` : ""}" aria-hidden="true">${ico("business")}</span>`
    : `<span class="avatar avatar--${size} avatar--initials cab2-avatar--brand${cls ? ` ${cls}` : ""}" aria-hidden="true">${escape(ctx.initials)}</span>`);
  /* the signed-in person's small avatar on the entity's corner — only when acting for someone else */
  const badgeHtml = (ctx) => (ctx.kind === "self" ? "" : `<span class="avatar avatar--xs avatar--initials cab2-avatar--apricot cab2-avatar-badge" aria-hidden="true">${escape(SELF().initials)}</span>`);
  /* ---------- your photo (cab2-wave-v1, product owner 2026-11-18: „change avatar”) ----------
     Prototype only: the chosen image (scaled to 256 px, JPEG) lives in localStorage `cab2-photo` (try / catch — blocked
     storage = this page only); `?foto=demo` shows the demo photo without touching storage. Library avatar `--image`. */
  const PHOTO_KEY = "cab2-photo";
  const DEMO_PHOTO = "../assets/images/e-permits-fo-avatar-anastasia.png";
  let photoMemory = params.get("foto") === "demo" ? DEMO_PHOTO : null;
  const photoOf = () => {
    if (photoMemory !== null) return photoMemory || "";
    try { return window.localStorage.getItem(PHOTO_KEY) || ""; } catch (error) { return ""; }
  };
  const storePhoto = (url) => {
    photoMemory = url || "";
    try { if (url) window.localStorage.setItem(PHOTO_KEY, url); else window.localStorage.removeItem(PHOTO_KEY); } catch (error) { /* memory only */ }
  };
  const photoFaceHtml = (url, size) => `<span class="avatar avatar--${size} avatar--image cab2-avatar--photo" aria-hidden="true"><img src="${escape(url)}" alt=""></span>`;
  const selfFaceHtml = (ctx, size, url = photoOf()) => (url ? photoFaceHtml(url, size) : avatarHtml(ctx, size));
  const penHtml = () => `<button class="btn btn-neutral btn-sm btn-icon-only btn-rounded cab2-photo-edit" type="button" aria-label="Schimbă fotografia" aria-haspopup="dialog" data-cab2-photo-open>${ico("edit")}</button>`;
  /* „Acționezi ca administrator · Anastasia Cojocaru” (glossary 07: „ca administrator” / „prin împuternicire …”) */
  const actingLine = (ctx) => `Acționezi ${capacity(ctx, { validity: false })} · ${SELF().name}${ctx.viewOnly ? " · doar vizualizare" : ""}`;
  function heroHtml(ctx) {
    const own = ctx.kind === "self";
    const line = own ? identifier(ctx) : actingLine(ctx);
    /* „Schimbă” left the hero (product owner 2026-11-18): switching = the header avatar menu (the FO full-flow switcher).
       The name + line fade up one after another on load, with the wave (Cab2Motion.entrance, cab2.css § 5.6) */
    /* cab2-wave-v1: the wave ring (cab2-wave-avatar.js, mounted in drawPage); your own avatar = your photo (or initials)
       + the pen „Schimbă fotografia” bottom-right; acting for someone = the entity + the apricot badge there, no pen */
    const face = own ? selfFaceHtml(ctx, "xl") : avatarHtml(ctx, "xl");
    return `
      <header class="cab2-hero cab2-hero--identity" data-cab2-hero>
        <span class="cab2-hero__ring cab2-hero__ring--wave"><span class="cab2-avatar-host" data-cab2-wave-host>${face}${own ? penHtml() : badgeHtml(ctx)}</span></span>
        <div class="cab2-hero__text">
          <h1 class="cab2-hero__title" id="cab2-title" tabindex="-1">${escape(ctx.name)}</h1>
          <p>${escape(line)}</p>
        </div>
      </header>`;
  }

  /* ---------- menu v3 = the BO sidebar items (css/shell-nav.css): one row per group; the open group's sections under
     it (no icon, indented to the label — no BO sub-item exists) ---------- */
  const badge = (count) => (count ? `<span class="badge badge--solid-neutral badge--xl e-permits-shell__nav-badge" aria-hidden="true">${count}</span>${hidden(`, ${count === 1 ? "un lucru" : `${count} lucruri`} de rezolvat`)}` : "");
  const navItem = ({ id, label, href = "", attrs = "", on = false, open = false, count = 0, button = false, hint = "", sub = false, current = on }) => {
    /* cab2-menu-oneline-v1: the label = one line in every state; `data-label` reserves the selected (medium) width, a
       label that still does not fit ends in „…” + the library tooltip (markTips) */
    const text = `<span class="e-permits-shell__nav-text"><span class="cab2-menu__label" data-label="${escape(label)}"><span class="cab2-menu__label-text" data-cab2-tip="${escape(label)}">${escape(label)}</span></span>${hint ? `<span class="cab2-menu__hint">${escape(hint)}</span>` : ""}</span>`;
    const inner = `${sub ? "" : '<span class="e-permits-shell__nav-icon" aria-hidden="true"></span>'}${text}${badge(count)}`;
    const cls = `e-permits-shell__nav-link${sub ? " cab2-menu__sub" : ""}${on ? " is-active" : ""}${open ? " is-open" : ""}${hint ? " cab2-menu__link--hint" : ""}`;
    return button
      ? `<button class="${cls} cab2-menu__button" type="button" data-nav-id="cab2-${escape(id)}"${attrs}>${inner}</button>`
      : `<a class="${cls}" href="${escape(href)}" data-nav-id="cab2-${escape(id)}"${current ? ' aria-current="page"' : ""}${attrs}>${inner}</a>`;
  };
  function menuHtml(prefix, { sheet = false } = {}) {
    const ctx = state.ctx;
    const page = state.denied ? "" : state.page;
    const items = [`<li>${navItem({ id: "g-acasa", label: "Acasă", href: urlOf(), attrs: `${goAttr({ home: true })} data-cab2-nav="acasa"`, on: page === "acasa" })}</li>`];
    menuOf(ctx).forEach(([group, ids]) => {
      const direct = directSection(ctx, group);
      const here = !state.denied && (state.group === group || (direct && state.section === direct));
      const onPage = here && (page === "group" || (direct && page === "section"));
      const subs = !sheet && here && !direct ? `<ul class="e-permits-shell__nav-list cab2-menu__sublist" aria-label="${escape(groupLabel(ctx, group))}">${ids.map((id) => `<li>${navItem({
        id, label: titleOf(id, ctx), href: sectionHref(id), attrs: `${goAttr({ s: id })} data-cab2-nav="${escape(id)}"`, sub: true, on: page === "section" && state.section === id, count: sectionCount(ctx, id),
      })}</li>`).join("")}</ul>` : "";
      items.push(`<li>${navItem({
        id: `g-${group}`, label: groupLabel(ctx, group), href: groupHref(group), attrs: `${goAttr({ g: group })} data-cab2-nav="g-${escape(group)}"`,
        on: onPage, open: here && !onPage, count: groupCount(ctx, group),
        hint: sheet && !direct ? ids.map((id) => titleOf(id, ctx)).join(", ") : "",
      })}${subs}</li>`);
    });
    const mine = sheet ? `
      <div class="e-permits-shell__nav-group">
        <h2 class="e-permits-shell__group-label" id="${prefix}-g-cont">Contul meu</h2>
        <ul class="e-permits-shell__nav-list" aria-labelledby="${prefix}-g-cont">${[
          SINGLE ? "" : navItem({ id: "cont-switch", label: "Pentru cine acționezi?", button: true, attrs: ' aria-haspopup="menu" aria-controls="fo-avatar-menu" data-cab2-switch-open' }),
          navItem({ id: "cont-mpass", label: "Contul MPass", href: "https://mpass.gov.md", attrs: ' target="_blank" rel="noopener"' }).replace("</span></a>", `${hidden(", se deschide în altă pagină")}</span></a>`),
          navItem({ id: "cont-ajutor", label: "Ajutor", href: urlOf({ s: "ajutor" }), attrs: goAttr({ s: "ajutor" }) }),
          navItem({ id: "cont-iesire", label: "Ieși din cont", button: true, attrs: " data-cab2-signout" }),
        ].filter(Boolean).map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>` : "";
    return `
      <div class="e-permits-shell__nav e-permits-shell__nav--specialist cab2-menu__list">
        <div class="e-permits-shell__nav-group"><ul class="e-permits-shell__nav-list" aria-label="Secțiunile Cabinetului">${items.join("")}</ul></div>${mine}
      </div>`;
  }
  function renderMenu() {
    els.menu.innerHTML = menuHtml("cab2-m");
    if (sheetOpen(menuSheet)) menuSheet.querySelector("[data-sheet-body]").innerHTML = `<nav aria-label="Meniul Cabinetului">${menuHtml("cab2-ms", { sheet: true })}</nav>`;
    markTips(els.menu);
  }
  /* a truncated name gets the library tooltip (js/icon-tooltip.js › data-tooltip-text) — only when it is cut */
  window.addEventListener("resize", () => { markTips(els.menu); if (sheetOpen(menuSheet)) markTips(menuSheet); });
  function markTips(root) {
    root.querySelectorAll("[data-cab2-tip]").forEach((el) => { if (el.scrollWidth > el.clientWidth + 1) el.setAttribute("data-tooltip-text", el.dataset.cab2Tip); else el.removeAttribute("data-tooltip-text"); });
  }

  /* ---------- phone bottom bar: Acasă · Cereri · Documente · Bani · Meniu (each middle tab = its group page) ---------- */
  const BAR = [["acasa", "Acasă", "home-line"], ["cereri", "Cereri", "permission"], ["documente", "Documente", "id-card"], ["bani", "Bani", "wallet"]];
  function renderBar() {
    const ctx = state.ctx;
    const current = state.denied ? "" : state.page === "acasa" ? "acasa" : state.group || groupOf(ctx, state.section);
    const items = BAR.map(([group, label, glyph]) => {
      if (group !== "acasa" && !sectionsOf(ctx, group).length) return "";
      const target = group === "acasa" ? toHome() : toGroup(group);
      const on = current === group;
      return `<li><a class="cab2-bar__item" ${linkAttrs(target)}${on ? ' aria-current="page"' : ""}>${ico(on && group !== "cereri" ? `${glyph}-filled` : glyph)}<span>${label}</span></a></li>`;
    }).join("");
    els.bar.innerHTML = `<ul class="cab2-bar__list">${items}<li><button class="cab2-bar__item" type="button" aria-haspopup="dialog" aria-expanded="${sheetOpen(menuSheet)}" data-cab2-menu-open>${ico("menu")}<span>Meniu</span></button></li></ul>`;
    measure();
  }

  /* ---------- page parts: BO formats only ---------- */
  const SOURCE = (id, ctx = state.ctx) => `Date de la ${pick(SECTIONS[id].source, ctx)[1]} · ${SOURCE_TIME}`;
  const btn = (kind) => `btn btn-${kind}${isPhone() ? "" : " btn-md"}`;
  /* the shared page header (GEAPPageHeader.top): breadcrumb (parents only) · H1 · purpose / status lines · caption = the
     source line. No `data-cab-profile-header` (that one narrows the column to the 1024 profile width). */
  function headHtml({ title, titleId = "cab2-title", crumbs = [], lines = [], caption = "", actions = "" }) {
    const subtitleHtml = lines.filter(Boolean).map((line) => `<p class="cab-page-header__subtitle cab2-head__line">${line}</p>`).join("");
    return `
      <header class="e-permits-page-header cab-page-header cab-profile-header cab2-head">
        <div class="e-permits-page-header__body">
          <div class="e-permits-page-header__top">${window.GEAPPageHeader.top({ crumbs: crumbs.length ? [...crumbs, { label: title }] : [], title, titleId, subtitleHtml, wrap: true, actions, actionsPlacement: "below", caption })}</div>
        </div>
      </header>`;
  }
  /* the group crumb of a section (none when the group has no page) */
  const crumbsFor = (section, ctx = state.ctx) => {
    const group = groupOf(ctx, section);
    if (!group || directSection(ctx, group)) return [];
    return [{ label: groupLabel(ctx, group), href: groupHref(group, ctx) }];
  };
  /* for the copied views: their list header, their record breadcrumb (… › Cererile mele) */
  function sectionHeadHtml(section, { titleId = "cab2-title" } = {}) {
    const ctx = state.ctx;
    return headHtml({ title: titleOf(section, ctx), titleId, crumbs: crumbsFor(section, ctx), lines: [escape(pick(SECTIONS[section].text, ctx))], caption: SOURCE(section, ctx) });
  }

  /* a titled block = the BO profile section (18/26 title in its 48 row) */
  const block = (id, title, body, more = null) => `
    <section class="e-permits-dosar-profil__section cab-section cab2-block" aria-labelledby="${escape(id)}">
      <h2 class="e-permits-dosar-profil__section-title" id="${escape(id)}">${escape(title)}</h2>
      ${body}
      ${more ? `<p class="cab2-block__more"><a class="btn btn-text-primary btn-sm" ${linkAttrs(more)}>${escape(more.label)}</a></p>` : ""}
    </section>`;
  const row = (label, valueHtml) => C.detailRow(label, valueHtml);
  const notice = (text) => `
    <div class="message message--subtle banner--warning message--small cab-message cab2-notice" role="status">
      <span class="banner__icon">${ico("warning-filled", "medium")}</span>
      <div class="banner__content"><p>${escape(text)}</p></div>
    </div>`;
  const sourceDown = (id) => { const down = params.get("indisponibil"); return Boolean(down && SECTIONS[id] && norm(pick(SECTIONS[id].source, state.ctx)[1]) === norm(down)); };
  const downText = (id) => `Nu am putut încărca datele de la ${pick(SECTIONS[id].source, state.ctx)[0]}. Încearcă din nou mai târziu.`;

  /* rows = the Cabinet act / request row (js/act-row.js, GEAPActRow — the one stacked row) */
  const rowList = (rows, label) => `<ul class="e-permits-fo-intent__list cab-act-list cab-request-list cab2-rows" aria-label="${escape(label)}">${rows.join("")}</ul>`;
  const STATUS_TONE = { schita: "neutral", derulare: "info", achitare: "warning", info: "warning", finalizat: "success" };
  function requestRow(d) {
    const service = serviceOf(d.service);
    const label = data.cereri?.statuses?.[d.status]?.label || d.status;
    const href = recordHref("cereri", d.id);
    return window.GEAPActRow.html({ id: d.id, name: service.title || d.object || d.nr, status: d.status, statusLabel: label }, {
      assets: "../assets/", iconSrc: "", tagHtml: C.tagHtml(label, STATUS_TONE[d.status] || "neutral"), place: service.title ? d.object || "" : "", titleHref: href,
      metaSlots: { number: d.nr, numberLabel: `Copiază numărul ${d.nr}`, what: d.tip || "", authority: service.authority, subdivision: d.subdivision, date: `Depusă ${longDate(d.submitted)}` },
      attrs: `tabindex="0" data-cab2-href="${escape(href)}" aria-label="${escape(`${service.title || d.nr}${d.object ? `, ${d.object}` : ""} — ${label}, deschide detaliile`)}"`,
      actionHtml: "", rowClass: "cab-request-row cab2-row",
    });
  }
  function todoRow(item) {
    const ctx = state.ctx;
    const href = item.id ? recordHref(item.section, item.id) : sectionHref(item.section);
    const target = { s: item.id ? "" : item.section, href };
    /* view-only: no action, only the way in; acting for someone: the button names the entity — visibly on a payment
       („Achită pentru Agro-Nord SRL”, wiki 02 › Contexts; S1 leftover 2026-11-18), for screen readers on the others */
    const label = ctx.viewOnly ? "Vezi detaliile" : item.action;
    const pay = !ctx.viewOnly && item.action === "Achită";
    const forWhom = ctx.kind === "self" ? "" : pay ? ` pentru ${escape(ctx.name)}` : hidden(` pentru ${ctx.name}`);
    const button = `<a class="btn btn-neutral btn-sm" ${linkAttrs(target)}>${escape(label)}${forWhom}</a>`;
    const meta = [titleOf(item.section, ctx), ...(item.meta || []).filter((part) => part && part !== titleOf(item.section, ctx))];
    /* a record number = the compact copy value (act row meta slot 1), as in the lists */
    return window.GEAPActRow.html({ id: `todo-${item.section}-${item.id || ""}`, name: item.text, status: "", statusLabel: "", ...(item.nr ? {} : { meta }) }, {
      assets: "../assets/", iconSrc: "", tagHtml: "", ...(item.nr ? { metaSlots: { number: item.nr, numberLabel: `Copiază numărul ${item.nr}`, what: meta.join(" · ") } } : {}),
      attrs: `data-cab2-href="${escape(href)}"`, actionHtml: "", rowClass: "cab2-row cab2-todo",
    /* the one labelled button sits beside the sentence (desktop) / under it (phones) — not in the act row's corner
       trigger slot, which is sized for ⋮ / „Postprocese ⌄” */
    }).replace(/<\/li>\s*$/, `<div class="cab2-todo__action">${button}</div></li>`);
  }
  function docRow(section, [title, value, tagLabel, tone, line]) {
    const href = sectionHref(section);
    return window.GEAPActRow.html({ id: `doc-${section}-${title}`, name: title, status: "", statusLabel: tagLabel || "", meta: [line, value].filter(Boolean) }, {
      assets: "../assets/", iconSrc: "", tagHtml: tagLabel ? tag(tagLabel, tone || "neutral") : "",
      titleHref: href, attrs: `tabindex="0" data-cab2-href="${escape(href)}" aria-label="${escape(`${title}${tagLabel ? ` — ${tagLabel}` : ""}, deschide ${titleOf(section)}`)}"`, actionHtml: "", rowClass: "cab2-row",
    });
  }
  /* a section as a BO card on a group page: its rows (label / value), „Vezi toate”; a source down = the notice inside */
  function sectionCard(id) {
    const ctx = state.ctx;
    const body = sourceDown(id) ? notice(downText(id)) : C.detailCard(cardsOf(ctx, id).map(([title, value, tagLabel, tone]) => row(title, `${escape(value)}${tagLabel ? ` ${tag(tagLabel, tone || "neutral")}` : ""}`)));
    return block(`cab2-sec-${id}`, titleOf(id, ctx), body, { ...toSection(id), label: "Vezi toate" });
  }
  const emptyBox = (cfg) => `<div class="cab-state cab2-state">${window.GEAPEmptyState.render({ compact: true, ...cfg })}</div>`;

  /* ---------- Acasă (cab2-home-v1, product owner 2026-11-18: „similar to the Yandex one, make access clearer with clear
     alerts; the style of the Solicitările mele profiles; actions blue primary for Achită or Trimite informația”) ----------
     Reading order: identity hero · „De rezolvat” = the profile ALERT CARD (GEAPAlertCard, js/alert-card.js — the request
     profile's `alertCardHtml`) one per level 1–3 item, max 3, then „Vezi toate (N)” · „În curând” (levels 4–5, quieter:
     the rows) · one section per menu group with content (menu order): heading = the group name + chevron (a link to the
     group page) → a row of 2–3 tiles = the dashboard widget card (Cab2.card, bordered on the white page) · source line. */
  const FO_FLOW = "../e-permits-acte-permisive.html";
  const ALERT_MAX = 3;
  /* the primary that solves an item: a request = its own step (pay = the profile with MPay open, info = the FO
     supplement step); anything else = its section (not built yet). Acting for someone: the button names the entity —
     visibly on a payment, for screen readers on the rest (wiki 02 › Contexts) */
  function alertPrimary(item) {
    const ctx = state.ctx;
    const record = item.section === "cereri" && item.id;
    const href = record && item.kind === "info"
      ? `${FO_FLOW}?${new URLSearchParams({ flow: "full", solicitant: ctx.id, suplinire: item.nr })}#request-step-2`
      : record ? urlOf({ s: "cereri", set: item.kind === "pay" ? { plata: "1" } : {}, hash: `#dosar/${item.id}` }) : sectionHref(item.section);
    const pay = item.action === "Achită";
    const glyph = pay ? "credit-card" : item.kind === "info" ? "page-upload" : "";
    const forWhom = ctx.kind === "self" ? "" : pay ? ` pentru ${escape(ctx.name)}` : hidden(` pentru ${ctx.name}`);
    const size = isPhone() ? "" : " btn-md";
    return `<a class="btn btn-primary${size} btn-rounded" href="${escape(href)}"${record ? "" : goAttr({ s: item.section })}>${glyph ? ico(glyph) : ""}<span>${escape(item.action)}${forWhom}</span></a>`;
  }
  function alertHtml(item) {
    const ctx = state.ctx;
    const size = isPhone() ? "" : " btn-md";
    const href = item.id ? recordHref(item.section, item.id) : sectionHref(item.section);
    /* view only: no action — the body already says why; the quiet way in stays (alone = outline, next to a primary = text) */
    const more = item.more ? `<a class="btn ${ctx.viewOnly ? "btn-outline-strict" : "btn-text-strict"}${size} btn-rounded" href="${escape(href)}"${item.id ? "" : goAttr({ s: item.section })}>${escape(item.more)}</a>` : "";
    /* cab2-alert-stack-v1: the buttons sit under the text, primary first */
    const actions = `${ctx.viewOnly ? "" : alertPrimary(item)}${more}`;
    const tone = item.level === 1 ? "danger" : "warning";
    return `<li class="cab2-alerts__item">${window.GEAPAlertCard.html({
      tone, title: escape(item.title || item.text), text: item.body ? escape(item.body) : "", actions, role: "", titleTag: "h3", className: "cab2-alert cab2-alert--stack", sprite: SPRITE,
    })}</li>`;
  }
  const alertList = (items) => `<ul class="cab2-alerts" aria-label="De rezolvat">${items.map(alertHtml).join("")}</ul>`;

  /* the tiles of a group (≤ 3): what is most useful at a glance; a source that is down drops its tile (all down = the
     notice) */
  const actsTile = (ctx) => {
    const acts = actsOf(ctx);
    if (!acts.length) return null;
    const valid = acts.filter((a) => a.status === "valabil");
    const next = valid.filter((a) => daysUntil(a.validUntil) >= 0).sort((a, b) => daysUntil(a.validUntil) - daysUntil(b.validUntil))[0];
    const days = next ? daysUntil(next.validUntil) : null;
    return { section: "acte", title: titleOf("acte", ctx), value: valid.length === 1 ? "1 valabil" : `${valid.length} valabile`,
      tag: days !== null && days <= 90 ? `Expiră în ${days} de zile` : "", tone: "warning",
      line: next ? `Cel mai apropiat termen: ${longDate(next.validUntil)}` : "Niciun act valabil", action: "Vezi actele" };
  };
  const requestTile = (d) => {
    const service = serviceOf(d.service);
    const label = data.cereri?.statuses?.[d.status]?.label || d.status;
    return { section: "cereri", title: service.title || d.object || d.nr, tag: label, tone: STATUS_TONE[d.status] || "neutral",
      line: [d.object, `Depusă ${longDate(d.submitted)}`].filter(Boolean).join(" · "), action: "Vezi cererea", href: recordHref("cereri", d.id), record: true };
  };
  const finesDue = (ctx) => todosOf(ctx).find((item) => item.section === "amenzi");
  const TILES = {
    identitate: (ctx) => cardsOf(ctx, "identitate").slice(0, 3).map(([title, value, tagLabel, tone]) => ({ title, value: "", tag: tagLabel, tone, line: value, action: "Deschide" })),
    fisiere: () => ({ value: "9 fișiere", line: "Ultimul: contract de locațiune, 4 octombrie 2026" }),
    plati: () => ({ value: "500 lei", line: "Ultima plată, 6 octombrie 2026" }),
    taxe: (ctx) => (ctx.id === "pj-agro-nord"
      ? { value: "2 310 lei", tag: "Termen depășit", tone: "danger", line: "Datorie la impozitul pe venit" }
      : { value: "0 lei", tag: "La zi", tone: "success", line: "Nicio datorie restantă la buget" }),
    amenzi: (ctx) => { const due = finesDue(ctx); return due ? { value: money(due.amount), tag: "De achitat", tone: "warning", line: "O amendă neachitată" } : { value: "0 lei", line: "4 amenzi achitate, ultima pe 14 august 2026" }; },
    imobile: (ctx) => (ctx.kind === "company" ? { value: "1 bun imobil", line: "Depozit, r-nul Orhei" } : { value: "2 bunuri", line: "Un apartament în Chișinău, un teren în Orhei" }),
    vehicule: (ctx) => (ctx.kind === "company" ? { value: "3 vehicule", tag: "RCA la zi", tone: "success", line: "Asigurarea RCA valabilă la toate" } : { value: "2 vehicule", tag: "RCA la zi", tone: "success", line: "Dacia Duster, Škoda Octavia" }),
    gajuri: () => ({ value: "1 gaj", line: "Dacia Duster, în favoarea băncii" }),
    copii: () => ({ value: "2 copii", line: "Daria, 7 ani · Matei, 2 ani" }),
    sanatate: () => ({ value: "Asigurare activă", line: "Până la 31 decembrie 2026 · medic de familie Elena Rotaru" }),
    contributii: (ctx) => (ctx.kind === "company" ? { value: "84 300 lei", tag: "Achitat", tone: "success", line: "Declarate pentru septembrie 2026" } : { value: "11 ani și 4 luni", line: "Stagiu de cotizare" }),
    companii: () => ({ value: "3 companii", line: "Administrator la 2, fondator la 1" }),
    detalii: () => ({ value: "Activă", line: "SRL, înregistrată pe 14 martie 2012" }),
    concedii: () => ({ value: "1 de confirmat", tag: "Așteaptă confirmarea", tone: "warning", line: "2 concedii deschise" }),
    controale: () => ({ value: "1 planificat", line: "ANSA, 10 decembrie 2026" }),
    reclamatii: () => ({ value: "0", line: "Nicio reclamație în examinare" }),
    imputerniciri: (ctx) => (ctx.kind === "company" ? { value: "2 persoane", line: "Împuternicite să acționeze pentru companie" } : { value: "3 primite", line: "1 dată de tine, valabilă până la 1 martie 2027" }),
    "acces-date": () => ({ value: "6 accesări", line: "Luna aceasta · ultima: Serviciul Fiscal de Stat, 11 octombrie 2026" }),
  };
  /* phones: 2 tiles per section, one per row (the rest is one tap away on the group page) */
  const tileMax = () => (isPhone() ? 2 : 3);
  function tilesOf(ctx, group) {
    const ids = sectionsOf(ctx, group);
    if (ctx.newUser && group !== "documente") return { tiles: [], down: [] };
    const down = ids.filter((id) => sourceDown(id) && TILES[id]);
    if (group === "cereri") {
      const acts = ids.includes("acte") ? actsTile(ctx) : null;
      const tiles = ids.includes("cereri") ? openRequests(ctx).slice(0, Math.min(2, tileMax() - (acts ? 1 : 0))).map(requestTile) : [];
      return { tiles: [...tiles, ...(acts ? [acts] : [])].slice(0, tileMax()), down };
    }
    const tiles = ids.filter((id) => TILES[id] && !sourceDown(id)).flatMap((id) => {
      const out = TILES[id](ctx);
      return (Array.isArray(out) ? out : [out]).map((tile) => ({ section: id, title: titleOf(id, ctx), action: "Deschide", ...tile }));
    });
    return { tiles: (ctx.newUser ? tiles.slice(0, 1) : tiles).slice(0, tileMax()), down };
  }
  const tileHtml = (tile) => {
    const href = tile.href || sectionHref(tile.section);
    return V2.card({
      title: tile.title, value: tile.value || "", tag: tile.tag || "", tone: tile.tone || "neutral", line: tile.line || "",
      /* no source line per tile (it wrapped to two lines in a third of 768): Acasă closes with the one source line */
      source: "", action: tile.action, href, borderless: false,
      linkAttrs: tile.record ? "" : goAttr({ s: tile.section }),
    });
  };
  function groupSectionHtml(group) {
    const ctx = state.ctx;
    const { tiles, down } = tilesOf(ctx, group);
    const label = groupLabel(ctx, group);
    let body = "";
    /* a source down: its tiles drop out and the notice says so, above what is still there */
    if (tiles.length) body = `${down.length ? notice(downText(down[0])) : ""}<div class="cab2-wcards cab2-home-tiles${tiles.length === 3 ? " cab2-home-tiles--3" : ""}">${tiles.map(tileHtml).join("")}</div>`;
    else if (down.length) body = notice(downText(down[0]));
    else if (group === "cereri" && ctx.newUser) body = emptyBox({ title: "Nu ai încă nicio cerere", text: "Depui o cerere din Catalogul serviciilor și o urmărești apoi aici.", icon: "page-text", actionHtml: `<a class="${btn("secondary")}" ${linkAttrs({ s: "catalog", href: urlOf({ s: "catalog" }) })}>Deschide catalogul</a>` });
    if (!body) return "";
    const id = `cab2-home-g-${group}`;
    /* the heading is the way to the group page (Yandex „Finances ›”): the whole name + chevron = one link */
    return `
      <section class="cab2-home-group" aria-labelledby="${id}">
        <h2 class="e-permits-dosar-profil__section-title cab2-home-group__title" id="${id}"><a class="cab2-home-group__link" ${linkAttrs(toGroup(group))}><span>${escape(label)}</span>${ico("chevron-right")}</a></h2>
        ${body}
      </section>`;
  }
  function homeHtml() {
    const ctx = state.ctx;
    const own = ctx.kind === "self";
    const { todo: todos, soon } = splitTodos(todosOf(ctx));
    const count = countOf(ctx);
    /* 1 · the identity hero (the BO page header stays on every other page) */
    const parts = [heroHtml(ctx)];
    /* 2 · De rezolvat = alert cards, max 3, then „Vezi toate (N)” */
    if (todos.length) parts.push(block("cab2-home-todo", "De rezolvat", alertList(todos.slice(0, ALERT_MAX)), todos.length > ALERT_MAX ? { s: TODO_PAGE, href: urlOf({ s: TODO_PAGE }), label: `Vezi toate (${todos.length})` } : null));
    /* nothing to do: the block stays with the status sentence */
    else parts.push(block("cab2-home-todo", "De rezolvat", `<p class="cab2-source">${escape(todoText(count, own))}</p>`));
    /* 3 · În curând — the quieter block: rows, not alert cards; hidden when empty */
    if (soon.length) {
      const max = isPhone() ? 3 : 5;
      parts.push(block("cab2-home-soon", "În curând", rowList(soon.slice(0, max).map(todoRow), "În curând"), soon.length > max ? { s: TODO_PAGE, href: urlOf({ s: TODO_PAGE }), label: `Vezi toate (${soon.length})` } : null));
    }
    /* 4 · one section per menu group with content, in menu order */
    menuOf(ctx).forEach(([group]) => parts.push(groupSectionHtml(group)));
    /* 5 · where the data comes from — the closing line of Acasă */
    parts.push(`<p class="cab2-source cab2-source--end">Date de la GEAP, ASP, MAI și alte instituții · ${escape(SOURCE_TIME)}</p>`);
    return `<div class="cab2-page cab2-home" data-cab2-page="acasa">${parts.filter(Boolean).join("")}</div>`;
  }

  /* ---------- group page (menu v3) ---------- */
  function groupHtml(group) {
    const ctx = state.ctx;
    const ids = sectionsOf(ctx, group);
    const { todo: todos, soon } = splitTodos(todosOf(ctx).filter((item) => ids.includes(item.section)));
    const count = countOf(ctx, (item) => ids.includes(item.section));
    const status = count ? todoText(count, ctx.kind === "self") : ctx.kind === "self" ? "Nu ai nimic de rezolvat aici" : "Nimic de rezolvat aici";
    const sources = [...new Set(ids.filter((id) => SECTIONS[id].source).map((id) => pick(SECTIONS[id].source, ctx)[1]))];
    const parts = [headHtml({ title: groupLabel(ctx, group), lines: [escape(pick(GROUP_TEXT[group], ctx) || ""), `<strong>${escape(status)}</strong>`], caption: `Date de la ${sources.join(", ")} · ${SOURCE_TIME}` })];
    if (todos.length) parts.push(block("cab2-group-todo", "De rezolvat", rowList(todos.map(todoRow), "De rezolvat")));
    if (soon.length) parts.push(block("cab2-group-soon", "În curând", rowList(soon.map(todoRow), "În curând")));
    if (group === "cereri") {
      const open = openRequests(ctx).slice(0, 5);
      parts.push(block("cab2-group-open", ctx.kind === "self" ? "Cererile tale în lucru" : "Cereri în lucru", open.length ? rowList(open.map(requestRow), "Cereri în lucru") : emptyBox({ title: "Nu ai cereri în lucru", icon: "page-text" })));
      const all = dosareOf(ctx);
      const n = (fn) => all.filter(fn).length;
      const acts = actsOf(ctx);
      if (ids.includes("cereri")) parts.push(block("cab2-sec-cereri", titleOf("cereri", ctx), C.detailCard([
        row("În lucru", `${n((d) => OPEN.includes(d.status))}`), row("Finalizate", `${n((d) => d.status === "finalizat")}`), row("Schițe", `${n((d) => d.status === "schita")}`),
      ]), { ...toSection("cereri"), label: "Vezi toate" }));
      if (ids.includes("acte")) parts.push(block("cab2-sec-acte", titleOf("acte", ctx), C.detailCard([
        row("Valabile", `${acts.filter((a) => a.status === "valabil").length}`),
        row("Expiră în 90 de zile", `${acts.filter((a) => a.status === "valabil" && daysUntil(a.validUntil) <= 90 && daysUntil(a.validUntil) >= 0).length}`),
        row("Suspendate, retrase sau expirate", `${acts.filter((a) => a.status !== "valabil").length}`),
      ]), { ...toSection("acte"), label: "Vezi toate" }));
    } else if (group === "documente" && ctx.kind !== "company") {
      /* the wallet: the documents themselves as stacked rows, then the other sections as cards */
      const wallet = ids.filter((id) => ["identitate", "semnatura", "diplome"].includes(id));
      wallet.forEach((id) => parts.push(block(`cab2-sec-${id}`, titleOf(id, ctx), sourceDown(id) ? notice(downText(id)) : rowList(cardsOf(ctx, id).map((card) => docRow(id, card)), titleOf(id, ctx)), { ...toSection(id), label: "Vezi toate" })));
      ids.filter((id) => !wallet.includes(id)).forEach((id) => parts.push(sectionCard(id)));
    } else {
      ids.forEach((id) => parts.push(sectionCard(id)));
    }
    return `<div class="cab2-page" data-cab2-page="g-${escape(group)}">${parts.join("")}</div>`;
  }

  /* ---------- section pages not built yet (S2 / S3) + states ---------- */
  function sectionHtml(id) {
    const ctx = state.ctx;
    const head = sectionHeadHtml(id);
    /* the parked Batch 2 look (?visual=on): the widget cards */
    if (VISUAL && SECTIONS[id].cards) {
      const cards = cardsOf(ctx, id).map(([title, value, tagLabel, tone, line]) => V2.card({ title, value, tag: tagLabel, tone, line, source: SOURCE(id), action: "" })).join("");
      return `<div class="cab2-page" data-cab2-page="${escape(id)}">${head}<div class="cab2-wcards">${cards}</div></div>`;
    }
    return `<div class="cab2-page" data-cab2-page="${escape(id)}">${head}${emptyBox({ title: "În lucru — secțiunea se construiește", text: `Aici vor fi datele de la ${pick(SECTIONS[id].source, ctx)[0]}.`, icon: "time" })}</div>`;
  }
  function deniedHtml(id) {
    const ctx = state.ctx;
    return `<div class="cab2-page" data-cab2-page="${escape(id)}">${headHtml({ title: titleOf(id, ctx) })}${emptyBox({
      title: "Nu este disponibil pentru această împuternicire",
      text: `Împuternicirea de la ${ctx.name} nu acoperă această secțiune. Poți deschide doar secțiunile din meniu.`,
      icon: "lock", actionHtml: `<a class="${btn("secondary")}" ${linkAttrs(toHome())}>Mergi la Acasă</a>`,
    })}</div>`;
  }
  const newPowerHtml = () => `<div class="cab2-page" data-cab2-page="${NEW_POWER}">${headHtml({ title: titleOf(NEW_POWER), crumbs: [{ label: "Împuterniciri", href: sectionHref("imputerniciri") }] })}${emptyBox({
    title: "În lucru — formularul se construiește",
    text: "Aici vei introduce IDNP-ul sau IDNO-ul persoanei pe care o reprezinți, numărul și data împuternicirii notariale, ce acoperă și până când este valabilă, apoi vei încărca actul.",
    icon: "shield-user",
  })}</div>`;
  const outsideHtml = (id) => `<div class="cab2-page" data-cab2-page="${escape(id)}">${headHtml({ title: OUTSIDE[id].title })}${emptyBox({
    title: "În lucru — pagina se construiește", text: OUTSIDE[id].text, icon: "time",
  })}</div>`;
  function todoPageHtml() {
    const { todo: todos, soon } = splitTodos(todosOf(state.ctx));
    return `<div class="cab2-page" data-cab2-page="${TODO_PAGE}">${headHtml({ title: "De rezolvat", crumbs: [{ label: "Acasă", href: urlOf() }], lines: ["Termenele, plățile și cererile care așteaptă răspunsul tău, în ordinea în care contează."] })}${
      todos.length ? rowList(todos.map(todoRow), "De rezolvat") : emptyBox({ title: "Nu ai nimic de rezolvat", icon: "circle-checkmark-filled" })}${
      soon.length ? block("cab2-todo-soon", "În curând", rowList(soon.map(todoRow), "În curând")) : ""}</div>`;
  }
  function pageHtml() {
    if (state.denied) return deniedHtml(state.section);
    if (state.page === "group") return groupHtml(state.group);
    if (state.page === "todo") return todoPageHtml();
    if (state.page === "outside") return outsideHtml(state.section);
    if (state.page === "section") return state.section === NEW_POWER ? newPowerHtml() : sectionHtml(state.section);
    return homeHtml();
  }
  const pageName = () => (state.denied ? "Nu este disponibil pentru această împuternicire" : state.page === "group" ? groupLabel(state.ctx, state.group) : state.page === "todo" ? "De rezolvat" : state.page === "outside" ? OUTSIDE[state.section].title : state.page === "section" ? titleOf(state.section) : "Acasă");
  const pageTitle = () => {
    const ctx = state.ctx;
    document.title = [pageName(), ctx.kind === "self" ? "" : ctx.name, "EVO Cabinet"].filter(Boolean).join(" · ");
  };
  const focusTitle = () => { const h1 = [...els.content.querySelectorAll("h1[tabindex]")].find((el) => el.getClientRects().length); if (h1) { h1.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); } };
  let heroReplay = false;
  let quietRedraw = false; /* a redraw after „Salvează” (photo) never replays the entrance */
  function drawPage() {
    if (VIEW !== "cabinet") return;
    els.page.innerHTML = data.ready ? pageHtml() : "";
    window.GEAPNameExpand?.scan?.(els.page);
    /* the Google entrance on the hero only: avatar scales in, the ring draws, the lines rise — once per session and
       on a context switch; motion tokens, reduced motion = a short fade (cab2-motion.js, cab2.css § 5.6) */
    const hero = els.page.querySelector("[data-cab2-hero]");
    /* the wave avatar plays with the hero entrance (once per session / context switch; ?entrance=always = every load) */
    const always = params.get("entrance") === "always";
    let fresh = heroReplay || always;
    try { fresh = fresh || !window.sessionStorage.getItem("cab2-entered:cab2-hero"); } catch (error) { fresh = true; }
    /* read at call time: cab2-motion.js is loaded after this file, so the `M` captured at start is undefined (the hero
       entrance never ran before cab2-wave-v1) */
    const motion = window.Cab2Motion;
    if (hero && motion) motion.entrance(hero, { key: "cab2-hero", force: heroReplay || always });
    else if (hero) { try { window.sessionStorage.setItem("cab2-entered:cab2-hero", "1"); } catch (error) { /* plays again */ } }
    mountWave(hero, fresh && !quietRedraw);
    heroReplay = false;
    quietRedraw = false;
  }

  /* ---------- wave avatar on the hero (cab2-wave-v1; cabinet-evo/cab2-wave-avatar.js) ---------- */
  const AVATAR_XL = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-72")) || 72;
  let heroWave = null;
  function mountWave(hero, play) {
    heroWave?.destroy();
    heroWave = null;
    const waveHost = hero?.querySelector("[data-cab2-wave-host]");
    if (!waveHost || !window.WaveAvatar) return;
    /* the hero face is 96 desktop / 80 phones (cab2-wave-avatar.css § 1b) — read from its computed width */
    const face = waveHost.querySelector(".avatar");
    const size = (face && parseFloat(getComputedStyle(face).width)) || AVATAR_XL();
    heroWave = window.WaveAvatar.mount(waveHost, { size, play });
  }
  /* the size changes at 760: redraw the resting shape at the new size (never replays) */
  phoneQuery.addEventListener("change", () => {
    const hero = els.page?.querySelector("[data-cab2-hero]");
    if (hero && heroWave) mountWave(hero, false);
  });

  /* ---------- „Schimbă fotografia” dialog (cab2-wave-v1, product owner 2026-11-18) ----------
     Library modal `--md` (phones: the sheet, css/modal-phone.css): preview = your avatar in the wave shape (static) ·
     „Elimină fotografia” (red text button, only with a photo) · the FO picker's drop zone (drag & drop or „alege de pe
     dispozitiv”; phones: „Încarcă fotografia”) + captions · inline FO field error · footer Renunță · Salvează.
     Nothing is saved before „Salvează”; a success toast confirms (rule: success on return = toast). */
  const PHOTO_MAX = 5 * 1024 * 1024;
  let photoDraft = null; /* null = unchanged · "" = removed · data URL = a new photo */
  let photoOpener = null;
  let previewWave = null;
  function photoModal() {
    let overlay = document.querySelector("[data-cab2-photo-modal]");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay cab2-photo-dialog";
    overlay.id = "cab2-photo-modal";
    overlay.dataset.cab2PhotoModal = "";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="modal modal--md" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="cab2-photo-title">
        <button type="button" class="modal-close" aria-label="Închide" data-cab2-photo-close><span class="d-inline-flex">${ico("cross-large", "small")}</span></button>
        <div class="modal--header"><h2 class="modal--header-title" id="cab2-photo-title">Schimbă fotografia</h2></div>
        <div class="modal-content cab2-photo-dialog__body">
          <div class="cab2-photo-dialog__preview">
            <span class="cab2-avatar-host" data-cab2-photo-preview></span>
            <button class="btn btn-text-destructive btn-sm cab2-photo-dialog__remove" type="button" data-cab2-photo-remove>${ico("delete")}<span>Elimină fotografia</span></button>
          </div>
          <div class="e-permits-fo-doc-modal__drop cab2-photo-dialog__drop">
            <label class="e-permits-fo-doc-modal__drop-zone" data-cab2-photo-zone>
              <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden data-cab2-photo-input>
              <div class="e-permits-fo-doc-modal__drop-icon">${ico("cloud-upload")}</div>
              <div class="e-permits-fo-doc-modal__drop-text">
                <span>Trage fotografia aici sau</span>
                <button class="link link-primary link-lg e-permits-fo-doc-modal__drop-link" type="button" data-cab2-photo-choose>alege de pe dispozitiv</button>
              </div>
              <button class="btn btn-secondary btn-md e-permits-fo-doc-modal__device" type="button" data-cab2-photo-choose>${ico("upload")}Încarcă fotografia</button>
            </label>
            <div class="e-permits-fo-doc-modal__drop-captions">
              <span>O fotografie: JPG sau PNG</span>
              <span>Mărime maximă: 5 MB</span>
            </div>
          </div>
          <p class="message message--inline e-permits-fo-field__error cab2-photo-dialog__error" role="alert" data-cab2-photo-error hidden>${ico("circle-error-filled")}<span data-cab2-photo-error-text></span></p>
          <p class="u-visually-hidden" role="status" aria-live="polite" data-cab2-photo-status></p>
        </div>
        <div class="modal--footer">
          <div class="modal-buttons">
            <button class="btn btn-neutral btn-rounded" type="button" data-cab2-photo-close>Renunță</button>
            <button class="btn btn-primary btn-rounded" type="button" data-cab2-photo-save>Salvează</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("[data-cab2-photo-input]");
    const zone = overlay.querySelector("[data-cab2-photo-zone]");
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-cab2-photo-close]")) { closePhoto(); return; }
      if (event.target.closest("[data-cab2-photo-choose]")) { event.preventDefault(); input.click(); return; }
      if (event.target.closest("[data-cab2-photo-remove]")) {
        photoDraft = "";
        photoError("");
        renderPhotoPreview();
        photoStatus("Fotografia va fi eliminată după ce salvezi.");
        overlay.querySelector("[data-cab2-photo-choose]:not(.e-permits-fo-doc-modal__device)")?.focus();
        return;
      }
      if (event.target.closest("[data-cab2-photo-save]")) savePhoto();
    });
    input.addEventListener("change", () => { if (input.files[0]) pickPhoto(input.files[0]); input.value = ""; });
    ["dragenter", "dragover"].forEach((type) => zone.addEventListener(type, (event) => { event.preventDefault(); zone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((type) => zone.addEventListener(type, () => zone.classList.remove("is-dragover")));
    zone.addEventListener("drop", (event) => { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) pickPhoto(file); });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.stopPropagation(); closePhoto(); return; }
      if (event.key !== "Tab") return;
      const items = [...overlay.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")].filter((el) => el.getClientRects().length);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return overlay;
  }
  const draftPhoto = () => (photoDraft === null ? photoOf() : photoDraft);
  function renderPhotoPreview() {
    const overlay = photoModal();
    const slot = overlay.querySelector("[data-cab2-photo-preview]");
    previewWave?.destroy();
    slot.innerHTML = selfFaceHtml(SELF(), "xl", draftPhoto());
    previewWave = window.WaveAvatar?.mount(slot, { size: AVATAR_XL(), play: false }) || null;
    overlay.querySelector("[data-cab2-photo-remove]").hidden = !draftPhoto();
  }
  function photoStatus(text) { const el = document.querySelector("[data-cab2-photo-status]"); if (el) el.textContent = text; }
  function photoError(text) {
    const el = document.querySelector("[data-cab2-photo-error]");
    if (!el) return;
    el.hidden = !text;
    el.querySelector("[data-cab2-photo-error-text]").textContent = text;
  }
  /* any image URL → a 256 px square JPEG (cover crop) — small enough for localStorage */
  function squarePhoto(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const side = 256;
        const canvas = Object.assign(document.createElement("canvas"), { width: side, height: side });
        const scale = Math.max(side / img.naturalWidth, side / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        const g = canvas.getContext("2d");
        g.fillStyle = "#fff"; /* JPEG has no alpha: transparent PNG parts become white, not black */
        g.fillRect(0, 0, side, side);
        g.drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
        try { resolve(canvas.toDataURL("image/jpeg", 0.86)); } catch (error) { reject(error); }
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  function usePhoto(url) {
    return squarePhoto(url).then((data) => {
      photoDraft = data;
      photoError("");
      renderPhotoPreview();
      photoStatus("Fotografia a fost încărcată. Salvează ca să o folosești.");
    }).catch(() => photoError("Fotografia nu a putut fi citită. Alege alt fișier JPG sau PNG."));
  }
  function pickPhoto(file) {
    if (!/^image\/(jpeg|png)$/.test(file.type)) { photoError("Alege o fotografie JPG sau PNG."); return Promise.resolve(); }
    if (file.size > PHOTO_MAX) { photoError("Fotografia depășește 5 MB. Alege una mai mică."); return Promise.resolve(); }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => usePhoto(String(reader.result)).then(resolve);
      reader.onerror = () => { photoError("Fotografia nu a putut fi citită. Alege alt fișier JPG sau PNG."); resolve(); };
      reader.readAsDataURL(file);
    });
  }
  function openPhoto() {
    const overlay = photoModal();
    photoOpener = document.activeElement;
    photoDraft = null;
    photoError("");
    photoStatus("");
    renderPhotoPreview();
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    overlay.querySelector(".modal").focus();
  }
  function closePhoto() {
    const overlay = document.querySelector("[data-cab2-photo-modal]");
    if (!overlay?.classList.contains("is-active")) return;
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    if (photoOpener?.isConnected) photoOpener.focus();
  }
  function savePhoto() {
    const changed = photoDraft !== null && photoDraft !== photoOf();
    const removed = changed && !photoDraft;
    if (changed) storePhoto(photoDraft);
    closePhoto();
    if (!changed) return;
    quietRedraw = true;
    drawPage();
    els.page.querySelector("[data-cab2-photo-open]")?.focus();
    window.GEAPToast?.show({ type: "success", message: removed ? "Fotografia a fost eliminată." : "Fotografia a fost salvată.", key: "cab2-photo" });
  }
  document.addEventListener("click", (event) => { if (event.target.closest("[data-cab2-photo-open]")) openPhoto(); });
  /* demo hooks (js/demo-states.js › cab2-h10…h13) */
  window.Cab2Photo = { open: openPhoto, use: (url) => usePhoto(url), error: photoError, pick: pickPhoto };

  /* ---------- switcher = the FO full-flow header instance switcher, 1:1 (product owner 2026-11-18: „EXACTLY the one
     the FO full flow uses — no Cabinet-specific variant”; components.md › „Header instance switcher — open state +
     alignment”; reference states fo-01s / sm-01s) ----------
     Trigger = the EVO header avatar (as the Cabinet EVO, sm-01s); panel = `#fo-avatar-menu.e-permits-fo-avatar-menu`
     re-filled with the markup of js/e-permits-acte-permisive.js › avatarMenuProfileHtml / avatarMenuRoleButton /
     renderFrontOfficeAvatarMenuFromSchema (profile · „Alege alt rol” · „Cu împuternicire MPower” · „Ieșire”). Open /
     close / Esc / position / the „Arată mai multe” toggle are the copied panel code (cab2-acte.js › bindAvatarMenu).
     Only hooks are added: `data-cab2-as` (switch the context in place), `data-cab2-signout`. */
  const foAvatar = (ctx, cls) => {
    /* subjectInitialsAvatarHtml: PJ = icon-business, PF = initials; tone apricot for a power, else brand */
    const tone = ctx.group === "powers" ? "apricot" : "brand";
    return ctx.kind === "company"
      ? `<span class="avatar avatar--sm avatar--icon ${cls} ${cls}--icon ${cls}--${tone}" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${SPRITE}#icon-business"></use></svg></span>`
      : `<span class="avatar avatar--sm avatar--initials ${cls} ${cls}--initials ${cls}--${tone}" aria-hidden="true">${escape(ctx.initials)}</span>`;
  };
  const foMeta = (ctx) => `<span class="e-permits-fo-avatar-menu__role-meta e-permits-fo-subject-meta"><span class="e-permits-fo-subject-meta__label">${escape(ctx.idLabel)}</span><span class="e-permits-fo-subject-meta__code">${escape(ctx.idValue)}</span></span>`;
  const foTypeText = (ctx) => (ctx.kind === "company" ? "Persoană juridică" : "Persoană fizică");
  const proxyBadge = (ctx) => (ctx.via === "notarial" ? "Împuternicire notarială" : "Împuternicire");
  function foRoleButton(ctx, { proxy = false } = {}) {
    const on = ctx.id === state.ctx.id;
    const heading = proxy
      ? `<span class="e-permits-fo-avatar-menu__proxy-role-heading"><strong>${escape(ctx.name)}</strong><span class="e-permits-fo-avatar-menu__proxy-badge">${escape(proxyBadge(ctx))}</span></span>`
      : `<strong>${escape(ctx.name)}</strong>`;
    return `
      <button class="${proxy ? "e-permits-fo-avatar-menu__proxy-role" : "e-permits-fo-avatar-menu__role"}${on ? " is-selected" : ""}" type="button" role="menuitemradio" aria-checked="${on}" data-cab2-as="${escape(ctx.id)}">
        ${foAvatar(ctx, "e-permits-fo-avatar-menu__role-avatar")}
        <span class="${proxy ? "e-permits-fo-avatar-menu__proxy-role-copy" : "e-permits-fo-avatar-menu__role-copy"}">${heading}${foMeta(ctx)}</span>
        ${proxy ? "" : `<svg class="icon e-permits-fo-avatar-menu__role-check" width="20" height="20" aria-hidden="true"><use href="${SPRITE}#icon-checkmark-small"></use></svg>`}
      </button>`;
  }
  function foProfileHtml(ctx) {
    /* subjectCompositeAvatarHtml: acting through a power → the representative's overlay on the photo */
    const power = ctx.group === "powers";
    const kind = ctx.kind === "company" ? "icon" : "initials";
    const glyph = ctx.kind === "company" ? `<svg class="icon" width="20" height="20"><use href="${SPRITE}#icon-business"></use></svg>` : escape(ctx.initials);
    const overlay = power ? `<span class="e-permits-fo-avatar-menu__photo-overlay e-permits-fo-avatar-menu__photo-overlay--initials e-permits-fo-avatar-menu__photo-overlay--brand">${escape(SELF().initials)}</span>` : "";
    return `
      <div class="e-permits-fo-avatar-menu__profile-main">
        <span class="avatar avatar--${kind} e-permits-fo-avatar-menu__photo e-permits-fo-avatar-menu__photo--${kind} e-permits-fo-avatar-menu__photo--${power ? "apricot" : "brand"}${power ? " e-permits-fo-avatar-menu__photo--with-overlay" : ""}" aria-hidden="true">${glyph}${overlay}</span>
        <div class="e-permits-fo-avatar-menu__identity">
          <strong>${escape(ctx.name)}</strong>
          <span class="e-permits-fo-avatar-menu__identity-meta">
            <span>${escape(foTypeText(ctx))}</span>
            <span class="e-permits-fo-avatar-menu__identity-dot" aria-hidden="true"></span>
            <span class="e-permits-fo-avatar-menu__identity-id">
              <span>${escape(ctx.idLabel)}</span>
              <span class="copy-value e-permits-fo-avatar-menu__identity-copy"><button class="copy-value__button" type="button" data-copy-value="${escape(ctx.idValue)}" aria-label="Copiază ${escape(ctx.idLabel)} ${escape(ctx.idValue)}" data-no-tooltip><span class="copy-value__text">${escape(ctx.idValue)}</span><svg class="icon small copy-value__icon" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-copy"></use></svg></button></span>
            </span>
          </span>
        </div>
      </div>
      <div class="e-permits-fo-avatar-menu__actions">
        <a class="e-permits-fo-avatar-menu__cabinet" href="${escape(urlOf())}" role="menuitem" ${goAttr({ home: true })}>Cabinetul Personal</a>
        <button class="e-permits-fo-avatar-menu__settings" type="button" aria-label="Setări" role="menuitem"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="${SPRITE}#icon-settings"></use></svg></button>
      </div>`;
  }
  function renderSwitcher() {
    const panel = els.panel;
    if (!panel) return;
    const ctx = state.ctx;
    const direct = CONTEXTS.filter((item) => item.group !== "powers");
    const powers = CONTEXTS.filter((item) => item.group === "powers");
    const isStatic = powers.length > 0 && powers.length < 4;
    const expanded = isStatic || (powers.length >= 4 && ctx.group === "powers");
    const stack = powers.slice(0, 4).map((item, index) => (index === 3 && powers.length > 4
      ? `<span class="avatar avatar--sm avatar--initials e-permits-fo-avatar-menu__stack-avatar e-permits-fo-avatar-menu__stack-avatar--counter">+${powers.length - 3}</span>`
      : foAvatar(item, "e-permits-fo-avatar-menu__stack-avatar"))).join("");
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", "Profil și roluri");
    panel.removeAttribute("aria-labelledby");
    panel.innerHTML = `
      <div class="e-permits-fo-avatar-menu__profile">${foProfileHtml(ctx)}</div>
      <div class="e-permits-fo-avatar-menu__content">
        <section class="e-permits-fo-avatar-menu__group" aria-labelledby="fo-avatar-menu-roles">
          <h2 id="fo-avatar-menu-roles">Alege alt rol</h2>
          <div class="e-permits-fo-avatar-menu__role-list">${direct.map((item) => foRoleButton(item)).join("")}</div>
        </section>
        <section class="e-permits-fo-avatar-menu__group${isStatic ? " is-static" : ""}${expanded ? " is-expanded" : ""}" aria-labelledby="fo-avatar-menu-proxy"${powers.length ? "" : " hidden"}>
          <h2 id="fo-avatar-menu-proxy">Cu împuternicire MPower</h2>
          <button class="e-permits-fo-avatar-menu__proxy" type="button" role="menuitem" aria-expanded="${expanded && !isStatic}" data-fo-avatar-proxy-toggle${powers.length >= 4 ? "" : " hidden"}>
            <span data-fo-avatar-proxy-label>${expanded && !isStatic ? "Arată mai puține" : "Arată mai multe"}</span>
            <span class="e-permits-fo-avatar-menu__proxy-stack" aria-hidden="true">${stack}<span class="e-permits-fo-avatar-menu__proxy-arrow"><svg class="icon" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg></span></span>
          </button>
          <div class="e-permits-fo-avatar-menu__proxy-details" data-fo-avatar-proxy-details>${powers.map((item) => foRoleButton(item, { proxy: true })).join("")}</div>
        </section>
      </div>
      <div class="e-permits-fo-avatar-menu__footer">
        <button class="e-permits-fo-avatar-menu__logout" type="button" role="menuitem" data-cab2-signout>
          <span>Ieșire</span>
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="${SPRITE}#icon-logout"></use></svg>
        </button>
      </div>`;
    /* the trigger = the Cabinet EVO header avatar as it is (the signed-in person; sm-01s) */
    header.querySelectorAll("[data-evo-initials]").forEach((el) => { el.textContent = SELF().initials; });
    const trigger = els.avatar();
    trigger?.querySelectorAll("[data-cab-name]").forEach((el) => { el.textContent = ctx.name; });
  }
  function switcherOpen() { return els.avatar()?.getAttribute("aria-expanded") === "true"; }
  /* „Schimbă” (hero, context line) and the phone „Pentru cine acționezi?” open the same panel: the header avatar's click */
  function openSwitcher() {
    const avatar = els.avatar();
    if (!avatar) return;
    window.setTimeout(() => {
      if (!switcherOpen()) avatar.click();
      window.requestAnimationFrame(() => (els.panel.querySelector('[aria-checked="true"]') || els.panel.querySelector("[data-cab2-as]"))?.focus());
    }, 0);
  }
  const closeSwitcher = () => { if (switcherOpen()) els.avatar()?.click(); };
  /* an opener keeps its pressed state while the panel is open (project rule) */
  let lastOpener = null;
  const syncOpeners = () => {
    const open = switcherOpen();
    document.querySelectorAll("[data-cab2-switch-open][aria-haspopup]").forEach((el) => el.setAttribute("aria-expanded", String(open && el === lastOpener)));
    if (!open) lastOpener = null;
  };

  /* ---------- render + navigation ---------- */
  function renderAll() {
    renderContext();
    renderMenu();
    renderBar();
    renderSwitcher();
    pageTitle();
  }
  function apply(target, { replace = false, push = true } = {}) {
    const next = resolve(state.ctx, target);
    Object.assign(state, { page: next.page, group: next.group || "", section: next.section || "", denied: Boolean(next.denied) });
    if (VIEW !== "cabinet") return;
    const url = urlOf(currentTarget().g ? { g: state.group } : currentTarget().s ? { s: currentTarget().s } : {});
    if (replace || next.redirect) window.history.replaceState({ cab2: true }, "", url);
    else if (push) window.history.pushState({ cab2: true }, "", url);
  }
  async function go(target, { push = true } = {}) {
    closeSearch();
    apply(target, { push });
    renderAll();
    if (VISUAL && M) await M.fadeThrough(els.page, () => { drawPage(); focusTitle(); });
    else { drawPage(); focusTitle(); }
  }
  /* a switch always lands on Acasă of the new context, says so, moves focus to the title; never signs out */
  const ANNOUNCE_KEY = "cab2-switch-announce";
  const announceText = (ctx) => (ctx.kind === "self" ? "Acum acționezi pentru tine." : `Acum acționezi pentru ${ctx.name}, ${capacity(ctx, { validity: false })}${ctx.viewOnly ? ", doar vizualizare" : ""}.`);
  function switchTo(id) {
    const ctx = contextOf(id);
    closeSwitcher();
    closeMenuSheet({ focus: false });
    if (VIEW !== "cabinet") {
      try { sessionStorage.setItem(ANNOUNCE_KEY, announceText(ctx)); } catch { /* the announcement is a nicety */ }
      window.location.assign(urlOf({ ctx }));
      return;
    }
    state.ctx = ctx;
    heroReplay = true;
    apply({});
    renderAll();
    drawPage();
    focusTitle();
    els.live.textContent = "";
    window.setTimeout(() => { els.live.textContent = announceText(ctx); }, 60);
    if (VISUAL && M) M.entrance(els.page, { key: "cab2-shell", force: true });
    refreshSearch();
  }

  /* ---------- global search (sections, the user's own records, services) ---------- */
  const SYNONYMS_NOTE = "amendă / contravenție, buletin, pensie, RCA, procură / mandat";
  const STATIC_RECORDS = {
    person: [
      ["Amendă · 600 lei", "de achitat până la 21 octombrie 2026", "amenzi", "contraventie viteza proces verbal"],
      ["Pașaport", "valabil până la 3 februarie 2031", "identitate", "pasaport calatorie"],
      ["Buletin de identitate", "valabil până la 14 mai 2031", "identitate", "buletin carte identitate"],
      ["Dacia Duster · ABC 123", "RCA până la 9 august 2027", "vehicule", "rca masina auto asigurare"],
      ["Stagiu de cotizare · 11 ani și 4 luni", "după declarația din septembrie 2026", "contributii", "pensie stagiu cnas"],
    ],
    company: [
      ["Control planificat · ANSA", "10 decembrie 2026", "controale", "control inspectie"],
      ["Contribuții sociale · septembrie 2026", "84 300 lei, achitat", "contributii", "cnas contributii"],
    ],
  };
  const SERVICES = [
    ["Eliberarea buletinului de identitate", "buletin carte identitate"],
    ["Eliberarea pașaportului", "pasaport"],
    ["Calcularea pensiei pentru limită de vârstă", "pensie cnas"],
    ["Înregistrarea unei împuterniciri", "procura mandat mpower imputernicire"],
    ["Contestarea unei amenzi", "amenda contraventie"],
    ["Extras din Registrul bunurilor imobile", "cadastru extras imobil"],
    ["Autorizație sanitară de funcționare", "autorizatie act permisiv"],
  ];
  const SUGGESTED = ["amenzi", "identitate", "cereri", "taxe", "imputerniciri", "acte"];
  function searchIndex() {
    const ctx = state.ctx;
    const sections = menuOf(ctx).flatMap(([group, ids]) => ids.map((id) => ({ id, label: titleOf(id, ctx), meta: groupLabel(ctx, group), hay: norm(`${titleOf(id, ctx)} ${SECTIONS[id].keys}`), target: toSection(id), glyph: V2.group(group).icon })));
    /* the user's own records: requests and acts open their record; the rest their section */
    const records = [
      ...dosareOf(ctx).map((d) => ({ label: [serviceOf(d.service).title, d.object].filter(Boolean).join(" · "), meta: `${titleOf("cereri", ctx)} · ${d.nr}`, hay: norm(`${serviceOf(d.service).title} ${d.object} ${d.nr} cerere`), target: { href: recordHref("cereri", d.id) }, glyph: "page-text" })),
      ...actsOf(ctx).map((a) => ({ label: `${serviceOf(a.service).actTitle || "Act permisiv"} · ${a.name}`, meta: `Acte permisive · ${a.number}`, hay: norm(`${serviceOf(a.service).actTitle} ${a.name} ${a.number} act autorizatie licenta`), target: { href: recordHref("acte", a.id) }, glyph: "permission" })),
      ...(ctx.kind === "company" ? STATIC_RECORDS.company : STATIC_RECORDS.person).map(([label, meta, id, keys]) => ({ label, meta: `${titleOf(id, ctx)} · ${meta}`, hay: norm(`${label} ${keys}`), target: toSection(id), glyph: "page-text", id })),
    ].filter((item) => !item.id || inMenu(ctx, item.id));
    const services = ctx.viewOnly ? [] : SERVICES.map(([label, keys]) => ({ label, meta: "Catalogul serviciilor", hay: norm(`${label} ${keys}`), target: { s: "catalog", href: urlOf({ s: "catalog" }) }, glyph: "external-link" }));
    return { sections, records, services };
  }
  function searchResults(query) {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    const index = searchIndex();
    if (!tokens.length) {
      const suggested = index.sections.filter((item) => SUGGESTED.includes(item.id));
      return { empty: true, groups: [["Sugestii", (suggested.length ? suggested : index.sections).slice(0, 4)]] };
    }
    const hit = (item) => { const words = item.hay.split(/[^a-z0-9]+/); return tokens.every((token) => words.some((word) => word.startsWith(token))); };
    return { groups: [["Secțiuni", index.sections.filter(hit).slice(0, 4)], [state.ctx.kind === "self" ? "Datele tale" : "Date", index.records.filter(hit).slice(0, 4)], ["Servicii", index.services.filter(hit).slice(0, 3)]].filter(([, items]) => items.length) };
  }
  function searchPanelHtml(prefix, query) {
    const { groups, empty } = searchResults(query);
    if (!groups.length) return { count: 0, html: window.GEAPEmptyState.noResults(`Niciun rezultat pentru „${escape(query.trim())}”`, { text: `Încearcă alt cuvânt. Căutarea înțelege și ${SYNONYMS_NOTE}.`, compact: true, bare: true }) };
    let n = 0;
    const html = groups.map(([label, items], g) => `
      <p class="cab2-search__label" id="${prefix}-l${g}">${escape(label)}</p>
      <ul class="cab2-search__group" role="group" aria-labelledby="${prefix}-l${g}">
        ${items.map((item) => `<li role="presentation"><a class="e-permits-fo-intent-menu__item cab2-search__option" role="option" aria-selected="false" tabindex="-1" id="${prefix}-o${n++}" ${linkAttrs(item.target)} data-cab2-search-option>${ico(item.glyph)}<span class="cab2-search__text"><span>${escape(item.label)}</span><span class="cab2-search__meta">${escape(item.meta)}</span></span></a></li>`).join("")}
      </ul>`).join("");
    return { count: empty ? 0 : n, html, empty };
  }
  const searchHtml = (prefix, { large = false, inline = false } = {}) => `
    <div class="cab2-search" data-cab2-search="${prefix}"${inline ? " data-cab2-search-inline" : ""}>
      <div class="search-input ${large ? "" : "medium "}circular">
        <span class="icon-search" aria-hidden="true">${ico("search")}</span>
        <input class="input" type="search" role="combobox" aria-expanded="${inline}" aria-controls="${prefix}-list" aria-autocomplete="list" autocomplete="off" placeholder="Caută în Cabinet" aria-label="Caută în Cabinet: secțiuni, datele tale și servicii" data-cab2-search-input>
        <div class="btn-group"><button class="btn-icon clear" type="button" aria-label="Șterge căutarea" data-cab2-search-clear>${ico("cross-small", "small")}</button></div>
      </div>
      <div class="${inline ? "" : "e-permits-fo-intent-menu e-permits-stack__menu "}cab2-search__panel" id="${prefix}-list" role="listbox" aria-label="Rezultatele căutării"${inline ? "" : " hidden"} data-cab2-search-panel></div>
      <p class="u-visually-hidden" role="status" aria-live="polite" data-cab2-search-status></p>
    </div>`;
  const searches = new Set();
  function bindSearch(root) {
    const prefix = root.dataset.cab2Search;
    const inline = root.hasAttribute("data-cab2-search-inline");
    const input = root.querySelector("[data-cab2-search-input]");
    const panel = root.querySelector("[data-cab2-search-panel]");
    const status = root.querySelector("[data-cab2-search-status]");
    const field = root.querySelector(".search-input");
    let active = -1;
    const options = () => [...panel.querySelectorAll("[data-cab2-search-option]")];
    const setActive = (index) => {
      const list = options();
      active = list.length ? (index + list.length) % list.length : -1;
      list.forEach((option, i) => { option.classList.toggle("is-active", i === active); option.setAttribute("aria-selected", String(i === active)); });
      if (active > -1) { input.setAttribute("aria-activedescendant", list[active].id); list[active].scrollIntoView({ block: "nearest" }); } else input.removeAttribute("aria-activedescendant");
    };
    const render = () => {
      const has = !!input.value;
      field.classList.toggle("has-value", has);
      field.classList.toggle("is-ready", has);
      const result = searchPanelHtml(prefix, input.value);
      panel.innerHTML = result.html;
      active = -1;
      input.removeAttribute("aria-activedescendant");
      status.textContent = !input.value.trim() ? "" : result.count ? (result.count === 1 ? "Un rezultat." : `${result.count} rezultate.`) : "Niciun rezultat.";
    };
    const open = () => { render(); if (!inline) { panel.hidden = false; input.setAttribute("aria-expanded", "true"); } };
    const close = () => { if (inline) return; panel.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
    input.addEventListener("focus", open);
    input.addEventListener("click", () => { if (panel.hidden) open(); });
    input.addEventListener("input", open);
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (panel.hidden) open();
        setActive(active + (event.key === "ArrowDown" ? 1 : active < 0 ? 0 : -1));
      } else if (event.key === "Enter") {
        const target = options()[active] || (input.value.trim() ? options()[0] : null);
        if (target) { event.preventDefault(); target.click(); }
      } else if (event.key === "Escape" && !inline && !panel.hidden) {
        event.stopPropagation();
        close();
      }
    });
    root.querySelector("[data-cab2-search-clear]").addEventListener("click", () => { input.value = ""; open(); input.focus(); });
    root.addEventListener("focusout", (event) => { if (!root.contains(event.relatedTarget)) close(); });
    const api = { root, close, refresh: () => { if (inline || !panel.hidden) render(); }, reset: () => { input.value = ""; render(); close(); } };
    searches.add(api);
    if (inline) render();
    return api;
  }
  function closeSearch() { searches.forEach((api) => api.reset()); closeSearchSheet({ focus: false }); }
  function refreshSearch() { searches.forEach((api) => api.refresh()); }

  const headerTrigger = header.querySelector("[data-evo-search-trigger]");
  const headerActions = headerTrigger?.parentElement;
  const searchTrigger = headerTrigger?.cloneNode(true);
  if (searchTrigger) {
    searchTrigger.setAttribute("aria-label", "Caută în Cabinet");
    searchTrigger.setAttribute("aria-haspopup", "dialog");
    searchTrigger.addEventListener("click", () => openSearchSheet());
  }
  headerTrigger?.remove();
  const headerSearchHost = document.createElement("div");
  headerSearchHost.innerHTML = searchHtml("cab2-search");
  const headerSearch = headerSearchHost.firstElementChild;
  bindSearch(headerSearch);
  function placeSearch() {
    if (!headerActions) return;
    if (isPhone()) { headerSearch.remove(); if (searchTrigger && !searchTrigger.isConnected) headerActions.prepend(searchTrigger); }
    else { searchTrigger?.remove(); if (!headerSearch.isConnected) headerActions.before(headerSearch); }
  }

  /* ---------- phone sheets (the shared GEAPSheet) ---------- */
  let menuSheet = null;
  let searchSheet = null;
  let sheetTimer = 0;
  function sheetOpen(sheet) { return sheet?.getAttribute("aria-hidden") === "false"; }
  function makeSheet(cls, titleId, title) {
    const sheet = window.GEAPSheet.create(`e-permits-filter-sheet ${cls}`, { sprite: SPRITE, titleId });
    sheet.querySelector("[data-sheet-title]").textContent = title;
    sheet.addEventListener("keydown", (event) => {
      if (event.key === "Tab") window.GEAPSheet.trapTab(sheet, event);
      if (event.key === "Escape") { event.stopPropagation(); if (sheet === menuSheet) closeMenuSheet(); else closeSearchSheet(); }
    });
    return sheet;
  }
  function openMenuSheet() {
    menuSheet ||= makeSheet("cab2-menu-sheet", "cab2-menu-sheet-title", "Meniu");
    if (!menuSheet.dataset.bound) {
      menuSheet.dataset.bound = "1";
      menuSheet.addEventListener("click", (event) => { if (event.target.closest("[data-sheet-close]")) closeMenuSheet(); });
    }
    window.clearTimeout(sheetTimer);
    menuSheet.querySelector("[data-sheet-body]").innerHTML = `<nav aria-label="Meniul Cabinetului">${menuHtml("cab2-ms", { sheet: true })}</nav>`;
    window.GEAPSheet.show(menuSheet);
    renderBar();
    markTips(menuSheet);
    (menuSheet.querySelector('[aria-current="page"]') || menuSheet.querySelector(".modal-close"))?.focus();
  }
  function closeMenuSheet({ focus = true } = {}) {
    if (!sheetOpen(menuSheet)) return;
    sheetTimer = window.GEAPSheet.hide(menuSheet, () => sheetOpen(menuSheet));
    renderBar();
    if (focus) els.bar.querySelector("[data-cab2-menu-open]")?.focus();
  }
  function openSearchSheet() {
    if (!searchSheet) {
      searchSheet = makeSheet("cab2-search-sheet", "cab2-search-sheet-title", "Caută în Cabinet");
      searchSheet.querySelector("[data-sheet-body]").innerHTML = searchHtml("cab2-search-s", { large: true, inline: true });
      bindSearch(searchSheet.querySelector("[data-cab2-search]"));
      searchSheet.addEventListener("click", (event) => { if (event.target.closest("[data-sheet-close]")) closeSearchSheet(); });
    }
    window.GEAPSheet.show(searchSheet);
    searchSheet.querySelector("[data-cab2-search-input]")?.focus();
  }
  function closeSearchSheet({ focus = true } = {}) {
    if (!sheetOpen(searchSheet)) return;
    window.GEAPSheet.hide(searchSheet, () => sheetOpen(searchSheet));
    if (focus) searchTrigger?.focus();
  }

  /* ---------- events ---------- */
  const plain = (event) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  document.addEventListener("click", (event) => {
    const skip = event.target.closest("[data-cab2-skip]");
    if (skip) { event.preventDefault(); focusTitle(); return; }
    const as = event.target.closest("[data-cab2-as]");
    if (as) { event.preventDefault(); if (as.dataset.cab2As === state.ctx.id) closeSwitcher(); else switchTo(as.dataset.cab2As); return; }
    const newPower = event.target.closest("[data-cab2-new-power]");
    if (newPower && plain(event) && VIEW === "cabinet") {
      event.preventDefault();
      closeSwitcher();
      if (state.ctx.kind !== "self") state.ctx = CONTEXTS[0];
      go({ s: NEW_POWER });
      return;
    }
    const opener = event.target.closest("[data-cab2-switch-open]");
    if (opener) {
      closeMenuSheet({ focus: false });
      if (switcherOpen() && lastOpener === opener) { closeSwitcher(); return; }
      lastOpener = opener;
      openSwitcher();
      return;
    }
    if (event.target.closest("[data-cab2-menu-open]")) { if (sheetOpen(menuSheet)) closeMenuSheet(); else openMenuSheet(); return; }
    if (event.target.closest("[data-cab2-signout]")) { window.location.assign(urlOf({ s: "iesire" })); return; }
    const link = event.target.closest("a[data-cab2-go]");
    if (link && plain(event)) {
      event.preventDefault();
      closeMenuSheet({ focus: false });
      closeSwitcher();
      go({ g: link.dataset.cab2G || "", s: link.dataset.cab2S || "" });
      return;
    }
    /* a whole row opens its record / section (the row's own links and buttons keep their click) */
    const rowEl = event.target.closest("[data-cab2-href]");
    if (rowEl && !event.target.closest("a, button") && plain(event)) {
      const inner = rowEl.querySelector("a[href]");
      const href = rowEl.dataset.cab2Href;
      const goLink = [...rowEl.querySelectorAll("a[data-cab2-go]")].find((a) => a.getAttribute("href") === href);
      if (goLink) goLink.click(); else if (inner && inner.getAttribute("href") === href) inner.click(); else window.location.assign(href);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const rowEl = event.target.closest?.("[data-cab2-href]");
    if (rowEl && event.target === rowEl) { event.preventDefault(); rowEl.click(); }
  });
  if (VIEW === "cabinet") {
    window.addEventListener("popstate", () => {
      const now = new URLSearchParams(window.location.search);
      state.ctx = contextOf(now.get("as"));
      apply({ g: now.get("g") || "", s: now.get("s") || "" }, { push: false });
      renderAll();
      drawPage();
    });
  }
  phoneQuery.addEventListener("change", () => {
    closeMenuSheet({ focus: false });
    closeSearchSheet({ focus: false });
    placeSearch();
    renderSwitcher();
    drawPage();
    measure();
  });

  /* ---------- boot ---------- */
  /* the copied views ask for their header / crumbs / titles while they render (they load after this file) */
  window.Cab2Shell = { state, go, switchTo, openSwitcher, openMenuSheet, openSearchSheet, CONTEXTS, SECTIONS, titleOf: (id) => titleOf(id, state.ctx), sectionHeadHtml, crumbsFor: (id) => crumbsFor(id, state.ctx) };
  apply({ g: params.get("g") || "", s: params.get("s") || "" }, { replace: true });
  placeSearch();
  /* the acts list header lives in v2.html (cab2-acte.js draws only the list) */
  const actsHead = document.querySelector('[data-cab2-section-head="acte"]');
  if (actsHead) actsHead.outerHTML = sectionHeadHtml("acte", { titleId: "cab-title" });
  header.querySelector(".evo-header__logo")?.setAttribute("href", urlOf());
  header.querySelectorAll("[data-evo-notifications]").forEach((el) => el.setAttribute("href", sectionHref("notificari")));
  renderAll();
  measure();
  if ("MutationObserver" in window) {
    const watch = () => { const avatar = els.avatar(); if (avatar && !avatar.dataset.cab2Watched) { avatar.dataset.cab2Watched = "1"; new MutationObserver(syncOpeners).observe(avatar, { attributes: true, attributeFilter: ["aria-expanded"] }); } };
    watch();
    window.setTimeout(watch, 0);
  }
  Promise.all([
    fetch("../data/cab2-cereri.json?v=cab2-s1-v1").then((r) => r.json()),
    fetch("../data/cab2-acte-permisive.json?v=cab2-s1-v1").then((r) => r.json()),
  ]).then(([cereri, fo]) => {
    data.cereri = cereri;
    data.services = cereri.services || {};
    data.acts = fo.frontOfficeFlows?.[0]?.intent?.acts || {};
  }).catch((error) => console.warn("[cab2-shell]", error)).finally(() => {
    data.ready = true;
    renderAll();
    const ready = () => {
      drawPage();
      pageTitle();
      if (VISUAL && M && state.page === "acasa") M.entrance(els.page, { key: "cab2-shell" });
      let said = "";
      try { said = sessionStorage.getItem(ANNOUNCE_KEY) || ""; sessionStorage.removeItem(ANNOUNCE_KEY); } catch { said = ""; }
      if (said) { focusTitle(); window.setTimeout(() => { els.live.textContent = said; }, 60); }
      frame.setAttribute("data-cab2-ready", "");
    };
    /* the copied views name the tab once their data is in — the shell's title wins */
    if (document.documentElement.dataset.cabReady === "true") ready();
    else new MutationObserver((records, observer) => { if (document.documentElement.dataset.cabReady === "true") { observer.disconnect(); ready(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-cab-ready"] });
  });
})();
