/* Constructor grilă — the full-screen editable-grid builder of the Form Designer (gb-v1, 2026-11-20).
   User decision 2026-11-20: the editable grid gets its own builder, like a new tab — only the grid, no other
   form inputs. Research: separate focused editor (Power Apps / Nutrient), the canvas = the real table, nested
   levels = drill-in with a breadcrumb (never modal-on-modal), visible type icons, name + type + options together,
   preview as the applicant sees it. Figma reference (layout only): GEAP 2.0 „BO → Editable Grid” 3182:63897.
   components.md › „Constructor grilă”.

   NOTHING here is a second copy of the Form Designer: the model, the actions (addChild / moveChild / deleteChild /
   duplicateChild, the typed „+ Coloană” menu), the validation, the properties panel (the builder's own panel
   element is MOVED into this view while it is open — its listeners travel with it) and the FO renderer
   (window.GEAPFoRepeat.gridHtml + sampleRows, window.GEAPFormRender) all come from js/form-builder.js through
   window.GEAPFormBuilder.internals. Edits apply to the form draft live; „Gata” returns to the form with a
   toast whose „Anulează” restores the form as it was when the builder opened.

   Layout = the Form Designer's own frame (.e-permits-builder__topbar / __workspace / __library / __inspector):
     topbar   back chevron (one level up / to the form) · breadcrumb „Formular › Grilă ›” running into the grid
              name + key tag · Editare / Previzualizare · errors of this grid (the builder's errors button) · Gata
     left     column types with icons: Coloane simple · Coloane complexe (locked with the reason until one simple
              column — US-34 AC-06; nested grid / sub-form locked at level 3 — US-38) · Copie a unui câmp din
              formular; click = append, drag onto the header row = insert there. A sub-form level lists field types.
     centre   the live table (the FO grid, two inert sample rows) whose header cells are the columns: type icon +
              name + required star, width = Îngustă / Medie / Lată units; click = select, drag / Alt + ← → =
              reorder, Delete = remove (toast „Anulează”), red dot = errors; „+ Coloană” ends the header row. A
              nested grid / sub-form column opens one level deeper (chevron on its header, button in the panel).
              A sub-form level = a form-layout canvas (2 columns, gap 24, wide fields span both).
     right    the column's properties (the builder's panel); nothing selected = the grid's own settings.
   Previzualizare: the FO grid bound, with demo rows, Desktop / Telefon (375 → cards). */
(function () {
  let I = null;
  let root = null;
  const refs = {};
  const gb = { open: false, stack: [], mode: "edit", device: "desktop", snapshot: "", topId: "", drag: null, home: null, lastSel: "" };
  const DRILL_ICON = "icon-chevron-right";

  const isDemo = () => Boolean(document.documentElement.dataset.demoLink);
  const current = () => (gb.stack.length ? I.fieldOrChild(gb.stack[gb.stack.length - 1]) : null);
  const kindOf = (id) => (I.findField(id) ? "field" : "child");
  const typeLabel = (type) => (type === "grid" ? "Grilă imbricată" : I.comp(type).label);
  const typeDesc = (type, level) => {
    if (type === "grid") return level < I.MAX_GRID_LEVEL ? `Tabel în rândul grilei (nivelul ${level + 1})` : "Tabel în rândul grilei";
    if (type === "subform") return "Câmpuri în detaliul rândului";
    return I.comp(type).desc;
  };
  const containerNoun = (item) => (item.type === "subform" ? "sub-formularul" : I.findChild(item.id) ? "sub-grila" : "grila");
  const issuesOfTop = () => {
    const top = I.fieldOrChild(gb.topId);
    if (!top) return [];
    const kids = new Set(collect(top).map((child) => child.id));
    return I.state.issues.filter((issue) => issue.level === "error" && ((issue.kind === "child" && kids.has(issue.id)) || (issue.kind === "field" && issue.id === gb.topId)));
  };
  /* every descendant of a container (columns, nested columns, sub-form fields) */
  const collect = (container) => I.kidsOf(container).flatMap((child) => [child, ...(I.isNest(child) ? collect(child) : [])]);
  const columnIssue = (child) => I.errorsOf("child", child.id)[0] || (I.isNest(child) ? I.childErrorsOf(child)[0] : null) || null;

  /* ------------------------------------------------------------------ frame */
  function shellHtml() {
    return `
      <header class="e-permits-builder__topbar e-permits-gridb__topbar">
        <div class="e-permits-builder__nav-left e-permits-gridb__nav" data-gb-head></div>
        <div class="e-permits-builder__mode" role="tablist" aria-label="Modul constructorului grilei" data-gb-modes>
          <button type="button" role="tab" data-gb-mode="edit">${I.icon("icon-edit")}<span>Editare</span></button>
          <button type="button" role="tab" data-gb-mode="preview">${I.icon("icon-eye-open")}<span>Previzualizare</span></button>
        </div>
        <div class="e-permits-builder__nav-actions">
          <div class="e-permits-stack__menu-wrap e-permits-builder__issues">
            <button class="btn btn-sm btn-outline-destructive e-permits-builder__errors" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="gb-issues-menu" data-stack-menu-trigger data-gb-errors>
              <span aria-hidden="true"><i></i></span>
              <strong data-gb-errors-label>Fără erori</strong>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-builder__issues-menu" id="gb-issues-menu" role="menu" aria-label="Probleme în grilă" hidden data-stack-menu data-gb-issues-menu></ul>
          </div>
          <button class="btn btn-primary btn-md btn-rounded" type="button" data-gb-done>Gata</button>
        </div>
      </header>
      <div class="e-permits-builder__workspace e-permits-gridb__workspace">
        <aside class="e-permits-builder__library e-permits-gridb__library" aria-labelledby="gb-library-title">
          <div class="e-permits-builder__panel-head"><h2 id="gb-library-title" data-gb-library-title>Tipuri de coloane</h2></div>
          <div class="e-permits-builder__library-list" data-gb-library></div>
        </aside>
        <section class="e-permits-gridb__stage" aria-label="Spațiul grilei" data-gb-stage>
          <div class="e-permits-gridb__scroll" data-gb-scroll>
            <div class="e-permits-gridb__canvas" data-gb-canvas></div>
          </div>
        </section>
        <aside class="e-permits-builder__inspector e-permits-gridb__inspector" aria-label="Proprietăți" data-gb-inspector></aside>
      </div>
      <p class="u-visually-hidden" id="gb-col-hint">Enter selectează coloana, Alt + săgeată stânga sau dreapta o mută, Delete o șterge.</p>
      <p class="u-visually-hidden" id="gb-field-hint">Enter selectează câmpul, Alt + săgeată sus sau jos îl mută, Delete îl șterge.</p>`;
  }

  /* ------------------------------------------------------------------ topbar */
  function headHtml(cur) {
    const crumbs = [{ label: "Formular", button: true, attr: 'data-gb-crumb="-1"' }, ...gb.stack.slice(0, -1).map((id, index) => ({ label: I.fieldName(I.fieldOrChild(id)), button: true, attr: `data-gb-crumb="${index}"` }))];
    const parent = gb.stack.length > 1 ? `${containerNoun(I.fieldOrChild(gb.stack[gb.stack.length - 2]))} „${I.fieldName(I.fieldOrChild(gb.stack[gb.stack.length - 2]))}”` : "formular";
    const back = `Înapoi la ${parent}`;
    return `
      <button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-topbar-back" type="button" aria-label="${I.esc(back)}" data-tooltip-text="${I.esc(back)}" data-gb-back>${I.icon("icon-chevron-left")}</button>
      <div class="e-permits-gridb__heading">
        ${I.ui().renderBreadcrumbs?.(crumbs, { trailing: true, label: "Locul grilei", mobile: false }) || ""}
        <div class="e-permits-gridb__title-row">
          <h2 id="gb-title" tabindex="-1" data-cell-tooltip>${I.esc(I.fieldName(cur))}</h2>
          ${I.ui().renderTag?.(cur.key || "fără cheie", "neutral") || ""}
        </div>
      </div>`;
  }

  function renderIssues() {
    const errors = issuesOfTop();
    const n = errors.length;
    refs.errors.classList.toggle("is-clean", n === 0);
    refs.errors.classList.toggle("btn-outline-destructive", n > 0);
    refs.errorsLabel.textContent = n ? `${n} ${n === 1 ? "eroare" : "erori"}` : "Fără erori";
    refs.errors.setAttribute("aria-label", n ? `${n} ${n === 1 ? "eroare" : "erori"} în grilă — vezi lista` : "Fără erori în grilă");
    refs.issuesMenu.innerHTML = n
      ? `<li role="none" class="e-permits-builder__issues-head">${n} ${n === 1 ? "eroare în grilă" : "erori în grilă"}</li>${errors.map((issue) => `
        <li role="none">
          <button class="e-permits-fo-intent-menu__item e-permits-builder__issue" type="button" role="menuitem" data-gb-issue="${issue.kind}" data-id="${issue.id}" data-tab="${issue.tab}">
            ${I.icon("icon-circle-error-filled")}
            <span class="e-permits-builder__issue-text">
              <strong>${I.esc(issue.name)}</strong>
              <span>${I.esc(issue.message)}</span>
              <span class="e-permits-builder__issue-where">${I.esc(I.TAB_LABELS[issue.tab] || "")}</span>
            </span>
          </button>
        </li>`).join("")}`
      : '<li role="none" class="e-permits-builder__issues-head">Fără erori în grilă</li>';
  }

  /* ------------------------------------------------------------------ left: types */
  function itemHtml({ type, from = null, reason = "", level }) {
    const meta = I.comp(type);
    const label = from ? I.fieldName(from) : typeLabel(type);
    const desc = from ? `${meta.label} · ${from.key}` : typeDesc(type, level);
    const hook = from ? `data-gb-from="${from.id}"` : `data-gb-type="${type}"`;
    return `
      <button class="e-permits-builder__library-item${reason ? " is-disabled" : ""}" type="button"${reason ? ` aria-disabled="true" data-tooltip-reason="${I.esc(reason)}"` : ' draggable="true"'} ${hook}>
        <span>${I.icon(meta.icon)}</span>
        <strong>${I.esc(label)}</strong>
        <em data-cell-tooltip>${I.esc(desc)}</em>
      </button>`;
  }
  function section(id, title, body, note = "") {
    return `
      <section class="e-permits-builder__library-section" aria-labelledby="gb-lib-${id}">
        <h3 id="gb-lib-${id}">${I.esc(title)}</h3>
        ${note ? `<div class="e-permits-gridb__lib-note">${I.ui().renderInfoNote?.(I.esc(note)) || ""}</div>` : ""}
        ${body}
      </section>`;
  }
  function renderLibrary(cur) {
    const level = I.levelOf(cur);
    const sub = cur.type === "subform";
    refs.libraryTitle.textContent = sub ? "Tipuri de câmpuri" : "Tipuri de coloane";
    refs.library.closest("aside").setAttribute("aria-label", refs.libraryTitle.textContent);
    const item = (type) => itemHtml({ type, reason: I.childAllowed(cur, type), level });
    const copies = I.allFields().map(({ field }) => field).filter((field) => !I.isContainer(field) && !I.childAllowed(cur, field.type));
    const copyBlock = copies.length ? section("copy", "Copie a unui câmp din formular", copies.map((field) => itemHtml({ type: field.type, from: field, level })).join("")) : "";
    if (sub) {
      refs.library.innerHTML = `${section("fields", "Câmpuri", I.BLOCK_TYPES.map(item).join(""))}${copyBlock}`;
      return;
    }
    const lockedReason = I.COLUMN_COMPLEX.map((type) => I.childAllowed(cur, type)).find(Boolean) || "";
    refs.library.innerHTML = `
      ${section("simple", "Coloane simple", [...I.COLUMN_SIMPLE, "datetime"].map(item).join(""))}
      ${section("complex", "Coloane complexe", I.COLUMN_COMPLEX.map(item).join(""), lockedReason)}
      ${copyBlock}`;
  }

  /* ------------------------------------------------------------------ centre: the live table */
  /* „+ Coloană” / „Adaugă câmp”: the builder's typed menu (fixed, so no table / scroll box cuts it); `detached` =
     the menu is written after the table (a pinned header cell is a stacking context that would cover it) */
  const addMenuId = (cur) => `fb-addchild-${cur.id}-gb`;
  const addMenuListHtml = (cur) => I.addChildMenuHtml(cur, "gb").replace(" hidden data-stack-menu>", ' hidden data-stack-menu data-stack-menu-fixed data-stack-menu-align="start">');
  function addMenuHtml(cur, label, cls = "btn btn-secondary btn-sm", { detached = false } = {}) {
    return `
      <div class="e-permits-stack__menu-wrap e-permits-gridb__add">
        <button class="${cls}" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${addMenuId(cur)}" data-stack-menu-trigger data-gb-add>${I.icon("icon-plus-small", 16)}<span>${I.esc(label)}</span></button>
        ${detached ? "" : addMenuListHtml(cur)}
      </div>`;
  }
  function headCellHtml(cur, child, weight) {
    const sel = I.state.sel;
    const on = sel.kind === "child" && sel.id === child.id;
    const issue = columnIssue(child);
    const name = I.fieldName(child);
    const nest = I.isNest(child);
    return `
      <th class="table__head-cell e-permits-gridb__th${on ? " is-selected" : ""}${issue ? " has-issue" : ""}" role="columnheader" scope="col" data-gb-th="${child.id}" data-gb-units="${weight}">
        <div class="e-permits-gridb__th-inner">
          <button class="e-permits-gridb__col" type="button" draggable="true" data-gb-col="${child.id}" aria-pressed="${on}" aria-describedby="gb-col-hint" aria-label="${I.esc(`${typeLabel(child.type)}: ${name}${child.required ? ", obligatoriu" : ""}${issue ? `, eroare: ${issue.message}` : ""}`)}">
            ${I.icon(I.comp(child.type).icon, 16)}
            <span class="e-permits-gridb__col-name" data-cell-tooltip>${I.esc(name)}</span>
            ${child.required ? I.requiredMark() : ""}
          </button>
          ${issue ? `<span class="e-permits-gridb__col-issue" data-tooltip-text="${I.esc(issue.message)}"><span class="e-permits-ntpl-dot e-permits-tariff__tab-error"></span></span>` : ""}
          ${nest ? `<button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-gridb__drill" type="button" aria-label="${I.esc(`Deschide ${child.type === "subform" ? "sub-formularul" : "sub-grila"} „${name}”`)}" data-tooltip-text="Deschide" data-gb-drill="${child.id}">${I.icon(DRILL_ICON, 16)}</button>` : ""}
        </div>
      </th>`;
  }
  function drawGrid(host, cur) {
    const kids = I.kidsOf(cur);
    if (!kids.length) {
      host.innerHTML = `<div class="e-permits-gridb__empty" data-gb-drop-empty>${window.GEAPEmptyState?.render({
        title: "Adaugă prima coloană",
        text: "Alege un tip din stânga sau trage-l aici. Coloanele complexe vin după o coloană simplă.",
        icon: "dot-grid",
        actionHtml: addMenuHtml(cur, "Coloană"),
      }) || ""}</div>`;
      return;
    }
    const def = I.gridFo(cur, { prefix: "gbc", lang: "ro" }, I.levelOf(cur));
    def.value = window.GEAPFoRepeat?.sampleRows?.(def, 2) || [];
    host.innerHTML = `<div class="e-permits-gridb__sheet" data-gb-sheet>${window.GEAPFoRepeat?.gridHtml(def) || ""}</div>`;
    const grid = host.querySelector(".e-permits-fo-grid");
    const table = grid?.querySelector(".e-permits-fo-grid__table");
    if (!table) return;
    grid.classList.add("e-permits-gridb__grid");
    /* the FO header tells each column's units (colspan); the builder header replaces it */
    const weights = [...table.tHead.querySelectorAll("th")].slice(1, -1).map((th) => Number(th.getAttribute("colspan")) || 1);
    table.tHead.outerHTML = `
      <thead role="rowgroup">
        <tr class="table__row" role="row">
          <th class="table__head-cell e-permits-fo-grid__index" role="columnheader" scope="col">Nr.</th>
          ${kids.map((child, i) => headCellHtml(cur, child, weights[i] || 1)).join("")}
          <th class="table__head-cell e-permits-fo-grid__actions e-permits-gridb__th-add" role="columnheader" scope="col">${addMenuHtml(cur, "Coloană", undefined, { detached: true })}</th>
        </tr>
      </thead>`;
    /* one table column per grid column, its width from the units (no colspans: the pinned „+ Coloană” column and
       js/table-pin-shadow.js need one cell per column) */
    table.insertAdjacentHTML("afterbegin", `<colgroup><col class="e-permits-gridb__unit-index">${weights.map((w) => `<col class="e-permits-gridb__unit e-permits-gridb__unit--${w}">`).join("")}<col class="e-permits-gridb__unit-actions"></colgroup>`);
    table.tBodies[0]?.querySelectorAll("td[colspan]").forEach((td) => td.removeAttribute("colspan"));
    /* the sample rows, the add button and the label are what the applicant sees — inert here */
    [table.tBodies[0], grid.querySelector(":scope > .e-permits-fo-grid__foot")].forEach((node) => { if (node) node.inert = true; });
    grid.querySelector(":scope > .e-permits-fo-grid__frame")?.insertAdjacentHTML("beforeend", '<span class="e-permits-gridb__drop" hidden data-gb-indicator></span>');
    host.querySelector("[data-gb-sheet]").insertAdjacentHTML("beforeend", addMenuListHtml(cur));
  }

  /* a sub-form level: its fields on the FO form layout (2 columns, gap 24; ≤ 6/12 = one column, wider = both) */
  function drawForm(host, cur) {
    const kids = I.kidsOf(cur);
    const sel = I.state.sel;
    const cards = kids.map((child) => {
      const on = sel.kind === "child" && sel.id === child.id;
      const issue = I.errorsOf("child", child.id)[0];
      const wide = Number(child.span) > 6;
      return `
        <article class="e-permits-builder__field e-permits-gridb__field${on ? " is-selected" : ""}${issue ? " has-issue" : ""}" tabindex="0" draggable="true" data-gb-field="${child.id}" data-gb-span="${wide ? 2 : 1}" aria-describedby="gb-field-hint" aria-label="${I.esc(`${I.comp(child.type).label}: ${I.fieldName(child)}${child.required ? ", obligatoriu" : ""}${issue ? `, eroare: ${issue.message}` : ""}`)}">
          <div class="e-permits-builder__field-tools">
            <div class="e-permits-builder__field-meta">
              <span class="e-permits-builder__drag-grip" aria-hidden="true">${I.icon("icon-drag", 16)}</span>
              <em class="e-permits-builder__tag e-permits-builder__tag--strong" data-cell-tooltip>${I.esc(I.comp(child.type).label)}</em>
            </div>
            ${issue ? `<span class="e-permits-gridb__col-issue" data-tooltip-text="${I.esc(issue.message)}"><span class="e-permits-ntpl-dot e-permits-tariff__tab-error"></span></span>` : ""}
          </div>
          <div class="e-permits-builder__field-render" inert>${I.foHtml(child, { prefix: "gbf", inCard: true })}</div>
        </article>`;
    }).join("");
    const empty = kids.length ? "" : `<div class="e-permits-gridb__form-empty" data-gb-drop-empty>${window.GEAPEmptyState?.render({ title: "Adaugă primul câmp", text: "Alege un tip din stânga sau trage-l aici. Câmpurile se deschid sub rând, în detaliul lui.", icon: "page-child", compact: true, bare: true }) || ""}</div>`;
    host.innerHTML = `
      <div class="e-permits-gridb__sheet e-permits-gridb__sheet--form" data-gb-sheet>
        <div class="e-permits-gridb__form-head">
          <div class="e-permits-fo-grid__label">${I.esc(I.fieldName(cur))} · Rând 1</div>
          ${I.tr(cur.help) ? `<p class="e-permits-fo-field__hint">${I.esc(I.tr(cur.help))}</p>` : ""}
        </div>
        <div class="e-permits-gridb__form" data-gb-form>
          ${cards}${empty}
          ${addMenuHtml(cur, "Adaugă câmp", "btn btn-secondary btn-sm")}
          <span class="e-permits-gridb__drop e-permits-gridb__drop--form" hidden data-gb-indicator></span>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ centre: Previzualizare */
  function drawPreview(host, cur) {
    const phone = gb.device === "phone";
    const level = I.levelOf(cur);
    const body = cur.type === "subform"
      ? `<div class="e-permits-fo-form__section-body e-permits-gridb__preview-form">${I.kidsOf(cur).map((child) => I.foHtml(child, { prefix: "gbp", lang: "ro" })).join("")}</div>`
      : `<div class="e-permits-fo-form__section-body">${window.GEAPFoRepeat?.gridHtml(I.gridFo(cur, { prefix: "gbp", lang: "ro" }, level)) || ""}</div>`;
    host.innerHTML = `
      <div class="e-permits-gridb__preview-bar">
        <div class="e-permits-builder__lang">
          <span class="e-permits-builder__lang-label" id="gb-device-label">Ecran</span>
          <div class="segmented-control" role="radiogroup" aria-labelledby="gb-device-label">
            ${[["desktop", "Desktop"], ["phone", "Telefon"]].map(([value, label]) => `<button class="segment-item${gb.device === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${gb.device === value}" data-gb-device="${value}">${label}</button>`).join("")}
          </div>
        </div>
        <p class="e-permits-fo-field__hint">${cur.type === "subform" ? "Câmpurile, așa cum le completează solicitantul în detaliul rândului." : "Grila, așa cum o vede solicitantul — cu două rânduri de probă."}</p>
      </div>
      <div class="e-permits-gridb__preview${phone ? " is-phone" : ""}" role="region" aria-label="${phone ? "Previzualizare pe telefon, 375 px" : "Previzualizare pe desktop"}">
        <div class="e-permits-gridb__device e-permits-fo-form" data-gb-preview>${body}</div>
      </div>`;
    const preview = host.querySelector("[data-gb-preview]");
    I.R.bind?.(preview);
    const grid = preview.querySelector("[data-fo-grid]");
    if (grid) { window.GEAPFoRepeat?.fill(grid); window.GEAPFoRepeat?.layout(preview); }
  }

  /* ------------------------------------------------------------------ render */
  const focusKey = (node) => {
    if (!node || node === document.body) return "";
    const attr = [...node.attributes].find((a) => a.name.startsWith("data-gb-") && a.name !== "data-gb-span");
    if (attr) return `[${attr.name}="${CSS.escape(attr.value)}"]`;
    if (node.getAttribute("aria-controls")) return `[aria-controls="${CSS.escape(node.getAttribute("aria-controls"))}"]`;
    return node.id ? `#${CSS.escape(node.id)}` : "";
  };
  function render() {
    const cur = current();
    if (!cur) return;
    const active = document.activeElement;
    const key = root.contains(active) && !refs.inspector.contains(active) ? focusKey(active) : "";
    const scrollTop = refs.scroll.scrollTop;
    const frameLeft = refs.canvas.querySelector(".e-permits-fo-grid__frame")?.scrollLeft || 0;
    root.dataset.gbView = gb.mode;
    root.dataset.gbLevel = cur.type;
    refs.head.innerHTML = headHtml(cur);
    root.querySelectorAll("[data-gb-mode]").forEach((button) => {
      const on = button.dataset.gbMode === gb.mode;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-selected", String(on));
    });
    renderIssues();
    renderLibrary(cur);
    if (gb.mode === "preview") drawPreview(refs.canvas, cur);
    else if (cur.type === "subform") drawForm(refs.canvas, cur);
    else drawGrid(refs.canvas, cur);
    refs.scroll.scrollTop = scrollTop;
    const frame = refs.canvas.querySelector(".e-permits-fo-grid__frame");
    if (frame) frame.scrollLeft = frameLeft;
    /* a column that just became selected (added at the end, picked from the errors / panel) is brought into view,
       clear of the pinned „+ Coloană” column; later redraws keep the reader's own scroll */
    const selKey = `${I.state.sel.kind}:${I.state.sel.id}`;
    if (selKey !== gb.lastSel) {
      gb.lastSel = selKey;
      const th = frame?.querySelector(`[data-gb-th="${CSS.escape(I.state.sel.id)}"]`);
      if (th) {
        const pin = frame.querySelector(".e-permits-gridb__th-add")?.offsetWidth || 0;
        const left = th.offsetLeft;
        const right = left + th.offsetWidth;
        if (right > frame.scrollLeft + frame.clientWidth - pin) frame.scrollLeft = right - frame.clientWidth + pin;
        else if (left < frame.scrollLeft) frame.scrollLeft = left;
      }
      refs.canvas.querySelector(`[data-gb-field="${CSS.escape(I.state.sel.id)}"]`)?.scrollIntoView({ block: "nearest" });
    }
    if (key) root.querySelector(key)?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ navigation */
  function open(id) {
    if (!I) return;
    const target = I.fieldOrChild(id);
    if (!target || !(target.type === "grid" || I.isNest(target))) return;
    const found = I.findChild(id);
    if (found && found.top.type !== "grid") return;
    gb.stack = found ? [...found.chain.map((item) => item.id), id] : [id];
    gb.topId = gb.stack[0];
    gb.snapshot = JSON.stringify(I.form);
    gb.mode = "edit";
    gb.device = "desktop";
    gb.lastSel = "";
    if (I.state.mode !== "build") I.setMode("build");
    /* the builder's panel + live region come along (their listeners with them) */
    gb.home = { panel: I.el.panel.parentElement, live: I.el.live.parentElement };
    refs.inspector.appendChild(I.el.panel);
    root.appendChild(I.el.live);
    mainParts().forEach((node) => { node.inert = true; });
    I.builder.classList.add("has-grid-builder");
    root.hidden = false;
    gb.open = true;
    const sel = I.state.sel;
    if (sel.kind === "child" && I.containerOf(sel.id) === target) I.select("child", sel.id);
    else I.select(kindOf(id), id, { tab: I.T_GEN });
    window.setTimeout(() => root.querySelector("#gb-title")?.focus({ preventScroll: true }), 0);
    I.announce(`Constructorul grilei „${I.fieldName(target)}” este deschis. Gata te întoarce la formular.`);
  }
  const mainParts = () => [I.builder.querySelector(":scope > .e-permits-builder__topbar"), I.el.workspace].filter(Boolean);

  function close() {
    if (!gb.open) return;
    const top = I.fieldOrChild(gb.topId);
    const snapshot = gb.snapshot;
    const changed = JSON.stringify(I.form) !== snapshot;
    gb.open = false;
    root.hidden = true;
    I.builder.classList.remove("has-grid-builder");
    mainParts().forEach((node) => { node.inert = false; });
    gb.home?.panel.appendChild(I.el.panel);
    gb.home?.live.appendChild(I.el.live);
    if (!top) { I.select("form"); return; }
    I.select("field", gb.topId);
    const card = I.el.canvas.querySelector(`[data-builder-field][data-id="${gb.topId}"]`);
    card?.scrollIntoView({ block: "nearest" });
    card?.focus({ preventScroll: true });
    if (!changed) { I.announce("Înapoi la formular."); return; }
    const name = I.fieldName(top);
    const topId = gb.topId;
    window.GEAPToast?.show({
      type: "success",
      message: `Ai actualizat grila „${name}”.`,
      action: {
        label: "Anulează",
        onClick: () => {
          I.revertTo(snapshot);
          if (I.findField(topId)) I.select("field", topId);
          I.announce(`Modificările grilei „${name}” au fost anulate.`);
        },
      },
      duration: isDemo() ? 0 : 8000,
      key: "gb-done",
    });
  }
  /* one level up (the drilled column stays selected in its grid) or back to the form */
  function up() {
    if (gb.stack.length <= 1) { close(); return; }
    const child = gb.stack.pop();
    I.select("child", child);
    window.setTimeout(() => root.querySelector(`[data-gb-col="${CSS.escape(child)}"]`)?.focus(), 0);
  }
  function goLevel(index) {
    if (index < 0) { close(); return; }
    const leaving = gb.stack[index + 1];
    gb.stack = gb.stack.slice(0, index + 1);
    if (leaving) I.select("child", leaving); else I.select(kindOf(gb.stack[index]), gb.stack[index]);
  }
  function drill(id) {
    const target = I.fieldOrChild(id);
    if (!gb.open || !target || !I.isNest(target) || I.containerOf(id) !== current()) return;
    gb.stack.push(id);
    gb.mode = "edit";
    I.select("child", id, { tab: I.T_GEN });
    window.setTimeout(() => root.querySelector("#gb-title")?.focus({ preventScroll: true }), 0);
    I.announce(`${target.type === "subform" ? "Sub-formularul" : "Sub-grila"} „${I.fieldName(target)}”, nivelul ${I.levelOf(target)}.`);
  }
  function setMode(mode) {
    gb.mode = mode;
    render();
    root.querySelector(`[data-gb-mode="${mode}"]`)?.focus();
  }
  const selectContainer = () => { const cur = current(); if (cur) I.select(kindOf(cur.id), cur.id); };

  /* the builder redraws after every render / commit / selection (form-builder.js gridBuilderSync) */
  function sync() {
    if (!gb.open || !I) return;
    if (!I.fieldOrChild(gb.topId)) { close(); return; }
    /* a level that no longer exists (deleted, undo) → the deepest one that does */
    while (gb.stack.length > 1 && (!I.fieldOrChild(gb.stack[gb.stack.length - 1]) || I.containerOf(gb.stack[gb.stack.length - 1]) !== I.fieldOrChild(gb.stack[gb.stack.length - 2]))) gb.stack.pop();
    /* the panel's own links can select an outer level (crumb back to a grid) → follow it */
    const at = gb.stack.indexOf(I.state.sel.id);
    if (at >= 0 && at < gb.stack.length - 1) gb.stack = gb.stack.slice(0, at + 1);
    render();
  }
  /* Esc inside the builder (called from the Form Designer's own Esc handler, after menus / pickers / dialogs) */
  function escape() {
    if (!gb.open) return false;
    if (gb.mode === "preview") { setMode("edit"); return true; }
    const sel = I.state.sel;
    if (sel.kind === "child" && I.containerOf(sel.id) === current()) {
      selectContainer();
      root.querySelector(`[data-gb-col="${CSS.escape(sel.id)}"], [data-gb-field="${CSS.escape(sel.id)}"]`)?.focus();
      I.announce("Nicio coloană selectată — setările grilei.");
      return true;
    }
    if (gb.stack.length > 1) { up(); return true; }
    return true;
  }

  /* the „Deschide” button at the top of the properties panel (grid field / nested column) */
  function entryHtml(target) {
    if (!I || !target) return "";
    if (!gb.open) {
      const found = I.findChild(target.id);
      const ok = target.type === "grid" || (found && I.isNest(target) && found.top.type === "grid");
      if (!ok) return "";
      return `<div class="e-permits-gridb__entry"><button class="btn btn-secondary btn-md" type="button" data-gb-open="${target.id}">${I.icon("icon-columns")}<span>Deschide constructorul grilei</span></button></div>`;
    }
    if (target === current() || !I.isNest(target) || I.containerOf(target.id) !== current()) return "";
    return `<div class="e-permits-gridb__entry"><button class="btn btn-secondary btn-md" type="button" data-gb-drill="${target.id}">${I.icon(DRILL_ICON)}<span>${target.type === "subform" ? "Deschide sub-formularul" : "Deschide sub-grila"}</span></button></div>`;
  }

  /* ------------------------------------------------------------------ drag and drop */
  function indicator() { return refs.canvas.querySelector("[data-gb-indicator]"); }
  function hideIndicator() {
    const node = indicator();
    if (node) node.hidden = true;
    refs.canvas.querySelectorAll(".is-drop-target").forEach((node2) => node2.classList.remove("is-drop-target"));
  }
  /* where a drop lands: the index in the current container + the indicator geometry */
  function dropAt(x, y) {
    const cur = current();
    const empty = refs.canvas.querySelector("[data-gb-drop-empty]");
    if (empty) return { index: 0, empty };
    if (cur.type === "subform") {
      const cards = [...refs.canvas.querySelectorAll("[data-gb-field]")];
      let index = cards.findIndex((card) => { const r = card.getBoundingClientRect(); return y < r.top || (y <= r.bottom && x < r.left + r.width / 2); });
      if (index < 0) index = cards.length;
      const form = refs.canvas.querySelector("[data-gb-form]");
      const box = form.getBoundingClientRect();
      const ref = cards[index] || cards[cards.length - 1];
      const r = ref ? ref.getBoundingClientRect() : box;
      const left = cards[index] ? r.left - box.left - 12 : r.right - box.left + 10;
      return { index, rect: { left, top: r.top - box.top, height: r.height } };
    }
    const ths = [...refs.canvas.querySelectorAll("[data-gb-th]")];
    let index = ths.findIndex((th) => { const r = th.getBoundingClientRect(); return x < r.left + r.width / 2; });
    if (index < 0) index = ths.length;
    const frame = refs.canvas.querySelector(".e-permits-fo-grid__frame");
    const box = frame.getBoundingClientRect();
    const ref = ths[index] || ths[ths.length - 1];
    const r = ref.getBoundingClientRect();
    const edge = ths[index] ? r.left : r.right;
    return { index, rect: { left: edge - box.left + frame.scrollLeft - 1, top: r.top - box.top, height: frame.getBoundingClientRect().bottom - r.top } };
  }
  function showDrop(target) {
    hideIndicator();
    if (target.empty) { target.empty.classList.add("is-drop-target"); return; }
    const node = indicator();
    if (!node) return;
    node.hidden = false;
    node.style.left = `${Math.round(target.rect.left)}px`;
    node.style.top = `${Math.round(target.rect.top)}px`;
    node.style.height = `${Math.round(target.rect.height)}px`;
  }
  function endDrag() {
    gb.drag = null;
    hideIndicator();
    root?.querySelectorAll(".is-dragging").forEach((node) => node.classList.remove("is-dragging"));
  }
  function drop(index) {
    const cur = current();
    const drag = gb.drag;
    endDrag();
    if (!drag || !cur) return;
    if (drag.kind === "type") I.addChild(cur.id, drag.type, index);
    else if (drag.kind === "from") { const source = I.findField(drag.id)?.field; if (source) I.addChild(cur.id, source.type, index, { from: source }); }
    else if (drag.kind === "child") {
      if (I.moveChild(drag.id, 0, index)) window.setTimeout(() => root.querySelector(`[data-gb-col="${CSS.escape(drag.id)}"], [data-gb-field="${CSS.escape(drag.id)}"]`)?.focus(), 0);
    }
  }

  /* ------------------------------------------------------------------ events */
  function bindEvents() {
    root.addEventListener("click", (event) => {
      if (refs.inspector.contains(event.target)) return;
      if (event.target.closest("[data-gb-back]")) { up(); return; }
      const crumb = event.target.closest("[data-gb-crumb]");
      if (crumb) { goLevel(Number(crumb.dataset.gbCrumb)); return; }
      if (event.target.closest("[data-gb-done]")) { close(); return; }
      const mode = event.target.closest("[data-gb-mode]");
      if (mode) { if (mode.dataset.gbMode !== gb.mode) setMode(mode.dataset.gbMode); return; }
      const device = event.target.closest("[data-gb-device]");
      if (device) { gb.device = device.dataset.gbDevice; render(); return; }
      const issue = event.target.closest("[data-gb-issue]");
      if (issue) {
        const { gbIssue: kind, id, tab } = issue.dataset;
        I.state.lang = "ro";
        gb.mode = "edit";
        if (kind === "child") {
          const found = I.findChild(id);
          if (found) gb.stack = found.chain.map((item) => item.id);
          I.select("child", id, { tab });
        } else { gb.stack = [gb.topId]; I.select("field", id, { tab }); }
        return;
      }
      if (event.target.closest("[data-gb-drill]")) return; /* the document handler */
      const type = event.target.closest("[data-gb-type]");
      if (type) {
        const reason = type.getAttribute("aria-disabled") === "true" ? type.dataset.tooltipReason : "";
        if (reason) { I.announce(reason); return; }
        I.addChild(current().id, type.dataset.gbType);
        return;
      }
      const from = event.target.closest("[data-gb-from]");
      if (from) { const source = I.findField(from.dataset.gbFrom)?.field; if (source) I.addChild(current().id, source.type, null, { from: source }); return; }
      if (I.runMenuAction(event)) return;
      if (event.target.closest("[data-stack-menu-trigger], [data-stack-menu]")) return;
      const col = event.target.closest("[data-gb-col], [data-gb-field]");
      if (col) {
        const id = col.dataset.gbCol || col.dataset.gbField;
        if (!(I.state.sel.kind === "child" && I.state.sel.id === id)) I.select("child", id);
        root.querySelector(`[data-gb-col="${CSS.escape(id)}"], [data-gb-field="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
        return;
      }
      /* an empty spot of the stage = the grid's own settings */
      if (refs.stage.contains(event.target) && !event.target.closest("button, a, input, [data-gb-sheet] .e-permits-fo-grid__frame")) {
        const cur = current();
        if (gb.mode === "edit" && !(I.state.sel.id === cur.id)) selectContainer();
      }
    });
    root.addEventListener("dblclick", (event) => {
      const col = event.target.closest("[data-gb-col], [data-gb-field]");
      const target = col ? I.fieldOrChild(col.dataset.gbCol || col.dataset.gbField) : null;
      if (target && I.isNest(target)) drill(target.id);
    });
    root.addEventListener("keydown", (event) => {
      const col = event.target.closest?.("[data-gb-col]");
      const card = event.target.matches?.("[data-gb-field]") ? event.target : null;
      const node = col || card;
      if (!node) return;
      const id = node.dataset.gbCol || node.dataset.gbField;
      const back = col ? "ArrowLeft" : "ArrowUp";
      const forward = col ? "ArrowRight" : "ArrowDown";
      const refocus = (which) => window.setTimeout(() => root.querySelector(`[data-gb-col="${CSS.escape(which)}"], [data-gb-field="${CSS.escape(which)}"]`)?.focus(), 0);
      if (event.altKey && (event.key === back || event.key === forward)) { event.preventDefault(); if (I.moveChild(id, event.key === back ? -1 : 1)) refocus(id); return; }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        I.deleteChild(id);
        const sel = I.state.sel;
        if (sel.kind === "child") refocus(sel.id); else window.setTimeout(() => root.querySelector("[data-gb-add]")?.focus(), 0);
        return;
      }
      if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); I.select("child", id); refocus(id); }
    });
    root.addEventListener("dragstart", (event) => {
      const source = event.target.closest?.("[data-gb-type], [data-gb-from], [data-gb-col], [data-gb-field]");
      if (!source || source.getAttribute("aria-disabled") === "true") return;
      if (source.dataset.gbType) gb.drag = { kind: "type", type: source.dataset.gbType };
      else if (source.dataset.gbFrom) gb.drag = { kind: "from", id: source.dataset.gbFrom };
      else gb.drag = { kind: "child", id: source.dataset.gbCol || source.dataset.gbField };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = gb.drag.kind === "child" ? "move" : "copy";
        try { event.dataTransfer.setData("text/plain", gb.drag.type || gb.drag.id); } catch { /* synthetic event */ }
      }
      (source.closest("[data-gb-th]") || source).classList.add("is-dragging");
    });
    refs.stage.addEventListener("dragover", (event) => {
      if (!gb.drag || gb.mode !== "edit") return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = gb.drag.kind === "child" ? "move" : "copy";
      showDrop(dropAt(event.clientX, event.clientY));
    });
    refs.stage.addEventListener("dragleave", (event) => { if (!refs.stage.contains(event.relatedTarget)) hideIndicator(); });
    refs.stage.addEventListener("drop", (event) => {
      if (!gb.drag) return;
      event.preventDefault();
      drop(dropAt(event.clientX, event.clientY).index);
    });
    root.addEventListener("dragend", endDrag);
    window.addEventListener("blur", () => { if (gb.drag) endDrag(); });
  }

  function attach() {
    I = window.GEAPFormBuilder?.internals;
    if (!I || root) return;
    root = document.createElement("section");
    root.className = "e-permits-gridb";
    root.hidden = true;
    root.setAttribute("aria-labelledby", "gb-title");
    root.dataset.gbRoot = "";
    root.innerHTML = shellHtml();
    I.builder.appendChild(root);
    Object.assign(refs, {
      head: root.querySelector("[data-gb-head]"),
      errors: root.querySelector("[data-gb-errors]"),
      errorsLabel: root.querySelector("[data-gb-errors-label]"),
      issuesMenu: root.querySelector("[data-gb-issues-menu]"),
      library: root.querySelector("[data-gb-library]"),
      libraryTitle: root.querySelector("[data-gb-library-title]"),
      stage: root.querySelector("[data-gb-stage]"),
      scroll: root.querySelector("[data-gb-scroll]"),
      canvas: root.querySelector("[data-gb-canvas]"),
      inspector: root.querySelector("[data-gb-inspector]"),
    });
    bindEvents();
    /* entry: „Deschide constructorul grilei” (card / panel), „Deschide sub-grila” (panel), double-click on a grid card */
    document.addEventListener("click", (event) => {
      const opener = event.target.closest?.("[data-gb-open]");
      if (opener) { open(opener.dataset.gbOpen); return; }
      const drillButton = event.target.closest?.("[data-gb-drill]");
      if (drillButton) drill(drillButton.dataset.gbDrill);
    });
    I.el.canvas.addEventListener("dblclick", (event) => {
      const chip = event.target.closest("[data-fb-child]");
      const chipTarget = chip ? I.fieldOrChild(chip.dataset.fbChild) : null;
      if (chipTarget && I.isNest(chipTarget)) { open(chipTarget.id); return; }
      const card = event.target.closest("[data-builder-field][data-type='grid']");
      if (card) open(card.dataset.id);
    });
  }

  window.GEAPGridBuilder = {
    attach, sync, escape, entryHtml, open, close, drill, up,
    isOpen: () => gb.open,
    /* for demo states and checks */
    get state() { return gb; },
    setMode: (mode) => setMode(mode),
    setDevice(device) { gb.device = device; render(); },
  };
})();
