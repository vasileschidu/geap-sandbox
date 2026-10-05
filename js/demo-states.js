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
  const bio = (tab, run) => svc(tab, run, BIO);

  /* shared click paths */
  const openTax = (taxId) => async (h) => { await h.click(`[data-pay-edit="${taxId}"]`); };
  const applyOneTariff = async (h) => {
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
  const dtplBuilder = async (h) => { await h.nth("[data-dtpl-open]", 0); };

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
    "svc-02": svc("request-types"),
    "svc-02a": svc("request-types", async (h) => { await h.click("[data-passport-configure-rt]"); }),
    "svc-03": svc("forms"),
    "svc-03a": svc("forms", rowMenu("[data-passport-body]")),
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
    "svc-04h2": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.choose("select[data-pay-tariff]", "tf-urgenta");
      await h.click('[data-pay-calc="reducere"]');
      await h.fill("#pay-percent", "50");
    }),
    "svc-04h3": bio("fees", async (h) => {
      await openTax("tax-bio-2")(h);
      await h.click('[data-pay-calc="reducere"]');
      await h.fill("#pay-percent", "50");
    }),
    "svc-04i": svc("fees", async (h) => { await h.click("[data-tax-configure]"); }),
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
    "svc-06": svc("dependencies"),
    "svc-07": svc("classifiers"),
    "svc-08": svc("templates"),
    "svc-08a": svc("templates", rowMenu("[data-dtpl-list]")),
    "svc-08b": svc("templates", async (h) => { await h.nth("[data-dtpl-edit]", 0); }),
    "svc-08c": svc("templates", async (h) => {
      await h.click("[data-dtpl-attach]");
      await h.click("#dtpl-attach-pick");
      await h.click("body > .e-permits-fo-select__list [role=option]");
    }),
    "svc-08d": svc("templates", async (h) => { await h.click("[data-dtpl-import]"); await h.click("[data-dtpl-import-save]"); }),
    "svc-08e": svc("templates", dtplBuilder),
    "svc-08f": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="test"]'); }),
    "svc-08g": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-view="preview"]'); }),
    "svc-08h": svc("templates", async (h) => { await dtplBuilder(h); await h.click('[data-dtpl-mode="html"]'); }),
    "svc-08i": svc("templates", async (h) => {
      await h.nth("[data-dtpl-open]", 1);
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
      await h.nth("[data-dtpl-open]", 1);
      const surface = await h.find("[data-dtpl-surface]");
      surface.focus();
      document.execCommand("insertText", false, " ");
      await h.click("[data-dtpl-save]");
      await h.click("[data-dtpl-publish]");
    }),
    "svc-08k": svc("templates", async (h) => { await rowMenu("[data-dtpl-list]")(h); await h.click("[data-dtpl-detach]"); }),
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
    "svc-10": svc("settings"),
    "svc-10a": svc("settings", async (h) => { await h.click('[data-svc-setting="aprobareSecundara"]'); await h.wait(300); await h.focus('[data-svc-setting="aprobareSecundara"]'); }),
    "svc-10b": svc("settings", async (h) => { await h.click('[data-svc-setting="aprobareSecundara"]'); await h.wait(300); await h.click("[data-service-publish]"); }),
    "svc-10c": svc("settings", async (h) => {
      await h.click('[data-svc-setting="aprobareSecundara"]');
      await h.wait(300);
      await h.click("[data-service-publish]");
      await h.fill("#ntpl-publish-modal textarea", "Aprobare secundară pentru actele emise de Direcția comerț.", { leave: false });
      await h.click("#ntpl-publish-modal .modal--footer .btn-primary");
    }),
    "svc-11": svc("events"),
    "svc-11a": svc("events", async (h) => { await h.fill("[data-svc-events-search]", "taxă", { leave: false }); }),
    "svc-11b": svc("events", async (h) => { await h.click('[data-svc-events-filter="failed"]'); })
  };
})();
