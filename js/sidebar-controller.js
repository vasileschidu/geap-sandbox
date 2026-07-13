document.addEventListener("DOMContentLoaded", () => {
  const sidebars = document.querySelectorAll("[data-sidebar]");
  const animationDurationMs = 220;

  sidebars.forEach((sidebar) => {
    const groups = sidebar.querySelectorAll(".sidebar__item--has-children");

    groups.forEach((group, index) => {
      const trigger = group.querySelector(":scope > .sidebar__link--toggle");
      const panel = group.querySelector(":scope > .sidebar__panel");

      if (!trigger || !panel) {
        return;
      }

      const groupId = panel.id || `${sidebar.id || "sidebar"}-group-${index + 1}`;
      panel.id = groupId;
      trigger.setAttribute("aria-controls", groupId);

      if (!trigger.hasAttribute("type")) {
        trigger.setAttribute("type", "button");
      }
    });

    const currentLink =
      sidebar.querySelector('.sidebar__link[aria-current="page"]') ||
      sidebar.querySelector("a.sidebar__link.sidebar__link--active");

    if (currentLink) {
      setCurrentLink(sidebar, currentLink, { preserveExpanded: true });
    } else {
      syncExpandedState(sidebar, { immediate: true });
    }

    sidebar.addEventListener("click", (event) => {
      const trigger = event.target.closest(".sidebar__link--toggle");

      if (trigger && sidebar.contains(trigger)) {
        event.preventDefault();
        toggleGroup(sidebar, trigger);
        return;
      }

      const link = event.target.closest("a.sidebar__link");

      if (!link || !sidebar.contains(link)) {
        return;
      }

      const href = link.getAttribute("href");

      if (!href || href === "#") {
        event.preventDefault();
      }

      setCurrentLink(sidebar, link, { preserveExpanded: true });
    });
  });

  function setCurrentLink(sidebar, nextLink, options = {}) {
    const { preserveExpanded = false } = options;

    sidebar.querySelectorAll("a.sidebar__link").forEach((link) => {
      const isCurrent = link === nextLink;

      link.classList.toggle("sidebar__link--active", isCurrent);

      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (!preserveExpanded) {
      sidebar.querySelectorAll(".sidebar__link--toggle[aria-expanded]").forEach((trigger) => {
        trigger.setAttribute("aria-expanded", "false");
      });
    }

    let parentPanel = nextLink.closest(".sidebar__panel");

    while (parentPanel) {
      const groupItem = parentPanel.closest(".sidebar__item--has-children");
      const trigger = groupItem?.querySelector(":scope > .sidebar__link--toggle");

      if (!groupItem || !trigger) {
        break;
      }

      trigger.setAttribute("aria-expanded", "true");
      parentPanel = groupItem.parentElement?.closest(".sidebar__panel") || null;
    }

    syncExpandedState(sidebar);
    syncBranchState(sidebar);
  }

  function toggleGroup(sidebar, trigger) {
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;

    if (!panel) {
      return;
    }

    const isExpanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!isExpanded));

    syncExpandedState(sidebar);
    syncBranchState(sidebar);
  }

  function syncExpandedState(sidebar, options = {}) {
    const { immediate = false } = options;

    sidebar.querySelectorAll(".sidebar__item--has-children").forEach((group) => {
      const trigger = group.querySelector(":scope > .sidebar__link--toggle");
      const panel = group.querySelector(":scope > .sidebar__panel");

      if (!trigger || !panel) {
        return;
      }

      const isExpanded = trigger.getAttribute("aria-expanded") === "true";
      setPanelExpanded(panel, isExpanded, { immediate });
    });
  }

  function setPanelExpanded(panel, isExpanded, options = {}) {
    const { immediate = false } = options;
    const wasExpanded = panel.dataset.sidebarExpanded === "true";

    window.clearTimeout(panel._sidebarCollapseTimer);

    panel.style.overflow = "hidden";

    if (!immediate && wasExpanded === isExpanded) {
      panel.hidden = !isExpanded;
      panel.style.maxHeight = isExpanded ? "none" : "0px";
      return;
    }

    if (immediate) {
      panel.hidden = !isExpanded;
      panel.style.transition = "none";
      panel.style.maxHeight = isExpanded ? "none" : "0px";
      panel.dataset.sidebarExpanded = String(isExpanded);
      return;
    }

    panel.style.transition = `max-height ${animationDurationMs}ms ease`;

    if (isExpanded) {
      panel.hidden = false;
      panel.style.maxHeight = "0px";
      panel.dataset.sidebarExpanded = "true";

      requestAnimationFrame(() => {
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });

      panel._sidebarCollapseTimer = window.setTimeout(() => {
        panel.style.maxHeight = "none";
      }, animationDurationMs);

      return;
    }

    if (panel.hidden) {
      panel.style.maxHeight = "0px";
      panel.dataset.sidebarExpanded = "false";
      return;
    }

    panel.style.maxHeight = `${panel.scrollHeight}px`;
    panel.dataset.sidebarExpanded = "false";

    requestAnimationFrame(() => {
      panel.style.maxHeight = "0px";
    });

    panel._sidebarCollapseTimer = window.setTimeout(() => {
      panel.hidden = true;
    }, animationDurationMs);
  }

  function syncBranchState(sidebar) {
    sidebar.querySelectorAll(".sidebar__item--has-children").forEach((group) => {
      const trigger = group.querySelector(":scope > .sidebar__link--toggle");

      if (!trigger) {
        return;
      }

      const hasActiveDescendant = Boolean(
        group.querySelector(".sidebar__panel .sidebar__link--active")
      );

      trigger.classList.toggle("sidebar__link--active", hasActiveDescendant);
    });
  }
});
