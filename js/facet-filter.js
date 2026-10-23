/* Advanced filter (faceted) — ONE implementation for every table that filters by facets
   (BO workplace registries + the public RAP list). Moved out of js/e-permits-shell.js
   (2026-10-16) so the RAP page reuses the same bar, popover, keyboard and focus logic.
   Figma GEAP 244:14333 (bar) · 244:14334 (filter chip) · 244:15994 (popover).

   The button („Filtrare avansată” / „Filtru”) opens a bar of facet chips under the toolbar;
   a chip opens a checklist popover. Two layers, so one table query covers many choices:
   - the popover edits the bar's DRAFT („Confirmă” keeps it, Esc / outside click drops it);
   - „Aplică filtrele” in the bar commits the whole draft at once (one query).
   OR inside a facet, AND across facets. The button's badge counts the applied values.

   GEAPFacetFilter.create({
     bar, toggle, count,            elements: the bar container, the button, its badge
                                   (a facet may set `search: true` = the search field at the top of its popover /
                                   sheet section whatever its size — long names: Denumire act, Autoritate; otherwise
                                   the search shows from 8 values; facet-popover-v2)
     state()                        → { open, applied: { key: [values] }, draft } (kept by the page)
     save()                         persist the state (optional)
     facets()                       facets offered now (≥ 2 values, or a value applied)
     allFacets()                    every facet ({ key, label })
     options(facet)                 → [{ value, count }] for the popover
     tag(value, facet)              → HTML of a value shown as a tag, or null for plain text
     total()                        rows matching everything (the „N rezultate” in the bar)
     apply()                        re-query + re-render the table after a commit / clear
     pageKey()                      the bar resets (closes, drops the draft) when this changes
     onPageChange()                 reset hook for pages that keep several states
     scrollers: [el]                scrolling an element closes the popover
     sprite                         icon sprite URL (sub-pages: "../assets/icons/sprite.svg")
     mobileSheets                   phone mode (≤760) — ON for every list since 2026-10-21 (phone-toolbar-v2);
                                    `false` opts out (no caller does)
     preview(selection)             rows matching a selection that is not applied yet (the
                                    sheets' live „Arată N rezultate”; falls back to total())
     sort                           the page's sort control (its wrapper element, in the toolbar row next to
                                    the trigger) — phones only: shown as an icon-only square (icon-sort)
   }) → { render, close, clearAll }

   Phone toolbar (phone-toolbar-v2, 2026-10-21, user: „make the filter icon-only and put it in the same row as
   the search, so we economise space”; „we discussed not having chips, right?”): ONE row = the page's search
   (fills the width) + the toolbar trigger itself as an ICON-ONLY square 48 (`e-permits-filter-trigger--icon`:
   the filter icon, the button radius, the count badge on its top-right corner, name „Filtre” / „Filtre, N
   aplicate”; it opens the all-filters sheet) + the page's sort control as an icon-only square 48 (icon-sort,
   its own aria-label). The toolbar gets `e-permits-filter-row` (placement in css/facet-filter.css). NO facet
   chips on phones; the bar holds only the applied line „N rezultate · Șterge filtrele”. Every list is in
   phone mode now (the GEAP BO registries too). History: 2026-10-17 „Filtre” + a scrolling chip per facet;
   2026-10-20 a round „Filtre” pill + sort pill in a row under the search.
   Phone mode (≤760px only): a facet sheet = a BOTTOM SHEET (library .bottom-sheet:
   handle, title + „Resetează” + ×, search when > 7 values (as the popover), 44px checklist rows,
   sticky footer „Arată N rezultate” with the live count — full width: with „Resetează” beside it a
   4-digit count wrapped at 375); the button opens the same sheet with every facet as an
   accordion section. A sheet commits on „Arată” (one query); ×, the scrim and Esc drop the changes.
   No draft layer on phones. Research: scratchpad rap-mobile-filter-research.md (Baymard, NN/g,
   Material 3, Apple HIG).

   Date range facet (2026-10-20, user: „why is Perioadă not also in Filtre?”): a facet with
   `type: "date"` (+ `get(row)` → ISO day, optional `presets: [ids]` from DATE_PRESETS, optional
   `today()` → ISO day of the page's „now”) filters by a period instead of a checklist. Its value is
   ONE token in the usual array: a preset id („azi”, „7z”, „30z”, „an”, „u7z”, „u30z” — resolved
   against today at match time) or „interval:<from>:<to>” (either end may be empty). The chip shows
   „<label>: <compact range>” („1–20 oct. 2026”) and gets the library chip × (`.chip[role=group]` >
   `button.chip__label` + `button.chip__close`) that clears it at once; the popover / sheet body = the
   presets as radio rows (dropdown item size) + „Interval personalizat” → De la / Până la with the
   library date picker (js/input-date-picker.js), end ≥ start. Pages match a row with
   `GEAPFacetFilter.dateMatch(token, iso, today)`. */
(function () {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const INLINE_MAX = 4;

  /* facet search (facet-popover-v2): case- and diacritics-insensitive („agentia” finds „Agenția”, ş / ș / s alike);
     the field shows from 8 values, or always on a facet with `search: true` */
  const fold = (text) => String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro").trim();
  const SEARCH_MIN = 8;
  const wantsSearch = (facet, n) => facet?.search === true || n >= SEARCH_MIN;
  /* nothing matches the typed text: the one empty state, its menu / popover size (bare + compact), one short line */
  const noMatchHtml = () => `<li>${window.GEAPEmptyState.noResults("Niciun rezultat", { text: "", bare: true, compact: true })}</li>`;

  /* ---- date range facet: presets, tokens, the compact range text ---- */
  const pad2 = (n) => String(n).padStart(2, "0");
  const localToday = () => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`; };
  const isoShift = (iso, days) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  };
  const DATE_PRESETS = {
    azi: { label: "Azi", range: (t) => [t, t] },
    "7z": { label: "Ultimele 7 zile", range: (t) => [isoShift(t, -6), t] },
    "30z": { label: "Ultimele 30 de zile", range: (t) => [isoShift(t, -29), t] },
    an: { label: "Anul acesta", range: (t) => [`${t.slice(0, 4)}-01-01`, `${t.slice(0, 4)}-12-31`] },
    /* for dates that lie ahead (an estimated end date) */
    u7z: { label: "Următoarele 7 zile", range: (t) => [t, isoShift(t, 6)] },
    u30z: { label: "Următoarele 30 de zile", range: (t) => [t, isoShift(t, 29)] }
  };
  const DEFAULT_PRESETS = ["azi", "7z", "30z", "an"];
  const CUSTOM = "interval";
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
  const MONTHS_SHORT = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
  const dateToken = (from, to) => (from || to ? `${CUSTOM}:${from || ""}:${to || ""}` : null);
  /* token → { preset, from, to } (null when it holds no period) */
  const parseDateToken = (token, today) => {
    if (!token) return null;
    if (DATE_PRESETS[token]) { const [from, to] = DATE_PRESETS[token].range(today || localToday()); return { preset: token, from, to }; }
    const m = /^interval:(\d{4}-\d{2}-\d{2})?:(\d{4}-\d{2}-\d{2})?$/.exec(String(token));
    return m && (m[1] || m[2]) ? { preset: CUSTOM, from: m[1] || "", to: m[2] || "" } : null;
  };
  /* a row's date (ISO day or date-time) inside the period of the token; no period = no condition */
  const dateMatch = (token, value, today) => {
    const range = parseDateToken(token, today);
    if (!range) return true;
    const day = String(value || "").slice(0, 10);
    if (!ISO_DAY.test(day)) return false;
    return (!range.from || day >= range.from) && (!range.to || day <= range.to);
  };
  const dayText = (iso, year = true) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS_SHORT[m - 1]}${year ? ` ${y}` : ""}`; };
  /* „12 oct. 2026” · „1–20 oct. 2026” · „28 sept. – 5 oct. 2026” · „28 dec. 2025 – 5 ian. 2026” · „din …” · „până la …” */
  const rangeText = (from, to) => {
    if (from && to) {
      if (from === to) return dayText(from);
      if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))}–${dayText(to)}`;
      if (from.slice(0, 4) === to.slice(0, 4)) return `${dayText(from, false)} – ${dayText(to)}`;
      return `${dayText(from)} – ${dayText(to)}`;
    }
    if (from) return `din ${dayText(from)}`;
    return to ? `până la ${dayText(to)}` : "";
  };
  const dateText = (token, today) => { const range = parseDateToken(token, today); return range ? rangeText(range.from, range.to) : ""; };
  /* DD/MM/YYYY (also . or -) → ISO; "" when empty; null when not a real date */
  const typedDay = (text) => {
    const value = String(text || "").trim();
    if (!value) return "";
    const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value);
    if (!m) return null;
    const iso = `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
    const check = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== iso ? null : iso;
  };

  /* ---- the phone bottom sheet — ONE shell for every sheet built on it (2026-10-20): the facet sheets
     below and the sort sheet (js/sort-sheet.js); the act post-process action sheet used it until action-menu-v1
     (2026-10-20, now an anchored dropdown). Library .bottom-sheet
     (scrim, header title + ×, content, optional footer — no drag handle: the sheet is not draggable, 2026-10-20) + .e-permits-filter-sheet (css/facet-filter.css,
     phones: css/modal-phone.css „Modals on phones”). Same markup, same open / close animation, Esc and Tab trap. */
  const sheetShellHtml = ({ sprite, titleId, titleHtml = null, headerHtml = "", footerHtml = "" }) => `
      <div class="bottom-sheet__overlay" data-sheet-close></div>
      <div class="bottom-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
        <div class="bottom-sheet__header">
          ${titleHtml ?? `<h2 class="bottom-sheet__header--title" id="${titleId}" data-sheet-title></h2>`}${headerHtml}
          <button type="button" class="modal-close" aria-label="Închide" data-sheet-close>
            <span class="d-inline-flex"><svg class="icon small" aria-hidden="true"><use href="${sprite}#icon-cross-large"></use></svg></span>
          </button>
        </div>
        <div class="bottom-sheet__content" data-sheet-body></div>${footerHtml}
      </div>`;
  const sheetCreate = (className, opts) => {
    const el = document.createElement("div");
    el.className = `bottom-sheet ${className}`;
    el.setAttribute("aria-hidden", "true");
    el.hidden = true;
    el.innerHTML = sheetShellHtml(opts);
    document.body.appendChild(el);
    return el;
  };
  /* Height = the content (filter-sheet-height-v1, 2026-10-22, user: „why so big? make it dynamic by height”): the
     panel hugs header + body + footer up to the visible screen minus the top gap; only the body scrolls.
     - `sheetMorph(el, fn)`: a change that alters the content height (a section opens, a period range shows) glides
       from the old height to the new one (`el.animate`, nothing left inline; none with reduced motion);
     - `sheetHold(el, true)`: typing in a facet search keeps the current height (`--geap-sheet-hold`, geometry
       only) so the sheet does not shrink / grow per keystroke; released by the next morph and on hide;
     - the on-screen keyboard: while a sheet is open the sheet box follows `visualViewport` (`--geap-sheet-top` /
       `--geap-sheet-bottom`), so the panel stays above the keyboard and the focused field stays in view. */
  const sheetPanel = (el) => el.querySelector(".bottom-sheet__panel");
  const sheetHold = (el, on) => {
    const panel = sheetPanel(el);
    if (!on) { panel.style.removeProperty("--geap-sheet-hold"); return; }
    if (!panel.style.getPropertyValue("--geap-sheet-hold")) panel.style.setProperty("--geap-sheet-hold", `${panel.offsetHeight}px`);
  };
  const sheetMorph = (el, fn) => {
    const panel = sheetPanel(el);
    const from = panel.offsetHeight;
    sheetHold(el, false);
    fn();
    const to = panel.offsetHeight;
    if (from === to || el.getAttribute("aria-hidden") !== "false" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    panel.getAnimations().forEach((a) => { if (a.id === "geap-sheet-morph") a.cancel(); });
    panel.animate([{ height: `${from}px` }, { height: `${to}px` }], { id: "geap-sheet-morph", duration: 200, easing: "cubic-bezier(.2, 0, 0, 1)" });
  };
  let sheetViewportEl = null;
  const sheetViewportSync = () => {
    const vv = window.visualViewport;
    if (!sheetViewportEl || !vv) return;
    const top = Math.max(0, Math.round(vv.offsetTop));
    const bottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    sheetViewportEl.style.setProperty("--geap-sheet-top", `${top}px`);
    sheetViewportEl.style.setProperty("--geap-sheet-bottom", `${bottom}px`);
    const active = document.activeElement;
    if (bottom && active?.matches?.("input") && sheetViewportEl.contains(active)) active.scrollIntoView({ block: "nearest" });
  };
  const sheetViewport = (el) => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (sheetViewportEl && sheetViewportEl !== el) { sheetViewportEl.style.removeProperty("--geap-sheet-top"); sheetViewportEl.style.removeProperty("--geap-sheet-bottom"); }
    if (el && !sheetViewportEl) { vv.addEventListener("resize", sheetViewportSync); vv.addEventListener("scroll", sheetViewportSync); }
    if (!el && sheetViewportEl) { vv.removeEventListener("resize", sheetViewportSync); vv.removeEventListener("scroll", sheetViewportSync); }
    sheetViewportEl = el;
    sheetViewportSync();
  };
  const sheetShow = (el) => {
    el.hidden = false;
    sheetHold(el, false);
    void el.offsetHeight; /* the slide-in starts from the closed position */
    el.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("is-filter-sheet-open");
    sheetViewport(el);
  };
  /* → the timer that sets `hidden` after the slide-out (isOpen() true again = reopened meanwhile) */
  const sheetHide = (el, isOpen) => {
    el.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("is-filter-sheet-open");
    if (sheetViewportEl === el) { el.style.removeProperty("--geap-sheet-top"); el.style.removeProperty("--geap-sheet-bottom"); sheetViewport(null); }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return window.setTimeout(() => { if (!isOpen()) el.hidden = true; }, reduce ? 0 : 300);
  };
  /* Tab stays inside the sheet (aria-modal); `a[href]`, not `[href]` — an svg <use href> is not a stop (2026-10-20) */
  const sheetTrapTab = (el, event) => {
    const items = [...el.querySelectorAll(".bottom-sheet__panel :is(button, input, a[href], [tabindex]:not([tabindex='-1'])):not(:disabled)")].filter((x) => x.offsetParent || x.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !el.contains(active) || active.classList.contains("bottom-sheet__panel"))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  /* The facet search is the library .search-input: its × / typing spinner follow the library
     states (has-value → is-typing → is-ready) that js/search.js sets. Opted-in pages without that
     file (RAP) get the same states from here — wired once, only for the filter's own fields. */
  let searchStatesWired = false;
  const wireSearchStates = () => {
    if (searchStatesWired || document.querySelector('script[src*="js/search.js"]')) return;
    searchStatesWired = true;
    const timers = new WeakMap();
    const SCOPE = ".e-permits-workplace__filter-pop .search-input, .e-permits-filter-sheet .search-input";
    const reset = (field) => { field.classList.remove("has-value", "is-typing", "is-ready"); clearTimeout(timers.get(field)); };
    document.addEventListener("input", (event) => {
      const field = event.target.closest?.(SCOPE);
      if (!field || !event.target.matches("input")) return;
      if (!event.target.value.trim()) { reset(field); return; }
      field.classList.add("has-value", "is-typing");
      field.classList.remove("is-ready");
      clearTimeout(timers.get(field));
      timers.set(field, setTimeout(() => { field.classList.remove("is-typing"); field.classList.add("is-ready"); }, 500));
    });
    document.addEventListener("click", (event) => {
      const clear = event.target.closest?.(".btn-icon.clear");
      const field = clear?.closest(SCOPE);
      if (!field) return;
      event.preventDefault();
      const input = field.querySelector("input");
      input.value = "";
      reset(field);
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  function create(cfg) {
    const phoneMode = cfg.mobileSheets !== false; /* every list since phone-toolbar-v2 */
    if (phoneMode) wireSearchStates(); /* no-op where js/search.js already runs (the BO) */
    const bar = cfg.bar;
    const toggle = cfg.toggle;
    const count = cfg.count;
    const sprite = cfg.sprite || "assets/icons/sprite.svg";
    const save = cfg.save || (() => {});
    const tagOf = cfg.tag || (() => null);
    let popover = null;
    let edit = null; /* { key, values:Set, query, anchor } while a facet popover is open */
    let moreOpen = false;
    let barPage = null;
    /* phones (phone-toolbar-v2): the toolbar row = search + the trigger as an icon-only square (+ the page's sort as
       an icon-only square); desktop = the page's labelled controls, untouched */
    const sortEl = cfg.sort || null;
    const toolbarRow = toggle?.parentElement || null;
    const toggleControls = toggle?.getAttribute("aria-controls") || null;
    const setPhoneToolbar = (on) => {
      toolbarRow?.classList.toggle("e-permits-filter-row", on);
      if (toggle) {
        toggle.classList.toggle("e-permits-filter-trigger--icon", on);
        /* `data-filter-all` = „opens the all-filters sheet” (the demo states' phone entry point) */
        if (on) toggle.dataset.filterAll = ""; else delete toggle.dataset.filterAll;
        if (!on) {
          toggle.removeAttribute("aria-haspopup");
          if (toggleControls) toggle.setAttribute("aria-controls", toggleControls);
        }
      }
      /* the sort trigger = the same toolbar chip as „Filtre” (sort-chip-v1 / sort-chip-icon-v1): its own leading
         `.chip__icon` (icon-sort) at every width; on phones the icon-only square (`--icon`, label + caret hidden).
         A chip without its own icon, or a page that still passes a `.btn`, gets icon-sort inserted on phones only */
      sortEl?.querySelectorAll(":scope > :is(.btn, .chip)").forEach((btn) => {
        const chip = btn.classList.contains("chip");
        btn.classList.toggle(chip ? "e-permits-filter-trigger--icon" : "e-permits-filter-icon-only", on);
        if (chip && btn.querySelector(":scope > .chip__icon:not([data-filter-sort-icon])")) return;
        const icon = btn.querySelector(":scope > [data-filter-sort-icon]");
        /* the leading icon exists only on phones (on desktop it would change the trigger's icon-side padding) */
        const svg = `<svg class="icon" aria-hidden="true"><use href="${sprite}#icon-sort"></use></svg>`;
        if (on && !icon) btn.insertAdjacentHTML("afterbegin", chip ? `<span class="chip__icon" data-filter-sort-icon>${svg}</span>` : svg.replace("<svg ", "<svg data-filter-sort-icon "));
        if (!on) icon?.remove();
      });
    };

    /* the toolbar trigger (filter-chip-v1): active = the selected chip (black) + „<label>, N aplicate” as its name */
    const triggerName = (label, n) => `${label}, ${n} ${n === 1 ? "aplicat" : "aplicate"}`;
    const markTrigger = (n) => {
      if (!toggle) return;
      toggle.classList.toggle("is-selected", n > 0);
      /* phones: the label is hidden (icon-only) → the name is always set, and it is „Filtre” on every list */
      if (isPhone()) { toggle.setAttribute("aria-label", n ? triggerName("Filtre", n) : "Filtre"); return; }
      const label = toggle.querySelector(".chip__label")?.textContent.trim() || "Filtre";
      if (n) toggle.setAttribute("aria-label", triggerName(label, n)); else toggle.removeAttribute("aria-label");
    };
    const appliedEntries = () => Object.entries(cfg.state().applied).filter(([, values]) => values?.length);
    const draftOf = () => { const st = cfg.state(); if (!st.draft) st.draft = JSON.parse(JSON.stringify(st.applied)); return st.draft; };
    const sameSelection = (a = {}, b = {}) => {
      const norm = (o) => JSON.stringify(Object.keys(o).filter((k) => o[k]?.length).sort().map((k) => [k, [...o[k]].sort()]));
      return norm(a) === norm(b);
    };
    const pending = () => !sameSelection(draftOf(), cfg.state().applied);
    /* library .search-input actions: spinner while typing + clear (×) — js/search.js */
    const searchActions = () => `<div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="${sprite}#icon-cross-small"></use></svg></button></div>`;

    /* ---- date facets ---- */
    const isDate = (facet) => facet?.type === "date";
    const todayOf = (facet) => (facet?.today ? facet.today() : cfg.today ? cfg.today() : localToday());
    const facetByKey = (key) => cfg.allFacets().find((f) => f.key === key);
    const presetsOf = (facet) => (facet.presets || DEFAULT_PRESETS).filter((id) => DATE_PRESETS[id]);
    /* the chip with a period: library chip „with close” (group of the chip button + ×) */
    const dateChipHtml = (facet, token, open) => {
      const text = dateText(token, todayOf(facet));
      if (!text) return chipHtml(facet, 0, open);
      const label = `${facet.label}: ${text}`;
      return `<div class="chip is-selected e-permits-workplace__filter-chip e-permits-workplace__filter-chip--date" role="group" aria-label="${escapeHtml(facet.label)}">
        <button class="chip__label" type="button" aria-haspopup="dialog" aria-expanded="${open}" data-filter-facet="${escapeHtml(facet.key)}">
          <span class="e-permits-workplace__filter-chip-text" data-cell-tooltip>${escapeHtml(label)}</span>
          <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${sprite}#icon-chevron-${open ? "top" : "bottom"}"></use></svg>
        </button>
        <button class="chip__close" type="button" aria-label="Șterge filtrul ${escapeHtml(facet.label)}" data-filter-date-clear="${escapeHtml(facet.key)}"><svg class="icon" aria-hidden="true"><use href="${sprite}#icon-cross-small"></use></svg></button>
      </div>`;
    };
    /* De la / Până la = the library date picker in the FO field shell (as the BO drawers) */
    const dateFieldHtml = (id, label, iso, today, key, part) => {
      const [y, m, d] = iso ? iso.split("-") : [];
      const view = (iso || today).split("-");
      return `
        <div class="e-permits-fo-field e-permits-workplace__filter-date-field">
          <label for="${id}">${label}</label>
          <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeHtml(iso || "")}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
            <div class="e-permits-fo-input e-permits-fo-input--with-action">
              <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off" data-filter-date-input="${escapeHtml(key)}" data-filter-date-part="${part}">
              <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data: ${label}" aria-controls="${id}-panel" aria-expanded="false"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="${sprite}#icon-calendar"></use></svg></button>
            </div>
            <div id="${id}-panel" class="date-picker-panel" aria-hidden="true" hidden>
              <div class="date-picker" role="dialog" aria-label="Alege data: ${label}">
                <div class="date-picker__header">
                  <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară"><svg class="icon medium" aria-hidden="true"><use href="${sprite}#icon-chevron-left"></use></svg></button>
                  <div class="date-picker__month js-date-picker-label"></div>
                  <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare"><svg class="icon medium" aria-hidden="true"><use href="${sprite}#icon-chevron-right"></use></svg></button>
                </div>
                <div class="date-picker__grid date-picker__grid--days" data-view="day">
                  <div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div>
                  <div class="date-picker__days js-date-picker-days"></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    };
    /* presets as radio rows (the checklist row: dropdown item size in the popover, 44 in the sheet)
       + „Interval personalizat” → the two pickers */
    const dateBodyHtml = (facet, d, where) => {
      const key = facet.key;
      const today = todayOf(facet);
      const name = `geap-filter-date-${where}-${key.replace(/[^a-z0-9_-]/gi, "")}`;
      const row = (id, label) => `
          <label class="e-permits-workplace__filter-option">
            <span class="radio radio--small"><input class="radio-input" type="radio" name="${name}" value="${id}"${d.preset === id ? " checked" : ""} data-filter-date-preset="${escapeHtml(key)}"><span class="radio-custom" aria-hidden="true"></span></span>
            <span class="e-permits-workplace__filter-option-label">${escapeHtml(label)}</span>
          </label>`;
      return `
        <div class="e-permits-workplace__filter-list e-permits-workplace__filter-dates${where === "sheet" ? " e-permits-filter-sheet__list" : ""}" role="radiogroup" aria-label="${escapeHtml(facet.label)}">
          ${presetsOf(facet).map((id) => row(id, DATE_PRESETS[id].label)).join("")}
          ${row(CUSTOM, "Interval personalizat")}
        </div>
        <div class="e-permits-workplace__filter-range" role="group" aria-label="Interval personalizat · ${escapeHtml(facet.label)}" data-filter-range="${escapeHtml(key)}"${d.preset === CUSTOM ? "" : " hidden"}>
          ${dateFieldHtml(`${name}-from`, "De la", d.from, today, key, "from")}
          ${dateFieldHtml(`${name}-to`, "Până la", d.to, today, key, "to")}
          <div class="e-permits-workplace__filter-range-errors" data-filter-range-errors></div>
        </div>`;
    };
    const dateEditOf = (facet, token) => {
      const range = parseDateToken(token, todayOf(facet));
      return { preset: range?.preset || "", from: range?.preset === CUSTOM ? range.from : "", to: range?.preset === CUSTOM ? range.to : "" };
    };
    /* the message goes under BOTH fields (one line at the range's width, not 4 lines under one column) */
    const fieldError = (input, text) => {
      const field = input.closest(".e-permits-fo-field");
      field.querySelector(".e-permits-fo-input")?.classList.add("is-error");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `${input.id}-error`);
      (input.closest("[data-filter-range]")?.querySelector("[data-filter-range-errors]") || field).insertAdjacentHTML("beforeend", `<p class="message message--inline e-permits-fo-field__error" id="${input.id}-error" role="alert"><svg class="icon medium" aria-hidden="true"><use href="${sprite}#icon-circle-error-filled"></use></svg><span>${escapeHtml(text)}</span></p>`);
    };
    const clearFieldErrors = (scope) => {
      scope.querySelectorAll(".e-permits-fo-field__error").forEach((node) => node.remove());
      scope.querySelectorAll(".e-permits-fo-input.is-error").forEach((node) => node.classList.remove("is-error"));
      scope.querySelectorAll("[data-filter-date-input][aria-invalid]").forEach((node) => { node.removeAttribute("aria-invalid"); node.removeAttribute("aria-describedby"); });
    };
    /* the period chosen in a popover / sheet section → { ok, token }; `show` writes the field errors
       (AC: end ≥ start; a typed date must be a real ZZ/LL/AAAA date; custom needs at least one end) */
    const readDate = (scope, key, d, show) => {
      const range = scope.querySelector(`[data-filter-range="${CSS.escape(key)}"]`);
      if (range && show) clearFieldErrors(range);
      if (!d.preset) return { ok: true, token: null };
      if (d.preset !== CUSTOM) return { ok: true, token: d.preset };
      const fromInput = range?.querySelector('[data-filter-date-part="from"]');
      const toInput = range?.querySelector('[data-filter-date-part="to"]');
      const from = typedDay(fromInput?.value);
      const to = typedDay(toInput?.value);
      let ok = true;
      const fail = (input, text) => { ok = false; if (show && input) fieldError(input, text); };
      if (from === null) fail(fromInput, "Introduceți data în formatul ZZ/LL/AAAA.");
      if (to === null) fail(toInput, "Introduceți data în formatul ZZ/LL/AAAA.");
      if (ok && !from && !to) fail(fromInput, "Alegeți cel puțin o dată.");
      if (ok && from && to && to < from) fail(toInput, "Data „Până la” nu poate fi anterioară datei „De la”.");
      return ok ? { ok, token: dateToken(from, to) } : { ok, token: null };
    };
    const initPickers = (scope) => window.GEAPDatePicker?.init(scope);
    const pickerOpen = (scope) => !!scope?.querySelector("[data-date-picker].is-open");

    const chipHtml = (facet, n, open) => `<button class="chip${n ? " is-selected" : ""} e-permits-workplace__filter-chip" type="button" aria-haspopup="dialog" aria-expanded="${open}" data-filter-facet="${escapeHtml(facet.key)}"${n ? ` aria-label="${escapeHtml(facet.label)}: ${n} ${n === 1 ? "valoare selectată" : "valori selectate"}"` : ""}>
        <span class="chip__label">${escapeHtml(facet.label)}</span>
        ${n ? `<span class="badge badge--lg badge--solid-light">${n}</span>` : ""}
        <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${sprite}#icon-chevron-${open ? "top" : "bottom"}"></use></svg>
      </button>`;

    const render = () => {
      if (!bar) return;
      const state = cfg.state();
      /* arriving on another table: its bar starts closed and an unapplied draft is dropped */
      const page = cfg.pageKey ? cfg.pageKey() : "";
      if (barPage !== page) {
        if (cfg.onPageChange) cfg.onPageChange(); else { state.open = false; state.draft = null; }
        barPage = page;
      }
      if (isPhone()) { renderPhone(); return; }
      if (phoneMode) {
        setPhoneToolbar(false);
        bar.classList.remove("is-sheets");
        if (toggle) toggle.hidden = false;
      }
      const draft = draftOf();
      const appliedCount = appliedEntries().reduce((sum, [, values]) => sum + values.length, 0);
      if (count) { count.hidden = !appliedCount; count.textContent = String(appliedCount); }
      markTrigger(appliedCount);
      const facets = cfg.facets();
      /* the chips show only after the button is clicked; the button's badge keeps telling
         how many values are applied while the bar is closed */
      const show = (state.open || pending()) && facets.length > 0;
      bar.hidden = !show;
      if (toggle) {
        const none = !facets.length;
        toggle.setAttribute("aria-expanded", String(show));
        if (none) { toggle.setAttribute("aria-disabled", "true"); toggle.dataset.tooltipReason = "Lista nu are încă valori după care să filtrezi."; }
        else { toggle.removeAttribute("aria-disabled"); delete toggle.dataset.tooltipReason; }
      }
      if (!show) { bar.innerHTML = ""; return; }
      /* the first few facets are chips; the rest wait in "Mai multe" until they hold a value */
      const inline = facets.filter((f, i) => i < INLINE_MAX || draft[f.key]?.length);
      const more = facets.filter((f) => !inline.includes(f));
      const chip = (facet) => (isDate(facet)
        ? dateChipHtml(facet, draft[facet.key]?.[0], edit?.key === facet.key)
        : chipHtml(facet, draft[facet.key]?.length || 0, edit?.key === facet.key));
      const isPending = pending();
      const total = cfg.total();
      bar.innerHTML = `
      <div class="e-permits-workplace__filter-chips">
        ${inline.map(chip).join("")}
        ${more.length ? `<button class="chip e-permits-workplace__filter-chip" type="button" aria-haspopup="menu" aria-expanded="${moreOpen}" data-filter-more>
          <span class="chip__label">Mai multe</span>
          <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${sprite}#icon-chevron-${moreOpen ? "top" : "bottom"}"></use></svg>
        </button>` : ""}
      </div>
      <div class="e-permits-workplace__filter-meta" aria-live="polite">
        ${isPending ? `
          <span class="e-permits-workplace__filter-hint">Filtre neaplicate</span>
          <button class="btn btn-text-neutral btn-sm" type="button" data-filter-discard>Renunță</button>
          <button class="btn btn-primary btn-sm" type="button" data-filter-commit>Aplică filtrele</button>
        ` : appliedCount ? `
          <span class="e-permits-workplace__filter-result">${total === 1 ? "1 rezultat" : `${total} rezultate`}</span>
          <button class="btn btn-text-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>
        ` : '<span class="e-permits-workplace__filter-hint">Alege valorile, apoi aplică filtrele.</span>'}
      </div>
    `;
    };

    /* ---- phone mode: icon-only trigger in the search row + bottom sheets ---- */
    const phoneQuery = phoneMode ? window.matchMedia("(max-width: 760px)") : null;
    const isPhone = () => !!phoneQuery?.matches;
    let sheetEl = null;
    let sheet = null; /* { kind: "facet" | "all", key, sel: { key: [values] }, query: { key }, expanded: Set, opener } */
    let sheetTimer = 0;
    const resultsLabel = (n) => {
      const rest = n % 100;
      return n === 1 ? "1 rezultat" : `${n}${n >= 20 && (rest === 0 || rest >= 20) ? " de" : ""} rezultate`;
    };
    const copySel = (sel) => Object.fromEntries(Object.entries(sel || {}).filter(([, v]) => v?.length).map(([k, v]) => [k, [...v]]));
    const selCount = (sel) => Object.values(sel).reduce((sum, v) => sum + (v?.length || 0), 0);

    const renderPhone = () => {
      const state = cfg.state();
      state.draft = null;
      const appliedCount = appliedEntries().reduce((sum, [, values]) => sum + values.length, 0);
      if (count) { count.hidden = !appliedCount; count.textContent = String(appliedCount); }
      setPhoneToolbar(true);
      markTrigger(appliedCount);
      const facets = cfg.facets();
      bar.classList.add("is-sheets");
      if (toggle) {
        /* nothing to filter yet: the square goes (the search keeps the room), as the pill did */
        toggle.hidden = !facets.length;
        toggle.setAttribute("aria-haspopup", "dialog");
        toggle.setAttribute("aria-expanded", String(sheet?.kind === "all"));
        if (sheetEl) toggle.setAttribute("aria-controls", sheetEl.id); else toggle.removeAttribute("aria-controls");
        toggle.removeAttribute("aria-disabled");
        delete toggle.dataset.tooltipReason;
      }
      /* NO facet chips on phones: the bar is only the applied line under the toolbar row —
         the result count + the one-tap „Șterge filtrele” (built once, updated in place) */
      bar.hidden = !appliedCount;
      let meta = bar.querySelector(":scope > [data-filter-phone-meta]");
      if (!meta) {
        bar.innerHTML = '<div class="e-permits-workplace__filter-meta" aria-live="polite" data-filter-phone-meta></div>';
        meta = bar.querySelector("[data-filter-phone-meta]");
      }
      const html = appliedCount ? `
        <span class="e-permits-workplace__filter-result">${resultsLabel(cfg.total())}</span>
        <button class="btn btn-text-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>` : "";
      if (meta.dataset.html !== html) { meta.innerHTML = html; meta.dataset.html = html; }
    };

    const sheetOptionsHtml = (facet) => {
      const values = new Set(sheet.sel[facet.key] || []);
      const q = fold(sheet.query[facet.key]);
      const all = cfg.options(facet, sheet.sel);
      /* values ticked in the sheet stay listed even when the other facets leave them no rows */
      values.forEach((v) => { if (!all.some((o) => o.value === v)) all.push({ value: v, count: 0 }); });
      const options = all.filter((o) => !q || fold(o.value).includes(q));
      return options.length ? options.map((o) => {
        const tag = tagOf(o.value, facet);
        return `
        <li>
          <label class="e-permits-workplace__filter-option">
            <span class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(o.value)}"${values.has(o.value) ? " checked" : ""} data-filter-option data-sheet-facet="${escapeHtml(facet.key)}"><span class="checkbox-custom" aria-hidden="true"></span></span>
            ${tag || `<span class="e-permits-workplace__filter-option-label">${escapeHtml(o.value)}</span>`}
          </label>
        </li>`;
      }).join("") : noMatchHtml();
    };

    const sheetFacetHtml = (facet) => {
      if (isDate(facet)) return dateBodyHtml(facet, sheet.dates[facet.key] || dateEditOf(facet, sheet.sel[facet.key]?.[0]), "sheet");
      const many = wantsSearch(facet, cfg.options(facet, sheet.sel).length);
      return `
      ${many ? `
        <div class="e-permits-filter-sheet__search">
          <div class="search-input medium rectangular e-permits-workplace__search${sheet.query[facet.key] ? " has-value is-ready" : ""}">
            <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${sprite}#icon-search"></use></svg></span>
            <input class="input" type="search" placeholder="Caută în ${escapeHtml(facet.label.toLocaleLowerCase("ro"))}" aria-label="Caută în ${escapeHtml(facet.label)}" value="${escapeHtml(sheet.query[facet.key] || "")}" data-filter-search data-sheet-facet="${escapeHtml(facet.key)}">
            ${searchActions()}
          </div>
        </div>` : ""}
      <ul class="e-permits-workplace__filter-list e-permits-filter-sheet__list" role="list" data-sheet-list="${escapeHtml(facet.key)}">${sheetOptionsHtml(facet)}</ul>`;
    };

    const sectionSummary = (facet) => (isDate(facetByKey(facet.key))
      ? dateText(sheet.sel[facet.key]?.[0], todayOf(facetByKey(facet.key)))
      : (sheet.sel[facet.key] || []).join(", "));
    const syncSectionSummary = (key) => {
      const summary = sheetEl.querySelector(`[data-sheet-section="${CSS.escape(key)}"] [data-sheet-summary]`);
      if (summary) { summary.textContent = sectionSummary({ key }); summary.hidden = !summary.textContent; }
    };
    /* a date section edited in the sheet: the valid period becomes its selection (live count); the
       errors only show on „Arată” */
    const syncSheetDate = (key) => {
      const res = readDate(sheetEl, key, sheet.dates[key], false);
      if (res.ok && res.token) sheet.sel[key] = [res.token]; else delete sheet.sel[key];
      syncSectionSummary(key);
      syncSheetFooter();
    };
    const sectionHtml = (facet) => {
      const open = sheet.expanded.has(facet.key);
      const id = `geap-filter-sheet-${facet.key.replace(/[^a-z0-9_-]/gi, "")}`;
      const summary = sectionSummary(facet);
      return `
      <section class="e-permits-filter-sheet__section" data-sheet-section="${escapeHtml(facet.key)}">
        <h3 class="e-permits-filter-sheet__section-head">
          <button class="e-permits-filter-sheet__section-trigger" type="button" aria-expanded="${open}" aria-controls="${id}" data-sheet-toggle="${escapeHtml(facet.key)}">
            <span class="e-permits-filter-sheet__section-text">
              <span class="e-permits-filter-sheet__section-label">${escapeHtml(facet.label)}</span>
              <span class="e-permits-filter-sheet__section-summary" data-cell-tooltip data-sheet-summary${summary ? "" : " hidden"}>${escapeHtml(summary)}</span>
            </span>
            <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${sprite}#icon-chevron-${open ? "top" : "bottom"}"></use></svg>
          </button>
        </h3>
        <div class="e-permits-filter-sheet__section-panel" id="${id}" role="group" aria-label="${escapeHtml(facet.label)}"${open ? "" : " hidden"}>${open ? sheetFacetHtml(facet) : ""}</div>
      </section>`;
    };

    const syncSheetFooter = () => {
      if (!sheetEl || !sheet) return;
      const n = cfg.preview ? cfg.preview(copySel(sheet.sel)) : cfg.total();
      sheetEl.querySelector("[data-sheet-apply]").textContent = `Arată ${resultsLabel(n)}`;
      /* a date facet with a period being typed (not valid yet) still has something to reset */
      const datesSet = (key) => (key ? [key] : Object.keys(sheet.dates)).some((k) => sheet.dates[k]?.preset);
      const empty = sheet.kind === "facet" ? !(sheet.sel[sheet.key] || []).length && !datesSet(sheet.key) : !selCount(sheet.sel) && !datesSet();
      sheetEl.querySelector("[data-sheet-reset]").disabled = empty;
    };

    const renderSheetBody = () => {
      const body = sheetEl.querySelector("[data-sheet-body]");
      if (sheet.kind === "facet") body.innerHTML = sheetFacetHtml(cfg.allFacets().find((f) => f.key === sheet.key));
      else body.innerHTML = `<div class="e-permits-filter-sheet__sections">${cfg.facets().map(sectionHtml).join("")}</div>`;
      initPickers(body);
      syncSheetFooter();
    };

    const ensureSheet = () => {
      if (sheetEl) return;
      sheetEl = sheetCreate("e-permits-filter-sheet", {
        sprite,
        titleId: "geap-filter-sheet-title",
        headerHtml: `
          <button class="btn btn-text-neutral btn-sm" type="button" data-sheet-reset>Resetează</button>`,
        footerHtml: `
        <div class="bottom-sheet__footer e-permits-filter-sheet__footer">
          <button class="btn btn-primary btn-lg e-permits-filter-sheet__apply" type="button" data-sheet-apply></button>
        </div>`
      });
      if (!sheetEl.id) sheetEl.id = "geap-filter-sheet"; /* the phone trigger's aria-controls */
      wireSheet();
    };

    const openSheet = (kind, key, opener) => {
      if (!isPhone()) return;
      ensureSheet();
      const applied = cfg.state().applied;
      const facets = cfg.facets();
      sheet = {
        kind, key, opener, sel: copySel(applied), query: {},
        /* date facets: what the period controls show ({ preset, from, to }) */
        dates: Object.fromEntries(cfg.allFacets().filter(isDate).map((f) => [f.key, dateEditOf(f, applied[f.key]?.[0])])),
        /* all filters: the sections that hold a value start open; none → the first one */
        expanded: new Set(kind === "all" ? facets.filter((f) => applied[f.key]?.length).map((f) => f.key) : [])
      };
      if (kind === "all" && !sheet.expanded.size && facets[0]) sheet.expanded.add(facets[0].key);
      const facet = kind === "facet" ? cfg.allFacets().find((f) => f.key === key) : null;
      sheetEl.querySelector("[data-sheet-title]").textContent = facet ? facet.label : "Filtre";
      sheetEl.classList.toggle("is-all", kind === "all");
      renderSheetBody();
      window.clearTimeout(sheetTimer);
      sheetShow(sheetEl);
      render();
      requestAnimationFrame(() => sheetEl.querySelector(".bottom-sheet__panel").focus());
    };

    const closeSheet = (restoreFocus = true) => {
      if (!sheet) return;
      const { kind, key, opener } = sheet;
      sheet = null;
      sheetTimer = sheetHide(sheetEl, () => !!sheet);
      render();
      if (!restoreFocus) return;
      const back = kind === "facet" ? bar?.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`) : toggle;
      (back && !back.hidden ? back : opener)?.focus();
    };

    /* „Arată N rezultate”: the sheet's selection becomes the applied filter (one query) */
    const applySheet = () => {
      /* a custom period that is not valid blocks „Arată” and shows why */
      const invalid = Object.keys(sheet.dates).filter((key) => sheetEl.querySelector(`[data-filter-range="${CSS.escape(key)}"]`) && !readDate(sheetEl, key, sheet.dates[key], true).ok);
      if (invalid.length) { sheetEl.querySelector(".e-permits-fo-input.is-error input")?.focus(); return; }
      const state = cfg.state();
      state.applied = copySel(sheet.sel);
      state.draft = null;
      save();
      const { kind, key } = sheet;
      sheet = null;
      sheetTimer = sheetHide(sheetEl, () => !!sheet);
      cfg.apply();
      (kind === "facet" ? bar?.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`) : toggle)?.focus();
    };

    function wireSheet() {
      sheetEl.addEventListener("click", (event) => {
        if (!sheet) return;
        if (event.target.closest("[data-sheet-close]")) { closeSheet(); return; }
        if (event.target.closest("[data-sheet-apply]")) { applySheet(); return; }
        if (event.target.closest("[data-sheet-reset]")) {
          if (sheet.kind === "facet") delete sheet.sel[sheet.key]; else sheet.sel = {};
          Object.keys(sheet.dates).forEach((key) => { if (sheet.kind !== "facet" || key === sheet.key) sheet.dates[key] = { preset: "", from: "", to: "" }; });
          sheetEl.querySelectorAll("[data-filter-option], [data-filter-date-preset]").forEach((box) => { box.checked = false; });
          sheetMorph(sheetEl, () => sheetEl.querySelectorAll("[data-filter-range]").forEach((range) => { clearFieldErrors(range); range.hidden = true; range.querySelectorAll("[data-filter-date-input]").forEach((input) => { input.value = ""; input.closest("[data-date-picker]").dataset.selected = ""; }); }));
          sheetEl.querySelectorAll("[data-sheet-summary]").forEach((el) => { el.textContent = ""; el.hidden = true; });
          syncSheetFooter();
          sheetEl.querySelector("[data-sheet-apply]").focus();
          return;
        }
        const toggleBtn = event.target.closest("[data-sheet-toggle]");
        if (toggleBtn) {
          const key = toggleBtn.dataset.sheetToggle;
          const facet = cfg.allFacets().find((f) => f.key === key);
          const panel = sheetEl.querySelector(`#${CSS.escape(toggleBtn.getAttribute("aria-controls"))}`);
          const open = !sheet.expanded.has(key);
          if (open) sheet.expanded.add(key); else sheet.expanded.delete(key);
          toggleBtn.setAttribute("aria-expanded", String(open));
          toggleBtn.querySelector(".e-permits-workplace__filter-caret use").setAttribute("href", `${sprite}#icon-chevron-${open ? "top" : "bottom"}`);
          /* the sheet glides to its new content height (filter-sheet-height-v1) */
          sheetMorph(sheetEl, () => {
            panel.innerHTML = open ? sheetFacetHtml(facet) : "";
            panel.hidden = !open;
          });
          if (open) initPickers(panel);
        }
      });
      sheetEl.addEventListener("change", (event) => {
        if (!sheet) return;
        const preset = event.target.closest("[data-filter-date-preset]");
        const dayInput = event.target.closest("[data-filter-date-input]");
        if (preset || dayInput) {
          const key = (preset || dayInput).dataset.filterDatePreset || dayInput.dataset.filterDateInput;
          const d = sheet.dates[key];
          if (preset) {
            d.preset = preset.value;
            const range = sheetEl.querySelector(`[data-filter-range="${CSS.escape(key)}"]`);
            if (range) sheetMorph(sheetEl, () => { range.hidden = d.preset !== CUSTOM; if (range.hidden) clearFieldErrors(range); });
          } else {
            const iso = typedDay(dayInput.value);
            if (iso !== null) d[dayInput.dataset.filterDatePart] = iso;
            clearFieldErrors(dayInput.closest("[data-filter-range]"));
          }
          syncSheetDate(key);
          return;
        }
        const box = event.target.closest("[data-filter-option]");
        if (!box) return;
        const key = box.dataset.sheetFacet;
        const values = new Set(sheet.sel[key] || []);
        if (box.checked) values.add(box.value); else values.delete(box.value);
        if (values.size) sheet.sel[key] = [...values]; else delete sheet.sel[key];
        syncSectionSummary(key);
        syncSheetFooter();
      });
      sheetEl.addEventListener("input", (event) => {
        const field = event.target.closest("[data-filter-search]");
        if (!field || !sheet) return;
        const key = field.dataset.sheetFacet;
        sheet.query[key] = field.value;
        const facet = cfg.allFacets().find((f) => f.key === key);
        sheetHold(sheetEl, true); /* the sheet keeps its height while the list filters (no jump per keystroke) */
        sheetEl.querySelector(`[data-sheet-list="${CSS.escape(key)}"]`).innerHTML = sheetOptionsHtml(facet);
      });
      /* Esc closes without applying; Tab stays inside the sheet (aria-modal) */
      sheetEl.addEventListener("keydown", (event) => {
        if (!sheet) return;
        /* Esc in an open calendar closes only the calendar (js/input-date-picker.js, on the document) */
        if (event.key === "Escape" && pickerOpen(sheetEl)) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeSheet(); return; }
        if (event.key === "Tab") sheetTrapTab(sheetEl, event);
      });
    }

    phoneQuery?.addEventListener("change", () => {
      closeSheet(false);
      cfg.state().draft = null;
      if (popover && !popover.hidden) close(false); else render();
    });

    const ensurePopover = () => {
      if (popover) return;
      popover = document.createElement("div");
      popover.className = "e-permits-fo-intent-menu e-permits-workplace__filter-pop";
      popover.hidden = true;
      document.body.appendChild(popover);
      wirePopover();
    };

    /* 8 under the chip, left edges aligned; a popover that would run past the right gutter (16) is
       right-aligned with its chip instead, then clamped inside the gutters; no room below but room
       above → it opens above the chip (facet-popover-v2) */
    const GUTTER = 16;
    const place = (anchor) => {
      const r = anchor.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      let left = r.left;
      if (left + width > window.innerWidth - GUTTER) left = r.right - width;
      popover.style.left = `${Math.max(GUTTER, Math.min(left, window.innerWidth - width - GUTTER))}px`;
      const below = window.innerHeight - r.bottom - 8 - GUTTER;
      const above = r.top - 8 - GUTTER;
      const up = height > below && height <= above;
      popover.style.top = `${up ? r.top - 8 - height : r.bottom + 8}px`;
    };
    /* a checklist popover hugs its longest value (270 … 440, css) — measured once with every value listed,
       then held, so typing in its search never makes it jump narrower */
    const lockWidth = (on) => {
      popover.style.removeProperty("--filter-pop-lock");
      if (on) popover.style.setProperty("--filter-pop-lock", `${Math.ceil(popover.getBoundingClientRect().width)}px`);
    };

    const close = (restoreFocus = true) => {
      if (sheet) closeSheet(restoreFocus);
      if (!popover || popover.hidden) return;
      const key = edit?.key;
      const wasMore = moreOpen;
      popover.hidden = true;
      edit = null;
      moreOpen = false;
      render();
      if (!restoreFocus) return;
      const back = (key && bar?.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`)) || ((wasMore || key) && bar?.querySelector("[data-filter-more]"));
      back?.focus();
    };

    const renderOptions = () => {
      const facet = cfg.allFacets().find((f) => f.key === edit.key);
      const q = fold(edit.query);
      const options = cfg.options(facet).filter((o) => !q || fold(o.value).includes(q));
      return options.length ? options.map((o) => {
        const tag = tagOf(o.value, facet);
        return `
        <li>
          <label class="e-permits-workplace__filter-option">
            <span class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(o.value)}"${edit.values.has(o.value) ? " checked" : ""} data-filter-option><span class="checkbox-custom" aria-hidden="true"></span></span>
            ${tag || `<span class="e-permits-workplace__filter-option-label">${escapeHtml(o.value)}</span>`}
          </label>
        </li>
      `;
      }).join("") : noMatchHtml();
    };

    /* the date popover: presets + „Interval personalizat” (wider: two pickers side by side); its calendar
       opens out of the popover, so this popover does not clip */
    const openDateFacet = (facet, anchor) => {
      edit = { key: facet.key, values: new Set(), query: "", anchor, date: dateEditOf(facet, draftOf()[facet.key]?.[0]) };
      popover.classList.add("e-permits-workplace__filter-pop--date");
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", `Filtru: ${facet.label}`);
      popover.innerHTML = `
      ${dateBodyHtml(facet, edit.date, "pop")}
      <div class="e-permits-workplace__filter-footer">
        <button class="btn btn-primary btn-sm" type="button" data-filter-confirm>Confirmă</button>
        <button class="btn btn-neutral btn-sm" type="button" data-filter-reset>
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="${sprite}#icon-cross-small"></use></svg>
          <span>Șterge</span>
        </button>
      </div>
    `;
      lockWidth(false);
      popover.hidden = false;
      initPickers(popover);
      render();
      place(bar.querySelector(`[data-filter-facet="${CSS.escape(facet.key)}"]`) || anchor);
      requestAnimationFrame(() => (popover.querySelector("[data-filter-date-preset]:checked") || popover.querySelector("[data-filter-date-preset]"))?.focus());
    };

    const openFacet = (key, anchor) => {
      const facet = cfg.allFacets().find((f) => f.key === key);
      if (!facet) return;
      ensurePopover();
      moreOpen = false;
      if (isDate(facet)) { openDateFacet(facet, anchor); return; }
      popover.classList.remove("e-permits-workplace__filter-pop--date");
      edit = { key, values: new Set(draftOf()[key] || []), query: "", anchor };
      const many = wantsSearch(facet, cfg.options(facet).length);
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", `Filtru: ${facet.label}`);
      popover.innerHTML = `
      ${many ? `
        <div class="e-permits-workplace__filter-head">
          <div class="search-input medium rectangular e-permits-workplace__search">
            <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${sprite}#icon-search"></use></svg></span>
            <input class="input" type="search" placeholder="Caută în ${escapeHtml(facet.label.toLocaleLowerCase("ro"))}" aria-label="Caută în ${escapeHtml(facet.label)}" data-filter-search>
            ${searchActions()}
          </div>
        </div>` : ""}
      <ul class="e-permits-workplace__filter-list" role="list" data-filter-list>${renderOptions()}</ul>
      <div class="e-permits-workplace__filter-footer">
        <button class="btn btn-primary btn-sm" type="button" data-filter-confirm>Confirmă</button>
        <button class="btn btn-neutral btn-sm" type="button" data-filter-reset>
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="${sprite}#icon-cross-small"></use></svg>
          <span>Șterge</span>
        </button>
      </div>
    `;
      lockWidth(false);
      popover.hidden = false;
      render();
      lockWidth(true);
      place(bar.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`) || bar.querySelector("[data-filter-more]") || anchor);
      requestAnimationFrame(() => (popover.querySelector("[data-filter-search]") || popover.querySelector("[data-filter-option]") || popover.querySelector("[data-filter-confirm]"))?.focus());
    };

    const openMore = (anchor) => {
      ensurePopover();
      edit = null;
      moreOpen = true;
      popover.classList.remove("e-permits-workplace__filter-pop--date");
      const facets = cfg.facets();
      const draft = draftOf();
      const inline = facets.filter((f, i) => i < INLINE_MAX || draft[f.key]?.length);
      popover.setAttribute("role", "menu");
      popover.setAttribute("aria-label", "Mai multe filtre");
      popover.innerHTML = `<div class="e-permits-workplace__filter-list">${facets.filter((f) => !inline.includes(f)).map((f) => `
      <button class="e-permits-workplace__filter-more-item" type="button" role="menuitem" data-filter-more-facet="${escapeHtml(f.key)}">${escapeHtml(f.label)}</button>`).join("")}</div>`;
      lockWidth(false);
      popover.hidden = false;
      render();
      place(bar.querySelector("[data-filter-more]") || anchor);
      requestAnimationFrame(() => popover.querySelector("[data-filter-more-facet]")?.focus());
    };

    /* popover "Confirmă": the facet goes into the draft; nothing is queried yet */
    const confirmFacet = () => {
      const draft = draftOf();
      if (edit.date) {
        const res = readDate(popover, edit.key, edit.date, true);
        if (!res.ok) { popover.querySelector(".e-permits-fo-input.is-error input")?.focus(); return; }
        if (res.token) draft[edit.key] = [res.token]; else delete draft[edit.key];
        close();
        return;
      }
      const values = [...edit.values];
      if (values.length) draft[edit.key] = values; else delete draft[edit.key];
      close();
    };

    /* bar "Aplică filtrele": one query for everything that changed */
    const commit = () => {
      const state = cfg.state();
      state.applied = JSON.parse(JSON.stringify(draftOf()));
      Object.keys(state.applied).forEach((k) => { if (!state.applied[k]?.length) delete state.applied[k]; });
      state.draft = null;
      save();
      cfg.apply();
      bar?.querySelector("[data-filter-clear-all], [data-filter-facet]")?.focus();
    };

    const discard = () => { cfg.state().draft = null; render(); };

    const clearAll = () => {
      const state = cfg.state();
      state.applied = {};
      state.draft = null;
      save();
      cfg.apply();
    };

    function wirePopover() {
      popover.addEventListener("change", (event) => {
        if (edit?.date) {
          const preset = event.target.closest("[data-filter-date-preset]");
          const dayInput = event.target.closest("[data-filter-date-input]");
          if (preset) {
            edit.date.preset = preset.value;
            const range = popover.querySelector("[data-filter-range]");
            range.hidden = edit.date.preset !== CUSTOM;
            if (range.hidden) clearFieldErrors(range);
          }
          if (dayInput) {
            const iso = typedDay(dayInput.value);
            if (iso !== null) edit.date[dayInput.dataset.filterDatePart] = iso;
            clearFieldErrors(dayInput.closest("[data-filter-range]"));
          }
          return;
        }
        const box = event.target.closest("[data-filter-option]");
        if (!box || !edit) return;
        if (box.checked) edit.values.add(box.value); else edit.values.delete(box.value);
      });
      popover.addEventListener("input", (event) => {
        if (!event.target.closest("[data-filter-search]") || !edit) return;
        edit.query = event.target.value;
        popover.querySelector("[data-filter-list]").innerHTML = renderOptions();
      });
      popover.addEventListener("click", (event) => {
        const moreFacet = event.target.closest("[data-filter-more-facet]");
        if (moreFacet) { openFacet(moreFacet.dataset.filterMoreFacet, bar.querySelector("[data-filter-more]")); return; }
        if (!edit) return;
        if (event.target.closest("[data-filter-confirm]")) { confirmFacet(); return; }
        if (event.target.closest("[data-filter-reset]") && edit.date) {
          edit.date = { preset: "", from: "", to: "" };
          popover.querySelectorAll("[data-filter-date-preset]").forEach((radio) => { radio.checked = false; });
          const range = popover.querySelector("[data-filter-range]");
          clearFieldErrors(range);
          range.hidden = true;
          range.querySelectorAll("[data-filter-date-input]").forEach((input) => { input.value = ""; input.closest("[data-date-picker]").dataset.selected = ""; });
          return;
        }
        if (event.target.closest("[data-filter-reset]")) {
          edit.values.clear();
          popover.querySelectorAll("[data-filter-option]").forEach((box) => { box.checked = false; });
        }
      });
      popover.addEventListener("keydown", (event) => {
        /* Esc in an open calendar closes only the calendar (js/input-date-picker.js, on the document) */
        if (event.key === "Escape" && pickerOpen(popover)) return;
        if (event.key === "Escape") { event.preventDefault(); close(); return; }
        /* ↓ / ↑ walk search → values (→ back up to the search); the date facet keeps its native radio arrows */
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && edit && !edit.date) {
          const stops = [...popover.querySelectorAll("[data-filter-search], [data-filter-option]")];
          const at = stops.indexOf(event.target);
          if (at < 0) return;
          const next = stops[at + (event.key === "ArrowDown" ? 1 : -1)];
          event.preventDefault();
          next?.focus();
          return;
        }
        if (event.key === "Enter" && edit && !event.target.closest("button")) { event.preventDefault(); confirmFacet(); }
      });
    }

    toggle?.addEventListener("click", () => {
      if (toggle.getAttribute("aria-disabled") === "true") return;
      if (isPhone()) { openSheet("all", null, toggle); return; }
      const state = cfg.state();
      const visible = !bar.hidden;
      if (visible && pending()) { bar.querySelector("[data-filter-commit]")?.focus(); return; }
      state.open = !visible;
      save();
      render();
      if (state.open) bar.querySelector("[data-filter-facet]")?.focus();
    });

    /* the date chip × : that period goes at once (applied + draft), as „Șterge filtrele” does for all */
    const clearFacet = (key) => {
      const state = cfg.state();
      delete state.applied[key];
      if (state.draft) delete state.draft[key];
      if (edit?.key === key) close(false);
      save();
      cfg.apply();
      bar?.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`)?.focus();
    };

    bar?.addEventListener("click", (event) => {
      const dateClear = event.target.closest("[data-filter-date-clear]");
      if (dateClear) { clearFacet(dateClear.dataset.filterDateClear); return; }
      if (event.target.closest("[data-filter-clear-all]")) {
        clearAll();
        /* phones: the line with the button goes away — focus the icon-only „Filtre” */
        if (isPhone()) toggle?.focus();
        return;
      }
      if (event.target.closest("[data-filter-commit]")) { commit(); return; }
      if (event.target.closest("[data-filter-discard]")) { discard(); return; }
      const more = event.target.closest("[data-filter-more]");
      if (more) { if (moreOpen) close(); else openMore(more); return; }
      const chip = event.target.closest("[data-filter-facet]");
      if (!chip) return;
      if (isPhone()) { openSheet("facet", chip.dataset.filterFacet, chip); return; }
      if (edit?.key === chip.dataset.filterFacet) { close(); return; }
      openFacet(chip.dataset.filterFacet, chip);
    });

    /* the empty-table "Șterge filtrele" lives in the table body */
    document.addEventListener("click", (event) => {
      const clear = event.target.closest("[data-filter-clear-all]");
      if (clear && !bar?.contains(clear)) { event.stopPropagation(); clearAll(); }
    });

    /* outside click / resize / table scroll cancel the open popover (the draft stays) */
    document.addEventListener("pointerdown", (event) => {
      if (!popover || popover.hidden) return;
      if (popover.contains(event.target) || event.target.closest("[data-filter-facet], [data-filter-more]")) return;
      close(false);
    });
    window.addEventListener("resize", () => close(false));
    (cfg.scrollers || []).forEach((el) => el?.addEventListener("scroll", () => close(false), { passive: true }));

    return { render, close, clearAll };
  }

  window.GEAPFacetFilter = { create, dateMatch, dateText, DATE_PRESETS };
  /* the shared phone sheet (used by js/act-row.js) */
  window.GEAPSheet = { create: sheetCreate, show: sheetShow, hide: sheetHide, trapTab: sheetTrapTab, morph: sheetMorph, hold: sheetHold };
})();
