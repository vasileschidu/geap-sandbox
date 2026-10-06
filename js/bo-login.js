/* Pagina de logare în SIA GEAP — Back Office / Admin Portal (2026-10-06)
   US-105 Autentificare prin MPass · US-110 Delogare explicită ·
   US-107 (sesiune expirată) and US-109 (MPass indisponibil) as the reasons shown here.
   Query: ?portal=admin · ?ended=logout|expired · ?mpass=ok&as=activ|fara-cont · ?mpass=down
          · ?view=redirecting|retrying|unavailable (a frozen state, for the Figma links) */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const card = document.querySelector("[data-bo-login]");
  if (!card) return;

  const portal = params.get("portal") === "admin" ? "admin" : "bo";
  const PRODUCT = { bo: "Back Office", admin: "Admin Portal" }[portal];
  const HOME = portal === "admin"
    ? "e-permits-acte-permisive.html?flow=back-office#users"
    : "e-permits-acte-permisive.html?flow=back-office";
  /* MPass test identities: an active GEAP account and one without an account (US-74) */
  const IDENTITIES = {
    activ: { name: "Anastasia Cojocaru", idnp: "2990000000001" },
    "fara-cont": { name: "Ion Popescu", idnp: "2003000000417" }
  };
  const RETRIES = 3;

  document.querySelector("[data-bo-product]").textContent = PRODUCT;
  document.title = `Autentificare · e-Permis ${PRODUCT}`;
  /* the shared inline-note geometry is scoped to the back office */
  card.dataset.demoFlow = "back-office";

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
          <h1 id="bo-login-title">Intră în ${PRODUCT}</h1>
        </div>
        <p class="e-permits-fo-auth__description">Autentificarea în SIA GEAP se face exclusiv prin MPass, cu identitatea ta guvernamentală.</p>
        ${mpassButton(busy ? { busy, label: "Se deschide MPass…" } : {})}
        <div class="e-permits-fo-auth__separator" aria-hidden="true"></div>
        <p class="bo-login__help">Accesul este acordat doar utilizatorilor cu cont activ în SIA GEAP. Nu ai acces? Contactează administratorul local al autorității tale.</p>
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
        <p class="e-permits-fo-auth__description">Nu ne-am putut conecta la serviciul de autentificare după ${RETRIES} încercări. Fără MPass nu se poate intra în SIA GEAP. Reîncearcă peste câteva minute.</p>
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
          <h1 id="bo-login-title">Aveți nevoie de permisiune de acces</h1>
        </div>
        <p class="e-permits-fo-auth__description">Nu aveți un cont activ în cadrul SIA GEAP. Pentru acordarea drepturilor de acces, vă rugăm să contactați administratorul local.</p>
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

  const show = (view, arg) => {
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
    if (portal === "admin") back.searchParams.set("portal", "admin");
    const target = new URL("mpass-test.html", window.location.href);
    target.searchParams.set("return", `${back.pathname}${back.search}`);
    window.setTimeout(() => window.location.assign(target.href), 600);
  };

  card.addEventListener("click", (event) => {
    if (event.target.closest("[data-bo-mpass]")) { goToMpass(); return; }
    if (event.target.closest("[data-bo-retry]")) { window.clearTimeout(retryTimer); runRetries(1); return; }
    /* „Ieșire” from the refusal ends the MPass session too (SLO) and returns to the login page */
    if (event.target.closest("[data-bo-signout]")) {
      const next = new URL(window.location.href);
      next.search = "";
      next.searchParams.set("ended", "logout");
      if (portal === "admin") next.searchParams.set("portal", "admin");
      window.location.assign(next.href);
    }
  });

  /* entry */
  const view = params.get("view");
  const mpass = params.get("mpass");
  if (view === "redirecting") show("login", { busy: true });
  else if (view === "retrying") show("retrying", 2);
  else if (view === "unavailable") show("unavailable");
  else if (mpass === "down") runRetries(1);
  else if (mpass === "ok" && params.get("as") === "fara-cont") show("denied");
  else if (mpass === "ok") {
    /* US-105 AC-09: an active account lands in the workplace of its first role */
    show("login", { busy: true });
    window.location.replace(HOME);
  } else show("login");

  if (params.get("ended") === "logout" && !view && !mpass) {
    window.GEAPToast?.show({ type: "info", title: "Te-ai deconectat", message: "Sesiunea în SIA GEAP și sesiunea MPass au fost încheiate.", key: "bo-logout" });
  }

  document.documentElement.dataset.boLoginReady = "true";
})();
