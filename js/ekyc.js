/* EVO eKYC — back office (Azure project „eKYC”), batch 1 (2026-10-13).
   A product on the permits back-office engine: e-permits-acte-permisive.html?flow=ekyc.
   This file only describes eKYC — its roles/menus (data/ekyc-roles.json), its data
   (data/ekyc-sessions.json), its registry cells and its pages. The chrome, role switcher,
   registry engine (status tabs, quick search, Filtrare avansată, sort, pagination, export),
   page header, profile panel, stacked lists, info cards, timeline, empty states and toasts
   all come from js/e-permits-shell.js through window.GEAPShellProduct (see „Product mode”).

   Stories: US-UI-01 91104 shell & nav · US-UI-02 91107 login (bo-login.html?product=ekyc) ·
   US-03-10 89193 MPass · US-05-10-B 89241 roles · US-UI-03 91108 + US-05-14 89248 +
   US-05-15 89249 dashboard · US-UI-04 91109 Sesiuni active · US-UI-05 91110 Sesiuni istorice.

   Demo overrides (?ek=…, for the Figma / QA states): gol (no data) · eroare (the API failed) ·
   incarcare (loading) · incheiata (an active session ended while the list was open). */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("flow") !== "ekyc") return;
  const DEMO = params.get("ek") || "";
  document.documentElement.dataset.product = "ekyc";

  let api = null;
  let db = null;
  let loadedAt = Date.now();
  let failed = DEMO === "eroare";
  const ui = { period: "24h", client: "", useCase: "", view: "", session: null, tab: "general", dismissed: new Set(), pulsed: new Set(), restack: false, modal: "", mode: "session", grants: {}, touched: new Set(), draft: null, viewer: null };

  /* ---- vocabulary -------------------------------------------------------------- */
  const ACTIVE_TONES = { "Inițiată": "neutral", "În desfășurare": "info", "Așteaptă utilizatorul": "warning", "Așteaptă furnizorul": "violet", "În revizie manuală": "brand" };
  const FINAL_TONES = { "Finalizată": "success", "Abandonată": "neutral", "Expirată": "warning", "Eroare": "danger" };
  const DECISION_TONES = { Acceptat: "success", Respins: "danger", "Revizuire manuală": "warning", "Fără decizie": "neutral" };
  const PROVIDER_TONES = { "Operațional": "success", Degradat: "warning", Indisponibil: "danger" };
  const PERIODS = [["1h", "1 h", 3600], ["24h", "24 h", 86400], ["7z", "7 zile", 7 * 86400], ["30z", "30 zile", 30 * 86400]];
  const VIEWS = ["ekyc-dashboard", "ekyc-active", "ekyc-history", "ekyc-placeholder", "ekyc-review", "ekyc-review-all", "ekyc-reports", "ekyc-access-log"];

  /* ---- small helpers ----------------------------------------------------------- */
  const esc = (value) => api.escapeHtml(value);
  const num = (value, digits = 2) => (value == null ? "—" : Number(value).toFixed(digits).replace(".", ","));
  const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
  const now = () => new Date(Date.parse(db.now) + (Date.now() - loadedAt));
  const secondsSince = (iso) => Math.max(0, Math.round((now() - new Date(iso)) / 1000));
  const two = (n) => String(n).padStart(2, "0");
  /* live timer, as on the Figma: 54:04 · 1:03:05 */
  const clock = (sec) => (sec >= 3600 ? `${Math.floor(sec / 3600)}:${two(Math.floor(sec / 60) % 60)}:${two(sec % 60)}` : `${Math.floor(sec / 60)}:${two(sec % 60)}`);
  /* human duration: 45 s · 10 min 26 s · 1 h 05 min */
  const duration = (sec) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${two(Math.floor(sec / 60) % 60)} min` : sec >= 60 ? `${Math.floor(sec / 60)} min ${two(sec % 60)} s` : `${sec} s`);
  const ago = (iso) => {
    const sec = secondsSince(iso);
    if (sec < 60) return "acum câteva secunde";
    if (sec < 3600) return `acum ${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `acum ${Math.floor(sec / 3600)} h`;
    const days = Math.floor(sec / 86400);
    return days === 1 ? "ieri" : `acum ${days} zile`;
  };
  const client = (id) => db.clients.find((c) => c.id === id) || { id, name: id, org: "" };
  const useCase = (code) => db.useCases.find((u) => u.code === code) || { code, name: code };
  const findSession = (id) => db.history.find((s) => s.id === id) || db.active.find((s) => s.id === id) || null;
  const isHistorical = (s) => db.history.includes(s);
  const icon = (name, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const identity = (name, meta) => `
    <div class="e-permits-workplace__role-identity">
      <span class="e-permits-workplace__role-name" data-cell-tooltip="${esc(name)}">${esc(name)}</span>
      ${meta ? `<span class="e-permits-workplace__role-meta">${esc(meta)}</span>` : ""}
    </div>`;

  /* Meter — a thin bar (Progres, Contribuție, Structura deciziilor). Segments are SVG rects
     with percentage widths, so the markup needs no inline style. */
  const meter = (segments, { label = "", max = 1, size = "" } = {}) => {
    let x = 0;
    const cuts = [];
    const shown = segments.filter(([value]) => value > 0);
    const rects = shown.map(([value, tone], i) => {
      const width = max ? (value / max) * 100 : 0;
      const rect = `<rect class="e-permits-meter__fill e-permits-meter__fill--${tone}" x="${x.toFixed(2)}%" y="0" width="${width.toFixed(2)}%" height="100%"></rect>`;
      x += width;
      if (i < shown.length - 1) cuts.push(x);
      return rect;
    }).join("");
    /* stacked segments are cut apart by 2px lines in the card colour (rounded outer ends come
       from the wrapper's full radius) */
    const gaps = cuts.map((at) => `<line class="e-permits-meter__gap" x1="${at.toFixed(2)}%" x2="${at.toFixed(2)}%" y1="0" y2="100%"></line>`).join("");
    const single = segments.length === 1;
    return `<span class="e-permits-meter${size ? ` e-permits-meter--${size}` : ""}"${single ? ` role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${segments[0][0]}"` : ' role="img"'}${label ? ` aria-label="${esc(label)}"` : ""}><svg class="e-permits-meter__svg" aria-hidden="true" focusable="false"><rect class="e-permits-meter__track" x="0" y="0" width="100%" height="100%"></rect>${rects}${gaps}</svg></span>`;
  };

  const progressOf = (s) => {
    const total = s.steps.length;
    const done = s.steps.filter((step) => step.status === "done").length;
    const current = s.steps.find((step) => step.status === "current") || null;
    return { total, done, current };
  };

  const scoreOf = (s) => {
    const scored = s.steps.filter((step) => step.score != null);
    const weight = scored.reduce((sum, step) => sum + step.weight, 0);
    return weight ? scored.reduce((sum, step) => sum + step.score * step.weight, 0) / weight : null;
  };

  /* ---- registries (the shell's workplace engine) --------------------------------- */
  const emptyRows = () => ["gol", "eroare", "incarcare"].includes(DEMO) || failed;

  const activeRow = (s) => {
    const uc = useCase(s.useCaseCode);
    const c = client(s.clientId);
    const progress = progressOf(s);
    const step = progress.current || (s.status === "În revizie manuală" ? { label: "Revizie manuală", provider: "Operator" } : null);
    return {
      id: s.id, session: s, client: c.name, org: c.org, cazUtilizare: uc.name, codCaz: uc.code,
      statut: s.status, nivel: s.ial, inceput: s.startedAt, ultimaActivitate: s.lastActivityAt,
      progres: progress.total ? progress.done / progress.total : 0, progress,
      pasCurent: step?.label || "—", furnizor: step?.provider || "—"
    };
  };

  const historyRow = (s) => {
    const uc = useCase(s.useCaseCode);
    const c = client(s.clientId);
    return {
      id: s.id, session: s, client: c.name, org: c.org, cazUtilizare: uc.name, codCaz: uc.code,
      statut: s.status, decizie: s.decision, scor: s.finalScore, nivel: s.ial,
      inceput: s.startedAt, finalizat: s.completedAt, durata: s.durationSeconds,
      subiect: s.subject?.name || "", idnp: s.subject?.idnp || ""
    };
  };

  const statusesOf = (...maps) => Object.fromEntries(maps.flatMap((m) => Object.entries(m)).map(([label, tone]) => [label, { label, tone }]));

  const buildActiveDb = () => ({
    kind: "ekyc-active",
    fieldCount: 10,
    statuses: statusesOf(ACTIVE_TONES),
    columns: {
      client: { label: "Client", width: 200, sortable: true },
      cazUtilizare: { label: "Caz de utilizare", width: 280, fill: true, sortable: true },
      statut: { label: "Statut", width: 184, sortable: true },
      nivel: { label: "Nivel asigurare", width: 136, sortable: true },
      inceput: { label: "Început la", width: 160, sortable: true },
      timpScurs: { label: "Timp scurs", width: 112, sortable: true },
      progres: { label: "Progres", width: 144, sortable: true },
      pasCurent: { label: "Pas curent", width: 220, sortable: true },
      ultimaActivitate: { label: "Ultima activitate", width: 160, sortable: true },
      actiuni: { label: "", width: 128 }
    },
    views: {
      active: {
        title: "Sesiuni active",
        selectable: false,
        toolbarLabel: "Filtrare sesiuni active",
        searchPlaceholder: "Căutare rapidă după ID, client sau caz de utilizare",
        columns: ["client", "cazUtilizare", "statut", "nivel", "inceput", "timpScurs", "progres", "pasCurent", "ultimaActivitate", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          ...Object.keys(ACTIVE_TONES).filter((label) => label !== "Inițiată").map((label) => ({ id: label, label, filter: `ek:${label}` })),
          { id: "Inițiată", label: "Inițiate", filter: "ek:Inițiată" }
        ]
      }
    },
    /* demo „incheiata”: the open list still shows the session that has just ended */
    runtimeRows: emptyRows() ? [] : [...(db.staleActive ? [db.staleActive] : []), ...db.active].map(activeRow)
  });

  const buildHistoryDb = () => ({
    kind: "ekyc-history",
    fieldCount: 10,
    statuses: statusesOf(FINAL_TONES),
    columns: {
      client: { label: "Client", width: 200, sortable: true },
      cazUtilizare: { label: "Caz de utilizare", width: 280, fill: true, sortable: true },
      statut: { label: "Statut", width: 120, sortable: true },
      decizie: { label: "Decizie", width: 160, sortable: true },
      scor: { label: "Scor final", width: 104, sortable: true },
      nivel: { label: "Nivel asigurare", width: 136, sortable: true },
      inceput: { label: "Început la", width: 160, sortable: true },
      finalizat: { label: "Finalizat la", width: 160, sortable: true },
      durata: { label: "Durată", width: 120, sortable: true },
      actiuni: { label: "", width: 128 },
      subiect: { label: "Subiect", width: 200, sortable: true }
    },
    views: {
      history: {
        title: "Sesiuni istorice",
        selectable: false,
        toolbarLabel: "Filtrare sesiuni istorice",
        /* US-07-04: the Auditor also searches by the subject (name, IDNP); the IDNP shows masked */
        searchPlaceholder: role() === "auditor" ? "Căutare după ID, client, caz, subiect sau IDNP" : "Căutare rapidă după ID, client sau caz de utilizare",
        columns: role() === "auditor"
          ? ["client", "subiect", "cazUtilizare", "statut", "decizie", "scor", "inceput", "finalizat", "actiuni"]
          : ["client", "cazUtilizare", "statut", "decizie", "scor", "nivel", "inceput", "finalizat", "durata", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          ...Object.keys(DECISION_TONES).map((label) => ({ id: label, label, filter: `dec:${label}` }))
        ]
      }
    },
    runtimeRows: emptyRows() ? [] : db.history.map(historyRow)
  });

  const rowActions = (row) => `<span class="e-permits-workplace__row-actions">${api.renderRowActions({
    primary: { label: "Detalii", attrs: `data-ekyc-open="${esc(row.id)}" aria-label="Detalii: sesiunea ${esc(row.id)}"` },
    label: row.id
  })}</span>`;

  const sharedCell = (row, key) => {
    switch (key) {
      case "client": return identity(row.client, row.id);
      case "cazUtilizare": return identity(row.cazUtilizare, row.codCaz);
      case "nivel": return api.renderTag(row.nivel, "neutral");
      case "inceput": return api.renderDateTime(row.inceput);
      case "actiuni": return rowActions(row);
      default: return undefined;
    }
  };

  const renderActiveCell = (row, key) => {
    const shared = sharedCell(row, key);
    if (shared !== undefined) return shared;
    switch (key) {
      case "statut": return api.renderTag(row.statut, ACTIVE_TONES[row.statut]);
      case "timpScurs": return `<span class="e-permits-ekyc-timer" data-ekyc-elapsed="${esc(row.inceput)}">${clock(secondsSince(row.inceput))}</span>`;
      case "progres": return `
        <span class="e-permits-ekyc-progress">
          ${meter([[row.progress.done, "brand"]], { max: row.progress.total || 1, label: `${row.progress.done} din ${row.progress.total} pași finalizați` })}
          <span class="e-permits-ekyc-progress__count">${row.progress.done}/${row.progress.total}</span>
        </span>`;
      case "pasCurent": return row.pasCurent === "—" ? '<span class="e-permits-workplace__dash">—</span>' : identity(row.pasCurent, row.furnizor);
      case "ultimaActivitate": return api.renderDateTime(row.ultimaActivitate, ago(row.ultimaActivitate));
      default: return esc(row[key] ?? "—");
    }
  };

  const renderHistoryCell = (row, key) => {
    const shared = sharedCell(row, key);
    if (shared !== undefined) return shared;
    switch (key) {
      case "statut": return api.renderTag(row.statut, FINAL_TONES[row.statut]);
      case "decizie": return api.renderTag(row.decizie, DECISION_TONES[row.decizie]);
      case "scor": return row.scor == null ? '<span class="e-permits-workplace__dash">—</span>' : `<span class="e-permits-ekyc-score">${num(row.scor)}</span>`;
      case "finalizat": return api.renderDateTime(row.finalizat);
      case "durata": return esc(duration(row.durata));
      case "subiect": return identity(row.subiect || "—", maskIdnp(row.idnp));
      default: return esc(row[key] ?? "—");
    }
  };

  const searchText = (row) => [row.id, row.session.correlationId, row.client, row.org, row.cazUtilizare, row.codCaz, row.statut, row.decizie, row.nivel, row.pasCurent, row.furnizor, api.formatLongDate(row.inceput), ...(role() === "auditor" ? [row.subiect, row.idnp] : [])].filter(Boolean).join(" ");

  const sortValue = (row, key) => {
    switch (key) {
      case "timpScurs": return -Date.parse(row.inceput);
      case "inceput": case "finalizat": case "ultimaActivitate": return Date.parse(row[key]) || 0;
      case "scor": return row.scor ?? -1;
      case "durata": case "progres": return Number(row[key]) || 0;
      default: return row[key] ?? "";
    }
  };

  const filterToken = (row, token) => {
    if (token.startsWith("ek:")) return row.statut === token.slice(3);
    if (token.startsWith("dec:")) return row.decizie === token.slice(4);
    return true;
  };

  const openRow = (id) => openSession(id);

  /* list states: loading / API error / nothing yet (US-UI-04/05 „Empty/loading/error”) */
  const emptyHtml = (label, nothing = null) => ({ query, filtered }) => {
    if (DEMO === "incarcare") return api.renderEmptyState({ title: `Se încarcă ${label}…`, text: "Datele vin din serviciul de monitorizare.", loading: true, bare: true });
    if (failed) return api.renderEmptyState({ title: `Nu am putut încărca ${label}`, text: "Serviciul de monitorizare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", bare: true, actionHtml: `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry>${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>` });
    if (query || filtered) return null;
    /* nothing yet (the whole list is empty) vs. an empty status tab — never the BO „dosare” fallback */
    if (nothing && emptyRows()) return api.renderEmptyState({ ...nothing, bare: true });
    if (nothing) return api.renderEmptyState({ title: "Nicio sesiune în acest tab", text: "Alege alt tab sau caută altceva.", icon: "search", bare: true });
    return null;
  };

  /* US-UI-05: export of what the list shows (tab + search + filters), CSV like Tarife */
  const exportHistory = (rows) => {
    if (!rows.length) {
      api.showShellToast("Lista nu are sesiuni de exportat.", "warning", "Nimic de exportat");
      return;
    }
    api.exportCsv("sesiuni-istorice.csv",
      ["ID sesiune", "Client", "Caz de utilizare", "Cod caz", "Statut", "Decizie", "Scor final", "Nivel asigurare", "Început la", "Finalizat la", "Durată (s)"],
      rows.map((r) => [r.id, r.client, r.cazUtilizare, r.codCaz, r.statut, r.decizie, r.scor == null ? "" : num(r.scor), r.nivel, r.inceput, r.finalizat, r.durata]));
    api.showShellToast(`${rows.length === 1 ? "1 sesiune exportată" : `${rows.length} sesiuni exportate`} în sesiuni-istorice.csv.`, "success", "Export finalizat");
  };
  const exportActive = (rows) => {
    if (!rows.length) {
      api.showShellToast("Lista nu are sesiuni de exportat.", "warning", "Nimic de exportat");
      return;
    }
    api.exportCsv("sesiuni-active.csv",
      ["ID sesiune", "Client", "Caz de utilizare", "Cod caz", "Statut", "Nivel asigurare", "Început la", "Pas curent", "Pași finalizați", "Ultima activitate"],
      rows.map((r) => [r.id, r.client, r.cazUtilizare, r.codCaz, r.statut, r.nivel, r.inceput, r.pasCurent, `${r.progress.done}/${r.progress.total}`, r.ultimaActivitate]));
    api.showShellToast(`${rows.length === 1 ? "1 sesiune exportată" : `${rows.length} sesiuni exportate`} în sesiuni-active.csv.`, "success", "Export finalizat");
  };

  const exportReview = (rows) => {
    if (!rows.length) { api.showShellToast("Lista nu are sesiuni de exportat.", "warning", "Nimic de exportat"); return; }
    api.exportCsv("revizie-manuala.csv", ["ID sesiune", "ID revizie", "Client", "Cod caz", "Statut revizie", "Tip revizie", "Decizii", "Scor automat", "Operatori", "Alocată la", "Termen"],
      rows.map((r) => [r.id, r.session.review.id, r.client, r.codCaz, r.statut, r.tip, r.decizii, r.scor == null ? "" : num(r.scor), r.operatori.join("; "), r.alocata || "", r.termen || ""]));
    api.showShellToast(`${rows.length === 1 ? "1 sesiune exportată" : `${rows.length} sesiuni exportate`} în revizie-manuala.csv.`, "success", "Export finalizat");
  };
  const exportAccess = (rows) => {
    if (!rows.length) { api.showShellToast("Jurnalul nu are înregistrări de exportat.", "warning", "Nimic de exportat"); return; }
    api.exportCsv("jurnal-acces.csv", ["Moment", "Utilizator", "Rol", "Acțiune", "Sesiune", "Motiv / context"], rows.map((r) => [r.entry.at, r.entry.user, r.entry.role, r.actiune, r.sesiune || "", r.context]));
    logAccess({ action: "Export raport", sessionId: "", reason: "CSV · jurnal de acces", ref: `${rows.length} înregistrări` });
    api.showShellToast(`${rows.length} înregistrări exportate în jurnal-acces.csv.`, "success", "Export finalizat");
  };

  /* Filtrare avansată facets — the column names (US-UI-04: Client, Cod caz, Status;
     US-UI-05: interval, Client, Caz, Status, Decizie). The date range is a period facet
     until a date-range facet exists in the engine (open question for the PO). */
  const PERIOD_FACET = (row) => {
    const age = (now() - new Date(row.finalizat)) / 86400000;
    return [age <= 1 && "Ultimele 24 de ore", age <= 7 && "Ultimele 7 zile", age <= 30 && "Ultimele 30 de zile", age > 30 && "Mai vechi de 30 de zile"].filter(Boolean);
  };
  const facets = {
    "ekyc-active": [
      { key: "client", label: "Client", get: (r) => r.client },
      { key: "cazUtilizare", label: "Caz de utilizare", get: (r) => `${r.codCaz}` },
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "nivel", label: "Nivel asigurare", get: (r) => r.nivel, tone: () => "neutral" },
      { key: "pasCurent", label: "Pas curent", get: (r) => r.pasCurent },
      { key: "furnizor", label: "Furnizor", get: (r) => r.furnizor }
    ],
    "ekyc-history": [
      { key: "perioada", label: "Perioadă", get: PERIOD_FACET },
      { key: "client", label: "Client", get: (r) => r.client },
      { key: "decizie", label: "Decizie", get: (r) => r.decizie, tone: (v) => DECISION_TONES[v] || "neutral" },
      /* US-07-04: score band + manual review, for the Auditor's search */
      { key: "scorBand", label: "Scor final", get: (r) => (r.scor == null ? "Fără scor" : r.scor >= 0.8 ? "0,80 – 1,00" : r.scor >= 0.5 ? "0,50 – 0,79" : "Sub 0,50") },
      { key: "cazUtilizare", label: "Caz de utilizare", get: (r) => `${r.codCaz}` },
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "nivel", label: "Nivel asigurare", get: (r) => r.nivel, tone: () => "neutral" },
      { key: "revizie", label: "Revizie manuală", get: (r) => (r.session.review ? (r.session.review.mode === "multi" ? "Multi-operator" : "Un operator") : "Fără revizie") }
    ],
    "ekyc-review": [
      { key: "client", label: "Client", get: (r) => r.client },
      { key: "cazUtilizare", label: "Caz de utilizare", get: (r) => r.codCaz },
      { key: "statut", label: "Statut revizie", get: (r) => r.statut },
      { key: "tip", label: "Tip revizie", get: (r) => r.tip },
      { key: "operator", label: "Operator", get: (r) => (r.operatori.length ? r.operatori : ["Nealocată"]) },
      { key: "nivel", label: "Nivel asigurare", get: (r) => r.nivel, tone: () => "neutral" }
    ],
    "ekyc-access": [
      { key: "utilizator", label: "Utilizator", get: (r) => r.utilizator },
      { key: "rol", label: "Rol", get: (r) => r.entry.role },
      { key: "actiune", label: "Acțiune", get: (r) => r.actiune }
    ]
  };

  /* ---- session profile (the shell's profile panel + page header) ------------------ */
  const TABS_ACTIVE = [["general", "Date generale", "page-text"], ["pasi", "Pași de verificare"], ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"]];
  const TABS_HISTORY = [["general", "Date generale", "page-text"], ["scor", "Scor și decizie"], ["pasi", "Pași de verificare"], ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"]];

  /* batch 2: a finished session also shows its evidence, external data, the manual review
     (decision trail) and — for the Auditor / administrator — who accessed the evidence */
  const tabsOf = (s) => {
    if (ui.mode === "review") return REVIEW_TABS;
    if (!isHistorical(s)) return TABS_ACTIVE;
    const audit = ["auditor", "admin"].includes(role());
    return [
      ["general", "Date generale", "page-text"], ["scor", "Scor și decizie"], ["pasi", "Pași de verificare"],
      ...(s.evidence ? [["dovezi", "Dovezi"]] : []), ...(s.external ? [["surse", "Surse externe"]] : []),
      ...(s.review ? [["revizie", "Revizie manuală"]] : []), ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"],
      ...(audit ? [["acces", "Acces la dovezi"]] : [])
    ];
  };
  const tabCount = (s, id) => {
    if (id === "pasi") return [s.steps.length];
    if (id === "jurnal") return [s.events.length];
    if (id === "dovezi") return [s.evidence?.items.length || 0];
    if (id === "surse") { const n = mismatches(s); return n ? [n, "danger"] : null; }
    if (id === "acces") return [(s.evidenceAccess || []).length];
    return null;
  };

  /* Plan de verificare — the dosar trajectory (Traiectoria dosarului), one column per step:
     Inițiere · the use case's steps · Decizie, with the „Acum / Urmează” callout under it */
  const renderPlan = (s) => {
    const hist = isHistorical(s);
    const progress = progressOf(s);
    const short = (iso) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
    const time = (iso) => api.formatTime(iso);
    const reviewing = s.status === "În revizie manuală";
    const decisionState = hist
      ? (s.decision === "Respins" || ["Abandonată", "Expirată", "Eroare"].includes(s.status) ? "rejected" : s.decision === "Revizuire manuală" ? "paused" : "done")
      : reviewing ? "current" : "todo";
    const decisionLabel = hist ? (s.decision === "Fără decizie" ? s.status : s.decision) : reviewing ? "Revizie manuală" : "Decizie";
    const steps = [
      { label: "Inițiere", state: "done", meta: `${short(s.startedAt)}, ${time(s.startedAt)}<br>${esc(client(s.clientId).name)}` },
      ...s.steps.map((step) => ({
        label: step.label,
        state: step.status === "done" ? "done" : step.status === "failed" ? "rejected" : step.status === "current" ? (s.status === "Așteaptă utilizatorul" ? "paused" : "current") : hist ? "skipped" : "todo",
        meta: step.completedAt ? `${short(step.completedAt)}, ${time(step.completedAt)}<br>${step.score != null ? `scor ${num(step.score)}` : "fără scor"}` : step.status === "current" ? `în curs<br>${esc(step.provider.split(" — ")[0])}` : step.optional ? "opțional" : ""
      })),
      { label: decisionLabel, state: decisionState, meta: hist && s.completedAt ? `${short(s.completedAt)}, ${time(s.completedAt)}<br>${s.finalScore != null ? `scor ${num(s.finalScore)}` : "fără scor"}` : reviewing ? "operator" : "" }
    ];

    /* Acum / Urmează */
    let title; let meta; let next = "";
    let calloutIcon = "time-filled";
    let tone = "info";
    let extra = "";
    if (hist) {
      /* the outcome hangs under the plan, like „Acum” on an active session (user, 2026-10-13):
         tone by decision, title = the plan's last step word + the final score */
      const out = decisionOutcome(s);
      tone = out.tone;
      calloutIcon = out.icon;
      title = out.title;
      meta = out.why;
      extra = out.config;
      if (s.decision === "Revizuire manuală") next = "Un operator decide Acceptat sau Respins în lista de revizie manuală.";
    } else if (reviewing) {
      calloutIcon = "pause";
      title = "Acum: În revizie manuală";
      const sc = scoreOf(s);
      meta = `de ${ago(s.lastActivityAt).replace("acum ", "")} · scor ponderat ${num(sc)}, între pragurile de respingere și de acceptare`;
      next = "Un operator verifică dovezile și decide Acceptat sau Respins.";
    } else if (!progress.current) {
      title = "Acum: Așteaptă primul pas";
      meta = `inițiată ${ago(s.startedAt)}`;
      next = `${s.steps[0]?.label || "Primul pas"}, după ce utilizatorul deschide fluxul în aplicația clientului.`;
    } else {
      const cur = progress.current;
      if (s.status === "Așteaptă utilizatorul") calloutIcon = "pause";
      title = `Acum: ${s.status === "Așteaptă utilizatorul" ? "Așteaptă utilizatorul" : s.status === "Așteaptă furnizorul" ? "Așteaptă furnizorul" : cur.label}`;
      meta = `${s.status === "Așteaptă utilizatorul" || s.status === "Așteaptă furnizorul" ? `${cur.label} · ` : ""}${cur.provider} · ultima activitate ${ago(s.lastActivityAt)}`;
      const after = s.steps.slice(s.steps.indexOf(cur) + 1);
      next = after.length ? `${after[0].label}${after[0].optional ? " (opțional)" : ""}${after.length > 1 ? `, apoi încă ${after.length - 1} ${after.length - 1 === 1 ? "pas" : "pași"}` : ""}, apoi decizia automată.` : "Decizia automată pe baza scorului ponderat.";
    }

    return trajectory("Plan de verificare", steps, { tone, icon: calloutIcon, title, meta, extra, next });
  };

  /* the dosar trajectory (Traiectoria dosarului) — the shared component (js/trajectory.js) — with
     the callout hanging under it (.e-permits-trajectory + .e-permits-callout-wrap) — Plan de
     verificare, Traseul reviziei. Step meta here is already escaped HTML („date<br>scor …”). */
  const TRAJ_SR = { paused: "în așteptare" };
  const trajectory = (heading, steps, c) => `
      <section class="e-permits-dosar-profil__section e-permits-trajectory-section">
        <h2 class="e-permits-dosar-profil__section-title">${esc(heading)}</h2>
        ${window.GEAPTrajectory?.html({ steps: steps.map((step) => ({ label: step.label, state: step.state, metaHtml: step.meta || "", sr: TRAJ_SR[step.state] })) }) || ""}
        <div class="e-permits-callout-wrap">
          <div class="e-permits-callout e-permits-callout--${c.tone || "info"}" role="status">
            <span class="e-permits-callout__icon" aria-hidden="true">${icon(c.icon, 24)}</span>
            <div class="e-permits-callout__content">
              <p class="e-permits-callout__title">${esc(c.title)}</p>
              ${c.meta ? `<p class="e-permits-callout__meta">${esc(c.meta)}</p>` : ""}
              ${c.extra ? `<p class="e-permits-callout__meta">${esc(c.extra)}</p>` : ""}
              ${c.next ? `<p class="e-permits-callout__text"><strong>Urmează:</strong> ${esc(c.next)}</p>` : ""}
            </div>
          </div>
        </div>
      </section>`;

  /* US-UI-05 decision + why, shown as the callout under „Plan de verificare”. A session
     decided by operators (manual review) says so. */
  const decisionOutcome = (s) => {
    const tone = { Acceptat: "success", Respins: "danger", "Revizuire manuală": "warning" }[s.decision] || "neutral";
    const ic = { success: "circle-checkmark-filled", danger: "circle-error-filled", warning: "pause", neutral: s.status === "Eroare" ? "circle-error-filled" : "circle-info-filled" }[tone];
    const title = s.decision === "Fără decizie" ? `Fără decizie · sesiune ${s.status.toLocaleLowerCase("ro")}` : `${s.decision} · scor final ${num(s.finalScore)}`;
    const byReview = s.review?.result;
    const why = byReview
      ? `Decis în revizie manuală${s.review.mode === "multi" ? ` (${s.review.rule.toLocaleLowerCase("ro")})` : ` de ${s.review.assignees[0]?.name || "operator"}`}: ${s.review.assignees.find((a) => a.decision === byReview.decision)?.reasonLabel || ""}.`
      : {
        Acceptat: `Scorul final ${num(s.finalScore)} atinge pragul de acceptare ${num(s.scoring.accept)}.`,
        Respins: `Scorul final ${num(s.finalScore)} este sub pragul de respingere ${num(s.scoring.reject)}.`,
        "Revizuire manuală": `Scorul final ${num(s.finalScore)} este între pragul de respingere ${num(s.scoring.reject)} și cel de acceptare ${num(s.scoring.accept)}.`
      }[s.decision] || { "Abandonată": "Utilizatorul a închis fluxul înainte de ultimul pas.", "Expirată": "Fără activitate 30 de minute.", Eroare: "Jobul de verificare a eșuat după 3 încercări." }[s.status] || "";
    return { tone, icon: ic, title, why, config: `Configurație: ${s.scoring.name} · ${s.scoring.aggregation}` };
  };

  const sessionRows = (s) => {
    const uc = useCase(s.useCaseCode);
    const c = client(s.clientId);
    const hist = isHistorical(s);
    return [
      ["Client", `${esc(c.name)} <span class="e-permits-dosar-profil__termen-meta">${esc(c.org)}</span>`],
      ["Caz de utilizare", esc(uc.name)],
      ["Nivel de asigurare", api.renderTag(s.ial, "neutral")],
      ["Statut", api.renderTag(s.status, (hist ? FINAL_TONES : ACTIVE_TONES)[s.status])],
      ["Început la", esc(api.formatStamp(s.startedAt))],
      ...(hist
        ? [["Finalizat la", esc(api.formatStamp(s.completedAt))], ["Durată", esc(duration(s.durationSeconds))]]
        : [["Ultima activitate", `${esc(api.formatStamp(s.lastActivityAt))} <span class="e-permits-dosar-profil__termen-meta">${esc(ago(s.lastActivityAt))}</span>`]]),
      ["Versiune flux", esc(s.flowVersion)]
    ];
  };

  const identifierRows = (s) => [
    ["ID sesiune", api.renderProfileCopyCode(s.id, `Copiază ${s.id}`)],
    ["ID corelare", api.renderProfileCopyCode(s.correlationId, `Copiază ${s.correlationId}`)],
    ["Client ID", api.renderProfileCopyCode(s.clientId, `Copiază ${s.clientId}`)],
    ["Cod caz de utilizare", api.renderProfileCopyCode(s.useCaseCode, `Copiază ${s.useCaseCode}`)]
  ];

  const renderGeneral = (s) => {
    const hist = isHistorical(s);
    const job = hist ? (s.job
      ? api.renderInfoCard("Job de verificare", [
        ["Job ID", api.renderProfileCopyCode(s.job.id, `Copiază ${s.job.id}`)],
        ["Worker", esc(s.job.worker)],
        ["Început la", esc(api.formatStamp(s.job.startedAt))],
        ["Finalizat la", esc(api.formatStamp(s.job.completedAt))],
        ["Număr încercări", s.job.attempts > 1 ? `${s.job.attempts} ${api.renderTag("Reîncercat", "warning")}` : String(s.job.attempts)]
      ])
      : api.renderPassportEmpty("Job de verificare", "Nu a pornit niciun job de verificare. Sesiunea s-a încheiat înainte ca pașii să fie verificați.", "", "time")) : "";
    return `${renderPlan(s)}${api.renderInfoCard("Sesiune", sessionRows(s))}${api.renderInfoCard("Identificatori", identifierRows(s))}${job}`;
  };

  const STEP_GROUPS = [["done", "Finalizați"], ["failed", "Nereușiți"], ["current", "Pas curent"], ["pending", "În așteptare"]];
  const renderSteps = (s) => {
    const hist = isHistorical(s);
    const item = (step) => {
      const badges = [api.renderTag(step.code, "neutral")];
      if (step.status === "current") badges.push(api.renderTag(s.status === "Așteaptă utilizatorul" ? "Așteaptă utilizatorul" : "Pas curent", s.status === "Așteaptă utilizatorul" ? "warning" : "brand"));
      if (step.status === "failed") badges.push(api.renderTag(step.error ? "Eroare" : "Sub prag", "danger"));
      if (step.status === "pending" && hist) badges.push(api.renderTag("Nerulat", "neutral"));
      if (step.optional) badges.push(api.renderTag("Opțional", "neutral"));
      const meta = [esc(step.provider)];
      if (step.fallback) meta.push(`rezervă: ${esc(step.fallback)}`);
      meta.push(step.score != null ? `scor ${num(step.score)} / prag ${num(step.threshold)}` : `prag ${num(step.threshold)}`);
      meta.push(`pondere ${num(step.weight)}`);
      const meta2 = step.error ? [esc(step.error)] : step.completedAt ? [esc(api.formatStamp(step.completedAt))] : null;
      return { title: esc(step.label), plainTitle: step.label, badges, meta, meta2 };
    };
    const groups = STEP_GROUPS.map(([state, label]) => ({ label, items: s.steps.filter((step) => step.status === state).map(item) })).filter((g) => g.items.length);
    return api.renderStackedList("Pași de verificare", groups, { meta: `${progressOf(s).done} din ${s.steps.length} finalizați · flux ${s.flowVersion}` });
  };

  const renderDevice = (s) => {
    const d = s.device;
    if (!d) return api.renderPassportEmpty("Dispozitiv", "Fără date despre dispozitiv. SDK-ul nu a trimis încă înregistrarea dispozitivului.", "", "phone");
    return api.renderInfoCard("Dispozitiv", [
      ["Tip dispozitiv", esc(d.type)],
      ["Platformă", esc(d.platform)],
      ["Model", esc(d.model)],
      ["Sistem de operare", esc(d.os)],
      ["Versiune aplicație", esc(d.app)],
      ["Integritate dispozitiv", api.renderTag(d.integrity, d.integrity === "Integritate OK" ? "success" : "danger")],
      ["Adresă IP", api.renderProfileCopyCode(d.ip, `Copiază ${d.ip}`)],
      ["Ultima sincronizare", esc(api.formatStamp(d.syncedAt))]
    ]);
  };

  /* US-UI-05: Tip pas / Scor / Pondere + the contribution bar (scor × pondere) */
  const renderScore = (s) => {
    const scored = s.steps.filter((step) => step.score != null);
    const totalWeight = scored.reduce((sum, step) => sum + step.weight, 0) || 1;
    const maxContribution = Math.max(...scored.map((step) => (step.score * step.weight) / totalWeight), 0.01);
    const breakdown = scored.length ? `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Descompunerea scorului</h2>
        <div class="e-permits-sum-list">
          <div class="e-permits-workplace__table-wrap e-permits-ekyc-breakdown">
            <table class="e-permits-workplace__table e-permits-ekyc-breakdown__table">
              <thead><tr><th scope="col">Tip pas</th><th scope="col">Scor</th><th scope="col">Pondere</th><th scope="col">Contribuție</th></tr></thead>
              <tbody>
                ${scored.map((step) => {
                  const contribution = (step.score * step.weight) / totalWeight;
                  return `<tr>
                    <td>${identity(step.label, step.code)}</td>
                    <td><span class="e-permits-ekyc-score">${num(step.score)}</span></td>
                    <td>${num(step.weight)}</td>
                    <td><span class="e-permits-ekyc-progress">${meter([[contribution, step.status === "failed" ? "danger" : "brand"]], { max: maxContribution, label: `Contribuție ${num(contribution)}` })}<span class="e-permits-ekyc-progress__count">${num(contribution)}</span></span></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="e-permits-sum-list__total"><span>Scor final (${esc(s.scoring.aggregation.toLocaleLowerCase("ro"))})</span><strong>${num(s.finalScore)}</strong></div>
        </div>
      </section>` : api.renderPassportEmpty("Descompunerea scorului", "Niciun pas nu a produs un scor, deci nu există un scor final.", "", "chart");
    const config = api.renderInfoCard("Configurație de scoring aplicată", [
      ["Denumire", esc(s.scoring.name)],
      ["Agregare", esc(s.scoring.aggregation)],
      ["Prag de acceptare", num(s.scoring.accept)],
      ["Prag de respingere", num(s.scoring.reject)],
      ["Scor minim de încredere", num(s.scoring.minConfidence)]
    ]);
    const review = s.review ? api.renderInfoCard("Revizie manuală", [
      ["Statut revizie", api.renderTag(s.review.status, REVIEW_TONES[s.review.status])],
      ["Tip revizie", s.review.mode === "multi" ? `Multi-operator <span class="e-permits-dosar-profil__termen-meta">${esc(s.review.rule)}</span>` : "Un operator"],
      ["Operatori", s.review.assignees.length ? esc(s.review.assignees.map((a) => a.name).join(", ")) : api.renderTag("Nealocată", "warning")],
      ["Decizie finală", s.review.result ? api.renderTag(s.review.result.decision, VOTE_TONES[s.review.result.decision]) : "În așteptare"]
    ]) : "";
    return `${breakdown}${review}${config}`;
  };

  const renderJournal = (s) => api.renderEventTimeline("Jurnal", s.events, { meta: "Jurnalizat prin MLog" });

  const renderSessionBody = (s, tab) => {
    if (DEMO === "incarcare") return api.renderEmptyState({ title: "Se încarcă sesiunea…", text: "Detaliile vin din serviciul de monitorizare.", loading: true });
    switch (tab) {
      case "pasi": return renderSteps(s);
      case "dispozitiv": return renderDevice(s);
      case "scor": return `${renderScore(s)}${renderDecisionTrail(s)}`;
      case "jurnal": return renderJournal(s);
      case "dovezi": return renderEvidence(s);
      case "surse": return renderExternal(s);
      case "revizie": return s.review ? renderReviewTab(s) : renderGeneral(s);
      case "acces": return renderAccessTab(s);
      default: return renderGeneral(s);
    }
  };

  const renderSessionHeader = (s) => {
    const hist = isHistorical(s);
    const uc = useCase(s.useCaseCode);
    api.els.dosarProfilTitleRow.innerHTML = api.renderPageHeaderTop({
      crumbs: [{ label: hist ? "Sesiuni istorice" : "Sesiuni active", attr: "data-dosar-profil-crumb-back" }, { label: s.id }],
      title: client(s.clientId).name,
      caption: role() === "auditor" ? "Doar citire · accesul se jurnalizează" : ""
    });
    const meta = hist
      ? [
        ["Caz de utilizare", esc(uc.name)],
        ["Decizie", api.renderTag(s.decision, DECISION_TONES[s.decision])],
        ["Scor final", `<span class="e-permits-ekyc-score">${num(s.finalScore)}</span>`],
        ["Statut", api.renderTag(s.status, FINAL_TONES[s.status])],
        ["Nivel asigurare", api.renderTag(s.ial, "neutral")],
        ["Finalizat la", esc(api.formatStamp(s.completedAt))],
        ["Durată", esc(duration(s.durationSeconds))]
      ]
      : [
        ["Caz de utilizare", esc(uc.name)],
        ["Statut", api.renderTag(s.status, ACTIVE_TONES[s.status])],
        ["Nivel asigurare", api.renderTag(s.ial, "neutral")],
        ["Început la", esc(api.formatStamp(s.startedAt))],
        ["Timp scurs", `<span class="e-permits-ekyc-timer" data-ekyc-elapsed="${esc(s.startedAt)}">${clock(secondsSince(s.startedAt))}</span>${api.renderTag("Live", "success")}`],
        ["Ultima activitate", esc(ago(s.lastActivityAt))]
      ];
    api.els.dosarProfilSummary.innerHTML = api.renderPageHeaderMeta(meta);
    api.watchPageHeaderMeta(api.els.dosarProfilSummary);
  };

  const renderSessionTabs = (s) => {
    api.els.dosarProfilTabs.innerHTML = tabsOf(s).map(([id, label, ic]) => {
      const active = ui.tab === id;
      const count = tabCount(s, id);
      return `<button class="tab-button${active ? " active" : ""}" id="ekyc-tab-${id}" type="button" role="tab" aria-controls="ekyc-panel" aria-selected="${active}" tabindex="${active ? 0 : -1}" data-ekyc-tab="${id}">
        ${ic ? icon(ic) : ""}<span>${esc(label)}</span>${count && count[0] ? api.renderPageHeaderTabCount(count[0], count[1]) : ""}
      </button>`;
    }).join("");
  };

  const renderSessionPanel = () => {
    const s = findSession(ui.session);
    if (!s) return;
    renderSessionTabs(s);
    const body = api.els.dosarProfilPanelBody;
    body.id = "ekyc-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `ekyc-tab-${ui.tab}`);
    if (ui.tab === "dovezi" && evidenceGate(s) === "granted") touchEvidence(s);
    body.innerHTML = ui.mode === "review" ? renderReviewBody(s, ui.tab) : renderSessionBody(s, ui.tab);
    history.replaceState(null, "", `${location.pathname}${location.search}#${ui.mode === "review" ? "revizie" : "sesiune"}/${s.id}/${ui.tab}`);
  };

  const setBackLabel = (label) => {
    const span = api.els.dosarProfilBackShell?.querySelector("span");
    if (span) span.textContent = label;
  };

  /* AC US-UI-04: „sesiunea s-a încheiat între timp” — the stale active row leads to the result */
  const endedMeanwhile = (id) => DEMO === "incheiata" && db.endedIds?.includes(id);

  const openSession = (id, tab = "general") => {
    const s = findSession(id);
    const fromActive = endedMeanwhile(id);
    const hist = s ? isHistorical(s) : ui.view === "ekyc-history";
    const nav = hist ? "ek-history" : "ek-active";
    /* the list the crumb goes back to */
    if (!document.querySelector(`[data-nav-id="${nav}"].is-active`) || fromActive || !document.querySelector(`[data-workplace][data-registry-kind="${hist ? "ekyc-history" : "ekyc-active"}"]`)) {
      api.setActiveNav(nav);
      showView(hist ? "ekyc-history" : "ekyc-active");
    }
    ui.session = id;
    ui.mode = "session";
    if (s && role() === "auditor") logAccess({ action: "Vizualizare detalii sesiune", sessionId: id, reason: "Consultare (doar citire)", ref: "" });
    if (fromActive) api.showShellToast(`Sesiunea ${id} s-a încheiat între timp. Vezi rezultatul în Sesiuni istorice.`, "info", "Sesiune încheiată");
    hideDash();
    api.openProfilePanel();
    setBackLabel(hist ? "Înapoi la sesiuni istorice" : "Înapoi la sesiuni active");
    if (!s) {
      api.els.dosarProfilTitleRow.innerHTML = api.renderPageHeaderTop({ crumbs: [{ label: "Sesiuni active", attr: "data-dosar-profil-crumb-back" }, { label: id }], title: id });
      api.els.dosarProfilSummary.innerHTML = "";
      api.els.dosarProfilTabs.innerHTML = "";
      api.els.dosarProfilPanelBody.innerHTML = api.renderEmptyState({
        title: "Sesiunea nu a fost găsită",
        text: `Nu există o sesiune cu ID-ul ${id}. Verifică ID-ul sau caută sesiunea în listă.`,
        icon: "search",
        actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-dosar-profil-crumb-back>Înapoi la sesiuni</button>'
      });
      history.replaceState(null, "", `${location.pathname}${location.search}#sesiune/${id}`);
      return;
    }
    ui.tab = tabsOf(s).some(([key]) => key === tab) ? tab : "general";
    renderSessionHeader(s);
    renderSessionPanel();
    api.els.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  };

  /* ==== batch 2 (2026-10-13): manual review (EPIC-06) + audit (EPIC-07) ===================
     US-06-01 89252 random allocation · US-06-02 89253 take / decide · US-06-03 89255 evidence ·
     US-06-04 89256 RSP via MConnect · US-06-05 89258 decision with mandatory reason ·
     US-06-06 89259 applicant notified · US-06-07 89261 result callback · US-06-08 89263
     multi-operator · US-07-03 89269 evidence access · US-07-04 89271 search · US-07-05 89272
     auditor detail · US-07-06 89274 reports · US-07-07 89275 export.
     Roles: Operator (revizie) — his allocated sessions only; Supervizor — the whole queue,
     (re)allocation, multi-operator view; Auditor — read-only history, evidence on request,
     Rapoarte, Jurnal de acces. Every evidence access / search / export is logged. */
  const role = () => api.currentAssignment()?.roleId || "admin";
  const ROLE_LABELS = { admin: "Administrator platformă", operator: "Operator (revizie)", supervisor: "Supervizor", auditor: "Auditor" };
  const me = () => document.querySelector(".e-permits-shell__user-name")?.textContent.trim() || "Anastasia Cojocaru";
  const isoOf = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
  const nowIso = () => isoOf(now());
  const shortDate = (iso) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  const shortStamp = (iso) => `${shortDate(iso)}, ${api.formatTime(iso)}`;
  const maskIdnp = (idnp) => (idnp ? `${idnp.slice(0, 4)}•••••${idnp.slice(-4)}` : "—");
  const svgPlay = '<svg class="icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4.2v11.6a.6.6 0 0 0 .9.5l9.3-5.8a.6.6 0 0 0 0-1L7.4 3.7a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>';

  /* ---- review state ---- */
  const REVIEW_TONES = { "Nealocată": "warning", "Alocată": "violet", "În lucru": "brand", "Decizie trimisă": "neutral", "Finalizată": "success" };
  const VOTE_TONES = { Acceptat: "success", Respins: "danger" };
  const reviewSessions = () => [...db.active, ...db.history].filter((s) => s.review);
  const myPart = (s) => s.review?.assignees.find((a) => a.name === me()) || null;
  const votes = (s) => s.review.assignees.filter((a) => a.decision);
  const pendingVotes = (s) => s.review.assignees.filter((a) => !a.decision);
  /* the operator sees his own state; the supervisor the review's */
  const reviewStatusFor = (s) => {
    if (role() !== "operator") return s.review.status;
    const part = myPart(s);
    if (!part) return s.review.status;
    if (s.review.status === "Finalizată") return "Finalizată";
    if (part.decision) return "Decizie trimisă";
    return part.state === "Preluată" ? "În lucru" : "Alocată";
  };
  const autoScore = (s) => (s.finalScore != null ? s.finalScore : scoreOf(s));
  const dueMeta = (s) => {
    if (!s.review.dueAt) return "după alocare";
    if (s.review.status === "Finalizată") return "respectat";
    const left = Math.round((new Date(s.review.dueAt) - now()) / 60000);
    if (left < 0) return `depășit cu ${left > -60 ? `${-left} min` : `${Math.round(-left / 60)} h`}`;
    return left < 60 ? `în ${left} min` : `în ${Math.floor(left / 60)} h ${two(left % 60)} min`;
  };
  const overdue = (s) => s.review.dueAt && s.review.status !== "Finalizată" && new Date(s.review.dueAt) < now();
  const aggregate = (s) => {
    const n = s.review.assignees.length;
    const need = Math.floor(n / 2) + 1;
    const acc = votes(s).filter((a) => a.decision === "Acceptat").length;
    const rej = votes(s).filter((a) => a.decision === "Respins").length;
    return { n, need, acc, rej, decided: acc + rej, result: acc >= need ? "Acceptat" : rej >= need ? "Respins" : "" };
  };
  const logEvent = (s, type, status, detail, user = me()) => { s.events.unshift({ at: nowIso(), type, status, detail, user }); };

  /* ---- Revizie manuală: the queue (registry kind ekyc-review) ---- */
  const reviewRow = (s) => {
    const uc = useCase(s.useCaseCode);
    const c = client(s.clientId);
    const ag = aggregate(s);
    return {
      id: s.id, session: s, client: c.name, org: c.org, cazUtilizare: uc.name, codCaz: uc.code, nivel: s.ial,
      statut: reviewStatusFor(s), tip: s.review.mode === "multi" ? "Multi-operator" : "Un operator", decizii: `${ag.decided} din ${ag.n}`,
      scor: autoScore(s), motiv: s.review.why, operatori: s.review.assignees.map((a) => a.name), alocata: s.review.allocatedAt, termen: s.review.dueAt
    };
  };
  const buildReviewDb = (scope) => {
    const sup = scope === "all";
    const rows = emptyRows() ? [] : reviewSessions().filter((s) => sup || myPart(s)).map(reviewRow);
    const statuses = sup ? ["Nealocată", "Alocată", "În lucru", "Finalizată"] : ["Alocată", "În lucru", "Decizie trimisă", "Finalizată"];
    return {
      kind: "ekyc-review",
      fieldCount: sup ? 10 : 9,
      statuses: statusesOf(REVIEW_TONES),
      columns: {
        client: { label: "Sesiune", width: 200, sortable: true },
        cazUtilizare: { label: "Caz de utilizare", width: 240, fill: true, sortable: true },
        statut: { label: "Statut revizie", width: 160, sortable: true },
        tip: { label: "Tip revizie", width: 160, sortable: true },
        scor: { label: "Scor automat", width: 120, sortable: true },
        operatori: { label: "Operatori", width: 220 },
        alocata: { label: "Alocată la", width: 170, sortable: true },
        termen: { label: "Termen", width: 170, sortable: true },
        actiuni: { label: "", width: sup ? 152 : 140 }
      },
      views: {
        [scope]: {
          title: sup ? "Coada de revizie" : "Sesiunile mele de revizie",
          selectable: false,
          toolbarLabel: sup ? "Filtrare coadă de revizie" : "Filtrare sesiuni de revizie",
          searchPlaceholder: "Căutare rapidă după ID, client sau caz de utilizare",
          columns: ["client", "cazUtilizare", "statut", "tip", "scor", ...(sup ? ["operatori"] : []), "alocata", "termen", "actiuni"],
          tabs: [
            { id: "all", label: "Toate", filter: "all" },
            ...statuses.map((label) => ({ id: label, label: { "Nealocată": "Nealocate", "Alocată": sup ? "Alocate" : "De preluat", "În lucru": "În lucru", "Decizie trimisă": "Decizie trimisă", "Finalizată": "Finalizate" }[label], filter: `rv:${label}` })),
            ...(sup ? [{ id: "multi", label: "Multi-operator", filter: "rv-mode:multi" }] : [])
          ]
        }
      },
      runtimeRows: rows
    };
  };
  const renderReviewCell = (row, key) => {
    const s = row.session;
    switch (key) {
      case "client": return identity(row.client, row.id);
      case "cazUtilizare": return identity(row.cazUtilizare, row.codCaz);
      case "statut": return api.renderTag(row.statut, REVIEW_TONES[row.statut]);
      case "tip": return identity(row.tip, s.review.mode === "multi" ? `${row.decizii} decizii` : "");
      case "scor": return row.scor == null ? '<span class="e-permits-workplace__dash">—</span>' : `<span class="e-permits-ekyc-score">${num(row.scor)}</span>`;
      case "operatori": return row.operatori.length ? identity(row.operatori.join(", "), s.review.allocation) : '<span class="e-permits-workplace__dash">—</span>';
      case "alocata": return row.alocata ? api.renderDateTime(row.alocata, s.review.allocation === "Aleatorie" ? "aleatoriu" : "manual") : '<span class="e-permits-workplace__dash">—</span>';
      case "termen": return row.termen ? `${api.renderDateTime(row.termen, dueMeta(s))}` : `<span class="e-permits-workplace__dash">—</span>`;
      case "actiuni": {
        const sup = role() === "supervisor";
        const open = s.review.status !== "Finalizată";
        return `<span class="e-permits-workplace__row-actions">${api.renderRowActions({
          primary: { label: sup ? (s.review.status === "Nealocată" ? "Alocă" : "Deschide") : "Revizuiește", attrs: sup && s.review.status === "Nealocată" ? `data-ekyc-assign="${esc(s.id)}" aria-label="Alocă sesiunea ${esc(s.id)}"` : `data-ekyc-review-open="${esc(s.id)}" aria-label="Deschide revizia sesiunii ${esc(s.id)}"` },
          menu: sup && open && s.review.status !== "Nealocată" ? [{ label: "Realocă", icon: "people", attrs: `data-ekyc-assign="${esc(s.id)}"` }] : [],
          label: s.id
        })}</span>`;
      }
      default: return esc(row[key] ?? "—");
    }
  };
  const reviewSearch = (row) => [row.id, row.session.review.id, row.client, row.org, row.cazUtilizare, row.codCaz, row.statut, row.tip, ...row.operatori].join(" ");
  const reviewSort = (row, key) => {
    /* by deadline: unallocated first (no deadline yet), then the open reviews, finished last */
    if (key === "termen") return row.session.review.status === "Nealocată" ? 0 : row.session.review.status === "Finalizată" ? 9e15 - (Date.parse(row.alocata) || 0) : Date.parse(row.termen);
    if (key === "alocata") return Date.parse(row[key]) || 0;
    if (key === "scor") return row.scor ?? -1;
    return row[key] ?? "";
  };
  const reviewFilter = (row, token) => {
    if (token.startsWith("rv:")) return row.statut === token.slice(3);
    if (token === "rv-mode:multi") return row.session.review.mode === "multi";
    return true;
  };
  const reviewEmpty = ({ query, filtered }) => {
    const base = emptyHtml("sesiunile de revizie")({ query, filtered });
    if (base || query || filtered) return base;
    return api.renderEmptyState({
      title: role() === "operator" ? "Nicio sesiune alocată ție" : "Coada de revizie este goală",
      text: role() === "operator" ? "Sesiunile care cer revizie manuală îți sunt alocate aleatoriu. Le vei vedea aici imediat ce sunt alocate." : "Nicio sesiune nu așteaptă revizie manuală.",
      icon: "face-id", bare: true
    });
  };

  /* ---- the review screen (#revizie/<id>/<tab>): session profile + Revizie tab + decision ---- */
  const REVIEW_TABS = [["revizie", "Revizie", "face-id"], ["dovezi", "Dovezi"], ["surse", "Surse externe"], ["pasi", "Pași de verificare"], ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"]];
  const mismatches = (s) => (s.external?.record ? externalRows(s).filter((r) => r.ok === false).length : 0);

  const reviewSteps = (s) => {
    const r = s.review;
    const multi = r.mode === "multi";
    const ag = aggregate(s);
    const first = r.assignees[0];
    const taken = multi ? ag.decided === ag.n || r.status === "Finalizată" : Boolean(first?.takenAt);
    const callbackOk = r.callback?.state === "Livrat";
    return [
      { label: "Trimisă în revizie", state: "done", meta: `${shortStamp(r.sentAt)}<br>scor ${num(autoScore(s))}` },
      { label: "Alocată", state: r.allocatedAt ? "done" : "paused", meta: r.allocatedAt ? `${shortStamp(r.allocatedAt)}<br>${r.allocation === "Aleatorie" ? "aleatoriu" : "de supervizor"}` : "niciun operator<br>disponibil" },
      multi
        ? { label: "Evaluări", state: r.status === "Finalizată" ? "done" : r.allocatedAt ? "current" : "todo", meta: `${ag.decided} din ${ag.n} decizii<br>${esc(r.rule.toLocaleLowerCase("ro"))}` }
        : { label: "Preluată", state: taken ? "done" : r.allocatedAt ? "current" : "todo", meta: taken ? `${shortStamp(first.takenAt)}<br>${esc(first.name)}` : r.allocatedAt ? `așteaptă<br>${esc(first?.name || "")}` : "" },
      { label: r.result ? r.result.decision : "Decizie", state: r.result ? (r.result.decision === "Acceptat" ? "done" : "rejected") : !multi && taken ? "current" : "todo", meta: r.result ? `${shortStamp(r.result.at)}<br>${multi ? "majoritate" : esc(first.name)}` : "" },
      { label: r.callback && !callbackOk ? "Transmitere eșuată" : "Rezultat transmis", state: r.callback ? (callbackOk ? "done" : "rejected") : "todo", meta: r.callback ? `${shortStamp(r.callback.at)}<br>${esc(client(s.clientId).name)}` : "" }
    ];
  };

  const reviewCallout = (s) => {
    const r = s.review;
    const part = myPart(s);
    const ag = aggregate(s);
    const mine = role() === "operator";
    if (r.result) {
      const tone = VOTE_TONES[r.result.decision];
      const who = r.mode === "multi" ? `${r.rule.toLocaleLowerCase("ro")}: ${ag[r.result.decision === "Acceptat" ? "acc" : "rej"]} din ${ag.n} operatori` : `decizia lui ${r.assignees[0].name}`;
      const reason = r.assignees.find((a) => a.decision === r.result.decision)?.reasonLabel || "";
      return { tone, icon: tone === "success" ? "circle-checkmark-filled" : "circle-error-filled", title: `${r.result.decision} · decizie finală`, meta: `${api.formatStamp(r.result.at)} · ${who}`, extra: reason ? `Motiv: ${reason}` : "", next: r.callback?.state === "Livrat" ? "" : "Retrimite rezultatul către client din „Notificări”." };
    }
    if (r.status === "Nealocată") return { tone: "warning", icon: "pause", title: "Acum: Așteaptă alocarea", meta: `trimisă ${ago(r.sentAt)} · niciun operator disponibil`, next: "Motorul o alocă aleatoriu primului operator liber; supervizorul o poate aloca manual." };
    if (mine && part && !part.takenAt) return { tone: "info", icon: "time-filled", title: "Acum: Alocată ție", meta: `aleatoriu, ${api.formatStamp(part.allocatedAt)} · termen ${api.formatTime(r.dueAt)} (${dueMeta(s)})`, next: "Preia revizia; apoi verifici dovezile și sursele externe și decizi." };
    if (mine && part && !part.decision) return { tone: overdue(s) ? "warning" : "info", icon: "time-filled", title: "Acum: În lucru", meta: `preluată de tine ${ago(part.takenAt)} · termen ${api.formatTime(r.dueAt)} (${dueMeta(s)})`, next: r.mode === "multi" ? `Decizia ta e una din ${ag.n}; decizia finală se stabilește prin majoritate.` : "Acceptă sau respinge sesiunea, cu motivare. Rezultatul se transmite imediat clientului." };
    if (mine && part?.decision) return { tone: "info", icon: "time-filled", title: "Acum: Așteaptă ceilalți operatori", meta: `ai decis ${part.decision} ${ago(part.decidedAt)} · ${ag.decided} din ${ag.n} decizii`, next: `Decizia finală: ${r.rule.toLocaleLowerCase("ro")}.` };
    const names = r.assignees.map((a) => a.name).join(", ");
    return { tone: overdue(s) ? "warning" : "info", icon: "time-filled", title: `Acum: ${r.status}`, meta: `${names} · termen ${r.dueAt ? `${api.formatTime(r.dueAt)} (${dueMeta(s)})` : "—"}`, next: r.mode === "multi" ? `${ag.decided} din ${ag.n} decizii; decizia finală se stabilește prin majoritate.` : "" };
  };

  const voteItem = (s, a) => {
    const hidden = role() === "operator" && myPart(s) && !myPart(s).decision && a.name !== me() && a.decision;
    const badges = [a.decision && !hidden ? api.renderTag(a.decision, VOTE_TONES[a.decision]) : api.renderTag(a.decision ? "Decizie înregistrată" : a.state === "Preluată" ? "În lucru" : "Alocată", a.decision ? "neutral" : a.state === "Preluată" ? "brand" : "violet")];
    if (a.name === me()) badges.push(api.renderTag("Tu", "neutral"));
    const meta = [`alocată ${shortStamp(a.allocatedAt)}`];
    if (a.takenAt) meta.push(`preluată ${shortStamp(a.takenAt)}`);
    if (a.decidedAt) meta.push(`decizie ${shortStamp(a.decidedAt)}`);
    return {
      title: esc(a.name), plainTitle: a.name, badges, meta,
      meta2: hidden ? ["Decizia celorlalți operatori se vede după ce o înregistrezi pe a ta (evaluare independentă)."] : a.decision ? [`<strong>${esc(a.reasonLabel)}.</strong> ${esc(a.reason)}`] : null
    };
  };

  const renderVotes = (s) => {
    const r = s.review;
    if (r.mode !== "multi") {
      const a = r.assignees[0];
      if (!a?.decision) return "";
      return api.renderInfoCard("Decizia operatorului", [
        ["Decizie", api.renderTag(a.decision, VOTE_TONES[a.decision])],
        ["Operator", esc(a.name)],
        ["Motiv", esc(a.reasonLabel)],
        ["Motivare", esc(a.reason)],
        ["Înregistrată la", esc(api.formatStamp(a.decidedAt))]
      ]);
    }
    const ag = aggregate(s);
    const hideTotal = role() === "operator" && myPart(s) && !myPart(s).decision;
    const total = r.result ? `${api.renderTag(r.result.decision, VOTE_TONES[r.result.decision])} <span>${ag[r.result.decision === "Acceptat" ? "acc" : "rej"]} din ${ag.n}</span>`
      : hideTotal ? `<span>${ag.decided} din ${ag.n} decizii</span>` : `<span>În așteptare · ${ag.acc} acceptat, ${ag.rej} respins din ${ag.n}</span>`;
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Decizii operatori</h2>
          <span class="e-permits-dosar-profil__section-meta">${esc(r.rule)} · evaluare independentă</span>
        </div>
        <div class="e-permits-sum-list">
          <div class="e-permits-stack"><div class="e-permits-stack__group"><ul class="e-permits-stack__list" role="list">${r.assignees.map((a) => api.renderStackItem(voteItem(s, a))).join("")}</ul></div></div>
          <div class="e-permits-sum-list__total e-permits-ekyc-aggregate"><span>Decizie agregată</span><strong>${total}</strong></div>
        </div>
      </section>`;
  };
  const renderNotifications = (s) => {
    const r = s.review;
    const n = r.notification;
    const canRetry = ["supervisor", "admin"].includes(role()) || Boolean(myPart(s));
    const items = [{
      title: "Solicitant · revizia manuală a început", plainTitle: "Notificare solicitant",
      badges: [api.renderTag(n.state, n.state === "Livrată" ? "success" : "danger")],
      meta: [esc(n.channel), esc(n.to), esc(shortStamp(n.at))],
      meta2: [n.state === "Livrată" ? "„Verificarea identității tale continuă cu un operator. Primești rezultatul în cel mult 8 ore.”" : `${n.attempts} încercări eșuate prin MNotify (destinatar indisponibil).`],
      actionsHtml: n.state !== "Livrată" && canRetry ? `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry-notify="applicant">${icon("rotate-arrow", 16)}<span>Retrimite</span></button>` : ""
    }];
    if (r.callback) {
      const ok = r.callback.state === "Livrat";
      items.push({
        title: `Client · rezultatul reviziei (${r.result.decision === "Acceptat" ? "APROBAT" : "RESPINS"})`, plainTitle: "Callback client",
        badges: [api.renderTag(ok ? "Livrat" : "Eșuat", ok ? "success" : "danger")],
        meta: [esc(client(s.clientId).name), esc(r.callback.http), `${r.callback.attempts} ${r.callback.attempts === 1 ? "încercare" : "încercări"}`, esc(shortStamp(r.callback.at))],
        meta2: [ok ? esc(r.callback.url) : esc(r.callback.next)],
        actionsHtml: !ok && canRetry ? `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry-notify="client">${icon("rotate-arrow", 16)}<span>Retrimite</span></button>` : ""
      });
    } else {
      items.push({ title: "Client · rezultatul reviziei", plainTitle: "Callback client", badges: [api.renderTag("După decizie", "neutral")], meta: [esc(client(s.clientId).name), "callback cu APROBAT / RESPINS imediat după decizia finală"] });
    }
    return api.renderStackedList("Notificări", [{ label: "", items }], { meta: "MNotify · callback client" });
  };

  const renderReviewTab = (s) => {
    const r = s.review;
    const allocation = api.renderInfoCard("Alocare", [
      ["ID revizie", api.renderProfileCopyCode(r.id, `Copiază ${r.id}`)],
      ["Mod de alocare", esc(r.allocation)],
      ["Tip revizie", r.mode === "multi" ? `Multi-operator <span class="e-permits-dosar-profil__termen-meta">${esc(r.rule)}</span>` : "Un operator"],
      ["Operatori", r.assignees.length ? esc(r.assignees.map((a) => a.name).join(", ")) : api.renderTag("Nealocată", "warning")],
      ["Termen", r.dueAt ? `${esc(api.formatStamp(r.dueAt))} <span class="e-permits-dosar-profil__termen-meta">${esc(dueMeta(s))}</span>${overdue(s) ? ` ${api.renderTag("Termen depășit", "danger")}` : ""}` : '<span class="e-permits-workplace__dash">—</span>']
    ]);
    const auto = api.renderInfoCard("Rezultat automat", [
      ["Scor ponderat", `<span class="e-permits-ekyc-score">${num(autoScore(s))}</span>`],
      ["Prag de acceptare", num((s.scoring || useCase(s.useCaseCode).scoring).accept)],
      ["Prag de respingere", num((s.scoring || useCase(s.useCaseCode).scoring).reject)],
      ["Motivul reviziei", esc(r.why)],
      ["Surse externe", s.external?.state === "Indisponibil" ? api.renderTag("RSP indisponibil", "warning") : mismatches(s) ? api.renderTag(`${mismatches(s)} ${mismatches(s) === 1 ? "câmp diferă" : "câmpuri diferă"} de RSP`, "danger") : s.external ? api.renderTag("Concordă cu RSP", "success") : "—"]
    ]);
    return `${trajectory("Traseul reviziei", reviewSteps(s), reviewCallout(s))}${renderVotes(s)}${auto}${renderNotifications(s)}${allocation}`;
  };

  /* ---- Dovezi (US-06-03, US-07-03, US-07-05 CA-3) ---- */
  const EVIDENCE_IMG = { "document-front": ["assets/ekyc/id-front.svg"], "document-back": ["assets/ekyc/id-back.svg"], selfie: ["assets/ekyc/selfie.svg"], nfc: ["assets/ekyc/nfc.svg"], liveness: ["assets/ekyc/liveness-1.svg", "assets/ekyc/liveness-2.svg", "assets/ekyc/liveness-3.svg"] };
  const ACCESS_MINUTES = 15;
  /* granted | request | denied — operator: only sessions allocated to him; everyone else
     asks with a reason, for 15 minutes, logged */
  const evidenceGate = (s) => {
    if (role() === "operator") return myPart(s) ? "granted" : "denied";
    const grant = ui.grants[s.id];
    return grant && new Date(grant.until) > now() ? "granted" : "request";
  };
  const logAccess = (entry) => {
    const full = { at: nowIso(), user: me(), role: ROLE_LABELS[role()], ...entry };
    db.accessLog.unshift(full);
    const s = entry.sessionId ? findSession(entry.sessionId) : null;
    if (s) s.evidenceAccess = [full, ...(s.evidenceAccess || [])];
    return full;
  };
  const stepScore = (s, code) => {
    const step = s.steps.find((x) => x.code === code);
    return step && step.score != null ? `${step.label} ${num(step.score)} / prag ${num(step.threshold)}` : "";
  };
  const evidenceTile = (s, item) => {
    const src = EVIDENCE_IMG[item.kind][0];
    const video = item.kind === "liveness";
    return `
      <li class="e-permits-ekyc-evidence__item">
        <button class="e-permits-ekyc-evidence__thumb${item.kind.startsWith("document") ? " e-permits-ekyc-evidence__thumb--doc" : ""}" type="button" data-ekyc-evidence="${esc(item.id)}" aria-haspopup="dialog" aria-label="${video ? "Redă" : "Deschide"} ${esc(item.label)}">
          <img src="${src}" alt="" loading="lazy">
          ${video ? `<span class="e-permits-ekyc-evidence__play" aria-hidden="true">${svgPlay}<span>${num(item.seconds, 1)} s</span></span>` : ""}
        </button>
        <span class="e-permits-ekyc-evidence__title">${esc(item.label)}</span>
        <span class="e-permits-ekyc-evidence__meta">${esc(item.format)} · ${esc(item.size)} · ${esc(shortStamp(item.at))}</span>
      </li>`;
  };
  const evidenceSection = (s, title, items, meta) => (items.length ? `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
          ${meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(meta)}</span>` : ""}
        </div>
        <ul class="e-permits-ekyc-evidence" role="list">${items.map((item) => evidenceTile(s, item)).join("")}</ul>
      </section>` : "");

  const renderEvidence = (s) => {
    if (!s.evidence) return api.renderPassportEmpty("Dovezi", "Sesiunea nu are dovezi stocate: s-a încheiat înainte de prima captură.", "", "image");
    const gate = evidenceGate(s);
    const items = s.evidence.items;
    if (gate === "denied") {
      return `<section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Dovezi</h2>
        ${api.renderEmptyState({ title: "Dovezile nu îți sunt accesibile", text: "Doar operatorul căruia i-a fost alocată sesiunea vede dovezile ei (documente, selfie, liveness). Accesul este controlat pe roluri și jurnalizat.", icon: "lock" })}
      </section>`;
    }
    if (gate === "request") {
      return `<section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Dovezi</h2>
          <span class="e-permits-dosar-profil__section-meta">${items.length} ${items.length === 1 ? "fișier stocat" : "fișiere stocate"}</span>
        </div>
        <div class="e-permits-ekyc-locked">
          ${api.renderNotice("warning", `<strong>Date biometrice protejate.</strong> Accesul se acordă pentru ${ACCESS_MINUTES} minute, cu motiv, și se înregistrează în jurnalul de acces (cine, când, de ce). Imaginile au filigran și nu se pot descărca.`, { icon: "lock" })}
          <ul class="e-permits-ekyc-locked__list" role="list">${items.map((item) => `<li>${icon(item.kind === "liveness" ? "face-id" : item.kind.startsWith("document") ? "id-card" : "person", 20)}<span>${esc(item.label)}</span><span class="e-permits-ekyc-evidence__meta">${esc(item.format)} · ${esc(item.size)}</span></li>`).join("")}</ul>
          <div class="e-permits-ekyc-locked__actions"><button class="btn btn-primary btn-sm" type="button" aria-haspopup="dialog" data-ekyc-access-request>${icon("lock", 16)}<span>Solicită acces</span></button></div>
        </div>
      </section>`;
    }
    const grant = ui.grants[s.id];
    const strip = role() === "operator"
      ? api.renderNotice("info", `<strong>Acces în contextul reviziei ${esc(s.review?.id || "")}.</strong> Fiecare deschidere se înregistrează în jurnalul de acces; accesul se închide după decizie.`, { icon: "lock" })
      : `<div class="e-permits-ekyc-grant">${api.renderNotice("info", `<strong>Acces acordat până la ${esc(api.formatTime(grant.until))}.</strong> Motiv: ${esc(grant.reason)}${grant.ref ? ` · ${esc(grant.ref)}` : ""} · înregistrat în jurnalul de acces.`, { icon: "lock" })}<button class="btn btn-neutral btn-sm" type="button" data-ekyc-access-close>Închide accesul</button></div>`;
    const docs = items.filter((i) => i.kind.startsWith("document"));
    const bio = items.filter((i) => !i.kind.startsWith("document"));
    const d = s.evidence.document;
    const ocr = d ? api.renderInfoCard("Date extrase din document (OCR)", [
      ["Nume și prenume", esc(s.subject.name)],
      ["IDNP", api.renderProfileCopyCode(s.subject.idnp, `Copiază IDNP ${s.subject.idnp}`)],
      ["Data nașterii", esc(s.subject.birthDate)],
      ["Tip document", esc(d.type)],
      ["Număr document", esc(d.number)],
      ["Valabil până la", esc(d.expiry)],
      ["Domiciliu", esc(d.address)]
    ]) : "";
    const storage = api.renderInfoCard("Stocare", [
      ["Locație", esc(s.evidence.storage.location)],
      ["Retenție", esc(s.evidence.storage.retention)],
      ["Amprentă (SHA-256)", api.renderProfileCopyCode(s.evidence.storage.hash, "Copiază amprenta")]
    ]);
    return `<div class="e-permits-ekyc-strip">${strip}</div>
      ${evidenceSection(s, "Documente", docs, [stepScore(s, "document_scan"), stepScore(s, "nfc_chip")].filter(Boolean).join(" · "))}
      ${evidenceSection(s, "Captură biometrică", bio, [stepScore(s, "liveness"), stepScore(s, "face_match")].filter(Boolean).join(" · "))}
      ${ocr}${storage}`;
  };

  /* viewer: zoom / rotate (images), play / pause + frames (liveness) — US-06-03 CA-1, CA-2 */
  const ZOOMS = [50, 75, 100, 125, 150, 200, 300];
  const viewerBody = () => {
    const v = ui.viewer;
    const s = findSession(v.session);
    const item = s.evidence.items.find((i) => i.id === v.item);
    const frames = EVIDENCE_IMG[item.kind];
    const video = item.kind === "liveness";
    const at = video ? (item.seconds * v.frame) / Math.max(1, frames.length - 1) : 0;
    return `
      <div class="e-permits-ekyc-viewer">
        <div class="e-permits-ekyc-viewer__stage">
          <img class="e-permits-ekyc-viewer__img" src="${frames[v.frame]}" alt="${esc(item.label)}${video ? `, cadrul ${v.frame + 1} din ${frames.length}` : ""}" data-zoom="${v.zoom}" data-rot="${v.rot}">
          <span class="e-permits-ekyc-viewer__mark" aria-hidden="true">${esc(me())} · ${esc(api.formatStamp(nowIso()))} · ${esc(s.id)}</span>
        </div>
        <div class="e-permits-ekyc-viewer__tools" role="toolbar" aria-label="${video ? "Control video" : "Instrumente imagine"}">
          ${video ? `
            <button class="btn btn-neutral btn-sm" type="button" data-ekyc-play aria-pressed="${v.playing}">${v.playing ? icon("pause", 16) : svgPlay}<span>${v.playing ? "Pauză" : "Redă"}</span></button>
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-ekyc-frame="prev" aria-label="Cadrul anterior" data-tooltip-label="Cadrul anterior"${v.frame === 0 ? " disabled" : ""}>${icon("chevron-left", 16)}</button>
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-ekyc-frame="next" aria-label="Cadrul următor" data-tooltip-label="Cadrul următor"${v.frame === frames.length - 1 ? " disabled" : ""}>${icon("chevron-right", 16)}</button>
            <span class="e-permits-ekyc-viewer__readout" aria-live="polite">Cadrul ${v.frame + 1} din ${frames.length} · ${num(at, 1)} s / ${num(item.seconds, 1)} s</span>`
            : `
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-ekyc-zoom="out" aria-label="Micșorează" data-tooltip-label="Micșorează"${v.zoom === ZOOMS[0] ? " disabled" : ""}>${icon("minus-small", 16)}</button>
            <span class="e-permits-ekyc-viewer__readout" aria-live="polite">${v.zoom}%</span>
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-ekyc-zoom="in" aria-label="Mărește" data-tooltip-label="Mărește"${v.zoom === ZOOMS[ZOOMS.length - 1] ? " disabled" : ""}>${icon("plus-small", 16)}</button>
            <button class="btn btn-neutral btn-sm" type="button" data-ekyc-rotate>${icon("rotate-arrow", 16)}<span>Rotește</span></button>
            <button class="btn btn-text-neutral btn-sm" type="button" data-ekyc-zoom="fit"${v.zoom === 100 && v.rot === 0 ? " disabled" : ""}>Resetează</button>`}
        </div>
        <p class="e-permits-ekyc-viewer__note">${esc(item.format)} · ${esc(item.size)} · capturat ${esc(api.formatStamp(item.at))}${stepScore(s, item.step) ? ` · ${esc(stepScore(s, item.step))}` : ""}</p>
      </div>`;
  };
  let playTimer = 0;
  const stopPlay = () => { window.clearInterval(playTimer); playTimer = 0; if (ui.viewer) ui.viewer.playing = false; };
  const redrawViewer = (focusSel) => {
    if (!ui.viewer || ui.modal !== "viewer") return;
    modalBody().innerHTML = viewerBody();
    if (focusSel) modalBody().querySelector(focusSel)?.focus();
  };
  const openViewer = (s, itemId) => {
    const item = s.evidence.items.find((i) => i.id === itemId);
    if (!item) return;
    stopPlay();
    ui.viewer = { session: s.id, item: itemId, zoom: 100, rot: 0, frame: 0, playing: false };
    openModal({ title: item.label, subtitle: `${s.id} · ${client(s.clientId).name} · doar vizualizare`, body: viewerBody(), footer: closeFooter, kind: "viewer" });
    logAccess({ action: "Vizualizare dovadă", sessionId: s.id, reason: item.label, ref: role() === "operator" ? s.review?.id || "" : ui.grants[s.id]?.reason || "" });
  };

  /* ---- Surse externe: RSP via MConnect (US-06-04) ---- */
  const externalRows = (s) => {
    const rec = s.external.record;
    const d = s.evidence?.document || {};
    return [
      { label: "Nume și prenume", rsp: rec.name, doc: s.subject.name },
      { label: "IDNP", rsp: rec.idnp, doc: s.subject.idnp },
      { label: "Data nașterii", rsp: rec.birthDate, doc: s.subject.birthDate },
      { label: "Număr document", rsp: rec.docNumber, doc: d.number },
      { label: "Starea documentului", rsp: rec.docState, doc: "Valabil" },
      { label: "Valabil până la", rsp: rec.expiry, doc: d.expiry },
      { label: "Domiciliu", rsp: rec.address, doc: d.address }
    ].map((r) => ({ ...r, ok: r.rsp === r.doc }));
  };
  const matchTag = (ok) => `<span class="e-permits-workplace__tag e-permits-workplace__tag--${ok ? "success" : "danger"} e-permits-workplace__tag--icon">${icon(ok ? "checkmark-small" : "cross-small")}${ok ? "Concordă" : "Diferă"}</span>`;
  const renderExternal = (s) => {
    if (!s.external) return api.renderPassportEmpty("Surse externe", "Sesiunea nu a interogat surse externe: cazul de utilizare nu citește un act de identitate.", "", "data-access");
    const heading = `<div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title e-permits-ekyc-source-title">Registrul de stat al populației ${api.renderTag(s.external.source, "neutral")}</h2></div>`;
    if (s.external.state === "Indisponibil") {
      const canRetry = Boolean(myPart(s)?.takenAt) && !myPart(s)?.decision;
      return `<section class="e-permits-dosar-profil__section">
        ${heading}
        ${api.renderEmptyState({ title: "Datele din RSP nu sunt disponibile", text: `${s.external.error} Interogat la ${api.formatStamp(s.external.at)}. Decide pe baza dovezilor și menționează lipsa datelor în motivare.`, icon: "warning-filled", actionHtml: canRetry ? `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-rsp-retry>${icon("rotate-arrow", 16)}<span>Interoghează din nou</span></button>` : "" })}
      </section>`;
    }
    const rows = externalRows(s);
    const diff = rows.filter((r) => !r.ok);
    const ext = s.external;
    return `
      <section class="e-permits-dosar-profil__section">
        ${heading}
        <div class="e-permits-ekyc-strip">${diff.length
          ? api.renderNotice("error", `<strong>${diff.length} ${diff.length === 1 ? "câmp diferă" : "câmpuri diferă"} de document:</strong> ${esc(diff.map((r) => r.label.toLocaleLowerCase("ro")).join(", "))}. Verifică dovezile înainte de decizie.`)
          : api.renderNotice("success", `<strong>Toate cele ${rows.length} câmpuri concordă</strong> cu datele citite din document.`)}</div>
        <div class="e-permits-dosar-profil__card">
          ${rows.map((r) => `
            <div class="e-permits-dosar-profil__row">
              <span class="e-permits-dosar-profil__row-label" title="${esc(r.label)}">${esc(r.label)}</span>
              <span class="e-permits-dosar-profil__row-value e-permits-ekyc-match"><span>${esc(r.rsp)}${r.ok ? "" : `<span class="e-permits-dosar-profil__termen-meta">în document: ${esc(r.doc || "—")}</span>`}</span>${matchTag(r.ok)}</span>
            </div>`).join("")}
        </div>
      </section>
      ${api.renderInfoCard("Interogare", [
        ["Sursă", "Registrul de stat al populației (ASP), prin MConnect"],
        ["Interogat la", `${esc(api.formatStamp(ext.at))} <span class="e-permits-dosar-profil__termen-meta">la momentul sesiunii</span>`],
        ["ID cerere MConnect", api.renderProfileCopyCode(ext.requestId, `Copiază ${ext.requestId}`)],
        ["Durată", `${ext.ms} ms`],
        ["Temei", "Consimțământul solicitantului în aplicația clientului"]
      ])}`;
  };

  /* ---- Acces la dovezi (US-07-05 CA-3) ---- */
  const renderAccessTab = (s) => {
    const list = s.evidenceAccess || [];
    return api.renderStackedList("Acces la dovezi", [{
      label: "",
      items: list.map((e) => ({
        title: esc(e.user), plainTitle: e.user,
        badges: [api.renderTag(e.role, "neutral"), api.renderTag(e.action, e.action === "Acces la dovezi" ? "warning" : "neutral")],
        meta: [esc(api.formatStamp(e.at)), esc(e.reason), ...(e.ref ? [esc(e.ref)] : []), ...(e.until ? [`acces până la ${esc(api.formatTime(e.until))}`] : [])]
      }))
    }], { meta: "jurnalizat prin MLog · nu se poate modifica", empty: "Nimeni nu a accesat dovezile acestei sesiuni." });
  };

  /* audit trail of decisions (US-07-05 CA-2): automatic decision, operators, final, callback */
  const renderDecisionTrail = (s) => {
    const kinds = /^(Decizie|Trimisă în revizie|Revizie|Rezultat transmis|Solicitant notificat)/;
    const events = s.events.filter((e) => kinds.test(e.type));
    return events.length ? api.renderEventTimeline("Cronologia deciziilor", events, { meta: "decizii intermediare și finală" }) : "";
  };

  /* ---- decision dialog (US-06-05): reason (select) + detailed motivation (30–1000) ---- */
  const DECISION_REASONS = {
    Acceptat: [["match-rsp", "Dovezile concordă cu datele din RSP"], ["manual-face", "Potrivire facială confirmată manual"], ["doc-quality", "Document autentic, imagine de calitate slabă"], ["other", "Alt motiv (descris în motivare)"]],
    Respins: [["face-mismatch", "Selfie-ul nu corespunde documentului"], ["rsp-mismatch", "Date neconcordante cu RSP"], ["doc-forged", "Document falsificat sau modificat"], ["spoof", "Atac de prezentare la liveness (foto, ecran, mască)"], ["other", "Alt motiv (descris în motivare)"]]
  };
  const TEXT_MIN = 30;
  const TEXT_MAX = 1000;
  const fieldError = (msg) => (msg ? `<span class="message message--inline message--error e-permits-fo-field__error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>` : "");
  const requiredMark = '<span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>';
  const selectField = (key, label, options, value, error, { required = true, placeholder = "Alege", hint = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field">
      <label for="ekyc-f-${key}">${esc(label)}${required ? requiredMark : ""}</label>
      ${api.renderFoSelectControl({ id: `ekyc-f-${key}`, attrs: `data-ekyc-field="${key}"`, error: Boolean(error), optionsHtml: `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>${options.map(([v, t, dis]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}${dis ? " disabled" : ""}>${esc(t)}</option>`).join("")}` })}
      ${fieldError(error)}
      ${hint && !error ? `<p class="e-permits-fo-field__hint">${esc(hint)}</p>` : ""}
    </div>`;
  const textareaField = (key, label, value, error, { hint = "", max = TEXT_MAX, rows = 4 } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field">
      <label for="ekyc-f-${key}">${esc(label)}${requiredMark}</label>
      <div class="e-permits-fo-textarea${error ? " is-error" : ""}">
        <textarea id="ekyc-f-${key}" rows="${rows}" maxlength="${max}" data-ekyc-field="${key}"${error ? ' aria-invalid="true"' : ""}>${esc(value)}</textarea>
      </div>
      ${fieldError(error)}
      <p class="e-permits-fo-field__hint">${hint ? `${esc(hint)} · ` : ""}<span data-ekyc-count="${key}">${value.length}</span>/${max}</p>
    </div>`;
  const inputField = (key, label, value, error, { required = false, hint = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field">
      <label for="ekyc-f-${key}">${esc(label)}${required ? requiredMark : ""}</label>
      <div class="e-permits-fo-input${error ? " is-error" : ""}"><input id="ekyc-f-${key}" type="text" value="${esc(value)}" data-ekyc-field="${key}" autocomplete="off"></div>
      ${fieldError(error)}
      ${hint && !error ? `<p class="e-permits-fo-field__hint">${esc(hint)}</p>` : ""}
    </div>`;

  const decisionBody = () => {
    const d = ui.draft;
    const s = findSession(d.session);
    const ag = aggregate(s);
    const note = s.review.mode === "multi"
      ? `Decizia ta este una din ${ag.n} și rămâne ascunsă celorlalți operatori. Decizia finală se stabilește prin majoritate și se transmite către ${esc(client(s.clientId).name)}.`
      : `Decizia este finală: se transmite imediat către ${esc(client(s.clientId).name)} și se înregistrează în jurnalul de audit. Nu mai poate fi schimbată.`;
    return `<div class="e-permits-case-form">
      ${api.renderInfoNote(note)}
      ${selectField("reason", "Motivul deciziei", DECISION_REASONS[d.decision], d.values.reason, d.errors.reason)}
      ${textareaField("text", "Motivare detaliată", d.values.text, d.errors.text, { hint: `Minimum ${TEXT_MIN} de caractere` })}
    </div>`;
  };
  const decisionFooter = () => {
    const reject = ui.draft.decision === "Respins";
    return `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn ${reject ? "btn-destructive" : "btn-primary"} btn-rounded" type="button" data-ekyc-decide-submit>${reject ? "Respinge sesiunea" : "Acceptă sesiunea"}</button></div>`;
  };
  const openDecision = (s, decision) => {
    ui.draft = { kind: "decision", session: s.id, decision, values: { reason: "", text: "" }, errors: {} };
    openModal({ title: decision === "Acceptat" ? "Acceptă sesiunea" : "Respinge sesiunea", subtitle: `${s.id} · ${client(s.clientId).name} · scor automat ${num(autoScore(s))}`, body: decisionBody(), footer: decisionFooter(), kind: "decision", focus: "#ekyc-f-reason" });
  };
  const redrawDraft = (bodyFn, focusSel) => {
    modalBody().innerHTML = bodyFn();
    if (focusSel) requestAnimationFrame(() => modalBody().querySelector(focusSel)?.focus());
  };
  const finalize = (s, decision) => {
    const r = s.review;
    r.status = "Finalizată";
    r.result = { decision, at: nowIso() };
    r.callback = { url: `https://api.${s.clientId}.md/ekyc/callback`, state: "Livrat", attempts: 1, at: nowIso(), http: "200 OK", next: "" };
    if (isHistorical(s)) s.decision = decision;
    logEvent(s, `Decizie finală: ${decision}`, decision === "Acceptat" ? "Reușit" : "Eșuat", r.mode === "multi" ? `${r.rule} · ${aggregate(s)[decision === "Acceptat" ? "acc" : "rej"]} din ${r.assignees.length}` : "Decizia operatorului", "Platforma eKYC");
    logEvent(s, "Rezultat transmis clientului", "Reușit", "200 OK · 1 încercare", "Platforma eKYC");
  };
  const submitDecision = () => {
    const d = ui.draft;
    const s = findSession(d.session);
    const text = d.values.text.trim();
    d.errors = {};
    if (!d.values.reason) d.errors.reason = "Alege motivul deciziei.";
    if (!text) d.errors.text = "Scrie motivarea deciziei.";
    else if (text.length < TEXT_MIN) d.errors.text = `Scrie cel puțin ${TEXT_MIN} de caractere (acum ${text.length}).`;
    if (Object.keys(d.errors).length) {
      redrawDraft(decisionBody, d.errors.reason ? "#ekyc-f-reason" : "#ekyc-f-text");
      return;
    }
    const part = myPart(s);
    const label = DECISION_REASONS[d.decision].find(([v]) => v === d.values.reason)[1];
    Object.assign(part, { state: "Decizie înregistrată", decision: d.decision, decidedAt: nowIso(), reasonCode: d.values.reason, reasonLabel: label, reason: text });
    logEvent(s, `Decizie operator: ${d.decision}`, d.decision === "Acceptat" ? "Reușit" : "Eșuat", label);
    const name = client(s.clientId).name;
    if (s.review.mode !== "multi") {
      finalize(s, d.decision);
      api.showShellToast(`Sesiunea ${s.id} a fost ${d.decision === "Acceptat" ? "acceptată" : "respinsă"}. Rezultatul a fost transmis către ${name}.`, "success", "Decizie înregistrată");
    } else {
      const ag = aggregate(s);
      if (ag.result) {
        finalize(s, ag.result);
        api.showShellToast(`Majoritatea a fost atinsă (${ag[ag.result === "Acceptat" ? "acc" : "rej"]} din ${ag.n}): sesiunea ${s.id} este ${ag.result === "Acceptat" ? "acceptată" : "respinsă"}. Rezultatul a fost transmis către ${name}.`, "success", "Decizie finală");
      } else {
        s.review.status = "În lucru";
        api.showShellToast(`Decizia ta a fost înregistrată (${ag.decided} din ${ag.n}). Decizia finală se stabilește după ceilalți operatori.`, "success", "Decizie înregistrată");
      }
    }
    ui.draft = null;
    closeModal();
    refreshProfile();
  };

  /* ---- (re)allocation by the supervisor (US-06-01; manual needs a reason) ---- */
  const assignBody = () => {
    const d = ui.draft;
    const s = findSession(d.session);
    const pending = pendingVotes(s);
    const taken = new Set(s.review.assignees.map((a) => a.name));
    const ops = db.operators.map((o) => [o.name, `${o.name} · ${o.state.toLocaleLowerCase("ro")}`, o.state === "Absent" || taken.has(o.name)]);
    return `<div class="e-permits-case-form">
      <div class="e-permits-fo-field e-permits-user-create__field">
        <span class="e-permits-ekyc-field-label" id="ekyc-assign-mode-label">Mod de alocare</span>
        <div class="segmented-control" role="radiogroup" aria-labelledby="ekyc-assign-mode-label">
          ${[["random", "Aleatorie"], ["manual", "Alege operatorul"]].map(([k, t]) => `<button class="segment-item${d.values.mode === k ? " is-selected" : ""}" type="button" role="radio" aria-checked="${d.values.mode === k}" data-ekyc-assign-mode="${k}">${t}</button>`).join("")}
        </div>
      </div>
      ${s.review.mode === "multi" && pending.length > 1 ? selectField("replace", "Operatorul înlocuit", pending.map((a) => [a.name, `${a.name} · ${a.state.toLocaleLowerCase("ro")}`]), d.values.replace, d.errors.replace) : ""}
      ${d.values.mode === "random"
        ? api.renderInfoNote("Motorul de alocare alege aleatoriu un operator disponibil, altul decât cei alocați deja. Alegerea nu poate fi influențată și se înregistrează în jurnal.")
        : `${selectField("operator", "Operator", ops, d.values.operator, d.errors.operator, { hint: "Operatorii absenți sau deja alocați nu pot fi aleși." })}
           ${textareaField("text", "Motivul alocării manuale", d.values.text, d.errors.text, { hint: "Minimum 10 caractere · apare în jurnal", max: 500, rows: 3 })}`}
    </div>`;
  };
  const openAssign = (s) => {
    const pending = pendingVotes(s);
    const first = s.review.status === "Nealocată";
    ui.draft = { kind: "assign", session: s.id, values: { mode: "random", operator: "", text: "", replace: pending.length === 1 ? pending[0].name : "" }, errors: {} };
    openModal({ title: first ? "Alocă sesiunea" : "Realocă sesiunea", subtitle: `${s.id} · ${client(s.clientId).name}${s.review.assignees.length ? ` · acum: ${s.review.assignees.map((a) => a.name).join(", ")}` : " · nealocată"}`, body: assignBody(), footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-ekyc-assign-submit>${first ? "Alocă" : "Realocă"}</button></div>`, kind: "assign", focus: "[data-ekyc-assign-mode].is-selected" });
  };
  const submitAssign = () => {
    const d = ui.draft;
    const s = findSession(d.session);
    const r = s.review;
    d.errors = {};
    const pending = pendingVotes(s);
    if (r.mode === "multi" && pending.length > 1 && !d.values.replace) d.errors.replace = "Alege operatorul pe care îl înlocuiești.";
    if (d.values.mode === "manual") {
      if (!d.values.operator) d.errors.operator = "Alege operatorul.";
      if (d.values.text.trim().length < 10) d.errors.text = d.values.text.trim() ? "Scrie cel puțin 10 caractere." : "Scrie motivul alocării manuale.";
    }
    if (Object.keys(d.errors).length) { redrawDraft(assignBody, "[aria-invalid='true'], .is-error .e-permits-fo-select__button"); return; }
    const taken = new Set(r.assignees.map((a) => a.name));
    const target = d.values.mode === "manual" ? d.values.operator : (db.operators.find((o) => o.state === "Disponibil" && !taken.has(o.name)) || db.operators.find((o) => !taken.has(o.name)))?.name;
    const replace = r.mode === "multi" ? d.values.replace || pending[0]?.name : r.assignees[0]?.name;
    const entry = { name: target, allocatedAt: nowIso(), state: "Alocată" };
    if (replace) r.assignees = r.assignees.map((a) => (a.name === replace ? entry : a));
    else r.assignees = [entry];
    if (!r.allocatedAt) r.allocatedAt = entry.allocatedAt;
    if (!r.dueAt) r.dueAt = isoOf(new Date(now().getTime() + 8 * 3600000));
    r.allocation = d.values.mode === "manual" ? "Manuală (supervizor)" : "Aleatorie";
    if (r.status === "Nealocată" || r.mode !== "multi") r.status = "Alocată";
    logEvent(s, replace ? "Revizie realocată" : "Revizie alocată", "Reușit", `${replace ? `${replace} → ` : ""}${target} · ${d.values.mode === "manual" ? `manual: ${d.values.text.trim()}` : "aleatoriu"}`);
    ui.draft = null;
    closeModal();
    api.showShellToast(`Sesiunea ${s.id} a fost ${replace ? "realocată" : "alocată"} ${d.values.mode === "manual" ? "" : "aleatoriu "}lui ${target}.`, "success", replace ? "Revizie realocată" : "Revizie alocată");
    refreshProfile();
  };

  /* ---- evidence access request (auditor / supervisor / admin) ---- */
  const ACCESS_REASONS = ["Investigație", "Contestație", "Audit periodic", "Solicitare a unei autorități"];
  const accessBody = () => {
    const d = ui.draft;
    return `<div class="e-permits-case-form">
      ${selectField("reason", "Motivul accesului", ACCESS_REASONS.map((x) => [x, x]), d.values.reason, d.errors.reason)}
      ${inputField("ref", "Referință", d.values.ref, d.errors.ref, { hint: "Numărul dosarului, al contestației sau al tichetului (opțional)" })}
      ${api.renderInfoNote(`Accesul durează ${ACCESS_MINUTES} minute. Se înregistrează numele tău, ora, motivul și fiecare fișier deschis.`)}
    </div>`;
  };
  const openAccess = (s) => {
    ui.draft = { kind: "access", session: s.id, values: { reason: "", ref: "" }, errors: {} };
    openModal({ title: "Solicită acces la dovezi", subtitle: `${s.id} · ${client(s.clientId).name} · ${s.evidence.items.length} fișiere`, body: accessBody(), footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-ekyc-access-submit>Accesează dovezile</button></div>', kind: "access", focus: "#ekyc-f-reason" });
  };
  const submitAccess = () => {
    const d = ui.draft;
    d.errors = {};
    if (!d.values.reason) d.errors.reason = "Alege motivul accesului.";
    if (d.errors.reason) { redrawDraft(accessBody, "#ekyc-f-reason"); return; }
    const until = isoOf(new Date(now().getTime() + ACCESS_MINUTES * 60000));
    ui.grants[d.session] = { until, reason: d.values.reason, ref: d.values.ref.trim() };
    logAccess({ action: "Acces la dovezi", sessionId: d.session, reason: d.values.reason, ref: d.values.ref.trim(), until });
    ui.draft = null;
    closeModal();
    refreshProfile();
  };

  /* ---- Rapoarte (US-07-06) + export (US-07-07: CSV tabelar, JSON structurat, fără date personale) ---- */
  const exportMenu = () => `
    <div class="e-permits-stack__menu-wrap e-permits-ekyc-export">
      <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="ekyc-export-menu" data-stack-menu-trigger>${icon("export", 16)}<span>Exportă</span>${icon("chevron-bottom", 16)}</button>
      <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="ekyc-export-menu" role="menu" aria-label="Formate de export" hidden data-stack-menu>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-ekyc-export="csv">${icon("page-text")}<span>CSV · sesiunile din raport (tabelar)</span></button></li>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-ekyc-export="json">${icon("data-access")}<span>JSON · raport statistic (BI, API)</span></button></li>
      </ul>
    </div>`;
  const breakdownOf = (sessions, keyOf, nameOf) => {
    const map = new Map();
    sessions.forEach((s) => { const k = keyOf(s); if (!map.has(k)) map.set(k, []); map.get(k).push(s); });
    return [...map.entries()].map(([k, list]) => {
      const done = list.filter((s) => s.status === "Finalizată");
      const acc = list.filter((s) => s.decision === "Acceptat").length;
      const rej = list.filter((s) => s.decision === "Respins").length;
      const dur = done.length ? Math.round(done.reduce((a, s) => a + s.durationSeconds, 0) / done.length) : 0;
      return { key: k, name: nameOf(k), total: list.length, acc, rej, rate: pct(acc, list.length), avg: dur };
    }).sort((a, b) => b.total - a.total);
  };
  const breakdownTable = (title, label, rows) => `
    <section class="e-permits-dosar-profil__section">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
        <span class="e-permits-dosar-profil__section-meta">${rows.length} ${rows.length === 1 ? "rând" : "rânduri"}</span>
      </div>
      <div class="e-permits-workplace__table-wrap e-permits-ekyc-breakdown">
        <table class="e-permits-workplace__table e-permits-ekyc-breakdown__table e-permits-ekyc-report__table">
          <thead><tr><th scope="col">${esc(label)}</th><th scope="col">Sesiuni</th><th scope="col">Acceptate</th><th scope="col">Respinse</th><th scope="col">Rată de succes</th><th scope="col">Durată medie</th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td>${identity(r.name, r.key)}</td>
            <td><span class="e-permits-ekyc-score">${r.total}</span></td>
            <td>${r.acc}</td>
            <td>${r.rej}</td>
            <td><span class="e-permits-ekyc-progress">${meter([[r.acc, "success"]], { max: r.total || 1, label: `Rată de succes ${r.rate}%` })}<span class="e-permits-ekyc-progress__count">${r.rate}%</span></span></td>
            <td>${r.avg ? esc(duration(r.avg)) : "—"}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>`;
  const reportData = () => {
    /* a report counts finished sessions only (no „În curs” bars) */
    const data = dashboardData({ live: false });
    return {
      ...data,
      byClient: breakdownOf(data.hist, (s) => s.clientId, (k) => client(k).name),
      byUseCase: breakdownOf(data.hist, (s) => s.useCaseCode, (k) => useCase(k).name),
      byIal: breakdownOf(data.hist, (s) => s.ial, (k) => `Nivel ${k.toLocaleLowerCase("ro")}`),
      reviewed: data.hist.filter((s) => s.review).length
    };
  };
  const REPORT_PERIODS = PERIODS.filter(([key]) => key !== "1h");
  const renderReports = () => {
    if (ui.period === "1h") ui.period = "7z";
    const filters = renderFilters({ periods: REPORT_PERIODS, tools: exportMenu() });
    if (DEMO === "incarcare") return `${filters}${api.renderEmptyState({ title: "Se generează raportul…", text: "Datele vin din serviciul de raportare.", loading: true })}`;
    if (failed) return `${filters}${api.renderEmptyState({ title: "Nu am putut genera raportul", text: "Serviciul de raportare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", actionHtml: `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry>${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>` })}`;
    const d = reportData();
    if (!d.hist.length || DEMO === "gol") return `${filters}${api.renderEmptyState({ title: "Nicio sesiune încheiată în perioada aleasă", text: "Alege o perioadă mai lungă sau alt client ori caz de utilizare.", icon: "chart" })}`;
    const accRate = pct(d.accepted, d.hist.length);
    const rejRate = pct(d.hist.filter((s) => s.decision === "Respins").length, d.hist.length);
    return `
      ${filters}
      <section class="e-permits-dosar-profil__section" aria-label="Indicatori raport">
        <ul class="e-permits-kpi-grid" role="list">
          ${kpi("Sesiuni încheiate", String(d.hist.length), `<strong>${d.act.length}</strong> încă active`)}
          ${kpi("Rată de succes", `${accRate}%`, `<strong>${d.accepted}</strong> acceptate`)}
          ${kpi("Rată de respingere", `${rejRate}%`, `<strong>${d.hist.filter((s) => s.decision === "Respins").length}</strong> respinse`)}
          ${kpi("Revizie manuală", String(d.reviewed + d.hist.filter((s) => s.decision === "Revizuire manuală").length), "trimise la operator")}
          ${kpi("Durata medie", d.avg ? duration(d.avg) : "—", "de la inițiere la decizie")}
        </ul>
      </section>
      <div class="e-permits-ekyc-dash__cols">
        <div class="e-permits-ekyc-dash__col">${renderTrend(d, { title: "Volum sesiuni" })}</div>
        <div class="e-permits-ekyc-dash__col">${renderDecisions(d, { top: false })}</div>
      </div>
      ${breakdownTable("Pe client", "Client", d.byClient)}
      ${breakdownTable("Pe caz de utilizare", "Caz de utilizare", d.byUseCase)}
      ${breakdownTable("Pe nivel de asigurare", "Nivel", d.byIal)}
      <div class="e-permits-ekyc-strip">${api.renderInfoNote("<strong>Exporturile nu conțin date personale</strong> (nume, IDNP, imagini): sesiunile apar doar prin ID. Fiecare export se înregistrează în jurnalul de acces.")}</div>`;
  };
  const download = (filename, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportReport = (format) => {
    const d = reportData();
    const { start, end } = windowOf();
    const stamp = nowIso().slice(0, 10);
    if (!d.hist.length) { api.showShellToast("Raportul nu are sesiuni de exportat.", "warning", "Nimic de exportat"); return; }
    if (format === "csv") {
      api.exportCsv(`raport-ekyc-${stamp}.csv`, ["ID sesiune", "Client ID", "Cod caz", "Nivel asigurare", "Statut", "Decizie", "Scor final", "Revizie manuală", "Început la", "Finalizat la", "Durată (s)"],
        d.hist.map((s) => [s.id, s.clientId, s.useCaseCode, s.ial, s.status, s.decision, s.finalScore == null ? "" : num(s.finalScore), s.review ? s.review.mode : "", s.startedAt, s.completedAt, s.durationSeconds]));
    } else {
      download(`raport-ekyc-${stamp}.json`, JSON.stringify({
        report: "eKYC — statistici sesiuni", generatedAt: nowIso(), window: { from: isoOf(start), to: isoOf(end) }, filters: { clientId: ui.client || null, useCaseCode: ui.useCase || null },
        totals: { completed: d.hist.length, active: d.act.length, accepted: d.accepted, rejected: d.hist.filter((s) => s.decision === "Respins").length, manualReview: d.reviewed, avgDurationSeconds: d.avg },
        decisions: Object.fromEntries(d.decisions), byClient: d.byClient, byUseCase: d.byUseCase, byIal: d.byIal,
        privacy: "Fără date personale: fără nume, IDNP sau imagini."
      }, null, 2), "application/json");
    }
    logAccess({ action: "Export raport", sessionId: "", reason: format === "csv" ? "CSV · sesiuni" : "JSON · raport statistic", ref: `${d.hist.length} sesiuni · fără date personale` });
    api.showShellToast(`${d.hist.length} sesiuni exportate în raport-ekyc-${stamp}.${format}. Exportul nu conține date personale.`, "success", "Export finalizat");
  };

  /* ---- Jurnal de acces (registry kind ekyc-access, US-07-04 CA-3 / US-07-03) ---- */
  const ACCESS_TONES = { "Acces la dovezi": "warning", "Vizualizare dovadă": "warning", "Căutare în sesiuni": "neutral", "Export raport": "info", "Vizualizare detalii sesiune": "neutral" };
  const buildAccessDb = () => ({
    kind: "ekyc-access",
    fieldCount: 6,
    statuses: statusesOf(ACCESS_TONES),
    columns: {
      moment: { label: "Moment", width: 180, sortable: true },
      utilizator: { label: "Utilizator", width: 220, sortable: true },
      actiune: { label: "Acțiune", width: 200, sortable: true },
      sesiune: { label: "Sesiune", width: 200, sortable: true },
      context: { label: "Motiv / context", width: 280, fill: true },
      actiuni: { label: "", width: 140 }
    },
    views: {
      access: {
        title: "Jurnal de acces",
        selectable: false,
        toolbarLabel: "Filtrare jurnal de acces",
        searchPlaceholder: "Căutare după utilizator, sesiune sau motiv",
        columns: ["moment", "utilizator", "actiune", "sesiune", "context", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          { id: "dovezi", label: "Acces la dovezi", filter: "ac:dovezi" },
          { id: "cautari", label: "Căutări", filter: "ac:Căutare în sesiuni" },
          { id: "exporturi", label: "Exporturi", filter: "ac:Export raport" }
        ]
      }
    },
    runtimeRows: emptyRows() ? [] : db.accessLog.map((e, i) => ({ id: `acc-${i}`, entry: e, moment: e.at, utilizator: e.user, actiune: e.action, sesiune: e.sessionId, context: [e.reason, e.ref].filter(Boolean).join(" · ") }))
  });
  const renderAccessCell = (row, key) => {
    const e = row.entry;
    switch (key) {
      case "moment": return api.renderDateTime(e.at);
      case "utilizator": return identity(e.user, e.role);
      case "actiune": return api.renderTag(e.action, ACCESS_TONES[e.action] || "neutral");
      case "sesiune": return e.sessionId ? identity(e.sessionId, client(findSession(e.sessionId)?.clientId).name) : '<span class="e-permits-workplace__dash">—</span>';
      case "context": return e.until ? identity(row.context, `acces până la ${api.formatTime(e.until)}`) : esc(row.context || "—");
      case "actiuni": return e.sessionId && findSession(e.sessionId) && isHistorical(findSession(e.sessionId)) ? `<span class="e-permits-workplace__row-actions">${api.renderRowActions({ primary: { label: "Vezi sesiunea", attrs: `data-ekyc-open="${esc(e.sessionId)}" aria-label="Vezi sesiunea ${esc(e.sessionId)}"` }, label: e.sessionId })}</span>` : "";
      default: return esc(row[key] ?? "—");
    }
  };
  const accessFilter = (row, token) => {
    if (token === "ac:dovezi") return /dovez|dovad/.test(row.actiune);
    if (token.startsWith("ac:")) return row.actiune === token.slice(3);
    return true;
  };

  /* auditor search is logged (US-07-04 CA-3): debounced, with the number of results */
  let searchLogTimer = 0;
  const logSearch = (query) => {
    window.clearTimeout(searchLogTimer);
    if (!query.trim() || role() !== "auditor" || ui.view !== "ekyc-history") return;
    searchLogTimer = window.setTimeout(() => logAccess({ action: "Căutare în sesiuni", sessionId: "", reason: query.trim(), ref: `${api.getVisibleRows?.().length ?? 0} rezultate` }), 1200);
  };

  /* the review screen: the profile panel in review mode */
  const reviewNav = () => (role() === "supervisor" ? "ek-review-all" : "ek-review");
  const reviewHeader = (s) => {
    const r = s.review;
    const part = myPart(s);
    const sup = role() === "supervisor";
    const ag = aggregate(s);
    let actions = "";
    if (role() === "operator" && part && r.status !== "Finalizată") {
      if (!part.takenAt) actions = `<button class="btn btn-primary btn-sm" type="button" data-ekyc-take>${icon("checkmark-small", 16)}<span>Preia revizia</span></button>`;
      else if (!part.decision) actions = `<button class="btn btn-neutral btn-sm" type="button" aria-haspopup="dialog" data-ekyc-decide="Respins">${icon("cross-small", 16)}<span>Respinge</span></button><button class="btn btn-primary btn-sm" type="button" aria-haspopup="dialog" data-ekyc-decide="Acceptat">${icon("checkmark-small", 16)}<span>Acceptă</span></button>${api.renderStackMenu([{ label: "Eliberează revizia", icon: "logout", attrs: "data-ekyc-release", danger: true }], s.id)}`;
    }
    if (sup && r.status !== "Finalizată") actions = `<button class="btn btn-neutral btn-sm" type="button" aria-haspopup="dialog" data-ekyc-assign="${esc(s.id)}">${icon("people", 16)}<span>${r.status === "Nealocată" ? "Alocă" : "Realocă"}</span></button>`;
    api.els.dosarProfilTitleRow.innerHTML = api.renderPageHeaderTop({
      crumbs: [{ label: sup ? "Coada de revizie" : "Sesiunile mele de revizie", attr: "data-dosar-profil-crumb-back" }, { label: s.id }],
      title: client(s.clientId).name,
      actions,
      caption: r.id
    });
    const status = reviewStatusFor(s);
    api.els.dosarProfilSummary.innerHTML = api.renderPageHeaderMeta([
      ["Caz de utilizare", esc(useCase(s.useCaseCode).name)],
      ["Statut revizie", api.renderTag(status, REVIEW_TONES[status])],
      ["Scor automat", `<span class="e-permits-ekyc-score">${num(autoScore(s))}</span>`],
      ["Tip revizie", r.mode === "multi" ? `Multi-operator · ${ag.decided}/${ag.n}` : "Un operator"],
      ["Nivel asigurare", api.renderTag(s.ial, "neutral")],
      ["Termen", r.dueAt ? `${esc(shortStamp(r.dueAt))}${overdue(s) ? ` ${api.renderTag("Depășit", "danger")}` : ""}` : "—"]
    ]);
    api.watchPageHeaderMeta(api.els.dosarProfilSummary);
  };
  const renderReviewBody = (s, tab) => {
    switch (tab) {
      case "dovezi": return renderEvidence(s);
      case "surse": return renderExternal(s);
      case "pasi": return renderSteps(s);
      case "dispozitiv": return renderDevice(s);
      case "jurnal": return renderJournal(s);
      default: return renderReviewTab(s);
    }
  };
  const openReview = (id, tab = "revizie") => {
    const s = findSession(id);
    const nav = reviewNav();
    if (role() === "auditor" || role() === "admin") { openSession(id, tab === "revizie" ? "revizie" : tab); return; }
    if (!document.querySelector(`[data-nav-id="${nav}"].is-active`) || !document.querySelector('[data-workplace][data-registry-kind="ekyc-review"]')) {
      api.setActiveNav(nav);
      showView(nav === "ek-review-all" ? "ekyc-review-all" : "ekyc-review");
    }
    ui.mode = "review";
    ui.session = id;
    hideDash();
    api.openProfilePanel();
    setBackLabel(role() === "supervisor" ? "Înapoi la coada de revizie" : "Înapoi la sesiunile mele");
    const denied = !s || !s.review || (role() === "operator" && !myPart(s));
    if (denied) {
      api.els.dosarProfilTitleRow.innerHTML = api.renderPageHeaderTop({ crumbs: [{ label: role() === "supervisor" ? "Coada de revizie" : "Sesiunile mele de revizie", attr: "data-dosar-profil-crumb-back" }, { label: id }], title: id });
      api.els.dosarProfilSummary.innerHTML = "";
      api.els.dosarProfilTabs.innerHTML = "";
      api.els.dosarProfilPanelBody.innerHTML = api.renderEmptyState(s && s.review
        ? { title: "Sesiunea nu îți este alocată", text: "Poți revizui doar sesiunile pe care motorul de alocare ți le-a atribuit. Alocarea este aleatorie, ca nimeni să nu-și aleagă sesiunile.", icon: "lock", actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-dosar-profil-crumb-back>Înapoi la sesiunile mele</button>' }
        : { title: "Sesiunea nu este în revizie", text: `Nu există o revizie manuală pentru ${id}.`, icon: "search", actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-dosar-profil-crumb-back>Înapoi la listă</button>' });
      history.replaceState(null, "", `${location.pathname}${location.search}#revizie/${id}`);
      return;
    }
    ui.tab = REVIEW_TABS.some(([key]) => key === tab) ? tab : "revizie";
    reviewHeader(s);
    renderSessionPanel();
    api.els.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  };
  /* after an action: redraw the header + current tab of whichever profile is open */
  const refreshProfile = () => {
    const s = findSession(ui.session);
    if (!s) return;
    if (ui.mode === "review") reviewHeader(s);
    else renderSessionHeader(s);
    renderSessionPanel();
  };
  /* operator: the first time he opens Dovezi in a session, the access is logged */
  const touchEvidence = (s) => {
    if (role() !== "operator" || !myPart(s) || ui.touched.has(s.id)) return;
    ui.touched.add(s.id);
    logAccess({ action: "Acces la dovezi", sessionId: s.id, reason: "Revizie alocată", ref: s.review.id });
  };

  /* ---- pages of our own: Dashboard + not-yet-built placeholders ------------------- */
  let page = null;
  const ensurePage = () => {
    if (page) return page;
    page = document.createElement("div");
    page.className = "permits-page__content e-permits-dosar-profil e-permits-ekyc-page";
    page.hidden = true;
    page.dataset.ekycPage = "";
    page.innerHTML = '<div class="e-permits-dosar-profil__panel" data-ekyc-page-body></div>';
    (api.els.dosarProfilPanel?.parentElement || document.querySelector(".e-permits-shell__canvas-surface"))?.appendChild(page);
    return page;
  };
  const hideDash = () => { if (page) page.hidden = true; };
  const showPage = (title, html) => {
    api.hideShellPages();
    ensurePage().hidden = false;
    page.querySelector("[data-ekyc-page-body]").innerHTML = html;
    if (api.els.workplaceTitle) api.els.workplaceTitle.textContent = title;
    if (api.els.workplaceRefresh) api.els.workplaceRefresh.hidden = !["ekyc-dashboard", "ekyc-reports"].includes(ui.view);
  };

  const windowOf = () => {
    const sec = PERIODS.find(([key]) => key === ui.period)[2];
    const end = now();
    return { start: new Date(end.getTime() - sec * 1000), end, sec };
  };

  const inScope = (s) => (!ui.client || s.clientId === ui.client) && (!ui.useCase || s.useCaseCode === ui.useCase);

  const dashboardData = ({ live = true } = {}) => {
    const { start, end, sec } = windowOf();
    const hist = db.history.filter((s) => inScope(s) && new Date(s.completedAt) >= start && new Date(s.completedAt) <= end);
    const act = db.active.filter(inScope);
    const startedIn = act.filter((s) => new Date(s.startedAt) >= start);
    const total = hist.length + startedIn.length;
    const decided = hist.filter((s) => s.decision !== "Fără decizie");
    const accepted = hist.filter((s) => s.decision === "Acceptat").length;
    const errors = hist.filter((s) => s.status === "Eroare").length;
    const abandoned = hist.filter((s) => ["Abandonată", "Expirată"].includes(s.status)).length;
    const durations = hist.filter((s) => s.status === "Finalizată").map((s) => s.durationSeconds);
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    /* trend: equal buckets over the window, sessions started + errors per bucket */
    const buckets = ui.period === "1h" ? 12 : ui.period === "24h" ? 24 : ui.period === "7z" ? 7 : 30;
    const size = sec / buckets;
    const trend = Array.from({ length: buckets }, (_, i) => ({ start: new Date(start.getTime() + i * size * 1000), total: 0, errors: 0, by: {} }));
    const place = (iso, outcome, isError) => {
      const i = Math.floor((new Date(iso) - start) / 1000 / size);
      if (i >= 0 && i < buckets) { trend[i].total += 1; trend[i].by[outcome] = (trend[i].by[outcome] || 0) + 1; if (isError) trend[i].errors += 1; }
    };
    hist.forEach((s) => place(s.startedAt, s.decision, s.status === "Eroare" || s.decision === "Respins"));
    if (live) startedIn.forEach((s) => place(s.startedAt, "În curs", false));
    const byUseCase = new Map();
    [...hist, ...startedIn].forEach((s) => byUseCase.set(s.useCaseCode, (byUseCase.get(s.useCaseCode) || 0) + 1));
    return {
      total, hist, act, decided, accepted, errors, abandoned, avg, trend,
      review: act.filter((s) => s.status === "În revizie manuală").length,
      decisions: Object.keys(DECISION_TONES).map((label) => [label, hist.filter((s) => s.decision === label).length]),
      top: [...byUseCase.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  };

  /* one palette for every decision on the dashboard / reports: the product's status tones
     (Acceptat = positive green-600, Respins = danger, Revizuire manuală = warning,
     Fără decizie = neutral grey; sessions still running = brand) */
  const OUTCOMES = [["Acceptat", "success"], ["Revizuire manuală", "warning"], ["Respins", "danger"], ["Fără decizie", "neutral"], ["În curs", "brand"]];
  const legend = (items, total) => `
    <ul class="e-permits-meter-legend e-permits-meter-legend--tray" role="list">
      ${items.map(([label, tone, count]) => `<li><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--${tone}" aria-hidden="true"></span>${esc(label)}${count == null ? "" : ` <strong>${count}</strong>${total ? ` <span class="e-permits-meter-legend__pct">${pct(count, total)}%</span>` : ""}`}</li>`).join("")}
    </ul>`;

  /* Column chart: SVG bars stacked by outcome, bottom → top in OUTCOMES order. The top
     segment is drawn first, rounded (rx 4) and extended under the baseline (the plot clips
     it), so only its top corners show; the lower segments are drawn over it, square. */
  const chartBars = (buckets, max) => {
    const n = buckets.length;
    const w = 100 / n;
    return buckets.map((b, i) => {
      const x = (i * w + w * 0.22).toFixed(2);
      const width = (w * 0.56).toFixed(2);
      const segs = OUTCOMES.map(([key, tone]) => [b.by[key] || 0, tone]).filter(([count]) => count);
      if (!segs.length) return "";
      let cum = 0;
      const placed = segs.map(([count, tone]) => { const y0 = cum; cum += count; return { tone, y0, y1: cum }; });
      const top = placed[placed.length - 1];
      const pctOf = (v) => ((v / max) * 100).toFixed(2);
      const head = `<rect class="e-permits-chart__bar e-permits-chart__bar--${top.tone}" x="${x}%" y="${(100 - pctOf(top.y1)).toFixed(2)}%" width="${width}%" height="100%" rx="4"></rect>`;
      const rest = placed.slice(0, -1).map((p) => `<rect class="e-permits-chart__bar e-permits-chart__bar--${p.tone}" x="${x}%" y="${(100 - pctOf(p.y1)).toFixed(2)}%" width="${width}%" height="${(pctOf(p.y1) - pctOf(p.y0)).toFixed(2)}%"></rect>`).join("");
      return head + rest;
    }).join("");
  };

  const renderTrend = (data, { title = "Tendință sesiuni" } = {}) => {
    const max = Math.max(1, ...data.trend.map((b) => b.total));
    const n = data.trend.length;
    const label = (d) => (ui.period === "1h" || ui.period === "24h" ? api.formatTime(d.toISOString()) : d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }));
    const totalErrors = data.trend.reduce((sum, b) => sum + b.errors, 0);
    const total = data.trend.reduce((sum, b) => sum + b.total, 0);
    const errRate = pct(totalErrors, total);
    const counts = OUTCOMES.map(([key, tone]) => [key, tone, data.trend.reduce((sum, b) => sum + (b.by[key] || 0), 0)]).filter(([, , count]) => count);
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
          <span class="e-permits-dosar-profil__section-meta">rată de eroare ${errRate}%</span>
        </div>
        <div class="e-permits-chart">
          <svg class="e-permits-chart__plot" role="img" aria-label="Sesiuni pe interval, maxim ${max}: ${counts.map(([key, , count]) => `${key} ${count}`).join(", ")}" focusable="false">${chartBars(data.trend, max)}</svg>
          <div class="e-permits-chart__axis" aria-hidden="true"><span>${esc(label(data.trend[0].start))}</span><span>${esc(label(data.trend[Math.floor(n / 2)].start))}</span><span>${esc(label(data.trend[n - 1].start))}</span></div>
          ${legend(counts.map(([key, tone, count]) => [key, tone, count]), null)}
        </div>
      </section>`;
  };

  const renderDecisions = (data, { top = true } = {}) => {
    const total = data.hist.length;
    const tone = Object.fromEntries(OUTCOMES);
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Structura deciziilor</h2>
          <span class="e-permits-dosar-profil__section-meta">${total === 1 ? "1 sesiune încheiată" : `${total} sesiuni încheiate`}</span>
        </div>
        <div class="e-permits-chart">
          ${meter(data.decisions.map(([label, count]) => [count, tone[label]]), { max: total || 1, size: "lg", label: data.decisions.map(([label, count]) => `${label} ${count}`).join(", ") })}
          ${legend(data.decisions.map(([label, count]) => [label, tone[label], count]), total)}
        </div>
      </section>
      ${top && data.top.length ? api.renderInfoCard("Top cazuri de utilizare", data.top.map(([code, count]) => [useCase(code).name, `<span class="e-permits-ekyc-score">${count}</span>`])) : ""}`;
  };

  /* Alerte active — one quiet white card per alert (redesign 2026-10-14): a 32px severity tile
     (Critică = danger tint, Avertisment = warning tint, Informativ = neutral grey; the critical one
     pulses once on first render), the title on one line with the time on the right, the
     description clamped to 2 lines. The severity is spoken, not tagged („Critică: …” hidden prefix).
     Every alert leads to the screen where it can be acted on (ALERT_TARGETS): the whole card is
     the link + a short brand action line; the × (shown on hover / focus, always on touch) only
     dismisses. A role whose menu lacks the target screen gets a plain card without the action.
     Stacked like notifications: the first two in full, the rest as 1–2 neutral „peek” layers
     and „Arată toate (N)” → the alerts modal (same cards). */
  const ALERT_STYLE = { "Critică": ["error", "circle-error-filled"], Avertisment: ["warning", "warning-filled"], Informativ: ["info", "circle-info-filled"] };
  const ALERTS_SHOWN = 2;
  const SEVERITY_ORDER = ["Critică", "Avertisment", "Informativ"];
  const activeAlerts = () => db.alerts.filter((a) => !ui.dismissed.has(a.id)).sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  /* where each kind of alert is acted on: nav item (= the permission: the role's menu has it),
     then a detail hash, a list tab, applied filters or a row to point at */
  const ALERT_TARGETS = {
    provider: () => ({ label: "Deschide furnizorul", nav: "ek-providers", row: (a) => a.ref, focus: '[data-ekcfg="provider-test"]' }),
    rejection: () => ({ label: "Vezi sesiunile", nav: "ek-history", kind: "ekyc-history", filters: (a) => ({ client: [client(a.ref).name], decizie: ["Respins"], perioada: ["Ultimele 7 zile"] }) }),
    "use-case": () => ({ label: "Vezi cazul", nav: "ek-use-cases", hash: (a) => `#ek-caz/${encodeURIComponent(a.ref)}/pasi` }),
    sdk: () => ({ label: "Vezi versiunile", nav: "ek-sdk", tab: "off" }),
    "review-overdue": () => (role() === "supervisor" ? { label: "Vezi coada", nav: "ek-review-all", tab: "În lucru", row: (a) => a.ref, focus: "button" }
      : role() === "operator" ? { label: "Vezi sesiunile mele", nav: "ek-review", row: (a) => a.ref, focus: "button" } : null),
    "root-ca": () => ({ label: "Vezi certificatul", nav: "ek-trusted-cas", hash: (a) => `#ek-certificat/${encodeURIComponent(a.ref)}/general` })
  };
  const navItem = (id) => document.querySelector(`[data-nav-item][data-nav-id="${id}"]`);
  const alertTarget = (a) => {
    const t = ALERT_TARGETS[a.kind]?.();
    return t && navItem(t.nav) ? t : null;
  };
  const goToAlert = (id) => {
    const a = db.alerts.find((x) => x.id === id);
    const t = a && alertTarget(a);
    if (!t) return;
    if (ui.modal) closeModal();
    if (t.filters) api.setRegistryFilters(t.kind, t.filters(a));
    navItem(t.nav).click();
    if (t.hash) {
      window.GEAPShellProduct.route(t.hash(a));
      const h1 = api.els.dosarProfilTitleRow?.querySelector("h1, h2");
      if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
      return;
    }
    if (t.tab) { api.workplaceState.tabKey = t.tab; api.renderWorkplace(); }
    const tr = t.row ? document.querySelector(`tr[data-workplace-row="${CSS.escape(t.row(a))}"]`) : null;
    if (tr) {
      tr.scrollIntoView({ block: "center" });
      tr.classList.add("is-flash");
      window.setTimeout(() => tr.classList.remove("is-flash"), 1900);
      (tr.querySelector(t.focus) || tr.querySelector("a, button"))?.focus({ preventScroll: true });
      return;
    }
    const title = api.els.workplaceTitle;
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  };
  const alertCard = (a, where = "dash") => {
    const [tone, ic] = ALERT_STYLE[a.severity] || ALERT_STYLE.Informativ;
    const t = alertTarget(a);
    const textId = `ekyc-alert-${where}-${a.id}-text`;
    /* the critical tile pulses once, the first time the card is drawn */
    const pulse = tone === "error" && !ui.pulsed.has(`${where}:${a.id}`);
    ui.pulsed.add(`${where}:${a.id}`);
    const titleInner = `<span class="u-visually-hidden">${esc(a.severity)}: </span>${esc(a.title)}${t ? `<span class="u-visually-hidden"> — ${esc(t.label)}</span>` : ""}`;
    return `
      <li class="e-permits-ekyc-alert e-permits-ekyc-alert--${tone}${t ? " is-actionable" : ""}" data-ekyc-alert="${esc(a.id)}"${t ? ` data-ekyc-alert-go="${esc(a.id)}"` : ""}>
        <span class="e-permits-ekyc-alert__tile${pulse ? " is-pulsing" : ""}" aria-hidden="true">${icon(ic)}</span>
        <div class="e-permits-ekyc-alert__body">
          <div class="e-permits-ekyc-alert__head">
            ${t ? `<a class="e-permits-ekyc-alert__title" href="${esc(t.hash ? t.hash(a) : `#${t.nav}`)}" aria-describedby="${textId}" data-cell-tooltip="${esc(a.title)}">${titleInner}</a>`
              : `<p class="e-permits-ekyc-alert__title" data-cell-tooltip="${esc(a.title)}">${titleInner}</p>`}
            <span class="e-permits-ekyc-alert__time">${esc(ago(a.at))}</span>
          </div>
          <p class="e-permits-ekyc-alert__text" id="${textId}" data-cell-tooltip="${esc(a.text)}">${esc(a.text)}</p>
          ${t ? `<span class="e-permits-ekyc-alert__action" aria-hidden="true">${esc(t.label)}&nbsp;→</span>` : ""}
        </div>
        <button class="btn btn-strict btn-sm btn-icon-only e-permits-ekyc-alert__close" type="button" aria-label="Închide alerta: ${esc(a.title)}" data-tooltip-label="Închide alerta" data-ekyc-dismiss="${esc(a.id)}">
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg>
        </button>
      </li>`;
  };

  const renderAlerts = () => {
    const alerts = activeAlerts();
    const rest = alerts.length - ALERTS_SHOWN;
    const body = alerts.length ? `
      <div class="e-permits-ekyc-alerts${ui.restack ? " is-restacked" : ""}">
        <ul class="e-permits-ekyc-alerts__list" role="list">${alerts.slice(0, ALERTS_SHOWN).map((a) => alertCard(a)).join("")}</ul>
        ${rest > 0 ? `<div class="e-permits-ekyc-alerts__peek" aria-hidden="true">${alerts.slice(ALERTS_SHOWN, ALERTS_SHOWN + 2).map(() => '<span class="e-permits-ekyc-alerts__layer"></span>').join("")}</div>` : ""}
      </div>
      ${rest > 0 ? `<div class="e-permits-ekyc-alerts__more"><button class="btn btn-text-primary btn-sm btn-rounded" type="button" aria-haspopup="dialog" data-ekyc-alerts-all>Arată toate (${alerts.length})</button></div>` : ""}`
      : api.renderEmptyState({ title: "Nicio alertă activă", text: "Platforma și furnizorii funcționează normal.", icon: "notification", compact: true });
    ui.restack = false;
    return `
      <section class="e-permits-dosar-profil__section" id="ekyc-alerts">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Alerte active</h2>
          ${alerts.length ? `<span class="e-permits-dosar-profil__section-meta">${alerts.length} ${alerts.length === 1 ? "alertă" : "alerte"}</span>` : ""}
        </div>
        ${body}
      </section>`;
  };

  /* every eKYC dialog uses the page's simple library modal (#case-action-modal: header,
     scrolling content, modal-buttons footer); its close button / Esc / scrim come from
     modal.js, footer buttons with data-case-close close it through the shell */
  const modalEl = () => document.getElementById("case-action-modal");
  const openModal = ({ title, subtitle = "", body, footer, kind = "", focus = "" }) => {
    const overlay = modalEl();
    if (!overlay) return;
    const box = overlay.querySelector(".modal");
    box.className = `modal modal--md e-permits-passport__modal e-permits-case-modal e-permits-ekyc-modal${kind ? ` e-permits-ekyc-modal--${kind}` : ""}`;
    overlay.querySelector("[data-case-modal-title]").textContent = title;
    const sub = overlay.querySelector("[data-case-modal-subtitle]");
    sub.textContent = subtitle;
    sub.hidden = !subtitle;
    overlay.querySelector("[data-case-modal-body]").innerHTML = body;
    overlay.querySelector("[data-case-modal-footer]").innerHTML = footer;
    ui.modal = kind || "dialog";
    if (!overlay.classList.contains("is-active")) window.__modal?.open?.("#case-action-modal");
    if (focus) requestAnimationFrame(() => overlay.querySelector(focus)?.focus());
  };
  const closeModal = () => { ui.modal = ""; window.__modal?.close?.("#case-action-modal"); };
  const modalBody = () => modalEl()?.querySelector("[data-case-modal-body]");
  const closeFooter = '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>';

  const renderAlertsModalBody = () => {
    const alerts = activeAlerts();
    return alerts.length
      ? `<ul class="e-permits-ekyc-alerts__list e-permits-ekyc-alerts__list--all" role="list">${alerts.map((a) => alertCard(a, "modal")).join("")}</ul>`
      : api.renderEmptyState({ title: "Nicio alertă activă", text: "Platforma și furnizorii funcționează normal.", icon: "notification", compact: true });
  };
  const openAlertsModal = () => {
    const n = activeAlerts().length;
    openModal({ title: "Alerte active", subtitle: `${n} ${n === 1 ? "alertă" : "alerte"} · cele critice primele`, body: renderAlertsModalBody(), footer: closeFooter, kind: "alerts" });
  };

  const renderProviders = () => api.renderStackedList("Disponibilitate furnizori", [{
    label: "",
    items: db.providers.map((p) => ({
      title: esc(p.name),
      plainTitle: p.name,
      badges: [api.renderTag(p.state, PROVIDER_TONES[p.state])],
      meta: [p.latency == null ? "nu răspunde" : `latență p95 ${num(p.latency, 1)} s`]
    }))
  }], { meta: `${db.providers.filter((p) => p.state === "Operațional").length} din ${db.providers.length} operaționali` });

  const kpi = (label, value, meta, extra = "", tone = "") => `
    <li class="e-permits-kpi">
      <span class="e-permits-kpi__label">${esc(label)}</span>
      <span class="e-permits-kpi__value${tone ? ` e-permits-kpi__value--${tone}` : ""}">${esc(value)}${extra}</span>
      <span class="e-permits-kpi__meta">${meta}</span>
    </li>`;

  /* toolbar: period (library segmented control, sized to the 40px selects) left · Client and
     Caz de utilizare right · the window caption under it. `periods` lets Rapoarte drop „1 h”;
     `tools` adds right-side actions (Rapoarte: Exportă). */
  const renderFilters = ({ periods = PERIODS, tools = "" } = {}) => {
    const { start, end } = windowOf();
    return `
      <div class="e-permits-ekyc-dash__filters" role="group" aria-label="Filtre">
        <div class="segmented-control e-permits-ekyc-dash__period" role="radiogroup" aria-label="Perioadă">
          ${periods.map(([key, label]) => `<button class="segment-item${ui.period === key ? " is-selected" : ""}" type="button" role="radio" aria-checked="${ui.period === key}" data-ekyc-period="${key}">${label}</button>`).join("")}
        </div>
        <div class="e-permits-ekyc-dash__selects">
          ${ui.client || ui.useCase ? '<button class="btn btn-text-neutral btn-sm" type="button" data-ekyc-dash-reset>Șterge filtrele</button>' : ""}
          <div class="e-permits-ekyc-dash__select">
            ${api.renderFoSelectControl({ id: "ekyc-dash-client", label: "Client", attrs: 'data-ekyc-dash-filter="client"', optionsHtml: `<option value=""${ui.client ? "" : " selected"}>Toți clienții</option>${db.clients.map((c) => `<option value="${esc(c.id)}"${ui.client === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}` })}
          </div>
          <div class="e-permits-ekyc-dash__select">
            ${api.renderFoSelectControl({ id: "ekyc-dash-usecase", label: "Caz de utilizare", attrs: 'data-ekyc-dash-filter="useCase"', optionsHtml: `<option value=""${ui.useCase ? "" : " selected"}>Toate cazurile de utilizare</option>${db.useCases.map((u) => `<option value="${esc(u.code)}"${ui.useCase === u.code ? " selected" : ""}>${esc(u.name)}</option>`).join("")}` })}
          </div>
          ${tools}
        </div>
        <p class="e-permits-ekyc-dash__window">Fereastra: ${esc(api.formatStamp(start.toISOString()))} → ${esc(api.formatStamp(end.toISOString()))}</p>
      </div>`;
  };

  const renderDashboard = () => {
    if (DEMO === "incarcare") return `${renderFilters()}${api.renderEmptyState({ title: "Se încarcă indicatorii…", text: "Datele vin din serviciul de monitorizare.", loading: true })}`;
    if (failed) return `${renderFilters()}${api.renderEmptyState({ title: "Nu am putut încărca indicatorii", text: "Serviciul de monitorizare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", actionHtml: `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry>${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>` })}`;
    const data = dashboardData();
    const empty = !data.total && !data.act.length;
    const accRate = pct(data.accepted, data.decided.length);
    const errRate = pct(data.errors, data.hist.length);
    return `
      ${renderFilters()}
      <section class="e-permits-dosar-profil__section" aria-label="Indicatori cheie">
        <ul class="e-permits-kpi-grid" role="list">
          ${kpi("Sesiuni în fereastră", String(data.total), `<strong>${data.hist.length}</strong> încheiate · <strong>${data.errors}</strong> cu eroare`)}
          ${kpi("Active acum", String(data.act.length), `<strong>${data.review}</strong> în revizie manuală`, ` ${api.renderTag("Live", "success")}`)}
          ${kpi("Rată de acceptare", `${accRate}%`, `din <strong>${data.decided.length}</strong> decizii`, "", data.decided.length && accRate < 70 ? "warning" : "")}
          ${kpi("Rată de eroare", `${errRate}%`, `prag de alertă 5% · <strong>${data.errors}</strong> erori`, "", errRate > 5 ? "danger" : "")}
          ${kpi("Durata medie", data.avg ? duration(data.avg) : "—", "de la inițiere la decizie")}
        </ul>
      </section>
      ${empty ? api.renderEmptyState({ title: "Nicio sesiune în fereastra aleasă", text: "Alege o perioadă mai lungă sau alt client ori caz de utilizare.", icon: "chart", compact: true }) : `
      <div class="e-permits-ekyc-dash__cols">
        <div class="e-permits-ekyc-dash__col">${renderTrend(data)}${renderDecisions(data)}</div>
        <div class="e-permits-ekyc-dash__col">${renderAlerts()}${renderProviders()}</div>
      </div>`}`;
  };

  const renderPlaceholder = (label) => api.renderEmptyState({
    title: `${label} — ecran în pregătire`,
    text: "Configurarea platformei se construiește în etapa următoare a prototipului. Monitorizarea sesiunilor este disponibilă în Dashboard, Sesiuni active și Sesiuni istorice.",
    icon: "settings"
  });

  const syncBell = () => {
    const dot = document.querySelector(".e-permits-shell__notification-dot");
    const count = db ? activeAlerts().length : 0;
    if (dot) { dot.textContent = String(count); dot.hidden = !count; }
    document.querySelector(".e-permits-shell__icon-button--notification")?.setAttribute("aria-label", count ? `Alerte active: ${count}` : "Alerte active: niciuna");
  };

  const rerenderDash = () => {
    if (!page || page.hidden || !["ekyc-dashboard", "ekyc-reports"].includes(ui.view)) return;
    const focusId = document.activeElement?.id;
    page.querySelector("[data-ekyc-page-body]").innerHTML = ui.view === "ekyc-reports" ? renderReports() : renderDashboard();
    if (focusId) document.getElementById(focusId)?.focus();
  };

  /* ---- extensions: batch 3 (js/ekyc-config.js) registers its views, registries, routes
     and data through product.extend(); they share this file's helpers via product.shared ---- */
  const extensions = [];
  const extFor = (view) => extensions.find((x) => x.views.includes(view)) || null;

  /* ---- views ------------------------------------------------------------------- */
  function showView(view, item = {}) {
    ui.view = view;
    hideDash();
    const ext = extFor(view);
    if (ext) { ext.showView(view, item); return; }
    if (view === "ekyc-dashboard") {
      showPage("Dashboard", renderDashboard());
    } else if (view === "ekyc-active") {
      api.showRegistry(buildActiveDb(), { sortKey: "inceput", sortDirection: "desc" });
    } else if (view === "ekyc-history") {
      api.showRegistry(buildHistoryDb(), { sortKey: "finalizat", sortDirection: "desc" });
    } else if (view === "ekyc-review" || view === "ekyc-review-all") {
      const scope = view === "ekyc-review-all" ? "all" : "mine";
      api.showRegistry(buildReviewDb(scope), { sortKey: "termen", sortDirection: "asc" });
    } else if (view === "ekyc-access-log") {
      api.showRegistry(buildAccessDb(), { sortKey: "moment", sortDirection: "desc" });
    } else if (view === "ekyc-reports") {
      if (!ui.reportsSeen || ui.period === "1h") ui.period = "30z";
      ui.reportsSeen = true;
      showPage("Rapoarte", renderReports());
    } else if (view === "ekyc-placeholder") {
      showPage(item.label || "În pregătire", renderPlaceholder(item.label || "Ecranul"));
    }
  }

  /* ---- data -------------------------------------------------------------------- */
  const load = async () => {
    await Promise.all(extensions.map((x) => x.load?.()));
    try {
      const response = await fetch("data/ekyc-sessions.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`eKYC data: ${response.status}`);
      db = await response.json();
    } catch (error) {
      console.warn(error);
      db = { now: new Date().toISOString(), clients: [], useCases: [], providers: [], alerts: [], active: [], history: [] };
      failed = true;
    }
    loadedAt = Date.now();
    /* demo: every alert already dismissed (empty „Alerte active”) */
    if (DEMO === "fara-alerte") db.alerts.forEach((a) => ui.dismissed.add(a.id));
    /* demo: one alert per severity (Critică · Avertisment · Informativ) */
    if (DEMO === "trei-severitati") db.alerts.filter((a) => !["al-1", "al-2", "al-4"].includes(a.id)).forEach((a) => ui.dismissed.add(a.id));
    /* demo: the first active session finished while the list was open */
    if (DEMO === "incheiata" && db.active.length) {
      const s = db.active[0];
      const endAt = [s.lastActivityAt, ...s.steps.map((step) => step.completedAt).filter(Boolean)].sort().pop();
      const ended = { ...s, status: "Finalizată", decision: "Acceptat", completedAt: endAt, durationSeconds: Math.max(60, Math.round((new Date(endAt) - new Date(s.startedAt)) / 1000)), steps: s.steps.map((step) => (step.status === "done" ? step : { ...step, status: "done", score: Math.min(0.97, step.threshold + 0.15), completedAt: endAt })), scoring: { ...(useCase(s.useCaseCode).scoring || { name: "Standard", accept: 0.8, reject: 0.45, minConfidence: 0.6 }), aggregation: "Medie ponderată" }, job: { id: "job_5d1e07aa", worker: "wrk-eu-02", startedAt: s.startedAt, completedAt: endAt, attempts: 1 } };
      ended.finalScore = Math.round(scoreOf(ended) * 100) / 100;
      ended.events = [{ at: endAt, type: "Decizie: Acceptat", status: "Reușit", detail: `Scor final ${num(ended.finalScore)}`, user: "Platforma eKYC" }, ...s.events];
      db.history.unshift(ended);
      db.active = db.active.filter((x) => x !== s);
      db.staleActive = s;
      db.endedIds = [s.id];
    }
  };

  /* ---- wiring ------------------------------------------------------------------ */
  const brand = () => {
    document.title = "EVO eKYC · Back Office";
    document.querySelectorAll(".e-permits-shell__sidebar-title, .e-permits-shell__brand-name").forEach((el) => { el.textContent = "EVO eKYC"; });
    document.querySelectorAll(".e-permits-shell__sidebar-brand, .e-permits-shell__brand").forEach((el) => el.setAttribute("aria-label", "EVO eKYC Back Office"));
  };

  /* batch 2 clicks: review actions, dialogs, viewer, access, export */
  const handleBatch2Click = (event) => {
    const t = (sel) => event.target.closest(sel);
    const s = ui.session ? findSession(ui.session) : null;
    let el;
    if ((el = t("[data-ekyc-review-open]"))) { openReview(el.dataset.ekycReviewOpen); return true; }
    if ((el = t("[data-ekyc-assign]"))) { const x = findSession(el.dataset.ekycAssign); if (x) openAssign(x); return true; }
    if ((el = t("[data-ekyc-assign-mode]")) && ui.draft?.kind === "assign") { ui.draft.values.mode = el.dataset.ekycAssignMode; ui.draft.errors = {}; redrawDraft(assignBody, `[data-ekyc-assign-mode="${ui.draft.values.mode}"]`); return true; }
    if (t("[data-ekyc-assign-submit]")) { submitAssign(); return true; }
    if (t("[data-ekyc-decide-submit]")) { submitDecision(); return true; }
    if (t("[data-ekyc-access-submit]")) { submitAccess(); return true; }
    if ((el = t("[data-ekyc-export]"))) { exportReport(el.dataset.ekycExport); return true; }
    if (!s) return false;
    if (t("[data-ekyc-take]")) {
      const part = myPart(s);
      api.askConfirm({ title: "Preiei revizia?", text: `Sesiunea ${s.id} rămâne a ta până decizi sau o eliberezi. Termen: ${api.formatStamp(s.review.dueAt)} (${dueMeta(s)}).`, confirmLabel: "Preia revizia" }, () => {
        part.state = "Preluată";
        part.takenAt = nowIso();
        if (s.review.status === "Alocată") s.review.status = "În lucru";
        logEvent(s, "Revizie preluată", "Reușit", s.review.id);
        refreshProfile();
        api.els.dosarProfilTitleRow.querySelector("[data-ekyc-decide='Acceptat']")?.focus();
      });
      return true;
    }
    if ((el = t("[data-ekyc-decide]"))) { openDecision(s, el.dataset.ekycDecide); return true; }
    if (t("[data-ekyc-release]")) {
      api.askConfirm({ title: "Eliberezi revizia?", text: `Sesiunea ${s.id} se realocă aleatoriu altui operator disponibil, iar tu pierzi accesul la dovezile ei.`, confirmLabel: "Eliberează revizia", destructive: true }, () => {
        const part = myPart(s);
        const taken = new Set(s.review.assignees.map((a) => a.name));
        const next = db.operators.find((o) => o.state === "Disponibil" && !taken.has(o.name))?.name || "Elena Ciobanu";
        Object.assign(part, { name: next, allocatedAt: nowIso(), state: "Alocată" });
        delete part.takenAt;
        if (s.review.mode !== "multi") s.review.status = "Alocată";
        logEvent(s, "Revizie eliberată și realocată aleatoriu", "Reușit", `${me()} → ${next}`);
        api.showShellToast(`Sesiunea ${s.id} a fost realocată aleatoriu altui operator.`, "success", "Revizie eliberată");
        api.closeProfile();
        showView("ekyc-review");
      });
      return true;
    }
    if ((el = t("[data-ekyc-retry-notify]"))) {
      const who = el.dataset.ekycRetryNotify;
      if (who === "applicant") {
        Object.assign(s.review.notification, { state: "Livrată", at: nowIso(), attempts: s.review.notification.attempts + 1 });
        logEvent(s, "Solicitant notificat: revizie manuală", "Reușit", `${s.review.notification.channel} · retrimisă manual`);
      } else {
        Object.assign(s.review.callback, { state: "Livrat", at: nowIso(), attempts: s.review.callback.attempts + 1, http: "200 OK", next: "" });
        logEvent(s, "Rezultat transmis clientului", "Reușit", "200 OK · retrimis manual");
      }
      refreshProfile();
      return true;
    }
    if (t("[data-ekyc-rsp-retry]")) {
      const d = s.evidence?.document || {};
      s.external = { source: "RSP · MConnect", state: "Disponibil", at: nowIso(), requestId: `mc-${s.id.slice(4)}retry`, ms: 640, record: { name: s.subject.name, idnp: s.subject.idnp, birthDate: s.subject.birthDate, docNumber: d.number, docState: "Valabil", expiry: d.expiry, address: d.address } };
      logEvent(s, "RSP interogat din nou prin MConnect", "Reușit", "Date primite · 640 ms");
      refreshProfile();
      return true;
    }
    if (t("[data-ekyc-access-request]")) { openAccess(s); return true; }
    if (t("[data-ekyc-access-close]")) {
      delete ui.grants[s.id];
      logAccess({ action: "Acces închis", sessionId: s.id, reason: "Închis de utilizator", ref: "" });
      refreshProfile();
      return true;
    }
    if ((el = t("[data-ekyc-evidence]"))) { openViewer(s, el.dataset.ekycEvidence); return true; }
    if (ui.viewer && ui.modal === "viewer") {
      if ((el = t("[data-ekyc-zoom]"))) {
        const i = ZOOMS.indexOf(ui.viewer.zoom);
        const mode = el.dataset.ekycZoom;
        if (mode === "fit") { ui.viewer.zoom = 100; ui.viewer.rot = 0; } else ui.viewer.zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (mode === "in" ? 1 : -1)))];
        redrawViewer(mode === "fit" ? "[data-ekyc-zoom='in']" : `[data-ekyc-zoom='${mode}']:not([disabled])`);
        return true;
      }
      if (t("[data-ekyc-rotate]")) { ui.viewer.rot = (ui.viewer.rot + 90) % 360; redrawViewer("[data-ekyc-rotate]"); return true; }
      if ((el = t("[data-ekyc-frame]"))) { stopPlay(); ui.viewer.frame = Math.max(0, Math.min(2, ui.viewer.frame + (el.dataset.ekycFrame === "next" ? 1 : -1))); redrawViewer(`[data-ekyc-frame='${el.dataset.ekycFrame}']:not([disabled]), [data-ekyc-play]`); return true; }
      if (t("[data-ekyc-play]")) {
        if (ui.viewer.playing) { stopPlay(); redrawViewer("[data-ekyc-play]"); return true; }
        ui.viewer.playing = true;
        if (ui.viewer.frame >= 2) ui.viewer.frame = 0;
        redrawViewer("[data-ekyc-play]");
        playTimer = window.setInterval(() => {
          if (!ui.viewer || ui.modal !== "viewer") { stopPlay(); return; }
          if (ui.viewer.frame >= 2) { stopPlay(); redrawViewer("[data-ekyc-play]"); return; }
          ui.viewer.frame += 1;
          redrawViewer("[data-ekyc-play]");
        }, 1400);
        return true;
      }
    }
    return false;
  };

  const init = (shellApi) => {
    api = shellApi;
    brand();

    document.addEventListener("click", (event) => {
      const open = event.target.closest("[data-ekyc-open]");
      if (open) { openSession(open.dataset.ekycOpen); return; }
      if (handleBatch2Click(event)) return;
      const tab = event.target.closest("[data-ekyc-tab]");
      if (tab) {
        ui.tab = tab.dataset.ekycTab;
        renderSessionPanel();
        api.els.dosarProfilTabs.querySelector(`[data-ekyc-tab="${ui.tab}"]`)?.focus();
        return;
      }
      if (event.target.closest("[data-ekyc-retry]")) {
        failed = false;
        if (DEMO === "eroare") {
          const next = new URL(location.href);
          next.searchParams.delete("ek");
          location.assign(next.href);
          return;
        }
        showView(ui.view);
        return;
      }
      const period = event.target.closest("[data-ekyc-period]");
      if (period) { ui.period = period.dataset.ekycPeriod; rerenderDash(); page.querySelector(`[data-ekyc-period="${ui.period}"]`)?.focus(); return; }
      if (event.target.closest("[data-ekyc-dash-reset]")) { ui.client = ""; ui.useCase = ""; rerenderDash(); return; }
      const dismiss = event.target.closest("[data-ekyc-dismiss]");
      if (dismiss) {
        const inModal = Boolean(dismiss.closest("#case-action-modal"));
        ui.dismissed.add(dismiss.dataset.ekycDismiss);
        ui.restack = true;
        rerenderDash();
        syncBell();
        if (inModal) {
          const n = activeAlerts().length;
          modalBody().innerHTML = renderAlertsModalBody();
          modalEl().querySelector("[data-case-modal-subtitle]").textContent = `${n} ${n === 1 ? "alertă" : "alerte"} · cele critice primele`;
          (modalBody().querySelector("[data-ekyc-dismiss]") || modalEl().querySelector("[data-case-close]"))?.focus();
        } else {
          (page.querySelector("[data-ekyc-dismiss]") || page.querySelector("#ekyc-alerts h2"))?.focus();
        }
        return;
      }
      if (event.target.closest("[data-ekyc-alerts-all]")) { openAlertsModal(); return; }
      /* an alert card = a link to where it is acted on (the × above returned first) */
      const alertGo = event.target.closest("[data-ekyc-alert-go]");
      if (alertGo && !event.defaultPrevented && !(event.target.closest("a[href]") && (event.metaKey || event.ctrlKey || event.shiftKey))) { event.preventDefault(); goToAlert(alertGo.dataset.ekycAlertGo); return; }
      /* the bell = the active alerts on the Dashboard (US-UI-01) */
      if (event.target.closest(".e-permits-shell__icon-button--notification")) {
        document.querySelector('[data-nav-id="ek-dashboard"]')?.click();
        requestAnimationFrame(() => document.getElementById("ekyc-alerts")?.scrollIntoView({ block: "start", behavior: "smooth" }));
        return;
      }
      if (event.target.closest(".e-permits-workplace__refresh") && ["ekyc-dashboard", "ekyc-reports"].includes(ui.view)) rerenderDash();
    });

    /* dialog fields (decision, allocation, access): keep the draft, clear the field's error */
    const onField = (event) => {
      const field = event.target.closest("[data-ekyc-field]");
      if (!field || !ui.draft) return;
      const key = field.dataset.ekycField;
      ui.draft.values[key] = field.value;
      const count = modalBody()?.querySelector(`[data-ekyc-count="${key}"]`);
      if (count) count.textContent = field.value.length;
      if (ui.draft.errors[key] && event.type === "change") {
        delete ui.draft.errors[key];
        const wrap = field.closest(".e-permits-fo-field");
        wrap?.querySelector(".e-permits-fo-field__error")?.remove();
        wrap?.querySelector(".is-error")?.classList.remove("is-error");
        field.removeAttribute("aria-invalid");
      }
    };
    document.addEventListener("input", (event) => {
      onField(event);
      if (event.target.matches?.("[data-workplace-search]")) logSearch(event.target.value);
    });
    document.addEventListener("change", onField);
    /* the player stops when its dialog closes */
    new MutationObserver(() => { if (ui.modal && !modalEl()?.classList.contains("is-active")) { stopPlay(); ui.modal = ""; } })
      .observe(modalEl() || document.body, { attributes: true, attributeFilter: ["class"] });

    document.addEventListener("change", (event) => {
      const select = event.target.closest("[data-ekyc-dash-filter]");
      if (!select) return;
      ui[select.dataset.ekycDashFilter] = select.value;
      rerenderDash();
    });

    api.els.dosarProfilTabs?.addEventListener("keydown", (event) => {
      if (!ui.session || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...api.els.dosarProfilTabs.querySelectorAll("[data-ekyc-tab]")];
      if (!tabs.length) return;
      const i = tabs.findIndex((t) => t.dataset.ekycTab === ui.tab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
    });

    /* live timers (Timp scurs): text only, no re-render */
    window.setInterval(() => {
      if (document.hidden || !db) return;
      document.querySelectorAll("[data-ekyc-elapsed]").forEach((el) => { el.textContent = clock(secondsSince(el.dataset.ekycElapsed)); });
    }, 1000);

    syncBell();
    extensions.forEach((x) => x.init?.());
  };

  const registries = {
    "ekyc-active": { renderCell: renderActiveCell, searchText, sortValue, filterToken, openRow, exportRows: exportActive, emptyHtml: emptyHtml("sesiunile active", { title: "Nicio sesiune activă", text: "Sesiunile apar aici imediat ce un client pornește o verificare.", icon: "time" }) },
    "ekyc-history": { renderCell: renderHistoryCell, searchText, sortValue, filterToken, openRow, exportRows: exportHistory, emptyHtml: emptyHtml("sesiunile istorice", { title: "Nicio sesiune încheiată", text: "Sesiunile apar aici după ce se încheie sau expiră.", icon: "history" }) },
    "ekyc-review": { renderCell: renderReviewCell, searchText: reviewSearch, sortValue: reviewSort, filterToken: reviewFilter, openRow: (id) => openReview(id), exportRows: exportReview, emptyHtml: reviewEmpty },
    "ekyc-access": { renderCell: renderAccessCell, searchText: (row) => [row.utilizator, row.entry.role, row.actiune, row.sesiune, row.context].join(" "), sortValue: (row, key) => (key === "moment" ? Date.parse(row.moment) : row[key] ?? ""), filterToken: accessFilter, openRow: (id) => { const e = db.accessLog[Number(id.slice(4))]; if (e?.sessionId && findSession(e.sessionId)) openSession(e.sessionId); }, exportRows: exportAccess, emptyHtml: (state) => emptyHtml("jurnalul de acces")(state) || (state.query || state.filtered ? null : api.renderEmptyState({ title: "Jurnalul de acces este gol", text: "Aici apar accesările dovezilor, căutările și exporturile, cu cine, când și de ce.", icon: "page-text-lock", bare: true })) }
  };

  /* what an extension may use from this file (read through getters: api / db arrive later) */
  const shared = {
    get api() { return api; }, get db() { return db; }, get failed() { return failed; },
    DEMO, ui, esc: (v) => esc(v), num, icon, identity, meter, legend: (...a) => legend(...a), kpi: (...a) => kpi(...a),
    role: () => role(), me: () => me(), now: () => now(), nowIso: () => nowIso(), ago: (iso) => ago(iso), shortStamp: (iso) => shortStamp(iso),
    client: (id) => client(id), useCase: (code) => useCase(code), trajectory: (...a) => trajectory(...a),
    openModal: (o) => openModal(o), closeModal: () => closeModal(), modalBody: () => modalBody(), modalEl: () => modalEl(), closeFooter,
    fieldError: (m) => fieldError(m), requiredMark, showPage: (t, h) => showPage(t, h), hideDash: () => hideDash(), setBackLabel: (l) => setBackLabel(l),
    showView: (v, item) => showView(v, item), logAccess: (e) => logAccess(e), emptyRows: () => emptyRows()
  };

  window.GEAPShellProduct = {
    id: "ekyc",
    shared,
    /* product.extend({ views, registries, facets, load, init, showView, route, beforeNavigate }) */
    extend: (x) => {
      extensions.push(x);
      Object.assign(window.GEAPShellProduct.registries, x.registries || {});
      Object.assign(window.GEAPShellProduct.facets, x.facets || {});
    },
    rolesUrl: "data/ekyc-roles.json",
    logoutUrl: "bo-login.html?product=ekyc&ended=logout",
    load: async () => { await load(); syncBell(); },
    init,
    facets,
    registries,
    handles: (view) => VIEWS.includes(view) || Boolean(extFor(view)),
    showView,
    beforeNavigate: () => { ui.session = null; ui.mode = "session"; stopPlay(); hideDash(); extensions.forEach((x) => x.beforeNavigate?.()); },
    route: (hash) => {
      if (!db) return false;
      if (extensions.some((x) => x.route?.(hash))) return true;
      const review = hash.match(/^#revizie\/([^/]+)(?:\/([^/]+))?$/);
      if (review) { openReview(decodeURIComponent(review[1]), review[2] || "revizie"); return true; }
      const match = hash.match(/^#sesiune\/([^/]+)(?:\/([^/]+))?$/);
      if (!match) return false;
      openSession(decodeURIComponent(match[1]), match[2] || "general");
      return true;
    }
  };
})();
