/* EVO Cabinet v2 — „Notificări” panel (cab2-notes-panel-v1, 2026-11-18; product owner via the coordinator: „notifications
   open in a right-docked full-height panel, like the BO document viewer panel”). components.md › „Cabinet v2 —
   Notificări panel”.
   Container = the library modal docked as the document viewer (`.modal-overlay > .modal`, css/act-view.css docked-v2
   geometry: ≥ 1024 8 from top / right / bottom, full height, radius 16, `--drop-shadow-400`, library scrim; 761–1023
   the centred dialog; ≤ 760 the library phone sheet, full height). Width = the library medium modal `--modal-width-md`
   (590): the rows carry a labelled button on the right. Content = the cab2 Notificări rows as they are
   (Cab2Notificari.itemHtml): unread = „Nou” + `.is-fresh`, read state in sessionStorage `cab2-notes-read`; „Marchează
   toate ca citite” on top; a row (or its button) opens the record and closes the panel. No footer, no „Vezi toate”: the
   panel holds the whole list (as the BO notifications drawer); `?s=notificari` stays as the deep-link page.
   Opened by the header bell (badge = unread, `aria-expanded` = pressed while open) and by any in-page link to
   `s=notificari` (search). Focus trap, Esc / × / scrim close, focus back to the opener. */
(() => {
  "use strict";

  const C = window.Cab2Evo;
  const N = window.Cab2Notificari;
  if (!C || !N || !document.documentElement.hasAttribute("data-cab2-entry")) return;

  const { escape, cabUrl, SPRITE } = C;
  const STORE = "cab2-notes-read";
  const ID = "cab2-notes";
  const ico = (name, cls = "") => `<svg class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true" focusable="false"><use href="${SPRITE}#icon-${name}"></use></svg>`;
  const keyOf = (note) => `${note.nr}|${note.kind || note.title}|${note.at}`;
  let notes = null;
  let opener = null;

  const readSet = () => { try { return new Set(JSON.parse(sessionStorage.getItem(STORE) || "[]")); } catch (error) { return new Set(); } };
  const saveRead = (set) => { try { sessionStorage.setItem(STORE, JSON.stringify([...set])); } catch (error) { /* this page only */ } };

  async function load() {
    if (notes) return notes;
    const data = await (await fetch("../data/cab2-cereri.json?v=cab2-s1-v1")).json();
    const perspective = data.perspectives?.[C.SUBJECT] || { dosare: [] };
    const ro = perspective.readOnly || null;
    const day = (iso) => String(iso || "").slice(0, 10);
    notes = (perspective.dosare || []).map(C.withScenario)
      .flatMap((dosar) => N.eventsOf(dosar, data.services || {}).map((note) => ({ ...note, nr: dosar.nr, dosar, readOnly: Boolean(ro) })))
      .filter((note) => note.at && (!ro || day(note.at) <= ro.since))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return notes;
  }
  /* unread = new (the last 3 days, the page's „Nou”) and not opened / marked read in this session */
  const withState = (list) => { const read = readSet(); return list.map((note) => ({ ...note, unread: N.daysAgo(note.at) <= 3 && !read.has(keyOf(note)) })); };
  const unreadCount = () => (notes ? withState(notes).filter((note) => note.unread).length : 0);

  /* ---- the bell: badge + opener ARIA ---- */
  /* the bell = `a.evo-header__action[data-evo-notifications]` (the header root carries the same attribute as its config) */
  const BELL = "a[data-evo-notifications], button[data-evo-notifications]";
  const bells = () => [...document.querySelectorAll(BELL)];
  function syncBell(open = isOpen()) {
    const n = unreadCount();
    bells().forEach((bell) => {
      bell.setAttribute("aria-haspopup", "dialog");
      bell.setAttribute("aria-controls", ID);
      bell.setAttribute("aria-expanded", String(open));
      bell.setAttribute("aria-label", n ? `Notificări: ${n} necitite` : "Notificări");
      let badge = bell.querySelector(".cab2-bell-badge");
      if (!badge) { bell.insertAdjacentHTML("beforeend", '<span class="cab2-bell-badge" aria-hidden="true"></span>'); badge = bell.querySelector(".cab2-bell-badge"); }
      badge.textContent = n > 99 ? "99+" : String(n);
      badge.hidden = !n;
    });
  }

  /* ---- the panel ---- */
  function overlayEl() {
    let overlay = document.getElementById(ID);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay cab2-notes";
    overlay.id = ID;
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.cab2Notes = "";
    overlay.innerHTML = `
      <div class="modal cab2-notes__panel" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="${ID}-title">
        <button type="button" class="modal-close" aria-label="Închide" data-cab2-notes-close><span class="d-inline-flex">${ico("cross-large", "small")}</span></button>
        <div class="modal--header"><h2 class="modal--header-title" id="${ID}-title">Notificări</h2></div>
        <div class="modal-content cab2-notes__body" data-cab2-notes-body></div>
        <p class="u-visually-hidden" role="status" aria-live="polite" data-cab2-notes-live></p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", onClick);
    overlay.addEventListener("keydown", onKey);
    return overlay;
  }
  function render() {
    const body = document.querySelector(`#${ID} [data-cab2-notes-body]`);
    if (!body) return;
    const list = withState(notes || []);
    const n = list.filter((note) => note.unread).length;
    const readOnly = list.some((note) => note.readOnly);
    body.innerHTML = list.length ? `
      <div class="cab2-notes__bar">
        <p class="cab2-notes__count">${n ? `${n === 1 ? "O notificare necitită" : `${n} notificări necitite`}` : "Toate sunt citite"}</p>
        <button class="btn btn-text-primary btn-sm btn-rounded" type="button" data-cab2-notes-read-all${n ? "" : " disabled"}>Marchează toate ca citite</button>
      </div>
      <section class="e-permits-stack sm-list nt-list cab2-notes__list" aria-label="Notificări"><ul class="e-permits-stack__list" role="list">${list.map((note, i) => N.itemHtml(note, i, readOnly, 3)).join("")}</ul></section>`
      : `<div class="cab2-notes__empty">${window.GEAPEmptyState.render({ title: "Nu ai notificări", text: "Evenimentele cererilor tale apar aici.", icon: "notification", compact: true, bare: true })}</div>`;
    /* the whole row opens the record (pointer + band hover); its own button keeps its hover */
    body.querySelectorAll("[data-nt-item]").forEach((row) => row.setAttribute("data-cab2-notes-row", ""));
  }
  const isOpen = () => document.getElementById(ID)?.classList.contains("is-active") || false;
  async function open(from) {
    await load();
    const overlay = overlayEl();
    opener = from || document.activeElement;
    render();
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("has-cab2-notes");
    syncBell(true);
    overlay.querySelector(".modal").focus({ preventScroll: true });
  }
  function close({ focus = true } = {}) {
    const overlay = document.getElementById(ID);
    if (!overlay?.classList.contains("is-active")) return;
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("has-cab2-notes");
    syncBell(false);
    if (focus && opener?.isConnected) opener.focus({ preventScroll: true });
  }
  const live = (text) => { const el = document.querySelector(`#${ID} [data-cab2-notes-live]`); if (el) { el.textContent = ""; window.setTimeout(() => { el.textContent = text; }, 30); } };
  function markRead(note) { const read = readSet(); read.add(keyOf(note)); saveRead(read); }
  function go(href) { close({ focus: false }); window.location.assign(href); }
  function onClick(event) {
    const t = event.target;
    const overlay = document.getElementById(ID);
    if (t === overlay || t.closest("[data-cab2-notes-close]")) { close(); return; }
    if (t.closest("[data-cab2-notes-read-all]")) {
      const read = readSet();
      (notes || []).forEach((note) => read.add(keyOf(note)));
      saveRead(read);
      render();
      syncBell(true);
      overlay.querySelector(".modal").focus({ preventScroll: true });
      live("Toate notificările au fost marcate ca citite.");
      return;
    }
    const row = t.closest("[data-nt-item]");
    if (!row) return;
    const note = withState(notes)[Number(row.dataset.ntItem)];
    if (!note) return;
    if (t.closest(".copy-value, [data-copy-value], .e-permits-copy")) return;
    markRead(note);
    /* „Achitare” → the request's profile with the MPay step open (the Acasă alert's address) */
    if (t.closest("[data-nt-pay]")) { event.preventDefault(); go(cabUrl("solicitari", { plata: "1" }, `#dosar/${note.dosar.id}`)); return; }
    const link = t.closest("a[href]");
    if (link) { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); go(link.getAttribute("href")); return; }
    go(note.action?.href || cabUrl("solicitari", {}, `#dosar/${note.dosar.id}`));
  }
  function onKey(event) {
    const overlay = document.getElementById(ID);
    if (event.key === "Escape") { event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...overlay.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")].filter((el) => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.querySelector(".modal"))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* the bell + any in-page link to the Notificări page open the panel (a modified click keeps the page) */
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element && event.target.closest(`${BELL}, a[href*="s=notificari"]`);
    if (!link || link.closest(`#${ID}`) || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
    event.preventDefault();
    if (isOpen()) close(); else open(link);
  }, true);

  load().then(() => syncBell(false)).catch(() => {});
  /* the header is drawn by js/evo-header.js — re-badge when it is (re)rendered */
  if ("MutationObserver" in window) {
    const header = document.querySelector("[data-evo-header]");
    if (header) new MutationObserver(() => { if (notes && bells().some((b) => !b.querySelector(".cab2-bell-badge"))) syncBell(); }).observe(header, { childList: true, subtree: true });
  }
  window.Cab2NotesPanel = { open, close, isOpen };
})();
