/* Date picker — library. Pickers present at load are wired on DOMContentLoaded; content
   rendered later (drawers, modals) calls window.GEAPDatePicker.init(root). Romanian month
   names with data-locale="ro". Picking a day fires a bubbling "change" on the input;
   the ISO value is on the picker's data-selected. A plain picker's header = `‹ [Month ⌄] [Year ⌄] ›` (two dropdown lists). */
(() => {
  const allPickers = () => Array.from(document.querySelectorAll("[data-date-picker]"));
  const monthsRo = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const pad = (value) => String(value).padStart(2, "0");

  const toISODate = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  /* Typing aid (2026-11-05): digits only, „/” inserted after DD and MM, max 10 characters (04112031 → 04/11/2031).
     `insert` adds the trailing „/” right after DD / MM; a delete does not (so Backspace can walk back over it). */
  const formatTyped = (digits, insert) => {
    const d = digits.slice(0, 8);
    let out = d.slice(0, 2);
    if (d.length > 2 || (insert && d.length === 2)) out += "/";
    out += d.slice(2, 4);
    if (d.length > 4 || (insert && d.length === 4)) out += "/";
    return out + d.slice(4, 8);
  };
  /* „4.11.2031” / „04-11-2031” / „04112031” → „04/11/2031”; null when the text is not a whole date */
  const normalizePasted = (text) => {
    const t = String(text).trim();
    const m = t.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{4})$/);
    if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
    return /^\d{8}$/.test(t) ? formatTyped(t, false) : null;
  };
  const realDate = (text) => {
    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "";
    const [, d, mo, y] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? toISODate(y, mo - 1, d) : "";
  };

  const compareISO = (a, b) => {
    if (!a || !b) return 0;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  };

  const applyResponsive = () => {
    const isMobile = mobileQuery.matches;
    allPickers().forEach((picker) => {
      picker.classList.toggle("is-mobile", isMobile);
      const panel = picker.querySelector(".date-picker-panel");
      if (panel) {
        panel.classList.toggle("is-mobile", isMobile);
      }
      const input = picker.querySelector(".js-date-picker-input");
      if (input) {
        if (isMobile) {
          input.setAttribute("readonly", "true");
          input.setAttribute("inputmode", "none");
        } else {
          input.removeAttribute("readonly");
          input.setAttribute("inputmode", "numeric");
        }
      }
    });
  };

  const buildMonthView = (state, container, setView, onSelect) => {
    if (!container) return;
    container.innerHTML = "";
    const picked = (state.type === "range" ? [state.rangeStart, state.rangeEnd] : [state.selected]).filter(Boolean);
    (state.months || months).forEach((monthName, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__option";
      const key = `${state.year}-${pad(index + 1)}`;
      if (picked.some((iso) => iso.slice(0, 7) === key)) button.classList.add("is-selected");
      if (state.today && state.today.slice(0, 7) === key) button.classList.add("is-today");
      /* data-min: a month wholly before it cannot be opened */
      if (state.min && `${key}-31` < state.min) button.disabled = true;
      button.textContent = monthName;
      button.setAttribute("aria-label", `${(state.months || months)[index]} ${state.year}`);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.month = index;
        setView("day");
        if (typeof onSelect === "function") onSelect();
      });
      container.appendChild(button);
    });
  };

  const buildYearView = (state, container, setView, onSelect) => {
    if (!container) return;
    const rangeSize = 12;
    if (state.yearRangeStart == null) {
      state.yearRangeStart = state.year - 4;
    }
    container.innerHTML = "";
    for (let i = 0; i < rangeSize; i += 1) {
      const yearValue = state.yearRangeStart + i;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__option";
      const picked = (state.type === "range" ? [state.rangeStart, state.rangeEnd] : [state.selected]).filter(Boolean);
      if (picked.some((iso) => iso.slice(0, 4) === String(yearValue))) button.classList.add("is-selected");
      if (state.today && state.today.slice(0, 4) === String(yearValue)) button.classList.add("is-today");
      if (state.min && `${yearValue}-12-31` < state.min) button.disabled = true;
      button.textContent = String(yearValue);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.year = yearValue;
        setView("day");
        if (typeof onSelect === "function") onSelect();
      });
      container.appendChild(button);
    }
  };

  const buildDayView = (state, container, type) => {
    if (!container) return;
    const year = state.year;
    const month = state.month;

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const totalCells = 42;
    const rangeStart = state.rangeStart || "";
    const rangeEnd = state.rangeEnd || "";
    const selected = state.selected || "";
    const today = state.today || "";
    const min = state.min || "";

    container.innerHTML = "";
    for (let i = 0; i < totalCells; i += 1) {
      const dayNumber = i - startOffset + 1;
      let day = dayNumber;
      let cellMonth = month;
      let cellYear = year;
      let isOutside = false;

      if (dayNumber < 1) {
        isOutside = true;
        day = daysInPrevMonth + dayNumber;
        cellMonth = month - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear -= 1;
        }
      } else if (dayNumber > daysInMonth) {
        isOutside = true;
        day = dayNumber - daysInMonth;
        cellMonth = month + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear += 1;
        }
      }

      const isoDate = toISODate(cellYear, cellMonth, day);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-picker__day";
      button.textContent = String(day);
      button.dataset.date = isoDate;

      if (isOutside) {
        button.classList.add("is-outside");
        button.disabled = true;
      }

      /* data-min="YYYY-MM-DD": earlier days cannot be picked */
      if (min && isoDate < min) {
        button.disabled = true;
      }

      if (today && isoDate === today) {
        button.classList.add("is-today");
      }

      if (type === "range") {
        if (rangeStart && isoDate === rangeStart) {
          button.classList.add("is-range-start");
        }
        if (rangeEnd && isoDate === rangeEnd) {
          button.classList.add("is-range-end");
        }
        if (rangeStart && rangeEnd && isoDate > rangeStart && isoDate < rangeEnd) {
          button.classList.add("is-in-range");
        }
      } else if (selected && isoDate === selected) {
        button.classList.add("is-selected");
      }

      container.appendChild(button);
    }
  };

  const initPicker = (picker) => {
    if (picker.dataset.dpReady === "true") return;
    picker.dataset.dpReady = "true";
    const input = picker.querySelector(".js-date-picker-input");
    const toggle = picker.querySelector(".js-date-picker-toggle");
    const panel = picker.querySelector(".date-picker-panel");
    const daysContainer = picker.querySelector(".js-date-picker-days");
    let monthsContainer = picker.querySelector(".js-date-picker-months");
    let yearsContainer = picker.querySelector(".js-date-picker-years");
    const monthLabel = picker.querySelector(".js-date-picker-month-label");
    const yearLabel = picker.querySelector(".js-date-picker-year-label");
    let label = picker.querySelector(".js-date-picker-label");

    if (!daysContainer) return;

    const now = new Date();
    const state = {
      type: picker.dataset.type || "default",
      view: picker.dataset.view || "day",
      year: parseInt(picker.dataset.year || now.getFullYear(), 10),
      month: parseInt(picker.dataset.month || now.getMonth(), 10),
      selected: picker.dataset.selected || "",
      rangeStart: picker.dataset.rangeStart || "",
      rangeEnd: picker.dataset.rangeEnd || "",
      today: picker.dataset.today || toISODate(now.getFullYear(), now.getMonth(), now.getDate()),
      min: picker.dataset.min || "",
      yearRangeStart: null,
      months: picker.dataset.locale === "ro" ? monthsRo : months
    };

    /* Month + year dropdowns (dp-select-v1, 2026-11-06; user: the drill-up „is bad UX”): a plain picker (title only) gets
       `‹  [Noiembrie ⌄] [2026 ⌄]  ›` — two independent small text buttons, each opening a library dropdown list (month names;
       years from data-min's year, else this year − 100 … + 10) over the day grid, which never changes view. A month / year
       changes only that part. Pickers that carry their own month / year grids (the „advanced” header) are left alone. */
    const ro = picker.dataset.locale === "ro";
    const L = ro
      ? { month: "Alege luna", year: "Alege anul", prev: "Luna anterioară", next: "Luna următoare" }
      : { month: "Choose month", year: "Choose year", prev: "Previous month", next: "Next month" };
    const plainTitle = picker.querySelector(".date-picker__header .js-date-picker-label");
    const triggers = {};
    const closeMenus = () => picker.querySelectorAll(".date-picker__select.is-open").forEach((wrap) => wrap.__dpClose?.(false));
    if (plainTitle && !picker.querySelector(".js-date-picker-months")) {
      const navUse = picker.querySelector(".date-picker__nav use");
      const sprite = (navUse?.getAttribute("href") || "").split("#")[0];
      const uid = `${picker.id || (picker.querySelector(".js-date-picker-input")?.id) || "dp"}-${Math.random().toString(36).slice(2, 7)}`;
      const part = (kind) => `<span class="date-picker__select" data-dp-select="${kind}">
          <button type="button" class="btn btn-text-strict btn-sm date-picker__select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${uid}-${kind}" aria-label="${L[kind]}"><span class="js-date-picker-${kind}-label"></span><svg class="icon small" aria-hidden="true"><use href="${sprite}#icon-chevron-bottom-small"></use></svg></button>
          <ul class="date-picker__menu" id="${uid}-${kind}" role="listbox" aria-label="${L[kind]}" hidden></ul>
        </span>`;
      const group = document.createElement("div");
      group.className = "date-picker__selects date-picker__selects--menus";
      group.innerHTML = part("month") + part("year");
      plainTitle.replaceWith(group);
      label = null;
      picker.querySelectorAll(".js-date-picker-prev").forEach((b) => b.setAttribute("aria-label", L.prev));
      picker.querySelectorAll(".js-date-picker-next").forEach((b) => b.setAttribute("aria-label", L.next));
      group.querySelectorAll(".date-picker__select").forEach((wrap) => {
        const kind = wrap.dataset.dpSelect;
        const trigger = wrap.querySelector(".date-picker__select-trigger");
        const menu = wrap.querySelector(".date-picker__menu");
        let typed = "";
        let typedTimer = 0;
        const entries = () => {
          if (kind === "month") {
            return state.months.map((name, index) => ({ value: index, text: name, disabled: !!state.min && `${state.year}-${pad(index + 1)}-31` < state.min }));
          }
          const first = state.min ? Number(state.min.slice(0, 4)) : Number(state.today.slice(0, 4)) - 100;
          const last = Number(state.today.slice(0, 4)) + 10;
          const out = [];
          for (let y = Math.min(first, state.year); y <= Math.max(last, state.year); y += 1) out.push({ value: y, text: String(y) });
          return out;
        };
        const options = () => Array.from(menu.querySelectorAll('[role="option"]:not([aria-disabled="true"])'));
        const focusOption = (option) => { if (!option) return; option.focus(); option.scrollIntoView({ block: "nearest" }); };
        const closeMenu = (refocus) => {
          wrap.classList.remove("is-open");
          menu.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
          if (refocus) trigger.focus();
        };
        wrap.__dpClose = closeMenu;
        const choose = (option) => {
          if (kind === "month") state.month = Number(option.dataset.value); else state.year = Number(option.dataset.value);
          closeMenu(true);
          render();
        };
        const openMenu = () => {
          closeMenus();
          const current = kind === "month" ? state.month : state.year;
          menu.innerHTML = "";
          entries().forEach((entry) => {
            const item = document.createElement("li");
            const selected = entry.value === current;
            item.className = `date-picker__menu-item${selected ? " is-selected" : ""}`;
            item.setAttribute("role", "option");
            item.setAttribute("aria-selected", String(selected));
            item.tabIndex = -1;
            item.dataset.value = String(entry.value);
            item.textContent = entry.text;
            if (entry.disabled) { item.classList.add("is-disabled"); item.setAttribute("aria-disabled", "true"); }
            menu.appendChild(item);
          });
          menu.hidden = false;
          wrap.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          /* the selected value centred in the list, focus on it */
          const selectedItem = menu.querySelector(".is-selected");
          if (selectedItem) {
            menu.scrollTop = selectedItem.offsetTop - (menu.clientHeight - selectedItem.offsetHeight) / 2;
            selectedItem.focus({ preventScroll: true });
          }
        };
        trigger.addEventListener("click", (event) => {
          event.stopPropagation();
          if (wrap.classList.contains("is-open")) closeMenu(false); else openMenu();
        });
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!wrap.classList.contains("is-open")) openMenu(); }
        });
        menu.addEventListener("click", (event) => {
          event.stopPropagation();
          const option = event.target.closest('[role="option"]');
          if (option && option.getAttribute("aria-disabled") !== "true") choose(option);
        });
        menu.addEventListener("keydown", (event) => {
          const list = options();
          const at = list.indexOf(document.activeElement);
          /* keys of the list stay in the list: a host popover (RAP facet) confirms + closes on Enter / Esc */
          if (event.key !== "Tab") event.stopPropagation();
          const go = (next) => { event.preventDefault(); focusOption(list[Math.max(0, Math.min(list.length - 1, next))]); };
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMenu(true); }
          else if (event.key === "ArrowDown") go(at + 1);
          else if (event.key === "ArrowUp") go(at - 1);
          else if (event.key === "Home") go(0);
          else if (event.key === "End") go(list.length - 1);
          else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (at > -1) choose(list[at]); }
          else if (event.key === "Tab") closeMenu(false);
          else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            /* type-ahead: the typed prefix (month names: letters, years: digits), reset after a pause */
            typed += event.key.toLocaleLowerCase();
            clearTimeout(typedTimer);
            typedTimer = setTimeout(() => { typed = ""; }, 700);
            const hit = list.find((option) => option.textContent.toLocaleLowerCase().startsWith(typed));
            if (hit) { event.preventDefault(); focusOption(hit); }
          }
        });
        triggers[kind] = trigger;
      });
    }

    const viewGrids = picker.querySelectorAll(".date-picker__grid[data-view]");

    const setView = (view) => {
      state.view = view;
      picker.dataset.view = view;
      if (view === "year") state.yearRangeStart = null;
      viewGrids.forEach((grid) => {
        grid.hidden = grid.dataset.view !== view;
      });
      render();
    };

    const syncLabels = () => {
      if (triggers.month) {
        picker.querySelector(".js-date-picker-month-label").textContent = state.months[state.month];
        picker.querySelector(".js-date-picker-year-label").textContent = String(state.year);
      }
      if (label) {
        label.textContent = `${state.months[state.month]} ${state.year}`;
      }
      if (monthLabel) {
        monthLabel.textContent = state.months[state.month];
      }
      if (yearLabel) {
        yearLabel.textContent = String(state.year);
      }
    };

    const syncInput = () => {
      if (!input) return;
      if (state.type === "range") {
        const start = formatDisplayDate(state.rangeStart);
        const end = formatDisplayDate(state.rangeEnd);
        if (start && end) {
          input.value = `${start} - ${end}`;
        } else if (start) {
          input.value = `${start} - `;
        }
      } else if (state.selected) {
        input.value = formatDisplayDate(state.selected);
      }
    };

    /* nearest ancestor that clips (scrolling drawer/modal body), else the viewport */
    const clipBottom = () => {
      for (let el = picker.parentElement; el && el !== document.body; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if (o === "auto" || o === "scroll" || o === "hidden") return Math.min(el.getBoundingClientRect().bottom, window.innerHeight);
      }
      return window.innerHeight;
    };

    const open = () => {
      if (!panel) return;
      applyResponsive();
      closeMenus();
      picker.classList.add("is-open");
      panel.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      /* open upwards when the panel would be clipped below and there is room above */
      panel.classList.remove("is-up");
      if (!picker.classList.contains("is-mobile")) {
        const rect = panel.getBoundingClientRect();
        const field = picker.getBoundingClientRect();
        if (rect.bottom > clipBottom() && field.top - rect.height - 8 > 0) panel.classList.add("is-up");
      }
    };

    const close = () => {
      if (!panel) return;
      picker.classList.remove("is-open");
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    const ensureOpen = () => {
      if (!panel || !panel.hidden) return;
      open();
    };

    const render = () => {
      syncLabels();
      buildDayView(state, daysContainer, state.type);
      buildMonthView(state, monthsContainer, setView, ensureOpen);
      buildYearView(state, yearsContainer, setView, ensureOpen);
      syncLabels();
      syncInput();
    };

    if (panel) {
      if (picker.dataset.open === "true") {
        open();
      } else {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
      }
    }

    toggle?.addEventListener("click", (event) => {
      if (!panel) return;
      event.preventDefault();
      if (picker.classList.contains("is-mobile")) {
        open();
        return;
      }
      if (panel.hidden) {
        open();
      } else {
        close();
      }
    });

    const handleInputOpen = (event) => {
      if (!panel) return;
      if (picker.classList.contains("is-mobile")) {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        open();
        if (document.activeElement === input) {
          input.blur();
        }
        return;
      }
      open();
    };

    input?.addEventListener("focus", handleInputOpen);
    input?.addEventListener("click", handleInputOpen);
    input?.addEventListener("pointerdown", handleInputOpen, { passive: false });
    input?.addEventListener("touchstart", handleInputOpen, { passive: false });
    panel?.addEventListener("click", (event) => {
      const clickedInside = !!event.target.closest(".date-picker");
      if (!picker.classList.contains("is-mobile")) return;
      if (!clickedInside) {
        close();
      }
    });
    input?.addEventListener("blur", (event) => {
      if (!panel) return;
      if (picker.classList.contains("is-mobile")) return;
      if (state.type === "range") return;
      if (picker.contains(event.relatedTarget)) return;
      close();
    });

    picker.addEventListener("click", (event) => {
      const target = event.target.closest(".date-picker__day");
      if (!target || target.disabled) return;
      const isoDate = target.dataset.date;
      if (!isoDate) return;
      event.stopPropagation();

      if (state.type === "range") {
        if (!state.rangeStart || (state.rangeStart && state.rangeEnd)) {
          state.rangeStart = isoDate;
          state.rangeEnd = "";
        } else if (state.rangeStart && !state.rangeEnd) {
          if (compareISO(isoDate, state.rangeStart) < 0) {
            state.rangeEnd = state.rangeStart;
            state.rangeStart = isoDate;
          } else {
            state.rangeEnd = isoDate;
          }
        }
      } else {
        state.selected = isoDate;
      }

      picker.dataset.selected = state.selected;
      picker.dataset.rangeStart = state.rangeStart || "";
      picker.dataset.rangeEnd = state.rangeEnd || "";

      render();
      input?.dispatchEvent(new Event("change", { bubbles: true }));

      if (state.type === "range") {
        if (state.rangeStart && state.rangeEnd) {
          close();
        } else {
          open();
        }
      } else {
        close();
      }
    });

    picker.querySelectorAll(".js-date-picker-month-toggle").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setView(state.view === "month" ? "day" : "month");
      });
    });

    picker.querySelectorAll(".js-date-picker-year-toggle").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setView(state.view === "year" ? "day" : "year");
      });
    });

    picker.querySelectorAll(".js-date-picker-prev").forEach((button) => {
      button.addEventListener("click", () => {
        closeMenus();
        if (state.view === "year") {
          state.yearRangeStart = (state.yearRangeStart ?? state.year) - 12;
        } else if (state.view === "month") {
          state.year -= 1;
        } else {
          state.month -= 1;
          if (state.month < 0) {
            state.month = 11;
            state.year -= 1;
          }
        }
        render();
      });
    });

    picker.querySelectorAll(".js-date-picker-next").forEach((button) => {
      button.addEventListener("click", () => {
        closeMenus();
        if (state.view === "year") {
          state.yearRangeStart = (state.yearRangeStart ?? state.year) + 12;
        } else if (state.view === "month") {
          state.year += 1;
        } else {
          state.month += 1;
          if (state.month > 11) {
            state.month = 0;
            state.year += 1;
          }
        }
        render();
      });
    });

    /* auto-format while typing (digits, „/” after DD and MM, 10 characters); a whole real date moves the calendar and
       tells the page (bubbling change); an impossible one (31/02/2031) gets the field's error look */
    if (input && state.type !== "range") {
      input.setAttribute("maxlength", "10");
      const inputBox = input.closest(".e-permits-fo-input");
      const apply = (text, caret) => {
        input.value = text;
        if (caret != null) input.setSelectionRange(caret, caret);
        inputBox?.classList.remove("is-error");
        input.removeAttribute("aria-invalid");
        if (text.length !== 10) return;
        const iso = realDate(text);
        if (!iso) { inputBox?.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); return; }
        state.selected = iso;
        state.year = Number(iso.slice(0, 4));
        state.month = Number(iso.slice(5, 7)) - 1;
        picker.dataset.selected = iso;
        setView("day");
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      let before = "";
      input.addEventListener("beforeinput", () => { before = input.value; });
      input.addEventListener("input", (event) => {
        const raw = input.value;
        let digits = raw.replace(/\D/g, "");
        const deleting = /^delete/.test(event.inputType || "");
        /* Backspace over a „/” removes the digit before it as well */
        if (deleting && digits.length === before.replace(/\D/g, "").length) digits = digits.slice(0, -1);
        const atEnd = (input.selectionStart ?? raw.length) >= raw.length;
        const text = formatTyped(digits, !deleting);
        let caret = null;
        if (!atEnd) {
          const keep = raw.slice(0, input.selectionStart).replace(/\D/g, "").length;
          caret = 0;
          for (let seen = 0; caret < text.length && seen < keep; caret += 1) if (/\d/.test(text[caret])) seen += 1;
        }
        apply(text, atEnd ? null : caret);
      });
      input.addEventListener("paste", (event) => {
        const whole = normalizePasted(event.clipboardData?.getData("text") || "");
        if (!whole) return;
        event.preventDefault();
        apply(whole, null);
      });
    }

    /* typed DD/MM/YYYY → selected date */
    input?.addEventListener("change", (event) => {
      if (!event.isTrusted || state.type === "range") return;
      const m = input.value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (!m) { if (!input.value.trim()) { state.selected = ""; picker.dataset.selected = ""; } return; }
      state.selected = toISODate(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      state.year = Number(m[3]); state.month = Number(m[2]) - 1;
      picker.dataset.selected = state.selected;
      render();
    });

    render();
    setView(state.view);
  };

  /* an open month / year list closes on a press anywhere outside it (focus stays where the press put it) */
  document.addEventListener("pointerdown", (event) => {
    document.querySelectorAll(".date-picker__select.is-open").forEach((wrap) => {
      if (!wrap.contains(event.target)) wrap.__dpClose?.(false);
    });
  });

  document.addEventListener("click", (event) => {
    allPickers().forEach((picker) => {
      const panel = picker.querySelector(".date-picker-panel");
      if (!panel) return;
      if (!picker.contains(event.target)) {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        const toggle = picker.querySelector(".js-date-picker-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        picker.classList.remove("is-open");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    allPickers().forEach((picker) => {
      const panel = picker.querySelector(".date-picker-panel");
      if (!panel) return;
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      const toggle = picker.querySelector(".js-date-picker-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      picker.classList.remove("is-open");
    });
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", applyResponsive);
  } else {
    window.addEventListener("resize", applyResponsive);
  }

  window.GEAPDatePicker = {
    init(root = document) {
      root.querySelectorAll("[data-date-picker]").forEach(initPicker);
      applyResponsive();
    }
  };
  const boot = () => window.GEAPDatePicker.init(document);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();





