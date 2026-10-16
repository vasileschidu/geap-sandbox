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
   }) → { render, close, clearAll } */
(function () {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const INLINE_MAX = 4;

  function create(cfg) {
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

    const appliedEntries = () => Object.entries(cfg.state().applied).filter(([, values]) => values?.length);
    const draftOf = () => { const st = cfg.state(); if (!st.draft) st.draft = JSON.parse(JSON.stringify(st.applied)); return st.draft; };
    const sameSelection = (a = {}, b = {}) => {
      const norm = (o) => JSON.stringify(Object.keys(o).filter((k) => o[k]?.length).sort().map((k) => [k, [...o[k]].sort()]));
      return norm(a) === norm(b);
    };
    const pending = () => !sameSelection(draftOf(), cfg.state().applied);
    /* library .search-input actions: spinner while typing + clear (×) — js/search.js */
    const searchActions = () => `<div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="${sprite}#icon-cross-small"></use></svg></button></div>`;

    const render = () => {
      if (!bar) return;
      const state = cfg.state();
      /* arriving on another table: its bar starts closed and an unapplied draft is dropped */
      const page = cfg.pageKey ? cfg.pageKey() : "";
      if (barPage !== page) {
        if (cfg.onPageChange) cfg.onPageChange(); else { state.open = false; state.draft = null; }
        barPage = page;
      }
      const draft = draftOf();
      const appliedCount = appliedEntries().reduce((sum, [, values]) => sum + values.length, 0);
      if (count) { count.hidden = !appliedCount; count.textContent = String(appliedCount); }
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
      const chip = (facet) => {
        const n = draft[facet.key]?.length || 0;
        const open = edit?.key === facet.key;
        return `<button class="chip${n ? " is-selected" : ""} e-permits-workplace__filter-chip" type="button" aria-haspopup="dialog" aria-expanded="${open}" data-filter-facet="${escapeHtml(facet.key)}"${n ? ` aria-label="${escapeHtml(facet.label)}: ${n} ${n === 1 ? "valoare selectată" : "valori selectate"}"` : ""}>
        <span class="chip__label">${escapeHtml(facet.label)}</span>
        ${n ? `<span class="badge badge--lg badge--solid-light">${n}</span>` : ""}
        <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${sprite}#icon-chevron-${open ? "top" : "bottom"}"></use></svg>
      </button>`;
      };
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

    const ensurePopover = () => {
      if (popover) return;
      popover = document.createElement("div");
      popover.className = "e-permits-fo-intent-menu e-permits-workplace__filter-pop";
      popover.hidden = true;
      document.body.appendChild(popover);
      wirePopover();
    };

    const place = (anchor) => {
      const r = anchor.getBoundingClientRect();
      const width = popover.offsetWidth;
      popover.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`;
      popover.style.top = `${r.bottom + 8}px`;
    };

    const close = (restoreFocus = true) => {
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
      const q = edit.query.trim().toLocaleLowerCase("ro");
      const options = cfg.options(facet).filter((o) => !q || o.value.toLocaleLowerCase("ro").includes(q));
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
      }).join("") : `<li>${window.GEAPEmptyState.noResults("Nicio valoare nu corespunde", { text: "Încearcă alți termeni.", bare: true, compact: true })}</li>`;
    };

    const openFacet = (key, anchor) => {
      const facet = cfg.allFacets().find((f) => f.key === key);
      if (!facet) return;
      ensurePopover();
      moreOpen = false;
      edit = { key, values: new Set(draftOf()[key] || []), query: "", anchor };
      const many = cfg.options(facet).length > 7;
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
      popover.hidden = false;
      render();
      place(bar.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`) || bar.querySelector("[data-filter-more]") || anchor);
      requestAnimationFrame(() => (popover.querySelector("[data-filter-search]") || popover.querySelector("[data-filter-option]") || popover.querySelector("[data-filter-confirm]"))?.focus());
    };

    const openMore = (anchor) => {
      ensurePopover();
      edit = null;
      moreOpen = true;
      const facets = cfg.facets();
      const draft = draftOf();
      const inline = facets.filter((f, i) => i < INLINE_MAX || draft[f.key]?.length);
      popover.setAttribute("role", "menu");
      popover.setAttribute("aria-label", "Mai multe filtre");
      popover.innerHTML = `<div class="e-permits-workplace__filter-list">${facets.filter((f) => !inline.includes(f)).map((f) => `
      <button class="e-permits-workplace__filter-more-item" type="button" role="menuitem" data-filter-more-facet="${escapeHtml(f.key)}">${escapeHtml(f.label)}</button>`).join("")}</div>`;
      popover.hidden = false;
      render();
      place(bar.querySelector("[data-filter-more]") || anchor);
      requestAnimationFrame(() => popover.querySelector("[data-filter-more-facet]")?.focus());
    };

    /* popover "Confirmă": the facet goes into the draft; nothing is queried yet */
    const confirmFacet = () => {
      const draft = draftOf();
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
        if (event.target.closest("[data-filter-reset]")) {
          edit.values.clear();
          popover.querySelectorAll("[data-filter-option]").forEach((box) => { box.checked = false; });
        }
      });
      popover.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); close(); return; }
        if (event.key === "Enter" && edit && !event.target.closest("button")) { event.preventDefault(); confirmFacet(); }
      });
    }

    toggle?.addEventListener("click", () => {
      if (toggle.getAttribute("aria-disabled") === "true") return;
      const state = cfg.state();
      const visible = !bar.hidden;
      if (visible && pending()) { bar.querySelector("[data-filter-commit]")?.focus(); return; }
      state.open = !visible;
      save();
      render();
      if (state.open) bar.querySelector("[data-filter-facet]")?.focus();
    });

    bar?.addEventListener("click", (event) => {
      if (event.target.closest("[data-filter-clear-all]")) { clearAll(); return; }
      if (event.target.closest("[data-filter-commit]")) { commit(); return; }
      if (event.target.closest("[data-filter-discard]")) { discard(); return; }
      const more = event.target.closest("[data-filter-more]");
      if (more) { if (moreOpen) close(); else openMore(more); return; }
      const chip = event.target.closest("[data-filter-facet]");
      if (!chip) return;
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

  window.GEAPFacetFilter = { create };
})();
