/* =====================================================================================
   View switch — „Listă / Calendar”, „Listă / Cronologie” (calendar-views-v1, 2026-10-26)
   ONE helper for a registry that offers a second view next to its list. It is the library segmented control
   (Components 659:8188) at the documented compact size (`.segmented-control--compact`, track 40 = the toolbar's
   search; phones 48), a radio group: `role=radiogroup` > `button.segment-item[role=radio][aria-checked]`,
   roving tabindex, ← → / ↑ ↓ / Home / End select (the library has no keyboard script — lesson 2026-10-20).
   Layout + the phone size in css/view-switch.css. components.md › „View switch — Listă / Calendar / Cronologie”.

   GEAPViewSwitch.html({ key, label, value, items: [[value, text]], className })   → markup
   GEAPViewSwitch.on(key, fn)                                                       → fn(value, button) after a change
   GEAPViewSwitch.set(root, value)                                                  → paint a value (no callback)
   ===================================================================================== */
(function () {
  "use strict";
  if (window.GEAPViewSwitch) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const handlers = {};

  const html = ({ key, label = "Mod de afișare", value, items, className = "" }) => `
    <div class="segmented-control segmented-control--compact e-permits-view-switch${className ? ` ${esc(className)}` : ""}" role="radiogroup" aria-label="${esc(label)}" data-view-switch="${esc(key)}">
      ${items.map(([v, text]) => `<button class="segment-item${v === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${v === value}" tabindex="${v === value ? 0 : -1}" data-view-value="${esc(v)}">${esc(text)}</button>`).join("")}
    </div>`;

  const set = (root, value) => {
    if (!root) return;
    root.querySelectorAll("[data-view-value]").forEach((b) => {
      const on = b.dataset.viewValue === value;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  };

  const choose = (button, { focus = false } = {}) => {
    const root = button.closest("[data-view-switch]");
    if (!root || button.getAttribute("aria-checked") === "true") { if (focus) button.focus(); return; }
    set(root, button.dataset.viewValue);
    if (focus) button.focus();
    handlers[root.dataset.viewSwitch]?.(button.dataset.viewValue, button);
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-view-switch] [data-view-value]");
    if (button) choose(button);
  });
  document.addEventListener("keydown", (event) => {
    const button = event.target.closest?.("[data-view-switch] [data-view-value]");
    if (!button) return;
    const items = [...button.closest("[data-view-switch]").querySelectorAll("[data-view-value]")];
    const i = items.indexOf(button);
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[event.key];
    if (next == null) return;
    event.preventDefault();
    choose(items[(next + items.length) % items.length], { focus: true });
  });

  window.GEAPViewSwitch = { html, set, on: (key, fn) => { handlers[key] = fn; } };
})();
