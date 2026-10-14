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
    panel: { authorities: [], subFrom: "", subTo: "", endFrom: "", endTo: "" },
    notice: null,
    searchFailed: false,
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

  /* estimated completion (US-19 column „Data estimată de finalizare”) */
  function estimatedEnd(dosar) {
    if (dosar.status === "finalizat") return dosar.finalized || "";
    if (dosar.status === "derulare" || dosar.status === "achitare") return dosar.examTerm || "";
    return "";
  }

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

  /* empty-state.js builds root-relative sprite paths; this page lives one level down */
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

  function statusTag(dosar) {
    const status = statusOf(dosar);
    return `<span class="status-tag ${status.tag}">${escape(status.label)}</span>`;
  }

  /* Aprobat / Respins (US-19 AC-16) and „Disponibilă aprobarea tacită” (AC-15) */
  function marksHtml(dosar) {
    if (readOnly()) return "";
    if (dosar.status === "finalizat" && dosar.result === "aprobat") {
      return `<span class="cab-card__tacit">${icon("icon-checkmark-small")}Aprobat</span>`;
    }
    if (dosar.status === "finalizat" && dosar.result === "respins") {
      return `<span class="cab-card__tacit cab-card__tacit--danger">${icon("icon-cross-small")}Respins</span>`;
    }
    if (dosar.tacit && dosar.status === "derulare") {
      return `<button class="cab-card__tacit cab-mark" type="button" data-sm-tip="${escape(tacitNote(dosar))}" aria-label="Disponibilă aprobarea tacită. ${escape(tacitNote(dosar))}">${icon("icon-checkmark-small")}Disponibilă aprobarea tacită</button>`;
    }
    return "";
  }

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
    if (dosar.status === "achitare") items.push({ action: "pay", icon: "icon-credit-card", label: `Achită ${money(dosar.payment?.amount)}` });
    if (dosar.status === "derulare" || dosar.status === "info" || dosar.status === "achitare") items.push({ action: "download", kind: "certificat", icon: "icon-download", label: "Descarcă certificatul constatator" });
    if (dosar.status === "finalizat" && dosar.result === "aprobat" && dosar.actId) {
      items.push({ action: "act", icon: "icon-page-text", label: "Vezi actul", href: cabUrl("acte", { act: dosar.actId }) });
      items.push({ action: "download", kind: dosar.decisionOnly ? "decizie" : "act", icon: "icon-download", label: dosar.decisionOnly ? "Descarcă decizia (MDocs)" : "Descarcă actul (MDocs)" });
    }
    if (dosar.status === "finalizat" && dosar.result === "respins") items.push({ action: "download", kind: "decizie", icon: "icon-download", label: "Descarcă decizia (MDocs)" });
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
    if (dosar.status === "achitare") return `<button class="btn btn-neutral btn-sm" type="button" data-sm-action="pay" data-sm-id="${escape(dosar.id)}">Achitare</button>`;
    if (dosar.status === "finalizat" && dosar.result === "aprobat" && dosar.actId) return `<a class="btn btn-neutral btn-sm" href="${escape(cabUrl("acte", { act: dosar.actId }))}" data-sm-action="act" data-sm-id="${escape(dosar.id)}">Vezi actul</a>`;
    return "";
  }

  /* the deadline of the row: one 14/20 line, icon in the status tone, date in medium */
  function deadlineHtml(dosar) {
    if (readOnly()) return "";
    const line = (tone, iconId, html) => `<p class="sm-item__deadline sm-item__deadline--${tone}">${icon(iconId)}<span>${html}</span></p>`;
    switch (dosar.status) {
      case "schita": return line("warning", "icon-time", `Schița se elimină automat pe <strong>${escape(longDate(dosar.draft?.expires))}</strong>`);
      case "info": return line("warning", "icon-warning-filled", `Trimiteți informațiile cerute până la <strong>${escape(longDate(dosar.info?.until))}</strong>`);
      case "achitare": return line("warning", "icon-credit-card", `Achitați taxa până la <strong>${escape(longDate(dosar.payment?.due))}</strong>`);
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
    const primary = primaryAction(dosar);
    return `
      <li class="e-permits-stack__item sm-item is-clickable${dosar.justAdded ? " is-new" : ""}" tabindex="0" aria-label="${escape(`${dosar.object} — ${statusOf(dosar).label}`)}" data-sm-card="${escape(dosar.id)}">
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <h2 class="e-permits-stack__title">${escape(dosar.object)}</h2>
            <span class="sm-item__tags">${statusTag(dosar)}${marksHtml(dosar)}</span>
          </div>
          <div class="e-permits-stack__meta">${part(escape(dosar.tip))}${part(escape(service.title || ""))}</div>
          <div class="e-permits-stack__meta">${part(escape(authorityLabel(dosar)))}${part(escape(dateText))}${part(copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`))}</div>
          ${deadlineHtml(dosar)}
        </div>
        <div class="e-permits-stack__actions cab-card__actions">
          ${primary}
          ${actionsHtml(dosar).replace("e-permits-fo-intent-act__action cab-card__actions", "e-permits-fo-intent-act__action")}
        </div>
      </li>`;
  }

  function inFilter(dosar, filterId) {
    const filter = state.data.filters.find((item) => item.id === filterId);
    return !filter?.statuses || filter.statuses.includes(dosar.status);
  }

  function panelActive() {
    const panel = state.panel;
    return panel.authorities.length + [panel.subFrom, panel.subTo, panel.endFrom, panel.endTo].filter(Boolean).length;
  }

  /* search (US-158 AC-02: partial, case- and diacritic-insensitive) AND panel filters
     (AC-04/06/07) AND the status chip, then the sort (AC-08) */
  function filtered({ ignoreChip = false } = {}) {
    const query = fold(state.query.trim());
    const panel = state.panel;
    return state.dosare.filter((dosar) => {
      if (!ignoreChip && !inFilter(dosar, state.filter)) return false;
      if (query && !fold([dosar.nr, serviceOf(dosar).title, dosar.object].join(" ")).includes(query)) return false;
      if (panel.authorities.length && !panel.authorities.includes(serviceOf(dosar).authority)) return false;
      const submitted = isoDay(dosar.submitted);
      if (panel.subFrom && (!submitted || submitted < panel.subFrom)) return false;
      if (panel.subTo && (!submitted || submitted > panel.subTo)) return false;
      const end = isoDay(estimatedEnd(dosar));
      if (panel.endFrom && (!end || end < panel.endFrom)) return false;
      if (panel.endTo && (!end || end > panel.endTo)) return false;
      return true;
    });
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

  function chipsHtml() {
    const base = filtered({ ignoreChip: true });
    return state.data.filters.map((filter) => {
      const count = base.filter((dosar) => inFilter(dosar, filter.id)).length;
      const selected = filter.id === state.filter;
      return `
        <button class="chip${selected ? " is-selected" : ""}" type="button" role="tab" aria-selected="${selected}" aria-pressed="${selected}" data-sm-chip="${escape(filter.id)}">
          <span class="chip__label">${escape(filter.label)}</span>
          <span class="chip__badge${filter.accent && count > 0 && !readOnly() ? " chip__badge--accent" : ""}">${count}</span>
        </button>`;
    }).join("");
  }

  function pagerHtml(total) {
    /* US-158: no pagination below the smallest page size */
    if (total <= PER_PAGE[0]) return "";
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    const first = (state.page - 1) * state.perPage + 1;
    const last = Math.min(total, state.page * state.perPage);
    const link = (page, label, { disabled = false, active = false, aria = "" } = {}) => `
      <span class="pagination__item">
        <button class="pagination__link${active ? " pagination__link--active" : ""}${disabled ? " pagination__link--disabled" : ""}" type="button" data-sm-page="${page}"${disabled ? " disabled" : ""}${active ? ' aria-current="page"' : ""}${aria ? ` aria-label="${aria}"` : ""}>${label}</button>
      </span>`;
    return `
      <div class="cab-pager">
        <p class="cab-pager__range">${first}–${last} din ${total}</p>
        <nav class="pagination" aria-label="Paginarea solicitărilor">
          ${link(state.page - 1, icon("icon-chevron-left-small", "medium"), { disabled: state.page === 1, aria: "Pagina anterioară" })}
          ${Array.from({ length: pages }, (_, index) => link(index + 1, String(index + 1), { active: index + 1 === state.page, aria: `Pagina ${index + 1}` })).join("")}
          ${link(state.page + 1, icon("icon-chevron-right-small", "medium"), { disabled: state.page === pages, aria: "Pagina următoare" })}
        </nav>
        <div class="e-permits-fo-intent-act__action">
          <button class="btn btn-text-neutral btn-sm cab-pager__size" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="sm-per-page" data-cab-menu-trigger><span>${state.perPage} pe pagină</span><svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg></button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--compact" id="sm-per-page" role="menu" aria-label="Dosare pe pagină" hidden>
            ${PER_PAGE.map((size) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${size === state.perPage}" data-sm-per-page="${size}"><span>${size} pe pagină</span>${size === state.perPage ? icon("icon-checkmark-large", "medium") : ""}</button></li>`).join("")}
          </ul>
        </div>
      </div>`;
  }

  function readOnlyBanner() {
    const ro = state.perspective.readOnly;
    const name = state.subject?.name || "beneficiar";
    return `
      <div class="e-permits-callout e-permits-callout--neutral cab-callout" role="status">
        <span class="e-permits-callout__icon" aria-hidden="true">${icon("icon-lock", "medium")}</span>
        <div class="e-permits-callout__content">
          <p class="e-permits-callout__title">Împuternicirea MPower a ${ro.reason === "revocat" ? "fost revocată" : "expirat"} pe ${escape(longDate(ro.since))}</p>
          <p class="e-permits-callout__text">Vedeți doar istoricul solicitărilor depuse pentru ${escape(name)}, cu statutul de la acea dată. Datele nu se mai actualizează, iar acțiunile nu sunt disponibile. Pentru acces complet, cereți beneficiarului o împuternicire nouă în MPower.</p>
        </div>
      </div>`;
  }

  function errorHtml(text, retry = "data-sm-retry") {
    return fixAssets(window.GEAPEmptyState.render({
      title: "A apărut o eroare",
      text,
      icon: "circle-error",
      actionHtml: `<button class="btn btn-neutral" type="button" ${retry}>${icon("icon-rotate-arrow", "medium")}<span>Încercați din nou</span></button>`,
    }));
  }

  function renderList() {
    C.setHeaderTitle("Solicitările mele");
    const intro = `
      <section class="cab-intro" aria-labelledby="sm-title">
        <h1 class="text-heading-h2" id="sm-title" tabindex="-1">Solicitările mele</h1>
        <p class="text-body-sm">Urmăriți dosarele depuse, reacționați la evenimente și inițiați acțiunile disponibile — fără să contactați direct autoritatea.</p>
      </section>`;

    /* US-19 AC-13 / US-159 AC-10 */
    if (params.get("eroare") === "lista" || (params.get("eroare") === "mpower" && state.perspective?.mpower)) {
      const text = params.get("eroare") === "mpower"
        ? "Verificarea drepturilor de reprezentare nu a putut fi efectuată. Încercați din nou."
        : "Lista solicitărilor nu a fost încărcată. Încercați din nou.";
      root.innerHTML = `${intro}<div class="cab-state" role="alert">${errorHtml(text)}</div>`;
      return;
    }

    const all = sorted(filtered());
    const pages = Math.max(1, Math.ceil(all.length / state.perPage));
    state.page = Math.min(state.page, pages);
    const pageItems = all.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    const filterCount = panelActive();
    const searchValue = escape(state.query);

    root.innerHTML = `
      ${intro}
      ${readOnly() ? readOnlyBanner() : ""}
      ${state.notice ? `<div class="cab-notice">${message(state.notice.tone, state.notice.icon, state.notice.html, { role: "status" })}</div>` : ""}
      <div class="cab-toolbar">
        <div class="search-input medium rectangular cab-search${state.query ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true">${icon("icon-search", "")}</span>
          <input class="input" type="search" autocomplete="off" placeholder="Caută după nr. dosar sau serviciu" aria-label="Caută în solicitări după numărul dosarului sau serviciu" value="${searchValue}" data-sm-search>
          <div class="btn-group cab-search__actions">
            <button class="btn-icon clear cab-search__clear" type="button" aria-label="Șterge căutarea" data-sm-search-clear${state.query ? "" : " disabled"}>
              <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-cross-small"></use></svg>
            </button>
          </div>
        </div>
        <button type="button" class="btn btn-neutral btn-sm cab-filter" aria-haspopup="dialog" aria-expanded="false" data-sm-filter-open>
          <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-filter-lines"></use></svg>
          <span>Filtre</span>
          ${filterCount ? `<span class="badge badge--lg badge--solid-light">${filterCount}</span>` : ""}
        </button>
        <div class="e-permits-fo-intent-act__action cab-sort">
          <button type="button" class="btn btn-neutral btn-sm cab-sort__trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="sm-sort-menu" data-cab-menu-trigger>
            <span>Sortează</span>
            <svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg>
          </button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--wide" id="sm-sort-menu" role="menu" aria-label="Sortează solicitările" hidden>
            ${SORTS.map((sort) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${sort.id === state.sort}" data-sm-sort="${sort.id}"><span>${escape(sort.label)}</span>${sort.id === state.sort ? icon("icon-checkmark-large", "medium") : ""}</button></li>`).join("")}
          </ul>
        </div>
      </div>
      <div class="cab-chips" role="tablist" aria-label="Filtrează după statut">${chipsHtml()}</div>
      ${state.searchFailed
        ? `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a putut fi actualizată. Încercați din nou.", "data-sm-search-retry")}</div>`
        : pageItems.length
          ? `<section class="e-permits-stack sm-list" aria-label="Lista solicitărilor"><ul class="e-permits-stack__list" role="list">${pageItems.map(cardHtml).join("")}</ul></section>${pagerHtml(all.length)}`
          : `<div class="cab-state">${fixAssets(window.GEAPEmptyState.noResults("Nu au fost găsite rezultate pentru criteriile selectate.", { text: "Modificați căutarea sau filtrele aplicate." }))}</div>`}
    `;
    syncMetaRows();
  }

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

  function row(label, valueHtml) {
    return `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label">${escape(label)}</span><div class="e-permits-fo-summary-row__value"><span>${valueHtml}</span></div></div>`;
  }

  const rows = (list) => `<div class="e-permits-fo-summary-card cab-detail__card">${list.filter(Boolean).join("")}</div>`;

  function section(id, title, body, { scope = false } = {}) {
    return `
      <section class="cab-section" aria-labelledby="sm-sec-${id}"${scope ? " data-sm-dl-scope" : ""}>
        <h2 class="e-permits-fo-finish__section-title" id="sm-sec-${id}">${escape(title)}</h2>
        ${body}
      </section>`;
  }

  function markerHtml(stateName) {
    const icons = { done: "icon-circle-checkmark-filled", current: "icon-time-filled", attention: "icon-warning-filled", rejected: "icon-circle-error-filled" };
    if (!icons[stateName]) return `<span class="e-permits-fo-finish-marker e-permits-fo-finish-marker--todo" aria-hidden="true"></span>`;
    return `<svg class="icon e-permits-fo-finish-marker e-permits-fo-finish-marker--${stateName}" width="24" height="24" aria-hidden="true"><use href="${SPRITE}#${icons[stateName]}"></use></svg>`;
  }

  const STEP_STATE_TEXT = { done: "finalizat", current: "în curs", attention: "necesită acțiunea dumneavoastră", rejected: "respins", todo: "urmează" };

  /* Depusă · Verificare · (Plată) · Decizie · Finalizat — Figma profile stepper */
  function trackerHtml(dosar) {
    if (dosar.status === "schita") return "";
    const steps = [{ label: "Depusă" }, { label: "Verificare" }];
    if (dosar.feeDuringExam) steps.push({ label: "Plată" });
    steps.push({ label: "Decizie" }, { label: dosar.result === "respins" ? "Respins" : "Finalizat" });
    const set = (states) => steps.forEach((step, index) => { step.state = states[index] || "todo"; });
    if (dosar.status === "derulare") set(dosar.feeDuringExam ? ["done", "done", "done", "current"] : ["done", "current"]);
    if (dosar.status === "info") set(["done", "attention"]);
    if (dosar.status === "achitare") set(["done", "done", "attention"]);
    if (dosar.status === "finalizat") set(steps.map((step, index) => (index === steps.length - 1 && dosar.result === "respins" ? "rejected" : "done")));
    return `
      <ol class="e-permits-fo-finish-tracker cab-tracker" aria-label="Progresul dosarului">
        ${steps.map((step) => `
          <li class="e-permits-fo-finish-tracker__item is-${step.state}"${["current", "attention"].includes(step.state) ? ' aria-current="step"' : ""}>
            <span class="e-permits-fo-finish-tracker__marker">${markerHtml(step.state)}</span>
            <span class="e-permits-fo-finish-tracker__label">${escape(step.label)}<span class="u-visually-hidden"> — ${STEP_STATE_TEXT[step.state]}</span></span>
          </li>`).join("")}
      </ol>`;
  }

  function calloutHtml(dosar) {
    const service = serviceOf(dosar);
    const where = `${service.authority} — ${dosar.subdivision}`;
    let tone = "info";
    let iconId = "icon-time-filled";
    let title = "";
    let text = "";
    switch (dosar.status) {
      case "schita":
        tone = "neutral";
        title = `Continuați completarea — schița se elimină automat pe ${longDate(dosar.draft?.expires)}`;
        text = `Solicitarea nu a fost încă transmisă. Ați rămas la pasul „${dosar.draft?.stepLabel || DRAFT_STEPS[dosar.draft?.step] || "Date solicitant"}”; datele completate sunt salvate.`;
        break;
      case "info":
        tone = "warning";
        iconId = "icon-warning-filled";
        title = `Trimiteți informațiile cerute până la ${longDate(dosar.info?.until)}`;
        text = `${dosar.info?.reason || ""} Completarea se face prin acțiunea „Suplinire informații”; după transmitere, examinarea continuă.`;
        break;
      case "achitare":
        tone = "warning";
        iconId = "icon-warning-filled";
        title = `Achitați ${money(dosar.payment?.amount)} până la ${longDate(dosar.payment?.due)}`;
        text = "Nota de plată se achită prin MPay pentru ca dosarul să continue examinarea. După achitare, statutul se actualizează automat.";
        break;
      case "derulare":
        if (dosar.tacit) {
          title = `Termenul de examinare a expirat pe ${longDate(dosar.examTerm)}`;
          text = `Dosarul este în examinare la ${where}. Autoritatea nu s-a pronunțat în termen, așa că solicitarea se consideră aprobată tacit; vă anunțăm imediat ce decizia este emisă.`;
        } else {
          title = `Răspuns până la ${longDate(dosar.examTerm)}`;
          text = `Dosarul este în examinare la ${where}. Nu trebuie să faceți nimic acum — vă anunțăm la orice schimbare.`;
        }
        break;
      case "finalizat":
        if (dosar.result === "respins") {
          tone = "danger";
          iconId = "icon-circle-error-filled";
          title = `Solicitarea a fost respinsă pe ${longDate(dosar.finalized)}`;
          text = canAppeal(dosar)
            ? `Motivul și recomandările autorității sunt în secțiunea Decizie. Puteți depune o contestație până la ${longDate(appealUntil(dosar))}.`
            : "Motivul și recomandările autorității sunt în secțiunea Decizie.";
        } else if (dosar.decisionOnly) {
          tone = "success";
          iconId = "icon-circle-checkmark-filled";
          title = `Solicitarea a fost aprobată pe ${longDate(dosar.finalized)}`;
          text = dosar.decision?.text || "";
        } else {
          tone = "success";
          iconId = "icon-circle-checkmark-filled";
          title = `Act disponibil din ${longDate(dosar.finalized)} — îl puteți descărca`;
          text = "Actul permisiv emis este disponibil și în „Actele mele permisive”, de unde îl puteți descărca oricând.";
        }
        break;
      default:
        return "";
    }
    return `
      <div class="e-permits-callout e-permits-callout--${tone}" role="status">
        <span class="e-permits-callout__icon" aria-hidden="true">${icon(iconId, "medium")}</span>
        <div class="e-permits-callout__content">
          <p class="e-permits-callout__title">${escape(title)}</p>
          ${text ? `<p class="e-permits-callout__text">${escape(text)}</p>` : ""}
        </div>
      </div>`;
  }

  function profileActions(dosar) {
    const buttons = [];
    const download = (kind, label, variant = "btn-neutral") => `<button class="btn ${variant} btn-md btn-rounded" type="button" data-sm-action="download" data-sm-kind="${kind}" data-sm-id="${escape(dosar.id)}">${icon("icon-download")}<span>${escape(label)}</span></button>`;
    const appeal = (variant) => `<a class="btn ${variant} btn-md btn-rounded" href="${escape(foUrl(dosar, "appeal"))}" data-sm-action="appeal">${icon("icon-judge-gavel")}<span>Depune contestație</span></a>`;
    switch (dosar.status) {
      case "schita":
        buttons.push(`<a class="btn btn-primary btn-md btn-rounded" href="${escape(foUrl(dosar, "draft"))}" data-sm-action="continue">${icon("icon-edit")}<span>Continuă schița</span></a>`);
        buttons.push(`<button class="btn btn-neutral btn-md btn-rounded" type="button" data-sm-action="delete" data-sm-id="${escape(dosar.id)}">${icon("icon-delete")}<span>Elimină schița</span></button>`);
        break;
      case "info":
        if (dosar.info?.until >= TODAY) buttons.push(`<a class="btn btn-primary btn-md btn-rounded" href="${escape(foUrl(dosar, "supplement"))}" data-sm-action="supplement">${icon("icon-page-upload")}<span>Suplinire informații</span></a>`);
        break;
      case "achitare":
        buttons.push(`
          <button class="btn btn-badge btn-badge--primary" type="button" data-sm-action="pay" data-sm-id="${escape(dosar.id)}">
            <span class="btn-badge__logo" aria-hidden="true"><img src="../assets/logos/m-platforms/m-pay.svg" alt=""></span>
            <span class="btn-badge__label">Achită ${escape(money(dosar.payment?.amount))} cu mpay</span>
          </button>`);
        break;
      case "derulare":
        buttons.push(download("certificat", "Descarcă certificatul constatator"));
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
    return buttons.length ? `<div class="cab-detail__actions" data-sm-dl-scope>${buttons.join("")}</div>` : "";
  }

  /* BO page-header meta: nr (copy) · tip · statut (+ marks) · the dates of the status */
  function headerMeta(dosar) {
    const meta = [
      ["Numărul dosarului", copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`)],
      ["Tipul solicitării", escape(dosar.tip)],
      ["Statutul", `${statusTag(dosar)}${marksHtml(dosar)}`],
    ];
    if (dosar.status === "schita") {
      meta.push(["Creată", escape(longDate(dosar.created))], ["Se elimină automat", escape(longDate(dosar.draft?.expires))]);
    } else {
      meta.push(["Data depunerii", escape(longDate(dosar.submitted))]);
      if (dosar.status === "finalizat") meta.push(["Data finalizării", escape(longDate(dosar.finalized))]);
      else if (dosar.status === "info") meta.push(["Suspendat din", escape(longDate(dosar.suspended))]);
      else if (dosar.examTerm) meta.push(["Termen de examinare", escape(longDate(dosar.examTerm))]);
    }
    return meta;
  }

  function factsHtml(dosar) {
    const items = [{ label: "Numărul dosarului", html: copyValue(dosar.nr, `Copiază numărul dosarului ${dosar.nr}`) }];
    if (dosar.status === "schita") {
      items.push({ label: "Creată", html: escape(longDateTime(dosar.created)) });
      items.push({ label: "Se elimină automat", html: escape(longDate(dosar.draft?.expires)) });
    } else {
      items.push({ label: "Data depunerii", html: escape(longDateTime(dosar.submitted)) });
      if (dosar.status === "finalizat") items.push({ label: "Data finalizării", html: escape(longDate(dosar.finalized)) });
      else if (dosar.status === "info") items.push({ label: "Suspendat din", html: escape(longDate(dosar.suspended)) });
      else if (dosar.examTerm) items.push({ label: "Termen de examinare", html: `${escape(longDate(dosar.examTerm))}${dosar.tacit ? ` ${marksHtml(dosar)}` : ""}` });
    }
    return `
      <dl class="cab-facts">
        ${items.map((item) => `<div class="cab-facts__item"><dt>${escape(item.label)}</dt><dd>${item.html}</dd></div>`).join("")}
      </dl>`;
  }

  function personHtml(person) {
    const isCompany = person.type === "PJ";
    const avatar = isCompany
      ? `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--icon" aria-hidden="true">${icon("icon-business", "medium")}</span>`
      : `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--initials" aria-hidden="true">${escape(person.initials || "")}</span>`;
    return `
      <div class="e-permits-fo-selected-role">
        <span class="e-permits-fo-selected-role__inner">
          ${avatar}
          <span class="e-permits-fo-selected-role__copy">
            <strong>${escape(person.name)}</strong>
            <span class="e-permits-fo-selected-role__meta">
              <span class="e-permits-fo-selected-role__id">
                <span class="e-permits-fo-selected-role__id-label">${escape(person.idLabel)}</span>
                <span class="e-permits-fo-copy-value e-permits-fo-copy-value--static e-permits-fo-selected-role__copy-id"><span>${escape(person.idValue)}</span></span>
              </span>
            </span>
          </span>
        </span>
      </div>`;
  }

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

  function historyHtml(dosar) {
    const by = state.perspective?.mpower ? `${state.user?.name} în baza împuternicirii MPower` : state.user?.name || "solicitant";
    const events = [];
    if (dosar.status === "schita") {
      events.push({ state: "done", title: "Schiță creată", when: longDateTime(dosar.created), text: `Salvată automat la pasul „${dosar.draft?.stepLabel || ""}”.` });
      events.push({ state: "todo", title: "Depunere", when: "", text: `Continuați până la ${longDate(dosar.draft?.expires)} ca solicitarea să nu fie eliminată.` });
    } else {
      const paidAtFiling = dosar.payment?.paid && !dosar.feeDuringExam ? ` Taxa de ${money(dosar.payment.amount)} a fost achitată prin MPay.` : "";
      events.push({ state: "done", title: "Solicitare depusă", when: longDateTime(dosar.submitted), text: `Semnată prin MSign de ${by}.${paidAtFiling}` });
      events.push({ state: dosar.status === "finalizat" ? "done" : "current", title: "În examinare la autoritate", when: longDate(addDays(dosar.submitted, 1)), text: `${serviceOf(dosar).authority} — ${dosar.subdivision}` });
      if (dosar.status === "info") events.push({ state: "attention", title: "Informații suplimentare solicitate", when: longDate(dosar.suspended), text: "Examinarea este suspendată până la transmiterea informațiilor." });
      if (dosar.status === "achitare") events.push({ state: "attention", title: "Notă de plată emisă", when: longDateTime(dosar.payment?.created), text: `${money(dosar.payment?.amount)} — de achitat până la ${longDate(dosar.payment?.due)}.` });
      if (dosar.status === "finalizat") {
        events.push({ state: dosar.result === "respins" ? "rejected" : "done", title: dosar.result === "respins" ? "Solicitare respinsă" : "Solicitare aprobată", when: longDate(dosar.finalized), text: dosar.result === "respins" ? "Decizia de refuz a fost semnată și comunicată." : dosar.decisionOnly ? "Decizia a fost semnată; statutul actului a fost actualizat." : "Actul permisiv a fost semnat și emis." });
      }
    }
    const marker = (stateName) => {
      if (stateName === "todo") return `<span class="e-permits-fo-finish-marker e-permits-fo-finish-marker--todo e-permits-fo-finish-marker--sm" aria-hidden="true"></span>`;
      const icons = { done: "icon-circle-checkmark-filled", current: "icon-time-filled", attention: "icon-warning-filled", rejected: "icon-circle-error-filled" };
      return `<svg class="icon e-permits-fo-finish-marker e-permits-fo-finish-marker--${stateName}" width="16" height="16" aria-hidden="true"><use href="${SPRITE}#${icons[stateName]}"></use></svg>`;
    };
    return `
      <ol class="e-permits-fo-finish-timeline">
        ${events.map((event) => `
          <li class="e-permits-fo-finish-timeline__item is-${event.state === "attention" || event.state === "rejected" ? "current" : event.state}">
            <span class="e-permits-fo-finish-timeline__rail" aria-hidden="true">
              <span class="e-permits-fo-finish-timeline__marker">${marker(event.state)}</span>
              <span class="e-permits-fo-finish-timeline__line"></span>
            </span>
            <div class="e-permits-fo-finish-timeline__copy">
              <p class="e-permits-fo-finish-timeline__title"><span>${escape(event.title)}</span></p>
              <p class="e-permits-fo-finish-timeline__text">${escape([event.when, event.text].filter(Boolean).join(" · "))}</p>
            </div>
          </li>`).join("")}
      </ol>`;
  }

  function actSection(dosar) {
    if (dosar.status !== "finalizat") return "";
    const service = serviceOf(dosar);
    const beneficiary = state.subject ? `${state.subject.name} · ${state.subject.idLabel} ${state.subject.idValue}` : "";
    const downloadButton = (kind, label) => `<div class="cab-detail__actions"><button class="btn btn-neutral btn-md btn-rounded" type="button" data-sm-action="download" data-sm-kind="${kind}" data-sm-id="${escape(dosar.id)}">${icon("icon-download")}<span>${escape(label)}</span></button></div>`;
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
      ${downloadButton("act", "Descarcă actul (MDocs)")}`, { scope: true });
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
      dosar.examTerm && dosar.status !== "info" ? row("Termenul de examinare", `${escape(longDate(dosar.examTerm))}${dosar.tacit ? ` ${marksHtml(dosar)}` : ""}`) : "",
      row("Statutul dosarului", `${statusTag(dosar)}${dosar.result ? ` ${marksHtml(dosar)}` : ""}`),
      row("Autoritatea", escape(service.authorityName || service.authority || "")),
      row("Subdiviziunea de procesare", escape(dosar.subdivision)),
      dosar.actNr ? row("Nr. actului generat", copyValue(dosar.actNr, `Copiază numărul actului ${dosar.actNr}`)) : "",
      dosar.prevActNr ? row("Nr. actului anterior", escape(dosar.prevActNr)) : "",
    ]));

    const roles = beneficiary && applicant ? `
      <section class="cab-section" aria-label="Beneficiar și solicitant">
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
      row("Statutul notei", `<span class="status-tag ${payment.status === "Achitat" ? "status-tag--success" : "status-tag--accent"} is-subtle status-tag--small">${escape(payment.status)}</span>`),
      row("Suma totală", escape(money(payment.amount))),
      row("Data creării", escape(longDateTime(payment.created))),
      payment.status === "Achitat" && payment.paid ? row("Data achitării", escape(longDateTime(payment.paid))) : "",
      payment.due && payment.status !== "Achitat" ? row("Termen de achitare", escape(longDate(payment.due))) : "",
    ])) : "";

    const history = section("istoric", "Istoric complet", historyHtml(dosar));
    const helpSection = section("ajutor", "Ai nevoie de ajutor?", rows([
      row("Autoritatea", escape(help.name || service.authorityName || "")),
      help.phone ? row("Telefon", `<a class="link link-primary" href="tel:${escape(help.phone.replace(/\s/g, ""))}">${escape(help.phone)}</a>`) : "",
      help.email ? row("Email", `<a class="link link-primary" href="mailto:${escape(help.email)}">${escape(help.email)}</a>`) : "",
    ]));

    root.innerHTML = `
      <article class="cab-detail sm-profile" aria-labelledby="sm-profile-title" data-sm-profile="${escape(dosar.id)}">
        ${C.pageHeader({
          crumbs: [{ label: "Solicitările mele", href: cabUrl("solicitari"), attr: "data-sm-back" }, { label: service.title || "" }, { label: dosar.nr }],
          title: dosar.object,
          titleId: "sm-profile-title",
          meta: headerMeta(dosar),
        })}
        ${trackerHtml(dosar)}
        ${calloutHtml(dosar)}
        ${profileActions(dosar)}
        ${general}
        ${roles}
        ${details}
        ${contacts}
        ${documents}
        ${delivery}
        ${taxes}
        ${actSection(dosar)}
        ${history}
        ${helpSection}
      </article>`;
    C.syncHeaderMeta();
    root.querySelector("#sm-profile-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);

  }

  /* ---------- routing ---------- */

  function route() {
    hideTip();
    const match = /^#dosar\/([\w-]+)$/.exec(window.location.hash);
    const dosar = match && !readOnly() && state.dosare.find((item) => item.id === match[1]);
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
    const authorities = [...new Set(state.dosare.map((dosar) => serviceOf(dosar).authority).filter(Boolean))];
    overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 id="sm-filter-title" class="e-permits-fo-doc-modal__title">Filtre</h2>
            <p class="e-permits-fo-doc-modal__subtitle">Criteriile se aplică împreună cu căutarea și statutul ales.</p>
          </div>
          <button class="e-permits-fo-doc-modal__close" type="button" aria-label="Închide" data-sm-filter-close>${icon("icon-cross-large")}</button>
        </div>
        <div class="cab-filter__body">
          <fieldset class="cab-filter__group">
            <legend class="cab-filter__legend">Autoritatea emitentă</legend>
            <div class="cab-filter__options">
              ${authorities.map((authority) => `
                <label class="checkbox checkbox--medium">
                  <input type="checkbox" class="checkbox-input" value="${escape(authority)}" data-sm-filter-authority${panel.authorities.includes(authority) ? " checked" : ""}>
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-texts"><span class="checkbox-label">${escape(authority)} · ${escape(state.data.help[authority]?.name || "")}</span></span>
                </label>`).join("")}
            </div>
          </fieldset>
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
      authorities: [...overlay.querySelectorAll("[data-sm-filter-authority]:checked")].map((box) => box.value),
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
    const scope = button.closest("[data-sm-dl-scope]") || button.closest(".sm-item") || root.querySelector(".cab-detail__actions");
    const html = message("banner--error", "icon-circle-error-filled", "A apărut o eroare. Descărcarea nu a fost efectuată. Încercați din nou.", { role: "alert", attrs: "data-sm-download-error" });
    if (scope?.classList.contains("sm-item")) scope.querySelector(".e-permits-stack__main")?.insertAdjacentHTML("beforeend", html);
    else if (scope?.classList.contains("cab-detail__actions")) scope.insertAdjacentHTML("afterend", html);
    else scope?.insertAdjacentHTML("beforeend", html);
    root.querySelector("[data-sm-download-error]")?.scrollIntoView({ block: "nearest" });
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
      const caret = event.target.selectionStart;
      renderList();
      const input = root.querySelector("[data-sm-search]");
      input?.focus();
      input?.setSelectionRange(caret, caret);
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
      if (target.closest("[data-sm-search-retry]")) { state.searchFailed = false; renderList(); return; }
      const chip = target.closest("[data-sm-chip]");
      if (chip) { state.filter = chip.dataset.smChip; state.page = 1; renderList(); root.querySelector(`[data-sm-chip="${state.filter}"]`)?.focus(); return; }
      const sort = target.closest("[data-sm-sort]");
      if (sort) { state.sort = sort.dataset.smSort; state.page = 1; C.closeMenus(); renderList(); root.querySelector(".cab-sort__trigger")?.focus(); return; }
      const size = target.closest("[data-sm-per-page]");
      if (size) { state.perPage = Number(size.dataset.smPerPage); state.page = 1; C.closeMenus(); renderList(); return; }
      const page = target.closest("[data-sm-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.smPage); renderList(); root.querySelector("#sm-title")?.scrollIntoView({ block: "start" }); return; }
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
      if (card && !card.classList.contains("is-static") && !target.closest(".cab-card__actions, [data-fo-copy-value], .cab-mark")) {
        window.location.hash = `#dosar/${card.dataset.smCard}`;
      }
    });

    root.addEventListener("keydown", (event) => {
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
        state.panel = { authorities: [], subFrom: "", subTo: "", endFrom: "", endTo: "" };
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
    const ppLabel = { reperfectare: "Reperfectare", prelungire: "Prelungire", duplicat: "Emitere duplicat", retragere: "Retragere", suspendare: "Suspendarea valabilității", reluare: "Reluarea valabilității" }[pp];
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
      state.perspective = data.perspectives[C.SUBJECT] || { dosare: [] };
      let deleted = [];
      try { deleted = JSON.parse(sessionStorage.getItem(DELETED_KEY) || "[]"); } catch { deleted = []; }
      state.dosare = (state.perspective.dosare || []).filter((dosar) => !deleted.includes(dosar.id)).map((dosar) => ({ ...dosar }));
      applyReturns();
      bind();
      route();
    } catch (error) {
      console.warn("[solicitari]", error);
      root.innerHTML = `<div class="cab-state" role="alert">${errorHtml("Lista solicitărilor nu a fost încărcată. Încercați din nou.")}</div>`;
    }
    document.documentElement.dataset.smReady = "true";
  }

  init();
})();
