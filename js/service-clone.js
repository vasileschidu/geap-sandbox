/* =====================================================================================
   Servicii › „Adaugă serviciu” (svc-clone-v1, 2026-11-12) — Azure US-326 (96686) „Clonarea setărilor unui serviciu la
   adăugarea lui din RSSP”, on top of US-111 (the passport comes from RSSP).

   No new component except the clone table — every other piece is an existing pattern:
     · the ONE drawer (`.drawer-overlay > .drawer`, as „Adaugă autoritate” in js/autoritati.js): step strip
       (`renderStepStrip`) only for the cloning mode, step 2 = `.drawer--lg`;
     · „Modul creării” = the FO radio option rows (`GEAPFormRender.fieldHtml` type radio, horizontal);
     · „Cod serviciu RSSP” = the drawer text field; „Serviciul de clonat” = the FO searchable list (CAEM combobox,
       `float`) with the optional authority line (`option.meta`);
     · notices = `renderNotice` / `renderInfoNote`; checkboxes = `renderCheckOption({ plain: true })` (tri-state:
       `input.indeterminate`); result = the passport + the library success toast; events = `logServiceEvents`
       (Jurnal) + `GEAPEventTimeline.log` (Jurnalul de audit, AC-24).
   New: the clone table `.e-permits-svc-clone` (css/service-clone.css, components.md › „Service clone table”).

   Flow: step 1 Modul creării · Cod serviciu RSSP (· Serviciul de clonat) → „Continuă” asks RSSP without saving
   (`rsspDryRun`), → step 2 the settings table (source vs new, nothing ticked) → „Adaugă serviciu” imports the service
   (`importServiceFromRssp`, US-111) and applies the ticked settings with new IDs → passport (version Schiță) + toast.
   „Creare de la zero” = step 1 only, „Adaugă serviciu” imports directly.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const R = () => window.GEAPFormRender || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20, cls = "icon") => `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const req = () => U().requiredMark?.() || "";
  const BUSY_MS = 700;

  const MODES = [["zero", "Creare de la zero"], ["clone", "Creare cu clonarea setărilor"]];
  const STEPS = ["Serviciul", "Setări de clonat"];
  const MSG = {
    source: "Câmpul «Serviciul de clonat» este obligatoriu.",
    rssp: "Din RSSP",
    empty: "Rămâne necompletat",
    mismatch: "Serviciul nou are tipuri din RSSP fără pereche în serviciul de clonat",
    noPair: "Tip din RSSP fără pereche în serviciul nou",
    nothing: "Serviciul sursă nu are ce clona aici"
  };

  /* ---------------------------------------------------------------- the settings tree
     node = { id, label, src, dst, note, lock, children, apply }; a leaf counts when it is not locked */
  const yesNo = (v) => (v == null ? "" : v ? "Da" : "Nu");
  const listText = (v) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : String(v ?? ""));
  const termText = (t) => (t && t.value ? `${t.value} ${t.unit || "zile"}` : "");
  const rsspOf = (r = {}) => {
    const v = (r.validity || [])[0];
    return {
      applicants: listText(r.applicantTypes),
      mpower: yesNo(r.allowsMPower),
      tacit: yesNo(Boolean(r.tacitApproval)),
      validity: v ? (v.validFor ? String(v.validFor) : "Nelimitată") : "",
      validityUnit: v && v.validFor ? "Ani" : "",
      paid: yesNo(Boolean(r.paid)),
      eDelivery: yesNo((r.delivery || []).includes("Electronic")),
      mdelivery: yesNo(r.allowsMDelivery)
    };
  };
  /* how a GEAP setting reads in a cell (US-221 values) */
  const cfgText = (key, v) => {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
    if (typeof v === "boolean") return yesNo(v);
    if (key === "numbering") return v.map((x) => `${x.doc}: ${x.template}`).join("; ");
    if (key === "rap") return plural(v.length, "câmp", "câmpuri");
    if (key === "deps") return plural(v.length, "interdependență", "interdependențe");
    if (key === "distParams") return "Configurați";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  };
  /* US-326 AC-05: the 12 sections of Setări (US-221) — RSSP fields locked „Din RSSP”, Cod serviciu MPay „Rămâne necompletat” */
  const SECTIONS = [
    ["applicant", "Solicitant și act", [["rssp:applicants", "Tip solicitant"], ["rssp:mpower", "Verificare împuternicire prin MPower"], ["authMode", "Modalitatea de verificare a împuternicirii"], ["rssp:tacit", "Aprobare tacită activată"], ["rssp:validity", "Durata valabilității actului"], ["rssp:validityUnit", "Unitatea valabilității"]]],
    ["exam", "Examinare și distribuire", [["subdivisions", "Subdiviziuni de examinare"], ["autoDist", "Distribuire automată"], ["distParams", "Parametrii de distribuire"], ["refusal", "Refuzul dosarului de către executant"], ["refusalRoles", "Roluri care pot refuza"]]],
    ["suspension", "Suspendare", [["suspCustom", "Suspendare termen examinare personalizată"], ["suspDays", "Termenul de suspendare implicit (zile)"], ["suspEditable", "Termen de suspendare modificabil de specialist"], ["suspSigned", "Suspendare cu semnarea deciziei"]]],
    ["signing", "Semnare", [["signRequest", "Semnarea cererii prin MSign"], ["signCounter", "Semnarea cererii MSign de ghișeu"], ["pdfGen", "Generarea documentului PDF"], ["pdfSign", "Semnarea documentului PDF prin MSign"]]],
    ["payment", "Plată", [["rssp:paid", "Serviciu cu plată"], ["mpayCode", "Cod serviciu MPay"], ["payTerm", "Termenul de achitare (zile)"]]],
    ["delivery", "Livrare și eliberare", [["rssp:eDelivery", "Livrare electronică"], ["rssp:mdelivery", "Livrare prin MDelivery"], ["paperRelease", "Eliberare pe hârtie la autoritatea emitentă"], ["releaseActor", "Actorul care imprimă și eliberează actul"]]],
    ["postprocess", "Postprocese pe acte permisive", [["ppAllowed", "Postprocese permise"], ["ppCabinet", "Inițiere din EVO Cabinet"]]],
    ["appeal", "Contestare", [["appealable", "Serviciu contestabil"], ["appealTypes", "Tipuri de solicitare contestabile"], ["appealDecisions", "Decizii contestabile"], ["appealDays", "Termen admisibil de contestare (zile)"], ["appealDayType", "Tipul zilelor de contestare"]]],
    ["numbering", "Numerotare", [["numbering", "Reguli de numerotare"]]],
    ["rap", "Publicare în RAP", [["rap", "Câmpuri transmise în RAP"]]],
    ["drafts", "Schițe", [["draftDays", "Perioada de retenție a schițelor (zile)"]]],
    ["deps", "Interdependențe", [["deps", "Interdependențe cu alte servicii"]]]
  ];
  /* US-326 AC-05: the settings of a request type (US-222 / US-223) */
  const RT_SETTINGS = [
    ["term", "Termene de examinare"], ["flow", "Flux de examinare"], ["form", "Formular electronic"], ["actions", "Formularele acțiunilor"],
    ["outputs", "Formulare de ieșire"], ["notifications", "Notificări"], ["signatures", "Număr de semnături electronice"],
    ["approval", "Nivel de aprobare"], ["tacit", "Aprobare tacită pe tip de solicitare"], ["aviz", "Necesită avizare"]
  ];
  /* postprocess settings are not in the US-221 draft model yet: read them from the source's request types */
  const postprocessCfg = (service) => {
    const own = service.geap.requestTypes.filter((rt) => rt.source !== "RSSP").map((rt) => rt.name);
    return { ppAllowed: own, ppCabinet: own.length ? true : null };
  };

  function rtSettingText(service, rt, key) {
    const g = service.geap;
    if (key === "term") return termText(rt.term);
    if (key === "flow") return rt.flow ? A().flowName?.(rt.flow) || rt.flow : "";
    if (key === "form") return rt.form ? g.forms.find((f) => f.id === rt.form)?.name || "" : "";
    if (key === "actions") { const n = Object.keys(rt.actions || {}).length; return n ? plural(n, "acțiune cu formular", "acțiuni cu formular") : ""; }
    if (key === "outputs") return rt.flow ? g.templates?.[0]?.name || "Șablonul implicit" : "";
    if (key === "notifications") return rt.flow ? (g.notificationTemplates?.length ? plural(g.notificationTemplates.length, "șablon specific", "șabloane specifice") : "Șabloanele procesului") : "";
    if (key === "signatures") return rt.flow ? "1" : "";
    if (key === "approval") return rt.flow ? (/supervizor/.test(rt.flow) ? "Fără supervizor" : "Un nivel") : "";
    if (key === "tacit") return rt.flow ? "Nu" : "";
    if (key === "aviz") return rt.flow ? yesNo(/avizare/.test(rt.flow) || (g.settings?.avize || []).length > 0) : "";
    return "";
  }

  /* request types pair by the process type (RSSP subService.type), US-326 AC-16 / AC-17 */
  function pairing(source, fresh) {
    const srcType = (name) => (source.rssp.subServices || []).find((s) => s.title === name)?.type || "";
    const newSubs = fresh.rssp.subServices || [];
    const srcTypes = new Set(source.geap.requestTypes.filter((rt) => rt.source === "RSSP").map((rt) => srcType(rt.name)));
    const unpaired = newSubs.filter((s) => !srcTypes.has(s.type));
    const pairOf = (rt) => (rt.source === "RSSP" ? newSubs.find((s) => s.type === srcType(rt.name)) || null : null);
    return { unpaired, pairOf, srcType, match: !unpaired.length };
  }

  function buildTree(source, fresh) {
    const cfg = { ...A().serviceConfig(source), ...postprocessCfg(source) };
    const rs = rsspOf(source.rssp), rn = rsspOf(fresh.rssp);
    const P = pairing(source, fresh);
    const mismatch = P.match ? "" : MSG.mismatch;
    const node = (id, label, o = {}) => ({ id, label, src: "", dst: "", note: "", lock: "", children: [], ...o });

    /* Setări */
    const settings = node("set", "Setări", {
      src: "12 secțiuni", note: "Datele din RSSP rămân cele ale serviciului nou",
      children: SECTIONS.map(([sid, title, fields]) => node(`set.${sid}`, title, {
        children: fields.map(([key, label]) => {
          if (key.startsWith("rssp:")) {
            const k = key.slice(5);
            return node(`set.${sid}.${k}`, label, { src: rs[k], dst: rn[k], lock: MSG.rssp });
          }
          if (key === "mpayCode") return node(`set.${sid}.${key}`, label, { src: cfgText(key, cfg[key]), lock: MSG.empty });
          return node(`set.${sid}.${key}`, label, { src: cfgText(key, cfg[key]), apply: { kind: "cfg", key } });
        })
      }))
    });

    /* Tipuri solicitări */
    const rtNodes = source.geap.requestTypes.map((rt) => {
      const pair = P.pairOf(rt);
      const own = rt.source !== "RSSP";
      const lock = mismatch || (!own && !pair ? MSG.noPair : "");
      return node(`rt.${rt.id}`, rt.name, {
        src: own ? "Creat în SIA GEAP" : `Din RSSP · ${P.srcType(rt.name)}`,
        dst: pair ? pair.title : own ? "Se adaugă ca tip nou" : "",
        note: lock ? "" : own ? "Tip nou, cu ID nou" : `Pereche după tipul procesului: ${P.srcType(rt.name)}`,
        lock,
        children: RT_SETTINGS.map(([key, label]) => node(`rt.${rt.id}.${key}`, label, {
          src: rtSettingText(source, rt, key),
          dst: key === "term" && pair ? termText(pair.duration) : "",
          note: !lock && ["outputs", "notifications"].includes(key) ? "Se clonează doar cu șablonul bifat în «Șabloane»" : "",
          lock, apply: { kind: "rt", rt: rt.id, key }
        }))
      });
    });
    const types = node("rt", "Tipuri solicitări", { src: plural(source.geap.requestTypes.length, "tip", "tipuri"), dst: plural((fresh.rssp.subServices || []).length, "tip din RSSP", "tipuri din RSSP"), lock: mismatch, children: rtNodes });

    /* Formulare */
    const forms = node("frm", "Formulare", {
      src: plural(source.geap.forms.length, "formular", "formulare"),
      children: source.geap.forms.map((f) => node(`frm.${f.id}`, f.name, { src: `${f.technical} · ${f.version}`, note: "Obiect nou, cu ID nou", apply: { kind: "form", id: f.id } }))
    });

    /* Documente — per request type; RSSP documents stay the new service's */
    const docs = A().serviceDocs?.(source) || [];
    const docGroups = source.geap.requestTypes.map((rt) => {
      const items = docs.filter((d) => d.requestTypes.includes(rt.name));
      if (!items.length) return null;
      const pair = P.pairOf(rt), own = rt.source !== "RSSP";
      const rtLock = mismatch || (!own && !pair ? MSG.noPair : "");
      return node(`doc.${rt.id}`, rt.name, {
        dst: pair ? pair.title : "",
        lock: rtLock,
        children: items.map((d) => node(`doc.${rt.id}.${d.id}`, d.title, {
          src: d.source === "RSSP" ? "Din RSSP" : `${d.required ? "Obligatoriu" : "Opțional"} · SIA GEAP`,
          lock: d.source === "RSSP" ? MSG.rssp : rtLock,
          apply: { kind: "doc", rt: rt.id, id: d.id }
        }))
      });
    }).filter(Boolean);
    const documents = node("doc", "Documente", { src: plural(docs.length, "document", "documente"), lock: mismatch, children: docGroups });

    /* Taxe și tarife — only the tax settings; tariffs and bank accounts come from RSSP */
    const store = A().servicesStore?.() || {};
    const tariffs = store.tariffs || [];
    const tariffName = (id) => tariffs.find((t) => t.id === id)?.name || id;
    const taxNodes = (source.geap.taxes || []).map((tax) => {
      const rt = source.geap.requestTypes.find((x) => x.name === tax.requestType);
      const pair = rt ? P.pairOf(rt) : null, own = rt && rt.source !== "RSSP";
      const lock = mismatch || (rt && !own && !pair ? MSG.noPair : "");
      return node(`tax.${tax.id}`, `${tariffName(tax.tariffId)} · ${tax.requestType}`, {
        src: `${tax.moment} · ${tax.generation}`, dst: pair ? `Taxa tarifului din RSSP · ${pair.title}` : "",
        lock, apply: { kind: "tax", id: tax.id }
      });
    });
    const srcTariffs = tariffs.filter((t) => t.scope === source.code).length;
    const newTariffs = (fresh.rssp.subServices || []).filter((s) => Number(s.price?.amount) > 0).length;
    const fees = node("tax", "Taxe și tarife", {
      src: plural((source.geap.taxes || []).length, "taxă", "taxe"),
      children: [
        ...taxNodes,
        node("tax.tariffs", "Tarife", { src: plural(srcTariffs, "tarif", "tarife"), dst: plural(newTariffs, "tarif", "tarife"), lock: MSG.rssp }),
        node("tax.accounts", "Conturi bancare", { src: "Contul autorității", dst: "Contul autorității", lock: MSG.rssp })
      ]
    });
    if (mismatch) taxNodes.forEach((n) => { n.lock = mismatch; });

    /* Șabloane · Notificări · Clasificatoare specifice — objects of the service, cloned with new IDs (AC-18) */
    const templates = node("tpl", "Șabloane", {
      src: plural((source.geap.templates || []).length, "șablon", "șabloane"),
      children: (source.geap.templates || []).map((t, i) => node(`tpl.${i}`, t.name, { src: `${t.type} · ${t.version}`, note: "Obiect nou, cu ID nou", apply: { kind: "tpl", index: i } }))
    });
    const notifs = node("ntf", "Notificări", {
      src: plural((source.geap.notificationTemplates || []).length, "șablon", "șabloane"),
      children: (source.geap.notificationTemplates || []).map((t) => node(`ntf.${t.code}`, t.name, { src: t.code, note: "Obiect nou, cu ID nou", apply: { kind: "ntf", code: t.code } }))
    });
    const clas = (A().svcClassifiers?.(source) || []).filter((c) => c.category !== "Global");
    const classifiers = node("cls", "Clasificatoare specifice", {
      src: plural(clas.length, "clasificator", "clasificatoare"),
      children: clas.map((c, i) => node(`cls.${i}`, c.name, { src: `${c.code} · ${plural(c.values || 0, "valoare", "valori")}`, note: "Obiect nou, cu ID nou", apply: { kind: "cls", index: i, item: c } }))
    });

    const roots = [settings, types, forms, documents, fees, templates, notifs, classifiers];
    /* a locked group locks what is inside; an empty group says there is nothing to clone */
    const settle = (n, lock = "") => {
      if (lock && !n.lock) n.lock = lock;
      n.children.forEach((c) => settle(c, n.lock));
      if (!n.children.length && !n.apply && !n.lock) n.lock = MSG.nothing;
    };
    roots.forEach((n) => settle(n));
    return { roots, pairing: P };
  }

  /* ---------------------------------------------------------------- tree helpers */
  const walk = (nodes, fn, depth = 1) => nodes.forEach((n) => { fn(n, depth); walk(n.children, fn, depth + 1); });
  const leavesOf = (n) => (n.children.length ? n.children.flatMap(leavesOf) : [n]);
  const free = (n) => leavesOf(n).filter((l) => !l.lock && l.apply);
  const findNode = (id) => { let hit = null; walk(F.tree.roots, (n) => { if (n.id === id) hit = n; }); return hit; };
  const stateOf = (n) => {
    const list = free(n);
    const on = list.filter((l) => F.checked.has(l.id)).length;
    return { total: list.length, on, all: list.length > 0 && on === list.length, some: on > 0 && on < list.length };
  };
  const totals = () => {
    const list = F.tree.roots.flatMap(free);
    return { m: list.length, n: list.filter((l) => F.checked.has(l.id)).length };
  };

  /* ---------------------------------------------------------------- drawer */
  let drawer = null;
  let F = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-svcl-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" tabindex="-1" data-svcl-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="svcl-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="svcl-title">Adaugă serviciu</h2>
              <p class="drawer__subtitle" data-svcl-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-svcl-close>${icon("cross-large", 16, "icon small")}</button>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii adăugării" data-svcl-steps hidden></nav>
          <div class="drawer__body" data-svcl-body></div>
          <footer class="drawer__footer" data-svcl-footer></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onClick);
    drawer.addEventListener("change", onChange);
    drawer.addEventListener("input", onInput);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches?.("[data-svcl-code]")) { event.preventDefault(); submit(); }
    });
    return drawer;
  }

  function open({ back = null, mode = "zero", code = "", source = "" } = {}) {
    if (!A().isCentralAdmin?.()) return; /* AC-01: the direct call is refused too */
    F = { back: back || document.activeElement, step: 1, mode, code, source, errors: {}, notice: null, busy: false, fresh: null, tree: null, checked: new Set(), open: new Set(), dirty: false };
    const d = ensureDrawer();
    render("top");
    const focus = () => d.querySelector(mode === "clone" && code ? "#fo-svcl-source" : "#svcl-code") || d.querySelector(".drawer");
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); }
    requestAnimationFrame(() => focus()?.focus());
  }
  function close() {
    if (!drawer || drawer.hidden) return;
    const back = F?.back;
    F = null;
    if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer);
    else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); }
    if (back?.isConnected) back.focus();
  }
  function requestClose() {
    if (!F) return;
    if (F.busy) return;
    if (!F.dirty) { close(); return; }
    U().askConfirm?.({ title: "Închizi fără să adaugi serviciul?", text: "Alegerile făcute se pierd. Nu se creează niciun serviciu.", confirmLabel: "Da, închide", cancelLabel: "Nu", destructive: true }, close);
  }

  /* ---- step 1 */
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  /* AC-04: only services with a published version, shown as Cod serviciu RSSP · Denumirea serviciului · Autoritate */
  const publishedServices = () => (A().servicesStore?.()?.services || []).filter((s) => s.status === "Publicat" && s.geap?.version);
  function step1() {
    const e = F.errors;
    const mode = R().fieldHtml?.({
      id: "svcl-mode", type: "radio", label: "Modul creării", required: true, span: 12, orientation: "horizontal",
      options: MODES.map(([value, label]) => ({ value, label })), value: F.mode
    }) || "";
    const code = `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="svcl-code">Cod serviciu RSSP${req()}</label>
        <div class="e-permits-fo-input${e.code ? " is-error" : ""}">
          <input id="svcl-code" type="text" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="ex. 003000333" value="${esc(F.code)}" aria-required="true"${e.code ? ' aria-invalid="true" aria-describedby="svcl-code-error"' : ' aria-describedby="svcl-code-hint"'} data-svcl-code${F.busy ? " disabled" : ""}>
        </div>
        ${e.code ? errorHtml("svcl-code", e.code) : '<p class="e-permits-fo-field__hint" id="svcl-code-hint">Introdu codul RSSP al serviciului, cu zerourile de la început (ex. 003000333).</p>'}
      </div>`;
    const sourceField = F.mode !== "clone" ? "" : `
      <div class="e-permits-user-create__field e-permits-user-create__field--12 e-permits-svc-clone__source" data-svcl-source-field>
        ${(R().fieldHtml?.({
          id: "svcl-source", type: "combobox", label: "Serviciul de clonat", required: true, span: 12,
          placeholder: "Alege serviciul", searchLabel: "Caută după cod sau denumire",
          emptyTitle: "Niciun serviciu publicat găsit", emptyText: "Caută după cod sau după o parte din denumire.",
          options: publishedServices().map((s) => ({ code: s.code, label: s.title, meta: A().getAuthorityById?.(s.authorityId)?.name || "" })),
          float: true
        }) || "")}
        ${e.source ? errorHtml("fo-svcl-source", e.source) : '<p class="e-permits-fo-field__hint">Doar serviciile cu versiune publicată în SIA GEAP. Copia nu păstrează legătura cu serviciul sursă.</p>'}
      </div>`;
    return `
      ${F.notice ? `<div class="e-permits-svc-clone__notice">${U().renderNotice?.(F.notice.tone, F.notice.html, { role: "alert" }) || ""}</div>` : ""}
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Serviciul din RSSP</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">${mode}${code}${sourceField}</div>
        </div>
      </section>`;
  }

  /* ---- step 2: the clone table */
  function cellValue(text, { muted = false } = {}) {
    if (!text) return dash;
    return `<span class="e-permits-svc-clone__value${muted ? " is-muted" : ""}" data-cell-tooltip>${esc(text)}</span>`;
  }
  function rowHtml(n, depth) {
    const group = n.children.length > 0;
    const isOpen = group && F.open.has(n.id);
    const st = stateOf(n);
    const locked = Boolean(n.lock) || st.total === 0;
    const checked = group ? st.all : F.checked.has(n.id);
    const check = U().renderCheckOption?.({
      label: n.label, plain: true, checked, disabled: locked,
      attrs: `data-svcl-check="${esc(n.id)}"${group && st.some ? " data-svcl-partial" : ""}`
    }) || "";
    const toggle = group
      ? `<button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-svc-clone__toggle" type="button" aria-expanded="${isOpen}" aria-label="${esc(`${isOpen ? "Restrânge" : "Desfă"} ${n.label}`)}" data-tooltip-label="${isOpen ? "Restrânge" : "Desfă"}" data-svcl-toggle="${esc(n.id)}">${icon("chevron-right", 20, "icon")}</button>`
      : '<span class="e-permits-svc-clone__toggle-space" aria-hidden="true"></span>';
    const count = group && st.total ? `<span class="e-permits-svc-clone__count" aria-label="${esc(`${st.on} din ${st.total} bifate`)}">${st.on}/${st.total}</span>` : "";
    const note = n.lock || n.note;
    return `
      <tr class="table__row e-permits-svc-clone__row e-permits-svc-clone__row--l${Math.min(depth, 3)}${group ? " is-group" : ""}${isOpen ? " is-open" : ""}${locked ? " is-locked" : ""}" data-svcl-row="${esc(n.id)}">
        <th class="table__body-cell e-permits-svc-clone__setting" scope="row"><div class="e-permits-svc-clone__cell">${toggle}${check}${count}</div></th>
        <td class="table__body-cell" data-label="În serviciul sursă">${cellValue(n.src)}</td>
        <td class="table__body-cell" data-label="În serviciul nou">${cellValue(n.dst)}</td>
        <td class="table__body-cell" data-label="Observație">${note ? `<span class="e-permits-svc-clone__note${n.lock ? " is-lock" : ""}" data-cell-tooltip>${esc(note)}</span>` : dash}</td>
      </tr>`;
  }
  function rowsHtml(nodes, depth = 1) {
    return nodes.map((n) => rowHtml(n, depth) + (n.children.length && F.open.has(n.id) ? rowsHtml(n.children, depth + 1) : "")).join("");
  }
  function step2() {
    const src = A().getServiceByCode(F.source);
    const fresh = F.fresh;
    const t = totals();
    const P = F.tree.pairing;
    const allState = t.m > 0 && t.n === t.m;
    return `
      <div class="e-permits-svc-clone">
        ${U().renderInfoNote?.(`Se clonează doar ce bifezi, peste datele din RSSP ale serviciului nou. Obiectele clonate primesc ID-uri noi; serviciul nou nu păstrează legătura cu <strong>${esc(src.code)} · ${esc(src.title)}</strong>.`) || ""}
        ${P.match ? "" : U().renderNotice?.("warning", `<strong>${esc(P.unpaired.map((s) => s.title).join(", "))}</strong> din RSSP ${P.unpaired.length === 1 ? "nu are" : "nu au"} pereche în serviciul de clonat. Tipurile de solicitare, documentele din «Documente» și setările taxelor nu se clonează.`, { role: "status" }) || ""}
        <div class="e-permits-svc-clone__toolbar">
          ${U().renderCheckOption?.({ label: "Selectează tot", plain: true, checked: allState, disabled: !t.m, attrs: `data-svcl-all${t.n && !allState ? " data-svcl-partial" : ""}` }) || ""}
          <span class="e-permits-svc-clone__counter" role="status" aria-live="polite" data-svcl-counter>${t.n} din ${t.m} setări bifate</span>
        </div>
        <div class="e-permits-svc-clone__wrap">
          <table class="table e-permits-svc-clone__table">
            <caption class="u-visually-hidden">Setările serviciului ${esc(src.code)} care se pot clona în serviciul nou ${esc(fresh.code)}</caption>
            <colgroup><col class="e-permits-svc-clone__col-setting"><col><col><col></colgroup>
            <thead><tr class="table__row"><th class="table__head-cell" scope="col">Setare</th><th class="table__head-cell" scope="col">În serviciul sursă</th><th class="table__head-cell" scope="col">În serviciul nou</th><th class="table__head-cell" scope="col">Observație</th></tr></thead>
            <tbody>${rowsHtml(F.tree.roots)}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ---- render */
  function footerHtml() {
    const spin = '<span class="spinner spinner--small spinner--light-on-color" aria-hidden="true"></span>';
    if (F.step === 2) {
      return `<div class="modal-buttons">
        <button class="btn btn-neutral btn-rounded" type="button" data-svcl-back${F.busy ? " disabled" : ""}>Înapoi</button>
        <button class="btn btn-primary btn-rounded" type="button" data-svcl-submit${F.busy ? ' disabled aria-busy="true"' : ""}>${F.busy ? `${spin}<span>Se adaugă serviciul…</span>` : "<span>Adaugă serviciu</span>"}</button>
      </div>`;
    }
    if (F.notice?.resync) {
      return `<div class="modal-buttons">
        <button class="btn btn-neutral btn-rounded" type="button" data-svcl-close>Anulează</button>
        <button class="btn btn-primary btn-rounded" type="button" data-svcl-resync>${icon("rotate-arrow", 20, "icon")}<span>Resincronizează serviciul</span></button>
      </div>`;
    }
    const label = F.mode === "clone" ? "Continuă" : "Adaugă serviciu";
    return `<div class="modal-buttons">
      <button class="btn btn-neutral btn-rounded" type="button" data-svcl-close${F.busy ? " disabled" : ""}>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" data-svcl-submit${F.busy ? ' disabled aria-busy="true"' : ""}>${F.busy ? `${spin}<span>Se preiau datele din RSSP…</span>` : `<span>${label}</span>`}</button>
    </div>`;
  }
  function render(focusSel = "") {
    if (!F) return;
    const d = ensureDrawer();
    const body = d.querySelector("[data-svcl-body]");
    const top = body.scrollTop;
    const clone2 = F.mode === "clone";
    d.querySelector(".drawer").classList.toggle("drawer--lg", F.step === 2);
    const sub = d.querySelector("[data-svcl-subtitle]");
    sub.textContent = F.step === 2 ? `${F.fresh.title} · clonare din ${A().getServiceByCode(F.source)?.title || F.source}` : "Pașaportul se creează din RSSP, în versiunea Schiță.";
    const steps = d.querySelector("[data-svcl-steps]");
    steps.hidden = !clone2;
    steps.innerHTML = clone2 ? A().renderStepStrip?.(STEPS, { step: F.step, maxStep: F.tree ? 2 : F.step }, "data-svcl-goto") || "" : "";
    body.innerHTML = F.step === 2 ? step2() : step1();
    d.querySelector("[data-svcl-footer]").innerHTML = footerHtml();
    if (F.step === 1) {
      R().bind?.(body);
      preselectSource(body);
    } else {
      syncPartial(body);
    }
    body.scrollTop = focusSel === "top" ? 0 : top;
    if (focusSel && focusSel !== "top") d.querySelector(focusSel)?.focus?.();
  }
  function preselectSource(body) {
    const root = body.querySelector("[data-svcl-source-field] [data-fo-caem]");
    if (!root) return;
    root.classList.toggle("is-error", Boolean(F.errors.source));
    if (!F.source) return;
    const opt = root.querySelector(`.e-permits-fo-caem__option[data-code="${F.source}"]`);
    const value = root.querySelector("[data-fo-caem-value]");
    if (opt && value) {
      opt.classList.add("is-selected"); opt.setAttribute("aria-selected", "true");
      value.textContent = `${opt.dataset.code} • ${opt.dataset.label}`; value.setAttribute("data-cell-tooltip", "");
      value.classList.remove("e-permits-fo-caem__value--placeholder");
    }
  }
  /* tri-state (AC-08): the property, not an attribute */
  function syncPartial(root) {
    root.querySelectorAll("input[data-svcl-check], input[data-svcl-all]").forEach((input) => {
      input.indeterminate = input.hasAttribute("data-svcl-partial");
      const tick = input.closest(".checkbox")?.querySelector(".e-permits-check-option__tick");
      if (tick) tick.toggleAttribute("hidden", input.indeterminate);
    });
  }
  /* ticking repaints only the table, toolbar and counter — the scroll and the focus stay */
  function refreshTable(focusId = "") {
    const d = ensureDrawer();
    const body = d.querySelector("[data-svcl-body]");
    const top = body.scrollTop;
    body.innerHTML = step2();
    syncPartial(body);
    body.scrollTop = top;
    if (focusId) body.querySelector(focusId)?.focus?.();
  }

  /* ---- actions */
  const readStep1 = () => {
    const d = ensureDrawer();
    const input = d.querySelector("[data-svcl-code]");
    if (input) F.code = input.value.trim();
    const sel = d.querySelector("[data-svcl-source-field] .e-permits-fo-caem__option.is-selected");
    if (F.mode === "clone") F.source = sel?.dataset.code || F.source;
  };
  function submit() {
    if (!F || F.busy) return;
    if (F.step === 2) { createService(); return; }
    readStep1();
    F.errors = {}; F.notice = null;
    if (!F.code) F.errors.code = window.GEAP?.servicePassport?.MESSAGES?.required || "Câmpul «Cod serviciu RSSP» este obligatoriu.";
    if (F.mode === "clone" && !F.source) F.errors.source = MSG.source; /* AC-03 */
    if (F.errors.code || F.errors.source) { render(F.errors.code ? "#svcl-code" : "#fo-svcl-source"); return; }
    /* AC-23: the code is already in GEAP → nothing is cloned, the service resyncs (US-231) */
    const existing = A().getServiceByCode(F.code);
    if (existing) {
      F.notice = { tone: "warning", resync: true, html: `<strong>Serviciul ${esc(F.code)} există deja în SIA GEAP: ${esc(existing.title)}.</strong> Un serviciu existent nu se creează a doua oară și setările nu se clonează. Îl poți resincroniza din RSSP.` };
      render("#svcl-code");
      return;
    }
    F.busy = true; render();
    setTimeout(() => {
      if (!F) return;
      F.busy = false;
      const dry = A().rsspDryRun(F.code);
      if (!dry.ok) {
        /* AC-22: the RSSP import failed → nothing is created, nothing is cloned */
        F.notice = { tone: "error", html: `<strong>Nu am putut prelua serviciul din RSSP.</strong> ${esc(dry.message)} Nu s-a creat niciun serviciu.` };
        render("#svcl-code");
        return;
      }
      if (F.mode === "zero") { finish(dry); return; }
      F.fresh = dry.service;
      F.tree = buildTree(A().getServiceByCode(F.source), F.fresh);
      F.checked = new Set(); /* AC-11: nothing ticked */
      F.open = new Set();
      F.step = 2; F.dirty = true;
      render("top");
      drawer.querySelector("[data-svcl-all]")?.focus();
    }, BUSY_MS);
  }

  function createService() {
    F.busy = true; render();
    setTimeout(() => {
      if (!F) return;
      F.busy = false;
      finish(null);
    }, BUSY_MS);
  }

  /* US-111 import + US-326 AC-12…AC-21: the ticked settings on top of the RSSP data, as new objects */
  function finish() {
    const result = A().importServiceFromRssp(F.code);
    if (!result.ok || result.kind !== "created") {
      F.step = 1;
      F.notice = { tone: "error", html: `<strong>Nu am putut prelua serviciul din RSSP.</strong> ${esc(result.message || "")} Nu s-a creat niciun serviciu.` };
      render("#svcl-code");
      return;
    }
    const fresh = result.service;
    let summary = [];
    if (F.mode === "clone" && F.checked.size) summary = applyClone(A().getServiceByCode(F.source), fresh);
    A().refreshServiceRegistries?.();
    const code = fresh.code, title = fresh.title, source = F.source, mode = F.mode;
    const cloned = summary.reduce((sum, [, n]) => sum + n, 0);
    close();
    A().openServiceProfile?.(code, "general");
    const what = mode === "clone"
      ? cloned ? `${plural(cloned, "setare clonată", "setări clonate")} din ${source}: ${summary.map(([tab]) => tab).join(", ")}.` : "Nicio setare bifată — nu s-a clonat nimic."
      : "Datele din RSSP sunt în versiunea Schiță.";
    U().showShellToast?.(`${code} · ${title}. ${what}`, "success", "Serviciul a fost adăugat");
  }

  function applyClone(source, fresh) {
    const user = A().currentUserName?.() || "";
    const now = A().localIsoNow?.() || new Date().toISOString().slice(0, 19);
    const on = (id) => F.checked.has(id);
    const tabCount = new Map();
    const count = (tab, n = 1) => tabCount.set(tab, (tabCount.get(tab) || 0) + n);
    const P = F.tree.pairing;
    const sg = source.geap, ng = fresh.geap;
    const nameOfPair = (rt) => P.pairOf(rt)?.title || rt.name;

    /* Setări → the US-221 draft of the new service; Cod serviciu MPay stays empty (AC-14) */
    const ncfg = A().serviceConfig(fresh);
    const scfg = { ...A().serviceConfig(source), ...postprocessCfg(source) };
    walk(F.tree.roots, (n) => {
      if (n.apply?.kind === "cfg" && on(n.id)) { ncfg[n.apply.key] = clone(scfg[n.apply.key]); count("Setări"); }
    });
    ncfg.mpayCode = "";

    /* Formulare first (new IDs), the request types point at the copies */
    const formIds = new Map();
    sg.forms.forEach((f) => {
      if (!on(`frm.${f.id}`)) return;
      const id = `frm-${ng.forms.length + 1}`;
      formIds.set(f.id, id);
      ng.forms.push({ ...clone(f), id, version: "v1.0.0", status: "Draft", editedAt: now, editedBy: user });
      count("Formulare");
    });
    /* Șabloane (AC-19: an output form / notification follows its template) */
    const tplOn = (sg.templates || []).some((t, i) => on(`tpl.${i}`));
    (sg.templates || []).forEach((t, i) => { if (on(`tpl.${i}`)) { ng.templates.push({ ...clone(t), version: "v1", updated: now.slice(0, 10) }); count("Șabloane"); } });
    /* Tipuri solicitări (AC-16): paired RSSP types take the settings, GEAP types are added as new ones */
    if (P.match) {
      sg.requestTypes.forEach((rt) => {
        const keys = RT_SETTINGS.map(([k]) => k).filter((k) => on(`rt.${rt.id}.${k}`));
        if (!keys.length) return;
        const pair = P.pairOf(rt);
        let target = pair ? ng.requestTypes.find((x) => x.name === pair.title) : null;
        if (!target && rt.source !== "RSSP") {
          target = { id: `rt-${ng.requestTypes.length + 1}`, name: rt.name, source: "GEAP", flow: null, form: null, term: null, actions: {} };
          ng.requestTypes.push(target);
        }
        if (!target) return;
        if (keys.includes("term")) target.term = clone(rt.term);
        if (keys.includes("flow")) target.flow = rt.flow;
        if (keys.includes("form")) target.form = rt.form ? formIds.get(rt.form) || null : null;
        if (keys.includes("actions")) target.actions = clone(rt.actions || {});
        target.cloned = { from: source.code, settings: keys.filter((k) => (k !== "outputs" && k !== "notifications") || tplOn) };
        count("Tipuri solicitări", keys.length);
      });
      /* Documente: the GEAP documents of the matched types (RSSP documents are the new service's own) */
      const docs = A().serviceDocs(source);
      const fdocs = A().serviceDocs(fresh);
      const seen = new Set();
      sg.requestTypes.forEach((rt) => docs.forEach((d) => {
        if (!on(`doc.${rt.id}.${d.id}`) || seen.has(d.id)) return;
        seen.add(d.id);
        const names = d.requestTypes.map((name) => { const r = sg.requestTypes.find((x) => x.name === name); return r ? nameOfPair(r) : name; });
        fdocs.push({ ...clone(d), id: `doc-c${fdocs.length + 1}`, requestTypes: names, published: false, editedAt: now, editedBy: user });
        count("Documente");
      }));
      /* Taxe și tarife: only the tax settings, on the taxes of the RSSP tariffs (AC-14) */
      const tariffs = A().servicesStore?.()?.tariffs || [];
      ng.taxes = ng.taxes || [];
      (sg.taxes || []).forEach((tax) => {
        if (!on(`tax.${tax.id}`)) return;
        const rt = sg.requestTypes.find((x) => x.name === tax.requestType);
        const rtName = rt ? nameOfPair(rt) : tax.requestType;
        const own = tariffs.find((t) => t.scope === fresh.code && t.requestType === rtName);
        const global = tariffs.find((t) => t.id === tax.tariffId && t.scope === "global");
        const tariff = own || global;
        if (!tariff) return;
        ng.taxes.push({ ...clone(tax), id: `tax-c${ng.taxes.length + 1}`, tariffId: tariff.id, requestType: rtName, version: 1, state: "Schiță", usage: 0, modifiedAt: now, modifiedBy: user });
        count("Taxe și tarife");
      });
    }
    /* Notificări + Clasificatoare specifice: new objects with the new service's ID (AC-18) */
    ng.notificationTemplates = ng.notificationTemplates || [];
    (sg.notificationTemplates || []).forEach((t) => {
      if (!on(`ntf.${t.code}`)) return;
      ng.notificationTemplates.push({ ...clone(t), code: `${t.code}-${fresh.code.slice(-3)}`, createdAt: now, createdBy: user });
      count("Notificări");
    });
    walk(F.tree.roots, (n) => {
      if (n.apply?.kind !== "cls" || !on(n.id)) return;
      const c = n.apply.item;
      ng.classifiers.push({ name: c.name, code: `${c.code}-${fresh.code.slice(-3)}`, values: c.values, updated: now.slice(0, 10), source: "Intern" });
      count("Clasificatoare specifice");
    });

    const summary = [...tabCount.entries()];
    const detail = `Din ${source.code} · ${source.title}: ${summary.map(([tab, n]) => `${tab} (${n})`).join(", ")}`;
    A().logServiceEvents?.(fresh.code, [{ at: now, user, type: "Clonare setări", status: "Reușit", detail }], { render: false });
    /* AC-24: the audit journal — user, role, source, new service, cloned tabs, timestamp */
    window.GEAPEventTimeline?.log?.({ at: now, user, type: "Clonarea setărilor serviciului", status: "Reușit", detail: `${detail} → ${fresh.code}` },
      { module: "AdminPortal", objectType: "Serviciu", objectId: fresh.code, objectVersion: "Schiță" });
    return summary;
  }

  /* ---- events */
  function onClick(event) {
    const t = event.target;
    if (t.closest("[data-svcl-close]")) { requestClose(); return; }
    if (t.closest("[data-svcl-submit]")) { submit(); return; }
    if (t.closest("[data-svcl-back]") || t.closest('[data-svcl-goto="1"]')) {
      if (F.busy) return;
      F.step = 1; render("top");
      requestAnimationFrame(() => drawer.querySelector("#fo-svcl-source")?.focus());
      return;
    }
    if (t.closest('[data-svcl-goto="2"]') && F.tree) { F.step = 2; render("top"); return; }
    if (t.closest("[data-svcl-resync]")) {
      const code = F.code;
      close();
      A().openSyncModal?.(code);
      return;
    }
    const toggle = t.closest("[data-svcl-toggle]");
    if (toggle) {
      const id = toggle.dataset.svclToggle;
      if (F.open.has(id)) F.open.delete(id); else F.open.add(id);
      refreshTable(`[data-svcl-toggle="${CSS.escape(id)}"]`);
    }
  }
  function onChange(event) {
    const t = event.target;
    if (t.matches('input[name="fo-svcl-mode"]')) {
      readStep1();
      F.mode = t.value; F.errors = {}; F.notice = null; F.tree = null; F.dirty = true;
      render(`input[name="fo-svcl-mode"][value="${t.value}"]`);
      return;
    }
    if (t.closest("[data-svcl-source-field] [data-fo-caem]")) {
      const code = t.closest("[data-fo-caem]").querySelector(".e-permits-fo-caem__option.is-selected")?.dataset.code || "";
      if (code !== F.source) { F.source = code; F.tree = null; }
      F.dirty = true;
      if (F.errors.source) {
        delete F.errors.source;
        const field = drawer.querySelector("[data-svcl-source-field]");
        field.querySelector(".e-permits-fo-caem")?.classList.remove("is-error");
        const err = field.querySelector(".e-permits-fo-field__error");
        if (err) err.outerHTML = '<p class="e-permits-fo-field__hint">Doar serviciile cu versiune publicată în SIA GEAP. Copia nu păstrează legătura cu serviciul sursă.</p>';
      }
      return;
    }
    if (t.matches("input[data-svcl-all]")) {
      const on = t.checked;
      F.tree.roots.flatMap(free).forEach((l) => (on ? F.checked.add(l.id) : F.checked.delete(l.id)));
      refreshTable("input[data-svcl-all]");
      return;
    }
    if (t.matches("input[data-svcl-check]")) {
      const n = findNode(t.dataset.svclCheck);
      if (!n) return;
      if (n.children.length) {
        /* AC-08: a group ticks only what is inside it (all → none, some / none → all) */
        const st = stateOf(n);
        const on = !st.all;
        free(n).forEach((l) => (on ? F.checked.add(l.id) : F.checked.delete(l.id)));
      } else if (t.checked) F.checked.add(n.id);
      else F.checked.delete(n.id);
      refreshTable(`input[data-svcl-check="${CSS.escape(n.id)}"]`);
    }
  }
  function onInput(event) {
    if (event.target.matches("[data-svcl-code]")) {
      F.dirty = true;
      if (F.errors.code || F.notice) {
        F.code = event.target.value;
        const wasResync = F.notice?.resync;
        delete F.errors.code;
        F.notice = null;
        const field = event.target.closest(".e-permits-fo-field");
        field.querySelector(".e-permits-fo-input")?.classList.remove("is-error");
        event.target.removeAttribute("aria-invalid");
        field.querySelector(".e-permits-fo-field__error")?.remove();
        drawer.querySelector(".e-permits-svc-clone__notice")?.remove();
        if (wasResync) drawer.querySelector("[data-svcl-footer]").innerHTML = footerHtml();
      }
    }
  }

  /* demo: open a state directly (js/demo-states.js) — `tick` = node ids, `expand` = group ids */
  window.GEAPServiceClone = {
    open,
    close,
    tick(ids = []) { if (!F?.tree) return; ids.forEach((id) => { const n = findNode(id); if (n) free(n).forEach((l) => F.checked.add(l.id)); }); refreshTable(); },
    expand(ids = []) { if (!F?.tree) return; ids.forEach((id) => F.open.add(id)); refreshTable(); }
  };
})();
