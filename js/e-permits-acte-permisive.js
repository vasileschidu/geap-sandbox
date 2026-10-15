(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function navigateRow(row) {
    const target = row.dataset.rowLink;
    if (!target) return;
    window.location.hash = target;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  document.addEventListener("DOMContentLoaded", () => {
    function normalizeDemoFlow(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (["full", "full-flow", "09", "09-full", "09-full-flow", "front-office", "frontoffice"].includes(normalized)) return "full";
      if (["builder", "form-builder", "build"].includes(normalized)) return "builder";
      if (["back-office", "backoffice", "profile", "dabel", "dashboard", "back"].includes(normalized)) return "back-office";
      /* eKYC back office: the same shell (js/ekyc.js plugs its pages in) */
      if (normalized === "ekyc") return "back-office";
      return "";
    }

    /* step ⇄ hash lives in one place so adding a step is a panel + a schema
       entry, not another rung on four separate ladders */
    function frontOfficeStepFromHash(hash = window.location.hash) {
      if (hash === "#request") return 1;
      const match = /^#request-step-([2-9])$/.exec(hash);
      return match ? Number(match[1]) : 0;
    }

    function frontOfficeStepHash(step) {
      return Number(step) === 1 ? "#request" : `#request-step-${Number(step)}`;
    }

    function currentDemoFlow() {
      const params = new URLSearchParams(window.location.search);
      const flow = normalizeDemoFlow(params.get("flow"));
      if (flow === "full" && !["#choice", "#choice-authenticated", "#intent", "#access", "#guest"].includes(window.location.hash) && !frontOfficeStepFromHash()) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      if (flow) return flow;
      return "home";
    }

    const demoFlow = currentDemoFlow();
    document.body.dataset.demoFlow = demoFlow;

    const frontOfficeAuthButton = document.querySelector("[data-fo-authenticate]");
    const frontOfficeAuthScreen = document.querySelector("[data-fo-screen='auth']");
    const frontOfficeChoiceScreen = document.querySelector("[data-fo-screen='choice']");
    const frontOfficeRequestScreen = document.querySelector("[data-fo-screen='request']");
    const frontOfficeGuestScreen = document.querySelector("[data-fo-screen='guest']");
    const frontOfficeAccessScreen = document.querySelector("[data-fo-screen='access']");
    const frontOfficeIntentScreen = document.querySelector("[data-fo-screen='intent']");
    const frontOfficeRoot = document.querySelector(".e-permits-fo-auth");
    const frontOfficeMain = document.querySelector(".e-permits-fo-auth__main");
    const frontOfficeConsent = document.querySelector("[data-fo-consent]");
    const frontOfficeStep1NextButton = document.querySelector("[data-fo-next='step-1']");
    const frontOfficeStepPanels = document.querySelectorAll("[data-fo-step-panel]");
    let frontOfficeStepperItems = document.querySelectorAll("[data-fo-step]");
    const frontOfficeMobileProgress = document.querySelector("[data-fo-mobile-progress]");
    const frontOfficeMobileProgressLabel = document.querySelector("[data-fo-mobile-progress-label]");
    const frontOfficeMobileProgressCurrent = document.querySelector("[data-fo-mobile-progress-current]");
    const frontOfficeMobileProgressTotal = document.querySelector("[data-fo-mobile-progress-total]");
    const frontOfficeBetaBanner = document.querySelector("[data-fo-beta-banner]");
    const frontOfficeBetaClose = document.querySelector("[data-fo-beta-close]");
    const frontOfficeAvatarMenu = document.querySelector("[data-fo-avatar-menu]");
    const frontOfficeAvatarTrigger = document.querySelector("[data-fo-avatar-trigger]");
    const frontOfficeAvatarDropdown = document.querySelector("[data-fo-avatar-dropdown]");
    const frontOfficeHeaderDraft = document.querySelector("[data-fo-header-draft]");
    const frontOfficeInstanceSwitchModal = document.querySelector("[data-fo-instance-switch-modal]");
    const frontOfficeScriptSrc = document.querySelector("script[src*='e-permits-acte-permisive.js']")?.src || "";
    let frontOfficeSchema = null;
    let frontOfficeSchemaLoadPromise = null;
    let frontOfficeSelectedSubject = null;
    let frontOfficeSubjectLoadTimer = null;
    let frontOfficeSubjectLoadToken = 0;
    let frontOfficeDraftCreated = false;
    /* the "creată ca schiță" toast is a one-shot per request, not per step */
    let frontOfficeDraftToastShown = false;
    let frontOfficeDraftSavedAt = null;
    let frontOfficeDraftInfoDismissed = false;
    let frontOfficeInstanceSwitchReturnFocus = null;
    let frontOfficePendingSubjectId = null;
    /* guest mode (no MPass): set by „Înainte” on the guest „Date solicitant” — see the
       „Guest requestor” block; null on the authenticated path */
    let frontOfficeGuest = null;
    const dropdownMotionTimers = new WeakMap();
    const modalMotionTimers = new WeakMap();

    function setDropdownHidden(element, shouldHide) {
      if (!element) return;
      const existingTimer = dropdownMotionTimers.get(element);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        dropdownMotionTimers.delete(element);
      }

      if (!shouldHide) {
        element.classList.remove("is-closing");
        element.hidden = false;
        return;
      }

      if (element.hidden) return;
      element.classList.add("is-closing");
      const timer = window.setTimeout(() => {
        element.hidden = true;
        element.classList.remove("is-closing");
        dropdownMotionTimers.delete(element);
      }, 105);
      dropdownMotionTimers.set(element, timer);
    }

    function setMotionModalHidden(element, shouldHide, duration = 135) {
      if (!element) return;
      const existingTimer = modalMotionTimers.get(element);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        modalMotionTimers.delete(element);
      }

      if (!shouldHide) {
        element.classList.remove("is-closing");
        element.hidden = false;
        return;
      }

      if (element.hidden) return;
      element.classList.add("is-closing");
      const timer = window.setTimeout(() => {
        element.hidden = true;
        element.classList.remove("is-closing");
        modalMotionTimers.delete(element);
      }, duration);
      modalMotionTimers.set(element, timer);
    }

    function escapeFrontOfficeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    /* toasts are the product toast (js/toast.js → library .toast) */
    function showFrontOfficeToast(message = "Schița a fost salvată.") {
      window.GEAPToast?.show({ type: "success", message, key: "fo-transient" });
    }

    /* EVO Cabinet › Solicitările mele: every exit of the wizard lands there (US-18 AC-04/10,
       US-21 / US-29): the filed dosar on top as „În derulare”, a saved draft as „Schiță” at the
       step it was left on. The cabinet reads depus / schita / pas / obiect / pp / act. */
    function frontOfficeSolicitariUrl(extra = {}) {
      const query = new URLSearchParams({ view: "solicitari" });
      Object.entries(extra).forEach(([key, value]) => { if (value) query.set(key, value); });
      const ctx = typeof frontOfficePostprocess === "undefined" ? null : frontOfficePostprocess;
      if (ctx?.pp?.id && ctx?.act?.id) { query.set("pp", ctx.pp.id); query.set("act", ctx.act.id); }
      const object = document.querySelector("#fo-object-name")?.value?.trim() || ctx?.act?.name || "";
      if (object) query.set("obiect", object);
      if (ctx?.act?.subdivision) query.set("subdiviziune", ctx.act.subdivision);
      return `cabinet-evo/?${query.toString()}`;
    }

    function frontOfficeDraftUrl() {
      const step = Number(document.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
      return frontOfficeSolicitariUrl({ schita: "1", pas: String(step) });
    }

    function showFrontOfficeDraftCreatedToast() {
      if (frontOfficeDraftToastShown) return;
      frontOfficeDraftToastShown = true;
      window.GEAPToast?.show({
        type: "success",
        title: "Cererea a fost creată ca schiță",
        message: "O poți relua oricând din Solicitările mele.",
        link: { href: frontOfficeDraftUrl(), label: "Deschide Solicitările mele" },
        duration: 5000,
        key: "fo-draft-created"
      });
    }

    function frontOfficeTimeLabel(date = new Date()) {
      return new Intl.DateTimeFormat("ro-MD", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    }

    function updateFrontOfficeHeaderDraft() {
      if (!frontOfficeHeaderDraft) return;
      /* once paid, the request is filed — the Finalizare step must not claim
         it is still "Salvat ca schiță" */
      const isSubmitted = Boolean(frontOfficeRequestScreen?.querySelector("[data-fo-step-panel='7']:not([hidden])"));
      const shouldShow = frontOfficeDraftCreated && frontOfficeRequestScreen && !frontOfficeRequestScreen.hidden && !isSubmitted;
      frontOfficeHeaderDraft.hidden = !shouldShow;
      if (!shouldShow) {
        frontOfficeHeaderDraft.innerHTML = "";
        return;
      }

      frontOfficeHeaderDraft.innerHTML = `
        <span class="e-permits-fo-draft-status__saved">
          <svg class="icon" width="16" height="16" aria-hidden="true">
            <use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-success"></use>
          </svg>
          <span class="e-permits-fo-draft-status__label">Salvat ca schiță</span>
        </span>
        <a class="e-permits-fo-draft-status__link" href="${escapeFrontOfficeHtml(frontOfficeDraftUrl())}">Solicitările mele</a>
        <span class="e-permits-fo-draft-status__dot" aria-hidden="true"></span>
        <time class="e-permits-fo-draft-status__time" datetime="${frontOfficeDraftSavedAt ? frontOfficeDraftSavedAt.toISOString() : ""}" data-fo-draft-time>
          ${escapeFrontOfficeHtml(frontOfficeTimeLabel(frontOfficeDraftSavedAt || new Date()))}
        </time>
      `;
    }

    function requestHeaderHtml({ id, title }) {
      return `
        <h1 id="${escapeFrontOfficeHtml(id)}" tabindex="-1">${escapeFrontOfficeHtml(title)}</h1>
      `;
    }

    function updateFrontOfficeRequestHeaders() {
      document.querySelectorAll("[data-fo-step-panel]").forEach((panel) => {
        const header = panel.querySelector(":scope > .e-permits-fo-form__header");
        if (!header) return;
        const step = Number(panel.dataset.foStepPanel) || 1;
        const currentHeading = header.querySelector("h1");
        const title = header.dataset.foTitle || currentHeading?.textContent?.trim() || (step === 1 ? "Date solicitant" : `Pasul ${step}`);
        const id = header.dataset.foTitleId || currentHeading?.id || `fo-request-step-${step}-title`;
        header.dataset.foTitle = title;
        header.dataset.foTitleId = id;
        header.innerHTML = requestHeaderHtml({ id, title });
      });
      updateFrontOfficeHeaderDraft();
    }

    function saveFrontOfficeDraft({ toast = false } = {}) {
      /* US-21: drafts live in EVO Cabinet — a guest (no account) has none */
      if (frontOfficeGuest) return;
      const isNewDraft = !frontOfficeDraftCreated;
      frontOfficeDraftCreated = true;
      frontOfficeDraftSavedAt = new Date();
      updateFrontOfficeRequestHeaders();
      if (isNewDraft && !toast) showFrontOfficeDraftCreatedToast();
      if (toast) showFrontOfficeToast("Schița a fost salvată.");
    }

    function frontOfficeFlowId() {
      const params = new URLSearchParams(window.location.search);
      return params.get("serviceFlow") || params.get("service-flow") || document.body.dataset.serviceFlow || "09-full-flow";
    }

    function frontOfficeSchemaUrls() {
      const urls = ["data/acte-permisive.json"];
      if (frontOfficeScriptSrc) {
        urls.unshift(new URL("../data/acte-permisive.json", frontOfficeScriptSrc).toString());
      }
      return [...new Set(urls)];
    }

    function setFrontOfficeAvatarMenuOpen(isOpen) {
      if (!frontOfficeAvatarMenu || !frontOfficeAvatarTrigger || !frontOfficeAvatarDropdown) return;
      frontOfficeAvatarMenu.classList.toggle("is-open", isOpen);
      setDropdownHidden(frontOfficeAvatarDropdown, !isOpen);
      frontOfficeAvatarTrigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) requestAnimationFrame(updateFrontOfficeAvatarMenuScrollState);
    }

    function toggleFrontOfficeAvatarMenu() {
      const isOpen = frontOfficeAvatarMenu?.classList.contains("is-open");
      setFrontOfficeAvatarMenuOpen(!isOpen);
    }

    function resetFrontOfficeDraftState() {
      frontOfficeDraftCreated = false;
      frontOfficeDraftSavedAt = null;
      frontOfficeDraftInfoDismissed = false;
      frontOfficeDraftToastShown = false;
      document.querySelector('[data-toast-key="fo-draft-created"]')?.remove();
      updateFrontOfficeRequestHeaders();
    }

    function setFrontOfficeInstanceSwitchModalOpen(isOpen, { restoreFocus = true } = {}) {
      if (!frontOfficeInstanceSwitchModal) return;
      if (isOpen) {
        frontOfficeInstanceSwitchReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setMotionModalHidden(frontOfficeInstanceSwitchModal, false);
        frontOfficeInstanceSwitchModal.querySelector(".e-permits-fo-instance-switch-modal__card")?.focus({ preventScroll: true });
        return;
      }

      setMotionModalHidden(frontOfficeInstanceSwitchModal, true);
      if (restoreFocus) {
        const focusTarget = frontOfficeInstanceSwitchReturnFocus || frontOfficeAvatarTrigger;
        focusTarget?.focus?.({ preventScroll: true });
      }
      frontOfficeInstanceSwitchReturnFocus = null;
    }

    function frontOfficeInstanceSwitchSubject(subjectId) {
      if (!subjectId || !frontOfficeSchema) return null;
      return frontOfficeSelectableSubjects(frontOfficeSchema).find((subject) => subject.id === subjectId) || null;
    }

    function updateFrontOfficeInstanceSwitchModal(targetSubjectId = null) {
      if (!frontOfficeInstanceSwitchModal) return;
      const currentName = frontOfficeSelectedSubject?.name || "solicitantul curent";
      const targetSubject = frontOfficeInstanceSwitchSubject(targetSubjectId);
      const current = frontOfficeInstanceSwitchModal.querySelector("[data-fo-instance-switch-current]");
      const target = frontOfficeInstanceSwitchModal.querySelector("[data-fo-instance-switch-target]");
      const targetCopy = frontOfficeInstanceSwitchModal.querySelector("[data-fo-instance-switch-target-copy]");

      if (current) current.textContent = `(${currentName.toLocaleUpperCase("ro-RO")})`;
      /* the draft it becomes is listed in EVO Cabinet › Solicitările mele (new tab: the switch continues here) */
      const draftLink = frontOfficeInstanceSwitchModal.querySelector("[data-fo-instance-switch-link]");
      if (draftLink) draftLink.href = frontOfficeDraftUrl();
      if (targetSubject && target && targetCopy) {
        target.textContent = targetSubject.name;
        targetCopy.innerHTML = `Vei începe o cerere nouă ca <strong data-fo-instance-switch-target>${escapeFrontOfficeHtml(targetSubject.name)}</strong>.`;
      } else if (targetCopy) {
        targetCopy.textContent = "Vei reveni la alegerea rolului pentru a începe o cerere nouă.";
      }
    }

    function openFrontOfficeInstanceSwitchModal({ targetSubjectId = null } = {}) {
      frontOfficePendingSubjectId = targetSubjectId;
      updateFrontOfficeInstanceSwitchModal(targetSubjectId);
      setFrontOfficeAvatarMenuOpen(false);
      setFrontOfficeInstanceSwitchModalOpen(true);
    }

    function confirmFrontOfficeInstanceSwitch() {
      const targetSubjectId = frontOfficePendingSubjectId;
      frontOfficePendingSubjectId = null;
      saveFrontOfficeDraft();
      setFrontOfficeInstanceSwitchModalOpen(false, { restoreFocus: false });
      resetFrontOfficeDraftState();

      if (targetSubjectId) {
        const selected = selectFrontOfficeSubject(targetSubjectId);
        if (selected) {
          history.replaceState(null, "", "#request");
          showFrontOfficeRequest({ step: 1 });
          return;
        }
      }

      if (window.location.hash !== "#choice") {
        history.replaceState(null, "", "#choice");
      }
      showFrontOfficeChoice();
    }

    function requestFrontOfficeInstanceSwitch({ forceChoice = false, targetSubjectId = null } = {}) {
      const activeStep = Number(document.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
      const isRequestOpen = Boolean(frontOfficeRequestScreen && !frontOfficeRequestScreen.hidden);
      if ((isRequestOpen && activeStep >= 2) || forceChoice) {
        openFrontOfficeInstanceSwitchModal({ targetSubjectId });
        return false;
      }
      return true;
    }

    function updateFrontOfficeAvatarMenuScrollState() {
      if (!frontOfficeAvatarDropdown) return;
      const content = frontOfficeAvatarDropdown.querySelector(".e-permits-fo-avatar-menu__content");
      if (!content) return;
      const hasScroll = content.scrollHeight > content.clientHeight + 1;
      const isScrolled = content.scrollTop > 0;
      frontOfficeAvatarDropdown.classList.toggle("has-scroll", hasScroll);
      frontOfficeAvatarDropdown.classList.toggle("is-scrolled", isScrolled);
    }

    function frontOfficeAllowedTypes(schema = frontOfficeSchema) {
      return Array.isArray(schema?.auth?.availableFor) && schema.auth.availableFor.length
        ? schema.auth.availableFor
        : ["PF", "PJ"];
    }

    function frontOfficeNotarialProxySubject(schema = frontOfficeSchema) {
      const proxy = schema?.proxyOption;
      if (!proxy) return null;
      const allowed = frontOfficeAllowedTypes(schema);
      const type = allowed.includes(proxy.type) ? proxy.type : allowed.includes("PJ") ? "PJ" : allowed[0];
      if (!type || !proxy.visibleWhenAnyOf?.some((item) => allowed.includes(item))) return null;
      return {
        id: proxy.subjectId || "notarial-proxy",
        type,
        scenario: "notarial-proxy",
        name: proxy.label || "Am procură notarială",
        avatarTone: proxy.avatarTone || "neutral",
        avatarIcon: proxy.icon || "icon-identity",
        roleLabel: proxy.roleLabel || "Cu procură notarială",
        representative: schema?.authenticatedUser || null,
        requestData: proxy.requestData || {
          sectionTitle: "Date organizație reprezentată",
          fields: [],
        },
        contact: proxy.contact || schema?.authenticatedUser?.contact || null,
        selectable: true,
      };
    }

    function frontOfficeSelectableSubjects(schema = frontOfficeSchema) {
      const allowed = frontOfficeAllowedTypes(schema);
      return [
        ...(schema?.subjects || []).filter((subject) => allowed.includes(subject.type)),
        frontOfficeNotarialProxySubject(schema),
      ].filter(Boolean);
    }

    function frontOfficeSubjectTypeMeta(type) {
      return frontOfficeSchema?.subjectTypes?.[type] || {
        label: type,
        icon: type === "PF" ? "icon-person" : "icon-business",
        idLabel: type === "PF" ? "IDNP" : "IDNO",
      };
    }

    function subjectInitials(subject) {
      if (!subject) return "";
      if (subject.initials) return subject.initials;
      return String(subject.name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }

    function subjectAvatarTone(subject) {
      if (subject?.avatarTone === "brand" || subject?.avatarTone === "apricot") return subject.avatarTone;
      return subject?.authorization || subject?.badge ? "apricot" : "brand";
    }

    function subjectInitialsAvatarHtml(subject, className = "e-permits-fo-auth__role-avatar") {
      const tone = ` ${className}--${escapeFrontOfficeHtml(subjectAvatarTone(subject))}`;
      const meta = frontOfficeSubjectTypeMeta(subject?.type);
      if (subject?.type === "PJ") {
        const icon = subject.avatarIcon || meta.icon || "icon-business";
        return `
          <span class="${className} ${className}--icon${tone}" aria-hidden="true">
            <svg class="icon" width="20" height="20">
              <use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(icon)}"></use>
            </svg>
          </span>
        `;
      }
      const initials = (subjectInitials(subject) || "PF").slice(0, 2);
      return `
        <span class="${className} ${className}--initials${tone}" aria-hidden="true">
          ${escapeFrontOfficeHtml(initials)}
        </span>
        `;
    }

    function subjectAvatarGlyphHtml(subject) {
      const meta = frontOfficeSubjectTypeMeta(subject?.type);
      if (subject?.type === "PJ") {
        const icon = subject.avatarIcon || meta.icon || "icon-suitcase-2";
        return `
          <svg class="icon" width="20" height="20">
            <use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(icon)}"></use>
          </svg>
        `;
      }
      return escapeFrontOfficeHtml((subjectInitials(subject) || "PF").slice(0, 2));
    }

    function subjectCompositeAvatarHtml(subject, className, { overlaySubject = null } = {}) {
      const kind = subject?.type === "PJ" ? "icon" : "initials";
      const tone = subjectAvatarTone(subject);
      const overlayKind = overlaySubject?.type === "PJ" ? "icon" : "initials";
      const overlayTone = overlaySubject ? subjectAvatarTone(overlaySubject) : "";
      return `
        <span class="${className} ${className}--${kind} ${className}--${escapeFrontOfficeHtml(tone)}${overlaySubject ? ` ${className}--with-overlay` : ""}" aria-hidden="true">
          ${subjectAvatarGlyphHtml(subject)}
          ${overlaySubject ? `
            <span class="${className}-overlay ${className}-overlay--${overlayKind} ${className}-overlay--${escapeFrontOfficeHtml(overlayTone)}">
              ${subjectAvatarGlyphHtml(overlaySubject)}
            </span>
          ` : ""}
        </span>
      `;
    }

    function subjectAvatarHtml(subject, className = "e-permits-fo-auth__role-avatar", { forceInitials = false } = {}) {
      const meta = frontOfficeSubjectTypeMeta(subject?.type);
      if (forceInitials) return subjectInitialsAvatarHtml(subject, className);
      if (subject?.initials || subject?.type === "PJ") return subjectInitialsAvatarHtml(subject, className);
      return `
        <span class="${className}" aria-hidden="true">
          <svg class="icon" width="20" height="20">
            <use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(meta.icon)}"></use>
          </svg>
        </span>
        `;
    }

    function subjectMetaText(subject) {
      const idLabel = subject?.idLabel || frontOfficeSubjectTypeMeta(subject?.type).idLabel || "";
      const idValue = subject?.idValue || "";
      return idLabel && idValue ? `${idLabel} ${idValue}` : "";
    }

    function subjectMetaHtml(subject, className = "e-permits-fo-auth__role-meta") {
      const idLabel = subject?.idLabel || frontOfficeSubjectTypeMeta(subject?.type).idLabel || "";
      const idValue = subject?.idValue || "";
      if (!idLabel || !idValue) return "";
      return `
        <span class="${escapeFrontOfficeHtml(className)} e-permits-fo-subject-meta">
          <span class="e-permits-fo-subject-meta__label">${escapeFrontOfficeHtml(idLabel)}</span>
          <span class="e-permits-fo-subject-meta__code">${escapeFrontOfficeHtml(idValue)}</span>
        </span>
      `;
    }

    function subjectTypeText(subject) {
      return subject?.roleLabel || frontOfficeSubjectTypeMeta(subject?.type).label || subject?.type || "";
    }

    function authorizationRoleMetaHtml(subject) {
      const idLabel = subject?.idLabel || frontOfficeSubjectTypeMeta(subject?.type).idLabel || "";
      const idValue = subject?.idValue || "";
      if (!idLabel || !idValue) return "";
      return `
        <span class="e-permits-fo-auth__role-meta e-permits-fo-auth__role-meta--authorization e-permits-fo-subject-meta">
          <span class="e-permits-fo-subject-meta__label">${escapeFrontOfficeHtml(idLabel)}</span>
          <span class="e-permits-fo-subject-meta__code">${escapeFrontOfficeHtml(idValue)}</span>
        </span>
      `;
    }

    function headerRoleSwitchHtml(subject) {
      const metaText = subjectTypeText(subject);
      const overlaySubject = subject?.authorization ? representativeForSubject(subject) : null;
      return `
        <span class="e-permits-fo-auth__avatar-inner">
          ${subjectCompositeAvatarHtml(subject, "e-permits-fo-auth__avatar-badge", { overlaySubject })}
          <span class="e-permits-fo-auth__avatar-copy">
            <span class="e-permits-fo-auth__avatar-name">${escapeFrontOfficeHtml(subject?.name || "")}</span>
            <span class="e-permits-fo-auth__avatar-meta">${escapeFrontOfficeHtml(metaText)}</span>
          </span>
          <svg class="icon e-permits-fo-auth__avatar-chevron" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
          </svg>
        </span>
      `;
    }

    function setServiceHeaderFromSchema(schema) {
      const service = schema?.service;
      if (!service) return;
      const title = document.querySelector(".e-permits-fo-auth__service-title-row h1");
      const type = document.querySelector(".e-permits-fo-auth__service-type");
      const serviceCardTag = document.querySelector(".e-permits-fo-service-card__tag");
      const serviceCardTitle = document.querySelector(".e-permits-fo-service-card h2");
      const serviceCardTerm = document.querySelector(".e-permits-fo-service-card dl div:nth-child(1) dd");
      const serviceCardCost = document.querySelector(".e-permits-fo-service-card dl div:nth-child(2) dd");
      if (title) title.textContent = service.title || title.textContent;
      if (type) type.textContent = service.type || service.category || type.textContent;
      if (serviceCardTag) serviceCardTag.textContent = service.tag || service.type || serviceCardTag.textContent;
      if (serviceCardTitle) serviceCardTitle.textContent = service.shortTitle || service.title || serviceCardTitle.textContent;
      if (serviceCardTerm) serviceCardTerm.textContent = service.term || serviceCardTerm.textContent;
      if (serviceCardCost) serviceCardCost.textContent = service.cost || serviceCardCost.textContent;
      document.title = `${service.code || "09"} · ${service.shortTitle || service.title || "Act permisiv"}`;
    }

    function setBetaBannerFromSchema(schema) {
      const banner = schema?.banner;
      if (!frontOfficeBetaBanner || !banner) return;
      frontOfficeBetaBanner.hidden = banner.visible === false;
      const tag = frontOfficeBetaBanner.querySelector(".e-permits-fo-auth__beta-tag");
      const text = frontOfficeBetaBanner.querySelector(".e-permits-fo-auth__beta-content p");
      if (tag) tag.textContent = banner.tag || "Beta";
      if (text) {
        text.innerHTML = `
          ${escapeFrontOfficeHtml(banner.text || "")}
          ${banner.linkLabel ? ` <a href="#">${escapeFrontOfficeHtml(banner.linkLabel)}</a>` : ""}
          ${banner.suffix ? ` ${escapeFrontOfficeHtml(banner.suffix)}` : ""}
        `.trim();
      }
    }

    function renderAvailabilityFromSchema(schema) {
      const tagList = document.querySelector(".e-permits-fo-auth__tags");
      if (!tagList) return;
      tagList.innerHTML = frontOfficeAllowedTypes(schema).map((type) => {
        const meta = schema?.subjectTypes?.[type] || frontOfficeSubjectTypeMeta(type);
        return `
          <span class="e-permits-fo-auth__tag" data-fo-available-type="${escapeFrontOfficeHtml(type)}">
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(meta.icon)}"></use>
            </svg>
            <span>${escapeFrontOfficeHtml(meta.label)}</span>
          </span>
        `;
      }).join("");
    }

    function setAuthFromSchema(schema) {
      const auth = schema?.auth;
      const service = schema?.service || {};
      if (!auth) return;
      const title = document.querySelector("#fo-auth-title");
      const description = document.querySelector(".e-permits-fo-auth__description");
      const button = document.querySelector("[data-fo-authenticate]");
      const buttonLogo = button?.querySelector(".btn-badge__logo img");
      const buttonLabel = button?.querySelector(".btn-badge__label");
      if (title) title.textContent = auth.title || title.textContent;
      if (description) {
        const serviceName = service.shortTitle || service.title || "serviciu";
        const descriptionText = (auth.descriptionTemplate || "")
          .replace("{serviceShortTitle}", serviceName)
          .replace("{serviceTitle}", service.title || serviceName);
        description.innerHTML = descriptionText
          ? escapeFrontOfficeHtml(descriptionText).replace(escapeFrontOfficeHtml(serviceName), `<strong>${escapeFrontOfficeHtml(serviceName)}</strong>`)
          : description.innerHTML;
      }
      if (button) button.hidden = auth.required === false;
      if (buttonLogo && auth.provider?.logo) buttonLogo.src = auth.provider.logo;
      if (buttonLabel && auth.provider?.label) buttonLabel.textContent = auth.provider.label;
      renderAvailabilityFromSchema(schema);
    }

    function roleBlockedNoteHtml(subject) {
      if (subject.selectable !== false || !subject.blockedReason) return "";
      return `
        <span class="e-permits-fo-auth__role-blocked">
          <svg class="icon" width="16" height="16" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-warning-filled"></use>
          </svg>
          <span>${escapeFrontOfficeHtml(subject.blockedReason)}</span>
        </span>
      `;
    }

    function renderRoleButton(subject) {
      const selectable = subject.selectable !== false;
      const isAuthorization = Boolean(subject.authorization);
      const badgeData = isAuthorization ? (subject.badge || { label: "Împuternicire", icon: "icon-identity" }) : subject.badge;
      const badge = badgeData ? `
        <span class="e-permits-fo-auth__warning-tag">
          <svg class="icon" width="16" height="16" aria-hidden="true">
            <use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(badgeData.icon || "icon-identity")}"></use>
          </svg>
          <span>${escapeFrontOfficeHtml(badgeData.label || "Împuternicire")}</span>
        </span>
      ` : "";
      return `
        <button class="e-permits-fo-auth__role-item${isAuthorization ? " is-authorization" : ""}${selectable ? "" : " is-disabled"}" type="button" data-fo-open-request data-fo-subject-id="${escapeFrontOfficeHtml(subject.id)}" ${selectable ? "" : "disabled aria-disabled=\"true\""}>
          <span class="e-permits-fo-auth__role-row">
            ${subjectAvatarHtml(subject, "e-permits-fo-auth__role-avatar", { forceInitials: true })}
            <span class="e-permits-fo-auth__role-text">
              ${badge ? `
                <span class="e-permits-fo-auth__role-heading">
                  <span class="e-permits-fo-auth__role-name">${escapeFrontOfficeHtml(subject.name)}</span>
                  ${badge}
                </span>
              ` : `<span class="e-permits-fo-auth__role-name">${escapeFrontOfficeHtml(subject.name)}</span>`}
              ${isAuthorization ? authorizationRoleMetaHtml(subject) : subjectMetaHtml(subject)}
              ${roleBlockedNoteHtml(subject)}
            </span>
            <svg class="e-permits-fo-auth__role-arrow icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-right"></use>
            </svg>
          </span>
        </button>
      `;
    }

    function renderRoleCollapsePreview(subjects) {
      const previewSubjects = subjects.slice(0, 4);
      return `
        <span class="e-permits-fo-auth__role-collapse-preview" aria-hidden="true">
          <span class="e-permits-fo-auth__role-collapse-stack">
            ${previewSubjects.map((subject, index) => {
              if (index === 3 && subjects.length > 4) {
                return `<span class="e-permits-fo-auth__role-collapse-avatar e-permits-fo-auth__role-collapse-avatar--counter">+${escapeFrontOfficeHtml(subjects.length - 3)}</span>`;
              }
              return subjectInitialsAvatarHtml(subject, "e-permits-fo-auth__role-collapse-avatar");
            }).join("")}
          </span>
          <span class="e-permits-fo-auth__role-collapse-arrow">
            <svg class="icon" width="16" height="16">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </span>
        </span>
      `;
    }

    function renderRoleGroup(title, subjects, options = {}) {
      if (!subjects.length) return "";
      const collapseAfter = Number(options.collapseAfter) || 0;
      const shouldCollapse = collapseAfter > 0 && subjects.length > collapseAfter;
      const visibleSubjects = shouldCollapse ? [] : subjects;
      const hiddenSubjects = shouldCollapse ? subjects : [];
      return `
        <section class="e-permits-fo-auth__role-group${shouldCollapse ? " is-collapsible" : ""}" aria-label="${escapeFrontOfficeHtml(title)}" ${shouldCollapse ? "data-fo-role-collapse-group" : ""}>
          <h2 class="e-permits-fo-auth__role-group-title">${escapeFrontOfficeHtml(title)}</h2>
          ${visibleSubjects.length ? `
            <div class="e-permits-fo-auth__role-group-list">
              ${visibleSubjects.map(renderRoleButton).join("")}
            </div>
          ` : ""}
          ${shouldCollapse ? `
            <button class="e-permits-fo-auth__role-collapse-toggle" type="button" aria-expanded="false" data-fo-role-collapse-toggle>
              <span class="e-permits-fo-auth__role-collapse-label" data-fo-role-collapse-label>Arată mai multe</span>
              ${renderRoleCollapsePreview(hiddenSubjects)}
            </button>
            <div class="e-permits-fo-auth__role-collapse" data-fo-role-collapse-panel>
              <div class="e-permits-fo-auth__role-group-list">
                ${hiddenSubjects.map(renderRoleButton).join("")}
              </div>
            </div>
          ` : ""}
        </section>
      `;
    }

    function renderRoleCluster(subjects) {
      if (!subjects.length) return "";
      return `
        <div class="e-permits-fo-auth__role-group-list">
          ${subjects.map(renderRoleButton).join("")}
        </div>
      `;
    }

    function renderRolesFromSchema(schema) {
      const roleList = frontOfficeChoiceScreen?.querySelector(".e-permits-fo-auth__role-list");
      const proxyButton = document.querySelector(".e-permits-fo-auth__role-item--dashed");
      const proxySeparator = document.querySelector(".e-permits-fo-auth__or-separator");
      if (!roleList) return;
      const allowed = frontOfficeAllowedTypes(schema);
      const subjects = (schema?.subjects || []).filter((subject) => allowed.includes(subject.type));
      const directSubjects = subjects.filter((subject) => !subject.authorization);
      const proxySubjects = subjects.filter((subject) => subject.authorization);
      roleList.innerHTML = [
        renderRoleCluster(directSubjects),
        renderRoleGroup("Cu împuternicire MPower", proxySubjects, { collapseAfter: 3 }),
      ].join("");

      /* No identity at all can start this request. Say why, rather than
         leaving the list blank — the notarial-proxy row below may still be
         the way through, and if it is not, this is a dead end that has to
         explain itself. */
      if (!subjects.length) {
        const typeLabels = allowed
          .map((type) => (schema?.subjectTypes?.[type] || frontOfficeSubjectTypeMeta(type)).label)
          .join(" sau ");
        const proxyIsWayOut = Boolean(schema?.proxyOption?.visibleWhenAnyOf?.some((type) => allowed.includes(type)));
        /* the shared empty state (2026-10-14): what is missing + the way out */
        roleList.innerHTML = window.GEAPEmptyState.render({
          title: "Nu ai nicio identitate eligibilă pentru acest serviciu",
          text: `Serviciul este disponibil doar pentru ${typeLabels}. ${proxyIsWayOut
            ? "Poți continua cu o procură notarială, folosind opțiunea de mai jos."
            : "Pentru a continua, ai nevoie de o împuternicire MPower din partea unei organizații eligibile."}`,
          icon: "user-account",
          compact: true
        });
      }

      const proxy = schema?.proxyOption;
      const showProxy = Boolean(proxy?.visibleWhenAnyOf?.some((type) => allowed.includes(type)));
      if (proxyButton) {
        proxyButton.hidden = !showProxy;
        const proxySubject = frontOfficeNotarialProxySubject(schema);
        if (showProxy && proxySubject) {
          proxyButton.setAttribute("data-fo-open-request", "");
          proxyButton.dataset.foSubjectId = proxySubject.id;
          proxyButton.disabled = false;
          proxyButton.removeAttribute("aria-disabled");
        } else {
          proxyButton.removeAttribute("data-fo-open-request");
          delete proxyButton.dataset.foSubjectId;
          proxyButton.disabled = true;
          proxyButton.setAttribute("aria-disabled", "true");
        }
        const icon = proxyButton.querySelector(".e-permits-fo-auth__role-avatar use");
        const label = proxyButton.querySelector(".e-permits-fo-auth__role-name");
        const meta = proxyButton.querySelector(".e-permits-fo-auth__role-meta");
        if (icon && proxy?.icon) icon.setAttribute("href", `assets/icons/sprite.svg#${proxy.icon}`);
        if (label && proxy?.label) label.textContent = proxy.label;
        if (meta && proxy?.description) meta.textContent = proxy.description;
      }
      if (proxySeparator) proxySeparator.hidden = !showProxy;
    }

    function avatarMenuRoleButton(subject, { proxy = false } = {}) {
      const selected = frontOfficeSelectedSubject?.id === subject.id;
      const buttonClass = proxy ? "e-permits-fo-avatar-menu__proxy-role" : "e-permits-fo-avatar-menu__role";
      const copyClass = proxy ? "e-permits-fo-avatar-menu__proxy-role-copy" : "e-permits-fo-avatar-menu__role-copy";
      const headingClass = proxy ? "e-permits-fo-avatar-menu__proxy-role-heading" : "";
      const badge = subject.authorization || subject.badge ? `<span class="e-permits-fo-avatar-menu__proxy-badge">${escapeFrontOfficeHtml(subject.badge?.label || "Împuternicire")}</span>` : "";
      const heading = badge
        ? `<span class="${headingClass}"><strong>${escapeFrontOfficeHtml(subject.name)}</strong>${badge}</span>`
        : `<strong>${escapeFrontOfficeHtml(subject.name)}</strong>`;
      return `
        <button class="${buttonClass}${selected ? " is-selected" : ""}" type="button" role="menuitemradio" aria-checked="${selected ? "true" : "false"}" data-fo-avatar-role data-fo-subject-id="${escapeFrontOfficeHtml(subject.id)}">
          ${subjectAvatarHtml(subject, "e-permits-fo-avatar-menu__role-avatar", { forceInitials: true })}
          <span class="${copyClass}">
            ${heading}
            ${subjectMetaHtml(subject, "e-permits-fo-avatar-menu__role-meta")}
          </span>
          ${proxy ? "" : `
            <svg class="icon e-permits-fo-avatar-menu__role-check" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
            </svg>
          `}
        </button>
      `;
    }

    function avatarMenuProfileHtml(subject) {
      const profileSubject = subject || frontOfficeSchema?.authenticatedUser;
      if (!profileSubject) return "";
      const overlaySubject = profileSubject.authorization ? representativeForSubject(profileSubject) : null;
      const idLabel = profileSubject.idLabel || frontOfficeSubjectTypeMeta(profileSubject.type).idLabel || "";
      const idValue = profileSubject.idValue || "";
      const idCopy = idLabel && idValue ? `
        <span class="e-permits-fo-avatar-menu__identity-id">
          <span>${escapeFrontOfficeHtml(idLabel)}</span>
          ${copyValueButtonHtml(idValue, {
            ariaLabel: `Copiază ${idLabel} ${idValue}`,
            className: "e-permits-fo-avatar-menu__identity-copy",
          })}
        </span>
      ` : "";

      return `
        <div class="e-permits-fo-avatar-menu__profile-main">
          ${subjectCompositeAvatarHtml(profileSubject, "e-permits-fo-avatar-menu__photo", { overlaySubject })}
          <div class="e-permits-fo-avatar-menu__identity">
            <strong>${escapeFrontOfficeHtml(profileSubject.name || "")}</strong>
            <span class="e-permits-fo-avatar-menu__identity-meta">
              <span>${escapeFrontOfficeHtml(subjectTypeText(profileSubject))}</span>
              ${idCopy ? `<span class="e-permits-fo-avatar-menu__identity-dot" aria-hidden="true"></span>${idCopy}` : ""}
            </span>
          </div>
        </div>
        <div class="e-permits-fo-avatar-menu__actions">
          <a class="e-permits-fo-avatar-menu__cabinet" href="#" role="menuitem">Cabinetul Personal</a>
          <button class="e-permits-fo-avatar-menu__settings" type="button" aria-label="Setări" role="menuitem">
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-settings"></use>
            </svg>
          </button>
        </div>
      `;
    }

    function renderFrontOfficeAvatarMenuFromSchema(schema) {
      if (!frontOfficeAvatarDropdown || !Array.isArray(schema?.subjects)) return;
      const allowed = frontOfficeAllowedTypes(schema);
      const subjects = schema.subjects.filter((subject) => allowed.includes(subject.type) && subject.selectable !== false);
      const directSubjects = subjects.filter((subject) => !subject.authorization);
      const proxySubjects = subjects.filter((subject) => subject.authorization);
      const roleList = frontOfficeAvatarDropdown.querySelector(".e-permits-fo-avatar-menu__role-list");
      const proxyGroup = frontOfficeAvatarDropdown.querySelector("[aria-labelledby='fo-avatar-menu-proxy']");
      const proxyDetails = frontOfficeAvatarDropdown.querySelector("[data-fo-avatar-proxy-details]");
      const proxyStack = frontOfficeAvatarDropdown.querySelector(".e-permits-fo-avatar-menu__proxy-stack");
      const proxyToggle = frontOfficeAvatarDropdown.querySelector("[data-fo-avatar-proxy-toggle]");
      const profile = frontOfficeAvatarDropdown.querySelector(".e-permits-fo-avatar-menu__profile");

      if (profile) profile.innerHTML = avatarMenuProfileHtml(frontOfficeSelectedSubject || schema.authenticatedUser);

      if (roleList) roleList.innerHTML = directSubjects.map((subject) => avatarMenuRoleButton(subject)).join("");
      if (proxyDetails) proxyDetails.innerHTML = proxySubjects.map((subject) => avatarMenuRoleButton(subject, { proxy: true })).join("");
      if (proxyGroup) {
        const isStatic = proxySubjects.length > 0 && proxySubjects.length < 4;
        proxyGroup.hidden = proxySubjects.length === 0;
        proxyGroup.classList.toggle("is-static", isStatic);
        proxyGroup.classList.toggle("is-expanded", isStatic);
      }
      if (proxyToggle) {
        const showToggle = proxySubjects.length >= 4;
        proxyToggle.hidden = !showToggle;
        proxyToggle.setAttribute("aria-expanded", "false");
      }
      if (proxyStack && proxySubjects.length) {
        proxyStack.innerHTML = proxySubjects.slice(0, 4).map((subject, index) => {
          const extra = index === 3 && proxySubjects.length > 4 ? `+${proxySubjects.length - 3}` : subjectInitials(subject);
          if (index === 3 && proxySubjects.length > 4) {
            return `<span class="e-permits-fo-avatar-menu__stack-avatar e-permits-fo-avatar-menu__stack-avatar--counter">${escapeFrontOfficeHtml(extra)}</span>`;
          }
          return subjectInitialsAvatarHtml(subject, "e-permits-fo-avatar-menu__stack-avatar");
        }).join("") + `
          <span class="e-permits-fo-avatar-menu__proxy-arrow">
            <svg class="icon" width="16" height="16" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </span>
        `;
      }
      requestAnimationFrame(updateFrontOfficeAvatarMenuScrollState);
    }

    function renderStepperFromSchema(schema) {
      /* scoped: the guest screen carries a static copy of this stepper earlier
         in the DOM, and an unscoped lookup rendered into that one instead */
      const stepperList = frontOfficeRequestScreen?.querySelector(".e-permits-fo-stepper ol");
      if (!stepperList || !Array.isArray(schema?.steps) || !schema.steps.length) return;
      stepperList.innerHTML = schema.steps.map((step, index) => {
        const active = index === 0;
        const available = Number(step.index) <= 5 && Boolean(document.querySelector(`[data-fo-step-panel="${Number(step.index)}"]`));
        return `
          <li class="e-permits-fo-stepper__item${active ? " is-active" : ""}" ${active ? 'aria-current="step"' : ""} data-fo-step="${escapeFrontOfficeHtml(step.index)}">
            <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
            <span class="e-permits-fo-stepper__row" ${available ? `role="button" tabindex="0" aria-label="Deschide pasul ${escapeFrontOfficeHtml(step.index)}: ${escapeFrontOfficeHtml(step.label)}"` : 'aria-disabled="true"'}>
              <span class="e-permits-fo-stepper__number">
                <span class="e-permits-fo-stepper__number-text">${escapeFrontOfficeHtml(step.index)}</span>
                <svg class="icon e-permits-fo-stepper__check" width="16" height="16" aria-hidden="true">
                  <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
                </svg>
              </span>
              <span class="e-permits-fo-stepper__label">${escapeFrontOfficeHtml(step.label)}</span>
            </span>
          </li>
        `;
      }).join("");
      frontOfficeStepperItems = document.querySelectorAll("[data-fo-step]");
      updateFrontOfficeMobileProgress(1);
    }

    function requiredMarkerHtml() {
      return `<span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>`;
    }

    function fieldId(id) {
      return `fo-${String(id || "field").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
    }

    function fieldClass(field, extra = "") {
      /* 3 = a quarter (Form Builder: Număr, Sumă, Dată — PO question I-4 still open) */
      const span = [3, 4, 6, 8, 12].includes(Number(field?.span)) ? Number(field.span) : 12;
      return `e-permits-fo-field e-permits-fo-field--span-${span}${extra ? ` ${extra}` : ""}`;
    }

    function labelHtml(forId, field) {
      return `<label${forId ? ` for="${escapeFrontOfficeHtml(forId)}"` : ""}>${escapeFrontOfficeHtml(field.label || "")} ${field.required ? requiredMarkerHtml() : ""}</label>`;
    }

    function textFieldHtml(field) {
      const id = fieldId(field.id);
      const type = field.type === "email" ? "email" : "text";
      const hasCounter = field.charCounter && field.maxLength;
      const labelRow = hasCounter
        ? `<div class="e-permits-fo-field__label-counter">${labelHtml(id, field)}<span class="e-permits-fo-field__counter" data-fo-char-counter data-fo-char-max="${escapeFrontOfficeHtml(String(field.maxLength))}" hidden>0 / ${escapeFrontOfficeHtml(String(field.maxLength))}</span></div>`
        : labelHtml(id, field);
      /* readOnly (Form Builder „Doar citire”) = the FO Read Only state; inputmode for digit codes */
      return `
        <div class="${fieldClass(field)}">
          ${labelRow}
          <div class="e-permits-fo-input${field.readOnly ? " is-filled is-readonly" : ""}">
            <input id="${escapeFrontOfficeHtml(id)}" type="${type}" ${field.value ? `value="${escapeFrontOfficeHtml(field.value)}"` : ""} placeholder="${escapeFrontOfficeHtml(field.placeholder || "")}" ${field.autocomplete ? `autocomplete="${escapeFrontOfficeHtml(field.autocomplete)}"` : ""} ${field.inputmode ? `inputmode="${escapeFrontOfficeHtml(field.inputmode)}"` : ""} ${field.disabled ? "disabled" : ""} ${field.readOnly ? "readonly" : ""} ${field.required ? 'aria-required="true"' : ""} ${field.maxLength ? `maxlength="${escapeFrontOfficeHtml(String(field.maxLength))}"` : ""} ${hasCounter ? "data-fo-char-input" : ""}${fieldDescribedBy(id, field)}>
          </div>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    /* the hint under a field, linked to its control (aria-describedby) */
    function fieldHintHtml(id, field) {
      return field.hint ? `<p class="e-permits-fo-field__hint" id="${escapeFrontOfficeHtml(id)}-hint">${escapeFrontOfficeHtml(field.hint)}</p>` : "";
    }

    function fieldDescribedBy(id, field) {
      return field.hint ? ` aria-describedby="${escapeFrontOfficeHtml(id)}-hint"` : "";
    }

    function selectFieldHtml(field, { addressPart = false } = {}) {
      const id = fieldId(field.id);
      const listId = `${id}-list`;
      const value = field.value || "";
      const placeholder = field.placeholder || value || "Selectează";
      const options = Array.isArray(field.options) ? field.options : [];
      return `
        <div class="${fieldClass(field)}">
          ${labelHtml(id, field)}
          <div class="e-permits-fo-select${addressPart ? " e-permits-fo-select--address" : ""}${field.disabled ? " is-disabled" : ""}" data-fo-select>
            <button class="e-permits-fo-select__button" id="${escapeFrontOfficeHtml(id)}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(listId)}" ${field.disabled ? "disabled" : ""}>
              ${field.flag ? `<span class="e-permits-fo-country-flag" aria-hidden="true">${escapeFrontOfficeHtml(field.flag)}</span>` : ""}
              <span class="e-permits-fo-select__value${value ? "" : " e-permits-fo-select__value--placeholder"}" title="${escapeFrontOfficeHtml(value || placeholder)}" data-fo-select-value ${addressPart ? `data-fo-address-part="${escapeFrontOfficeHtml(field.id)}" data-placeholder="${escapeFrontOfficeHtml(placeholder)}"` : ""}>${escapeFrontOfficeHtml(value || placeholder)}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-select__list" id="${escapeFrontOfficeHtml(listId)}" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" hidden>
              ${options.map((option) => `<li class="e-permits-fo-select__option${option === value ? " is-selected" : ""}" role="option" aria-selected="${option === value ? "true" : "false"}" data-value="${escapeFrontOfficeHtml(option)}" tabindex="-1">${escapeFrontOfficeHtml(option)}</li>`).join("")}
            </ul>
          </div>
          ${addressPart ? "" : fieldHintHtml(id, field)}
        </div>
      `;
    }

    function addressPartHtml(part) {
      if (part.type === "select") return selectFieldHtml(part, { addressPart: true });
      const id = fieldId(`address-${part.id}`);
      return `
        <div class="${fieldClass(part)}">
          ${labelHtml(id, part)}
          <div class="e-permits-fo-input">
            <input id="${escapeFrontOfficeHtml(id)}" type="text" placeholder="${escapeFrontOfficeHtml(part.placeholder || "")}" ${part.disabled ? "disabled" : ""} data-fo-address-part="${escapeFrontOfficeHtml(part.id)}">
          </div>
        </div>
      `;
    }

    function addressPatternHtml(field) {
      const id = fieldId(field.id);
      const addressesJson = escapeFrontOfficeHtml(JSON.stringify(field.addresses || []));
      return `
        <div class="${fieldClass(field)}">
          ${labelHtml(id, field)}
          ${addressSearchInputHtml({ id, placeholder: field.searchPlaceholder || "Caută adresa", addressesJson })}
          ${field.hint ? `<p class="e-permits-fo-field__hint">${escapeFrontOfficeHtml(field.hint)}</p>` : ""}
          <div class="e-permits-fo-address-details e-permits-fo-address-details--smart" data-fo-address-details>
            ${(field.parts || []).map(addressPartHtml).join("")}
          </div>
        </div>
      `;
    }

    /* US-54 demo / test configuration of the cadastral lookup. Seeded from the URL
       (?codcadastral=vizibil|ascuns|obligatoriu · ?srre=lent|indisponibil|invalid|asteptare ·
       ?coduri=fara) and changed live by „Configurare flux” › Adresă · cod cadastral. */
    const foAddressDemo = (() => {
      const params = new URLSearchParams(window.location.search);
      return {
        field: params.get("codcadastral") || "",
        srre: params.get("srre") || "normal",
        saved: params.get("coduri") === "fara" ? "fara" : "cu",
      };
    })();

    /* FO search inputs follow the FO field sizes: library Search input Medium (40) on desktop,
       Large (48) at ≤720px — the size class is swapped, the library CSS does the rest */
    const foSearchMobile = window.matchMedia("(max-width: 720px)");
    const foSearchSize = () => (foSearchMobile.matches ? "large" : "medium");
    foSearchMobile.addEventListener("change", () => {
      document.querySelectorAll("[data-fo-search-size]").forEach((el) => {
        el.classList.toggle("large", foSearchMobile.matches);
        el.classList.toggle("medium", !foSearchMobile.matches);
      });
    });

    /* the service's cascade address field (its „Cod cadastral” config) */
    function cascadeAddressFieldOfSchema(schema) {
      for (const step of schema?.steps || []) {
        for (const section of step.sections || []) {
          const found = (section.fields || []).find((item) => item.type === "cascade-address");
          if (found) return found;
        }
      }
      return null;
    }

    function cadastralConfigOfSchema(schema) {
      return cascadeAddressFieldOfSchema(schema)?.cadastral || null;
    }

    /* „Cod cadastral” config from the form schema (the service's Form Designer: Vizibilitate +
       Obligatoriu); the demo override wins when set */
    function cadastralConfig(config) {
      if (!config) return null;
      const mode = foAddressDemo.field;
      return {
        visible: mode === "ascuns" ? false : mode === "vizibil" || mode === "obligatoriu" ? true : config.visible !== false,
        required: mode === "obligatoriu" ? true : mode === "vizibil" ? false : Boolean(config.required),
      };
    }

    /* „Caută adresa” — the ONE address search markup (request form, post-process forms, Form
       Designer preview, address-pattern fields): the product search input (§ Search input in
       components.md) + the FO address-search list. Size Medium 40 / Large 48 at ≤720px. */
    function addressSearchInputHtml({ id, placeholder = "Caută adresa", describedBy = "", addressesJson = "[]" }) {
      const safeId = escapeFrontOfficeHtml(id);
      return `
            <div class="e-permits-fo-address-search" data-fo-address-search data-fo-addresses="${addressesJson}">
              <div class="search-input ${foSearchSize()} rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill e-permits-fo-cascade-address__search" data-fo-search-size>
                <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
                <input class="input" id="${safeId}" type="text" placeholder="${escapeFrontOfficeHtml(placeholder)}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${safeId}-suggestions"${describedBy ? ` aria-describedby="${escapeFrontOfficeHtml(describedBy)}"` : ""} data-fo-address-input>
                <div class="btn-group">
                  <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
                  <button type="button" class="btn-icon clear" aria-label="Șterge adresa căutată"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button>
                </div>
              </div>
              <ul class="e-permits-fo-address-search__list" id="${safeId}-suggestions" role="listbox" aria-label="Sugestii adresă" data-fo-address-list hidden></ul>
            </div>`;
    }

    /* the request form's cascade address = the one render path for the FO and the Form Designer
       preview. `field.parts` (builder Address pattern, keyed by part) may hide a part or mark it
       required; `field.searchLabel` / `field.required` replace the „Caută adresa” label (preview). */
    function cascadeAddressHtml(field) {
      const uid = Math.random().toString(16).slice(2, 8);
      const raionId = `fo-casc-raion-${uid}`;
      const localitateId = `fo-casc-loc-${uid}`;
      const sectorId = `fo-casc-sector-${uid}`;
      const stradaId = `fo-casc-strada-${uid}`;
      const districtsJson = escapeFrontOfficeHtml(JSON.stringify(field.districts || []));
      const phoneHtml = field.phone ? phoneFieldHtml(field.phone) : "";
      const emailHtml = field.email ? textFieldHtml({ ...field.email, type: "email" }) : "";
      const parts = field.parts || {};
      const PART_REQUIRED = { country: true, district: true };
      const hiddenAttr = (key) => (parts[key]?.visible === false ? " hidden data-fo-part-hidden" : "");
      const star = (key) => ((parts[key]?.required ?? PART_REQUIRED[key]) ? ` ${requiredMarkerHtml()}` : "");
      /* US-54: „Cod cadastral” sub-field (Form Designer › Componentele: Vizibilitate + Obligatoriu) */
      const cadastral = cadastralConfig(field.cadastral);
      const cadastralOn = Boolean(cadastral?.visible);
      const searchHint = cadastralOn
        ? "Căutați o adresă salvată sau introduceți un cod cadastral și alegeți „Caută codul cadastral” din listă."
        : "Selectarea unei adrese existente pre-completează toate câmpurile";
      const searchId = `fo-casc-search-${uid}`;
      /* with „Cod cadastral” on, the search takes a code too — its label / placeholder say so */
      const searchText = cadastralOn ? "Caută adresa sau cod cadastral" : "Caută adresa";
      const searchLabel = field.searchLabel || searchText;
      /* „Cod cadastral” = the library search input WITH its submit (Figma search-input-rectangular,
         Button = True): the code is sent to SRRE only on the arrow button or Enter (user decision
         2026-10-13; editable — deviates from AC-13 „Doar citire”). btn-group: inline spinner (only
         while SRRE is asked, `.loading`), × (with a value; AC-16), submit (disabled while empty or
         searching). Its own message slot stays empty (no hint — user 2026-10-13) until the lookup message. */
      const cadastralId = `${uid}-cadastral`;
      const cadastralFieldHtml = cadastralOn ? `
            <div class="e-permits-fo-field e-permits-fo-field--span-6" data-fo-cadastral-field>
              <label for="${cadastralId}">Cod cadastral${cadastral.required ? ` ${requiredMarkerHtml()}` : ""}</label>
              <div class="search-input ${foSearchSize()} rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill e-permits-fo-cadastral-search" data-fo-search-size data-fo-cadastral-box>
                <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
                <input class="input" id="${cadastralId}" type="text" maxlength="50" autocomplete="off" spellcheck="false" placeholder="Ex.: 0100510.123" aria-describedby="${cadastralId}-message"${cadastral.required ? ' aria-required="true"' : ""} data-fo-address-part="cadastralCode" data-fo-cadastral-input>
                <div class="btn-group">
                  <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
                  <button type="button" class="btn-icon clear" aria-label="Șterge codul cadastral" data-fo-cadastral-clear><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button>
                  <button type="button" class="btn btn-primary btn-search" aria-label="Caută adresa după codul cadastral" disabled data-fo-cadastral-submit><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>
                </div>
              </div>
              <p class="e-permits-fo-field__hint" id="${cadastralId}-message" data-fo-cadastral-code-hint></p>
            </div>` : "";
      /* „Caută adresa” = the library search input (search icon + × clear, js/search.js); its one
         message slot under it holds the hint, then the lookup message (loading / success / error /
         warning); a visually hidden live region announces the outcome once */
      return `
        <div class="${fieldClass(field)} e-permits-fo-cascade-address" data-fo-cascade-address data-fo-cascade-districts="${districtsJson}"${cadastralOn ? ' data-fo-cadastral="on"' : ""}>
          <div class="e-permits-fo-field e-permits-fo-field--span-12">
            <label for="${searchId}">${escapeFrontOfficeHtml(searchLabel)}${field.searchLabel && field.required ? ` ${requiredMarkerHtml()}` : ""}</label>
            ${addressSearchInputHtml({ id: searchId, placeholder: searchText, describedBy: `${searchId}-message` })}
            <p class="e-permits-fo-field__hint" id="${searchId}-message" data-fo-cadastral-search-hint>${escapeFrontOfficeHtml(searchHint)}</p>
            ${cadastralOn ? `<p class="u-visually-hidden" aria-live="polite" data-fo-cadastral-live></p>` : ""}
          </div>
          <div class="e-permits-fo-address-details--smart e-permits-fo-cascade-address__grid">
            ${cadastralFieldHtml}
            <div class="e-permits-fo-field e-permits-fo-field--span-6"${hiddenAttr("country")}>
              <label>Țara${star("country")}</label>
              <div class="e-permits-fo-select e-permits-fo-select--address is-disabled" data-fo-select>
                <button class="e-permits-fo-select__button" id="fo-casc-country-${uid}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="fo-casc-country-${uid}-list" disabled>
                  <span class="e-permits-fo-country-flag" aria-hidden="true">🇲🇩</span>
                  <span class="e-permits-fo-select__value" data-fo-select-value data-fo-address-part="country" data-placeholder="Moldova">Moldova</span>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
                <ul class="e-permits-fo-select__list" id="fo-casc-country-${uid}-list" role="listbox" aria-labelledby="fo-casc-country-${uid}" hidden>
                  <li class="e-permits-fo-select__option is-selected" role="option" aria-selected="true" data-value="Moldova" tabindex="-1">Moldova</li>
                </ul>
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-6"${hiddenAttr("district")}>
              <label>Raionul/Municipiul${star("district")}</label>
              <div class="e-permits-fo-select" data-fo-cascade-select data-fo-cascade-raion>
                <button class="e-permits-fo-select__button" id="${raionId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${raionId}-list">
                  <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>Selectează raionul/municipiul</span>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
                <ul class="e-permits-fo-select__list" id="${raionId}-list" role="listbox" aria-labelledby="${raionId}" hidden>
                  ${(field.districts || []).map((d) => `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(d.value)}" tabindex="-1">${escapeFrontOfficeHtml(d.value)}</li>`).join("")}
                </ul>
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-6"${hiddenAttr("locality")}>
              <label>Orașul/Comuna${star("locality")}</label>
              <div class="e-permits-fo-select is-disabled" data-fo-cascade-select data-fo-cascade-localitate>
                <button class="e-permits-fo-select__button" id="${localitateId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${localitateId}-list" disabled>
                  <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>Selectează mai întâi Raionul/Municipiul</span>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
                <ul class="e-permits-fo-select__list" id="${localitateId}-list" role="listbox" aria-labelledby="${localitateId}" hidden></ul>
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-6" data-fo-cascade-sector-field hidden>
              <label>Sector</label>
              <div class="e-permits-fo-select is-disabled" data-fo-cascade-select data-fo-cascade-sector>
                <button class="e-permits-fo-select__button" id="${sectorId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${sectorId}-list" disabled>
                  <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>Selectează sectorul</span>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
                <ul class="e-permits-fo-select__list" id="${sectorId}-list" role="listbox" aria-labelledby="${sectorId}" hidden></ul>
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-8"${hiddenAttr("street")}>
              <label>Strada${star("street")}</label>
              <div class="e-permits-fo-select is-disabled" data-fo-cascade-select data-fo-cascade-strada>
                <button class="e-permits-fo-select__button" id="${stradaId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${stradaId}-list" disabled>
                  <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>Selectează orașul/comuna mai întâi</span>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
                <ul class="e-permits-fo-select__list" id="${stradaId}-list" role="listbox" aria-labelledby="${stradaId}" hidden></ul>
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-postal">Codul Poștal</label>
              <div class="e-permits-fo-input is-disabled">
                <input id="${uid}-postal" type="text" placeholder="MD-0000" disabled data-fo-address-part="postalCode">
              </div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4"${hiddenAttr("house")}>
              <label for="${uid}-house">Casa${star("house")}</label>
              <div class="e-permits-fo-input"><input id="${uid}-house" type="text" placeholder="Nr." data-fo-address-part="house"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4"${hiddenAttr("block")}>
              <label for="${uid}-block">Blocul${star("block")}</label>
              <div class="e-permits-fo-input"><input id="${uid}-block" type="text" placeholder="Nr." data-fo-address-part="block"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4"${hiddenAttr("stair")}>
              <label for="${uid}-stair">Scara${star("stair")}</label>
              <div class="e-permits-fo-input"><input id="${uid}-stair" type="text" placeholder="Scara" data-fo-address-part="stair"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4"${hiddenAttr("floor")}>
              <label for="${uid}-floor">Etajul${star("floor")}</label>
              <div class="e-permits-fo-input"><input id="${uid}-floor" type="text" placeholder="0" data-fo-address-part="floor"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4"${hiddenAttr("apartment")}>
              <label for="${uid}-apt">Apartamentul${star("apartment")}</label>
              <div class="e-permits-fo-input"><input id="${uid}-apt" type="text" placeholder="Numărul ap." data-fo-address-part="apartment"></div>
            </div>
            ${phoneHtml}
            ${emailHtml}
          </div>
        </div>
      `;
    }

    /* Subdiviziune (US-13 AC-05/06, US-48): derived from the address district (default), picked
       by the applicant (`mode: "select"`) or — one subdivision only — filled read-only (`"auto"`) */
    function subdivisionFieldHtml(field) {
      const id = fieldId(field.id);
      const listId = `${id}-list`;
      const options = Array.isArray(field.subdivisions) ? field.subdivisions : [];
      if (field.mode === "auto") {
        return readonlyFieldHtml({ id, label: field.label || "Subdiviziunea", value: options[0] || "—", span: field.span, required: field.required, hint: field.hint || "Completată automat: serviciul are o singură subdiviziune." });
      }
      const pick = field.mode === "select";
      const mappingJson = escapeFrontOfficeHtml(JSON.stringify(field.mapping || {}));
      const placeholder = pick ? field.placeholder || "Selectează subdiviziunea" : "Va fi sugerată după raion";
      const hint = pick ? field.hint || "" : field.hint || "Selectați raionul pentru a sugera subdiviziunea automat.";
      return `
        <div class="${fieldClass(field)} e-permits-fo-subdivision-field" data-fo-subdivision${pick ? ' data-fo-subdivision-mode="select"' : ` data-fo-subdivision-mapping="${mappingJson}"`}>
          ${labelHtml(id, field)}
          <div class="e-permits-fo-select" data-fo-cascade-select data-fo-subdivision-select>
            <button class="e-permits-fo-select__button" id="${escapeFrontOfficeHtml(id)}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(listId)}">
              <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>${escapeFrontOfficeHtml(placeholder)}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-select__list" id="${escapeFrontOfficeHtml(listId)}" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" hidden>
              ${options.map((opt) => `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(opt)}" tabindex="-1">${escapeFrontOfficeHtml(opt)}</li>`).join("")}
            </ul>
          </div>
          ${hint ? `<p class="e-permits-fo-field__hint" data-fo-subdivision-hint>${escapeFrontOfficeHtml(hint)}</p>` : ""}
        </div>
      `;
    }

    function positionFloatingSelectList(trigger, list, root) {
      if (!trigger || !list) return;
      const rect = trigger.getBoundingClientRect();
      const viewportGap = 8;
      const menuGap = 4;
      const width = Math.max(0, rect.width);
      const left = Math.min(
        Math.max(viewportGap, rect.left),
        Math.max(viewportGap, window.innerWidth - width - viewportGap)
      );
      const spaceBelow = window.innerHeight - rect.bottom - menuGap - viewportGap;
      const spaceAbove = rect.top - menuGap - viewportGap;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = openUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(144, Math.min(280, availableSpace));

      list.classList.add("is-floating");
      list.style.position = "fixed";
      list.style.left = `${Math.round(left)}px`;
      list.style.width = `${Math.round(width)}px`;
      list.style.maxHeight = `${Math.round(maxHeight)}px`;
      list.style.zIndex = "10000";
      if (openUp) {
        list.style.top = "auto";
        list.style.bottom = `${Math.round(window.innerHeight - rect.top + menuGap)}px`;
      } else {
        list.style.top = `${Math.round(rect.bottom + menuGap)}px`;
        list.style.bottom = "auto";
      }
      root?.classList.toggle("is-open-up", openUp);
    }

    function resetFloatingSelectList(list, root) {
      if (!list) return;
      list.classList.remove("is-floating");
      list.style.position = "";
      list.style.left = "";
      list.style.top = "";
      list.style.bottom = "";
      list.style.width = "";
      list.style.maxHeight = "";
      list.style.zIndex = "";
      root?.classList.remove("is-open-up");
    }

    function bindCascadeSelect(selectEl, { onChange } = {}) {
      if (!selectEl || selectEl.foCascadeSelectBound) return selectEl?.foCascadeSelect || null;
      selectEl.foCascadeSelectBound = true;
      const button = selectEl.querySelector(".e-permits-fo-select__button");
      const valueEl = selectEl.querySelector("[data-fo-select-value]");
      const list = selectEl.querySelector(".e-permits-fo-select__list");
      if (!button || !valueEl || !list) return null;
      let options = Array.from(selectEl.querySelectorAll(".e-permits-fo-select__option"));
      let activeIndex = 0;
      let selectedValue = null;
      const syncFloating = () => {
        if (!list.hidden) positionFloatingSelectList(button, list, selectEl);
      };

      function rebindOptions() {
        options.forEach((option, index) => {
          option.addEventListener("mouseenter", () => {
            activeIndex = index;
            options.forEach((o, i) => o.classList.toggle("is-active", i === activeIndex));
          });
          option.addEventListener("click", () => selectOption(option));
        });
      }

      function setOptions(newOptions) {
        list.innerHTML = newOptions.map((val) => `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(val)}" tabindex="-1">${escapeFrontOfficeHtml(val)}</li>`).join("");
        options = Array.from(list.querySelectorAll(".e-permits-fo-select__option"));
        rebindOptions();
      }

      function setOpen(isOpen) {
        if (button.disabled && isOpen) return;
        selectEl.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        setDropdownHidden(list, !isOpen);
        if (isOpen) {
          const si = options.findIndex((o) => o.dataset.value === selectedValue);
          activeIndex = Math.max(0, si);
          options.forEach((o, i) => o.classList.toggle("is-active", i === activeIndex));
          requestAnimationFrame(syncFloating);
          window.addEventListener("resize", syncFloating);
          document.addEventListener("scroll", syncFloating, true);
        } else {
          window.removeEventListener("resize", syncFloating);
          document.removeEventListener("scroll", syncFloating, true);
          resetFloatingSelectList(list, selectEl);
        }
      }

      function selectOption(option) {
        options.forEach((item) => {
          const sel = item === option;
          item.classList.toggle("is-selected", sel);
          item.setAttribute("aria-selected", String(sel));
        });
        selectedValue = option.dataset.value || option.textContent.trim();
        valueEl.textContent = selectedValue;
        valueEl.classList.remove("e-permits-fo-select__value--placeholder");
        setOpen(false);
        button.focus();
        onChange?.(selectedValue);
      }

      button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
      button.addEventListener("keydown", (e) => {
        const isOpen = !list.hidden;
        if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !isOpen) { e.preventDefault(); setOpen(true); return; }
        if (e.key === "ArrowDown" && isOpen) { e.preventDefault(); activeIndex = Math.min(options.length - 1, activeIndex + 1); options.forEach((o, i) => o.classList.toggle("is-active", i === activeIndex)); options[activeIndex]?.scrollIntoView({ block: "nearest" }); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); if (!isOpen) { setOpen(true); return; } activeIndex = Math.max(0, activeIndex - 1); options.forEach((o, i) => o.classList.toggle("is-active", i === activeIndex)); options[activeIndex]?.scrollIntoView({ block: "nearest" }); return; }
        if (e.key === "Enter" && isOpen && options[activeIndex]) { e.preventDefault(); selectOption(options[activeIndex]); return; }
        if (e.key === "Escape") { setOpen(false); button.focus(); }
      });
      document.addEventListener("click", (e) => { if (!selectEl.contains(e.target)) setOpen(false); });
      rebindOptions();

      selectEl.foCascadeSelect = {
        setOptions,
        getValue: () => selectedValue,
        setValue(val) {
          const opt = options.find((o) => o.dataset.value === val);
          if (opt) selectOption(opt);
        },
        clearValue(placeholder = "Selectează") {
          options.forEach((item) => { item.classList.remove("is-selected"); item.setAttribute("aria-selected", "false"); });
          selectedValue = null;
          valueEl.textContent = placeholder;
          valueEl.classList.add("e-permits-fo-select__value--placeholder");
        },
        enable() { button.disabled = false; selectEl.classList.remove("is-disabled"); },
        disable(placeholder = "Selectează mai întâi") {
          button.disabled = true;
          selectEl.classList.add("is-disabled");
          setOpen(false);
          this.clearValue(placeholder);
        },
      };
      return selectEl.foCascadeSelect;
    }

    function initCascadeAddress(root) {
      if (root.foCascadeAddressInitialized) return;
      root.foCascadeAddressInitialized = true;
      let districts = [];
      try { districts = JSON.parse(root.dataset.foCascadeDistricts || "[]"); } catch (e) { districts = []; }
      const raionEl = root.querySelector("[data-fo-cascade-raion]");
      const localitateEl = root.querySelector("[data-fo-cascade-localitate]");
      const sectorField = root.querySelector("[data-fo-cascade-sector-field]");
      const sectorEl = root.querySelector("[data-fo-cascade-sector]");
      const stradaEl = root.querySelector("[data-fo-cascade-strada]");
      const postalInput = root.querySelector("[data-fo-address-part='postalCode']");

      function setPostalEnabled(enabled) {
        if (!postalInput) return;
        postalInput.disabled = !enabled;
        postalInput.closest(".e-permits-fo-input")?.classList.toggle("is-disabled", !enabled);
        if (!enabled) postalInput.value = "";
      }

      const raion = bindCascadeSelect(raionEl, { onChange: onRaionChange });
      const localitate = bindCascadeSelect(localitateEl, { onChange: onLocalitateChange });
      const sector = bindCascadeSelect(sectorEl, {});
      const strada = bindCascadeSelect(stradaEl, {});

      function isChisinauLocality(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "chisinau";
      }

      function hideSector() {
        if (sectorField) {
          sectorField.hidden = true;
          sectorField.setAttribute("aria-hidden", "true");
          sectorField.style.display = "none";
        }
        sector?.disable("Selectează sectorul");
      }

      function showSector(options = []) {
        if (sectorField) {
          sectorField.hidden = false;
          sectorField.removeAttribute("aria-hidden");
          sectorField.style.display = "";
        }
        sector?.setOptions(options);
        sector?.enable();
      }

      function setSectorOptions(localitateValue, options = []) {
        const shouldShowSector = isChisinauLocality(localitateValue) && Array.isArray(options) && options.length > 0;
        if (shouldShowSector) showSector(options);
        else hideSector();
      }

      hideSector();

      function onRaionChange(raionValue) {
        localitate?.disable("Selectează mai întâi Raionul/Municipiul");
        setSectorOptions("", []);
        strada?.disable("Selectează orașul/comuna mai întâi");
        setPostalEnabled(false);
        if (!raionValue) return;
        const districtData = districts.find((d) => d.value === raionValue);
        if (!districtData) return;
        localitate?.setOptions(districtData.localities.map((l) => l.value));
        localitate?.enable();
        localitate?.clearValue("Selectează orașul/comuna");
        document.dispatchEvent(new CustomEvent("fo:raion-changed", { detail: { raion: raionValue } }));
      }

      function onLocalitateChange(localitateValue) {
        strada?.disable("Selectează strada");
        setPostalEnabled(false);
        const raionValue = raion?.getValue();
        const districtData = districts.find((d) => d.value === raionValue);
        if (!districtData) {
          setSectorOptions("", []);
          return;
        }
        const localitateData = districtData.localities.find((l) => l.value === localitateValue);
        if (!localitateData) {
          setSectorOptions("", []);
          return;
        }
        setSectorOptions(localitateValue, localitateData.sectors || []);
        strada?.setOptions(localitateData.streets || []);
        strada?.enable();
        strada?.clearValue("Selectează strada");
        setPostalEnabled(true);
      }

      const searchRoot = root.querySelector("[data-fo-address-search]");
      if (searchRoot) {
        searchRoot.foCascadeAddressFill = function(item) {
          /* a saved address chosen after an SRRE fill: the SRRE parts become editable again */
          root.foCadastralRelease?.();
          if (item.district) raion?.setValue(item.district);
          if (item.locality) localitate?.setValue(item.locality);
          if (isChisinauLocality(item.locality) && item.sector) sector?.setValue(item.sector);
          if (!isChisinauLocality(item.locality)) hideSector();
          if (item.street) strada?.setValue(item.street);
          if (postalInput && item.postalCode) {
            postalInput.disabled = false;
            postalInput.closest(".e-permits-fo-input")?.classList.remove("is-disabled");
            postalInput.value = item.postalCode;
          }
          ["house", "block", "stair", "floor", "apartment"].forEach((key) => {
            const el = root.querySelector(`[data-fo-address-part="${key}"]`);
            if (el) el.value = item[key] || "";
          });
        };
        if (root.dataset.foCadastral === "on") {
          initCadastralLookup(root, searchRoot, { raion, localitate, sector, strada, postalInput, hideSector, setPostalEnabled, isChisinauLocality });
        }
      }
    }

    /* US-54 — address by cadastral code. „Caută adresa” also takes a cadastral code (digits,
       sometimes dots, no other format rule): on focus it lists the applicant's saved codes; a code
       asks SRRE through MConnect (mock: data/srre-cadastral.json, ~1.4 s) without submitting the
       form. While it asks, every part SRRE will fill shows the FO input skeleton (no layout shift);
       a valid code fills Țară · Raion · Oraș · Sector · Stradă · Cod poștal · Casă · Bloc ·
       Apartament read-only (the FO „Read Only” field: is-filled is-readonly + check) with a one-time
       highlight; Scară, Etaj, Telefon, Email stay editable. Change the code → skeleton → refill;
       × / clear → those fields empty and editable. „Cod cadastral” is an editable input too (user
       decision 2026-10-13): a code typed there runs the same lookup; the two fields stay in sync
       and the messages sit in the message slot of the field the code was typed in. Demo: foAddressDemo (?srre=asteptare keeps the request pending). */
    const SRRE_URL = "data/srre-cadastral.json";
    const SRRE_DELAY_MS = { normal: 1400, lent: 3000 };
    const SRRE_SKELETON_MIN_MS = 400;
    let srreDb = null;
    let srreLoadPromise = null;

    function loadSrreDb() {
      if (srreDb) return Promise.resolve(srreDb);
      if (!srreLoadPromise) {
        srreLoadPromise = fetch(SRRE_URL, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Cannot load ${SRRE_URL}: ${response.status}`))))
          .then((db) => { srreDb = db; return db; })
          .catch((error) => {
            console.warn(error);
            srreDb = { parcels: {}, postalCodes: {}, savedCodes: {} };
            return srreDb;
          });
      }
      return srreLoadPromise;
    }

    function initCadastralLookup(root, searchRoot, api) {
      const input = searchRoot.querySelector("[data-fo-address-input]");
      const list = searchRoot.querySelector("[data-fo-address-list]");
      const control = input?.closest(".search-input");
      const slot = root.querySelector("[data-fo-cadastral-search-hint]");
      const live = root.querySelector("[data-fo-cadastral-live]");
      const grid = root.querySelector(".e-permits-fo-cascade-address__grid");
      const codeInput = root.querySelector("[data-fo-cadastral-input]");
      const codeWrap = codeInput?.closest(".search-input");
      const codeSubmit = root.querySelector("[data-fo-cadastral-submit]");
      const codeSlot = root.querySelector("[data-fo-cadastral-code-hint]");
      if (!input || !slot) return;
      /* the two fields that take a code: „Caută adresa” and „Cod cadastral”. A lookup's messages
         go under the one the code was typed in; the other shows its hint again */
      const sources = {
        search: { input, control, slot, hint: slot.textContent },
        code: codeInput && codeSlot ? { input: codeInput, control: codeWrap, slot: codeSlot, hint: codeSlot.textContent } : null,
      };
      const field = (selector) => root.querySelector(selector)?.closest(".e-permits-fo-field");
      const selectFields = {
        country: field("[data-fo-address-part='country']"),
        district: field("[data-fo-cascade-raion]"),
        locality: field("[data-fo-cascade-localitate]"),
        sector: field("[data-fo-cascade-sector]"),
        street: field("[data-fo-cascade-strada]"),
      };
      const part = (key) => root.querySelector(`[data-fo-address-part="${key}"]`);
      const textParts = ["postalCode", "house", "block", "apartment"].map(part).filter(Boolean);
      const isCode = (value) => /^[0-9.]+$/.test(value) && /[0-9]/.test(value);
      const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
      let token = 0;
      let lastCode = "";
      let filled = false;
      let busy = false;
      loadSrreDb();

      const MESSAGES = {
        loading: { tone: "e-permits-fo-field__loading", text: "Se caută adresa în Registrul de Stat al Bunurilor Imobile…" },
        success: { tone: "message--success e-permits-fo-field__success", icon: "icon-circle-checkmark-filled", text: "Adresa a fost completată din Registrul de Stat al Bunurilor Imobile." },
        invalid: { tone: "message--error", icon: "icon-circle-error-filled", text: "Codul nu este valid, corectați." },
        unavailable: { tone: "message--warning e-permits-fo-field__warning", icon: "icon-warning-filled", text: "Adresă indisponibilă. Puteți completa adresa manual." },
      };

      /* the two fields stay in sync: a code typed / chosen in one is written into the other */
      function setSearchValue(value) {
        input.value = value;
        control?.classList.remove("is-typing");
        control?.classList.toggle("has-value", Boolean(value));
        control?.classList.toggle("is-ready", Boolean(value));
      }

      /* „Cod cadastral” box: × with a value (no typing spinner — it is not a live filter), the
         submit enabled only with a value and while no lookup runs (no double submit) */
      function syncCodeBox() {
        if (!codeInput) return;
        const has = Boolean(codeInput.value.trim());
        codeWrap?.classList.remove("is-typing");
        codeWrap?.classList.toggle("has-value", has);
        codeWrap?.classList.toggle("is-ready", has);
        if (codeSubmit) codeSubmit.disabled = !has || busy;
      }

      function setCodeValue(value) {
        if (!codeInput) return;
        codeInput.value = value;
        syncCodeBox();
      }

      /* SRRE is being asked: the inline spinner in the box the request came from (library
         `.loading` hides its ×); the submit stays disabled until the answer */
      function setBusy(on, from = "search") {
        busy = on;
        control?.classList.toggle("loading", on && from === "search");
        codeWrap?.classList.toggle("loading", on && from === "code");
        syncCodeBox();
      }

      /* the parts SRRE fills, as the user sees them now (a hidden part / sector stays out;
         „Cod cadastral” is an input, never a skeleton) */
      function skeletonFields() {
        return [
          ...Object.values(selectFields),
          ...textParts.map((el) => el.closest(".e-permits-fo-field")),
        ].filter((el) => el && !el.hidden && el.style.display !== "none");
      }

      function setSkeleton(on) {
        root.querySelectorAll("[data-fo-srre-skeleton]").forEach((el) => el.remove());
        root.querySelectorAll(".e-permits-fo-field.is-srre-loading").forEach((el) => el.classList.remove("is-srre-loading"));
        if (grid) grid.toggleAttribute("aria-busy", on);
        if (!on) return;
        skeletonFields().forEach((fieldEl) => {
          fieldEl.classList.add("is-srre-loading");
          fieldEl.insertAdjacentHTML("beforeend", '<span class="e-permits-fo-skeleton e-permits-fo-skeleton--input" aria-hidden="true" data-fo-srre-skeleton></span>');
        });
      }

      /* one message slot per field: its hint by default, the lookup message in its place —
         only in the field the code came from (`from`) */
      function setStatus(kind, from = "search") {
        const message = kind ? MESSAGES[kind] : null;
        Object.entries(sources).forEach(([key, source]) => {
          if (!source) return;
          const own = Boolean(message) && key === from;
          source.control?.classList.toggle("is-error", own && kind === "invalid");
          if (own && kind === "invalid") source.input.setAttribute("aria-invalid", "true");
          else source.input.removeAttribute("aria-invalid");
          if (!own) {
            source.slot.className = "e-permits-fo-field__hint";
            source.slot.textContent = source.hint;
            return;
          }
          source.slot.className = `message message--inline e-permits-fo-field__error ${message.tone}`;
          source.slot.innerHTML = `${message.icon
            ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#${message.icon}"></use></svg>`
            : '<span class="spinner spinner--small spinner--brand" aria-hidden="true"></span>'}<span>${escapeFrontOfficeHtml(message.text)}</span>`;
        });
        setSkeleton(kind === "loading");
        /* screen readers hear the outcome once (not the loader, not the hint) */
        if (live) live.textContent = kind && kind !== "loading" ? message.text : "";
      }

      const checkHtml = '<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>';
      const labelText = (fieldEl) => fieldEl?.querySelector("label")?.childNodes[0]?.textContent.trim() || "";

      function flash(wrap) {
        if (!wrap) return;
        wrap.classList.remove("is-srre-new");
        void wrap.offsetWidth;
        wrap.classList.add("is-srre-new");
        wrap.addEventListener("animationend", () => wrap.classList.remove("is-srre-new"), { once: true });
      }

      function lockSelect(fieldEl, value, { flag = "" } = {}) {
        if (!fieldEl) return;
        const select = fieldEl.querySelector(".e-permits-fo-select");
        if (select) select.hidden = true;
        fieldEl.querySelector("[data-fo-srre-value]")?.remove();
        fieldEl.insertAdjacentHTML("beforeend", `
          <div class="e-permits-fo-input is-filled is-readonly" data-fo-srre-value>
            ${flag ? `<span class="e-permits-fo-country-flag" aria-hidden="true">${flag}</span>` : ""}
            <input type="text" readonly tabindex="-1" value="${escapeFrontOfficeHtml(value)}" aria-label="${escapeFrontOfficeHtml(labelText(fieldEl))}">
            ${checkHtml}
          </div>`);
        flash(fieldEl.querySelector("[data-fo-srre-value]"));
      }

      function lockInput(inputEl, value) {
        const wrap = inputEl?.closest(".e-permits-fo-input");
        if (!wrap) return;
        if (inputEl.dataset.foPlaceholder === undefined) inputEl.dataset.foPlaceholder = inputEl.placeholder;
        inputEl.disabled = false;
        inputEl.readOnly = true;
        inputEl.tabIndex = -1;
        inputEl.value = value || "";
        inputEl.placeholder = value ? inputEl.placeholder : "—";
        wrap.classList.remove("is-disabled");
        wrap.classList.add("is-filled", "is-readonly");
        wrap.querySelector(".icon")?.remove();
        if (value) {
          wrap.insertAdjacentHTML("beforeend", checkHtml);
          flash(wrap);
        }
      }

      function unlockInput(inputEl) {
        const wrap = inputEl?.closest(".e-permits-fo-input");
        if (!wrap) return;
        inputEl.readOnly = false;
        inputEl.removeAttribute("tabindex");
        inputEl.value = "";
        if (inputEl.dataset.foPlaceholder !== undefined) inputEl.placeholder = inputEl.dataset.foPlaceholder;
        wrap.classList.remove("is-filled", "is-readonly", "is-srre-new");
        wrap.querySelector(".icon")?.remove();
      }

      /* clear the SRRE fill: fields empty and editable, the cascade back to its start. The code
         itself stays where the user typed it (an invalid code is corrected, not retyped). */
      function release() {
        if (!filled) return;
        filled = false;
        Object.values(selectFields).forEach((fieldEl) => {
          fieldEl?.querySelector("[data-fo-srre-value]")?.remove();
          const select = fieldEl?.querySelector(".e-permits-fo-select");
          if (select) select.hidden = false;
        });
        api.raion?.clearValue("Selectează raionul/municipiul");
        api.localitate?.disable("Selectează mai întâi Raionul/Municipiul");
        api.strada?.disable("Selectează orașul/comuna mai întâi");
        api.hideSector();
        textParts.forEach(unlockInput);
        api.setPostalEnabled(false);
      }
      /* a saved address chosen in the search: the SRRE parts become editable, the code goes */
      root.foCadastralRelease = () => {
        token += 1;
        setBusy(false);
        lastCode = "";
        release();
        setCodeValue("");
        setStatus(null);
      };

      function fill(address, code, postalCode) {
        release();
        const focused = [input, codeInput].includes(document.activeElement) ? document.activeElement : null;
        api.raion?.setValue(address.district);
        api.localitate?.setValue(address.locality);
        const chisinau = api.isChisinauLocality(address.locality) && address.sector;
        if (chisinau) api.sector?.setValue(address.sector);
        else api.hideSector();
        api.strada?.setValue(address.street);
        lockSelect(selectFields.country, "Republica Moldova", { flag: "🇲🇩" });
        lockSelect(selectFields.district, address.district);
        lockSelect(selectFields.locality, address.locality);
        if (chisinau) lockSelect(selectFields.sector, address.sector);
        lockSelect(selectFields.street, address.street);
        lockInput(part("postalCode"), postalCode);
        lockInput(part("house"), address.house);
        lockInput(part("block"), address.block);
        lockInput(part("apartment"), address.apartment);
        setCodeValue(code);
        if (input.value.trim() !== code) setSearchValue(code);
        filled = true;
        /* the cascade selects take focus when set: give it back to the field being typed in */
        if (focused) focused.focus({ preventScroll: true });
        else if (root.contains(document.activeElement)) document.activeElement.blur();
      }

      /* an explicit request (submit / Enter / the list's „Caută codul cadastral” row) — never on
         a typing pause or on blur. A submit re-runs even for the same code. */
      async function lookup(code, from = "search") {
        if (!code || busy) return;
        lastCode = code;
        const run = ++token;
        const mode = foAddressDemo.srre;
        setBusy(true, from);
        setStatus("loading", from);
        const started = performance.now();
        const db = await loadSrreDb();
        if (mode === "asteptare") return;
        const delay = Math.max(SRRE_SKELETON_MIN_MS, SRRE_DELAY_MS[mode] || SRRE_DELAY_MS.normal);
        await wait(Math.max(0, delay - (performance.now() - started)));
        if (run !== token) return;
        setBusy(false);
        const address = mode === "invalid" ? null : db.parcels?.[code];
        if (mode === "indisponibil" || address?.unavailable) { release(); setStatus("unavailable", from); return; }
        if (!address) { release(); setStatus("invalid", from); return; }
        fill(address, code, db.postalCodes?.[address.locality] || "");
        setStatus("success", from);
      }

      /* submit: a code is sent to SRRE; anything else (letters, other characters) cannot be a
         cadastral code → „Codul nu este valid” at once, SRRE is not asked (AC-19) */
      function submit(from) {
        const value = sources[from]?.input.value.trim() || "";
        if (!value || busy) return;
        if (isCode(value)) { lookup(value, from); return; }
        token += 1;
        lastCode = value;
        release();
        setStatus("invalid", from);
      }

      /* typing in either field mirrors the code into the other and puts the hint back (AC-21);
         nothing is sent. Values filled for an earlier code stay until the next submit. An emptied
         field (× included) releases the fill and empties the other one (AC-16); address text
         (not a code) in the search releases it too — it searches saved addresses instead. */
      function onInput(raw, from = "search") {
        const value = String(raw || "").trim();
        if (from === "code") { setSearchValue(value); syncCodeBox(); }
        else if (!value || isCode(value)) setCodeValue(value);
        if (!value || (from === "search" && !isCode(value))) {
          token += 1;
          setBusy(false);
          lastCode = "";
          release();
          if (from === "search") setCodeValue("");
          setStatus(null);
          return;
        }
        /* a code edited while SRRE answers: the running request finishes (submit is disabled) */
        if (busy) return;
        setStatus(null);
      }

      /* Enter in the search with its list closed = the same explicit request (with the list
         open, Enter picks the active row — the „Caută codul cadastral” row comes first) */
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || (list && !list.hidden)) return;
        const value = input.value.trim();
        if (isCode(value)) { event.preventDefault(); lookup(value, "search"); }
      });

      if (codeInput) {
        codeInput.addEventListener("input", () => onInput(codeInput.value, "code"));
        /* Enter = the submit (js/search.js clicks .btn-search); only stop a form submit here */
        codeInput.addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
        codeSubmit?.addEventListener("click", (event) => {
          event.preventDefault();
          submit("code");
        });
        /* × = library clear (js/search.js empties, focuses and fires `input` → onInput, AC-16) */
        syncCodeBox();
      }

      searchRoot.foCadastral = {
        isCode,
        onInput: (raw) => onInput(raw, "search"),
        isFilled: () => filled,
        /* the list's „Caută codul cadastral «…»” row: the code goes into „Cod cadastral” and is sent */
        search: (code) => { setCodeValue(code); lookup(code, "search"); },
        choose: (code) => { setCodeValue(code); lookup(code, "search"); },
        savedCodes: () => (foAddressDemo.saved === "fara" ? [] : (srreDb?.savedCodes?.[frontOfficeSelectedSubject?.id] || [])).map((item) => ({
          cadastral: true,
          code: item.code,
          title: item.code,
          meta: item.label,
          icon: "icon-home-line",
        })),
      };
    }

    function initSubdivisionField(root) {
      if (root.foSubdivisionInitialized) return;
      root.foSubdivisionInitialized = true;
      let mapping = {};
      try { mapping = JSON.parse(root.dataset.foSubdivisionMapping || "{}"); } catch (e) { mapping = {}; }
      const selectEl = root.querySelector("[data-fo-subdivision-select]");
      const hint = root.querySelector("[data-fo-subdivision-hint]");
      let userOverride = false;
      const select = bindCascadeSelect(selectEl, { onChange: () => { userOverride = true; if (hint) hint.hidden = true; } });
      /* picked by the applicant: no suggestion from the address */
      if (root.dataset.foSubdivisionMode === "select") return;
      document.addEventListener("fo:raion-changed", (e) => {
        if (!root.isConnected) return;
        if (userOverride) return;
        const raionValue = e.detail?.raion;
        const suggested = raionValue ? mapping[raionValue] : null;
        if (suggested) {
          select?.setValue(suggested);
          if (hint) { hint.textContent = `Autoselectată din raionul adresei (${raionValue}).`; hint.hidden = false; }
        } else {
          select?.clearValue("Va fi sugerată după raion");
          if (hint) { hint.textContent = "Selectați raionul pentru a sugera subdiviziunea automat."; hint.hidden = false; }
        }
      });
    }

    function initCharCounter(counterEl) {
      const fieldRoot = counterEl.closest(".e-permits-fo-field");
      const input = fieldRoot?.querySelector("[data-fo-char-input]");
      if (!input) return;
      const max = parseInt(counterEl.dataset.foCharMax, 10) || 0;
      function update() {
        const len = input.value.length;
        if (len > 0) { counterEl.textContent = `${len} / ${max}`; counterEl.removeAttribute("hidden"); }
        else { counterEl.setAttribute("hidden", ""); }
      }
      input.addEventListener("input", update);
      update();
    }

    function phoneFieldHtml(field, { readonly = false, tag = "" } = {}) {
      const id = fieldId(field.id);
      const codes = Array.isArray(field.countryCodes) && field.countryCodes.length ? field.countryCodes : [{ flag: "🇲🇩", code: "+373" }];
      const selected = codes[0];
      const label = tag
        ? `<div class="e-permits-fo-field__label-row">${labelHtml(id, field)}<span class="e-permits-fo-field__tag">${escapeFrontOfficeHtml(tag)}</span></div>`
        : labelHtml(id, field);
      if (readonly) {
        return `
          <div class="${fieldClass(field)}">
            ${label}
            ${readonlyPhoneHtml(field.value || "", { id, flag: selected.flag, code: selected.code })}
          </div>
        `;
      }
      return `
        <div class="${fieldClass(field)}">
          ${label}
          <div class="e-permits-fo-phone e-permits-fo-phone--editable" data-fo-phone-code>
            <button class="e-permits-fo-phone__prefix e-permits-fo-phone__prefix--select" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(id)}-code-list" data-fo-phone-code-button>
              <span aria-hidden="true" data-fo-phone-code-flag>${escapeFrontOfficeHtml(selected.flag)}</span>
              <span data-fo-phone-code-value>${escapeFrontOfficeHtml(selected.code)}</span>
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <input id="${escapeFrontOfficeHtml(id)}" type="tel" value="${escapeFrontOfficeHtml(field.value || "")}" placeholder="${escapeFrontOfficeHtml(field.placeholder || "")}" inputmode="tel">
            <ul class="e-permits-fo-phone__code-list" id="${escapeFrontOfficeHtml(id)}-code-list" role="listbox" aria-label="Cod țară" data-fo-phone-code-list hidden>
              ${codes.map((item, index) => `<li class="e-permits-fo-phone__code-option${index === 0 ? " is-selected" : ""}" role="option" aria-selected="${index === 0 ? "true" : "false"}" data-flag="${escapeFrontOfficeHtml(item.flag)}" data-code="${escapeFrontOfficeHtml(item.code)}" tabindex="-1">${escapeFrontOfficeHtml(`${item.flag} ${item.code}`)}</li>`).join("")}
            </ul>
          </div>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    function mnotifyInfoHtml() {
      return `
        <div class="e-permits-fo-mnotify-info">
          <div class="e-permits-fo-mnotify-info__frame">
            <span class="e-permits-fo-mnotify-info__icon-wrap" aria-hidden="true">
              <svg class="icon e-permits-fo-mnotify-info__icon" width="24" height="24">
                <use href="assets/icons/sprite.svg#icon-circle-info-filled"></use>
              </svg>
            </span>
            <div class="e-permits-fo-mnotify-info__content">
              <p class="e-permits-fo-mnotify-info__text">Datele de contact sunt preluate din MNotify.</p>
            </div>
          </div>
          <a class="e-permits-fo-mnotify-info__link" href="#">
            <span>Modifică datele</span>
            <svg class="icon" width="16" height="16" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-external-link"></use>
            </svg>
          </a>
        </div>
      `;
    }

    function contactChoices(contact, key, fallbackValue = "") {
      const pluralKey = `${key}s`;
      const values = [];
      if (Array.isArray(contact?.[pluralKey])) values.push(...contact[pluralKey]);
      if (contact?.[key]) values.unshift(contact[key]);
      if (!values.length && fallbackValue) values.push(fallbackValue);
      return [...new Set(values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
    }

    function contactChoiceSelectHtml({ id, listId, value, choices }) {
      return `
        <div class="e-permits-fo-select" data-fo-select>
          <button
            id="${escapeFrontOfficeHtml(id)}"
            class="e-permits-fo-select__button"
            type="button"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="${escapeFrontOfficeHtml(listId)}"
          >
            <span class="e-permits-fo-select__value" data-fo-select-value>${escapeFrontOfficeHtml(value)}</span>
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </button>
          <ul class="e-permits-fo-select__list" id="${escapeFrontOfficeHtml(listId)}" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" hidden>
            ${choices.map((item, index) => `<li class="e-permits-fo-select__option${index === 0 ? " is-selected" : ""}" role="option" aria-selected="${index === 0 ? "true" : "false"}" data-value="${escapeFrontOfficeHtml(item)}" tabindex="-1">${escapeFrontOfficeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    function verifiedValueHtml(value) {
      return `
        <div class="e-permits-fo-input is-filled is-readonly">
          <span class="e-permits-fo-input__value">${escapeFrontOfficeHtml(value)}</span>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
          </svg>
        </div>
      `;
    }

    function readonlyPhoneHtml(value, { id = "", flag = "🇲🇩", code = "+373" } = {}) {
      const rawValue = String(value || "").trim();
      const displayValue = rawValue.startsWith("+") ? rawValue : [code, rawValue].filter(Boolean).join(" ");
      return `
        <div class="e-permits-fo-phone e-permits-fo-phone--readonly is-filled">
          <span class="e-permits-fo-phone__value"${id ? ` id="${escapeFrontOfficeHtml(id)}"` : ""}>${escapeFrontOfficeHtml(displayValue)}</span>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
          </svg>
        </div>
      `;
    }

    function verifiedPhoneHtml(value, { flag = "🇲🇩", code = "+373" } = {}) {
      return readonlyPhoneHtml(value, { flag, code });
    }

    /* Persoana de contact (US-13 AC-11/12): radio option rows „Eu” (prefilled, read-only) / „Altă
       persoană” (typed). The FO step calls it with the schema field only (ids as always); the Form
       Builder adds `prefix` (unique ids per surface), `parts` (name · phone · email: visible /
       required, like the address parts), `label` (a visible legend) and one wrapper element. */
    function contactPersonHtml(field) {
      const prefix = field.prefix || "";
      const pid = (id) => (prefix ? `${prefix}-${id}` : id);
      const name = prefix ? `${fieldId(prefix)}-contact` : "fo-contact-person";
      const parts = field.parts || null;
      const shown = (key) => !parts || parts[key]?.visible !== false;
      const required = (key, fallback) => (parts ? Boolean(parts[key]?.required) : fallback);
      const phoneField = { id: pid("contact-phone-self"), label: "Telefon", span: 6, value: field.selfPhone || "60 999 999", countryCodes: [{ flag: "🇲🇩", code: "+373" }] };
      const selfEmail = parts && shown("email") ? readonlyFieldHtml({ id: fieldId(pid("contact-email-self")), label: "Email", value: field.selfEmail || "—", span: 6 }) : "";
      const otherEmail = parts && shown("email") ? textFieldHtml({ id: pid("contact-email"), type: "email", label: "Email", required: required("email", false), span: 6, placeholder: "nume@exemplu.md", autocomplete: "email" }) : "";
      const legend = prefix && field.label
        ? `<legend class="e-permits-fo-choice__legend">${escapeFrontOfficeHtml(field.label)}${field.required ? ` ${requiredMarkerHtml()}` : ""}</legend>`
        : `<legend class="u-visually-hidden">Alege persoana de contact</legend>`;
      const html = `
        <fieldset class="e-permits-fo-radio-group e-permits-fo-radio-group--contact" data-fo-contact-person>
          ${legend}
          <label class="e-permits-fo-radio e-permits-fo-radio--option"><input type="radio" name="${name}" value="self" ${field.default !== "other" ? "checked" : ""}><span class="e-permits-fo-radio__control" aria-hidden="true"></span><span>Eu sunt persoana de contact</span></label>
          <label class="e-permits-fo-radio e-permits-fo-radio--option"><input type="radio" name="${name}" value="other" ${field.default === "other" ? "checked" : ""}><span class="e-permits-fo-radio__control" aria-hidden="true"></span><span>Altă persoană</span></label>
        </fieldset>
        <div class="e-permits-fo-detail-card e-permits-fo-contact-card e-permits-fo-contact-card--self" data-fo-contact-self>
          <div class="e-permits-fo-contact-card__grid">${shown("phone") ? phoneFieldHtml(phoneField, { readonly: true }) : ""}${selfEmail}</div>
        </div>
        <div class="e-permits-fo-detail-card e-permits-fo-contact-card" data-fo-contact-other hidden>
          <div class="e-permits-fo-contact-card__grid">
            ${shown("name") ? textFieldHtml({ id: pid("contact-first-name"), label: "Nume", required: required("name", true), span: 6, placeholder: "Anastasia", autocomplete: "given-name" }) : ""}
            ${shown("name") ? textFieldHtml({ id: pid("contact-last-name"), label: "Prenume", required: required("name", true), span: 6, placeholder: "Cojocaru", autocomplete: "family-name" }) : ""}
            ${shown("phone") ? phoneFieldHtml({ id: pid("contact-phone"), label: "Telefon", required: required("phone", true), span: 6, placeholder: "60 999 999", countryCodes: [{ flag: "🇲🇩", code: "+373" }, { flag: "🇷🇴", code: "+40" }, { flag: "🇺🇦", code: "+380" }] }) : ""}
            ${otherEmail}
          </div>
        </div>
      `;
      return prefix ? `<div class="e-permits-fo-field-group e-permits-fo-field-group--stack">${html}</div>` : html;
    }

    function caemOptionHtml(option) {
      return `<li class="e-permits-fo-caem__option" role="option" aria-selected="false" data-code="${escapeFrontOfficeHtml(option.code)}" data-label="${escapeFrontOfficeHtml(option.label)}" data-subgenres="${escapeFrontOfficeHtml(JSON.stringify(option.subgenres || []))}" tabindex="-1"><span class="e-permits-fo-caem__code">${escapeFrontOfficeHtml(option.code)}</span><span class="e-permits-fo-caem__name">${escapeFrontOfficeHtml(option.label)}</span></li>`;
    }

    /* the CAEM pair of the FO activities — „Codul CAEM” combobox + „Subgen de activitate” under its
       guide line. Extracted (2026-10-13, Form Builder batch 4) so the builder's „Activități CAEM”
       preset (a repeatable block) draws the exact same markup; the defaults are the old texts and
       ids, so step 2 renders as before. */
    /* the CAEM list's „no match” = the shared empty state, bare + compact (inside a list) */
    function caemEmptyHtml(title = "Niciun cod CAEM găsit", text = "Caută după cod sau după descriere.") {
      return window.GEAPEmptyState.noResults(title, { text, bare: true, compact: true });
    }

    /* emptyTitle / emptyText / searchLabel: a searchable list of something else (the desk's
       „Denumirea serviciului”, js/ghiseu.js); the defaults keep the CAEM markup byte-identical */
    function caemFieldHtml({ id = "fo-caem-code", label = "Codul CAEM", required = true, placeholder = "Selectează cod CAEM", options = [], emptyTitle, emptyText, searchLabel = "Caută după cod sau descriere" } = {}) {
      return `
          <div class="e-permits-fo-field">
            ${labelHtml(id, { label, required })}
            <div class="e-permits-fo-caem" data-fo-caem>
              <button id="${escapeFrontOfficeHtml(id)}" class="e-permits-fo-caem__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(id)}-menu" data-fo-caem-button>
                <span class="e-permits-fo-caem__value e-permits-fo-caem__value--placeholder" data-fo-caem-value>${escapeFrontOfficeHtml(placeholder)}</span>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
              </button>
              <div class="e-permits-fo-caem__menu" id="${escapeFrontOfficeHtml(id)}-menu" data-fo-caem-menu hidden>
                <div class="e-permits-fo-caem__search"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg><input type="search" placeholder="${escapeFrontOfficeHtml(searchLabel)}" aria-label="${escapeFrontOfficeHtml(searchLabel)}" data-fo-caem-search></div>
                <ul class="e-permits-fo-caem__list" id="${escapeFrontOfficeHtml(id)}-list" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" data-fo-caem-list>${options.map(caemOptionHtml).join("")}</ul>
                <div data-fo-caem-empty hidden>${caemEmptyHtml(emptyTitle, emptyText)}</div>
              </div>
            </div>
          </div>`;
    }

    function subgenHtml({ id = "fo-subgen-activity", menuId = "fo-subgen-menu", label = "Subgen de activitate", required = true, placeholder = "Alege subgen de activitate" } = {}) {
      return `
          <div class="e-permits-fo-subgen" data-fo-subgen hidden>
            <div class="e-permits-fo-subgen__line" aria-hidden="true"></div>
            <div class="e-permits-fo-subgen__content">
              <div class="e-permits-fo-field">
                ${labelHtml(id, { label, required })}
                <div class="e-permits-fo-subgen-select" data-fo-subgen-select${placeholder !== "Alege subgen de activitate" ? ` data-placeholder="${escapeFrontOfficeHtml(placeholder)}"` : ""}>
                  <button id="${escapeFrontOfficeHtml(id)}" class="e-permits-fo-subgen-select__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(menuId)}" data-fo-subgen-button>
                    <span class="e-permits-fo-subgen-select__value e-permits-fo-subgen-select__value--placeholder" data-fo-subgen-value>${escapeFrontOfficeHtml(placeholder)}</span>
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                  </button>
                  <div class="e-permits-fo-subgen-select__menu" id="${escapeFrontOfficeHtml(menuId)}" data-fo-subgen-menu hidden>
                    <div class="e-permits-fo-subgen-select__search"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg><input type="search" placeholder="Caută subgen" aria-label="Caută subgen" data-fo-subgen-search></div>
                    <ul class="e-permits-fo-subgen-select__list" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" aria-multiselectable="true" data-fo-subgen-list></ul>
                    <div class="e-permits-fo-subgen-select__footer"><span><strong data-fo-subgen-count>0</strong> <span data-fo-subgen-count-label>selectate</span></span><button class="e-permits-fo-subgen-select__confirm" type="button" data-fo-subgen-confirm>Confirmă</button></div>
                  </div>
                </div>
              </div>
              <div class="e-permits-fo-subgen__chips" data-fo-subgen-chips hidden></div>
            </div>
          </div>`;
    }

    function activityCardHtml(field) {
      const options = field.caemOptions || [];
      return `
        <div class="e-permits-fo-activity-card" data-fo-activity-card>
          <div class="e-permits-fo-activity-card__header">
            <div class="e-permits-fo-activity-card__title"><span data-fo-activity-index>#1</span><strong>Activitate</strong></div>
          </div>${caemFieldHtml({ options })}${subgenHtml()}
        </div>
        <button class="e-permits-fo-add-activity" type="button" data-fo-add-activity><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-small"></use></svg><span>Adaugă altă activitate</span></button>
      `;
    }

    /* a searchable list (Listă derulantă with „Căutare”): the CAEM combobox on its own */
    function comboboxFieldHtml(field) {
      const html = caemFieldHtml({ id: fieldId(field.id), label: field.label || "", required: Boolean(field.required), placeholder: field.placeholder || "Selectează", options: field.options || [], emptyTitle: field.emptyTitle, emptyText: field.emptyText, searchLabel: field.searchLabel });
      return html.replace('<div class="e-permits-fo-field">', `<div class="${fieldClass(field)}">`);
    }

    /* ---- Form Builder field types in the request form (2026-10-13) ----------------------------
       ONE renderer for the builder canvas, the builder Preview and the FO form: js/form-builder.js
       projects its schema onto these FO field objects and calls stepFieldHtml through
       window.GEAPFormRender — there is no second „preview” renderer (spec form-builder.md § C.0).
       Field shape: { id, type, label, required, span, hint, placeholder, value, readOnly, … }. */
    const foUi = () => window.GEAPUi || {};

    function localIsoDay(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    function textareaFieldHtml(field) {
      const id = fieldId(field.id);
      const max = Number(field.maxLength) || 0;
      const counter = Boolean(field.charCounter && max);
      const labelRow = counter
        ? `<div class="e-permits-fo-field__label-counter">${labelHtml(id, field)}<span class="e-permits-fo-field__counter" data-fo-char-counter data-fo-char-max="${max}" hidden>0 / ${max}</span></div>`
        : labelHtml(id, field);
      const rows = Math.min(Math.max(Number(field.rows) || 2, 1), 20);
      return `
        <div class="${fieldClass(field)}">
          ${labelRow}
          <div class="e-permits-fo-textarea${field.readOnly ? " is-filled is-readonly" : ""}">
            <textarea id="${escapeFrontOfficeHtml(id)}" rows="${rows}" placeholder="${escapeFrontOfficeHtml(field.placeholder || "")}" ${max ? `maxlength="${max}"` : ""} ${counter ? "data-fo-char-input" : ""} ${field.readOnly ? "readonly" : ""} ${field.required ? 'aria-required="true"' : ""}${fieldDescribedBy(id, field)}>${escapeFrontOfficeHtml(field.value || "")}</textarea>
          </div>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    /* Număr / Sumă: the FO input + the local unit suffix (components.md „Local unit suffix”);
       the unit is repeated in the label for screen readers (the suffix is aria-hidden) */
    function numberFieldHtml(field) {
      const id = fieldId(field.id);
      const unit = field.unit || "";
      const label = `<label for="${escapeFrontOfficeHtml(id)}">${escapeFrontOfficeHtml(field.label || "")}${unit ? `<span class="u-visually-hidden"> (${escapeFrontOfficeHtml(unit)})</span>` : ""} ${field.required ? requiredMarkerHtml() : ""}</label>`;
      return `
        <div class="${fieldClass(field)}">
          ${label}
          <div class="e-permits-fo-input${field.readOnly ? " is-filled is-readonly" : ""}">
            <input id="${escapeFrontOfficeHtml(id)}" type="text" inputmode="${Number(field.decimals) > 0 ? "decimal" : "numeric"}" autocomplete="off" ${field.value !== undefined && field.value !== "" ? `value="${escapeFrontOfficeHtml(field.value)}"` : ""} placeholder="${escapeFrontOfficeHtml(field.placeholder || "")}" ${field.readOnly ? "readonly" : ""} ${field.required ? 'aria-required="true"' : ""}${fieldDescribedBy(id, field)} data-fo-number>
            ${unit ? `<label class="e-permits-fo-input__suffix" for="${escapeFrontOfficeHtml(id)}" aria-hidden="true">${escapeFrontOfficeHtml(unit)}</label>` : ""}
          </div>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    /* Dată: the library date picker in the FO field shell (components.md „Date field in app
       forms”) — never type="date". data-min disables earlier days; a max is checked on input. */
    function dateFieldHtml(field) {
      const id = fieldId(field.id);
      const iso = field.value || "";
      const [y, m, day] = iso ? iso.split("-") : [];
      const today = localIsoDay();
      const view = (iso || today).split("-");
      return `
        <div class="${fieldClass(field)}">
          ${labelHtml(id, field)}
          <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeFrontOfficeHtml(iso)}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}"${field.min ? ` data-min="${escapeFrontOfficeHtml(field.min)}"` : ""}>
            <div class="e-permits-fo-input e-permits-fo-input--with-action${field.readOnly ? " is-filled is-readonly" : ""}">
              <input id="${escapeFrontOfficeHtml(id)}" type="text" class="js-date-picker-input" value="${iso ? `${day}/${m}/${y}` : ""}" placeholder="${escapeFrontOfficeHtml(field.placeholder || "ZZ/LL/AAAA")}" autocomplete="off" ${field.readOnly ? "readonly" : ""} ${field.required ? 'aria-required="true"' : ""}${fieldDescribedBy(id, field)}>
              <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${escapeFrontOfficeHtml(id)}-panel" aria-expanded="false"${field.readOnly ? " disabled" : ""}>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-calendar"></use></svg>
              </button>
            </div>
            <div id="${escapeFrontOfficeHtml(id)}-panel" class="date-picker-panel" aria-hidden="true" hidden>
              <div class="date-picker" role="dialog" aria-label="Alege data">
                <div class="date-picker__header">
                  <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-left"></use></svg></button>
                  <div class="date-picker__month js-date-picker-label"></div>
                  <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg></button>
                </div>
                <div class="date-picker__grid date-picker__grid--days" data-view="day">
                  <div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div>
                  <div class="date-picker__days js-date-picker-days"></div>
                </div>
              </div>
            </div>
          </div>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    /* a labelled group of choices (radio rows / checkbox list): fieldset + legend that reads as
       the field label; the group fills its grid column (components.md „Choice field”) */
    function choiceLegendHtml(field) {
      return `<legend class="e-permits-fo-choice__legend">${escapeFrontOfficeHtml(field.label || "")}${field.required ? ` ${requiredMarkerHtml()}` : ""}</legend>`;
    }

    function choiceClass(field) {
      const span = [3, 4, 6, 8, 12].includes(Number(field?.span)) ? Number(field.span) : 12;
      return `e-permits-fo-choice e-permits-fo-field--span-${span}`;
    }

    /* Butoane radio: the radio option rows (`.e-permits-fo-radio--option`), stacked or in a row */
    function radioFieldHtml(field) {
      const id = fieldId(field.id);
      const options = Array.isArray(field.options) ? field.options : [];
      const inline = field.orientation === "horizontal";
      return `
        <fieldset class="${choiceClass(field)}"${fieldDescribedBy(id, field)}${field.required ? ' aria-required="true"' : ""}>
          ${choiceLegendHtml(field)}
          <div class="e-permits-fo-choice__group${inline ? " e-permits-fo-choice__group--inline" : ""}">
            ${options.map((option) => `
              <label class="e-permits-fo-radio e-permits-fo-radio--option">
                <input type="radio" name="${escapeFrontOfficeHtml(id)}" value="${escapeFrontOfficeHtml(option.value)}"${option.value === field.value ? " checked" : ""}${field.readOnly ? " disabled" : ""}>
                <span class="e-permits-fo-radio__control" aria-hidden="true"></span>
                <span>${escapeFrontOfficeHtml(option.label)}</span>
              </label>`).join("")}
          </div>
          ${fieldHintHtml(id, field)}
        </fieldset>
      `;
    }

    /* Casetă de bifare (boolean): the library checkbox, as the FO consent row */
    function checkboxFieldHtml(field) {
      const id = fieldId(field.id);
      return `
        <div class="${fieldClass(field)}">
          <label class="checkbox checkbox--medium e-permits-fo-consent" for="${escapeFrontOfficeHtml(id)}">
            <input class="checkbox-input" type="checkbox" id="${escapeFrontOfficeHtml(id)}"${field.value ? " checked" : ""}${field.readOnly ? " disabled" : ""}${field.required ? ' aria-required="true"' : ""}${fieldDescribedBy(id, field)}>
            <span class="checkbox-custom" aria-hidden="true"></span>
            <span>${field.labelHtml || escapeFrontOfficeHtml(field.label || "")}${field.required ? ` ${requiredMarkerHtml()}` : ""}</span>
          </label>
          ${fieldHintHtml(id, field)}
        </div>
      `;
    }

    /* Listă de bifare: plain checkbox options (renderCheckOption({ plain: true })) under a legend */
    function checklistFieldHtml(field) {
      const id = fieldId(field.id);
      const options = Array.isArray(field.options) ? field.options : [];
      const values = Array.isArray(field.value) ? field.value : [];
      const checkOption = foUi().renderCheckOption;
      return `
        <fieldset class="${choiceClass(field)}"${fieldDescribedBy(id, field)}>
          ${choiceLegendHtml(field)}
          <div class="e-permits-fo-choice__checks">
            ${checkOption ? options.map((option) => checkOption({ label: option.label, plain: true, checked: values.includes(option.value), disabled: Boolean(field.readOnly), attrs: `name="${escapeFrontOfficeHtml(id)}" value="${escapeFrontOfficeHtml(option.value)}"` })).join("") : ""}
          </div>
          ${fieldHintHtml(id, field)}
        </fieldset>
      `;
    }

    /* Text informativ: the one inline note (grey renderInfoNote, or a tinted renderNotice) */
    function infoFieldHtml(field) {
      const text = escapeFrontOfficeHtml(field.text || "").replace(/\n/g, "<br>");
      const tone = ["info", "warning", "success", "error"].includes(field.tone) ? field.tone : "neutral";
      const note = tone === "neutral" ? foUi().renderInfoNote?.(text) : foUi().renderNotice?.(tone, text);
      return `<div class="${fieldClass(field)}">${note || ""}</div>`;
    }

    /* Notă cu titlu: the tinted callout (components.md „Callout”), info or warning */
    function calloutFieldHtml(field) {
      const tone = field.tone === "warning" ? "warning" : "info";
      const iconId = tone === "warning" ? "icon-warning-filled" : "icon-circle-info-filled";
      const text = escapeFrontOfficeHtml(field.text || "").replace(/\n/g, "<br>");
      return `
        <div class="${fieldClass(field)}">
          <div class="e-permits-callout e-permits-callout--${tone}" role="note">
            <span class="e-permits-callout__icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/sprite.svg#${iconId}"></use></svg></span>
            <div class="e-permits-callout__content">
              ${field.title ? `<p class="e-permits-callout__title">${escapeFrontOfficeHtml(field.title)}</p>` : ""}
              ${text ? `<p class="e-permits-callout__text">${text}</p>` : ""}
            </div>
          </div>
        </div>`;
    }

    /* Separator: the library rule, full width */
    function separatorFieldHtml(field) {
      return `<div class="${fieldClass({ ...field, span: 12 })}"><hr class="separator separator--horizontal separator--thin separator--subtle"></div>`;
    }

    /* Comutator segmentat: the animated segmented control (role radiogroup); the label names it */
    function segmentFieldHtml(field) {
      const id = fieldId(field.id);
      const options = Array.isArray(field.options) ? field.options : [];
      return `
        <div class="${fieldClass(field)}">
          <label id="${escapeFrontOfficeHtml(id)}-label">${escapeFrontOfficeHtml(field.label || "")} ${field.required ? requiredMarkerHtml() : ""}</label>
          <div class="segmented-control is-animated" role="radiogroup" aria-labelledby="${escapeFrontOfficeHtml(id)}-label"${fieldDescribedBy(id, field)} data-fo-segment>
            ${options.map((option, index) => {
              const on = option.value === field.value;
              const focusable = on || (!field.value && index === 0);
              return `<button class="segment-item${on ? " is-selected" : ""}" type="button" role="radio" aria-checked="${on}" tabindex="${focusable ? "0" : "-1"}" data-value="${escapeFrontOfficeHtml(option.value)}"${field.readOnly ? " disabled" : ""}>${escapeFrontOfficeHtml(option.label)}</button>`;
            }).join("")}
          </div>
          ${fieldHintHtml(id, field)}
        </div>`;
    }

    /* Selecție multiplă: the FO multi-select (search, checkbox list, „N selectate”, Confirmă) +
       chips — the CAEM subgenre control with its texts from data attributes */
    function multiselectFieldHtml(field) {
      const id = fieldId(field.id);
      const options = Array.isArray(field.options) ? field.options : [];
      const placeholder = field.placeholder || "Alege opțiunile";
      return `
        <div class="${fieldClass(field)}" data-fo-subgen>
          ${labelHtml(id, field)}
          <div class="e-permits-fo-subgen-select" data-fo-subgen-select data-placeholder="${escapeFrontOfficeHtml(placeholder)}" data-count-one="opțiune selectată" data-count-many="opțiuni selectate" data-remove-label="Elimină opțiunea">
            <button id="${escapeFrontOfficeHtml(id)}" class="e-permits-fo-subgen-select__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(id)}-menu"${field.readOnly ? " disabled" : ""} data-fo-subgen-button>
              <span class="e-permits-fo-subgen-select__value e-permits-fo-subgen-select__value--placeholder" data-fo-subgen-value>${escapeFrontOfficeHtml(placeholder)}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <div class="e-permits-fo-subgen-select__menu" id="${escapeFrontOfficeHtml(id)}-menu" data-fo-subgen-menu hidden>
              <div class="e-permits-fo-subgen-select__search"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg><input type="search" placeholder="Caută" aria-label="Caută în opțiuni" data-fo-subgen-search></div>
              <ul class="e-permits-fo-subgen-select__list" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" aria-multiselectable="true" data-fo-subgen-list>
                ${options.map((value) => `
                  <li class="e-permits-fo-subgen-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(value)}" tabindex="-1">
                    <span class="checkbox checkbox--medium" aria-hidden="true"><input class="checkbox-input" type="checkbox" tabindex="-1"><span class="checkbox-custom"></span></span>
                    <span>${escapeFrontOfficeHtml(value)}</span>
                  </li>`).join("")}
              </ul>
              <div class="e-permits-fo-subgen-select__footer"><span><strong data-fo-subgen-count>0</strong> <span data-fo-subgen-count-label>selectate</span></span><button class="e-permits-fo-subgen-select__confirm" type="button" data-fo-subgen-confirm>Confirmă</button></div>
            </div>
          </div>
          <div class="e-permits-fo-subgen__chips" data-fo-subgen-chips hidden></div>
          ${fieldHintHtml(id, field)}
        </div>`;
    }

    /* Perioadă: two date pickers „De la” / „Până la” under one legend (rule: Până la ≥ De la) */
    function periodFieldHtml(field) {
      const id = fieldId(field.id);
      const part = (suffix, label, value) => dateFieldHtml({ id: `${field.id}-${suffix}`, label, required: field.required, span: 6, value, min: field.min, readOnly: field.readOnly });
      return `
        <fieldset class="${choiceClass(field)}"${fieldDescribedBy(id, field)} data-fo-period>
          ${choiceLegendHtml(field)}
          <div class="e-permits-fo-choice__pair">
            ${part("from", field.fromLabel || "De la", field.value?.from || "")}
            ${part("to", field.toLabel || "Până la", field.value?.to || "")}
          </div>
          ${fieldHintHtml(id, field)}
        </fieldset>`;
    }

    /* ---- Form Builder batch 3: identity, registries, files, hidden, consent (2026-10-13) ---- */
    const CHECK_ICON_HTML = '<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>';

    /* a 13-digit code input (IDNP / IDNO): digits only + the `n/13` counter (guest pattern); a
       lookup group marks it `data-fo-registry-code`; `disabled` = waiting for the consent */
    function codeInputHtml(field, { code = "IDNP", lookup = false, disabled = false } = {}) {
      const id = fieldId(field.id);
      const hint = field.hint || "13 cifre";
      return `
        <div class="${fieldClass(field)}">
          <div class="e-permits-fo-field__label-counter">${labelHtml(id, field)}<span class="e-permits-fo-field__counter" data-fo-digits-counter>0/13</span></div>
          <div class="e-permits-fo-input${disabled ? " is-disabled" : ""}">
            <input id="${escapeFrontOfficeHtml(id)}" type="text" inputmode="numeric" maxlength="13" placeholder="Introdu ${code}" autocomplete="off" aria-describedby="${escapeFrontOfficeHtml(id)}-hint"${field.required ? ' aria-required="true"' : ""}${disabled ? " disabled" : ""} data-fo-digits${lookup ? " data-fo-registry-code" : ""}>
          </div>
          <p class="e-permits-fo-field__hint" id="${escapeFrontOfficeHtml(id)}-hint" data-fo-field-hint>${escapeFrontOfficeHtml(hint)}</p>
        </div>`;
    }

    /* a read-only target filled by a registry lookup (empty until the answer arrives) */
    function registryTargetHtml(id, label, key, span, placeholder) {
      return `
        <div class="${fieldClass({ span })}">
          <label for="${escapeFrontOfficeHtml(id)}">${escapeFrontOfficeHtml(label)}</label>
          <div class="e-permits-fo-input is-filled is-readonly">
            <input id="${escapeFrontOfficeHtml(id)}" type="text" readonly tabindex="-1" placeholder="${escapeFrontOfficeHtml(placeholder)}" data-fo-registry-target="${key}">
          </div>
        </div>`;
    }

    /* IDNP (spec C.5). mode „applicant” = the signed-in person from MPass, read-only; „typed” = typed
       in, format check only — never a name lookup (guest privacy rule: a typed IDNP must not reveal
       who it is); „rsp” = US-48: a declaration of legal ground first, then RSP fills Nume + Prenume */
    function idnpFieldHtml(field) {
      const id = fieldId(field.id);
      if (field.mode === "applicant") {
        return readonlyFieldHtml({ id, label: field.label || "IDNP", value: field.value || "—", span: field.span, required: field.required, hint: field.hint || "Preluat din MPass." });
      }
      if (field.mode !== "rsp") return codeInputHtml(field, { code: "IDNP" });
      const consent = field.consentText || "Declar pe proprie răspundere că dețin consimțământul sau temeiul legal pentru introducerea IDNP-ului și preluarea datelor prin platforma de interoperabilitate.";
      return `
        <div class="e-permits-fo-field-group" data-fo-registry="rsp" data-fo-registry-lookup>
          <div class="${fieldClass({ span: 12 })}">
            <label class="checkbox checkbox--medium e-permits-fo-consent e-permits-fo-pp-consent"><input class="checkbox-input" type="checkbox" data-fo-lookup-consent><span class="checkbox-custom" aria-hidden="true"></span><span>${escapeFrontOfficeHtml(consent)}</span></label>
          </div>
          ${codeInputHtml({ ...field, span: 4 }, { code: "IDNP", lookup: true, disabled: true })}
          ${registryTargetHtml(`${id}-last`, "Nume", "last", 4, "Din RSP, după IDNP")}
          ${registryTargetHtml(`${id}-first`, "Prenume", "first", 4, "Din RSP, după IDNP")}
          <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-registry-live></p>
        </div>`;
    }

    /* IDNO (spec C.5, guest G1b): the code + „Denumirea companiei” read-only from the public registry
       (the guest lookup); „applicant” = the company the user represents, both read-only */
    function idnoFieldHtml(field) {
      const id = fieldId(field.id);
      const nameLabel = field.companyLabel || "Denumirea companiei";
      if (field.mode === "applicant") {
        return `
          <div class="e-permits-fo-field-group">
            ${readonlyFieldHtml({ id, label: field.label || "IDNO", value: field.value || "—", span: 4, required: field.required, hint: field.hint || "Preluat din MPass." })}
            ${readonlyFieldHtml({ label: nameLabel, value: field.company || "—", span: 8 })}
          </div>`;
      }
      return `
        <div class="e-permits-fo-field-group" data-fo-registry="rsud" data-fo-registry-lookup>
          ${codeInputHtml({ ...field, span: 4 }, { code: "IDNO", lookup: true })}
          ${registryTargetHtml(`${id}-name`, nameLabel, "name", 8, "Se completează automat după IDNO")}
          <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-registry-live></p>
        </div>`;
    }

    /* Fișier: the boxed doc field (guest procură) — dashed drop block + black Strict „Adaugă fișier”;
       upload from the device only; types / size / count from the builder */
    function fileFieldHtml(field) {
      const id = fieldId(field.id);
      const types = Array.isArray(field.types) && field.types.length ? field.types : ["PDF"];
      const max = Math.max(1, Number(field.maxFiles) || 1);
      const accept = types.flatMap((type) => FILE_TYPE_EXT[type] || []).join(",");
      const limits = `${types.join(", ")} · maximum ${escapeFrontOfficeHtml(String(field.maxSizeMb || 10))} MB${max > 1 ? ` · până la ${max} fișiere` : ""}.`;
      const label = escapeFrontOfficeHtml(field.label || "Fișier");
      return `
        <div class="${fieldClass(field)}">
          <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed${max > 1 ? " e-permits-fo-doc-field--multi" : ""}" data-fo-doc-field="${escapeFrontOfficeHtml(id)}" data-fo-upload-only data-fo-doc-accept="${escapeFrontOfficeHtml(accept)}" data-fo-doc-max="${max}" data-fo-doc-limits="${escapeFrontOfficeHtml(`${types.join(", ")}|${field.maxSizeMb || 10} MB`)}">
            <div class="e-permits-fo-doc-field__row">
              <div class="e-permits-fo-doc-field__info">
                <span class="e-permits-fo-doc-field__label">${label} ${field.required ? requiredMarkerHtml() : '<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>'}</span>
                <p class="e-permits-fo-doc-field__desc" data-fo-guest-hint>${field.hint ? `${escapeFrontOfficeHtml(field.hint)} ` : ""}${limits}</p>
              </div>
              <button class="btn btn-strict btn-md" type="button" data-fo-open-doc-modal data-fo-doc-label="${label}">
                <svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg>
                <span>Adaugă fișier</span>
              </button>
            </div>
            <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
          </div>
        </div>`;
    }
    const FILE_TYPE_EXT = { PDF: [".pdf"], JPG: [".jpg", ".jpeg"], PNG: [".png"], DOCX: [".docx"], XLSX: [".xls", ".xlsx"], ZIP: [".zip"] };

    /* Document din MDocs: the Acte necesare doc field — „Adaugă fișier” opens the picker with the
       MDocs library and the device upload */
    function mdocsFieldHtml(field) {
      const description = field.hint || (field.docType ? `Îl căutăm în MDocs: ${field.docType}. Îl poți încărca și de pe dispozitiv.` : "Alege-l din MDocs sau încarcă-l de pe dispozitiv.");
      return `<div class="${fieldClass({ span: 12 })}">${postprocessDocFieldHtml({ id: fieldId(field.id), label: field.label || "Document", description, required: Boolean(field.required) })}</div>`;
    }

    /* Câmp ascuns: a value that travels with the request, never shown to the applicant */
    function hiddenFieldHtml(field) {
      return `<input type="hidden" id="${escapeFrontOfficeHtml(fieldId(field.id))}" name="${escapeFrontOfficeHtml(field.key || field.id)}" value="${escapeFrontOfficeHtml(field.value || "")}" data-fo-hidden>`;
    }

    /* Consimțământ: the FO consent checkbox; the first occurrence of `linkText` becomes the link to
       the legal text (new tab) */
    function consentFieldHtml(field) {
      const text = escapeFrontOfficeHtml(field.text || field.label || "");
      const link = escapeFrontOfficeHtml(field.linkText || "");
      const at = link ? text.indexOf(link) : -1;
      const labelHtml = at < 0 || !field.linkUrl ? text
        : `${text.slice(0, at)}<a href="${escapeFrontOfficeHtml(field.linkUrl)}" target="_blank" rel="noopener">${link}</a>${text.slice(at + link.length)}`;
      return checkboxFieldHtml({ ...field, span: 12, labelHtml });
    }

    function stepFieldHtml(field) {
      if (field.type === "cascade-address") return cascadeAddressHtml(field);
      if (field.type === "subdivision") return subdivisionFieldHtml(field);
      if (field.type === "address-pattern") return addressPatternHtml(field);
      if (field.type === "phone") return phoneFieldHtml(field);
      if (field.type === "email" || field.type === "text") return textFieldHtml(field);
      if (field.type === "contact-person") return contactPersonHtml(field);
      if (field.type === "activity-list") return activityCardHtml(field);
      if (field.type === "textarea") return textareaFieldHtml(field);
      if (field.type === "number" || field.type === "money") return numberFieldHtml(field);
      if (field.type === "date") return dateFieldHtml(field);
      if (field.type === "select") return selectFieldHtml(field);
      if (field.type === "radio") return radioFieldHtml(field);
      if (field.type === "checkbox") return checkboxFieldHtml(field);
      if (field.type === "checklist") return checklistFieldHtml(field);
      if (field.type === "info") return infoFieldHtml(field);
      if (field.type === "callout") return calloutFieldHtml(field);
      if (field.type === "separator") return separatorFieldHtml(field);
      if (field.type === "segment") return segmentFieldHtml(field);
      if (field.type === "multiselect") return multiselectFieldHtml(field);
      if (field.type === "period") return periodFieldHtml(field);
      if (field.type === "idnp") return idnpFieldHtml(field);
      if (field.type === "idno") return idnoFieldHtml(field);
      if (field.type === "file") return fileFieldHtml(field);
      if (field.type === "mdocs") return mdocsFieldHtml(field);
      if (field.type === "hidden") return hiddenFieldHtml(field);
      if (field.type === "consent") return consentFieldHtml(field);
      /* batch 4 (1:N): editable grid · repeatable block (js/fo-grid.js) · searchable list */
      if (field.type === "grid") return window.GEAPFoRepeat?.gridHtml(field) || "";
      if (field.type === "repeat") return window.GEAPFoRepeat?.blockHtml(field) || "";
      if (field.type === "combobox") return comboboxFieldHtml(field);
      return "";
    }

    function renderFrontOfficeStep2FromSchema(schema) {
      const step = schema?.steps?.find((item) => Number(item.index) === 2);
      const panel = document.querySelector("[data-fo-step-panel='2']");
      if (!panel || !Array.isArray(step?.sections)) return;
      panel.innerHTML = `
        <header class="e-permits-fo-form__header"><h1 id="fo-request-step-2-title" tabindex="-1">${escapeFrontOfficeHtml(step.title || step.label || "Detalii serviciu")}</h1></header>
        ${step.sections.map((section) => {
          const sectionClasses = [
            "e-permits-fo-form__section",
            !section.title ? "e-permits-fo-form__section--plain" : ""
          ].filter(Boolean).join(" ");
          return `
          <section class="${sectionClasses}" ${section.title ? `aria-labelledby="fo-${escapeFrontOfficeHtml(section.id)}-title"` : `aria-label="${escapeFrontOfficeHtml(section.id)}"`}>
            ${section.title ? `
              <div class="e-permits-fo-section-header${section.noBorder ? " e-permits-fo-section-header--no-border" : ""}">
                <h2 id="fo-${escapeFrontOfficeHtml(section.id)}-title">${escapeFrontOfficeHtml(section.title)}</h2>
                ${section.secDesc ? `<p class="e-permits-fo-section-header__desc">${escapeFrontOfficeHtml(section.secDesc)}</p>` : ""}
              </div>
            ` : ""}
            <div class="e-permits-fo-form__section-body${section.layout === "single" ? " e-permits-fo-form__section-body--single" : ""}">
              ${(section.fields || []).map(stepFieldHtml).join("")}
            </div>
          </section>
        `;}).join("")}
        <footer class="e-permits-fo-form__footer e-permits-fo-form__footer--actions-only">
          <div class="e-permits-fo-form__actions e-permits-fo-form__actions--with-draft">
            <button class="e-permits-fo-draft-button" type="button">
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" aria-hidden="true">
                      <use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use>
                    </svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary">
              <button class="e-permits-fo-next" type="button" data-fo-next="step-2"><span>Înainte</span><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>
            </div>
          </div>
        </footer>
      `;
      initFrontOfficeDynamicControls(panel);
      updateFrontOfficeRequestHeaders();
    }

    function renderFrontOfficeStep3FromSchema(schema) {
      const step = schema?.steps?.find((item) => Number(item.index) === 3);
      const panel = document.querySelector("[data-fo-step-panel='3']");
      if (!panel || !Array.isArray(step?.documents)) return;

      function fileUploadHtml(doc) {
        const inputId = `fo-doc-${escapeFrontOfficeHtml(doc.id)}`;
        return `
          <label class="e-permits-fo-file-drop" for="${inputId}">
            <input id="${inputId}" type="file" accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx,.zip,.docx" data-fo-file-input>
            <span class="e-permits-fo-file-drop__icon" aria-hidden="true">
              <svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-cloud-upload"></use></svg>
            </span>
            <span class="e-permits-fo-file-drop__copy">
              <span><span>Drag and drop or</span> <strong>choose files</strong></span>
              <small>Un singur fișier ${escapeFrontOfficeHtml(doc.accept || "JPG, PNG, PDF, XLS, ZIP, DOCX")} <span aria-hidden="true">•</span> max ${escapeFrontOfficeHtml(doc.maxSize || "60 MB")}</small>
            </span>
            <button class="e-permits-fo-upload-button" type="button" aria-label="Încarcă fișier" data-fo-upload-trigger>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg>
              Încarcă fișier
            </button>
          </label>
        `;
      }

      function mdocsSearchHtml(doc) {
        const menuId = `fo-mdocs-doc-${escapeFrontOfficeHtml(doc.id)}-menu`;
        const suggestions = (doc.mdocsSuggestions || []).map((sug) => `
          <li role="presentation">
            <button class="e-permits-fo-mdocs__option" type="button" role="option" aria-selected="false"
              data-title="${escapeFrontOfficeHtml(sug.title)}" data-meta="${escapeFrontOfficeHtml(sug.meta || "")}">
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-document"></use></svg>
              <span class="e-permits-fo-mdocs__option-content">
                <span class="e-permits-fo-mdocs__option-title">${escapeFrontOfficeHtml(sug.title)}${sug.recommended ? ' <span class="e-permits-fo-mdocs__tag">Recomandat</span>' : ""}</span>
                <span class="e-permits-fo-mdocs__option-meta">${escapeFrontOfficeHtml(sug.meta || "")}</span>
              </span>
            </button>
          </li>
        `).join("");
        return `
          <div class="e-permits-fo-mdocs" data-fo-mdocs>
            <button class="e-permits-fo-mdocs__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}" data-fo-mdocs-button>
              <span class="e-permits-fo-mdocs__value e-permits-fo-mdocs__value--placeholder" data-fo-mdocs-value>${escapeFrontOfficeHtml(doc.placeholder || "Caută și încarcă din MDocs")}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            </button>
            <div class="e-permits-fo-mdocs__menu" id="${menuId}" hidden data-fo-mdocs-menu>
              <label class="e-permits-fo-mdocs__search">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
                <input type="search" placeholder="Caută document în MDocs" autocomplete="off" data-fo-mdocs-search>
                <button class="e-permits-fo-mdocs__search-clear" type="button" aria-label="Șterge căutarea" hidden data-fo-mdocs-clear>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
                </button>
              </label>
              <ul class="e-permits-fo-mdocs__list" role="listbox" aria-label="Documente MDocs">${suggestions}</ul>
              <div hidden data-fo-mdocs-empty>${window.GEAPEmptyState.noResults("Nu am găsit documente în MDocs", { text: "Verifică denumirea sau numărul documentului.", bare: true })}</div>
            </div>
            <div class="e-permits-fo-mdocs__attachment" hidden data-fo-mdocs-attachment>
              <button class="e-permits-fo-document-remove e-permits-fo-mdocs__attachment-remove" type="button" aria-label="Elimină documentul din MDocs" data-fo-mdocs-remove>
                <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large-16"></use></svg>
              </button>
            </div>
          </div>
        `;
      }

      function documentItemHtml(doc) {
        const requiredHtml = doc.required
          ? `<span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>`
          : `<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>`;
        const fieldId = (doc.id || "").replace(/[^a-z0-9-]/gi, "-");
        return `
          ${doc.separator ? `<hr class="e-permits-fo-documents__separator">` : ""}
          <div class="e-permits-fo-doc-field" data-fo-doc-field="${escapeFrontOfficeHtml(fieldId)}">
            <div class="e-permits-fo-doc-field__row">
              <div class="e-permits-fo-doc-field__info">
                <span class="e-permits-fo-doc-field__label">
                  ${escapeFrontOfficeHtml(doc.label)} ${requiredHtml}
                </span>
                ${doc.description ? `<p class="e-permits-fo-doc-field__desc">${escapeFrontOfficeHtml(doc.description)}</p>` : ""}
              </div>
              <button class="e-permits-fo-doc-field__add" type="button" data-fo-open-doc-modal data-fo-doc-label="${escapeFrontOfficeHtml(doc.label)}">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                Adaugă fișier
              </button>
            </div>
            <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
          </div>
        `;
      }

      panel.innerHTML = `
        <header class="e-permits-fo-form__header">
          <h1 id="fo-request-step-3-title" tabindex="-1">${escapeFrontOfficeHtml(step.title || step.label || "Documente însoțitoare")}</h1>
        </header>
        <section class="e-permits-fo-documents" aria-label="Documente însoțitoare" data-fo-step3-documents>
          ${step.documents.map(documentItemHtml).join("")}
          <hr class="e-permits-fo-documents__separator">
          <div class="e-permits-fo-other-docs">
            <div class="e-permits-fo-other-docs__header">
              <div class="e-permits-fo-other-docs__heading-row">
                <h2 class="e-permits-fo-other-docs__heading">Alte documente</h2>
                <span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>
              </div>
              <p class="e-permits-fo-other-docs__desc">Opțional — adaugă orice document suplimentar relevant pentru cerere.</p>
            </div>
            <div class="e-permits-fo-other-docs__body">
              <div data-fo-other-doc-list></div>
              <button class="e-permits-fo-add-doc-button" type="button" data-fo-add-other-doc>
                <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-small"></use></svg>
                Adaugă document
              </button>
            </div>
          </div>
        </section>
        <footer class="e-permits-fo-form__footer e-permits-fo-form__footer--actions-only">
          <div class="e-permits-fo-form__actions e-permits-fo-form__actions--with-draft">
            <button class="e-permits-fo-draft-button" type="button">
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" aria-hidden="true">
                      <use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use>
                    </svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary">
              <button class="e-permits-fo-back-button" type="button" aria-label="Înapoi la Detalii serviciu" data-fo-prev="step-3">
                <svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
              </button>
              <button class="e-permits-fo-next e-permits-fo-next--step-3" type="button" data-fo-next="step-3">
                <span>Înainte</span>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
              </button>
            </div>
          </div>
        </footer>
      `;

      // file-drop and mdocs dropdowns removed — handled by modal
      updateFrontOfficeRequestHeaders();
    }

    /* The Livrare step is one progressive-disclosure chain:
         electronic option → "și pe hârtie" checkbox → pickup | curier
         → courier address (summary ⇄ cascade editor) + courier service.
       Every level is the same `system-files-item-selectable` row from the
       design system: 71px tall, 12/16 padding, 24px glyph, 12px to the copy,
       16px to the indicator. The electronic option carries the filled
       checkmark; the paper methods and couriers carry a radio, which is why
       their selected state is a 2px brand ring on white rather than a tint. */

    function deliveryRowMediaHtml(option) {
      if (option.logo) {
        return `<img class="e-permits-fo-delivery-option__logo" src="${escapeFrontOfficeHtml(option.logo)}" alt="">`;
      }
      if (option.icon) {
        return `<span class="e-permits-fo-delivery-option__glyph" aria-hidden="true"><svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(option.icon)}"></use></svg></span>`;
      }
      if (option.mark) {
        /* stand-in until the courier brand marks are exported from Figma */
        return `<span class="e-permits-fo-delivery-option__mark e-permits-fo-delivery-option__mark--${escapeFrontOfficeHtml(option.tone || "brand")}" aria-hidden="true">${escapeFrontOfficeHtml(option.mark)}</span>`;
      }
      return "";
    }

    function deliveryOptionRow(option, { name, index, selected, indicator = "check" }) {
      const badges = Array.isArray(option.badges) ? option.badges : [];
      const price = option.price
        ? `<span class="e-permits-fo-delivery-option__price">${escapeFrontOfficeHtml(option.price)}</span>`
        : "";
      const indicatorHtml =
        indicator === "radio"
          ? `<span class="e-permits-fo-radio__control e-permits-fo-delivery-option__radio" aria-hidden="true"></span>`
          : `<svg class="icon e-permits-fo-delivery-option__check" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>`;
      return `
        <label class="e-permits-fo-delivery-option e-permits-fo-delivery-option--${escapeFrontOfficeHtml(indicator)}${selected ? " is-selected" : ""}">
          <input class="e-permits-fo-delivery-option__input" type="radio" name="${escapeFrontOfficeHtml(name)}" value="${escapeFrontOfficeHtml(option.id || `${name}-${index + 1}`)}" ${selected ? "checked" : ""}>
          <span class="e-permits-fo-delivery-option__content">
            ${deliveryRowMediaHtml(option)}
            <span class="e-permits-fo-delivery-option__copy">
              <span class="e-permits-fo-delivery-option__title-row">
                <span class="e-permits-fo-delivery-option__title">${escapeFrontOfficeHtml(option.title || "")}</span>
                ${badges.map((badge) => `<span class="e-permits-fo-delivery-badge e-permits-fo-delivery-badge--${escapeFrontOfficeHtml(badge.tone || "outline")}">${escapeFrontOfficeHtml(badge.label || "")}</span>`).join("")}
              </span>
              <span class="e-permits-fo-delivery-option__description">${escapeFrontOfficeHtml(option.description || "")}</span>
            </span>
            ${price}
          </span>
          ${indicatorHtml}
        </label>
      `;
    }

    function deliverySectionLabelHtml(section) {
      return `<h3 class="e-permits-fo-delivery-group__label">${escapeFrontOfficeHtml(section.title || "")}${section.required ? requiredMarkerHtml() : ""}</h3>`;
    }

    /* radio group → .is-selected on the row that owns the checked input */
    function bindDeliveryRadioGroup(root, name, onChange) {
      root.querySelectorAll(`input[name='${name}']`).forEach((input) => {
        input.addEventListener("change", () => {
          root.querySelectorAll(`input[name='${name}']`).forEach((other) => {
            other.closest(".e-permits-fo-delivery-option")?.classList.toggle("is-selected", other.checked);
          });
          if (onChange) onChange(root.querySelector(`input[name='${name}']:checked`)?.value || "");
        });
      });
    }

    /* grid-template-rows 0fr → 1fr reveal; overflow is released once the
       transition is done so cascade focus rings are not clipped */
    function setDeliveryDisclosure(element, isOpen) {
      if (!element) return;
      window.clearTimeout(element._foDisclosureTimer);
      element.classList.toggle("is-open", isOpen);
      element.inert = !isOpen;
      if (!isOpen) {
        element.classList.remove("is-settled");
        return;
      }
      element._foDisclosureTimer = window.setTimeout(() => {
        element.classList.add("is-settled");
      }, 280);
    }

    /* the flow never stores addresses — the editor just reformats what the
       cascade selects currently hold, same order as the seeded summary */
    function readCascadeAddressSummary(root, fallback) {
      if (!root) return fallback;
      const selectValue = (selector) => {
        const value = root.querySelector(selector);
        if (!value || value.classList.contains("e-permits-fo-select__value--placeholder")) return "";
        return value.textContent.trim();
      };
      const inputValue = (part) => root.querySelector(`[data-fo-address-part='${part}']`)?.value?.trim() || "";
      const street = selectValue("[data-fo-cascade-strada] [data-fo-select-value]");
      const city = selectValue("[data-fo-cascade-localitate] [data-fo-select-value]");
      const raion = selectValue("[data-fo-cascade-raion] [data-fo-select-value]");
      const country = root.querySelector("[data-fo-address-part='country']")?.textContent?.trim() || "";
      const house = inputValue("house");
      const apartment = inputValue("apartment");

      const line = [street, house].filter(Boolean).join(" ");
      const parts = [
        apartment ? `${line}, ap. ${apartment}` : line,
        city || raion,
        country,
      ].filter(Boolean);
      return parts.length > 1 ? parts.join(", ") : fallback;
    }

    function renderFrontOfficeStep5FromSchema(schema) {
      const panel = document.querySelector("[data-fo-step-panel='5']");
      const step = schema?.steps?.find((item) => item.id === "delivery" || Number(item.index) === 5);
      if (!panel || !step) return;

      const title = panel.querySelector("[data-fo-delivery-title]");
      const heading = panel.querySelector("[data-fo-delivery-heading]");
      const optionsRoot = panel.querySelector("[data-fo-delivery-options]");
      const paperRoot = panel.querySelector("[data-fo-delivery-paper]");
      if (title) title.textContent = step.title || step.label || "Livrare";
      if (heading) heading.textContent = step.sectionTitle || "Cum primești rezultatul?";

      const options = Array.isArray(step.options) ? step.options : [];
      if (optionsRoot) {
        const hasSelected = options.some((item) => item.selected);
        optionsRoot.innerHTML = options
          .map((option, index) =>
            deliveryOptionRow(option, {
              name: "fo-delivery-method",
              index,
              selected: Boolean(option.selected || (!hasSelected && index === 0)),
            })
          )
          .join("");
        bindDeliveryRadioGroup(optionsRoot, "fo-delivery-method");
      }

      const paperCopy = step.paperCopy || {};
      if (!paperRoot) return;

      const methods = Array.isArray(paperCopy.methods) ? paperCopy.methods : [];
      const courier = methods.find((item) => item.address || item.couriers);
      const address = courier?.address || null;
      const couriers = courier?.couriers || null;
      const courierItems = Array.isArray(couriers?.items) ? couriers.items : [];
      /* the request-data step already carries the district tree — reuse it so
         the delivery editor offers the same localities, no duplicated data */
      const districts =
        address?.form?.districts ||
        schema?.steps
          ?.flatMap((item) => item.sections || [])
          .flatMap((section) => section.fields || [])
          .find((field) => field?.type === "cascade-address" && Array.isArray(field.districts))?.districts ||
        [];

      const addressSectionHtml = address
        ? `
          <section class="e-permits-fo-delivery-group__section" data-fo-delivery-address>
            ${deliverySectionLabelHtml(address)}
            <div class="e-permits-fo-delivery-address" data-fo-delivery-address-card>
              <span class="e-permits-fo-delivery-address__glyph" aria-hidden="true">
                <svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(address.icon || "icon-map-pin")}"></use></svg>
              </span>
              <span class="e-permits-fo-delivery-address__copy">
                <span class="e-permits-fo-delivery-address__label">${escapeFrontOfficeHtml(address.label || "")}</span>
                <span class="e-permits-fo-delivery-address__value" data-fo-delivery-address-value>${escapeFrontOfficeHtml(address.value || "")}</span>
              </span>
              <button class="e-permits-fo-summary-section__edit" type="button" aria-label="${escapeFrontOfficeHtml(address.editLabel || "Editează adresa livrării")}" data-fo-delivery-address-edit>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
              </button>
            </div>
            <div class="e-permits-fo-delivery-disclosure" data-fo-delivery-address-editor>
              <div class="e-permits-fo-delivery-disclosure__inner">
                <div class="e-permits-fo-delivery-address__editor">
                  <div class="e-permits-fo-form__grid">
                    ${cascadeAddressHtml({ ...(address.form || {}), districts })}
                  </div>
                  <div class="e-permits-fo-delivery-address__actions">
                    <button class="btn btn-secondary btn-rounded btn-sm" type="button" data-fo-delivery-address-cancel>${escapeFrontOfficeHtml(address.cancelLabel || "Anulează")}</button>
                    <button class="btn btn-primary btn-rounded btn-sm" type="button" data-fo-delivery-address-save>${escapeFrontOfficeHtml(address.saveLabel || "Salvează")}</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `
        : "";

      const couriersSectionHtml = courierItems.length
        ? `
          <section class="e-permits-fo-delivery-group__section" data-fo-delivery-couriers>
            ${deliverySectionLabelHtml(couriers)}
            ${courierItems
              .map((item, index) =>
                deliveryOptionRow(item, {
                  name: "fo-delivery-courier",
                  index,
                  indicator: "radio",
                  selected: Boolean(item.selected),
                })
              )
              .join("")}
          </section>
        `
        : "";

      const methodsHtml = methods.length
        ? `
          <div class="e-permits-fo-delivery-disclosure" data-fo-delivery-methods>
            <div class="e-permits-fo-delivery-disclosure__inner">
              <div class="e-permits-fo-delivery-methods">
                ${methods
                  .map((method, index) => {
                    const row = deliveryOptionRow(method, {
                      name: "fo-delivery-paper-method",
                      index,
                      indicator: "radio",
                      selected: Boolean(method.selected),
                    });
                    if (method !== courier) return row;
                    return `
                      <div class="e-permits-fo-delivery-group" data-fo-delivery-group>
                        ${row}
                        <div class="e-permits-fo-delivery-disclosure" data-fo-delivery-courier>
                          <div class="e-permits-fo-delivery-disclosure__inner">
                            ${addressSectionHtml}
                            ${couriersSectionHtml}
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        `
        : "";

      paperRoot.innerHTML = `
        <label class="checkbox checkbox--medium e-permits-fo-delivery-paper">
          <input class="checkbox-input" type="checkbox" ${paperCopy.selected ? "checked" : ""} data-fo-delivery-paper-toggle>
          <span class="checkbox-custom" aria-hidden="true"></span>
          <span class="e-permits-fo-delivery-paper__copy">
            <span class="e-permits-fo-delivery-paper__title">${escapeFrontOfficeHtml(paperCopy.label || "Am nevoie și de o copie pe suport de hârtie")}</span>
            <span class="e-permits-fo-delivery-paper__description">${escapeFrontOfficeHtml(paperCopy.description || "")}</span>
          </span>
        </label>
        ${methodsHtml}
      `;

      const paperToggle = paperRoot.querySelector("[data-fo-delivery-paper-toggle]");
      const methodsBlock = paperRoot.querySelector("[data-fo-delivery-methods]");
      const courierBlock = paperRoot.querySelector("[data-fo-delivery-courier]");
      const courierGroup = paperRoot.querySelector("[data-fo-delivery-group]");
      const courierId = courier?.id || "courier";

      const syncCourierBlock = () => {
        const checked = paperRoot.querySelector("input[name='fo-delivery-paper-method']:checked");
        const isCourier = Boolean(paperToggle?.checked) && checked?.value === courierId;
        setDeliveryDisclosure(courierBlock, isCourier);
        courierGroup?.classList.toggle("is-open", isCourier);
      };

      setDeliveryDisclosure(methodsBlock, Boolean(paperToggle?.checked));
      syncCourierBlock();

      paperToggle?.addEventListener("change", () => {
        setDeliveryDisclosure(methodsBlock, paperToggle.checked);
        syncCourierBlock();
      });

      if (methodsBlock) bindDeliveryRadioGroup(methodsBlock, "fo-delivery-paper-method", syncCourierBlock);
      if (courierBlock) bindDeliveryRadioGroup(courierBlock, "fo-delivery-courier");

      const addressSection = paperRoot.querySelector("[data-fo-delivery-address]");
      if (addressSection) {
        const card = addressSection.querySelector("[data-fo-delivery-address-card]");
        const editor = addressSection.querySelector("[data-fo-delivery-address-editor]");
        const valueEl = addressSection.querySelector("[data-fo-delivery-address-value]");
        const cascadeRoot = addressSection.querySelector("[data-fo-cascade-address]");

        const setEditing = (isEditing) => {
          addressSection.classList.toggle("is-editing", isEditing);
          card?.toggleAttribute("hidden", isEditing);
          setDeliveryDisclosure(editor, isEditing);
        };

        setEditing(false);
        addressSection.querySelector("[data-fo-delivery-address-edit]")?.addEventListener("click", () => {
          setEditing(true);
        });
        addressSection.querySelector("[data-fo-delivery-address-cancel]")?.addEventListener("click", () => {
          setEditing(false);
        });
        addressSection.querySelector("[data-fo-delivery-address-save]")?.addEventListener("click", () => {
          if (valueEl) valueEl.textContent = readCascadeAddressSummary(cascadeRoot, valueEl.textContent);
          setEditing(false);
        });
      }

      initFrontOfficeDynamicControls(paperRoot);
    }

    /* Plată: a read-only summary card, the "notă de plată" receipt (header +
       fee table + totals, closed off with the torn edge) and the two actions.
       The summary rows reuse .e-permits-fo-summary-row, the dossier number
       reuses the copy-value button, the status chip is the library status-tag
       and the pay button is the standard mpay badge button. */

    function paymentSummaryValueHtml(row) {
      const value = escapeFrontOfficeHtml(row.value || "");
      if (!row.copy) return `<span>${value}</span>`;
      return `
        <button class="e-permits-fo-copy-value" type="button" data-fo-copy-value="${value}" aria-label="Copiază numărul dosarului ${value}">
          <span>${value}</span>
          <svg class="icon medium" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-copy"></use></svg>
          <span class="e-permits-fo-copy-value__tooltip" aria-hidden="true">
            <span class="e-permits-fo-copy-value__tooltip-default">Copiază</span>
            <span class="e-permits-fo-copy-value__tooltip-copied">
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg><span>Copiat</span>
            </span>
          </span>
        </button>
      `;
    }

    function renderFrontOfficeStep6FromSchema(schema) {
      const panel = document.querySelector("[data-fo-step-panel='6']");
      const step = schema?.steps?.find((item) => item.id === "payment" || Number(item.index) === 6);
      if (!panel || !step) return;

      const title = panel.querySelector("[data-fo-payment-title]");
      const body = panel.querySelector("[data-fo-payment-body]");
      if (title) title.textContent = step.title || step.label || "Plată";
      if (!body) return;

      const summaryRows = Array.isArray(step.summary?.rows) ? step.summary.rows : [];
      const invoice = step.invoice || {};
      const columns = Array.isArray(invoice.columns) ? invoice.columns : [];
      const items = Array.isArray(invoice.items) ? invoice.items : [];
      const totals = Array.isArray(invoice.totals) ? invoice.totals : [];
      const actions = step.actions || {};

      const summaryHtml = summaryRows.length
        ? `
          <section class="e-permits-fo-payment-summary" aria-label="Detaliile cererii">
            ${summaryRows
              .map(
                (row) => `
                  <div class="e-permits-fo-summary-row">
                    <span class="e-permits-fo-summary-row__label">${escapeFrontOfficeHtml(row.label || "")}</span>
                    <div class="e-permits-fo-summary-row__value">${paymentSummaryValueHtml(row)}</div>
                  </div>
                `
              )
              .join("")}
          </section>
        `
        : "";

      /* the commission line has no quantity or unit price — it spans them */
      const itemsHtml = items
        .map((item) => {
          if (item.span) {
            return `
              <tr class="e-permits-fo-payment-table__row e-permits-fo-payment-table__row--span">
                <td colspan="${Math.max(1, columns.length - 1)}">${escapeFrontOfficeHtml(item.description || "")}</td>
                <td class="e-permits-fo-payment-table__amount">${escapeFrontOfficeHtml(item.total || "")}</td>
              </tr>
            `;
          }
          return `
            <tr class="e-permits-fo-payment-table__row">
              <td>${escapeFrontOfficeHtml(item.description || "")}</td>
              <td>${escapeFrontOfficeHtml(item.quantity || "")}</td>
              <td>${escapeFrontOfficeHtml(item.unitPrice || "")}</td>
              <td class="e-permits-fo-payment-table__amount">${escapeFrontOfficeHtml(item.total || "")}</td>
            </tr>
          `;
        })
        .join("");

      const invoiceHtml = `
        <section class="e-permits-fo-payment-invoice" aria-label="${escapeFrontOfficeHtml(invoice.label || "Notă de plată")}">
          <div class="e-permits-fo-payment-invoice__card">
            <header class="e-permits-fo-payment-invoice__header">
              <div class="e-permits-fo-payment-invoice__caption">
                <span class="e-permits-fo-payment-invoice__label">${escapeFrontOfficeHtml(invoice.label || "Notă de plată")}</span>
                ${
                  invoice.status
                    ? `<span class="status-tag status-tag--${escapeFrontOfficeHtml(invoice.status.tone || "accent")} is-strong e-permits-fo-payment-invoice__status">${escapeFrontOfficeHtml(invoice.status.label || "")}</span>`
                    : ""
                }
              </div>
              <p class="e-permits-fo-payment-invoice__amount">${escapeFrontOfficeHtml(invoice.amount || "")}</p>
            </header>

            <div class="e-permits-fo-payment-table">
              <table>
                <thead>
                  <tr>
                    ${columns
                      .map(
                        (column, index) =>
                          `<th${index === columns.length - 1 ? ' class="e-permits-fo-payment-table__amount"' : ""} scope="col">${escapeFrontOfficeHtml(column)}</th>`
                      )
                      .join("")}
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>

            ${
              totals.length
                ? `
              <div class="e-permits-fo-payment-totals">
                <table>
                  <tbody>
                    ${totals
                      .map(
                        (total) => `
                          <tr${total.strong ? ' class="is-strong"' : ""}>
                            <th scope="row">${escapeFrontOfficeHtml(total.label || "")}</th>
                            <td class="e-permits-fo-payment-table__amount">${escapeFrontOfficeHtml(total.value || "")}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
                : ""
            }
          </div>
          <div class="e-permits-fo-payment-invoice__edge" aria-hidden="true"></div>
        </section>
      `;

      const actionsHtml = `
        <div class="e-permits-fo-payment-actions">
          ${
            actions.download
              ? `<button class="btn btn-outline-primary e-permits-fo-payment-actions__download" type="button" data-fo-payment-download>
                   <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#${escapeFrontOfficeHtml(actions.download.icon || "icon-page-download")}"></use></svg>
                   <span>${escapeFrontOfficeHtml(actions.download.label || "Descarcă nota de plată")}</span>
                 </button>`
              : ""
          }
          ${
            actions.pay
              ? `<button class="btn btn-badge btn-badge--primary e-permits-fo-payment-actions__pay" type="button" data-fo-payment-pay>
                   <span class="btn-badge__logo" aria-hidden="true"><img src="${escapeFrontOfficeHtml(actions.pay.logo || "assets/logos/m-platforms/m-pay.svg")}" alt=""></span>
                   <span class="btn-badge__label">${escapeFrontOfficeHtml(actions.pay.label || "")}</span>
                 </button>`
              : ""
          }
        </div>
      `;

      body.innerHTML = summaryHtml + invoiceHtml + actionsHtml;
      /* US-18 AC-03: kept across re-renders once Finalizare was refused for an unpaid fee */
      if (frontOfficePaymentNoticeShown) { frontOfficePaymentNoticeShown = false; showFrontOfficePaymentNotice(); frontOfficePaymentNoticeShown = true; }
    }

    /* Finalizare (Figma 3607:56145): the confirmation shown once MPay returns.
       Everything is read from steps[7] in the schema. Reused as-is: the
       form header h1, the payment step's summary card (.e-permits-fo-payment-
       summary + .e-permits-fo-summary-row + the copy-value button), the
       library .status-tag for "Acum"/"Opțional", the outlined and primary
       .btn, and the form footer. New, because nothing local matches: the
       horizontal case-status tracker, the proof-of-filing document banner and
       the vertical "Statutul dosarului" timeline (.e-permits-fo-finish-*). */
    function finishMarkerHtml(state, size) {
      if (state === "done") {
        return `<svg class="icon e-permits-fo-finish-marker e-permits-fo-finish-marker--done" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>`;
      }
      if (state === "current") {
        return `<svg class="icon e-permits-fo-finish-marker e-permits-fo-finish-marker--current" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-time-filled"></use></svg>`;
      }
      return `<span class="e-permits-fo-finish-marker e-permits-fo-finish-marker--todo" style="--fo-finish-marker-size:${size}px" aria-hidden="true"></span>`;
    }

    const FINISH_STATE_LABEL = { done: "finalizat", current: "în curs", todo: "urmează" };

    /* US-18: the certificate retry state survives a re-render */
    let frontOfficeCertRetried = false;
    let frontOfficeLastFinishSchema = null;
    function renderFrontOfficeStep7FromSchema(schema) {
      frontOfficeLastFinishSchema = schema;
      const panel = document.querySelector("[data-fo-step-panel='7']");
      let step = schema?.steps?.find((item) => item.id === "finish" || Number(item.index) === 7);
      const body = panel?.querySelector("[data-fo-finish-body]");
      if (!panel || !step || !body) return;
      const esc = escapeFrontOfficeHtml;
      const filedNr = (step.summary?.rows || []).find((row) => row.label === "Numărul dosarului")?.value || "";
      const solicitariHref = frontOfficeSolicitariUrl({ depus: filedNr });
      if (step.lead) step = { ...step, lead: { ...step.lead, href: solicitariHref } };
      if (step.action) step = { ...step, action: { ...step.action, label: "Mergi la Solicitările mele", href: solicitariHref } };

      /* guest (FOD #54850): the case number and the certificate go to the e-mail typed in */
      const lead = step.guest
        ? `<p class="e-permits-fo-finish__lead">Numărul dosarului și confirmarea au fost trimise la <strong>${esc(step.guest.email || "")}</strong>.</p>`
        : step.lead
        ? `<p class="e-permits-fo-finish__lead">${esc(step.lead.text || "")} <a href="${esc(step.lead.href || "#")}">${esc(step.lead.link || "")}</a>.</p>`
        : "";

      const tracker = Array.isArray(step.tracker) && step.tracker.length
        ? `
          <ol class="e-permits-fo-finish-tracker" aria-label="Progresul dosarului">
            ${step.tracker.map((item) => `
              <li class="e-permits-fo-finish-tracker__item is-${esc(item.state || "todo")}">
                <span class="e-permits-fo-finish-tracker__marker">${finishMarkerHtml(item.state, 24)}</span>
                <span class="e-permits-fo-finish-tracker__label">${esc(item.label || "")}<span class="u-visually-hidden"> — ${FINISH_STATE_LABEL[item.state] || FINISH_STATE_LABEL.todo}</span></span>
              </li>
            `).join("")}
          </ol>
        `
        : "";

      /* US-18 AC-06/07: the certificate is shown only when the service issues one (?cert=none hides it);
         a failed generation shows the error + „Reîncercați” (?cert=error) */
      const certMode = new URLSearchParams(location.search).get("cert") || "";
      const doc = step.document && certMode === "none" ? "" : step.document && certMode === "error" && !frontOfficeCertRetried
        ? `
          <div class="e-permits-fo-finish-doc is-error" role="alert">
            <span class="e-permits-fo-finish-doc__icon" aria-hidden="true"><img src="assets/images/document-illustration.svg" alt=""></span>
            <div class="e-permits-fo-finish-doc__copy">
              <p class="e-permits-fo-finish-doc__title">${esc(step.document.title || "")}</p>
              <p class="e-permits-fo-finish-doc__text e-permits-fo-finish-doc__error">Certificatul Constatator nu a putut fi generat.</p>
            </div>
            <button class="btn btn-neutral btn-sm e-permits-fo-finish-doc__action" type="button" data-fo-finish-document-retry>
              <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
              <span>Reîncercați</span>
            </button>
          </div>
        `
        : step.document
        ? `
          <div class="e-permits-fo-finish-doc">
            <span class="e-permits-fo-finish-doc__icon" aria-hidden="true"><img src="assets/images/document-illustration.svg" alt=""></span>
            <div class="e-permits-fo-finish-doc__copy">
              <p class="e-permits-fo-finish-doc__title">${esc(step.document.title || "")}</p>
              <p class="e-permits-fo-finish-doc__text">${esc(step.document.text || "")}${step.document.link ? ` <a href="${esc(step.document.href || "#")}">${esc(step.document.link)}</a>` : ""}.</p>
            </div>
            <button class="btn btn-outline-primary btn-sm e-permits-fo-finish-doc__action" type="button" data-fo-finish-document>
              <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-eye-open"></use></svg>
              <span>${esc(step.document.action || "Vezi documentul")}</span>
            </button>
          </div>
        `
        : "";

      const rows = Array.isArray(step.summary?.rows) ? step.summary.rows : [];
      const summary = rows.length
        ? `
          <section class="e-permits-fo-payment-summary" aria-label="Detaliile cererii">
            ${rows.map((row) => `
              <div class="e-permits-fo-summary-row">
                <span class="e-permits-fo-summary-row__label">${esc(row.label || "")}</span>
                <div class="e-permits-fo-summary-row__value">${paymentSummaryValueHtml(row)}</div>
              </div>
            `).join("")}
          </section>
        `
        : "";

      const timelineItems = Array.isArray(step.timeline?.items) ? step.timeline.items : [];
      const tagClass = (item) => (item.state === "current" ? "status-tag--brand is-strong" : "status-tag--neutral is-subtle");
      const timeline = timelineItems.length
        ? `
          <section class="e-permits-fo-finish__section" aria-labelledby="fo-finish-timeline-title">
            <h2 class="e-permits-fo-finish__section-title" id="fo-finish-timeline-title">${esc(step.timeline.title || "Statutul dosarului")}</h2>
            <ol class="e-permits-fo-finish-timeline">
              ${timelineItems.map((item) => `
                <li class="e-permits-fo-finish-timeline__item is-${esc(item.state || "todo")}">
                  <span class="e-permits-fo-finish-timeline__rail" aria-hidden="true">
                    <span class="e-permits-fo-finish-timeline__marker">${finishMarkerHtml(item.state, 16)}</span>
                    <span class="e-permits-fo-finish-timeline__line"></span>
                  </span>
                  <div class="e-permits-fo-finish-timeline__copy">
                    <p class="e-permits-fo-finish-timeline__title">
                      <span>${esc(item.title || "")}</span>
                      ${item.tag ? `<span class="status-tag status-tag--small ${tagClass(item)}">${esc(item.tag)}</span>` : ""}
                    </p>
                    <p class="e-permits-fo-finish-timeline__text">${esc(item.text || "")}</p>
                  </div>
                </li>
              `).join("")}
            </ol>
          </section>
        `
        : "";

      /* guest: no „Mergi la Solicitările mele” — an invitation to sign in (the guest upsell banner) */
      const guestInvite = step.guest
        ? `
          <div class="info-box info-box--subtle info-box--info banner--info e-permits-fo-guest__upsell" role="note">
            <span class="info-box__icon" aria-hidden="true">
              <svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-user-account-filled"></use></svg>
            </span>
            <div class="info-box__content">
              <p class="e-permits-fo-guest__upsell-title">Urmărește dosarul în EVO Cabinet</p>
              <p class="e-permits-fo-guest__upsell-desc">Autentifică-te cu MPass ca să vezi statutul dosarului și să primești actul și în contul tău.</p>
            </div>
            <button class="btn btn-badge btn-badge--primary btn-badge--mpass" type="button" data-fo-guest-authenticate>
              <span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-pass.svg" alt=""></span>
              <span class="btn-badge__label">Autentifică-te prin mpass</span>
            </button>
          </div>
        `
        : "";

      const action = step.action
        ? `
          <footer class="e-permits-fo-form__footer e-permits-fo-form__footer--actions-only e-permits-fo-finish__footer">
            <div class="e-permits-fo-form__actions">
              <a class="btn btn-primary e-permits-fo-finish__cta" href="${esc(step.action.href || "#")}">
                <span>${esc(step.action.label || "")}</span>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-external-link"></use></svg>
              </a>
            </div>
          </footer>
        `
        : "";

      body.innerHTML = `
        <header class="e-permits-fo-finish__hero">
          <svg class="icon e-permits-fo-finish__hero-icon" width="32" height="32" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>
          <div class="e-permits-fo-form__header e-permits-fo-finish__header">
            <h1 id="fo-request-step-7-title" tabindex="-1">${esc(step.title || step.label || "Finalizare")}</h1>
          </div>
          ${lead}
        </header>
        <div class="e-permits-fo-finish__content">
          ${tracker}
          ${doc}
          ${summary}
          ${timeline}
          ${guestInvite}
        </div>
        ${action}
      `;
    }

    function initFrontOfficeDynamicControls(root = document) {
      root.querySelectorAll("[data-fo-select]").forEach(bindFoSelect);
      root.querySelectorAll("[data-fo-phone-code]").forEach(bindPhoneCode);
      root.querySelectorAll("[data-fo-caem]").forEach(initCaemCombobox);
      root.querySelectorAll("[data-fo-subgen-select]").forEach(initSubgenMultiSelect);
      root.querySelectorAll("[data-fo-contact-person]").forEach(syncContactPersonGroup);
      root.querySelectorAll("[data-fo-cascade-address]").forEach(initCascadeAddress);
      root.querySelectorAll("[data-fo-address-search]").forEach(bindAddressSearch);
      root.querySelectorAll("[data-fo-subdivision]").forEach(initSubdivisionField);
      root.querySelectorAll("[data-fo-char-counter]").forEach(initCharCounter);
      window.GEAPFoRepeat?.bind(root);
      syncActivityCards();
    }

    function updateFrontOfficeMobileProgress(step) {
      if (!frontOfficeMobileProgress) return;
      const items = Array.from(frontOfficeStepperItems);
      const total = Math.max(items.length || frontOfficeStepPanels.length || 1, 1);
      const activeStep = Math.max(1, Math.min(Number(step) || 1, total));
      const activeItem = items.find((item) => Number(item.dataset.foStep) === activeStep) || items[activeStep - 1];
      const label = activeItem?.querySelector(".e-permits-fo-stepper__label")?.textContent.trim() || `Pasul ${activeStep}`;

      frontOfficeMobileProgress.style.setProperty("--fo-mobile-progress-current", String(activeStep));
      frontOfficeMobileProgress.style.setProperty("--fo-mobile-progress-total", String(total));
      if (frontOfficeMobileProgressLabel) frontOfficeMobileProgressLabel.textContent = label;
      if (frontOfficeMobileProgressCurrent) frontOfficeMobileProgressCurrent.textContent = String(activeStep);
      if (frontOfficeMobileProgressTotal) frontOfficeMobileProgressTotal.textContent = String(total);
    }

    function copyValueButtonHtml(value, { ariaLabel = "", className = "" } = {}) {
      const safeValue = escapeFrontOfficeHtml(value);
      const label = ariaLabel || `Copiază ${safeValue}`;
      return `
        <button
          class="e-permits-fo-copy-value${className ? ` ${escapeFrontOfficeHtml(className)}` : ""}"
          type="button"
          data-fo-copy-value="${safeValue}"
          aria-label="${escapeFrontOfficeHtml(label)}"
        >
          <span>${safeValue}</span>
          <span class="e-permits-fo-copy-value__tooltip" aria-hidden="true">
            <span class="e-permits-fo-copy-value__tooltip-default">Copiază</span>
            <span class="e-permits-fo-copy-value__tooltip-copied">
              <svg class="icon" width="18" height="18">
                <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
              </svg>
              <span>Copiat</span>
            </span>
          </span>
        </button>
      `;
    }

    function selectedRoleHtml(subject, { changeable = false } = {}) {
      const idLabel = subject?.idLabel || frontOfficeSubjectTypeMeta(subject?.type).idLabel || "";
      const idValue = subject?.idValue || "";
      const idCopy = idLabel && idValue ? `
        <span class="e-permits-fo-selected-role__id">
          <span class="e-permits-fo-selected-role__id-label">${escapeFrontOfficeHtml(idLabel)}</span>
          ${copyValueButtonHtml(idValue, {
            ariaLabel: `Copiază ${idLabel} ${idValue}`,
            className: "e-permits-fo-selected-role__copy-id",
          })}
        </span>
      ` : "";
      return `
        <span class="e-permits-fo-selected-role__inner">
          ${subjectInitialsAvatarHtml(subject, "e-permits-fo-selected-role__avatar")}
          <span class="e-permits-fo-selected-role__copy">
            <strong>${escapeFrontOfficeHtml(subject.name)}</strong>
            <span class="e-permits-fo-selected-role__meta">
              ${idCopy}
            </span>
          </span>
          ${changeable ? `
            <button class="e-permits-fo-selected-role__change" type="button" data-fo-back-choice>
              <svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M2.38052 12.2289C1.88586 11.7342 1.88585 10.9322 2.38052 10.4375L4.57578 8.24226C4.8101 8.00794 5.19 8.00794 5.42431 8.24226C5.65862 8.47657 5.65862 8.85647 5.42431 9.09078L3.78191 10.7332H13.3334C13.6648 10.7332 13.9334 11.0018 13.9334 11.3332C13.9334 11.6646 13.6648 11.9332 13.3334 11.9332H3.78191L5.42431 13.5756C5.65862 13.8099 5.65862 14.1898 5.42431 14.4241C5.19 14.6584 4.8101 14.6584 4.57578 14.4241L2.38052 12.2289L2.80478 11.8046L2.38052 12.2289ZM2.06671 4.66652C2.06671 4.33515 2.33534 4.06652 2.66671 4.06652H12.2182L10.5758 2.42412C10.3415 2.1898 10.3415 1.8099 10.5758 1.57559C10.8101 1.34128 11.19 1.34128 11.4243 1.57559L13.6196 3.77085C14.1142 4.26551 14.1142 5.06752 13.6196 5.56219L11.4243 7.75745C11.19 7.99177 10.8101 7.99177 10.5758 7.75745C10.3415 7.52314 10.3415 7.14324 10.5758 6.90892L12.2182 5.26652H2.66671C2.33534 5.26652 2.06671 4.99789 2.06671 4.66652Z" fill="currentColor"/>
              </svg>
              <span>Schimbă</span>
            </button>
          ` : ""}
        </span>
      `;
    }

    function authorizationCardHtml(subject) {
      const auth = subject?.authorization;
      if (!auth) return "";
      const detailItems = [
        auth.grantedBy ? { label: "Acordată de", value: auth.grantedBy } : null,
        auth.validUntil ? { label: "Valabilă până la", value: auth.validUntil } : null,
        auth.code ? { label: "Cod", value: auth.code, copy: true } : null,
      ].filter(Boolean);
      return `
        <div class="e-permits-fo-authorization-card">
          <span class="e-permits-fo-authorization-card__icon" aria-hidden="true">
            <svg class="icon" width="20" height="20">
              <use href="assets/icons/sprite.svg#icon-identity"></use>
            </svg>
          </span>
          <span class="e-permits-fo-authorization-card__copy">
            <span class="e-permits-fo-authorization-card__title">
              <strong>${escapeFrontOfficeHtml(auth.title || "Împuternicire MPower aplicată")}</strong>
              ${auth.status ? `<span>${escapeFrontOfficeHtml(auth.status)}</span>` : ""}
            </span>
            ${detailItems.length ? `
              <span class="e-permits-fo-authorization-card__meta">
                ${detailItems.map((item, index) => `
                  ${index ? `<span class="e-permits-fo-authorization-card__dot" aria-hidden="true"></span>` : ""}
                  <span class="e-permits-fo-authorization-card__meta-item">
                    <span>${escapeFrontOfficeHtml(item.label)}</span>
                    ${item.copy
                      ? copyValueButtonHtml(item.value, {
                        ariaLabel: `Copiază codul ${item.value}`,
                        className: "e-permits-fo-authorization-card__copy-code",
                      })
                      : `<strong>${escapeFrontOfficeHtml(item.value)}</strong>`}
                  </span>
                `).join("")}
              </span>
            ` : ""}
          </span>
        </div>
      `;
    }

    function roleGroupTitleHtml(label) {
      return `
        <div class="e-permits-fo-form__role-title">
          <h2>${escapeFrontOfficeHtml(label)}</h2>
          <button class="e-permits-fo-role-info" type="button" aria-label="Detalii despre ${escapeFrontOfficeHtml(label.toLowerCase())}">
            <svg class="icon" width="16" height="16" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-circle-info-filled"></use>
            </svg>
          </button>
        </div>
      `;
    }

    function representativeForSubject(subject) {
      if (!subject) return null;
      if (subject.representative) return subject.representative;
      if ((subject.authorization || subject.type === "PJ") && frontOfficeSchema?.authenticatedUser) {
        return frontOfficeSchema.authenticatedUser;
      }
      return null;
    }

    /* "Schimbă" only earns its place when there is somewhere else to go. With a
       single eligible identity the choice screen has nothing to offer, so the
       link is omitted entirely rather than shown and leading to a dead end. */
    function subjectIsChangeable(schema = frontOfficeSchema) {
      return frontOfficeSelectableSubjects(schema).filter((item) => item.selectable !== false).length > 1;
    }

    function subjectRolesHtml(subject) {
      const representative = representativeForSubject(subject);
      const changeable = subjectIsChangeable();
      const changeableClass = changeable ? " e-permits-fo-selected-role--changeable" : "";
      if (!representative) {
        return `
          <div class="e-permits-fo-form__role-group">
            ${roleGroupTitleHtml("Solicitant")}
            <div class="e-permits-fo-selected-role${changeableClass}">
              ${selectedRoleHtml(subject, { changeable })}
            </div>
          </div>
        `;
      }
      return `
        <div class="e-permits-fo-form__role-group">
          ${roleGroupTitleHtml("Solicitant")}
          <div class="e-permits-fo-selected-role${changeableClass}">
            ${selectedRoleHtml(subject, { changeable })}
          </div>
        </div>
        <div class="e-permits-fo-form__role-group">
          ${roleGroupTitleHtml("Reprezentant")}
          <div class="e-permits-fo-selected-role">
            ${selectedRoleHtml(representative)}
          </div>
        </div>
      `;
    }

    function contactSectionHtml(subject) {
      const userContact = frontOfficeSchema?.authenticatedUser?.contact || {};
      const contact = subject?.contact || userContact;
      const emails = contactChoices(contact, "email", userContact.email || "anastasia.cojocaru@mnotify.gov.md");
      const email = emails[0] || "";
      const hasEmailChoices = emails.length > 1;
      const phones = contactChoices(contact, "phone", userContact.phone || "60 999 999");
      const phone = phones[0] || "";
      const emailListId = "fo-representative-email-list";
      return `
        <h2 id="fo-representative-title">Date de contact</h2>
        <div class="e-permits-fo-form__section-body">
          <div class="e-permits-fo-field e-permits-fo-field--span-6">
            <label>Telefon</label>
            ${verifiedPhoneHtml(phone)}
          </div>

          <div class="e-permits-fo-field e-permits-fo-field--span-6">
            <label for="fo-representative-email">Email</label>
            ${hasEmailChoices
              ? contactChoiceSelectHtml({ id: "fo-representative-email", listId: emailListId, value: email, choices: emails })
              : verifiedValueHtml(email)}
          </div>
        </div>

        ${mnotifyInfoHtml()}
      `;
    }

    /* the FO Read Only field (prefilled from MPass / a registry): value + green check. Optional
       `id` (the value can be read / described), `required` star and `hint` (Form Builder) */
    function readonlyFieldHtml(field) {
      const span = [3, 4, 6, 8, 12].includes(Number(field.span)) ? Number(field.span) : 4;
      const id = field.id ? escapeFrontOfficeHtml(field.id) : "";
      return `
        <div class="e-permits-fo-field e-permits-fo-field--span-${span}">
          <label${id ? ` id="${id}-label"` : ""}>${escapeFrontOfficeHtml(field.label)}${field.required ? ` ${requiredMarkerHtml()}` : ""}</label>
          <div class="e-permits-fo-input is-filled is-readonly">
            <span class="e-permits-fo-input__value"${id ? ` id="${id}" role="textbox" aria-readonly="true" aria-labelledby="${id}-label" title="${escapeFrontOfficeHtml(field.value)}"${field.hint ? ` aria-describedby="${id}-hint"` : ""}` : ""}>${escapeFrontOfficeHtml(field.value)}</span>
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
            </svg>
          </div>
          ${id && field.hint ? fieldHintHtml(field.id, { hint: field.hint }) : ""}
        </div>
      `;
    }

    function subjectDataSkeletonFieldHtml(span = 4) {
      const safeSpan = [4, 6, 8, 12].includes(Number(span)) ? Number(span) : 4;
      return `
        <div class="e-permits-fo-field e-permits-fo-field--span-${safeSpan} e-permits-fo-field--skeleton" aria-hidden="true">
          <span class="e-permits-fo-skeleton e-permits-fo-skeleton--label"></span>
          <span class="e-permits-fo-skeleton e-permits-fo-skeleton--input"></span>
        </div>
      `;
    }

    function mnotifySkeletonHtml() {
      return `
        <div class="e-permits-fo-notice e-permits-fo-notice--skeleton" aria-hidden="true">
          <span class="e-permits-fo-skeleton e-permits-fo-skeleton--notice-icon"></span>
          <span class="e-permits-fo-notice__content">
            <span class="e-permits-fo-skeleton e-permits-fo-skeleton--notice-line"></span>
            <span class="e-permits-fo-skeleton e-permits-fo-skeleton--notice-link"></span>
          </span>
        </div>
      `;
    }

    function renderSubjectDetailsSkeleton(subject) {
      const requestData = subject?.requestData;
      const dataSection = document.querySelector("#fo-company-title")?.closest(".e-permits-fo-form__section");
      const contactSection = document.querySelector("#fo-representative-title")?.closest(".e-permits-fo-form__section");
      if (dataSection) {
        dataSection.hidden = true;
      }

      if (contactSection) {
        contactSection.innerHTML = `
          <h2 id="fo-representative-title">Date de contact</h2>
          <div class="e-permits-fo-form__section-body is-loading" aria-live="polite" aria-busy="true">
            ${subjectDataSkeletonFieldHtml(6)}
            ${subjectDataSkeletonFieldHtml(6)}
          </div>
          ${mnotifySkeletonHtml()}
        `;
      }
    }

    function renderSubjectDetails(subject) {
      const dataSection = document.querySelector("#fo-company-title")?.closest(".e-permits-fo-form__section");
      const dataTitle = dataSection?.querySelector("h2");
      const dataBody = dataSection?.querySelector(".e-permits-fo-form__section-body");
      const requestData = subject.requestData;
      if (dataSection) dataSection.hidden = true;
      if (dataTitle && requestData?.sectionTitle) dataTitle.textContent = requestData.sectionTitle;
      if (dataBody && Array.isArray(requestData?.fields)) {
        dataBody.setAttribute("aria-busy", "false");
        dataBody.classList.remove("is-loading");
        dataBody.innerHTML = requestData.fields.map(readonlyFieldHtml).join("");
      }
      const contactSection = document.querySelector("#fo-representative-title")?.closest(".e-permits-fo-form__section");
      if (contactSection) {
        contactSection.innerHTML = contactSectionHtml(subject);
        initFrontOfficeDynamicControls(contactSection);
      }
    }

    function syncRequestSubject(subject) {
      if (!subject) return;
      const previousSubjectId = frontOfficeSelectedSubject?.id || "";
      frontOfficeSelectedSubject = subject;
      if (frontOfficeAvatarTrigger) {
        frontOfficeAvatarTrigger.innerHTML = headerRoleSwitchHtml(subject);
        frontOfficeAvatarTrigger.setAttribute("aria-label", `Deschide meniul profilului: ${subject.name}`);
      }
      const rolesSection = document.querySelector(".e-permits-fo-form__roles");
      if (rolesSection) {
        rolesSection.classList.toggle("is-single", !representativeForSubject(subject));
        rolesSection.innerHTML = `
          <div class="e-permits-fo-form__roles-grid">
            ${subjectRolesHtml(subject)}
          </div>
          ${authorizationCardHtml(subject)}
        `;
      }

      if (frontOfficeSubjectLoadTimer) {
        window.clearTimeout(frontOfficeSubjectLoadTimer);
        frontOfficeSubjectLoadTimer = null;
      }

      const shouldSkeletonLoad = Boolean(
        previousSubjectId
        && previousSubjectId !== subject.id
        && frontOfficeRequestScreen
        && !frontOfficeRequestScreen.hidden
      );

      if (shouldSkeletonLoad) {
        const token = ++frontOfficeSubjectLoadToken;
        renderSubjectDetailsSkeleton(subject);
        const delay = Math.floor(180 + Math.random() * 620);
        frontOfficeSubjectLoadTimer = window.setTimeout(() => {
          if (token !== frontOfficeSubjectLoadToken) return;
          renderSubjectDetails(subject);
          frontOfficeSubjectLoadTimer = null;
        }, delay);
      } else {
        frontOfficeSubjectLoadToken += 1;
        renderSubjectDetails(subject);
      }
      renderFrontOfficeAvatarMenuFromSchema(frontOfficeSchema);
      /* switching identity from the header while on "Ce vrei să soliciți?"
         swaps the acts list to the new identity's */
      if (frontOfficeIntentScreen && !frontOfficeIntentScreen.hidden && !frontOfficeIntentApplying) {
        if (frontOfficeShouldShowIntent(subject)) {
          renderFrontOfficeIntent();
        } else {
          /* the new identity has nothing to post-process: skip to the form */
          history.replaceState(null, "", "#request");
          showFrontOfficeRequest({ step: 1 });
        }
      }
    }

    function selectFrontOfficeSubject(subjectId) {
      if (!frontOfficeSchema) return null;
      const allowed = frontOfficeAllowedTypes(frontOfficeSchema);
      const subjects = frontOfficeSelectableSubjects(frontOfficeSchema);
      const subject =
        subjects.find((item) => item.id === subjectId && allowed.includes(item.type) && item.selectable !== false)
        || subjects.find((item) => item.id === frontOfficeSchema.defaultSubjectId && allowed.includes(item.type) && item.selectable !== false)
        || subjects.find((item) => allowed.includes(item.type) && item.selectable !== false)
        || null;
      if (subject) syncRequestSubject(subject);
      return subject;
    }

    function applyFrontOfficeSchema(schema) {
      frontOfficeSchema = schema;
      /* a re-applied schema (Configurare flux) starts over: no guest request in progress */
      frontOfficeGuest = null;
      setServiceHeaderFromSchema(schema);
      setBetaBannerFromSchema(schema);
      setAuthFromSchema(schema);
      renderRolesFromSchema(schema);
      renderStepperFromSchema(schema);
      renderFrontOfficeStep2FromSchema(schema);
      renderFrontOfficeStep3FromSchema(schema);
      renderFrontOfficeStep5FromSchema(schema);
      renderFrontOfficeStep6FromSchema(schema);
      renderFrontOfficeStep7FromSchema(schema);
      syncGuestWizardChrome();
      /* ?solicitant=<subject id> = the EVO → service hand-over: the instance the person acts as
         in EVO (cabinet ?as) arrives pre-selected, so #request / #intent open as that instance and
         the choice screen is skipped (catalog „Solicită online”, Solicitările mele; user rule
         2026-10-13, ⚠ mechanics to confirm with PO / tech). Also used by demos (US-54 adr-04). */
      selectFrontOfficeSubject(new URLSearchParams(window.location.search).get("solicitant") || schema.defaultSubjectId);
      updateFrontOfficeRequestHeaders();
    }

    async function loadFrontOfficeSchema() {
      try {
        let data = null;
        let lastError = null;
        for (const url of frontOfficeSchemaUrls()) {
          try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) throw new Error(`Front-office schema unavailable at ${url}`);
            data = await response.json();
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!data) throw lastError || new Error("Front-office schema unavailable");
        const flowId = frontOfficeFlowId();
        const schema = (data.frontOfficeFlows || []).find((flow) => flow.id === flowId) || data.frontOfficeFlows?.[0];
        if (schema) applyFrontOfficeSchema(schema);
        return schema || null;
      } catch (error) {
        console.warn(error);
        return null;
      }
    }

    function setFrontOfficeScreen(screen, { focus = true } = {}) {
      const screens = {
        auth: frontOfficeAuthScreen,
        access: frontOfficeAccessScreen,
        choice: frontOfficeChoiceScreen,
        request: frontOfficeRequestScreen,
        guest: frontOfficeGuestScreen,
        intent: frontOfficeIntentScreen,
      };

      Object.entries(screens).forEach(([name, node]) => {
        if (!node) return;
        node.hidden = name !== screen;
      });

      /* The guest screen reuses .e-permits-fo-request's sidebar+form layout
         (same "keep the stepper on the left" treatment as the real wizard),
         so it needs the same full-width, top-aligned chrome — not the
         centered-card chrome auth/choice use. */
      const isWizardLayout = screen === "request" || screen === "guest" || screen === "intent";
      frontOfficeMain?.classList.toggle("is-request-mode", isWizardLayout);
      frontOfficeRoot?.classList.toggle("is-request-mode", isWizardLayout);
      document.body.classList.toggle("is-fo-request-mode", isWizardLayout);
      if (frontOfficeAvatarMenu) {
        /* the intent screen already has an identity, so the header shows it */
        const shouldShowRoleSwitcher = (screen === "request" && !frontOfficeGuest) || screen === "intent";
        frontOfficeAvatarMenu.hidden = !shouldShowRoleSwitcher;
        frontOfficeAvatarMenu.setAttribute("aria-hidden", String(!shouldShowRoleSwitcher));
        if (!shouldShowRoleSwitcher) setFrontOfficeAvatarMenuOpen(false);
      }
      if (screen === "request") {
        const activeStep = Number(document.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
        updateFrontOfficeMobileProgress(activeStep);
        scrollFrontOfficeStepToTop();
      }
      updateFrontOfficeHeaderDraft();

      if (!focus) return;
      if (screen === "choice") {
        frontOfficeChoiceScreen?.querySelector(".e-permits-fo-auth__role-item")?.focus({ preventScroll: true });
      }
      if (screen === "request") {
        frontOfficeRequestScreen?.querySelector("[data-fo-step-panel]:not([hidden]) h1")?.focus?.({ preventScroll: true });
        scrollFrontOfficeStepToTop();
      }
      if (screen === "guest") {
        frontOfficeGuestScreen?.querySelector("h1")?.focus?.({ preventScroll: true });
      }
      if (screen === "access") {
        frontOfficeAccessScreen?.querySelector("[data-fo-access-mpass]")?.focus?.({ preventScroll: true });
      }
      if (screen === "intent") {
        frontOfficeIntentScreen?.querySelector("h1")?.focus?.({ preventScroll: true });
      }
    }

    function scrollFrontOfficeStepToTop({ behavior = "auto" } = {}) {
      window.requestAnimationFrame(() => {
        const scrollers = [
          document.scrollingElement,
          document.documentElement,
          document.body,
          frontOfficeMain,
          frontOfficeRequestScreen,
        ].filter(Boolean);

        scrollers.forEach((node) => {
          if (typeof node.scrollTo === "function") {
            node.scrollTo({ top: 0, left: 0, behavior });
            return;
          }
          node.scrollTop = 0;
          node.scrollLeft = 0;
        });

        window.scrollTo({ top: 0, left: 0, behavior });
      });
    }

    /* US-18 AC-01..03: in the primary request the Finalizare step opens only once the fee is paid
       (MPay); post-processes without a fee skip Plată and are never gated. ?paid=1 = paid (demo). */
    let frontOfficePaid = new URLSearchParams(location.search).get("paid") === "1";
    let frontOfficePaymentNoticeShown = false;
    /* a post-process (?pp=…) is known from the URL before its state is set on load */
    const frontOfficeFinishBlocked = (step) => Number(step) === 7 && !frontOfficePostprocess && !new URLSearchParams(location.search).get("pp") && !frontOfficePaid;
    function setFrontOfficeStep(step, { focus = true, scroll = true } = {}) {
      if (frontOfficeFinishBlocked(step)) {
        step = 6;
        history.replaceState(null, "", frontOfficeStepHash(6));
        window.setTimeout(() => showFrontOfficePaymentNotice(), 0);
      }
      if (Number(step) >= 2 && !frontOfficeDraftCreated) {
        saveFrontOfficeDraft();
      } else {
        updateFrontOfficeRequestHeaders();
      }

      frontOfficeStepPanels.forEach((panel) => {
        panel.hidden = panel.dataset.foStepPanel !== String(step);
      });

      const activePanel = frontOfficeRequestScreen?.querySelector(`[data-fo-step-panel="${step}"]`);
      window.PageReveal?.showStep?.(activePanel);

      frontOfficeStepperItems.forEach((item) => {
        const itemStep = Number(item.dataset.foStep);
        const isActive = itemStep === step;
        item.classList.toggle("is-active", isActive);
        item.classList.toggle("is-completed", itemStep < step);
        if (isActive) {
          item.classList.remove("is-step-activating");
          void item.offsetWidth;
          item.classList.add("is-step-activating");
          window.setTimeout(() => item.classList.remove("is-step-activating"), 320);
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
      });

      updateFrontOfficeMobileProgress(step);
      /* steps re-render their footers: a guest never gets „Salvează ca schiță” (US-21) */
      syncGuestWizardChrome();

      if (focus) {
        frontOfficeRequestScreen?.querySelector("[data-fo-step-panel]:not([hidden]) h1")?.focus?.({ preventScroll: true });
      }
      if (scroll) scrollFrontOfficeStepToTop();
    }

    function showFrontOfficeChoice({ focus = true } = {}) {
      if (!frontOfficeAuthScreen || !frontOfficeChoiceScreen) return;
      setFrontOfficeScreen("choice", { focus });
    }

    /* "Autentifică-te sau continuă fără cont" — for services available with and without MPass:
       sign in with MPass, or continue as a guest. */
    function showFrontOfficeAccess({ focus = true } = {}) {
      if (window.location.hash !== "#access") history.replaceState(null, "", "#access");
      setFrontOfficeScreen("access", { focus });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-access-mpass]")) {
        openMpassTestPage();
        return;
      }
      if (event.target.closest("[data-fo-access-guest]")) {
        showFrontOfficeGuest();
      }
    });

    function openMpassTestPage() {
      const returnUrl = new URL(window.location.href);
      returnUrl.hash = "#choice-authenticated";
      const testPage = new URL(window.location.pathname.includes("/Components/") ? "../mpass-test.html" : "mpass-test.html", window.location.href);
      testPage.searchParams.set("return", `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`);
      window.location.assign(testPage.href);
    }

    /* Animated segmented control (`.segmented-control.is-animated`, components.md › Segmented
       control — animated): one sliding thumb under the selected item, positioned from the item's
       box (--seg-x/-y/-w/-h). Snaps on first paint / resize / becoming visible, slides on a
       selection change. A `role="radiogroup"` control also gets the radio keys: ← → ↑ ↓ move the
       selection (selection follows focus), Home / End jump to the ends. */
    function initAnimatedSegmentedControls(root = document) {
      root.querySelectorAll(".segmented-control.is-animated:not([data-seg-bound])").forEach((control) => {
        control.dataset.segBound = "";
        let snapTimer = 0;
        const place = ({ snap = false } = {}) => {
          const selected = control.querySelector(".segment-item.is-selected");
          if (!selected || !control.getClientRects().length) return;
          if (snap) control.classList.add("is-snap");
          control.style.setProperty("--seg-x", `${selected.offsetLeft}px`);
          control.style.setProperty("--seg-y", `${selected.offsetTop}px`);
          control.style.setProperty("--seg-w", `${selected.offsetWidth}px`);
          control.style.setProperty("--seg-h", `${selected.offsetHeight}px`);
          control.classList.add("is-ready");
          if (!snap) return;
          void control.offsetWidth;
          window.cancelAnimationFrame(snapTimer);
          snapTimer = window.requestAnimationFrame(() => control.classList.remove("is-snap"));
        };
        place({ snap: true });
        /* snap when it first shows (hidden screen → visible) or the window resizes; a width change
           from the selection itself (the selected label is medium) must not cancel the slide */
        let shownWidth = control.offsetWidth;
        new ResizeObserver(() => {
          const width = control.offsetWidth;
          place({ snap: !shownWidth && width > 0 });
          shownWidth = width;
        }).observe(control);
        window.addEventListener("resize", () => place({ snap: true }));
        /* only the items' class (selection) — the control's own is-ready / is-snap would loop */
        const selectionObserver = new MutationObserver((records) => {
          if (records.some((record) => record.target !== control)) place();
        });
        control.querySelectorAll(".segment-item").forEach((item) => selectionObserver.observe(item, { attributes: true, attributeFilter: ["class"] }));
        if (control.getAttribute("role") !== "radiogroup") return;
        control.addEventListener("keydown", (event) => {
          const items = [...control.querySelectorAll(".segment-item:not(:disabled)")];
          const index = items.indexOf(document.activeElement);
          if (index < 0) return;
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
          let next = null;
          if (step) next = items[(index + step + items.length) % items.length];
          if (event.key === "Home") next = items[0];
          if (event.key === "End") next = items[items.length - 1];
          if (!next) return;
          event.preventDefault();
          next.focus();
          next.click();
        });
      });
    }

    initAnimatedSegmentedControls();

    /* ---- Registry lookup by a 13-digit code (2026-10-13) --------------------------------------
       ONE implementation for the guest IDNO (G1b / G3 / G5) and the Form Builder IDNO / IDNP
       components: at 13 digits the hint slot becomes the `__loading` message, every target field
       shows the FO input skeleton (`is-srre-loading`), then the targets fill read-only (green check +
       one `is-srre-new` flash) or the code field gets the not-found error (the caller's `setError`).
       `?registru=asteptare` keeps the answer pending (demo). Mock registries: the flow schema's
       subjects (PJ → RSUD, PF → RSP). */
    const REGISTRY_LOOKUP_MS = 900;
    const registryLookupPending = new URLSearchParams(window.location.search).get("registru") === "asteptare";

    function setRegistryValue(input, value, { flash = false } = {}) {
      const wrap = input?.closest(".e-permits-fo-input");
      if (!wrap) return;
      input.value = value || "";
      wrap.querySelector(".icon")?.remove();
      wrap.classList.remove("is-srre-new");
      if (!value) return;
      wrap.insertAdjacentHTML("beforeend", '<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>');
      if (flash) {
        void wrap.offsetWidth;
        wrap.classList.add("is-srre-new");
        wrap.addEventListener("animationend", () => wrap.classList.remove("is-srre-new"), { once: true });
      }
    }

    function createRegistryLookup({ input, hint, hintText = "13 cifre", targets = [], live = null, find, loadingText, notFound, foundText, setError }) {
      const lookup = { token: 0, code: "", record: null, pending: null };
      const setLoading = (on) => {
        targets.forEach(({ input: target }) => {
          const field = target?.closest(".e-permits-fo-field");
          field?.querySelector("[data-fo-srre-skeleton]")?.remove();
          field?.classList.toggle("is-srre-loading", on);
          if (on) field?.insertAdjacentHTML("beforeend", '<span class="e-permits-fo-skeleton e-permits-fo-skeleton--input" aria-hidden="true" data-fo-srre-skeleton></span>');
        });
        if (!hint) return;
        if (on) {
          hint.className = "message message--inline e-permits-fo-field__error e-permits-fo-field__loading";
          hint.innerHTML = `<span class="spinner spinner--small spinner--brand" aria-hidden="true"></span><span>${escapeFrontOfficeHtml(loadingText)}</span>`;
        } else {
          hint.className = "e-permits-fo-field__hint";
          hint.textContent = hintText;
        }
      };
      const fill = (record, flash = false) => targets.forEach(({ input: target, value }) => setRegistryValue(target, record ? value(record) : "", { flash }));
      lookup.cancel = () => {
        lookup.token += 1;
        lookup.pending = null;
        lookup.code = "";
        lookup.record = null;
        setLoading(false);
        fill(null);
      };
      lookup.run = (code) => {
        lookup.cancel();
        const token = lookup.token;
        lookup.code = code;
        setError?.(input, "");
        setLoading(true);
        if (live) live.textContent = "";
        lookup.pending = new Promise((resolve) => { if (!registryLookupPending) window.setTimeout(resolve, REGISTRY_LOOKUP_MS); }).then(() => {
          if (token !== lookup.token) return;
          lookup.pending = null;
          setLoading(false);
          lookup.record = find(code) || null;
          if (lookup.record) {
            fill(lookup.record, true);
            if (live) live.textContent = foundText(lookup.record);
          } else {
            setError?.(input, notFound);
            if (live) live.textContent = notFound;
          }
        });
      };
      /* a full code asks the registry; a shorter one cancels the previous answer */
      lookup.onInput = () => {
        const digits = input.value.replace(/\D/g, "").slice(0, 13);
        if (digits !== input.value) input.value = digits;
        if (digits.length === 13) {
          if (digits !== lookup.code) lookup.run(digits);
        } else if (lookup.code) {
          lookup.cancel();
        }
      };
      return lookup;
    }

    const REGISTRY_COMPANY_NOT_FOUND = "Nu am găsit o companie cu acest IDNO în Registrul de Stat.";
    const REGISTRY_PERSON_NOT_FOUND = "Nu am găsit o persoană cu acest IDNP în Registrul de Stat al Populației.";
    function registryCompanies() {
      return (frontOfficeSchema?.subjects || [])
        .filter((subject) => subject.type === "PJ" && subject.idValue)
        .map((subject) => ({ idno: subject.idValue, name: subject.name }));
    }
    /* first / last name: the subject's initials are first + last (e.g. „Vrabie Gheorghe” = GV) */
    function splitPersonName(subject) {
      const words = String(subject?.name || "").trim().split(/\s+/);
      if (words.length < 2) return { first: words[0] || "", last: "" };
      const firstFirst = !subject.initials || subject.initials[0] === words[0][0];
      return firstFirst ? { first: words[0], last: words.slice(1).join(" ") } : { first: words[words.length - 1], last: words.slice(0, -1).join(" ") };
    }
    function registryPeople() {
      const seen = new Set();
      return (frontOfficeSchema?.subjects || []).flatMap((subject) => [subject, subject.representative].filter(Boolean))
        .filter((person) => person.type === "PF" && person.idValue && !seen.has(person.idValue) && seen.add(person.idValue))
        .map((person) => ({ idnp: person.idValue, ...splitPersonName(person) }));
    }

    /* the applicant of the request (MPass) — prefill for IDNP / IDNO / contact in the builder Preview */
    function formApplicant() {
      const subjects = frontOfficeSchema?.subjects || [];
      const subject = frontOfficeSelectedSubject || subjects.find((item) => item.id === "pj-global-trader") || subjects[0] || {};
      const person = subject.type === "PF" ? subject : subject.representative || subjects.find((item) => item.type === "PF") || {};
      const company = subject.type === "PJ" ? subject : null;
      return {
        type: subject.type || "PF",
        idnp: person.idValue || "", ...splitPersonName(person),
        idno: company?.idValue || "", company: company?.name || "",
        phone: subject.contact?.phone || "60 999 999",
        email: subject.contact?.email || "",
      };
    }

    /* builder / Preview: a lookup group (IDNO → RSUD, IDNP → RSP after the declaration) */
    function bindRegistryLookup(group) {
      if (group.foLookup) return;
      const input = group.querySelector("[data-fo-registry-code]");
      if (!input) return;
      const person = group.dataset.foRegistry === "rsp";
      const hint = group.querySelector("[data-fo-field-hint]");
      const lookup = createRegistryLookup({
        input,
        hint,
        hintText: hint?.textContent || "13 cifre",
        targets: [...group.querySelectorAll("[data-fo-registry-target]")].map((target) => ({ input: target, value: (record) => record[target.dataset.foRegistryTarget] || "" })),
        live: group.querySelector("[data-fo-registry-live]"),
        find: (code) => (person ? registryPeople().find((item) => item.idnp === code) : registryCompanies().find((item) => item.idno === code)),
        loadingText: person ? "Se caută persoana în Registrul de Stat al Populației…" : "Se caută compania în Registrul de Stat…",
        notFound: person ? REGISTRY_PERSON_NOT_FOUND : REGISTRY_COMPANY_NOT_FOUND,
        foundText: (record) => (person ? `Numele a fost preluat din Registrul de Stat al Populației: ${record.last} ${record.first}.` : `Denumirea companiei a fost preluată din Registrul de Stat: ${record.name}.`),
        setError: setGuestFieldError,
      });
      group.foLookup = lookup;
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") setGuestFieldError(input, "");
        lookup.onInput();
      });
      const consent = group.querySelector("[data-fo-lookup-consent]");
      consent?.addEventListener("change", () => {
        input.disabled = !consent.checked;
        input.closest(".e-permits-fo-input")?.classList.toggle("is-disabled", !consent.checked);
        if (consent.checked) return;
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    /* 13-digit inputs: digits only + the `n/13` counter */
    function bindDigitsInput(input) {
      if (input.foDigits) return;
      input.foDigits = true;
      const counter = input.closest(".e-permits-fo-field")?.querySelector("[data-fo-digits-counter]");
      const sync = () => {
        const digits = input.value.replace(/\D/g, "").slice(0, 13);
        if (digits !== input.value) input.value = digits;
        if (counter) counter.textContent = `${digits.length}/13`;
      };
      input.addEventListener("input", sync);
      sync();
    }

    /* ===================================================================
       Guest requestor — „Date solicitant” without MPass. Figma FOD-Components-flow
       „Guest lane · without account” (633:7411, G1–G8); rules in components.md ›
       „Full flow — guest requestor”. Reached from „Continuă fără cont” (access screen),
       #guest, or logging out of a service that does not require MPass.
       - Variant: ?guest=pf|pj|pfpj, else auth.availableFor. PF + PJ → the „Soliciți în
         numele” segmented control; one type → the form directly.
       - PF: IDNP, Nume, Prenume typed in — NEVER looked up from the IDNP (anyone who knows
         an IDNP could otherwise reveal a name). PJ: IDNO → „Denumirea companiei” from the
         public registry; the representative's IDNP / names typed in.
       - „Pentru cine?” (PF): Pentru mine · Pentru altă persoană (G4: represented person +
         notarial power of attorney). PJ (G5): the representation document is always asked.
       - „Înainte” is never disabled: every check runs on click (G6), focus → first error.
       - Valid → the same wizard in guest mode (frontOfficeGuest): no draft (US-21), Acte
         necesare from the device only (+ the power of attorney), Livrare without MDelivery /
         EVO Cabinet, Finalizare by e-mail with an invitation to sign in (FOD #54850).
       - G8: the logo / closing the page ask first; „Autentifică-te cu MPass” keeps the data.
       =================================================================== */
    const GUEST_TYPE_PARAM = { pf: ["PF"], pj: ["PJ"], pfpj: ["PF", "PJ"] };
    const guestTypeOverride = GUEST_TYPE_PARAM[(new URLSearchParams(window.location.search).get("guest") || "").toLowerCase()] || null;
    const GUEST_CARRY_KEY = "e-permits-fo-guest-carry";
    const GUEST_ERROR_ATTR = "data-fo-guest-error";
    const GUEST_REQUIRED = "Câmp obligatoriu";
    const GUEST_NOT_FOUND = REGISTRY_COMPANY_NOT_FOUND;
    const GUEST_IDNO_HINT = "13 cifre";

    const guestScreen = frontOfficeGuestScreen;
    const guestEl = (selector) => guestScreen?.querySelector(selector) || null;
    const guestForm = guestEl("[data-fo-guest-form]");
    const guestTypeSection = guestEl("[data-fo-guest-type-section]");
    const guestTypeGroup = guestEl("[data-fo-guest-type-group]");
    const guestCompanySection = guestEl("[data-fo-guest-company]");
    const guestPersonTitle = guestEl("[data-fo-guest-person-title]");
    const guestBeneficiarySection = guestEl("[data-fo-guest-beneficiary-section]");
    const guestBeneficiaryGroup = guestEl("[data-fo-guest-beneficiary]");
    const guestRepresentedSection = guestEl("[data-fo-guest-represented]");
    const guestMandateSection = guestEl("[data-fo-guest-mandate]");
    const guestIdnoInput = guestEl("[data-fo-guest-idno]");
    const guestIdnoHint = guestEl("#fo-guest-idno-hint");
    const guestCompanyInput = guestEl("[data-fo-guest-company-name]");
    const guestLive = guestEl("[data-fo-guest-live]");
    const guestPhoneInput = guestEl("[data-fo-guest-phone]");
    const guestEmailInput = guestEl("[data-fo-guest-email]");
    const guestConsent = guestEl("[data-fo-guest-consent]");
    const guestNextButton = guestEl("[data-fo-guest-next]");
    const guestLeaveModal = document.querySelector("[data-fo-guest-leave-modal]");

    let guestType = "PF";
    /* IDNO → „Denumirea companiei”: the shared registry lookup (createRegistryLookup) */
    const guestLookup = createRegistryLookup({
      input: guestIdnoInput,
      hint: guestIdnoHint,
      hintText: GUEST_IDNO_HINT,
      targets: guestCompanyInput ? [{ input: guestCompanyInput, value: (company) => company.name }] : [],
      live: guestLive,
      find: (idno) => registryCompanies().find((company) => company.idno === idno),
      loadingText: "Se caută compania în Registrul de Stat…",
      notFound: GUEST_NOT_FOUND,
      foundText: (company) => `Denumirea companiei a fost preluată din Registrul de Stat: ${company.name}.`,
      setError: (input, message) => setGuestFieldError(input, message),
    });
    let guestLeaveReturnFocus = null;
    let guestUnloadAllowed = false;

    function guestAllowedTypes() {
      return guestTypeOverride || frontOfficeAllowedTypes();
    }

    function guestBeneficiary() {
      return guestBeneficiaryGroup?.querySelector("input:checked")?.value || "self";
    }

    /* self = G1 / G2 · other = G4 (power of attorney) · company = G1b / G3 / G5 */
    function guestCase() {
      if (guestType === "PJ") return "company";
      return guestBeneficiary() === "other" ? "other" : "self";
    }

    function syncGuestLayout() {
      const isPj = guestType === "PJ";
      if (guestCompanySection) guestCompanySection.hidden = !isPj;
      if (guestPersonTitle) guestPersonTitle.textContent = isPj ? "Date reprezentant" : "Date personale";
      if (guestBeneficiarySection) guestBeneficiarySection.hidden = isPj;
      if (guestRepresentedSection) guestRepresentedSection.hidden = guestCase() !== "other";
      if (guestMandateSection) guestMandateSection.hidden = !isPj;
    }

    function setGuestType(type) {
      const allowed = guestAllowedTypes();
      guestType = allowed.includes(type) ? type : allowed[0];
      if (guestTypeSection) guestTypeSection.hidden = allowed.length < 2;
      guestTypeGroup?.querySelectorAll("[data-fo-guest-type]").forEach((button) => {
        const selected = button.dataset.foGuestType === guestType;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-checked", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      syncGuestLayout();
    }

    /* ---- messages: the library inline error under the control (components.md › Field error
       message); the hint hides while it shows and returns when the field is edited ---- */
    function guestErrorHtml(message) {
      return `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg><span>${escapeFrontOfficeHtml(message)}</span>`;
    }

    function guestErrorNode(id) {
      const node = document.createElement("span");
      node.className = "message message--inline message--error e-permits-fo-field__error";
      node.setAttribute(GUEST_ERROR_ATTR, "");
      node.id = id;
      return node;
    }

    function setGuestFieldError(input, message) {
      const field = input?.closest(".e-permits-fo-field");
      if (!field) return;
      const control = field.querySelector(".e-permits-fo-input, .e-permits-fo-phone--editable");
      /* also the Form Builder fields (registry lookups, Preview „Validează”) */
      const hint = field.querySelector("[data-fo-guest-hint], [data-fo-field-hint]") || field.querySelector(":scope > .e-permits-fo-field__hint");
      let error = field.querySelector(`[${GUEST_ERROR_ATTR}]`);
      control?.classList.toggle("is-error", Boolean(message));
      if (input.dataset.foDescribedby === undefined) input.dataset.foDescribedby = input.getAttribute("aria-describedby") || "";
      if (!message) {
        error?.remove();
        if (hint) hint.hidden = false;
        input.removeAttribute("aria-invalid");
        if (input.dataset.foDescribedby) input.setAttribute("aria-describedby", input.dataset.foDescribedby);
        else input.removeAttribute("aria-describedby");
        return;
      }
      if (!error) {
        error = guestErrorNode(`${input.id}-error`);
        (hint || control)?.insertAdjacentElement("afterend", error);
      }
      error.innerHTML = guestErrorHtml(message);
      if (hint) hint.hidden = true;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
    }

    /* the library file upload has no error variant yet: the missing document is flagged in its
       description line (Figma G6) */
    function setGuestDocError(docField, message) {
      if (!docField) return;
      const desc = docField.querySelector("[data-fo-guest-hint]");
      const add = docField.querySelector("[data-fo-open-doc-modal]");
      let error = docField.querySelector(`[${GUEST_ERROR_ATTR}]`);
      docField.classList.toggle("is-error", Boolean(message));
      if (!message) {
        error?.remove();
        if (desc) desc.hidden = false;
        add?.removeAttribute("aria-describedby");
        return;
      }
      if (!error) {
        error = guestErrorNode(`fo-${docField.dataset.foDocField}-error`);
        desc?.insertAdjacentElement("afterend", error);
      }
      error.innerHTML = guestErrorHtml(message);
      if (desc) desc.hidden = true;
      add?.setAttribute("aria-describedby", error.id);
    }

    function setGuestConsentError(message) {
      const label = guestConsent?.closest(".checkbox");
      const row = label?.parentElement;
      if (!label || !row) return;
      label.classList.toggle("checkbox--error", Boolean(message));
      let error = row.querySelector(`[${GUEST_ERROR_ATTR}]`);
      if (!message) {
        error?.remove();
        guestConsent.removeAttribute("aria-invalid");
        return;
      }
      if (!error) {
        error = guestErrorNode("fo-guest-consent-error");
        row.appendChild(error);
      }
      error.innerHTML = guestErrorHtml(message);
      guestConsent.setAttribute("aria-invalid", "true");
    }

    function clearGuestErrors() {
      guestForm?.querySelectorAll("input[aria-invalid]").forEach((input) => {
        if (input !== guestConsent) setGuestFieldError(input, "");
      });
      guestForm?.querySelectorAll("[data-fo-doc-field]").forEach((docField) => setGuestDocError(docField, ""));
      setGuestConsentError("");
    }

    /* ---- 13-digit fields: digits only + counter; the IDNO also asks the registry ---- */
    function handleGuestDigits(input) {
      const digits = input.value.replace(/\D/g, "").slice(0, 13);
      if (digits !== input.value) input.value = digits;
      const counter = input.closest(".e-permits-fo-field")?.querySelector("[data-fo-guest-counter]");
      if (counter) counter.textContent = `${digits.length}/13`;
      if (input === guestIdnoInput) guestLookup.onInput();
    }

    /* ---- G6 · validation on „Înainte” (US-12 AC-07/08) ---- */
    const GUEST_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const GUEST_13 = /^\d{13}$/;

    function guestPhoneProblem(input) {
      const raw = input?.value.trim() || "";
      if (!raw) return GUEST_REQUIRED;
      const code = input.closest(".e-permits-fo-phone")?.querySelector("[data-fo-phone-code-value]")?.textContent.trim() || "+373";
      const digits = raw.replace(/[\s-]/g, "");
      if (!/^\d+$/.test(digits)) return "Introdu doar cifrele numărului, fără prefixul țării.";
      if (code === "+373") return digits.length === 8 ? "" : "Introdu un număr valid: 8 cifre după +373.";
      return digits.length >= 6 && digits.length <= 12 ? "" : "Introdu un număr de telefon valid.";
    }

    function guestHasFile(docKey) {
      return Boolean(guestEl(`[data-fo-doc-field='${docKey}'] .e-permits-fo-file-item, [data-fo-doc-field='${docKey}'] .e-permits-fo-mdocs__attachment`));
    }

    function guestChecks() {
      const checks = [];
      const field = (selector, rule) => {
        const input = guestEl(selector);
        if (!input) return;
        checks.push({ target: input, set: (message) => setGuestFieldError(input, message), run: () => {
          const value = input.value.trim();
          if (!value) return GUEST_REQUIRED;
          return rule ? rule(value) : "";
        } });
      };
      const thirteen = (label) => (value) => (GUEST_13.test(value) ? "" : `${label}-ul trebuie să aibă 13 cifre.`);
      const doc = (key, message) => {
        const docField = guestEl(`[data-fo-doc-field='${key}']`);
        if (!docField) return;
        checks.push({ target: docField.querySelector("[data-fo-open-doc-modal]"), set: (text) => setGuestDocError(docField, text), run: () => (guestHasFile(key) ? "" : message) });
      };
      const mode = guestCase();
      if (mode === "company") {
        field("#fo-guest-idno", (value) => {
          if (!GUEST_13.test(value)) return "IDNO-ul trebuie să aibă 13 cifre.";
          return guestLookup.code === value && !guestLookup.record ? GUEST_NOT_FOUND : "";
        });
      }
      field("#fo-guest-idnp", thirteen("IDNP"));
      field("#fo-guest-surname");
      field("#fo-guest-firstname");
      checks.push({ target: guestPhoneInput, set: (message) => setGuestFieldError(guestPhoneInput, message), run: () => guestPhoneProblem(guestPhoneInput) });
      field("#fo-guest-email", (value) => (GUEST_EMAIL.test(value) ? "" : "Introdu o adresă de e-mail validă, de ex. nume@exemplu.md."));
      if (mode === "other") {
        field("#fo-guest-rep-idnp", thirteen("IDNP"));
        field("#fo-guest-rep-surname");
        field("#fo-guest-rep-firstname");
        doc("guest-procura", "Câmp obligatoriu — atașează procura notarială.");
      }
      if (mode === "company") doc("guest-mandat", "Câmp obligatoriu — atașează procura sau decizia de numire.");
      checks.push({ target: guestConsent, set: setGuestConsentError, run: () => (guestConsent?.checked ? "" : "Bifează acordul pentru prelucrarea datelor personale.") });
      return checks;
    }

    /* every check runs; returns the first control in error (null = valid) */
    async function validateGuest() {
      const idno = guestIdnoInput?.value || "";
      if (guestCase() === "company" && GUEST_13.test(idno) && guestLookup.code !== idno) guestLookup.run(idno);
      if (guestLookup.pending) await guestLookup.pending;
      let first = null;
      guestChecks().forEach((check) => {
        const message = check.run();
        check.set(message);
        if (message && !first) first = check.target;
      });
      return first;
    }

    function focusGuestError(target) {
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
    }

    function guestValue(selector) {
      return guestEl(selector)?.value.trim() || "";
    }

    function guestFileName(docKey) {
      return guestEl(`[data-fo-doc-field='${docKey}'] .e-permits-fo-file-item__name`)?.textContent.trim() || "";
    }

    function collectGuestData() {
      const mode = guestCase();
      const code = guestPhoneInput?.closest(".e-permits-fo-phone")?.querySelector("[data-fo-phone-code-value]")?.textContent.trim() || "+373";
      const surname = guestValue("#fo-guest-surname");
      const firstname = guestValue("#fo-guest-firstname");
      return {
        type: guestType,
        mode,
        idnp: guestValue("#fo-guest-idnp"),
        name: [firstname, surname].filter(Boolean).join(" "),
        phone: `${code} ${guestValue("#fo-guest-phone")}`,
        email: guestValue("#fo-guest-email"),
        company: mode === "company" ? guestLookup.record : null,
        represented: mode === "other"
          ? { idnp: guestValue("#fo-guest-rep-idnp"), name: [guestValue("#fo-guest-rep-firstname"), guestValue("#fo-guest-rep-surname")].filter(Boolean).join(" ") }
          : null,
        document: mode === "other" ? guestFileName("guest-procura") : mode === "company" ? guestFileName("guest-mandat") : "",
      };
    }

    /* the subject the wizard's summary reads (Solicitant / Reprezentant / contact) */
    function guestSubjectOf(data) {
      const person = { name: data.name, idLabel: "IDNP", idValue: data.idnp };
      const base = { id: "guest", scenario: "guest", contact: { phone: data.phone, email: data.email } };
      if (data.mode === "company") return { ...base, type: "PJ", name: data.company.name, idLabel: "IDNO", idValue: data.company.idno, representative: person };
      if (data.mode === "other") return { ...base, type: "PF", name: data.represented.name, idLabel: "IDNP", idValue: data.represented.idnp, representative: person };
      return { ...base, type: "PF", ...person };
    }

    /* the flow schema, as a guest sees steps 3, 5 and 7 */
    function guestSchemaVariant(schema, data) {
      const next = JSON.parse(JSON.stringify(schema));
      const step = (index) => (next.steps || []).find((item) => Number(item.index) === index);
      const documents = step(3);
      if (Array.isArray(documents?.documents)) {
        /* no MDocs without MPass: upload from the device only */
        documents.documents = documents.documents.map((doc) => ({
          ...doc,
          description: String(doc.description || "").replace(/\s*Se caută automat în MDocs[^.]*\./, "").trim() || "Încarcă documentul de pe dispozitiv.",
        }));
        if (data.mode !== "self") {
          documents.documents.unshift({
            id: "guest-procura-doc",
            label: data.mode === "other" ? "Procură notarială" : "Procură sau decizia de numire",
            description: "Atașată la „Date solicitant”. Funcționarul o verifică în Back Office.",
            required: true,
          });
        }
      }
      const delivery = step(5);
      if (delivery) {
        /* MDelivery and the electronic result in EVO Cabinet need an account (FOD #89525) */
        delivery.options = [{
          id: "email",
          title: "Pe e-mail",
          description: `Actul semnat electronic se trimite la ${data.email}.`,
          icon: "icon-envelope",
          selected: true,
          badges: [{ label: "Gratuit", tone: "outline" }],
        }];
        if (Array.isArray(delivery.paperCopy?.methods)) {
          delivery.paperCopy.methods = delivery.paperCopy.methods.filter((method) => !method.address && !method.couriers);
        }
      }
      const finish = step(7);
      if (finish) {
        /* FOD #54850: case number + certificate by e-mail; an invitation to sign in instead of
           „Urmărește în EVO Cabinet” */
        finish.guest = { email: data.email };
        delete finish.lead;
        delete finish.action;
        if (finish.document) finish.document = { ...finish.document, text: `Dovada depunerii cererii. A fost trimisă și la ${data.email}`, link: "", href: "" };
        if (Array.isArray(finish.summary?.rows)) finish.summary.rows.push({ label: "Rezultatul se trimite la", value: data.email });
        const items = finish.timeline?.items || [];
        const last = items[items.length - 1];
        if (last) last.text = `Actul permisiv emis se trimite la ${data.email}.`;
      }
      return next;
    }

    function syncGuestWizardChrome() {
      /* US-21: a draft lives only in EVO Cabinet — a guest has none */
      frontOfficeRequestScreen?.querySelectorAll(".e-permits-fo-draft-button").forEach((button) => {
        button.hidden = Boolean(frontOfficeGuest);
      });
    }

    function attachGuestDocument(data) {
      if (!data.document) return;
      const files = document.querySelector("[data-fo-step-panel='3'] [data-fo-doc-field='guest-procura-doc'] [data-fo-doc-field-files]");
      if (files && !files.querySelector(".e-permits-fo-file-item")) foDocAttachFileItem(files, data.document, "");
    }

    function enterGuestWizard(data) {
      const firstTime = !frontOfficeGuest;
      const modeChanged = !firstTime && frontOfficeGuest.mode !== data.mode;
      frontOfficeGuest = { ...data, subject: guestSubjectOf(data) };
      frontOfficeSelectedSubject = frontOfficeGuest.subject;
      const schema = guestSchemaVariant(frontOfficeSchema, data);
      if (firstTime) {
        resetFrontOfficeDraftState();
        renderFrontOfficeStep2FromSchema(schema);
      }
      if (firstTime || modeChanged) renderFrontOfficeStep3FromSchema(schema);
      renderFrontOfficeStep5FromSchema(schema);
      renderFrontOfficeStep7FromSchema(schema);
      attachGuestDocument(data);
      /* „Eu sunt persoana de contact” = the phone the guest typed (no MNotify) */
      const selfPhone = document.querySelector("[data-fo-step-panel='2'] [data-fo-contact-self] .e-permits-fo-phone__value");
      if (selfPhone) selfPhone.textContent = data.phone;
      syncGuestWizardChrome();
      history.replaceState(null, "", "#request-step-2");
      showFrontOfficeRequest({ step: 2 });
    }

    function exitGuestWizard() {
      if (!frontOfficeGuest) return;
      frontOfficeGuest = null;
      frontOfficeSelectedSubject = null;
      if (frontOfficeSchema) {
        renderFrontOfficeStep2FromSchema(frontOfficeSchema);
        renderFrontOfficeStep3FromSchema(frontOfficeSchema);
        renderFrontOfficeStep5FromSchema(frontOfficeSchema);
        renderFrontOfficeStep7FromSchema(frontOfficeSchema);
      }
      syncGuestWizardChrome();
    }

    /* ---- Configurare flux › Stare utilizator: switching mode mid-flow (2026-10-15) ----
       The steps that differ between a guest and an MPass user (3 Acte, 5 Livrare, 7 Finalizare —
       see guestSchemaVariant) are drawn again, and what the user entered moves over:
       attached documents (the same DOM nodes, listeners kept) into the field with the same key,
       „Alte documente” cards, and radios / checkboxes / text by name+value or id. `keepDoc`
       drops identity-bound documents (MDocs belongs to the MPass account). */
    function foControlKey(el) {
      if (el.type === "radio") return el.name ? `r:${el.name}:${el.value}` : "";
      if (el.type === "checkbox") return el.id ? `c:#${el.id}` : el.name ? `c:${el.name}:${el.value}` : "";
      return el.id ? `t:#${el.id}` : "";
    }

    function rerenderFoStepsKeeping(steps, render, { keepDoc = () => true } = {}) {
      const carried = steps.map((step) => {
        const panel = frontOfficeRequestScreen?.querySelector(`[data-fo-step-panel='${step}']`);
        if (!panel) return null;
        const docs = new Map();
        panel.querySelectorAll("[data-fo-doc-field]").forEach((field) => {
          const items = [...(field.querySelector("[data-fo-doc-field-files]")?.children || [])].filter((node) => keepDoc(node, field.dataset.foDocField));
          if (items.length) docs.set(field.dataset.foDocField, items);
        });
        const others = [...(panel.querySelector("[data-fo-other-doc-list]")?.children || [])];
        const controls = [...panel.querySelectorAll("input:not([type='file']), textarea")]
          .filter((el) => !el.closest("[data-fo-doc-field-files], [data-fo-other-doc-list]"))
          .map((el) => ({ key: foControlKey(el), checkable: el.type === "radio" || el.type === "checkbox", checked: el.checked, value: el.value }))
          .filter((item) => item.key);
        return { panel, docs, others, controls };
      });
      render();
      carried.forEach((item) => {
        if (!item) return;
        const { panel } = item;
        item.docs.forEach((nodes, key) => {
          const field = panel.querySelector(`[data-fo-doc-field='${CSS.escape(key)}']`);
          const files = field?.querySelector("[data-fo-doc-field-files]");
          if (!files) return;
          files.replaceChildren(...nodes);
          field.classList.toggle("is-full", files.querySelectorAll(".e-permits-fo-file-item").length >= (Number(field.dataset.foDocMax) || 1));
        });
        const list = panel.querySelector("[data-fo-other-doc-list]");
        if (list && item.others.length) list.replaceChildren(...item.others);
        const byKey = new Map();
        panel.querySelectorAll("input:not([type='file']), textarea").forEach((el) => {
          const key = foControlKey(el);
          if (key && !byKey.has(key)) byKey.set(key, el);
        });
        item.controls.forEach((saved) => {
          const el = byKey.get(saved.key);
          if (!el || el.disabled) return;
          if (saved.checkable) {
            /* a radio is restored by checking the saved one; the group's change handler syncs the rest */
            if (el.checked === saved.checked || (el.type === "radio" && !saved.checked)) return;
            el.checked = saved.checked;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
          if (el.value === saved.value || el.readOnly) return;
          el.value = saved.value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
    }

    /* a visitor mid-flow needs a guest identity: the empty fields of the guest „Date solicitant”
       get the demo person (the fo-g* demo data) — for a company, the one the user was signed in
       as (`preferredIdno`); whatever the visitor typed stays */
    async function fillGuestDemoIdentity(preferredType, preferredIdno = "") {
      if (!guestForm) return;
      const allowed = guestAllowedTypes();
      const typed = ["#fo-guest-idnp", "#fo-guest-surname", "#fo-guest-firstname", "#fo-guest-idno"].some((selector) => guestValue(selector));
      if (!typed && allowed.includes(preferredType)) setGuestType(preferredType);
      else if (!allowed.includes(guestType)) setGuestType(allowed[0]);
      const demo = {
        "#fo-guest-idnp": "2004001234567",
        "#fo-guest-surname": "Popescu",
        "#fo-guest-firstname": "Ion",
        "#fo-guest-email": "ion.popescu@gmail.com",
      };
      if (guestCase() === "other") Object.assign(demo, { "#fo-guest-rep-idnp": "2990000000011", "#fo-guest-rep-surname": "Popescu", "#fo-guest-rep-firstname": "Maria" });
      Object.entries(demo).forEach(([selector, value]) => {
        const input = guestEl(selector);
        if (!input || input.value.trim()) return;
        input.value = value;
        if (input.hasAttribute("data-fo-guest-digits")) handleGuestDigits(input);
      });
      if (guestPhoneInput && !guestPhoneInput.value.trim()) guestPhoneInput.value = "60999999";
      if (guestConsent) guestConsent.checked = true;
      if (guestType === "PJ" && guestIdnoInput) {
        if (!guestIdnoInput.value.trim()) {
          guestIdnoInput.value = registryCompanies().find((company) => company.idno === preferredIdno)?.idno || registryCompanies()[0]?.idno || "";
          handleGuestDigits(guestIdnoInput);
        }
        if (guestLookup.code !== guestIdnoInput.value) guestLookup.run(guestIdnoInput.value);
        if (guestLookup.pending) await guestLookup.pending;
      }
      clearGuestErrors();
    }

    /* ---- G8 · switching to MPass keeps what was typed (this tab's session) ---- */
    function saveGuestCarry() {
      if (!guestForm) return;
      const values = {};
      guestForm.querySelectorAll("input[id]:not([readonly])").forEach((input) => {
        if (input.type === "checkbox") values[input.id] = input.checked;
        else if (input.value) values[input.id] = input.value;
      });
      try {
        window.sessionStorage.setItem(GUEST_CARRY_KEY, JSON.stringify({ type: guestType, beneficiary: guestBeneficiary(), values }));
      } catch (error) { /* private mode: nothing kept */ }
    }

    function restoreGuestCarry() {
      let carry = null;
      try {
        carry = JSON.parse(window.sessionStorage.getItem(GUEST_CARRY_KEY) || "null");
        window.sessionStorage.removeItem(GUEST_CARRY_KEY);
      } catch (error) { carry = null; }
      if (!carry || !guestForm) return;
      setGuestType(carry.type);
      const radio = guestBeneficiaryGroup?.querySelector(`input[value="${carry.beneficiary === "other" ? "other" : "self"}"]`);
      if (radio) radio.checked = true;
      Object.entries(carry.values || {}).forEach(([id, value]) => {
        const input = guestForm.querySelector(`#${CSS.escape(id)}`);
        if (!input) return;
        if (input.type === "checkbox") input.checked = Boolean(value);
        else input.value = value;
        if (input.hasAttribute("data-fo-guest-digits")) handleGuestDigits(input);
      });
      syncGuestLayout();
    }

    function leaveGuestForMpass() {
      saveGuestCarry();
      guestUnloadAllowed = true;
      openMpassTestPage();
    }

    function resetGuestScreen() {
      exitGuestWizard();
      guestLookup.cancel();
      guestForm?.reset();
      guestForm?.querySelectorAll("[data-fo-guest-counter]").forEach((counter) => { counter.textContent = "0/13"; });
      guestForm?.querySelectorAll("[data-fo-doc-field] [data-fo-doc-field-files]").forEach((files) => { files.innerHTML = ""; });
      clearGuestErrors();
      if (guestLive) guestLive.textContent = "";
      setGuestType(guestAllowedTypes()[0]);
      restoreGuestCarry();
    }

    function showFrontOfficeGuest({ focus = true, reset = true } = {}) {
      if (reset) resetGuestScreen();
      if (window.location.hash !== "#guest") history.replaceState(null, "", "#guest");
      setFrontOfficeScreen("guest", { focus });
    }

    /* G8: something typed or attached — leaving loses it */
    function guestIsActive() {
      return Boolean((guestScreen && !guestScreen.hidden) || (frontOfficeGuest && frontOfficeRequestScreen && !frontOfficeRequestScreen.hidden));
    }

    function guestHasData() {
      if (frontOfficeGuest) return true;
      return Boolean(
        [...(guestForm?.querySelectorAll("input[type='text'], input[type='tel'], input[type='email']") || [])].some((input) => !input.readOnly && input.value.trim())
        || guestForm?.querySelector(".e-permits-fo-file-item")
      );
    }

    function setGuestLeaveModalOpen(open) {
      if (!guestLeaveModal) return;
      if (open) guestLeaveReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMotionModalHidden(guestLeaveModal, !open);
      document.body.classList.toggle("is-fo-modal-open", open);
      if (open) {
        guestLeaveModal.querySelector("[data-fo-guest-leave-cancel]")?.focus({ preventScroll: true });
      } else {
        guestLeaveReturnFocus?.focus?.({ preventScroll: true });
        guestLeaveReturnFocus = null;
      }
    }

    /* the MSupport reporter while filling the guest form (anonymous until named) */
    function frontOfficeGuestActor() {
      const idnp = guestValue("#fo-guest-idnp");
      const name = [guestValue("#fo-guest-firstname"), guestValue("#fo-guest-surname")].filter(Boolean).join(" ");
      if (!name && idnp.length !== 13) return null;
      return {
        type: "citizen",
        name: name || undefined,
        idnp: idnp.length === 13 ? idnp : undefined,
        email: guestValue("#fo-guest-email") || undefined,
      };
    }

    guestForm?.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.hasAttribute("data-fo-guest-digits")) handleGuestDigits(input);
      /* the error clears on edit; „Înainte” checks again */
      if (input.getAttribute("aria-invalid") === "true" && input !== guestConsent) setGuestFieldError(input, "");
    });

    guestConsent?.addEventListener("change", () => { if (guestConsent.checked) setGuestConsentError(""); });

    guestBeneficiaryGroup?.addEventListener("change", syncGuestLayout);

    /* an attached document clears its „Câmp obligatoriu” */
    guestForm?.querySelectorAll("[data-fo-doc-field]").forEach((docField) => {
      const files = docField.querySelector("[data-fo-doc-field-files]");
      if (!files) return;
      new MutationObserver(() => {
        if (files.querySelector(".e-permits-fo-file-item, .e-permits-fo-mdocs__attachment")) setGuestDocError(docField, "");
      }).observe(files, { childList: true });
    });

    /* a boxed doc field without a file is one drop block: a click anywhere opens the upload */
    document.addEventListener("click", (event) => {
      const box = event.target.closest(".e-permits-fo-doc-field--boxed");
      if (!box || box.querySelector(".e-permits-fo-file-item") || event.target.closest("button, a, input")) return;
      box.querySelector("[data-fo-open-doc-modal]")?.click();
    });

    guestTypeGroup?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-fo-guest-type]");
      if (!button || button.classList.contains("is-selected")) return;
      setGuestType(button.dataset.foGuestType);
    });

    guestNextButton?.addEventListener("click", async () => {
      if (guestNextButton.getAttribute("aria-busy") === "true") return;
      guestNextButton.setAttribute("aria-busy", "true");
      const first = await validateGuest();
      guestNextButton.removeAttribute("aria-busy");
      if (first) {
        focusGuestError(first);
        return;
      }
      enterGuestWizard(collectGuestData());
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-guest-authenticate]")) {
        event.preventDefault();
        setGuestLeaveModalOpen(false);
        leaveGuestForMpass();
        return;
      }
      if (event.target.closest("[data-fo-guest-leave-cancel]") || event.target === guestLeaveModal) {
        setGuestLeaveModalOpen(false);
        return;
      }
      if (event.target.closest("[data-fo-guest-leave-confirm]")) {
        setGuestLeaveModalOpen(false);
        resetGuestScreen();
        history.replaceState(null, "", "#access");
        showFrontOfficeAccess();
        return;
      }
      /* G8: the logo asks first while a guest has typed something */
      const home = event.target.closest(".e-permits-fo-auth__evo-logo, .e-permits-fo-auth__gov-link");
      if (home && guestIsActive() && guestHasData()) {
        event.preventDefault();
        setGuestLeaveModalOpen(true);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && guestLeaveModal && !guestLeaveModal.hidden) setGuestLeaveModalOpen(false);
    });

    /* G8: closing the tab / the browser's back arrow — the browser's own prompt */
    window.addEventListener("beforeunload", (event) => {
      if (guestUnloadAllowed || !guestIsActive() || !guestHasData()) return;
      event.preventDefault();
      event.returnValue = "";
    });

    /* US-18 AC-03: Finalizare reached without payment → back on Plată with the reason */
    function showFrontOfficePaymentNotice() {
      frontOfficePaymentNoticeShown = true;
      const body = document.querySelector("[data-fo-payment-body]");
      if (!body || body.querySelector("[data-fo-payment-notice]")) return;
      body.insertAdjacentHTML("afterbegin", `
        <div class="message message--subtle banner--warning e-permits-fo-payment__notice" role="alert" data-fo-payment-notice>
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span>
          <div class="banner__content"><p class="banner__text"><strong>Taxa nu este achitată.</strong> Cererea se finalizează după confirmarea plății prin MPay.</p></div>
        </div>`);
    }

    /* US-18 AC-07: „Vezi documentul” → the certificate, with „Descarcă”; ?cert=unavailable = the file
       cannot be downloaded (error + „Reîncercați”) */
    const certModal = document.querySelector("#fo-certificate-modal");
    const renderCertificateModal = (downloadError = false) => {
      const step = frontOfficeLastFinishSchema?.steps?.find((item) => item.id === "finish") || {};
      const rows = Array.isArray(step.summary?.rows) ? step.summary.rows : [];
      const esc = escapeFrontOfficeHtml;
      certModal.querySelector("[data-fo-cert-body]").innerHTML = `
        ${downloadError ? `<div class="message message--subtle banner--error" role="alert"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg></span><div class="banner__content"><p class="banner__text">Fișierul nu este disponibil momentan. Încercați din nou.</p></div></div>` : ""}
        <div class="e-permits-fo-cert">
          <p class="e-permits-fo-cert__kicker">Republica Moldova · SIA GEAP</p>
          <h3 class="e-permits-fo-cert__title">Certificat constatator</h3>
          <p class="e-permits-fo-cert__lead">Confirmă depunerea cererii în sistemul informațional automatizat GEAP.</p>
          <div class="e-permits-fo-payment-summary">
            ${rows.map((row) => `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label">${esc(row.label || "")}</span><div class="e-permits-fo-summary-row__value">${esc(row.value || "")}</div></div>`).join("")}
          </div>
        </div>`;
      certModal.querySelector("[data-fo-cert-download] span").textContent = downloadError ? "Reîncercați" : "Descarcă";
    };
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-finish-document-retry]")) {
        frontOfficeCertRetried = true;
        renderFrontOfficeStep7FromSchema(frontOfficeLastFinishSchema);
        document.querySelector("[data-fo-finish-document]")?.focus();
        return;
      }
      if (event.target.closest("[data-fo-finish-document]") && certModal) {
        renderCertificateModal(false);
        window.__modal?.open?.("#fo-certificate-modal");
        return;
      }
      const dl = event.target.closest("[data-fo-cert-download]");
      if (dl && certModal) {
        const unavailable = new URLSearchParams(location.search).get("cert") === "unavailable" && !dl.dataset.retried;
        if (unavailable) { dl.dataset.retried = "1"; renderCertificateModal(true); return; }
        const html = `<!doctype html><meta charset="utf-8"><title>Certificat constatator</title>${certModal.querySelector(".e-permits-fo-cert").outerHTML}`;
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([html], { type: "text/html" })), download: "Certificat-constatator.html" });
        a.click(); URL.revokeObjectURL(a.href);
        renderCertificateModal(false);
      }
    });

    /* "Plătește … cu mpay": there is no MPay sandbox in this prototype (unlike
       MPass, which has mpass-test.html), so the round-trip is simulated with a
       short processing state on the button, then the flow lands on
       Finalizare. The button stays in place so the step doesn't jump. */
    const FINISH_PAYMENT_DELAY_MS = 1200;
    document.addEventListener("click", (event) => {
      const payButton = event.target.closest("[data-fo-payment-pay]");
      if (!payButton || payButton.getAttribute("aria-busy") === "true") return;
      event.preventDefault();
      const label = payButton.querySelector(".btn-badge__label");
      const originalLabel = label?.textContent || "";
      payButton.setAttribute("aria-busy", "true");
      payButton.disabled = true;
      if (label) label.textContent = "Se procesează plata…";
      window.setTimeout(() => {
        payButton.removeAttribute("aria-busy");
        payButton.disabled = false;
        if (label) label.textContent = originalLabel;
        frontOfficePaid = true;
        navigateToFrontOfficeStep(7);
      }, FINISH_PAYMENT_DELAY_MS);
    });

    /* ===================================================================
       "Ce vrei să soliciți?" (US-191) — between identity and request.
       Two exits: a new request (always available, straight into step 1) or
       a post-process on an act already issued to this identity for this
       service. An act is listed only if at least one post-process is
       available for it, where available = availability[act.status] ∩
       serviceAllows (the service passport). Routine post-processes hand
       off directly; consequential ones confirm first, with the consequence
       spelled out. The post-process flow itself is out of scope here, so
       the hand-off ends in a toast rather than a new screen.
       Not shown for the guest flow (it never passes through the picker) or
       the notarial-proxy path. All copy and rules live in schema.intent. */
    const frontOfficePostprocessModal = document.querySelector("[data-fo-postprocess-modal]");
    let frontOfficePendingPostprocess = null;

    function frontOfficeIntentConfig() {
      return frontOfficeSchema?.intent || null;
    }

    /* US-191: after identification the intermediate screen is always shown
       (it cannot be skipped) — with the identity's acts that still have a
       post-process, or "Dumneavoastră nu aveți acte emise pentru serviciul
       dat." when there are none; "Solicitare nouă" is there in both cases.
       The notarial-proxy path has no acts of its own and goes straight on. */
    function frontOfficeShouldShowIntent(subject) {
      return Boolean(
        frontOfficeIntentConfig()
        && subject
        && subject.scenario !== "notarial-proxy"
      );
    }

    /* set while the test panel re-applies the schema, so the identity-switch
       hook below doesn't navigate on its own mid-apply */
    let frontOfficeIntentApplying = false;

    /* Feature 89533 / US-55: a post-process is offered when the act's status
       allows it (availability) AND the service passport (RSSPA) has it
       configured (services[code].allows). Paper / historical acts have no
       digital post-process; an act with one already in progress is blocked
       (one active post-process per act). */
    function intentServiceCode(config = frontOfficeIntentConfig()) {
      return frontOfficeSchema?.service?.code || Object.keys(config?.services || {})[0] || "";
    }

    function availablePostprocesses(act, config = frontOfficeIntentConfig()) {
      if (!config || act.paper) return [];
      const byStatus = config.availability?.[act.status] || [];
      const allowed = config.services?.[act.service]?.allows || config.serviceAllows || [];
      return byStatus
        .filter((id) => allowed.includes(id) && config.postProcesses?.[id])
        .map((id) => ({ id, ...config.postProcesses[id] }));
    }

    function intentAllActs(subject, config = frontOfficeIntentConfig()) {
      return (config?.acts?.[subject?.id] || [])
        .map((act) => ({ ...act, postProcesses: availablePostprocesses(act, config) }));
    }

    /* "Ce vrei să soliciți?" lists this service's acts with at least one
       available post-process (US-191 AC-02); an act with one in progress
       stays listed but locked, so the citizen sees why it can't be used. */
    function intentActs(subject, config = frontOfficeIntentConfig()) {
      const code = intentServiceCode(config);
      return intentAllActs(subject, config)
        .filter((act) => !act.service || act.service === code)
        .filter((act) => act.postProcesses.length > 0);
    }

    const INTENT_TAG_TONE = { valabil: "status-tag--success", suspendat: "status-tag--accent" };

    function intentActHtml(act, index) {
      const esc = escapeFrontOfficeHtml;
      const menuId = `fo-intent-menu-${index}`;
      const tone = INTENT_TAG_TONE[act.status] || "status-tag--neutral";
      const pending = act.pending;
      const pendingLabel = pending ? (frontOfficeIntentConfig()?.postProcesses?.[pending.type]?.label || pending.type) : "";
      return `
        <li class="e-permits-fo-intent-act${pending ? " is-locked" : ""}" data-fo-intent-act="${esc(act.id)}">
          <span class="e-permits-fo-auth__role-avatar e-permits-fo-intent-act__avatar" aria-hidden="true">
            <svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-document"></use></svg>
          </span>
          <div class="e-permits-fo-intent-act__copy">
            <div class="e-permits-fo-intent-act__heading">
              <span class="e-permits-fo-intent-act__name">${esc(act.name)}</span>
              <span class="status-tag ${tone} is-subtle e-permits-fo-intent-act__tag">${esc(act.statusLabel || act.status)}</span>
            </div>
            <div class="e-permits-fo-intent-act__meta">
              <span class="e-permits-fo-intent-act__number">${esc(act.number)}</span>
              <span class="e-permits-fo-intent-act__dot" aria-hidden="true"></span>
              <span>valabil până la ${esc(act.validUntil)}</span>
            </div>
            ${pending ? `<p class="e-permits-fo-intent-act__pending"><svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-time"></use></svg><span>${esc(pendingLabel)} în curs · dosar ${esc(act.pending.dossier)}. Poți iniția un alt postproces după finalizarea acestuia.</span></p>` : ""}
          </div>
          <div class="e-permits-fo-intent-act__action">
            <button class="btn btn-neutral btn-pill e-permits-fo-intent-act__trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-fo-intent-trigger ${pending ? "disabled" : ""}>
              <span>${esc(frontOfficeIntentConfig()?.actionLabel || "Inițiază un postproces")}</span>
              <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-intent-menu" id="${menuId}" role="menu" aria-label="Postprocese pentru ${esc(act.name)}" hidden>
              ${act.postProcesses.map((pp) => `
                <li role="none">
                  <button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-fo-intent-postprocess="${esc(pp.id)}">
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#${esc(pp.icon || "icon-edit")}"></use></svg>
                    <span>${esc(pp.label)}</span>
                  </button>
                </li>
              `).join("")}
            </ul>
          </div>
        </li>
      `;
    }

    function renderFrontOfficeIntent() {
      const body = frontOfficeIntentScreen?.querySelector("[data-fo-intent-body]");
      const config = frontOfficeIntentConfig();
      const subject = frontOfficeSelectedSubject;
      if (!body || !config || !subject) return;
      const esc = escapeFrontOfficeHtml;
      const acts = intentActs(subject, config);

      body.innerHTML = `
        <header class="e-permits-fo-intent__header">
          <h1 id="fo-intent-title" tabindex="-1">${esc(config.title)}</h1>
          <p class="e-permits-fo-intent__subject">
            <span class="e-permits-fo-intent__subject-label">${esc(config.subjectLabel || "Solicitant")}</span>
            <span class="e-permits-fo-intent__subject-name">${esc(subject.name)}</span>
            <button class="e-permits-fo-selected-role__change e-permits-fo-intent__change" type="button" data-fo-back-choice>
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-reorder"></use></svg>
              <span>Schimbă</span>
            </button>
          </p>
        </header>

        <button class="e-permits-fo-intent-new" type="button" data-fo-intent-new>
          <span class="e-permits-fo-intent-new__avatar" aria-hidden="true">
            <svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-plus-small"></use></svg>
          </span>
          <span class="e-permits-fo-intent-new__copy">
            <span class="e-permits-fo-intent-new__title">${esc(config.newRequest?.title || "Solicitare nouă")}</span>
            <span class="e-permits-fo-intent-new__text">${esc(config.newRequest?.text || "")}</span>
          </span>
          <svg class="icon e-permits-fo-intent-new__arrow" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg>
        </button>

        <div class="e-permits-fo-intent__separator" role="separator"><span>${esc(config.separator || "sau")}</span></div>

        <section class="e-permits-fo-intent__acts" aria-labelledby="fo-intent-acts-title">
          <p class="e-permits-fo-intent__acts-title" id="fo-intent-acts-title">${esc(config.actsTitle)}</p>
          ${acts.length
            ? `<ul class="e-permits-fo-intent__list">${acts.map(intentActHtml).join("")}</ul>`
            : `<div data-fo-intent-empty>${window.GEAPEmptyState.render({ title: String(config.emptyText || "Dumneavoastră nu aveți acte emise pentru serviciul dat.").replace(/\.$/, ""), text: "Un act apare aici după ce este emis. Pentru un act nou, alegeți „Solicitare nouă”.", icon: "page-text" })}</div>`}
        </section>
      `;
    }

    function showFrontOfficeIntent({ focus = true } = {}) {
      if (!frontOfficeIntentScreen) return;
      renderFrontOfficeIntent();
      if (window.location.hash !== "#intent") history.replaceState(null, "", "#intent");
      setFrontOfficeScreen("intent", { focus });
    }

    function closeFrontOfficeIntentMenus(except = null) {
      frontOfficeIntentScreen?.querySelectorAll("[data-fo-intent-trigger]").forEach((trigger) => {
        const menu = document.getElementById(trigger.getAttribute("aria-controls"));
        if (!menu || menu === except) return;
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      });
    }

    function handOffPostprocess(act, pp) {
      startFrontOfficePostprocess(act, pp);
    }

    /* ===================================================================
       Post-process mode — Feature 89533 Part I (titular): US-55 generic
       initiation + the per-type stories (US-59 reperfectare 09, US-62
       reperfectare 10, US-63 prelungire 10, US-61 duplicat 10, US-58/60
       retragere). The primary request wizard is reused step by step:
       - Date solicitant: a read-only "Detalii solicitare" card (service,
         request type, act number) above the pre-filled applicant; contact
         details stay editable.
       - Detalii solicitare: the form of the chosen type, pre-filled from the
         act (reperfectare repeats the primary form + the reason).
       - Documente însoțitoare: the previous act as a download, plus what the
         type needs.
       - Verificare și semnare: MSign is mandatory for the titular.
       - Livrare: read-only — the passport sets one method.
       - Plată: skipped when the post-process has no fee (09/10: none).
       - Finalizare: request type, service, term (CC + N working days).
       Suspendare / Reluare have no US yet: their fields are placeholders
       („de confirmat”) and run on the DEMO service.
       =================================================================== */
    let frontOfficePostprocess = null;

    function postprocessConfig() { return frontOfficeIntentConfig() || {}; }
    function postprocessService(act) { return postprocessConfig().services?.[act?.service] || {}; }
    function postprocessHasFee(ctx = frontOfficePostprocess) { return Boolean(ctx?.service?.fees?.[ctx.pp.id]); }

    function findPostprocessAct(actId) {
      const acts = postprocessConfig().acts || {};
      for (const [subjectId, list] of Object.entries(acts)) {
        const act = (list || []).find((item) => item.id === actId);
        if (act) return { act, subjectId };
      }
      return null;
    }

    function postprocessReadonly(label, value, span = 12) {
      return readonlyFieldHtml({ label, value: value || "—", span });
    }

    function postprocessNoteHtml(text, { icon = "icon-circle-info-filled", attrs = "" } = {}) {
      return `
        <div class="e-permits-fo-infobox e-permits-fo-pp-note" role="note" ${attrs}>
          <div class="e-permits-fo-infobox__bone" aria-hidden="true"></div>
          <div class="e-permits-fo-infobox__icon" aria-hidden="true"><svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#${icon}"></use></svg></div>
          <div class="e-permits-fo-infobox__body"><p>${escapeFrontOfficeHtml(text)}</p></div>
        </div>`;
    }

    function postprocessTextareaHtml({ id, label, required = true, maxLength = 250, hidden = false, attrs = "", placeholder = "" }) {
      const fid = fieldId(id);
      return `
        <div class="${fieldClass({ span: 12 })}" ${hidden ? "hidden" : ""} ${attrs}>
          <div class="e-permits-fo-field__label-counter">${labelHtml(fid, { label, required })}<span class="e-permits-fo-field__counter" data-fo-char-counter data-fo-char-max="${maxLength}" hidden>0 / ${maxLength}</span></div>
          <div class="e-permits-fo-textarea"><textarea id="${escapeFrontOfficeHtml(fid)}" rows="3" maxlength="${maxLength}" placeholder="${escapeFrontOfficeHtml(placeholder)}" data-fo-char-input data-fo-pp-required="${required ? "true" : "false"}"></textarea></div>
        </div>`;
    }

    function postprocessDateHtml({ id, label, required = true, span = 6, hint = "" }) {
      const fid = fieldId(id);
      return `
        <div class="${fieldClass({ span })}">
          ${labelHtml(fid, { label, required })}
          <div class="e-permits-fo-input"><input id="${escapeFrontOfficeHtml(fid)}" type="date" data-fo-pp-required="${required ? "true" : "false"}"></div>
          ${hint ? `<p class="e-permits-fo-field__hint">${escapeFrontOfficeHtml(hint)}</p>` : ""}
        </div>`;
    }

    function postprocessSelectHtml(field) {
      return selectFieldHtml({ span: 12, placeholder: "Selectează", ...field }).replace("data-fo-select", `data-fo-select data-fo-pp-select="${escapeFrontOfficeHtml(field.id)}"${field.required === false ? "" : " data-fo-pp-required=\"true\""}`);
    }

    function postprocessSectionHtml(id, title, body, { desc = "" } = {}) {
      return `
        <section class="e-permits-fo-form__section" aria-labelledby="fo-pp-${id}-title" data-fo-pp-section="${id}">
          <div class="e-permits-fo-section-header">
            <h2 id="fo-pp-${id}-title">${escapeFrontOfficeHtml(title)}</h2>
            ${desc ? `<p class="e-permits-fo-section-header__desc">${escapeFrontOfficeHtml(desc)}</p>` : ""}
          </div>
          <div class="e-permits-fo-form__section-body">${body}</div>
        </section>`;
    }

    /* a reason picked from the classifier; "Alte" opens the 250-char text */
    function postprocessReasonHtml(sectionTitle, reasons, { label = "Motivul", sectionId = "reason" } = {}) {
      return postprocessSectionHtml(sectionId, sectionTitle, `
        ${postprocessSelectHtml({ id: "pp-reason", label, required: true, options: reasons })}
        ${postprocessTextareaHtml({ id: "pp-reason-other", label: "Specificați motivul", hidden: true, attrs: "data-fo-pp-other", placeholder: "Descrieți pe scurt motivul" })}
      `);
    }

    function postprocessFooterHtml(step) {
      return `
        <footer class="e-permits-fo-form__footer e-permits-fo-form__footer--actions-only">
          <div class="e-permits-fo-form__actions e-permits-fo-form__actions--with-draft">
            <button class="e-permits-fo-draft-button" type="button">
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use></svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary">
              ${step > 2 ? `<button class="e-permits-fo-back-button" type="button" aria-label="Înapoi" data-fo-prev="step-${step}"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>` : ""}
              <button class="e-permits-fo-next" type="button" data-fo-next="step-${step}"><span>Înainte</span><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>
            </div>
          </div>
        </footer>`;
    }

    /* reperfectare 09 repeats the primary form (US-59: "deține toate câmpurile
       similar unei solicitări de emitere primară"), section for section */
    function postprocessPrimarySectionsHtml() {
      const step = frontOfficeSchema?.steps?.find((item) => Number(item.index) === 2);
      return (step?.sections || []).map((section) => `
        <section class="e-permits-fo-form__section" aria-labelledby="fo-pp-${escapeFrontOfficeHtml(section.id)}-title" data-fo-pp-section="${escapeFrontOfficeHtml(section.id)}">
          <div class="e-permits-fo-section-header${section.noBorder ? " e-permits-fo-section-header--no-border" : ""}">
            <h2 id="fo-pp-${escapeFrontOfficeHtml(section.id)}-title">${escapeFrontOfficeHtml(section.title || "Obiectul autorizat")}</h2>
            ${section.secDesc ? `<p class="e-permits-fo-section-header__desc">${escapeFrontOfficeHtml(section.secDesc)}</p>` : ""}
          </div>
          <div class="e-permits-fo-form__section-body${section.layout === "single" ? " e-permits-fo-form__section-body--single" : ""}">
            ${(section.fields || []).map(stepFieldHtml).join("")}
          </div>
        </section>`).join("");
    }

    function postprocessStep2BodyHtml(ctx) {
      const { act, pp, service } = ctx;
      const reasons = postprocessConfig().reasons || {};
      const code = service.code || act.service;
      if (pp.id === "reperfectare" && code === "09") {
        return `${postprocessReasonHtml("Motivul reperfectării", reasons["reperfectare-09"] || [], { label: "Comentarii / Motivul" })}${postprocessPrimarySectionsHtml()}`;
      }
      if (pp.id === "reperfectare") {
        const cascade = frontOfficeSchema?.steps?.find((item) => Number(item.index) === 2)?.sections?.find((s) => s.id === "economic-address")?.fields?.[0];
        const types = postprocessConfig().activityTypes10 || [];
        return `
          ${cascade ? postprocessSectionHtml("activity-address", "Adresa desfășurării activității", cascadeAddressHtml({ ...cascade, phone: null, email: null })) : ""}
          ${postprocessSectionHtml("activity-type", "Tipul activității", `
            ${postprocessSelectHtml({ id: "pp-activity-type", label: "Tipul activității", required: true, options: types, value: act.activityType || "" })}
            <div class="${fieldClass({ span: 6 })}" data-fo-pp-hemp hidden>${labelHtml("fo-pp-area", { label: "Suprafața totală a terenului conform titlului de folosire a terenului", required: true })}<div class="e-permits-fo-input"><input id="fo-pp-area" type="text" inputmode="decimal" placeholder="0,00"></div></div>
            <div data-fo-pp-hemp hidden class="${fieldClass({ span: 6 })}">${selectFieldHtml({ id: "pp-area-unit", label: "Unitatea de măsură", required: true, span: 12, options: ["Hectare (ha)", "Ari (a)"], placeholder: "Selectează" })}</div>
          `)}
          ${postprocessSectionHtml("responsible", "Persoana responsabilă", `
            <div class="${fieldClass({ span: 12 })}">
              <label class="checkbox checkbox--medium e-permits-fo-consent e-permits-fo-pp-consent"><input class="checkbox-input" type="checkbox" data-fo-pp-consent><span class="checkbox-custom" aria-hidden="true"></span><span>Declar pe proprie răspundere că dețin consimțământul sau temeiul legal pentru introducerea IDNP-ului și preluarea datelor prin platforma de interoperabilitate.</span></label>
            </div>
            <div class="${fieldClass({ span: 4 })}">${labelHtml("fo-pp-resp-idnp", { label: "IDNP persoanei", required: true })}<div class="e-permits-fo-input is-disabled"><input id="fo-pp-resp-idnp" type="text" inputmode="numeric" maxlength="13" placeholder="13 cifre" disabled data-fo-pp-idnp></div></div>
            ${textFieldHtml({ id: "pp-resp-last", label: "Nume", span: 4, disabled: true, placeholder: "Din MConnect, după IDNP" })}
            ${textFieldHtml({ id: "pp-resp-first", label: "Prenume", span: 4, disabled: true, placeholder: "Din MConnect, după IDNP" })}
          `)}
          ${postprocessReasonHtml("Scopul reperfectării", reasons["reperfectare-10"] || [], { label: "Scopul reperfectării", sectionId: "purpose" })}
        `;
      }
      if (pp.id === "prelungire") {
        return postprocessSectionHtml("act-data", "Date act permisiv", `
          ${postprocessReadonly("Numărul actului permisiv", act.number, 12)}
          ${postprocessReadonly("Valabil de la", act.validFrom || act.issued, 6)}
          ${postprocessReadonly("Valabil până la", act.validUntil, 6)}
        `, { desc: "Datele actului care se prelungește. Noua perioadă de valabilitate se stabilește la aprobare." });
      }
      if (pp.id === "duplicat") {
        return postprocessSectionHtml("reason", "Motivul emiterii duplicatului", postprocessSelectHtml({ id: "pp-reason", label: "Motivul", required: true, options: reasons.duplicat || [] }));
      }
      if (pp.id === "retragere") {
        return `${code === "09" ? postprocessSectionHtml("subdivision", "Subdiviziunea de procesare", postprocessReadonly("Subdiviziunea de procesare", act.subdivision, 12), { desc: "Subdiviziunea care a emis actul." }) : ""}
          ${postprocessReasonHtml("Motivul retragerii", reasons.retragere || [])}`;
      }
      if (pp.id === "suspendare") {
        return `${postprocessReasonHtml("Motivul suspendării", reasons.suspendare || [])}
          ${postprocessSectionHtml("period", "Perioada suspendării", `
            ${postprocessDateHtml({ id: "pp-suspend-from", label: "Data necesară de suspendare", span: 6 })}
            <div class="${fieldClass({ span: 6 })}">${selectFieldHtml({ id: "pp-suspend-term", label: "Termenul necesar de suspendare", required: true, span: 12, options: ["1 lună", "3 luni", "6 luni", "12 luni"], placeholder: "Selectează" }).replace("data-fo-select", "data-fo-select data-fo-pp-required=\"true\"")}</div>
          `)}
          ${postprocessNoteHtml("Suspendarea valabilității actului permisiv se va iniția din data semnării deciziei de aprobare.")}`;
      }
      if (pp.id === "reluare") {
        return `${postprocessReasonHtml("Motivul reluării valabilității", reasons.reluare || [])}
          ${postprocessNoteHtml("Valabilitatea actului permisiv se va relua din data semnării deciziei de aprobare.")}`;
      }
      return "";
    }

    function renderPostprocessStep1(ctx = frontOfficePostprocess) {
      const panel = document.querySelector("[data-fo-step-panel='1']");
      if (!panel || !ctx) return;
      panel.querySelector("[data-fo-pp-request]")?.remove();
      const header = panel.querySelector(":scope > .e-permits-fo-form__header");
      const card = document.createElement("section");
      card.className = "e-permits-fo-form__section e-permits-fo-pp-request";
      card.dataset.foPpRequest = "";
      card.setAttribute("aria-labelledby", "fo-pp-request-title");
      card.innerHTML = `
        <h2 id="fo-pp-request-title">Detalii solicitare</h2>
        <div class="e-permits-fo-form__section-body">
          ${postprocessReadonly("Serviciul", ctx.service.title || ctx.act.service, 12)}
          ${postprocessReadonly("Tip solicitare", ctx.pp.requestType || ctx.pp.label, 6)}
          ${postprocessReadonly("Numărul actului permisiv", ctx.act.number, 6)}
        </div>`;
      header?.insertAdjacentElement("afterend", card);
    }

    function renderPostprocessStep2(ctx = frontOfficePostprocess) {
      const panel = document.querySelector("[data-fo-step-panel='2']");
      if (!panel || !ctx) return;
      panel.innerHTML = `
        <header class="e-permits-fo-form__header"><h1 id="fo-request-step-2-title" tabindex="-1">Detalii solicitare</h1></header>
        <p class="e-permits-fo-pp-lead">${escapeFrontOfficeHtml(ctx.pp.requestType || ctx.pp.label)} · ${escapeFrontOfficeHtml(ctx.act.number)} · ${escapeFrontOfficeHtml(ctx.act.name)}</p>
        ${postprocessStep2BodyHtml(ctx)}
        ${postprocessFooterHtml(2)}`;
      initFrontOfficeDynamicControls(panel);
      prefillPostprocessStep2(ctx);
    }

    function prefillPostprocessStep2({ act, pp }) {
      const panel = document.querySelector("[data-fo-step-panel='2']");
      if (!panel || pp.id !== "reperfectare") return;
      const o = act.object;
      const objectName = panel.querySelector("#fo-object-name");
      if (objectName && o?.name) objectName.value = o.name;
      const phone = panel.querySelector("#fo-unit-phone, #unit-phone");
      if (phone && o?.phone) phone.value = o.phone;
      const email = panel.querySelector("#fo-unit-email, #unit-email");
      if (email && o?.email) email.value = o.email;
      const searchRoot = panel.querySelector("[data-fo-cascade-address] [data-fo-address-search]");
      const address = o
        ? { district: o.raion, locality: o.localitate, sector: o.sector, street: o.strada, house: o.house }
        : { district: "Municipiul Chișinău", locality: "Chișinău", sector: "Centru", street: "str. Armenească", house: "17" };
      searchRoot?.foCascadeAddressFill?.(address);
      if (o?.caem) {
        const option = [...panel.querySelectorAll(".e-permits-fo-caem__option")].find((opt) => (opt.dataset.code || "").includes(o.caem));
        option?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      }
      if (act.activityType) togglePostprocessHemp(panel, act.activityType);
    }

    function togglePostprocessHemp(panel, value) {
      const isHemp = /cânepii/i.test(value || "");
      panel.querySelectorAll("[data-fo-pp-hemp]").forEach((el) => { el.hidden = !isHemp; });
    }

    function postprocessDocFieldHtml({ id, label, description = "", required = true, filesHtml = "", addable = true }) {
      const req = required
        ? requiredMarkerHtml()
        : `<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>`;
      return `
        <div class="e-permits-fo-doc-field" data-fo-doc-field="${escapeFrontOfficeHtml(id)}">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">${escapeFrontOfficeHtml(label)} ${req}</span>
              ${description ? `<p class="e-permits-fo-doc-field__desc">${escapeFrontOfficeHtml(description)}</p>` : ""}
            </div>
            ${addable ? `<button class="e-permits-fo-doc-field__add" type="button" data-fo-open-doc-modal data-fo-doc-label="${escapeFrontOfficeHtml(label)}"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>Adaugă fișier</button>` : ""}
          </div>
          <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files>${filesHtml}</div>
        </div>`;
    }

    /* S5 Documente însoțitoare: the previous act comes from MDocs as a
       download (the citizen doesn't upload it); reperfectare adds the
       documents confirming the change; suspendare / reluare accept optional
       ones (placeholder, de confirmat) */
    /* the act a post-process starts from, in the shared document shape (taken from MDocs) */
    function postprocessPrevActDoc({ act, service }) {
      return { sursa: "mdocs", tip: "Actul permisiv emis anterior", nr: act.number, fisier: `${act.number}.pdf`, verb: "Emis", at: foDocLongDate(act.issued || ""), de: service.authority || "", semnat: true };
    }

    function renderPostprocessStep3(ctx = frontOfficePostprocess) {
      const panel = document.querySelector("[data-fo-step-panel='3']");
      if (!panel || !ctx) return;
      const { act, pp, service } = ctx;
      const esc = escapeFrontOfficeHtml;
      /* the previous act = the shared FO document card (MDocs, blue icon) + Descarcă */
      const prevActDoc = postprocessPrevActDoc(ctx);
      const prevAct = `
        <div class="e-permits-fo-mdocs__attachment" data-fo-pp-prev-act data-fo-doc="${esc(JSON.stringify(prevActDoc))}">
          ${foDocIconHtml(prevActDoc)}
          ${foDocContentHtml(prevActDoc)}
          <a class="btn btn-neutral btn-sm" href="#" download data-fo-pp-download><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-download"></use></svg><span>Descarcă</span></a>
        </div>`;
      const extra = {
        reperfectare: { id: "pp-change-docs", label: "Documentele care confirmă modificările intervenite", description: "Documentele sau copiile acestora, cu prezentarea ulterioară a originalelor pentru verificare.", required: true },
        suspendare: { id: "pp-suspend-docs", label: "Documente care justifică suspendarea", description: "", required: false },
        reluare: { id: "pp-resume-docs", label: "Documente care confirmă înlăturarea cauzelor suspendării", description: "", required: false }
      }[pp.id];
      panel.innerHTML = `
        <header class="e-permits-fo-form__header"><h1 id="fo-request-step-3-title" tabindex="-1">Documente însoțitoare</h1></header>
        <section class="e-permits-fo-documents" aria-label="Documente însoțitoare" data-fo-step3-documents>
          ${postprocessDocFieldHtml({ id: "pp-previous-act", label: "Actul permisiv emis anterior", description: "Atașat automat din MDocs — nu trebuie încărcat.", required: true, addable: false, filesHtml: prevAct })}
          ${extra ? `<hr class="e-permits-fo-documents__separator">${postprocessDocFieldHtml(extra)}` : ""}
        </section>
        ${pp.id === "duplicat" ? postprocessNoteHtml("Pentru motivul „Deteriorare” originalul actului deteriorat se prezintă la ridicarea duplicatului.") : ""}
        ${postprocessFooterHtml(3)}`;
    }

    function renderPostprocessStep5(ctx = frontOfficePostprocess) {
      const panel = document.querySelector("[data-fo-step-panel='5']");
      if (!panel || !ctx) return;
      const methods = ctx.service.delivery || ["Livrare electronică (EVO Cabinet)"];
      panel.innerHTML = `
        <header class="e-permits-fo-form__header"><h1 id="fo-request-step-5-title" tabindex="-1">Livrare</h1></header>
        ${postprocessSectionHtml("delivery", "Cum primești rezultatul?", methods.map((m) => postprocessReadonly("Metoda de livrare", m, 12)).join(""), { desc: "Metoda de livrare este stabilită în pașaportul serviciului și nu poate fi modificată." })}
        ${postprocessFooterHtml(5)}`;
    }

    function postprocessResultText({ act, pp }) {
      if (pp.newAct) return `La aprobare se emite un act permisiv nou; actul ${act.number} devine inactiv.`;
      if (pp.id === "suspendare") return "La aprobare, actul devine „Suspendat” din data semnării deciziei.";
      if (pp.id === "reluare") return "La aprobare, actul redevine „Valabil” din data semnării deciziei.";
      if (pp.id === "retragere") return "La aprobare, actul devine „Retras” și nu mai poate fi post-procesat.";
      return "";
    }

    function renderPostprocessStep7(ctx = frontOfficePostprocess) {
      if (!ctx) return;
      const base = frontOfficeSchema?.steps?.find((item) => item.id === "finish") || {};
      const { act, pp, service } = ctx;
      const days = service.terms?.[pp.id];
      const dossier = `GEAP-2026-${String(service.code || "00").padStart(3, "0")}-${act.number.replace(/\D/g, "").slice(-5).padStart(5, "0")}`;
      const finish = {
        ...base,
        title: "Cererea a fost depusă cu succes",
        tracker: [
          { label: "Depusă", state: "done" },
          ...(postprocessHasFee(ctx) ? [{ label: "Plată", state: "done" }] : []),
          { label: "Examinare", state: "current" },
          { label: "Decizie", state: "todo" },
          { label: pp.newAct ? "Act nou emis" : "Statut actualizat", state: "todo" }
        ],
        summary: { rows: [
          { label: "Tip solicitare", value: pp.requestType || pp.label },
          { label: "Serviciul", value: service.title || "" },
          { label: "Numărul actului permisiv", value: act.number },
          { label: "Numărul dosarului", value: dossier, copy: true },
          { label: "Autoritatea", value: [service.authority, act.subdivision].filter(Boolean).join(" / ") },
          { label: "Termenul de examinare", value: days ? `${days} ${days === 1 ? "zi lucrătoare" : "zile lucrătoare"} de la eliberarea Certificatului Constatator` : "conform pașaportului serviciului" }
        ] },
        timeline: { ...(base.timeline || {}), title: "Statutul dosarului", items: [
          { title: "Cerere depusă", text: "Semnată prin MSign și transmisă autorității", state: "done" },
          { title: "Dosar în examinare", text: days ? `Termen: ${days} ${days === 1 ? "zi lucrătoare" : "zile lucrătoare"}` : "Autoritatea examinează cererea", state: "current", tag: "Acum" },
          { title: "Decizie", text: postprocessResultText(ctx), state: "todo" }
        ] }
      };
      renderFrontOfficeStep7FromSchema({ steps: [finish] });
    }

    function renderPostprocessReview() {
      const ctx = frontOfficePostprocess;
      const panel = document.querySelector("[data-fo-step-panel='4']");
      const container = panel?.querySelector("[data-fo-review-sections]");
      if (!ctx || !container) return;
      panel.querySelector(".e-permits-fo-infobox")?.remove();
      const subject = frontOfficeSelectedSubject;
      const user = frontOfficeSchema?.authenticatedUser;
      const step2 = document.querySelector("[data-fo-step-panel='2']");
      const esc = escapeFrontOfficeHtml;
      let applicantRows = "";
      if (subject) {
        applicantRows += summaryRow("Solicitant", [esc(subject.name), esc(`${subject.idLabel} ${subject.idValue}`)]);
        const rep = subject.representative || (subject.type === "PJ" ? user : null);
        if (rep) applicantRows += summaryRow("Reprezentant", [esc(rep.name), esc(`${rep.idLabel} ${rep.idValue}`)]);
        const contact = subject.contact || user?.contact || {};
        applicantRows += summaryRow("Date de contact pentru notificări", [esc(contact.phone || "—"), esc(contact.email || "—")]);
      }
      const requestRows = [
        summaryRow("Serviciul", [esc(ctx.service.title || "")]),
        summaryRow("Tip solicitare", [esc(ctx.pp.requestType || ctx.pp.label)]),
        summaryRow("Numărul actului permisiv", [esc(ctx.act.number)])
      ].join("");
      const visibleIn = (el, root) => { for (let n = el; n && n !== root; n = n.parentElement) if (n.hidden) return false; return true; };
      const fieldValue = (field) => {
        const v = field.querySelector("[data-fo-caem-value], [data-fo-subgen-value], [data-fo-select-value]")?.textContent?.trim()
          || field.querySelector("input:not([type=checkbox]):not([type=file]):not([type=search]), textarea")?.value?.trim()
          || field.querySelector(".e-permits-fo-input__value")?.textContent?.trim() || "";
        return /^(Selectează|Alege|Selectează cod CAEM)/.test(v) ? "" : v;
      };
      const detailRows = [...(step2?.querySelectorAll("[data-fo-pp-section]") || [])].map((section) => {
        let rows = "";
        const cascade = section.querySelector("[data-fo-cascade-address]");
        if (cascade) {
          const part = (sel) => cascade.querySelector(`${sel} [data-fo-select-value]`)?.textContent?.trim() || "";
          const house = cascade.querySelector("[data-fo-address-part='house']")?.value?.trim() || "";
          const street = part("[data-fo-cascade-strada]");
          const address = [street && house ? `${street} ${house}` : street, part("[data-fo-cascade-localitate]"), part("[data-fo-cascade-raion]")].filter(Boolean).join(", ");
          rows += summaryRow("Adresa", [esc(address || "—")]);
        }
        [...section.querySelectorAll(".e-permits-fo-field")].forEach((field) => {
          if (!visibleIn(field, section) || (cascade && cascade.contains(field) && !field.querySelector("input[type=tel], input[type=email]"))) return;
          const label = field.querySelector("label")?.textContent?.replace(/\s+/g, " ").trim();
          if (!label || /^Caută adresa/.test(label)) return;
          const value = fieldValue(field);
          const required = Boolean(field.querySelector("label .e-permits-fo-required"));
          if (!value && !required) return;
          rows += summaryRow(label, [esc(value || "—")]);
        });
        const contact = section.querySelector("[data-fo-contact-person] input:checked");
        if (contact) rows += summaryRow("Persoana de contact", [esc(contact.value === "other" ? "Altă persoană" : "Eu sunt persoana de contact")]);
        return rows;
      }).join("");
      container.innerHTML = `
        <div class="e-permits-fo-summary-section e-permits-fo-summary-section--applicant">
          <div class="e-permits-fo-summary-section__header"><h2 class="e-permits-fo-summary-section__heading">Date solicitant</h2></div>
          <div class="e-permits-fo-summary-card">${applicantRows}</div>
        </div>
        <div class="e-permits-fo-summary-section">
          <div class="e-permits-fo-summary-section__header"><h2 class="e-permits-fo-summary-section__heading">Detalii solicitare</h2>${summaryEditButton(2, "Editează detaliile solicitării")}</div>
          <div class="e-permits-fo-summary-card">${requestRows}${detailRows}</div>
        </div>
        <div class="e-permits-fo-summary-section">
          <div class="e-permits-fo-summary-section__header"><h2 class="e-permits-fo-summary-section__heading">Documente însoțitoare</h2>${summaryEditButton(3, "Editează documentele însoțitoare")}</div>
          <div class="e-permits-fo-summary-docs">${foSummaryDocsHtml(document.querySelector("[data-fo-step-panel='3']"))}</div>
        </div>`;
    }

    /* required fields of the post-process form; errors use the FO inline error */
    function validatePostprocessStep2() {
      const panel = document.querySelector("[data-fo-step-panel='2']");
      if (!panel) return true;
      panel.querySelectorAll("[data-fo-pp-error]").forEach((el) => el.remove());
      panel.querySelectorAll(".is-error").forEach((el) => el.classList.remove("is-error"));
      let firstInvalid = null;
      panel.querySelectorAll("[data-fo-pp-required='true']").forEach((control) => {
        const field = control.closest(".e-permits-fo-field");
        if (!field || field.hidden || field.closest("[hidden]")) return;
        const isSelect = control.matches("[data-fo-select]");
        const empty = isSelect
          ? control.querySelector("[data-fo-select-value]")?.classList.contains("e-permits-fo-select__value--placeholder")
          : !String(control.value || "").trim();
        if (!empty) return;
        (isSelect ? control : control.closest(".e-permits-fo-input, .e-permits-fo-textarea"))?.classList.add("is-error");
        field.insertAdjacentHTML("beforeend", `<p class="message message--inline e-permits-fo-field__error" data-fo-pp-error role="alert"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg><span>Câmp obligatoriu</span></p>`);
        firstInvalid ||= field;
      });
      firstInvalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      return !firstInvalid;
    }

    function applyPostprocessStepper(active) {
      const paymentItem = document.querySelector("[data-fo-step='6']");
      const finishNumber = document.querySelector("[data-fo-step='7'] .e-permits-fo-stepper__number-text");
      const skip = active && !postprocessHasFee();
      if (paymentItem) paymentItem.hidden = skip;
      if (finishNumber) finishNumber.textContent = skip ? "6" : "7";
      const title = document.querySelector(".e-permits-fo-auth__service-title-row h1");
      if (active && frontOfficePostprocess) {
        const { service, pp } = frontOfficePostprocess;
        document.title = `${service.code || ""} · ${pp.requestType || pp.label} — ${service.shortTitle || service.title || ""}`;
        if (title) title.textContent = service.title || title.textContent;
      } else if (frontOfficeSchema) {
        setServiceHeaderFromSchema(frontOfficeSchema);
      }
    }

    function startFrontOfficePostprocess(act, pp, { step = 1 } = {}) {
      if (!act || !pp) return;
      frontOfficePostprocess = { act, pp, service: postprocessService(act) };
      document.body.dataset.foPostprocess = pp.id;
      applyPostprocessStepper(true);
      renderPostprocessStep1();
      renderPostprocessStep2();
      renderPostprocessStep3();
      renderPostprocessStep5();
      renderPostprocessStep7();
      updateFrontOfficeRequestHeaders();
      const hash = frontOfficeStepHash(step);
      if (window.location.hash !== hash) history.replaceState(null, "", hash);
      if (step === 4) renderPostprocessReview();
      showFrontOfficeRequest({ step });
    }

    /* leaving the post-process ("Solicitare nouă", identity change) restores
       the primary request's steps */
    function stopFrontOfficePostprocess() {
      if (!frontOfficePostprocess) return;
      frontOfficePostprocess = null;
      delete document.body.dataset.foPostprocess;
      document.querySelector("[data-fo-pp-request]")?.remove();
      applyPostprocessStepper(false);
      if (frontOfficeSchema) {
        renderFrontOfficeStep2FromSchema(frontOfficeSchema);
        renderFrontOfficeStep3FromSchema(frontOfficeSchema);
        renderFrontOfficeStep5FromSchema(frontOfficeSchema);
        renderFrontOfficeStep7FromSchema(frontOfficeSchema);
      }
    }

    document.addEventListener("fo-select-change", (event) => {
      if (!frontOfficePostprocess) return;
      const root = event.target;
      const panel = root.closest("[data-fo-step-panel='2']");
      if (!panel) return;
      const value = event.detail?.value || "";
      if (root.matches("[data-fo-pp-select='pp-reason']")) {
        const other = panel.querySelector("[data-fo-pp-other]");
        if (other) other.hidden = value !== "Alte";
      }
      if (root.matches("[data-fo-pp-select='pp-activity-type']")) togglePostprocessHemp(panel, value);
      root.classList.remove("is-error");
      root.closest(".e-permits-fo-field")?.querySelector("[data-fo-pp-error]")?.remove();
    });

    document.addEventListener("change", (event) => {
      const consent = event.target.closest?.("[data-fo-pp-consent]");
      if (!consent) return;
      const idnp = document.querySelector("[data-fo-pp-idnp]");
      if (!idnp) return;
      idnp.disabled = !consent.checked;
      idnp.closest(".e-permits-fo-input")?.classList.toggle("is-disabled", !consent.checked);
    });

    /* post-process navigation, ahead of the primary handler: validate the
       form, skip MPay when there is no fee, build the review */
    document.addEventListener("click", (event) => {
      if (!frontOfficePostprocess) return;
      const next = event.target.closest("[data-fo-next]");
      const prev = event.target.closest("[data-fo-prev]");
      const action = next?.dataset.foNext || prev?.dataset.foPrev;
      if (!action) return;
      if (action === "step-2" && next && !validatePostprocessStep2()) {
        event.stopImmediatePropagation();
        return;
      }
      if (action === "step-3" && next) {
        event.stopImmediatePropagation();
        saveFrontOfficeDraft();
        renderPostprocessReview();
        history.replaceState(null, "", frontOfficeStepHash(4));
        showFrontOfficeRequest({ step: 4 });
        return;
      }
      if (action === "step-5" && next && !postprocessHasFee()) {
        event.stopImmediatePropagation();
        saveFrontOfficeDraft();
        renderPostprocessStep7();
        history.replaceState(null, "", frontOfficeStepHash(7));
        showFrontOfficeRequest({ step: 7 });
      }
    }, true);

    function setFrontOfficePostprocessModalOpen(open) {
      setMotionModalHidden(frontOfficePostprocessModal, !open);
      document.body.classList.toggle("is-fo-modal-open", open);
      if (open) frontOfficePostprocessModal?.querySelector("[data-fo-postprocess-cancel]")?.focus();
    }

    frontOfficeIntentScreen?.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-intent-new]")) {
        stopFrontOfficePostprocess();
        history.replaceState(null, "", "#request");
        showFrontOfficeRequest({ step: 1 });
        return;
      }

      const trigger = event.target.closest("[data-fo-intent-trigger]");
      if (trigger) {
        const menu = document.getElementById(trigger.getAttribute("aria-controls"));
        const open = menu?.hidden !== false;
        closeFrontOfficeIntentMenus(menu);
        if (menu) menu.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        if (open) menu?.querySelector("[role='menuitem']")?.focus();
        return;
      }

      const item = event.target.closest("[data-fo-intent-postprocess]");
      if (!item) return;
      const actId = item.closest("[data-fo-intent-act]")?.dataset.foIntentAct;
      const act = intentActs(frontOfficeSelectedSubject).find((a) => a.id === actId);
      const pp = act?.postProcesses.find((p) => p.id === item.dataset.foIntentPostprocess);
      closeFrontOfficeIntentMenus();
      if (!act || !pp) return;

      if (pp.kind === "consequential") {
        frontOfficePendingPostprocess = { act, pp };
        const q = (sel) => frontOfficePostprocessModal?.querySelector(sel);
        if (q("[data-fo-postprocess-title]")) q("[data-fo-postprocess-title]").textContent = pp.label;
        if (q("[data-fo-postprocess-consequence]")) q("[data-fo-postprocess-consequence]").textContent = pp.consequence || "";
        if (q("[data-fo-postprocess-act]")) q("[data-fo-postprocess-act]").textContent = `${act.name} · ${act.number}`;
        setFrontOfficePostprocessModalOpen(true);
        return;
      }
      handOffPostprocess(act, pp);
    });

    frontOfficeIntentScreen?.addEventListener("keydown", (event) => {
      const menu = event.target.closest(".e-permits-fo-intent-menu");
      if (event.key === "Escape" && menu && !menu.hidden) {
        const trigger = frontOfficeIntentScreen.querySelector(`[aria-controls="${menu.id}"]`);
        closeFrontOfficeIntentMenus();
        trigger?.focus();
        return;
      }
      if (!menu || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const items = [...menu.querySelectorAll("[role='menuitem']")];
      const i = items.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]?.focus();
    });

    document.addEventListener("click", (event) => {
      if (!frontOfficeIntentScreen || frontOfficeIntentScreen.hidden) return;
      if (event.target.closest(".e-permits-fo-intent-act__action")) return;
      closeFrontOfficeIntentMenus();
    });

    frontOfficePostprocessModal?.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-postprocess-confirm]")) {
        const pending = frontOfficePendingPostprocess;
        frontOfficePendingPostprocess = null;
        setFrontOfficePostprocessModalOpen(false);
        if (pending) handOffPostprocess(pending.act, pending.pp);
        return;
      }
      if (event.target.closest("[data-fo-postprocess-cancel]") || event.target === frontOfficePostprocessModal) {
        frontOfficePendingPostprocess = null;
        setFrontOfficePostprocessModalOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && frontOfficePostprocessModal && !frontOfficePostprocessModal.hidden) {
        frontOfficePendingPostprocess = null;
        setFrontOfficePostprocessModalOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-fo-logout]")) return;
      setFrontOfficeAvatarMenuOpen(false);
      frontOfficeSelectedSubject = null;
      if (frontOfficeSchema?.auth?.required === false) {
        showFrontOfficeAccess();
      } else {
        showFrontOfficeGuest();
      }
    });

    function showFrontOfficeRequest({ focus = true, step = 1 } = {}) {
      if (!frontOfficeRequestScreen) return;
      setFrontOfficeStep(step, { focus: false });
      setFrontOfficeScreen("request", { focus });
    }

    function navigateToFrontOfficeStep(step, { focus = true } = {}) {
      const targetStep = Number(step);
      const panel = document.querySelector(`[data-fo-step-panel="${targetStep}"]`);
      if (!panel || targetStep < 1) return false;
      /* a guest's step 1 is the guest „Date solicitant” (typed data kept) */
      if (frontOfficeGuest && targetStep === 1) {
        showFrontOfficeGuest({ focus, reset: false });
        return true;
      }

      const currentStep = Number(document.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
      if (currentStep !== targetStep && currentStep >= 2) saveFrontOfficeDraft();
      if (targetStep === 4) populateFrontOfficeStep4();

      const hash = frontOfficeStepHash(targetStep);
      if (window.location.hash !== hash) history.replaceState(null, "", hash);
      showFrontOfficeRequest({ focus, step: targetStep });
      return true;
    }

    document.addEventListener("click", (event) => {
      const row = event.target.closest(".e-permits-fo-stepper__row");
      if (!row) return;
      const item = row.closest("[data-fo-step]");
      if (!item) return;
      event.preventDefault();
      navigateToFrontOfficeStep(item.dataset.foStep);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest(".e-permits-fo-stepper__row");
      if (!row) return;
      const item = row.closest("[data-fo-step]");
      if (!item) return;
      event.preventDefault();
      navigateToFrontOfficeStep(item.dataset.foStep);
    });

    frontOfficeSchemaLoadPromise = loadFrontOfficeSchema().then((schema) => {
      /* EVO Cabinet → FOD2 redirect (US-55 step 6): ?pp=<type>&act=<id> opens
         the post-process for that act, as its holder, at the hash's step */
      const ppParams = new URLSearchParams(window.location.search);
      const ppFound = ppParams.get("act") && findPostprocessAct(ppParams.get("act"));
      const ppDef = ppFound && postprocessConfig().postProcesses?.[ppParams.get("pp")];
      if (ppFound && ppDef) {
        selectFrontOfficeSubject(ppFound.subjectId);
        startFrontOfficePostprocess(ppFound.act, { id: ppParams.get("pp"), ...ppDef }, { step: frontOfficeStepFromHash() || 1 });
        return schema;
      }
      const hashStep = frontOfficeStepFromHash();
      if (hashStep) {
        selectFrontOfficeSubject(frontOfficeSelectedSubject?.id || frontOfficeSchema?.defaultSubjectId);
        setFrontOfficeStep(hashStep, { focus: false });
        if (hashStep === 4) populateFrontOfficeStep4();
      }
      return schema;
    });

    /* ===================================================================
       MSupport — floating help button, full flow only.
       Portable widget built in msupport/msupport.js (see that file's own
       header comment for the full contract). Mounted only after the schema
       promise resolves: MSupport.init() reads getContext() once synchronously
       at construction to seed its entity picker's initial label, and that
       first snapshot is never re-rendered later — calling init() any earlier
       would permanently bake in "no dossier" instead of the real service
       title, even though later reads (diagnostics, submit) are always fresh.
       getContext() itself still reflects whoever is filling the form right
       now — the MPass-resolved subject, or the guest IDNP match, or neither
       before either has run. There is no real dossier yet during intake, so
       entityRef/entityLabel describe the SERVICE being applied for rather
       than inventing a case number. No backend exists in this prototype, so
       dispatch() is the same console-log + simulated-delay stub the
       msupport/index.html demo host uses. */
    if (demoFlow === "full" && typeof MSupport !== "undefined") {
      frontOfficeSchemaLoadPromise.then(() => {
        const supportGuestActor = () => frontOfficeGuestActor();

        const supportContext = () => {
          const service = frontOfficeSchema?.service;
          /* the page pre-selects a default subject at load, even behind the
             MPass gate — only count it as signed in on the screens that sit
             after authentication */
          const signedIn = Boolean(
            (frontOfficeChoiceScreen && !frontOfficeChoiceScreen.hidden)
            || (frontOfficeIntentScreen && !frontOfficeIntentScreen.hidden)
            || (frontOfficeRequestScreen && !frontOfficeRequestScreen.hidden)
          );
          const subject = signedIn && !frontOfficeGuest ? frontOfficeSelectedSubject : null;
          const actor = subject
            ? { type: "citizen", name: subject.name, idnp: subject.idValue, email: subject.contact?.email }
            : supportGuestActor();
          return {
            surface: "Front Office" + (service?.shortTitle ? ` — ${service.shortTitle}` : ""),
            route: window.location.pathname + window.location.search + window.location.hash,
            entityKind: "Cerere",
            entityRef: service?.code || null,
            entityLabel: service?.shortTitle || null,
            entityOptions: service ? [{ ref: service.code, label: service.shortTitle }] : [],
            actor,
            bubbleAvatar: "assets/logos/evo-logo-square.svg",
          };
        };

        MSupport.init({
          sprite: "assets/icons/sprite.svg",
          getContext: supportContext,
          /* offered by the widget only while the reporter is anonymous */
          authenticate: openMpassTestPage,
          dispatch: (payload) => {
            console.log("[MSupport] dispatch →", payload);
            return new Promise((resolve) => {
              window.setTimeout(() => resolve({ referenceId: MSupport.referenceId(new Date()) }), 900);
            });
          },
        });
      });
    }

    if (window.location.hash === "#choice" || window.location.hash === "#choice-authenticated") {
      setFrontOfficeScreen("choice", { focus: false });
      if (window.location.hash === "#choice-authenticated") {
        window.PageReveal?.showInstanceChoice?.(frontOfficeChoiceScreen, { duration: 1650 });
        history.replaceState(null, "", "#choice");
      }
    }

    const bootStep = frontOfficeStepFromHash();
    if (bootStep) {
      showFrontOfficeRequest({ focus: false, step: bootStep });
    }

    /* #access = „Autentifică-te sau continuă fără cont” · #guest = the guest „Date solicitant”
       (nobody signed in; ?guest=pf|pj|pfpj sets the guest variant) */
    if (window.location.hash === "#access" || window.location.hash === "#guest") {
      const bootHash = window.location.hash;
      frontOfficeSchemaLoadPromise.then(() => {
        frontOfficeSelectedSubject = null;
        if (bootHash === "#access") showFrontOfficeAccess({ focus: false });
        else showFrontOfficeGuest({ focus: false });
      });
    }

    if (window.location.hash === "#intent") {
      frontOfficeSchemaLoadPromise.then(() => {
        const subject = frontOfficeSelectedSubject || selectFrontOfficeSubject(frontOfficeSchema?.defaultSubjectId);
        if (frontOfficeShouldShowIntent(subject)) {
          showFrontOfficeIntent({ focus: false });
        } else if (subject) {
          history.replaceState(null, "", "#request");
          showFrontOfficeRequest({ focus: false, step: 1 });
        }
      });
    }

    /* ===================================================================
       Test configuration panel — full flow only.
       Rewrites the live flow schema instead of re-implementing anything:
       auth.availableFor already drives both the "Disponibil pentru" badges
       and the instance picker's filtering (frontOfficeAllowedTypes /
       renderRolesFromSchema), so setting it to ["PJ"] is all it takes for
       only PJ instances to remain. Every edit is re-derived from a pristine
       clone taken at load, so toggling back and forth never compounds.
       Same idea as solicitant-sandbox/, minus the iframe and the fetch
       patching — in-page we can just call applyFrontOfficeSchema(). */
    if (demoFlow === "full") {
      frontOfficeSchemaLoadPromise.then((loaded) => {
        const root = document.querySelector("[data-fo-testcfg]");
        if (!root || !loaded) return;

        const pristine = JSON.parse(JSON.stringify(loaded));
        const panel = root.querySelector("[data-fo-testcfg-panel]");
        const toggle = root.querySelector("[data-fo-testcfg-toggle]");
        const outcome = root.querySelector("[data-fo-testcfg-outcome]");

        const cfg = {
          requiresAuth: pristine.auth?.required === false ? "no" : "yes",
          eligibility: (() => {
            const forTypes = pristine.auth?.availableFor;
            if (!Array.isArray(forTypes) || forTypes.length !== 1) return "BOTH";
            return forTypes[0] === "PJ" ? "PJ" : "PF";
          })(),
          authenticated: "yes",
          intent: pristine.intent ? "yes" : "no",
          acts: "yes",
          /* US-54 address lookup: the service's own „Cod cadastral” setting is the default */
          adrField: foAddressDemo.field || (() => {
            const config = cadastralConfigOfSchema(pristine);
            if (!config || config.visible === false) return "ascuns";
            return config.required ? "obligatoriu" : "vizibil";
          })(),
          adrSrre: ["lent", "indisponibil", "invalid"].includes(foAddressDemo.srre) ? foAddressDemo.srre : "normal",
          adrSaved: foAddressDemo.saved,
        };

        /* Adresă · cod cadastral: the SRRE answer and the saved codes are read live; only the
           „Cod cadastral” mode changes markup, and then only the address field of step 2 is drawn
           again, with the address the user had (the other step-2 answers are not touched) */
        function applyAddressDemo(key) {
          foAddressDemo.field = cfg.adrField;
          foAddressDemo.srre = cfg.adrSrre;
          foAddressDemo.saved = cfg.adrSaved;
          if (key === "adrField") redrawStep2Address();
        }

        function redrawStep2Address() {
          const panel = frontOfficeRequestScreen?.querySelector("[data-fo-step-panel='2']");
          const old = panel?.querySelector("[data-fo-cascade-address]");
          const field = (frontOfficeSchema?.steps || []).find((item) => Number(item.index) === 2)?.sections
            ?.flatMap((section) => section.fields || []).find((item) => item?.type === "cascade-address");
          if (!old || !field) return;
          const selectText = (selector) => {
            const value = old.querySelector(`${selector} [data-fo-select-value]`);
            return value && !value.classList.contains("e-permits-fo-select__value--placeholder") ? value.textContent.trim() : "";
          };
          const part = (key) => old.querySelector(`[data-fo-address-part='${key}']`)?.value || "";
          const address = {
            district: selectText("[data-fo-cascade-raion]"),
            locality: selectText("[data-fo-cascade-localitate]"),
            sector: selectText("[data-fo-cascade-sector]"),
            street: selectText("[data-fo-cascade-strada]"),
            postalCode: part("postalCode"),
            house: part("house"), block: part("block"), stair: part("stair"), floor: part("floor"), apartment: part("apartment"),
          };
          const code = part("cadastralCode");
          /* fields with stable ids inside the address block (phone, e-mail) */
          const typed = [...old.querySelectorAll("input[id]:not([data-fo-address-part])")].filter((input) => input.value && !input.closest("[data-fo-address-search]"));
          const typedValues = typed.map((input) => [input.id, input.value]);
          const template = document.createElement("template");
          template.innerHTML = cascadeAddressHtml(field).trim();
          const node = template.content.firstElementChild;
          old.replaceWith(node);
          /* initFrontOfficeDynamicControls, for this one block (its own node included) */
          node.querySelectorAll("[data-fo-select]").forEach(bindFoSelect);
          node.querySelectorAll("[data-fo-phone-code]").forEach(bindPhoneCode);
          initCascadeAddress(node);
          node.querySelectorAll("[data-fo-address-search]").forEach(bindAddressSearch);
          node.querySelectorAll("[data-fo-char-counter]").forEach(initCharCounter);
          if (address.district) node.querySelector("[data-fo-address-search]")?.foCascadeAddressFill?.(address);
          typedValues.forEach(([id, value]) => {
            const input = node.querySelector(`#${CSS.escape(id)}`);
            if (input && !input.value) input.value = value;
          });
          const codeInput = node.querySelector("[data-fo-cadastral-input]");
          if (codeInput && code) {
            codeInput.value = code;
            codeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        const allowedFor = () => (cfg.eligibility === "BOTH" ? ["PF", "PJ"] : [cfg.eligibility]);

        function syncButtons() {
          root.querySelectorAll("[data-fo-testcfg-group]").forEach((group) => {
            const key = group.dataset.foTestcfgGroup;
            group.querySelectorAll("[data-fo-testcfg-value]").forEach((button) => {
              const on = button.dataset.foTestcfgValue === cfg[key];
              button.classList.toggle("is-selected", on);
              button.setAttribute("aria-selected", String(on));
            });
          });
        }

        /* ---- where the user is, and how a config change keeps them there (2026-10-15) ----
           User: „changing autentificat ⇄ neautentificat must not reset the flow”. Every option is
           routed through ONE place: read the position (screen + wizard step), patch only the
           schema keys the panel owns (auth, intent, defaultSubjectId — the steps are never drawn
           again for them), then put the user back on the same step:
           - step mapping: the same step if the new configuration still has it, else the last step
             before it, else the first one (wizardStepFor);
           - Autentificat ⇄ Neautentificat (auth optional): the same step as an MPass user ⇄ a
             guest; only the identity-bound parts change (header, step 1, the guest variant of
             steps 3 / 5 / 7), answers and uploaded files stay (rerenderFoStepsKeeping);
           - a configuration with no wizard for this user (MPass required + not signed in, no
             eligible identity) shows its gate and PARKS the step; the next change that allows
             the wizard again resumes it with the data. Nothing here reloads the page. */
        let parked = null;
        let lastSignedSubjectId = null;
        let signedDraft = null;
        /* MDocs documents the guest could not keep — back in their fields when signed in again */
        let signedDocs = new Map();
        const visible = (node) => Boolean(node && !node.hidden);

        function position() {
          const step = Number(frontOfficeRequestScreen?.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
          if (visible(frontOfficeRequestScreen)) return { screen: "request", step };
          if (visible(frontOfficeGuestScreen)) return frontOfficeGuest ? { screen: "request", step: 1 } : { screen: "guest" };
          if (visible(frontOfficeIntentScreen)) return { screen: "intent" };
          if (visible(frontOfficeChoiceScreen)) return { screen: "choice" };
          if (visible(frontOfficeAccessScreen)) return { screen: "access" };
          return { screen: "auth" };
        }

        function wizardStepFor(step) {
          const steps = [...frontOfficeStepperItems]
            .map((item) => Number(item.dataset.foStep))
            .filter((n) => frontOfficeRequestScreen?.querySelector(`[data-fo-step-panel='${n}']`))
            .sort((a, b) => a - b);
          if (!steps.length || steps.includes(step)) return step;
          const before = steps.filter((n) => n < step);
          return before.length ? before[before.length - 1] : steps[0];
        }

        function stepLabel(step) {
          return frontOfficeRequestScreen?.querySelector(`[data-fo-step='${step}'] .e-permits-fo-stepper__label`)?.textContent.trim() || `Pasul ${step}`;
        }

        function goToStep(step, { keepScroll = false } = {}) {
          const target = wizardStepFor(step);
          const scroller = document.scrollingElement || document.documentElement;
          const top = scroller.scrollTop;
          if (frontOfficeGuest && target === 1) {
            showFrontOfficeGuest({ focus: false, reset: false });
          } else {
            if (target === 4) populateFrontOfficeStep4();
            history.replaceState(null, "", frontOfficeStepHash(target));
            showFrontOfficeRequest({ focus: false, step: target });
          }
          /* same screen, same step: the page does not jump to the top */
          if (keepScroll && target === step && target !== 1) window.requestAnimationFrame(() => window.requestAnimationFrame(() => { scroller.scrollTop = top; }));
          return target;
        }

        function park(step, onto) {
          parked = { step, onto };
        }

        function contactSelfPhone(schema) {
          const field = (schema?.steps || []).flatMap((item) => item.sections || []).flatMap((section) => section.fields || []).find((item) => item?.type === "contact-person");
          return field?.selfPhone || "60 999 999";
        }

        function setContactSelfPhone(value) {
          const node = frontOfficeRequestScreen?.querySelector("[data-fo-step-panel='2'] [data-fo-contact-self] .e-permits-fo-phone__value");
          if (node) node.textContent = value;
        }

        /* the MPass draft belongs to the account: hidden while a guest, back when signed in again */
        function keepSignedDraft() {
          signedDraft = { created: frontOfficeDraftCreated, savedAt: frontOfficeDraftSavedAt, toast: frontOfficeDraftToastShown, info: frontOfficeDraftInfoDismissed };
        }
        function restoreSignedDraft() {
          if (!signedDraft) return;
          frontOfficeDraftCreated = signedDraft.created;
          frontOfficeDraftSavedAt = signedDraft.savedAt;
          frontOfficeDraftToastShown = signedDraft.toast;
          frontOfficeDraftInfoDismissed = signedDraft.info;
          signedDraft = null;
          updateFrontOfficeRequestHeaders();
        }

        const uploadedOnly = (node, key) => {
          let upload = false;
          try { upload = JSON.parse(node.dataset.foDoc || "{}").sursa === "upload"; } catch (error) { upload = false; }
          if (!upload) signedDocs.set(key, [...(signedDocs.get(key) || []), node]);
          return upload;
        };

        async function asGuestAt(step, keepScroll) {
          const wasGuest = Boolean(frontOfficeGuest);
          if (!wasGuest) {
            if (frontOfficeSelectedSubject) lastSignedSubjectId = frontOfficeSelectedSubject.id;
            keepSignedDraft();
          }
          const signed = (frontOfficeSchema?.subjects || []).find((s) => s.id === lastSignedSubjectId);
          await fillGuestDemoIdentity(frontOfficeGuest?.type || signed?.type, signed?.type === "PJ" ? signed.idValue : "");
          const data = collectGuestData();
          frontOfficeGuest = { ...data, subject: guestSubjectOf(data) };
          frontOfficeSelectedSubject = frontOfficeGuest.subject;
          if (!wasGuest) resetFrontOfficeDraftState();
          const schema = guestSchemaVariant(frontOfficeSchema, data);
          rerenderFoStepsKeeping([3, 5], () => {
            renderFrontOfficeStep3FromSchema(schema);
            renderFrontOfficeStep5FromSchema(schema);
          }, { keepDoc: uploadedOnly });
          renderFrontOfficeStep7FromSchema(schema);
          attachGuestDocument(data);
          setContactSelfPhone(data.phone);
          syncGuestWizardChrome();
          return goToStep(step, { keepScroll });
        }

        function asSignedAt(step, keepScroll) {
          const wasGuest = Boolean(frontOfficeGuest);
          if (wasGuest) frontOfficeGuest = null;
          const current = frontOfficeSelectedSubject;
          const eligible = (id) => frontOfficeSelectableSubjects(frontOfficeSchema).some((s) => s.id === id && s.selectable !== false);
          let subject = current && !wasGuest && eligible(current.id) ? current : null;
          if (!subject) {
            /* the identity the user had before, else the service default / first eligible one */
            frontOfficeIntentApplying = true;
            subject = selectFrontOfficeSubject(eligible(lastSignedSubjectId) ? lastSignedSubjectId : frontOfficeSchema.defaultSubjectId);
            frontOfficeIntentApplying = false;
          }
          if (!subject) return 0;
          lastSignedSubjectId = subject.id;
          if (wasGuest) {
            rerenderFoStepsKeeping([3, 5], () => {
              renderFrontOfficeStep3FromSchema(frontOfficeSchema);
              renderFrontOfficeStep5FromSchema(frontOfficeSchema);
            });
            renderFrontOfficeStep7FromSchema(frontOfficeSchema);
            signedDocs.forEach((nodes, key) => {
              const files = frontOfficeRequestScreen?.querySelector(`[data-fo-step-panel='3'] [data-fo-doc-field='${CSS.escape(key)}'] [data-fo-doc-field-files]`);
              if (files && !files.children.length) files.append(...nodes);
            });
            signedDocs = new Map();
            setContactSelfPhone(contactSelfPhone(frontOfficeSchema));
            restoreSignedDraft();
          }
          syncGuestWizardChrome();
          return goToStep(step, { keepScroll });
        }

        function describe() {
          const pos = position();
          const allowed = allowedFor();
          if (pos.screen === "request") {
            const who = frontOfficeGuest
              ? "Fără cont (vizitator): identitatea e cea introdusă în „Date solicitant”, documentele doar de pe dispozitiv."
              : `Autentificat ca ${frontOfficeSelectedSubject?.name || "—"}.`;
            return `<strong>Ecran: pasul ${pos.step} · ${escapeFrontOfficeHtml(stepLabel(pos.step))}</strong>${escapeFrontOfficeHtml(who)} Schimbările din panou păstrează pasul și datele introduse.`;
          }
          const resume = parked ? ` Pasul ${parked.step} și datele rămân păstrate: revin la „Autentificat”${pos.screen === "auth" ? " sau la Autentificare „Opțională”" : ""}.` : "";
          if (pos.screen === "auth") {
            return `<strong>Ecran: poarta de autentificare</strong>Serviciul cere MPass. Badge-urile „Disponibil pentru” arată ${allowed.join(" + ")}.${resume}`;
          }
          if (pos.screen === "access") {
            return "<strong>Ecran: Autentifică-te sau continuă fără cont</strong>Serviciul merge și fără MPass: autentificare prin MPass sau „Continuă fără cont” (formularul liber).";
          }
          if (pos.screen === "guest") {
            return "<strong>Ecran: Date solicitant (fără cont)</strong>Formularul liber al vizitatorului; ce ai completat rămâne.";
          }
          if (pos.screen === "intent") {
            return "<strong>Ecran: Ce vrei să soliciți?</strong>Solicitare nouă sau un postproces pe unul din actele emise identității alese.";
          }
          const selectable = frontOfficeSelectableSubjects(frontOfficeSchema).filter((s) => s.selectable !== false && s.scenario !== "notarial-proxy");
          if (!selectable.length) {
            return `<strong>Ecran: selectorul de instanțe</strong>Nicio identitate ${allowed.join(" + ")} eligibilă; rămâne doar procura notarială.${resume}`;
          }
          const next = cfg.intent === "yes" && cfg.acts === "yes"
            ? " După alegere urmează „Ce vrei să soliciți?” pentru identitățile cu acte (SRL Global Trader, «Vita-Plant» SRL); celelalte merg direct la cerere."
            : " După alegere se deschide direct cererea.";
          return `<strong>Ecran: selectorul de instanțe</strong>${selectable.length} ${selectable.length === 1 ? "instanță" : "instanțe"} ${allowed.join(" + ")} disponibile.${next}`;
        }

        /* the panel shows the page's real state (a guest reached through „Continuă fără cont” or
           #guest, the gate at load) — other options never sign anyone in or out: a guest or the
           access screen means MPass is optional, whatever the schema said */
        function syncFromPage(key) {
          const pos = position();
          const signedOut = Boolean(frontOfficeGuest) || ["auth", "access", "guest"].includes(pos.screen);
          if (key !== "authenticated") cfg.authenticated = signedOut ? "no" : "yes";
          if (key !== "requiresAuth" && (frontOfficeGuest || ["access", "guest"].includes(pos.screen))) cfg.requiresAuth = "no";
        }

        async function apply(key) {
          syncFromPage(key);
          const pos = position();
          if (pos.screen === "request" && !frontOfficeGuest && frontOfficeSelectedSubject) lastSignedSubjectId = frontOfficeSelectedSubject.id;

          /* only the keys the panel owns change; the steps (and what the user entered) stay */
          const next = JSON.parse(JSON.stringify(pristine));
          next.auth = next.auth || {};
          next.auth.required = cfg.requiresAuth === "yes";
          next.auth.availableFor = allowedFor();
          /* "Ce vrei să soliciți?": dropping schema.intent switches the step off; emptying acts has
             the same visible effect, since the step is only shown when the identity has an act */
          if (cfg.intent === "no") delete next.intent;
          else if (next.intent && cfg.acts === "no") next.intent.acts = {};
          /* the default has to be one that survived the type filter, or the picker opens empty */
          const allowed = allowedFor();
          const firstUsable = (next.subjects || []).find((s) => allowed.includes(s.type) && s.selectable !== false);
          frontOfficeSchema.auth = next.auth;
          frontOfficeSchema.defaultSubjectId = firstUsable ? firstUsable.id : null;
          if (next.intent) frontOfficeSchema.intent = next.intent;
          else delete frontOfficeSchema.intent;
          setAuthFromSchema(frontOfficeSchema);
          renderRolesFromSchema(frontOfficeSchema);
          renderFrontOfficeAvatarMenuFromSchema(frontOfficeSchema);
          /* the guest form follows the eligibility (what was typed stays) */
          if (!frontOfficeGuest) setGuestType(guestType);

          /* the wizard step to keep: the current one, or the one parked on this very screen */
          const wizardStep = pos.screen === "request" ? pos.step : parked && parked.onto === pos.screen ? parked.step : 0;
          const keepScroll = pos.screen === "request";
          parked = null;

          if (wizardStep) {
            const signedOut = cfg.authenticated === "no";
            if (!signedOut) {
              if (asSignedAt(wizardStep, keepScroll)) return;
              /* no identity can start the request (only the proxy row is left): the picker */
              park(wizardStep, "choice");
              frontOfficeSelectedSubject = null;
              setFrontOfficeScreen("choice", { focus: false });
              return;
            }
            if (cfg.requiresAuth === "yes" || frontOfficePostprocess) {
              /* a visitor cannot be here: the gate, with the step kept for the way back */
              if (!frontOfficeGuest && frontOfficeSelectedSubject) lastSignedSubjectId = frontOfficeSelectedSubject.id;
              park(wizardStep, cfg.requiresAuth === "yes" ? "auth" : "access");
              if (cfg.requiresAuth === "yes") {
                history.replaceState(null, "", window.location.pathname + window.location.search);
                setFrontOfficeScreen("auth", { focus: false });
              } else {
                showFrontOfficeAccess({ focus: false });
              }
              return;
            }
            await asGuestAt(wizardStep, keepScroll);
            return;
          }

          /* outside the wizard: the screen this configuration starts on */
          const previousSubjectId = frontOfficeSelectedSubject?.id;
          const previousStillEligible = Boolean(
            previousSubjectId
            && frontOfficeSelectableSubjects(frontOfficeSchema).some((s) => s.id === previousSubjectId && s.selectable !== false)
          );
          if (cfg.authenticated === "yes" && pos.screen === "intent" && previousStillEligible) {
            /* same identity still eligible: keep it, and show the step only if it still has acts */
            frontOfficeIntentApplying = true;
            const kept = selectFrontOfficeSubject(previousSubjectId);
            frontOfficeIntentApplying = false;
            if (frontOfficeShouldShowIntent(kept)) {
              showFrontOfficeIntent({ focus: false });
            } else {
              history.replaceState(null, "", "#request");
              showFrontOfficeRequest({ focus: false, step: 1 });
            }
          } else if (cfg.authenticated === "yes") {
            setFrontOfficeScreen("choice", { focus: false });
          } else {
            /* nobody is signed in: the header and MSupport's actor context agree */
            frontOfficeSelectedSubject = null;
            if (cfg.requiresAuth === "yes") {
              setFrontOfficeScreen("auth", { focus: false });
            } else if (pos.screen === "guest") {
              /* the guest form stays as typed */
              setFrontOfficeScreen("guest", { focus: false });
            } else {
              /* available with and without MPass: explain the benefits first */
              showFrontOfficeAccess({ focus: false });
            }
          }
        }

        let applying = Promise.resolve();
        function run(change) {
          applying = applying.then(change).catch((error) => console.warn(error)).then(() => {
            if (outcome) outcome.innerHTML = describe();
            syncButtons();
          });
          return applying;
        }

        function setPanelOpen(open) {
          if (panel) panel.hidden = !open;
          toggle?.setAttribute("aria-expanded", String(open));
        }

        root.addEventListener("click", (event) => {
          if (event.target.closest("[data-fo-testcfg-toggle]")) {
            const open = panel?.hidden !== false;
            if (open) {
              syncFromPage("");
              syncButtons();
              if (outcome) outcome.innerHTML = describe();
            }
            setPanelOpen(open);
            return;
          }
          if (event.target.closest("[data-fo-testcfg-close]")) {
            setPanelOpen(false);
            return;
          }
          const choice = event.target.closest("[data-fo-testcfg-value]");
          if (!choice) return;
          const key = choice.closest("[data-fo-testcfg-group]")?.dataset.foTestcfgGroup;
          if (!key || cfg[key] === choice.dataset.foTestcfgValue) return;
          cfg[key] = choice.dataset.foTestcfgValue;
          if (key.startsWith("adr")) run(() => applyAddressDemo(key));
          else run(() => apply(key));
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && panel && !panel.hidden) setPanelOpen(false);
        });

        root.hidden = false;
        syncButtons();
        if (outcome) outcome.innerHTML = describe();
      });
    }

    frontOfficeBetaClose?.addEventListener("click", () => {
      if (frontOfficeBetaBanner) frontOfficeBetaBanner.hidden = true;
      updateFoHeaderHeight();
    });

    const foHeader = document.querySelector(".e-permits-fo-auth__header");
    function updateFoHeaderHeight() {
      if (foHeader) {
        document.documentElement.style.setProperty("--fo-header-height", foHeader.offsetHeight + "px");
      }
    }
    updateFoHeaderHeight();
    new ResizeObserver(updateFoHeaderHeight).observe(foHeader || document.body);

    frontOfficeAuthButton?.addEventListener("click", () => {
      openMpassTestPage();
    });

    document.addEventListener("click", async (event) => {
      const roleCollapseToggle = event.target.closest("[data-fo-role-collapse-toggle]");
      if (roleCollapseToggle) {
        event.preventDefault();
        const group = roleCollapseToggle.closest("[data-fo-role-collapse-group]");
        const label = roleCollapseToggle.querySelector("[data-fo-role-collapse-label]");
        const isExpanded = !group?.classList.contains("is-expanded");
        group?.classList.toggle("is-expanded", isExpanded);
        roleCollapseToggle.setAttribute("aria-expanded", String(isExpanded));
        if (label) label.textContent = isExpanded ? "Arată mai puține" : "Arată mai multe";
        return;
      }

      const button = event.target.closest("[data-fo-open-request]");
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
      if (!frontOfficeSchema) {
        frontOfficeSchemaLoadPromise ||= loadFrontOfficeSchema();
        await frontOfficeSchemaLoadPromise;
      }
      const selected = selectFrontOfficeSubject(button.dataset.foSubjectId);
      if (!selected) return;
      if (frontOfficeShouldShowIntent(selected)) {
        showFrontOfficeIntent();
        return;
      }
      if (window.location.hash !== "#request") {
        history.replaceState(null, "", "#request");
      }
      showFrontOfficeRequest({ step: 1 });
    });

    function summaryRow(label, values) {
      const valuesHtml = values.map((v) => `<span>${v}</span>`).join("");
      return `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label">${escapeFrontOfficeHtml(label)}</span><div class="e-permits-fo-summary-row__value">${valuesHtml}</div></div>`;
    }

    function summaryEditButton(step, label) {
      return `
        <button class="e-permits-fo-summary-section__edit" type="button" aria-label="${escapeFrontOfficeHtml(label)}" data-fo-edit-step="${escapeFrontOfficeHtml(step)}">
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
        </button>
      `;
    }

    // ===== Document picker modal =====
    /* ===== FO documents — ONE data shape + ONE renderer (2026-10-14, user: „the same data architecture
       everywhere”) =====
       doc = { sursa: "upload" | "mdocs" | "generat", tip (title = document type), nr?, fisier?, size? (label),
               verb? („Încărcat” / „Emis” / „Generat”…), at? (label „12 martie 2026, 10:14”), de?, semnat?,
               badge? (validity, e.g. „Activă”) }.
       Icon by source (grey uploaded / blue MDocs or generated), title + source tag (+ badge), meta
       number · file · size · „<Verb> <date>” · „de …” · „Semnat electronic”. Used by the picker modal
       cards, the field values (step 3, guest, Form Builder Fișier / Document din MDocs), the post-process
       previous act and the Verificare summary; the BO shell (renderDosarDocItem) and the EVO Cabinet
       (docRowHtml) draw the same shape. */
    const FO_DOC_SOURCES = {
      upload: { tag: "Încărcat", icon: "document-uploaded.svg" },
      mdocs: { tag: "MDocs", icon: "document-generated.svg" },
      generat: { tag: "Generat", icon: "document-generated.svg" }
    };
    /* signed = a blue Small tag with the signature icon, next to the title (user 2026-10-14) */
    const FO_DOC_SIGNED_TAG = '<span class="status-tag status-tag--brand is-subtle status-tag--small e-permits-fo-doc-tag"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-signature"></use></svg>Semnat electronic</span>';
    function foDocSource(doc) { return FO_DOC_SOURCES[doc?.sursa] || FO_DOC_SOURCES.upload; }
    function foDocIconHtml(doc, className = "e-permits-fo-lib-item__icon") {
      return `<img class="${className}" src="assets/icons/${foDocSource(doc).icon}" width="24" height="24" alt="">`;
    }
    function foDocStampNow() {
      const now = new Date();
      return `${now.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
    /* meta in logical lines (2026-10-14, phones): [number] · [file · size] · [date · by whom]. On desktop the
       lines flow as one row (display: contents); on phones each is its own line. The separator dot is each
       part's ::before, so a wrapped line never starts or ends with a dot (see CSS „document meta”). */
    function foDocMetaLines(doc) {
      const esc = escapeFrontOfficeHtml;
      const part = (text, mod = "") => `<span class="e-permits-fo-doc-meta__part${mod ? ` e-permits-fo-doc-meta__part--${mod}` : ""}"${mod === "file" ? ` title="${esc(text)}"` : ""}>${esc(text)}</span>`;
      const file = doc.fisier && doc.fisier !== doc.tip && doc.fisier !== `${doc.nr}.pdf` ? doc.fisier : "";
      const head = [file ? part(file, "file") : "", doc.size ? part(doc.size) : ""].filter(Boolean);
      const stamp = [doc.at ? part(`${doc.verb || (doc.sursa === "mdocs" ? "Emis" : doc.sursa === "generat" ? "Generat" : "Încărcat")} ${doc.at}`) : "", doc.de ? part(`de ${doc.de}`) : ""].filter(Boolean);
      /* a number gets its own line next to a file name (the file would ellipsize to nothing), else it leads the size */
      return (file ? [doc.nr ? [part(doc.nr)] : [], head, stamp] : [[doc.nr ? part(doc.nr) : "", ...head].filter(Boolean), stamp]).filter((line) => line.length);
    }
    function foDocMetaHtml(lines) {
      return lines.length ? `<div class="e-permits-fo-lib-item__meta e-permits-fo-doc-meta">${lines.map((line) => `<span class="e-permits-fo-doc-meta__line">${line.join("")}</span>`).join("")}</div>` : "";
    }
    /* the content block (title row + meta) — inside any FO document card */
    function foDocContentHtml(doc, { titleClass = "" } = {}) {
      const esc = escapeFrontOfficeHtml;
      const lines = foDocMetaLines(doc);
      return `
        <div class="e-permits-fo-lib-item__content">
          <div class="e-permits-fo-lib-item__title-row e-permits-fo-doc-title-row">
            <span class="e-permits-fo-lib-item__title${titleClass ? ` ${titleClass}` : ""}" title="${esc(doc.tip)}">${esc(doc.tip)}</span>
            <span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag">${esc(foDocSource(doc).tag)}</span>
            ${doc.semnat ? FO_DOC_SIGNED_TAG : ""}
            ${doc.badge ? `<span class="e-permits-fo-lib-item__badge">${esc(doc.badge)}</span>` : ""}
          </div>
          ${foDocMetaHtml(lines)}
        </div>`;
    }
    /* the document type a field asks for (its label without the required / optional marks) */
    function foDocFieldTitle(el) {
      const field = el?.closest?.("[data-fo-doc-field]");
      const label = field?.querySelector(".e-permits-fo-doc-field__label, .e-permits-fo-field__label, label");
      if (!label) return el?.closest?.("[data-fo-other-doc-list]") ? "Document suplimentar" : "";
      const copy = label.cloneNode(true);
      copy.querySelectorAll(".e-permits-fo-required, .e-permits-fo-optional-tag, .u-visually-hidden").forEach((x) => x.remove());
      return copy.textContent.replace(/\s+/g, " ").trim();
    }
    /* „12.03.2026” → „12 martie 2026” (product date format) */
    function foDocLongDate(value) {
      const m = String(value || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : value;
    }
    /* Verificare și semnare › Documente însoțitoare: every document attached at step 3, in DOM order,
       as the shared card titled by the TYPE the field asks for (file name in the meta) */
    function foSummaryDocsHtml(panel) {
      if (!panel) return "";
      /* the step panel itself is hidden while the summary shows: skip only hidden documents / fields */
      return [...panel.querySelectorAll("[data-fo-doc]")].filter((el) => !el.hidden && !el.closest("[data-fo-doc-field][hidden], .e-permits-fo-field[hidden], [data-fb-field][hidden]")).map((el) => {
        const doc = foDocDataOf(el);
        if (!doc) return "";
        const type = foDocFieldTitle(el);
        const shown = type && type !== doc.tip ? { ...doc, tip: type, fisier: doc.fisier || doc.tip } : doc;
        return `<div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc e-permits-fo-confirm-file--${shown.sursa === "upload" ? "uploaded" : "system"}">${foDocIconHtml(shown, "e-permits-fo-confirm-file__icon")}${foDocContentHtml(shown)}</div>`;
      }).join("");
    }
    function foDocDataOf(el) {
      try { return JSON.parse(el?.dataset.foDoc || "null"); } catch { return null; }
    }

    const FO_DOC_LIBRARY = [
      { type: "emis", sursa: "mdocs", title: 'Extras Registru de Stat - "Vita-Plant" SRL', badge: "Activă", emis: "12.03.2026", authority: "ASP", fisier: "extras-registru-vita-plant.pdf", size: "310 KB", at: "12 martie 2026, 10:14", semnat: true },
      { type: "emis", sursa: "mdocs", title: 'Extras Registru de Stat - "Eco-Farm" SRL', emis: "15.05.2025", authority: "ASP", fisier: "extras-registru-eco-farm.pdf", size: "296 KB", at: "15 mai 2025, 09:02", semnat: true },
      { type: "emis", sursa: "mdocs", title: 'Aviz sanitar - "Global Trader" SRL', emis: "18.05.2025", authority: "ANSP", fisier: "aviz-sanitar-global-trader.pdf", size: "412 KB", at: "18 mai 2025, 14:40", semnat: true },
      { type: "emis", sursa: "mdocs", title: 'Autorizație sanitară de funcționare - "Global Trader" SRL', emis: "06.04.2024", authority: "ANSP", fisier: "autorizatie-sanitara-global-trader.pdf", size: "538 KB", at: "6 aprilie 2024, 11:25", semnat: true },
      { type: "uploaded", sursa: "upload", tip: "Copia actului de proprietate", fileName: "copia-actului-de-proprietate.pdf", size: "1.8 MB", at: "2 martie 2026, 16:08" },
      { type: "uploaded", sursa: "upload", tip: "Planul încăperilor", fileName: "planul-incaperilor.pdf", size: "2.7 MB", at: "2 martie 2026, 16:11" },
      { type: "uploaded", sursa: "upload", tip: "Design arhitectural", fileName: "design-architectural.docx", size: "1.5 MB", at: "28 februarie 2026, 12:47" },
    ];
    /* a picker entry in the shared shape */
    function foDocFromLibrary(doc) {
      return doc.type === "uploaded"
        ? { sursa: "upload", tip: doc.tip || doc.fileName, fisier: doc.fileName, size: doc.size, at: doc.at, verb: "Încărcat" }
        : { sursa: doc.sursa || "mdocs", tip: doc.title, fisier: doc.fisier, size: doc.size, at: doc.at || foDocLongDate(doc.emis), verb: "Emis", de: doc.authority, semnat: doc.semnat, badge: doc.badge };
    }

    let foDocModalField = null;
    let foDocModalSelectedLib = null;
    let foDocModalPendingFile = null;

    const foDocOverlay = document.querySelector("[data-fo-doc-modal-overlay]");
    const foDocModalList = foDocOverlay?.querySelector("[data-fo-doc-modal-list]");
    const foDocSearchInput = foDocOverlay?.querySelector("[data-fo-doc-search]");
    const foDocSubmitBtn = foDocOverlay?.querySelector("[data-fo-doc-modal-submit]");
    const foDocUploadPreview = foDocOverlay?.querySelector("[data-fo-doc-upload-preview]");
    const foDocFileInput = foDocOverlay?.querySelector("[data-fo-doc-file-input]");

    /* the picker keeps its own card per document (user: „a separate card for each document”); its
       info is the shared document content */
    function foDocLibItemHTML(doc) {
      const shape = foDocFromLibrary(doc);
      return `<button class="e-permits-fo-lib-item" type="button">
        ${foDocIconHtml(shape)}
        ${foDocContentHtml(shape)}
        <svg class="icon e-permits-fo-lib-item__check" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>
      </button>`;
    }

    function foDocRenderLibrary(filter) {
      if (!foDocModalList) return;
      const q = (filter || "").toLowerCase().trim();
      const filtered = q ? FO_DOC_LIBRARY.filter((d) => {
        const text = d.type === "uploaded"
          ? `${d.tip || ""} ${d.fileName || ""}`
          : `${d.title || ""} ${d.authority || ""} ${d.fisier || ""}`;
        return text.toLowerCase().includes(q);
      }) : FO_DOC_LIBRARY;
      if (!filtered.length) {
        foDocModalList.innerHTML = `<p class="e-permits-fo-doc-modal__no-results">Nu am găsit documente în librărie.</p>`;
        return;
      }
      foDocModalList.innerHTML = filtered.map((d) => foDocLibItemHTML(d)).join("");
      foDocModalList.querySelectorAll(".e-permits-fo-lib-item").forEach((btn, i) => {
        const doc = filtered[i];
        if (foDocModalSelectedLib && foDocModalSelectedLib.title === doc.title) btn.classList.add("is-selected");
        btn.addEventListener("click", () => {
          foDocModalList.querySelectorAll(".e-permits-fo-lib-item").forEach((b) => b.classList.remove("is-selected"));
          if (foDocModalSelectedLib?.title === doc.title) {
            foDocModalSelectedLib = null;
          } else {
            foDocModalSelectedLib = doc;
            btn.classList.add("is-selected");
          }
          foDocUpdateSubmit();
        });
      });
    }

    function foDocUpdateSubmit() {
      const activePanel = foDocOverlay?.querySelector("[data-fo-doc-panel]:not([hidden])");
      const isLibrary = activePanel?.dataset.foDocPanel === "library";
      const canSubmit = isLibrary ? !!foDocModalSelectedLib : !!foDocModalPendingFile;
      if (foDocSubmitBtn) foDocSubmitBtn.disabled = !canSubmit;
    }

    /* the two panels are very different heights, so the shell is animated from
       the outgoing height to the incoming one and then released back to auto */
    function foDocSwitchTab(tab, { animate = true } = {}) {
      const modal = foDocOverlay?.querySelector(".e-permits-fo-doc-modal");
      const current = foDocOverlay?.querySelector("[data-fo-doc-panel]:not([hidden])");
      const shouldAnimate =
        animate &&
        modal &&
        current &&
        current.dataset.foDocPanel !== tab &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fromHeight = shouldAnimate ? modal.getBoundingClientRect().height : 0;

      foDocOverlay?.querySelectorAll("[data-fo-doc-tab]").forEach((t) => t.classList.toggle("active", t.dataset.foDocTab === tab));
      foDocOverlay?.querySelectorAll("[data-fo-doc-panel]").forEach((p) => { p.hidden = p.dataset.foDocPanel !== tab; });
      foDocUpdateSubmit();
      if (!shouldAnimate) return;

      window.clearTimeout(modal._foTabTimer);
      const toHeight = modal.getBoundingClientRect().height;
      if (Math.round(fromHeight) === Math.round(toHeight)) return;

      modal.style.height = `${fromHeight}px`;
      modal.classList.add("is-tab-animating");
      void modal.offsetHeight;
      modal.style.height = `${toHeight}px`;
      modal._foTabTimer = window.setTimeout(() => {
        modal.classList.remove("is-tab-animating");
        modal.style.height = "";
      }, 280);
    }

    function foDocOpenModal(fieldEl, label) {
      if (!foDocOverlay) return;
      foDocModalField = fieldEl;
      foDocModalSelectedLib = null;
      foDocModalPendingFile = null;
      if (foDocUploadPreview) { foDocUploadPreview.innerHTML = ""; foDocUploadPreview.hidden = true; }
      if (foDocFileInput) foDocFileInput.value = "";
      const subtitleEl = foDocOverlay.querySelector("[data-fo-doc-modal-subtitle]");
      if (subtitleEl) subtitleEl.textContent = label || "";
      foDocRenderLibrary("");
      if (foDocSearchInput) foDocSearchInput.value = "";
      /* no MDocs library without MPass: a guest uploads from the device only; so does a Form
         Builder „Fișier” (data-fo-upload-only), with its own types / size in the captions */
      const uploadOnly = Boolean(frontOfficeGuest || fieldEl?.closest("[data-fo-screen='guest']") || fieldEl?.hasAttribute("data-fo-upload-only"));
      if (foDocFileInput) {
        foDocFileInput.dataset.foDefaultAccept ??= foDocFileInput.accept;
        foDocFileInput.accept = fieldEl?.dataset.foDocAccept || foDocFileInput.dataset.foDefaultAccept;
      }
      const captions = foDocOverlay.querySelectorAll(".e-permits-fo-doc-modal__drop-captions > span");
      captions.forEach((span) => { span.dataset.foDefault ??= span.textContent; });
      const [types, size] = (fieldEl?.dataset.foDocLimits || "").split("|");
      if (captions[0]) captions[0].textContent = types ? `${Number(fieldEl.dataset.foDocMax) > 1 ? `Până la ${fieldEl.dataset.foDocMax} fișiere` : "Un singur fișier"}: ${types}` : captions[0].dataset.foDefault;
      if (captions[1]) captions[1].textContent = size ? `Mărime maximă: ${size}` : captions[1].dataset.foDefault;
      const tabs = foDocOverlay.querySelector(".e-permits-fo-doc-modal__tabs");
      if (tabs) tabs.hidden = uploadOnly;
      foDocSwitchTab(uploadOnly ? "upload" : "library", { animate: false });
      setMotionModalHidden(foDocOverlay, false);
      document.body.style.overflow = "hidden";
    }

    function foDocCloseModal() {
      if (!foDocOverlay) return;
      setMotionModalHidden(foDocOverlay, true);
      document.body.style.overflow = "";
      foDocModalField = null;
      foDocModalSelectedLib = null;
      foDocModalPendingFile = null;
    }

    /* a field's value = the shared document card; the card keeps its shape in data-fo-doc (the
       Verificare summary reads it). A fresh upload is titled by its file name (the field label above
       already says the type); a document from the library keeps its type. */
    function foDocAttachFileItem(container, fileName, sizeLabel, extra = {}) {
      /* one file, unless the field allows more (Form Builder „Fișier”, data-fo-doc-max) */
      const docField = container.closest("[data-fo-doc-field]");
      const max = Number(docField?.dataset.foDocMax) || 1;
      const existing = container.querySelectorAll(".e-permits-fo-file-item");
      if (max === 1 || existing.length >= max) existing.forEach((el) => el.remove());
      const syncFull = () => docField?.classList.toggle("is-full", container.querySelectorAll(".e-permits-fo-file-item").length >= max);
      const doc = { sursa: "upload", tip: extra.tip || fileName, fisier: fileName, size: sizeLabel || extra.size || "", at: extra.at || foDocStampNow(), verb: "Încărcat" };
      const item = document.createElement("div");
      item.className = "e-permits-fo-file-item is-uploaded e-permits-fo-doc-attached-item";
      item.dataset.foDoc = JSON.stringify(doc);
      item.innerHTML = `
        ${foDocIconHtml(doc)}
        ${foDocContentHtml({ ...doc, fisier: doc.tip === fileName ? "" : fileName })}
        <button class="e-permits-fo-document-remove e-permits-fo-doc-attached-item__remove" type="button" aria-label="Elimină ${escapeFrontOfficeHtml(fileName)}">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large-16"></use></svg>
        </button>`;
      /* the guest flow reads the file name back */
      if (doc.tip === fileName) item.querySelector(".e-permits-fo-lib-item__title")?.classList.add("e-permits-fo-file-item__name");
      item.querySelector(".e-permits-fo-doc-attached-item__remove").addEventListener("click", () => { item.remove(); syncFull(); });
      container.appendChild(item);
      syncFull();
    }

    function foDocAttachMdocsItem(container, libDoc) {
      container.querySelectorAll(".e-permits-fo-mdocs__attachment").forEach((el) => el.remove());
      const doc = libDoc.sursa && !libDoc.type ? libDoc : foDocFromLibrary(libDoc.type ? libDoc : { type: "emis", ...libDoc });
      const att = document.createElement("div");
      att.className = "e-permits-fo-mdocs__attachment";
      att.dataset.foDoc = JSON.stringify(doc);
      att.innerHTML = `
        ${foDocIconHtml(doc)}
        ${foDocContentHtml(doc, { titleClass: "e-permits-fo-mdocs__attachment-title" })}
        <button class="e-permits-fo-document-remove e-permits-fo-mdocs__attachment-remove" type="button" aria-label="Elimină ${escapeFrontOfficeHtml(doc.tip)}">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large-16"></use></svg>
        </button>`;
      att.querySelector(".e-permits-fo-mdocs__attachment-remove").addEventListener("click", () => att.remove());
      container.appendChild(att);
    }

    if (foDocOverlay) {
      foDocOverlay.querySelector("[data-fo-doc-modal-close]")?.addEventListener("click", foDocCloseModal);
      foDocOverlay.querySelector("[data-fo-doc-modal-cancel]")?.addEventListener("click", foDocCloseModal);
      foDocOverlay.addEventListener("click", (e) => { if (e.target === foDocOverlay) foDocCloseModal(); });

      foDocOverlay.querySelectorAll("[data-fo-doc-tab]").forEach((tab) => {
        tab.addEventListener("click", () => foDocSwitchTab(tab.dataset.foDocTab));
      });

      foDocSearchInput?.addEventListener("input", () => {
        foDocModalSelectedLib = null;
        foDocRenderLibrary(foDocSearchInput.value);
        foDocUpdateSubmit();
      });

      foDocFileInput?.addEventListener("change", () => {
        const file = foDocFileInput.files?.[0];
        if (!file) return;
        foDocModalPendingFile = file;
        if (foDocUploadPreview) {
          foDocUploadPreview.hidden = false;
          const preview = { sursa: "upload", tip: file.name, size: formatFoFileSize(file.size) };
          foDocUploadPreview.innerHTML = `<div class="e-permits-fo-file-item is-uploaded e-permits-fo-doc-modal__preview-item">${foDocIconHtml(preview)}${foDocContentHtml(preview, { titleClass: "e-permits-fo-file-item__name" })}</div>`;
        }
        foDocUpdateSubmit();
      });

      foDocSubmitBtn?.addEventListener("click", () => {
        if (!foDocModalField) return;
        const filesContainer = foDocModalField.querySelector("[data-fo-doc-field-files]");
        if (!filesContainer) return;
        const activePanel = foDocOverlay.querySelector("[data-fo-doc-panel]:not([hidden])");
        if (activePanel?.dataset.foDocPanel === "library" && foDocModalSelectedLib) {
          foDocAttachMdocsItem(filesContainer, foDocModalSelectedLib);
        } else if (activePanel?.dataset.foDocPanel === "upload" && foDocModalPendingFile) {
          foDocAttachFileItem(filesContainer, foDocModalPendingFile.name, formatFoFileSize(foDocModalPendingFile.size));
        }
        foDocCloseModal();
      });
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fo-open-doc-modal]");
      if (!btn) return;
      const fieldEl = btn.closest("[data-fo-doc-field]");
      const label = btn.dataset.foDocLabel || "";
      foDocOpenModal(fieldEl, label);
    });
    // ===== End document picker modal =====

    function applyFrontOfficeStep4DemoFill() {
      const step2Panel = document.querySelector("[data-fo-step-panel='2']");

      const objectNameInput = step2Panel?.querySelector("#fo-object-name");
      if (objectNameInput && !objectNameInput.value.trim()) {
        objectNameInput.value = "Cafeneaua Centrală";
      }

      const unitPhoneInput = step2Panel?.querySelector("#fo-unit-phone, #unit-phone");
      if (unitPhoneInput && !unitPhoneInput.value.trim()) {
        unitPhoneInput.value = "22000000";
      }

      const unitEmailInput = step2Panel?.querySelector("#fo-unit-email, #unit-email");
      if (unitEmailInput && !unitEmailInput.value.trim()) {
        unitEmailInput.value = "contact@vita-plant.md";
      }

      const cascadeRoot = step2Panel?.querySelector("[data-fo-cascade-address]");
      const raionFilled = cascadeRoot?.querySelector("[data-fo-cascade-raion] .e-permits-fo-select__option.is-selected");
      if (cascadeRoot && !raionFilled) {
        const searchRoot = cascadeRoot.querySelector("[data-fo-address-search]");
        searchRoot?.foCascadeAddressFill?.({
          district: "Municipiul Chișinău",
          locality: "Chișinău",
          sector: "Centru",
          street: "bd. Ștefan cel Mare și Sfânt",
          postalCode: "MD-2001",
          house: "1",
        });
      }

      document.querySelectorAll("[data-fo-activity-card]").forEach((card) => {
        if (card.querySelector(".e-permits-fo-caem__option.is-selected")) return;
        const firstOption = card.querySelector(".e-permits-fo-caem__option:not(.is-disabled)");
        firstOption?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      });

      // Demo-fill doc fields in step 3 using new doc-field structure
      const step3Panel = document.querySelector("[data-fo-step-panel='3']");
      if (step3Panel) {
        const propertyFiles = step3Panel.querySelector("[data-fo-doc-field='property-deed'] [data-fo-doc-field-files]");
        if (propertyFiles && !propertyFiles.querySelector(".e-permits-fo-file-item")) {
          foDocAttachFileItem(propertyFiles, "copia-actului-de-proprietate.pdf", "1.8 MB");
        }
        const floorFiles = step3Panel.querySelector("[data-fo-doc-field='floor-plan'] [data-fo-doc-field-files]");
        if (floorFiles && !floorFiles.querySelector(".e-permits-fo-file-item")) {
          foDocAttachFileItem(floorFiles, "planul-incaperilor.pdf", "2.7 MB");
        }
        const extrasFiles = step3Panel.querySelector("[data-fo-doc-field='state-registry-extract'] [data-fo-doc-field-files], [data-fo-doc-field='extras-registru'] [data-fo-doc-field-files]");
        /* MDocs needs an account: a guest's demo fill has no MDocs document */
        if (extrasFiles && !frontOfficeGuest && !extrasFiles.querySelector(".e-permits-fo-mdocs__attachment")) {
          foDocAttachMdocsItem(extrasFiles, { title: 'Extras Registru de Stat - "Global Trader" SRL', emis: "12.03.2026", authority: "ASP" });
        }
        const hygieneFiles = step3Panel.querySelector("[data-fo-doc-field='hygiene-certificates'] [data-fo-doc-field-files], [data-fo-doc-field='hygiene-cert'] [data-fo-doc-field-files]");
        if (hygieneFiles && !hygieneFiles.querySelector(".e-permits-fo-file-item")) {
          foDocAttachFileItem(hygieneFiles, "certificate-instruire-igienica.pdf", "940 KB");
        }
      }
    }

    function populateFrontOfficeStep4() {
      if (frontOfficePostprocess) { renderPostprocessReview(); return; }
      const panel = document.querySelector("[data-fo-step-panel='4']");
      if (!panel) return;
      panel.querySelector(".e-permits-fo-infobox")?.remove();
      const container = panel.querySelector("[data-fo-review-sections]");
      if (!container) return;

      applyFrontOfficeStep4DemoFill();

      const subject = frontOfficeSelectedSubject;
      const user = frontOfficeSchema?.authenticatedUser;
      const step2Panel = document.querySelector("[data-fo-step-panel='2']");

      // --- Applicant rows ---
      let applicantRows = "";
      if (subject) {
        const representative = subject.representative || (subject.type === "PJ" ? user : null);
        const notificationContact = subject.contact || user?.contact || {};
        const notificationPhone = String(notificationContact.phone || "+37322000000").replace(/\s+/g, "");
        const formattedNotificationPhone = notificationPhone.startsWith("+") ? notificationPhone : `+373${notificationPhone}`;

        applicantRows += summaryRow("Solicitant", [
          escapeFrontOfficeHtml(subject.name),
          escapeFrontOfficeHtml(`${subject.idLabel} ${subject.idValue}`),
        ]);
        if (representative) {
          applicantRows += summaryRow("Reprezentant", [
            escapeFrontOfficeHtml(representative.name),
            escapeFrontOfficeHtml(`${representative.idLabel} ${representative.idValue}`),
          ]);
        }
        applicantRows += summaryRow("Date de contact pentru notificări", [
          escapeFrontOfficeHtml(formattedNotificationPhone),
          escapeFrontOfficeHtml(notificationContact.email || "a.cojocaru1993@gmail.com"),
        ]);
      }

      // --- Service rows ---
      const objectName = step2Panel?.querySelector("#fo-object-name")?.value?.trim() || "—";

      const raion = step2Panel?.querySelector("[data-fo-cascade-raion] [data-fo-select-value]")?.textContent?.trim();
      const localitate = step2Panel?.querySelector("[data-fo-cascade-localitate] [data-fo-select-value]")?.textContent?.trim();
      const strada = step2Panel?.querySelector("[data-fo-cascade-strada] [data-fo-select-value]")?.textContent?.trim();
      const house = step2Panel?.querySelector("[data-fo-address-part='house']")?.value?.trim();
      const postal = step2Panel?.querySelector("[data-fo-address-part='postalCode']")?.value?.trim();
      const addressParts = [
        strada && house ? `${strada} ${house}` : strada || "",
        postal && localitate ? `${postal}, ${localitate}` : localitate || "",
        raion || "",
      ].filter(Boolean);
      const addressDisplay = addressParts.join(", ") || "—";

      const selfCard = step2Panel?.querySelector("[data-fo-contact-self]");
      const otherCard = step2Panel?.querySelector("[data-fo-contact-other]");
      const useSelf = !otherCard || otherCard.hidden;
      let contactName = "—";
      let contactPhone = "—";
      let unitPhone = "—";
      let unitEmail = "—";
      const unitPhoneField = step2Panel?.querySelector("#fo-unit-phone, #unit-phone, input[type='tel']");
      const unitPhoneCode = unitPhoneField?.closest(".e-permits-fo-phone")?.querySelector("[data-fo-phone-code-value]")?.textContent?.trim() || "+373";
      if (unitPhoneField?.value?.trim()) unitPhone = `${unitPhoneCode}${unitPhoneField.value.trim().replace(/\s+/g, "")}`;
      const unitEmailField = step2Panel?.querySelector("#fo-unit-email, #unit-email, input[type='email']");
      if (unitEmailField?.value?.trim()) unitEmail = unitEmailField.value.trim();

      if (useSelf && selfCard) {
        contactName = frontOfficeGuest ? (frontOfficeGuest.name || "—") : user ? (user.contactName || user.name) : "—";
        const code = selfCard.querySelector("[data-fo-phone-code-value]")?.textContent?.trim() || "+373";
        const num = selfCard.querySelector(".e-permits-fo-phone__value")?.textContent?.trim() || "";
        const normalizedNum = num.replace(/\s+/g, "");
        contactPhone = normalizedNum ? (normalizedNum.startsWith("+") ? normalizedNum : `${code}${normalizedNum}`) : (user?.phone || "—");
      } else if (otherCard) {
        const fn = otherCard.querySelector("#contact-first-name")?.value?.trim() || "";
        const ln = otherCard.querySelector("#contact-last-name")?.value?.trim() || "";
        contactName = [fn, ln].filter(Boolean).join(" ") || "—";
        const code = otherCard.querySelector("[data-fo-phone-code-value]")?.textContent?.trim() || "+373";
        const num = otherCard.querySelector("input[type='tel'], .e-permits-fo-phone__number")?.value?.trim() || "";
        contactPhone = num ? `${code}${num.replace(/\s+/g, "")}` : "—";
      }

      let serviceRows = summaryRow("Denumirea obiectului", [escapeFrontOfficeHtml(objectName)]);
      serviceRows += summaryRow("Adresa", [escapeFrontOfficeHtml(addressDisplay)]);
      /* US-54 AC-18: the cadastral code travels with the address */
      const cadastralCode = step2Panel?.querySelector("[data-fo-address-part='cadastralCode']")?.value?.trim();
      if (cadastralCode) serviceRows += summaryRow("Cod cadastral", [escapeFrontOfficeHtml(cadastralCode)]);
      serviceRows += summaryRow("Contact unitate", [
        escapeFrontOfficeHtml(unitPhone),
        escapeFrontOfficeHtml(unitEmail),
      ]);
      serviceRows += summaryRow("Persoana de contact", [
        escapeFrontOfficeHtml(contactName),
        escapeFrontOfficeHtml(contactPhone),
      ]);

      // CAEM
      const activityCards = Array.from(document.querySelectorAll("[data-fo-activity-card]"));
      const caemItems = activityCards
        .map((card, i) => {
          const sel = card.querySelector(".e-permits-fo-caem__option.is-selected");
          if (!sel) return null;
          const subgenLabels = Array.from(card.querySelectorAll(".e-permits-fo-subgen-chip__label"))
            .map((el) => el.textContent?.trim())
            .filter(Boolean);
          return { n: i + 1, code: sel.dataset.code || "", label: sel.dataset.label || "", subgenres: subgenLabels };
        })
        .filter(Boolean);
      if (caemItems.length === 1) {
        caemItems.push({ n: 2, code: "I 56.30", label: "Baruri", subgenres: ["Bar"] });
      }

      let caemHtml = "";
      if (caemItems.length) {
        const dot = `<span class="e-permits-fo-summary-dot" aria-hidden="true"></span>`;
        const itemsHtml = caemItems
          .map((item) => {
            let h = `<div class="e-permits-fo-summary-caem__item"><div class="e-permits-fo-summary-caem__entry"><span class="e-permits-fo-summary-caem__entry-label">${escapeFrontOfficeHtml(String(item.n))}.</span><span class="e-permits-fo-summary-caem__entry-value">${escapeFrontOfficeHtml(item.code)} – ${escapeFrontOfficeHtml(item.label)}</span></div>`;
            if (item.subgenres.length) {
              h += `${dot}<div class="e-permits-fo-summary-caem__entry"><span class="e-permits-fo-summary-caem__entry-label">Subgenuri:</span><span class="e-permits-fo-summary-caem__entry-value">${escapeFrontOfficeHtml(item.subgenres.join(", "))}</span></div>`;
            }
            h += `</div>`;
            return h;
          })
          .join("");
        caemHtml = `<div class="e-permits-fo-summary-caem"><h3 class="e-permits-fo-summary-caem__heading">Activități CAEM</h3>${itemsHtml}</div>`;
      }

      // --- Documents ---
      let docsHtml = foSummaryDocsHtml(document.querySelector("[data-fo-step-panel='3']"));

      if (!docsHtml) {
        docsHtml = window.GEAPEmptyState.render({ title: "Nu au fost adăugate documente", text: "Le poți încărca la pasul Documente însoțitoare.", icon: "document", compact: true });
      }

      container.innerHTML = `
        <div class="e-permits-fo-summary-section e-permits-fo-summary-section--applicant">
          <div class="e-permits-fo-summary-section__header">
            <h2 class="e-permits-fo-summary-section__heading">Date solicitant</h2>
          </div>
          <div class="e-permits-fo-summary-card">${applicantRows}</div>
        </div>
        <div class="e-permits-fo-summary-section">
          <div class="e-permits-fo-summary-section__header">
            <h2 class="e-permits-fo-summary-section__heading">Detalii serviciu</h2>
            ${summaryEditButton(2, "Editează detaliile serviciului")}
          </div>
          <div class="e-permits-fo-summary-card">${serviceRows}${caemHtml}</div>
        </div>
        <div class="e-permits-fo-summary-section">
          <div class="e-permits-fo-summary-section__header">
            <h2 class="e-permits-fo-summary-section__heading">Documente însoțitoare</h2>
            ${summaryEditButton(3, "Editează documentele însoțitoare")}
          </div>
          <div class="e-permits-fo-summary-docs">${docsHtml}</div>
        </div>
      `;

      const footer = panel.querySelector(".e-permits-fo-form__footer");
      if (footer) {
        footer.innerHTML = `
          <div class="e-permits-fo-form__actions e-permits-fo-form__actions--confirmation">
            <button class="e-permits-fo-draft-button" type="button">
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" aria-hidden="true">
                      <use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use>
                    </svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary e-permits-fo-form__actions-primary--sign">
              <button class="e-permits-fo-back-button" type="button" aria-label="Înapoi la Documente însoțitoare" data-fo-prev="step-4">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
              </button>
              <button class="btn btn-badge btn-badge--primary btn-badge--msign e-permits-fo-sign-button" type="button" data-fo-next="step-4">
                <span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-sign.svg" alt=""></span>
                <span class="btn-badge__label">Semnează prin msign</span>
              </button>
            </div>
          </div>
        `;
      }

    }

    frontOfficeAvatarTrigger?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFrontOfficeAvatarMenu();
    });

    frontOfficeAvatarDropdown
      ?.querySelector(".e-permits-fo-avatar-menu__content")
      ?.addEventListener("scroll", updateFrontOfficeAvatarMenuScrollState, { passive: true });

    frontOfficeAvatarDropdown?.addEventListener("click", (event) => {
      const proxyToggle = event.target.closest("[data-fo-avatar-proxy-toggle]");
      if (proxyToggle) {
        event.preventDefault();
        const group = proxyToggle.closest(".e-permits-fo-avatar-menu__group");
        const label = proxyToggle.querySelector("[data-fo-avatar-proxy-label]");
        const isExpanded = !group?.classList.contains("is-expanded");
        group?.classList.toggle("is-expanded", isExpanded);
        proxyToggle.setAttribute("aria-expanded", String(isExpanded));
        if (label) label.textContent = isExpanded ? "Arată mai puține" : "Arată mai multe";
        requestAnimationFrame(updateFrontOfficeAvatarMenuScrollState);
        return;
      }

      const roleButton = event.target.closest("[data-fo-avatar-role]");
      if (!roleButton) return;
      event.preventDefault();
      const subjectId = roleButton.dataset.foSubjectId;
      if (subjectId && subjectId !== frontOfficeSelectedSubject?.id && !requestFrontOfficeInstanceSwitch({ targetSubjectId: subjectId })) return;
      const selected = selectFrontOfficeSubject(subjectId);
      if (selected) {
        setFrontOfficeAvatarMenuOpen(false);
      }
    });

    frontOfficeInstanceSwitchModal?.addEventListener("click", (event) => {
      const cancelButton = event.target.closest("[data-fo-instance-switch-cancel]");
      const confirmButton = event.target.closest("[data-fo-instance-switch-confirm]");
      if (cancelButton || event.target === frontOfficeInstanceSwitchModal) {
        event.preventDefault();
        setFrontOfficeInstanceSwitchModalOpen(false);
        return;
      }
      if (confirmButton) {
        event.preventDefault();
        confirmFrontOfficeInstanceSwitch();
      }
    });

    document.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-fo-copy-value]");
      if (!copyButton) return;
      event.preventDefault();
      event.stopPropagation();

      window.clearTimeout(copyButton._foCopyTimer);
      try {
        await copyText(copyButton.dataset.foCopyValue || copyButton.textContent.trim());
        copyButton.classList.add("is-copied");
        copyButton.setAttribute("aria-label", "Copiat");
        copyButton._foCopyTimer = window.setTimeout(() => {
          copyButton.classList.remove("is-copied");
          const text = copyButton.querySelector("span")?.textContent?.trim() || "";
          copyButton.setAttribute("aria-label", text ? `Copiază ${text}` : "Copiază");
        }, 1500);
      } catch {
        copyButton.classList.remove("is-copied");
      }
    });

    document.addEventListener("click", (event) => {
      if (!frontOfficeAvatarMenu?.classList.contains("is-open")) return;
      if (frontOfficeAvatarMenu.contains(event.target)) return;
      setFrontOfficeAvatarMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && frontOfficeInstanceSwitchModal && !frontOfficeInstanceSwitchModal.hidden) {
        event.preventDefault();
        setFrontOfficeInstanceSwitchModalOpen(false);
        return;
      }
      if (event.key !== "Escape" || !frontOfficeAvatarMenu?.classList.contains("is-open")) return;
      setFrontOfficeAvatarMenuOpen(false);
      frontOfficeAvatarTrigger?.focus();
    });

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-fo-edit-step]");
      if (!editButton) return;
      const step = Number(editButton.dataset.foEditStep);
      if (!step) return;
      if (frontOfficeGuest && step === 1) {
        showFrontOfficeGuest({ reset: false });
        return;
      }
      const hash = step === 1 ? "#request" : `#request-step-${step}`;
      if (window.location.hash !== hash) history.replaceState(null, "", hash);
      showFrontOfficeRequest({ step });
    });

    document.addEventListener("click", (event) => {
      const draftButton = event.target.closest(".e-permits-fo-draft-button");
      if (!draftButton) return;
      event.preventDefault();
      saveFrontOfficeDraft({ toast: true });
    });

    document.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-fo-draft-info-close]");
      if (!closeButton) return;
      event.preventDefault();
      frontOfficeDraftInfoDismissed = true;
      updateFrontOfficeRequestHeaders();
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-fo-back-choice]");
      if (!button) return;
      event.preventDefault();
      if (!requestFrontOfficeInstanceSwitch()) return;
      if (window.location.hash !== "#choice") {
        history.replaceState(null, "", "#choice");
      }
      showFrontOfficeChoice();
    });

    frontOfficeConsent?.addEventListener("change", () => {
      if (!frontOfficeStep1NextButton) return;
      frontOfficeStep1NextButton.disabled = !frontOfficeConsent.checked;
    });

    document.addEventListener("click", (event) => {
      const next = event.target.closest("[data-fo-next]");
      const prev = event.target.closest("[data-fo-prev]");
      if (!next && !prev) return;
      if (next?.disabled || prev?.disabled) return;

      const action = next?.dataset.foNext || prev?.dataset.foPrev;
      if (action === "step-1") {
        saveFrontOfficeDraft();
        if (window.location.hash !== "#request-step-2") history.replaceState(null, "", "#request-step-2");
        showFrontOfficeRequest({ step: 2 });
      }
      if (action === "step-2" && next) {
        saveFrontOfficeDraft();
        if (window.location.hash !== "#request-step-3") history.replaceState(null, "", "#request-step-3");
        showFrontOfficeRequest({ step: 3 });
      }
      if (action === "step-2" && prev) {
        event.preventDefault();
        if (window.location.hash !== "#request-step-2") history.replaceState(null, "", "#request-step-2");
        showFrontOfficeRequest({ step: 2 });
      }
      if (action === "step-3" && next) {
        saveFrontOfficeDraft();
        populateFrontOfficeStep4();
        if (window.location.hash !== "#request-step-4") history.replaceState(null, "", "#request-step-4");
        showFrontOfficeRequest({ step: 4 });
      }
      if (action === "step-3" && prev) {
        if (window.location.hash !== "#request-step-2") history.replaceState(null, "", "#request-step-2");
        showFrontOfficeRequest({ step: 2 });
      }
      if (action === "step-4" && prev) {
        if (window.location.hash !== "#request-step-3") history.replaceState(null, "", "#request-step-3");
        showFrontOfficeRequest({ step: 3 });
      }
      if (action === "step-4" && next) {
        saveFrontOfficeDraft();
        if (window.location.hash !== "#request-step-5") history.replaceState(null, "", "#request-step-5");
        showFrontOfficeRequest({ step: 5 });
      }
      if (action === "step-5" && prev) {
        populateFrontOfficeStep4();
        if (window.location.hash !== "#request-step-4") history.replaceState(null, "", "#request-step-4");
        showFrontOfficeRequest({ step: 4 });
      }
      if (action === "step-5" && next) {
        saveFrontOfficeDraft();
        if (window.location.hash !== "#request-step-6") history.replaceState(null, "", "#request-step-6");
        showFrontOfficeRequest({ step: 6 });
      }
      if (action === "step-6" && prev) {
        if (window.location.hash !== "#request-step-5") history.replaceState(null, "", "#request-step-5");
        showFrontOfficeRequest({ step: 5 });
      }
    });

    function syncContactPersonGroup(group) {
      if (!group || group.dataset.foContactBound === "true") return;
      group.dataset.foContactBound = "true";
      const selfCard = group.parentElement?.querySelector("[data-fo-contact-self]");
      const otherCard = group.parentElement?.querySelector("[data-fo-contact-other]");
      const radios = Array.from(group.querySelectorAll("input[type='radio']"));
      if (!selfCard || !otherCard || !radios.length) return;

      function syncContactPerson() {
        const selected = radios.find((radio) => radio.checked);
        const isOther = selected?.value === "other";
        selfCard.hidden = isOther;
        otherCard.hidden = !isOther;
      }

      radios.forEach((radio) => {
        radio.addEventListener("change", syncContactPerson);
      });
      syncContactPerson();
    }

    document.querySelectorAll("[data-fo-contact-person]").forEach(syncContactPersonGroup);

    document.addEventListener("click", (event) => {
      const field = event.target.closest(".e-permits-fo-input:not(.is-readonly), .e-permits-fo-phone--editable, .e-permits-fo-textarea");
      if (!field || event.target.closest("button, [role='option']")) return;
      const control = field.querySelector("input, textarea, select");
      if (!control || event.target === control || control.disabled) return;
      control.focus();
    });

    function bindPhoneCode(phoneRoot) {
      if (!phoneRoot || phoneRoot.dataset.foPhoneCodeBound === "true") return;
      phoneRoot.dataset.foPhoneCodeBound = "true";
      const button = phoneRoot.querySelector("[data-fo-phone-code-button]");
      const flag = phoneRoot.querySelector("[data-fo-phone-code-flag]");
      const value = phoneRoot.querySelector("[data-fo-phone-code-value]");
      const list = phoneRoot.querySelector("[data-fo-phone-code-list]");
      const options = Array.from(phoneRoot.querySelectorAll(".e-permits-fo-phone__code-option"));
      if (!button || !flag || !value || !list || !options.length) return;

      let activeIndex = Math.max(0, options.findIndex((option) => option.classList.contains("is-selected")));

      function setOpen(isOpen) {
        phoneRoot.classList.toggle("is-code-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        setDropdownHidden(list, !isOpen);
        if (isOpen) setActive(activeIndex);
      }

      function setActive(index) {
        activeIndex = (index + options.length) % options.length;
        options.forEach((option, optionIndex) => {
          option.classList.toggle("is-active", optionIndex === activeIndex);
        });
      }

      function selectOption(option) {
        options.forEach((item) => {
          const isSelected = item === option;
          item.classList.toggle("is-selected", isSelected);
          item.setAttribute("aria-selected", String(isSelected));
        });
        flag.textContent = option.dataset.flag || "";
        value.textContent = option.dataset.code || "";
        activeIndex = options.indexOf(option);
        setOpen(false);
        button.focus();
      }

      button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (list.hidden) {
            setOpen(true);
            return;
          }
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (list.hidden) setOpen(true);
          else selectOption(options[activeIndex]);
        }
        if (event.key === "Escape") {
          setOpen(false);
        }
      });

      options.forEach((option, index) => {
        option.addEventListener("mouseenter", () => setActive(index));
        option.addEventListener("click", () => selectOption(option));
      });

      document.addEventListener("click", (event) => {
        if (!phoneRoot.contains(event.target)) setOpen(false);
      });
    }

    document.querySelectorAll("[data-fo-phone-code]").forEach(bindPhoneCode);

    function bindAddressSearch(searchRoot) {
      if (!searchRoot || searchRoot.dataset.foAddressBound === "true") return;
      searchRoot.dataset.foAddressBound = "true";
      const input = searchRoot.querySelector("[data-fo-address-input]");
      const list = searchRoot.querySelector("[data-fo-address-list]");
      const fieldRoot = searchRoot.closest(".e-permits-fo-field");
      const partInputs = Array.from(fieldRoot?.querySelectorAll("[data-fo-address-part]") || []);
      if (!input || !list) return;
      const suggestionIdBase = `fo-address-suggestion-${Math.random().toString(16).slice(2)}`;

      const fallbackAddresses = [
        { title: "Strada Calea Ieșilor 80, ap. 12", meta: "Chișinău, Moldova", value: "Strada Calea Ieșilor 80, ap. 12, Chișinău, Moldova", country: "Moldova", district: "Municipiul Chișinău", locality: "Chișinău", sector: "Buiucani", street: "Calea Ieșilor", postalCode: "MD-2069", house: "80", block: "A", stair: "2", floor: "4", apartment: "12" },
        { title: "Bulevardul Ștefan cel Mare și Sfânt 134", meta: "Chișinău, Moldova", value: "Bulevardul Ștefan cel Mare și Sfânt 134, Chișinău, Moldova", country: "Moldova", district: "Municipiul Chișinău", locality: "Chișinău", sector: "Centru", street: "Bulevardul Ștefan cel Mare și Sfânt", postalCode: "MD-2012", house: "134", block: "", stair: "", floor: "1", apartment: "" },
        { title: "Strada București 68, of. 24", meta: "Chișinău, Moldova", value: "Strada București 68, of. 24, Chișinău, Moldova", country: "Moldova", district: "Municipiul Chișinău", locality: "Chișinău", sector: "Centru", street: "Strada București", postalCode: "MD-2012", house: "68", block: "", stair: "1", floor: "3", apartment: "24" },
        { title: "Strada Alexandru cel Bun 83", meta: "Chișinău, Moldova", value: "Strada Alexandru cel Bun 83, Chișinău, Moldova", country: "Moldova", district: "Municipiul Chișinău", locality: "Chișinău", sector: "Centru", street: "Strada Alexandru cel Bun", postalCode: "MD-2012", house: "83", block: "", stair: "", floor: "0", apartment: "" },
        { title: "Bulevardul Dacia 49, ap. 8", meta: "Chișinău, Moldova", value: "Bulevardul Dacia 49, ap. 8, Chișinău, Moldova", country: "Moldova", district: "Municipiul Chișinău", locality: "Chișinău", sector: "Botanica", street: "Bulevardul Dacia", postalCode: "MD-2060", house: "49", block: "B", stair: "3", floor: "2", apartment: "8" },
        { title: "Calea Ieșilor 80", meta: "Bălți, Moldova", value: "Calea Ieșilor 80, Bălți, Moldova", country: "Moldova", district: "Municipiul Bălți", locality: "Bălți", street: "Calea Ieșilor", postalCode: "MD-3100", house: "80", block: "", stair: "", floor: "0", apartment: "" },
        { title: "Strada Independenței 6/1", meta: "Ungheni, Moldova", value: "Strada Independenței 6/1, Ungheni, Moldova", country: "Moldova", district: "Raionul Ungheni", locality: "Ungheni", street: "Strada Independenței", postalCode: "MD-3600", house: "6/1", block: "", stair: "", floor: "0", apartment: "" },
        { title: "Strada Alecu Russo 15", meta: "Orhei, Moldova", value: "Strada Alecu Russo 15, Orhei, Moldova", country: "Moldova", district: "Raionul Orhei", locality: "Orhei", street: "Strada Alecu Russo", postalCode: "MD-3505", house: "15", block: "", stair: "", floor: "0", apartment: "" },
        { title: "Strada Mihai Eminescu 49", meta: "Cahul, Moldova", value: "Strada Mihai Eminescu 49, Cahul, Moldova", country: "Moldova", district: "Raionul Cahul", locality: "Cahul", street: "Strada Mihai Eminescu", postalCode: "MD-3909", house: "49", block: "", stair: "", floor: "0", apartment: "" },
      ];
      let addresses = fallbackAddresses;
      try {
        const schemaAddresses = JSON.parse(searchRoot.dataset.foAddresses || "[]");
        if (Array.isArray(schemaAddresses) && schemaAddresses.length) addresses = schemaAddresses;
      } catch (error) {
        addresses = fallbackAddresses;
      }

      let activeIndex = 0;
      let hasSelectedAddress = false;
      let visibleAddresses = addresses.slice(0, 2);
      const searchTrigger = searchRoot.querySelector(".search-input, .e-permits-fo-input") || input;
      /* a value set from the list: the library search input shows its × (js/search.js only reacts to typing) */
      const syncSearchValue = () => {
        const box = input.closest(".search-input");
        box?.classList.toggle("has-value", Boolean(input.value));
        box?.classList.toggle("is-ready", Boolean(input.value));
      };
      const syncFloating = () => {
        if (!list.hidden) positionFloatingSelectList(searchTrigger, list, searchRoot);
      };

      function setPartEnabled(inputNode, isEnabled) {
        if (!inputNode || inputNode.dataset.foAddressPart === "country") return;
        if ("disabled" in inputNode) inputNode.disabled = !isEnabled;
        const selectRoot = inputNode.closest("[data-fo-select]");
        const selectButton = selectRoot?.querySelector(".e-permits-fo-select__button");
        if (selectButton) {
          selectButton.disabled = !isEnabled;
          selectRoot.classList.toggle("is-disabled", !isEnabled);
        }
      }

      function setPartValue(part, value) {
        if (!part) return;
        if ("value" in part) {
          part.value = value;
          return;
        }
        const placeholder = part.dataset.placeholder || "";
        part.textContent = value || placeholder;
        part.classList.toggle("e-permits-fo-select__value--placeholder", !value);
        const selectRoot = part.closest("[data-fo-select]");
        const options = Array.from(selectRoot?.querySelectorAll(".e-permits-fo-select__option") || []);
        options.forEach((option) => {
          const isSelected = Boolean(value) && option.textContent.trim() === value;
          option.classList.toggle("is-selected", isSelected);
          option.setAttribute("aria-selected", String(isSelected));
        });
      }

      function resetAddressParts() {
        partInputs.forEach((part) => {
          if (part.dataset.foAddressPart === "country") {
            setPartValue(part, "Moldova");
            return;
          }
          setPartValue(part, "");
          setPartEnabled(part, !["locality", "street", "postalCode"].includes(part.dataset.foAddressPart));
        });
      }

      function fillAddressParts(item) {
        partInputs.forEach((part) => {
          const key = part.dataset.foAddressPart;
          setPartValue(part, item[key] || "");
          setPartEnabled(part, true);
        });
      }

      function setOpen(isOpen) {
        setDropdownHidden(list, !isOpen);
        input.setAttribute("aria-expanded", String(isOpen));
        searchRoot.classList.toggle("is-open", isOpen);
        if (isOpen) {
          requestAnimationFrame(syncFloating);
          window.addEventListener("resize", syncFloating);
          document.addEventListener("scroll", syncFloating, true);
        } else {
          window.removeEventListener("resize", syncFloating);
          document.removeEventListener("scroll", syncFloating, true);
          resetFloatingSelectList(list, searchRoot);
        }
      }

      function renderSuggestions(items, { empty = "" } = {}) {
        visibleAddresses = items;
        activeIndex = 0;
        list.innerHTML = "";

        if (!items.length) {
          /* US-54 AC-08: the saved-codes list says so when there are none */
          if (empty) {
            list.innerHTML = `<li role="presentation">${window.GEAPEmptyState.render({ text: empty, icon: "home-line", bare: true, compact: true })}</li>`;
            input.removeAttribute("aria-activedescendant");
            setOpen(true);
            return;
          }
          setOpen(false);
          return;
        }

        items.forEach((item, index) => {
          const option = document.createElement("li");
          option.className = "e-permits-fo-address-search__option";
          option.classList.toggle("is-active", index === activeIndex);
          option.id = `${suggestionIdBase}-${index}`;
          option.role = "option";
          option.tabIndex = -1;
          option.innerHTML = `
            <svg class="icon" width="16" height="16" aria-hidden="true">
              <use href="assets/icons/sprite.svg#${item.icon || "icon-map-pin"}"></use>
            </svg>
            <span class="e-permits-fo-address-search__copy">
              <span class="e-permits-fo-address-search__title"></span>
              <span class="e-permits-fo-address-search__meta"></span>
            </span>
          `;
          option.querySelector(".e-permits-fo-address-search__title").textContent = item.title;
          option.querySelector(".e-permits-fo-address-search__meta").textContent = item.meta;
          /* a long meta is cut with an ellipsis (narrow screens): the full text on hover */
          option.title = item.meta ? `${item.title} — ${item.meta}` : item.title;
          option.addEventListener("mouseenter", () => setActive(index));
          option.addEventListener("mousedown", (event) => {
            event.preventDefault();
            chooseAddress(index);
          });
          list.appendChild(option);
        });

        setOpen(true);
        updateActiveDescendant();
      }

      function updateActiveDescendant() {
        Array.from(list.children).forEach((option, index) => {
          option.classList.toggle("is-active", index === activeIndex);
        });
        input.setAttribute("aria-activedescendant", `${suggestionIdBase}-${activeIndex}`);
      }

      function setActive(index) {
        if (!visibleAddresses.length) return;
        activeIndex = (index + visibleAddresses.length) % visibleAddresses.length;
        updateActiveDescendant();
      }

      function filterAddresses() {
        /* US-54: with „Cod cadastral” on, the empty field lists only the applicant's saved
           cadastral codes; a code being typed narrows them; any other text searches addresses */
        const cadastral = searchRoot.foCadastral;
        const raw = input.value.trim();
        if (cadastral && !raw) {
          renderSuggestions(cadastral.savedCodes(), { empty: "Nu aveți coduri cadastrale salvate. Codurile folosite în cererile dvs. apar aici." });
          return;
        }
        /* a code typed here is sent only on request: the first row says so explicitly
           („Caută codul cadastral «…»”, Enter picks it), then the saved codes that match */
        if (cadastral && cadastral.isCode(raw)) {
          renderSuggestions([
            { action: "cadastral-search", code: raw, title: `Caută codul cadastral «${raw}»`, meta: "în Registrul de Stat al Bunurilor Imobile", icon: "icon-search" },
            ...cadastral.savedCodes().filter((item) => item.code.startsWith(raw) && item.code !== raw),
          ]);
          return;
        }
        const query = raw.toLocaleLowerCase("ro");
        if (!query) {
          renderSuggestions(addresses.slice(0, 2));
          return;
        }

        renderSuggestions(
          addresses.filter((item) => `${item.title} ${item.meta} ${item.value}`.toLocaleLowerCase("ro").includes(query)).slice(0, 5)
        );
      }

      function chooseAddress(index) {
        const item = visibleAddresses[index];
        if (!item) return;
        if (item.action === "cadastral-search") {
          hasSelectedAddress = true;
          setOpen(false);
          input.removeAttribute("aria-activedescendant");
          searchRoot.foCadastral?.search(item.code);
          return;
        }
        if (item.cadastral) {
          input.value = item.code;
          syncSearchValue();
          hasSelectedAddress = true;
          setOpen(false);
          input.removeAttribute("aria-activedescendant");
          searchRoot.foCadastral?.choose(item.code);
          return;
        }
        input.value = item.value;
        syncSearchValue();
        hasSelectedAddress = true;
        setOpen(false);
        input.removeAttribute("aria-activedescendant");
        fillAddressParts(item);
        searchRoot.foCascadeAddressFill?.(item);
        input.focus();
      }

      input.addEventListener("focus", () => {
        if (hasSelectedAddress) {
          setOpen(false);
          return;
        }
        filterAddresses();
      });
      input.addEventListener("input", () => {
        hasSelectedAddress = false;
        /* US-54: a code being typed keeps an earlier SRRE fill until the next request */
        if (!searchRoot.foCadastral?.isCode(input.value.trim())) resetAddressParts();
        searchRoot.foCadastral?.onInput(input.value);
        filterAddresses();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (list.hidden) {
            filterAddresses();
            return;
          }
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter" && !list.hidden) {
          event.preventDefault();
          chooseAddress(activeIndex);
        }
        if (event.key === "Escape") {
          setOpen(false);
          input.removeAttribute("aria-activedescendant");
        }
      });

      document.addEventListener("click", (event) => {
        if (!searchRoot.contains(event.target)) {
          setOpen(false);
          input.removeAttribute("aria-activedescendant");
        }
      });
    }

    document.querySelectorAll("[data-fo-address-search]").forEach(bindAddressSearch);

    function bindFoSelect(selectRoot) {
      if (!selectRoot || selectRoot.dataset.foSelectBound === "true") return;
      selectRoot.dataset.foSelectBound = "true";
      const button = selectRoot.querySelector(".e-permits-fo-select__button");
      const value = selectRoot.querySelector("[data-fo-select-value]");
      const list = selectRoot.querySelector(".e-permits-fo-select__list");
      const options = Array.from(selectRoot.querySelectorAll(".e-permits-fo-select__option"));
      if (!button || !value || !list || !options.length) return;

      let activeIndex = Math.max(0, options.findIndex((option) => option.classList.contains("is-selected")));
      const syncFloating = () => {
        if (!list.hidden) positionFloatingSelectList(button, list, selectRoot);
      };

      function setOpen(isOpen) {
        if (button.disabled) isOpen = false;
        selectRoot.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        setDropdownHidden(list, !isOpen);
        if (isOpen) {
          setActive(activeIndex);
          requestAnimationFrame(syncFloating);
          window.addEventListener("resize", syncFloating);
          document.addEventListener("scroll", syncFloating, true);
        } else {
          window.removeEventListener("resize", syncFloating);
          document.removeEventListener("scroll", syncFloating, true);
          resetFloatingSelectList(list, selectRoot);
        }
      }

      function setActive(index) {
        activeIndex = (index + options.length) % options.length;
        options.forEach((option, optionIndex) => {
          option.classList.toggle("is-active", optionIndex === activeIndex);
        });
      }

      function selectOption(option) {
        /* a disabled option (grid group rule, US-36 AC-04) is listed, not chosen */
        if (!option || option.getAttribute("aria-disabled") === "true") return;
        options.forEach((item) => {
          const isSelected = item === option;
          item.classList.toggle("is-selected", isSelected);
          item.setAttribute("aria-selected", String(isSelected));
        });
        value.textContent = option.textContent.trim();
        value.title = value.textContent;
        value.classList.remove("e-permits-fo-select__value--placeholder");
        activeIndex = options.indexOf(option);
        setOpen(false);
        button.focus();
        selectRoot.dispatchEvent(new CustomEvent("fo-select-change", { bubbles: true, detail: { value: value.textContent } }));
      }

      button.addEventListener("click", () => {
        if (button.disabled) return;
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });

      button.addEventListener("keydown", (event) => {
        if (button.disabled) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (list.hidden) {
            setOpen(true);
            return;
          }
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (list.hidden) setOpen(true);
          else selectOption(options[activeIndex]);
        }
        if (event.key === "Escape") {
          setOpen(false);
        }
      });

      options.forEach((option, index) => {
        option.addEventListener("mouseenter", () => setActive(index));
        option.addEventListener("click", () => selectOption(option));
      });

      document.addEventListener("click", (event) => {
        if (!selectRoot.contains(event.target)) setOpen(false);
      });
    }

    document.querySelectorAll("[data-fo-select]").forEach(bindFoSelect);

    function normalizeComboboxText(value) {
      return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("ro")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function compactComboboxText(value) {
      return normalizeComboboxText(value).replace(/\s+/g, "");
    }

    function syncActivityCards() {
      const cards = Array.from(document.querySelectorAll("[data-fo-activity-card]"));
      const selectedCodes = cards
        .map((card) => card.querySelector(".e-permits-fo-caem__option.is-selected")?.dataset.code)
        .filter(Boolean);

      cards.forEach((card, index) => {
        card.querySelector("[data-fo-activity-index]").textContent = `#${index + 1}`;
        card.querySelector("[data-fo-remove-activity]")?.toggleAttribute("hidden", index === 0);

        const ownCode = card.querySelector(".e-permits-fo-caem__option.is-selected")?.dataset.code;
        card.querySelectorAll(".e-permits-fo-caem__option").forEach((option) => {
          const isDisabled = selectedCodes.includes(option.dataset.code) && option.dataset.code !== ownCode;
          option.classList.toggle("is-disabled", isDisabled);
          option.setAttribute("aria-disabled", String(isDisabled));
        });
      });
    }

    function renderSubgenOptions(card, subgenres = []) {
      const list = card?.querySelector("[data-fo-subgen-list]");
      const select = card?.querySelector("[data-fo-subgen-select]");
      if (!list) return;
      list.innerHTML = subgenres.map((value) => `
        <li class="e-permits-fo-subgen-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(value)}" tabindex="-1">
          <span class="checkbox checkbox--medium" aria-hidden="true"><input class="checkbox-input" type="checkbox" tabindex="-1"><span class="checkbox-custom"></span></span>
          <span>${escapeFrontOfficeHtml(value)}</span>
        </li>
      `).join("");
      if (select) {
        select.foSubgenInitialized = false;
        initSubgenMultiSelect(select);
      }
    }

    function initCaemCombobox(caemRoot) {
      if (caemRoot.foCaemInitialized) return;
      caemRoot.foCaemInitialized = true;
      const button = caemRoot.querySelector("[data-fo-caem-button]");
      const value = caemRoot.querySelector("[data-fo-caem-value]");
      const menu = caemRoot.querySelector("[data-fo-caem-menu]");
      const search = caemRoot.querySelector("[data-fo-caem-search]");
      const empty = caemRoot.querySelector("[data-fo-caem-empty]");
      if (empty && !empty.querySelector(".e-permits-empty")) empty.innerHTML = caemEmptyHtml();
      const options = Array.from(caemRoot.querySelectorAll(".e-permits-fo-caem__option"));
      if (!button || !value || !menu || !search || !options.length) return;

      let activeIndex = 0;
      let visibleOptions = options.slice();

      options.forEach((option) => {
        const searchableText = `${option.dataset.code || ""} ${option.dataset.label || ""}`;
        option.dataset.searchText = normalizeComboboxText(searchableText);
        option.dataset.searchCompact = compactComboboxText(searchableText);
      });

      function positionMenu() {
        setDropdownHidden(menu, false);
        caemRoot.classList.remove("is-open-up");
        const rootRect = caemRoot.getBoundingClientRect();
        const menuHeight = Math.min(menu.scrollHeight, 472);
        const spaceBelow = window.innerHeight - rootRect.bottom;
        const spaceAbove = rootRect.top;
        if (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow) {
          caemRoot.classList.add("is-open-up");
        }
      }

      function setActive(index) {
        if (!visibleOptions.length) {
          activeIndex = -1;
          options.forEach((option) => option.classList.remove("is-active"));
          return;
        }
        activeIndex = (index + visibleOptions.length) % visibleOptions.length;
        visibleOptions.forEach((option, optionIndex) => {
          option.classList.toggle("is-active", optionIndex === activeIndex);
        });
        visibleOptions[activeIndex]?.scrollIntoView({ block: "nearest" });
      }

      function filterOptions() {
        const query = normalizeComboboxText(search.value);
        const compactQuery = compactComboboxText(search.value);
        visibleOptions = options.filter((option) => {
          const isDisabled = option.classList.contains("is-disabled");
          const isVisible =
            !isDisabled &&
            (!query ||
              option.dataset.searchText.includes(query) ||
              (compactQuery && option.dataset.searchCompact.includes(compactQuery)));
          option.hidden = !isVisible;
          option.classList.remove("is-active");
          return isVisible;
        });
        if (empty) empty.hidden = visibleOptions.length > 0;
        const selectedIndex = visibleOptions.findIndex((option) => option.classList.contains("is-selected"));
        activeIndex = Math.max(0, selectedIndex);
        setActive(activeIndex);
      }

      function setOpen(isOpen) {
        caemRoot.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
          positionMenu();
          filterOptions();
          requestAnimationFrame(() => search.focus({ preventScroll: true }));
        } else {
          setDropdownHidden(menu, true);
          caemRoot.classList.remove("is-open-up");
          search.value = "";
          if (empty) empty.hidden = true;
          options.forEach((option) => {
            option.hidden = false;
            option.classList.remove("is-active");
          });
        }
      }

      function selectOption(option) {
        if (option.classList.contains("is-disabled")) return;
        options.forEach((item) => {
          const isSelected = item === option;
          item.classList.toggle("is-selected", isSelected);
          item.setAttribute("aria-selected", String(isSelected));
        });
        value.textContent = `${option.dataset.code} • ${option.dataset.label}`;
        value.title = value.textContent;
        value.classList.remove("e-permits-fo-caem__value--placeholder");
        activeIndex = Math.max(0, visibleOptions.indexOf(option));
        setOpen(false);
        const subgen = caemRoot.closest(".e-permits-fo-activity-card")?.querySelector("[data-fo-subgen]");
        const card = caemRoot.closest(".e-permits-fo-activity-card");
        let subgenres = [];
        try {
          subgenres = JSON.parse(option.dataset.subgenres || "[]");
        } catch (error) {
          subgenres = [];
        }
        renderSubgenOptions(card, subgenres);
        if (subgenres.length > 0) {
          subgen?.removeAttribute("hidden");
          subgen?.querySelector("[data-fo-subgen-select]")?.foResetSubgen?.();
        } else {
          subgen?.setAttribute("hidden", "");
          subgen?.querySelector("[data-fo-subgen-select]")?.foResetSubgen?.();
        }
        syncActivityCards();
        button.focus();
        caemRoot.dispatchEvent(new Event("change", { bubbles: true }));
      }

      button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
      });

      search.addEventListener("input", filterOptions);
      search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter" && visibleOptions[activeIndex]) {
          event.preventDefault();
          selectOption(visibleOptions[activeIndex]);
        }
        if (event.key === "Escape") {
          setOpen(false);
          button.focus();
        }
      });

      options.forEach((option) => {
        option.addEventListener("mouseenter", () => {
          const index = visibleOptions.indexOf(option);
          if (index >= 0) setActive(index);
        });
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          selectOption(option);
        });
      });

      document.addEventListener("click", (event) => {
        if (!caemRoot.contains(event.target)) setOpen(false);
      });

      window.addEventListener("resize", () => {
        if (button.getAttribute("aria-expanded") === "true") positionMenu();
      });
    }

    document.querySelectorAll("[data-fo-caem]").forEach(initCaemCombobox);

    function formatFoFileSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1048576).toFixed(1) + " MB";
    }

    function simulateFoUpload(item) {
      const bar = item.querySelector(".e-permits-fo-file-item__progress-bar");
      const removeBtn = item.querySelector(".e-permits-fo-file-item__remove");
      const speed = 0.6 + Math.random() * 1.8;
      let progress = 0;

      function tick() {
        if (progress < 65) {
          progress += (4 + Math.random() * 6) * speed;
        } else if (progress < 88) {
          progress += (0.8 + Math.random() * 2) * speed;
        } else if (progress < 98) {
          progress += (0.2 + Math.random() * 0.6) * speed;
        }
        progress = Math.min(progress, 98);
        bar.style.width = progress + "%";

        if (progress < 98) {
          requestAnimationFrame(tick);
        } else {
          setTimeout(() => {
            bar.style.width = "100%";
            setTimeout(() => {
              item.classList.remove("is-uploading");
              item.classList.add("is-uploaded");
              removeBtn.hidden = false;
            }, 180);
          }, 150 + Math.random() * 350);
        }
      }
      requestAnimationFrame(tick);
    }

    function initFileUploadDrop(label) {
      if (label.foFileUploadInitialized) return;
      label.foFileUploadInitialized = true;

      const input = label.querySelector("input[type=file]");
      if (!input) return;

      const uploadBtn = label.querySelector("[data-fo-upload-trigger]");
      if (uploadBtn) {
        uploadBtn.addEventListener("click", (e) => {
          e.preventDefault();
          input.click();
        });
      }

      let fileList = label.nextElementSibling;
      if (!fileList || !fileList.classList.contains("e-permits-fo-file-list")) {
        fileList = document.createElement("div");
        fileList.className = "e-permits-fo-file-list";
        label.after(fileList);
      }

      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        input.value = "";

        label.hidden = true;

        const item = document.createElement("div");
        item.className = "e-permits-fo-file-item is-uploading";
        item.innerHTML = `
          <div class="e-permits-fo-file-item__content">
            ${foDocIconHtml({ sursa: "upload" })}
            <div class="e-permits-fo-file-item__name-group">
              <span class="e-permits-fo-file-item__name">${escapeFrontOfficeHtml(file.name)}</span>
              <span class="e-permits-fo-file-item__sep">•</span>
              <span class="e-permits-fo-file-item__size">${escapeFrontOfficeHtml(formatFoFileSize(file.size))}</span>
            </div>
          </div>
          <button class="e-permits-fo-document-remove e-permits-fo-file-item__remove" type="button" aria-label="Elimină fișierul" hidden>
            <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large-16"></use></svg>
          </button>
          <div class="e-permits-fo-file-item__progress">
            <div class="e-permits-fo-file-item__progress-bar"></div>
          </div>
        `;

        item.querySelector(".e-permits-fo-file-item__remove").addEventListener("click", () => {
          item.remove();
          if (!fileList.querySelector(".e-permits-fo-file-item")) {
            label.hidden = false;
          }
        });

        fileList.appendChild(item);
        simulateFoUpload(item);
      });
    }

    function initMdocsDropdown(root) {
      if (root.foMdocsInitialized) return;
      root.foMdocsInitialized = true;

      const button = root.querySelector("[data-fo-mdocs-button]");
      const value = root.querySelector("[data-fo-mdocs-value]");
      const menu = root.querySelector("[data-fo-mdocs-menu]");
      const search = root.querySelector("[data-fo-mdocs-search]");
      const clearSearch = root.querySelector("[data-fo-mdocs-clear]");
      const empty = root.querySelector("[data-fo-mdocs-empty]");
      const attachment = root.querySelector("[data-fo-mdocs-attachment]");
      const removeButton = root.querySelector("[data-fo-mdocs-remove]");
      const options = Array.from(root.querySelectorAll(".e-permits-fo-mdocs__option"));
      if (!button || !value || !menu || !search || !options.length) return;

      let activeIndex = 0;
      let visibleOptions = options.slice();

      options.forEach((option) => {
        option.dataset.searchText = normalizeComboboxText(`${option.dataset.title || ""} ${option.dataset.meta || ""}`);
      });

      function setActive(index) {
        if (!visibleOptions.length) {
          activeIndex = -1;
          options.forEach((option) => option.classList.remove("is-active"));
          return;
        }
        activeIndex = (index + visibleOptions.length) % visibleOptions.length;
        visibleOptions.forEach((option, optionIndex) => {
          option.classList.toggle("is-active", optionIndex === activeIndex);
        });
        visibleOptions[activeIndex]?.scrollIntoView({ block: "nearest" });
      }

      function filterOptions() {
        const query = normalizeComboboxText(search.value);
        if (clearSearch) clearSearch.hidden = search.value.length === 0;
        visibleOptions = options.filter((option) => {
          const isVisible = !query || option.dataset.searchText.includes(query);
          option.closest("li").hidden = !isVisible;
          option.classList.remove("is-active");
          return isVisible;
        });
        if (empty) empty.hidden = visibleOptions.length > 0;
        const selectedIndex = visibleOptions.findIndex((option) => option.classList.contains("is-selected"));
        setActive(Math.max(0, selectedIndex));
      }

      function setOpen(isOpen, { focusSearch = true } = {}) {
        root.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        setDropdownHidden(menu, !isOpen);
        if (isOpen) {
          filterOptions();
          if (focusSearch) requestAnimationFrame(() => search.focus({ preventScroll: true }));
        } else {
          search.value = "";
          if (empty) empty.hidden = true;
          options.forEach((option) => {
            option.closest("li").hidden = false;
            option.classList.remove("is-active");
          });
        }
      }

      function selectOption(option) {
        const title = option.dataset.title || "";
        const meta = option.dataset.meta || "";
        options.forEach((item) => {
          const isSelected = item === option;
          item.classList.toggle("is-selected", isSelected);
          item.setAttribute("aria-selected", String(isSelected));
        });
        value.textContent = title;
        value.classList.remove("e-permits-fo-mdocs__value--placeholder");
        setOpen(false, { focusSearch: false });

        if (attachment) {
          /* the chosen document = the shared FO document card (icon, type + MDocs tag, Emis … · de …) */
          const [issuedLabel = "", issuer = ""] = meta.split("·").map((part) => part.trim());
          const doc = { sursa: "mdocs", tip: title, verb: "Emis", at: foDocLongDate(issuedLabel.replace(/^Emis\s+/i, "")), de: issuer, semnat: true, badge: "Activă" };
          attachment.dataset.foDoc = JSON.stringify(doc);
          attachment.querySelectorAll(":scope > :not([data-fo-mdocs-remove])").forEach((el) => el.remove());
          removeButton?.insertAdjacentHTML("beforebegin", `${foDocIconHtml(doc)}${foDocContentHtml(doc, { titleClass: "e-permits-fo-mdocs__attachment-title" })}`);
          button.hidden = true;
          setDropdownHidden(menu, true);
          attachment.hidden = false;
          removeButton?.focus({ preventScroll: true });
        } else {
          button.focus();
        }
      }

      function clearSelection() {
        options.forEach((item) => {
          item.classList.remove("is-selected");
          item.setAttribute("aria-selected", "false");
        });
        value.textContent = "Caută și încarcă din MDocs";
        value.classList.add("e-permits-fo-mdocs__value--placeholder");
        root.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
        button.hidden = false;
        if (attachment) { attachment.hidden = true; delete attachment.dataset.foDoc; attachment.querySelectorAll(":scope > :not([data-fo-mdocs-remove])").forEach((el) => el.remove()); }
        button.focus({ preventScroll: true });
      }

      button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
      });

      search.addEventListener("input", filterOptions);
      clearSearch?.addEventListener("click", () => {
        search.value = "";
        filterOptions();
        search.focus({ preventScroll: true });
      });
      search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if (event.key === "Enter" && visibleOptions[activeIndex]) {
          event.preventDefault();
          selectOption(visibleOptions[activeIndex]);
        }
        if (event.key === "Escape") {
          setOpen(false, { focusSearch: false });
          button.focus();
        }
      });

      options.forEach((option) => {
        option.addEventListener("mouseenter", () => {
          const index = visibleOptions.indexOf(option);
          if (index >= 0) setActive(index);
        });
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          selectOption(option);
        });
      });

      document.addEventListener("click", (event) => {
        if (!root.contains(event.target)) setOpen(false, { focusSearch: false });
      });

      removeButton?.addEventListener("click", clearSelection);

      setOpen(root.hasAttribute("data-fo-mdocs-open"), { focusSearch: false });
    }

    document.querySelectorAll("[data-fo-mdocs]").forEach(initMdocsDropdown);
    document.querySelectorAll(".e-permits-fo-file-drop").forEach(initFileUploadDrop);

    function initSubgenMultiSelect(root) {
      if (root.foSubgenInitialized) return;
      root.foSubgenInitialized = true;
      const button = root.querySelector("[data-fo-subgen-button]");
      const value = root.querySelector("[data-fo-subgen-value]");
      const menu = root.querySelector("[data-fo-subgen-menu]");
      const search = root.querySelector("[data-fo-subgen-search]");
      const count = root.querySelector("[data-fo-subgen-count]");
      const countLabel = root.querySelector("[data-fo-subgen-count-label]");
      const confirm = root.querySelector("[data-fo-subgen-confirm]");
      const chips = root.closest("[data-fo-subgen]")?.querySelector("[data-fo-subgen-chips]");
      const options = Array.from(root.querySelectorAll(".e-permits-fo-subgen-select__option"));
      if (!button || !value || !menu || !search || !count || !countLabel || !confirm || !chips || !options.length) return;

      let activeIndex = 0;
      let visibleOptions = options.slice();

      options.forEach((option) => {
        option.dataset.searchText = normalizeComboboxText(option.dataset.value || option.textContent || "");
      });

      function selectedOptions() {
        return options.filter((option) => option.classList.contains("is-selected"));
      }

      function updateSummary() {
        const selected = selectedOptions();
        count.textContent = String(selected.length);
        countLabel.textContent = selected.length === 1 ? "selectat" : "selectate";
        /* texts from data attributes (Form Builder „Selecție multiplă”); defaults = CAEM subgenres */
        const one = root.dataset.countOne || "subgen selectat";
        const many = root.dataset.countMany || "subgenuri selectate";
        value.textContent = selected.length === 0 ? (root.dataset.placeholder || "Alege subgen de activitate") : `${selected.length} ${selected.length === 1 ? one : many}`;
        value.classList.toggle("e-permits-fo-subgen-select__value--placeholder", selected.length === 0);
        chips.hidden = selected.length === 0;
        chips.innerHTML = "";
        selected.forEach((option) => {
          const chip = document.createElement("span");
          chip.className = "e-permits-fo-subgen-chip";
          chip.dataset.value = option.dataset.value || "";
          chip.innerHTML = `
            <span class="e-permits-fo-subgen-chip__label"></span>
            <button class="e-permits-fo-subgen-chip__remove" type="button" aria-label="${escapeFrontOfficeHtml(root.dataset.removeLabel || "Elimină subgenul")}">
              <svg class="icon" width="20" height="20" aria-hidden="true">
                <use href="assets/icons/sprite.svg#icon-cross-small"></use>
              </svg>
            </button>
          `;
          chip.querySelector(".e-permits-fo-subgen-chip__label").textContent = option.dataset.value || "";
          chip.querySelector(".e-permits-fo-subgen-chip__remove").addEventListener("click", () => {
            option.classList.remove("is-selected");
            option.setAttribute("aria-selected", "false");
            const subgenBox = option.querySelector(".checkbox-input");
            if (subgenBox) subgenBox.checked = false;
            updateSummary();
          });
          chips.appendChild(chip);
        });
      }

      function setActive(index) {
        if (!visibleOptions.length) {
          activeIndex = -1;
          options.forEach((option) => option.classList.remove("is-active"));
          return;
        }
        activeIndex = (index + visibleOptions.length) % visibleOptions.length;
        visibleOptions.forEach((option, optionIndex) => {
          option.classList.toggle("is-active", optionIndex === activeIndex);
        });
        visibleOptions[activeIndex]?.scrollIntoView({ block: "nearest" });
      }

      function filterOptions() {
        const query = normalizeComboboxText(search.value);
        visibleOptions = options.filter((option) => {
          const isVisible = !query || option.dataset.searchText.includes(query);
          option.hidden = !isVisible;
          option.classList.remove("is-active");
          return isVisible;
        });
        setActive(0);
      }

      function setOpen(isOpen) {
        root.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", String(isOpen));
        setDropdownHidden(menu, !isOpen);
        if (isOpen) {
          filterOptions();
          requestAnimationFrame(() => search.focus({ preventScroll: true }));
        } else {
          search.value = "";
          options.forEach((option) => {
            option.hidden = false;
            option.classList.remove("is-active");
          });
        }
      }

      function toggleOption(option) {
        const isSelected = !option.classList.contains("is-selected");
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-selected", String(isSelected));
        const subgenBox = option.querySelector(".checkbox-input");
        if (subgenBox) subgenBox.checked = isSelected;
        updateSummary();
      }

      button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
      });

      search.addEventListener("input", filterOptions);
      search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        }
        if ((event.key === "Enter" || event.key === " ") && visibleOptions[activeIndex]) {
          event.preventDefault();
          toggleOption(visibleOptions[activeIndex]);
        }
        if (event.key === "Escape") {
          setOpen(false);
          button.focus();
        }
      });

      options.forEach((option) => {
        option.addEventListener("mouseenter", () => {
          const index = visibleOptions.indexOf(option);
          if (index >= 0) setActive(index);
        });
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          toggleOption(option);
        });
      });

      confirm.addEventListener("click", () => {
        setOpen(false);
        button.focus();
      });

      root.foResetSubgen = () => {
        options.forEach((option) => {
          option.classList.remove("is-selected");
          option.setAttribute("aria-selected", "false");
          const subgenBox = option.querySelector(".checkbox-input");
          if (subgenBox) subgenBox.checked = false;
        });
        setOpen(false);
        updateSummary();
      };

      updateSummary();
    }

    document.querySelectorAll("[data-fo-subgen-select]").forEach(initSubgenMultiSelect);

    function resetActivityCard(card, index) {
      card.querySelector("[data-fo-activity-index]").textContent = `#${index}`;

      const caem = card.querySelector("[data-fo-caem]");
      const caemButton = card.querySelector("[data-fo-caem-button]");
      const caemValue = card.querySelector("[data-fo-caem-value]");
      const caemMenu = card.querySelector("[data-fo-caem-menu]");
      const caemSearch = card.querySelector("[data-fo-caem-search]");
      const caemList = card.querySelector("[data-fo-caem-list]");
      const caemEmpty = card.querySelector("[data-fo-caem-empty]");
      const caemId = `fo-caem-code-${index}`;
      const caemMenuId = `fo-caem-code-menu-${index}`;
      const caemListId = `fo-caem-code-list-${index}`;

      caem?.classList.remove("is-open", "is-open-up");
      if (caem) caem.foCaemInitialized = false;
      if (caemButton) {
        caemButton.id = caemId;
        caemButton.setAttribute("aria-controls", caemMenuId);
        caemButton.setAttribute("aria-expanded", "false");
      }
      if (caemValue) {
        caemValue.textContent = "Selectează cod CAEM";
        caemValue.classList.add("e-permits-fo-caem__value--placeholder");
      }
      if (caemMenu) {
        caemMenu.id = caemMenuId;
        caemMenu.hidden = true;
      }
      if (caemSearch) caemSearch.value = "";
      if (caemList) {
        caemList.id = caemListId;
        caemList.setAttribute("aria-labelledby", caemId);
      }
      if (caemEmpty) caemEmpty.hidden = true;
      card.querySelectorAll(".e-permits-fo-caem__option").forEach((option) => {
        option.hidden = false;
        option.classList.remove("is-selected", "is-active", "is-disabled");
        option.setAttribute("aria-selected", "false");
        const subgenBox = option.querySelector(".checkbox-input");
        if (subgenBox) subgenBox.checked = false;
        option.setAttribute("aria-disabled", "false");
      });

      const subgen = card.querySelector("[data-fo-subgen]");
      const subgenSelect = card.querySelector("[data-fo-subgen-select]");
      const subgenButton = card.querySelector("[data-fo-subgen-button]");
      const subgenValue = card.querySelector("[data-fo-subgen-value]");
      const subgenMenu = card.querySelector("[data-fo-subgen-menu]");
      const subgenSearch = card.querySelector("[data-fo-subgen-search]");
      const subgenList = card.querySelector("[data-fo-subgen-list]");
      const subgenCount = card.querySelector("[data-fo-subgen-count]");
      const subgenCountLabel = card.querySelector("[data-fo-subgen-count-label]");
      const subgenChips = card.querySelector("[data-fo-subgen-chips]");
      const subgenId = `fo-subgen-activity-${index}`;
      const subgenMenuId = `fo-subgen-menu-${index}`;

      if (subgen) subgen.hidden = true;
      if (subgenSelect) {
        subgenSelect.classList.remove("is-open");
        subgenSelect.foSubgenInitialized = false;
      }
      if (subgenButton) {
        subgenButton.id = subgenId;
        subgenButton.setAttribute("aria-controls", subgenMenuId);
        subgenButton.setAttribute("aria-expanded", "false");
      }
      if (subgenValue) {
        subgenValue.textContent = "Alege subgen de activitate";
        subgenValue.classList.add("e-permits-fo-subgen-select__value--placeholder");
      }
      if (subgenMenu) {
        subgenMenu.id = subgenMenuId;
        subgenMenu.hidden = true;
      }
      if (subgenSearch) subgenSearch.value = "";
      if (subgenList) subgenList.setAttribute("aria-labelledby", subgenId);
      if (subgenCount) subgenCount.textContent = "0";
      if (subgenCountLabel) subgenCountLabel.textContent = "selectate";
      if (subgenChips) {
        subgenChips.innerHTML = "";
        subgenChips.hidden = true;
      }
      card.querySelectorAll(".e-permits-fo-subgen-select__option").forEach((option) => {
        option.hidden = false;
        option.classList.remove("is-selected", "is-active");
        option.setAttribute("aria-selected", "false");
        const subgenBox = option.querySelector(".checkbox-input");
        if (subgenBox) subgenBox.checked = false;
      });
    }

    function addRemoveButton(card) {
      const header = card.querySelector(".e-permits-fo-activity-card__header");
      if (!header || header.querySelector("[data-fo-remove-activity]")) return;
      const button = document.createElement("button");
      button.className = "e-permits-fo-icon-button";
      button.type = "button";
      button.setAttribute("aria-label", "Șterge activitatea");
      button.dataset.foRemoveActivity = "";
      button.innerHTML = `
        <svg class="icon" width="20" height="20" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-cross-small"></use>
        </svg>
      `;
      button.addEventListener("click", () => {
        card.remove();
        syncActivityCards();
      });
      header.appendChild(button);
    }

    document.addEventListener("click", (event) => {
      const addActivityButton = event.target.closest("[data-fo-add-activity]");
      if (!addActivityButton) return;
      const activityList = addActivityButton.parentElement;
      const firstActivityCard = activityList?.querySelector("[data-fo-activity-card]");
      if (!firstActivityCard || !activityList) return;
      const nextIndex = document.querySelectorAll("[data-fo-activity-card]").length + 1;
      const card = firstActivityCard.cloneNode(true);
      resetActivityCard(card, nextIndex);
      addRemoveButton(card);
      activityList.insertBefore(card, addActivityButton);
      initCaemCombobox(card.querySelector("[data-fo-caem]"));
      initSubgenMultiSelect(card.querySelector("[data-fo-subgen-select]"));
      syncActivityCards();
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    syncActivityCards();

    function syncOtherDocCards() {
      document.querySelectorAll("[data-fo-other-doc-card]").forEach((card, i) => {
        const idx = card.querySelector("[data-fo-other-doc-index]");
        if (idx) idx.textContent = `#${i + 1}`;
      });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-add-other-doc]")) {
        const btn = event.target.closest("[data-fo-add-other-doc]");
        const list = btn.parentElement?.querySelector("[data-fo-other-doc-list]");
        if (!list) return;
        const count = list.querySelectorAll("[data-fo-other-doc-card]").length + 1;
        const uid = Math.random().toString(16).slice(2, 8);
        const card = document.createElement("div");
        card.className = "e-permits-fo-doc-card";
        card.dataset.foOtherDocCard = "";
        card.innerHTML = `
          <div class="e-permits-fo-doc-card__header">
            <div class="e-permits-fo-doc-card__title">
              <span class="e-permits-fo-doc-card__index" data-fo-other-doc-index>#${count}</span>
              <span class="e-permits-fo-doc-card__name">Document</span>
            </div>
            <button class="e-permits-fo-doc-card__remove" type="button" aria-label="Elimină documentul" data-fo-remove-other-doc>
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
            </button>
          </div>
          <div class="e-permits-fo-doc-card__body">
            <div class="e-permits-fo-field">
              <label for="fo-other-title-${uid}">
                Denumirea documentului
                <span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>
              </label>
              <div class="e-permits-fo-input">
                <input id="fo-other-title-${uid}" type="text" placeholder="ex. Certificat de conformitate" required>
              </div>
            </div>
            <div class="e-permits-fo-field">
              <label for="fo-other-desc-${uid}">Descriere scurtă</label>
              <div class="e-permits-fo-textarea">
                <textarea id="fo-other-desc-${uid}" placeholder="Scurtă descriere a documentului" rows="2"></textarea>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-resize"></use></svg>
              </div>
            </div>
            <label class="e-permits-fo-file-drop" for="fo-other-file-${uid}">
              <input id="fo-other-file-${uid}" type="file" accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx,.zip,.docx" data-fo-file-input>
              <span class="e-permits-fo-file-drop__icon" aria-hidden="true">
                <svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-cloud-upload"></use></svg>
              </span>
              <span class="e-permits-fo-file-drop__copy">
                <span><span>Drag and drop or</span> <strong>choose files</strong></span>
                <small>Un singur fișier JPG, PNG, PDF, XLS, ZIP, DOCX <span aria-hidden="true">•</span> max 60 MB</small>
              </span>
              <button class="e-permits-fo-upload-button" type="button" aria-label="Încarcă fișier" data-fo-upload-trigger>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg>
                Încarcă fișier
              </button>
            </label>
          </div>
        `;
        list.appendChild(card);
        initFileUploadDrop(card.querySelector(".e-permits-fo-file-drop"));
        syncOtherDocCards();
        card.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }

      if (event.target.closest("[data-fo-remove-other-doc]")) {
        const card = event.target.closest("[data-fo-other-doc-card]");
        if (card) {
          card.remove();
          syncOtherDocCards();
        }
      }
    });

    /* ---- Form Builder: the FO renderer, shared (2026-10-13) ----------------------------------
       The builder (js/form-builder.js) draws its canvas cards, its Preview and the request form
       with the SAME renderer as the FO (stepFieldHtml) and binds the Preview with the FO
       controls — one schema → one renderer → three surfaces (spec form-builder.md § C.0). */
    window.GEAPFormRender = {
      fieldHtml: stepFieldHtml,
      escape: escapeFrontOfficeHtml,
      localIsoDay,
      /* the FO interactions for a rendered root (Preview): selects, phone, address, counters, dates */
      bind(root) {
        root.querySelectorAll("[data-fo-select]").forEach(bindFoSelect);
        root.querySelectorAll("[data-fo-phone-code]").forEach(bindPhoneCode);
        root.querySelectorAll("[data-fo-cascade-address]").forEach(initCascadeAddress);
        root.querySelectorAll("[data-fo-address-search]").forEach(bindAddressSearch);
        root.querySelectorAll("[data-fo-char-counter]").forEach(initCharCounter);
        root.querySelectorAll("[data-fo-subgen-select]").forEach(initSubgenMultiSelect);
        root.querySelectorAll("[data-fo-caem]").forEach(initCaemCombobox);
        root.querySelectorAll("[data-fo-contact-person]").forEach(syncContactPersonGroup);
        root.querySelectorAll("[data-fo-subdivision]").forEach(initSubdivisionField);
        root.querySelectorAll("[data-fo-digits]").forEach(bindDigitsInput);
        root.querySelectorAll("[data-fo-registry-lookup]").forEach(bindRegistryLookup);
        root.querySelectorAll("[data-fo-segment]").forEach((control) => {
          control.addEventListener("click", (event) => {
            const item = event.target.closest(".segment-item");
            if (!item || item.disabled) return;
            control.querySelectorAll(".segment-item").forEach((other) => {
              const on = other === item;
              other.classList.toggle("is-selected", on);
              other.setAttribute("aria-checked", String(on));
              other.tabIndex = on ? 0 : -1;
            });
            control.dispatchEvent(new Event("change", { bubbles: true }));
          });
        });
        initAnimatedSegmentedControls(root);
        window.GEAPDatePicker?.init?.(root);
        /* grids and blocks last: their cells / cards were bound above with the rest of the FO controls */
        window.GEAPFoRepeat?.bind(root);
      },
      /* the service districts the cascade address lists (from the service schema) */
      districts: () => cascadeAddressFieldOfSchema(frontOfficeSchema)?.districts || [],
      /* the applicant (MPass) for prefilled IDNP / IDNO / contact values */
      applicant: formApplicant,
      /* the FO field error (library inline message, hint hidden; "" clears) and the copy button */
      setFieldError: setGuestFieldError,
      copyValueHtml: copyValueButtonHtml,
      /* the desk wizard (js/ghiseu.js): the same registry lookup and document cards as the FO */
      createRegistryLookup,
      setRegistryValue,
      docIconHtml: foDocIconHtml,
      docContentHtml: foDocContentHtml,
      summaryDocsHtml: foSummaryDocsHtml,
      attachFileItem: foDocAttachFileItem,
      attachMdocsItem: foDocAttachMdocsItem,
      schemaReady: () => Promise.resolve(frontOfficeSchemaLoadPromise),
      setModalHidden: setMotionModalHidden,
      demoFlow
    };
    /* js/fo-grid.js (grid + repeatable block) draws its cells / cards with these FO helpers */
    window.GEAPFoRepeat?.setContext({ fieldHtml: stepFieldHtml, esc: escapeFrontOfficeHtml, setFieldError: setGuestFieldError, caemFieldHtml, subgenHtml, localIsoDay, setModalHidden: setMotionModalHidden });

    document.querySelectorAll(".permits-table__row[data-row-link]").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest(".permits-table__row-action, [data-copy-id]")) {
          return;
        }
        navigateRow(row);
      });

      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateRow(row);
        }
      });
    });

    document.querySelectorAll("[data-copy-id]").forEach((button) => {
      const tooltipText = button.querySelector(".permits-table__copy-text");
      const defaultTooltip = tooltipText?.textContent || "Copy to clipboard";
      let copiedTimer;

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.clearTimeout(copiedTimer);

        try {
          await copyText(button.dataset.copyId || button.textContent.trim());
          if (tooltipText) tooltipText.textContent = "Copied!";
          button.classList.add("is-copied");
          copiedTimer = window.setTimeout(() => {
            button.classList.remove("is-copied");
            if (tooltipText) tooltipText.textContent = defaultTooltip;
          }, 1500);
        } catch {
          button.classList.remove("is-copied");
          if (tooltipText) tooltipText.textContent = defaultTooltip;
        }
      });
    });
  });
})();
