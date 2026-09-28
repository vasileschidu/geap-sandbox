/**
 * js/toast.js — the product toast (Figma GEAP 2.0 `toast`, 9399:32597).
 *
 * One API for every screen, rendering the library component in css/main.css
 * (.toast-container > .toast.toast--{info|success|warning|error}):
 *
 *   GEAPToast.show({
 *     type: "success",            // info | success | warning | error
 *     title: "Serviciu creat",    // optional → Figma "w/ Heading"; omit for text-only
 *     message: "…",               // plain text
 *     link: { href, label },      // optional underlined link under the text
 *     duration: 4000,             // ms; 0 keeps it until closed
 *     key: "draft-created"        // optional: replaces a toast with the same key
 *   });
 *
 * Errors are announced (role="alert"); the rest are polite status updates.
 */
(function (global) {
  "use strict";

  var SPRITE = "assets/icons/sprite.svg";
  var ICONS = {
    info: "icon-circle-info-filled",
    success: "icon-circle-checkmark-filled",
    warning: "icon-warning-filled",
    error: "icon-circle-error-filled"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* pages below the site root (rap-evo/, cabinet-evo/…) load assets one level up */
  function spriteHref() {
    var script = document.querySelector('script[src*="toast.js"]');
    var prefix = script ? script.getAttribute("src").replace(/js\/toast\.js.*$/, "") : "";
    return prefix + SPRITE;
  }

  function container() {
    var el = document.querySelector(".toast-container[data-geap-toasts]");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast-container";
      el.setAttribute("data-geap-toasts", "");
      document.body.appendChild(el);
    }
    return el;
  }

  function dismiss(toast) {
    if (!toast || toast.classList.contains("is-hiding")) return;
    window.clearTimeout(toast.__geapTimer);
    toast.classList.add("is-hiding");
    toast.addEventListener("animationend", function () { toast.remove(); }, { once: true });
    /* reduced motion: no animation event fires */
    window.setTimeout(function () { if (toast.isConnected) toast.remove(); }, 400);
  }

  function show(options) {
    var opts = options || {};
    var type = ICONS[opts.type] ? opts.type : "info";
    var sprite = spriteHref();
    var root = container();

    if (opts.key) {
      var previous = root.querySelector('[data-toast-key="' + esc(opts.key) + '"]');
      if (previous) previous.remove();
    }

    var toast = document.createElement("div");
    toast.className = "toast toast--" + type;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    if (opts.key) toast.setAttribute("data-toast-key", opts.key);

    toast.innerHTML =
      '<span class="toast__icon" aria-hidden="true">' +
        '<svg class="icon"><use href="' + sprite + "#" + ICONS[type] + '"></use></svg>' +
      "</span>" +
      '<div class="toast__content">' +
        (opts.title ? '<p class="toast__title">' + esc(opts.title) + "</p>" : "") +
        (opts.message ? '<p class="toast__text">' + esc(opts.message) + "</p>" : "") +
        (opts.link && opts.link.href ? '<a class="toast__link" href="' + esc(opts.link.href) + '">' + esc(opts.link.label) + "</a>" : "") +
      "</div>" +
      (opts.showClose === false ? "" :
        '<button class="toast__close" type="button" aria-label="Închide notificarea">' +
          '<svg class="icon" aria-hidden="true"><use href="' + sprite + '#icon-cross-large"></use></svg>' +
        "</button>");

    var close = toast.querySelector(".toast__close");
    if (close) close.addEventListener("click", function () { dismiss(toast); });

    root.appendChild(toast);

    var duration = opts.duration == null ? 4000 : opts.duration;
    if (duration > 0) toast.__geapTimer = window.setTimeout(function () { dismiss(toast); }, duration);
    return toast;
  }

  global.GEAPToast = { show: show, dismiss: dismiss };
})(window);
