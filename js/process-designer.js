/* the address may name a flow (#flux/<id>, „Vezi schema fluxului”): kept before the shell routes */
window.__pdInitialHash = /^#flux\//.test(window.location.hash) ? window.location.hash : "";
/* Process Designer (Fluxuri de lucru) — composes the processing flow of a request type.
   Spec: tools/persona-test/specs/svc/process-designer.md (batches 0–1, 2026-10-14).

   One JSON definition (data/flows/*.json, core/process-model.js) → one renderer → the canvas
   (edit), the same canvas read-only („Doar vizualizare”, #flux/<id>) and the JSON view.
   Open → Salvează without edits writes the same bytes (tools/process-designer/roundtrip.mjs).

   Layers (spec E.1): the Form Builder topbar · a full-bleed stage whose ONE transformed world
   holds the pool / lanes (HTML), the edges (one SVG), the edge labels and the nodes (HTML buttons)
   and an overlay SVG (connect line, marquee) · floating cards: palette (left), properties
   (right), the zoom toolbar (bottom centre) and the minimap (bottom right) · footer Anulează /
   Salvează. Pan / zoom = one CSS transform; pointer moves are batched per animation frame.
   Component markup comes from window.GEAPUi (renderFoSelectControl, renderToggle, renderTag,
   renderStackMenu, askConfirm, requiredMark), empty states from GEAPEmptyState, toasts from
   GEAPToast. CSS: css/process-designer.css (on top of the builder CSS). */
document.addEventListener("DOMContentLoaded", () => {
  const PM = window.GEAP && window.GEAP.processModel;
  if (!PM) return;
  const ui = () => window.GEAPUi || {};
  const params = new URLSearchParams(window.location.search);
  const FLOW = String(params.get("flow") || "").toLowerCase();
  const FULL_PAGE = FLOW === "proces" || FLOW === "process";

  /* ---------------------------------------------------------------- helpers */
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const icon = (id, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${id}"></use></svg>`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const tag = (label, tone = "neutral") => ui().renderTag?.(label, tone) || `<span>${esc(label)}</span>`;
  const reqMark = () => ui().requiredMark?.() || "";
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const hhmm = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const localStamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const currentUser = () => document.querySelector(".e-permits-shell__user-name")?.textContent.trim() || "Vasile Schidu";
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fromDemo = () => Boolean(document.documentElement.dataset.demoLink);
  const GRID = 20;
  const ZMIN = 0.5;
  const ZMAX = 2;
  const snap = (n) => Math.round(n / GRID) * GRID;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------------------------------------------------------------- vocabularies */
  const TYPE_LABEL = PM.TYPE_LABEL;
  const PALETTE = [
    { type: "activity", label: "Activitate", desc: "Pas făcut de o persoană" },
    { type: "decision", label: "Decizie", desc: "Ramificare automată" },
    { type: "event", label: "Eveniment intermediar", desc: "Acțiune a sistemului" },
    { type: "subprocess", label: "Sub-proces", desc: "Apelează alt proces" },
  ];
  const NEW_TITLE = { activity: "Activitate nouă", decision: "Decizie nouă?", event: "Eveniment nou", subprocess: "Sub-proces nou" };
  const PROCESSORS = {
    "": ["Fără — trecere directă", ""],
    notify: ["Notificare: expediere (BackOffice)", "notification"],
    "audit-log": ["Jurnal de audit", "history"],
    "mconnect-event-publish": ["Publicare eveniment MConnect", "share-android"],
    "mdocs-publish": ["Publicare în MDocs", "page-text"],
    "payment-accrual": ["Calcul taxe", "receipt-bill"],
    "payment-note": ["Notă de plată", "receipt-check"],
    "certificate": ["Generează certificat constatator", "document"],
  };
  const STATUSES = [["", "Fără schimbare"], ["0", "0 · Inițiat"], ["2", "2 · În lucru"], ["3", "3 · Suspendat"], ["4", "4 · Plată suplimentară"], ["9", "9 · Finalizat"], ["10", "10 · Nedefinit în catalog"]];
  const VISUAL = [["", "Profil dosar — implicit"], ["distribution", "Distribuire dosar"], ["verification", "Verificare date"], ["act-draft", "Proiect act"], ["msign", "Semnare MSign"], ["mpay", "Achitare MPay"]];
  /* BO roles of the seed lanes (role guids from the export) + the US-51 examples */
  const ROLES = [
    ["88d2dec8-8a98-4fa1-a394-4cedb980a1d2", "Solicitant"],
    ["a9a0442d-0cec-444e-99df-c6513015aa14", "Specialist Ghișeu"],
    ["35977a09-1d67-4d9a-91e9-448c3339129f", "Asistent tehnic"],
    ["e36f3dab-09a9-4071-8066-4b0d4eb47f0a", "Expert"],
    ["61b20cc3-baaa-4823-9822-c01399bb8c68", "Specialist"],
    ["0c849b78-8e11-4763-bf9f-dc36ed598f9f", "Director"],
    ["rol-supervizor", "Supervizor"],
    ["rol-frontoffice", "FrontOffice"],
    ["", "Sistem (fără rol uman)"],
  ];
  const roleName = (id) => (ROLES.find(([v]) => v === id) || [])[1] || (id ? "Rol necunoscut" : "Sistem (fără rol uman)");
  /* panel tabs per element (spec D) */
  const TABS = { start: ["general"], end: ["general"], activity: ["general", "actions", "roles", "terms", "advanced"], decision: ["general", "exits", "advanced"], event: ["general", "processor", "advanced"], subprocess: ["general", "advanced"] };
  const TAB_LABEL = { general: "General", actions: "Acțiuni", roles: "Roluri", terms: "Termene", advanced: "Avansat", exits: "Ieșiri", processor: "Procesor" };
  /* catalogues of the processor parameters (the seed's codes + the GEAP.CASE family) */
  const AUDIT_CODES = ["GEAP.CASE.REGISTERED", "GEAP.CASE.DISTRIBUTED", "GEAP.CASE.SUSPENDED", "GEAP.CASE.SENT_FOR_ENDORSEMENT", "GEAP.CASE.COMPLETION_REQUESTED", "GEAP.CASE.RETURNED", "GEAP.CASE.APPROVED", "GEAP.CASE.REJECTED", "GEAP.CASE.PAID", "GEAP.CASE.SIGNED", "GEAP.CASE.CLOSED"];
  /* the passport's 6 payment moments (core/service-passport.js PAYMENT_MOMENTS, momentId 1-based) */
  const PAYMENT_MOMENTS = ["La inițierea solicitării", "La examinare", "La avizare", "La luarea deciziei", "După semnare act", "După emitere act"];
  const OBJECT_TYPES = [["Case", "Dosar"], ["Permit", "Act permisiv"]];
  const TERMS = [["Examinare", "Termen de examinare"], ["RaspunsSolicitant", "Răspunsul solicitantului"], ["Avizare", "Termen de avizare"], ["Plata", "Termen de plată"]];
  const TERM_ACTIONS = [["start", "Pornește"], ["pause", "Pauză"], ["resume", "Reia"], ["stop", "Oprește"]];
  const ASSIGN_NAMES = [["ServiceId", "ServiceId · serviciul"], ["PermitType", "PermitType · tipul actului"], ["AuthorityId", "AuthorityId · autoritatea"], ["TeamId", "TeamId · echipa"]];
  /* connection colours (US-51 AC-06: a predefined palette) */
  const COLORS = [["implicit", "Implicită (gri)"], ["brand", "Albastru"], ["positive", "Verde"], ["danger", "Roșu"], ["warning", "Portocaliu"], ["neutral", "Gri închis"]];
  /* Variabile de context (US-52 AC-03) — the seed's six in the export's order, then two more */
  const CONTEXT_VARS = [["IsAutoDistribution", "Distribuire automată"], ["WithPayment", "Cu plată"], ["SuspensionWithCoordination", "Suspendare cu semnare"], ["WithExpertise", "Cu expertiză"], ["SecondaryApproval", "Aprobare secundară"], ["IsPaperPermit", "Act pe hârtie"], ["IsTacitApproval", "Aprobare tacită"], ["WithInspection", "Cu control la fața locului"]];
  const contextLabel = (v) => (CONTEXT_VARS.find(([k]) => k === v) || [, "variabilă"])[1];
  /* what the services file gives the designer: process forms, notification templates, request types */
  const CAT = { forms: [], templates: [], services: [] };
  /* request types that run a process (US-222): [{ code, title, rt }] */
  const usageOf = (rec) => (CAT.services || []).flatMap((svc) => (svc.geap?.requestTypes || []).filter((rt) => rt.flow === rec.id).map((rt) => ({ code: svc.code, title: svc.title, rt: rt.name })));

  /* ---------------------------------------------------------------- shell markup (FB topbar reused) */
  const BUILD_ICON = `<svg class="icon" width="20" height="20" viewBox="0 0 16.6667 16.6667" aria-hidden="true"><path d="M14.072 0.2876C14.0535 0.123905 13.9151 0.00016861 13.7503 0C13.5856 -0.000167919 13.4469 0.123286 13.4281 0.286942C13.3402 1.04885 13.1139 1.57153 12.7594 1.92606C12.4049 2.28059 11.8822 2.50685 11.1203 2.59473C10.9566 2.6136 10.8332 2.75226 10.8333 2.917C10.8335 3.08174 10.9572 3.22014 11.1209 3.23868C11.87 3.32352 12.4045 3.54974 12.7681 3.9067C13.1296 4.26173 13.3602 4.78367 13.4272 5.53793C13.4421 5.70528 13.5824 5.83352 13.7504 5.83333C13.9184 5.83314 14.0584 5.70459 14.0729 5.53721C14.1371 4.79569 14.3674 4.26198 14.7314 3.89803C15.0953 3.53409 15.629 3.30372 16.3705 3.23953C16.5379 3.22504 16.6665 3.08504 16.6667 2.91703C16.6669 2.74902 16.5386 2.60873 16.3713 2.59386C15.617 2.52686 15.0951 2.29631 14.74 1.93475C14.3831 1.57121 14.1569 1.03662 14.072 0.2876Z" fill="currentColor"/><path d="M8.32804 2.40621C8.28036 1.98528 7.92447 1.6671 7.50085 1.66667C7.07723 1.66623 6.72069 1.98369 6.67216 2.40452C6.44619 4.3637 5.86437 5.70775 4.95272 6.61939C4.04108 7.53103 2.69703 8.11285 0.737851 8.33882C0.31702 8.38736 -0.000431792 8.7439 0 9.16752C0.000433568 9.59114 0.318613 9.94703 0.739542 9.9947C2.66559 10.2129 4.04025 10.7946 4.97507 11.7125C5.9048 12.6254 6.49765 13.9675 6.66994 15.9071C6.70816 16.3374 7.06892 16.6672 7.50094 16.6667C7.93296 16.6662 8.29297 16.3356 8.33023 15.9052C8.49528 13.9985 9.08766 12.626 10.0235 11.6902C10.9594 10.7543 12.3318 10.1619 14.2385 9.99689C14.6689 9.95964 14.9995 9.59963 15 9.1676C15.0005 8.73558 14.6707 8.37483 14.2404 8.3366C12.3009 8.16431 10.9587 7.57146 10.0458 6.64173C9.1279 5.70692 8.5462 4.33226 8.32804 2.40621Z" fill="currentColor"/></svg>`;
  const tbButton = (attrs, iconId, label, shortcut = "") => `<button class="btn btn-strict btn-sm btn-icon-only e-permits-pd__tool" type="button" aria-label="${esc(label)}" data-tooltip-label="${esc(label)}${shortcut ? ` (${shortcut})` : ""}" ${attrs}>${icon(iconId, 20)}</button>`;
  const shellHtml = () => `
    <div class="modal e-permits-builder e-permits-builder--process" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pd-dialog-title" data-pd-root>
      <header class="e-permits-builder__topbar e-permits-pd__topbar">
        <span class="e-permits-builder__sr-only" id="pd-dialog-title">Designer de procese</span>
        <div class="e-permits-builder__nav-left e-permits-pd__nav-left">
          <div class="e-permits-pd__crumbs" hidden data-pd-crumbs></div>
          <span class="e-permits-builder__view-title e-permits-pd__title" data-pd-title></span>
          <span class="e-permits-pd__status" data-pd-status></span>
          <div class="e-permits-stack__menu-wrap e-permits-pd__version-wrap">
            <button class="e-permits-builder__version" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="pd-versions-menu" data-stack-menu-trigger data-pd-version>
              <span data-pd-version-label>v1.0.0</span>
              ${icon("chevron-bottom", 16)}
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-pd__versions" id="pd-versions-menu" role="menu" aria-label="Versiunile procesului" hidden data-stack-menu data-pd-versions></ul>
          </div>
        </div>
        <div class="e-permits-builder__mode" role="tablist" aria-label="Modul designerului">
          <button class="is-active" type="button" role="tab" aria-selected="true" data-pd-mode="build">${BUILD_ICON}<span>Editare</span></button>
          <button type="button" role="tab" aria-selected="false" data-pd-mode="json">${icon("brackets")}<span>Schemă JSON</span></button>
          <i aria-hidden="true"></i>
          <button type="button" aria-pressed="false" data-pd-settings>${icon("settings")}<span>Setări generale</span></button>
        </div>
        <div class="e-permits-builder__nav-actions">
          <div class="e-permits-stack__menu-wrap e-permits-builder__issues" data-pd-edit-only>
            <button class="btn btn-sm btn-outline-destructive e-permits-builder__errors" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="pd-issues-menu" data-stack-menu-trigger data-pd-errors>
              <span aria-hidden="true"><i></i></span>
              <strong data-pd-errors-label>Fără erori</strong>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-builder__issues-menu" id="pd-issues-menu" role="menu" aria-label="Probleme în proces" hidden data-stack-menu data-pd-issues></ul>
          </div>
          <div class="e-permits-pd__viewonly" data-pd-viewonly-wrap>
            ${ui().renderToggle?.({ label: "Doar vizualizare", attrs: "data-pd-viewonly" }) || ""}
          </div>
          <button class="btn btn-primary btn-sm btn-rounded e-permits-pd__restore" type="button" hidden data-pd-restore>Restaurează ca schiță</button>
          <button class="e-permits-builder__publish" type="button" data-pd-publish data-pd-edit-only>Publică</button>
          <button class="modal-close e-permits-builder__close" type="button" aria-label="Închide designerul" data-tooltip-label="Închide" data-pd-close>${icon("cross-large", 16)}</button>
        </div>
      </header>

      <main class="e-permits-pd__stage" role="region" aria-label="Diagrama procesului" aria-roledescription="diagramă de proces" tabindex="-1" data-pd-stage>
        <div class="e-permits-pd__world" data-pd-world>
          <div class="e-permits-pd__lanes" data-pd-lanes></div>
          <svg class="e-permits-pd__edges" width="1" height="1" aria-hidden="true" data-pd-edges></svg>
          <div class="e-permits-pd__labels" data-pd-labels></div>
          <div class="e-permits-pd__nodes" role="group" aria-label="Elementele procesului" data-pd-nodes></div>
          <svg class="e-permits-pd__overlay" width="1" height="1" aria-hidden="true" data-pd-overlay></svg>
        </div>

        <aside class="e-permits-pd__float e-permits-pd__float--left" aria-label="Elemente" data-pd-palette></aside>
        <aside class="e-permits-pd__float e-permits-pd__float--right" aria-label="Proprietăți" data-pd-props></aside>
        <button class="btn btn-neutral btn-sm e-permits-pd__pill" type="button" hidden data-pd-show-props>${icon("sidebar", 16)}<span>Proprietăți</span></button>

        <div class="e-permits-pd__toolbar" role="toolbar" aria-label="Instrumente și zoom" data-pd-toolbar>
          <span class="e-permits-pd__toolgroup" data-pd-edit-only>
            ${tbButton("data-pd-undo", "undo", "Anulează", "Ctrl+Z")}
            ${tbButton("data-pd-redo", "redo", "Refă", "Ctrl+Shift+Z")}
            ${tbButton("data-pd-autolayout", "tree", "Aranjează automat pe benzi")}
          </span>
          <i class="e-permits-pd__toolsep" aria-hidden="true" data-pd-edit-only></i>
          <span class="e-permits-pd__toolgroup" role="radiogroup" aria-label="Instrument" data-pd-edit-only>
            ${tbButton('role="radio" aria-checked="true" data-pd-tool="select"', "direction", "Selectare", "V")}
            ${tbButton('role="radio" aria-checked="false" tabindex="-1" data-pd-tool="pan"', "drag", "Panoramare", "H")}
          </span>
          <i class="e-permits-pd__toolsep" aria-hidden="true" data-pd-edit-only></i>
          <span class="e-permits-pd__toolgroup">
            ${tbButton("data-pd-zoom-out", "minus-small", "Micșorează", "Ctrl −")}
            <div class="e-permits-stack__menu-wrap e-permits-pd__zoom-wrap">
              <button class="btn btn-strict btn-sm e-permits-pd__zoom" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="pd-zoom-menu" aria-label="Nivel de zoom" data-stack-menu-trigger data-pd-zoom-label>100%</button>
              <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-pd__zoom-menu" id="pd-zoom-menu" role="menu" aria-label="Zoom" hidden data-stack-menu>
                ${[50, 75, 100, 150, 200].map((z) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-pd-zoom-to="${z / 100}"><span>${z}%</span></button></li>`).join("")}
                <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-pd-fit>${icon("scan")}<span>Potrivește în ecran</span><kbd class="e-permits-pd__kbd">1</kbd></button></li>
                <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-pd-fit-selection>${icon("scan")}<span>Mărește selecția</span><kbd class="e-permits-pd__kbd">2</kbd></button></li>
              </ul>
            </div>
            ${tbButton("data-pd-zoom-in", "plus-small", "Mărește", "Ctrl +")}
          </span>
          <i class="e-permits-pd__toolsep" aria-hidden="true"></i>
          <span class="e-permits-pd__toolgroup">
            ${tbButton("data-pd-fit", "scan", "Potrivește în ecran", "1")}
            ${tbButton('aria-pressed="false" data-pd-minimap-toggle', "image", "Hartă", "M")}
            ${tbButton('aria-pressed="false" data-pd-panels-toggle', "sidebar", "Ascunde panourile", "Ctrl+\\")}
            ${tbButton('aria-pressed="false" data-pd-list-toggle', "bullet-list", "Vizualizare listă", "L")}
          </span>
        </div>
        <div class="e-permits-pd__minimap" hidden data-pd-minimap>
          <canvas class="e-permits-pd__minimap-canvas" width="200" height="136" tabindex="0" role="img" aria-label="Harta diagramei. Click sau săgeți pentru a muta vederea." data-pd-minimap-canvas></canvas>
        </div>

        <section class="e-permits-pd__json" hidden aria-label="Schema JSON a procesului" data-pd-json></section>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-pd__add-menu" id="pd-add-menu" role="menu" aria-label="Continuă cu" hidden data-stack-menu data-pd-add-menu></ul>
        <p class="u-visually-hidden" aria-live="polite" data-pd-live></p>
      </main>

      <footer class="modal--footer e-permits-pd__footer" data-pd-footer>
        <p class="e-permits-pd__footer-note" data-pd-dirty-note></p>
        <div class="modal-buttons">
          <button class="btn btn-secondary btn-rounded" type="button" data-pd-cancel>Anulează</button>
          <button class="btn btn-primary btn-rounded" type="button" data-pd-save>Salvează</button>
        </div>
      </footer>
    </div>`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay form-builder-modal-overlay e-permits-pd-overlay";
  overlay.id = "process-designer-modal";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = shellHtml();
  document.body.appendChild(overlay);
  /* dialogs opened from the designer must come after it in the DOM (same z-index: DOM order wins) */
  const confirmOverlay = document.querySelector("#service-confirm-modal");
  if (confirmOverlay) document.body.appendChild(confirmOverlay);
  const closeModal = document.createElement("div");
  closeModal.className = "modal-overlay e-permits-confirm-overlay";
  closeModal.id = "pd-close-modal";
  closeModal.setAttribute("aria-hidden", "true");
  closeModal.innerHTML = `
    <div class="modal modal--md e-permits-passport__modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pd-close-title" aria-describedby="pd-close-text">
      <button type="button" class="modal-close" data-close aria-label="Închide">
        <span class="d-inline-flex">${icon("cross-large", 16).replace('class="icon"', 'class="icon small"')}</span>
      </button>
      <div class="modal--header"><h2 class="modal--header-title" id="pd-close-title">Ai modificări nesalvate</h2></div>
      <div class="modal-content"><p class="e-permits-passport__lead" id="pd-close-text">Închizi designerul fără să salvezi schița? Modificările se pierd.</p></div>
      <div class="modal--footer">
        <div class="modal-buttons e-permits-pd__close-buttons">
          <button class="btn btn-neutral btn-rounded" type="button" data-close>Rămâi</button>
          <button class="btn btn-outline-destructive btn-rounded" type="button" data-pd-close-discard>Închide fără salvare</button>
          <button class="btn btn-primary btn-rounded" type="button" data-pd-close-save>Salvează și închide</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(closeModal);
  closeModal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => window.__modal?.close?.("#pd-close-modal")));

  const root = overlay.querySelector("[data-pd-root]");
  const q = (sel, scope = root) => scope.querySelector(sel);
  const el = {
    title: q("[data-pd-title]"),
    crumbs: q("[data-pd-crumbs]"),
    restore: q("[data-pd-restore]"),
    status: q("[data-pd-status]"),
    versionLabel: q("[data-pd-version-label]"),
    versions: q("[data-pd-versions]"),
    errors: q("[data-pd-errors]"),
    errorsLabel: q("[data-pd-errors-label]"),
    issues: q("[data-pd-issues]"),
    viewOnly: q("[data-pd-viewonly]"),
    viewOnlyWrap: q("[data-pd-viewonly-wrap]"),
    publish: q("[data-pd-publish]"),
    settings: q("[data-pd-settings]"),
    stage: q("[data-pd-stage]"),
    world: q("[data-pd-world]"),
    lanes: q("[data-pd-lanes]"),
    edges: q("[data-pd-edges]"),
    labels: q("[data-pd-labels]"),
    nodes: q("[data-pd-nodes]"),
    overlaySvg: q("[data-pd-overlay]"),
    palette: q("[data-pd-palette]"),
    props: q("[data-pd-props]"),
    showProps: q("[data-pd-show-props]"),
    toolbar: q("[data-pd-toolbar]"),
    zoomLabel: q("[data-pd-zoom-label]"),
    minimap: q("[data-pd-minimap]"),
    minimapCanvas: q("[data-pd-minimap-canvas]"),
    json: q("[data-pd-json]"),
    addMenu: q("[data-pd-add-menu]"),
    live: q("[data-pd-live]"),
    footer: q("[data-pd-footer]"),
    dirtyNote: q("[data-pd-dirty-note]"),
    save: q("[data-pd-save]"),
    cancel: q("[data-pd-cancel]"),
  };
  const announce = (text) => { el.live.textContent = ""; window.setTimeout(() => { el.live.textContent = text; }, 30); };

  /* ---------------------------------------------------------------- state */
  const UI_KEY = "geap.processDesigner.ui";
  const DB_KEY = "geap.processDesignerDb.v1";
  const readUi = () => { try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}") || {}; } catch { return {}; } };
  const writeUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({ rail: S.rail, minimap: S.minimap })); } catch { /* private mode */ } };
  const storedUi = readUi();
  const S = {
    db: null,
    rec: null,           // the registry record of the open process
    def: null,           // the working definition (the JSON itself)
    baseText: "",        // what Salvează compares with (the bytes that were opened / saved)
    openedVersion: "",   // a past version open view-only (else "")
    byId: new Map(),
    sel: { nodes: new Set(), edge: "", lane: "", pool: false },
    view: { x: 0, y: 0, z: 1 },
    mode: "build",
    settings: false,
    viewOnly: false,
    forced: "",          // reason the view-only toggle is locked
    leftOpen: true,
    rightOpen: true,
    rail: storedUi.rail === true,
    minimap: typeof storedUi.minimap === "boolean" ? storedUi.minimap : window.innerWidth >= 1440,
    tool: "select",
    space: false,
    undo: [],
    redo: [],
    issues: [],
    dirty: false,
    typingKey: "",
    kbConnect: null,
    hoverTarget: "",
    tab: "general",      // the properties tab of the selected node
    idError: null,       // an event Id that was refused (shown in its field)
    guardStash: {},      // a decision exit's condition while it is the default branch
    stack: [],           // drill-in: the parent processes (breadcrumb)
    listView: false,     // „Vizualizare listă” (spec E.5; forced below 720)
    trace: null,         // a case's path on the flow (spec F.16)
    clip: null,          // copy / paste
  };
  const nodeEls = new Map();
  const edgeEls = new Map();
  let routes = new Map();     // edge key → points

  /* ---------------------------------------------------------------- model access */
  const typeOf = (s) => PM.typeOf(s, S.def);
  const boxOf = (s) => PM.box(s, S.def);
  const nameOf = (s) => {
    const t = typeOf(s);
    const title = String(s.title || "").trim();
    if (t === "start" && (!title || title === "Start")) return "Start";
    if (t === "end" && (!title || title === "End")) return "Sfârșit";
    return title || TYPE_LABEL[t];
  };
  const reindex = () => { S.byId = new Map((S.def.states || []).map((s) => [s.id, s])); };
  const laneById = (id) => (S.def.lanes || []).find((l) => l.id === id);
  const edgeKey = (src, i) => `${src}:${i}`;
  const edgeOf = (key) => {
    const at = key.lastIndexOf(":");
    const src = S.byId.get(key.slice(0, at));
    const i = Number(key.slice(at + 1));
    const t = src?.transitions?.[i];
    return t ? { src, t, i, tgt: S.byId.get(t.target) } : null;
  };
  const allEdges = () => {
    const out = [];
    (S.def.states || []).forEach((s) => (s.transitions || []).forEach((t, i) => out.push({ key: edgeKey(s.id, i), src: s, t, i, tgt: S.byId.get(t.target) })));
    return out;
  };
  const edgeLabel = (src, t) => {
    void src;
    if (!t.event || t.event === "next") return "";
    if (t.event === "failed") return "Eșec";
    return t.event;
  };
  const issuesOf = (id) => S.issues.filter((i) => i.id === id);
  const errorsOf = (id) => issuesOf(id).filter((i) => i.level === "error");
  const knownProcesses = () => (S.db?.processes || []).map((p) => p.name);
  /* everything validation compares with: processes (published ones for E9), active templates and
     process forms (W2), the active published version (W3) — cached per record + version */
  let baseCache = { key: "", def: null };
  function validationContext() {
    const h = (S.rec?.history || []).filter((x) => x.status === "Publicat").pop();
    const key = `${S.rec?.id}|${h?.version || ""}`;
    if (baseCache.key !== key) { let def = null; try { def = h ? PM.parse(h.text) : null; } catch { def = null; } baseCache = { key, def }; }
    return {
      processes: knownProcesses(),
      self: S.def.name,
      published: (S.db?.processes || []).filter((p) => p.publishedVersion).map((p) => p.name),
      templates: CAT.templates.length ? CAT.templates.filter((t) => t.active !== false).map((t) => t.code) : null,
      forms: CAT.forms.length ? CAT.forms : null,
      base: baseCache.def,
      usedBy: (S.rec?.usedBy || []).length,
    };
  }

  /* content bounds: the pool (rail, header, lanes) or the nodes */
  const RAIL = 40;
  const POOL_HEAD = 48;
  const ADD_LANE = 56;
  function poolWidth() {
    let right = 0;
    (S.def.states || []).forEach((s) => { const b = boxOf(s); right = Math.max(right, b.x + b.w); });
    return Math.max(960, snap(right + 120));
  }
  function contentBounds() {
    const lanes = PM.lanesLayout(S.def);
    if (lanes.length) {
      const h = lanes[lanes.length - 1].top + lanes[lanes.length - 1].height;
      return { x: -RAIL, y: -POOL_HEAD, w: poolWidth() + RAIL, h: h + POOL_HEAD + (S.viewOnly ? 0 : ADD_LANE) };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (S.def.states || []).forEach((s) => { const b = boxOf(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); });
    if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 800, h: 400 };
    return { x: minX - 40, y: minY - 40, w: maxX - minX + 80, h: maxY - minY + 80 };
  }

  /* ---------------------------------------------------------------- persistence (sandbox DB) */
  const readDb = () => { try { const db = JSON.parse(localStorage.getItem(DB_KEY) || "null"); return db && Array.isArray(db.processes) ? db : null; } catch { return null; } };
  const saveDb = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(S.db)); } catch { /* quota / private mode: the session keeps working */ } };
  const fetchText = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(url); return r.text(); };
  /* sub-processes the seed calls (Feature 90757): published processes of their own, Start → Sfârșit */
  const SUBPROCESSES = [
    ["SubProcessDepunereCereriiFrontOffice", "Sub-proces Inițiere cerere FrontOffice"],
    ["SubProcessDepunereCereriiGEAPGhieu", "Sub-proces Inițiere cerere la ghișeu"],
    ["SubProcessSuplinireInformaiiFrontOffice", "Sub-proces Suplinire informații"],
    ["SubProcesAvizareexterna", "Sub-proces Avizare interinstituțională"],
    ["SubProcesEmiterefizic", "Sub-proces Emitere fizică"],
  ];
  async function seedDb() {
    let services = null;
    try { services = JSON.parse(await fetchText("data/e-permits-services.json")); } catch { services = { flows: [], services: [] }; }
    const usedBy = (flowId) => (services.services || []).filter((svc) => (svc.geap?.requestTypes || []).some((rt) => rt.flow === flowId)).map((svc) => svc.code);
    const processes = [];
    for (const flow of services.flows || []) {
      let text = "";
      if (flow.definitionUrl) { try { text = await fetchText(flow.definitionUrl); } catch { text = ""; } }
      if (!text) text = PM.serialize(PM.fromFlowSteps(flow));
      let def;
      try { def = PM.parse(text); } catch { continue; }
      const at = "2026-09-28T15:21";
      processes.push({ id: flow.id, name: def.name, title: def.title || flow.name, status: "Publicat", version: def.version, publishedVersion: def.version, modifiedOn: at, modifiedBy: "Alexandr Pascalov", usedBy: usedBy(flow.id), text, history: [{ version: def.version, status: "Publicat", at, by: "Alexandr Pascalov", note: "Versiunea folosită acum de servicii.", text }] });
    }
    SUBPROCESSES.forEach(([name, title]) => {
      if (processes.some((p) => p.name === name)) return;
      const def = PM.newDefinition({ name, title });
      def.states[0].transitions.push({ event: "next", target: "end" });
      const text = PM.serialize(def);
      processes.push({ id: name, name, title, status: "Publicat", version: def.version, publishedVersion: def.version, modifiedOn: "2026-09-20T10:00", modifiedBy: "Alexandr Pascalov", usedBy: [], text, history: [{ version: def.version, status: "Publicat", at: "2026-09-20T10:00", by: "Alexandr Pascalov", note: "Prima versiune publicată.", text }], sub: true });
    });
    return { version: 1, processes };
  }
  async function ensureDb() {
    if (S.db) return S.db;
    S.db = readDb() || (await seedDb());
    saveDb();
    return S.db;
  }
  const recordById = (id) => S.db.processes.find((p) => p.id === id || p.name === id);
  /* catalogues from the services file: process forms (+ every form a known definition names, as the
     shell's loadFlowDefinitions does), notification templates, the request types (usage) */
  const catalogsReady = fetchText("data/e-permits-services.json").then((text) => {
    const data = JSON.parse(text);
    CAT.services = data.services || [];
    CAT.templates = (data.notificationTemplates || []).map((t) => ({ code: t.code, name: t.name, active: t.active !== false }));
    CAT.baseForms = (data.processForms || []).map((f) => f.id || f.name);
  }).catch(() => { CAT.baseForms = []; });
  function refreshForms() {
    const forms = new Set(CAT.baseForms || []);
    (S.db?.processes || []).forEach((p) => { try { (PM.parse(p.text).states || []).forEach((st) => (st.transitions || []).forEach((t) => { if (t.formName) forms.add(t.formName); })); } catch { /* skip */ } });
    CAT.forms = [...forms];
  }
  /* versions published in this sandbox (here or in another tab) reach the passport; a fresh
     sandbox (no DB yet) changes nothing */
  if (readDb()) catalogsReady.then(async () => { await ensureDb(); refreshForms(); S.db.processes.filter((p) => p.published).forEach(pushToServices); });
  window.addEventListener("storage", (event) => {
    if (event.key !== DB_KEY) return;
    const db = readDb();
    if (!db) return;
    if (!overlay.classList.contains("is-active")) S.db = db;
    db.processes.filter((p) => p.published).forEach(pushToServices);
    refreshRegistry();
  });

  /* ---------------------------------------------------------------- open / close */
  async function open(id, { viewOnly = false, forced = "", isNew = false, version = "", keepStack = false } = {}) {
    performance.mark("pd-open");
    await ensureDb();
    await catalogsReady;
    refreshForms();
    if (!keepStack) S.stack = [];
    S.trace = null;
    S.tab = "general";
    S.idError = null;
    S.guardStash = {};
    nodeEls.forEach((n) => n.remove()); nodeEls.clear();
    edgeEls.forEach((r) => { r.g.remove(); r.label.remove(); }); edgeEls.clear();
    routes.clear();
    let rec = isNew ? null : recordById(id) || recordById("flux-simplificat-fara-supervizor") || S.db.processes[0];
    if (isNew) {
      const n = S.db.processes.filter((p) => p.name.startsWith("ProcesNou")).length + 1;
      const def = PM.newDefinition({ name: `ProcesNou${n}`, title: "Proces nou" });
      const text = PM.serialize(def);
      rec = { id: `proces-nou-${n}`, name: def.name, title: def.title, status: "Schiță", version: def.version, publishedVersion: "", modifiedOn: localStamp(), modifiedBy: currentUser(), usedBy: [], text, history: [{ version: def.version, status: "Schiță", at: localStamp(), by: currentUser(), note: "Proces creat.", text }] };
      S.db.processes.push(rec);
      saveDb();
    }
    S.rec = rec;
    const past = version && rec.history.find((h) => h.version === version && h.text);
    S.openedVersion = past && version !== rec.version ? version : "";
    const text = S.openedVersion ? past.text : rec.text;
    S.baseText = text;
    try { S.def = PM.parse(text); } catch { S.def = PM.newDefinition({ name: rec.name, title: rec.title }); S.baseText = PM.serialize(S.def); }
    reindex();
    S.sel = { nodes: new Set(), edge: "", lane: "", pool: false };
    S.undo = [];
    S.redo = [];
    S.settings = false;
    S.mode = "build";
    S.forced = S.openedVersion ? "Versiune anterioară — o poți doar vizualiza." : forced;
    S.viewOnly = Boolean(viewOnly || S.forced || window.innerWidth < 960);
    if (!S.forced && window.innerWidth < 960) S.forced = "Editarea fluxului e disponibilă pe ecrane de cel puțin 960 px.";
    S.leftOpen = true;
    S.rightOpen = true;
    if (window.innerWidth < 1280 && storedUi.rail !== false) S.rail = true;
    S.dirty = false;
    if (!overlay.classList.contains("is-active")) window.__modal?.open?.("#process-designer-modal");
    root.dataset.pdReady = "";
    renderAll();
    requestAnimationFrame(() => {
      measureStage();
      fit({ animate: false });
      root.dataset.pdReady = "true";
      performance.measure("pd-open-to-fit", "pd-open");
      el.stage.focus({ preventScroll: true });
    });
  }
  function close({ force = false } = {}) {
    if (S.dirty && !force && !S.viewOnly) { window.__modal?.open?.("#pd-close-modal"); return; }
    closeAddMenu();
    window.__modal?.close?.("#process-designer-modal");
    if (/^#flux\//.test(window.location.hash)) history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  q("[data-pd-close]").addEventListener("click", () => close());
  closeModal.querySelector("[data-pd-close-discard]").addEventListener("click", () => { window.__modal?.close?.("#pd-close-modal"); S.dirty = false; close({ force: true }); });
  closeModal.querySelector("[data-pd-close-save]").addEventListener("click", () => {
    window.__modal?.close?.("#pd-close-modal");
    if (save()) close({ force: true });
  });

  /* ---------------------------------------------------------------- history (undo / redo) */
  function snapshot() { return { text: JSON.stringify(S.def), sel: { nodes: [...S.sel.nodes], edge: S.sel.edge, lane: S.sel.lane } }; }
  function checkpoint(key = "") {
    if (key && key === S.typingKey) return;
    S.typingKey = key;
    S.undo.push(snapshot());
    if (S.undo.length > 100) S.undo.shift();
    S.redo = [];
  }
  function restore(snap) {
    S.def = JSON.parse(snap.text);
    reindex();
    S.sel = { nodes: new Set(snap.sel.nodes.filter((id) => S.byId.has(id))), edge: snap.sel.edge && edgeOf(snap.sel.edge) ? snap.sel.edge : "", lane: snap.sel.lane && laneById(snap.sel.lane) ? snap.sel.lane : "" };
    S.typingKey = "";
    commit({ full: true });
  }
  function undo() { if (S.viewOnly || !S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); announce("Anulat."); }
  function redo() { if (S.viewOnly || !S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); announce("Refăcut."); }

  /* after every model change: lanes / nodes / edges, validation on idle, dirty state */
  function commit({ full = false, nodes = null, panel = true } = {}) {
    if (full) { renderLanes(); renderNodes(); renderEdges(); }
    else if (nodes) { nodes.forEach(patchNode); renderEdges(nodes); renderLanes(); }
    else { renderLanes(); renderNodes(); renderEdges(); }
    S.dirty = PM.serialize(S.def) !== S.baseText;
    S.rec && (S.rec.draftText = S.dirty ? JSON.stringify(S.def) : "");
    scheduleValidate();
    renderChrome();
    if (panel) renderPanel();
    scheduleMinimap();
    if (S.mode === "json") renderJson();
    syncEdgeEnds();
    if (S.trace) renderTrace();
    if (!listEl.hidden) renderList();
  }
  let validateTimer = 0;
  function scheduleValidate() {
    window.clearTimeout(validateTimer);
    validateTimer = window.setTimeout(runValidate, 120);
  }
  function runValidate() {
    S.issues = PM.validate(S.def, validationContext());
    renderIssues();
    nodeEls.forEach((node, id) => node.classList.toggle("has-error", errorsOf(id).length > 0));
    edgeEls.forEach((rec, key) => rec.g.classList.toggle("has-error", errorsOf(key).length > 0));
    if (el.props.querySelector("[data-pd-panel-errors]")) renderPanel();
  }

  /* ================================================================== RENDER */
  function renderAll() {
    S.issues = PM.validate(S.def, validationContext());
    renderChrome();
    renderPalette();
    renderLanes();
    renderNodes();
    renderEdges();
    renderIssues();
    renderPanel();
    renderVersions();
    applyView();
    scheduleMinimap();
    setMode(S.mode);
    syncEdgeEnds();
    renderTrace();
    renderList();
  }

  /* ---- topbar, footer, modes */
  function renderChrome() {
    const rec = S.rec;
    const title = S.def.title || rec.title || "Proces";
    el.title.textContent = title;
    el.title.setAttribute("data-cell-tooltip", "");
    /* drill-in (Figma 5740:26639): the library breadcrumb replaces the title */
    el.crumbs.hidden = !S.stack.length;
    el.title.hidden = S.stack.length > 0;
    if (S.stack.length) {
      el.crumbs.innerHTML = ui().renderBreadcrumbs?.([...S.stack.map((f, i) => ({ label: f.title, attr: `data-pd-crumb="${i}"` })), { label: title }], { label: "Procese deschise", truncate: true }) || "";
    }
    el.restore.hidden = !S.openedVersion;
    const published = rec.status === "Publicat" && !S.dirty && !S.openedVersion;
    el.status.innerHTML = S.openedVersion ? tag("Versiune anterioară", "neutral") : tag(published ? "Publicat" : "Schiță", published ? "success" : "neutral");
    el.versionLabel.textContent = `v${S.def.version || rec.version}`;
    root.classList.toggle("is-view-only", S.viewOnly);
    root.classList.toggle("is-dirty", S.dirty);
    el.viewOnly.checked = S.viewOnly;
    el.viewOnly.disabled = Boolean(S.forced);
    if (S.forced) el.viewOnlyWrap.dataset.tooltipReason = S.forced; else delete el.viewOnlyWrap.dataset.tooltipReason;
    el.save.disabled = !S.dirty;
    el.cancel.disabled = !S.dirty;
    el.dirtyNote.textContent = S.dirty ? "Modificări nesalvate" : S.rec.modifiedOn ? `Salvat ${longDate(S.rec.modifiedOn)}, ${hhmm(S.rec.modifiedOn)} · ${S.rec.modifiedBy}` : "";
    root.querySelectorAll("[data-pd-undo]").forEach((b) => { b.disabled = !S.undo.length; });
    root.querySelectorAll("[data-pd-redo]").forEach((b) => { b.disabled = !S.redo.length; });
    root.querySelectorAll("[data-pd-tool]").forEach((b) => { const on = b.dataset.pdTool === S.tool; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
    q("[data-pd-minimap-toggle]").setAttribute("aria-pressed", String(S.minimap));
    const listBtn = q("[data-pd-list-toggle]");
    listBtn.setAttribute("aria-pressed", String(S.listView || listForced()));
    listBtn.setAttribute("aria-label", S.listView ? "Vizualizarea diagramei" : "Vizualizare listă");
    listBtn.dataset.tooltipLabel = listForced() ? "Pe ecrane mici procesul se vede ca listă" : `${S.listView ? "Vizualizarea diagramei" : "Vizualizare listă"} (L)`;
    if (listForced()) listBtn.setAttribute("aria-disabled", "true"); else listBtn.removeAttribute("aria-disabled");
    root.classList.toggle("is-list", S.listView || listForced());
    const panelsHidden = !S.leftOpen && !S.rightOpen;
    const panelsBtn = q("[data-pd-panels-toggle]");
    panelsBtn.setAttribute("aria-pressed", String(panelsHidden));
    panelsBtn.setAttribute("aria-label", panelsHidden ? "Arată panourile" : "Ascunde panourile");
    panelsBtn.dataset.tooltipLabel = `${panelsHidden ? "Arată panourile" : "Ascunde panourile"} (Ctrl+\\)`;
    el.settings.setAttribute("aria-pressed", String(S.settings));
    el.settings.classList.toggle("is-active", S.settings);
    el.minimap.hidden = !S.minimap;
    el.palette.hidden = S.viewOnly || !S.leftOpen;
    /* below 960 the properties are a bottom card that appears with a selection (spec E.7) */
    const narrow = window.innerWidth < 960;
    const nothing = !S.settings && !S.sel.nodes.size && !S.sel.edge && !S.sel.lane && !S.sel.pool;
    el.props.hidden = !S.rightOpen || (narrow && nothing);
    el.showProps.hidden = S.rightOpen || S.mode !== "build" || (narrow && nothing);
    el.stage.dataset.tool = S.tool;
    requestAnimationFrame(positionToolbar);
  }
  /* the toolbar sits in the middle of the area the cards leave free (never under a panel) */
  function positionToolbar() {
    if (!overlay.classList.contains("is-active")) return;
    measureStage();
    const v = visibleArea();
    const half = el.toolbar.offsetWidth / 2;
    const x = clamp(v.cx, half + 16, Math.max(half + 16, stageRect.width - half - 16));
    el.stage.style.setProperty("--pd-toolbar-x", `${Math.round(x)}px`);
  }
  function setMode(mode) {
    S.mode = mode;
    root.dataset.mode = mode;
    root.querySelectorAll("[data-pd-mode]").forEach((b) => {
      const on = b.dataset.pdMode === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    el.json.hidden = mode !== "json";
    if (mode === "json") renderJson();
    renderChrome();
  }
  root.querySelectorAll("[data-pd-mode]").forEach((b) => b.addEventListener("click", () => { closeAddMenu(); setMode(b.dataset.pdMode); }));
  el.settings.addEventListener("click", () => {
    S.settings = !S.settings;
    if (S.settings) { S.rightOpen = true; if (S.mode !== "build") setMode("build"); }
    renderChrome();
    renderPanel();
    if (S.settings) el.props.querySelector("input, textarea, button")?.focus();
  });

  /* ---- versions menu (FB version button) */
  function renderVersions() {
    const rec = S.rec;
    const rows = (rec.history || []).slice().reverse();
    el.versions.innerHTML = `
      <li role="none" class="e-permits-builder__issues-head">Versiuni</li>
      ${rows.map((h) => {
        const current = !S.openedVersion ? h.version === rec.version : h.version === S.openedVersion;
        const active = h.version === rec.publishedVersion && rec.status === "Publicat" || (h.status === "Publicat" && h.version === rec.publishedVersion);
        return `
        <li role="none">
          <button class="e-permits-fo-intent-menu__item e-permits-pd__version-row${current ? " is-current" : ""}" type="button" role="menuitem" data-pd-open-version="${esc(h.version)}"${current ? ' aria-current="true"' : ""}>
            <span class="e-permits-pd__version-main">
              <strong>v${esc(h.version)}</strong>
              ${tag(h.status === "Publicat" ? (active ? "Publicat · activă" : "Publicat") : "Schiță", h.status === "Publicat" ? "success" : "neutral")}
            </span>
            <span class="e-permits-pd__version-meta">${esc(longDate(h.at))}, ${esc(hhmm(h.at))} · ${esc(h.by)}</span>
          </button>
        </li>`;
      }).join("")}`;
  }
  el.versions.addEventListener("click", (event) => {
    const row = event.target.closest("[data-pd-open-version]");
    if (!row) return;
    const version = row.dataset.pdOpenVersion;
    if (version === (S.openedVersion || S.rec.version)) return;
    if (S.dirty) { ui().showShellToast?.("Salvează sau anulează modificările înainte să deschizi altă versiune.", "info"); return; }
    open(S.rec.id, { version: version === S.rec.version ? "" : version, viewOnly: version !== S.rec.version });
    announce(`Versiunea ${version} deschisă.`);
  });

  /* ---- issues (topbar __errors + menu) */
  function renderIssues() {
    const errors = S.issues.filter((i) => i.level === "error");
    const warnings = S.issues.filter((i) => i.level === "warning");
    const saveBlocking = errors.filter(PM.blocksSave);
    const n = errors.length;
    el.errors.classList.toggle("is-clean", n === 0);
    el.errors.classList.toggle("btn-outline-destructive", n > 0);
    el.errorsLabel.textContent = n ? `${n} ${n === 1 ? "eroare" : "erori"}` : "Fără erori";
    el.errors.setAttribute("aria-label", n ? `${n} ${n === 1 ? "eroare" : "erori"} în proces — vezi lista` : `Fără erori${warnings.length ? `, ${warnings.length} ${warnings.length === 1 ? "avertisment" : "avertismente"}` : ""} — vezi lista`);
    const row = (issue) => `
      <li role="none">
        <button class="e-permits-fo-intent-menu__item e-permits-builder__issue${issue.level === "warning" ? " is-warning" : ""}" type="button" role="menuitem" data-pd-issue="${esc(issue.id)}" data-kind="${esc(issue.kind)}" data-prop="${esc(issue.prop)}" data-tab="${esc(issue.tab || "general")}">
          ${icon(issue.level === "warning" ? "warning-filled" : "circle-error-filled")}
          <span class="e-permits-builder__issue-text">
            <strong>${esc(issue.name || "Proces")}</strong>
            <span>${esc(issue.message)}</span>
            <span class="e-permits-builder__issue-where">${esc(issue.code)} · ${issue.blocks === "save" ? "blochează salvarea" : issue.blocks === "publish" ? "blochează publicarea" : "avertisment"}</span>
          </span>
        </button>
      </li>`;
    el.issues.innerHTML = `
      ${n ? `<li role="none" class="e-permits-builder__issues-head">${saveBlocking.length ? `${saveBlocking.length} ${saveBlocking.length === 1 ? "eroare blochează" : "erori blochează"} salvarea` : `${n} ${n === 1 ? "eroare blochează" : "erori blochează"} publicarea`}</li>${errors.map(row).join("")}` : `<li role="none" class="e-permits-builder__issues-head">Fără erori — procesul poate fi publicat</li>`}
      ${warnings.length ? `<li role="none" class="e-permits-builder__issues-head">Avertismente</li>${warnings.map(row).join("")}` : ""}`;
    if (n) {
      el.publish.setAttribute("aria-disabled", "true");
      el.publish.dataset.tooltipReason = `Corectați ${n} ${n === 1 ? "eroare" : "erori"} înainte de publicare.`;
    } else {
      el.publish.removeAttribute("aria-disabled");
      delete el.publish.dataset.tooltipReason;
    }
  }
  /* an issue row (menu, publish modal): select + centre the element, open the tab, focus the property */
  function goToIssue({ id, kind, prop = "", tab = "general" }) {
    if (S.mode !== "build") setMode("build");
    if (S.listView && !listForced()) { S.listView = false; renderList(); }
    if (kind === "edge") selectEdge(id);
    else if (S.byId.has(id)) { S.tab = tab || "general"; selectNodes([id]); }
    else { S.settings = true; S.rightOpen = true; renderChrome(); renderPanel(); return; }
    S.rightOpen = true;
    renderChrome();
    renderPanel();
    zoomTo(kind === "edge" ? edgeBounds(id) : boundsOf([id]), { maxZoom: 1.25 });
    window.setTimeout(() => {
      const target = (prop && (el.props.querySelector(`[data-pd-prop="${CSS.escape(prop)}"]`) || el.props.querySelector(`[data-pd-prop^="${CSS.escape(prop)}"]`))) || el.props.querySelector("[data-pd-prop]");
      const focusable = target?.matches?.("select[hidden], select") ? target.closest("[data-fo-native-select]")?.querySelector("button") || target : target;
      focusable?.focus({ preventScroll: true });
      focusable?.scrollIntoView?.({ block: "nearest" });
    }, 60);
  }
  el.issues.addEventListener("click", (event) => {
    const item = event.target.closest("[data-pd-issue]");
    if (!item) return;
    goToIssue({ id: item.dataset.pdIssue, kind: item.dataset.kind, prop: item.dataset.prop, tab: item.dataset.tab });
  });
  el.publish.addEventListener("click", () => publish());

  /* ---- palette (left floating card) */
  const glyph = (type) => `<span class="e-permits-pd__glyph e-permits-pd__glyph--${type}" aria-hidden="true"><i></i></span>`;
  function renderPalette() {
    const lanes = (S.def.lanes || []).length;
    const laneFull = lanes >= PM.LANE_MAX;
    const items = PALETTE.map((p) => ({ ...p, disabled: false }));
    const lane = { type: "lanes", label: "Pool + Bandă", desc: lanes ? "Adaugă o bandă" : "Rolurile care fac pașii", disabled: laneFull };
    if (S.rail) {
      el.palette.classList.add("is-rail");
      el.palette.innerHTML = `
        <div class="e-permits-pd__rail">
          ${tbButton("data-pd-rail-toggle", "sidebar", "Extinde elementele", "[")}
          <i class="e-permits-pd__railsep" aria-hidden="true"></i>
          ${[...items, lane].map((p) => `<button class="btn btn-strict btn-sm btn-icon-only e-permits-pd__rail-item" type="button" aria-label="${esc(p.label)}" data-tooltip-label="${esc(p.label)}"${p.disabled ? ` aria-disabled="true" data-tooltip-reason="Ai atins limita de 15 benzi."` : ""} data-pd-palette-item="${p.type}">${glyph(p.type)}</button>`).join("")}
        </div>`;
      return;
    }
    el.palette.classList.remove("is-rail");
    const itemHtml = (p) => `
      <button class="e-permits-builder__library-item e-permits-pd__palette-item${p.disabled ? " is-disabled" : ""}" type="button"${p.disabled ? ' aria-disabled="true" data-tooltip-reason="Ai atins limita de 15 benzi."' : ""} data-pd-palette-item="${p.type}" aria-describedby="pd-palette-hint">
        <span>${glyph(p.type)}</span>
        <strong>${esc(p.label)}</strong>
        <em>${esc(p.desc)}</em>
      </button>`;
    el.palette.innerHTML = `
      <div class="e-permits-pd__card-head">
        <h2 class="e-permits-pd__card-title">Elemente</h2>
        ${tbButton("data-pd-rail-toggle", "sidebar", "Restrânge elementele", "[")}
      </div>
      <div class="e-permits-pd__palette-list">
        ${items.map(itemHtml).join("")}
        <i class="e-permits-pd__palette-sep" aria-hidden="true"></i>
        ${itemHtml(lane)}
      </div>
      <p class="e-permits-pd__palette-hint" id="pd-palette-hint">Trage pe diagramă sau apasă pentru a adăuga după elementul selectat.</p>`;
  }

  /* ---- pool + lanes (HTML, Figma `.step`): header, rails with vertical titles, bodies */
  function renderLanes() {
    const lanes = PM.lanesLayout(S.def);
    if (!lanes.length) { el.lanes.innerHTML = ""; return; }
    const w = poolWidth();
    const total = lanes[lanes.length - 1].top + lanes[lanes.length - 1].height;
    const poolTitle = S.def.pool?.title || S.def.title || "Pool";
    const full = lanes.length >= PM.LANE_MAX;
    el.lanes.innerHTML = `
      <div class="e-permits-pd__pool" data-pd-geo="${-RAIL},${-POOL_HEAD},${w + RAIL},${total + POOL_HEAD + (S.viewOnly || full ? 0 : ADD_LANE)}">
        <div class="e-permits-pd__pool-head${S.sel.pool ? " is-selected" : ""}">
          <button class="e-permits-pd__pool-select" type="button" data-pd-pool-select aria-label="Pool ${esc(poolTitle)}: ${lanes.length} ${lanes.length === 1 ? "bandă" : "benzi"}">
            <span class="e-permits-pd__pool-title">${esc(poolTitle)}</span>
            <span class="e-permits-pd__pool-meta">${lanes.length} ${lanes.length === 1 ? "bandă" : "benzi"} · ${(S.def.states || []).length} elemente</span>
          </button>
        </div>
        ${lanes.map((l, i) => `
          <div class="e-permits-pd__lane${S.sel.lane === l.id ? " is-selected" : ""}${S.hoverTarget === `lane:${l.id}` ? " is-target" : ""}" data-pd-lane="${esc(l.id)}" data-pd-geo="${-RAIL},${l.top},${w + RAIL},${l.height}">
            <button class="e-permits-pd__lane-rail" type="button" data-pd-lane-select="${esc(l.id)}" aria-label="Banda ${i + 1}: ${esc(l.lane.title || "fără titlu")}${l.lane.role ? `, rol ${esc(roleName(l.lane.role))}` : ""}"${S.viewOnly ? "" : ' aria-describedby="pd-lane-hint"'}>
              <span class="e-permits-pd__lane-title" data-cell-tooltip="${esc(String(l.lane.title || "Bandă").trim())}">${esc(String(l.lane.title || "Bandă").trim())}</span>
            </button>
          </div>`).join("")}
        ${S.viewOnly ? "" : lanes.map((l) => `<span class="e-permits-pd__lane-resize${S.sel.lane === l.id ? " is-selected" : ""}" data-pd-lane-resize="${esc(l.id)}" data-pd-geo="${-RAIL},${l.top + l.height - 4},${w + RAIL},8" data-tooltip-label="Trage pentru a schimba înălțimea benzii" aria-hidden="true"><i></i></span>`).join("")}
        ${S.viewOnly ? "" : '<span class="u-visually-hidden" id="pd-lane-hint">Trage în sus sau în jos ca să schimbi ordinea benzilor. Înălțimea și ordinea se pot schimba și din proprietăți.</span>'}
        ${!S.viewOnly && !full ? `<button class="e-permits-builder__dropzone e-permits-pd__lane-add" type="button" data-pd-add-lane data-pd-geo="${-RAIL + 12},${total + 8},${w + RAIL - 24},${ADD_LANE - 20}">${icon("plus-small", 20)}<span>Adaugă bandă</span></button>` : ""}
      </div>`;
    /* geometry from the model (spec C.3): position + size are data, not CSS */
    el.lanes.querySelectorAll("[data-pd-geo]").forEach((node) => {
      const [x, y, gw, gh] = node.dataset.pdGeo.split(",").map(Number);
      const parent = node.parentElement.closest("[data-pd-geo]");
      const [px, py] = parent ? parent.dataset.pdGeo.split(",").map(Number) : [0, 0];
      node.style.transform = `translate(${x - px}px, ${y - py}px)`;
      node.style.width = `${gw}px`;
      node.style.height = `${gh}px`;
      if (!parent) node.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  /* ---- nodes (HTML buttons, created once per id, then patched) */
  const PORT_TITLE = { top: "sus", bottom: "jos", left: "stânga", right: "dreapta", "top-left": "sus-stânga", "top-right": "sus-dreapta", "bottom-left": "jos-stânga", "bottom-right": "jos-dreapta", "corner-tl": "sus", "corner-tr": "dreapta", "corner-br": "jos", "corner-bl": "stânga" };
  function nodeInner(s) {
    const t = typeOf(s);
    const b = boxOf(s);
    const name = nameOf(s);
    let inner = "";
    /* clipped names show their full text on hover / focus (js/table-cells.js, data-cell-tooltip) */
    const nameSpan = `<span class="e-permits-pd__name" data-cell-tooltip="${esc(name)}">${esc(name)}</span>`;
    /* site-map card (Figma 🗂️ Site map 8346:1839): type tag in the element's colour · id chip · title;
       an error swaps the chip for a red tag */
    const card = (tone) => `
      <span class="e-permits-pd__shape e-permits-pd__card">
        <span class="e-permits-pd__card-top">
          <span class="status-tag status-tag--${tone} is-strong status-tag--small e-permits-pd__type">${esc(TYPE_LABEL[t])}</span>
          <span class="e-permits-pd__chip">${icon("hashtag", 12)}<span>${esc(s.id)}</span></span>
          <span class="status-tag status-tag--danger is-subtle status-tag--small e-permits-pd__error-tag">Eroare</span>
          ${t === "subprocess" && s.properties?.processRef ? `<span class="e-permits-pd__open-sub" data-pd-open-sub data-tooltip-label="Deschide sub-procesul" aria-hidden="true">${icon("external-link", 16)}</span>` : ""}
        </span>
        ${nameSpan}
      </span>`;
    if (t === "start" || t === "end") inner = `<span class="e-permits-pd__shape">${nameSpan}</span>`;
    else if (t === "activity") inner = card("brand");
    else if (t === "subprocess") inner = card("violet");
    else if (t === "decision") inner = `<span class="e-permits-pd__shape"></span><span class="e-permits-pd__decision-icon" aria-hidden="true">${icon("bubble-question", 16)}</span><span class="e-permits-pd__caption e-permits-pd__caption--decision" data-cell-tooltip="${esc(name)}">${esc(name)}</span>`;
    else {
      const proc = PROCESSORS[s.componentType || ""] || PROCESSORS[""];
      const count = (s.properties?.templateCodes || []).length;
      const shown = Boolean(s.properties?.showName);
      inner = `<span class="e-permits-pd__shape"${shown ? "" : ` data-cell-tooltip="${esc(name)} · ${esc(proc[0])}" data-cell-tooltip-always`}>${proc[1] ? icon(proc[1], 20) : ""}</span>${s.componentType === "notify" && count ? `<span class="badge badge--md badge--solid-neutral e-permits-pd__badge" aria-hidden="true">${count}</span>` : ""}${shown ? `<span class="e-permits-pd__caption" data-cell-tooltip="${esc(name)}">${esc(name)}</span>` : ""}`;
    }
    const ports = S.viewOnly ? "" : (PM.PORTS[t] || []).map((port) => {
      const p = PM.portPoint(b, port);
      return `<span class="e-permits-pd__port" data-pd-port="${port}" data-x="${p.x - b.x}" data-y="${p.y - b.y}" aria-hidden="true"></span>`;
    }).join("");
    const plusPort = t === "decision" ? "corner-tr" : "right";
    const plus = S.viewOnly || t === "end" ? "" : (() => { const p = PM.portPoint(b, plusPort); return `<span class="e-permits-pd__plus" data-pd-plus data-x="${p.x - b.x + 20}" data-y="${p.y - b.y}" aria-hidden="true">${icon("plus-small", 16)}</span>`; })();
    return `${inner}${ports}${plus}<span class="e-permits-pd__dot" aria-hidden="true"></span><span class="status-tag status-tag--info is-strong status-tag--small e-permits-pd__current-tag" aria-hidden="true">Pas curent</span>`;
  }
  function nodeAria(s) {
    const t = typeOf(s);
    const lane = laneById(s.properties?.laneId);
    const errs = errorsOf(s.id).length;
    return `${TYPE_LABEL[t]}: ${nameOf(s)}${lane ? `, banda ${String(lane.title || "").trim()}` : ""}${errs ? `, ${errs} ${errs === 1 ? "eroare" : "erori"}` : ""}`;
  }
  function placeNode(node, s) {
    const b = boxOf(s);
    node.style.transform = `translate(${b.x}px, ${b.y}px)`;
    node.style.width = `${b.w}px`;
    node.style.height = `${b.h}px`;
  }
  function placeChildren(node) {
    node.querySelectorAll("[data-x]").forEach((child) => { child.style.transform = `translate(${child.dataset.x}px, ${child.dataset.y}px) translate(-50%, -50%)`; });
  }
  function buildNode(s) {
    const t = typeOf(s);
    const node = document.createElement("button");
    node.type = "button";
    node.className = `e-permits-pd__node e-permits-pd__node--${t}`;
    node.dataset.pdNode = s.id;
    node.tabIndex = -1;
    return node;
  }
  function patchNode(id) {
    const s = S.byId.get(id);
    let node = nodeEls.get(id);
    if (!s) { node?.remove(); nodeEls.delete(id); return; }
    const t = typeOf(s);
    if (!node || !node.classList.contains(`e-permits-pd__node--${t}`)) {
      node?.remove();
      node = buildNode(s);
      nodeEls.set(id, node);
      el.nodes.appendChild(node);
    }
    const sig = `${S.viewOnly}|${nameOf(s)}|${s.componentType || ""}|${(s.properties?.templateCodes || []).length}|${Boolean(s.properties?.showName)}|${s.properties?.processRef || ""}`;
    if (node.dataset.sig !== sig) { node.innerHTML = nodeInner(s); node.dataset.sig = sig; placeChildren(node); }
    placeNode(node, s);
    node.classList.toggle("is-selected", S.sel.nodes.has(id));
    node.classList.toggle("has-error", errorsOf(id).length > 0);
    node.setAttribute("aria-label", nodeAria(s));
    if (S.trace) { node.classList.toggle("is-visited", S.trace.path.nodes.includes(id) && id !== S.trace.current); node.classList.toggle("is-current", id === S.trace.current); }
    node.setAttribute("aria-pressed", String(S.sel.nodes.has(id)));
    node.title = "";
  }
  function renderNodes() {
    const ids = new Set((S.def.states || []).map((s) => s.id));
    nodeEls.forEach((node, id) => { if (!ids.has(id)) { node.remove(); nodeEls.delete(id); } });
    (S.def.states || []).forEach((s) => patchNode(s.id));
    rovingNode();
  }
  /* one node in the tab order: the focused / selected one, else Start */
  function rovingNode(preferred = "") {
    const id = preferred || [...S.sel.nodes][0] || S.def.initialState;
    nodeEls.forEach((node, nid) => { node.tabIndex = nid === id ? 0 : -1; });
  }

  /* ---- edges: one SVG; per edge a group (hit path, path, arrow) + an HTML label */
  const SVG = "http://www.w3.org/2000/svg";
  function obstaclesFor(src, tgt) {
    const out = [];
    (S.def.states || []).forEach((s) => { if (s !== src && s !== tgt) out.push(boxOf(s)); });
    return out;
  }
  function routeOf(src, t, tgt) {
    if (!tgt) {
      const a = boxOf(src);
      const p = PM.portPoint(a, PM.normalPort(a.type, t.sourcePort) || (a.type === "decision" ? "corner-tr" : "right"));
      return [p, { x: p.x + p.dx * 60, y: p.y + p.dy * 60 }];
    }
    const a = boxOf(src), b = boxOf(tgt);
    const auto = PM.facingPorts(a, b);
    const sp = PM.normalPort(a.type, t.sourcePort) || auto.source;
    const tp = PM.normalPort(b.type, t.targetPort) || auto.target;
    return PM.route(PM.portPoint(a, sp), PM.portPoint(b, tp), obstaclesFor(src, tgt), t.waypoints);
  }
  function arrowD(points) {
    const n = points.length;
    const a = points[n - 2], b = points[n - 1];
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    const L = 8, W = 4.5;
    return `M${b.x - dx * L - dy * W} ${b.y - dy * L + dx * W} L${b.x} ${b.y} L${b.x - dx * L + dy * W} ${b.y - dy * L - dx * W}`;
  }
  function edgeClass(src, t) {
    const color = t.color && t.color !== "implicit" ? ` is-${t.color}` : typeOf(src) === "decision" ? " is-branch" : "";
    return `e-permits-pd__edge${color}${t.width ? ` is-w${t.width}` : ""}`;
  }
  function drawEdge(e) {
    let rec = edgeEls.get(e.key);
    if (!rec) {
      const g = document.createElementNS(SVG, "g");
      g.innerHTML = '<path class="e-permits-pd__edge-hit"/><path class="e-permits-pd__edge-line"/><path class="e-permits-pd__edge-arrow"/>';
      g.dataset.pdEdge = e.key;
      el.edges.appendChild(g);
      const label = document.createElement("button");
      label.type = "button";
      label.className = "e-permits-pd__edge-label";
      label.dataset.pdEdgeLabel = e.key;
      label.tabIndex = -1;
      el.labels.appendChild(label);
      rec = { g, label };
      edgeEls.set(e.key, rec);
    }
    const pts = routeOf(e.src, e.t, e.tgt);
    routes.set(e.key, pts);
    const d = PM.pathD(pts, 8);
    const [hit, line, arrow] = rec.g.children;
    hit.setAttribute("d", d);
    line.setAttribute("d", d);
    arrow.setAttribute("d", arrowD(pts));
    rec.g.setAttribute("class", `${edgeClass(e.src, e.t)}${S.sel.edge === e.key ? " is-selected" : ""}${!e.tgt ? " is-broken" : ""}${errorsOf(e.key).length ? " has-error" : ""}${isRelated(e) ? " is-related" : ""}`);
    const text = edgeLabel(e.src, e.t);
    rec.label.hidden = !text;
    if (text) {
      if (rec.label.textContent !== text) { rec.label.textContent = text; rec.label.dataset.cellTooltip = text; }
      const at = PM.labelPoint(pts);
      let dx = Number(e.t.labelDx) || 0, dy = Number(e.t.labelDy) || 0;
      /* offsets the old designer stored for ITS routes: kept in the data, applied only when small */
      if (Math.hypot(dx, dy) > 48) { dx = 0; dy = 0; }
      rec.label.style.transform = `translate(${at.x + dx}px, ${at.y + dy}px) translate(-50%, -50%)`;
      rec.label.classList.toggle("is-selected", S.sel.edge === e.key);
      rec.label.setAttribute("aria-label", `Conexiune ${nameOf(e.src)} → ${e.tgt ? nameOf(e.tgt) : "fără țintă"}: ${text}`);
    }
  }
  /* view-only path highlight: edges in / out of the selected node */
  function isRelated(e) {
    if (!S.sel.nodes.size) return false;
    return S.sel.nodes.has(e.src.id) || (e.tgt && S.sel.nodes.has(e.tgt.id));
  }
  function renderEdges(onlyNodes = null) {
    const edges = allEdges();
    const keys = new Set(edges.map((e) => e.key));
    edgeEls.forEach((rec, key) => { if (!keys.has(key)) { rec.g.remove(); rec.label.remove(); edgeEls.delete(key); routes.delete(key); } });
    const touch = onlyNodes ? new Set(onlyNodes) : null;
    edges.forEach((e) => { if (!touch || touch.has(e.src.id) || (e.tgt && touch.has(e.tgt.id)) || !edgeEls.has(e.key)) drawEdge(e); });
    el.stage.classList.toggle("has-focus-path", S.viewOnly && S.sel.nodes.size > 0 && !S.trace);
    if (S.sel.edge && (!touch || drag)) syncEdgeEnds();
  }
  function refreshSelectionClasses() {
    nodeEls.forEach((node, id) => { const on = S.sel.nodes.has(id); node.classList.toggle("is-selected", on); node.setAttribute("aria-pressed", String(on)); });
    edgeEls.forEach((rec, key) => {
      const e = edgeOf(key);
      rec.g.classList.toggle("is-selected", S.sel.edge === key);
      rec.label.classList.toggle("is-selected", S.sel.edge === key);
      rec.g.classList.toggle("is-related", Boolean(e && isRelated({ src: e.src, tgt: e.tgt })));
    });
    el.lanes.querySelectorAll("[data-pd-lane]").forEach((lane) => lane.classList.toggle("is-selected", S.sel.lane === lane.dataset.pdLane));
    el.lanes.querySelectorAll("[data-pd-lane-resize]").forEach((h) => h.classList.toggle("is-selected", S.sel.lane === h.dataset.pdLaneResize));
    el.lanes.querySelector(".e-permits-pd__pool-head")?.classList.toggle("is-selected", Boolean(S.sel.pool));
    el.stage.classList.toggle("has-focus-path", S.viewOnly && S.sel.nodes.size > 0 && !S.trace);
    syncEdgeEnds();
    if (!listEl.hidden) renderList();
    nodeEls.forEach((node, id) => node.classList.toggle("is-related", S.viewOnly && S.sel.nodes.size > 0 && !S.sel.nodes.has(id) && allEdges().some((e) => (S.sel.nodes.has(e.src.id) && e.t.target === id) || (S.sel.nodes.has(e.t.target) && e.src.id === id))));
    rovingNode();
  }

  /* ---------------------------------------------------------------- viewport */
  let stageRect = { left: 0, top: 0, width: 1, height: 1 };
  function measureStage() { const r = el.stage.getBoundingClientRect(); stageRect = { left: r.left, top: r.top, width: r.width, height: r.height }; }
  new ResizeObserver(() => { measureStage(); scheduleMinimap(); }).observe(el.stage);
  let viewRaf = 0;
  function applyView() {
    viewRaf = 0;
    const { x, y, z } = S.view;
    el.world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    el.stage.style.setProperty("--pd-grid", `${GRID * z}px`);
    el.stage.style.setProperty("--pd-gx", `${x}px`);
    el.stage.style.setProperty("--pd-gy", `${y}px`);
    el.stage.classList.toggle("is-lod", z < 0.75);
    el.zoomLabel.textContent = `${Math.round(z * 100)}%`;
    root.querySelector("[data-pd-zoom-out]").disabled = z <= ZMIN + 0.001;
    root.querySelector("[data-pd-zoom-in]").disabled = z >= ZMAX - 0.001;
    root.querySelector("[data-pd-zoom-out]").dataset.tooltipLabel = z <= ZMIN + 0.001 ? "Zoom minim: 50%" : "Micșorează (Ctrl −)";
    root.querySelector("[data-pd-zoom-in]").dataset.tooltipLabel = z >= ZMAX - 0.001 ? "Zoom maxim: 200%" : "Mărește (Ctrl +)";
    scheduleMinimap();
    if (!el.addMenu.hidden && S.addMenuAt) positionAddMenu();
  }
  const requestView = () => { if (!viewRaf) viewRaf = requestAnimationFrame(applyView); };
  /* pan is clamped: the content never leaves the screen entirely */
  function clampView() {
    const b = contentBounds();
    const z = S.view.z;
    const margin = 80;
    const minX = margin - (b.x + b.w) * z, maxX = stageRect.width - margin - b.x * z;
    const minY = margin - (b.y + b.h) * z, maxY = stageRect.height - margin - b.y * z;
    S.view.x = clamp(S.view.x, Math.min(minX, maxX), Math.max(minX, maxX));
    S.view.y = clamp(S.view.y, Math.min(minY, maxY), Math.max(minY, maxY));
  }
  function setZoom(z, at = null, { announceIt = true } = {}) {
    const nz = clamp(Math.round(z * 100) / 100, ZMIN, ZMAX);
    const px = at ? at.x : visibleArea().cx, py = at ? at.y : visibleArea().cy;
    const wx = (px - S.view.x) / S.view.z, wy = (py - S.view.y) / S.view.z;
    S.view.z = nz;
    S.view.x = px - wx * nz;
    S.view.y = py - wy * nz;
    clampView();
    requestView();
    if (announceIt) announceZoom();
  }
  let zoomAnnounce = 0;
  const announceZoom = () => { window.clearTimeout(zoomAnnounce); zoomAnnounce = window.setTimeout(() => announce(`Zoom ${Math.round(S.view.z * 100)}%.`), 400); };
  /* the part of the stage not covered by the floating cards (fit never hides content under a panel) */
  function visibleArea() {
    const pad = 16;
    let left = pad, right = stageRect.width - pad, top = pad, bottom = stageRect.height - pad;
    const r = (node) => { const b = node.getBoundingClientRect(); return { l: b.left - stageRect.left, r: b.right - stageRect.left, t: b.top - stageRect.top, b: b.bottom - stageRect.top, w: b.width }; };
    if (!el.palette.hidden && S.mode === "build") left = Math.max(left, r(el.palette).r + pad);
    if (S.trace && !traceCard.hidden && S.mode === "build" && stageRect.width >= 720) left = Math.max(left, r(traceCard).r + pad);
    if (!el.props.hidden && S.mode === "build" && stageRect.width >= 960) right = Math.min(right, r(el.props).l - pad);
    /* below 960 the properties are a bottom card: the area ends above it */
    if (!el.props.hidden && S.mode === "build" && stageRect.width < 960) bottom = Math.min(bottom, r(el.props).t - pad);
    if (!el.toolbar.hidden) bottom = Math.min(bottom, r(el.toolbar).t - pad);
    if (right - left < 240) { left = pad; right = stageRect.width - pad; }
    return { left, right, top, bottom, w: right - left, h: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  }
  function zoomTo(b, { maxZoom = 1, animate = true, align = "center" } = {}) {
    if (!b) return;
    const v = visibleArea();
    const z = clamp(Math.min(v.w / b.w, v.h / b.h, maxZoom), ZMIN, ZMAX);
    const fitsX = b.w * z <= v.w, fitsY = b.h * z <= v.h;
    const x = fitsX || align === "center" ? v.cx - (b.x + b.w / 2) * z : v.left - b.x * z;
    const y = fitsY || align === "center" ? v.cy - (b.y + b.h / 2) * z : v.top - b.y * z;
    animateView({ x, y, z }, animate);
  }
  function fit({ animate = true } = {}) {
    zoomTo(contentBounds(), { maxZoom: 1, animate, align: "start" });
    announceZoom();
  }
  let anim = 0;
  function animateView(to, animate = true) {
    cancelAnimationFrame(anim);
    if (!animate || reduceMotion()) { S.view = { ...to }; requestView(); return; }
    const from = { ...S.view };
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 220);
      const e = 1 - Math.pow(1 - k, 3);
      S.view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z + (to.z - from.z) * e };
      applyView();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  const toWorld = (cx, cy) => ({ x: (cx - stageRect.left - S.view.x) / S.view.z, y: (cy - stageRect.top - S.view.y) / S.view.z });
  function boundsOf(ids) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach((id) => { const s = S.byId.get(id); if (!s) return; const b = boxOf(s); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); });
    if (!Number.isFinite(minX)) return null;
    return { x: minX - 60, y: minY - 60, w: maxX - minX + 120, h: maxY - minY + 120 };
  }
  function edgeBounds(key) {
    const pts = routes.get(key);
    if (!pts) return null;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { x: Math.min(...xs) - 60, y: Math.min(...ys) - 60, w: Math.max(...xs) - Math.min(...xs) + 120, h: Math.max(...ys) - Math.min(...ys) + 120 };
  }

  /* ---- toolbar */
  root.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest("[data-pd-zoom-in]")) { setZoom(snapStep(S.view.z, 1)); return; }
    if (t.closest("[data-pd-zoom-out]")) { setZoom(snapStep(S.view.z, -1)); return; }
    const zoomTo100 = t.closest("[data-pd-zoom-to]");
    if (zoomTo100) { setZoom(Number(zoomTo100.dataset.pdZoomTo)); return; }
    if (t.closest("[data-pd-fit]")) { fit(); return; }
    if (t.closest("[data-pd-fit-selection]")) { fitSelection(); return; }
    if (t.closest("[data-pd-minimap-toggle]")) { toggleMinimap(); return; }
    if (t.closest("[data-pd-list-toggle]")) { if (!listForced()) setListView(!S.listView); return; }
    if (t.closest("[data-pd-autolayout]")) { autoLayout(); return; }
    if (t.closest("[data-pd-restore]")) { restoreVersion(); return; }
    const crumb = t.closest("[data-pd-crumb]");
    if (crumb) { event.preventDefault(); drillOut(Number(crumb.dataset.pdCrumb)); return; }
    if (t.closest("[data-pd-json-import]")) { if (!S.viewOnly) importInput.click(); return; }
    if (t.closest("[data-pd-panels-toggle]")) { togglePanels(); return; }
    const tool = t.closest("[data-pd-tool]");
    if (tool) { S.tool = tool.dataset.pdTool; renderChrome(); return; }
    if (t.closest("[data-pd-undo]")) { undo(); return; }
    if (t.closest("[data-pd-redo]")) { redo(); return; }
    if (t.closest("[data-pd-show-props]")) { S.rightOpen = true; renderChrome(); renderPanel(); el.props.querySelector("button, input")?.focus(); return; }
    if (t.closest("[data-pd-rail-toggle]")) { S.rail = !S.rail; writeUi(); renderPalette(); el.palette.querySelector("[data-pd-rail-toggle]")?.focus(); return; }
    if (t.closest("[data-pd-hide-props]")) { S.rightOpen = false; renderChrome(); el.showProps.focus(); announce("Proprietățile sunt ascunse."); return; }
  });
  el.toolbar.addEventListener("keydown", (event) => {
    const radio = event.target.closest("[data-pd-tool]");
    if (!radio || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    S.tool = S.tool === "select" ? "pan" : "select";
    renderChrome();
    el.toolbar.querySelector(`[data-pd-tool="${S.tool}"]`)?.focus();
  });
  const snapStep = (z, dir) => { const pct = Math.round(z * 100); const next = dir > 0 ? Math.floor(pct / 10) * 10 + 10 : Math.ceil(pct / 10) * 10 - 10; return next / 100; };
  function fitSelection() {
    const ids = [...S.sel.nodes];
    if (ids.length) zoomTo(boundsOf(ids), { maxZoom: 1.5 });
    else if (S.sel.edge) zoomTo(edgeBounds(S.sel.edge), { maxZoom: 1.5 });
    else fit();
  }
  function toggleMinimap() { S.minimap = !S.minimap; writeUi(); renderChrome(); scheduleMinimap(); announce(S.minimap ? "Harta este afișată." : "Harta este ascunsă."); }
  function togglePanels(which = "both") {
    if (which === "left") S.leftOpen = !S.leftOpen;
    else if (which === "right") S.rightOpen = !S.rightOpen;
    else { const show = !S.leftOpen && !S.rightOpen; S.leftOpen = show; S.rightOpen = show; }
    renderChrome();
    if (S.rightOpen) renderPanel();
    announce(S.leftOpen || S.rightOpen ? "Panourile sunt afișate." : "Panourile sunt ascunse. Ctrl + \\ le readuce.");
  }

  /* ---- minimap (canvas; redrawn on the next frame after a model / view change) */
  let mmRaf = 0;
  let mmScale = null;
  function scheduleMinimap() { if (!S.minimap || mmRaf || !S.def) return; mmRaf = requestAnimationFrame(drawMinimap); }
  const cssVar = (name, fallback) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  let mmColors = null;
  function drawMinimap() {
    mmRaf = 0;
    if (el.minimap.hidden) return;
    const c = el.minimapCanvas;
    const dpr = window.devicePixelRatio || 1;
    const W = 200, H = 136;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    mmColors = mmColors || {
      lane: cssVar("--color-background-base-secondary", "#f5f5f5"),
      line: cssVar("--color-border-base-default", "#d9d9d9"),
      node: cssVar("--color-border-base-secondary", "#b2b2b2"),
      start: cssVar("--color-border-positive-default", "#079455"),
      end: cssVar("--color-border-danger-default", "#d92d20"),
      decision: cssVar("--color-border-warning-default", "#dc6803"),
      brand: cssVar("--color-border-brand-default", "#0058d2"),
      brandFill: cssVar("--color-background-brand-secondary", "#e8f0fb"),
    };
    const b = contentBounds();
    const pad = 8;
    const k = Math.min((W - pad * 2) / b.w, (H - pad * 2) / b.h);
    const ox = pad + ((W - pad * 2) - b.w * k) / 2 - b.x * k, oy = pad + ((H - pad * 2) - b.h * k) / 2 - b.y * k;
    mmScale = { k, ox, oy };
    PM.lanesLayout(S.def).forEach((l, i) => {
      ctx.fillStyle = i % 2 ? "transparent" : mmColors.lane;
      ctx.fillRect(ox + (-RAIL) * k, oy + l.top * k, (poolWidth() + RAIL) * k, l.height * k);
      ctx.fillStyle = mmColors.line;
      ctx.fillRect(ox + (-RAIL) * k, oy + l.top * k, (poolWidth() + RAIL) * k, 1);
    });
    (S.def.states || []).forEach((s) => {
      const t = typeOf(s);
      const bx = boxOf(s);
      ctx.fillStyle = S.sel.nodes.has(s.id) ? mmColors.brand : t === "start" ? mmColors.start : t === "end" ? mmColors.end : t === "decision" ? mmColors.decision : mmColors.node;
      ctx.fillRect(ox + bx.x * k, oy + bx.y * k, Math.max(2, bx.w * k), Math.max(2, bx.h * k));
    });
    /* the visible area */
    const vx = (-S.view.x) / S.view.z, vy = (-S.view.y) / S.view.z;
    const vw = stageRect.width / S.view.z, vh = stageRect.height / S.view.z;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = mmColors.brandFill;
    ctx.fillRect(ox + vx * k, oy + vy * k, vw * k, vh * k);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = mmColors.brand;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + vx * k + 0.75, oy + vy * k + 0.75, vw * k - 1.5, vh * k - 1.5);
  }
  function minimapCenterAt(cx, cy) {
    if (!mmScale) return;
    const r = el.minimapCanvas.getBoundingClientRect();
    const wx = (cx - r.left - mmScale.ox) / mmScale.k, wy = (cy - r.top - mmScale.oy) / mmScale.k;
    S.view.x = stageRect.width / 2 - wx * S.view.z;
    S.view.y = stageRect.height / 2 - wy * S.view.z;
    clampView();
    requestView();
  }
  el.minimapCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    minimapCenterAt(event.clientX, event.clientY);
    const id = event.pointerId;
    try { el.minimapCanvas.setPointerCapture(id); } catch { /* gone */ }
    const move = (e) => minimapCenterAt(e.clientX, e.clientY);
    const stop = () => { el.minimapCanvas.removeEventListener("pointermove", move); el.minimapCanvas.removeEventListener("pointerup", stop); el.minimapCanvas.removeEventListener("pointercancel", stop); el.minimapCanvas.removeEventListener("lostpointercapture", stop); };
    el.minimapCanvas.addEventListener("pointermove", move);
    el.minimapCanvas.addEventListener("pointerup", stop);
    el.minimapCanvas.addEventListener("pointercancel", stop);
    el.minimapCanvas.addEventListener("lostpointercapture", stop);
  });
  el.minimapCanvas.addEventListener("keydown", (event) => {
    const dirs = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = dirs[event.key];
    if (!d) return;
    event.preventDefault();
    event.stopPropagation();
    S.view.x += d[0] * stageRect.width * 0.1;
    S.view.y += d[1] * stageRect.height * 0.1;
    clampView();
    requestView();
  });

  /* ---------------------------------------------------------------- selection */
  function selectNodes(ids, { add = false, toggle = false, focus = false } = {}) {
    if (!add && !toggle) S.sel.nodes = new Set();
    ids.forEach((id) => { if (toggle && S.sel.nodes.has(id)) S.sel.nodes.delete(id); else S.sel.nodes.add(id); });
    S.sel.edge = "";
    S.sel.lane = "";
    S.sel.pool = false;
    S.settings = false;
    S.typingKey = "";
    refreshSelectionClasses();
    renderChrome();
    renderPanel();
    scheduleMinimap();
    if (focus && ids.length === 1) nodeEls.get(ids[0])?.focus({ preventScroll: true });
    if (ids.length === 1 && window.innerWidth < 960) requestAnimationFrame(() => ensureVisible(ids[0]));
  }
  function selectEdge(key) {
    S.sel = { nodes: new Set(), edge: key, lane: "" };
    S.settings = false;
    S.typingKey = "";
    refreshSelectionClasses();
    renderChrome();
    renderPanel();
  }
  function selectLane(id) {
    S.sel = { nodes: new Set(), edge: "", lane: id };
    S.settings = false;
    S.typingKey = "";
    refreshSelectionClasses();
    renderChrome();
    renderPanel();
  }
  function selectPool() {
    S.sel = { nodes: new Set(), edge: "", lane: "", pool: true };
    S.settings = false;
    S.typingKey = "";
    S.rightOpen = true;
    refreshSelectionClasses();
    renderChrome();
    renderPanel();
  }
  function clearSelection() {
    if (!S.sel.nodes.size && !S.sel.edge && !S.sel.lane && !S.sel.pool) return;
    S.sel = { nodes: new Set(), edge: "", lane: "" };
    refreshSelectionClasses();
    renderChrome();
    renderPanel();
    scheduleMinimap();
    announce("Nimic selectat.");
  }

  /* ---------------------------------------------------------------- properties panel (right card) */
  const pid = (prop) => `pd-p-${prop.replace(/[^a-z0-9]+/gi, "-")}`;
  const errorHtml = (message) => `<span class="message message--inline message--error e-permits-fo-field__error">${icon("circle-error-filled")}<span>${esc(message)}</span></span>`;
  function fieldWrap({ id, label, control, required = false, hint = "", error = "" }) {
    return `
      <div class="e-permits-fo-field e-permits-user-create__field">
        ${label ? `<label for="${id}">${esc(label)}${required ? reqMark() : ""}</label>` : ""}
        ${control}
        ${error ? errorHtml(error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${hint}</p>` : ""}
      </div>`;
  }
  const ro = () => S.viewOnly;
  function inputField({ prop, label, value, required = false, hint = "", error = "", placeholder = "", readonly = false, numeric = false }) {
    const id = pid(prop);
    const lock = readonly || ro();
    return fieldWrap({ id, label, required, hint, error, control: `
      <div class="e-permits-fo-input${lock ? " is-filled is-readonly" : ""}${error ? " is-error" : ""}">
        <input id="${id}" type="text"${numeric ? ' inputmode="numeric"' : ""} value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" autocomplete="off"${lock ? " readonly" : ""}${hint && !error ? ` aria-describedby="${id}-hint"` : ""}${error ? ' aria-invalid="true"' : ""} data-pd-prop="${prop}">
      </div>` });
  }
  function textareaField({ prop, label, value, required = false, hint = "", error = "", rows = 2, placeholder = "" }) {
    const id = pid(prop);
    return fieldWrap({ id, label, required, hint, error, control: `
      <div class="e-permits-fo-textarea${ro() ? " is-readonly" : ""}${error ? " is-error" : ""}">
        <textarea id="${id}" rows="${rows}" placeholder="${esc(placeholder)}"${ro() ? " readonly" : ""}${error ? ' aria-invalid="true"' : ""} data-pd-prop="${prop}">${esc(value ?? "")}</textarea>
      </div>` });
  }
  function selectField({ prop, label, value, options, required = false, hint = "", error = "", placeholder = "" }) {
    const id = pid(prop);
    if (ro()) {
      const text = (options.find(([v]) => String(v) === String(value ?? "")) || [, placeholder || "—"])[1];
      return inputField({ prop, label, value: text, required, hint, readonly: true });
    }
    const optionsHtml = `${placeholder ? `<option value="" disabled${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value ?? "") ? " selected" : ""}>${esc(text)}</option>`).join("")}`;
    const control = ui().renderFoSelectControl?.({ id, attrs: `data-pd-prop="${prop}"`, optionsHtml, error: Boolean(error) }) || "";
    return fieldWrap({ id, label, required, hint, error, control });
  }
  const group = (title, body) => `
    <section class="e-permits-user-create__section e-permits-builder__group">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${body}</div>
    </section>`;
  const gridHtml = (body) => `<div class="e-permits-user-create__grid e-permits-builder__panel-grid">${body}</div>`;
  const facts = (rows) => `<dl class="e-permits-builder__facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  const copyId = (value) => {
    const R = window.GEAPFormRender;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field">
        <span class="e-permits-pd__label" id="pd-id-label">Identificator</span>
        <div class="e-permits-pd__copy">${R?.copyValueHtml?.(value, { ariaLabel: `Copiază identificatorul ${value}` }) || esc(value)}</div>
      </div>`;
  };
  const propError = (id, prop) => (S.issues.find((i) => i.id === id && i.prop === prop && i.level === "error") || {}).message || "";
  function panelHead({ title, chip = "", menu = "", subtitle = "" }) {
    return `
      <div class="e-permits-builder__panel-head e-permits-builder__panel-head--selected e-permits-pd__panel-head">
        <div class="e-permits-builder__panel-title-row">
          <h2 id="pd-panel-title" data-cell-tooltip="${esc(title)}">${esc(title)}</h2>
          <span class="e-permits-pd__head-tools">
            ${menu}
            ${tbButton("data-pd-hide-props", "sidebar", "Ascunde proprietățile", "]")}
          </span>
        </div>
        ${chip || subtitle ? `<div class="e-permits-builder__panel-meta">${chip}${subtitle ? `<span>${esc(subtitle)}</span>` : ""}</div>` : ""}
      </div>`;
  }
  /* ---- panel tabs (FB `.tabs--sm`; a tab with an error carries the FB red dot) */
  function tabsHtml(list, active, issues = []) {
    return `
      <div class="tabs tabs--sm e-permits-builder__tabs">
        <div class="tab-buttons" role="tablist" aria-label="Proprietăți">
          ${list.map((tab) => {
            const on = tab === active;
            const bad = issues.some((i) => i.level === "error" && (i.tab || "general") === tab);
            return `<button class="tab-button${on ? " active" : ""}" id="pd-tab-${tab}" type="button" role="tab" aria-selected="${on}" aria-controls="pd-tabpanel" tabindex="${on ? "0" : "-1"}" data-pd-tab="${tab}"><span>${TAB_LABEL[tab]}</span>${bad ? '<span class="e-permits-ntpl-dot e-permits-tariff__tab-error" aria-label="conține erori"></span>' : ""}</button>`;
          }).join("")}
        </div>
      </div>`;
  }
  const tabPanel = (tab, body, extra = "") => `
    <div class="e-permits-builder__panel-scroll e-permits-pd__panel-scroll" id="pd-tabpanel" role="tabpanel" aria-labelledby="pd-tab-${tab}" data-pd-panel-scroll>
      ${extra}${body}
    </div>`;
  function renderPanel() {
    if (el.props.hidden) return;
    const active = document.activeElement;
    const focusId = el.props.contains(active) ? active.id : "";
    const caret = focusId && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null;
    const scroller = el.props.querySelector("[data-pd-panel-scroll]");
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const key = `${S.settings}:${[...S.sel.nodes].join(",")}:${S.sel.edge}:${S.sel.lane}:${S.sel.pool}:${S.tab}`;
    const sameKey = el.props.dataset.pdFor === key;
    let html = "";
    if (S.settings) html = processPanel();
    else if (S.sel.edge) html = edgePanel(edgeOf(S.sel.edge));
    else if (S.sel.lane) html = lanePanel(laneById(S.sel.lane));
    else if (S.sel.pool) html = poolPanel();
    else if (S.sel.nodes.size === 1) html = nodePanel(S.byId.get([...S.sel.nodes][0]));
    else if (S.sel.nodes.size > 1) html = multiPanel();
    else html = emptyPanel();
    el.props.innerHTML = html;
    el.props.dataset.pdFor = key;
    el.props.classList.toggle("is-compact", !S.settings && !S.sel.edge && !S.sel.lane && !S.sel.pool && !S.sel.nodes.size);
    const next = el.props.querySelector("[data-pd-panel-scroll]");
    if (next && sameKey) next.scrollTop = scrollTop;
    if (focusId) {
      const target = el.props.querySelector(`#${CSS.escape(focusId)}`);
      if (target) {
        target.focus({ preventScroll: true });
        if (caret && typeof target.setSelectionRange === "function") { try { target.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
      }
    }
  }
  function emptyPanel() {
    const states = (S.def.states || []).length;
    const edges = allEdges().length;
    const lanes = (S.def.lanes || []).length;
    const errors = S.issues.filter((i) => i.level === "error").length;
    return `
      ${panelHead({ title: "Proprietăți" })}
      <div class="e-permits-builder__panel-scroll e-permits-pd__panel-scroll" data-pd-panel-scroll>
        ${window.GEAPEmptyState?.render({ title: "Nimic selectat", text: S.viewOnly ? "Selectează un element ca să-i vezi proprietățile și drumul." : "Selectează un element ca să-i vezi proprietățile.", icon: "direction", compact: true, bare: true }) || ""}
        ${facts([["Elemente", String(states)], ["Conexiuni", String(edges)], ["Benzi", String(lanes)], ["Probleme", errors ? `<button class="link link-primary link-sm e-permits-pd__link" type="button" data-pd-open-issues>${errors} ${errors === 1 ? "eroare" : "erori"}</button>` : "Fără erori"]])}
      </div>`;
  }
  /* several nodes: align / distribute (spec E.3, batch 4), duplicate, delete */
  function multiPanel() {
    const n = S.sel.nodes.size;
    const btn = (act, label, iconId = "") => `<button class="btn btn-neutral btn-sm" type="button" data-pd-act="${act}">${iconId ? icon(iconId, 20) : ""}<span>${label}</span></button>`;
    return `
      ${panelHead({ title: `${n} elemente selectate` })}
      <div class="e-permits-builder__panel-scroll e-permits-pd__panel-scroll" data-pd-panel-scroll>
        ${S.viewOnly ? "" : group("Aliniază", `
          <div class="e-permits-builder__inline-actions" role="group" aria-label="Aliniază pe orizontală">${btn("align-left", "Stânga")}${btn("align-center", "Centru")}${btn("align-right", "Dreapta")}</div>
          <div class="e-permits-builder__inline-actions" role="group" aria-label="Aliniază pe verticală">${btn("align-top", "Sus")}${btn("align-middle", "Mijloc")}${btn("align-bottom", "Jos")}</div>
          ${n > 2 ? `<div class="e-permits-builder__inline-actions" role="group" aria-label="Distribuie">${btn("distribute-h", "Distribuie orizontal")}${btn("distribute-v", "Distribuie vertical")}</div>` : '<p class="e-permits-fo-field__hint">Distribuirea cere cel puțin trei elemente.</p>'}
        `)}
        ${group("Elemente", facts([...S.sel.nodes].slice(0, 12).map((id) => { const s = S.byId.get(id); return [TYPE_LABEL[typeOf(s)], esc(nameOf(s))]; })))}
        ${S.viewOnly ? "" : `<div class="e-permits-pd__panel-actions">${btn("duplicate", "Duplică", "copy")}<button class="btn btn-text-destructive btn-sm" type="button" data-pd-delete-selection>${icon("delete", 20)}<span>Șterge selecția</span></button></div>`}
      </div>`;
  }
  const laneOptions = () => (S.def.lanes || []).map((l) => [l.id, String(l.title || l.id).trim()]);
  /* the elements a connection may lead to (never Start), in flow order */
  const targetOptions = (src) => flowOrder().map((id) => S.byId.get(id)).filter((s) => s && s !== src && typeOf(s) !== "start").map((s) => [s.id, `${nameOf(s)} · ${TYPE_LABEL[typeOf(s)]}`]);
  /* a select inside a builder row (no label of its own: aria-label) */
  const bareSelect = ({ id, prop, placeholder = "", options, value, error = false, label = "", disabled = false }) => ui().renderFoSelectControl?.({ id, label, error, disabled, attrs: `data-pd-prop="${prop}"`, optionsHtml: `
    ${placeholder ? `<option value="" disabled${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}
    ${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value ?? "") ? " selected" : ""}>${esc(text)}</option>`).join("")}` }) || "";
  /* library segmented control (FB `segmented()`): role=radiogroup, radios with aria-checked */
  function segmentedField({ prop, label, value, options, hint = "" }) {
    const id = pid(prop);
    if (ro()) return inputField({ prop, label, value: (options.find(([v]) => String(v) === String(value)) || [, "—"])[1], readonly: true });
    return `
      <div class="e-permits-fo-field e-permits-user-create__field">
        <span class="e-permits-pd__label" id="${id}-label">${esc(label)}</span>
        <div class="segmented-control" role="radiogroup" aria-labelledby="${id}-label">
          ${options.map(([v, text]) => `<button class="segment-item${String(v) === String(value) ? " is-selected" : ""}" type="button" role="radio" aria-checked="${String(v) === String(value)}" tabindex="${String(v) === String(value) ? "0" : "-1"}" data-pd-seg="${prop}" data-value="${esc(v)}">${esc(text)}</button>`).join("")}
        </div>
        ${hint ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
      </div>`;
  }
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  const addButton = (attrs, label, tone = "secondary") => S.viewOnly ? "" : `<button class="btn btn-${tone} btn-sm" type="button" ${attrs}>${icon("plus-small", 20)}<span>${esc(label)}</span></button>`;
  /* a card's ⋮ (Mută sus / jos, Șterge) — the panel's stack menu */
  const rowMenu = (kind, i, count, label) => S.viewOnly ? "" : ui().renderStackMenu?.([
    { label: "Mută sus", icon: "arrow-up", attrs: `data-pd-act="${kind}-up" data-i="${i}"${i === 0 ? ' aria-disabled="true" data-tooltip-reason="Este primul."' : ""}` },
    { label: "Mută jos", icon: "arrow-down", attrs: `data-pd-act="${kind}-down" data-i="${i}"${i === count - 1 ? ' aria-disabled="true" data-tooltip-reason="Este ultimul."' : ""}` },
    { label: "Selectează conexiunea", icon: "arrow-right", attrs: `data-pd-act="${kind}-select" data-i="${i}"` },
    { label: "Șterge", icon: "delete", danger: true, attrs: `data-pd-act="${kind}-delete" data-i="${i}"` },
  ], label) || "";
  const issueAt = (id, prop) => (S.issues.find((i) => i.id === id && i.prop === prop && i.level === "error") || {}).message || "";
  const issueLike = (id, prefix) => S.issues.filter((i) => i.id === id && String(i.prop || "").startsWith(prefix));

  function nodePanel(s) {
    if (!s) return emptyPanel();
    const t = typeOf(s);
    const list = TABS[t] || ["general"];
    if (!list.includes(S.tab)) S.tab = "general";
    const fixed = t === "start" || t === "end";
    const menu = S.viewOnly ? "" : ui().renderStackMenu?.([
      ...(t === "subprocess" ? [{ label: "Deschide sub-procesul", icon: "external-link", attrs: `data-pd-act="open-sub" data-id="${esc(s.id)}"${s.properties?.processRef ? "" : ' aria-disabled="true" data-tooltip-reason="Alege întâi procesul apelat."'}` }] : []),
      { label: "Continuă cu…", icon: "plus-small", attrs: `data-pd-act="continue" data-id="${esc(s.id)}"${t === "end" ? " disabled" : ""}` },
      { label: "Centrează pe diagramă", icon: "scan", attrs: `data-pd-act="center" data-id="${esc(s.id)}"` },
      ...(fixed ? [] : [{ label: "Duplică", icon: "copy", attrs: `data-pd-act="duplicate" data-id="${esc(s.id)}"` }]),
      { label: "Șterge", icon: "delete", danger: true, attrs: `data-pd-act="delete" data-id="${esc(s.id)}"${fixed ? ` aria-disabled="true" data-tooltip-reason="${t === "start" ? "Startul procesului nu se poate șterge." : "Sfârșitul procesului nu se poate șterge."}"` : ""}` },
    ], nameOf(s)) || "";
    const kindTag = tag(TYPE_LABEL[t], t === "decision" ? "warning" : t === "start" ? "success" : t === "end" ? "danger" : "neutral");
    const lane = laneById(s.properties?.laneId);
    const issues = issuesOf(s.id);
    const body = S.tab === "actions" ? actionsTab(s)
      : S.tab === "exits" ? exitsTab(s)
      : S.tab === "roles" ? rolesTab(s)
      : S.tab === "terms" ? termsTab(s)
      : S.tab === "processor" ? processorTab(s)
      : S.tab === "advanced" ? advancedTab(s)
      : generalTab(s);
    /* the tab's own issues that are not shown next to a field */
    const shown = issues.filter((i) => (i.tab || "general") === S.tab && !["title", "processRef", "templateCodes", "auditCode", "momentId", "roles", "id"].includes(i.prop) && !String(i.prop || "").match(/^(exit|action|term)\./));
    return `
      ${panelHead({ title: nameOf(s), chip: kindTag, menu, subtitle: lane ? String(lane.title || "").trim() : "" })}
      ${tabsHtml(list, S.tab, issues)}
      ${tabPanel(S.tab, body, shown.length ? `<div class="e-permits-pd__panel-issues" data-pd-panel-errors>${shown.map((i) => ui().renderNotice?.(i.level === "error" ? "error" : "warning", esc(i.message)) || "").join("")}</div>` : "")}`;
  }

  /* ---- General */
  function generalTab(s) {
    const t = typeOf(s);
    const p = s.properties || {};
    const err = (prop) => propError(s.id, prop);
    const status = (s.fieldAssignments || []).find((f) => f.name === "StatusId")?.value || "";
    const lane = laneById(p.laneId);
    if (t === "start" || t === "end") {
      return group("Identificare", gridHtml(`
        ${copyId(s.id)}
        ${inputField({ prop: "title", label: "Denumire", value: s.title, required: true, error: err("title") })}
        ${textareaField({ prop: "description", label: "Descriere", value: s.description || "", hint: "Apare doar în designer și în documentație." })}
        ${t === "end" ? selectField({ prop: "status", label: "Starea dosarului la sfârșit", value: status, options: STATUSES, hint: "Câmpul StatusId primește această valoare." }) : ""}
      `));
    }
    if (t === "activity") {
      return group("Identificare", gridHtml(`
        ${copyId(s.id)}
        ${inputField({ prop: "title", label: "Denumire", value: s.title, required: true, error: err("title") })}
        ${textareaField({ prop: "description", label: "Descriere", value: s.description || "" })}
      `)) + group("Pas uman", gridHtml(`
        ${selectField({ prop: "laneId", label: "Bandă", value: p.laneId, options: laneOptions(), hint: lane ? `Rolul benzii: ${esc(roleName(lane.role))}. Schimbarea mută pasul în bandă.` : "" })}
        ${selectField({ prop: "visualComponent", label: "Componentă vizuală", value: p.visualComponent || "", options: VISUAL, hint: "Ecranul din Back Office deschis la acest pas." })}
        ${selectField({ prop: "status", label: "Starea dosarului", value: status, options: STATUSES })}
      `)) + group("Acțiuni", actionsList(s, "actions"));
    }
    if (t === "decision") {
      return group("Identificare", gridHtml(`
        ${copyId(s.id)}
        ${textareaField({ prop: "title", label: "Întrebare / Condiție", value: s.title, required: true, error: err("title"), rows: 2 })}
        ${textareaField({ prop: "description", label: "Descriere", value: s.description || "" })}
        ${selectField({ prop: "laneId", label: "Bandă", value: p.laneId, options: laneOptions() })}
      `)) + group("Ieșiri", actionsList(s, "exits"));
    }
    if (t === "event") {
      return group("Identificare", gridHtml(`
        ${eventIdField(s)}
        ${inputField({ prop: "title", label: "Denumire", value: s.title, required: true, error: err("title") })}
        ${S.viewOnly ? "" : ui().renderToggle?.({ label: "Afișează denumirea pe diagramă", description: "Altfel apare la trecerea cu mouse-ul.", checked: Boolean(p.showName), attrs: 'data-pd-prop="showName"' }) || ""}
        ${textareaField({ prop: "description", label: "Descriere", value: s.description || "" })}
        ${selectField({ prop: "laneId", label: "Bandă", value: p.laneId, options: laneOptions(), required: true })}
      `)) + group("Ieșiri", actionsList(s, "processor"));
    }
    /* sub-process (US-52 AC-01: Proces apelat, Deschide, Creează sub-proces nou) */
    const procs = S.db.processes.filter((pr) => pr.name !== S.def.name).map((pr) => [pr.name, `${pr.title} · v${pr.version}${pr.status === "Publicat" ? "" : " · Schiță"}`]);
    const ref = recordById(p.processRef || "");
    return group("Identificare", gridHtml(`
      ${copyId(s.id)}
      ${inputField({ prop: "title", label: "Denumire", value: s.title, required: true, error: err("title") })}
      ${textareaField({ prop: "description", label: "Descriere", value: s.description || "" })}
      ${selectField({ prop: "laneId", label: "Bandă", value: p.laneId, options: laneOptions() })}
    `)) + group("Proces apelat", gridHtml(`
      ${selectField({ prop: "processRef", label: "Proces apelat", value: p.processRef || "", options: procs, required: true, placeholder: "Alege procesul", error: err("processRef"), hint: ref ? `${ref.status === "Publicat" ? "Publicat" : "Schiță — se publică înaintea procesului care îl apelează"} · v${esc(ref.version)}` : "" })}
      <div class="e-permits-builder__inline-actions">
        <button class="btn btn-secondary btn-sm" type="button" data-pd-act="open-sub" data-id="${esc(s.id)}"${ref ? "" : ' aria-disabled="true" data-tooltip-reason="Alege întâi procesul apelat."'}>${icon("external-link", 20)}<span>Deschide sub-procesul</span></button>
        ${S.viewOnly ? "" : `<button class="btn btn-text-primary btn-sm" type="button" data-pd-act="new-sub" data-id="${esc(s.id)}">${icon("plus-small", 20)}<span>Creează sub-proces nou</span></button>`}
      </div>
    `)) + group("Ieșiri", actionsList(s, "general"));
  }
  /* Id of an event: editable, unique (US-188 AC-02) */
  function eventIdField(s) {
    if (S.viewOnly) return copyId(s.id);
    const err = S.idError && S.idError.node === s.id ? S.idError.message : "";
    return inputField({ prop: "id", label: "Identificator", value: S.idError && S.idError.node === s.id ? S.idError.value : s.id, required: true, error: err, hint: "Litere latine, cifre și „_”, unic în proces." });
  }
  /* the outgoing connections in General (a row selects the connection) */
  function actionsList(s, editTab) {
    const outs = s.transitions || [];
    const t = typeOf(s);
    if (!outs.length) return window.GEAPEmptyState?.render({ title: "Nicio ieșire", text: S.viewOnly ? "Elementul nu duce mai departe." : "Trage din punctul albastru al elementului sau folosește „Continuă cu”.", icon: "arrow-right", compact: true, bare: true }) || "";
    return `
      <ol class="e-permits-builder__step-list e-permits-pd__actions">
        ${outs.map((tr, i) => {
          const tgt = S.byId.get(tr.target);
          const key = edgeKey(s.id, i);
          const bad = errorsOf(key).length > 0 || !tgt;
          const label = t === "event" ? (tr.event === "failed" ? "Eșec" : "Succes") : edgeLabel(s, tr) || "Continuă";
          return `
          <li>
            <button class="e-permits-builder__step-row${bad ? " has-error" : ""}" type="button" data-pd-select-edge="${esc(key)}" aria-label="${esc(`${label} → ${tgt ? nameOf(tgt) : "fără țintă"}${tr.formName ? `, formular ${tr.formName}` : ""}${bad ? ", are erori" : ""}`)}">
              <span class="e-permits-builder__step-badge">${i + 1}</span>
              <span class="e-permits-pd__action-text"><strong>${esc(label)}</strong> → ${tgt ? esc(nameOf(tgt)) : "fără țintă"}</span>
              <span class="e-permits-builder__step-row-meta">${bad ? `${icon("circle-error-filled", 16)}Eroare` : tr.formName ? esc(tr.formName) : ""}</span>
            </button>
          </li>`;
        }).join("")}
      </ol>
      ${editTab !== "general" && editTab !== "processor" && !S.viewOnly ? `<div><button class="btn btn-neutral btn-sm" type="button" data-pd-tab-go="${editTab}">${icon("edit", 16)}<span>${editTab === "exits" ? "Editează ieșirile" : "Editează acțiunile"}</span></button></div>` : ""}`;
  }

  /* ---- Acțiuni (activity): one card per outgoing connection = what US-222 lists per step */
  function actionsTab(s) {
    const outs = s.transitions || [];
    const forms = CAT.forms;
    const cards = outs.map((tr, i) => {
      const err = (p) => issueAt(s.id, `action.${i}.${p}`) || (p === "target" && (!tr.target || !S.byId.get(tr.target)) ? "Alege elementul la care duce acțiunea." : "") || (p === "event" && outs.length > 1 && !String(tr.event || "").trim() ? "Eticheta e obligatorie când pasul are mai multe acțiuni." : "");
      const warn = issueLike(s.id, `action.${i}.formName`)[0];
      const formOpts = [["", "Fără formular"], ...forms.map((f) => [f, f]), ...(tr.formName && !forms.includes(tr.formName) ? [[tr.formName, `${tr.formName} (inexistent)`]] : [])];
      return `
        <div class="e-permits-doc-rule e-permits-pd__card-block" data-pd-action-card="${i}">
          <div class="e-permits-doc-rule__head">
            <span class="e-permits-doc-rule__target"><strong class="e-permits-pd-card-title">Acțiunea ${i + 1}</strong></span>
            ${rowMenu("action", i, outs.length, `Acțiunea ${i + 1}`)}
          </div>
          ${gridHtml(`
            ${inputField({ prop: `action.${i}.event`, label: "Etichetă", value: tr.event === "next" ? "" : tr.event || "", placeholder: "Continuă", required: outs.length > 1, error: err("event"), hint: outs.length > 1 ? "" : "Fără etichetă, acțiunea se numește „Continuă”." })}
            ${selectField({ prop: `action.${i}.target`, label: "Duce la", value: tr.target || "", options: targetOptions(s), placeholder: "Alege elementul", required: true, error: err("target") })}
            ${selectField({ prop: `action.${i}.formName`, label: "Formular", value: tr.formName || "", options: formOpts, hint: warn ? `<span class="e-permits-pd__warn">${esc(warn.message)}</span>` : "Formularul de proces deschis de această acțiune (US-222: tipul de solicitare îl poate înlocui)." })}
          `)}
        </div>`;
    }).join("");
    return group("Acțiunile pasului", `
      <p class="e-permits-fo-field__hint">Fiecare acțiune e o conexiune care pleacă din pas. Tipul de solicitare le listează în „Formularele acțiunilor”.</p>
      ${outs.length ? `<div class="e-permits-doc-rules">${cards}</div>` : window.GEAPEmptyState?.render({ title: "Nicio acțiune", text: "Adaugă o acțiune sau trage o conexiune din pas.", icon: "arrow-right", compact: true, bare: true }) || ""}
      <div class="e-permits-builder__inline-actions">${addButton('data-pd-act="action-add"', "Adaugă acțiune")}</div>`);
  }

  /* ---- Ieșiri (decision): label · target · condition builder (the US-225 rule builder markup) */
  function fieldChoices() {
    const vars = Object.keys(S.def.variables || {}).map((v) => [v, `${v} · ${contextLabel(v)}`]);
    return [...vars, ...PM.CASE_FIELDS.map(([v, label]) => [v, `${v} · ${label}`])];
  }
  function conditionRow(i, gi, ci, cnd, count) {
    const k = `exit.${i}.cond.${gi}.${ci}`;
    const kind = cnd.sourceField ? PM.fieldKind(S.def, cnd.sourceField) : "";
    const ops = (kind === "bool" ? PM.BOOL_OPS : kind === "value" ? PM.VALUE_OPS : []).map((op) => [op, (PM.OPERATORS.find(([o]) => o === op) || [, op])[1]]);
    const needsValue = Boolean(cnd.operator) && PM.VALUE_OPS.includes(cnd.operator);
    const id = [...S.sel.nodes][0] || "";
    const fieldOpts = fieldChoices();
    if (cnd.sourceField && !fieldOpts.some(([v]) => v === cnd.sourceField)) fieldOpts.push([cnd.sourceField, `${cnd.sourceField} (nedeclarată)`]);
    const value = !cnd.operator ? `<div class="e-permits-doc-val is-empty" aria-hidden="true"><span>Valoare</span></div>`
      : !needsValue ? `<div class="e-permits-doc-val is-empty"><span>Fără valoare</span></div>`
      : `<div class="e-permits-doc-val${issueAt(id, `${k}.value`) ? " is-error" : ""}"><div class="e-permits-doc-val__control"><input id="${pid(`${k}.value`)}" class="e-permits-doc-val__input" type="text" value="${esc(cnd.value ?? "")}" placeholder="${cnd.operator === "in" ? "Ex. 1, 2" : "Ex. 2"}" aria-label="Valoare" autocomplete="off"${S.viewOnly ? " readonly" : ""} data-pd-prop="${k}.value"></div></div>`;
    return `
      <li class="e-permits-doc-cond" data-pd-cond="${k}">
        <div class="e-permits-doc-cond__cell">${S.viewOnly ? `<span class="e-permits-pd__ro">${esc(cnd.sourceField || "—")}</span>` : bareSelect({ id: pid(`${k}.field`), prop: `${k}.field`, placeholder: "Câmp", options: fieldOpts, value: cnd.sourceField, error: Boolean(issueAt(id, `${k}.field`)), label: "Câmp" })}</div>
        <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${S.viewOnly ? `<span class="e-permits-pd__ro">${esc((PM.OPERATORS.find(([o]) => o === cnd.operator) || [, "—"])[1])}</span>` : bareSelect({ id: pid(`${k}.op`), prop: `${k}.op`, placeholder: "Operator", options: ops, value: cnd.operator, error: Boolean(issueAt(id, `${k}.op`)), disabled: !kind, label: "Operator" })}</div>
        <div class="e-permits-doc-cond__cell">${value}</div>
        ${count > 1 && !S.viewOnly
          ? `<button class="btn btn-text-destructive btn-sm btn-icon-only e-permits-doc-cond__remove" type="button" aria-label="Elimină condiția" data-tooltip-label="Elimină condiția" data-pd-act="cond-remove" data-k="${i}.${gi}.${ci}">${icon("delete", 16)}</button>`
          : `<span class="e-permits-doc-cond__remove" aria-hidden="true"></span>`}
      </li>`;
  }
  function exitsTab(s) {
    const outs = s.transitions || [];
    const id = s.id;
    const cards = outs.map((tr, i) => {
      const isDefault = !tr.guard;
      const groups = tr.guard?.groups || [];
      const total = groups.reduce((n, g) => n + (g.conditions || []).length, 0);
      const condHtml = isDefault ? "" : `
        <div class="e-permits-doc-rule__when">${kw("Când")}</div>
        <ol class="e-permits-doc-rule__conds" role="list">${groups.map((g, gi) => `${gi ? `<li class="e-permits-doc-cond__join">${kw("sau")}</li>` : ""}${(g.conditions || []).map((cnd, ci) => `${ci ? `<li class="e-permits-doc-cond__join">${kw("și")}</li>` : ""}${conditionRow(i, gi, ci, cnd, total)}`).join("")}`).join("")}</ol>
        ${S.viewOnly ? "" : `<div class="e-permits-doc-rule__foot e-permits-builder__inline-actions"><button class="btn btn-text-primary btn-sm" type="button" data-pd-act="cond-add" data-i="${i}">${icon("plus-small", 20)}<span>Condiție („și”)</span></button><button class="btn btn-text-primary btn-sm" type="button" data-pd-act="group-add" data-i="${i}">${icon("plus-small", 20)}<span>Grup („sau”)</span></button></div>`}`;
      return `
        <div class="e-permits-doc-rule e-permits-pd__card-block" data-pd-exit-card="${i}">
          <div class="e-permits-doc-rule__head">
            <span class="e-permits-doc-rule__target"><strong class="e-permits-pd-card-title">Ieșirea ${i + 1}</strong>${isDefault ? tag("Implicită", "neutral") : ""}</span>
            ${rowMenu("exit", i, outs.length, `Ieșirea ${i + 1}`)}
          </div>
          ${gridHtml(`
            ${inputField({ prop: `exit.${i}.event`, label: "Etichetă", value: tr.event === "next" ? "" : tr.event || "", placeholder: "De ex. Da", required: true, error: issueAt(id, `exit.${i}.event`) })}
            ${selectField({ prop: `exit.${i}.target`, label: "Duce la", value: tr.target || "", options: targetOptions(s), placeholder: "Alege elementul", required: true, error: !tr.target || !S.byId.get(tr.target) ? "O ieșire a Deciziei nu are element-țintă asociat." : "" })}
          `)}
          ${S.viewOnly ? (isDefault ? '<p class="e-permits-fo-field__hint">Ramura implicită: urmată când nicio altă condiție nu e îndeplinită.</p>' : "") : ui().renderCheckOption?.({ label: "Ramura implicită (când nicio condiție nu e îndeplinită)", checked: isDefault, attrs: `data-pd-prop="exit.${i}.default"` }) || ""}
          ${condHtml}
        </div>`;
    }).join("");
    const defaults = outs.filter((tr) => !tr.guard).length;
    return `
      ${group("Ieșiri", `
        <p class="e-permits-fo-field__hint">Decizia se evaluează automat de sistem; prima ieșire a cărei condiție e adevărată este urmată ${tag("Ordinea: de confirmat cu PO", "warning")}</p>
        ${outs.length ? `<div class="e-permits-doc-rules">${cards}</div>` : ""}
        ${S.viewOnly ? "" : `<div class="e-permits-builder__inline-actions">
          ${addButton('data-pd-act="exit-add"', "Adaugă ieșire")}
          ${outs.length === 2 ? '<button class="btn btn-neutral btn-sm" type="button" data-pd-act="exit-preset">Folosește Da / Nu</button>' : outs.length < 2 ? '<button class="btn btn-neutral btn-sm" type="button" data-pd-act="exit-preset">Creează Da / Nu</button>' : ""}
        </div>`}
        <p class="e-permits-fo-field__hint">${outs.length} ${outs.length === 1 ? "ieșire" : "ieșiri"} · ${defaults === 1 ? "o ramură implicită" : defaults ? `${defaults} ramuri implicite` : "fără ramură implicită"}</p>
      `)}`;
  }

  /* ---- Roluri: the lane's role + own roles (own override the lane; US-50 E5) */
  function rolesTab(s) {
    const lane = laneById(s.properties?.laneId);
    const own = s.roles || [];
    const err = propError(s.id, "roles");
    const options = ROLES.filter(([v]) => v);
    return group("Roluri", `
      ${facts([["Rol din bandă", lane ? `${esc(roleName(lane.role))} · banda ${esc(String(lane.title || "").trim())}` : "Fără bandă"]])}
      <div class="e-permits-fo-field e-permits-user-create__field${err ? " is-error" : ""}">
        <span class="e-permits-pd__label" id="pd-roles-label">Roluri proprii</span>
        <p class="e-permits-fo-field__hint">Rolurile proprii înlocuiesc rolul benzii pentru acest pas.</p>
        <div class="e-permits-check-options e-permits-pd__checks" role="group" aria-labelledby="pd-roles-label">
          ${options.map(([v, label], i) => ui().renderCheckOption?.({ label, plain: true, checked: own.includes(v), disabled: S.viewOnly, attrs: `value="${esc(v)}" data-pd-prop="roles"${i ? "" : ` id="${pid("roles")}"`}` }) || "").join("")}
          ${own.filter((v) => !options.some(([o]) => o === v)).map((v) => ui().renderCheckOption?.({ label: `Rol necunoscut (${v.slice(0, 8)}…)`, plain: true, checked: true, disabled: S.viewOnly, attrs: `value="${esc(v)}" data-pd-prop="roles"` }) || "").join("")}
        </div>
        ${err ? errorHtml(err) : ""}
      </div>`);
  }

  /* ---- Termene (properties.terms; no story yet — PO-pending, kept as in the export) */
  function termsTab(s) {
    const terms = s.properties?.terms || [];
    const outs = s.transitions || [];
    const cards = terms.map((term, i) => {
      const err = issueAt(s.id, `term.${i}`);
      const warn = issueLike(s.id, `term.${i}`).find((x) => x.level === "warning");
      return `
        <div class="e-permits-doc-rule e-permits-pd__card-block" data-pd-term-card="${i}">
          <div class="e-permits-doc-rule__head">
            <span class="e-permits-doc-rule__target"><strong class="e-permits-pd-card-title">Termenul ${i + 1}</strong></span>
            ${S.viewOnly ? "" : `<button class="btn btn-text-destructive btn-sm" type="button" aria-label="Elimină termenul ${i + 1}" data-pd-act="term-remove" data-i="${i}">${icon("delete", 16)}<span>Elimină</span></button>`}
          </div>
          ${gridHtml(`
            ${selectField({ prop: `term.${i}.term`, label: "Termen", value: term.term || "", options: TERMS, placeholder: "Alege termenul", required: true, error: err && !term.term ? err : "" })}
            ${segmentedField({ prop: `term.${i}.action`, label: "La intrarea în pas", value: term.action || "", options: TERM_ACTIONS })}
            ${term.action === "start" ? selectField({ prop: `term.${i}.onExpire`, label: "La expirare", value: term.onExpire || "", options: [["", "Nimic (doar alertă)"], ...outs.map((tr) => [tr.event, edgeLabel(s, tr) || "Continuă"])], hint: warn ? `<span class="e-permits-pd__warn">${esc(warn.message)}</span>` : "Acțiunea pasului executată automat când termenul expiră." }) : ""}
          `)}
        </div>`;
    }).join("");
    return group("Termene", `
      ${ui().renderInfoNote?.("Termenele nu au încă o poveste de utilizator: le confirmă PO. Se salvează în JSON ca în exportul designerului (properties.terms).") || ""}
      <p class="e-permits-fo-field__hint">${tag("În așteptarea PO", "warning")}</p>
      ${terms.length ? `<div class="e-permits-doc-rules">${cards}</div>` : window.GEAPEmptyState?.render({ title: "Niciun termen", text: "Pasul nu pornește, nu oprește și nu suspendă termenul de examinare.", icon: "time", compact: true, bare: true }) || ""}
      <div class="e-permits-builder__inline-actions">${addButton('data-pd-act="term-add"', "Adaugă termen")}</div>`);
  }

  /* ---- Procesor (event): Procesor server + its parameters (US-188 AC-03…06) */
  function processorTab(s) {
    const p = s.properties || {};
    const type = s.componentType || "";
    let params = "";
    if (type === "notify") params = templatePicks(s);
    else if (type === "audit-log") params = selectField({ prop: "auditCode", label: "Cod audit", value: p.auditCode || "", options: AUDIT_CODES.map((c) => [c, c]), placeholder: "Alege codul", required: true, error: propError(s.id, "auditCode") });
    else if (type === "mconnect-event-publish") params = segmentedField({ prop: "objectType", label: "Tip obiect", value: p.objectType || "Case", options: OBJECT_TYPES, hint: "Evenimentul publicat în MConnect descrie dosarul sau actul permisiv." });
    else if (type === "payment-accrual" || type === "payment-note") params = selectField({ prop: "momentId", label: "Moment plată", value: p.momentId ? String(p.momentId) : "", options: PAYMENT_MOMENTS.map((m, i) => [String(i + 1), `${i + 1} · ${m}`]), placeholder: "Alege momentul", required: true, error: propError(s.id, "momentId"), hint: "Taxele tipurilor de solicitare cu acest moment se calculează aici (US-200)." });
    else if (type === "mdocs-publish") params = `<p class="e-permits-fo-field__hint">Documentele generate până la acest pas se publică în MDocs. Fără parametri.</p>`;
    else if (type === "certificate") params = `<p class="e-permits-fo-field__hint">Generează certificatul constatator cu șablonul de tipar al serviciului. Fără parametri.</p>`;
    else params = `<p class="e-permits-fo-field__hint">Fără procesor, evenimentul doar marchează trecerea (de ex. pentru jurnal sau termene).</p>`;
    return group("Procesor server", gridHtml(`
      ${selectField({ prop: "componentType", label: "Procesor server", value: type, options: Object.entries(PROCESSORS).map(([v, [label]]) => [v, label]), required: true })}
      ${params}
    `));
  }
  /* Șablon de notificare = the long multi-select (components.md): summary button + chips + picker modal */
  function templatePicks(s) {
    const codes = s.properties?.templateCodes || [];
    const err = propError(s.id, "templateCodes");
    const warn = issueLike(s.id, "templateCodes").filter((x) => x.level === "warning");
    const name = (code) => CAT.templates.find((t) => t.code === code)?.name || "";
    const shown = codes.slice(0, 8);
    /* the panel re-renders while the picker is open (focus moved into it): keep the open look */
    const open = Boolean(tplPick && tplPick.node === s.id && tplModal.classList.contains("is-active"));
    return `
      <div class="e-permits-fo-field e-permits-user-create__field">
        <span class="e-permits-pd__label" id="pd-tpl-label">Șablon de notificare${reqMark()}</span>
        <div class="e-permits-cfg-picks">
          <div class="e-permits-fo-subgen-select${err ? " is-error" : ""}${open ? " is-open" : ""}" data-pd-tpl-select>
            <button id="${pid("templateCodes")}" class="e-permits-fo-subgen-select__button" type="button" aria-labelledby="pd-tpl-label pd-tpl-value" aria-haspopup="dialog" aria-expanded="${open}"${S.viewOnly ? " disabled" : ""} data-pd-prop="templateCodes" data-pd-tpl-open>
              <span class="e-permits-fo-subgen-select__value${codes.length ? "" : " e-permits-fo-subgen-select__value--placeholder"}" id="pd-tpl-value">${codes.length ? `${codes.length} ${codes.length === 1 ? "șablon selectat" : "șabloane selectate"} din ${CAT.templates.length}` : "Alege șabloanele"}</span>
              ${icon("chevron-bottom", 20)}
            </button>
          </div>
          ${shown.length ? `<div class="e-permits-fo-subgen__chips">${shown.map((code) => `
            <span class="e-permits-fo-subgen-chip">
              <span class="e-permits-fo-subgen-chip__label" data-cell-tooltip="${esc(`${code}${name(code) && name(code) !== code ? ` · ${name(code)}` : ""}`)}">${esc(code)}${name(code) && name(code) !== code ? ` <span class="e-permits-cfg-picks__chip-meta">· ${esc(name(code))}</span>` : ""}</span>
              ${S.viewOnly ? "" : `<button class="e-permits-fo-subgen-chip__remove" type="button" aria-label="${esc(`Elimină ${code}`)}" data-pd-act="tpl-remove" data-code="${esc(code)}">${icon("cross-small", 20)}</button>`}
            </span>`).join("")}${codes.length > shown.length ? `<button class="btn btn-text-primary btn-sm btn-rounded e-permits-cfg-picks__more" type="button" aria-haspopup="dialog" data-pd-tpl-open="selected">Încă ${codes.length - shown.length} · Arată toate</button>` : ""}</div>` : ""}
        </div>
        ${err ? errorHtml(err) : `<p class="e-permits-fo-field__hint">Doar șabloanele active · „Cod · Denumire”. Se trimite câte o notificare pentru fiecare șablon; numărul apare pe eveniment.</p>`}
        ${warn.map((w) => `<p class="e-permits-fo-field__hint"><span class="e-permits-pd__warn">${esc(w.message)}</span></p>`).join("")}
      </div>`;
  }

  /* ---- Avansat: field assignments (US-52 AC-01) · kind · the node's JSON */
  function advancedTab(s) {
    const list = (s.fieldAssignments || []).map((f, i) => ({ f, i })).filter(({ f }) => f.name !== "StatusId");
    const rows = list.map(({ f, i }, n) => `
      <li class="e-permits-builder__option-row">
        <span class="e-permits-builder__option-index" aria-hidden="true">${n + 1}</span>
        <div class="e-permits-pd__pair">
          ${S.viewOnly ? `<span class="e-permits-pd__ro">${esc(f.name)}</span>` : bareSelect({ id: pid(`assign.${i}.name`), prop: `assign.${i}.name`, options: [...ASSIGN_NAMES, ...(ASSIGN_NAMES.some(([v]) => v === f.name) ? [] : [[f.name, f.name]])], value: f.name, label: `Nume ${n + 1}` })}
          <div class="e-permits-fo-input${S.viewOnly ? " is-filled is-readonly" : ""}"><input id="${pid(`assign.${i}.value`)}" type="text" value="${esc(f.value ?? "")}" placeholder="Valoare" aria-label="Valoare ${n + 1}" autocomplete="off"${S.viewOnly ? " readonly" : ""} data-pd-prop="assign.${i}.value"></div>
        </div>
        ${S.viewOnly ? "" : `<button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină atribuirea ${n + 1}" data-tooltip-label="Elimină" data-pd-act="assign-remove" data-i="${i}">${icon("delete", 16)}</button>`}
      </li>`).join("");
    const json = PM.serialize({ s }).replace(/^\{\n {2}"s": /, "").replace(/\n\}\n$/, "");
    return group("Atribuiri de câmpuri", `
        <p class="e-permits-fo-field__hint">Valori scrise în înregistrarea dosarului când procesul ajunge aici. Starea dosarului se setează în General.</p>
        ${rows ? `<ol class="e-permits-builder__options" aria-label="Atribuiri de câmpuri">${rows}</ol>` : ""}
        <div class="e-permits-builder__inline-actions">${addButton('data-pd-act="assign-add"', "Adaugă atribuire")}</div>`)
      + group("Tehnic", facts([["Tip motor (kind)", esc(s.kind || "—")], ["Tip element", esc(s.properties?.elementType || "—")], ["Coordonate", `${Math.round(Number(s.properties?.x) || 0)}, ${Math.round(Number(s.properties?.y) || 0)}`]]))
      + group("JSON", `<div class="e-permits-builder__schema e-permits-pd__node-json"><pre>${esc(json)}</pre></div>`);
  }

  /* ---- Conexiune: label · target (re-connect, keyboard twin of the endpoint drag) · form · colour · width · route */
  function edgePanel(e) {
    if (!e) return emptyPanel();
    const srcType = typeOf(e.src);
    const err = (S.issues.find((i) => i.id === e.key && i.level === "error") || {}).message || "";
    const menu = S.viewOnly ? "" : ui().renderStackMenu?.([
      { label: "Inserează un eveniment", icon: "notification", attrs: `data-pd-act="split-edge" data-id="${esc(e.key)}"${e.tgt ? "" : ' aria-disabled="true" data-tooltip-reason="Conexiunea nu are țintă."'}` },
      { label: "Șterge conexiunea", icon: "delete", danger: true, attrs: `data-pd-act="delete-edge" data-id="${esc(e.key)}"` },
    ], "conexiune") || "";
    const label = e.t.event === "next" ? "" : e.t.event || "";
    const forms = CAT.forms.map((f) => [f, f]);
    return `
      ${panelHead({ title: `${nameOf(e.src)} → ${e.tgt ? nameOf(e.tgt) : "?"}`, chip: tag("Conexiune", "neutral"), menu })}
      ${tabsHtml(["general"], "general")}
      ${tabPanel("general", `
        ${group("Conexiune", gridHtml(`
          ${inputField({ prop: "edge.event", label: srcType === "decision" ? "Etichetă" : "Etichetă (acțiune)", value: label, placeholder: srcType === "decision" ? "De ex. Da" : "Continuă", required: srcType === "decision", error: err && /etichet/i.test(err) ? err : "", hint: srcType === "decision" ? "" : "Fără etichetă, acțiunea se numește „Continuă”." })}
          <div class="e-permits-fo-field e-permits-user-create__field">
            <span class="e-permits-pd__label">De la</span>
            <div class="e-permits-pd__ends"><button class="btn btn-neutral btn-sm e-permits-pd__end" type="button" data-pd-goto-node="${esc(e.src.id)}">${esc(nameOf(e.src))}</button></div>
          </div>
          ${selectField({ prop: "edge.target", label: "La", value: e.t.target || "", options: targetOptions(e.src), placeholder: "Alege elementul", required: true, error: !e.tgt ? "Alege elementul la care duce conexiunea." : "", hint: S.viewOnly ? "" : "Sau trage capătul conexiunii pe alt element." })}
          ${srcType === "activity" ? selectField({ prop: "edge.formName", label: "Formular", value: e.t.formName || "", options: [["", "Fără formular"], ...forms.filter(([f]) => f !== e.t.formName), ...(e.t.formName ? [[e.t.formName, e.t.formName]] : [])], hint: "Formularul de proces deschis de această acțiune." }) : ""}
        `))}
        ${group("Aspect", gridHtml(`
          ${selectField({ prop: "edge.color", label: "Culoare", value: e.t.color || "implicit", options: COLORS })}
          ${segmentedField({ prop: "edge.width", label: "Grosime", value: e.t.width ? String(e.t.width) : "", options: [["", "Implicită"], ["1", "1 px"], ["2", "2 px"], ["3", "3 px"]] })}
          <div class="e-permits-fo-field e-permits-user-create__field">
            <span class="e-permits-pd__label">Traseu</span>
            <div class="e-permits-pd__route">
              <span>${e.t.waypoints?.length ? "Personalizat" : "Automat (ocolește elementele)"}</span>
              ${e.t.waypoints?.length && !S.viewOnly ? '<button class="btn btn-text-primary btn-sm" type="button" data-pd-act="route-reset">Revino la traseul automat</button>' : ""}
            </div>
          </div>
          ${facts([["Port de plecare", esc(PORT_TITLE[e.t.sourcePort] || "automat")], ["Port de sosire", esc(PORT_TITLE[e.t.targetPort] || "automat")]])}
        `))}
      `)}`;
  }

  /* ---- Bandă (lane): title · description · role · height · order · delete (D.6) */
  function lanePanel(lane) {
    if (!lane) return emptyPanel();
    const lanes = S.def.lanes || [];
    const at = lanes.indexOf(lane);
    const count = (S.def.states || []).filter((s) => s.properties?.laneId === lane.id).length;
    const err = (S.issues.find((i) => i.id === lane.id && i.level === "error") || {}).message || "";
    const menu = S.viewOnly ? "" : ui().renderStackMenu?.([
      { label: "Mută sus", icon: "arrow-up", attrs: `data-pd-act="lane-up" data-id="${esc(lane.id)}"${at === 0 ? ' aria-disabled="true" data-tooltip-reason="Este prima bandă."' : ""}` },
      { label: "Mută jos", icon: "arrow-down", attrs: `data-pd-act="lane-down" data-id="${esc(lane.id)}"${at === lanes.length - 1 ? ' aria-disabled="true" data-tooltip-reason="Este ultima bandă."' : ""}` },
      { label: "Șterge banda", icon: "delete", danger: true, attrs: `data-pd-act="lane-delete" data-id="${esc(lane.id)}"${lanes.length <= 1 ? ' aria-disabled="true" data-tooltip-reason="Procesul are o singură bandă."' : ""}` },
    ], String(lane.title || "Bandă").trim()) || "";
    return `
      ${panelHead({ title: String(lane.title || "Bandă").trim(), chip: tag("Bandă", "neutral"), menu, subtitle: `${count} ${count === 1 ? "element" : "elemente"} · ${at + 1} din ${lanes.length}` })}
      ${tabsHtml(["general"], "general")}
      ${tabPanel("general", `
        ${group("Bandă", gridHtml(`
          ${inputField({ prop: "lane.title", label: "Denumire", value: lane.title || "", required: true, error: err })}
          ${textareaField({ prop: "lane.description", label: "Descriere", value: lane.description || "" })}
          ${selectField({ prop: "lane.role", label: "Rol", value: lane.role || "", options: ROLES.some(([v]) => v === (lane.role || "")) ? ROLES : [...ROLES, [lane.role, "Rol necunoscut"]], hint: "Pașii umani din bandă primesc acest rol, dacă nu au unul propriu." })}
          ${inputField({ prop: "lane.height", label: "Înălțime (px)", value: String(PM.lanesLayout(S.def)[at]?.height || lane.height || 160), numeric: true, hint: `Pas 20, minimum ${PM.laneMinHeight(S.def, lane.id)} (cât încap elementele). Sau trage marginea de jos a benzii.` })}
        `))}
        ${S.viewOnly ? "" : group("Ordine", `<div class="e-permits-builder__inline-actions">
          <button class="btn btn-neutral btn-sm" type="button" data-pd-act="lane-up" data-id="${esc(lane.id)}"${at === 0 ? ' aria-disabled="true" data-tooltip-reason="Este prima bandă."' : ""}>${icon("arrow-up", 20)}<span>Mută sus</span></button>
          <button class="btn btn-neutral btn-sm" type="button" data-pd-act="lane-down" data-id="${esc(lane.id)}"${at === lanes.length - 1 ? ' aria-disabled="true" data-tooltip-reason="Este ultima bandă."' : ""}>${icon("arrow-down", 20)}<span>Mută jos</span></button>
        </div><p class="e-permits-fo-field__hint">Sau trage banda de titlu, în sus sau în jos.</p>`)}
        ${facts([["Identificator", esc(lane.id)]])}
      `)}`;
  }
  /* ---- Pool: title + the lanes in order with ↑ ↓ (keyboard twin of the rail drag) */
  function poolPanel() {
    const lanes = S.def.lanes || [];
    return `
      ${panelHead({ title: S.def.pool?.title || S.def.title || "Pool", chip: tag("Pool", "neutral"), subtitle: `${lanes.length} ${lanes.length === 1 ? "bandă" : "benzi"} · ${(S.def.states || []).length} elemente` })}
      ${tabsHtml(["general"], "general")}
      ${tabPanel("general", `
        ${group("Pool", gridHtml(inputField({ prop: "pool.title", label: "Denumire pool", value: S.def.pool?.title || "", placeholder: S.def.title || "Pool", hint: "Gol = denumirea procesului." })))}
        ${group("Benzi", `
          <ol class="e-permits-builder__step-list e-permits-pd__lane-order">
            ${lanes.map((l, i) => `
              <li class="e-permits-pd__lane-order-row">
                <button class="e-permits-builder__step-row" type="button" data-pd-lane-go="${esc(l.id)}"><span class="e-permits-builder__step-badge">${i + 1}</span><span class="e-permits-pd__action-text"><strong>${esc(String(l.title || "Bandă").trim())}</strong></span><span class="e-permits-builder__step-row-meta">${esc(roleName(l.role))}</span></button>
                ${S.viewOnly ? "" : `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută sus: ${esc(String(l.title || "").trim())}" data-tooltip-label="Mută sus" data-pd-act="lane-up" data-id="${esc(l.id)}"${i === 0 ? ' aria-disabled="true" data-tooltip-reason="Este prima bandă."' : ""}>${icon("arrow-up", 16)}</button><button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută jos: ${esc(String(l.title || "").trim())}" data-tooltip-label="Mută jos" data-pd-act="lane-down" data-id="${esc(l.id)}"${i === lanes.length - 1 ? ' aria-disabled="true" data-tooltip-reason="Este ultima bandă."' : ""}>${icon("arrow-down", 16)}</button>`}
              </li>`).join("")}
          </ol>
          ${lanes.length >= PM.LANE_MAX ? '<p class="e-permits-fo-field__hint">Ai atins limita de 15 benzi.</p>' : `<div class="e-permits-builder__inline-actions">${addButton('data-pd-act="lane-add"', "Adaugă bandă")}</div>`}
        `)}
      `)}`;
  }

  /* ---- Setări generale (US-52 AC-03, spec E.6): identity · managed record · context variables · version · usage · statistics */
  function processPanel() {
    const rec = S.rec;
    const vars = S.def.variables || {};
    const read = PM.usedVariables(S.def);
    const known = CONTEXT_VARS.map(([v]) => v);
    const extra = Object.keys(vars).filter((v) => !known.includes(v));
    const usage = usageOf(rec);
    const counts = {};
    (S.def.states || []).forEach((s) => { const t = typeOf(s); counts[t] = (counts[t] || 0) + 1; });
    const varRow = (v, label) => `
      <li class="e-permits-pd__var">
        ${ui().renderCheckOption?.({ label: `${v} · ${label}`, checked: v in vars, disabled: S.viewOnly, plain: true, attrs: `value="${esc(v)}" data-pd-prop="process.variables"` }) || ""}
        <span class="e-permits-pd__var-meta">Da / Nu · ${read[v] ? `folosită în ${read[v]} ${read[v] === 1 ? "condiție" : "condiții"}` : "nefolosită"}</span>
      </li>`;
    const varIssue = S.issues.filter((i) => i.kind === "process" && i.prop === "variables");
    return `
      <div class="e-permits-builder__panel-head e-permits-builder__panel-head--selected e-permits-pd__panel-head">
        <div class="e-permits-builder__panel-title-row">
          <h2 id="pd-panel-title">Setări generale</h2>
          <span class="e-permits-pd__head-tools">${tbButton("data-pd-hide-props", "sidebar", "Ascunde proprietățile", "]")}</span>
        </div>
        <div class="e-permits-builder__panel-meta">${tag("Proces", "neutral")}<span>Global · Administrator Central</span></div>
      </div>
      <div class="e-permits-builder__panel-scroll e-permits-pd__panel-scroll" data-pd-panel-scroll>
        ${group("Identificare", gridHtml(`
          ${copyId(S.def.name)}
          ${inputField({ prop: "process.title", label: "Denumirea procesului", value: S.def.title || "", required: true, error: S.def.title ? "" : "Câmpul este obligatoriu." })}
          ${textareaField({ prop: "process.description", label: "Descriere scurtă", value: S.def.description || "" })}
        `))}
        ${group("Parametrii înregistrării gestionate de proces", gridHtml(`
          ${selectField({ prop: "process.tableName", label: "Denumire tabelă", value: S.def.tableName || "GEAP_Cases", options: [["GEAP_Cases", "GEAP_Cases · dosare"], ["GEAP_Permits", "GEAP_Permits · acte permisive"], ["GEAP_Requests", "GEAP_Requests · solicitări"]] })}
          ${facts([["Cheia înregistrării", esc(S.def.recordKey || "Id")]])}
          <div class="e-permits-fo-field e-permits-user-create__field">
            <span class="e-permits-pd__label" id="pd-vars-label">Variabile de context</span>
            <p class="e-permits-fo-field__hint">Condițiile deciziilor citesc aceste variabile. Valorile vin din pașaportul serviciului.</p>
            <ul class="e-permits-pd__vars" role="group" aria-labelledby="pd-vars-label">
              ${CONTEXT_VARS.map(([v, label]) => varRow(v, label)).join("")}
              ${extra.map((v) => varRow(v, "din JSON")).join("")}
            </ul>
            ${varIssue.map((w) => `<p class="e-permits-fo-field__hint"><span class="e-permits-pd__warn">${esc(w.message)}</span></p>`).join("")}
          </div>
        `))}
        ${group("Versiune", facts([
          ["Statut", tag(rec.status === "Publicat" && !S.dirty ? "Publicat" : "Schiță", rec.status === "Publicat" && !S.dirty ? "success" : "neutral")],
          ["Versiune", `v${esc(S.def.version)}${S.dirty ? " · modificări nesalvate" : ""}`],
          ["Versiunea publicată activă", rec.publishedVersion ? `v${esc(rec.publishedVersion)}` : "—"],
          ["Editat", `${esc(longDate(rec.modifiedOn))}, ${esc(hhmm(rec.modifiedOn))} · ${esc(rec.modifiedBy)}`],
        ]))}
        ${group("Utilizare", usage.length ? `
          <p class="e-permits-fo-field__hint">Folosit de ${usage.length} ${usage.length === 1 ? "tip de solicitare" : "tipuri de solicitare"} în ${new Set(usage.map((u) => u.code)).size} ${new Set(usage.map((u) => u.code)).size === 1 ? "serviciu" : "servicii"}.</p>
          <ul class="e-permits-builder__step-list">${usage.map((u) => `<li><a class="e-permits-builder__step-row" href="e-permits-acte-permisive.html?flow=back-office#serviciu/${esc(u.code)}/request-types" target="_blank" rel="noopener"><span class="e-permits-pd__action-text"><strong>${esc(u.rt)}</strong> · ${esc(u.title)}</span><span class="e-permits-builder__step-row-meta">${esc(u.code)}</span></a></li>`).join("")}</ul>`
          : window.GEAPEmptyState?.render({ title: "Nefolosit", text: "Niciun tip de solicitare nu folosește acest proces.", icon: "link", compact: true, bare: true }) || "")}
        ${group("Statistici", facts([
          ["Activități", String(counts.activity || 0)], ["Decizii", String(counts.decision || 0)], ["Evenimente", String(counts.event || 0)], ["Sub-procese", String(counts.subprocess || 0)],
          ["Conexiuni", String(allEdges().length)], ["Benzi", String((S.def.lanes || []).length)],
        ]))}
      </div>`;
  }

  /* ---- panel input → model */
  function setStatus(s, value) {
    const list = (s.fieldAssignments || []).filter((f) => f.name !== "StatusId");
    if (value !== "") {
      const existing = (s.fieldAssignments || []).find((f) => f.name === "StatusId");
      if (existing) { existing.value = value; return; }
      PM.putKey(s, "fieldAssignments", [...(s.fieldAssignments || []), { name: "StatusId", value }], "state");
      return;
    }
    if (list.length) s.fieldAssignments = list; else delete s.fieldAssignments;
  }
  /* empty optional texts are removed; a re-added key goes back to its export place (PM.setKey) */
  function setText(obj, key, value, kind = "state") { PM.setKey(obj, key, value, kind); }
  const emptyCondition = () => ({ sourceField: "", operator: "", valueKind: "static" });
  /* one model change: undo checkpoint (typing coalesces per field), then redraw */
  function edit(fn, { typing = "", panel = true } = {}) {
    if (S.viewOnly) return false;
    checkpoint(typing);
    const out = fn();
    if (out === false) { S.undo.pop(); return false; }
    reindex();
    commit({ panel });
    return true;
  }
  const selected = () => S.byId.get([...S.sel.nodes][0]);
  function setVariables(name, on) {
    const vars = { ...(S.def.variables || {}) };
    if (on) vars[name] = vars[name] || "checkbox"; else delete vars[name];
    /* catalogue order first (the export's), then anything else the JSON carried */
    const known = CONTEXT_VARS.map(([v]) => v);
    const next = {};
    known.forEach((v) => { if (v in vars) next[v] = vars[v]; });
    Object.keys(vars).forEach((v) => { if (!known.includes(v)) next[v] = vars[v]; });
    PM.putKey(S.def, "variables", next, "root");
  }
  /* Id of an event (US-188: editable, unique): every reference follows */
  function renameNode(s, value) {
    const id = value.trim();
    if (id === s.id) { S.idError = null; return false; }
    const message = !id ? "Identificatorul este obligatoriu." : !/^[A-Za-z][A-Za-z0-9_]*$/.test(id) ? "Doar litere latine, cifre și „_”, începând cu o literă." : S.byId.has(id) ? `Identificatorul «${id}» există deja în proces.` : "";
    if (message) { S.idError = { node: s.id, value, message }; renderPanel(); return false; }
    S.idError = null;
    const old = s.id;
    s.id = id;
    (S.def.states || []).forEach((st) => (st.transitions || []).forEach((t) => { if (t.target === old) t.target = id; }));
    if (S.def.initialState === old) S.def.initialState = id;
    S.sel.nodes = new Set([id]);
    nodeEls.get(old)?.remove();
    nodeEls.delete(old);
    announce(`Identificatorul este acum ${id}.`);
    return true;
  }
  function setTarget(t, value) {
    t.target = value;
    delete t.targetPort;
    delete t.waypoints;
  }
  function onPanelValue(input, { typing }) {
    if (S.viewOnly) return;
    const prop = input.dataset.pdProp;
    const value = input.type === "checkbox" ? input.checked : input.value;
    const tkey = typing ? `${S.sel.edge}|${S.sel.lane}|${[...S.sel.nodes].join(",")}|${prop}` : "";
    const opts = { typing: tkey, panel: !typing };
    /* process (Setări generale) */
    if (prop === "process.variables") { edit(() => setVariables(input.value, input.checked)); return; }
    if (prop.startsWith("process.")) {
      edit(() => { const key = prop.slice(8); if (key === "description") setText(S.def, "description", value, "root"); else S.def[key] = value; }, opts);
      if (typing) renderChrome();
      return;
    }
    if (prop === "pool.title") {
      edit(() => {
        if (String(value).trim()) PM.putKey(S.def, "pool", { ...(S.def.pool || {}), title: value }, "root");
        else if (S.def.pool) { delete S.def.pool.title; if (!Object.keys(S.def.pool).length) delete S.def.pool; }
      }, opts);
      return;
    }
    if (prop.startsWith("lane.")) {
      const lane = laneById(S.sel.lane);
      if (!lane) return;
      const key = prop.slice(5);
      if (key === "height") {
        if (typing) return;
        edit(() => { PM.resizeLane(S.def, lane.id, Number(value) || 0); });
        return;
      }
      edit(() => { if (key === "description") setText(lane, "description", value, "lane"); else lane[key] = value; }, opts);
      return;
    }
    if (prop.startsWith("edge.")) {
      const e = edgeOf(S.sel.edge);
      if (!e) return;
      const key = prop.slice(5);
      edit(() => {
        if (key === "event") e.t.event = value.trim() === "" ? "next" : value;
        else if (key === "formName") PM.setKey(e.t, "formName", value, "transition");
        else if (key === "target") setTarget(e.t, value);
        else if (key === "color") PM.setKey(e.t, "color", value === "implicit" ? "" : value, "transition");
        else if (key === "width") PM.setKey(e.t, "width", value ? Number(value) : "", "transition");
      }, opts);
      return;
    }
    const s = selected();
    if (!s) return;
    const p = s.properties || (s.properties = {});
    const parts = prop.split(".");
    if (prop === "id") { if (typing) return; edit(() => renameNode(s, value)); return; }
    if (parts[0] === "action" || parts[0] === "exit") {
      const i = Number(parts[1]);
      const t = (s.transitions || [])[i];
      if (!t) return;
      if (parts[2] === "event") { edit(() => { t.event = value.trim() === "" ? "next" : value; }, opts); return; }
      if (parts[2] === "target") { edit(() => setTarget(t, value)); return; }
      if (parts[2] === "formName") { edit(() => PM.setKey(t, "formName", value, "transition")); return; }
      if (parts[2] === "default") {
        edit(() => {
          const stash = (S.guardStash = S.guardStash || {});
          const k = `${s.id}:${i}`;
          if (value) { stash[k] = t.guard; delete t.guard; }
          else PM.putKey(t, "guard", stash[k] || { groups: [{ conditions: [emptyCondition()] }] }, "transition");
        });
        return;
      }
      if (parts[2] === "cond") {
        const c = t.guard?.groups?.[Number(parts[3])]?.conditions?.[Number(parts[4])];
        if (!c) return;
        const what = parts[5];
        edit(() => {
          if (what === "field") {
            c.sourceField = value;
            const kind = PM.fieldKind(S.def, value);
            const ok = kind === "bool" ? PM.BOOL_OPS : PM.VALUE_OPS;
            if (!ok.includes(c.operator)) c.operator = kind === "bool" ? "isTrue" : "eq";
            if (kind === "bool") delete c.value;
          } else if (what === "op") {
            c.operator = value;
            if (PM.BOOL_OPS.includes(value)) delete c.value;
          } else if (what === "value") PM.setKey(c, "value", value, "condition");
        }, what === "value" ? opts : {});
        return;
      }
      return;
    }
    if (parts[0] === "term") {
      const terms = p.terms || [];
      const term = terms[Number(parts[1])];
      if (!term) return;
      edit(() => {
        if (parts[2] === "action") { term.action = value; if (value !== "start") delete term.onExpire; }
        else PM.setKey(term, parts[2], value, "term");
      });
      return;
    }
    if (parts[0] === "assign") {
      const f = (s.fieldAssignments || [])[Number(parts[1])];
      if (!f) return;
      edit(() => { f[parts[2]] = value; }, parts[2] === "value" ? opts : {});
      return;
    }
    if (prop === "roles") {
      edit(() => {
        const boxes = [...el.props.querySelectorAll('[data-pd-prop="roles"]')];
        const on = boxes.filter((b) => b.checked).map((b) => b.value);
        s.roles = [...ROLES.map(([v]) => v).filter((v) => on.includes(v)), ...on.filter((v) => !ROLES.some(([r]) => r === v))];
      });
      return;
    }
    edit(() => {
      if (prop === "title") s.title = value;
      else if (prop === "description") setText(s, "description", value);
      else if (prop === "status") setStatus(s, value);
      else if (prop === "laneId") moveToLane(s, value);
      else if (prop === "visualComponent") PM.setKey(p, "visualComponent", value, "properties");
      else if (prop === "processRef") PM.setKey(p, "processRef", value, "properties");
      else if (prop === "showName") PM.setKey(p, "showName", value ? true : "", "properties");
      else if (prop === "componentType") PM.setKey(s, "componentType", value, "state");
      else if (prop === "auditCode") PM.setKey(p, "auditCode", value, "properties");
      else if (prop === "objectType") PM.setKey(p, "objectType", value, "properties");
      else if (prop === "momentId") PM.setKey(p, "momentId", value ? Number(value) : "", "properties");
    }, opts);
    if (typing && prop === "title") { patchNode(s.id); el.props.querySelector("#pd-panel-title")?.replaceChildren(document.createTextNode(nameOf(s))); }
  }
  /* Bandă change (US-52 AC-01): the node moves into that lane's band, centred */
  function moveToLane(s, laneId) {
    const l = PM.lanesLayout(S.def).find((x) => x.id === laneId);
    if (!l) return;
    s.properties.laneId = laneId;
    PM.place(s, S.def, PM.centerOf(s, S.def).x, snap(l.top + l.height / 2));
    announce(`${nameOf(s)} mutat în banda ${String(l.lane.title || "").trim()}.`);
  }
  el.props.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-pd-prop]") && input.type !== "checkbox" && input.tagName !== "SELECT" && input.dataset.pdProp !== "id" && input.dataset.pdProp !== "lane.height") onPanelValue(input, { typing: true });
  });
  el.props.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches("[data-pd-prop]")) return;
    if (input.type === "checkbox" || input.tagName === "SELECT" || input.dataset.pdProp === "id" || input.dataset.pdProp === "lane.height") onPanelValue(input, { typing: false });
  });
  el.props.addEventListener("keydown", (event) => {
    /* Enter in the Id / height inputs applies them (change) */
    if (event.key === "Enter" && event.target.matches?.('[data-pd-prop="id"], [data-pd-prop="lane.height"]')) { event.preventDefault(); onPanelValue(event.target, { typing: false }); return; }
    /* tabs and segmented controls: arrows move between the options (roving tabindex) */
    const tabBtn = event.target.closest?.("[data-pd-tab]");
    const seg = event.target.closest?.("[data-pd-seg]");
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!dir || (!tabBtn && !seg)) return;
    event.preventDefault();
    event.stopPropagation();
    const list = [...(tabBtn ? tabBtn.parentElement : seg.parentElement).querySelectorAll(tabBtn ? "[data-pd-tab]" : "[data-pd-seg]")];
    const next = list[(list.indexOf(tabBtn || seg) + dir + list.length) % list.length];
    next.click();
  });
  el.props.addEventListener("focusout", (event) => {
    if (event.target.matches?.("[data-pd-prop]")) { S.typingKey = ""; window.setTimeout(() => { if (!el.props.contains(document.activeElement)) renderPanel(); }, 0); }
  });
  el.props.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-pd-tab], [data-pd-tab-go]");
    if (tabBtn) {
      S.tab = tabBtn.dataset.pdTab || tabBtn.dataset.pdTabGo;
      renderPanel();
      el.props.querySelector(`[data-pd-tab="${S.tab}"]`)?.focus();
      return;
    }
    const seg = event.target.closest("[data-pd-seg]");
    if (seg) {
      onPanelValue({ dataset: { pdProp: seg.dataset.pdSeg }, value: seg.dataset.value, type: "button" }, { typing: false });
      el.props.querySelector(`[data-pd-seg="${CSS.escape(seg.dataset.pdSeg)}"][data-value="${CSS.escape(seg.dataset.value)}"]`)?.focus();
      return;
    }
    const edgeRow = event.target.closest("[data-pd-select-edge]");
    if (edgeRow) { selectEdge(edgeRow.dataset.pdSelectEdge); el.props.querySelector("[data-pd-prop]")?.focus(); return; }
    const goto = event.target.closest("[data-pd-goto-node]");
    if (goto) { selectNodes([goto.dataset.pdGotoNode], { focus: false }); zoomTo(boundsOf([goto.dataset.pdGotoNode]), { maxZoom: Math.max(S.view.z, 1) }); return; }
    const laneGo = event.target.closest("[data-pd-lane-go]");
    if (laneGo) { selectLane(laneGo.dataset.pdLaneGo); return; }
    if (event.target.closest("[data-pd-tpl-open]")) { openTemplatePicker(event.target.closest("[data-pd-tpl-open]").dataset.pdTplOpen === "selected" ? "selected" : "all"); return; }
    if (event.target.closest("[data-pd-open-issues]")) { el.errors.click(); return; }
    if (event.target.closest("[data-pd-delete-selection]")) { deleteSelection(); return; }
  });

  /* ⋮ menus and panel buttons (shell stack menu; items keep their own actions) */
  const swap = (arr, a, b) => { if (b < 0 || b >= arr.length) return false; [arr[a], arr[b]] = [arr[b], arr[a]]; return true; };
  function panelAction(act, item) {
    const s = selected();
    const i = Number(item.dataset.i);
    const outs = s?.transitions || [];
    const focusAfter = (sel) => window.setTimeout(() => el.props.querySelector(sel)?.focus(), 30);
    switch (act) {
      case "action-add":
        edit(() => { outs.push({ event: outs.length ? `Acțiune ${outs.length + 1}` : "next", target: "" }); s.transitions = outs; });
        focusAfter(`#${CSS.escape(pid(`action.${outs.length - 1}.event`))}`);
        announce("Acțiune adăugată. Alege elementul la care duce.");
        return;
      case "exit-add":
        edit(() => { outs.push({ event: `Ieșire ${outs.length + 1}`, target: "", ...(outs.some((t) => !t.guard) ? { guard: { groups: [{ conditions: [emptyCondition()] }] } } : {}) }); s.transitions = outs; });
        focusAfter(`#${CSS.escape(pid(`exit.${outs.length - 1}.event`))}`);
        announce("Ieșire adăugată.");
        return;
      case "exit-preset":
        edit(() => {
          while (outs.length < 2) outs.push({ event: "", target: "", ...(outs.length === 0 ? { guard: { groups: [{ conditions: [emptyCondition()] }] } } : {}) });
          s.transitions = outs;
          outs[0].event = "Da";
          outs[1].event = "Nu";
        });
        announce("Ieșirile se numesc acum Da și Nu.");
        return;
      case "action-up": case "exit-up": edit(() => swap(outs, i, i - 1)); return;
      case "action-down": case "exit-down": edit(() => swap(outs, i, i + 1)); return;
      case "action-select": case "exit-select": selectEdge(edgeKey(s.id, i)); return;
      case "action-delete": case "exit-delete": {
        const before = snapshot();
        if (edit(() => { outs.splice(i, 1); })) toastUndo(act === "exit-delete" ? `Ieșirea ${i + 1} a fost ștearsă.` : `Acțiunea ${i + 1} a fost ștearsă.`, before, []);
        return;
      }
      case "cond-add": edit(() => { const g = outs[i].guard.groups; g[g.length - 1].conditions.push(emptyCondition()); }); return;
      case "group-add": edit(() => { outs[i].guard.groups.push({ conditions: [emptyCondition()] }); }); return;
      case "cond-remove": {
        const [ei, gi, ci] = item.dataset.k.split(".").map(Number);
        edit(() => {
          const groups = outs[ei].guard.groups;
          groups[gi].conditions.splice(ci, 1);
          if (!groups[gi].conditions.length) groups.splice(gi, 1);
        });
        return;
      }
      case "term-add":
        edit(() => { PM.setKey(s.properties, "terms", [...(s.properties.terms || []), { term: "Examinare", action: "start" }], "properties"); });
        return;
      case "term-remove": edit(() => { const terms = [...(s.properties.terms || [])]; terms.splice(i, 1); PM.setKey(s.properties, "terms", terms, "properties"); }); return;
      case "assign-add": edit(() => { PM.putKey(s, "fieldAssignments", [...(s.fieldAssignments || []), { name: "TeamId", value: "" }], "state"); }); focusAfter(`#${CSS.escape(pid(`assign.${(s.fieldAssignments || []).length - 1}.value`))}`); return;
      case "assign-remove": edit(() => { const list = [...(s.fieldAssignments || [])]; list.splice(i, 1); PM.setKey(s, "fieldAssignments", list, "state"); }); return;
      case "tpl-remove": edit(() => { PM.setKey(s.properties, "templateCodes", (s.properties.templateCodes || []).filter((c) => c !== item.dataset.code), "properties"); }); focusAfter("[data-pd-tpl-open]"); return;
      case "route-reset": { const e = edgeOf(S.sel.edge); if (e) edit(() => { delete e.t.waypoints; }); return; }
      case "open-sub": drillIn(item.dataset.id); return;
      case "new-sub": createSubprocess(item.dataset.id); return;
      case "lane-up": case "lane-down": moveLane(item.dataset.id, act === "lane-up" ? -1 : 1); return;
      case "lane-delete": askDeleteLane(item.dataset.id); return;
      case "lane-add": addLane(); return;
      case "split-edge": splitWithEvent(item.dataset.id); return;
      case "duplicate": duplicateSelection(item.dataset.id ? [item.dataset.id] : [...S.sel.nodes]); return;
      default:
        if (act.startsWith("align-") || act.startsWith("distribute-")) arrange(act);
    }
  }
  root.addEventListener("click", (event) => {
    const item = event.target.closest("[data-pd-act]");
    if (!item) return;
    if (item.getAttribute("aria-disabled") === "true" || item.disabled) { event.preventDefault(); return; }
    const { pdAct: act, id } = item.dataset;
    if (act === "delete") deleteNodes([id]);
    else if (act === "delete-edge") deleteEdge(id);
    else if (act === "center") zoomTo(boundsOf([id]), { maxZoom: Math.max(1, S.view.z) });
    else if (act === "continue") window.setTimeout(() => openAddMenu(id), 0);
    else panelAction(act, item);
  });

  /* ---------------------------------------------------------------- JSON view (Schemă JSON) */
  function renderJson() {
    const text = PM.serialize(S.def);
    el.json.innerHTML = `
      <div class="e-permits-pd__json-head">
        <div>
          <h2 class="e-permits-pd__card-title">Schema JSON</h2>
          <p class="e-permits-pd__json-meta">${esc(S.def.name)} · v${esc(S.def.version)} · ${(text.length / 1024).toFixed(1).replace(".", ",")} KB${S.dirty ? " · include modificările nesalvate" : " · identică cu versiunea salvată"}</p>
        </div>
        <div class="e-permits-pd__json-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-pd-json-copy>${icon("copy", 20)}<span>Copiază</span></button>
          <button class="btn btn-secondary btn-sm" type="button" data-pd-json-export>${icon("export", 20)}<span>Exportă JSON</span></button>
          ${S.viewOnly ? "" : `<button class="btn btn-secondary btn-sm" type="button" data-pd-json-import>${icon("upload", 20)}<span>Importă JSON</span></button>`}
        </div>
      </div>
      <div class="e-permits-builder__schema e-permits-pd__json-code"><pre>${esc(text)}</pre></div>`;
  }
  el.json.addEventListener("click", async (event) => {
    if (event.target.closest("[data-pd-json-copy]")) {
      try { await navigator.clipboard.writeText(PM.serialize(S.def)); } catch { /* clipboard blocked */ }
      const b = event.target.closest("[data-pd-json-copy]");
      b.querySelector("span").textContent = "Copiat";
      window.setTimeout(() => { if (b.isConnected) b.querySelector("span").textContent = "Copiază"; }, 1600);
      announce("Schema a fost copiată.");
      return;
    }
    if (event.target.closest("[data-pd-json-export]")) {
      const blob = new Blob([PM.serialize(S.def)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${S.def.name}_v${S.def.version}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });

  /* ---------------------------------------------------------------- editing operations */
  function uniqueId(prefix) {
    let n = 1;
    const used = new Set((S.def.states || []).map((s) => s.id));
    while (used.has(`${prefix}${n}`)) n += 1;
    return `${prefix}${n}`;
  }
  /* a free spot: the centre snapped; occupied → step down by 20 inside the lane */
  /* a free spot for the drawn card: the centre snapped; occupied → step down inside the lane, then right.
     Returns the CENTRE (the stored top-left follows the export size, PM.place). */
  function freeSpot(type, cx, cy) {
    const size = PM.VIEW[type];
    const overlaps = (x, y) => (S.def.states || []).some((s) => { const b = boxOf(s); return x < b.x + b.w + 20 && x + size.w + 20 > b.x && y < b.y + b.h + 20 && y + size.h + 20 > b.y; });
    let x = snap(cx), y = snap(cy);
    for (let i = 0; i < 40 && overlaps(x - size.w / 2, y - size.h / 2); i += 1) {
      y += GRID * 3;
      const lane = PM.laneAt(S.def, y);
      if (!lane && (S.def.lanes || []).length) { y = snap(cy); x += GRID * 4; }
    }
    return { x, y };
  }
  function makeNode(type, center) {
    const id = type === "event" ? uniqueId("eveniment_") : uniqueId("node");
    const lane = PM.laneAt(S.def, center.y) || PM.lanesLayout(S.def)[0];
    const node = { id, title: NEW_TITLE[type], kind: PM.TYPE_KIND[type], roles: [], transitions: [], properties: { x: 0, y: 0, elementType: PM.TYPE_TO_ELEMENT[type], laneId: lane ? lane.id : "" } };
    if (!lane) delete node.properties.laneId;
    PM.place(node, S.def, center.x, center.y);
    return node;
  }
  function addNode(type, { at = null, after = null, focus = true } = {}) {
    if (S.viewOnly) return null;
    checkpoint();
    let pos;
    if (at) pos = freeSpot(type, at.x, at.y);
    else if (after) {
      const b = boxOf(after);
      const c = PM.center(b);
      pos = freeSpot(type, b.x + b.w + 80 + PM.VIEW[type].w / 2, c.y);
    } else {
      const v = visibleArea();
      const w = toWorld(stageRect.left + v.cx, stageRect.top + v.cy);
      pos = freeSpot(type, w.x, w.y);
    }
    const node = makeNode(type, pos);
    S.def.states.splice(Math.max(0, S.def.states.length), 0, node);
    reindex();
    if (after) {
      const t = { event: typeOf(after) === "decision" ? `Ieșire ${(after.transitions || []).length + 1}` : "next", target: node.id };
      (after.transitions || (after.transitions = [])).push(t);
    }
    S.sel = { nodes: new Set([node.id]), edge: "", lane: "" };
    S.settings = false;
    S.rightOpen = true;
    commit({ full: false });
    refreshSelectionClasses();
    announce(`${TYPE_LABEL[type]} adăugată${after ? ` după ${nameOf(after)}` : ""}.`);
    ensureVisible(node.id);
    if (focus) window.setTimeout(() => { const input = el.props.querySelector('[data-pd-prop="title"]'); if (input) { input.focus(); input.select?.(); } }, 30);
    return node;
  }
  function ensureVisible(id) {
    const s = S.byId.get(id);
    if (!s) return;
    const b = boxOf(s);
    const v = visibleArea();
    const sx = b.x * S.view.z + S.view.x, sy = b.y * S.view.z + S.view.y;
    const ex = (b.x + b.w) * S.view.z + S.view.x, ey = (b.y + b.h) * S.view.z + S.view.y;
    let dx = 0, dy = 0;
    if (ex > v.right) dx = v.right - ex - 40; else if (sx < v.left) dx = v.left - sx + 40;
    if (ey > v.bottom) dy = v.bottom - ey - 40; else if (sy < v.top) dy = v.top - sy + 40;
    if (dx || dy) animateView({ x: S.view.x + dx, y: S.view.y + dy, z: S.view.z });
  }
  function connect(srcId, tgtId, { sourcePort = "", targetPort = "" } = {}) {
    const src = S.byId.get(srcId), tgt = S.byId.get(tgtId);
    const reason = connectReason(src, tgt);
    if (reason) { announce(`Conexiunea nu a fost creată: ${reason}`); flashInvalid(); return false; }
    checkpoint();
    const t = { event: typeOf(src) === "decision" ? `Ieșire ${(src.transitions || []).length + 1}` : "next", target: tgtId };
    if (sourcePort) t.sourcePort = sourcePort;
    if (targetPort) t.targetPort = targetPort;
    (src.transitions || (src.transitions = [])).push(t);
    commit({ nodes: [srcId, tgtId] });
    selectEdge(edgeKey(srcId, src.transitions.length - 1));
    announce(`Conexiune creată: ${nameOf(src)} → ${nameOf(tgt)}.`);
    return true;
  }
  function connectReason(src, tgt) {
    if (!src || !tgt) return "alege un element.";
    if (src === tgt) return "un element nu se poate lega de el însuși.";
    if (typeOf(tgt) === "start") return "Startul nu poate avea conexiuni de intrare.";
    if (typeOf(src) === "end") return "Sfârșitul nu poate avea conexiuni de ieșire.";
    if ((src.transitions || []).some((t) => t.target === tgt.id && typeOf(src) !== "decision")) return "conexiunea există deja.";
    return "";
  }
  let invalidTimer = 0;
  function flashInvalid() {
    el.stage.classList.add("is-invalid-drop");
    window.clearTimeout(invalidTimer);
    invalidTimer = window.setTimeout(() => el.stage.classList.remove("is-invalid-drop"), 400);
  }
  /* delete: no modal, toast with „Anulează” (8 s) — Start / Sfârșit refused (US-50 AC-06) */
  function deleteNodes(ids) {
    if (S.viewOnly) return;
    const fixed = ids.map((id) => S.byId.get(id)).filter((s) => s && ["start", "end"].includes(typeOf(s)));
    const removable = ids.filter((id) => { const s = S.byId.get(id); return s && !["start", "end"].includes(typeOf(s)); });
    if (fixed.length && !removable.length) {
      const msg = typeOf(fixed[0]) === "start" ? "Startul procesului nu se poate șterge." : "Sfârșitul procesului nu se poate șterge.";
      window.GEAPToast?.show({ type: "info", message: msg, key: "pd-delete" });
      announce(msg);
      return;
    }
    const before = snapshot();
    checkpoint();
    const gone = new Set(removable);
    const names = removable.map((id) => nameOf(S.byId.get(id)));
    S.def.states = S.def.states.filter((s) => !gone.has(s.id));
    S.def.states.forEach((s) => { if (s.transitions) s.transitions = s.transitions.filter((t) => !gone.has(t.target)); });
    reindex();
    S.sel = { nodes: new Set(), edge: "", lane: "" };
    commit({ full: false });
    const message = removable.length === 1 ? `Elementul «${names[0]}» a fost șters.` : `${removable.length} elemente au fost șterse.`;
    announce(`${message} Ctrl + Z le readuce.`);
    toastUndo(message, before, removable.map((id) => `n:${id}`));
    el.stage.focus({ preventScroll: true });
  }
  function deleteEdge(key) {
    if (S.viewOnly) return;
    const e = edgeOf(key);
    if (!e) return;
    const before = snapshot();
    checkpoint();
    e.src.transitions.splice(e.i, 1);
    S.sel = { nodes: new Set(), edge: "", lane: "" };
    commit({ full: false });
    const message = "Conexiunea a fost ștearsă.";
    announce(`${message} Ctrl + Z o readuce.`);
    toastUndo(message, before, [`e:${key}`]);
  }
  function deleteSelection() {
    if (S.sel.edge) deleteEdge(S.sel.edge);
    else if (S.sel.nodes.size) deleteNodes([...S.sel.nodes]);
  }
  /* the toast's „Anulează” brings the definition back as it was before the delete — only while
     nothing else changed since (later edits: Ctrl + Z walks the whole history) */
  function toastUndo(message, before, what) {
    const after = JSON.stringify(S.def);
    window.GEAPToast?.show({
      type: "info",
      message,
      action: {
        label: "Anulează",
        onClick: () => {
          if (JSON.stringify(S.def) !== after) { undo(); return; }
          S.redo.push(snapshot());
          restore(before);
          S.undo.pop();
          announce("Ștergerea a fost anulată.");
          void what;
        },
      },
      duration: fromDemo() ? 0 : 8000,
      key: "pd-delete",
    });
  }

  /* ---------------------------------------------------------------- „Continuă cu” (Figma 5669:52463) */
  function addMenuHtml(src) {
    const items = PALETTE.map((p) => `
      <li role="none"><button class="e-permits-fo-intent-menu__item e-permits-pd__add-item" type="button" role="menuitem" data-pd-add-type="${p.type}">${glyph(p.type)}<span>${esc(p.label)}</span></button></li>`).join("");
    return `
      <li role="none" class="e-permits-builder__issues-head">Continuă cu</li>
      ${items}
      ${src ? `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-pd__add-item e-permits-pd__add-item--connect" type="button" role="menuitem" data-pd-add-connect>${icon("arrow-right", 20)}<span>Conectează la un element existent</span></button></li>` : ""}`;
  }
  function openAddMenu(srcId, { at = null, dropWorld = null } = {}) {
    if (S.viewOnly) return;
    const src = S.byId.get(srcId);
    if (!src || typeOf(src) === "end") return;
    S.addMenuFor = { srcId, dropWorld };
    el.addMenu.innerHTML = addMenuHtml(src && !dropWorld);
    el.addMenu.hidden = false;
    if (at) S.addMenuAt = { screen: at };
    else {
      const b = boxOf(src);
      const p = PM.portPoint(b, typeOf(src) === "decision" ? "corner-tr" : "right");
      S.addMenuAt = { world: { x: p.x + 16, y: p.y } };
    }
    positionAddMenu();
    nodeEls.get(srcId)?.classList.add("is-menu-open");
    el.addMenu.querySelector("[role='menuitem']")?.focus({ preventScroll: true });
    announce("Continuă cu: alege elementul următor.");
  }
  function positionAddMenu() {
    const at = S.addMenuAt;
    if (!at) return;
    const x = at.screen ? at.screen.x : at.world.x * S.view.z + S.view.x;
    const y = at.screen ? at.screen.y : at.world.y * S.view.z + S.view.y;
    const w = el.addMenu.offsetWidth || 260, h = el.addMenu.offsetHeight || 260;
    el.addMenu.style.left = `${clamp(x + 8, 8, stageRect.width - w - 8)}px`;
    el.addMenu.style.top = `${clamp(y - 24, 8, stageRect.height - h - 8)}px`;
  }
  function closeAddMenu({ restoreFocus = false, cancelled = false } = {}) {
    if (el.addMenu.hidden) return;
    const forId = S.addMenuFor?.srcId;
    el.addMenu.hidden = true;
    S.addMenuAt = null;
    nodeEls.forEach((n) => n.classList.remove("is-menu-open"));
    if (cancelled && S.addMenuFor?.dropWorld) announce("Conexiunea nu a fost creată.");
    S.addMenuFor = null;
    if (restoreFocus && forId) nodeEls.get(forId)?.focus({ preventScroll: true });
  }
  el.addMenu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-pd-add-type]");
    const conn = event.target.closest("[data-pd-add-connect]");
    if (!item && !conn) return;
    const ctx = S.addMenuFor;
    closeAddMenu();
    if (!ctx) return;
    const src = S.byId.get(ctx.srcId);
    if (conn) { startKbConnect(src.id); return; }
    const type = item.dataset.pdAddType;
    if (ctx.dropWorld) {
      const node = addNode(type, { at: ctx.dropWorld });
      if (node) { const t = { event: typeOf(src) === "decision" ? `Ieșire ${(src.transitions || []).length + 1}` : "next", target: node.id }; if (S.dragPort) t.sourcePort = S.dragPort; src.transitions.push(t); commit({ nodes: [src.id, node.id] }); }
    } else addNode(type, { after: src });
  });

  /* keyboard connect (spec F.3): C on a focused node → arrows / Tab cycle the targets → Enter */
  function startKbConnect(srcId) {
    const src = S.byId.get(srcId);
    if (!src || S.viewOnly) return;
    const c = PM.center(boxOf(src));
    const candidates = (S.def.states || []).filter((s) => !connectReason(src, s)).sort((a, b) => {
      const ca = PM.center(boxOf(a)), cb = PM.center(boxOf(b));
      return Math.hypot(ca.x - c.x, ca.y - c.y) - Math.hypot(cb.x - c.x, cb.y - c.y);
    }).map((s) => s.id);
    if (!candidates.length) { announce("Nu există elemente la care să se poată conecta."); return; }
    S.kbConnect = { src: srcId, list: candidates, i: 0 };
    el.stage.classList.add("is-connecting");
    nodeEls.get(srcId)?.focus({ preventScroll: true });
    showKbTarget();
  }
  function showKbTarget() {
    const k = S.kbConnect;
    nodeEls.forEach((n, id) => n.classList.toggle("is-target", Boolean(k) && id === k.list[k.i]));
    if (!k) return;
    const s = S.byId.get(k.list[k.i]);
    const lane = laneById(s.properties?.laneId);
    drawConnectLine(PM.portPoint(boxOf(S.byId.get(k.src)), typeOf(S.byId.get(k.src)) === "decision" ? "corner-tr" : "right"), PM.center(boxOf(s)), true);
    ensureVisible(s.id);
    announce(`Țintă: ${nameOf(s)}${lane ? `, banda ${String(lane.title || "").trim()}` : ""}. Enter leagă, Esc renunță.`);
  }
  function endKbConnect(create) {
    const k = S.kbConnect;
    S.kbConnect = null;
    el.stage.classList.remove("is-connecting");
    nodeEls.forEach((n) => n.classList.remove("is-target"));
    clearOverlay();
    if (create && k) connect(k.src, k.list[k.i]);
    else if (k) { announce("Conexiunea nu a fost creată."); nodeEls.get(k.src)?.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- overlay drawing */
  function clearOverlay() { el.overlaySvg.innerHTML = ""; }
  function drawConnectLine(a, b, valid) {
    const pts = [a, b];
    el.overlaySvg.innerHTML = `<path class="e-permits-pd__connect-line${valid ? " is-valid" : ""}" d="M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y}"/>`;
  }
  function drawMarquee(r) {
    el.overlaySvg.innerHTML = `<rect class="e-permits-pd__marquee" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="2"/>`;
  }

  /* ================================================================ POINTER (one delegated listener)
     pointer events only (no HTML5 DnD: the Mac native-drag hover freeze, FB „Drag sessions”);
     every gesture ends on pointerup / pointercancel / lostpointercapture / blur and releases the
     capture; pointermove only stores the pointer, one animation frame applies it. */
  let drag = null;
  let dragRaf = 0;
  let lastPointer = null;
  const SLOP = 4;
  function frame() {
    dragRaf = 0;
    if (!drag || !lastPointer) return;
    const e = lastPointer;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < SLOP) return;
    if (!drag.moved) { drag.moved = true; onDragStart(); }
    if (drag.kind === "pan") {
      S.view.x = drag.vx + dx;
      S.view.y = drag.vy + dy;
      clampView();
      applyView();
    } else if (drag.kind === "move") moveFrame(e);
    else if (drag.kind === "connect") connectFrame(e);
    else if (drag.kind === "marquee") marqueeFrame(e);
    else if (drag.kind === "palette") paletteFrame(e);
    else if (drag.kind === "reconnect") reconnectFrame(e);
    else if (drag.kind === "lane") laneDragFrame(e);
    else if (drag.kind === "laneResize") laneResizeFrame(e);
  }
  function onDragStart() {
    if (drag.kind === "pan") el.stage.classList.add("is-panning");
    if (drag.kind === "move") { el.stage.classList.add("is-moving"); checkpoint(); }
    if (drag.kind === "connect") el.stage.classList.add("is-connecting");
    if (drag.kind === "palette") el.stage.classList.add("is-adding");
    if (drag.kind === "reconnect") el.stage.classList.add("is-connecting");
    if (drag.kind === "lane") el.stage.classList.add("is-lane-dragging");
    if (drag.kind === "laneResize") { el.stage.classList.add("is-lane-resizing"); checkpoint(); }
  }
  function beginDrag(event, info) {
    drag = { ...info, x0: event.clientX, y0: event.clientY, moved: false, pointerId: event.pointerId, captured: event.target };
    lastPointer = event;
    try { el.stage.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    el.stage.addEventListener("lostpointercapture", onLost);
  }
  function endListeners() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", onCancel);
    el.stage.removeEventListener("lostpointercapture", onLost);
    try { if (drag && el.stage.hasPointerCapture?.(drag.pointerId)) el.stage.releasePointerCapture(drag.pointerId); } catch { /* released */ }
    el.stage.classList.remove("is-panning", "is-moving", "is-connecting", "is-adding", "is-lane-dragging", "is-lane-resizing", "is-connect-invalid");
    markSplit("");
    nodeEls.forEach((n) => n.classList.remove("is-target", "is-target-invalid"));
    if (S.hoverTarget) { S.hoverTarget = ""; el.lanes.querySelectorAll(".is-target").forEach((n) => n.classList.remove("is-target")); }
    q("[data-pd-ghost]", el.world)?.remove();
    clearOverlay();
    cancelAnimationFrame(dragRaf);
    dragRaf = 0;
  }
  function onMove(event) {
    if (!drag) return;
    /* a trusted move with no button held: the gesture is over (FB drag-session rule) */
    if (event.isTrusted && event.buttons === 0 && drag.moved) { onUp(event); return; }
    lastPointer = event;
    if (!dragRaf) dragRaf = requestAnimationFrame(frame);
  }
  function onLost() { if (drag) onUp(lastPointer || { clientX: drag.x0, clientY: drag.y0 }); }
  function onCancel() {
    if (!drag) return;
    const d = drag;
    if ((d.kind === "move" || d.kind === "laneResize") && d.moved) { const snap0 = S.undo.pop(); if (snap0) restore(snap0); }
    drag = null;
    endListeners();
  }
  function onUp(event) {
    if (!drag) return;
    const d = drag;
    lastPointer = event;
    if (d.moved) frame();
    drag = null;
    endListeners();
    if (d.kind === "pan") return;
    if (d.kind === "move") return d.moved ? endMove(d) : clickNode(d, event);
    if (d.kind === "connect") return d.moved ? endConnect(d, event) : null;
    if (d.kind === "marquee") return d.moved ? endMarquee(d) : (d.add ? null : clearSelection());
    if (d.kind === "palette") return d.moved ? endPalette(d, event) : addFromPalette(d.type);
    if (d.kind === "reconnect") return d.moved ? endReconnect(d) : null;
    if (d.kind === "lane") { if (d.moved) endLaneDrag(d); else { selectLane(d.lane); S.rightOpen = true; renderChrome(); renderPanel(); } return null; }
    if (d.kind === "laneResize") {
      if (!d.moved || d.h === d.h0) { if (d.moved) S.undo.pop(); return null; }
      S.redo = [];
      commit({ full: true });
      const lane = laneById(d.lane);
      announce(`Banda ${String(lane?.title || "").trim()} are acum ${d.h} px.`);
    }
    return null;
  }

  el.stage.addEventListener("pointerdown", (event) => {
    if (S.mode !== "build") return;
    if (event.target.closest(".e-permits-pd__float, .e-permits-pd__toolbar, .e-permits-pd__minimap, .e-permits-pd__pill, [data-pd-add-menu], .e-permits-pd__json")) return;
    if (!el.addMenu.hidden) closeAddMenu();
    if (S.kbConnect) endKbConnect(false);
    const middle = event.button === 1;
    if (event.button !== 0 && !middle) return;
    const panning = middle || S.space || S.tool === "pan";
    if (panning) { event.preventDefault(); beginDrag(event, { kind: "pan", vx: S.view.x, vy: S.view.y }); return; }
    const end = event.target.closest("[data-pd-edge-end]");
    if (end && S.sel.edge && !S.viewOnly) { event.preventDefault(); beginDrag(event, { kind: "reconnect", key: S.sel.edge, end: end.dataset.pdEdgeEnd }); return; }
    const resize = event.target.closest("[data-pd-lane-resize]");
    if (resize && !S.viewOnly) {
      event.preventDefault();
      const l = PM.lanesLayout(S.def).find((x) => x.id === resize.dataset.pdLaneResize);
      if (l) beginDrag(event, { kind: "laneResize", lane: l.id, h0: l.height, h: l.height });
      return;
    }
    const port = event.target.closest("[data-pd-port]");
    const nodeEl = event.target.closest("[data-pd-node]");
    if (event.target.closest("[data-pd-open-sub]") && nodeEl) { event.preventDefault(); const id = nodeEl.dataset.pdNode; window.setTimeout(() => drillIn(id), 0); return; }
    if (port && nodeEl && !S.viewOnly) {
      event.preventDefault();
      const s = S.byId.get(nodeEl.dataset.pdNode);
      if (typeOf(s) === "end") return;
      beginDrag(event, { kind: "connect", src: s.id, port: port.dataset.pdPort });
      return;
    }
    if (event.target.closest("[data-pd-plus]") && nodeEl && !S.viewOnly) {
      event.preventDefault();
      const id = nodeEl.dataset.pdNode;
      window.setTimeout(() => openAddMenu(id), 0);
      return;
    }
    if (nodeEl) {
      const id = nodeEl.dataset.pdNode;
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      if (additive) { selectNodes([id], { toggle: true }); if (!S.sel.nodes.has(id)) return; }
      else if (!S.sel.nodes.has(id)) selectNodes([id]);
      if (S.viewOnly) { beginDrag(event, { kind: "pan", vx: S.view.x, vy: S.view.y, clickNode: id }); return; }
      const ids = [...S.sel.nodes];
      beginDrag(event, { kind: "move", id, additive, ids, start: ids.map((nid) => { const s = S.byId.get(nid); return { id: nid, x: s.properties.x, y: s.properties.y }; }) });
      return;
    }
    const edgeHit = event.target.closest("[data-pd-edge], [data-pd-edge-label]");
    if (edgeHit) {
      const key = edgeHit.dataset.pdEdge || edgeHit.dataset.pdEdgeLabel;
      selectEdge(key);
      if (S.viewOnly) beginDrag(event, { kind: "pan", vx: S.view.x, vy: S.view.y });
      return;
    }
    const rail = event.target.closest("[data-pd-lane-select]");
    if (rail) {
      if (S.viewOnly) return;
      beginDrag(event, { kind: "lane", lane: rail.dataset.pdLaneSelect, at: -1 });
      return;
    }
    if (event.target.closest("[data-pd-add-lane], [data-pd-pool-select]")) return;
    /* empty canvas: view-only = pan; edit = marquee (Space / H / middle button pan) */
    if (S.viewOnly) { beginDrag(event, { kind: "pan", vx: S.view.x, vy: S.view.y, clear: true }); return; }
    event.preventDefault();
    el.stage.focus({ preventScroll: true });
    beginDrag(event, { kind: "marquee", add: event.shiftKey, base: event.shiftKey ? new Set(S.sel.nodes) : new Set() });
  });
  /* a click without movement */
  function clickNode(d) {
    if (d.additive) return;
    if (S.sel.nodes.size > 1) selectNodes([d.id]);
    nodeEls.get(d.id)?.focus({ preventScroll: true });
    rovingNode(d.id);
  }
  /* view-only: a click on the empty canvas (no pan) deselects */
  el.stage.addEventListener("click", (event) => {
    if (!S.viewOnly || S.mode !== "build") return;
    if (event.target === el.stage || event.target.closest(".e-permits-pd__lanes")) {
      if (!event.target.closest("[data-pd-lane-select]")) clearSelection();
    }
  });
  el.stage.addEventListener("dblclick", (event) => {
    const nodeEl = event.target.closest("[data-pd-node]");
    if (!nodeEl || S.viewOnly) return;
    S.rightOpen = true;
    renderChrome();
    renderPanel();
    const input = el.props.querySelector('[data-pd-prop="title"]');
    input?.focus();
    input?.select?.();
  });
  el.lanes.addEventListener("click", (event) => {
    if (event.target.closest("[data-pd-add-lane]")) { addLane(); return; }
    if (event.target.closest("[data-pd-pool-select]")) { selectPool(); return; }
    /* a pointer press on the rail is a drag gesture (select on release); keyboard / AT clicks select here */
    const laneBtn = event.target.closest("[data-pd-lane-select]");
    if (laneBtn && (event.detail === 0 || S.viewOnly)) { selectLane(laneBtn.dataset.pdLaneSelect); S.rightOpen = true; renderChrome(); renderPanel(); }
  });
  /* a label is a button: Enter / Space selects its connection (the pointer path selects on pointerdown) */
  el.labels.addEventListener("click", (event) => {
    const label = event.target.closest("[data-pd-edge-label]");
    if (label && event.detail === 0) selectEdge(label.dataset.pdEdgeLabel);
  });
  function addLane() {
    if (S.viewOnly || (S.def.lanes || []).length >= PM.LANE_MAX) return;
    checkpoint();
    S.def.lanes = S.def.lanes || [];
    let n = S.def.lanes.length + 1;
    while (S.def.lanes.some((l) => l.id === `lane${n}`)) n += 1;
    const lane = { id: `lane${n}`, title: `Bandă ${S.def.lanes.length + 1}`, role: "", height: 160 };
    S.def.lanes.push(lane);
    commit({ full: false });
    renderPalette();
    selectLane(lane.id);
    announce(`${lane.title} adăugată.`);
    window.setTimeout(() => { const input = el.props.querySelector('[data-pd-prop="lane.title"]'); input?.focus(); input?.select?.(); }, 30);
  }

  /* ---- move (snap 20 on the centre, lane follows, attached edges reroute on the same frame) */
  function moveFrame(e) {
    const dx = (e.clientX - drag.x0) / S.view.z, dy = (e.clientY - drag.y0) / S.view.z;
    const lanes = PM.lanesLayout(S.def);
    const bottom = lanes.length ? lanes[lanes.length - 1].top + lanes[lanes.length - 1].height : Infinity;
    let laneHit = "";
    drag.start.forEach((st) => {
      const s = S.byId.get(st.id);
      const b = boxOf(s);
      const a = PM.SIZE[b.type];
      const cx = snap(st.x + a.w / 2 + dx), cy0 = snap(st.y + a.h / 2 + dy);
      const cy = lanes.length ? clamp(cy0, b.h / 2 + 4, bottom - b.h / 2 - 4) : cy0;
      PM.place(s, S.def, cx, cy);
      const lane = PM.laneAt(S.def, cy);
      if (lane && s.properties.laneId !== lane.id) s.properties.laneId = lane.id;
      if (st.id === drag.id && lane) laneHit = lane.id;
      placeNode(nodeEls.get(st.id), s);
    });
    if (laneHit !== S.hoverTarget.replace("lane:", "")) {
      el.lanes.querySelectorAll(".is-target").forEach((n) => n.classList.remove("is-target"));
      S.hoverTarget = laneHit ? `lane:${laneHit}` : "";
      if (laneHit) el.lanes.querySelector(`[data-pd-lane="${CSS.escape(laneHit)}"]`)?.classList.add("is-target");
    }
    renderEdges(drag.ids);
  }
  function endMove(d) {
    const moved = d.start.some((st) => { const s = S.byId.get(st.id); return s.properties.x !== st.x || s.properties.y !== st.y; });
    if (!moved) { S.undo.pop(); return; }
    /* a move keeps the original numbers of nodes that did not move (the seed is not on the grid) */
    commit({ full: false });
    const s = S.byId.get(d.id);
    const lane = laneById(s.properties.laneId);
    announce(d.ids.length > 1 ? `${d.ids.length} elemente mutate.` : `${nameOf(s)} mutat${lane ? ` în banda ${String(lane.title || "").trim()}` : ""}.`);
  }

  /* ---- connect from a port dot: dashed brand line; valid target halo; snap to a port within 24 */
  function nodeAtPoint(cx, cy) {
    const hit = document.elementsFromPoint(cx, cy).find((n) => n.closest?.("[data-pd-node]") && el.nodes.contains(n));
    return hit ? hit.closest("[data-pd-node]").dataset.pdNode : "";
  }
  function connectFrame(e) {
    const src = S.byId.get(drag.src);
    const from = PM.portPoint(boxOf(src), drag.port);
    const w = toWorld(e.clientX, e.clientY);
    let to = w;
    let targetId = nodeAtPoint(e.clientX, e.clientY);
    /* near a port of another node (24 px) counts too */
    if (!targetId) {
      for (const s of S.def.states) {
        if (s.id === src.id) continue;
        const near = PM.nearestPort(boxOf(s), w);
        if (near.dist * S.view.z <= 24) { targetId = s.id; break; }
      }
    }
    const tgt = targetId ? S.byId.get(targetId) : null;
    const reason = tgt ? connectReason(src, tgt) : "";
    if (tgt && !reason) { const near = PM.nearestPort(boxOf(tgt), w); to = PM.portPoint(boxOf(tgt), near.port); drag.targetPort = near.dist * S.view.z <= 24 ? near.port : ""; }
    drag.target = tgt && !reason ? targetId : "";
    drag.invalid = Boolean(tgt && reason);
    nodeEls.forEach((n, id) => { n.classList.toggle("is-target", id === drag.target); n.classList.toggle("is-target-invalid", Boolean(tgt) && Boolean(reason) && id === targetId); });
    el.stage.classList.toggle("is-connect-invalid", drag.invalid);
    drawConnectLine(from, to, Boolean(drag.target));
  }
  function endConnect(d, event) {
    el.stage.classList.remove("is-connect-invalid");
    if (d.target) { connect(d.src, d.target, { sourcePort: d.port, targetPort: d.targetPort || "" }); return; }
    if (d.invalid) {
      const tgt = S.byId.get(nodeAtPoint(event.clientX, event.clientY));
      const reason = connectReason(S.byId.get(d.src), tgt);
      flashInvalid();
      announce(`Conexiunea nu a fost creată${reason ? `: ${reason}` : "."}`);
      return;
    }
    /* released on the empty canvas: „Continuă cu” at the drop point (Esc = nothing created) */
    const w = toWorld(event.clientX, event.clientY);
    S.dragPort = d.port;
    const at = { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top };
    /* after the click that ends this gesture (the shell closes stack menus on document clicks) */
    window.setTimeout(() => openAddMenu(d.src, { at, dropWorld: w }), 0);
  }

  /* ---- marquee */
  function marqueeFrame(e) {
    const a = toWorld(drag.x0, drag.y0), b = toWorld(e.clientX, e.clientY);
    const r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
    drag.rect = r;
    drawMarquee(r);
    const inside = new Set(drag.base);
    (S.def.states || []).forEach((s) => { const bx = boxOf(s); if (bx.x < r.x + r.w && bx.x + bx.w > r.x && bx.y < r.y + r.h && bx.y + bx.h > r.y) inside.add(s.id); });
    nodeEls.forEach((n, id) => n.classList.toggle("is-selected", inside.has(id)));
    drag.inside = inside;
  }
  function endMarquee(d) {
    const ids = [...(d.inside || [])];
    selectNodes(ids);
    announce(ids.length ? `${ids.length} ${ids.length === 1 ? "element selectat" : "elemente selectate"}.` : "Nimic selectat.");
  }

  /* ---- palette: click = add (after the selected node, connected); drag = ghost + snap preview */
  el.palette.addEventListener("pointerdown", (event) => {
    const item = event.target.closest("[data-pd-palette-item]");
    if (!item || event.button !== 0 || S.viewOnly) return;
    if (item.getAttribute("aria-disabled") === "true") return;
    event.preventDefault();
    beginDrag(event, { kind: "palette", type: item.dataset.pdPaletteItem, item });
  });
  function addFromPalette(type) {
    if (type === "lanes") { addLane(); return; }
    const sel = [...S.sel.nodes];
    const after = sel.length === 1 ? S.byId.get(sel[0]) : null;
    addNode(type, after && typeOf(after) !== "end" ? { after } : {});
  }
  function paletteFrame(e) {
    const type = drag.type;
    let ghost = q("[data-pd-ghost]", el.world);
    const inStage = (() => { const r = el.stage.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; })() && !document.elementFromPoint(e.clientX, e.clientY)?.closest(".e-permits-pd__float, .e-permits-pd__toolbar, .e-permits-pd__minimap");
    if (type === "lanes") { drag.valid = inStage; el.stage.classList.toggle("is-connect-invalid", !inStage); return; }
    const size = PM.VIEW[type];
    const w = toWorld(e.clientX, e.clientY);
    const lanes = PM.lanesLayout(S.def);
    const lane = PM.laneAt(S.def, w.y);
    const valid = inStage && (!lanes.length || Boolean(lane)) && w.x > 0;
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.dataset.pdGhost = "";
      ghost.className = `e-permits-pd__node e-permits-pd__node--${type} e-permits-pd__ghost`;
      ghost.innerHTML = `<span class="e-permits-pd__shape">${type === "activity" || type === "subprocess" ? `<span class="e-permits-pd__name">${esc(NEW_TITLE[type])}</span>` : ""}</span>`;
      el.world.appendChild(ghost);
    }
    const x = snap(w.x) - size.w / 2, y = snap(w.y) - size.h / 2;
    ghost.style.transform = `translate(${x}px, ${y}px)`;
    ghost.style.width = `${size.w}px`;
    ghost.style.height = `${size.h}px`;
    ghost.classList.toggle("is-invalid", !valid);
    el.stage.classList.toggle("is-connect-invalid", !valid);
    drag.valid = valid;
    drag.at = { x: x + size.w / 2, y: y + size.h / 2 };
    /* an Eveniment / Activitate over a connection splits it on drop (US-188 AC-02) */
    drag.split = valid && (type === "event" || type === "activity") ? edgeNear(w) : "";
    markSplit(drag.split);
    ghost.classList.toggle("is-splitting", Boolean(drag.split));
    const id = lane ? lane.id : "";
    if (`lane:${id}` !== S.hoverTarget) {
      el.lanes.querySelectorAll(".is-target").forEach((n) => n.classList.remove("is-target"));
      S.hoverTarget = id ? `lane:${id}` : "";
      if (id && valid) el.lanes.querySelector(`[data-pd-lane="${CSS.escape(id)}"]`)?.classList.add("is-target");
    }
  }
  function endPalette(d) {
    el.stage.classList.remove("is-connect-invalid");
    if (!d.valid) { announce("Elementul nu a fost adăugat: trage-l într-o bandă a procesului."); return; }
    if (d.type === "lanes") { addLane(); return; }
    if (d.split) { splitAt(d.split, d.type, d.at); return; }
    addNode(d.type, { at: d.at });
  }

  /* ---- wheel: Ctrl/⌘ (and trackpad pinch) = zoom at the cursor; otherwise pan (two fingers) */
  el.stage.addEventListener("wheel", (event) => {
    if (S.mode !== "build") return;
    if (event.target.closest(".e-permits-pd__float, [data-pd-add-menu], .e-permits-pd__json")) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const k = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025));
      setZoom(S.view.z * k, { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top });
      return;
    }
    const m = event.deltaMode === 1 ? 16 : 1;
    S.view.x -= (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * m;
    S.view.y -= (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * m;
    clampView();
    requestView();
  }, { passive: false });

  /* ================================================================ KEYBOARD (spec F.17) */
  const typingTarget = (t) => Boolean(t?.closest?.("input, textarea, select, [contenteditable='true']"));
  const onCanvas = (t) => t === el.stage || Boolean(t?.closest?.("[data-pd-node], [data-pd-edge-label]")) || t === root || t === document.body;
  function flowOrder() {
    const out = [];
    const seen = new Set();
    const queue = [S.def.initialState];
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id) || !S.byId.has(id)) continue;
      seen.add(id);
      out.push(id);
      (S.byId.get(id).transitions || []).forEach((t) => queue.push(t.target));
    }
    (S.def.states || []).forEach((s) => { if (!seen.has(s.id)) out.push(s.id); });
    return out;
  }
  function nudge(dx, dy) {
    const ids = [...S.sel.nodes];
    if (!ids.length || S.viewOnly) return;
    checkpoint();
    const lanes = PM.lanesLayout(S.def);
    const bottom = lanes.length ? lanes[lanes.length - 1].top + lanes[lanes.length - 1].height : Infinity;
    ids.forEach((id) => {
      const s = S.byId.get(id);
      const b = boxOf(s);
      const cx = snap(b.x + b.w / 2) + dx;
      const cy = lanes.length ? clamp(snap(b.y + b.h / 2) + dy, b.h / 2 + 4, bottom - b.h / 2 - 4) : snap(b.y + b.h / 2) + dy;
      PM.place(s, S.def, cx, cy);
      const lane = PM.laneAt(S.def, cy);
      if (lane) s.properties.laneId = lane.id;
    });
    commit({ nodes: ids, panel: true });
    ensureVisible(ids[0]);
    const s = S.byId.get(ids[0]);
    const lane = laneById(s.properties.laneId);
    announce(`${ids.length > 1 ? `${ids.length} elemente mutate` : `${nameOf(s)} mutat`}${lane ? `, banda ${String(lane.title || "").trim()}` : ""}.`);
  }
  window.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("is-active")) return;
    /* a dialog above the designer (confirm / close guard) handles its own keys */
    const other = [...document.querySelectorAll(".modal-overlay.is-active")].filter((n) => n !== overlay && !n.contains(overlay)).pop();
    if (other) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); window.__modal?.close?.(`#${other.id}`); }
      return;
    }
    const target = event.target;
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === "Escape") {
      /* Esc never closes the designer (FB rule): menu → connect / drag → deselect */
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!el.addMenu.hidden) { closeAddMenu({ restoreFocus: true, cancelled: true }); return; }
      const openMenu = root.querySelector("[data-stack-menu]:not([hidden])");
      if (openMenu) {
        openMenu.hidden = true;
        const trigger = root.querySelector(`[aria-controls="${openMenu.id}"]`);
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
        return;
      }
      if (S.kbConnect) { endKbConnect(false); return; }
      if (drag) { onCancel(); return; }
      if (S.mode !== "build") { setMode("build"); return; }
      if (typingTarget(target)) { el.stage.focus({ preventScroll: true }); return; }
      if (S.settings) { S.settings = false; renderChrome(); renderPanel(); return; }
      clearSelection();
      return;
    }
    if (mod && event.key === "\\") { event.preventDefault(); event.stopPropagation(); togglePanels(); return; }
    if (mod && (event.key === "z" || event.key === "Z" || event.key === "y") && !typingTarget(target)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "y" || event.shiftKey) redo(); else undo();
      return;
    }
    if (mod && (event.key === "=" || event.key === "+")) { event.preventDefault(); event.stopPropagation(); setZoom(snapStep(S.view.z, 1)); return; }
    if (mod && event.key === "-") { event.preventDefault(); event.stopPropagation(); setZoom(snapStep(S.view.z, -1)); return; }
    if (mod && event.key === "0") { event.preventDefault(); event.stopPropagation(); setZoom(1); return; }
    if (S.mode !== "build") return;
    /* keyboard connect mode */
    if (S.kbConnect) {
      const k = S.kbConnect;
      if (["ArrowRight", "ArrowDown", "Tab"].includes(event.key) && !(event.key === "Tab" && event.shiftKey)) { event.preventDefault(); event.stopPropagation(); k.i = (k.i + 1) % k.list.length; showKbTarget(); return; }
      if (["ArrowLeft", "ArrowUp"].includes(event.key) || (event.key === "Tab" && event.shiftKey)) { event.preventDefault(); event.stopPropagation(); k.i = (k.i - 1 + k.list.length) % k.list.length; showKbTarget(); return; }
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); endKbConnect(true); return; }
      return;
    }
    /* in the list view the list owns the arrows / Enter (its own listener); L returns to the diagram */
    if (listEl.contains(target)) { if (!mod && !event.altKey && event.key.toLowerCase() === "l" && !listForced()) { event.preventDefault(); setListView(false); } return; }
    if (typingTarget(target) || !onCanvas(target)) return;
    const nodeEl = target.closest?.("[data-pd-node]");
    const focusedId = nodeEl?.dataset.pdNode || "";
    if (event.key === "Tab" && (focusedId || target === el.stage)) {
      const order = flowOrder();
      const i = focusedId ? order.indexOf(focusedId) : -1;
      const next = event.shiftKey ? order[i - 1] : order[i + 1];
      if (next === undefined && focusedId) return; /* leave the diagram */
      event.preventDefault();
      event.stopPropagation();
      const id = next || order[0];
      rovingNode(id);
      nodeEls.get(id)?.focus({ preventScroll: true });
      ensureVisible(id);
      return;
    }
    if (mod && (event.key === "c" || event.key === "C") && S.sel.nodes.size && !S.viewOnly) { event.preventDefault(); event.stopPropagation(); copySelection(); return; }
    if (mod && (event.key === "v" || event.key === "V") && S.clip && !S.viewOnly) { event.preventDefault(); event.stopPropagation(); pasteClip(); return; }
    if (mod && (event.key === "d" || event.key === "D") && S.sel.nodes.size && !S.viewOnly) { event.preventDefault(); event.stopPropagation(); duplicateSelection([...S.sel.nodes]); return; }
    if (mod && (event.key === "a" || event.key === "A")) { event.preventDefault(); event.stopPropagation(); selectNodes((S.def.states || []).map((s) => s.id)); announce(`${S.def.states.length} elemente selectate.`); return; }
    if (mod && event.key === "Enter" && focusedId) { event.preventDefault(); event.stopPropagation(); openAddMenu(focusedId); return; }
    if ((event.key === "Delete" || event.key === "Backspace") && !S.viewOnly) { event.preventDefault(); event.stopPropagation(); deleteSelection(); return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[event.key] && S.sel.nodes.size && !S.viewOnly) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? GRID * 5 : GRID;
      nudge(arrows[event.key][0] * step, arrows[event.key][1] * step);
      return;
    }
    if (event.key === "Enter" && focusedId) { event.preventDefault(); event.stopPropagation(); selectNodes([focusedId], { focus: true }); S.rightOpen = true; renderChrome(); renderPanel(); return; }
    if (event.key === "F2" && focusedId && !S.viewOnly) { event.preventDefault(); selectNodes([focusedId]); S.rightOpen = true; renderChrome(); renderPanel(); const input = el.props.querySelector('[data-pd-prop="title"]'); input?.focus(); input?.select?.(); return; }
    if (mod || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "c" && focusedId && !S.viewOnly) { event.preventDefault(); startKbConnect(focusedId); return; }
    if (key === "v" && !S.viewOnly) { S.tool = "select"; renderChrome(); return; }
    if (key === "h" && !S.viewOnly) { S.tool = "pan"; renderChrome(); return; }
    if (key === "1" || (event.shiftKey && event.key === "!")) { event.preventDefault(); fit(); return; }
    if (key === "2" || (event.shiftKey && event.key === "@")) { event.preventDefault(); fitSelection(); return; }
    if (key === "m") { toggleMinimap(); return; }
    if (key === "l" && !listForced()) { event.preventDefault(); setListView(!S.listView); return; }
    if (event.key === "[" && !S.viewOnly) { togglePanels("left"); return; }
    if (event.key === "]") { togglePanels("right"); return; }
    if (event.key === " " && !S.space) { event.preventDefault(); S.space = true; el.stage.classList.add("is-space"); }
  }, true);
  window.addEventListener("keyup", (event) => {
    if (event.key === " " && S.space) { S.space = false; el.stage.classList.remove("is-space"); }
  });
  /* a click that no pointer started (keyboard, screen reader, demo link) selects too */
  el.nodes.addEventListener("click", (event) => {
    const nodeEl = event.target.closest("[data-pd-node]");
    if (nodeEl && event.detail === 0) { selectNodes([nodeEl.dataset.pdNode], { focus: true }); S.rightOpen = true; renderChrome(); renderPanel(); }
  });
  el.palette.addEventListener("click", (event) => {
    const item = event.target.closest("[data-pd-palette-item]");
    if (item && event.detail === 0 && item.getAttribute("aria-disabled") !== "true" && !S.viewOnly) addFromPalette(item.dataset.pdPaletteItem);
  });
  el.nodes.addEventListener("focusin", (event) => {
    const nodeEl = event.target.closest("[data-pd-node]");
    if (nodeEl) rovingNode(nodeEl.dataset.pdNode);
  });

  /* ---------------------------------------------------------------- view-only toggle */
  el.viewOnly.addEventListener("change", () => {
    if (S.forced) { el.viewOnly.checked = true; return; }
    S.viewOnly = el.viewOnly.checked;
    closeAddMenu();
    if (S.kbConnect) endKbConnect(false);
    renderAll();
    announce(S.viewOnly ? "Doar vizualizare: editarea este oprită." : "Editare pornită.");
  });

  /* ---------------------------------------------------------------- save / cancel / publish */
  function save() {
    if (S.viewOnly || !S.dirty) return false;
    S.issues = PM.validate(S.def, validationContext());
    renderIssues();
    const blocking = S.issues.filter(PM.blocksSave);
    if (blocking.length) {
      window.GEAPToast?.show({ type: "error", message: `Nu se poate salva: ${blocking[0].message}${blocking.length > 1 ? ` (și încă ${blocking.length - 1})` : ""}`, key: "pd-save" });
      window.setTimeout(() => { if (el.issues.hidden) el.errors.click(); }, 0);
      return false;
    }
    S.def.version = PM.bumpPatch(S.def.version || S.rec.version);
    const text = PM.serialize(S.def);
    const rec = S.rec;
    rec.text = text;
    rec.title = S.def.title || rec.title;
    rec.version = S.def.version;
    rec.status = "Schiță";
    rec.modifiedOn = localStamp();
    rec.modifiedBy = currentUser();
    rec.draftText = "";
    rec.history = [...(rec.history || []).filter((h) => h.status === "Publicat"), { version: rec.version, status: "Schiță", at: rec.modifiedOn, by: rec.modifiedBy, note: "Schiță salvată.", text }];
    S.baseText = text;
    S.dirty = false;
    saveDb();
    renderAll();
    window.GEAPToast?.show({ type: "success", message: `Schița v${rec.version} a fost salvată.${rec.publishedVersion ? ` Serviciile folosesc în continuare v${rec.publishedVersion}.` : ""}`, key: "pd-save" });
    announce(`Schița v${rec.version} a fost salvată.`);
    return true;
  }
  el.save.addEventListener("click", save);
  el.cancel.addEventListener("click", () => {
    if (!S.dirty) return;
    ui().askConfirm?.({ title: "Renunți la modificări?", text: "Diagrama revine la ultima versiune salvată. Modificările nesalvate se pierd.", confirmLabel: "Renunță la modificări", destructive: true, cancelLabel: "Rămâi" }, () => {
      S.def = PM.parse(S.baseText);
      reindex();
      S.sel = { nodes: new Set(), edge: "", lane: "" };
      S.undo = [];
      S.redo = [];
      S.dirty = false;
      S.rec.draftText = "";
      saveDb();
      renderAll();
      announce("Modificările au fost anulate.");
    });
  });
  /* Publică (spec F.14): from a saved state (dirty → save first); the modal validates, shows the effect
     on request types and takes the change note; errors list there with Publică disabled */
  function publish() {
    if (S.viewOnly) return;
    if (S.dirty && !save()) return;
    if (S.rec.status === "Publicat" && S.rec.publishedVersion === S.rec.version && !S.dirty) {
      window.GEAPToast?.show({ type: "info", message: `Versiunea v${S.rec.version} este deja publicată.`, key: "pd-save" });
      return;
    }
    openPublishModal();
  }

  /* ================================================================ BATCH 2 — lanes, split, re-connect, sub-processes */

  /* ---- lanes: order (↑ ↓ / rail drag), height (handle / input), delete (empty: undo toast; else move-to prompt) */
  function moveLane(id, dir) {
    const order = (S.def.lanes || []).map((l) => l.id);
    const at = order.indexOf(id);
    if (at < 0 || at + dir < 0 || at + dir >= order.length) return;
    order.splice(at, 1);
    order.splice(at + dir, 0, id);
    if (edit(() => { PM.reorderLanes(S.def, order); })) {
      const lane = laneById(id);
      announce(`Banda ${String(lane.title || "").trim()} este acum a ${at + dir + 1}-a din ${order.length}.`);
      window.setTimeout(() => el.props.querySelector(`[data-pd-act="lane-${dir < 0 ? "up" : "down"}"][data-id="${CSS.escape(id)}"]:not([aria-disabled="true"])`)?.focus(), 30);
    }
  }
  const laneModal = document.createElement("div");
  laneModal.className = "modal-overlay e-permits-confirm-overlay";
  laneModal.id = "pd-lane-modal";
  laneModal.setAttribute("aria-hidden", "true");
  document.body.appendChild(laneModal);
  function askDeleteLane(id) {
    const lane = laneById(id);
    if (!lane || S.viewOnly || (S.def.lanes || []).length <= 1) return;
    const inside = (S.def.states || []).filter((s) => s.properties?.laneId === id);
    const title = String(lane.title || "Bandă").trim();
    const remove = (moveTo = "") => {
      const before = snapshot();
      if (!edit(() => { PM.removeLane(S.def, id, moveTo); })) return;
      S.sel = { nodes: new Set(), edge: "", lane: "", pool: false };
      renderPalette();
      refreshSelectionClasses();
      renderChrome();
      renderPanel();
      toastUndo(moveTo ? `Banda «${title}» a fost ștearsă; ${inside.length} ${inside.length === 1 ? "element mutat" : "elemente mutate"} în «${String(laneById(moveTo)?.title || "").trim()}».` : `Banda «${title}» a fost ștearsă.`, before, []);
    };
    if (!inside.length) {
      ui().askConfirm?.({ title: `Ștergi banda «${title}»?`, text: "Banda este goală. Benzile de dedesubt urcă în locul ei.", confirmLabel: "Șterge banda", destructive: true }, () => remove());
      return;
    }
    const others = (S.def.lanes || []).filter((l) => l.id !== id);
    const near = others[Math.max(0, (S.def.lanes || []).indexOf(lane) - 1)] || others[0];
    laneModal.innerHTML = `
      <div class="modal modal--md e-permits-passport__modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pd-lane-title" aria-describedby="pd-lane-text">
        <button type="button" class="modal-close" data-close aria-label="Închide"><span class="d-inline-flex">${icon("cross-large", 16).replace('class="icon"', 'class="icon small"')}</span></button>
        <div class="modal--header"><h2 class="modal--header-title" id="pd-lane-title">Ștergi banda «${esc(title)}»?</h2></div>
        <div class="modal-content">
          <p class="e-permits-passport__lead" id="pd-lane-text">Banda conține ${inside.length} ${inside.length === 1 ? "element" : "elemente"}. Mută-le în altă bandă, apoi banda se șterge.</p>
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="pd-lane-move">Mută elementele în${reqMark()}</label>
            ${ui().renderFoSelectControl?.({ id: "pd-lane-move", attrs: "data-pd-lane-move", optionsHtml: others.map((l) => `<option value="${esc(l.id)}"${l === near ? " selected" : ""}>${esc(String(l.title || l.id).trim())} · ${esc(roleName(l.role))}</option>`).join("") }) || ""}
          </div>
        </div>
        <div class="modal--footer"><div class="modal-buttons">
          <button class="btn btn-neutral btn-rounded" type="button" data-close>Anulează</button>
          <button class="btn btn-destructive btn-rounded" type="button" data-pd-lane-confirm>Mută și șterge banda</button>
        </div></div>
      </div>`;
    laneModal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => window.__modal?.close?.("#pd-lane-modal")));
    laneModal.querySelector("[data-pd-lane-confirm]").addEventListener("click", () => {
      const to = laneModal.querySelector("[data-pd-lane-move]")?.value || near.id;
      window.__modal?.close?.("#pd-lane-modal");
      remove(to);
    });
    window.__modal?.open?.("#pd-lane-modal");
  }
  /* rail drag = reorder (indicator line between lanes); handle drag = height (snap 20, nodes below follow) */
  function laneDragFrame(e) {
    const w = toWorld(e.clientX, e.clientY);
    const layout = PM.lanesLayout(S.def);
    let at = layout.length;
    for (let i = 0; i < layout.length; i += 1) { if (w.y < layout[i].top + layout[i].height / 2) { at = i; break; } }
    drag.at = at;
    const y = at < layout.length ? layout[at].top : layout[layout.length - 1].top + layout[layout.length - 1].height;
    el.overlaySvg.innerHTML = `<path class="e-permits-pd__drop-line" d="M${-RAIL} ${y} L${poolWidth()} ${y}"/>`;
  }
  function endLaneDrag(d) {
    const order = (S.def.lanes || []).map((l) => l.id);
    const from = order.indexOf(d.lane);
    let to = d.at > from ? d.at - 1 : d.at;
    to = clamp(to, 0, order.length - 1);
    if (to === from) return;
    order.splice(from, 1);
    order.splice(to, 0, d.lane);
    if (edit(() => { PM.reorderLanes(S.def, order); })) announce(`Banda ${String(laneById(d.lane).title || "").trim()} este acum a ${to + 1}-a.`);
  }
  function laneResizeFrame(e) {
    const dy = (e.clientY - drag.y0) / S.view.z;
    const h = PM.resizeLane(S.def, drag.lane, drag.h0 + dy);
    if (h === drag.h) return;
    drag.h = h;
    renderLanes();
    (S.def.states || []).forEach((st) => placeNode(nodeEls.get(st.id), st));
    renderEdges();
  }

  /* ---- drop on a connection splits it (US-188 AC-02): A → N → B */
  function distToRoute(pts, p) {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = dx * dx + dy * dy || 1;
      const k = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len, 0, 1);
      best = Math.min(best, Math.hypot(a.x + dx * k - p.x, a.y + dy * k - p.y));
    }
    return best;
  }
  function edgeNear(p, maxScreen = 12) {
    let key = "", best = maxScreen / S.view.z;
    routes.forEach((pts, k) => {
      const e = edgeOf(k);
      if (!e || !e.tgt) return;
      const d = distToRoute(pts, p);
      if (d < best) { best = d; key = k; }
    });
    return key;
  }
  function markSplit(key) {
    if (S.split === key) return;
    if (S.split) edgeEls.get(S.split)?.g.classList.remove("is-split-target");
    S.split = key;
    if (key) edgeEls.get(key)?.g.classList.add("is-split-target");
  }
  function splitAt(key, type, at) {
    const e = edgeOf(key);
    if (!e || !e.tgt || S.viewOnly) return null;
    checkpoint();
    const node = makeNode(type, freeSpot(type, at.x, at.y));
    node.transitions = [];
    PM.splitEdge(S.def, e.src.id, e.i, node);
    reindex();
    S.sel = { nodes: new Set([node.id]), edge: "", lane: "", pool: false };
    S.settings = false;
    S.rightOpen = true;
    S.tab = type === "event" ? "processor" : "general";
    commit();
    refreshSelectionClasses();
    announce(`Conexiunea a fost împărțită: ${nameOf(e.src)} → ${nameOf(node)} → ${nameOf(e.tgt)}.`);
    ensureVisible(node.id);
    return node;
  }
  /* keyboard / menu twin: an event in the middle of the selected connection */
  function splitWithEvent(key) {
    const pts = routes.get(key);
    if (!pts) return;
    const mid = PM.labelPoint(pts);
    splitAt(key, "event", { x: mid.x, y: mid.y });
  }

  /* ---- re-connect: drag an endpoint handle of the selected connection */
  function syncEdgeEnds() {
    el.labels.querySelectorAll("[data-pd-edge-end]").forEach((n) => n.remove());
    const pts = S.sel.edge && !S.viewOnly ? routes.get(S.sel.edge) : null;
    if (!pts) return;
    [["source", pts[0]], ["target", pts[pts.length - 1]]].forEach(([end, p]) => {
      const h = document.createElement("span");
      h.className = `e-permits-pd__edge-end e-permits-pd__edge-end--${end}`;
      h.dataset.pdEdgeEnd = end;
      h.dataset.tooltipLabel = end === "source" ? "Trage ca să schimbi de unde pleacă" : "Trage ca să schimbi unde ajunge";
      h.setAttribute("aria-hidden", "true");
      h.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
      el.labels.appendChild(h);
    });
  }
  function reconnectFrame(e) {
    const ed = edgeOf(drag.key);
    if (!ed) return;
    const pts = routes.get(drag.key) || [];
    const fixed = drag.end === "target" ? pts[0] : pts[pts.length - 1];
    const w = toWorld(e.clientX, e.clientY);
    let id = nodeAtPoint(e.clientX, e.clientY);
    if (!id) for (const st of S.def.states) { if (PM.nearestPort(boxOf(st), w).dist * S.view.z <= 24) { id = st.id; break; } }
    const node = id ? S.byId.get(id) : null;
    const reason = !node ? "" : drag.end === "target" ? (node === ed.tgt ? "" : connectReason(ed.src, node)) : (node === ed.src ? "" : connectReason(node, ed.tgt));
    let to = w;
    if (node && !reason) { const near = PM.nearestPort(boxOf(node), w); to = PM.portPoint(boxOf(node), near.port); drag.port = near.port; }
    drag.target = node && !reason ? id : "";
    drag.invalid = Boolean(node && reason);
    nodeEls.forEach((n, nid) => { n.classList.toggle("is-target", nid === drag.target); n.classList.toggle("is-target-invalid", drag.invalid && nid === id); });
    el.stage.classList.toggle("is-connect-invalid", drag.invalid);
    drawConnectLine(drag.end === "target" ? fixed : to, drag.end === "target" ? to : fixed, Boolean(drag.target));
  }
  function endReconnect(d) {
    el.stage.classList.remove("is-connect-invalid");
    const ed = edgeOf(d.key);
    if (!ed || !d.target) { flashInvalid(); announce("Conexiunea nu a fost mutată."); return; }
    if (d.end === "target") {
      if (d.target === ed.t.target && d.port === ed.t.targetPort) return;
      edit(() => { setTarget(ed.t, d.target); if (d.port) PM.putKey(ed.t, "targetPort", d.port, "transition"); });
      selectEdge(d.key);
    } else {
      if (d.target === ed.src.id) { edit(() => { PM.setKey(ed.t, "sourcePort", d.port, "transition"); delete ed.t.waypoints; }); selectEdge(d.key); return; }
      let key = "";
      edit(() => {
        ed.src.transitions.splice(ed.i, 1);
        const src = S.byId.get(d.target);
        delete ed.t.waypoints;
        if (d.port) PM.putKey(ed.t, "sourcePort", d.port, "transition"); else delete ed.t.sourcePort;
        if (typeOf(src) === "decision" && (!ed.t.event || ed.t.event === "next")) ed.t.event = `Ieșire ${(src.transitions || []).length + 1}`;
        (src.transitions || (src.transitions = [])).push(ed.t);
        key = edgeKey(src.id, src.transitions.length - 1);
      });
      selectEdge(key);
    }
    const e2 = edgeOf(S.sel.edge);
    announce(e2 ? `Conexiune mutată: ${nameOf(e2.src)} → ${nameOf(e2.tgt)}.` : "Conexiune mutată.");
  }

  /* ---- sub-processes: drill-in (breadcrumb back), create a new one */
  async function drillIn(nodeId) {
    const s = S.byId.get(nodeId);
    const rec = recordById(s?.properties?.processRef || "");
    if (!rec) { window.GEAPToast?.show({ type: "info", message: "Alege întâi procesul apelat.", key: "pd-sub" }); return; }
    if (rec.name === S.def.name) return;
    S.stack.push({ recId: S.rec.id, def: S.def, baseText: S.baseText, undo: S.undo, redo: S.redo, dirty: S.dirty, view: { ...S.view }, viewOnly: S.viewOnly, forced: S.forced, openedVersion: S.openedVersion, nodeId, title: S.def.title || S.rec.title });
    await open(rec.id, { viewOnly: S.viewOnly, forced: S.forced, keepStack: true });
    announce(`Ai deschis ${rec.title}. Calea din bara de sus te întoarce la ${S.stack[S.stack.length - 1].title}.`);
  }
  function drillOut(index = S.stack.length - 1) {
    const go = () => {
      const frame = S.stack[index];
      S.stack = S.stack.slice(0, index);
      S.rec = recordById(frame.recId);
      S.def = frame.def;
      S.baseText = frame.baseText;
      S.undo = frame.undo;
      S.redo = frame.redo;
      S.viewOnly = frame.viewOnly;
      S.forced = frame.forced;
      S.openedVersion = frame.openedVersion;
      reindex();
      S.sel = { nodes: new Set([frame.nodeId]), edge: "", lane: "", pool: false };
      S.settings = false;
      S.dirty = PM.serialize(S.def) !== S.baseText;
      nodeEls.forEach((n) => n.remove()); nodeEls.clear();
      edgeEls.forEach((r) => { r.g.remove(); r.label.remove(); }); edgeEls.clear();
      renderAll();
      S.view = frame.view;
      applyView();
      zoomTo(boundsOf([frame.nodeId]), { maxZoom: Math.max(1, S.view.z) });
      window.setTimeout(() => nodeEls.get(frame.nodeId)?.focus({ preventScroll: true }), 60);
      announce(`Înapoi în ${frame.title}.`);
    };
    if (S.dirty && !S.viewOnly) ui().askConfirm?.({ title: "Ieși din sub-proces fără să salvezi?", text: "Modificările sub-procesului se pierd. Procesul principal își păstrează modificările.", confirmLabel: "Ieși fără salvare", destructive: true, cancelLabel: "Rămâi" }, go);
    else go();
  }
  function createSubprocess(nodeId) {
    const s = S.byId.get(nodeId);
    if (!s || S.viewOnly) return;
    const base = `SubProces${String(s.title || "Nou").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join("").replace(/^SubProces/i, "")}` || "SubProcesNou";
    let name = base, n = 2;
    while (S.db.processes.some((p) => p.name === name)) { name = `${base}${n}`; n += 1; }
    const title = String(s.title || "Sub-proces nou").trim();
    const def = PM.newDefinition({ name, title });
    const text = PM.serialize(def);
    const at = localStamp();
    S.db.processes.push({ id: name, name, title, status: "Schiță", version: def.version, publishedVersion: "", modifiedOn: at, modifiedBy: currentUser(), usedBy: [], text, history: [{ version: def.version, status: "Schiță", at, by: currentUser(), note: "Creat din procesul " + S.def.name + ".", text }], sub: true });
    saveDb();
    edit(() => { PM.setKey(s.properties, "processRef", name, "properties"); });
    window.GEAPToast?.show({ type: "success", message: `Sub-procesul «${title}» a fost creat ca schiță.`, action: { label: "Deschide", onClick: () => drillIn(nodeId) }, key: "pd-sub", duration: fromDemo() ? 0 : 8000 });
  }

  /* ---- Șablon de notificare: picker modal (the long multi-select of components.md: search,
     Toate / Selectate / Neselectate, sections by family with a tri-state head, live total, Aplică) */
  const tplModal = document.createElement("div");
  tplModal.className = "modal-overlay";
  tplModal.id = "pd-tpl-modal";
  tplModal.setAttribute("aria-hidden", "true");
  tplModal.innerHTML = `
    <div class="modal modal--lg e-permits-passport__modal e-permits-subdiv" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pd-tpl-title">
      <button type="button" class="modal-close" data-close aria-label="Închide"><span class="d-inline-flex">${icon("cross-large", 16).replace('class="icon"', 'class="icon small"')}</span></button>
      <div class="modal--header">
        <h2 class="modal--header-title" id="pd-tpl-title">Șablon de notificare</h2>
        <p class="e-permits-passport__modal-subtitle" data-pd-tpl-subtitle></p>
      </div>
      <div class="modal-content">
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill">
          <span class="icon-search" aria-hidden="true">${icon("search", 20)}</span>
          <input class="input" type="search" placeholder="Caută după cod sau denumire" aria-label="Caută șablon" autocomplete="off" data-pd-tpl-search>
          <div class="btn-group">
            <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
            <button type="button" class="btn-icon clear" aria-label="Șterge căutarea">${icon("cross-small", 20).replace('class="icon"', 'class="icon small"')}</button>
          </div>
        </div>
        <div class="e-permits-subdiv__toolbar">
          <div class="e-permits-subdiv__chips" role="group" aria-label="Filtru" data-pd-tpl-chips></div>
        </div>
        <div class="e-permits-subdiv__list" data-pd-tpl-list></div>
      </div>
      <div class="modal--footer e-permits-subdiv__footer">
        <p class="e-permits-subdiv__total" aria-live="polite" data-pd-tpl-total></p>
        <div class="modal-buttons">
          <button class="btn btn-neutral btn-rounded" type="button" data-close>Renunță</button>
          <button class="btn btn-primary btn-rounded" type="button" data-pd-tpl-apply>Aplică</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(tplModal);
  let tplPick = null;
  const TPL_FAMILY = { Case: "Dosar", Expertise: "Expertiză", Payment: "Plăți", Permit: "Act permisiv", User: "Utilizator" };
  const tplFamily = (code) => TPL_FAMILY[String(code).split(".")[0]] || "Altele";
  function tplAll() {
    const list = CAT.templates.filter((t) => t.active !== false).map((t) => ({ code: t.code, name: t.name || t.code, group: tplFamily(t.code) }));
    (tplPick?.sel || new Set()).forEach((code) => { if (!list.some((t) => t.code === code)) list.push({ code, name: "inexistent sau inactiv", group: "Inexistente" }); });
    return list;
  }
  function renderTplModal({ list = true } = {}) {
    const all = tplAll();
    const q = tplPick.query.trim().toLocaleLowerCase("ro");
    const match = (t) => (!q || `${t.code} ${t.name}`.toLocaleLowerCase("ro").includes(q)) && (tplPick.filter === "all" || (tplPick.filter === "selected") === tplPick.sel.has(t.code));
    const n = all.filter((t) => tplPick.sel.has(t.code)).length;
    tplModal.querySelector("[data-pd-tpl-subtitle]").textContent = `${tplPick.title} · ${all.length} șabloane active`;
    tplModal.querySelector("[data-pd-tpl-chips]").innerHTML = [["all", "Toate", all.length], ["selected", "Selectate", n], ["unselected", "Neselectate", all.length - n]].map(([key, label, count]) => `
      <button type="button" class="chip${tplPick.filter === key ? " is-selected" : ""}" aria-pressed="${tplPick.filter === key}" data-pd-tpl-filter="${key}">
        <span class="chip__label">${label}</span>
        <span class="badge badge--lg badge--solid-light" aria-hidden="true">${count}</span>
      </button>`).join("");
    tplModal.querySelector("[data-pd-tpl-total]").innerHTML = `<strong>${n}</strong> din ${all.length} selectate`;
    if (!list) return;
    const groups = [];
    all.forEach((t) => { let g = groups.find((x) => x[0] === t.group); if (!g) groups.push(g = [t.group, []]); g[1].push(t); });
    const rank = (g) => { const order = [...Object.values(TPL_FAMILY), "Altele", "Inexistente"]; return order.indexOf(g); };
    groups.sort((a, b) => rank(a[0]) - rank(b[0]));
    const html = groups.map(([group, items]) => {
      const shown = items.filter(match);
      if (!shown.length) return "";
      const on = items.filter((t) => tplPick.sel.has(t.code)).length;
      const shownOn = shown.filter((t) => tplPick.sel.has(t.code)).length;
      return `
        <section class="e-permits-subdiv__section" data-pd-tpl-group="${esc(group)}" aria-label="${esc(group)}">
          <div class="e-permits-subdiv__head">
            ${ui().renderCheckOption?.({ label: group, plain: true, checked: shownOn === shown.length, attrs: "data-pd-tpl-all" }) || ""}
            <span class="e-permits-subdiv__count" aria-label="${on} din ${items.length} selectate">${on}/${items.length}</span>
          </div>
          <ul class="e-permits-subdiv__items" role="list">${shown.map((t) => `<li>${ui().renderCheckOption?.({ label: `${t.code} · ${t.name}`, plain: true, checked: tplPick.sel.has(t.code), attrs: `value="${esc(t.code)}" data-pd-tpl-item` }) || ""}</li>`).join("")}</ul>
        </section>`;
    }).join("");
    tplModal.querySelector("[data-pd-tpl-list]").innerHTML = html || window.GEAPEmptyState?.noResults?.(q ? "Niciun șablon nu corespunde căutării" : "Niciun șablon în acest filtru", { text: "Schimbă filtrul sau caută altceva.", bare: true }) || "";
    tplModal.querySelectorAll("[data-pd-tpl-all]").forEach((box) => {
      const sec = box.closest("[data-pd-tpl-group]");
      const items = [...sec.querySelectorAll("[data-pd-tpl-item]")];
      const k = items.filter((x) => x.checked).length;
      box.indeterminate = k > 0 && k < items.length;
    });
  }
  function openTemplatePicker(filter = "all") {
    const s = selected();
    if (!s || S.viewOnly) return;
    tplPick = { node: s.id, title: nameOf(s), sel: new Set(s.properties?.templateCodes || []), query: "", filter };
    tplModal.querySelector("[data-pd-tpl-search]").value = "";
    renderTplModal();
    el.props.querySelector("[data-pd-tpl-select]")?.classList.add("is-open");
    el.props.querySelector("[data-pd-tpl-open]")?.setAttribute("aria-expanded", "true");
    window.__modal?.open?.("#pd-tpl-modal");
    window.setTimeout(() => tplModal.querySelector("[data-pd-tpl-search]")?.focus(), 60);
  }
  tplModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) { window.__modal?.close?.("#pd-tpl-modal"); return; }
    const chip = event.target.closest("[data-pd-tpl-filter]");
    if (chip) { tplPick.filter = chip.dataset.pdTplFilter; renderTplModal(); return; }
    if (event.target.closest("[data-pd-tpl-apply]")) {
      const s = S.byId.get(tplPick.node);
      const old = s.properties?.templateCodes || [];
      const order = [...old.filter((c) => tplPick.sel.has(c)), ...tplAll().map((t) => t.code).filter((c) => tplPick.sel.has(c) && !old.includes(c))];
      window.__modal?.close?.("#pd-tpl-modal");
      edit(() => { PM.setKey(s.properties, "templateCodes", order, "properties"); });
      announce(`${order.length} ${order.length === 1 ? "șablon" : "șabloane"} pe eveniment.`);
      window.setTimeout(() => el.props.querySelector("[data-pd-tpl-open]")?.focus(), 60);
    }
  });
  tplModal.addEventListener("change", (event) => {
    const box = event.target;
    if (box.matches("[data-pd-tpl-item]")) { if (box.checked) tplPick.sel.add(box.value); else tplPick.sel.delete(box.value); renderTplModal({ list: false }); const sec = box.closest("[data-pd-tpl-group]"); const items = [...sec.querySelectorAll("[data-pd-tpl-item]")]; const head = sec.querySelector("[data-pd-tpl-all]"); const k = items.filter((x) => x.checked).length; head.checked = k === items.length; head.indeterminate = k > 0 && k < items.length; return; }
    if (box.matches("[data-pd-tpl-all]")) {
      box.closest("[data-pd-tpl-group]").querySelectorAll("[data-pd-tpl-item]").forEach((x) => { x.checked = box.checked; if (box.checked) tplPick.sel.add(x.value); else tplPick.sel.delete(x.value); });
      renderTplModal({ list: false });
    }
  });
  tplModal.addEventListener("input", (event) => { if (event.target.matches("[data-pd-tpl-search]")) { tplPick.query = event.target.value; renderTplModal(); } });
  let tplWasOpen = false;
  new MutationObserver(() => {
    if (tplModal.classList.contains("is-active")) { tplWasOpen = true; return; }
    if (!tplWasOpen) return;
    tplWasOpen = false;
    el.props.querySelector("[data-pd-tpl-select]")?.classList.remove("is-open");
    el.props.querySelector("[data-pd-tpl-open]")?.setAttribute("aria-expanded", "false");
  }).observe(tplModal, { attributes: true, attributeFilter: ["class"] });

  /* ================================================================ BATCH 4 — arrange, copy / paste, auto-layout, list view, case trace */

  /* align / distribute the selection (multi-select panel) */
  function arrange(act) {
    const ids = [...S.sel.nodes];
    if (ids.length < 2) return;
    const boxes = ids.map((id) => ({ id, b: boxOf(S.byId.get(id)) }));
    const minX = Math.min(...boxes.map(({ b }) => b.x)), maxX = Math.max(...boxes.map(({ b }) => b.x + b.w));
    const minY = Math.min(...boxes.map(({ b }) => b.y)), maxY = Math.max(...boxes.map(({ b }) => b.y + b.h));
    const set = (id, cx, cy) => { const s = S.byId.get(id); PM.place(s, S.def, Math.round(cx), Math.round(cy)); const lane = PM.laneAt(S.def, cy); if (lane) s.properties.laneId = lane.id; };
    edit(() => {
      if (act === "distribute-h" || act === "distribute-v") {
        const h = act === "distribute-h";
        const sorted = boxes.slice().sort((a, b) => (h ? a.b.x + a.b.w / 2 - (b.b.x + b.b.w / 2) : a.b.y + a.b.h / 2 - (b.b.y + b.b.h / 2)));
        const first = sorted[0].b, last = sorted[sorted.length - 1].b;
        const c0 = h ? first.x + first.w / 2 : first.y + first.h / 2, c1 = h ? last.x + last.w / 2 : last.y + last.h / 2;
        sorted.forEach(({ id, b }, i) => { const c = c0 + ((c1 - c0) * i) / (sorted.length - 1); if (h) set(id, snap(c), b.y + b.h / 2); else set(id, b.x + b.w / 2, snap(c)); });
        return;
      }
      boxes.forEach(({ id, b }) => {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        if (act === "align-left") set(id, minX + b.w / 2, cy);
        else if (act === "align-right") set(id, maxX - b.w / 2, cy);
        else if (act === "align-center") set(id, (minX + maxX) / 2, cy);
        else if (act === "align-top") set(id, cx, minY + b.h / 2);
        else if (act === "align-bottom") set(id, cx, maxY - b.h / 2);
        else if (act === "align-middle") set(id, cx, (minY + maxY) / 2);
      });
    });
    announce(`${ids.length} elemente ${act.startsWith("align") ? "aliniate" : "distribuite"}.`);
  }
  /* duplicate / paste: new ids, +40 / +40, connections between the copied nodes kept, others dropped */
  function pasteNodes(states, { offset = 40 } = {}) {
    const list = states.filter((st) => !["start", "end"].includes(typeOf(st)));
    if (!list.length || S.viewOnly) return [];
    const map = new Map();
    const made = [];
    checkpoint();
    list.forEach((st) => {
      const t = typeOf(st);
      const copy = clone(st);
      copy.id = t === "event" ? uniqueId("eveniment_") : uniqueId("node");
      map.set(st.id, copy.id);
      const c = PM.centerOf(st, S.def);
      PM.place(copy, S.def, c.x + offset, c.y + offset);
      const lane = PM.laneAt(S.def, c.y + offset);
      if (lane) copy.properties.laneId = lane.id;
      made.push(copy);
      S.def.states.push(copy);
      S.byId.set(copy.id, copy);
    });
    made.forEach((copy) => { copy.transitions = (copy.transitions || []).filter((t) => map.has(t.target)).map((t) => { const n = { ...t, target: map.get(t.target) }; delete n.waypoints; return n; }); });
    reindex();
    S.sel = { nodes: new Set(made.map((m) => m.id)), edge: "", lane: "", pool: false };
    commit();
    refreshSelectionClasses();
    announce(made.length === 1 ? `${nameOf(made[0])} a fost duplicat.` : `${made.length} elemente au fost duplicate.`);
    return made;
  }
  function duplicateSelection(ids) { pasteNodes(ids.map((id) => S.byId.get(id)).filter(Boolean)); }
  function copySelection() {
    const ids = [...S.sel.nodes].filter((id) => !["start", "end"].includes(typeOf(S.byId.get(id))));
    if (!ids.length) return;
    S.clip = { from: S.def.name, states: ids.map((id) => clone(S.byId.get(id))), n: 0 };
    announce(`${ids.length === 1 ? "Un element copiat" : `${ids.length} elemente copiate`}. Ctrl + V le lipește.`);
  }
  function pasteClip() {
    if (!S.clip) return;
    S.clip.n += 1;
    pasteNodes(S.clip.states, { offset: 40 * S.clip.n });
  }

  /* auto-layout (spec F.11): layered by lanes, one undo step + toast; confirm only with manual routes */
  function autoLayout() {
    if (S.viewOnly) return;
    const run = () => {
      const before = snapshot();
      checkpoint();
      PM.autoLayout(S.def);
      reindex();
      commit({ full: true });
      fit();
      toastUndo("Diagrama a fost aranjată pe benzi.", before, []);
      announce("Diagrama a fost aranjată pe benzi. Ctrl + Z o readuce.");
    };
    const manual = (S.def.states || []).reduce((n, s) => n + (s.transitions || []).filter((t) => t.waypoints?.length).length, 0);
    if (manual) ui().askConfirm?.({ title: "Aranjezi diagrama automat?", text: `Elementele se așază pe coloane în benzile lor. ${manual} ${manual === 1 ? "conexiune cu traseu personalizat revine" : "conexiuni cu traseu personalizat revin"} la traseul automat. Poți anula cu Ctrl + Z.`, confirmLabel: "Aranjează" }, run);
    else run();
  }

  /* „Vizualizare listă” (spec E.5): the outline of the process — steps grouped by lane, their
     connections under them; keyboard-first (arrows move, Enter = properties, „Arată pe diagramă”).
     The replacement of the canvas below 720 px. */
  const listEl = document.createElement("section");
  listEl.className = "e-permits-pd__list";
  listEl.hidden = true;
  listEl.setAttribute("aria-label", "Lista elementelor procesului");
  listEl.dataset.pdList = "";
  el.stage.appendChild(listEl);
  const listForced = () => window.innerWidth < 720;
  function renderList() {
    if (!S.listView && !listForced()) { listEl.hidden = true; el.stage.classList.remove("is-list"); return; }
    listEl.hidden = S.mode !== "build";
    el.stage.classList.add("is-list");
    const order = flowOrder();
    const lanes = (S.def.lanes || []).map((l) => ({ id: l.id, title: String(l.title || "Bandă").trim(), role: l.role }));
    const groups = lanes.length ? lanes : [{ id: "", title: "Elemente", role: "" }];
    const laneOfNode = (s) => (lanes.some((l) => l.id === s.properties?.laneId) ? s.properties.laneId : groups[0].id);
    const focusId = listEl.contains(document.activeElement) ? document.activeElement.dataset.pdListNode || document.activeElement.dataset.pdListEdge || "" : "";
    const row = (s) => {
      const t = typeOf(s);
      const errs = errorsOf(s.id).length;
      const on = S.sel.nodes.has(s.id);
      const trace = S.trace ? (S.trace.current === s.id ? "current" : S.trace.path.nodes.includes(s.id) ? "visited" : "") : "";
      return `
        <li class="e-permits-stack__item has-lead e-permits-pd__list-item${on ? " is-selected" : ""}">
          <span class="e-permits-pd__list-lead" aria-hidden="true">${glyph(t)}</span>
          <div class="e-permits-stack__main">
            <div class="e-permits-stack__title-row">
              <button class="e-permits-pd__list-name" type="button" data-pd-list-node="${esc(s.id)}" tabindex="-1" aria-current="${on ? "true" : "false"}" aria-label="${esc(`${TYPE_LABEL[t]}: ${nameOf(s)}${errs ? `, ${errs} ${errs === 1 ? "eroare" : "erori"}` : ""}${trace === "current" ? ", pasul curent al dosarului" : trace === "visited" ? ", parcurs de dosar" : ""}`)}">${esc(nameOf(s))}</button>
              ${tag(TYPE_LABEL[t], t === "decision" ? "warning" : t === "start" ? "success" : t === "end" ? "danger" : "neutral")}
              ${errs ? tag(`${errs} ${errs === 1 ? "eroare" : "erori"}`, "danger") : ""}
              ${trace === "current" ? tag("Pas curent", "info") : trace === "visited" ? tag("Parcurs", "success") : ""}
            </div>
            <ul class="e-permits-pd__list-edges" role="list">
              ${(s.transitions || []).map((tr, i) => {
                const tgt = S.byId.get(tr.target);
                const label = t === "event" ? (tr.event === "failed" ? "Eșec" : "") : edgeLabel(s, tr);
                return `<li><button class="e-permits-pd__list-edge${S.sel.edge === edgeKey(s.id, i) ? " is-selected" : ""}" type="button" tabindex="-1" data-pd-list-edge="${esc(edgeKey(s.id, i))}">${icon("arrow-right", 16)}<span>${tgt ? esc(nameOf(tgt)) : "fără țintă"}${label ? ` <span class="e-permits-pd__list-edge-label">(${esc(label)})</span>` : ""}</span></button></li>`;
              }).join("") || '<li class="e-permits-pd__list-none">Fără ieșiri</li>'}
            </ul>
          </div>
          ${listForced() ? "" : `<div class="e-permits-stack__actions"><button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" tabindex="-1" data-pd-list-show="${esc(s.id)}" aria-label="Arată pe diagramă: ${esc(nameOf(s))}">Arată pe diagramă</button></div>`}
        </li>`;
    };
    listEl.innerHTML = `
      <div class="e-permits-pd__list-head">
        <div>
          <h2 class="e-permits-pd__card-title">Elementele procesului</h2>
          <p class="e-permits-pd__json-meta">${(S.def.states || []).length} elemente · ${allEdges().length} conexiuni · ordinea fluxului, pe benzi</p>
        </div>
        ${S.trace ? `<p class="e-permits-pd__list-trace">${tag("Traiectoria dosarului", "info")} ${esc(S.trace.label)} · pas curent: <strong>${esc(S.trace.current && S.byId.get(S.trace.current) ? nameOf(S.byId.get(S.trace.current)) : "dosar finalizat")}</strong></p>` : ""}
        <p class="e-permits-pd__list-keys" id="pd-list-keys">Săgeți sus / jos: elementul următor · Enter: proprietăți${listForced() ? "" : " · Shift + Enter: pe diagramă"}</p>
      </div>
      <div class="e-permits-stack e-permits-pd__list-stack" role="group" aria-describedby="pd-list-keys">
        ${groups.map((g) => {
          const items = order.map((id) => S.byId.get(id)).filter((s) => s && laneOfNode(s) === g.id);
          if (!items.length) return "";
          return `
            <div class="e-permits-stack__group">
              <h3 class="e-permits-stack__group-label">${esc(g.title)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${items.length}</span>${lanes.length ? `<span class="e-permits-pd__list-role">${esc(roleName(g.role))}</span>` : ""}</h3>
              <ul class="e-permits-stack__list" role="list">${items.map(row).join("")}</ul>
            </div>`;
        }).join("")}
      </div>`;
    /* roving tabindex: one item in the tab order (the focused / selected one, else the first) */
    const items = [...listEl.querySelectorAll("[data-pd-list-node], [data-pd-list-edge], [data-pd-list-show]")];
    const keep = (focusId && listEl.querySelector(`[data-pd-list-node="${CSS.escape(focusId)}"], [data-pd-list-edge="${CSS.escape(focusId)}"]`)) || listEl.querySelector(".is-selected [data-pd-list-node]") || items[0];
    if (keep) { keep.tabIndex = 0; if (focusId) keep.focus({ preventScroll: true }); }
  }
  function setListView(on) {
    if (listForced() && !on) return;
    S.listView = on;
    renderChrome();
    renderList();
    renderTrace();
    if (on || listForced()) window.setTimeout(() => listEl.querySelector('[tabindex="0"]')?.focus({ preventScroll: false }), 30);
    else el.stage.focus({ preventScroll: true });
    announce(on ? "Vizualizare listă. Săgețile trec de la un element la altul." : "Vizualizarea diagramei.");
  }
  listEl.addEventListener("click", (event) => {
    const show = event.target.closest("[data-pd-list-show]");
    if (show) { const id = show.dataset.pdListShow; S.listView = false; renderChrome(); renderList(); selectNodes([id]); zoomTo(boundsOf([id]), { maxZoom: Math.max(1, S.view.z) }); window.setTimeout(() => nodeEls.get(id)?.focus({ preventScroll: true }), 260); return; }
    const nodeBtn = event.target.closest("[data-pd-list-node]");
    if (nodeBtn) { S.rightOpen = true; selectNodes([nodeBtn.dataset.pdListNode]); renderList(); listEl.querySelector(`[data-pd-list-node="${CSS.escape(nodeBtn.dataset.pdListNode)}"]`)?.focus({ preventScroll: true }); return; }
    const edgeBtn = event.target.closest("[data-pd-list-edge]");
    if (edgeBtn) { S.rightOpen = true; selectEdge(edgeBtn.dataset.pdListEdge); renderList(); listEl.querySelector(`[data-pd-list-edge="${CSS.escape(edgeBtn.dataset.pdListEdge)}"]`)?.focus({ preventScroll: true }); }
  });
  listEl.addEventListener("keydown", (event) => {
    const items = [...listEl.querySelectorAll("[data-pd-list-node], [data-pd-list-edge]")];
    const at = items.indexOf(event.target);
    if (at < 0) return;
    const move = (i) => { const next = items[clamp(i, 0, items.length - 1)]; items.forEach((b) => { b.tabIndex = -1; }); next.tabIndex = 0; next.focus(); event.preventDefault(); event.stopPropagation(); };
    if (event.key === "ArrowDown") return move(at + 1);
    if (event.key === "ArrowUp") return move(at - 1);
    if (event.key === "Home") return move(0);
    if (event.key === "End") return move(items.length - 1);
    if (event.key === "Enter" && event.shiftKey && event.target.dataset.pdListNode && !listForced()) { event.preventDefault(); event.stopPropagation(); listEl.querySelector(`[data-pd-list-show="${CSS.escape(event.target.dataset.pdListNode)}"]`)?.click(); }
  });

  /* case trajectory (spec F.16, Feature 90263): visited nodes positive, the current step brand + „Pas curent”, the rest faded */
  const traceCard = document.createElement("div");
  traceCard.className = "e-permits-pd__trace";
  traceCard.hidden = true;
  traceCard.dataset.pdTrace = "";
  el.stage.appendChild(traceCard);
  function renderTrace() {
    el.stage.classList.toggle("has-trace", Boolean(S.trace));
    nodeEls.forEach((n, id) => {
      n.classList.toggle("is-visited", Boolean(S.trace) && S.trace.path.nodes.includes(id) && id !== S.trace.current);
      n.classList.toggle("is-current", Boolean(S.trace) && id === S.trace.current);
    });
    edgeEls.forEach((r, key) => r.g.classList.toggle("is-visited", Boolean(S.trace) && S.trace.path.edges.includes(key)));
    traceCard.hidden = !S.trace || S.mode !== "build" || !listEl.hidden;
    if (!S.trace) return;
    const cur = S.byId.get(S.trace.current);
    traceCard.innerHTML = `
      <div class="e-permits-pd__trace-head">
        <h2 class="e-permits-pd__card-title">Traiectoria dosarului</h2>
        ${tbButton("data-pd-trace-close", "cross-large", "Ascunde traiectoria")}
      </div>
      <p class="e-permits-pd__trace-case">${esc(S.trace.label)}</p>
      <dl class="e-permits-builder__facts">
        <div><dt>Pas curent</dt><dd>${cur ? `<button class="link link-primary link-sm e-permits-pd__link" type="button" data-pd-goto-node="${esc(cur.id)}">${esc(nameOf(cur))}</button>${S.trace.suspended ? ` ${tag("Suspendat", "warning")}` : ""}` : "Dosar finalizat"}</dd></div>
        <div><dt>Parcurs</dt><dd>${S.trace.path.nodes.length} ${S.trace.path.nodes.length === 1 ? "element" : "elemente"}</dd></div>
      </dl>
      <ul class="e-permits-pd__trace-legend" aria-label="Legendă">
        <li><i class="is-visited" aria-hidden="true"></i>Parcurs</li>
        <li><i class="is-current" aria-hidden="true"></i>Pas curent</li>
        <li><i aria-hidden="true"></i>Neatins</li>
      </ul>`;
  }
  traceCard.addEventListener("click", (event) => {
    if (event.target.closest("[data-pd-trace-close]")) { S.trace = null; renderTrace(); announce("Traiectoria este ascunsă."); el.stage.focus({ preventScroll: true }); return; }
    const goto = event.target.closest("[data-pd-goto-node]");
    if (goto) { selectNodes([goto.dataset.pdGotoNode]); zoomTo(boundsOf([goto.dataset.pdGotoNode]), { maxZoom: 1 }); }
  });
  /* the case engine keeps its own node ids (core/case-flow.js); only ids the definition has are drawn */
  async function openCase({ flowId = "flux-simplificat-fara-supervizor", label = "", visited = [], current = "", suspended = false } = {}) {
    await open(flowId, { viewOnly: true, forced: "Traiectoria unui dosar se poate doar vizualiza." });
    const has = (id) => S.byId.has(id);
    const stops = [...visited.filter(has), ...(has(current) ? [current] : [])];
    S.trace = { label, current: has(current) ? current : current === "end" ? "end" : "", suspended, path: PM.pathThrough(S.def, stops.length ? stops : current === "end" ? ["end"] : []) };
    renderTrace();
    renderList();
    const focus = S.trace.current || S.def.initialState;
    window.setTimeout(() => { zoomTo(boundsOf(S.trace.path.nodes.length ? S.trace.path.nodes : [focus]), { maxZoom: 1 }); }, 80);
    announce(`Traiectoria dosarului ${label}: ${S.trace.path.nodes.length} elemente parcurse${S.trace.current ? `, pasul curent ${nameOf(S.byId.get(S.trace.current))}` : ""}.`);
  }

  /* ================================================================ BATCH 3 — publish modal, restore, import */
  const publishModal = document.createElement("div");
  publishModal.className = "modal-overlay";
  publishModal.id = "pd-publish-modal";
  publishModal.setAttribute("aria-hidden", "true");
  document.body.appendChild(publishModal);
  function publishContext() {
    const published = S.db.processes.filter((p) => p.status === "Publicat" || p.publishedVersion).map((p) => p.name);
    const base = (() => { const h = (S.rec.history || []).filter((x) => x.status === "Publicat").pop(); try { return h ? PM.parse(h.text) : null; } catch { return null; } })();
    return { processes: knownProcesses(), self: S.def.name, published, templates: CAT.templates.filter((t) => t.active !== false).map((t) => t.code), forms: CAT.forms, base, usedBy: (S.rec.usedBy || []).length };
  }
  function openPublishModal() {
    const issues = PM.validate(S.def, publishContext());
    const errors = issues.filter((i) => i.level === "error");
    /* what the publish changes for the request types first (W3), then unknown templates; unused variables stay in the issues menu */
    const warnings = [...issues.filter((i) => i.code === "W3"), ...issues.filter((i) => i.code === "W2" && i.prop === "templateCodes")];
    const usage = usageOf(S.rec);
    const states = (S.def.states || []).length;
    const blocked = errors.length > 0;
    publishModal.innerHTML = `
      <div class="modal modal--md e-permits-passport__modal e-permits-pd__publish" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pd-publish-title" aria-describedby="pd-publish-lead">
        <button type="button" class="modal-close" data-close aria-label="Închide"><span class="d-inline-flex">${icon("cross-large", 16).replace('class="icon"', 'class="icon small"')}</span></button>
        <div class="modal--header">
          <h2 class="modal--header-title" id="pd-publish-title">Publică procesul v${esc(S.def.version)}</h2>
          <p class="e-permits-passport__modal-subtitle">${esc(S.def.title || S.rec.title)} · ${esc(S.def.name)}</p>
        </div>
        <div class="modal-content">
          ${blocked ? `
            ${ui().renderNotice?.("error", `${esc(PM.MSG.PUBLISH)} ${errors.length} ${errors.length === 1 ? "eroare" : "erori"}:`, { role: "alert" }) || ""}
            <ul class="e-permits-builder__step-list e-permits-pd__publish-errors" id="pd-publish-lead">${errors.slice(0, 12).map((i) => `<li><button class="e-permits-builder__step-row has-error" type="button" data-pd-publish-goto="${esc(i.id)}" data-kind="${esc(i.kind)}" data-prop="${esc(i.prop || "")}" data-tab="${esc(i.tab || "general")}">${icon("circle-error-filled", 16)}<span class="e-permits-pd__action-text"><strong>${esc(i.name || "Proces")}</strong> · ${esc(i.message)}</span><span class="e-permits-builder__step-row-meta">${esc(i.code)}</span></button></li>`).join("")}</ul>
            ${errors.length > 12 ? `<p class="e-permits-fo-field__hint">și încă ${errors.length - 12} — lista completă în „${errors.length} erori” din bara de sus.</p>` : ""}`
          : `
            <p class="e-permits-passport__lead" id="pd-publish-lead">${usage.length ? `Tipurile de solicitare care folosesc procesul trec pe v${esc(S.def.version)}. Dosarele în lucru rămân pe versiunea lor.` : "Procesul devine disponibil în lista „Flux de procesare” a tipurilor de solicitare."}</p>
            <dl class="e-permits-builder__facts">
              <div><dt>Versiune</dt><dd>v${esc(S.def.version)} (nu se schimbă la publicare)</dd></div>
              <div><dt>Versiunea activă acum</dt><dd>${S.rec.publishedVersion ? `v${esc(S.rec.publishedVersion)}` : "—"}</dd></div>
              <div><dt>Conținut</dt><dd>${states} elemente · ${allEdges().length} conexiuni · ${(S.def.lanes || []).length} benzi</dd></div>
            </dl>
            ${usage.length ? `<h3 class="e-permits-user-create__section-title">Efect asupra tipurilor de solicitare (${usage.length})</h3>
              <ul class="e-permits-builder__step-list">${usage.map((u) => `<li class="e-permits-pd__publish-usage"><span class="e-permits-pd__action-text"><strong>${esc(u.rt)}</strong> · ${esc(u.title)}</span><span class="e-permits-builder__step-row-meta">${esc(u.code)}</span></li>`).join("")}</ul>` : ""}
            ${warnings.map((w) => ui().renderNotice?.("warning", esc(w.message)) || "").join("")}
            <div class="e-permits-fo-field e-permits-user-create__field">
              <label for="pd-publish-note">Ce s-a schimbat</label>
              <div class="e-permits-fo-textarea"><textarea id="pd-publish-note" rows="3" maxlength="300" placeholder="De ex. Pas nou de notificare la suspendare" data-pd-publish-note></textarea></div>
              <p class="e-permits-fo-field__hint">Opțional. Apare în istoricul versiunilor și în jurnal.</p>
            </div>`}
        </div>
        <div class="modal--footer"><div class="modal-buttons">
          <button class="btn btn-neutral btn-rounded" type="button" data-close>Anulează</button>
          <button class="btn btn-primary btn-rounded" type="button" data-pd-publish-confirm${blocked ? ` aria-disabled="true" data-tooltip-reason="Corectați ${errors.length} ${errors.length === 1 ? "eroare" : "erori"} înainte de publicare."` : ""}>Publică</button>
        </div></div>
      </div>`;
    window.__modal?.open?.("#pd-publish-modal");
  }
  publishModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) { window.__modal?.close?.("#pd-publish-modal"); return; }
    const goto = event.target.closest("[data-pd-publish-goto]");
    if (goto) {
      window.__modal?.close?.("#pd-publish-modal");
      goToIssue({ id: goto.dataset.pdPublishGoto, kind: goto.dataset.kind, prop: goto.dataset.prop, tab: goto.dataset.tab });
      return;
    }
    const ok = event.target.closest("[data-pd-publish-confirm]");
    if (ok && ok.getAttribute("aria-disabled") !== "true") {
      const note = publishModal.querySelector("[data-pd-publish-note]")?.value.trim() || "";
      window.__modal?.close?.("#pd-publish-modal");
      doPublish(note);
    }
  });
  function doPublish(note) {
    const rec = S.rec;
    rec.status = "Publicat";
    rec.publishedVersion = rec.version;
    rec.published = true;
    rec.modifiedOn = localStamp();
    rec.modifiedBy = currentUser();
    rec.history = [...(rec.history || []).filter((h) => h.version !== rec.version), { version: rec.version, status: "Publicat", at: rec.modifiedOn, by: rec.modifiedBy, note: note || "Publicat.", text: rec.text }];
    saveDb();
    pushToServices(rec);
    renderAll();
    const usage = usageOf(rec);
    window.GEAPToast?.show({ type: "success", message: `Procesul a fost publicat.${usage.length ? ` ${usage.length} ${usage.length === 1 ? "tip de solicitare folosește" : "tipuri de solicitare folosesc"} acum v${rec.version}.` : ""}`, key: "pd-save" });
    announce("Procesul a fost publicat.");
  }
  /* the passport reads the published definition (US-222 AC-09/11/16/19/46): steps, actions, forms,
     notifications, payment moments and the avizare lock follow the new version at once */
  function pushToServices(rec) {
    if (!rec.publishedVersion) return;
    const h = (rec.history || []).filter((x) => x.status === "Publicat" && x.version === rec.publishedVersion).pop();
    try { window.GEAPShellFlows?.upsert?.({ id: rec.id, name: rec.title, version: `v${rec.publishedVersion}`, definition: PM.parse(h ? h.text : rec.text) }); } catch { /* the passport keeps its copy */ }
  }
  /* a past version → the working draft (unsaved; Salvează keeps it as the next patch) */
  function restoreVersion() {
    const past = (S.rec.history || []).find((h) => h.version === S.openedVersion);
    if (!past) return;
    const from = S.openedVersion;
    let def;
    try { def = PM.parse(past.text); } catch { return; }
    def.version = S.rec.version;
    S.def = def;
    S.baseText = S.rec.text;
    S.openedVersion = "";
    S.forced = "";
    S.viewOnly = false;
    S.undo = [];
    S.redo = [];
    S.trace = null;
    reindex();
    S.sel = { nodes: new Set(), edge: "", lane: "", pool: false };
    commit({ full: true });
    renderAll();
    window.GEAPToast?.show({ type: "info", message: `Versiunea v${from} este acum schița de lucru (nesalvată). Salvează ca să o păstrezi ca v${PM.bumpPatch(S.rec.version)}.`, key: "pd-save" });
    announce(`Versiunea ${from} restaurată ca schiță.`);
  }
  /* Importă JSON (spec F.15, P3): the same process → replaces the working draft; another → a new draft */
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json,application/json";
  importInput.hidden = true;
  importInput.dataset.pdImportFile = "";
  root.appendChild(importInput);
  function importText(text, fileName = "") {
    let def;
    try { def = PM.parse(text); } catch (error) { window.GEAPToast?.show({ type: "error", message: `Fișierul${fileName ? ` „${fileName}”` : ""} nu este o schemă de proces: ${error.message.replace(/^Unexpected/, "conținut neașteptat")}`, key: "pd-import" }); return false; }
    if (!def.name || !def.states.length) { window.GEAPToast?.show({ type: "error", message: "Fișierul nu are identificator (name) sau elemente (states).", key: "pd-import" }); return false; }
    const normalised = PM.serialize(def) !== text;
    const issues = PM.validate(def, { processes: knownProcesses(), self: def.name });
    const errs = issues.filter((i) => i.level === "error").length;
    const tail = `${errs ? ` ${errs} ${errs === 1 ? "eroare de corectat" : "erori de corectat"}.` : " Fără erori."}${normalised ? " Formatul a fost adus la exportul GEAP." : ""}`;
    if (def.name === S.def.name) {
      checkpoint();
      def.version = S.def.version;
      S.def = def;
      reindex();
      S.sel = { nodes: new Set(), edge: "", lane: "", pool: false };
      commit({ full: true });
      setMode("build");
      fit();
      window.GEAPToast?.show({ type: errs ? "info" : "success", message: `Schema importată înlocuiește schița de lucru (nesalvată).${tail}`, key: "pd-import" });
      return true;
    }
    const exists = S.db.processes.some((p) => p.name === def.name);
    if (exists) { window.GEAPToast?.show({ type: "error", message: `Există deja procesul «${def.name}». Deschide-l și importă acolo, sau schimbă identificatorul din fișier.`, key: "pd-import" }); return false; }
    def.version = "1.0.0";
    const clean = PM.serialize(def);
    const at = localStamp();
    S.db.processes.push({ id: def.name, name: def.name, title: def.title || def.name, status: "Schiță", version: def.version, publishedVersion: "", modifiedOn: at, modifiedBy: currentUser(), usedBy: [], text: clean, history: [{ version: def.version, status: "Schiță", at, by: currentUser(), note: `Importat din ${fileName || "JSON"}.`, text: clean }] });
    saveDb();
    open(def.name).then(() => window.GEAPToast?.show({ type: errs ? "info" : "success", message: `Procesul «${def.title || def.name}» a fost importat ca schiță.${tail}`, key: "pd-import" }));
    return true;
  }
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (file) importText(await file.text(), file.name);
  });

  /* ================================================================ BATCH 3 — „Fluxuri de lucru” (US-50 registry)
     The BO workplace table through the shell's registry engine (the product-registry hooks, read from
     window.GEAPShellRegistries): Denumire · Identificator · Stare · Versiune · Folosit de · Actualizat ·
     Editează + ⋮ (Duplică · Exportă JSON · Șterge — Schiță only). „Creează proces” = the toolbar action. */
  const regRow = (p) => {
    const usage = usageOf(p);
    return {
      id: p.id,
      denumire: p.title,
      descriere: (() => { try { return PM.parse(p.text).description || ""; } catch { return ""; } })(),
      identificator: p.name,
      statut: p.status,
      versiune: p.version,
      publicata: p.publishedVersion || "",
      folosit: usage.length,
      folositServicii: new Set(usage.map((u) => u.code)).size,
      actualizat: p.modifiedOn,
      actualizatDe: p.modifiedBy,
      sub: Boolean(p.sub),
    };
  };
  function registryDb() {
    return {
      kind: "flows",
      fieldCount: 6,
      defaultSort: "actualizat",
      columns: {
        denumire: { label: "Denumire", width: 236, fill: true, sortable: true },
        identificator: { label: "Identificator", width: 252, fill: true, sortable: true },
        statut: { label: "Stare", width: 100, sortable: true },
        versiune: { label: "Versiune", width: 100, sortable: true },
        folosit: { label: "Folosit de", width: 124, sortable: true },
        actualizat: { label: "Actualizat", width: 168, sortable: true },
        actiuni: { label: "", width: 152 },
      },
      views: {
        flows: {
          title: "Fluxuri de lucru",
          selectable: false,
          columns: ["denumire", "identificator", "statut", "versiune", "folosit", "actualizat", "actiuni"],
          tabs: [
            { id: "all", label: "Toate", filter: "all" },
            { id: "published", label: "Publicate", filter: "svc:Publicat" },
            { id: "drafts", label: "Schițe", filter: "svc:Schiță" },
          ],
          primaryAction: { id: "pd-new", label: "Creează proces" },
        },
      },
      runtimeRows: (S.db?.processes || []).map(regRow),
    };
  }
  /* the registry may be shown before the sandbox DB is read (first visit): load, then draw again */
  let regLoading = false;
  function registryBuild() {
    if (!S.db && !regLoading) { regLoading = true; ensureDb().then(() => { regLoading = false; refreshRegistry(); }); }
    return registryDb();
  }
  const U = () => window.GEAPUi || {};
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries.flows = {
    build: registryBuild,
    searchText: (row) => [row.denumire, row.identificator, row.descriere, row.statut, row.versiune].filter(Boolean).join(" "),
    sortValue: (row, key) => (key === "folosit" ? row.folosit : key === "actualizat" ? row.actualizat || "" : undefined),
    filterToken: (row, token) => (token.startsWith("svc:") ? row.statut === token.slice(4) : true),
    renderCell: (row, key) => {
      switch (key) {
        case "denumire": return `
          <div class="e-permits-workplace__case-cell">
            <span class="e-permits-passport__name" data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>
            <span class="e-permits-workplace__source"><span>${row.sub ? "Sub-proces" : "Proces"}</span>${row.descriere ? `<span data-cell-tooltip="${esc(row.descriere)}">· ${esc(row.descriere)}</span>` : ""}</span>
          </div>`;
        case "identificator": return U().renderListCode?.(row.identificator) || esc(row.identificator);
        case "statut": return tag(row.statut, row.statut === "Publicat" ? "success" : "neutral");
        case "versiune": return `
          <span class="e-permits-workplace__date-stack">
            <span>v${esc(row.versiune)}</span>
            <span class="e-permits-workplace__date-meta">${row.publicata ? (row.publicata === row.versiune ? "activă" : `activă: v${esc(row.publicata)}`) : "nepublicat"}</span>
          </span>`;
        case "folosit": return row.folosit ? `
          <span class="e-permits-workplace__date-stack">
            <span>${row.folosit} ${row.folosit === 1 ? "tip de solicitare" : "tipuri"}</span>
            <span class="e-permits-workplace__date-meta">${row.folositServicii} ${row.folositServicii === 1 ? "serviciu" : "servicii"}</span>
          </span>` : '<span class="e-permits-workplace__dash">—</span>';
        case "actualizat": return U().renderDateTime?.(row.actualizat, row.actualizatDe) || esc(longDate(row.actualizat));
        case "actiuni": {
          const canDelete = row.statut === "Schiță" && !row.publicata && !row.folosit;
          /* the table scroller clips an absolute menu: the shell's fixed variant opens it under the ⋮ */
          return `<span class="e-permits-workplace__row-actions">${(U().renderRowActions?.({
            primary: { label: "Editează", attrs: `data-pd-reg-edit="${esc(row.id)}" aria-label="Editează ${esc(row.denumire)}"` },
            menu: [
              { label: "Vezi schema", icon: "eye-open", attrs: `data-pd-reg-view="${esc(row.id)}"` },
              { label: "Duplică", icon: "copy", attrs: `data-pd-reg-dup="${esc(row.id)}"` },
              { label: "Exportă JSON", icon: "export", attrs: `data-pd-reg-export="${esc(row.id)}"` },
              { label: "Șterge", icon: "delete", danger: true, attrs: `data-pd-reg-delete="${esc(row.id)}"${canDelete ? "" : ` aria-disabled="true" data-tooltip-reason="${row.folosit ? "Procesul este folosit de tipuri de solicitare." : "Doar o schiță nepublicată se poate șterge."}"`}` },
            ],
            label: row.denumire,
          }) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        }
        default: return esc(String(row[key] ?? "—"));
      }
    },
    openRow: (id) => open(id),
    emptyHtml: ({ query, filtered }) => (!S.db
      ? window.GEAPEmptyState?.render({ title: "Se încarcă fluxurile…", text: "Citim registrul de procese.", icon: "tree", bare: true })
      : query || filtered
      ? window.GEAPEmptyState?.noResults?.("Niciun flux nu corespunde căutării", { text: "Caută după denumire sau identificator.", bare: true })
      : window.GEAPEmptyState?.render({ title: "Niciun flux de lucru", text: "Creează primul proces: Start, Sfârșit și pașii dintre ele.", icon: "tree", bare: true, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="pd-new">Creează proces</button>' })),
    /* the toolbar export: ONE file with the rows shown (each with its definition), in the order shown */
    exportRows: (rows) => {
      const list = rows.map((row) => recordById(row.id)).filter(Boolean).map((rec) => ({ name: rec.name, title: rec.title, status: rec.status, version: rec.version, publishedVersion: rec.publishedVersion || null, modifiedOn: rec.modifiedOn, modifiedBy: rec.modifiedBy, definition: (() => { try { return JSON.parse(rec.text); } catch { return null; } })() }));
      downloadText(`${JSON.stringify({ exportedAt: localStamp(), processes: list }, null, 2)}\n`, "fluxuri-de-lucru.json");
      ui().showShellToast?.(`Am exportat ${list.length} ${list.length === 1 ? "proces" : "procese"} în fluxuri-de-lucru.json.`, "success");
    },
  };
  function downloadText(text, name) {
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /* after a change the registry is drawn again (the nav item re-shows it with fresh rows) */
  const refreshRegistry = () => {
    if (!document.querySelector('[data-registry-kind="flows"]')) return;
    document.querySelector('[data-nav-item][data-nav-id="workflows"]')?.click();
  };
  document.addEventListener("click", async (event) => {
    const t = event.target;
    const add = t.closest('[data-workplace-add-product="pd-new"]');
    if (add) { event.preventDefault(); await ensureDb(); openProcessDrawer("new"); return; }
    const editBtn = t.closest("[data-pd-reg-edit]");
    if (editBtn) { event.preventDefault(); await ensureDb(); open(editBtn.dataset.pdRegEdit); return; }
    const viewBtn = t.closest("[data-pd-reg-view]");
    if (viewBtn) { await ensureDb(); open(viewBtn.dataset.pdRegView, { viewOnly: true }); return; }
    const dup = t.closest("[data-pd-reg-dup]");
    if (dup) { await ensureDb(); openProcessDrawer("duplicate", dup.dataset.pdRegDup); return; }
    const exp = t.closest("[data-pd-reg-export]");
    if (exp) { await ensureDb(); const rec = recordById(exp.dataset.pdRegExport); if (rec) { downloadText(rec.text, `${rec.name}_v${rec.version}.json`); ui().showShellToast?.(`Am exportat ${rec.name}_v${rec.version}.json.`, "success"); } return; }
    const del = t.closest("[data-pd-reg-delete]");
    if (del) {
      if (del.getAttribute("aria-disabled") === "true") return;
      await ensureDb();
      const rec = recordById(del.dataset.pdRegDelete);
      if (!rec) return;
      ui().askConfirm?.({ title: `Ștergi procesul «${rec.title}»?`, text: "Schița nu a fost publicată și nu e folosită de niciun tip de solicitare. Ștergerea nu se poate anula.", confirmLabel: "Șterge procesul", destructive: true }, () => {
        S.db.processes = S.db.processes.filter((p) => p !== rec);
        saveDb();
        refreshRegistry();
        ui().showShellToast?.(`Procesul «${rec.title}» a fost șters.`, "success");
      });
    }
  });

  /* «Proces nou» / «Duplică» (US-50 AC-02/03): the BO right drawer (markup of js/ekyc-config.js) */
  let pdDrawer = null;
  let drawerForm = null;
  function ensureProcessDrawer() {
    if (pdDrawer) return pdDrawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-pd-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-pd-drawer-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="pd-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="pd-drawer-title" data-pd-drawer-title></h2>
              <p class="drawer__subtitle" data-pd-drawer-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-pd-drawer-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-pd-drawer-body></div>
          <footer class="drawer__footer">
            <span class="e-permits-rt__summary" aria-live="polite"></span>
            <div class="modal-buttons">
              <button class="btn btn-neutral btn-rounded" type="button" data-pd-drawer-close>Anulează</button>
              <button class="btn btn-primary btn-rounded" type="button" data-pd-drawer-submit></button>
            </div>
          </footer>
        </aside>
      </div>`;
    pdDrawer = wrap.firstElementChild;
    document.body.appendChild(pdDrawer);
    pdDrawer.addEventListener("click", (event) => {
      if (event.target.closest("[data-pd-drawer-close]")) { closeProcessDrawer(); return; }
      if (event.target.closest("[data-pd-drawer-submit]")) submitProcessDrawer();
    });
    pdDrawer.addEventListener("input", (event) => {
      const f = event.target.dataset.pdDf;
      if (!f || !drawerForm) return;
      drawerForm.v[f] = event.target.value;
      if (drawerForm.errors[f]) { delete drawerForm.errors[f]; renderProcessDrawer(); pdDrawer.querySelector(`[data-pd-df="${f}"]`)?.focus(); }
    });
    pdDrawer.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.stopPropagation(); closeProcessDrawer(); } });
    return pdDrawer;
  }
  const dfield = (key, label, control, { required = false, hint = "", error = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label for="pd-df-${key}">${esc(label)}${required ? reqMark() : ""}</label>
      ${control}
      ${error ? errorHtml(error) : hint ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
    </div>`;
  function renderProcessDrawer() {
    const F = drawerForm;
    const d = ensureProcessDrawer();
    const src = F.mode === "duplicate" ? recordById(F.from) : null;
    d.querySelector("[data-pd-drawer-title]").textContent = F.mode === "duplicate" ? "Duplică procesul" : "Proces nou";
    d.querySelector("[data-pd-drawer-subtitle]").textContent = src ? `Copie completă a schemei «${src.title}» v${src.version} — independentă de original` : "Global · Administrator Central";
    d.querySelector("[data-pd-drawer-submit]").textContent = "Creează și deschide";
    const input = (key, o = {}) => `<div class="e-permits-fo-input${F.errors[key] ? " is-error" : ""}"><input id="pd-df-${key}" type="text" maxlength="${o.max || 120}" value="${esc(F.v[key] || "")}" placeholder="${esc(o.placeholder || "")}" autocomplete="off"${F.errors[key] ? ' aria-invalid="true"' : ""} data-pd-df="${key}"></div>`;
    d.querySelector("[data-pd-drawer-body]").innerHTML = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Identificare</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${dfield("name", "Identificator", input("name", { placeholder: "De ex. ProcesAvizareSanitara", max: 60 }), { required: true, error: F.errors.name, hint: "Litere latine și cifre, fără spații; unic. Nu se mai schimbă după creare." })}
            ${dfield("title", "Denumire", input("title", { placeholder: "De ex. Flux cu avizare sanitară" }), { required: true, error: F.errors.title })}
            ${dfield("description", "Descriere scurtă", `<div class="e-permits-fo-textarea"><textarea id="pd-df-description" rows="3" maxlength="300" data-pd-df="description">${esc(F.v.description || "")}</textarea></div>`, { hint: "Apare în registru, sub denumire." })}
          </div>
        </div>
      </section>
      ${src ? "" : `<section class="e-permits-user-create__section"><h3 class="e-permits-user-create__section-title">Conținut</h3><div class="e-permits-user-create__section-content">${ui().renderInfoNote?.("Procesul nou pornește cu Start, Sfârșit și o bandă. Se salvează ca schiță; tipurile de solicitare îl pot alege după publicare.") || ""}</div></section>`}`;
  }
  function openProcessDrawer(mode, from = "") {
    const src = mode === "duplicate" ? recordById(from) : null;
    drawerForm = { mode, from, v: { name: "", title: src ? `${src.title} (copie)` : "", description: "" }, errors: {}, back: document.activeElement };
    renderProcessDrawer();
    pdDrawer.hidden = false;
    document.body.classList.add("is-drawer-open");
    requestAnimationFrame(() => pdDrawer.querySelector("[data-pd-df='name']")?.focus());
  }
  function closeProcessDrawer() {
    if (!pdDrawer || pdDrawer.hidden) return;
    pdDrawer.hidden = true;
    document.body.classList.remove("is-drawer-open");
    drawerForm?.back?.focus?.();
    drawerForm = null;
  }
  function submitProcessDrawer() {
    const F = drawerForm;
    const name = String(F.v.name || "").trim();
    const title = String(F.v.title || "").trim();
    F.errors = {};
    if (!name) F.errors.name = "Identificatorul este obligatoriu.";
    else if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) F.errors.name = "Doar litere latine și cifre, fără spații, începând cu o literă.";
    else if (S.db.processes.some((p) => p.name.toLowerCase() === name.toLowerCase() || p.id === name)) F.errors.name = `Există deja procesul «${name}».`;
    if (!title) F.errors.title = "Denumirea este obligatorie.";
    if (Object.keys(F.errors).length) {
      renderProcessDrawer();
      pdDrawer.querySelector(".is-error input")?.focus();
      return;
    }
    let def;
    if (F.mode === "duplicate") { def = PM.parse(recordById(F.from).text); def.name = name; def.title = title; def.version = "1.0.0"; PM.setKey(def, "description", String(F.v.description || "").trim(), "root"); }
    else def = PM.newDefinition({ name, title, description: String(F.v.description || "").trim() });
    if (!def.description) delete def.description;
    const text = PM.serialize(def);
    const at = localStamp();
    const rec = { id: name, name, title, status: "Schiță", version: def.version, publishedVersion: "", modifiedOn: at, modifiedBy: currentUser(), usedBy: [], text, history: [{ version: def.version, status: "Schiță", at, by: currentUser(), note: F.mode === "duplicate" ? `Duplicat din ${recordById(F.from).name}.` : "Proces creat.", text }] };
    S.db.processes.push(rec);
    saveDb();
    closeProcessDrawer();
    refreshRegistry();
    open(rec.id);
    window.GEAPToast?.show({ type: "success", message: F.mode === "duplicate" ? `Copia «${title}» a fost creată ca schiță.` : `Procesul «${title}» a fost creat ca schiță.`, key: "pd-save" });
  }

  /* ---------------------------------------------------------------- entry points */

  function routeHash() {
    const m = (window.__pdInitialHash || window.location.hash || "").match(/^#flux\/([^/?]+)/);
    window.__pdInitialHash = "";
    if (!m) return false;
    open(decodeURIComponent(m[1]), { viewOnly: true, forced: "Deschis din „Vezi schema fluxului” — editarea se face din Fluxuri de lucru." });
    return true;
  }
  window.addEventListener("hashchange", routeHash);
  if (FULL_PAGE) {
    document.body.classList.add("is-pd-page");
    open(params.get("proces") || "flux-simplificat-fara-supervizor", { viewOnly: params.get("vizualizare") === "1", isNew: params.get("nou") === "1" });
  } else routeHash();

  /* for demo states and checks */
  window.GEAPProcessDesigner = {
    open,
    close,
    get state() { return S; },
    get def() { return S.def; },
    select: (ids) => selectNodes([].concat(ids)),
    selectEdge,
    selectLane,
    setZoom: (z) => setZoom(z, null, { announceIt: false }),
    fit,
    zoomToNode: (id, z = 1) => zoomTo(boundsOf([id]), { maxZoom: z }),
    zoomToNodes: (ids, z = 1) => zoomTo(boundsOf(ids), { maxZoom: z }),
    openAddMenu: (id) => openAddMenu(id),
    togglePanels,
    toggleRail: () => { S.rail = !S.rail; writeUi(); renderPalette(); },
    setMinimap: (on) => { S.minimap = on; renderChrome(); scheduleMinimap(); },
    serialize: () => PM.serialize(S.def),
    baseText: () => S.baseText,
    validate: () => S.issues,
    deleteNodes,
    addNode: (type, opts) => addNode(type, opts),
    connect,
    save,
    undo,
    redo,
    worldToScreen: (x, y) => ({ x: stageRect.left + S.view.x + x * S.view.z, y: stageRect.top + S.view.y + y * S.view.z }),
    openCase,
    drillIn,
    drillOut,
    autoLayout,
    setListView,
    splitWithEvent,
    importText,
    publish,
    selectPool,
    setTab: (tab) => { S.tab = tab; renderPanel(); },
    ensureDb,
    registry: registryDb,
  };
});
