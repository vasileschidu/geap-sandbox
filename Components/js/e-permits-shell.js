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
  const workplaceLinks = document.querySelectorAll("[data-workplace-view]");
  const workplaceTitle = document.querySelector("[data-workplace-title]");
  const workplaceRows = document.querySelector("[data-workplace-rows]");
  const workplaceTotal = document.querySelector("[data-workplace-total]");
  const workplacePanel = document.querySelector("[data-workplace]");
  const workplaceSearch = document.querySelector("[data-workplace-search]");
  const workplaceTabs = document.querySelector("[data-workplace-tabs]");
  const workplaceTable = document.querySelector(".e-permits-workplace__table");
  const workplaceHead = document.querySelector("[data-workplace-head]") || workplaceTable?.querySelector("thead tr");
  const workplacePagination = document.querySelector(".e-permits-workplace__pagination");
  const workplaceFieldCount = document.querySelector(".e-permits-workplace__field-count");
  const permitsProfilePanel = document.querySelector(".permits-profile");
  const workplacePageSizeOptions = [16, 32, 48, 96];

  let morphFrame = null;
  let workplaceDb = null;
  const workplaceState = {
    viewKey: "mine",
    tabKey: null,
    query: "",
    page: 1,
    pageSize: 16,
    sortKey: "dataDepunerii",
    sortDirection: "desc",
    rows: [],
    selected: new Set()
  };

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
    toggle.setAttribute("aria-label", isCollapsed ? "Extinde meniul" : "Colapsează meniul");

    const tooltipLabel = isCollapsed
      ? toggle.dataset.tooltipCollapsed
      : toggle.dataset.tooltipExpanded;
    const tooltip = toggle.querySelector(".e-permits-shell__collapse-tooltip");

    if (tooltipLabel && tooltip) {
      tooltip.textContent = tooltipLabel;
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

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const parseIsoDate = (value) => {
    if (!value) {
      return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const toIsoDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const formatDate = (value) => {
    const date = parseIsoDate(value);

    if (!date) {
      return "—";
    }

    const pad = (part) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  };

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const daysUntil = (value) => {
    const date = parseIsoDate(value);
    const today = parseIsoDate(workplaceDb?.today);

    if (!date || !today) {
      return 0;
    }

    return Math.ceil((date.getTime() - today.getTime()) / 86400000);
  };

  const mulberry32 = (seed) => {
    let value = seed;

    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  };

  const pick = (items, rnd) => items[Math.floor(rnd() * items.length)];

  const buildDosare = (db) => {
    if (!db) {
      return [];
    }

    const rnd = mulberry32(db.seed || 11);
    const today = parseIsoDate(db.today) || new Date();
    const mySpecialist = db.specialisti.find((specialist) => specialist.id === db.meSpecialistId) || db.specialisti[0];
    const otherSubdiviziuni = db.subdiviziuni.filter((subdiviziune) => subdiviziune !== db.mySubdiviziune);
    const servicePool = db.serviceScope?.length ? db.serviceScope : db.servicii;
    const rows = [];
    let sequence = 4400;
    let alertCursor = 0;

    db.plan.forEach(({ status, count, alerts }) => {
      for (let index = 0; index < count; index += 1) {
        sequence += 1 + Math.floor(rnd() * 4);

        const isOficiu = status === "schita";
        const actBaza = isOficiu ? pick(db.acteEmise, rnd) : null;
        const solicitant = isOficiu ? { nume: actBaza.titular, companie: actBaza.companie } : pick(db.solicitanti, rnd);
        const serviciu = isOficiu ? actBaza.denumire : pick(servicePool, rnd);
        const tipDosar = isOficiu
          ? pick(db.postProcessTipuri, rnd)
          : db.tipDosar[Math.floor(rnd() * (rnd() > 0.72 ? db.tipDosar.length : 2))];
        const motivOficiu = isOficiu ? pick(db.motiveOficiu, rnd) : null;
        const isUnassigned = status === "depus" || status === "schita";
        const specialist = isUnassigned
          ? null
          : rnd() < 0.5
            ? mySpecialist
            : db.specialisti[1 + Math.floor(rnd() * (db.specialisti.length - 1))];
        const dataDepunerii = addDays(today, -Math.floor(rnd() * 75));
        const termenExaminare = addDays(dataDepunerii, 10 + Math.floor(rnd() * 21));
        const alerte = [];

        if (alerts?.length && rnd() > 0.28) {
          alerte.push(alerts[alertCursor % alerts.length]);
          alertCursor += 1;

          if (rnd() > 0.76) {
            const second = pick(alerts, rnd);
            if (!alerte.includes(second)) {
              alerte.push(second);
            }
          }
        }

        let decizia = "none";

        if (status === "spreCoordonare" || status === "spreSemnare") {
          decizia = "proiect";
        } else if (status === "semnat" || status === "eliberat") {
          decizia = "aprobare";
        } else if (status === "respins") {
          decizia = "respingere";
        } else if (status === "arhivat") {
          decizia = rnd() > 0.5 ? "aprobare" : "respingere";
        }

        const id = `D-2026-${String(sequence).padStart(6, "0")}`;

        rows.push({
          id,
          nrDosar: id,
          status,
          alerte,
          decizia,
          tipDosar,
          serviciu,
          numeSolicitant: solicitant.nume,
          companie: solicitant.companie,
          specialist,
          subdiviziune: rnd() < 0.72 ? db.mySubdiviziune : pick(otherSubdiviziuni, rnd),
          dataDepunerii: toIsoDate(dataDepunerii),
          termenExaminare: toIsoDate(termenExaminare),
          dataSemnarii: ["semnat", "eliberat"].includes(status)
            ? toIsoDate(addDays(today, -Math.floor(rnd() * 14)))
            : null,
          modLivrare: pick(db.modLivrare, rnd),
          nedistribuit: status === "depus" && rnd() > 0.52,
          sursa: isOficiu ? "OFICIU" : (rnd() > 0.35 ? "FO" : "BO"),
          actBaza,
          motivOficiu,
          dataInitierii: isOficiu ? toIsoDate(dataDepunerii) : null,
          initiatDe: isOficiu ? pick(db.specialisti, rnd) : null
        });
      }
    });

    return rows.sort((a, b) => String(b.dataDepunerii).localeCompare(String(a.dataDepunerii)));
  };

  const getView = (viewKey = workplaceState.viewKey) =>
    workplaceDb?.views?.[viewKey] || workplaceDb?.views?.mine || null;

  const filterByView = (row, view) => {
    switch (view?.filter) {
      case "specialistMine":
        return row.specialist?.id === workplaceDb.meSpecialistId;
      case "unassigned":
        return row.status === "depus" && row.nedistribuit;
      case "office":
        return row.status === "schita";
      case "print":
        return row.specialist?.id === workplaceDb.meSpecialistId && row.status === "semnat" && row.modLivrare !== "Electronic";
      default:
        return true;
    }
  };

  const filterByToken = (row, filterToken) => {
    if (!filterToken || filterToken === "all") {
      return true;
    }

    if (filterToken === "activeWork") {
      return ["inExaminare", "spreCoordonare"].includes(row.status);
    }

    if (filterToken === "hasAlerts") {
      return row.alerte.length > 0;
    }

    if (filterToken.startsWith("alert:")) {
      return row.alerte.includes(filterToken.slice(6));
    }

    return true;
  };

  const getBaseRows = (view = getView()) =>
    workplaceState.rows.filter((row) => filterByView(row, view));

  const getSortValue = (row, key) => {
    switch (key) {
      case "decizia":
        return workplaceDb.decisions[row.decizia]?.label || "";
      case "status":
        return workplaceDb.statuses[row.status]?.label || "";
      case "alerte":
        return row.alerte.map((alert) => workplaceDb.alerts[alert]?.label || alert).join(" ");
      case "dataDepunerii":
      case "termenExaminare":
      case "dataSemnarii":
      case "dataInitierii":
        return row[key] ? Date.parse(row[key]) : 0;
      case "actBaza":
        return `${row.actBaza?.nr || ""} ${row.actBaza?.denumire || ""}`;
      case "titular":
        return row.actBaza?.titular || "";
      case "initiatDe":
        return row.initiatDe?.nume || "";
      case "solicitant":
        return row.numeSolicitant || "";
      default:
        return row[key] ?? "";
    }
  };

  const compareSortValues = (left, right) => {
    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }

    return String(left).localeCompare(String(right), "ro", { numeric: true, sensitivity: "base" });
  };

  const compareRowsByActiveSort = (left, right, fallbackDirection = "desc") => {
    if (workplaceState.sortKey) {
      const direction = workplaceState.sortDirection === "asc" ? 1 : -1;
      const sorted = compareSortValues(
        getSortValue(left, workplaceState.sortKey),
        getSortValue(right, workplaceState.sortKey)
      );

      if (sorted !== 0) {
        return sorted * direction;
      }
    }

    const fallback = String(left.dataDepunerii || "").localeCompare(String(right.dataDepunerii || ""));
    return fallbackDirection === "asc" ? fallback : -fallback;
  };

  const getSearchHaystack = (row) => {
    const status = workplaceDb.statuses[row.status]?.label;
    const decizia = workplaceDb.decisions[row.decizia]?.label;
    const alertLabels = row.alerte.map((alert) => workplaceDb.alerts[alert]?.label || alert);

    return [
      row.nrDosar,
      row.sursa,
      decizia,
      status,
      ...alertLabels,
      row.tipDosar,
      row.serviciu,
      row.numeSolicitant,
      row.companie,
      row.specialist?.nume,
      row.subdiviziune,
      formatDate(row.dataDepunerii),
      formatDate(row.termenExaminare),
      formatDate(row.dataSemnarii),
      row.modLivrare,
      row.actBaza?.nr,
      row.actBaza?.denumire,
      row.actBaza?.titular,
      row.motivOficiu,
      row.initiatDe?.nume
    ].filter(Boolean).join(" ").toLocaleLowerCase("ro");
  };

  const filterBySearch = (row) => {
    const query = workplaceState.query.trim().toLocaleLowerCase("ro");

    if (!query) {
      return true;
    }

    return query.split(/\s+/).every((term) => getSearchHaystack(row).includes(term));
  };

  const getVisibleRows = () => {
    const view = getView();
    const tab = getActiveTab(view);

    const rows = getBaseRows(view)
      .filter((row) => filterByToken(row, tab?.filter))
      .filter(filterBySearch);

    return [...rows].sort((a, b) => {
      if (!view?.groupBy) {
        return compareRowsByActiveSort(a, b);
      }

      const groupA = String(a[view.groupBy] || "");
      const groupB = String(b[view.groupBy] || "");
      const byGroup = groupA.localeCompare(groupB, "ro");

      if (byGroup !== 0) {
        return byGroup;
      }

      return compareRowsByActiveSort(a, b);
    });
  };

  const getActiveTab = (view = getView()) => {
    const tabs = (view?.tabs || []).filter((tab) => !tab.divider);

    if (!tabs.length) {
      return null;
    }

    const current = workplaceState.tabKey || view.defaultTab || tabs[0].id;
    return tabs.find((tab) => tab.id === current) || tabs[0];
  };

  const fillColumns = new Set(["solicitant", "companie", "actBaza", "titular", "motivOficiu"]);
  const defaultMinColumnWidth = 128;
  const selectColumnWidth = 43;
  const actionsColumnWidth = 55;
  const fixedColumnWidths = {
    nrDosar: 139
  };
  const minColumnWidths = {
    decizia: 72,
    status: 76,
    alerte: 92,
    tipDosar: 94,
    solicitant: 132,
    companie: 132,
    dataDepunerii: 116,
    termenExaminare: 126,
    dataSemnarii: 116,
    modLivrare: 104,
    actBaza: 260,
    titular: 132,
    motivOficiu: 220,
    dataInitierii: 116,
    initiatDe: 132
  };
  const maxColumnWidths = {
    decizia: 128,
    status: 150,
    alerte: 184,
    tipDosar: 132,
    dataDepunerii: 132,
    termenExaminare: 144,
    dataSemnarii: 132,
    modLivrare: 132,
    dataInitierii: 132,
    initiatDe: 180
  };

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext?.("2d");

  const measureText = (value, font = "500 14px Onest, Arial, sans-serif") => {
    const text = String(value || "");

    if (!text) {
      return 0;
    }

    if (!measureContext) {
      return text.length * 7.4;
    }

    measureContext.font = font;
    return measureContext.measureText(text).width;
  };

  const clamp = (value, min, max = Infinity) => Math.max(min, Math.min(max, value));

  const getColumnTextLines = (row, key) => {
    switch (key) {
      case "nrDosar":
        return [row.nrDosar, `Sursă: ${row.sursa}`];
      case "decizia":
        return [workplaceDb.decisions[row.decizia]?.label || "—"];
      case "status":
        return [workplaceDb.statuses[row.status]?.label || "—"];
      case "alerte":
        return row.alerte?.length
          ? row.alerte.map((alertKey) => workplaceDb.alerts[alertKey]?.short || alertKey)
          : ["—"];
      case "dataDepunerii":
        return [formatDate(row.dataDepunerii)];
      case "termenExaminare":
        return [formatDate(row.termenExaminare), daysUntil(row.termenExaminare) < 0 ? "depășit" : "rămase"];
      case "dataSemnarii":
        return [formatDate(row.dataSemnarii)];
      case "actBaza":
        return [row.actBaza?.nr, row.actBaza?.denumire].filter(Boolean);
      case "titular":
        return [row.actBaza?.titular || "—"];
      case "initiatDe":
        return [row.initiatDe?.nume || "—"];
      case "solicitant":
        return [row.numeSolicitant || "—"];
      default:
        return [row[key] ?? "—"];
    }
  };

  const getNaturalColumnWidth = (key, rows) => {
    if (fixedColumnWidths[key]) {
      return fixedColumnWidths[key];
    }

    const column = workplaceDb.columns[key];
    const minWidth = Math.max(defaultMinColumnWidth, minColumnWidths[key] || 0, column?.width || 0);
    const maxWidth = Math.max(minWidth, maxColumnWidths[key] || (fillColumns.has(key) ? Infinity : 220));
    const headerWidth = measureText(column?.label || key, "500 12px Onest, Arial, sans-serif") + 24;
    const contentWidth = rows.reduce((max, row) => {
      const lineWidth = Math.max(...getColumnTextLines(row, key).map((line) => measureText(line)));
      return Math.max(max, lineWidth + 24);
    }, 0);

    return Math.ceil(clamp(Math.max(headerWidth, contentWidth), minWidth, maxWidth));
  };

  const getColumnWidths = (columns, rows) => {
    const widths = Object.fromEntries(columns.map((key) => [key, getNaturalColumnWidth(key, rows)]));
    const tablePaddingWidth = selectColumnWidth + actionsColumnWidth;
    const visibleTableWidth = workplaceTable?.parentElement?.clientWidth || 0;
    const naturalWidth = columns.reduce((sum, key) => sum + widths[key], tablePaddingWidth);
    const extraWidth = Math.max(0, visibleTableWidth - naturalWidth);
    const growable = columns.filter((key) => fillColumns.has(key));

    if (extraWidth > 0 && growable.length) {
      const each = Math.floor(extraWidth / growable.length);
      let remainder = extraWidth - each * growable.length;

      growable.forEach((key) => {
        widths[key] += each + (remainder > 0 ? 1 : 0);
        remainder -= 1;
      });
    }

    return widths;
  };

  const setColumnWidth = (column, width) => {
    const value = width || column?.width || 140;
    return `width:${value}px;min-width:${value}px;max-width:${value}px;`;
  };

  const renderSortIcon = (column, direction = null) => {
    if (!column?.sortable) {
      return "";
    }

    return `
      <span class="e-permits-workplace__sort${direction ? ` is-${escapeHtml(direction)}` : ""}" aria-hidden="true">
        <svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
      </span>
    `;
  };

  const renderTableHead = (columns, columnWidths) => {
    if (!workplaceHead) {
      return;
    }

    workplaceHead.innerHTML = `
      <th scope="col" class="e-permits-workplace__select-cell">
        <label class="e-permits-workplace__checkbox-control">
          <input type="checkbox" data-workplace-select-all>
          <span class="e-permits-workplace__checkbox" aria-hidden="true"></span>
        </label>
      </th>
      ${columns.map((key) => {
        const column = workplaceDb.columns[key];
        const sortable = Boolean(column?.sortable);
        const isSorted = sortable && workplaceState.sortKey === key;
        const sortDirection = isSorted ? workplaceState.sortDirection : null;
        const ariaSort = isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none";
        const label = escapeHtml(column.label);

        return `
          <th scope="col" style="${setColumnWidth(column, columnWidths[key])}" data-column="${escapeHtml(key)}"${sortable ? ` aria-sort="${ariaSort}"` : ""} class="${sortable ? `is-sortable${isSorted ? " is-sorted" : ""}` : ""}">
            ${sortable ? `
              <button class="e-permits-workplace__th-content" type="button" data-workplace-sort="${escapeHtml(key)}" aria-label="Sortează după ${label}">
                <span>${label}</span>${renderSortIcon(column, sortDirection)}
              </button>
            ` : `
              <span class="e-permits-workplace__th-content"><span>${label}</span></span>
            `}
          </th>
        `;
      }).join("")}
      <th scope="col" class="e-permits-workplace__actions-cell" aria-label="Acțiuni"></th>
    `;
  };

  const renderTag = (label, tone = "neutral") => {
    if (!label || label === "—") {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `<span class="e-permits-workplace__tag e-permits-workplace__tag--${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
  };

  const renderAlerts = (alerts) => {
    if (!alerts?.length) {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <div class="e-permits-workplace__alert-list">
        ${alerts.map((alertKey) => {
          const alert = workplaceDb.alerts[alertKey];
          return `<span class="e-permits-workplace__flag e-permits-workplace__flag--${escapeHtml(alert?.tone || "neutral")}" title="${escapeHtml(alert?.label || alertKey)}">${escapeHtml(alert?.short || alertKey)}</span>`;
        }).join("")}
      </div>
    `;
  };

  const renderTermen = (row) => {
    const days = daysUntil(row.termenExaminare);
    const done = ["eliberat", "respins", "arhivat", "semnat"].includes(row.status);
    let meta = "";
    let tone = "muted";

    if (!done) {
      if (days < 0) {
        meta = `${Math.abs(days)} z. depășit`;
        tone = "danger";
      } else if (days <= 3) {
        meta = `${days} z. rămase`;
        tone = "warning";
      } else {
        meta = `${days} z. rămase`;
      }
    }

    return `
      <span class="e-permits-workplace__date-stack">
        <span>${escapeHtml(formatDate(row.termenExaminare))}</span>
        ${meta ? `<span class="e-permits-workplace__date-meta e-permits-workplace__date-meta--${tone}">${tone === "danger" ? '<span class="e-permits-workplace__date-dot" aria-hidden="true"></span>' : ""}${escapeHtml(meta)}</span>` : ""}
      </span>
    `;
  };

  const renderCopyCode = (value, label = value) => {
    if (!value || value === "—") {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <button class="e-permits-workplace__copy-code" type="button" data-shell-copy-value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}">
        <span>${escapeHtml(value)}</span>
        <span class="e-permits-workplace__copy-tooltip" aria-hidden="true">Copiază</span>
      </button>
    `;
  };

  const renderNrDosar = (row) => `
    <div class="e-permits-workplace__case-cell">
      ${renderCopyCode(row.nrDosar, `Copiază ${row.nrDosar}`)}
      <span class="e-permits-workplace__source">
        <span>Sursă:</span>
        <span>${escapeHtml(row.sursa)}</span>
      </span>
    </div>
  `;

  const renderCell = (row, key) => {
    switch (key) {
      case "nrDosar":
        return renderNrDosar(row);
      case "decizia": {
        const decision = workplaceDb.decisions[row.decizia];
        return renderTag(decision?.label, decision?.tone);
      }
      case "status": {
        const status = workplaceDb.statuses[row.status];
        return renderTag(status?.label, status?.tone);
      }
      case "alerte":
        return renderAlerts(row.alerte);
      case "solicitant":
        return escapeHtml(row.numeSolicitant);
      case "dataDepunerii":
        return escapeHtml(formatDate(row.dataDepunerii));
      case "termenExaminare":
        return renderTermen(row);
      case "dataSemnarii":
        return escapeHtml(formatDate(row.dataSemnarii));
      case "actBaza":
        return `
          <span class="e-permits-workplace__act-base">
            ${renderCopyCode(row.actBaza?.nr, `Copiază ${row.actBaza?.nr || ""}`)}
            <span>${escapeHtml(row.actBaza?.denumire || "—")}</span>
          </span>
        `;
      case "titular":
        return escapeHtml(row.actBaza?.titular || "—");
      case "initiatDe":
        return escapeHtml(row.initiatDe?.nume || "—");
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderServiceGroupRow = (label, colSpan) => `
    <tr class="e-permits-workplace__group-row" data-workplace-group="${escapeHtml(label)}">
      <td colspan="${colSpan}">
        <div class="e-permits-workplace__group-header">
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-page-text"></use>
          </svg>
          <span>${escapeHtml(label)}</span>
        </div>
      </td>
    </tr>
  `;

  const renderDataRow = (row, columns, columnWidths) => `
    <tr data-workplace-row="${escapeHtml(row.id)}">
      <td class="e-permits-workplace__select-cell">
        <label class="e-permits-workplace__checkbox-control">
          <input type="checkbox" data-workplace-select-row="${escapeHtml(row.id)}" ${workplaceState.selected.has(row.id) ? "checked" : ""}>
          <span class="e-permits-workplace__checkbox" aria-hidden="true"></span>
        </label>
      </td>
      ${columns.map((key) => {
        const column = workplaceDb.columns[key];
        return `<td style="${setColumnWidth(column, columnWidths[key])}" data-column="${escapeHtml(key)}">${renderCell(row, key)}</td>`;
      }).join("")}
      <td class="e-permits-workplace__actions-cell">
        <button class="e-permits-workplace__row-action" type="button" aria-label="Mai multe pentru ${escapeHtml(row.nrDosar)}">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-more-vertical"></use></svg>
        </button>
      </td>
    </tr>
  `;

  const renderTableRows = (rows, columns, view, columnWidths) => {
    if (!workplaceRows) {
      return;
    }

    if (!rows.length) {
      const colSpan = columns.length + 2;
      workplaceRows.innerHTML = `
        <tr>
          <td class="e-permits-workplace__empty" colspan="${colSpan}">Nu sunt dosare pentru filtrul curent.</td>
        </tr>
      `;
      return;
    }

    if (!view?.groupBy) {
      workplaceRows.innerHTML = rows.map((row) => renderDataRow(row, columns, columnWidths)).join("");
      return;
    }

    let previousGroup = "";
    const colSpan = columns.length + 2;

    workplaceRows.innerHTML = rows.map((row) => {
      const group = row[view.groupBy] || "Fără serviciu";
      const header = group !== previousGroup ? renderServiceGroupRow(group, colSpan) : "";
      previousGroup = group;

      return `${header}${renderDataRow(row, columns, columnWidths)}`;
    }).join("");
  };

  const renderWorkplaceTabs = (view) => {
    if (!workplaceTabs) {
      return;
    }

    const tabs = view?.tabs || [];

    if (!tabs.length) {
      workplaceTabs.hidden = true;
      workplaceTabs.innerHTML = "";
      return;
    }

    const baseRows = getBaseRows(view);
    const activeTab = getActiveTab(view);

    workplaceTabs.hidden = false;
    workplaceTabs.innerHTML = tabs.map((tab) => {
      if (tab.divider) {
        return '<span class="e-permits-workplace__status-divider" aria-hidden="true"></span>';
      }

      const computedCount = baseRows.filter((row) => filterByToken(row, tab.filter)).length;
      const count = Number.isFinite(tab.displayCount) ? tab.displayCount : computedCount;
      const isActive = activeTab?.id === tab.id;

      return `
        <button class="e-permits-workplace__status-tab${isActive ? " is-active" : ""}${tab.tone ? ` e-permits-workplace__status-tab--${escapeHtml(tab.tone)}` : ""}" type="button" role="tab" data-workplace-tab="${escapeHtml(tab.id)}" aria-selected="${isActive ? "true" : "false"}">
          <span class="e-permits-workplace__status-label">${escapeHtml(tab.label)}</span>
          <span class="e-permits-workplace__status-count">${count}</span>
        </button>
      `;
    }).join("");
  };

  const renderPagination = (totalRows, firstRow, lastRow) => {
    if (!workplacePagination) {
      return;
    }

    const pages = Math.max(1, Math.ceil(totalRows / workplaceState.pageSize));
    workplaceState.page = Math.min(workplaceState.page, pages);
    const pageButtons = Array.from({ length: Math.min(pages, 5) }, (_, index) => index + 1);
    const rowOptions = workplacePageSizeOptions.map((option) => (
      `<option value="${option}"${option === workplaceState.pageSize ? " selected" : ""}>${option}</option>`
    )).join("");

    workplacePagination.innerHTML = `
      <div class="e-permits-workplace__pagination-summary">
        <span data-workplace-range>Showing ${firstRow} to ${lastRow} of ${totalRows} results</span>
        <label class="e-permits-workplace__rows-control">
          <span>Rows per page:</span>
          <span class="e-permits-workplace__rows-select">
            <select data-workplace-page-size aria-label="Rows per page">${rowOptions}</select>
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </span>
        </label>
      </div>
      <div class="e-permits-workplace__pagination-pages" aria-label="Pagination">
        <button class="e-permits-workplace__pagination-action" type="button" data-workplace-page="prev" ${workplaceState.page <= 1 ? "disabled" : ""}>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-chevron-left-small"></use>
          </svg>
          <span>Previous</span>
        </button>
        <span class="e-permits-workplace__pagination-list">
          ${pageButtons.map((page) => `<button class="e-permits-workplace__pagination-item${page === workplaceState.page ? " is-active" : ""}" type="button" data-workplace-page="${page}" aria-current="${page === workplaceState.page ? "page" : "false"}">${page}</button>`).join("")}
        </span>
        <button class="e-permits-workplace__pagination-action" type="button" data-workplace-page="next" ${workplaceState.page >= pages ? "disabled" : ""}>
          <span>Next</span>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-chevron-right-small"></use>
          </svg>
        </button>
      </div>
    `;
  };

  const syncSelectAll = (rows) => {
    const selectAll = document.querySelector("[data-workplace-select-all]");

    if (!selectAll) {
      return;
    }

    const visibleIds = rows.map((row) => row.id);
    const selectedCount = visibleIds.filter((id) => workplaceState.selected.has(id)).length;

    selectAll.checked = selectedCount > 0 && selectedCount === visibleIds.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleIds.length;
  };

  const renderWorkplace = () => {
    if (!workplaceDb || !workplaceTable) {
      return;
    }

    const view = getView();
    const activeTab = getActiveTab(view);

    if (!view) {
      return;
    }

    if (workplaceTitle) {
      workplaceTitle.textContent = view.title;
    }

    if (workplaceFieldCount) {
      workplaceFieldCount.innerHTML = `<strong>${workplaceDb.fieldCount || view.columns.length}</strong> câmpuri`;
    }

    const filteredRows = getVisibleRows();
    const columnWidths = getColumnWidths(view.columns, filteredRows);
    const tableWidth = view.columns.reduce((sum, key) => sum + columnWidths[key], selectColumnWidth + actionsColumnWidth);

    workplaceTable.style.width = `${tableWidth}px`;

    renderWorkplaceTabs(view);
    renderTableHead(view.columns, columnWidths);

    const startIndex = (workplaceState.page - 1) * workplaceState.pageSize;
    const visibleRows = filteredRows.slice(startIndex, startIndex + workplaceState.pageSize);

    if (workplaceTotal) {
      workplaceTotal.textContent = String(filteredRows.length);
    }

    const first = filteredRows.length ? startIndex + 1 : 0;
    const last = Math.min(startIndex + visibleRows.length, filteredRows.length);

    renderTableRows(visibleRows, view.columns, view, columnWidths);
    renderPagination(filteredRows.length, first, last);
    syncSelectAll(visibleRows);

    const activeLabel = activeTab ? `, ${activeTab.label}` : "";
    workplaceTable.setAttribute("aria-label", `${view.title}${activeLabel}`);
  };

  const setWorkplaceView = (viewKey) => {
    const view = getView(viewKey);

    if (!view) {
      return;
    }

    workplaceState.viewKey = viewKey;
    workplaceState.tabKey = view.defaultTab || (view.tabs || []).find((tab) => !tab.divider)?.id || null;
    workplaceState.page = 1;
    if (!view.columns.includes(workplaceState.sortKey)) {
      workplaceState.sortKey = view.columns.includes("dataDepunerii") ? "dataDepunerii" : null;
      workplaceState.sortDirection = "desc";
    }
    workplaceState.selected.clear();

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    workplaceLinks.forEach((link) => {
      const isActive = link.dataset.workplaceView === viewKey;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    renderWorkplace();
  };

  const initWorkplace = async () => {
    if (!workplacePanel) {
      return;
    }

    try {
      const response = await fetch("data/e-permits-workplace.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Cannot load workplace DB: ${response.status}`);
      }

      workplaceDb = await response.json();
      workplaceState.rows = buildDosare(workplaceDb);
    } catch (error) {
      console.warn(error);
      workplaceRows.innerHTML = `
        <tr>
          <td class="e-permits-workplace__empty" colspan="12">Nu am putut încărca baza locală de dosare.</td>
        </tr>
      `;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const linkedView = params.get("workplace");

    setWorkplaceView(
      linkedView && workplaceDb.views?.[linkedView]
        ? linkedView
        : document.querySelector("[data-workplace-view].is-active")?.dataset.workplaceView || "mine"
    );
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

      if (item.dataset.workplaceView) {
        setWorkplaceView(item.dataset.workplaceView);
      }

      if (item.dataset.shellView === "permits-profile") {
        if (workplacePanel) {
          workplacePanel.hidden = true;
        }

        if (permitsProfilePanel) {
          permitsProfilePanel.hidden = false;
        }
      }
    });
  });

  if (workplaceSearch) {
    workplaceSearch.addEventListener("input", () => {
      workplaceState.query = workplaceSearch.value;
      workplaceState.page = 1;
      workplaceState.selected.clear();
      renderWorkplace();
    });
  }

  if (workplaceTabs) {
    workplaceTabs.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-workplace-tab]");

      if (!tab) {
        return;
      }

      workplaceState.tabKey = tab.dataset.workplaceTab;
      workplaceState.page = 1;
      workplaceState.selected.clear();
      renderWorkplace();
    });
  }

  if (workplaceTable) {
    workplaceTable.addEventListener("click", (event) => {
      const sortButton = event.target.closest("[data-workplace-sort]");

      if (!sortButton) {
        return;
      }

      const key = sortButton.dataset.workplaceSort;
      const column = workplaceDb?.columns?.[key];

      if (!column?.sortable) {
        return;
      }

      if (workplaceState.sortKey === key) {
        workplaceState.sortDirection = workplaceState.sortDirection === "asc" ? "desc" : "asc";
      } else {
        workplaceState.sortKey = key;
        workplaceState.sortDirection = "desc";
      }

      workplaceState.page = 1;
      renderWorkplace();
    });
  }

  if (workplacePagination) {
    workplacePagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-workplace-page]");

      if (!button || button.disabled) {
        return;
      }

      const filteredRows = getVisibleRows();
      const pages = Math.max(1, Math.ceil(filteredRows.length / workplaceState.pageSize));
      const value = button.dataset.workplacePage;

      if (value === "prev") {
        workplaceState.page = Math.max(1, workplaceState.page - 1);
      } else if (value === "next") {
        workplaceState.page = Math.min(pages, workplaceState.page + 1);
      } else {
        workplaceState.page = Number(value);
      }

      renderWorkplace();
    });

    workplacePagination.addEventListener("change", (event) => {
      const select = event.target.closest("[data-workplace-page-size]");

      if (!select) {
        return;
      }

      const nextSize = Number(select.value);

      if (!workplacePageSizeOptions.includes(nextSize)) {
        return;
      }

      workplaceState.pageSize = nextSize;
      workplaceState.page = 1;
      renderWorkplace();
    });
  }

  if (workplacePanel) {
    workplacePanel.addEventListener("change", (event) => {
      const selectAll = event.target.closest("[data-workplace-select-all]");
      const rowCheckbox = event.target.closest("[data-workplace-select-row]");

      if (selectAll) {
        const visibleRows = getVisibleRows().slice(
          (workplaceState.page - 1) * workplaceState.pageSize,
          workplaceState.page * workplaceState.pageSize
        );

        visibleRows.forEach((row) => {
          if (selectAll.checked) {
            workplaceState.selected.add(row.id);
          } else {
            workplaceState.selected.delete(row.id);
          }
        });

        renderWorkplace();
      }

      if (rowCheckbox) {
        if (rowCheckbox.checked) {
          workplaceState.selected.add(rowCheckbox.dataset.workplaceSelectRow);
        } else {
          workplaceState.selected.delete(rowCheckbox.dataset.workplaceSelectRow);
        }

        syncSelectAll(getVisibleRows().slice(
          (workplaceState.page - 1) * workplaceState.pageSize,
          workplaceState.page * workplaceState.pageSize
        ));
      }
    });

    workplacePanel.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-shell-copy-value]");

      if (!copyButton) {
        return;
      }

      event.preventDefault();
      const value = copyButton.dataset.shellCopyValue || "";

      try {
        await navigator.clipboard.writeText(value);
      } catch (error) {
        console.warn(error);
      }

      copyButton.classList.add("is-copied");
      const tooltip = copyButton.querySelector(".e-permits-workplace__copy-tooltip");

      if (tooltip) {
        tooltip.textContent = "Copiat";
      }

      window.setTimeout(() => {
        copyButton.classList.remove("is-copied");

        if (tooltip) {
          tooltip.textContent = "Copiază";
        }
      }, 1300);
    });
  }

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
  initWorkplace();
  syncExpandedState();
});
