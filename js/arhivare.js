/* =====================================================================================
   Arhivarea, restaurarea și păstrarea dosarelor (arh-v1, 2026-11-23) — Feature 97300, US-395…408.
   Data: data/arhivare.json (policies, archive state of the BO dossiers, old dossiers, candidates, saved searches);
   the session's changes live in localStorage `e-permits-arhivare-v1` (a demo link starts clean).

   NO new engine, no new component:
     · Setări › „Politici de arhivare și păstrare” = the BO registry (`GEAPShellRegistries.arhivare`, nav `arhivare`) and the
       tab „Candidați la nimicire” = a second registry (`arhivare-candidati`, hidden nav item) — the status-tab bar switches
       between them (view tabs, no counts); access as Permisiuni: Administrator central, Administrator local only when
       granted (`?arhivare=acordat`), everyone else = the boxed lock empty state „Nu ai acces la această secțiune.”;
     · policy create / edit = the ONE drawer (sections „Domeniu de aplicare” · „Arhivare” · „Păstrare”; durations = the
       value group with a trailing unit `.e-permits-doc-val` + `__mode--end`); activate / deactivate = askConfirm;
     · candidates: row checkboxes (only Anunțat + „Necesită aprobare” = Da, shell `rowSelectable`), the selection bar
       „Șterge” (red) · „Respinge”, row ⋮ for one candidate; confirm / reject = the library dialog;
     · Registru Dosare (js/registre.js hooks `window.GEAPArhivare`): column + facet „Starea înregistrării” (Activ / Arhivat /
       Nimicit / Toate), „Data arhivării”, facets Perioada deciziei / Perioada arhivării / Tip obiect, ⋮ Arhivează ·
       Restaurează · Obiecte arhivate · Versiuni, the read-only record card of an archived / destroyed dossier (minimal
       data), the automatic procedures' results as journal events; „Căutările mele” + „Salvează căutarea” on its toolbar.
   UI copy speaks „tu” (Nu ai acces, Confirmi, Continui?, Introdu…).
   Demo switch ?arhivare= acordat · fara-arhiveaza · fara-restaureaza · gol · fara-candidati · eroare.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || A().renderTag?.(label, tone) || esc(label);
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const nowIso = () => isoOf(new Date());
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ""; };
  const stamp = (iso) => (iso ? `${longDate(iso)}${String(iso).length > 10 ? `, ${String(iso).slice(11, 16)}` : ""}` : "");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const hashOf = (s) => [...String(s)].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const KIND = "arhivare";
  const KIND_C = "arhivare-candidati";
  const NAV = "arhivare";
  const NAV_C = "arhivare-candidati";
  const TITLE = "Politici de arhivare și păstrare";
  const STORE_KEY = "e-permits-arhivare-v1";
  /* AC texts, word for word */
  const T = {
    denied: "Nu ai acces la această secțiune.",
    forbidden: "Acces interzis",
    noMatch: "Nicio înregistrare nu corespunde criteriului de căutare.",
    required: "Câmp obligatoriu.",
    intGt0: "Introdu un număr întreg mai mare ca zero.",
    duplicate: "Există deja o politică pentru acest domeniu de aplicare.",
    saved: "Politica a fost salvată.",
    deactivate: "Politica inactivă nu se mai aplică la evaluările următoare, iar dosarele ei urmează politica de nivel superior. Continui?",
    activate: "Politica se aplică din nou la evaluările următoare. Continui?",
    failed: "Operația nu a putut fi efectuată",
    archived: "Dosarul a fost arhivat.",
    restored: "Dosarul a fost restaurat.",
    objRestored: "Obiectul a fost restaurat.",
    noObjects: "Dosarul nu are obiecte arhivate.",
    noCandidates: "Nu există candidați la nimicire."
  };
  const OBJECT_TYPES = ["Cerere", "Notă de plată", "Act permisiv", "Document justificativ"];
  const SOURCES = ["Solicitant", "SIA GEAP", "Extern"];
  const UNITS = { zile: ["zi", "zile", "Zile"], luni: ["lună", "luni", "Luni"], ani: ["an", "ani", "Ani"] };
  const EVENTS = {
    finalizat: "Data trecerii în statutul «Dosar finalizat»",
    radiat: "Data marcajului «Dosar radiat»",
    activitate: "Data ultimei activități"
  };
  const ACTIONS = ["Nimicire", "Anonimizare"];
  const CAND_STATES = ["Anunțat", "Confirmat", "Respins", "Restaurat", "Executat"];
  const CAND_TONE = { "Anunțat": "warning", "Confirmat": "danger", "Respins": "brand", "Restaurat": "success", "Executat": "neutral" };
  const STARE_TONE = { Activ: "success", Arhivat: "neutral", Nimicit: "danger" };
  const LEVEL_RANK = { "Platformă": 0, "Autoritate": 1, "Serviciu": 2 };
  const DEFAULT_RESTORE = { n: 90, u: "zile" };

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("arhivare") || "").split(",").map((s) => s.trim()).filter(Boolean));
  const grantedTo = (roleId) => roleId === "central-admin" || (roleId === "local-admin" && demo.has("acordat"));
  function who() {
    const a = A().currentAssignment?.() || {};
    return { roleId: a.roleId || "", has: grantedTo(a.roleId), name: A().currentUserName?.() || "Anastasia Cojocaru", role: a.roleLabel || "Administrator central" };
  }
  /* the register rights „Arhivează” / „Restaurează” (Feature 94523, per role — demo: Administrator central + Supervizor) */
  const RIGHT_ROLES = ["central-admin", "supervisor"];
  const canArchive = () => RIGHT_ROLES.includes(G().persona?.().roleId) && !demo.has("fara-arhiveaza");
  const canRestore = () => RIGHT_ROLES.includes(G().persona?.().roleId) && !demo.has("fara-restaureaza");
  const audit = (type, detail, objectType, objectId, status = "Reușit") => {
    const me = who();
    window.GEAPEventTimeline?.log?.({ at: nowIso(), user: me.name, role: me.role, type, status, detail }, { module: objectType === "Dosar" ? "BackOffice" : "AdminPortal", objectType, objectId });
  };

  /* ---------------------------------------------------------------- data + store */
  const S = { data: null, loading: null, store: null };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = fetch("data/arhivare.json?v=arh-v1", { cache: "no-store" }).then((r) => r.json()).then((json) => {
        S.data = json;
        readStore();
        return json;
      }).catch((error) => { console.warn(error); S.loading = null; return null; });
    }
    return S.loading;
  }
  function readStore() {
    if (S.store) return S.store;
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null"); } catch { saved = null; }
    const d = S.data || {};
    S.store = Object.assign({
      policies: demo.has("gol") ? [] : clone(d.policies || []),
      candidates: demo.has("fara-candidati") ? [] : clone(d.candidates || []),
      dossiers: {},
      objects: {},
      saved: clone(d.savedSearches || []),
      seq: 0
    }, saved || {});
    return S.store;
  }
  const writeStore = () => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(S.store)); } catch { /* private mode */ } };
  const policies = () => (S.data ? readStore().policies : []);
  const candidates = () => (S.data ? readStore().candidates : []);
  const policyOf = (id) => policies().find((p) => p.id === id) || null;
  const authorities = () => S.data?.authorities || [];
  const services = () => S.data?.services || [];
  const autName = (code) => authorities().find((a) => a.code === code)?.name || code || "";
  const svcOf = (code) => services().find((s) => s.code === code) || null;
  const svcByName = (name) => services().find((s) => s.name === name) || null;

  /* ---------------------------------------------------------------- labels */
  const durText = (d) => (d && d.n ? plural(Number(d.n), UNITS[d.u]?.[0] || d.u, UNITS[d.u]?.[1] || d.u) : "");
  function addDur(iso, d) {
    const x = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    const n = Number(d?.n) || 0;
    if (d?.u === "ani") x.setFullYear(x.getFullYear() + n);
    else if (d?.u === "luni") x.setMonth(x.getMonth() + n);
    else x.setDate(x.getDate() + n);
    return isoOf(x).slice(0, 10);
  }
  const levelOf = (p) => (!p.autoritate ? "Platformă" : !p.serviciu ? "Autoritate" : "Serviciu");
  const scopeShort = (p) => (!p.autoritate ? "Platformă" : !p.serviciu ? p.autoritate : svcOf(p.serviciu)?.name || p.serviciu);
  const tipLabel = (p) => p.tipObiect || "Dosar întreg";
  const policyRef = (p) => (p ? `${p.id} · ${scopeShort(p)} · ${tipLabel(p)}` : "—");
  const isPlatformWhole = (p) => !p.autoritate && !p.tipObiect;
  const sameScope = (a, b) => (a.autoritate || null) === (b.autoritate || null) && (a.serviciu || null) === (b.serviciu || null) && (a.tipObiect || null) === (b.tipObiect || null) && (a.sursa || null) === (b.sursa || null);

  /* the most specific active policy (US-396 assumptions): service → authority → platform; for an object the object policy
     of each level first (with its source before „any source”), then the dossier's own policy */
  function resolve({ authority = "ANSP", serviceName = "", tipObiect = null, sursa = null } = {}) {
    const active = policies().filter((p) => p.stare === "Activ");
    const code = svcByName(serviceName)?.code;
    const levels = [(p) => code && p.serviciu === code, (p) => p.autoritate === authority && !p.serviciu, (p) => !p.autoritate];
    for (const level of levels) {
      const here = active.filter(level).filter((p) => (p.tipObiect || null) === (tipObiect || null));
      if (tipObiect) {
        const own = here.find((p) => p.sursa && p.sursa === sursa) || here.find((p) => !p.sursa);
        if (own) return own;
      } else if (here[0]) return here[0];
    }
    return tipObiect ? resolve({ authority, serviceName }) : null;
  }
  /* the value a blank field takes (US-396 AC-10/11): the next policy up the chain for the same object type, then the
     dossier's policies of the levels above; else the default */
  function inherited(v, key, excludeId = null) {
    const level = !v.autoritate ? 0 : !v.serviciu ? 1 : 2;
    const act = policies().filter((p) => p.stare === "Activ" && p.id !== excludeId);
    const at = (lv) => (p) => (lv === 0 ? !p.autoritate : lv === 1 ? p.autoritate === v.autoritate && !p.serviciu : p.serviciu === v.serviciu);
    const chain = [];
    if (v.tipObiect) {
      for (let lv = level; lv >= 0; lv -= 1) {
        /* same level: only the „any source” policy of the type is above a policy with a source */
        chain.push(...act.filter((p) => at(lv)(p) && p.tipObiect === v.tipObiect && (lv < level ? !p.sursa || p.sursa === v.sursa : Boolean(v.sursa) && !p.sursa)));
      }
    }
    for (let lv = v.tipObiect ? level : level - 1; lv >= 0; lv -= 1) chain.push(...act.filter((p) => at(lv)(p) && !p.tipObiect));
    const from = chain.find((p) => p[key] !== null && p[key] !== undefined);
    return from ? { value: from[key], from } : { value: key === "restaurare" ? DEFAULT_RESTORE : true, from: null };
  }

  /* ---------------------------------------------------------------- the policies registry (US-395) */
  const COLS = [
    ["nivel", "Nivel", 120], ["autoritate", "Autoritate", 128], ["serviciu", "Serviciu", 248], ["tip", "Tip obiect", 168],
    ["sursa", "Sursa obiectului", 152], ["arhivare", "Arhivare după", 136], ["eveniment", "Eveniment de pornire", 248],
    ["pastrare", "Păstrare în arhivă", 152], ["actiune", "Acțiune la expirarea păstrării", 200], ["anunt", "Anunț înainte de nimicire", 192],
    ["aprobare", "Necesită aprobare", 152], ["stare", "Stare", 112], ["modificat", "Modificat de / Modificat la", 216]
  ];
  const rowOf = (p) => ({
    id: p.id, p,
    nivel: levelOf(p),
    autoritate: p.autoritate ? autName(p.autoritate) : "",
    serviciu: p.serviciu ? svcOf(p.serviciu)?.name || p.serviciu : "",
    tip: tipLabel(p),
    sursa: p.tipObiect ? p.sursa || "Orice sursă" : "",
    arhivare: durText(p.arhivare),
    eveniment: EVENTS[p.eveniment] || "",
    pastrare: p.pastrare ? durText(p.pastrare) : "Nelimitat",
    actiune: p.pastrare ? p.actiune || "" : "",
    anunt: p.pastrare ? durText(p.anunt) : "",
    aprobare: p.pastrare ? (p.aprobare === false ? "Nu" : "Da") : "",
    stare: p.stare,
    modificat: p.modificatLa
  });
  const tabsOf = (active) => [
    { id: "politici", label: "Politici", filter: "tab:pol", count: false },
    { id: "candidati", label: "Candidați la nimicire", filter: "tab:cand", count: false }
  ].map((t) => ({ ...t, active: t.id === active }));
  function registryDb() {
    if (!S.data) load().then(() => refreshList(KIND));
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: COLS.length,
      pageSizes: [25, 50, 100],
      defaultSort: "nivel",
      defaultSortDirection: "asc",
      columns: {
        ...Object.fromEntries(COLS.map(([key, label, width]) => [key, { label, width, sortable: true }])),
        actiuni: { label: "", width: 56, pin: "end" }
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după autoritate sau serviciu",
          columns: [...COLS.map(([key]) => key), ...(me.has ? ["actiuni"] : [])],
          tabs: tabsOf("politici"),
          defaultTab: "politici",
          primaryAction: me.has ? { id: "arh-new", label: "Adaugă politică" } : null,
          toolbarLabel: "Filtrare politici",
          exportLabel: "Exportă"
        }
      },
      runtimeRows: S.data && me.has ? policies().map(rowOf) : []
    };
  }
  const policyMenu = (p) => {
    const items = [{ label: "Editează", icon: "edit", attrs: `data-arh-edit="${esc(p.id)}"` }];
    /* US-398 AC-03/04/11: Dezactivează on active policies except the platform whole-dossier one; Activează on inactive ones */
    if (p.stare === "Activ" && !isPlatformWhole(p)) items.push({ label: "Dezactivează", icon: "circle-x", danger: true, attrs: `data-arh-toggle="${esc(p.id)}"` });
    if (p.stare !== "Activ") items.push({ label: "Activează", icon: "rotate-arrow", attrs: `data-arh-toggle="${esc(p.id)}"` });
    const html = A().renderRowActions?.({ menu: items, label: policyRef(p) }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  };
  const cellText = (text) => (text ? `<span data-cell-tooltip="${esc(text)}">${esc(text)}</span>` : dash);
  const POLICY_TEXT = (row, key) => (key === "modificat" ? `${row.p.modificatDe} ${longDate(row.modificat)}` : String(row[key] ?? ""));
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "nivel", label: "Nivel", get: (row) => row.nivel },
        { key: "tip", label: "Tip obiect", get: (row) => row.tip },
        { key: "stare", label: "Stare", get: (row) => row.stare }
      ];
    },
    /* AC-09: the authority or service name (case + diacritics insensitive) */
    searchText: (row) => { const raw = [row.autoritate, row.serviciu, row.p.autoritate].join(" "); return `${raw} ${fold(raw)}`; },
    /* AC-08: Nivel, then Autoritate, then Serviciu */
    sortValue: (row, key) => (key === "nivel" ? `${LEVEL_RANK[row.nivel]}|${row.autoritate}|${row.serviciu}|${row.p.tipObiect ? 1 : 0}${row.tip}|${row.sursa}`
      : key === "modificat" ? row.modificat || ""
      : key === "arhivare" || key === "pastrare" || key === "anunt" ? String(daysOf(key === "arhivare" ? row.p.arhivare : key === "pastrare" ? row.p.pastrare : row.p.anunt) ?? 999999).padStart(7, "0")
      : String(row[key] ?? "")),
    filterToken: (row, token) => token !== "tab:cand",
    renderCell: (row, key) => {
      const p = row.p;
      switch (key) {
        case "actiuni": return policyMenu(p);
        case "stare": return tag(p.stare, p.stare === "Activ" ? "success" : "neutral");
        case "modificat": return A().renderDateTime?.(p.modificatLa, p.modificatDe) || esc(stamp(p.modificatLa));
        case "pastrare": return p.pastrare ? esc(row.pastrare) : `<span class="e-permits-arh-muted">Nelimitat</span>`;
        /* the authority's code, its full name in the tooltip (as the acts register) */
        case "autoritate": return p.autoritate ? `<span data-tooltip-text="${esc(row.autoritate)}">${esc(p.autoritate)}</span>` : dash;
        default: return cellText(row[key]);
      }
    },
    openRow: (id) => openDrawer("edit", id),
    rowLabel: (row) => `${policyRef(row.p)} — deschide politica pentru editare`,
    rowClass: (row) => (row.stare === "Activ" ? "" : "is-inactive"),
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: T.denied, text: "Ecranul este disponibil utilizatorilor cu permisiunea de gestionare a politicilor de arhivare și păstrare.", icon: "lock" });
      if (!S.data) return E()?.render({ title: "Se încarcă politicile…", loading: true });
      if (query || filtered) return E()?.noResults?.(T.noMatch, { text: "Caută după autoritate sau serviciu ori schimbă filtrele.", actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: "Nu există politici de arhivare și păstrare.", text: "Adaugă politica de nivel Platformă pentru dosarul întreg: ea se aplică tuturor autorităților.", icon: "page-text-lock", actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="arh-new">Adaugă politică</button>' });
    },
    exportRows: (rows) => exportPolicies(rows),
    exportState: () => (who().has && S.data ? {} : { hidden: true })
  };
  const daysOf = (d) => (d && d.n ? Number(d.n) * (d.u === "ani" ? 365 : d.u === "luni" ? 30 : 1) : null);

  /* US-395 AC-13 / AC-15: CSV of every policy search + filters show; the export is logged */
  function exportPolicies(rows) {
    const me = who();
    if (!me.has) { A().showShellToast?.(T.forbidden, "error"); return; }
    if (!rows.length) return;
    const name = window.GEAPObjectId?.exportName?.("PoliticiArhivare", "csv") || "PoliticiArhivare.csv";
    A().exportCsv?.(name, COLS.map(([, label]) => label), rows.map((row) => COLS.map(([key]) => (key === "modificat" ? `${row.p.modificatDe} · ${stamp(row.modificat)}` : row[key] || ""))));
    const st = A().workplaceState || {};
    const crit = [st.query ? `căutare „${st.query}”` : "", ...Object.entries(A().registryFilters?.(KIND) || {}).filter(([, v]) => v?.length).map(([k, v]) => `${k}: ${v.join(", ")}`)].filter(Boolean).join(" · ") || "fără criterii";
    audit("Export", `Lista politicilor de arhivare și păstrare · ${crit} · ${plural(rows.length, "rând", "rânduri")} · CSV`, "Politică de arhivare", "lista");
    A().showShellToast?.(`Am exportat ${plural(rows.length, "politică", "politici")} în ${name}.`, "success");
  }

  /* ---------------------------------------------------------------- the candidates registry (US-405 · US-407) */
  const caseRowsAll = () => (G().rowsOf?.("reg-dosare") || []);
  const extraOf = (id) => (S.data?.extraDossiers || []).find((d) => d.id === id) || null;
  function candRow(c) {
    const ex = extraOf(c.dosar);
    const base = ex || {};
    const dosRow = !ex ? caseRowsAll().find((r) => r.id === c.dosar) : null;
    const p = policyOf(c.politica);
    return {
      id: c.id, c, p,
      dosar: c.dosar,
      tip: c.tipObiect || "Dosar întreg",
      serviciu: base.serviciu || dosRow?.serviciu || "",
      subdiviziune: base.subdiviziune || dosRow?.subdivision || "",
      autoritate: "ANSP",
      arhivat: base.arhivat?.at || recOf(c.dosar)?.arhivat?.at || "",
      politica: policyRef(p),
      actiune: c.actiune,
      planificat: c.planificat,
      stare: c.stare,
      decis: c.decisLa || "",
      aprobare: p ? p.aprobare !== false : true
    };
  }
  const C_COLS = [
    ["dosar", "Nr. dosar", 168], ["tip", "Tip obiect", 176], ["serviciu", "Serviciu", 232], ["subdiviziune", "Autoritate / Subdiviziune", 200],
    ["arhivat", "Data arhivării", 168], ["politica", "Politica aplicată", 224], ["actiune", "Acțiune la expirarea păstrării", 200],
    ["planificat", "Data planificată", 176], ["stare", "Starea candidatului", 184], ["decis", "Decis de / Decis la", 200]
  ];
  const selectable = (row) => row.stare === "Anunțat" && row.aprobare;
  function candidatesDb() {
    if (!S.data) load().then(() => refreshList(KIND_C));
    const me = who();
    return {
      kind: KIND_C,
      fixedWidths: true,
      fieldCount: C_COLS.length,
      pageSizes: [25, 50, 100],
      defaultSort: "stare",
      defaultSortDirection: "asc",
      columns: {
        ...Object.fromEntries(C_COLS.map(([key, label, width]) => [key, { label, width, sortable: true }])),
        actiuni: { label: "", width: 56, pin: "end" }
      },
      views: {
        [KIND_C]: {
          title: TITLE,
          selectable: me.has,
          searchPlaceholder: "Caută după nr. dosar sau serviciu",
          columns: [...C_COLS.map(([key]) => key), ...(me.has ? ["actiuni"] : [])],
          tabs: tabsOf("candidati"),
          defaultTab: "candidati",
          toolbarLabel: "Filtrare candidați la nimicire"
        }
      },
      runtimeRows: S.data && me.has ? candidates().map(candRow) : []
    };
  }
  const candMenu = (row) => {
    if (!selectable(row)) return "";
    const html = A().renderRowActions?.({ menu: [
      { label: "Șterge", icon: "delete", danger: true, attrs: `data-arh-cand-confirm="${esc(row.id)}"` },
      { label: "Respinge", icon: "circle-x", attrs: `data-arh-cand-reject="${esc(row.id)}"` }
    ], label: `${row.dosar} ${row.tip}` }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  };
  const daysTo = (iso) => { const a = new Date(`${S.data?.today || nowIso().slice(0, 10)}T12:00:00`); const b = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Math.round((b - a) / 86400000); };
  window.GEAPShellRegistries[KIND_C] = {
    build: candidatesDb,
    get facets() {
      return [
        { key: "stare", label: "Starea candidatului", get: (row) => row.stare },
        { key: "actiune", label: "Acțiune la expirarea păstrării", get: (row) => row.actiune },
        { key: "tip", label: "Tip obiect", get: (row) => row.tip }
      ];
    },
    searchText: (row) => { const raw = [row.dosar, row.serviciu, row.subdiviziune].join(" "); return `${raw} ${fold(raw)}`; },
    /* default: Anunțat first (the ones waiting for a decision), then by the planned date */
    sortValue: (row, key) => (key === "stare" ? `${CAND_STATES.indexOf(row.stare)}|${row.planificat}` : String(row[key] ?? "")),
    filterToken: (row, token) => token !== "tab:pol",
    rowSelectable: (row) => selectable(row),
    /* arh-lockbox-v1: why the row's checkbox is disabled (shell rowLockedBox) */
    rowSelectReason: (row) => (row.stare === "Anunțat" && !row.aprobare ? "Se nimicește automat, fără aprobare."
      : ({ Confirmat: "Înregistrarea este deja confirmată pentru nimicire.", Respins: "Nimicirea a fost respinsă.", Executat: "Înregistrarea a fost deja nimicită.", Restaurat: "Înregistrarea a fost restaurată." })[row.stare] || ""),
    renderCell: (row, key) => {
      switch (key) {
        case "actiuni": return candMenu(row);
        case "dosar": return A().renderListCode?.(row.dosar) || esc(row.dosar);
        case "subdiviziune": return `<div class="e-permits-workplace__case-cell"><span data-cell-tooltip="${esc(row.subdiviziune)}">${esc(row.subdiviziune)}</span><span class="e-permits-workplace__source"><span>${esc(row.autoritate)}</span></span></div>`;
        case "arhivat": return row.arhivat ? A().renderDateTime?.(row.arhivat) || esc(stamp(row.arhivat)) : dash;
        case "planificat": {
          const n = daysTo(row.planificat);
          const meta = ["Executat", "Respins", "Restaurat"].includes(row.stare) ? "" : n < 0 ? "dată depășită" : n === 0 ? "azi" : `în ${plural(n, "zi", "zile")}`;
          return `<span class="e-permits-workplace__date-stack"><span>${esc(longDate(row.planificat))}</span>${meta ? `<span class="e-permits-workplace__date-meta">${esc(meta)}</span>` : ""}</span>`;
        }
        case "stare": return `<span class="e-permits-workplace__date-stack"><span>${tag(row.stare, CAND_TONE[row.stare])}</span>${row.stare === "Anunțat" && !row.aprobare ? '<span class="e-permits-workplace__date-meta">Fără aprobare</span>' : ""}</span>`;
        case "decis": return row.c.decisLa ? A().renderDateTime?.(row.c.decisLa, row.c.decisDe) || esc(stamp(row.c.decisLa)) : dash;
        default: return cellText(row[key]);
      }
    },
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: T.denied, text: "Tabul este disponibil utilizatorilor cu permisiunea de gestionare a politicilor de arhivare și păstrare.", icon: "lock" });
      if (!S.data) return E()?.render({ title: "Se încarcă candidații…", loading: true });
      if (query || filtered) return E()?.noResults?.(T.noMatch, { text: "Caută după numărul dosarului sau serviciu ori schimbă filtrele.", actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: T.noCandidates, text: "Procedura automată «Nimicirea înregistrărilor arhivate» anunță zilnic înregistrările al căror termen de păstrare a expirat.", icon: "checkmark-large" });
    },
    exportState: () => ({ hidden: true })
  };

  const listEl = (kind) => document.querySelector(`[data-workplace][data-registry-kind="${kind}"]`);
  const listOpen = (kind) => { const reg = listEl(kind); return Boolean(reg && !reg.hidden && !reg.closest("[hidden]")); };
  function refreshList(kind) {
    const st = A().workplaceState;
    if (!listOpen(kind) || !st) return;
    st.rows = (kind === KIND ? registryDb() : candidatesDb()).runtimeRows;
    const ids = new Set(st.rows.filter((r) => kind !== KIND_C || selectable(r)).map((r) => r.id));
    [...st.selected].forEach((id) => { if (!ids.has(id)) st.selected.delete(id); });
    A().renderWorkplace?.();
    syncChrome();
  }

  /* ---------------------------------------------------------------- tabs = two registries; selection bar */
  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.("[data-workplace-tab]");
    const reg = document.querySelector("[data-workplace]");
    if (!tab || !reg) return;
    const kind = reg.dataset.registryKind;
    const target = kind === KIND && tab.dataset.workplaceTab === "candidati" ? NAV_C : kind === KIND_C && tab.dataset.workplaceTab === "politici" ? NAV : "";
    if (!target) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    document.querySelector(`[data-nav-item][data-nav-id="${target}"]`)?.click();
    A().setActiveNav?.(NAV);
    requestAnimationFrame(() => document.querySelector(`[data-workplace-tab="${target === NAV ? "politici" : "candidati"}"]`)?.focus());
  }, true);
  const visibleRows = () => A().getVisibleRows?.() || [];
  const selectedRows = () => { const sel = A().workplaceState?.selected || new Set(); return visibleRows().filter((r) => sel.has(r.id) && selectable(r)); };
  function ensureChrome() {
    const reg = document.querySelector("[data-workplace]");
    const toolbar = reg?.querySelector("[data-workplace-toolbar]");
    if (toolbar && !reg.querySelector("[data-arh-selection]") && window.GEAPSelectionBar) {
      toolbar.insertAdjacentHTML("afterend", window.GEAPSelectionBar.html({
        label: "Candidați selectați",
        actionsHtml: `<button class="btn btn-neutral btn-sm" type="button" data-arh-bulk="reject">${icon("circle-x", 16)}<span>Respinge</span></button>
          <button class="btn btn-destructive btn-sm" type="button" data-arh-bulk="confirm">${icon("delete", 16)}<span>Șterge</span></button>`
      }).replace("data-selection-bar>", "data-selection-bar data-arh-selection>"));
    }
  }
  function syncChrome() {
    ensureChrome();
    const reg = document.querySelector("[data-workplace]");
    const bar = reg?.querySelector("[data-arh-selection]");
    const on = reg?.dataset.registryKind === KIND_C && who().has;
    const n = on ? selectedRows().length : 0;
    window.GEAPSelectionBar?.set(bar, { count: n, text: n === 1 ? "1 candidat selectat" : plural(n, "candidat selectat", "candidați selectați") });
    syncSavedChrome();
  }
  let chromeQueued = false;
  const queueChrome = () => { if (chromeQueued) return; chromeQueued = true; requestAnimationFrame(() => { chromeQueued = false; syncChrome(); }); };
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.arhObserved) return;
    reg.dataset.arhObserved = "1";
    new MutationObserver(() => {
      const k = reg.dataset.registryKind;
      if (k === KIND || k === KIND_C) load().then(() => { if (!A().workplaceState?.rows?.length && who().has && (k === KIND ? policies() : candidates()).length) refreshList(k); else queueChrome(); });
      else queueChrome();
    }).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind", "hidden"] });
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => queueChrome()).observe(tbody, { childList: true });
  };
  document.addEventListener("change", (event) => {
    if (event.target.closest?.("[data-workplace-select-row], [data-workplace-select-all]") && listOpen(KIND_C)) queueChrome();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !listOpen(KIND_C) || !selectedRows().length) return;
    if (document.querySelector(".modal-overlay.is-active, .drawer-overlay:not([hidden]), [data-stack-menu]:not([hidden])")) return;
    clearSelection();
  });
  function clearSelection() {
    A().workplaceState?.selected.clear();
    A().renderWorkplace?.();
    syncChrome();
    document.querySelector("[data-workplace-select-all]")?.focus();
  }

  /* ---------------------------------------------------------------- candidates: confirm / reject (US-407) */
  const openModal = (o) => G().openModal?.(o);
  const closeModal = () => G().closeModal?.();
  let pendingCand = null;
  function candSummary(rows) {
    return `<ul class="e-permits-arh-list" role="list">${rows.map((r) => `<li class="e-permits-arh-list__item"><span class="e-permits-arh-list__main">${esc(r.dosar)} · ${esc(r.tip)}</span><span class="e-permits-arh-list__meta">${esc(`${r.actiune} · ${longDate(r.planificat)}`)}</span></li>`).join("")}</ul>`;
  }
  function askCandidates(kind, ids) {
    if (!who().has) { A().showShellToast?.(T.forbidden, "error"); return; }
    const rows = candidates().map(candRow).filter((r) => ids.includes(r.id) && selectable(r));
    if (!rows.length) return;
    pendingCand = { kind, ids: rows.map((r) => r.id) };
    const n = rows.length;
    if (kind === "confirm") {
      openModal({
        kind: "confirm",
        title: `Confirmi nimicirea a ${n} ${n === 1 ? "înregistrare" : n >= 20 ? "de înregistrări" : "înregistrări"}? Acțiunea nu se poate anula.`,
        body: `${candSummary(rows)}
          ${A().renderInfoNote?.("La data planificată procedura automată nimicește sau anonimizează înregistrările, după „Acțiune la expirarea păstrării”. Actul permisiv nu se nimicește.") || ""}`,
        footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-destructive btn-rounded" type="button" data-arh-confirm="cand-confirm">Șterge</button></div>`
      });
      return;
    }
    openModal({
      kind: "confirm",
      title: n === 1 ? "Respingi nimicirea?" : `Respingi nimicirea a ${plural(n, "înregistrare", "înregistrări")}?`,
      body: `<p class="e-permits-passport__lead">Înregistrările respinse nu se nimicesc la data planificată. Se pot anunța din nou la o evaluare următoare.</p>
        ${candSummary(rows)}
        ${reasonHtml("arh-reject-reason", "Motivul respingerii", "De ex. dosarul este invocat într-o contestație în curs")}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-arh-confirm="cand-reject">Respinge</button></div>`
    });
  }
  function decideCandidates(kind) {
    if (!pendingCand) return;
    let reason = "";
    if (kind === "reject") { reason = requireReason("arh-reject-reason"); if (reason === null) return; }
    if (demo.has("eroare")) { closeModal(); A().showShellToast?.(T.failed, "error"); return; }
    const me = who();
    const at = nowIso();
    const list = candidates().filter((c) => pendingCand.ids.includes(c.id));
    list.forEach((c) => Object.assign(c, { stare: kind === "confirm" ? "Confirmat" : "Respins", decisDe: me.name, decisLa: at, ...(reason ? { motiv: reason } : {}) }));
    writeStore();
    audit(kind === "confirm" ? "Confirmare nimicire" : "Respingere nimicire", `${kind === "confirm" ? "Confirmat" : "Respins"} · ${plural(list.length, "candidat", "candidați")}: ${list.map((c) => `${c.dosar}${c.tipObiect ? ` (${c.tipObiect})` : ""}`).join(", ")}${reason ? ` · Motiv: ${reason}` : ""}`, "Candidat la nimicire", list.map((c) => c.id).join(","));
    pendingCand = null;
    closeModal();
    A().workplaceState?.selected.clear();
    refreshList(KIND_C);
    A().showShellToast?.(kind === "confirm" ? `${list.length === 1 ? "Candidatul a fost confirmat" : `${plural(list.length, "candidat a fost confirmat", "candidați au fost confirmați")}`} pentru nimicire.` : `${list.length === 1 ? "Candidatul a fost respins" : `${plural(list.length, "candidat a fost respins", "candidați au fost respinși")}`}.`, "success");
  }

  /* ---------------------------------------------------------------- shared form pieces (the BO drawer form vocabulary) */
  const req = () => A().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const hintHtml = (id, msg) => (msg ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(msg)}</p>` : "");
  const optionsHtml = (options, value, placeholder = "") => `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
  function reasonHtml(id, label, placeholder) {
    return `
      <div class="e-permits-fo-field e-permits-arh-reason" data-arh-reason-field="${id}">
        <div class="e-permits-fo-field__label-counter"><label for="${id}">${esc(label)}${req()}</label><span class="e-permits-fo-field__counter" data-arh-counter="${id}">0 / 500</span></div>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" maxlength="500" placeholder="${esc(placeholder)}" aria-required="true" data-arh-reason></textarea></div>
      </div>`;
  }
  /* AC „lipsa lui afișează «Câmp obligatoriu.» sub câmp” */
  function requireReason(id) {
    const field = document.getElementById(id);
    const wrap = field?.closest("[data-arh-reason-field]");
    const value = field?.value.trim() || "";
    wrap?.querySelector(".e-permits-fo-field__error")?.remove();
    field?.closest(".e-permits-fo-textarea")?.classList.toggle("is-error", !value);
    if (value) { field.removeAttribute("aria-invalid"); return value; }
    field?.setAttribute("aria-invalid", "true");
    field?.setAttribute("aria-describedby", `${id}-error`);
    wrap?.insertAdjacentHTML("beforeend", errorHtml(id, T.required));
    field?.focus();
    return null;
  }
  document.addEventListener("input", (event) => {
    const area = event.target.closest?.("[data-arh-reason]");
    if (!area) return;
    const counter = document.querySelector(`[data-arh-counter="${area.id}"]`);
    if (counter) counter.textContent = `${area.value.length} / 500`;
    if (area.value.trim()) {
      area.closest(".e-permits-fo-textarea")?.classList.remove("is-error");
      area.removeAttribute("aria-invalid");
      area.closest("[data-arh-reason-field]")?.querySelector(".e-permits-fo-field__error")?.remove();
    }
  });

  /* ---------------------------------------------------------------- policy drawer (US-396 · US-397) */
  let drawer = null;
  let D = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="drawer-overlay" data-arh-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-arh-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="arh-d-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="arh-d-title" data-arh-d-title></h2>
              <p class="drawer__subtitle" data-arh-d-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-arh-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-arh-d-body></div>
          <footer class="drawer__footer"><div class="modal-buttons">
            <button class="btn btn-neutral btn-rounded" type="button" data-arh-close>Anulează</button>
            <button class="btn btn-primary btn-rounded" type="button" data-arh-save>Salvează</button>
          </div></footer>
        </aside>
      </div>`);
    drawer = document.querySelector("[data-arh-drawer]");
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    drawer.addEventListener("click", onDrawerClick);
    return drawer;
  }
  const emptyDraft = () => ({ autoritate: "", serviciu: "", tipObiect: "", sursa: "", arhN: "", arhU: "zile", eveniment: "", restN: "", restU: "zile", redare: null, pastN: "", pastU: "ani", actiune: "", anuntN: "", anuntU: "zile", aprobare: true });
  const draftOf = (p) => ({
    autoritate: p.autoritate || "", serviciu: p.serviciu || "", tipObiect: p.tipObiect || "", sursa: p.sursa || "",
    arhN: String(p.arhivare?.n ?? ""), arhU: p.arhivare?.u || "zile", eveniment: p.eveniment || "",
    restN: String(p.restaurare?.n ?? ""), restU: p.restaurare?.u || "zile", redare: p.redare ?? null,
    pastN: String(p.pastrare?.n ?? ""), pastU: p.pastrare?.u || "ani", actiune: p.actiune || "", anuntN: String(p.anunt?.n ?? ""), anuntU: p.anunt?.u || "zile",
    aprobare: p.aprobare !== false
  });
  const actPermis = (v) => v.tipObiect === "Act permisiv";
  const hasRetention = (v) => !actPermis(v) && String(v.pastN).trim() !== "";
  function openDrawer(mode, id = null) {
    if (!who().has) { A().showShellToast?.(T.forbidden, "error"); return; } /* US-396 AC-02 · US-397 AC-02 */
    const p = id ? policyOf(id) : null;
    if (mode === "edit" && !p) return;
    ensureDrawer();
    D = { mode, id, v: p ? draftOf(p) : emptyDraft(), errors: {}, dup: false, error: false };
    D.initial = JSON.stringify(D.v);
    renderDrawer();
    drawer.querySelector("[data-arh-d-body]").scrollTop = 0;
    A().writeHash?.(mode === "edit" ? `#${NAV}/${p.id}` : `#${NAV}/nou`);
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(drawer, { focus: drawer.querySelector(".drawer") }); else drawer.hidden = false;
  }
  const dirty = () => Boolean(D && JSON.stringify(D.v) !== D.initial);
  function closeDrawer(force = false) {
    if (!drawer || drawer.hidden) return;
    const done = () => { D = null; if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer); else drawer.hidden = true; A().restorePageHash?.(); };
    if (!force && dirty()) {
      A().askConfirm?.({ title: "Renunți la modificări?", text: D.mode === "create" ? "Politica nu se salvează." : "Politica rămâne cu valorile salvate anterior.", confirmLabel: "Renunță la modificări", destructive: true, cancelLabel: "Continuă editarea" }, done);
      return;
    }
    done();
  }
  const levelOfDraft = (v) => (!v.autoritate ? "Platformă" : !v.serviciu ? "Autoritate" : "Serviciu");
  const field = (span, inner) => `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">${inner}</div>`;
  const roField = (label, value, span = 6, valueHtml = "") => field(span, `<span class="e-permits-cfg-ro__label">${esc(label)}</span><div class="e-permits-cfg-ro">${valueHtml || esc(value || "—")}</div>`);
  function selectField(key, label, options, value, { placeholder = "", required = false, disabled = false, hint = "", span = 6 } = {}) {
    const id = `arh-f-${key}`;
    const err = D.errors[key];
    return field(span, `
      <label for="${id}">${esc(label)}${required ? req() : ""}</label>
      ${A().renderFoSelectControl?.({ id, attrs: `data-arh-field="${key}"`, optionsHtml: optionsHtml(options, value, placeholder), error: Boolean(err), disabled }) || ""}
      ${err ? errorHtml(id, err) : hintHtml(id, hint)}`);
  }
  /* a duration = number + unit in ONE border (the value group with a trailing unit, Reguli de dată) */
  function durationField(key, label, { required = false, disabled = false, hint = "", placeholder = "" } = {}) {
    const id = `arh-f-${key}`;
    const err = D.errors[key];
    const n = D.v[`${key}N`];
    const u = D.v[`${key}U`];
    const describedBy = err ? `${id}-error` : hint ? `${id}-hint` : "";
    return field(6, `
      <label for="${id}">${esc(label)}${required ? req() : ""}</label>
      <div class="e-permits-doc-val e-permits-arh-dur${err ? " is-error" : ""}${disabled ? " is-disabled" : ""}">
        <div class="e-permits-doc-val__control"><input id="${id}" class="e-permits-doc-val__input" type="text" inputmode="numeric" autocomplete="off" maxlength="4" value="${esc(disabled ? "" : n)}" placeholder="${esc(placeholder)}"${required ? ' aria-required="true"' : ""}${err ? ' aria-invalid="true"' : ""}${describedBy ? ` aria-describedby="${describedBy}"` : ""}${disabled ? " disabled" : ""} data-arh-field="${key}N"></div>
        <div class="e-permits-doc-val__mode e-permits-doc-val__mode--end">${A().renderFoSelectControl?.({ id: `${id}-unit`, attrs: `data-arh-field="${key}U"`, optionsHtml: optionsHtml(Object.entries(UNITS).map(([k, l]) => [k, l[2]]), u), disabled, label: `${label}: unitatea` }) || ""}</div>
      </div>
      ${err ? errorHtml(id, err) : hintHtml(id, hint)}`);
  }
  const section = (title, content, { note = "" } = {}) => `
    <section class="e-permits-user-create__section">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${note}<div class="e-permits-user-create__grid">${content}</div></div>
    </section>`;
  function renderDrawer({ focus = "" } = {}) {
    if (!drawer || !D) return;
    const v = D.v;
    const edit = D.mode === "edit";
    const p = edit ? policyOf(D.id) : null;
    drawer.querySelector("[data-arh-d-title]").textContent = edit ? "Editează politica" : "Politică nouă";
    drawer.querySelector("[data-arh-d-subtitle]").textContent = edit ? `${levelOf(p)} · ${tipLabel(p)}` : "Se aplică evaluărilor următoare ale procedurilor de arhivare și de nimicire.";
    const svcOptions = services().filter((s) => s.authority === v.autoritate).map((s) => [s.code, s.name]);
    const scope = edit
      ? [
        roField("Nivel", levelOf(p)),
        roField("Autoritate", p.autoritate ? autName(p.autoritate) : "Toate autoritățile (Platformă)"),
        roField("Serviciu", p.serviciu ? svcOf(p.serviciu)?.name : p.autoritate ? "Toate serviciile autorității" : "—"),
        roField("Tip obiect", tipLabel(p)),
        roField("Sursa obiectului", p.tipObiect ? p.sursa || "Orice sursă" : "—")
      ].join("")
      : [
        roField("Nivel", levelOfDraft(v), 12, `${esc(levelOfDraft(v))}<span class="e-permits-arh-ro-meta">· rezultă din Autoritate și Serviciu</span>`),
        selectField("autoritate", "Autoritate", authorities().map((a) => [a.code, `${a.name} (${a.code})`]), v.autoritate, { placeholder: "Toate autoritățile (Platformă)", hint: "Gol = nivelul Platformă: politica se aplică tuturor autorităților." }),
        selectField("serviciu", "Serviciu", svcOptions, v.serviciu, { placeholder: v.autoritate ? "Toate serviciile autorității" : "Alege întâi autoritatea", disabled: !v.autoritate, hint: v.autoritate ? "Gol = toate serviciile autorității." : "" }),
        selectField("tipObiect", "Tip obiect", OBJECT_TYPES.map((t) => [t, t]), v.tipObiect, { placeholder: "Dosar întreg", hint: "Gol = dosarul întreg." }),
        selectField("sursa", "Sursa obiectului", SOURCES.map((t) => [t, t]), v.sursa, { placeholder: v.tipObiect ? "Orice sursă" : "Alege întâi tipul obiectului", disabled: !v.tipObiect, hint: v.tipObiect ? "Gol = orice sursă." : "" })
      ].join("");
    const restIn = inherited(v, "restaurare", D.id);
    const redIn = inherited(v, "redare", D.id);
    const fromText = (x) => (x.from ? `politica ${x.from.id} (${scopeShort(x.from)} · ${tipLabel(x.from)})` : "valoarea implicită");
    const redare = v.redare ?? redIn.value;
    const archive = [
      durationField("arh", "Arhivare după", { required: true, placeholder: "Ex. 30" }),
      selectField("eveniment", "Eveniment de pornire", Object.entries(EVENTS), v.eveniment, { placeholder: "Alege evenimentul", required: true, hint: "Momentul de la care curge «Arhivare după»." }),
      durationField("rest", "Durata restaurării pentru vizualizare", { placeholder: "Gol", hint: `Gol = ${durText(restIn.value)}, din ${fromText(restIn)}.` }),
      field(6, `<span class="e-permits-cfg-ro__label" id="arh-redare-label">Păstrarea redării istorice</span>
        <div class="e-permits-arh-switch">${A().renderToggle?.({ label: redare ? "Pornit" : "Oprit", description: v.redare === null ? `Preia ${redIn.value ? "Pornit" : "Oprit"} din ${fromText(redIn)}.` : "Setat pentru această politică.", checked: redare, attrs: 'data-arh-field="redare" aria-describedby="arh-redare-label"' }) || ""}</div>`)
    ].join("");
    const ap = actPermis(v);
    const ret = hasRetention(v);
    const keep = [
      durationField("past", "Păstrare în arhivă", { disabled: ap, placeholder: "Gol", hint: ap ? "" : "Se numără de la data arhivării. Gol = se păstrează nelimitat." }),
      field(6, `<span class="e-permits-cfg-ro__label" id="arh-actiune-label">Acțiune la expirarea păstrării${ret ? req() : ""}</span>
        ${A().renderChoiceChips?.({ label: "Acțiune la expirarea păstrării", labelId: "arh-actiune-label", name: "arh-actiune", options: ACTIONS.map((a) => [a, a]), value: ret ? v.actiune : "", disabledValues: ret ? [] : ACTIONS }) || ""}
        ${D.errors.actiune ? errorHtml("arh-f-actiune", D.errors.actiune) : ret ? "" : hintHtml("arh-f-actiune", ap ? "" : "Se completează după «Păstrare în arhivă».")}`),
      durationField("anunt", "Anunț înainte de nimicire", { required: ret, disabled: !ret, placeholder: ret ? "Ex. 30" : "" }),
      field(6, `<span class="e-permits-cfg-ro__label" id="arh-aprobare-label">Necesită aprobare</span>
        <div class="e-permits-arh-switch">${A().renderToggle?.({ label: ret && v.aprobare ? "Da" : "Nu", description: ret ? (v.aprobare ? "Candidații la nimicire așteaptă confirmarea din tabul «Candidați la nimicire»." : "Candidații trec direct la execuție, la data planificată.") : "Se completează doar cu «Păstrare în arhivă».", checked: ret && v.aprobare, disabled: !ret, attrs: 'data-arh-field="aprobare" aria-describedby="arh-aprobare-label"' }) || ""}</div>`)
    ].join("");
    const notices = [
      D.dup && A().renderNotice?.("error", esc(T.duplicate), { role: "alert" }),
      D.error && A().renderNotice?.("error", esc(T.failed), { role: "alert" }),
      edit && A().renderNotice?.("info", "Domeniul de aplicare nu se modifică după salvare. Modificările se aplică doar evaluărilor următoare: înregistrările deja arhivate își păstrează starea.")
    ].filter(Boolean).join("");
    drawer.querySelector("[data-arh-d-body]").innerHTML = `
      ${notices ? `<div class="e-permits-arh-notices">${notices}</div>` : ""}
      ${section("Domeniu de aplicare", scope)}
      ${section("Arhivare", archive)}
      ${section("Păstrare", keep, { note: ap ? `<div class="e-permits-arh-section-note">${A().renderInfoNote?.("Secțiunea «Păstrare» este inactivă pentru Act permisiv: actul permisiv nu se nimicește și nu se anonimizează.") || ""}</div>` : "" })}`;
    if (focus) {
      const el = drawer.querySelector(focus);
      el?.focus();
      if (el && "setSelectionRange" in el && D.caret != null) { try { el.setSelectionRange(D.caret, D.caret); } catch { /* not a text field */ } }
    }
  }
  function onDrawerInput(event) {
    const t = event.target;
    const key = t.dataset?.arhField;
    if (!key || !D || t.type === "checkbox") return;
    D.v[key] = t.value;
    D.caret = t.selectionStart;
    const base = key.replace(/N$/, "");
    const hadErr = D.errors[base] || D.errors[key];
    delete D.errors[base]; delete D.errors[key];
    /* AC-08 (US-397): clearing „Păstrare în arhivă” clears and turns off the three fields that depend on it */
    if (key === "pastN") {
      if (!t.value.trim()) Object.assign(D.v, { actiune: "", anuntN: "" });
      ["actiune", "anunt"].forEach((k) => delete D.errors[k]);
      renderDrawer({ focus: `[data-arh-field="${key}"]` });
      return;
    }
    if (hadErr) renderDrawer({ focus: `[data-arh-field="${key}"]` });
  }
  function onDrawerChange(event) {
    const t = event.target;
    const key = t.dataset?.arhField;
    if (!key || !D) return;
    if (key === "redare" || key === "aprobare") { D.v[key] = t.checked; renderDrawer({ focus: `[data-arh-field="${key}"]` }); return; }
    if (t.tagName !== "SELECT") return;
    D.v[key] = t.value;
    delete D.errors[key];
    D.dup = false;
    if (key === "autoritate") D.v.serviciu = "";
    if (key === "tipObiect") {
      if (!t.value) D.v.sursa = "";
      if (t.value === "Act permisiv") Object.assign(D.v, { pastN: "", actiune: "", anuntN: "" }); /* AC-14 */
    }
    renderDrawer({ focus: /^(arh|rest|past|anunt)U$/.test(key) ? `#arh-f-${key.slice(0, -1)}-unit` : `#arh-f-${key}` });
  }
  function onDrawerClick(event) {
    const t = event.target;
    if (t.closest("[data-arh-close]")) { closeDrawer(); return; }
    if (t.closest("[data-arh-save]")) { save(); return; }
    const chip = t.closest("[data-arh-actiune]");
    if (chip && D && !chip.disabled) { D.v.actiune = chip.dataset.arhActiune; delete D.errors.actiune; renderDrawer({ focus: `[data-arh-actiune="${chip.dataset.arhActiune}"]` }); }
  }
  const validInt = (s) => /^\d+$/.test(String(s).trim()) && Number(s) > 0;
  function validate() {
    const v = D.v;
    const e = {};
    if (!String(v.arhN).trim()) e.arh = T.required; else if (!validInt(v.arhN)) e.arh = T.intGt0;
    if (!v.eveniment) e.eveniment = T.required;
    if (String(v.restN).trim() && !validInt(v.restN)) e.rest = T.intGt0;
    if (hasRetention(v)) {
      if (!validInt(v.pastN)) e.past = T.intGt0;
      if (!v.actiune) e.actiune = T.required;
      if (!String(v.anuntN).trim()) e.anunt = T.required; else if (!validInt(v.anuntN)) e.anunt = T.intGt0;
    }
    D.errors = e;
    return !Object.keys(e).length;
  }
  const dur = (n, u) => (String(n).trim() ? { n: Number(n), u } : null);
  function save() {
    if (!D) return;
    if (!who().has) { A().showShellToast?.(T.forbidden, "error"); return; }
    D.dup = false; D.error = false;
    if (!validate()) {
      renderDrawer();
      const first = drawer.querySelector('[aria-invalid="true"], .e-permits-fo-select.is-error .e-permits-fo-select__button, .e-permits-fo-field__error');
      (first?.matches("input, button") ? first : first?.closest(".e-permits-fo-field")?.querySelector("input, button"))?.focus();
      return;
    }
    const v = D.v;
    const ret = hasRetention(v);
    const values = {
      arhivare: dur(v.arhN, v.arhU), eveniment: v.eveniment, restaurare: dur(v.restN, v.restU), redare: v.redare,
      pastrare: ret ? dur(v.pastN, v.pastU) : null, actiune: ret ? v.actiune : null, anunt: ret ? dur(v.anuntN, v.anuntU) : null, aprobare: ret ? v.aprobare : null
    };
    const scope = D.mode === "edit" ? policyOf(D.id) : { autoritate: v.autoritate || null, serviciu: v.serviciu || null, tipObiect: v.tipObiect || null, sursa: v.tipObiect ? v.sursa || null : null };
    /* US-396 AC-15: one policy per scope, active or inactive */
    if (D.mode === "create" && policies().some((p) => sameScope(p, scope))) { D.dup = true; renderDrawer(); drawer.querySelector("[data-arh-d-body]").scrollTop = 0; return; }
    if (demo.has("eroare")) { D.error = true; renderDrawer(); drawer.querySelector("[data-arh-d-body]").scrollTop = 0; return; }
    const me = who();
    const at = nowIso();
    let p;
    if (D.mode === "create") {
      const st = readStore();
      const next = Math.max(0, ...policies().map((x) => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1;
      p = { id: `POL-${pad(next).padStart(4, "0")}`, ...scope, ...values, stare: "Activ", modificatDe: me.name, modificatLa: at };
      st.policies.push(p);
      audit("Creare politică", `${policyRef(p)} · ${summary(p)}`, "Politică de arhivare", p.id);
    } else {
      p = policyOf(D.id);
      const before = summary(p);
      Object.assign(p, values, { modificatDe: me.name, modificatLa: at });
      audit("Modificare politică", `${policyRef(p)} · înainte: ${before} · după: ${summary(p)}`, "Politică de arhivare", p.id);
    }
    writeStore();
    closeDrawer(true);
    refreshList(KIND);
    A().showShellToast?.(T.saved, "success");
  }
  const summary = (p) => [`Arhivare după ${durText(p.arhivare)}`, EVENTS[p.eveniment], p.restaurare ? `restaurare ${durText(p.restaurare)}` : "", p.redare === null || p.redare === undefined ? "" : `redare istorică ${p.redare ? "Pornit" : "Oprit"}`, p.pastrare ? `păstrare ${durText(p.pastrare)} · ${p.actiune} · anunț ${durText(p.anunt)} · aprobare ${p.aprobare === false ? "Nu" : "Da"}` : "păstrare nelimitată"].filter(Boolean).join(" · ");

  /* ---------------------------------------------------------------- activate / deactivate (US-398) */
  function toggle(id) {
    const p = policyOf(id);
    if (!p) return;
    if (!who().has) { A().showShellToast?.(T.forbidden, "error"); return; }
    const off = p.stare === "Activ";
    if (off && isPlatformWhole(p)) return; /* AC-04 */
    A().askConfirm?.({ title: off ? "Dezactivezi politica?" : "Activezi politica?", text: off ? T.deactivate : T.activate, confirmLabel: off ? "Dezactivează" : "Activează", destructive: off, cancelLabel: "Anulează" }, () => {
      if (demo.has("eroare")) { A().showShellToast?.(T.failed, "error"); return; } /* AC-15 */
      p.stare = off ? "Inactiv" : "Activ";
      Object.assign(p, { modificatDe: who().name, modificatLa: nowIso() });
      writeStore();
      audit(off ? "Dezactivare politică" : "Activare politică", policyRef(p), "Politică de arhivare", p.id);
      refreshList(KIND);
      A().showShellToast?.(off ? "Politica a fost dezactivată." : "Politica a fost activată.", "success");
    });
  }

  /* ---------------------------------------------------------------- Registru Dosare: the archive state (US-399…406) */
  const isCaseDef = (def) => def?.object === "Case";
  function recOf(id) {
    const seed = S.data?.dossiers?.[id] || extraOf(id) || null;
    const own = readStore().dossiers?.[id] || null;
    return seed || own ? { ...(seed || {}), ...(own || {}) } : null;
  }
  const stareOf = (id) => recOf(id)?.stare || "Activ";
  const FINALIZED = ["eliberat", "respins"];
  /* the old dossiers (2015–2017) of data/arhivare.json, shaped as the shell's dossier rows */
  let extras = null;
  function extraCaseRows() {
    if (!S.data) return [];
    extras ||= (S.data.extraDossiers || []).map((d) => ({
      id: d.id, nrDosar: d.id, status: d.statut === "Respins" ? "respins" : "eliberat", tipDosar: "Eliberare", serviciu: d.serviciu,
      /* a destroyed dossier keeps no personal data, an anonymized one shows „‹redactat›” (also in its journal) */
      numeSolicitant: d.stare === "Nimicit" ? "—" : d.anonimizat ? "‹redactat›" : d.solicitant, companie: d.stare === "Nimicit" || d.anonimizat ? "" : d.companie || "",
      specialist: { nume: d.stare === "Nimicit" ? "—" : "Natalia Cojocaru", rol: "Specialist" },
      subdiviziune: d.subdiviziune, dataDepunerii: d.depus, termenExaminare: d.decizie, sursa: "FO", idnp: d.idnp, __arh: true
    }));
    return extras;
  }
  const idnpOf = (src) => src.idnp || `200${String(hashOf(src.id)).padStart(10, "0").slice(0, 10)}`;
  function caseRow(base, src) {
    const r = recOf(base.id);
    const stare = r?.stare || "Activ";
    const out = { ...base, arhStare: stare, arhRec: r, arhIdnp: idnpOf(src) };
    if (r?.statut) { out.statut = r.statut; out.status = r.statut === "Respins" ? "respins" : "eliberat"; }
    out.arhFinal = FINALIZED.includes(out.status) || src.status === "arhivat";
    out.arhDecizie = r?.decizie || (out.arhFinal ? String(src.dataSemnarii || src.termenExaminare || "").slice(0, 10) : "");
    out.arhData = r?.arhivat?.at || "";
    out.arhDe = r?.arhivat?.by || "";
    if (stare === "Nimicit") Object.assign(out, { solicitant: "—", companie: "", actor: "—", actorRol: "", distLine: "", distHtml: "" });
    if (r?.anonimizat && stare !== "Nimicit") Object.assign(out, { solicitant: "‹redactat›", companie: "", anon: true });
    out.arhTipuri = stare === "Nimicit" ? [] : [...new Set(objectsOf(out).map((o) => o.tip))];
    return out;
  }
  const readOnly = (row) => row.arhStare !== "Activ" || Boolean(row.src?.__arh);
  /* the dossier's objects (documents + generated objects), deterministic from the dossier */
  function objectsOf(row) {
    const eliberat = row.status === "eliberat";
    const list = [
      { key: "cerere", name: "Cerere de eliberare", tip: "Cerere", sursa: "Solicitant" },
      { key: "nota", name: "Notă de plată", tip: "Notă de plată", sursa: "SIA GEAP" },
      { key: "plan", name: "Planul încăperilor", tip: "Document justificativ", sursa: "Solicitant" },
      { key: "extras", name: "Extras din Registrul de stat", tip: "Document justificativ", sursa: "Extern" },
      eliberat ? { key: "act", name: "Act permisiv", tip: "Act permisiv", sursa: "SIA GEAP" } : { key: "decizie", name: "Decizie de respingere", tip: "Document justificativ", sursa: "SIA GEAP" }
    ];
    const r = row.arhRec || recOf(row.id);
    const seed = S.data?.objectStates?.[row.id] || {};
    const own = readStore().objects?.[row.id] || {};
    return list.map((o) => {
      const st = { ...(seed[o.name] || {}), ...(own[o.name] || {}) };
      const dossierArchived = (r?.stare === "Arhivat" || r?.stare === "Nimicit");
      const objArchivedWithDossier = dossierArchived && !st.restaurat;
      const stare = st.stare || (objArchivedWithDossier ? (r.stare === "Nimicit" ? "Nimicit" : "Arhivat") : r?.restaurat && r?.arhivat ? "Activ" : "Activ");
      const at = st.at || (r?.arhivat ? r.arhivat.at : "");
      const wasArchived = Boolean(st.at || r?.arhivat);
      const pol = st.politica ? policyOf(st.politica) : resolve({ authority: row.authority, serviceName: row.serviciu, tipObiect: o.tip, sursa: o.sursa });
      return { ...o, nr: row.id, stare, at: wasArchived ? at : "", politica: pol, restaurat: st.restaurat || (r?.restaurat && !st.stare ? { at: r.restaurat.at, reason: r.restaurat.reason } : null) };
    });
  }
  const archivedObjects = (row) => objectsOf(row).filter((o) => o.at);

  /* register columns + facets (Registru Dosare and the other dossier registers) */
  const COL_STARE = { key: "arhStare", label: "Starea înregistrării", width: 176, align: "left", visible: true, sortable: true, filter: null };
  const COL_DATA = { key: "arhData", label: "Data arhivării", width: 184, align: "left", visible: true, sortable: true, filter: null };
  function cell(def, row, key) {
    if (key === "arhStare") {
      const r = row.arhRec;
      const meta = row.arhStare === "Activ" && r?.restaurat ? (r.restaurat.rearhivare ? `Rearhivare la ${longDate(r.restaurat.rearhivare)}` : "Restaurat în procesare") : "";
      return `<span class="e-permits-workplace__date-stack"><span>${tag(row.arhStare, STARE_TONE[row.arhStare])}</span>${meta ? `<span class="e-permits-workplace__date-meta" data-cell-tooltip="${esc(meta)}">${esc(meta)}</span>` : ""}</span>`;
    }
    if (key === "arhData") return row.arhData ? A().renderDateTime?.(row.arhData, row.arhDe) || esc(stamp(row.arhData)) : dash;
    return null;
  }

  /* „⋮” — US-401 Arhivează · US-404 Restaurează · US-406 Obiecte arhivate · US-403 Versiuni */
  function actions(def, base) {
    if (!isCaseDef(def)) return base;
    const out = [];
    base.forEach((a) => {
      if (a.control === "ArchiveRecord") {
        if (canArchive()) out.push({ ...a, label: "Arhivează" });
        if (canRestore()) out.push({ key: "arh-restore", type: "custom", control: "RestoreRecord", label: "Restaurează", icon: "undo", roles: [] });
        out.push({ key: "arh-objects", type: "custom", control: "ArchivedObjects", label: "Obiecte arhivate", icon: "list-bullets", roles: [] });
        out.push({ key: "arh-versions", type: "custom", control: "Versions", label: "Versiuni", icon: "history", roles: [] });
        return;
      }
      out.push(a);
    });
    if (!out.some((a) => a.key === "arh-objects")) {
      if (canRestore()) out.push({ key: "arh-restore", type: "custom", control: "RestoreRecord", label: "Restaurează", icon: "undo", roles: [] });
      out.push({ key: "arh-objects", type: "custom", control: "ArchivedObjects", label: "Obiecte arhivate", icon: "list-bullets", roles: [] }, { key: "arh-versions", type: "custom", control: "Versions", label: "Versiuni", icon: "history", roles: [] });
    }
    return out;
  }
  function actionVisible(a, row) {
    if (row.arhStare === undefined) return true;
    switch (a.control) {
      case "ArchiveRecord": return row.arhStare === "Activ" && row.arhFinal && !row.struck && !row.src?.__arh; /* AC-02…04 */
      case "RestoreRecord": return row.arhStare === "Arhivat"; /* US-404 AC-02/03 */
      case "ArchivedObjects": case "Versions": return row.arhStare !== "Nimicit";
      case "PushCase": case "StrikeCase": return row.arhStare === "Activ" && !row.src?.__arh;
      case "Anonymize": return row.arhStare !== "Nimicit" && !row.src?.__arh;
      default: return true;
    }
  }
  function actionState(a) {
    return ["ArchiveRecord", "RestoreRecord", "ArchivedObjects", "Versions"].includes(a.control) ? "" : undefined;
  }
  function run(action, def, row) {
    if (!isCaseDef(def)) return false;
    switch (action.control) {
      case "ArchiveRecord": openArchive(def, row); return true;
      case "RestoreRecord": openRestore(def, row); return true;
      case "ArchivedObjects": openObjects(def, row); return true;
      case "Versions": openVersions(def, row); return true;
      default: return false;
    }
  }
  const caseStore = (id) => { const st = readStore(); st.dossiers ||= {}; return (st.dossiers[id] ||= {}); };
  const objStore = (id) => { const st = readStore(); st.objects ||= {}; return (st.objects[id] ||= {}); };
  let pendingCase = null;
  function after(def, message) {
    writeStore();
    closeModal();
    A().showShellToast?.(message, "success");
    G().refresh?.(def.id);
    G().renderCard?.();
  }
  /* US-401 — the confirmation (AC-06: the AC sentence leads the dialog; the number stays in the content, no code in the header) */
  function openArchive(def, row) {
    pendingCase = { def, rowId: row.id, kind: "archive" };
    const pol = resolve({ authority: row.authority, serviceName: row.serviciu });
    openModal({
      kind: "confirm",
      title: "Arhivezi dosarul?",
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">Confirmi arhivarea dosarului <strong>${esc(row.nr)}</strong>?</p>
        <p class="e-permits-passport__lead">Dosarul iese din spațiul de lucru și rămâne în registrul «Dosare», doar pentru citire, cu documentele și versiunile lui. Obiectele dosarului se arhivează împreună cu el.</p>
        ${A().renderInfoNote?.(pol?.pastrare ? `Politica aplicată: ${esc(policyRef(pol))}. Termenul «Păstrare în arhivă» (${esc(durText(pol.pastrare))}) se numără de la data arhivării.` : `Politica aplicată: ${esc(policyRef(pol))}. Fără păstrare în lanțul de politici, dosarul arhivat se păstrează nelimitat.`) || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-arh-confirm="archive">${icon("page-text-lock", 20)}<span>Arhivează</span></button></div>`
    });
  }
  function confirmArchive() {
    const { def, rowId } = pendingCase || {};
    const row = def && G().findRow?.(def.id, rowId);
    if (!row) return;
    if (!canArchive()) { closeModal(); A().showShellToast?.(T.forbidden, "error"); return; } /* AC-01 */
    if (demo.has("eroare")) { closeModal(); A().showShellToast?.(T.failed, "error"); return; }
    const at = nowIso();
    const me = G().userName?.() || who().name;
    const pol = resolve({ authority: row.authority, serviceName: row.serviciu });
    const statut = row.statut;
    Object.assign(caseStore(row.id), { stare: "Arhivat", statut, decizie: row.arhDecizie || at.slice(0, 10), arhivat: { at, by: me, auto: false }, politica: pol?.id || null, restaurat: null });
    /* AC-12: the dossier's objects are archived with it */
    const objs = objStore(row.id);
    objectsOf({ ...row, arhRec: null }).forEach((o) => { objs[o.name] = { stare: "Arhivat", at, politica: o.politica?.id || pol?.id || null, restaurat: null }; });
    G().logEvent?.(def.id, row, { user: me, role: G().persona?.().roleLabel, type: "Arhivare dosar", category: "modificare", detail: `ARCHIVE · arhivare manuală din registrul «Dosare» · politica ${policyRef(pol)}.`, changes: [{ field: "Starea înregistrării", before: "Activ", after: "Arhivat" }] });
    audit("ARCHIVE", `Dosarul ${row.nr} · arhivare manuală · politica ${policyRef(pol)}`, "Dosar", row.nr);
    pendingCase = null;
    after(def, T.archived);
  }
  /* US-404 — restore with a reason; view-only (re-archived after the policy's restore duration) or back to processing */
  function openRestore(def, row) {
    const pol = policyOf(row.arhRec?.politica) || resolve({ authority: row.authority, serviceName: row.serviciu });
    const restDur = pol?.restaurare || inherited({ autoritate: pol?.autoritate || "", serviciu: pol?.serviciu || "", tipObiect: "" }, "restaurare", pol?.id).value || DEFAULT_RESTORE;
    const rearh = addDur(nowIso(), restDur);
    const cand = candidates().find((c) => c.dosar === row.id && !c.tipObiect && ["Anunțat", "Confirmat"].includes(c.stare));
    pendingCase = { def, rowId: row.id, kind: "restore", rearh, restDur };
    const radio = (value, label, desc, checked) => `
      <label class="radio radio--small">
        <input class="radio-input" type="radio" name="arh-restore-mode" value="${value}"${checked ? " checked" : ""} data-arh-restore-mode>
        <span class="radio-custom" aria-hidden="true"></span>
        <span class="radio-texts"><span class="radio-label">${esc(label)}</span><span class="radio-description">${esc(desc)}</span></span>
      </label>`;
    openModal({
      kind: "confirm",
      title: "Restaurarea dosarului",
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">Dosarul <strong>${esc(row.nr)}</strong> revine în starea «Activ», cu obiectele lui arhivate. Conținutul și documentele rămân neschimbate.</p>
        ${cand ? A().renderNotice?.("warning", `Dosarul este anunțat pentru nimicire la ${esc(longDate(cand.planificat))} (${esc(cand.stare)}). Restaurarea anulează nimicirea lui.`) || "" : ""}
        ${row.anon ? A().renderInfoNote?.("Dosarul este anonimizat și se restaurează anonimizat.") || "" : ""}
        <div class="e-permits-arh-mode">
          <span class="e-permits-cfg-ro__label" id="arh-restore-mode-label">Scopul restaurării</span>
          <div class="radio-group" role="radiogroup" aria-labelledby="arh-restore-mode-label">
            ${radio("vizualizare", "Pentru vizualizare", `Se arhivează din nou la ${longDate(rearh)} (Durata restaurării pentru vizualizare: ${durText(restDur)}).`, true)}
            ${radio("procesare", "Revine în procesare", "Fără «Rearhivare la»: termenul de arhivare se numără de la următoarea decizie. Procesarea urmează fluxul de redeschidere a dosarului.", false)}
          </div>
        </div>
        ${reasonHtml("arh-restore-reason", "Motivul restaurării", "De ex. contestație, corectare sau verificare")}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-arh-confirm="restore">${icon("undo", 20)}<span>Restaurează</span></button></div>`
    });
  }
  function confirmRestore() {
    const { def, rowId, rearh } = pendingCase || {};
    const row = def && G().findRow?.(def.id, rowId);
    if (!row) return;
    const reason = requireReason("arh-restore-reason");
    if (reason === null) return;
    if (!canRestore()) { closeModal(); A().showShellToast?.(T.forbidden, "error"); return; } /* AC-01 */
    if (demo.has("eroare")) { closeModal(); A().showShellToast?.(T.failed, "error"); return; }
    const mode = document.querySelector("[data-arh-restore-mode]:checked")?.value || "vizualizare";
    const at = nowIso();
    const me = G().userName?.() || who().name;
    const r = recOf(row.id) || {};
    Object.assign(caseStore(row.id), { stare: "Activ", statut: row.statut, arhivat: r.arhivat, politica: r.politica, restaurat: { at, by: me, reason, mode, rearhivare: mode === "vizualizare" ? rearh : null } });
    /* AC-10: the archived objects come back into the dossier's current view */
    const objs = objStore(row.id);
    objectsOf(row).filter((o) => o.stare === "Arhivat").forEach((o) => { objs[o.name] = { ...(objs[o.name] || {}), stare: "Activ", at: o.at, politica: o.politica?.id || null, restaurat: { at, reason } }; });
    /* AC-14: an announced / confirmed destruction is cancelled */
    candidates().filter((c) => c.dosar === row.id && ["Anunțat", "Confirmat"].includes(c.stare)).forEach((c) => { c.stare = "Restaurat"; });
    G().logEvent?.(def.id, row, { user: me, role: G().persona?.().roleLabel, type: "Restaurare dosar", category: "modificare", detail: `RESTORE · ${mode === "vizualizare" ? `pentru vizualizare, rearhivare la ${longDate(rearh)}` : "revine în procesare"} · Motiv: ${reason}`, changes: [{ field: "Starea înregistrării", before: "Arhivat", after: "Activ" }] });
    audit("RESTORE", `Dosarul ${row.nr} · ${mode === "vizualizare" ? "pentru vizualizare" : "revine în procesare"} · Motiv: ${reason}`, "Dosar", row.nr);
    pendingCase = null;
    after(def, T.restored);
  }

  /* US-406 — the archived objects of a dossier: the ONE drawer (lg), the model's columns, restore per object */
  let odrawer = null;
  const O = { def: null, rowId: null, obj: null };
  function ensureObjDrawer() {
    if (odrawer) return odrawer;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="drawer-overlay" data-arh-odrawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-arh-oclose></button>
        <aside class="drawer drawer--lg" role="dialog" aria-modal="true" aria-labelledby="arh-o-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="arh-o-title" data-arh-o-title></h2>
              <p class="drawer__subtitle" data-arh-o-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-arh-oclose>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-arh-o-body></div>
          <footer class="drawer__footer" data-arh-o-footer></footer>
        </aside>
      </div>`);
    odrawer = document.querySelector("[data-arh-odrawer]");
    return odrawer;
  }
  const raise = (on) => document.querySelector("#case-action-modal")?.classList.toggle("e-permits-confirm-overlay", on);
  function openObjects(def, row) {
    ensureObjDrawer();
    Object.assign(O, { def, rowId: row.id, mode: "objects" });
    renderObjects();
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(odrawer, { focus: odrawer.querySelector(".drawer") }); else odrawer.hidden = false;
  }
  function renderObjects() {
    const row = G().findRow?.(O.def.id, O.rowId);
    if (!row) return;
    const list = archivedObjects(row);
    odrawer.querySelector("[data-arh-o-title]").textContent = "Obiecte arhivate";
    odrawer.querySelector("[data-arh-o-subtitle]").textContent = row.serviciu;
    const can = canRestore();
    /* the model's fields on each row (the drawer is too narrow for a 9-column table): title = Denumire + state tag,
       meta = Tip obiect · Sursa · Nr. dosar, meta2 = archive date + policy, then the restore date + reason */
    const items = list.map((o) => ({
      title: esc(o.name),
      plainTitle: o.name,
      badges: [tag(o.stare, STARE_TONE[o.stare])],
      meta: [esc(`Tip obiect: ${o.tip}`), esc(`Sursa obiectului: ${o.sursa}`), `Nr. dosar: ${window.GEAPCopyValue?.html(o.nr, { compact: true, label: `Copiază ${o.nr}` }) || esc(o.nr)}`],
      meta2: [
        esc(`Data arhivării: ${o.at ? stamp(o.at) : "—"}`),
        esc(`Politica aplicată: ${policyRef(o.politica)}`),
        ...(o.restaurat ? [esc(`Data restaurării: ${stamp(o.restaurat.at)}`), esc(`Motivul restaurării: ${o.restaurat.reason || "—"}`)] : [])
      ],
      action: o.stare === "Arhivat" && can ? { label: "Restaurează", attrs: `data-arh-obj-restore="${esc(o.name)}" aria-label="${esc(`Restaurează obiectul ${o.name}`)}"` } : null
    }));
    odrawer.querySelector("[data-arh-o-body]").innerHTML = list.length
      ? A().renderStackedList?.(`Dosarul ${row.nr}`, [{ label: "", items }], { meta: plural(list.filter((o) => o.stare === "Arhivat").length, "obiect arhivat", "obiecte arhivate") }) || ""
      : (E()?.render({ title: T.noObjects, text: "Obiectele dosarului se arhivează după politica lor sau împreună cu dosarul.", icon: "page-child", compact: true }) || T.noObjects);
    A().syncStackMetaRows?.(odrawer);
    odrawer.querySelector("[data-arh-o-footer]").innerHTML = '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-arh-oclose>Închide</button></div>';
  }
  function closeObjDrawer() {
    if (!odrawer || odrawer.hidden) return;
    if (window.GEAPDrawer?.close) window.GEAPDrawer.close(odrawer); else odrawer.hidden = true;
  }
  function openObjRestore(name) {
    const row = G().findRow?.(O.def.id, O.rowId);
    const o = row && archivedObjects(row).find((x) => x.name === name);
    if (!o) return;
    O.obj = name;
    pendingCase = { def: O.def, rowId: O.rowId, kind: "obj-restore", name };
    const cand = candidates().find((c) => c.dosar === row.id && c.tipObiect === o.tip && ["Anunțat", "Confirmat"].includes(c.stare));
    raise(true);
    openModal({
      kind: "confirm",
      title: `Restaurarea obiectului ${o.name}`,
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">Obiectul revine în vizualizarea curentă a dosarului. Starea dosarului rămâne neschimbată.</p>
        ${cand ? A().renderNotice?.("warning", `Obiectul este anunțat pentru nimicire la ${esc(longDate(cand.planificat))}. Restaurarea anulează nimicirea lui.`) || "" : ""}
        ${reasonHtml("arh-obj-reason", "Motivul restaurării", "De ex. document cerut la o inspecție")}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-arh-confirm="obj-restore">${icon("undo", 20)}<span>Restaurează</span></button></div>`
    });
  }
  function confirmObjRestore() {
    const { def, rowId, name } = pendingCase || {};
    const row = def && G().findRow?.(def.id, rowId);
    const o = row && archivedObjects(row).find((x) => x.name === name);
    if (!o) return;
    const reason = requireReason("arh-obj-reason");
    if (reason === null) return;
    if (!canRestore()) { closeModal(); A().showShellToast?.(T.forbidden, "error"); return; }
    if (demo.has("eroare")) { closeModal(); A().showShellToast?.(T.failed, "error"); return; }
    const at = nowIso();
    const me = G().userName?.() || who().name;
    objStore(row.id)[o.name] = { stare: "Activ", at: o.at, politica: o.politica?.id || null, restaurat: { at, reason } };
    candidates().filter((c) => c.dosar === row.id && c.tipObiect === o.tip && ["Anunțat", "Confirmat"].includes(c.stare)).forEach((c) => { c.stare = "Restaurat"; }); /* AC-12 */
    G().logEvent?.(def.id, row, { user: me, role: G().persona?.().roleLabel, type: "Restaurare obiect", category: "modificare", detail: `RESTORE · ${o.name} (${o.tip}) · Motiv: ${reason}`, changes: [{ field: `Starea înregistrării · ${o.name}`, before: "Arhivat", after: "Activ" }] });
    audit("RESTORE", `Obiectul ${o.name} · dosarul ${row.nr} · Motiv: ${reason}`, "Dosar", row.nr);
    pendingCase = null;
    writeStore();
    closeModal();
    raise(false);
    renderObjects();
    A().showShellToast?.(T.objRestored, "success");
    G().refresh?.(def.id);
    G().renderCard?.();
  }

  /* US-403 — document versions: the drawer (lg) list + compare, the docked document viewer for one version */
  const DOC_FIELDS = {
    cerere: (row) => [["Solicitant", row.anon ? "‹redactat›" : row.solicitant], ["Serviciu", row.serviciu], ["Adresa activității", "str. Ismail 45, Chișinău"], ["Telefon de contact", "+373 69 112 233"], ["Tip solicitare", row.tip || "Eliberare"]],
    nota: (row) => [["Serviciu", row.serviciu], ["Sumă", "650 MDL"], ["Statut", "Achitată"], ["Termen de plată", "15 zile"]],
    plan: () => [["Fișier", "plan-incaperi.pdf (2 pagini)"], ["Suprafața totală", "86 m²"], ["Semnat de", "Arhitect autorizat"]],
    extras: () => [["Registrul", "Registrul de stat al unităților de drept"], ["Statutul unității", "Activă"], ["Data extrasului", "2 iunie 2026"]],
    act: (row) => [["Denumire act", row.serviciu], ["Statut", "Valabil"], ["Valabil până la", "4 iulie 2031"], ["Titular", row.anon ? "‹redactat›" : row.companie || row.solicitant]],
    decizie: (row) => [["Decizia", "Respingere"], ["Temeiul", "Documente incomplete"], ["Destinatar", row.anon ? "‹redactat›" : row.solicitant]]
  };
  const DOC_CHANGES = {
    cerere: [[["Adresa activității", "str. Ismail 45/2, Chișinău"], ["Telefon de contact", "+373 69 112 234"]]],
    plan: [[["Fișier", "plan-incaperi-rev.pdf (3 pagini)"], ["Suprafața totală", "92 m²"]]],
    act: [[["Statut", "Suspendat"]], [["Statut", "Valabil"], ["Valabil până la", "4 iulie 2032"]]],
    decizie: [[["Temeiul", "Documente incomplete și neconforme"]]]
  };
  function versionsOf(row, o) {
    const fields = DOC_FIELDS[o.key]?.(row) || [];
    const steps = DOC_CHANGES[o.key] || [];
    const base = String(row.depus || row.src?.dataDepunerii || "2026-06-01T09:00").slice(0, 16);
    const plusDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return isoOf(d); };
    const author = o.sursa === "Solicitant" ? (row.anon || row.arhStare === "Nimicit" ? "‹redactat›" : row.solicitant) : o.sursa === "Extern" ? "MConnect · Registrul de stat" : o.key === "act" || o.key === "decizie" ? "SIA GEAP · MDocs" : "SIA GEAP";
    const list = [{ v: 1, at: plusDays(base, o.key === "act" || o.key === "decizie" ? 14 : 0), by: author, values: Object.fromEntries(fields) }];
    steps.forEach((changes, i) => {
      const prev = list[list.length - 1];
      list.push({ v: prev.v + 1, at: plusDays(prev.at, 3 + i * 9), by: o.key === "act" ? (i === 0 ? "Elena Caragia" : "SIA GEAP · MDocs") : author, values: { ...prev.values, ...Object.fromEntries(changes) } });
    });
    const stare = row.arhStare === "Arhivat" || o.stare === "Arhivat" ? "Arhivat" : "Activ";
    const max = list.length;
    return list.map((x) => ({ ...x, current: x.v === max, stare, file: `${o.name.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join("")}_${row.nr}_v${x.v}.pdf`.normalize("NFD").replace(/\p{M}/gu, "") })).reverse(); /* AC-04: newest first */
  }
  const V = { def: null, rowId: null, doc: "", picked: [] };
  function openVersions(def, row, docKey = "") {
    ensureObjDrawer();
    const docs = objectsOf(row);
    Object.assign(V, { def, rowId: row.id, doc: docKey || docs[0]?.key || "", picked: [] });
    O.mode = "versions";
    Object.assign(O, { def, rowId: row.id });
    renderVersions();
    audit("Consultare versiuni", `Dosarul ${row.nr} · lista versiunilor`, "Dosar", row.nr);
    if (odrawer.hidden) { if (window.GEAPDrawer?.open) window.GEAPDrawer.open(odrawer, { focus: odrawer.querySelector(".drawer") }); else odrawer.hidden = false; }
  }
  function renderVersions({ focus = "" } = {}) {
    const row = G().findRow?.(V.def.id, V.rowId);
    if (!row) return;
    const docs = objectsOf(row);
    const o = docs.find((d) => d.key === V.doc) || docs[0];
    const list = versionsOf(row, o);
    odrawer.querySelector("[data-arh-o-title]").textContent = "Versiuni";
    odrawer.querySelector("[data-arh-o-subtitle]").textContent = row.serviciu;
    const rows = list.map((x) => `
      <tr tabindex="0" data-workplace-row-open data-arh-version="${x.v}" aria-label="${esc(`${o.name}, versiunea ${x.v}${x.current ? ", curentă" : ""} — deschide redarea PDF`)}">
        <td class="e-permits-arh-table__check"><label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" aria-label="Alege versiunea ${x.v} pentru comparare" data-arh-pick="${x.v}"${V.picked.includes(x.v) ? " checked" : ""}${list.length < 2 ? " disabled" : ""}><span class="checkbox-custom" aria-hidden="true"></span></label></td>
        <td><span data-cell-tooltip="${esc(o.name)}">${esc(o.name)}</span></td>
        <td>${x.v}</td>
        <td>${x.current ? tag("Curentă", "brand") : dash}</td>
        <td>${A().renderDateTime?.(x.at) || esc(stamp(x.at))}</td>
        <td><span data-cell-tooltip="${esc(x.by)}">${esc(x.by)}</span></td>
        <td>${tag(x.stare, STARE_TONE[x.stare])}</td>
        <td><span class="e-permits-arh-file" data-cell-tooltip="${esc(x.file)}">${icon("document", 16)}<span>${esc(x.file)}</span></span></td>
      </tr>`).join("");
    const reason = list.length < 2 ? "Documentul are o singură versiune." : V.picked.length !== 2 ? "Alege două versiuni din listă." : "";
    odrawer.querySelector("[data-arh-o-body]").innerHTML = `
      <section class="e-permits-user-create__section">
        <div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
            <label for="arh-v-doc">Document</label>
            ${A().renderFoSelectControl?.({ id: "arh-v-doc", attrs: "data-arh-v-doc", optionsHtml: optionsHtml(docs.map((d) => [d.key, d.name]), o.key) }) || ""}
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Versiunile documentului</h3>
        <p class="e-permits-passport__lead">${esc(`${plural(list.length, "versiune", "versiuni")} · doar pentru citire · alege două versiuni ca să le compari`)}</p>
        <div class="e-permits-workplace__table-wrap e-permits-reg-table">
          <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-arh-table e-permits-arh-table--versions">
            <caption class="u-visually-hidden">Versiunile documentului ${esc(o.name)} din dosarul ${esc(row.nr)}</caption>
            <thead><tr><th scope="col"><span class="u-visually-hidden">Compară</span></th><th scope="col">Denumire</th><th scope="col">Versiune</th><th scope="col">Versiune curentă</th><th scope="col">Data versiunii</th><th scope="col">Autor</th><th scope="col">Starea înregistrării</th><th scope="col">Reprezentare PDF</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
    odrawer.querySelector("[data-arh-o-footer]").innerHTML = `<div class="modal-buttons">
      <button class="btn btn-neutral btn-rounded" type="button" data-arh-oclose>Închide</button>
      <button class="btn btn-secondary btn-rounded" type="button" data-arh-compare${reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""}>Compară${V.picked.length === 2 ? ` (v${Math.min(...V.picked)} · v${Math.max(...V.picked)})` : ""}</button>
    </div>`;
    if (focus) odrawer.querySelector(focus)?.focus();
  }
  function openCompare() {
    const row = G().findRow?.(V.def.id, V.rowId);
    if (!row || V.picked.length !== 2) return;
    const o = objectsOf(row).find((d) => d.key === V.doc);
    const list = versionsOf(row, o);
    const [a, b] = [Math.min(...V.picked), Math.max(...V.picked)].map((n) => list.find((x) => x.v === n));
    const changes = Object.keys({ ...a.values, ...b.values }).filter((k) => a.values[k] !== b.values[k]).map((k) => ({ field: k, before: a.values[k] ?? "—", after: b.values[k] ?? "—" }));
    raise(true);
    openModal({
      kind: "compare",
      title: "Compară versiunile",
      subtitle: o.name,
      body: `<p class="e-permits-passport__lead">Versiunea ${a.v} (${esc(stamp(a.at))}) → versiunea ${b.v} (${esc(stamp(b.at))}).</p>
        ${changes.length ? window.GEAPEventTimeline?.changesHtml?.(changes) || "" : E()?.render({ title: "Versiunile au același conținut.", icon: "checkmark-large", compact: true }) || ""}`,
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
    audit("Comparare versiuni", `${o.name} · v${a.v} ↔ v${b.v} · dosarul ${row.nr}`, "Dosar", row.nr);
  }
  /* one version = the docked document viewer (tabs Previzualizare · Detalii) with „Descarcă PDF” in its footer */
  let viewing = null;
  function openVersion(n) {
    const row = G().findRow?.(V.def.id, V.rowId);
    const modal = document.querySelector("#dosar-detail-modal");
    if (!row || !modal) return;
    const o = objectsOf(row).find((d) => d.key === V.doc);
    const x = versionsOf(row, o).find((y) => y.v === Number(n));
    if (!x) return;
    viewing = { row, o, x };
    const pol = resolve({ authority: row.authority, serviceName: row.serviciu });
    const redare = pol?.redare ?? inherited({ autoritate: pol?.autoritate || "", serviciu: pol?.serviciu || "", tipObiect: "" }, "redare", pol?.id).value;
    const page = `
      <div class="e-permits-doc-peek__canvas e-permits-detail-modal__preview" role="document" aria-label="${esc(`${o.name}, versiunea ${x.v}`)}" data-arh-doc-canvas>
        <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page">
          <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
            <p class="e-permits-arh-doc__kicker">SIA GEAP · ${esc(row.authority)} · ${esc(row.subdivision)}</p>
            <h3 class="e-permits-arh-doc__title">${esc(o.name)}</h3>
            <table><colgroup><col class="e-permits-doc-page__label-col"><col></colgroup><tbody>
              <tr><th>Numărul dosarului</th><td>${esc(row.nr)}</td></tr>
              ${Object.entries(x.values).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
              <tr><th>Versiunea</th><td>${x.v}${x.current ? " (curentă)" : ""} · ${esc(stamp(x.at))}</td></tr>
            </tbody></table>
            <p class="e-permits-doc-page__footer">Redare istorică · ${esc(x.file)} · <span data-doc-page-label>Pagina 1 din 1</span></p>
          </div>
        </div>
      </div>`;
    const meta = window.GEAPDocPreview?.metaHtml?.([
      { title: "Versiunea", rows: [["Denumire", esc(o.name)], ["Versiune", String(x.v)], ["Versiune curentă", x.current ? tag("Curentă", "brand") : "Nu"], ["Data versiunii", esc(stamp(x.at))], ["Autor", esc(x.by)], ["Starea înregistrării", tag(x.stare, STARE_TONE[x.stare])]] },
      { title: "Reprezentare PDF", rows: [["Fișier", esc(x.file)], ["Păstrarea redării istorice", redare ? "Pornit · identică cu cea generată inițial" : "Oprit · redare cu șablonul curent"]] }
    ]) || "";
    modal.querySelector("[data-dosar-detail-title]").textContent = `${o.name} · versiunea ${x.v}`;
    modal.querySelector("[data-dosar-detail-subtitle]").textContent = row.serviciu;
    const dialog = modal.querySelector(".modal");
    dialog.classList.add("e-permits-detail-modal--doc");
    modal.classList.add("e-permits-confirm-overlay");
    modal.querySelector("[data-dosar-detail-buttons]").innerHTML = `<button class="btn btn-neutral btn-rounded" type="button" data-arh-download>${icon("export", 20)}<span>Descarcă PDF</span></button><button class="btn btn-primary btn-rounded" type="button" data-dosar-detail-close>Închide</button>`;
    window.__modal?.open?.("#dosar-detail-modal");
    window.GEAPDocPreview?.mountViewer?.(dialog, { id: "arh-version-doc", mode: "both", documentHtml: page, dataHtml: meta, onDocument: (body) => window.GEAPDocPreview.fit(body.querySelector("[data-arh-doc-canvas]")) });
    dialog.focus();
    audit("Consultare versiune", `${o.name} · versiunea ${x.v} · dosarul ${row.nr}`, "Dosar", row.nr);
  }
  /* a real one-page PDF (Helvetica, ASCII) — the historical rendering of the version (AC-07/08) */
  function pdfBlob(lines) {
    const ascii = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\x20-\x7e]/g, "-").replace(/[()\\]/g, (c) => `\\${c}`);
    const text = lines.map((l, i) => `BT /F1 ${i ? 11 : 16} Tf 56 ${780 - i * 22} Td (${ascii(l)}) Tj ET`).join("\n");
    const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", `<< /Length ${text.length} >>\nstream\n${text}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    let out = "%PDF-1.4\n";
    const offsets = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([out], { type: "application/pdf" });
  }
  function downloadVersion() {
    if (!viewing) return;
    const { row, o, x } = viewing;
    const blob = pdfBlob([o.name, `Numarul dosarului: ${row.nr}`, ...Object.entries(x.values).map(([k, v]) => `${k}: ${v}`), `Versiunea ${x.v} - ${stamp(x.at)}`, `Autor: ${x.by}`]);
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: x.file });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    audit("Descărcare versiune", `${o.name} · versiunea ${x.v} · dosarul ${row.nr} · ${x.file}`, "Dosar", row.nr);
    A().showShellToast?.(`Am descărcat ${x.file}.`, "success");
  }
  new MutationObserver(() => {
    const modal = document.querySelector("#dosar-detail-modal");
    if (modal && modal.getAttribute("aria-hidden") === "true") { modal.classList.remove("e-permits-confirm-overlay"); viewing = null; }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["aria-hidden"] });

  /* ---------------------------------------------------------------- the record card of a dossier */
  const card = (title, rows) => A().renderInfoCard?.(title, rows.filter(Boolean)) || "";
  const v = (x) => (x === null || x === undefined || x === "" ? "—" : esc(x));
  function meta(row) {
    if (row.arhStare === undefined) return [];
    return [["Starea înregistrării", tag(row.arhStare, STARE_TONE[row.arhStare])]];
  }
  function details(def, row) {
    if (row.arhStare === undefined) return null;
    const r = row.arhRec || {};
    const pol = policyOf(r.politica);
    if (row.arhStare === "Nimicit") {
      /* US-402 AC-11 · US-408 AC-05: only the minimal data, no personal data */
      return {
        replace: `<div class="e-permits-reg-notices">${A().renderNotice?.("warning", `<strong>Dosar nimicit</strong> · ${esc(stamp(r.nimicit?.at))}. Conținutul și documentele au fost șterse; se păstrează doar datele minime, fără date personale. Nimicirea nu se poate anula.`, { icon: "delete-filled" }) || ""}</div>
          ${card("Date minime", [
            ["Nr. dosar", A().renderProfileCopyCode?.(row.nr, `Copiază ${row.nr}`) || esc(row.nr)],
            ["Serviciu", v(row.serviciu)],
            ["Autoritate / Subdiviziune", v(`${row.authority} · ${row.subdivision}`)],
            ["Data arhivării", v(stamp(r.arhivat?.at))],
            ["Data nimicirii", v(stamp(r.nimicit?.at))],
            ["Politica aplicată", v(policyRef(pol))],
            ["Executat de", v("Procedură automată «Nimicirea înregistrărilor arhivate»")]
          ])}`
      };
    }
    const cand = candidates().find((c) => c.dosar === row.id && !c.tipObiect && ["Anunțat", "Confirmat"].includes(c.stare));
    const notices = [
      row.arhStare === "Arhivat" && A().renderNotice?.("info", `<strong>Dosar arhivat</strong> · doar pentru citire. ${r.arhivat?.auto ? "Arhivat de procedura automată «Arhivarea dosarelor»" : `Arhivat manual de ${esc(r.arhivat?.by || "")}`}, ${esc(stamp(r.arhivat?.at))}.`, { icon: "page-text-lock" }),
      row.arhStare === "Activ" && r.restaurat && A().renderNotice?.("info", `<strong>Restaurat</strong> · ${esc(stamp(r.restaurat.at))}, ${esc(r.restaurat.by || "")}. ${r.restaurat.rearhivare ? `Pentru vizualizare: se arhivează din nou la ${esc(longDate(r.restaurat.rearhivare))}.` : "Revine în procesare: se arhivează după următoarea decizie."}`, { icon: "undo" }),
      r.anonimizat && A().renderNotice?.("info", `<strong>Date anonimizate</strong> · ${esc(stamp(r.anonimizat.at))}, procedura automată «Nimicirea înregistrărilor arhivate» (Anonimizare). Dosarul nu se mai găsește după identificatorul solicitantului.`, { icon: "shield-keyhole" }),
      cand && A().renderNotice?.("warning", `<strong>Anunțat pentru nimicire</strong> · data planificată ${esc(longDate(cand.planificat))} (${esc(cand.stare)}). Restaurarea dosarului anulează nimicirea.`)
    ].filter(Boolean).join("");
    const appliedPol = pol || resolve({ authority: row.authority, serviceName: row.serviciu });
    return {
      notices,
      after: card("Arhivare", [
        ["Starea înregistrării", tag(row.arhStare, STARE_TONE[row.arhStare])],
        ["Data deciziei", v(longDate(row.arhDecizie))],
        ["Data arhivării", v(stamp(r.arhivat?.at))],
        ["Arhivat de", v(r.arhivat?.by)],
        ["Politica aplicată", v(policyRef(appliedPol))],
        r.restaurat && ["Data restaurării", v(stamp(r.restaurat.at))],
        r.restaurat && ["Motivul restaurării", v(r.restaurat.reason)],
        r.restaurat && ["Rearhivare la", v(longDate(r.restaurat.rearhivare))]
      ])
    };
  }
  function cardTabs(def, row) {
    if (row.arhStare === undefined || row.arhStare === "Nimicit") return [];
    return [{ id: "documente", label: "Documente", icon: "document", count: objectsOf(row).length }];
  }
  function cardTabHtml(def, row, tab) {
    if (tab !== "documente") return null;
    const docs = objectsOf(row);
    const items = docs.map((o) => ({
      title: esc(o.name),
      plainTitle: o.name,
      badges: [tag(o.stare, STARE_TONE[o.stare])],
      meta: [esc(o.tip), esc(`Sursa: ${o.sursa}`), esc(plural(versionsOf(row, o).length, "versiune", "versiuni"))],
      rowAttrs: `data-arh-doc-open="${esc(o.key)}" data-arh-doc-row="${esc(row.id)}" aria-label="${esc(`${o.name} — deschide versiunile`)}" tabindex="0"`
    }));
    return A().renderStackedList?.("Documentele dosarului", [{ label: "", items }], { meta: row.arhStare === "Arhivat" ? "Doar pentru citire" : plural(docs.length, "document", "documente") }) || "";
  }
  /* the automatic procedures' results (US-399 · US-405 · US-408) as journal events of the dossier */
  function events(row) {
    const seed = S.data?.dossiers?.[row.id] || extraOf(row.id);
    if (!seed) return [];
    const pol = policyOf(seed.politica);
    const ev = (k, at, user, role, type, category, detail, changes = []) => ({ id: `EV-ARH-${hashOf(row.id + k) % 900000}`, at, user, role, type, category, status: "Reușit", detail, changes });
    const list = [];
    if (seed.arhivat) list.push(ev("a", seed.arhivat.at, seed.arhivat.auto ? "Procedură automată" : seed.arhivat.by, seed.arhivat.auto ? "Sistem" : "Administrator central", "Arhivare dosar", seed.arhivat.auto ? "sistem" : "modificare", seed.arhivat.auto ? `ARCHIVE · procedura automată «Arhivarea dosarelor» · politica ${policyRef(pol)}.` : `ARCHIVE · arhivare manuală din registrul «Dosare» · politica ${policyRef(pol)}.`, [{ field: "Starea înregistrării", before: "Activ", after: "Arhivat" }]));
    if (seed.restaurat) list.push(ev("r", seed.restaurat.at, seed.restaurat.by, "Administrator central", "Restaurare dosar", "modificare", `RESTORE · ${seed.restaurat.rearhivare ? `pentru vizualizare, rearhivare la ${longDate(seed.restaurat.rearhivare)}` : "revine în procesare"} · Motiv: ${seed.restaurat.reason}`, [{ field: "Starea înregistrării", before: "Arhivat", after: "Activ" }]));
    const cand = (S.data?.candidates || []).find((c) => c.dosar === row.id && !c.tipObiect);
    if (cand) list.push(ev("c", `${cand.anuntat}T03:00`, "Procedură automată", "Sistem", "Anunț de nimicire", "sistem", `Candidat la nimicire · procedura automată «Nimicirea înregistrărilor arhivate» · ${cand.actiune} · data planificată ${longDate(cand.planificat)}.`));
    if (seed.nimicit) list.push(ev("n", seed.nimicit.at, "Procedură automată", "Sistem", "Nimicire dosar", "sistem", `DELETE · procedura automată «Nimicirea înregistrărilor arhivate» · politica ${policyRef(pol)}. Se păstrează doar datele minime.`, [{ field: "Starea înregistrării", before: "Arhivat", after: "Nimicit" }]));
    if (seed.anonimizat) list.push(ev("x", seed.anonimizat.at, "Procedură automată", "Sistem", "Anonimizare la expirarea păstrării", "sistem", `DELETE (anonimizare) · procedura automată «Nimicirea înregistrărilor arhivate» · politica ${policyRef(pol)}.`));
    return list;
  }
  /* US-402 AC-18: an export that includes archived dossiers is logged with the criteria and the count */
  function onExport(def, rows) {
    const n = rows.filter((r) => r.arhStare && r.arhStare !== "Activ").length;
    if (!isCaseDef(def) || !n) return;
    const st = A().workplaceState || {};
    const crit = [st.query ? `căutare „${st.query}”` : "", ...Object.entries(A().registryFilters?.(def.id) || {}).filter(([, val]) => val?.length).map(([k, val]) => `${FACET_LABEL[k] || k}: ${val.join(", ")}`)].filter(Boolean).join(" · ") || "fără criterii";
    audit("Export arhivă", `${def.name} · ${crit} · ${plural(rows.length, "rezultat", "rezultate")}`, "Dosar", def.id);
  }

  /* facets of the dossier registers (US-402 AC-03…08) */
  const FACET_LABEL = { "arh-stare": "Starea înregistrării", "arh-decizie": "Perioada deciziei", "arh-arhivare": "Perioada arhivării", "arh-tip": "Tip obiect", serviciu: "Serviciu", subdiviziune: "Autoritate / Subdiviziune", statut: "Statut dosar" };
  function facets(def) {
    if (!isCaseDef(def)) return [];
    return [
      { key: "arh-stare", label: "Starea înregistrării", single: true, get: (row) => [row.arhStare, "Toate"] },
      { key: "arh-decizie", label: "Perioada deciziei", type: "date", presets: [], get: (row) => row.arhDecizie || "" },
      { key: "arh-arhivare", label: "Perioada arhivării", type: "date", presets: [], get: (row) => String(row.arhData || "").slice(0, 10) },
      { key: "arh-tip", label: "Tip obiect", get: (row) => row.arhTipuri || [] }
    ];
  }

  /* ---------------------------------------------------------------- „Căutările mele” + „Salvează căutarea” (US-402 AC-15/16) */
  const savedList = () => (S.data ? readStore().saved || [] : []);
  const onDossiers = () => { const reg = document.querySelector("[data-workplace]"); const k = reg?.dataset.registryKind; return Boolean(reg && !reg.hidden && !reg.closest("[hidden]") && G().defOf?.(k)?.object === "Case") ? k : ""; };
  const criteriaNow = (kind) => ({ query: A().workplaceState?.query || "", filters: Object.fromEntries(Object.entries(A().registryFilters?.(kind) || {}).filter(([, val]) => val?.length)) });
  const criteriaText = (c) => [c.query ? `Căutare: „${c.query}”` : "", ...Object.entries(c.filters || {}).map(([k, val]) => `${FACET_LABEL[k] || k}: ${val.map((x) => (/^interval:/.test(x) ? x.replace(/^interval:/, "").split(":").map((d) => longDate(d) || "…").join(" – ") : x)).join(", ")}`)].filter(Boolean);
  function ensureSavedChrome() {
    const tools = document.querySelector("[data-workplace] .e-permits-workplace__table-tools");
    if (!tools || tools.querySelector("[data-arh-saved]")) return;
    tools.insertAdjacentHTML("afterbegin", `
      <div class="e-permits-arh-saved" data-arh-saved hidden>
        <div class="e-permits-stack__menu-wrap">
          <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="arh-saved-menu" data-stack-menu-trigger data-arh-saved-trigger>${icon("bookmark", 16)}<span>Căutările mele</span>${icon("chevron-bottom", 16)}</button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="arh-saved-menu" role="menu" aria-label="Căutările mele" hidden data-stack-menu data-stack-menu-fixed></ul>
        </div>
        <button class="btn btn-neutral btn-sm" type="button" data-arh-save-search>${icon("save-outline", 16)}<span>Salvează căutarea</span></button>
      </div>`);
  }
  function syncSavedChrome() {
    ensureSavedChrome();
    const wrap = document.querySelector("[data-arh-saved]");
    if (!wrap) return;
    const kind = onDossiers();
    wrap.hidden = !kind || !S.data;
    if (wrap.hidden) return;
    const list = savedList();
    const menu = wrap.querySelector("#arh-saved-menu");
    const html = list.length
      ? list.map((s) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-arh-saved-apply="${esc(s.id)}" data-tooltip-label="${esc(criteriaText(s.criteria).join(" · "))}">${icon("bookmark")}<span>${esc(s.name)}</span></button></li>`).join("")
      : '<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" aria-disabled="true" data-tooltip-reason="Salvează o căutare ca să o găsești aici.">' + icon("bookmark") + "<span>Nicio căutare salvată</span></button></li>";
    if (menu.innerHTML !== html) menu.innerHTML = html;
    const save = wrap.querySelector("[data-arh-save-search]");
    const c = criteriaNow(kind);
    const empty = !c.query && !Object.keys(c.filters).length;
    if (empty) { save.setAttribute("aria-disabled", "true"); save.dataset.tooltipReason = "Caută sau aplică un filtru înainte să salvezi căutarea."; }
    else { save.removeAttribute("aria-disabled"); delete save.dataset.tooltipReason; }
  }
  let saveKind = "";
  function openSaveSearch() {
    const kind = onDossiers();
    if (!kind) return;
    saveKind = kind;
    const c = criteriaNow(kind);
    openModal({
      kind: "confirm",
      title: "Salvează căutarea",
      body: `<p class="e-permits-passport__lead">Criteriile curente se salvează în lista «Căutările mele», vizibilă doar ție. La reaplicare, rezultatele respectă drepturile tale de atunci.</p>
        <ul class="e-permits-arh-list" role="list">${criteriaText(c).map((t) => `<li class="e-permits-arh-list__item"><span class="e-permits-arh-list__main">${esc(t)}</span></li>`).join("")}</ul>
        <div class="e-permits-fo-field" data-arh-name-field>
          <label for="arh-search-name">Denumire${req()}</label>
          <div class="e-permits-fo-input"><input id="arh-search-name" type="text" maxlength="80" autocomplete="off" placeholder="De ex. Arhivate ANSP 2026" aria-required="true" data-arh-search-name></div>
        </div>`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-arh-confirm="save-search">Salvează</button></div>'
    });
    setTimeout(() => document.getElementById("arh-search-name")?.focus(), 60);
  }
  function confirmSaveSearch() {
    const input = document.getElementById("arh-search-name");
    const wrap = input?.closest("[data-arh-name-field]");
    const name = input?.value.trim() || "";
    const msg = !name ? T.required : savedList().some((s) => fold(s.name) === fold(name)) ? "Ai deja o căutare salvată cu această denumire." : "";
    wrap?.querySelector(".e-permits-fo-field__error")?.remove();
    input?.closest(".e-permits-fo-input")?.classList.toggle("is-error", Boolean(msg));
    if (msg) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "arh-search-name-error"); wrap.insertAdjacentHTML("beforeend", errorHtml("arh-search-name", msg)); input.focus(); return; }
    const st = readStore();
    st.seq = (st.seq || 0) + 1;
    const c = criteriaNow(saveKind);
    st.saved = [...(st.saved || []), { id: `SS-U${st.seq}`, name, criteria: c, at: nowIso() }];
    writeStore();
    closeModal();
    syncSavedChrome();
    audit("Salvare căutare", `„${name}” · ${criteriaText(c).join(" · ")}`, "Dosar", saveKind);
    A().showShellToast?.("Căutarea a fost salvată în «Căutările mele».", "success");
  }
  function applySaved(id) {
    const s = savedList().find((x) => x.id === id);
    const kind = onDossiers();
    if (!s || !kind) return;
    A().setRegistryFilters?.(kind, s.criteria.filters || {});
    const st = A().workplaceState;
    if (st) { st.query = s.criteria.query || ""; st.page = 1; }
    const search = document.querySelector("[data-workplace] [data-workplace-search]");
    if (search) search.value = s.criteria.query || "";
    A().renderWorkplace?.();
    const n = (A().getVisibleRows?.() || []).length;
    audit("Căutare în arhivă", `Căutarea salvată „${s.name}” · ${criteriaText(s.criteria).join(" · ")} · ${plural(n, "rezultat", "rezultate")}`, "Dosar", kind);
    document.querySelector("[data-arh-saved-trigger]")?.focus();
  }
  document.addEventListener("input", (event) => {
    if (event.target.matches?.("[data-arh-search-name]")) {
      event.target.closest(".e-permits-fo-input")?.classList.remove("is-error");
      event.target.removeAttribute("aria-invalid");
      event.target.closest("[data-arh-name-field]")?.querySelector(".e-permits-fo-field__error")?.remove();
    }
    if (event.target.matches?.("[data-workplace-search]")) queueChrome();
  });

  /* ---------------------------------------------------------------- delegated clicks */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    const disabled = t.closest('[aria-disabled="true"]');
    if (t.closest('[data-workplace-add-product="arh-new"]')) { event.preventDefault(); openDrawer("create"); return; }
    const ed = t.closest("[data-arh-edit]");
    if (ed) { openDrawer("edit", ed.dataset.arhEdit); return; }
    const tg = t.closest("[data-arh-toggle]");
    if (tg) { toggle(tg.dataset.arhToggle); return; }
    const cc = t.closest("[data-arh-cand-confirm]");
    if (cc) { askCandidates("confirm", [cc.dataset.arhCandConfirm]); return; }
    const cr = t.closest("[data-arh-cand-reject]");
    if (cr) { askCandidates("reject", [cr.dataset.arhCandReject]); return; }
    const bulk = t.closest("[data-arh-bulk]");
    if (bulk) { askCandidates(bulk.dataset.arhBulk, selectedRows().map((r) => r.id)); return; }
    if (t.closest("[data-selection-clear]") && listOpen(KIND_C)) { clearSelection(); return; }
    const conf = t.closest("[data-arh-confirm]");
    if (conf) {
      const k = conf.dataset.arhConfirm;
      if (k === "archive") confirmArchive();
      else if (k === "restore") confirmRestore();
      else if (k === "obj-restore") confirmObjRestore();
      else if (k === "cand-confirm") decideCandidates("confirm");
      else if (k === "cand-reject") decideCandidates("reject");
      else if (k === "save-search") confirmSaveSearch();
      return;
    }
    if (t.closest("#case-action-modal [data-case-close], #case-action-modal .modal-close")) { raise(Boolean(odrawer && !odrawer.hidden)); pendingCand = null; }
    if (t.closest("[data-arh-oclose]")) { closeObjDrawer(); return; }
    const or = t.closest("[data-arh-obj-restore]");
    if (or) { openObjRestore(or.dataset.arhObjRestore); return; }
    if (t.closest("[data-arh-compare]")) { if (!disabled) openCompare(); return; }
    if (t.closest("[data-arh-download]")) { downloadVersion(); return; }
    if (t.closest("[data-arh-pick], .e-permits-arh-table__check")) return;
    const vr = t.closest("[data-arh-version]");
    if (vr) { openVersion(vr.dataset.arhVersion); return; }
    const doc = t.closest("[data-arh-doc-open]");
    if (doc) { const c = G().card?.(); const def = c && G().defOf?.(c.id); const row = def && G().findRow?.(def.id, c.rowId); if (row) openVersions(def, row, doc.dataset.arhDocOpen); return; }
    if (t.closest("[data-arh-save-search]")) { if (!disabled) openSaveSearch(); return; }
    const ap = t.closest("[data-arh-saved-apply]");
    if (ap) { if (!disabled) applySaved(ap.dataset.arhSavedApply); }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const doc = event.target.closest?.("[data-arh-doc-open]");
    const vr = event.target.matches?.("[data-arh-version]") ? event.target : null;
    if (!doc && !vr) return;
    event.preventDefault();
    event.target.click();
  });
  document.addEventListener("change", (event) => {
    const pick = event.target.closest?.("[data-arh-pick]");
    if (pick) {
      const n = Number(pick.dataset.arhPick);
      V.picked = pick.checked ? [...V.picked.filter((x) => x !== n), n].slice(-2) : V.picked.filter((x) => x !== n);
      renderVersions({ focus: `[data-arh-pick="${n}"]` });
      return;
    }
    if (event.target.matches?.("[data-arh-v-doc]")) { V.doc = event.target.value; V.picked = []; renderVersions({ focus: "#arh-v-doc" }); }
  });
  /* the object / version drawer: Esc = the header × (GEAPDrawer); a raised dialog above it closes first */

  /* ---------------------------------------------------------------- menu, routes, denied (US-395 AC-01/02) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: T.denied, text: "Ecranul «Politici de arhivare și păstrare» este disponibil Administratorului central și utilizatorilor cărora li s-a acordat permisiunea de gestionare a politicilor.", icon: "lock" }) || T.denied);
    audit("Acces ecran Politici de arhivare și păstrare", "Acces refuzat: rolul nu are permisiunea de gestionare a politicilor de arhivare și păstrare.", "Ecran", NAV, "Refuzat");
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    const m = /^#(arhivare|arhivare-candidati)(?:\/([^/]+))?$/.exec(h || "");
    if (!m) return false;
    load().then(() => {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${m[1]}"]`);
      if (!nav || !who().has) { showDenied(); return; }
      nav.click();
      A().setActiveNav?.(NAV);
      if (m[1] === NAV && m[2]) setTimeout(() => openDrawer(m[2] === "nou" ? "create" : "edit", m[2] === "nou" ? null : decodeURIComponent(m[2])), 300);
    });
    return true;
  });
  const installNavHook = () => {
    const prev = window.GEAPShellNavHook;
    if (prev?.arhWrapped) return;
    const hook = (profileKey, groups) => {
      const out = prev ? prev(profileKey, groups) : groups;
      if (grantedTo(profileKey === "central-admin" || profileKey === "local-admin" ? profileKey : "")) return out;
      return (out || []).map((g) => ({ ...g, items: (g.items || []).filter((i) => i.id !== NAV && i.id !== NAV_C) })).filter((g) => g.items.length);
    };
    hook.arhWrapped = true;
    window.GEAPShellNavHook = hook;
    A().refreshNav?.();
  };
  /* the hidden candidates item keeps „Politici de arhivare și păstrare” highlighted in the menu */
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(`[data-nav-item][data-nav-id="${NAV_C}"]`)) requestAnimationFrame(() => A().setActiveNav?.(NAV));
  });
  const boot = () => {
    installNavHook();
    load();
    observeRegistry();
    new MutationObserver(() => observeRegistry()).observe(document.body, { childList: true, subtree: false });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  window.GEAPArhivare = {
    load, policies, candidates, openDrawer, closeDrawer, toggle, who, resolve, refreshList,
    /* js/registre.js hooks (Registru Dosare) */
    extraCaseRows, caseRow, readOnly,
    columns: (def) => (def?.id === "reg-dosare" ? [COL_STARE, COL_DATA] : isCaseDef(def) ? [COL_STARE] : []),
    cell: (def, row, key) => (isCaseDef(def) ? cell(def, row, key) : null),
    text: (row, key) => (key === "arhStare" ? row.arhStare : key === "arhData" ? (row.arhData ? stamp(row.arhData) : "") : undefined),
    sortValue: (row, key) => (key === "arhData" ? row.arhData || "" : key === "arhStare" ? row.arhStare || "" : undefined),
    searchText: (row) => (row.arhStare && row.arhStare !== "Nimicit" && !row.anon ? row.arhIdnp || "" : ""),
    noMatch: (def) => (isCaseDef(def) ? T.noMatch : ""),
    facets, actions, actionVisible, actionState, run, events, meta, details, cardTabs, cardTabHtml, onExport,
    openArchive, openRestore, openObjects, openVersions, openCompare, openVersion, applySaved, openSaveSearch
  };
})();
