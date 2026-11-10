/* =====================================================================================
   Shared lifecycle parts of the configuration objects (dash-v1, 2026-11-10) — extracted from js/widget-admin.js so the
   widget and dashboard modules (and the next ones) run ONE code path for the publish / restore / pending / compare
   dialogs instead of copies (components.md › 0.6 „Every configuration object publishes the same way”).

   window.GEAPConfigPublish:
     · diffHtml(change)            → the Jurnal / RSSP-sync value `.e-permits-event-diff` (old muted + struck → new);
     · changesList(changes, title) → „Modificări (N)” = the shell stacked list `.e-permits-wid-changes`;
     · diffRows(a, b, rowsOf)      → [{ label, before, after }] for two configurations, rowsOf(config) = [[label, html]];
     · noteField(id, value, opts)  → the required „Ce s-a schimbat” textarea (library textarea + counter);
     · setModalError(field, msg)   → marks the note field in an open dialog (error message, aria-invalid, focus);
     · publishBody / restoreBody   → the dialog bodies (one info / error notice with the version fact → changes → note).
   Every string is already escaped where it comes from the caller's rows (they are HTML cells of the passport blocks).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name) => `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const NOTE_MAX = 500;
  const strip = (html) => String(html ?? "").replace(/<[^>]+>/g, "").trim() || "—";

  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;

  const diffHtml = (c) => (c.before === "—" ? `<strong>${c.after}</strong>`
    : c.after === "—" ? `<span class="e-permits-event-diff__before">${c.before}</span>`
    : `<span class="e-permits-event-diff"><span class="e-permits-event-diff__before">${c.before}</span><span aria-hidden="true">→</span><span class="u-visually-hidden">devine</span><strong>${c.after}</strong></span>`);

  const changesList = (changes, title = "Modificări") => A().renderStackedList?.(`${title} (${changes.length})`, [{ label: "", items: changes.map((c) => ({ plainTitle: strip(c.label), title: c.label, meta: [diffHtml(c)] })) }], { className: "e-permits-wid-changes" }) || "";

  /* rows matched by label, in the order of a then the new labels of b; only what differs */
  function diffRows(a, b, rowsOf) {
    const ra = rowsOf(a);
    const rb = rowsOf(b);
    const ma = new Map(ra);
    const mb = new Map(rb);
    const labels = [...new Set([...ra.map(([l]) => l), ...rb.map(([l]) => l)])];
    const out = [];
    labels.forEach((l) => {
      const va = ma.has(l) ? strip(ma.get(l)) : "—";
      const vb = mb.has(l) ? strip(mb.get(l)) : "—";
      if (va !== vb) out.push({ label: l, before: va, after: vb });
    });
    return out;
  }

  function noteField(id, value = "", { attrs = "", placeholder = "", hint = "Apare în istoricul versiunilor.", label = "Ce s-a schimbat" } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">${esc(label)}${U().requiredMark?.() || ""}</label>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" aria-describedby="${id}-hint" aria-required="true"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""} spellcheck="true" data-cfgpub-note ${attrs}>${esc(value)}</textarea></div>
        <p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value">${count}/${NOTE_MAX}</span></p>
      </div>`;
  }

  function setModalError(field, message) {
    if (!field) return;
    const box = field.closest(".e-permits-fo-textarea");
    box?.classList.add("is-error");
    field.setAttribute("aria-invalid", "true");
    const wrap = field.closest(".e-permits-fo-field");
    wrap.querySelector(".e-permits-fo-field__error")?.remove();
    wrap.querySelector(".e-permits-fo-field__hint")?.setAttribute("hidden", "");
    wrap.insertAdjacentHTML("beforeend", errorHtml(field.id, message));
    field.setAttribute("aria-describedby", `${field.id}-error`);
    field.focus();
    field.addEventListener("input", () => { box?.classList.remove("is-error"); field.removeAttribute("aria-invalid"); wrap.querySelector(".e-permits-fo-field__error")?.remove(); wrap.querySelector(".e-permits-fo-field__hint")?.removeAttribute("hidden"); field.setAttribute("aria-describedby", `${field.id}-hint`); }, { once: true });
  }

  /* publish: problems → error notice (the confirm is aria-disabled by the caller); otherwise the version fact */
  function publishBody({ noun, problems = [], current = null, next = 1, changes = [], firstText = "", noteId, note = "", noteAttrs = "", placeholder = "", extraHtml = "" }) {
    const N = noun.charAt(0).toUpperCase() + noun.slice(1);
    return `
      ${problems.length
        ? U().renderNotice?.("error", `<strong>${esc(N)} nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
        : U().renderNotice?.("info", current
          ? `<strong>Versiunea ${next} o înlocuiește pe versiunea ${esc(String(current))}.</strong> ${changes.length ? "Utilizatorii BackOffice văd noua versiune imediat după publicare." : "Configurația este aceeași ca în versiunea în vigoare."}`
          : `<strong>Prima publicare: versiunea ${next}.</strong> ${firstText}`) || ""}
      ${!problems.length && changes.length ? changesList(changes) : ""}
      ${extraHtml}
      ${noteField(noteId, note, { attrs: noteAttrs, placeholder })}`;
  }

  function restoreBody({ from, next, lost = false, changes = [], noteId, noteAttrs = "" }) {
    return `
      ${U().renderNotice?.(lost ? "warning" : "info", `<strong>Versiunea ${next} reia configurația versiunii ${from}.</strong> Utilizatorii BackOffice o văd imediat după restaurare.${lost ? " Modificările nepublicate se pierd." : ""}`) || ""}
      ${changes.length ? changesList(changes) : ""}
      ${noteField(noteId, "", { attrs: noteAttrs, placeholder: "De ce revii la această versiune" })}`;
  }

  /* the counter under a note field follows the typing (delegated, every dialog) */
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.matches?.("textarea[data-cfgpub-note]")) return;
    const count = document.querySelector(`#${CSS.escape(el.id)}-hint .e-permits-ntpl-count__value`);
    if (count) { count.textContent = `${el.value.length}/${NOTE_MAX}`; count.classList.toggle("is-over", el.value.length > NOTE_MAX); }
  });

  window.GEAPConfigPublish = { diffHtml, changesList, diffRows, noteField, setModalError, publishBody, restoreBody, errorHtml, strip };
})();
