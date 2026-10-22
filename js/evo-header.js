/* ==========================================================================================================
   EVO site header — ONE renderer for every EVO page (evo-header-v1, 2026-10-22)
   User (Vasile): „make sure the code has exactly this header from Components” = Figma Components
   doJ7tDY0PlQ0PqMgbpFVIC › header-evo-desktop 912:18991 (1248 / 1024 × Anonymous / Authenticated),
   header-evo-mobile 1210:5257 (Default / Active × Anonymous / Authenticated), the mega menu header-menu-evo 912:26673.
   Used by RAP (logged out) and the EVO Cabinet (logged in). Styles: css/evo-header.css. Docs: components.md › „EVO header”.

   Markup on the page (the renderer fills it; anything with data-evo-slot="account-menu" inside is kept and moved
   into the account box — the Cabinet instance switcher panel):

     <header class="evo-header" data-evo-header data-evo-auth="out|in"
             data-evo-home="../index.html" data-evo-cabinet="…" data-evo-catalog="…" data-evo-notifications="…"
             data-evo-initials="AC" data-evo-user="Anastasia Cojocaru" data-evo-user-role="Persoană fizică"> … </header>

   Load it with `defer` BEFORE the page script: deferred scripts run in order after parsing, so the page script
   finds the rendered header (data-fo-avatar-trigger, data-cab-name …) when it starts.
   ========================================================================================================== */
(function () {
  "use strict";

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch {
      return "assets/icons/sprite.svg";
    }
  })();
  const ASSETS = SPRITE.replace(/icons\/sprite\.svg$/, "");

  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const icon = (name, cls = "") => `<svg class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true" focusable="false"><use href="${SPRITE}#icon-${name}"></use></svg>`;

  /* the „Serviciile Publice” mega menu (Figma header-menu-evo 912:26673; the Figma columns repeat placeholder rows —
     the list below is the de-duplicated set; „Pentru afacerea ta” has no Figma content yet → demo rows, PO question) */
  const SERVICES = {
    title: "Serviciile Publice",
    text: "Accesează rapid serviciile statului, explicate clar și disponibile într-un singur loc.",
    groups: [
      {
        id: "pf",
        label: "Pentru tine",
        items: [
          ["id-card", "Acte de identitate și stare civilă"],
          ["group", "Familie și protecție socială"],
          ["education", "Educație și tineret"],
          ["suitcase-2", "Muncă și ocuparea forței de muncă"],
          ["old-man", "Pensii și beneficii pentru persoanele vârstnice"],
          ["health", "Sănătate și asigurări medicale"],
          ["building", "Locuință și urbanism"],
          ["car", "Transport și vehicule"],
          ["judge-gavel", "Evidențe judiciare"],
          ["globe", "Cetățenie și migrație"],
        ],
      },
      {
        id: "pj",
        label: "Pentru afacerea ta",
        items: [
          ["business", "Înregistrarea și modificarea afacerii"],
          ["permission", "Autorizații și acte permisive"],
          ["page-text", "Impozite, taxe și raportări"],
          ["globe", "Comerț, import și export"],
          ["car", "Transport și logistică"],
          ["health", "Sănătate și siguranța alimentelor"],
        ],
      },
    ],
  };
  const LANGUAGES = [["ro", "Ro", "Română"], ["ru", "Ru", "Русский"], ["en", "En", "English"]];

  let uid = 0;

  function columnsHtml(items, href) {
    const per = Math.ceil(items.length / 3);
    const cols = [0, 1, 2].map((i) => items.slice(i * per, (i + 1) * per)).filter((col) => col.length);
    return cols
      .map((col) => `<ul class="evo-header__mega-col">${col
        .map(([glyph, label]) => `<li><a class="evo-header__mega-link" href="${escape(href)}"><span class="evo-header__mega-icon">${icon(glyph)}</span><span>${escape(label)}</span></a></li>`)
        .join("")}</ul>`)
      .join("");
  }

  /* desktop: the full-width panel under the bar (Servicii; „Meniu” at ≤1100 adds the other two entries) */
  function megaHtml(id, cfg) {
    const tabs = SERVICES.groups
      .map((group, index) => `<button class="evo-header__mega-tab${index ? "" : " is-active"}" type="button" role="tab" id="${id}-tab-${group.id}" aria-selected="${index ? "false" : "true"}" aria-controls="${id}-panel-${group.id}" tabindex="${index ? "-1" : "0"}" data-evo-mega-tab="${group.id}">${escape(group.label)}</button>`)
      .join("");
    const panels = SERVICES.groups
      .map((group, index) => `<div class="evo-header__mega-cols" role="tabpanel" id="${id}-panel-${group.id}" aria-labelledby="${id}-tab-${group.id}"${index ? " hidden" : ""}>${columnsHtml(group.items, cfg.catalog)}</div>`)
      .join("");
    return `
      <div class="evo-header__mega" id="${id}" data-evo-mega hidden>
        <div class="evo-header__mega-inner">
          <div class="evo-header__mega-heading">
            <a class="evo-header__mega-title" href="${escape(cfg.catalog)}"><span>${escape(SERVICES.title)}</span>${icon("chevron-right")}</a>
            <p class="evo-header__mega-text">${escape(SERVICES.text)}</p>
          </div>
          <div class="evo-header__mega-body">
            <div class="evo-header__mega-tabs" role="tablist" aria-label="${escape(SERVICES.title)}">${tabs}</div>
            ${panels}
          </div>
          <div class="evo-header__mega-more" data-evo-mega-more>
            <span class="evo-header__mega-soon" aria-disabled="true">Evenimente de viață <span class="status-tag status-tag--neutral is-strong status-tag--small">În curând</span></span>
            <a class="evo-header__mega-title" href="${escape(cfg.providers)}"><span>Prestatori servicii</span>${icon("chevron-right")}</a>
          </div>
        </div>
      </div>`;
  }

  /* phones: the Active state of header-evo-mobile = a full-screen menu (logo · language · ×, search, sections, actions) */
  function panelHtml(id, cfg) {
    const groups = SERVICES.groups
      .map((group) => `
        <button class="evo-header__panel-item" type="button" aria-expanded="false" aria-controls="${id}-${group.id}" data-evo-panel-group>
          <span>${escape(group.label)}</span>${icon("chevron-bottom")}
        </button>
        <ul class="evo-header__panel-sub" id="${id}-${group.id}" hidden>
          ${group.items.map(([glyph, label]) => `<li><a class="evo-header__panel-sub-link" href="${escape(cfg.catalog)}"><span class="evo-header__mega-icon">${icon(glyph)}</span><span>${escape(label)}</span></a></li>`).join("")}
        </ul>`)
      .join("");
    const langItems = LANGUAGES
      .map(([code, short, name]) => `<button class="e-permits-fo-intent-menu__item evo-header__lang-item${code === cfg.lang ? " is-selected" : ""}" type="button" role="menuitemradio" aria-checked="${code === cfg.lang}" lang="${code}" data-evo-lang="${code}"><span>${escape(name)}</span>${code === cfg.lang ? icon("checkmark-large") : ""}</button>`)
      .join("");
    const out = cfg.auth === "out"
      ? `<div class="evo-header__panel-foot">
           <a class="btn btn-primary btn-pill btn-lg" href="${escape(cfg.cabinet)}">Intră în cabinet</a>
           <a class="btn btn-secondary btn-pill btn-lg" href="${escape(cfg.signature)}">Obține semnătura</a>
         </div>`
      : "";
    return `
      <div class="evo-header__panel" id="${id}" role="dialog" aria-modal="true" aria-label="Meniu" data-evo-panel hidden>
        <div class="evo-header__panel-top">
          <a class="evo-header__logo" href="${escape(cfg.home)}" aria-label="EVO — pagina principală"><img class="evo-header__logo-mark" src="${ASSETS}logos/evo-logo.svg" width="40" height="40" alt=""></a>
          <div class="evo-header__panel-tools">
            <div class="evo-header__lang" data-evo-lang-menu>
              <button class="btn btn-neutral btn-pill btn-md evo-header__lang-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-lang" aria-label="Limba: ${escape(LANGUAGES.find(([c]) => c === cfg.lang)?.[2] || "Română")}" data-evo-lang-trigger>
                ${icon("globe")}<span data-evo-lang-current>${escape(LANGUAGES.find(([c]) => c === cfg.lang)?.[1] || "Ro")}</span>
              </button>
              <div class="e-permits-fo-intent-menu evo-header__lang-menu" id="${id}-lang" role="menu" aria-label="Limba" hidden>${langItems}</div>
            </div>
            <button class="evo-header__action" type="button" aria-label="Închide meniul" data-evo-panel-close>${icon("cross-large")}</button>
          </div>
        </div>
        <div class="evo-header__panel-scroll">
          <div class="evo-header__panel-search">
            <div class="search-input large circular evo-header__search">
              <span class="icon-search" aria-hidden="true">${icon("search")}</span>
              <input class="input" type="search" placeholder="Caută" aria-label="Caută pe EVO" autocomplete="off" data-evo-search>
              <div class="btn-group">
                <button type="button" class="btn-icon clear" aria-label="Șterge căutarea">${icon("cross-small", "small")}</button>
              </div>
            </div>
          </div>
          <nav class="evo-header__panel-nav" aria-label="Navigare principală">
            <div class="evo-header__panel-section">
              <div class="evo-header__panel-heading">
                <a class="evo-header__panel-title" href="${escape(cfg.catalog)}"><span>${escape(SERVICES.title)}</span>${icon("chevron-right")}</a>
                <p class="evo-header__panel-text">${escape(SERVICES.text)}</p>
              </div>
              <div class="evo-header__panel-groups">${groups}</div>
            </div>
            <div class="evo-header__panel-heading evo-header__panel-heading--single">
              <a class="evo-header__panel-title" href="${escape(cfg.providers)}"><span>Prestatori servicii</span>${icon("chevron-right")}</a>
            </div>
            <div class="evo-header__panel-links">
              <a class="evo-header__panel-link" href="${escape(cfg.platforms)}">${icon("dot-grid")}<span>Platforme utile</span></a>
              <a class="evo-header__panel-link" href="${escape(cfg.help)}">${icon("bubble-question")}<span>Asistență</span></a>
            </div>
          </nav>
        </div>
        ${out}
      </div>`;
  }

  function html(cfg) {
    const id = cfg.id || `evo-header-${++uid}`;
    const auth = cfg.auth === "in" ? "in" : "out";
    const languages = LANGUAGES
      .map(([code, short, name]) => `<button class="evo-header__language${code === cfg.lang ? " is-active" : ""}" type="button" lang="${code}" aria-label="${escape(name)}" aria-pressed="${code === cfg.lang}" data-evo-lang="${code}">${escape(short)}</button>`)
      .join("");
    const navItem = (label, extra = "") => `<button class="evo-header__nav-item" type="button" aria-expanded="false" aria-controls="${id}-mega" ${extra}><span>${escape(label)}</span>${icon("chevron-bottom-small", "small")}</button>`;
    const end = auth === "out"
      ? `<div class="evo-header__buttons">
           <a class="btn btn-primary btn-pill btn-md evo-header__button" href="${escape(cfg.cabinet)}">Intră în cabinet</a>
           <a class="btn btn-secondary btn-pill btn-md evo-header__button evo-header__button--sign" href="${escape(cfg.signature)}">Obține semnătura</a>
         </div>`
      : `<div class="evo-header__account" data-fo-avatar-menu data-evo-account>
           <button class="avatar avatar--md avatar--initials evo-header__avatar" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="fo-avatar-menu" data-fo-avatar-trigger>
             <span aria-hidden="true" data-evo-initials>${escape(cfg.initials)}</span>
             <span class="u-visually-hidden">Cont: ${escape(cfg.user)}, acționezi ca <span data-cab-name>${escape(cfg.user)}</span></span>
             <span data-cab-role hidden>${escape(cfg.userRole)}</span>
           </button>
         </div>`;
    const bell = auth === "in"
      ? `<a class="evo-header__action" href="${escape(cfg.notifications)}" aria-label="Notificări" data-evo-notifications${cfg.notificationsNav ? ` data-cab-nav-item="${escape(cfg.notificationsNav)}"` : ""}>${icon("notification")}</a>`
      : "";
    return `
      <div class="evo-header__top">
        <div class="evo-header__container">
          <a class="evo-header__gov" href="${escape(cfg.gov)}">
            <img src="${ASSETS}logos/egov.svg" width="18" height="21" alt="">
            <span>Guvernul Republicii Moldova</span>
          </a>
          <nav class="evo-header__languages" aria-label="Limba">${languages}</nav>
        </div>
      </div>
      <div class="evo-header__main">
        <div class="evo-header__container">
          <div class="evo-header__start">
            <a class="evo-header__logo" href="${escape(cfg.home)}" aria-label="EVO — pagina principală">
              <img class="evo-header__logo-full" src="${ASSETS}logos/evo-logo-main.svg" width="52" height="52" alt="">
              <img class="evo-header__logo-mark" src="${ASSETS}logos/evo-logo.svg" width="40" height="40" alt="">
            </a>
            <nav class="evo-header__nav" aria-label="Navigare principală">
              <div class="evo-header__nav-full">
                ${navItem("Servicii", 'data-evo-mega-trigger="servicii"')}
                <span class="evo-header__soon">
                  <button class="evo-header__nav-item is-disabled" type="button" aria-disabled="true" aria-describedby="${id}-soon"><span>Evenimente de viață</span>${icon("chevron-bottom-small", "small")}</button>
                  <span class="status-tag status-tag--neutral is-strong status-tag--small evo-header__soon-tag" id="${id}-soon" role="tooltip">În curând</span>
                </span>
                <a class="evo-header__nav-item" href="${escape(cfg.providers)}"><span>Prestatori servicii</span></a>
              </div>
              <div class="evo-header__nav-compact">
                ${navItem("Meniu", 'data-evo-mega-trigger="meniu"')}
              </div>
            </nav>
          </div>
          <div class="evo-header__end">
            <div class="evo-header__actions">
              <button class="evo-header__action" type="button" aria-label="Caută" data-evo-search-trigger>${icon("search")}</button>
              <button class="evo-header__action evo-header__action--desktop" type="button" aria-label="Asistență">${icon("bubble-question")}</button>
              <button class="evo-header__action evo-header__action--desktop" type="button" aria-label="Platforme utile">${icon("dot-grid")}</button>
              ${bell}
            </div>
            ${end}
            <button class="evo-header__action evo-header__burger" type="button" aria-label="Deschide meniul" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}-panel" data-evo-panel-open>${icon("menu")}</button>
          </div>
        </div>
      </div>
      ${megaHtml(`${id}-mega`, cfg)}
      ${panelHtml(`${id}-panel`, cfg)}`;
  }

  function configOf(root) {
    const d = root.dataset;
    return {
      id: d.evoId || "evo-header",
      /* data-evo-guest-param="auth": ?auth=0 on the page = a visitor without a session → the Anonymous variant */
      auth: d.evoAuth === "in" && !(d.evoGuestParam && new URLSearchParams(window.location.search).get(d.evoGuestParam) === "0") ? "in" : "out",
      lang: d.evoLang || "ro",
      home: d.evoHome || "#",
      gov: d.evoGov || "#",
      cabinet: d.evoCabinet || "#",
      signature: d.evoSignature || "#",
      catalog: d.evoCatalog || "#",
      providers: d.evoProviders || "#",
      platforms: d.evoPlatforms || "#",
      help: d.evoHelp || "#",
      notifications: d.evoNotifications || "#",
      notificationsNav: d.evoNotificationsNav || "",
      initials: d.evoInitials || "",
      user: d.evoUser || "",
      userRole: d.evoUserRole || "",
    };
  }

  /* ---------- behaviour ---------- */
  function bind(root) {
    const mega = root.querySelector("[data-evo-mega]");
    const panel = root.querySelector("[data-evo-panel]");
    const burger = root.querySelector("[data-evo-panel-open]");
    const langWrap = root.querySelector("[data-evo-lang-menu]");
    const langTrigger = root.querySelector("[data-evo-lang-trigger]");
    const langMenu = langWrap?.querySelector('[role="menu"]');
    let megaTrigger = null;

    const setMega = (trigger) => {
      root.querySelectorAll("[data-evo-mega-trigger]").forEach((btn) => btn.setAttribute("aria-expanded", String(btn === trigger)));
      megaTrigger = trigger;
      mega.hidden = !trigger;
      mega.classList.toggle("is-menu", trigger?.dataset.evoMegaTrigger === "meniu");
      root.classList.toggle("is-mega-open", !!trigger);
    };
    root.querySelectorAll("[data-evo-mega-trigger]").forEach((btn) => {
      btn.addEventListener("click", () => setMega(megaTrigger === btn ? null : btn));
      btn.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setMega(btn);
          mega.querySelector('[role="tab"][tabindex="0"]')?.focus();
        }
      });
    });

    /* tabs Pentru tine / Pentru afacerea ta (click, arrows) */
    const tabs = [...mega.querySelectorAll('[role="tab"]')];
    const selectTab = (tab, focus) => {
      tabs.forEach((other) => {
        const on = other === tab;
        other.classList.toggle("is-active", on);
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
        const pane = mega.querySelector(`#${other.getAttribute("aria-controls")}`);
        if (pane) pane.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
      });
    });

    /* language: the top bar Ro / Ru / En and the phone menu's language dropdown keep one value */
    const setLang = (code) => {
      root.querySelectorAll("[data-evo-lang]").forEach((btn) => {
        const on = btn.dataset.evoLang === code;
        btn.classList.toggle(btn.classList.contains("evo-header__language") ? "is-active" : "is-selected", on);
        btn.setAttribute(btn.getAttribute("role") === "menuitemradio" ? "aria-checked" : "aria-pressed", String(on));
        const check = btn.querySelector("svg");
        if (btn.getAttribute("role") === "menuitemradio") {
          if (on && !check) btn.insertAdjacentHTML("beforeend", icon("checkmark-large"));
          if (!on && check) check.remove();
        }
      });
      const entry = LANGUAGES.find(([c]) => c === code);
      if (entry && langTrigger) {
        langTrigger.querySelector("[data-evo-lang-current]").textContent = entry[1];
        langTrigger.setAttribute("aria-label", `Limba: ${entry[2]}`);
      }
      root.dataset.evoLang = code;
    };
    const setLangMenu = (open) => {
      if (!langMenu) return;
      langMenu.hidden = !open;
      langTrigger.setAttribute("aria-expanded", String(open));
    };
    root.querySelectorAll("[data-evo-lang]").forEach((btn) => btn.addEventListener("click", () => {
      setLang(btn.dataset.evoLang);
      if (langMenu?.contains(btn)) { setLangMenu(false); langTrigger.focus(); }
    }));
    langTrigger?.addEventListener("click", () => {
      const open = langMenu.hidden;
      setLangMenu(open);
      if (open) langMenu.querySelector('[aria-checked="true"]')?.focus();
    });
    langMenu?.addEventListener("keydown", (event) => {
      const items = [...langMenu.querySelectorAll('[role="menuitemradio"]')];
      const at = items.indexOf(document.activeElement);
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (step) { event.preventDefault(); items[(at + step + items.length) % items.length].focus(); }
      if (event.key === "Escape") { event.stopPropagation(); setLangMenu(false); langTrigger.focus(); }
    });

    /* phone menu (full screen) */
    const setPanel = (open) => {
      panel.hidden = !open;
      burger.setAttribute("aria-expanded", String(open));
      document.documentElement.classList.toggle("is-evo-panel-open", open);
      if (open) panel.querySelector("[data-evo-panel-close]")?.focus();
      else { setLangMenu(false); burger.focus(); }
    };
    burger.addEventListener("click", () => setPanel(true));
    panel.querySelector("[data-evo-panel-close]").addEventListener("click", () => setPanel(false));
    root.querySelector("[data-evo-search-trigger]")?.addEventListener("click", () => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      setPanel(true);
      panel.querySelector("[data-evo-search]")?.focus();
    });
    panel.querySelectorAll("[data-evo-panel-group]").forEach((btn) => btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      panel.querySelector(`#${btn.getAttribute("aria-controls")}`).hidden = !open;
    }));
    /* focus stays inside the open menu */
    panel.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const items = [...panel.querySelectorAll("a[href], button, input")].filter((el) => el.offsetParent !== null && !el.closest("[hidden]"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    document.addEventListener("click", (event) => {
      if (megaTrigger && !mega.contains(event.target) && !event.target.closest("[data-evo-mega-trigger]")) setMega(null);
      if (langMenu && !langMenu.hidden && !langWrap.contains(event.target)) setLangMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (megaTrigger) { const trigger = megaTrigger; setMega(null); trigger.focus(); return; }
      if (langMenu && !langMenu.hidden) { setLangMenu(false); langTrigger.focus(); return; }
      if (!panel.hidden) setPanel(false);
    });
    /* the menus belong to one layout: leaving it closes them */
    window.matchMedia("(max-width: 760px)").addEventListener("change", (event) => {
      if (event.matches) setMega(null);
      else if (!panel.hidden) setPanel(false);
    });
    window.matchMedia("(max-width: 1100px)").addEventListener("change", () => setMega(null));
  }

  function mount(root) {
    if (!root || root.dataset.evoMounted) return;
    const cfg = configOf(root);
    const slots = [...root.querySelectorAll("[data-evo-slot]")];
    slots.forEach((slot) => slot.remove());
    root.innerHTML = html(cfg);
    const account = root.querySelector("[data-evo-account]");
    slots.filter((slot) => slot.dataset.evoSlot === "account-menu").forEach((slot) => account?.append(slot));
    root.dataset.evoMounted = "true";
    bind(root);
  }

  window.GEAPEvoHeader = { html, mount, SERVICES, LANGUAGES };
  document.querySelectorAll("[data-evo-header]").forEach(mount);
})();
