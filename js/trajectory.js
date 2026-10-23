/* Trajectory (traiectoria dosarului) — the ONE component for a process path (2026-10-20).
   Reference: Figma GEAP 2.0 aHgwVwiNCOSOqbMhMjjUOj 9709:1137 (BO dossier „Traiectoria dosarului”).
   CSS in css/trajectory.css; documented in components.md › „Trajectory (traiectoria dosarului) —
   one component”. Used by: BO dossier (Traiectoria dosarului), eKYC session (Plan de verificare,
   Traseul reviziei), FO finish (tracker + Statutul dosarului, also post-process), EVO Cabinet
   (Stadiul solicitării).

   GEAPTrajectory.html({ steps, layout, bare, label, className, callout }) → HTML
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
     bare   = no card chrome (inside another card)
     label  = aria-label of the <ol>
     callout = the alert INTEGRATED in the card — it hangs from the card's bottom edge (cabinet-header-v1, 2026-10-21;
              was BO-only markup in renderDosarTrajectory): { tone: info | warning | success | danger, icon (sprite id
              without „icon-”), titleHtml, metaHtml, textHtml } → .e-permits-callout-wrap > .e-permits-callout--<tone>
              [role=status] right after the card (css: e-permits-acte-permisive.css „Callout”, the hanging variant
              `.e-permits-trajectory + .e-permits-callout-wrap`). Used by the BO dossier („Acum / Urmează”) and the
              EVO Cabinet request („Stadiul solicitării”) — the same element.
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
          <span class="e-permits-trajectory__title"><span class="e-permits-trajectory__label">${esc(step.label)}</span><span class="u-visually-hidden"> — ${esc(step.sr || STATE_SR[state])}</span>${step.tagHtml || ""}</span>
          ${meta ? `<span class="e-permits-trajectory__meta">${meta}</span>` : ""}
        </span>
      </li>`;
  };

  const calloutHtml = (callout) => (callout ? `
      <div class="e-permits-callout-wrap">
        <div class="e-permits-callout e-permits-callout--${esc(callout.tone || "info")}" role="status">
          <span class="e-permits-callout__icon" aria-hidden="true"><svg class="icon" width="24" height="24"><use href="${SPRITE}#icon-${esc(callout.icon || "time-filled")}"></use></svg></span>
          <div class="e-permits-callout__content">
            <p class="e-permits-callout__title">${callout.titleHtml || ""}</p>
            ${callout.metaHtml ? `<p class="e-permits-callout__meta">${callout.metaHtml}</p>` : ""}
            ${callout.textHtml ? `<p class="e-permits-callout__text">${callout.textHtml}</p>` : ""}
          </div>
        </div>
      </div>` : "");

  const html = ({ steps = [], layout = "horizontal", bare = false, label = "", className = "", callout = null } = {}) => {
    const cls = ["e-permits-trajectory", layout === "vertical" ? "e-permits-trajectory--vertical" : "", bare ? "e-permits-trajectory--bare" : "", className].filter(Boolean).join(" ");
    return `
      <div class="${cls}">
        <ol class="e-permits-trajectory__steps"${label ? ` aria-label="${esc(label)}"` : ""}>
          ${steps.map(stepHtml).join("")}
        </ol>
      </div>${calloutHtml(callout)}`;
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
    /* phones (trajectory-phone-even-v1): the desktop anatomy (first block on the left edge, last on the right, every icon
       centred over its label) with the icons on an even pitch. Measure the first / last blocks, write the first / last
       column widths + the label room (css/trajectory.css), twice (the room can re-wrap a block), then check the real
       layout: neighbouring texts keep 8, the blocks fit their half-columns, the lines are at least 16 — else stack. */
    const VARS = ["--e-permits-trajectory-first", "--e-permits-trajectory-last", "--e-permits-trajectory-room"];
    if (style.getPropertyValue("--e-permits-trajectory-fit").trim() !== "even") {
      VARS.forEach((name) => card.style.removeProperty(name));
    } else {
      card.classList.remove("is-stacked");
      VARS.forEach((name) => card.style.removeProperty(name));
      const items = [...steps.children];
      const n = items.length;
      const bodyOf = (step) => step.querySelector(".e-permits-trajectory__body");
      const gap8 = 8;
      const line16 = 16;
      let ok = n > 1;
      if (ok) {
        /* the room re-wraps the first / last block, which moves the pitch: repeat until both widths are stable */
        let prev = null;
        for (let pass = 0; pass < 5; pass += 1) {
          const w1 = bodyOf(items[0]).getBoundingClientRect().width;
          const wn = bodyOf(items[n - 1]).getBoundingClientRect().width;
          const pitch = (avail - w1 / 2 - wn / 2) / (n - 1);
          ok = pitch - 24 - 2 * gap8 >= line16 && w1 <= w1 / 2 + pitch / 2 + 0.5 && wn <= wn / 2 + pitch / 2 + 0.5;
          if (prev && Math.abs(prev[0] - w1) < 0.5 && Math.abs(prev[1] - wn) < 0.5) break;
          prev = [w1, wn];
          card.style.setProperty(VARS[0], `${(w1 / 2 + pitch / 2).toFixed(2)}px`);
          card.style.setProperty(VARS[1], `${(wn / 2 + pitch / 2).toFixed(2)}px`);
          card.style.setProperty(VARS[2], `${Math.max(0, pitch - gap8).toFixed(2)}px`);
        }
      }
      const box = steps.getBoundingClientRect();
      const extents = items.map((step) => {
        const rects = [];
        step.querySelectorAll(".e-permits-trajectory__label, .e-permits-trajectory__meta").forEach((el) => {
          if (getComputedStyle(el).position === "absolute") return; // visually hidden lines (Cabinet meta on phones)
          rects.push(...el.getClientRects());
          const range = document.createRange();
          range.selectNodeContents(el);
          rects.push(...range.getClientRects());
        });
        const shown = rects.filter((r) => r.width > 0);
        return shown.length ? { l: Math.min(...shown.map((r) => r.left)), r: Math.max(...shown.map((r) => r.right)) } : null;
      }).filter(Boolean);
      const fits = ok && extents.length > 0
        && extents[0].l >= box.left - 0.5
        && extents[extents.length - 1].r <= box.right + 0.5
        && extents.every((e, i) => i === 0 || extents[i - 1].r + gap8 <= e.l + 0.5);
      if (!fits) VARS.forEach((name) => card.style.removeProperty(name));
      card.classList.toggle("is-stacked", !fits);
      return;
    }
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
