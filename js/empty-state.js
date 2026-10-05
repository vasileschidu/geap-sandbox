/* Empty state — the one component for "nothing here" (Tailwind "simple" empty state on our
   tokens; CSS in css/empty-state.css). Used by the back-office shell, the front office and
   the classifiers page.

   GEAPEmptyState.render({ title, text, icon, actionHtml, compact, bare }) → HTML
     - no title: the first sentence of `text` becomes the title, the rest the line;
     - icon = a sprite id without "icon-" (default page-text);
     - compact = less padding (drawers, modals); bare = no box (inside a table or list).
   GEAPEmptyState.noResults(title, { text, actionHtml, compact, bare }) → search icon,
     default line „Verifică ortografia sau încearcă alți termeni.” */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const render = ({ title = "", text = "", icon = "page-text", actionHtml = "", compact = false, bare = false } = {}) => {
    let heading = title;
    let line = text;
    if (!heading) {
      const match = String(text).match(/^(.+?[.!?])\s+([\s\S]+)$/);
      heading = (match ? match[1] : String(text)).replace(/\.$/, "");
      line = match ? match[2] : "";
    }
    return `
      <div class="e-permits-empty${compact ? " e-permits-empty--compact" : ""}${bare ? " e-permits-empty--bare" : ""}" role="status">
        <span class="e-permits-empty__icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/sprite.svg#icon-${esc(icon)}"></use></svg></span>
        <p class="e-permits-empty__title">${esc(heading)}</p>
        ${line ? `<p class="e-permits-empty__text">${esc(line)}</p>` : ""}
        ${actionHtml ? `<div class="e-permits-empty__actions">${actionHtml}</div>` : ""}
      </div>
    `;
  };

  const noResults = (title, { text = "Verifică ortografia sau încearcă alți termeni.", actionHtml = "", compact = false, bare = false } = {}) =>
    render({ title: String(title).replace(/\.$/, ""), text, icon: "search", actionHtml, compact, bare });

  window.GEAPEmptyState = { render, noResults };
})();
