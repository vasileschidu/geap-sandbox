document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector("[data-shell]");
  const toggle = document.querySelector("[data-shell-toggle]");
  const userTrigger = document.querySelector(".e-permits-shell__user-trigger");
  const navItems = document.querySelectorAll("[data-nav-item]");
  const helpMenu = document.querySelector("[data-help-menu]");
  const helpTrigger = document.querySelector("[data-help-trigger]");
  const helpPanel = document.querySelector("[data-help-panel]");
  const userMenu = document.querySelector("[data-user-menu]");
  const userPanel = document.querySelector("[data-user-panel]");
  const roleOpeners = document.querySelectorAll("[data-role-open]");
  const roleOptions = document.querySelectorAll("[data-role-option]");
  const desktopMedia = window.matchMedia("(min-width: 961px)");
  const collapsePath = document.querySelector(".e-permits-shell__collapse-shape-path");
  let morphFrame = null;

  if (!shell) {
    return;
  }

  const parsePath = (value) => {
    const matches = value.match(/-?\d+(\.\d+)?/g) || [];
    return matches.map(Number);
  };

  const buildPath = (points) => `M${points[0]} ${points[1]}L${points[2]} ${points[3]}L${points[4]} ${points[5]}`;

  const morphPath = (targetPath) => {
    if (!collapsePath || !targetPath) {
      return;
    }

    const from = parsePath(collapsePath.getAttribute("d") || collapsePath.dataset.defaultD || "");
    const to = parsePath(targetPath);

    if (from.length !== 6 || to.length !== 6) {
      collapsePath.setAttribute("d", targetPath);
      return;
    }

    if (morphFrame) {
      window.cancelAnimationFrame(morphFrame);
    }

    const start = performance.now();
    const duration = 180;
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = ease(progress);
      const next = from.map((value, index) => value + (to[index] - value) * eased);

      collapsePath.setAttribute("d", buildPath(next));

      if (progress < 1) {
        morphFrame = window.requestAnimationFrame(step);
      } else {
        morphFrame = null;
      }
    };

    morphFrame = window.requestAnimationFrame(step);
  };

  const syncCollapseGlyph = (isHovering = false) => {
    if (!collapsePath) {
      return;
    }

    const isCollapsed = shell.classList.contains("is-collapsed");
    const target = isHovering
      ? (isCollapsed ? collapsePath.dataset.expandD : collapsePath.dataset.collapseD)
      : collapsePath.dataset.defaultD;

    morphPath(target);
  };

  const syncExpandedState = () => {
    if (!toggle) {
      return;
    }

    const isCollapsed = shell.classList.contains("is-collapsed");
    toggle.setAttribute("aria-pressed", String(isCollapsed));
    toggle.setAttribute(
      "aria-label",
      isCollapsed ? "Extinde meniul" : "Colapsează meniul"
    );

    const tooltipLabel = isCollapsed
      ? toggle.dataset.tooltipCollapsed
      : toggle.dataset.tooltipExpanded;
    const tooltip = toggle.querySelector(".e-permits-shell__collapse-tooltip");

    if (tooltipLabel) {
      if (tooltip) {
        tooltip.textContent = tooltipLabel;
      }
    }

    syncCollapseGlyph(toggle.matches(":hover") || toggle.matches(":focus-visible"));
  };

  const setupNavTooltips = () => {
    navItems.forEach((item) => {
      const label =
        item.getAttribute("title") ||
        item.dataset.navLabel ||
        item.querySelector(".e-permits-shell__nav-text")?.textContent?.trim();

      if (!label) {
        return;
      }

      item.dataset.navLabel = label;
      item.setAttribute("aria-label", label);
      item.removeAttribute("title");

      if (!item.querySelector(".e-permits-shell__nav-tooltip")) {
        const tooltip = document.createElement("span");
        tooltip.className = "e-permits-shell__nav-tooltip";
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.textContent = label;
        item.appendChild(tooltip);
      }
    });
  };

  const setHelpMenuOpen = (nextOpen) => {
    if (!helpTrigger || !helpPanel) {
      return;
    }

    helpTrigger.setAttribute("aria-expanded", String(nextOpen));
    helpPanel.hidden = !nextOpen;
  };

  const closeHelpMenu = () => {
    setHelpMenuOpen(false);
  };

  const setUserMenuOpen = (nextOpen) => {
    if (!userTrigger || !userPanel) {
      return;
    }

    userTrigger.setAttribute("aria-expanded", String(nextOpen));
    userPanel.hidden = !nextOpen;
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (!desktopMedia.matches) {
        return;
      }

      shell.classList.toggle("is-collapsed");
      syncExpandedState();
    });

    toggle.addEventListener("mouseenter", () => {
      syncCollapseGlyph(true);
    });

    toggle.addEventListener("mouseleave", () => {
      syncCollapseGlyph(false);
    });

    toggle.addEventListener("focus", () => {
      syncCollapseGlyph(true);
    });

    toggle.addEventListener("blur", () => {
      syncCollapseGlyph(false);
    });
  }

  if (helpTrigger && helpPanel) {
    helpTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = helpTrigger.getAttribute("aria-expanded") === "true";
      closeUserMenu();
      setHelpMenuOpen(!isOpen);
    });

    helpTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setHelpMenuOpen(true);
        helpPanel.querySelector('[role="menuitem"]')?.focus();
      }
    });

    helpPanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHelpMenu();
        helpTrigger.focus();
      }
    });

    helpPanel.querySelectorAll('[role="menuitem"]').forEach((item) => {
      item.addEventListener("click", () => {
        closeHelpMenu();
      });
    });

    document.addEventListener("click", (event) => {
      if (!helpMenu.contains(event.target)) {
        closeHelpMenu();
      }
    });
  }

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      const href = item.getAttribute("href");

      if (!href || href === "#") {
        event.preventDefault();
      }

      navItems.forEach((link) => {
        const isActive = link === item;
        link.classList.toggle("is-active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    });
  });

  if (userTrigger) {
    userTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      const expanded = userTrigger.getAttribute("aria-expanded") === "true";
      closeHelpMenu();
      setUserMenuOpen(!expanded);
    });
  }

  if (userTrigger && userPanel && userMenu) {
    userTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        closeHelpMenu();
        setUserMenuOpen(true);
        userPanel.querySelector('[role="menuitem"]')?.focus();
      }
    });

    userPanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeUserMenu();
        userTrigger.focus();
      }
    });

    userPanel.querySelectorAll('[role="menuitem"]').forEach((item) => {
      item.addEventListener("click", () => {
        closeUserMenu();
      });
    });

    document.addEventListener("click", (event) => {
      if (!userMenu.contains(event.target)) {
        closeUserMenu();
      }
    });
  }

  roleOpeners.forEach((button) => {
    button.addEventListener("click", () => {
      closeUserMenu();
      closeHelpMenu();
    });
  });

  roleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      roleOptions.forEach((item) => item.classList.toggle("is-active", item === option));
    });
  });

  desktopMedia.addEventListener("change", (event) => {
    if (!event.matches) {
      shell.classList.remove("is-collapsed");
    }

    syncExpandedState();
  });

  setupNavTooltips();
  syncExpandedState();
});
