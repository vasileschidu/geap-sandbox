/* Catalogul serviciilor — EVO portal (US-10 88202)
   AC-01 catalog with search + category filter · AC-02 full-text search (name, code,
   institution) · AC-03 service page (denumire, descriere, instituție, tip act, termen,
   cost, documente necesare) · AC-04…06 „Solicită online”: no session → MPass (fo-01),
   session → S3 instance choice, or „Ce vrei să soliciți?” (US-191, pp-02) when the
   person already has acts for the service. ?auth=0 = visitor without MPass.
   Reuses the cabinet vocabulary: cab-intro / cab-toolbar / cab-chips / cab-card /
   cab-detail / cab-facts, FO summary card and the empty state. */
(() => {
  "use strict";

  const C = window.CabEvo;
  if (!C || C.VIEW !== "catalog") return;

  const root = document.querySelector('[data-cab-view="catalog"]');
  const { icon, escape } = C;
  const FO = "../e-permits-acte-permisive.html";
  const APPLICANT = {
    PF: { icon: "icon-person", label: "Persoană fizică" },
    PJ: { icon: "icon-suitcase-2", label: "Persoană juridică" },
  };
  const state = { data: null, acts: [], subject: null, category: "toate", query: "" };

  const fold = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const fixAssets = (html) => html.replaceAll('href="assets/', 'href="../assets/');

  function matches(service, { ignoreCategory = false } = {}) {
    if (!ignoreCategory && state.category !== "toate" && service.category !== state.category) return false;
    const query = fold(state.query.trim());
    return !query || fold([service.title, service.code, service.authority, service.id].join(" ")).includes(query);
  }

  /* where „Solicită online” leads (US-10 AC-05/06, US-191) */
  function requestTarget(service) {
    if (!C.AUTH) return { href: `${FO}?flow=full`, hint: "Vă autentificați cu MPass, apoi completați cererea." };
    const hasActs = state.acts.some((act) => act.service === service.id);
    if (hasActs) return { href: `${FO}?flow=full#intent`, hint: "Aveți deja acte emise pentru acest serviciu — alegeți o solicitare nouă sau o acțiune pe un act existent." };
    return { href: `${FO}?flow=full#choice-authenticated`, hint: `Sunteți autentificat ca ${state.subject?.name || "utilizator MPass"}. Alegeți în numele cui depuneți cererea.` };
  }

  function onlineTag(service) {
    return service.online ? `<span class="status-tag status-tag--success is-subtle">Online</span>` : "";
  }

  function cardHtml(service) {
    return `
      <article class="cab-card" tabindex="0" aria-label="${escape(service.title)}" data-cat-card="${escape(service.id)}">
        <div class="cab-card__container">
          <div class="cab-card__head">
            <div class="cab-card__heading">
              <h2 class="cab-card__title">${escape(service.title)}</h2>
              <p class="cab-card__service">${escape(service.authority)}</p>
            </div>
            <div class="cab-card__tags">${onlineTag(service)}</div>
          </div>
          <div class="cab-card__meta">
            <span class="cab-card__meta-item">${icon("icon-page-text", "medium")}${escape(service.actType)}</span>
            <span class="cab-card__dot" aria-hidden="true"></span>
            <span class="cab-card__meta-item">${icon("icon-time", "medium")}${escape(service.term)}</span>
            <span class="cab-card__dot" aria-hidden="true"></span>
            <span class="cab-card__meta-item">${icon("icon-coins", "medium")}${escape(service.cost)}</span>
          </div>
        </div>
      </article>`;
  }

  function renderList() {
    C.setHeaderTitle("Catalogul serviciilor");
    const base = state.data.services.filter((service) => matches(service, { ignoreCategory: true }));
    const list = state.data.services.filter((service) => matches(service));
    root.innerHTML = `
      <section class="cab-intro" aria-labelledby="cat-title">
        <h1 class="text-heading-h2" id="cat-title" tabindex="-1">Catalogul serviciilor</h1>
        <p class="text-body-sm">Găsiți serviciul de care aveți nevoie, citiți condițiile și depuneți cererea online.</p>
      </section>
      <div class="cab-toolbar">
        <div class="search-input medium rectangular cab-search${state.query ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true">${icon("icon-search", "")}</span>
          <input class="input" type="search" autocomplete="off" placeholder="Caută după denumire, cod sau instituție" aria-label="Caută servicii după denumire, cod sau instituție" value="${escape(state.query)}" data-cat-search>
          <div class="btn-group cab-search__actions">
            <button class="btn-icon clear cab-search__clear" type="button" aria-label="Șterge căutarea" data-cat-search-clear${state.query ? "" : " disabled"}>
              <svg class="icon small" aria-hidden="true"><use href="${C.SPRITE}#icon-cross-small"></use></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="cab-chips" role="tablist" aria-label="Filtrează după categorie">
        ${state.data.categories.map((category) => {
          const count = category.id === "toate" ? base.length : base.filter((service) => service.category === category.id).length;
          const selected = category.id === state.category;
          return `<button class="chip${selected ? " is-selected" : ""}" type="button" role="tab" aria-selected="${selected}" aria-pressed="${selected}" data-cat-chip="${escape(category.id)}"><span class="chip__label">${escape(category.label)}</span><span class="chip__badge">${count}</span></button>`;
        }).join("")}
      </div>
      ${list.length
        ? `<section class="cab-list" aria-label="Servicii">${list.map(cardHtml).join("")}</section>`
        : `<div class="cab-state">${fixAssets(window.GEAPEmptyState.noResults("Niciun serviciu nu corespunde căutării"))}</div>`}`;
  }

  const row = (label, valueHtml) => `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label">${escape(label)}</span><div class="e-permits-fo-summary-row__value"><span>${valueHtml}</span></div></div>`;

  function renderService(service) {
    C.setHeaderTitle("Catalogul serviciilor");
    const target = requestTarget(service);
    const applicants = (service.applicants || []).map((type) => `<span class="cab-applicant">${icon(APPLICANT[type].icon, "medium")}${escape(APPLICANT[type].label)}</span>`).join("");
    root.innerHTML = `
      <article class="cab-detail cat-service" aria-labelledby="cat-service-title" data-cat-service="${escape(service.id)}">
        ${C.pageHeader({
          crumbs: [{ label: "Catalogul serviciilor", href: C.cabUrl("catalog"), attr: "data-cat-back" }, { label: service.title }],
          title: service.title,
          titleId: "cat-service-title",
          meta: [
            ["Instituția", escape(service.authority)],
            ["Tipul actului", escape(service.actType)],
            ["Termen", escape(service.term)],
            ["Cost", escape(service.cost)],
            ["Disponibil", onlineTag(service)],
          ],
        })}
        <p class="cab-lead">${escape(service.description)}</p>
        ${service.online
          ? `<div class="cab-cta">
               <div class="cab-detail__actions">
                 <a class="btn btn-primary btn-md btn-rounded" href="${escape(target.href)}" data-cat-request>${icon("icon-external-link")}<span>Solicită online</span></a>
               </div>
               <p class="text-body-sm cab-detail__muted" data-cat-request-hint>${escape(target.hint)}</p>
             </div>`
          : `<div class="message message--subtle banner--info message--small cab-message" role="note">
               <span class="banner__icon">${icon("icon-circle-info-filled", "medium")}</span>
               <div class="banner__content"><p>Serviciul nu poate fi solicitat încă online. Cererea se depune la ghișeul autorității.</p></div>
             </div>`}
        <section class="cab-section" aria-labelledby="cat-sec-about">
          <h2 class="e-permits-fo-finish__section-title" id="cat-sec-about">Despre serviciu</h2>
          <div class="e-permits-fo-summary-card cab-detail__card">
            ${row("Instituția", escape(service.authority))}
            ${row("Tipul actului permisiv", escape(service.actType))}
            ${row("Termenul de examinare", escape(service.term))}
            ${row("Costul", escape(service.cost))}
            ${row("Valabilitatea actului", escape(service.validity))}
            ${row("Pot solicita", `<span class="cab-applicants">${applicants}</span>`)}
            ${service.code ? row("Codul serviciului (RSSP)", escape(service.code)) : ""}
          </div>
        </section>
        <section class="cab-section" aria-labelledby="cat-sec-docs">
          <h2 class="e-permits-fo-finish__section-title" id="cat-sec-docs">Documente necesare</h2>
          <div class="e-permits-fo-summary-card cab-detail__card">
            ${service.documents.map((doc) => row(doc.title, `<span class="status-tag ${doc.required ? "status-tag--neutral is-strong" : "status-tag--neutral is-subtle"} status-tag--small">${doc.required ? "Obligatoriu" : "Opțional"}</span>${doc.note ? ` <span class="cab-detail__muted">${escape(doc.note)}</span>` : ""}`)).join("")}
          </div>
        </section>
      </article>`;
    C.syncHeaderMeta();
    root.querySelector("#cat-service-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function route() {
    const match = /^#serviciu\/([\w-]+)$/.exec(window.location.hash);
    const service = match && state.data.services.find((item) => item.id === match[1]);
    if (service) renderService(service);
    else renderList();
  }

  function bind() {
    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-cat-search]")) return;
      state.query = event.target.value;
      const caret = event.target.selectionStart;
      renderList();
      const input = root.querySelector("[data-cat-search]");
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-cat-search-clear]")) { state.query = ""; renderList(); root.querySelector("[data-cat-search]")?.focus(); return; }
      const chip = event.target.closest("[data-cat-chip]");
      if (chip) { state.category = chip.dataset.catChip; renderList(); root.querySelector(`[data-cat-chip="${state.category}"]`)?.focus(); return; }
      if (event.target.closest("[data-cat-back]")) { event.preventDefault(); history.pushState(null, "", window.location.pathname + window.location.search); route(); return; }
      const card = event.target.closest("[data-cat-card]");
      if (card) window.location.hash = `#serviciu/${card.dataset.catCard}`;
    });
    root.addEventListener("keydown", (event) => {
      const card = event.target.matches?.("[data-cat-card]") ? event.target : null;
      if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); window.location.hash = `#serviciu/${card.dataset.catCard}`; }
    });
    window.addEventListener("hashchange", route);
    window.addEventListener("popstate", route);
  }

  async function init() {
    try {
      const [data, fo] = await Promise.all([
        fetch("../data/cabinet-evo-catalog.json").then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
        fetch("../data/acte-permisive.json").then((response) => response.json()).catch(() => null),
      ]);
      state.data = data;
      const flow = fo?.frontOfficeFlows?.[0] || {};
      state.acts = flow.intent?.acts?.[C.SUBJECT] || [];
      state.subject = (flow.subjects || []).find((subject) => subject.id === C.SUBJECT) || null;
      bind();
      route();
    } catch (error) {
      console.warn("[catalog]", error);
      root.innerHTML = `<div class="cab-state" role="alert">${fixAssets(window.GEAPEmptyState.render({ title: "A apărut o eroare", text: "Catalogul serviciilor nu a fost încărcat. Încercați din nou.", icon: "circle-error" }))}</div>`;
    }
    document.documentElement.dataset.catReady = "true";
  }

  init();
})();
