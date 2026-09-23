/**
 * core/render.js — the small render layer.
 *
 * The project renders by writing template strings into innerHTML: 26 such
 * assignments against 2 createElement calls in the existing workplace engine.
 * That model is fine at this data size. Its two real failure modes are losing
 * keyboard focus and losing scroll position on every re-render, which is what
 * this module exists to prevent.
 *
 * Three things only:
 *   createStore  - state with subscribe/notify
 *   render       - innerHTML swap that preserves focus, selection and scroll
 *   delegate     - one listener per event type, dispatched by data attribute
 *
 * No dependencies. Works in a plain <script> tag and under Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).render = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---- store -------------------------------------------------------
     Deliberately not immutable and not deep. Callers patch a flat object
     and every subscriber re-runs. At a few hundred rows this is cheaper
     than any diffing we could write. */
  function createStore(initial) {
    var state = Object.assign({}, initial || {});
    var subscribers = [];
    var notifying = false;

    function get() { return state; }

    function set(patch) {
      var next = typeof patch === "function" ? patch(state) : patch;
      Object.assign(state, next);
      if (notifying) return state;      // guard against a subscriber re-entering
      notifying = true;
      try {
        subscribers.forEach(function (fn) { fn(state); });
      } finally {
        notifying = false;
      }
      return state;
    }

    function subscribe(fn) {
      subscribers.push(fn);
      return function unsubscribe() {
        var i = subscribers.indexOf(fn);
        if (i !== -1) subscribers.splice(i, 1);
      };
    }

    return { get: get, set: set, subscribe: subscribe };
  }

  /* ---- focus and scroll preservation --------------------------------
     An element keeps its focus across a re-render if it carries
     data-focus-key. Text selection is restored too, so typing in a search
     box that re-renders on every keystroke does not jump the caret. */
  function captureFocus(container) {
    var el = typeof document !== "undefined" ? document.activeElement : null;
    if (!el || !container.contains(el)) return null;
    var key = el.getAttribute && el.getAttribute("data-focus-key");
    if (!key) return null;
    var snap = { key: key };
    if (typeof el.selectionStart === "number") {
      snap.selectionStart = el.selectionStart;
      snap.selectionEnd = el.selectionEnd;
    }
    return snap;
  }

  function restoreFocus(container, snap) {
    if (!snap) return;
    var el = container.querySelector('[data-focus-key="' + snap.key + '"]');
    if (!el) return;
    el.focus();
    if (typeof snap.selectionStart === "number" && typeof el.setSelectionRange === "function") {
      try { el.setSelectionRange(snap.selectionStart, snap.selectionEnd); } catch (e) { /* not a text field */ }
    }
  }

  function captureScroll(container) {
    var out = [{ el: container, top: container.scrollTop, left: container.scrollLeft }];
    var keepers = container.querySelectorAll("[data-scroll-key]");
    for (var i = 0; i < keepers.length; i++) {
      out.push({
        key: keepers[i].getAttribute("data-scroll-key"),
        top: keepers[i].scrollTop,
        left: keepers[i].scrollLeft
      });
    }
    return out;
  }

  function restoreScroll(container, snaps) {
    snaps.forEach(function (s) {
      var el = s.key ? container.querySelector('[data-scroll-key="' + s.key + '"]') : s.el;
      if (!el) return;
      el.scrollTop = s.top;
      el.scrollLeft = s.left;
    });
  }

  /* ---- render -------------------------------------------------------
     Swaps html into container, then puts focus, caret and scroll back. */
  function render(container, html) {
    if (!container) throw new Error("render: container is missing");
    var focus = captureFocus(container);
    var scroll = captureScroll(container);
    container.innerHTML = html;
    restoreScroll(container, scroll);
    restoreFocus(container, focus);
    return container;
  }

  /* ---- delegation ---------------------------------------------------
     One listener on the container, matched by attribute rather than by
     node identity, so handlers survive every re-render. */
  function delegate(container, eventType, attribute, handler) {
    if (!container) throw new Error("delegate: container is missing");
    var selector = "[" + attribute + "]";
    function onEvent(event) {
      var target = event.target.closest ? event.target.closest(selector) : null;
      if (!target || !container.contains(target)) return;
      handler(event, target, target.getAttribute(attribute));
    }
    container.addEventListener(eventType, onEvent);
    return function undelegate() {
      container.removeEventListener(eventType, onEvent);
    };
  }

  /* ---- escaping -----------------------------------------------------
     Everything rendered goes through innerHTML, and classifier names and
     descriptions are user-supplied. Escape at the boundary, always. */
  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ESCAPES[ch];
    });
  }

  return {
    createStore: createStore,
    render: render,
    delegate: delegate,
    esc: esc
  };
});
