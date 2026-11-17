/* EVO Cabinet v2 — „Elemente de bază” (Foundations demo page, cab2-foundations-v1, 2026-11-17; wiki 05 · Batch 1).
   ?shell=2&view=foundations&f=surfaces | motion | reduced | groups   (demo states cab2-f01 … cab2-f04)
   A demo page only: it shows the surface layer, the motion primitives and the group identity (cab2.css,
   cab2-motion.js, cab2.js) with library components — nothing in here is a new component. Numbers on the page
   (contrast, widths, token values) are measured in the browser, not typed. */
(() => {
  "use strict";

  const C = window.CabEvo;
  const V2 = window.Cab2;
  if (!C || !V2?.on || C.VIEW !== "foundations") return;

  const host = document.querySelector('[data-cab-view="foundations"]');
  const M = window.Cab2Motion;
  const { icon, escape, params } = C;
  const tag = (label, tone) => window.GEAPTag.html(label, tone);
  const phone = window.matchMedia("(max-width: 760px)").matches;
  /* buttons: Medium 40 on desktop, Large 48 on phones */
  const BTN = phone ? "btn btn-secondary" : "btn btn-secondary btn-md";

  const PAGES = [
    { id: "surfaces", label: "Suprafețe" },
    { id: "motion", label: "Mișcare" },
    { id: "reduced", label: "Mișcare redusă" },
    { id: "groups", label: "Grupuri" },
  ];
  const PAGE = PAGES.some((page) => page.id === params.get("f")) ? params.get("f") : "surfaces";
  const pageUrl = (id) => `?${new URLSearchParams({ shell: "2", view: "foundations", f: id, ...(id === "reduced" ? { motion: "reduce" } : {}) }).toString()}`;

  /* ---------- contrast (WCAG 2.x relative luminance) ---------- */
  const rgb = (text) => (String(text).match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => {
    const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (fg, bg) => { const a = lum(rgb(fg)); const b = lum(rgb(bg)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  /* the first painted background behind an element */
  const backdrop = (el) => {
    for (let node = el; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      const parts = rgb(color);
      if (parts.length === 3 || parts[3] > 0) return color;
    }
    return "rgb(255, 255, 255)";
  };
  const ratioText = (value) => `${value.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} : 1`;

  /* ---------- shared pieces ---------- */
  const header = () => `
    <header class="cab2-card cab2-f__header">
      <div class="cab2-card__head">
        <h1 class="cab2-hero__title" tabindex="-1">Elemente de bază</h1>
        <p class="cab2-card__text">Suprafețele, mișcarea și culorile grupurilor din care este construit noul Cabinet. Butoanele, câmpurile, etichetele și filele sunt componentele din bibliotecă, neschimbate.</p>
      </div>
      <nav class="tabs cab2-f__nav" aria-label="Pagini demonstrative">
        <div class="tab-buttons">
          ${PAGES.map((page) => `<a class="tab-button${page.id === PAGE ? " active" : ""}" href="${pageUrl(page.id)}"${page.id === PAGE ? ' aria-current="page"' : ""}>${escape(page.label)}</a>`).join("")}
        </div>
      </nav>
    </header>`;

  const section = (title, text, body) => `
    <section class="cab2-section">
      <div class="cab2-card__head">
        <h2 class="cab2-section__title">${escape(title)}</h2>
        ${text ? `<p class="cab2-section__text">${escape(text)}</p>` : ""}
      </div>
      ${body}
    </section>`;

  const card = (title, text, body = "", { action = "", attrs = "" } = {}) => `
    <article class="cab2-card"${attrs ? ` ${attrs}` : ""}>
      <div class="cab2-f__card-head">
        <div class="cab2-card__head">
          <h3 class="cab2-card__title">${escape(title)}</h3>
          ${text ? `<p class="cab2-card__text">${escape(text)}</p>` : ""}
        </div>
        ${action}
      </div>
      ${body}
    </article>`;

  const tile = (label, value, attrs = "") => `
    <li class="cab2-tile"${attrs ? ` ${attrs}` : ""}>
      <p class="cab2-tile__label">${escape(label)}</p>
      <p class="cab2-tile__value">${escape(value)}</p>
    </li>`;

  const avatar = () => `<span class="cab2-hero__ring"><span class="avatar ${phone ? "avatar--lg" : "avatar--xl"} avatar--initials" aria-hidden="true">AC</span></span>`;

  /* ---------- f01 · surfaces ---------- */
  const CONTRAST = [
    { id: "default", label: "Text principal" },
    { id: "secondary", label: "Text secundar" },
    { id: "tertiary", label: "Text terțiar" },
    { id: "brand", label: "Link" },
  ];
  const contrastLines = () => `
    <ul class="cab2-f__lines" data-cab2-f-contrast>
      ${CONTRAST.map((line) => `
        <li class="cab2-f__line" data-cab2-f-line="${line.id}">
          <span class="cab2-f__sample" data-cab2-f-sample>${escape(line.label)}</span>
          <span class="cab2-f__measure" data-cab2-f-ratio></span>
        </li>`).join("")}
    </ul>`;

  const surfaces = () => [
    section("Suprafețe", "Pagina este gri. Tot ce poartă informație stă pe alb. Adâncimea vine din ton, fără borduri și fără umbre; umbra rămâne doar pentru meniuri și ferestre care plutesc.", `
      <div class="cab2-hero">
        ${avatar()}
        <div class="cab2-hero__text">
          <h3 class="cab2-hero__title">Panou principal</h3>
          <p>Alb, fără bordură, rază 24. Un singur titlu și o singură propoziție gri.</p>
        </div>
      </div>
      ${card("Card", "Alb, fără bordură și fără umbră, rază 20, spațiu interior 24 (16 pe telefon). În interior stau suprafețele gri, rază 20: valoarea mare, eticheta mică deasupra.", `
        <ul class="cab2-tiles">
          ${tile("Amenzi neachitate", "2")}
          ${tile("Cereri în lucru", "3")}
          ${tile("Acte permisive valabile", "12")}
        </ul>`)}
      <ul class="cab2-list">
        <li class="cab2-row">
          <div class="cab2-row__main">
            <h3 class="cab2-row__title">Rând de listă</h3>
            <p class="cab2-row__text">Alb, rază 16, cel puțin 56 înălțime. Fiecare rând este propria suprafață pe pagina gri.</p>
          </div>
          <div class="cab2-row__aside">${tag("Valabil", "success")}</div>
        </li>
        <li>
          <button class="cab2-row e-permits-hover-surface cab2-f__fill" type="button">
            <span class="cab2-row__main">
              <span class="cab2-row__title">Rând pe care poți apăsa</span>
              <span class="cab2-row__text">La trecerea cu mouse-ul apare suprafața gri comună, la fel ca în restul produsului.</span>
            </span>
            <span class="cab2-row__aside">${icon("icon-chevron-right", "medium")}</span>
          </button>
        </li>
      </ul>`),

    section("Contrastul textului", "Măsurat pe pagină, acum. Textul are nevoie de cel puțin 4,5 : 1. Pe gri folosim doar textul principal și cel secundar; textul terțiar rămâne pentru pictograme.", `
      <div class="cab2-f__grid">
        ${card("Pe card alb", "", contrastLines())}
        <div class="cab2-f__onpage">
          <div class="cab2-card__head"><h3 class="cab2-card__title">Pe pagina gri</h3></div>
          ${contrastLines()}
        </div>
        ${card("Pe suprafața interioară", "", `<div class="cab2-tile">${contrastLines()}</div>`)}
      </div>`),

    section("Contrast ridicat", "Un card alb pe pagina gri are contrast mic prin construcție, de aceea fiecare card are un titlu. Când sistemul cere contrast ridicat sau culori forțate, fiecare suprafață primește un contur de 1 px, fără să schimbe dimensiunile.", `
      <div class="cab2-f__grid cab2-f__outlined">
        ${card("Card cu contur", "Așa arată când este activ contrastul ridicat.", `<ul class="cab2-tiles">${tile("Suprafață interioară", "Contur 1 px")}</ul>`)}
        <ul class="cab2-list">
          <li class="cab2-row"><div class="cab2-row__main"><h3 class="cab2-row__title">Rând cu contur</h3><p class="cab2-row__text">În modul culori forțate conturul ia culoarea textului din sistem.</p></div></li>
          <li class="cab2-row"><div class="cab2-row__main"><h3 class="cab2-row__title">Focalizare</h3><p class="cab2-row__text">Inelul de focalizare devine un contur real de 2 px.</p></div></li>
        </ul>
      </div>`),

    section("Lățimi", "Aceleași două lățimi ca în restul produsului, centrate; sub ele conținutul se întinde până la marginea paginii.", `
      ${card("Lățimea conținutului", "", `
        <ul class="cab2-tiles">
          ${tile("Prezentare, liste, registre, portofel", "", 'data-cab2-f-width="wide"')}
          ${tile("O singură înregistrare", "", 'data-cab2-f-width="record"')}
        </ul>`)}`),
  ].join("");

  function measureSurfaces() {
    host.querySelectorAll("[data-cab2-f-line]").forEach((line) => {
      const sample = line.querySelector("[data-cab2-f-sample]");
      const value = ratio(getComputedStyle(sample).color, backdrop(sample));
      line.querySelector("[data-cab2-f-ratio]").innerHTML = `<span>${ratioText(value)}</span>${value >= 4.5 ? tag("AA", "success") : tag("Sub AA", "danger")}`;
      line.dataset.cab2FValue = value.toFixed(2);
    });
    host.querySelectorAll("[data-cab2-f-width]").forEach((item) => {
      const probe = document.createElement("div");
      probe.className = `cab2-f__probe cab2-f__probe--${item.dataset.cab2FWidth}`;
      item.append(probe);
      item.querySelector(".cab2-tile__value").textContent = `${Math.round(probe.getBoundingClientRect().width)} px`;
      probe.remove();
    });
  }

  /* ---------- f02 / f03 · motion ---------- */
  const TOKENS = [
    ["--motion-ease-enter", "ce apare"],
    ["--motion-ease-exit", "ce pleacă"],
    ["--motion-ease-standard", "ce se mută sau își schimbă mărimea"],
    ["--motion-duration-fast", "culoare, opacitate, estompare"],
    ["--motion-duration-base", "schimbări de pagină și de panou"],
    ["--motion-duration-slow", "piesele intrării în Cabinet"],
    ["--motion-duration-out", "conținutul vechi dispare"],
    ["--motion-duration-close", "pagina se închide înapoi în card"],
    ["--motion-duration-avatar", "avatarul la intrare"],
    ["--motion-duration-hover", "suprafața gri de la trecerea cu mouse-ul"],
    ["--motion-stagger", "pasul dintre elemente, cel mult șase pași"],
    ["--motion-distance-sm", "urcare la schimbarea secțiunii"],
    ["--motion-distance-md", "urcare pentru text"],
    ["--motion-distance-lg", "urcare pentru carduri"],
    ["--motion-distance-axis", "deplasare între listă și înregistrare"],
    ["--motion-scale-enter", "mărimea de pornire a avatarului"],
  ];
  const tokenList = () => `
    <dl class="cab2-f__tokens">
      ${TOKENS.map(([name, use]) => `<div class="cab2-f__token"><dt>${name}</dt><dd><strong data-cab2-f-token="${name}"></strong><span>${escape(use)}</span></dd></div>`).join("")}
    </dl>`;

  const play = (id, title) => `<button class="${BTN}" type="button" data-cab2-f-play="${id}" aria-label="Redă: ${escape(title)}">Redă</button>`;
  const sample = (id, title, text, stage) => card(title, text, `<div class="cab2-f__stage" data-cab2-f-stage="${id}">${stage}</div>`, { action: play(id, title) });

  const SECTIONS = [["Amenzi", "2 neachitate"], ["Vehicule", "1 înmatriculat"]];
  const motion = (isReduced) => [
    isReduced ? `
      <div class="message message--subtle banner--info" role="note">
        <span class="banner__icon" aria-hidden="true">${icon("icon-circle-info", "medium")}</span>
        <div class="banner__content"><p>Pe această pagină mișcarea este redusă: fără deplasare, fără cascadă, fără desenarea inelului. Rămâne doar o estompare de cel mult 150 ms. <span data-cab2-f-system></span></p></div>
      </div>` : "",

    section(isReduced ? "Aceleași tranziții, cu mișcare redusă" : "Tranziții", isReduced
      ? "Apasă „Redă”: conținutul apare la locul lui, fără să se miște. Nimic important nu este arătat doar prin mișcare."
      : "Apasă „Redă” pentru fiecare tranziție. Conținutul este în pagină de la început; mișcarea nu întârzie nici citirea, nici focalizarea.", `
      ${sample("entrance", "Intrarea în Cabinet", "O singură dată după autentificare sau după ce schimbi pentru cine acționezi; niciodată la navigarea prin Cabinet. Avatarul crește, inelul se desenează, textul și cardurile urcă pe rând. Sub o secundă.", `
        <div class="cab2-f__entrance">
          <div class="cab2-hero cab2-f__flat">
            ${avatar()}
            <div class="cab2-hero__text">
              <h4 class="cab2-hero__title">Bună, Anastasia</h4>
              <p>Ai 2 lucruri de rezolvat</p>
              <p>Cererile tale în lucru: 3</p>
            </div>
          </div>
          <ul class="cab2-tiles">
            ${["Amenzi", "Taxe și datorii", "Vehicule", "Acte de identitate", "Cereri", "Plăți", "Notificări"].map((label, index) => tile(label, String(index + 1), "data-cab2-entrance-item")).join("")}
          </ul>
        </div>`)}
      ${sample("enter", "Apariție în cascadă", "Elementele urcă 16 și apar la 50 ms unul după altul. Primele șase au pasul lor; restul apar odată cu al șaselea.", `
        <ul class="cab2-tiles" data-cab2-f-enter>
          ${Array.from({ length: 8 }, (_, index) => tile("Element", String(index + 1))).join("")}
        </ul>`)}
      <div class="cab2-f__grid">
        ${sample("through", "Schimbarea secțiunii", "Conținutul vechi dispare în 90 ms, cel nou apare și urcă 8. În total 300 ms.", `
          <div class="cab2-tile" data-cab2-f-through>
            <p class="cab2-tile__label">${SECTIONS[0][0]}</p>
            <p class="cab2-tile__value">${SECTIONS[0][1]}</p>
          </div>`)}
        ${sample("axis", "Din listă în înregistrare și înapoi", "Înregistrarea vine din dreapta, 30 cu estompare; la întoarcere, lista vine din stânga. 300 ms.", `
          <div class="cab2-tile" data-cab2-f-axis>
            <p class="cab2-tile__label">Listă</p>
            <p class="cab2-tile__value">Amenzi</p>
          </div>`)}
        ${sample("grow", "Din card în pagina lui", "Pagina se deschide din cardul apăsat: 300 ms la deschidere, 250 ms la închidere.", `
          <div class="cab2-f__grow">
            <ul class="cab2-tiles" data-cab2-f-grow-list>
              ${tile("Act de identitate", "Buletin", "data-cab2-f-grow-card")}
              ${tile("Act de identitate", "Pașaport")}
            </ul>
            <div class="cab2-tile cab2-f__grow-page" data-cab2-f-grow-page hidden>
              <p class="cab2-tile__label">Pagina documentului</p>
              <p class="cab2-tile__value">Buletin de identitate</p>
              <p class="cab2-tile__label">Valabil până la 12 martie 2031</p>
            </div>
          </div>`)}
        ${sample("reveal", "Încărcare", "Cât timp se încarcă, apare scheletul paginii reale; conținutul îl înlocuiește printr-o estompare de 150 ms.", `
          <div class="cab2-swap" aria-busy="true" data-cab2-f-swap>
            <div class="cab2-tile" data-cab2-swap="placeholder" aria-hidden="true">
              <span class="skeleton skeleton--text"></span>
              <span class="skeleton skeleton--text cab2-f__skeleton-value"></span>
            </div>
            <div class="cab2-tile" data-cab2-swap="content">
              <p class="cab2-tile__label">Taxe și datorii</p>
              <p class="cab2-tile__value">Nu ai datorii</p>
            </div>
          </div>`)}
      </div>`),

    section("Tokenuri", isReduced ? "Valorile de mai jos sunt cele active acum, cu mișcarea redusă." : "Valorile sunt citite din pagină. Niciun fișier al Cabinetului nu scrie o durată sau o curbă direct.", card("Tokenuri de mișcare", "", tokenList())),
  ].join("");

  function wireMotion() {
    host.querySelectorAll("[data-cab2-f-token]").forEach((item) => { item.textContent = M.token(item.dataset.cab2FToken); });
    const system = host.querySelector("[data-cab2-f-system]");
    if (system) {
      system.textContent = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "Setarea de reducere a mișcării este activă în sistemul tău."
        : "Setarea din sistemul tău nu este activă; aici este forțată pentru demonstrație.";
    }

    let section = 0;
    let record = false;
    let open = false;
    let loading = 0;
    const stage = (id) => host.querySelector(`[data-cab2-f-stage="${id}"]`);
    const actions = {
      entrance: () => M.entrance(stage("entrance").querySelector(".cab2-f__entrance"), { force: true }),
      enter: () => M.enter(host.querySelector("[data-cab2-f-enter]")),
      through: () => {
        const el = host.querySelector("[data-cab2-f-through]");
        section = 1 - section;
        return M.fadeThrough(el, () => {
          el.querySelector(".cab2-tile__label").textContent = SECTIONS[section][0];
          el.querySelector(".cab2-tile__value").textContent = SECTIONS[section][1];
        });
      },
      axis: () => {
        const el = host.querySelector("[data-cab2-f-axis]");
        record = !record;
        return M.sharedAxis(el, () => {
          el.querySelector(".cab2-tile__label").textContent = record ? "Înregistrare" : "Listă";
          el.querySelector(".cab2-tile__value").textContent = record ? "Amendă din 3 noiembrie 2026" : "Amenzi";
        }, { back: !record });
      },
      grow: () => {
        const list = host.querySelector("[data-cab2-f-grow-list]");
        const page = host.querySelector("[data-cab2-f-grow-page]");
        open = !open;
        if (open) return M.grow(host.querySelector("[data-cab2-f-grow-card]"), page, () => { page.hidden = false; list.classList.add("is-under"); });
        return M.shrink(page, () => { page.hidden = true; list.classList.remove("is-under"); });
      },
      reveal: () => {
        const swap = host.querySelector("[data-cab2-f-swap]");
        const run = ++loading;
        swap.classList.remove("is-loaded");
        swap.setAttribute("aria-busy", "true");
        swap.querySelector('[data-cab2-swap="placeholder"]').hidden = false;
        window.setTimeout(() => { if (run === loading) M.reveal(swap); }, 1200);
      },
    };
    host.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cab2-f-play]");
      if (button) actions[button.dataset.cab2FPlay]?.();
    });
    /* the loading sample ends on its content */
    M.reveal(host.querySelector("[data-cab2-f-swap]"));
  }

  /* ---------- f04 · groups ---------- */
  const GROUP_TOKENS = {
    acasa: ["--color-background-base-inverse-default", "--color-icon-base-inverse-default"],
    cereri: ["--purple-100", "--purple-700"],
    documente: ["--forest-green-100", "--forest-green-600"],
    bani: ["--green-100", "--green-700"],
    proprietati: ["--apricot-100", "--apricot-700"],
    familie: ["--magenta-100", "--magenta-700"],
    munca: ["--blue-sky-100", "--blue-sky-600"],
    acces: ["--color-background-base-tertiary-hover", "--color-icon-base-default"],
  };
  const allIcons = (size) => `<div class="cab2-f__icons">${V2.GROUPS.map((group) => V2.groupIcon(group.id, { size, sprite: C.SPRITE })).join("")}</div>`;
  const groups = () => [
    section("Grupurile din meniu", "Fiecare grup are o culoare și o pictogramă. Culoarea apare doar în pictograma rotundă a grupului; restul interfeței rămâne neutru. Starea unui lucru nu se citește niciodată doar din culoare.", `
      <ul class="cab2-list">
        ${V2.GROUPS.map((group) => `
          <li class="cab2-row" data-cab2-f-group="${group.id}">
            ${V2.groupIcon(group.id, { sprite: C.SPRITE })}
            <div class="cab2-row__main">
              <h3 class="cab2-row__title">${escape(group.label)}${group.company ? ` · ${escape(group.company)}` : ""}</h3>
              <p class="cab2-row__text">Fundal ${GROUP_TOKENS[group.id][0]} · pictogramă ${GROUP_TOKENS[group.id][1]} · icon-${group.icon}</p>
            </div>
            <div class="cab2-row__aside cab2-f__measure" data-cab2-f-group-ratio></div>
          </li>`).join("")}
      </ul>`),
    section("Mărimi și suprafețe", "Pictograma rotundă este avatarul din bibliotecă: 40 cu pictogramă de 20 în meniu și în carduri, 32 în rânduri dense. Rămâne vizibilă pe alb, pe gri și pe un rând peste care treci cu mouse-ul.", `
      <div class="cab2-f__grid">
        ${card("Pe card alb, 40", "", allIcons("md"))}
        ${card("Pe suprafața interioară, 40", "", `<div class="cab2-tile">${allIcons("md")}</div>`)}
        ${card("Mărimea mică, 32", "", allIcons("sm"))}
      </div>`),
  ].join("");

  function measureGroups() {
    host.querySelectorAll("[data-cab2-f-group]").forEach((row) => {
      const style = getComputedStyle(row.querySelector(".cab2-group-icon"));
      const value = ratio(style.color, style.backgroundColor);
      row.querySelector("[data-cab2-f-group-ratio]").innerHTML = `<span>${ratioText(value)}</span>${value >= 4.5 ? tag("AA", "success") : value >= 3 ? tag("3 : 1", "warning") : tag("Sub 3 : 1", "danger")}`;
      row.dataset.cab2FValue = value.toFixed(2);
    });
  }

  /* ---------- render ---------- */
  const BODY = { surfaces, motion: () => motion(false), reduced: () => motion(true), groups };
  host.innerHTML = `<div class="cab2-page" data-cab2-f="${PAGE}">${header()}${BODY[PAGE]()}</div>`;
  /* cabinet-evo.js shows the view when its own start-up ends; the numbers below need a laid-out page now */
  host.hidden = false;
  if (PAGE === "surfaces") measureSurfaces();
  if (PAGE === "motion" || PAGE === "reduced") wireMotion();
  if (PAGE === "groups") measureGroups();
  host.setAttribute("data-cab2-f-ready", "");
})();
