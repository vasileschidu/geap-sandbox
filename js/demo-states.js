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
  /* Setări: jump to a section from the section list */
  const cfgNav = (key) => async (h) => { await h.click(`[data-cfg2-nav="${key}"]`); await h.wait(500); };
  const bio = (tab, run) => svc(tab, run, BIO);

  /* shared click paths */
  const openTax = (taxId) => async (h) => { await h.click(`[data-pay-edit="${taxId}"]`); };
  const applyOneTariff = async (h) => {
    /* „Aplică ca atare” lives in the row's ⋮ (uniform row actions, 2026-10-09) */
    (await h.find("[data-tax-configure]")).closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
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
    await h.fill("#ntpl-c-plain", "e-Permis: cererea {{CaseNumber}} a fost suspendată. Încărcați documentele lipsă.").catch(() => {});
    if (step === 3) return;
    await h.click("[data-ntpl-c-next]");
    if (step === 4) return;
    await h.click("[data-ntpl-c-done]");
  };
  const ntplClone = async (h) => { await h.click("[data-ntpl-clone]"); };
  /* the constructor opens from the preview's footer („Deschide constructorul”) */
  const dtplOpenNth = (index) => async (h) => { await h.nth("[data-dtpl-preview]", index); await h.click("[data-tpl-preview-builder]"); };
  const dtplBuilder = dtplOpenNth(0);

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
    await h.fill("#ntplp-plain", "e-Permis: cererea {{CaseNumber}} a fost aprobată. Detalii în Cabinetul personal.");
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
  const ppCab = (run) => ({ page: "cabinet-evo/index.html", ready: "[data-cab-card]", run });
  const ppIntent = (run) => ({ page: PP_FO, flow: "full", hash: "#intent", ready: "[data-fo-intent-act], [data-fo-intent-empty]", run });
  const ppFo = (type, act, step = 1, run) => ({
    page: PP_FO,
    flow: "full",
    params: { pp: type, act },
    hash: step === 1 ? "#request" : `#request-step-${step}`,
    ready: "body[data-fo-postprocess] [data-fo-step-panel]:not([hidden]) h1",
    run: async (h) => { await clearToasts(h); if (run) await run(h); }
  });
  const ppReason = (value) => async (h) => {
    await h.click("[data-fo-step-panel='2'] [data-fo-pp-select='pp-reason'] .e-permits-fo-select__button");
    await h.click(".e-permits-fo-select__option", value);
  };

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
    "svc-01": svc("general"),
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
    "svc-04a": svc("fees", async (h) => { await h.click('[data-passport-body] [aria-label="Mai multe acțiuni: taxe"]'); }),
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
      edit.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
      await h.wait(400);
    }),
    "svc-04l": svc("fees", async (h) => {
      const edit = await h.find('[data-pay-edit="tax-4"]');
      edit.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]").click();
      await h.click('[data-passport-payment="tax-4"][data-passport-payment-action="delete"]');
    }),
    "svc-04m": svc("fees", async (h) => { await h.hover("[data-pay-edit]"); }),
    "svc-04n": svc("fees", async (h) => {
      const edit = await h.find("[data-pay-edit]");
      const more = edit.closest(".e-permits-stack__item").querySelector("[data-stack-menu-trigger]");
      more.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      await h.wait(800);
    }),
    "svc-05": bio("fees", async (h) => { await openTax("tax-bio-2")(h); await h.click("[data-tax-new-tariff]"); }),
    /* Administrare › Tarife → ✎ on a tariff from RSSP: registry fields read-only */
    "svc-05a": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="tariffs"]'); await h.click('[data-tariff-edit="tf-bio-autorizare"]'); } },
    "svc-05a": { flow: "back-office", as: ADMIN, hash: "#tariffs", run: async (h) => {
      const source = await h.find(".e-permits-workplace__source", "RSSP");
      source.closest("tr, [role=row]").querySelector("[data-tariff-edit]").click();
      await h.wait(600);
    } },
    /* Interdependențe live in Setări since 2026-10-07 (the old hash still lands there) */
    "svc-06": svc("settings"),
    "svc-06a": svc("documents"),
    /* a document hidden from the request: Obligatoriu turns off and locks */
    "svc-06b": svc("documents", async (h) => { await h.click('[data-svc-doc-visible="4"]'); await h.wait(500); }),
    /* header „N modificări nepublicate” → the list of pending changes */
    "svc-01i": svc("documents", async (h) => { await h.click('[data-svc-doc-required="3"]'); await h.wait(500); await h.click("[data-service-pending]"); }),
    "svc-02d": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="documents"]'); }),
    /* Documente generate › Previzualizează: the document of a step, read-only, left of the drawer */
    "svc-02d1": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="documents"]'); await h.click("[data-rt-doc-peek]"); }),
    "svc-02d2": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); await h.click('[data-rt-tab="notifications"]'); await h.click("[data-rt-doc-peek]"); }),
    "svc-07": svc("classifiers"),
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
    "svc-10a": svc("settings", async (h) => { await cfgNav("other")(h); await h.click('[data-cfg2-flag="aprobareSecundara"]'); await h.wait(300); }),
    "svc-10b": svc("settings", async (h) => { await cfgNav("other")(h); await h.click('[data-cfg2-flag="aprobareSecundara"]'); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(400); await h.click("[data-service-publish]"); }),
    "svc-10c": svc("settings", async (h) => {
      await cfgNav("other")(h);
      await h.click('[data-cfg2-flag="aprobareSecundara"]');
      await h.wait(300);
      await h.click("[data-cfg2-save]");
      await h.wait(400);
      await h.click("[data-service-publish]");
      await h.fill("#ntpl-publish-modal textarea", "Aprobare secundară pentru actele emise de Direcția comerț.", { leave: false });
      await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    }),
    "svc-10d": svc("settings", cfgNav("applicant")),
    "svc-10e": svc("settings", cfgNav("exam")),
    "svc-10e1": svc("settings", async (h) => { await cfgNav("exam")(h); await h.click('[data-cfg-switch="autoDist"]'); await h.wait(400); }),
    "svc-10f": svc("settings", cfgNav("suspension")),
    "svc-10g": svc("settings", cfgNav("signing")),
    "svc-10h": svc("settings", cfgNav("payment")),
    "svc-10h1": svc("settings", async (h) => { await h.fill("#cfg-mpayCode", ""); await h.fill("#cfg-payTerm", "0"); await h.wait(200); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10i": svc("settings", cfgNav("delivery")),
    "svc-10j": svc("settings", async (h) => { await cfgNav("appeal")(h); await h.click('[data-cfg-switch="appealable"]'); await h.wait(400); }),
    "svc-10j1": svc("settings", async (h) => { await cfgNav("appeal")(h); await h.click('[data-cfg-switch="appealable"]'); await h.wait(400); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10k": svc("settings", cfgNav("numbering")),
    "svc-10k1": svc("settings", async (h) => { await cfgNav("numbering")(h); await h.click("[data-cfg-rule-add]"); await h.fill('[data-cfg-rule="1"][data-cfg-rule-field="prefix"]', "DR"); }),
    "svc-10l": svc("settings", cfgNav("rap")),
    "svc-10m": svc("settings", cfgNav("drafts")),
    /* Interdependențe: inline blocks; add (type decides the fields), validation on Salvează,
       remove without a confirm (nothing applies before Salvează) */
    "svc-10n": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); await h.fill('[data-cfg2-dep]:last-of-type [data-cfg-input="name"]', "Act cadastral verificat"); await h.choose('[data-cfg2-dep]:last-of-type select[data-cfg-select="type"]', "Externă"); }),
    "svc-10n1": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10n2": svc("settings", cfgNav("deps")),
    "svc-10n3": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-remove]"); await h.wait(300); }),
    /* after a save: the header counts the changes as unpublished */
    "svc-10o": svc("settings", async (h) => { await cfgNav("suspension")(h); await h.click('[data-cfg-switch="suspSigned"]'); await h.wait(300); await h.click("[data-cfg2-save]"); await h.wait(400); }),
    /* aliases of the exploration states (svc-10v…) */
    "svc-10v": svc("settings"),
    "svc-10v1": svc("settings", async (h) => { await cfgNav("exam")(h); await h.click('[data-cfg-switch="distEligible"]'); await h.fill("#cfg-distMax", "20"); await h.wait(300); }),
    "svc-10v2": svc("settings", async (h) => { await h.fill("#cfg-payTerm", ""); await h.wait(200); await h.click("[data-cfg2-save]"); await h.wait(600); }),
    "svc-10v3": svc("settings", async (h) => { await cfgNav("deps")(h); await h.click("[data-cfg2-dep-add]"); await h.wait(300); }),
    "svc-10v4": svc("settings", async (h) => { await h.click('[data-cfg-switch="suspEditable"]'); await h.wait(300); await h.click('[data-passport-tab="forms"]'); }),
    "svc-11": svc("events"),
    "svc-11a": svc("events", async (h) => { await h.fill("[data-svc-events-search]", "taxă", { leave: false }); }),
    "svc-11b": svc("events", async (h) => { await h.click('[data-svc-events-filter="failed"]'); }),

    /* ---- Logare în Back Office / Admin Portal (US-105, US-110; US-107 / US-109 states) ---- */
    "auth-01": { page: "bo-login.html", ready: "[data-bo-login] h1" },
    "auth-01a": { page: "bo-login.html", params: { portal: "admin" }, ready: "[data-bo-login] h1" },
    "auth-01b": { page: "bo-login.html", params: { view: "redirecting" }, ready: "[data-bo-login] h1" },
    "auth-02": { page: "mpass-test.html", params: { return: "bo-login.html?mpass=ok&as=activ" }, ready: "h1" },
    "auth-03": { page: "bo-login.html", params: { mpass: "ok", as: "fara-cont" }, ready: "[data-bo-login] h1" },
    "auth-04": { page: "bo-login.html", params: { view: "retrying" }, ready: "[data-bo-login] h1" },
    "auth-04a": { page: "bo-login.html", params: { view: "unavailable" }, ready: "[data-bo-login] h1" },
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
    "trf-03c": trf(editTariff("tf-examinare-120")),
    "trf-03d": trf(async (h) => { await editTariff("tf-suprafata")(h); await h.click('[data-tariff-tab="suma"]'); }),
    "trf-03e": trf(async (h) => { await editTariff("tf-examinare-120")(h); await h.click('[data-tariff-tab="utilizare"]'); }),
    "trf-04": trf(async (h) => { await editTariff("tf-taxa-stat-50")(h); await h.click("[data-tariff-toggle-active]"); }),
    "trf-04a": trf(async (h) => { await editTariff("tf-vechi")(h); await h.click("[data-tariff-delete]"); }),
    "trf-04b": trf(async (h) => { await editTariff("tf-taxa-stat-50")(h); await h.hover("[data-tariff-delete]"); }),
    "trf-04c": trf(async (h) => { await editTariff("tf-vechi")(h); await h.click("[data-tariff-toggle-active]"); }),

    /* ---- Șabloane de notificare (Figma page "BO -> Șabloane de notificare") ---- */
    "ntpl-01": { flow: "back-office", as: ADMIN, run: async (h) => { await h.click('[data-nav-id="notification-templates"]'); } },
    "ntpl-02": ntpl("content"),
    "ntpl-02a": ntpl("content", async (h) => { await h.click('[data-ntplp-mode="html"]'); }),
    "ntpl-02b": ntpl("content", async (h) => { await h.click('[data-ntplp-preview="mobile"]'); }),
    "ntpl-02c": ntpl("content", async (h) => { await h.click('[aria-controls="ntpl-field-picker"]'); }),
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
    "ntpl-05": ntpl("content", ntplPublishOpen),
    "ntpl-05a": ntpl("content", ntplScheduled),
    "ntpl-05b": ntpl("content", async (h) => { await ntplPublishOpen(h); await h.click("[data-ntpl-publish-confirm]"); }),

    /* ---- Administrare › Clasificatoare (Figma page "BO -> Clasificatoare") ---- */
    "clf-01": clf("#classifiers"),
    "clf-01a": clf("#classifiers", async (h) => { await h.fill("[data-workplace-search]", "CAEM", { leave: false }); }),
    "clf-01b": clf("#classifiers", null, LOCAL_ADMIN),
    "clf-02": clf("#classifiers", clfNew),
    "clf-02a": clf("#classifiers", async (h) => { await clfNew(h); await h.click("[data-clas-create-next]"); }),
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
    "clf-03a": clfProfile("cl-statut", "valori", async (h) => { await h.nth("[data-clas-grid-select]", 0); await h.nth("[data-clas-grid-select]", 1); }),
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
    "pp-01": ppCab(),
    "pp-01a": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] [data-cab-menu-trigger]"); }),
    "pp-01b": ppCab(async (h) => { await h.click("[data-cab-card='act-piata-mare'] [data-cab-menu-trigger]"); }),
    "pp-01c": ppCab(async (h) => { await h.scroll("[data-cab-card='act-depozit-10']"); await h.click("[data-cab-card='act-depozit-10'] [data-cab-menu-trigger]"); }),
    "pp-01d": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] .cab-card__title"); }),
    "pp-01e": ppCab(async (h) => { await h.click("[data-cab-card='act-lab-10'] .cab-card__title"); }),
    "pp-01f": ppCab(async (h) => { await h.scroll("[data-cab-card='act-cofetaria']"); }),
    "pp-01g": ppCab(async (h) => { await h.click("[data-cab-card='act-izvoras'] [data-cab-menu-trigger]"); await h.click("[data-cab-card='act-izvoras'] [data-cab-pp='retragere']"); }),
    "pp-01h": ppCab(async (h) => { await h.click("[data-cab-chip='expirat']"); }),
    "pp-01i": ppCab(async (h) => { await h.click("[data-cab-card='act-bistro'] .cab-card__title"); }),
    "pp-02": ppIntent(),
    "pp-02a": ppIntent(async (h) => { await h.click("[data-fo-intent-act='act-izvoras'] [data-fo-intent-trigger]"); }),
    "pp-02b": ppIntent(async (h) => { await h.click("[data-fo-intent-act='act-izvoras'] [data-fo-intent-trigger]"); await h.click("[data-fo-intent-act='act-izvoras'] [data-fo-intent-postprocess='retragere']"); }),
    "pp-02c": ppIntent(async (h) => {
      await h.click("[data-fo-avatar-trigger]");
      await h.click("[data-fo-avatar-proxy-toggle]");
      await h.click("[data-fo-avatar-role][data-fo-subject-id='mpower-pj-nord-agro']");
      await h.find("[data-fo-intent-empty]");
    }),
    "pp-10": ppFo("reperfectare", "act-izvoras", 1),
    "pp-10a": ppFo("reperfectare", "act-izvoras", 2),
    "pp-10b": ppFo("reperfectare", "act-izvoras", 2, async (h) => { await ppReason("Alte")(h); await h.click("[data-fo-step-panel='2'] [data-fo-next]"); }),
    "pp-10c": ppFo("reperfectare", "act-izvoras", 3),
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
    "pp-16a": ppFo("reluare", "act-licenta-susp", 7)
  };
})();
