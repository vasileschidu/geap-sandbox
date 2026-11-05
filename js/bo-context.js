/* Contextul de lucru în Back Office / AdminPortal (role-context-v1, 2026-11-04)
   US-81 (89932) Selectarea rolului și a subdiviziunii la autentificare · US-82 (89952) Comutarea în sesiune.
   ONE source for the (rol, autoritate, subdiviziune) cards: the login context screen (js/bo-login.js) and the
   „Schimbă rolul” dialog (js/e-permits-shell.js) render the same list (US-81 AC-19, US-82 AC-04).
   Data: data/bo-context.json (users + their combinations / delegations), names + active flags from
   data/autoritati.json (AC-04, AC-17). Session (demo): sessionStorage „e-permits-bo-session”.
   Demo parameters: ?today=YYYY-MM-DD (delegation window, AC-14) · ?ctxUser=<id> (a signed-in user without the
   login, for ?state= links; + ?ctxFresh=1 = just signed in → the landing page) · ?ctxRevoked=<card id> (that card is withdrawn while the dialog is open, US-82 AC-08). */
(() => {
  "use strict";

  const SESSION_KEY = "e-permits-bo-session";
  const AUDIT_KEY = "e-permits-bo-context-audit";
  const ASSIGNMENT_KEY = "e-permits-back-office-assignment";
  const DEFAULT_USER = "activ";
  const NO_AUTHORITY = "Fără autoritate";
  const params = new URLSearchParams(window.location.search);
  const root = (document.currentScript?.src || "").replace(/js\/bo-context\.js.*$/, "");

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const collator = new Intl.Collator("ro", { sensitivity: "base" });
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const today = () => {
    const pinned = params.get("today");
    if (/^\d{4}-\d{2}-\d{2}$/.test(pinned || "")) return pinned;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  /* ---- data ---------------------------------------------------------------------------------------------- */
  let loading = null;
  let db = null;
  const load = () => {
    if (!loading) {
      loading = Promise.all([
        fetch(`${root}data/bo-context.json`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${root}data/autoritati.json`, { cache: "no-store" }).then((r) => r.json())
      ]).then(([ctx, aut]) => {
        db = {
          ...ctx,
          authorities: new Map((aut.authorities || []).map((a) => [a.id, a])),
          subdivisions: new Map((aut.subdivisions || []).map((s) => [s.id, s]))
        };
        return db;
      });
    }
    return loading;
  };
  const userById = (id) => db?.users.find((u) => u.id === id) || null;

  /* ---- session ------------------------------------------------------------------------------------------- */
  const readSession = () => {
    try { return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null"); } catch (error) { return null; }
  };
  const writeSession = (session) => {
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (error) { /* private mode */ }
  };
  /* a ?state= link signs a user in without the login (demo only) */
  if (params.get("ctxUser")) writeSession({ user: params.get("ctxUser"), portal: params.get("portal") === "admin" ? "admin" : "bo", context: null, fresh: params.get("ctxFresh") === "1" });
  const session = () => readSession();
  const startSession = (userId, portal) => writeSession({ user: userId, portal, context: null, fresh: false, at: new Date().toISOString() });
  const endSession = () => {
    try { window.sessionStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(ASSIGNMENT_KEY); } catch (error) { /* private mode */ }
  };
  /* AC-22 / US-82 AC-05: the chosen card becomes the active context of THIS session (never remembered for the next
     sign-in, AC-29); `fresh` = the shell still has to open the landing page (AC-24…27) */
  const setContext = (cardId, { fresh = false } = {}) => {
    const s = readSession() || { user: DEFAULT_USER, portal: "bo" };
    writeSession({ ...s, context: cardId, fresh });
    try { window.sessionStorage.setItem(ASSIGNMENT_KEY, cardId); } catch (error) { /* private mode */ }
  };
  const consumeFresh = () => {
    const s = readSession();
    if (!s?.fresh) return false;
    writeSession({ ...s, fresh: false });
    return true;
  };
  const currentUser = () => userById(readSession()?.user || DEFAULT_USER) || userById(DEFAULT_USER);

  /* ---- the cards ----------------------------------------------------------------------------------------- */
  const authorityTitle = (a) => (a ? `${a.nameRo} (${a.code})` : "");
  const cardOf = (c, delegated) => {
    const role = db.roles[c.role] || { label: c.role };
    const authority = c.authority ? db.authorities.get(c.authority) : null;
    const subdivision = c.subdivision ? db.subdivisions.get(c.subdivision) : null;
    return {
      id: c.id,
      roleId: c.role,
      roleLabel: role.label,
      menuProfile: role.menuProfile ?? null,
      icon: role.icon || "",
      iconAsset: role.iconAsset || "",
      authorityId: c.authority || "",
      authorityTitle: authorityTitle(authority),
      authorityShort: authority?.code || "",
      subdivisionLabel: subdivision?.name || "",
      delegated,
      by: c.by || "",
      until: c.to || "",
      /* AC-17: a deactivated role, authority or subdivision drops the card */
      active: role.active !== false && (!authority || authority.active !== false) && (!subdivision || subdivision.active !== false),
      headerMeta: c.headerMeta || ""
    };
  };
  /* US-79 / AC-14: only „Activă” delegations inside their validity window */
  const delegationCurrent = (d, day) => d.status === "Activă" && d.from <= day && day <= d.to;

  /* the model of one user: own cards grouped by authority (no-authority group first), delegations apart */
  const model = (user = currentUser(), { day = today(), revoked = "" } = {}) => {
    if (!db || !user) return { cards: [], groups: [], delegations: [] };
    const own = (user.combinations || []).map((c) => cardOf(c, false)).filter((card) => card.active && card.id !== revoked);
    const delegations = (user.delegations || []).filter((d) => delegationCurrent(d, day)).map((d) => cardOf(d, true))
      .filter((card) => card.active && card.id !== revoked);
    /* AC-16: alphabetical by subdivision, then by role (a card without subdivision first) */
    const byPlace = (a, b) => collator.compare(a.subdivisionLabel, b.subdivisionLabel) || collator.compare(a.roleLabel, b.roleLabel);
    const groups = [];
    own.forEach((card) => {
      const key = card.authorityId || "";
      let group = groups.find((g) => g.key === key);
      if (!group) groups.push((group = { key, title: card.authorityTitle || NO_AUTHORITY, cards: [] }));
      group.cards.push(card);
    });
    groups.forEach((g) => g.cards.sort(byPlace));
    groups.sort((a, b) => (a.key ? 1 : 0) - (b.key ? 1 : 0) || collator.compare(a.title, b.title));
    delegations.sort((a, b) => collator.compare(a.roleLabel, b.roleLabel) || collator.compare(a.authorityShort, b.authorityShort) || collator.compare(a.subdivisionLabel, b.subdivisionLabel));
    return { cards: [...groups.flatMap((g) => g.cards), ...delegations], groups, delegations };
  };

  /* the line under the role: the subdivision (AC-11 — nothing when there is none); a delegation reads
     „autoritate › subdiviziune” under its role (AC-15, missing parts left out) */
  const metaOf = (card) => (card.delegated
    ? [card.authorityShort, card.subdivisionLabel].filter(Boolean).join(" › ")
    : card.subdivisionLabel);
  /* „Specialist · ANSP · CSP Chișinău” — audit lines, the delegation's accessible name */
  const labelOf = (card) => [card.roleLabel, card.authorityShort, card.subdivisionLabel].filter(Boolean).join(" · ");
  const headerMetaOf = (card) => card.headerMeta || [card.roleLabel, card.subdivisionLabel.replace(/^CSP /, "") || card.authorityShort].filter(Boolean).join(" • ");
  const fold = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  /* choice-cards-v1 (user 2026-11-04, back after the role-stack-v1 try on 2026-11-05): the FO identity-choice cards
     (js/choice-cards.js, „Cum vrei să depui cererea?”): role = title, subdivision = meta, the role's icon in the brand
     avatar; each authority, „Fără autoritate” and „Delegări” = a collapsible group whose toggle carries the name (+ the
     building for an authority) and the badge stack; a closed group with the active role shows „Rol curent” in its
     toggle. The first group (the dialog: the current context's group) opens. */
  const SEARCH_MIN = 8;
  const CC = () => window.GEAPChoiceCards;
  const roleIcon = (card) => `icon-${card.icon || "user-account"}`;
  const cardHtml = (card, activeId, tagHtml) => {
    const isActive = card.id === activeId;
    const text = fold([card.roleLabel, card.authorityTitle, card.authorityShort, card.subdivisionLabel].join(" "));
    return CC().item({
      name: card.roleLabel,
      /* the current role is where you already are: marked, not a control (user 2026-11-05) — out of the tab order,
         aria-disabled, the click handlers skip it */
      attrs: `data-ctx-card="${esc(card.id)}" data-ctx-text="${esc(text)}"${isActive ? ' aria-current="true" aria-disabled="true" tabindex="-1"' : ""}`,
      avatarHtml: CC().avatarIcon(roleIcon(card)),
      badgeHtml: isActive && tagHtml ? tagHtml : "",
      metaHtml: CC().meta(metaOf(card), { tooltip: true }),
      nameTooltip: true
    });
  };
  const groupHtml = (key, title, cards, { activeId, heading, tagHtml, expanded }) => {
    const hasActive = Boolean(tagHtml) && cards.some((card) => card.id === activeId);
    return CC().group({
      title,
      heading,
      itemsHtml: cards.map((card) => cardHtml(card, activeId, tagHtml)),
      collapsible: true,
      expanded,
      /* the authority name sits in the toggle instead of „Arată …” (user 2026-11-04) */
      titleInToggle: true,
      labelMore: title,
      labelLess: title,
      previewHtml: `${hasActive ? `<span class="e-permits-ctx-group__current">${tagHtml}</span>` : ""}${CC().collapsePreview(cards.slice(0, 4).map((card) => CC().avatarIcon(roleIcon(card), { className: "e-permits-fo-auth__role-collapse-avatar" })), cards.length)}`,
      /* an authority reads with the building icon; „Fără autoritate” / „Delegări” stay plain */
      titleIcon: key === "fara-autoritate" || key === "delegari" ? "" : "icon-building",
      attrs: `data-ctx-group="${esc(key)}" data-ctx-default="${expanded ? "open" : "closed"}"`
    });
  };

  /* the library list search (the Ghișeu act-picker pattern: from 8 items) — PO proposal, US-81 AC-18 says none */
  const searchHtml = (idPrefix) => {
    const label = "Caută după rol, autoritate sau subdiviziune";
    const none = window.GEAPEmptyState?.noResults?.("Nicio potrivire", { text: "", bare: true, compact: true }) || "Nicio potrivire";
    return `
      <div class="e-permits-context-search" data-ctx-search-box>
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill">
          <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
          <input class="input" type="search" id="${esc(idPrefix)}-search" placeholder="${label}" aria-label="${label}" autocomplete="off" data-ctx-search>
          <div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button></div>
        </div>
        <div data-ctx-none hidden>${none}</div>
        <p class="u-visually-hidden" role="status" aria-live="polite" data-ctx-live></p>
      </div>`;
  };

  /* every card, grouped — the active card's group (else the first one) open */
  const listHtml = (m, { activeId = "", heading = "h2", idPrefix = "ctx", tagHtml = "" } = {}) => {
    const all = [...m.groups.map((g) => ({ key: g.key || "fara-autoritate", title: g.title, cards: g.cards })),
      ...(m.delegations.length ? [{ key: "delegari", title: "Delegări", cards: m.delegations }] : [])];
    const openIndex = Math.max(0, all.findIndex((g) => g.cards.some((card) => card.id === activeId)));
    /* the dialog: „Rol curent: …” above the list (Gumloop „Currently in: …”, user 2026-11-04), so the active role
       reads even when its group is closed — the closed group's header also carries the „Rol curent” tag */
    const active = activeId ? m.cards.find((card) => card.id === activeId) : null;
    return `
      ${active ? `<p class="e-permits-ctx-current">Rol curent: <strong>${esc(active.roleLabel)}</strong>${[active.authorityShort, active.subdivisionLabel].filter(Boolean).map((part) => ` · ${esc(part)}`).join("")}</p>` : ""}
      ${m.cards.length >= SEARCH_MIN ? searchHtml(idPrefix) : ""}
      <div class="e-permits-fo-auth__role-list" aria-label="Alegeți rolul" data-ctx-list>
        ${all.map((g, index) => groupHtml(g.key, g.title, g.cards, { activeId, heading, tagHtml, expanded: index === openIndex })).join("")}
      </div>`;
  };

  /* live filter, diacritics-insensitive over role · authority · subdivision; groups with matches open, the others
     hide; an empty field restores the groups as they were; no match → „Nicio potrivire” */
  let liveTimer = 0;
  const filter = (input) => {
    const box = input.closest("[data-ctx-search-box]");
    const list = box?.parentElement?.querySelector("[data-ctx-list]");
    if (!list) return;
    const q = fold(input.value.trim());
    let shown = 0;
    list.querySelectorAll("[data-ctx-group]").forEach((groupEl) => {
      const cards = [...groupEl.querySelectorAll("[data-ctx-card]")];
      cards.forEach((card) => { card.hidden = Boolean(q) && !card.dataset.ctxText.includes(q); });
      const hits = cards.filter((card) => !card.hidden).length;
      shown += hits;
      groupEl.hidden = Boolean(q) && !hits;
      CC().setExpanded(groupEl, q ? hits > 0 : groupEl.dataset.ctxDefault === "open");
    });
    box.querySelector("[data-ctx-none]")?.toggleAttribute("hidden", shown > 0);
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      const live = box.querySelector("[data-ctx-live]");
      if (live) live.textContent = !q ? "" : shown ? `${shown === 1 ? "Un rol găsit" : `${shown} roluri găsite`}.` : "Nicio potrivire.";
    }, 500);
  };
  document.addEventListener("input", (event) => {
    if (event.target.matches?.("[data-ctx-search]")) filter(event.target);
  });

  /* ---- audit (US-81 AC-33, US-82 AC-09): MLog + the user's own journal (Utilizatori › profil › Jurnal) ---- */
  const readAudit = () => { try { return JSON.parse(window.sessionStorage.getItem(AUDIT_KEY) || "[]"); } catch (error) { return []; } };
  const audit = (user, type, detail) => {
    const now = new Date();
    const at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const list = [{ at, idnp: user?.idnp || "", user: user?.name || "", type, status: "Reușit", detail }, ...readAudit()].slice(0, 50);
    try { window.sessionStorage.setItem(AUDIT_KEY, JSON.stringify(list)); } catch (error) { /* private mode */ }
  };
  const userEvents = (row) => readAudit().filter((e) => e.idnp && e.idnp === row?.idnp).map(({ idnp, ...e }) => e);

  /* ---- AC-32: 15 minutes without activity on the selection screen end the session ------------------------------ */
  const watchIdle = (onExpire, ms = 15 * 60 * 1000) => {
    let timer = 0;
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(onExpire, ms); };
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((type) => window.addEventListener(type, reset, { passive: true }));
    reset();
    return () => window.clearTimeout(timer);
  };

  window.GEAPBoContext = {
    load, userById, currentUser, model, listHtml, metaOf, labelOf, headerMetaOf,
    session, startSession, endSession, setContext, consumeFresh, audit, userEvents, watchIdle, today,
    revokedId: () => params.get("ctxRevoked") || "",
    DEFAULT_USER
  };
})();
