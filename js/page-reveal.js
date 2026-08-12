(() => {
  "use strict";

  const ROOT_SELECTOR = [
    ".demo-start > section",
    "[data-flow-home] > section",
    "[data-fo-screen]",
    "[data-fo-step-panel]",
    "[data-builder-canvas]",
    "[data-builder-preview]",
    "[data-builder-schema]",
    "[data-workplace]",
    "[data-dosar-profil]",
    "[data-user-profile]",
    "[data-role-profile]",
    "[data-rap-list-view]",
    "[data-rap-profile-view]",
    ".mpass-test__card",
    ".e-permits-shell__content"
  ].join(",");

  const replayTriggers = [
    "[data-nav-item]",
    "[data-workplace-view]",
    "[data-dosar-profil-tabs] button",
    "[data-user-profile-tabs] button",
    "[data-role-profile-tabs] button"
  ].join(",");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rootRuns = new WeakMap();
  const stepRuns = new WeakMap();
  const introRuns = new WeakMap();
  const choiceRuns = new WeakMap();
  let runId = 0;

  const isVisible = (element) => {
    if (!(element instanceof HTMLElement) || element.hidden) return false;
    return element.getClientRects().length > 0;
  };

  const uniqueVisible = (elements) => {
    const seen = new Set();
    return elements.filter((element) => {
      if (!isVisible(element) || seen.has(element)) return false;
      seen.add(element);
      return true;
    });
  };

  const query = (root, selector) => [...root.querySelectorAll(selector)];

  const collectItems = (root) => {
    if (root.matches(".demo-start > section, [data-flow-home] > section")) {
      return uniqueVisible(query(root, [
        ".e-permits-fo-auth__choice-copy",
        ".e-permits-flow-home__demo-item",
        ".e-permits-fo-auth__role-item"
      ].join(",")));
    }

    if (root.matches('[data-fo-screen="auth"]')) {
      if (root.classList.contains("is-auth-intro-loading")) return [];
      return uniqueVisible(query(root, ".e-permits-fo-auth__content > *"));
    }

    if (root.matches('[data-fo-screen="choice"]')) {
      if (root.classList.contains("is-instance-loading")) return [];
      return uniqueVisible(query(root, [
        ".e-permits-fo-auth__choice-copy",
        ".e-permits-fo-auth__role-list > .e-permits-fo-auth__role-group-list",
        ".e-permits-fo-auth__role-list > .e-permits-fo-auth__role-group",
        ".e-permits-fo-auth__content--choice > .e-permits-fo-auth__or-separator",
        ".e-permits-fo-auth__content--choice > .e-permits-fo-auth__role-item--dashed",
        ".e-permits-fo-auth__content--choice > .e-permits-fo-back"
      ].join(",")));
    }

    if (root.matches('[data-fo-screen="request"]')) {
      const activePanel = root.querySelector("[data-fo-step-panel]:not([hidden])");
      return uniqueVisible([
        ...query(root, ":scope > .e-permits-fo-mobile-progress, :scope > .e-permits-fo-request__inner > .e-permits-fo-request__sidebar"),
        ...(activePanel && !activePanel.classList.contains("is-step-loading") ? collectItems(activePanel) : [])
      ]);
    }

    if (root.matches("[data-fo-step-panel]")) {
      if (root.classList.contains("is-step-loading")) return [];
      return uniqueVisible(query(root, ":scope > header, :scope > section, :scope > footer, :scope > .e-permits-fo-form__section, :scope > .e-permits-fo-documents"));
    }

    if (root.matches("[data-builder-canvas], [data-builder-preview], [data-builder-schema]")) {
      return uniqueVisible(query(root, ":scope > *, :scope > .e-permits-builder__citizen-shell > *"));
    }

    if (root.matches("[data-workplace]")) {
      return uniqueVisible(query(root, ":scope > .e-permits-workplace__header, :scope > .e-permits-workplace__table-wrap, :scope > .e-permits-workplace__pagination, :scope > *"));
    }

    if (root.matches("[data-dosar-profil], [data-user-profile], [data-role-profile]")) {
      return uniqueVisible(query(root, ":scope > header, :scope > [data-dosar-profil-panel], :scope > [data-user-profile-panel], :scope > [data-role-profile-panel]"));
    }

    if (root.matches("[data-rap-list-view]")) {
      return uniqueVisible(query(root, [
        ".rap-main__container > .rap-breadcrumbs",
        ".rap-main__container > .rap-intro",
        ".rap-main__container > .rap-toolbar",
        ".rap-main__container > .rap-company-summary",
        ".rap-main__container > .rap-register",
        ".rap-main__container > .rap-empty-state"
      ].join(",")));
    }

    if (root.matches("[data-rap-profile-view]")) {
      return uniqueVisible(query(root, ":scope > *, :scope > * > *"));
    }

    if (root.matches(".mpass-test__card")) {
      return uniqueVisible(query(root, ".mpass-test__content > *"));
    }

    if (root.matches(".e-permits-shell__content")) {
      return uniqueVisible(query(root, ":scope > .e-permits-shell__collapse-button, :scope > .e-permits-shell__canvas"));
    }

    return uniqueVisible(query(root, ":scope > *"));
  };

  const clearItem = (item) => {
    item.removeAttribute("data-page-reveal-item");
    item.removeAttribute("data-choice-reveal-item");
    item.style.removeProperty("--page-reveal-delay");
  };

  const authSkeletonMarkup = () => `
    <span class="page-auth-skeleton__lock page-skeleton-shape"></span>
    <span class="page-auth-skeleton__title">
      <span class="page-skeleton-shape"></span>
      <span class="page-skeleton-shape"></span>
    </span>
    <span class="page-auth-skeleton__availability">
      <span class="page-skeleton-shape"></span>
      <span class="page-auth-skeleton__tags">
        <span class="page-skeleton-shape"></span>
        <span class="page-skeleton-shape"></span>
      </span>
    </span>
    <span class="page-auth-skeleton__separator"></span>
    <span class="page-auth-skeleton__description page-skeleton-shape"></span>
    <span class="page-auth-skeleton__button page-skeleton-shape"></span>
  `;

  const choiceSkeletonMarkup = () => `
    <span class="page-choice-skeleton__copy">
      <span class="page-skeleton-shape page-choice-skeleton__title"></span>
      <span class="page-skeleton-shape page-choice-skeleton__subtitle"></span>
    </span>
    <span class="page-choice-skeleton__cluster">
      <span class="page-choice-skeleton__row page-skeleton-shape"></span>
      <span class="page-choice-skeleton__row page-skeleton-shape"></span>
    </span>
    <span class="page-choice-skeleton__group">
      <span class="page-skeleton-shape page-choice-skeleton__label"></span>
      <span class="page-choice-skeleton__row page-skeleton-shape"></span>
      <span class="page-choice-skeleton__row page-skeleton-shape"></span>
      <span class="page-choice-skeleton__row page-skeleton-shape"></span>
    </span>
  `;

  const revealChoice = (screen) => {
    if (!(screen instanceof HTMLElement) || !isVisible(screen) || reducedMotion.matches) return;
    const items = uniqueVisible([
      screen.querySelector(".e-permits-fo-auth__choice-copy"),
      screen.querySelector(".e-permits-fo-auth__role-list > .e-permits-fo-auth__role-group-list"),
      screen.querySelector(".e-permits-fo-auth__role-list > .e-permits-fo-auth__role-group"),
      screen.querySelector(".e-permits-fo-auth__or-separator"),
      screen.querySelector(".e-permits-fo-auth__role-item--dashed")
    ].filter(Boolean));

    items.forEach(clearItem);
    void screen.offsetWidth;
    items.forEach((item, index) => {
      item.style.setProperty("--page-reveal-delay", `${index * 34}ms`);
      item.setAttribute("data-choice-reveal-item", "");
    });
    window.setTimeout(() => items.forEach(clearItem), 620);
  };

  const showAuthIntro = (screen, { duration = 650 } = {}) => {
    if (!(screen instanceof HTMLElement) || !screen.matches('[data-fo-screen="auth"]') || !isVisible(screen)) return;
    if (reducedMotion.matches || screen.dataset.authIntroShown === "true") return;
    screen.dataset.authIntroShown = "true";

    const token = ++runId;
    const skeleton = document.createElement("div");
    skeleton.className = "page-auth-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = authSkeletonMarkup();
    screen.classList.add("is-auth-intro-loading");
    screen.setAttribute("aria-busy", "true");
    screen.prepend(skeleton);
    requestAnimationFrame(() => skeleton.classList.add("is-visible"));

    const timer = window.setTimeout(() => {
      const current = introRuns.get(screen);
      if (!current || current.token !== token) return;
      skeleton.classList.remove("is-visible");
      screen.classList.remove("is-auth-intro-loading");
      screen.setAttribute("aria-busy", "false");
      reveal(screen, { force: true });
      window.setTimeout(() => skeleton.remove(), 150);
    }, duration);
    introRuns.set(screen, { token, timer, skeleton });
  };

  const showInstanceChoice = (screen, { duration = 1650 } = {}) => {
    if (!(screen instanceof HTMLElement) || !screen.matches('[data-fo-screen="choice"]') || !isVisible(screen)) return;
    if (reducedMotion.matches) {
      screen.classList.remove("is-instance-loading");
      screen.removeAttribute("aria-busy");
      return;
    }

    const previous = choiceRuns.get(screen);
    if (previous?.timer) window.clearTimeout(previous.timer);
    previous?.skeleton?.remove();

    const token = ++runId;
    const skeleton = document.createElement("div");
    skeleton.className = "page-choice-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = choiceSkeletonMarkup();
    screen.classList.add("is-instance-loading");
    screen.setAttribute("aria-busy", "true");
    screen.prepend(skeleton);
    requestAnimationFrame(() => skeleton.classList.add("is-visible"));

    const timer = window.setTimeout(() => {
      const current = choiceRuns.get(screen);
      if (!current || current.token !== token) return;
      skeleton.classList.remove("is-visible");
      screen.classList.remove("is-instance-loading");
      screen.setAttribute("aria-busy", "false");
      revealChoice(screen);
      window.setTimeout(() => skeleton.remove(), 160);
      window.setTimeout(() => screen.querySelector(".e-permits-fo-auth__role-item")?.focus({ preventScroll: true }), 220);
    }, Math.max(900, duration));
    choiceRuns.set(screen, { token, timer, skeleton });
  };

  const skeletonDuration = (panel) => {
    const sections = panel.querySelectorAll(":scope > section, :scope > .e-permits-fo-form__section").length;
    const fields = panel.querySelectorAll(".e-permits-fo-field, .e-permits-fo-detail-card, .e-permits-fo-document-item, .e-permits-fo-documents__item").length;
    const density = (sections * 125) + (fields * 34);
    return Math.round((500 + Math.min(1000, density)) / 50) * 50;
  };

  const skeletonMarkup = (panel) => {
    const sectionCount = Math.max(1, Math.min(4, panel.querySelectorAll(":scope > section, :scope > .e-permits-fo-form__section").length || 2));
    const fieldCount = panel.querySelectorAll(".e-permits-fo-field, .e-permits-fo-detail-card, .e-permits-fo-document-item, .e-permits-fo-documents__item").length;
    const fieldsPerSection = Math.max(2, Math.min(4, Math.ceil(Math.max(fieldCount, 4) / sectionCount)));
    const sections = Array.from({ length: sectionCount }, (_, sectionIndex) => {
      const fields = Array.from({ length: fieldsPerSection }, (_, fieldIndex) => `
        <span class="page-step-skeleton__field">
          <span class="page-step-skeleton__line page-step-skeleton__line--label" style="width:${38 + ((sectionIndex + fieldIndex) % 3) * 8}%"></span>
          <span class="page-step-skeleton__line page-step-skeleton__line--input"></span>
        </span>
      `).join("");
      return `
        <span class="page-step-skeleton__section">
          <span class="page-step-skeleton__line page-step-skeleton__line--section" style="width:${30 + (sectionIndex % 3) * 6}%"></span>
          <span class="page-step-skeleton__grid">${fields}</span>
        </span>
      `;
    }).join("");

    return `
      <span class="page-step-skeleton__heading">
        <span class="page-step-skeleton__line page-step-skeleton__line--eyebrow"></span>
        <span class="page-step-skeleton__line page-step-skeleton__line--title"></span>
      </span>
      ${sections}
    `;
  };

  const showStep = (panel) => {
    if (!(panel instanceof HTMLElement) || !panel.matches("[data-fo-step-panel]") || !isVisible(panel)) return;
    if (reducedMotion.matches) {
      reveal(panel, { force: true });
      return;
    }

    const token = ++runId;
    const previous = stepRuns.get(panel);
    if (previous?.skeleton?.isConnected && panel.classList.contains("is-step-loading")) return;
    if (previous?.timer) window.clearTimeout(previous.timer);
    previous?.skeleton?.remove();

    const skeleton = document.createElement("div");
    skeleton.className = "page-step-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = skeletonMarkup(panel);

    const measuredHeight = Math.ceil(panel.getBoundingClientRect().height);
    panel.style.setProperty("--step-skeleton-min-height", `${Math.max(measuredHeight, 360)}px`);
    panel.classList.add("is-step-loading");
    panel.setAttribute("aria-busy", "true");
    panel.prepend(skeleton);
    requestAnimationFrame(() => skeleton.classList.add("is-visible"));

    const duration = skeletonDuration(panel);
    panel.dataset.stepSkeletonDuration = String(duration);
    const timer = window.setTimeout(() => {
      const current = stepRuns.get(panel);
      if (!current || current.token !== token) return;

      skeleton.classList.remove("is-visible");
      panel.classList.remove("is-step-loading");
      panel.setAttribute("aria-busy", "false");
      panel.style.removeProperty("--step-skeleton-min-height");
      delete panel.dataset.stepSkeletonDuration;

      if (isVisible(panel)) reveal(panel, { force: true });
      window.setTimeout(() => skeleton.remove(), 140);
    }, duration);

    stepRuns.set(panel, { token, timer, skeleton });
  };

  const clearStep = (panel) => {
    const current = stepRuns.get(panel);
    if (current?.timer) window.clearTimeout(current.timer);
    current?.skeleton?.remove();
    stepRuns.delete(panel);
    panel.classList.remove("is-step-loading");
    panel.removeAttribute("aria-busy");
    panel.style.removeProperty("--step-skeleton-min-height");
    delete panel.dataset.stepSkeletonDuration;
  };

  const reveal = (root, { force = false } = {}) => {
    if (!(root instanceof HTMLElement) || !isVisible(root) || reducedMotion.matches) return;

    const now = performance.now();
    const previous = rootRuns.get(root);
    if (!force && previous && now - previous.time < 180) return;

    const items = collectItems(root).slice(0, 10);
    if (!items.length) return;

    const token = ++runId;
    rootRuns.set(root, { token, time: now });

    items.forEach(clearItem);
    void root.offsetWidth;

    items.forEach((item, index) => {
      item.style.setProperty("--page-reveal-delay", `${Math.min(index, 8) * 22}ms`);
      item.setAttribute("data-page-reveal-item", "");
    });

    window.setTimeout(() => {
      const latest = rootRuns.get(root);
      if (!latest || latest.token !== token) return;
      items.forEach(clearItem);
    }, 520);
  };

  const revealRoots = (roots) => {
    const visibleRoots = uniqueVisible(roots);
    const outermostRoots = visibleRoots.filter((root) => (
      !visibleRoots.some((candidate) => candidate !== root && candidate.contains(root))
    ));
    outermostRoots.forEach((root) => reveal(root));
  };

  const revealVisiblePage = ({ force = false } = {}) => {
    const roots = [...document.querySelectorAll(ROOT_SELECTOR)].filter(isVisible);
    const screenRoots = roots.filter((root) => root.matches("[data-fo-screen], [data-flow-home] > section, .demo-start > section, [data-rap-list-view], [data-rap-profile-view], [data-workplace], [data-dosar-profil], [data-user-profile], [data-role-profile], [data-builder-canvas], [data-builder-preview], [data-builder-schema], .e-permits-shell__content"));
    const mostSpecificRoots = screenRoots.filter((root) => !screenRoots.some((candidate) => candidate !== root && root.contains(candidate)));
    mostSpecificRoots.forEach((root) => reveal(root, { force }));
  };

  const observer = new MutationObserver((mutations) => {
    const roots = [];
    mutations.forEach((mutation) => {
      const target = mutation.target;
      if (target instanceof HTMLElement && target.matches("[data-fo-step-panel]") && target.hidden) {
        clearStep(target);
        return;
      }
      if (target instanceof HTMLElement && target.matches(ROOT_SELECTOR) && !target.hidden) {
        if (target.matches("[data-fo-step-panel]")) {
          showStep(target);
          return;
        }
        if (target.matches('[data-fo-screen="request"]')) {
          const activePanel = target.querySelector("[data-fo-step-panel]:not([hidden])");
          if (activePanel) showStep(activePanel);
        }
        roots.push(target);
      }
    });
    if (!roots.length) return;
    requestAnimationFrame(() => revealRoots(roots));
  });

  const init = () => {
    if (reducedMotion.matches) return;
    observer.observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const visibleRequest = document.querySelector('[data-fo-screen="request"]:not([hidden])');
      const activePanel = visibleRequest?.querySelector("[data-fo-step-panel]:not([hidden])");
      if (activePanel) showStep(activePanel);
      const visibleAuth = document.querySelector('[data-fo-screen="auth"]:not([hidden])');
      if (visibleAuth) showAuthIntro(visibleAuth);
      revealVisiblePage();
    }));

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(replayTriggers)) return;
      window.setTimeout(() => revealVisiblePage({ force: true }), 0);
    });
  };

  window.PageReveal = { reveal, revealVisiblePage, showStep, showAuthIntro, showInstanceChoice };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
