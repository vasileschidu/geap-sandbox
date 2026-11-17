/* =====================================================================================
   Administrare › Șabloane globale (dtpl-global-v1, 2026-11-17) — Feature 97134 „Gestionarea șabloanelor globale de
   documente” (Epic 88658 Gestionarea Șabloanelor). Child stories: US-337 registrul (97137) · US-338 crearea (97138) ·
   US-339 editorul (97139) · US-340 datele de test + previzualizarea (97140) · US-341 publicarea în MDocs (97141) ·
   US-342 istoricul versiunilor (97142) · US-343 importul din fișier (97143) · US-344 importul din MDocs (97144) ·
   US-345 activarea / dezactivarea / ștergerea (97145).

   A global document template = an MDocs print template that belongs to NO service (common forms, letters). This module is
   the OBJECT layer around the existing service template constructor (js/e-permits-shell.js „Șabloane de tipar”, the
   `[data-dtpl-sheet]`): it owns the registry, the IDs, the lifecycle, the versions; the editor / test data / preview stay
   the shell's (`GEAPDtplEditor.openGlobal(hooks)`). NO new engine — the forms-global-v1 module pattern:
     · list = the BO registry (`window.GEAPShellRegistries["sabloane-globale"]`, menu `shellView: "sabloane-globale-registry"`)
       drawn as the shared stacked list (`stackItem`), header actions „Importă” (`secondaryAction`) · „Importă din MDocs”
       (`tertiaryAction`) · „Șablon global nou” (`primaryAction`);
     · create wizard + „Importă șablon” (MDocs) + „Istoric versiuni” = the ONE module drawer (`.drawer-overlay` + step strip,
       the autoritati.js pattern); dialogs = the library dialog (#case-action-modal via GEAPRegistre.openModal, raised
       over the drawer) + js/config-publish.js (note field); pending review = the shell `openPendingChanges`;
     · audit = `GEAPEventTimeline.log` (the unique Jurnal de audit) — every entry carries the MDocs code (the ACs).
   ID: SDC-NNNN from the shared GEAPObjectId (coding-rules-v1): none on create, the next free one at „Creează șablon”.
   Name (US-329 matrix, row SDC): the document type from the system classifier „Tipuri de documente” (linked to the MDocs
   code) + the process type (classifier, optional) — the user never types the RO name; RU / EN optional.
   Versions: v1.0.0 at creation („Versiune inițială”); a publication in MDocs adds 1 to PATCH (US-341 AC-06 „v1.0.0 →
   v1.0.1”); a save never changes the version. Routes: #sabloane-globale · #sablon-global/<id> · #sablon-global/nou.
   Demo switch ?sabloane= (comma list): fara-permisiune · local (the local administrator holds the permission) · gol ·
   incarcare (the list stays „Se încarcă...”) · eroare-mdocs (publish fails) · mdocs-indisponibil (MDocs import fails) ·
   lipsa-mdocs (SDC-0407 no longer exists in MDocs) · eroare-pdf (Generează PDF fails) · eroare (every save fails).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const CP = () => window.GEAPConfigPublish || {};
  const ED = () => window.GEAPDtplEditor || {};
  const OID = () => window.GEAPObjectId || {};
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

  const KIND = "sabloane-globale";
  const NAV = "sabloane-globale";
  const TITLE = "Șabloane globale";
  const OBJECT = "Șablon global de document";
  /* the AC texts in the „tu” tone (components.md › Ton: tu) — the ACs say „Nu aveți …” / „Descrieți …” (deviation for the PO) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const INTRO = "Șabloane MDocs care nu aparțin unui serviciu: formulare comune și scrisori. Șabloanele unui serviciu se gestionează în configurarea serviciului.";
  const EMPTY_LIST = "Nu există șabloane globale.";
  const NO_MATCH = "Nu s-a găsit niciun șablon.";
  const NOT_IN_MDOCS = "Acest tip de document nu este înregistrat în MDocs.";
  const DUPLICATE = "Există deja un șablon cu acest cod.";
  const MDOCS_IMPORT_FAILED = "Șablonul nu a putut fi importat: MDocs nu este disponibil sau codul tipului de document nu există.";
  const NOT_FOUND = "Șablonul nu a fost găsit.";
  const PUBLISH_FAILED = "Șablonul nu a putut fi publicat în MDocs.";
  const ATTACHED = "Șablonul este atașat unui serviciu și nu poate fi șters.";
  const SAVE_FAILED = "Salvarea a eșuat. Modificările au rămas în editor.";
  const FILE_TYPE = "Fișierul trebuie să fie în formatul .geapcfg.json.";
  const FILE_BAD = "Fișierul nu conține un șablon valid.";
  const DESC_MAX = 250;
  const NAME_MAX = 150;

  /* ---------------------------------------------------------------- MDocs + the Feature's classifiers */
  /* the document types registered in MDocs (Feature 89085); `type` = the system classifier „Tipuri de documente” entry linked
     to the code; `version` / `status` = what an import from MDocs takes over (US-344 AC-08) */
  const MD = (code, type, official, version = "v1.0.0", status = "Published") => ({ code, type, official, version, status });
  const MDOCS = [
    MD("GEAP.ActPermisiv", "Act permisiv", true, "v2.1.0"), MD("GEAP.DecizieRefuz", "Decizie de refuz", true), MD("GEAP.DecizieSuspendare", "Decizie de suspendare a examinării", true),
    MD("GEAP.CerereEmitere", "Cerere de emitere primară", false), MD("GEAP.CertificatConstatator", "Certificat constatator", true), MD("GEAP.ScrisoareInformare", "Scrisoare de informare", false),
    MD("GEAP.ProcesVerbalControl", "Proces-verbal de control", true), MD("GEAP.ScrisoareRaspuns", "Scrisoare de răspuns", false),
    /* in MDocs, not yet managed in SIA GEAP — what „Șablon global nou” / „Importă din MDocs” can take */
    MD("GEAP.NotaPlata", "Notă de plată", false, "v1.3.0"), MD("GEAP.ActTacit", "Act de constatare a aprobării tacite", true, "v1.0.2"),
    MD("GEAP.AvizInterinstitutional", "Aviz interinstituțional", true, "v2.0.0", "Draft"), MD("GEAP.DecizieRetragere", "Decizie de retragere", true, "v1.1.0")
  ];
  const mdocsOf = (code) => MDOCS.find((m) => m.code.toLowerCase() === String(code || "").trim().toLowerCase()) || null;
  /* „tipul procesului” (classifier TPR, US-329 matrix) — appended to the name when the template is per process */
  const PROCESS = ["Emitere primară", "Reperfectare", "Prelungire", "Emitere duplicat", "Suspendare valabilitate", "Reluare valabilitate", "Retragere act", "Contestație", "Retragere cerere", "Redeschidere dosar"];
  const nameOf = (docType, process) => (OID().compose ? OID().compose(docType, process) : [docType, process].filter(Boolean).join(" "));

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("sabloane") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* the permission „Gestionare șabloanelor” (Feature 89940): the Administrator central by default; the Administrator local
     only when granted (?sabloane=local) — US-337 AC-03 */
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    const has = (central || (local && demo.has("local"))) && !demo.has("fara-permisiune");
    return { central, local, has, authority: central ? "" : a.authority || "ansp", roleLabel: a.roleLabel || (central ? "Administrator central" : "Administrator local") };
  }

  /* ---------------------------------------------------------------- template content (seed) */
  /* the A4 body: header, title, one table row per dossier field, the signature block — older versions lack the last rows */
  const ROW = (label, token) => [label, token];
  function htmlOf(title, rows, { intro = "", signed = true, extra = "" } = {}) {
    return `<p><strong>{{AuthorityName}}</strong><br>{{TeamName}}</p>
<h1>${esc(title.toLocaleUpperCase("ro"))}</h1>
<p>Nr. {{CaseNumber}} din {{IssuedOn}}</p>
${intro ? `<p>${intro}</p>\n` : ""}<table>
${rows.map(([l, t], i) => `<tr><td>${i + 1}. ${esc(l)}</td><td>{{${t}}}</td></tr>`).join("\n")}
</table>
${extra}${signed ? "<p>{{#if IsSigned}}<em>Semnat electronic</em> — {{SignedBy}}, {{SignedOn}}{{/if}}</p>" : ""}`;
  }
  const sampleJson = (html) => window.GEAPDtplEditor?.sampleJson?.(html) || "";
  const snapOf = (r) => ({ html: r.html, background: r.background || "", meta: { names: clone(r.names), description: r.description || "", official: Boolean(r.official) } });

  let seeded = 0;
  function seedTpl({ n, code, process = "", ru = "", en = "", description = "", official, status = "published", editedAt, editedBy = "Anastasia Cojocaru", active = true, attached = [], rows, intro = "", extra = "", history = [], changed = null, testData = true }) {
    const md = mdocsOf(code);
    const docType = md.type;
    const html = htmlOf(nameOf(docType, process), rows, { intro, extra });
    const r = {
      id: OID().format ? OID().format("SDC", n) : `SDC-${String(n).padStart(4, "0")}`, code: md.code, docType, process, names: { ro: nameOf(docType, process), ru, en }, name: nameOf(docType, process),
      description, official: official ?? md.official, status, version: "v1.0.0", source: "MDocs", editedAt, editedBy: editedAt ? editedBy : "", active, attached,
      html, background: "", testJson: "", testData: {}, versions: [], published: null, deactivation: null
    };
    /* the versions (newest last), each with the content it had: an older one lacks the last rows */
    r.versions = history.map((h, i) => {
      const keep = rows.length - (history.length - 1 - i);
      const snap = { html: htmlOf(nameOf(docType, process), rows.slice(0, Math.max(1, keep)), { intro, extra }), background: "", meta: { names: clone(r.names), description: h.description ?? description, official: r.official } };
      return { nr: i + 1, version: h.v, type: h.type || (i ? "Publicare" : "Versiune inițială"), note: h.note, at: h.at, by: h.by || editedBy, snap };
    });
    const last = r.versions[r.versions.length - 1];
    if (last) r.version = last.version;
    if (status === "published") r.published = clone(last.snap);
    if (changed) {
      /* saved after the last publication: the current content is newer than the published one (US-339 AC-14) */
      if (changed.dropRow) r.published.html = htmlOf(nameOf(docType, process), rows.slice(0, -1), { intro, extra });
      if (changed.description) r.published.meta.description = changed.description;
    }
    if (testData) { r.testJson = sampleJson(html); try { r.testData = window.GEAPDtplEditor?.parseJson?.(r.testJson)?.data || {}; } catch { r.testData = {}; } }
    seeded = Math.max(seeded, n);
    return r;
  }
  const H = (v, at, note, extra = {}) => ({ v, at, note, ...extra });
  function seed() {
    const list = [
      seedTpl({ n: 401, code: "GEAP.ActPermisiv", description: "Macheta comună a actului permisiv emis la aprobarea dosarului.", editedAt: "2026-11-12T14:30", attached: ["Autorizație sanitară pentru funcționare", "Licență pentru activitatea farmaceutică"],
        rows: [ROW("Titularul", "ApplicantName"), ROW("Cod fiscal", "IDNO"), ROW("Obiectul autorizat", "PermitObject"), ROW("Adresa desfășurării activității", "ActivityAddress"), ROW("Genul de activitate (CAEM)", "ActivityCode"), ROW("Valabil până la", "ValidUntil")],
        history: [H("v1.0.0", "2026-02-10T09:00", "Șablon preluat din GEAP 1."), H("v1.0.1", "2026-03-04T11:20", "Adresa titularului pe un rând separat."), H("v1.0.2", "2026-04-18T10:05", "Antetul autorității cu subdiviziunea."), H("v2.0.0", "2026-06-30T08:00", "Actualizat automat la instalarea versiunii 2.0 a platformei.", { by: "SIA GEAP", type: "Import din MDocs" }), H("v2.0.1", "2026-08-21T15:40", "Genul de activitate după CAEM rev. 2."), H("v2.0.2", "2026-10-02T12:10", "Termenul de valabilitate în tabel."), H("v2.1.0", "2026-11-12T14:30", "Adresa desfășurării activității, la cererea ANSP.")] }),
      seedTpl({ n: 402, code: "GEAP.DecizieRefuz", description: "Motivele refuzului și calea de contestare, comunicate solicitantului.", editedAt: "2026-11-16T16:05", editedBy: "Ion Rusu", attached: ["Autorizație sanitară pentru funcționare"],
        rows: [ROW("Solicitantul", "ApplicantName"), ROW("Serviciul solicitat", "ServiceTitle"), ROW("Data depunerii", "SubmittedOn"), ROW("Numărul dosarului", "CaseNumber")],
        intro: "Examinând cererea, autoritatea a decis refuzul eliberării actului permisiv.",
        history: [H("v1.0.0", "2026-05-12T10:00", "Prima versiune."), H("v1.0.1", "2026-07-03T09:30", "Calea de contestare în text.", { by: "Ion Rusu" })],
        changed: { dropRow: true, description: "Motivele refuzului, comunicate solicitantului." } }),
      seedTpl({ n: 403, code: "GEAP.DecizieSuspendare", description: "Perioada și motivul suspendării examinării dosarului.", editedAt: "2026-09-02T12:15", editedBy: "Mihai Ceban",
        rows: [ROW("Solicitantul", "ApplicantName"), ROW("Suspendat la", "SuspendedOn"), ROW("Suspendat până la", "SuspendedUntil"), ROW("Motivul suspendării", "SuspensionReason")],
        history: [H("v1.0.0", "2026-09-02T12:15", "Prima versiune.", { by: "Mihai Ceban" })] }),
      seedTpl({ n: 404, code: "GEAP.ScrisoareInformare", description: "Scrisoare liberă către solicitant, fără efect juridic.", status: "draft", editedAt: "2026-11-15T11:42", testData: false,
        rows: [ROW("Destinatarul", "ApplicantName"), ROW("Adresa", "LegalAddress"), ROW("Dosarul", "CaseNumber")],
        history: [H("v1.0.0", "2026-11-15T11:42", "Șablon creat în SIA GEAP.")] }),
      seedTpl({ n: 405, code: "GEAP.CerereEmitere", process: "Emitere primară", description: "Cererea tipărită la ghișeu, semnată de solicitant.", status: "draft", editedAt: "2026-11-10T09:05", editedBy: "Elena Munteanu", attached: ["Licență pentru activitatea farmaceutică"],
        rows: [ROW("Solicitantul", "ApplicantName"), ROW("IDNP", "IDNP"), ROW("Serviciul", "ServiceTitle"), ROW("Data depunerii", "SubmittedOn")],
        history: [H("v1.0.0", "2026-11-10T09:05", "Șablon creat în SIA GEAP.", { by: "Elena Munteanu" })] }),
      seedTpl({ n: 406, code: "GEAP.CertificatConstatator", description: "Certificatul care confirmă datele actului în vigoare.", editedAt: "2026-10-08T09:30", active: false,
        rows: [ROW("Titularul", "ApplicantName"), ROW("Numărul actului", "PermitNumber"), ROW("Valabil până la", "ValidUntil")],
        history: [H("v1.0.0", "2026-05-20T14:00", "Prima versiune."), H("v1.0.1", "2026-06-11T10:40", "Numărul actului în tabel.")] }),
      seedTpl({ n: 407, code: "GEAP.ProcesVerbalControl", editedAt: "2026-10-30T08:50", editedBy: "SIA GEAP",
        rows: [ROW("Agentul economic", "CompanyName"), ROW("IDNO", "IDNO"), ROW("Obiectul controlat", "PermitObject"), ROW("Data controlului", "IssuedOn")],
        history: [H("v1.0.0", "2026-04-14T13:20", "Prima versiune."), H("v1.0.1", "2026-10-30T08:50", "Obiectul controlat separat.", { by: "SIA GEAP" })] }),
      seedTpl({ n: 408, code: "GEAP.ScrisoareRaspuns", process: "Contestație", ru: "Письмо-ответ Обжалование", en: "Reply letter Appeal", description: "Răspunsul autorității la contestația depusă.", editedAt: "2026-11-03T17:20", editedBy: "Elena Munteanu",
        rows: [ROW("Contestatarul", "ApplicantName"), ROW("Dosarul contestat", "CaseNumber"), ROW("Data depunerii", "SubmittedOn")],
        history: [H("v1.0.0", "2026-08-14T16:45", "Prima versiune.", { by: "Elena Munteanu" })] })
    ];
    list.find((r) => r.id.endsWith("0406")).deactivation = { at: "2026-10-08T09:30", by: "Anastasia Cojocaru" };
    OID().seen?.("SDC", 412);
    return list;
  }
  const S = { list: null, loaded: false };
  const list = () => { if (!S.list) S.list = demo.has("gol") ? [] : seed(); return S.list; };
  const tplOf = (id) => list().find((r) => r.id === id) || null;
  const byCode = (code) => list().find((r) => r.code.toLowerCase() === String(code || "").trim().toLowerCase()) || null;
  const bump = (v) => { const [M, m, p] = String(v || "v1.0.0").replace(/^v/, "").split(".").map((x) => Number(x) || 0); return `v${M}.${m}.${p + 1}`; };
  const lastVersion = (r) => r.versions[r.versions.length - 1] || null;
  const everPublished = (r) => r.status === "published" || Boolean(r.published);
  /* the „Modificări nepublicate” of a published template: the saved content differs from the published one */
  const pending = (r) => Boolean(r.published) && changesBetween(r.published, snapOf(r)).length > 0;
  const newId = () => (OID().assign ? OID().assign("SDC") : `SDC-${String((seeded += 1)).padStart(4, "0")}`);

  /* ---------------------------------------------------------------- audit (every operation, with the MDocs code) */
  function audit(r, type, detail = "", status = "Reușit") {
    const me = who();
    window.GEAPEventTimeline?.log?.(
      { at: nowIso(), user: userName(), role: me.roleLabel, type, status, detail: [r.code, detail].filter(Boolean).join(" · ") },
      { module: "AdminPortal", authority: me.authority ? me.authority.toUpperCase() : "", objectType: OBJECT, objectId: r.id || "", objectVersion: r.version || "", related: [] }
    );
  }

  /* ---------------------------------------------------------------- changed fields between two snapshots (US-342 AC-11 / 17) */
  const fieldName = (t) => { const l = ED().fieldLabel?.(t); return l ? `Câmpul „${l}”` : `Câmpul {{${t}}}`; };
  function changesBetween(a, b) {
    const out = [];
    const row = (label, before, after) => { if (String(before ?? "") !== String(after ?? "")) out.push({ label, type: !before ? "Adăugat" : !after ? "Eliminat" : "Modificat", before: before || "—", after: after || "—" }); };
    const am = a?.meta || { names: {} }, bm = b.meta;
    if (a) {
      row("Denumire (RO)", am.names?.ro, bm.names.ro);
      row("Denumire (RU)", am.names?.ru, bm.names.ru);
      row("Denumire (EN)", am.names?.en, bm.names.en);
      row("Descriere scurtă", am.description, bm.description);
      if (Boolean(am.official) !== Boolean(bm.official)) out.push({ label: "Document oficial", type: "Modificat", before: am.official ? "Da" : "Nu", after: bm.official ? "Da" : "Nu" });
      if ((a.background || "") !== (b.background || "")) out.push({ label: "Fundal pagină", type: !a.background ? "Adăugat" : !b.background ? "Eliminat" : "Modificat", before: a.background ? "imagine" : "—", after: b.background ? "imagine nouă" : "—" });
    }
    const tokens = (html) => new Set(ED().tokens?.(html)?.used || []);
    const was = a ? tokens(a.html) : new Set(), now = tokens(b.html);
    now.forEach((t) => { if (!was.has(t)) out.push({ label: fieldName(t), type: "Adăugat", before: "—", after: `{{${t}}}` }); });
    was.forEach((t) => { if (!now.has(t)) out.push({ label: fieldName(t), type: "Eliminat", before: `{{${t}}}`, after: "—" }); });
    if (a && a.html !== b.html && !out.some((c) => c.label.startsWith("Câmpul"))) out.push({ label: "Conținutul șablonului", type: "Modificat", before: "versiunea anterioară", after: "text sau formatare" });
    return out;
  }
  const TYPE_TONE = { Adăugat: "success", Modificat: "brand", Eliminat: "danger" };

  /* ================================================================ LIST (US-337) */
  const statusTag = (r) => (r.status === "published" ? tag("Publicat", "success") : tag("Schiță", "neutral"));
  const tagsOf = (r) => [statusTag(r), r.active ? "" : tag("Dezactivat", "neutral"), tag("MDocs", "neutral")].filter(Boolean);
  const rowOf = (r) => ({
    id: r.id, denumire: r.name, cod: r.code, descriere: r.description || "", stare: r.status === "published" ? "Publicat" : "Schiță",
    activ: r.active ? "Activ" : "Dezactivat", versiune: r.version, modificat: r.editedAt || "", r
  });
  /* the card's „Editează” + ⋮ (US-337 assumption: „Editează” and the delete per card; one labelled action + ⋮) */
  function rowActions(r) {
    if (!who().has) return "";
    const menu = [
      { label: "Istoric versiuni", icon: "history", attrs: `data-tpg-versions="${esc(r.id)}"` },
      { label: "Exportă", icon: "export", attrs: `data-tpg-export="${esc(r.id)}"` },
      everPublished(r) && (r.active ? { label: "Dezactivează", icon: "pause", attrs: `data-tpg-deactivate="${esc(r.id)}"` } : { label: "Activează", icon: "rotate-arrow", attrs: `data-tpg-activate="${esc(r.id)}"` }),
      /* US-345 AC-03 / 04: delete only while never published */
      !everPublished(r) && { label: "Șterge", icon: "delete", danger: true, attrs: `data-tpg-delete="${esc(r.id)}"` }
    ].filter(Boolean);
    const html = U().renderRowActions?.({ primary: { label: "Editează", attrs: `data-tpg-edit="${esc(r.id)}" aria-label="Editează ${esc(r.name)}"` }, menu, label: `${r.id} ${r.name}` }) || "";
    /* fixed: the list scrolls inside the registry's table wrap, an in-flow menu would be clipped */
    return html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>");
  }
  const pendingHtml = (r) => A().renderHeaderStatus?.("Modificări nepublicate", "warning", `data-tpg-pending="${esc(r.id)}" aria-haspopup="dialog" data-tooltip-text="Vezi modificările" aria-label="Vezi modificările nepublicate ale ${esc(r.id)}"`) || "modificări nepublicate";
  /* a card = the shared stacked-list row: title + Small tags (stare · Dezactivat · MDocs) · description (only when filled,
     AC-06) · details „SDC-0401 · GEAP.ActPermisiv · v2.1.0 · [● Modificări nepublicate] · Editat 12 noiembrie 2026, 14:30 · who” */
  const stackItem = (row) => {
    const r = row.r;
    const details = [
      OID().listHtml?.(row.id, { meta: true }) || esc(row.id),
      `<span class="e-permits-tpg-code" data-cell-tooltip="${esc(r.code)}">${esc(r.code)}</span>`,
      esc(row.versiune),
      pending(r) ? pendingHtml(r) : "",
      row.modificat ? `Editat ${esc(stampText(row.modificat))}${r.editedBy ? ` · ${esc(r.editedBy)}` : ""}` : "editat -"
    ].filter(Boolean);
    return {
      plainTitle: row.denumire,
      title: esc(row.denumire),
      badges: tagsOf(r),
      meta: row.descriere ? [`<span class="e-permits-rpt-list__desc" data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>`] : details,
      meta2: row.descriere ? details : null,
      actionsHtml: rowActions(r)
    };
  };
  function registryDb() {
    const me = who();
    /* AC-12: „Se încarcă...” until the list arrives (MDocs answers in ~0.5 s; ?sabloane=incarcare keeps it loading) */
    if (me.has && !S.loaded && !demo.has("incarcare")) window.setTimeout(() => { S.loaded = true; refreshList(); }, 500);
    const ready = me.has && S.loaded && !demo.has("incarcare");
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
        cod: { label: "Cod tip document MDocs", width: 240, sortable: true },
        stare: { label: "Stare", width: 128, sortable: true },
        versiune: { label: "Versiune", width: 112, sortable: true },
        modificat: { label: "Editat", width: 184, sortable: true },
        ...(me.has ? { actiuni: { label: "", width: 160, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după denumire sau cod",
          columns: ["id", "denumire", "cod", "stare", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
          tabs: [],
          /* Feature „Descriere UX” + US-337 AC-10: „Importă” · „Importă din MDocs” · „Șablon global nou” in the header */
          primaryAction: me.has ? { id: "tpg-new", label: "Șablon global nou" } : null,
          secondaryAction: me.has ? { id: "tpg-import", label: "Importă" } : null,
          tertiaryAction: me.has ? { id: "tpg-import-mdocs", label: "Importă din MDocs" } : null,
          toolbarLabel: "Filtrare șabloane globale"
        }
      },
      runtimeRows: ready ? list().map(rowOf) : []
    };
  }
  const SORT = { modificat: (r) => r.modificat || "0000", versiune: (r) => r.versiune.replace(/\d+/g, (d) => d.padStart(3, "0")) };
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "stare", label: "Stare", get: (row) => row.stare },
        { key: "activ", label: "Activitate", get: (row) => row.activ }
      ];
    },
    /* US-337 AC-07 / 14: by name or code, part of it, case (and diacritics) ignored */
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)} ${row.cod} ${row.cod.toLowerCase()}`,
    stackItem,
    stackClass: "e-permits-rpt-list e-permits-dsh-list",
    stackIntro: INTRO,
    sort: {
      keys: [{ value: "modificat", label: "Ultima editare" }, { value: "denumire", label: "Denumire" }, { value: "cod", label: "Cod MDocs" }],
      orders: (key) => ({
        modificat: [{ value: "desc", label: "Cele mai noi întâi" }, { value: "asc", label: "Cele mai vechi întâi" }],
        denumire: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }],
        cod: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }]
      })[key] || []
    },
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    rowClass: (row) => (row.r.active ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "stare": return statusTag(row.r);
        case "modificat": return row.modificat ? esc(stampText(row.modificat)) : "-";
        case "actiuni": return rowActions(row.r);
        default: return esc(row[key] ?? "");
      }
    },
    /* the card opens the editor (US-337 AC-11) */
    openRow: (id) => openEditor(id),
    rowLabel: (row) => `${row.id}, ${row.denumire} — deschide în editor`,
    emptyHtml: ({ query, filtered, boxed = false }) => {
      const bare = !boxed;
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare });
      if (!S.loaded || demo.has("incarcare")) return E()?.render({ title: "Se încarcă...", text: "Preluăm șabloanele din MDocs.", loading: true, bare });
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după denumire sau după codul tipului de document MDocs.", icon: "search", bare, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: EMPTY_LIST, text: "Creează primul șablon global sau importă-l din MDocs.", icon: "page-text", bare, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-tpg-new>Șablon global nou</button>' });
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

  /* ================================================================ form vocabulary (the BO drawer form) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error" role="alert">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  function textField(key, label, value, { required = false, max = 0, hint = "", span = 12, error = "", placeholder = "", attr = "data-tpg-field", id = `tpg-${key}` } = {}) {
    const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ");
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value)}" autocomplete="off" spellcheck="false"${max ? ` maxlength="${max}"` : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${describedBy ? ` aria-describedby="${describedBy}"` : ""} ${attr}="${key}">
        </div>
        ${error ? errorHtml(id, error) : ""}
        ${hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(key, label, value, { max = DESC_MAX, hint = "Opțională. Se afișează sub denumire, în registru.", attr = "data-tpg-field", id = `tpg-${key}` } = {}) {
    const n = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">${esc(label)}</label>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" maxlength="${max}" aria-describedby="${id}-hint" spellcheck="true" ${attr}="${key}">${esc(value)}</textarea></div>
        <p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value" data-tpg-count="${id}">${n}/${max}</span></p>
      </div>`;
  }
  const roField = (label, html, { span = 12, hint = "", id = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <span class="e-permits-cfg-ro__label">${esc(label)}</span>
      <div class="e-permits-cfg-ro"${hint && id ? ` aria-describedby="${id}-hint"` : ""}>${html}</div>
      ${hint ? `<p class="e-permits-fo-field__hint"${id ? ` id="${id}-hint"` : ""}>${esc(hint)}</p>` : ""}
    </div>`;
  const selectField = (id, attrs, label, options, value, hint = "") => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label for="${id}">${esc(label)}</label>
      ${U().renderFoSelectControl?.({ id, attrs, optionsHtml: options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("") }) || ""}
      ${hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
    </div>`;
  const section = (title, body) => `
    <section class="e-permits-user-create__section">
      ${title ? `<h3 class="e-permits-user-create__section-title">${esc(title)}</h3>` : ""}
      <div class="e-permits-user-create__section-content">${body}</div>
    </section>`;
  const grid = (...fields) => `<div class="e-permits-user-create__grid">${fields.join("")}</div>`;
  const detailCard = (rows) => `<div class="e-permits-dosar-profil__card">${rows.map((row) => G().detailRow?.(row) || "").join("")}</div>`;

  /* ================================================================ the ONE drawer (create · import from MDocs · versions) */
  let drawer = null;
  let F = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay e-permits-tpg-drawer" data-tpg-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" tabindex="-1" data-tpg-drawer-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="tpg-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="tpg-drawer-title" data-tpg-drawer-title></h2>
              <p class="drawer__subtitle" data-tpg-drawer-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-tpg-drawer-close>${icon("cross-large", 16)}</button>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-tpg-steps hidden></nav>
          <div class="drawer__body" data-tpg-drawer-body></div>
          <footer class="drawer__footer" data-tpg-drawer-footer></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onDrawerClick);
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    drawer.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || document.querySelector("#case-action-modal.is-active, .modal-overlay.e-permits-confirm-overlay.is-active, body > .e-permits-fo-select__list")) return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    });
    return drawer;
  }
  function openDrawer(state, focusSel = "") {
    F = { back: document.activeElement, errors: {}, dirty: false, ...state };
    const d = ensureDrawer();
    renderDrawer("top");
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus: () => (focusSel && d.querySelector(focusSel)) || d.querySelector(".drawer") });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); }
    requestAnimationFrame(() => ((focusSel && d.querySelector(focusSel)) || d.querySelector(".drawer"))?.focus());
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    const back = F?.back;
    F = null;
    if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer);
    else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); }
    if (back?.isConnected) back.focus();
  }
  /* US-338 AC-14 / US-344 AC-11: closing never creates / imports; with data entered it asks first (drawer rule) */
  function requestClose() {
    if (!F) return;
    if (!F.dirty || F.mode === "versions") { closeDrawer(); return; }
    U().askConfirm?.({ title: F.mode === "create" ? "Renunți la șablonul nou?" : "Renunți la import?", text: "Datele introduse nu se păstrează.", confirmLabel: "Renunță", destructive: true }, closeDrawer);
  }
  const VIEWS = {
    create: {
      lg: () => false,
      title: () => "Șablon global nou",
      subtitle: () => "Nu aparține unui serviciu; se păstrează în MDocs.",
      steps: () => A().renderStepStrip?.(CREATE_STEPS, { step: F.step, maxStep: F.maxStep }, "data-tpg-goto") || "",
      body: () => createBody(),
      footer: () => createFooter()
    },
    mdocs: {
      lg: () => false,
      title: () => "Importă șablon",
      subtitle: () => "Un șablon existent în MDocs, legat prin codul tipului de document.",
      body: () => mdocsBody(),
      footer: () => mdocsFooter()
    },
    versions: {
      lg: () => true,
      title: () => "Istoric versiuni",
      subtitle: () => tplOf(F.id)?.name || "",
      body: () => versionsBody(),
      footer: () => '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-tpg-drawer-close>Închide</button></div>'
    }
  };
  function renderDrawer(focusSel = "") {
    if (!F) return;
    const d = ensureDrawer();
    const active = document.activeElement;
    const keep = focusSel || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const top = d.querySelector(".drawer__body")?.scrollTop || 0;
    const view = VIEWS[F.mode];
    d.querySelector(".drawer").classList.toggle("drawer--lg", Boolean(view.lg?.()));
    d.querySelector("[data-tpg-drawer-title]").textContent = view.title();
    const sub = d.querySelector("[data-tpg-drawer-subtitle]");
    sub.textContent = view.subtitle?.() || ""; sub.hidden = !sub.textContent;
    const steps = d.querySelector("[data-tpg-steps]");
    const strip = view.steps?.();
    steps.hidden = !strip; steps.innerHTML = strip || "";
    d.querySelector("[data-tpg-drawer-body]").innerHTML = view.body();
    d.querySelector("[data-tpg-drawer-footer]").innerHTML = view.footer();
    d.querySelector(".drawer__body").scrollTop = focusSel === "top" ? 0 : top;
    if (keep && keep !== "top") {
      const el = d.querySelector(keep);
      el?.focus?.();
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
    }
  }
  const footerHtml = (summary, buttons) => `${summary ? `<span class="e-permits-rt__summary" aria-live="polite">${esc(summary)}</span>` : ""}<div class="modal-buttons">${buttons}</div>`;
  const offAttrs = (reason) => (reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : "");

  /* ================================================================ CREATE (US-338) — the 3-step wizard */
  const CREATE_STEPS = ["Cod șablon", "Detalii document", "Verificare"];
  function openCreate() {
    if (!who().has) { showDenied(); return; }
    openDrawer({ mode: "create", step: 1, maxStep: 1, v: { code: "", process: "", ru: "", en: "", description: "", official: false }, md: null }, "#tpg-code");
  }
  function createBody() {
    const v = F.v, e = F.errors;
    if (F.step === 1) {
      return section("Tipul de document din MDocs", grid(
        textField("code", "Cod tip document MDocs", v.code, { required: true, max: 80, placeholder: "de ex. GEAP.ActPermisiv", error: e.code, hint: "Codul tipului de document înregistrat în MDocs. Nu se mai modifică după creare." })
      ));
    }
    const md = F.md;
    const full = nameOf(md.type, v.process);
    if (F.step === 2) {
      return `
        ${section("Denumire", grid(
          roField("Tipul documentului", esc(md.type), { hint: "Din clasificatorul „Tipuri de documente”, legat de codul MDocs.", id: "tpg-doctype" }),
          selectField("tpg-process", 'data-tpg-select="process"', "Tipul procesului", [["", "Fără"], ...PROCESS.map((p) => [p, p])], v.process, "Opțional. Se adaugă la sfârșitul denumirii, când șablonul este pentru un singur tip de proces."),
          roField("Denumire (RO)", `<strong data-tpg-full>${esc(full)}</strong>`, { hint: "Se compune automat: tipul documentului și tipul procesului.", id: "tpg-name-ro" }),
          textField("ru", "Denumire (RU)", v.ru, { max: NAME_MAX, span: 6, hint: "Opțională." }),
          textField("en", "Denumire (EN)", v.en, { max: NAME_MAX, span: 6, hint: "Opțională." })
        ))}
        ${section("Descriere", grid(areaField("description", "Descriere scurtă", v.description)))}
        ${section("MDocs", U().renderToggle?.({ label: "Document oficial", description: "Tipul de document este înregistrat ca oficial în MDocs.", checked: v.official, attrs: 'data-tpg-official' }) || "")}`;
    }
    return `
      ${section("Verificare", U().renderInfoNote?.("Șablonul se creează în starea „Schiță”, versiunea v1.0.0, cu sursa MDocs. Conținutul îl completezi în editor, apoi îl publici în MDocs.") + detailCard([
        ["Cod tip document MDocs", esc(md.code)],
        ["Denumire (RO)", esc(full)],
        ["Denumire (RU)", v.ru ? esc(v.ru) : "—"],
        ["Denumire (EN)", v.en ? esc(v.en) : "—"],
        ["Descriere scurtă", v.description ? esc(v.description) : "—"],
        ["Document oficial", v.official ? "Da" : "Nu"],
        ["ID", "se atribuie la creare"]
      ]))}`;
  }
  function createFooter() {
    const summary = `Pasul ${F.step} din ${CREATE_STEPS.length} · ${CREATE_STEPS[F.step - 1]}`;
    const cancel = '<button class="btn btn-neutral btn-rounded" type="button" data-tpg-drawer-close>Anulează</button>';
    const back = '<button class="btn btn-neutral btn-rounded" type="button" data-tpg-back>Înapoi</button>';
    /* US-338 AC-04: „Următor” becomes active once the code is filled */
    if (F.step === 1) return footerHtml(summary, `${cancel}<button class="btn btn-primary btn-rounded" type="button" data-tpg-next${offAttrs(String(F.v.code).trim() ? "" : "Completează codul tipului de document MDocs.")}>Următor</button>`);
    if (F.step === 2) return footerHtml(summary, `${back}<button class="btn btn-primary btn-rounded" type="button" data-tpg-next>Următor</button>`);
    return footerHtml(summary, `${back}<button class="btn btn-primary btn-rounded" type="button" data-tpg-create>Creează șablon</button>`);
  }
  function checkCode(code) {
    if (!String(code || "").trim()) return "Completează codul tipului de document MDocs.";
    if (byCode(code)) return DUPLICATE;
    if (!mdocsOf(code)) return NOT_IN_MDOCS;
    return "";
  }
  function createNext() {
    if (F.step === 1) {
      const problem = checkCode(F.v.code);
      /* AC-05 / 06: the message under the field, the wizard stays on step 1 */
      if (problem) { F.errors = { code: problem }; renderDrawer("#tpg-code"); return; }
      F.errors = {};
      F.md = mdocsOf(F.v.code);
      F.v.code = F.md.code;
      F.step = 2;
    } else if (F.step === 2) F.step = 3;
    F.maxStep = Math.max(F.maxStep, F.step);
    renderDrawer("top");
    requestAnimationFrame(() => drawer?.querySelector(F.step === 2 ? "#tpg-process" : "[data-tpg-create]")?.focus());
  }
  function createGoto(step) {
    const n = Number(step) || 1;
    if (n >= F.step) return;
    F.step = n;
    renderDrawer("top");
  }
  function confirmCreate() {
    const v = F.v, md = F.md;
    if (demo.has("eroare")) { toast(SAVE_FAILED.replace(" Modificările au rămas în editor.", ""), "error"); return; }
    /* AC-11 / 12 / 13 / 16: Schiță, v1.0.0, MDocs, ID SDC-NNNN, no service, version 1 = „Versiune inițială” */
    const at = nowIso();
    const title = nameOf(md.type, v.process);
    const r = {
      id: newId(), code: md.code, docType: md.type, process: v.process, names: { ro: title, ru: v.ru.trim(), en: v.en.trim() }, name: title,
      description: v.description.trim(), official: Boolean(v.official), status: "draft", version: "v1.0.0", source: "MDocs", editedAt: at, editedBy: userName(),
      active: true, attached: [], html: htmlOf(title, [ROW("Solicitantul", "ApplicantName"), ROW("Numărul dosarului", "CaseNumber")]), background: "", testJson: "", testData: {}, versions: [], published: null, deactivation: null
    };
    r.versions.push({ nr: 1, version: "v1.0.0", type: "Versiune inițială", note: "Șablon creat în SIA GEAP.", at, by: r.editedBy, snap: snapOf(r) });
    list().unshift(r);
    OID().logAssign?.(OBJECT, r.id, r.name);
    /* AC-17 */
    audit(r, "Crearea șablonului global", `${r.id} · ${r.name}`);
    closeDrawer();
    refreshList();
    toast(`Șablonul global ${r.id} a fost creat.`);
    /* AC-15: the editor opens on the new template */
    window.setTimeout(() => openEditor(r.id), 200);
  }

  /* ================================================================ IMPORT FROM MDocs (US-344) — the panel */
  function openMdocs() {
    if (!who().has) { showDenied(); return; }
    openDrawer({ mode: "mdocs", v: { code: "", name: "", description: "" }, notice: "" }, "#tpg-m-code");
  }
  function mdocsBody() {
    const v = F.v, e = F.errors;
    const md = mdocsOf(v.code);
    return `
      ${section("Șablonul din MDocs", (F.notice ? U().renderNotice?.("error", esc(F.notice), { role: "alert" }) || "" : "") + grid(
        textField("code", "Cod tip document MDocs", v.code, { required: true, max: 80, placeholder: "de ex. GEAP.NotaPlata", error: e.code, hint: "Codul tipului de document din MDocs. Nu se mai modifică după import.", attr: "data-tpg-m", id: "tpg-m-code" }),
        textField("name", "Denumirea șablonului", v.name, { max: NAME_MAX, placeholder: md ? md.type : "", hint: "Opțională. Implicit, tipul documentului din clasificatorul „Tipuri de documente”.", attr: "data-tpg-m", id: "tpg-m-name" }),
        areaField("description", "Descriere scurtă", v.description, { attr: "data-tpg-m", id: "tpg-m-description" })
      ))}`;
  }
  const mdocsFooter = () => footerHtml("", `<button class="btn btn-neutral btn-rounded" type="button" data-tpg-drawer-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-tpg-mdocs-apply${offAttrs(String(F.v.code).trim() ? "" : "Completează codul tipului de document MDocs.")}>Importă șablon</button>`);
  function applyMdocs() {
    const v = F.v;
    F.errors = {}; F.notice = "";
    /* AC-07: the code already belongs to a global template */
    if (byCode(v.code)) { F.errors.code = DUPLICATE; renderDrawer("#tpg-m-code"); return; }
    const md = demo.has("mdocs-indisponibil") ? null : mdocsOf(v.code);
    /* AC-06: MDocs down or the code does not exist → nothing imported */
    if (!md) { F.notice = MDOCS_IMPORT_FAILED; audit({ code: v.code.trim(), id: "", version: "" }, "Importul unui șablon global din MDocs", "MDocs nu a răspuns sau codul nu există.", "Eșuat"); renderDrawer("#tpg-m-code"); return; }
    const at = nowIso();
    const title = v.name.trim() || md.type;
    const html = htmlOf(md.type, [ROW("Titularul", "ApplicantName"), ROW("Numărul dosarului", "CaseNumber"), ROW("Suma", "Amount")]);
    /* AC-08 / 09 / 10: the version and the status of MDocs, source MDocs, ID SDC-NNNN, no service */
    const r = {
      id: newId(), code: md.code, docType: md.type, process: "", names: { ro: title, ru: "", en: "" }, name: title, description: v.description.trim(), official: md.official,
      status: md.status === "Published" ? "published" : "draft", version: md.version, source: "MDocs", editedAt: at, editedBy: userName(), active: true, attached: [],
      html, background: "", testJson: "", testData: {}, versions: [], published: null, deactivation: null
    };
    r.versions.push({ nr: 1, version: md.version, type: "Import din MDocs", note: `Preluat din MDocs (${md.status === "Published" ? "publicat" : "schiță"}).`, at, by: r.editedBy, snap: snapOf(r) });
    if (r.status === "published") r.published = snapOf(r);
    list().unshift(r);
    OID().logAssign?.(OBJECT, r.id, r.name);
    audit(r, "Importul unui șablon global din MDocs", `${r.id} · ${md.version}`);
    closeDrawer();
    refreshList();
    toast(`Șablonul ${md.code} a fost importat din MDocs ca ${r.id}.`);
    /* AC-12: opens in the editor */
    window.setTimeout(() => openEditor(r.id), 200);
  }

  /* ================================================================ EDITOR (US-339 · US-340 · US-341) — the shell constructor */
  let current = null;
  function openEditor(id, { push = true, view = "" } = {}) {
    const r = tplOf(id);
    if (!who().has) { showDenied(); return; }
    /* US-339 AC-16: no longer in MDocs → not opened */
    if (!r || (demo.has("lipsa-mdocs") && r.id === "SDC-0407")) { toast(NOT_FOUND, "error"); if (r) audit(r, "Deschiderea șablonului în editor", NOT_FOUND, "Eșuat"); return; }
    if (!ED().openGlobal) { toast("Editorul de șabloane nu este disponibil.", "error"); return; }
    current = id;
    ED().openGlobal(hooksFor(id, view));
    if (push) A().writeHash?.(`#sablon-global/${id}`, { push: true });
  }
  function hooksFor(id, view) {
    return {
      view: view || "template",
      tpl: () => tplOf(id),
      tagsHtml: () => { const r = tplOf(id); return r ? `<span class="e-permits-tpg-head-tags">${[statusTag(r), r.active ? "" : tag("Dezactivat", "neutral")].filter(Boolean).join("")}</span>` : ""; },
      meta: () => { const r = tplOf(id); return { pending: Boolean(r && pending(r)), canPublish: Boolean(r && (r.status === "draft" || pending(r))) }; },
      onSave: (d) => saveContent(id, d),
      onTestData: (json, data) => saveTestData(id, json, data),
      onGenerate: () => { const r = tplOf(id); const ok = !demo.has("eroare-pdf"); if (r) audit(r, "Previzualizarea PDF a șablonului", ok ? "PDF generat cu datele de test." : "Documentul nu a putut fi generat.", ok ? "Reușit" : "Eșuat"); return ok; },
      onPublish: () => openPublish(id),
      onHistory: () => openVersions(id),
      onPending: () => openPending(id),
      onBackground: (cur) => openBackground(cur),
      onClose: () => { current = null; refreshList(); if (/^#sablon-global\//.test(window.location.hash)) A().writeHash?.(`#${NAV}`, { push: false }); }
    };
  }
  /* US-339 AC-14 / 18: „Salvează” keeps the content, „Modificări nepublicate” after a publication, the editor + date */
  function saveContent(id, d) {
    const r = tplOf(id);
    if (!r) return false;
    if (demo.has("eroare")) { audit(r, "Modificarea conținutului șablonului", SAVE_FAILED, "Eșuat"); toast(SAVE_FAILED, "error"); return false; }
    r.html = d.html; r.background = d.background || ""; r.testJson = d.testJson ?? r.testJson; r.testData = d.testData || r.testData;
    r.editedAt = nowIso(); r.editedBy = userName();
    audit(r, "Modificarea conținutului șablonului", `${r.id} · salvat, nepublicat`);
    refreshList();
    toast(r.published ? "Șablonul a fost salvat. Documentele se generează din versiunea publicată până la „Publică în MDocs”." : "Șablonul a fost salvat ca schiță.");
    return true;
  }
  /* US-340 AC-05 / 15: the test data stay with the template; never part of the published content */
  function saveTestData(id, json, data) {
    const r = tplOf(id);
    if (!r) return false;
    if (json == null) { audit(r, "Salvarea datelor de test", "Datele de test nu sunt în format JSON valid.", "Eșuat"); return false; }
    if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return false; }
    r.testJson = json; r.testData = data || {};
    audit(r, "Salvarea datelor de test", plural(Object.keys(r.testData).length, "câmp", "câmpuri"));
    toast("Datele de test au fost salvate.");
    return true;
  }

  /* ---- Fundal de pagină (US-339 AC-12): Aplică · Elimină · Anulează */
  const DEMO_BG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><rect x="24" y="24" width="746" height="1075" rx="8" fill="none" stroke="#C9D7F2" stroke-width="2"/><rect x="36" y="36" width="722" height="1051" rx="4" fill="none" stroke="#E3EBF8" stroke-width="1"/><circle cx="397" cy="560" r="180" fill="#F3F6FC"/></svg>')}`;
  const B = { value: "", picked: "" };
  function openBackground(cur) {
    B.value = cur || ""; B.picked = cur || "";
    renderBackground();
  }
  function renderBackground() {
    modal({
      kind: "tpg-bg",
      title: "Fundal de pagină",
      subtitle: "Imaginea acoperă toată pagina A4 a documentului.",
      body: `
        <div class="e-permits-tpg-bg">
          <div class="e-permits-tpg-bg__thumb${B.picked ? "" : " is-empty"}"${B.picked ? ` style="background-image:url('${B.picked}')"` : ""}>${B.picked ? "" : '<span class="e-permits-fo-field__hint">Fără fundal: pagina este albă.</span>'}</div>
          <div class="e-permits-tpg-bg__tools">
            <button class="btn btn-secondary btn-md" type="button" data-tpg-bg-pick>${icon("image")}<span>${B.picked ? "Alege altă imagine" : "Alege imaginea"}</span></button>
            <input class="u-visually-hidden" type="file" accept="image/png,image/jpeg,image/svg+xml" tabindex="-1" aria-hidden="true" data-tpg-bg-file>
            <p class="e-permits-fo-field__hint">PNG, JPG sau SVG, de preferință 210 × 297 mm.</p>
          </div>
        </div>`,
      footer: `<div class="modal-buttons">${B.value ? `<button class="btn btn-outline-destructive btn-rounded" type="button" data-tpg-bg-remove>${icon("delete")}<span>Elimină</span></button>` : ""}<button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-tpg-bg-apply${offAttrs(B.picked && B.picked !== B.value ? "" : "Alege mai întâi o imagine.")}>Aplică</button></div>`
    });
  }

  /* ---- pending review (US-341 AC-03): the shared dialog, published vs saved */
  function openPending(id) {
    const r = tplOf(id);
    if (!r) return;
    const changes = changesBetween(r.published, snapOf(r)).map((c) => ({ area: c.label, detail: `${c.before} → ${c.after}`, at: r.editedAt, user: r.editedBy || "", status: c.type }));
    A().openPendingChanges?.({ subject: `${r.name} · față de ${lastVersion(r)?.version || r.version}`, changes, publishLabel: "Publică în MDocs", onPublish: who().has ? () => (ED().isGlobal?.() ? openPublish(id) : (openEditor(id), window.setTimeout(() => openPublish(id), 300))) : null });
  }

  /* ================================================================ PUBLISH IN MDocs (US-341) */
  const P = { id: "", error: "" };
  function openPublish(id, { error = "", note = "" } = {}) {
    const r = tplOf(id);
    if (!r || !who().has) return;
    P.id = id; P.error = error;
    const next = bump(r.version);
    const changes = changesBetween(r.published || lastVersion(r)?.snap || null, snapOf(r));
    /* AC-14 / 15: „Publică vX în MDocs?” · documents issued from now use it, issued ones unchanged · required „Ce s-a
       schimbat”; AC-11: MDocs does not answer → the AC message, status and version unchanged */
    modal({
      kind: "tpg-publish",
      title: `Publică ${next} în MDocs?`,
      subtitle: r.name,
      body: `
        ${error ? U().renderNotice?.("error", `<strong>${esc(error)}</strong> Starea și versiunea au rămas ${esc(r.status === "published" ? "Publicat" : "Schiță")}, ${esc(r.version)}. Încearcă din nou.`, { role: "alert" }) || "" : ""}
        ${U().renderNotice?.("info", `<strong>Documentele emise de acum folosesc versiunea ${esc(next)}.</strong> Cele deja emise rămân neschimbate, cu versiunea cu care au fost generate.`) || ""}
        ${changes.length ? changeList(changes, `Câmpuri modificate (${changes.length})`) : ""}
        ${CP().noteField?.("tpg-publish-note", note, { placeholder: "Descrie pe scurt modificările" }) || ""}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-tpg-publish-confirm>Publică în MDocs</button></div>'
    });
  }
  function confirmPublish() {
    const r = tplOf(P.id);
    if (!r) return;
    const field = document.querySelector("#tpg-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { CP().setModalError?.(field, "Descrie ce s-a schimbat."); return; }
    if (note.length > 500) { CP().setModalError?.(field, "Textul poate avea cel mult 500 de caractere."); return; }
    if (demo.has("eroare-mdocs")) { audit(r, "Publicarea șablonului în MDocs", PUBLISH_FAILED, "Eșuat"); openPublish(r.id, { error: PUBLISH_FAILED, note }); return; }
    const from = r.version;
    r.version = bump(r.version);
    r.status = "published";
    r.editedAt = nowIso(); r.editedBy = userName();
    r.versions.push({ nr: r.versions.length + 1, version: r.version, type: "Publicare", note, at: r.editedAt, by: r.editedBy, snap: snapOf(r) });
    r.published = snapOf(r);
    /* AC-18 */
    audit(r, "Publicarea șablonului în MDocs", `${from} → ${r.version} · ${note}`);
    G().closeModal?.();
    ED().refresh?.();
    refreshList();
    toast(`Versiunea ${r.version} este în MDocs. Documentele emise de acum o folosesc.`);
  }
  const changeList = (changes, title) => A().renderStackedList?.(title, [{ label: "", items: changes.map((c) => ({
    plainTitle: c.label, title: esc(c.label), badges: [tag(c.type, TYPE_TONE[c.type] || "neutral")],
    meta: [CP().diffHtml ? CP().diffHtml({ before: esc(c.before), after: esc(c.after) }) : `${esc(c.before)} → ${esc(c.after)}`]
  })) }], { className: "e-permits-wid-changes" }) || "";

  /* ================================================================ VERSIONS (US-342) — the panel */
  function openVersions(id) {
    const r = tplOf(id);
    if (!r || !who().has) return;
    audit(r, "Consultarea istoricului versiunilor");
    openDrawer({ mode: "versions", id, page: 1, perPage: 5 });
  }
  function versionsBody() {
    const r = tplOf(F.id);
    if (!r) return "";
    const all = [...r.versions].reverse();
    const pages = Math.max(1, Math.ceil(all.length / F.perPage));
    F.page = Math.min(F.page, pages);
    const shown = all.slice((F.page - 1) * F.perPage, F.page * F.perPage);
    const cur = lastVersion(r)?.nr;
    const rows = shown.map((v) => {
      const menu = [
        { label: "Vizualizează", icon: "eye-open", attrs: `data-tpg-ver-view="${v.nr}"` },
        { label: "Câmpuri modificate", icon: "page-text", attrs: `data-tpg-ver-fields="${v.nr}"` },
        { label: "Exportă", icon: "export", attrs: `data-tpg-ver-export="${v.nr}"` }
      ];
      return `
        <tr>
          <td>${v.nr}</td>
          <td><span class="e-permits-reg-version">${esc(v.version)}${v.nr === cur ? tag("curentă", "brand") : ""}</span></td>
          <td><span data-cell-tooltip="${esc(v.type)}">${esc(v.type)}</span></td>
          <td><span data-cell-tooltip="${esc(v.note)}">${esc(v.note)}</span></td>
          <td>${A().renderDateTime?.(v.at) || esc(stampText(v.at))}</td>
          <td><span data-cell-tooltip="${esc(v.by)}">${esc(v.by)}</span></td>
          <td class="e-permits-reg-table__action">${(U().renderStackMenu?.(menu, `Versiunea ${v.version}`) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</td>
        </tr>`;
    }).join("");
    const th = (label) => `<th scope="col"><span class="e-permits-workplace__th-content"><span>${label}</span></span></th>`;
    return `
      ${U().renderInfoNote?.("Versiunile nu se șterg. Fiecare publicare în MDocs adaugă o versiune; cea mai nouă este „curentă”.") || ""}
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Versiuni</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-passport__lead">${esc(`${plural(all.length, "versiune", "versiuni")} · curentă: ${lastVersion(r)?.version || r.version}`)}</p>
          <div class="e-permits-workplace__table-wrap e-permits-reg-table">
            <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-reg-table__table--versions">
              <caption class="u-visually-hidden">Versiunile șablonului ${esc(r.name)}, de la cea mai nouă</caption>
              <thead><tr>${th("Nr.")}${th("Versiune")}${th("Tipul modificării")}${th("Ce s-a schimbat")}${th("Data")}${th("Autor")}<th scope="col"><span class="u-visually-hidden">Acțiuni</span></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${window.GEAPPager?.html({ total: all.length, page: F.page, perPage: F.perPage, sizes: [5, 10, 20], prefix: "tpgv", label: "Paginarea versiunilor", sizeLabel: "Rânduri pe pagină" }) || ""}
        </div>
      </section>`;
  }
  const versionOf = (r, nr) => r?.versions.find((v) => String(v.nr) === String(nr)) || null;
  /* the library dialog; over the versions panel it is raised (the askConfirm layer) */
  function modal(opts) {
    const overDrawer = Boolean(drawer && !drawer.hidden);
    document.querySelector("#case-action-modal")?.classList.toggle("e-permits-confirm-overlay", overDrawer);
    G().openModal?.(opts);
    const body = document.querySelector("#case-action-modal [data-case-modal-body]");
    if (body) requestAnimationFrame(() => A().syncStackMetaRows?.(body));
  }
  /* „Vizualizează” (AC-10): the version's content, read-only (fields as chips on the A4 page) */
  function openVersion(nr) {
    const r = tplOf(F?.id);
    const v = versionOf(r, nr);
    if (!v) return;
    audit(r, "Vizualizarea unei versiuni", v.version);
    modal({
      kind: "tpg-version",
      title: `Versiunea ${v.version}`,
      subtitle: v.snap.meta.names.ro,
      body: `
        ${detailCard([["Nr.", esc(String(v.nr))], ["Tipul modificării", esc(v.type)], ["Ce s-a schimbat", esc(v.note)], ["Data", esc(stampText(v.at))], ["Autor", esc(v.by)], ["Document oficial", v.snap.meta.official ? "Da" : "Nu"]])}
        <div class="e-permits-tpg-version__canvas">${ED().pageHtml?.(v.snap.html, { background: v.snap.background }) || ""}</div>`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-tpg-ver-export="${v.nr}">${icon("export")}<span>Exportă</span></button><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
  }
  /* „Câmpuri modificate” (AC-11 / 17): each field with the change type and the values before / after */
  function openFields(nr) {
    const r = tplOf(F?.id);
    const v = versionOf(r, nr);
    if (!v) return;
    const prev = versionOf(r, v.nr - 1);
    const changes = changesBetween(prev ? prev.snap : null, v.snap);
    audit(r, "Câmpurile modificate ale unei versiuni", v.version);
    modal({
      kind: "tpg-fields",
      title: "Câmpuri modificate",
      subtitle: `Versiunea ${v.version}${prev ? ` față de ${prev.version}` : " · versiunea inițială"}`,
      body: changes.length ? changeList(changes, `Modificări (${changes.length})`) : E()?.render({ title: "Nicio modificare de câmp", text: "Versiunea are aceleași câmpuri ca cea anterioară.", icon: "page-text", compact: true }) || "",
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
  }

  /* ---- export (US-342 AC-12): <cod>-v<versiune>.geapcfg.json */
  function exportVersion(r, v) {
    if (!r) return;
    const snap = v ? v.snap : snapOf(r);
    const version = (v ? v.version : r.version).replace(/^v/, "");
    const file = `sablon-global-${r.code}-v${version}.geapcfg.json`;
    const payload = { format: "geapcfg", object: "document-template", scope: "global", id: r.id, code: r.code, version, docType: r.docType, process: r.process, meta: snap.meta, html: snap.html, background: snap.background, exportedAt: nowIso(), exportedBy: userName() };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: file });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* headless */ }
    audit(r, "Exportul unei versiuni", file);
    toast(`Am exportat versiunea ${version} în ${file}.`);
  }

  /* ================================================================ IMPORT FROM FILE (US-343) — „Import versiune” */
  const I = { parsed: null, file: "", error: "", over: false };
  function openImport() {
    if (!who().has) { showDenied(); return; }
    I.parsed = null; I.file = ""; I.error = ""; I.over = false;
    renderImport();
  }
  function renderImport() {
    const d = I.parsed;
    const existing = d ? byCode(d.code) : null;
    const result = d
      ? U().renderNotice?.("info", existing
        ? `<strong>${esc(d.code)} există (${esc(existing.id)}):</strong> fișierul devine o versiune nouă a șablonului „${esc(existing.name)}”, nepublicată până la „Publică în MDocs”.`
        : `<strong>Șablon global nou:</strong> „${esc(d.meta?.names?.ro || d.code)}”, cod ${esc(d.code)}, în starea „Schiță”, cu un ID nou.`) || ""
      : "";
    modal({
      kind: "tpg-import",
      title: "Import versiune",
      subtitle: "Fișier .geapcfg.json exportat din „Istoric versiuni”",
      body: `
        <div class="upload-block e-permits-tpg-upload">
          <span class="upload-block__label" id="tpg-import-label">Fișier de import${req()}</span>
          <div class="dropzone${I.over ? " dropzone--active" : ""}" tabindex="0" role="button" aria-labelledby="tpg-import-label" aria-describedby="tpg-import-types${I.error ? " tpg-import-error" : ""}" data-tpg-drop>
            <div class="dropzone__content">
              <span class="e-permits-tpg-upload__icon" aria-hidden="true">${icon("cloud-upload", 24)}</span>
              <p>Trage fișierul aici sau <span class="dropzone__link">alege fișierul</span></p>
            </div>
            <input type="file" accept=".json,application/json" hidden data-tpg-import-file>
          </div>
          <div class="dropzone__details upload-block__info" id="tpg-import-types"><p>Tip acceptat: .geapcfg.json</p></div>
          ${I.file ? `<div class="e-permits-tpg-upload__file">${icon("document")}<span class="e-permits-frm-import__name" data-cell-tooltip="${esc(I.file)}">${esc(I.file)}</span></div>` : ""}
          ${I.error ? errorHtml("tpg-import", I.error) : ""}
        </div>
        ${result}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-tpg-import-apply${offAttrs(d ? "" : "Alege mai întâi un fișier .geapcfg.json.")}>Importă</button></div>`
    });
  }
  function readImport(text, fileName) {
    I.file = fileName; I.parsed = null; I.error = "";
    /* AC-06: only .geapcfg.json */
    if (!/\.geapcfg\.json$/i.test(fileName)) { I.error = FILE_TYPE; renderImport(); return; }
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }
    const ok = data && data.format === "geapcfg" && data.object === "document-template" && typeof data.html === "string" && String(data.code || "").trim() && data.meta?.names?.ro;
    /* AC-07 */
    if (!ok) { I.error = FILE_BAD; renderImport(); return; }
    I.parsed = data;
    renderImport();
  }
  function applyImport(button) {
    if (button.getAttribute("aria-disabled") === "true" || !I.parsed) return;
    const d = I.parsed;
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED.replace(" Modificările au rămas în editor.", ""), "error"); return; }
    let r = byCode(d.code);
    const at = nowIso();
    if (r) {
      /* AC-09 / 13: a new version of the template with the same code; it reaches MDocs at the next publication */
      Object.assign(r, { html: d.html, background: d.background || "", names: { ...r.names, ...d.meta.names }, description: d.meta.description || "", official: Boolean(d.meta.official), editedAt: at, editedBy: userName() });
      r.name = r.names.ro;
      r.version = bump(r.version);
      r.versions.push({ nr: r.versions.length + 1, version: r.version, type: "Import din fișier", note: `Importat din ${I.file}.`, at, by: r.editedBy, snap: snapOf(r) });
      audit(r, "Importul unui șablon global din fișier", `${I.file} → ${r.version}`);
      toast(`Fișierul a fost importat ca versiunea ${r.version} a șablonului ${r.id}.`);
      if (ED().isGlobal?.() && current === r.id) ED().refresh?.();
    } else {
      /* AC-08 / 10: a new template, Schiță until published */
      const md = mdocsOf(d.code);
      r = {
        id: newId(), code: d.code, docType: d.docType || md?.type || d.meta.names.ro, process: d.process || "", names: { ro: d.meta.names.ro, ru: d.meta.names.ru || "", en: d.meta.names.en || "" }, name: d.meta.names.ro,
        description: d.meta.description || "", official: Boolean(d.meta.official), status: "draft", version: "v1.0.0", source: "MDocs", editedAt: at, editedBy: userName(), active: true, attached: [],
        html: d.html, background: d.background || "", testJson: "", testData: {}, versions: [], published: null, deactivation: null
      };
      r.versions.push({ nr: 1, version: "v1.0.0", type: "Import din fișier", note: `Importat din ${I.file} (versiunea ${d.version}).`, at, by: r.editedBy, snap: snapOf(r) });
      list().unshift(r);
      OID().logAssign?.(OBJECT, r.id, r.name);
      audit(r, "Importul unui șablon global din fișier", `${I.file} → ${r.id}`);
      toast(`Șablonul global ${r.id} a fost creat din ${I.file}.`);
    }
    G().closeModal?.();
    refreshList();
  }

  /* ================================================================ ACTIVATE / DEACTIVATE / DELETE (US-345) */
  function deactivate(id) {
    const r = tplOf(id);
    if (!r || !who().has || !everPublished(r) || !r.active) return;
    /* AC-06: confirmation first */
    U().askConfirm?.({
      title: "Dezactivezi șablonul?",
      text: `„${r.name}” nu se mai poate alege în configurarea serviciilor. Documentele generate anterior păstrează versiunea cu care au fost generate.`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, () => {
      r.active = false;
      r.deactivation = { at: nowIso(), by: userName() };
      audit(r, "Dezactivarea șablonului global");
      refreshList();
      toast(`Șablonul „${r.name}” a fost dezactivat.`);
    });
  }
  function activate(id) {
    const r = tplOf(id);
    if (!r || !who().has || r.active) return;
    r.active = true;
    r.deactivation = null;
    audit(r, "Activarea șablonului global");
    refreshList();
    toast(`Șablonul „${r.name}” a fost activat.`);
  }
  const D = { id: "" };
  function openDelete(id) {
    const r = tplOf(id);
    if (!r || !who().has || everPublished(r)) return;
    D.id = id;
    /* AC-14: attached to a service → not deleted */
    if (r.attached.length) {
      audit(r, "Ștergerea șablonului global", ATTACHED, "Eșuat");
      modal({
        kind: "tpg-delete",
        title: "Șterge șablonul din catalog",
        subtitle: r.name,
        body: `
          ${U().renderNotice?.("error", `<strong>${esc(ATTACHED)}</strong> Detașează-l mai întâi din configurarea serviciului.`, { role: "alert" }) || ""}
          ${A().renderStackedList?.("Atașat la", [{ label: "", items: r.attached.map((s) => ({ plainTitle: s, title: esc(s), badges: [tag("Serviciu", "neutral")], meta: ["Configurări servicii › Șabloane de tipar"] })) }], { meta: plural(r.attached.length, "serviciu", "servicii") }) || ""}`,
        footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
      });
      return;
    }
    /* AC-12 / 13: the warning (definitive, from the catalog and from MDocs; only when not attached) */
    modal({
      kind: "tpg-delete",
      title: "Șterge șablonul din catalog",
      subtitle: r.name,
      body: `
        ${U().renderNotice?.("warning", `<strong>Șablonul ${esc(r.code)} va fi șters definitiv din catalog și, dacă există, din MDocs.</strong> Ștergerea este posibilă doar dacă șablonul nu este atașat niciunui serviciu. Acțiunea nu se poate anula.`) || ""}
        ${detailCard([["ID", esc(r.id)], ["Cod tip document MDocs", esc(r.code)], ["Stare", "Schiță, nepublicat niciodată"]])}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-destructive btn-rounded" type="button" data-tpg-delete-confirm>${icon("delete")}<span>Șterge</span></button></div>`
    });
  }
  function confirmDelete() {
    const r = tplOf(D.id);
    if (!r) return;
    /* AC-15 / 16 / 18: gone from the catalog (and MDocs); the code is free again; the ID is never reused */
    S.list.splice(S.list.indexOf(r), 1);
    audit(r, "Ștergerea șablonului global", `${r.id} · șters din catalog și din MDocs`);
    G().closeModal?.();
    refreshList();
    toast(`Șablonul „${r.name}” a fost șters.`);
  }

  /* ================================================================ events */
  function onDrawerClick(event) {
    const t = event.target;
    if (!(t instanceof Element) || !F) return;
    if (t.closest("[data-tpg-drawer-close]")) { requestClose(); return; }
    const next = t.closest("[data-tpg-next]");
    if (next) { if (next.getAttribute("aria-disabled") !== "true") createNext(); return; }
    if (t.closest("[data-tpg-back]")) { createGoto(F.step - 1); return; }
    const go = t.closest("[data-tpg-goto]");
    if (go) { createGoto(go.dataset.tpgGoto); return; }
    if (t.closest("[data-tpg-create]")) { confirmCreate(); return; }
    const apply = t.closest("[data-tpg-mdocs-apply]");
    if (apply) { if (apply.getAttribute("aria-disabled") !== "true") applyMdocs(); return; }
    const page = t.closest("[data-tpgv-page]");
    if (page && !page.disabled) { F.page = Number(page.dataset.tpgvPage) || 1; renderDrawer(); drawer.querySelector(".pagination__link--active, [data-pager-step]")?.focus?.(); return; }
    const per = t.closest("[data-tpgv-per-page]");
    if (per) { F.perPage = Number(per.dataset.tpgvPerPage) || 5; F.page = Number(per.dataset.tpgvPage) || 1; renderDrawer(); }
  }
  function onDrawerInput(event) {
    const el = event.target;
    if (!F || !(el instanceof Element)) return;
    const key = el.dataset.tpgField || el.dataset.tpgM;
    if (!key) return;
    F.v[key] = el.value;
    F.dirty = true;
    const count = drawer.querySelector(`[data-tpg-count="${el.id}"]`);
    if (count) count.textContent = `${el.value.length}/${el.maxLength > 0 ? el.maxLength : DESC_MAX}`;
    /* the code field drives the footer button (US-338 AC-04, US-344 AC-04) and clears its error */
    if (key === "code") {
      if (F.errors.code || F.notice) { F.errors = {}; F.notice = ""; renderDrawer(); return; }
      drawer.querySelector("[data-tpg-drawer-footer]").innerHTML = VIEWS[F.mode].footer();
    }
  }
  function onDrawerChange(event) {
    const el = event.target;
    if (!F || !(el instanceof Element)) return;
    if (el.matches('[data-tpg-select="process"]')) { F.v.process = el.value; F.dirty = true; const full = drawer.querySelector("[data-tpg-full]"); if (full && F.md) full.textContent = nameOf(F.md.type, F.v.process); }
    if (el.matches("[data-tpg-official]")) { F.v.official = el.checked; F.dirty = true; }
  }
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-workplace-add-product="tpg-new"], button[data-tpg-new]')) { event.preventDefault(); openCreate(); return; }
    if (t.closest('[data-workplace-secondary-product="tpg-import"]')) { event.preventDefault(); openImport(); return; }
    if (t.closest('[data-workplace-tertiary-product="tpg-import-mdocs"]')) { event.preventDefault(); openMdocs(); return; }
    const pick = (attr) => t.closest(`[${attr}]`)?.getAttribute(attr);
    let id;
    if ((id = pick("data-tpg-edit"))) { event.stopPropagation(); openEditor(id); return; }
    if ((id = pick("data-tpg-versions"))) { openVersions(id); return; }
    if ((id = pick("data-tpg-export"))) { const r = tplOf(id); exportVersion(r, r ? lastVersion(r) : null); return; }
    if ((id = pick("data-tpg-deactivate"))) { deactivate(id); return; }
    if ((id = pick("data-tpg-activate"))) { activate(id); return; }
    if ((id = pick("data-tpg-delete"))) { openDelete(id); return; }
    if ((id = pick("data-tpg-pending"))) { event.stopPropagation(); openPending(id); return; }
    if (t.closest("[data-tpg-delete-confirm]")) { confirmDelete(); return; }
    if (t.closest("[data-tpg-publish-confirm]")) { confirmPublish(); return; }
    if ((id = pick("data-tpg-ver-view"))) { openVersion(id); return; }
    if ((id = pick("data-tpg-ver-fields"))) { openFields(id); return; }
    if ((id = pick("data-tpg-ver-export"))) { const r = tplOf(F?.id); exportVersion(r, versionOf(r, id)); return; }
    if (t.closest("[data-tpg-drop]")) { document.querySelector("[data-tpg-import-file]")?.click(); return; }
    const imp = t.closest("[data-tpg-import-apply]");
    if (imp) { applyImport(imp); return; }
    if (t.closest("[data-tpg-bg-pick]")) { document.querySelector("[data-tpg-bg-file]")?.click(); return; }
    const bgApply = t.closest("[data-tpg-bg-apply]");
    if (bgApply) { if (bgApply.getAttribute("aria-disabled") !== "true") { G().closeModal?.(); ED().setBackground?.(B.picked); } return; }
    if (t.closest("[data-tpg-bg-remove]")) { G().closeModal?.(); ED().setBackground?.(""); }
  });
  document.addEventListener("keydown", (event) => {
    const zone = event.target instanceof Element && event.target.closest("[data-tpg-drop]");
    if (zone && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); document.querySelector("[data-tpg-import-file]")?.click(); }
  });
  /* drag a file onto the drop zone (US-343 AC-04) */
  ["dragenter", "dragover"].forEach((type) => document.addEventListener(type, (event) => {
    const zone = event.target instanceof Element && event.target.closest("[data-tpg-drop]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.add("dropzone--active");
  }));
  ["dragleave", "drop"].forEach((type) => document.addEventListener(type, (event) => {
    const zone = event.target instanceof Element && event.target.closest("[data-tpg-drop]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("dropzone--active");
    const file = type === "drop" ? event.dataTransfer?.files?.[0] : null;
    if (file) file.text().then((text) => readImport(text, file.name));
  }));
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches("[data-tpg-import-file]") && el.files?.[0]) { const file = el.files[0]; el.value = ""; file.text().then((text) => readImport(text, file.name)); }
    if (el.matches("[data-tpg-bg-file]") && el.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => { B.picked = reader.result; renderBackground(); };
      reader.readAsDataURL(el.files[0]);
      el.value = "";
    }
  });

  /* ================================================================ routes + denied (US-337…345 AC-01 / 02) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Șabloane globale” este disponibil utilizatorilor cu permisiunea „Gestionare șabloanelor”.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#sablon-global\/([^/]+)$/.exec(h);
    if (!m) return false;
    /* the direct call is refused without the permission (AC-02) */
    if (!who().has) { showDenied(); return true; }
    document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click();
    if (m[1] === "nou") { window.setTimeout(openCreate, 300); return true; }
    window.setTimeout(() => openEditor(decodeURIComponent(m[1]), { push: false }), 300);
    return true;
  });
  /* the menu item exists only for who holds the permission (US-337 AC-02 / 03) */
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
  window.GEAPDocTemplatesGlobal = {
    list: () => list(), get: tplOf, openCreate, openMdocs, openEditor, openVersions, openVersion, openFields, openPublish, openImport, openDelete, deactivate, activate, openPending, refreshList, perms: who,
    drawer: () => F,
    /* a chosen file without the OS dialog: `ok` = an export of SDC-0402 (existing code) · `new` = a code not yet in GEAP ·
       `type` = a .docx · `bad` = a .geapcfg.json that is not a template */
    demoImport(kind = "ok") {
      const base = tplOf("SDC-0402") || list()[0];
      if (kind === "type") { readImport("PK…", "decizie-de-refuz.docx"); return; }
      if (kind === "bad") { readImport("{\"format\": \"geapcfg\", \"object\": \"form\", \"schema\": []}", "formular-cerere-v1.0.0.geapcfg.json"); return; }
      const payload = kind === "new"
        ? { format: "geapcfg", object: "document-template", scope: "global", id: "SDC-0377", code: "GEAP.DecizieRetragere", version: "1.1.0", docType: "Decizie de retragere", process: "Retragere act", meta: { names: { ro: "Decizie de retragere Retragere act", ru: "", en: "" }, description: "Decizia de retragere a actului permisiv, din mediul de test.", official: true }, html: htmlOf("Decizie de retragere Retragere act", [ROW("Titularul", "ApplicantName"), ROW("Numărul actului", "PermitNumber"), ROW("Data emiterii", "IssuedOn")]), background: "" }
        : { format: "geapcfg", object: "document-template", scope: "global", id: base.id, code: base.code, version: "1.0.1", docType: base.docType, process: base.process, meta: snapOf(base).meta, html: base.html, background: "" };
      readImport(JSON.stringify(payload), kind === "new" ? "sablon-global-GEAP.DecizieRetragere-v1.1.0.geapcfg.json" : `sablon-global-${base.code}-v1.0.1.geapcfg.json`);
    },
    demoBackground() { B.picked = DEMO_BG; renderBackground(); },
    demoDrag(on = true) { I.over = on; renderImport(); }
  };
})();
