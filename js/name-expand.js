/* name-expand.js — „Long name in a header — expand on click” (2026-10-19, components.md).
   A header name that does not fit stays on ONE line with an ellipsis; only when it is really cut
   (scrollWidth > clientWidth, measured without the affordance) the name becomes ONE toggle button:
   the clamped text + „Mai mult ⌄”. Click / Enter / Space expand it in place (the text wraps, „Mai
   puțin ⌃” after its last word, the header grows and pushes the page down); a second click, Escape
   (focus on the toggle or nowhere) or GEAPNameExpand.collapseAll() — e.g. on a step change — fold
   it again. While collapsed, the mouse / keyboard focus also shows the full name in the plain
   tooltip (js/icon-tooltip.js, `data-tooltip-text`) — the tooltip hides itself while expanded.

   Host contract: any element with `data-name-expand` (an h1 keeps its heading role; the button sits
   inside it). Set its text with GEAPNameExpand.set(host, text) — never with textContent, which
   would also read / wipe the toggle. Hosts are picked up on load; set() / scan(root) add later ones.
   Same vocabulary as the RAP act dialog subtitle („Mai mult” / „Mai puțin”, js/act-view.js). */
(() => {
  if (window.GEAPNameExpand) return;

  const MORE = "Mai mult";
  const LESS = "Mai puțin";
  /* the sprite next to this script, so pages in sub-folders work too */
  const SPRITE = (() => {
    try { return new URL("../assets/icons/sprite.svg", document.currentScript.src).href; }
    catch { return "assets/icons/sprite.svg"; }
  })();

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const textOf = (host) => {
    if (host.dataset.nameExpandText == null) host.dataset.nameExpandText = host.textContent.trim().replace(/\s+/g, " ");
    return host.dataset.nameExpandText;
  };

  const moreHtml = (open) => `<span class="e-permits-name-expand__more" aria-hidden="true"><span class="e-permits-name-expand__more-label">${open ? LESS : MORE}</span><svg class="icon" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg></span>`;

  const html = (text, toggle) => toggle
    ? `<button class="e-permits-name-expand" type="button" aria-expanded="false" data-name-expand-toggle data-tooltip-text="${esc(text)}"><span class="e-permits-name-expand__text">${esc(text)}</span>${moreHtml(false)}</button>`
    : `<span class="e-permits-name-expand"><span class="e-permits-name-expand__text">${esc(text)}</span></span>`;

  const toggleOf = (host) => host.querySelector(":scope > [data-name-expand-toggle]");

  /* collapsed only: is the one-line text cut? (the affordance is hidden while measuring) */
  const sync = (host) => {
    if (!host?.isConnected) return;
    const toggle = toggleOf(host);
    if (toggle?.getAttribute("aria-expanded") === "true") return;
    const box = host.querySelector(":scope > .e-permits-name-expand");
    const text = box?.querySelector(".e-permits-name-expand__text");
    if (!box || !text) { host.innerHTML = html(textOf(host), false); sync(host); return; }
    if (!text.clientWidth) return; /* hidden: the ResizeObserver runs again once it shows */
    box.classList.add("is-measuring");
    const cut = text.scrollWidth > text.clientWidth + 1;
    box.classList.remove("is-measuring");
    if (cut === !!toggle) return;
    const hadFocus = toggle && toggle === document.activeElement;
    host.innerHTML = html(textOf(host), cut);
    host.classList.toggle("has-name-toggle", cut);
    if (hadFocus) host.querySelector(":scope > .e-permits-name-expand")?.focus({ preventScroll: true });
  };

  const resize = new ResizeObserver((entries) => entries.forEach((entry) => sync(entry.target)));
  const observed = new WeakSet();
  const watch = (host) => {
    if (observed.has(host)) return;
    observed.add(host);
    resize.observe(host);
  };

  const setOpen = (toggle, open) => {
    if (!toggle) return;
    const host = toggle.parentElement;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".e-permits-name-expand__more-label").textContent = open ? LESS : MORE;
    host?.classList.toggle("is-name-expanded", open);
    window.GEAPIconTooltip?.hide(); /* the full name is on screen now (or folding away) */
    if (!open) sync(host); /* the width may have changed while it was open */
  };

  const set = (host, text) => {
    if (!host) return;
    const next = String(text ?? "").trim().replace(/\s+/g, " ");
    /* the same name again (a re-render): keep the toggle as the user left it */
    if (next === host.dataset.nameExpandText && host.querySelector(":scope > .e-permits-name-expand")) { watch(host); sync(host); return; }
    host.dataset.nameExpandText = next;
    host.classList.remove("is-name-expanded", "has-name-toggle");
    host.innerHTML = html(host.dataset.nameExpandText, false);
    watch(host);
    sync(host);
  };

  const scan = (root = document) => {
    root.querySelectorAll?.("[data-name-expand]").forEach((host) => {
      if (!host.querySelector(":scope > .e-permits-name-expand")) host.innerHTML = html(textOf(host), false);
      watch(host);
      sync(host);
    });
  };

  const collapseAll = (root = document) => {
    root.querySelectorAll("[data-name-expand-toggle][aria-expanded='true']").forEach((toggle) => setOpen(toggle, false));
  };

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-name-expand-toggle]");
    if (toggle) setOpen(toggle, toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const active = document.activeElement;
    if (active?.matches?.("[data-name-expand-toggle][aria-expanded='true']")) setOpen(active, false);
    else if (!active || active === document.body) collapseAll();
  });

  const start = () => {
    scan();
    document.fonts?.ready?.then(() => document.querySelectorAll("[data-name-expand]").forEach(sync));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.GEAPNameExpand = { set, scan, sync, collapseAll, text: textOf };
})();
