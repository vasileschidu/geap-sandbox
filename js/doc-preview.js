/* =====================================================================================
   GEAPDocPreview — the ONE A4 document preview (2026-10-17; components.md › „Document preview”).
   Markup (the template previews' page in the grey canvas):
     <div class="e-permits-doc-peek__canvas" role="document" aria-label="…">
       <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page" data-doc-cont="<line on continuation pages>">
         [page-level parts copied to every page, e.g. a watermark — `repeat`]
         <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
           … title, ONE flowing <table> (2 columns; `tr.e-permits-doc-page__group > th[colspan=2]` = a heading row; a table that
             STARTS with a heading row needs `<colgroup><col class="e-permits-doc-page__label-col"><col></colgroup>` — a fixed
             layout takes its widths from the first row) …
           [parts that close the document — `tail`, moved to the last page]
           (2026-10-19) rows with `.e-permits-doc-page__keep` stay with the next row; a grid = rows
           `tr[data-doc-grid-of=id]` after its header `tr[data-doc-grid=id]`, repeated on top of a continuation
           page (js/act-view.js docGridRows, css › „Grid on the page”)
           <p class="e-permits-doc-page__footer">… · <span data-doc-page-label>Pagina 1 din 1</span></p>
         </div>
       </div>
     </div>
   API:
     paginate(canvas, { repeat, tail }) — measured UNZOOMED: the table rows that do not fit move to
       continuation pages (same shell, the `data-doc-cont` line on top, ≥ 2 rows kept with the tail, a
       heading row never ends a page), then „Pagina k din n” in every footer;
     fit(canvas) — every page zoomed to the canvas width minus its computed padding (never cut, never > 1);
     print(canvas) — prints only the page(s) of this canvas at A4 (css/doc-preview.css @media print);
     printIcon(cls) — the printer of the product nav (assets/icons/sidebar-printer-print.svg), stroke =
       label colour (the sprite has no printer).
     (fit also syncs the scroll hairlines of the viewer body it sits in — doc-fullheight-v1)
     signatureHtml({ by, at, provider, sprite }) — the signature block under the canvas of a GENERATED document
       viewer (doc-viewer-v1): badge above „MSign · by · at”; css/doc-preview.css › „Signature block”.
   Used by: Ghișeu previews (js/ghiseu.js), the BO dossier document modal (js/e-permits-shell.js),
   RAP „Forma de tipar a actului” (rap-evo/rap-evo.js).
   ===================================================================================== */
(function () {
  "use strict";

  const PAGE_WIDTH = 794; /* 210mm at 96 dpi */
  const pagesOf = (canvas) => canvas.querySelectorAll(".e-permits-doc-peek__page");

  /* doc-fullheight-v1 (2026-10-21): on desktop the viewer BODY (canvas + signature card) is the only scroller
     (css/doc-preview.css › Full-height document viewer) → the library modal's scroll hairlines on the FO-shell
     dialogs (`has-scroll-above / -below` on `.e-permits-fo-doc-modal`; library `.modal`s are synced by the shell) */
  const SCROLL_BODY = ".e-permits-fo-doc-modal > :is(.rap-act-modal__body, .cab-doc-modal__body--doc)";
  function syncScrollEdges(body) {
    const dialog = body?.parentElement;
    if (!dialog) return;
    const scrollable = body.scrollHeight - body.clientHeight > 1;
    dialog.classList.toggle("has-scroll-above", scrollable && body.scrollTop > 0);
    dialog.classList.toggle("has-scroll-below", scrollable && body.scrollTop + body.clientHeight < body.scrollHeight - 1);
  }
  document.addEventListener("scroll", (event) => {
    if (event.target instanceof Element && event.target.matches(SCROLL_BODY)) syncScrollEdges(event.target);
  }, true);

  function fit(canvas) {
    const pages = canvas ? pagesOf(canvas) : [];
    if (!pages.length || !canvas.clientWidth) return;
    const style = window.getComputedStyle(canvas);
    const room = canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    pages.forEach((page) => { page.style.zoom = String(Math.min(1, room / PAGE_WIDTH)); });
    const body = canvas.closest(SCROLL_BODY);
    if (body) syncScrollEdges(body);
  }

  function paginate(canvas, { repeat = "", tail = ".e-permits-doc-page__tail" } = {}) {
    const first = canvas?.querySelector(".e-permits-doc-page");
    if (!first) return;
    canvas.querySelectorAll(".e-permits-doc-page").forEach((page) => { page.style.zoom = ""; });
    const style = window.getComputedStyle(first);
    const room = parseFloat(style.minHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const fits = (page) => {
      page.classList.add("is-measuring");
      const height = page.querySelector(".e-permits-doc-page__surface").scrollHeight;
      page.classList.remove("is-measuring");
      return height <= room + 1;
    };
    /* a page that carries a <template class="e-permits-doc-page__cont-tpl"> (the MDocs macheta, US-306 AC-07) starts every
       continuation page with that simplified header instead of the one-line `data-doc-cont` */
    const contTemplate = first.querySelector("template.e-permits-doc-page__cont-tpl");
    const continuation = (from) => {
      const page = document.createElement("div");
      page.className = from.className;
      if (repeat) from.querySelectorAll(`:scope > :is(${repeat})`).forEach((part) => page.append(part.cloneNode(true)));
      const surface = document.createElement("div");
      surface.className = from.querySelector(".e-permits-doc-page__surface").className;
      const cont = contTemplate ? contTemplate.content.cloneNode(true) : document.createElement("p");
      if (!contTemplate) {
        cont.className = "e-permits-doc-page__cont";
        cont.textContent = first.dataset.docCont || "";
      }
      const table = document.createElement("table");
      const cols = from.querySelector("table > colgroup");
      if (cols) table.append(cols.cloneNode(true));
      table.append(document.createElement("tbody"));
      surface.append(cont, table);
      if (tail) surface.append(...from.querySelectorAll(tail));
      const footer = from.querySelector(".e-permits-doc-page__footer");
      if (footer) surface.append(footer.cloneNode(true));
      page.append(surface);
      return page;
    };
    let page = first;
    for (let guard = 0; guard < 24 && !fits(page); guard += 1) {
      const body = page.querySelector("tbody");
      if (!body || body.rows.length < 2) break;
      const next = continuation(page);
      page.after(next);
      const nextBody = next.querySelector("tbody");
      while (!fits(page) && body.rows.length > 1) nextBody.prepend(body.lastElementChild);
      /* the closing parts never stand alone: the last page keeps at least two rows of the table */
      while (nextBody.rows.length < 2 && body.rows.length > 2) nextBody.prepend(body.lastElementChild);
      /* a heading row, a grid's label / header row never end a page (keep-with-next) */
      while (body.rows.length > 1 && body.lastElementChild?.matches(".e-permits-doc-page__group, .e-permits-doc-page__keep")) nextBody.prepend(body.lastElementChild);
      /* a grid continued on the next page repeats its header row */
      const firstRow = nextBody.firstElementChild;
      const head = firstRow?.dataset.docGridOf ? canvas.querySelector(`[data-doc-grid="${firstRow.dataset.docGridOf}"]`) : null;
      if (head) nextBody.prepend(Object.assign(head.cloneNode(true), { className: `${head.className} is-repeat` }));
      if (!nextBody.rows.length) nextBody.closest("table").remove();
      page = next;
    }
    const pages = canvas.querySelectorAll(".e-permits-doc-page");
    pages.forEach((item, index) => {
      const label = item.querySelector("[data-doc-page-label]");
      if (label) label.textContent = `Pagina ${index + 1} din ${pages.length}`;
    });
  }

  /* the canvas's top-level ancestor stays, everything else in <body> is hidden; inside it only the
     chain down to the canvas is printed (header / footer / other parts hidden by the print CSS) */
  function print(canvas) {
    if (!canvas) return;
    const root = [...document.body.children].find((el) => el.contains(canvas));
    const html = document.documentElement;
    const done = () => {
      html.classList.remove("is-doc-printing");
      root?.removeAttribute("data-doc-print-root");
      canvas.removeAttribute("data-doc-print");
    };
    html.classList.add("is-doc-printing");
    root?.setAttribute("data-doc-print-root", "");
    canvas.setAttribute("data-doc-print", "");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
  }

  const printIcon = (cls = "icon small") => `<svg class="${cls} e-permits-doc-print-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.70833 8.95833H5.625M14.375 11.4583V14.375H16.0417C16.9621 14.375 17.7083 13.6288 17.7083 12.7083V7.29167C17.7083 6.37119 16.9621 5.625 16.0417 5.625H3.95833C3.03786 5.625 2.29167 6.37119 2.29167 7.29167V12.7083C2.29167 13.6288 3.03786 14.375 3.95833 14.375H5.625V11.4583H14.375V16.0417C14.375 16.9621 13.6288 17.7083 12.7083 17.7083H7.29167C6.37119 17.7083 5.625 16.9621 5.625 16.0417V11.4583M7.29167 2.29167H12.7083C13.6288 2.29167 14.375 3.03786 14.375 3.95833V5.625H5.625V3.95833C5.625 3.03786 6.37119 2.29167 7.29167 2.29167Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* the generated document viewer's ONE signature block (doc-viewer-v1, 2026-10-21; GEAP 2.0 11366:6892): a grey tray
     that hangs under the canvas — the Small „Semnat electronic” badge ABOVE one meta line „MSign · <signer> · <date, time>”.
     A generated document shows only the preview + this block (no „Date generale”, no „Doar citire”); unsigned = no block. */
  const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const signatureHtml = ({ by = "", at = "", provider = "MSign", sprite = "assets/icons/sprite.svg" } = {}) => `
      <div class="e-permits-doc-signature" role="group" aria-label="Semnătura documentului">
        <span class="status-tag status-tag--brand is-subtle status-tag--small e-permits-fo-doc-tag"><svg class="icon" aria-hidden="true"><use href="${escapeText(sprite)}#icon-signature"></use></svg>Semnat electronic</span>
        <p class="e-permits-doc-signature__meta">${[provider, by, at].filter(Boolean).map(escapeText).join(" · ")}</p>
      </div>`;

  /* =====================================================================================
     The MDocs standard template — „macheta comună” (machete-mdocs-v1, 2026-10-25; Feature 96074, US-306…US-311).
     ONE page shell for every generated document; the type decides only the title, the number / date line, the
     simplified header of pages 2+, the signature mention (act) and the legal block:
       page 1   header = arms · „Republica Moldova” · issuing authority + subdivision | their address, phone, email,
                site (US-306 AC-02/03) · title (AC-04) · number + date in the type's format (AC-05) · the main
                content (the service's print template data, AC-06) · [act: „Semnat electronic de …” per signer]
       pages 2+ the simplified header: authority · subdivision + „<title> Nr <nr> din <data>” (AC-07, the
                `template.e-permits-doc-page__cont-tpl` paginate() clones)
       every page the SAME footer: QR (type, number, date, authority + the permanent verification link — AC-15) ·
                the legal block of the type (generation date + time, AC-10; personal data, AC-11) · „Pagina X din Y”
     The structure is fixed here (AC-01: never edited from the UI); callers pass data only:
       mdocsHtml({ type, authority, office, title?, number, date, validUntil?, request: { number, date, type, service },
                   introHtml?, rowsHtml | groups, closingHtml?, signers: [{ role, name }], qrUrl?, generatedAt?,
                   pageClass?, repeatHtml? })
         type = cerere | notificare | decizie-refuz | decizie-suspendare | act | certificat
       mdocsRows(groups)   [{ title?, rows: [[label, value | [values]]] }] → the table rows (heading row per titled group)
       mdocsNumber(raw, kind) „Cxxxxxx/anul” (request / notification / decision / certificate) · „P-xxxx/anul” (act)
       mdocsDate(value)    ISO or „8 iulie 2026” → „08.07.2026”
       mdocsState(view, { retryAttrs })  loading | eroare (AC-14 text) | acces („Acces interzis”) — the bare empty state
       issuer(authority)   the issuing authority's profile (contacts + head) — demo table, AC-12 */
  const ASSETS = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/", src).pathname : "assets/";
    } catch (error) {
      return "assets/";
    }
  })();
  const pad2 = (value) => String(value).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const toDate = (value) => {
    if (value instanceof Date) return value;
    const text = String(value ?? "").trim();
    if (!text) return null;
    const long = text.match(/^(\d{1,2})\s+([a-zăâîșțA-Z]+)\s+(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?/);
    if (long && RO_MONTHS.includes(long[2].toLowerCase())) return new Date(Number(long[3]), RO_MONTHS.indexOf(long[2].toLowerCase()), Number(long[1]), Number(long[4] || 0), Number(long[5] || 0));
    const dotted = text.match(/^(\d{2})[./](\d{2})[./](\d{4})(?:,\s*(\d{1,2}):(\d{2}))?/);
    if (dotted) return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]), Number(dotted[4] || 0), Number(dotted[5] || 0));
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const mdocsDate = (value) => {
    const date = toDate(value);
    return date ? `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}` : String(value ?? "");
  };
  const mdocsStamp = (value) => {
    const date = toDate(value) || new Date();
    return `${mdocsDate(date)}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  };
  /* US-306 data model: the request number „Cxxxxxx/anul” (request, notification, decision, certificate), the act
     „P-xxxx/anul”; a prototype number in another format keeps its year and its last digits */
  const mdocsNumber = (raw, kind = "cerere") => {
    const text = String(raw ?? "").trim();
    if (kind === "act" ? /^P-\d+\/\d{4}$/.test(text) : /^C\d{6}\/\d{4}$/.test(text)) return text;
    const year = (text.match(/20\d{2}/) || [String(new Date().getFullYear())])[0];
    const digits = (text.replace(year, "").match(/\d+/g) || ["0"]).pop();
    return kind === "act" ? `P-${digits.slice(-4).padStart(4, "0")}/${year}` : `C${digits.slice(-6).padStart(6, "0")}/${year}`;
  };

  /* the issuing authorities' profile data (demo — the real system reads the authority / subdivision profile at
     generation time, AC-12); unknown authorities get a derived address on gov.md */
  const ISSUERS = [
    [/sănătate publică|\bANSP\b/i, { short: "ANSP", address: "str. Gheorghe Asachi 67A, MD-2028, mun. Chișinău", phone: "+373 22 574 501", email: "office@ansp.gov.md", web: "www.ansp.gov.md", head: { role: "Directorul general", name: "Dumitru Rotaru" } }],
    [/siguranța alimentelor|\bANSA\b/i, { short: "ANSA", address: "str. Mihail Kogălniceanu 63, MD-2009, mun. Chișinău", phone: "+373 22 264 634", email: "info@ansa.gov.md", web: "www.ansa.gov.md", head: { role: "Directorul general", name: "Vasile Moraru" } }],
    [/medicamentului|\bAMDM\b/i, { short: "AMDM", address: "str. Korolenko 2/1, MD-2028, mun. Chișinău", phone: "+373 22 884 301", email: "office@amdm.gov.md", web: "www.amdm.gov.md", head: { role: "Directoarea generală", name: "Silvia Ceban" } }],
    [/transport auto|\bANTA\b/i, { short: "ANTA", address: "bd. Ștefan cel Mare și Sfânt 162, MD-2004, mun. Chișinău", phone: "+373 22 820 500", email: "office@anta.gov.md", web: "www.anta.gov.md", head: { role: "Directorul", name: "Mihail Lungu" } }],
    [/agenția de mediu/i, { short: "AM", address: "str. Valeriu Cupcea 9, MD-2005, mun. Chișinău", phone: "+373 22 204 605", email: "office@am.gov.md", web: "www.am.gov.md", head: { role: "Directoarea", name: "Elena Rusu" } }],
    [/servicii publice|\bASP\b/i, { short: "ASP", address: "str. Arborilor 21, MD-2025, mun. Chișinău", phone: "+373 22 504 710", email: "office@asp.gov.md", web: "www.asp.gov.md", head: { role: "Directorul general", name: "Andrei Popa" } }],
    [/ministerul economiei/i, { short: "MDED", address: "Piața Marii Adunări Naționale 1, MD-2033, mun. Chișinău", phone: "+373 22 250 107", email: "secretariat@mded.gov.md", web: "www.mded.gov.md", head: { role: "Secretarul general de stat", name: "Victor Lungu" } }],
    [/primăria municipiului chișinău/i, { short: "PMC", address: "bd. Ștefan cel Mare și Sfânt 83, MD-2012, mun. Chișinău", phone: "+373 22 201 505", email: "office@pmc.md", web: "www.chisinau.md", head: { role: "Primarul general", name: "Ion Ceban" } }]
  ];
  const issuer = (authority = "") => {
    const known = ISSUERS.find(([pattern]) => pattern.test(authority));
    if (known) return { name: authority, ...known[1] };
    const short = String(authority).split(/\s+/).filter((word) => /^[A-ZĂÂÎȘȚ]/.test(word)).map((word) => word[0]).join("").normalize("NFD").replace(/\p{M}/gu, "") || "GEAP";
    const slug = short.toLowerCase();
    return { name: authority, short, address: "mun. Chișinău", phone: "+373 22 000 000", email: `office@${slug}.gov.md`, web: `www.${slug}.gov.md`, head: { role: "Conducătorul autorității", name: "" } };
  };

  const MDOCS_TYPES = {
    cerere: "Cerere",
    notificare: "Notificare",
    "decizie-refuz": "Decizie de refuz",
    "decizie-suspendare": "Decizie de suspendare",
    act: "Act permisiv",
    certificat: "Certificat constatator"
  };
  /* „Cerere privind (tipul cererii) (denumirea serviciului)” (US-307 AC-05) and the decision's „pentru …” (US-309 AC-04):
     the request type as an action + the service name in quotes */
  const REQUEST_ACTIONS = [
    [/duplicat/i, "eliberarea duplicatului actului permisiv"],
    [/prelung/i, "prelungirea actului permisiv"],
    [/reperfect/i, "reperfectarea actului permisiv"],
    [/relu/i, "reluarea valabilității actului permisiv"],
    [/suspend/i, "suspendarea valabilității actului permisiv"],
    [/retrag/i, "retragerea actului permisiv"],
    [/anul/i, "anularea actului permisiv"],
    [/emitere|eliberare|primar/i, "eliberarea actului permisiv"]
  ];
  const requestAction = (type = "") => (REQUEST_ACTIONS.find(([pattern]) => pattern.test(type)) || [null, `${String(type || "eliberarea").toLocaleLowerCase("ro")} actului permisiv`])[1];
  const requestSubject = (request = {}) => `${requestAction(request.type)}${request.service ? ` „${request.service}”` : ""}`;

  const LEGAL = {
    evo: (at) => `Generat din portalul guvernamental integrat EVO (evo.gov.md) la ${at}.`,
    replica: "Documentul reprezintă o replică vizuală a datelor din SIA GEAP, în conformitate cu Legea nr. 124/2022 și Legea nr. 160/2011.",
    replicaSigned: "Documentul reprezintă o replică vizuală a datelor semnate electronic în SIA GEAP, în conformitate cu Legea nr. 124/2022 și Legea nr. 160/2011.",
    rap: "Verificarea autenticității și a valabilității datelor se efectuează prin scanarea codului QR sau prin accesarea Registrului Actelor Permisive (rap.gov.md).",
    sia: "Generat de Sistemul informațional automatizat de gestionare și emitere a actelor permisive (SIA GEAP), în conformitate cu Legea nr. 160/2011.",
    personal: "Documentul conține date cu caracter personal, prelucrate în condițiile Legii nr. 195/2024."
  };

  const cellValue = (value) => (Array.isArray(value) ? value.filter((part) => String(part ?? "").trim()).map(escapeText).join("<br>") : escapeText(value));
  const mdocsRows = (groups = []) => groups.map((group) => {
    const rows = (group.rows || []).filter(([, value]) => (Array.isArray(value) ? value.length : String(value ?? "").trim()));
    if (!rows.length) return "";
    return `${group.title ? `<tr class="e-permits-doc-page__group"><th colspan="2" scope="colgroup">${escapeText(group.title)}</th></tr>` : ""}${rows.map(([label, value]) => `<tr><td>${escapeText(label)}</td><td>${cellValue(value)}</td></tr>`).join("")}`;
  }).join("");

  function mdocsHtml(spec = {}) {
    const type = MDOCS_TYPES[spec.type] ? spec.type : "cerere";
    const who = issuer(spec.authority || "");
    const isAct = type === "act";
    const isDecision = type.startsWith("decizie");
    const number = mdocsNumber(spec.number, isAct ? "act" : "cerere");
    const date = mdocsDate(spec.date);
    const generated = mdocsStamp(spec.generatedAt || new Date());
    const request = spec.request || {};
    const title = type === "cerere" ? `Cerere privind ${requestSubject(request)}`
      : type === "certificat" ? "CERTIFICAT CONSTATATOR"
      : isDecision ? MDOCS_TYPES[type]
      : spec.title || MDOCS_TYPES[type];
    const requestLine = `privind Cererea Nr.${mdocsNumber(request.number || spec.number)} din ${mdocsDate(request.date)}`;
    const meta = type === "certificat" ? [`Nr. de înregistrare: ${number}`, `Data înregistrării: ${date}`]
      : isAct ? [`Nr. ${number}`, [`Eliberat: ${date}`, spec.validUntil ? (toDate(spec.validUntil) ? `Valabil până la ${mdocsDate(spec.validUntil)}` : `Valabil: ${String(spec.validUntil).toLocaleLowerCase("ro")}`) : ""].filter(Boolean).join(" · ")]
      : isDecision ? [`${requestLine} pentru ${requestSubject(request)}`, date ? `Data deciziei: ${date}` : ""]
      : [`Nr. ${number}`, `Data: ${date}`];
    const contLine = type === "certificat" ? `CERTIFICAT CONSTATATOR Nr. de înregistrare: ${number} din ${date}`
      : isAct ? `${title} · Nr. ${number}`
      : isDecision ? `${title} · ${requestLine}`
      : `${title} Nr ${number} din ${date}`;
    const legal = type === "certificat" ? [LEGAL.sia, `Data și ora generării: ${generated}.`, LEGAL.personal]
      : isAct ? [LEGAL.evo(generated), LEGAL.rap, LEGAL.personal]
      : [LEGAL.evo(generated), isDecision ? LEGAL.replicaSigned : LEGAL.replica, LEGAL.personal];
    const verifyCode = `${type}-${number.replace(/[^\dA-Za-z]+/g, "-")}`.toLowerCase();
    const qrUrl = spec.qrUrl || `https://evo.gov.md/verificare/${verifyCode}`;
    const qrLabel = `Cod QR: ${MDOCS_TYPES[type]} ${number}, ${date}, ${who.name}. Legătura de verificare: ${qrUrl}`;
    const rowsHtml = spec.rowsHtml || mdocsRows(spec.groups || []);
    const signers = isAct ? (spec.signers && spec.signers.length ? spec.signers : [who.head]).filter((signer) => signer && (signer.role || signer.name)) : [];
    const tail = `${spec.closingHtml || ""}${signers.map((signer) => `<p class="e-permits-mdoc__signer"><svg class="icon" aria-hidden="true"><use href="${ASSETS}icons/sprite.svg#icon-signature"></use></svg><span>Semnat electronic de ${escapeText([signer.role, signer.name].filter(Boolean).join(" "))}</span></p>`).join("")}`;
    const issuerLine = [who.name, spec.office].filter(Boolean).map(escapeText).join(" · ");
    return `
      <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page e-permits-mdoc e-permits-mdoc--${type}${spec.pageClass ? ` ${spec.pageClass}` : ""}" data-doc-type="${type}" data-doc-cont="${escapeText(contLine)}">
        ${spec.repeatHtml || ""}
        <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
          <template class="e-permits-doc-page__cont-tpl"><div class="e-permits-mdoc__cont"><p class="e-permits-mdoc__cont-issuer">${issuerLine}</p><p class="e-permits-mdoc__cont-doc">${escapeText(contLine)}</p></div></template>
          <header class="e-permits-mdoc__head">
            <span class="e-permits-mdoc__arms" aria-hidden="true"><img src="${ASSETS}logos/gov.svg" alt=""></span>
            <div class="e-permits-mdoc__issuer">
              <p class="e-permits-mdoc__country">Republica Moldova</p>
              <p class="e-permits-mdoc__authority">${escapeText(who.name)}</p>
              ${spec.office ? `<p class="e-permits-mdoc__office">${escapeText(spec.office)}</p>` : ""}
            </div>
            <ul class="e-permits-mdoc__contact" aria-label="Datele de contact ale autorității emitente">
              <li>${escapeText(who.address)}</li>
              <li>Tel.: ${escapeText(who.phone)}</li>
              <li>Email: ${escapeText(who.email)}</li>
              ${who.web ? `<li>${escapeText(who.web)}</li>` : ""}
            </ul>
          </header>
          <h1 class="e-permits-mdoc__title">${escapeText(title)}</h1>
          <div class="e-permits-mdoc__meta">${meta.filter(Boolean).map((line) => `<p>${escapeText(line)}</p>`).join("")}</div>
          ${spec.introHtml || ""}
          <table><colgroup><col class="e-permits-doc-page__label-col"><col></colgroup><tbody>${rowsHtml}</tbody></table>
          ${tail ? `<div class="e-permits-doc-page__tail e-permits-mdoc__tail">${tail}</div>` : ""}
          <footer class="e-permits-doc-page__footer e-permits-mdoc__footer">
            <span class="e-permits-mdoc__qr" role="img" aria-label="${escapeText(qrLabel)}"><svg class="icon" aria-hidden="true"><use href="${ASSETS}icons/sprite.svg#icon-qr-code"></use></svg></span>
            <div class="e-permits-mdoc__legal">
              ${legal.map((line) => `<p>${escapeText(line)}</p>`).join("")}
              <p class="e-permits-mdoc__link">${escapeText(qrUrl.replace(/^https?:\/\//, ""))}</p>
            </div>
            <p class="e-permits-mdoc__page"><span data-doc-page-label>Pagina 1 din 1</span></p>
          </footer>
        </div>
      </div>`;
  }

  /* the viewer's canvas while MDocs works / when it fails (US-306 AC-14) / without the right (US-307…311 AC-01) */
  const mdocsState = (view, { retryAttrs = "" } = {}) => {
    const empty = window.GEAPEmptyState;
    if (!empty) return "";
    if (view === "loading") return empty.render({ loading: true, bare: true, title: "Se generează documentul", text: "MDocs completează macheta cu datele dosarului. Poate dura câteva secunde." });
    if (view === "acces") return empty.render({ bare: true, icon: "lock", title: "Acces interzis", text: "Nu aveți drept de acces la dosarul acestui document." });
    return empty.render({
      bare: true,
      icon: "circle-error",
      text: "Documentul nu a putut fi generat. Încercați din nou.",
      actionHtml: retryAttrs ? `<button class="btn btn-strict btn-sm" type="button" ${retryAttrs}><svg class="icon small" aria-hidden="true"><use href="${ASSETS}icons/sprite.svg#icon-rotate-arrow"></use></svg><span>Reîncercați</span></button>` : ""
    });
  };

  window.GEAPDocPreview = { fit, paginate, print, printIcon, signatureHtml, mdocsHtml, mdocsRows, mdocsNumber, mdocsDate, mdocsState, issuer, MDOCS_TYPES };
})();
