(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const fallback = new URL("e-permits-acte-permisive.html?flow=full#choice-authenticated", window.location.href);
  const requestedReturn = params.get("return");
  let returnUrl = fallback;

  if (requestedReturn) {
    try {
      const candidate = new URL(requestedReturn, window.location.origin);
      if (candidate.origin === window.location.origin) returnUrl = candidate;
    } catch (_) {
      returnUrl = fallback;
    }
  }

  const cancelUrl = new URL(returnUrl.href);
  cancelUrl.hash = "";

  document.addEventListener("click", (event) => {
    const complete = event.target.closest("[data-mpass-complete]");
    const cancel = event.target.closest("[data-mpass-cancel]");
    if (!complete && !cancel) return;
    event.preventDefault();

    if (cancel) {
      window.location.assign(cancelUrl.href);
      return;
    }

    if (document.body.classList.contains("is-completing")) return;
    document.body.classList.add("is-completing");
    document.querySelectorAll("[data-mpass-complete]").forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    });
    const label = document.querySelector("[data-mpass-button-label]");
    if (label) label.textContent = "Se autentifică…";
    window.setTimeout(() => window.location.assign(returnUrl.href), 520);
  });
})();
