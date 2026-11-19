/* =====================================================================================
   GEAPSelectionBar — the selection bar of any BO list with row checkboxes (selection-bar-v1, 2026-11-19).
   css/selection-bar.css; components.md › „Selection bar”.
     html({ label, actionsHtml })        → the bar markup (hidden), to insert right after `[data-workplace-toolbar]`
     set(bar, { count, text })           → shows it for count ≥ 1 (fade in once), hides it at 0; the header gets
                                           `.is-selecting` (the toolbar steps aside); `text` = „3 obiecte selectate”
   The host owns the selection: „Anulează selecția” = `[data-selection-clear]`, Esc = the host's keydown (both clear
   the selection and give the focus back to the header checkbox).
   ===================================================================================== */
(function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const html = ({ label = "Selecție", actionsHtml = "" } = {}) => `
    <div class="e-permits-selection-bar" role="region" aria-label="${esc(label)}" hidden data-selection-bar>
      <div class="e-permits-selection-bar__inner">
        <p class="e-permits-selection-bar__count" aria-live="polite" aria-atomic="true" data-selection-count></p>
        <button class="btn btn-text-primary btn-sm btn-rounded e-permits-selection-bar__clear" type="button" data-selection-clear>Anulează selecția</button>
        <div class="e-permits-selection-bar__actions">${actionsHtml}</div>
      </div>
    </div>`;

  function set(bar, { count = 0, text = "" } = {}) {
    if (!bar) return;
    const on = count > 0;
    const header = bar.parentElement;
    const was = !bar.hidden;
    const label = bar.querySelector("[data-selection-count]");
    if (label && label.textContent !== text) label.textContent = text;
    bar.hidden = !on;
    header?.classList.toggle("is-selecting", on);
    if (on && !was) {
      bar.classList.remove("is-entering");
      void bar.offsetWidth;
      bar.classList.add("is-entering");
    }
  }

  window.GEAPSelectionBar = { html, set };
})();
