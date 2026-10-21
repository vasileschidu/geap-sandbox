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
  const PAYMENT_EXPIRED_TEXT = "Taxa a expirat. Achitarea nu mai este posibilă.";

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
  const canAppeal = (dosar) => Boolean(appealUntil(dosar)) && appealUntil(dosar) >= TODAY;
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
     = one entry here (+ its label in data/cabinet-evo-solicitari.json › statuses). */
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
      alert: (d) => ({ tone: "warning", icon: "icon-warning-filled", html: `Trimiteți informațiile cerute până la ${on(d.info?.until)}${countdown(d)}${endNote(d)}${alertLink(d, "supplement", "Trimite informațiile", foUrl(d, "supplement"))}` }),
    },
    achitare: {
      tag: "warning",
      alert: (d) => (paymentExpired(d)
        ? { tone: "danger", icon: "icon-circle-error-filled", html: `Taxa a expirat pe ${on(d.payment?.due)}. Achitarea nu mai este posibilă.` }
        : { tone: "warning", icon: "icon-credit-card", html: `Achitați taxa de ${escape(money(d.payment?.amount))} până la ${on(d.payment?.due)}${countdown(d)}${endNote(d)}${alertLink(d, "pay", "Achită acum")}` }),
    },
    derulare: { tag: "info", alert: () => null },
    finalizat: {
      tag: "success",
      alert: (d) => (d.result === "respins" && canAppeal(d)
        ? { tone: "info", icon: "icon-judge-gavel", html: `Puteți depune contestație până la ${on(appealUntil(d))}${countdown(d)}.${alertLink(d, "appeal", "Depune contestație", foUrl(d, "appeal"))}` }
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
    { key: "autoritate", label: "Autoritatea emitentă", get: authorityValue },
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
  const availableFacets = () => FACETS.filter((facet) => state.filter.applied[facet.key]?.length || new Set(state.dosare.flatMap((dosar) => facetValues(facet, dosar))).size > 1);
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
      apply: () => { state.page = 1; renderList(); },
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

  const dirName = (d) => (d.name || d.label).toLowerCase();
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
    renderList();
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
              <span class="chip__label" data-sm-sort-label>Data depunerii</span>
              <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--wide e-permits-sort-menu" id="sm-sort-menu" role="menu" aria-label="Sortează solicitările" hidden data-sm-sort-menu></ul>
          </div>
        </div>
        <div class="e-permits-workplace__filters cab-filters" id="sm-filters" role="group" aria-label="Filtre" data-sm-filters hidden></div>
        <p class="u-visually-hidden" aria-live="polite" data-sm-sort-status></p>
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

  function renderList() {
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

    results.innerHTML = state.searchFailed
      ? `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a putut fi actualizată. Încercați din nou.", "data-sm-search-retry")}</div>`
      : pageItems.length
        ? `<ul class="e-permits-fo-intent__list cab-act-list cab-request-list" aria-label="Lista solicitărilor">${pageItems.map(cardHtml).join("")}</ul>${pagerHtml(all.length)}`
        : `<div class="cab-state">${fixAssets(window.GEAPEmptyState.noResults("Nu au fost găsite rezultate pentru criteriile selectate.", { text: "Modificați căutarea sau filtrele aplicate." }))}</div>`;
    facetFilter?.render();
  }

  /* ---------- profile (US-161) ---------- */

  /* BO detail rows / card / section (CabEvo, css/bo-profile-parts.css) */
  const row = (label, valueHtml) => C.detailRow(label, valueHtml);
  const rows = (list) => C.detailCard(list);
  const section = (id, title, body, { scope = false } = {}) => C.profileSection(`sm-sec-${id}`, title, body, { attrs: scope ? "data-sm-dl-scope" : "" });

  /* ---------- „Stadiul solicitării” (2026-10-17): ONE bordered card = the current status on top
     (Small tags + the status sentence / next step + the action that exists) · hairline · the timeline
     of the request (the shared trajectory, vertical and bare — js/trajectory.js: done steps with their
     dates, the current one on the soft pill, the next ones as rings). Replaces the stepper + callout +
     loose action row + „Istoric complet”. */
  const STEP_STATE_TEXT = { done: "finalizat", current: "etapa curentă", attention: "necesită acțiunea dumneavoastră", rejected: "respins", todo: "urmează" };

  function statusNow(dosar) {
    const service = serviceOf(dosar);
    const where = [service.authority, dosar.subdivision].filter(Boolean).join(" — ");
    switch (dosar.status) {
      case "schita":
        /* US-18 AC-09: signed + paid but „Confirmă depunerea” not pressed → the BO submits it after the grace period
           (the removal date stays in the title: whether such a draft shows it is PO question 5) */
        if (dosar.signed) {
          return {
            title: `Schiță nedepusă · se elimină automat pe ${longDate(dosar.draft?.expires)}`,
            text: `Cererea este semnată electronic (${longDateTime(dosar.signed)})${dosar.payment?.status === "Achitat" ? ` și taxa de ${money(dosar.payment.amount)} este achitată` : ""}. Dacă nu confirmați depunerea, ea se transmite automat autorității după intervalul de grație; dacă transmiterea nu reușește, o depuneți din „Continuă schița”.`,
          };
        }
        return {
          title: `Schiță nedepusă · se elimină automat pe ${longDate(dosar.draft?.expires)}`,
          text: pendingFee(dosar)
            ? `Ați rămas la pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step]}”; datele completate sunt salvate. Nota de plată ${dosar.payment.nr} de ${money(dosar.payment.amount)} este emisă și așteaptă achitarea — o achitați prin MPay după ce continuați schița.`
            : `Ați rămas la pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant"}”; datele completate sunt salvate. Continuați completarea ca să depuneți solicitarea.`,
        };
      case "info":
        return {
          title: `Necesită informații suplimentare · până la ${longDate(dosar.info?.until)}`,
          text: `${dosar.info?.reason ? `${dosar.info.reason} ` : ""}Examinarea este suspendată până transmiteți informațiile; apoi continuă.`,
        };
      case "achitare":
        if (paymentExpired(dosar)) {
          return {
            title: `Spre achitare · termenul notei de plată a expirat pe ${longDate(dosar.payment?.due)}`,
            text: `Nota de plată de ${money(dosar.payment?.amount)} nu a fost achitată în termen.`,
          };
        }
        return {
          title: `Spre achitare · ${money(dosar.payment?.amount)} până la ${longDate(dosar.payment?.due)}`,
          text: "Nota de plată se achită prin MPay pentru ca dosarul să continue examinarea. După achitare, starea se actualizează automat.",
        };
      case "derulare":
        return dosar.tacit
          ? { title: `În examinare · termenul a expirat pe ${longDate(dosar.examTerm)}`, text: `Autoritatea (${where}) nu s-a pronunțat în termen, așa că solicitarea se consideră aprobată tacit; vă anunțăm imediat ce decizia este emisă.` }
          : dosar.resumed?.kind === "expirat"
            /* US-24 AC-03: the suplinire term passed, the BO reactivated the examination */
            ? { title: `În examinare · termen ${longDate(dosar.examTerm)}`, text: `Termenul de suplinire a expirat pe ${longDate(dosar.info?.until)} fără informațiile cerute, iar autoritatea a reluat examinarea cu documentele depuse. Nu trebuie să faceți nimic acum — vă anunțăm la orice schimbare.` }
            : dosar.supplemented
              /* US-24 AC-20 / US-28 AC-04: suplinire sent → back in examination, new term */
              ? { title: `În examinare · termen ${longDate(dosar.examTerm)}`, text: `Informațiile suplimentare au fost transmise pe ${longDate(dosar.supplemented)}, iar autoritatea a reluat examinarea. Nu trebuie să faceți nimic acum — vă anunțăm la orice schimbare.` }
              : { title: `În examinare · termen ${longDate(dosar.examTerm)}`, text: `Dosarul este la ${where}. Nu trebuie să faceți nimic acum — vă anunțăm la orice schimbare.` };
      case "finalizat":
        if (dosar.result === "respins") {
          return {
            title: `Respinsă pe ${longDate(dosar.finalized)}`,
            text: canAppeal(dosar)
              ? `Motivul și recomandările autorității sunt în secțiunea Decizie. Puteți depune o contestație până la ${longDate(appealUntil(dosar))}.`
              : "Motivul și recomandările autorității sunt în secțiunea Decizie.",
          };
        }
        if (dosar.decisionOnly) return { title: `Aprobată pe ${longDate(dosar.finalized)}`, text: dosar.decision?.text || "" };
        return { title: `Aprobată${dosar.tacit ? " tacit" : ""} pe ${longDate(dosar.finalized)} · actul este disponibil`, text: "Actul permisiv emis este și în „Actele mele permisive”, de unde îl puteți vizualiza și descărca oricând." };
      default:
        return { title: statusOf(dosar).label, text: "" };
    }
  }

  /* the request's steps: what happened (dates, who) + what comes next (dashed, no date) */
  /* US-161 AC-16 / US-16: the delivery chosen at filing — EVO Cabinet always, paper on top when chosen */
  const PAPER = { mdelivery: "Pe hârtie prin MDelivery", ghiseu: "Pe hârtie la instituția emitentă" };
  function deliveryNote(dosar) {
    const paper = dosar.delivery?.paper;
    if (paper === "mdelivery") return "În EVO Cabinet și pe hârtie, prin MDelivery.";
    if (paper === "ghiseu") return `În EVO Cabinet și pe hârtie, la ${dosar.subdivision}.`;
    return "Livrat în EVO Cabinet.";
  }
  function addressText(address = {}) {
    const street = [address.strada, address.numar].filter(Boolean).join(" ");
    return [street, address.bloc ? `bl. ${address.bloc}` : "", address.apartament, address.localitate, address.raion, address.codPostal].filter(Boolean).join(", ");
  }

  function timelineEvents(dosar) {
    /* US-161 AC-11: filed by a representative → his name (and the MPower basis), not the viewer's */
    const by = dosar.filedBy
      ? `${dosar.filedBy.name} în baza împuternicirii MPower`
      : state.perspective?.mpower ? `${state.user?.name} în baza împuternicirii MPower` : state.user?.name || "solicitant";
    const where = `${serviceOf(dosar).authority} — ${dosar.subdivision}`;
    const events = [];
    if (dosar.status === "schita") {
      events.push({ state: "done", title: "Schiță creată", when: longDateTime(dosar.created), text: "Salvată automat." });
      if (dosar.signed) {
        events.push({ state: "done", title: "Cerere semnată", when: longDateTime(dosar.signed), text: `Semnată prin MSign de ${by}.` });
        if (dosar.payment?.status === "Achitat") events.push({ state: "done", title: "Taxă achitată", when: longDateTime(dosar.payment.paid), text: `${money(dosar.payment.amount)} prin MPay.` });
        events.push({ state: "current", title: "Confirmarea depunerii", when: "", text: "Se transmite automat după intervalul de grație." });
      } else {
        events.push({ state: "current", title: "Completarea cererii", when: "", text: pendingFee(dosar)
          ? `Pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step]}” · nota de plată de ${money(dosar.payment.amount)} așteaptă achitarea · până la ${longDate(dosar.draft?.expires)}`
          : `Pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant"}” · până la ${longDate(dosar.draft?.expires)}` });
        events.push({ state: "todo", title: "Depunere și semnare", when: "", text: "" });
      }
      events.push({ state: "todo", title: "Examinare și decizie", when: "", text: "" });
      return events;
    }
    const paidAtFiling = dosar.payment?.paid && !dosar.feeDuringExam ? ` Taxa de ${money(dosar.payment.amount)} a fost achitată prin MPay.` : "";
    /* act-profile-v1: a post-process started by the AUTHORITY (initiatedBy) — no applicant signed anything */
    const byAuthority = dosar.initiatedBy === "autoritate";
    events.push(byAuthority
      ? { state: "done", title: "Procedură inițiată de autoritate", when: longDateTime(dosar.submitted), text: `${where}, din oficiu.` }
      : { state: "done", title: "Solicitare depusă", when: longDateTime(dosar.submitted), text: `Semnată prin MSign de ${by}.${paidAtFiling}` });
    const examining = dosar.status === "derulare";
    /* a suspension that is over (suplinire sent, or its term passed): its steps, then the resumed examination */
    const resumed = Boolean(dosar.suspended) && dosar.status !== "info";
    events.push({ state: examining && !resumed ? "current" : "done", title: "În examinare la autoritate", when: `din ${longDate(addDays(dosar.submitted, 1))}`, text: examining && !resumed && dosar.examTerm ? `${where} · termen ${longDate(dosar.examTerm)}` : where });
    if (resumed) {
      events.push({ state: "done", title: "Informații suplimentare solicitate", when: longDate(dosar.suspended), text: dosar.info?.until ? `Examinarea a fost suspendată până la ${longDate(dosar.info.until)}.` : "Examinarea a fost suspendată." });
      if (dosar.supplemented) events.push({ state: "done", title: "Informații transmise", when: longDateTime(dosar.supplemented), text: "Prin formularul de suplinire." });
      else if (dosar.resumed?.kind === "expirat") events.push({ state: "done", title: "Suspendare încheiată", when: longDate(dosar.info?.until), text: "Termenul de suplinire a expirat; informațiile cerute nu au fost transmise." });
      if (examining) events.push({ state: "current", title: "Examinare reluată", when: `din ${longDate(dosar.supplemented || dosar.resumed?.at)}`, text: dosar.examTerm ? `${where} · termen ${longDate(dosar.examTerm)}` : where });
    }
    if (dosar.status === "info") events.push({ state: "attention", title: "Informații suplimentare solicitate", when: longDate(dosar.suspended), text: `Examinarea este suspendată · trimiteți-le până la ${longDate(dosar.info?.until)}.` });
    if (dosar.status === "achitare") events.push({ state: "attention", title: "Notă de plată emisă", when: longDateTime(dosar.payment?.created), text: paymentExpired(dosar) ? `${money(dosar.payment?.amount)} · termenul de achitare a expirat pe ${longDate(dosar.payment?.due)}.` : `${money(dosar.payment?.amount)} · de achitat până la ${longDate(dosar.payment?.due)}.` });
    if (dosar.status === "finalizat") {
      const rejected = dosar.result === "respins";
      events.push({ state: rejected ? "rejected" : "done", title: rejected ? "Solicitare respinsă" : byAuthority ? "Decizie semnată" : "Solicitare aprobată", when: longDate(dosar.finalized), text: rejected ? "Decizia de refuz a fost semnată și comunicată." : dosar.decisionOnly ? "Decizia a fost semnată; starea actului a fost actualizată." : "Actul permisiv a fost semnat și emis." });
    } else {
      events.push({ state: "todo", title: "Decizia autorității", when: "", text: dosar.examTerm && dosar.status !== "info" ? `Termen: ${longDate(dosar.examTerm)}` : "" });
      events.push({ state: "todo", title: "Act emis", when: "", text: deliveryNote(dosar) });
    }
    return events;
  }

  function timelineHtml(dosar) {
    return window.GEAPTrajectory?.html({
      layout: "vertical",
      bare: true,
      className: "cab-status__timeline",
      label: "Etapele solicitării",
      steps: timelineEvents(dosar).map((event) => ({
        label: event.title,
        state: event.state,
        sr: STEP_STATE_TEXT[event.state],
        meta: [event.when, event.text].filter(Boolean).join(" · ")
      }))
    }) || "";
  }

  function statusCardHtml(dosar) {
    const now = statusNow(dosar);
    const actions = profileActions(dosar);
    return section("stadiu", "Stadiul solicitării", `
      <div class="cab-status" data-sm-status>
        <div class="cab-status__now">
          <div class="cab-status__tags">${statusTag(dosar)}${marksHtml(dosar)}${dosar.status === "schita" && dosar.signed ? C.signedTagHtml() : ""}</div>
          <p class="cab-status__title">${escape(now.title)}</p>
          ${now.text ? `<p class="cab-status__text">${escape(now.text)}</p>` : ""}
          ${dosar.status === "schita" ? message("banner--info", "icon-circle-info-filled", escape(draftKeptText(dosar)), { attrs: "data-sm-draft-kept" }) : ""}
          ${actions}
        </div>
        ${timelineHtml(dosar)}
      </div>`);
  }

  function profileActions(dosar) {
    const buttons = [];
    const download = (kind, label, variant = "btn-neutral") => `<button class="btn ${variant} btn-md btn-rounded" type="button" data-sm-action="download" data-sm-kind="${kind}" data-sm-id="${escape(dosar.id)}">${icon("icon-export")}<span>${escape(label)}</span></button>`;
    const appeal = (variant) => `<a class="btn ${variant} btn-md btn-rounded" href="${escape(foUrl(dosar, "appeal"))}" data-sm-action="appeal">${icon("icon-judge-gavel")}<span>Depune contestație</span></a>`;
    switch (dosar.status) {
      case "schita":
        buttons.push(`<a class="btn btn-primary btn-md btn-rounded" href="${escape(foUrl(dosar, "draft"))}" data-sm-action="continue">${icon("icon-edit")}<span>Continuă schița</span></a>`);
        buttons.push(`<button class="btn btn-outline-destructive btn-md btn-rounded" type="button" data-sm-action="delete" data-sm-id="${escape(dosar.id)}">${icon("icon-delete")}<span>Elimină schița</span></button>`);
        break;
      case "info":
        if (dosar.info?.until >= TODAY) buttons.push(`<a class="btn btn-primary btn-md btn-rounded" href="${escape(foUrl(dosar, "supplement"))}" data-sm-action="supplement">${icon("icon-page-upload")}<span>Suplinește informații</span></a>`);
        break;
      case "achitare":
        /* US-135 AC-14: no redirect to MPay for an expired note — the message instead of the button */
        if (paymentExpired(dosar)) return message("banner--error", "icon-circle-error-filled", escape(PAYMENT_EXPIRED_TEXT), { role: "status", attrs: "data-sm-payment-expired" });
        buttons.push(`
          <button class="btn btn-badge btn-badge--primary" type="button" data-sm-action="pay" data-sm-id="${escape(dosar.id)}">
            <span class="btn-badge__logo" aria-hidden="true"><img src="../assets/logos/m-platforms/m-pay.svg" alt=""></span>
            <span class="btn-badge__label">Achită ${escape(money(dosar.payment?.amount))} cu mpay</span>
          </button>`);
        break;
      case "finalizat":
        if (dosar.result === "aprobat" && dosar.actId) {
          buttons.push(`<a class="btn btn-primary btn-md btn-rounded" href="${escape(cabUrl("acte", { act: dosar.actId }))}" data-sm-action="act">${icon("icon-page-text")}<span>Vezi actul</span></a>`);
          buttons.push(download(dosar.decisionOnly ? "decizie" : "act", dosar.decisionOnly ? "Descarcă decizia" : "Descarcă actul"));
          if (canAppeal(dosar)) buttons.push(appeal("btn-neutral"));
        }
        if (dosar.result === "respins") {
          buttons.push(download("decizie", "Descarcă decizia"));
          if (canAppeal(dosar)) buttons.push(appeal("btn-primary"));
        }
        break;
      default:
        break;
    }
    return buttons.length ? `<div class="cab-status__actions" data-sm-dl-scope>${buttons.join("")}</div>` : "";
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
      title: doc.kind === "certificat" ? "Document generat" : "Document însoțitor",
      subtitle: doc.tip,
      doc,
      pageHtml,
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
    if (dosarId) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dosar/${dosarId}${id === "general" ? "" : `/${id}`}`);
  }

  function renderProfile(dosar) {
    const service = serviceOf(dosar);
    C.setHeaderTitle("Solicitările mele");
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

    const documents = section("documente", "Documente însoțitoare", documentsHtml(dosar), { scope: true });
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
        ${C.pageHeader({
          back: { label: "Solicitările mele", href: cabUrl("solicitari"), attr: "data-sm-back" },
          /* type-first-v1: H1 = the service / act name, subtitle = the object / location (only when present) */
          title: service.title || dosar.object || dosar.nr,
          titleId: "sm-profile-title",
          subtitle: service.title ? dosar.object || "" : "",
          subtitleIcon: service.title && dosar.object ? "icon-map-pin-filled" : "",
          meta: headerMeta(dosar),
        })}
        <div class="e-permits-dosar-profil__panel">
          ${statusCardHtml(dosar)}
          ${profileTabsHtml(dosar, {
            general,
            solicitare: `${roles}${details}${contacts}${documents}${delivery}${initialFee}`,
            taxe: taxes,
            act: actSection(dosar),
          })}
          ${helpSection}
        </div>
      </article>`;
    C.syncHeaderMeta();
    root.querySelector("#sm-profile-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);

  }

  /* ---------- routing ---------- */

  function route() {
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
    else renderList();
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
    if (params.get("descarcare") !== "eroare") return;
    const scope = button.closest("[data-sm-dl-scope]") || button.closest(".cab-request-row") || root.querySelector(".cab-status__actions");
    const html = message("banner--error", "icon-circle-error-filled", "A apărut o eroare. Descărcarea nu a fost efectuată. Încercați din nou.", { role: "alert", attrs: "data-sm-download-error" });
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
  function redirectError(action, { kind = "supplement", href = "" } = {}) {
    root.querySelectorAll("[data-sm-redirect-error]").forEach((node) => node.remove());
    const html = `
      <div class="cab-retry" data-sm-redirect-error>
        ${message("banner--error", "icon-circle-error-filled", REDIRECT_ERRORS[kind], { role: "alert" })}
        <button class="btn btn-strict btn-sm" type="button" data-sm-redirect-retry="${escape(href || action.getAttribute("href") || "")}">${icon("icon-rotate-arrow")}<span>Reîncercați</span></button>
      </div>`;
    const item = action.closest(".cab-request-row");
    if (item) item.insertAdjacentHTML("beforeend", html.replace('class="cab-retry"', 'class="cab-retry cab-request-row__notice"'));
    else (action.closest(".cab-status__actions") || action).insertAdjacentHTML("afterend", html);
    root.querySelector("[data-sm-redirect-retry]")?.focus();
  }

  /* „Disponibilă aprobarea tacită” explains itself with `data-tooltip-hint` — the ONE tooltip runtime
     (js/icon-tooltip.js): hover, keyboard focus, tap on touch, Escape */

  /* ---------- events ---------- */

  /* the row (click / Enter / Space) ALWAYS opens the request's details — every status, drafts included (user
     2026-10-20: „clicking on the entire card should always show the details, not redirect to the full flow”).
     The flow actions (Continuă schița, Trimite informațiile, Achită, Depune contestație) stay explicit: ⋮ menu,
     the alert's inline link, the details page. */
  function openRow(id) {
    window.location.hash = `#dosar/${id}`;
  }

  function bind() {
    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-sm-search]")) return;
      state.query = event.target.value;
      state.page = 1;
      /* US-158 AC-14 demo: the first refresh fails */
      if (params.get("eroare") === "cautare" && state.query) state.searchFailed = true;
      renderList();
    });

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (target.closest("[data-sm-search-clear]")) {
        state.query = "";
        state.page = 1;
        renderList();
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
      if (size) { state.perPage = Number(size.dataset.smPerPage); state.page = 1; C.closeMenus(); renderList(); return; }
      const page = target.closest("[data-sm-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.smPage); renderList(); root.querySelector("#sm-title")?.scrollIntoView({ block: "start" }); return; }
      const tab = target.closest("[data-sm-tab]");
      if (tab) { selectTab(tab.dataset.smTab); return; }
      if (target.closest("[data-sm-back]")) { event.preventDefault(); history.pushState(null, "", window.location.pathname + window.location.search); route(); return; }
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
      if (card && !card.classList.contains("is-static") && !target.closest(".cab-card__actions, [data-copy-value], .cab-mark, .sm-tacit, a, button")) {
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
