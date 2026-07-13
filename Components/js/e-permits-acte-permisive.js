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
      return "";
    }

    function currentDemoFlow() {
      const params = new URLSearchParams(window.location.search);
      const flow = normalizeDemoFlow(params.get("flow"));
      if (flow === "full" && !["#choice", "#request", "#request-step-2", "#request-step-3", "#request-step-4"].includes(window.location.hash)) {
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
    const frontOfficeScriptSrc = document.querySelector("script[src*='e-permits-acte-permisive.js']")?.src || "";
    let frontOfficeSchema = null;
    let frontOfficeSchemaLoadPromise = null;
    let frontOfficeSelectedSubject = null;
    let frontOfficeStep4Signed = false;
    let frontOfficeToastTimer = null;
    let frontOfficeSubjectLoadTimer = null;
    let frontOfficeSubjectLoadToken = 0;
    let frontOfficeDraftCreated = false;
    let frontOfficeDraftSavedAt = null;
    let frontOfficeDraftInfoDismissed = false;
    const dropdownMotionTimers = new WeakMap();

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

    function escapeFrontOfficeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function dismissFrontOfficeToast(toast) {
      if (!toast || toast.classList.contains("is-hiding")) return;
      toast.classList.add("is-hiding");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }

    function showFrontOfficeToast(message = "Schița a fost salvată.") {
      document.querySelectorAll("[data-fo-toast]").forEach((toast) => toast.remove());
      if (frontOfficeToastTimer) window.clearTimeout(frontOfficeToastTimer);

      const toast = document.createElement("div");
      toast.className = "e-permits-fo-toast e-permits-fo-toast--success";
      toast.dataset.foToast = "true";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.innerHTML = `
        <span class="e-permits-fo-toast__icon" aria-hidden="true">
          <svg class="icon" width="20" height="20">
            <use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use>
          </svg>
        </span>
        <span class="e-permits-fo-toast__text">${escapeFrontOfficeHtml(message)}</span>
        <button class="e-permits-fo-toast__close" type="button" aria-label="Închide notificarea">
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-cross-large"></use>
          </svg>
        </button>
      `;

      toast.querySelector(".e-permits-fo-toast__close")?.addEventListener("click", () => {
        if (frontOfficeToastTimer) window.clearTimeout(frontOfficeToastTimer);
        dismissFrontOfficeToast(toast);
      });

      document.body.appendChild(toast);
      frontOfficeToastTimer = window.setTimeout(() => dismissFrontOfficeToast(toast), 4000);
    }

    function frontOfficeTimeLabel(date = new Date()) {
      return new Intl.DateTimeFormat("ro-MD", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    }

    function requestHeaderHtml({ id, title }) {
      const draftStatus = frontOfficeDraftCreated ? `
        <div class="e-permits-fo-draft-status" aria-label="Starea schiței">
          <span class="e-permits-fo-draft-status__saved">
            <svg class="icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6.45833 3.125V6.04167C6.45833 6.5019 6.83143 6.875 7.29167 6.875H12.7083C13.1686 6.875 13.5417 6.5019 13.5417 6.04167V3.125M16.875 6.31536V15.2083C16.875 16.1288 16.1288 16.875 15.2083 16.875H4.79167C3.87119 16.875 3.125 16.1288 3.125 15.2083V4.79167C3.125 3.87119 3.87119 3.125 4.79167 3.125H13.6846C14.1267 3.125 14.5506 3.30059 14.8632 3.61316L16.3868 5.13684C16.6994 5.44941 16.875 5.87333 16.875 6.31536ZM6.45833 11.4583V16.0417C6.45833 16.5019 6.83143 16.875 7.29167 16.875H12.7083C13.1686 16.875 13.5417 16.5019 13.5417 16.0417V11.4583C13.5417 10.9981 13.1686 10.625 12.7083 10.625H7.29167C6.83143 10.625 6.45833 10.9981 6.45833 11.4583Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Salvat ca schiță</span>
          </span>
          <span class="e-permits-fo-draft-status__dot" aria-hidden="true"></span>
          <time class="e-permits-fo-draft-status__time" datetime="${frontOfficeDraftSavedAt ? frontOfficeDraftSavedAt.toISOString() : ""}" data-fo-draft-time>
            ${escapeFrontOfficeHtml(frontOfficeTimeLabel(frontOfficeDraftSavedAt || new Date()))}
          </time>
          <span class="e-permits-fo-draft-status__separator" aria-hidden="true"></span>
          <a class="e-permits-fo-draft-status__link" href="e-permits-acte-permisive.html?flow=back-office">Solicitările mele</a>
        </div>
      ` : "";
      const draftInfo = frontOfficeDraftCreated && !frontOfficeDraftInfoDismissed ? `
        <div class="e-permits-fo-draft-info" role="note" data-fo-draft-info>
          <span class="e-permits-fo-draft-info__bone" aria-hidden="true"></span>
          <span class="e-permits-fo-draft-info__icon" aria-hidden="true">
            <svg class="icon" width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6.45833 3.125V6.04167C6.45833 6.5019 6.83143 6.875 7.29167 6.875H12.7083C13.1686 6.875 13.5417 6.5019 13.5417 6.04167V3.125M16.875 6.31536V15.2083C16.875 16.1288 16.1288 16.875 15.2083 16.875H4.79167C3.87119 16.875 3.125 16.1288 3.125 15.2083V4.79167C3.125 3.87119 3.87119 3.125 4.79167 3.125H13.6846C14.1267 3.125 14.5506 3.30059 14.8632 3.61316L16.3868 5.13684C16.6994 5.44941 16.875 5.87333 16.875 6.31536ZM6.45833 11.4583V16.0417C6.45833 16.5019 6.83143 16.875 7.29167 16.875H12.7083C13.1686 16.875 13.5417 16.5019 13.5417 16.0417V11.4583C13.5417 10.9981 13.1686 10.625 12.7083 10.625H7.29167C6.83143 10.625 6.45833 10.9981 6.45833 11.4583Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <p><strong>Cererea se salvează automat.</strong> Poți închide oricând și o reiei din <a href="e-permits-acte-permisive.html?flow=back-office">Solicitările mele</a> în EVO cabinet.</p>
          <button class="e-permits-fo-draft-info__close" type="button" aria-label="Închide mesajul" data-fo-draft-info-close>
            <svg class="icon" width="16" height="16" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-cross-large"></use>
            </svg>
          </button>
        </div>
      ` : "";
      return `
        ${draftStatus}
        <h1 id="${escapeFrontOfficeHtml(id)}" tabindex="-1">${escapeFrontOfficeHtml(title)}</h1>
        ${draftInfo}
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
    }

    function saveFrontOfficeDraft({ toast = false } = {}) {
      frontOfficeDraftCreated = true;
      frontOfficeDraftSavedAt = new Date();
      updateFrontOfficeRequestHeaders();
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
      const stepperList = document.querySelector(".e-permits-fo-stepper ol");
      if (!stepperList || !Array.isArray(schema?.steps) || !schema.steps.length) return;
      stepperList.innerHTML = schema.steps.map((step, index) => {
        const active = index === 0;
        return `
          <li class="e-permits-fo-stepper__item${active ? " is-active" : ""}" ${active ? 'aria-current="step"' : ""} data-fo-step="${escapeFrontOfficeHtml(step.index)}">
            <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
            <span class="e-permits-fo-stepper__row">
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
      const span = [4, 6, 8, 12].includes(Number(field?.span)) ? Number(field.span) : 12;
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
      return `
        <div class="${fieldClass(field)}">
          ${labelRow}
          <div class="e-permits-fo-input">
            <input id="${escapeFrontOfficeHtml(id)}" type="${type}" ${field.value ? `value="${escapeFrontOfficeHtml(field.value)}"` : ""} placeholder="${escapeFrontOfficeHtml(field.placeholder || "")}" ${field.autocomplete ? `autocomplete="${escapeFrontOfficeHtml(field.autocomplete)}"` : ""} ${field.disabled ? "disabled" : ""} ${field.maxLength ? `maxlength="${escapeFrontOfficeHtml(String(field.maxLength))}"` : ""} ${hasCounter ? "data-fo-char-input" : ""}>
          </div>
          ${field.hint ? `<p class="e-permits-fo-field__hint">${escapeFrontOfficeHtml(field.hint)}</p>` : ""}
        </div>
      `;
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
              <span class="e-permits-fo-select__value${value ? "" : " e-permits-fo-select__value--placeholder"}" data-fo-select-value ${addressPart ? `data-fo-address-part="${escapeFrontOfficeHtml(field.id)}" data-placeholder="${escapeFrontOfficeHtml(placeholder)}"` : ""}>${escapeFrontOfficeHtml(value || placeholder)}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-select__list" id="${escapeFrontOfficeHtml(listId)}" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" hidden>
              ${options.map((option) => `<li class="e-permits-fo-select__option${option === value ? " is-selected" : ""}" role="option" aria-selected="${option === value ? "true" : "false"}" data-value="${escapeFrontOfficeHtml(option)}" tabindex="-1">${escapeFrontOfficeHtml(option)}</li>`).join("")}
            </ul>
          </div>
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
          <div class="e-permits-fo-address-search" data-fo-address-search data-fo-addresses="${addressesJson}">
            <div class="e-permits-fo-input e-permits-fo-input--with-action">
              <input id="${escapeFrontOfficeHtml(id)}" type="text" placeholder="${escapeFrontOfficeHtml(field.searchPlaceholder || "Caută adresa")}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(id)}-suggestions" data-fo-address-input>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            </div>
            <ul class="e-permits-fo-address-search__list" id="${escapeFrontOfficeHtml(id)}-suggestions" role="listbox" aria-label="Sugestii adresă" data-fo-address-list hidden></ul>
          </div>
          ${field.hint ? `<p class="e-permits-fo-field__hint">${escapeFrontOfficeHtml(field.hint)}</p>` : ""}
          <div class="e-permits-fo-address-details e-permits-fo-address-details--smart" data-fo-address-details>
            ${(field.parts || []).map(addressPartHtml).join("")}
          </div>
        </div>
      `;
    }

    function cascadeAddressHtml(field) {
      const uid = Math.random().toString(16).slice(2, 8);
      const raionId = `fo-casc-raion-${uid}`;
      const localitateId = `fo-casc-loc-${uid}`;
      const sectorId = `fo-casc-sector-${uid}`;
      const stradaId = `fo-casc-strada-${uid}`;
      const districtsJson = escapeFrontOfficeHtml(JSON.stringify(field.districts || []));
      const phoneHtml = field.phone ? phoneFieldHtml(field.phone) : "";
      const emailHtml = field.email ? textFieldHtml({ ...field.email, type: "email" }) : "";
      return `
        <div class="${fieldClass(field)} e-permits-fo-cascade-address" data-fo-cascade-address data-fo-cascade-districts="${districtsJson}">
          <div class="e-permits-fo-field e-permits-fo-field--span-12">
            <label for="fo-casc-search-${uid}">Caută adresa</label>
            <div class="e-permits-fo-address-search" data-fo-address-search data-fo-addresses="[]">
              <div class="e-permits-fo-input e-permits-fo-input--with-action">
                <input id="fo-casc-search-${uid}" type="text" placeholder="Caută adresa" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="fo-casc-search-${uid}-suggestions" data-fo-address-input>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
              </div>
              <ul class="e-permits-fo-address-search__list" id="fo-casc-search-${uid}-suggestions" role="listbox" aria-label="Sugestii adresă" data-fo-address-list hidden></ul>
            </div>
            <p class="e-permits-fo-field__hint">Selectarea unei adrese existente pre-completează toate câmpurile</p>
          </div>
          <div class="e-permits-fo-address-details--smart e-permits-fo-cascade-address__grid">
            <div class="e-permits-fo-field e-permits-fo-field--span-6">
              <label>Țara ${requiredMarkerHtml()}</label>
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
            <div class="e-permits-fo-field e-permits-fo-field--span-6">
              <label>Raionul/Municipiul ${requiredMarkerHtml()}</label>
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
            <div class="e-permits-fo-field e-permits-fo-field--span-6">
              <label>Orașul/Comuna</label>
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
            <div class="e-permits-fo-field e-permits-fo-field--span-8">
              <label>Strada</label>
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
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-house">Casa</label>
              <div class="e-permits-fo-input"><input id="${uid}-house" type="text" placeholder="Nr." data-fo-address-part="house"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-block">Blocul</label>
              <div class="e-permits-fo-input"><input id="${uid}-block" type="text" placeholder="Nr." data-fo-address-part="block"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-stair">Scara</label>
              <div class="e-permits-fo-input"><input id="${uid}-stair" type="text" placeholder="Scara" data-fo-address-part="stair"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-floor">Etajul</label>
              <div class="e-permits-fo-input"><input id="${uid}-floor" type="text" placeholder="0" data-fo-address-part="floor"></div>
            </div>
            <div class="e-permits-fo-field e-permits-fo-field--span-4">
              <label for="${uid}-apt">Apartamentul</label>
              <div class="e-permits-fo-input"><input id="${uid}-apt" type="text" placeholder="Numărul ap." data-fo-address-part="apartment"></div>
            </div>
            ${phoneHtml}
            ${emailHtml}
          </div>
        </div>
      `;
    }

    function subdivisionFieldHtml(field) {
      const id = fieldId(field.id);
      const listId = `${id}-list`;
      const mappingJson = escapeFrontOfficeHtml(JSON.stringify(field.mapping || {}));
      const options = Array.isArray(field.subdivisions) ? field.subdivisions : [];
      return `
        <div class="${fieldClass(field)} e-permits-fo-subdivision-field" data-fo-subdivision data-fo-subdivision-mapping="${mappingJson}">
          ${labelHtml(id, field)}
          <div class="e-permits-fo-select" data-fo-cascade-select data-fo-subdivision-select>
            <button class="e-permits-fo-select__button" id="${escapeFrontOfficeHtml(id)}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${escapeFrontOfficeHtml(listId)}">
              <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>Va fi sugerată după raion</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-select__list" id="${escapeFrontOfficeHtml(listId)}" role="listbox" aria-labelledby="${escapeFrontOfficeHtml(id)}" hidden>
              ${options.map((opt) => `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${escapeFrontOfficeHtml(opt)}" tabindex="-1">${escapeFrontOfficeHtml(opt)}</li>`).join("")}
            </ul>
          </div>
          <p class="e-permits-fo-field__hint" data-fo-subdivision-hint>Selectați raionul pentru a sugera subdiviziunea automat.</p>
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
      }
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
      document.addEventListener("fo:raion-changed", (e) => {
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

    function contactPersonHtml(field) {
      const phoneField = { id: "contact-phone-self", label: "Telefon", span: 6, value: "60 999 999", countryCodes: [{ flag: "🇲🇩", code: "+373" }] };
      return `
        <fieldset class="e-permits-fo-radio-group e-permits-fo-radio-group--contact" data-fo-contact-person>
          <legend class="u-visually-hidden">Alege persoana de contact</legend>
          <label class="e-permits-fo-radio"><input type="radio" name="fo-contact-person" value="self" ${field.default !== "other" ? "checked" : ""}><span class="e-permits-fo-radio__control" aria-hidden="true"></span><span>Eu sunt persoana de contact</span></label>
          <label class="e-permits-fo-radio"><input type="radio" name="fo-contact-person" value="other" ${field.default === "other" ? "checked" : ""}><span class="e-permits-fo-radio__control" aria-hidden="true"></span><span>Altă persoană</span></label>
        </fieldset>
        <div class="e-permits-fo-detail-card e-permits-fo-contact-card e-permits-fo-contact-card--self" data-fo-contact-self>
          <div class="e-permits-fo-contact-card__grid">${phoneFieldHtml(phoneField, { readonly: true })}</div>
        </div>
        <div class="e-permits-fo-detail-card e-permits-fo-contact-card" data-fo-contact-other hidden>
          <div class="e-permits-fo-contact-card__grid">
            ${textFieldHtml({ id: "contact-first-name", label: "Nume", required: true, span: 6, placeholder: "Anastasia", autocomplete: "given-name" })}
            ${textFieldHtml({ id: "contact-last-name", label: "Prenume", required: true, span: 6, placeholder: "Cojocaru", autocomplete: "family-name" })}
            ${phoneFieldHtml({ id: "contact-phone", label: "Telefon", required: true, span: 6, placeholder: "60 999 999", countryCodes: [{ flag: "🇲🇩", code: "+373" }, { flag: "🇷🇴", code: "+40" }, { flag: "🇺🇦", code: "+380" }] })}
          </div>
        </div>
      `;
    }

    function caemOptionHtml(option) {
      return `<li class="e-permits-fo-caem__option" role="option" aria-selected="false" data-code="${escapeFrontOfficeHtml(option.code)}" data-label="${escapeFrontOfficeHtml(option.label)}" data-subgenres="${escapeFrontOfficeHtml(JSON.stringify(option.subgenres || []))}" tabindex="-1"><span class="e-permits-fo-caem__code">${escapeFrontOfficeHtml(option.code)}</span><span class="e-permits-fo-caem__name">${escapeFrontOfficeHtml(option.label)}</span></li>`;
    }

    function activityCardHtml(field) {
      const options = field.caemOptions || [];
      return `
        <div class="e-permits-fo-activity-card" data-fo-activity-card>
          <div class="e-permits-fo-activity-card__header">
            <div class="e-permits-fo-activity-card__title"><span data-fo-activity-index>#1</span><strong>Activitate</strong></div>
          </div>
          <div class="e-permits-fo-field">
            ${labelHtml("fo-caem-code", { label: "Codul CAEM", required: true })}
            <div class="e-permits-fo-caem" data-fo-caem>
              <button id="fo-caem-code" class="e-permits-fo-caem__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="fo-caem-code-menu" data-fo-caem-button>
                <span class="e-permits-fo-caem__value e-permits-fo-caem__value--placeholder" data-fo-caem-value>Selectează cod CAEM</span>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
              </button>
              <div class="e-permits-fo-caem__menu" id="fo-caem-code-menu" data-fo-caem-menu hidden>
                <div class="e-permits-fo-caem__search"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg><input type="search" placeholder="Caută după cod sau descriere" aria-label="Caută după cod sau descriere" data-fo-caem-search></div>
                <ul class="e-permits-fo-caem__list" id="fo-caem-code-list" role="listbox" aria-labelledby="fo-caem-code" data-fo-caem-list>${options.map(caemOptionHtml).join("")}</ul>
                <div class="e-permits-fo-caem__empty" data-fo-caem-empty hidden>Nu există rezultate pentru căutarea introdusă.</div>
              </div>
            </div>
          </div>
          <div class="e-permits-fo-subgen" data-fo-subgen hidden>
            <div class="e-permits-fo-subgen__line" aria-hidden="true"></div>
            <div class="e-permits-fo-subgen__content">
              <div class="e-permits-fo-field">
                ${labelHtml("fo-subgen-activity", { label: "Subgen de activitate", required: true })}
                <div class="e-permits-fo-subgen-select" data-fo-subgen-select>
                  <button id="fo-subgen-activity" class="e-permits-fo-subgen-select__button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="fo-subgen-menu" data-fo-subgen-button>
                    <span class="e-permits-fo-subgen-select__value e-permits-fo-subgen-select__value--placeholder" data-fo-subgen-value>Alege subgen de activitate</span>
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                  </button>
                  <div class="e-permits-fo-subgen-select__menu" id="fo-subgen-menu" data-fo-subgen-menu hidden>
                    <div class="e-permits-fo-subgen-select__search"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg><input type="search" placeholder="Caută subgen" aria-label="Caută subgen" data-fo-subgen-search></div>
                    <ul class="e-permits-fo-subgen-select__list" role="listbox" aria-labelledby="fo-subgen-activity" aria-multiselectable="true" data-fo-subgen-list></ul>
                    <div class="e-permits-fo-subgen-select__footer"><span><strong data-fo-subgen-count>0</strong> <span data-fo-subgen-count-label>selectate</span></span><button class="e-permits-fo-subgen-select__confirm" type="button" data-fo-subgen-confirm>Confirmă</button></div>
                  </div>
                </div>
              </div>
              <div class="e-permits-fo-subgen__chips" data-fo-subgen-chips hidden></div>
            </div>
          </div>
        </div>
        <button class="e-permits-fo-add-activity" type="button" data-fo-add-activity><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-small"></use></svg><span>Adaugă altă activitate</span></button>
      `;
    }

    function stepFieldHtml(field) {
      if (field.type === "cascade-address") return cascadeAddressHtml(field);
      if (field.type === "subdivision") return subdivisionFieldHtml(field);
      if (field.type === "address-pattern") return addressPatternHtml(field);
      if (field.type === "phone") return phoneFieldHtml(field);
      if (field.type === "email" || field.type === "text") return textFieldHtml(field);
      if (field.type === "contact-person") return contactPersonHtml(field);
      if (field.type === "activity-list") return activityCardHtml(field);
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
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6.45833 3.125V6.04167C6.45833 6.5019 6.83143 6.875 7.29167 6.875H12.7083C13.1686 6.875 13.5417 6.5019 13.5417 6.04167V3.125M16.875 6.31536V15.2083C16.875 16.1288 16.1288 16.875 15.2083 16.875H4.79167C3.87119 16.875 3.125 16.1288 3.125 15.2083V4.79167C3.125 3.87119 3.87119 3.125 4.79167 3.125H13.6846C14.1267 3.125 14.5506 3.30059 14.8632 3.61316L16.3868 5.13684C16.6994 5.44941 16.875 5.87333 16.875 6.31536ZM6.45833 11.4583V16.0417C6.45833 16.5019 6.83143 16.875 7.29167 16.875H12.7083C13.1686 16.875 13.5417 16.5019 13.5417 16.0417V11.4583C13.5417 10.9981 13.1686 10.625 12.7083 10.625H7.29167C6.83143 10.625 6.45833 10.9981 6.45833 11.4583Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary">
              <button class="e-permits-fo-back-button" type="button" aria-label="Înapoi la Date solicitant" data-fo-prev="step-2"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>
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
              <p class="e-permits-fo-mdocs__empty" hidden data-fo-mdocs-empty>Nu am găsit documente în MDocs.</p>
            </div>
            <div class="e-permits-fo-mdocs__attachment" hidden data-fo-mdocs-attachment>
              <span class="e-permits-fo-mdocs__attachment-avatar" aria-hidden="true">
                <svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-document"></use></svg>
              </span>
              <span class="e-permits-fo-mdocs__attachment-content">
                <span class="e-permits-fo-mdocs__attachment-title-row">
                  <span class="e-permits-fo-mdocs__attachment-title" data-fo-mdocs-attachment-title></span>
                  <span class="e-permits-fo-mdocs__status-tag">Activă</span>
                </span>
                <span class="e-permits-fo-mdocs__attachment-meta" data-fo-mdocs-attachment-meta></span>
              </span>
              <button class="e-permits-fo-mdocs__attachment-remove" type="button" aria-label="Elimină documentul din MDocs" data-fo-mdocs-remove>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
              </button>
            </div>
          </div>
        `;
      }

      function documentItemHtml(doc) {
        const requiredHtml = doc.required
          ? `<span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>`
          : `<span class="e-permits-fo-optional-tag">Opțional</span>`;
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
                <span class="e-permits-fo-optional-tag">Opțional</span>
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
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6.45833 3.125V6.04167C6.45833 6.5019 6.83143 6.875 7.29167 6.875H12.7083C13.1686 6.875 13.5417 6.5019 13.5417 6.04167V3.125M16.875 6.31536V15.2083C16.875 16.1288 16.1288 16.875 15.2083 16.875H4.79167C3.87119 16.875 3.125 16.1288 3.125 15.2083V4.79167C3.125 3.87119 3.87119 3.125 4.79167 3.125H13.6846C14.1267 3.125 14.5506 3.30059 14.8632 3.61316L16.3868 5.13684C16.6994 5.44941 16.875 5.87333 16.875 6.31536ZM6.45833 11.4583V16.0417C6.45833 16.5019 6.83143 16.875 7.29167 16.875H12.7083C13.1686 16.875 13.5417 16.5019 13.5417 16.0417V11.4583C13.5417 10.9981 13.1686 10.625 12.7083 10.625H7.29167C6.83143 10.625 6.45833 10.9981 6.45833 11.4583Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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

    function subjectRolesHtml(subject) {
      const representative = representativeForSubject(subject);
      if (!representative) {
        return `
          <div class="e-permits-fo-form__role-group">
            ${roleGroupTitleHtml("Solicitant")}
            <div class="e-permits-fo-selected-role e-permits-fo-selected-role--changeable">
              ${selectedRoleHtml(subject, { changeable: true })}
            </div>
          </div>
        `;
      }
      return `
        <div class="e-permits-fo-form__role-group">
          ${roleGroupTitleHtml("Solicitant")}
          <div class="e-permits-fo-selected-role e-permits-fo-selected-role--changeable">
            ${selectedRoleHtml(subject, { changeable: true })}
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

    function readonlyFieldHtml(field) {
      const span = [4, 6, 8, 12].includes(Number(field.span)) ? Number(field.span) : 4;
      return `
        <div class="e-permits-fo-field e-permits-fo-field--span-${span}">
          <label>${escapeFrontOfficeHtml(field.label)}</label>
          <div class="e-permits-fo-input is-filled is-readonly">
            <span class="e-permits-fo-input__value">${escapeFrontOfficeHtml(field.value)}</span>
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-checkmark-small"></use>
            </svg>
          </div>
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
      setServiceHeaderFromSchema(schema);
      setBetaBannerFromSchema(schema);
      setAuthFromSchema(schema);
      renderRolesFromSchema(schema);
      renderStepperFromSchema(schema);
      renderFrontOfficeStep2FromSchema(schema);
      renderFrontOfficeStep3FromSchema(schema);
      selectFrontOfficeSubject(schema.defaultSubjectId);
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
        choice: frontOfficeChoiceScreen,
        request: frontOfficeRequestScreen,
      };

      Object.entries(screens).forEach(([name, node]) => {
        if (!node) return;
        node.hidden = name !== screen;
      });

      frontOfficeMain?.classList.toggle("is-request-mode", screen === "request");
      frontOfficeRoot?.classList.toggle("is-request-mode", screen === "request");
      document.body.classList.toggle("is-fo-request-mode", screen === "request");
      if (frontOfficeAvatarMenu) {
        const shouldShowRoleSwitcher = screen === "request";
        frontOfficeAvatarMenu.hidden = !shouldShowRoleSwitcher;
        frontOfficeAvatarMenu.setAttribute("aria-hidden", String(!shouldShowRoleSwitcher));
        if (!shouldShowRoleSwitcher) setFrontOfficeAvatarMenuOpen(false);
      }
      if (screen === "request") {
        const activeStep = Number(document.querySelector("[data-fo-step].is-active")?.dataset.foStep) || 1;
        updateFrontOfficeMobileProgress(activeStep);
        scrollFrontOfficeStepToTop();
      }

      if (!focus) return;
      if (screen === "choice") {
        frontOfficeChoiceScreen?.querySelector(".e-permits-fo-auth__role-item")?.focus({ preventScroll: true });
      }
      if (screen === "request") {
        frontOfficeRequestScreen?.querySelector("[data-fo-step-panel]:not([hidden]) h1")?.focus?.({ preventScroll: true });
        scrollFrontOfficeStepToTop();
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

    function setFrontOfficeStep(step, { focus = true, scroll = true } = {}) {
      if (Number(step) >= 2 && !frontOfficeDraftCreated) {
        saveFrontOfficeDraft();
      } else {
        updateFrontOfficeRequestHeaders();
      }

      frontOfficeStepPanels.forEach((panel) => {
        panel.hidden = panel.dataset.foStepPanel !== String(step);
      });

      frontOfficeStepperItems.forEach((item) => {
        const itemStep = Number(item.dataset.foStep);
        const isActive = itemStep === step;
        item.classList.toggle("is-active", isActive);
        item.classList.toggle("is-completed", itemStep < step);
        if (isActive) {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
      });

      updateFrontOfficeMobileProgress(step);

      if (focus) {
        frontOfficeRequestScreen?.querySelector("[data-fo-step-panel]:not([hidden]) h1")?.focus?.({ preventScroll: true });
      }
      if (scroll) scrollFrontOfficeStepToTop();
    }

    function showFrontOfficeChoice({ focus = true } = {}) {
      if (!frontOfficeAuthScreen || !frontOfficeChoiceScreen) return;
      setFrontOfficeScreen("choice", { focus });
    }

    function showFrontOfficeRequest({ focus = true, step = 1 } = {}) {
      if (!frontOfficeRequestScreen) return;
      setFrontOfficeStep(step, { focus: false });
      setFrontOfficeScreen("request", { focus });
    }

    frontOfficeSchemaLoadPromise = loadFrontOfficeSchema().then((schema) => {
      if (window.location.hash === "#request" || window.location.hash === "#request-step-2" || window.location.hash === "#request-step-3" || window.location.hash === "#request-step-4") {
        selectFrontOfficeSubject(frontOfficeSelectedSubject?.id || frontOfficeSchema?.defaultSubjectId);
        const hashStep = window.location.hash === "#request-step-4" ? 4 : window.location.hash === "#request-step-3" ? 3 : window.location.hash === "#request-step-2" ? 2 : 1;
        setFrontOfficeStep(hashStep, { focus: false });
        if (hashStep === 4) populateFrontOfficeStep4();
      }
      return schema;
    });

    if (window.location.hash === "#choice") {
      setFrontOfficeScreen("choice", { focus: false });
    }

    if (window.location.hash === "#request") {
      showFrontOfficeRequest({ focus: false, step: 1 });
    }

    if (window.location.hash === "#request-step-2") {
      showFrontOfficeRequest({ focus: false, step: 2 });
    }

    if (window.location.hash === "#request-step-3") {
      showFrontOfficeRequest({ focus: false, step: 3 });
    }

    if (window.location.hash === "#request-step-4") {
      showFrontOfficeRequest({ focus: false, step: 4 });
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
      if (window.location.hash !== "#choice") {
        history.replaceState(null, "", "#choice");
      }
      showFrontOfficeChoice();
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
    const FO_DOC_LIBRARY = [
      { type: "emis", title: 'Extras Registru de Stat - "Vita-Plant" SRL', badge: "Activă", emis: "12.03.2026", authority: "ASP" },
      { type: "emis", title: 'Extras Registru de Stat - "Eco-Farm" SRL', emis: "15.05.2025", authority: "ASP" },
      { type: "emis", title: 'Aviz sanitar - "Global Trader" SRL', emis: "18.05.2025", authority: "ANSP" },
      { type: "emis", title: 'Autorizație sanitară de funcționare - "Global Trader" SRL', emis: "06.04.2024", authority: "ANSP" },
      { type: "uploaded", fileName: "copia-actului-de-proprietate.pdf", size: "1.8 MB" },
      { type: "uploaded", fileName: "planul-incaperilor.pdf", size: "2.7 MB" },
      { type: "uploaded", fileName: "design-architectural.docx", size: "1.5 MB" },
    ];

    let foDocModalField = null;
    let foDocModalSelectedLib = null;
    let foDocModalPendingFile = null;

    const foDocOverlay = document.querySelector("[data-fo-doc-modal-overlay]");
    const foDocModalList = foDocOverlay?.querySelector("[data-fo-doc-modal-list]");
    const foDocSearchInput = foDocOverlay?.querySelector("[data-fo-doc-search]");
    const foDocSubmitBtn = foDocOverlay?.querySelector("[data-fo-doc-modal-submit]");
    const foDocUploadPreview = foDocOverlay?.querySelector("[data-fo-doc-upload-preview]");
    const foDocFileInput = foDocOverlay?.querySelector("[data-fo-doc-file-input]");

    function foDocLibItemHTML(doc) {
      if (doc.type === "uploaded") {
        return `<button class="e-permits-fo-lib-item" type="button">
          <svg class="e-permits-fo-lib-item__icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-page-text"></use></svg>
          <div class="e-permits-fo-lib-item__content">
            <div class="e-permits-fo-lib-item__title-row">
              <span class="e-permits-fo-lib-item__title">${escapeFrontOfficeHtml(doc.fileName)}</span>
              ${doc.size ? `<span class="e-permits-fo-lib-item__size"><span class="e-permits-fo-lib-item__size-dot">•</span>${escapeFrontOfficeHtml(doc.size)}</span>` : ""}
            </div>
          </div>
          <svg class="icon e-permits-fo-lib-item__check" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>
        </button>`;
      }
      return `<button class="e-permits-fo-lib-item" type="button">
        <img class="e-permits-fo-lib-item__icon" src="assets/icons/document-generated.svg" width="24" height="24" alt="">
        <div class="e-permits-fo-lib-item__content">
          <div class="e-permits-fo-lib-item__title-row">
            <span class="e-permits-fo-lib-item__title">${escapeFrontOfficeHtml(doc.title)}</span>
            ${doc.badge ? `<span class="e-permits-fo-lib-item__badge">${escapeFrontOfficeHtml(doc.badge)}</span>` : ""}
          </div>
          ${doc.emis || doc.authority ? `<div class="e-permits-fo-lib-item__meta">
            <span>Emis <strong>${escapeFrontOfficeHtml(doc.emis || "")}</strong></span>
            <span class="e-permits-fo-lib-item__dot" aria-hidden="true"></span>
            <span>${escapeFrontOfficeHtml(doc.authority || "")}</span>
          </div>` : ""}
        </div>
        <svg class="icon e-permits-fo-lib-item__check" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>
      </button>`;
    }

    function foDocRenderLibrary(filter) {
      if (!foDocModalList) return;
      const q = (filter || "").toLowerCase().trim();
      const filtered = q ? FO_DOC_LIBRARY.filter((d) => {
        const text = d.type === "uploaded"
          ? (d.fileName || "")
          : `${d.title || ""} ${d.authority || ""}`;
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

    function foDocSwitchTab(tab) {
      foDocOverlay?.querySelectorAll("[data-fo-doc-tab]").forEach((t) => t.classList.toggle("active", t.dataset.foDocTab === tab));
      foDocOverlay?.querySelectorAll("[data-fo-doc-panel]").forEach((p) => { p.hidden = p.dataset.foDocPanel !== tab; });
      foDocUpdateSubmit();
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
      foDocSwitchTab("library");
      foDocOverlay.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function foDocCloseModal() {
      if (!foDocOverlay) return;
      foDocOverlay.hidden = true;
      document.body.style.overflow = "";
      foDocModalField = null;
      foDocModalSelectedLib = null;
      foDocModalPendingFile = null;
    }

    function foDocAttachFileItem(container, fileName, sizeLabel) {
      container.querySelectorAll(".e-permits-fo-file-item").forEach((el) => el.remove());
      const item = document.createElement("div");
      item.className = "e-permits-fo-file-item is-uploaded e-permits-fo-doc-attached-item";
      item.innerHTML = `
        <div class="e-permits-fo-lib-item__icon">
          <svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-page-text"></use></svg>
        </div>
        <div class="e-permits-fo-lib-item__content">
          <div class="e-permits-fo-lib-item__title-row">
            <span class="e-permits-fo-lib-item__title e-permits-fo-file-item__name">${escapeFrontOfficeHtml(fileName)}</span>
          </div>
          ${sizeLabel ? `<div class="e-permits-fo-lib-item__meta">${escapeFrontOfficeHtml(sizeLabel)}</div>` : ""}
        </div>
        <button class="e-permits-fo-doc-attached-item__remove" type="button" aria-label="Elimină">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
        </button>`;
      item.querySelector(".e-permits-fo-doc-attached-item__remove").addEventListener("click", () => item.remove());
      container.appendChild(item);
    }

    function foDocAttachMdocsItem(container, doc) {
      container.querySelectorAll(".e-permits-fo-mdocs__attachment").forEach((el) => el.remove());
      const att = document.createElement("div");
      att.className = "e-permits-fo-mdocs__attachment";
      const metaText = doc.emis ? `Emis ${doc.emis} · ${doc.authority || ""}` : (doc.authority || "");
      att.innerHTML = `
        <div class="e-permits-fo-lib-item__icon">
          <img src="assets/icons/document-generated.svg" width="24" height="24" alt="">
        </div>
        <div class="e-permits-fo-lib-item__content">
          <div class="e-permits-fo-lib-item__title-row">
            <span class="e-permits-fo-lib-item__title e-permits-fo-mdocs__attachment-title">${escapeFrontOfficeHtml(doc.title)}</span>
            ${doc.badge ? `<span class="e-permits-fo-lib-item__badge">${escapeFrontOfficeHtml(doc.badge)}</span>` : ""}
          </div>
          ${doc.emis || doc.authority ? `<div class="e-permits-fo-lib-item__meta">Emis <strong>${escapeFrontOfficeHtml(doc.emis || "")}</strong><span class="e-permits-fo-lib-item__dot"></span>${escapeFrontOfficeHtml(doc.authority || "")}</div>` : ""}
          <span class="e-permits-fo-mdocs__attachment-meta" hidden>${escapeFrontOfficeHtml(metaText)}</span>
        </div>
        <button class="e-permits-fo-mdocs__attachment-remove" type="button" aria-label="Elimină">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
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
          foDocUploadPreview.innerHTML = `<div class="e-permits-fo-file-item is-uploaded" style="max-width:100%;height:auto;padding:12px 16px;"><span class="e-permits-fo-file-item__name">${escapeFrontOfficeHtml(file.name)}</span></div>`;
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
          foDocAttachFileItem(filesContainer, foDocModalPendingFile.name, "");
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
          foDocAttachFileItem(floorFiles, "planul-incaperilor", "1.8 MB");
        }
        const extrasFiles = step3Panel.querySelector("[data-fo-doc-field='state-registry-extract'] [data-fo-doc-field-files], [data-fo-doc-field='extras-registru'] [data-fo-doc-field-files]");
        if (extrasFiles && !extrasFiles.querySelector(".e-permits-fo-mdocs__attachment")) {
          foDocAttachMdocsItem(extrasFiles, { title: 'Extras Registru de Stat - "Global Trader" SRL', emis: "12.03.2026", authority: "ASP" });
        }
        const hygieneFiles = step3Panel.querySelector("[data-fo-doc-field='hygiene-certificates'] [data-fo-doc-field-files], [data-fo-doc-field='hygiene-cert'] [data-fo-doc-field-files]");
        if (hygieneFiles && !hygieneFiles.querySelector(".e-permits-fo-file-item")) {
          foDocAttachFileItem(hygieneFiles, "planul-incaperilor-etajului-subsol", "1.8 MB");
        }
      }
    }

    function populateFrontOfficeStep4() {
      const panel = document.querySelector("[data-fo-step-panel='4']");
      if (!panel) return;
      panel.querySelector(".e-permits-fo-infobox")?.remove();
      const container = panel.querySelector("[data-fo-review-sections]");
      if (!container) return;

      applyFrontOfficeStep4DemoFill();

      const subject = frontOfficeSelectedSubject;
      const user = frontOfficeSchema?.authenticatedUser;
      const signing = frontOfficeSchema?.steps?.find((item) => Number(item.index) === 4)?.signing || {};
      const isSigned = frontOfficeStep4Signed;
      const step2Panel = document.querySelector("[data-fo-step-panel='2']");

      // --- Applicant rows ---
      let applicantRows = "";
      if (subject) {
        const isProxy = subject.type === "PJ" && user;
        applicantRows += summaryRow(subject.type === "PJ" ? "Date companie" : "Date solicitant", [
          escapeFrontOfficeHtml(subject.name),
          escapeFrontOfficeHtml(`${subject.idLabel} ${subject.idValue}`),
        ]);
        if (isProxy) {
          applicantRows += summaryRow("Date reprezentant", [
            escapeFrontOfficeHtml(user.name),
            escapeFrontOfficeHtml(`${user.idLabel} ${user.idValue}`),
            escapeFrontOfficeHtml(user.phone || "+37322000000"),
            escapeFrontOfficeHtml(user.email || "a.cojocaru1993@gmail.com"),
          ]);
        }
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
        contactName = user ? (user.contactName || user.name) : "—";
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
      const uploadedItems = Array.from(document.querySelectorAll("[data-fo-step-panel='3'] .e-permits-fo-file-item.is-uploaded"));
      const mdocsAttachments = Array.from(document.querySelectorAll("[data-fo-step-panel='3'] .e-permits-fo-mdocs__attachment"));

      let docsHtml = uploadedItems
        .map((item) => {
          const name = item.querySelector(".e-permits-fo-file-item__name")?.textContent?.trim() || "";
          const size = item.querySelector(".e-permits-fo-file-item__size")?.textContent?.trim() || "";
          return `<div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--uploaded"><img class="e-permits-fo-confirm-file__icon" width="24" height="24" src="assets/icons/document-uploaded.svg" alt=""><div class="e-permits-fo-confirm-file__name-group"><span class="e-permits-fo-confirm-file__name">${escapeFrontOfficeHtml(name)}</span>${size ? `<span class="e-permits-fo-confirm-file__sep">•</span><span class="e-permits-fo-confirm-file__size">${escapeFrontOfficeHtml(size)}</span>` : ""}</div></div>`;
        })
        .join("");

      mdocsAttachments.forEach((att) => {
        if (att.hidden) return;
        const titleEl = att.querySelector(".e-permits-fo-mdocs__attachment-title");
        if (!titleEl || !titleEl.textContent.trim()) return;
        const metaEl = att.querySelector(".e-permits-fo-mdocs__attachment-meta");
        docsHtml += `<div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--system"><img class="e-permits-fo-confirm-file__icon" width="24" height="24" src="assets/icons/document-generated.svg" alt=""><div class="e-permits-fo-confirm-file__column"><div class="e-permits-fo-confirm-file__title-row"><span class="e-permits-fo-confirm-file__name">${titleEl.innerHTML}</span></div>${metaEl ? `<div class="e-permits-fo-confirm-file__meta">${metaEl.innerHTML}</div>` : ""}</div></div>`;
      });

      if (!docsHtml) {
        docsHtml = `<p class="e-permits-fo-mdocs__empty" style="padding-left:0">Nu au fost adăugate documente.</p>`;
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
        <div class="e-permits-fo-summary-section e-permits-fo-summary-section--signing">
          <div class="e-permits-fo-summary-section__header">
            <h2 class="e-permits-fo-summary-section__heading">${escapeFrontOfficeHtml(signing.title || "Semnarea cererii")}</h2>
          </div>
          <div class="e-permits-fo-signing-card${isSigned ? " is-signed" : ""}">
            <div class="e-permits-fo-signing-card__main">
              <img class="e-permits-fo-signing-card__icon" width="24" height="24" src="assets/icons/document-generated.svg" alt="">
              <div class="e-permits-fo-signing-card__content">
                <div class="e-permits-fo-signing-card__title-row">
                  <span class="e-permits-fo-signing-card__title">${escapeFrontOfficeHtml(signing.documentTitle || "Cererea care urmează să fie semnată")}</span>
                  <span class="e-permits-fo-signing-card__badge">
                    ${isSigned ? `<svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>` : ""}
                    <span>${escapeFrontOfficeHtml(isSigned ? "Semnat" : (signing.status || "Necesită semnătură"))}</span>
                  </span>
                </div>
                <div class="e-permits-fo-signing-card__meta">
                  <span>Nr. <strong>${escapeFrontOfficeHtml(signing.number || "C000000/2026")}</strong></span>
                  <span class="e-permits-fo-summary-dot" aria-hidden="true"></span>
                  <span>din ${escapeFrontOfficeHtml(signing.date || "01.01.2026")}</span>
                </div>
              </div>
            </div>
            <button class="e-permits-fo-signing-card__preview" type="button">
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-eye-open"></use></svg>
              <span>Vezi documentul</span>
            </button>
          </div>
          ${isSigned ? "" : `<button class="e-permits-fo-msign-button" type="button" data-fo-msign-trigger>
            <img src="assets/logos/m-platforms/m-sign.svg" width="24" height="24" alt="" aria-hidden="true">
            Semnează prin msign
          </button>`}
        </div>
      `;

      const footer = panel.querySelector(".e-permits-fo-form__footer");
      if (footer) {
        footer.innerHTML = `
          <div class="e-permits-fo-form__actions e-permits-fo-form__actions--confirmation">
            <button class="e-permits-fo-draft-button" type="button">
              <svg class="icon e-permits-fo-draft-button__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6.45833 3.125V6.04167C6.45833 6.5019 6.83143 6.875 7.29167 6.875H12.7083C13.1686 6.875 13.5417 6.5019 13.5417 6.04167V3.125M16.875 6.31536V15.2083C16.875 16.1288 16.1288 16.875 15.2083 16.875H4.79167C3.87119 16.875 3.125 16.1288 3.125 15.2083V4.79167C3.125 3.87119 3.87119 3.125 4.79167 3.125H13.6846C14.1267 3.125 14.5506 3.30059 14.8632 3.61316L16.3868 5.13684C16.6994 5.44941 16.875 5.87333 16.875 6.31536ZM6.45833 11.4583V16.0417C6.45833 16.5019 6.83143 16.875 7.29167 16.875H12.7083C13.1686 16.875 13.5417 16.5019 13.5417 16.0417V11.4583C13.5417 10.9981 13.1686 10.625 12.7083 10.625H7.29167C6.83143 10.625 6.45833 10.9981 6.45833 11.4583Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Salvează ca schiță</span>
            </button>
            <div class="e-permits-fo-form__actions-primary">
              <button class="e-permits-fo-back-button" type="button" aria-label="Înapoi la Documente însoțitoare" data-fo-prev="step-4">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
              </button>
              <button class="e-permits-fo-next" type="button" data-fo-next="step-4"${isSigned ? "" : " disabled"}>
                <span>Înainte</span>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
              </button>
            </div>
          </div>
        `;
      }

      const msignBtn = container.querySelector("[data-fo-msign-trigger]");
      if (msignBtn) {
        msignBtn.addEventListener("click", () => {
          msignBtn.disabled = true;
          msignBtn.innerHTML = `<svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>Se semnează...`;
          setTimeout(() => {
            frontOfficeStep4Signed = true;
            populateFrontOfficeStep4();
          }, 900);
        });
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
      const selected = selectFrontOfficeSubject(roleButton.dataset.foSubjectId);
      if (selected) {
        setFrontOfficeAvatarMenuOpen(false);
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
      if (event.key !== "Escape" || !frontOfficeAvatarMenu?.classList.contains("is-open")) return;
      setFrontOfficeAvatarMenuOpen(false);
      frontOfficeAvatarTrigger?.focus();
    });

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-fo-edit-step]");
      if (!editButton) return;
      const step = Number(editButton.dataset.foEditStep);
      if (!step) return;
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
        if (window.location.hash !== "#request") history.replaceState(null, "", "#request");
        showFrontOfficeRequest({ step: 1 });
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
      }
    });

    function syncContactPersonGroup(group) {
      if (!group || group.dataset.foContactBound === "true") return;
      group.dataset.foContactBound = "true";
      const selfCard = group.parentElement?.querySelector("[data-fo-contact-self]");
      const otherCard = group.parentElement?.querySelector("[data-fo-contact-other]");
      const radios = Array.from(group.querySelectorAll("input[type='radio'][name='fo-contact-person']"));
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
      const field = event.target.closest(".e-permits-fo-input:not(.is-readonly), .e-permits-fo-phone--editable, .e-permits-fo-textarea, .e-permits-builder__search");
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
      const searchTrigger = searchRoot.querySelector(".e-permits-fo-input") || input;
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

      function renderSuggestions(items) {
        visibleAddresses = items;
        activeIndex = 0;
        list.innerHTML = "";

        if (!items.length) {
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
              <use href="assets/icons/sprite.svg#icon-map-pin"></use>
            </svg>
            <span class="e-permits-fo-address-search__copy">
              <span class="e-permits-fo-address-search__title"></span>
              <span class="e-permits-fo-address-search__meta"></span>
            </span>
          `;
          option.querySelector(".e-permits-fo-address-search__title").textContent = item.title;
          option.querySelector(".e-permits-fo-address-search__meta").textContent = item.meta;
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
        const query = input.value.trim().toLocaleLowerCase("ro");
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
        input.value = item.value;
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
        resetAddressParts();
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
        options.forEach((item) => {
          const isSelected = item === option;
          item.classList.toggle("is-selected", isSelected);
          item.setAttribute("aria-selected", String(isSelected));
        });
        value.textContent = option.textContent.trim();
        value.classList.remove("e-permits-fo-select__value--placeholder");
        activeIndex = options.indexOf(option);
        setOpen(false);
        button.focus();
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
          <span class="e-permits-fo-subgen-select__checkbox" aria-hidden="true"><svg class="icon" width="16" height="16"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg></span>
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
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-document"></use></svg>
            <div class="e-permits-fo-file-item__name-group">
              <span class="e-permits-fo-file-item__name">${escapeFrontOfficeHtml(file.name)}</span>
              <span class="e-permits-fo-file-item__sep">•</span>
              <span class="e-permits-fo-file-item__size">${escapeFrontOfficeHtml(formatFoFileSize(file.size))}</span>
            </div>
          </div>
          <button class="e-permits-fo-file-item__remove" type="button" aria-label="Elimină fișierul" hidden>
            <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg>
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
      const attachmentTitle = root.querySelector("[data-fo-mdocs-attachment-title]");
      const attachmentMeta = root.querySelector("[data-fo-mdocs-attachment-meta]");
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

        if (attachment && attachmentTitle && attachmentMeta) {
          const [issuedLabel = "", issuer = ""] = meta.split("·").map((part) => part.trim());
          attachmentTitle.textContent = title;
          attachmentMeta.replaceChildren();
          if (issuedLabel) {
            const issued = document.createElement("span");
            const issuedDate = document.createElement("strong");
            issued.append("Emis ");
            issuedDate.textContent = issuedLabel.replace(/^Emis\s+/i, "");
            issued.append(issuedDate);
            attachmentMeta.append(issued);
          }
          if (issuer) {
            const dot = document.createElement("span");
            dot.setAttribute("aria-hidden", "true");
            dot.textContent = "•";
            const source = document.createElement("span");
            source.textContent = issuer;
            attachmentMeta.append(dot, source);
          }
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
        if (attachment) attachment.hidden = true;
        if (attachmentTitle) attachmentTitle.textContent = "";
        if (attachmentMeta) attachmentMeta.textContent = "";
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
        value.textContent = selected.length === 0 ? "Alege subgen de activitate" : `${selected.length} ${selected.length === 1 ? "subgen selectat" : "subgenuri selectate"}`;
        value.classList.toggle("e-permits-fo-subgen-select__value--placeholder", selected.length === 0);
        chips.hidden = selected.length === 0;
        chips.innerHTML = "";
        selected.forEach((option) => {
          const chip = document.createElement("span");
          chip.className = "e-permits-fo-subgen-chip";
          chip.dataset.value = option.dataset.value || "";
          chip.innerHTML = `
            <span class="e-permits-fo-subgen-chip__label"></span>
            <button class="e-permits-fo-subgen-chip__remove" type="button" aria-label="Elimină subgenul">
              <svg class="icon" width="20" height="20" aria-hidden="true">
                <use href="assets/icons/sprite.svg#icon-cross-small"></use>
              </svg>
            </button>
          `;
          chip.querySelector(".e-permits-fo-subgen-chip__label").textContent = option.dataset.value || "";
          chip.querySelector(".e-permits-fo-subgen-chip__remove").addEventListener("click", () => {
            option.classList.remove("is-selected");
            option.setAttribute("aria-selected", "false");
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

    function initFormBuilder() {
      const builder = document.querySelector(".e-permits-builder");
      if (!builder) return;
      const builderOverlay = builder.closest("#form-builder-modal");
      if (builderOverlay && builderOverlay.parentElement !== document.body) {
        document.body.appendChild(builderOverlay);
      }

      const canvas = builder.querySelector("[data-builder-grid]");
      const dropzone = builder.querySelector("[data-builder-dropzone]");
      const librarySearch = builder.querySelector("[data-builder-library-search]");
      const libraryItems = Array.from(builder.querySelectorAll("[data-builder-component]"));
      const propLabel = builder.querySelector("[data-builder-prop-label]");
      const propPreview = builder.querySelector("[data-builder-prop-preview]");
      const propFieldId = builder.querySelector("[data-builder-prop-field-id]");
      const requiredInput = builder.querySelector("[data-builder-required]");
      const inspectorTitle = builder.querySelector("[data-builder-inspector-title]");
      const inspectorFieldId = builder.querySelector("[data-builder-inspector-field-id]");
      const deleteButton = builder.querySelector("[data-builder-delete]");
      const previewGrid = builder.querySelector("[data-builder-preview-grid]");
      const previewStepper = builder.querySelector("[data-builder-preview-stepper]");
      const previewStepMeta = builder.querySelector("[data-builder-preview-step-meta]");
      const previewTitle = builder.querySelector("[data-builder-preview-title]");
      const previewSectionTitle = builder.querySelector("[data-builder-preview-section-title]");
      const previewSectionDescription = builder.querySelector("[data-builder-preview-section-description]");
      const previewSectionSeparator = builder.querySelector("[data-builder-preview-section-separator]");
      const schemaCode = builder.querySelector("[data-builder-schema-code]");
      const previewPanel = builder.querySelector("[data-builder-preview]");
      const schemaPanel = builder.querySelector("[data-builder-schema]");
      const canvasSection = builder.querySelector("[data-builder-canvas]");
      const gridToggle = builder.querySelector("[data-builder-grid-toggle]");
      const workspace = builder.querySelector("[data-builder-workspace]");
      const sourceEmpty = builder.querySelector("[data-builder-source-empty]");
      const sourceContent = builder.querySelector("[data-builder-source-content]");
      const sourceTab = builder.querySelector("[data-builder-source-tab]");
      const sourceTabIcon = builder.querySelector("[data-builder-source-tab-icon]");
      const sourceTabBadge = builder.querySelector("[data-builder-source-tab-badge]");
      const sourceTabLabel = builder.querySelector("[data-builder-source-tab-label]");
      const addressDataPanel = builder.querySelector("[data-builder-address-data]");
      const addressDataList = builder.querySelector("[data-builder-address-data-list]");
      const fieldSettingsPanel = builder.querySelector("[data-builder-field-settings]");
      const formSettingsPanel = builder.querySelector("[data-builder-form-settings]");
      const sectionSettingsPanel = builder.querySelector("[data-builder-section-settings]");
      const sectionInspectorTitle = builder.querySelector("[data-builder-section-inspector-title]");
      const sectionPropTitle = builder.querySelector("[data-builder-section-prop-title]");
      const sectionPropDescription = builder.querySelector("[data-builder-section-prop-description]");
      const registryModal = document.querySelector("#builder-classifier-registry");
      const registryList = registryModal?.querySelector("[data-builder-registry-list]");
      const registrySearch = registryModal?.querySelector("[data-builder-registry-search]");
      const formSelect = builder.querySelector("[data-builder-form-select]");
      const formNewButton = builder.querySelector("[data-builder-form-new]");
      const formSaveButton = builder.querySelector("[data-builder-form-save]");
      const formDeleteButton = builder.querySelector("[data-builder-form-delete]");
      let registryFilter = "all";
      if (!canvas || !dropzone || !propLabel || !propPreview || !requiredInput) return;

      const componentMap = {
        text: { label: "Câmp text", preview: "Introduceți valoarea", tag: "text", fieldId: "f_text", span: 4 },
        select: { label: "Select", preview: "Alegeți o opțiune", tag: "dropdown", fieldId: "f_dropdown", span: 4 },
        textarea: { label: "Descriere", preview: "Text multilinie", tag: "textarea", fieldId: "f_textarea", span: 8 },
        address: { label: "Adresa unității economice", preview: "Țară, Raion, Localitate, Stradă, Bloc, Scară, Etaj, Apartament, Cod poștal", tag: "adresa-pattern", fieldId: "f_addr_1001", span: 12, required: false },
        caem: { label: "Codul CAEM", preview: "I 56.10 • Restaurante", tag: "dropdown", fieldId: "f_caem", span: 4 },
        mdocs: { label: "Document din MDocs", preview: "Caută și încarcă din MDocs", tag: "mdocs", fieldId: "f_mdocs", span: 4 },
      };
      const FIELD_SPANS = [4, 6, 8, 12];
      const ADDRESS_PATTERN_PARTS = [
        { key: "country", label: "Țară", type: "dropdown", required: true, visible: true, source: "GEAP_d_tari", rows: "117 țări", defaultValue: "Republica Moldova" },
        { key: "district", label: "Raion/Municipiu", type: "dropdown", required: true, visible: true, source: "GEAP_d_raioane", rows: "43 raioane", parentLabel: "Țară" },
        { key: "locality", label: "Orașul/Comuna", type: "dropdown", required: true, visible: true, source: "GEAP_d_localitati", rows: "1843 localități", parentLabel: "Raion/Municipiu" },
        { key: "sector", label: "Sector", type: "dropdown", required: false, visible: false, parentLabel: "Orașul/Comuna", condition: "Orașul/Comuna = Chișinău" },
        { key: "street", label: "Stradă", type: "dropdown", required: true, visible: true, source: "GEAP_d_strazi", rows: "493 străzi", parentLabel: "Orașul/Comuna" },
        { key: "house", label: "Casă", type: "text", required: false, visible: true },
        { key: "floor", label: "Etaj", type: "număr", required: false, visible: true },
        { key: "block", label: "Bloc", type: "text", required: false, visible: true },
        { key: "stair", label: "Scară", type: "text", required: false, visible: true },
        { key: "apartment", label: "Apartament/Oficiu", type: "text", required: false, visible: true },
      ];

      function componentTitle(field) {
        if (field?.dataset.type === "address") return "Address pattern";
        const tag = field?.querySelector(".e-permits-builder__tag--strong")?.textContent.trim();
        if (tag) return tag.charAt(0).toUpperCase() + tag.slice(1);
        const type = field?.dataset.type || "field";
        const template = componentMap[type];
        return template?.tag ? template.tag.charAt(0).toUpperCase() + template.tag.slice(1) : "Field";
      }

      const classifierRegistry = [
        {
          id: "reg_caem",
          displayName: "Coduri CAEM",
          physicalTable: "GEAP_d_caem",
          visibility: "global",
          multilingual: true,
          searchable: true,
          rowCount: 2,
          active: true,
          availableColumns: ["code", "name", "name_en", "name_ru"],
          previewRow: { code: "0111", name: "Cultivarea cerealelor" },
          treeKey: "code",
          parentColumns: ["parent_code"],
        },
        {
          id: "reg_raioane",
          displayName: "Raioane",
          physicalTable: "GEAP_d_raioane",
          visibility: "global",
          multilingual: true,
          searchable: false,
          rowCount: 43,
          active: true,
          availableColumns: ["id", "name"],
          previewRow: { id: "01", name: "Chișinău" },
        },
        {
          id: "reg_localitati",
          displayName: "Localități",
          physicalTable: "GEAP_d_localitati",
          visibility: "global",
          multilingual: true,
          searchable: true,
          rowCount: 1843,
          active: true,
          availableColumns: ["code", "name", "raion_id"],
          parentColumns: ["raion_id"],
          previewRow: { code: "0100", name: "mun. Chișinău" },
        },
        {
          id: "reg_tari",
          displayName: "Țări",
          physicalTable: "GEAP_d_tari",
          visibility: "global",
          multilingual: true,
          searchable: true,
          rowCount: 4,
          active: true,
          availableColumns: ["code", "name", "name_en", "name_ru"],
          previewRow: { code: "MD", name: "Republica Moldova" },
        },
        {
          id: "reg_strazi",
          displayName: "Străzi",
          physicalTable: "GEAP_d_strazi",
          visibility: "global",
          multilingual: false,
          searchable: true,
          rowCount: 493,
          active: true,
          availableColumns: ["id", "name", "locality_id"],
          parentColumns: ["locality_id"],
          previewRow: { id: "101", name: "bd. Ștefan cel Mare și Sfânt" },
        },
        {
          id: "reg_risc_comert",
          displayName: "Categorii risc comerț",
          physicalTable: "GEAP_d_Service_C01394_CategoriiRisc",
          visibility: "service",
          multilingual: false,
          searchable: false,
          rowCount: 12,
          active: true,
          availableColumns: ["id", "name"],
          previewRow: { id: "1", name: "Risc redus" },
        },
      ];

      let selectedField = canvas.querySelector(".e-permits-builder__field.is-selected");
      let selectedSection = null;
      let draggedField = null;
      let draggedComponentType = null;
      let draggedFieldStartIndex = -1;
      const BUILDER_DB_KEY = "geap.formBuilderSandboxDb.v1";
      let sandboxDb = null;
      let activeFormId = "";
      let isApplyingFormRecord = false;
      const dropPlaceholder = document.createElement("div");
      dropPlaceholder.className = "e-permits-builder__field-placeholder";
      dropPlaceholder.dataset.builderPlaceholder = "";
      const dropGuideLayer = document.createElement("div");
      dropGuideLayer.className = "e-permits-builder__drop-guides";
      dropGuideLayer.setAttribute("aria-hidden", "true");
      const resizeGuideLayer = document.createElement("div");
      resizeGuideLayer.className = "e-permits-builder__resize-guides";
      resizeGuideLayer.setAttribute("aria-hidden", "true");

      function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
      }

      function initPanelResize() {
        if (!workspace) return;
        const handles = Array.from(builder.querySelectorAll("[data-builder-resize-panel]"));
        if (!handles.length) return;

        handles.forEach((handle) => {
          handle.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            event.preventDefault();

            const side = handle.dataset.builderResizePanel;
            const startRect = workspace.getBoundingClientRect();
            const startLeft = parseFloat(getComputedStyle(workspace).getPropertyValue("--builder-left-width")) || 322;
            const startRight = parseFloat(getComputedStyle(workspace).getPropertyValue("--builder-right-width")) || 344;
            const minCenter = 560;

            handle.setPointerCapture?.(event.pointerId);
            builder.classList.add("is-resizing");

            function resize(pointerEvent) {
              const workspaceRect = workspace.getBoundingClientRect();
              if (side === "left") {
                const maxLeft = Math.max(260, workspaceRect.width - startRight - minCenter);
                const nextLeft = clamp(pointerEvent.clientX - workspaceRect.left, 260, maxLeft);
                workspace.style.setProperty("--builder-left-width", `${Math.round(nextLeft)}px`);
              } else {
                const maxRight = Math.max(280, workspaceRect.width - startLeft - minCenter);
                const nextRight = clamp(workspaceRect.right - pointerEvent.clientX, 280, maxRight);
                workspace.style.setProperty("--builder-right-width", `${Math.round(nextRight)}px`);
              }
            }

            function stopResize(pointerEvent) {
              resize(pointerEvent);
              builder.classList.remove("is-resizing");
              handle.releasePointerCapture?.(pointerEvent.pointerId);
              window.removeEventListener("pointermove", resize);
              window.removeEventListener("pointerup", stopResize);
              window.removeEventListener("pointercancel", stopResize);
            }

            window.addEventListener("pointermove", resize);
            window.addEventListener("pointerup", stopResize);
            window.addEventListener("pointercancel", stopResize);
          });
        });
      }

      function getFields() {
        return Array.from(canvas.querySelectorAll("[data-builder-field]"));
      }

      function getSections() {
        return Array.from(canvas.querySelectorAll("[data-builder-section]"));
      }

      function getActiveSection() {
        return selectedSection || canvas.querySelector("[data-builder-section]");
      }

      function currentSectionTitle() {
        return getActiveSection()?.querySelector("[data-builder-section-title]")?.value.trim()
          || builder.querySelector("[data-builder-section-title]")?.value.trim()
          || "Secțiune";
      }

      function sectionFlag(section, key, fallback = false) {
        if (!section) return fallback;
        const attr = `section${key}`;
        if (section.dataset[attr] === undefined) return fallback;
        return section.dataset[attr] !== "false";
      }

      function sectionDescription(section = getActiveSection()) {
        return section?.dataset.sectionDescription
          || section?.querySelector("[data-builder-section-description]")?.value.trim()
          || "";
      }

      function sectionData(section = getActiveSection()) {
        return {
          title: section?.querySelector("[data-builder-section-title]")?.value.trim() || "Secțiune",
          description: sectionDescription(section),
          showTitle: sectionFlag(section, "ShowTitle", true),
          showDescription: sectionFlag(section, "ShowDescription", false),
          showSeparator: sectionFlag(section, "ShowSeparator", false),
          openOptions: new Set((section?.dataset.sectionOpenOptions || "title").split(",").filter(Boolean)),
        };
      }

      function syncSectionCanvas(section) {
        if (!section) return;
        const data = sectionData(section);
        const titleWrap = section.querySelector("[data-builder-section-title-wrap]");
        const descriptionInput = section.querySelector("[data-builder-section-description]");
        const separator = section.querySelector("[data-builder-section-separator]");
        if (titleWrap) titleWrap.hidden = !data.showTitle;
        if (descriptionInput) {
          descriptionInput.hidden = !data.showDescription;
          if (descriptionInput.value !== data.description) descriptionInput.value = data.description;
        }
        if (separator) separator.hidden = !data.showSeparator;
        section.classList.toggle("has-section-title", data.showTitle);
        section.classList.toggle("has-section-description", data.showDescription);
        section.classList.toggle("has-section-separator", data.showSeparator);
      }

      function syncSectionSettingsPanel() {
        if (!selectedSection || !sectionSettingsPanel) return;
        const data = sectionData(selectedSection);
        if (sectionInspectorTitle) sectionInspectorTitle.textContent = data.title;
        if (sectionPropTitle && sectionPropTitle.value !== data.title) sectionPropTitle.value = data.title;
        if (sectionPropDescription && sectionPropDescription.value !== data.description) sectionPropDescription.value = data.description;

        sectionSettingsPanel.querySelectorAll("[data-builder-section-option]").forEach((option) => {
          const key = option.dataset.builderSectionOption;
          const visible = key === "title" ? data.showTitle : key === "description" ? data.showDescription : data.showSeparator;
          const isOpen = visible && data.openOptions.has(key);
          const checkbox = option.querySelector(`[data-builder-section-visible="${key}"]`);
          const body = option.querySelector(`[data-builder-section-option-body="${key}"]`);
          const collapse = option.querySelector(".e-permits-builder__section-option-collapse");
          option.classList.toggle("is-muted", !visible);
          option.classList.toggle("is-open", isOpen);
          if (checkbox) checkbox.checked = visible;
          if (body) body.hidden = !isOpen;
          if (collapse) {
            collapse.setAttribute("aria-expanded", String(isOpen));
            collapse.setAttribute("aria-label", `${isOpen ? "Restrânge" : "Extinde"} ${option.querySelector("strong")?.textContent || "opțiunea"}`);
          }
        });
      }

      function updateSection(section, updates = {}) {
        if (!section) return;
        if (updates.title !== undefined) {
          const title = updates.title.trim() || "Secțiune";
          const input = section.querySelector("[data-builder-section-title]");
          if (input && input.value !== title) input.value = title;
          section.setAttribute("aria-label", title);
        }
        if (updates.description !== undefined) {
          const description = String(updates.description);
          section.dataset.sectionDescription = description;
          const input = section.querySelector("[data-builder-section-description]");
          if (input && input.value !== description) input.value = description;
        }
        if (updates.showTitle !== undefined) section.dataset.sectionShowTitle = String(updates.showTitle);
        if (updates.showDescription !== undefined) section.dataset.sectionShowDescription = String(updates.showDescription);
        if (updates.showSeparator !== undefined) section.dataset.sectionShowSeparator = String(updates.showSeparator);
        if (updates.openOptions) section.dataset.sectionOpenOptions = Array.from(updates.openOptions).join(",");
        syncSectionCanvas(section);
        if (section === selectedSection) syncSectionSettingsPanel();
        renderPreviewAndSchema();
      }

      function setSectionTitle(section, title) {
        if (!section) return;
        const next = title.trim() || "Secțiune";
        updateSection(section, { title: next });
      }

      function fieldData(field) {
        const label =
          field.querySelector(".e-permits-builder__field-label strong")?.childNodes?.[0]?.textContent.trim()
          || field.querySelector(".e-permits-builder__field-label strong")?.textContent.replace("*", "").trim()
          || field.querySelector(".e-permits-builder__field-head strong")?.childNodes?.[0]?.textContent.trim()
          || field.querySelector(".e-permits-builder__field-head strong")?.textContent.replace("*", "").trim()
          || "";
        const fieldId =
          field.querySelector(".e-permits-builder__field-label em")?.textContent.trim()
          || "";
        const addressPreview = field.dataset.type === "address"
          ? addressConfigFor(field).filter((part) => part.visible).map((part) => part.label).join(", ")
          : "";
        const preview =
          field.querySelector(".e-permits-builder__field-preview > span")?.textContent.trim()
          || field.querySelector(".e-permits-builder__field-preview")?.textContent.trim()
          || addressPreview
          || "";
        const record = {
          id: field.dataset.id || "",
          fieldId,
          type: field.dataset.type || "text",
          span: Number(field.dataset.span || 12),
          required: field.dataset.required !== "false",
          label,
          preview,
          dataSource: parseDataSource(field),
        };
        if (field.dataset.type === "address") {
          record.addressConfig = addressConfigFor(field).map((part) => ({
            key: part.key,
            label: part.label,
            type: part.type,
            visible: part.visible,
            required: part.required,
            defaultValue: part.defaultValue || "",
            source: part.source || "",
            rows: part.rows || "",
            parentLabel: part.parentLabel || "",
          }));
        }
        return record;
      }

      function renderFieldLabel(labelNode, text, required) {
        if (!labelNode) return;
        labelNode.textContent = text || "Câmp fără titlu";
        if (!required) return;
        const star = document.createElement("span");
        star.className = "e-permits-builder__required-mark";
        star.setAttribute("aria-label", "obligatoriu");
        star.innerHTML = `<svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg>`;
        labelNode.append(star);
      }

      function defaultAddressConfig() {
        return ADDRESS_PATTERN_PARTS.map((part) => ({ ...part }));
      }

      function addressConfigFor(source) {
        const raw = source?.dataset ? source.dataset.addressConfig : source?.addressConfig;
        let saved = [];
        if (Array.isArray(raw)) {
          saved = raw;
        } else if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) saved = parsed;
          } catch {
            saved = [];
          }
        }
        return ADDRESS_PATTERN_PARTS.map((part) => {
          const override = saved.find((item) => item.key === part.key) || {};
          return {
            ...part,
            ...override,
            visible: override.visible !== undefined ? Boolean(override.visible) : part.visible !== false,
            required: override.required !== undefined ? Boolean(override.required) : Boolean(part.required),
            defaultValue: override.defaultValue ?? part.defaultValue ?? "",
          };
        });
      }

      function setAddressConfig(field, config) {
        if (!field || field.dataset.type !== "address") return;
        const normalized = addressConfigFor({ addressConfig: config });
        field.dataset.addressConfig = JSON.stringify(normalized.map((item) => ({
          key: item.key,
          visible: item.visible,
          required: item.required,
          defaultValue: item.defaultValue || "",
        })));
        updateAddressPatternField(field);
        renderAddressDataPanel();
        renderPreviewAndSchema();
        autosaveCurrentForm();
      }

      function updateAddressConfigPart(key, updates) {
        if (!isAddressPatternField()) return;
        const config = addressConfigFor(selectedField).map((part) => (
          part.key === key ? { ...part, ...updates } : part
        ));
        setAddressConfig(selectedField, config);
      }

      function addressPatternPreviewHtml(field) {
        const visibleParts = addressConfigFor(field).filter((part) => part.visible);
        return `
          <div class="e-permits-builder__address-pattern-preview">
            ${visibleParts.map((part) => `
              <span class="e-permits-builder__address-token">
                ${escapeHtml(part.label)}
                ${part.required ? '<span class="e-permits-builder__required-mark" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>' : ""}
              </span>
            `).join("")}
          </div>
        `;
      }

      function addressPatternBodyHtml(template, field) {
        return `
          <div class="e-permits-builder__field-body e-permits-builder__field-body--address-pattern">
            <div class="e-permits-builder__field-label">
              <strong>${template.label}</strong>
              <em>${template.fieldId}</em>
            </div>
            ${addressPatternPreviewHtml(field)}
          </div>
        `;
      }

      function updateAddressPatternField(field) {
        if (!field || field.dataset.type !== "address") return;
        const preview = field.querySelector(".e-permits-builder__address-pattern-preview");
        if (preview) preview.outerHTML = addressPatternPreviewHtml(field);
      }

      function parseDataSource(field) {
        if (!field?.dataset.source) return null;
        try {
          return JSON.parse(field.dataset.source);
        } catch {
          return null;
        }
      }

      function getClassifier(id) {
        if (!id) return null;
        return classifierRegistry.find((classifier) => classifier.id === id) || null;
      }

      function defaultDataSource() {
        return {
          mode: "existing",
          classifierId: "",
          displayTemplate: [],
          parentPairs: [],
        };
      }

      function initialDataSourceForMode(mode) {
        if (mode === "existing") return defaultDataSource();
        if (mode === "new") {
          return {
            mode: "new",
            technicalName: "",
            displayName: "",
            visibility: "global",
            multilingual: false,
            searchable: false,
            saved: false,
            displayTemplate: [],
          };
        }
        if (mode === "static") {
          return {
            mode: "static",
            multilingual: false,
            values: [],
            displayTemplate: [],
            parentFieldId: "",
          };
        }
        return null;
      }

      function isSourceConfigured(dataSource) {
        if (!dataSource) return false;
        if (dataSource.mode === "existing") return Boolean(dataSource.classifierId || dataSource.displayTemplate?.length || dataSource.parentPairs?.length || dataSource.tree);
        if (dataSource.mode === "new") return Boolean(dataSource.saved || dataSource.classifierId || dataSource.technicalName || dataSource.displayName);
        if (dataSource.mode === "static") return Boolean(dataSource.values?.length || dataSource.displayTemplate?.length || dataSource.parentFieldId);
        return false;
      }

      function physicalNameForClassifier(technicalName, visibility = "service") {
        const clean = String(technicalName || "").replace(/[^A-Za-z0-9_]/g, "");
        if (!clean) return "";
        if (visibility === "service") return `GEAP_d_Service_C01394_${clean}`;
        return `GEAP_d_${clean}`;
      }

      function validateTechnicalName(technicalName, visibility = "service") {
        const name = String(technicalName || "").trim();
        if (!name) return { ok: false, error: "Numele tehnic este obligatoriu.", physicalName: "" };
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
          return { ok: false, error: "Numele poate conține doar litere, cifre și underscore și trebuie să înceapă cu o literă.", physicalName: physicalNameForClassifier(name, visibility) };
        }
        const physicalName = physicalNameForClassifier(name, visibility);
        if (physicalName.length > 100) {
          return { ok: false, error: "Numele fizic depășește limita de 100 de caractere.", physicalName };
        }
        if (classifierRegistry.some((classifier) => classifier.physicalTable.toLowerCase() === physicalName.toLowerCase())) {
          return { ok: false, error: "Există deja un clasificator cu acest nume fizic.", physicalName };
        }
        return { ok: true, error: "", physicalName };
      }

      function seedValuesForClassifier(classifier) {
        if (!classifier) return [];
        const seeds = {
          reg_caem: [
            { id: 1, code: "I 56.10", name: "Restaurante", parent_code: "", isValid: true },
            { id: 2, code: "I 56.30", name: "Baruri și alte activități de servire a băuturilor", parent_code: "I", isValid: true },
          ],
          reg_raioane: [
            { id: 1, code: "01", name: "Chișinău", isValid: true },
            { id: 2, code: "02", name: "Bălți", isValid: true },
          ],
          reg_localitati: [
            { id: 1, code: "0100", name: "mun. Chișinău", parents: { raion_id: 1 }, isValid: true },
            { id: 2, code: "0200", name: "mun. Bălți", parents: { raion_id: 2 }, isValid: true },
          ],
          reg_risc_comert: [
            { id: 1, name: "Risc redus", isValid: true },
            { id: 2, name: "Risc sporit", isValid: true },
          ],
        };
        return seeds[classifier.id] || [classifier.previewRow || { id: 1, name: "Opțiunea 1", isValid: true }];
      }

      function buildFallbackDatabase() {
        const form = serializeCurrentForm();
        return {
          version: 1,
          activeFormId: form.id,
          forms: [form],
        };
      }

      function readStoredDatabase() {
        try {
          const raw = window.localStorage.getItem(BUILDER_DB_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || !Array.isArray(parsed.forms)) return null;
          return parsed;
        } catch {
          return null;
        }
      }

      function persistDatabase() {
        if (!sandboxDb) return;
        window.localStorage.setItem(BUILDER_DB_KEY, JSON.stringify(sandboxDb, null, 2));
      }

      async function loadSandboxDatabase() {
        const stored = readStoredDatabase();
        if (stored) {
          sandboxDb = stored;
          activeFormId = stored.activeFormId || stored.forms[0]?.id || "";
          return;
        }
        try {
          const response = await fetch("data/form-builder-db.json", { cache: "no-store" });
          if (!response.ok) throw new Error("Seed DB unavailable");
          const seeded = await response.json();
          sandboxDb = seeded?.forms?.length ? seeded : buildFallbackDatabase();
        } catch {
          sandboxDb = buildFallbackDatabase();
        }
        activeFormId = sandboxDb.activeFormId || sandboxDb.forms[0]?.id || "";
        persistDatabase();
      }

      function uniqueFormId() {
        return `form-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      }

      function currentFormTitle() {
        return builder.querySelector(".e-permits-builder__service-title-row h2")?.textContent.trim()
          || builder.querySelector(".e-permits-builder__form-header h1")?.textContent.trim()
          || "Formular nou";
      }

      function serializeCurrentForm() {
        const title = currentFormTitle();
        const section = sectionData(getActiveSection());
        return {
          id: activeFormId || "form-commerce-notification",
          serviceCode: builder.querySelector(".e-permits-builder__mono")?.textContent.trim() || "C01394",
          title,
          stepTitle: builder.querySelector(".e-permits-builder__form-header h1")?.textContent.trim() || "Detalii cerere",
          sectionTitle: section.title,
          sectionDescription: section.description,
          sectionShowTitle: section.showTitle,
          sectionShowDescription: section.showDescription,
          sectionShowSeparator: section.showSeparator,
          sectionOpenOptions: Array.from(section.openOptions).join(","),
          stepIndex: 2,
          totalSteps: 6,
          version: builder.querySelector(".e-permits-builder__version span")?.textContent.trim() || "v1.4.2",
          status: "draft",
          updatedAt: new Date().toISOString(),
          fields: getFields().map(fieldData),
        };
      }

      function applyFieldRecord(field, record) {
        field.dataset.id = record.id || `field-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        field.dataset.type = record.type || "text";
        field.dataset.required = String(record.type === "address" ? false : record.required !== false);
        if (record.dataSource) field.dataset.source = JSON.stringify(record.dataSource);
        else delete field.dataset.source;
        if (record.type === "address" && record.addressConfig) field.dataset.addressConfig = JSON.stringify(record.addressConfig);
        else delete field.dataset.addressConfig;
        setFieldSpan(field, record.type === "address" ? 12 : record.span || 4);

        const label = field.querySelector(".e-permits-builder__field-label strong") || field.querySelector(".e-permits-builder__field-head strong");
        renderFieldLabel(label, record.label || "Câmp fără titlu", record.required !== false);
        const fieldId = field.querySelector(".e-permits-builder__field-label em");
        if (fieldId) fieldId.textContent = record.fieldId || record.id || "f_field";
        const previewText = field.querySelector(".e-permits-builder__field-preview > span");
        if (previewText) previewText.textContent = record.preview || "Preview câmp";
        if (field.dataset.type === "address") {
          field.classList.add("e-permits-builder__field--address-pattern");
          const template = { ...componentMap.address, label: record.label || componentMap.address.label, fieldId: record.fieldId || componentMap.address.fieldId };
          const existingBody = field.querySelector(".e-permits-builder__field-body");
          if (existingBody) existingBody.outerHTML = addressPatternBodyHtml(template, field);
        }
        updateFieldSourceState(field);
      }

      function applyFormRecord(record) {
        if (!record) return;
        isApplyingFormRecord = true;
        activeFormId = record.id;
        getFields().forEach((field) => field.remove());
        const serviceTitle = builder.querySelector(".e-permits-builder__service-title-row h2");
        const formTitle = builder.querySelector(".e-permits-builder__form-header h1");
        const sectionTitle = builder.querySelector("[data-builder-section-title]");
        const section = canvas.querySelector("[data-builder-section]");
        const sectionDescriptionInput = section?.querySelector("[data-builder-section-description]");
        const versionLabel = builder.querySelector(".e-permits-builder__version span");
        if (serviceTitle) serviceTitle.textContent = record.title || "Formular nou";
        if (formTitle) formTitle.textContent = record.stepTitle || "Detalii cerere";
        if (sectionTitle) sectionTitle.value = record.sectionTitle || "Tipul solicitantului";
        if (section) {
          section.dataset.sectionDescription = record.sectionDescription || "";
          section.dataset.sectionShowTitle = String(record.sectionShowTitle !== false);
          section.dataset.sectionShowDescription = String(record.sectionShowDescription === true);
          section.dataset.sectionShowSeparator = String(record.sectionShowSeparator === true);
          section.dataset.sectionOpenOptions = record.sectionOpenOptions || "title";
          if (sectionDescriptionInput) sectionDescriptionInput.value = record.sectionDescription || "";
          syncSectionCanvas(section);
        }
        if (versionLabel) versionLabel.textContent = record.version || "v1.0.0";
        (record.fields || []).forEach((fieldRecord) => {
          const field = makeField(fieldRecord.type || "text");
          applyFieldRecord(field, fieldRecord);
          canvas.insertBefore(field, dropzone);
        });
        renderFormSelector();
        const firstField = getFields()[0] || null;
        setSelected(firstField);
        isApplyingFormRecord = false;
        renderPreviewAndSchema();
      }

      function renderFormSelector() {
        if (!formSelect || !sandboxDb) return;
        formSelect.innerHTML = "";
        sandboxDb.forms.forEach((form) => {
          const option = document.createElement("option");
          option.value = form.id;
          option.textContent = form.title || form.id;
          formSelect.append(option);
        });
        formSelect.value = activeFormId;
      }

      function saveCurrentForm() {
        if (!sandboxDb) sandboxDb = buildFallbackDatabase();
        const record = serializeCurrentForm();
        const existingIndex = sandboxDb.forms.findIndex((form) => form.id === record.id);
        if (existingIndex >= 0) sandboxDb.forms[existingIndex] = record;
        else sandboxDb.forms.push(record);
        sandboxDb.activeFormId = record.id;
        activeFormId = record.id;
        persistDatabase();
        renderFormSelector();
      }

      function autosaveCurrentForm() {
        if (!sandboxDb || !activeFormId || isApplyingFormRecord) return;
        const record = serializeCurrentForm();
        const existingIndex = sandboxDb.forms.findIndex((form) => form.id === activeFormId);
        if (existingIndex >= 0) sandboxDb.forms[existingIndex] = record;
        else sandboxDb.forms.push(record);
        sandboxDb.activeFormId = activeFormId;
        persistDatabase();
      }

      function createNewForm() {
        if (!sandboxDb) sandboxDb = { version: 1, activeFormId: "", forms: [] };
        const id = uniqueFormId();
        const nextNumber = sandboxDb.forms.length + 1;
        const record = {
          id,
          serviceCode: "C01394",
          title: `Formular nou ${nextNumber}`,
          stepTitle: "Detalii cerere",
          stepIndex: 2,
          totalSteps: 6,
          version: "v1.0.0",
          status: "draft",
          updatedAt: new Date().toISOString(),
          fields: [],
        };
        sandboxDb.forms.push(record);
        sandboxDb.activeFormId = id;
        persistDatabase();
        applyFormRecord(record);
      }

      function deleteCurrentForm() {
        if (!sandboxDb || !activeFormId) return;
        const current = sandboxDb.forms.find((form) => form.id === activeFormId);
        const confirmed = window.confirm(`Ștergi formularul "${current?.title || activeFormId}" din sandbox?`);
        if (!confirmed) return;
        sandboxDb.forms = sandboxDb.forms.filter((form) => form.id !== activeFormId);
        if (!sandboxDb.forms.length) {
          const fallback = buildFallbackDatabase().forms[0];
          fallback.id = uniqueFormId();
          fallback.title = "Formular nou";
          fallback.fields = [];
          sandboxDb.forms.push(fallback);
        }
        sandboxDb.activeFormId = sandboxDb.forms[0].id;
        persistDatabase();
        applyFormRecord(sandboxDb.forms[0]);
      }

      function getDisplayColumns(classifier, dataSource) {
        if (dataSource?.mode === "static") return dataSource.multilingual ? ["name", "name_en", "name_ru"] : ["name"];
        if (Array.isArray(classifier?.availableColumns) && classifier.availableColumns.length) return classifier.availableColumns;
        return classifier?.multilingual ? ["name", "name_en", "name_ru"] : ["name"];
      }

      function renderDisplayLabel(row, template) {
        if (!row) return "";
        if (!Array.isArray(template) || template.length === 0) return row.name || "";
        let output = "";
        let pendingSeparator = "";
        let lastWasValue = false;
        template.forEach((part) => {
          if (part.type === "separator") {
            if (lastWasValue) pendingSeparator += part.value;
            return;
          }
          if (part.type === "column") {
            const value = row[part.value];
            if (value !== null && value !== undefined && value !== "") {
              output += pendingSeparator + String(value);
              pendingSeparator = "";
              lastWasValue = true;
            }
          }
        });
        return output || row.name || "";
      }

      function isDropdownField(field = selectedField) {
        const tag = field?.querySelector(".e-permits-builder__tag--strong")?.textContent.trim().toLowerCase();
        return field?.dataset.type === "select" || field?.dataset.type === "caem" || tag === "dropdown";
      }

      function isAddressPatternField(field = selectedField) {
        return field?.dataset.type === "address";
      }

      function sourceStatus(dataSource) {
        if (!dataSource) return { tone: "warning", label: "Source", text: "Unconfigured", badge: "!" };
        if (dataSource.mode === "existing" && dataSource.classifierId) return { tone: "success", label: "Source", text: "Existent", badge: "✓" };
        if (dataSource.mode === "existing") return { tone: "warning", label: "Source", text: "Unconfigured", badge: "!" };
        if (dataSource.mode === "new") return { tone: dataSource.saved ? "success" : "warning", label: "Source", text: dataSource.saved ? "Nou · salvat" : "Nou · ciornă", badge: dataSource.saved ? "✓" : "!" };
        if (dataSource.mode === "static") {
          const activeCount = (dataSource.values || []).filter((value) => value.isValid !== false).length;
          return { tone: activeCount > 0 ? "success" : "warning", label: "Source", text: activeCount > 0 ? `Static · ${activeCount} active` : "Static · fără valori", badge: activeCount > 0 ? "✓" : "!" };
        }
        return { tone: "warning", label: "Source", text: "Unconfigured", badge: "!" };
      }

      function updateFieldSourceState(field) {
        const state = field?.querySelector(".e-permits-builder__field-state");
        if (!state) return;
        const status = sourceStatus(parseDataSource(field));
        const isSuccess = status.tone === "success";
        state.innerHTML = `
          <em class="e-permits-builder__tag ${isSuccess ? "e-permits-builder__tag--success" : "e-permits-builder__tag--warning"}">
            ${isSuccess ? "" : `<svg class="icon e-permits-builder__icon-warning" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg>`}
            ${status.label}
          </em>
          <span>${status.text}</span>
        `;
      }

      function setFieldDataSource(field, dataSource) {
        if (!field) return;
        if (dataSource) field.dataset.source = JSON.stringify(dataSource);
        else delete field.dataset.source;
        updateFieldSourceState(field);
        renderSourcePanel();
        renderPreviewAndSchema();
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function labelForField(field) {
        return field.querySelector(".e-permits-builder__field-label strong")?.textContent.replace("*", "").trim()
          || field.querySelector(".e-permits-builder__field-head strong")?.textContent.replace("*", "").trim()
          || field.dataset.id
          || "Dropdown";
      }

      function getCascadeParentOptions() {
        return getFields()
          .filter((field) => field !== selectedField && isDropdownField(field) && parseDataSource(field))
          .map((field) => ({ id: field.dataset.id || "", label: labelForField(field) }))
          .filter((option) => option.id);
      }

      function renderCascadeControls(dataSource, classifier) {
        const card = builder.querySelector("[data-builder-cascade-card]");
        const parentSelect = builder.querySelector("[data-builder-cascade-parent]");
        const columnSelect = builder.querySelector("[data-builder-cascade-column]");
        if (!card || !parentSelect || !columnSelect) return;
        const selected = Boolean(classifier);
        card.hidden = !selected || Boolean(dataSource?.tree?.enabled);
        if (card.hidden) return;

        const pairs = Array.isArray(dataSource.parentPairs)
          ? dataSource.parentPairs
          : dataSource.parentFieldId
            ? [{ parentFieldId: dataSource.parentFieldId, filterColumn: dataSource.filterColumn }]
            : [];
        const firstPair = pairs[0] || {};
        const parents = getCascadeParentOptions();
        parentSelect.innerHTML = `<option value="">— No parent (independent) —</option>${parents.map((option) => (
          `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)} (${escapeHtml(option.id)})</option>`
        )).join("")}`;
        parentSelect.value = firstPair.parentFieldId || "";

        const filterColumns = classifier?.parentColumns?.length ? classifier.parentColumns : [];
        columnSelect.innerHTML = `<option value="">— Selectează coloana —</option>${filterColumns.map((column) => (
          `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`
        )).join("")}`;
        columnSelect.value = firstPair.filterColumn || dataSource.filterColumn || "";
        columnSelect.disabled = !parentSelect.value;
      }

      function confirmSourceModeChange(currentMode, nextMode) {
        const overlay = document.createElement("div");
        overlay.className = "e-permits-builder__confirm-overlay";
        overlay.innerHTML = `
          <div class="e-permits-builder__confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="builder-source-confirm-title">
            <h3 id="builder-source-confirm-title">Schimbi modul sursei de date?</h3>
            <p>Trecerea din <strong>${currentMode}</strong> în <strong>${nextMode}</strong> va șterge configurația curentă a câmpului. Această acțiune nu poate fi anulată.</p>
            <div>
              <button type="button" data-confirm-cancel>Anulează</button>
              <button type="button" data-confirm-accept>Da, schimbă modul</button>
            </div>
          </div>
        `;
        document.body.append(overlay);
        return new Promise((resolve) => {
          const close = (value) => {
            overlay.remove();
            resolve(value);
          };
          overlay.addEventListener("click", (event) => {
            if (event.target === overlay || event.target.closest("[data-confirm-cancel]")) close(false);
            if (event.target.closest("[data-confirm-accept]")) close(true);
          });
        });
      }

      function openStaticValuesEditor() {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "static") return;
        let values = [...(current.values || [])];
        const overlay = document.createElement("div");
        overlay.className = "e-permits-builder__confirm-overlay";
        const renderRows = () => values.map((value, index) => `
          <div class="e-permits-builder__static-editor-row" data-static-row="${index}">
            <span>#${value.id}</span>
            <input type="text" value="${String(value.name || "").replace(/"/g, "&quot;")}" placeholder="Nume valoare" data-static-name>
            <label><input type="checkbox" ${value.isValid !== false ? "checked" : ""} data-static-active> Active</label>
          </div>
        `).join("");
        const paint = () => {
          overlay.innerHTML = `
            <div class="e-permits-builder__static-editor" role="dialog" aria-modal="true">
              <header>
                <div>
                  <h3>Valori statice</h3>
                  <p>Valorile sunt salvate inline în FieldSchema, cu soft-delete prin Active.</p>
                </div>
                <button type="button" data-static-close>×</button>
              </header>
              <div class="e-permits-builder__static-editor-list">${renderRows() || "<p>Fără valori încă.</p>"}</div>
              <footer>
                <button type="button" data-static-add>+ Adaugă valoare</button>
                <button type="button" data-static-save>Salvează valori</button>
              </footer>
            </div>
          `;
        };
        const syncRows = () => {
          overlay.querySelectorAll("[data-static-row]").forEach((row) => {
            const index = Number(row.dataset.staticRow);
            values[index] = {
              ...values[index],
              name: row.querySelector("[data-static-name]")?.value || "",
              isValid: Boolean(row.querySelector("[data-static-active]")?.checked),
            };
          });
        };
        paint();
        document.body.append(overlay);
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay || event.target.closest("[data-static-close]")) overlay.remove();
          if (event.target.closest("[data-static-add]")) {
            syncRows();
            values.push({ id: values.length ? Math.max(...values.map((value) => Number(value.id) || 0)) + 1 : 1, name: "", isValid: true, sortOrder: (values.length + 1) * 10 });
            paint();
          }
          if (event.target.closest("[data-static-save]")) {
            syncRows();
            setFieldDataSource(selectedField, { ...current, values });
            overlay.remove();
          }
        });
      }

      async function changeDataSourceMode(mode) {
        if (!isDropdownField()) return;
        closeSourceDropdown();
        if (!mode) {
          setFieldDataSource(selectedField, null);
          return;
        }
        const current = parseDataSource(selectedField);
        if (current?.mode === mode) return;
        if (isSourceConfigured(current)) {
          const allowed = await confirmSourceModeChange(current.mode || "neconfigurat", mode);
          if (!allowed) {
            renderSourcePanel();
            return;
          }
        }
        setFieldDataSource(selectedField, initialDataSourceForMode(mode));
      }

      const sourceModeLabels = {
        existing: "Clasificator existent",
        new: "Clasificator nou",
        static: "Valori statice",
      };

      function closeSourceDropdown() {
        const trigger = builder.querySelector("[data-builder-source-trigger]");
        const menu = builder.querySelector("[data-builder-source-menu]");
        if (trigger) {
          trigger.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
        }
        setDropdownHidden(menu, true);
      }

      function toggleSourceDropdown() {
        if (!isDropdownField()) return;
        const trigger = builder.querySelector("[data-builder-source-trigger]");
        const menu = builder.querySelector("[data-builder-source-menu]");
        if (!trigger || !menu) return;
        const willOpen = menu.hidden;
        trigger.classList.toggle("is-open", willOpen);
        trigger.setAttribute("aria-expanded", String(willOpen));
        setDropdownHidden(menu, !willOpen);
      }

      function renderClassifierSummary(classifier) {
        const card = builder.querySelector("[data-builder-selected-classifier]");
        if (!card) return;
        if (!classifier) {
          card.classList.add("is-empty");
          card.innerHTML = `
            <button class="e-permits-builder__classifier-browse" type="button" data-builder-browse-classifiers>Browse registru...</button>
          `;
          card.querySelector("[data-builder-browse-classifiers]")?.addEventListener("click", openClassifierRegistry);
          return;
        }
        card.classList.remove("is-empty");
        card.innerHTML = `
          <div class="e-permits-builder__classifier-content">
            <div class="e-permits-builder__classifier-title">
              <strong>${classifier.displayName}</strong>
              <code>${classifier.physicalTable}</code>
            </div>
            <p>${classifierMetaHtml(classifier)}</p>
          </div>
          <button class="e-permits-builder__classifier-edit" type="button" data-builder-browse-classifiers aria-label="Schimbă clasificator">
            <svg class="icon" width="16" height="16"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
          </button>
        `;
        card.querySelector("[data-builder-browse-classifiers]")?.addEventListener("click", openClassifierRegistry);
      }

      function classifierMetaHtml(classifier) {
        const parts = [
          classifier.visibility === "global" ? "Global" : classifier.visibility,
          classifier.multilingual ? "Multilingv" : "",
          classifier.searchable ? "Search" : "",
          `<b>${classifier.rowCount}</b> rows`,
        ].filter(Boolean);
        return parts.map((part, index) => `${index ? '<span aria-hidden="true">•</span>' : ""}<span>${part}</span>`).join("");
      }

      function renderTemplate(dataSource, classifier) {
        const builderNode = builder.querySelector("[data-builder-template-builder]");
        const preview = builder.querySelector("[data-builder-template-preview]");
        if (!builderNode) return;
        const template = dataSource?.displayTemplate || [];
        const columns = getDisplayColumns(classifier, dataSource);
        builderNode.innerHTML = "";
        if (!template.length) {
          const hint = document.createElement("em");
          hint.className = "e-permits-builder__template-empty";
          hint.innerHTML = "Adaugă o coloană pentru a începe construirea label-ului<br>Niciun template configurat — va folosi coloana name implicit.";
          builderNode.append(hint);
        }
        template.forEach((part, index) => {
          const chip = document.createElement("span");
          chip.className = `e-permits-builder__template-chip ${part.type === "column" ? "is-column" : "is-separator"}`;
          if (part.type === "column") {
            const select = document.createElement("select");
            select.setAttribute("aria-label", "Coloană template");
            columns.forEach((column) => {
              const option = document.createElement("option");
              option.value = column;
              option.textContent = column;
              select.append(option);
            });
            select.value = columns.includes(part.value) ? part.value : (columns[0] || "name");
            select.addEventListener("change", (event) => {
              const nextTemplate = template.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item);
              setFieldDataSource(selectedField, { ...dataSource, displayTemplate: nextTemplate });
            });
            chip.append(select);
            const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            chevron.setAttribute("class", "icon");
            chevron.setAttribute("width", "20");
            chevron.setAttribute("height", "20");
            chevron.setAttribute("aria-hidden", "true");
            chevron.innerHTML = `<use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>`;
            chip.append(chevron);
          } else {
            const input = document.createElement("input");
            input.type = "text";
            input.value = part.value || "";
            input.placeholder = "sep";
            input.style.width = `${Math.max(String(part.value || "").length * 8 + 18, 34)}px`;
            input.addEventListener("input", (event) => {
              event.target.style.width = `${Math.max(event.target.value.length * 8 + 18, 34)}px`;
              const nextTemplate = template.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item);
              const nextDataSource = { ...dataSource, displayTemplate: nextTemplate };
              selectedField.dataset.source = JSON.stringify(nextDataSource);
              const sample = classifier?.previewRow || (nextDataSource.mode === "static" ? (nextDataSource.values || []).find((value) => value.isValid !== false) : null);
              if (preview) preview.textContent = sample ? renderDisplayLabel(sample, nextTemplate) : "";
              updateFieldSourceState(selectedField);
              renderPreviewAndSchema();
            });
            chip.append(input);
          }
          const remove = document.createElement("button");
          remove.type = "button";
          remove.setAttribute("aria-label", "Elimină element template");
          remove.textContent = "×";
          remove.addEventListener("click", () => {
            const next = { ...dataSource, displayTemplate: template.filter((_, itemIndex) => itemIndex !== index) };
            setFieldDataSource(selectedField, next);
          });
          chip.append(remove);
          builderNode.append(chip);
        });
        const sample = classifier?.previewRow || (dataSource?.mode === "static" ? (dataSource.values || []).find((value) => value.isValid !== false) : null);
        if (preview) preview.textContent = sample ? renderDisplayLabel(sample, template) : "";
      }

      function addressOpenKeys(field = selectedField) {
        const raw = field?.dataset.addressOpenKeys;
        if (!raw) return new Set();
        return new Set(raw.split(",").filter(Boolean));
      }

      function setAddressOpenKeys(field, keys) {
        if (!field) return;
        field.dataset.addressOpenKeys = Array.from(keys).join(",");
      }

      function renderAddressDataPanel() {
        if (!addressDataList) return;
        if (!isAddressPatternField()) {
          addressDataList.replaceChildren();
          return;
        }

        const config = addressConfigFor(selectedField);
        const openKeys = addressOpenKeys(selectedField);
        addressDataList.innerHTML = config.map((part, index) => {
          const isOpen = openKeys.has(part.key);
          const sourceHtml = part.source ? `
            <div class="e-permits-builder__address-data-box">
              <span>Sursă de date</span>
              <p><code>${escapeHtml(part.source)}</code><i aria-hidden="true">•</i>${escapeHtml(part.rows || "")}</p>
            </div>
          ` : "";
          const cascadeHtml = part.parentLabel ? `
            <div class="e-permits-builder__address-cascade">
              <svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 3.5v4.25c0 2.35 1.9 4.25 4.25 4.25H12m0 0L9.5 9.5M12 12L9.5 14.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>după <strong>${escapeHtml(part.parentLabel)}</strong></span>
            </div>
          ` : "";
          const defaultControl = part.type === "dropdown" ? `
            <label class="e-permits-builder__property e-permits-builder__address-default">
              <span>Valoare implicită</span>
              <select data-address-default="${escapeHtml(part.key)}">
                <option value="">Nici una</option>
                <option value="${escapeHtml(part.defaultValue || "Republica Moldova")}" ${part.defaultValue ? "selected" : ""}>${escapeHtml(part.defaultValue || "Republica Moldova")}</option>
              </select>
            </label>
          ` : `
            <label class="e-permits-builder__property e-permits-builder__address-default">
              <span>Valoare implicită</span>
              <input type="${part.type === "număr" ? "number" : "text"}" value="${escapeHtml(part.defaultValue || "")}" placeholder="Nici una" data-address-default="${escapeHtml(part.key)}">
            </label>
          `;
          return `
            <article class="e-permits-builder__address-data-item${part.visible ? "" : " is-muted"}${isOpen ? " is-open" : ""}" data-address-item="${escapeHtml(part.key)}" style="--address-z:${20 - index}">
              <header class="e-permits-builder__address-data-head" data-address-toggle-section="${escapeHtml(part.key)}">
                <div class="e-permits-builder__address-data-title">
                  <span class="e-permits-builder__address-data-main">
                    <strong>${escapeHtml(part.label)}</strong>
                    <em class="e-permits-builder__tag e-permits-builder__tag--outlined">${escapeHtml(part.type)}</em>
                  </span>
                  ${cascadeHtml}
                </div>
                <div class="e-permits-builder__address-data-actions">
                  <button class="e-permits-builder__required-chip${part.required ? " is-on" : ""}" type="button" aria-pressed="${String(part.required)}" data-address-required="${escapeHtml(part.key)}">
                    <span aria-hidden="true"><svg class="icon" width="12" height="12"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>
                  </button>
                  <label class="e-permits-builder__mini-check e-permits-builder__mini-check--only" aria-label="Vizibilitate">
                    <input type="checkbox" ${part.visible ? "checked" : ""} data-address-visible="${escapeHtml(part.key)}">
                    <span></span>
                  </label>
                  <button class="e-permits-builder__address-collapse" type="button" aria-expanded="${String(isOpen)}" data-address-toggle-section="${escapeHtml(part.key)}" aria-label="${isOpen ? "Restrânge" : "Extinde"} ${escapeHtml(part.label)}">
                    <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                  </button>
                </div>
              </header>
              <div class="e-permits-builder__address-data-body" ${isOpen ? "" : "hidden"}>
                ${sourceHtml}
                <label class="e-permits-builder__behavior-row">
                  <span><strong>Vizibilitate</strong></span>
                  <span class="e-permits-builder__switch">
                    <input type="checkbox" ${part.visible ? "checked" : ""} data-address-visible="${escapeHtml(part.key)}">
                    <i></i>
                  </span>
                </label>
                <label class="e-permits-builder__behavior-row">
                  <span><strong>Obligatoriu</strong></span>
                  <span class="e-permits-builder__switch">
                    <input type="checkbox" ${part.required ? "checked" : ""} data-address-required-input="${escapeHtml(part.key)}">
                    <i></i>
                  </span>
                </label>
                ${defaultControl}
              </div>
            </article>
          `;
        }).join("");
      }

      function renderSourcePanel() {
        const dropdown = isDropdownField();
        const address = isAddressPatternField();
        if (sourceTabLabel) sourceTabLabel.textContent = address ? "Data" : "Data source";
        if (sourceEmpty) sourceEmpty.hidden = dropdown || address;
        if (sourceContent) sourceContent.hidden = !dropdown;
        if (addressDataPanel) addressDataPanel.hidden = !address;
        if (address) renderAddressDataPanel();
        const sourceStatusForTab = dropdown ? sourceStatus(parseDataSource(selectedField)) : { tone: "neutral" };
        const sourceIsWarning = dropdown && sourceStatusForTab.tone === "warning";
        if (sourceTab) sourceTab.classList.toggle("is-warning", sourceIsWarning);
        if (sourceTabIcon) sourceTabIcon.hidden = !sourceIsWarning;
        if (sourceTabBadge) {
          const status = sourceStatusForTab;
          sourceTabBadge.textContent = status.badge;
          sourceTabBadge.classList.toggle("is-ok", status.tone === "success");
        }
        if (!dropdown) return;
        const dataSource = parseDataSource(selectedField);
        const classifier = dataSource?.mode === "existing" ? getClassifier(dataSource.classifierId) : null;
        const sourceTrigger = builder.querySelector("[data-builder-source-trigger]");
        const sourceValue = builder.querySelector("[data-builder-source-value]");
        if (sourceTrigger && sourceValue) {
          const label = dataSource?.mode ? sourceModeLabels[dataSource.mode] : "Selecteaza sursa de date";
          sourceValue.textContent = label || "Selecteaza sursa de date";
          sourceTrigger.classList.toggle("is-placeholder", !dataSource?.mode);
        }
        builder.querySelectorAll("[data-builder-source-option]").forEach((option) => {
          const active = Boolean(dataSource?.mode) && option.dataset.builderSourceOption === dataSource.mode;
          option.classList.toggle("is-active", active);
          option.setAttribute("aria-selected", String(active));
        });
        const sourceWarning = builder.querySelector("[data-builder-source-warning]");
        const sourceWarningWrap = builder.querySelector("[data-builder-source-warning-wrap]");
        if (sourceWarning) sourceWarning.hidden = Boolean(dataSource);
        if (sourceWarningWrap) sourceWarningWrap.hidden = Boolean(dataSource);
        const newDisplay = builder.querySelector("[data-builder-new-display]");
        const newTechnical = builder.querySelector("[data-builder-new-technical]");
        const newMl = builder.querySelector("[data-builder-new-ml]");
        const newSearch = builder.querySelector("[data-builder-new-search]");
        if (newDisplay && dataSource?.mode === "new") newDisplay.value = dataSource.displayName || "";
        if (newTechnical && dataSource?.mode === "new") newTechnical.value = dataSource.technicalName || "";
        if (newMl && dataSource?.mode === "new") newMl.checked = Boolean(dataSource.multilingual);
        if (newSearch && dataSource?.mode === "new") newSearch.checked = Boolean(dataSource.searchable);
        if (dataSource?.mode === "new") {
          builder.querySelectorAll("input[name='builder-new-visibility']").forEach((input) => {
            input.checked = input.value === (dataSource.visibility || "global");
          });
        }
        const staticMl = builder.querySelector("[data-builder-static-ml]");
        if (staticMl && dataSource?.mode === "static") staticMl.checked = Boolean(dataSource.multilingual);
        const treeEnabled = builder.querySelector("[data-builder-tree-enabled]");
        const treeSettings = builder.querySelector("[data-builder-tree-settings]");
        const treeMax = builder.querySelector("[data-builder-tree-max]");
        const treeMin = builder.querySelector("[data-builder-tree-min]");
        const isTreeEnabled = Boolean(dataSource?.tree?.enabled);
        if (treeEnabled) treeEnabled.checked = isTreeEnabled;
        if (treeSettings) treeSettings.hidden = !isTreeEnabled;
        if (treeMax) treeMax.value = dataSource?.tree?.maxLevels ?? 0;
        if (treeMin) treeMin.value = dataSource?.tree?.minLevel ?? 0;
        const templateCard = builder.querySelector("[data-builder-template-card]");
        const treeCard = builder.querySelector("[data-builder-tree-card]");
        if (templateCard) templateCard.hidden = !dataSource || (dataSource.mode === "existing" && !classifier);
        if (treeCard) treeCard.hidden = !dataSource || dataSource.mode !== "existing" || (!classifier?.treeKey);
        const cascadeEnabled = builder.querySelector("[data-builder-cascade-enabled]");
        const cascadeSettings = builder.querySelector("[data-builder-cascade-settings]");
        const isCascadeEnabled = Boolean(dataSource?.cascade?.enabled || dataSource?.parentFieldId || dataSource?.parentPairs?.length);
        if (cascadeEnabled) cascadeEnabled.checked = isCascadeEnabled;
        if (cascadeSettings) cascadeSettings.hidden = !isCascadeEnabled;
        builder.querySelectorAll("[data-builder-source-mode]").forEach((button) => {
          const active = Boolean(dataSource) && button.dataset.builderSourceMode === dataSource.mode;
          button.classList.toggle("is-active", active);
        });
        builder.querySelectorAll("[data-builder-source-pane]").forEach((pane) => {
          pane.classList.toggle("is-active", Boolean(dataSource) && pane.dataset.builderSourcePane === dataSource.mode);
        });
        renderClassifierSummary(classifier);
        renderTemplate(dataSource, classifier);
        renderCascadeControls(dataSource, classifier);
        renderNewClassifierValidation();
        renderStaticSummary(dataSource);
      }

      function renderNewClassifierValidation(displayNameOverride, validationOverride) {
        const box = builder.querySelector("[data-builder-new-validation]");
        if (!box) return;
        const displayName = displayNameOverride ?? builder.querySelector("[data-builder-new-display]")?.value.trim() ?? "";
        const technicalName = builder.querySelector("[data-builder-new-technical]")?.value.trim() ?? "";
        const visibility = builder.querySelector("input[name='builder-new-visibility']:checked")?.value || "service";
        const validation = validationOverride || validateTechnicalName(technicalName, visibility);
        if (!displayName || !technicalName || validation.ok) {
          box.hidden = validation.ok && Boolean(displayName);
          box.classList.toggle("is-success", validation.ok && Boolean(displayName));
          box.textContent = validation.ok && displayName
            ? `Tabela fizică: ${validation.physicalName}`
            : "Display name și Technical name sunt obligatorii.";
          return;
        }
        box.hidden = false;
        box.classList.remove("is-success");
        box.textContent = validation.error || "Configurația nu este validă.";
      }

      function renderStaticSummary(dataSource) {
        const summary = builder.querySelector(".e-permits-builder__static-summary");
        const list = builder.querySelector(".e-permits-builder__static-values");
        if (!summary || !list) return;
        const values = dataSource?.mode === "static" ? (dataSource.values || []) : [];
        const active = values.filter((value) => value.isValid !== false);
        const inactive = values.length - active.length;
        summary.innerHTML = `<span>${values.length} total · ${active.length} active · ${inactive} inactive</span>${dataSource?.multilingual ? "<em>ML</em>" : ""}`;
        list.innerHTML = active.slice(0, 3).map((value) => `<li>#${value.id} ${value.name || "Valoare fără nume"}${value.name_en || value.name_ru ? " <em>en · ru</em>" : ""}</li>`).join("");
        if (!active.length) list.innerHTML = "<li>Fără valori încă</li>";
      }

      function setFieldSpan(field, span) {
        const normalizedSpan = FIELD_SPANS.includes(Number(span))
          ? Number(span)
          : FIELD_SPANS.reduce((closest, value) => Math.abs(value - Number(span)) < Math.abs(closest - Number(span)) ? value : closest, 4);
        field.dataset.span = String(normalizedSpan);
        field.style.gridColumn = `span ${normalizedSpan}`;
        const spanTag = field.querySelector(".e-permits-builder__tag--outlined");
        if (spanTag) spanTag.textContent = `${normalizedSpan}/12`;
      }

      function syncSpanControl(field) {
        const span = Number(field?.dataset.span || 4);
        const widthPicker = builder.querySelector(".e-permits-builder__width-picker");
        if (widthPicker) widthPicker.dataset.activeSpan = String(span);
        builder.querySelectorAll("[data-builder-span]").forEach((button) => {
          const buttonSpan = Number(button.dataset.builderSpan);
          button.classList.toggle("is-active", buttonSpan === span);
          button.classList.toggle("is-filled", buttonSpan <= span);
        });
        const widthValue = builder.querySelector("[data-builder-width-value]");
        const widthLabel = builder.querySelector("[data-builder-width-label]");
        const labels = {
          4: "one third (3 per row)",
          6: "half (2 per row)",
          8: "two thirds",
          12: "full width",
        };
        if (widthValue) widthValue.textContent = `${span}/12`;
        if (widthLabel) widthLabel.textContent = labels[span] || "custom width";
      }

      function nearestFieldSpan(rawSpan) {
        return FIELD_SPANS.reduce((closest, value) => (
          Math.abs(value - rawSpan) < Math.abs(closest - rawSpan) ? value : closest
        ), FIELD_SPANS[0]);
      }

      function gridColumnStep() {
        const styles = getComputedStyle(canvas);
        const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
        return (canvas.clientWidth - gap * 11) / 12 + gap;
      }

      function renderResizeGuides(field) {
        resizeGuideLayer.replaceChildren();
        if (!field) return;
        if (!resizeGuideLayer.isConnected) canvas.appendChild(resizeGuideLayer);
        clearDropState();
        canvas.classList.add("is-guiding-resize");

        const canvasRect = canvas.getBoundingClientRect();
        const fieldRect = field.getBoundingClientRect();
        const styles = getComputedStyle(canvas);
        const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
        const columnWidth = (canvas.clientWidth - gap * 11) / 12;
        const step = columnWidth + gap;
        const fieldLeft = fieldRect.left - canvasRect.left;
        const startColumn = clamp(Math.round(fieldLeft / step), 0, 11);
        const top = Math.round(fieldRect.top - canvasRect.top);
        const height = Math.round(fieldRect.height);

        FIELD_SPANS
          .filter((span) => startColumn + span <= 12)
          .forEach((span) => {
            const guide = document.createElement("div");
            guide.className = "e-permits-builder__resize-guide";
            guide.classList.toggle("is-active", span === Number(field.dataset.span || 4));
            guide.style.left = `${Math.round(fieldLeft)}px`;
            guide.style.top = `${top}px`;
            guide.style.width = `${Math.round(columnWidth * span + gap * (span - 1))}px`;
            guide.style.height = `${height}px`;
            resizeGuideLayer.appendChild(guide);
          });
      }

      function clearResizeGuides() {
        canvas.classList.remove("is-guiding-resize");
        resizeGuideLayer.replaceChildren();
      }

      function ensureFieldResizeHandle(field) {
        if (!field || field.querySelector("[data-builder-field-resize]")) return;
        const handle = document.createElement("button");
        handle.className = "e-permits-builder__field-resize";
        handle.type = "button";
        handle.setAttribute("aria-label", "Redimensionează câmpul");
        handle.dataset.builderFieldResize = "";
        handle.innerHTML = "<span></span>";
        field.prepend(handle);
      }

      function bindFieldResize(field) {
        ensureFieldResizeHandle(field);
        const handle = field.querySelector("[data-builder-field-resize]");
        if (!handle || handle.dataset.resizeBound === "true") return;
        handle.dataset.resizeBound = "true";
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();

          const startX = event.clientX;
          const startSpan = Number(field.dataset.span || 4);
          const columnStep = gridColumnStep();
          const startDraggable = field.draggable;
          field.draggable = false;
          field.classList.add("is-resizing-field");
          builder.classList.add("is-field-resizing");
          handle.setPointerCapture?.(event.pointerId);
          setSelected(field);
          renderResizeGuides(field);

          function resize(pointerEvent) {
            const delta = pointerEvent.clientX - startX;
            const rawSpan = startSpan + Math.round(delta / columnStep);
            const nextSpan = nearestFieldSpan(Math.max(4, Math.min(12, rawSpan)));
            if (Number(field.dataset.span || 4) !== nextSpan) {
              setFieldSpan(field, nextSpan);
              syncSpanControl(field);
              renderResizeGuides(field);
              renderPreviewAndSchema();
            }
          }

          function stopResize(pointerEvent) {
            resize(pointerEvent);
            field.draggable = startDraggable;
            field.classList.remove("is-resizing-field");
            builder.classList.remove("is-field-resizing");
            clearResizeGuides();
            handle.releasePointerCapture?.(pointerEvent.pointerId);
            window.removeEventListener("pointermove", resize);
            window.removeEventListener("pointerup", stopResize);
            window.removeEventListener("pointercancel", stopResize);
          }

          window.addEventListener("pointermove", resize);
          window.addEventListener("pointerup", stopResize);
          window.addEventListener("pointercancel", stopResize);
        });
      }

      function activeDragSpan() {
        if (draggedField) return Number(draggedField.dataset.span || 4);
        const template = componentMap[draggedComponentType] || componentMap.text;
        return template.span || 4;
      }

      function spanToFixedColumns(span) {
        return span;
      }

      function fieldAfter(field) {
        const items = Array.from(canvas.children).filter((item) => {
          return item.matches?.("[data-builder-field], [data-builder-dropzone]") && item !== dropPlaceholder;
        });
        return items[items.indexOf(field) + 1] || dropzone;
      }

      function clearDropState() {
        canvas.querySelectorAll(".is-drop-target").forEach((field) => field.classList.remove("is-drop-target"));
        canvas.closest(".e-permits-builder__step-section")?.classList.remove("is-drop-active");
        canvas.classList.remove("is-guiding-drop");
        draggedField?.classList.remove("is-dragging-out-of-flow");
        draggedFieldStartIndex = -1;
        dropPlaceholder.remove();
        dropGuideLayer.replaceChildren();
      }

      function setDropTarget(field) {
        canvas.querySelectorAll(".is-drop-target").forEach((item) => item.classList.toggle("is-drop-target", item === field));
      }

      function isNewDropRow(before = dropzone) {
        const orderedItems = Array.from(canvas.children).filter((item) => {
          return item.matches?.("[data-builder-field], [data-builder-dropzone]")
            && item !== draggedField
            && item !== dropPlaceholder;
        });
        const targetIndex = orderedItems.indexOf(before || dropzone);
        const previousItems = targetIndex < 0 ? orderedItems : orderedItems.slice(0, targetIndex);
        const occupiedColumns = previousItems.reduce((total, item) => {
          if (item.matches?.("[data-builder-dropzone]")) return total;
          return total + Number(item.dataset.span || 4);
        }, 0);
        return occupiedColumns % 12 === 0;
      }

      function movePlaceholder(before = dropzone, options = {}) {
        clearResizeGuides();
        const span = activeDragSpan();
        dropPlaceholder.style.gridColumn = `span ${spanToFixedColumns(span)}`;
        dropPlaceholder.style.setProperty("--builder-drop-line-width", `${Math.round(canvas.clientWidth)}px`);
        dropPlaceholder.classList.toggle("is-new-row", options.forceNewRow || isNewDropRow(before || dropzone));
        canvas.insertBefore(dropPlaceholder, before || dropzone);
        canvas.closest(".e-permits-builder__step-section")?.classList.add("is-drop-active");
        renderDropGuides();
      }

      function renderDropGuides() {
        dropGuideLayer.replaceChildren();
        if (!dropPlaceholder.isConnected) return;
        if (!dropGuideLayer.isConnected) canvas.appendChild(dropGuideLayer);
        canvas.classList.add("is-guiding-drop");

        const canvasRect = canvas.getBoundingClientRect();
        const placeholderRect = dropPlaceholder.getBoundingClientRect();
        const guide = document.createElement("div");
        guide.className = "e-permits-builder__drop-guide is-active";
        guide.style.left = `${Math.round(placeholderRect.left - canvasRect.left)}px`;
        guide.style.top = `${Math.round(placeholderRect.top - canvasRect.top)}px`;
        guide.style.width = `${Math.round(placeholderRect.width)}px`;
        guide.style.height = `${Math.round(Math.max(placeholderRect.height, 164))}px`;
        dropGuideLayer.appendChild(guide);
      }

      function orderedDropItems() {
        return Array.from(canvas.children).filter((item) => {
          return item.matches?.("[data-builder-field], [data-builder-dropzone]")
            && item !== draggedField
            && item !== dropPlaceholder;
        });
      }

      function setSelected(field) {
        if (!builder.classList.contains("is-field-resizing")) clearResizeGuides();
        if (!draggedField && !draggedComponentType) clearDropState();
        if (field) clearSectionSelection();
        getFields().forEach((item) => item.classList.toggle("is-selected", item === field));
        selectedField = field || null;
        if (fieldSettingsPanel) fieldSettingsPanel.hidden = !selectedField;
        if (formSettingsPanel) formSettingsPanel.hidden = Boolean(selectedField);
        if (sectionSettingsPanel) sectionSettingsPanel.hidden = true;
        builder.classList.toggle("has-selected-field", Boolean(selectedField));
        if (!selectedField) {
          renderSourcePanel();
          renderPreviewAndSchema();
          return;
        }
        const data = fieldData(field);
        propLabel.value = data.label;
        propPreview.value = data.preview;
        if (propFieldId) propFieldId.value = data.fieldId || data.id || "f_field";
        requiredInput.checked = data.required;
        if (inspectorTitle) inspectorTitle.textContent = componentTitle(field);
        if (inspectorFieldId) inspectorFieldId.textContent = data.fieldId || data.id || "f_field";
        builder.querySelectorAll("[data-builder-span]").forEach((button) => {
          button.classList.toggle("is-active", Number(button.dataset.builderSpan) === data.span);
        });
        syncSpanControl(field);
        renderSourcePanel();
      }

      function clearSectionSelection() {
        getSections().forEach((section) => section.classList.remove("is-section-selected"));
        selectedSection = null;
        builder.classList.remove("has-selected-section");
        if (sectionSettingsPanel) sectionSettingsPanel.hidden = true;
      }

      function setSelectedSection(section) {
        setSelected(null);
        getSections().forEach((item) => item.classList.toggle("is-section-selected", item === section));
        selectedSection = section || null;
        builder.classList.toggle("has-selected-section", Boolean(selectedSection));
        if (selectedSection) {
          if (formSettingsPanel) formSettingsPanel.hidden = true;
          if (fieldSettingsPanel) fieldSettingsPanel.hidden = true;
          if (sectionSettingsPanel) sectionSettingsPanel.hidden = false;
          syncSectionCanvas(selectedSection);
          syncSectionSettingsPanel();
        }
      }

      function clearSelected() {
        setSelected(null);
        clearSectionSelection();
      }

      function updateField(field, updates) {
        if (!field) return;
        const data = { ...fieldData(field), ...updates };
        field.dataset.required = String(data.required);
        const label = field.querySelector(".e-permits-builder__field-label strong") || field.querySelector(".e-permits-builder__field-head strong");
        const preview = field.querySelector(".e-permits-builder__field-preview");
        const previewText = preview?.querySelector("span");
        renderFieldLabel(label, data.label, data.required);
        if (previewText) previewText.textContent = data.preview;
        else if (preview) preview.textContent = data.preview;
        if (updates.span) setFieldSpan(field, updates.span);
        setSelected(field);
        renderPreviewAndSchema();
      }

      function makeField(type) {
        const template = componentMap[type] || componentMap.text;
        const field = document.createElement("article");
        const isAddressPattern = type === "address";
        field.className = `e-permits-builder__field${isAddressPattern ? " e-permits-builder__field--address-pattern" : ""}`;
        field.draggable = true;
        field.dataset.builderField = "";
        field.dataset.type = type;
        field.dataset.required = String(template.required !== false);
        field.dataset.id = `field-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        setFieldSpan(field, template.span);
        field.innerHTML = `
          <button class="e-permits-builder__field-resize" type="button" aria-label="Redimensionează câmpul" data-builder-field-resize>
            <span></span>
          </button>
          <div class="e-permits-builder__field-tools">
            <div class="e-permits-builder__field-meta">
              <button class="e-permits-builder__circle-action e-permits-builder__drag" type="button" aria-label="Mută câmpul">
                <svg class="icon e-permits-builder__icon-drag" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-drag"></use></svg>
              </button>
              <em class="e-permits-builder__tag e-permits-builder__tag--strong">${template.tag}</em>
              <em class="e-permits-builder__tag e-permits-builder__tag--outlined">${template.span}/12</em>
            </div>
            <div class="e-permits-builder__field-actions">
              <button class="e-permits-builder__circle-action" type="button" aria-label="Copiază câmpul">
                <svg class="icon e-permits-builder__icon-copy" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-copy"></use></svg>
              </button>
              <button class="e-permits-builder__circle-action" type="button" aria-label="Șterge câmpul" data-builder-field-delete>
                <svg class="icon e-permits-builder__icon-delete" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-delete"></use></svg>
              </button>
            </div>
          </div>
          ${isAddressPattern ? addressPatternBodyHtml(template, field) : `
            <div class="e-permits-builder__field-body">
              <div class="e-permits-builder__field-label">
                <strong>${template.label}<span class="e-permits-builder__required-mark" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span></strong>
                <em>${template.fieldId}</em>
              </div>
              <div class="e-permits-builder__field-preview">
                <span>${template.preview}</span>
                <svg class="icon e-permits-builder__icon-chevron" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
              </div>
              <div class="e-permits-builder__field-state">
                <em class="e-permits-builder__tag e-permits-builder__tag--warning">
                  <svg class="icon e-permits-builder__icon-warning" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg>
                  Source
                </em>
                <span>Unconfigured</span>
              </div>
            </div>
          `}
        `;
        updateFieldSourceState(field);
        bindField(field);
        return field;
      }

      function insertField(field, before = dropzone) {
        canvas.insertBefore(field, before || dropzone);
        setSelected(field);
        renderPreviewAndSchema();
      }

      function deleteField(field) {
        if (!field) return;
        const next = field.nextElementSibling?.matches("[data-builder-field]")
          ? field.nextElementSibling
          : field.previousElementSibling?.matches("[data-builder-field]")
            ? field.previousElementSibling
            : null;
        const wasSelected = selectedField === field;
        field.remove();
        if (wasSelected) {
          selectedField = null;
          if (next) setSelected(next);
          else setSelected(null);
        }
        renderPreviewAndSchema();
      }

      function getInsertionPoint(event) {
        const fields = getFields().filter((field) => field !== draggedField);
        const items = orderedDropItems();
        const rows = [];
        const dropzoneRect = dropzone.getBoundingClientRect();

        if (event.clientY >= dropzoneRect.top) {
          return { before: dropzone, hovered: null, forceNewRow: true };
        }

        fields.forEach((field) => {
          const rect = field.getBoundingClientRect();
          let row = rows.find((candidate) => Math.abs(candidate.top - rect.top) < 8);
          if (!row) {
            row = { top: rect.top, bottom: rect.bottom, fields: [] };
            rows.push(row);
          }
          row.top = Math.min(row.top, rect.top);
          row.bottom = Math.max(row.bottom, rect.bottom);
          row.fields.push({ field, rect });
        });

        rows.sort((a, b) => a.top - b.top);
        rows.forEach((row) => row.fields.sort((a, b) => a.rect.left - b.rect.left));

        const hovered = fields.find((field) => {
          const rect = field.getBoundingClientRect();
          return event.clientX >= rect.left
            && event.clientX <= rect.right
            && event.clientY >= rect.top
            && event.clientY <= rect.bottom;
        }) || null;

        if (!rows.length) return { before: dropzone, hovered, forceNewRow: true };

        if (hovered) {
          const hoveredIndex = items.indexOf(hovered);
          const rect = hovered.getBoundingClientRect();
          const insertAfterHovered = event.clientX >= rect.left + rect.width / 2;
          const insertBefore = insertAfterHovered
            ? items[hoveredIndex + 1] || dropzone
            : hovered;
          return { before: insertBefore, hovered, forceNewRow: false };
        }

        const matchingRow = rows.find((row) => event.clientY >= row.top && event.clientY <= row.bottom);
        if (!matchingRow) {
          const firstLowerRow = rows.find((row) => event.clientY < row.top);
          return {
            before: firstLowerRow?.fields[0]?.field || dropzone,
            hovered,
            forceNewRow: !firstLowerRow,
          };
        }

        const insertionEdges = matchingRow.fields.flatMap(({ field, rect }) => {
          const fieldIndex = items.indexOf(field);
          return [
            { x: rect.left, before: field },
            { x: rect.right, before: items[fieldIndex + 1] || dropzone },
          ];
        });
        const closestEdge = insertionEdges.reduce((closest, edge) => {
          if (!closest) return edge;
          return Math.abs(event.clientX - edge.x) < Math.abs(event.clientX - closest.x) ? edge : closest;
        }, null);

        return { before: closestEdge?.before || dropzone, hovered, forceNewRow: false };
      }

      function bindField(field) {
        bindFieldResize(field);
        field.addEventListener("click", (event) => {
          if (event.target.closest(".e-permits-builder__drag, [data-builder-field-resize], [data-builder-field-delete]")) return;
          setSelected(field);
        });
        field.querySelector("[data-builder-field-delete]")?.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteField(field);
        });

        field.addEventListener("dragstart", (event) => {
          draggedFieldStartIndex = orderedDropItems().indexOf(field);
          draggedField = field;
          draggedComponentType = null;
          field.classList.add("is-dragging");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", field.dataset.id || "field");
          movePlaceholder(fieldAfter(field), { forceNewRow: false });
          window.setTimeout(() => {
            if (draggedField === field) field.classList.add("is-dragging-out-of-flow");
          }, 0);
        });

        field.addEventListener("dragend", () => {
          field.classList.remove("is-dragging", "is-dragging-out-of-flow");
          draggedField = null;
          clearDropState();
          renderPreviewAndSchema();
        });
      }

      function bindSections() {
        getSections().forEach((section) => {
          if (section.dataset.sectionShowTitle === undefined) section.dataset.sectionShowTitle = "true";
          if (section.dataset.sectionShowDescription === undefined) section.dataset.sectionShowDescription = "false";
          if (section.dataset.sectionShowSeparator === undefined) section.dataset.sectionShowSeparator = "false";
          if (section.dataset.sectionDescription === undefined) section.dataset.sectionDescription = "";
          if (section.dataset.sectionOpenOptions === undefined) section.dataset.sectionOpenOptions = "title";
          syncSectionCanvas(section);
          section.addEventListener("click", (event) => {
            if (event.target.closest("[data-builder-field], [data-builder-dropzone]")) return;
            if (event.target.closest(".e-permits-builder__section-actions, .e-permits-builder__drag")) return;
            setSelectedSection(section);
          });
        });

        builder.querySelectorAll("[data-builder-section-title]").forEach((input) => {
          input.addEventListener("focus", () => {
            const section = input.closest("[data-builder-section]");
            if (section) setSelectedSection(section);
          });
          input.addEventListener("input", () => {
            const section = input.closest("[data-builder-section]");
            if (section === selectedSection && sectionPropTitle && sectionPropTitle.value !== input.value) {
              sectionPropTitle.value = input.value;
            }
            section?.setAttribute("aria-label", input.value.trim() || "Secțiune");
            renderPreviewAndSchema();
          });
          input.addEventListener("blur", () => {
            if (!input.value.trim()) input.value = "Secțiune";
            setSectionTitle(input.closest("[data-builder-section]"), input.value);
          });
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              input.blur();
            }
          });
        });

        builder.querySelectorAll("[data-builder-section-description]").forEach((input) => {
          input.addEventListener("focus", () => {
            const section = input.closest("[data-builder-section]");
            if (section) setSelectedSection(section);
          });
          input.addEventListener("input", () => {
            const section = input.closest("[data-builder-section]");
            if (!section) return;
            section.dataset.sectionDescription = input.value;
            if (section === selectedSection && sectionPropDescription && sectionPropDescription.value !== input.value) {
              sectionPropDescription.value = input.value;
            }
            renderPreviewAndSchema();
          });
          input.addEventListener("blur", () => {
            const section = input.closest("[data-builder-section]");
            if (section) updateSection(section, { description: input.value });
          });
        });
      }

      sectionPropTitle?.addEventListener("input", () => {
        if (!selectedSection) return;
        updateSection(selectedSection, { title: sectionPropTitle.value });
      });

      sectionPropTitle?.addEventListener("blur", () => {
        if (!selectedSection) return;
        setSectionTitle(selectedSection, sectionPropTitle.value);
      });

      sectionPropDescription?.addEventListener("input", () => {
        if (!selectedSection) return;
        updateSection(selectedSection, { description: sectionPropDescription.value });
      });

      sectionSettingsPanel?.addEventListener("click", (event) => {
        if (event.target.closest("[data-builder-section-visible], .e-permits-builder__mini-check")) {
          event.stopPropagation();
          return;
        }

        const toggle = event.target.closest("[data-builder-section-option-toggle]");
        if (!toggle || !selectedSection) return;
        if (event.target.closest(".e-permits-builder__section-option-actions") && !event.target.closest(".e-permits-builder__section-option-collapse")) return;
        const key = toggle.dataset.builderSectionOptionToggle;
        const data = sectionData(selectedSection);
        const visible = key === "title" ? data.showTitle : key === "description" ? data.showDescription : data.showSeparator;
        if (!visible) return;
        const openOptions = data.openOptions;
        if (openOptions.has(key)) openOptions.delete(key);
        else openOptions.add(key);
        updateSection(selectedSection, { openOptions });
      });

      sectionSettingsPanel?.addEventListener("change", (event) => {
        const checkbox = event.target.closest("[data-builder-section-visible]");
        if (!checkbox || !selectedSection) return;
        const key = checkbox.dataset.builderSectionVisible;
        const checked = checkbox.checked;
        const openOptions = sectionData(selectedSection).openOptions;
        if (checked) openOptions.add(key);
        else openOptions.delete(key);
        updateSection(selectedSection, {
          showTitle: key === "title" ? checked : undefined,
          showDescription: key === "description" ? checked : undefined,
          showSeparator: key === "separator" ? checked : undefined,
          openOptions,
        });
      });

      libraryItems.forEach((item) => {
        item.addEventListener("click", () => insertField(makeField(item.dataset.builderComponent)));
        item.addEventListener("dragstart", (event) => {
          draggedComponentType = item.dataset.builderComponent;
          draggedField = null;
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", draggedComponentType);
        });
        item.addEventListener("dragend", () => {
          draggedComponentType = null;
          clearDropState();
        });
      });

      canvas.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropzone.classList.add("is-over");
        const insertionPoint = getInsertionPoint(event);
        setDropTarget(insertionPoint.hovered);
        movePlaceholder(insertionPoint.before || dropzone, { forceNewRow: insertionPoint.forceNewRow });
      });

      canvas.addEventListener("dragleave", (event) => {
        if (!canvas.contains(event.relatedTarget)) {
          dropzone.classList.remove("is-over");
          clearDropState();
        }
      });

      canvas.addEventListener("drop", (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-over");
        const insertionPoint = getInsertionPoint(event);
        const target = dropPlaceholder.isConnected ? dropPlaceholder : (insertionPoint.before || dropzone);
        if (draggedComponentType) insertField(makeField(draggedComponentType), target);
        if (draggedField) {
          canvas.insertBefore(draggedField, target);
          setSelected(draggedField);
        }
        clearDropState();
        draggedComponentType = null;
        draggedField = null;
        renderPreviewAndSchema();
      });

      builder.addEventListener("click", (event) => {
        if (!selectedField && !selectedSection) return;
        if (!event.target.closest("[data-builder-canvas]")) return;
        if (event.target.closest("[data-builder-field], [data-builder-dropzone], [data-builder-section]")) return;
        clearSelected();
      });

      propLabel.addEventListener("input", () => updateField(selectedField, { label: propLabel.value || "Câmp fără titlu" }));
      propPreview.addEventListener("input", () => updateField(selectedField, { preview: propPreview.value || "Preview câmp" }));
      propFieldId?.addEventListener("input", () => {
        if (!selectedField) return;
        const nextId = propFieldId.value.trim() || "f_field";
        const fieldIdTag = selectedField.querySelector(".e-permits-builder__field-label em");
        if (fieldIdTag) fieldIdTag.textContent = nextId;
        if (inspectorFieldId) inspectorFieldId.textContent = nextId;
        renderPreviewAndSchema();
      });
      requiredInput.addEventListener("change", () => updateField(selectedField, { required: requiredInput.checked }));

      builder.querySelectorAll("[data-builder-span]").forEach((button) => {
        button.addEventListener("click", () => updateField(selectedField, { span: Number(button.dataset.builderSpan) }));
      });

      deleteButton?.addEventListener("click", () => deleteField(selectedField));

      formSelect?.addEventListener("change", () => {
        const record = sandboxDb?.forms.find((form) => form.id === formSelect.value);
        if (!record) return;
        sandboxDb.activeFormId = record.id;
        persistDatabase();
        applyFormRecord(record);
      });

      formNewButton?.addEventListener("click", createNewForm);
      formSaveButton?.addEventListener("click", () => {
        saveCurrentForm();
        formSaveButton.textContent = "Salvat";
        window.setTimeout(() => {
          formSaveButton.textContent = "Salvează";
        }, 1200);
      });
      formDeleteButton?.addEventListener("click", deleteCurrentForm);

      librarySearch?.addEventListener("input", () => {
        const query = normalizeComboboxText(librarySearch.value);
        libraryItems.forEach((item) => {
          const text = normalizeComboboxText(item.textContent);
          item.hidden = query && !text.includes(query);
        });
      });

      builder.querySelectorAll("[data-builder-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          setBuilderMode(button.dataset.builderMode);
        });
      });

      function setBuilderMode(mode = "build") {
        builder.dataset.mode = mode;
        builder.querySelectorAll("[data-builder-mode]").forEach((item) => {
          const isActive = item.dataset.builderMode === mode;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        canvasSection.hidden = mode !== "build";
        previewPanel.hidden = mode !== "preview";
        schemaPanel.hidden = mode !== "schema";
        renderPreviewAndSchema();
      }

      previewStepper?.addEventListener("click", (event) => {
        const stepButton = event.target.closest("[data-builder-preview-step]");
        if (!stepButton) return;
        const index = Number(stepButton.dataset.builderPreviewStep);
        builder.querySelectorAll(".e-permits-builder__step-chip").forEach((chip, chipIndex) => {
          const active = chipIndex === index;
          chip.classList.toggle("is-active", active);
          chip.setAttribute("aria-selected", String(active));
        });
        renderPreviewAndSchema();
      });

      builder.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || builder.dataset.mode !== "preview") return;
        event.preventDefault();
        setBuilderMode("build");
      });

      gridToggle?.addEventListener("click", () => {
        const isVisible = canvas.classList.toggle("is-visible");
        gridToggle.classList.toggle("is-active", isVisible);
        gridToggle.setAttribute("aria-pressed", String(isVisible));
      });

      builder.querySelector("[data-builder-add-step]")?.addEventListener("click", () => {
        const steps = builder.querySelector(".e-permits-builder__steps-group");
        const addButton = builder.querySelector("[data-builder-add-step]");
        const step = document.createElement("button");
        const count = steps.querySelectorAll(".e-permits-builder__step-chip").length + 1;
        step.className = "e-permits-builder__step-chip";
        step.type = "button";
        step.setAttribute("role", "tab");
        step.setAttribute("aria-selected", "false");
        step.innerHTML = `<span class="e-permits-builder__step-badge">${count}</span><strong class="e-permits-builder__step-label">Pas nou</strong>`;
        steps.insertBefore(step, addButton);
      });

      builder.querySelectorAll("[data-builder-prop-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = button.dataset.builderPropTab;
          builder.querySelectorAll("[data-builder-prop-tab]").forEach((item) => {
            const active = item === button;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", String(active));
          });
          builder.querySelectorAll("[data-builder-prop-panel]").forEach((panel) => {
            panel.classList.toggle("is-active", panel.dataset.builderPropPanel === target);
          });
        });
      });

      addressDataList?.addEventListener("click", (event) => {
        const requiredButton = event.target.closest("[data-address-required]");
        if (requiredButton) {
          event.stopPropagation();
          const key = requiredButton.dataset.addressRequired;
          const current = addressConfigFor(selectedField).find((part) => part.key === key);
          updateAddressConfigPart(key, { required: !current?.required });
          return;
        }
        if (event.target.closest("[data-address-visible], .e-permits-builder__mini-check")) {
          event.stopPropagation();
          return;
        }
        const collapseButton = event.target.closest("[data-address-toggle-section]");
        if (collapseButton) {
          if (event.target.closest(".e-permits-builder__address-data-actions") && !event.target.closest(".e-permits-builder__address-collapse")) return;
          const key = collapseButton.dataset.addressToggleSection;
          const openKeys = addressOpenKeys(selectedField);
          if (openKeys.has(key)) openKeys.delete(key);
          else openKeys.add(key);
          setAddressOpenKeys(selectedField, openKeys);
          renderAddressDataPanel();
        }
      });

      addressDataList?.addEventListener("change", (event) => {
        const visibleInput = event.target.closest("[data-address-visible]");
        if (visibleInput) {
          updateAddressConfigPart(visibleInput.dataset.addressVisible, { visible: visibleInput.checked });
          return;
        }
        const requiredInputPart = event.target.closest("[data-address-required-input]");
        if (requiredInputPart) {
          updateAddressConfigPart(requiredInputPart.dataset.addressRequiredInput, { required: requiredInputPart.checked });
          return;
        }
        const defaultInput = event.target.closest("[data-address-default]");
        if (defaultInput) {
          updateAddressConfigPart(defaultInput.dataset.addressDefault, { defaultValue: defaultInput.value });
        }
      });

      builder.querySelectorAll("[data-builder-source-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          changeDataSourceMode(button.dataset.builderSourceMode);
        });
      });

      builder.querySelector("[data-builder-source-trigger]")?.addEventListener("click", (event) => {
        event.preventDefault();
        toggleSourceDropdown();
      });

      builder.querySelectorAll("[data-builder-source-option]").forEach((option) => {
        option.addEventListener("click", () => {
          changeDataSourceMode(option.dataset.builderSourceOption);
        });
      });

      builder.querySelector("[data-builder-source-trigger]")?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeSourceDropdown();
          return;
        }
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleSourceDropdown();
          builder.querySelector("[data-builder-source-option]")?.focus();
        }
      });

      builder.querySelector("[data-builder-source-menu]")?.addEventListener("keydown", (event) => {
        const options = Array.from(builder.querySelectorAll("[data-builder-source-option]"));
        const index = options.indexOf(document.activeElement);
        if (event.key === "Escape") {
          closeSourceDropdown();
          builder.querySelector("[data-builder-source-trigger]")?.focus();
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const direction = event.key === "ArrowDown" ? 1 : -1;
          const next = options[(index + direction + options.length) % options.length] || options[0];
          next?.focus();
        }
      });

      document.addEventListener("click", (event) => {
        const dropdown = builder.querySelector("[data-builder-source-dropdown]");
        if (dropdown?.contains(event.target)) return;
        closeSourceDropdown();
      });

      builder.querySelector("[data-builder-new-display]")?.addEventListener("input", (event) => {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "new") return;
        setFieldDataSource(selectedField, { ...current, displayName: event.target.value, saved: false, classifierId: "" });
      });

      builder.querySelector("[data-builder-new-technical]")?.addEventListener("input", (event) => {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "new") return;
        setFieldDataSource(selectedField, { ...current, technicalName: event.target.value, saved: false, classifierId: "" });
      });

      builder.querySelectorAll("input[name='builder-new-visibility']").forEach((input) => {
        input.addEventListener("change", () => {
          const current = parseDataSource(selectedField);
          if (current?.mode !== "new") return;
          setFieldDataSource(selectedField, { ...current, visibility: input.value, saved: false, classifierId: "" });
        });
      });

      builder.querySelector("[data-builder-new-ml]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "new") return;
        setFieldDataSource(selectedField, { ...current, multilingual: event.target.checked, saved: false, classifierId: "" });
      });

      builder.querySelector("[data-builder-new-search]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "new") return;
        setFieldDataSource(selectedField, { ...current, searchable: event.target.checked, saved: false, classifierId: "" });
      });

      builder.querySelector("[data-builder-static-ml]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField);
        if (current?.mode !== "static") return;
        setFieldDataSource(selectedField, { ...current, multilingual: event.target.checked });
      });

      builder.querySelector("[data-builder-static-editor]")?.addEventListener("click", openStaticValuesEditor);

      builder.querySelector("[data-builder-tree-enabled]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        setFieldDataSource(selectedField, {
          ...current,
          tree: event.target.checked ? { enabled: true, maxLevels: 0, minLevel: 0 } : null,
          cascade: event.target.checked ? { enabled: false } : current.cascade,
          parentFieldId: event.target.checked ? null : current.parentFieldId,
          filterColumn: event.target.checked ? null : current.filterColumn,
          parentPairs: event.target.checked ? [] : (current.parentPairs || []),
        });
      });

      builder.querySelector("[data-builder-tree-max]")?.addEventListener("input", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        setFieldDataSource(selectedField, {
          ...current,
          tree: { ...(current.tree || { enabled: true, minLevel: 0 }), maxLevels: Number(event.target.value) || 0 },
        });
      });

      builder.querySelector("[data-builder-tree-min]")?.addEventListener("input", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        setFieldDataSource(selectedField, {
          ...current,
          tree: { ...(current.tree || { enabled: true, maxLevels: 0 }), minLevel: Number(event.target.value) || 0 },
        });
      });

      builder.querySelector("[data-builder-cascade-enabled]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        setFieldDataSource(selectedField, {
          ...current,
          tree: event.target.checked ? null : current.tree,
          cascade: { enabled: event.target.checked },
          parentFieldId: event.target.checked ? (current.parentFieldId || current.parentPairs?.[0]?.parentFieldId || null) : null,
          filterColumn: event.target.checked ? (current.filterColumn || current.parentPairs?.[0]?.filterColumn || null) : null,
          parentPairs: event.target.checked ? (current.parentPairs || []) : [],
        });
      });

      builder.querySelector("[data-builder-cascade-parent]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        const parentFieldId = event.target.value;
        const classifier = getClassifier(current.classifierId);
        const filterColumn = parentFieldId ? (current.filterColumn || classifier?.parentColumns?.[0] || "") : null;
        setFieldDataSource(selectedField, {
          ...current,
          tree: null,
          cascade: { enabled: true },
          parentFieldId: parentFieldId || null,
          filterColumn,
          parentPairs: parentFieldId ? [{ parentFieldId, filterColumn }] : [],
        });
      });

      builder.querySelector("[data-builder-cascade-column]")?.addEventListener("change", (event) => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        if (current.mode !== "existing") return;
        const parentFieldId = current.parentPairs?.[0]?.parentFieldId || current.parentFieldId || "";
        const filterColumn = event.target.value;
        setFieldDataSource(selectedField, {
          ...current,
          tree: null,
          cascade: { enabled: true },
          parentFieldId: parentFieldId || null,
          filterColumn: parentFieldId ? filterColumn : null,
          parentPairs: parentFieldId ? [{ parentFieldId, filterColumn }] : [],
        });
      });

      function renderRegistryList() {
        if (!registryList) return;
        const search = registrySearch?.value.trim().toLowerCase() || "";
        const currentSource = parseDataSource(selectedField);
        const selectedClassifierId = currentSource?.classifierId || "";
        const items = classifierRegistry.filter((classifier) => {
          const matchesFilter = registryFilter === "all" || classifier.visibility === registryFilter;
          const haystack = `${classifier.displayName} ${classifier.physicalTable}`.toLowerCase();
          return matchesFilter && (!search || haystack.includes(search));
        });
        registryList.innerHTML = "";
        if (!items.length) {
          const empty = document.createElement("div");
          empty.className = "e-permits-builder-registry__empty";
          empty.textContent = "Nu am găsit clasificatoare pentru căutarea curentă.";
          registryList.append(empty);
          return;
        }
        items.forEach((classifier) => {
          const item = document.createElement("button");
          item.className = `e-permits-builder-registry__item${classifier.id === selectedClassifierId ? " is-active" : ""}`;
          item.type = "button";
          item.innerHTML = `
            <span class="e-permits-builder-registry__item-body">
              <span class="e-permits-builder-registry__item-title">
                <strong>${classifier.displayName}</strong>
                <code>${classifier.physicalTable}</code>
              </span>
              <span class="e-permits-builder-registry__item-meta">${classifierMetaHtml(classifier)}</span>
            </span>
            <span class="e-permits-builder-registry__action">
              <span>Add to CRUD</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg>
            </span>
          `;
          item.addEventListener("click", () => {
            const current = parseDataSource(selectedField) || defaultDataSource();
            setFieldDataSource(selectedField, {
              ...current,
              mode: "existing",
              classifierId: classifier.id,
              displayTemplate: current.displayTemplate || [],
              tree: classifier.treeKey ? { enabled: false, maxLevels: 0, minLevel: 0 } : undefined,
              parentPairs: current.parentPairs || [],
            });
            registryModal.hidden = true;
            registryModal.setAttribute("aria-hidden", "true");
            if (registrySearch) registrySearch.value = "";
          });
          registryList.append(item);
        });
      }

      function openClassifierRegistry() {
        if (!registryModal) return;
        renderRegistryList();
        registryModal.hidden = false;
        registryModal.setAttribute("aria-hidden", "false");
        registrySearch?.focus();
      }

      builder.querySelector("[data-builder-browse-classifiers]")?.addEventListener("click", openClassifierRegistry);

      registryModal?.querySelector("[data-builder-classifier-close]")?.addEventListener("click", () => {
        registryModal.hidden = true;
        registryModal.setAttribute("aria-hidden", "true");
      });

      registryModal?.addEventListener("click", (event) => {
        if (event.target === registryModal) {
          registryModal.hidden = true;
          registryModal.setAttribute("aria-hidden", "true");
        }
      });

      registryModal?.querySelectorAll("[data-builder-registry-filter]").forEach((button) => {
        button.addEventListener("click", () => {
          registryFilter = button.dataset.builderRegistryFilter || "all";
          registryModal.querySelectorAll("[data-builder-registry-filter]").forEach((item) => {
            item.classList.toggle("is-active", item === button);
          });
          renderRegistryList();
        });
      });

      registrySearch?.addEventListener("input", renderRegistryList);

      builder.querySelector("[data-builder-template-add-column]")?.addEventListener("click", () => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        const classifier = current.mode === "existing" ? getClassifier(current.classifierId) : null;
        const columns = getDisplayColumns(classifier, current);
        const template = [...(current.displayTemplate || [])];
        if (template.length > 0 && template[template.length - 1].type === "column") {
          template.push({ type: "separator", value: " — " });
        }
        template.push({ type: "column", value: columns[0] || "name" });
        setFieldDataSource(selectedField, {
          ...current,
          displayTemplate: template,
        });
      });

      builder.querySelector("[data-builder-template-add-separator]")?.addEventListener("click", () => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        setFieldDataSource(selectedField, {
          ...current,
          displayTemplate: [...(current.displayTemplate || []), { type: "separator", value: " — " }],
        });
      });

      builder.querySelector("[data-builder-template-reset]")?.addEventListener("click", () => {
        const current = parseDataSource(selectedField) || defaultDataSource();
        setFieldDataSource(selectedField, { ...current, displayTemplate: [] });
      });

      builder.querySelector("[data-builder-create-classifier]")?.addEventListener("click", () => {
        if (!isDropdownField()) return;
        const displayName = builder.querySelector("[data-builder-new-display]")?.value.trim() || "";
        const technicalName = builder.querySelector("[data-builder-new-technical]")?.value.trim() || "";
        const visibility = builder.querySelector("input[name='builder-new-visibility']:checked")?.value || "service";
        const validation = validateTechnicalName(technicalName, visibility);
        if (!displayName || !validation.ok) {
          renderNewClassifierValidation(displayName, validation);
          return;
        }
        const registryEntry = {
          id: `reg_${technicalName.toLowerCase()}`,
          displayName,
          physicalTable: validation.physicalName,
          visibility,
          multilingual: Boolean(builder.querySelector("[data-builder-new-ml]")?.checked),
          searchable: Boolean(builder.querySelector("[data-builder-new-search]")?.checked),
          rowCount: 0,
          active: true,
          availableColumns: ["id", "name"],
          previewRow: { id: "1", name: displayName },
        };
        classifierRegistry.push(registryEntry);
        setFieldDataSource(selectedField, {
          mode: "new",
          technicalName,
          displayName,
          visibility,
          multilingual: registryEntry.multilingual,
          searchable: registryEntry.searchable,
          saved: true,
          classifierId: registryEntry.id,
          displayTemplate: [],
        });
        renderNewClassifierValidation(displayName, { ok: true, physicalName: validation.physicalName });
      });

      function getPreviewSteps() {
        const stepButtons = Array.from(builder.querySelectorAll(".e-permits-builder__step-chip"));
        const steps = stepButtons.map((button, index) => ({
          index: index + 1,
          label: button.querySelector(".e-permits-builder__step-label")?.textContent.trim() || `Pasul ${index + 1}`,
          active: button.classList.contains("is-active") || button.getAttribute("aria-selected") === "true",
        }));
        const activeIndex = steps.findIndex((step) => step.active);
        return {
          activeIndex: activeIndex >= 0 ? activeIndex : 0,
          steps: steps.length ? steps : [
            { index: 1, label: "Date solicitant", active: false },
            { index: 2, label: "Detalii cerere", active: true },
            { index: 3, label: "Documente însoțitoare", active: false },
            { index: 4, label: "Verificare și semnare", active: false },
            { index: 5, label: "Plată", active: false },
            { index: 6, label: "Finalizare", active: false },
          ],
        };
      }

      function requiredMarkHtml() {
        return `<span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>`;
      }

      function previewOptionsForField(field) {
        const dataSource = field.dataSource;
        if (field.type === "caem") {
          return [
            "I 56.10 • Restaurante",
            "I 56.30 • Baruri și alte activități de servire a băuturilor",
            "G 47.11 • Comerț cu amănuntul în magazine nespecializate",
          ];
        }
        if (dataSource?.mode === "static") {
          return (dataSource.values || [])
            .filter((value) => value.isValid !== false)
            .map((value) => renderDisplayLabel(value, dataSource.displayTemplate || []) || value.name || value.id)
            .filter(Boolean);
        }
        const classifier = dataSource?.mode === "existing" ? getClassifier(dataSource.classifierId) : null;
        if (classifier) {
          return seedValuesForClassifier(classifier)
            .filter((value) => value.isValid !== false)
            .map((value) => renderDisplayLabel(value, dataSource.displayTemplate || []) || value.name || value.code || value.id)
            .filter(Boolean);
        }
        return [
          field.preview || "Alegeți o opțiune",
          "Opțiunea 1",
          "Opțiunea 2",
        ];
      }

      function previewSelectHtml(field, inputId) {
        const placeholder = escapeHtml(field.preview || "Alegeți o opțiune");
        const optionValues = previewOptionsForField(field)
          .filter((value, index, list) => value && list.indexOf(value) === index)
          .slice(0, 8);
        const options = optionValues
          .map((value) => `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${escapeHtml(value)}" tabindex="-1">${escapeHtml(value)}</li>`)
          .join("");
        const listId = `${inputId}-list`;
        return `
          <div class="e-permits-fo-select e-permits-fo-select--preview" data-fo-select>
            <button class="e-permits-fo-select__button" id="${inputId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listId}">
              <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value>${placeholder}</span>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-select__list" id="${listId}" role="listbox" aria-labelledby="${inputId}" hidden>
              ${options || `<li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="${placeholder}" tabindex="-1">${placeholder}</li>`}
            </ul>
          </div>
        `;
      }

      function previewInputType(field) {
        const text = `${field.label || ""} ${field.fieldId || ""} ${field.type || ""}`.toLowerCase();
        if (text.includes("email") || text.includes("e-mail")) return "email";
        if (text.includes("telefon") || text.includes("phone") || text.includes("tel")) return "tel";
        if (text.includes("data") || text.includes("date")) return "date";
        if (text.includes("număr") || text.includes("number") || text.includes("suma")) return "number";
        return "text";
      }

      function previewFieldControl(field, inputId) {
        const placeholder = escapeHtml(field.preview || "");
        const commonInput = `<input id="${inputId}" type="${previewInputType(field)}" placeholder="${placeholder}">`;
        if (field.type === "textarea") {
          return `
            <div class="e-permits-fo-textarea">
              <textarea id="${inputId}" placeholder="${placeholder}" rows="2"></textarea>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-resize"></use></svg>
            </div>
          `;
        }
        if (field.type === "address") {
          const addressLabel = field.label && field.label !== "Adresă pattern" ? field.label : "Adresa unității economice";
          return `
            <div class="e-permits-builder__preview-address-pattern">
              <label for="${inputId}-search">${escapeHtml(addressLabel)}</label>
              <div class="e-permits-fo-address-search" data-fo-address-search>
                <div class="e-permits-fo-input e-permits-fo-input--with-action">
                  <input id="${inputId}-search" type="text" placeholder="Caută adresa" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${inputId}-suggestions" data-fo-address-input>
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
                </div>
                <ul class="e-permits-fo-address-search__list" id="${inputId}-suggestions" role="listbox" aria-label="Sugestii adresă" data-fo-address-list hidden></ul>
              </div>
              <p class="e-permits-fo-field__hint">Selectarea unei adrese existente pre-completează toate câmpurile</p>
              <div class="e-permits-fo-address-details e-permits-fo-address-details--smart" data-fo-address-details>
                <div class="e-permits-fo-field e-permits-fo-field--span-6">
                  <label for="${inputId}-country">Țara ${requiredMarkHtml()}</label>
                  <div class="e-permits-fo-select e-permits-fo-select--address is-disabled" data-fo-select>
                    <button class="e-permits-fo-select__button" id="${inputId}-country" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${inputId}-country-list" disabled>
                      <span class="e-permits-fo-country-flag" aria-hidden="true">🇲🇩</span>
                      <span class="e-permits-fo-select__value" data-fo-select-value data-fo-address-part="country" data-placeholder="Moldova">Moldova</span>
                      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                    </button>
                    <ul class="e-permits-fo-select__list" id="${inputId}-country-list" role="listbox" aria-labelledby="${inputId}-country" hidden>
                      <li class="e-permits-fo-select__option is-selected" role="option" aria-selected="true" data-value="Moldova" tabindex="-1">Moldova</li>
                    </ul>
                  </div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-6">
                  <label for="${inputId}-district">Raionul/Municipiul ${requiredMarkHtml()}</label>
                  <div class="e-permits-fo-select e-permits-fo-select--address" data-fo-select>
                    <button class="e-permits-fo-select__button" id="${inputId}-district" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${inputId}-district-list">
                      <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value data-fo-address-part="district" data-placeholder="Selectează raionul/municipiul">Selectează raionul/municipiul</span>
                      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                    </button>
                    <ul class="e-permits-fo-select__list" id="${inputId}-district-list" role="listbox" aria-labelledby="${inputId}-district" hidden>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Municipiul Chișinău" tabindex="-1">Municipiul Chișinău</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Municipiul Bălți" tabindex="-1">Municipiul Bălți</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Raionul Ungheni" tabindex="-1">Raionul Ungheni</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Raionul Orhei" tabindex="-1">Raionul Orhei</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Raionul Cahul" tabindex="-1">Raionul Cahul</li>
                    </ul>
                  </div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-6">
                  <label for="${inputId}-locality">Orașul/Comuna</label>
                  <div class="e-permits-fo-select e-permits-fo-select--address is-disabled" data-fo-select>
                    <button class="e-permits-fo-select__button" id="${inputId}-locality" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${inputId}-locality-list" disabled>
                      <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value data-fo-address-part="locality" data-placeholder="Selectează mai întâi Raionul/Municipiul">Selectează mai întâi Raionul/Municipiul</span>
                      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                    </button>
                    <ul class="e-permits-fo-select__list" id="${inputId}-locality-list" role="listbox" aria-labelledby="${inputId}-locality" hidden>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Chișinău" tabindex="-1">Chișinău</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Bălți" tabindex="-1">Bălți</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Ungheni" tabindex="-1">Ungheni</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Orhei" tabindex="-1">Orhei</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Cahul" tabindex="-1">Cahul</li>
                    </ul>
                  </div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-8">
                  <label for="${inputId}-street">Strada</label>
                  <div class="e-permits-fo-select e-permits-fo-select--address is-disabled" data-fo-select>
                    <button class="e-permits-fo-select__button" id="${inputId}-street" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${inputId}-street-list" disabled>
                      <span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder" data-fo-select-value data-fo-address-part="street" data-placeholder="Selectează orașul/comuna mai întâi">Selectează orașul/comuna mai întâi</span>
                      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                    </button>
                    <ul class="e-permits-fo-select__list" id="${inputId}-street-list" role="listbox" aria-labelledby="${inputId}-street" hidden>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Calea Ieșilor" tabindex="-1">Calea Ieșilor</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Bulevardul Ștefan cel Mare și Sfânt" tabindex="-1">Bulevardul Ștefan cel Mare și Sfânt</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Strada București" tabindex="-1">Strada București</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Strada Alexandru cel Bun" tabindex="-1">Strada Alexandru cel Bun</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Bulevardul Dacia" tabindex="-1">Bulevardul Dacia</li>
                      <li class="e-permits-fo-select__option" role="option" aria-selected="false" data-value="Strada Independenței" tabindex="-1">Strada Independenței</li>
                    </ul>
                  </div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-postal">Codul Poștal</label>
                  <div class="e-permits-fo-input">
                    <input id="${inputId}-postal" type="text" placeholder="MD-0000" disabled data-fo-address-part="postalCode">
                  </div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-house">Casa</label>
                  <div class="e-permits-fo-input"><input id="${inputId}-house" type="text" placeholder="Nr." data-fo-address-part="house"></div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-block">Blocul</label>
                  <div class="e-permits-fo-input"><input id="${inputId}-block" type="text" placeholder="Nr." data-fo-address-part="block"></div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-stair">Scara</label>
                  <div class="e-permits-fo-input"><input id="${inputId}-stair" type="text" placeholder="Scara" data-fo-address-part="stair"></div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-floor">Etajul</label>
                  <div class="e-permits-fo-input"><input id="${inputId}-floor" type="text" placeholder="0" data-fo-address-part="floor"></div>
                </div>
                <div class="e-permits-fo-field e-permits-fo-field--span-4">
                  <label for="${inputId}-apartment">Apartamentul</label>
                  <div class="e-permits-fo-input"><input id="${inputId}-apartment" type="text" placeholder="Numărul ap." data-fo-address-part="apartment"></div>
                </div>
              </div>
            </div>
          `;
        }
        if (field.type === "select" || field.type === "caem") {
          return previewSelectHtml(field, inputId);
        }
        if (field.type === "mdocs") {
          return `
            <label class="e-permits-fo-file-drop">
              <input id="${inputId}" type="file" accept=".pdf,.png">
              <span class="e-permits-fo-file-drop__icon" aria-hidden="true">
                <svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-cloud-upload"></use></svg>
              </span>
              <span class="e-permits-fo-file-drop__copy">
                <span>Drag and drop or <strong>choose files</strong></span>
                <small>Un singur fișier PDF, PNG • max 10 MB</small>
              </span>
            </label>
          `;
        }
        return `<div class="e-permits-fo-input">${commonInput}</div>`;
      }

      function renderCitizenPreview(fields) {
        const previewSteps = getPreviewSteps();
        const activeNumber = previewSteps.activeIndex + 1;
        const stepTitle = builder.querySelector(".e-permits-builder__form-header h1")?.textContent.trim()
          || previewSteps.steps[previewSteps.activeIndex]?.label
          || "Detalii cerere";
        const section = sectionData(getActiveSection());

        if (previewStepper) {
          previewStepper.innerHTML = previewSteps.steps.map((step, index) => {
            const state = index < previewSteps.activeIndex ? " is-completed" : index === previewSteps.activeIndex ? " is-active" : "";
            const current = index === previewSteps.activeIndex ? ' aria-current="step"' : "";
            return `
              <li class="e-permits-fo-stepper__item${state}"${current}>
                <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
                <button class="e-permits-fo-stepper__row" type="button" data-builder-preview-step="${index}">
                  <span class="e-permits-fo-stepper__number">
                    <span class="e-permits-fo-stepper__number-text">${step.index}</span>
                    <svg class="icon e-permits-fo-stepper__check" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>
                  </span>
                  <span class="e-permits-fo-stepper__label">${escapeHtml(step.label)}</span>
                </button>
              </li>
            `;
          }).join("");
        }
        if (previewStepMeta) previewStepMeta.textContent = `Step ${activeNumber} of ${previewSteps.steps.length}`;
        if (previewTitle) previewTitle.textContent = stepTitle;
        if (previewSectionTitle) {
          previewSectionTitle.textContent = section.title;
          previewSectionTitle.hidden = !section.showTitle;
        }
        if (previewSectionDescription) {
          previewSectionDescription.textContent = section.description;
          previewSectionDescription.hidden = !section.showDescription || !section.description;
        }
        if (previewSectionSeparator) previewSectionSeparator.hidden = !section.showSeparator;
        if (!previewGrid) return;

        previewGrid.innerHTML = "";
        fields.forEach((field, index) => {
          const node = document.createElement("div");
          const span = FIELD_SPANS.includes(Number(field.span)) ? Number(field.span) : 12;
          const inputId = `builder-preview-${field.fieldId || field.id || index}`.replace(/[^a-zA-Z0-9_-]/g, "-");
          node.className = `e-permits-fo-field e-permits-fo-field--span-${span}`;
          if (field.type === "address") {
            node.className = "e-permits-fo-field e-permits-fo-field--span-12";
            node.innerHTML = previewFieldControl(field, inputId);
            previewGrid.appendChild(node);
            return;
          }
          node.innerHTML = `
            <label for="${inputId}">
              ${escapeHtml(field.label || "Câmp fără titlu")}
              ${field.required ? requiredMarkHtml() : ""}
            </label>
            ${previewFieldControl(field, inputId)}
          `;
          previewGrid.appendChild(node);
        });
        previewGrid.querySelectorAll("[data-fo-select]").forEach(bindFoSelect);
        previewGrid.querySelectorAll("[data-fo-address-search]").forEach(bindAddressSearch);
      }

      function renderPreviewAndSchema() {
        const fields = getFields().map(fieldData);
        const stepTitle = builder.querySelector(".e-permits-builder__form-header h1")?.textContent.trim() || "Detalii cerere";
        const section = sectionData(getActiveSection());
        renderCitizenPreview(fields);
        if (schemaCode) {
          schemaCode.textContent = JSON.stringify({
            form: "sanitary-operation-permit",
            version: "draft",
            grid: 12,
          steps: [
              {
                id: "service-details",
                title: stepTitle,
                section: {
                  title: section.title,
                  description: section.description,
                  showTitle: section.showTitle,
                  showDescription: section.showDescription,
                  showSeparator: section.showSeparator,
                },
                fields,
              },
            ],
          }, null, 2);
        }
        autosaveCurrentForm();
      }

      initPanelResize();
      getFields().forEach((field) => {
        setFieldSpan(field, Number(field.dataset.span || 4));
        bindField(field);
      });
      bindSections();
      setSelected(selectedField || getFields()[0]);
      renderPreviewAndSchema();
      loadSandboxDatabase().then(() => {
        const record = sandboxDb?.forms.find((form) => form.id === activeFormId) || sandboxDb?.forms[0];
        if (record) applyFormRecord(record);
        else renderFormSelector();
      });

      if (demoFlow === "builder" || window.location.hash === "#builder") {
        const shell = document.querySelector(".e-permits-shell");
        if (shell) shell.style.display = "none";
        window.__modal?.open?.("#form-builder-modal");
        builder.focus({ preventScroll: true });
      }
    }

    initFormBuilder();

    document.querySelectorAll(".permits-profile__tabs .tab-buttons").forEach((tabList) => {
      const tabs = Array.from(tabList.querySelectorAll(".tab-button[role='tab']"));

      function activateTab(tab) {
        tabs.forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("active", isActive);
          item.setAttribute("aria-selected", String(isActive));
          item.tabIndex = isActive ? 0 : -1;
        });
      }

      tabs.forEach((tab, index) => {
        tab.tabIndex = tab.classList.contains("active") ? 0 : -1;

        tab.addEventListener("click", () => {
          activateTab(tab);
        });

        tab.addEventListener("keydown", (event) => {
          const isNext = event.key === "ArrowRight" || event.key === "ArrowDown";
          const isPrevious = event.key === "ArrowLeft" || event.key === "ArrowUp";
          if (!isNext && !isPrevious) return;

          event.preventDefault();
          const direction = isNext ? 1 : -1;
          const nextIndex = (index + direction + tabs.length) % tabs.length;
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex]);
        });
      });
    });

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
