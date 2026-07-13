(() => {
  const headerPath = "elements/header.html";
  const placeholderId = "site-header";
  const navGroups = [
    {
      title: "Getting started",
      items: [
        { href: "index.html", label: "Overview" }
      ]
    },
    {
      title: "Core Concepts",
      items: [
        { href: "SCSSDesignTokens.html", label: "Colors" },
        { href: "typography.html", label: "Typography" },
        { href: "radius-preview.html", label: "Border radius" },
        { href: "border-width-preview.html", label: "Border width" },
        { href: "grid-system.html", label: "Grid system" },
        { href: "grid-preview.html", label: "Grid preview" },
        { href: "width.html", label: "Width utilities" },
        { href: "displays.html", label: "Display utilities" },
        { href: "efects.html", label: "Effects" }
      ]
    },
    {
      title: "Spacing",
      items: [
        { href: "spacings.html", label: "Spacing system" },
        { href: "spacings-paddings.html", label: "Padding" },
        { href: "spacings-margins.html", label: "Margin" }
      ]
    },
    {
      title: "Patterns",
      items: [
        { href: "e-permits-shell.html", label: "E-Permits shell" },
        { href: "fod2-form-builder-shell.html", label: "Form builder shell" },
        { href: "sidebar.html", label: "Sidebar" },
        { href: "header.html", label: "Header" },
        { href: "header-with-avatar.html", label: "Header with avatar" },
        { href: "footer.html", label: "Footer" },
        { href: "breadcrumbs.html", label: "Breadcrumbs" },
        { href: "tabs.html", label: "Tabs" },
        { href: "pagination.html", label: "Pagination" },
        { href: "progress-tracker.html", label: "Progress tracker" },
        { href: "accordion.html", label: "Accordion" },
        { href: "table.html", label: "Table" }
      ]
    },
    {
      title: "Components",
      items: [
        { href: "buttons.html", label: "Buttons" },
        { href: "badge-buttons.html", label: "Badge buttons" },
        { href: "badge.html", label: "Badge" },
        { href: "avatar.html", label: "Avatar" },
        { href: "chip.html", label: "Chip" },
        { href: "tags.html", label: "Tags" },
        { href: "segmented-controls.html", label: "Segmented controls" },
        { href: "bottom-sheet.html", label: "Bottom sheet" },
        { href: "modals.html", label: "Modals" },
        { href: "tooltip.html", label: "Tooltip" },
        { href: "spinner.html", label: "Spinner" },
        { href: "icons.html", label: "Icons" }
      ]
    },
    {
      title: "Forms",
      items: [
        { href: "link.html", label: "Link" },
        { href: "input-preview.html", label: "Input preview" },
        { href: "search-input-preview.html", label: "Search input" },
        { href: "input-date.html", label: "Input date" },
        { href: "input-date-picker.html", label: "Date picker" },
        { href: "input-phone-number.html", label: "Phone number" },
        { href: "input-file.html", label: "File input" },
        { href: "textarea.html", label: "Textarea" },
        { href: "checkbox.html", label: "Checkbox" },
        { href: "radio-buttons.html", label: "Radio buttons" },
        { href: "switch.html", label: "Switch" },
        { href: "dropdown.html", label: "Dropdown / select" }
      ]
    },
    {
      title: "Feedback",
      items: [
        { href: "messages.html", label: "Messages" },
        { href: "message-alerts.html", label: "Message alerts" },
        { href: "messages-information.html", label: "Information messages" },
        { href: "messages-inline.html", label: "Inline messages" },
        { href: "messaget-toast.html", label: "Toast messages" },
        { href: "cookie-banner.html", label: "Cookie banner" }
      ]
    }
  ];

  const ensurePlaceholder = () => {
    const existing = document.getElementById(placeholderId);
    if (existing) return existing;

    const placeholder = document.createElement("div");
    placeholder.id = placeholderId;
    document.body.prepend(placeholder);
    return placeholder;
  };

  const getCurrentPage = () => {
    const path = window.location.pathname.split("/").pop();
    return path && path.length ? path : "index.html";
  };

  const renderSidebar = () => {
    const currentPage = getCurrentPage();
    const sections = navGroups.map((group) => {
      const items = group.items
        .map((item) => {
          const isActive = item.href === currentPage;
          return `<li>
            <a href="${item.href}" class="e-permits-shell__nav-link${isActive ? " is-active" : ""}"${isActive ? ' aria-current="page"' : ""}>
              <span class="e-permits-shell__nav-text">${item.label}</span>
            </a>
          </li>`;
        })
        .join("");

      return `<section class="e-permits-shell__nav-group docs-sidebar__section">
        <p class="e-permits-shell__group-label">${group.title}</p>
        <ul class="e-permits-shell__nav-list">${items}</ul>
      </section>`;
    });

    return `<aside class="docs-sidebar" id="docs-sidebar" aria-label="Documentation navigation">
      <nav class="e-permits-shell__nav docs-sidebar__nav">${sections.join("")}</nav>
    </aside>`;
  };

  const slugify = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const buildTableOfContents = (article, toc) => {
    const headings = Array.from(article.querySelectorAll("h2, h3"))
      .filter((heading) => heading.textContent.trim().length > 0);

    if (!headings.length) {
      toc.hidden = true;
      return;
    }

    const usedIds = new Set();
    const items = headings.map((heading) => {
      const level = heading.tagName === "H3" ? 3 : 2;
      let id = heading.id || slugify(heading.textContent);

      while (usedIds.has(id)) {
        id = `${id}-section`;
      }

      usedIds.add(id);
      heading.id = id;

      return `<li><a href="#${id}" class="docs-toc__link${level === 3 ? " docs-toc__link--level-3" : ""}">${heading.textContent.trim()}</a></li>`;
    });

    toc.innerHTML = `<p class="docs-toc__title">On this page</p><ul class="docs-toc__list">${items.join("")}</ul>`;
    toc.hidden = false;
  };

  const moveContentIntoShell = () => {
    document.body.classList.add("docs-app");

    const header = ensurePlaceholder();
    const existingShell = document.querySelector(".docs-shell");
    if (existingShell) return;

    const shell = document.createElement("div");
    shell.className = "docs-shell";
    shell.innerHTML = `
      ${renderSidebar()}
      <div class="docs-main">
        <div class="docs-content">
          <article class="docs-article"></article>
          <aside class="docs-toc" hidden></aside>
        </div>
        <div class="docs-footer-slot"></div>
      </div>
      <div class="docs-nav-backdrop" data-docs-nav-close></div>
    `;

    const article = shell.querySelector(".docs-article");
    const bodyChildren = Array.from(document.body.children).filter((node) => {
      if (node === header) return false;
      if (node.id === "site-footer") return false;
      if (node.tagName === "SCRIPT") return false;
      if (node.classList.contains("docs-shell")) return false;
      return true;
    });

    bodyChildren.forEach((node) => article.appendChild(node));
    header.insertAdjacentElement("afterend", shell);

    const toc = shell.querySelector(".docs-toc");
    buildTableOfContents(article, toc);

    const navToggle = document.querySelector("[data-docs-nav-toggle]");
    const navClose = shell.querySelector("[data-docs-nav-close]");

    if (navToggle) {
      navToggle.addEventListener("click", () => {
        const isOpen = document.body.classList.toggle("docs-app--nav-open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    if (navClose) {
      navClose.addEventListener("click", () => {
        document.body.classList.remove("docs-app--nav-open");
        if (navToggle) {
          navToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    window.addEventListener("resize", () => {
      if (window.innerWidth > 991) {
        document.body.classList.remove("docs-app--nav-open");
        if (navToggle) {
          navToggle.setAttribute("aria-expanded", "false");
        }
      }
    });
  };

  const loadHeaderSync = () => {
    const container = ensurePlaceholder();
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", headerPath, false);
      xhr.send(null);

      if (xhr.status === 200 || xhr.status === 0) {
        container.innerHTML = xhr.responseText;
        moveContentIntoShell();
      } else {
        console.error("Header include failed:", xhr.status);
      }
    } catch (error) {
      console.error("Header include failed:", error);
    }
  };

  if (document.body) {
    loadHeaderSync();
  } else {
    document.addEventListener("DOMContentLoaded", loadHeaderSync);
  }
})();
