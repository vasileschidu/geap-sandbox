/* =====================================================================================
   Setări › Sincronizarea mediilor (env-sync-v1, 2026-11-18) — Feature 97187 „Sincronizarea obiectelor între medii”,
   US-346 (97188) list · US-347 (97189) one object · US-348 (97190) batch · US-351 (97191) blocking / skipping ·
   US-352 (97192) object history · US-353 (97193) batch activity + audit. Data: data/env-sync.json.

   NO new engine — the list is the BO registry (`window.GEAPShellRegistries.sincronizare`, menu
   `shellView: "sincronizare-registry"`, nav id `sincronizarea-mediilor`, Administrator central only):
     · status tabs „Toate divergențele” · „DEV ≠ STAGING” · „STAGING ≠ PROD” with counts (AC-09…11), Filtrare = facet
       „Tip obiect” (only the types in the list, AC-12), search name + type (AC-13), the row checkbox column (US-348 AC-02/03);
     · secondary „Sincronizează selecția (N)” + primary „Sincronizează tot ce este afișat (N)” (aria-disabled + reason at 0);
     · columns Obiect (+ the last sync under the name, AC-16) · Tip · DEV · STAGING (tinted, „aici lucrezi”) · PROD
       (NEW part: the version cell ▲ / ▼ / „—” + „lipsește” / „schiță”) · DEV ⇄ STAGING · STAGING ⇄ PROD (NEW part: the
       direction button with the step type — or the block reason — under it, „sincronizat” when equal);
     · the row opens the object history (US-352) = the ONE drawer `--lg`;
     · „Revizuirea sincronizării” = the library dialog (`GEAPRegistre.openModal`, kind `sync`): scope, the three
       direction radios (fixed when opened from a row button), the steps table with „Motiv propriu (opțional)”, the
       skipped objects box, the required batch reason, the user's identity; confirm → steps run, blocked ones skipped,
       one PROMOTE audit event per step (correlation id = batch id), success toast with the batch id;
     · „Activitate” = the last status tab, after a divider, history icon, no count (env-sync-activity-tab-v1, 2026-11-19):
       collapsible group rows per batch (newest open), each a table Ce · Sensul · Versiunea · De ce, in the table's place;
       the header toolbar keeps its slot (v2): its search filters the batches (text kept per view), „Vezi în Audit &
       Logging” replaces „Sincronizează tot”; a name opens the history; the audit button opens the batch's audit record.
   Demo switch ?sincronizare= gol (no divergence) · fara-permisiune. Route #sincronizarea-mediilor.
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
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ""; };
  const timeOf = (iso) => String(iso || "").slice(11, 16);
  /* Romanian counts: 1 modificare · 2–19 modificări · 20+ de modificări */
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;

  const KIND = "sincronizare";
  const NAV = "sincronizarea-mediilor";
  const TITLE = "Sincronizarea mediilor";
  const ACT = "activity";
  const SEARCH_LIST = "Caută după denumire sau tip";
  const SEARCH_ACT = "Caută după lot, obiect, motiv sau autor";
  /* the AC texts in the „tu” tone (components.md › Ton: tu) — the stories say „Nu aveți …”, „Lucrați …”, „aici lucrați”,
     „publicați-o” (deviations listed for the PO) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const DRAFT_BLOCK = "Versiune în schiță: publică-o mai întâi";
  const REASON_REQUIRED = "Motivul lotului este obligatoriu.";
  const EMPTY_ALL = "Nicio divergență. DEV, STAGING și PROD conțin aceeași versiune a fiecărui obiect.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const NO_STEPS = "Nu există nimic de sincronizat pe sensul ales.";
  const ENV_LABEL = { dev: "DEV", staging: "STAGING", prod: "PROD" };
  const PAIRS = { ds: { a: "dev", b: "staging", label: "DEV ⇄ STAGING" }, sp: { a: "staging", b: "prod", label: "STAGING ⇄ PROD" } };
  const MODES = [
    ["both", "Ambele sensuri", "Aduce cele trei medii la versiunea cea mai mare, prin STAGING."],
    ["ds", "Doar DEV ⇄ STAGING", "Doar pașii dintre DEV și STAGING."],
    ["sp", "Doar STAGING ⇄ PROD", "Doar pașii dintre STAGING și PROD."]
  ];
  const STEP_TYPE = { staging: "preluare în STAGING", dev: "propagare în DEV", prod: "promovare în PROD" };
  const arrow = (from, to) => `${ENV_LABEL[from]} → ${ENV_LABEL[to]}`;

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("sincronizare") || "").split(",").map((s) => s.trim()).filter(Boolean));
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    return {
      has: central && !demo.has("fara-permisiune"),
      name: A().currentUserName?.() || "Anastasia Cojocaru",
      role: a.roleLabel || "Administrator central",
      domain: central ? "Global" : a.instanceLabel || a.authorityShort || "—"
    };
  }

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null, open: null, selectedFor: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = fetch("data/env-sync.json?v=env-sync-v1").then((r) => r.json()).then((json) => {
        /* AC-15 demo: every object already at the same version everywhere */
        if (demo.has("gol")) json.objects.forEach((o) => { const top = Math.max(...["dev", "staging", "prod"].map((e) => o[e]?.v || 0)); ["dev", "staging", "prod"].forEach((e) => { o[e] = { v: top }; }); delete o.gate; });
        S.data = json;
        S.open = new Set(json.batches[0] ? [json.batches[0].id] : []);
        return json;
      }).catch(() => { S.data = { env: "STAGING", objects: [], batches: [] }; S.open = new Set(); return S.data; });
    }
    return S.loading;
  }
  const objects = () => S.data?.objects || [];
  const batches = () => S.data?.batches || [];
  const objOf = (id) => objects().find((o) => o.id === id) || null;
  const vnum = (e) => (e ? e.v : null);
  const diverges = (o, pair) => vnum(o[PAIRS[pair].a]) !== vnum(o[PAIRS[pair].b]);
  const inList = (o) => diverges(o, "ds") || diverges(o, "sp");

  /* one pair of an object: the higher version goes over the lower (US-347 AC-03…06); blocked by a draft in the source
     (US-351 AC-02/03) or by the module's failed gate on that pair (AC-05/06); null = equal („sincronizat”, AC-07) */
  function pairStep(o, pair, state = o) {
    const { a, b } = PAIRS[pair];
    const va = vnum(state[a]);
    const vb = vnum(state[b]);
    if (va === vb) return null;
    const from = (va ?? -1) > (vb ?? -1) ? a : b;
    const to = from === a ? b : a;
    const blocked = state[from]?.draft ? DRAFT_BLOCK : o.gate?.pair === pair ? o.gate.message : "";
    return { object: o.id, pair, from, to, before: vnum(state[to]), after: vnum(state[from]), type: STEP_TYPE[to], blocked };
  }
  /* the batch plan (US-348 AC-08…12): „Ambele sensuri” goes through STAGING — PROD first when PROD holds the highest
     version (AC-09), else DEV ⇄ STAGING first; a blocked pair is skipped and the next pair is judged on what is there */
  function plan(list, mode) {
    const steps = [];
    const skipped = [];
    list.forEach((o) => {
      const state = { dev: o.dev && { ...o.dev }, staging: o.staging && { ...o.staging }, prod: o.prod && { ...o.prod } };
      const top = Math.max(...["dev", "staging", "prod"].map((e) => vnum(state[e]) ?? -1));
      const prodFirst = vnum(state.prod) === top && vnum(state.staging) !== top && vnum(state.dev) !== top;
      const order = (prodFirst ? ["sp", "ds"] : ["ds", "sp"]).filter((p) => mode === "both" || mode === p);
      order.forEach((pair) => {
        const st = pairStep(o, pair, state);
        if (!st) return;
        if (st.blocked) { skipped.push(st); return; }
        steps.push(st);
        state[st.to] = { v: st.after };
      });
    });
    return { steps, skipped };
  }

  /* ---------------------------------------------------------------- history (US-352) — from the batches */
  function stepsOf(id) {
    const out = [];
    batches().forEach((b) => b.steps.forEach((s) => { if (s.object === id) out.push({ ...s, batch: b }); }));
    return out.sort((x, y) => y.batch.at.localeCompare(x.batch.at));
  }
  const lastSync = (id) => stepsOf(id).find((s) => !s.skipped) || null;
  const reasonOf = (s) => s.ownReason || s.batch.reason;

  /* ---------------------------------------------------------------- cells */
  /* NEW part — the version cell (components.md › „Sincronizarea mediilor”): ▲ the highest, ▼ a lower one (AC-05),
     „—” + „lipsește” (AC-06), Small tag „schiță” (AC-07) */
  function versionHtml(o, env) {
    const e = o[env];
    if (!e) return '<span class="e-permits-sync-ver is-missing"><span class="e-permits-sync-ver__num">—</span><span class="e-permits-sync-ver__meta">lipsește</span></span>';
    const top = Math.max(...["dev", "staging", "prod"].map((k) => vnum(o[k]) ?? -1));
    const high = e.v === top;
    const mark = inList(o) ? `<span class="e-permits-sync-ver__mark" aria-hidden="true">${high ? "▲" : "▼"}</span><span class="u-visually-hidden">, ${high ? "versiunea cea mai mare" : "versiune mai mică"}</span>` : "";
    return `<span class="e-permits-sync-ver${inList(o) ? (high ? " is-high" : " is-low") : ""}"><span class="e-permits-sync-ver__num">v${e.v}${mark}</span>${e.draft ? tag("schiță", "warning") : ""}</span>`;
  }
  /* NEW part — the direction cell: the button names source → target, the step type under it (US-347 AC-02);
     blocked = aria-disabled + the reason under it (US-351 AC-03/04/06); equal = „sincronizat”, no button (AC-07) */
  function directionHtml(o, pair) {
    const st = pairStep(o, pair);
    if (!st) return `<span class="e-permits-sync-dir__done">${icon("checkmark-small", 16)}<span>sincronizat</span></span>`;
    const label = arrow(st.from, st.to);
    const blocked = Boolean(st.blocked);
    const id = `sync-why-${esc(o.id)}-${pair}`;
    return `
      <span class="e-permits-sync-dir${blocked ? " is-blocked" : ""}">
        <button class="btn btn-neutral btn-sm e-permits-sync-dir__btn" type="button" data-sync-step="${esc(o.id)}" data-sync-pair="${pair}"${blocked ? ` aria-disabled="true" aria-describedby="${id}"` : ""} aria-label="${esc(`${label}, ${st.type}: ${o.name}`)}">${esc(label)}</button>
        <span class="e-permits-sync-dir__note" id="${id}">${esc(blocked ? st.blocked : st.type)}</span>
      </span>`;
  }
  /* env-sync-panel-v3 (user 2026-11-19: „an actionable panel, not simple details”; GitHub merge box / Vercel promote =
     look & feel; v2 grey Alert cards → user: no grey, ONE bordered container with dividers): the BO STACKED LIST, one
     row per pair — lead = the status glyph 20 (the dashboard alert lead `.e-permits-dsh-alert__icon--{tone}`), title =
     the state in words (source first, „DEV are v7, STAGING are v6”), meta = what changes („STAGING trece de la v6 la
     v7.”), action right = the table's direction label („DEV → STAGING”); waiting = clock glyph (time-filled): ONE labelled `btn-primary` = the first unblocked step
     toward the highest version, another pending step `btn-secondary`; blocked (draft / failed gate) = warning glyph,
     the button aria-disabled + described by the reason under it; the action = the table's direction cell (button +
     step-type note 4 under it); equal = positive glyph „… sunt la zi” + the success Small tag „sincronizat” in the action slot.
     Rows are not clickable (no hover); a button click closes the drawer → the single-object review. */
  const verOr = (v) => (v == null ? "—" : `v${v}`);
  const LEAD = { info: "time-filled", warning: "warning-filled", success: "circle-checkmark-filled" };
  function pairItem(o, pair, primary) {
    const { a, b } = PAIRS[pair];
    const st = pairStep(o, pair);
    const id = `sync-pc-${esc(o.id)}-${pair}`;
    const item = (tone, title, meta, actionsHtml = "") => ({
      plainTitle: title, title: esc(title), meta: [meta], actionsHtml,
      leadHtml: `<span class="e-permits-dsh-alert__icon e-permits-dsh-alert__icon--${tone}" aria-hidden="true">${icon(LEAD[tone])}</span>`
    });
    if (!st) return item("success", `${ENV_LABEL[a]} și ${ENV_LABEL[b]} sunt la zi`, esc(`Ambele au ${verOr(vnum(o[a]))}. Nimic de sincronizat.`), tag("sincronizat", "success"));
    const has = (env) => (o[env] ? `${ENV_LABEL[env]} are ${verOr(vnum(o[env]))}` : `${ENV_LABEL[env]} nu are obiectul`);
    const blocked = Boolean(st.blocked);
    const label = arrow(st.from, st.to);
    /* the table's direction cell 1:1 (`.e-permits-sync-dir` › button + `__note` = step type, or the block reason) */
    const btn = `<span class="e-permits-sync-dir${blocked ? " is-blocked" : ""}">
        <button class="btn ${primary ? "btn-primary" : "btn-secondary"} btn-sm e-permits-sync-dir__btn" type="button" data-sync-step="${esc(o.id)}" data-sync-pair="${pair}"${blocked ? ` aria-disabled="true" aria-describedby="${id}-why"` : ""} aria-label="${esc(`${label}, ${st.type}`)}">${esc(label)}</button>
        <span class="e-permits-sync-dir__note" id="${id}-why">${esc(blocked ? st.blocked : st.type)}</span>
      </span>`;
    const meta = esc(st.before == null ? `${ENV_LABEL[st.to]} primește obiectul în v${st.after}.` : `${ENV_LABEL[st.to]} trece de la v${st.before} la v${st.after}.`);
    return item(blocked ? "warning" : "info", `${has(st.from)}, ${has(st.to)}`, meta, btn);
  }
  function panelActions(o) {
    const first = plan([o], "both").steps[0]?.pair;
    return A().renderStackedList?.("Sincronizare", [{ label: "", items: ["ds", "sp"].map((pair) => pairItem(o, pair, pair === first)) }], { className: "e-permits-sync-panel" }) || "";
  }
  function lastSyncLine(o) {
    const s = lastSync(o.id);
    const text = s
      ? `${arrow(s.from, s.to)} · v${s.before ?? "—"} → v${s.after} · ${s.batch.user} · ${longDate(s.batch.at)}, ${timeOf(s.batch.at)}`.replace("v— →", "— →")
      : "Nicio sincronizare înregistrată";
    return `<span class="e-permits-sync-name__meta" data-cell-tooltip="${esc(text)}">${esc(text)}</span>`;
  }

  /* ---------------------------------------------------------------- the registry (US-346) */
  const rowOf = (o) => ({ id: o.id, name: o.name, type: o.type, o });
  function registryDb() {
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 7,
      pageSizes: [25, 50, 100],
      columns: {
        obiect: { label: "Obiect", width: 288, sortable: true, fill: true },
        tip: { label: "Tip", width: 144, sortable: true },
        dev: { label: "DEV", width: 96 },
        staging: { label: "STAGING", width: 168 },
        prod: { label: "PROD", width: 96 },
        ds: { label: "DEV ⇄ STAGING", width: 184 },
        sp: { label: "STAGING ⇄ PROD", width: 184 }
      },
      views: {
        [KIND]: {
          title: TITLE,
          searchPlaceholder: SEARCH_LIST,
          columns: ["obiect", "tip", "dev", "staging", "prod", "ds", "sp"],
          tabs: [
            { id: "all", label: "Toate divergențele", filter: "pair:all" },
            { id: "ds", label: "DEV ≠ STAGING", filter: "pair:ds" },
            { id: "sp", label: "STAGING ≠ PROD", filter: "pair:sp" },
            /* env-sync-activity-tab-v1 (user 2026-11-19: the panel under the list was not seen): the batch history = a
               VIEW tab in the same bar, set apart by the divider + the history icon, no count (a log is not a to-do) */
            { divider: true },
            { id: ACT, label: "Activitate", filter: "view:activity", icon: "history", count: false }
          ],
          defaultTab: "all",
          toolbarLabel: "Filtrare obiecte",
          emptyMessage: EMPTY_ALL
        }
      },
      runtimeRows: me.has ? objects().filter(inList).map(rowOf) : []
    };
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() { return [{ key: "tip", label: "Tip obiect", get: (row) => row.type }]; },
    searchText: (row) => [row.name, row.type, row.id].join(" "),
    sortValue: (row, key) => (key === "tip" ? row.type : row.name),
    filterToken: (row, token) => (token === "view:activity" ? false : token === "pair:ds" ? diverges(row.o, "ds") : token === "pair:sp" ? diverges(row.o, "sp") : true),
    renderCell: (row, key) => {
      const o = row.o;
      switch (key) {
        case "obiect": return `<span class="e-permits-sync-name"><span class="e-permits-sync-name__title">${esc(o.name)}</span>${lastSyncLine(o)}</span>`;
        case "tip": return `<span data-cell-tooltip="${esc(o.type)}">${esc(o.type)}</span>`;
        case "dev": case "staging": case "prod": return versionHtml(o, key);
        case "ds": case "sp": return directionHtml(o, key);
        default: return "";
      }
    },
    openRow: (id) => openHistory(id),
    rowLabel: (row) => `${row.type} ${row.name} — deschide istoricul sincronizărilor`,
    emptyHtml: ({ query, filtered }) => {
      if (onActivity()) return ""; /* the table is hidden on the activity tab */
      /* env-sync-boxed-v1: the BOXED empty state (normal size, never bare), as every list (components.md › Empty state) */
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock" });
      if (query || filtered) return E()?.noResults?.(NO_MATCH, { text: "Caută după denumirea sau tipul obiectului ori schimbă filtrele." });
      /* AC-15 — on a pair tab with nothing there, the same calm message for that pair */
      const tab = A().workplaceState?.tabKey;
      return E()?.render({ title: tab === "ds" ? "Nicio divergență între DEV și STAGING." : tab === "sp" ? "Nicio divergență între STAGING și PROD." : EMPTY_ALL, icon: "checkmark-large" });
    },
    exportState: () => ({ hidden: true })
  };

  const onActivity = () => A().workplaceState?.tabKey === ACT;
  const listEl = () => document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
  const listOpen = () => { const reg = listEl(); return Boolean(reg && !reg.hidden && !reg.closest("[hidden]")); };
  function refreshList() {
    const st = A().workplaceState;
    if (!listOpen() || !st) return;
    st.rows = registryDb().runtimeRows;
    /* US-348 AC-20: objects that converged leave the list AND the selection */
    const ids = new Set(st.rows.map((r) => r.id));
    [...st.selected].forEach((id) => { if (!ids.has(id)) st.selected.delete(id); });
    A().renderWorkplace?.();
    syncChrome();
  }

  /* ---------------------------------------------------------------- page chrome: intro, header tag, bulk buttons, activity */
  const visibleRows = () => (A().getVisibleRows?.() || []);
  const selectedRows = () => { const sel = A().workplaceState?.selected || new Set(); return visibleRows().filter((r) => sel.has(r.id)); };
  function ensureChrome() {
    const reg = document.querySelector("[data-workplace]");
    if (!reg) return;
    if (!reg.querySelector("[data-sync-intro]")) {
      reg.insertAdjacentHTML("afterbegin", `<div class="e-permits-cal-intro e-permits-sync-intro" data-sync-intro>
        <div class="e-permits-cal-intro__notes">${A().renderNotice?.("info", "<strong>Lucrezi în mediul STAGING.</strong> DEV și PROD se compară cu el.", { icon: "circle-info-filled" }) || ""}</div>
      </div>`);
    }
    const anchor = reg.querySelector("[data-workplace-add-product]");
    if (anchor && !reg.querySelector("[data-sync-tool]")) {
      anchor.insertAdjacentHTML("beforebegin", `
        <button class="btn btn-secondary btn-sm e-permits-workplace__primary-action e-permits-sync-tool" type="button" data-sync-tool data-sync-scope="all" hidden>${icon("rotate-arrow", 16)}<span>Sincronizează tot</span></button>
        <button class="btn btn-neutral btn-sm e-permits-workplace__primary-action e-permits-sync-audit" type="button" data-sync-audit hidden>Vezi în Audit &amp; Logging</button>`);
    }
    /* selection-bar-v1 (PO 2026-11-19): ≥ 1 selected row → the selection bar takes the toolbar's place */
    const toolbar = reg.querySelector("[data-workplace-toolbar]");
    if (toolbar && !reg.querySelector("[data-sync-selection]") && window.GEAPSelectionBar) {
      toolbar.insertAdjacentHTML("afterend", window.GEAPSelectionBar.html({
        label: "Obiecte selectate",
        actionsHtml: `<button class="btn btn-primary btn-sm" type="button" data-sync-scope="selected">${icon("rotate-arrow", 16)}<span>Sincronizează</span></button>`
      }).replace("data-selection-bar>", "data-selection-bar data-sync-selection>"));
    }
    /* env-sync-activity-tab-v2 (user 2026-11-19: „the header jumps, the search goes down”): on „Activitate” the SAME header
       toolbar stays in its slot (search = the batches, „Vezi în Audit & Logging” in the action's place); the batches take
       the table's place: tabs → 24 → cards */
    if (!reg.querySelector("[data-sync-activity]")) reg.insertAdjacentHTML("beforeend", '<section class="e-permits-sync-activity" data-sync-activity aria-label="Activitatea de sincronizare" hidden><div class="e-permits-sync-activity__body" data-sync-act-list></div></section>');
  }
  function syncChrome() {
    ensureChrome();
    const reg = listEl();
    if (!reg) return;
    const me = who();
    const act = me.has && onActivity();
    /* env-sync-activity-tab-v1: the page state lives on the container as `data-sync-tab` (the tab buttons carry
       `data-workplace-tab` — never one attribute for a state holder and its controls) */
    reg.dataset.syncTab = act ? ACT : "list";
    const audit = reg.querySelector("[data-sync-audit]");
    if (audit) audit.hidden = !act || !batches().length;
    const search = reg.querySelector("[data-workplace-search]");
    if (search) search.placeholder = act ? SEARCH_ACT : SEARCH_LIST;
    reg.querySelector("[data-sync-intro]").hidden = !me.has;
    /* AC-08: the STAGING header carries „aici lucrezi” */
    const th = reg.querySelector('th[data-column="staging"] .e-permits-workplace__th-content');
    if (th && !th.querySelector(".e-permits-sync-here")) th.insertAdjacentHTML("beforeend", '<span class="e-permits-sync-here"><span class="status-tag status-tag--brand is-strong status-tag--small">aici lucrezi</span></span>'); /* env-sync-here-v2 (PO): the strong blue library tag */
    /* selection-bar-v1 (PO 2026-11-19; US-348 AC-04 / AC-05 reworded): nothing selected = „Sincronizează tot (N)” in the
       toolbar (N = rows after tab / filter / search, inactive with the reason at 0); ≥ 1 selected = the selection bar
       „N obiecte selectate” · „Anulează selecția” · primary „Sincronizează (N)” */
    const tool = reg.querySelector("[data-sync-tool]");
    const nSel = me.has ? selectedRows().length : 0;
    if (tool) {
      tool.hidden = !me.has || act;
      const nAll = visibleRows().length;
      tool.querySelector("span").textContent = `Sincronizează tot (${nAll})`;
      if (nAll) { tool.removeAttribute("aria-disabled"); delete tool.dataset.tooltipReason; } else { tool.setAttribute("aria-disabled", "true"); tool.dataset.tooltipReason = "Lista afișată este goală."; }
    }
    const bar = reg.querySelector("[data-sync-selection]");
    if (bar) {
      bar.querySelector('[data-sync-scope="selected"] span').textContent = `Sincronizează (${nSel})`;
      window.GEAPSelectionBar?.set(bar, { count: nSel, text: nSel === 1 ? "1 obiect selectat" : plural(nSel, "obiect selectat", "obiecte selectate") });
    }
    renderActivity();
  }
  let chromeQueued = false;
  const queueChrome = () => { if (chromeQueued) return; chromeQueued = true; requestAnimationFrame(() => { chromeQueued = false; if (listOpen()) syncChrome(); }); };
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.syncObserved) return;
    reg.dataset.syncObserved = "1";
    new MutationObserver(() => { if (reg.dataset.registryKind !== KIND) window.GEAPSelectionBar?.set(reg.querySelector("[data-sync-selection]"), { count: 0 }); if (reg.dataset.registryKind === KIND) load().then(() => { if (!A().workplaceState?.rows?.length && objects().some(inList) && who().has) refreshList(); else queueChrome(); }); }).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind"] });
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => { if (reg.dataset.registryKind === KIND) queueChrome(); }).observe(tbody, { childList: true });
  };
  document.addEventListener("change", (event) => {
    if (event.target.closest?.("[data-workplace-select-row], [data-workplace-select-all]") && listOpen()) queueChrome();
  });

  /* ---------------------------------------------------------------- activity (US-353) */
  function batchHead(b) {
    const done = b.steps.filter((s) => !s.skipped).length;
    const skipped = b.steps.length - done;
    const own = b.steps.filter((s) => s.ownReason).length;
    return `
      <span class="e-permits-sync-batch">
        <span class="e-permits-sync-batch__line">
          <span class="e-permits-stack__group-name">Lotul ${esc(b.id)}</span>
          <span class="badge badge--lg badge--outlined-neutral e-permits-stack__group-count" aria-label="${esc(plural(done, "modificare", "modificări"))}">${done}</span>
          ${skipped ? tag(`${skipped} ${skipped === 1 ? "omis" : "omise"}`, "warning") : ""}
        </span>
        <span class="e-permits-sync-batch__meta">${esc(`${longDate(b.at)}, ${timeOf(b.at)} · ${b.user}, ${b.role} · ${b.domain} · ${plural(done, "modificare", "modificări")}${skipped ? `, ${plural(skipped, "omitere", "omiteri")}` : ""}`)}</span>
        <span class="e-permits-sync-batch__meta">${esc(`Motiv: ${b.reason}${own ? ` · ${plural(own, "motiv propriu", "motive proprii")}` : ""}`)}</span>
      </span>`;
  }
  function batchTable(b) {
    const rows = b.steps.map((s) => {
      const o = objOf(s.object);
      /* env-sync-rowopen-v1 (user 2026-11-19): the WHOLE row opens the object panel = the registry row that is the action
         (`tr[data-workplace-row-open]`: pointer, band, Enter / Space, focus ring in the cells); the name is plain text */
      const name = o ? `<span>${esc(o.name)}</span><span class="e-permits-workplace__date-meta">${esc(o.type)}</span>` : esc(s.object);
      const open = o ? ` tabindex="0" data-workplace-row-open data-sync-history="${esc(o.id)}" aria-label="${esc(`${o.type} · ${o.name}, deschide istoricul`)}"` : "";
      const why = s.skipped ? `${s.skipped} (${PAIRS[s.pair].label})` : reasonOf({ ...s, batch: b });
      return `<tr${open}>
        <td><span class="e-permits-workplace__date-stack">${name}</span></td>
        <td>${s.skipped ? `<span class="e-permits-workplace__date-stack"><span>${tag("Omis", "warning")}</span><span class="e-permits-workplace__date-meta">${esc(PAIRS[s.pair].label)}</span></span>` : `<span class="e-permits-workplace__date-stack"><span>${esc(arrow(s.from, s.to))}</span><span class="e-permits-workplace__date-meta">${esc(STEP_TYPE[s.to])}</span></span>`}</td>
        <td>${s.skipped ? '<span class="e-permits-workplace__dash">—</span>' : esc(`${s.before == null ? "—" : `v${s.before}`} → v${s.after}`)}</td>
        <td><span class="e-permits-sync-why">${esc(why)}</span></td>
      </tr>`;
    }).join("");
    /* env-sync-rap-table-v1 (PO 2026-11-19): every steps table = the RAP flat table (the BO port: .e-permits-rpt-table-wrap +
       .e-permits-rpt-table, rap-table-flat-v1) — no outer border / radius, tertiary header band, row dividers */
    return `<div class="e-permits-workplace__table-wrap e-permits-rpt-table-wrap e-permits-sync-batch__table">
      <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-rpt-table e-permits-sync-table">
        <caption class="u-visually-hidden">Pașii lotului ${esc(b.id)}</caption>
        <thead><tr><th scope="col">Ce</th><th scope="col">Sensul</th><th scope="col">Versiunea</th><th scope="col">De ce</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }
  /* env-sync-activity-tab-v1: the toolbar search filters the batches (id, reason, author, the objects' names / types,
     own reasons, omission reasons); a matching batch opens, so the hit is in view */
  function batchMatches(b, query) {
    const terms = fold(query).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const hay = fold([b.id, b.reason, b.user, b.role, b.domain, longDate(b.at),
      ...b.steps.flatMap((s) => { const o = objOf(s.object); return [o?.name, o?.type, s.object, s.ownReason, s.skipped]; })].join(" "));
    return terms.every((t) => hay.includes(t));
  }
  function renderActivity() {
    const host = listEl()?.querySelector("[data-sync-activity]");
    if (!host) return;
    const out = host.querySelector("[data-sync-act-list]");
    if (!who().has || !onActivity()) { host.hidden = true; out.innerHTML = ""; return; }
    host.hidden = false;
    const query = A().workplaceState?.query || ""; /* on this tab the shared search holds the activity text */
    const all = batches();
    const list = all.filter((b) => batchMatches(b, query));
    const isOpen = (b) => S.open.has(b.id) || (query.trim() && !S.closed?.has(b.id));
    let body;
    if (!all.length) body = E()?.render({ title: "Nicio sincronizare înregistrată", text: "Loturile apar aici după prima sincronizare.", icon: "history" }) || "";
    else if (!list.length) body = E()?.noResults?.(NO_MATCH, { text: "Caută după lot, obiect, motiv sau autor." }) || esc(NO_MATCH);
    else body = `<div class="e-permits-stack e-permits-sync-activity__list">${list.map((b) => {
        const open = isOpen(b);
        return `<div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
          <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
            <button class="e-permits-stack__group-toggle e-permits-sync-batch__toggle" type="button" data-sync-batch="${esc(b.id)}" aria-expanded="${open}">
              ${batchHead(b)}
              ${icon("chevron-bottom", 16).replace('class="icon small"', 'class="icon small e-permits-stack__group-chevron"')}
            </button>
          </h3>
          ${open ? batchTable(b) : ""}
        </div>`;
      }).join("")}</div>`;
    out.innerHTML = body;
  }

  /* ---------------------------------------------------------------- the review dialog (US-347 / US-348 / US-351) */
  let D = null;
  const counter = (n) => (n === 1 ? "Sincronizează 1 modificare" : `Sincronizează ${plural(n, "modificare", "modificări")}`);
  function openReview(scope, ids, pair = "") {
    const list = ids.map(objOf).filter(Boolean);
    if (!list.length) return;
    D = { scope, ids: list.map((o) => o.id), mode: pair || "both", fixed: Boolean(pair), reason: "", own: {}, error: "" };
    renderReview({ focus: true });
  }
  function renderReview({ focus = false } = {}) {
    const me = who();
    const list = D.ids.map(objOf).filter(Boolean);
    const { steps, skipped } = plan(list, D.mode);
    const scopeText = D.scope === "all" ? `Toate cele ${plural(list.length, "obiect afișat", "obiecte afișate")} (se aplică filtrele)`.replace("cele 1 obiect afișat", "cel 1 obiect afișat")
      : D.scope === "single" ? `1 obiect: ${list[0].type} · ${list[0].name}` : plural(list.length, "obiect selectat", "obiecte selectate");
    const firstOf = new Set();
    const stepRows = steps.map((s, i) => {
      const o = objOf(s.object);
      const first = !firstOf.has(s.object);
      firstOf.add(s.object);
      const own = first
        ? `<div class="e-permits-fo-input e-permits-sync-own"><input id="sync-own-${esc(o.id)}" type="text" maxlength="500" value="${esc(D.own[o.id] || "")}" placeholder="Motivul lotului se aplică" aria-label="${esc(`Motiv propriu (opțional) pentru ${o.name}`)}" data-sync-own="${esc(o.id)}"></div>`
        : '<span class="e-permits-workplace__date-meta">același obiect</span>';
      return `<tr>
        <td>${i + 1}</td>
        <td><span class="e-permits-workplace__date-stack"><span data-cell-tooltip="${esc(o.name)}">${esc(o.name)}</span><span class="e-permits-workplace__date-meta">${esc(o.type)}</span></span></td>
        <td><span class="e-permits-workplace__date-stack"><span>${esc(arrow(s.from, s.to))}</span><span class="e-permits-workplace__date-meta">${esc(s.type)}</span></span></td>
        <td>${esc(`${s.before == null ? "—" : `v${s.before}`} → v${s.after}`)}</td>
        <td>${own}</td>
      </tr>`;
    }).join("");
    const stepsHtml = steps.length
      ? `<div class="e-permits-workplace__table-wrap e-permits-rpt-table-wrap e-permits-sync-plan">
          <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-rpt-table e-permits-sync-table e-permits-sync-table--steps">
            <caption class="u-visually-hidden">Pașii sincronizării</caption>
            <thead><tr><th scope="col">Nr.</th><th scope="col">Obiect</th><th scope="col">Sens</th><th scope="col">Versiuni</th><th scope="col">Motiv propriu (opțional)</th></tr></thead>
            <tbody>${stepRows}</tbody>
          </table>
        </div>`
      : E()?.render({ title: NO_STEPS, icon: "checkmark-large", compact: true }) || esc(NO_STEPS);
    const skippedHtml = skipped.length
      ? A().renderNotice?.("warning", `<strong>${esc(skipped.length === 1 ? "1 obiect omis" : `${plural(skipped.length, "obiect omis", "obiecte omise")}`)}.</strong> Nu intră în pași; omiterea se înregistrează în activitate.${skipped.map((s) => `<span class="e-permits-sync-skipped__item"><strong>${esc(objOf(s.object).name)}</strong> · ${esc(PAIRS[s.pair].label)} · ${esc(s.blocked)}</span>`).join("")}`, { className: "e-permits-sync-skipped-note" }) || ""
      : "";
    const radios = MODES.map(([value, label, hint]) => `
      <label class="radio radio--small${D.fixed ? " is-disabled" : ""}">
        <input class="radio-input" type="radio" name="sync-mode" value="${value}"${D.mode === value ? " checked" : ""}${D.fixed ? " disabled" : ""} data-sync-mode>
        <span class="radio-custom" aria-hidden="true"></span>
        <span class="radio-texts"><span class="radio-label">${esc(label)}</span><span class="radio-description">${esc(hint)}</span></span>
      </label>`).join("");
    const n = (D.reason || "").length;
    const body = `
      <div class="e-permits-case-form e-permits-sync-review">
        <p class="e-permits-case-form__lead"><strong>${esc(scopeText)}.</strong> Versiunea mai mare se mută peste cea mai mică; mediul sursă rămâne neschimbat. Sincronizarea nu se anulează după confirmare.</p>
        <div class="e-permits-sync-review__modes">
          <span class="e-permits-sync-review__label" id="sync-mode-label">Sensuri</span>
          <div class="radio-group" role="radiogroup" aria-labelledby="sync-mode-label">${radios}</div>
          ${D.fixed ? `<p class="e-permits-fo-field__hint">Sensul este fixat de butonul de pe rând: ${esc(PAIRS[D.mode].label)}.</p>` : ""}
        </div>
        <div class="e-permits-sync-review__plan">
          <h3 class="e-permits-sync-review__label">Pași (${steps.length})</h3>
          ${stepsHtml}
        </div>
        ${skippedHtml}
        <div class="e-permits-fo-field">
          <label for="sync-reason">Motivul lotului${A().requiredMark?.() || ""}</label>
          <div class="e-permits-fo-textarea${D.error ? " is-error" : ""}"><textarea id="sync-reason" rows="3" maxlength="500" aria-required="true" aria-describedby="${D.error ? "sync-reason-error " : ""}sync-reason-hint"${D.error ? ' aria-invalid="true"' : ""} spellcheck="true" data-sync-reason>${esc(D.reason)}</textarea></div>
          ${D.error ? window.GEAPConfigPublish?.errorHtml?.("sync-reason", D.error) || "" : ""}
          <p class="e-permits-fo-field__hint e-permits-ntpl-count" id="sync-reason-hint"><span>Se aplică tuturor pașilor; un motiv propriu îl înlocuiește doar pentru obiectul lui.</span><span class="e-permits-ntpl-count__value" data-sync-count>${n}/500</span></p>
        </div>
        <p class="e-permits-case-form__lead e-permits-sync-review__who">Pașii se înregistrează în Jurnalul de audit în numele tău: <strong>${esc(me.name)}</strong>, ${esc(me.role)}, domeniul ${esc(me.domain)}.</p>
      </div>`;
    const ok = steps.length
      ? `<button class="btn btn-primary btn-rounded" type="button" data-sync-confirm><span>${esc(counter(steps.length))}</span></button>`
      : `<button class="btn btn-primary btn-rounded" type="button" aria-disabled="true" data-tooltip-reason="${esc(NO_STEPS)}" data-sync-confirm><span>${esc(counter(0))}</span></button>`;
    G().openModal?.({ title: "Revizuirea sincronizării", body, footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button>${ok}</div>`, kind: "sync" });
    if (focus) requestAnimationFrame(() => document.querySelector(D.fixed ? "#sync-reason" : "#case-action-modal [data-sync-mode]:checked")?.focus());
  }
  function confirmReview() {
    if (!D) return;
    const list = D.ids.map(objOf).filter(Boolean);
    const { steps, skipped } = plan(list, D.mode);
    if (!steps.length) return;
    const reason = String(D.reason || "").trim();
    if (!reason) {
      D.error = REASON_REQUIRED;
      renderReview();
      requestAnimationFrame(() => document.querySelector("#sync-reason")?.focus());
      return;
    }
    const me = who();
    const at = nowIso();
    const nextNo = Math.max(0, ...batches().map((b) => Number(b.id.slice(2)) || 0)) + 1;
    const id = `B-${String(nextNo).padStart(4, "0")}`;
    const batch = { id, at, user: me.name, role: me.role, domain: me.domain, reason, steps: [] };
    /* US-347 AC-14 / 15: the target gets the source's version, published; the source does not change */
    steps.forEach((s) => {
      const o = objOf(s.object);
      o[s.to] = { v: s.after };
      const own = String(D.own[o.id] || "").trim();
      batch.steps.push({ object: o.id, pair: s.pair, from: s.from, to: s.to, before: s.before, after: s.after, ...(own ? { ownReason: own } : {}) });
    });
    skipped.forEach((s) => batch.steps.push({ object: s.object, pair: s.pair, from: s.from, to: s.to, skipped: s.blocked }));
    S.data.batches.unshift(batch);
    /* US-353 AC-13…17: one PROMOTE audit event per step, correlation id = the batch id; a skip is recorded too (US-351 AC-15) */
    batch.steps.forEach((s, i) => {
      const o = objOf(s.object);
      const related = batch.steps.filter((x) => x !== s).map((x, k) => ({ offset: k + 1, type: `PROMOTE · ${objOf(x.object)?.name || x.object}`, user: me.name, status: x.skipped ? "Eșuat" : "Reușit", module: "AdminPortal" }));
      s.audit = window.GEAPEventTimeline?.log?.({
        at: `${at}:${pad(i)}`, user: me.name, role: me.role, type: "PROMOTE", status: s.skipped ? "Eșuat" : "Reușit",
        detail: s.skipped ? `Omis · ${o.type} ${o.name} · ${PAIRS[s.pair].label} · ${s.skipped}` : `${o.type} ${o.name} · ${arrow(s.from, s.to)} (${STEP_TYPE[s.to]}) · ${s.before == null ? "—" : `v${s.before}`} → v${s.after} · Motiv: ${s.ownReason || reason} · ${me.role}, ${me.domain}`
      }, { module: "AdminPortal", objectType: o.type, objectId: o.id, objectVersion: s.skipped ? "" : `v${s.after}`, correlation: id, related });
    });
    S.open = new Set([id]);
    const done = steps.length;
    D = null;
    G().closeModal?.();
    refreshList();
    const message = `${done === 1 ? "S-a sincronizat 1 modificare" : `S-au sincronizat ${plural(done, "modificare", "modificări")}`}. Lotul ${id}${skipped.length ? `; ${skipped.length === 1 ? "1 obiect omis" : plural(skipped.length, "obiect omis", "obiecte omise")}` : ""}.`;
    /* env-sync-activity-tab-v1: „Vezi lotul” → the Activitate tab, search cleared, this batch open at the top */
    const toBatch = () => {
      S.open = new Set([id]);
      S.closed = new Set();
      S.actQuery = "";
      if (onActivity()) { const st = A().workplaceState; if (st) st.query = ""; A().renderWorkplace?.(); }
      else listEl()?.querySelector(`[data-workplace-tab="${ACT}"]`)?.click();
      syncChrome();
      const btn = listEl()?.querySelector(`[data-sync-batch="${id}"]`);
      const surface = document.querySelector(".e-permits-shell__canvas-surface");
      if (surface) surface.scrollTop = 0; /* the new batch is the first one, under the tabs */
      btn?.focus({ preventScroll: true });
    };
    if (window.GEAPToast?.show) window.GEAPToast.show({ type: "success", title: "Sincronizare efectuată", message, action: { label: "Vezi lotul", onClick: toBatch } });
    else A().showShellToast?.(message, "success", "Sincronizare efectuată");
  }

  /* ---------------------------------------------------------------- the history drawer (US-352) */
  let drawer = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="drawer-overlay" data-sync-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-sync-close></button>
        <aside class="drawer drawer--lg" role="dialog" aria-modal="true" aria-labelledby="sync-h-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="sync-h-title" data-sync-h-title></h2>
              <p class="drawer__subtitle">Istoricul sincronizărilor</p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-sync-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-sync-h-body></div>
          <footer class="drawer__footer"><div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-sync-close>Închide</button></div></footer>
        </aside>
      </div>`);
    drawer = document.querySelector("[data-sync-drawer]");
    return drawer;
  }
  function openHistory(id) {
    const o = objOf(id);
    if (!o) return;
    if (!who().has) return;
    const el = ensureDrawer();
    el.querySelector("[data-sync-h-title]").textContent = `${o.type} · ${o.name}`;
    const list = stepsOf(id);
    const ver = (env) => (o[env] ? `v${o[env].v}${o[env].draft ? ` ${tag("schiță", "warning")}` : ""}` : '<span class="e-permits-workplace__dash">—</span> <span class="e-permits-sync-ver__meta">lipsește</span>');
    const rows = list.map((s) => `<tr>
      <td><span class="e-permits-workplace__date-stack"><span>${esc(longDate(s.batch.at))}</span><span class="e-permits-workplace__date-meta">${esc(timeOf(s.batch.at))}</span></span></td>
      <td><span class="e-permits-workplace__date-stack"><span>${esc(s.batch.user)}</span><span class="e-permits-workplace__date-meta">${esc(`${s.batch.role} · ${s.batch.domain}`)}</span></span></td>
      <td>${s.skipped ? `<span class="e-permits-workplace__date-stack"><span>${tag("Omis", "warning")}</span><span class="e-permits-workplace__date-meta">${esc(PAIRS[s.pair].label)}</span></span>` : `<span class="e-permits-workplace__date-stack"><span>${esc(`${arrow(s.from, s.to)} · ${s.before == null ? "—" : `v${s.before}`} → v${s.after}`)}</span><span class="e-permits-workplace__date-meta">${esc(STEP_TYPE[s.to])}</span></span>`}</td>
      <td><span class="e-permits-sync-why">${esc(s.skipped ? `${s.skipped} (${PAIRS[s.pair].label})` : reasonOf(s))}</span></td>
      <td>${esc(s.batch.id)}</td>
    </tr>`).join("");
    el.querySelector("[data-sync-h-body]").innerHTML = `
      ${inList(o) ? panelActions(o) : ""}
      ${A().renderPassportBlock?.("Versiuni curente", [["DEV", ver("dev")], ["STAGING", ver("staging")], ["PROD", ver("prod")]]) || ""}
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Pași</h2>${list.length ? `<div class="e-permits-passport__heading-tools"><span class="e-permits-dosar-profil__section-meta">${esc(`${plural(list.length, "pas", "pași")} · cele mai noi primele`)}</span></div>` : ""}</div>
        ${list.length ? `<div class="e-permits-workplace__table-wrap e-permits-rpt-table-wrap e-permits-sync-history">
          <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-rpt-table e-permits-sync-table e-permits-sync-table--history">
            <caption class="u-visually-hidden">Pașii de sincronizare ai obiectului, de la cel mai recent</caption>
            <thead><tr><th scope="col">Când</th><th scope="col">Cine</th><th scope="col">Ce</th><th scope="col">De ce</th><th scope="col">Lot</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : E()?.render({ title: "Nicio sincronizare înregistrată pentru acest obiect.", icon: "history", compact: true }) || ""}
      </section>`;
    el.querySelector("[data-sync-h-body]").scrollTop = 0;
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(el, { focus: el.querySelector(".drawer") }); else { el.hidden = false; }
  }
  const closeHistory = () => { if (!drawer) return; if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer); else drawer.hidden = true; };

  /* „Vezi în Audit & Logging” (US-353 AC-18): the prototype has no Audit & Logging page — the batch's audit record opens
     (the shell's audit event detail: correlation id = batch id, the batch's other PROMOTE events under it) */
  function openAudit() {
    const b = batches().find((x) => S.open.has(x.id)) || batches()[0];
    if (!b) return;
    const me = who();
    const s = b.steps[0];
    const o = objOf(s.object);
    const record = s.audit || window.GEAPEventTimeline?.log?.({
      at: b.at, user: b.user, role: b.role, type: "PROMOTE", status: s.skipped ? "Eșuat" : "Reușit",
      detail: `${o.type} ${o.name} · ${arrow(s.from, s.to)} · Motiv: ${s.ownReason || b.reason}`
    }, { module: "AdminPortal", objectType: o.type, objectId: o.id, objectVersion: s.after ? `v${s.after}` : "", correlation: b.id, related: b.steps.slice(1).map((x, k) => ({ offset: k + 1, type: `PROMOTE · ${objOf(x.object)?.name || x.object}`, user: b.user, status: x.skipped ? "Eșuat" : "Reușit", module: "AdminPortal" })) });
    if (!record) return;
    s.audit = record;
    A().openAuditEventDetail?.(record, { title: "PROMOTE", general: [["Acțiune", "PROMOTE"], ["Lot (ID corelare)", esc(b.id)], ["Obiect", esc(`${o.type} · ${o.name} (${o.id})`)], ["Actor", esc(`${b.user}, ${b.role}, ${b.domain}`)]] });
    void me;
  }

  /* ---------------------------------------------------------------- events */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    const scope = t.closest("[data-sync-scope]");
    if (scope && listOpen()) {
      if (scope.getAttribute("aria-disabled") === "true") return;
      if (scope.dataset.syncScope === "selected") openReview("selected", selectedRows().map((r) => r.id));
      else openReview("all", visibleRows().map((r) => r.id));
      return;
    }
    const stepBtn = t.closest("[data-sync-step]");
    if (stepBtn) {
      if (stepBtn.getAttribute("aria-disabled") === "true") return;
      /* from the object panel: the panel closes first (no dialog over a drawer), then the same review as the row (sync-03) */
      if (stepBtn.closest("[data-sync-drawer]")) closeHistory();
      openReview("single", [stepBtn.dataset.syncStep], stepBtn.dataset.syncPair);
      return;
    }
    const hist = t.closest("[data-sync-history]");
    if (hist) { openHistory(hist.dataset.syncHistory); return; }
    const toggle = t.closest("[data-sync-batch]");
    if (toggle) {
      const id = toggle.dataset.syncBatch;
      const wasOpen = toggle.getAttribute("aria-expanded") === "true";
      S.closed = S.closed || new Set();
      if (wasOpen) { S.open.delete(id); S.closed.add(id); } else { S.open.add(id); S.closed.delete(id); }
      renderActivity();
      document.querySelector(`[data-sync-batch="${id}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (t.closest("[data-sync-audit]")) { openAudit(); return; }
    if (t.closest("[data-sync-selection] [data-selection-clear]")) { clearSelection(); return; }
    if (t.closest("[data-sync-close]")) { closeHistory(); return; }
    if (t.closest("[data-sync-confirm]") && D) {
      if (t.closest("[aria-disabled='true']")) return;
      confirmReview();
    }
  });
  /* „Anulează selecția” / Esc: the selection is cleared, the toolbar returns, the focus goes to the header checkbox */
  function clearSelection() {
    const st = A().workplaceState;
    if (!st) return;
    st.selected.clear();
    A().renderWorkplace?.();
    syncChrome();
    requestAnimationFrame(() => listEl()?.querySelector("[data-workplace-select-all]")?.focus({ preventScroll: true }));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !listOpen() || listEl()?.querySelector("[data-sync-selection]")?.hidden !== false) return;
    if (document.querySelector(".modal-overlay.is-active, [data-sync-drawer]:not([hidden]), [data-stack-menu]:not([hidden]), .e-permits-filter-sheet[aria-hidden='false']")) return;
    if (!listEl().contains(document.activeElement) && document.activeElement !== document.body) return;
    event.preventDefault();
    clearSelection();
  });
  document.addEventListener("change", (event) => {
    const r = event.target.closest?.("[data-sync-mode]");
    if (r && D && !D.fixed) { D.mode = r.value; renderReview(); document.querySelector(`#case-action-modal [data-sync-mode][value="${r.value}"]`)?.focus(); }
  });
  /* env-sync-activity-tab-v2: ONE search field, a separate text per view — the list keeps its search while you look at
     the activity and gets it back on return (a batch query would empty the list). The swap runs in the CAPTURE phase,
     before the engine's tab handler renders with the query */
  document.addEventListener("click", (event) => {
    const tabBtn = event.target.closest?.(`[data-registry-kind="${KIND}"] [data-workplace-tab]`);
    const st = A().workplaceState;
    if (!tabBtn || !st) return;
    const from = st.tabKey === ACT;
    const to = tabBtn.dataset.workplaceTab === ACT;
    if (from === to) return;
    if (to) { S.listQuery = st.query; st.query = S.actQuery || ""; }
    else { S.actQuery = st.query; st.query = S.listQuery || ""; }
  }, true);
  document.addEventListener("input", (event) => {
    const t = event.target;
    if (!D || !t.closest?.("#case-action-modal")) return;
    if (t.matches("[data-sync-reason]")) {
      D.reason = t.value;
      const c = document.querySelector("[data-sync-count]");
      if (c) c.textContent = `${t.value.length}/500`;
      if (D.error && t.value.trim()) {
        D.error = "";
        t.removeAttribute("aria-invalid");
        t.closest(".e-permits-fo-textarea")?.classList.remove("is-error");
        document.querySelector("#sync-reason-error")?.remove();
        t.setAttribute("aria-describedby", "sync-reason-hint");
      }
    }
    if (t.matches("[data-sync-own]")) D.own[t.dataset.syncOwn] = t.value;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer && !drawer.hidden && !document.querySelector(".modal-overlay.is-active")) { event.preventDefault(); closeHistory(); }
  });

  /* ================================================================ routes + denied (AC-01, AC-18) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Ecranul „Sincronizarea mediilor” este disponibil doar Administratorului central.", icon: "lock" }) || DENIED);
    const me = who();
    window.GEAPEventTimeline?.log?.({ at: nowIso(), user: me.name, role: me.role, type: "Acces ecran Sincronizarea mediilor", status: "Refuzat", detail: "Acces refuzat: rolul nu este Administrator central." }, { module: "AdminPortal", objectType: "Ecran", objectId: NAV });
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h !== `#${NAV}`) return false;
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
    load().then(() => { if (nav && who().has) nav.click(); else showDenied(); });
    return true;
  });
  /* env-sync-clip-v1 (PO bug 2026-11-18, batch table „cut”): `.e-permits-shell__content` is overflow: hidden, but
     scrollIntoView / focus() still scroll it — the whole canvas then sits higher and its lower part (the activity panel)
     is cut off. On this page the shift goes to the real scroller (the canvas surface) and the hidden one stays at 0. */
  const keepContentAtTop = () => {
    const content = document.querySelector(".e-permits-shell__content");
    if (!content || content.dataset.syncScrollGuard) return;
    content.dataset.syncScrollGuard = "1";
    content.addEventListener("scroll", () => {
      if (!content.scrollTop || !listOpen() || getComputedStyle(content).overflowY !== "hidden") return;
      const shift = content.scrollTop;
      content.scrollTop = 0;
      const surface = content.querySelector(".e-permits-shell__canvas-surface");
      if (surface) surface.scrollTop += shift;
    });
  };
  const boot = () => {
    keepContentAtTop();
    load();
    observeRegistry();
    new MutationObserver(() => observeRegistry()).observe(document.body, { childList: true, subtree: false });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for the demo states */
  window.GEAPEnvSync = { load, plan, objects, batches, openHistory, openReview, refreshList, perms: who };
})();
