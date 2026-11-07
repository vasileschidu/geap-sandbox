/* =====================================================================================
   Administrare › KPI (kpi-v1, 2026-11-06) — Feature 96500 „Gestionarea KPI” (Epic 96497 Raportare și analiză).
   No child stories exist in Azure: built from the Feature text, split per the Traceability titles —
   US-399 creare · US-400 lista · US-401 editare · US-402 dezactivare / activare · US-519 moștenirea KPI-ului global +
   dezactivarea pentru autoritate · US-520 valorile proprii ale autorității · US-521 alertele + notificarea rolurilor.

   A KPI = a measure over ONE published data source: numerator (count / sum / average + filter), optional denominator
   (same source, filter only), reference date, value type, format, direction, target, approach threshold, setting
   criteria, responsible roles. Levels: Global (Administrator central, inherited by every authority) · Autoritate
   (created by an authority's KPI manager). An authority can switch an inherited KPI off for itself and give it own
   values (Autoritate / Subdiviziune / Rol); own values replace the global ones only there.

   No new engine — the jurnalizare / registre patterns:
     · list = the BO registry (`window.GEAPShellRegistries.kpi`, menu `shellView: "kpi-registry"`): level tabs, search,
       Filtre Domeniu · Sursa de date · Format · Stare, sort, pager, CSV, „Creează KPI”, ⋮ Editează · Clonează ·
       Activează / Dezactivează (· pentru autoritate);
     · profile = the shared profile panel: tabs Definiție · Ținta și responsabili · Valori proprii (Autorități for the
       central admin) · Alerte · Istoric; editable form = the BO form vocabulary in ntpl cards, read-only = passport blocks;
     · „Creează KPI” = the ONE drawer + step strip (Identificare · Calcul · Ținta și responsabili · Revizuire);
       „Valoare proprie” = the ONE drawer;
     · filters of the numerator / denominator = the Registre „Filtru predefinit” rule builder markup (Documente rule
       builder: `.e-permits-doc-rule` / `.e-permits-doc-cond` / `code.e-permits-doc-kw`);
     · charts = the eKYC dashboard SVG (`.e-permits-chart`, bars, axis, legend tray; target band = the eKYC
       „Banda de decizie” meter + axis); value cards = the eKYC KPI cards (`.e-permits-kpi-grid`).
   Data dictionary = the Permisiuni stacked list (collapsible groups); compositions documented (components.md › „KPI”): value
   check card, global-vs-own value pair.
   Routes: #kpi (list) · #kpi/<id>/<definitie|tinta|valori|alerte|istoric>.
   Demo switch ?kpi= (comma list): fara-permisiune · gol · incarcare · eroare (every save fails) · numitor-zero.
   Who: Administrator central = global level, every KPI; Administrator local = own authority (ANSP); others: no menu,
   direct address → „Nu aveți permisiunea de a accesa această pagină.”.
   For widgets (Feature 96501): window.GEAPKpi — list / get / value / series / zone / format / target.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const RO_SHORT = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
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
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const nf = (v, d = 0) => Number(v).toLocaleString("ro-MD", { minimumFractionDigits: d, maximumFractionDigits: d });
  const dec = (v) => (Number.isInteger(Number(v)) ? nf(v) : nf(v, 1));
  const round1 = (v) => Math.round(v * 10) / 10;
  /* a sentence ending in an abbreviation („p.p.”) takes no second full stop */
  const dot = (text) => (/\.$/.test(text) ? text : `${text}.`);

  const KIND = "kpi";
  const NAV = "kpi";
  const TITLE = "KPI";
  /* Feature 96500 AC (Feature 89940 wording) */
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
  const SAVE_FAILED = "KPI-ul nu a putut fi salvat.";
  /* Feature 96500 AC — word for word */
  const SAME_SOURCE = "Numărătorul și numitorul trebuie să folosească aceeași sursă de date.";
  const EMPTY_LIST = "Nu există KPI-uri.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const NAME_MAX = 150;
  const TEXT_MAX = 500;
  const FORMATS = [["number", "Număr"], ["percent", "Procent"], ["duration", "Durată"], ["amount", "Sumă în MDL"]];
  const UNITS = ["ore", "zile", "săptămâni", "luni", "trimestre", "ani"];
  const DIRECTIONS = [["up", "Mai mare e mai bine"], ["down", "Mai mic e mai bine"]];
  const VALUE_TYPES = [["Flux", "Flux"], ["Stoc", "Stoc"]];
  const MEASURES = [["count", "Număr"], ["sum", "Sumă"], ["avg", "Medie"]];
  const CRITERIA = ["Serviciu", "Subdiviziune", "Specialist"];
  /* „Specialist” (kpi-specialist-v1, 2026-11-07 — Proposal for PO; the Feature lists the criterion but its data model has no
     person field, only the level „Rol”): the KPI is measured per specialist (each specialist's value on the dossiers assigned
     to them, against the target) and the authority sets that target per ROLE, never per named person — role / team targets are
     the norm in KPI tools for public services (no upkeep at every staffing change, no individual quotas). So the own-value level
     „Rol” exists only on a KPI with the criterion, and only the roles that process dossiers. */
  const SPEC_ROLES = (roles) => roles.filter((r) => !["Administrator local", "Director"].includes(r));
  const OPS = [["is", "este"], ["isNot", "nu este"], ["contains", "conține"], ["empty", "este gol"], ["notEmpty", "are valoare"]];
  const NO_VALUE = ["empty", "notEmpty"];
  const TYPE_LABEL = { text: "Text", enum: "Listă de valori", date: "Dată", number: "Număr", duration: "Durată", amount: "Sumă (MDL)" };
  const NUMERIC = ["number", "duration", "amount"];
  const ZONES = { favorabil: ["Favorabil", "success"], avertizare: ["Avertizare", "warning"], critic: ["Critic", "danger"] };
  const ALERT_KIND = { exceeded: "Ținta depășită", approach: "Apropiere de țintă" };
  const EVENTS = {
    create: "Crearea KPI", clone: "Clonarea KPI", edit: "Modificarea KPI", on: "Activarea KPI", off: "Dezactivarea KPI",
    authOn: "Activat pentru autoritate", authOff: "Dezactivat pentru autoritate",
    ownAdd: "Valoare proprie adăugată", ownEdit: "Valoare proprie modificată", ownDel: "Valoare proprie eliminată",
    publish: "Publicarea KPI", rejected: "Publicare respinsă", restore: "Restaurarea unei versiuni"
  };

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("kpi") || "").split(",").map((s) => s.trim()).filter(Boolean));
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    /* the permission „Gestionarea KPI” (Feature 89940): the two administrators; ?kpi=fara-permisiune takes it away */
    const has = (central || local) && !demo.has("fara-permisiune");
    return { central, local, has, authority: central ? null : a.authority || "ansp", roleLabel: a.roleLabel || "", roleId: a.roleId || "" };
  }
  const roleLabel = () => { const w = who(); return w.local ? `${w.roleLabel || "Administrator local"} · ${authName(w.authority)}` : w.roleLabel || "Administrator central"; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (demo.has("incarcare")) return new Promise(() => {});
    if (!S.loading) {
      S.loading = fetch("data/kpi.json?v=kpi-publish-v1").then((r) => r.json()).then((json) => {
        if (demo.has("gol")) { json.kpis = []; json.alerts = []; }
        json.inherit = json.inherit || {};
        json.history = json.history || {};
        S.data = json;
        json.kpis.forEach(seedVersions);
        window.GEAPNotifDrawer?.sync?.();
        return json;
      }).catch(() => { S.data = { kpis: [], sources: [], authorities: [], services: [], roles: [], domains: [], inherit: {}, alerts: [], history: {} }; return S.data; });
    }
    return S.loading;
  }
  const D = () => S.data || { kpis: [], sources: [], authorities: [], services: [], roles: [], domains: [], inherit: {}, alerts: [], history: {} };
  const allKpis = () => D().kpis;
  const kpiOf = (id) => allKpis().find((k) => k.id === id) || null;
  const visible = (k, w = who()) => w.central || k.level === "Global" || k.authority === w.authority;
  const kpis = () => (who().has ? allKpis().filter((k) => visible(k)) : []);
  const sourceOf = (id) => D().sources.find((s) => s.id === id) || null;
  const sourceName = (id) => sourceOf(id)?.name || "";
  const fieldsOf = (id) => (sourceOf(id)?.groups || []).flatMap(([group, list]) => list.map(([key, label, type, desc, values]) => ({ key, label, type, desc, values: values || [], group })));
  const fieldOf = (src, key) => fieldsOf(src).find((f) => f.key === key) || null;
  const authOf = (id) => D().authorities.find((a) => a.id === id) || null;
  const authName = (id) => authOf(id)?.name || id || "";
  const serviceName = (code) => D().services.find(([c]) => c === code)?.[1] || code || "";
  const domainOf = (code) => String(code || "").split("-")[0];
  const domainName = (letter) => D().domains.find(([l]) => l === letter)?.[1] || letter;
  const isPlanned = (k) => k.status === "Planificat";
  /* kpi-publish-v1: a KPI saved as a draft and never published („Salvează ciorna”, as widgets) */
  const isDraftK = (k) => k.status === "Ciornă";
  const noCalc = (k) => isPlanned(k) || isDraftK(k);
  const inheritOf = (k, authId) => (authId ? D().inherit[authId]?.[k.id] || null : null);
  const ensureInherit = (k, authId) => {
    D().inherit[authId] = D().inherit[authId] || {};
    return (D().inherit[authId][k.id] = D().inherit[authId][k.id] || { active: true, own: [] });
  };
  /* the perimeter whose values the signed-in user sees: everything (central) or the own authority */
  const perimeterOf = (k, w = who()) => (k.level === "Autoritate" ? k.authority : w.central ? "all" : w.authority);
  const activeFor = (k, authId) => k.status === "Activ" && (k.level !== "Global" || !authId || inheritOf(k, authId)?.active !== false);

  /* ---- the target in force: an authority's own Autoritate-level value (no service) replaces the global one there */
  function targetFor(k, authId) {
    if (k.level === "Global" && authId) {
      const own = (inheritOf(k, authId)?.own || []).find((o) => o.level === "Autoritate" && !o.service);
      if (own) return { target: own.target, threshold: own.threshold, own: true };
    }
    return { target: k.target, threshold: k.threshold, own: false };
  }
  const hasTarget = (t) => t.target !== null && t.target !== undefined && t.target !== "";

  /* ---- value formats */
  const unitOf = (k) => (k.format === "percent" ? "%" : k.format === "duration" ? k.unit || "zile" : k.format === "amount" ? "MDL" : "");
  function fmt(k, v) {
    if (v === null || v === undefined || v === "") return "";
    if (k.format === "percent") return `${dec(v)}%`;
    if (k.format === "duration") return `${dec(v)} ${k.unit || "zile"}`;
    if (k.format === "amount") return `${nf(v)} MDL`;
    return nf(v);
  }
  const fmtThreshold = (k, v) => (v === null || v === undefined || v === "" ? "" : k.format === "percent" ? `${dec(v)} p.p.` : fmt(k, v));
  const formatLabel = (k) => (k.format === "duration" ? `Durată · ${k.unit || "zile"}` : FORMATS.find(([f]) => f === k.format)?.[1] || "");
  /* Favorabil / Avertizare / Critic (Feature 96498 „Culoare”): beyond the target by more than the threshold = favourable,
     within the threshold on the good side = warning (approach alert), past the target on the bad side = critical */
  function zone(direction, v, target, threshold) {
    if (v === null || v === undefined || target === null || target === undefined || target === "") return null;
    const t = Number(target);
    const th = Number(threshold || 0);
    if (direction === "up") return v < t ? "critic" : v < t + th ? "avertizare" : "favorabil";
    return v > t ? "critic" : v > t - th ? "avertizare" : "favorabil";
  }
  /* [cur, prev, num, den, prevNum, prevDen] of the last calculation, for a perimeter */
  function valuesOf(k, per) {
    const arr = k.values?.[per] || k.values?.all || [null, null];
    return { cur: arr[0] ?? null, prev: arr[1] ?? null, num: arr[2], den: arr[3], pnum: arr[4], pden: arr[5] };
  }
  /* „n/a” at a zero denominator (Feature AC); „—” while the KPI is planned or has no value */
  const valueText = (k, val) => (noCalc(k) ? "—" : val === null || val === undefined ? "n/a" : fmt(k, val));
  /* the 12 monthly values (last = the current month so far, the one before = the previous period) — derived once from the
     seed, deterministic; widgets (Feature 96501) read it through GEAPKpi.series */
  function seriesOf(k, per) {
    const { cur, prev } = valuesOf(k, per);
    const today = new Date(`${D().today || "2026-11-06"}T00:00:00`);
    const out = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      let value;
      if (noCalc(k)) value = null;
      else if (i === 0) value = cur;
      else if (i === 1) value = prev;
      else {
        const base = prev ?? cur;
        if (base === null || base === undefined) value = null;
        else {
          const swing = ((hash(`${k.id}:${per}:${i}`) % 17) - 8) / 100;
          value = base * (1 + swing);
          if (k.format === "percent") value = Math.min(100, Math.max(0, value));
          value = k.format === "number" || k.format === "amount" ? Math.round(value) : round1(value);
        }
      }
      out.push({ month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: `${RO_SHORT[d.getMonth()]} ${d.getFullYear()}`, value });
    }
    return out;
  }
  const average = (list) => { const v = list.filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

  /* ---------------------------------------------------------------- permissions per KPI */
  const canCreate = () => who().has;
  const canEdit = (k) => { const w = who(); return w.has && !!k && (w.central || (k.level === "Autoritate" && k.authority === w.authority)); };
  const canInherit = (k) => { const w = who(); return w.has && w.local && !!k && k.level === "Global"; };
  const canToggle = (k) => canEdit(k) && !noCalc(k);
  const canPublish = (k) => canEdit(k) && !isPlanned(k);

  /* ---------------------------------------------------------------- shared markup: charts (eKYC dashboard style) */
  const meter = (segments, { label = "", max = 1 } = {}) => {
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
    const gaps = cuts.map((at) => `<line class="e-permits-meter__gap" x1="${at.toFixed(2)}%" x2="${at.toFixed(2)}%" y1="0" y2="100%"></line>`).join("");
    return `<span class="e-permits-meter e-permits-meter--lg" role="img"${label ? ` aria-label="${esc(label)}"` : ""}><svg class="e-permits-meter__svg" aria-hidden="true" focusable="false"><rect class="e-permits-meter__track" x="0" y="0" width="100%" height="100%"></rect>${rects}${gaps}</svg></span>`;
  };
  const legend = (items) => `
    <ul class="e-permits-meter-legend e-permits-meter-legend--tray" role="list">
      ${items.map(([label, tone]) => `<li><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--${tone}" aria-hidden="true"></span>${esc(label)}</li>`).join("")}
    </ul>`;
  /* the zones of a target as text (legend + band labels) */
  function zoneRanges(k, t) {
    const T = Number(t.target);
    const th = Number(t.threshold || 0);
    const f = (v) => fmt(k, v);
    if (k.direction === "up") {
      return th
        ? [["Critic", "danger", `sub ${f(T)}`], ["Avertizare", "warning", `${f(T)} – ${f(T + th)}`], ["Favorabil", "success", `de la ${f(T + th)}`]]
        : [["Critic", "danger", `sub ${f(T)}`], ["Favorabil", "success", `de la ${f(T)}`]];
    }
    return th
      ? [["Favorabil", "success", `până la ${f(Math.max(0, T - th))}`], ["Avertizare", "warning", `${f(Math.max(0, T - th))} – ${f(T)}`], ["Critic", "danger", `peste ${f(T)}`]]
      : [["Favorabil", "success", `până la ${f(T)}`], ["Critic", "danger", `peste ${f(T)}`]];
  }
  /* the zone band = a bullet graph (Stephen Few; Grafana / Datadog threshold bars): the eKYC stacked meter shows the zones
     only; the thresholds are NEVER printed at their positions (they collided: „92%95%100%”) — they go into the legend under
     the bar, one item per zone, which wraps. The one positioned label is the current value: a tick under the bar and
     „Acum …” anchored away from the nearer edge (start in the left half, end in the right half), so it cannot leave the
     card or meet another label. components.md › „Charts: no overlapping labels”. */
  const niceMax = (v) => { if (!(v > 0)) return 1; const step = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / step * 2) / 2 * step; };
  /* the zoomed start: a „nice” tick under min(current value, the lowest zone edge) minus half the visible span — the zones
     stay readable (80–100 % instead of a red bar over 90 % of the width) */
  const niceStart = (lo, hi) => {
    const span = Math.max(hi - lo, 1e-9);
    const raw = lo - span * 0.5;
    if (raw <= 0) return 0;
    const step = 10 ** Math.floor(Math.log10(span)) / 2;
    return Math.max(0, Math.floor(raw / step) * step);
  };
  function bandHtml(k, t, { title = "Zonele valorii", meta = "", current = null } = {}) {
    if (!hasTarget(t) || Number.isNaN(Number(t.target))) return '<div hidden data-kpi-band></div>';
    const T = Number(t.target);
    const th = Number(t.threshold || 0);
    const cur = current === null || current === undefined || current === "" || Number.isNaN(Number(current)) ? null : Number(current);
    const max = k.format === "percent" ? 100 : niceMax(Math.max(T + th, T * 1.5, cur ?? 0) * 1.1);
    const edge = k.direction === "up" ? T : Math.max(0, T - th);
    const min = niceStart(Math.min(cur ?? edge, edge), max);
    /* the zones as intervals, clipped to the visible domain [min, max] */
    const zonesAt = k.direction === "up"
      ? [[0, T, "danger"], [T, T + th, "warning"], [T + th, max, "success"]]
      : [[0, Math.max(0, T - th), "success"], [Math.max(0, T - th), T, "warning"], [T, max, "danger"]];
    const segs = zonesAt.map(([from, to, tone]) => [Math.max(0, Math.min(to, max) - Math.max(from, min)), tone]);
    const ranges = zoneRanges(k, t);
    let marker = "";
    if (cur !== null) {
      /* demo: ?kpi=marker-stanga / marker-dreapta pins the marker to an edge (label clamping check) */
      const at = demo.has("marker-stanga") ? min : demo.has("marker-dreapta") ? max : Math.min(max, Math.max(min, cur));
      const x = ((at - min) / (max - min)) * 100;
      marker = `
          <svg class="e-permits-kpi-band__marker" aria-hidden="true" focusable="false">
            <svg x="${x.toFixed(2)}%" overflow="visible">
              <line class="e-permits-kpi-band__halo" x1="0" x2="0" y1="0" y2="16"></line>
              <line class="e-permits-kpi-band__tick" x1="0" x2="0" y1="0" y2="16"></line>
              <polygon class="e-permits-kpi-band__caret" points="-6,24 0,18 6,24"></polygon>
              <rect class="e-permits-kpi-band__bubble" x="${-Math.round((`Acum ${fmt(k, cur)}`.length * 7 + 16) / 2)}" y="24" width="${`Acum ${fmt(k, cur)}`.length * 7 + 16}" height="24"></rect>
            </svg>
            <text class="e-permits-kpi-band__label" x="${x.toFixed(2)}%" y="40" text-anchor="middle" data-kpi-x="${x.toFixed(2)}">${esc(`Acum ${fmt(k, cur)}`)}</text>
          </svg>`;
    }
    const z = cur === null ? null : zone(k.direction, cur, T, th);
    const label = `Domeniul afișat ${fmt(k, min)} – ${fmt(k, max)}. ${ranges.map(([l, , r]) => `${l} ${r}`).join(", ")}${cur !== null ? `. Valoarea curentă ${fmt(k, cur)}${z ? `, ${ZONES[z][0]}` : ""}` : ""}`;
    return `
      <section class="e-permits-dosar-profil__section" aria-label="${esc(title)}" data-kpi-band>
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
          ${meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(meta)}</span>` : ""}
        </div>
        <div class="e-permits-chart e-permits-ekyc-band e-permits-kpi-band${marker ? " has-marker" : ""}">
          ${meter(segs, { max: max - min, label })}${marker}
          ${legend(ranges.map(([l, tone, r]) => [`${l} · ${r}`, tone]))}
        </div>
      </section>`;
  }
  /* „Acum …” = an always-visible value callout in the library tooltip Small look (gray-900 bubble, r4, 8 12, 14/20 white) with
     its arrow on the value; centred on the marker, near an edge the bubble shifts inside the card while the arrow stays. SVG text
     cannot measure itself in CSS, so every drawn band is fitted once laid out (and on resize): x = clamp(cx − w / 2, 0, W − w) */
  function fitBandLabels(scope = document) {
    scope.querySelectorAll?.(".e-permits-kpi-band__label[data-kpi-x]").forEach((t) => {
      const svg = t.ownerSVGElement;
      const W = svg?.getBoundingClientRect().width || 0;
      if (!W) return;
      /* the library Small tooltip with its arrow on top (main.css .tooltip--bottom-left / -center / -right: 14 square at
         45°, 20 + 7 from the wrapper edge = 19 from the body edge): top-centre by default; when the centred body would leave
         the card, the top-left / top-right variant — the arrow stays on the value, the body moves to its side */
      /* chart value callout variant (user 2026-11-06): pill body, padding 4 8, 12/16 medium; the arrow 14 from the body edge
         (past the 12 pill radius) in the top-left / top-right variants */
      const w = t.getComputedTextLength() + 16;
      const cx = (W * Number(t.dataset.kpiX)) / 100;
      const ARROW = 14;
      const left = cx - w / 2 >= 0 && cx + w / 2 <= W ? cx - w / 2 : cx < W / 2 ? cx - ARROW : cx - (w - ARROW);
      t.dataset.kpiVariant = cx - w / 2 >= 0 && cx + w / 2 <= W ? "top-center" : cx < W / 2 ? "top-left" : "top-right";
      const rect = svg.querySelector(".e-permits-kpi-band__bubble");
      if (rect) { rect.setAttribute("x", (left - cx).toFixed(1)); rect.setAttribute("width", w.toFixed(1)); }
      t.setAttribute("text-anchor", "start");
      t.setAttribute("x", (left + 8).toFixed(1));
    });
  }
  let fitQueued = false;
  const queueFit = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fitBandLabels(); }); };
  new MutationObserver((list) => { if (list.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.(".e-permits-kpi-band__marker, [data-kpi-band]") || n.querySelector?.(".e-permits-kpi-band__marker"))))) queueFit(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", queueFit);

  /* the column chart of the eKYC „Tendință sesiuni”: one bar per month, coloured by its zone (brand without a target) */
  function trendChart(k, series, t) {
    const vals = series.map((p) => p.value).filter((v) => v !== null && v !== undefined);
    if (!vals.length) return "";
    const max = k.format === "percent" ? 100 : Math.max(...vals, hasTarget(t) ? Number(t.target) : 0) * 1.15 || 1;
    const n = series.length;
    const w = 100 / n;
    const bars = series.map((p, i) => {
      if (p.value === null || p.value === undefined) return "";
      const x = (i * w + w * 0.22).toFixed(2);
      const width = (w * 0.56).toFixed(2);
      const top = (100 - (p.value / max) * 100).toFixed(2);
      const tone = ZONES[zone(k.direction, p.value, t.target, t.threshold)]?.[1] || "brand";
      return `<rect class="e-permits-chart__bar e-permits-chart__bar--${tone}" x="${x}%" y="${top}%" width="${width}%" height="200%" rx="4"></rect>`;
    }).join("");
    const ranges = hasTarget(t) ? zoneRanges(k, t) : null;
    return `
      <svg class="e-permits-chart__plot" role="img" aria-label="Valoarea lunară în ultimele 12 luni: ${esc(series.map((p) => `${p.label} ${p.value === null ? "n/a" : fmt(k, p.value)}`).join(", "))}" focusable="false">${bars}</svg>
      <div class="e-permits-chart__axis" aria-hidden="true"><span>${esc(series[0].label)}</span><span>${esc(series[Math.floor(n / 2)].label)}</span><span>${esc(series[n - 1].label)}</span></div>
      ${legend(ranges ? ranges.map(([l, tone, r]) => [`${l} · ${r}`, tone]) : [["Valoarea lunară", "brand"]])}`;
  }
  /* KPI cards of the eKYC dashboard */
  const kpiCard = (label, value, meta, tone = "") => `
    <li class="e-permits-kpi">
      <span class="e-permits-kpi__label">${esc(label)}</span>
      <span class="e-permits-kpi__value${tone ? ` e-permits-kpi__value--${tone}` : ""}">${value}</span>
      <span class="e-permits-kpi__meta">${meta}</span>
    </li>`;
  const toneOfZone = (z) => (z === "critic" ? "danger" : z === "avertizare" ? "warning" : "");
  const ratioMeta = (num, den) => (den === undefined || den === null ? "" : `<strong>${esc(nf(num || 0))}</strong> din ${esc(nf(den))}`);
  /* value cards + trend: what the KPI returns (current + previous period), for the check and the read-only view */
  function valueCards(k, val, t, { checkedAt = "" } = {}) {
    const zc = zone(k.direction, val.cur, t.target, t.threshold);
    const zp = zone(k.direction, val.prev, t.target, t.threshold);
    const zero = val.cur === null && !isPlanned(k);
    const curMeta = zero ? "numitorul este 0 în perioadă" : ratioMeta(val.num, val.den) || (zc ? esc(ZONES[zc][0]) : "luna curentă");
    return `
      <ul class="e-permits-kpi-grid" role="list">
        ${kpiCard("Valoarea curentă", esc(valueText(k, val.cur)), `${curMeta}${zc && ratioMeta(val.num, val.den) ? ` · ${esc(ZONES[zc][0])}` : ""}`, toneOfZone(zc))}
        ${kpiCard("Perioada precedentă", esc(valueText(k, val.prev)), ratioMeta(val.pnum, val.pden) || (zp ? esc(ZONES[zp][0]) : "luna trecută"), toneOfZone(zp))}
        ${kpiCard(t.own ? "Ținta proprie" : "Ținta", hasTarget(t) ? esc(fmt(k, t.target)) : "—", hasTarget(t) ? `prag de apropiere ${esc(fmtThreshold(k, t.threshold) || "—")}` : "fără țintă: fără alerte")}
      </ul>
      ${checkedAt ? `<p class="e-permits-fo-field__hint">${esc(checkedAt)}</p>` : ""}`;
  }

  /* the right (wide, ≈7fr) column of a target form = the preview: the zone band with the current value + the value cards and
     the 12-month trend coloured by the draft target; `[data-kpi-preview]` is redrawn while the target is typed */
  function targetPreview(k, t, val, series, { title = "Zonele valorii" } = {}) {
    const chart = val
      ? `<section class="e-permits-dosar-profil__section">
          <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Valoarea față de țintă</h2></div>
          <div class="e-permits-chart">${valueCards(k, val, t)}${series?.length ? trendChart(k, series, t) : ""}</div>
        </section>`
      : `<section class="e-permits-dosar-profil__section">
          <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Valoarea față de țintă</h2></div>
          ${E()?.render({ title: "Valoarea nu a fost verificată", text: "Verificați valoarea la pasul „Calcul” ca s-o vedeți aici față de țintă.", icon: "calculator", compact: true }) || ""}
        </section>`;
    return `${bandHtml(k, t, { title, current: val?.cur ?? null })}${chart}`;
  }

  /* ---------------------------------------------------------------- shared markup: form pieces (BO form vocabulary) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const hintRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-kpi-count="${id}">${count}/${max}</span></p>`;
  function textField(id, key, label, value, { required = false, max = 0, hint = "", error = "", span = 12, counter = false, unit = "", numeric = false, placeholder = "" } = {}) {
    const count = String(value ?? "").length;
    const described = error ? `${id}-error` : hint || counter ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value ?? "")}" autocomplete="off"${numeric ? ' inputmode="decimal"' : ""}${placeholder || unit ? ` placeholder="${esc(placeholder || "0")}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${described ? ` aria-describedby="${described}"` : ""} data-kpi-field="${key}">
          ${unit ? `<label class="e-permits-fo-input__suffix" for="${id}" aria-hidden="true">${esc(unit)}</label>` : ""}
        </div>
        ${error ? errorHtml(id, error) : counter ? hintRow(id, hint, count, max) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(id, key, label, value, { hint = "", required = false, error = "", placeholder = "" } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="3" aria-describedby="${error ? `${id}-error` : `${id}-hint`}"${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""} spellcheck="true" data-kpi-field="${key}">${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : hintRow(id, hint, count, TEXT_MAX)}
      </div>`;
  }
  function selectField(id, key, label, options, value, { required = false, placeholder = "", hint = "", error = "", span = 6, disabled = false } = {}) {
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-kpi-field="${key}"`, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const full = (html) => (html ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${html}</div>` : "");
  const cardSection = (title, body, { id = "", meta = "", tools = "" } = {}) => `
    <section class="e-permits-dosar-profil__section"${id ? ` aria-labelledby="${id}"` : ""}>
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title"${id ? ` id="${id}"` : ""}>${esc(title)}</h2>
        ${tools || meta ? `<div class="e-permits-passport__heading-tools">${meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(meta)}</span>` : ""}${tools}</div>` : ""}
      </div>
      <div class="e-permits-ntpl-card">${body}</div>
    </section>`;
  /* the drawer form sections (Identificare / Calcul …) */
  const drawerSection = (title, body) => `<section class="e-permits-user-create__section"><h3 class="e-permits-user-create__section-title">${esc(title)}</h3><div class="e-permits-user-create__section-content">${body}</div></section>`;
  const checkGroup = (labelId, label, items, hint = "") => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <span class="e-permits-cfg-ro__label" id="${labelId}">${esc(label)}</span>
      <div class="e-permits-check-options" role="group" aria-labelledby="${labelId}">${items.join("")}</div>
      ${hint ? `<p class="e-permits-fo-field__hint">${esc(hint)}</p>` : ""}
    </div>`;

  /* ---------------------------------------------------------------- the draft (create + edit share it) */
  const draftOf = (k) => ({
    domain: domainOf(k.code), code: k.code, nameRo: k.names?.ro || "", nameRu: k.names?.ru || "", nameEn: k.names?.en || "",
    desc: k.desc || "", definition: k.definition || "", source: k.source || "", num: clone(k.num) || { measure: "count", column: "", logic: "and", rules: [] },
    hasDen: Boolean(k.hasDen), den: clone(k.den) || { source: "", logic: "and", rules: [] }, dateColumn: k.dateColumn || "", valueType: k.valueType || "Flux",
    format: k.format || "percent", unit: k.unit || "zile", direction: k.direction || "up",
    target: k.target ?? "", threshold: k.threshold ?? "", criteria: [...(k.criteria || [])], roles: [...(k.roles || [])], recalc: Boolean(k.recalc)
  });
  const blankDraft = () => draftOf({ code: "", names: {}, format: "percent", direction: "up", valueType: "Flux", unit: "zile" });
  /* keys → [label, tab] (review modal + audit detail) */
  const DRAFT_LABELS = {
    nameRo: ["Denumire (RO)", "Definiție"], nameRu: ["Denumire (RU)", "Definiție"], nameEn: ["Denumire (EN)", "Definiție"], desc: ["Descriere", "Definiție"],
    definition: ["Definiția și modul de verificare", "Definiție"], source: ["Sursa de date", "Definiție"], num: ["Numărătorul", "Definiție"], hasDen: ["Numitor", "Definiție"],
    den: ["Numitorul", "Definiție"], dateColumn: ["Data de referință", "Definiție"], valueType: ["Tip de valoare", "Definiție"], format: ["Format", "Definiție"],
    unit: ["Unitatea duratei", "Definiție"], direction: ["Direcție", "Definiție"], recalc: ["Recalculare la schimbarea statutului", "Definiție"],
    target: ["Ținta", "Ținta și responsabili"], threshold: ["Pragul de apropiere", "Ținta și responsabili"], criteria: ["Criterii de setare", "Ținta și responsabili"],
    roles: ["Roluri responsabile", "Ținta și responsabili"]
  };
  const getPath = (obj, path) => path.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const setPath = (obj, path, value) => { const parts = path.split("."); const last = parts.pop(); const target = parts.reduce((o, p) => o[p], obj); target[last] = value; };
  /* the KPI-like object of a draft (formats, zones, previews) */
  const asKpi = (v, base = {}) => ({ ...base, format: v.format, unit: v.unit, direction: v.direction, target: num(v.target), threshold: num(v.threshold), status: base.status || "Activ" });
  const num = (s) => (s === "" || s === null || s === undefined ? null : Number(String(s).replace(",", ".")));

  /* ---- validation (US-399 / US-401) */
  const CODE_RE = /^[VTCFD]-\d{2}$/;
  function validate(v, { selfId = "", steps = [1, 2, 3] } = {}) {
    const e = {};
    if (steps.includes(1)) {
      if (!selfId) {
        if (!v.domain) e.domain = "Alegeți domeniul.";
        if (!CODE_RE.test(String(v.code || "").trim())) e.code = "Codul are forma literei domeniului, o cratimă și două cifre, de exemplu T-04.";
        else if (v.domain && domainOf(v.code) !== v.domain) e.code = `Codul începe cu litera domeniului: ${v.domain}-.`;
        else if (allKpis().some((k) => k.code === v.code.trim() && k.id !== selfId)) e.code = "Există deja un KPI cu acest cod.";
      }
      if (!String(v.nameRo || "").trim()) e.nameRo = "Completați denumirea în limba română.";
      else if (v.nameRo.length > NAME_MAX) e.nameRo = `Denumirea poate avea cel mult ${NAME_MAX} de caractere.`;
    }
    if (steps.includes(2)) {
      if (!v.source) e.source = "Alegeți sursa de date.";
      if (v.source && v.num.measure !== "count" && !v.num.column) e["num.column"] = "Alegeți coloana pe care se calculează suma sau media.";
      const ruleErrors = (part, src) => {
        (v[part].rules || []).forEach((r, i) => {
          if (!r.column) e[`${part}.rule.${i}`] = "Alegeți coloana.";
          else if (!NO_VALUE.includes(r.op) && !String(r.value || "").trim()) e[`${part}.rule.${i}`] = "Completați valoarea.";
          else if (!fieldOf(src, r.column)) e[`${part}.rule.${i}`] = "Coloana nu există în sursa aleasă.";
        });
      };
      if (v.source) ruleErrors("num", v.source);
      if (v.hasDen) {
        if (!v.den.source) e["den.source"] = "Alegeți sursa de date a numitorului.";
        /* Feature AC: different sources never save */
        else if (v.den.source !== v.source) e["den.source"] = SAME_SOURCE;
        else ruleErrors("den", v.source);
      }
      if (v.format === "percent" && !v.hasDen) e.hasDen = "Un procent se calculează față de un numitor: bifați „Raportează la un numitor”.";
      if (!v.dateColumn) e.dateColumn = "Alegeți data de referință.";
    }
    if (steps.includes(3)) {
      const t = num(v.target);
      const th = num(v.threshold);
      if (v.target !== "" && (Number.isNaN(t) || t < 0)) e.target = "Introduceți un număr pozitiv.";
      else if (v.format === "percent" && t > 100) e.target = "Procentul poate fi cel mult 100.";
      if (v.threshold !== "") {
        if (Number.isNaN(th) || th < 0) e.threshold = "Introduceți un număr pozitiv.";
        else if (v.target === "") e.threshold = "Pragul de apropiere se stabilește doar împreună cu ținta.";
        else if (v.direction === "down" && th >= t) e.threshold = "Pragul de apropiere trebuie să fie mai mic decât ținta.";
      }
    }
    return e;
  }
  const STEP_OF = (key) => (/^(domain|code|name)/.test(key) ? 1 : /^(target|threshold)/.test(key) ? 3 : 2);

  /* ---- the value check: a deterministic mock of the calculation on the draft (US-399 / Feature flow step 4) */
  function calcDraft(v) {
    const h = hash(JSON.stringify([v.source, v.num, v.hasDen ? v.den : null, v.dateColumn, v.format, v.valueType]));
    if (v.hasDen) {
      const den = demo.has("numitor-zero") ? 0 : 240 + (h % 480);
      const pden = 230 + ((h >>> 3) % 470);
      const rate = (55 + (h % 43)) / 100;
      const prate = Math.min(0.99, Math.max(0.05, rate + (((h >>> 7) % 9) - 4) / 100));
      const n = Math.round(den * rate);
      const pn = Math.round(pden * prate);
      const scale = v.format === "percent" ? 100 : 1;
      return [den ? round1((n / den) * scale) : null, round1((pn / pden) * scale), n, den, pn, pden];
    }
    if (v.num.measure === "avg") { const c = 2 + (h % 60) / 10; return [round1(c), round1(c + (((h >>> 5) % 9) - 4) / 10)]; }
    if (v.num.measure === "sum") { const c = 120000 + (h % 600000); return [c, Math.round(c * (0.9 + ((h >>> 4) % 20) / 100))]; }
    const c = 150 + (h % 1800);
    return [c, Math.round(c * (0.88 + ((h >>> 4) % 24) / 100))];
  }
  const calcKey = (v) => JSON.stringify([v.source, v.num, v.hasDen, v.den, v.dateColumn, v.format, v.valueType, v.unit]);

  /* ================================================================ data dictionary (the Permisiuni stacked list) */
  function usageOf(v) {
    const used = {};
    const add = (key, label) => { if (key) (used[key] = used[key] || []).push(label); };
    if (v.num.column) add(v.num.column, "Numărător");
    (v.num.rules || []).forEach((r) => add(r.column, "Filtru numărător"));
    if (v.hasDen) (v.den.rules || []).forEach((r) => add(r.column, "Filtru numitor"));
    add(v.dateColumn, "Data de referință");
    Object.keys(used).forEach((k) => { used[k] = [...new Set(used[k])]; });
    return used;
  }
  /* the dictionary = the Permisiuni stacked list (renderPermGroup): collapsible groups with a count, standard stack rows
     (name · type · description, usage = Small tags in the tag slot, a used field = the selected row); a search opens every
     group with matches */
  function dictionaryHtml(st, v, idp) {
    const src = sourceOf(v.source);
    /* heading = the left column's section heading (title only, same baseline); the source line = subtitle under it */
    /* heading row = title + the source line as the section meta on the right (as „Coduri existente în domeniu”) */
    const heading = (meta = "") => `
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title" id="${idp}-dict-title">Dicționarul de date</h2>
        ${meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(meta)}</span>` : ""}
      </div>`;
    if (!src) {
      return `<section class="e-permits-dosar-profil__section e-permits-stack-section" aria-labelledby="${idp}-dict-title">${heading()}
        ${E()?.render({ title: "Alegeți sursa de date", text: "Dicționarul arată câmpurile sursei, cu tipul și descrierea lor.", icon: "book", compact: true }) || ""}
      </section>`;
    }
    const q = fold(st.dictQuery || "").trim();
    const used = usageOf(v);
    const fields = fieldsOf(v.source);
    const match = fields.filter((f) => !q || fold(`${f.label} ${f.desc}`).includes(q));
    const groups = [...new Set(match.map((f) => f.group))].map((g) => [g, match.filter((f) => f.group === g)]);
    const body = groups.length ? `<div class="e-permits-stack e-permits-reg-editor__stack">${groups.map(([group, list]) => {
      const open = Boolean(q) || !st.dictClosed.has(group);
      return `
        <div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
          <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
            <button class="e-permits-stack__group-toggle" type="button" data-kpi-dict-group="${esc(group)}" aria-expanded="${open ? "true" : "false"}"${q ? " disabled" : ""}>
              <span class="e-permits-stack__group-name">${esc(group)}</span>
              <span class="badge badge--lg badge--solid-light e-permits-stack__group-count" aria-label="${plural(list.length, "câmp", "câmpuri")}">${list.length}</span>
              ${icon("chevron-bottom", 16).replace('class="icon small"', 'class="icon small e-permits-stack__group-chevron"')}
            </button>
          </h3>
          ${open ? `<ul class="e-permits-stack__list" role="list">${list.map((f) => {
            const row = A().renderStackItem?.({
              plainTitle: f.label,
              title: esc(f.label),
              /* compact row: the type = a Small neutral tag right after the name (the stack row's tag slot), usage tags after it */
              badges: [tag(TYPE_LABEL[f.type] || f.type, "neutral"), ...(used[f.key] || []).map((u) => tag(u, "brand"))],
              meta: [esc(f.desc)]
            }) || "";
            return used[f.key] ? row.replace('<li class="e-permits-stack__item', '<li class="e-permits-stack__item is-selected') : row;
          }).join("")}</ul>` : ""}
        </div>`;
    }).join("")}</div>` : E()?.noResults?.("Niciun câmp nu corespunde căutării", { text: "Caută după denumirea sau descrierea câmpului.", compact: true }) || "";
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section" aria-labelledby="${idp}-dict-title">
        ${heading(`${src.name} · ${src.version} · ${plural(fields.length, "câmp", "câmpuri")}`)}
        <div class="e-permits-pay__toolbar">
          <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${st.dictQuery ? " has-value is-ready" : ""}">
            <span class="icon-search" aria-hidden="true">${icon("search")}</span>
            <input class="input" type="search" id="${idp}-dict-search" placeholder="Caută în dicționar" aria-label="Caută în dicționarul de date" autocomplete="off" value="${esc(st.dictQuery || "")}" data-kpi-dict-search>
            <div class="btn-group"><button type="button" class="btn-icon clear" aria-label="Șterge căutarea" data-kpi-dict-clear>${icon("cross-small", 16)}</button></div>
          </div>
        </div>
        ${body}
      </section>`;
  }

  /* ================================================================ the rule builder (Registre „Filtru predefinit” markup) */
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  function ruleBuilder(v, e, part, idp) {
    const block = v[part];
    const rules = block.rules || [];
    const fields = fieldsOf(v.source);
    const options = fields.map((f) => [f.key, f.label]);
    const add = `<button class="btn btn-text-primary btn-sm" type="button" data-kpi-rule-add="${part}">${icon("plus-large", 16)}<span>Adaugă condiție</span></button>`;
    const sel = (id, attrs, placeholder, opts, value, { error = false, label = "" } = {}) => U().renderFoSelectControl?.({ id, attrs, error, label, optionsHtml: `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>${opts.map(([val, l]) => `<option value="${esc(val)}"${val === value ? " selected" : ""}>${esc(l)}</option>`).join("")}` }) || "";
    const condRow = (r, i) => {
      const f = fieldOf(v.source, r.column);
      const err = e[`${part}.rule.${i}`];
      const id = `${idp}-${part}-rule-value-${i}`;
      const values = f?.type === "enum" && ["is", "isNot"].includes(r.op) ? f.values : [];
      const control = values.length
        ? sel(id, `data-kpi-rule="${part}|${i}" data-kpi-rule-part="value"`, "Alege valoarea", values.map((x) => [x, x]), r.value, { error: Boolean(err), label: "Valoare" })
        : `<div class="e-permits-fo-input${err ? " is-error" : ""}"><input id="${id}" type="text" value="${esc(r.value)}" placeholder="${f?.type === "date" ? "zz.ll.aaaa" : "Valoare"}" aria-label="Valoare" autocomplete="off"${err ? ` aria-invalid="true" aria-describedby="${id}-error"` : ""} data-kpi-rule="${part}|${i}" data-kpi-rule-part="value"></div>`;
      const value = NO_VALUE.includes(r.op)
        ? `<div class="e-permits-fo-input is-disabled"><input id="${id}" type="text" value="" placeholder="Fără valoare" aria-label="Valoare (nu este necesară)" disabled></div>`
        : control;
      return `
        <li class="e-permits-doc-cond" data-kpi-cond="${part}|${i}">
          <div class="e-permits-doc-cond__cell">${sel(`${idp}-${part}-rule-col-${i}`, `data-kpi-rule="${part}|${i}" data-kpi-rule-part="column"`, "Coloană", options, r.column, { label: `Coloana condiției ${i + 1}` })}</div>
          <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${sel(`${idp}-${part}-rule-op-${i}`, `data-kpi-rule="${part}|${i}" data-kpi-rule-part="op"`, "Operator", OPS, r.op, { label: `Operatorul condiției ${i + 1}` })}</div>
          <div class="e-permits-doc-cond__cell">${value}${err ? errorHtml(id, err) : ""}</div>
          <button class="btn btn-text-destructive btn-sm btn-icon-only e-permits-doc-cond__remove" type="button" aria-label="Elimină condiția ${i + 1}" data-tooltip-label="Elimină condiția" data-kpi-rule-remove="${part}|${i}">${icon("delete", 16)}</button>
        </li>`;
    };
    if (!v.source) return "";
    return rules.length ? `
      <div class="e-permits-doc-rule e-permits-reg-editor__rule">
        <div class="e-permits-doc-rule__when">${kw(part === "num" ? "Numără înregistrările când" : "Raportează la înregistrările când")}</div>
        <ol class="e-permits-doc-rule__conds" role="list">${rules.map((r, i) => `${i === 0 ? ""
          : i === 1 ? `<li class="e-permits-doc-cond__join e-permits-doc-kwselect" data-fo-list-min="120">${sel(`${idp}-${part}-logic`, `data-kpi-rule-logic="${part}"`, "și", [["and", "și"], ["or", "sau"]], block.logic || "and", { label: "Combinarea condițiilor" })}</li>`
          : `<li class="e-permits-doc-cond__join">${kw(block.logic === "or" ? "sau" : "și")}</li>`}${condRow(r, i)}`).join("")}</ol>
        <div class="e-permits-doc-rule__foot">${add}</div>
      </div>` : E()?.render({ title: "Fără filtru", text: part === "num" ? "Fără filtru, numărătorul ia toate înregistrările sursei din perioadă." : "Fără filtru, numitorul ia toate înregistrările sursei din perioadă.", icon: "filter", compact: true, actionHtml: add }) || "";
  }

  /* ================================================================ form sections (create drawer + profile) */
  const sourceOptions = () => D().sources.filter((s) => s.status === "Publicat").map((s) => [s.id, s.name]);
  function identityFields(v, e, idp, { isNew }) {
    const domains = D().domains.map(([l, n]) => [l, `${n} (${l}-)`]);
    return grid(
      isNew ? selectField(`${idp}-domain`, "domain", "Domeniu", domains, v.domain, { required: true, placeholder: "Alegeți domeniul", error: e.domain }) : "",
      isNew ? textField(`${idp}-code`, "code", "Cod", v.code, { required: true, span: 6, hint: "Codul catalogului: litera domeniului, cratimă, două cifre. Nu se schimbă după creare.", error: e.code }) : "",
      textField(`${idp}-name-ro`, "nameRo", "Denumire (RO)", v.nameRo, { required: true, max: NAME_MAX, counter: true, hint: "Numele afișat utilizatorilor, de exemplu „Cereri procesate în termen”.", error: e.nameRo }),
      textField(`${idp}-name-ru`, "nameRu", "Denumire (RU)", v.nameRu, { span: 6, hint: "Obligatorie la publicare." }),
      textField(`${idp}-name-en`, "nameEn", "Denumire (EN)", v.nameEn, { span: 6, hint: "Obligatorie la publicare." }),
      areaField(`${idp}-desc`, "desc", "Descriere", v.desc, { hint: "Explicația indicatorului pe înțelesul utilizatorului." }),
      areaField(`${idp}-definition`, "definition", "Definiția și modul de verificare", v.definition, { hint: "Ce măsoară și cum se constată atingerea țintei." })
    );
  }
  /* Calcul = four plain sections (drawer: form sections, profile: ntpl cards) — [title, body] */
  function calcSections(v, e, idp) {
    const fields = fieldsOf(v.source);
    const numericCols = fields.filter((f) => NUMERIC.includes(f.type)).map((f) => [f.key, f.label]);
    const dateCols = fields.filter((f) => f.type === "date").map((f) => [f.key, f.label]);
    const measureHint = v.num.measure === "count" ? "Numără înregistrările care trec de filtru." : "Suma și media se calculează doar pe coloane numerice și durate.";
    const out = [["Sursa", grid(
      selectField(`${idp}-source`, "source", "Sursa de date", sourceOptions(), v.source, { required: true, span: 12, placeholder: "Alegeți sursa de date", hint: "Doar sursele de date publicate. Numărătorul și numitorul folosesc aceeași sursă.", error: e.source })
    )]];
    if (!v.source) return out;
    out.push(["Numărătorul", `${grid(
      selectField(`${idp}-measure`, "num.measure", "Ce se calculează", MEASURES, v.num.measure, { required: true, hint: measureHint }),
      v.num.measure === "count" ? "" : selectField(`${idp}-num-column`, "num.column", "Coloana", numericCols, v.num.column, { required: true, placeholder: "Alegeți coloana", error: e["num.column"] }),
      full(ruleBuilder(v, e, "num", idp))
    )}`]);
    out.push(["Numitorul", grid(
      full(`${U().renderCheckOption?.({ label: "Raportează la un numitor (pentru procente și rate)", checked: v.hasDen, attrs: 'data-kpi-field="hasDen"' }) || ""}${e.hasDen ? errorHtml(`${idp}-hasden`, e.hasDen) : ""}`),
      v.hasDen ? selectField(`${idp}-den-source`, "den.source", "Sursa de date a numitorului", sourceOptions(), v.den.source, { required: true, span: 12, placeholder: "Alegeți sursa de date", hint: "Aceeași sursă ca numărătorul; diferă doar filtrul.", error: e["den.source"] }) : "",
      v.hasDen && v.den.source === v.source ? full(ruleBuilder(v, e, "den", idp)) : ""
    )]);
    out.push(["Perioada și afișarea", grid(
      selectField(`${idp}-date`, "dateColumn", "Data de referință", dateCols, v.dateColumn, { required: true, placeholder: "Alegeți coloana de dată", hint: "Data după care o înregistrare intră în perioadă.", error: e.dateColumn }),
      selectField(`${idp}-type`, "valueType", "Tip de valoare", VALUE_TYPES, v.valueType, { required: true, hint: v.valueType === "Stoc" ? "Câte înregistrări sunt la momentul calculului." : "Câte înregistrări au intrat în perioadă." }),
      selectField(`${idp}-format`, "format", "Format", FORMATS, v.format, { required: true }),
      v.format === "duration" ? selectField(`${idp}-unit`, "unit", "Unitatea duratei", UNITS.map((u) => [u, u]), v.unit, { required: true, hint: "Zilele urmează tipul zilelor din configurarea procesului." }) : "",
      selectField(`${idp}-direction`, "direction", "Direcție", DIRECTIONS, v.direction, { required: true }),
      full(U().renderToggle?.({ label: "Recalculare la schimbarea statutului", description: "KPI-urile se calculează zilnic, la 06:00. Activată, KPI-ul se recalculează și la fiecare schimbare de statut a dosarului.", checked: v.recalc, attrs: 'data-kpi-field="recalc"' }) || "")
    )]);
    return out;
  }
  function targetFields(v, e, idp, check) {
    const k = asKpi(v);
    const unit = unitOf(k);
    const avg = check?.series ? average(check.series.map((p) => p.value).slice(0, 11)) : null;
    const hint = avg !== null && v.target === "" ? `Fără țintă KPI-ul nu generează alerte. Ținta implicită propusă: media celor 12 luni precedente, ${fmt(k, k.format === "number" || k.format === "amount" ? Math.round(avg) : round1(avg))}.` : "Fără țintă KPI-ul nu generează alerte.";
    return `
      ${grid(
        textField(`${idp}-target`, "target", "Ținta", v.target, { span: 6, unit, numeric: true, hint, error: e.target }),
        textField(`${idp}-threshold`, "threshold", "Pragul de apropiere", v.threshold, { span: 6, unit: k.format === "percent" ? "p.p." : unit, numeric: true, hint: "Cât de aproape de țintă apare alerta de apropiere.", error: e.threshold }),
        avg !== null && v.target === "" ? full(`<button class="btn btn-text-primary btn-sm" type="button" data-kpi-use-avg="${esc(String(k.format === "number" || k.format === "amount" ? Math.round(avg) : round1(avg)))}">Folosește media de 12 luni</button>`) : ""
      )}`;
  }
  function criteriaFields(v, idp) {
    return grid(
      checkGroup(`${idp}-criteria-label`, "Ținta se poate stabili pe", CRITERIA.map((c) => U().renderCheckOption?.({ label: c, checked: v.criteria.includes(c), attrs: `value="${esc(c)}" data-kpi-criteria` }) || ""),
        "Autoritățile își stabilesc valori proprii pe criteriile bifate, de exemplu 5 zile pentru un serviciu și 3 zile pentru altul."),
      full(U().renderInfoNote?.("<strong>Specialist:</strong> valoarea se calculează pentru fiecare specialist, pe dosarele repartizate lui. Ținta pentru specialiști se stabilește pe rol, de exemplu 3 zile pentru rolul Specialist.") || "")
    );
  }
  function rolesFields(v, idp) {
    return grid(
      checkGroup(`${idp}-roles-label`, "Roluri responsabile", D().roles.map((r) => U().renderCheckOption?.({ label: r, checked: v.roles.includes(r), attrs: `value="${esc(r)}" data-kpi-role` }) || ""),
        v.roles.length ? "" : "Fără roluri responsabile, alertele apar doar în tabloul de bord, fără notificări."),
      full(U().renderInfoNote?.("La apropierea de țintă și la depășirea ei, rolurile responsabile primesc notificarea <strong>o singură dată</strong> pentru fiecare alertă, în SIA GEAP și pe e-mail.") || "")
    );
  }

  /* ---- the value check card (composition: section + KPI cards + eKYC column chart) */
  function checkSection(st, v, idp, { base = null, per = "all", title = "Verificarea valorii" } = {}) {
    const k = asKpi(v, base || {});
    const t = { target: k.target, threshold: k.threshold, own: false };
    const stale = st.check && st.check.key !== calcKey(v);
    const button = `<button class="btn btn-secondary btn-sm" type="button" data-kpi-verify${st.checking ? ' aria-busy="true" disabled' : ""}>${icon("calculator", 16)}<span>Verifică valoarea</span></button>`;
    const busyBtn = button.replace("btn btn-secondary btn-sm", "btn btn-secondary btn-sm btn-loading");
    let body;
    if (st.checking) body = E()?.render({ title: "Se calculează valoarea…", text: "Perioada curentă și perioada precedentă, pe sursa de date aleasă.", loading: true, compact: true }) || "";
    else if (st.check) {
      const val = { cur: st.check.values[0], prev: st.check.values[1], num: st.check.values[2], den: st.check.values[3], pnum: st.check.values[4], pden: st.check.values[5] };
      body = `
        ${stale ? U().renderNotice?.("warning", "Ați schimbat calculul după verificare: verificați din nou valoarea.") || "" : ""}
        <div class="e-permits-chart">
          ${valueCards(k, val, t, { checkedAt: st.check.label })}
          ${trendChart(k, st.check.series, t)}
        </div>`;
    } else body = E()?.render({ title: "Valoarea nu a fost verificată", text: "Verificați valoarea curentă și pe cea a perioadei precedente înainte de salvare.", icon: "calculator", compact: true }) || "";
    return `
      <section class="e-permits-dosar-profil__section" aria-labelledby="${idp}-check-title">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="${idp}-check-title">${esc(title)}</h2>
          <div class="e-permits-passport__heading-tools">${st.checking ? busyBtn : button}</div>
        </div>
        <div aria-live="polite">${body}</div>
      </section>`;
  }
  function runCheck(st, v, rerender, per = "all") {
    const errors = validate(v, { steps: [2], selfId: "x" });
    if (Object.keys(errors).length) { st.errors = { ...st.errors, ...errors }; rerender({ keep: firstErrorSel(st.idp, errors) }); showError(document, firstErrorSel(st.idp, errors)); return; }
    st.checking = true;
    rerender({ keep: "[data-kpi-verify]" });
    const values = calcDraft(v);
    window.setTimeout(() => {
      st.checking = false;
      const fake = { id: `draft-${hash(calcKey(v))}`, format: v.format, unit: v.unit, values: { [per]: values }, status: "Activ" };
      st.check = { key: calcKey(v), values, series: seriesOf(fake, per), label: `Verificat acum, pe datele de la ${longDate(D().calculatedAt)}, 06:00.` };
      rerender({ keep: "[data-kpi-verify]" });
    }, demo.has("verificare-lenta") ? 60000 : 900);
  }
  const ERROR_SEL = {
    domain: "domain", code: "code", nameRo: "name-ro", source: "source", "num.column": "num-column", "den.source": "den-source", dateColumn: "date",
    target: "target", threshold: "threshold", hasDen: "hasden"
  };
  /* a failed step / save brings the first error into view (the focus itself never scrolls: preventScroll) */
  const showError = (root, sel) => { if (sel) root?.querySelector(sel)?.closest(".e-permits-fo-field, .e-permits-doc-cond, .e-permits-check-option, .e-permits-user-create__field")?.scrollIntoView({ block: "center" }); };
  function firstErrorSel(idp, errors) {
    const key = Object.keys(errors)[0];
    if (!key) return "";
    const m = /^(num|den)\.rule\.(\d+)$/.exec(key);
    if (m) return `#${idp}-${m[1]}-rule-value-${m[2]}`;
    return key === "hasDen" ? '[data-kpi-field="hasDen"]' : `#${idp}-${ERROR_SEL[key] || key}`;
  }

  /* ---- read-only passport blocks (a global KPI seen by an authority) */
  const rulesText = (v, part) => {
    const block = v[part];
    if (!block?.rules?.length) return "toate înregistrările";
    return block.rules.map((r) => `${fieldOf(v.source, r.column)?.label || r.column} ${OPS.find(([o]) => o === r.op)?.[1] || r.op}${NO_VALUE.includes(r.op) ? "" : ` „${r.value}”`}`).join(block.logic === "or" ? " sau " : " și ");
  };
  const measureText = (v) => (v.num.measure === "count" ? "Număr" : `${MEASURES.find(([m]) => m === v.num.measure)?.[1]} · ${fieldOf(v.source, v.num.column)?.label || ""}`);
  function readDefinition(k) {
    const v = draftOf(k);
    const block = (title, rows) => A().renderPassportBlock?.(title, rows) || "";
    return `
      ${block("Identificare", [
        ["Denumire (RO)", esc(v.nameRo)], ["Denumire (RU)", v.nameRu ? esc(v.nameRu) : dash], ["Denumire (EN)", v.nameEn ? esc(v.nameEn) : dash],
        ["Descriere", v.desc ? esc(v.desc) : dash], ["Definiția și modul de verificare", v.definition ? esc(v.definition) : dash]
      ])}
      ${block("Calcul", [
        ["Sursa de date", esc(sourceName(v.source))], ["Numărător", esc(`${measureText(v)} · ${rulesText(v, "num")}`)],
        ["Numitor", v.hasDen ? esc(rulesText(v, "den")) : dash], ["Data de referință", esc(fieldOf(v.source, v.dateColumn)?.label || "")],
        ["Tip de valoare", esc(v.valueType)], ["Format", esc(formatLabel(k))], ["Direcție", esc(DIRECTIONS.find(([d]) => d === v.direction)?.[1] || "")],
        ["Recalculare la schimbarea statutului", v.recalc ? "Da" : "Nu"]
      ])}`;
  }
  function readTarget(k) {
    const block = (title, rows) => A().renderPassportBlock?.(title, rows) || "";
    return `
      ${block("Ținta globală", [["Ținta", hasTarget(k) ? esc(fmt(k, k.target)) : "Fără țintă"], ["Pragul de apropiere", k.threshold !== null && k.threshold !== undefined ? esc(fmtThreshold(k, k.threshold)) : dash]])}
      ${block("Criterii de setare și responsabili", [["Criterii de setare", k.criteria?.length ? esc(k.criteria.join(", ")) : dash], ["Roluri responsabile", k.roles?.length ? esc(k.roles.join(", ")) : dash]])}`;
  }

  /* ================================================================ LIST (US-400) */
  const STATE = (k, w = who()) => {
    if (isPlanned(k)) return ["Planificat", "warning"];
    if (isDraftK(k)) return ["Ciornă", "neutral"];
    if (k.status !== "Activ") return ["Inactiv", "neutral"];
    if (w.local && k.level === "Global" && inheritOf(k, w.authority)?.active === false) return [`Dezactivat în ${authName(w.authority)}`, "neutral"];
    return ["Activ", "success"];
  };
  const levelText = (k) => (k.level === "Global" ? "Global" : `Autoritate · ${authName(k.authority)}`);
  const rowOf = (k) => {
    const w = who();
    const per = perimeterOf(k, w);
    const t = targetFor(k, w.local ? w.authority : null);
    const val = valuesOf(k, per);
    const [stare, tone] = STATE(k, w);
    return {
      id: k.id, cod: k.code, denumire: k.names.ro, domeniu: domainName(domainOf(k.code)), sursa: sourceName(k.source), format: formatLabel(k),
      tinta: hasTarget(t) ? fmt(k, t.target) : "", tintaProprie: t.own, valoare: valueText(k, val.cur), valoareNum: val.cur, zona: zone(k.direction, val.cur, t.target, t.threshold),
      nivel: k.level === "Global" ? "Global" : "Autoritate", autoritate: k.level === "Global" ? "" : authName(k.authority), stare, stareTone: tone,
      versiune: lastVersion(k) ? String(lastVersion(k).version) : "", nepublicat: unpublished(k),
      actualizat: k.updatedAt || "", k
    };
  };
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const w = who();
    const menu = w.has;
    const mine = authName(w.authority);
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 10,
      defaultSort: "cod",
      defaultSortDirection: "asc",
      columns: {
        cod: { label: "Cod", width: 104, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
        sursa: { label: "Sursa de date", width: 216, sortable: true },
        format: { label: "Format", width: 136 },
        tinta: { label: "Ținta", width: 152, sortable: true },
        valoare: { label: "Valoarea curentă", width: 176, sortable: true },
        nivel: { label: "Nivel", width: 168, sortable: true },
        stare: { label: "Stare", width: 168, sortable: true },
        versiune: { label: "Versiune", width: 168, sortable: true },
        actualizat: { label: "Actualizat", width: 184, sortable: true },
        ...(menu ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după cod sau denumire",
          columns: ["cod", "denumire", "sursa", "format", "tinta", "valoare", "nivel", "stare", "versiune", "actualizat", ...(menu ? ["actiuni"] : [])],
          tabs: w.central
            ? [{ id: "toate", label: "Toate", filter: "all" }, { id: "globale", label: "Globale", filter: "level:global" }, { id: "autoritati", label: "Ale autorităților", filter: "level:authority" }]
            : [{ id: "toate", label: "Toate", filter: "all" }, { id: "globale", label: "Moștenite", filter: "level:global" }, { id: "autoritati", label: `Ale ${mine}`, filter: "level:authority" }],
          defaultTab: "toate",
          primaryAction: canCreate() ? { id: "kpi-new", label: "Creează KPI" } : null,
          toolbarLabel: "Filtrare KPI",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: kpis().map(rowOf)
    };
  }
  const SORT = {
    tinta: (r) => String(r.k.target ?? -1).padStart(12, "0"),
    valoare: (r) => (r.valoareNum === null || r.valoareNum === undefined ? "" : String(Math.round(r.valoareNum * 10)).padStart(12, "0")),
    nivel: (r) => `${r.nivel === "Global" ? 0 : 1}${r.autoritate}`,
    stare: (r) => r.stare,
    versiune: (r) => String(r.versiune || 0).padStart(4, "0"),
    actualizat: (r) => r.actualizat || "0000"
  };
  function rowMenu(row) {
    const k = row.k;
    const w = who();
    const mine = authName(w.authority);
    const items = [
      canEdit(k) && { label: "Editează", icon: "edit", attrs: `data-kpi-row-edit="${esc(k.id)}"` },
      canCreate() && { label: "Clonează", icon: "copy", attrs: `data-kpi-row-clone="${esc(k.id)}"` },
      canInherit(k) && !isPlanned(k) && k.status === "Activ" && (inheritOf(k, w.authority)?.active === false
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: `data-kpi-row-auth="${esc(k.id)}"` }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: `data-kpi-row-auth="${esc(k.id)}"` }),
      canToggle(k) && (k.status === "Activ"
        ? { label: "Dezactivează", icon: "pause", attrs: `data-kpi-row-toggle="${esc(k.id)}"` }
        : { label: "Activează", icon: "rotate-arrow", attrs: `data-kpi-row-toggle="${esc(k.id)}"` })
    ].filter(Boolean);
    if (!items.length) return "";
    const html = U().renderRowActions?.({ menu: items, label: `${k.code} ${k.names.ro}` }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  }
  const twoLines = (top, meta) => `<span class="e-permits-workplace__date-stack"><span>${top}</span><span class="e-permits-workplace__date-meta">${meta}</span></span>`;
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "domeniu", label: "Domeniu", get: (row) => row.domeniu },
        { key: "sursa", label: "Sursa de date", get: (row) => row.sursa },
        { key: "format", label: "Format", get: (row) => row.format },
        { key: "stare", label: "Stare", get: (row) => row.stare }
      ];
    },
    searchText: (row) => `${row.cod} ${row.denumire} ${fold(row.cod)} ${fold(row.denumire)}`,
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: (row, token) => (token === "level:global" ? row.nivel === "Global" : token === "level:authority" ? row.nivel !== "Global" : true),
    rowClass: (row) => (row.stareTone === "success" || row.stare === "Ciornă" ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "cod": return `<span data-cell-tooltip="${esc(row.cod)}">${esc(row.cod)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        case "sursa": return `<span data-cell-tooltip="${esc(row.sursa)}">${esc(row.sursa)}</span>`;
        /* an authority's own target replaces the global one there (US-520) */
        case "tinta": return row.tinta ? (row.tintaProprie ? twoLines(esc(row.tinta), `valoare proprie · globală ${esc(fmt(row.k, row.k.target))}`) : esc(row.tinta)) : dash;
        case "valoare": {
          if (row.valoare === "—") return dash;
          const z = row.zona ? ZONES[row.zona] : null;
          return `<span class="e-permits-kpi-cell">${esc(row.valoare)}${z ? tag(z[0], z[1]) : ""}</span>`;
        }
        case "nivel": return row.nivel === "Global" ? "Global" : twoLines("Autoritate", esc(row.autoritate));
        case "stare": return tag(row.stare, row.stareTone);
        /* the widget list's „Versiune”: the published version, „modificări nepublicate” under it while a saved draft waits */
        case "versiune": return row.versiune ? (row.nepublicat ? twoLines(esc(row.versiune), "modificări nepublicate") : esc(row.versiune)) : twoLines(dash, "nepublicat");
        case "actualizat": return row.actualizat ? twoLines(esc(longDate(row.actualizat)), esc(`${time(row.actualizat)} · ${row.k.updatedBy || ""}`)) : dash;
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    openRow: (id) => openProfile(id, "definitie"),
    rowLabel: (row) => `${row.cod}, ${row.denumire} — deschide KPI-ul`,
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare: true });
      if (!S.data) return E()?.render({ title: "Se încarcă KPI-urile…", loading: true, bare: true });
      /* Feature AC — the exact texts */
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după cod sau denumire, sau schimbă filtrele.", icon: "search", bare: true });
      return E()?.render({
        title: EMPTY_LIST,
        text: canCreate() ? "Creați primul KPI cu „Creează KPI”." : "",
        icon: "chart",
        bare: true,
        actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-kpi-new>Creează KPI</button>' : ""
      });
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
    const head = ["Cod", "Denumire", "Sursa de date", "Format", "Ținta", "Valoarea curentă", "Nivel", "Stare", "Versiune", "Actualizat"];
    const lines = rows.map((r) => [r.cod, r.denumire, r.sursa, r.format, r.tinta || "-", r.valoare, r.nivel === "Global" ? "Global" : `Autoritate ${r.autoritate}`, r.stare, r.versiune || "-", r.actualizat ? `${longDate(r.actualizat)} ${time(r.actualizat)}` : "-"]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "kpi.csv" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Am exportat ${plural(rows.length, "KPI", "KPI")} în kpi.csv.`);
  }

  /* ---------------------------------------------------------------- audit (Feature AC: every operation) */
  /* kpi-publish-v1: every operation also goes to the platform's unique Jurnalul de audit (GEAPEventTimeline.log = the US-262
     record, object KPI + code + version), as widgets */
  const journalEvent = (h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Eșuat" : "Reușit", detail: h.detail || "" });
  const versionAt = (k, at) => (k.versions || []).filter((x) => String(x.at || "") <= String(at)).pop()?.version || 0;
  const journalCtx = (k, h) => {
    const v = versionAt(k, h.at);
    return {
      module: "BackOffice",
      authority: /· (.+)$/.exec(h.role || "")?.[1] || (k.level === "Global" ? "" : authName(k.authority)),
      objectType: "KPI",
      objectId: k.code,
      objectVersion: v ? `versiunea ${v}` : "ciornă",
      related: h.event === EVENTS.publish || h.event === EVENTS.restore ? [{ module: "Calculul KPI", type: "Ultima versiune publicată, folosită la calculul zilnic și în alerte", user: "SIA GEAP" }] : []
    };
  };
  function audit(k, kind, detail = "", changes = null) {
    const list = (D().history[k.id] = D().history[k.id] || []);
    const h = { at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind], detail, ...(changes ? { changes } : {}) };
    list.unshift(h);
    window.GEAPEventTimeline?.log?.(journalEvent(h), journalCtx(k, h));
    if (["create", "clone", "edit", "on", "off", "publish", "restore"].includes(kind)) { k.updatedAt = nowIso(); k.updatedBy = userName(); }
  }

  /* ---------------------------------------------------------------- activate / deactivate (US-402, US-519) */
  function setStatus(k, on, after) {
    if (!canToggle(k)) return;
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); after?.(false); return; }
      k.status = on ? "Activ" : "Inactiv";
      audit(k, on ? "on" : "off");
      after?.(true);
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivați KPI-ul „${k.names.ro}”?`,
      text: k.level === "Global"
        ? "KPI-ul nu se mai calculează și nu mai generează alerte în nicio autoritate. Configurarea se păstrează: îl puteți activa oricând."
        : `KPI-ul nu se mai calculează și nu mai generează alerte în ${authName(k.authority)}. Configurarea se păstrează: îl puteți activa oricând.`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, apply);
  }
  function setAuthActive(k, on, after) {
    if (!canInherit(k)) return;
    const w = who();
    const mine = authName(w.authority);
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); after?.(false); return; }
      const inh = ensureInherit(k, w.authority);
      inh.active = on;
      if (!on) { inh.deactivatedAt = nowIso(); inh.deactivatedBy = userName(); }
      audit(k, on ? "authOn" : "authOff", mine);
      after?.(true);
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivați KPI-ul „${k.names.ro}” pentru ${mine}?`,
      text: `${mine} nu va mai folosi acest KPI global: nu se calculează pentru ${mine} și nu generează alerte în ${mine}. Celelalte autorități nu sunt afectate, iar valorile proprii se păstrează.`,
      confirmLabel: `Dezactivează pentru ${mine}`,
      destructive: true
    }, apply);
  }

  /* ================================================================ PROFILE (US-401 · US-519 · US-520 · US-521) */
  const P = { id: null, tab: "definitie", draft: null, errors: {}, saveError: false, check: null, checking: false, dictQuery: "", dictClosed: new Set(), idp: "kpi-e", compare: null };
  const tabsOf = (k) => {
    const w = who();
    return [
      ["definitie", "Definiție"], ["tinta", "Ținta și responsabili"],
      ...(k.level === "Global" ? [["valori", w.central ? "Autorități" : "Valori proprii"]] : []),
      ["alerte", "Alerte"], ["versiuni", "Versiuni"], ["istoric", "Istoric"]
    ];
  };
  const changedKeys = () => {
    const k = kpiOf(P.id);
    if (!k || !P.draft || !canEdit(k)) return [];
    const base = draftOf(savedOf(k));
    return Object.keys(DRAFT_LABELS).filter((key) => !same(base[key], P.draft[key]));
  };
  const dirty = () => changedKeys().length > 0;
  const profileOpen = () => Boolean(P.id) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "kpi-panel";

  async function openProfile(id, tab = "definitie", { push = true } = {}) {
    await load();
    const k = kpiOf(id);
    if (!who().has || !k || !visible(k)) { showDenied(); return; }
    if (P.id !== id || !P.draft) {
      Object.assign(P, { draft: draftOf(savedOf(k)), errors: {}, saveError: false, checking: false, dictQuery: "", dictClosed: new Set(), compare: null });
      P.check = null;
    }
    registerChangeSource();
    P.id = id;
    P.tab = tabsOf(k).some(([t]) => t === tab) ? tab : "definitie";
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    renderProfile();
    A().writeHash?.(`#kpi/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function closeProfile() {
    P.id = null; P.draft = null;
    document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click();
  }
  /* kpi-publish-v1 (PO: „Publicare cum avem pentru altele”): the widget profile header — Salvează (the draft) · Publică ·
     ⋮; max 2 visible actions */
  function headerActions(k) {
    const w = who();
    const mine = authName(w.authority);
    const d = dirty();
    const canPub = canPublish(k) && (!lastVersion(k) || unpublished(k) || d);
    const menu = [
      canCreate() && { label: "Clonează", icon: "copy", attrs: "data-kpi-clone" },
      canInherit(k) && !noCalc(k) && k.status === "Activ" && (inheritOf(k, w.authority)?.active === false
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: "data-kpi-auth" }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: "data-kpi-auth" }),
      canToggle(k) && (k.status === "Activ" ? { label: "Dezactivează", icon: "pause", attrs: "data-kpi-toggle" } : { label: "Activează", icon: "rotate-arrow", attrs: "data-kpi-toggle" })
    ].filter(Boolean);
    return `
      ${canEdit(k) ? `<button class="btn btn-secondary btn-sm" type="button" data-kpi-save${d ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>` : ""}
      ${canPub ? '<button class="btn btn-primary btn-sm" type="button" data-kpi-publish>Publică</button>' : ""}
      ${menu.length ? (U().renderStackMenu?.(menu, k.names.ro) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : ""}`;
  }
  function headerTop(k) {
    const n = changedKeys().length;
    const status = n
      ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("kpi-draft")) || ""
      : canEdit(k) && unpublished(k) ? A().renderHeaderStatus?.("Modificări nepublicate", "warning", 'data-kpi-pending aria-haspopup="dialog" data-tooltip-text="Vezi modificările"') || "" : "";
    return A().renderPageHeaderTop({
      back: { label: TITLE, attr: "data-kpi-back" },
      title: k.names.ro,
      actions: headerActions(k),
      status,
      caption: k.updatedAt ? `Modificat ${longDate(k.updatedAt)}, ${time(k.updatedAt)} · ${k.updatedBy || ""}` : ""
    });
  }
  function renderProfile({ keep = "" } = {}) {
    const k = kpiOf(P.id);
    const els = A().els || {};
    if (!k || !els.dosarProfilTitleRow) return;
    const active = document.activeElement;
    const keepSel = keep || (active && els.dosarProfilPanelBody?.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const w = who();
    const per = perimeterOf(k, w);
    const t = targetFor(k, w.local ? w.authority : null);
    const val = valuesOf(k, per);
    const z = zone(k.direction, val.cur, t.target, t.threshold);
    const [stare, tone] = STATE(k, w);
    els.dosarProfilTitleRow.innerHTML = headerTop(k);
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["Cod", A().renderProfileCopyCode?.(k.code, `Copiază ${k.code}`) || esc(k.code)],
      ["Nivel", esc(levelText(k))],
      ["Stare", tag(stare, tone)],
      ["Valoarea curentă", `${esc(valueText(k, val.cur))}${z ? ` ${tag(ZONES[z][0], ZONES[z][1])}` : ""}`],
      ["Ultima calculare", noCalc(k) ? dash : esc(`${longDate(D().calculatedAt)}, ${time(D().calculatedAt)}`)],
      ["Versiune publicată", lastVersion(k) ? esc(String(lastVersion(k).version)) : "nepublicat"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const alerts = alertsOf(k);
    const count = { alerte: alerts.length, versiuni: (k.versions || []).length, istoric: Math.min((D().history[k.id] || []).length, 100), valori: w.local && k.level === "Global" ? (inheritOf(k, w.authority)?.own || []).length : 0 };
    const tabs = tabsOf(k);
    els.dosarProfilTabs.innerHTML = tabs.map(([id, label]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="kpi-tab-${id}" type="button" role="tab" aria-controls="kpi-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-kpi-tab="${id}">
        <span>${label}</span>${count[id] ? A().renderPageHeaderTabCount?.(count[id]) || "" : ""}
      </button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "kpi-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `kpi-tab-${P.tab}`);
    const pane = { definitie: definitionTab, tinta: targetTab, valori: valuesTab, alerte: alertsTab, versiuni: versionsTab, istoric: historyTab }[P.tab] || definitionTab;
    body.innerHTML = `${notices(k)}${pane(k)}`;
    if (keepSel) {
      const el = document.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function notices(k) {
    const w = who();
    const mine = authName(w.authority);
    const list = [
      P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }),
      isPlanned(k) && U().renderNotice?.("warning", "<strong>KPI planificat:</strong> datele lui nu sunt încă înregistrate în SIA GEAP. Nu se calculează și nu se poate publica."),
      k.status === "Inactiv" && U().renderNotice?.("warning", "<strong>KPI-ul este inactiv:</strong> nu se calculează și nu generează alerte."),
      isDraftK(k) && U().renderInfoNote?.("<strong>Ciornă.</strong> KPI-ul se calculează, generează alerte și poate fi adăugat în widget-uri după prima publicare."),
      !isDraftK(k) && canEdit(k) && unpublished(k) && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Calculul zilnic și alertele folosesc în continuare versiunea ${esc(String(lastVersion(k).version))}.`),
      w.local && k.level === "Global" && k.status === "Activ" && inheritOf(k, w.authority)?.active === false && U().renderNotice?.("warning", `<strong>KPI-ul este dezactivat pentru ${esc(mine)}:</strong> nu se calculează pentru ${esc(mine)} și nu generează alerte în ${esc(mine)}.`),
      w.local && k.level === "Global" && ["definitie", "tinta"].includes(P.tab) && U().renderInfoNote?.(`KPI global, stabilit de Administratorul central și moștenit de ${esc(mine)}. Valorile globale nu se modifică aici: în tabul „Valori proprii” îl puteți dezactiva pentru ${esc(mine)} sau îi puteți stabili valori proprii.`)
    ].filter(Boolean).join("");
    return list ? `<div class="e-permits-reg-notices">${list}</div>` : "";
  }
  function valueSection(k) {
    const w = who();
    const per = perimeterOf(k, w);
    const t = targetFor(k, w.local ? w.authority : null);
    const val = valuesOf(k, per);
    if (noCalc(k)) return "";
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Valoarea</h2>
          <span class="e-permits-dosar-profil__section-meta">${esc(per === "all" ? "toate autoritățile" : authName(per))}</span>
        </div>
        <div class="e-permits-chart">
          ${valueCards(k, val, t, { checkedAt: `Calculat la ${longDate(D().calculatedAt)}, 06:00${k.recalc ? " și la fiecare schimbare de statut a dosarului" : ""}.` })}
          ${trendChart(k, seriesOf(k, per), t)}
        </div>
      </section>`;
  }
  function definitionTab(k) {
    if (!canEdit(k)) {
      return `
        <div class="e-permits-ntpl-content e-permits-kpi-content--split e-permits-editor-wide">
          <div class="e-permits-ntpl-content__main">${valueSection(k)}${readDefinition(k)}</div>
          <aside class="e-permits-ntpl-content__preview">${dictionaryHtml(P, draftOf(k), P.idp)}</aside>
        </div>`;
    }
    const v = P.draft;
    const e = P.errors;
    if (!P.check && !isPlanned(k)) {
      const per = perimeterOf(k);
      const vals = k.values?.[per] || k.values?.all;
      if (vals) P.check = { key: calcKey(draftOf(k)), values: vals, series: seriesOf(k, per), label: `Ultima calculare: ${longDate(D().calculatedAt)}, 06:00.` };
    }
    return `
      <div class="e-permits-ntpl-content e-permits-kpi-content--split e-permits-editor-wide">
        <div class="e-permits-ntpl-content__main">
          ${cardSection("Identificare", identityFields(v, e, P.idp, { isNew: false }))}
          ${calcSections(v, e, P.idp).map(([title, body]) => cardSection(title, body)).join("")}
          ${isPlanned(k) ? "" : checkSection(P, v, P.idp, { base: k, per: perimeterOf(k) })}
        </div>
        <aside class="e-permits-ntpl-content__preview">${dictionaryHtml(P, v, P.idp)}</aside>
      </div>`;
  }
  function targetTab(k) {
    const w = who();
    const per = perimeterOf(k, w);
    const val = isPlanned(k) ? null : valuesOf(k, per);
    const series = isPlanned(k) ? [] : seriesOf(k, per);
    const two = (main, aside) => `
      <div class="e-permits-ntpl-content e-permits-kpi-content--split e-permits-kpi-content--preview e-permits-editor-wide">
        <div class="e-permits-ntpl-content__main">${main}</div>
        <aside class="e-permits-ntpl-content__preview" data-kpi-preview>${aside}</aside>
      </div>`;
    if (!canEdit(k)) {
      const t = targetFor(k, w.local ? w.authority : null);
      return two(readTarget(k), targetPreview(k, t, val, series, { title: t.own ? `Zonele valorii în ${authName(w.authority)}` : "Zonele valorii" }));
    }
    const v = P.draft;
    return two(`
      ${cardSection("Ținta și pragurile", targetFields(v, P.errors, P.idp, P.check))}
      ${cardSection("Criterii de setare", criteriaFields(v, P.idp))}
      ${cardSection("Responsabili", rolesFields(v, P.idp))}
      ${canToggle(k) ? cardSection("Stare", U().renderToggle?.({ label: "Activ", description: k.level === "Global" ? "Un KPI inactiv nu se calculează și nu generează alerte în nicio autoritate. Se aplică imediat." : "Un KPI inactiv nu se calculează și nu generează alerte. Se aplică imediat.", checked: k.status === "Activ", attrs: "data-kpi-active" }) || "") : ""}`,
      profilePreview());
  }
  function profilePreview() {
    const k = kpiOf(P.id);
    const kk = asKpi(P.draft, k);
    const per = perimeterOf(k);
    return isPlanned(k) ? bandHtml(kk, { target: kk.target, threshold: kk.threshold }) : targetPreview(kk, { target: kk.target, threshold: kk.threshold }, valuesOf(k, per), seriesOf(k, per));
  }
  function createPreview() {
    const kk = asKpi(C.v);
    const ok = C.check && C.check.key === calcKey(C.v);
    const val = ok ? { cur: C.check.values[0], prev: C.check.values[1], num: C.check.values[2], den: C.check.values[3], pnum: C.check.values[4], pden: C.check.values[5] } : null;
    return targetPreview(kk, { target: kk.target, threshold: kk.threshold }, val, ok ? C.check.series : []);
  }

  /* ---- Valori proprii (US-519 / US-520) — the authority's state + own values; the central admin sees every authority */
  const ownTitle = (o) => [o.level === "Autoritate" ? `Autoritate · ${authName(who().authority)}` : o.level === "Subdiviziune" ? `Subdiviziune · ${o.subdivision}` : `Rol · ${o.role}`, o.service ? serviceName(o.service) : ""].filter(Boolean).join(" · ");
  function valuesTab(k) {
    const w = who();
    if (w.central) return inheritanceTab(k);
    const mine = authName(w.authority);
    const inh = inheritOf(k, w.authority) || { active: true, own: [] };
    const t = targetFor(k, w.authority);
    const planned = isPlanned(k);
    /* the pair: global next to own (composition of the eKYC KPI cards) */
    const pair = `
      <ul class="e-permits-kpi-grid" role="list">
        ${kpiCard("Ținta globală", hasTarget(k) ? esc(fmt(k, k.target)) : "—", hasTarget(k) ? `prag ${esc(fmtThreshold(k, k.threshold) || "—")} · ${t.own ? `înlocuită în ${esc(mine)}` : `se aplică în ${esc(mine)}`}` : "fără țintă globală")}
        ${kpiCard(`Ținta ${mine}`, t.own ? esc(fmt(k, t.target)) : "—", t.own ? `prag ${esc(fmtThreshold(k, t.threshold) || "—")} · valoare proprie` : "fără valoare proprie la nivelul autorității")}
      </ul>`;
    const own = inh.own || [];
    const add = planned ? "" : `<button class="btn btn-secondary btn-sm" type="button" data-kpi-own-add>${icon("plus-large", 16)}<span>Adaugă valoare proprie</span></button>`;
    const list = own.length ? A().renderStackedList?.("Valorile proprii", [{ label: "", items: own.map((o) => ({
      plainTitle: ownTitle(o),
      title: esc(ownTitle(o)),
      meta: [esc(`Ținta ${fmt(k, o.target)}`), esc(`Prag de apropiere ${fmtThreshold(k, o.threshold) || "—"}`)],
      actionsHtml: U().renderRowActions?.({ primary: { label: "Editează", attrs: `data-kpi-own-edit="${esc(o.id)}"` }, menu: [{ label: "Elimină", icon: "delete", attrs: `data-kpi-own-remove="${esc(o.id)}"` }], label: ownTitle(o) }) || ""
    })) }], { meta: plural(own.length, "valoare", "valori"), actionHtml: add }) || ""
      : `<section class="e-permits-dosar-profil__section">
          <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Valorile proprii</h2>${add ? `<div class="e-permits-passport__heading-tools">${add}</div>` : ""}</div>
          ${E()?.render({ title: `${mine} folosește valorile globale`, text: `Adăugați o valoare proprie pe ${["autoritate", k.criteria?.includes("Subdiviziune") && "subdiviziune", k.criteria?.includes("Specialist") && "rol (fiecare specialist)"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " sau $1")}: ea înlocuiește ținta globală doar în autoritatea dvs.`, icon: "chart" }) || ""}
        </section>`;
    return `
      ${planned ? "" : cardSection(`Stare în ${mine}`, U().renderToggle?.({ label: `Activ pentru ${mine}`, description: `Dezactivat, KPI-ul nu se calculează pentru ${mine} și nu generează alerte în ${mine}. Se aplică imediat.`, checked: inh.active !== false && k.status === "Activ", disabled: k.status !== "Activ", attrs: "data-kpi-auth-active" }) || "")}
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Valori globale și valori proprii</h2></div>
        ${pair}
      </section>
      ${list}
      ${U().renderInfoNote?.(`Valorile proprii se aplică doar în ${esc(mine)} și înlocuiesc valorile globale în calcul, în alerte și în notificări. Cea mai specifică valoare câștigă: rol, apoi subdiviziune, apoi autoritate.`) || ""}`;
  }
  function inheritanceTab(k) {
    const items = D().authorities.map((a) => {
      const inh = inheritOf(k, a.id) || { active: true, own: [] };
      const t = targetFor(k, a.id);
      const on = inh.active !== false && k.status === "Activ";
      return {
        plainTitle: a.name,
        title: esc(`${a.name} · ${a.long}`),
        badges: [tag(on ? "Activ" : k.status === "Activ" ? "Dezactivat pentru autoritate" : "Inactiv", on ? "success" : "neutral")],
        meta: [
          esc(inh.own?.length ? plural(inh.own.length, "valoare proprie", "valori proprii") : "valorile globale"),
          esc(hasTarget(t) ? `ținta în vigoare ${fmt(k, t.target)}${t.own ? " (proprie)" : ""}` : "fără țintă"),
          ...(inh.active === false && inh.deactivatedAt ? [esc(`dezactivat la ${longDate(inh.deactivatedAt)} · ${inh.deactivatedBy || ""}`)] : [])
        ]
      };
    });
    return `
      ${A().renderStackedList?.("Moștenirea în autorități", [{ label: "", items }], { meta: plural(items.length, "autoritate", "autorități") }) || ""}
      ${U().renderInfoNote?.("Un KPI global este moștenit de toate autoritățile. Fiecare autoritate îl poate dezactiva pentru ea și îi poate stabili valori proprii, doar în autoritatea ei; valorile globale le modificați doar dvs.") || ""}`;
  }

  /* ---- Alerte (US-521) */
  function alertsOf(k) {
    const w = who();
    return D().alerts.filter((a) => a.kpi === k.id && (w.central || a.authority === w.authority));
  }
  function alertsTab(k) {
    const w = who();
    const mine = authName(w.authority);
    const t = targetFor(k, w.local ? w.authority : null);
    const roles = k.roles?.length ? k.roles.join(", ") : "";
    const rules = !hasTarget(t)
      ? U().renderNotice?.("info", "<strong>KPI-ul nu are țintă:</strong> nu generează alerte și nu trimite notificări.")
      : U().renderInfoNote?.(`<strong>Apropiere de țintă:</strong> valoarea intră în pragul de ${esc(fmtThreshold(k, t.threshold) || "—")} față de ținta ${esc(fmt(k, t.target))}${t.own ? " (valoare proprie)" : ""}. <strong>Ținta depășită:</strong> valoarea trece de țintă în sensul nefavorabil. ${roles ? `Se notifică ${esc(roles)} — în SIA GEAP și pe e-mail, o singură dată pentru fiecare alertă.` : "Nu sunt roluri responsabile: alerta nu trimite notificări."}`);
    const off = k.status !== "Activ" || (w.local && k.level === "Global" && inheritOf(k, w.authority)?.active === false);
    const offNote = off ? U().renderNotice?.("warning", w.local && k.status === "Activ" ? `KPI-ul este dezactivat pentru ${esc(mine)}: nu generează alerte în ${esc(mine)}.` : "KPI-ul nu este activ: nu generează alerte.") : "";
    const events = alertsOf(k).map((a) => ({
      idx: D().alerts.indexOf(a),
      at: a.at,
      user: "SIA GEAP",
      role: "Calculul zilnic, 06:00",
      type: `${ALERT_KIND[a.kind]} · ${authName(a.authority)}`,
      status: a.kind === "exceeded" ? "Critic" : "Avertizare",
      tone: a.kind === "exceeded" ? "danger" : "pending",
      statusTag: false,
      detail: `${dot(`Valoarea ${fmt(k, a.value)}, ținta ${fmt(k, a.target)}${a.own ? " (valoare proprie)" : ""}, prag ${fmtThreshold(k, a.threshold)}`)} Notificați o singură dată: ${a.roles.join(", ")} — ${plural(a.recipients, "destinatar", "destinatari")}, în SIA GEAP și pe e-mail.`
    }));
    return `
      <div class="e-permits-reg-notices">${[offNote, rules].filter(Boolean).join("")}</div>
      ${window.GEAPEventTimeline?.html("Alertele generate", events, { openAttrs: (item) => `data-kpi-alert="${item.idx}"`, meta: events.length ? "Cele mai noi primele" : "", empty: off || !hasTarget(t) ? "KPI-ul nu a generat alerte." : "KPI-ul nu a generat încă alerte: valoarea este în zona favorabilă." }) || ""}`;
  }
  function historyTab(k) {
    const events = (D().history[k.id] || []).slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: "Reușit", detail: h.detail || "" }));
    return window.GEAPEventTimeline?.html("Istoricul modificărilor", events, { meta: events.length ? "Cele mai noi primele" : "", empty: "Pentru acest KPI nu s-au înregistrat încă modificări.", openAttrs: (item, i) => `data-kpi-event="${i}"` }) || "";
  }

  /* ================================================================ event + alert details (the Jurnal audit-event pattern:
     `#dosar-detail-modal` with info cards; rows = GEAPEventTimeline items with openAttrs — pointer + hover on the row) */
  const evId = (seed) => `EV-KPI-${String(hash(seed)).padStart(10, "0").slice(0, 10)}`;
  const corrId = (seed) => `COR-${(hash(`c:${seed}`) >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  const stampText = (iso) => `${longDate(iso)}, ${time(iso)}`;
  const addMinutes = (iso, m) => { const d = new Date(iso); d.setMinutes(d.getMinutes() + m); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; };
  /* „Modificări (N)” = the widget publish / compare list: stacked rows, previous value struck through → new value */
  const diffHtml = (c) => (c.before === "—" || !c.before ? `<strong>${esc(c.after)}</strong>`
    : c.after === "—" || !c.after ? `<span class="e-permits-event-diff__before">${esc(c.before)}</span>`
    : `<span class="e-permits-event-diff"><span class="e-permits-event-diff__before">${esc(c.before)}</span><span aria-hidden="true">→</span><span class="u-visually-hidden">devine</span><strong>${esc(c.after)}</strong></span>`);
  const changesOf = (h) => h.changes || String(h.detail || "").split(" · ").map((part) => /^(.+?): (.+?) → (.+)$/.exec(part)).filter(Boolean).map(([, label, before, after]) => ({ label, before, after }));
  function openModal(title, subtitle, body, buttons) {
    const modal = document.querySelector("#dosar-detail-modal");
    if (!modal) return;
    modal.querySelector("[data-dosar-detail-title]").textContent = title;
    modal.querySelector("[data-dosar-detail-subtitle]").textContent = subtitle;
    modal.querySelector("[data-dosar-detail-body]").innerHTML = body;
    modal.querySelector("[data-dosar-detail-buttons]").innerHTML = buttons;
    window.__modal?.open?.("#dosar-detail-modal");
  }
  const closeBtn = '<button class="btn btn-primary btn-rounded" type="button" data-dosar-detail-close>Închide</button>';
  function openEventDetail(k, index) {
    const h = (D().history[k.id] || [])[Number(index)];
    if (!h) return;
    const info = (title, rows) => A().renderInfoCard?.(title, rows) || "";
    const changes = changesOf(h);
    const where = /· (.+)$/.exec(h.role || "")?.[1] || (k.level === "Global" ? "Toate autoritățile (Global)" : authName(k.authority));
    const seed = `${k.id}:${h.at}:${h.event}`;
    openModal(h.event, k.names.ro, `
      ${info("Date generale", [
        ["Acțiunea", esc(h.event)], ["KPI", esc(`${k.code} · ${k.names.ro}`)], ["Data și ora", esc(stampText(h.at))],
        ["Autor", esc(h.by)], ["Rolul", esc(String(h.role || "").replace(/ · .+$/, ""))], ["Autoritate", esc(where)],
        ...(!changes.length && h.detail ? [["Detalii", esc(h.detail)]] : [])
      ])}
      ${changes.length ? A().renderStackedList?.(`Modificări (${changes.length})`, [{ label: "", items: changes.map((c) => ({ plainTitle: c.label, title: esc(c.label), meta: [diffHtml(c)] })) }]) || "" : ""}
      ${info("Corelare", [["Identificator eveniment", U().renderCopyCode?.(evId(seed), `Copiază ${evId(seed)}`) || esc(evId(seed))], ["Identificator de corelare", U().renderCopyCode?.(corrId(seed), `Copiază ${corrId(seed)}`) || esc(corrId(seed))]])}`, closeBtn);
  }
  function openAlertDetail(index) {
    const a = D().alerts[Number(index)];
    const k = a ? kpiOf(a.kpi) : null;
    if (!a || !k) return;
    const info = (title, rows) => A().renderInfoCard?.(title, rows) || "";
    const z = a.kind === "exceeded" ? "critic" : "avertizare";
    const t = { target: a.target, threshold: a.threshold, own: a.own };
    const d = new Date(a.at);
    const sent = addMinutes(a.at, 1);
    /* the same alert's story: triggered → notified once → back in the favourable zone (when a later calculation says so) */
    const later = D().alerts.filter((x) => x.kpi === a.kpi && x.authority === a.authority && x.at > a.at).sort((x, y) => (x.at < y.at ? -1 : 1))[0];
    const story = [
      ...(later ? [{ at: addMinutes(later.at, -1440 * 2), user: "SIA GEAP", role: "Calculul zilnic, 06:00", type: "Revenită în zona favorabilă", status: "Reușit", detail: "Valoarea a ieșit din zona alertei; o alertă nouă se poate declanșa la următoarea apropiere sau depășire." }]
        : [{ at: "", user: "SIA GEAP", type: "Revenire în zona favorabilă", status: "Urmează", detail: "Când calculul zilnic arată valoarea în zona favorabilă." }]),
      { at: sent, user: "SIA GEAP", role: "Notificări", type: "Notificare trimisă", status: "Reușit", detail: `${a.roles.join(", ")} — ${plural(a.recipients, "destinatar", "destinatari")}, în SIA GEAP și pe e-mail, o singură dată.` },
      { at: a.at, user: "SIA GEAP", role: "Calculul zilnic, 06:00", type: `Alertă declanșată · ${ALERT_KIND[a.kind]}`, status: z === "critic" ? "Critic" : "Avertizare", tone: z === "critic" ? "danger" : "pending", statusTag: false, detail: dot(`Valoarea ${fmt(k, a.value)}, ținta ${fmt(k, a.target)}, prag ${fmtThreshold(k, a.threshold)}`) }
    ];
    const kk = { ...k, target: a.target, threshold: a.threshold };
    openModal(ALERT_KIND[a.kind], k.names.ro, `
      ${info("Date generale", [
        ["KPI", esc(`${k.code} · ${k.names.ro}`)], ["Zona", tag(ZONES[z][0], ZONES[z][1])], ["Valoarea măsurată", esc(fmt(k, a.value))],
        ["Ținta", esc(`${fmt(k, a.target)}${a.own ? " · valoare proprie" : ""}`)], ["Pragul de apropiere", esc(fmtThreshold(k, a.threshold) || "—")],
        ["Perioada", esc(`${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}, până la ${longDate(a.at)}`)], ["Autoritate", esc(authOf(a.authority)?.long || authName(a.authority))],
        ["Data declanșării", esc(stampText(a.at))]
      ])}
      ${bandHtml(kk, t, { title: "Valoarea față de țintă", current: a.value })}
      ${info("Notificați", [["Roluri", esc(a.roles.join(", "))], ["Destinatari", esc(plural(a.recipients, "persoană", "persoane"))], ["Canale", "SIA GEAP și e-mail"], ["Trimisă", esc(`${stampText(sent)} · o singură dată`)]])}
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Evenimentele aceleiași alerte</h2></div>
        ${window.GEAPEventTimeline?.listHtml(story) || ""}
      </section>`,
      `<button class="btn btn-secondary btn-rounded" type="button" data-kpi-alert-kpi="${esc(k.id)}">Deschide KPI</button>${closeBtn}`);
  }
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    const open = t.closest("[data-kpi-alert-kpi]");
    if (open) { window.__modal?.close?.("#dosar-detail-modal"); openProfile(open.dataset.kpiAlertKpi, "alerte"); return; }
    const root = profileRoot();
    if (!root || !root.contains(t)) return;
    const ev = t.closest("[data-kpi-event]");
    if (ev) { openEventDetail(kpiOf(P.id), ev.dataset.kpiEvent); return; }
    const al = t.closest("[data-kpi-alert]");
    if (al) openAlertDetail(al.dataset.kpiAlert);
  });

  /* ---- save / discard (US-401) — kpi-publish-v1: „Salvează” keeps the edits as the saved, UNPUBLISHED configuration
     (k.pending); the live KPI (k's own fields) keeps calculating with the published version until „Publică”. A KPI never
     published (Ciornă) or planned has no live version: its edits are written on it directly. */
  function save({ silent = false } = {}) {
    const k = kpiOf(P.id);
    if (!k || !canEdit(k)) return false;
    if (!dirty()) return true;
    P.errors = validate(P.draft, { selfId: k.id });
    if (Object.keys(P.errors).length) {
      const first = Object.keys(P.errors)[0];
      P.tab = STEP_OF(first) === 3 ? "tinta" : "definitie";
      renderProfile({ keep: firstErrorSel(P.idp, P.errors) });
      showError(A().els?.dosarProfilPanelBody, firstErrorSel(P.idp, P.errors));
      A().writeHash?.(`#kpi/${k.id}/${P.tab}`, { push: false });
      return false;
    }
    if (demo.has("eroare")) { P.saveError = true; renderProfile(); return false; }
    const keys = changedKeys();
    const v = P.draft;
    const before = savedCfg(k);
    const cfg = fromDraft(v, k);
    const calcChanged = keys.some((key) => ["source", "num", "hasDen", "den", "dateColumn", "format", "valueType", "unit"].includes(key)) && P.check?.key === calcKey(v);
    if (lastVersion(k)) {
      k.pending = same(cfg, liveCfg(k)) ? null : cfg;
      if (calcChanged) k.pendingValues = { ...(k.pendingValues || {}), [perimeterOf(k)]: P.check.values };
      if (!k.pending) delete k.pendingValues;
    } else {
      Object.assign(k, cfg);
      if (calcChanged) k.values = { ...(k.values || {}), [perimeterOf(k)]: P.check.values };
    }
    const changes = diffRows(before, cfg);
    audit(k, "edit", changes.map((c) => c.label).join(" · "), changes);
    P.draft = draftOf(savedOf(k)); P.saveError = false;
    if (!silent) {
      renderProfile({ keep: "[data-kpi-save]" });
      toast("Modificările au fost salvate.");
      refreshList();
    }
    return true;
  }
  /* the configuration of a KPI = what a version keeps (the fromDraft shape, without the code) */
  const liveCfg = (k) => fromDraft(draftOf(k), k);
  const savedCfg = (k) => k.pending || liveCfg(k);
  const savedOf = (k) => ({ ...k, ...savedCfg(k) });
  const lastVersion = (k) => (k.versions || [])[(k.versions || []).length - 1] || null;
  const unpublished = (k) => Boolean(k.pending) && Boolean(lastVersion(k)) && !same(k.pending, liveCfg(k));
  /* seed: data/kpi.json keeps per version only the fields that differed from today's published configuration („set”) and
     the saved draft as the changed fields („pending”); every version also writes its „Publicarea KPI” into the Istoric */
  function seedVersions(k) {
    if (noCalc(k)) { k.versions = []; return; }
    const live = liveCfg(k);
    const seed = k.versions?.length ? k.versions : [{ at: k.updatedAt || D().calculatedAt, by: k.updatedBy || "Anastasia Cojocaru", note: "Prima publicare a KPI-ului." }];
    k.versions = seed.map((v, i) => ({ nr: i + 1, version: i + 1, type: v.type || (i ? "Publicare" : "Prima publicare"), note: v.note || "", at: v.at, by: v.by, config: { ...clone(live), ...clone(v.set || {}) } }));
    if (k.pending) k.pending = { ...clone(live), ...clone(k.pending) };
    const hist = (D().history[k.id] = D().history[k.id] || []);
    const role = k.level === "Global" ? "Administrator central" : `Administrator local · ${authName(k.authority)}`;
    k.versions.forEach((v) => { if (!hist.some((h) => h.event === EVENTS.publish && h.at === v.at)) hist.push({ at: v.at, by: v.by, role, event: EVENTS.publish, detail: `Versiunea ${v.version} · ${v.note}` }); });
    hist.sort((a, b) => (a.at < b.at) - (a.at > b.at));
  }
  /* field-level diff of two configurations → [{ label, before, after }] (plain text, „—” for an empty field) */
  function cfgRows(cfg) {
    const v = draftOf({ ...cfg, code: "" });
    const kk = asKpi(v);
    const yes = (b) => (b ? "Da" : "Nu");
    const text = {
      nameRo: v.nameRo, nameRu: v.nameRu, nameEn: v.nameEn, desc: v.desc, definition: v.definition, source: sourceName(v.source),
      num: v.source ? `${measureText(v)} · ${rulesText(v, "num")}` : "", hasDen: yes(v.hasDen), den: v.hasDen ? rulesText(v, "den") : "",
      dateColumn: fieldOf(v.source, v.dateColumn)?.label || "", valueType: v.valueType, format: formatLabel(kk), unit: v.format === "duration" ? v.unit : "",
      direction: DIRECTIONS.find(([d]) => d === v.direction)?.[1] || "", recalc: yes(v.recalc),
      target: hasTarget(kk) ? fmt(kk, kk.target) : "Fără țintă", threshold: fmtThreshold(kk, kk.threshold), criteria: v.criteria.join(", "), roles: v.roles.join(", ")
    };
    return Object.keys(DRAFT_LABELS).map((key) => [DRAFT_LABELS[key][0], String(text[key] ?? "")]);
  }
  function diffRows(a, b) {
    const rb = cfgRows(b);
    return cfgRows(a).map(([lbl, va], i) => [lbl, va, rb[i][1]]).filter(([, va, vb]) => va !== vb).map(([lbl, va, vb]) => ({ label: lbl, before: va || "—", after: vb || "—" }));
  }
  /* „Modificări (N)” = the widget publish / restore / compare list (`.e-permits-wid-changes`) */
  const changesList = (changes, title = "Modificări") => A().renderStackedList?.(`${title} (${changes.length})`, [{ label: "", items: changes.map((c) => ({ plainTitle: c.label, title: esc(c.label), meta: [diffHtml(c)] })) }], { className: "e-permits-wid-changes" }) || "";

  /* ---- Versiuni (the widget tab): GEAPEventTimeline „Versiuni publicate”; an entry opens its version window */
  function versionsTab(k) {
    const cur = lastVersion(k);
    const list = [...(k.versions || [])].reverse();
    const n = list.length;
    const compareBtn = n + (unpublished(k) ? 1 : 0) > 1 && !P.compare ? `<button class="btn btn-secondary btn-sm" type="button" data-kpi-compare-open>${icon("history", 16)}<span>Compară versiuni</span></button>` : "";
    const events = list.map((v) => ({
      at: v.at,
      user: v.by,
      type: `Versiunea ${v.version}${v.nr === cur.nr ? " · curentă" : ""}${/^Restaurare/.test(v.type) ? ` · ${v.type.toLocaleLowerCase("ro")}` : ""}`,
      status: "Reușit",
      detail: v.note
    }));
    return `
      ${n ? U().renderInfoNote?.(`Calculul zilnic, alertele și widget-urile folosesc doar ultima versiune publicată: <strong>${esc(String(cur.version))}</strong>. Fiecare publicare crește versiunea cu 1; restaurarea publică o versiune nouă cu configurația celei alese.`) || "" : ""}
      ${window.GEAPEventTimeline?.html("Versiuni publicate", events, { meta: n ? plural(n, "versiune", "versiuni") : "", actionHtml: compareBtn, empty: isPlanned(k) ? "Un KPI planificat nu se publică." : "KPI-ul nu a fost publicat încă.", openAttrs: (item, i) => `data-kpi-ver-view="${list[i].nr}" aria-haspopup="dialog"` }) || ""}
      ${P.compare && n ? compareHtml(k) : ""}`;
  }
  const compareChoices = (k) => [...[...k.versions].reverse().map((v) => [String(v.nr), `Versiunea ${v.version} · ${longDate(v.at)}${v.nr === lastVersion(k).nr ? " (curentă)" : ""}`, v.config]), ...(unpublished(k) ? [["draft", "Modificările nepublicate", k.pending]] : [])];
  function compareHtml(k) {
    const choices = compareChoices(k);
    const pick = (key) => choices.find(([c]) => c === key) || choices[0];
    const [ka, , ca] = pick(P.compare.a);
    const [kb, , cb] = pick(P.compare.b);
    const opts = choices.map(([c, l]) => [c, l]);
    const changes = ka === kb ? [] : diffRows(ca, cb);
    return `
      <section class="e-permits-dosar-profil__section e-permits-wid-compare" aria-labelledby="kpi-compare-title">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="kpi-compare-title">Compară versiuni</h2>
          <div class="e-permits-passport__heading-tools"><button class="btn btn-neutral btn-sm" type="button" data-kpi-compare-close>Închide comparația</button></div>
        </div>
        <div class="e-permits-ntpl-card">${grid(
          selectField("kpi-cmp-a", "cmp.a", "Versiunea de bază", opts, ka, { span: 6 }),
          selectField("kpi-cmp-b", "cmp.b", "Comparată cu", opts, kb, { span: 6 })
        )}</div>
        ${ka === kb
          ? U().renderInfoNote?.("Alegeți două versiuni diferite.") || ""
          : changes.length ? changesList(changes) : U().renderInfoNote?.("Cele două versiuni au aceeași configurație.") || ""}
      </section>`;
  }
  /* ---- version window (Compară · Restaurează · Închide) · restore — the widget dialogs */
  const versionOf = (k, nr) => (k.versions || []).find((v) => String(v.nr) === String(nr)) || null;
  function openVersion(nr) {
    const k = kpiOf(P.id);
    const v = k && versionOf(k, nr);
    if (!v) return;
    const isCurrent = v.nr === lastVersion(k).nr;
    const as = { ...k, ...clone(v.config) };
    G().openModal?.({
      kind: "kpi-version",
      title: `Versiunea ${v.version}${isCurrent ? " · curentă" : ""}`,
      subtitle: k.names.ro,
      body: `
        <div class="e-permits-dosar-profil__card">${[["Tipul modificării", esc(v.type)], ["Data", esc(`${longDate(v.at)}, ${time(v.at)}`)], ["Autor", esc(v.by)], ["Ce s-a schimbat", esc(v.note)]].map((r) => G().detailRow?.(r) || "").join("")}</div>
        ${readDefinition(as)}
        ${readTarget(as)}`,
      footer: `<div class="modal-buttons">${isCurrent ? "" : `<button class="btn btn-neutral btn-rounded" type="button" data-kpi-ver-compare="${v.nr}">Compară cu versiunea curentă</button>${canPublish(k) ? `<button class="btn btn-neutral btn-rounded" type="button" data-kpi-ver-restore="${v.nr}">${icon("rotate-arrow")}<span>Restaurează</span></button>` : ""}`}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
  }
  let restoring = null;
  function openRestore(nr) {
    const k = kpiOf(P.id);
    const v = k && versionOf(k, nr);
    if (!v || !canPublish(k)) return;
    restoring = { id: k.id, nr: v.nr };
    const next = lastVersion(k).version + 1;
    const lost = unpublished(k) || dirty();
    const changes = diffRows(lastVersion(k).config, v.config);
    G().openModal?.({
      kind: "kpi-restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: k.names.ro,
      body: `
        ${U().renderNotice?.(lost ? "warning" : "info", `<strong>Versiunea ${next} reia configurația versiunii ${v.version}.</strong> Calculul zilnic și alertele o folosesc imediat după restaurare.${lost ? " Modificările nepublicate se pierd." : ""}`) || ""}
        ${changes.length ? changesList(changes) : ""}
        ${areaField("kpi-restore-note", "restoreNote", "Ce s-a schimbat", "", { required: true, placeholder: "De ce reveniți la această versiune", hint: "Apare în istoricul versiunilor." })}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-kpi-restore-confirm>Restaurează</button></div>'
    });
  }
  function setModalError(field, message) {
    if (!field) return;
    const box = field.closest(".e-permits-fo-textarea");
    box?.classList.add("is-error");
    field.setAttribute("aria-invalid", "true");
    const wrap = field.closest(".e-permits-fo-field");
    wrap.querySelector(".e-permits-fo-field__error")?.remove();
    wrap.querySelector(".e-permits-fo-field__hint")?.setAttribute("hidden", "");
    wrap.insertAdjacentHTML("beforeend", errorHtml(field.id, message));
    field.setAttribute("aria-describedby", `${field.id}-error`);
    field.focus();
    field.addEventListener("input", () => { box?.classList.remove("is-error"); field.removeAttribute("aria-invalid"); wrap.querySelector(".e-permits-fo-field__error")?.remove(); wrap.querySelector(".e-permits-fo-field__hint")?.removeAttribute("hidden"); field.setAttribute("aria-describedby", `${field.id}-hint`); }, { once: true });
  }
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#kpi-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    const k = kpiOf(restoring.id);
    const v = versionOf(k, restoring.nr);
    restoring = null;
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    const next = lastVersion(k).version + 1;
    const cfg = clone(v.config);
    Object.assign(k, clone(cfg));
    k.pending = null; delete k.pendingValues;
    k.versions.push({ nr: k.versions.length + 1, version: next, type: `Restaurare (din versiunea ${v.version})`, note, at: nowIso(), by: userName(), config: cfg });
    audit(k, "restore", `Versiunea ${v.version} → versiunea ${next} · ${note}`);
    Object.assign(P, { compare: null, draft: draftOf(savedOf(k)), errors: {}, check: null });
    G().closeModal?.();
    renderProfile();
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată ca versiunea ${next}.`);
  }

  /* ---- publish (the widget flow): „Modificări nepublicate” → the shared pending-changes dialog; „Publică” → the publish
     dialog (problems block it, required „Ce s-a schimbat”) → version + 1, success toast */
  let publishing = null;
  function openPending() {
    const k = kpiOf(P.id);
    const last = k && lastVersion(k);
    if (!last) return;
    const changes = diffRows(liveCfg(k), savedCfg(k)).map((c) => ({ area: c.label, detail: `${c.before} → ${c.after}`, at: k.updatedAt || "", user: k.updatedBy || "", status: "Modificat" }));
    A().openPendingChanges?.({ subject: `${k.names.ro} · față de versiunea ${last.version}`, changes, onPublish: canPublish(k) ? () => openPublish() : null });
  }
  function openPublish({ create = false } = {}) {
    if (create) {
      for (const st of [1, 2, 3]) {
        const errors = validate(C.v, { steps: [st] });
        if (Object.keys(errors).length) { C.step = st; C.errors = errors; renderCreate({ keep: firstErrorSel(C.idp, errors) }); showError(sheet, firstErrorSel(C.idp, errors)); return; }
      }
      publishing = { create: true };
    } else {
      const k = kpiOf(P.id);
      if (!k || !canPublish(k)) return;
      publishing = { id: k.id };
      const errors = validate(P.draft, { selfId: k.id });
      if (Object.keys(errors).length) { P.errors = errors; renderProfile(); }
    }
    renderPublish();
  }
  function renderPublish() {
    const k = publishing.create ? null : kpiOf(publishing.id);
    const v = publishing.create ? C.v : P.draft;
    const problems = publishing.create ? [] : Object.values(validate(v, { selfId: k.id }));
    const cur = k ? lastVersion(k) : null;
    const next = (cur?.version || 0) + 1;
    const changes = cur ? diffRows(cur.config, fromDraft(v, k)) : [];
    const note = document.querySelector("#kpi-publish-note")?.value || "";
    const w = who();
    G().openModal?.({
      kind: "kpi-publish",
      title: "Publicare KPI",
      subtitle: v.nameRo.trim() || "KPI nou",
      body: `
        ${problems.length
          ? U().renderNotice?.("error", `<strong>KPI-ul nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
          : U().renderNotice?.("info", cur
            ? `<strong>Versiunea ${next} o înlocuiește pe versiunea ${esc(String(cur.version))}.</strong> ${changes.length ? "Calculul zilnic, alertele și widget-urile folosesc noua versiune imediat după publicare." : "Configurația este aceeași ca în versiunea în vigoare."}`
            : `<strong>Prima publicare: versiunea ${next}.</strong> KPI-ul devine activ ${w.central || (k && k.level === "Global") ? "la nivelul Global" : `în ${esc(authName(w.authority))}`}: se calculează zilnic, generează alerte și poate fi adăugat în widget-uri.`) || ""}
        ${!problems.length && changes.length ? changesList(changes) : ""}
        ${areaField("kpi-publish-note", "publishNote", "Ce s-a schimbat", note, { required: true, placeholder: "De ex. ținta crescută la 92%", hint: "Apare în istoricul versiunilor." })}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-kpi-publish-confirm${problems.length ? ' aria-disabled="true" data-tooltip-reason="Rezolvați mai întâi problemele de mai sus."' : ""}>Publică</button></div>`
    });
  }
  /* the live KPI takes the saved configuration (+ the values checked with it); the version keeps a copy */
  function publishKpi(k, note) {
    const cfg = clone(savedCfg(k));
    Object.assign(k, clone(cfg));
    if (k.pendingValues) { k.values = { ...(k.values || {}), ...k.pendingValues }; delete k.pendingValues; }
    k.pending = null;
    const next = (lastVersion(k)?.version || 0) + 1;
    k.versions = k.versions || [];
    k.versions.push({ nr: k.versions.length + 1, version: next, type: next === 1 ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: cfg });
    if (isDraftK(k)) k.status = "Activ";
    audit(k, "publish", `Versiunea ${next} · ${note}`);
    return next;
  }
  function confirmPublish(button) {
    if (!publishing) return;
    const k0 = publishing.create ? null : kpiOf(publishing.id);
    if (button.getAttribute("aria-disabled") === "true") { if (k0) audit(k0, "rejected", Object.values(validate(P.draft, { selfId: k0.id })).join(" ")); return; }
    const field = document.querySelector("#kpi-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); publishing = null; return; }
    const create = publishing.create;
    publishing = null;
    let k = k0;
    if (create) k = createKpi();
    else if (!save({ silent: true })) { G().closeModal?.(); return; }
    const next = publishKpi(k, note);
    G().closeModal?.();
    if (create) { closeCreate(true); P.draft = null; }
    else P.draft = draftOf(savedOf(k));
    toast(`Versiunea ${next} a KPI-ului „${k.names.ro}” a fost publicată.`);
    openProfile(k.id, create ? "definitie" : P.tab, { push: create });
    refreshList();
  }
  function fromDraft(v, base = {}) {
    return {
      names: { ro: v.nameRo.trim(), ru: v.nameRu.trim(), en: v.nameEn.trim() }, desc: v.desc, definition: v.definition, source: v.source,
      num: clone(v.num), hasDen: v.hasDen, den: v.hasDen ? clone(v.den) : { source: "", logic: "and", rules: [] }, dateColumn: v.dateColumn, valueType: v.valueType,
      format: v.format, unit: v.unit, direction: v.direction, target: num(v.target), threshold: num(v.threshold), criteria: [...v.criteria], roles: [...v.roles], recalc: v.recalc,
      ...(base.code ? {} : { code: v.code.trim() })
    };
  }
  function discard() {
    const k = kpiOf(P.id);
    if (!k) return;
    P.draft = draftOf(savedOf(k)); P.errors = {}; P.saveError = false;
    renderProfile();
  }
  let changeSourceDone = false;
  const registerChangeSource = () => { if (!changeSourceDone && A().registerChangeSource) { changeSourceDone = true; A().registerChangeSource("kpi-draft", changeSource); } };
  const changeSource = () => {
    const k = kpiOf(P.id);
    if (!k || !P.draft) return null;
    const base = draftOf(savedOf(k));
    const show = (key, val) => (key === "recalc" || key === "hasDen" ? (val ? "Da" : "Nu") : Array.isArray(val) ? val.join(", ") || "—" : typeof val === "object" ? "condiții modificate" : A().changeValue?.(val) ?? String(val));
    return {
      name: k.names.ro, applies: "se aplică după Salvează", emptyText: "KPI-ul este salvat.", groups: ["Definiție", "Ținta și responsabili"],
      entries: () => changedKeys().map((key) => ({ undo: key, group: DRAFT_LABELS[key][1], title: DRAFT_LABELS[key][0], tag: ["Modificat", "brand"], detail: ["num", "den"].includes(key) ? "Calculul a fost modificat" : `${show(key, base[key])} → ${show(key, P.draft[key])}` })),
      undo: (key) => { P.draft[key] = clone(base[key]); delete P.errors[key]; renderProfile(); },
      discard,
      save: () => save()
    };
  };

  /* ---- leaving with unsaved edits */
  let leaving = false;
  function guardLeave(event, proceed) {
    if (leaving || !profileOpen() || !dirty()) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    U().askConfirm?.({
      title: "Există modificări nesalvate. Părăsiți KPI-ul?",
      text: "Modificările nesalvate ale KPI-ului se pierd.",
      confirmLabel: "Părăsește KPI-ul",
      cancelLabel: "Rămâi în KPI",
      destructive: true
    }, () => { P.draft = null; leaving = true; try { proceed(); } finally { leaving = false; } });
    return true;
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest?.("[data-nav-item]");
    if (nav) { guardLeave(event, () => nav.click()); return; }
    const back = event.target.closest?.("[data-kpi-back]");
    if (back && guardLeave(event, () => closeProfile())) return;
  }, true);
  window.addEventListener("beforeunload", (event) => { if (profileOpen() && dirty()) { event.preventDefault(); event.returnValue = ""; } });

  /* ================================================================ drawers: „Creează KPI” (US-399) + „Valoare proprie” (US-520) */
  const STEPS = ["Identificare", "Calcul", "Ținta și responsabili", "Revizuire"];
  let C = null;
  let O = null;
  const drawers = {};
  function ensureDrawer(name, { steps = false } = {}) {
    if (drawers[name]) return drawers[name];
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-kpi-drawer="${name}" hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-kpi-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="kpi-${name}-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="kpi-${name}-title"></h2>
              <p class="drawer__subtitle" data-kpi-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-kpi-close>${icon("cross-large", 16)}</button>
          </header>
          ${steps ? '<nav class="e-permits-steps-strip" aria-label="Pașii creării" data-kpi-steps></nav>' : ""}
          <div class="drawer__body" data-kpi-drawer-body></div>
          <footer class="drawer__footer">
            <span class="e-permits-rt__summary" data-kpi-summary aria-live="polite"></span>
            <div class="modal-buttons" data-kpi-buttons></div>
          </footer>
        </aside>
      </div>`;
    drawers[name] = wrap.firstElementChild;
    document.body.appendChild(drawers[name]);
    return drawers[name];
  }
  const openDrawer = (d, focus) => {
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); requestAnimationFrame(() => d.querySelector(focus)?.focus()); }
  };
  const shutDrawer = (d) => { if (window.GEAPDrawer?.close) window.GEAPDrawer.close(d); else { d.hidden = true; document.body.classList.remove("is-drawer-open"); } };
  const nextCode = (letter) => {
    const used = allKpis().map((k) => k.code).filter((c) => domainOf(c) === letter).map((c) => Number(c.split("-")[1]) || 0);
    return `${letter}-${pad((used.length ? Math.max(...used) : 0) + 1)}`;
  };

  /* „Creează KPI” / „Clonează KPI” = the Registre full-screen sheet (`.e-permits-ntpl-sheet.e-permits-reg-editor`, as the
     widget builder): own header + step strip + the save bar; the body = the ntpl page width (1280) with the ntpl two-column
     grid — Calcul: form | dictionary (helper, form wide), Ținta: form | preview (preview wide), Revizuire: blocks | preview */
  let sheet = null;
  function ensureSheet() {
    if (sheet) return sheet;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor e-permits-kpi-editor" data-kpi-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true" data-kpi-close></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-labelledby="kpi-ed-title" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide" data-kpi-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-kpi-ed-top></div></div>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-kpi-steps></nav>
          <div class="e-permits-reg-editor__body" data-kpi-ed-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Pașii KPI-ului" data-kpi-ed-bar></div>
        </div>
      </div>`);
    sheet = document.querySelector("[data-kpi-editor]");
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || sheet.hidden) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (sheet.querySelector("[aria-expanded='true']:not(.e-permits-stack__group-toggle)")) return;
      event.preventDefault();
      closeCreate();
    });
    return sheet;
  }
  const scroller = () => sheet?.querySelector("[data-kpi-ed-scroll]");
  function openCreate(fromId = "") {
    if (!canCreate()) return;
    const src = fromId ? kpiOf(fromId) : null;
    const v = src ? { ...draftOf(src), nameRo: `${src.names.ro} (copie)`.slice(0, NAME_MAX), code: nextCode(domainOf(src.code)) } : blankDraft();
    C = { step: 1, maxStep: 1, errors: {}, saveError: false, v, from: src?.id || "", check: null, checking: false, dictQuery: "", dictClosed: new Set(), idp: "kpi-c", codeTouched: Boolean(src), back: document.activeElement };
    const el = ensureSheet();
    renderCreate();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(src ? "#kpi-c-name-ro" : "#kpi-c-domain")?.focus({ preventScroll: true }));
  }
  function closeCreate(force = false) {
    if (!sheet || sheet.hidden || !C) return;
    const v = C.v;
    const touched = C.from || v.nameRo || v.code || v.source;
    const close = () => {
      const back = C?.back;
      C = null;
      sheet.hidden = true;
      document.documentElement.classList.remove("is-reg-editor-open");
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
    if (force || !touched) { close(); return; }
    U().askConfirm?.({ title: "Renunțați la KPI-ul nou?", text: "Datele completate nu se păstrează.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, close);
  }
  const twoCols = (main, aside, { preview = false, attr = "" } = {}) => `
    <div class="e-permits-ntpl-content${aside ? " e-permits-kpi-content--split" : ""}${preview ? " e-permits-kpi-content--preview" : ""}${aside ? " e-permits-editor-wide" : ""}">
      <div class="e-permits-ntpl-content__main">${main}</div>
      ${aside ? `<aside class="e-permits-ntpl-content__preview"${attr ? ` ${attr}` : ""}>${aside}</aside>` : ""}
    </div>`;
  /* step 1 keeps the two columns of the next steps: the right one = the codes already used in the chosen domain (avoid a
     duplicate code) + the code rule and the next free code */
  function codesContext() {
    const d = C.v.domain;
    const head = `<div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Coduri existente în domeniu</h2></div>`;
    if (!d) return `<section class="e-permits-dosar-profil__section">${head}${E()?.render({ title: "Alegeți domeniul", text: "Aici apar codurile KPI deja folosite în domeniu, ca să nu le repetați.", icon: "checklist", compact: true }) || ""}</section>`;
    const list = kpis().filter((k) => domainOf(k.code) === d).sort((a, b) => (a.code < b.code ? -1 : 1));
    const rule = U().renderInfoNote?.(`Codul = litera domeniului, cratimă și două cifre, de exemplu ${esc(`${d}-\u206004`)}. Următorul cod liber: <strong>${esc(nextCode(d))}</strong>. Codul nu se mai schimbă după creare.`) || "";
    return list.length
      ? A().renderStackedList?.("Coduri existente în domeniu", [{ label: "", items: list.map((k) => ({ plainTitle: k.code, title: esc(`${k.code} · ${k.names.ro}`), meta: [esc(levelText(k)), esc(STATE(k)[0])] })) }], { meta: `${domainName(d)} · ${plural(list.length, "cod", "coduri")}`, introHtml: "" }) + rule || ""
      : `<section class="e-permits-dosar-profil__section">${head}${E()?.render({ title: `Niciun KPI în domeniul ${domainName(d)}`, text: "Codul propus este primul din domeniu.", icon: "checklist", compact: true }) || ""}</section>${rule}`;
  }
  function stepIdentity() { return twoCols(cardSection("Identificare", identityFields(C.v, C.errors, C.idp, { isNew: true })), codesContext()); }
  function stepCalc() {
    return twoCols(`
      ${calcSections(C.v, C.errors, C.idp).map(([title, body]) => cardSection(title, body)).join("")}
      ${C.v.source ? checkSection(C, C.v, C.idp) : ""}`, dictionaryHtml(C, C.v, C.idp));
  }
  function stepTarget() {
    return twoCols(`
      ${cardSection("Ținta și pragurile", targetFields(C.v, C.errors, C.idp, C.check))}
      ${cardSection("Criterii de setare", criteriaFields(C.v, C.idp))}
      ${cardSection("Responsabili", rolesFields(C.v, C.idp))}`, createPreview(), { preview: true, attr: "data-kpi-preview" });
  }
  function stepReview() {
    const v = C.v;
    const k = asKpi(v);
    const w = who();
    const goto = (n) => `<button class="btn btn-text-neutral btn-sm" type="button" data-kpi-goto="${n}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg><span>Editează</span></button>`;
    const block = (title, rows, n) => A().renderPassportBlock?.(title, rows, { actionHtml: goto(n) }) || "";
    const checked = C.check && C.check.key === calcKey(v);
    return twoCols(`
      ${block("Identificare", [
        ["Cod", esc(v.code)], ["Domeniu", esc(domainName(v.domain))], ["Denumire (RO)", esc(v.nameRo.trim())],
        ["Denumire (RU)", v.nameRu ? esc(v.nameRu) : dash], ["Denumire (EN)", v.nameEn ? esc(v.nameEn) : dash]
      ], 1)}
      ${block("Calcul", [
        ["Sursa de date", esc(sourceName(v.source))], ["Numărător", esc(`${measureText(v)} · ${rulesText(v, "num")}`)],
        ["Numitor", v.hasDen ? esc(rulesText(v, "den")) : dash], ["Data de referință", esc(fieldOf(v.source, v.dateColumn)?.label || "")],
        ["Tip de valoare", esc(v.valueType)], ["Format", esc(formatLabel(k))], ["Direcție", esc(DIRECTIONS.find(([d]) => d === v.direction)?.[1] || "")],
        ["Recalculare la schimbarea statutului", v.recalc ? "Da" : "Nu"],
        ["Valoarea verificată", checked ? esc(`${valueText(k, C.check.values[0])} acum · ${valueText(k, C.check.values[1])} în perioada precedentă`) : "Neverificată"]
      ], 2)}
      ${block("Ținta și responsabili", [
        ["Ținta", v.target !== "" ? esc(fmt(k, k.target)) : "Fără țintă: fără alerte"], ["Pragul de apropiere", v.threshold !== "" ? esc(fmtThreshold(k, k.threshold)) : dash],
        ["Criterii de setare", v.criteria.length ? esc(v.criteria.join(", ")) : dash], ["Roluri responsabile", v.roles.length ? esc(v.roles.join(", ")) : dash]
      ], 3)}
      ${U().renderInfoNote?.(`${w.central
        ? "„Publică” creează KPI-ul <strong>activ</strong>, versiunea 1, la nivelul <strong>Global</strong>; este moștenit de toate autoritățile."
        : `„Publică” creează KPI-ul <strong>activ</strong>, versiunea 1, la nivelul autorității <strong>${esc(authName(w.authority))}</strong>; se aplică doar în ${esc(authName(w.authority))}.`} „Salvează ciorna” îl păstrează nepublicat: nu se calculează până la prima publicare.`) || ""}`, createPreview(), { preview: true });
  }
  function renderCreate({ keep = "" } = {}) {
    if (!C || !sheet) return;
    const active = document.activeElement;
    const keepSel = keep || (active && sheet.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = scroller()?.scrollTop || 0;
    const w = who();
    sheet.querySelector("[data-kpi-ed-top]").innerHTML = window.GEAPPageHeader?.top({
      title: C.from ? "Clonează KPI" : "KPI nou",
      titleId: "kpi-ed-title",
      caption: w.central ? "Nivel Global · moștenit de toate autoritățile" : `Nivel Autoritate · ${authName(w.authority)}`
    }) || `<h1 class="e-permits-page-header__title" id="kpi-ed-title">${C.from ? "Clonează KPI" : "KPI nou"}</h1>`;
    sheet.querySelector("[data-kpi-steps]").innerHTML = A().renderStepStrip?.(STEPS, C, "data-kpi-goto") || "";
    sheet.querySelector("[data-kpi-ed-body]").innerHTML = `
      <div class="e-permits-reg-editor__single e-permits-kpi-editor__page" data-kpi-ed-scroll>
        ${C.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
        ${[stepIdentity, stepCalc, stepTarget, stepReview][C.step - 1]()}
      </div>`;
    sheet.querySelector("[data-kpi-ed-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${esc(`Pasul ${C.step} din ${STEPS.length} · ${STEPS[C.step - 1]}`)}</p>
      <div class="e-permits-cfg2__bar-actions">
        ${C.step === 1 ? '<button class="btn btn-neutral btn-md" type="button" data-kpi-close>Anulează</button>' : '<button class="btn btn-neutral btn-md" type="button" data-kpi-prev>Înapoi</button>'}
        <button class="btn btn-neutral btn-md" type="button" data-kpi-draft>Salvează ciorna</button>
        ${C.step < STEPS.length ? '<button class="btn btn-primary btn-md" type="button" data-kpi-next>Continuă</button>' : '<button class="btn btn-primary btn-md" type="button" data-kpi-publish>Publică</button>'}
      </div>`;
    if (scroller() && keep !== "@top") scroller().scrollTop = scroll;
    if (keepSel && keepSel !== "@top") {
      const el = sheet.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function goStep(target) {
    for (let s = C.step; s < target; s += 1) {
      if (s > 3) break;
      const errors = validate(C.v, { steps: [s] });
      if (Object.keys(errors).length) {
        C.step = s; C.errors = errors;
        renderCreate({ keep: firstErrorSel(C.idp, errors) });
        showError(sheet, firstErrorSel(C.idp, errors));
        return;
      }
    }
    C.errors = {};
    C.step = target;
    C.maxStep = Math.max(C.maxStep, target);
    renderCreate({ keep: "@top" });
    if (scroller()) scroller().scrollTop = 0;
    sheet.querySelector("[data-kpi-publish], [data-kpi-next]")?.focus({ preventScroll: true });
  }
  /* kpi-publish-v1 — the widget create flow: „Salvează ciorna” (step Identificare is the minimum) creates a Ciornă without
     a version, opened on its profile; „Publică” (last step, steps 1–3 valid) opens the publish dialog and creates it as
     version 1 (createKpi + publishKpi in confirmPublish) */
  function createKpi() {
    const w = who();
    const v = C.v;
    const id = `kpi-${v.code.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    const k = { id, level: w.central ? "Global" : "Autoritate", ...(w.central ? {} : { authority: w.authority }), status: "Ciornă", ...fromDraft(v), code: v.code.trim(), versions: [] };
    if (v.source) {
      const vals = C.check && C.check.key === calcKey(v) ? C.check.values : calcDraft(v);
      k.values = w.central
        ? Object.fromEntries([["all", vals], ...D().authorities.map((a) => [a.id, calcDraft({ ...v, source: `${v.source}:${a.id}` }).map((x, i) => (x === null ? null : i < 2 && vals[i] !== null ? round1((x + vals[i]) / 2) : x))])])
        : { [w.authority]: vals };
    }
    allKpis().push(k);
    audit(k, C.from ? "clone" : "create", C.from ? `din ${kpiOf(C.from)?.code || ""} · ${levelText(k)}` : `Ciornă · ${levelText(k)}${k.source ? ` · ${sourceName(k.source)}` : ""} · ${formatLabel(k)}`);
    return k;
  }
  function saveDraftKpi() {
    const errors = validate(C.v, { steps: [1] });
    if (Object.keys(errors).length) { C.step = 1; C.errors = errors; renderCreate({ keep: firstErrorSel(C.idp, errors) }); showError(sheet, firstErrorSel(C.idp, errors)); return; }
    if (demo.has("eroare")) { C.saveError = true; renderCreate({ keep: "@top" }); if (scroller()) scroller().scrollTop = 0; return; }
    const k = createKpi();
    closeCreate(true);
    P.draft = null;
    toast(`Ciorna KPI-ului ${k.code} a fost salvată.`);
    openProfile(k.id, "definitie");
    refreshList();
  }

  /* ---- „Valoare proprie” (US-520) */
  function openOwn(ownId = "") {
    const k = kpiOf(P.id);
    if (!k || !canInherit(k)) return;
    const w = who();
    const existing = (inheritOf(k, w.authority)?.own || []).find((o) => o.id === ownId) || null;
    O = { k: k.id, id: existing?.id || "", errors: {}, saveError: false, v: existing ? { level: existing.level, subdivision: existing.subdivision || "", role: existing.role || "", service: existing.service || "", target: String(existing.target ?? ""), threshold: String(existing.threshold ?? "") } : { level: "Autoritate", subdivision: "", role: "", service: "", target: "", threshold: "" } };
    const d = ensureDrawer("own");
    d.querySelector(".drawer__title").textContent = existing ? "Editează valoarea proprie" : "Valoare proprie nouă";
    d.querySelector("[data-kpi-subtitle]").textContent = `${k.code} · ${k.names.ro} · se aplică doar în ${authName(w.authority)}`;
    renderOwn();
    openDrawer(d, "#kpi-o-level");
  }
  function closeOwn() { const d = drawers.own; if (!d || d.hidden) return; O = null; shutDrawer(d); }
  function renderOwn({ keep = "" } = {}) {
    const d = drawers.own;
    if (!O || !d) return;
    const k = kpiOf(O.k);
    const w = who();
    const v = O.v;
    const e = O.errors;
    const active = document.activeElement;
    const keepSel = keep || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const levels = [["Autoritate", `Autoritate · ${authName(w.authority)}`], ...(k.criteria?.includes("Subdiviziune") ? [["Subdiviziune", "Subdiviziune"]] : []), ...(k.criteria?.includes("Specialist") ? [["Rol", "Rol (fiecare specialist)"]] : [])];
    const unit = unitOf(k);
    const kk = { ...k, target: num(v.target), threshold: num(v.threshold) };
    d.querySelector("[data-kpi-drawer-body]").innerHTML = `
      ${O.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
      <div class="e-permits-clas-create e-permits-kpi-form">
        ${drawerSection("Unde se aplică", grid(
          selectField("kpi-o-level", "level", "Nivel", levels, v.level, { required: true, span: v.level === "Autoritate" ? 12 : 6 }),
          v.level === "Subdiviziune" ? selectField("kpi-o-subdivision", "subdivision", "Subdiviziune", (authOf(w.authority)?.subdivisions || []).map((s) => [s, s]), v.subdivision, { required: true, placeholder: "Alegeți subdiviziunea", error: e.subdivision }) : "",
          v.level === "Rol" ? selectField("kpi-o-role", "role", "Rol", SPEC_ROLES(D().roles).map((r) => [r, r]), v.role, { required: true, placeholder: "Alegeți rolul", hint: "Criteriul „Specialist”: ținta se aplică fiecărui specialist cu acest rol, pe dosarele lui.", error: e.role }) : "",
          k.criteria?.includes("Serviciu") ? selectField("kpi-o-service", "service", "Serviciu", [["", "Toate serviciile"], ...D().services], v.service, { span: 12, hint: "Criteriul de setare „Serviciu”: ținta se poate stabili pe un serviciu al autorității." }) : ""
        ))}
        ${drawerSection("Ținta și pragul", grid(
          textField("kpi-o-target", "target", "Ținta", v.target, { required: true, span: 6, unit, numeric: true, hint: hasTarget(k) ? `Ținta globală: ${fmt(k, k.target)}.` : "KPI-ul nu are țintă globală.", error: e.target }),
          textField("kpi-o-threshold", "threshold", "Pragul de apropiere", v.threshold, { span: 6, unit: k.format === "percent" ? "p.p." : unit, numeric: true, hint: hasTarget(k) ? dot(`Pragul global: ${fmtThreshold(k, k.threshold) || "—"}`) : "", error: e.threshold })
        ))}
        ${bandHtml(kk, { target: kk.target, threshold: kk.threshold }, { current: valuesOf(k, w.authority).cur })}
      </div>`;
    d.querySelector("[data-kpi-summary]").textContent = "";
    d.querySelector("[data-kpi-buttons]").innerHTML = `
      <button class="btn btn-neutral btn-md btn-rounded" type="button" data-kpi-close>Anulează</button>
      <button class="btn btn-primary btn-md btn-rounded" type="button" data-kpi-own-save>Salvează</button>`;
    if (keepSel) d.querySelector(keepSel)?.focus?.({ preventScroll: true });
  }
  function saveOwn() {
    const k = kpiOf(O.k);
    const w = who();
    const v = O.v;
    const e = {};
    if (v.level === "Subdiviziune" && !v.subdivision) e.subdivision = "Alegeți subdiviziunea.";
    if (v.level === "Rol" && !v.role) e.role = "Alegeți rolul.";
    const t = num(v.target);
    const th = num(v.threshold);
    if (v.target === "") e.target = "Completați ținta.";
    else if (Number.isNaN(t) || t < 0) e.target = "Introduceți un număr pozitiv.";
    else if (k.format === "percent" && t > 100) e.target = "Procentul poate fi cel mult 100.";
    if (v.threshold !== "" && (Number.isNaN(th) || th < 0)) e.threshold = "Introduceți un număr pozitiv.";
    else if (v.threshold !== "" && k.direction === "down" && th >= t) e.threshold = "Pragul de apropiere trebuie să fie mai mic decât ținta.";
    const inh = ensureInherit(k, w.authority);
    const scope = (o) => `${o.level}|${o.subdivision || ""}|${o.role || ""}|${o.service || ""}`;
    const mine = { id: O.id || `own-${Date.now().toString(36)}`, level: v.level, ...(v.level === "Subdiviziune" ? { subdivision: v.subdivision } : {}), ...(v.level === "Rol" ? { role: v.role } : {}), ...(v.service ? { service: v.service } : {}), target: t, threshold: th };
    if (!Object.keys(e).length && inh.own.some((o) => o.id !== O.id && scope(o) === scope(mine))) e.target = `Există deja o valoare proprie pentru ${ownTitle(mine)}.`;
    O.errors = e;
    if (Object.keys(e).length) { renderOwn({ keep: `#kpi-o-${Object.keys(e)[0]}` }); return; }
    if (demo.has("eroare")) { O.saveError = true; renderOwn(); return; }
    const i = inh.own.findIndex((o) => o.id === O.id);
    if (i >= 0) inh.own[i] = mine; else inh.own.push(mine);
    audit(k, i >= 0 ? "ownEdit" : "ownAdd", `${authName(w.authority)} · ${ownTitle(mine)}: ținta ${fmt(k, t)}${th !== null ? `, prag ${fmtThreshold(k, th)}` : ""}`);
    closeOwn();
    toast("Valoarea proprie a fost salvată.");
    renderProfile();
  }
  function removeOwn(ownId) {
    const k = kpiOf(P.id);
    const w = who();
    const inh = inheritOf(k, w.authority);
    const o = inh?.own.find((x) => x.id === ownId);
    if (!o) return;
    U().askConfirm?.({
      title: "Eliminați valoarea proprie?",
      text: `Pentru ${ownTitle(o)} se va aplica din nou ținta globală${hasTarget(k) ? ` (${fmt(k, k.target)})` : ""}.`,
      confirmLabel: "Elimină",
      destructive: true
    }, () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      inh.own = inh.own.filter((x) => x.id !== ownId);
      audit(k, "ownDel", `${authName(w.authority)} · ${ownTitle(o)}`);
      toast("Valoarea proprie a fost eliminată.");
      renderProfile();
    });
  }

  /* ================================================================ events */
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  /* which form state a control belongs to: the create drawer, the own-value drawer or the profile */
  function ctxOf(el) {
    if (sheet && C && sheet.contains(el)) return { st: C, v: C.v, render: renderCreate, root: sheet };
    if (drawers.own && O && drawers.own.contains(el)) return { st: O, v: O.v, render: renderOwn, root: drawers.own, own: true };
    const root = profileRoot();
    if (root && root.contains(el) && P.draft) return { st: P, v: P.draft, render: renderProfile, root, profile: true };
    return null;
  }
  const reheader = () => {
    const k = kpiOf(P.id);
    const els = A().els || {};
    if (k && els.dosarProfilTitleRow) els.dosarProfilTitleRow.innerHTML = headerTop(k);
  };
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* list */
    if (t.closest('[data-workplace-add-product="kpi-new"], [data-kpi-new]')) { event.preventDefault(); load().then(() => openCreate()); return; }
    const rowEdit = t.closest("[data-kpi-row-edit]");
    if (rowEdit) { openProfile(rowEdit.dataset.kpiRowEdit, "definitie"); return; }
    const rowClone = t.closest("[data-kpi-row-clone]");
    if (rowClone) { openCreate(rowClone.dataset.kpiRowClone); return; }
    const rowToggle = t.closest("[data-kpi-row-toggle]");
    if (rowToggle) { const k = kpiOf(rowToggle.dataset.kpiRowToggle); if (k) setStatus(k, k.status !== "Activ", (ok) => { if (ok) refreshList(); }); return; }
    const rowAuth = t.closest("[data-kpi-row-auth]");
    if (rowAuth) { const k = kpiOf(rowAuth.dataset.kpiRowAuth); if (k) setAuthActive(k, inheritOf(k, who().authority)?.active === false, (ok) => { if (ok) refreshList(); }); return; }

    /* dialogs (publish · restore · version window) */
    const pub = t.closest("[data-kpi-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    if (t.closest("[data-kpi-restore-confirm]")) { confirmRestore(); return; }
    const vcmp = t.closest("[data-kpi-ver-compare]");
    if (vcmp) { const k = kpiOf(P.id); G().closeModal?.(); P.compare = { a: vcmp.dataset.kpiVerCompare, b: String(lastVersion(k).nr) }; renderProfile(); document.querySelector("#kpi-compare-title")?.scrollIntoView({ block: "start" }); return; }
    const vrs = t.closest("[data-kpi-ver-restore]");
    if (vrs) { openRestore(vrs.dataset.kpiVerRestore); return; }
    if (t.closest("[data-kpi-pending]")) { openPending(); return; }

    const ctx = ctxOf(t);
    /* shared form controls (drawer + profile) */
    if (ctx) {
      const { st, v, render } = ctx;
      if (t.closest("[data-kpi-close]") && !ctx.profile) { if (ctx.own) closeOwn(); else closeCreate(); return; }
      const group = t.closest("[data-kpi-dict-group]");
      if (group) { const g = group.dataset.kpiDictGroup; if (st.dictClosed.has(g)) st.dictClosed.delete(g); else st.dictClosed.add(g); render({ keep: `[data-kpi-dict-group="${CSS.escape(g)}"]` }); return; }
      if (t.closest("[data-kpi-dict-clear]")) { st.dictQuery = ""; render({ keep: "[data-kpi-dict-search]" }); return; }
      const addRule = t.closest("[data-kpi-rule-add]");
      if (addRule) { const part = addRule.dataset.kpiRuleAdd; v[part].rules.push({ column: "", op: "is", value: "" }); render({ keep: `#${st.idp}-${part}-rule-col-${v[part].rules.length - 1}` }); afterEdit(ctx); return; }
      const removeRule = t.closest("[data-kpi-rule-remove]");
      if (removeRule) {
        const [part, i] = removeRule.dataset.kpiRuleRemove.split("|");
        v[part].rules.splice(Number(i), 1);
        Object.keys(st.errors).filter((key) => key.startsWith(`${part}.rule.`)).forEach((key) => delete st.errors[key]);
        render({ keep: v[part].rules.length ? `[data-kpi-rule-add="${part}"]` : `[data-kpi-rule-add="${part}"]` });
        afterEdit(ctx);
        return;
      }
      if (t.closest("[data-kpi-verify]")) { runCheck(st, v, render, ctx.profile ? perimeterOf(kpiOf(P.id)) : "all"); return; }
      const avg = t.closest("[data-kpi-use-avg]");
      if (avg) { v.target = avg.dataset.kpiUseAvg; delete st.errors.target; render({ keep: `#${st.idp}-target` }); afterEdit(ctx); return; }
    }
    /* create drawer */
    if (sheet && sheet.contains(t) && C) {
      if (t.closest("[data-kpi-prev]")) { C.errors = {}; C.step -= 1; renderCreate(); return; }
      if (t.closest("[data-kpi-next]")) { goStep(C.step + 1); return; }
      const goto = t.closest("[data-kpi-goto]");
      if (goto) { goStep(Number(goto.dataset.kpiGoto)); return; }
      if (t.closest("[data-kpi-draft]")) { saveDraftKpi(); return; }
      if (t.closest("[data-kpi-publish]")) { openPublish({ create: true }); return; }
      return;
    }
    /* own-value drawer */
    const od = drawers.own;
    if (od && od.contains(t) && O) { if (t.closest("[data-kpi-own-save]")) saveOwn(); return; }
    /* profile */
    const root = profileRoot();
    if (!root || !root.contains(t)) return;
    const tab = t.closest("[data-kpi-tab]");
    if (tab) { P.tab = tab.dataset.kpiTab; renderProfile({ keep: `#kpi-tab-${P.tab}` }); A().writeHash?.(`#kpi/${P.id}/${P.tab}`, { push: false }); return; }
    if (t.closest("[data-kpi-save]")) { if (t.closest("[data-kpi-save]").getAttribute("aria-disabled") !== "true") save(); return; }
    if (t.closest("[data-kpi-publish]")) { openPublish(); return; }
    if (t.closest("[data-kpi-clone]")) { openCreate(P.id); return; }
    if (t.closest("[data-kpi-toggle]")) { const k = kpiOf(P.id); setStatus(k, k.status !== "Activ", (ok) => { if (ok) { renderProfile(); refreshList(); } }); return; }
    if (t.closest("[data-kpi-auth]")) { const k = kpiOf(P.id); setAuthActive(k, inheritOf(k, who().authority)?.active === false, (ok) => { if (ok) { renderProfile(); refreshList(); } }); return; }
    const view = t.closest("[data-kpi-ver-view]");
    if (view) { openVersion(view.dataset.kpiVerView); return; }
    if (t.closest("[data-kpi-compare-open]")) {
      const k = kpiOf(P.id);
      const ch = compareChoices(k);
      P.compare = unpublished(k) ? { a: String(lastVersion(k).nr), b: "draft" } : { a: ch[1]?.[0] || ch[0][0], b: ch[0][0] };
      renderProfile({ keep: "#kpi-cmp-a" });
      return;
    }
    if (t.closest("[data-kpi-compare-close]")) { P.compare = null; renderProfile({ keep: "[data-kpi-compare-open]" }); return; }
    if (t.closest("[data-kpi-own-add]")) { openOwn(); return; }
    const ownEdit = t.closest("[data-kpi-own-edit]");
    if (ownEdit) { openOwn(ownEdit.dataset.kpiOwnEdit); return; }
    const ownRemove = t.closest("[data-kpi-own-remove]");
    if (ownRemove) { removeOwn(ownRemove.dataset.kpiOwnRemove); return; }
    if (t.closest("[data-kpi-back]")) { event.preventDefault(); closeProfile(); }
  });
  /* the target band follows the typed target / threshold without a redraw (the field keeps focus and caret) */
  function refreshBand(ctx) {
    const preview = ctx.root.querySelector("[data-kpi-preview]");
    if (preview) { preview.innerHTML = ctx.profile ? profilePreview() : createPreview(); return; }
    const band = ctx.root.querySelector("[data-kpi-band]");
    if (!band) return;
    let html;
    if (ctx.own) { const k = kpiOf(O.k); const kk = { ...k, target: num(O.v.target), threshold: num(O.v.threshold) }; html = bandHtml(kk, { target: kk.target, threshold: kk.threshold }, { current: valuesOf(k, who().authority).cur }); }
    else { const kk = asKpi(ctx.v, ctx.profile ? kpiOf(P.id) || {} : {}); html = bandHtml(kk, { target: kk.target, threshold: kk.threshold }); }
    band.outerHTML = html;
  }
  /* after a structural edit in the profile: header (status + Salvează) follows */
  function afterEdit(ctx) { if (ctx.profile) reheader(); }
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-kpi-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const k = kpiOf(P.id);
    if (!k) return;
    const tabs = tabsOf(k);
    const i = tabs.findIndex(([id]) => id === tab.dataset.kpiTab);
    const next = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length][0];
    event.preventDefault();
    P.tab = next;
    renderProfile({ keep: `#kpi-tab-${next}` });
  });
  /* typing: the value changes without a redraw (counters live); the header follows in the profile */
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.closest) return;
    if (el.matches("#kpi-publish-note, #kpi-restore-note")) {
      const count = document.querySelector(`[data-kpi-count="${el.id}"]`);
      if (count) { count.textContent = `${el.value.length}/${TEXT_MAX}`; count.classList.toggle("is-over", el.value.length > TEXT_MAX); }
      return;
    }
    const ctx = ctxOf(el);
    if (!ctx) return;
    if (el.matches("[data-kpi-dict-search]")) {
      ctx.st.dictQuery = el.value;
      const pos = el.selectionStart;
      ctx.render({ keep: "[data-kpi-dict-search]" });
      const again = ctx.root.querySelector("[data-kpi-dict-search]");
      if (again) { try { again.setSelectionRange(pos, pos); } catch { /* search input */ } }
      return;
    }
    const rule = el.closest("[data-kpi-rule]");
    if (rule && el.tagName === "INPUT") {
      const [part, i] = rule.dataset.kpiRule.split("|");
      ctx.v[part].rules[Number(i)].value = el.value;
      afterEdit(ctx);
      return;
    }
    const field = el.closest("[data-kpi-field]");
    if (!field || field.tagName === "SELECT" || field.type === "checkbox") return;
    const key = field.dataset.kpiField;
    setPath(ctx.v, key, field.value);
    if (key === "code" && ctx.st === C) C.codeTouched = true;
    if (key === "target" || key === "threshold") refreshBand(ctx);
    const count = ctx.root.querySelector(`[data-kpi-count="${field.id}"]`);
    if (count) { const max = field.tagName === "TEXTAREA" ? TEXT_MAX : NAME_MAX; count.textContent = `${field.value.length}/${max}`; count.classList.toggle("is-over", field.value.length > max); }
    afterEdit(ctx);
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest) return;
    /* switches that act at once (US-402 / US-519): reset now, set on confirm — no toast for toggles */
    if (el.matches("[data-kpi-active]")) {
      const k = kpiOf(P.id);
      if (!k) return;
      const on = el.checked;
      el.checked = k.status === "Activ";
      setStatus(k, on, () => renderProfile({ keep: "[data-kpi-active]" }));
      return;
    }
    if (el.matches("[data-kpi-auth-active]")) {
      const k = kpiOf(P.id);
      if (!k) return;
      const on = el.checked;
      el.checked = !on;
      setAuthActive(k, on, () => renderProfile({ keep: "[data-kpi-auth-active]" }));
      return;
    }
    if (el.matches('[data-kpi-field="cmp.a"], [data-kpi-field="cmp.b"]')) { P.compare = { ...P.compare, [el.dataset.kpiField.slice(4)]: el.value }; renderProfile({ keep: `#kpi-cmp-${el.dataset.kpiField.slice(4)}` }); return; }
    const ctx = ctxOf(el);
    if (!ctx) return;
    const { st, v, render } = ctx;
    const fid = (node) => node.closest(".e-permits-fo-field, .e-permits-doc-cond__cell, .e-permits-doc-cond__join")?.querySelector("button[id], input[id]")?.id || "";
    if (el.matches("[data-kpi-criteria], [data-kpi-role]")) {
      const list = el.matches("[data-kpi-criteria]") ? v.criteria : v.roles;
      const i = list.indexOf(el.value);
      if (el.checked && i < 0) list.push(el.value);
      if (!el.checked && i >= 0) list.splice(i, 1);
      if (el.matches("[data-kpi-role]")) render({ keep: `[data-kpi-role][value="${CSS.escape(el.value)}"]` });
      afterEdit(ctx);
      return;
    }
    const rule = el.closest("[data-kpi-rule]");
    if (rule) {
      const [part, i] = rule.dataset.kpiRule.split("|");
      const r = v[part].rules[Number(i)];
      const which = el.dataset.kpiRulePart;
      /* a typed value is kept by the input handler; redrawing on blur would eat the click that caused it */
      if (el.tagName === "INPUT") { r.value = el.value; return; }
      r[which] = el.value;
      if (which === "column") r.value = "";
      if (which === "op" && NO_VALUE.includes(r.value)) r.value = "";
      delete st.errors[`${part}.rule.${i}`];
      render({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" });
      afterEdit(ctx);
      return;
    }
    if (el.matches("[data-kpi-rule-logic]")) { v[el.dataset.kpiRuleLogic].logic = el.value; render({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" }); afterEdit(ctx); return; }
    const field = el.closest("[data-kpi-field]");
    if (!field || (field.tagName !== "SELECT" && field.type !== "checkbox")) return;
    const key = field.dataset.kpiField;
    const value = field.type === "checkbox" ? field.checked : field.value;
    const old = getPath(v, key);
    setPath(v, key, value);
    delete st.errors[key];
    if (key === "source" && value !== old) {
      /* a new source: columns of the old one drop, the denominator follows */
      const keepCol = (col) => (fieldOf(value, col) ? col : "");
      v.num.column = keepCol(v.num.column);
      v.num.rules = v.num.rules.filter((r) => fieldOf(value, r.column));
      v.dateColumn = keepCol(v.dateColumn);
      if (!v.den.source || v.den.source === old) { v.den.source = value; v.den.rules = v.den.rules.filter((r) => fieldOf(value, r.column)); }
      delete st.errors["den.source"];
      if (st.dictClosed && st === C) st.dictClosed = new Set(fieldsOf(value).map((f) => f.group));
    }
    if (key === "den.source") { delete st.errors["den.source"]; if (value !== v.source) v.den.rules = []; }
    if (key === "hasDen" && value && !v.den.source) v.den.source = v.source;
    if (key === "num.measure" && value === "count") v.num.column = "";
    if (key === "domain" && st === C && (!C.codeTouched || !v.code)) { v.code = nextCode(value); delete st.errors.code; }
    if (ctx.own && key === "level") { v.subdivision = ""; v.role = ""; }
    render({ keep: fid(field) ? `#${CSS.escape(fid(field))}` : `[data-kpi-field="${key}"]` });
    afterEdit(ctx);
  });

  /* ---------------------------------------------------------------- notifications (US-521): the bell of a responsible role */
  (window.GEAPNotifSources = window.GEAPNotifSources || []).push(() => {
    const w = who();
    if (!S.data || !w.has) return [];
    const role = (A().currentAssignment?.() || {}).roleLabel || "";
    return D().alerts.filter((a) => a.roles.includes(role) && (w.central || a.authority === w.authority)).map((a) => {
      const k = kpiOf(a.kpi);
      if (!k || !activeFor(k, a.authority)) return null;
      return {
        id: `kpi:${a.kpi}:${a.authority}:${a.at}`,
        title: a.kind === "exceeded" ? `KPI-ul „${k.names.ro}” a depășit ținta` : `KPI-ul „${k.names.ro}” se apropie de țintă`,
        line: `${k.code} · ${fmt(k, a.value)}, ținta ${fmt(k, a.target)} · ${authName(a.authority)} · trimisă și pe e-mail`,
        at: a.at,
        href: `#kpi/${encodeURIComponent(k.id)}/alerte/${D().alerts.indexOf(a)}`
      };
    }).filter(Boolean);
  });

  /* ---------------------------------------------------------------- routes + denied (Feature AC) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „KPI” este disponibil rolurilor cu permisiunea „Gestionarea KPI”.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#kpi\/([^/]+)(?:\/([a-z]+))?(?:\/(\d+))?$/.exec(hash);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
    /* a bell notification = #kpi/<id>/alerte/<n>: the profile's Alerte tab + the alert's detail */
    load().then(() => openProfile(decodeURIComponent(m[1]), m[2] || "definitie", { push: false })).then(() => { if (m[2] === "alerte" && m[3]) openAlertDetail(m[3]); });
    return true;
  });
  /* Feature AC: the menu item exists only with „Gestionarea KPI” — the roles.json menus give it to the two administrators;
     the demo switch fara-permisiune takes the permission away, so the item goes too */
  let navQueued = false;
  const syncNav = () => {
    navQueued = false;
    if (who().has) return;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${NAV}"]`).forEach((a) => { const li = a.closest("li") || a; if (!li.hidden) li.hidden = true; });
  };
  const boot = () => {
    load();
    if (demo.has("fara-permisiune")) {
      new MutationObserver(() => { if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); } }).observe(document.body, { childList: true, subtree: true });
      syncNav();
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for widgets (Feature 96501), demo states, probes */
  window.GEAPKpi = {
    load, openProfile, openCreate, refreshList, perms: () => who(),
    list: (w = who()) => allKpis().filter((k) => visible(k, w)),
    get: kpiOf,
    /* the published data sources and their fields (widgets pick the same sources, Feature 96501) */
    sources: () => D().sources.filter((src) => src.status === "Publicat"),
    fields: (src) => fieldsOf(src),
    calculatedAt: () => D().calculatedAt,
    /* the value in a perimeter ("all" or an authority id): { cur, prev, num, den, pnum, pden } — cur null = n/a */
    value: (id, per) => { const k = kpiOf(id); return k ? valuesOf(k, per || perimeterOf(k)) : null; },
    series: (id, per) => { const k = kpiOf(id); return k ? seriesOf(k, per || perimeterOf(k)) : []; },
    target: (id, authority = null) => { const k = kpiOf(id); return k ? targetFor(k, authority) : null; },
    zone: (id, value, authority = null) => { const k = kpiOf(id); if (!k) return null; const t = targetFor(k, authority); return zone(k.direction, value, t.target, t.threshold); },
    format: (id, value) => { const k = kpiOf(id); return k ? valueText(k, value) : ""; },
    active: (id, authority = null) => { const k = kpiOf(id); return k ? activeFor(k, authority) : false; }
  };
})();
