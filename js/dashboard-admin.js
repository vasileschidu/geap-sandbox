/* =====================================================================================
   Administrare › Tablouri de bord (dash-v1, 2026-11-10) — Feature 96586 „Configurarea tablourilor de bord” (Epic 96497
   Raportare și analiză). Child stories US-410 Crearea · US-411 Lista · US-544 Editarea · US-545 Clonarea · US-546
   Publicarea · US-547 Dezactivarea / activarea · US-548 Istoricul versiunilor + restaurarea · US-549 Eliminarea ciornei ·
   US-550 Setarea tabloului de bord principal — not in Azure yet: built from the Feature text, split per its Traceability.

   A dashboard = an ordered list of PUBLISHED widgets (js/widget-admin.js, window.GEAPWidgets: max 24), each with a width
   (O treime · Jumătate · Două treimi · Rând întreg) and a height (Compactă · Înaltă, wid-heights-v1), addressed to one or more roles,
   Principal / Secundar per role. Level (generated): Global = the Administrator central, assigned to authorities (list or
   „Toate autoritățile”) · Autoritate = any other user with «Gestionarea tablourilor de bord», his authority, prefilled.
   Lifecycle Ciornă → Publicat (version + 1 per publication; restore = a new version) → Dezactivat; a draft can be removed;
   a local user hides a global dashboard only for his authority (`offFor`).

   NO new engine — the widget module's code paths (components.md › 0.6 „Every configuration object publishes the same way”):
     · list = the BO registry (`window.GEAPShellRegistries["tablouri-de-bord"]`, menu `shellView: "tablouri-de-bord-registry"`),
       drawn as the Rapoarte stacked list (dsh-stack-list-v1: `stackItem` + `sort`, facets Nivel · Statut · Rol · Tip ·
       Autoritate · Creat de, pager 20) / row ⋮ / CSV / boxed empty states;
     · create = the widget create sheet (`.e-permits-reg-editor--page`, step strip, footer bar Anulează / Înapoi · Salvează
       ciorna · Continuă / Publică);
     · edit = the profile page (tabs Configurare · Versiuni · Istoric), header Salvează · Publică · ⋮;
     · publish / restore / pending / compare = js/config-publish.js (extracted from widget-admin.js, used by both);
     · cards = `GEAPWidgets.card()` (the widget renderer + its palette), type glyphs = `GEAPWidgetCharts.glyph()`, the
       picker rows = the „Widget type card”.
   NEW (components.md › „Tablouri de bord”): roles with Principal / Secundar, the authority assignment with „Toate
   autoritățile”, and the layout editor `.e-permits-dsh-grid` (12-column grid of the real cards, each with a visible
   toolbar: drag handle · ↑ ↓ · Lățime / Înălțime selects · red remove; keyboard-operable, a list on phones).
   Routes: #tablouri-de-bord (list) · #tablou/<id>/<configurare|versiuni|istoric> · #tablou/nou[/din-<id>] · the BO page
   „Tablou de bord” of the roles #tablou-de-bord[/<id>] (dsh-view-v1, `showView` below).
   Demo switch ?tablou= (comma list): fara-permisiune · gol · eroare (every save fails) · incarcare (BO page: widgets
   loading) · widget-eroare (BO page: one widget's data error).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const W = () => window.GEAPWidgets || {};
  const CP = () => window.GEAPConfigPublish || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const toDate = (v) => (v ? new Date(v) : null);
  const longDate = (v) => { const d = toDate(v); return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const time = (v) => { const d = toDate(v); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const getPath = (obj, path) => path.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const setPath = (obj, path, value) => { const parts = path.split("."); const last = parts.pop(); const target = parts.reduce((o, p) => o[p], obj); target[last] = value; };
  const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";
  const isPhone = () => Boolean(window.matchMedia?.("(max-width: 760px)").matches);

  const KIND = "tablouri-de-bord";
  const NAV = "tablouri-de-bord";
  const TITLE = "Tablouri de bord";
  /* Feature 96586 AC — the exact texts („tu” tone, components.md › Ton: tu) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const EMPTY_LIST = "Nu există tablouri de bord.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const SAVE_FAILED = "Tabloul de bord nu a putut fi salvat.";
  const NAME_MAX = 150;
  const TEXT_MAX = 500;
  const MAX_WIDGETS = 24;

  /* ---------------------------------------------------------------- the Feature's classifiers */
  const ROLES = [
    ["specialist", "Specialist"], ["supervisor", "Supervizor"], ["director", "Director"], ["operator-ghiseu", "Specialist ghișeu"],
    ["expert", "Expert"], ["auditor", "Auditor"], ["local-admin", "Administrator local"]
  ];
  const AUTHORITIES = [
    ["ansp", "ANSP", "Agenția Națională pentru Sănătate Publică"],
    ["anta", "ANTA", "Agenția Națională Transport Auto"],
    ["ansa", "ANSA", "Agenția Națională pentru Siguranța Alimentelor"],
    ["amdm", "AMDM", "Agenția Medicamentului și Dispozitivelor Medicale"]
  ];
  const TYPES = [["principal", "Principal"], ["secundar", "Secundar"]];
  const WIDTHS = () => W().WIDTHS || [["third", "O treime"], ["half", "Jumătate"], ["twoThirds", "Două treimi"], ["full", "Rând întreg"]];
  const HEIGHTS = () => W().HEIGHTS || [["compact", "Compactă"], ["tall", "Înaltă"]];
  /* the old seeds' Mică / Medie → Compactă, Mare → Înaltă */
  const heightKey = (h) => (W().heightKey ? W().heightKey(h) : h === "tall" || h === "large" ? "tall" : "compact");
  /* wid-card-v2 (2026-11-11, user): a number tile („Plăcuță simplă”) is Compactă only — the resize corner and Shift + ↑ / ↓
     cannot make it tall */
  const isStat = (id) => (W().published?.(id) || W().get?.(id)?.config)?.type === "tile";
  /* dsh-row-unit-v1 (2026-11-11, user: „the expansion step is really big, more granular”): a tile's height = N grid row
     units (css/dashboard.css: Compactă = 8, Înaltă = 16, one unit + gap = 47 ≈ one list row); charts 8 … 20 by the resize
     corner / Shift + ↑ ↓ one unit at a time; a number tile = 4 (half a Compactă card, two stack beside a chart). The old
     „compact” / „tall” values (seeds, widget defaults) read as 8 / 16. */
  /* dsh-default-10 (2026-11-11, user: list charts show their rows at the default): Compactă = 10 units (454), Înaltă 20,
     a number tile 5 (half a Compactă), resize 8 … 24; the card's own „tall” layout from 16 units */
  const ROWS = { stat: 5, compact: 10, tall: 20, min: 8, max: 24, tallLayout: 16 };
  const isNum = (h) => h !== "" && h !== null && h !== undefined && Number.isFinite(Number(h));
  const rowsOfHeight = (h, min = ROWS.min) => (isNum(h) ? Math.min(ROWS.max, Math.max(min, Math.round(Number(h)))) : heightKey(h) === "tall" ? ROWS.tall : ROWS.compact);
  /* dsh-stat-resize-v1 (user: „not able to make this more narrow vertical”): a number tile has a height too — default 5
     (half a Compactă), resizable 5 … 24 one unit at a time like the charts; its old „compact” reads as 5 */
  const minOf = (id) => (isStat(id) ? ROWS.stat : ROWS.min);
  const rowsOf = (t) => (isStat(t.widget ?? t.id) ? (isNum(t.height) ? rowsOfHeight(t.height, ROWS.stat) : ROWS.stat) : rowsOfHeight(t.height));
  /* the card's own height class (its inner layout: donut legend beside / under, plot sizes) */
  const hOf = (t) => (rowsOf(t) >= ROWS.tallLayout ? "tall" : "compact");
  /* the rows each tile spans (dsh-stat-resize-v1: no automatic stretch any more — the user sets every height) */
  const placedRows = (list) => list.map((t) => rowsOf(t));
  const rowsText = (n) => (n === ROWS.compact ? "Compactă" : n === ROWS.tall ? "Înaltă" : `${n} rânduri`);
  const STATUS_TONE = { "Ciornă": "neutral", "Publicat": "success", "Dezactivat": "neutral" };
  const EVENTS = {
    create: "Crearea tabloului de bord", clone: "Clonarea tabloului de bord", edit: "Modificarea tabloului de bord",
    publish: "Publicarea tabloului de bord", rejected: "Publicare respinsă", restore: "Restaurarea unei versiuni",
    off: "Dezactivarea tabloului de bord", on: "Activarea tabloului de bord", authOff: "Dezactivat pentru autoritate",
    authOn: "Activat pentru autoritate", remove: "Eliminarea ciornei", demote: "Devenit secundar"
  };
  const roleName = (id) => label(ROLES, id) || id;
  const authName = (id) => label(AUTHORITIES, id) || String(id || "").toUpperCase();
  const authLong = (id) => AUTHORITIES.find(([k]) => k === id)?.[2] || "";

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("tablou") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* the permission „Gestionarea tablourilor de bord” (Feature 89940): the Administrator central (Global) and any other
     user holding it at his authority (the local administrator in the demo); ?tablou=fara-permisiune takes it away */
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    const has = (central || local) && !demo.has("fara-permisiune");
    return { central, local, has, authority: central ? null : a.authority || "ansp", roleLabel: a.roleLabel || "" };
  }
  const roleLabel = () => { const w = who(); return w.central ? w.roleLabel || "Administrator central" : `Utilizator cu permisiunea «Gestionarea tablourilor de bord» · ${authName(w.authority)}`; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  const blankConfig = (me = who()) => ({
    names: { ro: "", ru: "", en: "" }, descriptions: { ro: "", ru: "", en: "" }, roles: [], order: "",
    allAuthorities: false, authorities: me.central ? [] : [me.authority], widgets: []
  });
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = Promise.all([
        fetch("data/dashboards.json?v=wid-heights-v1").then((r) => r.json()),
        W().load ? W().load() : Promise.resolve(null),
        /* dsh-auth-ms-v1: the same ~30 demo authorities as Rapoarte (data/rapoarte.json › authorities) */
        fetch("data/rapoarte.json?v=rpt-auth-ms-v1").then((r) => r.json()).catch(() => null)
      ]).then(([json, , rpt]) => {
        if (rpt?.authorities?.length) AUTHORITIES.splice(0, AUTHORITIES.length, ...rpt.authorities.map((a) => [a.id, a.name, a.long]));
        if (demo.has("gol")) json.dashboards = [];
        /* ?tablou=mix (demo dsh-04n): DSH-0001 as a mixed board — compact tile + compact bars + a tall donut beside two
           compact rows, then two compact halves (wid-heights-v1) */
        const mixed = demo.has("mix") && json.dashboards.find((d) => d.id === "DSH-0001");
        /* ?tablou=kpi3 (demo dsh-04q): DSH-0001 as one row of three compact KPI tiles, each a third wide */
        const kpi3 = demo.has("kpi3") && json.dashboards.find((d) => d.id === "DSH-0001");
        /* ?tablou=stiva (demo dsh-04s · dsh-20g, dsh-half-row-v1): a 2/3 chart with two 1/3 number tiles stacked beside it,
           then two Compactă halves — on DSH-0001 (editor) and DSH-0004 (the ANSP Specialist's principal, the BO page) */
        if (demo.has("stiva")) json.dashboards.filter((d) => d.id === "DSH-0001" || d.id === "DSH-0004").forEach((d) => { d.config.widgets = [["WGT-0001", "twoThirds"], ["WGT-0011", "third"], ["WGT-0015", "third"], ["WGT-0006", "half"], ["WGT-0008", "half"]].map(([widget, width]) => ({ widget, width, height: "compact" })); });
        if (kpi3) kpi3.config.widgets = ["WGT-0011", "WGT-0015", "WGT-0016"].map((widget) => ({ widget, width: "third", height: "compact" }));
        if (mixed) mixed.config.widgets = [["WGT-0011", "third", "compact"], ["WGT-0001", "third", "compact"], ["WGT-0006", "third", "tall"], ["WGT-0003", "twoThirds", "compact"], ["WGT-0008", "half", "compact"], ["WGT-0012", "half", "compact"]].map(([widget, width, height]) => ({ widget, width, height }));
        json.dashboards.forEach((d) => {
          d.config.widgets.forEach((x) => { x.height = rowsOf(x); });
          d.offFor = d.offFor || [];
          d.history = d.history || [];
          d.versions = (d.versions || []).map((v) => {
            const config = clone(v.config || d.config);
            /* the seed of an older version names the widgets it did not have yet and the sizes it had */
            if (v.drop) config.widgets = config.widgets.filter((x) => !v.drop.includes(x.widget));
            if (v.sizes) config.widgets.forEach((x) => { if (v.sizes[x.widget]) [x.width, x.height] = v.sizes[x.widget]; });
            config.widgets.forEach((x) => { x.height = rowsOf(x); });
            return { nr: v.nr, version: v.version, type: v.type, note: v.note, at: v.at, by: v.by, config };
          });
        });
        S.data = json;
        return json;
      }).catch(() => { S.data = { dashboards: [] }; return S.data; });
    }
    return S.loading;
  }
  const D = () => S.data || { dashboards: [] };
  const all = () => D().dashboards;
  const dashOf = (id) => all().find((d) => d.id === id) || null;
  const assignedTo = (d, authId) => d.level === "Global" ? d.config.allAuthorities || d.config.authorities.includes(authId) : d.authority === authId;
  const visible = (d, me = who()) => me.central || assignedTo(d, me.authority);
  const dashboards = () => (who().has ? all().filter((d) => visible(d)) : []);
  const lastVersion = (d) => d.versions[d.versions.length - 1] || null;
  const unpublished = (d) => Boolean(lastVersion(d)) && !same(d.config, lastVersion(d).config);
  const isOffFor = (d, authId) => Boolean(authId) && d.offFor.includes(authId);
  const levelText = (d) => (d.level === "Global" ? "Global" : `Autoritate · ${authName(d.authority)}`);
  const authText = (v, level) => (level !== "Global" ? v.authorities.map(authName).join(", ") : v.allAuthorities ? "Toate autoritățile" : v.authorities.map(authName).join(", ") || "—");
  const rolesText = (v) => v.roles.map((r) => `${roleName(r.role)} — ${label(TYPES, r.type).toLocaleLowerCase("ro")}`).join(", ");
  const nameOf = (d) => d.config.names.ro;

  /* ---------------------------------------------------------------- permissions per dashboard (Feature AC) */
  const canCreate = () => who().has;
  /* the Administrator central edits the global dashboards; any other user only his authority's dashboards (the global ones
     and other authorities' ones are read-only for him — Feature: „fără a modifica tablourile de bord globale”) */
  const canEdit = (d) => { const me = who(); return me.has && !!d && (me.central ? d.level === "Global" : d.level === "Autoritate" && d.authority === me.authority); };
  const canAuth = (d) => { const me = who(); return me.has && !me.central && !!d && d.level === "Global"; };
  /* Feature AC: „Se poate clona doar un tablou de bord publicat” */
  const canClone = (d) => canCreate() && !!d && d.status === "Publicat";
  /* Feature AC: „Tablourile de bord în statutul Ciornă pot fi eliminate” */
  const canRemove = (d) => canEdit(d) && d.status === "Ciornă";

  /* ---------------------------------------------------------------- the widgets of a dashboard (Feature: published only) */
  const widgetInfo = (id, d = null) => {
    const w = W().get?.(id) || null;
    const cfg = W().published?.(id) || null;
    const me = who();
    const auth = d?.level === "Autoritate" ? d.authority : me.central ? null : me.authority;
    const active = Boolean(w && cfg && w.status === "Publicat" && !(auth && W().isOffFor?.(w, auth)));
    return { w, cfg, active, title: cfg?.titles?.ro || w?.config?.titles?.ro || id };
  };
  /* what the picker offers: published widgets the dashboard's level may use — a global dashboard = global widgets, an
     authority dashboard = global widgets not deactivated for it + the authority's own widgets */
  function pickable(level, authority) {
    return (W().list?.() || []).filter((w) => {
      if (w.status !== "Publicat" || !W().published?.(w.id)) return false;
      if (level === "Global") return w.level === "Global";
      return (w.level === "Global" && !W().isOffFor?.(w, authority)) || w.authority === authority;
    });
  }

  /* ---------------------------------------------------------------- the principal per role (US-550)
     one principal per role and scope (Global · each authority); only a published dashboard is principal; a new principal
     demotes the previous one for THAT role only, when the new one is published */
  const scopeOf = (d) => (d.level === "Global" ? "global" : `aut:${d.authority}`);
  function principalOf(role, scope, exceptId = "") {
    return all().find((x) => x.id !== exceptId && x.status === "Publicat" && scopeOf(x) === scope && (lastVersion(x)?.config.roles || []).some((r) => r.role === role && r.type === "principal")) || null;
  }
  function conflicts(v, d) {
    const scope = d ? scopeOf(d) : who().central ? "global" : `aut:${who().authority}`;
    return v.roles.filter((r) => r.type === "principal").map((r) => ({ role: r.role, other: principalOf(r.role, scope, d?.id || "") })).filter((c) => c.other);
  }

  /* ================================================================ validation (Feature model) */
  function validate(v, { steps = [1, 2, 3] } = {}) {
    const e = {};
    if (steps.includes(1)) {
      const name = String(v.names.ro || "").trim();
      if (!name) e["names.ro"] = "Introdu denumirea tabloului de bord (RO).";
      else if (name.length > NAME_MAX) e["names.ro"] = `Denumirea are cel mult ${NAME_MAX} de caractere.`;
      const n = String(v.order ?? "").trim();
      if (!n) e.order = "Introdu ordinea tabloului de bord.";
      else if (!/^\d+$/.test(n) || Number(n) < 1) e.order = "Ordinea este un număr întreg, de la 1.";
    }
    if (steps.includes(2)) {
      if (!v.roles.length) e.roles = "Adaugă cel puțin un rol.";
      if (!v.allAuthorities && !v.authorities.length) e.authorities = "Alege cel puțin o autoritate.";
    }
    if (steps.includes(3)) {
      if (!v.widgets.length) e.widgets = "Adaugă cel puțin un widget.";
      else if (v.widgets.length > MAX_WIDGETS) e.widgets = `Un tablou de bord are cel mult ${MAX_WIDGETS} de widget-uri.`;
    }
    return e;
  }
  const STEP_OF = (key) => (/^(names|descriptions|order)/.test(key) ? 1 : /^(roles|authorities)/.test(key) ? 2 : 3);
  function publishProblems(v, d = null) {
    const e = validate(v);
    const out = Object.values(e);
    if (!String(v.names.ru || "").trim()) out.push("Completează denumirea în limba rusă: este obligatorie la publicare.");
    if (!String(v.names.en || "").trim()) out.push("Completează denumirea în limba engleză: este obligatorie la publicare.");
    if (v.widgets.length && !v.widgets.some((x) => widgetInfo(x.widget, d).active)) out.push("Niciun widget al tabloului de bord nu mai este publicat.");
    return [...new Set(out)];
  }

  /* ================================================================ form pieces (the widget / KPI form vocabulary) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => CP().errorHtml?.(id, msg) || "";
  const hintRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-dsh-count="${id}">${count}/${max}</span></p>`;
  function textField(id, key, lbl, value, { required = false, max = 0, hint = "", error = "", span = 12, counter = false, numeric = false, placeholder = "" } = {}) {
    const count = String(value ?? "").length;
    const described = error ? `${id}-error` : hint || counter ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value ?? "")}" autocomplete="off"${numeric ? ' inputmode="numeric"' : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${described ? ` aria-describedby="${described}"` : ""} data-dsh-field="${key}">
        </div>
        ${error ? errorHtml(id, error) : counter ? hintRow(id, hint, count, max) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(id, key, lbl, value, { hint = "" } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">${esc(lbl)}</label>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" aria-describedby="${id}-hint" spellcheck="true" data-dsh-field="${key}">${esc(value)}</textarea></div>
        ${hintRow(id, hint, count, TEXT_MAX)}
      </div>`;
  }
  function selectField(id, attrs, lbl, options, value, { span = 6, hint = "", hideLabel = false } = {}) {
    const optionsHtml = options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("");
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}"${hideLabel ? ' class="u-visually-hidden"' : ""}>${esc(lbl)}</label>
        ${U().renderFoSelectControl?.({ id, attrs, optionsHtml }) || ""}
        ${hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const full = (html) => (html ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${html}</div>` : "");
  const section = (title, body, { meta = "", tools = "", id = "", card = true, cls = "" } = {}) => `
    <section class="e-permits-dosar-profil__section${cls ? ` ${cls}` : ""}"${id ? ` aria-labelledby="${id}"` : ""}>
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title"${id ? ` id="${id}"` : ""}>${esc(title)}</h2>
        ${tools ? `<div class="e-permits-passport__heading-tools">${meta ? `<span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(meta)}</span>` : ""}${tools}</div>` : meta ? `<span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(meta)}</span>` : ""}
      </div>
      ${card ? `<div class="e-permits-ntpl-card">${body}</div>` : body}
    </section>`;
  const labelled = (lblId, lbl, html, { required = false } = {}) => `<div class="e-permits-wid-vis-field"><span class="e-permits-cfg-ro__label" id="${lblId}">${esc(lbl)}${required ? req() : ""}</span>${html}</div>`;

  /* ================================================================ the steps (Feature UX: Date generale · Roluri și autorități · Widget-uri) */
  /* the create sheet and the profile under it never share ids (a clone opens the sheet over the profile) */
  const idpNow = () => (P.isNew ? "dsh-n" : "dsh-e");
  function stepGeneral(v, e, idp) {
    return `
      ${section("Denumire și descriere", grid(
        textField(`${idp}-name-ro`, "names.ro", "Denumire (RO)", v.names.ro, { required: true, max: NAME_MAX, counter: true, hint: "De exemplu „Tabloul de bord al specialistului”.", error: e["names.ro"] }),
        textField(`${idp}-name-ru`, "names.ru", "Denumire (RU)", v.names.ru, { span: 6, hint: "Obligatoriu la publicare." }),
        textField(`${idp}-name-en`, "names.en", "Denumire (EN)", v.names.en, { span: 6, hint: "Obligatoriu la publicare." }),
        areaField(`${idp}-desc-ro`, "descriptions.ro", "Descriere (RO)", v.descriptions.ro, { hint: "Explicația scurtă, de exemplu „Dosarele în examinare și termenele lor”." }),
        textField(`${idp}-desc-ru`, "descriptions.ru", "Descriere (RU)", v.descriptions.ru, { span: 6 }),
        textField(`${idp}-desc-en`, "descriptions.en", "Descriere (EN)", v.descriptions.en, { span: 6 })
      ))}
      ${section("Ordinea în listă", grid(
        textField(`${idp}-order`, "order", "Ordinea tabloului de bord", v.order, { required: true, span: 6, numeric: true, placeholder: "1", hint: "Tabloul principal se prezintă primul; celelalte, după ordine, de la cea mai mică.", error: e.order }),
        `<div class="e-permits-user-create__field e-permits-user-create__field--6">${U().renderInfoNote?.(who().central ? "Ordinea unui tablou de bord global este aceeași în toate autoritățile asignate." : `Ordinea se aplică tablourilor de bord ale ${esc(authName(who().authority))}.`) || ""}</div>`
      ))}`;
  }
  /* roles: one stacked row per role — the type = the library segmented control (Principal · Secundar), red remove; „Adaugă
     rol ▾” = the in-flow stack menu (the Rapoarte „Adaugă coloană ▾”) */
  function rolesBlock(v, e, idp, d) {
    const free = ROLES.filter(([id]) => !v.roles.some((r) => r.role === id));
    const clash = new Map(conflicts(v, d).map((c) => [c.role, c.other]));
    const add = free.length ? `
      <div class="e-permits-stack__menu-wrap e-permits-dsh-add-role">
        <button class="btn btn-secondary btn-sm e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${idp}-role-menu" data-stack-menu-trigger data-stack-menu-align="start" id="${idp}-roles">${icon("plus-large", 16)}<span>Adaugă rol</span>${icon("chevron-bottom", 16)}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="${idp}-role-menu" role="menu" aria-label="Rolurile" hidden data-stack-menu>
          ${free.map(([id, text]) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-dsh-role-add="${id}">${icon("person")}<span>${esc(text)}</span></button></li>`).join("")}
        </ul>
      </div>` : "";
    const list = v.roles.length ? `<div class="e-permits-stack e-permits-reg-editor__stack"><ul class="e-permits-stack__list" role="list">${v.roles.map((r) => A().renderStackItem?.({
      plainTitle: roleName(r.role),
      title: esc(roleName(r.role)),
      badges: [r.type === "principal" ? tag("Principal", "brand") : ""].filter(Boolean),
      meta: [esc(r.type === "principal"
        ? clash.get(r.role) ? `Acum principal: ${clash.get(r.role).id} „${nameOf(clash.get(r.role))}” — devine secundar pentru ${roleName(r.role)} la publicare.` : "Se prezintă primul rolului la autentificare, după publicare."
        : "Rolul trece la el din tabloul de bord principal.")],
      actionsHtml: `
        <div class="segmented-control e-permits-dsh-type" role="radiogroup" aria-label="Tipul pentru ${esc(roleName(r.role))}">
          ${TYPES.map(([k, l]) => `<button class="segment-item${r.type === k ? " is-selected" : ""}" type="button" role="radio" aria-checked="${r.type === k}" id="${idp}-type-${r.role}-${k}" data-dsh-role-type="${r.role}|${k}">${l}</button>`).join("")}
        </div>
        <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină rolul ${esc(roleName(r.role))}" data-tooltip-label="Elimină rolul" data-dsh-role-remove="${r.role}">${icon("delete", 16)}</button>`
    }) || "").join("")}</ul></div>` : "";
    return `
      ${list || (E()?.render({ title: "Niciun rol încă", text: "Alege rolurile cărora li se adresează tabloul de bord și tipul pentru fiecare.", icon: "people", compact: true, bare: true }) || "")}
      ${e.roles ? errorHtml(`${idp}-roles`, e.roles) : ""}
      <div class="e-permits-dsh-foot">${add}</div>`;
  }
  function authBlock(v, e, idp) {
    const me = who();
    if (!me.central) {
      return labelled(`${idp}-auth-label`, "Autoritate", `<div class="e-permits-cfg-ro" aria-labelledby="${idp}-auth-label">${esc(authName(me.authority))} · ${esc(authLong(me.authority))}</div><p class="e-permits-fo-field__hint">Tabloul de bord se creează la nivelul autorității tale; autoritatea nu se modifică.</p>`);
    }
    /* dsh-auth-ms-v1 (same as Rapoarte rpt-auth-ms-v1): „Toate autoritățile” checkbox above the FO multi-select (CAEM) with
       the chips under the field; ticked = all (field disabled, no chips), unticked = pick ≥ 1 */
    /* dsh-auth-ms-v2 (= Rapoarte rpt-auth-ms-v2, user): „Toate autoritățile” = the FIRST item of the dropdown (select-all) */
    const lab = ([, short, long]) => `${short} · ${long}`;
    let ms = window.GEAPFormRender?.fieldHtml({ id: `${idp}-authorities`, type: "multiselect", chipMax: 4, label: "Autoritățile tabloului de bord", required: true, options: AUTHORITIES.map(lab), allSelected: v.allAuthorities, selectAllLabel: "Toate autoritățile", value: v.allAuthorities ? [] : v.authorities.map((id) => AUTHORITIES.find(([k]) => k === id)).filter(Boolean).map(lab), placeholder: "Alege autoritățile", countOne: "autoritate selectată", countMany: "autorități selectate", removeLabel: "Elimină autoritatea", searchLabel: "Caută autoritatea", searchAria: "Caută autoritatea", hint: "Tabloul de bord este asignat autorităților alese; „Toate autoritățile” include și cele adăugate ulterior.", span: 12 }) || "";
    if (e.authorities) ms = ms.replace('e-permits-fo-subgen-select" data-fo-subgen-select', 'e-permits-fo-subgen-select is-error" data-fo-subgen-select').replace(/<p class="e-permits-fo-field__hint"[^]*?<\/p>\s*<\/div>\s*$/, "</div>").replace(/<\/div>\s*$/, `${errorHtml(`fo-${idp}-authorities`, e.authorities)}</div>`);
    return `<div class="e-permits-dsh-auths" id="${idp}-authorities" data-dsh-auth-ms>${ms}</div>`;
  }
  function stepAccess(v, e, idp, d) {
    const me = who();
    return `
      ${section("Roluri", rolesBlock(v, e, idp, d), { meta: "Principal sau secundar, pentru fiecare rol" })}
      ${section("Nivel și autorități", grid(
        full(labelled(`${idp}-level-label`, "Nivel", `<div class="e-permits-cfg-ro" aria-labelledby="${idp}-level-label">${me.central ? "Global" : `Autoritate · ${esc(authName(me.authority))}`}</div><p class="e-permits-fo-field__hint">Se stabilește automat: ${me.central ? "tablourile de bord ale Administratorului central sunt globale" : "tablourile tale sunt specifice autorității"}.</p>`)),
        full(authBlock(v, e, idp))
      ))}`;
  }

  /* ================================================================ THE LAYOUT EDITOR (dash-v3, 2026-11-10, user + Mobbin: Sentry · Twenty ·
     Salesforce · Xero dashboards; components.md › „Tablouri de bord”)
     ONE WYSIWYG canvas: the edit view IS the final dashboard (no separate preview) — only the widgets, at the available
     width, no shell skeleton and no scaling (dash-v4, user); the cards exactly as on the dashboard (no wrapper borders). Editing appears only on hover / focus
     / drag: the shared grey hover surface (`.e-permits-hover-surface`, the calendar months), a floating toolbar (drag
     handle + red remove), a bottom-right resize corner that snaps to 4 · 6 · 8 · 12 columns and Compactă · Înaltă, the
     12 column guides while dragging / resizing. Drag = iPhone-style live reflow (FLIP). Keyboard: the widget is focusable;
     ← → ↑ ↓ move it, Shift + ← → change the width, Shift + ↑ ↓ change the height one row unit (announced). Add = one widget at a time (the
     picker), it lands at the end at its default size, scrolls into view and flashes. Phones: one widget per row, no
     resize; the toolbar shows ↑ ↓ + remove. */
  const SPAN = { third: 4, half: 6, twoThirds: 8, full: 12 };
  const WIDTH_KEYS = ["third", "half", "twoThirds", "full"];
    /* dsh-half-row-v1: a number tile has one fixed height (half a Compactă row) → its size = the width only */
  const sizeText = (t) => `${SPAN[t.width] || 12}/12 · ${rowsText(rowsOf(t))}`;
  function tileBody(t, d) {
    const info = widgetInfo(t.widget, d);
    if (!info.active) {
      return `<div class="e-permits-chart e-permits-wid-card e-permits-dsh-tile__off">${E()?.render({ title: "Widget dezactivat", text: `„${info.title}” nu mai este publicat și nu apare pe tablou. Elimină-l sau înlocuiește-l.`, icon: "warning-filled", compact: true, bare: true }) || ""}</div>`;
    }
    return W().card?.({ ...info.cfg, width: t.width, height: hOf(t) }, { compact: true, dash: true }) || "";
  }
  function tileHtml(t, i, n, d, edit, span = rowsOf(t)) {
    const info = widgetInfo(t.widget, d);
    const name = `${i + 1}. ${info.title}, ${sizeText(t)}${info.active ? "" : ", dezactivat"}`;
    const tools = edit ? `
      <div class="e-permits-dsh-tile__tools">
        <button class="btn btn-neutral btn-sm btn-icon-only e-permits-dsh-tile__handle" type="button" tabindex="-1" aria-label="Mută „${esc(info.title)}”" data-tooltip-label="Trage ca să muți. Cu tastatura: săgețile mută, Shift + săgețile schimbă dimensiunea." data-dsh-handle>${icon("drag", 16)}</button>
        <button class="btn btn-neutral btn-sm btn-icon-only e-permits-dsh-tile__step" type="button" aria-label="Mută „${esc(info.title)}” mai sus" data-tooltip-label="Mută mai sus" data-dsh-move="${t.widget}|-1"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
        <button class="btn btn-neutral btn-sm btn-icon-only e-permits-dsh-tile__step" type="button" aria-label="Mută „${esc(info.title)}” mai jos" data-tooltip-label="Mută mai jos" data-dsh-move="${t.widget}|1"${i === n - 1 ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
        <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină „${esc(info.title)}” de pe tablou" data-tooltip-label="Elimină de pe tablou" data-dsh-remove="${t.widget}">${icon("delete", 16)}</button>
      </div>
      <span class="e-permits-dsh-tile__resize" aria-hidden="true" data-dsh-resize>${icon("resize", 16)}</span>
      <span class="e-permits-dsh-tile__size" aria-hidden="true">${tag(sizeText(t), "brand")}</span>` : "";
    return `<div class="e-permits-dsh-tile e-permits-dsh-tile--${SPAN[t.width] ? t.width : "full"} e-permits-dsh-tile--${hOf(t)} e-permits-dsh-tile--r${span}${isStat(t.widget) ? " e-permits-dsh-tile--stat" : ""}${edit ? " e-permits-hover-surface is-editable" : ""}" role="listitem" data-dsh-tile="${t.widget}" data-index="${i}"${edit ? ` tabindex="0" aria-roledescription="widget mutabil" aria-label="${esc(name)}"` : ` aria-label="${esc(name)}"`}>${tileBody(t, d)}${tools}</div>`;
  }
  function layoutHtml(v, d, { edit = false } = {}) {
    const n = v.widgets.length;
    const spans = placedRows(v.widgets);
    const tiles = v.widgets.map((t, i) => tileHtml(t, i, n, d, edit, spans[i])).join("");
    const ghost = edit && n < MAX_WIDGETS ? `<div class="e-permits-dsh-ghost${spans[n - 1] === ROWS.stat ? " e-permits-dsh-ghost--r5" : ""}" role="listitem"><span class="e-permits-dsh-ghost__text">Adaugă widget-urile unul câte unul și aranjează-le aici.</span>${addButton(v)}</div>` : "";
    const body = n || edit
      ? `<div class="e-permits-dsh-grid${edit ? " is-editing" : ""}" role="list" aria-label="Widget-urile tabloului de bord, în ordinea de citire" data-dsh-grid>
          <div class="e-permits-dsh-guides" aria-hidden="true">${Array.from({ length: 12 }, () => "<span></span>").join("")}</div>
          ${tiles}${ghost}
        </div>`
      : E()?.render({ title: "Niciun widget", text: "Tabloul de bord nu are încă widget-uri.", icon: "chart", compact: true }) || "";
    return `<div class="e-permits-dsh-stage" data-dsh-stage>${body}</div>`;
  }
  const addButton = (v) => `<button class="btn btn-secondary btn-sm" type="button" aria-haspopup="dialog" data-dsh-add${v.widgets.length >= MAX_WIDGETS ? ` aria-disabled="true" data-tooltip-reason="Un tablou de bord are cel mult ${MAX_WIDGETS} de widget-uri."` : ""}>${icon("plus-large", 16)}<span>Adaugă widget</span></button>`;
  function stepWidgets(v, e, idp, d) {
    return `
      ${section("Widget-uri", `
        ${e.widgets ? `<div class="e-permits-reg-notices" id="${idp}-widgets">${U().renderNotice?.("error", esc(e.widgets), { role: "alert" }) || ""}</div>` : ""}
        ${layoutHtml(v, d, { edit: true })}
        <p class="u-visually-hidden" aria-live="polite" data-dsh-live></p>`, { meta: `${v.widgets.length}/${MAX_WIDGETS}`, tools: addButton(v), card: false, cls: "e-permits-dsh-layout", id: `${idp}-layout-title` })}`;
  }
  /* the canvas renders at the available width (no scaling, dash-v4): pointer deltas are screen px */
  const zoomOf = () => 1;

  /* ---- read-only passport blocks (profile, review, version view) */
  function configRows(v, level = "Global") {
    const d = (x) => (x ? esc(x) : dash);
    return {
      general: [["Denumire (RO)", d(v.names.ro)], ["Denumire (RU)", d(v.names.ru)], ["Denumire (EN)", d(v.names.en)], ["Descriere", d(v.descriptions.ro)], ["Ordinea tabloului de bord", d(String(v.order || ""))]],
      access: [["Roluri", d(rolesText(v))], ["Nivel", esc(level)], ["Autorități asignate", d(level === "Global" && !v.allAuthorities && v.authorities.length > 2 ? `${v.authorities.length} autorități` : authText(v, level))]],
      widgets: [["Widget-uri", esc(`${v.widgets.length} din ${MAX_WIDGETS}`)], ...v.widgets.map((t, i) => [widgetInfo(t.widget).title, esc(`Poziția ${i + 1} · ${label(WIDTHS(), t.width)} · ${rowsText(rowsOf(t))}`)])]
    };
  }
  const flatRows = (v, level) => { const r = configRows(v, level); return [...r.general, ...r.access, ...r.widgets]; };
  function readBlocks(v, level, { goto = null } = {}) {
    const rows = configRows(v, level);
    const block = (title, list, n) => A().renderPassportBlock?.(title, list, goto ? { actionHtml: goto(n) } : {}) || "";
    return `${block("Date generale", rows.general, 1)}${block("Roluri și autorități", rows.access, 2)}`;
  }

  /* ================================================================ LIST (US-411) */
  const statusOf = (d, me = who()) => {
    if (d.status === "Publicat" && isOffFor(d, me.authority) && !me.central) return [`Dezactivat în ${authName(me.authority)}`, "neutral"];
    return [d.status, STATUS_TONE[d.status] || "neutral"];
  };
  const rowOf = (d) => {
    const [statut, tone] = statusOf(d);
    const lv = lastVersion(d);
    const principal = d.config.roles.filter((r) => r.type === "principal").map((r) => roleName(r.role));
    return {
      id: d.id, denumire: nameOf(d), roluri: d.config.roles.map((r) => roleName(r.role)).join(", "), principal, nivel: d.level,
      autoritate: d.level === "Global" ? authText(d.config, "Global") : authName(d.authority), widgeturi: d.config.widgets.length,
      ordine: Number(d.config.order) || 0, statut, tone, versiune: lv ? String(lv.version) : "", nepublicat: unpublished(d), modificat: d.updatedAt || "",
      /* dsh-stack-list-v1 (= Rapoarte rpt-stack-list-v1 / rpt-facets-v1): description line + facets Creat de · Autoritate */
      descriere: String(d.config.descriptions?.ro || "").trim(), creat: d.createdBy || "",
      autoritati: d.level === "Global" ? (d.config.allAuthorities ? AUTHORITIES.map(([, short]) => short) : d.config.authorities.map(authName)) : [authName(d.authority)],
      d
    };
  };
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 8,
      /* dsh-stack-list-v1 (2026-11-11, = Rapoarte rpt-page-v1 / rpt-sort-v1): the shared BO pager 20 a page; newest change
         first; „Sortează” = Ultima modificare · Denumire · Ordinea · ID (registry `sort`) */
      pageSizes: [20, 40, 60],
      defaultSort: "modificat",
      defaultSortDirection: "desc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        denumire: { label: "Denumire", width: 304, sortable: true },
        roluri: { label: "Roluri", width: 240, sortable: true },
        nivel: { label: "Nivel", width: 184, sortable: true },
        widgeturi: { label: "Widget-uri", width: 128, sortable: true },
        ordine: { label: "Ordinea", width: 112, sortable: true },
        statut: { label: "Statut", width: 176, sortable: true },
        versiune: { label: "Versiune", width: 168, sortable: true },
        modificat: { label: "Modificat", width: 184, sortable: true },
        ...(me.has ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          /* dsh-stack-list-v1: the rows are the shared stacked list (`stackItem` below, as Rapoarte); the level tabs
             (Toate · Globale · Ale autorităților) became the Nivel facet; the table columns stay for sort / export */
          searchPlaceholder: "Caută după ID, denumire sau descriere",
          columns: ["id", "denumire", "roluri", "nivel", "widgeturi", "ordine", "statut", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
          tabs: [],
          primaryAction: canCreate() ? { id: "dsh-new", label: "Tablou de bord nou" } : null,
          toolbarLabel: "Filtrare tablouri de bord",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: dashboards().map(rowOf)
    };
  }
  const SORT = { versiune: (r) => String(r.versiune || 0).padStart(4, "0"), modificat: (r) => r.modificat || "0000", widgeturi: (r) => String(r.widgeturi).padStart(3, "0"), ordine: (r) => String(r.ordine).padStart(3, "0"), nivel: (r) => `${r.nivel === "Global" ? 0 : 1}${r.autoritate}` };
  function rowMenu(row) {
    const d = row.d;
    const me = who();
    const mine = authName(me.authority);
    const items = [
      canEdit(d) && d.status !== "Dezactivat" && { label: "Editează", icon: "edit", attrs: `data-dsh-row-edit="${esc(d.id)}"` },
      canClone(d) && { label: "Clonează", icon: "copy", attrs: `data-dsh-row-clone="${esc(d.id)}"` },
      canAuth(d) && d.status === "Publicat" && (isOffFor(d, me.authority)
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: `data-dsh-row-auth="${esc(d.id)}"` }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: `data-dsh-row-auth="${esc(d.id)}"` }),
      canEdit(d) && d.status !== "Ciornă" && (d.status === "Dezactivat"
        ? { label: "Activează", icon: "rotate-arrow", attrs: `data-dsh-row-toggle="${esc(d.id)}"` }
        : { label: "Dezactivează", icon: "pause", attrs: `data-dsh-row-toggle="${esc(d.id)}"` }),
      canRemove(d) && { label: "Elimină ciorna", icon: "delete", attrs: `data-dsh-row-remove="${esc(d.id)}"` }
    ].filter(Boolean);
    if (!items.length) return "";
    const html = U().renderRowActions?.({ menu: items, label: `${d.id} ${nameOf(d)}` }) || "";
    /* fixed: the list scrolls inside the registry's table wrap, an in-flow menu would be clipped */
    return html ? html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : "";
  }
  /* dsh-stack-list-v1 (2026-11-11, = Rapoarte rpt-details-line-v1): title + Small status tag · description (tertiary, 2 lines
     + tooltip when cut) · details „DSH-0001 · v2 · Global: Toate autoritățile · Specialist (principal) · 6 widget-uri ·
     Editat <dată>, <oră> · <cine>”; right side = only ⋮ (the row opens the dashboard) */
  const pendingHtml = (row) => A().renderHeaderStatus?.("Modificări nepublicate", "warning", `data-dsh-pending-row="${esc(row.id)}" aria-haspopup="dialog" data-tooltip-text="Vezi modificările" aria-label="Vezi modificările nepublicate ale ${esc(row.id)}"`) || "modificări nepublicate";
  const scopeText = (row) => (row.nivel === "Global" ? `Global: ${row.autoritate}` : `Autoritate: ${row.autoritate}`);
  const rolesShort = (row) => row.d.config.roles.map((r) => `${roleName(r.role)}${r.type === "principal" ? " (principal)" : ""}`).join(", ");
  const stackItem = (row) => {
    const details = [
      esc(row.id),
      row.versiune ? `v${esc(row.versiune)}` : "nepublicat",
      esc(scopeText(row)),
      row.roluri ? `<span data-cell-tooltip="${esc(rolesShort(row))}">${esc(rolesShort(row))}</span>` : "",
      esc(plural(row.widgeturi, "widget", "widget-uri")),
      row.nepublicat ? pendingHtml(row) : "",
      row.modificat ? `Editat ${esc(longDate(row.modificat))}, ${esc(time(row.modificat))}${row.d.updatedBy ? ` · ${esc(row.d.updatedBy)}` : ""}` : ""
    ].filter(Boolean);
    return {
      plainTitle: row.denumire,
      title: esc(row.denumire),
      badges: [tag(row.statut, row.tone)],
      meta: row.descriere ? [`<span class="e-permits-rpt-list__desc" data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>`] : details,
      meta2: row.descriere ? details : null,
      actionsHtml: who().has ? rowMenu(row) : ""
    };
  };
  const twoLines = (top, meta) => `<span class="e-permits-workplace__date-stack"><span>${top}</span><span class="e-permits-workplace__date-meta">${meta}</span></span>`;
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "nivel", label: "Nivel", get: (row) => row.nivel },
        { key: "statut", label: "Statut", get: (row) => row.statut },
        { key: "rol", label: "Rol", get: (row) => row.d.config.roles.map((r) => roleName(r.role)) },
        { key: "tip", label: "Tip", get: (row) => (row.principal.length ? "Principal" : "Doar secundar") },
        /* a global dashboard for „Toate autoritățile” matches every authority (as Rapoarte) */
        { key: "autoritate", label: "Autoritate", search: true, get: (row) => row.autoritati },
        { key: "creat", label: "Creat de", search: true, get: (row) => row.creat }
      ];
    },
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)} ${row.descriere} ${fold(row.descriere)}`,
    stackItem,
    stackClass: "e-permits-rpt-list e-permits-dsh-list",
    sort: {
      keys: [{ value: "modificat", label: "Ultima modificare" }, { value: "denumire", label: "Denumire" }, { value: "ordine", label: "Ordinea" }, { value: "id", label: "ID" }],
      orders: (key) => ({
        modificat: [{ value: "desc", label: "Cele mai noi întâi" }, { value: "asc", label: "Cele mai vechi întâi" }],
        denumire: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }],
        ordine: [{ value: "asc", label: "Crescător" }, { value: "desc", label: "Descrescător" }],
        id: [{ value: "asc", label: "Crescător" }, { value: "desc", label: "Descrescător" }]
      })[key] || []
    },
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: (row, token) => (token === "level:global" ? row.nivel === "Global" : token === "level:authority" ? row.nivel !== "Global" : true),
    rowClass: (row) => (row.statut === "Publicat" || row.statut === "Ciornă" ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "id": return `<span data-cell-tooltip="${esc(row.id)}">${esc(row.id)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        case "roluri": return row.principal.length ? twoLines(`<span data-cell-tooltip="${esc(row.roluri)}">${esc(row.roluri)}</span>`, esc(`principal: ${row.principal.join(", ")}`)) : `<span data-cell-tooltip="${esc(row.roluri)}">${esc(row.roluri || "—")}</span>`;
        case "nivel": return twoLines(esc(row.nivel), `<span data-cell-tooltip="${esc(row.autoritate)}">${esc(row.autoritate)}</span>`);
        case "widgeturi": return esc(String(row.widgeturi));
        case "ordine": return esc(String(row.ordine || "—"));
        case "statut": return tag(row.statut, row.tone);
        case "versiune": return row.versiune ? (row.nepublicat ? twoLines(esc(row.versiune), "modificări nepublicate") : esc(row.versiune)) : twoLines(dash, "nepublicat");
        case "modificat": return row.modificat ? twoLines(esc(longDate(row.modificat)), esc(`${time(row.modificat)} · ${row.d.updatedBy || ""}`)) : dash;
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    openRow: (id) => openProfile(id, "configurare"),
    rowLabel: (row) => `${row.id}, ${row.denumire} — deschide tabloul de bord`,
    /* boxed (registry-stack-v1): the stacked list has no table cell around it → the normal dashed empty state */
    emptyHtml: ({ query, filtered, boxed = false }) => {
      const bare = !boxed;
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare });
      if (!S.data) return E()?.render({ title: "Se încarcă tablourile de bord…", loading: true, bare });
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după ID, denumire sau descriere, sau schimbă filtrele.", icon: "search", bare, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: EMPTY_LIST, text: canCreate() ? "Creează primul tablou de bord cu „Tablou de bord nou”." : "", icon: "dot-grid", bare, actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-dsh-new>Tablou de bord nou</button>' : "" });
    },
    exportRows: (rows) => exportCsv(rows),
    exportState: () => (who().has ? {} : { hidden: true })
  };
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }
  function exportCsv(rows) {
    const head = ["ID", "Denumire", "Roluri", "Nivel", "Autorități", "Widget-uri", "Ordinea", "Statut", "Versiune", "Modificat"];
    const lines = rows.map((r) => [r.id, r.denumire, rolesText(r.d.config), r.nivel, r.autoritate, r.widgeturi, r.ordine, r.statut, r.versiune || "-", r.modificat ? `${longDate(r.modificat)} ${time(r.modificat)}` : "-"]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "tablouri-de-bord.csv" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Am exportat ${plural(rows.length, "tablou de bord", "tablouri de bord")} în tablouri-de-bord.csv.`);
  }

  /* ---------------------------------------------------------------- audit (Feature AC: every operation → Istoric + Jurnalul de audit) */
  const journalEvent = (h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Eșuat" : "Reușit", detail: h.detail || "" });
  const versionAt = (d, at) => d.versions.filter((x) => String(x.at || "") <= String(at)).pop()?.version || 0;
  const journalCtx = (d, h) => {
    const auth = /· (ANSP|ANTA|ANSA|AMDM)$/.exec(h.role || "")?.[1] || (d.level === "Global" ? "" : authName(d.authority));
    const v = versionAt(d, h.at);
    return { module: "BackOffice", authority: auth, objectType: "Tablou de bord", objectId: d.id, objectVersion: v ? `versiunea ${v}` : "ciornă", related: [] };
  };
  function audit(d, kind, detail = "", { by = userName(), role = roleLabel() } = {}) {
    const h = { at: nowIso(), by, role, event: EVENTS[kind], detail };
    d.history.unshift(h);
    window.GEAPEventTimeline?.log?.(journalEvent(h), journalCtx(d, h));
    if (!["authOn", "authOff", "rejected", "demote"].includes(kind)) { d.updatedAt = nowIso(); d.updatedBy = userName(); }
  }

  /* ---------------------------------------------------------------- deactivate / activate (US-547) · remove (US-549) */
  function setStatus(d, on, after) {
    if (!canEdit(d)) return;
    const principals = d.config.roles.filter((r) => r.type === "principal").map((r) => roleName(r.role));
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      d.status = on ? (d.versions.length ? "Publicat" : "Ciornă") : "Dezactivat";
      /* only a published dashboard is principal (Feature AC): deactivating drops its principal roles */
      if (!on && principals.length) [d.config, lastVersion(d)?.config].filter(Boolean).forEach((c) => c.roles.forEach((r) => { r.type = "secundar"; }));
      audit(d, on ? "on" : "off", !on && principals.length ? `Nu mai este principal pentru: ${principals.join(", ")}` : "");
      toast(on ? `Tabloul de bord „${nameOf(d)}” a fost activat.` : `Tabloul de bord „${nameOf(d)}” a fost dezactivat.`);
      after?.();
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivezi tabloul de bord „${nameOf(d)}”?`,
      text: `Rolurile nu îl mai văd în BackOffice${d.level === "Global" ? ", în nicio autoritate" : ""}.${principals.length ? ` Nu mai este principal pentru ${principals.join(", ")}: rolul vede tabloul principal global sau, fără el, tablourile în ordinea lor.` : ""} Configurația și versiunile se păstrează; îl poți activa oricând.`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, apply);
  }
  function setAuthActive(d, on, after) {
    if (!canAuth(d)) return;
    const mine = authName(who().authority);
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      d.offFor = on ? d.offFor.filter((a) => a !== who().authority) : [...new Set([...d.offFor, who().authority])];
      audit(d, on ? "authOn" : "authOff", mine);
      toast(on ? `Tabloul de bord „${nameOf(d)}” a fost activat pentru ${mine}.` : `Tabloul de bord „${nameOf(d)}” a fost dezactivat pentru ${mine}.`);
      after?.();
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivezi tabloul de bord „${nameOf(d)}” pentru ${mine}?`,
      text: `Tabloul de bord global nu mai apare rolurilor din ${mine}. Rămâne activ pentru celelalte autorități; îl poți activa oricând pentru ${mine}.`,
      confirmLabel: `Dezactivează pentru ${mine}`,
      destructive: true
    }, apply);
  }
  function removeDraft(d, after) {
    if (!canRemove(d)) return;
    U().askConfirm?.({
      title: `Elimini ciorna „${nameOf(d)}”?`,
      text: `Tabloul de bord ${d.id} nu a fost publicat; ciorna se șterge definitiv. ID-ul nu se refolosește.`,
      confirmLabel: "Elimină ciorna",
      destructive: true
    }, () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      audit(d, "remove", `${d.id} · ${nameOf(d)}`);
      D().removed = [...(D().removed || []), d.id];
      D().dashboards = all().filter((x) => x.id !== d.id);
      toast(`Ciorna „${nameOf(d)}” a fost eliminată.`);
      after?.();
    });
  }

  /* ================================================================ PROFILE = the editor page (US-544 · US-546 · US-548 · US-550) */
  const P = { id: null, tab: "configurare", isNew: false, from: "", draft: null, base: null, errors: {}, saveError: false, compare: null, step: 1, maxStep: 1 };
  const TABS = [["configurare", "Configurare"], ["versiuni", "Versiuni"], ["istoric", "Istoric"]];
  const profileOpen = () => (Boolean(P.id) || P.isNew) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "dsh-panel";
  const editable = (d = dashOf(P.id)) => P.isNew || (Boolean(d) && canEdit(d) && d.status !== "Dezactivat");
  const pageDirty = () => Boolean(P.draft) && (P.isNew ? Boolean(P.draft.names.ro || P.draft.roles.length || P.draft.widgets.length || P.from) : !same(P.draft, P.base));
  const levelNow = () => (P.isNew ? (who().central ? "Global" : "Autoritate") : dashOf(P.id)?.level || "Global");
  async function openProfile(id, tab = "configurare", { push = true } = {}) {
    await load();
    const d = dashOf(id);
    if (!who().has || !d || !visible(d)) { showDenied(); return; }
    if (P.id !== id || P.isNew) { P.compare = null; P.errors = {}; P.saveError = false; P.draft = clone(d.config); P.base = clone(d.config); }
    P.id = id; P.isNew = false; P.from = "";
    P.tab = TABS.some(([t]) => t === tab) ? tab : "configurare";
    show(`#tablou/${id}/${P.tab}`, push);
  }
  let beforeCreate = null;
  async function openNew({ from = "" } = {}) {
    await load();
    if (!canCreate()) return;
    const src = from ? dashOf(from) : null;
    if (src && !canClone(src)) return;
    const me = who();
    const v = src ? clone(src.config) : blankConfig(me);
    if (src) {
      v.names.ro = `${v.names.ro} (copie)`.slice(0, NAME_MAX);
      /* a copy is a new draft at its author's level: a local copy = his authority; never principal before publication */
      if (!me.central) { v.allAuthorities = false; v.authorities = [me.authority]; v.widgets = v.widgets.filter((t) => pickable("Autoritate", me.authority).some((w) => w.id === t.widget)); }
      v.roles.forEach((r) => { r.type = "secundar"; });
    } else {
      const mine = all().filter((x) => (me.central ? x.level === "Global" : x.authority === me.authority));
      v.order = String(Math.max(0, ...mine.map((x) => Number(x.config.order) || 0)) + 1);
    }
    beforeCreate = { ...P, back: document.activeElement };
    Object.assign(P, { id: null, isNew: true, from: src?.id || "", tab: "configurare", draft: v, base: clone(v), errors: {}, saveError: false, compare: null, step: 1, maxStep: src ? STEPS.length : 1 });
    const el = ensureSheet();
    renderCreate();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(`#${idpNow()}-name-ro`)?.focus({ preventScroll: true }));
  }
  function show(hash, push) {
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    registerChangeSource();
    renderProfile();
    A().writeHash?.(hash, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function closeProfile() { P.id = null; P.isNew = false; P.draft = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); }
  const changedFields = () => {
    if (!P.draft || P.isNew) return {};
    const out = {};
    (CP().diffRows?.(P.base, P.draft, (v) => flatRows(v, levelNow())) || []).forEach((c) => { out[c.label] = [c.before, c.after]; });
    return out;
  };
  /* header: max 2 visible actions (Salvează · Publică) + ⋮ (Clonează · per authority · Dezactivează / Activează · Elimină ciorna) */
  function headerActions(d) {
    const me = who();
    const mine = authName(me.authority);
    const dirty = pageDirty();
    const canPub = editable(d) && (!d.versions.length || unpublished(d) || dirty);
    const menu = [
      canClone(d) && { label: "Clonează", icon: "copy", attrs: "data-dsh-clone" },
      canAuth(d) && d.status === "Publicat" && (isOffFor(d, me.authority)
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: "data-dsh-auth" }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: "data-dsh-auth" }),
      canEdit(d) && d.status !== "Ciornă" && (d.status === "Dezactivat" ? { label: "Activează", icon: "rotate-arrow", attrs: "data-dsh-toggle" } : { label: "Dezactivează", icon: "pause", attrs: "data-dsh-toggle" }),
      canRemove(d) && { label: "Elimină ciorna", icon: "delete", attrs: "data-dsh-remove-draft" }
    ].filter(Boolean);
    return `
      ${editable(d) ? `<button class="btn btn-secondary btn-sm" type="button" data-dsh-save${dirty ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>` : ""}
      ${canPub ? '<button class="btn btn-primary btn-sm" type="button" data-dsh-publish>Publică</button>' : ""}
      ${(U().renderStackMenu?.(menu, nameOf(d)) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}`;
  }
  function headerTop(d) {
    const n = Object.keys(changedFields()).length;
    const status = n
      ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("dsh-draft")) || ""
      : d && unpublished(d) && d.status !== "Dezactivat" ? A().renderHeaderStatus?.("Modificări nepublicate", "warning", 'data-dsh-pending aria-haspopup="dialog" data-tooltip-text="Vezi modificările"') || "" : "";
    return A().renderPageHeaderTop({
      back: { label: TITLE, attr: "data-dsh-back" },
      title: nameOf(d),
      actions: headerActions(d),
      status,
      caption: d.updatedAt ? `Modificat ${longDate(d.updatedAt)}, ${time(d.updatedAt)} · ${d.updatedBy || ""}` : ""
    });
  }
  function renderProfile({ keep = "" } = {}) {
    const d = dashOf(P.id);
    const els = A().els || {};
    if (!d || !els.dosarProfilTitleRow) return;
    const active = document.activeElement;
    const keepSel = keep || (active && els.dosarProfilPanelBody?.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    els.dosarProfilTitleRow.innerHTML = headerTop(d);
    const lv = lastVersion(d);
    const [statut, tone] = statusOf(d);
    const v = editable(d) ? P.draft : d.config;
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["ID", A().renderProfileCopyCode?.(d.id, `Copiază ${d.id}`) || esc(d.id)],
      ["Nivel", esc(levelText(d))],
      ["Roluri", esc(v.roles.map((r) => `${roleName(r.role)}${r.type === "principal" ? " (principal)" : ""}`).join(", ") || "—")],
      ["Statut", tag(statut, tone)],
      ["Versiune publicată", lv ? esc(String(lv.version)) : "nepublicat"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const counts = { versiuni: d.versions.length, istoric: Math.min(d.history.length, 100) };
    els.dosarProfilTabs.innerHTML = TABS.map(([id, text]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="dsh-tab-${id}" type="button" role="tab" aria-controls="dsh-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-dsh-tab="${id}"><span>${text}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}</button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "dsh-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `dsh-tab-${P.tab}`);
    body.innerHTML = `${notices(d)}${P.tab === "versiuni" ? versionsTab(d) : P.tab === "istoric" ? historyTab(d) : configTab(d)}`;
    syncMixed(body);
    if (keepSel) {
      const el = document.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  /* the FO behaviour of the authorities multi-select after every render */
  const syncMixed = (root) => root?.querySelectorAll("[data-dsh-auth-ms]").forEach((el) => window.GEAPFormRender?.bind?.(el));
  function notices(d) {
    const me = who();
    const mine = authName(me.authority);
    const list = [
      P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }),
      d.status === "Dezactivat" && U().renderNotice?.("warning", `<strong>Tablou de bord dezactivat.</strong> Rolurile nu îl văd în BackOffice. Configurația și versiunile se păstrează${canEdit(d) ? "; „Activează” din meniul ⋮ îl readuce" : ""}.`),
      d.status === "Ciornă" && U().renderInfoNote?.("<strong>Ciornă.</strong> Rolurile îl văd după prima publicare; o ciornă se poate elimina."),
      d.status === "Publicat" && unpublished(d) && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Rolurile văd în continuare versiunea ${esc(String(lastVersion(d).version))}.`),
      !me.central && d.level === "Global" && isOffFor(d, me.authority) && U().renderNotice?.("warning", `<strong>Dezactivat pentru ${esc(mine)}.</strong> Tabloul de bord global nu apare rolurilor din ${esc(mine)}.`),
      !me.central && d.level === "Global" && P.tab === "configurare" && U().renderInfoNote?.(`Tablou de bord global, creat de Administratorul central: îl vezi doar pentru citire. Îl poți clona la nivelul ${esc(mine)} sau îl poți dezactiva pentru ${esc(mine)}.`),
      me.central && d.level !== "Global" && P.tab === "configurare" && U().renderInfoNote?.(`Tablou de bord specific ${esc(authName(d.authority))}: îl configurează utilizatorii autorității; tu îl vezi doar pentru citire.`)
    ];
    const html = list.filter(Boolean).join("");
    return html ? `<div class="e-permits-reg-notices">${html}</div>` : "";
  }
  function configTab(d) {
    if (!editable(d)) {
      return `
        <div class="e-permits-dsh-config e-permits-dsh-wide">
          ${readBlocks(d.config, d.level)}
          ${section("Widget-uri", layoutHtml(d.config, d), { meta: `${d.config.widgets.length}/${MAX_WIDGETS}`, card: false, cls: "e-permits-dsh-layout" })}
        </div>`;
    }
    const v = P.draft;
    const e = P.errors;
    return `<div class="e-permits-dsh-config e-permits-dsh-wide">${stepGeneral(v, e, idpNow())}${stepAccess(v, e, idpNow(), d)}${stepWidgets(v, e, idpNow(), d)}</div>`;
  }
  const reheader = () => { const els = A().els || {}; if (!creating() && els.dosarProfilTitleRow && P.id) els.dosarProfilTitleRow.innerHTML = headerTop(dashOf(P.id)); };

  /* ================================================================ CREATE SHEET (US-410 · US-545) — the widget create sheet */
  const STEPS = ["Date generale", "Roluri și autorități", "Widget-uri", "Revizuire"];
  let sheet = null;
  const creating = () => Boolean(P.isNew && sheet && !sheet.hidden);
  const inSheet = (el) => creating() && sheet.contains(el);
  function ensureSheet() {
    if (sheet) return sheet;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor e-permits-reg-editor--page e-permits-dsh-editor" data-dsh-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true" data-dsh-ed-close></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-labelledby="dsh-ed-title" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide" data-dsh-ed-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-dsh-ed-top></div></div>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-dsh-ed-steps></nav>
          <div class="e-permits-reg-editor__body" data-dsh-ed-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Pașii tabloului de bord" data-dsh-ed-bar></div>
        </div>
      </div>`);
    sheet = document.querySelector("[data-dsh-editor]");
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !creating()) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (sheet.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      closeCreate();
    });
    return sheet;
  }
  const sheetScroller = () => sheet?.querySelector("[data-dsh-ed-scroll]");
  function stepReview(v) {
    const goto = (n) => `<button class="btn btn-text-neutral btn-sm" type="button" data-dsh-goto="${n}">${icon("edit", 16)}<span>Editează</span></button>`;
    const problems = publishProblems(v);
    return `
      <div class="e-permits-reg-notices">${problems.length
        ? U().renderNotice?.("warning", `<strong>Tabloul de bord se poate salva ca ciornă, dar nu se poate publica încă.</strong> ${problems.map(esc).join(" ")}`) || ""
        : U().renderInfoNote?.("<strong>Tabloul de bord este complet.</strong> Se poate publica.") || ""}</div>
      ${readBlocks(v, levelNow(), { goto })}
      ${section("Widget-uri", layoutHtml(v, null), { meta: `${v.widgets.length}/${MAX_WIDGETS}`, tools: goto(3), card: false, cls: "e-permits-dsh-layout" })}
      ${U().renderInfoNote?.(`Tabloul de bord se salvează la nivelul <strong>${esc(levelNow() === "Global" ? "Global" : `Autoritate ${authName(who().authority)}`)}</strong>, în statutul Ciornă. Rolurile văd doar ultima versiune publicată.`) || ""}`;
  }
  function renderCreate({ keep = "" } = {}) {
    if (!P.isNew || !sheet || !P.draft) return;
    const active = document.activeElement;
    const keepSel = keep || (active && sheet.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = sheetScroller()?.scrollTop || 0;
    const v = P.draft;
    const e = P.errors;
    const lvl = levelNow() === "Global" ? "Global" : `Autoritate ${authName(who().authority)}`;
    sheet.querySelector("[data-dsh-ed-top]").innerHTML = window.GEAPPageHeader?.top({
      title: P.from ? "Clonează tabloul de bord" : "Tablou de bord nou",
      titleId: "dsh-ed-title",
      caption: P.from ? `Copie a ${P.from} · nivel ${lvl} · primește un ID nou la salvare` : `Nivel ${lvl} · ID-ul se generează la prima salvare`
    }) || `<h1 class="e-permits-page-header__title" id="dsh-ed-title">${P.from ? "Clonează tabloul de bord" : "Tablou de bord nou"}</h1>`;
    sheet.querySelector("[data-dsh-ed-steps]").innerHTML = A().renderStepStrip?.(STEPS, P, "data-dsh-goto") || "";
    const form = [() => stepGeneral(v, e, idpNow()), () => stepAccess(v, e, idpNow(), null), () => stepWidgets(v, e, idpNow(), null), () => stepReview(v)][P.step - 1]();
    sheet.querySelector("[data-dsh-ed-body]").innerHTML = `
      <div class="e-permits-reg-editor__single e-permits-reg-editor__page" data-dsh-ed-scroll>
        ${P.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
        <div class="e-permits-dsh-config${P.step === 3 || P.step === 4 ? "" : " e-permits-dsh-config--form"}">${form}</div>
      </div>`;
    syncMixed(sheet);
    sheet.querySelector("[data-dsh-ed-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${esc(`Pasul ${P.step} din ${STEPS.length} · ${STEPS[P.step - 1]}`)}</p>
      <div class="e-permits-cfg2__bar-actions">
        ${P.step === 1 ? '<button class="btn btn-neutral btn-md" type="button" data-dsh-ed-close>Anulează</button>' : '<button class="btn btn-neutral btn-md" type="button" data-dsh-prev>Înapoi</button>'}
        <button class="btn btn-neutral btn-md" type="button" data-dsh-save>Salvează ciorna</button>
        ${P.step < STEPS.length ? '<button class="btn btn-primary btn-md" type="button" data-dsh-next>Continuă</button>' : '<button class="btn btn-primary btn-md" type="button" data-dsh-publish>Publică</button>'}
      </div>`;
    if (sheetScroller() && keep !== "@top") sheetScroller().scrollTop = scroll;
    if (keepSel && keepSel !== "@top") {
      const el = sheet.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function goStep(target) {
    if (target < 1 || target > STEPS.length) return;
    for (let s = P.step; s < target && s <= 3; s += 1) {
      const errors = validate(P.draft, { steps: [s] });
      if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return; }
    }
    P.errors = {};
    P.step = target;
    P.maxStep = Math.max(P.maxStep, target);
    renderCreate({ keep: "@top" });
    if (sheetScroller()) sheetScroller().scrollTop = 0;
    sheet.querySelector("[data-dsh-next], [data-dsh-publish]")?.focus({ preventScroll: true });
  }
  function hideSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove("is-reg-editor-open");
  }
  function closeCreate(force = false) {
    if (!creating()) return;
    const close = () => {
      const back = beforeCreate?.back;
      hideSheet();
      const prev = beforeCreate || {};
      delete prev.back;
      Object.assign(P, { id: null, isNew: false, from: "", draft: null, base: null, errors: {}, saveError: false, ...prev, step: 1, maxStep: 1 });
      if (P.id && !P.draft) P.isNew = false;
      beforeCreate = null;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
    if (force || !pageDirty()) { close(); return; }
    U().askConfirm?.({ title: P.from ? "Renunți la copia tabloului de bord?" : "Renunți la tabloul de bord nou?", text: "Datele completate nu se păstrează.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, close);
  }
  const rerender = (opts) => (creating() ? renderCreate(opts) : renderProfile(opts));

  /* ---- Versiuni (US-548): GEAPEventTimeline „Versiuni publicate”; an entry opens its version window */
  function versionsTab(d) {
    const cur = lastVersion(d);
    const list = [...d.versions].reverse();
    const n = d.versions.length;
    const compareBtn = n + (unpublished(d) ? 1 : 0) > 1 && !P.compare ? `<button class="btn btn-secondary btn-sm" type="button" data-dsh-compare-open>${icon("history", 16)}<span>Compară versiuni</span></button>` : "";
    const events = list.map((v) => ({ at: v.at, user: v.by, type: `Versiunea ${v.version}${v.nr === cur.nr ? " · curentă" : ""}${/^Restaurare/.test(v.type) ? ` · ${v.type.toLocaleLowerCase("ro")}` : ""}`, status: "Reușit", detail: v.note }));
    return `
      ${n ? U().renderInfoNote?.(`Rolurile văd doar ultima versiune publicată: <strong>${esc(String(cur.version))}</strong>. Fiecare publicare crește versiunea cu 1; restaurarea publică o versiune nouă cu configurația celei alese, iar versiunile anterioare rămân neschimbate.`) || "" : ""}
      ${window.GEAPEventTimeline?.html("Versiuni publicate", events, { meta: n ? plural(n, "versiune", "versiuni") : "", actionHtml: compareBtn, empty: "Tabloul de bord nu a fost publicat încă.", openAttrs: (item, i) => `data-dsh-ver-view="${list[i].nr}" aria-haspopup="dialog"` }) || ""}
      ${P.compare ? compareHtml(d) : ""}`;
  }
  const compareChoices = (d) => [...[...d.versions].reverse().map((v) => [String(v.nr), `Versiunea ${v.version} · ${longDate(v.at)}${v.nr === lastVersion(d).nr ? " (curentă)" : ""}`, v.config]), ...(unpublished(d) ? [["draft", "Modificările nepublicate", d.config]] : [])];
  const diffRows = (a, b, level) => CP().diffRows?.(a, b, (v) => flatRows(v, level)) || [];
  function compareHtml(d) {
    const choices = compareChoices(d);
    const pick = (key) => choices.find(([k]) => k === key) || choices[0];
    const [ka, , ca] = pick(P.compare.a);
    const [kb, , cb] = pick(P.compare.b);
    const opts = choices.map(([k, l]) => [k, l]);
    const changes = ka === kb ? [] : diffRows(ca, cb, d.level);
    return `
      <section class="e-permits-dosar-profil__section e-permits-wid-compare" aria-labelledby="dsh-compare-title">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="dsh-compare-title">Compară versiuni</h2>
          <div class="e-permits-passport__heading-tools"><button class="btn btn-neutral btn-sm" type="button" data-dsh-compare-close>Închide comparația</button></div>
        </div>
        <div class="e-permits-ntpl-card">${grid(
          selectField("dsh-cmp-a", 'data-dsh-cmp="a"', "Versiunea de bază", opts, ka),
          selectField("dsh-cmp-b", 'data-dsh-cmp="b"', "Comparată cu", opts, kb)
        )}</div>
        ${ka === kb ? U().renderInfoNote?.("Alege două versiuni diferite.") || "" : changes.length ? CP().changesList?.(changes) || "" : U().renderInfoNote?.("Cele două versiuni au aceeași configurație.") || ""}
      </section>`;
  }
  function historyTab(d) {
    const T = window.GEAPEventTimeline;
    const events = d.history.slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Respins" : "Reușit", ...(h.event === EVENTS.rejected ? { tone: "danger" } : {}), detail: h.detail || "", context: T?.contextOf?.(T.audit(journalEvent(h), journalCtx(d, h))) }));
    return T?.html("Jurnalul de audit", events, { meta: events.length ? "Cele mai noi primele · Jurnalizat prin MLog" : "", empty: "Pentru acest tablou de bord nu s-au înregistrat încă operații.", openAttrs: (item, i) => `data-dsh-event="${i}"` }) || "";
  }
  function openJournal(i) {
    const d = dashOf(P.id);
    const h = d?.history[Number(i)];
    if (!h) return;
    const record = window.GEAPEventTimeline.audit(journalEvent(h), journalCtx(d, h));
    A().openAuditEventDetail?.(record, { title: h.event, general: [["Denumirea evenimentului", esc(h.event)], ["Tablou de bord", esc(`${d.id} · ${nameOf(d)}`)]], changes: window.GEAPEventTimeline.changesOf(h) });
  }

  /* ---- version window · restore (the library dialog, js/config-publish.js bodies) */
  const versionOf = (d, nr) => d.versions.find((v) => String(v.nr) === String(nr)) || null;
  function openVersion(nr) {
    const d = dashOf(P.id);
    const v = versionOf(d, nr);
    if (!v) return;
    const isCurrent = v.nr === lastVersion(d).nr;
    G().openModal?.({
      kind: "dsh-version",
      title: `Versiunea ${v.version}${isCurrent ? " · curentă" : ""}`,
      subtitle: nameOf(d),
      body: `
        <div class="e-permits-dosar-profil__card">${[["Tipul modificării", esc(v.type)], ["Data", esc(`${longDate(v.at)}, ${time(v.at)}`)], ["Autor", esc(v.by)], ["Ce s-a schimbat", esc(v.note)]].map((r) => G().detailRow?.(r) || "").join("")}</div>
        ${readBlocks(v.config, d.level)}
        ${A().renderPassportBlock?.("Widget-uri", configRows(v.config, d.level).widgets) || ""}`,
      footer: `<div class="modal-buttons">${isCurrent ? "" : `<button class="btn btn-neutral btn-rounded" type="button" data-dsh-ver-compare="${v.nr}">Compară cu versiunea curentă</button>${canEdit(d) && d.status !== "Dezactivat" ? `<button class="btn btn-neutral btn-rounded" type="button" data-dsh-ver-restore="${v.nr}">${icon("rotate-arrow")}<span>Restaurează</span></button>` : ""}`}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
  }
  let restoring = null;
  function openRestore(nr) {
    const d = dashOf(P.id);
    const v = versionOf(d, nr);
    if (!d || !v || !canEdit(d)) return;
    restoring = { id: d.id, nr: v.nr };
    const next = (lastVersion(d)?.version || 0) + 1;
    G().openModal?.({
      kind: "dsh-restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: nameOf(d),
      body: CP().restoreBody?.({ from: v.version, next, lost: unpublished(d) || pageDirty(), changes: diffRows(lastVersion(d).config, v.config, d.level), noteId: "dsh-restore-note" }) || "",
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-dsh-restore-confirm>Restaurează</button></div>'
    });
  }
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#dsh-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { CP().setModalError?.(field, "Descrie ce s-a schimbat."); return; }
    const d = dashOf(restoring.id);
    const v = versionOf(d, restoring.nr);
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); restoring = null; return; }
    const next = lastVersion(d).version + 1;
    d.config = clone(v.config);
    d.versions.push({ nr: d.versions.length + 1, version: next, type: `Restaurare (din versiunea ${v.version})`, note, at: nowIso(), by: userName(), config: clone(v.config) });
    d.status = "Publicat";
    audit(d, "restore", `Versiunea ${v.version} → versiunea ${next} · ${note}`);
    demoteOthers(d);
    restoring = null;
    P.compare = null; P.draft = clone(d.config); P.base = clone(d.config);
    G().closeModal?.();
    renderProfile();
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată ca versiunea ${next}.`);
  }

  /* ---- publish (US-546) + the principal (US-550): a new principal demotes the previous one for that role only */
  function demoteOthers(d) {
    conflicts(d.config, d).forEach(({ role, other }) => {
      [other.config, lastVersion(other)?.config].filter(Boolean).forEach((c) => c.roles.forEach((r) => { if (r.role === role) r.type = "secundar"; }));
      audit(other, "demote", `Rolul ${roleName(role)} · prin publicarea ${d.id} „${nameOf(d)}”`, { by: "SIA GEAP", role: "Sistem" });
    });
  }
  let publishing = null;
  /* `id` = a list row's „Modificări nepublicate” (dsh-stack-list-v1); „Publică” there opens the dashboard first */
  function openPending(id = P.id) {
    const d = dashOf(id);
    const last = d && lastVersion(d);
    if (!last) return;
    const changes = diffRows(last.config, d.config, d.level).map((c) => ({ area: c.label, detail: `${c.before} → ${c.after}`, at: d.updatedAt || "", user: d.updatedBy || "", status: "Modificat" }));
    const publish = id === P.id ? () => openPublish() : () => openProfile(id, "configurare").then(() => openPublish());
    A().openPendingChanges?.({ subject: `${nameOf(d)} · față de versiunea ${last.version}`, changes, onPublish: canEdit(d) && d.status !== "Dezactivat" ? publish : null });
  }
  function openPublish() {
    if (!P.draft && !P.id) return;
    publishing = { id: P.id };
    const d = P.id ? dashOf(P.id) : null;
    const v = editable(d) ? P.draft : d.config;
    if (editable(d) && publishProblems(v, d).length) { P.errors = validate(v); rerender(); }
    renderPublish();
  }
  function renderPublish() {
    const d = publishing.id ? dashOf(publishing.id) : null;
    const v = editable(d) ? P.draft : d.config;
    const problems = publishProblems(v, d);
    const cur = d ? lastVersion(d) : null;
    const next = (cur?.version || 0) + 1;
    const changes = cur ? diffRows(cur.config, v, d.level) : [];
    const demotes = conflicts(v, d);
    const off = v.widgets.filter((t) => !widgetInfo(t.widget, d).active).map((t) => `„${widgetInfo(t.widget, d).title}”`);
    G().openModal?.({
      kind: "dsh-publish",
      title: "Publicare tablou de bord",
      subtitle: v.names.ro || "Tablou de bord nou",
      body: `
        ${CP().publishBody?.({ noun: "tabloul de bord", problems, current: cur?.version, next, changes, firstText: "Rolurile alese îl văd în BackOffice imediat după publicare.", noteId: "dsh-publish-note", placeholder: "De ex. am adăugat harta dosarelor depuse", extraHtml: [
          !problems.length && demotes.length ? U().renderInfoNote?.(demotes.map(({ role, other }) => `<strong>${esc(roleName(role))}:</strong> „${esc(nameOf(other))}” (${esc(other.id)}) devine secundar pentru acest rol; pentru celelalte roluri rămâne neschimbat.`).join(" ")) || "" : "",
          !problems.length && off.length ? U().renderNotice?.("warning", `<strong>${off.length === 1 ? "Un widget nu mai este publicat" : `${off.length} widget-uri nu mai sunt publicate`}:</strong> ${esc(off.join(", "))}. Nu apar pe tablou.`) || "" : ""
        ].join("") }) || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-dsh-publish-confirm${problems.length ? ' aria-disabled="true" data-tooltip-reason="Rezolvă mai întâi problemele de mai sus."' : ""}>Publică</button></div>`
    });
  }
  function confirmPublish(button) {
    if (!publishing) return;
    const d0 = publishing.id ? dashOf(publishing.id) : null;
    const v = editable(d0) ? P.draft : d0.config;
    if (button.getAttribute("aria-disabled") === "true") { if (d0) audit(d0, "rejected", publishProblems(v, d0).join(" ")); return; }
    const field = document.querySelector("#dsh-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { CP().setModalError?.(field, "Descrie ce s-a schimbat."); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); publishing = null; return; }
    const d = editable(d0) ? savePage({ silent: true }) : d0;
    if (!d) { G().closeModal?.(); return; }
    const next = (lastVersion(d)?.version || 0) + 1;
    d.versions.push({ nr: d.versions.length + 1, version: next, type: next === 1 ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: clone(d.config) });
    d.status = "Publicat";
    audit(d, "publish", `Versiunea ${next} · ${note}`);
    demoteOthers(d);
    publishing = null;
    G().closeModal?.();
    toast(`Versiunea ${next} a tabloului de bord „${nameOf(d)}” a fost publicată.`);
    openProfile(d.id, "configurare", { push: false });
    refreshList();
  }

  /* ---- save (US-410 „Salvează ciorna” · US-544 „Salvează”): the Romanian name + the order are the minimum of a draft */
  const ERROR_SEL = { "names.ro": "name-ro", order: "order", roles: "roles", authorities: "authorities", widgets: "layout-title" };
  const errorSel = (key) => `#${idpNow()}-${ERROR_SEL[key] || key}`;
  function showFirstError(errors) {
    const key = Object.keys(errors)[0];
    const keep = key === "authorities" ? `#fo-${idpNow()}-authorities` : key === "widgets" ? "[data-dsh-add]" : errorSel(key);
    if (creating()) { P.step = STEP_OF(key); P.maxStep = Math.max(P.maxStep, P.step); renderCreate({ keep }); }
    else renderProfile({ keep });
    (creating() ? sheet : document).querySelector(errorSel(key))?.closest(".e-permits-fo-field, .e-permits-dosar-profil__section")?.scrollIntoView({ block: "center" });
  }
  function savePage({ silent = false } = {}) {
    const errors = validate(P.draft, { steps: [1] });
    if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return null; }
    if (demo.has("eroare")) { P.saveError = true; rerender(); return null; }
    const me = who();
    let d = P.isNew ? null : dashOf(P.id);
    if (d) {
      const changed = changedFields();
      d.config = clone(P.draft);
      if (Object.keys(changed).length) audit(d, "edit", Object.entries(changed).map(([lbl, [a, b]]) => `${lbl}: ${a} → ${b}`).join(" · "));
    } else {
      const nums = [...all().map((x) => x.id), ...(D().removed || [])].map((x) => Number(String(x).split("-")[1]) || 0);
      const id = `DSH-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
      d = { id, level: me.central ? "Global" : "Autoritate", ...(me.central ? {} : { authority: me.authority }), status: "Ciornă", offFor: [], createdAt: nowIso(), createdBy: userName(), updatedAt: nowIso(), updatedBy: userName(), config: clone(P.draft), versions: [], history: [] };
      all().push(d);
      audit(d, P.from ? "clone" : "create", P.from ? `Din ${P.from} · ${levelText(d)}` : `Ciornă · ${levelText(d)}`);
    }
    const wasNew = P.isNew;
    Object.assign(P, { id: d.id, isNew: false, from: "", errors: {}, saveError: false, base: clone(P.draft), compare: null });
    if (wasNew) { hideSheet(); beforeCreate = null; }
    if (!silent) {
      if (wasNew) openProfile(d.id, "configurare");
      else { renderProfile({ keep: "[data-dsh-save]" }); A().writeHash?.(`#tablou/${d.id}/configurare`, { push: false }); }
      toast(wasNew ? `Ciorna tabloului de bord ${d.id} a fost salvată.` : "Modificările au fost salvate.");
      refreshList();
    }
    return d;
  }
  function discard() {
    const d = dashOf(P.id);
    if (!d) return;
    P.draft = clone(d.config); P.base = clone(d.config); P.errors = {}; P.saveError = false;
    renderProfile();
  }
  let changeSourceDone = false;
  const registerChangeSource = () => {
    if (changeSourceDone || !A().registerChangeSource) return;
    changeSourceDone = true;
    A().registerChangeSource("dsh-draft", () => {
      if (!P.draft || P.isNew) return null;
      return {
        name: P.draft.names.ro, applies: "se aplică după Salvează", emptyText: "Tabloul de bord este salvat.", groups: ["Configurare"],
        entries: () => Object.entries(changedFields()).map(([lbl, [a, b]]) => ({ undo: lbl, group: "Configurare", title: lbl, tag: ["Modificat", "brand"], detail: `${a} → ${b}` })),
        undo: () => discard(),
        /* changes-reveal-v1: „Vezi” → the Configurare tab, the section of that setting (a widget row → „Widget-uri”) */
        reveal: async (lbl) => {
          if (P.tab !== "configurare") await openProfile(P.id, "configurare", { push: false });
          const panel = document.querySelector("#dsh-panel");
          const alias = { "Ordinea tabloului de bord": "Ordinea în listă", Nivel: "Nivel și autorități", "Autorități asignate": "Nivel și autorități" }[lbl];
          return A().sectionOfLabel?.(panel, alias || lbl) || A().sectionOfLabel?.(panel, "Widget-uri");
        },
        discard,
        save: () => savePage()
      };
    });
  };
  let leaving = false;
  function guardLeave(event, proceed) {
    if (leaving || !profileOpen() || !pageDirty()) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    U().askConfirm?.({
      title: "Există modificări nesalvate. Părăsești tabloul de bord?",
      text: "Modificările nesalvate ale tabloului de bord se pierd.",
      confirmLabel: "Renunță",
      cancelLabel: "Continuă editarea",
      destructive: true
    }, () => { P.draft = null; P.isNew = false; leaving = true; try { proceed(); } finally { leaving = false; } });
    return true;
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest?.("[data-nav-item]");
    if (nav) { guardLeave(event, () => nav.click()); return; }
    const back = event.target.closest?.("[data-dsh-back]");
    if (back) guardLeave(event, () => closeProfile());
  }, true);
  window.addEventListener("beforeunload", (event) => { if ((profileOpen() || creating()) && pageDirty()) { event.preventDefault(); event.returnValue = ""; } });

  /* ================================================================ „Adaugă widget” — ONE at a time (dash-v3, user: „add one by one and
     arrange like the iPhone home screen”): the library dialog with search + the published widgets as the „Widget type
     card” radio cards (the chart-type gallery markup: glyph tile = type, title, „tip · nivel · lățime, înălțime”);
     „Adaugă” puts the chosen one at the end of the board at its default size, scrolls to it and flashes it */
  let picking = null;
  const pickRoot = () => document.querySelector("#case-action-modal.is-active [data-dsh-pick-list]");
  /* dsh-pick-preview-v1 (2026-11-11, user + Stripe „Add charts”): each option card shows a small preview of its type.
     Options grouped by what they show (the widget type families), one radio group across the groups. */
  const PICK_GROUPS = [
    ["Indicatori", ["tile"]],
    ["Comparații și evoluții", ["bars", "stacked", "line", "control"]],
    ["Distribuții", ["pie", "funnel", "treemap"]],
    ["Tabele", ["aggTable", "rowTable", "heatmap"]]
  ];
  const pickGroupOf = (type) => PICK_GROUPS.find(([, types]) => types.includes(type))?.[0] || "Alte widget-uri";
  /* dsh-pick-skeleton-v1 (user: „not real example — a skeleton in blue shades, not colours, no real data”): each option
     shows an ABSTRACT illustration of its chart TYPE — shapes only (no numbers, labels, legends or series colours), the
     brand-blue tint ramp (css/dashboard.css `.e-permits-dsh-sk__*`), rounded like the skeleton; one per type, same height */
  const SK = (body) => `<svg class="e-permits-dsh-sk" viewBox="0 0 240 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${body}</svg>`;
  const skRect = (x, y, w, h, c = 2, r = 4) => `<rect class="e-permits-dsh-sk__${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const SKELETONS = {
    tile: () => SK(`${skRect(16, 30, 120, 34, 3, 8)}${skRect(146, 38, 44, 18, 1, 9)}${skRect(16, 78, 150, 12, 1, 6)}`),
    bars: () => SK([0, 1, 2, 3, 4].map((i) => `${skRect(16, 12 + i * 21, 208, 11, 0, 5)}${skRect(16, 12 + i * 21, [150, 196, 110, 170, 70][i], 11, 2, 5)}`).join("")),
    stacked: () => SK([0, 1, 2, 3, 4].map((i) => { const w = [190, 160, 130, 100, 70][i]; return `${skRect(16, 12 + i * 21, w * 0.45, 11, 3, 5)}${skRect(16 + w * 0.45, 12 + i * 21, w * 0.3, 11, 2, 0)}${skRect(16 + w * 0.75, 12 + i * 21, w * 0.25, 11, 1, 5)}`; }).join("")),
    line: () => SK(`${skRect(16, 104, 208, 2, 1, 1)}<polyline class="e-permits-dsh-sk__line" points="16,84 50,70 84,76 118,48 152,56 186,30 224,38"/>`),
    control: () => SK(`${skRect(16, 30, 208, 2, 1, 1)}${skRect(16, 90, 208, 2, 1, 1)}<polyline class="e-permits-dsh-sk__line" points="16,64 50,52 84,70 118,46 152,60 186,40 224,58"/>`),
    pie: () => SK(`<circle class="e-permits-dsh-sk__ring1" cx="70" cy="60" r="38"/><circle class="e-permits-dsh-sk__ring3" cx="70" cy="60" r="38" pathLength="100" stroke-dasharray="45 55"/><circle class="e-permits-dsh-sk__ring2" cx="70" cy="60" r="38" pathLength="100" stroke-dasharray="25 75" stroke-dashoffset="-45"/>${[0, 1, 2, 3].map((i) => skRect(130, 30 + i * 18, [80, 64, 72, 50][i], 9, 1, 4)).join("")}`),
    funnel: () => SK([0, 1, 2, 3].map((i) => { const w = [208, 160, 112, 72][i]; return skRect(120 - w / 2, 12 + i * 26, w, 18, i === 0 ? 3 : 2, 5); }).join("")),
    treemap: () => SK(`${skRect(16, 12, 104, 96, 3, 6)}${skRect(124, 12, 100, 54, 2, 6)}${skRect(124, 70, 56, 38, 1, 6)}${skRect(184, 70, 40, 38, 2, 6)}`),
    heatmap: () => SK([0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5].map((c) => skRect(16 + c * 35, 12 + r * 25, 31, 21, (r * 7 + c * 3) % 4, 4)).join("")).join("")),
    aggTable: () => SK(`${skRect(16, 12, 208, 14, 1, 4)}${[0, 1, 2, 3].map((i) => `${skRect(16, 36 + i * 20, 90, 9, 2, 4)}${skRect(150, 36 + i * 20, 30, 9, 1, 4)}${skRect(194, 36 + i * 20, 30, 9, 1, 4)}`).join("")}`),
    rowTable: () => SK(`${skRect(16, 12, 208, 14, 1, 4)}${[0, 1, 2, 3].map((i) => `${skRect(16, 36 + i * 20, 60, 9, 2, 4)}${skRect(88, 36 + i * 20, 36, 9, 1, 4)}${skRect(136, 36 + i * 20, 88, 9, 1, 4)}`).join("")}`)
  };
  const pickPreview = (cfg) => `<span class="e-permits-dsh-pick-card__preview" aria-hidden="true">${(SKELETONS[cfg.type] || SKELETONS.bars)()}</span>`;
  function pickListHtml() {
    const v = P.draft;
    const d = P.id ? dashOf(P.id) : null;
    const q = fold(picking.query.trim());
    const items = pickable(levelNow(), d?.authority || who().authority).filter((w) => !q || fold(`${w.id} ${w.config.titles.ro} ${W().typeLabel?.(w.config.type) || ""}`).includes(q));
    if (!items.length) return E()?.render({ title: q ? NO_MATCH : "Niciun widget publicat", text: q ? "Caută după denumire, ID sau tip." : "Publică mai întâi widget-uri în Administrare › Widgete.", icon: q ? "search" : "chart", compact: true, bare: true }) || "";
    const option = (w) => {
      const cfg = W().published(w.id);
      const on = v.widgets.some((t) => t.widget === w.id);
      const chosen = picking.sel === w.id;
      const desc = on ? "Este deja pe tablou." : `${W().typeLabel?.(cfg.type) || ""} · ${W().levelText?.(w) || w.level} · ${SPAN[cfg.width] || 6}/12${cfg.type === "tile" ? "" : `, ${(label(HEIGHTS(), heightKey(cfg.height)) || "Compactă").toLocaleLowerCase("ro")}`}`;
      return `
        <label class="e-permits-fo-delivery-option e-permits-fo-delivery-option--radio e-permits-dsh-pick-card${chosen ? " is-selected" : ""}${on ? " is-disabled" : ""}">
          <input class="e-permits-fo-delivery-option__input" type="radio" name="dsh-pick" value="${esc(w.id)}"${chosen ? " checked" : ""}${on ? " disabled" : ""} aria-describedby="dsh-pick-${w.id}-desc" data-dsh-pick>
          <span class="e-permits-fo-delivery-option__copy e-permits-dsh-pick-card__copy">
            <span class="e-permits-fo-delivery-option__title" data-cell-tooltip="${esc(cfg.titles.ro)}">${esc(cfg.titles.ro)}</span>
            <span class="e-permits-fo-delivery-option__description" id="dsh-pick-${w.id}-desc">${esc(desc)}</span>
          </span>
          <span class="radio radio--small e-permits-fo-delivery-option__radio" aria-hidden="true"><span class="radio-custom"></span></span>
          ${pickPreview(cfg)}
        </label>`;
    };
    const groups = [...PICK_GROUPS.map(([name]) => name), "Alte widget-uri"].map((name) => [name, items.filter((w) => pickGroupOf(W().published(w.id)?.type) === name)]).filter(([, list]) => list.length);
    return `<fieldset class="e-permits-wid-types e-permits-dsh-pick"><legend class="u-visually-hidden">Widget-uri publicate</legend>${groups.map(([name, list], i) => `
      <section class="e-permits-dsh-pick__group" aria-labelledby="dsh-pick-group-${i}">
        <h3 class="e-permits-dsh-pick__heading" id="dsh-pick-group-${i}">${esc(name)}</h3>
        <div class="e-permits-dsh-pick__grid">${list.map(option).join("")}</div>
      </section>`).join("")}</fieldset>`;
  }
  function openPicker() {
    if (!P.draft || P.draft.widgets.length >= MAX_WIDGETS) return;
    picking = { sel: "", query: "" };
    G().openModal?.({
      kind: "dsh-pick",
      title: "Adaugă un widget",
      subtitle: `Doar widget-urile publicate · ${P.draft.widgets.length} din ${MAX_WIDGETS} pe tablou`,
      body: `
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill">
          <span class="icon-search" aria-hidden="true">${icon("search")}</span>
          <input class="input" type="search" placeholder="Caută după denumire, ID sau tip" aria-label="Caută widget-uri" autocomplete="off" id="dsh-pick-search" data-dsh-pick-search>
          <div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button></div>
        </div>
        <div class="e-permits-dsh-pick-list" data-dsh-pick-list>${pickListHtml()}</div>`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-dsh-pick-confirm aria-disabled="true" data-tooltip-reason="Alege un widget.">Adaugă</button></div>'
    });
    document.querySelector("#case-action-modal .modal")?.classList.replace("modal--md", "modal--lg");
    requestAnimationFrame(() => document.querySelector("#dsh-pick-search")?.focus());
  }
  function syncPicker() {
    const root = pickRoot();
    if (!root || !picking) return;
    const top = root.scrollTop;
    root.innerHTML = pickListHtml();
    root.scrollTop = top;
    const ok = document.querySelector("[data-dsh-pick-confirm]");
    if (picking.sel) { ok.removeAttribute("aria-disabled"); ok.removeAttribute("data-tooltip-reason"); } else { ok.setAttribute("aria-disabled", "true"); ok.setAttribute("data-tooltip-reason", "Alege un widget."); }
  }
  function confirmPicker() {
    if (!picking?.sel) return;
    const id = picking.sel;
    /* it starts from its own default width and height (Feature assumption, Feature 96501) */
    const cfg = W().published(id);
    P.draft.widgets.push({ widget: id, width: SPAN[cfg?.width] ? cfg.width : "half", height: cfg?.type === "tile" ? ROWS.stat : rowsOfHeight(cfg?.height) });
    picking = null;
    delete P.errors.widgets;
    G().closeModal?.();
    rerender();
    reheader();
    flashTile(id, { scroll: true });
    live(`„${widgetInfo(id).title}” a fost adăugat la sfârșitul tabloului, pe poziția ${P.draft.widgets.length}.`);
  }
  const live = (text) => { const el = (creating() ? sheet : document).querySelector("[data-dsh-live]"); if (el) el.textContent = text; };
  const tileEl = (id) => (creating() ? sheet : document).querySelector(`[data-dsh-tile="${CSS.escape(id)}"]`);
  /* the just-added / just-moved widget: scrolls into view, takes the focus and flashes the focus ring */
  function flashTile(id, { scroll = false } = {}) {
    requestAnimationFrame(() => {
      const el = tileEl(id);
      if (!el) return;
      if (scroll) el.scrollIntoView({ block: "center", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
      el.classList.add("is-flash");
      if (!demo.has("hold")) window.setTimeout(() => el.classList.remove("is-flash"), 1800);
    });
  }

  /* ================================================================ events */
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  const inPage = (el) => { if (inSheet(el)) return Boolean(P.draft); const root = profileRoot(); return Boolean(root && root.contains(el) && P.draft && editable()); };
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* „Vezi tot” on a card that keeps only the rows that fit its height: the whole widget in the dialog */
    const seeAll = t.closest("[data-dsh-tile] [data-wid-all]");
    if (seeAll) { const info = widgetInfo(seeAll.closest("[data-dsh-tile]").dataset.dshTile, P.id ? dashOf(P.id) : null); if (info.cfg) W().openFull?.(info.cfg, { subtitle: "Toate datele widget-ului" }); return; }
    /* list */
    const pendRow = t.closest("[data-dsh-pending-row]");
    if (pendRow) { event.stopPropagation(); openPending(pendRow.dataset.dshPendingRow); return; }
    if (t.closest('[data-workplace-add-product="dsh-new"], [data-dsh-new]')) { event.preventDefault(); openNew(); return; }
    const rowEdit = t.closest("[data-dsh-row-edit]");
    if (rowEdit) { openProfile(rowEdit.dataset.dshRowEdit, "configurare"); return; }
    const rowClone = t.closest("[data-dsh-row-clone]");
    if (rowClone) { openNew({ from: rowClone.dataset.dshRowClone }); return; }
    const rowToggle = t.closest("[data-dsh-row-toggle]");
    if (rowToggle) { const d = dashOf(rowToggle.dataset.dshRowToggle); if (d) setStatus(d, d.status === "Dezactivat", refreshList); return; }
    const rowAuth = t.closest("[data-dsh-row-auth]");
    if (rowAuth) { const d = dashOf(rowAuth.dataset.dshRowAuth); if (d) setAuthActive(d, isOffFor(d, who().authority), refreshList); return; }
    const rowRemove = t.closest("[data-dsh-row-remove]");
    if (rowRemove) { const d = dashOf(rowRemove.dataset.dshRowRemove); if (d) removeDraft(d, refreshList); return; }
    /* dialogs */
    const pub = t.closest("[data-dsh-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    if (t.closest("[data-dsh-restore-confirm]")) { confirmRestore(); return; }
    if (t.closest("[data-dsh-pick-confirm]")) { confirmPicker(); return; }
    const vcmp = t.closest("[data-dsh-ver-compare]");
    if (vcmp) { const d = dashOf(P.id); G().closeModal?.(); P.compare = { a: vcmp.dataset.dshVerCompare, b: String(lastVersion(d).nr) }; renderProfile(); document.querySelector("#dsh-compare-title")?.scrollIntoView({ block: "start" }); return; }
    const vrs = t.closest("[data-dsh-ver-restore]");
    if (vrs) { openRestore(vrs.dataset.dshVerRestore); return; }
    if (inSheet(t)) {
      if (t.closest("[data-dsh-ed-close]")) { event.preventDefault(); closeCreate(); return; }
      if (t.closest("[data-dsh-prev]")) { goStep(P.step - 1); return; }
      if (t.closest("[data-dsh-next]")) { goStep(P.step + 1); return; }
      const g = t.closest("[data-dsh-goto]");
      if (g) { goStep(Number(g.dataset.dshGoto)); return; }
      if (t.closest("[data-dsh-save]")) { savePage(); return; }
      if (t.closest("[data-dsh-publish]")) { openPublish(); return; }
    } else {
      if (t.closest("[data-dsh-pending]")) { openPending(); return; }
      const root = profileRoot();
      if (!root || !root.contains(t)) return;
      const tab = t.closest("[data-dsh-tab]");
      if (tab) { P.tab = tab.dataset.dshTab; renderProfile({ keep: `#dsh-tab-${P.tab}` }); if (P.id) A().writeHash?.(`#tablou/${P.id}/${P.tab}`, { push: false }); return; }
      const sv = t.closest("[data-dsh-save]");
      if (sv) { if (sv.getAttribute("aria-disabled") !== "true") savePage(); return; }
      if (t.closest("[data-dsh-publish]")) { openPublish(); return; }
      if (t.closest("[data-dsh-clone]")) { openNew({ from: P.id }); return; }
      if (t.closest("[data-dsh-toggle]")) { const d = dashOf(P.id); setStatus(d, d.status === "Dezactivat", () => { P.draft = clone(d.config); P.base = clone(d.config); renderProfile(); refreshList(); }); return; }
      if (t.closest("[data-dsh-auth]")) { const d = dashOf(P.id); setAuthActive(d, isOffFor(d, who().authority), () => { renderProfile(); refreshList(); }); return; }
      if (t.closest("[data-dsh-remove-draft]")) { const d = dashOf(P.id); removeDraft(d, () => { P.draft = null; closeProfile(); }); return; }
      const view = t.closest("[data-dsh-ver-view]");
      if (view) { openVersion(view.dataset.dshVerView); return; }
      const ev = t.closest("[data-dsh-event]");
      if (ev) { openJournal(ev.dataset.dshEvent); return; }
      if (t.closest("[data-dsh-compare-open]")) {
        const d = dashOf(P.id);
        const ch = compareChoices(d);
        P.compare = unpublished(d) ? { a: String(lastVersion(d).nr), b: "draft" } : { a: ch[1]?.[0] || ch[0][0], b: ch[0][0] };
        renderProfile({ keep: "#dsh-cmp-a" });
        return;
      }
      if (t.closest("[data-dsh-compare-close]")) { P.compare = null; renderProfile({ keep: "[data-dsh-compare-open]" }); return; }
      if (t.closest("[data-dsh-back]")) { event.preventDefault(); closeProfile(); return; }
    }
    if (!inPage(t)) return;
    /* the form */
    const v = P.draft;
    const addRole = t.closest("[data-dsh-role-add]");
    if (addRole) { v.roles.push({ role: addRole.dataset.dshRoleAdd, type: "secundar" }); delete P.errors.roles; rerender({ keep: `#${idpNow()}-type-${addRole.dataset.dshRoleAdd}-secundar` }); reheader(); return; }
    const rmRole = t.closest("[data-dsh-role-remove]");
    if (rmRole) { v.roles = v.roles.filter((r) => r.role !== rmRole.dataset.dshRoleRemove); rerender({ keep: `#${idpNow()}-roles` }); reheader(); return; }
    const typ = t.closest("[data-dsh-role-type]");
    if (typ) {
      const [role, type] = typ.dataset.dshRoleType.split("|");
      const r = v.roles.find((x) => x.role === role);
      if (r && r.type !== type) { r.type = type; rerender({ keep: `#${idpNow()}-type-${role}-${type}` }); reheader(); }
      return;
    }
    const add = t.closest("[data-dsh-add]");
    if (add) { if (add.getAttribute("aria-disabled") !== "true") openPicker(); return; }
    const mv = t.closest("[data-dsh-move]");
    if (mv) { const [id, by] = mv.dataset.dshMove.split("|"); moveWidget(id, Number(by), { viaButton: true }); return; }
    const rm = t.closest("[data-dsh-remove]");
    if (rm) removeWidget(rm.dataset.dshRemove);
  });
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-dsh-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const i = TABS.findIndex(([id]) => id === tab.dataset.dshTab);
    const next = TABS[(i + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    event.preventDefault();
    P.tab = next;
    renderProfile({ keep: `#dsh-tab-${next}` });
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.closest) return;
    if (el.matches("[data-dsh-pick-search]") && picking) { picking.query = el.value; syncPicker(); return; }
    if (!inPage(el)) return;
    const field = el.closest("[data-dsh-field]");
    if (!field || field.tagName === "SELECT" || field.type === "checkbox") return;
    setPath(P.draft, field.dataset.dshField, field.value);
    const count = document.querySelector(`[data-dsh-count="${field.id}"]`);
    if (count) { const max = field.tagName === "TEXTAREA" ? TEXT_MAX : NAME_MAX; count.textContent = `${field.value.length}/${max}`; count.classList.toggle("is-over", field.value.length > max); }
    reheader();
  });
  /* dsh-auth-ms-v1: the multi-select reports every tick / chip × — model only (the menu stays open) */
  document.addEventListener("fo-multiselect-change", (event) => {
    const host = event.target.closest?.("[data-dsh-auth-ms]");
    if (!host || !P.draft || !inPage(host)) return;
    const byLabel = new Map(AUTHORITIES.map(([id, s, l]) => [`${s} · ${l}`, id]));
    P.draft.allAuthorities = !!event.detail?.all;
    P.draft.authorities = event.detail?.all ? [] : (event.detail?.values || []).map((x) => byLabel.get(x)).filter(Boolean);
    if (P.errors.authorities && (P.draft.allAuthorities || P.draft.authorities.length)) {
      delete P.errors.authorities;
      host.querySelector(".e-permits-fo-subgen-select.is-error")?.classList.remove("is-error");
      host.querySelector(".e-permits-fo-field__error")?.remove();
    }
    reheader();
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest) return;
    if (el.matches("[data-dsh-pick]") && picking) { picking.sel = el.value; syncPicker(); document.querySelector(`[data-dsh-pick][value="${CSS.escape(el.value)}"]`)?.focus(); return; }
    if (el.matches("[data-dsh-cmp]")) { P.compare = { ...P.compare, [el.dataset.dshCmp]: el.value }; renderProfile({ keep: `#dsh-cmp-${el.dataset.dshCmp}` }); return; }
    if (!inPage(el)) return;
    const v = P.draft;
  });

  /* ================================================================ arranging: FLIP reflow, drag (handle), resize (corner), keyboard */
  const reduced = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const gridEl = () => (creating() ? sheet : document).querySelector("[data-dsh-grid].is-editing");
  /* FLIP: the tiles that change place slide from where they were (motion token, standard easing) */
  function flipTiles(grid, mutate, skip = null) {
    if (!grid) { mutate(); return; }
    const z = zoomOf(grid);
    const key = (t) => t.dataset.dshTile || "ghost";
    const before = new Map([...grid.querySelectorAll(":scope > [data-dsh-tile], :scope > .e-permits-dsh-ghost")].map((t) => [key(t), t.getBoundingClientRect()]));
    mutate();
    if (reduced()) return;
    const after = gridEl() || grid;
    after.querySelectorAll(":scope > [data-dsh-tile], :scope > .e-permits-dsh-ghost").forEach((t) => {
      if (t === skip || !before.has(key(t))) return;
      const b = before.get(key(t));
      const n = t.getBoundingClientRect();
      const dx = (b.left - n.left) / z;
      const dy = (b.top - n.top) / z;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      t.classList.remove("is-settling");
      t.style.setProperty("--dsh-fx", `${dx}px`);
      t.style.setProperty("--dsh-fy", `${dy}px`);
      t.classList.add("is-flipping");
      t.getBoundingClientRect();
      requestAnimationFrame(() => {
        t.classList.remove("is-flipping");
        t.classList.add("is-settling");
        t.style.removeProperty("--dsh-fx");
        t.style.removeProperty("--dsh-fy");
        t.addEventListener("transitionend", () => t.classList.remove("is-settling"), { once: true });
      });
    });
  }
  /* a model change on the board, redrawn with the FLIP reflow; focus stays on the widget */
  function arrange(change, { focus = "", say = "" } = {}) {
    flipTiles(gridEl(), () => { change(); rerender({ keep: focus ? `[data-dsh-tile="${CSS.escape(focus)}"]` : "" }); });
    reheader();
    if (say) live(typeof say === "function" ? say() : say);
  }
  function moveWidget(id, by, { viaButton = false } = {}) {
    const list = P.draft.widgets;
    const i = list.findIndex((t) => t.widget === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= list.length) return;
    arrange(() => { [list[i], list[j]] = [list[j], list[i]]; }, { focus: id, say: `„${widgetInfo(id).title}” este acum pe poziția ${j + 1} din ${list.length}.` });
    if (viaButton) { const end = j === 0 || j === list.length - 1; tileEl(id)?.querySelector(`[data-dsh-move="${id}|${end ? -by : by}"]`)?.focus({ preventScroll: true }); }
  }
  function resizeWidget(id, axis, by) {
    const t = P.draft.widgets.find((x) => x.widget === id);
    if (!t) return;
    /* Shift + ↑ / ↓ = one row unit less / more (8 … 20) */
    if (axis === "height") {
      const n = rowsOf(t) + by;
      if (n < minOf(id) || n > ROWS.max) { live("Înălțimea este deja la limită."); return; }
      arrange(() => { t.height = n; }, { focus: id, say: () => `„${widgetInfo(id).title}”: ${sizeText(t)}.` });
      return;
    }
    const keys = WIDTH_KEYS;
    const k = keys.indexOf(t[axis]) + by;
    if (k < 0 || k >= keys.length) { live(axis === "width" ? "Lățimea este deja la limită." : "Înălțimea este deja la limită."); return; }
    arrange(() => { t[axis] = keys[k]; }, { focus: id, say: () => `„${widgetInfo(id).title}”: ${sizeText(t)}.` });
  }
  function removeWidget(id) {
    const v = P.draft;
    const i = v.widgets.findIndex((x) => x.widget === id);
    if (i < 0) return;
    const next = v.widgets[i + 1] || v.widgets[i - 1];
    arrange(() => { v.widgets.splice(i, 1); }, { focus: next?.widget || "", say: `„${widgetInfo(id).title}” a fost eliminat de pe tablou.` });
    if (!next) (creating() ? sheet : document).querySelector("[data-dsh-add]")?.focus({ preventScroll: true });
  }
  /* keyboard: the focused widget — ← ↑ / → ↓ move it; Shift + ← → = width, Shift + ↑ ↓ = height */
  document.addEventListener("keydown", (event) => {
    const tile = event.target.matches?.("[data-dsh-tile].is-editable") ? event.target : null;
    if (!tile || !inPage(tile) || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const id = tile.dataset.dshTile;
    if (event.shiftKey) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") resizeWidget(id, "width", event.key === "ArrowRight" ? 1 : -1);
      else resizeWidget(id, "height", event.key === "ArrowDown" ? 1 : -1);
    } else moveWidget(id, event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
  });

  /* pointer: the handle lifts the card (it follows the pointer, the others reflow around the grey slot it leaves); the
     corner resizes, snapping to 4 · 6 · 8 · 12 columns and Compactă · Înaltă (live label, target columns lit): the card
     heights are the grid rows (one row / two rows + the gap), read from the grid */
  let act = null;
  const tilesOf = (grid) => [...grid.querySelectorAll(":scope > [data-dsh-tile]")];
  function startArrange(tile, kind, x, y) {
    const grid = tile.closest("[data-dsh-grid]");
    const r = tile.getBoundingClientRect();
    const t = P.draft.widgets.find((w) => w.widget === tile.dataset.dshTile);
    const gs = getComputedStyle(grid);
    /* the row unit (phones have `auto` rows): measured from the token on a probe */
    const probe = grid.appendChild(Object.assign(document.createElement("div"), { className: "e-permits-dsh-row-probe" }));
    const unit = probe.offsetHeight || parseFloat(gs.gridAutoRows) || 31;
    probe.remove();
    const rowGap = parseFloat(gs.rowGap) || 0;
    act = { kind, tile, grid, id: tile.dataset.dshTile, offX: x - r.left, offY: y - r.top, z: zoomOf(tile), width: t.width, height: rowsOf(t), stat: isStat(t.widget), unit, rowGap };
    grid.classList.add("is-arranging");
    tile.classList.add(kind === "move" ? "is-lifted" : "is-resizing");
    if (kind === "move") {
      /* the drag ghost = a copy of the card + its controls in a fixed top layer on <body>: above the BO sidebar / top bar,
         never clipped by the canvas or the panel; the tile underneath keeps only its grey surface = the drop slot */
      const ghost = document.createElement("div");
      ghost.className = "e-permits-dsh-drag-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.innerHTML = [...tile.children].filter((c) => !c.matches(".e-permits-dsh-tile__size")).map((c) => c.outerHTML).join("").replace(/\sid="[^"]*"/g, "");
      ghost.style.setProperty("--dsh-gw", `${r.width}px`);
      ghost.style.setProperty("--dsh-gh", `${r.height}px`);
      document.body.appendChild(ghost);
      act.ghost = ghost;
      placeGhost(x, y);
    }
    if (kind === "resize") showTarget();
  }
  const placeGhost = (x, y) => { if (!act?.ghost) return; act.ghost.style.setProperty("--dsh-gx", `${x - act.offX}px`); act.ghost.style.setProperty("--dsh-gy", `${y - act.offY}px`); };
  /* auto-scroll while dragging near the top / bottom of the viewport (the panel / sheet scroller or the page) */
  const EDGE = 72;
  function scrollerOf(el) {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
    return document.scrollingElement || document.documentElement;
  }
  function autoScroll() {
    if (!act || act.kind !== "move" || !act.last) return;
    const { x, y } = act.last;
    const box = act.scroller === (document.scrollingElement || document.documentElement) ? { top: 0, bottom: window.innerHeight } : act.scroller.getBoundingClientRect();
    const top = Math.max(box.top, 0);
    const bottom = Math.min(box.bottom, window.innerHeight);
    const dy = y < top + EDGE ? -Math.ceil((top + EDGE - y) / 4) : y > bottom - EDGE ? Math.ceil((y - (bottom - EDGE)) / 4) : 0;
    if (dy) { act.scroller.scrollTop += dy; dragTo(x, y); }
    act.raf = requestAnimationFrame(autoScroll);
  }
  function showTarget() {
    const a = act;
    const g = a.grid.getBoundingClientRect();
    const gap = (parseFloat(getComputedStyle(a.grid).columnGap) || 0) * a.z;
    const colW = (g.width - 11 * gap) / 12;
    const span = SPAN[a.width];
    let start = Math.round((a.tile.getBoundingClientRect().left - g.left) / (colW + gap));
    if (start + span > 12) start = 0;
    a.grid.querySelectorAll(".e-permits-dsh-guides > span").forEach((s, i) => s.classList.toggle("is-target", i >= start && i < start + span));
    const lbl = a.tile.querySelector(".e-permits-dsh-tile__size");
    if (lbl) lbl.innerHTML = tag(sizeText(a), "brand");
  }
  function dragTo(x, y) {
    const a = act;
    const tiles = tilesOf(a.grid);
    const others = tiles.filter((t) => t !== a.tile);
    let idx = others.length;
    for (let i = 0; i < others.length; i += 1) {
      const r = others[i].getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) { idx = i; break; }
    }
    if (idx !== tiles.indexOf(a.tile)) {
      flipTiles(a.grid, () => { a.grid.insertBefore(a.tile, others[idx] || a.grid.querySelector(":scope > .e-permits-dsh-ghost")); }, a.tile);
    }
    a.last = { x, y };
    placeGhost(x, y);
    if (!a.raf) { a.scroller = scrollerOf(a.grid); a.raf = requestAnimationFrame(autoScroll); }
  }
  function resizeTo(x, y) {
    const a = act;
    const g = a.grid.getBoundingClientRect();
    const gap = (parseFloat(getComputedStyle(a.grid).columnGap) || 0) * a.z;
    const colW = (g.width - 11 * gap) / 12;
    const r = a.tile.getBoundingClientRect();
    const cols = (x - r.left + gap) / (colW + gap);
    const width = WIDTH_KEYS.reduce((best, k) => (Math.abs(SPAN[k] - cols) < Math.abs(SPAN[best] - cols) ? k : best), WIDTH_KEYS[0]);
    const h = y - r.top;
    /* snaps per row unit: N units = N × unit + (N − 1) × gap */
    const height = Math.min(ROWS.max, Math.max(a.stat ? ROWS.stat : ROWS.min, Math.round((h / a.z + a.rowGap) / (a.unit + a.rowGap))));
    if (width !== a.width) { a.tile.classList.remove(`e-permits-dsh-tile--${a.width}`); a.tile.classList.add(`e-permits-dsh-tile--${width}`); a.width = width; }
    setRows(a, height);
    showTarget();
  }
  /* the live height while resizing: the tile's row class; the card is re-rendered only when its own class flips
     (Compactă ⇄ Înaltă layout), otherwise fit() (ResizeObserver) re-fits the rows */
  function setRows(a, height) {
    if (height === a.height) return;
    const was = a.height >= ROWS.tallLayout ? "tall" : "compact";
    const now = height >= ROWS.tallLayout ? "tall" : "compact";
    a.tile.classList.replace(`e-permits-dsh-tile--r${a.height}`, `e-permits-dsh-tile--r${height}`);
    a.height = height;
    if (was !== now) {
      a.tile.classList.replace(`e-permits-dsh-tile--${was}`, `e-permits-dsh-tile--${now}`);
      const card = a.tile.querySelector(".e-permits-wid-card");
      if (card) card.outerHTML = tileBody({ widget: a.id, width: a.width, height }, P.id ? dashOf(P.id) : null);
    }
  }
  function endArrange(commit) {
    const a = act;
    act = null;
    if (!a) return;
    a.grid.classList.remove("is-arranging");
    a.tile.classList.remove("is-lifted", "is-resizing");
    a.ghost?.remove();
    if (a.raf) cancelAnimationFrame(a.raf);
    if (!commit) { rerender({ keep: `[data-dsh-tile="${CSS.escape(a.id)}"]` }); return; }
    if (a.kind === "move") {
      const order = tilesOf(a.grid).map((t) => t.dataset.dshTile);
      const before = P.draft.widgets.map((t) => t.widget).join("|");
      P.draft.widgets.sort((p, q) => order.indexOf(p.widget) - order.indexOf(q.widget));
      rerender({ keep: `[data-dsh-tile="${CSS.escape(a.id)}"]` });
      reheader();
      if (before !== order.join("|")) live(`„${widgetInfo(a.id).title}” este acum pe poziția ${order.indexOf(a.id) + 1} din ${order.length}.`);
    } else {
      const t = P.draft.widgets.find((w) => w.widget === a.id);
      const changed = t.width !== a.width || t.height !== a.height;
      t.width = a.width; t.height = a.height;
      rerender({ keep: `[data-dsh-tile="${CSS.escape(a.id)}"]` });
      reheader();
      if (changed) live(`„${widgetInfo(a.id).title}”: ${sizeText(t)}.`);
    }
  }
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isPhone()) return;
    const handle = event.target.closest?.("[data-dsh-handle]");
    const corner = event.target.closest?.("[data-dsh-resize]");
    const tile = (handle || corner)?.closest("[data-dsh-tile]");
    if (!tile || !inPage(tile)) return;
    event.preventDefault();
    tile.focus({ preventScroll: true });
    startArrange(tile, handle ? "move" : "resize", event.clientX, event.clientY);
  });
  document.addEventListener("pointermove", (event) => {
    if (!act) return;
    if (event.buttons === 0 && event.isTrusted) { endArrange(true); return; }
    if (act.kind === "move") dragTo(event.clientX, event.clientY); else resizeTo(event.clientX, event.clientY);
  });
  document.addEventListener("pointerup", () => { if (act) endArrange(true); });
  document.addEventListener("keydown", (event) => { if (act && event.key === "Escape") { event.preventDefault(); endArrange(false); } }, true);
  window.addEventListener("blur", () => { if (act) endArrange(true); });

  /* demo stills (js/demo-states.js): a drag in progress / a resize in progress, frozen */
  const demoArrange = {
    drag(id, to, dx = 40, dy = -24) {
      const tile = tileEl(id);
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      startArrange(tile, "move", r.left + 40, r.top + 20);
      const others = tilesOf(act.grid).filter((t) => t !== tile);
      act.grid.insertBefore(tile, others[to] || act.grid.querySelector(":scope > .e-permits-dsh-ghost"));
      const slot = tile.getBoundingClientRect();
      placeGhost(slot.left + 40 + dx, slot.top + 20 + dy);
    },
    resize(id, width, height) {
      const tile = tileEl(id);
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      startArrange(tile, "resize", r.right, r.bottom);
      if (width !== act.width) { tile.classList.remove(`e-permits-dsh-tile--${act.width}`); tile.classList.add(`e-permits-dsh-tile--${width}`); act.width = width; }
      setRows(act, act.stat ? rowsOfHeight(height, ROWS.stat) : rowsOfHeight(height));
      requestAnimationFrame(showTarget);
    },
    focus(id) { tileEl(id)?.focus(); },
    flash(id) { flashTile(id, { scroll: true }); }
  };

  /* ================================================================ THE BO PAGE „Tablou de bord” (dsh-view-v1, 2026-11-11)
     A BackOffice user (Specialist · Supervizor · Director — not an administrator) opens the published dashboards of his
     active role from the side menu („Locul de muncă › Tablou de bord”, nav id `tablou-de-bord`), read-only. Rules taken
     from Feature 96586 (AC + Assumptions) and Feature 96498 „Tablou de bord în BackOffice” (US-426 …):
       · the roles see the LAST PUBLISHED version; a dashboard deactivated (in general or for the authority) is not shown;
       · Principal first, then the others by „Ordinea tabloului de bord”; without a principal, all by the order;
       · the authority's principal wins over the global principal (the global one then shows as a secondary);
       · a deactivated / unpublished widget disappears from the dashboard;
       · each widget loads on its own; an error in one widget does not stop the others (96498 AC);
       · no dashboard for the role → the page is empty (96586) with the 96498 text, in the „tu” tone;
       · the data stay in the perimeter of the active role (96498: Director = the authority, Supervizor = the subdivision).
     Switcher = the library page-header tabs (the profile tabs precedent, components.md › Tabs; SRS FR 04.12 „filele
     active”), one tab per dashboard, hidden with one dashboard. Route `#tablou-de-bord[/<id>]`.
     PROPOSAL (the Features are silent): the Specialist's perimeter = his authority (the widget preview rule,
     js/widget-admin.js `perimeter()`); order ties → ID; the page is NOT the landing after login yet (96498 US-426 says it
     is — kept off so the existing landings stay); the common filters, „Actualizează”, the info button and the
     personalisation of 96498 (US-427 / 432 / 433) are not built. Demo switches ?tablou=gol · incarcare · widget-eroare. */
  const VIEW_NAV = "tablou-de-bord";
  const VIEW_TITLE = "Tablou de bord";
  /* Feature 96498 AC text, „tu” tone */
  const VIEW_EMPTY = "Nu ai acces la tablouri de bord.";
  const V = { id: "", failed: new Set(), seeded: new Set(), busy: new Set() };
  /* the active assignment: role + authority (the demo assignment ids start with the authority: „ansp-…”, „anta-…”) */
  const viewer = () => {
    const a = A().currentAssignment?.() || {};
    return { role: a.roleId || "", roleLabel: a.roleLabel || "", authority: a.authority || /^([a-z]+)-/.exec(a.id || "")?.[1] || "ansp", unit: a.instanceLabel || "" };
  };
  const pubRoles = (d) => lastVersion(d)?.config.roles || [];
  const isPrincipalFor = (d, role) => pubRoles(d).some((r) => r.role === role && r.type === "principal");
  /* the role's dashboards at its authority: [principal (if any), ...the others by order] */
  function roleBoards(role, authority) {
    const list = all().filter((d) => d.status === "Publicat" && lastVersion(d) && assignedTo(d, authority) && !isOffFor(d, authority) && pubRoles(d).some((r) => r.role === role));
    const principal = list.find((d) => d.level === "Autoritate" && isPrincipalFor(d, role)) || list.find((d) => d.level === "Global" && isPrincipalFor(d, role)) || null;
    const rest = list.filter((d) => d !== principal).sort((a, b) => (Number(lastVersion(a).config.order) || 999) - (Number(lastVersion(b).config.order) || 999) || a.id.localeCompare(b.id));
    return { principal, boards: principal ? [principal, ...rest] : rest };
  }
  /* the widgets as published: only the ones still published and not deactivated for the authority */
  const liveWidgets = (d, authority) => (lastVersion(d)?.config.widgets || []).map((t) => ({ t, w: W().get?.(t.widget), cfg: W().published?.(t.widget) }))
    .filter(({ w, cfg }) => w && cfg && w.status === "Publicat" && !W().isOffFor?.(w, authority));
  const viewPerimeter = (me) => (me.role === "supervisor" && me.unit ? `${me.unit}, ${authName(me.authority)}` : authName(me.authority));
  function viewTile(d, { t, cfg }, i, span = rowsOf(t)) {
    const key = `${d.id}|${t.widget}`;
    const title = cfg.titles?.ro || t.widget;
    const st = V.busy.has(key) || demo.has("incarcare") ? { refreshing: true }
      : V.failed.has(key) ? { bodyHtml: E()?.render({ title: "Datele nu s-au încărcat", text: "Celelalte widget-uri nu sunt afectate. Încearcă din nou.", icon: "warning-filled", compact: true, bare: true, actionHtml: `<button class="btn btn-secondary btn-sm" type="button" data-dsh-view-retry="${esc(key)}" aria-label="Reîncearcă: ${esc(title)}">${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>` }) || "" }
      : {};
    const card = W().card?.({ ...cfg, width: t.width, height: hOf(t) }, { compact: true, dash: true, st, ariaLabel: title }) || "";
    return `<div class="e-permits-dsh-tile e-permits-dsh-tile--${SPAN[t.width] ? t.width : "full"} e-permits-dsh-tile--${hOf(t)} e-permits-dsh-tile--r${span}${isStat(t.widget) ? " e-permits-dsh-tile--stat" : ""}" role="listitem" data-dsh-tile="${esc(t.widget)}" data-index="${i}">${card}</div>`;
  }
  function viewBody(d, me, principal) {
    const live = liveWidgets(d, me.authority);
    /* ?tablou=widget-eroare: the second widget of each dashboard fails once (Reîncearcă loads it) */
    if (demo.has("widget-eroare") && !V.seeded.has(d.id) && live[1]) { V.failed.add(`${d.id}|${live[1].t.widget}`); }
    V.seeded.add(d.id);
    const desc = String(lastVersion(d).config.descriptions?.ro || "").trim();
    const meta = [`Perimetru: ${viewPerimeter(me)}`, `Date calculate azi, la 06:00`].join(" · ");
    const grid = live.length
      ? `<div class="e-permits-dsh-stage"><div class="e-permits-dsh-grid" role="list" aria-label="Widget-urile tabloului de bord">${((spans) => live.map((x, i) => viewTile(d, x, i, spans[i])).join(""))(placedRows(live.map((x) => x.t)))}</div></div>`
      : E()?.render({ title: "Niciun widget", text: "Widget-urile acestui tablou de bord nu mai sunt publicate.", icon: "chart" }) || "";
    return `
      <section class="e-permits-dosar-profil__section e-permits-dsh-view e-permits-dsh-wide" id="dsh-view-panel"${V.tabs ? ` role="tabpanel" aria-labelledby="dsh-view-tab-${esc(d.id)}"` : ""} aria-busy="${demo.has("incarcare") ? "true" : "false"}" data-dsh-view="${esc(d.id)}">
        <div class="e-permits-dsh-view__head">
          <div class="e-permits-dsh-view__title-row">
            <h2 class="e-permits-dosar-profil__section-title">${esc(lastVersion(d).config.names.ro)}</h2>
            ${d === principal ? tag("Principal", "brand") : ""}
          </div>
          ${desc ? `<p class="e-permits-dsh-view__desc">${esc(desc)}</p>` : ""}
          <p class="e-permits-dosar-profil__section-meta">${esc(meta)}</p>
        </div>
        ${grid}
      </section>`;
  }
  async function showView(id = "", { push = false, focusTab = false } = {}) {
    A().setActiveNav?.(VIEW_NAV);
    if (!S.data) G().showPage?.(VIEW_TITLE, E()?.render({ title: "Se încarcă tabloul de bord…", loading: true }) || "");
    await load();
    await (W().load?.() || Promise.resolve());
    const me = viewer();
    const { principal, boards } = roleBoards(me.role, me.authority);
    if (!boards.length) {
      V.id = "";
      G().showPage?.(VIEW_TITLE, E()?.render({ title: VIEW_EMPTY, text: "Adresează-te administratorului autorității.", icon: "dot-grid" }) || VIEW_EMPTY);
      return;
    }
    const d = boards.find((x) => x.id === id) || boards[0];
    V.id = d.id;
    V.tabs = boards.length > 1;
    const tabs = V.tabs ? boards.map((x) => {
      const on = x === d;
      return `<button class="tab-button${on ? " active" : ""}" id="dsh-view-tab-${esc(x.id)}" type="button" role="tab" aria-selected="${on}" aria-controls="dsh-view-panel" tabindex="${on ? 0 : -1}" data-dsh-view-tab="${esc(x.id)}">${esc(lastVersion(x).config.names.ro)}</button>`;
    }).join("") : "";
    G().showPage?.(VIEW_TITLE, viewBody(d, me, principal), tabs);
    const list = document.querySelector("[data-reg-page] [data-reg-page-tabs]");
    if (list) list.setAttribute("aria-label", "Tablourile tale de bord");
    A().writeHash?.(d === boards[0] ? `#${VIEW_NAV}` : `#${VIEW_NAV}/${d.id}`, { push });
    if (focusTab) document.querySelector(`#dsh-view-tab-${CSS.escape(d.id)}`)?.focus();
  }
  const viewOpen = () => Boolean(V.id) && Boolean(document.querySelector("[data-reg-page]:not([hidden]) [data-dsh-view]"));
  function rerenderView() {
    const panel = document.querySelector("[data-reg-page]:not([hidden]) [data-dsh-view]");
    const d = dashOf(V.id);
    if (!panel || !d) return;
    const me = viewer();
    panel.outerHTML = viewBody(d, me, roleBoards(me.role, me.authority).principal);
  }
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    if (t.closest(`[data-nav-item][data-nav-id="${VIEW_NAV}"]`)) { showView("", { push: false }); return; }
    const tab = t.closest("[data-dsh-view-tab]");
    if (tab) { showView(tab.dataset.dshViewTab, { focusTab: true }); return; }
    const retry = t.closest("[data-dsh-view-retry]");
    if (retry) {
      const key = retry.dataset.dshViewRetry;
      V.failed.delete(key); V.busy.add(key); rerenderView();
      window.setTimeout(() => { V.busy.delete(key); if (viewOpen()) rerenderView(); }, 700);
      return;
    }
    /* drill-down on the BO page: the register behind the value (Feature 96498 US-430, not built here) */
    /* dsh-dosare-table-v1: a Dosare row opens that dosar (the copy value inside keeps its own click) */
    const dosar = !t.closest(".copy-value") && t.closest("[data-dsh-tile] [data-wid-open]");
    if (dosar) { toast(`Aici se deschide dosarul ${dosar.dataset.widOpen} (profilul dosarului din Dosare).`, "info"); return; }
    const drill = viewOpen() && t.closest("[data-dsh-view] [data-wid-drill]");
    if (drill) { toast(`Aici se deschid înregistrările „${drill.dataset.widDrill}” (${drill.dataset.widDrillValue}) din registrul sursă.`, "info"); }
  });
  /* ← / → / Home / End between the dashboard tabs */
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-dsh-view-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...tab.parentElement.querySelectorAll("[data-dsh-view-tab]")];
    const i = tabs.indexOf(tab);
    const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : tabs[(i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    event.preventDefault();
    next?.click();
  });

  /* ---------------------------------------------------------------- routes + denied (Feature AC) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Tablouri de bord” este disponibil utilizatorilor cu permisiunea „Gestionarea tablourilor de bord”.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    /* the BO page „Tablou de bord” (dsh-view-v1): #tablou-de-bord[/<id>] */
    const vm = /^#tablou-de-bord(?:\/([^/]+))?$/.exec(h);
    if (vm) { showView(decodeURIComponent(vm[1] || "")); return true; }
    if (h === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#tablou\/([^/]+)(?:\/([a-zA-Z0-9-]+))?$/.exec(h);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
    if (m[1] === "nou") {
      if (!creating()) { document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); openNew({ from: (m[2] || "").replace(/^din-/, "") }); }
      return true;
    }
    load().then(() => openProfile(decodeURIComponent(m[1]), m[2] || "configurare", { push: false }));
    return true;
  });
  let navQueued = false;
  const syncNav = () => {
    navQueued = false;
    const has = who().has;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${NAV}"]`).forEach((a) => { const li = a.closest("li") || a; if (li.hidden === has) li.hidden = !has; });
  };
  const boot = () => {
    load();
    new MutationObserver(() => { if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); } }).observe(document.body, { childList: true, subtree: true });
    syncNav();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for Feature 96498 (BO dashboard) + demo states */
  window.GEAPDashboards = {
    load, openProfile, openNew, refreshList, perms: () => who(), list: () => dashboards(), get: dashOf, state: () => P, demo: demoArrange,
    /* Feature AC: the roles see the last published version; order = principal first, then „Ordinea” */
    /* principal first (the authority's over the global one), then by „Ordinea” — the BO page „Tablou de bord” (dsh-view-v1) */
    forRole: (role, authority) => roleBoards(role, authority).boards,
    showView
  };
})();
