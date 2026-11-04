/* Sticky section headers on phones (sticky-sections-v1, 2026-11-04) — see css/sticky-sections.css.
   Groups the visible `.sticky-section-head` by scroll container; a container with ≥ 3 of them gets
   `.sticky-sections-root` + the measured --sticky-sections-top (sticky chrome above), --sticky-section-h
   (scroll-padding) and, per head, the bleed to the container edges and its own bottom border width.
   `.is-stuck` = the head sits at its sticky top (drives the divider). */
(() => {
  const MQ = window.matchMedia("(max-width: 760px)");
  const HEAD = ".sticky-section-head";
  const CHROME = ".evo-header[data-evo-sticky], .e-permits-fo-mobile-progress, .e-permits-fo-auth__header, .e-permits-page-header.is-sticky";
  const MIN_SECTIONS = 3;
  const DOC = document.documentElement;
  let roots = new Set();
  let active = [];

  const visible = (el) => el.getClientRects().length > 0 && !el.closest("[hidden]");

  function scrollRoot(el) {
    for (let p = el.parentElement; p && p !== document.body && p !== DOC; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
    }
    return DOC;
  }

  /* the bottom edge of the sticky chrome that stays on screen in this container (a sticky page header with a
     negative top leaves only its tab strip: top + height) */
  function chromeOffset(root) {
    let max = 0;
    document.querySelectorAll(CHROME).forEach((el) => {
      if (!visible(el) || !root.contains(el)) return;
      const cs = getComputedStyle(el);
      if (cs.position !== "sticky" && cs.position !== "fixed") return;
      max = Math.max(max, (parseFloat(cs.top) || 0) + el.offsetHeight);
    });
    return Math.round(max);
  }

  const rootTop = (root) => (root === DOC ? 0 : root.getBoundingClientRect().top + root.clientTop);

  function updateStuck() {
    active.forEach(({ head, root }) => {
      const top = rootTop(root) + (parseFloat(getComputedStyle(head).top) || 0);
      head.classList.toggle("is-stuck", head.getBoundingClientRect().top <= top + 0.5);
    });
  }

  function sync() {
    const on = MQ.matches;
    const groups = new Map();
    document.querySelectorAll(HEAD).forEach((head) => {
      head.classList.remove("is-stuck");
      if (!on || !visible(head)) return;
      const root = scrollRoot(head);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(head);
    });
    const next = new Set();
    active = [];
    groups.forEach((heads, root) => {
      if (heads.length < MIN_SECTIONS) return;
      next.add(root);
      root.classList.add("sticky-sections-root");
      root.style.setProperty("--sticky-sections-top", `${chromeOffset(root)}px`);
      root.style.setProperty("--sticky-section-h", `${Math.max(...heads.map((h) => h.offsetHeight))}px`);
      const box = root === DOC ? { left: 0 } : root.getBoundingClientRect();
      const left = box.left + (root === DOC ? 0 : root.clientLeft);
      const right = left + root.clientWidth;
      heads.forEach((head) => {
        const r = head.getBoundingClientRect();
        head.style.setProperty("--sticky-section-bleed-start", `${Math.max(0, Math.round(r.left - left))}px`);
        head.style.setProperty("--sticky-section-bleed-end", `${Math.max(0, Math.round(right - r.right))}px`);
        head.style.setProperty("--sticky-section-border", getComputedStyle(head).borderBottomWidth);
        active.push({ head, root });
      });
    });
    roots.forEach((root) => {
      if (next.has(root)) return;
      root.classList.remove("sticky-sections-root");
      ["--sticky-sections-top", "--sticky-section-h"].forEach((p) => root.style.removeProperty(p));
    });
    roots = next;
    updateStuck();
  }

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => { syncQueued = false; sync(); });
  };
  let stuckQueued = false;
  const queueStuck = () => {
    if (stuckQueued || !active.length) return;
    stuckQueued = true;
    requestAnimationFrame(() => { stuckQueued = false; updateStuck(); });
  };

  const start = () => {
    sync();
    new MutationObserver((records) => {
      /* own class / style writes do not re-trigger: only nodes added / removed and hidden toggles */
      if (records.some((r) => r.type === "childList" || r.attributeName === "hidden")) queueSync();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("resize", queueSync, { passive: true });
    MQ.addEventListener?.("change", queueSync);
    document.addEventListener("scroll", queueStuck, { capture: true, passive: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.GEAPStickySections = { sync };
})();
