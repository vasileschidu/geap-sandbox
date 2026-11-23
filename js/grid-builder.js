/* Fereastra de editare — the composite editing WINDOW of the Form Designer („inception”, fb-win-v1, 2026-11-23; was the
   Constructor grilă gb-v1, 2026-11-20). User decision 2026-11-23: an editable grid (+ its nested grids / sub-forms) and
   the address pattern open in a full-screen window = the SAME Form Designer in miniature (isolation mode — Illustrator /
   XD / Figma: the same tools inside, the outer form not visible, a breadcrumb to go back, Esc = up one level).
   components.md › „Fereastra de editare (grilă / sub-formular / adresă)”.

   NOTHING here is a second copy of the Form Designer: the model, the actions (addChild / moveChild / deleteChild /
   duplicateChild, the typed „+ Coloană” menu), the validation, the CARD (`childCardHtml` / `addressPartCardHtml` = the
   October-look canvas card), the width drag with the 12-column guides (`startResize`), the properties panel (the builder's
   own panel element is MOVED into this view while it is open — its listeners travel with it) and the FO renderer all come
   from js/form-builder.js through window.GEAPFormBuilder.internals. Edits apply to the form draft live (undo / redo work);
   „Gata” returns to the form with the card selected and a toast whose „Anulează” restores the form as it was at open.

   Layout = the Form Designer's own frame (.e-permits-builder__topbar / __workspace / __library / __inspector):
     topbar   back chevron (one level up / to the form) · breadcrumb „Formular › …” running into the name + key tag ·
              Editare / Previzualizare · errors of this grid / address · Gata
     left     grid / sub-form: „Bibliotecă de câmpuri” (search) filtered to the column types — Coloane simple · Coloane
              complexe (locked with the reason until one simple column — US-34 AC-06; nested grid / sub-form locked at
              level 3 — US-38) · Copie a unui câmp din formular; a sub-form level lists the field types. Click = append,
              drag = insert. Address: „Părți ascunse” (fixed parts — a hidden part is switched back on from here).
     centre   header strip „#1 <row name> · Rând de exemplu”, then ONE row as real field cards on the 12-column grid
              (gap 24): select, drag to reorder, the width handle with the guides (columns snap 3 · 4 · 6 · 12, sub-form
              fields / address parts 3 · 4 · 6 · 8 · 12), ⧉ / 🗑 (address: „Ascunde”); a dashed „+ Coloană” tile;
              under a grid „Așa arată un rând salvat” + the saved line. A nested grid / sub-form card = its chips +
              „Editează grila / sub-formularul” → the same window one level deeper.
     right    the selected column / field / part; nothing selected = the grid's (address's) own settings.
   Previzualizare: the FO grid / sub-form / address working, Desktop / Telefon (375). */
(function () {
  let I = null;
  let root = null;
  const refs = {};
  const gb = { open: false, kind: "grid", stack: [], mode: "edit", device: "desktop", snapshot: "", topId: "", drag: null, home: null, lastSel: "", query: "" };
  const isAddress = () => gb.kind === "address";

  const isDemo = () => Boolean(document.documentElement.dataset.demoLink);
  const current = () => (gb.stack.length ? I.fieldOrChild(gb.stack[gb.stack.length - 1]) : null);
  const kindOf = (id) => (I.findField(id) ? "field" : "child");
  const typeLabel = (type) => (type === "grid" ? "Grilă imbricată" : I.comp(type).label);
  const typeDesc = (type, level) => {
    if (type === "grid") return level < I.MAX_GRID_LEVEL ? `Rânduri proprii în cardul rândului (nivelul ${level + 1})` : "Rânduri proprii în cardul rândului";
    if (type === "subform") return "Câmpuri într-o secțiune a rândului";
    return I.comp(type).desc;
  };
  const containerNoun = (item) => (item.type === "address" ? "adresa" : item.type === "subform" ? "sub-formularul" : I.findChild(item.id) ? "sub-grila" : "grila");
  const issuesOfTop = () => {
    const top = I.fieldOrChild(gb.topId);
    if (!top) return [];
    const kids = new Set(collect(top).map((child) => child.id));
    return I.state.issues.filter((issue) => issue.level === "error" && ((issue.kind === "child" && kids.has(issue.id)) || (issue.kind === "field" && issue.id === gb.topId)));
  };
  /* every descendant of a container (columns, nested columns, sub-form fields) */
  const collect = (container) => I.kidsOf(container).flatMap((child) => [child, ...(I.isNest(child) ? collect(child) : [])]);

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
          <div class="e-permits-builder__panel-head">
            <h2 id="gb-library-title" data-gb-library-title>Bibliotecă de câmpuri</h2>
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill" data-gb-search-box>
              <span class="icon-search" aria-hidden="true">${I.icon("icon-search")}</span>
              <input class="input" type="search" placeholder="Caută…" aria-label="Caută în bibliotecă" autocomplete="off" data-gb-search>
              <div class="btn-group">
                <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
                <button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button>
              </div>
            </div>
          </div>
          <div class="e-permits-builder__library-list" data-gb-library></div>
        </aside>
        <section class="e-permits-gridb__stage" aria-label="Spațiul grilei" data-gb-stage>
          <div class="e-permits-gridb__scroll" data-gb-scroll>
            <div class="e-permits-gridb__canvas" data-gb-canvas></div>
          </div>
        </section>
        <aside class="e-permits-builder__inspector e-permits-gridb__inspector" aria-label="Proprietăți" data-gb-inspector></aside>
      </div>
      <p class="u-visually-hidden" id="gb-col-hint">Enter selectează, Alt + săgeată stânga sau dreapta mută, Shift + Alt + săgeată stânga sau dreapta schimbă lățimea, Ctrl + D duplică, Delete șterge.</p>
      <p class="u-visually-hidden" id="gb-part-hint">Enter selectează partea, Alt + săgeată stânga sau dreapta schimbă lățimea, Delete o ascunde.</p>`;
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
    const where = isAddress() ? "în adresă" : "în grilă";
    refs.errorsLabel.textContent = n ? `${n} ${n === 1 ? "eroare" : "erori"}` : "Fără erori";
    refs.errors.setAttribute("aria-label", n ? `${n} ${n === 1 ? "eroare" : "erori"} ${where} — vezi lista` : `Fără erori ${where}`);
    refs.issuesMenu.innerHTML = n
      ? `<li role="none" class="e-permits-builder__issues-head">${n} ${n === 1 ? "eroare" : "erori"} ${where}</li>${errors.map((issue) => `
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
      : `<li role="none" class="e-permits-builder__issues-head">Fără erori ${where}</li>`;
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
  /* the search filters the open list (types, copies, hidden parts) — like the designer's library */
  const hit = (text) => { const q = norm(gb.query); return !q || norm(text).includes(q); };
  const norm = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const noResults = () => window.GEAPEmptyState?.noResults("Nimic găsit", { compact: true, bare: true }) || "";
  function renderLibrary(cur) {
    if (isAddress()) { renderPartsLibrary(cur); return; }
    const level = I.levelOf(cur);
    const sub = cur.type === "subform";
    refs.libraryTitle.textContent = "Bibliotecă de câmpuri";
    refs.library.closest("aside").setAttribute("aria-label", sub ? "Bibliotecă de câmpuri — câmpurile sub-formularului" : "Bibliotecă de câmpuri — tipurile de coloane");
    const typeHit = (type) => hit(`${typeLabel(type)} ${typeDesc(type, level)}`);
    const item = (type) => itemHtml({ type, reason: I.childAllowed(cur, type), level });
    const copies = I.allFields().map(({ field }) => field).filter((field) => !I.isContainer(field) && !I.childAllowed(cur, field.type) && hit(`${I.fieldName(field)} ${field.key || ""}`));
    const copyBlock = copies.length ? section("copy", "Copie a unui câmp din formular", copies.map((field) => itemHtml({ type: field.type, from: field, level })).join("")) : "";
    let html;
    if (sub) {
      const types = I.BLOCK_TYPES.filter(typeHit);
      html = `${types.length ? section("fields", "Câmpuri", types.map(item).join("")) : ""}${copyBlock}`;
    } else {
      const simple = [...I.COLUMN_SIMPLE, "datetime"].filter(typeHit);
      const complex = I.COLUMN_COMPLEX.filter(typeHit);
      const lockedReason = I.COLUMN_COMPLEX.map((type) => I.childAllowed(cur, type)).find(Boolean) || "";
      html = `
        ${simple.length ? section("simple", "Coloane simple", simple.map(item).join("")) : ""}
        ${complex.length ? section("complex", "Coloane complexe", complex.map(item).join(""), lockedReason) : ""}
        ${copyBlock}`;
    }
    refs.library.innerHTML = html.trim() ? html : noResults();
  }
  /* the address window: the parts are fixed — the left column lists the HIDDEN ones; a click switches a part back on */
  const PART_ICON = { "listă": "icon-chevron-bottom", text: "icon-text-bold", "număr": "icon-hashtag" };
  function renderPartsLibrary(field) {
    refs.libraryTitle.textContent = "Părțile adresei";
    refs.library.closest("aside").setAttribute("aria-label", "Părțile adresei — părțile ascunse");
    const hidden = I.addressConfig(field).filter((part) => !part.visible);
    const shown = hidden.filter((part) => hit(`${part.label} ${part.kind}`));
    const body = shown.map((part) => `
      <button class="e-permits-builder__library-item" type="button" data-gb-show-part="${part.key}" aria-label="Afișează: ${I.esc(part.label)}">
        <span>${I.icon(PART_ICON[part.kind] || "icon-text-bold")}</span>
        <strong>${I.esc(part.label)}</strong>
        <em data-cell-tooltip>${I.esc(part.note || "Ascunsă — apasă ca s-o afișezi")}</em>
      </button>`).join("");
    refs.library.innerHTML = hidden.length
      ? (shown.length ? section("hidden", "Părți ascunse", body) : noResults())
      : section("hidden", "Părți ascunse", window.GEAPEmptyState?.render({ title: "Toate părțile sunt afișate", text: "Ascunde o parte din cardul ei sau din panoul din dreapta; o găsești apoi aici.", icon: "eye", compact: true, bare: true }) || "");
  }

  /* ------------------------------------------------------------------ centre: the row of cards */
  /* „+ Coloană” / „Adaugă câmp”: the builder's typed menu (fixed, so no scroll box cuts it), written after the grid */
  const addMenuId = (cur) => `fb-addchild-${cur.id}-gb`;
  const addMenuListHtml = (cur) => I.addChildMenuHtml(cur, "gb").replace(" hidden data-stack-menu>", ' hidden data-stack-menu data-stack-menu-fixed data-stack-menu-align="start">');
  function addMenuHtml(cur, label, cls = "btn btn-secondary btn-sm") {
    return `
      <div class="e-permits-stack__menu-wrap e-permits-gridb__add">
        <button class="${cls}" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${addMenuId(cur)}" data-stack-menu-trigger data-gb-add>${I.icon("icon-plus-small", 16)}<span>${I.esc(label)}</span></button>
        ${addMenuListHtml(cur)}
      </div>`;
  }
  /* the one-line hint above the row (only while nothing is selected): where the structure is edited, where it works */
  const previewLink = '<button class="link link-primary link-sm e-permits-gridb__hint-link" type="button" data-gb-mode="preview">Previzualizare</button>';
  const hintHtml = (what, show) => (show ? `<p class="e-permits-fo-field__hint e-permits-gridb__hint">Apasă pe ${what} ca să ${what === "o coloană" || what === "o parte" ? "o" : "îl"} configurezi; trage marginea din dreapta ca să-i schimbi lățimea. Încearcă formularul în ${previewLink}.</p>` : "");
  /* header strip above the row: „#1 <row name> · Rând de exemplu” (a sub-form: „#1 <row name> › <sub-form>”) */
  function stripHtml(index, name, label) {
    return `
      <div class="e-permits-gridb__strip">
        ${index ? `<span class="e-permits-fo-doc-card__index">${I.esc(index)}</span>` : ""}
        <span class="e-permits-gridb__strip-name" data-cell-tooltip>${I.esc(name)}</span>
        <span class="e-permits-gridb__sample-label">· ${I.esc(label)}</span>
      </div>`;
  }
  const rowNameOf = (grid) => I.tr(grid?.rowTitle) || "Rând";
  function drawCards(host, cur) {
    const kids = I.kidsOf(cur);
    const sub = cur.type === "subform";
    if (!kids.length) {
      host.innerHTML = `<div class="e-permits-gridb__empty" data-gb-drop-empty>${window.GEAPEmptyState?.render({
        title: sub ? "Adaugă primul câmp" : "Adaugă prima coloană",
        text: sub ? "Alege un tip din stânga sau trage-l aici. Câmpurile apar într-o secțiune a cardului rândului." : "Alege un tip din stânga sau trage-l aici. Coloanele complexe vin după o coloană simplă.",
        icon: sub ? "page-child" : "dot-grid",
        actionHtml: addMenuHtml(cur, sub ? "Câmp" : "Coloană"),
      }) || ""}</div>`;
      return;
    }
    const sel = I.state.sel;
    const none = !(sel.kind === "child" && kids.some((kid) => kid.id === sel.id));
    const parentGrid = sub ? I.containerOf(cur.id) : cur;
    let saved = "";
    if (!sub) {
      const R = window.GEAPFoRepeat;
      const def = I.gridFo(cur, { prefix: "gbc", lang: "ro" }, I.levelOf(cur));
      const sample = R?.sampleRows?.(def, 1)?.[0]?.values || {};
      saved = `
        <div class="e-permits-gridb__sheet-head e-permits-gridb__sheet-head--saved">
          <h3 class="e-permits-gridb__sheet-title">Așa arată un rând salvat</h3>
        </div>
        <div class="e-permits-gridb__saved" inert>${R?.rowHtml?.(def, sample, { editing: false, n: 1 }) || ""}</div>`;
    }
    host.innerHTML = `
      <div class="e-permits-gridb__sheet" data-gb-sheet>
        ${hintHtml(sub ? "un câmp" : "o coloană", none)}
        ${stripHtml("#1", sub ? `${rowNameOf(parentGrid)} › ${I.fieldName(cur)}` : rowNameOf(cur), "Rând de exemplu")}
        <div class="e-permits-builder__grid e-permits-gridb__grid" data-gb-grid data-gb-fields>
          ${kids.map((child) => I.childCardHtml(child, cur)).join("")}
          <div class="e-permits-gridb__add-cell" data-span="3">
            <div class="e-permits-stack__menu-wrap e-permits-gridb__add">
              <button class="e-permits-builder__sub-add e-permits-gridb__add-tile" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${addMenuId(cur)}" data-stack-menu-trigger data-gb-add>${I.icon("icon-plus-small", 16)}<span>${sub ? "Câmp" : "Coloană"}</span></button>
            </div>
          </div>
          <span class="e-permits-gridb__drop" hidden data-gb-indicator></span>
        </div>
        ${saved}
        ${addMenuListHtml(cur)}
      </div>`;
    /* the saved line is a picture: no Editează / Elimină (Previzualizare is the working form) */
    host.querySelector(".e-permits-gridb__saved .e-permits-fo-grid__line-actions")?.remove();
  }

  /* the address window: the visible parts as cards on the 12-column grid (fixed order, no add, no drag) */
  function drawAddress(host, field) {
    const parts = I.addressConfig(field).filter((part) => part.visible);
    const selKey = I.state.addrPart;
    host.innerHTML = `
      <div class="e-permits-gridb__sheet" data-gb-sheet>
        ${hintHtml("o parte", !selKey)}
        ${stripHtml("", I.fieldName(field), "Adresă de exemplu")}
        ${parts.length ? `
        <div class="e-permits-builder__grid e-permits-gridb__grid" data-gb-grid>
          ${parts.map((part) => I.addressPartCardHtml(part, selKey)).join("")}
        </div>` : `<div class="e-permits-gridb__empty">${window.GEAPEmptyState?.render({ title: "Toate părțile sunt ascunse", text: "Afișează o parte din lista din stânga.", icon: "map-pin", compact: true }) || ""}</div>`}
      </div>`;
  }

  /* ------------------------------------------------------------------ centre: Previzualizare */
  function drawPreview(host, cur) {
    const phone = gb.device === "phone";
    const level = I.levelOf(cur);
    const body = cur.type === "address"
      ? `<div class="e-permits-fo-form__section-body e-permits-gridb__preview-form">${I.foHtml(cur, { prefix: "gbp", lang: "ro" })}</div>`
      : cur.type === "subform"
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
        <p class="e-permits-fo-field__hint">${cur.type === "address" ? "Adresa, așa cum o completează solicitantul." : cur.type === "subform" ? "Câmpurile, așa cum le completează solicitantul în cardul rândului." : I.isCaemGrid(cur) ? "Activitățile, așa cum le alege solicitantul." : "Grila, așa cum o vede solicitantul — două rânduri de probă salvate."}</p>
      </div>
      <div class="e-permits-gridb__preview${phone ? " is-phone" : ""}" role="region" aria-label="${phone ? "Previzualizare pe telefon, 375 px" : "Previzualizare pe desktop"}">
        <div class="e-permits-gridb__device e-permits-fo-form" data-gb-preview>${body}</div>
      </div>`;
    const preview = host.querySelector("[data-gb-preview]");
    I.R.bind?.(preview);
    const grid = preview.querySelector("[data-fo-grid]");
    if (grid) { window.GEAPFoRepeat?.fill(grid); window.GEAPFoRepeat?.layout(preview); }
    window.GEAPDatePicker?.init?.(preview);
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
    else if (isAddress()) drawAddress(refs.canvas, cur);
    else drawCards(refs.canvas, cur);
    refs.scroll.scrollTop = scrollTop;
    /* a column that just became selected (added at the end, picked from the errors / panel) is brought into view;
       later redraws keep the reader's own scroll */
    const selKey = `${I.state.sel.kind}:${I.state.sel.id}:${I.state.addrPart}`;
    if (selKey !== gb.lastSel) {
      gb.lastSel = selKey;
      const node = I.state.addrPart ? refs.canvas.querySelector(`[data-gb-part="${CSS.escape(I.state.addrPart)}"]`) : refs.canvas.querySelector(`[data-gb-cell="${CSS.escape(I.state.sel.id)}"]`);
      node?.scrollIntoView({ block: "nearest" });
    }
    if (key) root.querySelector(key)?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ navigation */
  function open(id) {
    if (!I) return;
    const target = I.fieldOrChild(id);
    if (!target) return;
    const address = target.type === "address" && Boolean(I.findField(id));
    if (!address && !(target.type === "grid" || I.isNest(target))) return;
    const found = I.findChild(id);
    if (found && found.top.type !== "grid") return;
    gb.kind = address ? "address" : "grid";
    gb.stack = found ? [...found.chain.map((item) => item.id), id] : [id];
    gb.topId = gb.stack[0];
    gb.snapshot = JSON.stringify(I.form);
    gb.mode = "edit";
    gb.device = "desktop";
    gb.lastSel = "";
    gb.query = "";
    refs.search.value = "";
    if (I.state.mode !== "build") I.setMode("build");
    /* the builder's panel + live region come along (their listeners with them) */
    gb.home = { panel: I.el.panel.parentElement, live: I.el.live.parentElement };
    refs.inspector.appendChild(I.el.panel);
    root.appendChild(I.el.live);
    mainParts().forEach((node) => { node.inert = true; });
    I.builder.classList.add("has-grid-builder");
    root.hidden = false;
    root.dataset.gbKind = gb.kind;
    gb.open = true;
    const sel = I.state.sel;
    if (!address && sel.kind === "child" && I.containerOf(sel.id) === target) I.select("child", sel.id);
    else I.select(kindOf(id), id, { tab: I.T_GEN });
    window.setTimeout(() => root.querySelector("#gb-title")?.focus({ preventScroll: true }), 0);
    I.announce(`Fereastra de editare a ${address ? "adresei" : "grilei"} „${I.fieldName(target)}” este deschisă. Gata te întoarce la formular.`);
  }
  const mainParts = () => [I.builder.querySelector(":scope > .e-permits-builder__topbar"), I.el.workspace].filter(Boolean);

  function close() {
    if (!gb.open) return;
    const top = I.fieldOrChild(gb.topId);
    const snapshot = gb.snapshot;
    const changed = JSON.stringify(I.form) !== snapshot;
    const noun = isAddress() ? "adresa" : "grila";
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
      message: `Ai actualizat ${noun} „${name}”.`,
      action: {
        label: "Anulează",
        onClick: () => {
          I.revertTo(snapshot);
          if (I.findField(topId)) I.select("field", topId);
          I.announce(`Modificările ${noun === "adresa" ? "adresei" : "grilei"} „${name}” au fost anulate.`);
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
    if (!gb.open || isAddress() || !target || !I.isNest(target) || I.containerOf(id) !== current()) return;
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
  /* address: a part selected = the field stays selected, the panel shows that part */
  const selectPart = (key) => { I.select("field", gb.topId, { part: key }); focusCard(`[data-gb-part="${CSS.escape(key)}"]`); };
  const focusCard = (selector) => window.setTimeout(() => root.querySelector(selector)?.focus({ preventScroll: true }), 0);

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
  /* Esc inside the window (called from the Form Designer's own Esc handler, after menus / pickers / dialogs / a resize) */
  function escape() {
    if (!gb.open) return false;
    if (gb.mode === "preview") { setMode("edit"); return true; }
    if (isAddress()) {
      const key = I.state.addrPart;
      if (key) { selectContainer(); focusCard(`[data-gb-part="${CSS.escape(key)}"]`); I.announce("Nicio parte selectată — setările adresei."); }
      return true;
    }
    const sel = I.state.sel;
    if (sel.kind === "child" && I.containerOf(sel.id) === current()) {
      selectContainer();
      focusCard(`[data-gb-col="${CSS.escape(sel.id)}"]`);
      I.announce(current()?.type === "subform" ? "Niciun câmp selectat — setările sub-formularului." : "Nicio coloană selectată — setările grilei.");
      return true;
    }
    if (gb.stack.length > 1) { up(); return true; }
    return true;
  }

  /* the „Editează …” button at the top of the properties panel (grid field / nested column / address) */
  function entryHtml(target) {
    if (!I || !target) return "";
    if (!gb.open) {
      const found = I.findChild(target.id);
      const address = target.type === "address" && Boolean(I.findField(target.id));
      const ok = address || target.type === "grid" || (found && I.isNest(target) && found.top.type === "grid");
      if (!ok) return "";
      return `<div class="e-permits-gridb__entry"><button class="btn btn-secondary btn-md" type="button" data-gb-open="${target.id}">${I.icon("icon-edit")}<span>${address ? "Editează adresa" : target.type === "subform" ? "Editează sub-formularul" : "Editează grila"}</span></button></div>`;
    }
    if (isAddress() || target === current() || !I.isNest(target) || I.containerOf(target.id) !== current()) return "";
    return `<div class="e-permits-gridb__entry"><button class="btn btn-secondary btn-md" type="button" data-gb-drill="${target.id}">${I.icon("icon-edit")}<span>${target.type === "subform" ? "Editează sub-formularul" : "Editează grila"}</span></button></div>`;
  }

  /* ------------------------------------------------------------------ drag and drop */
  function indicator() { return refs.canvas.querySelector("[data-gb-indicator]"); }
  function hideIndicator() {
    const node = indicator();
    if (node) node.hidden = true;
    refs.canvas.querySelectorAll(".is-drop-target").forEach((node2) => node2.classList.remove("is-drop-target"));
  }
  /* where a drop lands: the index in the current container + the indicator geometry (in the gap between two cards) */
  function dropAt(x, y) {
    const empty = refs.canvas.querySelector("[data-gb-drop-empty]");
    if (empty) return { index: 0, empty };
    const cards = [...refs.canvas.querySelectorAll("[data-gb-cell]")];
    let index = cards.findIndex((card) => { const r = card.getBoundingClientRect(); return y < r.top || (y <= r.bottom && x < r.left + r.width / 2); });
    if (index < 0) index = cards.length;
    const holder = refs.canvas.querySelector("[data-gb-fields]");
    const box = holder.getBoundingClientRect();
    const half = (parseFloat(getComputedStyle(holder).columnGap) || 0) / 2;
    const ref = cards[index] || cards[cards.length - 1];
    const r = ref ? ref.getBoundingClientRect() : box;
    const left = cards[index] ? r.left - box.left - half - 1 : r.right - box.left + half - 1;
    return { index, rect: { left, top: r.top - box.top, height: r.height } };
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
    if (!drag || !cur || isAddress()) return;
    if (drag.kind === "type") I.addChild(cur.id, drag.type, index);
    else if (drag.kind === "from") { const source = I.findField(drag.id)?.field; if (source) I.addChild(cur.id, source.type, index, { from: source }); }
    else if (drag.kind === "child" && I.moveChild(drag.id, 0, index)) focusCard(`[data-gb-col="${CSS.escape(drag.id)}"]`);
  }

  /* ------------------------------------------------------------------ width (the designer's handle + guides) */
  const COLUMN_SPANS = [3, 4, 6, 12];
  function stepWidth(card, delta) {
    const spans = card.dataset.gbPart || current()?.type === "subform" ? I.SPANS : COLUMN_SPANS;
    const at = spans.indexOf(Number(card.dataset.span));
    const next = spans[Math.max(0, Math.min(spans.length - 1, (at < 0 ? 1 : at) + delta))];
    if (card.dataset.gbPart) I.setPartSpan(gb.topId, card.dataset.gbPart, next);
    else I.setChildSpan(card.dataset.gbCol, next);
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
      if (event.target.closest("[data-gb-drill], [data-gb-chip]")) return; /* the document handler */
      /* address: switch a hidden part on (left) / hide a part (its card) — a toggle: announced, no toast */
      const show = event.target.closest("[data-gb-show-part]");
      if (show) {
        const key = show.dataset.gbShowPart;
        I.setAddressPart(current(), key, { visible: true });
        I.announce(`Partea „${I.addressConfig(current()).find((part) => part.key === key)?.label}” este afișată.`);
        selectPart(key);
        return;
      }
      const hide = event.target.closest("[data-gb-hide-part]");
      if (hide) { hidePart(hide.dataset.gbHidePart); return; }
      const act = event.target.closest("[data-gb-act]");
      if (act) {
        const id = act.dataset.id;
        if (act.dataset.gbAct === "duplicate") { I.duplicateChild(id); const sel = I.state.sel; if (sel.kind === "child") focusCard(`[data-gb-col="${CSS.escape(sel.id)}"]`); }
        else { I.deleteChild(id); const sel = I.state.sel; focusCard(sel.kind === "child" ? `[data-gb-col="${CSS.escape(sel.id)}"]` : "[data-gb-add]"); }
        return;
      }
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
      const part = event.target.closest("[data-gb-part]");
      if (part) { if (I.state.addrPart !== part.dataset.gbPart) selectPart(part.dataset.gbPart); else part.focus({ preventScroll: true }); return; }
      const col = event.target.closest("[data-gb-col]");
      if (col) {
        const id = col.dataset.gbCol;
        if (!(I.state.sel.kind === "child" && I.state.sel.id === id)) I.select("child", id);
        focusCard(`[data-gb-col="${CSS.escape(id)}"]`);
        return;
      }
      /* an empty spot of the stage = the grid's (address's) own settings */
      if (refs.stage.contains(event.target) && !event.target.closest("button, a, input, [data-gb-cell]")) {
        const cur = current();
        if (gb.mode === "edit" && (I.state.sel.id !== cur.id || I.state.addrPart)) selectContainer();
      }
    });
    root.addEventListener("dblclick", (event) => {
      const col = event.target.closest("[data-gb-col]");
      const target = col ? I.fieldOrChild(col.dataset.gbCol) : null;
      if (target && I.isNest(target)) drill(target.id);
    });
    refs.search.addEventListener("input", () => { gb.query = refs.search.value; renderLibrary(current()); });
    /* the width handle: the designer's drag with the 12-column guides (columns snap 3 · 4 · 6 · 12) */
    refs.stage.addEventListener("pointerdown", (event) => {
      const handle = event.target.closest("[data-gb-resize]");
      if (!handle || event.button !== 0 || gb.mode !== "edit") return;
      const card = handle.closest("[data-gb-cell], [data-gb-part]");
      const gridEl = card?.closest("[data-gb-grid]");
      if (!card || !gridEl) return;
      const key = card.dataset.gbPart;
      const id = card.dataset.gbCol;
      I.startResize(event, {
        handle, card, gridEl,
        spans: key || current()?.type === "subform" ? I.SPANS : COLUMN_SPANS,
        commit: (span) => { if (key) { I.state.addrPart = key; I.setPartSpan(gb.topId, key, span); } else { I.state.sel = { kind: "child", id }; I.setChildSpan(id, span); } },
        done: () => { if (key) selectPart(key); else I.select("child", id); },
      });
    });
    root.addEventListener("keydown", (event) => {
      /* only the card itself (a button inside must not delete / move it) */
      const node = event.target.matches?.("[data-gb-cell], [data-gb-part]") ? event.target : null;
      if (!node) return;
      const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      if (node.dataset.gbPart) {
        const key = node.dataset.gbPart;
        if (event.altKey && horizontal) { event.preventDefault(); stepWidth(node, delta); focusCard(`[data-gb-part="${CSS.escape(key)}"]`); return; }
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); hidePart(key); return; }
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPart(key); }
        return;
      }
      const id = node.dataset.gbCol;
      const refocus = (which) => focusCard(`[data-gb-col="${CSS.escape(which)}"]`);
      if (event.altKey && event.shiftKey && horizontal) { event.preventDefault(); stepWidth(node, delta); refocus(id); return; }
      if (event.altKey && horizontal) { event.preventDefault(); if (I.moveChild(id, delta)) refocus(id); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") { event.preventDefault(); I.duplicateChild(id); const sel = I.state.sel; if (sel.kind === "child") refocus(sel.id); return; }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        I.deleteChild(id);
        const sel = I.state.sel;
        if (sel.kind === "child") refocus(sel.id); else focusCard("[data-gb-add]");
        return;
      }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); I.select("child", id); refocus(id); }
    });
    root.addEventListener("dragstart", (event) => {
      if (isAddress()) { event.preventDefault(); return; }
      const source = event.target.closest?.("[data-gb-type], [data-gb-from], [data-gb-col]");
      if (!source || source.getAttribute("aria-disabled") === "true") return;
      if (source.dataset.gbType) gb.drag = { kind: "type", type: source.dataset.gbType };
      else if (source.dataset.gbFrom) gb.drag = { kind: "from", id: source.dataset.gbFrom };
      else gb.drag = { kind: "child", id: source.dataset.gbCol };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = gb.drag.kind === "child" ? "move" : "copy";
        try { event.dataTransfer.setData("text/plain", gb.drag.type || gb.drag.id); } catch { /* synthetic event */ }
      }
      source.classList.add("is-dragging");
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
  function hidePart(key) {
    const field = current();
    const part = I.addressConfig(field).find((item) => item.key === key);
    if (!part) return;
    const parts = I.addressConfig(field).filter((item) => item.visible);
    const next = parts[parts.indexOf(part) + 1] || parts[parts.indexOf(part) - 1];
    I.setAddressPart(field, key, { visible: false });
    selectContainer();
    I.announce(`Partea „${part.label}” este ascunsă. O găsești în „Părți ascunse”.`);
    focusCard(next ? `[data-gb-part="${CSS.escape(next.key)}"]` : `[data-gb-show-part="${CSS.escape(key)}"]`);
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
      search: root.querySelector("[data-gb-search]"),
      stage: root.querySelector("[data-gb-stage]"),
      scroll: root.querySelector("[data-gb-scroll]"),
      canvas: root.querySelector("[data-gb-canvas]"),
      inspector: root.querySelector("[data-gb-inspector]"),
    });
    bindEvents();
    /* entry: „Editează grila / adresa” (card / panel), „Editează sub-grila” (panel), double-click on a grid / address card */
    document.addEventListener("click", (event) => {
      const opener = event.target.closest?.("[data-gb-open]");
      if (opener) { open(opener.dataset.gbOpen); return; }
      const drillButton = event.target.closest?.("[data-gb-drill]");
      if (drillButton) drill(drillButton.dataset.gbDrill);
      /* chip-band-v1: a chip of the column band = the window on that column (from the form: open the grid; inside: drill) */
      const chip = event.target.closest?.("[data-gb-chip]");
      if (chip) {
        const id = chip.dataset.gbChip;
        const parent = I.containerOf(id);
        if (!parent) return;
        if (gb.open) drill(parent.id); else open(parent.id);
        if (gb.open) I.select("child", id);
      }
    });
    I.el.canvas.addEventListener("dblclick", (event) => {
      const card = event.target.closest("[data-builder-field][data-type='grid'], [data-builder-field][data-type='address']");
      if (card && !event.target.closest("button, a, input")) open(card.dataset.id);
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
