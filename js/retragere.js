/* ==========================================================================================================
   GEAPRetragere — „Retragerea cererii” (rtr-v1, 2026-11-25; US-413 97574 EVO Cabinet, US-422 97587 BO Registru Dosare)
   ONE rule set + ONE reason field for both sides, so the Cabinet „⋯ › Retrage cererea” and the BO „⋮ › Înregistrează
   retragerea cererii” never disagree:
     config(raw)   the service's „Retragerea cererii” block (Admin › Serviciu › Setări › „Retragerea cererii”, cfg keys
                   wdActive / wdLimit / wdReason / wdFee / wdNotify — or the Cabinet seed { active, limit, reason, fee,
                   notify }) → { active, limit: semnare|examinare, reason: obligatoriu|optional|exclus, fee: restituire|fara, notify }
     state(input)  AC-02…09 (US-413) / AC-03…07 (US-422): { show } hidden · { show, reason } blocked with the reason
                   (library Small tooltip on the disabled menu item) · { show } available
     reasonFieldHtml / bindReason / readReason   „Motivul retragerii” = the FO textarea (label, red star when required,
                   500 + counter) and the FO inline error „Câmpul este obligatoriu.”; nothing when the service excludes it
     feeFact / consequence   the dialog's notice + facts (US-413 AC-10)
   Demo overrides (both sides, ?state= links): rtr-activa=0 · rtr-motiv=obligatoriu|optional|exclus · rtr-limita=semnare|
   examinare · rtr-semnare=<id,…> (signing started) · rtr-continuare=<id,…> (supus continuării din oficiu) · rtr-oficiu=<id,…>
   ========================================================================================================== */
(function () {
  "use strict";
  if (window.GEAPRetragere) return;

  const params = new URLSearchParams(window.location.search);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const src = document.currentScript?.src || "";
  const SPRITE = src ? src.replace(/js\/retragere\.js.*$/, "assets/icons/sprite.svg") : "assets/icons/sprite.svg";
  const icon = (id, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="${SPRITE}#icon-${id}"></use></svg>`;

  /* the passport options (values = the labels the Admin form stores; keys = what the rules read) */
  const LIMITS = [["semnare", "Până la semnarea actului sau a deciziei de refuz"], ["examinare", "Până la începerea examinării"]];
  const REASONS = [["obligatoriu", "Obligatoriu", "Solicitantul scrie motivul înainte să semneze."], ["optional", "Opțional", "Solicitantul poate scrie motivul."], ["exclus", "Exclus", "Câmpul nu apare."]];
  const FEES = [["restituire", "Restituire", "Restituirea taxei achitate se inițiază automat."], ["fara", "Fără restituire", "Taxa achitată nu se restituie."]];
  const keyOf = (list, value, fallback) => (list.find(([key, label]) => key === value || label === value) || [fallback])[0];
  const labelOf = (list, key) => (list.find(([k]) => k === key) || [, key])[1];

  const DEFAULT = { active: false, limit: "semnare", reason: "obligatoriu", fee: "restituire", notify: true };
  const ids = (key) => (params.get(key) || "").split(",").map((v) => v.trim()).filter(Boolean);

  function config(raw = {}) {
    const c = {
      active: Boolean(raw.wdActive ?? raw.active ?? DEFAULT.active),
      limit: keyOf(LIMITS, raw.wdLimit ?? raw.limit, DEFAULT.limit),
      reason: keyOf(REASONS, raw.wdReason ?? raw.reason, DEFAULT.reason),
      fee: keyOf(FEES, raw.wdFee ?? raw.fee, DEFAULT.fee),
      notify: Boolean(raw.wdNotify ?? raw.notify ?? DEFAULT.notify)
    };
    if (params.get("rtr-activa") === "0") c.active = false;
    if (params.get("rtr-motiv")) c.reason = keyOf(REASONS, params.get("rtr-motiv"), c.reason);
    if (params.get("rtr-limita")) c.limit = keyOf(LIMITS, params.get("rtr-limita"), c.limit);
    return c;
  }
  const demo = {
    signing: (id) => ids("rtr-semnare").includes(id),
    continuation: (id) => ids("rtr-continuare").includes(id),
    exOfficio: (id) => ids("rtr-oficiu").includes(id)
  };

  /* the reasons of a BLOCKED action (US-413 AC-05 / AC-09, US-422 AC-07) — tooltip of the disabled item, tu form */
  const BLOCKED = {
    signing: "Autoritatea a început semnarea actului sau a deciziei de refuz. Cererea nu mai poate fi retrasă.",
    continuation: "Dosarul este supus continuării din oficiu. Autoritatea continuă procedura, iar cererea nu mai poate fi retrasă."
  };
  /* hidden: no right / not the holder (AC-01), service inactive (AC-02), draft (AC-03), past the limit (AC-04), signed
     (AC-06), withdrawn / annulled / archived / finished (AC-07), ex officio (AC-08) · blocked: signing started (AC-05),
     supus continuării din oficiu (AC-09) */
  function state({ cfg, allowed = true, draft = false, closed = false, signed = false, exOfficio = false, pastLimit = false, signingStarted = false, continuation = false }) {
    if (!allowed || !cfg?.active || draft || closed || signed || exOfficio || pastLimit) return { show: false, reason: "" };
    if (signingStarted) return { show: true, reason: BLOCKED.signing };
    if (continuation) return { show: true, reason: BLOCKED.continuation };
    return { show: true, reason: "" };
  }

  /* US-413 AC-10: what happens, and the fee rule of the service */
  const consequence = () => "Procedura se închide, iar actul permisiv nu se emite. După semnare, retragerea nu se mai poate anula.";
  function feeFact(cfg, { unpaid = false } = {}) {
    if (unpaid) return "Nota de plată neachitată se anulează";
    return cfg.fee === "restituire" ? "Taxa achitată se restituie" : "Taxa achitată nu se restituie";
  }

  /* „Motivul retragerii” — the FO textarea (js/e-permits-acte-permisive.js textareaFieldHtml markup), label + counter
     row, red star when required (US-413 AC-11 / US-422 AC-09); excluded = no field at all */
  const MAX = 500;
  const requiredMark = () => `<span class="e-permits-fo-required" aria-label="obligatoriu">${icon("asterisk", 12)}</span>`;
  function reasonFieldHtml({ id = "rtr-reason", mode = "obligatoriu", value = "", placeholder = "De ex. am renunțat la deschiderea unității" } = {}) {
    if (mode === "exclus") return "";
    const required = mode === "obligatoriu";
    return `
      <div class="e-permits-fo-field e-permits-rtr-reason" data-rtr-reason-field>
        <div class="e-permits-fo-field__label-counter"><label for="${esc(id)}">Motivul retragerii ${required ? requiredMark() : ""}</label><span class="e-permits-fo-field__counter" data-rtr-counter${value ? "" : " hidden"}>${value.length} / ${MAX}</span></div>
        <div class="e-permits-fo-textarea">
          <textarea id="${esc(id)}" rows="3" maxlength="${MAX}" placeholder="${esc(placeholder)}"${required ? ' aria-required="true"' : ""} data-rtr-reason>${esc(value)}</textarea>
        </div>
      </div>`;
  }
  const fieldErrorHtml = (id, message) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${esc(id)}-error" data-rtr-error>${icon("circle-error-filled")}<span>${esc(message)}</span></span>`;
  /* an inline error under a field (the FO error); "" clears it */
  function setError(field, message, { box = ".e-permits-fo-textarea, .e-permits-fo-doc-field" } = {}) {
    if (!field) return;
    const control = field.querySelector("textarea, input");
    const id = control?.id || field.dataset.rtrErrorId || "rtr-field";
    field.querySelector("[data-rtr-error]")?.remove();
    field.querySelector(box)?.classList.toggle("is-error", Boolean(message));
    if (!message) { control?.removeAttribute("aria-invalid"); control?.removeAttribute("aria-describedby"); return; }
    field.insertAdjacentHTML("beforeend", fieldErrorHtml(id, message));
    control?.setAttribute("aria-invalid", "true");
    control?.setAttribute("aria-describedby", `${id}-error`);
  }
  /* counter + clearing the error while typing */
  function bindReason(root) {
    const input = root?.querySelector("[data-rtr-reason]");
    if (!input || input.dataset.rtrBound) return;
    input.dataset.rtrBound = "1";
    const field = input.closest("[data-rtr-reason-field]");
    const counter = field.querySelector("[data-rtr-counter]");
    input.addEventListener("input", () => {
      counter.hidden = !input.value.length;
      counter.textContent = `${input.value.length} / ${MAX}`;
      if (input.value.trim()) setError(field, "");
    });
  }
  /* the value, or null after showing „Câmpul este obligatoriu.” (focus on the field) */
  function readReason(root, mode) {
    if (mode === "exclus") return "";
    const input = root?.querySelector("[data-rtr-reason]");
    const value = input?.value.trim() || "";
    if (mode === "obligatoriu" && !value) {
      setError(input?.closest("[data-rtr-reason-field]"), "Câmpul este obligatoriu.");
      input?.focus();
      return null;
    }
    return value;
  }

  window.GEAPRetragere = {
    LIMITS, REASONS, FEES, labelOf: (kind, key) => labelOf({ limit: LIMITS, reason: REASONS, fee: FEES }[kind] || [], key),
    config, demo, state, BLOCKED, consequence, feeFact,
    reasonFieldHtml, bindReason, readReason, setError, fieldErrorHtml, MAX
  };
})();
