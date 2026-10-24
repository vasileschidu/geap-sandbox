/* Grilă editabilă (US-33…US-39) and Bloc repetabil (CAEM, US-40) — the request-form side of the
   Form Builder 1:N components (batch 4, 2026-10-13). Spec tools/persona-test/specs/svc/form-builder.md
   § C.8, components.md „Editable grid (FO)” and „Repeatable block (FO)”.

   ONE renderer: js/e-permits-acte-permisive.js dispatches `grid` / `repeat` from stepFieldHtml to
   window.GEAPFoRepeat.gridHtml / blockHtml and binds them from GEAPFormRender.bind; the builder canvas,
   its Preview and the request form all draw through it. Cells and block fields are drawn with the FO
   field renderer itself (ctx.fieldHtml = stepFieldHtml); the CAEM pair with the exact FO activity
   markup (ctx.caemFieldHtml / ctx.subgenHtml, extracted from activityCardHtml).

   Grid: library `.table.table--subtle` (explicit ARIA roles), rows in view mode (click a cell or
   „Editează” → edit mode with FO inputs, Enter saves, Esc cancels), per-cell FO errors, „Adaugă rând”
   (`.e-permits-fo-add-activity`), delete with the FO confirm dialog, library pagination, nested grids
   in a detail row (≤ 3 levels). Below 600 px of its own width (container query) every row is a card
   (label over value) with labelled buttons — never a sideways-scrolling table.
   Block: the FO activity card per element (`#1 Activitate`), „Adaugă altă activitate”, remove + undo
   toast, key (duplicates) and group (section) rules, min / max.

   The FO definitions come from the builder (toFo) or from a service schema; shape in components.md. */
(function () {
  const defs = new Map();
  let ctx = null;
  const params = new URLSearchParams(window.location.search);
  /* demo: ?sursa=asteptare (skeleton) · ?sursa=indisponibila (US-39 AC-03 / US-40 AC-06) */
  const SOURCE = params.get("sursa") || "";
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

  const esc = (value) => (ctx?.esc ? ctx.esc(value) : String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const icon = (id, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#${id}"></use></svg>`;
  const domIdOf = (id) => `fo-${String(id || "field").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`;
  const star = () => `<span class="e-permits-fo-required" aria-label="obligatoriu">${icon("icon-asterisk", 12)}</span>`;
  const fillText = (text, vars) => String(text || "").replace(/\{(\w+)\}/g, (all, key) => (vars[key] != null ? String(vars[key]) : all));
  const longDate = (iso) => { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[3])} ${RO_MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(iso || ""); };
  const isEmpty = (value) => value == null || value === "" || value === false || (Array.isArray(value) && !value.length);
  const ui = () => window.GEAPUi || {};
  const live = (root, text) => { const node = root.querySelector(":scope > [data-fo-repeat-live]"); if (!node) return; node.textContent = ""; window.setTimeout(() => { node.textContent = text; }, 30); };
  let seq = 0;
  const rid = () => `r${(seq += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const tagFirst = (html, attrs) => String(html).replace(/^(\s*<[a-z]+)/i, `$1 ${attrs}`);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const todayIso = () => ctx?.localIsoDay?.() || new Date().toISOString().slice(0, 10);
  const isDemoLink = () => Boolean(document.documentElement.dataset.demoLink);
  /* default min / max texts (US-36), with the Romanian singular for 1 */
  const minText = (def, n, grid) => fillText(def.texts.min || (grid ? (n === 1 ? "Adaugă cel puțin un rând." : "Trebuie cel puțin {min} rânduri.") : n === 1 ? "Adaugă cel puțin un element." : "Adaugă cel puțin {min} elemente."), { min: n });
  const maxText = (def, n, grid) => fillText(def.texts.max || (grid ? (n === 1 ? "Maximum un rând." : "Maximum {max} rânduri.") : n === 1 ? "Maximum un element." : "Maximum {max} elemente."), { max: n });

  /* ------------------------------------------------------------ values: read · format · check */
  const errorHtml = (message) => `<span class="message message--inline message--error e-permits-fo-field__error" data-fo-repeat-error>${icon("icon-circle-error-filled")}<span>${esc(message)}</span></span>`;

  /* the value of one FO control rendered for a column / block field (scope = its cell or item) */
  function readControl(scope, col) {
    if (!scope) return col.type === "multiselect" ? [] : col.type === "checkbox" ? false : "";
    switch (col.type) {
      case "select": {
        const value = scope.querySelector("[data-fo-select-value]");
        if (value) return value.classList.contains("e-permits-fo-select__value--placeholder") ? "" : value.textContent.trim();
        return (scope.querySelector("input")?.value || "").trim();
      }
      case "combobox": {
        const option = scope.querySelector(".e-permits-fo-caem__option.is-selected");
        if (option) return option.dataset.code || "";
        return (scope.querySelector("input:not([type='search'])")?.value || "").trim();
      }
      case "multiselect": {
        const options = scope.querySelectorAll(".e-permits-fo-subgen-select__option.is-selected");
        if (options.length || scope.querySelector("[data-fo-subgen-select]")) return [...options].map((option) => option.dataset.value);
        const typed = (scope.querySelector("input")?.value || "").trim();
        return typed ? typed.split(/\s*,\s*/).filter(Boolean) : [];
      }
      case "checkbox": return Boolean(scope.querySelector("input[type='checkbox']")?.checked);
      case "radio": return scope.querySelector("input[type='radio']:checked")?.value || "";
      case "date": {
        const picker = scope.querySelector("[data-date-picker]");
        if (picker?.dataset.selected) return picker.dataset.selected;
        const typed = (picker?.querySelector("input")?.value || "").match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
        return typed ? `${typed[3]}-${typed[2]}-${typed[1]}` : "";
      }
      default: return (scope.querySelector("input:not([type='search']), textarea")?.value || "").trim();
    }
  }

  /* what a saved value reads like in a view cell / card („8 iulie 2026”, „12,5 m²”, „Da”) */
  function formatValue(col, value) {
    if (isEmpty(value) && col.type !== "checkbox") return "";
    switch (col.type) {
      case "date": return longDate(value);
      case "number": return `${String(value).replace(".", ",")}${col.unit ? ` ${col.unit}` : ""}`;
      case "money": { const n = Number(String(value).replace(",", ".")); return `${Number.isNaN(n) ? value : n.toFixed(2).replace(".", ",")} ${col.unit || "MDL"}`; }
      case "checkbox": return value ? "Da" : "Nu";
      case "radio": return (col.radio || []).find((option) => option.value === value)?.label || String(value);
      case "multiselect": return (Array.isArray(value) ? value : [value]).join(", ");
      case "combobox": { const option = (col.options || []).find((item) => item.code === value); return option ? `${option.code} • ${option.label}` : String(value); }
      default: return String(value);
    }
  }

  /* runtime order (US-30 AC-12): Obligatoriu → format → limite; an empty optional value is valid */
  function checkValue(col, value) {
    if (isEmpty(value) || (col.type === "checkbox" && !value)) {
      if (!col.required) return "";
      if (col.type === "checkbox") return "Bifează pentru a continua.";
      if (["select", "radio", "combobox"].includes(col.type)) return "Alege o opțiune.";
      if (col.type === "multiselect") return "Alege cel puțin o opțiune.";
      return "Câmp obligatoriu";
    }
    const custom = col.message || "";
    switch (col.type) {
      case "number":
      case "money": {
        const n = Number(String(value).replace(",", "."));
        if (Number.isNaN(n)) return "Introdu un număr.";
        const min = col.min !== "" && col.min != null ? Number(col.min) : null;
        const max = col.max !== "" && col.max != null ? Number(col.max) : null;
        if ((min != null && n < min) || (max != null && n > max)) return fillText(custom || "Introduceți o valoare între {min} și {max}.", { min: min ?? "…", max: max ?? "…" });
        return "";
      }
      case "text": {
        if (col.pattern) { try { if (!new RegExp(col.pattern).test(value)) return custom || col.patternMessage || "Valoarea nu are formatul cerut."; } catch { /* invalid regex: the builder reports it */ } }
        if (col.minLength && String(value).length < Number(col.minLength)) return custom || `Minimum ${col.minLength} caractere.`;
        return "";
      }
      case "date": {
        if (col.dateMin && value < col.dateMin) return `Data nu poate fi înainte de ${col.dateMin.split("-").reverse().join("/")}.`;
        if (col.dateMax && value > col.dateMax) return `Data nu poate fi după ${col.dateMax.split("-").reverse().join("/")}.`;
        return "";
      }
      case "multiselect": {
        if (col.minSelected && value.length < Number(col.minSelected)) return fillText(custom || (Number(col.minSelected) === 1 ? "Alege cel puțin o opțiune." : "Selectați cel puțin {min} opțiuni."), { min: col.minSelected });
        if (col.maxSelected && value.length > Number(col.maxSelected)) return `Selectați cel mult ${col.maxSelected} opțiuni.`;
        return "";
      }
      default: return "";
    }
  }

  /* one FO error on a rendered control (inputs: the FO helper; lists, boxes, radios: the same message) */
  function markError(scope, col, message) {
    if (!scope) return null;
    const field = scope.matches(".e-permits-fo-field, fieldset") ? scope : scope.querySelector(".e-permits-fo-field, fieldset") || scope;
    const input = field.querySelector(".e-permits-fo-input input:not([readonly]):not(:disabled)");
    if (input && ctx?.setFieldError && !field.matches("fieldset")) { ctx.setFieldError(input, message); return input; }
    field.querySelectorAll(":scope > .e-permits-fo-field__hint").forEach((hint) => { hint.hidden = true; hint.dataset.foRepeatHint = ""; });
    field.querySelector(".checkbox")?.classList.add("checkbox--error");
    field.querySelectorAll(".e-permits-fo-select, .e-permits-fo-subgen-select, .e-permits-fo-caem, .e-permits-fo-textarea").forEach((control) => control.classList.add("is-error"));
    field.insertAdjacentHTML("beforeend", errorHtml(message));
    const focusable = field.querySelector("button:not(:disabled), input:not([type='hidden']):not(:disabled), textarea");
    focusable?.setAttribute("aria-invalid", "true");
    return focusable;
  }
  function clearErrors(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-fo-repeat-error]").forEach((node) => node.remove());
    scope.querySelectorAll("[data-fo-repeat-hint]").forEach((node) => { node.hidden = false; delete node.dataset.foRepeatHint; });
    scope.querySelectorAll(".checkbox--error").forEach((node) => node.classList.remove("checkbox--error"));
    scope.querySelectorAll(".e-permits-fo-select.is-error, .e-permits-fo-subgen-select.is-error, .e-permits-fo-caem.is-error, .e-permits-fo-textarea.is-error").forEach((node) => node.classList.remove("is-error"));
    scope.querySelectorAll("[aria-invalid='true']").forEach((node) => { if (node.closest(".e-permits-fo-input") && ctx?.setFieldError) ctx.setFieldError(node, ""); else node.removeAttribute("aria-invalid"); });
  }

  /* options of a list column / field: from its parent (cascade, US-37) and the group rule (US-36 AC-04) */
  const optionMeta = (col, label) => (col.meta || []).find((item) => item.label === label) || null;
  const groupOf = (col, value) => {
    if (isEmpty(value)) return "";
    if (col.type === "combobox") { const option = (col.options || []).find((item) => item.code === value); return option?.group || String(value).split(" ")[0]; }
    const meta = optionMeta(col, Array.isArray(value) ? value[0] : value);
    return meta?.group || "";
  };
  const groupName = (def, group) => (def.groupNames && def.groupNames[group]) || group;
  /* the permanent guidance of a group rule; before the first value the „: {grup}” tail drops */
  const groupText = (def, label, group, noun) => {
    const text = fillText(def.texts.group || `Toate ${noun} au aceeași grupă la „{coloana}”: {grup}.`, { coloana: label, grup: group ? groupName(def, group) : "" });
    return group ? text : text.replace(/[:\s]+\.?$/, ".");
  };

  /* ================================================================== GRID — markup */
  /* column widths without inline styles: a column spans 2 (Îngustă) · 3 (Auto, Medie) · 4 (Lată) equal
     units of the fixed-layout table; „Nr.” and the actions are fixed. Below the width the units need
     (40 px each) and always below 600 px the grid shows cards — `is-cards`, set by layout(). */
  const weightOf = (col) => (col.type === "grid" ? 4 : { s: 2, m: 3, l: 4 }[col.width] || 3);
  const unitsOf = (def) => def.columns.reduce((n, col) => n + weightOf(col), 0);
  const span = (col) => (weightOf(col) > 1 ? ` colspan="${weightOf(col)}"` : "");
  const UNIT_MIN = 40;
  const FIXED_MIN = 152;
  const CARD_BELOW = 600;
  function layout(root) {
    const grids = [...(root?.matches?.("[data-fo-grid]") ? [root] : []), ...(root?.querySelectorAll?.("[data-fo-grid]") || [])];
    grids.forEach((grid) => {
      const width = grid.clientWidth;
      if (!width) return;
      const need = Math.max(CARD_BELOW, Number(grid.dataset.units || 0) * UNIT_MIN + FIXED_MIN);
      grid.classList.toggle("is-cards", width < need);
    });
  }
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver((entries) => entries.forEach((entry) => layout(entry.target))) : null;
  function headHtml(def) {
    return `
      <thead role="rowgroup">
        <tr class="table__row" role="row">
          <th class="table__head-cell e-permits-fo-grid__index" role="columnheader" scope="col">Nr.</th>
          ${def.columns.map((col) => `<th class="table__head-cell" role="columnheader" scope="col"${span(col)}>${esc(col.label)}${col.required ? `&nbsp;${star()}` : ""}</th>`).join("")}
          <th class="table__head-cell e-permits-fo-grid__actions" role="columnheader" scope="col"><span class="u-visually-hidden">Acțiuni</span></th>
        </tr>
      </thead>`;
  }
  /* „1” in the table; „#1 Rând” on a card (the activity-card title look) */
  const indexCell = (def, n) => `
    <td class="table__body-cell e-permits-fo-grid__index" role="cell">
      <span class="e-permits-fo-grid__index-num" data-fo-grid-num>${n}</span>
      <span class="e-permits-fo-grid__index-title"><span class="e-permits-fo-grid__index-tag" data-fo-grid-tag>#${n}</span><strong>${esc(def.texts.row || "Rând")}</strong></span>
    </td>`;
  function actionsHtml(def, n, editing) {
    const canRemove = def.rules.allowRemove !== false;
    const compact = editing
      ? `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Salvează rândul ${n}" data-tooltip-label="Salvează (Enter)" data-fo-grid-act="save">${icon("icon-checkmark-small", 16)}</button>
         <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Anulează modificările din rândul ${n}" data-tooltip-label="Anulează (Esc)" data-fo-grid-act="cancel">${icon("icon-cross-small", 16)}</button>`
      : `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Editează rândul ${n}" data-tooltip-label="Editează" data-fo-grid-act="edit">${icon("icon-edit", 16)}</button>
         ${canRemove ? `<button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Șterge rândul ${n}" data-tooltip-label="Șterge" data-fo-grid-act="delete">${icon("icon-delete", 16)}</button>` : ""}`;
    const full = editing
      ? `<button class="btn btn-secondary btn-md" type="button" data-fo-grid-act="save">${icon("icon-checkmark-small")}<span>Salvează rândul</span></button>
         <button class="btn btn-neutral btn-md" type="button" data-fo-grid-act="cancel">Anulează</button>`
      : `<button class="btn btn-neutral btn-md" type="button" data-fo-grid-act="edit">${icon("icon-edit")}<span>Editează</span></button>
         ${canRemove ? `<button class="btn btn-text-destructive btn-md" type="button" data-fo-grid-act="delete">${icon("icon-delete")}<span>Șterge</span></button>` : ""}`;
    return `
      <td class="table__body-cell e-permits-fo-grid__actions" role="cell">
        <div class="e-permits-fo-grid__actions-compact">${compact}</div>
        <div class="e-permits-fo-grid__actions-full">${full}</div>
      </td>`;
  }
  /* the column name on a card (display: none in the table, where the header names the cell) */
  const cellLabel = (col) => `<span class="e-permits-fo-grid__cell-label">${esc(col.label)}${col.required ? ` ${star()}` : ""}</span>`;
  function nestedToggleHtml(def, row, col, count) {
    const open = Boolean(row.open?.[col.key]);
    return `<button class="btn btn-neutral btn-sm e-permits-fo-grid__nested-toggle" type="button" aria-expanded="${open}" aria-controls="${esc(detailId(def, row, col))}" data-fo-grid-nested="${esc(col.key)}"><span>${esc(plural(count, "rând", "rânduri"))}</span>${icon("icon-chevron-bottom", 16)}</button>`;
  }
  const detailId = (def, row, col) => `${domIdOf(def.id)}-${row.id}-${col.key}-detail`;

  function viewRowHtml(def, row, n) {
    return `
      <tr class="table__row e-permits-fo-grid__row" role="row" data-fo-grid-row="${row.id}">
        ${indexCell(def, n)}
        ${def.columns.map((col) => {
          if (col.type === "grid") return `<td class="table__body-cell e-permits-fo-grid__cell" role="cell"${span(col)} data-col="${esc(col.key)}" data-type="grid">${cellLabel(col)}${nestedToggleHtml(def, row, col, nestedCount(row, col))}</td>`;
          const text = formatValue(col, row.values[col.key]);
          return `
            <td class="table__body-cell e-permits-fo-grid__cell" role="cell"${span(col)} data-col="${esc(col.key)}" data-type="${esc(col.type)}">
              ${cellLabel(col)}
              <button class="e-permits-fo-grid__value${text ? "" : " is-empty"}" type="button" tabindex="-1" data-cell-tooltip aria-label="${esc(`${col.label}: ${text || "necompletat"} — editează rândul ${n}`)}" data-fo-grid-cell="${esc(col.key)}">${text ? esc(text) : "—"}</button>
            </td>`;
        }).join("")}
        ${actionsHtml(def, n, false)}
      </tr>`;
  }

  /* the FO field object for one cell (the FO renderer draws it; its label is visually hidden in the
     table and shown in the card) */
  function cellField(def, col, row, scopeCtl) {
    const id = `${def.id}-${row.id}-${col.key}`;
    const value = row.values[col.key];
    const base = { id, type: col.type, label: col.label, required: Boolean(col.required), span: 12, placeholder: col.placeholder || "", readOnly: Boolean(col.readOnly), hint: "" };
    const manual = scopeCtl?.manual && ["select", "multiselect", "combobox"].includes(col.type);
    if (manual) return { ...base, type: "text", value: Array.isArray(value) ? value.join(", ") : value || "", placeholder: "Scrie valoarea" };
    switch (col.type) {
      case "text": return { ...base, value: value || "", maxLength: col.maxLength || "", inputmode: col.inputmode || "" };
      case "number": case "money": return { ...base, value: value ?? "", unit: col.unit || (col.type === "money" ? "MDL" : ""), decimals: col.decimals || 0 };
      case "date": return { ...base, value: value || "", min: col.dateMin || "" };
      case "checkbox": return { ...base, value: Boolean(value) };
      case "radio": return { ...base, value: value || "", orientation: "horizontal", options: col.radio || [] };
      case "select":
      case "multiselect": {
        const options = scopeCtl ? scopeCtl.optionsFor(col, row) : (col.options || []);
        const waiting = col.parent && !options.length;
        return { ...base, value: col.type === "select" ? value || "" : [], options, placeholder: waiting ? `Alege mai întâi „${col.parent.label || "câmpul părinte"}”` : base.placeholder || (col.type === "select" ? "Selectează" : "Alege opțiunile"), disabled: waiting, readOnly: base.readOnly || waiting };
      }
      default: return { ...base, value: value || "" };
    }
  }

  function editRowHtml(def, row, n, ctl) {
    return `
      <tr class="table__row e-permits-fo-grid__row is-editing" role="row" data-fo-grid-row="${row.id}">
        ${indexCell(def, n)}
        ${def.columns.map((col) => {
          if (col.type === "grid") return `<td class="table__body-cell e-permits-fo-grid__cell" role="cell"${span(col)} data-col="${esc(col.key)}" data-type="grid">${cellLabel(col)}${nestedToggleHtml(def, row, col, nestedCount(row, col))}</td>`;
          return `<td class="table__body-cell e-permits-fo-grid__cell" role="cell"${span(col)} data-col="${esc(col.key)}" data-type="${esc(col.type)}">${ctx.fieldHtml(cellField(def, col, row, ctl))}</td>`;
        }).join("")}
        ${actionsHtml(def, n, true)}
      </tr>`;
  }
  const nestedCount = (row, col) => (row.nested?.[col.key] ? row.nested[col.key].count() : (row.values[col.key] || []).length);

  function emptyRowHtml(def) {
    const text = def.texts.empty || "Niciun rând. Apasă «Adaugă rând» pentru a începe.";
    const empty = window.GEAPEmptyState?.render({ text, icon: "dot-grid", compact: true, bare: true }) || `<p>${esc(text)}</p>`;
    return `<tr class="table__row e-permits-fo-grid__empty" role="row" data-fo-grid-empty><td class="table__body-cell" role="cell" colspan="${unitsOf(def) + 2}">${empty}</td></tr>`;
  }
  function skeletonRowsHtml(def) {
    return [1, 2].map(() => `
      <tr class="table__row e-permits-fo-grid__row is-loading" role="row" aria-hidden="true">
        <td class="table__body-cell e-permits-fo-grid__index" role="cell"><span class="skeleton skeleton--text"></span></td>
        ${def.columns.map((col) => `<td class="table__body-cell e-permits-fo-grid__cell" role="cell"${span(col)}><span class="skeleton skeleton--input"></span></td>`).join("")}
        <td class="table__body-cell e-permits-fo-grid__actions" role="cell"></td>
      </tr>`).join("");
  }
  function sourceNoticeHtml(kind, block = false) {
    if (kind !== "error") return "";
    const text = ui().renderNotice?.("error", `Nu s-au putut încărca datele${block ? " listei" : " grilei"}. Datele introduse se păstrează.`) || "";
    return `
      <div class="e-permits-fo-grid__source" data-fo-grid-source>
        ${text}
        <div class="e-permits-fo-grid__source-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-fo-grid-retry>${icon("icon-rotate-arrow", 16)}<span>Reîncearcă</span></button>
          ${block ? "" : '<button class="btn btn-neutral btn-sm" type="button" data-fo-grid-manual>Introdu manual</button>'}
        </div>
      </div>`;
  }

  /* the rows a grid starts with: the given value (test data, a saved request) or the default empty
     rows; the first unsaved one opens in edit mode (US-35: a new row is empty and editable) */
  function initialRows(def) {
    const max = Number(def.rules.max) || 0;
    const given = Array.isArray(def.value) && def.value.length;
    const list = given ? def.value : Array.from({ length: Math.min(Number(def.rules.defaultRows) || 0, max || 99) }, () => ({ values: {}, empty: true }));
    const rows = list.map((item) => ({ id: rid(), values: { ...(item.values || item) }, saved: !item.empty, editing: false, isNew: false, open: {} }));
    rows.forEach((row) => { delete row.values.empty; delete row.values.values; });
    if (rows[0] && !rows[0].saved) rows[0].editing = true;
    return rows;
  }

  /* the grid root: label, hint, group note, the table, the foot (add + limit + pages), live region.
     The body is drawn here too (the builder canvas is inert and never bound); bind() redraws it. */
  function gridHtml(def, context) {
    if (context) ctx = context;
    const id = domIdOf(def.id);
    def.rules = def.rules || {};
    def.texts = def.texts || {};
    defs.set(id, def);
    const source = def.usesSource ? (SOURCE === "asteptare" ? "loading" : SOURCE === "indisponibila" ? "error" : "") : "";
    const groupCol = def.columns.find((col) => col.key === def.rules.group);
    return `
      <div class="e-permits-fo-field e-permits-fo-field--span-12 e-permits-fo-grid" id="${esc(id)}" data-fo-grid="${esc(id)}" data-level="${def.level || 1}" data-units="${unitsOf(def)}"${source ? ` data-source="${source}"` : ""}>
        <div class="e-permits-fo-grid__label" id="${esc(id)}-label">${esc(def.label || "")}${def.required ? ` ${star()}` : ""}</div>
        ${def.hint ? `<p class="e-permits-fo-field__hint" id="${esc(id)}-hint">${esc(def.hint)}</p>` : ""}
        ${groupCol ? `<div class="e-permits-fo-grid__group-note" data-fo-grid-group-note>${ui().renderInfoNote?.(esc(groupText(def, groupCol.label, "", "rândurile"))) || ""}</div>` : ""}
        ${sourceNoticeHtml(source)}
        <div class="e-permits-fo-grid__frame">
          <table class="table table--subtle e-permits-fo-grid__table" role="table" aria-labelledby="${esc(id)}-label"${def.hint ? ` aria-describedby="${esc(id)}-hint"` : ""}>
            ${headHtml(def)}
            <tbody role="rowgroup" data-fo-grid-body>${source === "loading" ? skeletonRowsHtml(def) : staticBody(def, source === "error")}</tbody>
          </table>
        </div>
        <div class="e-permits-fo-grid__foot">
          ${def.rules.allowAdd === false ? "" : `<button class="e-permits-fo-add-activity" type="button" data-fo-grid-add${source ? ' aria-disabled="true"' : ""}>${icon("icon-plus-small")}<span>${esc(def.texts.add || "Adaugă rând")}</span></button>`}
          <p class="e-permits-fo-field__hint e-permits-fo-grid__limit" data-fo-grid-limit hidden></p>
          <nav class="pagination pagination--compact e-permits-fo-grid__pager" aria-label="Paginile grilei" data-fo-grid-pager hidden></nav>
        </div>
        <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-repeat-live></p>
      </div>`;
  }

  function staticBody(def, locked = false) {
    const rows = initialRows(def);
    if (locked) rows.forEach((row) => { row.editing = false; });
    return rows.length ? rows.map((row, i) => (row.editing ? editRowHtml(def, row, i + 1, null) : viewRowHtml(def, row, i + 1))).join("") : emptyRowHtml(def);
  }

  /* ================================================================== GRID — behaviour */
  function createGrid(root, def) {
    if (root.foGridCtl) return root.foGridCtl;
    const body = root.querySelector(":scope > .e-permits-fo-grid__frame [data-fo-grid-body]");
    const addButton = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-add]");
    const limit = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-limit]");
    const pager = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-pager]");
    const rules = def.rules;
    const max = Number(rules.max) || 0;
    const min = Math.max(Number(rules.min) || 0, def.required ? 1 : 0);
    const pageSize = Number(rules.pageSize) || 0;
    const state = { rows: [], page: 1, source: root.dataset.source || "", manual: false };
    const rowEl = (row) => body.querySelector(`:scope > [data-fo-grid-row="${row.id}"]`);
    const rowById = (id) => state.rows.find((row) => row.id === id) || null;
    const numberOf = (row) => state.rows.indexOf(row) + 1;

    state.rows = initialRows(def);
    /* a source that did not load: nothing opens for editing until „Reîncearcă” / „Introdu manual” */
    const locked = () => state.source === "error" && !state.manual;
    if (locked()) state.rows.forEach((row) => { row.editing = false; });

    const ctl = {
      root, def,
      get manual() { return state.manual; },
      count: () => state.rows.length,
      value: () => state.rows.map((row) => ({ ...readRow(row), ...nestedValues(row) })),
      optionsFor,
      validate,
      fill,
      reset: () => { state.rows = []; render(); },
    };
    root.foGridCtl = ctl;

    function nestedValues(row) {
      const out = {};
      def.columns.filter((col) => col.type === "grid").forEach((col) => { out[col.key] = row.nested?.[col.key] ? row.nested[col.key].value() : row.values[col.key] || []; });
      return out;
    }
    /* the row's values: the inputs while it is edited, the saved values otherwise */
    function readRow(row) {
      if (!row.editing) return { ...row.values };
      const el = rowEl(row);
      const out = {};
      def.columns.forEach((col) => {
        if (col.type === "grid") return;
        const cell = el?.querySelector(`:scope > [data-col="${CSS.escape(col.key)}"]`);
        out[col.key] = readControl(cell, state.manual && ["select", "multiselect", "combobox"].includes(col.type) ? { ...col, type: col.type === "multiselect" ? "multiselect" : "text" } : col);
      });
      return out;
    }
    /* the group fixed by the first other row that has a value (US-36 AC-04) */
    function activeGroup(exceptRow) {
      const col = def.columns.find((item) => item.key === rules.group);
      if (!col) return "";
      for (const row of state.rows) {
        if (row === exceptRow) continue;
        const group = groupOf(col, readRow(row)[col.key]);
        if (group) return group;
      }
      return "";
    }
    /* cascade (US-37): a column filtered by another column of the row or by a form field */
    function parentValue(col, row) {
      if (!col.parent) return "";
      if (col.parent.kind === "column") {
        const parentCol = def.columns.find((item) => item.key === col.parent.key);
        const value = row.editing ? readControl(rowEl(row)?.querySelector(`:scope > [data-col="${CSS.escape(col.parent.key)}"]`), parentCol || col) : row.values[col.parent.key];
        const meta = parentCol ? optionMeta(parentCol, value) : null;
        return meta?.code || value || "";
      }
      const scope = root.closest("form, [data-fb-preview-body], [data-fo-step-panel], .e-permits-fo-form") || document;
      const field = scope.querySelector(`#${CSS.escape(col.parent.domId)}`)?.closest(".e-permits-fo-field");
      const value = field ? readControl(field, { type: "select" }) : "";
      const meta = (col.parent.meta || []).find((item) => item.label === value);
      return meta?.code || value || "";
    }
    function optionsFor(col, row) {
      const all = col.meta?.length ? col.meta : (col.options || []).map((label) => ({ label }));
      if (!col.parent) return all.map((item) => item.label);
      const parent = parentValue(col, row);
      return parent ? all.filter((item) => !item.parent || item.parent === parent).map((item) => item.label) : [];
    }

    /* ---- render */
    function render() {
      if (state.source === "loading") return;
      body.innerHTML = state.rows.length ? state.rows.map((row, i) => (row.editing ? editRowHtml(def, row, i + 1, ctl) : viewRowHtml(def, row, i + 1))).join("") : emptyRowHtml(def);
      state.rows.forEach((row) => { insertDetails(row); if (row.editing) prepareEdit(row); });
      sync();
    }
    function insertDetails(row) {
      let after = rowEl(row);
      def.columns.filter((col) => col.type === "grid").forEach((col) => {
        let detail = body.querySelector(`:scope > [data-fo-grid-detail="${row.id}:${col.key}"]`);
        if (!detail) {
          detail = document.createElement("tr");
          detail.className = "table__row e-permits-fo-grid__detail";
          detail.setAttribute("role", "row");
          detail.dataset.foGridDetail = `${row.id}:${col.key}`;
          detail.id = detailId(def, row, col);
          detail.hidden = !row.open?.[col.key];
          detail.innerHTML = `<td class="table__body-cell" role="cell" colspan="${unitsOf(def) + 2}"></td>`;
        }
        after.insertAdjacentElement("afterend", detail);
        after = detail;
        if (!detail.hidden) openNested(row, col);
      });
    }
    function openNested(row, col) {
      const detail = body.querySelector(`:scope > [data-fo-grid-detail="${row.id}:${col.key}"]`);
      if (!detail) return null;
      if (!row.nested) row.nested = {};
      if (!row.nested[col.key]) {
        const nestedDef = { ...col.grid, id: `${def.id}-${row.id}-${col.key}`, label: `${col.label} · ${def.texts.row || "Rând"} ${numberOf(row)}`, value: row.values[col.key] || [], level: (def.level || 1) + 1 };
        const td = detail.querySelector("td");
        td.innerHTML = gridHtml(nestedDef);
        const nestedRoot = td.querySelector("[data-fo-grid]");
        bindControls(nestedRoot);
        row.nested[col.key] = createGrid(nestedRoot, nestedDef);
        nestedRoot.addEventListener("fo-grid-change", () => updateNestedToggle(row, col));
      }
      return row.nested[col.key];
    }
    function updateNestedToggle(row, col) {
      const toggle = rowEl(row)?.querySelector(`[data-fo-grid-nested="${CSS.escape(col.key)}"] > span`);
      if (toggle) toggle.textContent = plural(nestedCount(row, col), "rând", "rânduri");
    }
    /* edit mode: bind the FO controls, apply the group rule, keep cascades in step */
    function prepareEdit(row) {
      const el = rowEl(row);
      if (!el) return;
      /* values the FO renderer cannot preselect (multi-select options): marked before the FO
         binding, whose first summary then draws the chips */
      def.columns.filter((col) => col.type === "multiselect").forEach((col) => {
        const values = row.values[col.key] || [];
        el.querySelector(`:scope > [data-col="${CSS.escape(col.key)}"]`)?.querySelectorAll(".e-permits-fo-subgen-select__option").forEach((option) => {
          const on = values.includes(option.dataset.value);
          option.classList.toggle("is-selected", on);
          option.setAttribute("aria-selected", String(on));
          const box = option.querySelector(".checkbox-input");
          if (box) box.checked = on;
        });
      });
      bindControls(el);
      applyGroupRule(row);
    }
    function applyGroupRule(row) {
      const col = def.columns.find((item) => item.key === rules.group);
      if (!col) return;
      const group = activeGroup(row);
      const cell = rowEl(row)?.querySelector(`:scope > [data-col="${CSS.escape(col.key)}"]`);
      cell?.querySelectorAll(".e-permits-fo-select__option").forEach((option) => {
        const off = Boolean(group) && groupOf(col, option.dataset.value) !== group;
        option.classList.toggle("is-disabled", off);
        option.setAttribute("aria-disabled", String(off));
        if (off) option.dataset.tooltipReason = `Din altă grupă decât ${groupName(def, group)}`; else delete option.dataset.tooltipReason;
      });
    }
    function syncGroupNote() {
      const note = root.querySelector(":scope > [data-fo-grid-group-note] p");
      const col = def.columns.find((item) => item.key === rules.group);
      if (!note || !col) return;
      note.textContent = groupText(def, col.label, activeGroup(null), "rândurile");
    }
    function sync() {
      const count = state.rows.length;
      const full = max > 0 && count >= max;
      if (addButton) {
        const blocked = full || state.source === "loading" || (state.source === "error" && !state.manual);
        if (blocked) addButton.setAttribute("aria-disabled", "true"); else addButton.removeAttribute("aria-disabled");
        if (full) addButton.dataset.tooltipReason = maxText(def, max, true); else delete addButton.dataset.tooltipReason;
      }
      if (limit) {
        limit.hidden = !full;
        limit.textContent = full ? maxText(def, max, true) : "";
      }
      /* rows per page (US-35 AC-06): the other pages stay in the DOM, hidden (edits survive) */
      const pages = pageSize ? Math.max(1, Math.ceil(count / pageSize)) : 1;
      state.page = Math.min(state.page, pages);
      state.rows.forEach((row, i) => {
        const on = !pageSize || Math.floor(i / pageSize) + 1 === state.page;
        const el = rowEl(row);
        if (el) el.hidden = !on;
        body.querySelectorAll(`:scope > [data-fo-grid-detail^="${row.id}:"]`).forEach((detail) => { detail.hidden = !on || !row.open?.[detail.dataset.foGridDetail.split(":")[1]]; });
      });
      if (pager) {
        pager.hidden = pages < 2;
        pager.innerHTML = pages < 2 ? "" : `
          <span class="pagination__item"><button class="pagination__link pagination__link--text${state.page === 1 ? " pagination__link--disabled" : ""}" type="button" aria-label="Pagina anterioară" data-fo-grid-page="${state.page - 1}"${state.page === 1 ? " disabled" : ""}>${icon("icon-chevron-left", 16)}</button></span>
          ${Array.from({ length: pages }, (_, i) => `<span class="pagination__item"><button class="pagination__link${i + 1 === state.page ? " pagination__link--active" : ""}" type="button" aria-label="Pagina ${i + 1}"${i + 1 === state.page ? ' aria-current="page"' : ""} data-fo-grid-page="${i + 1}">${i + 1}</button></span>`).join("")}
          <span class="pagination__item"><button class="pagination__link pagination__link--text${state.page === pages ? " pagination__link--disabled" : ""}" type="button" aria-label="Pagina următoare" data-fo-grid-page="${state.page + 1}"${state.page === pages ? " disabled" : ""}>${icon("icon-chevron-right", 16)}</button></span>`;
      }
      syncGroupNote();
      root.classList.toggle("has-rows", count > 0);
      root.dispatchEvent(new CustomEvent("fo-grid-change", { bubbles: false }));
    }
    function renumber() {
      state.rows.forEach((row, i) => {
        const el = rowEl(row);
        const num = el?.querySelector("[data-fo-grid-num]");
        const tag = el?.querySelector("[data-fo-grid-tag]");
        if (num) num.textContent = String(i + 1);
        if (tag) tag.textContent = `#${i + 1}`;
      });
    }
    function swapRow(row) {
      const el = rowEl(row);
      const html = row.editing ? editRowHtml(def, row, numberOf(row), ctl) : viewRowHtml(def, row, numberOf(row));
      el.insertAdjacentHTML("afterend", html);
      el.remove();
      if (row.editing) prepareEdit(row);
      sync();
    }

    /* ---- row actions (US-35) */
    function startEdit(row, focusKey = "") {
      if (row.editing) return;
      if (locked()) { live(root, "Listele grilei nu s-au încărcat: apasă „Reîncearcă” sau „Introdu manual”."); return; }
      row.snapshot = { ...row.values };
      row.editing = true;
      swapRow(row);
      focusIn(row, focusKey);
      live(root, `Rândul ${numberOf(row)} se editează. Enter salvează, Esc anulează.`);
    }
    function focusIn(row, key = "") {
      window.setTimeout(() => {
        const el = rowEl(row);
        const cell = key ? el?.querySelector(`:scope > [data-col="${CSS.escape(key)}"]`) : el?.querySelector(":scope > .e-permits-fo-grid__cell:not([data-type='grid'])");
        (cell?.querySelector("input:not([type='hidden']):not([type='search']):not(:disabled), button:not(:disabled)"))?.focus();
      }, 20);
    }
    function validateRow(row, { mark = true } = {}) {
      const el = rowEl(row);
      const values = readRow(row);
      let first = null;
      let count = 0;
      if (mark && el) clearErrors(el);
      def.columns.forEach((col) => {
        if (col.type === "grid") return;
        const cell = el?.querySelector(`:scope > [data-col="${CSS.escape(col.key)}"]`);
        let message = checkValue(state.manual && ["select", "combobox"].includes(col.type) ? { ...col, type: "text" } : col, values[col.key]);
        /* key column: a value already in another row is refused (US-36 AC-03) */
        if (!message && rules.key === col.key && !isEmpty(values[col.key])) {
          const mine = JSON.stringify(values[col.key]).toLowerCase();
          if (state.rows.some((other) => other !== row && JSON.stringify(readRow(other)[col.key] ?? "").toLowerCase() === mine)) message = def.texts.duplicate || "Dvstră ați înregistrat deja această valoare.";
        }
        if (!message) return;
        count += 1;
        if (mark && row.editing) { const target = markError(cell, col, message); first = first || target; }
        });
      return { count, first, values };
    }
    function save(row) {
      const result = validateRow(row);
      if (result.count) {
        result.first?.focus?.();
        live(root, `Rândul ${numberOf(row)} are ${plural(result.count, "eroare", "erori")}; nu s-a salvat.`);
        return false;
      }
      row.values = result.values;
      row.saved = true;
      row.editing = false;
      row.isNew = false;
      delete row.snapshot;
      swapRow(row);
      state.rows.filter((other) => other.editing).forEach(applyGroupRule);
      rowEl(row)?.querySelector("[data-fo-grid-act='edit']")?.focus();
      live(root, `Rândul ${numberOf(row)} a fost salvat.`);
      return true;
    }
    function cancel(row) {
      if (row.isNew) { removeRow(row, { silent: true }); live(root, "Rândul nou a fost anulat."); addButton?.focus(); return; }
      row.values = row.snapshot || row.values;
      row.editing = false;
      delete row.snapshot;
      swapRow(row);
      rowEl(row)?.querySelector("[data-fo-grid-act='edit']")?.focus();
      live(root, `Modificările din rândul ${numberOf(row)} au fost anulate.`);
    }
    function add() {
      if (!addButton || addButton.getAttribute("aria-disabled") === "true") {
        if (max && state.rows.length >= max) live(root, maxText(def, max, true));
        return;
      }
      const values = {};
      def.columns.forEach((col) => { if (col.defaultValue !== undefined && col.defaultValue !== "") values[col.key] = col.defaultValue; });
      const row = { id: rid(), values, saved: false, editing: true, isNew: true, open: {} };
      state.rows.push(row);
      body.querySelector(":scope > [data-fo-grid-empty]")?.remove();
      body.insertAdjacentHTML("beforeend", editRowHtml(def, row, state.rows.length, ctl));
      insertDetails(row);
      prepareEdit(row);
      if (pageSize) state.page = Math.ceil(state.rows.length / pageSize);
      sync();
      focusIn(row);
      live(root, `Rândul ${state.rows.length} a fost adăugat. Completează-l și apasă Enter.`);
    }
    function removeRow(row, { silent = false } = {}) {
      const index = state.rows.indexOf(row);
      rowEl(row)?.remove();
      body.querySelectorAll(`:scope > [data-fo-grid-detail^="${row.id}:"]`).forEach((detail) => detail.remove());
      state.rows.splice(index, 1);
      if (!state.rows.length) body.innerHTML = emptyRowHtml(def);
      renumber();
      sync();
      state.rows.filter((other) => other.editing).forEach(applyGroupRule);
      if (!silent) {
        const next = state.rows[index] || state.rows[index - 1];
        (next ? rowEl(next)?.querySelector("[data-fo-grid-act='edit'], [data-fo-grid-act='save']") : addButton)?.focus();
        live(root, `Rândul ${index + 1} a fost șters.`);
      }
    }
    /* Delete asks first (US-35 AC-04) — the FO confirm dialog, destructive */
    function confirmDelete(row) {
      const n = numberOf(row);
      const summary = def.columns.filter((col) => col.type !== "grid").map((col) => formatValue(col, readRow(row)[col.key])).filter(Boolean).slice(0, 2).join(" · ");
      openConfirm({
        title: `Ștergi rândul ${n}?`,
        text: `${summary ? `„${summary}” ` : ""}dispare din ${def.label ? `„${def.label}”` : "grilă"}${def.columns.some((col) => col.type === "grid") ? ", împreună cu rândurile din grilele lui" : ""}.`,
        confirm: "Șterge rândul",
        onConfirm: () => removeRow(row),
        returnFocus: rowEl(row)?.querySelector("[data-fo-grid-act='delete']"),
      });
    }
    function toggleNested(row, col) {
      row.open = row.open || {};
      row.open[col.key] = !row.open[col.key];
      const detail = body.querySelector(`:scope > [data-fo-grid-detail="${row.id}:${col.key}"]`);
      if (detail) detail.hidden = !row.open[col.key];
      rowEl(row)?.querySelector(`[data-fo-grid-nested="${CSS.escape(col.key)}"]`)?.setAttribute("aria-expanded", String(row.open[col.key]));
      if (row.open[col.key]) openNested(row, col);
    }

    /* ---- events (scoped: a nested grid handles its own) */
    const own = (event) => event.target.closest("[data-fo-grid]") === root;
    root.addEventListener("click", (event) => {
      if (!own(event)) return;
      const page = event.target.closest("[data-fo-grid-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.foGridPage); sync(); pager.querySelector(`[data-fo-grid-page="${state.page}"][aria-current]`)?.focus(); return; }
      if (event.target.closest("[data-fo-grid-add]")) { add(); return; }
      if (event.target.closest("[data-fo-grid-retry]")) { retrySource(); return; }
      if (event.target.closest("[data-fo-grid-manual]")) { state.manual = true; state.source = ""; root.removeAttribute("data-source"); root.querySelector(":scope > [data-fo-grid-source]")?.remove(); render(); live(root, "Listele nu sunt disponibile: completează valorile manual."); return; }
      const tr = event.target.closest("[data-fo-grid-row]");
      const row = tr ? rowById(tr.dataset.foGridRow) : null;
      if (!row) return;
      const nested = event.target.closest("[data-fo-grid-nested]");
      if (nested) { toggleNested(row, def.columns.find((col) => col.key === nested.dataset.foGridNested)); return; }
      const act = event.target.closest("[data-fo-grid-act]")?.dataset.foGridAct;
      if (act === "edit") { startEdit(row); return; }
      if (act === "save") { save(row); return; }
      if (act === "cancel") { cancel(row); return; }
      if (act === "delete") { confirmDelete(row); return; }
      const cell = event.target.closest("[data-fo-grid-cell]");
      if (cell) startEdit(row, cell.dataset.foGridCell);
    });
    /* Enter saves, Esc cancels — unless a list / calendar of the cell is open (Esc closes it first) */
    const openIn = (tr) => tr.querySelector(".e-permits-fo-select.is-open, .e-permits-fo-subgen-select.is-open, .e-permits-fo-caem.is-open, .date-picker-panel:not([hidden])");
    ctl.escape = (tr) => {
      const row = rowById(tr.dataset.foGridRow);
      if (!row) return;
      const open = openIn(tr);
      if (!open) { cancel(row); return; }
      if (open.matches(".date-picker-panel")) {
        open.hidden = true;
        open.setAttribute("aria-hidden", "true");
        const toggle = open.closest("[data-date-picker]")?.querySelector(".js-date-picker-toggle");
        toggle?.setAttribute("aria-expanded", "false");
        toggle?.focus();
        return;
      }
      open.querySelector(".e-permits-fo-select__button, [data-fo-subgen-button], [data-fo-caem-button]")?.click();
    };
    root.addEventListener("keydown", (event) => {
      if (!own(event)) return;
      const tr = event.target.closest("[data-fo-grid-row].is-editing");
      if (!tr) return;
      const row = rowById(tr.dataset.foGridRow);
      if (!row) return;
      const busy = openIn(tr);
      if (event.key === "Escape" && !busy) { event.preventDefault(); event.stopPropagation(); cancel(row); return; }
      if (event.key === "Enter" && !busy && event.target.matches("input[type='text'], input:not([type])") && !event.target.closest("[data-date-picker]")) { event.preventDefault(); save(row); }
    }, true);
    /* an edit clears that cell's error; a parent change resets its dependent cells (US-37 AC-03) */
    const onEdit = (event) => {
      if (!own(event)) return;
      const cell = event.target.closest(".e-permits-fo-grid__cell");
      if (cell?.querySelector("[data-fo-repeat-error], [aria-invalid='true']")) clearErrors(cell);
      const tr = cell?.closest("[data-fo-grid-row].is-editing");
      const row = tr ? rowById(tr.dataset.foGridRow) : null;
      if (!row) return;
      const key = cell.dataset.col;
      def.columns.filter((col) => col.parent?.kind === "column" && col.parent.key === key).forEach((child) => refreshCell(row, child));
      if (key === rules.group) state.rows.filter((other) => other.editing && other !== row).forEach(applyGroupRule);
    };
    root.addEventListener("fo-select-change", onEdit);
    root.addEventListener("input", onEdit);
    root.addEventListener("change", onEdit);
    function refreshCell(row, col) {
      const el = rowEl(row);
      const cell = el?.querySelector(`:scope > [data-col="${CSS.escape(col.key)}"]`);
      if (!cell) return;
      const draft = { ...row, values: { ...readRow(row), [col.key]: col.type === "multiselect" ? [] : "" } };
      cell.innerHTML = ctx.fieldHtml(cellField(def, col, draft, ctl));
      bindControls(cell);
      if (col.key === rules.group) applyGroupRule(row);
    }
    /* a form field that columns depend on: reset those cells in the rows being edited */
    const formScope = root.closest("[data-fb-preview-body], [data-fo-step-panel], form") || document;
    const parents = def.columns.filter((col) => col.parent?.kind === "field");
    if (parents.length) {
      formScope.addEventListener("fo-select-change", (event) => {
        if (root.contains(event.target)) return;
        const changedId = event.target.querySelector?.(".e-permits-fo-select__button")?.id || "";
        parents.filter((col) => col.parent.domId === changedId).forEach((col) => state.rows.filter((row) => row.editing).forEach((row) => refreshCell(row, col)));
      });
    }
    function retrySource() {
      state.source = "loading";
      root.dataset.source = "loading";
      root.querySelector(":scope > [data-fo-grid-source]")?.remove();
      body.innerHTML = skeletonRowsHtml(def);
      sync();
      live(root, "Se încarcă datele grilei…");
      window.setTimeout(() => {
        state.source = "";
        root.removeAttribute("data-source");
        if (state.rows[0] && !state.rows[0].saved) state.rows[0].editing = true;
        render();
        live(root, "Datele grilei s-au încărcat.");
      }, 700);
    }

    /* ---- whole-grid checks for „Validează” / „Înainte” (US-36 AC-02): rows being edited are saved
       (or show their errors), saved rows re-checked, min rows, nested grids */
    function validate() {
      root.querySelectorAll(":scope > [data-fo-repeat-error]").forEach((node) => node.remove());
      let count = 0;
      let first = null;
      state.rows.forEach((row) => {
        if (row.editing) {
          const ok = save(row);
          if (!ok) { count += 1; first = first || rowEl(row)?.querySelector("[aria-invalid='true']"); }
        } else if (validateRow(row, { mark: false }).count) {
          /* a saved row that no longer passes (or a default row never filled) opens with its errors */
          row.snapshot = { ...row.values };
          row.editing = true;
          swapRow(row);
          validateRow(row);
          count += 1;
          first = first || rowEl(row)?.querySelector("[aria-invalid='true']");
        }
        def.columns.filter((col) => col.type === "grid").forEach((col) => {
          const needs = (row.values[col.key] || []).length || Number(col.grid?.rules?.min) || col.grid?.required;
          if (!needs && !row.nested?.[col.key]) return;
          if (!row.open?.[col.key]) toggleNested(row, col);
          const inner = row.nested?.[col.key]?.validate();
          if (inner?.count) { count += inner.count; first = first || inner.first; }
        });
      });
      if (min && state.rows.length < min) {
        count += 1;
        const message = minText(def, min, true);
        root.querySelector(":scope > .e-permits-fo-grid__foot").insertAdjacentHTML("beforebegin", errorHtml(message));
        first = first || addButton;
      }
      return { count, first };
    }
    /* „Completează cu date de test”: two plausible saved rows */
    function fill() {
      const sample = (col, n, row) => {
        switch (col.type) {
          case "text": { const base = col.placeholder ? col.placeholder.replace(/^Ex\.?:?\s*/i, "") : col.label; return n === 1 ? base : `${base} ${n}`; }
          case "number": return String((Number(col.min) || 0) + 10 * n);
          case "money": return `${150 * n}.00`;
          case "date": return ctx?.localIsoDay?.(7 * n) || todayIso();
          case "checkbox": return n === 1;
          case "radio": return (col.radio || [])[n - 1]?.value || (col.radio || [])[0]?.value || "";
          case "select": { const options = optionsFor(col, row); return options[(n - 1) % Math.max(options.length, 1)] || ""; }
          case "multiselect": { const options = optionsFor(col, row); return options.slice(0, 1); }
          case "grid": return [{ values: {} }];
          default: return "";
        }
      };
      const keyCol = def.columns.find((col) => col.key === rules.group);
      state.rows = [];
      const count = Math.max(1, Math.min(2, max || 2));
      for (let n = 1; n <= count; n += 1) {
        const row = { id: rid(), values: {}, saved: true, editing: false, isNew: false, open: {} };
        def.columns.forEach((col) => {
          if (col.type === "grid") { row.values[col.key] = []; return; }
          row.values[col.key] = sample(col, n, row);
          if (keyCol && col === keyCol && n > 1) {
            const group = groupOf(col, state.rows[0]?.values[col.key]);
            const same = optionsFor(col, row).find((label) => groupOf(col, label) === group && label !== state.rows[0]?.values[col.key]);
            if (same) row.values[col.key] = same;
          }
        });
        state.rows.push(row);
      }
      render();
    }

    render();
    layout(root);
    observer?.observe(root);
    return ctl;
  }

  /* ================================================================== REPEATABLE BLOCK */
  function childOut(def, child, item) {
    const id = `${def.id}-${item.id}-${child.key}`;
    const value = item.values?.[child.key];
    const base = { id, type: child.type, label: child.label, required: Boolean(child.required), span: Number(child.span) || 12, placeholder: child.placeholder || "", hint: child.hint || "", readOnly: Boolean(child.readOnly), value: value ?? (child.defaultValue || "") };
    switch (child.type) {
      case "number": case "money": return { ...base, unit: child.unit || (child.type === "money" ? "MDL" : ""), decimals: child.decimals || 0 };
      case "text": return { ...base, maxLength: child.maxLength || "" };
      case "textarea": return { ...base, rows: child.rows || 2, maxLength: child.maxLength || "", charCounter: Boolean(child.counter) };
      case "select": return { ...base, options: child.options || [] };
      case "multiselect": return { ...base, value: [], options: child.options || [] };
      case "checkbox": return { ...base, value: Boolean(value) };
      case "radio": case "segment": case "checklist": return { ...base, value: child.type === "checklist" ? value || [] : value || "", options: child.radio || [], orientation: child.orientation };
      case "info": return { ...base, text: child.text || "", tone: child.tone || "neutral" };
      default: return base;
    }
  }
  /* one element card = the FO activity card; a searchable list + the multi-select that depends on it
     = the exact CAEM pair (Codul CAEM combobox + „Subgen de activitate” under its guide line) */
  function itemHtml(def, item, n, count) {
    const min = Math.max(Number(def.rules.min) || 0, def.required ? 1 : 0);
    /* the first card of a block with a minimum has no remove (as the FO activities); sync() hides
       the others while the count is at the minimum */
    const canRemove = def.rules.allowRemove !== false && !(n === 1 && min >= 1) && count > min;
    const title = def.texts.title || "Element";
    const parts = [];
    let group = [];
    const flush = () => { if (group.length) { parts.push(`<div class="e-permits-fo-field-group e-permits-fo-repeat__fields">${group.join("")}</div>`); group = []; } };
    def.fields.forEach((child) => {
      if (child.type === "multiselect" && child.parent && def.fields.some((other) => other.key === child.parent.key && other.type === "combobox")) return;
      if (child.type === "combobox") {
        flush();
        const dep = def.fields.find((other) => other.type === "multiselect" && other.parent?.key === child.key);
        parts.push(tagFirst(ctx.caemFieldHtml({ id: domIdOf(`${def.id}-${item.id}-${child.key}`), label: child.label, required: Boolean(child.required), placeholder: child.placeholder || "Selectează", options: child.options || [] }), `data-fo-repeat-child="${esc(child.ref)}" data-fo-repeat-key="${esc(child.key)}"`));
        if (dep) parts.push(tagFirst(ctx.subgenHtml({ id: domIdOf(`${def.id}-${item.id}-${dep.key}`), menuId: domIdOf(`${def.id}-${item.id}-${dep.key}-menu`), label: dep.label, required: Boolean(dep.required), placeholder: dep.placeholder || "Alege opțiunile" }), `data-fo-repeat-child="${esc(dep.ref)}" data-fo-repeat-key="${esc(dep.key)}"`));
        return;
      }
      group.push(tagFirst(ctx.fieldHtml(childOut(def, child, item)), `data-fo-repeat-child="${esc(child.ref)}" data-fo-repeat-key="${esc(child.key)}"`));
    });
    flush();
    const itemId = `${domIdOf(def.id)}-${item.id}`;
    return `
      <div class="e-permits-fo-activity-card e-permits-fo-repeat__item" role="group" aria-labelledby="${esc(itemId)}-title" data-fo-repeat-item="${item.id}">
        <div class="e-permits-fo-activity-card__header">
          <div class="e-permits-fo-activity-card__title" id="${esc(itemId)}-title"><span data-fo-repeat-index>#${n}</span><strong>${esc(title)}</strong></div>
          ${canRemove ? `<button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Șterge ${esc(title.toLowerCase())} #${n}" data-tooltip-label="Șterge" data-fo-repeat-remove><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-delete"></use></svg></button>` : ""}
        </div>
        ${parts.join("")}
      </div>`;
  }
  function blockHtml(def, context) {
    if (context) ctx = context;
    const id = domIdOf(def.id);
    def.rules = def.rules || {};
    def.texts = def.texts || {};
    defs.set(id, def);
    const source = def.usesSource && SOURCE === "indisponibila" ? "error" : "";
    const count = Math.max(Number(def.rules.defaultRows) || 0, Math.max(Number(def.rules.min) || 0, def.required ? 1 : 0), Array.isArray(def.value) ? def.value.length : 0, 1);
    const items = Array.from({ length: count }, (_, i) => ({ id: `i${i + 1}`, values: (Array.isArray(def.value) && def.value[i]) || {} }));
    const groupChild = def.fields.find((child) => child.key === def.rules.group);
    return `
      <fieldset class="e-permits-fo-repeat e-permits-fo-field--span-12" id="${esc(id)}" data-fo-repeat="${esc(id)}"${def.hint ? ` aria-describedby="${esc(id)}-hint"` : ""}${source ? ` data-source="${source}"` : ""}>
        <legend class="e-permits-fo-choice__legend${def.labelHidden ? " u-visually-hidden" : ""}">${esc(def.label || "")}${def.required ? ` ${star()}` : ""}</legend>
        ${def.hint ? `<p class="e-permits-fo-field__hint" id="${esc(id)}-hint">${esc(def.hint)}</p>` : ""}
        ${def.texts.note ? ui().renderInfoNote?.(esc(def.texts.note)) || "" : ""}
        ${groupChild ? `<div data-fo-repeat-group-note>${ui().renderInfoNote?.(esc(groupText(def, groupChild.label, "", "elementele"))) || ""}</div>` : ""}
        ${sourceNoticeHtml(source, true)}
        <div class="e-permits-fo-repeat__list" data-fo-repeat-list>
          ${source ? "" : items.map((item, i) => itemHtml(def, item, i + 1, items.length)).join("")}
        </div>
        <button class="e-permits-fo-add-activity" type="button" data-fo-repeat-add${source ? ' aria-disabled="true"' : ""}>${icon("icon-plus-small")}<span>${esc(def.texts.add || "Adaugă alt element")}</span></button>
        <p class="e-permits-fo-field__hint e-permits-fo-repeat__limit" data-fo-repeat-limit hidden></p>
        <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-repeat-live></p>
      </fieldset>`;
  }

  function createBlock(root, def) {
    if (root.foRepeatCtl) return root.foRepeatCtl;
    const list = root.querySelector(":scope > [data-fo-repeat-list]");
    const addButton = root.querySelector(":scope > [data-fo-repeat-add]");
    const limit = root.querySelector(":scope > [data-fo-repeat-limit]");
    const rules = def.rules;
    const max = Number(rules.max) || 0;
    const min = Math.max(Number(rules.min) || 0, def.required ? 1 : 0);
    const title = def.texts.title || "Element";
    let seqItem = list.children.length;
    const items = () => [...list.querySelectorAll(":scope > [data-fo-repeat-item]")];
    const childEl = (item, key) => item.querySelector(`[data-fo-repeat-key="${CSS.escape(key)}"]`);
    const valueOf = (item, child) => {
      const el = childEl(item, child.key);
      if (child.type === "multiselect" && el?.matches("[data-fo-subgen]") && el.hidden) return [];
      return readControl(el, child);
    };
    const ctl = {
      root, def,
      count: () => items().length,
      value: () => items().map((item) => Object.fromEntries(def.fields.filter((child) => child.type !== "info").map((child) => [child.key, valueOf(item, child)]))),
      validate,
      fill,
      items,
      reset: () => { list.innerHTML = ""; addItem({ silent: true }); },
    };
    root.foRepeatCtl = ctl;

    function sync() {
      const all = items();
      const keyChild = def.fields.find((child) => child.key === rules.key);
      const groupChild = def.fields.find((child) => child.key === rules.group);
      const chosen = keyChild ? all.map((item) => valueOf(item, keyChild)) : [];
      const group = groupChild ? all.map((item) => groupOf(groupChild, valueOf(item, groupChild))).find(Boolean) || "" : "";
      all.forEach((item, i) => {
        const index = item.querySelector("[data-fo-repeat-index]");
        if (index) index.textContent = `#${i + 1}`;
        const remove = item.querySelector("[data-fo-repeat-remove]");
        if (remove) { remove.hidden = (min >= 1 && i === 0) || all.length <= min; remove.setAttribute("aria-label", `Șterge ${title.toLowerCase()} #${i + 1}`); }
        /* key: values taken by another element are off; group: other groups are off (US-40 AC-02/03) */
        [keyChild, groupChild].filter(Boolean).forEach((child) => {
          const el = childEl(item, child.key);
          const own = valueOf(item, child);
          const othersGroup = groupChild ? all.filter((other) => other !== item).map((other) => groupOf(groupChild, valueOf(other, groupChild))).find(Boolean) || "" : "";
          el?.querySelectorAll(".e-permits-fo-caem__option, .e-permits-fo-select__option").forEach((option) => {
            const value = option.dataset.code || option.dataset.value;
            const taken = keyChild && child === keyChild && chosen.some((other, j) => j !== i && other === value) && value !== own;
            const outside = groupChild && child === groupChild && othersGroup && groupOf(groupChild, value) !== othersGroup;
            const off = Boolean(taken || outside);
            option.classList.toggle("is-disabled", off);
            option.setAttribute("aria-disabled", String(off));
          });
        });
        /* a code without sub-options (US-40 AC-04) */
        def.fields.filter((child) => child.type === "combobox").forEach((child) => {
          const dep = def.fields.find((other) => other.type === "multiselect" && other.parent?.key === child.key);
          const field = childEl(item, child.key);
          if (!dep || !field) return;
          const code = valueOf(item, child);
          const option = (child.options || []).find((entry) => entry.code === code);
          const none = Boolean(code) && !(option?.subgenres || []).length;
          let hint = field.querySelector(":scope > [data-fo-repeat-nosub]");
          if (none && !hint) { field.insertAdjacentHTML("beforeend", `<p class="e-permits-fo-field__hint" data-fo-repeat-nosub>${esc(dep.emptyText || `Nicio opțiune „${dep.label}” disponibilă pentru acest cod.`)}</p>`); hint = true; }
          if (!none && hint) hint.remove();
        });
      });
      const note = root.querySelector(":scope > [data-fo-repeat-group-note] p");
      if (note && groupChild) note.textContent = groupText(def, groupChild.label, group, "elementele");
      const full = max > 0 && all.length >= max;
      if (addButton && root.dataset.source !== "error") {
        if (full) addButton.setAttribute("aria-disabled", "true"); else addButton.removeAttribute("aria-disabled");
        if (full) addButton.dataset.tooltipReason = maxText(def, max, false); else delete addButton.dataset.tooltipReason;
      }
      if (limit) { limit.hidden = !full; limit.textContent = full ? maxText(def, max, false) : ""; }
      root.dispatchEvent(new CustomEvent("fo-repeat-change", { bubbles: false }));
    }
    function addItem({ silent = false } = {}) {
      if (!silent && (!addButton || addButton.getAttribute("aria-disabled") === "true")) {
        if (max && items().length >= max) live(root, maxText(def, max, false));
        return null;
      }
      seqItem += 1;
      list.insertAdjacentHTML("beforeend", itemHtml(def, { id: `i${seqItem}${rid()}`, values: {} }, items().length + 1, Number.MAX_SAFE_INTEGER));
      const item = list.lastElementChild;
      bindControls(item);
      sync();
      if (!silent) {
        item.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        item.querySelector("button:not([data-fo-repeat-remove]):not(:disabled), input:not([type='hidden']):not(:disabled)")?.focus({ preventScroll: true });
        live(root, `S-a adăugat „${title} #${items().length}”.`);
      }
      return item;
    }
    /* remove at once + „Anulează” in the toast (the builder's delete pattern); the node itself is kept,
       so an undo brings back exactly what was typed */
    function removeItem(item) {
      const all = items();
      const index = all.indexOf(item);
      const label = `${title} #${index + 1}`;
      item.remove();
      sync();
      const next = items()[index] || items()[index - 1];
      (next?.querySelector("[data-fo-repeat-remove]:not([hidden])") || addButton)?.focus();
      /* no gender agreement with an admin-written title: the sentence is about the action */
      live(root, `Ai eliminat „${label}”.`);
      window.GEAPToast?.show({
        type: "info",
        message: `Ai eliminat „${label}”.`,
        action: {
          label: "Anulează",
          onClick: () => {
            if (item.isConnected) return;
            const now = items();
            if (max && now.length >= max) { live(root, maxText(def, max, false)); return; }
            list.insertBefore(item, now[index] || null);
            sync();
            item.querySelector("[data-fo-repeat-remove]")?.focus();
            live(root, `„${label}” este din nou în listă.`);
          },
        },
        duration: isDemoLink() ? 0 : 8000,
        key: `fo-repeat-${root.id}`,
      });
    }
    function validate() {
      root.querySelectorAll(":scope > [data-fo-repeat-error]").forEach((node) => node.remove());
      let count = 0;
      let first = null;
      items().forEach((item) => {
        clearErrors(item);
        def.fields.forEach((child) => {
          if (child.type === "info") return;
          const el = childEl(item, child.key);
          if (!el || el.closest("[hidden]")) return;
          let message = checkValue(child, valueOf(item, child));
          if (!message && child.key === rules.key) {
            const mine = valueOf(item, child);
            if (!isEmpty(mine) && items().some((other) => other !== item && JSON.stringify(valueOf(other, child)) === JSON.stringify(mine))) message = def.texts.duplicate || "Dvstră ați înregistrat deja această valoare.";
          }
          if (!message) return;
          count += 1;
          const target = markError(el.matches("[data-fo-subgen]") ? el.querySelector(".e-permits-fo-field") : el, child, message);
          first = first || target;
        });
      });
      if (min && items().length < min) {
        count += 1;
        addButton?.insertAdjacentHTML("beforebegin", errorHtml(minText(def, min, false)));
        first = first || addButton;
      }
      return { count, first };
    }
    function fill() {
      list.innerHTML = "";
      const want = Math.max(1, Math.min(2, max || 2));
      for (let n = 1; n <= want; n += 1) {
        const item = addItem({ silent: true });
        def.fields.forEach((child) => {
          const el = childEl(item, child.key);
          if (!el) return;
          if (child.type === "combobox") {
            const option = [...el.querySelectorAll(".e-permits-fo-caem__option:not(.is-disabled)")].find((entry) => JSON.parse(entry.dataset.subgenres || "[]").length) || el.querySelector(".e-permits-fo-caem__option:not(.is-disabled)");
            option?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
            sync();
          } else if (child.type === "multiselect") {
            const option = el.querySelector(".e-permits-fo-subgen-select__option");
            if (option && !option.classList.contains("is-selected")) option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
            el.querySelector("[data-fo-subgen-confirm]")?.click();
          } else if (["text", "number", "money", "email", "textarea"].includes(child.type)) {
            const input = el.querySelector("input, textarea");
            if (input) input.value = child.type === "number" ? String(10 * n) : child.type === "money" ? `${100 * n}.00` : child.type === "email" ? `contact${n}@exemplu.md` : child.placeholder ? child.placeholder.replace(/^Ex\.?:?\s*/i, "") : `${child.label} ${n}`;
          } else if (child.type === "select") {
            el.querySelector(".e-permits-fo-select__option:not(.is-disabled)")?.click();
          } else if (child.type === "checkbox") {
            const box = el.querySelector("input[type='checkbox']"); if (box) box.checked = true;
          } else if (child.type === "radio") {
            const radio = el.querySelector("input[type='radio']"); if (radio) radio.checked = true;
          }
        });
      }
      sync();
    }

    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-repeat]") !== root) return;
      if (event.target.closest("[data-fo-repeat-add]")) { addItem(); return; }
      if (event.target.closest("[data-fo-grid-retry]")) {
        root.querySelector(":scope > [data-fo-grid-source]")?.remove();
        root.dataset.source = "loading";
        list.innerHTML = `<div class="e-permits-fo-activity-card" aria-hidden="true"><span class="skeleton skeleton--text"></span><span class="skeleton skeleton--input"></span></div>`;
        live(root, "Se încarcă lista…");
        window.setTimeout(() => { root.removeAttribute("data-source"); addButton?.removeAttribute("aria-disabled"); list.innerHTML = ""; addItem({ silent: true }); live(root, "Lista s-a încărcat."); }, 700);
        return;
      }
      const remove = event.target.closest("[data-fo-repeat-remove]");
      if (remove) removeItem(remove.closest("[data-fo-repeat-item]"));
    });
    const onEdit = (event) => {
      if (event.target.closest("[data-fo-repeat]") !== root) return;
      const item = event.target.closest("[data-fo-repeat-item]");
      const child = event.target.closest("[data-fo-repeat-key]");
      if (child?.querySelector("[data-fo-repeat-error], [aria-invalid='true']")) clearErrors(child);
      if (item) window.setTimeout(sync, 0);
    };
    ["change", "input", "fo-select-change"].forEach((type) => root.addEventListener(type, onEdit));
    /* a code picked in the CAEM list (its options act on mousedown / Enter) */
    root.addEventListener("mousedown", (event) => { if (event.target.closest(".e-permits-fo-caem__option") && event.target.closest("[data-fo-repeat]") === root) window.setTimeout(sync, 0); });
    sync();
    return ctl;
  }

  /* ---------------------------------------------------------------- shared */
  /* the FO confirm dialog (instance-switch component), destructive, appended after any overlay */
  let confirmPending = null;
  function openConfirm({ title, text, confirm, onConfirm, returnFocus }) {
    const modal = document.querySelector("[data-fo-grid-confirm]");
    if (!modal) { if (window.confirm(`${title}\n${text}`)) onConfirm(); return; }
    if (modal.parentElement !== document.body || modal.nextElementSibling) document.body.appendChild(modal);
    modal.querySelector("[data-fo-grid-confirm-title]").textContent = title;
    modal.querySelector("[data-fo-grid-confirm-text]").textContent = text;
    modal.querySelector("[data-fo-grid-confirm-ok]").textContent = confirm;
    confirmPending = { onConfirm, returnFocus };
    if (ctx?.setModalHidden) ctx.setModalHidden(modal, false); else modal.hidden = false;
    document.body.classList.add("is-fo-modal-open");
    window.setTimeout(() => modal.querySelector("[data-fo-grid-confirm-cancel]")?.focus(), 30);
  }
  function closeConfirm(run) {
    const modal = document.querySelector("[data-fo-grid-confirm]");
    if (!modal) return;
    if (ctx?.setModalHidden) ctx.setModalHidden(modal, true); else modal.hidden = true;
    document.body.classList.remove("is-fo-modal-open");
    const pending = confirmPending;
    confirmPending = null;
    if (run) pending?.onConfirm?.();
    else pending?.returnFocus?.focus?.();
  }
  document.addEventListener("click", (event) => {
    const modal = event.target.closest?.("[data-fo-grid-confirm]");
    if (!modal) return;
    if (event.target.closest("[data-fo-grid-confirm-ok]")) closeConfirm(true);
    else if (event.target.closest("[data-fo-grid-confirm-cancel]") || event.target === modal) closeConfirm(false);
  });
  document.addEventListener("keydown", (event) => {
    const modal = document.querySelector("[data-fo-grid-confirm]");
    if (!modal || modal.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeConfirm(false); return; }
    if (event.key === "Tab") {
      const focusables = [...modal.querySelectorAll("button")];
      const i = focusables.indexOf(document.activeElement);
      event.preventDefault();
      focusables[(i + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length]?.focus();
    }
  }, true);

  function bindControls(el) {
    if (!el) return;
    if (window.GEAPFormRender?.bind) window.GEAPFormRender.bind(el);
    else ctx?.bindControls?.(el);
  }
  function bind(root) {
    if (!root) return;
    const roots = [...(root.matches?.("[data-fo-grid], [data-fo-repeat]") ? [root] : []), ...root.querySelectorAll("[data-fo-grid], [data-fo-repeat]")];
    roots.forEach((el) => {
      const def = defs.get(el.id);
      if (!def) return;
      if (el.matches("[data-fo-grid]") && !el.foGridCtl) createGrid(el, def);
      if (el.matches("[data-fo-repeat]") && !el.foRepeatCtl) createBlock(el, def);
    });
  }
  const controllerOf = (el) => el?.foGridCtl || el?.foRepeatCtl || el?.querySelector?.("[data-fo-grid], [data-fo-repeat]")?.foGridCtl || el?.querySelector?.("[data-fo-repeat]")?.foRepeatCtl || null;

  window.GEAPFoRepeat = {
    setContext(context) { ctx = { ...(ctx || {}), ...context }; },
    /* the same FO confirm dialog for other FO parts ({ title, text, confirm, onConfirm, returnFocus }) —
       doc-upload-v1: „Alte documente” › Elimină (US-20 AC-08) */
    confirm: openConfirm,
    gridHtml,
    blockHtml,
    bind,
    /* for the builder Preview: { count, first } after marking the errors; row / item count; test data */
    validate: (el) => controllerOf(el)?.validate() || { count: 0, first: null },
    count: (el) => controllerOf(el)?.count() || 0,
    value: (el) => controllerOf(el)?.value() || [],
    fill: (el) => controllerOf(el)?.fill(),
    reset: (el) => controllerOf(el)?.reset(),
    formatValue,
    checkValue,
    /* table or cards for grids that are not bound (the builder's inert canvas) */
    layout,
    /* Esc from an editor that handles it first (the Form Builder): the delete dialog, an open list
       of a row being edited, or the row itself; true = handled */
    escape(target) {
      const modal = document.querySelector("[data-fo-grid-confirm]");
      if (modal && !modal.hidden) { closeConfirm(false); return true; }
      const tr = target?.closest?.("[data-fo-grid-row].is-editing");
      const ctl = tr?.closest("[data-fo-grid]")?.foGridCtl;
      if (!ctl?.escape) return false;
      ctl.escape(tr);
      return true;
    },
  };
})();
