/* Pagina de logare în SIA GEAP — Back Office / Admin Portal (2026-10-06)
   US-105 Autentificare prin MPass · US-110 Delogare explicită ·
   US-107 (sesiune expirată) and US-109 (MPass indisponibil) as the reasons shown here.
   US-81 Selectarea rolului și a subdiviziunii (role-context-v1, 2026-11-04): after MPass the user's
   (rol, autoritate, subdiviziune) combinations decide — none → refusal, inactive → refusal, one → straight in,
   several → the context screen (js/bo-context.js renders the cards, the same as the US-82 dialog).
   Query: ?portal=admin · ?ended=logout|expired · ?mpass=ok&as=<data/bo-context.json user id>|fara-cont · ?mpass=down
          · ?idle=<seconds> (demo: the 15-minute idle limit of the context screen, AC-32)
          · ?view=redirecting|retrying|unavailable (a frozen state, for the Figma links) */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const card = document.querySelector("[data-bo-login]");
  if (!card) return;

  const portal = params.get("portal") === "admin" ? "admin" : "bo";
  /* ?product=ekyc → EVO eKYC console (US-UI-02 91107, US-03-10 89193), same page and states */
  const EKYC = params.get("product") === "ekyc";
  const BRAND = EKYC ? "EVO eKYC" : "SIA GEAP";
  const PRODUCT = EKYC ? "Consolă de administrare" : { bo: "Back Office", admin: "Admin Portal" }[portal];
  /* the shell opens the landing page of the chosen context itself (US-81 AC-24…27, js/e-permits-shell.js) */
  const HOME = EKYC
    ? "e-permits-acte-permisive.html?flow=ekyc"
    : portal === "admin"
    ? "e-permits-acte-permisive.html?flow=back-office&portal=admin"
    : "e-permits-acte-permisive.html?flow=back-office";
  const CTX = window.GEAPBoContext;
  /* the parameters that keep the product / portal across MPass and logout */
  const keep = (url) => {
    if (portal === "admin") url.searchParams.set("portal", "admin");
    if (EKYC) url.searchParams.set("product", "ekyc");
    return url;
  };
  /* MPass test identities: an active GEAP account and one without an account (US-74) */
  const IDENTITIES = {
    activ: { name: "Anastasia Cojocaru", idnp: "2990000000001" },
    "fara-cont": { name: "Ion Popescu", idnp: "2003000000417" }
  };
  const RETRIES = 3;

  document.querySelector("[data-bo-product]").textContent = PRODUCT;
  document.querySelector("[data-bo-brand]").textContent = BRAND;
  document.title = `Autentificare · ${BRAND} ${PRODUCT}`;
  /* the shared inline-note geometry is scoped to the back office */
  card.dataset.demoFlow = "back-office";
  /* the page scrolls like the FO full flow (user 2026-11-04 „scrolling behaviour is different”): the document
     scrolls under the sticky header (body data-demo-flow="full"), the main band = viewport − header */
  const header = document.querySelector(".e-permits-fo-auth__header");
  const syncHeader = () => document.documentElement.style.setProperty("--fo-header-height", `${header?.offsetHeight || 0}px`);
  syncHeader();
  if (header) new ResizeObserver(syncHeader).observe(header);

  const icon = (name, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const notice = (tone, iconName, html) => `
    <div class="message message--subtle banner--${tone}" role="status">
      <span class="banner__icon">${icon(iconName)}</span>
      <div class="banner__content"><p class="banner__text">${html}</p></div>
    </div>`;
  const mpassButton = ({ busy = false, label = "Autentifică-te prin MPass" } = {}) => `
    <button class="btn btn-badge btn-badge--primary btn-badge--mpass e-permits-fo-auth__submit" type="button" data-bo-mpass${busy ? ' disabled aria-busy="true"' : ""}>
      <span class="btn-badge__logo" aria-hidden="true">${busy ? '<span class="spinner spinner--extra-small spinner--light-on-color"></span>' : '<img src="assets/logos/m-platforms/m-pass.svg" alt="">'}</span>
      <span class="btn-badge__label">${label}</span>
    </button>`;
  const masked = (idnp) => `••••${idnp.slice(-4)}`;

  /* why the session ended: an expired session is explained on the card (the user did
     not choose it); a logout is feedback on the user's own action → a toast (US-110) */
  const ENDED = {
    expired: notice("warning", "warning-filled", "<strong>Sesiunea a expirat</strong> din lipsă de activitate. Autentifică-te din nou ca să continui.")
  };

  const VIEWS = {
    /* US-105 AC-02: the page an unauthenticated user sees; the only action is MPass */
    login: ({ busy = false } = {}) => `
      <div class="e-permits-fo-auth__content">
        ${ENDED[params.get("ended")] || ""}
        <div class="e-permits-fo-auth__title-group">
          <svg class="e-permits-fo-auth__lock icon" width="36" height="36" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg>
          <h1 id="bo-login-title">${EKYC ? "Platforma națională de verificare a identității" : `Intră în ${PRODUCT}`}</h1>
        </div>
        <p class="e-permits-fo-auth__description">${EKYC
          ? "Accesul se face exclusiv prin MPass, serviciul guvernamental de autentificare. Consola nu are credențiale proprii și nu stochează parole."
          : "Autentificarea în SIA GEAP se face exclusiv prin MPass, cu identitatea ta guvernamentală."}</p>
        ${mpassButton(busy ? { busy, label: "Se deschide MPass…" } : {})}
        <div class="e-permits-fo-auth__separator" aria-hidden="true"></div>
        <p class="bo-login__help">${EKYC
          ? "Vei fi redirecționat către mpass.gov.md și readus înapoi automat. Conexiunea este securizată, iar sesiunile sunt jurnalizate conform politicii de audit."
          : "Accesul este acordat doar utilizatorilor cu cont activ în SIA GEAP. Nu ai acces? Contactează administratorul local al autorității tale."}</p>
      </div>`,

    /* US-UI-02: after the return from MPass — full-card loading while the role is checked */
    processing: () => `
      <div class="e-permits-fo-auth__content">
        <div class="e-permits-fo-auth__title-group">
          <span class="spinner spinner--large spinner--brand bo-login__spinner" aria-hidden="true"></span>
          <h1 id="bo-login-title">Se procesează autentificarea…</h1>
        </div>
        <p class="e-permits-fo-auth__description">MPass ți-a confirmat identitatea. Verificăm rolul tău în ${BRAND} și deschidem consola.</p>
      </div>`,

    /* US-109 AC-02: automatic retries while MPass does not answer */
    retrying: (attempt = 2) => `
      <div class="e-permits-fo-auth__content">
        <div class="e-permits-fo-auth__title-group">
          <span class="spinner spinner--large spinner--brand bo-login__spinner" aria-hidden="true"></span>
          <h1 id="bo-login-title">Se conectează la MPass…</h1>
        </div>
        <p class="e-permits-fo-auth__description">MPass nu a răspuns. Reîncercăm automat: încercarea <strong data-bo-attempt>${attempt}</strong> din ${RETRIES}.</p>
      </div>`,

    /* US-109 AC-05/06: every retry failed — no access, manual retry */
    unavailable: () => `
      <div class="e-permits-fo-auth__content">
        <div class="e-permits-fo-auth__title-group">
          <span class="bo-login__state-icon bo-login__state-icon--warning">${icon("warning-filled", 36)}</span>
          <h1 id="bo-login-title">MPass este temporar indisponibil</h1>
        </div>
        <p class="e-permits-fo-auth__description">Nu ne-am putut conecta la serviciul de autentificare după ${RETRIES} încercări. Fără MPass nu se poate intra în ${BRAND}. Reîncearcă peste câteva minute.</p>
        <button class="btn btn-primary btn-rounded" type="button" data-bo-retry>
          ${icon("rotate-arrow")}
          <span>Reîncearcă</span>
        </button>
      </div>`,

    /* US-105 AC-10/11: MPass confirmed the identity, but there is no active GEAP account */
    denied: () => {
      const who = IDENTITIES[params.get("as")] || IDENTITIES["fara-cont"];
      return `
      <div class="e-permits-fo-auth__content">
        <div class="e-permits-fo-auth__title-group">
          <span class="bo-login__state-icon bo-login__state-icon--danger">${icon("lock", 36)}</span>
          <h1 id="bo-login-title">Ai nevoie de permisiune de acces</h1>
        </div>
        <p class="e-permits-fo-auth__description">${EKYC
          ? "Contul tău MPass nu are un rol în EVO eKYC. Pentru acces, contactează administratorul platformei la suport.ekyc@egov.md."
          : "Nu ai un cont activ în cadrul SIA GEAP. Pentru acordarea drepturilor de acces, contactează administratorul local."}</p>
        <div class="bo-login__identity">
          <span class="bo-login__identity-label">Autentificat în MPass ca</span>
          <span class="bo-login__identity-value">${who.name} · IDNP ${masked(who.idnp)}</span>
        </div>
        <div class="e-permits-fo-auth__separator" aria-hidden="true"></div>
        <button class="btn btn-neutral btn-rounded" type="button" data-bo-signout>
          <span>Ieșire</span>
          ${icon("logout")}
        </button>
      </div>`;
    }
  };

  /* who MPass confirmed + „Ieșire” — the end of every refusal card */
  const identityHtml = (who) => `
        <div class="bo-login__identity">
          <span class="bo-login__identity-label">Autentificat în MPass ca</span>
          <span class="bo-login__identity-value">${who.name} · IDNP ${masked(who.idnp)}</span>
        </div>`;
  const signoutHtml = `
        <button class="btn btn-neutral btn-rounded" type="button" data-bo-signout>
          <span>Ieșire</span>
          ${icon("logout")}
        </button>`;
  const refusal = (title, text, who) => `
      <div class="e-permits-fo-auth__content">
        <div class="e-permits-fo-auth__title-group">
          <span class="bo-login__state-icon bo-login__state-icon--danger">${icon("lock", 36)}</span>
          <h1 id="bo-login-title">${title}</h1>
        </div>
        <p class="e-permits-fo-auth__description">${text}</p>
        ${identityHtml(who)}
        <div class="e-permits-fo-auth__separator" aria-hidden="true"></div>
        ${signoutHtml}
      </div>`;
  /* US-81 AC-01: an active account without any active combination */
  VIEWS.noRole = (who) => refusal(`Nu poți intra în ${PRODUCT}`, "Nu ai niciun rol atribuit. Contactează administratorul.", who);
  /* US-81 AC-03: an inactive account never reaches the context screen */
  VIEWS.inactive = (who) => refusal("Contul este inactiv", "Contul tău în SIA GEAP este inactiv și nu permite autentificarea. Pentru reactivare, contactează administratorul.", who);
  /* US-81 AC-08…19: every card at once, grouped by authority, delegations apart; „Ieșire” ends the session (AC-20) */
  /* choice-cards-v1: the FO identity choice screen („Cum vrei să depui cererea?”) — same card, copy block, groups */
  VIEWS.context = ({ model }) => `
      <div class="e-permits-fo-auth__content e-permits-fo-auth__content--choice">
        <div class="e-permits-fo-auth__choice-copy">
          <h1 id="bo-login-title">Cu ce rol lucrezi?</h1>
        </div>
        ${CTX.listHtml(model, { heading: "h2", idPrefix: "bo-ctx" })}
        <div class="e-permits-fo-auth__separator" aria-hidden="true"></div>
        ${signoutHtml}
      </div>`;

  const show = (view, arg) => {
    card.classList.toggle("e-permits-fo-auth__card--choice", view === "context");
    card.innerHTML = VIEWS[view](arg);
    card.dataset.boView = view;
  };

  /* demo of the automatic retry policy (US-109): 3 attempts, then the error */
  let retryTimer = null;
  const runRetries = (attempt = 1) => {
    show("retrying", attempt);
    retryTimer = window.setTimeout(() => (attempt < RETRIES ? runRetries(attempt + 1) : show("unavailable")), 1100);
  };

  const goToMpass = () => {
    show("login", { busy: true });
    const back = new URL(window.location.href);
    back.search = "";
    back.hash = "";
    back.searchParams.set("mpass", "ok");
    back.searchParams.set("as", "activ");
    keep(back);
    const target = new URL("mpass-test.html", window.location.href);
    target.searchParams.set("return", `${back.pathname}${back.search}`);
    window.setTimeout(() => window.location.assign(target.href), 600);
  };

  card.addEventListener("click", (event) => {
    if (event.target.closest("[data-bo-mpass]")) { goToMpass(); return; }
    /* AC-22 / AC-23: a card applies the context at once — no confirmation — and opens the main interface */
    const ctxCard = event.target.closest("[data-ctx-card]:not([aria-current='true'])");
    if (ctxCard && pendingUser) { enter(pendingUser, ctxCard.dataset.ctxCard); return; }
    if (event.target.closest("[data-bo-retry]")) { window.clearTimeout(retryTimer); runRetries(1); return; }
    /* „Ieșire” from the refusal ends the MPass session too (SLO) and returns to the login page */
    if (event.target.closest("[data-bo-signout]")) {
      CTX?.endSession();
      const next = new URL(window.location.href);
      next.search = "";
      next.searchParams.set("ended", "logout");
      keep(next);
      window.location.assign(next.href);
    }
  });

  /* ---- US-81: the GEAP account behind the MPass identity decides what comes next ---- */
  let pendingUser = null;
  const enter = (user, cardId) => {
    const card = CTX.model(user).cards.find((item) => item.id === cardId);
    if (!card) return;
    CTX.setContext(card.id, { fresh: true });
    /* AC-33: the sign-in is logged with the chosen role, authority and subdivision */
    CTX.audit(user, "Autentificare prin MPass", `${PRODUCT} · context ales: ${CTX.labelOf(card)}.`);
    stopIdle?.();
    show("processing");
    window.location.replace(HOME);
  };
  let stopIdle = null;
  const routeIdentity = (id) => {
    const user = CTX.userById(id);
    if (!user) { show("denied"); return; }
    const who = { name: user.name, idnp: user.idnp };
    if (user.status !== "Activ") { show("inactive", who); return; }
    const model = CTX.model(user);
    if (!model.cards.length) { show("noRole", who); return; }
    CTX.startSession(user.id, portal);
    /* AC-06 / AC-07: one combination → applied automatically, no screen */
    if (model.cards.length === 1) { enter(user, model.cards[0].id); return; }
    /* AC-08: several → the context screen, nothing pre-selected (AC-29) */
    pendingUser = user;
    show("context", { who, model });
    const idle = Number(params.get("idle"));
    stopIdle = CTX.watchIdle(() => {
      CTX.endSession();
      const next = new URL(window.location.href);
      next.search = "";
      next.searchParams.set("ended", "expired");
      keep(next);
      window.location.replace(next.href);
    }, idle > 0 ? idle * 1000 : undefined);
  };

  /* entry */
  const view = params.get("view");
  const mpass = params.get("mpass");
  if (view === "redirecting") show("login", { busy: true });
  else if (view === "processing") show("processing");
  else if (view === "retrying") show("retrying", 2);
  else if (view === "unavailable") show("unavailable");
  else if (mpass === "down") runRetries(1);
  else if (mpass === "ok" && params.get("as") === "fara-cont") show("denied");
  else if (mpass === "ok") {
    /* US-105 AC-09 (eKYC: the processing screen first, then the Dashboard — US-UI-02) */
    if (EKYC || !CTX) {
      show("processing");
      window.setTimeout(() => window.location.replace(HOME), 900);
    } else {
      show("processing");
      CTX.load().then(() => routeIdentity(params.get("as") || CTX.DEFAULT_USER)).catch((error) => { console.warn(error); show("denied"); });
    }
  } else show("login");

  if (params.get("ended") === "logout" && !view && !mpass) {
    window.GEAPToast?.show({ type: "info", title: "Te-ai deconectat", message: `Sesiunea în ${BRAND} și sesiunea MPass au fost încheiate.`, key: "bo-logout" });
  }

  document.documentElement.dataset.boLoginReady = "true";
})();
