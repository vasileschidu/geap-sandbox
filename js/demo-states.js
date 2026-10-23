/* Demo states: one entry per Figma screen, opened with ?state=<id> (js/demo-links.js).
   An entry names the role (as), the page / tab (hash) and the clicks that bring up
   the screen (run). Ids = <Figma page prefix>-<screen id>: svc- Servicii · dos-
   Dosare · wp- Workplace · shell- Application Shell · trf- Tarife · ntpl- Șabloane
   de notificare · flt- Filtrare avansată · fo- Requestor.
   Keep each run to the user's own clicks (selectors from the page, not internals). */
(function () {
  const ADMIN = "ansp-central-admin";
  const SVC = "003000023"; /* Notificare în comerț: RSSP + eAPL, every tab filled */
  const BIO = "003000519"; /* Înregistrarea produselor biocide: conditional taxes */
  const svc = (tab, run, code = SVC) => ({ flow: "back-office", as: ADMIN, hash: `#serviciu/${code}/${tab}`, run });
  /* Dosare (Figma „↳ BO -> Dosare · stări și roluri”): the story dossier in every status / role.
     ?stare= sets its status for the demo (applyDemoCaseState in the shell). */
  const SPEC = "ansp-specialist-chisinau", SUP = "ansp-supervisor-chisinau", DIR = "ansp-director-chisinau", LOCAL = "ansp-local-admin";
  const DOS = "D-2026-004575";
  const dos = (as, stare, tab = "general", extra = {}, run) => ({ flow: "back-office", as, params: { stare, ...extra }, hash: `#dosar/${DOS}/${tab}`, ready: ".e-permits-trajectory, .e-permits-dosar-profil__section", run });
  /* another dossier, in its own seeded status (no ?stare=) */
  const dosOf = (id, as, tab = "general") => ({ flow: "back-office", as, hash: `#dosar/${id}/${tab}`, ready: ".e-permits-trajectory, .e-permits-dosar-profil__section" });
  /* any dossier document list (insotitoare | documente | acte): the KEYBOARD path of the row whose title contains
     `text` (no „👁 Detalii” button since no-lone-detalii-v1 — the focused row + Enter); docRow clicks the row itself
     (→ the same modal) */
  const docEye = (text, kind = "insotitoare") => async (h) => {
    const row = await h.scroll(`.e-permits-stack__item[data-dosar-detail-row^="${kind}"]`, text);
    row.focus(); row.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); await h.wait(500);
  };
  /* docRow: the whole row opens the document modal (no ⋮ on document rows since 2026-10-20) */
  const docRow = (text, kind) => async (h) => {
    const row = await h.scroll(`.e-permits-stack__item[data-dosar-detail-row^="${kind}"]`, text);
    row.click(); await h.wait(500);
  };
  const dosList = (as) => ({ flow: "back-office", as, ready: "tr[data-workplace-row], .e-permits-workplace" });
  /* Setări: jump to a section from the section list */
  const cfgNav = (key) => async (h) => { await h.click(`[data-cfg2-nav="${key}"]`); await h.wait(500); };
  const bio = (tab, run) => svc(tab, run, BIO);
  /* Tipuri solicitări: a request type's drawer on the Avizare tab */
  const rtAviz = (id) => async (h) => { await h.click(`[data-passport-configure-rt="${id}"]`); await h.click('[data-rt-tab="avizare"]'); };
  /* Documente: open a document; a row's ⋮ action */
  /* the row (first in DOM order) — read-only rows have no button since no-lone-detalii-v1; the row opens the same drawer */
  const docOpen = (id) => async (h) => { await h.click(`[data-doc-row="${id}"], [data-doc-open="${id}"]`); await h.wait(300); };
  const docMenu = (id, action) => async (h) => {
    /* the menu item is hidden until ⋮ opens: find the row by its visible „Editează” */
    const open = await h.find(`[data-doc-open="${id}"]`);
    open.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
    await h.wait(300); await h.click(`[data-doc-action="${action}"][data-doc-id="${id}"]`);
  };
  /* Publicare în RAP with the whole request form (100 fields): summary + picker modal */
  const SAN = "003000118"; /* Autorizație sanitară pentru funcționare */
  const rapBig = (run) => svc("settings", async (h) => { await cfgNav("rap")(h); if (run) await run(h); }, SAN);
  const rapOpen = async (h) => { await h.click("[data-cfg-rap-open]"); };
  /* Subdiviziuni de examinare: open the picker; tick a whole raion through the search, or
     single subdivisions in the list (the clicks a person makes, without the per-click pause) */
  const subdivOpen = async (h) => { await cfgNav("exam")(h); await h.click("[data-cfg-subdiv-open]"); };
  const subdivRaion = async (h, raion) => { await h.fill("[data-cfg-subdiv-search]", raion, { leave: false }); await h.click(`[data-cfg-subdiv-group="${raion}"] [data-cfg-subdiv-all]`); };
  const subdivTick = (raion, from, to) => { for (let n = from; n <= to; n += 1) document.querySelector(`[data-cfg-subdiv-item][value="Primăria ${raion} · UAT ${String(n).padStart(2, "0")}"]`)?.click(); };
  /* the 134 of 02p2 / 02p4: own 2 + Anenii Noi 3/16 + Briceni all + Cahul UAT 05 + Orhei all +
     Soroca 12/38 + Ungheni 5/35 + mun. Chișinău all + mun. Bălți all */
  const subdivPick134 = async (h) => {
    for (const raion of ["Briceni", "Orhei", "mun. Chișinău", "mun. Bălți"]) await subdivRaion(h, raion);
    await h.fill("[data-cfg-subdiv-search]", "", { leave: false });
    subdivTick("Anenii Noi", 1, 3); subdivTick("Cahul", 5, 5); subdivTick("Soroca", 1, 12); subdivTick("Ungheni", 1, 5);
    await h.wait(300);
  };

  /* shared click paths */
  const openTax = (taxId) => async (h) => { await h.click(`[data-pay-edit="${taxId}"]`); };
  const applyOneTariff = async (h) => {
    /* „Aplică ca atare” lives in the row's ⋮ (uniform row actions, 2026-10-09) */
    (await h.find("[data-tax-configure]")).closest(".e-permits-stack__item, tr").querySelector("[data-stack-menu-trigger]").click();
    await h.wait(300);
    await h.click("[data-tax-apply]");
    await h.click("[data-service-confirm-ok]").catch(() => {});
    await h.hash(`#serviciu/${SVC}/general`);
  };
  const rowMenu = (listSelector, index = 0) => async (h) => {
    await h.find(`${listSelector} [data-stack-menu-trigger]`);
    await h.nth(`${listSelector} [data-stack-menu-trigger]`, index);
  };
  const ntplWizard = async (h) => {
    await h.click("[data-ntpl-new]");
    await h.fill("#ntpl-c-name", "Cerere suspendată — lipsă documente");
    await h.click('[data-ntpl-c-choice][data-value="copy"]');
    await h.choose('[data-ntpl-c-select="copyFrom"]');
  };
  const ntplWizardStep = (step) => async (h) => {
    await ntplWizard(h);
    await h.click("[data-ntpl-c-next]");
    if (step === 2) return;
    await h.click("[data-ntpl-c-rule-add]");
    await h.click("[data-ntpl-c-next]");
    await h.fill("#ntpl-c-subject", "Cererea {{CaseNumber}} a fost suspendată").catch(() => {});
    await h.fill("#ntpl-c-body", "Stimate {{ApplicantName}},\n\nCererea {{CaseNumber}} a fost suspendată: lipsesc documente. Le puteți încărca din Cabinetul personal.").catch(() => {});
    await h.fill("#ntpl-c-plain", "SIA GEAP: cererea {{CaseNumber}} a fost suspendată. Încărcați documentele lipsă.").catch(() => {});
    if (step === 3) return;
    await h.click("[data-ntpl-c-next]");
    if (step === 4) return;
    await h.click("[data-ntpl-c-done]");
  };
  const ntplClone = async (h) => { await h.click("[data-ntpl-clone]"); };
  /* the constructor opens from the preview's footer („Deschide constructorul”) */
  const dtplOpenNth = (index) => async (h) => { await h.nth("[data-dtpl-preview]", index); await h.click("[data-tpl-preview-builder]"); };
  const dtplBuilder = dtplOpenNth(0);
  /* unsaved-review-v1: the status in a page header (not the copy in a save bar) */
  const CHANGES_HEAD = (key) => `.e-permits-page-header [data-profile-changes="${key}"]`;
  const TOP = () => { let el = [...document.querySelectorAll(".e-permits-page-header__title")].find((x) => x.getClientRects().length); while ((el = el?.parentElement)) if (el.scrollTop) el.scrollTop = 0; window.scrollTo(0, 0); };
  const cfg2ThreeChanges = async (h) => {
    /* the section list is hidden on phones: jump only when it shows */
    const nav = async (key) => { const el = document.querySelector(`[data-cfg2-nav="${key}"]`); if (el?.getClientRects().length) { el.click(); await h.wait(500); } };
    await nav("suspension");
    await h.click('[data-cfg-switch="suspEditable"]'); await h.wait(300);
    await h.fill("#cfg-payTerm", "15"); await h.wait(200);
    await nav("deps");
    await h.click("[data-cfg2-dep-remove]"); await h.wait(300);
    TOP(); await h.wait(200);
  };
  const ntplTwoEdits = async (h) => {
    const subject = await h.find('[data-ntplp-text="subject"]');
    await h.fill('[data-ntplp-text="subject"]', `${subject.value} — actualizat`, { leave: false });
    await h.fill('[data-ntplp-text="plain"]', "Cererea a fost aprobată. Detalii în cabinet.", { leave: false });
    document.activeElement?.blur(); TOP(); await h.wait(200);
  };
  const dtplTwoEdits = async (h) => {
    await dtplOpenNth(1)(h);
    const surface = await h.find("[data-dtpl-surface]");
    surface.focus();
    const range = document.createRange();
    range.selectNodeContents(surface.querySelector("h1") || surface);
    range.collapse(false);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    document.execCommand("insertText", false, " MOTIVATĂ");
    await h.click('[data-dtpl-token="{{CaseNumber}}"]');
    await h.click('[data-dtpl-view="test"]');
    const json = await h.find("[data-dtpl-json]");
    await h.fill("[data-dtpl-json]", json.value.replace(/: "[^"]*"/, ': "Valoare de test 2026"'), { leave: false });
    await h.click('[data-dtpl-view="template"]');
  };

  /* Utilizatori › profil click paths */
  const usr = (tab, run) => ({ flow: "back-office", as: ADMIN, hash: `#utilizator/user-1/${tab}`, run });
  const headerMenu = async (h) => { await h.click("[data-user-profile] .e-permits-page-header__actions [data-stack-menu-trigger]"); };
  /* a toast from an in-between step is not part of the target screen */
  const clearToasts = async (h) => { document.querySelectorAll(".toast").forEach((toast) => window.GEAPToast?.dismiss?.(toast)); await h.wait(450); };
  const deactivate = async (h) => { await headerMenu(h); await h.click("[data-user-profile-status-toggle]"); await h.click("[data-service-confirm-ok]"); await h.wait(600); await clearToasts(h); };
  const editFunction = async (h) => { await h.fill("#user-geap-function", "Specialist principal", { leave: false }); };
  const rowMenu0 = async (h) => { await h.nth("[data-user-profile] .e-permits-stack__item [data-stack-menu-trigger]", 0); };
  const comboFilled = async (h) => {
    await h.click("[data-combo-add-open]");
    await h.choose('[data-combo-field="role"]', "Supervizor");
    await h.choose('[data-combo-field="authority"]', "ansp");
    await h.wait(300);
    const sub = document.querySelector('[data-combo-field="subdivision"]');
    const select = sub.tagName === "SELECT" ? sub : sub.querySelector("select");
    await h.choose('[data-combo-field="subdivision"]', [...select.options].map((o) => o.value).filter(Boolean)[1]);
  };
  const twoWithdrawn = async (h) => { await h.nth("[data-perm-switch]", 0); await h.wait(300); await h.nth("[data-perm-switch]", 5); await h.wait(300); };
  const avizare = async (h) => {
    await h.click('[data-perm-group="avizare"]');
    for (const id of ["av1", "av2", "av3"]) { await h.click(`[data-perm-switch="${id}"]`); await h.wait(300); }
  };

  /* Administrare › Tarife (Figma page "BO -> Tarife") */
  const trf = (run) => ({ flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="tariffs"]'); if (run) await run(h); } });
  const newTariff = async (h) => { await h.click("[data-workplace-add-tariff]"); };
  /* step 1 „Detalii” filled, then Continuă → step 2 „Sumă și formulă” */
  const tariffStep2 = async (h) => { await newTariff(h); await h.fill("#tariff-name", "Taxă pe suprafață comercială"); await h.choose('[data-tariff-select="type"]', "Taxă de examinare"); await h.click("[data-tariff-next]"); };
  const editTariff = (id) => async (h) => { await h.click(`[data-tariff-edit="${id}"]`); };

  /* Șabloane de notificare (Figma page "BO -> Șabloane de notificare"): template AprobareNIAC */
  const ntpl = (tab, run) => ({ flow: "back-office", as: ADMIN, hash: `#sablon/AprobareNIAC/${tab}`, run });
  /* the Figma diff = RO subject + short text changed */
  const ntplEdit = async (h) => {
    await h.fill("#ntplp-subject-ro", "Cererea {{CaseNumber}} a fost aprobată");
    await h.fill("#ntplp-plain", "SIA GEAP: cererea {{CaseNumber}} a fost aprobată. Detalii în Cabinetul personal.");
  };
  const ntplPublishOpen = async (h) => { await ntplEdit(h); await h.click("[data-ntpl-publish]"); };
  /* the publish modal (templates and services share it): „La o dată anume” + a date */
  const pickPublishDate = async (h, iso) => {
    await h.click('[data-ntpl-publish-when="scheduled"]');
    const picker = await h.find("[data-ntpl-publish-date]");
    picker.dataset.selected = iso;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    await h.wait(450);
  };
  /* the service publishes a tariff change for 15 Oct 2026 (Programat) */
  const publishScheduled = async (h) => {
    await applyOneTariff(h);
    await h.click("[data-service-publish]");
    await pickPublishDate(h, "2026-10-15");
    await h.fill("#ntpl-publish-modal textarea", "Taxă de examinare actualizată conform HG nr. 112/2026.", { leave: false });
    await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    await h.wait(600);
    await clearToasts(h);
  };
  const ntplScheduled = async (h) => { await ntplPublishOpen(h); await pickPublishDate(h, "2026-10-15"); };

  /* Administrare › Clasificatoare (Figma page "BO -> Clasificatoare") */
  const LOCAL_ADMIN = "ansp-local-admin";
  const clf = (hash, run, as = ADMIN) => ({ flow: "back-office", as, hash, run });
  const clfProfile = (id, tab, run, as) => clf(`#clasificator/${id}/${tab}`, run, as);
  const clfNew = async (h) => { await h.click("[data-workplace-add-classifier]"); };
  const clfStep1 = async (h) => {
    await clfNew(h);
    await h.fill("#clas-c-name", "Motive de suspendare — ANSP");
    await h.choose('select[data-clas-create="familie"]');
  };
  const clfStep = (n) => async (h) => { await clfStep1(h); for (let i = 1; i < n; i += 1) await h.click("[data-clas-create-next]"); };
  /* a saved value edit opens the draft over the published classifier */
  const clfDraft = async (h) => {
    await h.nth("[data-clas-grid-edit]", 0);
    await h.fill("#clas-v-ro", "Depus (în așteptare)");
    await h.click("[data-clas-value-save]");
    await h.wait(500);
    await clearToasts(h);
  };

  /* post-process helpers: the EVO Cabinet page, the intent screen and the
     FOD2 wizard opened straight on a step (?pp=<type>&act=<id>) */
  const PP_FO = "e-permits-acte-permisive.html";
  /* one facet of the shared facet filter (js/facet-filter.js): desktop = its chip (→ popover); phones (≤760) = the
     icon-only „Filtre” in the search row (phone-toolbar-v2, `data-filter-all`; no facet chips) → the all-filters sheet with THAT facet's section
     open and the others folded (so a value click can only hit this facet) */
  const ffFacet = async (h, facet) => {
    if (!window.matchMedia("(max-width: 760px)").matches) { await h.click(`[data-filter-facet="${facet}"]`); return; }
    const SHEET = '.e-permits-filter-sheet.is-all[aria-hidden="false"]';
    if (!document.querySelector(SHEET)) { await h.click("[data-filter-all]"); await h.find(`${SHEET} .bottom-sheet__panel`); await h.wait(400); }
    document.querySelectorAll(`${SHEET} [data-sheet-toggle][aria-expanded="true"]`).forEach((t) => { if (t.dataset.sheetToggle !== facet) t.click(); });
    const toggle = document.querySelector(`${SHEET} [data-sheet-toggle="${facet}"]`);
    if (toggle?.getAttribute("aria-expanded") !== "true") await h.click(`${SHEET} [data-sheet-toggle="${facet}"]`);
    toggle?.scrollIntoView({ block: "start" });
    await h.wait(150);
  };
  const ppCab = (run) => ({ page: "cabinet-evo/index.html", ready: "[data-cab-card]", run });
  /* an act row may sit on page 2 (12 acts since type-first-v1, 2026-10-21): page on until it is there, then scroll to it */
  const cabFind = async (h, id) => {
    for (let page = 2; !document.querySelector(`[data-cab-card="${id}"]`) && document.querySelector(`[data-cab-page="${page}"]`) && page < 6; page += 1) await h.click(`[data-cab-page="${page}"]`);
    await h.scroll(`[data-cab-card="${id}"]`);
  };
  /* the act post-process menu (js/act-row.js): the anchored dropdown item at every width (action-menu-v1 — the phone
     action sheet is gone); kept as a helper so the states read the same */
  const actMenuPick = (itemSel) => async (h) => { await h.click(itemSel); };
  /* a request header action (profile-phone-v1): the button itself, or — when the phone row moved it into the „⋯”
     (priority+) — the same action from that menu */
  const smHeadAct = async (h, action) => {
    await h.find("[data-sm-profile] [data-cab-profile-header] .e-permits-page-header__actions");
    await h.wait(300);
    const sel = `[data-sm-profile] [data-cab-profile-header] .e-permits-page-header__actions > [data-sm-action="${action}"]`;
    const own = [...document.querySelectorAll(sel)].find((el) => el.getClientRects().length);
    if (own) { await h.click(sel); return; }
    await h.click("[data-sm-profile] .cab-act-header__overflow [data-cab-menu-trigger]");
    await h.click(`#sm-header-more [data-sm-action="${action}"]`);
  };
  /* the acts list „Filtre” (js/facet-filter.js): desktop = button → bar → popover → Confirmă → Aplică;
     phones (≤760) = chip → bottom sheet → „Arată N rezultate” (the RAP helpers) */
  const cabPhone = () => window.matchMedia("(max-width: 760px)").matches;
  const cabOpen = async (h) => { if (!cabPhone()) await h.click("[data-cab-filter-toggle]"); };
  const cabPick = (facet, values) => async (h) => {
    await cabOpen(h);
    await ffFacet(h, facet);
    for (const value of values) await h.click(`[data-filter-option][value="${value}"]`);
    await h.click(cabPhone() ? "[data-sheet-apply]" : "[data-filter-confirm]");
    if (cabPhone()) await h.wait(400);
  };
  const cabCommit = async (h) => { if (!cabPhone()) await h.click("[data-filter-commit]"); };
  const ppIntent = (run) => ({ page: PP_FO, flow: "full", hash: "#intent", ready: "[data-fo-intent-act], [data-fo-intent-empty]", run });
  const ppFo = (type, act, step = 1, run) => ({
    page: PP_FO,
    flow: "full",
    params: { pp: type, act },
    hash: step === 1 ? "#request" : `#request-step-${step}`,
    ready: "body[data-fo-postprocess] [data-fo-step-panel]:not([hidden]) h1",
    run: async (h) => { await clearToasts(h); if (run) await run(h); }
  });
  /* primary request, service 09 (Figma FO · 09, columns F0–F8) */
  /* „Configurare flux” (FO test panel): pick a value, opening the panel first */
  const cfgPick = async (h, group, value) => {
    if (document.querySelector("[data-fo-testcfg-panel]")?.hidden) await h.click("[data-fo-testcfg-toggle]");
    await h.click(`[data-fo-testcfg-group='${group}'] [data-fo-testcfg-value='${value}']`);
    await h.wait(1600);
  };
  /* step 3 with an MDocs document (field 1), an uploaded PDF (field 2) and a typed step-2 answer */
  const cfgDocs = async (h) => {
    const name = document.querySelector("[data-fo-step-panel='2'] #fo-object-name");
    if (name) name.value = "Cafeneaua „La Izvor”";
    await h.click("[data-fo-step-panel='3'] [data-fo-open-doc-modal]"); await h.wait(300); await h.click("[data-fo-doc-modal-list] .e-permits-fo-lib-item"); await h.click("[data-fo-doc-modal-submit]"); await h.wait(300);
    await h.click("[data-fo-step-panel='3'] [data-fo-doc-field]:nth-of-type(2) [data-fo-open-doc-modal]"); await h.wait(300);
    await h.click('[data-fo-doc-tab="upload"]');
    const input = document.querySelector("[data-fo-doc-file-input]");
    const files = new DataTransfer();
    files.items.add(new File(["%PDF-1.4"], "planul-incaperilor-parter.pdf", { type: "application/pdf" }));
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await h.wait(200); await h.click("[data-fo-doc-modal-submit]"); await h.wait(300);
  };
  const foReq = (step, params = {}, run) => ({
    page: PP_FO, flow: "full", params,
    hash: step === 1 ? "#request" : `#request-step-${step}`,
    ready: "[data-fo-step-panel]:not([hidden]) h1",
    run: async (h) => { await clearToasts(h); if (run) await run(h); }
  });
  /* EVO Cabinet › Solicitările mele (sm-) and the catalog (cat-): one page, ?view=… ;
     ?as=<subject> = perspective, other params = returns from FOD2 / MPay and error demos */
  const CAB = "cabinet-evo/index.html";
  const SM_READY = "[data-sm-card], [data-sm-profile], .cab-state";
  const sm = (run, params = {}, hash = "") => ({ page: CAB, params: { view: "solicitari", ...params }, hash, ready: SM_READY, run });
  const smDosar = (id, run, params = {}) => sm(run, params, `#dosar/${id}`);
  /* a request row may sit on page 2+ (19 requests since 2026-10-20): page on until it is there, then scroll to it */
  const smFind = async (h, id) => {
    for (let page = 2; !document.querySelector(`[data-sm-card="${id}"]`) && document.querySelector(`[data-sm-page="${page}"]`) && page < 6; page += 1) await h.click(`[data-sm-page="${page}"]`);
    await h.scroll(`[data-sm-card="${id}"]`);
  };
  /* phones: open the sort sheet, pick a key and optionally an order (radio rows) — no „Aplică” */
  const smSortSheet = (key, order) => async (h) => {
    await h.click(".cab-sort__trigger"); await h.wait(350);
    await h.click(`.e-permits-sort-sheet__key:has(input[name="geap-sort-sheet-key"][value="${key}"])`);
    if (order) await h.click(`.e-permits-sort-sheet__key:has(input[name="geap-sort-sheet-order"][value="${order}"])`);
    document.activeElement?.blur?.(); /* a tap leaves no focus ring (the demo's programmatic click would) */
  };
  /* a row whose only action is „Detalii” has no trigger at all (no-lone-detalii-v1) → the state shows the plain card */
  /* EVO header (evo-header-v1): phones open ☰, desktop the visible Servicii / Meniu trigger */
  const evoPhone = () => window.matchMedia("(max-width: 760px)").matches;
  const evoMenu = async (h) => {
    if (evoPhone()) { await h.click(".evo-header [data-evo-panel-open]"); await h.find(".evo-header__panel:not([hidden])"); return; }
    const compact = window.matchMedia("(max-width: 1100px)").matches;
    await h.click(`.evo-header [data-evo-mega-trigger="${compact ? "meniu" : "servicii"}"]`);
    await h.find(".evo-header__mega:not([hidden])");
  };
  const smMenu = (id) => async (h) => { await smFind(h, id); const sel = `[data-sm-card="${id}"] [data-cab-menu-trigger]`; if (document.querySelector(sel)) await h.click(sel); };
  const ntAt = (kind) => ({ page: CAB, params: { view: "notificari" }, ready: ".nt-item, .cab-state", run: async (h) => { await h.scroll(`[data-nt-kind="${kind}"]`); } });
  /* „Filtre” (US-158 AC-04 / 05) = the shared facet filter: desktop toggle → chip → option → Confirmă → Aplică;
     phones chip → sheet → „Arată N rezultate” */
  const smPhone = () => window.matchMedia("(max-width: 760px)").matches;
  /* apply the first N checklist values across the facets (date facets skipped), then close the bar (desktop) — so the
     „Filtre” trigger shows its active look on its own (filter-chip-v1) */
  const smPickMany = (n) => async (h) => {
    let left = n;
    const tick = async (sel) => { for (const box of [...document.querySelectorAll(sel)]) { if (left <= 0) break; if (box.type === "checkbox" && !box.checked) { box.click(); left -= 1; await h.wait(40); } } };
    if (smPhone()) {
      const SHEET = '.e-permits-filter-sheet.is-all[aria-hidden="false"]';
      await h.click("[data-filter-all]"); await h.find(`${SHEET} .bottom-sheet__panel`); await h.wait(400);
      for (const t of [...document.querySelectorAll(`${SHEET} [data-sheet-toggle]`)]) {
        if (left <= 0) break;
        if (t.getAttribute("aria-expanded") !== "true") { t.click(); await h.wait(250); }
        await tick(`${SHEET} [data-filter-option][data-sheet-facet="${t.dataset.sheetToggle}"]`);
      }
      await h.click("[data-sheet-apply]"); await h.wait(400); return;
    }
    if (document.querySelector("[data-sm-filters]")?.hidden) await h.click("[data-sm-filter-toggle]");
    for (const key of [...document.querySelectorAll("[data-sm-filters] [data-filter-facet]")].map((c) => c.dataset.filterFacet)) {
      if (left <= 0) break;
      await h.click(`[data-sm-filters] [data-filter-facet="${key}"]`); await h.wait(250);
      if (document.querySelector(".e-permits-workplace__filter-pop [data-filter-date-preset]")) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await h.wait(200); continue; }
      await tick(".e-permits-workplace__filter-pop [data-filter-option]");
      await h.click("[data-filter-confirm]"); await h.wait(200);
    }
    await h.click("[data-filter-commit]"); await h.wait(300);
    await h.click("[data-sm-filter-toggle]"); await h.wait(200);
    document.activeElement?.blur();
  };
  const smPick = (facet, values) => async (h) => {
    if (!smPhone() && document.querySelector("[data-sm-filters]")?.hidden) await h.click("[data-sm-filter-toggle]");
    await ffFacet(h, facet);
    for (const value of values) await h.click(`[data-filter-option]${value.endsWith("*") ? `[value^="${value.slice(0, -1)}"]` : `[value="${value}"]`}`);
    await h.click(smPhone() ? "[data-sheet-apply]" : "[data-filter-confirm]");
    if (smPhone()) await h.wait(400); else await h.click("[data-filter-commit]");
  };
  /* the facet filter's date range facet (js/facet-filter.js, 2026-10-20) on any page: open the facet (desktop: the
     toolbar toggle if the bar is closed → chip → popover; phones: chip → sheet), tick a preset or „Interval
     personalizat” + De la / Până la, then Confirmă → „Aplică filtrele” (desktop, unless commit: false) / „Arată”
     (phones). `stay` leaves the popover / sheet open. */
  const ffPhone = () => window.matchMedia("(max-width: 760px)").matches;
  const ffDay = async (h, facet, part, iso) => {
    const input = await h.find(`[data-filter-date-input="${facet}"][data-filter-date-part="${part}"]`);
    const [y, m, d] = iso.split("-");
    input.closest("[data-date-picker]").dataset.selected = iso;
    input.value = `${d}/${m}/${y}`;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await h.wait(200);
  };
  const ffDate = (toggle, facet, { preset = "", from = "", to = "", stay = false, commit = true } = {}) => async (h) => {
    const phone = ffPhone();
    const shown = () => [...document.querySelectorAll(`[data-filter-facet="${facet}"]`)].some((el) => el.getClientRects().length);
    if (!phone && !shown()) await h.click(toggle);
    await ffFacet(h, facet);
    if (preset || from || to) await h.click(`[data-filter-date-preset="${facet}"][value="${preset || "interval"}"]`);
    if (from) await ffDay(h, facet, "from", from);
    if (to) await ffDay(h, facet, "to", to);
    if (stay) return;
    await h.click(phone ? "[data-sheet-apply]" : "[data-filter-confirm]");
    if (phone) { await h.wait(400); return; }
    const apply = [...document.querySelectorAll("[data-filter-commit]")].find((el) => el.getClientRects().length);
    if (commit && apply) await h.click("[data-filter-commit]");
  };
  const smDateFacet = (facet, opts) => ffDate("[data-sm-filter-toggle]", facet, opts);
  const cat = (run, params = {}, hash = "") => ({ page: CAB, params: { view: "catalog", ...params }, hash, ready: "[data-cat-card], [data-cat-service], .cab-state", run });

  const ppReason = (value) => async (h) => {
    await h.click("[data-fo-step-panel='2'] [data-fo-pp-select='pp-reason'] .e-permits-fo-select__button");
    await h.click(".e-permits-fo-select__option", value);
  };

  /* eKYC (ek-): the console on the permits shell, the login on bo-login.html */
  const EK_ADMIN = "ekyc-admin";
  const ek = (hash, run, extra = {}) => ({ flow: "ekyc", as: EK_ADMIN, hash, ready: ".e-permits-ekyc-page:not([hidden]), tr[data-workplace-row], .e-permits-empty-cell, .e-permits-dosar-profil:not([hidden]) .e-permits-dosar-profil__section", run, ...extra });
  const ekList = (hash, run) => ek(hash, run, { ready: "tr[data-workplace-row]" });
  const ekSes = (id, tab = "general", run) => ek(`#sesiune/${id}/${tab}`, run, { ready: "[data-ekyc-tab], .e-permits-dosar-profil .e-permits-empty" });
  /* batch 2 (2026-10-13): roles + the review screen #revizie/<id>/<tab> */
  const EK_OP = "ekyc-operator";
  const EK_SUP = "ekyc-supervisor";
  const EK_AUD = "ekyc-auditor";
  const ekAs = (as, hash, run, extra = {}) => ek(hash, run, { as, ...extra });
  const ekQueue = (as, hash, run, extra = {}) => ek(hash, run, { as, ready: "tr[data-workplace-row]", ...extra });
  const ekRev = (as, id, tab = "revizie", run, extra = {}) => ek(`#revizie/${id}/${tab}`, run, { as, ready: "[data-ekyc-tab], .e-permits-dosar-profil .e-permits-empty", ...extra });
  const ekAud = (id, tab = "general", run) => ek(`#sesiune/${id}/${tab}`, run, { as: EK_AUD, ready: "[data-ekyc-tab], .e-permits-dosar-profil .e-permits-empty" });
  /* „Filtrare avansată” = the shared facet filter of the BO Dosare (js/facet-filter.js): desktop = button →
     bar → chip popover → Confirmă → „Aplică filtrele”; phones (≤760, every list since phone-toolbar-v2)
     = the icon-only „Filtre” in the search row → bottom sheet → „Arată N rezultate” (the Cabinet / RAP helpers). A value is
     a string (exact option value) or a number (nth visible option). */
  const ekPhone = () => window.matchMedia("(max-width: 760px)").matches;
  const ekFilterOpen = async (h) => { if (!ekPhone() && document.querySelector("[data-workplace-filters]")?.hidden) await h.click("[data-workplace-filter-toggle]"); };
  const ekFacet = (facet) => async (h) => { await ekFilterOpen(h); await ffFacet(h, facet); };
  const ekTick = async (h, values) => { for (const v of values) { if (typeof v === "number") await h.nth("[data-filter-option]", v); else await h.click(`[data-filter-option][value="${v}"]`); } };
  const ekPick = (facet, values) => async (h) => { await ekFacet(facet)(h); await ekTick(h, values); await h.click(ekPhone() ? "[data-sheet-apply]" : "[data-filter-confirm]"); if (ekPhone()) await h.wait(400); };
  const ekCommit = async (h) => { if (!ekPhone()) await h.click("[data-filter-commit]"); };
  const ekDecide = (decision, reason, text) => async (h) => {
    await h.click(`[data-ekyc-decide="${decision}"]`);
    if (reason) await h.choose('[data-ekyc-field="reason"]', reason);
    if (text) await h.fill("#ekyc-f-text", text);
    await h.click("[data-ekyc-decide-submit]");
  };
  /* batch 3 (Configurare + Administrare, js/ekyc-config.js): detail pages, Setări-style page forms */
  const ekDet = (hash, run, extra = {}) => ek(hash, run, { ready: "[data-ekcfg-tab], .e-permits-dosar-profil .e-permits-empty", ...extra });
  const ekPage = (hash, run, extra = {}) => ek(hash, run, { ready: "[data-ekcfg-page]", ...extra });
  const ekRow = (attr, id) => async (h) => { await h.click(`tr[data-workplace-row="${id}"] [data-stack-menu-trigger]`); await h.click(`[data-ekcfg="${attr}"][data-id="${id}"]`); };
  const ekCert = (name) => async (h) => {
    await h.click('[data-workplace-add-product]');
    await h.find("[data-ekcfg-drawer] [data-ekcfg-file-pick]");
    const input = document.querySelector("[data-ekcfg-file]");
    const dt = new DataTransfer();
    dt.items.add(new File(["-----BEGIN CERTIFICATE-----"], name, { type: "application/x-pem-file" }));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await h.wait(400);
  };
  const ekLogin = (params = {}) => ({ page: "bo-login.html", params: { product: "ekyc", ...params }, ready: "[data-bo-login] h1" });

  window.GEAP_DEMO_STATES = {
    /* ---- Utilizatori › profil (Figma page "BO -> Utilizatori") ---- */
    "usr-01": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/general" },
    "usr-02": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/roles" },
    "usr-03": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/permissions" },
    "usr-04": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/delegations" },
    "usr-05": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/events" },
    "usr-01a": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/general", run: async (h) => { await h.fill("#user-geap-function", "Specialist principal", { leave: false }); } },
    "usr-02a": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/roles", run: async (h) => { await h.click("[data-combo-add-open]"); } },
    "usr-02b": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/roles", run: async (h) => { await h.click("[data-combo-add-open]"); await h.click("[data-user-combo-save]"); } },
    "usr-03a": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/permissions", run: async (h) => { await h.nth("[data-perm-switch]", 0); await h.wait(300); await h.nth("[data-perm-switch]", 5); } },
    "usr-03b": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/permissions", run: async (h) => { await h.fill("[data-perm-search]", "aviz", { leave: false }); } },
    "usr-03c": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/permissions", run: async (h) => {
      await h.click('[data-perm-group="avizare"]');
      await h.click('[data-perm-switch="av1"]'); await h.wait(300);
      await h.click('[data-perm-switch="av2"]'); await h.wait(300);
      await h.click('[data-perm-switch="av3"]'); await h.wait(300);
    } },
    "usr-03d": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/permissions", run: async (h) => {
      await h.click('[data-perm-group="avizare"]');
      await h.click('[data-perm-switch="av1"]'); await h.wait(300);
      await h.click('[data-perm-switch="av2"]'); await h.wait(300);
      await h.click('[data-perm-switch="av3"]'); await h.wait(300);
      await h.click("[data-user-profile] [data-profile-changes]");
    } },
    "rol-00": { flow: "back-office", as: ADMIN, hash: "#rol/rol-specialist/general" },
    "rol-01b": { flow: "back-office", as: ADMIN, hash: "#rol/rol-specialist/permissions", run: async (h) => { await h.nth("[data-perm-switch]", 1); await h.wait(300); await h.click("[data-role-profile] [data-profile-changes]"); } },
    "rol-01": { flow: "back-office", as: ADMIN, hash: "#rol/rol-specialist/permissions" },
    "rol-01a": { flow: "back-office", as: ADMIN, hash: "#rol/rol-specialist/permissions", run: async (h) => { await h.nth("[data-perm-switch]", 1); } },
    "usr-02c": { flow: "back-office", as: ADMIN, hash: "#utilizator/user-1/roles", run: async (h) => { await h.nth("[data-passport-body] [data-stack-menu-trigger], [data-user-profile-panel] [data-stack-menu-trigger]", 0); } },

    /* the rest of the Figma Users / Roles blocks — id = usr-<block code> (U03b → usr-u03b) */
    "usr-u03b": usr("general", headerMenu),
    "usr-u03c": usr("general", async (h) => { await headerMenu(h); await h.click("[data-user-profile-status-toggle]"); }),
    "usr-u03d": usr("general", async (h) => { await deactivate(h); await headerMenu(h); }),
    "usr-u03e": usr("general", async (h) => { await deactivate(h); await headerMenu(h); await h.click("[data-user-profile-delete]"); }),
    "usr-u03f": usr("general", async (h) => { await editFunction(h); await h.click("[data-user-profile] [data-profile-changes]"); }),
    "usr-u03g": usr("general", async (h) => { await editFunction(h); await h.click("[data-user-profile-save]"); }),
    /* 2026-10-21 (pd-tags-v1) · Utilizatori › „Adaugă utilizator” → IDNP found in RSSP → one role combination added
       (the combination card with its red ×), scrolled to it — Figma block */
    "usr-u03x": { flow: "back-office", as: ADMIN, hash: "#users", ready: "[data-workplace-add-user]:not([hidden])", run: async (h) => {
      await h.click("[data-workplace-add-user]");
      await h.fill("[data-user-create] #user-create-idnp", "2005003318852", { leave: false });
      await h.click("[data-user-create] [data-user-lookup]");
      await h.click("[data-user-create] [data-user-combination-open]");
      await h.choose('[data-user-create] select[name="roleId"]', "specialist");
      await h.choose('[data-user-create] select[name="authorityId"]', "ansp");
      await h.choose('[data-user-create] select[name="subdivisionId"]', "ansp-central");
      await h.click("[data-user-create] [data-user-combination-confirm]");
      await h.scroll("[data-user-create] .e-permits-user-create__combo-card");
      document.activeElement?.blur?.();
    } },
    "usr-u04c": usr("roles", comboFilled),
    "usr-u04e": usr("roles", async (h) => { await rowMenu0(h); await h.click("[data-combo-remove]"); }),
    "usr-u04f": usr("roles", async (h) => { await comboFilled(h); await h.click("[data-user-combo-save]"); }),
    "usr-u04g": usr("roles", async (h) => { await rowMenu0(h); await h.click("[data-combo-remove]"); await h.click("[data-service-confirm-ok]"); await h.wait(700); await clearToasts(h); await rowMenu0(h); }),
    "usr-u05b": usr("permissions", async (h) => { await twoWithdrawn(h); await h.click('[data-perm-filter="changed"]'); }),
    "usr-u05d": usr("permissions", async (h) => { await h.fill("[data-perm-search]", "zzz", { leave: false }); }),
    "usr-u05e": usr("permissions", async (h) => { await twoWithdrawn(h); await h.click("[data-user-profile-save]"); }),
    "usr-u05f": usr("permissions", async (h) => { await twoWithdrawn(h); await h.click("[data-user-profile] [data-profile-changes]"); }),
    "usr-u05i": usr("permissions", async (h) => { await avizare(h); await h.click("[data-user-profile] [data-profile-changes]"); await h.click("#profile-changes-modal [data-change-undo]"); }),
    "usr-u05j": usr("permissions", async (h) => { await twoWithdrawn(h); await h.click("[data-user-profile] [data-profile-changes]"); await h.click("#profile-changes-modal [data-change-undo]"); await h.click("#profile-changes-modal [data-change-undo]"); }),
    "usr-u05k": usr("permissions", async (h) => { await twoWithdrawn(h); await h.click("[data-user-profile] [data-profile-changes]"); await h.click("[data-profile-changes-discard]"); }),
    "rol-01c": { flow: "back-office", as: ADMIN, hash: "#rol/rol-specialist/permissions", run: async (h) => { await h.nth("[data-perm-switch]", 1); await h.wait(300); await h.click("[data-role-profile-save]"); } },

    /* ---- Servicii › Profile Serviciu (Figma page "BO -> Servicii") ---- */
    /* US-111 (Azure 90576) — a new service only comes from RSSP: Configurări servicii ›
       «Sincronizare serviciu» → code → summary. Codes: 003000333 new + new authority, 003000451
       new + existing authority, 000000000 RSSP unavailable, 003999998 invalid answer */
    "srv-01": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); } },
    /* US-230 AC-05: a published service with a change since publishing → „1 modificare nepublicată” under Statut */
    /* US-231 AC-05/06: automatic sync frequency (central admin) */
    "srv-03m": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); } },
    "srv-03": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-autosync]"); } },
    "srv-03a": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-autosync]"); await h.click('[data-autosync-freq="weekly"]'); } },
    "srv-02": svc("fees", async (h) => { await applyOneTariff(h); await h.click('[data-nav-id="service-config"]'); }),
    "srv-01a": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-sync-manual]"); } },
    "srv-01b": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-sync-manual]"); await h.click("[data-service-sync-submit]"); } },
    ...Object.fromEntries([["srv-01d", "000000000"], ["srv-01e", "003999997"], ["srv-01f", "003999998"]].map(([id, code]) => [id, { flow: "back-office", as: ADMIN, run: async (h) => {
      await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-sync-manual]");
      await h.fill("[data-service-sync-code]", code, { leave: false }); await h.click("[data-service-sync-submit]");
      await h.find("[data-service-sync-body] .banner--error", null, 15000);
    } }])),
    ...Object.fromEntries([["srv-01g", "003000333"], ["srv-01h", "003000451"]].map(([id, code]) => [id, { flow: "back-office", as: ADMIN, run: async (h) => {
      await h.click('[data-nav-id="service-config"]'); await h.click("[data-workplace-sync-service] [data-stack-menu-trigger]"); await h.click("[data-workplace-sync-manual]");
      await h.fill("[data-service-sync-code]", code, { leave: false }); await h.click("[data-service-sync-submit]");
      await h.find("[data-service-sync-body] .e-permits-passport__sync-summary", null, 15000);
    } }])),
    "svc-01": svc("general"),
    /* 2026-10-16 · dropdown audit: the BO header help menu open */
    "svc-00h": svc("general", async (h) => { await h.click('[aria-controls="shell-help-menu"]'); }),
    "svc-01a": svc("general", async (h) => { await h.click("[data-passport-top] [data-stack-menu-trigger]"); }),
    "svc-01b": svc("general", async (h) => { await h.click("[data-passport-top] [data-stack-menu-trigger]"); await h.click('[data-sync-source="RSSP"]'); }),
    "svc-01c": svc("general", async (h) => {
      await h.click("[data-passport-top] [data-stack-menu-trigger]");
      await h.click('[data-sync-source="RSSP"]');
      await h.fill("[data-service-sync-code]", SVC, { leave: false });
      await h.click("[data-service-sync-submit]");
    }),
    "svc-01d": svc("general", async (h) => {
      await h.click("[data-passport-top] [data-stack-menu-trigger]");
      await h.click('[data-sync-source="RSSP"]');
      await h.fill("[data-service-sync-code]", SVC, { leave: false });
      await h.click("[data-service-sync-submit]");
      await h.find("[data-service-sync-body] .e-permits-passport__sync-summary", null, 15000);
    }),
    /* US-231 / US-232: resync outcomes from „Resincronizează” in Date din RSSP */
    ...Object.fromEntries([["svc-01k", "003000519"], ["svc-01l", "003000207"], ["svc-01m", "003000377"], ["svc-01n", "003000402"]].map(([id, code]) => [id, svc("general", async (h) => {
      await h.click(".e-permits-passport__heading-tools [data-passport-resync]");
      await h.click("[data-service-sync-submit]");
      await h.find("[data-service-sync-body] .e-permits-passport__sync-message", null, 15000);
    }, code)])),
    /* 003000402 after the reactivation with new data: banner + „Modificări nepublicate”, still Inactiv */
    "svc-01o": svc("general", async (h) => {
      await h.click(".e-permits-passport__heading-tools [data-passport-resync]");
      await h.click("[data-service-sync-submit]");
      await h.find("[data-service-sync-body] .e-permits-passport__sync-message", null, 15000);
      await h.click("[data-service-sync-close]");
      await h.wait(400);
    }, "003000402"),
    "svc-01p": svc("general", null, "003000377"),
    "svc-01q": svc("general", null, "003000245"),
    "svc-01e": svc("fees", applyOneTariff),
    "svc-01f": svc("fees", async (h) => { await applyOneTariff(h); await h.click("[data-service-publish]"); }),
    "svc-01g": svc("fees", async (h) => {
      await applyOneTariff(h);
      await h.click("[data-service-publish]");
      await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    }),
    "svc-01h": svc("general", async (h) => { await h.click("[data-service-history]"); }),
    /* Publică › Intră în vigoare „La o dată anume”: date picker, missing date, then Programat in Istoric */
    "svc-01f1": svc("fees", async (h) => { await applyOneTariff(h); await h.click("[data-service-publish]"); await pickPublishDate(h, "2026-10-15"); }),
    "svc-01f2": svc("fees", async (h) => {
      await applyOneTariff(h);
      await h.click("[data-service-publish]");
      await h.click('[data-ntpl-publish-when="scheduled"]');
      await h.fill("#ntpl-publish-modal textarea", "Taxă de examinare actualizată conform HG nr. 112/2026.", { leave: false });
      await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    }),
    "svc-01h1": svc("fees", async (h) => { await publishScheduled(h); await h.click("[data-service-history]"); }),
    /* a scheduled version: the date takes the place of Publică → Reprogramează / Publică acum / Anulează */
    "svc-01j": svc("fees", async (h) => { await publishScheduled(h); await h.click('[aria-controls="service-schedule-menu"]'); }),
    "svc-01j1": svc("fees", async (h) => { await publishScheduled(h); await h.click('[aria-controls="service-schedule-menu"]'); await h.click('[data-service-schedule="reschedule"]'); }),
    "svc-01j2": svc("fees", async (h) => { await publishScheduled(h); await h.click('[aria-controls="service-schedule-menu"]'); await h.click('[data-service-schedule="now"]'); }),
    "svc-01j3": svc("fees", async (h) => { await publishScheduled(h); await h.click('[aria-controls="service-schedule-menu"]'); await h.click('[data-service-schedule="cancel"]'); }),
    "svc-02": svc("request-types"),
    "svc-02a": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); }),
    /* + Adaugă tip solicitare → the eligible post-processes the service does not have yet */
    "svc-02b": svc("request-types", async (h) => { await h.click('[aria-controls="passport-add-rt-menu"]'); }),
    /* adding a type = steps (General → Formulare → Documente generate → Notificări); it is added on „Adaugă tipul” */
    "svc-02c": svc("request-types", async (h) => { await h.click('[aria-controls="passport-add-rt-menu"]'); await h.click('[data-passport-add-rt="Prelungire"]'); }),
    "svc-02e": svc("request-types", async (h) => { await h.click('[aria-controls="passport-add-rt-menu"]'); await h.click('[data-passport-add-rt="Prelungire"]'); await h.choose('[data-rt-flow]'); await h.click("[data-rt-next]"); }),
    "svc-02f": svc("request-types", async (h) => { await h.click('[aria-controls="passport-add-rt-menu"]'); await h.click('[data-passport-add-rt="Prelungire"]'); await h.click("[data-rt-next]"); }),
    "svc-03": svc("forms"),
    "svc-03a": svc("forms", rowMenu("[data-passport-body]")),
    /* the ⋮ items of a form: every one has its state (Figma 03b–03f) */
    "svc-03b": svc("forms", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click('[data-passport-form-action="preview"]'); }),
    "svc-03c": svc("forms", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click('[data-passport-form-action="versions"]'); }),
    "svc-03d": svc("forms", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click('[data-passport-form-action="duplicate"]'); }),
    "svc-03e": svc("forms", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click('[data-passport-form-action="remove"]'); }),
    "svc-03g": svc("forms", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click('[data-passport-form-action="export"]'); }),
    "svc-03f": svc("forms", async (h) => { await rowMenu("[data-passport-body]", 2)(h); await h.click('[data-passport-form-action="remove"]'); }),
    "svc-04": svc("fees"),
    "svc-04q": svc("fees", async (h) => { await h.click('[data-fee-list-all="taxes"]'); }),
    "svc-04r": svc("fees", async (h) => { await h.click('[data-fee-list-all="tariffs"]'); }),
    "svc-04o": svc("fees", async (h) => { await h.click('[data-fee-list-all="accounts"]'); }),
    "svc-04p": svc("fees", async (h) => { await h.click('[data-fee-list-all="accounts"]'); await h.fill("[data-fee-accounts-search]", "Cahul", { leave: false }); }),
    "svc-04p1": svc("fees", async (h) => { await h.click('[data-fee-list-all="accounts"]'); await h.fill("[data-fee-accounts-search]", "zzz", { leave: false }); }),
    "svc-04a": svc("fees", async (h) => { await h.click('[data-passport-body] [aria-label="Mai multe acțiuni: taxe"]'); }),
    /* Taxe / Tarife stay stacked lists (2026-10-10): „Filtrare avansată” on a list (US-199 /
       US-203 AC-06), a facet popover, a filter applied, a search with no match; Tarife:
       ⋮ Sincronizează (US-206), a row → the tariff card (US-207) */
    "svc-04t": svc("fees", async (h) => { await h.click('[data-sf-toggle="taxe"]'); await h.click('[data-sf-facet="taxe:stare"]'); }),
    "svc-04t1": svc("fees", async (h) => {
      await h.click('[data-sf-toggle="taxe"]'); await h.click('[data-sf-facet="taxe:activ"]');
      await h.click('[data-sf-option][value="Activă"]'); await h.click("[data-sf-confirm]"); await h.click('[data-sf-commit="taxe"]');
    }),
    "svc-04t2": svc("fees", async (h) => { await h.fill("[data-pay-search]", "apostilă", { leave: false }); }),
    "svc-04u": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); }),
    "svc-04u1": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); await h.click('[aria-label="Mai multe acțiuni: tarife"]'); await h.click('[data-tariff-sync="RSSP"]'); }),
    "svc-04u2": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); await h.click('[data-tariff-view="tf-examinare-120"]'); }),
    "svc-04u3": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); await h.click('[data-sf-toggle="tarife"]'); }),
    "svc-04b": bio("fees"),
    "svc-04h": bio("fees", openTax("tax-bio-2")),
    /* a tax on a formula tariff: the formula is the tariff's, the tax only reduces it */
    "svc-04h1": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.choose("select[data-pay-tariff]", "tf-urgenta");
    }),
    /* tax-bio-2 is conditional: the reduction is set per scenario (row 0 = minoră) */
    "svc-04h2": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.choose("select[data-pay-tariff]", "tf-urgenta");
      await h.choose('select[data-pay-scn-calc="0"]', "reducere");
      await h.fill("#pay-percent-0", "50");
    }),
    "svc-04h3": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.choose('select[data-pay-scn-calc="0"]', "reducere");
      await h.fill("#pay-percent-0", "50");
    }),
    /* two classifiers (AND), multi-select values → 2 × 2 scenarios, IMM reduced 50% */
    "svc-04h4": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.click("[data-pay-condition-add]");
      await h.choose('select[data-pay-condition-classifier="1"]', "CLS-BIO-02");
      await h.click('[data-pay-condition-value="1"][value="imm"]');
      await h.click('[data-pay-condition-value="1"][value="mare"]');
      await h.choose('select[data-pay-scn-calc="0"]', "reducere");
      await h.fill("#pay-percent-0", "50");
      await h.choose('select[data-pay-scn-calc="2"]', "reducere");
      await h.fill("#pay-percent-2", "50");
    }),
    /* save with an empty classifier and a reduction without percent → inline errors */
    "svc-04h5": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.choose('select[data-pay-scn-calc="1"]', "reducere");
      await h.click("[data-pay-condition-add]");
      await h.click('[data-pay-save="save"], [data-pay-save="publish"]');
    }),
    "svc-04i": svc("fees", async (h) => { await h.click("[data-tax-configure]"); }),
    /* hierarchical classifier (CAEM): G covers its divisions, 47 is an exception (−50%),
       47.3 an exception of the exception (full tariff) — the most specific value wins */
    "svc-04s": svc("fees", async (h) => {
      await h.click("[data-tax-configure]");
      await h.click('[data-pay-condition-mode="conditional"]');
      await h.choose('select[data-pay-condition-classifier="0"]', "CLS-COM-03");
      await h.click('[data-pay-condition-value="0"][value="G"]');
      await h.click('[data-pay-condition-value="0"][value="47"]');
      await h.click('[data-pay-condition-value="0"][value="47.3"]');
      await h.choose('select[data-pay-scn-calc="1"]', "reducere");
      await h.fill("#pay-percent-1", "50");
    }),
    "svc-04j": svc("fees", async (h) => {
      await h.click("[data-tax-configure]");
      await h.click('[data-pay-condition-mode="conditional"]');
      await h.choose("[data-pay-drawer] select[data-pay-condition-classifier], [data-pay-drawer] [data-pay-condition] select").catch(() => {});
      await h.click('[data-pay-save="publish"]');
    }),
    "svc-04k": svc("fees", async (h) => {
      const edit = await h.find('[data-pay-edit="tax-4"]');
      edit.closest(".e-permits-stack__item, tr").querySelector("[data-stack-menu-trigger]").click();
      await h.wait(400);
    }),
    "svc-04l": svc("fees", async (h) => {
      const edit = await h.find('[data-pay-edit="tax-4"]');
      edit.closest(".e-permits-stack__item, tr").querySelector("[data-stack-menu-trigger]").click();
      await h.click('[data-passport-payment="tax-4"][data-passport-payment-action="delete"]');
    }),
    /* US-201: ⋮ → Dezactivează on an active tax (count of dossiers in the text), ⋮ → Activează on
       an inactive one — the story's confirmation texts */
    "svc-04v": svc("fees", async (h) => {
      const edit = await h.find("[data-pay-edit]");
      const id = edit.dataset.payEdit;
      edit.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
      await h.click(`[data-passport-payment="${id}"][data-passport-payment-action="deactivate"]`);
    }),
    "svc-04v1": svc("fees", async (h) => {
      const edit = await h.find('[data-pay-edit="tax-4"]');
      edit.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
      await h.click('[data-passport-payment="tax-4"][data-passport-payment-action="activate"]');
    }),
    "svc-04m": svc("fees", async (h) => { await h.hover("[data-pay-edit]"); }),
    "svc-04n": svc("fees", async (h) => {
      const edit = await h.find("[data-pay-edit]");
      const more = edit.closest(".e-permits-stack__item, tr").querySelector("[data-stack-menu-trigger]");
      more.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      await h.wait(800);
    }),
    "svc-05": bio("fees", async (h) => { await openTax("tax-bio-2")(h); await h.click("[data-tax-new-tariff]"); }),
    /* Administrare › Tarife → ✎ on a tariff from RSSP: registry fields read-only */
    /* a tariff from RSSP belongs to its service: edited from the service's Tarife (US-203) */
    "svc-05a": bio("fees", async (h) => { await h.scroll("[data-trf-list]"); await h.click('[data-tariff-edit="tf-bio-autorizare"]'); await h.wait(400); }),
    /* Interdependențe live in Setări since 2026-10-07 (the old hash still lands there) */
    "svc-06": svc("settings"),
    "svc-06a": svc("documents"),
    /* Documente (US-225): a document opens its drawer — data (RSSP read-only) + „Reguli de
       solicitare” built like the Form Designer rules (US-42) */
    "svc-06b": svc("documents", docOpen("doc-4")),
    "svc-06c": svc("documents", async (h) => { await docOpen("doc-1")(h); await h.click("[data-doc-rule-add]"); await h.choose('[data-doc-rtype="0"]', "require"); }),
    "svc-06d": svc("documents", docOpen("doc-g1")),
    "svc-06e": svc("documents", async (h) => { await docOpen("doc-g1")(h); await h.choose('select[data-doc-mode-select][data-doc-rule="0"][data-doc-ci="0"]', "field"); await h.choose('[data-doc-cond="other"][data-doc-rule="0"][data-doc-ci="0"]', "SalesArea"); }),
    "svc-06f": svc("documents", async (h) => { await h.click("[data-doc-add]"); await h.wait(300); }),
    "svc-06g": svc("documents", async (h) => { await h.click("[data-doc-add]"); await h.wait(300); await h.click("[data-doc-rule-add]").catch(() => {}); await h.click("[data-doc-save]"); await h.wait(300); }),
    "svc-06h": svc("documents", async (h) => {
      await h.click("[data-doc-add]"); await h.wait(300);
      await h.fill("#doc-title", "Certificat de securitate la incendiu"); await h.fill("#doc-titleRu", "Сертификат пожарной безопасности"); await h.fill("#doc-titleEn", "Fire safety certificate"); await h.fill("#doc-docType", "Certificat");
      await h.click('[data-doc-check="requestTypes"][value="Emitere primară"]'); await h.click('[data-doc-check="applicantTypes"][value="PJ"]');
      await h.click("[data-doc-rule-add]"); await h.choose('[data-doc-cond="field"][data-doc-rule="0"][data-doc-ci="0"]', "SalesArea"); await h.choose('[data-doc-cond="op"][data-doc-rule="0"][data-doc-ci="0"]', "gt"); await h.fill('input[data-doc-cond="value"][data-doc-rule="0"][data-doc-ci="0"]', "150");
    }),
    "svc-06i": svc("documents", async (h) => { await docMenu("doc-g1", "deactivate")(h); }),
    /* 05c1 / 05c2: „Adaugă condiție” → a third empty row; the „și / sau” keyword list open */
    "svc-06m": svc("documents", async (h) => { await docOpen("doc-g1")(h); await h.click('[data-doc-cond-add="0"]'); }),
    "svc-06n": svc("documents", async (h) => { await docOpen("doc-g1")(h); await h.click("#doc-join-0"); }),
    /* AC-01: without configuration rights — eye opens the document read-only */
    "svc-06j": { ...svc("documents", docOpen("doc-g1")), as: LOCAL_ADMIN },
    /* AC-18: a condition without its parts stops the save */
    "svc-06k": svc("documents", async (h) => { await docOpen("doc-g1")(h); await h.click('[data-doc-cond-add="0"]'); await h.click("[data-doc-save]"); await h.wait(300); }),
    /* AC-09 / AC-10: a document added and never published → ⋮ Elimină, confirmed */
    "svc-06l": svc("documents", async (h) => {
      await h.click("[data-doc-add]"); await h.wait(300);
      await h.fill("#doc-title", "Certificat de securitate la incendiu"); await h.fill("#doc-titleRu", "Сертификат пожарной безопасности"); await h.fill("#doc-titleEn", "Fire safety certificate"); await h.fill("#doc-docType", "Certificat");
      await h.click('[data-doc-check="requestTypes"][value="Emitere primară"]'); await h.click('[data-doc-check="applicantTypes"][value="PJ"]');
      await h.click("[data-doc-save]"); await h.wait(700);
      const row = [...document.querySelectorAll(".e-permits-stack__item")].find((r) => r.textContent.includes("Certificat de securitate"));
      row.querySelector("[data-stack-menu-trigger]").click(); await h.wait(300);
      row.querySelector('[data-doc-action="remove"]').click(); await h.wait(450);
    }),
    /* header „N modificări nepublicate” → the list of pending changes */
    "svc-01i": svc("documents", async (h) => { await docMenu("doc-g2", "activate")(h); await h.click("[data-service-confirm-ok]"); await h.wait(400); await h.click("[data-service-pending]"); }),
    /* Avizare (US-222): the tab of the request-type drawer — locked on a flow without the
       avizare branch (rt-3, post-processing flow), one aviz on Reperfectare (rt-2), add, validation, switched off */
    "svc-02g": svc("request-types", async (h) => { await rtAviz("rt-3")(h); }),
    "svc-02h": svc("request-types", async (h) => { await rtAviz("rt-2")(h); }),
    "svc-02i": svc("request-types", async (h) => { await rtAviz("rt-2")(h); await h.click("[data-rt-aviz-add]"); }),
    "svc-02j": svc("request-types", async (h) => { await rtAviz("rt-2")(h); await h.click("[data-rt-aviz-add]"); await h.click("[data-rt-save]"); await h.wait(300); }),
    "svc-02k": svc("request-types", async (h) => { await rtAviz("rt-2")(h); await h.click("[data-rt-aviz-needs]"); await h.wait(400); }),
    "svc-02d": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="documents"]'); }),
    /* Documente generate › Previzualizează: the document of a step, read-only, left of the drawer */
    "svc-02d1": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="documents"]'); await h.click("[data-rt-doc-peek]"); }),
    "svc-02d2": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="notifications"]'); await h.click("[data-rt-doc-peek]"); }),
    /* Empty states — one component everywhere (2026-10-14): every tab of „Configurează tipul de
       solicitare” with nothing to show = the shared empty state, compact in the drawer.
       rt-4 has no flow yet, rt-2 / rt-3 have flows without document / notification steps and no taxes */
    "svc-02l": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-4"]'); await h.click('[data-rt-tab="documents"]'); }),
    "svc-02l1": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-4"]'); await h.click('[data-rt-tab="forms"]'); await h.click("[data-rt-goto-flow]"); }),
    "svc-02m": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-2"]'); await h.click('[data-rt-tab="documents"]'); }),
    "svc-02m1": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-2"]'); await h.click('[data-rt-tab="notifications"]'); }),
    "svc-02n": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-3"]'); await h.click('[data-rt-tab="taxes"]'); }),
    "svc-02n1": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-3"]'); await h.click('[data-rt-tab="taxes"]'); await h.click("[data-rt-tax-add]"); await h.wait(300); }),
    "svc-02o": svc("request-types", async (h) => { await rtAviz("rt-2")(h); await h.click('[data-rt-aviz-remove="0"]'); }),
    "svc-02p": svc("request-types", async (h) => { await h.click('[data-passport-configure-rt="rt-1"]'); await h.click('[data-rt-tab="forms"]'); await h.fill("[data-rt-search]", "zzz", { leave: false }); }),
    "svc-07": svc("classifiers"),
    /* US-226: a specific classifier opens its values (+ Adaugă valoare / Import); a global one opens read-only */
    "svc-07a": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-com-activ"].e-permits-stack__item'); }),
    "svc-07b": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-cuatm"].e-permits-stack__item'); }),
    "svc-07a1": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-com-activ"].e-permits-stack__item'); await h.click('[data-clas-profile-tab="coloane"]'); }),
    "svc-07a2": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-com-activ"].e-permits-stack__item'); await h.click('[data-clas-profile-tab="setari"]'); }),
    "svc-07c": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-com-activ"].e-permits-stack__item'); await h.click("[data-clas-grid-add]"); }),
    "svc-07d": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-caem2"].e-permits-stack__item'); }),
    "svc-07e": svc("classifiers", async (h) => { await h.click('[data-svc-clas-open="cl-com-activ"].e-permits-stack__item'); await h.click("[data-clas-crumb-back]"); }),
    "svc-08": svc("templates"),
    /* Șabloane › eye = view-only preview drawer (the builder opens from its footer) */
    "svc-08l": svc("templates", async (h) => { await h.click("[data-dtpl-preview]"); }),
    "svc-08a": svc("templates", rowMenu("[data-dtpl-list]")),
    "svc-08b": svc("templates", async (h) => { await h.nth("[data-dtpl-edit]", 0); }),
    /* Șablon nou — created from scratch for this service (comment 1957263114) */
    "svc-08c": svc("templates", async (h) => { await h.click("[data-dtpl-new]"); await h.fill("#dtpl-n-name", "Decizie de respingere"); }),
    "svc-08c1": svc("templates", async (h) => { await h.click("[data-dtpl-new]"); await h.click("[data-dtpl-new-save]"); }),
    "svc-08c2": svc("templates", async (h) => { await h.click("[data-dtpl-new]"); await h.fill("#dtpl-n-name", "Decizie de respingere"); await h.click("[data-dtpl-new-save]"); }),
    "svc-08d": svc("templates", async (h) => { await h.click("[data-dtpl-import]"); await h.click("[data-dtpl-import-save]"); }),
    "svc-08e": svc("templates", dtplBuilder),
    "svc-08f": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="test"]'); }),
    /* builder › Câmpuri: a search with no match = the shared empty state (bare + compact) */
    "svc-08b1": svc("templates", async (h) => { await dtplBuilder(h); await h.fill("[data-dtpl-field-search]", "zzz", { leave: false }); }),
    /* JSON test data: a syntax error, then the preview warns it uses the last valid data */
    "svc-08f1": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="test"]'); const t = await h.find("[data-dtpl-json]"); await h.fill("[data-dtpl-json]", t.value.replace(/,\s*$/m, "").replace(/"\s*\n\s*"/, '"\n  ')); }),
    "svc-08f2": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="test"]'); const t = await h.find("[data-dtpl-json]"); await h.fill("[data-dtpl-json]", t.value.replace(/,(\s*\n\s*"[^"]+":)/, "$1")); await h.click('[data-dtpl-view="preview"]'); }),
    "svc-08g": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="preview"]'); }),
    "svc-08h": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-mode="html"]'); }),
    "svc-08i": svc("templates", async (h) => {
      await dtplOpenNth(1)(h);
      const surface = await h.find("[data-dtpl-surface]");
      surface.focus();
      const range = document.createRange();
      range.selectNodeContents(surface.querySelector("h1") || surface);
      range.collapse(false);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      document.execCommand("insertText", false, " MOTIVATĂ");
      await h.click('[data-dtpl-token="{{CaseNumber}}"]');
    }),
    "svc-08j": svc("templates", async (h) => {
      await dtplOpenNth(1)(h);
      const surface = await h.find("[data-dtpl-surface]");
      surface.focus();
      document.execCommand("insertText", false, " ");
      await h.click("[data-dtpl-save]");
      await h.click("[data-dtpl-publish]");
    }),
    "svc-08k": svc("templates", async (h) => { await rowMenu("[data-dtpl-list]")(h); await h.click("[data-dtpl-delete]"); }),
    "svc-09": svc("notifications"),
    /* empty states with the actions inside (service without own templates) */
    "svc-09m": svc("notifications", null, "003000118"),
    "svc-08m": svc("templates", null, "003000118"),
    "svc-08n": svc("templates", dtplTwoEdits),
    "svc-08n1": svc("templates", async (h) => { await dtplTwoEdits(h); await h.click('[data-profile-changes="dtpl-draft"]'); }),
    "svc-09a": svc("notifications", rowMenu("[data-ntpl-svc-list]")),
    "svc-09b": svc("notifications", async (h) => { await ntplClone(h); await h.click("#ntpl-clone-source"); }),
    "svc-09c": svc("notifications", async (h) => { await ntplClone(h); await h.click("[data-ntpl-clone-save]"); }),
    "svc-09d": svc("notifications", async (h) => {
      await ntplClone(h);
      await h.click("#ntpl-clone-source");
      await h.click("body > .e-permits-fo-select__list [role=option]");
    }),
    "svc-09e": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); }),
    "svc-09f": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); }),
    /* recipient rules in the service editor: add (Regulă nouă) and edit (Regula 1) — comment 1957279684 */
    "svc-09f1": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); await h.click("[data-ntpl-rule-add]"); }),
    "svc-09f2": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); await h.click('[data-ntpl-rule-edit="0"]'); }),
    "svc-09f3": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); await rowMenu("[data-ntpl-profile-panel]")(h); }),
    /* the only rule: Șterge disabled, hover explains why */
    "svc-09f4": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); await rowMenu("[data-ntpl-profile-panel]")(h); await h.hover("[data-ntpl-rule-delete]"); }),
    /* two rules → delete asks first (destructive confirm) */
    "svc-09f5": svc("notifications", async (h) => {
      await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]');
      await h.click("[data-ntpl-rule-add]"); await h.choose("select[data-ntpl-rule-field=\"recipient\"]", "Specialist"); await h.click("[data-ntpl-rule-confirm]");
      await rowMenu("[data-ntpl-profile-panel]", 1)(h); await h.click('[data-ntpl-rule-delete="1"]');
    }),
    "svc-09f6": svc("notifications", async (h) => { await h.nth("[data-ntpl-open]", 0); await h.click('[data-ntpl-profile-tab="recipients"]'); await rowMenu("[data-ntpl-profile-panel]")(h); await h.click('[data-ntpl-rule-toggle="0"]'); }),
    "svc-09g": svc("notifications", async (h) => {
      await h.nth("[data-ntpl-open]", 0);
      const subject = await h.find('[data-ntplp-text="subject"]');
      await h.fill('[data-ntplp-text="subject"]', `${subject.value} — comerț`, { leave: false });
    }),
    "svc-09h": svc("notifications", async (h) => { await h.click("[data-ntpl-new]"); }),
    "svc-09i": svc("notifications", async (h) => { await h.click("[data-ntpl-new]"); await h.click("[data-ntpl-c-next]"); }),
    "svc-09h1": svc("notifications", ntplWizard),
    "svc-09h2": svc("notifications", ntplWizardStep(2)),
    "svc-09h3": svc("notifications", ntplWizardStep(3)),
    "svc-09h4": svc("notifications", ntplWizardStep(4)),
    "svc-09h5": svc("notifications", ntplWizardStep(5)),
    "svc-09j": svc("notifications", async (h) => { await rowMenu("[data-passport-body]")(h); await h.click("[data-ntpl-row-toggle]"); }),
    /* Setări = one page, edited inline, one draft (the old read view + drawer states open the
       matching section, so existing links keep working) */
    "svc-10": svc("settings"),
    /* a plain switch changed → save → publish („Alte setări” is gone: Aprobare secundară and
       Cu expertiză are per request type, Suspendare cu coordonare = Suspendare cu semnarea deciziei) */
    "svc-10a": svc("settings", async (h) => { await cfgNav("suspension")(h); await h.click('[data-cfg-switch="suspEditable"]'); await h.wait(300); }),
    "svc-10b": svc("settings", async (h) => { await cfgNav("suspension")(h); await h.click('[data-cfg-switch="suspEditable"]'); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(400); await h.click("[data-service-publish]"); }),
    "svc-10c": svc("settings", async (h) => {
      await cfgNav("suspension")(h);
      await h.click('[data-cfg-switch="suspEditable"]');
      await h.wait(300);
      await h.click("[data-cfg2-save]");
      await h.wait(400);
      await h.click("[data-service-publish]");
      await h.fill("#ntpl-publish-modal textarea", "Termenul suspendării se stabilește doar la nivel de serviciu.", { leave: false });
      await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    }),
    "svc-10d": svc("settings", cfgNav("applicant")),
    "svc-10e": svc("settings", cfgNav("exam")),
    "svc-10e1": svc("settings", async (h) => { await cfgNav("exam")(h); await h.click('[data-cfg-switch="autoDist"]'); await h.wait(400); }),
    "svc-10f": svc("settings", cfgNav("suspension")),
    "svc-10g": svc("settings", cfgNav("signing")),
    "svc-10h": svc("settings", cfgNav("payment")),
    "svc-10h1": svc("settings", async (h) => { await h.fill("#cfg-payTerm", "0"); await h.wait(200); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10i": svc("settings", cfgNav("delivery")),
    "svc-10j": svc("settings", async (h) => { await cfgNav("appeal")(h); await h.click('[data-cfg-switch="appealable"]'); await h.wait(400); }),
    "svc-10j1": svc("settings", async (h) => { await cfgNav("appeal")(h); await h.click('[data-cfg-switch="appealable"]'); await h.wait(400); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10k": svc("settings", cfgNav("numbering")),
    "svc-10k1": svc("settings", async (h) => { await cfgNav("numbering")(h); await h.click("[data-cfg-rule-add]"); await h.fill('[data-cfg-rule="1"][data-cfg-rule-field="template"]', "DR-{NR:4}/{YYYY}"); }),
    /* the template must hold {NR} once and only known parameters — „Salvează” shows why not */
    "svc-10k2": svc("settings", async (h) => { await cfgNav("numbering")(h); await h.fill('[data-cfg-rule="0"][data-cfg-rule-field="template"]', "MEC-{AN}"); await h.wait(200); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10l": svc("settings", cfgNav("rap")),
    /* 100 fields (02s8a–d): summary, picker, search, applied */
    "svc-10l1": rapBig(),
    "svc-10l2": rapBig(rapOpen),
    "svc-10l3": rapBig(async (h) => { await rapOpen(h); await h.fill("[data-cfg-rap-search]", "CAEM", { leave: false }); }),
    /* a long selection: 10 rows + „Încă N · Arată toate” (71 published); „Arată toate” after
       02s8d (13 published) → the picker on Publicate (02s8e) */
    "svc-10l5": rapBig(async (h) => { await rapOpen(h); await h.click('[data-cfg-rap-section="Câmpuri specifice serviciului"] [data-cfg-rap-all]'); await h.click("[data-cfg-rap-apply]"); await h.wait(300); }),
    "svc-10l6": rapBig(async (h) => { await rapOpen(h); await h.click('[data-cfg-rap-section="Detalii solicitare"] [data-cfg-rap-all]'); await h.click("[data-cfg-rap-apply]"); await h.wait(300); await h.click('[data-cfg-rap-open="published"]'); }),
    "svc-10l4": rapBig(async (h) => { await rapOpen(h); await h.click('[data-cfg-rap-section="Detalii solicitare"] [data-cfg-rap-all]'); await h.click("[data-cfg-rap-apply]"); await h.wait(300); }),
    "svc-10m": svc("settings", cfgNav("drafts")),
    "svc-10p": svc("settings", cfgNav("appeal")),
    /* was „Alte setări” (removed): the last section of the page */
    "svc-10q": svc("settings", cfgNav("deps")),
    /* Interdependențe: inline blocks; add (type decides the fields), validation on Salvează,
       remove without a confirm (nothing applies before Salvează) */
    "svc-10n": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); await h.fill('[data-cfg2-dep]:last-of-type [data-cfg-input="name"]', "Act cadastral verificat"); await h.choose('[data-cfg2-dep]:last-of-type select[data-cfg-select="type"]', "Externă"); }),
    "svc-10n1": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10n2": svc("settings", cfgNav("deps")),
    "svc-10n3": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-remove]"); await h.wait(300); }),
    /* Subdiviziuni de examinare for primării (~900): the field opens the picker modal */
    "svc-10w": svc("settings", subdivOpen),
    "svc-10w1": svc("settings", async (h) => { await subdivOpen(h); await h.fill("[data-cfg-subdiv-search]", "Orhei", { leave: false }); await h.click('[data-cfg-subdiv-group="Orhei"] [data-cfg-subdiv-all]'); }),
    "svc-10w2": svc("settings", async (h) => { await subdivOpen(h); await subdivPick134(h); await h.click('[data-cfg-subdiv-filter="selected"]'); }),
    "svc-10w3": svc("settings", async (h) => { await subdivOpen(h); await h.fill("[data-cfg-subdiv-search]", "Varnița", { leave: false }); }),
    "svc-10w4": svc("settings", async (h) => { await subdivOpen(h); await subdivPick134(h); await h.click("[data-cfg-subdiv-apply]"); await h.wait(300); }),
    "svc-10w5": svc("settings", async (h) => { await cfgNav("exam")(h); await h.click("[data-cfg-subdiv-remove]"); await h.click("[data-cfg-subdiv-remove]"); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    /* after a save: the header counts the changes as unpublished */
    "svc-10o": svc("settings", async (h) => { await cfgNav("suspension")(h); await h.click('[data-cfg-switch="suspSigned"]'); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(400); }),
    /* US-221 AC-01: a role without configuration rights has no Setări tab (lands on Date generale) */
    "svc-10r": { ...svc("settings"), as: LOCAL_ADMIN },
    /* aliases of the exploration states (svc-10v…) */
    "svc-10v": svc("settings"),
    "svc-10v1": svc("settings", async (h) => { await cfgNav("exam")(h); await h.click('[data-cfg-switch="distEligible"]'); await h.fill("#cfg-distMax", "20"); await h.wait(300); }),
    "svc-10v2": svc("settings", async (h) => { await h.fill("#cfg-payTerm", ""); await h.wait(200); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10v3": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); }),
    "svc-10v4": svc("settings", async (h) => { await h.click('[data-cfg-switch="suspEditable"]'); await h.wait(300); await h.click('[data-passport-tab="forms"]'); }),
    /* „● N modificări nesalvate” (header + save bar) → „Modificări nesalvate” review */
    "svc-10x": svc("settings", cfg2ThreeChanges),
    "svc-10x1": svc("settings", async (h) => { await cfg2ThreeChanges(h); await h.click(CHANGES_HEAD("service-settings")); }),
    "svc-10x2": svc("settings", async (h) => { await cfg2ThreeChanges(h); await h.click(CHANGES_HEAD("service-settings")); await h.click("#profile-changes-modal [data-change-undo]"); }),
    /* every row undone → the review's empty state (02x4) */
    "svc-10x4": svc("settings", async (h) => { await cfg2ThreeChanges(h); await h.click(CHANGES_HEAD("service-settings")); for (let i = 0; i < 3; i++) await h.click("#profile-changes-modal [data-change-undo]"); }),
    "svc-10x3": svc("settings", async (h) => { await cfg2ThreeChanges(h); await h.click('.e-permits-cfg2__bar [data-profile-changes="service-settings"]'); }),
    "svc-11": svc("events"),
    "svc-11a": svc("events", async (h) => { await h.fill("[data-svc-events-search]", "taxă", { leave: false }); }),
    /* US-228: Rezultat = Eșuat through „Filtrare avansată”; the bar open; an event's details
       (fields before → after); an automatic sync by SIA GEAP; oldest first */
    "svc-11b": svc("events", async (h) => {
      await h.click('[data-sf-toggle="jurnal"]'); await h.click('[data-sf-facet="jurnal:rezultat"]');
      await h.click('[data-sf-option][value="Eșuat"]'); await h.click("[data-sf-confirm]"); await h.click('[data-sf-commit="jurnal"]');
    }),
    "svc-11c": svc("events", async (h) => { await h.click('[data-sf-toggle="jurnal"]'); }),
    "svc-11d": svc("events", async (h) => { await h.click("[data-svc-event] .e-permits-timeline__link"); }),
    "svc-11e": svc("events", async (h) => {
      const link = [...document.querySelectorAll("[data-svc-event]")].find((li) => /SIA GEAP/.test(li.textContent));
      (link || await h.find("[data-svc-event]")).querySelector(".e-permits-timeline__link").click(); await h.wait(300);
    }),
    "svc-11f": svc("events", async (h) => { await h.click("[data-svc-events-sort]"); }),

    /* ---- Logare în Back Office / Admin Portal (US-105, US-110; US-107 / US-109 states) ---- */
    "auth-01": { page: "bo-login.html", ready: "[data-bo-login] h1" },
    "auth-01a": { page: "bo-login.html", params: { portal: "admin" }, ready: "[data-bo-login] h1" },
    "auth-01b": { page: "bo-login.html", params: { view: "redirecting" }, ready: "[data-bo-login] h1" },
    "auth-02": { page: "mpass-test.html", params: { return: "bo-login.html?mpass=ok&as=activ" }, ready: "h1" },
    "auth-03": { page: "bo-login.html", params: { mpass: "ok", as: "fara-cont" }, ready: "[data-bo-login] h1" },
    "auth-04": { page: "bo-login.html", params: { view: "retrying" }, ready: "[data-bo-login] h1" },
    "auth-04a": { page: "bo-login.html", params: { view: "unavailable" }, ready: "[data-bo-login] h1" },
    /* Dosare · 01 statusuri (specialist) */
    "dos-01": dos(SPEC, "depus"),
    "dos-01a": dos(SPEC, "inExaminare"),
    "dos-01b": dos(SPEC, "inExaminare", "general", { suspendat: "1" }),
    "dos-01c": dos(SPEC, "asteaptaPlata"),
    "dos-01d": dos(SPEC, "spreCoordonare"),
    "dos-01e": dos(SPEC, "spreSemnare"),
    "dos-01f": dos(SPEC, "semnat"),
    "dos-01g": dos(SPEC, "eliberat"),
    "dos-01h": dos(SPEC, "respins", "general", { decizia: "respingere" }),
    /* one tab set for every dossier (propunere A. Pascalov, 14.10): Taxe / Avize are there as soon
       as the request type can produce them — empty until the step that generates them */
    "dos-01i": dos(SPEC, "depus", "taxe"),
    "dos-01j": dos(SPEC, "depus", "avize"),
    /* Autorizație sanitară · Prelungire: the request type has „Necesită avizare” off → no Avize tab */
    "dos-01k": dosOf("D-2026-004498", SPEC, "taxe"),
    /* Respins → Taxe: „Nicio taxă · Pentru acest dosar nu s-au generat taxe.” (Figma 01l) */
    "dos-01l": dos(SPEC, "respins", "taxe", { decizia: "respingere" }),
    /* 2026-10-20 · dropdown item size: the dossier case-actions menu open (two-line items: title + description) */
    "dos-01m": dos(SPEC, "inExaminare", "general", {}, async (h) => { await h.click(".e-permits-case-actions__trigger"); await h.find("#case-actions-menu:not([hidden])"); }),
    /* 02 acțiuni pe rol */
    "dos-02": dos(SUP, "depus"),
    "dos-02a": dos(SPEC, "inExaminare"),
    "dos-02b": dos(SPEC, "inExaminare", "general", { suspendat: "1" }),
    "dos-02c": dos(SPEC, "inExaminare", "taxe"),
    "dos-02d": dos(SPEC, "asteaptaPlata"),
    "dos-02e": dos(SPEC, "inExaminare", "decizie"),
    "dos-02f": dos(SUP, "spreCoordonare"),
    "dos-02g": dos(DIR, "spreSemnare"),
    "dos-02h": dos(SUP, "inExaminare", "general", { suspendat: "1" }),
    "dos-02i": dos(DIR, "inExaminare", "general", { suspendat: "1" }),
    "dos-02j": dos(SPEC, "spreCoordonare"),
    "dos-02k": dos(LOCAL, "inExaminare"),
    /* 03 taxe și plăți */
    "dos-03": dos(SPEC, "inExaminare", "taxe"),
    "dos-03a": dos(SPEC, "asteaptaPlata", "taxe"),
    "dos-03b": dos(SPEC, "asteaptaPlata", "taxe"),
    "dos-03c": dos(SPEC, "asteaptaPlata", "taxe"),
    "dos-03d": dos(SPEC, "asteaptaPlata", "notificari"),
    "dos-03e": dos(SPEC, "spreCoordonare", "taxe"),
    /* 04 celelalte tab-uri */
    "dos-04": dos(SPEC, "inExaminare", "solicitare"),
    "dos-04a": dos(SPEC, "inExaminare", "avize"),
    "dos-04b": dos(SPEC, "inExaminare", "avize"),
    "dos-04c": dos(SPEC, "semnat", "decizie"),
    "dos-04d": dos(SPEC, "semnat", "documente"),
    "dos-04e": dos(SPEC, "semnat", "documente", {}, async (h) => { await docEye("Extras MPower", "documente")(h); }),
    "dos-04f": dos(SPEC, "inExaminare", "jurnal"),
    /* 04g–04m Detalii solicitare › Documente însoțitoare (2026-10-14): the story dossier is a Duplicat
       (post-process) → the previous act from MDocs first; the row (Enter = docEye) → the document modal (page preview +
       details; „Descarcă” only in its footer — no ⋮ on document rows since 2026-10-20); the row click → the same
       modal; a first issue (Eliberare) dossier; the empty state (&documente=0) */
    "dos-04g": dos(SPEC, "inExaminare", "solicitare", {}, async (h) => { await h.scroll(".e-permits-stack-section"); }),
    "dos-04h": dos(SPEC, "inExaminare", "solicitare", {}, async (h) => { await docEye("Declarație")(h); }),
    "dos-04i": dos(SPEC, "inExaminare", "solicitare", {}, async (h) => { await docEye("Actul permisiv emis anterior")(h); }),
    "dos-04j": dos(SPEC, "inExaminare", "solicitare", {}, async (h) => { await docRow("Declarație", "insotitoare")(h); }),
    "dos-04k": { ...dosOf("D-2026-004559", SPEC, "solicitare"), run: async (h) => { await h.scroll(".e-permits-stack-section"); } },
    "dos-04l": { ...dosOf("D-2026-004559", SPEC, "solicitare"), run: async (h) => { await docEye("Extras din Registrul")(h); } },
    "dos-04m": dos(SPEC, "inExaminare", "solicitare", { documente: "0" }, async (h) => { await h.scroll(".e-permits-dosar-profil__section", "Acte necesare"); }),
    /* 04n–04t Documente generate + Act/Decizie = the însoțitoare pattern (2026-10-14): grouped by flow step,
       blue icon + „Generat”, number · file · size · Generat … · de … · Semnat electronic de …; the row (Enter) →
       the same document modal with the page preview (its footer has „Descarcă”); the row click → the modal; a
       signed act; a draft („Proiect”) */
    "dos-04n": dos(SPEC, "eliberat", "documente"),
    "dos-04o": dos(SPEC, "eliberat", "documente", {}, async (h) => { await docEye("Cererea depusă", "documente")(h); }),
    "dos-04p": dos(SPEC, "eliberat", "documente", {}, async (h) => { await docEye("Confirmarea achitării", "documente")(h); }),
    "dos-04q": dos(SPEC, "eliberat", "documente", {}, async (h) => { await docRow("Proiectul actului", "documente")(h); }),
    "dos-04r": dos(SPEC, "spreSemnare", "documente", {}, async (h) => { await docEye("Proiectul actului", "documente")(h); }),
    "dos-04s": dos(SPEC, "eliberat", "decizie", {}, async (h) => { await docEye("Act permisiv", "acte")(h); }),
    "dos-04t": dos(SPEC, "respins", "decizie", { decizia: "respingere" }, async (h) => { await docEye("Decizie de respingere", "acte")(h); }),
    /* 05 liste pe rol */
    "dos-05": dosList(SPEC),
    "dos-05a": dosList(SUP),
    /* BO Dosare „Filtrare avansată” — the reference the eKYC lists copy (2026-10-19): bar open, Statut
       popover, Statut applied (js/facet-filter.js; the BO keeps the bar on phones, no sheets) */
    "dos-05b": { ...dosList(SPEC), run: async (h) => { await h.click("[data-workplace-filter-toggle]"); } },
    /* desktop = button → chip → popover (→ Confirmă → Aplică); phones (phone-toolbar-v2: the BO registries are in the shared
       phone mode too) = the icon-only „Filtre” → the all-filters sheet (→ „Arată N rezultate”) — the eKYC helpers */
    "dos-05c": { ...dosList(SPEC), run: ekFacet("status") },
    "dos-05d": { ...dosList(SPEC), run: async (h) => { await ekPick("status", ["În examinare"])(h); await ekCommit(h); } },
    "auth-05": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click("[data-user-menu] .e-permits-shell__user-trigger"); } },
    "auth-05a": { page: "bo-login.html", params: { ended: "logout" }, ready: "[data-bo-login] h1" },
    "auth-05b": { page: "bo-login.html", params: { ended: "logout", portal: "admin" }, ready: "[data-bo-login] h1" },
    "auth-06": { page: "bo-login.html", params: { ended: "expired" }, ready: "[data-bo-login] h1" },

    /* ---- Administrare › Tarife (Figma page "BO -> Tarife") ---- */
    "trf-01": trf(),
    "trf-01a": trf(async (h) => { await h.click('[data-workplace-tab="draft"]'); }),
    "trf-01b": trf(async (h) => { await h.fill("[data-workplace-search]", "zzz", { leave: false }); }),
    "trf-02": trf(newTariff),
    /* Continuă on an empty step 1: the errors stay on „Detalii” */
    "trf-02a": trf(async (h) => { await newTariff(h); await h.click("[data-tariff-next]"); }),
    "trf-02b": trf(async (h) => { await newTariff(h); await h.click("#tariff-type"); }),
    "trf-02c": trf(async (h) => { await tariffStep2(h); await h.click("[data-tariff-formula]"); }),
    /* formula field: typed numbers and + − × ÷ ( ); variables only from „Inserează variabilă” */
    "trf-02e": trf(async (h) => { await tariffStep2(h); await h.click("[data-tariff-formula]"); await h.click('[aria-controls="tariff-var-picker"]'); }),
    "trf-02e1": trf(async (h) => { await tariffStep2(h); await h.click("[data-tariff-formula]"); await h.click('[aria-controls="tariff-var-picker"]'); await h.fill("[data-tariff-var-search]", "zzz", { leave: false }); }),
    "trf-02f": trf(async (h) => {
      await tariffStep2(h); await h.click("[data-tariff-formula]");
      await h.click('[aria-controls="tariff-var-picker"]'); await h.click('[data-tariff-var="suprafata_m2"]');
      await h.fill("#tariff-expression", "{{suprafata_m2}} * 2");
      await h.fill('[data-tariff-test="suprafata_m2"]', "120", { leave: false }); await h.click("[data-tariff-test-run]");
    }),
    /* Publică with errors on both tabs: the red dots, the first tab with an error opens */
    "trf-02g": trf(async (h) => { await tariffStep2(h); await h.click("[data-tariff-formula]"); await h.click('[data-tariff-save="publish"]'); }),
    "trf-02d": trf(async (h) => { await newTariff(h); await h.click('[data-tariff-drawer] .js-date-picker-toggle'); }),
    "trf-03": trf(editTariff("tf-taxa-stat-50")),
    "trf-03a": trf(editTariff("tf-vechi")),
    "trf-03b": trf(editTariff("tf-eliberare-duplicat")),
    /* a tariff from RSSP is always a service's own: it opens from the service's Tarife (US-203) */
    "trf-03c": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); await editTariff("tf-examinare-120")(h); }),
    "trf-03d": trf(async (h) => { await editTariff("tf-suprafata")(h); await h.click('[data-tariff-tab="suma"]'); }),
    "trf-03e": svc("fees", async (h) => { await h.scroll("[data-trf-list]"); await editTariff("tf-examinare-120")(h); await h.click('[data-tariff-tab="utilizare"]'); }),
    /* US-207 the tariff card: versions + used; a formula; one version and not used */
    "trf-05": trf(async (h) => { await h.click('[data-tariff-view="tf-taxa-stat-50"]'); }),
    "trf-05a": trf(async (h) => { await h.click('[data-tariff-view="tf-suprafata"]'); }),
    "trf-05b": trf(async (h) => { await h.click('[data-tariff-view="tf-eliberare-duplicat"]'); }),
    /* US-202 filters: Stare = Schiță applied */
    "trf-01c": trf(async (h) => { await h.click("[data-workplace-filter-toggle]"); await h.click('[data-filter-facet="stare"]'); await h.click('[data-filter-option][value="Schiță"]'); await h.click("[data-filter-confirm]"); await h.click("[data-filter-commit]"); }),
    "trf-04": trf(async (h) => { await editTariff("tf-taxa-stat-50")(h); await h.click("[data-tariff-toggle-active]"); }),
    "trf-04a": trf(async (h) => { await editTariff("tf-vechi")(h); await h.click("[data-tariff-delete]"); }),
    "trf-04b": trf(async (h) => { await editTariff("tf-taxa-stat-50")(h); await h.hover("[data-tariff-delete]"); }),
    "trf-04c": trf(async (h) => { await editTariff("tf-vechi")(h); await h.click("[data-tariff-toggle-active]"); }),

    /* ---- Șabloane de notificare (Figma page "BO -> Șabloane de notificare") ---- */
    "ntpl-01": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="notification-templates"]'); } },
    "ntpl-02": ntpl("content"),
    "ntpl-02a": ntpl("content", async (h) => { await h.click('[data-ntplp-mode="html"]'); }),
    "ntpl-02b": ntpl("content", async (h) => { await h.click('[data-ntplp-preview="mobile"]'); }),
    /* the SMS text emptied → the phone preview shows the shared empty state (bare + compact) */
    "ntpl-02b1": ntpl("content", async (h) => { await h.click('[data-ntplp-preview="mobile"]'); await h.fill('[data-ntplp-text="plain"]', "", { leave: false }); }),
    "ntpl-02c": ntpl("content", async (h) => { await h.click('[aria-controls="ntpl-field-picker"]'); }),
    "ntpl-02c1": ntpl("content", async (h) => { await h.click('[aria-controls="ntpl-field-picker"]'); await h.fill("[data-ntplp-field-search]", "zzz", { leave: false }); }),
    "ntpl-02d": ntpl("content", ntplEdit),
    /* a template with nothing pending (AprobareNIAC has an unpublished draft in the demo data) */
    "ntpl-02e": { flow: "back-office", as: ADMIN, hash: "#sablon/Case.Registered/content", run: async (h) => { await h.hover("[data-ntpl-publish]"); } },
    "ntpl-03": ntpl("recipients"),
    "ntpl-03a": ntpl("recipients", async (h) => { await h.click('[data-ntpl-rule-edit="0"]'); }),
    "ntpl-03c": ntpl("recipients", async (h) => { await h.click("[data-ntpl-rule-add]"); }),
    "ntpl-03b": ntpl("recipients", rowMenu("[data-ntpl-profile-panel]")),
    "ntpl-04": ntpl("settings"),
    "ntpl-04a": ntpl("settings", async (h) => { await h.click("[data-ntpl-active]"); }),
    "ntpl-04b": ntpl("history"),
    "ntpl-04c": ntpl("content", async (h) => {
      await ntplScheduled(h);
      await h.fill("[data-ntpl-publish-note]", "Text actualizat: aprobarea se comunică și prin SMS.", { leave: false });
      await h.click("[data-ntpl-publish-confirm]");
      await h.wait(600);
      await clearToasts(h);
      await h.click('[data-ntpl-profile-tab="history"]');
    }),
    "ntpl-04d": ntpl("content", async (h) => { await ntplTwoEdits(h); await h.click(CHANGES_HEAD("ntpl-draft")); }),
    "ntpl-04e": ntpl("content", async (h) => { await ntplTwoEdits(h); await h.click(CHANGES_HEAD("ntpl-draft")); await h.click("#profile-changes-modal [data-change-undo]"); }),
    "ntpl-05": ntpl("content", ntplPublishOpen),
    "ntpl-05a": ntpl("content", ntplScheduled),
    "ntpl-05b": ntpl("content", async (h) => { await ntplPublishOpen(h); await h.click("[data-ntpl-publish-confirm]"); }),

    /* ---- Administrare › Clasificatoare (Figma page "BO -> Clasificatoare") ---- */
    "clf-01": clf("#classifiers"),
    "clf-01a": clf("#classifiers", async (h) => { await h.fill("[data-workplace-search]", "CAEM", { leave: false }); }),
    "clf-01b": clf("#classifiers", null, LOCAL_ADMIN),
    "clf-02": clf("#classifiers", clfNew),
    "clf-02a": clf("#classifiers", async (h) => { await clfNew(h); await h.click("[data-clas-create-next]"); }),
    /* Structură without extra columns: the shared empty state with „Adaugă coloană” inside */
    "clf-02h": clf("#classifiers", clfStep(2)),
    /* created with „Fără valori acum” → Valori = the shared empty state with „Adaugă prima valoare” */
    "clf-02i": clf("#classifiers", async (h) => { await clfStep(4)(h); await h.click("[data-clas-create-done]"); await h.wait(600); }),
    "clf-02b": clf("#classifiers", async (h) => { await clfStep1(h); await h.click('[data-clas-create-choice="start"][data-value="copy"]'); await h.choose('select[data-clas-create="copiatDinId"]', "cl-motive"); }),
    "clf-02c": clf("#classifiers", async (h) => { await clfStep(2)(h); await h.click("[data-clas-x-add]"); await h.fill('[data-clas-drawer] .e-permits-clas-create__col-row input[type="text"]', "Termen de examinare (zile)"); }),
    "clf-02d": clf("#classifiers", async (h) => { await clfStep(3)(h); await h.click('[data-clas-create-values][value="csv"]'); }),
    "clf-02e": clf("#classifiers", async (h) => {
      await clfStep(3)(h);
      await h.click('[data-clas-create-choice="sursa"][data-value="mconnect"]');
      await h.fill("#clas-c-endpoint", "https://mconnect.gov.md/api/clasificatoare/motive-suspendare");
      await h.click("[data-clas-create-test]");
      await h.wait(1600);
    }),
    "clf-02f": clf("#classifiers", clfStep(4)),
    "clf-02g": clf("#classifiers", async (h) => { await clfStep1(h); await h.click("[data-clas-close]"); }),
    "clf-03": clfProfile("cl-statut", "valori"),
    "clf-03b": clfProfile("cl-statut", "valori", async (h) => { await h.nth("[data-clas-grid-edit]", 0); }),
    "clf-03c": clfProfile("cl-statut", "valori", async (h) => { await h.click("[data-clas-grid-add]"); }),
    "clf-03d": clfProfile("cl-statut", "valori", async (h) => { await h.hover("[data-clas-grid-delete]"); }),
    "clf-03e": clfProfile("cl-statut", "valori", async (h) => { await h.nth("[data-clas-grid-toggle]", 0); }),
    "clf-03f": clfProfile("cl-statut", "valori", async (h) => { await h.click("[data-clas-import]"); }),
    "clf-03g": clfProfile("cl-statut", "valori", clfDraft),
    "clf-04": clfProfile("cl-statut", "coloane"),
    "clf-04a": clfProfile("cl-statut", "dependente"),
    "clf-04b": clfProfile("cl-statut", "jurnal"),
    "clf-04c": clfProfile("cl-statut", "setari"),
    "clf-04d": clfProfile("cl-statut", "setari", async (h) => { await h.fill('[data-clas-setting="descriere"]', "Statusurile unui dosar în GEAP, de la depunere la eliberare."); }),
    "clf-04e": clfProfile("cl-statut", "setari", async (h) => { await h.fill('[data-clas-setting="descriere"]', "Statusurile unui dosar în GEAP, de la depunere la eliberare."); await h.fill('[data-clas-setting="limitaDenumiri"]', "80"); await h.click(CHANGES_HEAD("classifier-settings")); }),
    "clf-05": clfProfile("cl-statut", "valori", async (h) => { await clfDraft(h); await h.click('[data-clas-action="publicaClas"]'); }),
    "clf-05a": clfProfile("cl-statut", "valori", async (h) => { await h.click('[data-clas-action="arhiveazaClas"]'); }),
    "clf-05b": clfProfile("cl-statut", "valori", async (h) => { await h.click('[data-clas-action="arhiveazaClas"]'); await h.click("[data-service-confirm-ok]"); await h.wait(600); await clearToasts(h); }),
    "clf-05c": clfProfile("cl-statut", "valori", async (h) => { await clfDraft(h); await h.click('[data-clas-action="renuntaClas"]'); }),
    "clf-06": clfProfile("cl-cuatm", "valori"),
    "clf-06a": clfProfile("cl-cuatm", "mapare"),
    "clf-06b": clfProfile("cl-cuatm", "valori", async (h) => { await h.click("[data-clas-sync]"); }),
    "clf-06c": clfProfile("cl-cuatm", "valori", async (h) => { await h.click("[data-clas-sync]"); await h.click("[data-service-confirm-ok]"); await h.wait(800); await clearToasts(h); }),
    "clf-07": clfProfile("cl-risc", "valori", null, LOCAL_ADMIN),
    "clf-07a": clfProfile("cl-motive", "valori", null, LOCAL_ADMIN),

    /* Post-procese (Feature 89533 Part I — titular): EVO Cabinet /permits,
       "Ce vrei să soliciți?" and the FOD2 post-process wizard per type */
    /* US-18 and the primary request flow (Figma FO · 09 bands F0–F8) */
    "fo-01": { page: PP_FO, flow: "full", ready: "h1" },
    /* header instance switcher open (FOD 756:25276): trigger keeps the focus ring, menu right-aligned under it */
    "fo-01s": foReq(1, {}, async (h) => { await h.click("[data-fo-avatar-trigger]"); await h.find("[data-fo-avatar-dropdown]:not([hidden])"); }),
    "fo-02": foReq(1),
    "fo-03": foReq(2),
    /* CAEM search with no match = the shared empty state inside the list (bare + compact) */
    "fo-03e": foReq(2, {}, async (h) => { await h.click("#fo-caem-code"); await h.fill("[data-fo-caem-search]", "zzz", { leave: false }); document.querySelector("[data-fo-caem-menu]")?.scrollIntoView({ block: "center" }); await h.wait(200); }),
    /* 2026-10-16 · dropdown audit: the phone country-code list and the CAEM subgenre menu open (dropdown surface) */
    /* (2026-10-20: the first [data-fo-phone-code-button] in the DOM is the hidden guest one — the list never opened;
       now the visible step-2 phone, fo-02p kept as id) */
    "fo-02p": foReq(2, {}, async (h) => { const b = [...document.querySelectorAll("[data-fo-step-panel='2'] [data-fo-phone-code-button]")].find((x) => x.getBoundingClientRect().height > 0); b.scrollIntoView({ block: "center" }); b.click(); await h.find("[data-fo-step-panel='2'] [data-fo-phone-code-list]:not([hidden])"); }),
    /* 2026-10-20 · dropdown item size: an FO select list open (32 rows · 6 12 6 8 · list 4 / 2) */
    "fo-03u": foReq(2, {}, async (h) => { const b = [...document.querySelectorAll("[data-fo-step-panel='2'] .e-permits-fo-select__button")].find((x) => x.getBoundingClientRect().height > 0 && !x.disabled); b.scrollIntoView({ block: "center" }); b.click(); await h.find("[data-fo-step-panel='2'] .e-permits-fo-select__list:not([hidden])"); }),
    /* 2026-10-20 · phones: only the step bar is sticky — scrolled mid-form, the EVO bar / service name / draft line are gone */
    "fo-03v": foReq(2, {}, async (h) => { await h.wait(300); window.scrollTo(0, 700); await h.wait(200); }),
    /* 2026-10-20 · a select opened low on the screen (where the MSupport greeting sat): launcher + bubble step aside */
    "fo-03w": foReq(2, {}, async (h) => { const b = [...document.querySelectorAll("[data-fo-step-panel='2'] .e-permits-fo-select__button")].find((x) => x.getBoundingClientRect().height > 0 && !x.disabled); b.scrollIntoView({ block: "end" }); window.scrollBy(0, 120); await h.wait(200); b.click(); await h.find("[data-fo-step-panel='2'] .e-permits-fo-select__list:not([hidden])"); }),
    "fo-03s": foReq(2, {}, async (h) => {
      const code = await h.find("#fo-caem-code"); code.click(); code.dispatchEvent(new FocusEvent("focus")); await h.wait(300);
      const opt = await h.find("[data-fo-caem-menu] [role=option]"); opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); opt.click(); await h.wait(300);
      await h.click("[data-fo-subgen-button]"); await h.wait(200);
    }),
    "fo-04": foReq(3),
    "fo-05": foReq(4),
    /* 2026-10-14 · one document shape in the FO: the picker keeps a card per document (type + source tag,
       file · size · Emis / Încărcat … · de … · Semnat electronic); the Verificare summary lists the attached
       documents titled by type */
    "fo-04d": foReq(3, {}, async (h) => { await h.click("[data-fo-step-panel='3'] [data-fo-open-doc-modal]"); await h.wait(400); }),
    "fo-04e": foReq(3, {}, async (h) => { await h.click("[data-fo-step-panel='3'] [data-fo-open-doc-modal]"); await h.wait(300); await h.click("[data-fo-doc-modal-list] .e-permits-fo-lib-item"); }),
    "fo-04f": foReq(3, {}, async (h) => { await h.click("[data-fo-step-panel='3'] [data-fo-open-doc-modal]"); await h.wait(300); await h.click("[data-fo-doc-modal-list] .e-permits-fo-lib-item"); await h.click("[data-fo-doc-modal-submit]"); await h.wait(300); }),
    /* Acte necesare with both document kinds side by side: MDocs (blue) in the first field, an uploaded PDF (grey) in the second — one card surface (2026-10-15) */
    "fo-04g": foReq(3, {}, async (h) => {
      await h.click("[data-fo-step-panel='3'] [data-fo-open-doc-modal]"); await h.wait(300); await h.click("[data-fo-doc-modal-list] .e-permits-fo-lib-item"); await h.click("[data-fo-doc-modal-submit]"); await h.wait(300);
      await h.click("[data-fo-step-panel='3'] [data-fo-doc-field]:nth-of-type(2) [data-fo-open-doc-modal]"); await h.wait(300);
      await h.click('[data-fo-doc-tab="upload"]');
      const input = document.querySelector("[data-fo-doc-file-input]");
      const files = new DataTransfer();
      files.items.add(new File(["%PDF-1.4"], "planul-incaperilor-parter.pdf", { type: "application/pdf" }));
      input.files = files.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await h.wait(200); await h.click("[data-fo-doc-modal-submit]"); await h.wait(300);
      await h.scroll("[data-fo-step-panel='3'] .e-permits-fo-mdocs__attachment");
    }),
    /* „Configurare flux” keeps the step (2026-10-15): step 3 with an MDocs document + an uploaded PDF and
       a typed step-2 answer, then Stare utilizator → Neautentificat (Autentificare Opțională): still step 3,
       as a guest — the upload stays, MDocs goes (account-bound) · -a back to Autentificat: both documents ·
       -gate MPass required: the gate, step 3 kept for the way back · -1 the guest's step 1 (demo identity)
       · -5 Livrare switched (guest = e-mail only) · capture with --hide .msup-bubble */
    /* 2026-10-21 (pd-tags-v1) · Acte necesare › „Adaugă document”: one „Alte documente” card (#1 Document) with its red trash */
    "fo-04x": foReq(3, {}, async (h) => { await h.click("[data-fo-step-panel='3'] [data-fo-add-other-doc]"); await h.wait(400); await h.scroll("[data-fo-step-panel='3'] [data-fo-other-doc-card]"); document.activeElement?.blur?.(); }),
    "fo-cfg-auth": foReq(3, {}, async (h) => { await cfgDocs(h); await cfgPick(h, "requiresAuth", "no"); await cfgPick(h, "authenticated", "no"); }),
    "fo-cfg-auth-a": foReq(3, {}, async (h) => { await cfgDocs(h); await cfgPick(h, "requiresAuth", "no"); await cfgPick(h, "authenticated", "no"); await cfgPick(h, "authenticated", "yes"); }),
    "fo-cfg-auth-gate": foReq(3, {}, async (h) => { await cfgDocs(h); await cfgPick(h, "authenticated", "no"); }),
    "fo-cfg-auth-1": foReq(3, {}, async (h) => {
      await cfgDocs(h); await cfgPick(h, "requiresAuth", "no"); await cfgPick(h, "authenticated", "no");
      await h.click("[data-fo-testcfg-close]");
      /* the stepper is hidden on phones: the same row click, dispatched directly */
      document.querySelector("[data-fo-screen='request'] [data-fo-step='1'] .e-permits-fo-stepper__row").click(); await h.wait(300);
    }),
    "fo-cfg-auth-5": foReq(5, {}, async (h) => { await cfgPick(h, "requiresAuth", "no"); await cfgPick(h, "authenticated", "no"); }),
    "fo-05d": foReq(4, {}, async (h) => { await h.scroll(".e-permits-fo-summary-docs"); }),
    "fo-06": foReq(5),
    "fo-07": foReq(6),
    "fo-08": foReq(7, { paid: "1" }),
    "fo-08a": foReq(7, { paid: "1", cert: "error" }),
    /* finish-doc-error-filecard-v1: „Reîncercați” on the error card → the generated certificate card, focus on its action */
    "fo-08a1": foReq(7, { paid: "1", cert: "error" }, async (h) => { await h.click("[data-fo-finish-document-retry]"); }),
    "fo-08b": foReq(7, { paid: "1", cert: "none" }),
    "fo-08c": foReq(7),
    "fo-08d": foReq(7, { paid: "1" }, async (h) => { await h.click("[data-fo-finish-document]"); }),
    "fo-08e": foReq(7, { paid: "1", cert: "unavailable" }, async (h) => { await h.click("[data-fo-finish-document]"); await h.click("[data-fo-cert-download]"); }),
    /* ---- Guest requestor, no account (fo-g): Figma FOD-Components-flow „Guest lane · without
       account” 633:7411, G1–G8. #access / #guest open the screens; ?guest=pf|pj|pfpj = the
       service's auth.availableFor (PF + PJ by default). Names are typed, never looked up. ---- */
    ...(() => {
      const G = "[data-fo-screen='guest']";
      const guest = (params, run) => ({ page: PP_FO, flow: "full", params, hash: "#guest", ready: `${G} h1`, run });
      const fill = (values) => async (h) => { for (const [selector, value] of Object.entries(values)) await h.fill(`${G} ${selector}`, value); };
      const pj = async (h) => { await h.click(`${G} [data-fo-guest-type="PJ"]`); };
      const other = async (h) => { await h.click(`${G} .e-permits-fo-radio:has(input[value="other"])`); };
      const consent = async (h) => { await h.click(`${G} .e-permits-fo-consent`); };
      const next = async (h) => { await h.click(`${G} [data-fo-guest-next]`); await h.wait(300); };
      /* „Adaugă fișier” → the upload tab (no MDocs library for a guest) → a PDF from the device */
      const attach = (key, name) => async (h) => {
        await h.click(`${G} [data-fo-doc-field="${key}"] [data-fo-open-doc-modal]`);
        const input = document.querySelector("[data-fo-doc-file-input]");
        const files = new DataTransfer();
        files.items.add(new File(["%PDF-1.4"], name, { type: "application/pdf" }));
        input.files = files.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await h.wait(200);
        await h.click("[data-fo-doc-modal-submit]");
      };
      const me = fill({ "#fo-guest-idnp": "2004001234567", "#fo-guest-surname": "Popescu", "#fo-guest-firstname": "Ion", "#fo-guest-phone": "60999999", "#fo-guest-email": "ion.popescu@gmail.com" });
      const represented = fill({ "#fo-guest-rep-idnp": "2990000000011", "#fo-guest-rep-surname": "Popescu", "#fo-guest-rep-firstname": "Maria" });
      const idno = (value, ms = 1300) => async (h) => { await h.fill(`${G} #fo-guest-idno`, value); await h.wait(ms); };
      /* G4 filled: me + the represented person + the notarial power of attorney */
      const g4Filled = async (h) => { await other(h); await me(h); await represented(h); await attach("guest-procura", "procura-notariala.pdf")(h); };
      const g5Filled = async (h) => { await idno("1012600000002")(h); await me(h); await attach("guest-mandat", "decizie-numire-administrator.pdf")(h); };
      /* through the wizard in guest mode: 2 → 3 → 4 → 5 → 6 (MPay) → 7 */
      const toStep = (step) => async (h) => {
        const order = ["step-2", "step-3", "step-4", "step-5"];
        for (let n = 2; n < Math.min(step, 6); n += 1) await h.click(`[data-fo-step-panel="${n}"] [data-fo-next="${order[n - 2]}"]`);
        if (step === 7) { await h.click("[data-fo-payment-pay]"); await h.wait(1600); }
      };
      return {
        /* „Autentifică-te sau continuă fără cont” and the guest form it opens (G1, PF + PJ) */
        "fo-g0": { page: PP_FO, flow: "full", hash: "#access", ready: "[data-fo-screen='access'] h1" },
        "fo-g1": { page: PP_FO, flow: "full", hash: "#access", ready: "[data-fo-access-guest]", run: async (h) => { await h.click("[data-fo-access-guest]"); } },
        /* G1b: „Persoană juridică” — IDNO, the company name from the registry, representative typed */
        "fo-g1b": guest({}, pj),
        /* 1c the registry is being asked (skeleton + loading message) · 1d answered · 1e unknown IDNO */
        "fo-g1c": guest({ registru: "asteptare" }, async (h) => { await pj(h); await idno("1012600000002", 300)(h); }),
        "fo-g1d": guest({}, async (h) => { await pj(h); await idno("1012600000002")(h); }),
        "fo-g1e": guest({}, async (h) => { await pj(h); await idno("1012600000099")(h); }),
        /* G2 PF only · G3 PJ only: the form directly, no type selector */
        "fo-g2": guest({ guest: "pf" }),
        "fo-g3": guest({ guest: "pj" }),
        /* G4: Pentru altă persoană — represented person + notarial power of attorney (empty / filled) */
        "fo-g4": guest({}, async (h) => { await other(h); await h.scroll(`${G} [data-fo-guest-represented]`); }),
        "fo-g4a": guest({}, async (h) => { await g4Filled(h); await h.scroll(`${G} [data-fo-guest-represented]`); }),
        /* G5: on behalf of a company — IDNO + representative + procură / decizia de numire */
        "fo-g5": guest({ guest: "pj" }, async (h) => { await g5Filled(h); await h.scroll(`${G} [data-fo-guest-mandate]`); }),
        /* G6: „Înainte” with nothing typed (G4) · wrong formats (PF) · PJ with an unknown IDNO */
        "fo-g6": guest({}, async (h) => { await other(h); await next(h); }),
        "fo-g6a": guest({}, async (h) => {
          await fill({ "#fo-guest-idnp": "20040012", "#fo-guest-surname": "Popescu", "#fo-guest-firstname": "Ion", "#fo-guest-phone": "6099", "#fo-guest-email": "ion.popescu@" })(h);
          await consent(h); await next(h);
        }),
        "fo-g6b": guest({ guest: "pj" }, async (h) => { await idno("1012600000099")(h); await next(h); }),
        /* after „Înainte” (valid): the same wizard in guest mode — 7 Detalii solicitare (no draft),
           7a Acte necesare with the power of attorney carried over (G4), 7b Verificare, 7c Livrare by
           e-mail / desk only, 7d Finalizare by e-mail + invitation to sign in */
        "fo-g7": guest({}, async (h) => { await me(h); await consent(h); await next(h); await h.find("[data-fo-step-panel='2'] h1"); }),
        "fo-g7a": guest({}, async (h) => { await g4Filled(h); await consent(h); await next(h); await toStep(3)(h); }),
        "fo-g7b": guest({}, async (h) => { await g4Filled(h); await consent(h); await next(h); await toStep(4)(h); }),
        "fo-g7c": guest({}, async (h) => { await me(h); await consent(h); await next(h); await toStep(5)(h); }),
        "fo-g7d": guest({}, async (h) => { await me(h); await consent(h); await next(h); await toStep(7)(h); }),
        /* G8: leaving without an account — the logo asks first (no draft for a guest) */
        "fo-g8": guest({ guest: "pf" }, async (h) => { await me(h); await h.click(".e-permits-fo-auth__evo-logo"); }),
      };
    })(),
    "pp-01": ppCab(),
    "pp-01a": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] [data-cab-menu-trigger]"); }),
    "pp-01b": ppCab(async (h) => { await h.click("[data-cab-card='act-piata-mare'] [data-cab-menu-trigger]"); }),
    "pp-01c": ppCab(async (h) => { await h.scroll("[data-cab-card='act-depozit-10']"); await h.click("[data-cab-card='act-depozit-10'] [data-cab-menu-trigger]"); }),
    "pp-01d": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] .e-permits-fo-lib-item__title"); }),
    "pp-01e": ppCab(async (h) => { await h.click("[data-cab-card='act-lab-10'] .e-permits-fo-lib-item__title"); }),
    "pp-01f": ppCab(async (h) => { await cabFind(h, "act-cofetaria"); }),
    "pp-01g": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] [data-cab-menu-trigger]"); await actMenuPick("[data-cab-card='act-izvoras'] [data-cab-pp='retragere']")(h); }),
    /* „Filtre” = the shared facet filter (2026-10-17): Statut = Expirat applied (desktop bar / phone sheet) */
    "pp-01h": ppCab(async (h) => { await cabPick("status", ["Expirat"])(h); await cabCommit(h); }),
    "pp-01i": ppCab(async (h) => { await cabFind(h, "act-bistro"); await h.click("[data-cab-card='act-bistro'] .e-permits-fo-lib-item__title"); }),
    /* act profile = the RAP act profile (2026-10-17): AC-17 dates, tacit badge, the shared act dialogs */
    "pp-01j": ppCab(async (h) => { await h.click("[data-cab-card='act-piata-mare'] .e-permits-fo-lib-item__title"); }),
    "pp-01k": ppCab(async (h) => { await h.scroll("[data-cab-card='act-cantina']"); await h.click("[data-cab-card='act-cantina'] .e-permits-fo-lib-item__title"); }),
    "pp-01l": ppCab(async (h) => { await cabFind(h, "act-licenta-demo"); await h.click("[data-cab-card='act-licenta-demo'] .e-permits-fo-lib-item__title"); }),
    /* act-profile-v1 (2026-10-21): „Vezi act permisiv” opens the act document (MDocs A4, „Vizualizare act” · Descarcă) —
       the old data dialog is gone (its data is on the page); m / o = the Valabil act, n = the Suspendat one (watermark) */
    "pp-01m": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] .e-permits-fo-lib-item__title"); await h.click("[data-cab-view-act]"); await h.find("[data-rap-act-modal]:not([hidden]) [data-rap-act-canvas]"); }),
    "pp-01n": ppCab(async (h) => { await h.click("[data-cab-card='act-piata-mare'] .e-permits-fo-lib-item__title"); await h.click("[data-cab-view-act]"); await h.find("[data-rap-act-modal]:not([hidden]) [data-rap-act-canvas]"); }),
    /* the act rows = the FO intent rows (2026-10-17): „Descarcă actul (MDocs)” lives in the profile (Vezi act permisiv → Descarcă) */
    "pp-01o": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] .e-permits-fo-lib-item__title"); await h.click("[data-cab-view-act]"); await h.find("[data-rap-act-modal]:not([hidden]) [data-rap-act-canvas]"); }),
    /* US-55 AC-09 / AC-10: „Anulare” from Valabil and from Suspendat (DEMO service), same rules as Retragere */
    /* configured act fields (2026-10-19): the depot's 2 groups, a list value, the „Cote anuale autorizate” table
       (7 rows → first 5 + „Arată toate (7)”), expanded, and the A4 form — on the profile itself since act-profile-v1
       („Ce permite actul” + „Substanțe controlate”), the A4 in „Vizualizare act” */
    "pp-01x": ppCab(async (h) => { await h.scroll("[data-cab-card='act-depozit-10']"); await h.click("[data-cab-card='act-depozit-10'] .e-permits-fo-lib-item__title"); await h.find("[data-cab-detail] .e-permits-act-fields__table"); await h.wait(250); await h.scroll("[data-cab-detail] .e-permits-act-fields__table-field"); }),
    "pp-01y": ppCab(async (h) => { await h.scroll("[data-cab-card='act-depozit-10']"); await h.click("[data-cab-card='act-depozit-10'] .e-permits-fo-lib-item__title"); await h.find("[data-cab-detail] .e-permits-act-fields__table"); await h.wait(250); await h.click("[data-cab-detail] .e-permits-act-fields__table-field [data-act-fields-more]"); await h.scroll("[data-cab-detail] .e-permits-act-fields__table-field"); }),
    "pp-01z": ppCab(async (h) => { await h.scroll("[data-cab-card='act-depozit-10']"); await h.click("[data-cab-card='act-depozit-10'] .e-permits-fo-lib-item__title"); await h.click("[data-cab-view-act]"); await h.find("[data-rap-act-modal]:not([hidden]) [data-rap-act-canvas]"); }),
    "pp-01p": ppCab(async (h) => { await cabFind(h, "act-licenta-demo"); await h.click("[data-cab-card='act-licenta-demo'] [data-cab-menu-trigger]"); }),
    /* the profile's visible menu trigger: „Postprocese ⌄” on desktop, the overflow „⋯” on phones (act-profile-v1) */
    /* external-link-v1 (2026-10-22): „Vezi solicitarea” = label + trailing external icon, new tab; on phones it sits in the
       header „⋯” (opened here; 320 — at 375 both buttons fit since profile-header-phone-medium-v1), on desktop it is the
       header button. Was a second "pp-01r" key, silently overridden by the hover state below → pp-03h */
    "pp-03h": ppCab(async (h) => {
      await h.click("[data-cab-card='act-izvoras'] .e-permits-fo-lib-item__title");
      await h.wait(300);
      const more = [...document.querySelectorAll("[data-cab-detail] .cab-act-header__overflow [data-cab-menu-trigger]")].find((el) => el.getClientRects().length);
      if (more) await h.click("[data-cab-detail] .cab-act-header__overflow [data-cab-menu-trigger]");
    }),
    "pp-01q": ppCab(async (h) => { await cabFind(h, "act-licenta-susp"); await h.click("[data-cab-card='act-licenta-susp'] .e-permits-fo-lib-item__title"); await h.wait(150); await h.click("[data-cab-detail] .e-permits-page-header__actions > :not([hidden]) > [data-cab-menu-trigger]"); }),
    /* the act with a post-process in progress: every item disabled with its reason (US-55 AC-14) */
    "pp-01r": ppCab(async (h) => { await h.scroll("[data-cab-card='act-lab-10']"); await h.hover("[data-cab-card='act-lab-10']"); }),
    /* „Filtre”: the bar / popover (desktop) — the chip row + Statut sheet (phones) */
    "pp-01s": ppCab(async (h) => { await cabOpen(h); await ffFacet(h, "status"); }),
    /* facet-popover-v2: Denumire act (s3) / Autoritate with „agentia” typed (s4) — wider popover + the search on top */
    "pp-01s3": ppCab(async (h) => { await cabOpen(h); await ffFacet(h, "denumire"); await h.wait(200); }),
    "pp-01s4": ppCab(async (h) => { await cabOpen(h); await ffFacet(h, "autoritate"); await h.fill("[data-filter-search]", "agentia", { leave: false }); await h.wait(600); }),
    /* „Sortează” (acts-sort-v1, the Solicitările mele control): s1 the menu open (phones: the sort sheet) · s2 sorted by
       „Valabil până la”, cele mai apropiate (desktop: the key pick; phones: the sheet → „Aplică”) — trigger + announcement */
    "pp-01s1": ppCab(async (h) => { await h.click(".cab-sort__trigger"); if (cabPhone()) await h.wait(350); }),
    "pp-01s2": ppCab(async (h) => { if (cabPhone()) { await smSortSheet("valid")(h); await h.click("[data-sort-sheet-apply]"); await h.wait(400); return; } await h.click(".cab-sort__trigger"); await h.click('[data-cab-sort-key="valid"]'); }),
    /* search by act number + more than 10 acts → the Cabinet pager (demo ?acte=multe) */
    "pp-01t": { ...ppCab(null), params: { acte: "multe" } },
    "pp-01u": ppCab(async (h) => { await h.fill("[data-cab-search]", "ASF-2025", { leave: false }); }),
    /* Feature 90818 / US-159: an expired MPower → full restriction (notice, no data, no actions) */
    "pp-01v": { page: "cabinet-evo/index.html", params: { as: "mpower-pj-lumina" }, ready: "[data-cab-restriction]:not([hidden]) .cab-callout", run: null },
    /* a subject without acts → the shared empty state (no legacy demo permits) */
    "pp-01w": { page: "cabinet-evo/index.html", params: { as: "mpower-pf-vrabie" }, ready: "[data-cab-empty]:not([hidden]) .e-permits-empty", run: null },
    /* act profile (act-profile-v1, 2026-10-21; components.md › „Act profile”) — deep links ?act=<id> (+ ?as=):
       03 Anulat by the authority (reason, decision, contestație term → its request) · 03a paper act (offline notice,
       no Postprocese, issued on paper in Istoric) · 03b Suspendat by the authority (reason, decision, „Cere reluarea
       valabilității →”) · 03c Valabil expiring in 45 days, seen by a representative (MPower: Beneficiar first,
       „Inițiază prelungirea →”) · 03d the Istoric of a Valabil act (request, issue, duplicate, end of validity) */
    "pp-03": { page: "cabinet-evo/index.html", params: { as: "pf-anastasia", act: "act-ana-anulat" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    /* cabinet-skeleton-v1 (2026-10-23): the loading skeletons, frozen (?latency=freeze — the simulated answer never
       comes): pp-01-loading the acts list on its first load (real toolbar, inert, „Filtre” / „Sortează” disabled, 6
       skeleton rows), pp-03-loading the act profile opened by its address (header + sections skeleton) */
    "pp-01-loading": { page: "cabinet-evo/index.html", params: { latency: "freeze" }, ready: "[data-cab-skeleton] .cab-skeleton-row", run: null },
    "pp-03-loading": { page: "cabinet-evo/index.html", params: { as: "pf-anastasia", act: "act-ana-anulat", latency: "freeze" }, ready: "[data-cab-profile-skeleton]", run: null },
    "pp-03a": { page: "cabinet-evo/index.html", params: { act: "act-cofetaria" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    "pp-03b": { page: "cabinet-evo/index.html", params: { act: "act-licenta-susp" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    "pp-03c": { page: "cabinet-evo/index.html", params: { as: "pj-vita-plant", act: "act-vita-farm" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    "pp-03d": { page: "cabinet-evo/index.html", params: { act: "act-izvoras" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: async (h) => { await h.scroll("#cab-act-history"); } },
    /* act-profile-url-v1 (2026-10-22, user: „act permisiv profile should have a unique URL”): every act profile is
       ?act=<id> (pp-03…: opened straight from the address); an unknown id = the not-found state: the breadcrumb back to
       „Actele mele permisive” + the library empty state */
    "pp-03x": { page: "cabinet-evo/index.html", params: { act: "act-nu-exista" }, ready: "[data-cab-detail]:not([hidden]) .e-permits-empty", run: null },
    /* type-first-v1 (2026-10-21, user: „first the name of the act, then the location, if any”): 03e an act WITHOUT a
       location (transport licence: H1 = the type, no subtitle) · 03f another act type for the same place (Izvoraș
       alcohol licence: H1 = the type, subtitle = the place) · 04 the list searched by the place — 3 act types, one place */
    "pp-03e": { page: "cabinet-evo/index.html", params: { act: "act-transport" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    "pp-03f": { page: "cabinet-evo/index.html", params: { act: "act-izvoras-alcool" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    /* cabinet-header-v1: the 144-character act type (service 10) in the BO header with its three actions */
    "pp-03g": { page: "cabinet-evo/index.html", params: { act: "act-depozit-10" }, ready: "[data-cab-detail]:not([hidden]) #cab-act-title", run: null },
    "pp-04": ppCab(async (h) => { await h.fill("[data-cab-search]", "Izvoraș", { leave: false }); }),
    "pp-02": ppIntent(),
    "pp-02a": ppIntent(async (h) => { await h.click("[data-fo-intent-act='act-izvoras'] [data-fo-intent-trigger]"); }),
    "pp-02b": ppIntent(async (h) => { await h.click("[data-fo-intent-act='act-izvoras'] [data-fo-intent-trigger]"); await actMenuPick("[data-fo-intent-act='act-izvoras'] [data-fo-intent-postprocess='retragere']")(h); }),
    /* a locked act row (post-process in progress): the full-width subtle warning notice under the row */
    "pp-02d": { ...ppIntent(), params: { incurs: "act-izvoras" } },
    /* tacit-tag-v1 (user 2026-10-21): a Valabil act approved tacitly = ONE „Aprobare tacită” tag; a tacit act in another
       status (Suspendat) keeps its status tag only */
    "pp-02t": { ...ppIntent(), params: { tacit: "act-izvoras,act-piata-mare" } },
    "pp-02c": ppIntent(async (h) => {
      await h.click("[data-fo-avatar-trigger]");
      await h.click("[data-fo-avatar-proxy-toggle]");
      await h.click("[data-fo-avatar-role][data-fo-subject-id='mpower-pj-nord-agro']");
      await h.find("[data-fo-intent-empty]");
    }),
    /* ---- US-54 Adresă prin cod cadastral (adr-): Form Designer › Address pattern › Data
       („Cod cadastral” row) and the request form, service 09 step 2 „Detalii solicitare” ---- */
    ...(() => {
      const ADR = "[data-fo-step-panel='2'] [data-fo-cascade-address] [data-fo-address-input]";
      const bld = (run, { scroll = true } = {}) => ({ page: PP_FO, flow: "builder", ready: "[data-builder-component='address']", run: async (h) => {
        await h.click("[data-builder-component='address']");
        await h.click("[data-type='address']");
        await h.click("[data-builder-prop-tab='data']");
        if (run) await run(h);
        if (scroll) await h.scroll("[data-address-item='cadastral']");
      } });
      const expand = async (h) => { await h.click("[data-address-toggle-section='cadastral']"); };
      const adr = (params, run) => foReq(2, params, async (h) => { await h.scroll(ADR); if (run) await run(h); });
      /* a background headless tab gets no focus event from el.focus(): send the one a click gives */
      const openList = async (h) => { const el = await h.focus(ADR); el.dispatchEvent(new FocusEvent("focus")); await h.wait(300); };
      /* nothing is sent while typing (2026-10-13): a code typed in the search opens the list whose
         first row „Caută codul cadastral «…»” sends it; in „Cod cadastral” the arrow submit does */
      const ACTION = "[data-fo-step-panel='2'] [data-fo-cascade-address] .e-permits-fo-address-search__option";
      const typeCode = (value) => async (h) => { await h.fill(ADR, value, { leave: false }); await h.wait(200); };
      const sendRow = async (h) => {
        const row = await h.find(ACTION, "Caută codul cadastral");
        row.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      };
      const code = (value, ms = 1900) => async (h) => { await typeCode(value)(h); await sendRow(h); await h.wait(ms); };
      const COD = "[data-fo-step-panel='2'] [data-fo-cascade-address] [data-fo-cadastral-input]";
      const SUBMIT = "[data-fo-step-panel='2'] [data-fo-cascade-address] [data-fo-cadastral-submit]";
      const typeCod = (value) => async (h) => { await h.fill(COD, value, { leave: false }); };
      const cod = (value, ms = 1900) => async (h) => { await typeCod(value)(h); await h.click(SUBMIT); await h.wait(Math.max(0, ms - 450)); };
      return {
        "adr-01": bld(expand),
        "adr-01a": bld(async (h) => { await h.click("[data-address-visible='cadastral']"); }),
        "adr-01b": bld(async (h) => { await h.click("[data-address-required='cadastral']"); await expand(h); }),
        "adr-02": adr(),
        "adr-02a": adr({}, openList),
        "adr-02b": adr({ solicitant: "pj-vita-plant" }, openList),
        /* a code typed in the search: the list's first row „Caută codul cadastral «…»” (nothing sent yet) */
        "adr-03b": adr({}, typeCode("0100510")),
        /* sent from that row, SRRE pending: inline spinner + skeletons in the parts it fills + loading message (AC-11) */
        "adr-03": adr({ srre: "asteptare" }, code("0100510.123", 1200)),
        /* a changed code after a fill (slow SRRE, 3 s): the filled parts turn back into skeletons */
        "adr-03a": adr({ srre: "lent" }, async (h) => { await code("0100510.123", 4200)(h); await code("1701102.330", 1300)(h); }),
        "adr-04": adr({}, code("0100510.123")),
        "adr-04a": adr({}, async (h) => {
          await openList(h);
          const option = await h.find(".e-permits-fo-address-search__option", "6401213.112");
          option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          await h.wait(1900);
        }),
        "adr-05": adr({}, async (h) => { await code("0100510.123")(h); await code("1701102.330")(h); }),
        "adr-06": adr({}, async (h) => { await code("0100510.123")(h); await h.fill(ADR, "", { leave: false }); (await h.find(ADR)).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await h.wait(200); }),
        /* AC-16 with the × of the search input: fields empty + editable, focus back in the field */
        "adr-06a": adr({}, async (h) => {
          await code("0100510.123")(h);
          await h.click("[data-fo-step-panel='2'] [data-fo-cascade-address] .search-input .btn-icon.clear");
          await h.wait(300);
          /* the saved-codes list reopens on the emptied field; close it to show the released fields */
          (await h.find(ADR)).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await h.wait(200);
        }),
        "adr-07": adr({}, code("0100510.999")),
        "adr-08": adr({}, code("0100999.777")),
        "adr-09": adr({ codcadastral: "ascuns" }),
        "adr-09a": adr({ codcadastral: "obligatoriu" }),
        /* „Configurare flux” › Adresă: field mode, SRRE answer, saved codes (capture with --hide .msup-bubble) */
        "adr-11": adr({}, async (h) => {
          await h.click("[data-fo-testcfg-toggle]");
          await h.click("[data-fo-testcfg-group='adrField'] [data-fo-testcfg-value='obligatoriu']");
          await h.scroll("[data-fo-testcfg-group='adrSaved']");
        }),
        /* Form Designer: the Preview follows the builder — Cod cadastral hidden → absent; required → star */
        "adr-12": bld(async (h) => {
          await h.click("[data-address-visible='cadastral']");
          await h.click("[data-builder-mode='preview']");
          await h.scroll("[data-builder-preview-grid] [data-fo-cascade-address]");
        }, { scroll: false }),
        "adr-12a": bld(async (h) => {
          await h.click("[data-address-required='cadastral']");
          await h.click("[data-builder-mode='preview']");
          await h.scroll("[data-builder-preview-grid] [data-fo-cadastral-field]");
        }, { scroll: false }),
        /* „Cod cadastral” = search input + arrow submit: 13a typed, not sent (submit enabled) ·
           13 sent, pending (inline spinner, submit disabled, skeletons) · 14 filled · 14b code edited
           after a fill, not sent (values kept, hint back) · 14a changed code sent (skeleton over the
           fill) · 15 invalid · 15a not a code (letters, SRRE not asked) · 16 unavailable · 17 × (AC-16) */
        "adr-13a": adr({}, typeCod("0100510.123")),
        "adr-13": adr({ srre: "asteptare" }, cod("0100510.123", 1200)),
        "adr-14": adr({}, cod("0100510.123")),
        "adr-14b": adr({}, async (h) => { await cod("0100510.123")(h); await typeCod("1701102.330")(h); }),
        "adr-14a": adr({ srre: "lent" }, async (h) => { await cod("0100510.123", 3600)(h); await cod("1701102.330", 1300)(h); }),
        "adr-15": adr({}, cod("0100510.999")),
        "adr-15a": adr({}, cod("01005A")),
        "adr-16": adr({}, cod("0100999.777")),
        "adr-17": adr({}, async (h) => {
          await cod("0100510.123")(h);
          await h.click("[data-fo-step-panel='2'] [data-fo-cascade-address] [data-fo-cadastral-clear]");
          await h.wait(300);
        }),
        /* AC-18: Verificare și semnare shows the code with the address */
        "adr-10": adr({}, async (h) => {
          await code("0100510.123")(h);
          await h.click("[data-fo-step-panel='2'] [data-fo-next]");
          await h.click("[data-fo-step-panel='3'] [data-fo-next]");
          await h.scroll(".e-permits-fo-summary-row", "Cod cadastral");
        })
      };
    })(),

    /* ---- Process Designer (pd-, spec tools/persona-test/specs/svc/process-designer.md, batches 0–1):
       a full-bleed canvas under floating cards (palette, properties, zoom bar, minimap); one JSON
       definition (data/flows/*.json). Scope for QA: #process-designer-modal ---- */
    ...(() => {
      const PDX = () => window.GEAPProcessDesigner;
      const pd = (run, params) => ({ page: PP_FO, flow: "proces", ready: "[data-pd-ready='true']", ...(params ? { params } : {}), run: async (h) => { if (run) await run(h); } });
      const node = (id) => `[data-pd-node='${id}']`;
      /* the view a person reaches with zoom + pan, centred on one element */
      const at = (id, z = 1) => async (h) => { PDX().zoomToNode(id, z); await h.wait(500); };
      /* below 720 the list replaces the canvas (spec E.7): the same element is picked from the list */
      const listShown = () => Boolean(document.querySelector("[data-pd-list]:not([hidden])"));
      const pick = (id) => async (h) => { if (listShown()) { await h.click(`[data-pd-list-node='${id}']`); return; } await at(id)(h); await h.click(node(id)); };
      const listOn = async (h) => { if (!listShown()) await h.click("[data-pd-list-toggle]"); };
      const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      /* a gesture as a mouse sends it (pointer events; the designer uses no HTML5 drag) */
      const pointer = (type, target, x, y, buttons = 1) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons, clientX: x, clientY: y }));
      const key = (target, k, opts = {}) => target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
      /* press a port dot and move towards `to` (a node id or [x, y]); `release` ends it there */
      const connecting = (from, port, to, { toPort = "", release = false } = {}) => async (h) => {
        const p = await h.find(`${node(from)} [data-pd-port='${port}']`);
        const [x, y] = center(p);
        pointer("pointerdown", p, x, y);
        const t = Array.isArray(to) ? null : document.querySelector(node(to));
        const [tx, ty] = t ? center(toPort ? t.querySelector(`[data-pd-port='${toPort}']`) : t) : [x + to[0], y + to[1]];
        for (let i = 1; i <= 8; i += 1) { pointer("pointermove", window, x + (tx - x) * i / 8, y + (ty - y) * i / 8); await h.wait(40); }
        await h.wait(200);
        if (release) { pointer("pointerup", window, tx, ty, 0); await h.wait(300); }
      };
      /* errors to show: an unconnected Activitate + a Decizie after it with one exit */
      const brokenBits = async (h) => {
        await h.click("[data-pd-palette-item='activity']");
        await h.click("[data-pd-palette-item='decision']");
        await h.wait(300);
      };
      const nudge = async (h) => { await pick("node6")(h); key(document.querySelector(node("node6")), "ArrowRight"); await h.wait(300); };
      const tab = (name) => async (h) => { await h.click(`[data-pd-props] [data-pd-tab='${name}']`); };
      const closeToasts = () => document.querySelectorAll(".toast .toast__close").forEach((b) => b.click());
      /* a pointer gesture from one element to another (the palette, an endpoint handle); `release` drops it */
      const dragFrom = (fromSel, toSel, { release = false, dx = 0 } = {}) => async (h) => {
        const from = await h.find(fromSel);
        const [x, y] = center(from);
        pointer("pointerdown", from, x, y);
        const [tx0, ty] = center(await h.find(toSel));
        const tx = tx0 + dx;
        for (let i = 1; i <= 10; i += 1) { pointer("pointermove", window, x + (tx - x) * i / 10, y + (ty - y) * i / 10); await h.wait(40); }
        await h.wait(200);
        if (release) { pointer("pointerup", window, tx, ty, 0); await h.wait(400); }
      };
      const dragPalette = (type, toSel, o = {}) => dragFrom(`[data-pd-palette-item='${type}']`, toSel, { dx: -30, ...o });
      /* Administrator Central › Fluxuri de lucru */
      const reg = (run) => ({ flow: "back-office", as: ADMIN, hash: "#workflows", ready: "[data-registry-kind='flows'] tr[data-workplace-row]", run: async (h) => { if (run) await run(h); } });
      return {
        /* batch 0 — view */
        "pd-01": pd(),
        "pd-01a": { flow: "back-office", as: ADMIN, hash: "#flux/flux-simplificat-fara-supervizor", ready: "[data-pd-ready='true']" },
        "pd-01b": pd(null, { proces: "flux-standard-v3" }),
        "pd-02": pd(null, { nou: "1" }),
        "pd-03": pd(async (h) => { await at("node6")(h); document.querySelector(node("node6")).classList.add("is-hovered"); }),
        "pd-12": pd(async (h) => { key(document.querySelector("[data-pd-stage]"), "\\", { ctrlKey: true }); await h.wait(300); }),
        "pd-13": pd(async (h) => { await pick("node6")(h); }, { vizualizare: "1" }),
        "pd-13a": pd(null, { vizualizare: "1" }),
        "pd-14": pd(async (h) => { await h.click("[data-pd-rail-toggle]"); }),
        "pd-15": pd(async (h) => { await h.click("[data-pd-zoom-label]"); await h.click("[data-pd-zoom-to='0.5']"); }),
        "pd-15a": pd(async (h) => { await h.click("[data-pd-zoom-label]"); }),
        "pd-18": pd(async (h) => { await h.click("[data-pd-mode='json']"); }),
        "pd-19": pd(async (h) => { await h.click("[data-pd-settings]"); }),
        "pd-25": pd(async (h) => { await pick("node12")(h); }, { vizualizare: "1" }),
        /* batch 1 — editing */
        "pd-04": pd(pick("node6")),
        "pd-04a": pd(async (h) => { await at("node6", 0.75)(h); PDX().select(["node6", "node7", "node12", "node41"]); await h.wait(200); }),
        "pd-04b": pd(pick("node12")),
        "pd-04c": pd(pick("node41")),
        "pd-04d": pd(pick("node13")),
        "pd-04e": pd(async (h) => { await pick("start")(h); await h.click("[data-pd-props] [data-stack-menu-trigger]"); }),
        "pd-05": pd(async (h) => { await at("start")(h); const plus = document.querySelector(`${node("start")} [data-pd-plus]`); const [x, y] = center(plus); pointer("pointerdown", plus, x, y); await h.wait(400); }),
        "pd-05a": pd(async (h) => { await pick("node16")(h); key(document.querySelector(node("node16")), "Enter", { ctrlKey: true }); await h.wait(300); await h.click("[data-pd-add-type='activity']"); }),
        "pd-06": pd(async (h) => { await at("node6")(h); await connecting("node6", "bottom-right", "node14", { toPort: "top" })(h); }),
        "pd-06a": pd(async (h) => { PDX().zoomToNodes(["node9", "node15"], 1); await h.wait(500); await connecting("node9", "top", "node15")(h); }),
        "pd-06b": pd(async (h) => { await at("node6")(h); await connecting("node6", "top-right", [60, -90], { release: true })(h); }),
        "pd-07": pd(async (h) => { await at("node6")(h); await h.click("[data-pd-edge-label='node6:0']"); }),
        "pd-07a": pd(async (h) => { await at("node6", 0.75)(h); await h.click("[data-pd-lane-select='lane5']"); }),
        "pd-16": pd(async (h) => { await brokenBits(h); PDX().fit(); await h.wait(400); await h.click("[data-pd-errors]"); }),
        "pd-17": pd(async (h) => { await pick("node9")(h); key(document.querySelector(node("node9")), "Delete"); await h.wait(300); }),
        "pd-27": pd(async (h) => { await nudge(h); await h.click("[data-pd-close]"); }),
        "pd-28": pd(async (h) => { await nudge(h); await h.click("[data-pd-save]"); }),
        "pd-28a": pd(async (h) => { await brokenBits(h); await h.click("[data-pd-save]"); await h.wait(300); }),
        "pd-21": pd(async (h) => { await nudge(h); await h.click("[data-pd-save]"); await h.click("[data-pd-version]"); }),

        /* batch 2 — configuration (tabs, decisions, processors, connections, sub-processes, lanes) */
        "pd-30": pd(async (h) => { await pick("node6")(h); await tab("actions")(h); }),
        "pd-31": pd(async (h) => { await pick("node6")(h); await tab("roles")(h); }),
        /* E5: the lane loses its role → the human steps in it have none (publish error on the tab) */
        "pd-31a": pd(async (h) => { await at("node6", 0.75)(h); await h.click("[data-pd-lane-select='lane5']"); await h.choose("[data-pd-prop='lane.role']", ""); await h.click(node("node6")); await tab("roles")(h); }),
        "pd-32": pd(async (h) => { await pick("node16")(h); await tab("terms")(h); }),
        "pd-33": pd(async (h) => { await pick("node6")(h); await tab("advanced")(h); await h.click("[data-pd-act='assign-add']"); }),
        "pd-08": pd(async (h) => { await pick("node3")(h); await tab("exits")(h); }),
        /* an OR group with an empty condition (E8 on the row) */
        "pd-08a": pd(async (h) => { await pick("node3")(h); await tab("exits")(h); await h.click("[data-pd-act='group-add'][data-i='0']"); await h.wait(300); await h.scroll("[data-pd-cond='exit.0.cond.1.0']"); }),
        /* N exits (TC 89977): Avizare / Aprobare / Respingere, no default → W1 */
        "pd-08b": pd(async (h) => { await pick("node12")(h); await tab("exits")(h); }),
        /* a new decision after Verifică date with the Da / Nu preset */
        "pd-08c": pd(async (h) => { await pick("node6")(h); await h.click("[data-pd-palette-item='decision']"); await tab("exits")(h); await h.click("[data-pd-act='exit-preset']"); }),
        "pd-09": pd(async (h) => { await pick("node41")(h); await tab("processor")(h); }),
        "pd-09b": pd(async (h) => { await pick("node41")(h); await tab("processor")(h); await h.click("[data-pd-tpl-open]"); await h.wait(300); }),
        "pd-09c": pd(async (h) => { await pick("node29")(h); await tab("processor")(h); }),
        "pd-09d": pd(async (h) => { await pick("RecordState2")(h); await tab("processor")(h); }),
        /* a notification step without templates: the save-blocking error on the field (US-188 AC-06) */
        "pd-09e": pd(async (h) => { await pick("node41")(h); await tab("processor")(h); await h.click("[data-pd-act='tpl-remove'][data-code='Case.Assigned']"); await h.click("[data-pd-act='tpl-remove'][data-code='Case.InProgress']"); await h.wait(300); }),
        /* drag Eveniment intermediar over a connection (the connection highlights), then drop = split */
        "pd-09a": pd(async (h) => { await at("node6")(h); await dragPalette("event", "[data-pd-edge-label='node6:0']", { release: false })(h); }),
        "pd-09f": pd(async (h) => { await at("node6")(h); await dragPalette("event", "[data-pd-edge-label='node6:0']", { release: true })(h); }),
        "pd-07b": pd(async (h) => { await at("node6")(h); await h.click("[data-pd-edge-label='node6:0']"); await h.choose("[data-pd-prop='edge.color']", "brand"); await h.click("[data-pd-seg='edge.width'][data-value='3']"); }),
        /* re-connect: the target handle dragged towards Creează proiectul deciziei de respingere */
        "pd-07c": pd(async (h) => { PDX().zoomToNodes(["node6", "node14"], 1); await h.wait(500); PDX().selectEdge("node6:0"); await h.wait(300); await dragFrom(".e-permits-pd__edge-end--target", node("node14"))(h); }),
        "pd-10": pd(async (h) => { await pick("node13")(h); }),
        "pd-10a": pd(async (h) => { await pick("node13")(h); await h.click("[data-pd-act='new-sub']"); }),
        /* drill-in: the card's „Deschide sub-procesul” → the called process, breadcrumb back */
        "pd-22": pd(async (h) => { await at("node13")(h); const ic = await h.find(`${node("node13")} [data-pd-open-sub]`); const [x, y] = center(ic); pointer("pointerdown", ic, x, y); await h.wait(900); await h.find("[data-pd-crumbs]:not([hidden])"); }),
        "pd-11": pd(async (h) => { await at("node6", 0.75)(h); await h.click("[data-pd-lane-select='lane5']"); }),
        "pd-11a": pd(async (h) => { await at("node6", 0.75)(h); await h.click("[data-pd-lane-select='lane3']"); await h.click("[data-pd-props] [data-stack-menu-trigger]"); await h.click("[data-pd-props] [data-pd-act='lane-delete']"); await h.wait(300); }),
        "pd-11b": pd(async (h) => { PDX().fit(); await h.wait(400); await h.click("[data-pd-pool-select]"); }),
        /* the lane-height handle under the pointer (Specialist Ghișeu) */
        "pd-11c": pd(async (h) => { await at("node5", 0.75)(h); await h.click("[data-pd-lane-select='lane2']"); }),
        "pd-26": pd(async (h) => { for (let i = 0; i < 8; i += 1) { PDX().selectPool(); await h.wait(60); await h.click("[data-pd-props] [data-pd-act='lane-add']"); } PDX().fit(); await h.wait(500); await h.click("[data-pd-pool-select]"); }),
        "pd-34": pd(async (h) => { await pick("node41")(h); await h.fill("[data-pd-prop='id']", "node6"); }),

        /* batch 3 — lifecycle (settings, JSON, versions, publish, registry, passport refresh) */
        "pd-19a": pd(async (h) => { await h.click("[data-pd-settings]"); await h.scroll("[data-pd-props] .e-permits-user-create__section-title", "Utilizare"); }),
        "pd-18a": pd(async (h) => { await h.click("[data-pd-mode='json']"); const text = PDX().serialize().replace('"title": "Flux Simplificat Fara Supervizor"', '"title": "Flux Simplificat (importat)"'); PDX().importText(text, "ProcesFluxSimplificatFaraSupervizor_v1.0.1.json"); await h.wait(500); }),
        /* publish blocked: E5 errors (lane without role) — the modal lists them, Publică disabled */
        "pd-20": pd(async (h) => { await at("node6", 0.75)(h); await h.click("[data-pd-lane-select='lane5']"); await h.choose("[data-pd-prop='lane.role']", ""); await h.click("[data-pd-publish]"); await h.wait(400); }),
        /* publish ready: saved draft, effect on request types, change note */
        "pd-20a": pd(async (h) => { await nudge(h); await h.click("[data-pd-publish]"); await h.wait(400); await h.fill("[data-pd-publish-note]", "Verifică date mutat lângă Distribuire.", { leave: false }); }),
        "pd-20b": pd(async (h) => { await nudge(h); await h.click("[data-pd-publish]"); await h.wait(400); await h.click("[data-pd-publish-confirm]"); await h.wait(300); await h.click("[data-pd-version]"); }),
        /* a past version opened view-only → „Restaurează ca schiță”; then restored */
        "pd-21a": pd(async (h) => { await nudge(h); await h.click("[data-pd-save]"); closeToasts(); await h.click("[data-pd-version]"); await h.click("[data-pd-open-version='1.0.0']"); await h.wait(600); }),
        "pd-21b": pd(async (h) => { await nudge(h); await h.click("[data-pd-save]"); closeToasts(); await h.click("[data-pd-version]"); await h.click("[data-pd-open-version='1.0.0']"); await h.wait(600); await h.click("[data-pd-restore]"); }),
        /* registry „Fluxuri de lucru” (US-50): Administrator Central › Fluxuri de lucru */
        "pd-35": reg(),
        "pd-35a": reg(async (h) => { await h.click("[data-workplace-add-product='pd-new']"); }),
        "pd-35b": reg(async (h) => { await h.click("[data-workplace-add-product='pd-new']"); await h.fill("[data-pd-df='name']", "Proces nou 2"); await h.click("[data-pd-drawer-submit]"); }),
        "pd-35c": reg(async (h) => { const row = await h.find("tr[data-workplace-row='flux-simplificat-fara-supervizor']"); row.querySelector("[data-stack-menu-trigger]").click(); await h.wait(300); }),
        "pd-35d": reg(async (h) => { const row = await h.find("tr[data-workplace-row='flux-simplificat-fara-supervizor']"); row.querySelector("[data-stack-menu-trigger]").click(); await h.wait(300); await h.click("[data-pd-reg-dup='flux-simplificat-fara-supervizor']"); }),
        /* published without the avizare branch → the request type's Avizare tab locks (US-222 AC-46) live */
        "pd-36": svc("request-types", async (h) => {
          await h.find('[data-passport-configure-rt="rt-1"]');
          await PDX().open("flux-simplificat-fara-supervizor");
          await h.find("[data-pd-ready='true']");
          PDX().deleteNodes(["node31", "node13"]);
          PDX().select("node12");
          await h.fill("[data-pd-props] [data-pd-prop='title']", "Decizie examinare");
          await h.click("[data-pd-publish]"); await h.wait(400);
          await h.click("[data-pd-publish-confirm]"); await h.wait(300);
          PDX().close({ force: true }); await h.wait(400);
          await h.click('[data-passport-configure-rt="rt-1"]'); await h.click('[data-rt-tab="avizare"]');
        }),
        /* the same publish, the modal before confirming: W3 (avizare lost) + the request types it reaches */
        "pd-36a": svc("request-types", async (h) => {
          await h.find('[data-passport-configure-rt="rt-1"]');
          await PDX().open("flux-simplificat-fara-supervizor");
          await h.find("[data-pd-ready='true']");
          PDX().deleteNodes(["node31", "node13"]);
          PDX().select("node12");
          await h.fill("[data-pd-props] [data-pd-prop='title']", "Decizie examinare");
          await h.click("[data-pd-publish]"); await h.wait(400);
        }),

        /* batch 4 — list view, auto-layout, arrange / copy, case trace */
        "pd-23": pd(async (h) => { await listOn(h); }),
        "pd-23a": pd(async (h) => { await listOn(h); await h.click("[data-pd-list-edge='node6:1']"); }, { vizualizare: "1" }),
        /* auto-layout: the confirm (the seed has manual routes), then the tidy result with its undo toast */
        "pd-29a": pd(async (h) => { await h.click("[data-pd-autolayout]"); await h.wait(300); }),
        "pd-29": pd(async (h) => { await h.click("[data-pd-autolayout]"); await h.wait(300); await h.click("[data-service-confirm-ok]"); await h.wait(600); }),
        "pd-37": pd(async (h) => { await at("node6", 0.75)(h); PDX().select(["node5", "node6", "node41"]); await h.wait(200); }),
        "pd-37a": pd(async (h) => { await at("node6", 0.75)(h); PDX().select(["node5", "node6", "node41"]); await h.wait(200); await h.click("[data-pd-act='align-top']"); }),
        "pd-38": pd(async (h) => { await pick("node6")(h); PDX().select(["node6", "node41"]); await h.wait(150); key(document.querySelector("[data-pd-stage]"), "d", { metaKey: true }); await h.wait(300); }),
        /* a case's path (Dosar › Vezi fluxul › Vezi schema fluxului): visited green, current step brand */
        "pd-24": { flow: "back-office", as: "ansp-specialist-chisinau", params: { stare: "spreSemnare" }, hash: "#dosar/D-2026-004575/general", ready: ".e-permits-trajectory, .e-permits-dosar-profil__section", run: async (h) => {
          await h.click(".e-permits-case-actions__trigger"); await h.click("[data-case-flow-view]"); await h.click("[data-case-flow-schema]");
          await h.find("[data-pd-ready='true']"); await h.wait(600);
        } },
      };
    })(),

    /* ---- Form Builder (fb-, spec tools/persona-test/specs/svc/form-builder.md, batches 0–1):
       palette · canvas · properties by selection; canvas cards and Preview = the FO renderer.
       Scope for QA: #form-builder-modal ---- */
    ...(() => {
      const fb = (run, params) => ({ page: PP_FO, flow: "builder", ready: "[data-fb-ready]", ...(params ? { params } : {}), run: async (h) => { if (run) await run(h); } });
      const card = (id) => `[data-builder-field][data-id='${id}']`;
      const pick = (id) => async (h) => { await h.click(card(id)); };
      const tab = (name) => async (h) => { await h.click(`[data-builder-prop-tab='${name}']`); };
      const lib = (type) => async (h) => { await h.click(`[data-builder-component='${type}']`); };
      const key = (el, k, opts = {}) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
      /* a drag in progress: the palette item's dragstart + a dragover on the target card (left half) */
      const dragOver = (type, targetId) => async (h) => {
        const item = await h.find(`[data-builder-component='${type}']`);
        const dt = new DataTransfer();
        item.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
        const target = await h.scroll(card(targetId));
        const r = target.getBoundingClientRect();
        target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.top + r.height / 2 }));
        await h.wait(200);
      };
      const menu = (id) => async (h) => { await h.click(`${card(id)} [data-stack-menu-trigger]`); };
      /* a hidden native select behind a fo-select: pick the option whose text contains `text` */
      const chooseText = async (h, selector, text) => {
        for (let i = 0; i < 100 && !document.querySelector(selector); i += 1) await h.wait(100);
        const select = document.querySelector(selector);
        select.value = [...select.options].find((o) => o.textContent.includes(text))?.value || "";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await h.wait(450);
      };
      /* Logică: a new „Numărul licenței pentru alcool” shown only when „Comercializați băuturi alcoolice?” = Da */
      const licenceRule = async (h) => {
        await lib("text")(h);
        await h.fill("[data-fb-prop='label']", "Numărul licenței pentru alcool", { leave: false });
        await tab("logic")(h);
        await h.click("[data-fb-rule-add]");
        await h.choose("[data-fb-cond-field='0.0']", "fld-alcohol");
        await h.choose("[data-fb-cond-op='0.0']", "eq");
        await h.choose("[data-fb-cond-value='0.0']", "da");
      };
      return {
        /* 01 empty service step (new step, one empty section), nothing selected → Date generale */
        "fb-01": fb(async (h) => { await h.click("[data-fb-add-step]"); await h.click("[data-fb-select-form]"); }),
        "fb-01a": fb(async (h) => { await h.fill("[data-builder-library-search]", "dat", { leave: false }); }),
        "fb-01b": fb(async (h) => { await h.click("[data-fb-add-trigger='sec-object']"); }),
        "fb-02": fb(async (h) => { await h.click("[data-fb-select-form]"); await h.scroll("[data-fb-group-languages]"); }),
        "fb-03": fb(async (h) => { await h.click("[data-fb-step='st-details']"); }),
        "fb-03a": fb(async (h) => { await h.click("[data-fb-step='st-payment']"); }),
        "fb-04": fb(async (h) => { await h.click("[data-fb-select-section='sec-activity']"); }),
        "fb-05": fb(async (h) => { await pick("fld-name")(h); await h.scroll("[data-fb-prop='required']"); }),
        "fb-05a": fb(async (h) => {
          await pick("fld-name")(h); await tab("validation")(h);
          await h.choose("[data-fb-prop='validation.preset']", "phone");
          await h.fill("[data-fb-test-input]", "069123456", { leave: false });
          await h.click("[data-fb-test]");
        }),
        "fb-05b": fb(async (h) => {
          await pick("fld-name")(h); await tab("validation")(h);
          await h.choose("[data-fb-prop='validation.preset']", "regex");
          await h.fill("[data-fb-prop='validation.pattern']", "[A-Z{2", { leave: false });
        }),
        "fb-05c": fb(async (h) => { await pick("fld-name")(h); await h.click("[data-fb-lang='ru']"); }),
        /* 05w „Lățime” = a row of 12 real columns (fld-name 8/12) · 05x set to 6/12 (card tag follows)
           · 05y locked width (Persoana de contact: tot rândul, disabled + reason) */
        "fb-05w": fb(async (h) => { await pick("fld-name")(h); await h.scroll(".e-permits-builder__panel .e-permits-builder__width-picker"); }),
        "fb-05x": fb(async (h) => { await pick("fld-name")(h); await h.click("[data-fb-seg='span'][data-value='6']"); await h.scroll(".e-permits-builder__panel .e-permits-builder__width-picker"); }),
        "fb-05y": fb(async (h) => { await lib("contact")(h); await h.scroll(".e-permits-builder__panel .e-permits-builder__width-picker"); }),
        "fb-06": fb(async (h) => { await lib("select")(h); await tab("data")(h); }),
        "fb-06a": fb(async (h) => {
          await lib("select")(h); await tab("data")(h);
          await h.choose("[data-fb-prop='dataSource.mode']", "existing");
          await h.click("[data-fb-browse]");
          await h.click("[data-fb-pick-classifier='reg_localitati']");
          await h.click("[data-fb-prop='dataSource.cascade']");
          await h.choose("[data-fb-prop='dataSource.parentFieldId']", "fld-raion");
        }),
        "fb-06b": fb(async (h) => { await pick("fld-unit")(h); await tab("data")(h); }),
        "fb-07": fb(async (h) => { await lib("radio")(h); await tab("data")(h); await h.click("[data-fb-option-yesno]"); }),
        "fb-08": fb(async (h) => { await pick("fld-start")(h); await tab("validation")(h); }),
        "fb-09": fb(async (h) => { await lib("money")(h); await tab("validation")(h); }),
        "fb-09a": fb(async (h) => { await pick("fld-area")(h); await h.scroll("[data-fb-prop='unit']"); }),
        /* drag in progress: the 4px insertion line before „Email-ul obiectului” */
        "fb-11": fb(dragOver("date", "fld-email")),
        /* the drag alternatives: ⋮ (Mută mai sus / mai jos / în altă secțiune) and Alt + ↑ */
        "fb-11a": fb(async (h) => { await pick("fld-phone")(h); await menu("fld-phone")(h); }),
        "fb-11b": fb(async (h) => { await pick("fld-email")(h); const el = await h.find(card("fld-email")); el.focus(); key(el, "ArrowUp", { altKey: true }); await h.wait(400); }),
        /* delete without a modal → toast with „Anulează”; 12a = undone */
        "fb-12": fb(async (h) => { await menu("fld-phone")(h); await h.click("[data-fb-act='delete'][data-id='fld-phone']"); }),
        "fb-12a": fb(async (h) => { await menu("fld-phone")(h); await h.click("[data-fb-act='delete'][data-id='fld-phone']"); await h.click(".toast [data-toast-action]"); }),
        /* validation summary: 3 errors + translation warnings; 13a = a row jumps to the field's tab */
        "fb-13": fb(async (h) => {
          await lib("select")(h);
          await pick("fld-name")(h);
          await h.fill("[data-fb-prop='label']", "", { leave: false });
          await h.click("[data-fb-errors]");
        }),
        "fb-13a": fb(async (h) => {
          await lib("select")(h);
          await h.click("[data-fb-errors]");
          await h.click("[data-fb-issue='field'][data-id='fld-authority']");
        }),
        /* Logică (batch 2): 10 rule „Afișează … Când Comercializați = Da” · 10a the reverse rule
           on the radio → circular dependency, refused · 14 Preview: Da → the field appears */
        "fb-10": fb(licenceRule),
        "fb-10a": fb(async (h) => {
          await licenceRule(h);
          await pick("fld-alcohol")(h); await tab("logic")(h);
          await h.click("[data-fb-rule-add]");
          await chooseText(h, "[data-fb-cond-field='0.0']", "Numărul licenței");
          await h.choose("[data-fb-cond-op='0.0']", "filled");
        }),
        "fb-14": fb(async (h) => {
          await licenceRule(h);
          await h.click("[data-builder-mode='preview']");
          await h.click("[data-builder-preview-grid] input[type='radio'][value='da']");
          await h.wait(200);
          await h.scroll("[data-builder-preview-grid] [data-fb-field]", "Numărul licenței");
        }),
        /* live: an edit in the panel shows in Preview (label + Obligatoriu) */
        "fb-14a": fb(async (h) => {
          await pick("fld-email")(h);
          await h.fill("[data-fb-prop='label']", "Email de contact", { leave: false });
          await h.click("[data-fb-prop='required']");
          await h.click("[data-builder-mode='preview']");
          await h.scroll("[data-builder-preview-grid] input[type='email']");
        }),
        "fb-17": fb(async (h) => {
          await lib("address")(h); await h.click("[data-type='address']"); await tab("data")(h);
          await h.click("[data-address-toggle-section='cadastral']");
          await h.scroll("[data-address-item='cadastral']");
        }),
        "fb-18": fb(async (h) => { await h.click("[data-builder-mode='schema']"); }),
        /* Preview in Russian: untranslated texts fall back to Romanian */
        "fb-20": fb(async (h) => { await h.click("[data-builder-mode='preview']"); await h.click("[data-fb-preview-lang='ru']"); }),
        /* a new service step, its ⋮ (Mută la stânga / dreapta among service steps, Șterge) */
        "fb-03b": fb(async (h) => { await h.click("[data-fb-add-step]"); await h.click(".e-permits-builder__panel-title-row [data-stack-menu-trigger]"); }),
        /* batch-2 components: segmented control · multi-select · period · callout + separator */
        "fb-23": fb(async (h) => { await lib("segment")(h); await tab("data")(h); await h.click("[data-fb-option-yesno]"); }),
        "fb-24": fb(async (h) => {
          await lib("multiselect")(h); await tab("data")(h);
          await h.choose("[data-fb-prop='dataSource.mode']", "static");
          await h.fill("[data-fb-option='0']", "Produse alimentare", { leave: false });
          await h.click("[data-fb-option-add]");
          await h.fill("[data-fb-option='1']", "Produse nealimentare", { leave: false });
        }),
        "fb-25": fb(async (h) => { await lib("period")(h); await tab("validation")(h); }),
        "fb-26": fb(async (h) => { await lib("separator")(h); await lib("callout")(h); await h.scroll("[data-builder-field][data-type='callout']"); }),
        /* Preview › Mobil: the page at 375 px in a frame, live (the licence rule + Da) */
        "fb-14b": fb(async (h) => {
          await licenceRule(h);
          await h.click("[data-builder-mode='preview']");
          await h.click("[data-fb-preview-device='mobile']");
          await h.wait(2500);
        }),
        /* Preview: „Completează cu date de test” */
        "fb-27": fb(async (h) => { await h.click("[data-builder-mode='preview']"); await h.click("[data-fb-preview-fill]"); }),

        /* ---- batch 3 (registre și context): one component per group of states — palette ·
           configured panel · Preview / FO render · error. PV = the Preview grid. */
        ...(() => {
          const PV = "[data-builder-preview-grid]";
          const preview = async (h) => { await h.click("[data-builder-mode='preview']"); await h.wait(300); };
          const last = (type) => `[data-builder-field][data-type='${type}']`;
          const validate = async (h) => { await h.click("[data-fb-preview-validate]"); await h.wait(300); };
          const idnp = (source) => async (h) => { await lib("idnp")(h); await tab("data")(h); if (source) await h.choose("[data-fb-prop='idnpSource']", source); };
          const idno = async (h) => { await lib("idno")(h); };
          const attachTo = (selector, name) => async (h) => {
            await h.click(`${selector} [data-fo-open-doc-modal]`);
            const input = document.querySelector("[data-fo-doc-file-input]");
            const files = new DataTransfer();
            files.items.add(new File(["%PDF-1.4"], name, { type: "application/pdf" }));
            input.files = files.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
            await h.wait(200);
            await h.click("[data-fo-doc-modal-submit]");
          };
          /* two dates: „Data contractului” (≤ azi) and „Data specificației” (≥ the contract) — US-49 / US-41 */
          const twoDates = async (h) => {
            await lib("date")(h);
            await h.fill("[data-fb-prop='label']", "Data contractului", { leave: false });
            await lib("date")(h);
            await h.fill("[data-fb-prop='label']", "Data specificației", { leave: false });
            await tab("validation")(h);
            await h.click("[data-fb-date-rule-add]");
            await h.choose("[data-fb-date-rule-op='0']", "ge");
            await chooseText(h, "[data-fb-date-rule-target='0']", "Data contractului");
          };
          return {
            /* 30 palette: the registry group is usable (no „În curând”) */
            "fb-30": fb(async (h) => { await h.scroll("#fb-lib-registry"); }),
            "fb-30a": fb(async (h) => { await h.fill("[data-builder-library-search]", "fișier", { leave: false }); }),
            /* 31 IDNP — Date: typed (privacy note) · 31a RSP (declaration first) · 31b applicant (MPass) */
            "fb-31": fb(idnp("")),
            "fb-31a": fb(idnp("rsp")),
            "fb-31b": fb(async (h) => { await idnp("applicant")(h); await preview(h); await h.scroll(`${PV} [data-fb-field]`, "Preluat din MPass"); }),
            /* 31c Preview RSP: declaration ticked, IDNP typed → Nume + Prenume read-only from RSP */
            "fb-31c": fb(async (h) => {
              await idnp("rsp")(h); await preview(h);
              await h.click(`${PV} .e-permits-fo-pp-consent`);
              await h.fill(`${PV} [data-fo-registry-code]`, "2990000000002");
              await h.wait(1300);
              await h.scroll(`${PV} [data-fo-registry='rsp']`);
            }),
            /* 31d error: a typed IDNP of 9 digits → „Validează” */
            "fb-31d": fb(async (h) => {
              await idnp("")(h); await h.click("[data-builder-prop-tab='general']"); await h.click("[data-fb-prop='required']");
              await preview(h);
              await h.fill(`${PV} [data-fo-digits]`, "200200123");
              await validate(h);
              await h.scroll(`${PV} [data-fo-digits]`);
            }),
            /* 32 IDNO — Date (RSUD) · 32a Preview pending · 32b found · 32c not found */
            "fb-32": fb(async (h) => { await idno(h); await tab("data")(h); }),
            "fb-32a": fb(async (h) => { await idno(h); await preview(h); await h.fill(`${PV} [data-fo-registry-code]`, "1012600000001"); await h.wait(400); await h.scroll(`${PV} [data-fo-registry='rsud']`); }, { registru: "asteptare" }),
            "fb-32b": fb(async (h) => { await idno(h); await preview(h); await h.fill(`${PV} [data-fo-registry-code]`, "1012600000001"); await h.wait(1400); await h.scroll(`${PV} [data-fo-registry='rsud']`); }),
            "fb-32c": fb(async (h) => { await idno(h); await preview(h); await h.fill(`${PV} [data-fo-registry-code]`, "1012600009999"); await h.wait(1400); await h.scroll(`${PV} [data-fo-registry='rsud']`); }),
            /* 33 Persoana de contact — Date: parts (Email shown, optional) · 33a Preview „Altă persoană” */
            "fb-33": fb(async (h) => { await lib("contact")(h); await tab("data")(h); await h.click("[data-contact-visible='email']"); }),
            "fb-33a": fb(async (h) => {
              await lib("contact")(h); await tab("data")(h); await h.click("[data-contact-visible='email']");
              await preview(h);
              await h.click(`${PV} [data-fo-contact-person] .e-permits-fo-radio:has(input[value='other'])`);
              await h.scroll(`${PV} [data-fo-contact-other]`);
            }),
            /* 34 Subdiviziune — Date: derived from an address (no address yet → error) · 34a derived
               from „Adresa obiectului” · 34b automat (one subdivision) in Preview */
            "fb-34": fb(async (h) => { await lib("subdivision")(h); await tab("data")(h); }),
            "fb-34a": fb(async (h) => {
              await h.click("[data-fb-preset='preset-object-address']");
              await lib("subdivision")(h); await tab("data")(h);
              await chooseText(h, "[data-fb-prop='addressFieldId']", "Adresa obiectului");
            }),
            "fb-34b": fb(async (h) => {
              await lib("subdivision")(h); await tab("data")(h);
              await h.choose("[data-fb-prop='subdivisionMode']", "auto");
              await chooseText(h, "[data-fb-prop='subdivisionAuto']", "Orhei");
              await preview(h); await h.scroll(`${PV} [data-fb-field]`, "Subdiviziunea");
            }),
            /* 35 Fișier — Validare (types, size, count) · 35a Preview · 35b „Validează” without a file ·
               35c upload modal (device only) · 35d two files of three */
            "fb-35": fb(async (h) => { await lib("file")(h); await tab("validation")(h); }),
            "fb-35a": fb(async (h) => { await lib("file")(h); await preview(h); await h.scroll(`${PV} .e-permits-fo-doc-field--boxed`); }),
            "fb-35b": fb(async (h) => { await lib("file")(h); await h.click("[data-fb-prop='required']"); await preview(h); await validate(h); await h.scroll(`${PV} .e-permits-fo-doc-field--boxed`); }),
            "fb-35c": fb(async (h) => { await lib("file")(h); await preview(h); await h.click(`${PV} .e-permits-fo-doc-field--boxed [data-fo-open-doc-modal]`); }),
            "fb-35d": fb(async (h) => {
              await lib("file")(h); await tab("validation")(h); await h.choose("[data-fb-prop='maxFiles']", "3");
              await preview(h);
              await attachTo(`${PV} .e-permits-fo-doc-field--boxed`, "planul-incaperilor.pdf")(h);
              await attachTo(`${PV} .e-permits-fo-doc-field--boxed`, "fotografie-fatada.pdf")(h);
              await h.scroll(`${PV} .e-permits-fo-doc-field--boxed`);
            }),
            /* 36 Document din MDocs — Date · 36a Preview: the picker with the MDocs library */
            "fb-36": fb(async (h) => { await lib("mdocs")(h); await tab("data")(h); await h.choose("[data-fb-prop='docType']", "extras-rsud"); }),
            "fb-36a": fb(async (h) => { await lib("mdocs")(h); await tab("data")(h); await h.choose("[data-fb-prop='docType']", "extras-rsud"); await preview(h); await h.click(`${PV} [data-fo-open-doc-modal]`); }),
            /* 37 Câmp ascuns — canvas marker + Date (from the context) · 37a static value missing
               (error) · 37b „Din regulă”: Logică › Setează valoarea */
            "fb-37": fb(async (h) => { await lib("hidden")(h); await tab("data")(h); await h.choose("[data-fb-prop='hiddenSource']", "prefill"); await h.scroll(last("hidden")); }),
            "fb-37a": fb(async (h) => { await lib("hidden")(h); await tab("data")(h); await h.scroll(last("hidden")); }),
            "fb-37b": fb(async (h) => {
              await lib("hidden")(h); await h.fill("[data-fb-prop='label']", "Categoria de risc", { leave: false });
              await tab("data")(h); await h.choose("[data-fb-prop='hiddenSource']", "rule");
              await tab("logic")(h); await h.click("[data-fb-rule-add]");
              await h.choose("[data-fb-cond-field='0.0']", "fld-alcohol");
              await h.choose("[data-fb-cond-op='0.0']", "eq");
              await h.choose("[data-fb-cond-value='0.0']", "da");
              await h.fill("[data-fb-rule-setvalue='0']", "risc-sporit", { leave: false });
            }),
            /* 38 Consimțământ — General (Obligatoriu locked) · 38a link text not in the text (error) ·
               38b Preview „Validează” unticked */
            "fb-38": fb(async (h) => { await lib("consent")(h); }),
            "fb-38a": fb(async (h) => { await lib("consent")(h); await h.fill("[data-fb-prop='linkText']", "Legea nr. 133", { leave: false }); }),
            "fb-38b": fb(async (h) => { await lib("consent")(h); await preview(h); await validate(h); await h.scroll(`${PV} [data-fb-field]`, "Legii nr. 133"); }),
            /* 39 Componente salvate — „Salvează ca componentă” modal · 39a saved: palette group +
               the linked copy · 39b the source moved on (v2) → „Actualizează din sursă” */
            "fb-39": fb(async (h) => { await pick("fld-area")(h); await menu("fld-area")(h); await h.click("[data-fb-act='save-preset'][data-id='fld-area']"); }),
            "fb-39a": fb(async (h) => {
              await pick("fld-area")(h); await menu("fld-area")(h); await h.click("[data-fb-act='save-preset'][data-id='fld-area']");
              await h.fill("[data-fb-prop='preset.name']", "Suprafață (m²)", { leave: false });
              await h.click("[data-fb-preset-save]");
              await h.click("[data-fb-preset]", "Suprafață (m²)");
              await h.scroll("[data-fb-library-saved]");
            }),
            "fb-39b": fb(async (h) => {
              await pick("fld-area")(h); await menu("fld-area")(h); await h.click("[data-fb-act='save-preset'][data-id='fld-area']");
              await h.fill("[data-fb-prop='preset.name']", "Suprafață (m²)", { leave: false });
              await h.click("[data-fb-preset-save]");
              await h.click("[data-fb-preset]", "Suprafață (m²)");
              const copy = window.GEAPFormBuilder.state.sel.id;
              await pick("fld-area")(h);
              await h.fill("[data-fb-prop='unit']", "ha", { leave: false });
              await h.click("[data-fb-preset-act='push']");
              await h.click("[data-service-confirm-ok]");
              await pick(copy)(h);
            }),
            /* 40 Avansat: id + key copy, integration, editable per request type, shown in, GDPR, audit */
            "fb-40": fb(async (h) => { await pick("fld-name")(h); await tab("advanced")(h); }),
            "fb-40a": fb(async (h) => { await pick("fld-name")(h); await tab("advanced")(h); await h.scroll("[data-fb-editable-at]"); }),
            /* 41 Reguli de dată (US-41): ≥ another date · 41a its reciprocal on the other date ·
               41b both directions stored → cycle · 41c Preview „Validează” breaks the rule */
            "fb-41": fb(twoDates),
            "fb-41a": fb(async (h) => { await twoDates(h); const first = [...document.querySelectorAll(last("date"))].find((card) => card.textContent.includes("Data contractului")); first.click(); await h.wait(400); await tab("validation")(h); }),
            "fb-41b": fb(async (h) => {
              await twoDates(h);
              const first = [...document.querySelectorAll(last("date"))].find((card) => card.textContent.includes("Data contractului")); first.click(); await h.wait(400);
              await tab("validation")(h); await h.click("[data-fb-date-rule-add]");
              await h.choose("[data-fb-date-rule-op='0']", "le");
              await chooseText(h, "[data-fb-date-rule-target='0']", "Data specificației");
            }),
            "fb-41c": fb(async (h) => {
              await twoDates(h); await preview(h);
              const pickers = [...document.querySelectorAll(`${PV} [data-date-picker]`)].slice(-2);
              const set = (picker, iso) => { picker.dataset.selected = iso; picker.querySelector("input").value = iso.split("-").reverse().join("/"); };
              set(pickers[0], "2026-10-10"); set(pickers[1], "2026-10-01");
              await validate(h);
              await h.scroll(`${PV} [data-fb-field]`, "Data specificației");
            }),
            /* 42 Logică „Alt câmp”: show the licence number when „Data începerii” ≥ another date */
            "fb-42": fb(async (h) => {
              await lib("date")(h); await h.fill("[data-fb-prop='label']", "Data expirării licenței", { leave: false });
              await licenceRule(h);
              await h.click("[data-fb-cond-add='0']");
              await h.choose("[data-fb-cond-field='0.1']", "fld-start");
              await h.choose("[data-fb-cond-op='0.1']", "le");
              await h.choose("[data-fb-cond-mode='0.1']", "field");
              await chooseText(h, "[data-fb-cond-other='0.1']", "Data expirării licenței");
            }),
            /* 43 Preview „Validează” on the seed step: required + format errors, focus on the first */
            "fb-43": fb(async (h) => { await preview(h); await h.fill(`${PV} input[type='email']`, "obiect@"); await validate(h); }),
            "fb-43a": fb(async (h) => { await preview(h); await h.click("[data-fb-preview-fill]"); await validate(h); })
          };
        })(),

        /* ---- batch 4 (1:N): Grilă editabilă (US-33…39) · Activități CAEM (US-40) · Bloc repetabil.
           F09 = the seed form of service 09 (CAEM block, equipment grid with a nested grid, work
           points with a cascade). QA scope: #form-builder-modal; the FO grid/block = the Preview. */
        ...(() => {
          const F09 = { formular: "form-sanitary-09" };
          const PV = "[data-builder-preview-grid]";
          const preview = async (h) => { await h.click("[data-builder-mode='preview']"); await h.wait(400); };
          const validate = async (h) => { await h.click("[data-fb-preview-validate]"); await h.wait(400); };
          const chip = (id) => `[data-fb-child='${id}']`;
          const band = (type) => `[data-builder-field][data-type='${type}'] .e-permits-builder__sub-add`;
          const equip = `${PV} [data-fb-field='fld-equipment']`;
          const caem = `${PV} [data-fb-field='fld-caem']`;
          /* a CAEM code picked the way the FO list acts (mousedown on the option) */
          const pickCode = (scope, code, card = 0) => async (h) => {
            await h.find(`${scope} [data-fo-repeat-item]`);
            document.querySelectorAll(`${scope} [data-fo-repeat-item]`)[card].querySelector(`.e-permits-fo-caem__option[data-code='${code}']`).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
            await h.wait(300);
          };
          const fillGrid = (scope) => async (h) => { const cell = await h.find(scope); window.GEAPFoRepeat.fill(cell); await h.wait(300); };
          /* a generic block: „Vehicule” with Nr. de înmatriculare (max 2) — max reached in the Preview */
          const vehicles = async (h) => {
            await h.click("[data-builder-component='repeat']");
            await h.fill("[data-fb-prop='label']", "Vehicule", { leave: false });
            await h.fill("[data-fb-prop='itemTitle']", "Vehicul", { leave: false });
            await h.fill("[data-fb-prop='addLabel']", "Adaugă alt vehicul", { leave: false });
            await h.click(band("repeat"));
            await h.click("[data-builder-field][data-type='repeat'] [data-fb-add-child='text']");
            await h.fill("[data-fb-prop='label']", "Nr. de înmatriculare", { leave: false });
            await h.click(".e-permits-builder__panel-head .breadcrumbs__link[data-fb-goto]");
            await h.click("[data-builder-prop-tab='validation']");
            await h.fill("[data-fb-prop='rowRules.maxRows']", "2", { leave: false });
          };
          return {
            /* 50 palette: Grilă editabilă + Bloc repetabil usable (no „În curând”), Activități CAEM saved */
            "fb-50": fb(async (h) => { await h.scroll("#fb-lib-repeat"); }),
            "fb-50a": fb(async (h) => { await h.fill("[data-builder-library-search]", "caem", { leave: false }); }),
            /* 51 a new grid: no columns (US-34), the band and the Date tab · 51a the typed menu, complex locked */
            "fb-51": fb(async (h) => { await h.click("[data-builder-component='grid']"); await h.click("[data-builder-prop-tab='data']"); await h.scroll("[data-builder-field][data-type='grid']"); }),
            "fb-51a": fb(async (h) => { await h.click("[data-builder-component='grid']"); await h.scroll("[data-builder-field][data-type='grid']"); await h.click(band("grid")); }),
            /* 52 column editor of the equipment grid · 52a a column selected (the field panel, US-34 AC-03)
               · 52b a palette type dragged over the band (insertion line) */
            "fb-52": fb(async (h) => { await h.click("[data-builder-field][data-id='fld-equipment']"); await h.click("[data-builder-prop-tab='data']"); await h.scroll("[data-builder-field][data-id='fld-equipment']"); }, F09),
            "fb-52a": fb(async (h) => { await h.scroll("[data-builder-field][data-id='fld-equipment']"); await h.click(chip("col-09-name")); }, F09),
            /* 52w a grid column's „Lățime coloană”: parts on a 4-bar row (Îngustă 2 · Medie 3 · Lată 4) */
            "fb-52w": fb(async (h) => { await h.scroll("[data-builder-field][data-id='fld-equipment']"); await h.click(chip("col-09-name")); await h.scroll(".e-permits-builder__panel .e-permits-builder__width-picker"); }, F09),
            "fb-52b": fb(async (h) => {
              const target = await h.scroll(chip("col-09-cap"));
              const item = await h.find("[data-builder-component='date']");
              const dt = new DataTransfer();
              item.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
              const r = target.getBoundingClientRect();
              target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 6, clientY: r.top + r.height / 2 }));
              await h.wait(200);
            }, F09),
            /* 53 row rules (US-36): min / max / key / page size · 53a a list column: Date + cascade (US-37) */
            "fb-53": fb(async (h) => { await h.click("[data-builder-field][data-id='fld-equipment']"); await h.click("[data-builder-prop-tab='validation']"); }, F09),
            "fb-53a": fb(async (h) => { await h.scroll("[data-builder-field][data-id='fld-points']"); await h.click(chip("col-09-loc")); await h.click("[data-builder-prop-tab='data']"); await h.scroll("#fb-p-dataSource-parentFieldId"); }, F09),
            /* 54 a nested grid (US-38): its columns, level 2 of 3 · 54a level 3: no deeper grid */
            "fb-54": fb(async (h) => { await h.scroll("[data-builder-field][data-id='fld-equipment']"); await h.click(chip("col-09-parts")); await h.click("[data-builder-prop-tab='data']"); }, F09),
            "fb-54a": fb(async (h) => {
              await h.scroll("[data-builder-field][data-id='fld-equipment']");
              await h.click(chip("col-09-parts"));
              await h.click("[data-builder-prop-tab='data']");
              await h.click("[aria-controls='fb-addchild-col-09-parts-panel']");
              await h.click("[data-fb-add-child='grid'][data-container='col-09-parts']");
              await h.click("[data-builder-prop-tab='data']");
              const level3 = window.GEAPFormBuilder.state.sel.id;
              await h.click(`[aria-controls='fb-addchild-${level3}-panel']`);
              await h.click(`[data-fb-add-child='text'][data-container='${level3}']`);
              await h.click(".e-permits-builder__panel-head .breadcrumbs__link[data-fb-goto]");
              await h.click(`[aria-controls='fb-addchild-${level3}-panel']`);
            }, F09),
            /* 55 the FO grid filled (Preview desktop) · 55a a row in edit mode (click on a cell) · 55b a
               nested grid opened under its row */
            "fb-55": fb(async (h) => { await preview(h); await fillGrid(equip)(h); await h.scroll(equip); }, F09),
            "fb-55a": fb(async (h) => { await preview(h); await fillGrid(equip)(h); await h.click(`${equip} [data-fo-grid-cell='Denumire']`); await h.scroll(`${equip} .is-editing`); }, F09),
            "fb-55b": fb(async (h) => { await preview(h); await fillGrid(equip)(h); await h.click(`${equip} [data-fo-grid-nested]`); await h.click(`${equip} .e-permits-fo-grid__detail [data-fo-grid-add]`); await h.scroll(`${equip} .e-permits-fo-grid__detail`); }, F09),
            /* 56 errors: a new row with an inventory number already used + empty required cells (US-36 AC-03,
               US-35 AC-07) · 56a „Validează”: under the minimum + a work point never filled */
            "fb-56": fb(async (h) => {
              await preview(h); await fillGrid(equip)(h);
              await h.click(`${equip} [data-fo-grid-add]`);
              await h.fill(`${equip} .is-editing [data-col='NrInventar'] input`, "INV-0012", { leave: false });
              await h.click(`${equip} .is-editing [data-fo-grid-act='save']`);
              await h.scroll(`${equip} .is-editing`);
            }, F09),
            "fb-56a": fb(async (h) => { await preview(h); await validate(h); await h.scroll(equip); }, F09),
            /* 56b delete asks first (US-35 AC-04): the FO dialog, destructive */
            "fb-56b": fb(async (h) => { await preview(h); await fillGrid(equip)(h); await h.click(`${equip} [data-fo-grid-act='delete']`); }, F09),
            /* 57 phone: the Preview › Mobil frame, rows as cards (US-39 AC-02) */
            "fb-57": fb(async (h) => {
              await preview(h);
              await h.click("[data-fb-preview-device='mobile']");
              await h.wait(2200);
              const frame = document.querySelector("[data-fb-device-frame]");
              const doc = frame.contentDocument;
              const cell = doc.querySelector("[data-fb-field='fld-equipment']");
              frame.contentWindow.GEAPFoRepeat.fill(cell);
              await h.wait(300);
              cell.scrollIntoView({ block: "start" });
            }, F09),
            /* 58 Activități CAEM inserted from the palette (a saved component, linked) · 58a its band +
               fields · 58b the FO: the first code fixes the section, the other sections are off (US-40 AC-03) */
            "fb-58": fb(async (h) => { await h.scroll("[data-fb-preset='preset-caem']"); await h.click("[data-fb-preset='preset-caem']"); await h.scroll("[data-builder-field][data-type='repeat']"); }),
            "fb-58a": fb(async (h) => { await h.click("[data-fb-preset='preset-caem']"); await h.click("[data-builder-prop-tab='data']"); await h.scroll("[data-builder-field][data-type='repeat']"); }),
            "fb-58b": fb(async (h) => {
              await preview(h);
              await pickCode(caem, "I 56.10")(h);
              await h.click(`${caem} [data-fo-repeat-add]`);
              await pickCode(caem, "I 56.30", 1)(h);
              await h.scroll(`${caem} [data-fo-repeat-item]:nth-child(2)`);
            }, F09),
            /* 59 Bloc repetabil config: fields (Date) · 59a rules (Validare: key + group = CAEM, min 1)
               · 59b the FO with 2 elements · 59c max reached · 59d remove → toast with „Anulează” */
            "fb-59": fb(async (h) => { await h.click("[data-builder-field][data-id='fld-caem']"); await h.click("[data-builder-prop-tab='data']"); }, F09),
            "fb-59a": fb(async (h) => { await h.click("[data-builder-field][data-id='fld-caem']"); await h.click("[data-builder-prop-tab='validation']"); }, F09),
            "fb-59b": fb(async (h) => { await preview(h); await fillGrid(caem)(h); await h.scroll(caem); }, F09),
            "fb-59c": fb(async (h) => {
              await vehicles(h);
              await preview(h);
              const block = `${PV} [data-fb-field='${window.GEAPFormBuilder.state.sel.id}']`;
              await h.click(`${block} [data-fo-repeat-add]`);
              await h.scroll(`${block} [data-fo-repeat-limit]`);
            }),
            "fb-59d": fb(async (h) => { await preview(h); await fillGrid(caem)(h); await h.click(`${caem} [data-fo-repeat-item]:nth-child(2) [data-fo-repeat-remove]`); await h.scroll(caem); }, F09),
            /* 60 Validare in the Preview on the CAEM block: a code without its subgenre, the minimum */
            "fb-60": fb(async (h) => { await preview(h); await pickCode(caem, "I 56.10")(h); await validate(h); await h.scroll(caem); }, F09),
            /* 61 a classifier source down (US-39 AC-03 / US-40 AC-06): message + Reîncearcă + Introdu manual
               · 61a loading skeleton */
            "fb-61": fb(async (h) => { await preview(h); await h.scroll(`${PV} [data-fb-field='fld-points']`); }, { ...F09, sursa: "indisponibila" }),
            "fb-61a": fb(async (h) => { await preview(h); await h.scroll(`${PV} [data-fb-field='fld-points']`); }, { ...F09, sursa: "asteptare" }),
            /* 62 Schema: grids / blocks with their rows table (US-33 AC-02/03) */
            "fb-62": fb(async (h) => { await h.click("[data-builder-mode='schema']"); await h.wait(300); const code = await h.find("[data-builder-schema-code]"); const at = code.textContent.indexOf('"storage"'); const pre = code.closest("pre") || code; pre.scrollTop = Math.max(0, (code.textContent.slice(0, at).split("\n").length - 6) * 20); }, F09),
            /* 63 validation summary: a grid without columns, a block without fields */
            "fb-63": fb(async (h) => { await h.click("[data-builder-component='grid']"); await h.click("[data-builder-component='repeat']"); await h.click("[data-fb-errors]"); })
          };
        })()
      };
    })(),

    /* ---- EVO Cabinet › Solicitările mele (US-19, US-158, US-161, US-29, US-24, US-135, US-159) ---- */
    "sm-01": sm(),
    /* the „Filtre” trigger = the library chip (filter-chip-v1): N values applied, bar closed → black chip + numbered
       badge (1 / 3 / 12, the badge width); phones: the pill after „Arată” */
    "sm-01v": sm(smPickMany(1)),
    "sm-01x": sm(smPickMany(3)),
    "sm-01y": sm(smPickMany(12)),
    /* the shared EVO header logged in (evo-header-v1): Servicii mega menu (desktop) / ☰ full-screen menu (phones) */
    "sm-hdr-01": sm(async (h) => { await evoMenu(h); }),
    /* phones: the ☰ menu's „Pentru afacerea ta” expanded; desktop: Servicii › Pentru afacerea ta */
    "sm-hdr-02": sm(async (h) => {
      await evoMenu(h);
      if (evoPhone()) await h.click('.evo-header__panel [data-evo-panel-group][aria-controls$="-pj"]');
      else await h.click('.evo-header__mega [data-evo-mega-tab="pj"]');
    }),
    /* a visitor without a session (?auth=0): the Anonymous variant on the public catalog */
    "sm-hdr-03": { page: CAB, params: { view: "catalog", auth: "0" }, ready: "[data-evo-mounted]" },
    "sm-01s": sm(async (h) => { await h.click("[data-fo-avatar-trigger]"); await h.find("[data-fo-avatar-dropdown]:not([hidden])"); }),
    "sm-01a": sm(smPick("status", ["Spre achitare", "Informații suplimentare"])),
    "sm-01b": sm(smPick("status", ["Schiță"])),
    /* outcome-tag-v1: the Statut facet lists the outcomes a finalized request shows (Aprobat / Respins), not „Finalizat” */
    "sm-01c": sm(smPick("status", ["Aprobat", "Respins"])),
    "sm-01d": sm(async (h) => { await h.fill("[data-sm-search]", "04466", { leave: false }); }),
    "sm-01e": sm(async (h) => { await h.fill("[data-sm-search]", "autorizatie stupefiante xyz", { leave: false }); }),
    /* sort = the „Sortează” menu on desktop and phones (2026-10-20, the table headers are gone): 01f the menu open
       (key group + direction group), 01m sorted by Serviciul solicitat Z–A (key, then direction; trigger + announcement) */
    "sm-01f": sm(async (h) => { await h.click(".cab-sort__trigger"); }),
    /* „Sortează” → Serviciul solicitat, Z → A (desktop: two menu picks; phones: the sort sheet → „Aplică”) */
    "sm-01m": sm(async (h) => { if (cabPhone()) { await smSortSheet("service", "desc")(h); await h.click("[data-sort-sheet-apply]"); await h.wait(400); return; } await h.click(".cab-sort__trigger"); await h.click('[data-sm-sort-key="service"]'); await h.wait(300); await h.click(".cab-sort__trigger"); await h.click('[data-sm-sort-dir="desc"]'); await h.wait(300); }),
    /* the open sort with a text key: the order reads A → Z / Z → A (phones: the sheet's draft before „Aplică”; desktop: the menu after the key pick) */
    "sm-01t": sm(async (h) => { if (cabPhone()) { await smSortSheet("service")(h); return; } await h.click(".cab-sort__trigger"); await h.click('[data-sm-sort-key="service"]'); await h.wait(300); await h.click(".cab-sort__trigger"); }),
    /* the facet bar open (desktop) / the Statut sheet (phones) */
    "sm-01n": sm(async (h) => { if (!smPhone()) await h.click("[data-sm-filter-toggle]"); await ffFacet(h, "status"); }),
    /* facet-popover-v2: „Autoritatea emitentă” — the popover hugs the authority names, search on top (always) */
    "sm-01aa": sm(async (h) => { if (!smPhone()) await h.click("[data-sm-filter-toggle]"); await ffFacet(h, "autoritate"); await h.wait(200); }),
    /* US-158 AC-06 / 07 / 11 — the dates are date range facets of „Filtre” (2026-10-20; the „Perioadă” dialog is gone):
       01g the Data depunerii popover (phones: its sheet) · 01h „Până la” before „De la” → error · 01o a custom range
       applied (chip „Data depunerii: 1–10 oct. 2026” + ×) · 01p the custom range being picked (phones: the sheet)
       · 01q a preset on Data estimată de finalizare („Următoarele 30 de zile”) */
    "sm-01g": sm(smDateFacet("depunere", { stay: true })),
    "sm-01h": sm(smDateFacet("depunere", { from: "2026-10-01", to: "2026-09-01" })),
    "sm-01o": sm(smDateFacet("depunere", { from: "2026-10-01", to: "2026-10-10" })),
    "sm-01p": sm(smDateFacet("depunere", { from: "2026-10-01", to: "2026-10-10", stay: true })),
    "sm-01q": sm(smDateFacet("finalizare", { preset: "u30z" })),
    "sm-01i": sm(smPick("autoritate", ["AMDM*"])),
    "sm-01j": sm(async (h) => { await h.click('[data-sm-page="2"]'); }),
    "sm-01k": sm(async (h) => { await smFind(h, "d-gara"); await h.hover("[data-tooltip-hint]"); }),
    /* type-first-v1: a request WITHOUT an object (transport licence) — title only, no line 2 */
    "sm-01z": sm(async (h) => { await h.fill("[data-sm-search]", "transport", { leave: false }); }),
    "sm-01l": sm(async (h) => { await h.scroll(".cab-pager"); await h.click(".cab-pager__size"); }),
    /* the Izvoraș request's ⋮ open (user 2026-10-20, ref Telegram iOS; row-kebab-v1 „back to 3 dots”): the
       anchored dropdown on every width — phones with the touch item size (components.md „Row action menu on
       phones”); sm-01w = the trigger at the bottom of the screen → the menu opens upwards. (sm-01v, the ⋮ vs
       „Acțiuni ⌄” comparison, was removed with the labelled trigger.) */
    "sm-01u": sm(smMenu("d-izvoras")),
    "sm-01w": sm(async (h) => { await smFind(h, "d-izvoras"); const t = document.querySelector('[data-sm-card="d-izvoras"] [data-cab-menu-trigger]'); t.scrollIntoView({ block: "end" }); window.scrollBy(0, 16); await h.wait(150); t.click(); await h.wait(150); }),
    "sm-02": sm(smMenu("d-spicul")),
    "sm-02a": sm(smMenu("d-fresh")),
    "sm-02b": sm(smMenu("d-sud")),
    "sm-02c": sm(smMenu("d-nistru")),
    "sm-02d": sm(async (h) => { await smPick("status", ["Aprobat"])(h); await smMenu("d-izvoras")(h); }),
    "sm-02e": sm(smMenu("d-nota")),
    "sm-03": smDosar("d-spicul"),
    /* a click on the DRAFT row opens its details (never the FO form — user 2026-10-20); „Continuă schița” stays in ⋮
       and on the details page */
    "sm-03i": sm(async (h) => { await smFind(h, "d-spicul"); await h.click('[data-sm-card="d-spicul"] .e-permits-fo-lib-item__title'); await h.wait(300); }),
    "sm-03a": smDosar("d-spicul", async (h) => { await smHeadAct(h, "delete"); }),
    /* profile-phone-v1: the draft's header on phones — „Continuă schița” (fills the row) + „⋯” open with „Elimină
       schița” (red, priority+) at 320; at 375 and on desktop both buttons fit (Medium 40, profile-header-phone-medium-v1),
       nothing to open */
    "sm-03p": smDosar("d-spicul", async (h) => {
      await h.wait(400);
      if ([...document.querySelectorAll("[data-sm-profile] .cab-act-header__overflow [data-cab-menu-trigger]")].some((el) => el.getClientRects().length)) await h.click("[data-sm-profile] .cab-act-header__overflow [data-cab-menu-trigger]");
    }),
    "sm-03b": sm(async (h) => { await h.click('[data-sm-card="d-spicul"] [data-cab-menu-trigger]'); await actMenuPick('[data-sm-card="d-spicul"] [data-sm-action="delete"]')(h); await h.click("[data-sm-confirm-ok]"); }),
    "sm-03c": smDosar("d-izvoras-reperf"),
    /* status-matrix gaps (2026-10-20, tools/persona-test/specs/cabinet-requests/STATUS-MATRIX.md):
       03d a draft removed automatically (the deep link from its notification → the list says why) · 03e „Continuă
       schița” does not open → message + „Reîncercați” (US-29 AC-01) · 03f the first „Elimină schița” fails → the
       message + „Reîncercați” in the dialog · 03g a draft with its payment note „În așteptare” (US-17, Taxe) · 03h a
       signed + paid draft waiting for the automatic submission (US-18 AC-09) */
    "sm-03d": sm(null, {}, "#dosar/d-cuptor"),
    "sm-03e": smDosar("d-spicul", async (h) => { await h.click('[data-sm-profile] [data-cab-profile-header] [data-sm-action="continue"]'); }, { redirectionare: "eroare" }),
    "sm-03f": smDosar("d-spicul", async (h) => { await smHeadAct(h, "delete"); await h.click("[data-sm-confirm-ok]"); }, { eliminare: "eroare" }),
    "sm-03g": smDosar("d-aroma", async (h) => { await h.click('[data-sm-tab="taxe"]'); }),
    "sm-03h": smDosar("d-gustul"),
    "sm-04": smDosar("d-fresh"),
    "sm-04a": smDosar("d-gara"),
    "sm-04b": smDosar("d-nistru"),
    "sm-04c": smDosar("d-sud"),
    "sm-04d": smDosar("d-sud", async (h) => { await h.click('[data-sm-profile] [data-sm-action="pay"]'); }),
    "sm-04e": sm(null, { achitat: "d-sud" }),
    "sm-04f": sm(null, { plata: "anulata" }),
    /* US-135 AC-14: the payment note expired (demo ?nota=expirata) — the message, no pay button (status unchanged) */
    "sm-04g": smDosar("d-sud", null, { nota: "expirata" }),
    "sm-04g1": sm(async (h) => { await h.scroll('[data-sm-card="d-sud"]'); }, { nota: "expirata" }),
    /* US-24 AC-04: the redirect to the suplinire form fails (demo ?redirectionare=eroare) → profile: the non-auto-closing error toast + „Reîncercați” (sm-04h-error-toast-v1); row: the inline notice */
    "sm-04h": smDosar("d-nistru", async (h) => { await h.click('[data-sm-profile] [data-sm-alert] [data-sm-action="supplement"]'); }, { redirectionare: "eroare" }),
    "sm-04h1": sm(async (h) => { await h.scroll('[data-sm-card="d-nistru"]'); await h.click('[data-sm-card="d-nistru"] .e-permits-fo-intent-act__pending [data-sm-action="supplement"]'); }, { redirectionare: "eroare" }),
    /* 04i the suplinire term passed → back „În derulare” (US-24 AC-03) · 04j suplinire sent → examination resumed
       (US-24 AC-20) · 04k a Prelungire in examination · 04l paper delivery by MDelivery (US-161 AC-16, Livrare) */
    "sm-04i": smDosar("d-prut-exp"),
    "sm-04j": smDosar("d-livada"),
    "sm-04k": smDosar("d-lab-prelungire"),
    "sm-04l": smDosar("d-fresh", async (h) => { await h.click('[data-sm-tab="solicitare"]'); await h.scroll("#sm-sec-livrare"); }),
    "sm-05": smDosar("d-izvoras"),
    /* cabinet-skeleton-v1: Solicitările mele loading, frozen — sm-01-loading the list (first load), sm-05-loading a
       request opened by its address (header, trajectory, sections) */
    "sm-01-loading": { ...sm(null, { latency: "freeze" }), ready: "[data-cab-skeleton] .cab-skeleton-row" },
    "sm-05-loading": { ...smDosar("d-izvoras", null, { latency: "freeze" }), ready: "[data-cab-profile-skeleton]" },
    /* type-first-v1: the profile of a request WITHOUT an object — H1 = the service, no subtitle */
    "sm-05v": smDosar("d-transport"),
    "sm-05a": smDosar("d-nota"),
    "sm-05b": smDosar("d-cantina-retragere"),
    "sm-05c": smDosar("d-izvoras", async (h) => { await smHeadAct(h, "download"); }, { descarcare: "eroare" }),
    /* 2026-10-14 · Documente însoțitoare = the shared document cards: the card → document modal (its footer has
       „Descarcă”; no ⋮ since 2026-10-20, no „Detalii” since no-lone-detalii-v1 — sm-05g = the card click, sm-05f /
       sm-05h = the keyboard: the focused card + Enter / Space) */
    /* US-161 tabs (2026-10-17): documents live in „Date solicitare” */
    "sm-05e": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="solicitare"]'); await h.scroll(".cab-docs"); }),
    "sm-05f": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="solicitare"]'); await h.scroll(".cab-docs"); const card = document.querySelector(".cab-doc[data-cab-doc]"); card.focus(); card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); }),
    "sm-05g": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="solicitare"]'); await h.scroll(".cab-docs"); await h.click(".cab-doc:nth-child(2)"); }),
    "sm-05h": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="solicitare"]'); await h.scroll(".cab-docs"); const card = document.querySelector(".cab-doc:nth-child(2)"); card.focus(); card.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })); }),
    /* US-161 tabs: Date solicitare (applicant, request data, documents, delivery, the initial fee — AC-15),
       Taxe (AC-18…20), Act (+ the service-specific fields, AC-29), Decizie (AC-31…34) */
    "sm-05j": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="solicitare"]'); }),
    "sm-05k": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="taxe"]'); }),
    "sm-05l": smDosar("d-izvoras", async (h) => { await h.click('[data-sm-tab="act"]'); }),
    "sm-05m": smDosar("d-nota", async (h) => { await h.click('[data-sm-tab="act"]'); }),
    /* Act / Decizie with the act's configured fields (2026-10-19): the shared GEAPActView.fieldsHtml sections + table */
    "sm-05n": smDosar("d-depozit-reperf", async (h) => { await h.click('[data-sm-tab="act"]'); await h.scroll(".e-permits-act-fields__table-field"); }),
    /* 05o a refused request inside its appeal window: the row's countdown + „Depune contestație →” (the official
       matrix) · 05p Emitere duplicat (Act) · 05q Suspendarea valabilității (Decizie) · 05r Reluarea valabilității
       (Decizie) · 05s filed by a representative whose MPower has expired since (US-161 AC-11, US-19 AC-17) */
    "sm-05o": sm(async (h) => { await smFind(h, "d-nota"); }),
    /* outcome-tag-v1: a finalized request approved tacitly (US-157) = ONE blue „Aprobat tacit” tag (demo ?tacit-dosar=) */
    "sm-05t": sm(async (h) => { await smFind(h, "d-bistro"); }, { "tacit-dosar": "d-bistro" }),
    "sm-05u": smDosar("d-bistro", null, { "tacit-dosar": "d-bistro" }),
    /* cabinet-header-v1: a VERY long service name (221 characters) in the BO header and in the list row */
    "sm-05w": smDosar("d-izvoras", null, { "titlu-lung": "d-izvoras" }),
    /* act-profile-url-v1: a request address (?view=solicitari#dosar/<id>) that matches no request = the not-found state
       (breadcrumb back to „Solicitările mele” + the library empty state) */
    "sm-05y": { ...smDosar("d-nu-exista"), ready: "[data-sm-profile-view]:not([hidden]) .e-permits-empty" },
    /* header-actions-below-v1: the same long name on a phone (≤760) with the 4-line H1 expanded („Mai puțin ⌃”); desktop
       shows the full name and no toggle, so nothing to click there */
    "sm-05x": smDosar("d-izvoras", async (h) => { await h.wait(300); if (document.querySelector("#sm-profile-title [data-name-expand-toggle]")) await h.click("#sm-profile-title [data-name-expand-toggle]"); }, { "titlu-lung": "d-izvoras" }),
    "sm-01r": sm(async (h) => { await smFind(h, "d-izvoras"); }, { "titlu-lung": "d-izvoras" }),
    "sm-05p": smDosar("d-izvoras-dup", async (h) => { await h.click('[data-sm-tab="act"]'); }),
    "sm-05q": smDosar("d-piata-susp", async (h) => { await h.click('[data-sm-tab="act"]'); }),
    "sm-05r": smDosar("d-dulce-reluare", async (h) => { await h.click('[data-sm-tab="act"]'); }),
    "sm-05s": smDosar("d-depozit-reperf", async (h) => { await h.click('[data-sm-tab="solicitare"]'); }),
    "sm-05d": { page: CAB, params: { view: "acte", act: "act-izvoras" }, ready: "[data-cab-detail] h1", run: null },
    /* Actele mele: nothing matches the search → the shared empty state + „Resetează filtrele” */
    "sm-05i": { page: CAB, params: { view: "acte" }, ready: "[data-cab-list] > *", run: async (h) => { await h.fill("[data-cab-search]", "zzz", { leave: false }); } },
    "sm-06": sm(null, { eroare: "lista" }),
    "sm-06a": sm(async (h) => { await h.fill("[data-sm-search]", "Bălți", { leave: false }); }, { eroare: "cautare" }),
    /* Notificări (minimal EVO compartment): the GEAP events with their action; an expired fee (?nota=expirata) →
       „Taxa a expirat…” on „Achitare” (US-135 AC-14); MPower expired → only the older ones, no actions */
    "nt-01": { page: CAB, params: { view: "notificari" }, ready: ".nt-item, .cab-state", run: null },
    "nt-01a": { page: CAB, params: { view: "notificari", nota: "expirata" }, ready: ".nt-item", run: async (h) => { await h.click("[data-nt-pay]"); } },
    "nt-01b": { page: CAB, params: { view: "notificari", as: "mpower-pj-lumina" }, ready: ".nt-item, .cab-state", run: null },
    "nt-01c": sm(null, { achita: "d-sud" }),
    /* 01d draft removed automatically (US-29 AC-02) · 01e suplinire sent (US-24 AC-19) · 01f suplinire term expired
       (US-24 AC-03, Feature 95770) · 01g the suspension notice with the reason + „Neconformități depistate” (US-126 AC-16) */
    "nt-01d": ntAt("draft-removed"),
    "nt-01e": ntAt("supplement-done"),
    "nt-01f": ntAt("supplement-expired"),
    "nt-01g": ntAt("info-requested"),
    "sm-07": sm(null, { as: "pj-vita-plant" }),
    "sm-07a": smDosar("d-vita-reperf", null, { as: "pj-vita-plant" }),
    "sm-07b": sm(null, { as: "mpower-pj-lumina" }),
    "sm-07c": sm(null, { as: "pj-vita-plant", eroare: "mpower" }),
    "sm-08": sm(null, { depus: "GEAP-2026-009-04521", obiect: "Cafeneaua „Luminița”, mun. Chișinău" }),
    "sm-08a": sm(null, { schita: "1", pas: "3", obiect: "Cafeneaua „Luminița”, mun. Chișinău" }),
    "sm-08b": sm(null, { depus: "GEAP-2026-009-04521", pp: "reperfectare", act: "act-izvoras", obiect: "Cafeneaua „Izvoraș”, mun. Bălți", subdiviziune: "CSP Bălți" }),

    /* ---- EVO catalog (US-10): list, search, service 09, „Solicită online” per session ---- */
    "cat-01": cat(),
    "cat-01a": cat(async (h) => { await h.fill("[data-cat-search]", "sanitar", { leave: false }); }),
    "cat-01b": cat(async (h) => { await h.click('[data-cat-chip="comert"]'); }),
    "cat-01c": cat(async (h) => { await h.fill("[data-cat-search]", "pașaport", { leave: false }); }),
    "cat-02": cat(null, {}, "#serviciu/09"),
    "cat-02a": cat(null, { auth: "0" }, "#serviciu/09"),
    "cat-02b": cat(null, { as: "mpower-pj-nord-agro" }, "#serviciu/09"),
    "cat-02c": cat(null, {}, "#serviciu/23"),
    "cat-02d": cat(null, { auth: "0" }),
    /* where „Solicită online” lands: MPass (no session), S3 instance, „Ce vrei să soliciți?” */
    "cat-03": { page: PP_FO, flow: "full", ready: "[data-fo-screen='auth']:not([hidden]) h1" },
    "cat-03a": { page: PP_FO, flow: "full", hash: "#choice-authenticated", ready: "[data-fo-screen='choice']:not([hidden]) h1", delay: 1900 },
    /* Registrul actelor permisive (public RAP list): „Filtru” = the BO advanced filter
       (js/facet-filter.js) — bar of facet chips, checklist popover, applied chips, empty result */
    ...(() => {
      const RAP = "rap-evo/index.html";
      const rap = (run) => ({ page: RAP, ready: "tr[data-record-id]", run });
      /* phones (≤760, facet filter phone mode): no toolbar button, a chip opens its bottom sheet and
         „Arată N rezultate” applies it — no „Confirmă” / „Aplică filtrele” */
      const phone = () => window.matchMedia("(max-width: 760px)").matches;
      const pick = (facet, values) => async (h) => {
        await ffFacet(h, facet);
        for (const value of values) await h.click(`[data-filter-option][value="${value}"]`);
        await h.click(phone() ? "[data-sheet-apply]" : "[data-filter-confirm]");
        if (phone()) await h.wait(400);
      };
      const open = async (h) => { if (!phone()) await h.click("[data-rap-filter-toggle]"); };
      const commit = async (h) => { if (!phone()) await h.click("[data-filter-commit]"); };
      return {
        "rap-01": rap(null),
        "rap-01a": rap(open),
        "rap-01b": rap(async (h) => { await open(h); await ffFacet(h, "status"); await h.click('[data-filter-option][value="Valabil"]'); }),
        "rap-01c": rap(async (h) => {
          await open(h); await pick("status", ["Valabil"])(h); await pick("denumire", ["Notificare unitate comercială"])(h);
          await pick("beneficiar", ["Persoană juridică"])(h); await commit(h);
        }),
        /* facet-popover-v2 (2026-10-22): the long-name facets — the popover hugs its longest value (270 … 440), the library
           search on top (always for Denumire act / Autoritate), diacritics-insensitive, box → value 12. 01r Denumire act open
           (focus in the search) · 01s „licenta” finds both „Licență” spellings (ț / ţ) · 01t Autoritate „agentia” (→ Agenția)
           with one value ticked · 01u nothing matches → „Niciun rezultat”. Phones: the same in the all-filters sheet section */
        "rap-01r": rap(async (h) => { await open(h); await ffFacet(h, "denumire"); await h.wait(200); }),
        "rap-01s": rap(async (h) => { await open(h); await ffFacet(h, "denumire"); await h.fill("[data-filter-search]", "licenta", { leave: false }); await h.wait(600); }),
        "rap-01t": rap(async (h) => {
          await open(h); await ffFacet(h, "autoritate");
          await h.click('[data-filter-option][value="Agenția Servicii Publice"]');
          await h.fill("[data-filter-search]", "agentia", { leave: false }); await h.wait(600);
        }),
        "rap-01u": rap(async (h) => { await open(h); await ffFacet(h, "autoritate"); await h.fill("[data-filter-search]", "zzz", { leave: false }); await h.wait(600); }),
        /* search results („alcool”) — Figma EVO-WEB block rap-01q */
        "rap-01q": rap(async (h) => { await h.fill("[data-rap-search]", "alcool"); await h.wait(500); }),
        "rap-01g": rap(async (h) => { await h.click('[data-record-id="rap-0002"] a'); await h.wait(300); await h.click("[data-rap-company-permits]"); await h.wait(300); }),
        /* company view („Vezi toate (N)”): the company card + the act counts in a separate grey card */
        "rap-01d": rap(async (h) => {
          /* phones: the sheet lists only values that still have rows (no dead ends), so the empty
             result comes from one filter + a search that matches nothing */
          if (phone()) { await pick("beneficiar", ["Persoană fizică"])(h); await h.fill("[data-rap-search]", "zzzz", { leave: false }); await h.wait(600); return; }
          await open(h); await pick("status", ["Suspendat"])(h); await pick("beneficiar", ["Persoană fizică"])(h); await commit(h);
        }),
        /* phones (≤760): the facet filter's phone mode — ONE „Filtre” pill (2026-10-20, no facet chips) →
           the all-filters sheet; 04a / 04b open it on Statut / Autoritate (search when > 7 values), 04c
           the sheet as it opens, 04d applied (count on the pill + „N rezultate · Șterge filtrele”). On desktop the same ids run the BO bar /
           popover path (desktop unchanged) */
        ...(() => {
          const sheetReady = async (h) => { await h.find('.e-permits-filter-sheet[aria-hidden="false"] .bottom-sheet__panel'); await h.wait(400); };
          const chipSheet = (facet, run) => async (h) => {
            if (!phone()) await open(h);
            await ffFacet(h, facet);
            if (run) await run(h);
          };
          return {
            "rap-04": rap(null),
            "rap-04a": rap(chipSheet("status", async (h) => { await h.click('[data-filter-option][value="Valabil"]'); })),
            "rap-04b": rap(chipSheet("autoritate", async (h) => { await h.fill("[data-filter-search]", "agen", { leave: false }); await h.wait(700); })),
            "rap-04c": rap(async (h) => {
              if (!phone()) { await open(h); return; }
              await h.click("[data-filter-all]"); await sheetReady(h);
              await h.click('[data-filter-option][data-sheet-facet="status"][value="Valabil"]');
            }),
            "rap-04d": rap(async (h) => {
              await open(h); await pick("status", ["Valabil", "Suspendat"])(h); await pick("beneficiar", ["Persoană juridică"])(h); await commit(h);
            }),
          };
        })(),
        /* a very long act name (Figma comment A. 1968942771): one line + ellipsis, the full name in the
           shared tooltip on hover · a tacitly approved act: only the blue „Aprobare tacită” badge in Statut */
        "rap-01e": rap(async (h) => { await h.scroll('tr[data-record-id="rap-0015"]'); await h.hover('tr[data-record-id="rap-0015"] .rap-act-link'); await h.wait(300); }),
        "rap-01f": rap(async (h) => { await h.hover('tr[data-record-id="rap-0001"] .status-tag--brand'); }),
        /* US-141: „Aprobat tacit” as a value of the Statut facet (acts with Aprobare tacită = true) */
        "rap-01h": rap(async (h) => {
          if (window.matchMedia("(max-width: 760px)").matches) {
            /* phones: „Filtre” → the all-filters sheet, Statut open (facet filter phone mode) */
            await ffFacet(h, "status");
            await h.click('[data-filter-option][value="Aprobat tacit"]'); await h.click("[data-sheet-apply]"); await h.wait(400);
            return;
          }
          await open(h); await pick("status", ["Aprobat tacit"])(h); await h.click("[data-filter-commit]");
        }),
        /* the shared EVO header (evo-header-v1, Figma Components 912:18991 / 1210:5257): menus open. Desktop: Servicii ⌄
           (≤1100 „Meniu ⌄”) mega menu; phones: ☰ → the full-screen menu (State=Active) */
        "rap-01m": rap(async (h) => { await evoMenu(h); }),
        /* desktop: the „Pentru afacerea ta” tab; phones: „Pentru tine” expanded */
        "rap-01n": rap(async (h) => {
          await evoMenu(h);
          if (evoPhone()) await h.click('.evo-header__panel [data-evo-panel-group]');
          else await h.click('.evo-header__mega [data-evo-mega-tab="pj"]');
        }),
        /* desktop: „Evenimente de viață” (Disabled) hovered → „În curând”; phones: the language menu of the open ☰ */
        "rap-01o": rap(async (h) => {
          if (evoPhone()) { await evoMenu(h); await h.click(".evo-header__panel [data-evo-lang-trigger]"); return; }
          if (window.matchMedia("(max-width: 1100px)").matches) { await evoMenu(h); return; }
          await h.focus(".evo-header__soon .evo-header__nav-item"); await h.wait(200);
        }),
        /* act profile (?act=): BO page header, sections over grey cards, Small status tags */
        "rap-02": { page: RAP, params: { act: "rap-0002" }, ready: "[data-rap-profile-view]:not([hidden]) h1" },
        "rap-02a": { page: RAP, params: { act: "rap-0001" }, ready: "[data-rap-profile-view]:not([hidden]) h1" },
        /* US-162 AC-17: Suspendat — header „Suspendat până la”, details „Data suspendării actului
           permisiv” + „Suspendat până la data de” (rap-02b); Retras — „Retras la” + „Data retragerii
           actului permisiv” (rap-02h) */
        "rap-02b": { page: RAP, params: { act: "rap-0003" }, ready: "[data-rap-profile-view]:not([hidden]) h1" },
        "rap-02h": { page: RAP, params: { act: "rap-0005" }, ready: "[data-rap-profile-view]:not([hidden]) h1" },
        /* US-142 AC-16: unknown act (act-profile-url-v1: the breadcrumb back to the registry + the library empty state
           „Actul permisiv nu a fost găsit”; every profile is ?act=<record id>) */
        "rap-02c": { page: RAP, params: { act: "rap-9999" }, ready: "[data-rap-profile-view]:not([hidden]) .e-permits-empty" },
        /* the long ozone-substances act (title wraps); tacit approval: tag next to Stare + the
           „Aprobare tacită” row above „Data eliberării” */
        "rap-02d": { page: RAP, params: { act: "rap-0015" }, ready: "[data-rap-profile-view]:not([hidden]) h1" },
        /* name-expand-align-v1: the same long name on a phone (≤760) with the 4-line H1 expanded — „Mai puțin ⌃” on its own
           line under the full name, where „Mai mult ⌄” was (rap-02d = collapsed); desktop shows the full name, no toggle */
        "rap-02x": { page: RAP, params: { act: "rap-0015" }, ready: "[data-rap-profile-view]:not([hidden]) h1", run: async (h) => { await h.wait(300); if (document.querySelector("[data-rap-profile-view] h1 [data-name-expand-toggle]")) await h.click("[data-rap-profile-view] h1 [data-name-expand-toggle]"); } },
        "rap-02g": { page: RAP, params: { act: "rap-0001" }, ready: "[data-rap-profile-view]:not([hidden]) h1", run: async (h) => { await h.scroll("#rap-details-title"); } },
        /* „Vizualizare act” (US-162 AC-12, Figma 20607:34846): the data modal — Date generale +
           Câmpuri specifice actului + note; Descarcă → the MDocs A4 form (US-143): loading,
           Suspendat watermark, MDocs down (AC-10), RAP API down (AC-11), PF anonymised, Retras */
        ...(() => {
          const data = (act, run) => ({
            page: RAP, params: { act }, ready: "[data-rap-profile-view]:not([hidden]) h1",
            run: async (h) => { await h.click("[data-rap-view-document]"); await h.find("[data-rap-act-data].is-active .e-permits-dosar-profil__card"); await h.wait(250); if (run) await run(h); }
          });
          const view = (act, params = {}, wait = ".rap-act-doc", then = null) => ({
            page: RAP, params: { act, ...params }, ready: "[data-rap-profile-view]:not([hidden]) h1",
            run: async (h) => {
              await h.click("[data-rap-view-document]"); await h.find("[data-rap-act-data].is-active [data-rap-data-download]"); await h.wait(250);
              await h.click("[data-rap-act-data].is-active [data-rap-data-download]"); await h.find(`[data-rap-act-modal]:not([hidden]) ${wait}`); await h.wait(300);
              if (then) await then(h);
            }
          });
          return {
            "rap-03": data("rap-0002"),
            "rap-03a": view("rap-0002", { mdocs: "incarcare" }, ".spinner"),
            "rap-03b": view("rap-0003"),
            "rap-03c": view("rap-0002", { mdocs: "indisponibil" }, ".e-permits-empty"),
            "rap-03d": view("rap-0002", { mdocs: "date" }, ".e-permits-empty"),
            "rap-03e": view("rap-0001"),
            "rap-03f": view("rap-0005"),
            /* long act name: clamped + „Mai mult” (collapsed) / the whole name (expanded) */
            "rap-03g": data("rap-0015"),
            "rap-03h": data("rap-0015", async (h) => { await h.click("[data-rap-act-data] [data-rap-clamp-toggle]"); }),
            /* 30 service-configured fields in 3 form sections (2026-10-19: one BO section per group): the first
               group has 12 → first 8 + „Arată toate câmpurile (12)” / all */
            "rap-03i": data("rap-0016", async (h) => { await h.scroll("[data-rap-act-data] [data-act-fields-more]"); }),
            "rap-03j": data("rap-0016", async (h) => { await h.click("[data-rap-act-data] [data-act-fields-more]"); await h.scroll("[data-rap-act-data] .e-permits-dosar-profil__section-title", "Genul de activitate"); }),
            /* their A4 form: 2 pages */
            "rap-03k": view("rap-0016"),
            "rap-03l": view("rap-0002"),
            /* tacit approval + PF beneficiary in the data modal */
            "rap-03m": data("rap-0001"),
            /* US-162 AC-17 in the data modal: Suspendat (suspension dates) / Retras (withdrawal date) */
            "rap-03n": data("rap-0003"),
            "rap-03o": data("rap-0005"),
            /* configured act fields — groups + tables (2026-10-19, Figma comment 20607:34846), the ozone act:
               3 groups (Date despre operațiune · Destinatar / furnizor · Substanțe și echipamente), a list value,
               „Substanțe autorizate” 12 rows (first 5 + „Arată toate (12)”), „Echipamente” 3 rows */
            "rap-03q": data("rap-0015", async (h) => { await h.scroll("[data-rap-act-data] .e-permits-act-fields__table-field"); }),
            "rap-03r": data("rap-0015", async (h) => { await h.click("[data-rap-act-data] .e-permits-act-fields__table-field [data-act-fields-more]"); await h.scroll("[data-rap-act-data] .e-permits-act-fields__table-field"); }),
            /* its A4 form: the groups, both tables with every row, the header row repeated on the next page */
            "rap-03s": view("rap-0015"),
            "rap-03t": view("rap-0015", {}, ".rap-act-doc", async (h) => { await h.scroll("[data-rap-act-modal] .e-permits-doc-page__grid-head.is-repeat"); }),
            /* the A4 viewer's long name expanded: „Mai puțin” at the end of the text, never next to × (modal-name-expand-end-v1) */
            "rap-03u": view("rap-0015", {}, ".rap-act-doc", async (h) => { await h.click("[data-rap-act-modal] [data-rap-clamp-toggle]"); })
          };
        })()
      };
    })(),
    "cat-03b": ppIntent(),
    /* EVO → service hand-over (user rule 2026-10-13): signed in to EVO, „Solicită online” carries
       the cabinet instance (?as → ?solicitant) — no instance choice, the request opens as it */
    "cat-02e": cat(null, { as: "mpower-pf-vrabie" }, "#serviciu/09"),
    "cat-02f": cat(null, { as: "pf-anastasia" }, "#serviciu/09"),
    "cat-04": foReq(1, { solicitant: "mpower-pf-vrabie" }, async (h) => { await h.find("[data-fo-step-panel='1'] .e-permits-fo-form__roles", "Vrabie Gheorghe"); }),
    "cat-04a": foReq(1, { solicitant: "mpower-pj-nord-agro" }, async (h) => { await h.find("[data-fo-step-panel='1'] .e-permits-fo-form__roles", "Nord Agro Market"); }),
    "cat-04b": { ...ppIntent(async (h) => { await h.find("[data-fo-screen='intent']:not([hidden])", "Cojocaru"); }), params: { solicitant: "pf-anastasia" } },

    "pp-10": ppFo("reperfectare", "act-izvoras", 1),
    "pp-10a": ppFo("reperfectare", "act-izvoras", 2),
    "pp-10b": ppFo("reperfectare", "act-izvoras", 2, async (h) => { await ppReason("Alte")(h); await h.click("[data-fo-step-panel='2'] [data-fo-next]"); }),
    "pp-10c": ppFo("reperfectare", "act-izvoras", 3),
    /* 2026-10-20: the previous act card has „👁 Detalii” (no download on the card) → the FO document viewer
       (#fo-certificate-modal) with „Descarcă” */
    "pp-10c1": ppFo("reperfectare", "act-izvoras", 3, async (h) => { await h.click("[data-fo-pp-prev-act-open]"); await h.wait(400); }),
    "pp-10d": ppFo("reperfectare", "act-izvoras", 4),
    "pp-10e": ppFo("reperfectare", "act-izvoras", 5),
    "pp-10f": ppFo("reperfectare", "act-izvoras", 7),
    "pp-10g": ppFo("reperfectare", "act-salon-pf", 1),
    "pp-11": ppFo("reperfectare", "act-depozit-10", 2),
    "pp-12": ppFo("prelungire", "act-depozit-10", 2),
    "pp-12a": ppFo("prelungire", "act-depozit-10", 7),
    "pp-13": ppFo("duplicat", "act-depozit-10", 2, ppReason("Pierdere")),
    "pp-13a": ppFo("duplicat", "act-depozit-10", 2, async (h) => { await h.click("[data-fo-step-panel='2'] [data-fo-next]"); }),
    "pp-13b": ppFo("duplicat", "act-depozit-10", 3),
    "pp-14": ppFo("retragere", "act-izvoras", 2, ppReason("Alte")),
    "pp-14a": ppFo("retragere", "act-piata-mare", 1),
    "pp-14b": ppFo("retragere", "act-izvoras", 7),
    "pp-15": ppFo("suspendare", "act-licenta-demo", 2),
    "pp-15a": ppFo("suspendare", "act-licenta-demo", 2, async (h) => { await h.click("[data-fo-step-panel='2'] [data-fo-next]"); }),
    "pp-16": ppFo("reluare", "act-licenta-susp", 2),
    "pp-16a": ppFo("reluare", "act-licenta-susp", 7),
    /* US-55 AC-09/10: Anulare (DEMO service) — Detalii solicitare (reason) and the finish screen */
    "pp-17": ppFo("anulare", "act-licenta-susp", 2),
    "pp-17a": ppFo("anulare", "act-licenta-demo", 7),
    /* long name in the header — expand on click (2026-10-19, js/name-expand.js): the 144-character
       service name of act-depozit-10 is one line + „Mai mult” (pp-18), expanded in place with
       „Mai puțin” (pp-18a), expanded and scrolled — the sticky phone progress stays under the
       grown header (pp-18b); a short name has no affordance (pp-18c) */
    "pp-18": ppFo("reperfectare", "act-depozit-10", 2, async (h) => { await h.find(".e-permits-fo-auth__service-title-row [data-name-expand-toggle]"); }),
    "pp-18a": ppFo("reperfectare", "act-depozit-10", 2, async (h) => { await h.find(".e-permits-fo-auth__service-title-row [data-name-expand-toggle]"); await h.wait(600); await h.click(".e-permits-fo-auth__service-title-row [data-name-expand-toggle]"); await h.find(".e-permits-fo-auth__service-title-row [data-name-expand-toggle][aria-expanded='true']"); }),
    "pp-18b": ppFo("reperfectare", "act-depozit-10", 2, async (h) => { await h.find(".e-permits-fo-auth__service-title-row [data-name-expand-toggle]"); await h.wait(600); await h.click(".e-permits-fo-auth__service-title-row [data-name-expand-toggle]"); await h.scroll("[data-fo-step-panel='2'] .e-permits-fo-field", "Raionul"); }),
    "pp-18c": ppFo("reperfectare", "act-izvoras", 2, async (h) => { await h.find(".e-permits-fo-auth__service-title-row h1 > span.e-permits-name-expand"); }),

    /* ---- eKYC back office (ek-, js/ekyc.js, 2026-10-13) ----
       login on bo-login.html?product=ekyc; the console = ?flow=ekyc; ?ek= gol | eroare |
       incarcare | incheiata are the data demos (empty / API error / loading / ended meanwhile) */
    /* the flow picker (first page) with the „EVO eKYC · Back office” item */
    "ek-00": { page: "e-permits-acte-permisive.html", ready: "[data-flow-home] h1", run: async (h) => { await h.hover('a[href="bo-login.html?product=ekyc"]'); } },
    "ek-01": ekLogin(),
    "ek-01a": ekLogin({ view: "redirecting" }),
    "ek-01b": ekLogin({ view: "processing" }),
    "ek-01c": ekLogin({ mpass: "ok", as: "fara-cont" }),
    "ek-01d": ekLogin({ ended: "expired" }),
    "ek-01e": ekLogin({ ended: "logout" }),
    "ek-01f": ekLogin({ view: "unavailable" }),
    "ek-02": ek("#ek-dashboard"),
    "ek-02a": ek("#ek-dashboard", null, { as: "ekyc-operator" }),
    "ek-02b": ek("#ek-dashboard", null, { as: "ekyc-supervisor" }),
    "ek-02c": ek("#ek-dashboard", null, { as: "ekyc-auditor" }),
    "ek-02d": ek("#ek-dashboard", async (h) => { await h.click("[data-user-menu] .e-permits-shell__user-trigger"); }),
    /* collapsed menu (desktop; ≤960px the sidebar has no collapse) */
    "ek-02e": ek("#ek-dashboard", async (h) => { const toggle = [...document.querySelectorAll("[data-shell-toggle]")].find((el) => el.getClientRects().length); toggle?.click(); await h.wait(450); }),
    /* the „ecran în pregătire” placeholder is gone (batch 3 built every item); ek-02f = Clienți */
    "ek-02f": ekList("#ek-clients"),
    "ek-03": ek("#ek-dashboard", async (h) => { await h.click('[data-ekyc-period="7z"]'); }),
    "ek-03a": ek("#ek-dashboard", async (h) => { await h.click('[data-ekyc-period="30z"]'); await h.choose('[data-ekyc-dash-filter="client"]', "maib-app"); }),
    "ek-03b": ek("#ek-dashboard", async (h) => { await h.click('[data-ekyc-period="1h"]'); await h.choose('[data-ekyc-dash-filter="client"]', "asito-online"); }),
    "ek-03c": ek("#ek-dashboard", null, { params: { ek: "eroare" }, ready: ".e-permits-ekyc-page .e-permits-empty" }),
    "ek-03d": ek("#ek-dashboard", null, { params: { ek: "incarcare" }, ready: ".e-permits-ekyc-page .e-permits-empty" }),
    "ek-03e": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-dismiss]"); }),
    /* Alerte active (2026-10-13): stack of tinted cards + peek layers, „Arată toate” modal, empty */
    "ek-03f": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); }),
    "ek-03g": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click("#case-action-modal [data-ekyc-dismiss]"); }),
    "ek-03h": ek("#ek-dashboard", null, { params: { ek: "fara-alerte" } }),
    /* Alerte active redesign (2026-10-14): hover look (× in the time's place), keyboard focus on
       the card-link, one card per severity, a role without the target screens, and the landing of
       each alert kind after a click on its card */
    "ek-03i": ek("#ek-dashboard", async (h) => { (await h.find('#ekyc-alerts [data-ekyc-alert="al-1"]')).setAttribute("data-demo-hover", ""); await h.wait(300); }),
    "ek-03j": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); }, { params: { ek: "trei-severitati" } }),
    "ek-03k": ek("#ek-dashboard", async (h) => { await h.focus('#ekyc-alerts [data-ekyc-alert="al-1"] .e-permits-ekyc-alert__title'); }),
    "ek-03l": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); }, { as: "ekyc-operator" }),
    "ek-03m": ek("#ek-dashboard", async (h) => { await h.click('#ekyc-alerts [data-ekyc-alert-go="al-1"] .e-permits-ekyc-alert__text'); await h.find('tr[data-workplace-row="prv-vonage"]'); }),
    "ek-03n": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-3"] .e-permits-ekyc-alert__title'); await h.find('[data-registry-kind="ekyc-history"] tr[data-workplace-row]'); }),
    "ek-03o": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-4"] .e-permits-ekyc-alert__title'); await h.find('[data-ekcfg-tab="pasi"][aria-selected="true"]'); }),
    "ek-03p": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-5"] .e-permits-ekyc-alert__title'); await h.find('[data-registry-kind="ekyc-sdk"] tr[data-workplace-row]'); }),
    "ek-03q": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-6"] .e-permits-ekyc-alert__title'); await h.find('tr[data-workplace-row="KYC-47073"]'); }, { as: "ekyc-supervisor" }),
    "ek-03r": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-6"] .e-permits-ekyc-alert__title'); await h.find('[data-registry-kind="ekyc-review"] tr[data-workplace-row], [data-registry-kind="ekyc-review"] .e-permits-empty'); }, { as: "ekyc-operator" }),
    "ek-03s": ek("#ek-dashboard", async (h) => { await h.click("[data-ekyc-alerts-all]"); await h.click('#case-action-modal [data-ekyc-alert-go="al-7"] .e-permits-ekyc-alert__title'); await h.find('[data-ekcfg-tab="general"][aria-selected="true"]'); }),
    "ek-04": ekList("#ek-active"),
    "ek-04a": ekList("#ek-active", async (h) => { await h.click('[data-workplace-tab="În revizie manuală"]'); }),
    "ek-04b": ekList("#ek-active", ekFilterOpen),
    "ek-04c": ekList("#ek-active", ekFacet("client")),
    "ek-04c1": ekList("#ek-active", async (h) => { await ekFacet("client")(h); await h.fill("[data-filter-search]", "zzz", { leave: false }); }),
    "ek-04d": ekList("#ek-active", async (h) => { await ekPick("client", [0])(h); await ekCommit(h); }),
    /* the filter trigger chip with a two-digit badge (filter-chip-v1): 12 values (8 clients + 4 statuses), bar closed (desktop) */
    "ek-04o": ekList("#ek-active", async (h) => { await ekPick("client", [0, 1, 2, 3, 4, 5, 6, 7])(h); await ekPick("statut", [0, 1, 2, 3])(h); await ekCommit(h); if (!ekPhone()) { await h.click("[data-workplace-filter-toggle]"); document.activeElement?.blur(); } }),
    /* 2026-10-19 — the BO Dosare filter on eKYC (desktop + phone sheets): Statut popover with tags
       (multi-select), two facets applied, a draft not applied yet, all filters / „Mai multe”, no results */
    "ek-04j": ekList("#ek-active", ekFacet("statut")),
    "ek-04k": ekList("#ek-active", async (h) => { await ekPick("statut", ["În revizie manuală", "Așteaptă furnizorul"])(h); await ekPick("nivel", ["Substanțial"])(h); await ekCommit(h); }),
    "ek-04l": ekList("#ek-active", async (h) => { await ekFacet("statut")(h); await ekTick(h, ["În revizie manuală"]); if (!ekPhone()) await h.click("[data-filter-confirm]"); }),
    "ek-04m": ekList("#ek-active", async (h) => { if (ekPhone()) { await h.click("[data-filter-all]"); await h.wait(400); return; } await ekFilterOpen(h); await h.click("[data-filter-more]"); }),
    "ek-04n": ek("#ek-active", async (h) => { await ekPick("client", ["Asito Online"])(h); await ekCommit(h); await h.fill("[data-workplace-search]", "zzzz", { leave: false }); await h.wait(500); }, { ready: "tr[data-workplace-row]" }),
    "ek-04e": ekList("#ek-active", async (h) => { await h.fill("[data-workplace-search]", "Orange", { leave: false }); }),
    "ek-04f": ekList("#ek-active", async (h) => { await h.fill("[data-workplace-search]", "xyzq", { leave: false }); }),
    "ek-04g": ek("#ek-active", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-04h": ek("#ek-active", null, { params: { ek: "eroare" }, ready: ".e-permits-empty-cell" }),
    "ek-04i": ek("#ek-active", null, { params: { ek: "incarcare" }, ready: ".e-permits-empty-cell" }),
    "ek-05": ekSes("KYC-48192"),
    "ek-05a": ekSes("KYC-48192", "pasi"),
    "ek-05b": ekSes("KYC-48192", "dispozitiv"),
    "ek-05c": ekSes("KYC-48192", "jurnal"),
    "ek-05d": ekSes("KYC-48205"),
    "ek-05e": ekSes("KYC-48213", "pasi"),
    "ek-05f": ekSes("KYC-48220"),
    "ek-05g": ekSes("KYC-48225"),
    "ek-05h": ekSes("KYC-48211", "dispozitiv"),
    "ek-05i": ek("#ek-active", async (h) => { await h.nth("[data-ekyc-open]", 0); }, { params: { ek: "incheiata" }, ready: "tr[data-workplace-row]" }),
    "ek-05j": ekSes("KYC-00000"),
    "ek-05k": ek("#sesiune/KYC-48192/general", null, { params: { ek: "incarcare" }, ready: ".e-permits-dosar-profil .e-permits-empty" }),
    "ek-06": ekList("#ek-history"),
    "ek-06a": ekList("#ek-history", async (h) => { await h.click('[data-workplace-tab="Respins"]'); }),
    "ek-06b": ekList("#ek-history", ekFacet("perioada")),
    "ek-06c": ekList("#ek-history", ekFacet("decizie")),
    "ek-06d": ekList("#ek-history", async (h) => { await h.click("[data-workplace-export]"); }),
    /* 06b = the Perioadă date range popover (presets + Interval personalizat, 2026-10-20) · 06g = Decizie + Perioadă
       „Ultimele 30 de zile” applied */
    "ek-06g": ekList("#ek-history", async (h) => { await ekPick("decizie", ["Respins"])(h); await ffDate("[data-workplace-filter-toggle]", "perioada", { preset: "30z", commit: false })(h); await ekCommit(h); }),
    "ek-06e": ek("#ek-history", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-06f": ek("#ek-history", null, { params: { ek: "eroare" }, ready: ".e-permits-empty-cell" }),
    "ek-07": ekSes("KYC-47325"),
    "ek-07a": ekSes("KYC-47325", "scor"),
    "ek-07b": ekSes("KYC-47325", "pasi"),
    "ek-07c": ekSes("KYC-47325", "dispozitiv"),
    "ek-07d": ekSes("KYC-47325", "jurnal"),
    "ek-07e": ekSes("KYC-47118"),
    "ek-07f": ekSes("KYC-47118", "scor"),
    "ek-07g": ekSes("KYC-47088", "scor"),
    "ek-07h": ekSes("KYC-46998"),
    "ek-07i": ekSes("KYC-47052"),
    "ek-07j": ekSes("KYC-47292", "dispozitiv"),

    /* ---- eKYC batch 2: revizie manuală (EPIC-06) ---- */
    /* Operator (revizie): his queue, the review screen per tab, take, decide */
    "ek-08": ekQueue(EK_OP, "#ek-review"),
    "ek-08a": ekQueue(EK_OP, "#ek-review", async (h) => { await h.click('[data-workplace-tab="Alocată"]'); }),
    "ek-08b": ekQueue(EK_OP, "#ek-review", ekFacet("statut")),
    "ek-08c": ekAs(EK_OP, "#ek-review", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-08d": ekRev(EK_OP, "KYC-47073"),
    "ek-09": ekRev(EK_OP, "KYC-48220"),
    "ek-09a": ekRev(EK_OP, "KYC-48220", "revizie", async (h) => { await h.click("[data-ekyc-take]"); }),
    "ek-09b": ekRev(EK_OP, "KYC-48220", "revizie", async (h) => { await h.click("[data-ekyc-take]"); await h.click("[data-service-confirm-ok]"); }),
    "ek-09c": ekRev(EK_OP, "KYC-48221"),
    "ek-09d": ekRev(EK_OP, "KYC-48221", "dovezi"),
    "ek-09e": ekRev(EK_OP, "KYC-48221", "dovezi", async (h) => { await h.nth("[data-ekyc-evidence]", 0); await h.click('[data-ekyc-zoom="in"]'); await h.click('[data-ekyc-zoom="in"]'); await h.click("[data-ekyc-rotate]"); }),
    "ek-09f": ekRev(EK_OP, "KYC-48221", "dovezi", async (h) => { await h.click("[data-ekyc-evidence][aria-label^='Redă']"); await h.click('[data-ekyc-frame="next"]'); }),
    "ek-09g": ekRev(EK_OP, "KYC-48221", "surse"),
    "ek-09h": ekRev(EK_OP, "KYC-48222", "surse"),
    "ek-09i": ekRev(EK_OP, "KYC-48222", "surse", async (h) => { await h.click("[data-ekyc-rsp-retry]"); }),
    "ek-09j": ekRev(EK_OP, "KYC-48221", "pasi"),
    "ek-09k": ekRev(EK_OP, "KYC-48221", "jurnal"),
    "ek-10": ekRev(EK_OP, "KYC-48221", "revizie", async (h) => { await h.click('[data-ekyc-decide="Acceptat"]'); }),
    "ek-10a": ekRev(EK_OP, "KYC-48221", "revizie", ekDecide("Respins")),
    "ek-10b": ekRev(EK_OP, "KYC-48221", "revizie", ekDecide("Respins", "face-mismatch", "Selfie diferit.")),
    "ek-10c": ekRev(EK_OP, "KYC-48221", "revizie", ekDecide("Acceptat", "match-rsp", "Fotografia din document și selfie-ul corespund; adresa diferă doar prin mutarea recentă, confirmată în RSP.")),
    "ek-10d": ekRev(EK_OP, "KYC-47085"),
    "ek-10e": ekRev(EK_OP, "KYC-47085", "revizie", async (h) => { await h.click('[data-ekyc-retry-notify="client"]'); }),
    /* multi-operator (US-06-08): independent votes, majority */
    "ek-11": ekRev(EK_OP, "KYC-47076"),
    "ek-11a": ekRev(EK_OP, "KYC-47076", "revizie", ekDecide("Acceptat", "manual-face", "Am comparat manual selfie-ul cu fotografia din cip; trăsăturile corespund, iar contestația clientului este întemeiată.")),
    "ek-11b": ekRev(EK_SUP, "KYC-47082"),
    /* Supervizor: the whole queue, (re)allocation, notifications */
    "ek-12": ekQueue(EK_SUP, "#ek-review-all"),
    "ek-12a": ekQueue(EK_SUP, "#ek-review-all", async (h) => { await h.click('[data-workplace-tab="Nealocată"]'); }),
    "ek-12b": ekQueue(EK_SUP, "#ek-review-all", async (h) => { await h.click('[data-workplace-tab="multi"]'); }),
    "ek-12c": ekQueue(EK_SUP, "#ek-review-all", async (h) => { await h.click('[data-workplace-tab="Nealocată"]'); await h.nth("[data-ekyc-assign]", 0); }),
    "ek-12d": ekRev(EK_SUP, "KYC-47073", "revizie", async (h) => { await h.click("[data-ekyc-assign]"); await h.click('[data-ekyc-assign-mode="manual"]'); await h.click("[data-ekyc-assign-submit]"); }),
    "ek-12e": ekRev(EK_SUP, "KYC-47073", "revizie", async (h) => { await h.click("[data-ekyc-assign]"); await h.click('[data-ekyc-assign-mode="manual"]'); await h.choose('[data-ekyc-field="operator"]', "Ana Grosu"); await h.fill("#ekyc-f-text", "Termen depășit; Mihai Rotaru este ocupat cu o contestație."); await h.click("[data-ekyc-assign-submit]"); }),
    "ek-12f": ekRev(EK_SUP, "KYC-47079"),
    "ek-12g": ekRev(EK_SUP, "KYC-47079", "revizie", async (h) => { await h.click('[data-ekyc-retry-notify="applicant"]'); }),
    "ek-12h": ekRev(EK_SUP, "KYC-47070"),

    /* ---- eKYC batch 2: audit (EPIC-07) — Auditor ---- */
    "ek-13": ekQueue(EK_AUD, "#ek-history"),
    "ek-13a": ekQueue(EK_AUD, "#ek-history", ekFacet("scorBand")),
    "ek-13b": ekQueue(EK_AUD, "#ek-history", async (h) => { await h.fill("[data-workplace-search]", "Rusu", { leave: false }); }),
    "ek-14": ekAud("KYC-47088"),
    "ek-14a": ekAud("KYC-47088", "dovezi"),
    "ek-14b": ekAud("KYC-47088", "dovezi", async (h) => { await h.click("[data-ekyc-access-request]"); }),
    "ek-14c": ekAud("KYC-47088", "dovezi", async (h) => { await h.click("[data-ekyc-access-request]"); await h.click("[data-ekyc-access-submit]"); }),
    "ek-14d": ekAud("KYC-47088", "dovezi", async (h) => { await h.click("[data-ekyc-access-request]"); await h.choose('[data-ekyc-field="reason"]', "Contestație"); await h.fill("#ekyc-f-ref", "CONT-2026-114"); await h.click("[data-ekyc-access-submit]"); }),
    "ek-14e": ekAud("KYC-47088", "dovezi", async (h) => { await h.click("[data-ekyc-access-request]"); await h.choose('[data-ekyc-field="reason"]', "Contestație"); await h.click("[data-ekyc-access-submit]"); await h.click('[data-ekyc-tab="acces"]'); }),
    "ek-14f": ekAud("KYC-47082", "revizie"),
    "ek-14g": ekAud("KYC-47082", "scor"),
    "ek-14h": ekAud("KYC-47130", "surse"),
    "ek-15": ekAs(EK_AUD, "#ek-reports"),
    "ek-15a": ekAs(EK_AUD, "#ek-reports", async (h) => { await h.click(".e-permits-ekyc-export [data-stack-menu-trigger]"); }),
    "ek-15b": ekAs(EK_AUD, "#ek-reports", null, { params: { ek: "gol" } }),
    "ek-15c": ekAs(EK_AUD, "#ek-reports", null, { params: { ek: "eroare" }, ready: ".e-permits-ekyc-page .e-permits-empty" }),
    "ek-15d": ek("#ek-reports", async (h) => { await h.click('[data-ekyc-period="30z"]'); }),
    "ek-16": ekQueue(EK_AUD, "#ek-access-log"),
    "ek-16a": ekQueue(EK_AUD, "#ek-access-log", async (h) => { await h.click('[data-workplace-tab="dovezi"]'); }),
    "ek-16b": ekAs(EK_AUD, "#ek-access-log", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),

    /* ---- eKYC batch 3: Configurare + Administrare (Administrator platformă) ----
       ?ek= gol | eroare | incarcare (lists, details) · sesiuni-eroare (user sessions table) ·
       sectiune-eroare (steps / rules section) · test-lent (connection test stays running) ·
       eroare-stergere (generic delete error, distinct from the 409) */
    /* Utilizatori (US-UI-13) */
    "ek-20": ekList("#ek-users"),
    "ek-20a": ekList("#ek-users", async (h) => { await h.click('[data-workplace-tab="Blocat"]'); }),
    "ek-20b": ekList("#ek-users", ekFacet("roluri")),
    "ek-20c": ekList("#ek-users", async (h) => { await h.fill("[data-workplace-search]", "xyzq", { leave: false }); }),
    "ek-20d": ek("#ek-users", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-20e": ek("#ek-users", null, { params: { ek: "eroare" }, ready: ".e-permits-empty-cell" }),
    "ek-20f": ek("#ek-users", null, { params: { ek: "incarcare" }, ready: ".e-permits-empty-cell" }),
    "ek-20g": ekList("#ek-users", ekRow("user-suspend", "usr-06")),
    "ek-21": ekDet("#ek-utilizator/usr-06/general"),
    "ek-21a": ekDet("#ek-utilizator/usr-02/sesiuni"),
    "ek-21b": ekDet("#ek-utilizator/usr-02/sesiuni", async (h) => { await h.click('[data-ekcfg="session-revoke"]'); }),
    "ek-21c": ekDet("#ek-utilizator/usr-06/general", async (h) => { await h.click('[data-ekcfg="user-suspend"]'); }),
    "ek-21d": ekDet("#ek-utilizator/usr-06/general", async (h) => { await h.click('[data-ekcfg="user-suspend"]'); await h.click("[data-service-confirm-ok]"); }),
    "ek-21e": ekDet("#ek-utilizator/usr-10/general"),
    "ek-21f": ekDet("#ek-utilizator/usr-10/general", async (h) => { await h.click('[data-ekcfg="user-reactivate"]'); }),
    "ek-21g": ekDet("#ek-utilizator/usr-01/sesiuni"),
    "ek-21h": ekDet("#ek-utilizator/usr-01/general", async (h) => { await h.hover('[data-ekcfg="user-suspend"]'); }),
    "ek-21i": ekDet("#ek-utilizator/usr-11/sesiuni"),
    "ek-21j": ekDet("#ek-utilizator/usr-02/sesiuni", null, { params: { ek: "sesiuni-eroare" } }),
    "ek-21k": ekDet("#ek-utilizator/usr-03/sesiuni", async (h) => { await h.click('[data-ekcfg="user-revoke-all"]'); }),
    "ek-21l": ekDet("#ek-utilizator/usr-03/jurnal"),
    "ek-21m": ek("#ek-utilizator/usr-06/general", null, { params: { ek: "incarcare" }, ready: ".e-permits-dosar-profil .e-permits-empty" }),
    /* Clienți (US-UI-07) */
    "ek-22": ekList("#ek-clients"),
    "ek-22a": ekList("#ek-clients", async (h) => { await h.click('[data-workplace-tab="off"]'); }),
    "ek-22b": ekList("#ek-clients", ekFacet("organizatie")),
    "ek-22c": ek("#ek-clients", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-22d": ek("#ek-clients", null, { params: { ek: "eroare" }, ready: ".e-permits-empty-cell" }),
    "ek-22e": ek("#ek-clients", null, { params: { ek: "incarcare" }, ready: ".e-permits-empty-cell" }),
    /* multi-value tag cell: one line, „+N” with every value in the tooltip (focus shows it at once) */
    "ek-22f": ekList("#ek-clients", async (h) => { const el = await h.focus('tr[data-workplace-row="maib-app"] .e-permits-workplace__user-role-more:not([hidden])'); el.dispatchEvent(new FocusEvent("focusin", { bubbles: true })); await h.wait(300); }),
    "ek-23": ekDet("#ek-client/maib-app/configuratie"),
    "ek-23a": ekDet("#ek-client/maib-app/jurnal"),
    "ek-23b": ekDet("#ek-client/maib-app/configuratie", async (h) => { await h.click('[data-ekcfg="client-toggle"]'); }),
    "ek-23c": ekDet("#ek-client/moldtelecom-myaccount/configuratie"),
    "ek-24": ekList("#ek-clients", async (h) => { await h.click("[data-workplace-add-product]"); await h.find("[data-ekcfg-page]"); }),
    "ek-24a": ekPage("#ek-client-nou", async (h) => { await h.click("[data-ekcfg-submit]"); }),
    "ek-24b": ekPage("#ek-client-nou", async (h) => {
      await h.choose('[data-ekcfg-field="orgId"]', "org-moldtelecom");
      await h.fill("#ekcfg-name", "Moldtelecom MyAccount 2");
      await h.fill("#ekcfg-clientId", "maib-app");
      await h.fill("#ekcfg-mpassClientId", "3f9c41e8-52d1-4a6b-9e0f-1c2d3e4f5a6b");
      await h.fill("#ekcfg-redirectUris-0", "https://my.moldtelecom.md/ekyc/callback");
      await h.click('[data-ekcfg-check="useCases"][value="TELCO_SIM_SUBSTANTIAL"]');
      await h.choose('[data-ekcfg-field="scoringId"]', "scr-01");
      await h.click("[data-ekcfg-submit]");
    }),
    "ek-24c": ekPage("#ek-client-nou", async (h) => {
      await h.choose('[data-ekcfg-field="orgId"]', "org-moldtelecom");
      await h.fill("#ekcfg-name", "Moldtelecom MyAccount 2");
      await h.fill("#ekcfg-clientId", "moldtelecom-myaccount-2");
      await h.fill("#ekcfg-mpassClientId", "3f9c41e8-52d1-4a6b-9e0f-1c2d3e4f5a6b");
      await h.fill("#ekcfg-redirectUris-0", "https://my.moldtelecom.md/ekyc/callback");
      await h.fill("#ekcfg-scopes", "ekyc.result"); await h.click('[data-ekcfg-chip-add="scopes"]');
      await h.click('[data-ekcfg-check="useCases"][value="TELCO_SIM_SUBSTANTIAL"]');
      await h.choose('[data-ekcfg-field="scoringId"]', "scr-01");
      await h.click("[data-ekcfg-submit]");
    }),
    "ek-24d": ekDet("#ek-client/maib-app/configuratie", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="client-edit"]'); await h.find("[data-ekcfg-page]"); await h.click('[data-ekcfg-item-add="ipWhitelist"]'); await h.fill("#ekcfg-ipWhitelist-1", "185.181.228.300"); }),
    "ek-24e": ekPage("#ek-client/maib-app/editeaza", async (h) => { await h.click('[data-ekcfg-item-add="ipWhitelist"]'); await h.fill("#ekcfg-ipWhitelist-1", "185.181.228.300"); await h.click('[data-ekcfg-chip-remove="scopes"][data-value="openid"]'); await h.click("[data-ekcfg-submit]"); }),
    "ek-24f": ekPage("#ek-client/maib-app/editeaza", async (h) => { await h.fill("#ekcfg-maxSessions", "250"); await h.click("[data-ekcfg-submit]"); }),
    "ek-24g": ekPage("#ek-client/maib-app/editeaza", async (h) => { await h.fill("#ekcfg-maxSessions", "250"); await h.click("[data-ekcfg-page-cancel]"); }),
    "ek-24h": ekPage("#ek-client/maib-app/editeaza", async (h) => { await h.fill("#ekcfg-maxSessions", "250"); await h.click('[data-profile-changes="ekyc-form"]'); }),
    /* Cazuri de utilizare (US-UI-08) */
    "ek-25": ekList("#ek-use-cases"),
    "ek-25a": ekList("#ek-use-cases", async (h) => { await h.click('[data-workplace-tab="off"]'); }),
    "ek-25b": ek("#ek-use-cases", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-25c": ekList("#ek-use-cases", async (h) => { await h.click("[data-workplace-add-product]"); }),
    "ek-25d": ekList("#ek-use-cases", async (h) => { await h.click("[data-workplace-add-product]"); await h.fill("#ekcfg-name", "Onboarding bancar"); await h.fill("#ekcfg-code", "BANK_ONBOARDING_HIGH"); await h.click("[data-ekcfg-submit]"); }),
    "ek-25e": ekList("#ek-use-cases", async (h) => { await h.click("[data-workplace-add-product]"); await h.fill("#ekcfg-name", "Deschidere cont de plăți"); await h.fill("#ekcfg-code", "PAYMENT_ACCOUNT_SUBST"); await h.choose('[data-ekcfg-field="ial"]', "Substanțial"); await h.click("[data-ekcfg-submit]"); }),
    "ek-26": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi"),
    "ek-26a": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('[data-ekcfg="step-edit"][data-id="BANK_ONBOARDING_HIGH|bank_onboarding_high-s4"]'); }),
    "ek-26b": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('[data-ekcfg="step-edit"][data-id="BANK_ONBOARDING_HIGH|bank_onboarding_high-s4"]'); await h.choose('[data-ekcfg-field="provider"]', "prv-innovatrics"); }),
    "ek-26c": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('[data-ekcfg="step-down"][data-id="BANK_ONBOARDING_HIGH|bank_onboarding_high-s3"]'); }),
    "ek-26d": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('[data-ekcfg-step="bank_onboarding_high-s2"] [data-stack-menu-trigger]'); await h.click('[data-ekcfg="step-delete"][data-id="BANK_ONBOARDING_HIGH|bank_onboarding_high-s2"]'); }),
    "ek-26e": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/veto"),
    "ek-26f": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/veto", async (h) => { await h.click('[data-ekcfg="veto-new"]'); await h.fill("#ekcfg-name", "Document deteriorat"); await h.fill("#ekcfg-condition", "document este deteriorat"); await h.click("[data-ekcfg-submit]"); }),
    "ek-26g": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/versiuni"),
    "ek-26h": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('[data-ekcfg="step-down"][data-id="BANK_ONBOARDING_HIGH|bank_onboarding_high-s3"]'); await h.click('[data-ekcfg-tab="versiuni"]'); await h.click("#ekyc-panel [data-stack-menu-trigger]"); await h.click('[data-ekcfg="uc-revert"]'); }),
    "ek-26i": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="uc-toggle"]'); }),
    "ek-26j": ekDet("#ek-caz/PENSION_CONFIRM_SUBST/pasi"),
    "ek-26k": ekDet("#ek-caz/PENSION_CONFIRM_SUBST/pasi", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="uc-toggle"]'); }),
    "ek-26l": ekDet("#ek-caz/KYC_REFRESH_LOW/veto"),
    "ek-26m": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="uc-edit"]'); }),
    "ek-26n": ekDet("#ek-caz/BANK_ONBOARDING_HIGH/pasi", null, { params: { ek: "sectiune-eroare" } }),
    "ek-26o": ekDet("#ek-caz/PENSION_CONFIRM_SUBST/pasi", async (h) => { await h.click('.e-permits-dosar-profil__panel [data-ekcfg="step-new"]'); }),
    /* Parametri platformă (US-UI-11) */
    "ek-27": ekList("#ek-parameters"),
    "ek-27a": ekList("#ek-parameters", ekFacet("categorie")),
    "ek-27b": ekList("#ek-parameters", async (h) => { await h.fill("[data-workplace-search]", "xyzq", { leave: false }); }),
    "ek-27c": ek("#ek-parameters", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-27d": ek("#ek-parameters", null, { params: { ek: "incarcare" }, ready: ".e-permits-empty-cell" }),
    "ek-27e": ek("#ek-parameters", null, { params: { ek: "eroare" }, ready: ".e-permits-empty-cell" }),
    "ek-27f": ekList("#ek-parameters", async (h) => { await h.fill("[data-workplace-search]", "session", { leave: false }); await h.click('[data-ekcfg="param-edit"][data-id="session.ttlMinutes"]'); }),
    "ek-27g": ekList("#ek-parameters", async (h) => { await h.click('[data-ekcfg="param-edit"][data-id="features.webFallback"]'); }),
    "ek-27h": ekList("#ek-parameters", async (h) => { await h.click('[data-ekcfg="param-edit"][data-id="alerts.channels"]'); await h.fill("#ekcfg-value", "{\"email\": [\"noc@egov.md\"], \"mnotify\": true,}"); await h.click("[data-ekcfg-submit]"); }),
    "ek-27i": ekList("#ek-parameters", async (h) => { await h.click("[data-workplace-add-product]"); await h.fill("#ekcfg-key", "session.ttlMinutes"); await h.choose('[data-ekcfg-field="type"]', "string"); await h.click("[data-ekcfg-submit]"); }),
    "ek-27j": ekList("#ek-parameters", async (h) => { await h.click("[data-workplace-add-product]"); await h.choose('[data-ekcfg-field="type"]', "json"); }),
    "ek-27k": ekList("#ek-parameters", ekRow("param-delete", "limits.maxUploadMb")),
    /* Configurări scoring (US-UI-10) */
    "ek-28": ekList("#ek-scoring"),
    "ek-28a": ekDet("#ek-scoring/scr-02/reguli"),
    "ek-28b": ekDet("#ek-scoring/scr-03/reguli"),
    "ek-28c": ekDet("#ek-scoring/scr-02/reguli", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="scoring-edit"]'); }),
    "ek-28d": ekDet("#ek-scoring/scr-02/reguli", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="scoring-edit"]'); await h.fill("#ekcfg-reject", "0,90"); }),
    "ek-28e": ekDet("#ek-scoring/scr-02/reguli", async (h) => { await h.click('[data-ekcfg="rule-new"]'); }),
    "ek-28f": ekDet("#ek-scoring/scr-02/reguli", async (h) => { await h.click('[data-ekcfg="rule-new"]'); await h.fill("#ekcfg-value", "1,5"); await h.click("[data-ekcfg-submit]"); }),
    "ek-28g": ekDet("#ek-scoring/scr-02/reguli", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="scoring-toggle"]'); }),
    "ek-28h": ek("#ek-scoring", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-28i": ekDet("#ek-scoring/scr-02/reguli", null, { params: { ek: "sectiune-eroare" } }),
    /* Furnizori de verificare (US-UI-09) */
    "ek-29": ekList("#ek-providers"),
    "ek-29a": ek("#ek-providers", async (h) => { await h.click('[data-ekcfg="provider-test"][data-id="prv-iproov"]'); }, { params: { ek: "test-lent" }, ready: "tr[data-workplace-row]" }),
    "ek-29b": ekList("#ek-providers", async (h) => { await h.click('[data-ekcfg="provider-test"][data-id="prv-iproov"]'); await h.find("#case-action-modal.is-active .e-permits-callout"); }),
    "ek-29c": ekList("#ek-providers", async (h) => { await h.click('[data-ekcfg="provider-test"][data-id="prv-vonage"]'); await h.find("#case-action-modal.is-active .e-permits-callout"); }),
    "ek-29d": ekList("#ek-providers", ekRow("provider-toggle", "prv-facetec")),
    "ek-29e": ekPage("#ek-furnizor/prv-facetec/editeaza"),
    "ek-29f": ekPage("#ek-furnizor/prv-facetec/editeaza", async (h) => { await h.click("[data-ekcfg-secret-replace]"); await h.fill("#ekcfg-secret", "fx_live_8f2c41d0a9"); }),
    "ek-29g": ekList("#ek-providers", async (h) => { await h.click("[data-workplace-add-product]"); await h.find("[data-ekcfg-page]"); await h.fill("#ekcfg-endpoint", "api.furnizor.md"); await h.fill("#ekcfg-timeoutMs", "500"); await h.click("[data-ekcfg-submit]"); }),
    "ek-29h": ekPage("#ek-furnizor/prv-facetec/editeaza", async (h) => { await h.click("[data-ekcfg-test-form]"); await h.find("#case-action-modal.is-active .e-permits-callout"); }),
    "ek-29i": ek("#ek-providers", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-29j": ekPage("#ek-furnizor/prv-facetec/editeaza", async (h) => { await h.hover('[data-ekcfg-wrap="cbThreshold"] .e-permits-ekcfg-tip'); }),
    /* Organizații (US-UI-06) */
    "ek-30": ekList("#ek-organizations"),
    "ek-30a": ekList("#ek-organizations", async (h) => { await h.click("[data-workplace-add-product]"); }),
    "ek-30b": ekList("#ek-organizations", async (h) => { await h.click("[data-workplace-add-product]"); await h.fill("#ekcfg-name", "Moldova Gaz SA"); await h.fill("#ekcfg-idno", "10026000"); await h.fill("#ekcfg-contactEmail", "contact@moldovagaz"); await h.click("[data-ekcfg-submit]"); }),
    "ek-30c": ekList("#ek-organizations", ekRow("org-delete", "org-microinvest")),
    "ek-30d": ekList("#ek-organizations", async (h) => { await ekRow("org-delete", "org-maib")(h); await h.click("[data-service-confirm-ok]"); }),
    "ek-30e": ekList("#ek-organizations", async (h) => { await ekRow("org-delete", "org-cnas")(h); await h.click("[data-service-confirm-ok]"); }, { params: { ek: "eroare-stergere" } }),
    "ek-30f": ek("#ek-organizations", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-30g": ekList("#ek-organizations", async (h) => { await h.click('[data-ekcfg="org-edit"][data-id="org-orange"]'); }),
    /* Versiuni SDK (US-UI-12) */
    "ek-31": ekList("#ek-sdk"),
    "ek-31a": ekList("#ek-sdk", async (h) => { await h.click("[data-workplace-add-product]"); }),
    "ek-31b": ekList("#ek-sdk", async (h) => { await h.click("[data-workplace-add-product]"); await h.fill("#ekcfg-version", "4.2.1"); await h.choose('[data-ekcfg-field="platform"]', "iOS"); await h.click("[data-ekcfg-submit]"); }),
    "ek-31c": ekList("#ek-sdk", async (h) => { await h.click('[data-ekcfg="sdk-edit"][data-id="sdk-ios-420"]'); }),
    "ek-31d": ekList("#ek-sdk", ekRow("sdk-delete", "sdk-android-385")),
    "ek-31e": ekList("#ek-sdk", async (h) => { await h.click('[data-workplace-tab="off"]'); }),
    "ek-31f": ek("#ek-sdk", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    /* 2026-10-21 (pd-tags-v1) · a supported version's row ⋮ open: „Retrage din suport” + the red „Șterge” */
    "ek-31m": ekList("#ek-sdk", async (h) => {
      /* the table is wider than the screen: scroll it sideways to the ⋮ first, as a person does */
      const t = await h.find('tr[data-workplace-row="sdk-ios-420"] [data-stack-menu-trigger]'); t.scrollIntoView({ block: "center", inline: "end" }); await h.wait(200);
      await h.click('tr[data-workplace-row="sdk-ios-420"] [data-stack-menu-trigger]'); await h.find('[data-ekcfg="sdk-support"][data-id="sdk-ios-420"]');
    }),
    /* Certificate root CA (US-05-09-B) */
    "ek-32": ekList("#ek-trusted-cas"),
    "ek-32a": ekDet("#ek-certificat/ca-age-mtls-g2/general"),
    "ek-32b": ekDet("#ek-certificat/ca-age-mtls-g1/general"),
    "ek-32c": ekList("#ek-trusted-cas", async (h) => { await h.click("[data-workplace-add-product]"); }),
    "ek-32d": ekList("#ek-trusted-cas", ekCert("BNM-Partner-Root-CA-2026.pem")),
    "ek-32e": ekList("#ek-trusted-cas", ekCert("stisc-test-expirat.crt")),
    "ek-32f": ekList("#ek-trusted-cas", ekCert("digicert-global-root-g2.cer")),
    "ek-32g": ekList("#ek-trusted-cas", async (h) => { await ekCert("BNM-Partner-Root-CA-2026.pem")(h); await h.click("[data-ekcfg-submit]"); }),
    "ek-32h": ekDet("#ek-certificat/ca-age-mtls-g2/general", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="ca-finish"]'); }),
    "ek-32i": ekDet("#ek-certificat/ca-maib-partner/general", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="ca-rotate"]'); }),
    "ek-32j": ekDet("#ek-certificat/ca-maib-partner/general", async (h) => { await h.click('.e-permits-page-header [data-ekcfg="ca-toggle"]'); }),
    "ek-32k": ek("#ek-trusted-cas", null, { params: { ek: "gol" }, ready: ".e-permits-empty-cell" }),
    "ek-32l": ekDet("#ek-certificat/ca-age-mtls-g2/jurnal"),

    /* ---- Ghișeu — depunerea cererilor la ghișeu în BackOffice (Feature 95768, js/ghiseu.js, 2026-10-15) ----
       Specialist ghișeu (CSP Chișinău): Dosare noi (US-241), the wizard #ghiseu/nou · #ghiseu/<id>/<step>
       (US-233…238), drafts (US-239/240). Demo switches as params: mconnect=0, mdocs=0, msign / olograf /
       cert = 0|1, msignerr=1, taxa=incompleta, depunere=eroare, certerr=1, gol=1, registru=asteptare. */
    ...ghDemoStates()
  };

  function ghDemoStates() {
    const GH = "ansp-ghiseu-chisinau";
    /* the picker (#gh-start-modal, modal--md) or the request sheet (#gh-request-modal, modal--fullscreen) */
    const READY = "#gh-start-modal.is-active [data-gh-panel], #gh-start-modal.is-active .e-permits-empty, #gh-request-modal.is-active [data-gh-panel]";
    const gh = (hash, run, params) => ({ flow: "back-office", as: GH, hash, params, ready: READY, run: async (h) => { await h.wait(300); if (run) await run(h); } });
    const ghList = (run, params) => ({ flow: "back-office", as: GH, hash: "#dosare-noi", params, ready: "[data-registry-kind='ghiseu'] tr[data-workplace-row], [data-registry-kind='ghiseu'] .e-permits-empty", run });
    const down = (el) => el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    /* the clicks a clerk makes on the initiation screen */
    const service = (code) => async (h) => { await h.click("#fo-gh-serviciu"); down(await h.find(`.e-permits-fo-caem__option[data-code="${code}"]`)); await h.wait(400); };
    /* a service with one person type shows it read-only: nothing to click */
    const type = (v) => async (h) => { await h.wait(200); if (document.querySelector("[data-gh-type]")) await h.click(`[data-gh-type] .segment-item[data-value="${v}"]`); };
    /* a code typed, then the arrow (the explicit MConnect search) */
    const typeCode = (kind, value) => async (h) => { await h.fill(`[data-gh-code="${kind}"]`, value, { leave: false }); await h.wait(100); };
    const code = (kind, value) => async (h) => { await typeCode(kind, value)(h); await h.click(`[data-gh-search="${kind}"]`); await h.wait(1300); };
    const seq = (...steps) => async (h) => { for (const step of steps) await step(h); };
    const next = async (h) => { await h.click("[data-gh-next]"); await h.wait(500); };
    /* the small modal's „Continuă”: the draft is created and the request window opens on „Ce se solicită?” */
    const cont = async (h) => { await h.click("[data-gh-start-next]"); await h.find('#gh-request-modal.is-active [data-gh-panel="intent"]'); await h.wait(400); };
    const atStep1 = async (h) => { await h.find('#gh-request-modal.is-active [data-gh-panel="identificare"]'); await h.wait(300); };
    /* a choice on the intent screen starts the request at „Solicitant și reprezentare” */
    const primar = async (h) => { await h.click("[data-gh-intent-new]"); await atStep1(h); };
    const openActMenu = (id) => async (h) => { await h.click(`[data-fo-intent-act="${id}"] [data-fo-intent-trigger]`); await h.wait(200); };
    /* the picker: who (PJ = IDNO + the person filing; PF is preselected) */
    const pjAdmin = seq(type("PJ"), code("company", "1012600000002"), code("applicant", "2002005006007"));
    const pjNoLink = seq(type("PJ"), code("company", "1014600099887"), code("applicant", "2002005006007"));
    const pjMpower = seq(type("PJ"), code("company", "1003600012345"), code("applicant", "2004001234567"));
    const pf = (idnp) => code("applicant", idnp);
    /* ?mconnect=0: the search opens the names, the clerk types them */
    const pfManual = (idnp) => seq(pf(idnp), async (h) => { await h.fill('[data-gh-target="applicant:last"]', "Ceban", { leave: false }); await h.fill('[data-gh-target="applicant:first"]', "Maria", { leave: false }); });
    /* the modal filled (service + applicant) → Continuă → intent: „Solicitare nouă” (or a post-process) → the request */
    const start = (who, svc = "003000118", choice = primar) => seq(service(svc), who, cont, choice);
    const chooseAct = (id, type) => async (h) => { await openActMenu(id)(h); await actMenuPick(`[data-fo-intent-act="${id}"] [data-fo-intent-postprocess="${type}"]`)(h); await atStep1(h); };
    /* a row's ⋮ (rows whose only action is „Elimină schița” show the lone trash instead — lone-trash-v1: nothing to open) */
    const menu = (sel) => async (h) => { (await h.find(sel)).closest(".e-permits-stack__item, tr").querySelector("[data-stack-menu-trigger]")?.click(); await h.wait(300); };
    /* a real file into a document field: the FO document modal, „Încarcă” tab */
    const ghUpload = (fieldSel, name, size = 1200000) => async (h) => {
      await h.click(`${fieldSel} [data-fo-open-doc-modal]`); await h.wait(300);
      const tab = document.querySelector('[data-fo-doc-tab="upload"]');
      if (tab && !tab.closest("[hidden]")) { tab.click(); await h.wait(300); }
      const input = document.querySelector("[data-fo-doc-file-input]");
      const files = new DataTransfer();
      files.items.add(new File([new Uint8Array(size)], name, { type: name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream" }));
      input.files = files.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await h.wait(200); await h.click("[data-fo-doc-modal-submit]"); await h.wait(500);
    };
    /* Verificare done: paper request generated, signed scan attached, signed in MSign */
    /* „Generează cererea pe hârtie”: MDocs answers after ~0.9 s in the preview, which is then closed */
    const ghPaper = async (h) => { await h.click("[data-gh-paper]"); await h.find("#dosar-detail-modal.is-active [data-dosar-doc-canvas]"); document.querySelector("#dosar-detail-modal [data-close]")?.click(); await h.wait(400); };
    const ghReady = async (h) => {
      await ghPaper(h);
      await ghUpload("[data-gh-olograf]", "cerere-C-2026-004790-semnata.pdf")(h);
      await h.click("[data-gh-msign]"); await h.click("[data-gh-msign-ok]"); await h.wait(400);
    };
    return {
      /* US-241 Dosare noi (gh-01h: a draft saved before identification shows „—”) */
      "gh-01": ghList(),
      "gh-01a": ghList(async (h) => { await h.fill("[data-workplace-search]", "zzz"); await h.wait(500); }),
      "gh-01b": ghList(null, { gol: "1" }),
      "gh-01c": ghList(async (h) => { await h.click("[data-workplace-filter-toggle]"); }),
      /* lone-trash-v1: a draft row whose only action is „Elimină schița” = ONE grey trash (hovered: tooltip „Elimină schița”) */
      "gh-01d": ghList(async (h) => { await h.hover("tr[data-workplace-row='gh-4771'] .e-permits-gh-row-remove"); await h.wait(600); }),
      "gh-01e": ghList(async (h) => { await h.click("[data-workplace-export]"); await h.find("#case-action-modal.is-active [data-gh-export-confirm]"); }),
      "gh-01f": ghList(async (h) => { await h.click('[data-workplace-tab="submitted"]'); }),
      "gh-01g": { flow: "back-office", as: "ansp-specialist-chisinau", hash: "#ghiseu/nou", ready: "#gh-start-modal.is-active .e-permits-empty" },
      /* ghiseu-picker-toast-v1: a dossier submitted (gh-10a) → „Înapoi la Dosare noi” → the list with the library success toast */
      "gh-01t": gh("#ghiseu/gh-4771/plata", seq(async (h) => { await h.click("[data-gh-mpay]"); }, next, async (h) => { await h.click("[data-gh-submit]"); await h.wait(400); await h.click("[data-gh-close-sheet]"); await h.find("[data-registry-kind='ghiseu'] tr[data-workplace-row]"); await h.find(".toast"); await h.wait(300); })),
      /* US-233 small modal „Dosar nou” (one screen): empty, list search, service, PF / PJ found, not found
         (9999999999999), registry down, lookup running, 13 digits typed (arrow enabled), short code + Enter,
         Continuă with nothing, PJ-only service */
      "gh-02": gh("#ghiseu/nou"),
      "gh-02a": gh("#ghiseu/nou", async (h) => { await h.click("#fo-gh-serviciu"); await h.fill("[data-fo-caem-search]", "zzz", { leave: false }); }),
      "gh-02b": gh("#ghiseu/nou", service("003000118")),
      "gh-02c": gh("#ghiseu/nou", seq(service("003000118"), pf("2001002003004"))),
      "gh-02d": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin)),
      "gh-02e": gh("#ghiseu/nou", seq(service("003000118"), pf("9999999999999"))),
      "gh-02f": gh("#ghiseu/nou", seq(service("003000118"), pf("2001002003004")), { mconnect: "0" }),
      /* registry down (registry-down-alert-v1): ONE warning notice above the lookups, clean fields — PJ (two
         lookups, one notice), Continuă with the names empty (only the real „required” errors), before any search
         (no notice yet) */
      "gh-02f2": gh("#ghiseu/nou", seq(service("003000118"), type("PJ"), code("company", "1012600000002"), code("applicant", "2002005006007")), { mconnect: "0" }),
      "gh-02f3": gh("#ghiseu/nou", seq(service("003000118"), pf("2001002003004"), async (h) => { await h.click("[data-gh-start-next]"); await h.wait(300); }), { mconnect: "0" }),
      "gh-02f4": gh("#ghiseu/nou", seq(service("003000118"), typeCode("applicant", "2001002003004")), { mconnect: "0" }),
      "gh-02g": gh("#ghiseu/nou", seq(service("003000118"), typeCode("applicant", "2001002003004"), async (h) => { await h.click('[data-gh-search="applicant"]'); await h.wait(300); }), { registru: "asteptare" }),
      "gh-02v": gh("#ghiseu/nou", seq(service("003000118"), typeCode("applicant", "2001002003004"))),
      "gh-02h": gh("#ghiseu/nou", seq(service("003000118"), async (h) => { await h.fill('[data-gh-code="applicant"]', "20010", { leave: false }); const el = document.querySelector('[data-gh-code="applicant"]'); el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await h.wait(300); })),
      "gh-02s": gh("#ghiseu/nou", async (h) => { await h.click("[data-gh-start-next]"); await h.wait(200); }),
      "gh-02m": gh("#ghiseu/nou", seq(service("003000519"))),
      /* the request window's first screen „Ce se solicită?” (FO intent, US-233 AC-24…32): acts + menus (a locked
         row „în curs”), a menu open with a disabled reason, no acts (code starting with 0), a generated identity,
         the holder changed after a choice (notice), a draft saved before the process (resumed on this screen) */
      "gh-02i": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont)),
      /* tacit-tag-v1: Izvoraș (Valabil, tacit) = „Aprobare tacită” only; Piața Mare (Suspendat, tacit) = „Suspendat” only */
      "gh-02y": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont), { tacit: "act-izvoras,act-piata-mare" }),
      /* ghiseu-picker-toast-v1: many acts (?acte=multe, 15) → the search above the rows; a query without diacritics
         („izvoras” finds „Izvoraș”); a query with no match → „Niciun rezultat” */
      "gh-02z": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont), { acte: "multe" }),
      "gh-02z1": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, async (h) => { await h.fill("[data-gh-acts-search]", "izvoras", { leave: false }); await h.wait(600); }), { acte: "multe" }),
      "gh-02z2": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, async (h) => { await h.fill("[data-gh-acts-search]", "zzz", { leave: false }); await h.wait(600); }), { acte: "multe" }),
      "gh-02j": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, openActMenu("act-piata-mare"), async (h) => { if (window.matchMedia("(max-width: 760px)").matches) return; /* phones: the reason is a line in the item */ await h.hover('[data-fo-intent-act="act-piata-mare"] [data-fo-intent-postprocess="Prelungire"]'); await h.wait(600); })),
      /* a locked act (Reperfectare în curs): the notice, no ⋮ (nothing can start — ghiseu-picker-toast-v1) */
      "gh-02t": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, async (h) => { await h.scroll('[data-fo-intent-act="act-depozit"]'); await h.wait(300); })),
      "gh-02l": gh("#ghiseu/nou", seq(service("003000118"), pf("0990001234567"), cont)),
      "gh-02u": gh("#ghiseu/nou", seq(service("003000118"), pf("2123456789018"), cont)),
      "gh-02n": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, chooseAct("act-izvoras", "Reperfectare"), async (h) => { await h.click('#gh-request-modal .e-permits-fo-selected-role__change'); await h.find("#gh-start-modal.is-active [data-gh-panel]"); await h.click('[data-gh-reset="company"]'); }, code("company", "1014600099887"), cont)),
      "gh-02x": gh("#ghiseu/gh-4818"),
      /* a choice starts the request at once: from „Solicitare nouă” · from „Reperfectare” on ASF-2026-04521 ·
         ⋮ „Schimbă procesul” (confirm when data would be lost) */
      "gh-02r": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, primar)),
      "gh-02k": gh("#ghiseu/nou", seq(service("003000118"), pjAdmin, cont, chooseAct("act-izvoras", "Reperfectare"))),
      "gh-02w": gh("#ghiseu/gh-4790/detalii", async (h) => { await h.click("#gh-request-modal .e-permits-gh-sheet__actions [data-stack-menu-trigger]"); await h.click("[data-gh-change-process]"); }),
      /* the service list open (a fixed layer over the dialog: never cut by the modal body) */
      "gh-02q": gh("#ghiseu/nou", async (h) => { await h.click("#fo-gh-serviciu"); await h.wait(300); }),
      /* the sheet: × with unsaved changes asks first; „Schimbă” on the identity reopens the picker */
      "gh-02o": gh("#ghiseu/gh-4812/detalii", seq(async (h) => { await h.fill("#fo-gh-obiect", "Cafeneaua „La Izvor”", { leave: false }); await h.click("[data-gh-sheet-close]"); })),
      "gh-02p": gh("#ghiseu/gh-4812/identificare", async (h) => { await h.click('#gh-request-modal .e-permits-fo-selected-role__change'); await h.find("#gh-start-modal.is-active [data-gh-panel]"); }),
      /* the request's first step „Date solicitant” (FO fo-01): identity cards, representative + basis (US-233 AC-15…22) and, on the same page, the contact (US-234) */
      "gh-03": gh("#ghiseu/nou", start(pjAdmin)),
      "gh-03a": gh("#ghiseu/nou", start(pjNoLink)),
      "gh-03b": gh("#ghiseu/nou", start(pjMpower)),
      "gh-03c": gh("#ghiseu/nou", seq(start(pf("2001002003004")), async (h) => { await h.click("[data-gh-rep-toggle]"); }, code("rep", "2004001234567"))),
      "gh-03d": gh("#ghiseu/nou", seq(start(pf("2001002003004")), async (h) => { await h.click("[data-gh-rep-toggle]"); }, code("rep", "9999999999999"))),
      "gh-03e": gh("#ghiseu/nou", seq(start(pjNoLink), next)),
      "gh-03f": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); }, async (h) => { await h.click("#gh-request-modal [data-gh-save]"); })),
      "gh-03g": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); }, async (h) => { await h.click("#gh-request-modal [data-gh-save]"); await h.wait(300); }, async (h) => { await h.click("#gh-request-modal .e-permits-gh-sheet__actions [data-stack-menu-trigger]"); await h.click("[data-gh-history]"); })),
      "gh-03h": gh("#ghiseu/nou", start(pjAdmin, "003000118", chooseAct("act-izvoras", "Prelungire"))),
      "gh-03i": gh("#ghiseu/nou", start(pjAdmin, "003000519")),
      /* „Prin procură” ticked: the FO boxed procură upload (empty · attached here · then Documente însoțitoare
         shows it already attached, without the „atașați copia” notice) — 2026-10-16 */
      "gh-03j": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); await h.scroll("[data-gh-procura-doc]"); })),
      "gh-03k": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); }, ghUpload("[data-gh-procura-doc]", "procura-scan.pdf", 640000), async (h) => { await h.scroll("[data-gh-procura-doc]"); })),
      "gh-03l": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); }, ghUpload("[data-gh-procura-doc]", "procura-scan.pdf", 640000), async (h) => { /* the stepper is hidden on phones: dispatch the row's click directly */ document.querySelector('#gh-request-modal [data-gh-step="4"] [data-gh-goto]').click(); await h.wait(400); await h.find('[data-gh-doc="procura"] [data-fo-doc]'); })),
      /* registry down in the request's first step: the representative's lookup gets the same notice (gh-03m);
         a holder typed by hand keeps its „Introdus manual” tag on the role card (gh-03n) */
      "gh-03m": gh("#ghiseu/nou", seq(start(pfManual("2001002003004")), async (h) => { await h.click("[data-gh-rep-toggle]"); }, code("rep", "2004001234567")), { mconnect: "0" }),
      "gh-03n": gh("#ghiseu/nou", start(pfManual("2001002003004")), { mconnect: "0" }),
      /* US-234 „Date de contact” on the same step: seed draft (scrolled to the contact), wrong phone / .ru email, MNotify missing values */
      "gh-04": gh("#ghiseu/gh-4812/identificare", async (h) => { await h.scroll("#gh-contact-title"); }),
      "gh-04a": gh("#ghiseu/nou", seq(start(pf("2001002003004")), async (h) => { await h.fill("#fo-gh-phone", "123", { leave: false }); await h.fill("#fo-gh-email", "maria.ceban@mail.ru", { leave: false }); }, next)),
      "gh-04b": gh("#ghiseu/nou", seq(start(pf("2004001234567")), async (h) => { await h.scroll("#gh-contact-title"); })),
      /* US-235 Detalii serviciu */
      "gh-05": gh("#ghiseu/gh-4812/detalii"),
      "gh-05a": gh("#ghiseu/gh-4812/detalii", next),
      "gh-05b": gh("#ghiseu/gh-4812/detalii", seq(async (h) => { await h.fill("#fo-gh-obiect", "Patiseria „Dulce Cahul”", { leave: false }); document.querySelector("[data-gh-panel] [data-fo-address-search]").foCascadeAddressFill({ district: "Raionul Cahul", locality: "Cahul" }); await h.wait(500); })),
      "gh-05c": gh("#ghiseu/gh-4790/detalii"),
      "gh-05d": gh("#ghiseu/gh-4812/detalii", seq(async (h) => { await h.click("#fo-gh-term"); await h.click("#fo-gh-term-list .e-permits-fo-select__option", "urgență"); await h.click('[data-gh-reduction="imm"]'); })),
      /* US-20 Documente însoțitoare */
      "gh-06": gh("#ghiseu/gh-4790/documente"),
      "gh-06a": gh("#ghiseu/gh-4812/detalii", seq(async () => { window.GEAPGhiseu.fill("detalii"); }, (h) => h.wait(600), next, next)),
      "gh-06b": gh("#ghiseu/nou", seq(start(pjNoLink), async (h) => { await h.click("[data-gh-procura]"); }, next, async () => { window.GEAPGhiseu.fill("detalii"); }, (h) => h.wait(600), next)),
      /* US-236 Verificare */
      "gh-07": gh("#ghiseu/gh-4790/verificare"),
      "gh-07a": gh("#ghiseu/gh-4790/verificare", async (h) => { await h.click("[data-gh-paper]"); await h.find("#dosar-detail-modal.is-active [data-dosar-doc-canvas]"); }),
      "gh-07b": gh("#ghiseu/gh-4790/verificare", seq(async (h) => { await ghPaper(h); await h.click("[data-gh-msign]"); })),
      "gh-07c": gh("#ghiseu/gh-4790/verificare", ghReady),
      "gh-07d": gh("#ghiseu/gh-4790/verificare", next),
      /* a new request (demo prefill) jumped to Verificare from the stepper: every earlier step completed */
      "gh-07j": gh("#ghiseu/nou", seq(start(pjAdmin), async (h) => {
        /* the stepper row (desktop); phones hide the stepper (FO ≤960) — the same jump through the demo API */
        const row = document.querySelector('#gh-request-modal [data-gh-step] [data-gh-goto="5"][data-gh-free]');
        if (row && row.offsetParent) await h.click('#gh-request-modal [data-gh-step] [data-gh-goto="5"][data-gh-free]'); else window.GEAPGhiseu.go("verificare");
        await h.find('[data-gh-panel="verificare"]'); await h.wait(300);
      })),
      /* back with the footer (the stepper is hidden on phones), edit, forward again: signature + scan voided */
      "gh-07e": gh("#ghiseu/gh-4790/verificare", seq(ghReady, async (h) => { await h.click("[data-gh-prev]"); await h.click("[data-gh-prev]"); await h.fill("#fo-gh-obiect", "Cafeneaua „Izvoraș” (terasă nouă)", { leave: false }); await h.click("[data-gh-next]"); await h.click("[data-gh-next]"); })),
      "gh-07f": gh("#ghiseu/gh-4790/verificare", null, { msign: "0", olograf: "0" }),
      "gh-07g": gh("#ghiseu/gh-4790/verificare", async (h) => { await h.click("[data-gh-paper]"); await h.find("#dosar-detail-modal.is-active [data-gh-paper-retry]"); }, { mdocs: "0" }),
      /* document preview (2026-10-17): MDocs generating · the error closed (inline retry in the step) · page 2 of the
         paper request · the signed request (MSign JSON) */
      "gh-07g1": gh("#ghiseu/gh-4790/verificare", async (h) => { await h.click("[data-gh-paper]"); await h.find("#dosar-detail-modal.is-active [data-gh-paper-retry]"); document.querySelector("#dosar-detail-modal [data-close]")?.click(); await h.wait(400); }, { mdocs: "0" }),
      "gh-07a1": gh("#ghiseu/gh-4790/verificare", async (h) => { await h.click("[data-gh-paper]"); await h.find("#dosar-detail-modal.is-active .e-permits-empty"); }, { mdocs: "incarcare" }),
      "gh-07a2": gh("#ghiseu/gh-4790/verificare", async (h) => { await h.click("[data-gh-paper]"); const canvas = await h.find("#dosar-detail-modal.is-active [data-dosar-doc-canvas]"); await h.wait(200); const pages = canvas.querySelectorAll(".e-permits-doc-page"); canvas.scrollTop += pages[pages.length - 1].getBoundingClientRect().top - canvas.getBoundingClientRect().top - 16; }),
      "gh-07a3": gh("#ghiseu/gh-4790/verificare", seq(ghReady, async (h) => { await h.click('[data-gh-preview="signed"]'); await h.find("#dosar-detail-modal.is-active [data-dosar-doc-canvas]"); })),
      "gh-07h": gh("#ghiseu/gh-4790/verificare", seq(async (h) => { await ghPaper(h); }, ghUpload("[data-gh-olograf]", "cerere-semnata.docx", 240000))),
      "gh-07i": gh("#ghiseu/gh-4790/verificare", seq(async (h) => { await ghPaper(h); await h.click("[data-gh-msign]"); }), { msignerr: "1" }),
      /* US-16 Livrare */
      "gh-08": gh("#ghiseu/gh-4790/verificare", seq(ghReady, next)),
      "gh-08a": gh("#ghiseu/gh-4790/verificare", seq(ghReady, next, async (h) => { await h.click("#gh-request-modal .e-permits-fo-delivery-paper"); await h.wait(300); await h.click('#gh-request-modal .e-permits-fo-delivery-option:has(input[value="courier"])'); await h.wait(400); })),
      /* US-237 Notă de plată (+ US-256 regenerare) */
      "gh-09": gh("#ghiseu/gh-4771/plata"),
      "gh-09a": gh("#ghiseu/gh-4771/plata", async (h) => { await h.click("[data-gh-mpay]"); }),
      "gh-09b": gh("#ghiseu/gh-4702/plata"),
      "gh-09c": gh("#ghiseu/gh-4702/plata", async (h) => { await h.click("[data-gh-regenerate]"); }),
      "gh-09d": gh("#ghiseu/gh-4771/livrare", seq(async (h) => { await h.click("#gh-request-modal .e-permits-fo-delivery-paper"); await h.wait(300); await h.click('#gh-request-modal .e-permits-fo-delivery-option:has(input[value="courier"])'); await h.wait(400); }, next), { taxa: "incompleta" }),
      /* US-238 Confirmare */
      "gh-10": gh("#ghiseu/gh-4765/plata", next),
      "gh-10a": gh("#ghiseu/gh-4771/plata", seq(async (h) => { await h.click("[data-gh-mpay]"); }, next, async (h) => { await h.click("[data-gh-submit]"); })),
      "gh-10b": gh("#ghiseu/gh-4765/plata", seq(next, async (h) => { await h.click("[data-gh-submit]"); }), { depunere: "eroare" }),
      "gh-10c": gh("#ghiseu/gh-4771/plata", seq(async (h) => { await h.click("[data-gh-mpay]"); }, next, async (h) => { await h.click("[data-gh-submit]"); }), { certerr: "1" }),
      /* finish-doc-error-filecard-v1: „Reîncercați” → the generated certificate card, focus on „Vezi documentul” */
      "gh-10c1": gh("#ghiseu/gh-4771/plata", seq(async (h) => { await h.click("[data-gh-mpay]"); }, next, async (h) => { await h.click("[data-gh-submit]"); }, async (h) => { await h.click("[data-gh-cert-retry]"); }), { certerr: "1" }),
      "gh-10d": gh("#ghiseu/gh-4771/plata", seq(async (h) => { await h.click("[data-gh-mpay]"); }, next, async (h) => { await h.click("[data-gh-submit]"); }, async (h) => { await h.click('[data-gh-preview="cert"]'); })),
      "gh-10e": gh("#ghiseu/gh-4805"),
      /* US-240 Eliminare + US-239 reluare / eliminare automată */
      "gh-11": ghList(seq(menu("tr[data-workplace-row='gh-4812']"), async (h) => { await h.click('[data-gh-remove="gh-4812"]'); })),
      "gh-11a": ghList(seq(menu("tr[data-workplace-row='gh-4771']"), async (h) => { await h.click('[data-gh-remove="gh-4771"]'); }, async (h) => { await h.click("[data-gh-remove-confirm]"); })),
      "gh-11b": ghList(seq(menu("tr[data-workplace-row='gh-4812']"), async (h) => { await h.click('[data-gh-remove="gh-4812"]'); }, async (h) => { await h.fill("#fo-gh-remove-reason", "Solicitantul a renunțat la cerere."); }, async (h) => { await h.click("[data-gh-remove-confirm]"); })),
      /* row-menu-no-disabled-only-v1: the paid draft (C-2026-004765) has no ⋮ — its only item („Elimină schița”) is unavailable */
      "gh-11c": ghList(async (h) => { await h.find("tr[data-workplace-row='gh-4765']"); }),
      "gh-11d": ghList(menu("tr[data-workplace-row='gh-4702']")),
      "gh-12": gh("#ghiseu/gh-4650"),
      /* no-continue-btn-v1: the draft ROW continues the request (no „Continuă” button) — gh-13 = Enter on the focused row,
         gh-13a = a click on the row, gh-13b = Space on a submitted row („Dosare nedistribuite”, no „Detalii”) */
      "gh-13": ghList(async (h) => { const row = await h.find("tr[data-workplace-row='gh-4790'][data-workplace-row-open]"); row.focus(); row.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); await h.find("[data-gh-panel='verificare']"); }),
      "gh-13a": ghList(async (h) => { await h.click("tr[data-workplace-row='gh-4790'] td[data-column='serviciu']"); await h.find("[data-gh-panel='verificare']"); }),
      "gh-13b": ghList(async (h) => { await h.click('[data-workplace-tab="submitted"]'); await h.wait(300); const row = await h.find("[data-registry-kind='ghiseu'] tr[data-workplace-row-open]"); row.focus(); row.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })); await h.find("#gh-request-modal.is-active, [data-gh-panel]"); })
    };
  }
})();
