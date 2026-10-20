/* Trajectory (traiectoria dosarului) — the ONE component for a process path (2026-10-20).
   Reference: Figma GEAP 2.0 aHgwVwiNCOSOqbMhMjjUOj 9709:1137 (BO dossier „Traiectoria dosarului”).
   CSS in css/trajectory.css; documented in components.md › „Trajectory (traiectoria dosarului) —
   one component”. Used by: BO dossier (Traiectoria dosarului), eKYC session (Plan de verificare,
   Traseul reviziei), FO finish (tracker + Statutul dosarului, also post-process), EVO Cabinet
   (Stadiul solicitării).

   GEAPTrajectory.html({ steps, layout, bare, label, className }) → HTML
     steps[]: { label, state, meta, metaHtml, tagHtml, sr }
       state = done | current | paused | attention | rejected | skipped | todo
         done      green check            current   brand clock + soft brand pill on the label
         paused    amber pause + pill     attention amber warning + pill (the applicant must act)
         rejected  red error              skipped   dashed ring (never run; grey connectors)
         todo      grey ring, label secondary regular
       meta     = text or [lines] (escaped, lines joined by <br>); metaHtml = trusted HTML
       tagHtml  = a Small status tag after the label (vertical layout)
       sr       = the state word read after the label (default from STATE_SR)
     layout = "horizontal" (default; steps side by side, equal connectors; drawn vertically when the
              steps do not fit the card — .is-stacked, see fit()) | "vertical" (marker column + text,
              connectors down the markers)
     bare   = no card chrome (inside another card, e.g. the Cabinet status card)
     label  = aria-label of the <ol>
   GEAPTrajectory.REACHED = the states whose connector to the next reached step is brand. */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();

  const ICONS = { done: "circle-checkmark-filled", current: "time-filled", paused: "pause", attention: "warning-filled", rejected: "circle-error-filled" };
  const STATE_SR = { done: "finalizat", current: "în curs", paused: "suspendat", attention: "necesită acțiune", rejected: "nereușit", skipped: "omis", todo: "urmează" };
  const CURRENT = ["current", "paused", "attention"];
  const REACHED = ["done", "current", "paused", "attention", "rejected"];

  const marker = (state) => (ICONS[state]
    ? `<svg class="icon" width="24" height="24"><use href="${SPRITE}#icon-${ICONS[state]}"></use></svg>`
    : '<span class="e-permits-trajectory__dot"></span>');

  const metaOf = (step) => {
    if (step.metaHtml) return step.metaHtml;
    const lines = Array.isArray(step.meta) ? step.meta.filter(Boolean) : step.meta ? [step.meta] : [];
    return lines.map(esc).join("<br>");
  };

  const stepHtml = (step) => {
    const state = STATE_SR[step.state] ? step.state : "todo";
    const meta = metaOf(step);
    return `
      <li class="e-permits-trajectory__step is-${state}"${CURRENT.includes(state) ? ' aria-current="step"' : ""}>
        <span class="e-permits-trajectory__body">
          <span class="e-permits-trajectory__marker" aria-hidden="true">${marker(state)}</span>
          <span class="e-permits-trajectory__title"><span class="e-permits-trajectory__label">${esc(step.label)}<span class="u-visually-hidden"> — ${esc(step.sr || STATE_SR[state])}</span></span>${step.tagHtml || ""}</span>
          ${meta ? `<span class="e-permits-trajectory__meta">${meta}</span>` : ""}
        </span>
      </li>`;
  };

  const html = ({ steps = [], layout = "horizontal", bare = false, label = "", className = "" } = {}) => {
    const cls = ["e-permits-trajectory", layout === "vertical" ? "e-permits-trajectory--vertical" : "", bare ? "e-permits-trajectory--bare" : "", className].filter(Boolean).join(" ");
    return `
      <div class="${cls}">
        <ol class="e-permits-trajectory__steps"${label ? ` aria-label="${esc(label)}"` : ""}>
          ${steps.map(stepHtml).join("")}
        </ol>
      </div>`;
  };

  /* A horizontal trajectory whose steps do not fit its card (phones, narrow columns, 7 steps in a
     narrow profile) is drawn vertically (.is-stacked): measured at max-content in one synchronous
     pass, re-checked whenever the card's size changes. Never truncates a label. */
  const fit = (card) => {
    if (!card.isConnected || card.classList.contains("e-permits-trajectory--vertical")) return;
    const steps = card.querySelector(".e-permits-trajectory__steps");
    const room = steps?.parentElement?.clientWidth || 0;
    if (!steps || !room) return;
    const style = getComputedStyle(card);
    const avail = room - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    card.classList.add("is-measuring");
    const need = steps.getBoundingClientRect().width;
    card.classList.remove("is-measuring");
    card.classList.toggle("is-stacked", need > avail + 0.5);
  };

  const seen = new WeakSet();
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target))) : null;
  const scan = (root) => {
    const cards = root.matches?.(".e-permits-trajectory") ? [root] : [...(root.querySelectorAll?.(".e-permits-trajectory:not(.e-permits-trajectory--vertical)") || [])];
    cards.forEach((card) => {
      if (card.classList.contains("e-permits-trajectory--vertical")) return;
      fit(card);
      if (resize && !seen.has(card)) { seen.add(card); resize.observe(card); }
    });
  };
  const start = () => {
    scan(document);
    new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => { if (node.nodeType === 1) scan(node); }))).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });

  window.GEAPTrajectory = { html, fit, REACHED, STATE_SR, ICONS };
})();
