/* =====================================================================================
   Administrare › Formulare globale (forms-global-v1, 2026-11-17) — Feature 97122 „Gestionarea formularelor electronice
   globale” (Epic 88655 Constructor de Formulare). Child stories: US-331 registrul (97121) · US-332 crearea (97123) ·
   US-333 editarea metadatelor (97124) · US-334 publicarea (97125) · US-335 istoricul versiunilor (97126) ·
   US-336 activarea / dezactivarea (97127).

   A global form = a Form Designer form that belongs to NO service (only these can be attached to a process transition).
   This module is the OBJECT layer around the existing builder (js/form-builder.js): it owns the registry, the IDs, the
   lifecycle and the versions; the canvas stays the builder's (`GEAPFormBuilder.openGlobal(form, hooks)`).
   NO new engine — the module pattern of KPI / Widgete / Tablouri de bord:
     · list = the BO registry (`window.GEAPShellRegistries["formulare-globale"]`, menu `shellView: "formulare-globale-registry"`)
       drawn as the shared stacked list (`stackItem`) — the Feature's „cards” (US-331: ID, denumire, stare, N câmpuri, versiune,
       ultima editare) — intro line `stackIntro`, header actions „Importă” (`secondaryAction`) + „Formular global nou”;
     · dialogs = the library dialog (#case-action-modal via GEAPRegistre.openModal) + js/config-publish.js (note field,
       changes list, errors); pending review = the shell `openPendingChanges`; confirmations = askConfirm / the dialog;
     · audit = `GEAPEventTimeline.log` (the unique Jurnal de audit), as widgets / dashboards.
   Versions: „vMAJOR.MINOR.PATCH” — a save adds 1 to PATCH, a publication 1 to MINOR (PATCH 0), a restore / import = a new
   PATCH version with a reference (US-333 AC-11, US-334 AC-11, US-335 AC-07).
   Routes: #formulare-globale · #formular-global/<id> (opens the Form Designer) · #formular-global/nou (create dialog).
   Demo switch ?formulare= (comma list): fara-permisiune · local (the local administrator holds the permission) ·
   fara-creare (no „Formular global nou” / „Importă”) · gol · eroare (every save fails) · autoritate-inactiva (the active
   role's authority is deactivated: create / save / publish / restore / import refused) · schema-invalida (publish blocked).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const CP = () => window.GEAPConfigPublish || {};
  const B = () => window.GEAPFormBuilder || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || U().renderTag?.(label, tone) || esc(label);
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const time = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
  const stampText = (v) => (v ? `${longDate(v)}, ${time(v)}` : "");
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;

  const KIND = "formulare-globale";
  const NAV = "formulare-globale";
  const TITLE = "Formulare globale";
  /* the AC texts, „tu” tone (components.md › Ton: tu) — US-331…336 AC-01 say „Nu aveți …” (deviation listed for the PO) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const INTRO = "Formulare care nu aparțin unui serviciu. Doar acestea pot fi atașate unei tranziții din proces.";
  const EMPTY_LIST = "Nu există formulare globale.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const SAVE_FAILED = "Salvarea a eșuat.";
  const REFUSED = "Autoritatea sau subdiviziunea rolului tău activ este dezactivată. Acțiunea este refuzată.";
  const PREFIX = "Formular";
  const NAME_MAX = 150;
  const DESC_MAX = 250;
  const NO_VALUE = ["info", "callout", "separator"];

  /* ---------------------------------------------------------------- the Feature's classifiers */
  /* „tipul procesului sau pasul intern” — the end of the name (US-332 data model; ex. „Formular cerere Retragere act”) */
  const NAME_KINDS = [
    ["eliberare", "Eliberare act"], ["prelungire", "Prelungire act"], ["reperfectare", "Reperfectare act"], ["duplicat", "Eliberare duplicat"],
    ["retragere", "Retragere act"], ["suspendare", "Suspendare act"], ["reluare", "Reluare act"], ["anulare", "Anulare act"],
    ["examinare", "Examinare"], ["avizare", "Avizare"], ["control", "Control"], ["decizie", "Semnare decizie"]
  ];
  /* „Vizibilitate și acces” — who sees and reuses the schema; a new global form = „Global” (US-332 AC-16) */
  const ACCESS = [["global", "Global"], ["authority", "Doar autoritatea mea"]];
  const TYPE_LABEL = { text: "Text", textarea: "Text multilinie", number: "Număr", date: "Dată", checkbox: "Casetă de bifare", email: "Email", phone: "Telefon", money: "Sumă" };
  const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("formulare") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* the permission „gestionarea formularelor electronice” (Feature 89940): the Administrator central by default; the
     Administrator local only when granted (?formulare=local) — US-331 AC-02 / 03 */
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    const has = (central || (local && demo.has("local"))) && !demo.has("fara-permisiune");
    return { central, local, has, create: has && !demo.has("fara-creare"), authority: central ? "" : a.authority || "ansp", roleLabel: a.roleLabel || (central ? "Administrator central" : "Administrator local") };
  }
  const refused = () => demo.has("autoritate-inactiva");

  /* ---------------------------------------------------------------- data (seed, kept for the session) */
  const keyOf = (text) => fold(text).replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toLowerCase());
  let seq = 0;
  const F = (type, text, { span = 6, required = false } = {}) => ({ id: `gf-${(seq += 1)}`, type, key: keyOf(text), label: { ro: text, ru: "", en: "" }, span, required });
  const sec = (title, fields) => ({ id: `gs-${(seq += 1)}`, title: { ro: title, ru: "", en: "" }, description: { ro: "", ru: "", en: "" }, showTitle: true, showSeparator: true, fields });
  const stepsOf = (sections) => [{ id: `gst-${(seq += 1)}`, locked: false, title: { ro: "Formular", ru: "", en: "" }, sections }];
  const fieldsOf = (steps) => (steps || []).flatMap((s) => (s.sections || []).flatMap((x) => x.fields || []));
  const countOf = (steps) => fieldsOf(steps).filter((f) => !NO_VALUE.includes(f.type)).length;
  const nameOf = (r) => [PREFIX, String(r.nameText || "").trim(), label(NAME_KINDS, r.nameKind)].filter(Boolean).join(" ");
  const metaOf = (r) => ({ nameText: r.nameText, nameKind: r.nameKind || "", description: r.description?.ro || "", access: r.access });
  const snapshot = (r) => ({ meta: metaOf(r), steps: clone(r.steps) });

  /* one seed form: `drop` = how many fields the older published versions lacked (so the diffs read real) */
  function seedForm({ n, nameText, nameKind = "", description = "", access = "global", status = "published", version, editedAt, editedBy = "Anastasia Cojocaru", active = true, usedBy = [], sections, history = [], changed = null }) {
    const steps = stepsOf(sections);
    const r = {
      id: `FRM-${String(n).padStart(4, "0")}`, code: `FRM-${String(n).padStart(4, "0")}`, scope: "global", schemaVersion: 2, technical: `f_global_${n}`,
      service: { name: TITLE, rsspCode: "" }, requestTypes: [], settings: { autosave: true, reviewSummary: false },
      nameText, nameKind, title: { ro: "", ru: "", en: "" }, description: { ro: description, ru: "", en: "" }, access, status, version,
      editedAt, editedBy: editedAt ? editedBy : "", active, deactivation: null, usedBy, steps, versions: [], published: null, changed: false
    };
    r.title.ro = nameOf(r);
    /* the published versions (newest last), each with the schema it had: an older one lacks the last fields */
    const total = fieldsOf(steps).length;
    r.versions = history.map((h, i) => {
      const keep = Math.max(0, total - (history.length - 1 - i));
      let left = keep;
      const vSteps = clone(steps);
      vSteps.forEach((s) => s.sections.forEach((x) => { x.fields = x.fields.filter(() => (left -= 1) >= 0); }));
      return { nr: i + 1, version: h.v, type: h.type || "Publicare", note: h.note, at: h.at, by: h.by || editedBy, ref: h.ref || "", snap: { meta: metaOf(r), steps: vSteps } };
    });
    if (status === "published") r.published = clone(r.versions[r.versions.length - 1]?.snap || snapshot(r));
    if (changed) {
      /* saved after the last publication: the published snapshot is the older text (US-334 AC-05 / 13) */
      Object.assign(r.published.meta, changed.meta || {});
      if (changed.dropLast) r.published.steps.forEach((s) => s.sections.forEach((x) => { x.fields = x.fields.slice(0, -1); }));
      if (changed.retype) r.published.steps.forEach((s) => s.sections.forEach((x) => x.fields.forEach((f) => { if (f.key === changed.retype[0]) f.type = changed.retype[1]; })));
      r.changed = true;
    }
    return r;
  }
  const USE = (flow, from, to) => ({ kind: "Tranziție", text: `${from} → ${to}`, where: `Fluxul „${flow}”` });
  const RT = (service, type) => ({ kind: "Tip de solicitare", text: type, where: service });
  function seed() {
    seq = 0;
    return [
      seedForm({ n: 101, nameText: "cerere", nameKind: "retragere", description: "Motivul și data retragerii, la cererea titularului actului.", version: "v1.2.0", editedAt: "2026-11-12T14:30",
        usedBy: [USE("Retragere act permisiv", "În vigoare", "Retras"), USE("Retragere act permisiv", "Cerere înregistrată", "În examinare"), RT("Autorizație sanitară pentru funcționare", "Retragere")],
        sections: [sec("Date despre retragere", [F("date", "Data retragerii", { required: true }), F("text", "Numărul actului", { required: true }), F("textarea", "Motivul retragerii", { span: 12, required: true }), F("checkbox", "Confirm că actul nu mai este folosit", { span: 12 })])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-06-03T10:12" }, { v: "v1.1.0", note: "Câmp nou „Numărul actului”.", at: "2026-08-19T09:40" }, { v: "v1.2.0", note: "Confirmarea titularului, la cererea juriștilor ANSP.", at: "2026-11-12T14:30" }] }),
      seedForm({ n: 102, nameText: "decizie de anulare", nameKind: "anulare", description: "Temeiul legal și motivarea anulării actului permisiv.", version: "v1.1.3", editedAt: "2026-11-16T16:05", editedBy: "Ion Rusu",
        sections: [sec("Decizia", [F("text", "Numărul deciziei", { required: true }), F("date", "Data deciziei", { required: true }), F("text", "Temeiul legal", { span: 12, required: true }), F("textarea", "Motivarea", { span: 12, required: true }), F("number", "Termen de contestare (zile)")])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-07-01T11:00" }, { v: "v1.1.0", note: "Temeiul legal devine obligatoriu.", at: "2026-09-22T15:18", by: "Ion Rusu" }],
        changed: { meta: { description: "Temeiul legal al anulării." }, dropLast: true, retype: ["temeiulLegal", "textarea"] } }),
      seedForm({ n: 103, nameText: "proces-verbal", nameKind: "control", description: "Constatările controlului la fața locului și măsurile dispuse.", version: "v2.0.0", editedAt: "2026-10-30T08:50", editedBy: "SIA GEAP",
        usedBy: [USE("Control de stat", "Control planificat", "Control efectuat")],
        sections: [sec("Controlul", [F("date", "Data controlului", { required: true }), F("text", "Locul controlului", { required: true }), F("text", "Inspector", { required: true })]), sec("Constatări", [F("textarea", "Constatări", { span: 12, required: true }), F("textarea", "Măsuri dispuse", { span: 12 }), F("date", "Termen de remediere"), F("checkbox", "Agentul economic a semnat procesul-verbal", { span: 12 })])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-04-14T13:20" }, { v: "v1.1.0", note: "Secțiunea „Constatări” separată.", at: "2026-07-07T10:05" }, { v: "v2.0.0", type: "deployed", note: "Actualizat automat la instalarea versiunii 2.0 a platformei.", at: "2026-10-30T08:50", by: "SIA GEAP" }] }),
      seedForm({ n: 104, nameText: "aviz", nameKind: "avizare", description: "", version: "v1.0.0", editedAt: "2026-09-02T12:15", editedBy: "Mihai Ceban",
        sections: [sec("Avizul", [F("text", "Autoritatea avizatoare", { required: true }), F("date", "Data avizului", { required: true }), F("textarea", "Condiții", { span: 12 })])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-09-02T12:15", by: "Mihai Ceban" }] }),
      seedForm({ n: 105, nameText: "solicitare de completare", nameKind: "examinare", description: "Documentele sau datele cerute solicitantului, cu termenul de prezentare.", status: "draft", version: "v1.0.2", editedAt: "2026-11-15T11:42",
        sections: [sec("Completare", [F("textarea", "Ce trebuie completat", { span: 12, required: true }), F("number", "Termen (zile lucrătoare)", { required: true })])] }),
      seedForm({ n: 106, nameText: "notă internă", description: "", status: "draft", version: "v1.0.0", editedAt: "", sections: [sec("Secțiune", [])] }),
      seedForm({ n: 107, nameText: "decizie de suspendare", nameKind: "suspendare", description: "Perioada și motivul suspendării actului.", version: "v1.0.4", editedAt: "2026-10-08T09:30", active: false,
        sections: [sec("Suspendarea", [F("date", "Suspendat de la", { required: true }), F("date", "Suspendat până la"), F("textarea", "Motivul suspendării", { span: 12, required: true })])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-05-20T14:00" }] }),
      seedForm({ n: 108, nameText: "motivare refuz", nameKind: "decizie", description: "Motivele refuzului, comunicate solicitantului în decizie.", version: "v1.3.1", editedAt: "2026-11-03T17:20", editedBy: "Elena Munteanu",
        usedBy: [USE("Eliberare autorizație", "În examinare", "Refuzat")],
        sections: [sec("Refuzul", [F("textarea", "Motivele refuzului", { span: 12, required: true }), F("text", "Temeiul legal", { span: 12, required: true }), F("checkbox", "Se poate depune o cerere nouă", { span: 12 })])],
        history: [{ v: "v1.0.0", note: "Prima versiune publicată.", at: "2026-03-11T10:00" }, { v: "v1.1.0", note: "Temeiul legal separat de motive.", at: "2026-05-29T12:30" }, { v: "v1.2.0", type: "Restaurare", ref: "v1.0.0", note: "Revenire temporară la textul inițial.", at: "2026-06-02T09:10" }, { v: "v1.3.0", note: "Câmp nou „Se poate depune o cerere nouă”.", at: "2026-08-14T16:45", by: "Elena Munteanu" }] })
    ].map((r) => { if (r.id === "FRM-0107") r.deactivation = { at: "2026-10-08T09:30", by: "Anastasia Cojocaru", reason: "Înlocuit de procedura comună de suspendare." }; return r; });
  }
  const S = { forms: null };
  const forms = () => { if (!S.forms) S.forms = demo.has("gol") ? [] : seed(); return S.forms; };
  const formOf = (id) => forms().find((r) => r.id === id) || null;
  /* US-332 AC-05 / 06: FRM-NNNN, unique among ALL forms (the service forms of the Form Designer DB too), never reused */
  function nextId() {
    const nums = forms().map((r) => Number(r.id.slice(4)) || 0);
    try { (JSON.parse(window.localStorage.getItem("geap.formBuilderSandboxDb.v2") || "{}").forms || []).forEach((f) => nums.push(Number(String(f.code || "").replace(/\D/g, "")) || 0)); } catch { /* private mode */ }
    nums.push(...(S.used || []));
    const n = Math.max(108, ...nums) + 1;
    return `FRM-${String(n).padStart(4, "0")}`;
  }
  const bump = (v, part) => { const [M, m, p] = String(v || "v1.0.0").replace(/^v/, "").split(".").map((x) => Number(x) || 0); return part === "minor" ? `v${M}.${m + 1}.0` : `v${M}.${m}.${p + 1}`; };
  const lastVersion = (r) => r.versions[r.versions.length - 1] || null;
  const builderForm = (r) => {
    const { versions, published, usedBy, deactivation, changed, active, ...rest } = clone(r);
    return rest;
  };

  /* ---------------------------------------------------------------- audit (Feature AC: every operation → Jurnalul de audit) */
  function audit(r, type, detail = "", status = "Reușit") {
    const me = who();
    window.GEAPEventTimeline?.log?.(
      { at: nowIso(), user: userName(), role: me.roleLabel, type, status, detail },
      { module: "BackOffice", authority: me.authority ? me.authority.toUpperCase() : "", objectType: "Formular global", objectId: r.id, objectVersion: r.version, related: [] }
    );
  }

  /* ---------------------------------------------------------------- what changed since the published version */
  function changesOf(r) {
    const pub = r.published;
    if (!pub) return [];
    const out = [];
    const now = metaOf(r);
    const metaRow = (lbl, a, b) => { if (String(a || "") !== String(b || "")) out.push({ label: lbl, before: esc(a || "—"), after: esc(b || "—"), status: "Modificat" }); };
    metaRow("Denumire", nameOf(pub.meta), nameOf(now));
    metaRow("Descriere scurtă", pub.meta.description, now.description);
    metaRow("Vizibilitate și acces", label(ACCESS, pub.meta.access), label(ACCESS, now.access));
    const before = new Map(fieldsOf(pub.steps).map((f) => [f.id, f]));
    const after = new Map(fieldsOf(r.steps).map((f) => [f.id, f]));
    after.forEach((f, id) => {
      const o = before.get(id);
      const name = `Câmpul „${f.label?.ro || f.key}”`;
      if (!o) out.push({ label: name, before: "—", after: `${esc(TYPE_LABEL[f.type] || f.type)} · câmp nou`, status: "Adăugat" });
      else if (o.type !== f.type) out.push({ label: name, before: esc(TYPE_LABEL[o.type] || o.type), after: esc(TYPE_LABEL[f.type] || f.type), status: "Modificat", warn: "type" });
      else if ((o.label?.ro || "") !== (f.label?.ro || "")) out.push({ label: name, before: esc(o.label?.ro || ""), after: esc(f.label?.ro || ""), status: "Modificat" });
    });
    before.forEach((o, id) => { if (!after.has(id)) out.push({ label: `Câmpul „${o.label?.ro || o.key}”`, before: esc(TYPE_LABEL[o.type] || o.type), after: "—", status: "Eliminat", warn: "removed" }); });
    return out;
  }
  const pending = (r) => Boolean(r.changed) || (r.status === "published" && changesOf(r).length > 0);

  /* ================================================================ LIST (US-331) */
  const statusTag = (r) => (r.status === "published" ? tag("Publicat", "success") : tag("Schiță", "neutral"));
  const rowOf = (r) => ({
    id: r.id, denumire: nameOf(r), descriere: r.description?.ro || "", stare: r.status === "published" ? "Publicat" : "Schiță",
    activ: r.active ? "Activ" : "Inactiv", campuri: countOf(r.steps), versiune: r.version, modificat: r.editedAt || "", r
  });
  function rowMenu(row) {
    const r = row.r;
    if (!who().has) return "";
    const items = [
      r.active && { label: "Editează", icon: "edit", attrs: `data-frm-edit="${esc(r.id)}"` },
      { label: "Istoric versiuni", icon: "time", attrs: `data-frm-versions="${esc(r.id)}"` },
      { label: "Exportă", icon: "export", attrs: `data-frm-export="${esc(r.id)}"` },
      r.active ? { label: "Dezactivează", icon: "pause", attrs: `data-frm-deactivate="${esc(r.id)}"` } : { label: "Activează", icon: "rotate-arrow", attrs: `data-frm-activate="${esc(r.id)}"` }
    ].filter(Boolean);
    const html = U().renderRowActions?.({ menu: items, label: `${r.id} ${nameOf(r)}` }) || "";
    /* fixed: the list scrolls inside the registry's table wrap, an in-flow menu would be clipped */
    return html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>");
  }
  const pendingHtml = (row) => A().renderHeaderStatus?.("Modificări nepublicate", "warning", `data-frm-pending="${esc(row.id)}" aria-haspopup="dialog" data-tooltip-text="Vezi modificările" aria-label="Vezi modificările nepublicate ale ${esc(row.id)}"`) || "modificări nepublicate";
  /* a card = the shared stacked-list row (the Rapoarte / Tablouri de bord list): title + Small tags (stare · Inactiv) ·
     description (US-331 AC-10, only when filled) · details „FRM-0101 · v1.2.0 · 4 câmpuri · [● Modificări nepublicate] ·
     Editat 12 noiembrie 2026, 14:30 · who” (AC-06 / 08 / 09: never edited = „editat -”) */
  const stackItem = (row) => {
    const r = row.r;
    const details = [
      esc(row.id),
      esc(row.versiune),
      esc(plural(row.campuri, "câmp", "câmpuri")),
      pending(r) ? pendingHtml(row) : "",
      row.modificat ? `Editat ${esc(stampText(row.modificat))}${r.editedBy ? ` · ${esc(r.editedBy)}` : ""}` : "editat -"
    ].filter(Boolean);
    return {
      plainTitle: row.denumire,
      title: esc(row.denumire),
      badges: [statusTag(r), r.active ? "" : tag("Inactiv", "neutral")].filter(Boolean),
      meta: row.descriere ? [`<span class="e-permits-rpt-list__desc" data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>`] : details,
      meta2: row.descriere ? details : null,
      actionsHtml: rowMenu(row)
    };
  };
  function registryDb() {
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 6,
      pageSizes: [20, 40, 60],
      defaultSort: "modificat",
      defaultSortDirection: "desc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
        stare: { label: "Stare", width: 128, sortable: true },
        campuri: { label: "Câmpuri", width: 112, sortable: true },
        versiune: { label: "Versiune", width: 128, sortable: true },
        modificat: { label: "Editat", width: 184, sortable: true },
        ...(me.has ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după ID sau denumire",
          columns: ["id", "denumire", "stare", "campuri", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
          tabs: [],
          /* Feature „Descriere UX”: „Importă” and „Formular global nou” in the header (US-331 AC-14, US-332 AC-02) */
          primaryAction: me.create ? { id: "frm-new", label: "Formular global nou" } : null,
          secondaryAction: me.create ? { id: "frm-import", label: "Importă" } : null,
          toolbarLabel: "Filtrare formulare globale"
        }
      },
      runtimeRows: me.has ? forms().map(rowOf) : []
    };
  }
  const SORT = { campuri: (r) => String(r.campuri).padStart(3, "0"), modificat: (r) => r.modificat || "0000", versiune: (r) => r.versiune.replace(/\d+/g, (d) => d.padStart(3, "0")) };
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "stare", label: "Stare", get: (row) => row.stare },
        { key: "activ", label: "Activitate", get: (row) => row.activ }
      ];
    },
    /* US-331 AC-11: quick search by ID or name (diacritics ignored) */
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)}`,
    stackItem,
    stackClass: "e-permits-rpt-list e-permits-dsh-list",
    stackIntro: INTRO,
    sort: {
      keys: [{ value: "modificat", label: "Ultima editare" }, { value: "denumire", label: "Denumire" }, { value: "id", label: "ID" }],
      orders: (key) => ({
        modificat: [{ value: "desc", label: "Cele mai noi întâi" }, { value: "asc", label: "Cele mai vechi întâi" }],
        denumire: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }],
        id: [{ value: "asc", label: "Crescător" }, { value: "desc", label: "Descrescător" }]
      })[key] || []
    },
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    rowClass: (row) => (row.r.active ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "stare": return statusTag(row.r);
        case "modificat": return row.modificat ? esc(stampText(row.modificat)) : "-";
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "");
      }
    },
    /* the card opens the form in the Form Designer (US-331 AC-13); an inactive form opens its version history
       (US-336 AC-09: versions stay available) */
    openRow: (id) => { const r = formOf(id); if (!r) return; if (r.active) openForm(id); else openVersions(id); },
    rowLabel: (row) => `${row.id}, ${row.denumire} — ${row.r.active ? "deschide în Form Designer" : "vezi istoricul versiunilor"}`,
    emptyHtml: ({ query, filtered, boxed = false }) => {
      const bare = !boxed;
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare });
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după ID sau denumire, sau schimbă filtrele.", icon: "search", bare, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: EMPTY_LIST, text: who().create ? "Creează primul formular global cu „Formular global nou”." : "", icon: "page-text", bare, actionHtml: who().create ? '<button class="btn btn-primary btn-sm" type="button" data-frm-new>Formular global nou</button>' : "" });
    },
    exportState: () => ({ hidden: true })
  };
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }

  /* ================================================================ form pieces */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => CP().errorHtml?.(id, msg) || "";
  const counterRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span data-frm-hint="${id}">${hint}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-frm-count="${id}">${count}/${max}</span></p>`;
  const selectField = (id, attrs, lbl, options, value, { required = false, hint = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
      ${U().renderFoSelectControl?.({ id, attrs, optionsHtml: options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("") }) || ""}
      ${hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
    </div>`;
  /* Denumire = the locked prefix „Formular” inside the input (`.e-permits-fo-input__prefix`) + the free text; the
     counter counts the WHOLE name (prefix + text + process part), max 150 (US-332 AC-09 / 15) */
  function nameField(id, v, error) {
    const full = nameOf(v);
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">Denumire formular Ro${req()}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <label class="e-permits-fo-input__prefix" for="${id}" aria-hidden="true">${PREFIX}</label>
          <input id="${id}" type="text" value="${esc(v.nameText || "")}" placeholder="ce colectează, de ex. cerere" autocomplete="off" aria-required="true" aria-describedby="${error ? `${id}-error ` : ""}${id}-hint"${error ? ' aria-invalid="true"' : ""} data-frm-new="nameText">
        </div>
        ${error ? errorHtml(id, error) : ""}
        ${counterRow(id, `Denumirea completă: ${esc(full)}`, full.length, NAME_MAX)}
      </div>`;
  }
  function descField(id, value, error) {
    const n = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">Descriere scurtă</label>
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="3" aria-describedby="${error ? `${id}-error ` : ""}${id}-hint"${error ? ' aria-invalid="true"' : ""} spellcheck="true" data-frm-new="description">${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : ""}
        ${counterRow(id, "Opțională. Se afișează sub denumire, în registru.", n, DESC_MAX)}
      </div>`;
  }

  /* ================================================================ CREATE (US-332) */
  const C = { draft: null, errors: {}, id: "" };
  const validateNew = (v) => {
    const e = {};
    if (!String(v.nameText || "").trim()) e.nameText = "Introdu denumirea formularului.";
    else if (nameOf(v).length > NAME_MAX) e.nameText = `Denumirea poate avea cel mult ${NAME_MAX} de caractere.`;
    if (String(v.description || "").length > DESC_MAX) e.description = `Descrierea scurtă poate avea cel mult ${DESC_MAX} de caractere.`;
    return e;
  };
  function openNew() {
    if (!who().create) { toast(DENIED, "error"); return; }
    C.draft = { nameText: "", nameKind: "", description: "", access: "global" };
    C.errors = {};
    C.id = nextId();
    renderNew();
    window.setTimeout(() => document.querySelector("#frm-new-name")?.focus(), 60);
  }
  function renderNew({ refusedNote = false } = {}) {
    const v = C.draft;
    G().openModal?.({
      kind: "frm-create",
      title: "Formular global nou",
      subtitle: "Nu aparține unui serviciu; se poate atașa tranzițiilor din proces.",
      body: `
        ${refusedNote ? U().renderNotice?.("error", `<strong>Formularul nu a fost creat.</strong> ${esc(REFUSED)}`, { role: "alert" }) || "" : ""}
        <div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
            <label for="frm-new-id">ID</label>
            <div class="e-permits-fo-input is-filled is-readonly"><input id="frm-new-id" type="text" value="${esc(C.id)}" readonly aria-describedby="frm-new-id-hint"></div>
            <p class="e-permits-fo-field__hint" id="frm-new-id-hint">Se atribuie automat la creare și nu se mai schimbă.</p>
          </div>
          ${nameField("frm-new-name", v, C.errors.nameText)}
          ${selectField("frm-new-kind", 'data-frm-new="nameKind"', "Tipul procesului sau pasul intern", [["fara", "Fără"], ...NAME_KINDS], v.nameKind || "fara", { hint: "Se adaugă la sfârșitul denumirii." })}
          ${descField("frm-new-desc", v.description, C.errors.description)}
          ${selectField("frm-new-access", 'data-frm-new="access"', "Vizibilitate și acces", ACCESS, v.access, { required: true, hint: "Cine poate vedea și reutiliza schema în alte servicii." })}
        </div>`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-frm-create>Creează formular</button></div>'
    });
  }
  function readNew() {
    const box = document.querySelector("#case-action-modal");
    box?.querySelectorAll("[data-frm-new]").forEach((input) => { C.draft[input.dataset.frmNew] = input.value; });
  }
  function confirmNew() {
    readNew();
    C.errors = validateNew(C.draft);
    if (Object.keys(C.errors).length) {
      renderNew();
      window.setTimeout(() => document.querySelector(C.errors.nameText ? "#frm-new-name" : "#frm-new-desc")?.focus(), 40);
      return;
    }
    /* US-332 AC-14: the active role's authority / subdivision is deactivated → refused, nothing created */
    if (refused()) { audit({ id: C.id, version: "" }, "Crearea formularului global", REFUSED, "Eșuat"); renderNew({ refusedNote: true }); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    const v = C.draft;
    seq = Math.max(seq, 9000);
    const r = {
      id: C.id, code: C.id, scope: "global", schemaVersion: 2, technical: `f_global_${C.id.slice(4)}`, service: { name: TITLE, rsspCode: "" }, requestTypes: [],
      settings: { autosave: true, reviewSummary: false }, nameText: v.nameText.trim(), nameKind: v.nameKind, title: { ro: "", ru: "", en: "" },
      description: { ro: v.description.trim(), ru: "", en: "" }, access: v.access || "global", status: "draft", version: "v1.0.0",
      editedAt: nowIso(), editedBy: userName(), active: true, deactivation: null, usedBy: [], versions: [], published: null, changed: false,
      steps: stepsOf([sec("Secțiune", [])])
    };
    r.title.ro = nameOf(r);
    S.used = [...(S.used || []), Number(r.id.slice(4))];
    forms().unshift(r);
    audit(r, "Crearea formularului global", `${r.id} · ${nameOf(r)}`);
    G().closeModal?.();
    refreshList();
    toast(`Formularul global ${r.id} a fost creat.`);
    /* US-332 AC-12: the builder opens on the new (empty) form */
    window.setTimeout(() => openForm(r.id), 180);
  }

  /* ================================================================ EDIT in the Form Designer (US-333) */
  let current = null;
  function openForm(id, { push = true } = {}) {
    const r = formOf(id);
    if (!who().has || !r) { showDenied(); return; }
    if (!r.active) { openVersions(id); return; }
    if (!B().openGlobal) { toast("Constructorul de formulare nu este disponibil.", "error"); return; }
    current = id;
    B().openGlobal(builderForm(r), hooksFor(r));
    if (push) A().writeHash?.(`#formular-global/${id}`, { push: true });
  }
  function hooksFor(r) {
    return {
      kinds: NAME_KINDS,
      access: ACCESS,
      /* changed = Publică is on (a never-published draft always can); pending = „Modificări nepublicate” (only after a
         first publication — a draft says „Schiță” already) */
      meta: () => { const x = formOf(r.id) || r; return { changed: x.published ? pending(x) : true, pending: Boolean(x.published) && pending(x), inactive: !x.active }; },
      onSave: (f) => saveFromBuilder(r.id, f),
      onPublish: (f, dirty) => openPublish(r.id, dirty ? f : null),
      onVersions: () => openVersions(r.id),
      onPending: () => openPending(r.id),
      onClose: () => { current = null; refreshList(); if (/^#formular-global\//.test(window.location.hash)) A().writeHash?.(`#${NAV}`, { push: false }); }
    };
  }
  /* the builder's form → the record (meta + schema); nothing of ID / status / field count is taken from it (US-333 AC-10 / 12) */
  function applyDraft(r, f) {
    r.nameText = f.nameText; r.nameKind = f.nameKind || ""; r.description = { ...(r.description || {}), ro: f.description?.ro || "" };
    r.access = f.access || "global"; r.steps = clone(f.steps); r.title = { ...(r.title || {}), ro: nameOf(r) };
  }
  function saveFromBuilder(id, f, { silent = false } = {}) {
    const r = formOf(id);
    if (!r) return false;
    /* US-333 AC-16 · AC-15: refused / failed → the message, nothing saved, the builder keeps the edits */
    if (refused()) { audit(r, "Modificarea formularului", REFUSED, "Eșuat"); toast(REFUSED, "error"); return false; }
    if (demo.has("eroare")) { audit(r, "Modificarea formularului", SAVE_FAILED, "Eșuat"); toast(SAVE_FAILED, "error"); return false; }
    applyDraft(r, f);
    r.version = bump(r.version, "patch");
    r.editedAt = nowIso();
    r.editedBy = userName();
    r.changed = true;
    /* US-333 AC-18 */
    audit(r, "Modificarea formularului", `Formularul ${r.id} a fost modificat.`);
    B().refreshGlobal?.(builderForm(r));
    if (!silent) toast(`Formularul a fost salvat ca versiunea ${r.version}. Publică-l ca să intre în lucru.`);
    return true;
  }

  /* ---- pending review (US-334 AC-05): the shared dialog, published vs saved */
  function openPending(id) {
    const r = formOf(id);
    if (!r) return;
    const at = r.editedAt || "";
    const changes = changesOf(r).map((c) => ({ area: CP().strip?.(c.label) || c.label, detail: `${CP().strip?.(c.before) || c.before} → ${CP().strip?.(c.after) || c.after}`, at, user: r.editedBy || "", status: c.status }));
    const last = r.published ? lastVersion(r)?.version || r.version : "";
    A().openPendingChanges?.({ subject: `${nameOf(r)}${last ? ` · față de versiunea ${last}` : ""}`, changes, onPublish: r.active && who().has ? () => (current === id ? openPublish(id, B().globalDirty?.() ? clone(B().form) : null) : (openForm(id), window.setTimeout(() => openPublish(id, null), 250))) : null });
  }

  /* ================================================================ PUBLISH (US-334) */
  const P = { id: "", draft: null };
  function openPublish(id, draft) {
    const r = formOf(id);
    if (!r) return;
    P.id = id; P.draft = draft;
    const view = draft ? (() => { const x = clone(r); applyDraft(x, draft); return x; })() : r;
    const problems = demo.has("schema-invalida") ? ["Schema salvată nu se poate citi (secțiunea „Date despre retragere” are un câmp fără tip). Corectează-o în constructor sau restaurează o versiune."] : [];
    const changes = changesOf(view);
    const warnings = changes.filter((c) => c.warn);
    const cur = r.published ? (lastVersion(r)?.version || r.version) : "";
    const next = bump(view.version, "minor");
    /* US-334 AC-06: name · the version notice (exact AC text) · effects (AC-09: a removed field / a changed type = warning
       only) · „Ce s-a schimbat” (AC-07) · Anulează / Publică; AC-08: an unreadable schema = error notice, Publică off */
    const notice = problems.length
      ? U().renderNotice?.("error", `<strong>Formularul nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
      : U().renderNotice?.("info", cur
        ? `<strong>Versiunea ${esc(next)} o înlocuiește pe versiunea ${esc(cur)}.</strong> Utilizatorii BackOffice văd noua versiune imediat după publicare.`
        : `<strong>Prima publicare: versiunea ${esc(next)}.</strong> Utilizatorii BackOffice văd formularul imediat după publicare.`) || "";
    const warn = !problems.length && warnings.length
      ? U().renderNotice?.("warning", `<strong>${warnings.length === 1 ? "O modificare poate afecta datele existente" : `${warnings.length} modificări pot afecta datele existente`}:</strong> ${warnings.map((c) => `${esc(CP().strip?.(c.label) || "")} ${c.warn === "removed" ? "este eliminat" : "își schimbă tipul"}`).join("; ")}. Publicarea nu este blocată; dosarele depuse rămân pe versiunea cu care au fost depuse.`) || ""
      : "";
    G().openModal?.({
      kind: "frm-publish",
      title: "Publicare versiune",
      subtitle: nameOf(view),
      body: `
        ${notice}
        ${warn}
        ${!problems.length && changes.length ? CP().changesList?.(changes, "Efectele schimbării") || "" : ""}
        ${CP().noteField?.("frm-publish-note", "", { placeholder: "Descrie pe scurt modificările" }) || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-frm-publish-confirm${problems.length ? ' aria-disabled="true" data-tooltip-reason="Schema nu se poate citi: publicarea este blocată."' : ""}>Publică</button></div>`
    });
  }
  function confirmPublish(button) {
    const r = formOf(P.id);
    if (!r) return;
    if (button.getAttribute("aria-disabled") === "true") { audit(r, "Publicarea formularului", "Schema nu se poate citi.", "Eșuat"); return; }
    const field = document.querySelector("#frm-publish-note");
    const note = field?.value.trim() || "";
    /* US-334 AC-07: required, ≤ 500 */
    if (!note) { CP().setModalError?.(field, "Descrie ce s-a schimbat."); return; }
    if (note.length > 500) { CP().setModalError?.(field, "Textul poate avea cel mult 500 de caractere."); return; }
    if (refused()) { G().closeModal?.(); audit(r, "Publicarea formularului", REFUSED, "Eșuat"); toast(REFUSED, "error"); return; }
    if (demo.has("eroare")) { G().closeModal?.(); audit(r, "Publicarea formularului", SAVE_FAILED, "Eșuat"); toast("Publicarea a eșuat. Încearcă din nou.", "error"); return; }
    if (P.draft) applyDraft(r, P.draft);
    const from = r.published ? lastVersion(r)?.version : "";
    r.version = bump(r.version, "minor");
    r.status = "published";
    r.editedAt = nowIso();
    r.editedBy = userName();
    r.changed = false;
    r.versions.push({ nr: r.versions.length + 1, version: r.version, type: "Publicare", note, at: r.editedAt, by: r.editedBy, ref: "", snap: snapshot(r) });
    r.published = snapshot(r);
    /* US-334 AC-17 */
    audit(r, "Publicarea formularului", `Versiunea ${r.version}${from ? ` (înlocuiește ${from})` : ""} · ${note}`);
    G().closeModal?.();
    B().refreshGlobal?.(builderForm(r));
    refreshList();
    toast(`Versiunea ${r.version} a formularului „${nameOf(r)}” a fost publicată.`);
    P.id = ""; P.draft = null;
  }

  /* ================================================================ VERSIONS (US-335) */
  const V = { id: "" };
  function openVersions(id) {
    const r = formOf(id);
    if (!r || !who().has) return;
    V.id = id;
    const list = [...r.versions].reverse();
    const cur = lastVersion(r)?.nr;
    const canEdit = r.active && who().has;
    const items = list.map((v) => ({
      plainTitle: `Versiunea ${v.version}`,
      title: `Versiunea ${esc(v.version)}`,
      badges: [v.nr === cur ? tag("curentă", "info") : "", v.type === "deployed" ? tag("deployed", "neutral") : ""].filter(Boolean),
      /* US-335 AC-04: Nr. · Versiune · Tipul modificării · Ce s-a schimbat · Data · Autor */
      meta: [`Nr. ${v.nr}`, esc(v.type === "Restaurare" && v.ref ? `Restaurare (din ${v.ref})` : v.type), esc(stampText(v.at)), esc(v.by)],
      meta2: [esc(v.note)],
      actionsHtml: (U().renderRowActions?.({
        preview: `data-frm-ver-view="${v.nr}"`,
        menu: [
          canEdit && v.nr !== cur && { label: "Restaurează", icon: "rotate-arrow", attrs: `data-frm-ver-restore="${v.nr}"` },
          { label: "Exportă", icon: "export", attrs: `data-frm-ver-export="${v.nr}"` }
        ].filter(Boolean),
        label: `Versiunea ${v.version}`
      }) || "")
    }));
    const pendingNote = pending(r) && r.published ? U().renderNotice?.("warning", `<strong>Ciorna are modificări nepublicate</strong> (${esc(r.version)}). La restaurare, ele se pierd.`) || "" : "";
    G().openModal?.({
      kind: "frm-versions",
      title: "Istoric versiuni",
      subtitle: nameOf(r),
      body: `
        ${U().renderInfoNote?.("Versiunile nu se șterg. „Restaurează” aduce conținutul versiunii în ciornă, ca versiune nouă; o publici apoi din constructor.") || ""}
        ${pendingNote}
        ${A().renderStackedList?.("Versiuni publicate", items.length ? [{ label: "", items }] : [], {
          meta: plural(items.length, "versiune", "versiuni"),
          actionHtml: canEdit && !demo.has("fara-creare") ? `<button class="btn btn-secondary btn-sm" type="button" data-frm-import-version="${esc(r.id)}">${icon("upload", 16)}<span>Importă versiune</span></button>` : "",
          empty: "Formularul nu a fost publicat încă. Prima versiune apare după publicare."
        }) || ""}`,
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
    syncMeta();
  }
  /* wrapped detail parts drop their leading dot in a dialog too (the shell does it for its own lists) */
  const syncMeta = () => { const body = document.querySelector("#case-action-modal [data-case-modal-body]"); if (body) requestAnimationFrame(() => A().syncStackMetaRows?.(body)); };
  const versionOf = (r, nr) => r?.versions.find((v) => String(v.nr) === String(nr)) || null;
  /* „Detalii” (US-335 AC-05 „Vizualizează”): the content of the version, read-only */
  function openVersion(nr) {
    const r = formOf(V.id);
    const v = versionOf(r, nr);
    if (!v) return;
    const isCurrent = v.nr === lastVersion(r)?.nr;
    const sections = v.snap.steps.flatMap((s) => s.sections);
    const content = sections.map((x) => A().renderStackedList?.(x.title?.ro || "Secțiune", x.fields.length ? [{ label: "", items: x.fields.map((f) => ({ plainTitle: f.label?.ro || "", title: esc(f.label?.ro || ""), badges: [], meta: [esc(TYPE_LABEL[f.type] || f.type), f.required ? "Obligatoriu" : "Opțional"] })) }] : [], { meta: plural(x.fields.length, "câmp", "câmpuri"), empty: "Secțiune fără câmpuri." }) || "").join("");
    G().openModal?.({
      kind: "frm-version",
      title: `Versiunea ${v.version}`,
      subtitle: nameOf(v.snap.meta),
      body: `
        <div class="e-permits-dosar-profil__card">${[["Nr.", esc(String(v.nr))], ["Tipul modificării", esc(v.type === "Restaurare" && v.ref ? `Restaurare (din ${v.ref})` : v.type)], ["Ce s-a schimbat", esc(v.note)], ["Data", esc(stampText(v.at))], ["Autor", esc(v.by)], ["Descriere scurtă", esc(v.snap.meta.description || "—")], ["Vizibilitate și acces", esc(label(ACCESS, v.snap.meta.access))]].map((row) => G().detailRow?.(row) || "").join("")}</div>
        ${content}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-frm-ver-back>Înapoi la istoric</button>${!isCurrent && r.active ? `<button class="btn btn-neutral btn-rounded" type="button" data-frm-ver-restore="${v.nr}">${icon("rotate-arrow")}<span>Restaurează</span></button>` : ""}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
    syncMeta();
  }
  const R = { nr: 0 };
  function openRestore(nr) {
    const r = formOf(V.id);
    const v = versionOf(r, nr);
    if (!v || !r.active) return;
    R.nr = v.nr;
    const lost = pending(r) || Boolean(B().globalDirty?.());
    const next = bump(r.version, "patch");
    G().openModal?.({
      kind: "frm-restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: nameOf(r),
      body: `
        ${U().renderNotice?.(lost ? "warning" : "info", `<strong>Conținutul versiunii ${esc(v.version)} trece în ciornă, ca versiunea ${esc(next)}.</strong> Intră în lucru după ce o publici.${lost ? " Modificările nepublicate din ciornă se pierd." : ""}`) || ""}
        ${CP().noteField?.("frm-restore-note", "", { placeholder: "De ce revii la această versiune" }) || ""}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-frm-restore-confirm>Restaurează</button></div>'
    });
  }
  function confirmRestore() {
    const r = formOf(V.id);
    const v = versionOf(r, R.nr);
    if (!v) return;
    const field = document.querySelector("#frm-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { CP().setModalError?.(field, "Descrie ce s-a schimbat."); return; }
    if (refused()) { G().closeModal?.(); audit(r, "Restaurarea unei versiuni", REFUSED, "Eșuat"); toast(REFUSED, "error"); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    Object.assign(r, { nameText: v.snap.meta.nameText, nameKind: v.snap.meta.nameKind, access: v.snap.meta.access, description: { ...r.description, ro: v.snap.meta.description }, steps: clone(v.snap.steps) });
    r.title = { ...r.title, ro: nameOf(r) };
    r.version = bump(r.version, "patch");
    r.editedAt = nowIso();
    r.editedBy = userName();
    r.changed = true;
    r.versions.push({ nr: r.versions.length + 1, version: r.version, type: "Restaurare", ref: v.version, note, at: r.editedAt, by: r.editedBy, snap: snapshot(r) });
    /* US-335 AC-15 */
    audit(r, "Restaurarea unei versiuni", `Versiunea ${v.version} → ciorna ${r.version} · ${note}`);
    G().closeModal?.();
    if (B().isGlobal?.() && current === r.id) B().refreshGlobal?.(builderForm(r));
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată în ciornă ca versiunea ${r.version}.`);
  }

  /* ---- export (US-335 AC-09): service-form-<nume>-v<versiune>.geapcfg.json */
  const slug = (text) => fold(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function exportVersion(r, v) {
    const snap = v ? v.snap : snapshot(r);
    const version = (v ? v.version : r.version).replace(/^v/, "");
    const file = `service-form-${slug(nameOf(snap.meta))}-v${version}.geapcfg.json`;
    const payload = { format: "geapcfg", object: "form", scope: "global", id: r.id, version, name: nameOf(snap.meta), meta: snap.meta, schema: snap.steps, exportedAt: nowIso(), exportedBy: userName() };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: file });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* headless */ }
    audit(r, "Exportul unei versiuni", `${file}`);
    toast(`Am exportat versiunea ${version} în ${file}.`);
  }

  /* ---- import (US-335 AC-10 / 11): the export format; an existing ID → a new draft version, else a new global form */
  const I = { parsed: null, file: "", target: "" };
  function openImport(target = "") {
    if (!who().create) { toast(DENIED, "error"); return; }
    I.parsed = null; I.file = ""; I.target = target;
    renderImport();
  }
  function renderImport(result = "") {
    const r = I.target ? formOf(I.target) : null;
    G().openModal?.({
      kind: "frm-import",
      title: r ? "Importă versiune" : "Importă formular",
      subtitle: r ? nameOf(r) : "Fișier .geapcfg.json exportat din SIA GEAP",
      body: `
        ${U().renderInfoNote?.(r ? "Fișierul devine o versiune nouă a acestui formular, în ciornă. O publici apoi din constructor." : "Dacă ID-ul din fișier există, fișierul devine o versiune nouă a acelui formular; altfel se creează un formular global nou, în ciornă.") || ""}
        <div class="e-permits-clas-import__file">
          <button class="btn btn-secondary btn-sm" type="button" data-frm-import-pick>${icon("upload", 16)}<span>Alege fișierul</span></button>
          <input id="frm-import-file" class="sr-only" type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true" data-frm-import-file>
          ${I.file ? `<span class="e-permits-frm-import__name" data-cell-tooltip="${esc(I.file)}">${esc(I.file)}</span>` : ""}
        </div>
        <div data-frm-import-result>${result}</div>`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-frm-import-apply${I.parsed ? "" : ' aria-disabled="true" data-tooltip-reason="Alege mai întâi un fișier .geapcfg.json."'}>Importă</button></div>`
    });
  }
  function readImport(text, fileName) {
    I.file = fileName;
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }
    const ok = data && data.format === "geapcfg" && data.object === "form" && Array.isArray(data.schema) && data.meta && String(data.meta.nameText || "").trim();
    if (!ok) {
      I.parsed = null;
      renderImport(U().renderNotice?.("error", "<strong>Fișierul nu are formatul exportului.</strong> Alege un fișier .geapcfg.json exportat din „Istoric versiuni”.", { role: "alert" }) || "");
      return;
    }
    if (I.target && data.id !== I.target) {
      I.parsed = null;
      renderImport(U().renderNotice?.("error", `<strong>Fișierul este al altui formular (${esc(data.id)}).</strong> Importă-l din registru, cu „Importă”.`, { role: "alert" }) || "");
      return;
    }
    I.parsed = data;
    const r = formOf(data.id);
    const what = r
      ? `<strong>${esc(data.id)} există:</strong> fișierul devine ciorna ${esc(bump(r.version, "patch"))} a formularului „${esc(nameOf(r))}”, din versiunea ${esc(data.version)} a fișierului.`
      : `<strong>Formular global nou:</strong> „${esc(nameOf(data.meta))}”, ${esc(plural(countOf(data.schema), "câmp", "câmpuri"))}, în ciornă (ID nou).`;
    renderImport(U().renderNotice?.("info", what) || "");
  }
  function applyImport(button) {
    if (button.getAttribute("aria-disabled") === "true" || !I.parsed) return;
    const d = I.parsed;
    if (refused()) { G().closeModal?.(); toast(REFUSED, "error"); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    let r = formOf(d.id);
    if (r) {
      Object.assign(r, { nameText: d.meta.nameText, nameKind: d.meta.nameKind || "", access: d.meta.access || "global", description: { ...r.description, ro: d.meta.description || "" }, steps: clone(d.schema) });
      r.title = { ...r.title, ro: nameOf(r) };
      r.version = bump(r.version, "patch");
      r.editedAt = nowIso(); r.editedBy = userName(); r.changed = true;
      r.versions.push({ nr: r.versions.length + 1, version: r.version, type: "Import", ref: `v${d.version}`, note: `Importat din ${I.file}.`, at: r.editedAt, by: r.editedBy, snap: snapshot(r) });
      audit(r, "Importul unei versiuni", `${I.file} → ciorna ${r.version}`);
      toast(`Fișierul a fost importat ca ciorna ${r.version} a formularului ${r.id}.`);
      if (B().isGlobal?.() && current === r.id) B().refreshGlobal?.(builderForm(r));
    } else {
      const id = nextId();
      S.used = [...(S.used || []), Number(id.slice(4))];
      r = { id, code: id, scope: "global", schemaVersion: 2, technical: `f_global_${id.slice(4)}`, service: { name: TITLE, rsspCode: "" }, requestTypes: [], settings: { autosave: true, reviewSummary: false },
        nameText: d.meta.nameText, nameKind: d.meta.nameKind || "", title: { ro: "", ru: "", en: "" }, description: { ro: d.meta.description || "", ru: "", en: "" }, access: d.meta.access || "global",
        status: "draft", version: "v1.0.0", editedAt: nowIso(), editedBy: userName(), active: true, deactivation: null, usedBy: [], versions: [], published: null, changed: false, steps: clone(d.schema) };
      r.title.ro = nameOf(r);
      forms().unshift(r);
      audit(r, "Importul unui formular", `${I.file} → ${id}`);
      toast(`Formularul global ${id} a fost creat din ${I.file}.`);
    }
    G().closeModal?.();
    refreshList();
  }

  /* ================================================================ ACTIVATE / DEACTIVATE (US-336) */
  const D = { id: "" };
  function openDeactivate(id) {
    const r = formOf(id);
    if (!r || !who().has) return;
    D.id = id;
    /* AC-13: used by a transition or a request type → blocked, with the usages */
    if (r.usedBy.length) {
      G().openModal?.({
        kind: "frm-blocked",
        title: "Formularul nu poate fi dezactivat",
        subtitle: nameOf(r),
        body: `
          ${U().renderNotice?.("error", `Formularul nu poate fi dezactivat, deoarece este folosit de ${r.usedBy.length} tranziții și tipuri de solicitare.`, { role: "alert" }) || ""}
          ${A().renderStackedList?.("Unde este folosit", [{ label: "", items: r.usedBy.map((u) => ({ plainTitle: u.text, title: esc(u.text), badges: [tag(u.kind, "neutral")], meta: [esc(u.where)] })) }], { meta: plural(r.usedBy.length, "loc", "locuri") }) || ""}`,
        footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
      });
      audit(r, "Dezactivarea formularului", `Blocată: folosit de ${r.usedBy.length} tranziții și tipuri de solicitare.`, "Eșuat");
      return;
    }
    /* AC-04: the confirmation text (tu form), Anulează / Dezactivează (red); the optional „Motiv” of the data model */
    G().openModal?.({
      kind: "frm-deactivate",
      title: "Dezactivezi formularul?",
      subtitle: nameOf(r),
      body: `
        <p class="e-permits-case-form__lead">Un formular inactiv nu mai poate fi ales pentru tranziții și nu mai poate fi legat de un tip de solicitare. Continui?</p>
        <div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
            <label for="frm-off-reason">Motiv</label>
            <div class="e-permits-fo-textarea"><textarea id="frm-off-reason" rows="3" aria-describedby="frm-off-reason-hint" spellcheck="true" data-frm-off-reason></textarea></div>
            ${counterRow("frm-off-reason", "Opțional. Rămâne în Jurnalul de audit.", 0, 500)}
          </div>
        </div>`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-destructive btn-rounded" type="button" data-frm-off-confirm>Dezactivează</button></div>'
    });
  }
  function confirmDeactivate() {
    const r = formOf(D.id);
    if (!r) return;
    const reason = document.querySelector("#frm-off-reason")?.value.trim() || "";
    G().closeModal?.();
    /* AC-14: an error → the message, the form stays active */
    if (demo.has("eroare")) { audit(r, "Dezactivarea formularului", "Eroare la dezactivare.", "Eșuat"); toast("Formularul nu a putut fi dezactivat. Rămâne activ; încearcă din nou.", "error"); return; }
    r.active = false;
    r.deactivation = { at: nowIso(), by: userName(), reason };
    /* AC-12: Schiță / Publicat unchanged · AC-15 */
    audit(r, "Dezactivarea formularului", reason ? `Motiv: ${reason}` : "");
    refreshList();
    toast(`Formularul „${nameOf(r)}” a fost dezactivat.`);
  }
  function activate(id) {
    const r = formOf(id);
    if (!r || !who().has) return;
    if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
    r.active = true;
    r.deactivation = null;
    audit(r, "Activarea formularului");
    refreshList();
    toast(`Formularul „${nameOf(r)}” a fost activat.`);
  }

  /* ================================================================ events */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const add = t.closest('[data-workplace-add-product="frm-new"], [data-frm-new]:is(button)');
    if (add) { event.preventDefault(); openNew(); return; }
    if (t.closest('[data-workplace-secondary-product="frm-import"]')) { event.preventDefault(); openImport(""); return; }
    const pick = (attr) => t.closest(`[${attr}]`)?.getAttribute(attr);
    let id;
    if ((id = pick("data-frm-edit"))) { openForm(id); return; }
    if ((id = pick("data-frm-versions"))) { openVersions(id); return; }
    if ((id = pick("data-frm-export"))) { const r = formOf(id); if (r) exportVersion(r, r.published ? lastVersion(r) : null); return; }
    if ((id = pick("data-frm-deactivate"))) { openDeactivate(id); return; }
    if ((id = pick("data-frm-activate"))) { activate(id); return; }
    if ((id = pick("data-frm-pending"))) { event.stopPropagation(); openPending(id); return; }
    if (t.closest("[data-frm-create]")) { confirmNew(); return; }
    const pub = t.closest("[data-frm-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    if ((id = pick("data-frm-ver-view"))) { openVersion(id); return; }
    if ((id = pick("data-frm-ver-restore"))) { openRestore(id); return; }
    if ((id = pick("data-frm-ver-export"))) { const r = formOf(V.id); exportVersion(r, versionOf(r, id)); return; }
    if (t.closest("[data-frm-ver-back]")) { openVersions(V.id); return; }
    if (t.closest("[data-frm-restore-confirm]")) { confirmRestore(); return; }
    if ((id = pick("data-frm-import-version"))) { openImport(id); return; }
    if (t.closest("[data-frm-import-pick]")) { document.querySelector("[data-frm-import-file]")?.click(); return; }
    const imp = t.closest("[data-frm-import-apply]");
    if (imp) { applyImport(imp); return; }
    if (t.closest("[data-frm-off-confirm]")) { confirmDeactivate(); }
  });
  /* live counters + the full name while typing (create dialog, Motiv) */
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches("#frm-new-name, #frm-new-desc")) {
      readNew();
      const id = el.id;
      const n = id === "frm-new-name" ? nameOf(C.draft).length : String(C.draft.description || "").length;
      const max = id === "frm-new-name" ? NAME_MAX : DESC_MAX;
      const count = document.querySelector(`[data-frm-count="${id}"]`);
      if (count) { count.textContent = `${n}/${max}`; count.classList.toggle("is-over", n > max); }
      if (id === "frm-new-name") { const hint = document.querySelector('[data-frm-hint="frm-new-name"]'); if (hint) hint.textContent = `Denumirea completă: ${nameOf(C.draft)}`; }
    }
    if (el.matches("#frm-off-reason")) { const count = document.querySelector('[data-frm-count="frm-off-reason"]'); if (count) { count.textContent = `${el.value.length}/500`; count.classList.toggle("is-over", el.value.length > 500); } }
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches('select[data-frm-new="nameKind"]')) { readNew(); const n = nameOf(C.draft).length; const count = document.querySelector('[data-frm-count="frm-new-name"]'); if (count) { count.textContent = `${n}/${NAME_MAX}`; count.classList.toggle("is-over", n > NAME_MAX); } const hint = document.querySelector('[data-frm-hint="frm-new-name"]'); if (hint) hint.textContent = `Denumirea completă: ${nameOf(C.draft)}`; }
    if (el.matches("[data-frm-import-file]") && el.files?.[0]) { const file = el.files[0]; file.text().then((text) => readImport(text, file.name)); }
  });

  /* ================================================================ routes + denied (US-331…336 AC-01) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Formulare globale” este disponibil utilizatorilor cu permisiunea de gestionare a formularelor electronice.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#formular-global\/([^/]+)$/.exec(h);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
    document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click();
    /* the direct call of „nou” without the create permission is refused (US-332 AC-02) */
    if (m[1] === "nou") { if (who().create) window.setTimeout(openNew, 300); else showDenied(); return true; }
    window.setTimeout(() => openForm(decodeURIComponent(m[1]), { push: false }), 300);
    return true;
  });
  /* the menu item exists only for who holds the permission (US-331 AC-02) */
  let navQueued = false;
  const syncNav = () => {
    navQueued = false;
    const has = who().has;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${NAV}"]`).forEach((a) => { const li = a.closest("li") || a; if (li.hidden === has) li.hidden = !has; });
  };
  const boot = () => {
    new MutationObserver(() => { if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); } }).observe(document.body, { childList: true, subtree: true });
    syncNav();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for the demo states */
  window.GEAPFormsGlobal = {
    list: () => forms(), get: formOf, openNew, openForm, openVersions, openVersion, openRestore, openPublish, openImport, openDeactivate, openPending, refreshList, perms: who,
    /* a chosen file without the OS dialog: `ok` = an export of FRM-0101 (existing) · `new` = another ID · `bad` = not the format */
    demoImport(kind = "ok") {
      const base = formOf("FRM-0101") || forms()[0];
      const payload = kind === "bad" ? "{\"nume\": \"formular\"}" : JSON.stringify({ format: "geapcfg", object: "form", scope: "global", id: kind === "new" ? "FRM-0412" : base?.id, version: "1.1.0", name: "", meta: kind === "new" ? { nameText: "declarație de conformitate", nameKind: "eliberare", description: "Declarația solicitantului, importată din mediul de test.", access: "global" } : metaOf(base), schema: kind === "new" ? stepsOf([sec("Declarație", [F("checkbox", "Declar că datele sunt corecte", { span: 12, required: true }), F("date", "Data declarației")])]) : clone(base.steps) });
      readImport(payload, kind === "bad" ? "formular.json" : kind === "new" ? "service-form-formular-declaratie-de-conformitate-v1.1.0.geapcfg.json" : "service-form-formular-cerere-retragere-act-v1.1.0.geapcfg.json");
    }
  };
})();
