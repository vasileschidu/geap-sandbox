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
   MPay), eroare=lista|cautare|mpower, descarcare=eroare. */
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
  const SORTS = [
    { id: "submitted-desc", label: "Data depunerii — cele mai recente" },
    { id: "submitted-asc", label: "Data depunerii — cele mai vechi" },
    { id: "end-asc", label: "Data estimată de finalizare" },
    { id: "nr-asc", label: "Numărul dosarului" },
    { id: "service-asc", label: "Serviciul solicitat (A–Z)" },
    { id: "authority-asc", label: "Autoritatea emitentă (A–Z)" },
    { id: "status-asc", label: "Statut" },
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
    /* US-158 AC-06 / 07: the date ranges („Perioadă” dialog); Statut + Autoritatea emitentă = the facet filter */
    panel: { subFrom: "", subTo: "", endFrom: "", endTo: "" },
    filter: { open: false, applied: {}, draft: null },
    notice: null,
    searchFailed: false,
    /* US-161: the profile section shown (Date generale by default, AC-03) */
    tab: "general",
    /* the issued acts (data/acte-permisive.json › intent.acts) — the act's service-specific fields (AC-29) */
    acts: [],
  };

  /* ---------- helpers ---------- */

  const statusOf = (dosar) => state.data.statuses[dosar.status] || { label: dosar.status, tag: "status-tag--neutral is-subtle" };
  const serviceOf = (dosar) => state.data.services[dosar.service] || {};
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

  function copyValue(value, label) {
    return C.copyValueHtml(value).replace(/aria-label="[^"]*"/, `aria-label="${escape(label || `Copiază ${value}`)}"`);
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
  const STATUS_TONE = { schita: "neutral", derulare: "info", achitare: "warning", info: "warning", finalizat: "success" };
  function statusTag(dosar) {
    return C.tagHtml(statusOf(dosar).label, STATUS_TONE[dosar.status] || "neutral");
  }

  /* Aprobat / Respins (US-19 AC-16) = green / red Small tags; the tacit approval (AC-15) = the blue
     „Aprobare tacită” tag of RAP — a button here, because it carries the explanation (tooltip) */
  function marksHtml(dosar) {
    if (readOnly()) return "";
    if (dosar.status === "finalizat" && dosar.result === "aprobat") return C.tagHtml("Aprobat", "success");
    if (dosar.status === "finalizat" && dosar.result === "respins") return C.tagHtml("Respins", "danger");
    if (dosar.tacit && dosar.status === "derulare") {
      return `<button class="e-permits-workplace__tag e-permits-workplace__tag--info cab-mark" type="button" data-sm-tip="${escape(tacitNote(dosar))}" aria-label="Aprobare tacită disponibilă. ${escape(tacitNote(dosar))}">Aprobare tacită</button>`;
    }
    return "";
  }

  /* US-19 AC-15 in the list: the icon + „Disponibilă aprobarea tacită” (a button: it carries the explanation tooltip) */
  function tacitListMark(dosar) {
    if (readOnly() || !(dosar.tacit && dosar.status === "derulare")) return "";
    return `<button class="sm-tacit" type="button" data-sm-tip="${escape(tacitNote(dosar))}" aria-label="Disponibilă aprobarea tacită. ${escape(tacitNote(dosar))}">${icon("icon-circle-checkmark-filled")}<span>Disponibilă aprobarea tacită</span></button>`;
  }
  /* the result marks of the list (AC-16) — the tacit one has its own list form */
  const resultMarks = (dosar) => (dosar.status === "finalizat" ? marksHtml(dosar) : "");

  /* US-19 AC-05…08: the live countdown to the deadline of the status (the end of the deadline day, demo „now” =
     today's date of the data at the current time of day); refreshed every minute */
  function deadlineOf(dosar) {
    if (readOnly()) return "";
    if (dosar.status === "schita") return dosar.draft?.expires || "";
    if (dosar.status === "info") return dosar.info?.until || "";
    if (dosar.status === "achitare") return paymentExpired(dosar) ? "" : dosar.payment?.due || "";
    if (dosar.status === "derulare" && !dosar.tacit) return dosar.examTerm || "";
    return "";
  }
  function demoNow() {
    const now = new Date();
    const [y, m, d] = TODAY.split("-").map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  }
  /* the table's short form: „28 de zile, 3 ore” (the words „Timp rămas:” stay for screen readers) */
  const shortCountdown = (text) => text.replace(/^mai (sunt|este) /, "").replace(" și ", ", ");
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
  /* AC-09: Schiță / Spre achitare / Informații suplimentare wait for the applicant → warning tone, În derulare info */
  function countdownHtml(dosar) {
    const iso = deadlineOf(dosar);
    if (!iso) return "";
    const tone = dosar.status === "derulare" ? "info" : "warning";
    return `<span class="sm-countdown sm-countdown--${tone}">${icon(tone === "info" ? "icon-time" : "icon-time-filled")}<span class="u-visually-hidden">Timp rămas: </span><span data-sm-countdown="${escape(isoDay(iso))}" data-sm-countdown-short>${escape(shortCountdown(countdownText(iso)))}</span></span>`;
  }
  window.setInterval(() => {
    document.querySelectorAll("[data-sm-countdown]").forEach((node) => {
      const text = countdownText(node.dataset.smCountdown);
      node.textContent = node.hasAttribute("data-sm-countdown-short") ? shortCountdown(text) : text;
    });
  }, 60000);

  const tacitNote = (dosar) => `Autoritatea nu a emis o decizie până la termenul de examinare (${longDate(dosar.examTerm)}). Solicitarea se consideră aprobată tacit, iar dumneavoastră puteți desfășura activitatea conform legii.`;

  /* the coloured deadline strip of a card (Figma 508:9600) */
  function stripHtml(dosar) {
    if (readOnly()) return "";
    switch (dosar.status) {
      case "schita":
        return message("banner--warning", "icon-time", `Schița se elimină automat pe <strong>${escape(longDate(dosar.draft?.expires))}</strong>`);
      case "info":
        return message("banner--warning", "icon-warning-filled", `Trimiteți informațiile cerute până la <strong>${escape(longDate(dosar.info?.until))}</strong>`);
      case "achitare":
        if (paymentExpired(dosar)) return message("banner--error", "icon-circle-error-filled", escape(PAYMENT_EXPIRED_TEXT));
        return message("banner--warning", "icon-credit-card", `Achitați taxa până la <strong>${escape(longDate(dosar.payment?.due))}</strong>`);
      case "derulare":
        if (dosar.tacit) return message("banner--info", "icon-time-filled", `Termenul de examinare a expirat pe <strong>${escape(longDate(dosar.examTerm))}</strong>`);
        return message("banner--info", "icon-time-filled", `Răspuns până la <strong>${escape(longDate(dosar.examTerm))}</strong>`);
      default:
        return "";
    }
  }

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
    const primaryKind = { schita: "continue", info: "supplement", achitare: "pay" }[dosar.status] || (dosar.status === "finalizat" && dosar.result === "aprobat" && dosar.actId ? "act" : "");
    const items = menuItems(dosar).filter((item) => item.separator || item.action !== primaryKind)
      .filter((item, i, list) => !(item.separator && (i === 0 || list[i - 1].separator || i === list.length - 1)));
    return `
      <div class="e-permits-fo-intent-act__action cab-card__actions">
        <button class="btn btn-strict btn-sm btn-icon-only cab-card__more" type="button" aria-label="Acțiuni pentru dosarul ${escape(dosar.nr)}" data-tooltip-label="Mai multe acțiuni" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-cab-menu-trigger>${icon("icon-more-vertical")}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="${menuId}" role="menu" aria-label="Acțiuni pentru dosarul ${escape(dosar.nr)}" hidden>
          ${items.map((item) => item.separator
            ? `<li role="separator" class="cab-menu__separator"></li>`
            : item.href
              ? `<li role="none"><a class="e-permits-fo-intent-menu__item" role="menuitem" href="${escape(item.href)}" data-sm-action="${item.action}" data-sm-id="${escape(dosar.id)}">${icon(item.icon, "medium")}<span>${escape(item.label)}</span></a></li>`
              : `<li role="none"><button class="e-permits-fo-intent-menu__item${item.action === "delete" ? " is-danger" : ""}" type="button" role="menuitem" data-sm-action="${item.action}" data-sm-id="${escape(dosar.id)}"${item.kind ? ` data-sm-kind="${item.kind}"` : ""}>${icon(item.icon, "medium")}<span>${escape(item.label)}</span></button></li>`).join("")}
        </ul>
      </div>`;
  }

  /* ---------- list ---------- */

  /* one labelled primary per row (product rule: one labelled action + ⋮), named as in
     US-19 AC-05/06/07: Continuă · Suplinire informații · Achitare; Vezi actul when approved */
  function primaryAction(dosar) {
    if (dosar.status === "schita") return `<a class="btn btn-neutral btn-sm" href="${escape(foUrl(dosar, "draft"))}" data-sm-action="continue" data-sm-id="${escape(dosar.id)}">Continuă</a>`;
    if (dosar.status === "info" && dosar.info?.until >= TODAY) return `<a class="btn btn-neutral btn-sm" href="${escape(foUrl(dosar, "supplement"))}" data-sm-action="supplement" data-sm-id="${escape(dosar.id)}">Suplinire informații</a>`;
    if (dosar.status === "achitare" && !paymentExpired(dosar)) return `<button class="btn btn-neutral btn-sm" type="button" data-sm-action="pay" data-sm-id="${escape(dosar.id)}">Achitare</button>`;
    if (dosar.status === "finalizat" && dosar.result === "aprobat" && dosar.actId) return `<a class="btn btn-neutral btn-sm" href="${escape(cabUrl("acte", { act: dosar.actId }))}" data-sm-action="act" data-sm-id="${escape(dosar.id)}">Vezi actul</a>`;
    return "";
  }

  /* the deadline of the row: one 14/20 line, icon in the status tone, date in medium */
  function deadlineHtml(dosar) {
    if (readOnly()) return "";
    const timer = deadlineOf(dosar) ? ` · <span data-sm-countdown="${escape(isoDay(deadlineOf(dosar)))}">${escape(countdownText(deadlineOf(dosar)))}</span>` : "";
    const line = (tone, iconId, html) => `<p class="sm-item__deadline sm-item__deadline--${tone}">${icon(iconId)}<span>${html}${timer}</span></p>`;
    switch (dosar.status) {
      case "schita": return line("warning", "icon-time", `Schița se elimină automat pe <strong>${escape(longDate(dosar.draft?.expires))}</strong>`);
      case "info": return line("warning", "icon-warning-filled", `Trimiteți informațiile cerute până la <strong>${escape(longDate(dosar.info?.until))}</strong>`);
      case "achitare": return paymentExpired(dosar)
        ? line("warning", "icon-circle-error-filled", `Taxa a expirat pe <strong>${escape(longDate(dosar.payment?.due))}</strong>. Achitarea nu mai este posibilă.`)
        : line("warning", "icon-credit-card", `Achitați taxa până la <strong>${escape(longDate(dosar.payment?.due))}</strong>`);
      case "derulare": return dosar.tacit
        ? line("info", "icon-time-filled", `Termenul de examinare a expirat pe <strong>${escape(longDate(dosar.examTerm))}</strong>`)
        : line("info", "icon-time-filled", `Răspuns până la <strong>${escape(longDate(dosar.examTerm))}</strong>`);
      default: return "";
    }
  }

  /* Solicitările mele row = the app's stacked-list item (.e-permits-stack__item), read at
     14px: title 16/24 semibold · tags · service line · authority · date · nr · deadline;
     actions right (labelled primary + ⋮). The whole row opens the profile. */
  function cardHtml(dosar) {
    const service = serviceOf(dosar);
    const part = (html, cls = "") => `<span class="e-permits-stack__part${cls ? ` ${cls}` : ""}">${html}</span>`;
    if (readOnly()) {
      /* US-159 AC-06: only nr, serviciu, data depunerii and the status at expiry */
      return `
        <li class="e-permits-stack__item sm-item is-static" data-sm-card="${escape(dosar.id)}">
          <div class="e-permits-stack__main">
            <div class="e-permits-stack__title-row"><h2 class="e-permits-stack__title">${escape(service.title || "")}</h2>${statusTag(dosar)}</div>
            <div class="e-permits-stack__meta">${part(copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`))}${part(`Depusă ${escape(longDate(dosar.submitted))}`)}</div>
          </div>
        </li>`;
    }
    const dateText = dosar.status === "schita" ? `Creată ${longDate(dosar.created)}` : `Depusă ${longDate(dosar.submitted)}`;
    /* US-19 AC-02 „Data estimată de finalizare” — finished requests too (derulare: the deadline line says it) */
    const end = estimatedEnd(dosar);
    const endText = !end || dosar.status === "derulare" ? "" : dosar.status === "finalizat" ? `Finalizată ${longDate(end)}` : `Finalizare estimată ${longDate(end)}`;
    const primary = primaryAction(dosar);
    return `
      <li class="e-permits-stack__item sm-item is-clickable${dosar.justAdded ? " is-new" : ""}" tabindex="0" aria-label="${escape(`${dosar.object} — ${statusOf(dosar).label}`)}" data-sm-card="${escape(dosar.id)}">
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <h2 class="e-permits-stack__title">${escape(dosar.object)}</h2>
            <span class="sm-item__tags">${statusTag(dosar)}${resultMarks(dosar)}${tacitListMark(dosar)}</span>
          </div>
          <div class="e-permits-stack__meta">${part(escape(dosar.tip))}${part(escape(service.title || ""))}</div>
          <div class="e-permits-stack__meta">${part(escape(authorityLabel(dosar)))}${part(escape(dateText))}${endText ? part(escape(endText)) : ""}${part(copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`))}</div>
          ${deadlineHtml(dosar)}
        </div>
        <div class="e-permits-stack__actions cab-card__actions">
          ${primary}
          ${actionsHtml(dosar).replace("e-permits-fo-intent-act__action cab-card__actions", "e-permits-fo-intent-act__action")}
        </div>
      </li>`;
  }

  function panelActive() {
    const panel = state.panel;
    return [panel.subFrom, panel.subTo, panel.endFrom, panel.endTo].filter(Boolean).length;
  }

  /* US-158 AC-04 / 05: Statut and Autoritatea emitentă = multi-select facets of the shared facet filter
     (js/facet-filter.js — the BO bar + popovers, the RAP phone sheets); OR inside a facet, AND across (AC-08) */
  const authorityValue = (dosar) => {
    const code = serviceOf(dosar).authority;
    return code ? `${code} · ${state.data.help[code]?.name || serviceOf(dosar).authorityName || ""}`.replace(/ · $/, "") : "";
  };
  const FACETS = [
    { key: "status", label: "Statut", get: (dosar) => statusOf(dosar).label },
    { key: "autoritate", label: "Autoritatea emitentă", get: authorityValue },
  ];
  const facetValues = (facet, dosar) => [].concat(facet.get(dosar) ?? []).filter(Boolean);
  function matchesFacets(dosar, except = null, selection = state.filter.applied) {
    return Object.entries(selection).every(([key, values]) => {
      if (key === except || !values?.length) return true;
      const facet = FACETS.find((f) => f.key === key);
      return !facet || facetValues(facet, dosar).some((value) => values.includes(value));
    });
  }
  /* search (AC-02) + the date ranges (AC-06 / 07) — everything but the facets */
  function matchesBase(dosar) {
    const query = fold(state.query.trim());
    const panel = state.panel;
    if (query && !fold([dosar.nr, serviceOf(dosar).title, dosar.object].join(" ")).includes(query)) return false;
    const submitted = isoDay(dosar.submitted);
    if (panel.subFrom && (!submitted || submitted < panel.subFrom)) return false;
    if (panel.subTo && (!submitted || submitted > panel.subTo)) return false;
    const end = isoDay(estimatedEnd(dosar));
    if (panel.endFrom && (!end || end < panel.endFrom)) return false;
    if (panel.endTo && (!end || end > panel.endTo)) return false;
    return true;
  }
  function facetOptions(facet, selection = state.filter.applied) {
    const counts = new Map();
    state.dosare.forEach((dosar) => {
      if (!matchesBase(dosar) || !matchesFacets(dosar, facet.key, selection)) return;
      new Set(facetValues(facet, dosar)).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    });
    (selection[facet.key] || []).forEach((value) => { if (!counts.has(value)) counts.set(value, 0); });
    const order = facet.key === "status" ? (value) => STATUS_ORDER.findIndex((id) => state.data.statuses[id]?.label === value) : null;
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
      sprite: SPRITE,
      state: () => state.filter,
      facets: availableFacets,
      allFacets: () => FACETS,
      options: facetOptions,
      tag: (value, facet) => {
        if (facet.key !== "status") return null;
        const id = Object.keys(state.data.statuses).find((key) => state.data.statuses[key].label === value);
        return C.tagHtml(value, STATUS_TONE[id] || "neutral");
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

  /* US-19 AC-02 / AC-03, US-158 AC-09: desktop = a table with the AC columns; each sortable header toggles
     ascending / descending (aria-sort + the BO sort chevron); the row opens the profile, the actions column is
     pinned. Phones (≤760) = the stacked cards + the „Sortează” menu (no headers to click). */
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  /* the AC-02 columns; order = what decides the next step first (Statut + Data estimată visible in the 1024
     column, Data depunerii + Autoritatea after a sideways scroll; Nr and Acțiuni pinned — the BO registry) */
  const COLUMNS = [
    { key: "nr", label: "Numărul dosarului", sort: "nr" },
    { key: "service", label: "Serviciul solicitat", sort: "service" },
    { key: "status", label: "Statut", sort: "status" },
    { key: "end", label: "Data estimată de finalizare", sort: "end" },
    { key: "submitted", label: "Data depunerii", sort: "submitted" },
    { key: "authority", label: "Autoritatea emitentă", sort: "authority" },
    { key: "actions", label: "Acțiuni" },
  ];
  /* US-159 AC-06: the read-only history keeps nr, serviciul, data depunerii and the status */
  const READ_ONLY_COLUMNS = ["nr", "service", "submitted", "status"];
  const DEFAULT_DIR = { nr: "asc", service: "asc", authority: "asc", submitted: "desc", end: "asc", status: "asc" };

  function sortHeaderHtml(column) {
    const [key, dir] = state.sort.split("-");
    if (!column.sort) return `<th scope="col" class="sm-table__th--${column.key}"><span class="sm-table__th-content"><span title="${escape(column.label)}">${escape(column.label)}</span></span></th>`;
    const on = key === column.sort;
    const ariaSort = on ? (dir === "asc" ? "ascending" : "descending") : "none";
    return `
      <th scope="col" class="sm-table__th--${column.key} is-sortable${on ? " is-sorted" : ""}" aria-sort="${ariaSort}">
        <button class="sm-table__th-content" type="button" data-sm-sort-col="${column.sort}">
          <span title="${escape(column.label)}">${escape(column.label)}</span>
          <span class="sm-table__sort${on ? ` is-${dir}` : ""}" aria-hidden="true">${icon("icon-chevron-bottom")}</span>
        </button>
      </th>`;
  }

  function cellStack(primary, secondary = "", { primaryTitle = primary, strong = false } = {}) {
    return `<span class="sm-table__stack"><span class="sm-table__primary${strong ? " is-strong" : ""}" title="${escape(primaryTitle)}">${escape(primary)}</span>${secondary ? `<span class="sm-table__secondary" title="${escape(secondary)}">${escape(secondary)}</span>` : ""}</span>`;
  }

  function rowHtml(dosar) {
    const service = serviceOf(dosar);
    const end = estimatedEnd(dosar);
    const columns = readOnly() ? COLUMNS.filter((column) => READ_ONLY_COLUMNS.includes(column.key)) : COLUMNS;
    const cell = {
      nr: `<td class="sm-table__nr">${copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`)}</td>`,
      service: `<td>${cellStack(service.title || "", readOnly() ? "" : `${dosar.tip} · ${dosar.object}`)}</td>`,
      authority: `<td>${cellStack(service.authority || "", dosar.subdivision || "", { primaryTitle: service.authorityName || service.authority || "" })}</td>`,
      submitted: `<td>${dosar.submitted ? cellStack(longDate(dosar.submitted)) : cellStack("—", `Creată ${longDate(dosar.created)}`)}</td>`,
      end: `<td>${end ? cellStack(longDate(end), dosar.status === "finalizat" ? "finalizat" : "") : cellStack("—")}</td>`,
      status: `<td><span class="sm-table__status"><span class="sm-item__tags">${statusTag(dosar)}${resultMarks(dosar)}</span>${tacitListMark(dosar)}${countdownHtml(dosar)}${paymentExpired(dosar) ? `<span class="sm-countdown sm-countdown--warning">${icon("icon-circle-error-filled")}<span>Taxa a expirat</span></span>` : ""}</span></td>`,
      actions: `<td class="sm-table__actions"><span class="sm-table__actions-inner cab-card__actions">${primaryAction(dosar)}${actionsHtml(dosar).replace("e-permits-fo-intent-act__action cab-card__actions", "e-permits-fo-intent-act__action")}</span></td>`,
    };
    const clickable = !readOnly();
    return `<tr class="sm-row${clickable ? " is-clickable" : " is-static"}${dosar.justAdded ? " is-new" : ""}"${clickable ? ` tabindex="0" aria-label="${escape(`${dosar.nr} — ${service.title || ""} — ${statusOf(dosar).label}`)}"` : ""} data-sm-card="${escape(dosar.id)}">${columns.map((column) => cell[column.key]).join("")}</tr>`;
  }

  function tableHtml(items) {
    const columns = readOnly() ? COLUMNS.filter((column) => READ_ONLY_COLUMNS.includes(column.key)) : COLUMNS;
    return `
      <div class="sm-table-scroller" data-sm-table-scroller>
        <table class="sm-table${readOnly() ? " is-read-only" : ""}">
          <caption class="u-visually-hidden">Solicitările mele</caption>
          <colgroup>${columns.map((column) => `<col class="sm-table__col--${column.key}">`).join("")}</colgroup>
          <thead><tr>${columns.map(sortHeaderHtml).join("")}</tr></thead>
          <tbody>${items.map(rowHtml).join("")}</tbody>
        </table>
      </div>`;
  }

  function sortMenuHtml() {
    return SORTS.map((sort) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${sort.id === state.sort}" data-sm-sort="${sort.id}"><span>${escape(sort.label)}</span>${sort.id === state.sort ? icon("icon-checkmark-large", "medium") : ""}</button></li>`).join("");
  }

  /* the list shell is built once (search, „Filtre”, „Perioadă”, the facet bar keep their DOM / focus); only the
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
          <button class="btn btn-neutral btn-sm e-permits-workplace__advanced cab-filter" type="button" aria-expanded="false" aria-controls="sm-filters" data-sm-filter-toggle>
            <svg class="icon" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#icon-filter-lines"></use></svg>
            <span>Filtre</span>
            <span class="badge badge--lg badge--solid-light" data-sm-filter-count hidden></span>
          </button>
          <button type="button" class="btn btn-neutral btn-sm cab-filter cab-period" aria-haspopup="dialog" aria-expanded="false" data-sm-filter-open>
            <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-calendar"></use></svg>
            <span>Perioadă</span>
            <span class="badge badge--lg badge--solid-light" data-sm-period-count hidden></span>
          </button>
          <div class="e-permits-fo-intent-act__action cab-sort">
            <button type="button" class="btn btn-neutral btn-sm cab-sort__trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="sm-sort-menu" data-cab-menu-trigger>
              <span>Sortează</span>
              <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--wide" id="sm-sort-menu" role="menu" aria-label="Sortează solicitările" hidden data-sm-sort-menu></ul>
          </div>
        </div>
        <div class="e-permits-workplace__filters cab-filters" id="sm-filters" role="group" aria-label="Filtre" data-sm-filters hidden></div>
        <div class="sm-results" data-sm-results></div>
      </div>
      <div class="sm-profile-view" data-sm-profile-view hidden></div>`;
    initFacetFilter();
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

    lead.innerHTML = `${readOnly() ? readOnlyBanner() : ""}${state.notice ? `<div class="cab-notice">${message(state.notice.tone, state.notice.icon, state.notice.html, { role: "status" })}</div>` : ""}`;
    const search = view.querySelector("[data-sm-search]");
    if (search.value !== state.query) search.value = state.query;
    search.closest(".search-input").classList.toggle("has-value", Boolean(state.query));
    search.closest(".search-input").classList.toggle("is-ready", Boolean(state.query));
    view.querySelector("[data-sm-search-clear]").disabled = !state.query;
    const periodCount = panelActive();
    const badge = view.querySelector("[data-sm-period-count]");
    badge.hidden = !periodCount;
    badge.textContent = String(periodCount);
    view.querySelector("[data-sm-sort-menu]").innerHTML = sortMenuHtml();

    results.innerHTML = state.searchFailed
      ? `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a putut fi actualizată. Încercați din nou.", "data-sm-search-retry")}</div>`
      : pageItems.length
        ? `${phoneQuery.matches
          ? `<section class="e-permits-stack sm-list" aria-label="Lista solicitărilor"><ul class="e-permits-stack__list" role="list">${pageItems.map(cardHtml).join("")}</ul></section>`
          : tableHtml(pageItems)}${pagerHtml(all.length)}`
        : `<div class="cab-state">${fixAssets(window.GEAPEmptyState.noResults("Nu au fost găsite rezultate pentru criteriile selectate.", { text: "Modificați căutarea sau filtrele aplicate." }))}</div>`;
    facetFilter?.render();
    syncMetaRows();
  }
  phoneQuery.addEventListener("change", () => { if (!root.querySelector("[data-sm-list-view]")?.hidden) renderList(); });

  /* a meta line that wraps must not start with a dot (same rule as the app's
     stacked lists): parts that begin a new line get .is-row-start */
  function syncMetaRows() {
    root.querySelectorAll(".sm-list .e-permits-stack__meta").forEach((line) => {
      let previousTop = null;
      line.querySelectorAll(":scope > .e-permits-stack__part").forEach((part) => {
        const top = part.offsetTop;
        part.classList.toggle("is-row-start", previousTop === null || top > previousTop + 1);
        previousTop = top;
      });
    });
  }
  window.addEventListener("resize", () => syncMetaRows());

  /* ---------- profile (US-161) ---------- */

  /* BO detail rows / card / section (CabEvo, css/bo-profile-parts.css) */
  const row = (label, valueHtml) => C.detailRow(label, valueHtml);
  const rows = (list) => C.detailCard(list);
  const section = (id, title, body, { scope = false } = {}) => C.profileSection(`sm-sec-${id}`, title, body, { attrs: scope ? "data-sm-dl-scope" : "" });

  /* ---------- „Stadiul solicitării” (2026-10-17): ONE bordered card = the current status on top
     (Small tags + the status sentence / next step + the action that exists) · hairline · the timeline
     of the request (the FO finish timeline: done steps with their dates, the current one highlighted,
     the next ones dashed). Replaces the stepper + callout + loose action row + „Istoric complet”. */
  const STEP_STATE_TEXT = { done: "finalizat", current: "etapa curentă", attention: "necesită acțiunea dumneavoastră", rejected: "respins", todo: "urmează" };

  function statusNow(dosar) {
    const service = serviceOf(dosar);
    const where = [service.authority, dosar.subdivision].filter(Boolean).join(" — ");
    switch (dosar.status) {
      case "schita":
        return {
          title: `Schiță nedepusă · se elimină automat pe ${longDate(dosar.draft?.expires)}`,
          text: `Ați rămas la pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant"}”; datele completate sunt salvate. Continuați completarea ca să depuneți solicitarea.`,
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
        return { title: `Aprobată pe ${longDate(dosar.finalized)} · actul este disponibil`, text: "Actul permisiv emis este și în „Actele mele permisive”, de unde îl puteți vizualiza și descărca oricând." };
      default:
        return { title: statusOf(dosar).label, text: "" };
    }
  }

  /* the request's steps: what happened (dates, who) + what comes next (dashed, no date) */
  function timelineEvents(dosar) {
    const by = state.perspective?.mpower ? `${state.user?.name} în baza împuternicirii MPower` : state.user?.name || "solicitant";
    const where = `${serviceOf(dosar).authority} — ${dosar.subdivision}`;
    const events = [];
    if (dosar.status === "schita") {
      events.push({ state: "done", title: "Schiță creată", when: longDateTime(dosar.created), text: "Salvată automat." });
      events.push({ state: "current", title: "Completarea cererii", when: "", text: `Pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant"}” · până la ${longDate(dosar.draft?.expires)}` });
      events.push({ state: "todo", title: "Depunere și semnare", when: "", text: "" });
      events.push({ state: "todo", title: "Examinare și decizie", when: "", text: "" });
      return events;
    }
    const paidAtFiling = dosar.payment?.paid && !dosar.feeDuringExam ? ` Taxa de ${money(dosar.payment.amount)} a fost achitată prin MPay.` : "";
    events.push({ state: "done", title: "Solicitare depusă", when: longDateTime(dosar.submitted), text: `Semnată prin MSign de ${by}.${paidAtFiling}` });
    const examining = dosar.status === "derulare";
    events.push({ state: examining ? "current" : "done", title: "În examinare la autoritate", when: `din ${longDate(addDays(dosar.submitted, 1))}`, text: examining && dosar.examTerm ? `${where} · termen ${longDate(dosar.examTerm)}` : where });
    if (dosar.status === "info") events.push({ state: "attention", title: "Informații suplimentare solicitate", when: longDate(dosar.suspended), text: `Examinarea este suspendată · trimiteți-le până la ${longDate(dosar.info?.until)}.` });
    if (dosar.status === "achitare") events.push({ state: "attention", title: "Notă de plată emisă", when: longDateTime(dosar.payment?.created), text: paymentExpired(dosar) ? `${money(dosar.payment?.amount)} · termenul de achitare a expirat pe ${longDate(dosar.payment?.due)}.` : `${money(dosar.payment?.amount)} · de achitat până la ${longDate(dosar.payment?.due)}.` });
    if (dosar.status === "finalizat") {
      const rejected = dosar.result === "respins";
      events.push({ state: rejected ? "rejected" : "done", title: rejected ? "Solicitare respinsă" : "Solicitare aprobată", when: longDate(dosar.finalized), text: rejected ? "Decizia de refuz a fost semnată și comunicată." : dosar.decisionOnly ? "Decizia a fost semnată; starea actului a fost actualizată." : "Actul permisiv a fost semnat și emis." });
    } else {
      events.push({ state: "todo", title: "Decizia autorității", when: "", text: dosar.examTerm && dosar.status !== "info" ? `Termen: ${longDate(dosar.examTerm)}` : "" });
      events.push({ state: "todo", title: "Act emis", when: "", text: "Livrat în EVO Cabinet." });
    }
    return events;
  }

  function timelineHtml(dosar) {
    const icons = { done: "icon-circle-checkmark-filled", current: "icon-time-filled", attention: "icon-warning-filled", rejected: "icon-circle-error-filled" };
    const marker = (stateName) => (stateName === "todo"
      ? `<span class="e-permits-fo-finish-marker e-permits-fo-finish-marker--todo e-permits-fo-finish-marker--sm" aria-hidden="true"></span>`
      : `<svg class="icon e-permits-fo-finish-marker e-permits-fo-finish-marker--${stateName}" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#${icons[stateName]}"></use></svg>`);
    const events = timelineEvents(dosar);
    return `
      <ol class="e-permits-fo-finish-timeline cab-status__timeline" aria-label="Etapele solicitării">
        ${events.map((event, index) => {
          const now = event.state === "current" || event.state === "attention" || (event.state === "rejected" && index === events.length - 1);
          const done = event.state === "done" || (event.state === "rejected");
          return `
          <li class="e-permits-fo-finish-timeline__item is-${done && !now ? "done" : now ? "current" : "todo"}${now ? " is-now" : ""}"${now ? ' aria-current="step"' : ""}>
            <span class="e-permits-fo-finish-timeline__rail" aria-hidden="true">
              <span class="e-permits-fo-finish-timeline__marker">${marker(event.state)}</span>
              <span class="e-permits-fo-finish-timeline__line"></span>
            </span>
            <div class="e-permits-fo-finish-timeline__copy">
              <p class="e-permits-fo-finish-timeline__title"><span>${escape(event.title)}</span><span class="u-visually-hidden"> — ${STEP_STATE_TEXT[event.state]}</span></p>
              ${[event.when, event.text].filter(Boolean).length ? `<p class="e-permits-fo-finish-timeline__text">${escape([event.when, event.text].filter(Boolean).join(" · "))}</p>` : ""}
            </div>
          </li>`;
        }).join("")}
      </ol>`;
  }

  function statusCardHtml(dosar) {
    const now = statusNow(dosar);
    const actions = profileActions(dosar);
    return section("stadiu", "Stadiul solicitării", `
      <div class="cab-status" data-sm-status>
        <div class="cab-status__now">
          <div class="cab-status__tags">${statusTag(dosar)}${marksHtml(dosar)}</div>
          <p class="cab-status__title">${escape(now.title)}</p>
          ${now.text ? `<p class="cab-status__text">${escape(now.text)}</p>` : ""}
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
        buttons.push(`<button class="btn btn-neutral btn-md btn-rounded" type="button" data-sm-action="delete" data-sm-id="${escape(dosar.id)}">${icon("icon-delete")}<span>Elimină schița</span></button>`);
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
          <span class="e-permits-fo-authorization-card__title"><strong>${escape(auth.title || "Împuternicire MPower aplicată")}</strong>${auth.status ? `<span>${escape(auth.status)}</span>` : ""}</span>
          <span class="e-permits-fo-authorization-card__meta">
            ${items.map(([label, value], index) => `${index ? '<span class="e-permits-fo-authorization-card__dot" aria-hidden="true"></span>' : ""}<span class="e-permits-fo-authorization-card__meta-item"><span>${escape(label)}</span><strong>${escape(value)}</strong></span>`).join("")}
          </span>
        </span>
      </div>`;
  }

  /* Documente însoțitoare = the shared document cards (C.docRowHtml): the system certificate (generated)
     + what the applicant attached, each with „Detalii” → the document modal and ⋮ Descarcă */
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
    return `<div class="cab-docs">${docs.map((doc) => C.docRowHtml(doc, {
      key: `${dosar.id}|${doc.id}`,
      downloadAttrs: `data-sm-action="download" data-sm-kind="${doc.kind}" data-sm-id="${escape(dosar.id)}"`,
    })).join("")}</div>`;
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
    const until = service.validityYears ? addDays(dosar.finalized, Math.round(service.validityYears * 365.25)) : "";
    /* AC-29: the act's service-specific fields (as configured per service — the same groups the act profile shows) */
    const act = state.acts.find((item) => item.id === dosar.actId);
    const specific = act ? C.actGroups({ ...act, title: act.name }) : [];
    return section("act", "Act permisiv", `
      ${rows([
        row("Titlul actului", escape(service.actTitle || service.title || "")),
        row("Numărul actului", copyValue(dosar.actNr, `Copiază numărul actului ${dosar.actNr}`)),
        row("Nr. dosar", escape(dosar.nr)),
        beneficiary ? row("Beneficiar", escape(beneficiary)) : "",
        row("Valabil din", escape(longDate(dosar.finalized))),
        until ? row("Valabil până la", escape(longDate(until))) : "",
        row("Data emiterii", escape(longDate(dosar.finalized))),
        dosar.issuedBy ? row("Emisă de", escape(dosar.issuedBy)) : "",
        row("Subdiviziunea de examinare", escape(dosar.subdivision)),
      ])}
      ${downloadButton("act", "Descarcă actul (MDocs)")}`, { scope: true })
      + specific.map((group, index) => section(`act-specific-${index}`, group.title || "Date specifice actului", rows(group.rows.map(([label, value]) => row(label, escape(value)))))).join("");
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

    const roles = beneficiary && applicant ? `
      <section class="e-permits-dosar-profil__section cab-section" aria-label="Beneficiar și solicitant">
        <div class="e-permits-fo-form__roles cab-roles${sameperson ? " is-single" : ""}">
          <div class="e-permits-fo-form__roles-grid">
            ${sameperson ? roleGroup("Solicitant", applicant, { me: true }) : `${roleGroup("Beneficiar", beneficiary)}${roleGroup("Solicitant", applicant, { me: true })}`}
          </div>
          ${state.perspective?.mpower ? authorizationHtml(subject) : ""}
        </div>
      </section>` : "";

    const details = section("detalii", "Date solicitare", rows([
      row("Denumirea obiectului", escape(dosar.object)),
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
    const delivery = section("livrare", "Livrare", rows([row("Metoda de livrare", "Livrare electronică (EVO Cabinet)")]));

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
          title: dosar.object,
          titleId: "sm-profile-title",
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
    hideTip();
    const match = /^#dosar\/([\w-]+)(?:\/(\w+))?$/.exec(window.location.hash);
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
        <div class="e-permits-fo-instance-switch-modal__actions">
          <button class="e-permits-fo-instance-switch-modal__secondary" type="button" data-sm-confirm-cancel>${escape(cancelLabel)}</button>
          <button class="e-permits-fo-instance-switch-modal__primary${danger ? " e-permits-fo-instance-switch-modal__primary--danger" : ""}" type="button" data-sm-confirm-ok>${escape(confirmLabel)}</button>
        </div>
      </div>`;
    modal.hidden = false;
    modal.onclick = (event) => {
      if (event.target.closest("[data-sm-confirm-ok]")) { closeConfirm(); onConfirm?.(); }
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

  function confirmDelete(dosar) {
    openConfirm({
      iconId: "icon-delete",
      danger: true,
      title: "Eliminați schița?",
      paragraphs: [
        `Schița <strong>${escape(dosar.object)}</strong> (${escape(dosar.nr)}) va fi eliminată definitiv din Solicitările mele.`,
        "Datele completate nu mai pot fi recuperate. Pentru același serviciu puteți începe oricând o solicitare nouă.",
      ],
      confirmLabel: "Elimină schița",
      onConfirm: () => {
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

  /* ---------- filters panel (US-158 AC-04/06/07/11) ---------- */

  function datePickerHtml(id, label, iso) {
    const [y, m, d] = iso ? iso.split("-") : [];
    const view = (iso || TODAY).split("-");
    return `
      <div class="e-permits-fo-field">
        <label for="${id}">${escape(label)}</label>
        <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escape(iso || "")}" data-today="${TODAY}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
          <div class="e-permits-fo-input e-permits-fo-input--with-action">
            <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off" data-sm-date="${id}">
            <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${id}-panel" aria-expanded="false">${icon("icon-calendar", "medium")}</button>
          </div>
          <div id="${id}-panel" class="date-picker-panel" aria-hidden="true" hidden>
            <div class="date-picker" role="dialog" aria-label="Alege data">
              <div class="date-picker__header">
                <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară">${icon("icon-chevron-left", "medium")}</button>
                <div class="date-picker__month js-date-picker-label"></div>
                <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare">${icon("icon-chevron-right", "medium")}</button>
              </div>
              <div class="date-picker__grid date-picker__grid--days" data-view="day">
                <div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div>
                <div class="date-picker__days js-date-picker-days"></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function openFilters(opener) {
    let overlay = document.querySelector("[data-sm-filter-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "e-permits-fo-doc-modal-overlay cab-filter-modal";
      overlay.dataset.smFilterModal = "";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "sm-filter-title");
      document.body.appendChild(overlay);
    }
    modalOpener = opener;
    opener?.setAttribute("aria-expanded", "true");
    const panel = state.panel;
    overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 id="sm-filter-title" class="e-permits-fo-doc-modal__title">Perioadă</h2>
            <p class="e-permits-fo-doc-modal__subtitle">Intervalele se aplică împreună cu căutarea și filtrele alese.</p>
          </div>
          <button class="e-permits-fo-doc-modal__close" type="button" aria-label="Închide" data-sm-filter-close>${icon("icon-cross-large")}</button>
        </div>
        <div class="cab-filter__body">
          <fieldset class="cab-filter__group">
            <legend class="cab-filter__legend">Data depunerii</legend>
            <div class="cab-filter__range" data-sm-range="sub">
              ${datePickerHtml("sm-sub-from", "De la", panel.subFrom)}
              ${datePickerHtml("sm-sub-to", "Până la", panel.subTo)}
            </div>
          </fieldset>
          <fieldset class="cab-filter__group">
            <legend class="cab-filter__legend">Data estimată de finalizare</legend>
            <div class="cab-filter__range" data-sm-range="end">
              ${datePickerHtml("sm-end-from", "De la", panel.endFrom)}
              ${datePickerHtml("sm-end-to", "Până la", panel.endTo)}
            </div>
          </fieldset>
        </div>
        <div class="e-permits-fo-doc-modal__footer">
          <button class="e-permits-fo-doc-modal__cancel" type="button" data-sm-filter-reset>Resetează</button>
          <button class="e-permits-fo-doc-modal__submit" type="button" data-sm-filter-apply>Aplică filtrele</button>
        </div>
      </div>`;
    overlay.hidden = false;
    window.GEAPDatePicker?.init(overlay);
    overlay.querySelector("[data-sm-filter-close]")?.focus();
  }

  function closeFilters() {
    const overlay = document.querySelector("[data-sm-filter-modal]");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.querySelector("[data-sm-filter-open]")?.setAttribute("aria-expanded", "false");
    document.querySelector("[data-sm-filter-open]")?.focus();
  }

  const pickerValue = (overlay, id) => overlay.querySelector(`#${id}`)?.closest("[data-date-picker]")?.dataset.selected || "";

  /* AC-11: „Până la” before „De la” → inline error, nothing applied */
  function validateRanges(overlay) {
    let valid = true;
    [["sm-sub-from", "sm-sub-to"], ["sm-end-from", "sm-end-to"]].forEach(([fromId, toId]) => {
      const from = pickerValue(overlay, fromId);
      const to = pickerValue(overlay, toId);
      const field = overlay.querySelector(`#${toId}`)?.closest(".e-permits-fo-field");
      field?.querySelector(".e-permits-fo-field__error")?.remove();
      field?.querySelector(".e-permits-fo-input")?.classList.remove("is-error");
      if (from && to && to < from) {
        valid = false;
        field?.querySelector(".e-permits-fo-input")?.classList.add("is-error");
        field?.insertAdjacentHTML("beforeend", `<p class="message message--inline e-permits-fo-field__error" role="alert">${icon("icon-circle-error-filled", "medium")}<span>Data „Până la” nu poate fi anterioară datei „De la”.</span></p>`);
      }

    });
    return valid;
  }

  function applyFilters(overlay) {
    if (!validateRanges(overlay)) {
      overlay.querySelector(".e-permits-fo-input.is-error input")?.focus();
      return;
    }
    state.panel = {
      subFrom: pickerValue(overlay, "sm-sub-from"),
      subTo: pickerValue(overlay, "sm-sub-to"),
      endFrom: pickerValue(overlay, "sm-end-from"),
      endTo: pickerValue(overlay, "sm-end-to"),
    };
    state.page = 1;
    closeFilters();
    renderList();
    document.querySelector("[data-sm-filter-open]")?.focus();
  }

  /* ---------- downloads (US-19 AC-12 / AC-14) ---------- */

  function download(button) {
    root.querySelectorAll("[data-sm-download-error]").forEach((node) => node.remove());
    if (params.get("descarcare") !== "eroare") return;
    if (button.closest("tr.sm-row")) {
      root.querySelector("[data-sm-lead]")?.insertAdjacentHTML("beforeend", `<div class="cab-notice" data-sm-download-error>${message("banner--error", "icon-circle-error-filled", "A apărut o eroare. Descărcarea nu a fost efectuată. Încercați din nou.", { role: "alert" })}</div>`);
      root.querySelector("[data-sm-download-error]")?.scrollIntoView({ block: "nearest" });
      return;
    }
    const scope = button.closest("[data-sm-dl-scope]") || button.closest(".sm-item") || root.querySelector(".cab-status__actions");
    const html = message("banner--error", "icon-circle-error-filled", "A apărut o eroare. Descărcarea nu a fost efectuată. Încercați din nou.", { role: "alert", attrs: "data-sm-download-error" });
    if (scope?.classList.contains("sm-item")) scope.querySelector(".e-permits-stack__main")?.insertAdjacentHTML("beforeend", html);
    else if (scope?.matches(".cab-status__actions, .cab-detail__actions")) scope.insertAdjacentHTML("afterend", html);
    else scope?.insertAdjacentHTML("beforeend", html);
    root.querySelector("[data-sm-download-error]")?.scrollIntoView({ block: "nearest" });
  }

  /* US-24 AC-04: the error notice with „Reîncercați” (btn-strict) under the action that failed — in the
     status card on the profile, in the row on the list */
  function redirectError(action) {
    root.querySelectorAll("[data-sm-redirect-error]").forEach((node) => node.remove());
    const html = `
      <div class="cab-retry" data-sm-redirect-error>
        ${message("banner--error", "icon-circle-error-filled", "Formularul de suplinire nu s-a deschis. Datele dosarului nu s-au pierdut.", { role: "alert" })}
        <button class="btn btn-strict btn-sm" type="button" data-sm-redirect-retry="${escape(action.getAttribute("href") || "")}">${icon("icon-rotate-arrow")}<span>Reîncercați</span></button>
      </div>`;
    const item = action.closest(".sm-item");
    if (action.closest("tr.sm-row")) root.querySelector("[data-sm-lead]")?.insertAdjacentHTML("beforeend", html.replace('class="cab-retry"', 'class="cab-retry cab-notice"'));
    else if (item) item.querySelector(".e-permits-stack__main")?.insertAdjacentHTML("beforeend", html);
    else (action.closest(".cab-status__actions") || action).insertAdjacentHTML("afterend", html);
    root.querySelector("[data-sm-redirect-retry]")?.focus();
  }

  /* ---------- tooltip for „Disponibilă aprobarea tacită” (library .tooltip) ---------- */

  let tip = null;
  function showTip(target) {
    hideTip();
    tip = document.createElement("div");
    tip.className = "tooltip tooltip--top-center cab-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.id = "sm-tip";
    tip.innerHTML = `<div class="tooltip-inner">${escape(target.dataset.smTip)}</div><div class="tooltip-arrow"></div>`;
    document.body.appendChild(tip);
    const rect = target.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - box.width / 2), window.innerWidth - box.width - 8);
    tip.style.left = `${left + window.scrollX}px`;
    tip.style.top = `${rect.top + window.scrollY - box.height - 8}px`;
    target.setAttribute("aria-describedby", "sm-tip");
    requestAnimationFrame(() => tip?.classList.add("show"));
  }
  function hideTip() {
    document.querySelectorAll("[aria-describedby='sm-tip']").forEach((el) => el.removeAttribute("aria-describedby"));
    tip?.remove();
    tip = null;
  }

  /* ---------- events ---------- */

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
      /* AC-03 / AC-09: a header toggles its direction; another column starts in its natural direction */
      const sortCol = target.closest("[data-sm-sort-col]");
      if (sortCol) {
        const [key, dir] = state.sort.split("-");
        const col = sortCol.dataset.smSortCol;
        state.sort = `${col}-${key === col ? (dir === "asc" ? "desc" : "asc") : DEFAULT_DIR[col] || "asc"}`;
        state.page = 1;
        renderList();
        root.querySelector(`[data-sm-sort-col="${col}"]`)?.focus();
        return;
      }
      const sort = target.closest("[data-sm-sort]");
      if (sort) { state.sort = sort.dataset.smSort; state.page = 1; C.closeMenus(); renderList(); root.querySelector(".cab-sort__trigger")?.focus(); return; }
      const size = target.closest("[data-sm-per-page]");
      if (size) { state.perPage = Number(size.dataset.smPerPage); state.page = 1; C.closeMenus(); renderList(); return; }
      const page = target.closest("[data-sm-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.smPage); renderList(); root.querySelector("#sm-title")?.scrollIntoView({ block: "start" }); return; }
      const tab = target.closest("[data-sm-tab]");
      if (tab) { selectTab(tab.dataset.smTab); return; }
      const filterOpen = target.closest("[data-sm-filter-open]");
      if (filterOpen) { openFilters(filterOpen); return; }
      if (target.closest("[data-sm-back]")) { event.preventDefault(); history.pushState(null, "", window.location.pathname + window.location.search); route(); return; }
      if (target.closest("[data-sm-tip]")) { event.stopPropagation(); showTip(target.closest("[data-sm-tip]")); return; }

      /* documents: „Detalii” or the card itself → the document modal (not from the ⋮ menu) */
      const docOpen = target.closest("[data-cab-doc-open]") || (!target.closest("button, a, .cab-card__actions, [data-fo-copy-value]") && target.closest(".cab-doc[data-cab-doc]"));
      if (docOpen) { C.closeMenus(); openDosarDoc(docOpen.dataset.cabDocOpen || docOpen.dataset.cabDoc); return; }

      const action = target.closest("[data-sm-action]");
      if (action) {
        const dosar = state.dosare.find((item) => item.id === (action.dataset.smId || root.querySelector("[data-sm-profile]")?.dataset.smProfile));
        /* US-24 AC-04 (demo ?redirectionare=eroare): the redirect to the suplinire form fails → the error
           notice + „Reîncercați” in place, nothing navigates */
        if (action.dataset.smAction === "supplement" && params.get("redirectionare") === "eroare") {
          event.preventDefault();
          C.closeMenus();
          redirectError(action);
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
      if (card && !card.classList.contains("is-static") && !target.closest(".cab-card__actions, [data-fo-copy-value], .cab-mark, .sm-tacit")) {
        window.location.hash = `#dosar/${card.dataset.smCard}`;
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
      const card = event.target.matches?.("[data-sm-card]") ? event.target : null;
      if (card && (event.key === "Enter" || event.key === " ") && !card.classList.contains("is-static")) {
        event.preventDefault();
        window.location.hash = `#dosar/${card.dataset.smCard}`;
      }
    });

    /* tooltip on hover / keyboard focus */
    root.addEventListener("pointerover", (event) => { const el = event.target.closest?.("[data-sm-tip]"); if (el) showTip(el); });
    root.addEventListener("pointerout", (event) => { if (event.target.closest?.("[data-sm-tip]") && !event.relatedTarget?.closest?.("[data-sm-tip]")) hideTip(); });
    root.addEventListener("focusin", (event) => { const el = event.target.closest?.("[data-sm-tip]"); if (el) showTip(el); });
    root.addEventListener("focusout", (event) => { if (event.target.closest?.("[data-sm-tip]")) hideTip(); });

    document.addEventListener("click", (event) => {
      const overlay = event.target.closest("[data-sm-filter-modal]");
      if (!overlay) return;
      if (event.target === overlay || event.target.closest("[data-sm-filter-close]")) { closeFilters(); return; }
      if (event.target.closest("[data-sm-filter-reset]")) {
        state.panel = { subFrom: "", subTo: "", endFrom: "", endTo: "" };
        state.page = 1;
        closeFilters();
        renderList();
        return;
      }
      if (event.target.closest("[data-sm-filter-apply]")) applyFilters(overlay);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      hideTip();
      closeConfirm();
      closeFilters();
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
      state.notice = { tone: "banner--info", icon: "icon-cloud-upload-success", html: "Schița a fost salvată. O puteți continua oricând până la eliminarea automată." };
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
        fetch("../data/cabinet-evo-solicitari.json").then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
        fetch("../data/acte-permisive.json").then((response) => response.json()).catch(() => null),
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
      state.dosare = (state.perspective.dosare || []).filter((dosar) => !deleted.includes(dosar.id)).map((dosar) => ({ ...dosar }));
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
