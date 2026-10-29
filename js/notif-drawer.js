/* GEAPNotifDrawer — the BO header bell opens the NOTIFICATIONS DRAWER (notif-drawer-v1, 2026-10-29; components.md ›
   „Notifications drawer”). User decision after research: a bell dropdown does not scale to 100 notifications and floats;
   a full-height right drawer is the common admin pattern (Reddit Ads, Melio, Square). It replaces the din oficiu bell
   dropdown `#gh-ofc-notif` (oficiu-v2).
   Chrome = the ONE drawer (css/drawer.css + js/drawer.js: focus trap, Esc → ×, focus back to the bell), width `.drawer--sm`:
     header  „Notificări” + library text button „Marchează toate ca citite” (disabled with nothing unread) + library ×
     tabs    library `.tabs.tabs--sm` in the drawer tab strip (`.e-permits-tariff__tabs`): Toate · Necitite <count>
     list    grouped Azi / Ieri / Mai vechi; item = unread dot · title (stretched link: the whole row opens the object and
             marks it read) · one secondary line (cut → tooltip) · time; 20 at a time + „Încarcă mai multe” (library neutral)
     empty   GEAPEmptyState compact: no notifications / nothing unread
   Sources: the BO seed (dossiers of `GEAPShellApi.dossierStore()`, ~60, `?notificari=gol` = none) + every function pushed on
   `window.GEAPNotifSources` (js/ghiseu.js: the din oficiu draft removal warnings, US-247 AC-09). Read state = sessionStorage.
   The eKYC product keeps its own bell (alerts on its Dashboard). */
(() => {
  if (window.GEAPNotifDrawer) return;
  const PAGE = 20;
  const STORE = "geap-notif-read";
  const ID = "notif-drawer";
  const SPRITE = "assets/icons/sprite.svg";
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const params = new URLSearchParams(window.location.search);
  const EMPTY = params.get("notificari") === "gol";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const sources = (window.GEAPNotifSources = window.GEAPNotifSources || []);

  const state = { tab: "toate", shown: PAGE, read: null, seed: null, query: "" };
  /* search: case- and diacritics-insensitive */
  const fold = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const readSet = () => {
    if (!state.read) {
      try { state.read = new Set(JSON.parse(sessionStorage.getItem(STORE) || "[]")); } catch (error) { state.read = new Set(); }
    }
    return state.read;
  };
  const saveRead = () => { try { sessionStorage.setItem(STORE, JSON.stringify([...readSet()])); } catch (error) { /* private mode */ } };

  const bell = () => document.querySelector(".e-permits-shell__icon-button--notification");
  /* the eKYC product owns its bell (the active alerts on its Dashboard) */
  const ownedElsewhere = () => Boolean(document.querySelector('[data-nav-id="ek-dashboard"]'));
  const api = () => window.GEAPShellApi || null;

  /* ---- the BO seed: what a back-office user is told about (dossiers distributed / redistributed to them, terms
     running out, payments confirmed, documents supplemented, acts signed) — deterministic from the dossier seed ---- */
  const KINDS = [
    { kind: "distribuit", statuses: ["depus", "inExaminare"], tab: "general", title: () => "Dosar nou distribuit către dvs.", line: (r) => `${r.nrDosar} · ${r.serviciu}` },
    { kind: "termen", statuses: ["inExaminare"], tab: "general", title: () => "Termenul de examinare expiră în 2 zile lucrătoare", line: (r) => `${r.nrDosar} · ${r.serviciu}` },
    { kind: "plata", statuses: ["asteaptaPlata", "inExaminare"], tab: "taxe", title: () => "Plata a fost confirmată în MPay", line: (r) => `${r.nrDosar} · ${r.numeSolicitant || r.serviciu}` },
    { kind: "suplinire", statuses: ["inExaminare", "depus"], tab: "documente", title: () => "Solicitantul a completat dosarul", line: (r) => `${r.nrDosar} · documente noi încărcate` },
    { kind: "redistribuit", statuses: ["inExaminare", "depus"], tab: "general", title: () => "Dosar redistribuit către dvs.", line: (r) => `${r.nrDosar} · ${r.serviciu}` },
    { kind: "act", statuses: ["semnat", "eliberat"], tab: "decizie", title: (r) => `Actul permisiv ${r.nrActEmis || ""} a fost semnat`.replace("  ", " "), line: (r) => `${r.nrDosar} · ${r.serviciu}` }
  ];
  const UNREAD = new Set([0, 1, 2, 4, 6, 7, 9, 15, 22]);
  const longDate = (iso) => {
    const d = iso instanceof Date ? iso : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? `${iso}T00:00:00` : iso);
    return Number.isNaN(d.getTime()) ? "—" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  /* ages in minutes: 6 today, 8 yesterday, the rest one or two a day further back */
  const ageOf = (i) => {
    if (i < 6) return [3, 24, 52, 97, 146, 203][i];
    if (i < 14) return 24 * 60 + (i - 6) * 74 + 35;
    return (2 + Math.floor((i - 14) / 2)) * 24 * 60 + ((i % 2) ? 300 : 40);
  };
  const buildSeed = () => {
    const rows = api()?.dossierStore?.()?.runtimeRows || [];
    if (!rows.length) return null;
    const used = new Map();
    const now = Date.now();
    const items = [];
    for (let i = 0; i < 60; i += 1) {
      const k = KINDS[i % KINDS.length];
      const pool = rows.filter((r) => k.statuses.includes(r.status) && (k.kind !== "act" || r.nrActEmis));
      if (!pool.length) continue;
      const n = used.get(k.kind) || 0;
      used.set(k.kind, n + 1);
      /* the story dossier (D-2026-004575, demo dos-*) gets a few notifications, so a search finds it (notif-06) */
      const story = [0, 19, 34].includes(i) && pool.find((r) => r.id === "D-2026-004575");
      const row = story || pool[(n * 7 + i * 3) % pool.length];
      const at = new Date(now - ageOf(i) * 60000);
      items.push({ id: `bo:${i}`, title: k.title(row), line: k.line(row), ref: row.nrDosar, at, href: `#dosar/${encodeURIComponent(row.id)}/${k.tab}`, seedUnread: UNREAD.has(i) });
    }
    return items;
  };

  const all = () => {
    if (EMPTY) return [];
    if (!state.seed) state.seed = buildSeed();
    const extra = sources.flatMap((fn) => { try { return fn() || []; } catch (error) { return []; } });
    const read = readSet();
    return [...extra, ...(state.seed || [])]
      .map((item) => ({ ...item, at: item.at instanceof Date ? item.at : new Date(item.at), unread: item.seedUnread !== false && !read.has(item.id) }))
      .sort((a, b) => b.at - a.at);
  };
  const unreadCount = () => all().filter((item) => item.unread).length;

  /* ---- the bell: count badge + the opener's ARIA (aria-expanded = pressed + focus ring while the drawer is open) ---- */
  const sync = () => {
    const b = bell();
    if (!b || ownedElsewhere()) return;
    const n = unreadCount();
    const dot = b.querySelector(".e-permits-shell__notification-dot");
    if (dot) { dot.textContent = n > 99 ? "99+" : String(n); dot.hidden = !n; }
    b.setAttribute("aria-label", n ? `Notificări: ${n} necitite` : "Notificări");
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-controls", ID);
    if (!b.hasAttribute("aria-expanded")) b.setAttribute("aria-expanded", "false");
  };

  /* ---- markup ---- */
  const icon = (name, cls = "icon") => `<svg class="${cls}" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-${name}"></use></svg>`;
  const overlayHtml = () => `
    <button class="drawer-overlay__scrim" type="button" aria-label="Închide" tabindex="-1" data-notif-close></button>
    <aside class="drawer drawer--sm e-permits-notif" role="dialog" aria-modal="true" aria-labelledby="${ID}-title" tabindex="-1">
      <header class="drawer__header e-permits-notif__header">
        <div class="drawer__heading"><h2 class="drawer__title" id="${ID}-title">Notificări</h2></div>
        <div class="e-permits-notif__head-action"><button class="btn btn-text-primary btn-sm btn-rounded" type="button" data-notif-read-all>Marchează toate ca citite</button></div>
        <button class="modal-close" type="button" aria-label="Închide" data-notif-close>${icon("cross-large")}</button>
      </header>
      <div class="drawer__body e-permits-notif__body" data-notif-body></div>
      <p class="sr-only" role="status" aria-live="polite" data-notif-live></p>
    </aside>`;

  const timeLabel = (at, group) => group === "Mai vechi" ? longDate(at) : `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const groupOf = (at) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    if (at >= start) return "Azi";
    if (at >= new Date(start.getTime() - 86400000)) return "Ieri";
    return "Mai vechi";
  };
  const itemHtml = (item, group) => `
    <li class="e-permits-notif__item${item.unread ? " is-unread" : ""}">
      <span class="e-permits-notif__dot" aria-hidden="true"></span>
      <div class="e-permits-notif__text">
        <div class="e-permits-notif__head">
          <a class="e-permits-notif__title stretched-link" href="${esc(item.href)}" data-notif-open="${esc(item.id)}" data-cell-tooltip="${esc(item.title)}">${item.unread ? '<span class="sr-only">Necitită: </span>' : ""}${esc(item.title)}</a>
          <span class="e-permits-notif__time"><time datetime="${Number.isNaN(item.at.getTime()) ? "" : item.at.toISOString()}">${esc(timeLabel(item.at, group))}</time></span>
        </div>
        <p class="e-permits-notif__meta" data-cell-tooltip>${esc(item.line)}</p>
      </div>
    </li>`;

  const emptyHtml = (unreadTab) => window.GEAPEmptyState?.render(unreadTab
    ? { title: "Nu aveți notificări necitite", text: "Toate notificările au fost citite. Le găsiți în «Toate».", icon: "notification", compact: true }
    : { title: "Nu aveți notificări", text: "Aici apar dosarele distribuite către dvs., termenele care expiră și plățile confirmate.", icon: "notification", compact: true }) || "";

  const tabButtonsHtml = (count) => [["toate", "Toate"], ["necitite", "Necitite"]].map(([id, label]) => {
          const on = state.tab === id;
          const badge = id === "necitite" && count ? (api()?.renderPageHeaderTabCount?.(count) || `<span class="e-permits-page-header__tab-count">${count}</span>`) : "";
          return `<button class="tab-button${on ? " active" : ""}" id="${ID}-tab-${id}" type="button" role="tab" aria-selected="${on}" aria-controls="${ID}-panel" tabindex="${on ? "0" : "-1"}" data-notif-tab="${id}"><span>${label}</span>${badge}</button>`;
        }).join("");
  /* the sticky head: tabs + the library list search (notif-drawer-v2) — rendered once per opening, so typing keeps focus */
  const headHtml = (count) => `
    <div class="tabs tabs--sm e-permits-tariff__tabs e-permits-notif__tabs" data-notif-head>
      <div class="tab-buttons" role="tablist" aria-label="Notificări" data-notif-tablist>${tabButtonsHtml(count)}</div>
      <div class="e-permits-notif__search">
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${state.query ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${SPRITE}#icon-search"></use></svg></span>
          <input class="input" id="${ID}-q" type="search" placeholder="Caută după număr sau denumire" aria-label="Caută în notificări după număr sau denumire" aria-controls="${ID}-panel" autocomplete="off" value="${esc(state.query)}" data-notif-search>
          <div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-cross-small"></use></svg></button></div>
        </div>
      </div>
    </div>`;

  /* the active tab's list, then the search over the FULL list (title + line + object number), then the page */
  const visibleList = () => {
    const items = all();
    const unread = items.filter((item) => item.unread);
    const base = state.tab === "necitite" ? unread : items;
    const q = fold(state.query);
    const list = q ? base.filter((item) => fold(`${item.title} ${item.line} ${item.ref || ""}`).includes(q)) : base;
    return { unread, base, list };
  };
  const render = () => {
    const overlay = document.getElementById(ID);
    if (!overlay) return;
    const { unread, base, list } = visibleList();
    const shown = list.slice(0, state.shown);
    const groups = [];
    shown.forEach((item) => {
      const g = groupOf(item.at);
      const last = groups[groups.length - 1];
      if (last && last.label === g) last.items.push(item); else groups.push({ label: g, items: [item] });
    });
    overlay.querySelector("[data-notif-read-all]").disabled = !unread.length;
    const body = overlay.querySelector("[data-notif-body]");
    if (!body.querySelector("[data-notif-head]")) body.innerHTML = `${headHtml(unread.length)}<div data-notif-panel-slot></div>`;
    else body.querySelector("[data-notif-tablist]").innerHTML = tabButtonsHtml(unread.length);
    const E = window.GEAPEmptyState;
    const none = !base.length ? emptyHtml(state.tab === "necitite")
      : E?.noResults?.(`Nicio notificare pentru „${state.query.trim()}”`, { text: "Caută după numărul dosarului, al actului sau după denumire.", bare: true, compact: true }) || "";
    body.querySelector("[data-notif-panel-slot]").innerHTML = `
      <div class="e-permits-notif__panel" id="${ID}-panel" role="tabpanel" aria-labelledby="${ID}-tab-${state.tab}">
        ${shown.length ? groups.map((g, i) => `
          <section class="e-permits-notif__group" aria-labelledby="${ID}-g${i}">
            <h3 class="e-permits-notif__group-title" id="${ID}-g${i}">${g.label}</h3>
            <ul class="e-permits-notif__list" role="list">${g.items.map((item) => itemHtml(item, g.label)).join("")}</ul>
          </section>`).join("") : none}
        ${list.length > shown.length ? `<div class="e-permits-notif__more"><button class="btn btn-neutral btn-md btn-rounded e-permits-notif__more-btn" type="button" data-notif-more>Încarcă mai multe</button></div>` : ""}
      </div>`;
  };

  const ensure = () => {
    let overlay = document.getElementById(ID);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "drawer-overlay e-permits-notif-overlay";
    overlay.id = ID;
    overlay.hidden = true;
    overlay.setAttribute("data-notif-drawer", "");
    overlay.innerHTML = overlayHtml();
    document.body.append(overlay);
    return overlay;
  };

  const live = (text) => {
    const el = document.querySelector(`#${ID} [data-notif-live]`);
    if (el) { el.textContent = ""; window.setTimeout(() => { el.textContent = text; }, 30); }
  };

  const open = () => {
    const overlay = ensure();
    state.tab = "toate";
    state.shown = PAGE;
    state.query = "";
    overlay.querySelector("[data-notif-body]").innerHTML = "";
    render();
    /* the bell is the opener: focus comes back to it on ×, Esc, scrim (Safari / a scripted click never focus it) */
    bell()?.focus({ preventScroll: true });
    bell()?.setAttribute("aria-expanded", "true");
    if (window.GEAPDrawer) window.GEAPDrawer.open(overlay, { focus: `#${ID}-tab-toate` });
    else { overlay.hidden = false; overlay.querySelector(`#${ID}-tab-toate`)?.focus(); }
  };
  const close = (after) => {
    const overlay = document.getElementById(ID);
    if (!overlay || overlay.hidden) return;
    const done = () => { bell()?.setAttribute("aria-expanded", "false"); after?.(); };
    if (window.GEAPDrawer) { if (!window.GEAPDrawer.close(overlay, done)) done(); } else { overlay.hidden = true; done(); }
  };
  const isOpen = () => { const o = document.getElementById(ID); return Boolean(o && !o.hidden && !o.classList.contains("is-closing")); };

  const selectTab = (id, focus = true) => {
    state.tab = id;
    state.shown = PAGE;
    render();
    const body = document.querySelector(`#${ID} [data-notif-body]`);
    if (body) body.scrollTop = 0;
    if (focus) document.getElementById(`${ID}-tab-${id}`)?.focus();
  };

  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const b = t.closest(".e-permits-shell__icon-button--notification");
    if (b) {
      if (ownedElsewhere()) return;
      if (isOpen()) close(); else open();
      return;
    }
    if (!t.closest(`#${ID}`)) return;
    if (t.closest("[data-notif-close]")) { close(); return; }
    const tab = t.closest("[data-notif-tab]");
    if (tab) { selectTab(tab.dataset.notifTab); return; }
    if (t.closest("[data-notif-read-all]")) {
      const read = readSet();
      all().forEach((item) => read.add(item.id));
      saveRead();
      render();
      sync();
      document.getElementById(`${ID}-tab-${state.tab}`)?.focus();
      live("Toate notificările au fost marcate ca citite.");
      return;
    }
    if (t.closest("[data-notif-more]")) {
      const before = state.shown;
      state.shown += PAGE;
      render();
      sync();
      const links = document.querySelectorAll(`#${ID} [data-notif-open]`);
      links[before]?.focus();
      const total = visibleList().list.length;
      live(`Se afișează ${Math.min(state.shown, total)} din ${total} notificări.`);
      return;
    }
    const link = t.closest("[data-notif-open]");
    if (link) {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      readSet().add(link.dataset.notifOpen);
      saveRead();
      sync();
      const href = link.getAttribute("href");
      close(() => { window.location.hash = href; });
    }
  });

  /* live search (js/search.js drives the field states and the × , which fires `input`) */
  let liveTimer = 0;
  document.addEventListener("input", (event) => {
    const input = event.target instanceof Element && event.target.closest(`#${ID} [data-notif-search]`);
    if (!input) return;
    state.query = input.value;
    state.shown = PAGE;
    render();
    const body = document.querySelector(`#${ID} [data-notif-body]`);
    if (body) body.scrollTop = 0;
    window.clearTimeout(liveTimer);
    const n = visibleList().list.length;
    liveTimer = window.setTimeout(() => live(state.query.trim() ? (n ? `${n} ${n === 1 ? "notificare găsită" : "notificări găsite"}.` : "Nicio notificare găsită.") : ""), 400);
  });

  /* tabs: ← → Home End (library tabs keyboard model) */
  document.addEventListener("keydown", (event) => {
    const tab = event.target instanceof Element && event.target.closest(`#${ID} [data-notif-tab]`);
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const ids = ["toate", "necitite"];
    const i = ids.indexOf(tab.dataset.notifTab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? ids.length - 1 : (i + (event.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length;
    selectTab(ids[next]);
  });

  /* the badge follows the seed once the dossiers are in (the shell loads them asynchronously) */
  let tries = 0;
  const boot = () => {
    if (api()?.dossierStore?.()?.runtimeRows?.length || EMPTY || tries > 60) { sync(); return; }
    tries += 1;
    window.setTimeout(boot, 250);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.GEAPNotifDrawer = { open, close, sync, isOpen, selectTab };
})();
