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
   Reading / keyboard order: header → context line → menu (identity block, items) → content (→ phone bottom bar). */
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
  const SWITCH_GROUPS = [["self", "Tu"], ["companies", "Companiile tale"], ["powers", "Prin împuternicire"]];
  const contextOf = (id) => CONTEXTS.find((item) => item.id === id) || CONTEXTS[0];
  const identifier = (ctx) => (ctx.idLabel === "IDNP" ? `IDNP se termină în ${ctx.idValue.slice(-4)}` : `${ctx.idLabel} ${ctx.idValue}`);
  const capacity = (ctx, { validity = true } = {}) => {
    if (ctx.via === "admin") return "ca administrator";
    const until = validity && ctx.until ? `, valabilă până la ${longDate(ctx.until)}` : "";
    if (ctx.via === "notarial") return `prin împuternicire notarială nr. ${ctx.act}${until}`;
    if (ctx.via === "mpower") return `prin împuternicire${until}`;
    return "";
  };
  /* the identity block's quiet line (no identifier there — privacy on shared screens) */
  const capacityShort = (ctx) => (ctx.kind === "self" ? "Contul tău" : ctx.via === "admin" ? "ca administrator" : ctx.via === "notarial" ? `prin împuternicire notarială${ctx.viewOnly ? " · doar vizualizare" : ""}` : `prin împuternicire${ctx.viewOnly ? " · doar vizualizare" : ""}`);
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
  const STATIC_TODOS = {
    "pf-anastasia": [{ level: 2, section: "amenzi", text: "Achită amenda de 600 lei pentru depășirea vitezei până la 21 octombrie 2026; până atunci plătești jumătate din sumă.", action: "Achită", meta: ["Amenzi", "Ministerul Afacerilor Interne"], solved: true }],
    "pj-global-trader": [
      { level: 3, section: "concedii", text: "Confirmă concediul medical al unui angajat, primit pe 9 octombrie 2026.", action: "Confirmă", meta: ["Concediile angajaților", "CNAS"] },
      { level: 5, section: "controale", text: "Agenția Națională pentru Siguranța Alimentelor a planificat un control pe 10 decembrie 2026.", action: "Vezi controlul", meta: ["Controale de stat", "ANSA"] },
    ],
    "pj-agro-nord": [{ level: 1, section: "taxe", text: "Datoria de 2 310 lei la impozitul pe venit a depășit termenul din 25 septembrie 2026; se calculează penalități.", action: "Achită", meta: ["Taxe și datorii", "Serviciul Fiscal de Stat"] }],
    "notar-pf-maria": [{ level: 4, section: "identitate", text: "Buletinul de identitate al Mariei Rusu expiră pe 2 decembrie 2026, în 51 de zile.", action: "Vezi buletinul", meta: ["Acte de identitate", "ASP"] }],
    "mpower-pf-grigore": [{ level: 2, section: "amenzi", text: "Achită amenda de 600 lei până la 20 octombrie 2026; până atunci plătești jumătate din sumă.", action: "Achită", meta: ["Amenzi", "MAI"] }],
  };
  function todosOf(ctx) {
    const items = [];
    dosareOf(ctx).forEach((d) => {
      const service = serviceOf(d.service);
      const what = d.object || service.title || d.nr;
      if (d.status === "info") items.push({ level: 3, section: "cereri", id: d.id, date: d.info?.until, text: `Autoritatea așteaptă informații pentru ${what}. Trimite-le până la ${longDate(d.info?.until)}.`, action: "Trimite informațiile", meta: [service.title], nr: d.nr });
      if (d.status === "achitare" && d.payment) items.push({ level: 2, section: "cereri", id: d.id, date: d.payment.due, text: `Achită ${money(d.payment.amount)} pentru ${what} până la ${longDate(d.payment.due)}${d.feeDuringExam ? ", ca examinarea să continue" : "; examinarea începe după plată"}.`, action: "Achită", meta: [service.title], nr: d.nr });
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
  const DEMO_KEYS = ["entitati", "motion", "visual", "rezolvat", "indisponibil"];
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
        ${SINGLE ? "" : `<button class="btn btn-text-primary btn-sm" type="button" aria-haspopup="dialog" aria-expanded="false" data-cab2-switch-open>Schimbă${hidden(" pentru cine acționezi")}</button>`}
      </div>`;
  }

  /* ---------- identity block (product owner 2026-11-17): who the Cabinet is for, on top of the menu ----------
     = the BO account role card (`.e-permits-shell__profile-role-card`, css/shell-nav.css › generated) with the library
     avatar. Several contexts → a button that opens „Pentru cine acționezi?”; one context → static text.
     Screen readers: under a context line (which already says who · identifier · capacity) the button is named only
     „Pentru cine acționezi?” and its visible text is hidden from them; for „Tu” it reads name + capacity. */
  function identityHtml() {
    const ctx = state.ctx;
    const avatar = ctx.kind === "company"
      ? `<span class="avatar avatar--sm avatar--icon" aria-hidden="true">${ico("business")}</span>`
      : `<span class="avatar avatar--sm avatar--initials" aria-hidden="true">${escape(ctx.initials)}</span>`;
    const lineShown = ctx.kind !== "self";
    const copy = `
        <span class="e-permits-shell__profile-role-copy"${!SINGLE && lineShown ? ' aria-hidden="true"' : ""}>
          <span class="e-permits-shell__profile-role-name cab2-identity__name" data-cab2-tip="${escape(ctx.name)}">${escape(ctx.name)}</span>
          <span class="e-permits-shell__profile-role-label">${escape(capacityShort(ctx))}</span>
        </span>`;
    if (SINGLE) return `<div class="e-permits-shell__profile-role-card cab2-identity cab2-identity--static">${avatar}${copy}</div>`;
    const name = lineShown ? "Pentru cine acționezi?" : `Pentru cine acționezi? Acum: ${ctx.name}, ${capacityShort(ctx).toLowerCase()}`;
    return `
      <button class="e-permits-shell__profile-role-card cab2-identity" type="button" aria-haspopup="dialog" aria-expanded="${switcherOpen()}" aria-label="${escape(name)}" data-cab2-switch-open>
        ${avatar}${copy}
        ${ico("chevron-bottom", "cab2-identity__chevron")}
      </button>`;
  }

  /* ---------- menu v3 = the BO sidebar items (css/shell-nav.css): one row per group; the open group's sections under
     it (no icon, indented to the label — no BO sub-item exists) ---------- */
  const badge = (count) => (count ? `<span class="badge badge--solid-neutral badge--xl e-permits-shell__nav-badge" aria-hidden="true">${count}</span>${hidden(`, ${count === 1 ? "un lucru" : `${count} lucruri`} de rezolvat`)}` : "");
  const navItem = ({ id, label, href = "", attrs = "", on = false, open = false, count = 0, button = false, hint = "", sub = false, current = on }) => {
    const text = `<span class="e-permits-shell__nav-text">${escape(label)}${hint ? `<span class="cab2-menu__hint">${escape(hint)}</span>` : ""}</span>`;
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
          SINGLE ? "" : navItem({ id: "cont-switch", label: "Pentru cine acționezi?", button: true, attrs: ' aria-haspopup="dialog" data-cab2-switch-open' }),
          navItem({ id: "cont-mpass", label: "Contul MPass", href: "https://mpass.gov.md", attrs: ' target="_blank" rel="noopener"' }).replace("</span></a>", `${hidden(", se deschide în altă pagină")}</span></a>`),
          navItem({ id: "cont-ajutor", label: "Ajutor", href: urlOf({ s: "ajutor" }), attrs: goAttr({ s: "ajutor" }) }),
          navItem({ id: "cont-iesire", label: "Ieși din cont", button: true, attrs: " data-cab2-signout" }),
        ].filter(Boolean).map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>` : "";
    return `
      <div class="cab2-menu__identity">${identityHtml()}</div>
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

  /* ---------- Acasă (wiki 02 › Acasă content model, S1: plain BO sections) ---------- */
  const SUMMARY = {
    documente: { self: "Buletinul și pașaportul sunt valabile · permis de conducere până la 9 iulie 2029", person: "Buletinul expiră pe 2 decembrie 2026", to: "documente" },
    bani: { self: "O amendă de 600 lei de achitat · nicio datorie la buget", company: "Nicio datorie la bugetul de stat · contribuții la zi", agro: "Datorie de 2 310 lei, termen depășit", person: "Nicio datorie la buget", grigore: "O amendă de 600 lei de achitat", to: "bani" },
    proprietati: { self: "1 apartament, 1 teren · 2 vehicule cu RCA valabil", company: "1 bun imobil · 3 vehicule", to: "proprietati" },
    familie: { self: "2 copii · asigurare medicală activă", to: "familie" },
    munca: { self: "Stagiu de cotizare: 11 ani și 4 luni · administrator la 2 companii", company: "Companie activă · 14 angajați · 1 control planificat", to: "munca" },
    acces: { self: "3 împuterniciri primite · 1 dată de tine", company: "2 persoane împuternicite", to: "acces" },
  };
  function summaryRows(ctx) {
    if (ctx.newUser) return [];
    return menuOf(ctx).filter(([group]) => SUMMARY[group] && group !== "cereri").map(([group]) => {
      const entry = SUMMARY[group];
      const line = (ctx.id === "pj-agro-nord" && entry.agro) || (ctx.id === "mpower-pf-grigore" && entry.grigore) || (ctx.kind === "self" ? entry.self : ctx.kind === "company" ? entry.company : entry.person);
      /* money: the live line follows „De rezolvat” (a fine to pay or nothing) */
      const money = group === "bani" && ctx.id !== "pj-agro-nord" && ctx.kind !== "company"
        ? (todosOf(ctx).some((item) => item.section === "amenzi") ? "O amendă de 600 lei de achitat" : "Nicio datorie sau amendă de achitat") : "";
      if (!line && !money) return "";
      return row(groupLabel(ctx, group), `<span class="cab2-summary__line">${escape(money || line)}</span> <a class="link link-primary link-sm" ${linkAttrs(toGroup(group))}>${escape(directSection(ctx, group) ? titleOf(directSection(ctx, group), ctx) : "Deschide")}${hidden(` ${groupLabel(ctx, group)}`)}</a>`);
    }).filter(Boolean);
  }
  function notesOf(ctx, limit) {
    const N = window.Cab2Notificari;
    if (!N) return [];
    return dosareOf(ctx).flatMap((d) => N.eventsOf(d, data.services).map((note) => ({ ...note, nr: d.nr, dosar: d })))
      .filter((note) => note.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
  }
  function homeHtml() {
    const ctx = state.ctx;
    const own = ctx.kind === "self";
    const { todo: todos, soon } = splitTodos(todosOf(ctx));
    const count = countOf(ctx);
    const lines = own
      ? [escape(todoText(count, true))]
      : [`${escape(identifier(ctx))} · acționezi ${escape(capacity(ctx, { validity: false }))}${ctx.viewOnly ? " · doar vizualizare" : ""}`, escape(todoText(count, false))];
    const parts = [headHtml({ title: own ? `Bună, ${ctx.first}` : ctx.name, lines, caption: `Date de la GEAP, ASP, MAI și alte instituții · ${SOURCE_TIME}` })];
    /* 3 · De rezolvat — max 5 on desktop, 3 on phones; hidden when there is nothing (the status sentence says it) */
    if (todos.length) {
      const max = isPhone() ? 3 : 5;
      parts.push(block("cab2-home-todo", "De rezolvat", rowList(todos.slice(0, max).map(todoRow), "De rezolvat"), todos.length > max ? { s: TODO_PAGE, href: urlOf({ s: TODO_PAGE }), label: `Vezi toate (${todos.length})` } : null));
    }
    /* 4 · În curând — directly under „De rezolvat” (or under the title when nothing is to do); hidden when empty */
    if (soon.length) {
      const max = isPhone() ? 3 : 5;
      parts.push(block("cab2-home-soon", "În curând", rowList(soon.slice(0, max).map(todoRow), "În curând"), soon.length > max ? { s: TODO_PAGE, href: urlOf({ s: TODO_PAGE }), label: `Vezi toate (${soon.length})` } : null));
    }
    /* 5 · Cererile tale în lucru */
    if (inMenu(ctx, "cereri")) {
      const open = openRequests(ctx).slice(0, 3);
      const body = open.length ? rowList(open.map(requestRow), "Cereri în lucru")
        : ctx.newUser
          ? emptyBox({ title: "Nu ai încă nicio cerere", text: "Depui o cerere din Catalogul serviciilor și o urmărești apoi aici.", icon: "page-text", actionHtml: `<a class="${btn("secondary")}" ${linkAttrs({ s: "catalog", href: urlOf({ s: "catalog" }) })}>Deschide catalogul</a>` })
          : emptyBox({ title: "Nu ai cereri în lucru", text: "Cererile finalizate sunt în lista cererilor.", icon: "page-text" });
      parts.push(block("cab2-home-cereri", own ? "Cererile tale în lucru" : "Cereri în lucru", body, open.length || !ctx.newUser ? { ...toSection("cereri"), label: "Vezi toate cererile" } : null));
    }
    /* 6 · Documentele tale / the company / the represented person */
    if (ctx.kind === "company") {
      parts.push(block("cab2-home-entity", "Compania", C.detailCard([
        row("Denumire", escape(ctx.name)),
        row(ctx.idLabel, C.copyValueHtml(ctx.idValue, `Copiază ${ctx.idLabel} ${ctx.idValue}`)),
        row("Forma juridică", "Societate cu răspundere limitată"),
        row("Stare", tag("Activă", "success")),
        ctx.via === "admin" ? row("Rolul tău", "Administrator") : row("Temeiul", `Împuternicire MPower, valabilă până la ${escape(longDate(ctx.until))}`),
      ]), inMenu(ctx, "detalii") ? { ...toSection("detalii"), label: "Vezi detaliile companiei" } : null));
    } else if (!own) {
      parts.push(block("cab2-home-entity", "Persoana pe care o reprezinți", C.detailCard([
        row("Nume", escape(ctx.name)),
        row("IDNP", `se termină în ${escape(ctx.idValue.slice(-4))}`),
        row("Temeiul", escape(ctx.via === "notarial" ? `Împuternicire notarială nr. ${ctx.act}` : "Împuternicire MPower")),
        row("Valabilă până la", escape(longDate(ctx.until))),
        row("Acces", ctx.viewOnly ? "Doar vizualizare" : "Vizualizare și acțiuni din împuternicire"),
      ])));
    }
    if (ctx.kind !== "company" && inMenu(ctx, "identitate")) {
      const docs = ctx.newUser ? cardsOf(ctx, "identitate").slice(0, 1) : cardsOf(ctx, "identitate").slice(0, 3);
      const body = sourceDown("identitate") ? notice(downText("identitate")) : rowList(docs.map((card) => docRow("identitate", card)), "Documente");
      parts.push(block("cab2-home-docs", own ? "Documentele tale" : `Documentele ${ctx.genitive}`, body, { ...toGroup("documente"), label: "Vezi toate documentele" }));
    }
    /* 7 · per-group summary (only where data exists) */
    const summary = summaryRows(ctx);
    if (summary.length) parts.push(block("cab2-home-summary", "Pe scurt", C.detailCard(summary)));
    /* 8 · Notificări — the latest 3 */
    const notes = notesOf(ctx, 3);
    if (notes.length) parts.push(block("cab2-home-notes", "Notificări", `<section class="e-permits-stack sm-list nt-list" aria-label="Notificări"><ul class="e-permits-stack__list" role="list">${notes.map((note, i) => window.Cab2Notificari.itemHtml(note, i, ctx.viewOnly, 3)).join("")}</ul></section>`, { s: "notificari", href: sectionHref("notificari"), label: "Vezi toate notificările" }));
    return `<div class="cab2-page" data-cab2-page="acasa">${parts.join("")}</div>`;
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
  function drawPage() {
    if (VIEW !== "cabinet") return;
    els.page.innerHTML = data.ready ? pageHtml() : "";
    window.GEAPNameExpand?.scan?.(els.page);
  }

  /* ---------- switcher (M1) — the header account panel ---------- */
  let switchQuery = "";
  const rowHtml = (ctx) => {
    const on = ctx.id === state.ctx.id;
    const count = countOf(ctx);
    const avatar = ctx.kind === "company"
      ? `<span class="avatar avatar--sm avatar--icon e-permits-fo-avatar-menu__role-avatar" aria-hidden="true">${ico("business")}</span>`
      : `<span class="avatar avatar--sm avatar--initials e-permits-fo-avatar-menu__role-avatar e-permits-fo-avatar-menu__role-avatar--initials e-permits-fo-avatar-menu__role-avatar--brand" aria-hidden="true">${escape(ctx.initials)}</span>`;
    const soon = expiresSoon(ctx);
    const cap = [ctx.kind === "self" ? "" : capacity(ctx, { validity: false }), ctx.viewOnly ? "doar vizualizare" : "", soon === null ? "" : expiryLabel(soon).toLowerCase()].filter(Boolean).join(" · ");
    return `
      <button class="e-permits-fo-avatar-menu__role cab2-switch__row${on ? " is-selected" : ""}" type="button"${on ? ' aria-current="true"' : ""} data-cab2-as="${escape(ctx.id)}">
        ${avatar}
        <span class="e-permits-fo-avatar-menu__role-copy">
          <strong>${escape(ctx.name)}</strong>
          <span>${escape(identifier(ctx))}</span>
          ${cap ? `<span>${escape(cap)}</span>` : ""}
        </span>
        ${count ? `<span class="badge badge--solid-notification badge--lg cab2-switch__count" aria-hidden="true">${count}</span>${hidden(`, ${todoText(count, false).toLowerCase()}`)}` : ""}
        ${ico("checkmark-large", "e-permits-fo-avatar-menu__role-check")}
      </button>`;
  };
  function switchListHtml() {
    const q = norm(switchQuery.trim());
    const match = (ctx) => !q || norm(`${ctx.name} ${ctx.idValue}`).includes(q);
    const groups = SWITCH_GROUPS.map(([group, label]) => {
      const rows = CONTEXTS.filter((ctx) => ctx.group === group && match(ctx));
      const add = group === "powers" && !q && !SINGLE ? `<a class="btn btn-secondary btn-md cab2-switch__add" href="${escape(urlOf({ s: NEW_POWER, ctx: CONTEXTS[0] }))}" data-cab2-new-power>${ico("plus-large")}<span>Adaugă o împuternicire notarială</span></a>` : "";
      if (!rows.length && !add) return "";
      return `
        <section class="e-permits-fo-avatar-menu__group" aria-labelledby="cab2-sw-${group}">
          <h2 id="cab2-sw-${group}">${label}</h2>
          <div class="e-permits-fo-avatar-menu__role-list">${rows.map(rowHtml).join("")}${add}</div>
        </section>`;
    }).join("");
    return groups || window.GEAPEmptyState.noResults(`Niciun rezultat pentru „${escape(switchQuery.trim())}”`, { text: "Caută după nume, IDNO sau IDNP.", compact: true, bare: true });
  }
  function renderSwitcher() {
    const panel = els.panel;
    if (!panel) return;
    const searchable = CONTEXTS.length > 7;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "cab2-switch-title");
    panel.removeAttribute("aria-label");
    panel.innerHTML = `
      <div class="cab2-switch__head">
        <p class="cab2-switch__title" id="cab2-switch-title">${SINGLE ? "Contul tău" : "Pentru cine acționezi?"}</p>
        ${searchable ? `
        <div class="search-input ${isPhone() ? "" : "medium "}rectangular${switchQuery ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true">${ico("search")}</span>
          <input class="input" type="search" autocomplete="off" placeholder="Caută după nume sau IDNO" aria-label="Caută după nume, IDNO sau IDNP" value="${escape(switchQuery)}" data-cab2-switch-search>
          <div class="btn-group"><button class="btn-icon clear" type="button" aria-label="Șterge căutarea" data-cab2-switch-clear>${ico("cross-small", "small")}</button></div>
        </div>` : ""}
      </div>
      <div class="e-permits-fo-avatar-menu__content" data-cab2-switch-list>${switchListHtml()}</div>
      <ul class="cab2-switch__links">
        <li><a class="e-permits-fo-intent-menu__item" href="https://mpass.gov.md" target="_blank" rel="noopener">${ico("person")}<span>Contul MPass${hidden(", se deschide în altă pagină")}</span></a></li>
        <li><a class="e-permits-fo-intent-menu__item" ${linkAttrs({ s: "ajutor", href: urlOf({ s: "ajutor" }) })}>${ico("bubble-question")}<span>Ajutor</span></a></li>
        <li><button class="e-permits-fo-intent-menu__item" type="button" data-cab2-signout>${ico("logout")}<span>Ieși din cont</span></button></li>
      </ul>`;
    const ctx = state.ctx;
    header.querySelectorAll("[data-evo-initials]").forEach((el) => { el.textContent = CONTEXTS[0].initials; });
  }
  function switcherOpen() { return els.avatar()?.getAttribute("aria-expanded") === "true"; }
  function openSwitcher() {
    const avatar = els.avatar();
    if (!avatar) return;
    window.setTimeout(() => {
      if (!switcherOpen()) avatar.click();
      window.requestAnimationFrame(() => (els.panel.querySelector("[data-cab2-switch-search]") || els.panel.querySelector('[aria-current="true"]') || els.panel.querySelector("[data-cab2-as]"))?.focus());
    }, 0);
  }
  const closeSwitcher = () => { if (switcherOpen()) els.avatar()?.click(); };
  /* the identity block / „Schimbă” keep their pressed state while the switcher is open (project rule) */
  let lastOpener = null;
  const syncOpeners = () => {
    const open = switcherOpen();
    document.querySelectorAll("[data-cab2-switch-open][aria-haspopup]").forEach((el) => el.setAttribute("aria-expanded", String(open && el === lastOpener)));
    if (!open) lastOpener = null;
    placeSwitcher();
  };
  /* S1 leftover (2026-11-18): opened from the identity block / „Schimbă” (desktop), the switcher is an anchored dropdown
     8 under its opener, left-aligned, kept inside the window; opened from the header avatar it stays at the header */
  function placeSwitcher() {
    const panel = els.panel;
    if (!panel) return;
    const opener = switcherOpen() && !isPhone() && lastOpener && lastOpener.isConnected && !header.contains(lastOpener) ? lastOpener : null;
    panel.classList.toggle("cab2-switch--anchored", Boolean(opener));
    if (!opener) { ["--cab2-switch-left", "--cab2-switch-top", "--cab2-switch-max"].forEach((name) => panel.style.removeProperty(name)); return; }
    const rect = opener.getBoundingClientRect();
    const gap = 8;
    const edge = 16;
    const width = panel.getBoundingClientRect().width || 364;
    const left = Math.max(edge, Math.min(rect.left, window.innerWidth - edge - width));
    const top = rect.bottom + gap;
    panel.style.setProperty("--cab2-switch-left", `${Math.round(left)}px`);
    panel.style.setProperty("--cab2-switch-top", `${Math.round(top)}px`);
    panel.style.setProperty("--cab2-switch-max", `${Math.max(240, Math.round(window.innerHeight - top - edge))}px`);
  }
  window.addEventListener("scroll", () => { if (switcherOpen() && lastOpener) placeSwitcher(); }, { passive: true });
  window.addEventListener("resize", () => { if (switcherOpen()) placeSwitcher(); });

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
    switchQuery = "";
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
    if (event.target.closest("[data-cab2-switch-clear]")) { switchQuery = ""; renderSwitcher(); els.panel.querySelector("[data-cab2-switch-search]")?.focus(); return; }
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
  els.panel?.addEventListener("input", (event) => {
    if (!event.target.matches("[data-cab2-switch-search]")) return;
    switchQuery = event.target.value;
    const field = event.target.closest(".search-input");
    field.classList.toggle("has-value", !!switchQuery);
    field.classList.toggle("is-ready", !!switchQuery);
    els.panel.querySelector("[data-cab2-switch-list]").innerHTML = switchListHtml();
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
