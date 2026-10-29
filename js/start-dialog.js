/* ==========================================================================================================
   GEAPStartDialog — „Before you start” (start-dialog-v1 2026-10-29; start-dialog-v2 the same day, user: v1 „too much /
   useless — two data tables”)
   ONE short dialog for every menu item / alert button that STARTS a post-process or a request: the FO act row
   „Postprocese ⌄” (#intent), the Ghișeu desk ⋮ (#ghiseu/nou), the Ghișeu din oficiu ⋮ (#oficiu/nou — replaced the
   oficiu-v3 „Inițiezi <X>?”), the EVO Cabinet „Actele mele” + act profile „Postprocese ⌄” / „⋯”, the Cabinet act
   alerts' primaries, „Depune contestație” (request ⋮, request alerts, act alert).

   Markup = the library modal (components.md › Modal): .modal-overlay#start-dialog > .modal.modal--md.e-permits-start-dialog
     header   × · title «<Postproces> act» (titleFor) · subtitle = the act's NAME / object only (never a number —
              memory „No code in modal header”); phones: the sheet header (css/modal-phone.css)
     body     ONE sentence of what the post-process does (data: intent.postProcesses[id].summary; Ghișeu: SUMMARY below)
              — a consequential one (Suspendare / Retragere / Anulare) shows the consequence as the library notice
              (.message.message--subtle.banner--warning | --error) instead;
              then ONE row of 2–3 facts as library Medium neutral tags (start-dialog-v6): fee · term · signing (no signing for din oficiu)
     footer   „Anulează” · primary „Începe →” (trailing icon-arrow-right, red for a consequential one) + a 12/16 tertiary
              no caption (start-dialog-v7); primary = «Începe →»
   GEAPStartDialog.open({ title, subtitle, text, consequence, tone, facts, destructive, href | onStart, trigger })
   GEAPStartDialog.facts({ fee, term, sign }) · titleFor(label) · summaryFor(label, { oficiu }) · consequenceFor(label)
   GEAPStartDialog.citizenPostprocess({ pp, service, act, href | onStart, trigger }) · appeal({ subtitle, href, trigger })
   Keyboard: Esc closes, Tab is trapped — on WINDOW capture so a modal underneath (Ghișeu window, js/modal.js) never
   sees them. Anulează / × / Esc / scrim → focus back on the trigger. Look: css/start-dialog.css.
   ========================================================================================================== */
(function () {
  "use strict";
  if (window.GEAPStartDialog) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const src = document.currentScript?.src || "";
  const SPRITE = src ? src.replace(/js\/start-dialog\.js.*$/, "assets/icons/sprite.svg") : "assets/icons/sprite.svg";
  const ID = "start-dialog";
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const NOTICE_ICON = { warning: "warning-filled", error: "circle-error-filled", info: "circle-info-filled" };
  const icon = (id, cls = "") => `<svg class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true"><use href="${SPRITE}#icon-${id}"></use></svg>`;
  const key = (label) => String(label || "").trim().toLocaleLowerCase("ro");

  /* the heading = the post-process label, with „act” when the label does not name its object */
  const TITLES = {
    reperfectare: "Reperfectare act", prelungire: "Prelungire act", duplicat: "Emitere duplicat", "emitere duplicat": "Emitere duplicat",
    suspendare: "Suspendare valabilitate", "suspendare valabilitate": "Suspendare valabilitate",
    reluare: "Reluarea valabilității", "reluarea valabilității": "Reluarea valabilității", "reluare valabilitate": "Reluarea valabilității",
    retragere: "Retragere act", "retragere act permisiv": "Retragere act",
    anulare: "Anulare act", contestatie: "Contestare decizie", "contestație": "Contestare decizie"
  };
  function titleFor(label) {
    const k = key(label);
    if (TITLES[k]) return TITLES[k];
    return /\b(act|actului|valabilit|duplicat)/i.test(k) ? String(label) : `${label} act`;
  }

  /* the Ghișeu (desk + din oficiu) sentences — data/ghiseu.json has no description per request type (the FO / Cabinet
     read intent.postProcesses[id].summary / .consequence); impersonal, the clerk acts for the holder or the authority */
  const NORM = { "emitere duplicat": "duplicat", "suspendare valabilitate": "suspendare", "reluarea valabilității": "reluare", "reluare valabilitate": "reluare", "retragere act permisiv": "retragere", "contestație": "contestatie" };
  const id = (label) => NORM[key(label)] || key(label);
  const SUMMARY = {
    reperfectare: "Se modifică datele actului permisiv. Actul emis se atașează automat.",
    prelungire: "Se prelungește valabilitatea actului permisiv. Actul emis se atașează automat.",
    duplicat: "Se eliberează un duplicat al actului permisiv, cu aceleași date.",
    reluare: "Se reia valabilitatea actului suspendat.",
    contestatie: "Se contestă decizia autorității, cu motivele și dovezile titularului."
  };
  const CONSEQUENCE = {
    suspendare: "Actul nu va fi valabil pe durata suspendării; titularul nu poate desfășura activitatea autorizată.",
    retragere: "Actul va fi retras definitiv și nu mai poate fi reactivat.",
    anulare: "Actul va fi anulat și nu mai poate fi reactivat."
  };
  const summaryFor = (label) => SUMMARY[id(label)] || "";
  const consequenceFor = (label) => CONSEQUENCE[id(label)] || "";
  const toneFor = (label) => (id(label) === "suspendare" ? "warning" : "error");

  /* „N zile lucrătoare” (1 = „1 zi lucrătoare”, ≥ 20 = „de zile”) */
  function workingDays(n) {
    const v = Number(n);
    if (!v) return "";
    if (v === 1) return "1 zi lucrătoare";
    return `${v}${v % 100 >= 20 || v % 100 === 0 ? " de" : ""} zile lucrătoare`;
  }
  const mdl = (n) => `${Number(n).toLocaleString("ro-RO")} MDL`;

  /* the facts row: fee · term · signing (a fact without a value is left out — din oficiu has no signing) */
  function facts({ fee = 0, term = "", sign = "" } = {}) {
    return [
      { icon: "credit-card", text: typeof fee === "number" ? (fee > 0 ? mdl(fee) : "Fără taxă") : String(fee || "Fără taxă") },
      term ? { icon: "time", text: typeof term === "number" ? workingDays(term) : term } : null,
      sign ? { icon: "signature", text: sign } : null
    ].filter(Boolean);
  }

  let state = null;

  function overlay() {
    let el = document.getElementById(ID);
    if (el) return el;
    el = document.createElement("div");
    el.className = "modal-overlay e-permits-start-dialog__overlay";
    el.id = ID;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="modal modal--md e-permits-start-dialog" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="${ID}-title" aria-describedby="${ID}-body">
        <button type="button" class="modal-close" data-start-dialog-close aria-label="Închide">
          <span class="d-inline-flex">${icon("cross-large", "small")}</span>
        </button>
        <div class="modal--header">
          <h2 class="modal--header-title" id="${ID}-title" data-start-dialog-title></h2>
          <p class="e-permits-passport__modal-subtitle" data-start-dialog-subtitle></p>
        </div>
        <div class="modal-content" id="${ID}-body" data-start-dialog-body></div>
        <div class="modal--footer">
          <div class="modal-buttons" data-start-dialog-footer></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (event) => {
      if (event.target === el || event.target.closest("[data-start-dialog-close], [data-start-dialog-cancel]")) { close(); return; }
      const start = event.target.closest("[data-start-dialog-start]");
      if (!start || !state) return;
      const { onStart } = state;
      if (start.tagName === "A") {
        /* a new-tab link (EVO Cabinet → the FO form): the tab opens, the dialog closes, focus back to the trigger */
        if (start.target === "_blank") { close(); return; }
        /* a link: the browser navigates (modified clicks open a new tab — the dialog stays) */
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        close({ restore: false });
        if (onStart) { event.preventDefault(); onStart(); }
        return;
      }
      close({ restore: false });
      onStart?.();
    });
    return el;
  }

  function onKey(event) {
    const el = document.getElementById(ID);
    if (!el || !el.classList.contains("is-active")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    event.stopPropagation();
    const items = [...el.querySelectorAll(FOCUSABLE)].filter((node) => node.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const inside = el.contains(document.activeElement);
    if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
  }

  function open({ title = "", subtitle = "", text = "", consequence = "", tone = "warning", facts: factList = [], destructive = Boolean(consequence), primaryLabel = "Începe", href = "", newTab = false, onStart = null, onCancel = null, trigger = null } = {}) {
    const el = overlay();
    el.querySelector("[data-start-dialog-title]").textContent = title;
    const sub = el.querySelector("[data-start-dialog-subtitle]");
    sub.textContent = subtitle;
    sub.hidden = !subtitle;
    const lead = consequence
      ? `<div class="message message--subtle banner--${esc(tone)}" role="note">
          <span class="banner__icon">${icon(NOTICE_ICON[tone] || NOTICE_ICON.warning)}</span>
          <div class="banner__content"><p class="banner__text">${esc(consequence)}</p></div>
        </div>`
      : (text ? `<p class="e-permits-start-dialog__text">${esc(text)}</p>` : "");
    el.querySelector("[data-start-dialog-body]").innerHTML = `
      ${lead}
      ${factList.length ? `<ul class="e-permits-start-dialog__facts" aria-label="Pe scurt">${factList.map((f) => `<li class="e-permits-start-dialog__fact"><span class="status-tag status-tag--neutral is-subtle">${icon(f.icon)}<span>${esc(f.text)}</span></span></li>`).join("")}</ul>` : ""}`;
    const primaryClass = `btn ${destructive ? "btn-destructive" : "btn-primary"} btn-rounded`;
    /* start-dialog-v8 (user 2026-10-29): from EVO Cabinet the form opens in a NEW tab (another app; Cabinet stays) =
       the product's new-tab link: trailing external-link icon + „(se deschide într-o filă nouă)”; FO / Ghișeu / din
       oficiu continue in the same tab with the arrow */
    const external = Boolean(href && newTab);
    const inner = `<span>${esc(primaryLabel)}</span>${icon(external ? "external-link" : "arrow-right")}`;
    const primary = href
      ? `<a class="${primaryClass}" href="${esc(href)}"${external ? ` target="_blank" rel="noopener" aria-label="${esc(`${primaryLabel} (se deschide într-o filă nouă)`)}"` : ""} data-start-dialog-start>${inner}</a>`
      : `<button class="${primaryClass}" type="button" data-start-dialog-start>${inner}</button>`;
    el.querySelector("[data-start-dialog-footer]").innerHTML = `<button class="btn btn-neutral btn-rounded" type="button" data-start-dialog-cancel>Anulează</button>${primary}`;
    /* start-dialog-v7 (user 2026-10-29): no caption under the buttons — the primary's icon says where it goes */
    state = { onStart, onCancel, trigger: trigger || document.activeElement };
    el.classList.add("is-active");
    el.querySelector(".modal").classList.add("is-active");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKey, true);
    requestAnimationFrame(() => el.querySelector("[data-start-dialog-start]")?.focus({ preventScroll: true }));
  }

  function close({ restore = true } = {}) {
    const el = document.getElementById(ID);
    if (!el || !el.classList.contains("is-active")) return;
    el.classList.remove("is-active");
    el.querySelector(".modal")?.classList.remove("is-active");
    el.setAttribute("aria-hidden", "true");
    window.removeEventListener("keydown", onKey, true);
    if (!document.querySelector(".modal-overlay.is-active")) document.body.classList.remove("modal-open");
    const pending = state;
    state = null;
    if (!restore) return;
    pending?.onCancel?.();
    const back = pending?.trigger;
    if (back?.isConnected) requestAnimationFrame(() => back.focus({ preventScroll: true }));
  }

  /* a citizen post-process (FO #intent, EVO Cabinet) from data/acte-permisive.json › intent: pp = postProcesses[id] (+ id) —
     sentence = pp.summary, consequence = pp.consequence (consequential); service = services[code]: fee = fees[id] (none
     = „Fără taxă”), term = terms[id] working days; signing = MSign (US-55: mandatory for the holder) */
  function citizenPostprocess({ pp, service = {}, act = {}, href = "", newTab = false, onStart = null, trigger = null }) {
    const consequential = pp.kind === "consequential";
    return open({
      title: titleFor(pp.label),
      subtitle: act.name || "",
      text: pp.summary || summaryFor(pp.label),
      consequence: consequential ? pp.consequence || consequenceFor(pp.label) : "",
      tone: toneFor(pp.id || pp.label),
      facts: facts({ fee: Number(service.fees?.[pp.id]) || 0, term: Number(service.terms?.[pp.id]) || "", sign: "Semnare MSign" }),
      href, newTab, onStart, trigger
    });
  }

  /* „Depune contestație” (Cabinet request ⋮ / alerts, act alert): no fee, examined within 30 days (= data/ghiseu.json
     „Contestație” term), signed with MSign */
  function appeal({ subtitle = "", href = "", newTab = false, trigger = null }) {
    return open({
      title: titleFor("Contestație"),
      subtitle,
      text: "Contești decizia autorității. Descrii motivele și atașezi dovezile.",
      facts: facts({ fee: 0, term: "30 de zile", sign: "Semnare MSign" }),
      href, newTab, trigger
    });
  }

  const isOpen = () => Boolean(document.getElementById(ID)?.classList.contains("is-active"));

  window.GEAPStartDialog = { open, close, isOpen, titleFor, summaryFor, consequenceFor, toneFor, facts, workingDays, citizenPostprocess, appeal };
})();
