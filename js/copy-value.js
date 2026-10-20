/* Copy value — ONE copy-to-clipboard component for the whole prototype (2026-10-20).

   User (2026-10-20): „the copy code is different, let's use the same everywhere as a component” and
   „remove the copy icon in table or stacked view”. It replaces the BO `.e-permits-workplace__copy-code`
   (renderCopyCode / renderProfileCopyCode), the FO / Cabinet `.e-permits-fo-copy-value` (copyValueHtml),
   the RAP `.rap-copy*` / `.rap-profile__copy` and the act-view modal rows.

   Where: profiles, page-header meta, detail rows, dialogs, panels. NEVER in list views (tables,
   stacked rows, act / request rows, registries): there the number is plain text.

   Markup (GEAPCopyValue.html(value, { label })):
     <span class="copy-value">
       <span class="copy-value__text">D-2026-004575</span>
       <button class="btn btn-strict btn-sm btn-icon-only copy-value__button" type="button"
               data-copy-value="D-2026-004575" aria-label="Copiază numărul dosarului D-2026-004575"
               data-no-tooltip>
         <svg class="icon small" width="16" height="16" aria-hidden="true"><use href="…#icon-copy"></use></svg>
       </button>
     </span>
   The value stays plain, selectable text; only the library icon-only button (Strict · Small, 16 icon)
   copies. Feedback = the library plain tooltip (.tooltip.tooltip--small.tooltip--plain): „Copiază” on
   hover (600 ms, at once while warm / on keyboard focus), „✓ Copiat” for 1 500 ms after a copy, plus a
   polite live region. Keyboard = the native button (Enter / Space). Clipboard: navigator.clipboard →
   execCommand("copy") on a hidden textarea → the value text is selected and the tooltip says to press
   Ctrl+C / ⌘C. The click is handled in the CAPTURE phase on the document and stopped there, so a row,
   card or dialog that holds the value never reacts to the copy click. */
(() => {
  if (window.GEAPCopyValue) return;

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();

  const SHOW_DELAY = 600;   /* js/icon-tooltip.js timing */
  const WARM_WINDOW = 400;
  const COPIED_MS = 1500;
  const GAP = 4;
  const EDGE = 8;

  const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘C" : "Ctrl+C";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* value: what is copied (and shown). label: the button's aria-label (default „Copiază <value>”).
     text: optional display HTML when it differs from the value (a shortened hash). className: placement hook. */
  function html(value, { label = "", text = null, className = "" } = {}) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const aria = label || `Copiază ${raw}`;
    return `<span class="copy-value${className ? ` ${esc(className)}` : ""}"><span class="copy-value__text">${text ?? esc(raw)}</span><button class="btn btn-strict btn-sm btn-icon-only copy-value__button" type="button" data-copy-value="${esc(raw)}" aria-label="${esc(aria)}" data-no-tooltip><svg class="icon small" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-copy"></use></svg></button></span>`;
  }

  /* ---- clipboard ---------------------------------------------------------------------------- */
  async function writeClipboard(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext !== false) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) { /* permission / focus — try the legacy path */ }
    }
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.className = "copy-value__buffer";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    area.remove();
    return ok;
  }

  function selectText(button) {
    const text = button.closest(".copy-value")?.querySelector(".copy-value__text");
    const selection = window.getSelection?.();
    if (!text || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /* ---- tooltip (one shared node, the library plain tooltip) ------------------------------------ */
  let tip = null;
  let live = null;
  let target = null;
  let timer = 0;
  let copiedTimer = 0;
  let lastHiddenAt = 0;

  const ensureTip = () => {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "tooltip tooltip--small tooltip--plain copy-value__tooltip";
    tip.id = "copy-value-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = '<div class="tooltip-inner"></div>';
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  };

  const ensureLive = () => {
    if (live) return live;
    live = document.createElement("div");
    live.className = "u-visually-hidden copy-value__live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
    return live;
  };

  const place = () => {
    if (!tip || !target || !target.isConnected) return;
    const rect = target.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    let top = rect.bottom + GAP;
    if (top + box.height > window.innerHeight - EDGE) top = rect.top - GAP - box.height;
    let left = rect.left + rect.width / 2 - box.width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - box.width));
    tip.style.top = `${Math.round(top + window.scrollY)}px`;
    tip.style.left = `${Math.round(left + window.scrollX)}px`;
  };

  const show = (button, kind = "hint") => {
    ensureTip();
    target = button;
    const inner = tip.querySelector(".tooltip-inner");
    if (kind === "copied") {
      inner.innerHTML = `<span class="copy-value__copied"><svg class="icon small" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-checkmark-small"></use></svg><span>Copiat</span></span>`;
    } else if (kind === "select") {
      inner.textContent = `Apasă ${SHORTCUT} pentru a copia`;
    } else {
      inner.textContent = "Copiază";
    }
    tip.hidden = false;
    tip.classList.remove("show");
    place();
    requestAnimationFrame(() => tip && target === button && tip.classList.add("show"));
  };

  const hide = () => {
    clearTimeout(timer);
    if (tip && !tip.hidden) lastHiddenAt = performance.now();
    target = null;
    if (tip) { tip.classList.remove("show"); tip.hidden = true; }
  };

  const isCopied = (button) => button.classList.contains("is-copied");

  async function copy(button) {
    const value = button.dataset.copyValue || button.closest(".copy-value")?.querySelector(".copy-value__text")?.textContent.trim() || "";
    if (!value) return false;
    const ok = await writeClipboard(value);
    clearTimeout(copiedTimer);
    clearTimeout(timer);
    document.querySelectorAll(".copy-value__button.is-copied").forEach((other) => other.classList.remove("is-copied"));
    if (ok) {
      button.classList.add("is-copied");
      show(button, "copied");
      ensureLive().textContent = "Copiat";
      copiedTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (live) live.textContent = "";
        if (target === button) {
          if (button.matches(":hover, :focus-visible")) show(button, "hint");
          else hide();
        }
      }, COPIED_MS);
    } else {
      selectText(button);
      show(button, "select");
      ensureLive().textContent = `Valoarea este selectată. Apasă ${SHORTCUT} pentru a o copia.`;
      copiedTimer = window.setTimeout(() => { if (target === button) hide(); }, COPIED_MS * 2);
    }
    return ok;
  }

  const buttonOf = (node) => (node instanceof Element ? node.closest(".copy-value__button") : null);

  /* capture phase + stop: the row / card / dialog that holds the value never sees the click */
  document.addEventListener("click", (event) => {
    const button = buttonOf(event.target);
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    copy(button);
  }, true);

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const button = buttonOf(event.target);
    if (!button || button === target) return;
    const warm = performance.now() - lastHiddenAt < WARM_WINDOW || (tip && !tip.hidden);
    hide();
    clearTimeout(timer);
    timer = setTimeout(() => show(button, "hint"), warm ? 0 : SHOW_DELAY);
  });

  document.addEventListener("pointerout", (event) => {
    const button = buttonOf(event.target);
    if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
    if (button === target && isCopied(button)) return; /* „Copiat” stays its 1.5 s */
    clearTimeout(timer);
    if (button === target) hide();
  });

  document.addEventListener("focusin", (event) => {
    const button = buttonOf(event.target);
    if (!button || !button.matches(":focus-visible")) return;
    hide();
    show(button, isCopied(button) ? "copied" : "hint");
  });

  document.addEventListener("focusout", (event) => {
    const button = buttonOf(event.target);
    if (button && button === target && !isCopied(button)) hide();
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && target) hide(); });
  window.addEventListener("scroll", () => { if (target) place(); }, true);
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);

  window.GEAPCopyValue = { html, copy, hide, sprite: SPRITE };
})();
