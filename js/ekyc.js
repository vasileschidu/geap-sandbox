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
  const ui = { period: "24h", client: "", useCase: "", view: "", session: null, tab: "general", dismissed: new Set() };

  /* ---- vocabulary -------------------------------------------------------------- */
  const ACTIVE_TONES = { "Inițiată": "neutral", "În desfășurare": "info", "Așteaptă utilizatorul": "warning", "Așteaptă furnizorul": "violet", "În revizie manuală": "brand" };
  const FINAL_TONES = { "Finalizată": "success", "Abandonată": "neutral", "Expirată": "warning", "Eroare": "danger" };
  const DECISION_TONES = { Acceptat: "success", Respins: "danger", "Revizuire manuală": "warning", "Fără decizie": "neutral" };
  const ALERT_TONES = { "Critică": "danger", Avertisment: "warning", Informativ: "neutral" };
  const PROVIDER_TONES = { "Operațional": "success", Degradat: "warning", Indisponibil: "danger" };
  const PERIODS = [["1h", "1 h", 3600], ["24h", "24 h", 86400], ["7z", "7 zile", 7 * 86400], ["30z", "30 zile", 30 * 86400]];
  const VIEWS = ["ekyc-dashboard", "ekyc-active", "ekyc-history", "ekyc-placeholder"];

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
  const meter = (segments, { label = "", max = 1 } = {}) => {
    let x = 0;
    const rects = segments.map(([value, tone]) => {
      const width = max ? (value / max) * 100 : 0;
      const rect = `<rect class="e-permits-meter__fill e-permits-meter__fill--${tone}" x="${x.toFixed(2)}%" y="0" width="${width.toFixed(2)}%" height="100%"></rect>`;
      x += width;
      return rect;
    }).join("");
    const single = segments.length === 1;
    return `<span class="e-permits-meter"${single ? ` role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${segments[0][0]}"` : ' role="img"'}${label ? ` aria-label="${esc(label)}"` : ""}><svg class="e-permits-meter__svg" aria-hidden="true" focusable="false"><rect class="e-permits-meter__track" x="0" y="0" width="100%" height="100%"></rect>${rects}</svg></span>`;
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
      inceput: s.startedAt, finalizat: s.completedAt, durata: s.durationSeconds
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
      actiuni: { label: "", width: 128 }
    },
    views: {
      history: {
        title: "Sesiuni istorice",
        selectable: false,
        toolbarLabel: "Filtrare sesiuni istorice",
        searchPlaceholder: "Căutare rapidă după ID, client sau caz de utilizare",
        columns: ["client", "cazUtilizare", "statut", "decizie", "scor", "nivel", "inceput", "finalizat", "durata", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          ...Object.keys(DECISION_TONES).map((label) => ({ id: label, label, filter: `dec:${label}` }))
        ]
      }
    },
    runtimeRows: emptyRows() ? [] : db.history.map(historyRow)
  });

  const rowActions = (row) => `<span class="e-permits-workplace__row-actions">${api.renderRowActions({
    primary: { label: "Vezi detalii", attrs: `data-ekyc-open="${esc(row.id)}" aria-label="Vezi detaliile sesiunii ${esc(row.id)}"` },
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
      default: return esc(row[key] ?? "—");
    }
  };

  const searchText = (row) => [row.id, row.session.correlationId, row.client, row.org, row.cazUtilizare, row.codCaz, row.statut, row.decizie, row.nivel, row.pasCurent, row.furnizor, api.formatLongDate(row.inceput)].filter(Boolean).join(" ");

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
  const emptyHtml = (label) => ({ query, filtered }) => {
    if (DEMO === "incarcare") return api.renderEmptyState({ title: `Se încarcă ${label}…`, text: "Datele vin din serviciul de monitorizare.", loading: true, bare: true });
    if (failed) return api.renderEmptyState({ title: `Nu am putut încărca ${label}`, text: "Serviciul de monitorizare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", bare: true, actionHtml: `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry>${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>` });
    if (query || filtered) return null;
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
      { key: "cazUtilizare", label: "Caz de utilizare", get: (r) => `${r.codCaz}` },
      { key: "decizie", label: "Decizie", get: (r) => r.decizie, tone: (v) => DECISION_TONES[v] || "neutral" },
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "nivel", label: "Nivel asigurare", get: (r) => r.nivel, tone: () => "neutral" }
    ]
  };

  /* ---- session profile (the shell's profile panel + page header) ------------------ */
  const TABS_ACTIVE = [["general", "Date generale", "page-text"], ["pasi", "Pași de verificare"], ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"]];
  const TABS_HISTORY = [["general", "Date generale", "page-text"], ["scor", "Scor și decizie"], ["pasi", "Pași de verificare"], ["dispozitiv", "Dispozitiv"], ["jurnal", "Jurnal"]];

  const tabsOf = (s) => (isHistorical(s) ? TABS_HISTORY : TABS_ACTIVE);
  const tabCount = (s, id) => (id === "pasi" ? s.steps.length : id === "jurnal" ? s.events.length : null);

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
        state: step.status === "done" ? "done" : step.status === "failed" ? "rejected" : step.status === "current" ? (s.status === "Așteaptă utilizatorul" ? "paused" : "current") : "todo",
        meta: step.completedAt ? `${short(step.completedAt)}, ${time(step.completedAt)}<br>${step.score != null ? `scor ${num(step.score)}` : "fără scor"}` : step.status === "current" ? `în curs<br>${esc(step.provider.split(" — ")[0])}` : step.optional ? "opțional" : ""
      })),
      { label: decisionLabel, state: decisionState, meta: hist && s.completedAt ? `${short(s.completedAt)}, ${time(s.completedAt)}<br>${s.finalScore != null ? `scor ${num(s.finalScore)}` : "fără scor"}` : reviewing ? "operator" : "" }
    ];
    const ICONS = { done: "circle-checkmark-filled", current: "time-filled", paused: "pause", rejected: "circle-error-filled" };
    const STATE_SR = { done: "finalizat", current: "în curs", paused: "în așteptare", rejected: "nereușit", todo: "urmează" };

    /* Acum / Urmează */
    let title; let meta; let next = "";
    let calloutIcon = "time-filled";
    if (hist) {
      calloutIcon = decisionState === "done" ? "circle-checkmark-filled" : decisionState === "paused" ? "pause" : "circle-error-filled";
      title = s.decision === "Fără decizie" ? `Sesiune ${s.status.toLocaleLowerCase("ro")}` : `Decizie: ${s.decision}`;
      meta = `${api.formatStamp(s.completedAt)} · după ${duration(s.durationSeconds)}`;
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

    return `
      <section class="e-permits-dosar-profil__section e-permits-trajectory-section">
        <h2 class="e-permits-dosar-profil__section-title">Plan de verificare</h2>
        <div class="e-permits-trajectory">
          <ol class="e-permits-trajectory__steps e-permits-trajectory__steps--n${steps.length}">
            ${steps.map((step) => `
              <li class="e-permits-trajectory__step is-${step.state}"${["current", "paused"].includes(step.state) ? ' aria-current="step"' : ""}>
                <span class="e-permits-trajectory__marker" aria-hidden="true">${step.state === "todo" ? '<span class="e-permits-trajectory__dot"></span>' : icon(ICONS[step.state], 24)}</span>
                <span class="e-permits-trajectory__label">${esc(step.label)}<span class="sr-only"> — ${STATE_SR[step.state]}</span></span>
                ${step.meta ? `<span class="e-permits-trajectory__meta">${step.meta}</span>` : ""}
              </li>`).join("")}
          </ol>
        </div>
        ${hist && !next ? "" : `<div class="e-permits-callout-wrap">
          <div class="e-permits-callout e-permits-callout--info" role="status">
            <span class="e-permits-callout__icon" aria-hidden="true">${icon(calloutIcon, 24)}</span>
            <div class="e-permits-callout__content">
              <p class="e-permits-callout__title">${esc(title)}</p>
              <p class="e-permits-callout__meta">${esc(meta)}</p>
              ${next ? `<p class="e-permits-callout__text"><strong>Urmează:</strong> ${esc(next)}</p>` : ""}
            </div>
          </div>
        </div>`}
      </section>`;
  };

  /* US-UI-05: „Decizia și scorul final sunt elementele dominante” — first on the page */
  const renderDecision = (s) => {
    const tone = { Acceptat: "success", Respins: "danger", "Revizuire manuală": "warning" }[s.decision] || "neutral";
    const ic = { success: "circle-checkmark-filled", danger: "circle-error-filled", warning: "warning-filled", neutral: "circle-info-filled" }[tone];
    const title = s.decision === "Fără decizie" ? `Fără decizie · sesiune ${s.status.toLocaleLowerCase("ro")}` : `${s.decision} · scor final ${num(s.finalScore)}`;
    const why = {
      Acceptat: `Scorul final ${num(s.finalScore)} atinge pragul de acceptare ${num(s.scoring.accept)}.`,
      Respins: `Scorul final ${num(s.finalScore)} este sub pragul de respingere ${num(s.scoring.reject)}.`,
      "Revizuire manuală": `Scorul final ${num(s.finalScore)} este între pragul de respingere ${num(s.scoring.reject)} și cel de acceptare ${num(s.scoring.accept)}.`
    }[s.decision] || { "Abandonată": "Utilizatorul a închis fluxul înainte de ultimul pas.", "Expirată": "Fără activitate 30 de minute.", Eroare: "Jobul de verificare a eșuat după 3 încercări." }[s.status] || "";
    return `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Decizie</h2>
        <div class="e-permits-callout e-permits-callout--${tone} e-permits-ekyc-decision" role="status">
          <span class="e-permits-callout__icon" aria-hidden="true">${icon(ic, 24)}</span>
          <div class="e-permits-callout__content">
            <p class="e-permits-callout__title">${esc(title)}</p>
            <p class="e-permits-callout__meta">${esc(why)}</p>
            <p class="e-permits-callout__text">Configurație: ${esc(s.scoring.name)} · ${esc(s.scoring.aggregation)}</p>
          </div>
        </div>
      </section>`;
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
    return `${hist ? renderDecision(s) : ""}${renderPlan(s)}${api.renderInfoCard("Sesiune", sessionRows(s))}${api.renderInfoCard("Identificatori", identifierRows(s))}${job}`;
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
      ["Stare", api.renderTag(s.review.state, s.review.state === "Preluată" ? "brand" : "warning")],
      ["Operator", esc(s.review.state === "Preluată" ? s.review.by : "Nepreluată")]
    ]) : "";
    return `${breakdown}${review}${config}`;
  };

  const renderJournal = (s) => api.renderEventTimeline("Jurnal", s.events, { meta: "Jurnalizat prin MLog" });

  const renderSessionBody = (s, tab) => {
    if (DEMO === "incarcare") return api.renderEmptyState({ title: "Se încarcă sesiunea…", text: "Detaliile vin din serviciul de monitorizare.", loading: true });
    switch (tab) {
      case "pasi": return renderSteps(s);
      case "dispozitiv": return renderDevice(s);
      case "scor": return renderScore(s);
      case "jurnal": return renderJournal(s);
      default: return renderGeneral(s);
    }
  };

  const renderSessionHeader = (s) => {
    const hist = isHistorical(s);
    const uc = useCase(s.useCaseCode);
    api.els.dosarProfilTitleRow.innerHTML = api.renderPageHeaderTop({
      crumbs: [{ label: hist ? "Sesiuni istorice" : "Sesiuni active", attr: "data-dosar-profil-crumb-back" }, { label: s.id }],
      title: client(s.clientId).name
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
        ${ic ? icon(ic) : ""}<span>${esc(label)}</span>${count ? api.renderPageHeaderTabCount(count) : ""}
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
    body.innerHTML = renderSessionBody(s, ui.tab);
    history.replaceState(null, "", `${location.pathname}${location.search}#sesiune/${s.id}/${ui.tab}`);
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
    if (api.els.workplaceRefresh) api.els.workplaceRefresh.hidden = ui.view !== "ekyc-dashboard";
  };

  const windowOf = () => {
    const sec = PERIODS.find(([key]) => key === ui.period)[2];
    const end = now();
    return { start: new Date(end.getTime() - sec * 1000), end, sec };
  };

  const inScope = (s) => (!ui.client || s.clientId === ui.client) && (!ui.useCase || s.useCaseCode === ui.useCase);

  const dashboardData = () => {
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
    const trend = Array.from({ length: buckets }, (_, i) => ({ start: new Date(start.getTime() + i * size * 1000), total: 0, errors: 0 }));
    const place = (iso, isError) => {
      const i = Math.floor((new Date(iso) - start) / 1000 / size);
      if (i >= 0 && i < buckets) { trend[i].total += 1; if (isError) trend[i].errors += 1; }
    };
    hist.forEach((s) => place(s.startedAt, s.status === "Eroare" || s.decision === "Respins"));
    startedIn.forEach((s) => place(s.startedAt, false));
    const byUseCase = new Map();
    [...hist, ...startedIn].forEach((s) => byUseCase.set(s.useCaseCode, (byUseCase.get(s.useCaseCode) || 0) + 1));
    return {
      total, hist, act, decided, accepted, errors, abandoned, avg, trend,
      review: act.filter((s) => s.status === "În revizie manuală").length,
      decisions: Object.keys(DECISION_TONES).map((label) => [label, hist.filter((s) => s.decision === label).length]),
      top: [...byUseCase.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  };

  const renderTrend = (data) => {
    const max = Math.max(1, ...data.trend.map((b) => b.total));
    const n = data.trend.length;
    const w = 100 / n;
    const label = (d) => (ui.period === "1h" || ui.period === "24h" ? api.formatTime(d.toISOString()) : d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }));
    const bars = data.trend.map((b, i) => {
      const h = (b.total / max) * 100;
      const e = (b.errors / max) * 100;
      return `<rect class="e-permits-chart__bar" x="${(i * w + w * 0.15).toFixed(2)}%" y="${(100 - h).toFixed(2)}%" width="${(w * 0.7).toFixed(2)}%" height="${h.toFixed(2)}%"></rect>${b.errors ? `<rect class="e-permits-chart__bar e-permits-chart__bar--danger" x="${(i * w + w * 0.15).toFixed(2)}%" y="${(100 - e).toFixed(2)}%" width="${(w * 0.7).toFixed(2)}%" height="${e.toFixed(2)}%"></rect>` : ""}`;
    }).join("");
    const totalErrors = data.trend.reduce((sum, b) => sum + b.errors, 0);
    const errRate = pct(totalErrors, data.trend.reduce((sum, b) => sum + b.total, 0));
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Tendință sesiuni</h2>
          <span class="e-permits-dosar-profil__section-meta">rată de eroare ${errRate}%</span>
        </div>
        <div class="e-permits-chart">
          <svg class="e-permits-chart__plot" role="img" aria-label="Sesiuni pe interval: maxim ${max}; ${totalErrors} respinse sau cu eroare" focusable="false">${bars}</svg>
          <div class="e-permits-chart__axis" aria-hidden="true"><span>${esc(label(data.trend[0].start))}</span><span>${esc(label(data.trend[Math.floor(n / 2)].start))}</span><span>${esc(label(data.trend[n - 1].start))}</span></div>
          <ul class="e-permits-meter-legend" role="list">
            <li><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--brand" aria-hidden="true"></span>Sesiuni inițiate</li>
            <li><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--danger" aria-hidden="true"></span>Respinse sau cu eroare</li>
          </ul>
        </div>
      </section>`;
  };

  const renderDecisions = (data) => {
    const total = data.hist.length;
    const tone = { Acceptat: "success", Respins: "danger", "Revizuire manuală": "warning", "Fără decizie": "neutral" };
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Structura deciziilor</h2>
          <span class="e-permits-dosar-profil__section-meta">${total === 1 ? "1 sesiune încheiată" : `${total} sesiuni încheiate`}</span>
        </div>
        <div class="e-permits-dosar-profil__card e-permits-ekyc-decisions">
          ${meter(data.decisions.map(([label, count]) => [count, tone[label]]), { max: total || 1, label: data.decisions.map(([label, count]) => `${label} ${count}`).join(", ") })}
          <ul class="e-permits-meter-legend" role="list">
            ${data.decisions.map(([label, count]) => `<li><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--${tone[label]}" aria-hidden="true"></span>${esc(label)} <strong>${count}</strong> <span class="e-permits-meter-legend__pct">${pct(count, total)}%</span></li>`).join("")}
          </ul>
        </div>
      </section>
      ${data.top.length ? api.renderInfoCard("Top cazuri de utilizare", data.top.map(([code, count]) => [useCase(code).name, `<span class="e-permits-ekyc-score">${count}</span>`])) : ""}`;
  };

  const renderAlerts = () => {
    const alerts = db.alerts.filter((a) => !ui.dismissed.has(a.id));
    const item = (a) => ({
      title: esc(a.title),
      plainTitle: a.title,
      badges: [api.renderTag(a.severity, ALERT_TONES[a.severity])],
      meta: [esc(a.text)],
      meta2: [esc(ago(a.at))],
      actionsHtml: `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Închide alerta: ${esc(a.title)}" data-tooltip-label="Închide alerta" data-ekyc-dismiss="${esc(a.id)}">${icon("cross-small", 16)}</button>`
    });
    return `<div id="ekyc-alerts">${api.renderStackedList("Alerte active", alerts.length ? [{ label: "", items: alerts.map(item) }] : [], { meta: alerts.length ? `${alerts.length} ${alerts.length === 1 ? "alertă" : "alerte"}` : "", empty: "Nicio alertă activă. Platforma și furnizorii funcționează normal." })}</div>`;
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

  const renderFilters = () => {
    const { start, end } = windowOf();
    return `
      <div class="e-permits-ekyc-dash__filters" role="group" aria-label="Filtre dashboard">
        <div class="segmented-control" role="radiogroup" aria-label="Perioadă">
          ${PERIODS.map(([key, label]) => `<button class="segment-item${ui.period === key ? " is-selected" : ""}" type="button" role="radio" aria-checked="${ui.period === key}" data-ekyc-period="${key}">${label}</button>`).join("")}
        </div>
        <div class="e-permits-ekyc-dash__select">
          ${api.renderFoSelectControl({ id: "ekyc-dash-client", label: "Client", attrs: 'data-ekyc-dash-filter="client"', optionsHtml: `<option value=""${ui.client ? "" : " selected"}>Toți clienții</option>${db.clients.map((c) => `<option value="${esc(c.id)}"${ui.client === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}` })}
        </div>
        <div class="e-permits-ekyc-dash__select">
          ${api.renderFoSelectControl({ id: "ekyc-dash-usecase", label: "Caz de utilizare", attrs: 'data-ekyc-dash-filter="useCase"', optionsHtml: `<option value=""${ui.useCase ? "" : " selected"}>Toate cazurile de utilizare</option>${db.useCases.map((u) => `<option value="${esc(u.code)}"${ui.useCase === u.code ? " selected" : ""}>${esc(u.name)}</option>`).join("")}` })}
        </div>
        ${ui.client || ui.useCase ? '<button class="btn btn-text-neutral btn-sm" type="button" data-ekyc-dash-reset>Șterge filtrele</button>' : ""}
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
    const count = db ? db.alerts.filter((a) => !ui.dismissed.has(a.id)).length : 0;
    if (dot) { dot.textContent = String(count); dot.hidden = !count; }
    document.querySelector(".e-permits-shell__icon-button--notification")?.setAttribute("aria-label", count ? `Alerte active: ${count}` : "Alerte active: niciuna");
  };

  const rerenderDash = () => {
    if (!page || page.hidden || ui.view !== "ekyc-dashboard") return;
    const focusId = document.activeElement?.id;
    page.querySelector("[data-ekyc-page-body]").innerHTML = renderDashboard();
    if (focusId) document.getElementById(focusId)?.focus();
  };

  /* ---- views ------------------------------------------------------------------- */
  function showView(view, item = {}) {
    ui.view = view;
    hideDash();
    if (view === "ekyc-dashboard") {
      showPage("Dashboard", renderDashboard());
    } else if (view === "ekyc-active") {
      api.showRegistry(buildActiveDb(), { sortKey: "inceput", sortDirection: "desc" });
    } else if (view === "ekyc-history") {
      api.showRegistry(buildHistoryDb(), { sortKey: "finalizat", sortDirection: "desc" });
    } else if (view === "ekyc-placeholder") {
      showPage(item.label || "În pregătire", renderPlaceholder(item.label || "Ecranul"));
    }
  }

  /* ---- data -------------------------------------------------------------------- */
  const load = async () => {
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

  const init = (shellApi) => {
    api = shellApi;
    brand();

    document.addEventListener("click", (event) => {
      const open = event.target.closest("[data-ekyc-open]");
      if (open) { openSession(open.dataset.ekycOpen); return; }
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
        ui.dismissed.add(dismiss.dataset.ekycDismiss);
        rerenderDash();
        syncBell();
        page.querySelector("[data-ekyc-dismiss]")?.focus();
        return;
      }
      /* the bell = the active alerts on the Dashboard (US-UI-01) */
      if (event.target.closest(".e-permits-shell__icon-button--notification")) {
        document.querySelector('[data-nav-id="ek-dashboard"]')?.click();
        requestAnimationFrame(() => document.getElementById("ekyc-alerts")?.scrollIntoView({ block: "start", behavior: "smooth" }));
        return;
      }
      if (event.target.closest(".e-permits-workplace__refresh") && ui.view === "ekyc-dashboard") rerenderDash();
    });

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
  };

  const registries = {
    "ekyc-active": { renderCell: renderActiveCell, searchText, sortValue, filterToken, openRow, exportRows: exportActive, emptyHtml: emptyHtml("sesiunile active") },
    "ekyc-history": { renderCell: renderHistoryCell, searchText, sortValue, filterToken, openRow, exportRows: exportHistory, emptyHtml: emptyHtml("sesiunile istorice") }
  };

  window.GEAPShellProduct = {
    id: "ekyc",
    rolesUrl: "data/ekyc-roles.json",
    logoutUrl: "bo-login.html?product=ekyc&ended=logout",
    load: async () => { await load(); syncBell(); },
    init,
    facets,
    registries,
    handles: (view) => VIEWS.includes(view),
    showView,
    beforeNavigate: () => { ui.session = null; hideDash(); },
    route: (hash) => {
      const match = hash.match(/^#sesiune\/([^/]+)(?:\/([^/]+))?$/);
      if (!match || !db) return false;
      openSession(decodeURIComponent(match[1]), match[2] || "general");
      return true;
    }
  };
})();
