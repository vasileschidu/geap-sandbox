/* Grilă editabilă (US-33…US-39) and Bloc repetabil (CAEM, US-40) — the request-form side of the
   Form Builder 1:N components (batch 4, 2026-10-13). Spec tools/persona-test/specs/svc/form-builder.md
   § C.8, components.md „Editable grid (FO)” and „Repeatable block (FO)”.

   ONE renderer: js/e-permits-acte-permisive.js dispatches `grid` / `repeat` from stepFieldHtml to
   window.GEAPFoRepeat.gridHtml / blockHtml and binds them from GEAPFormRender.bind; the builder canvas,
   its Preview and the request form all draw through it. Cells and block fields are drawn with the FO
   field renderer itself (ctx.fieldHtml = stepFieldHtml); the CAEM pair with the exact FO activity
   markup (ctx.caemFieldHtml / ctx.subgenHtml, extracted from activityCardHtml).

   Grid (row-cards-v1, 2026-11-20 — no table any more): every row = the „Alte documente” card. Edit = bordered
   card (#n + row name, „Anulează” · „Salvează”), the row's fields side by side on a 12-column grid (Îngustă 3 ·
   Medie 4 · Lată 6 · textarea / nested grid / sub-form 12), Enter saves, Esc cancels; saved = one line (#n ·
   values · „Editează” · „Elimină”, the line opens the edit); one row in edit at a time; per-field FO errors,
   „Adaugă rând” (`.e-permits-fo-add-activity`), Elimină with the FO confirm dialog, library pagination, nested
   grids (≤ 3 levels) and „Sub-formular” columns as sections of the edit card.
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
        if ((min != null && n < min) || (max != null && n > max)) return fillText(custom || "Introdu o valoare între {min} și {max}.", { min: min ?? "…", max: max ?? "…" });
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
        if (col.minSelected && value.length < Number(col.minSelected)) return fillText(custom || (Number(col.minSelected) === 1 ? "Alege cel puțin o opțiune." : "Selectează cel puțin {min} opțiuni."), { min: col.minSelected });
        if (col.maxSelected && value.length > Number(col.maxSelected)) return `Selectează cel mult ${col.maxSelected} opțiuni.`;
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

  /* fb-caem-v1 (2026-11-20): supplementary context is on demand — the block's / grid's `note` is the
     library „ⓘ” hint next to the label (no always-on card); the group rule shows only where it applies,
     as one muted line at the top of the open option list (`groupLineSync`), never on the page */
  const infoHtml = (text, label) => text ? `<button class="e-permits-fo-role-info" type="button" aria-label="${esc(`Detalii despre ${String(label || "").toLowerCase()}`)}" data-tooltip-hint="${esc(text)}" data-fo-info>${icon("icon-circle-info-filled", 16)}</button>` : "";
  function groupLineSync(field, text) {
    const caem = field?.querySelector("[data-fo-caem-menu]");
    const list = caem ? caem.querySelector("[data-fo-caem-list]") : field?.querySelector(".e-permits-fo-select__list");
    if (!list) return;
    let line = (caem || list).querySelector(caem ? ":scope > [data-fo-group-line]" : ":scope > [data-fo-group-line]");
    if (!text) { line?.remove(); return; }
    if (!line) {
      line = document.createElement(caem ? "p" : "li");
      line.className = "e-permits-fo-list-note";
      line.setAttribute("data-fo-group-line", "");
      if (!caem) line.setAttribute("role", "presentation");
      if (caem) list.before(line); else list.prepend(line);
    }
    line.textContent = text;
  }

  /* ================================================================== GRID — markup */
  /* row-cards-v1 (2026-11-20; PO: a row drawn one field per line is too long — fields side by side; user: NO tables
     any more, the „Alte documente” lifecycle). Every row is the other-doc card (`.e-permits-fo-doc-card`):
     EDIT  = bordered card, header `#n` + row name, „Anulează” · „Salvează” (no delete in edit); the row's fields on a
             12-column grid, gap 24 — Îngustă 3 · Medie / auto 4 · Lată 6 · textarea / nested grid / sub-form 12 (a
             section of the card under a line); one column on phones / narrow grids (container query).
     SAVED = no chrome: one line `#n` + the first values (key column first) „ · ” + the counts of nested grids /
             sub-forms, „Editează” + „Elimină”; the line itself opens the edit. Saved lines are divided by 1 px lines.
     One row in edit at a time (a blank new row is dropped, another one is saved first). */
  const isSub = (col) => col?.type === "subform";
  const isNest = (col) => col?.type === "grid" || isSub(col);
  const subFields = (col) => (col.fields || []).filter((field) => field.type !== "info");
  const subFilled = (col, values) => { const v = values || {}; const list = subFields(col); return { filled: list.filter((field) => !isEmpty(v[field.key])).length, total: list.length }; };
  const SPAN = { s: 3, m: 4, l: 6, f: 12 };
  const spanOf = (col) => (isNest(col) || col.type === "textarea" ? 12 : SPAN[col.width] || 4);
  /* a sub-form field keeps its form span (of 12), snapped to 3 · 4 · 6 · 12 */
  const fieldSpan = (field) => { const n = Number(field.span) || 12; return field.type === "textarea" ? 12 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 6 ? 6 : 12; };
  /* the layout is CSS only now (container queries); kept for callers that still ask (builder canvas) */
  function layout() {}
  const rowName = (def) => def.texts?.row || "Rând";
  const lower = (text) => String(text || "").toLocaleLowerCase("ro");
  const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
  /* „2 componente” · „1 componentă” · „4 din 6 completate” */
  function nestText(col, value) {
    if (isSub(col)) { const { filled, total } = subFilled(col, value); return `${filled} din ${total} completate`; }
    const n = Array.isArray(value) ? value.length : 0;
    return `${n} ${n === 1 ? lower(col.grid?.texts?.row || "rând") : lower(col.label) || "rânduri"}`;
  }
  /* the saved line: up to 3 values (key column first, no Da / Nu boxes) + the nested counts; "" = nothing filled */
  function summaryText(def, values) {
    const v = values || {};
    const simple = def.columns.filter((col) => !isNest(col) && col.type !== "checkbox");
    const key = simple.find((col) => col.key === def.rules?.key);
    const shown = (key ? [key, ...simple.filter((col) => col !== key)] : simple).map((col) => formatValue(col, v[col.key])).filter(Boolean).slice(0, 3);
    if (!shown.length) return "";
    return [...shown, ...def.columns.filter(isNest).map((col) => nestText(col, v[col.key]))].join(" · ");
  }

  function savedRowHtml(def, row, n) {
    const text = summaryText(def, row.values);
    const name = rowName(def);
    const canRemove = def.rules.allowRemove !== false;
    return `
      <div class="e-permits-stack__item is-clickable e-permits-fo-grid__row is-saved" role="button" tabindex="0" aria-label="${esc(`${name} ${n}: ${text || "necompletat"} — editează`)}" data-fo-grid-row="${row.id}" data-fo-grid-act="edit">
        <span class="e-permits-fo-doc-card__index" data-fo-grid-tag>#${n}</span>
        <span class="e-permits-fo-grid__summary${text ? "" : " is-empty"}" data-cell-tooltip>${esc(text || "Necompletat")}</span>
        <div class="e-permits-stack__actions e-permits-fo-grid__line-actions">
          <button class="btn btn-text-neutral btn-sm" type="button" aria-label="${esc(`Editează ${lower(name)} ${n}`)}" data-fo-grid-act="edit" data-fo-grid-edit>${icon("icon-edit", 16)}<span>Editează</span></button>
          ${canRemove ? `<button class="btn btn-text-destructive btn-sm" type="button" aria-label="${esc(`Elimină ${lower(name)} ${n}`)}" data-fo-grid-act="delete">${icon("icon-delete", 16)}<span>Elimină</span></button>` : ""}
        </div>
      </div>`;
  }

  /* the FO field object for one cell (the FO renderer draws it with its visible label) */
  function cellField(def, col, row, scopeCtl) {
    const id = `${def.id}-${row.id}-${col.key}`;
    const value = row.values[col.key];
    const base = { id, type: col.type, label: col.label, required: Boolean(col.required), span: 12, placeholder: col.placeholder || "", readOnly: Boolean(col.readOnly), hint: col.hint || "" };
    const manual = scopeCtl?.manual && ["select", "multiselect", "combobox"].includes(col.type);
    if (manual) return { ...base, type: "text", value: Array.isArray(value) ? value.join(", ") : value || "", placeholder: "Scrie valoarea" };
    switch (col.type) {
      case "text": return { ...base, value: value || "", maxLength: col.maxLength || "", inputmode: col.inputmode || "" };
      case "textarea": return { ...base, value: value || "", rows: col.rows || 2, maxLength: col.maxLength || "", charCounter: Boolean(col.counter) };
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

  /* a sub-form column = a section of the edit card: its fields on the same 12-column grid */
  function subformHtml(def, row, col) {
    const id = `${domIdOf(def.id)}-${row.id}-${col.key}`;
    const item = { id: col.key, values: row.values[col.key] || {} };
    const fields = (col.fields || []).map((field) => `<div class="e-permits-fo-grid__cell" data-span="${fieldSpan(field)}" data-fo-subform-key="${esc(field.key)}">${ctx.fieldHtml(childOut({ id: `${def.id}-${row.id}` }, field, item))}</div>`).join("");
    return `
      <div class="e-permits-fo-grid__subform" role="group" aria-labelledby="${esc(id)}-title" data-fo-subform="${esc(col.key)}">
        <div class="e-permits-fo-grid__subform-head">
          <div class="e-permits-fo-grid__label" id="${esc(id)}-title">${esc(col.label)}${col.required ? ` ${star()}` : ""}</div>
          ${col.hint ? `<p class="e-permits-fo-field__hint">${esc(col.hint)}</p>` : ""}
        </div>
        <div class="e-permits-fo-grid__fields">${fields}</div>
      </div>`;
  }
  const nestedDefOf = (def, row, col) => ({ ...col.grid, id: `${def.id}-${row.id}-${col.key}`, label: col.label, required: Boolean(col.required), hint: col.hint || col.grid?.hint || "", value: clone(row.values[col.key] || []), level: (def.level || 1) + 1 });
  function cellHtml(def, row, col, ctl) {
    const attrs = `class="e-permits-fo-grid__cell${isNest(col) ? " e-permits-fo-grid__section" : ""}" data-col="${esc(col.key)}" data-type="${esc(col.type)}" data-span="${spanOf(col)}"`;
    if (col.type === "grid") return `<div ${attrs}>${gridHtml(nestedDefOf(def, row, col))}</div>`;
    if (isSub(col)) return `<div ${attrs}>${subformHtml(def, row, col)}</div>`;
    return `<div ${attrs}>${ctx.fieldHtml(cellField(def, col, row, ctl))}</div>`;
  }
  function editRowHtml(def, row, n, ctl, inList = true) {
    const name = rowName(def);
    return `
      <div class="${inList ? "e-permits-stack__item" : "e-permits-fo-doc-card"} e-permits-fo-grid__row is-editing" role="group" aria-label="${esc(`${name} ${n}`)}" data-fo-grid-row="${row.id}">
        <div class="e-permits-fo-doc-card__header">
          <div class="e-permits-fo-doc-card__title">
            <span class="e-permits-fo-doc-card__index" data-fo-grid-tag>#${n}</span>
            <span class="e-permits-fo-doc-card__name">${esc(name)}</span>
          </div>
          <div class="e-permits-fo-doc-field__actions e-permits-fo-doc-card__actions">
            <button class="btn btn-neutral btn-rounded btn-md" type="button" data-fo-grid-act="cancel">Anulează</button>
            <button class="btn btn-primary btn-rounded btn-md" type="button" data-fo-grid-act="save">Salvează</button>
          </div>
        </div>
        <div class="e-permits-fo-grid__fields" data-fo-grid-fields>${def.columns.map((col) => cellHtml(def, row, col, ctl)).join("")}</div>
      </div>`;
  }

  function emptyHtml(def) {
    const text = def.texts.empty || `Niciun rând. Apasă „${def.texts.add || "Adaugă rând"}” pentru a începe.`;
    const empty = window.GEAPEmptyState?.render({ text, icon: "dot-grid", compact: true }) || `<p>${esc(text)}</p>`;
    return `<div class="e-permits-fo-grid__empty" data-fo-grid-empty>${empty}</div>`;
  }
  const skeletonRowsHtml = () => [1, 2].map(() => `
    <div class="e-permits-stack__item e-permits-fo-grid__row is-saved is-loading" aria-hidden="true"><span class="skeleton skeleton--text"></span><span class="skeleton skeleton--text"></span></div>`).join("");
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

  /* „Completează cu date de test” — one plausible value per column (row n); `options(col)` = the labels the list
     offers (the controller passes its cascade-aware lists). Also the grid builder's sample rows (gb-v1). */
  const staticOptions = (col) => (col.meta?.length ? col.meta : (col.options || []).map((label) => ({ label }))).map((item) => item.label);
  function sampleValue(col, n, options = staticOptions) {
    switch (col.type) {
      case "text": { const base = col.placeholder ? col.placeholder.replace(/^Ex\.?:?\s*/i, "") : col.label; return n === 1 ? base : `${base} ${n}`; }
      case "number": return String((Number(col.min) || 0) + 10 * n);
      case "money": return `${150 * n}.00`;
      case "date": return ctx?.localIsoDay?.(col.dateMax ? -30 * n : 7 * n) || todayIso();
      case "checkbox": return n === 1;
      case "radio": return (col.radio || [])[n - 1]?.value || (col.radio || [])[0]?.value || "";
      case "select": { const list = options(col); return list[(n - 1) % Math.max(list.length, 1)] || ""; }
      case "multiselect": return options(col).slice(0, 1);
      /* a nested grid: n saved rows of its own (row 1 → 1 rând, row 2 → 2) */
      case "grid": return col.grid?.columns?.length ? sampleRows(col.grid, n) : [];
      case "textarea": return n === 1 ? "Revizie tehnică făcută în martie 2026." : "";
      /* sub-form: everything on the first row, only the required fields on the next */
      case "subform": return Object.fromEntries(subFields(col).filter((field) => n === 1 || field.required).map((field) => [field.key, sampleValue(field, n, options)]));
      default: return "";
    }
  }
  /* saved sample rows for a static (unbound) grid: `{ values }` per row */
  function sampleRows(def, count = 2) { return Array.from({ length: count }, (_, i) => ({ values: Object.fromEntries((def.columns || []).map((col) => [col.key, sampleValue(col, i + 1)])) })); }

  /* the rows a grid starts with: the given value (test data, a saved request) or the default empty
     rows; the first unsaved one opens in edit (US-35: a new row is empty and editable) */
  function initialRows(def) {
    const max = Number(def.rules.max) || 0;
    const given = Array.isArray(def.value) && def.value.length;
    const list = given ? def.value : Array.from({ length: Math.min(Number(def.rules.defaultRows) || 0, max || 99) }, () => ({ values: {}, empty: true }));
    /* a never-saved row (at start) is „new”: its „Anulează” removes it, as in „Alte documente” */
    const rows = list.map((item) => ({ id: rid(), values: clone(item.values || item), saved: !item.empty, editing: false, isNew: Boolean(item.empty) }));
    rows.forEach((row) => { delete row.values.empty; delete row.values.values; });
    if (rows[0] && !rows[0].saved) rows[0].editing = true;
    return rows;
  }

  /* the grid root: label, hint, the row list, the foot (add + limit + pages), live region. The list is drawn here
     too (the builder canvas is inert and never bound); bind() redraws it. */
  function gridHtml(def, context) {
    if (context) ctx = context;
    const id = domIdOf(def.id);
    def.rules = def.rules || {};
    def.texts = def.texts || {};
    defs.set(id, def);
    const source = def.usesSource ? (SOURCE === "asteptare" ? "loading" : SOURCE === "indisponibila" ? "error" : "") : "";
    return `
      <div class="e-permits-fo-field e-permits-fo-field--span-12 e-permits-fo-grid" id="${esc(id)}" data-fo-grid="${esc(id)}" data-level="${def.level || 1}"${source ? ` data-source="${source}"` : ""}>
        <div class="e-permits-fo-grid__label"><span id="${esc(id)}-label">${esc(def.label || "")}${def.required ? ` ${star()}` : ""}</span>${infoHtml(def.texts.note, def.label)}</div>
        ${def.hint ? `<p class="e-permits-fo-field__hint" id="${esc(id)}-hint">${esc(def.hint)}</p>` : ""}
        ${sourceNoticeHtml(source)}
        <div class="e-permits-stack e-permits-fo-grid__list" role="group" aria-labelledby="${esc(id)}-label"${def.hint ? ` aria-describedby="${esc(id)}-hint"` : ""} data-fo-grid-body>${source === "loading" ? skeletonRowsHtml() : staticBody(def, source === "error")}</div>
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
    return rows.length ? rows.map((row, i) => (row.editing ? editRowHtml(def, row, i + 1, null) : savedRowHtml(def, row, i + 1))).join("") : emptyHtml(def);
  }
  /* one row alone, inert (the grid builder's canvas: the edit card and the saved line of a sample row) */
  function rowPreviewHtml(def, values, { editing = false, n = 1 } = {}) {
    def.rules = def.rules || {};
    def.texts = def.texts || {};
    const row = { id: `p${n}`, values: clone(values) };
    return editing ? editRowHtml(def, row, n, null, false) : savedRowHtml(def, row, n);
  }

  /* ================================================================== GRID — behaviour */
  function createGrid(root, def) {
    if (root.foGridCtl) return root.foGridCtl;
    const body = root.querySelector(":scope > [data-fo-grid-body]");
    const addButton = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-add]");
    const limit = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-limit]");
    const pager = root.querySelector(":scope > .e-permits-fo-grid__foot [data-fo-grid-pager]");
    const rules = def.rules;
    const max = Number(rules.max) || 0;
    const min = Math.max(Number(rules.min) || 0, def.required ? 1 : 0);
    const pageSize = Number(rules.pageSize) || 0;
    const name = rowName(def);
    const state = { rows: [], page: 1, source: root.dataset.source || "", manual: false };
    const rowEl = (row) => body.querySelector(`:scope > [data-fo-grid-row="${row.id}"]`);
    const rowById = (id) => state.rows.find((row) => row.id === id) || null;
    const numberOf = (row) => state.rows.indexOf(row) + 1;
    const colOf = (key) => def.columns.find((col) => col.key === key) || null;
    const cellOf = (row, key) => rowEl(row)?.querySelector(`:scope > [data-fo-grid-fields] > [data-col="${CSS.escape(key)}"]`) || null;
    const nestedOf = (row, col) => cellOf(row, col.key)?.querySelector(":scope > [data-fo-grid]")?.foGridCtl || null;
    const subScope = (row, col) => cellOf(row, col.key)?.querySelector(":scope > [data-fo-subform]") || null;
    const subField = (scope, field) => scope?.querySelector(`[data-fo-subform-key="${CSS.escape(field.key)}"]`) || null;
    const editingRow = (except = null) => state.rows.find((row) => row.editing && row !== except) || null;
    const asManual = (col) => (state.manual && ["select", "multiselect", "combobox"].includes(col.type) ? { ...col, type: col.type === "multiselect" ? "multiselect" : "text" } : col);

    state.rows = initialRows(def);
    /* a source that did not load: nothing opens for editing until „Reîncearcă” / „Introdu manual” */
    const locked = () => state.source === "error" && !state.manual;
    if (locked()) state.rows.forEach((row) => { row.editing = false; });

    const ctl = {
      root, def,
      get manual() { return state.manual; },
      count: () => state.rows.length,
      value: () => state.rows.map((row) => readRow(row)),
      optionsFor,
      validate,
      fill,
      reset: () => { state.rows = []; render(); },
    };
    root.foGridCtl = ctl;

    /* the row's values: the card's controls while it is edited (nested grids: their own rows), the saved ones otherwise */
    function readRow(row) {
      if (!row.editing || !rowEl(row)) return clone(row.values);
      const out = {};
      def.columns.forEach((col) => {
        if (col.type === "grid") { const nested = nestedOf(row, col); out[col.key] = nested ? nested.value() : clone(row.values[col.key] || []); return; }
        if (isSub(col)) { out[col.key] = readSub(row, col); return; }
        out[col.key] = readControl(cellOf(row, col.key), asManual(col));
      });
      return out;
    }
    function readSub(row, col) {
      const scope = subScope(row, col);
      if (!scope) return clone(row.values[col.key] || {});
      return Object.fromEntries(subFields(col).map((field) => [field.key, readControl(subField(scope, field), field)]));
    }
    /* multi-select / checklist values the FO renderer cannot preselect: marked before the FO binding */
    function preselect(scope, chosen) {
      scope?.querySelectorAll(".e-permits-fo-subgen-select__option").forEach((option) => {
        const on = (chosen || []).includes(option.dataset.value);
        option.classList.toggle("is-selected", on);
        option.setAttribute("aria-selected", String(on));
        const box = option.querySelector(".checkbox-input");
        if (box) box.checked = on;
      });
    }
    /* a row with nothing typed in (defaults count as nothing): dropped when another row opens */
    function isBlank(row) {
      const values = readRow(row);
      return def.columns.every((col) => {
        const value = values[col.key];
        if (col.type === "grid") return !(value || []).length;
        if (isSub(col)) return subFilled(col, value).filled === 0;
        if (col.type === "checkbox") return value === Boolean(col.defaultValue);
        return isEmpty(value) || (col.defaultValue !== undefined && col.defaultValue !== "" && JSON.stringify(value) === JSON.stringify(col.defaultValue));
      });
    }

    /* the group fixed by the first other row that has a value (US-36 AC-04) */
    function activeGroup(exceptRow) {
      const col = colOf(rules.group);
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
        const parentCol = colOf(col.parent.key);
        const value = row.editing && rowEl(row) ? readControl(cellOf(row, col.parent.key), parentCol || col) : row.values[col.parent.key];
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
    const rowHtml = (row, n) => (row.editing ? editRowHtml(def, row, n, ctl) : savedRowHtml(def, row, n));
    function render() {
      if (state.source === "loading") return;
      body.innerHTML = state.rows.length ? state.rows.map((row, i) => rowHtml(row, i + 1)).join("") : emptyHtml(def);
      state.rows.forEach((row) => { if (row.editing) prepareEdit(row); });
      sync();
    }
    /* edit look: bind the FO controls cell by cell (a nested grid binds itself), group rule, cascades */
    function prepareEdit(row) {
      if (!rowEl(row)) return;
      def.columns.forEach((col) => {
        const cell = cellOf(row, col.key);
        if (!cell) return;
        if (col.type === "grid") {
          const nestedRoot = cell.querySelector(":scope > [data-fo-grid]");
          const nestedDef = nestedRoot ? defs.get(nestedRoot.id) : null;
          if (nestedDef) createGrid(nestedRoot, nestedDef);
          return;
        }
        if (isSub(col)) {
          subFields(col).filter((field) => field.type === "multiselect").forEach((field) => preselect(subField(cell, field), (row.values[col.key] || {})[field.key]));
        } else if (col.type === "multiselect") preselect(cell, row.values[col.key]);
        bindControls(cell);
      });
      applyGroupRule(row);
    }
    function applyGroupRule(row) {
      const col = colOf(rules.group);
      if (!col) return;
      const group = activeGroup(row);
      const cell = cellOf(row, col.key);
      cell?.querySelectorAll(".e-permits-fo-select__option").forEach((option) => {
        const off = Boolean(group) && groupOf(col, option.dataset.value) !== group;
        option.classList.toggle("is-disabled", off);
        option.setAttribute("aria-disabled", String(off));
        if (off) option.dataset.tooltipReason = `Din altă grupă decât ${groupName(def, group)}`; else delete option.dataset.tooltipReason;
      });
      groupLineSync(cell, group ? groupText(def, col.label, group, "rândurile") : "");
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
      const shown = [];
      state.rows.forEach((row, i) => {
        const el = rowEl(row);
        if (!el) return;
        el.hidden = Boolean(pageSize) && Math.floor(i / pageSize) + 1 !== state.page;
        if (!el.hidden) shown.push(el);
      });
      /* first / last visible item: no top divider, the outer corners of the hover band */
      shown.forEach((el, i) => {
        el.classList.toggle("is-first", i === 0);
        el.classList.toggle("is-last", i === shown.length - 1);
              });
      if (pager) {
        pager.hidden = pages < 2;
        pager.innerHTML = pages < 2 ? "" : `
          <span class="pagination__item"><button class="pagination__link pagination__link--text${state.page === 1 ? " pagination__link--disabled" : ""}" type="button" aria-label="Pagina anterioară" data-fo-grid-page="${state.page - 1}"${state.page === 1 ? " disabled" : ""}>${icon("icon-chevron-left", 16)}</button></span>
          ${Array.from({ length: pages }, (_, i) => `<span class="pagination__item"><button class="pagination__link${i + 1 === state.page ? " pagination__link--active" : ""}" type="button" aria-label="Pagina ${i + 1}"${i + 1 === state.page ? ' aria-current="page"' : ""} data-fo-grid-page="${i + 1}">${i + 1}</button></span>`).join("")}
          <span class="pagination__item"><button class="pagination__link pagination__link--text${state.page === pages ? " pagination__link--disabled" : ""}" type="button" aria-label="Pagina următoare" data-fo-grid-page="${state.page + 1}"${state.page === pages ? " disabled" : ""}>${icon("icon-chevron-right", 16)}</button></span>`;
      }
      root.classList.toggle("has-rows", count > 0);
      root.dispatchEvent(new CustomEvent("fo-grid-change", { bubbles: false }));
    }
    /* numbers after a removal: saved lines are redrawn (their labels carry the number), the edit card renamed */
    function renumber() {
      state.rows.forEach((row, i) => {
        const el = rowEl(row);
        if (!el) return;
        if (!row.editing) { el.outerHTML = savedRowHtml(def, row, i + 1); return; }
        const tag = el.querySelector(":scope > .e-permits-fo-doc-card__header [data-fo-grid-tag]");
        if (tag) tag.textContent = `#${i + 1}`;
        el.setAttribute("aria-label", `${name} ${i + 1}`);
      });
    }
    function swapRow(row) {
      const el = rowEl(row);
      if (!el) return;
      el.insertAdjacentHTML("afterend", rowHtml(row, numberOf(row)));
      el.remove();
      if (row.editing) prepareEdit(row);
      sync();
    }

    /* ---- row actions (US-35) — the „Alte documente” lifecycle */
    /* one row in edit at a time: a blank new row is dropped, any other is saved first (its errors keep it open) */
    function leave(open) {
      if (open.isNew && isBlank(open)) { removeRow(open, { silent: true }); return true; }
      if (save(open, { focus: false })) return true;
      live(root, `Salvează sau anulează mai întâi ${lower(name)} ${numberOf(open)}.`);
      return false;
    }
    function startEdit(row, focusKey = "") {
      if (row.editing) { focusIn(row, focusKey); return; }
      if (locked()) { live(root, "Listele grilei nu s-au încărcat: apasă „Reîncearcă” sau „Introdu manual”."); return; }
      const open = editingRow(row);
      if (open && !leave(open)) return;
      row.snapshot = clone(row.values);
      row.editing = true;
      swapRow(row);
      rowEl(row)?.scrollIntoView?.({ block: "nearest" });
      focusIn(row, focusKey);
      live(root, `${name} ${numberOf(row)} se editează. Salvează sau Anulează.`);
    }
    function focusIn(row, key = "") {
      window.setTimeout(() => {
        const scope = key ? cellOf(row, key) : rowEl(row)?.querySelector(":scope > [data-fo-grid-fields]");
        scope?.querySelector("input:not([type='hidden']):not([type='search']):not(:disabled), textarea:not(:disabled), button:not(:disabled):not([data-fo-grid-act])")?.focus();
      }, 20);
    }
    function validateRow(row, { mark = true } = {}) {
      const values = readRow(row);
      const live2 = mark && row.editing && rowEl(row);
      let first = null;
      let count = 0;
      def.columns.forEach((col) => {
        /* a nested grid: its own check (rows in edit saved, minimum) while the card is open; saved rows: the minimum */
        if (col.type === "grid") {
          if (live2) {
            const inner = nestedOf(row, col)?.validate();
            if (inner?.count) { count += inner.count; first = first || inner.first; }
          } else {
            const need = Math.max(Number(col.grid?.rules?.min) || 0, col.required ? 1 : 0);
            if (need && (values[col.key] || []).length < need) count += 1;
          }
          return;
        }
        /* a sub-form: every field checked like a block field, errors on the fields */
        if (isSub(col)) {
          const scope = live2 ? subScope(row, col) : null;
          if (scope) clearErrors(scope);
          subFields(col).forEach((field) => {
            const message = checkValue(field, (values[col.key] || {})[field.key]);
            if (!message) return;
            count += 1;
            if (scope) { const target = markError(subField(scope, field), field, message); first = first || target; }
          });
          return;
        }
        const cell = live2 ? cellOf(row, col.key) : null;
        if (cell) clearErrors(cell);
        let message = checkValue(state.manual && ["select", "combobox"].includes(col.type) ? { ...col, type: "text" } : col, values[col.key]);
        /* key column: a value already in another row is refused (US-36 AC-03) */
        if (!message && rules.key === col.key && !isEmpty(values[col.key])) {
          const mine = JSON.stringify(values[col.key]).toLowerCase();
          if (state.rows.some((other) => other !== row && JSON.stringify(readRow(other)[col.key] ?? "").toLowerCase() === mine)) message = def.texts.duplicate || "Ai înregistrat deja această valoare.";
        }
        if (!message) return;
        count += 1;
        if (cell) { const target = markError(cell, col, message); first = first || target; }
      });
      return { count, first, values };
    }
    function save(row, { focus = true } = {}) {
      const result = validateRow(row);
      if (result.count) {
        result.first?.focus?.();
        live(root, `${name} ${numberOf(row)} are ${plural(result.count, "eroare", "erori")}; nu s-a salvat.`);
        return false;
      }
      row.values = readRow(row);
      row.saved = true;
      row.editing = false;
      row.isNew = false;
      delete row.snapshot;
      swapRow(row);
      state.rows.filter((other) => other.editing).forEach(applyGroupRule);
      if (focus) rowEl(row)?.querySelector("[data-fo-grid-edit]")?.focus();
      live(root, `${name} ${numberOf(row)} a fost salvat.`);
      return true;
    }
    function cancel(row) {
      if (row.isNew) { removeRow(row, { silent: true }); live(root, `${name} nou a fost anulat.`); addButton?.focus(); return; }
      row.values = row.snapshot || row.values;
      row.editing = false;
      delete row.snapshot;
      swapRow(row);
      rowEl(row)?.querySelector("[data-fo-grid-edit]")?.focus();
      live(root, `Modificările din ${lower(name)} ${numberOf(row)} au fost anulate.`);
    }
    function add() {
      if (!addButton || addButton.getAttribute("aria-disabled") === "true") {
        if (max && state.rows.length >= max) live(root, maxText(def, max, true));
        return;
      }
      const open = editingRow();
      if (open && !leave(open)) return;
      const values = {};
      def.columns.forEach((col) => { if (col.defaultValue !== undefined && col.defaultValue !== "") values[col.key] = col.defaultValue; });
      const row = { id: rid(), values, saved: false, editing: true, isNew: true };
      state.rows.push(row);
      body.querySelector(":scope > [data-fo-grid-empty]")?.remove();
      body.insertAdjacentHTML("beforeend", editRowHtml(def, row, state.rows.length, ctl));
      prepareEdit(row);
      if (pageSize) state.page = Math.ceil(state.rows.length / pageSize);
      sync();
      rowEl(row)?.scrollIntoView?.({ block: "nearest" });
      focusIn(row);
      live(root, `${name} ${state.rows.length} a fost adăugat. Completează-l și apasă Salvează.`);
    }
    function removeRow(row, { silent = false } = {}) {
      const index = state.rows.indexOf(row);
      rowEl(row)?.remove();
      state.rows.splice(index, 1);
      if (!state.rows.length) body.innerHTML = emptyHtml(def);
      renumber();
      sync();
      state.rows.filter((other) => other.editing).forEach(applyGroupRule);
      if (!silent) {
        const next = state.rows[index] || state.rows[index - 1];
        (next ? rowEl(next)?.querySelector("[data-fo-grid-edit], [data-fo-grid-act='save']") : addButton)?.focus();
        live(root, `${name} ${index + 1} a fost eliminat.`);
      }
    }
    /* Elimină asks first (US-35 AC-04) — the FO confirm dialog, destructive (the „Alte documente” wording) */
    function confirmDelete(row) {
      const n = numberOf(row);
      const summary = def.columns.filter((col) => !isNest(col)).map((col) => formatValue(col, readRow(row)[col.key])).filter(Boolean).slice(0, 2).join(" · ");
      openConfirm({
        title: `Elimini ${lower(name)} ${n}?`,
        text: `${summary ? `„${summary}” se elimină` : `${name} ${n} se elimină`} din ${def.label ? `„${def.label}”` : "listă"}${def.columns.some((col) => col.type === "grid") ? ", împreună cu rândurile din grilele lui" : ""}.`,
        confirm: `Elimină ${lower(name)}`,
        onConfirm: () => removeRow(row),
        returnFocus: rowEl(row)?.querySelector("[data-fo-grid-act='delete']"),
      });
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
      const zone = event.target.closest("[data-fo-grid-row]");
      const row = zone ? rowById(zone.dataset.foGridRow) : null;
      if (!row) return;
      const act = event.target.closest("[data-fo-grid-act]")?.dataset.foGridAct;
      if (act === "edit") { startEdit(row); return; }
      if (act === "save") { save(row); return; }
      if (act === "cancel") { cancel(row); return; }
      if (act === "delete") confirmDelete(row);
    });
    /* Enter saves, Esc cancels — unless a list / calendar of the card is open (Esc closes it first) */
    const openIn = (zone) => zone.querySelector(".e-permits-fo-select.is-open, .e-permits-fo-subgen-select.is-open, .e-permits-fo-caem.is-open, .date-picker-panel:not([hidden])");
    ctl.escape = (zone) => {
      const row = zone ? rowById(zone.dataset.foGridRow) : null;
      if (!row) return;
      const open = openIn(zone);
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
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-fo-grid-row].is-saved")) {
        event.preventDefault();
        const saved = rowById(event.target.dataset.foGridRow);
        if (saved) startEdit(saved);
        return;
      }
      const zone = event.target.closest("[data-fo-grid-row].is-editing");
      const row = zone ? rowById(zone.dataset.foGridRow) : null;
      if (!row?.editing) return;
      const busy = openIn(zone);
      if (event.key === "Escape" && !busy) { event.preventDefault(); event.stopPropagation(); cancel(row); return; }
      if (event.key === "Enter" && !busy && event.target.matches("input[type='text'], input:not([type])") && !event.target.closest("[data-date-picker]")) { event.preventDefault(); save(row); }
    }, true);
    /* an edit clears that field's error; a parent change resets its dependent cells (US-37 AC-03) */
    const onEdit = (event) => {
      if (!own(event)) return;
      const subWrap = event.target.closest("[data-fo-subform-key]");
      if (subWrap) { if (subWrap.querySelector("[data-fo-repeat-error], [aria-invalid='true']")) clearErrors(subWrap); return; }
      const cell = event.target.closest(".e-permits-fo-grid__cell");
      if (cell?.querySelector("[data-fo-repeat-error], [aria-invalid='true']")) clearErrors(cell);
      const zone = cell?.closest("[data-fo-grid-row].is-editing");
      const row = zone ? rowById(zone.dataset.foGridRow) : null;
      if (!row) return;
      const key = cell.dataset.col;
      def.columns.filter((col) => col.parent?.kind === "column" && col.parent.key === key).forEach((child) => refreshCell(row, child));
      if (key === rules.group) state.rows.filter((other) => other.editing && other !== row).forEach(applyGroupRule);
    };
    root.addEventListener("fo-select-change", onEdit);
    root.addEventListener("input", onEdit);
    root.addEventListener("change", onEdit);
    function refreshCell(row, col) {
      const cell = cellOf(row, col.key);
      if (!cell) return;
      const draft = { ...row, values: { ...readRow(row), [col.key]: col.type === "multiselect" ? [] : "" } };
      cell.innerHTML = ctx.fieldHtml(cellField(def, col, draft, ctl));
      bindControls(cell);
      if (col.key === rules.group) applyGroupRule(row);
    }
    /* a form field that columns depend on: reset those cells in the row being edited */
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
      body.innerHTML = skeletonRowsHtml();
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

    /* ---- whole-grid checks for „Validează” / „Înainte” (US-36 AC-02): the row in edit is saved (or shows its
       errors); a saved row that no longer passes opens in edit when no other is open, else its line says so */
    function validate() {
      root.querySelectorAll(":scope > [data-fo-repeat-error]").forEach((node) => node.remove());
      body.querySelectorAll(":scope > [data-fo-grid-row] > [data-fo-repeat-error]").forEach((node) => node.remove());
      let count = 0;
      let first = null;
      const open = editingRow();
      if (open && !save(open, { focus: false })) { count += 1; first = rowEl(open)?.querySelector("[aria-invalid='true']") || rowEl(open); }
      state.rows.filter((row) => !row.editing).forEach((row) => {
        if (!validateRow(row, { mark: false }).count) return;
        count += 1;
        if (!editingRow()) {
          row.snapshot = clone(row.values);
          row.editing = true;
          swapRow(row);
          validateRow(row);
          first = first || rowEl(row)?.querySelector("[aria-invalid='true']");
        } else {
          rowEl(row)?.insertAdjacentHTML("beforeend", errorHtml(`${name} ${numberOf(row)} are câmpuri de completat. Apasă „Editează”.`));
          first = first || rowEl(row)?.querySelector("[data-fo-grid-edit]");
        }
      });
      if (min && state.rows.length < min) {
        count += 1;
        root.querySelector(":scope > .e-permits-fo-grid__foot").insertAdjacentHTML("beforebegin", errorHtml(minText(def, min, true)));
        first = first || addButton;
      }
      return { count, first };
    }
    /* „Completează cu date de test”: two plausible saved rows (nested grids with rows of their own) */
    function fill() {
      const sample = (col, n, row) => sampleValue(col, n, (item) => optionsFor(item, row));
      const keyCol = colOf(rules.group);
      state.rows = [];
      const count = Math.max(1, Math.min(2, max || 2));
      for (let n = 1; n <= count; n += 1) {
        const row = { id: rid(), values: {}, saved: true, editing: false, isNew: false };
        def.columns.forEach((col) => {
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
    const hide = def.rules.allowRemove === false || (n === 1 && min >= 1) ? " hidden" : "";
    return `
      <div class="e-permits-stack__item e-permits-fo-repeat__item is-editing" role="group" aria-labelledby="${esc(itemId)}-title" data-fo-repeat-item="${item.id}">
        <div class="e-permits-fo-doc-card__header" data-fo-repeat-head>
          <div class="e-permits-fo-doc-card__title"><span class="e-permits-fo-doc-card__index" data-fo-repeat-index>#${n}</span><span class="e-permits-fo-doc-card__name" id="${esc(itemId)}-title">${esc(title)}</span>${n === 1 && def.labelHidden ? infoHtml(def.texts.note, title) : ""}</div>
          <div class="e-permits-fo-doc-field__actions e-permits-fo-doc-card__actions">
            <button class="btn btn-neutral btn-rounded btn-md" type="button" data-fo-repeat-act="cancel">Anulează</button>
            <button class="btn btn-primary btn-rounded btn-md" type="button" data-fo-repeat-act="save">Salvează</button>
          </div>
        </div>
        <div class="e-permits-fo-repeat__body" data-fo-repeat-body>${parts.join("")}</div>
        <div class="e-permits-fo-repeat__line" data-fo-repeat-line hidden>
          <span class="e-permits-fo-doc-card__index" data-fo-repeat-index>#${n}</span>
          <span class="e-permits-fo-grid__summary" data-cell-tooltip data-fo-repeat-summary></span>
          <div class="e-permits-stack__actions e-permits-fo-grid__line-actions">
            <button class="btn btn-text-neutral btn-sm" type="button" aria-label="Editează ${esc(title.toLowerCase())} #${n}" data-fo-repeat-act="edit">${icon("icon-edit", 16)}<span>Editează</span></button>
            <button class="btn btn-text-destructive btn-sm" type="button" aria-label="Elimină ${esc(title.toLowerCase())} #${n}" data-fo-repeat-remove${hide}>${icon("icon-delete", 16)}<span>Elimină</span></button>
          </div>
        </div>
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
    return `
      <fieldset class="e-permits-fo-repeat e-permits-fo-field--span-12" id="${esc(id)}" data-fo-repeat="${esc(id)}"${def.hint ? ` aria-describedby="${esc(id)}-hint"` : ""}${source ? ` data-source="${source}"` : ""}>
        <legend class="e-permits-fo-choice__legend${def.labelHidden ? " u-visually-hidden" : ""}">${esc(def.label || "")}${def.required ? ` ${star()}` : ""}${def.labelHidden ? "" : infoHtml(def.texts.note, def.label)}</legend>
        ${def.hint ? `<p class="e-permits-fo-field__hint" id="${esc(id)}-hint">${esc(def.hint)}</p>` : ""}
        ${sourceNoticeHtml(source, true)}
        <div class="e-permits-stack e-permits-fo-repeat__list" data-fo-repeat-list>
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
    const isSaved = (item) => item.classList.contains("is-saved");
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
      itemValue: (item) => Object.fromEntries(def.fields.filter((child) => child.type !== "info").map((child) => [child.key, valueOf(item, child)])),
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
        item.querySelectorAll("[data-fo-repeat-index]").forEach((index) => { index.textContent = `#${i + 1}`; });
        item.classList.toggle("is-first", i === 0);
        item.classList.toggle("is-last", i === all.length - 1);
        const remove = item.querySelector("[data-fo-repeat-remove]");
        if (remove) { remove.hidden = def.rules.allowRemove === false || (min >= 1 && i === 0) || all.length <= min; remove.setAttribute("aria-label", `Elimină ${title.toLowerCase()} #${i + 1}`); }
        item.querySelector("[data-fo-repeat-act='edit']")?.setAttribute("aria-label", `Editează ${title.toLowerCase()} #${i + 1}`);
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
            if (off) option.dataset.tooltipReason = outside ? `Din altă grupă decât ${groupName(def, othersGroup)}` : "Ales deja într-o altă activitate"; else delete option.dataset.tooltipReason;
          });
          if (child === groupChild) groupLineSync(el, othersGroup ? groupText(def, groupChild.label, othersGroup, "elementele") : "");
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
      /* one item in edit at a time: a blank new one is dropped, another is saved first (its errors keep it open) */
      if (!silent) {
        const open = items().find((other) => !isSaved(other));
        if (open && !open.snapshot && !summaryOf(open)) { open.remove(); sync(); }
        else if (open && !saveItem(open, { focus: false })) { live(root, "Salvează sau anulează mai întâi elementul deschis."); return null; }
      }
      seqItem += 1;
      list.insertAdjacentHTML("beforeend", itemHtml(def, { id: `i${seqItem}${rid()}`, values: {} }, items().length + 1, Number.MAX_SAFE_INTEGER));
      const item = list.lastElementChild;
      bindControls(item);
      sync();
      if (!silent) {
        item.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        focusItem(item);
        live(root, `S-a adăugat „${title} #${items().length}”.`);
      }
      return item;
    }
    function focusItem(item) {
      window.setTimeout(() => item.querySelector("[data-fo-repeat-body] :is(button, input:not([type='hidden']), textarea):not(:disabled)")?.focus({ preventScroll: true }), 20);
    }
    /* ---- item lifecycle (row-stack-v1): EDIT = the open card in the container, SAVED = one compact line */
    function summaryOf(item) {
      const parts = [];
      def.fields.forEach((child) => {
        if (child.type === "info" || child.type === "checkbox") return;
        const value = valueOf(item, child);
        if (isEmpty(value)) return;
        if (child.type === "combobox") {
          const option = [...childEl(item, child.key).querySelectorAll(".e-permits-fo-caem__option")].find((entry) => entry.dataset.code === value);
          parts.push(option?.dataset.label ? `${value} · ${option.dataset.label}` : String(value));
        } else if (child.type === "multiselect") parts.push(value.length === 1 ? value[0] : `${value.length} ${child.parent ? "subgenuri" : "selectate"}`);
        else parts.push(formatValue(child, value));
      });
      return parts.filter(Boolean).slice(0, 3).join(" · ");
    }
    function setSaved(item, on) {
      const line = item.querySelector(":scope > [data-fo-repeat-line]");
      item.querySelector(":scope > [data-fo-repeat-head]").hidden = on;
      item.querySelector(":scope > [data-fo-repeat-body]").hidden = on;
      line.hidden = !on;
      item.classList.toggle("is-saved", on);
      item.classList.toggle("is-clickable", on);
      item.classList.toggle("is-editing", !on);
      if (on) {
        const text = summaryOf(item);
        const summary = line.querySelector("[data-fo-repeat-summary]");
        summary.textContent = text || "Necompletat";
        summary.classList.toggle("is-empty", !text);
        item.setAttribute("role", "button");
        item.tabIndex = 0;
        item.setAttribute("aria-label", `${title} #${items().indexOf(item) + 1}: ${text || "necompletat"} — editează`);
        item.removeAttribute("aria-labelledby");
      } else {
        item.setAttribute("role", "group");
        item.removeAttribute("tabindex");
        item.removeAttribute("aria-label");
        item.setAttribute("aria-labelledby", item.querySelector(".e-permits-fo-doc-card__name").id);
      }
    }
    /* the controls back to the values of a snapshot (Anulează on a saved item) */
    function restore(item, values) {
      def.fields.forEach((child) => {
        if (child.type === "info") return;
        const el = childEl(item, child.key);
        const value = values[child.key];
        if (!el) return;
        if (child.type === "combobox") {
          [...el.querySelectorAll(".e-permits-fo-caem__option")].find((entry) => entry.dataset.code === value)?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        } else if (child.type === "multiselect" && el.matches("[data-fo-subgen]")) {
          el.querySelectorAll(".e-permits-fo-subgen-select__option:not([data-fo-select-all])").forEach((option) => {
            if (option.classList.contains("is-selected") !== (value || []).includes(option.dataset.value)) option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          });
          el.querySelector("[data-fo-subgen-confirm]")?.click();
        } else if (child.type === "select") {
          [...el.querySelectorAll(".e-permits-fo-select__option")].find((option) => (option.dataset.value || option.textContent.trim()) === value)?.click();
        } else if (child.type === "checkbox") {
          const box = el.querySelector("input[type='checkbox']"); if (box) box.checked = Boolean(value);
        } else if (child.type === "radio") {
          el.querySelectorAll("input[type='radio']").forEach((radio) => { radio.checked = radio.value === value; });
        } else {
          const input = el.querySelector("input:not([type='search']), textarea");
          if (input) input.value = value ?? "";
        }
      });
      sync();
    }
    function startEdit(item) {
      if (!isSaved(item)) return;
      /* one item in edit at a time: another open one is saved first (its errors keep it open) */
      const open = items().find((other) => other !== item && !isSaved(other));
      if (open && !saveItem(open, { focus: false })) { live(root, "Salvează sau anulează mai întâi elementul deschis."); return; }
      item.snapshot = ctl.itemValue(item);
      setSaved(item, false);
      focusItem(item);
      live(root, `${title} #${items().indexOf(item) + 1} se editează. Salvează sau Anulează.`);
    }
    function saveItem(item, { focus = true } = {}) {
      const result = validateItem(item);
      if (result.count) { if (focus) result.first?.scrollIntoView?.({ block: "nearest" }); (result.first?.querySelector?.("input, button") || result.first)?.focus?.(); return false; }
      delete item.snapshot;
      item.dataset.foRepeatSavedOnce = "";
      setSaved(item, true);
      sync();
      if (focus) { item.focus({ preventScroll: true }); live(root, `${title} #${items().indexOf(item) + 1} a fost salvat.`); }
      return true;
    }
    function cancelItem(item) {
      if (item.snapshot) { restore(item, item.snapshot); delete item.snapshot; setSaved(item, true); sync(); item.focus({ preventScroll: true }); return; }
      /* never saved: dropped — or emptied when the block needs it (minimum) */
      if (items().length > min) {
        const all = items(); const index = all.indexOf(item);
        item.remove(); sync();
        (items()[index] || items()[index - 1])?.focus?.({ preventScroll: true }) || addButton?.focus();
        return;
      }
      seqItem += 1;
      item.insertAdjacentHTML("afterend", itemHtml(def, { id: `i${seqItem}${rid()}`, values: {} }, items().indexOf(item) + 1, 1));
      const fresh = item.nextElementSibling;
      item.remove(); bindControls(fresh); sync(); focusItem(fresh);
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
    function validateItem(item) {
      let count = 0;
      let first = null;
      clearErrors(item);
      def.fields.forEach((child) => {
        if (child.type === "info") return;
        const el = childEl(item, child.key);
        if (!el || el.closest("[hidden]") || (el.hidden && !isSaved(item))) return;
        let message = checkValue(child, valueOf(item, child));
        if (!message && child.key === rules.key) {
          const mine = valueOf(item, child);
          if (!isEmpty(mine) && items().some((other) => other !== item && JSON.stringify(valueOf(other, child)) === JSON.stringify(mine))) message = def.texts.duplicate || "Ai înregistrat deja această valoare.";
        }
        if (!message) return;
        count += 1;
        const target = markError(el.matches("[data-fo-subgen]") ? el.querySelector(".e-permits-fo-field") : el, child, message);
        first = first || target;
      });
      return { count, first };
    }
    function validate() {
      root.querySelectorAll(":scope > [data-fo-repeat-error]").forEach((node) => node.remove());
      let count = 0;
      let first = null;
      /* a saved item was checked when it was saved; an open one is checked now */
      items().filter((item) => !isSaved(item)).forEach((item) => {
        const result = validateItem(item);
        count += result.count;
        first = first || result.first;
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
        saveItem(item, { focus: false });
      }
      sync();
    }

    root.addEventListener("keydown", (event) => {
      if (event.target.closest("[data-fo-repeat]") !== root) return;
      const item = event.target.closest("[data-fo-repeat-item]");
      if (!item) return;
      if ((event.key === "Enter" || event.key === " ") && event.target === item && isSaved(item)) { event.preventDefault(); startEdit(item); }
    });
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-fo-repeat]") !== root) return;
      const itemEl = event.target.closest("[data-fo-repeat-item]");
      const act = event.target.closest("[data-fo-repeat-act]")?.dataset.foRepeatAct;
      if (itemEl && act === "save") { saveItem(itemEl); return; }
      if (itemEl && act === "cancel") { cancelItem(itemEl); return; }
      if (itemEl && !event.target.closest("[data-fo-repeat-remove]") && (act === "edit" || (isSaved(itemEl) && !event.target.closest("button")))) { startEdit(itemEl); return; }
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
      /* a nested grid drawn in a parent's static card is replaced when the parent renders */
      if (!def || !el.isConnected) return;
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
    /* gb-v1: the grid builder's inert sample rows (the same values as „date de test”) */
    sampleRows,
    /* row-cards-v1: one row alone, inert — the grid builder's edit card / saved line ({ editing, n }) */
    rowHtml: rowPreviewHtml,
    summaryText,
    /* no-op since row-cards-v1 (the layout is CSS container queries) */
    layout,
    /* Esc from an editor that handles it first (the Form Builder): the delete dialog, an open list
       of a row being edited, or the row itself; true = handled */
    escape(target) {
      const modal = document.querySelector("[data-fo-grid-confirm]");
      if (modal && !modal.hidden) { closeConfirm(false); return true; }
      const zone = target?.closest?.("[data-fo-grid-row].is-editing");
      const ctl = zone?.closest("[data-fo-grid]")?.foGridCtl;
      if (!ctl?.escape) return false;
      ctl.escape(zone);
      return true;
    },
  };
})();
