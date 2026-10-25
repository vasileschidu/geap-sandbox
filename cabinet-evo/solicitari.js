/* Solicitările mele — EVO Cabinet (Feature 90817)
   US-19 88207 list + statuses + per-status deadline + contextual actions + errors
   US-158 91295 search / filters / sort / pagination
   US-161 91355 dosar profile (Date generale, Date solicitare, Taxe, Act / Decizie)
   US-29 88532 Continuă / Elimină schița · US-24 88527 Suplinire informații → FOD2
   US-135 90946 Achitare → MPay → back here · US-159 91297 representative read-only
   Figma EVO Cabinet „Solicitarile mele” 508:9600 + profiles 544:13632 / 545:2582 /
   553:4320 / 544:20022 / 544:20754 / 544:20755. Reuses the acts page vocabulary
   (cab-card, cab-chips, cab-menu, cab-detail) and the FO pieces (summary card,
   finish tracker / timeline, callout, roles, confirm-file rows, confirm modal).
   Demo URL params: depus / schita / achitat / plata=anulata (returns from FOD2 and
   MPay), eroare=lista|cautare|mpower, descarcare=eroare, redirectionare=eroare (Suplinire / Continuă schița
   do not open, US-24 AC-04 / US-29 AC-01), eliminare=eroare (the first „Elimină schița” fails, US-29 AC-01).
   Status-matrix gaps (2026-10-20, tools/persona-test/specs/cabinet-requests/STATUS-MATRIX.md): an expired
   suplinire → „În derulare” (normalize), the appeal countdown on refused requests, drafts removed automatically
   (not listed; the deep link shows why), the US-21 draft message, paper delivery, request filed by a
   representative, drafts with a pending / paid fee note. */
(() => {
  "use strict";

  const C = window.CabEvo;
  if (!C || C.VIEW !== "solicitari") return;

  const root = document.querySelector('[data-cab-view="solicitari"]');
  const { icon, escape, longDate, longDateTime, cabUrl, params } = C;
  const FO = "../e-permits-acte-permisive.html";
  const SPRITE = C.SPRITE;
  const TODAY = "2026-10-12";
  const DELETED_KEY = "e-permits-cab-deleted-drafts";
  const PER_PAGE = [10, 25, 50, 100];
  /* „Sortează” (2026-10-20, desktop + phones; replaces the US-19 AC-03 / US-158 AC-09 sortable table headers):
     the same keys as the table columns, each in both directions — a key starts in its natural direction */
  const SORT_KEYS = [
    /* order labels (2026-10-20, sort sheet): short, the same on the phone segmented control and the desktop menu;
       `name` = what a screen reader says / the announcement uses when the label is symbols */
    { key: "submitted", label: "Data depunerii", def: "desc", dirs: { desc: { label: "Cele mai noi" }, asc: { label: "Cele mai vechi" } } },
    { key: "end", label: "Data estimată de finalizare", def: "asc", dirs: { asc: { label: "Cele mai apropiate" }, desc: { label: "Cele mai îndepărtate" } } },
    { key: "nr", label: "Numărul dosarului", def: "asc", dirs: { asc: { label: "Crescător" }, desc: { label: "Descrescător" } } },
    { key: "service", label: "Serviciul solicitat", def: "asc", dirs: { asc: { label: "A → Z", name: "De la A la Z" }, desc: { label: "Z → A", name: "De la Z la A" } } },
    { key: "authority", label: "Autoritatea emitentă", def: "asc", dirs: { asc: { label: "A → Z", name: "De la A la Z" }, desc: { label: "Z → A", name: "De la Z la A" } } },
    { key: "status", label: "Statut", def: "asc", dirs: { asc: { label: "Ordinea etapelor" }, desc: { label: "Ordinea inversă" } } },
  ];
  const STATUS_ORDER = ["schita", "info", "achitare", "derulare", "finalizat"];
  const DRAFT_STEPS = { 1: "Date solicitant", 2: "Detalii solicitare", 3: "Acte necesare", 4: "Verificare și semnare", 5: "Livrare", 6: "Plată" };

  const state = {
    data: null,
    subjects: [],
    user: null,
    subject: null,
    perspective: null,
    dosare: [],
    filter: "toate",
    query: "",
    sort: "submitted-desc",
    page: 1,
    perPage: 10,
    /* US-158 AC-04…07: Statut, Autoritatea emitentă, Data depunerii, Data estimată de finalizare = the facet
       filter (the dates = its date range facet, 2026-10-20 — the separate „Perioadă” dialog is gone) */
    filter: { open: false, applied: {}, draft: null },
    notice: null,
    searchFailed: false,
    /* US-161: the profile section shown (Date generale by default, AC-03) */
    tab: "general",
    /* the issued acts (data/acte-permisive.json › intent.acts) — the act's service-specific fields (AC-29) */
    acts: [],
    /* drafts removed automatically (US-29 AC-02): not listed; #dosar/<id> explains it */
    removed: [],
  };

  /* ---------- helpers ---------- */

  const statusOf = (dosar) => state.data.statuses[dosar.status] || { label: dosar.status, tag: "status-tag--neutral is-subtle" };
  const serviceOf = (dosar) => state.data.services[dosar.service] || {};
  /* type-first-v1: „<service> — <object>” (object only when the request has one) — accessible names, menus */
  const requestLabel = (dosar) => [serviceOf(dosar).title, dosar.object].filter(Boolean).join(" — ") || dosar.nr;
  const money = (amount) => `${Number(amount || 0).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MDL`;
  const sortDate = (dosar) => dosar.submitted || dosar.created || "";
  const fold = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const isoDay = (iso) => String(iso || "").slice(0, 10);
  const addDays = (iso, days) => {
    const [y, m, d] = isoDay(iso).split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
  };
  const addWorkdays = (iso, days) => {
    let current = isoDay(iso);
    let left = days;
    while (left > 0) {
      current = addDays(current, 1);
      const weekday = new Date(`${current}T00:00:00Z`).getUTCDay();
      if (weekday !== 0 && weekday !== 6) left -= 1;
    }
    return current;
  };
  const daysBetween = (from, to) => Math.round((new Date(`${isoDay(to)}T00:00:00Z`) - new Date(`${isoDay(from)}T00:00:00Z`)) / 86400000);
  const relDays = (iso) => {
    const days = daysBetween(TODAY, iso);
    if (days === 0) return "astăzi";
    if (days === 1) return "mâine";
    return days > 1 ? `peste ${days} zile` : "";
  };

  /* estimated completion (US-19 AC-02 column „Data estimată de finalizare”): the examination term while the
     request is open (also in „Informații suplimentare”, US-161 AC-06), the date it was finished after */
  function estimatedEnd(dosar) {
    if (dosar.status === "finalizat") return dosar.finalized || "";
    if (dosar.status === "derulare" || dosar.status === "achitare" || dosar.status === "info") return dosar.examTerm || "";
    return "";
  }

  /* US-135 AC-14: a payment note past its term can no longer be paid (the request status stays as it
     is — the expired-note status mapping is a pending PO decision, MCabinet 95895) */
  const paymentExpired = (dosar) => dosar.status === "achitare" && Boolean(dosar.payment?.due) && dosar.payment.due < TODAY;

  /* US-29 AC-02 / US-21 AC-04: a draft is kept until the end of its removal day (counted from the FIRST save);
     after that it is removed automatically — not listed, the applicant is notified (notificari.js) */
  const autoRemoved = (dosar) => dosar.status === "schita" && Boolean(dosar.draft?.expires) && dosar.draft.expires < TODAY;
  /* US-21 AC-03: „<Timp setat>” = the retention configured in the BO (first save → removal day) */
  const retentionText = (dosar) => {
    const days = daysBetween(dosar.created, dosar.draft?.expires);
    return days === 1 ? "unei zile" : `a ${days}${days >= 20 ? " de" : ""} zile`;
  };
  const draftKeptText = (dosar) => `Schița salvată dar nefinisată va fi ștearsă automat în decursul ${retentionText(dosar)}.`;
  /* US-19 AC-06 / US-24 AC-03: a suspension whose suplinire term passed is reactivated by the BO → „În derulare”
     (the suplinire action goes, Data suspendării stays) — an „Informații suplimentare” row never shows an expired term */
  function normalize(dosar) {
    if (dosar.status === "info" && dosar.info?.until && dosar.info.until < TODAY) {
      return { ...dosar, status: "derulare", resumed: dosar.resumed || { kind: "expirat", at: `${addDays(dosar.info.until, 1)}T00:00` } };
    }
    return dosar;
  }
  const pendingFee = (dosar) => dosar.status === "schita" && dosar.payment?.status === "În așteptare";

  const appealUntil = (dosar) => (dosar.status === "finalizat" && dosar.finalized ? addDays(dosar.finalized, state.data.appealDays || 30) : "");
  /* request-act-modal-link-v1 (2026-10-23, user: „why does it have Depune contestație?”): a contestație exists only against a
     NEGATIVE decision — the request refused, or the authority's own suspension / withdrawal / annulment of the act
     (Feature 90818) — inside the appeal term; never on an approved request (issued act, a duplicate, the holder's own
     withdrawal, a resumed validity), even when that act was withdrawn later */
  const negativeDecision = (dosar) => dosar.result === "respins"
    || (Boolean(dosar.decisionOnly) && dosar.initiatedBy === "autoritate" && /^(suspendare|retragere|anulare)$/.test(dosar.pp || ""));
  const canAppeal = (dosar) => negativeDecision(dosar) && Boolean(appealUntil(dosar)) && appealUntil(dosar) >= TODAY;
  const authorityLabel = (dosar) => [serviceOf(dosar).authority, dosar.subdivision].filter(Boolean).join(" · ");
  const readOnly = () => Boolean(state.perspective?.readOnly);

  /* the FOD2 entry points (US-29 AC-01 last saved step, US-24 AC-02 suplinire). The
     cabinet's current instance travels along (?solicitant=, EVO → service hand-over):
     the FO never asks again in whose name (user rule 2026-10-13). */
  function foUrl(dosar, kind) {
    const query = new URLSearchParams({ flow: "full", solicitant: C.SUBJECT });
    if (kind === "draft") {
      query.set("schita", dosar.nr);
      if (dosar.pp && dosar.actId) { query.set("pp", dosar.pp); query.set("act", dosar.actId); }
      const step = Number(dosar.draft?.step) || 1;
      return `${FO}?${query.toString()}${step === 1 ? "#request" : `#request-step-${step}`}`;
    }
    if (kind === "supplement") {
      query.set("suplinire", dosar.nr);
      return `${FO}?${query.toString()}#request-step-2`;
    }
    if (kind === "appeal") {
      query.set("contestatie", dosar.nr);
      return `${FO}?${query.toString()}#request`;
    }
    return FO;
  }

  /* FO / shell markup reused here uses root-relative asset paths; this page lives one level
     down (empty-state.js resolves its own sprite path since 2026-10-14) */
  const fixAssets = (html) => html.replaceAll('href="assets/', 'href="../assets/').replaceAll('src="assets/', 'src="../assets/');

  function copyValue(value, label, className = "") {
    return C.copyValueHtml(value, label || `Copiază ${value}`, className);
  }

  function message(tone, iconId, html, { role = "", attrs = "" } = {}) {
    return `
      <div class="message message--subtle ${tone} message--small cab-message"${role ? ` role="${role}"` : ""}${attrs ? ` ${attrs}` : ""}>
        <span class="banner__icon">${icon(iconId, "medium")}</span>
        <div class="banner__content"><p>${html}</p></div>
      </div>`;
  }

  /* request status → the BO / RAP Tag · Small tone (bordered; 2026-10-17 alignment): Schiță neutral,
     În derulare blue, Spre achitare / Informații suplimentare warning (they wait for the applicant),
     Finalizat green */
  const statusTone = (id) => REQUEST_UI[id]?.tag || "neutral";
  /* a FINALIZED request shows ONE tag = its outcome, never „Finalizat” + outcome (outcome-tag-v1, user 2026-10-21:
     „the Finalizat badge doesn't make sense here, show only the actual status”): Aprobat success · Aprobat tacit blue
     (US-157 „Aprobat Tacit”, the RAP marking; demo `?tacit-dosar=<id>`) · Respins danger · any other result in the data
     as it is; screen readers keep the stage („Aprobat (finalizată)”). No known outcome → „Finalizat”. */
  const OUTCOMES = { aprobat: { label: "Aprobat", tone: "success" }, tacit: { label: "Aprobat tacit", tone: "brand" }, respins: { label: "Respins", tone: "danger" } };
  function outcomeOf(dosar) {
    if (dosar.status !== "finalizat" || !dosar.result) return null;
    const key = dosar.result === "aprobat" && dosar.tacit ? "tacit" : dosar.result;
    return OUTCOMES[key] || { label: key.charAt(0).toUpperCase() + key.slice(1), tone: "neutral" };
  }
  const statusLabel = (dosar) => outcomeOf(dosar)?.label || statusOf(dosar).label;
  const outcomeTone = (label) => Object.values(OUTCOMES).find((outcome) => outcome.label === label)?.tone;
  function statusTag(dosar) {
    const outcome = outcomeOf(dosar);
    if (outcome) return window.GEAPTag.html(`${escape(outcome.label)}<span class="u-visually-hidden"> (finalizată)</span>`, outcome.tone, { raw: true });
    return C.tagHtml(statusOf(dosar).label, statusTone(dosar.status));
  }

  /* the tacit approval still pending (AC-15) = the blue „Aprobare tacită” tag of RAP — a button here, because it
     carries the explanation (tooltip). Aprobat / Respins (AC-16) are the status tag itself now (outcome-tag-v1). */
  function marksHtml(dosar) {
    if (readOnly()) return "";
    if (dosar.tacit && dosar.status === "derulare") {
      return `<button class="status-tag status-tag--brand is-subtle status-tag--small cab-mark" type="button" data-tooltip-hint="${escape(tacitNote(dosar))}" aria-label="Aprobare tacită disponibilă. ${escape(tacitNote(dosar))}">Aprobare tacită</button>`;
    }
    return "";
  }

  /* US-19 AC-15 in the list: the icon + „Disponibilă aprobarea tacită” (a button: it carries the explanation tooltip) */
  function tacitListMark(dosar) {
    if (readOnly() || !(dosar.tacit && dosar.status === "derulare")) return "";
    return `<button class="sm-tacit" type="button" data-tooltip-hint="${escape(tacitNote(dosar))}" aria-label="Disponibilă aprobarea tacită. ${escape(tacitNote(dosar))}">${icon("icon-circle-checkmark-filled")}<span>Disponibilă aprobarea tacită</span></button>`;
  }

  /* US-19 AC-05…08: the live countdown to the deadline of the status (the end of the deadline day, demo „now” =
     today's date of the data at the current time of day); refreshed every minute */
  function deadlineOf(dosar) {
    if (readOnly()) return "";
    if (dosar.status === "schita") return dosar.draft?.expires || "";
    if (dosar.status === "info") return dosar.info?.until || "";
    if (dosar.status === "achitare") return paymentExpired(dosar) ? "" : dosar.payment?.due || "";
    if (dosar.status === "derulare" && !dosar.tacit) return dosar.examTerm || "";
    /* the official matrix: Finalizat counts down only while a contestație is possible (refused requests here — for
       approved ones where the appeal starts is PO question 3) */
    if (dosar.status === "finalizat" && dosar.result === "respins" && canAppeal(dosar)) return appealUntil(dosar);
    return "";
  }
  function demoNow() {
    const now = new Date();
    const [y, m, d] = TODAY.split("-").map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  }
  function countdownText(iso) {
    const [y, m, d] = isoDay(iso).split("-").map(Number);
    const left = new Date(y, m - 1, d, 23, 59, 59) - demoNow();
    if (left <= 0) return "termenul a expirat";
    const days = Math.floor(left / 86400000);
    const hours = Math.floor((left % 86400000) / 3600000);
    const unit = (n, one, many) => (n === 1 ? `1 ${one}` : `${n}${n >= 20 ? " de" : ""} ${many}`);
    if (!days) return `mai ${hours === 1 ? "este" : "sunt"} ${hours ? unit(hours, "oră", "ore") : "mai puțin de o oră"}`.replace("mai sunt mai puțin", "mai este mai puțin");
    return `mai ${days === 1 && !hours ? "este" : "sunt"} ${unit(days, "zi", "zile")}${hours ? ` și ${unit(hours, "oră", "ore")}` : ""}`;
  }
  window.setInterval(() => {
    document.querySelectorAll("[data-sm-countdown]").forEach((node) => {
      node.textContent = countdownText(node.dataset.smCountdown);
    });
  }, 60000);

  const tacitNote = (dosar) => `Autoritatea nu a emis o decizie până la termenul de examinare (${longDate(dosar.examTerm)}). Solicitarea se consideră aprobată tacit, iar dumneavoastră puteți desfășura activitatea conform legii.`;

  /* contextual actions per status (US-19, US-29, US-24, US-135, Feature 90817) */
  function menuItems(dosar) {
    const items = [{ action: "open", icon: "icon-eye-open", label: "Detalii" }];
    if (dosar.status === "schita") {
      items.push({ action: "continue", icon: "icon-edit", label: "Continuă schița", href: foUrl(dosar, "draft") });
      items.push({ separator: true });
      items.push({ action: "delete", icon: "icon-delete", label: "Elimină schița" });
    }
    if (dosar.status === "info" && dosar.info?.until >= TODAY) items.push({ action: "supplement", icon: "icon-page-upload", label: "Suplinire informații", href: foUrl(dosar, "supplement") });
    if (dosar.status === "achitare" && !paymentExpired(dosar)) items.push({ action: "pay", icon: "icon-credit-card", label: `Achită ${money(dosar.payment?.amount)}` });
    if (dosar.status === "derulare" || dosar.status === "info" || dosar.status === "achitare") items.push({ action: "download", kind: "certificat", icon: "icon-export", label: "Descarcă certificatul constatator" });
    if (dosar.status === "finalizat" && dosar.result === "aprobat" && dosar.actId) {
      items.push({ action: "act", icon: "icon-page-text", label: "Vezi actul", href: cabUrl("acte", { act: dosar.actId }) });
      items.push({ action: "download", kind: dosar.decisionOnly ? "decizie" : "act", icon: "icon-export", label: dosar.decisionOnly ? "Descarcă decizia (MDocs)" : "Descarcă actul (MDocs)" });
    }
    if (dosar.status === "finalizat" && dosar.result === "respins") items.push({ action: "download", kind: "decizie", icon: "icon-export", label: "Descarcă decizia (MDocs)" });
    if (canAppeal(dosar)) items.push({ action: "appeal", icon: "icon-judge-gavel", label: "Depune contestație", href: foUrl(dosar, "appeal") });
    return items;
  }

  function actionsHtml(dosar) {
    const menuId = `sm-menu-${dosar.id}`;
    /* the row's labelled primary is not repeated in ⋮ */
    /* the row has no labelled button: every action is here; downloads only in the profile / document modal */
    const items = menuItems(dosar).filter((item) => item.separator || item.action !== "download")
      .filter((item, i, list) => !(item.separator && (i === 0 || list[i - 1].separator || i === list.length - 1)));
    /* row-kebab-v1 (2026-10-20, user: „Back to 3 dots, Acțiuni is too ambiguous”): the row's trigger = the
       icon-only ⋮ (library Neutral · Icon Only · Small: `btn btn-neutral btn-sm btn-icon-only` (grey at rest, user 2026-10-20), 32 square, radius 6 —
       the height / radius family of the acts' „Postprocese ⌄”), tooltip „Mai multe acțiuni”, opening the same
       anchored menu (phones: touch item size, never the action sheet); open = tertiary-active + focus ring
       (aria-expanded). (The labelled „Acțiuni ⌄” of action-menu-v1 is gone, with its ?actiuni=kebab demo.)
       no-lone-detalii-v1 (2026-10-21, user: „if it does the same as clicking the entire card, remove Detalii”): a row
       whose only action is „Detalii” has NO trigger — the whole card is the action (click / Enter / Space), no
       right-hand space is reserved; returns "" (cardHtml then emits no action block). */
    const name = requestLabel(dosar);
    if (items.length === 1 && items[0].action === "open") return "";
    return `
      <div class="e-permits-fo-intent-act__action cab-card__actions">
        <button class="btn btn-neutral btn-sm btn-icon-only cab-card__more" type="button" aria-label="Acțiuni pentru ${escape(name)}" data-tooltip-label="Mai multe acțiuni" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-cab-menu-trigger>${icon("icon-more-vertical")}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="${menuId}" role="menu" aria-label="Acțiuni pentru ${escape(name)}" hidden>
          ${items.map((item) => item.separator
            ? `<li role="separator" class="cab-menu__separator"></li>`
            : item.href
              ? `<li role="none"><a class="e-permits-fo-intent-menu__item" role="menuitem" href="${escape(item.href)}" data-sm-action="${item.action}" data-sm-id="${escape(dosar.id)}">${icon(item.icon, "medium")}<span>${escape(item.label)}</span></a></li>`
              : `<li role="none"><button class="e-permits-fo-intent-menu__item${item.action === "delete" ? " is-danger" : ""}" type="button" role="menuitem" data-sm-action="${item.action}" data-sm-id="${escape(dosar.id)}"${item.kind ? ` data-sm-kind="${item.kind}"` : ""}>${icon(item.icon, "medium")}<span>${escape(item.label)}</span></button></li>`).join("")}
        </ul>
      </div>`;
  }

  /* ---------- list ---------- */

  /* ---------- the request row, per status — ONE table (2026-10-20) ----------
     status → the Small tag tone · the row's alert · the date slot of the meta. The row has NO labelled button
     (user 2026-10-20: only ⋮ on the right, as in Figma; the row opens the profile for every status, drafts included — 2026-10-20).
     Alerts = ACTION ONLY: they exist only when the applicant must act and end with the ONE inline action link
     (the old row buttons' hooks / handlers): Informații suplimentare → „Trimite informațiile →”, Spre achitare →
     „Achită acum →” (warning, with the live countdown + „Finalizare estimată”); an expired payment = error, no
     link; a refused request inside its appeal window → info „Puteți depune contestație până la … · countdown ·
     Depune contestație →” (a right with a deadline, the official matrix; 2026-10-20). An expired suplinire is not
     an alert: the request is back „În derulare” (normalize). No alert for drafts (the removal date is in the
     meta) nor for waiting states (în examinare, termen, tacit → the profile's „Stadiul solicitării”). A new status
     = one entry here (+ its label in data/cabinet-evo-solicitari.json › statuses). `{ link: false }` = the same alert
     without its inline action, for the profile's „Stadiul solicitării” card (its button is right under it). */
  const countdown = (dosar) => (deadlineOf(dosar) ? ` · <span data-sm-countdown="${escape(isoDay(deadlineOf(dosar)))}">${escape(countdownText(deadlineOf(dosar)))}</span>` : "");
  const on = (date) => `<strong>${escape(longDate(date))}</strong>`;
  /* US-19 AC-02 „Data estimată de finalizare” in the row = part of its action alert (requests in examination:
     the profile's „Stadiul solicitării”) */
  const endNote = (dosar) => (estimatedEnd(dosar) ? `. Finalizare estimată: ${on(estimatedEnd(dosar))}.` : ".");
  /* the alert's inline action = the library link (primary; the alert's 14/20 text size); a link navigates (FOD2), a button runs here (MPay) */
  const alertLink = (dosar, action, label, href = "") => (href
    ? ` <a class="link link-primary link-sm cab-alert-link" href="${escape(href)}" data-sm-action="${action}" data-sm-id="${escape(dosar.id)}">${escape(label)}&nbsp;→</a>`
    : ` <button class="link link-primary link-sm cab-alert-link" type="button" data-sm-action="${action}" data-sm-id="${escape(dosar.id)}">${escape(label)}&nbsp;→</button>`);
  const REQUEST_UI = {
    schita: {
      tag: "neutral",
      alert: () => null,
      date: (d) => `Creată ${longDate(d.created)}`,
    },
    info: {
      tag: "warning",
      alert: (d, { link = true } = {}) => ({ tone: "warning", icon: "icon-warning-filled", html: `Trimiteți informațiile cerute până la ${on(d.info?.until)}${countdown(d)}${endNote(d)}${link ? alertLink(d, "supplement", "Trimite informațiile", foUrl(d, "supplement")) : ""}` }),
    },
    achitare: {
      tag: "warning",
      alert: (d, { link = true } = {}) => (paymentExpired(d)
        ? { tone: "danger", icon: "icon-circle-error-filled", html: `Taxa a expirat pe ${on(d.payment?.due)}. Achitarea nu mai este posibilă.` }
        : { tone: "warning", icon: "icon-credit-card", html: `Achitați taxa de ${escape(money(d.payment?.amount))} până la ${on(d.payment?.due)}${countdown(d)}${endNote(d)}${link ? alertLink(d, "pay", "Achită acum") : ""}` }),
    },
    derulare: { tag: "info", alert: () => null },
    finalizat: {
      tag: "success",
      alert: (d, { link = true } = {}) => (d.result === "respins" && canAppeal(d)
        ? { tone: "info", icon: "icon-judge-gavel", html: `Puteți depune contestație până la ${on(appealUntil(d))}${countdown(d)}.${link ? alertLink(d, "appeal", "Depune contestație", foUrl(d, "appeal")) : ""}` }
        : null),
      date: (d) => (d.finalized ? `Finalizată ${longDate(d.finalized)}` : ""),
    },
  };
  const uiOf = (dosar) => REQUEST_UI[dosar.status] || { tag: "neutral", alert: () => null };
  const rowAlert = (dosar) => (readOnly() ? null : uiOf(dosar).alert(dosar));
  /* slot 4 of the meta: the status's own date, else „Depusă …” */
  const rowDate = (dosar) => uiOf(dosar).date?.(dosar) || `Depusă ${longDate(dosar.submitted)}`;

  /* Solicitările mele row (2026-10-20, user: „the same stacked list as Actele mele permisive”) = the act row
     (js/act-row.js, GEAPActRow.html — .e-permits-fo-lib-item.e-permits-fo-intent-act: bordered card, r12, 12
     padding, tertiary hover) with the request's content, desktop AND phones (the US-19 table is gone):
       no lead icon (user) · title = the service / act name + Small status tag (+ the tacit-approval mark) ·
       line 2 = the object / location, only when the request has one (type-first-v1, 2026-10-21, user: „first the
       name of the act, and in second place the location, if any”; was: title = the object) · meta 14/20 = Nr dosar
       (copy) · tip · autoritate · subdiviziune · Depusă / Creată · Finalizare estimată · right: the ⋮ ·
       under it, full card width, the status alert (the act row's notice slot: library subtle notice, tone per
       REQUEST_UI, live countdown). The whole row opens the request profile. */
  function cardHtml(dosar) {
    const service = serviceOf(dosar);
    const place = dosar.object || "";
    const base = { id: dosar.id, name: "", status: dosar.status, statusLabel: statusLabel(dosar) };
    /* no lead icon (user 2026-10-20): the row starts with the title + status tag */
    const common = { menuId: `sm-row-${dosar.id}`, assets: "../assets/", iconSrc: "", tagHtml: statusTag(dosar) };
    if (readOnly()) {
      /* US-159 AC-06: only nr, serviciu, data depunerii and the status at expiry; no action, not clickable */
      return window.GEAPActRow.html({ ...base, name: service.title || "" }, {
        ...common,
        place,
        attrs: `data-sm-card="${escape(dosar.id)}"`,
        metaSlots: { number: dosar.nr, numberLabel: `Copiază numărul dosarului ${dosar.nr}`, date: `Depusă ${longDate(dosar.submitted)}` },
        actionHtml: "",
        rowClass: "cab-request-row is-static",
      });
    }
    const name = service.title || dosar.object || "";
    const alert = rowAlert(dosar);
    const actions = actionsHtml(dosar);
    return window.GEAPActRow.html({ ...base, name }, {
      ...common,
      /* act-profile-url-v1: the title links to the request's own address (new tab, copy link) */
      titleHref: requestUrl(dosar.id),
      place: service.title ? place : "",
      attrs: `tabindex="0" data-sm-card="${escape(dosar.id)}" aria-label="${escape(`${requestLabel(dosar)} — ${statusLabel(dosar)}${outcomeOf(dosar) ? " (finalizată)" : ""}, deschide detaliile`)}"`,
      extraTagsHtml: `${tacitListMark(dosar)}${dosar.status === "schita" && dosar.signed ? C.signedTagHtml() : ""}`,
      /* the shared meta slots (js/act-row.js metaParts): number (the compact copy value) · type of request ·
         authority · subdivision · date — the service name is the title (type-first-v1), never repeated here */
      metaSlots: { number: dosar.nr, numberLabel: `Copiază numărul dosarului ${dosar.nr}`, what: dosar.tip || "", authority: service.authority, subdivision: dosar.subdivision, date: rowDate(dosar) },
      ...(alert ? { noticeHtml: alert.html, noticeTone: alert.tone === "danger" ? "error" : alert.tone, noticeIcon: alert.icon, noticeLocks: false } : {}),
      /* only the ⋮ (every action of the request, no downloads — no-row-download rule); nothing when the only
         action was „Detalii” (no-lone-detalii-v1: the card itself opens the details) */
      actionHtml: actions ? `
          <div class="cab-doc__actions cab-card__actions">${actions.replace("e-permits-fo-intent-act__action cab-card__actions", "e-permits-fo-intent-act__action")}</div>` : "",
      rowClass: `cab-request-row${dosar.justAdded ? " is-new" : ""}`,
    });
  }

  /* US-158 AC-04 / 05: Statut and Autoritatea emitentă = multi-select facets of the shared facet filter
     (js/facet-filter.js — the BO bar + popovers, the RAP phone sheets); OR inside a facet, AND across (AC-08).
     AC-06 / 07: Data depunerii and Data estimată de finalizare = its date range facets (presets + „Interval
     personalizat” De la / Până la, end ≥ start = AC-11); the estimated end looks ahead (Următoarele 7 / 30 de zile). */
  const authorityValue = (dosar) => {
    const code = serviceOf(dosar).authority;
    return code ? `${code} · ${state.data.help[code]?.name || serviceOf(dosar).authorityName || ""}`.replace(/ · $/, "") : "";
  };
  const FACETS = [
    /* Statut = the labels of the tags (outcome-tag-v1): a finalized request is filtered by its outcome */
    { key: "status", label: "Statut", get: statusLabel },
    { key: "autoritate", label: "Autoritatea emitentă", search: true, get: authorityValue },
    { key: "depunere", label: "Data depunerii", type: "date", get: (dosar) => isoDay(dosar.submitted), today: () => TODAY },
    { key: "finalizare", label: "Data estimată de finalizare", type: "date", presets: ["azi", "u7z", "u30z", "an"], get: (dosar) => isoDay(estimatedEnd(dosar)), today: () => TODAY },
  ];
  const facetValues = (facet, dosar) => [].concat(facet.get(dosar) ?? []).filter(Boolean);
  function matchesFacets(dosar, except = null, selection = state.filter.applied) {
    return Object.entries(selection).every(([key, values]) => {
      if (key === except || !values?.length) return true;
      const facet = FACETS.find((f) => f.key === key);
      if (facet?.type === "date") return window.GEAPFacetFilter.dateMatch(values[0], facet.get(dosar), TODAY);
      return !facet || facetValues(facet, dosar).some((value) => values.includes(value));
    });
  }
  /* search (AC-02) — everything but the facets */
  function matchesBase(dosar) {
    const query = fold(state.query.trim());
    return !query || fold([dosar.nr, serviceOf(dosar).title, dosar.object].join(" ")).includes(query);
  }
  function facetOptions(facet, selection = state.filter.applied) {
    const counts = new Map();
    state.dosare.forEach((dosar) => {
      if (!matchesBase(dosar) || !matchesFacets(dosar, facet.key, selection)) return;
      new Set(facetValues(facet, dosar)).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    });
    (selection[facet.key] || []).forEach((value) => { if (!counts.has(value)) counts.set(value, 0); });
    const statusRank = (value) => { const outcome = Object.values(OUTCOMES).findIndex((o) => o.label === value); return outcome >= 0 ? STATUS_ORDER.length + outcome : STATUS_ORDER.findIndex((id) => state.data.statuses[id]?.label === value); };
    const order = facet.key === "status" ? statusRank : null;
    return [...counts.entries()].map(([value, count]) => ({ value, count }))
      .sort((a, b) => (order ? order(a.value) - order(b.value) : a.value.localeCompare(b.value, "ro", { numeric: true })));
  }
  /* first load (cabinet-skeleton-v1): every facet, so the trigger keeps its place (disabled, inert toolbar) */
  const availableFacets = () => (state.firstLoading ? FACETS : FACETS.filter((facet) => state.filter.applied[facet.key]?.length || new Set(state.dosare.flatMap((dosar) => facetValues(facet, dosar))).size > 1));
  let facetFilter = null;
  function initFacetFilter() {
    facetFilter = window.GEAPFacetFilter?.create({
      bar: root.querySelector("[data-sm-filters]"),
      toggle: root.querySelector("[data-sm-filter-toggle]"),
      count: root.querySelector("[data-sm-filter-count]"),
      /* phones: „Sortează” joins the „Filtre” pill in one row (js/facet-filter.js) */
      sort: root.querySelector(".cab-sort"),
      sprite: SPRITE,
      state: () => state.filter,
      facets: availableFacets,
      allFacets: () => FACETS,
      options: facetOptions,
      tag: (value, facet) => {
        if (facet.key !== "status") return null;
        if (outcomeTone(value)) return C.tagHtml(value, outcomeTone(value));
        const id = Object.keys(state.data.statuses).find((key) => state.data.statuses[key].label === value);
        return C.tagHtml(value, statusTone(id));
      },
      total: () => filtered().length,
      mobileSheets: true,
      preview: (selection) => state.dosare.filter((dosar) => matchesBase(dosar) && matchesFacets(dosar, null, selection)).length,
      apply: () => { state.page = 1; listLoader.load(); },
    }) || null;
  }

  /* search (US-158 AC-02: partial, case- and diacritic-insensitive) AND panel filters
     (AC-04/06/07) AND the status chip, then the sort (AC-08) */
  function filtered() {
    return state.dosare.filter((dosar) => matchesBase(dosar) && matchesFacets(dosar));
  }

  function sorted(list) {
    const [key, dir] = state.sort.split("-");
    const value = (dosar) => ({
      submitted: sortDate(dosar),
      end: estimatedEnd(dosar) || "9999",
      nr: dosar.nr,
      service: fold(serviceOf(dosar).title),
      authority: fold(serviceOf(dosar).authority),
      status: String(STATUS_ORDER.indexOf(dosar.status)),
    })[key];
    return [...list].sort((a, b) => {
      const result = value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0;
      return dir === "desc" ? -result : result;
    });
  }

  /* the shared Cabinet pager (CabEvo.pagerHtml, also on Actele mele permisive) */
  const pagerHtml = (total) => C.pagerHtml({ total, page: state.page, perPage: state.perPage, sizes: PER_PAGE, prefix: "sm", label: "Paginarea solicitărilor", sizeLabel: "Dosare pe pagină" });

  /* US-159: the read-only history after the MPower expired / was revoked (the acts side shows the same
     notice with no data — CabEvo.restrictionHtml) */
  function readOnlyBanner() {
    const name = state.subject?.name || "beneficiar";
    return C.restrictionHtml(state.perspective.readOnly, `Vedeți doar istoricul solicitărilor depuse pentru ${name}, cu statutul de la acea dată. Datele nu se mai actualizează, iar acțiunile nu sunt disponibile. Pentru acces complet, cereți beneficiarului o împuternicire nouă în MPower.`);
  }

  function errorHtml(text, retry = "data-sm-retry") {
    return fixAssets(window.GEAPEmptyState.render({
      title: "A apărut o eroare",
      text,
      icon: "circle-error",
      actionHtml: `<button class="btn btn-neutral" type="button" ${retry}>${icon("icon-rotate-arrow", "medium")}<span>Încercați din nou</span></button>`,
    }));
  }

  /* „de la A la Z”: only the first letter goes lower case (as the acts list, acts-sort-v1) */
  const dirName = (d) => { const name = d.name || d.label; return `${name.charAt(0).toLowerCase()}${name.slice(1)}`; };
  const sortNow = () => { const [key, dir] = state.sort.split("-"); const sort = SORT_KEYS.find((item) => item.key === key) || SORT_KEYS[0]; return { sort, dir, text: `${sort.label}, ${dirName(sort.dirs[dir])}` }; };
  /* the orders of a key, its natural one first (labels for the key: dates newest / oldest, texts A → Z / Z → A) */
  const sortOrders = (key) => {
    const sort = SORT_KEYS.find((item) => item.key === key) || SORT_KEYS[0];
    return ["asc", "desc"].sort((a) => (a === sort.def ? -1 : 1)).map((d) => ({ value: d, label: sort.dirs[d].label, name: sort.dirs[d].name }));
  };
  /* desktop: two radio groups in one menu (js/sort-sheet.js); a pick applies at once, closes the menu and is
     announced. Phones: the same trigger opens the sort sheet (GEAPSortSheet.bind in ensureListShell) */
  function sortMenuHtml() {
    const { sort, dir } = sortNow();
    return window.GEAPSortSheet.menuHtml({
      id: "sm-sort",
      keys: SORT_KEYS.map((item) => ({ value: item.key, label: item.label })),
      orders: sortOrders,
      current: { key: sort.key, order: dir },
      keyAttr: "data-sm-sort-key",
      orderAttr: "data-sm-sort-dir",
    });
  }
  /* one place that applies a sort (menu pick or the sheet's „Aplică”): AC-12 back to page 1, announced */
  function applySort(next) {
    state.sort = next;
    state.page = 1;
    C.closeMenus();
    listLoader.load();
    root.querySelector("[data-sm-sort-status]").textContent = `Lista este sortată după ${sortNow().text}.`;
    root.querySelector(".cab-sort__trigger")?.focus();
  }
  function syncSortTrigger(view) {
    const { sort, text } = sortNow();
    const trigger = view.querySelector(".cab-sort__trigger");
    trigger.setAttribute("aria-label", `Sortează: ${text}`);
    /* the button shows the key only (user 2026-10-20); the direction lives in the menu's „Ordine” group and the name */
    trigger.querySelector("[data-sm-sort-label]").textContent = sort.label;
  }

  /* the list shell is built once (search, „Filtre”, „Sortează”, the facet bar keep their DOM / focus); only the
     lead (read-only notice, return notices) and the results are redrawn */
  function ensureListShell() {
    let view = root.querySelector("[data-sm-list-view]");
    if (view) return view;
    root.innerHTML = `
      <div class="sm-list-view" data-sm-list-view>
        <section class="cab-intro" aria-labelledby="sm-title">
          <h1 class="text-heading-h2" id="sm-title" tabindex="-1">Solicitările mele</h1>
        </section>
        <div class="sm-list-view__lead" data-sm-lead></div>
        <div class="cab-toolbar" data-sm-toolbar>
          <div class="search-input medium rectangular cab-search">
            <span class="icon-search" aria-hidden="true">${icon("icon-search", "")}</span>
            <input class="input" type="search" autocomplete="off" placeholder="Caută după nr. dosar sau serviciu" aria-label="Caută în solicitări după numărul dosarului sau serviciu" data-sm-search>
            <div class="btn-group cab-search__actions">
              <button class="btn-icon clear cab-search__clear" type="button" aria-label="Șterge căutarea" data-sm-search-clear disabled>
                <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-cross-small"></use></svg>
              </button>
            </div>
          </div>
          <button class="chip e-permits-filter-trigger e-permits-workplace__advanced cab-filter" type="button" aria-expanded="false" aria-controls="sm-filters" data-sm-filter-toggle>
            <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="${SPRITE}#icon-filter-lines"></use></svg></span>
            <span class="chip__label">Filtre</span>
            <span class="chip__badge" aria-hidden="true" data-sm-filter-count hidden></span>
          </button>
          <div class="cab-sort">
            <button type="button" class="chip e-permits-filter-trigger e-permits-sort-trigger cab-sort__trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="sm-sort-menu" data-cab-menu-trigger>
              <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="${SPRITE}#icon-sort"></use></svg></span>
              <span class="chip__label" data-sm-sort-label>Data depunerii</span>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--wide e-permits-sort-menu" id="sm-sort-menu" role="menu" aria-label="Sortează solicitările" hidden data-sm-sort-menu></ul>
          </div>
        </div>
        <div class="e-permits-workplace__filters cab-filters" id="sm-filters" role="group" aria-label="Filtre" data-sm-filters hidden></div>
        <p class="u-visually-hidden" aria-live="polite" data-sm-sort-status></p>
        <p class="u-visually-hidden" aria-live="polite" data-sm-loading-status></p>
        <div class="sm-results" data-sm-results></div>
      </div>
      <div class="sm-profile-view" data-sm-profile-view hidden></div>`;
    initFacetFilter();
    /* phones: „Sortează” = the sort sheet (radio keys, segmented order, „Aplică”) */
    window.GEAPSortSheet.bind(root.querySelector(".cab-sort__trigger"), {
      title: "Sortează",
      sprite: SPRITE,
      keys: SORT_KEYS.map((item) => ({ value: item.key, label: item.label })),
      orders: sortOrders,
      current: () => { const { sort, dir } = sortNow(); return { key: sort.key, order: dir }; },
      apply: ({ key, order }) => applySort(`${key}-${order}`),
    });
    return root.querySelector("[data-sm-list-view]");
  }

  /* loading (cabinet-skeleton-v1, CabEvo.listLoader): the toolbar, facet bar and pager from the new state at once,
     the rows = the skeleton (kept while already there, so typing does not restart its shimmer) */
  function renderList({ loading = false } = {}) {
    C.setHeaderTitle("Solicitările mele");
    const view = ensureListShell();
    view.hidden = false;
    const profileView = root.querySelector("[data-sm-profile-view]");
    profileView.hidden = true;
    profileView.innerHTML = "";
    const toolbar = view.querySelector("[data-sm-toolbar]");
    const results = view.querySelector("[data-sm-results]");
    const lead = view.querySelector("[data-sm-lead]");

    /* US-19 AC-13 / US-159 AC-10 */
    if (params.get("eroare") === "lista" || (params.get("eroare") === "mpower" && state.perspective?.mpower)) {
      const text = params.get("eroare") === "mpower"
        ? "Verificarea drepturilor de reprezentare nu a putut fi efectuată. Încercați din nou."
        : "Lista solicitărilor nu a fost încărcată. Încercați din nou.";
      toolbar.hidden = true;
      view.querySelector("[data-sm-filters]").hidden = true;
      lead.innerHTML = "";
      results.innerHTML = `<div class="cab-state" role="alert">${errorHtml(text)}</div>`;
      return;
    }

    const all = sorted(filtered());
    const pages = Math.max(1, Math.ceil(all.length / state.perPage));
    state.page = Math.min(state.page, pages);
    const pageItems = all.slice((state.page - 1) * state.perPage, state.page * state.perPage);

    lead.innerHTML = `${readOnly() ? readOnlyBanner() : ""}${state.notice ? `<div class="cab-notice">${message(state.notice.tone, state.notice.icon, state.notice.html, { role: "status", attrs: state.notice.attrs || "" })}</div>` : ""}`;
    const search = view.querySelector("[data-sm-search]");
    if (search.value !== state.query) search.value = state.query;
    search.closest(".search-input").classList.toggle("has-value", Boolean(state.query));
    search.closest(".search-input").classList.toggle("is-ready", Boolean(state.query));
    view.querySelector("[data-sm-search-clear]").disabled = !state.query;
    view.querySelector("[data-sm-sort-menu]").innerHTML = sortMenuHtml();
    syncSortTrigger(view);

    C.setBusy(results, view.querySelector("[data-sm-loading-status]"), loading && !state.searchFailed);
    const skeleton = results.querySelector(":scope > [data-cab-skeleton]");
    const rows = C.skeletonRows(pageItems.length);
    if (loading && !state.searchFailed && skeleton?.children.length === rows) {
      [...results.children].forEach((child) => { if (child !== skeleton) child.remove(); });
      skeleton.insertAdjacentHTML("afterend", pagerHtml(all.length));
    } else results.innerHTML = loading && !state.searchFailed
      ? `${C.listSkeletonHtml({ rows, kind: "requests" })}${pagerHtml(all.length)}`
      : state.searchFailed
      ? `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a putut fi actualizată. Încercați din nou.", "data-sm-search-retry")}</div>`
      : pageItems.length
        ? `<ul class="e-permits-fo-intent__list cab-act-list cab-request-list" aria-label="Lista solicitărilor">${pageItems.map(cardHtml).join("")}</ul>${pagerHtml(all.length)}`
        : `<div class="cab-state">${fixAssets(window.GEAPEmptyState.noResults("Nu au fost găsite rezultate pentru criteriile selectate.", { text: "Modificați căutarea sau filtrele aplicate." }))}</div>`;
    facetFilter?.render();
    if (loading && !state.searchFailed) C.maskResultCount(view.querySelector("[data-sm-filters]"));
  }
  /* every list change (search, filters, sort, page, page size) = the one simulated load; never over a profile */
  const listShown = () => root.querySelector("[data-sm-profile-view]")?.hidden !== false;
  const listLoader = C.listLoader({
    scope: () => root,
    show: () => { if (listShown()) renderList({ loading: true }); },
    draw: () => { if (listShown()) renderList(); },
  });
  /* the first load (no data yet): the list shell with the real toolbar (inert), the skeleton rows, no pager — or,
     on a request address (#dosar/<id>), the profile skeleton */
  function renderFirstLoad() {
    const view = ensureListShell();
    if (/^#dosar\//.test(window.location.hash)) {
      view.hidden = true;
      const profileView = root.querySelector("[data-sm-profile-view]");
      profileView.hidden = false;
      profileView.setAttribute("aria-busy", "true");
      profileView.innerHTML = `<article class="cab-profile sm-profile" aria-label="Solicitarea se încarcă">${C.profileSkeletonHtml({ trajectory: true })}</article>`;
      return;
    }
    const results = view.querySelector("[data-sm-results]");
    results.innerHTML = C.listSkeletonHtml({ kind: "requests" });
    C.setBusy(results, view.querySelector("[data-sm-loading-status]"), true);
    syncSortTrigger(view); /* the icon-only phone square needs its name („Sortează: …”) */
    facetFilter?.render();
    C.setToolbarLoading(view.querySelector("[data-sm-toolbar]"), true);
  }

  /* ---------- profile (US-161) ---------- */

  /* BO detail rows / card / section (CabEvo, css/bo-profile-parts.css) */
  const row = (label, valueHtml) => C.detailRow(label, valueHtml);
  const rows = (list) => C.detailCard(list);
  const section = (id, title, body, { scope = false } = {}) => C.profileSection(`sm-sec-${id}`, title, body, { attrs: scope ? "data-sm-dl-scope" : "" });

  /* ---------- „Stadiul solicitării” (request-trajectory-v1, 2026-10-21; user: „as we did for the other platforms, the
     horizontal one with short statuses”; was the vertical timeline in a bordered card, 2026-10-17) = the BO block:
       1. WHERE — the shared HORIZONTAL trajectory card (js/trajectory.js, the BO dossier's component;
          it draws itself vertically when the steps do not fit, i.e. on phones): short labels, the story-backed
          date · who under each step (trackerSteps);
       2. NOW / NEXT — the callout integrated in the card, as dos-01 (statusNow: a short medium line + one sentence,
          every status); the actions are in the header (headerActions).
     The status word itself is in the header (Stare) and the tracker — never a third time here (one fact once).
     The full story (who signed, MPower, MSign / MPay, the subdivision, the notes) = the „Istoric” section of
     Date generale (historyHtml, the vertical trajectory as on the act profile). */
  const STEP_STATE_TEXT = { done: "finalizat", current: "etapa curentă", attention: "necesită acțiunea dumneavoastră", rejected: "respins", skipped: "omis", todo: "urmează" };
  /* the BO trajectory's date („5 oct. 2026”) — narrow steps, the long dates stay in Istoric */
  const shortDate = (iso) => (isoDay(iso) ? new Date(`${isoDay(iso)}T12:00:00`).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" }) : "");

  /* the status notice (request-trajectory-v1, user: „some kind of notification that explains the status”, then „short
     notifications, as in Figma” — EVO Cabinet 518:11121 / 26:5220; then „exactly as in Dosarele mele, with the integrated
     alert”; cabinet-header-v1: „bring back the integrated notification exactly as in BO”): EVERY status gets ONE callout
     integrated in the trajectory card (the BO „Acum / Urmează” element) = a medium lead (the key fact + its date) +
     at most ONE short sentence, no button (the actions are in the header); formal „dumneavoastră” as the rest
     of the Cabinet; the live countdown of the row alert where there is a deadline. Tone (the callout tones of the
     component): amber / red when the applicant must act or can no longer act, green for an issued act / decision,
     blue for the rest. The long texts moved: the suspension reason → Date generale „Motivul suspendării”, the full
     story → „Istoric”. */
  const notice = (tone, iconId, lead, text = "", actions = "") => ({ tone, icon: iconId, lead, text, actions });
  const live = (dosar) => (deadlineOf(dosar) ? ` · <span data-sm-countdown="${escape(isoDay(deadlineOf(dosar)))}">${escape(countdownText(deadlineOf(dosar)))}</span>` : "");
  function statusNow(dosar) {
    const service = serviceOf(dosar);
    const where = escape([service.authority, dosar.subdivision].filter(Boolean).join(" — "));
    const date = (value) => escape(longDate(value));
    switch (dosar.status) {
      case "schita":
        /* US-18 AC-09: signed + paid but „Confirmă depunerea” not pressed → the BO submits it after the grace period */
        if (dosar.signed) return notice("info", "icon-circle-info-filled", "Cererea este semnată, dar nu a fost depusă", "Dacă nu confirmați depunerea, se transmite automat autorității după intervalul de grație.");
        /* US-21 AC-03: the retention sentence */
        return notice("info", "icon-circle-info-filled", "Solicitarea nu a fost depusă", escape(draftKeptText(dosar)));
      case "info":
        /* act-alert-card-v1: the action that solves it lives in the alert card (no longer in the header) */
        return notice("warning", "icon-warning-filled", `Trimiteți informațiile cerute până la ${date(dosar.info?.until)}`, `Examinarea este suspendată până atunci${live(dosar)}.`,
          dosar.info?.until >= TODAY ? `<a class="btn btn-primary btn-md btn-rounded" href="${escape(foUrl(dosar, "supplement"))}" data-sm-action="supplement">${icon("icon-page-upload")}<span>Completează informația</span></a>` : "");
      case "achitare":
        return paymentExpired(dosar)
          ? notice("danger", "icon-circle-error-filled", `Taxa a expirat pe ${date(dosar.payment?.due)}`, "Achitarea nu mai este posibilă.")
          : notice("warning", "icon-warning-filled", `Achitați ${escape(money(dosar.payment?.amount))} până la ${date(dosar.payment?.due)}`, `După achitare, examinarea continuă automat${live(dosar)}.`,
            `<button class="btn btn-primary btn-md btn-rounded" type="button" data-sm-action="pay" data-sm-id="${escape(dosar.id)}">${icon("icon-credit-card")}<span>Achită ${escape(money(dosar.payment?.amount))}</span></button>`);
      case "derulare": {
        if (dosar.tacit) return notice("info", "icon-circle-info-filled", `Termenul de examinare a expirat pe ${date(dosar.examTerm)}`, "Solicitarea se consideră aprobată tacit; puteți desfășura activitatea conform legii.");
        const lead = dosar.examTerm ? `Răspuns până la ${date(dosar.examTerm)}` : "Solicitarea este în examinare";
        /* US-24 AC-03: the suplinire term passed, the BO reactivated the examination · US-24 AC-20 / US-28 AC-04: sent */
        if (dosar.resumed?.kind === "expirat") return notice("info", "icon-time-filled", lead, "Termenul de suplinire a expirat; autoritatea examinează dosarul cu documentele depuse.");
        if (dosar.supplemented) return notice("info", "icon-time-filled", lead, `Informațiile transmise pe ${date(dosar.supplemented)} sunt în examinare; nu trebuie să faceți nimic acum.`);
        return notice("info", "icon-time-filled", lead, `Dosarul este la ${where}; nu trebuie să faceți nimic acum.`);
      }
      case "finalizat": {
        if (dosar.result === "respins") {
          const why = dosar.decision?.reason ? `Motivul refuzului: ${escape(dosar.decision.reason)}` : "Motivul refuzului este în fila Decizie.";
          return canAppeal(dosar)
            ? notice("danger", "icon-circle-error-filled", `Puteți depune contestație până la ${date(appealUntil(dosar))}`, `${why}${live(dosar)}`)
            : notice("danger", "icon-circle-error-filled", "Solicitarea a fost respinsă", why);
        }
        if (dosar.decisionOnly) return notice("success", "icon-circle-checkmark-filled", `Decizia a fost emisă pe ${date(dosar.finalized)}`, escape(dosar.decision?.text || "Starea actului a fost actualizată."));
        if (dosar.tacit) return notice("success", "icon-circle-checkmark-filled", `Aprobată tacit pe ${date(dosar.finalized)}`, "Autoritatea nu s-a pronunțat în termen; actul îl găsiți în „Actele mele permisive”.");
        return notice("success", "icon-circle-checkmark-filled", `Actul permisiv a fost emis pe ${date(dosar.finalized)}`, "Îl găsiți și în „Actele mele permisive”.");
      }
      default:
        return notice("info", "icon-circle-info-filled", escape(statusOf(dosar).label));
    }
  }

  /* the tracker (request-trajectory-v1): short labels, the steps adapt to the request —
       Schiță (drafts only, current) · Depusă / Inițiată (by the authority) · Plată (only for a fee issued during the
       examination: „Spre achitare” while it waits, warning) · Informații suplimentare (only when the authority asked:
       warning while it waits, done once sent, skipped when its term passed unanswered) · Examinare · Decizie →
       the outcome once decided (Aprobată / Aprobată tacit / Respinsă — the outcome tag, outcome-tag-v1) · Livrare
       (only for paper delivery, US-16). Plată / Informații sit before Examinare, in the order they happened: the
       examination continues after them. Sub-lines = the dos-01 two lines (date · who), ONLY what the stories give the
       citizen: Depusă = Data depunerii (US-161) + the applicant / representative · Plată = Achitată / Până la (the payment
       note, Feature 93592 / 94407) + MPay · Informații suplimentare = Suspendat (US-161) + Până la / Trimise / Expirat
       (Feature 90817, US-24) · Examinare = Termen (US-161, only when populated) or the decision date + the subdivision ·
       outcome = the decision / tacit date (US-161, US-157) + „Emisă de” (US-161 AC-27) · Schiță = Până la (removal,
       Feature 90817) · never an invented date under an upcoming step, never a specialist's name. */
  function trackerSteps(dosar) {
    const steps = [];
    const draft = dosar.status === "schita";
    const finished = dosar.status === "finalizat";
    const examining = dosar.status === "derulare";
    /* WHO at the level the citizen is entitled to: the subdivision that holds the file (never the specialist's name —
       only „Emisă de” is specified, US-161 AC-27; PO question 13), the applicant / representative on Depusă (the
       citizen's own data, US-161 AC-11) */
    const holder = dosar.subdivision || serviceOf(dosar).authority || "";
    const filer = dosar.filedBy ? `${dosar.filedBy.name} (reprezentant)` : state.perspective?.mpower ? `${state.user?.name} (reprezentant)` : state.user?.name || "";
    /* Feature 90817: the draft's removal deadline */
    if (draft) steps.push({ label: "Schiță", state: "current", meta: dosar.draft?.expires ? `Până la ${shortDate(dosar.draft.expires)}` : "" });
    /* US-161 Data depunerii · who filed it (or the authority, ex officio) */
    const byAuthority = dosar.initiatedBy === "autoritate";
    steps.push({ label: byAuthority ? "Inițiată" : "Depusă", state: draft ? "todo" : "done", meta: draft ? "" : [shortDate(dosar.submitted), byAuthority ? holder : filer] });
    const branches = [];
    const fee = dosar.payment && (dosar.feeDuringExam || dosar.status === "achitare");
    if (fee && !draft) {
      /* Feature 93592 / 94407: the payment note's due / paid date, paid through MPay */
      branches.push(dosar.status === "achitare"
        ? { at: dosar.payment.created, label: "Spre achitare", state: "attention", meta: [paymentExpired(dosar) ? `Expirată ${shortDate(dosar.payment.due)}` : dosar.payment.due ? `Până la ${shortDate(dosar.payment.due)}` : "", "MPay"] }
        : { at: dosar.payment.created, label: "Plată", state: "done", meta: [dosar.payment.paid ? `Achitată ${shortDate(dosar.payment.paid)}` : "", "MPay"] });
    }
    if (dosar.suspended && !draft) {
      /* US-161 Data suspendării + the suplinire period (Feature 90817) / the sent date (US-24) */
      const waiting = dosar.status === "info";
      const lapsed = !waiting && !dosar.supplemented && dosar.resumed?.kind === "expirat";
      branches.push({
        at: dosar.suspended,
        label: "Informații suplimentare",
        state: waiting ? "attention" : lapsed ? "skipped" : "done",
        sr: lapsed ? "netransmise, termenul a expirat" : undefined,
        meta: [`Suspendat ${shortDate(dosar.suspended)}`, waiting ? (dosar.info?.until ? `Până la ${shortDate(dosar.info.until)}` : "") : lapsed ? `Expirat ${shortDate(dosar.info?.until)}` : dosar.supplemented ? `Trimise ${shortDate(dosar.supplemented)}` : ""],
      });
    }
    branches.sort((a, b) => (isoDay(a.at) < isoDay(b.at) ? -1 : 1)).forEach(({ at, ...step }) => steps.push(step));
    /* US-161 Termenul de examinare (only when populated) while open, done = the decision date · the subdivision */
    const examDate = finished ? shortDate(dosar.finalized) : dosar.examTerm ? `${dosar.tacit ? "Termen expirat" : "Termen"} ${shortDate(dosar.examTerm)}` : "";
    steps.push({ label: "Examinare", state: finished ? "done" : examining ? "current" : "todo", meta: examDate || examining || finished ? [examDate, holder] : "" });
    /* the outcome: the decision / issue date (US-161, US-157 tacit) · „Emisă de” (US-161 AC-27) */
    const outcome = !finished ? "Decizie" : { respins: "Respinsă", tacit: "Aprobată tacit", aprobat: dosar.tacit ? "Aprobată tacit" : "Aprobată" }[dosar.result] || "Finalizată";
    const signer = dosar.issuedBy || dosar.decision?.signedBy || "";
    steps.push({ label: outcome, state: finished ? (dosar.result === "respins" ? "rejected" : "done") : "todo", sr: finished && dosar.result === "respins" ? "finalizat" : undefined, meta: finished ? [shortDate(dosar.finalized), signer ? `Emisă de ${signer}` : ""] : "" });
    /* US-16: paper delivery — no delivery date in the data, so no sub-line */
    const paper = dosar.delivery?.paper;
    if (paper && dosar.result !== "respins") steps.push({ label: "Livrare", state: finished ? "current" : "todo" });
    return steps;
  }


  /* the request's steps: what happened (dates, who) + what comes next (dashed, no date) */
  /* US-161 AC-16 / US-16: the delivery chosen at filing — EVO Cabinet always, paper on top when chosen */
  const PAPER = { mdelivery: "Pe hârtie prin MDelivery", ghiseu: "Pe hârtie la instituția emitentă" };
  function addressText(address = {}) {
    const street = [address.strada, address.numar].filter(Boolean).join(" ");
    return [street, address.bloc ? `bl. ${address.bloc}` : "", address.apartament, address.localitate, address.raion, address.codPostal].filter(Boolean).join(", ");
  }

  /* „Istoric” = the BO „Jurnal de evenimente” element itself (istoric-jurnal-v1; user: „exactly the same as the Jurnal
     de evenimente in BO”): GEAPEventTimeline (js/event-timeline.js), newest first, BO event shape { at, type, status,
     user, role, detail } — the stamp „8 iulie 2026, 14:00 · who · role”. What happened = „Reușit” (green check; a
     refusal too, as the BO logs every executed decision, but with the red error marker and no tag: the title says it);
     what is still open (examination, information or payment awaited, the draft) = pending (clock). Who = the applicant
     (the representative's name + „Reprezentant MPower”, US-161 AC-11) or the authority + subdivision, never a
     specialist (data minimisation, PO Q14). The future stays in the status tracker. */
  function historyEvents(dosar) {
    const mpower = Boolean(dosar.filedBy) || Boolean(state.perspective?.mpower);
    const applicant = { user: dosar.filedBy ? dosar.filedBy.name : state.user?.name || "", role: mpower ? "Reprezentant MPower" : "Solicitant" };
    const authority = { user: serviceOf(dosar).authority, role: dosar.subdivision };
    const done = (at, type, more) => ({ at, type, status: "Reușit", ...more });
    const open = (at, type, more) => ({ at, type, status: "În curs", ...more });
    const events = [];
    if (dosar.status === "schita") {
      events.push(done(dosar.created, "Schiță creată", { ...applicant, detail: "Salvată automat." }));
      if (dosar.signed) {
        events.push(done(dosar.signed, "Cerere semnată", { ...applicant, detail: "Semnată prin MSign." }));
        if (dosar.payment?.status === "Achitat") events.push(done(dosar.payment.paid, "Taxă achitată", { ...applicant, detail: `${money(dosar.payment.amount)} prin MPay.` }));
        events.push(open("", "Confirmarea depunerii", { detail: "Se transmite automat după intervalul de grație." }));
      } else {
        const step = dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant";
        events.push(open("", "Completarea cererii", { detail: pendingFee(dosar)
          ? `Pasul „${step}”. Nota de plată de ${money(dosar.payment.amount)} așteaptă achitarea până la ${longDate(dosar.draft?.expires)}.`
          : `Pasul „${step}”, de finalizat până la ${longDate(dosar.draft?.expires)}.` }));
      }
      return events.reverse();
    }
    const paidAtFiling = dosar.payment?.paid && !dosar.feeDuringExam ? ` Taxa de ${money(dosar.payment.amount)} a fost achitată prin MPay.` : "";
    /* act-profile-v1: a post-process started by the AUTHORITY (initiatedBy) — no applicant signed anything */
    const byAuthority = dosar.initiatedBy === "autoritate";
    events.push(byAuthority
      ? done(dosar.submitted, "Procedură inițiată de autoritate", { ...authority, detail: "Din oficiu." })
      : done(dosar.submitted, "Solicitare depusă", { ...applicant, detail: `Semnată prin MSign.${paidAtFiling}` }));
    const examining = dosar.status === "derulare";
    /* a suspension that is over (suplinire sent, or its term passed): its steps, then the resumed examination */
    const resumed = Boolean(dosar.suspended) && dosar.status !== "info";
    const term = dosar.examTerm ? `Termen de examinare: ${longDate(dosar.examTerm)}.` : "";
    events.push((examining && !resumed ? open : done)(addDays(dosar.submitted, 1), "În examinare la autoritate", { ...authority, detail: examining && !resumed ? term : "" }));
    if (resumed) {
      events.push(done(dosar.suspended, "Informații suplimentare solicitate", { ...authority, detail: dosar.info?.until ? `Examinarea a fost suspendată până la ${longDate(dosar.info.until)}.` : "Examinarea a fost suspendată." }));
      if (dosar.supplemented) events.push(done(dosar.supplemented, "Informații transmise", { ...applicant, detail: "Prin formularul de suplinire." }));
      else if (dosar.resumed?.kind === "expirat") events.push(done(dosar.info?.until, "Suspendare încheiată", { detail: "Termenul de suplinire a expirat; informațiile cerute nu au fost transmise." }));
      if (examining) events.push(open(dosar.supplemented || dosar.resumed?.at, "Examinare reluată", { ...authority, detail: term }));
    }
    if (dosar.status === "info") events.push(open(dosar.suspended, "Informații suplimentare solicitate", { ...authority, detail: `Examinarea este suspendată. Trimiteți-le până la ${longDate(dosar.info?.until)}.` }));
    if (dosar.status === "achitare") events.push(open(dosar.payment?.created, "Notă de plată emisă", { ...authority, detail: paymentExpired(dosar) ? `${money(dosar.payment?.amount)}. Termenul de achitare a expirat pe ${longDate(dosar.payment?.due)}.` : `${money(dosar.payment?.amount)} de achitat până la ${longDate(dosar.payment?.due)}.` }));
    if (dosar.status === "finalizat") {
      const rejected = dosar.result === "respins";
      events.push(done(dosar.finalized, rejected ? "Solicitare respinsă" : byAuthority ? "Decizie semnată" : "Solicitare aprobată", {
        ...authority,
        ...(rejected ? { tone: "danger", statusTag: false } : {}),
        detail: rejected ? "Decizia de refuz a fost semnată și comunicată." : dosar.decisionOnly ? "Decizia a fost semnată; starea actului a fost actualizată." : "Actul permisiv a fost semnat și emis.",
      }));
    }
    return events.reverse();
  }

  function historyHtml(dosar) {
    return window.GEAPEventTimeline?.html("Istoric", historyEvents(dosar), { titleId: "sm-sec-istoric", sectionAttrs: 'aria-labelledby="sm-sec-istoric"' }) || "";
  }

  /* The BO dossier's trajectory (cabinet-header-v1; user: „the header as in … Dosarele”): GEAPTrajectory.html({ steps }) —
     the renderer and markup of dos-01. No visible title (user, twice: „remove the Stadiul solicitării title”): the region
     keeps the name for screen readers. Since act-alert-card-v1 (2026-10-22, user: „do not use the integrated notice any
     more … the alert is a separate card”, then „directly under the profile header, above the timeline”) the status
     notice is NOT hung from the trajectory: it is the alert card (alertCardHtml) above it. */
  function statusCardHtml(dosar) {
    return `
      <section class="e-permits-dosar-profil__section cab-section cab-status" aria-label="Stadiul solicitării" data-sm-status>
        ${window.GEAPTrajectory?.html({
          label: "Etapele solicitării",
          steps: trackerSteps(dosar).map((step) => ({ ...step, sr: step.sr || STEP_STATE_TEXT[step.state] })),
        }) || ""}
      </section>`;
  }

  /* the status alert card (act-alert-card-v1) right under the header — ONE per request (statusNow = the highest-priority
     fact of the status): title = the key fact + its date, text = ≤ 1 sentence (+ the live countdown), the action that
     solves it (pay / send the information) = the primary INSIDE the card; GEAPAlertCard (js/alert-card.js).
     alert-timeline-tray-v1 (2026-10-23, EVO Cabinet Figma 1287:34973; replaces alert-timeline-fused-v1): ONE modifier
     `cab-alert-card--fused` — while the card sits directly above the trajectory (cabinet-evo.css › „Alert + trajectory
     tray”) the alert becomes the top of a grey tray holding the unchanged white trajectory card; drop the class to undo. */
  function alertCardHtml(dosar) {
    const now = statusNow(dosar);
    return window.GEAPAlertCard?.html({ tone: now.tone, icon: now.icon, title: now.lead, text: now.text, actions: now.actions, id: "sm-alert", className: "cab-alert-card cab-alert-card--fused", attrs: "data-sm-alert", sprite: C.SPRITE }) || "";
  }

  /* cabinet-header-v1 (user: „the header as in Configurări servicii and Dosarele, with the actions on top”, then „all
     actions should be in the header, as in BO”): EVERY action of the request is the header's action
     row (under the title since header-actions-below-v1, library Medium 40 / 48 on phones). The immediate one — continue the draft, send the information, pay, appeal a refusal — is
     THE primary; see the act is the primary of an approved request; the rest are neutral; removing a draft is red.
     The status notice in the trajectory card only explains. Never the same action twice. */
  /* a link that opens another page in a NEW tab (request-act-modal-link-v1: „Profilul actului”) — label + trailing external
     icon (no leading icon), name „<label> (se deschide într-o filă nouă)” (C.newTabAttrs) */
  const newTabLink = (variant, href, label, attrs = "") => `<a class="btn ${variant} btn-md" href="${escape(href)}"${C.newTabAttrs(label)} ${attrs}><span>${escape(label)}</span>${icon("icon-external-link")}</a>`;
  function headerActions(dosar) {
    const buttons = [];
    const download = (kind, label) => `<button class="btn btn-neutral btn-md" type="button" data-sm-action="download" data-sm-kind="${kind}" data-sm-id="${escape(dosar.id)}">${icon("icon-export")}<span>${escape(label)}</span></button>`;
    const appeal = (variant) => `<a class="btn ${variant} btn-md" href="${escape(foUrl(dosar, "appeal"))}" data-sm-action="appeal">${icon("icon-judge-gavel")}<span>Depune contestație</span></a>`;
    switch (dosar.status) {
      case "schita":
        buttons.push(`<a class="btn btn-primary btn-md" href="${escape(foUrl(dosar, "draft"))}" data-sm-action="continue">${icon("icon-edit")}<span>Continuă schița</span></a>`);
        buttons.push(`<button class="btn btn-outline-destructive btn-md" type="button" data-sm-action="delete" data-sm-id="${escape(dosar.id)}">${icon("icon-delete")}<span>Elimină schița</span></button>`);
        break;
      /* „Informații suplimentare” / „Spre achitare”: the action („Completează informația” / „Achită …”) is the primary of
         the alert card under the header (act-alert-card-v1), never twice. US-135 AC-14: an expired note has no button. */
      case "finalizat":
        if (dosar.result === "respins") {
          if (canAppeal(dosar)) buttons.push(appeal("btn-primary"));
          buttons.push(download("decizie", "Descarcă decizia"));
        } else if (dosar.actId) {
          /* request-act-modal-link-v1 (2026-10-23, user: „instead of Descarcă, an action to the act permisiv profile, always a
             new tab”, then „no act in the request profile — Vezi actul is misleading when the act was withdrawn since”): the
             request never shows the act itself; „Profilul actului ↗” = the act's address (?act=<id>) in a new tab, where
             the act's CURRENT status lives. header-max-two-v1: in order of importance — an open contestație (the immediate
             action, a negative decision only) is the primary, then Profilul actului, Descarcă decizia; max 2 visible + „⋯”. */
          const appealOpen = canAppeal(dosar);
          if (appealOpen) buttons.push(appeal("btn-primary"));
          buttons.push(newTabLink(appealOpen ? "btn-neutral" : "btn-primary", cabUrl("acte", { act: dosar.actId }), "Profilul actului", 'data-sm-action="act"'));
          if (dosar.decisionOnly) buttons.push(download("decizie", "Descarcă decizia"));
        }
        break;
      default:
        break;
    }
    /* profile-phone-v1 (2026-10-21): the secondaries give way first — what does not fit beside the primary goes into
       the trailing „⋯” (C.watchHeaderActions, the act header's priority+); never wraps to a second row */
    const secondaries = buttons.filter((html) => !html.includes("btn-primary"));
    if (!secondaries.length) return buttons.join("");
    return `${buttons.map((html) => (html.includes("btn-primary") ? html : html.replace(/^<(a|button) /, "<$1 data-cab-header-item "))).join("")}
        <div class="e-permits-fo-intent-act__action cab-act-header__overflow" hidden>
          <button class="btn btn-neutral btn-md btn-icon-only" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="sm-header-more" aria-label="Mai multe acțiuni" data-cab-menu-trigger>${icon("icon-more-horizontal")}</button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="sm-header-more" role="menu" aria-label="Mai multe acțiuni" hidden></ul>
        </div>`;
  }



  /* BO page-header meta: nr (copy) · tip · statut (+ marks) · the dates of the status */
  function headerMeta(dosar) {
    const meta = [
      ["Numărul dosarului", copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`)],
      ["Tipul solicitării", escape(dosar.tip)],
      ["Stare", `${statusTag(dosar)}${marksHtml(dosar)}`],
    ];
    if (dosar.status === "schita") {
      meta.push(["Creată", escape(longDate(dosar.created))], ["Se elimină automat", escape(longDate(dosar.draft?.expires))]);
    } else {
      meta.push(["Data depunerii", escape(longDate(dosar.submitted))]);
      if (dosar.status === "finalizat") meta.push(["Data finalizării", escape(longDate(dosar.finalized))]);
      else if (dosar.status === "info") meta.push(["Suspendat din", escape(longDate(dosar.suspended))]);
      /* US-161 AC-06: the term stays visible in „Informații suplimentare” too */
      if (dosar.status !== "finalizat" && dosar.examTerm) meta.push(["Termen de examinare", escape(longDate(dosar.examTerm))]);
    }
    return meta;
  }

  const personHtml = (person) => C.identityCardHtml(person);

  function roleGroup(title, person, { me = false } = {}) {
    return `
      <div class="e-permits-fo-form__role-group">
        <div class="e-permits-fo-form__role-title">
          <h2>${escape(title)}</h2>
          ${me ? `<span class="status-tag status-tag--neutral is-strong status-tag--small">Eu</span>` : ""}
        </div>
        ${personHtml(person)}
      </div>`;
  }

  /* MPower authorization (FO authorizationCardHtml markup, read-only values) */
  function authorizationHtml(subject) {
    const auth = subject?.authorization;
    if (!auth) return "";
    const items = [["Acordată de", auth.grantedBy], ["Valabilă până la", longDate(auth.validUntil)], ["Cod", auth.code]].filter(([, value]) => value);
    return `
      <div class="e-permits-fo-authorization-card">
        <span class="e-permits-fo-authorization-card__icon" aria-hidden="true">${icon("icon-identity", "medium")}</span>
        <span class="e-permits-fo-authorization-card__copy">
          <span class="e-permits-fo-authorization-card__title"><strong>${escape(auth.title || "Împuternicire MPower aplicată")}</strong>${auth.status ? `<span${/^(Expirat|Revocat)/.test(auth.status) ? ' class="is-expired"' : ""}>${escape(auth.status)}</span>` : ""}</span>
          <span class="e-permits-fo-authorization-card__meta">
            ${items.map(([label, value], index) => `${index ? '<span class="e-permits-fo-authorization-card__dot" aria-hidden="true"></span>' : ""}<span class="e-permits-fo-authorization-card__meta-item"><span>${escape(label)}</span>${label === "Cod" ? copyValue(value, `Copiază codul ${value}`, "e-permits-fo-authorization-card__copy-code") : `<strong>${escape(value)}</strong>`}</span>`).join("")}
          </span>
        </span>
      </div>`;
  }

  /* Documente însoțitoare = the shared document cards (C.docRowHtml): the system certificate (generated)
     + what the applicant attached, each with „Detalii” → the document modal (its footer has „Descarcă”) */
  const DOC_TYPE_GUESS = [[/locat|contract/i, "Contract de locațiune"], [/plan/i, "Planul încăperilor"], [/proprietate/i, "Actul de proprietate"], [/identitate|buletin/i, "Copia actului de identitate"], [/extras/i, "Extras din registru"]];
  function dosarDocs(dosar) {
    const files = dosar.documents || (dosar.status === "schita" ? [] : [
      { name: "Contract-locatiune.pdf", size: "1,2 MB", tip: "Contract de locațiune" },
      { name: "Planul-incaperilor.pdf", size: "3,4 MB", tip: "Planul încăperilor" },
    ]);
    const docs = [];
    /* US-161 AC-14: the system certificate, once the request was filed */
    if (dosar.status !== "schita") {
      /* US-307 AC-02/04: the request's PDF (MDocs standard template) on every filed request, never on a draft */
      docs.push({ id: "cerere", sursa: "generat", tip: "Cererea depusă", nr: dosar.nr, fisier: `cerere-${String(dosar.nr).toLowerCase()}.pdf`, size: "312 KB", verb: "Generat", at: longDateTime(dosar.submitted), de: "SIA GEAP", kind: "cerere" });
      docs.push({ id: "certificat", sursa: "generat", tip: "Certificat constatator", nr: dosar.nr, fisier: `certificat-constatator-${String(dosar.nr).toLowerCase()}.pdf`, size: "96 KB", verb: "Generat", at: longDateTime(dosar.submitted), de: "SIA GEAP", semnat: true, kind: "certificat" });
    }
    files.forEach((file, index) => docs.push({
      id: `f${index + 1}`, sursa: file.sursa || "upload", tip: file.tip || (DOC_TYPE_GUESS.find(([re]) => re.test(file.name)) || [null, "Document însoțitor"])[1],
      fisier: file.name, size: file.size, verb: "Încărcat", at: dosar.submitted ? longDateTime(dosar.submitted) : longDateTime(dosar.created),
      de: state.user?.name || "", kind: "fisier",
    }));
    return docs;
  }
  function documentsHtml(dosar) {
    const docs = dosarDocs(dosar);
    if (!docs.length) {
      return fixAssets(window.GEAPEmptyState.render({ title: "Nu au fost încărcate documente", text: "Le puteți adăuga după ce continuați schița.", icon: "document", compact: true }));
    }
    return `<div class="cab-docs">${docs.map((doc) => C.docRowHtml(doc, { key: `${dosar.id}|${doc.id}` })).join("")}</div>`;
  }
  /* machete-mdocs-v1 (2026-10-25, Feature 96074): the request's MDocs documents on the standard template
     (GEAPDocPreview.mdocsHtml) — cerere (US-307), certificat constatator (US-311), decizie de refuz / de suspendare (US-309) */
  const decisionType = (dosar) => (dosar.status !== "finalizat" ? "" : dosar.result === "respins" ? "decizie-refuz" : dosar.pp === "suspendare" ? "decizie-suspendare" : "");
  function dosarMdocSpec(dosar, kind) {
    const service = serviceOf(dosar);
    const subject = state.subject || {};
    const holder = [["Solicitant", subject.name], [subject.idLabel || "Cod de identificare", subject.idValue]];
    const base = {
      authority: service.authorityName || service.authority || "",
      office: dosar.subdivision || "",
      request: { number: dosar.nr, date: dosar.submitted, type: dosar.tip, service: service.title || "" }
    };
    if (kind === "cerere") {
      return {
        ...base, type: "cerere", number: dosar.nr, date: dosar.submitted,
        groups: [
          { title: "Solicitantul", rows: [...holder, ...(dosar.filedBy?.name ? [["Depusă de", `${dosar.filedBy.name} · reprezentant MPower`]] : [])] },
          { title: "Serviciul solicitat", rows: [["Serviciul", service.title], ["Tipul solicitării", dosar.tip], ["Subdiviziunea de examinare", dosar.subdivision]] },
          { title: "Obiectul activității", rows: [["Obiectul", dosar.object], ["Adresa", dosar.address]] },
          { title: "Acte anexate", rows: dosarDocs(dosar).filter((doc) => doc.kind === "fisier").map((doc, index) => [`${index + 1}.`, doc.tip]) }
        ]
      };
    }
    if (kind === "certificat") {
      return {
        ...base, type: "certificat", number: dosar.nr, date: dosar.submitted,
        groups: [{ rows: [["Serviciul", service.title], ["Tipul solicitării", dosar.tip], ...holder, ["Obiectul", dosar.object], ["Data și ora depunerii", longDateTime(dosar.submitted)], ["Canal de depunere", "EVO · Solicitările mele"], ["Subdiviziunea de examinare", dosar.subdivision]] }]
      };
    }
    const type = decisionType(dosar);
    if (!type) return null;
    const decision = dosar.decision || {};
    return {
      ...base, type, number: dosar.nr, date: dosar.finalized,
      groups: [{ rows: [
        ...holder,
        ["Obiectul", dosar.object],
        type === "decizie-refuz" ? ["Motivele refuzului", decision.reason] : ["Conținutul deciziei", decision.text],
        ["Temeiul legal", decision.legal || "Legea nr. 160/2011 privind reglementarea prin autorizare a activității de întreprinzător"],
        ...(decision.recommendations ? [["Recomandări", decision.recommendations]] : []),
        ...(type === "decizie-refuz" ? [["Dreptul de contestare", `Decizia poate fi contestată în termen de ${state.data.appealDays || 30} de zile de la comunicare.`]] : [])
      ] }]
    };
  }
  function openDecisionDoc(dosar) {
    const spec = dosarMdocSpec(dosar, "decizie");
    if (!spec) return;
    const tip = window.GEAPDocPreview?.MDOCS_TYPES?.[spec.type] || "Decizie";
    const doc = { tip, fisier: `${spec.type}-${String(dosar.nr).toLowerCase()}.pdf` };
    C.openDocModal({
      title: "Document generat",
      subtitle: tip,
      doc,
      mdocSpec: spec,
      rowsHtml: rows([row("Tip document", escape(tip)), row("Numărul deciziei", escape(dosar.decision?.nr || "—")), row("Data emiterii", escape(longDate(dosar.finalized))), row("Fișier", escape(doc.fisier))]),
      downloadAttrs: `data-cab-doc-download="${escape(dosar.id)}|decizie"`,
      generated: true,
      /* the decision itself was signed (MSign) — the PDF carries no signature (AC-10); the tray names the signature */
      signature: dosar.decision?.signedBy ? window.GEAPDocPreview?.signatureHtml({ by: dosar.decision.signedBy, at: longDate(dosar.finalized), sprite: C.SPRITE }) || "" : "",
    });
  }

  /* the document modal: a demo A4 page + the details */
  function openDosarDoc(key) {
    const [dosarId, docId] = key.split("|");
    const dosar = state.dosare.find((item) => item.id === dosarId);
    const doc = dosar && dosarDocs(dosar).find((item) => item.id === docId);
    if (!doc) return;
    const service = serviceOf(dosar);
    const holder = state.subject ? `${state.subject.name} · ${state.subject.idLabel} ${state.subject.idValue}` : "";
    const table = (pairs) => `<table><tbody>${pairs.filter(([, value]) => value).map(([label, value]) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`).join("")}</tbody></table>`;
    const pageHtml = doc.kind === "certificat"
      ? `<h1>Certificat constatator</h1><p>Confirmă depunerea cererii în SIA GEAP.</p>${table([["Numărul dosarului", dosar.nr], ["Serviciul", service.title || ""], ["Solicitant", holder], ["Data depunerii", longDateTime(dosar.submitted)]])}<p>Semnat electronic · SIA GEAP · ${escape(longDate(dosar.submitted))}</p>`
      : `<h1>${escape(doc.tip)}</h1><p>Anexă la cererea ${escape(dosar.nr)} · ${escape(service.title || "")}</p>${table([["Obiectul", dosar.object || ""], ["Adresa", dosar.address || ""], ["Solicitant", holder]])}`;
    C.openDocModal({
      title: doc.kind === "fisier" ? "Document însoțitor" : "Document generat",
      subtitle: doc.tip,
      doc,
      pageHtml,
      mdocSpec: doc.kind === "fisier" ? null : dosarMdocSpec(dosar, doc.kind),
      rowsHtml: rows([
        row("Tip document", escape(doc.tip)),
        doc.nr ? row("Numărul dosarului", escape(doc.nr)) : "",
        row("Fișier", escape(doc.fisier)),
        row("Dimensiune", escape(doc.size)),
        row(`${doc.verb} la`, escape(doc.at)),
        doc.de ? row(`${doc.verb} de`, escape(doc.de)) : "",
        row("Semnătură", doc.semnat ? `${C.signedTagHtml()} ${escape(`MSign · ${doc.de} · ${doc.at}`)}` : "Fără semnătură electronică"),
      ]),
      downloadAttrs: `data-cab-doc-download="${escape(key)}"`,
      /* doc-viewer-v2 (GEAP 2.0 11366:6892): every document = preview + signature card only (uploads too) */
      generated: true,
      signature: doc.semnat ? window.GEAPDocPreview?.signatureHtml({ by: doc.de, at: doc.at, sprite: C.SPRITE }) || "" : "",
    });
  }

  function actSection(dosar) {
    if (dosar.status !== "finalizat") return "";
    const service = serviceOf(dosar);
    const beneficiary = state.subject ? `${state.subject.name} · ${state.subject.idLabel} ${state.subject.idValue}` : "";
    const downloadButton = (kind, label) => `<div class="cab-detail__actions"><button class="btn btn-neutral btn-md btn-rounded" type="button" data-sm-action="download" data-sm-kind="${kind}" data-sm-id="${escape(dosar.id)}">${icon("icon-export")}<span>${escape(label)}</span></button></div>`;
    /* US-161 AC-31…35: a refusal shows the Decizie instead of the Act */
    if (dosar.result === "respins" || dosar.decisionOnly) {
      const decision = dosar.decision || {};
      return section("act", "Decizie", `
        ${rows([
          row("Numărul deciziei", escape(decision.nr || "—")),
          dosar.result === "respins" ? row("Motivul refuzului", escape(decision.reason || "—")) : row("Conținutul deciziei", escape(decision.text || "—")),
          decision.legal ? row("Temei legal", escape(decision.legal)) : "",
          decision.recommendations ? row("Recomandări pentru îmbunătățire", escape(decision.recommendations)) : "",
          row("Data emiterii", escape(longDate(dosar.finalized))),
          decision.signedBy ? row("Emisă de", escape(decision.signedBy)) : "",
          row("Subdiviziunea de examinare", escape(dosar.subdivision)),
        ])}
        ${downloadButton("decizie", "Descarcă decizia (MDocs)")}`, { scope: true });
    }
    /* a duplicate keeps the original act's validity (validFrom) */
    const validFrom = dosar.validFrom || dosar.finalized;
    const until = service.validityYears ? addDays(validFrom, Math.round(service.validityYears * 365.25)) : "";
    /* AC-29: the act's service-specific fields (as configured per service — the same groups the act profile shows) */
    const act = state.acts.find((item) => item.id === dosar.actId);
    const specific = act ? C.actGroups({ ...act, title: act.name }) : [];
    return section("act", "Act permisiv", `
      ${rows([
        row("Titlul actului", escape(service.actTitle || service.title || "")),
        row("Numărul actului", copyValue(dosar.actNr, `Copiază numărul actului ${dosar.actNr}`)),
        dosar.pp === "duplicat" && dosar.prevActNr ? row("Exemplar", escape(`Duplicat al actului ${dosar.prevActNr}`)) : "",
        row("Nr. dosar", escape(dosar.nr)),
        beneficiary ? row("Beneficiar", escape(beneficiary)) : "",
        row("Valabil din", escape(longDate(validFrom))),
        until ? row("Valabil până la", escape(longDate(until))) : "",
        row("Data emiterii", escape(longDate(dosar.finalized))),
        dosar.issuedBy ? row("Emisă de", escape(dosar.issuedBy)) : "",
        row("Subdiviziunea de examinare", escape(dosar.subdivision)),
      ])}
      ${downloadButton("act", "Descarcă actul (MDocs)")}`, { scope: true })
      + window.GEAPActView.fieldsHtml(specific, { untitled: "Date specifice actului", section: (title, body, index) => section(`act-specific-${index}`, title, body) });
  }

  /* US-161 (AC-03, AC-04, AC-18, AC-22, AC-31, AC-36): the profile's sections as tabs under „Stadiul solicitării”
     — Date generale (default) · Date solicitare (always) · Taxe (only with a payment note) · Act / Decizie (only
     once finished). The BO page-header tab strip (.tabs.e-permits-page-header__tabs: 40 high, 14/20, brand 2px
     underline, track line) — switching shows another panel in place (no reload) and keeps #dosar/<id>/<tab>. */
  const PROFILE_TABS = [
    { id: "general", label: "Date generale" },
    { id: "solicitare", label: "Date solicitare" },
    { id: "taxe", label: "Taxe" },
    { id: "act", label: "Act" },
  ];
  function profileTabsOf(dosar, panels) {
    return PROFILE_TABS.filter((tab) => panels[tab.id])
      .map((tab) => (tab.id === "act" && (dosar.result === "respins" || dosar.decisionOnly) ? { ...tab, label: "Decizie" } : tab));
  }
  function profileTabsHtml(dosar, panels) {
    const tabs = profileTabsOf(dosar, panels);
    if (!tabs.some((tab) => tab.id === state.tab)) state.tab = "general";
    return `
      <div class="cab-profile-tabs" data-sm-tabs>
        <div class="tabs e-permits-page-header__tabs">
          <div class="tab-buttons" role="tablist" aria-label="Secțiunile dosarului">
            ${tabs.map((tab) => {
              const on = tab.id === state.tab;
              return `<button class="tab-button${on ? " active" : ""}" type="button" role="tab" id="sm-tab-${tab.id}" aria-selected="${on}" aria-controls="sm-panel-${tab.id}" tabindex="${on ? 0 : -1}" data-sm-tab="${tab.id}">${escape(tab.label)}</button>`;
            }).join("")}
          </div>
        </div>
        ${tabs.map((tab) => `<div class="cab-profile-tabs__panel" role="tabpanel" id="sm-panel-${tab.id}" aria-labelledby="sm-tab-${tab.id}" data-sm-panel="${tab.id}"${tab.id === state.tab ? "" : " hidden"}>${panels[tab.id]}</div>`).join("")}
      </div>`;
  }
  function selectTab(id, { focus = false } = {}) {
    const box = root.querySelector("[data-sm-tabs]");
    if (!box || !box.querySelector(`[data-sm-tab="${id}"]`)) return;
    state.tab = id;
    box.querySelectorAll("[data-sm-tab]").forEach((button) => {
      const on = button.dataset.smTab === id;
      button.classList.toggle("active", on);
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    box.querySelectorAll("[data-sm-panel]").forEach((panel) => { panel.hidden = panel.dataset.smPanel !== id; });
    const dosarId = root.querySelector("[data-sm-profile]")?.dataset.smProfile;
    if (dosarId) history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}#dosar/${dosarId}${id === "general" ? "" : `/${id}`}`);
  }

  function renderProfile(dosar) {
    const service = serviceOf(dosar);
    C.setHeaderTitle("Solicitările mele");
    /* the tab names the request (act-profile-url-v1): the H1 + its object, as the row */
    document.title = `${[service.title || dosar.object || dosar.nr, service.title ? dosar.object : ""].filter(Boolean).join(" — ")} · EVO Cabinet`;
    const subject = state.subject;
    const user = state.user;
    const beneficiary = subject ? { ...subject } : null;
    const applicant = user ? { ...user } : null;
    const sameperson = beneficiary && applicant && beneficiary.idValue === applicant.idValue;
    const help = state.data.help[service.authority] || {};
    const payment = dosar.payment;
    const contact = subject?.contact || user?.contact || {};

    const general = section("general", "Date generale", rows([
      row("Numărul dosarului", copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`)),
      row("Tipul dosarului", escape(dosar.tip)),
      row("Denumirea serviciului", escape(service.title || "")),
      dosar.submitted ? row("Data depunerii", escape(longDateTime(dosar.submitted))) : "",
      dosar.suspended ? row("Data suspendării", escape(longDate(dosar.suspended))) : "",
      /* request-trajectory-v1: the reason moved out of the status notice (one short notice) — here while it applies
         (US-126 category + the authority's text; PO question 8) */
      dosar.status === "info" && dosar.info?.reason ? row("Motivul suspendării", escape([dosar.info.category, dosar.info.reason].filter(Boolean).join(" — "))) : "",
      dosar.examTerm ? row("Termenul de examinare", `<span>${escape(longDate(dosar.examTerm))}</span>${dosar.tacit ? marksHtml(dosar) : ""}`) : "",
      row("Statutul dosarului", `${statusTag(dosar)}${dosar.result ? marksHtml(dosar) : ""}`),
      row("Autoritatea", escape(service.authorityName || service.authority || "")),
      row("Subdiviziunea de procesare", escape(dosar.subdivision)),
      dosar.actNr ? row("Nr. actului generat", copyValue(dosar.actNr, `Copiază numărul actului ${dosar.actNr}`)) : "",
      dosar.prevActNr ? row("Nr. actului anterior", escape(dosar.prevActNr)) : "",
    ]));

    /* US-161 AC-11 / US-19 AC-17: a request filed by a representative shows him apart from the holder (with the
       MPower basis, even expired since) — the holder keeps the live status and every action */
    const roles = dosar.filedBy && beneficiary ? `
      <section class="e-permits-dosar-profil__section cab-section" aria-label="Beneficiar și reprezentant" data-sm-filed-by>
        <div class="e-permits-fo-form__roles cab-roles">
          <div class="e-permits-fo-form__roles-grid">
            ${roleGroup("Beneficiar", beneficiary)}${roleGroup("Depusă de reprezentant", dosar.filedBy)}
          </div>
          ${authorizationHtml(dosar.filedBy)}
        </div>
      </section>` : beneficiary && applicant ? `
      <section class="e-permits-dosar-profil__section cab-section" aria-label="Beneficiar și solicitant">
        <div class="e-permits-fo-form__roles cab-roles${sameperson ? " is-single" : ""}">
          <div class="e-permits-fo-form__roles-grid">
            ${sameperson ? roleGroup("Solicitant", applicant, { me: true }) : `${roleGroup("Beneficiar", beneficiary)}${roleGroup("Solicitant", applicant, { me: true })}`}
          </div>
          ${state.perspective?.mpower ? authorizationHtml(subject) : ""}
        </div>
      </section>` : "";

    const details = section("detalii", "Date solicitare", rows([
      dosar.object ? row("Denumirea obiectului", escape(dosar.object)) : "",
      dosar.address ? row("Adresa unității", escape(dosar.address)) : "",
      dosar.caem ? row("Activitatea (CAEM)", escape(dosar.caem)) : "",
      dosar.pp && dosar.prevActNr ? row("Actul permisiv vizat", escape(dosar.prevActNr)) : "",
    ]));

    const contacts = section("contacte", "Contacte", rows([
      dosar.address ? row("Adresa", escape(dosar.address)) : "",
      contact.email ? row("Email", escape(contact.email)) : "",
      contact.phone ? row("Telefon", escape(`+373 ${contact.phone}`)) : "",
    ]));

    const documents = section("documente", "Acte necesare", documentsHtml(dosar), { scope: true });
    /* US-161 AC-16: the method(s) chosen at filing (EVO Cabinet always; paper on top when chosen, US-16) */
    const paper = PAPER[dosar.delivery?.paper];
    const delivery = section("livrare", "Livrare", rows([
      row("Metoda de livrare", paper ? `Livrare electronică (EVO Cabinet)<br>${escape(paper)}` : "Livrare electronică (EVO Cabinet)"),
      dosar.delivery?.paper === "mdelivery" ? row("Adresa de livrare", escape(addressText(dosar.delivery.address))) : "",
      dosar.delivery?.paper === "ghiseu" ? row("Locul ridicării", escape(`${dosar.subdivision} (${serviceOf(dosar).authority})`)) : "",
    ]), { scope: false });

    /* US-161 AC-18…20: only when a payment note exists; Data achitării only when paid */
    const taxes = payment ? section("taxe", "Taxe", rows([
      row("Numărul notei de plată", copyValue(payment.nr, `Copiază numărul notei de plată ${payment.nr}`)),
      row("Numărul dosarului", escape(dosar.nr)),
      row("Statutul notei", C.tagHtml(payment.status, payment.status === "Achitat" ? "success" : payment.status === "Expirat" || payment.status === "Anulat" ? "danger" : "warning")),
      row("Suma totală", escape(money(payment.amount))),
      row("Data creării", escape(longDateTime(payment.created))),
      payment.status === "Achitat" && payment.paid ? row("Data achitării", escape(longDateTime(payment.paid))) : "",
      payment.due && payment.status !== "Achitat" ? row("Termen de achitare", escape(longDate(payment.due))) : "",
    ])) : "";

    /* US-161 AC-15: the „Taxe” subsection of Date solicitare — only when the service charges a fee when the
       request is filed (not for fees issued later, during the examination) */
    const initialFee = service.fee > 0 && payment && !dosar.feeDuringExam ? section("taxe-depunere", "Taxe", rows([
      row("Denumire", escape(`Taxa pentru ${service.actTitle ? service.actTitle.charAt(0).toLowerCase() + service.actTitle.slice(1) : "serviciu"}`)),
      row("Sumă", escape(money(payment.amount))),
      row("Statut", C.tagHtml(payment.status, payment.status === "Achitat" ? "success" : payment.status === "Expirat" || payment.status === "Anulat" ? "danger" : "warning")),
      payment.status === "Achitat" && payment.paid ? row("Data achitării", escape(longDateTime(payment.paid))) : "",
    ])) : "";

    const helpSection = section("ajutor", "Ai nevoie de ajutor?", rows([
      row("Autoritatea", escape(help.name || service.authorityName || "")),
      help.phone ? row("Telefon", `<a class="e-permits-dosar-profil__link" href="tel:${escape(help.phone.replace(/\s/g, ""))}">${escape(help.phone)}</a>`) : "",
      help.email ? row("E-mail", `<a class="e-permits-dosar-profil__link" href="mailto:${escape(help.email)}">${escape(help.email)}</a>`) : "",
    ]));

    ensureListShell().hidden = true;
    const profileView = root.querySelector("[data-sm-profile-view]");
    profileView.hidden = false;
    profileView.innerHTML = `
      <article class="cab-profile sm-profile" aria-labelledby="sm-profile-title" data-sm-profile="${escape(dosar.id)}">
        ${C.profileHeader({
          back: { label: "Solicitările mele", href: C.pageAddress({}, ""), attr: "data-sm-back" },
          /* type-first-v1: H1 = the service / act name, subtitle = the object / location (only when present) */
          title: service.title || dosar.object || dosar.nr,
          titleId: "sm-profile-title",
          subtitle: service.title ? dosar.object || "" : "",
          subtitleIcon: service.title && dosar.object ? "icon-map-pin-filled" : "",
          meta: headerMeta(dosar),
          actions: headerActions(dosar),
        })}
        <div class="e-permits-dosar-profil__panel">
          ${alertCardHtml(dosar)}
          ${statusCardHtml(dosar)}
          ${profileTabsHtml(dosar, {
            general: `${general}${historyHtml(dosar)}`,
            solicitare: `${roles}${details}${contacts}${documents}${delivery}${initialFee}`,
            taxe: taxes,
            act: actSection(dosar),
          })}
          ${helpSection}
        </div>
      </article>`;
    C.syncHeaderMeta();
    C.watchHeaderActions();
    root.querySelector("#sm-profile-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);

  }

  /* ---------- routing ---------- */

  function route(event) {
    window.GEAPTooltip?.hide();
    const match = /^#dosar\/([\w-]+)(?:\/(\w+))?$/.exec(window.location.hash);
    /* US-29 AC-02: a draft removed automatically has no profile any more — the list says why (link from the notification) */
    const removed = match && state.removed.find((item) => item.id === match[1]);
    if (!removed && state.notice?.attrs === "data-sm-removed-notice") state.notice = null;
    if (removed) {
      state.notice = { tone: "banner--info", icon: "icon-circle-info-filled", html: `Schița <strong>${escape(removed.object)}</strong> (${escape(removed.nr)}) a fost eliminată automat pe ${escape(longDate(removed.draft?.expires))}, la expirarea termenului de păstrare. Datele nu mai pot fi recuperate; puteți începe o solicitare nouă din <a class="link link-primary link-sm" href="${escape(cabUrl("catalog"))}">Catalogul serviciilor</a>.`, attrs: "data-sm-removed-notice" };
    }
    const dosar = match && !readOnly() && state.dosare.find((item) => item.id === match[1]);
    state.tab = match?.[2] || "general";
    if (dosar) renderProfile(dosar);
    /* act-profile-url-v1: an address that matches no request = the not-found state (breadcrumb back to the list) */
    else if (match && !removed && !readOnly()) renderNotFound();
    else {
      const fromProfile = !root.querySelector("[data-sm-profile-view]")?.hidden;
      renderList();
      /* Back to the list the request was opened from: where it was (search / filters / sort / page are page state) */
      if (fromProfile && event?.type) window.scrollTo(0, window.history.state?.smList?.scrollY || 0);
    }
  }

  const REQUEST_NOT_FOUND = "Solicitarea nu a fost găsită";
  function renderNotFound() {
    C.setHeaderTitle("Solicitările mele");
    document.title = `${REQUEST_NOT_FOUND} · EVO Cabinet`;
    ensureListShell().hidden = true;
    const profileView = root.querySelector("[data-sm-profile-view]");
    profileView.hidden = false;
    profileView.innerHTML = `
      <article class="cab-profile sm-profile" aria-label="${REQUEST_NOT_FOUND}">
        ${C.notFoundHtml({
          back: { label: "Solicitările mele", href: C.pageAddress({}, ""), attr: "data-sm-back" },
          title: REQUEST_NOT_FOUND,
          text: "Linkul nu mai este valabil sau solicitarea nu figurează printre solicitările dvs.",
        })}
      </article>`;
    window.scrollTo(0, 0);
  }

  /* ---------- modals ---------- */

  let modalOpener = null;
  /* the FO confirm modal (.e-permits-fo-instance-switch-modal) — same as the acts
     page's post-process confirmation */
  function openConfirm({ iconId, title, paragraphs, cancelLabel = "Anulează", confirmLabel, danger = false, onConfirm, onCancel }) {
    let modal = document.querySelector("[data-sm-confirm]");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "e-permits-fo-instance-switch-modal";
      modal.dataset.smConfirm = "";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "sm-confirm-title");
      document.body.appendChild(modal);
    }
    modalOpener = document.activeElement;
    modal.innerHTML = `
      <div class="e-permits-fo-instance-switch-modal__card" tabindex="-1">
        <div class="e-permits-fo-instance-switch-modal__body">
          <div class="e-permits-fo-instance-switch-modal__icon${danger ? " e-permits-fo-instance-switch-modal__icon--danger" : ""}" aria-hidden="true">${icon(iconId, "medium")}</div>
          <div class="e-permits-fo-instance-switch-modal__content">
            <h2 id="sm-confirm-title">${escape(title)}</h2>
            <div class="e-permits-fo-instance-switch-modal__description">${paragraphs.map((text) => `<p>${text}</p>`).join("")}</div>
          </div>
        </div>
        <div class="modal-buttons e-permits-fo-instance-switch-modal__actions">
          <button class="btn btn-neutral e-permits-fo-instance-switch-modal__secondary" type="button" data-sm-confirm-cancel>${escape(cancelLabel)}</button>
          <button class="btn ${danger ? "btn-destructive" : "btn-primary"} e-permits-fo-instance-switch-modal__primary${danger ? " e-permits-fo-instance-switch-modal__primary--danger" : ""}" type="button" data-sm-confirm-ok>${escape(confirmLabel)}</button>
        </div>
      </div>`;
    modal.hidden = false;
    modal.onclick = (event) => {
      /* onConfirm returning false keeps the dialog open (an error shown in it, US-29 AC-01) */
      if (event.target.closest("[data-sm-confirm-ok]")) { if (onConfirm?.(modal) === false) return; closeConfirm(); }
      else if (event.target.closest("[data-sm-confirm-cancel]") || event.target === modal) { closeConfirm(); onCancel?.(); }
    };
    modal.querySelector("[data-sm-confirm-cancel]")?.focus();
  }

  function closeConfirm() {
    const modal = document.querySelector("[data-sm-confirm]");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (modalOpener?.isConnected) modalOpener.focus();
  }

  /* US-29 AC-01 demo (?eliminare=eroare): the first removal fails — the message + „Reîncercați” in the dialog */
  const deleteFailed = new Set();
  function confirmError(modal, text, retryLabel) {
    modal.querySelector("[data-sm-confirm-error]")?.remove();
    modal.querySelector(".e-permits-fo-instance-switch-modal__content").insertAdjacentHTML("beforeend", message("banner--error", "icon-circle-error-filled", escape(text), { role: "alert", attrs: "data-sm-confirm-error" }));
    const ok = modal.querySelector("[data-sm-confirm-ok]");
    ok.textContent = retryLabel;
    ok.focus();
  }

  function confirmDelete(dosar) {
    openConfirm({
      iconId: "icon-delete",
      danger: true,
      title: "Eliminați schița?",
      paragraphs: [
        `Schița <strong>${escape(dosar.object)}</strong> (${escape(dosar.nr)}) va fi eliminată definitiv din Solicitările mele.`,
        /* US-17 AC-04: removing an unpaid draft cancels its payment note */
        pendingFee(dosar) ? `Nota de plată ${escape(dosar.payment.nr)} (${escape(money(dosar.payment.amount))}) se anulează.` : "",
        "Datele completate nu mai pot fi recuperate. Pentru același serviciu puteți începe oricând o solicitare nouă.",
      ].filter(Boolean),
      confirmLabel: "Elimină schița",
      onConfirm: (modal) => {
        if (params.get("eliminare") === "eroare" && !deleteFailed.has(dosar.id)) {
          deleteFailed.add(dosar.id);
          confirmError(modal, "A apărut o eroare. Schița nu a fost eliminată. Încercați din nou.", "Reîncercați");
          return false;
        }
        state.dosare = state.dosare.filter((item) => item.id !== dosar.id);
        try {
          const deleted = JSON.parse(sessionStorage.getItem(DELETED_KEY) || "[]");
          sessionStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...deleted, dosar.id])]));
        } catch { /* private mode */ }
        if (window.location.hash) history.pushState(null, "", window.location.pathname + window.location.search);
        route();
        window.GEAPToast?.show({ type: "success", message: "Schița a fost eliminată.", key: "sm-draft-deleted" });
      },
    });
  }

  /* MPay stand-in (US-135 AC-02): the note's data pre-filled, pay or cancel, then back
     to Solicitările mele (AC-07) — there is no MPay sandbox in the prototype */
  function openPayment(dosar) {
    const service = serviceOf(dosar);
    openConfirm({
      iconId: "icon-credit-card",
      title: "Achitare prin MPay",
      paragraphs: [
        "Sunteți redirecționat la MPay cu nota de plată precompletată:",
        `Nota de plată <strong>${escape(dosar.payment?.nr)}</strong> · Suma <strong>${escape(money(dosar.payment?.amount))}</strong> · Beneficiar <strong>${escape(service.authorityName || service.authority)}</strong>`,
        "După confirmarea plății reveniți automat în Solicitările mele.",
      ],
      cancelLabel: "Anulează plata",
      confirmLabel: `Achită ${money(dosar.payment?.amount)}`,
      onConfirm: () => window.location.assign(cabUrl("solicitari", { achitat: dosar.id })),
      onCancel: () => {},
    });
  }

  /* ---------- downloads (US-19 AC-12 / AC-14) ---------- */

  function download(button) {
    root.querySelectorAll("[data-sm-download-error]").forEach((node) => node.remove());
    window.GEAPToast?.dismiss(document.querySelector('[data-toast-key="sm-download-error"]'));
    if (params.get("descarcare") !== "eroare") {
      /* US-309: a refusal / a suspension decision opens its MDocs PDF (standard template) in the document dialog */
      const dosar = state.dosare.find((item) => item.id === button.dataset.smId);
      if (button.dataset.smKind === "decizie" && dosar && decisionType(dosar)) openDecisionDoc(dosar);
      return;
    }
    const scope = button.closest("[data-sm-dl-scope], .e-permits-page-header__actions") || button.closest(".cab-request-row");
    const text = "A apărut o eroare. Descărcarea nu a fost efectuată. Încercați din nou.";
    /* the header's action row (cabinet-header-v1): the same non-auto-closing error toast as a failed redirect
       (sm-04h-error-toast-v1) — an inline message there pushed the alert + trajectory tray down; the header button retries,
       a new attempt first closes the old toast */
    if (scope?.matches(".e-permits-page-header__actions") && window.GEAPToast) {
      keepClearOfToast(button, window.GEAPToast.show({ type: "error", message: text, duration: 0, key: "sm-download-error" }));
      return;
    }
    const html = message("banner--error", "icon-circle-error-filled", text, { role: "alert", attrs: "data-sm-download-error" });
    /* in a row: the full-width notice slot under the row (as the act row's locked notice) */
    if (scope?.classList.contains("cab-request-row")) scope.insertAdjacentHTML("beforeend", html.replace('class="message', 'class="cab-request-row__notice message'));
    else if (scope?.matches(".cab-status__actions, .cab-detail__actions")) scope.insertAdjacentHTML("afterend", html);
    else scope?.insertAdjacentHTML("beforeend", html);
    root.querySelector("[data-sm-download-error]")?.scrollIntoView({ block: "nearest" });
  }

  /* US-24 AC-04: the error notice with „Reîncercați” (btn-strict) under the action that failed — in the
     status card on the profile, in the row on the list */
  /* US-29 AC-01 the same for „Continuă schița” (the profile button, the ⋮ item) */
  const REDIRECT_ERRORS = {
    supplement: "Formularul de suplinire nu s-a deschis. Datele dosarului nu s-au pierdut.",
    draft: "Schița nu s-a deschis. Datele salvate nu s-au pierdut.",
  };
  /* phones: the toast sits at the bottom (library position) — when it would cover the button that failed, the page
     scrolls just enough to keep 16 between them (nothing moves on desktop, where the toast is top-right) */
  function keepClearOfToast(button, toast) {
    if (!button || !toast) return;
    const b = button.getBoundingClientRect();
    const t = (toast.parentElement || toast).getBoundingClientRect(); /* the container: the toast itself is still sliding in */
    const overlapsX = b.right > t.left && b.left < t.right;
    const delta = b.bottom + 16 - t.top;
    if (overlapsX && delta > 0 && b.top < t.bottom) window.scrollBy({ top: delta, behavior: "instant" });
  }

  function redirectError(action, { kind = "supplement", href = "" } = {}) {
    root.querySelectorAll("[data-sm-redirect-error]").forEach((node) => node.remove());
    const retryHref = href || action.getAttribute("href") || "";
    /* on the request PROFILE (the alert card's button sm-04h, the header's „Continuă schița” sm-03e) the failure is
       the library error toast that does NOT auto-close (sm-04h-error-toast-v1, 2026-10-23; user on EVO Cabinet Figma
       1265:4451: „this one should not cut the alert and timeline in half — put it anywhere else, or as a non-auto-closing
       toast”): role=alert (announced, focus stays on the button), „Reîncercați” = the library link slot (the form's
       address: retrying IS the redirect, the toast goes with the page), × closes it; the alert + trajectory tray stays whole. A list row keeps its inline notice in the row's slot. */
    if (!action.closest(".cab-request-row") && window.GEAPToast) {
      keepClearOfToast(action, window.GEAPToast.show({
        type: "error",
        message: REDIRECT_ERRORS[kind],
        link: { href: retryHref, label: "Reîncercați" },
        duration: 0,
        key: "sm-redirect-error",
      }));
      return;
    }
    const html = `
      <div class="cab-retry" data-sm-redirect-error>
        ${message("banner--error", "icon-circle-error-filled", REDIRECT_ERRORS[kind], { role: "alert" })}
        <button class="btn btn-strict btn-sm" type="button" data-sm-redirect-retry="${escape(retryHref)}">${icon("icon-rotate-arrow")}<span>Reîncercați</span></button>
      </div>`;
    const item = action.closest(".cab-request-row");
    if (item) item.insertAdjacentHTML("beforeend", html.replace('class="cab-retry"', 'class="cab-retry cab-request-row__notice"'));
    else action.insertAdjacentHTML("afterend", html);
    root.querySelector("[data-sm-redirect-retry]")?.focus();
  }

  /* „Disponibilă aprobarea tacită” explains itself with `data-tooltip-hint` — the ONE tooltip runtime
     (js/icon-tooltip.js): hover, keyboard focus, tap on touch, Escape */

  /* ---------- events ---------- */

  /* the row (click / Enter / Space) ALWAYS opens the request's details — every status, drafts included (user
     2026-10-20: „clicking on the entire card should always show the details, not redirect to the full flow”).
     The flow actions (Continuă schița, Trimite informațiile, Achită, Depune contestație) stay explicit: ⋮ menu,
     the alert's inline link, the details page. */
  /* act-profile-url-v1: a request's own address = ?view=solicitari[&as=…]#dosar/<id> (the current address, demo ?state=
     dropped); from the list the list's entry first remembers its scroll, then the profile is pushed */
  const requestUrl = (id) => C.pageAddress({}, `#dosar/${id}`);
  function openRow(id) {
    const fromList = root.querySelector("[data-sm-profile-view]")?.hidden !== false;
    if (fromList) history.replaceState({ ...(history.state || {}), smList: { scrollY: window.scrollY } }, "", C.pageAddress({}, ""));
    history.pushState({ smFromList: fromList }, "", requestUrl(id));
    route();
  }

  function bind() {
    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-sm-search]")) return;
      state.query = event.target.value;
      state.page = 1;
      /* US-158 AC-14 demo: the first refresh fails */
      if (params.get("eroare") === "cautare" && state.query) state.searchFailed = true;
      listLoader.load();
    });

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (target.closest("[data-sm-search-clear]")) {
        state.query = "";
        state.page = 1;
        listLoader.load();
        root.querySelector("[data-sm-search]")?.focus();
        return;
      }
      if (target.closest("[data-sm-retry]")) { window.location.assign(cabUrl("solicitari")); return; }
      const redirectRetry = target.closest("[data-sm-redirect-retry]");
      if (redirectRetry) { window.location.assign(redirectRetry.dataset.smRedirectRetry); return; }
      if (target.closest("[data-sm-search-retry]")) { state.searchFailed = false; renderList(); return; }
      /* „Sortează”: a key starts in its natural direction, the direction keeps the key (AC-12: back to page 1) */
      const sortKey = target.closest("[data-sm-sort-key]");
      const sortDir = target.closest("[data-sm-sort-dir]");
      if (sortKey || sortDir) {
        const [key, dir] = state.sort.split("-");
        const next = sortKey ? SORT_KEYS.find((item) => item.key === sortKey.dataset.smSortKey) : null;
        applySort(next ? `${next.key}-${next.key === key ? dir : next.def}` : `${key}-${sortDir.dataset.smSortDir}`);
        return;
      }
      const size = target.closest("[data-sm-per-page]");
      if (size) { state.perPage = Number(size.dataset.smPerPage); state.page = Number(size.dataset.smPage) || 1; C.closeMenus(); listLoader.load(); return; }
      const page = target.closest("[data-sm-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.smPage); listLoader.load(); root.querySelector("#sm-title")?.scrollIntoView({ block: "start" }); return; }
      const tab = target.closest("[data-sm-tab]");
      if (tab) { selectTab(tab.dataset.smTab); return; }
      if (target.closest("[data-sm-back]")) {
        if (C.modifiedClick(event)) return;
        event.preventDefault();
        if (history.state?.smFromList) { history.back(); return; }
        history.pushState(null, "", C.pageAddress({}, "")); route(); window.scrollTo(0, 0); return;
      }
      if (target.closest("[data-tooltip-hint]")) { event.stopPropagation(); window.GEAPTooltip?.show(target.closest("[data-tooltip-hint]")); return; }

      /* documents: the card itself → the document modal (no „Detalii” button since no-lone-detalii-v1) */
      const docOpen = target.closest("[data-cab-doc-open]") || (!target.closest("button, a, .cab-card__actions, [data-copy-value]") && target.closest(".cab-doc[data-cab-doc]"));
      if (docOpen) { C.closeMenus(); openDosarDoc(docOpen.dataset.cabDocOpen || docOpen.dataset.cabDoc); return; }

      const action = target.closest("[data-sm-action]");
      if (action) {
        const dosar = state.dosare.find((item) => item.id === (action.dataset.smId || root.querySelector("[data-sm-profile]")?.dataset.smProfile));
        /* US-24 AC-04 (demo ?redirectionare=eroare): the redirect to the suplinire form fails → the error
           notice + „Reîncercați” in place, nothing navigates */
        if ((action.dataset.smAction === "supplement" || action.dataset.smAction === "continue") && params.get("redirectionare") === "eroare") {
          event.preventDefault();
          C.closeMenus();
          redirectError(action, { kind: action.dataset.smAction === "continue" ? "draft" : "supplement" });
          return;
        }
        if (action.tagName === "A") { C.closeMenus(); return; } /* links navigate (FOD2, act profile) */
        event.preventDefault();
        C.closeMenus();
        if (!dosar) return;
        if (action.dataset.smAction === "open") { window.location.hash = `#dosar/${dosar.id}`; return; }
        if (action.dataset.smAction === "delete") { confirmDelete(dosar); return; }
        if (action.dataset.smAction === "pay") { openPayment(dosar); return; }
        if (action.dataset.smAction === "download") { download(action); return; }
        return;
      }

      const card = target.closest("[data-sm-card]");
      /* the title link (act-profile-url-v1): a modified click = the browser's new tab / window; a plain one opens in place */
      const titleLink = target.closest("a.e-permits-fo-lib-item__title");
      if (titleLink && C.modifiedClick(event)) return;
      if (card && !card.classList.contains("is-static") && (titleLink || !target.closest(".cab-card__actions, [data-copy-value], .cab-mark, .sm-tacit, a, button"))) {
        event.preventDefault();
        openRow(card.dataset.smCard);
      }
    });

    root.addEventListener("keydown", (event) => {
      /* ARIA tabs: ←/→ / Home / End move between the tabs and show them */
      const tabButton = event.target.closest?.("[data-sm-tab]");
      if (tabButton && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        const all = [...root.querySelectorAll("[data-sm-tab]")];
        const index = all.indexOf(tabButton);
        const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
        event.preventDefault();
        selectTab(all[next].dataset.smTab, { focus: true });
        return;
      }
      /* no-lone-detalii-v1: a document card is the control (no „Detalii” button) → Enter / Space opens the modal */
      const docCard = event.target.matches?.(".cab-doc[data-cab-doc]") ? event.target : null;
      if (docCard && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        C.closeMenus();
        openDosarDoc(docCard.dataset.cabDoc);
        return;
      }
      const card = event.target.matches?.("[data-sm-card]") ? event.target : null;
      if (card && (event.key === "Enter" || event.key === " ") && !card.classList.contains("is-static")) {
        event.preventDefault();
        openRow(card.dataset.smCard);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeConfirm();
    });

    window.addEventListener("hashchange", route);
    window.addEventListener("popstate", route);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }

  /* ---------- boot ---------- */

  /* returns from FOD2 / MPay (US-18 AC-10, US-29, US-135 AC-07/08/10) */
  function applyReturns() {
    const service09 = state.data.services["09"];
    const pp = params.get("pp");
    const ppLabel = { reperfectare: "Reperfectare", prelungire: "Prelungire", duplicat: "Emitere duplicat", retragere: "Retragere", suspendare: "Suspendarea valabilității", reluare: "Reluarea valabilității", anulare: "Anulare" }[pp];
    const object = params.get("obiect") || "Solicitare nouă";
    const filed = params.get("depus");
    /* demo: a finalized request approved tacitly (US-157; the seed has none) → its one tag reads „Aprobat tacit” */
    /* demo: a VERY long service name on one request (cabinet-header-v1, sm-05w / sm-01r) — the real 221-character
       title of the alcohol licence, to show how the header and the row handle it */
    (params.get("titlu-lung") || "").split(",").filter(Boolean).forEach((id) => {
      const dosar = state.dosare.find((item) => item.id === id);
      if (!dosar) return;
      const key = `${dosar.service}-titlu-lung`;
      state.data.services[key] = { ...serviceOf(dosar), title: "Licență pentru fabricarea alcoolului etilic, a berii și a producției alcoolice, cu excepția vinului, produselor obținute pe bază de must și a produselor a căror fabricare este autorizată în conformitate cu Legea viei și vinului nr. 57/2006" };
      dosar.service = key;
    });
    (params.get("tacit-dosar") || "").split(",").forEach((id) => {
      const dosar = state.dosare.find((item) => item.id === id && item.status === "finalizat" && item.result === "aprobat");
      if (dosar) dosar.tacit = true;
    });
    if (filed && !state.dosare.some((dosar) => dosar.nr === filed)) {
      const submitted = `${TODAY}T13:50`;
      state.dosare.unshift({
        id: "d-nou", nr: filed, service: "09", tip: ppLabel || "Eliberare", pp: pp || undefined, actId: params.get("act") || undefined,
        object, subdivision: params.get("subdiviziune") || "CSP Chișinău", status: "derulare", submitted,
        examTerm: addWorkdays(TODAY, ppLabel ? 5 : service09.termDays), justAdded: true,
        payment: ppLabel ? undefined : { nr: `NP-${TODAY.replaceAll("-", "")}-${filed.slice(-4)}`, amount: service09.fee, status: "Achitat", created: `${TODAY}T13:48`, paid: `${TODAY}T13:49` },
      });
      state.notice = { tone: "banner--success", icon: "icon-circle-checkmark-filled", html: `Cererea a fost depusă. Dosarul <strong>${escape(filed)}</strong> este primul în listă, cu statutul „În derulare”.` };
    }
    if (params.get("schita")) {
      const step = Number(params.get("pas")) || 1;
      state.dosare.unshift({
        id: "d-schita-noua", nr: params.get("nr") || "GEAP-2026-009-04602", service: "09", tip: ppLabel || "Eliberare", pp: pp || undefined, actId: params.get("act") || undefined,
        object: params.get("obiect") || "Solicitare fără denumire", subdivision: "CSP Chișinău", status: "schita", created: `${TODAY}T13:40`, justAdded: true,
        draft: { step, stepLabel: DRAFT_STEPS[step], expires: addDays(TODAY, 30) }, documents: [],
      });
      /* US-21 AC-03: the message on every save (<Timp setat> = the BO retention) */
      state.notice = { tone: "banner--info", icon: "icon-cloud-upload-success", html: escape(draftKeptText(state.dosare[0])) };
    }
    const paid = state.dosare.find((dosar) => dosar.id === params.get("achitat"));
    if (paid?.status === "achitare") {
      paid.status = "derulare";
      paid.payment = { ...paid.payment, status: "Achitat", paid: `${TODAY}T14:05` };
      paid.examTerm = addWorkdays(TODAY, 10);
      paid.justAdded = true;
      state.notice = { tone: "banner--success", icon: "icon-circle-checkmark-filled", html: `Plata de ${escape(money(paid.payment.amount))} pentru dosarul <strong>${escape(paid.nr)}</strong> a fost confirmată. Dosarul a revenit în examinare.` };
    }
    if (params.get("nota") === "expirata") {
      state.dosare.filter((dosar) => dosar.status === "achitare" && dosar.payment).forEach((dosar) => {
        dosar.payment = { ...dosar.payment, status: "Expirat", due: addDays(TODAY, -2) };
      });
    }
    if (params.get("plata") === "anulata") {
      state.notice = { tone: "banner--warning", icon: "icon-warning-filled", html: "Plata nu a fost finalizată. Statutul dosarului nu s-a modificat — puteți reîncerca din „Achitare” până la expirarea notei de plată." };
    }
  }

  async function init() {
    /* cabinet-skeleton-v1: the skeleton until the (simulated) answer is in */
    const first = C.firstLoad();
    if (first.skeleton) { state.firstLoading = true; renderFirstLoad(); }
    try {
      const [data, fo] = await Promise.all([
        fetch("../data/cabinet-evo-solicitari.json?v=type-first-v1").then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
        fetch("../data/acte-permisive.json?v=type-first-v1").then((response) => response.json()).catch(() => null),
      ]);
      state.data = data;
      const flow = fo?.frontOfficeFlows?.[0] || {};
      state.subjects = flow.subjects || [];
      state.user = flow.authenticatedUser || null;
      state.subject = state.subjects.find((subject) => subject.id === C.SUBJECT) || null;
      state.acts = Object.values(flow.intent?.acts || {}).flat();
      state.perspective = data.perspectives[C.SUBJECT] || { dosare: [] };
      let deleted = [];
      try { deleted = JSON.parse(sessionStorage.getItem(DELETED_KEY) || "[]"); } catch { deleted = []; }
      const all = (state.perspective.dosare || []).filter((dosar) => !deleted.includes(dosar.id)).map((dosar) => normalize({ ...dosar }));
      state.removed = all.filter(autoRemoved);
      state.dosare = all.filter((dosar) => !autoRemoved(dosar));
      applyReturns();
      await first.done();
      if (state.firstLoading) {
        state.firstLoading = false;
        C.setToolbarLoading(root.querySelector("[data-sm-toolbar]"), false);
        root.querySelector("[data-sm-profile-view]")?.removeAttribute("aria-busy");
      }
      bind();
      route();
      /* from a payment notification (US-135 AC-02 / AC-11 / AC-14): ?achita=<id> opens MPay, or the expired-fee message */
      const toPay = state.dosare.find((dosar) => dosar.id === params.get("achita") && dosar.status === "achitare");
      if (toPay && !paymentExpired(toPay)) openPayment(toPay);
    } catch (error) {
      console.warn("[solicitari]", error);
      root.innerHTML = `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a fost încărcată. Încercați din nou.")}</div>`;
    }
    document.documentElement.dataset.smReady = "true";
  }

  init();
})();
