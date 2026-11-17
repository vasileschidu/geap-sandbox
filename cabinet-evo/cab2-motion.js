/* EVO Cabinet v2 — motion primitives (cab2-foundations-v1, 2026-11-17; components.md › „Cabinet v2 — motion
   primitives”; tokens css/motion.css; classes cabinet-evo/cab2.css › 5).
   Every helper puts a state class on, lets the CSS animation play and takes the class off — timings are read from the
   motion tokens, never written here. Content is in the DOM before anything moves; nothing is shown only by motion.
   Reduced motion (system setting or `.is-motion-reduced`): the tokens turn each primitive into a ≤ 150 ms fade.

   window.Cab2Motion
     reduced()                         → true when motion is reduced
     token(name) / ms(name)            → a motion token as text / in milliseconds
     enter(container)                  fade-up with stagger over the container's children (six steps)
     entrance(root, { key, force })    the hero entrance; once per `key` in this browser session (sign-in), `force`
                                       replays it (context switch). Marks `[data-cab2-entrance-item]` 0 … 5.
     fadeThrough(el, swap)             section → section: el fades out, swap() replaces its content, it fades in + rises
     sharedAxis(el, swap, { back })    list row → record (from the right); `back` reverses
     grow(card, page, show)            card → its page: show() reveals the page, it opens from the card's box
     shrink(page, hide)                back: the page closes into that box, then hide()
     reveal(swap)                      `.cab2-swap`: skeleton → content cross-fade
   All return a Promise that resolves when the motion is over. */
(() => {
  "use strict";

  const root = document.documentElement;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => media.matches || root.classList.contains("is-motion-reduced");
  const token = (name) => getComputedStyle(document.body || root).getPropertyValue(name).trim();
  const ms = (name) => {
    const value = token(name);
    const number = parseFloat(value);
    if (!Number.isFinite(number)) return 0;
    return /ms$/.test(value) ? number : number * 1000;
  };
  const wait = (time) => new Promise((resolve) => { window.setTimeout(resolve, time); });
  /* one frame of slack so the class never comes off before the last painted frame */
  const FRAME = 34;

  /* put the class on (restarting the animation when it is already running), take it off after `time` */
  const timers = new WeakMap();
  function play(el, cls, time) {
    window.clearTimeout(timers.get(el));
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    return new Promise((resolve) => {
      timers.set(el, window.setTimeout(() => { el.classList.remove(cls); resolve(true); }, time + FRAME));
    });
  }

  function enter(container) {
    if (!container) return Promise.resolve(false);
    return play(container, "is-cab2-entering", ms("--motion-duration-base") + 5 * ms("--motion-stagger"));
  }

  function entrance(scope, { key = "", force = false } = {}) {
    if (!scope) return Promise.resolve(false);
    const name = key ? `cab2-entered:${key}` : "";
    try {
      if (!force && name && window.sessionStorage.getItem(name)) return Promise.resolve(false);
      if (name) window.sessionStorage.setItem(name, "1");
    } catch (error) { /* storage blocked: the entrance simply plays */ }
    scope.querySelectorAll("[data-cab2-entrance-item]").forEach((item, index) => {
      item.setAttribute("data-cab2-entrance-item", String(Math.min(index, 5)));
    });
    const step = ms("--motion-stagger");
    const total = Math.max(
      ms("--motion-duration-avatar"),
      2 * step + ms("--motion-duration-slow"),
      11 * step + ms("--motion-duration-base"),
    );
    return play(scope, "is-cab2-entrance", total);
  }

  /* out (90 ms) → swap → in; the leave class comes off in the same frame the content changes */
  async function through(el, swap, leave, arrive) {
    if (!el) { swap?.(); return false; }
    const out = ms("--motion-duration-out");
    window.clearTimeout(timers.get(el));
    el.classList.remove(leave, arrive);
    void el.offsetWidth;
    el.classList.add(leave);
    await wait(out);
    swap?.();
    el.classList.remove(leave);
    return play(el, arrive, Math.max(0, ms("--motion-duration-base") - out));
  }

  const fadeThrough = (el, swap) => through(el, swap, "is-cab2-leaving", "is-cab2-arriving");

  function sharedAxis(el, swap, { back = false } = {}) {
    if (el) { if (back) el.setAttribute("data-cab2-dir", "back"); else el.removeAttribute("data-cab2-dir"); }
    return through(el, swap, "is-cab2-axis-out", "is-cab2-axis-in");
  }

  /* the card's box, as an inset of the page's box */
  const origins = new WeakMap();
  const px = (value) => `${Math.max(0, Math.round(value))}px`;
  function insetOf(from, to, radius) {
    return `inset(${px(from.top - to.top)} ${px(to.right - from.right)} ${px(to.bottom - from.bottom)} ${px(from.left - to.left)} round ${radius})`;
  }
  const fullOf = (page) => `inset(0px 0px 0px 0px round ${getComputedStyle(page).borderTopLeftRadius})`;

  function grow(card, page, show) {
    if (!card || !page) { show?.(); return Promise.resolve(false); }
    const from = card.getBoundingClientRect();
    const radius = getComputedStyle(card).borderTopLeftRadius;
    show?.();
    origins.set(page, { rect: from, radius });
    if (reduced()) {
      return page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms("--motion-duration-fast"), easing: "linear" }).finished.then(() => true);
    }
    const to = page.getBoundingClientRect();
    return page.animate(
      [
        { clipPath: insetOf(from, to, radius), opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.3 },
        { clipPath: fullOf(page), opacity: 1, offset: 1 },
      ],
      { duration: ms("--motion-duration-base"), easing: token("--motion-ease-standard") || "ease", fill: "backwards" },
    ).finished.then(() => true);
  }

  function shrink(page, hide) {
    const origin = page && origins.get(page);
    if (!page) { hide?.(); return Promise.resolve(false); }
    const frames = reduced() || !origin
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
        { clipPath: fullOf(page), opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.7 },
        { clipPath: insetOf(origin.rect, page.getBoundingClientRect(), origin.radius), opacity: 0, offset: 1 },
      ];
    const animation = page.animate(frames, {
      duration: reduced() || !origin ? ms("--motion-duration-fast") : ms("--motion-duration-close"),
      easing: reduced() || !origin ? "linear" : token("--motion-ease-standard") || "ease",
      fill: "forwards",
    });
    /* the held last frame goes in the same task the page is hidden — no layer stays behind */
    return animation.finished.then(() => { hide?.(); animation.cancel(); return true; });
  }

  function reveal(swap) {
    if (!swap) return Promise.resolve(false);
    swap.classList.add("is-loaded");
    swap.setAttribute("aria-busy", "false");
    return wait(ms("--motion-duration-fast") + FRAME).then(() => {
      if (swap.classList.contains("is-loaded")) swap.querySelectorAll(':scope > [data-cab2-swap="placeholder"]').forEach((item) => { item.hidden = true; });
      return true;
    });
  }

  window.Cab2Motion = { reduced, token, ms, enter, entrance, fadeThrough, sharedAxis, grow, shrink, reveal };
})();
