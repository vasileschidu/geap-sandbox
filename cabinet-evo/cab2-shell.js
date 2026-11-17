/* EVO Cabinet v2 — the shell (cab2-shell-v1, 2026-11-17; wiki 02 · Structure, 03 · M1 / M2, 05 · Batch 2;
   components.md › „Cabinet v2 — shell”; styles cabinet-evo/cab2-shell.css).
     ?shell=2&view=cabinet            Acasă of „Tu”
       &as=<context>                  for whom you act (CONTEXTS below)
       &s=<section>                   the section (SECTIONS below; unknown / absent → Acasă, out of a power's scope →
                                      „Nu este disponibil pentru această împuternicire”)
       &atentie=1                     demo: „Tu” has two things to resolve (attention dots in the menu)
       &entitati=multe                demo: more than seven entities in the switcher (its search appears)
   One page, no reload: sections and contexts change in place (history.pushState), Back / Forward follow the address.
   Reading / keyboard order: header → context line → menu → content (→ phone bottom bar).
   Everything on screen is a library component or a documented composition of them; all content is demo data. */
(() => {
  "use strict";

  const C = window.CabEvo;
  const V2 = window.Cab2;
  if (!C || !V2?.on || C.VIEW !== "cabinet") return;

  const host = document.querySelector('[data-cab-view="cabinet"]');
  const header = document.querySelector("[data-evo-header]");
  if (!host || !header) return;

  const M = window.Cab2Motion;
  const { escape, longDate, SPRITE } = C;
  const params = new URLSearchParams(window.location.search);
  const TODAY = "2026-11-17";
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  const isPhone = () => phoneQuery.matches;
  const ico = (name, cls = "") => `<svg class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true" focusable="false"><use href="${SPRITE}#icon-${name}"></use></svg>`;
  const tag = (label, tone) => window.GEAPTag.html(label, tone);
  const hidden = (text) => `<span class="u-visually-hidden">${escape(text)}</span>`;
  /* buttons: Medium 40 on desktop, Large 48 on phones */
  const btn = (kind) => `btn btn-${kind}${isPhone() ? "" : " btn-md"}`;
  const norm = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const daysUntil = (iso) => Math.round((Date.parse(iso) - Date.parse(TODAY)) / 86400000);

  /* ---------- contexts (wiki 02 › Contexts) ---------- */
  const ATTENTION = params.get("atentie") === "1";
  const MANY = params.get("entitati") === "multe";
  /* `legacy`: the current Cabinet knows this subject — „Cererile …” / „Acte permisive” open its existing views */
  const CONTEXTS = [
    { id: "pf-anastasia", group: "self", kind: "self", name: "Anastasia Cojocaru", first: "Anastasia", initials: "AC", idLabel: "IDNP", idValue: "2990000000002",
      attention: ATTENTION ? { amenzi: 1, identitate: 1 } : {}, legacy: true },
    { id: "pj-global-trader", group: "companies", kind: "company", name: "SRL Global Trader", idLabel: "IDNO", idValue: "1012600000002", via: "admin",
      attention: { acte: 1, concedii: 1, controale: 1 }, legacy: true },
    { id: "pj-agro-nord", group: "companies", kind: "company", name: "Agro-Nord SRL", idLabel: "IDNO", idValue: "1003600012345", via: "admin", attention: { taxe: 1 } },
    { id: "mpower-pj-lumina", group: "powers", kind: "company", name: "Lumina Office SRL", idLabel: "IDNO", idValue: "1012600000005", via: "mpower", until: "2027-06-30",
      scope: ["cereri", "acte", "plati", "taxe", "contributii"], attention: { cereri: 1 }, legacy: true },
    { id: "notar-pf-maria", group: "powers", kind: "person", name: "Maria Rusu", genitive: "Mariei Rusu", initials: "MR", idLabel: "IDNP", idValue: "2004001234821", via: "notarial",
      act: "1234", until: "2027-03-03", viewOnly: true, scope: ["cereri", "acte", "identitate", "taxe", "amenzi", "imobile", "vehicule"], attention: {} },
    { id: "mpower-pf-grigore", group: "powers", kind: "person", name: "Grigore Vasilescu", genitive: "lui Grigore Vasilescu", initials: "GV", idLabel: "IDNP", idValue: "2001004567310", via: "mpower",
      until: "2026-11-22", scope: ["cereri", "acte", "plati", "amenzi", "vehicule"], attention: { amenzi: 2 } },
    ...(MANY ? [
      ["pj-vita-plant", "«Vita-Plant» SRL", "1012600000001", 0], ["pj-nord-construct", "Nord Construct SRL", "1015600034512", 2], ["pj-codru-lemn", "Codru Lemn SRL", "1009600021873", 0],
      ["pj-bucataria-mamei", "Bucătăria Mamei SRL", "1018600047790", 1], ["pj-trans-prut", "Trans-Prut SA", "1004600009341", 0], ["pj-orhei-vin", "Orhei Vin SRL", "1011600028865", 0],
    ].map(([id, name, idno, count]) => ({ id, group: "companies", kind: "company", name, idLabel: "IDNO", idValue: idno, via: "admin", attention: count ? { taxe: count } : {} })) : []),
  ];
  const SWITCH_GROUPS = [["self", "Tu"], ["companies", "Companiile tale"], ["powers", "Prin împuternicire"]];
  const contextOf = (id) => CONTEXTS.find((item) => item.id === id) || CONTEXTS[0];
  const todoOf = (ctx) => Object.values(ctx.attention || {}).reduce((sum, count) => sum + count, 0);
  /* a person's IDNP is never shown whole outside the record: real text, not a blur (wiki 03 › Masking) */
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

  /* ---------- menu + sections (wiki 02 › Menu) ---------- */
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
  /* a representative never sees these, whatever the power says (wiki 02 › Contexts) */
  const NEVER_FOR_POWER = ["acces-date", "semnatura", "sanatate", "copii", "frontiera", "fisiere", "imputerniciri"];

  /* card = [title, value, tag, tone, line, action, target section] — demo data, shaped like the inventory */
  const SECTIONS = {
    cereri: {
      label: { self: "Cererile mele", company: "Cererile companiei", person: (ctx) => `Cererile ${ctx.genitive}` }, view: "solicitari",
      text: "Urmărește cererile depuse și vezi ce ai de făcut la fiecare.", source: ["Sistemul GEAP", "GEAP"], keys: "cerere solicitare dosar",
      cards: [
        ["În lucru", "3 cereri", "1 așteaptă răspunsul tău", "warning", "Ultima: Autorizație sanitară de funcționare, 12 noiembrie 2026", "Vezi cererile", "cereri"],
        ["Finalizate", "12 cereri", "", "", "În ultimele 12 luni", "Vezi cererile", "cereri"],
        ["Schițe", "1 schiță", "", "", "Salvată pe 9 noiembrie 2026 · se păstrează 30 de zile"],
      ],
    },
    acte: {
      label: "Acte permisive", view: "acte",
      text: "Actele permisive emise și valabilitatea lor.", source: ["Sistemul GEAP", "GEAP"], keys: "act permisiv autorizatie aviz licenta",
      cards: [
        ["Valabile", "5 acte", "", "", "Cel mai recent: emis pe 20 octombrie 2026", "Vezi actele", "acte"],
        ["Expiră în curând", "1 act", "Expiră în 28 de zile", "warning", "Autorizația de comercializare a băuturilor alcoolice", "Vezi actele", "acte"],
        ["Suspendate sau retrase", "0 acte", "", "", "Nimic de semnalat"],
      ],
    },
    identitate: {
      label: "Acte de identitate",
      text: "Buletinul, pașaportul, permisul de conducere și actele de stare civilă.", source: ["Agenția Servicii Publice", "ASP"], keys: "buletin pasaport permis carte de identitate stare civila",
      cards: (ctx) => [
        ["Buletin de identitate", "14 mai 2031", "Valabil", "success", "Valabil până la această dată · numărul se termină în 4821"],
        ctx.attention.identitate
          ? ["Pașaport", "3 februarie 2027", "Expiră în 78 de zile", "warning", "Poți solicita unul nou cu 6 luni înainte de expirare", "Vezi trecerile de frontieră", "frontiera"]
          : ["Pașaport", "3 februarie 2031", "Valabil", "success", "Numărul se termină în 0917", "Vezi trecerile de frontieră", "frontiera"],
        ["Permis de conducere", "9 iulie 2029", "Valabil", "success", "Categoriile B și C · 3 puncte de penalizare", "Vezi amenzile", "amenzi"],
        ["Acte de stare civilă", "3 acte", "", "", "Certificat de naștere, certificat de căsătorie, un extras"],
      ],
    },
    semnatura: {
      label: "Semnătură electronică",
      text: "Certificatele tale de semnătură electronică și starea lor.", source: ["Serviciul Tehnologia Informației și Securitate Cibernetică", "STISC"], keys: "semnatura msign certificat",
      cards: [
        ["Semnătură mobilă", "22 august 2027", "Activă", "success", "Valabilă până la această dată"],
        ["Semnătură electronică avansată", "1 ianuarie 2027", "Expiră în 45 de zile", "warning", "Reînnoiește-o înainte de expirare"],
        ["Documente semnate", "24", "", "", "În ultimele 12 luni, prin MSign"],
      ],
    },
    diplome: {
      label: "Diplome și studii",
      text: "Actele de studii înregistrate pe numele tău.", source: ["Ministerul Educației și Cercetării", "MEC"], keys: "diploma studii educatie bacalaureat licenta",
      cards: [
        ["Diplomă de licență", "2015", "Verificată", "success", "Universitatea de Stat din Moldova · Drept"],
        ["Diplomă de bacalaureat", "2011", "Verificată", "success", "Liceul Teoretic „Mihai Eminescu”, Bălți"],
        ["Certificate de formare", "2 certificate", "", "", "Ultimul: 18 martie 2024"],
      ],
    },
    frontiera: {
      label: "Treceri de frontieră",
      text: "Intrările și ieșirile tale din țară, înregistrate la punctele de trecere.", source: ["Poliția de Frontieră", "Poliția de Frontieră"], keys: "frontiera trecere vama calatorie",
      cards: [
        ["Ultima trecere", "2 noiembrie 2026", "Intrare", "neutral", "Punctul de trecere Leușeni · cu autoturismul"],
        ["Treceri în 2026", "14 treceri", "", "", "7 ieșiri și 7 intrări"],
        ["Zile peste hotare", "38 de zile", "", "", "În ultimele 180 de zile"],
      ],
    },
    fisiere: {
      label: { self: "Fișierele mele", company: "Fișierele companiei" },
      text: "Documentele încărcate, pe care le poți refolosi la o cerere.", source: ["Cabinetul EVO", "Cabinetul EVO"], keys: "fisier document incarcat upload",
      cards: [
        ["Fișiere încărcate", "9 fișiere", "", "", "Ultimul: Contract de locațiune, 4 noiembrie 2026"],
        ["Folosite în cereri", "6 fișiere", "", "", "În 3 cereri depuse", "Vezi cererile", "cereri"],
        ["Spațiu ocupat", "18 MB", "", "", "Din 500 MB disponibili"],
      ],
    },
    plati: {
      label: "Plăți",
      text: "Plățile făcute către stat, cu dovada fiecăreia.", source: ["MPay", "MPay"], keys: "plata mpay chitanta achitare",
      cards: [
        ["Luna aceasta", "1 240 lei", "", "", "3 plăți · ultima pe 11 noiembrie 2026"],
        ["Anul acesta", "8 615 lei", "", "", "27 de plăți"],
        ["Plăți în așteptare", "0", "", "", "Nimic de confirmat"],
      ],
    },
    taxe: {
      label: "Taxe și datorii",
      text: "Ce datorezi statului și ce ai declarat: datorii, venituri, conturi.", source: ["Serviciul Fiscal de Stat", "SFS"], keys: "taxa impozit datorie fisc sfs situatie fiscala",
      cards: (ctx) => [
        ctx.attention.taxe
          ? ["Datorii", "2 310 lei", "Termen depășit", "danger", "Impozit pe venit · scadent pe 25 octombrie 2026"]
          : ["Datorii", "0 lei", "La zi", "success", "Nicio datorie la bugetul de stat"],
        ["Impozit pe bunuri imobile", "412 lei", "De achitat", "warning", "Până la 25 decembrie 2026", "Vezi bunurile imobile", "imobile"],
        ["Venituri declarate", "186 400 lei", "", "", "Anul fiscal 2025"],
        ["Conturi bancare declarate", "2 conturi", "", "", "Ultima actualizare: 3 septembrie 2026"],
      ],
    },
    amenzi: {
      label: "Amenzi",
      text: "Amenzile primite și termenele în care le poți achita.", source: ["Ministerul Afacerilor Interne", "MAI"], keys: "amenda amenzi contraventie contraventii proces verbal",
      cards: (ctx) => [
        ctx.attention.amenzi
          ? ["Neachitate", ctx.attention.amenzi > 1 ? "1 200 lei" : "600 lei", "De achitat", "warning", `${ctx.attention.amenzi > 1 ? "2 amenzi" : "Depășirea vitezei"} · jumătate din sumă până la 21 noiembrie 2026`, "Vezi vehiculele", "vehicule"]
          : ["Neachitate", "0 lei", "La zi", "success", "Nicio amendă de achitat"],
        ["Achitate", "4 amenzi", "", "", "Ultima: 14 august 2026", "Vezi plățile", "plati"],
        ["Contestate", "0", "", "", "Nicio contestație în curs"],
      ],
    },
    executari: {
      label: "Executări silite",
      text: "Procedurile de executare silită deschise.", source: ["Uniunea Națională a Executorilor Judecătorești", "UNEJ"], keys: "executare silita executor",
      cards: [
        ["Proceduri active", "0", "La zi", "success", "Nicio procedură de executare în curs"],
        ["Proceduri încheiate", "1", "", "", "Încheiată pe 3 martie 2023"],
        ["Interdicții", "0", "", "", "Nicio interdicție aplicată"],
      ],
    },
    imobile: {
      label: "Bunuri imobile",
      text: "Bunurile imobile înregistrate în Registrul bunurilor imobile.", source: ["Agenția Servicii Publice", "ASP"], keys: "imobil cadastru apartament casa teren",
      cards: [
        ["Apartament", "62,4 m²", "Proprietate", "neutral", "mun. Chișinău, str. Albișoara 16 · cota 1/2"],
        ["Teren agricol", "1,2 ha", "Proprietate", "neutral", "r-nul Orhei, s. Peresecina"],
        ["Grevări", "1 ipotecă", "", "", "Înregistrată pe 5 iunie 2021", "Vezi gajurile", "gajuri"],
      ],
    },
    vehicule: {
      label: "Vehicule",
      text: "Vehiculele înregistrate, cu asigurarea și inspecția tehnică.", source: ["Agenția Servicii Publice", "ASP"], keys: "vehicul masina auto rca asigurare inspectie tehnica",
      cards: [
        ["Dacia Duster", "ABC 123", "RCA expiră în 12 zile", "warning", "Inspecția tehnică este valabilă până la 3 aprilie 2027"],
        ["Škoda Octavia", "XYZ 789", "La zi", "success", "RCA până la 9 august 2027 · inspecție până la 9 iulie 2027"],
        ["Amenzi legate de vehicule", "1 amendă", "", "", "600 lei · Dacia Duster", "Vezi amenzile", "amenzi"],
      ],
    },
    gajuri: {
      label: "Gajuri",
      text: "Gajurile înregistrate asupra bunurilor.", source: ["Registrul garanțiilor reale mobile", "RGRM"], keys: "gaj garantie ipoteca",
      cards: [
        ["Gajuri active", "1 gaj", "", "", "Dacia Duster · în favoarea băncii", "Vezi vehiculele", "vehicule"],
        ["Gajuri radiate", "2 gajuri", "", "", "Ultimul radiat pe 12 ianuarie 2024"],
        ["Avize în curs", "0", "", "", "Nicio înregistrare în așteptare"],
      ],
    },
    copii: {
      label: "Copii",
      text: "Copiii tăi și ce ține de ei: acte, indemnizații, grădiniță și școală.", source: ["Agenția Servicii Publice", "ASP"], keys: "copil copii indemnizatie gradinita scoala nastere",
      cards: [
        ["Daria Cojocaru", "7 ani", "", "", "Certificat de naștere · elevă în clasa I"],
        ["Matei Cojocaru", "2 ani", "", "", "Certificat de naștere · înscris la creșă"],
        ["Indemnizații", "1 480 lei", "Lunar", "neutral", "Următoarea plată: 5 decembrie 2026", "Vezi plățile", "plati"],
      ],
    },
    sanatate: {
      label: "Sănătate",
      text: "Asigurarea ta medicală și medicul de familie.", source: ["Compania Națională de Asigurări în Medicină", "CNAM"], keys: "sanatate medic polita asigurare medicala cnam",
      cards: [
        ["Asigurare medicală", "31 decembrie 2026", "Activă", "success", "Valabilă până la această dată"],
        ["Medic de familie", "Elena Rotaru", "", "", "Centrul de Sănătate Buiucani"],
        ["Concedii medicale", "1 concediu", "", "", "3–7 octombrie 2026"],
      ],
    },
    contributii: {
      label: { self: "Contribuții și pensie", company: "Contribuții sociale" },
      text: { self: "Contribuțiile tale sociale și estimarea pensiei.", company: "Contribuțiile sociale declarate și achitate pentru angajați." },
      source: ["Casa Națională de Asigurări Sociale", "CNAS"], keys: "contributii pensie stagiu cnas asigurari sociale",
      cards: (ctx) => (ctx.kind === "company" ? [
        ["Declarate luna trecută", "84 300 lei", "Achitat", "success", "Octombrie 2026 · 14 angajați", "Vezi plățile", "plati"],
        ["De achitat", "0 lei", "La zi", "success", "Următorul termen: 25 decembrie 2026"],
        ["Declarații depuse în 2026", "10", "", "", "Ultima: 24 noiembrie 2026"],
      ] : [
        ["Stagiu de cotizare", "11 ani și 4 luni", "", "", "După declarația din octombrie 2026"],
        ["Contribuții în 2026", "32 150 lei", "", "", "10 luni declarate de angajator"],
        ["Vârsta de pensionare", "63 de ani", "", "", "Estimat: anul 2053"],
      ]),
    },
    companii: {
      label: "Companiile mele",
      text: "Companiile în care ești administrator sau fondator.", source: ["Agenția Servicii Publice", "ASP"], keys: "companie firma srl afacere administrator fondator",
      cards: [
        ["SRL Global Trader", "Administrator", "3 de rezolvat", "warning", "IDNO 1012600000002"],
        ["Agro-Nord SRL", "Administrator", "1 de rezolvat", "warning", "IDNO 1003600012345"],
        ["«Vita-Plant» SRL", "Fondator", "", "", "IDNO 1012600000001 · cotă de 40 %"],
      ],
    },
    imputerniciri: {
      label: "Împuterniciri",
      text: "Împuternicirile primite și cele date altora.", source: ["MPower", "MPower"], keys: "imputernicire procura mandat mpower notar reprezentare",
      cards: [
        ["Primite", "3 împuterniciri", "Una expiră în 5 zile", "warning", "Lumina Office SRL, Maria Rusu, Grigore Vasilescu"],
        ["Date de tine", "1 împuternicire", "", "", "Valabilă până la 1 martie 2027"],
        ["Notariale", "1 împuternicire", "Confirmată", "success", "Nr. 1234 · valabilă până la 3 martie 2027", "Adaugă una nouă", "imputernicire-noua"],
      ],
    },
    "acces-date": {
      label: { self: "Cine mi-a accesat datele", company: "Cine a accesat datele companiei" },
      text: "Vezi ce instituții au consultat datele, când și de ce.", source: ["MConnect", "MConnect"], keys: "acces date personale istoric consultare mconnect",
      cards: [
        ["Luna aceasta", "6 accesări", "", "", "Ultima: Serviciul Fiscal de Stat, 15 noiembrie 2026"],
        ["Instituții", "4 instituții", "", "", "SFS, CNAM, ASP, Poliția de Frontieră"],
        ["Fără temei clar", "0", "", "", "Poți cere explicații pentru orice accesare"],
      ],
    },
    detalii: {
      label: "Detalii companie",
      text: "Datele companiei din Registrul de stat al unităților de drept.", source: ["Agenția Servicii Publice", "ASP"], keys: "companie detalii rsud fondator administrator caem",
      cards: [
        ["Stare", "Activă", "", "", "SRL · înregistrată pe 14 martie 2012"],
        ["Administrator", "Anastasia Cojocaru", "", "", "Din 2 februarie 2019"],
        ["Fondatori", "2 fondatori", "", "", "Capital social: 5 400 lei"],
        ["Genuri de activitate", "4 coduri CAEM", "", "", "Principal: 47.11 Comerț cu amănuntul"],
      ],
    },
    concedii: {
      label: "Concediile angajaților",
      text: "Concediile medicale ale angajaților, transmise de instituțiile medicale.", source: ["Casa Națională de Asigurări Sociale", "CNAS"], keys: "concediu medical angajat angajati",
      cards: [
        ["De confirmat", "1 concediu", "Așteaptă confirmarea ta", "warning", "Primit pe 14 noiembrie 2026"],
        ["Deschise", "2 concedii", "", "", "Angajați în concediu medical astăzi"],
        ["Luna aceasta", "5 concedii", "", "", "31 de zile în total"],
      ],
    },
    controale: {
      label: "Controale de stat",
      text: "Controalele de stat planificate și cele efectuate la companie.", source: ["Registrul de stat al controalelor", "Registrul controalelor"], keys: "control inspectie ansa verificare",
      cards: [
        ["Planificate", "1 control", "În 23 de zile", "warning", "Agenția Națională pentru Siguranța Alimentelor · 10 decembrie 2026"],
        ["Efectuate în 2026", "2 controale", "", "", "Nicio prescripție neîndeplinită"],
        ["Prescripții", "0", "La zi", "success", "Nimic de remediat"],
      ],
    },
    reclamatii: {
      label: "Reclamații despre companie",
      text: "Reclamațiile depuse de consumatori despre companie.", source: ["Agenția pentru Protecția Consumatorilor", "APCSP"], keys: "reclamatie plangere consumator",
      cards: [
        ["Deschise", "0", "", "", "Nicio reclamație în examinare"],
        ["Închise în 2026", "1 reclamație", "", "", "Soluționată pe 2 iulie 2026"],
        ["Termen de răspuns", "30 de zile", "", "", "De la data înregistrării reclamației"],
      ],
    },
  };
  /* M17 „Adaugă o împuternicire notarială” — a placeholder page until Batch 9 */
  const NEW_POWER = "imputernicire-noua";

  const menuOf = (ctx) => (ctx.kind === "company" ? MENU.company : MENU.person)
    .map(([group, ids]) => [group, ctx.scope ? ids.filter((id) => ctx.scope.includes(id) && !NEVER_FOR_POWER.includes(id)) : ids])
    .filter(([, ids]) => ids.length);
  const inMenu = (ctx, id) => menuOf(ctx).some(([, ids]) => ids.includes(id));
  const groupOf = (ctx, id) => menuOf(ctx).find(([, ids]) => ids.includes(id))?.[0] || "";
  const groupLabel = (ctx, id) => { const g = V2.group(id); return (ctx.kind === "company" && g?.company) || g?.label || ""; };
  const pick = (value, ctx) => {
    if (typeof value === "string" || Array.isArray(value)) return value;
    if (ctx.kind === "self") return value.self;
    if (ctx.kind === "company") return value.company || value.self;
    return typeof value.person === "function" ? value.person(ctx) : value.person || value.self;
  };
  const titleOf = (id, ctx) => (id === "acasa" ? "Acasă" : id === NEW_POWER ? "Adaugă o împuternicire notarială" : pick(SECTIONS[id].label, ctx));

  /* ---------- state + addresses ---------- */
  const state = { ctx: contextOf(params.get("as")), section: "acasa" };
  const urlOf = (section, ctx = state.ctx) => {
    const next = new URLSearchParams({ shell: "2", view: "cabinet" });
    if (ctx.id !== CONTEXTS[0].id) next.set("as", ctx.id);
    if (section && section !== "acasa") next.set("s", section);
    ["atentie", "entitati", "motion"].forEach((key) => { if (params.get(key)) next.set(key, params.get(key)); });
    return `?${next.toString()}`;
  };
  /* the existing views („as they are” until Batch 5); the flag stays on so the logo leads back to the shell */
  const legacyUrl = (view, ctx = state.ctx) => `?${new URLSearchParams({ view, as: ctx.id, shell: "2" }).toString()}`;
  const catalogUrl = () => legacyUrl("catalog");
  /* where a menu / card / search entry leads: the existing view when the current Cabinet has this subject's data */
  const hrefOf = (section, ctx = state.ctx) => (SECTIONS[section]?.view && ctx.legacy ? legacyUrl(SECTIONS[section].view, ctx) : urlOf(section, ctx));
  const goAttr = (section, ctx = state.ctx) => (SECTIONS[section]?.view && ctx.legacy ? "" : ` data-cab2-go="${escape(section)}"`);
  /* what the address asks for → what is shown */
  const resolve = (ctx, asked) => {
    if (!asked || asked === "acasa") return { section: "acasa" };
    if (asked === NEW_POWER) return ctx.kind === "self" ? { section: NEW_POWER } : { section: "acasa", redirect: true };
    if (!SECTIONS[asked]) return { section: "acasa", redirect: true };
    if (inMenu(ctx, asked)) return { section: asked };
    /* acting by a power: the section exists, the power does not cover it */
    if (ctx.scope) return { section: asked, denied: true };
    return { section: "acasa", redirect: true };
  };

  /* ---------- frame ---------- */
  document.body.insertAdjacentHTML("afterbegin", '<a class="btn btn-secondary btn-md cab2-skip" href="#cab2-content" data-cab2-skip>Sari la conținut</a>');
  header.insertAdjacentHTML("afterend", '<div class="cab2-context" role="region" aria-label="Pentru cine acționezi" data-cab2-context hidden></div>');
  host.innerHTML = `
    <p class="u-visually-hidden" role="status" aria-live="polite" data-cab2-live></p>
    <div class="cab2-shell">
      <a class="btn btn-secondary btn-md cab2-skip" href="#cab2-content" data-cab2-skip>Sari peste meniu</a>
      <nav class="cab2-menu" aria-label="Meniul Cabinetului" data-cab2-menu></nav>
      <div class="cab2-shell__content" id="cab2-content" tabindex="-1" data-cab2-content></div>
    </div>`;
  document.querySelector("main")?.insertAdjacentHTML("afterend", '<nav class="cab2-bar" aria-label="Navigare rapidă" data-cab2-bar></nav>');
  host.hidden = false;

  const els = {
    context: document.querySelector("[data-cab2-context]"),
    live: host.querySelector("[data-cab2-live]"),
    menu: host.querySelector("[data-cab2-menu]"),
    content: host.querySelector("[data-cab2-content]"),
    bar: document.querySelector("[data-cab2-bar]"),
    panel: document.querySelector("#fo-avatar-menu"),
    avatar: document.querySelector("[data-fo-avatar-trigger]"),
  };
  document.documentElement.classList.add("has-cab2-bar");

  /* the sticky header's height and the bar's height, for the sticky menu and the scroll paddings */
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
        <button class="btn btn-text-primary btn-sm" type="button" aria-haspopup="dialog" data-cab2-switch-open>Schimbă${hidden(" pentru cine acționezi")}</button>
      </div>`;
  }

  /* ---------- menu (the library Sidebar) ---------- */
  const badge = (count) => (count ? `<span class="sidebar__meta"><span class="badge badge--solid-notification badge--lg" aria-hidden="true">${count}</span>${hidden(`, ${count === 1 ? "un lucru" : `${count} lucruri`} de rezolvat`)}</span>` : "");
  const menuLink = (id, { current, prefix }) => {
    const ctx = state.ctx;
    const on = current === id;
    return `<li class="sidebar__item"><a class="sidebar__link${on ? " sidebar__link--active" : ""}" href="${escape(hrefOf(id))}"${goAttr(id)}${on ? ' aria-current="page"' : ""} data-cab2-nav="${escape(id)}"><span class="sidebar__label" id="${prefix}-${escape(id)}">${escape(titleOf(id, ctx))}</span>${badge(ctx.attention?.[id])}</a></li>`;
  };
  function menuHtml(prefix, { account = false } = {}) {
    const ctx = state.ctx;
    const current = state.denied ? "" : state.section;
    const groups = menuOf(ctx).map(([group, ids]) => `
      <div class="sidebar__section${group === "acces" ? " cab2-menu__foot" : ""}" data-cab2-group="${group}">
        <div class="sidebar__heading cab2-menu__heading">${V2.groupIcon(group, { size: "sm" })}<h2 class="sidebar__title" id="${prefix}-g-${group}">${escape(groupLabel(ctx, group))}</h2></div>
        <ul class="sidebar__list" aria-labelledby="${prefix}-g-${group}">${ids.map((id) => menuLink(id, { current, prefix })).join("")}</ul>
      </div>`).join("");
    const home = `
      <div class="sidebar__section">
        <ul class="sidebar__list" aria-label="Pagina de pornire">
          <li class="sidebar__item"><a class="sidebar__link${current === "acasa" ? " sidebar__link--active" : ""}" href="${escape(urlOf("acasa"))}" data-cab2-go="acasa"${current === "acasa" ? ' aria-current="page"' : ""} data-cab2-nav="acasa">${V2.groupIcon("acasa", { size: "sm" })}<span class="sidebar__label">Acasă</span></a></li>
        </ul>
      </div>`;
    /* phones: nothing is reachable only through the avatar (wiki 02 › Shell) */
    const mine = account ? `
      <div class="sidebar__section cab2-menu__foot">
        <div class="sidebar__heading cab2-menu__heading"><span class="avatar avatar--sm avatar--initials" aria-hidden="true">${escape(CONTEXTS[0].initials)}</span><h2 class="sidebar__title" id="${prefix}-g-cont">Contul meu</h2></div>
        <ul class="sidebar__list" aria-labelledby="${prefix}-g-cont">
          <li class="sidebar__item"><button class="sidebar__link cab2-menu__button" type="button" aria-haspopup="dialog" data-cab2-switch-open><span class="sidebar__label">Pentru cine acționezi?</span></button></li>
          <li class="sidebar__item"><a class="sidebar__link" href="https://mpass.gov.md" target="_blank" rel="noopener"><span class="sidebar__label">Contul MPass${hidden(", se deschide în altă pagină")}</span></a></li>
          <li class="sidebar__item"><a class="sidebar__link" href="${escape(catalogUrl())}"><span class="sidebar__label">Ajutor</span></a></li>
          <li class="sidebar__item"><button class="sidebar__link cab2-menu__button" type="button" data-cab2-signout><span class="sidebar__label">Ieși din cont</span></button></li>
        </ul>
      </div>` : "";
    return `<div class="sidebar sidebar--item-preview cab2-menu__list"><div class="sidebar__nav">${home}${groups}${mine}</div></div>`;
  }
  function renderMenu() {
    els.menu.innerHTML = menuHtml("cab2-m");
    if (menuSheet && menuSheet.getAttribute("aria-hidden") === "false") menuSheet.querySelector("[data-sheet-body]").innerHTML = `<nav aria-label="Meniul Cabinetului">${menuHtml("cab2-ms", { account: true })}</nav>`;
  }

  /* ---------- phone bottom bar ---------- */
  const BAR = [["acasa", "Acasă", "home-line"], ["cereri", "Cereri", "permission"], ["documente", "Documente", "id-card"], ["bani", "Bani", "wallet"]];
  function renderBar() {
    const ctx = state.ctx;
    const currentGroup = state.denied ? "" : state.section === "acasa" ? "acasa" : groupOf(ctx, state.section);
    const items = BAR.map(([group, label, glyph]) => {
      const first = group === "acasa" ? "acasa" : menuOf(ctx).find(([id]) => id === group)?.[1][0];
      /* a group the context does not have is absent, never disabled */
      if (!first) return "";
      const on = currentGroup === group;
      return `<li><a class="cab2-bar__item" href="${escape(hrefOf(first))}"${first === "acasa" ? ' data-cab2-go="acasa"' : goAttr(first)}${on ? ' aria-current="page"' : ""}>${ico(on && group !== "cereri" ? `${glyph}-filled` : glyph)}<span>${label}</span></a></li>`;
    }).join("");
    const open = menuSheet?.getAttribute("aria-hidden") === "false";
    els.bar.innerHTML = `<ul class="cab2-bar__list">${items}<li><button class="cab2-bar__item" type="button" aria-haspopup="dialog" aria-expanded="${open}" data-cab2-menu-open>${ico("menu")}<span>Meniu</span></button></li></ul>`;
    measure();
  }

  /* ---------- pages ---------- */
  const cardOf = (ctx, sectionId) => ([title, value, tagLabel, tone, line, action, target]) => {
    /* a card may lead to another section; to its own only when that is the existing view (Cererile / Acte) */
    const to = target && (target !== sectionId || (SECTIONS[target]?.view && ctx.legacy)) ? target : "";
    const reachable = to && (to === NEW_POWER ? ctx.kind === "self" : inMenu(ctx, to));
    return V2.card({
      title, value, tag: tagLabel, tone, line,
      source: `Date de la ${pick(SECTIONS[sectionId].source, ctx)[1]} · azi, 15:42`,
      action: reachable ? action : "", href: reachable ? hrefOf(to, ctx) : "", linkAttrs: reachable ? goAttr(to, ctx) : "",
    });
  };
  const cardsOf = (ctx, id) => { const cards = SECTIONS[id].cards; return typeof cards === "function" ? cards(ctx) : cards; };

  function homeHtml(ctx) {
    const own = ctx.kind === "self";
    const count = todoOf(ctx);
    const avatar = ctx.kind === "company"
      ? `<span class="avatar ${isPhone() ? "avatar--lg" : "avatar--xl"} avatar--icon" aria-hidden="true">${ico("business")}</span>`
      : `<span class="avatar ${isPhone() ? "avatar--lg" : "avatar--xl"} avatar--initials" aria-hidden="true">${escape(ctx.initials)}</span>`;
    const summary = [
      { group: "cereri", id: "cereri", title: "Cererile tale în lucru", own: "Cererile tale în lucru", other: "Cereri în lucru", value: "3 cereri", tag: ctx.attention.cereri ? "Una așteaptă răspunsul tău" : "", tone: "warning", line: "Ultima: Autorizație sanitară de funcționare, 12 noiembrie 2026", action: "Vezi toate" },
      { group: "cereri", id: "acte", other: "Acte permisive", own: "Acte permisive", value: "5 acte", tag: ctx.attention.acte ? "Unul expiră în 28 de zile" : "", tone: "warning", line: "Cel mai recent: emis pe 20 octombrie 2026", action: "Vezi toate", only: "company" },
      { group: "documente", id: "identitate", other: "Acte de identitate", own: "Documentele tale", value: "4 documente", tag: ctx.attention.identitate ? "Pașaportul expiră în 78 de zile" : "", tone: "warning", line: "Buletin, pașaport, permis de conducere, stare civilă", action: "Detalii" },
      { group: "documente", id: "fisiere", other: "Fișierele companiei", own: "Fișierele mele", value: "9 fișiere", tag: "", tone: "", line: "Ultimul: Contract de locațiune, 4 noiembrie 2026", action: "Detalii", only: "company" },
      { group: "bani", id: "amenzi", other: "Amenzi", own: "Amenzi", value: ctx.attention.amenzi ? (ctx.attention.amenzi > 1 ? "1 200 lei" : "600 lei") : "0 lei", tag: ctx.attention.amenzi ? "De achitat" : "La zi", tone: ctx.attention.amenzi ? "warning" : "success", line: ctx.attention.amenzi ? "Jumătate din sumă până la 21 noiembrie 2026" : "Nicio amendă de achitat", action: "Detalii" },
      { group: "bani", id: "taxe", other: "Taxe și datorii", own: "Taxe și datorii", value: ctx.attention.taxe ? "2 310 lei" : "0 lei", tag: ctx.attention.taxe ? "Termen depășit" : "La zi", tone: ctx.attention.taxe ? "danger" : "success", line: ctx.attention.taxe ? "Impozit pe venit · scadent pe 25 octombrie 2026" : "Nicio datorie la bugetul de stat", action: "Detalii" },
      { group: "proprietati", id: "vehicule", other: "Vehicule", own: "Vehicule", value: "2 vehicule", tag: "RCA expiră în 12 zile", tone: "warning", line: "Dacia Duster · ABC 123", action: "Detalii" },
      { group: "munca", id: "controale", other: "Controale de stat", own: "Controale de stat", value: "1 control", tag: "În 23 de zile", tone: "warning", line: "ANSA · 10 decembrie 2026", action: "Detalii" },
      { group: "munca", id: "concedii", other: "Concediile angajaților", own: "Concediile angajaților", value: "1 concediu", tag: "Așteaptă confirmarea ta", tone: "warning", line: "Primit pe 14 noiembrie 2026", action: "Detalii" },
    ].filter((item) => inMenu(ctx, item.id) && (!item.only || item.only === ctx.kind))
      /* what needs the user comes first; the rest keeps the menu order */
      .map((item, index) => ({ item, index, rank: ctx.attention[item.id] ? 0 : 1 })).sort((a, b) => a.rank - b.rank || a.index - b.index).slice(0, 4).map(({ item }) => item);
    const lines = own
      ? [`<p>${escape(todoText(count, true))}</p>`]
      : [`<p>${escape(identifier(ctx))} · acționezi ${escape(capacity(ctx, { validity: false }))}</p>`, `<p>${escape(todoText(count, false))}${ctx.viewOnly ? " · doar vizualizare" : ""}</p>`];
    return `
      <div class="cab2-page" data-cab2-page="acasa">
        <header class="cab2-hero">
          <span class="cab2-hero__ring">${avatar}</span>
          <div class="cab2-hero__text">
            <h1 class="cab2-hero__title" id="cab2-title" tabindex="-1">${own ? `Bună, ${escape(ctx.first)}` : escape(ctx.name)}</h1>
            ${lines.join("")}
          </div>
        </header>
        <section class="cab2-section" aria-labelledby="cab2-home-summary">
          <h2 class="cab2-section__title" id="cab2-home-summary">Pe scurt</h2>
          <div class="cab2-wcards">
            ${summary.map((item) => V2.card({
              group: item.group, title: own ? item.own : item.other, value: item.value, tag: item.tag, tone: item.tone, line: item.line,
              source: `Date de la ${pick(SECTIONS[item.id].source, ctx)[1]} · azi, 15:42`, action: item.action, href: hrefOf(item.id, ctx), linkAttrs: goAttr(item.id, ctx), attrs: " data-cab2-entrance-item",
            })).join("")}
          </div>
        </section>
      </div>`;
  }

  const headHtml = (title, text, source) => `
    <header class="cab2-head">
      <h1 class="text-heading-h2 cab2-head__title" id="cab2-title" tabindex="-1">${escape(title)}</h1>
      ${text ? `<p class="cab2-head__text">${escape(text)}</p>` : ""}
      ${source ? `<p class="cab2-source">${escape(source)}</p>` : ""}
    </header>`;

  function sectionHtml(ctx, id) {
    const sec = SECTIONS[id];
    return `
      <div class="cab2-page" data-cab2-page="${escape(id)}">
        ${headHtml(titleOf(id, ctx), pick(sec.text, ctx), `Date de la ${pick(sec.source, ctx)[0]} · actualizate azi, 15:42`)}
        <div class="cab2-wcards">${cardsOf(ctx, id).map(cardOf(ctx, id)).join("")}</div>
      </div>`;
  }

  const stateHtml = (id, title, box) => `
    <div class="cab2-page cab2-page--record" data-cab2-page="${escape(id)}">
      ${headHtml(title, "", "")}
      <div class="cab2-state">${window.GEAPEmptyState.render(box)}</div>
    </div>`;
  const homeAction = () => `<a class="${btn("secondary")}" href="${escape(urlOf("acasa"))}" data-cab2-go="acasa">Mergi la Acasă</a>`;
  const deniedHtml = (ctx, id) => stateHtml(id, titleOf(id, ctx), {
    title: "Nu este disponibil pentru această împuternicire",
    text: `Împuternicirea de la ${ctx.name} nu acoperă această secțiune. Poți deschide doar secțiunile din meniu.`,
    icon: "lock", actionHtml: homeAction(),
  });
  const newPowerHtml = () => stateHtml(NEW_POWER, titleOf(NEW_POWER, state.ctx), {
    title: "Formularul este în pregătire",
    text: "Aici vei introduce IDNP-ul sau IDNO-ul persoanei pe care o reprezinți, numărul și data împuternicirii notariale, ce acoperă și până când este valabilă, apoi vei încărca actul.",
    icon: "shield-user", actionHtml: homeAction(),
  });

  const pageHtml = () => (state.denied ? deniedHtml(state.ctx, state.section) : state.section === "acasa" ? homeHtml(state.ctx) : state.section === NEW_POWER ? newPowerHtml() : sectionHtml(state.ctx, state.section));
  const pageTitle = () => {
    const ctx = state.ctx;
    const name = state.denied ? "Nu este disponibil pentru această împuternicire" : titleOf(state.section, ctx);
    document.title = [name, ctx.kind === "self" ? "" : ctx.name, "EVO Cabinet"].filter(Boolean).join(" · ");
  };
  const focusTitle = () => { const h1 = els.content.querySelector("#cab2-title"); if (h1) { h1.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); } };

  /* ---------- switcher (M1) — the header instance switch panel ---------- */
  let switchQuery = "";
  const rowHtml = (ctx) => {
    const on = ctx.id === state.ctx.id;
    const count = todoOf(ctx);
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
      const add = group === "powers" && !q ? `<a class="btn btn-secondary btn-md cab2-switch__add" href="${escape(urlOf(NEW_POWER, CONTEXTS[0]))}" data-cab2-new-power>${ico("plus-large")}<span>Adaugă o împuternicire notarială</span></a>` : "";
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
        <p class="cab2-switch__title" id="cab2-switch-title">Pentru cine acționezi?</p>
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
        <li><a class="e-permits-fo-intent-menu__item" href="${escape(catalogUrl())}">${ico("bubble-question")}<span>Ajutor</span></a></li>
        <li><button class="e-permits-fo-intent-menu__item" type="button" data-cab2-signout>${ico("logout")}<span>Ieși din cont</span></button></li>
      </ul>`;
    const name = header.querySelector("[data-cab-name]");
    if (name) name.textContent = state.ctx.name;
  }
  const switcherOpen = () => els.avatar?.getAttribute("aria-expanded") === "true";
  function openSwitcher() {
    if (!els.avatar) return;
    /* after this click has finished bubbling: the header closes its panel on any outside click */
    window.setTimeout(() => {
      if (!switcherOpen()) els.avatar.click();
      window.requestAnimationFrame(() => (els.panel.querySelector("[data-cab2-switch-search]") || els.panel.querySelector('[aria-current="true"]') || els.panel.querySelector("[data-cab2-as]"))?.focus());
    }, 0);
  }
  const closeSwitcher = () => { if (switcherOpen()) els.avatar.click(); };

  /* ---------- render + navigation ---------- */
  function renderAll() {
    renderContext();
    renderMenu();
    renderBar();
    renderSwitcher();
    pageTitle();
  }
  function apply(asked, { replace = false, push = true } = {}) {
    const next = resolve(state.ctx, asked);
    state.section = next.section;
    state.denied = !!next.denied;
    const url = urlOf(next.redirect ? "acasa" : state.section);
    if (replace || next.redirect) window.history.replaceState({ cab2: true }, "", url);
    else if (push) window.history.pushState({ cab2: true }, "", url);
  }
  /* menu section → another section: fade-through; focus goes to the page title */
  async function go(section, { push = true } = {}) {
    closeSearch();
    apply(section, { push });
    renderAll();
    await M.fadeThrough(els.content, () => { els.content.innerHTML = pageHtml(); focusTitle(); });
  }
  /* a switch always lands on Acasă of the new context, says so, moves focus to the title; never signs out */
  function switchTo(id) {
    const ctx = contextOf(id);
    closeSwitcher();
    closeMenuSheet({ focus: false });
    state.ctx = ctx;
    switchQuery = "";
    apply("acasa");
    renderAll();
    els.content.innerHTML = pageHtml();
    focusTitle();
    els.live.textContent = "";
    window.setTimeout(() => { els.live.textContent = ctx.kind === "self" ? "Acum acționezi pentru tine." : `Acum acționezi pentru ${ctx.name}, ${capacity(ctx, { validity: false })}${ctx.viewOnly ? ", doar vizualizare" : ""}.`; }, 60);
    M.entrance(els.content, { key: "cab2-shell", force: true });
    refreshSearch();
  }

  /* ---------- global search ---------- */
  const SYNONYMS_NOTE = "amendă / contravenție, buletin, pensie, RCA, procură / mandat";
  const RECORDS = {
    person: [
      ["Amendă · 600 lei", "de achitat până la 21 noiembrie 2026", "amenzi", "contraventie viteza proces verbal"],
      ["Pașaport", "valabil până la 3 februarie 2027", "identitate", "pasaport calatorie"],
      ["Buletin de identitate", "valabil până la 14 mai 2031", "identitate", "buletin carte identitate"],
      ["Dacia Duster · ABC 123", "RCA expiră în 12 zile", "vehicule", "rca masina auto asigurare"],
      ["Autorizație sanitară de funcționare", "cerere în lucru", "cereri", "autorizatie cerere"],
      ["Împuternicire · Lumina Office SRL", "valabilă până la 30 iunie 2027", "imputerniciri", "procura mandat mpower"],
      ["Stagiu de cotizare · 11 ani și 4 luni", "după declarația din octombrie 2026", "contributii", "pensie stagiu cnas"],
    ],
    company: [
      ["Autorizația de comercializare a băuturilor alcoolice", "expiră în 28 de zile", "acte", "autorizatie licenta alcool"],
      ["Control planificat · ANSA", "10 decembrie 2026", "controale", "control inspectie"],
      ["Ford Transit · GTR 204", "RCA valabilă până la 2 martie 2027", "vehicule", "rca masina auto asigurare"],
      ["Împuternicire · Anastasia Cojocaru", "valabilă până la 1 martie 2027", "imputerniciri", "procura mandat mpower"],
      ["Contribuții sociale · octombrie 2026", "84 300 lei, achitat", "contributii", "cnas contributii"],
    ],
  };
  const SERVICES = [
    ["Eliberarea buletinului de identitate", "buletin carte identitate"],
    ["Eliberarea pașaportului", "pasaport"],
    ["Calcularea pensiei pentru limită de vârstă", "pensie cnas"],
    ["Verificarea asigurării RCA", "rca asigurare masina auto"],
    ["Înregistrarea unei împuterniciri", "procura mandat mpower imputernicire"],
    ["Contestarea unei amenzi", "amenda contraventie"],
    ["Certificat privind lipsa datoriilor la buget", "datorii fisc taxe"],
    ["Extras din Registrul bunurilor imobile", "cadastru extras imobil"],
    ["Autorizație sanitară de funcționare", "autorizatie act permisiv"],
  ];
  const SUGGESTED = ["amenzi", "identitate", "cereri", "taxe", "imputerniciri", "acte"];
  function searchIndex() {
    const ctx = state.ctx;
    const sections = menuOf(ctx).flatMap(([group, ids]) => ids.map((id) => ({ kind: "section", id, label: titleOf(id, ctx), meta: groupLabel(ctx, group), hay: norm(`${titleOf(id, ctx)} ${SECTIONS[id].keys}`), href: hrefOf(id, ctx), go: goAttr(id, ctx), glyph: V2.group(group).icon })));
    const records = (ctx.kind === "company" ? RECORDS.company : RECORDS.person).filter(([, , id]) => inMenu(ctx, id)).map(([label, meta, id, keys]) => ({ kind: "record", id, label, meta: `${titleOf(id, ctx)} · ${meta}`, hay: norm(`${label} ${keys}`), href: hrefOf(id, ctx), go: goAttr(id, ctx), glyph: "page-text" }));
    const services = ctx.viewOnly ? [] : SERVICES.map(([label, keys]) => ({ kind: "service", label, meta: "Catalogul serviciilor", hay: norm(`${label} ${keys}`), href: catalogUrl(), go: "", glyph: "external-link" }));
    return { sections, records, services };
  }
  function searchResults(query) {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    const index = searchIndex();
    if (!tokens.length) {
      const suggested = index.sections.filter((item) => SUGGESTED.includes(item.id));
      return { empty: true, groups: [["Sugestii", (suggested.length ? suggested : index.sections).slice(0, 4)]] };
    }
    /* every typed word starts a word of the entry („rca” must not find „încărcat”) */
    const hit = (item) => { const words = item.hay.split(/[^a-z0-9]+/); return tokens.every((token) => words.some((word) => word.startsWith(token))); };
    const groups = [["Secțiuni", index.sections.filter(hit).slice(0, 4)], [state.ctx.kind === "self" ? "Datele tale" : "Date", index.records.filter(hit).slice(0, 4)], ["Servicii", index.services.filter(hit).slice(0, 3)]].filter(([, items]) => items.length);
    return { groups };
  }
  function searchPanelHtml(prefix, query) {
    const { groups, empty } = searchResults(query);
    if (!groups.length) {
      return { count: 0, html: window.GEAPEmptyState.noResults(`Niciun rezultat pentru „${escape(query.trim())}”`, { text: `Încearcă alt cuvânt. Căutarea înțelege și ${SYNONYMS_NOTE}.`, compact: true, bare: true }) };
    }
    let n = 0;
    const html = groups.map(([label, items], g) => `
      <p class="cab2-search__label" id="${prefix}-l${g}">${escape(label)}</p>
      <ul class="cab2-search__group" role="group" aria-labelledby="${prefix}-l${g}">
        ${items.map((item) => `<li role="presentation"><a class="e-permits-fo-intent-menu__item cab2-search__option" role="option" aria-selected="false" tabindex="-1" id="${prefix}-o${n++}" href="${escape(item.href)}"${item.go} data-cab2-search-option>${ico(item.glyph)}<span class="cab2-search__text"><span>${escape(item.label)}</span><span class="cab2-search__meta">${escape(item.meta)}</span></span></a></li>`).join("")}
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

  /* the header: on desktop the field takes the place of the header's search icon; on phones the icon opens the sheet.
     The header markup itself is the shared one — only this slot differs on the Cabinet. */
  const headerTrigger = header.querySelector("[data-evo-search-trigger]");
  const headerActions = headerTrigger?.parentElement;
  /* a copy without the site header's own handler (it opens the EVO site menu on phones) */
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
  const sheetOpen = (sheet) => sheet?.getAttribute("aria-hidden") === "false";
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
    menuSheet.querySelector("[data-sheet-body]").innerHTML = `<nav aria-label="Meniul Cabinetului">${menuHtml("cab2-ms", { account: true })}</nav>`;
    window.GEAPSheet.show(menuSheet);
    renderBar();
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
    if (newPower && plain(event)) {
      event.preventDefault();
      closeSwitcher();
      if (state.ctx.kind !== "self") { state.ctx = CONTEXTS[0]; }
      go(NEW_POWER);
      return;
    }
    if (event.target.closest("[data-cab2-switch-open]")) { closeMenuSheet({ focus: false }); openSwitcher(); return; }
    if (event.target.closest("[data-cab2-switch-clear]")) { switchQuery = ""; renderSwitcher(); els.panel.querySelector("[data-cab2-switch-search]")?.focus(); return; }
    if (event.target.closest("[data-cab2-menu-open]")) { if (sheetOpen(menuSheet)) closeMenuSheet(); else openMenuSheet(); return; }
    if (event.target.closest("[data-cab2-signout]")) { window.location.assign("?view=catalog&auth=0"); return; }
    const link = event.target.closest("a[data-cab2-go]");
    if (link && plain(event)) {
      event.preventDefault();
      closeMenuSheet({ focus: false });
      closeSwitcher();
      go(link.dataset.cab2Go);
    }
  });
  els.panel?.addEventListener("input", (event) => {
    if (!event.target.matches("[data-cab2-switch-search]")) return;
    switchQuery = event.target.value;
    const field = event.target.closest(".search-input");
    field.classList.toggle("has-value", !!switchQuery);
    field.classList.toggle("is-ready", !!switchQuery);
    els.panel.querySelector("[data-cab2-switch-list]").innerHTML = switchListHtml();
  });
  window.addEventListener("popstate", () => {
    const now = new URLSearchParams(window.location.search);
    state.ctx = contextOf(now.get("as"));
    apply(now.get("s"), { push: false });
    renderAll();
    els.content.innerHTML = pageHtml();
  });
  phoneQuery.addEventListener("change", () => {
    closeMenuSheet({ focus: false });
    closeSearchSheet({ focus: false });
    placeSearch();
    renderSwitcher();
    els.content.innerHTML = pageHtml();
    measure();
  });

  /* ---------- boot ---------- */
  header.querySelector(".evo-header__logo")?.setAttribute("href", urlOf("acasa", CONTEXTS[0]));
  apply(params.get("s"), { replace: true });
  placeSearch();
  renderAll();
  els.content.innerHTML = pageHtml();
  measure();
  /* cabinet-evo.js names the tab once its data is in — the shell's title wins */
  const ready = () => {
    pageTitle();
    renderSwitcher();
    if (state.section === "acasa" && !state.denied) M.entrance(els.content, { key: "cab2-shell" });
    host.setAttribute("data-cab2-ready", "");
  };
  if (document.documentElement.dataset.cabReady === "true") ready();
  else new MutationObserver((records, observer) => { if (document.documentElement.dataset.cabReady === "true") { observer.disconnect(); ready(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-cab-ready"] });

  window.Cab2Shell = { state, go, switchTo, openSwitcher, openMenuSheet, openSearchSheet, CONTEXTS, SECTIONS };
})();
