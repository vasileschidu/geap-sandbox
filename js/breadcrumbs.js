/* Breadcrumbs — ONE renderer for the library breadcrumb on every page (2026-10-21, breadcrumb-v1).

   User (2026-10-21): „Let's use the breadcrumb as a component … and adjust it in code EVERYWHERE — this is the
   component, why invent it?” (Figma Components doJ7tDY0PlQ0PqMgbpFVIC 232:5282, guidelines 602:1933).

   Library markup only (css/main.css, Components/breadcrumbs.html): nav.breadcrumbs > ol.breadcrumbs__list >
   li.breadcrumbs__item (+ .is-selected › span.breadcrumbs__current) with the library modifiers --trailing /
   --truncate / --mobile + li.breadcrumbs__item--back. Nothing here restyles a library class.

   GEAPBreadcrumbs.html(crumbs, { parentsOnly, trailing, truncate = true, label = "Navigare", mobile = true, max = 4, className })
     crumbs = [{ label, attr?, href?, button? }] — a crumb with `attr` / `href` is a link (`<a class="breadcrumbs__link">`,
     `button: true` → `<button class="breadcrumbs__link">` for back handlers), without = plain text.
     The last crumb is the current page (medium, aria-current) unless `trailing` (the trail runs into the page title
     right under it — the builder service line, the notification-template back line).
     parentsOnly (breadcrumb-v3, user 2026-10-21: „The breadcrumbs should not display «Autorizația pentru importul,
     exportul sau reex…» — it's already there”): the trail sits above the page's H1 → the last crumb (the current page)
     is left out and the parents end in the library `--trailing` chevron (Figma 232:5282 „👁️ Active Level” = off).
     Every page header uses it (shell renderPageHeaderTop, CabEvo.pageHeader, RAP crumbsHtml); callers still pass the
     whole trail. Only a trail that REPLACES the title (process designer drill-in) keeps the current level.
   Output = two library navs, siblings (css/breadcrumbs.css shows one per breakpoint, Figma „📏 Breakpoint”):
     desktop  the trail; > `max` levels → first · „…” (overflow menu with the hidden levels) · the last 3 (Figma
              „w/ overflow”: at most 4 visible levels); every level `--truncate` (30 characters) with its full text in a
              tooltip only when it is really cut (Figma best practice 2436:32132)
     phones   (≤760) `--mobile`: chevron-left-small + the PARENT level only (the nearest link before the current one);
              left out when no level is a link. The label sits in `.e-permits-page-header__crumb-label` so a long name
              ends in an ellipsis on one line (the library --truncate makes the link a block and drops the chevron).
   Behaviour (delegated once on the document): the „…” trigger opens / closes its menu (Esc / outside / Tab close,
   ↑ ↓ Home End inside); truncation tooltips are synced after every render and on resize (`data-tooltip-text` for
   js/icon-tooltip.js, else a native `title`). */
(() => {
  if (window.GEAPBreadcrumbs) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const isLink = (crumb) => Boolean(crumb && (crumb.attr || crumb.href || crumb.button));
  let seq = 0;

  const linkHtml = (crumb, inner) => {
    if (crumb.button) return `<button class="breadcrumbs__link" type="button" ${crumb.attr || ""}>${inner}</button>`;
    if (crumb.attr || crumb.href) return `<a class="breadcrumbs__link" href="${esc(crumb.href || "#")}" ${crumb.attr || ""}>${inner}</a>`;
    return `<span class="breadcrumbs__link">${inner}</span>`;
  };

  const itemHtml = (crumb, current) => current
    ? `<li class="breadcrumbs__item is-selected"><span class="breadcrumbs__current" aria-current="page">${esc(crumb.label)}</span></li>`
    : `<li class="breadcrumbs__item">${linkHtml(crumb, esc(crumb.label))}</li>`;

  /* Figma „w/ overflow”: the hidden levels in a dropdown under „…” (the one menu size, css/dropdown.css) */
  const overflowHtml = (hidden) => {
    const id = `breadcrumbs-more-${seq += 1}`;
    return `
      <li class="breadcrumbs__item">
        <button class="breadcrumbs__link" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" aria-label="Alte ${hidden.length} niveluri" data-breadcrumbs-more>…</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="${id}" role="menu" aria-label="Niveluri ascunse" hidden data-breadcrumbs-menu>
          ${hidden.map((crumb) => `<li role="none">${isLink(crumb)
            ? `<button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" ${crumb.attr || ""}${crumb.href && !crumb.attr ? ` data-breadcrumbs-href="${esc(crumb.href)}"` : ""}><span>${esc(crumb.label)}</span></button>`
            : `<button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" aria-disabled="true"><span>${esc(crumb.label)}</span></button>`}</li>`).join("")}
        </ul>
      </li>`;
  };

  const html = (crumbs = [], { parentsOnly = false, trailing = false, truncate = true, label = "Navigare", mobile = true, max = 4, className = "" } = {}) => {
    let list = crumbs.filter((crumb) => crumb && String(crumb.label ?? "").trim() !== "");
    if (parentsOnly) { list = list.slice(0, -1); trailing = true; }
    if (!list.length) return "";
    const last = list.length - 1;
    const extra = className ? ` ${className}` : "";
    const items = list.map((crumb, index) => ({ crumb, current: !trailing && index === last }));
    let body;
    if (items.length > max) {
      const tail = items.slice(-3);
      const hidden = items.slice(1, -3).map((item) => item.crumb);
      body = itemHtml(items[0].crumb, items[0].current) + overflowHtml(hidden) + tail.map((item) => itemHtml(item.crumb, item.current)).join("");
    } else {
      body = items.map((item) => itemHtml(item.crumb, item.current)).join("");
    }
    const desktop = `<nav class="breadcrumbs${trailing ? " breadcrumbs--trailing" : ""}${truncate ? " breadcrumbs--truncate" : ""}${extra}" aria-label="${esc(label)}"><ol class="breadcrumbs__list">${body}</ol></nav>`;
    /* phones: the parent = the nearest link before the current page (with trailing: the last link) */
    const parents = trailing ? list : list.slice(0, last);
    const back = mobile ? [...parents].reverse().find(isLink) : null;
    const phone = back
      ? `<nav class="breadcrumbs breadcrumbs--mobile${extra}" aria-label="${esc(label)}"><ol class="breadcrumbs__list"><li class="breadcrumbs__item breadcrumbs__item--back">${linkHtml(back, `<span class="e-permits-page-header__crumb-label">${esc(back.label)}</span>`)}</li></ol></nav>`
      : "";
    queueSync();
    return desktop + phone;
  };

  /* ---- truncation tooltip: only on a level that is really cut ---- */
  const LABELS = ".breadcrumbs--truncate :is(.breadcrumbs__link, .breadcrumbs__current), .breadcrumbs--mobile .e-permits-page-header__crumb-label";
  const sync = (root = document) => {
    root.querySelectorAll(LABELS).forEach((el) => {
      if (el.matches("[data-breadcrumbs-more]")) return;
      const host = el.closest(".breadcrumbs__link, .breadcrumbs__current") || el;
      const cut = el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 0.5;
      const text = el.textContent.trim();
      const attr = "data-tooltip-text"; /* the ONE tooltip runtime (js/icon-tooltip.js) is on every page with crumbs */
      if (cut) {
        if (host.getAttribute(attr) !== text) host.setAttribute(attr, text);
      } else if (host.hasAttribute(attr)) {
        host.removeAttribute(attr);
      }
    });
  };
  let queued = 0;
  function queueSync() {
    if (queued || typeof requestAnimationFrame !== "function") return;
    queued = requestAnimationFrame(() => { queued = 0; sync(); });
  }
  window.addEventListener("resize", queueSync);
  if (document.fonts?.ready) document.fonts.ready.then(queueSync);
  /* renderers return strings: re-measure once a breadcrumb lands in the DOM */
  const startObserver = () => {
    if (!("MutationObserver" in window) || !document.body) return;
    new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1 && (node.matches?.(".breadcrumbs") || node.querySelector?.(".breadcrumbs"))))) queueSync();
    }).observe(document.body, { childList: true, subtree: true });
    queueSync();
  };
  if (document.body) startObserver(); else document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  /* a level cut after a layout change (panel opened, sidebar folded) still gets its tooltip on hover / focus */
  ["pointerover", "focusin"].forEach((type) => window.addEventListener(type, (event) => {
    const crumbs = event.target?.closest?.(".breadcrumbs");
    if (crumbs) sync(crumbs);
  }, true));

  /* ---- the „…” overflow menu ---- */
  const menuOf = (trigger) => trigger?.parentElement?.querySelector(":scope > [data-breadcrumbs-menu]");
  const items = (menu) => [...menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')];
  const close = (trigger, focus = false) => {
    const menu = menuOf(trigger);
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (focus) trigger.focus();
  };
  const closeAll = (except = null) => document.querySelectorAll('[data-breadcrumbs-more][aria-expanded="true"]').forEach((trigger) => { if (trigger !== except) close(trigger); });
  let keyboardOpen = false;
  document.addEventListener("keydown", (event) => {
    const trigger = event.target.closest?.("[data-breadcrumbs-more]");
    if (trigger && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      keyboardOpen = true;
      if (event.key === "ArrowDown") { event.preventDefault(); trigger.click(); }
      return;
    }
    const menu = event.target.closest?.("[data-breadcrumbs-menu]");
    const open = menu ? menu.parentElement.querySelector(":scope > [data-breadcrumbs-more]") : document.querySelector('[data-breadcrumbs-more][aria-expanded="true"]');
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(open, true); return; }
    if (event.key === "Tab") { close(open); return; }
    if (!menu) return;
    const list = items(menu);
    const at = list.indexOf(document.activeElement);
    const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[event.key];
    if (next === undefined || !list.length) return;
    event.preventDefault();
    list[(next + list.length) % list.length].focus();
  }, true);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-breadcrumbs-more]");
    if (trigger) {
      event.preventDefault();
      const menu = menuOf(trigger);
      const opening = menu.hidden;
      closeAll(trigger);
      menu.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
      if (opening && keyboardOpen) items(menu)[0]?.focus();
      keyboardOpen = false;
      return;
    }
    const item = event.target.closest?.("[data-breadcrumbs-menu] [role='menuitem']");
    if (item?.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
    if (item?.dataset.breadcrumbsHref) location.href = item.dataset.breadcrumbsHref;
    closeAll();
  });

  window.GEAPBreadcrumbs = { html, sync };
})();
