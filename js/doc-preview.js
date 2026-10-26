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

  /* ---- Flow pagination of the MDocs module pages (mdocs-system-v1, 2026-10-25). The page body is
     `.e-permits-mdoc__flow`: its children are MODULES. `data-flow="keep"` = atomic (moves whole);
     `data-flow="split"` = breaks between the children of its `[data-flow-items]` (kv rows, table rows, paragraphs,
     attachments) — the part on the next page is a clone of the module without items (`.is-continued`: its
     `[data-flow-head]` title gets „(continuare)”, a table keeps its <thead>, so the header repeats). Rules: an item
     that is a heading / keep row (`.e-permits-doc-page__group`, `.e-permits-doc-page__keep`, `[data-flow-keep]`) or a
     module title never ends a page; `[data-flow-with-prev]` (signatures) never opens a page alone; a configured grid
     continued on the next page repeats its header row (act fields); a block taller than a page stays (no loop). ---- */
  const FLOW = ".e-permits-mdoc__flow";
  const KEEP_ITEM = ".e-permits-doc-page__group, .e-permits-doc-page__keep, [data-flow-keep]";
  function paginateFlow(canvas, first, { repeat = "" } = {}) {
    const style = window.getComputedStyle(first);
    const room = parseFloat(style.minHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const fits = (page) => {
      page.classList.add("is-measuring");
      const height = page.querySelector(".e-permits-doc-page__surface").scrollHeight;
      page.classList.remove("is-measuring");
      return height <= room + 1;
    };
    const contTemplate = first.querySelector("template.e-permits-doc-page__cont-tpl");
    const continuation = (from) => {
      const page = document.createElement("div");
      page.className = from.className;
      if (repeat) from.querySelectorAll(`:scope > :is(${repeat})`).forEach((part) => page.append(part.cloneNode(true)));
      const surface = document.createElement("div");
      surface.className = from.querySelector(".e-permits-doc-page__surface").className;
      if (contTemplate) surface.append(contTemplate.content.cloneNode(true));
      const flow = document.createElement("div");
      flow.className = "e-permits-mdoc__flow";
      surface.append(flow);
      const footer = from.querySelector(".e-permits-doc-page__footer");
      if (footer) surface.append(footer.cloneNode(true));
      page.append(surface);
      return page;
    };
    const itemsOf = (module) => (module?.matches('[data-flow="split"]') ? module.querySelector("[data-flow-items]") : null);
    const pieceOf = (module) => {
      const piece = module.cloneNode(true);
      itemsOf(piece).replaceChildren();
      piece.classList.add("is-continued");
      piece.querySelectorAll("[data-flow-head]").forEach((head) => {
        if (head.querySelector(".e-permits-mdoc__cont-mark")) return;
        const mark = document.createElement("span");
        mark.className = "e-permits-mdoc__cont-mark";
        mark.textContent = " (continuare)";
        head.append(mark);
      });
      piece.mdocSource = module;
      return piece;
    };
    /* one unit from the end of `flow` to the start of `next`; false when nothing can move */
    const moveOne = (flow, next) => {
      const last = flow.lastElementChild;
      if (!last) return false;
      const items = itemsOf(last);
      if (items && items.children.length > 1) {
        let piece = next.firstElementChild;
        if (!piece || piece.mdocSource !== last) { piece = pieceOf(last); next.prepend(piece); }
        itemsOf(piece).prepend(items.lastElementChild);
        return true;
      }
      if (flow.children.length < 2) return false;
      const piece = next.firstElementChild;
      next.prepend(last);
      if (piece && piece.mdocSource === last) {
        itemsOf(last).append(...itemsOf(piece).children);
        piece.remove();
      }
      return true;
    };
    /* the reverse of moveOne: the first unit of `next` back to the end of `flow` */
    const pullOne = (flow, next) => {
      const head = next.firstElementChild;
      if (!head) return false;
      const last = flow.lastElementChild;
      if (head.mdocSource && head.mdocSource === last) {
        const item = itemsOf(head).firstElementChild;
        if (!item) return false;
        itemsOf(last).append(item);
        if (!itemsOf(head).children.length) head.remove();
        return true;
      }
      if (head.mdocSource) return false;
      flow.append(head);
      return true;
    };
    const dangles = (flow) => {
      const last = flow.lastElementChild;
      const items = itemsOf(last);
      return Boolean(last) && ((items && (!items.lastElementChild || items.lastElementChild.matches(KEEP_ITEM))) || last.matches("[data-flow-keep-next]"));
    };
    let page = first;
    for (let guard = 0; guard < 30 && !fits(page); guard += 1) {
      const flow = page.querySelector(FLOW);
      if (!flow) break;
      const next = continuation(page);
      page.after(next);
      const nextFlow = next.querySelector(FLOW);
      let moved = 0;
      while (!fits(page) && moveOne(flow, nextFlow)) moved += 1;
      for (let step = 0; step < 6; step += 1) {
        const last = flow.lastElementChild;
        if (!last) break;
        const items = itemsOf(last);
        const dangling = (items && (!items.lastElementChild || items.lastElementChild.matches(KEEP_ITEM))) || last.matches("[data-flow-keep-next]");
        if (!dangling || !moveOne(flow, nextFlow)) break;
        moved += 1;
      }
      if (nextFlow.firstElementChild?.matches("[data-flow-with-prev]") && moveOne(flow, nextFlow)) moved += 1;
      /* backfill: moving a tall block from the end can leave room — pull the next page's first units back one by one
         while the page still fits and no heading / keep row would end it */
      for (let step = 0; step < 60 && pullOne(flow, nextFlow); step += 1) {
        if (fits(page) && !dangles(flow) && !nextFlow.firstElementChild?.matches("[data-flow-with-prev]")) continue;
        for (let back = 0; back < 60 && (!fits(page) || dangles(flow)) && moveOne(flow, nextFlow); back += 1);
        if (nextFlow.firstElementChild?.matches("[data-flow-with-prev]")) moveOne(flow, nextFlow);
        break;
      }
      if (!nextFlow.children.length) { next.remove(); break; }
      const firstRow = itemsOf(nextFlow.firstElementChild)?.firstElementChild;
      const head = firstRow?.dataset?.docGridOf ? canvas.querySelector(`[data-doc-grid="${firstRow.dataset.docGridOf}"]:not(.is-repeat)`) : null;
      if (head) firstRow.before(Object.assign(head.cloneNode(true), { className: `${head.className} is-repeat` }));
      if (!moved) { next.remove(); break; }
      page = next;
    }
  }

  function paginate(canvas, { repeat = "", tail = ".e-permits-doc-page__tail" } = {}) {
    const first = canvas?.querySelector(".e-permits-doc-page");
    if (!first) return;
    if (first.querySelector(FLOW)) {
      canvas.querySelectorAll(".e-permits-doc-page").forEach((page) => { page.style.zoom = ""; });
      paginateFlow(canvas, first, { repeat });
      const all = canvas.querySelectorAll(".e-permits-doc-page");
      all.forEach((item, index) => {
        const label = item.querySelector("[data-doc-page-label]");
        if (label) label.textContent = `Pagina ${index + 1} din ${all.length}`;
      });
      return;
    }
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
  /* the permanent public verification link printed under the QR (AC-15), never the prototype's own address:
     an act = its RAP page „rap.gov.md/act/p-9031-2026”; every other document = „evo.gov.md/verificare/<type>-<number>” */
  const verifySlug = (number) => String(number ?? "").replace(/[^\dA-Za-z]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const verifyUrl = (type, number) => (type === "act"
    ? `https://rap.gov.md/act/${verifySlug(mdocsNumber(number, "act"))}`
    : `https://evo.gov.md/verificare/${type}-${verifySlug(number)}`);

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

  /* =====================================================================================
     MDocs DOCUMENT SYSTEM (mdocs-system-v1, 2026-10-25) — modules + templates.
     A document = a TEMPLATE (an ordered list of module configs) + its DATA (`mdocData(spec)`). Each module is one
     render function: data in, markup out; it returns "" when its data is missing, so templates stay plain lists.
     Zones (US-306 AC-01 / AC-06): every module carries `data-mdoc-zone` —
       locked   = the macheta (header, title block, continuation header, signatures, footer): fixed in code, filled by
                  the system; never edited from the UI;
       editable = the main content (parties, data grids, tables, text, outcome, attachments): what the service's print
                  template (US-227) produces — the only zone a template editor may change (no editor rework yet).
     Placement: `place: "head"` = page 1 above the flow; `continuation` = the <template> pages 2+ start with;
     `footer` = every page; everything else flows in `.e-permits-mdoc__flow` and paginates (paginateFlow).
     ===================================================================================== */
  const esc = escapeText;
  const spriteIcon = (id, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="${ASSETS}icons/sprite.svg#icon-${id}"></use></svg>`;
  const filled = (value) => (Array.isArray(value) ? value.some((part) => String(part ?? "").trim()) : String(value ?? "").trim() !== "");
  const zoneOf = (cfg, fallback) => cfg.zone || fallback;

  /* a QR-like code drawn from the verification link (deterministic; MDocs generates the real, scannable code — AC-15):
     25 × 25 modules, the three finder squares, timing lines and one alignment square */
  const hashText = (text) => {
    let h = 2166136261;
    for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  function qrSvg(text) {
    const n = 25;
    let seed = hashText(text) || 1;
    const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
    const square = (x, y, size, hollowRing) => (r, c) => {
      const dx = c - x; const dy = r - y;
      if (dx < 0 || dy < 0 || dx >= size || dy >= size) return null;
      const mid = (size - 1) / 2;
      return Math.max(Math.abs(dx - mid), Math.abs(dy - mid)) !== hollowRing;
    };
    const finders = [square(0, 0, 7, 2), square(n - 7, 0, 7, 2), square(0, n - 7, 7, 2), square(n - 9, n - 9, 5, 1)];
    const path = [];
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        let dark = null;
        for (const test of finders) { const v = test(r, c); if (v !== null) { dark = v; break; } }
        if (dark === null && ((r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8))) dark = false;
        if (dark === null && (r === 6 || c === 6)) dark = (r + c) % 2 === 0;
        if (dark === null) dark = rnd() < 0.48;
        if (dark) path.push(`M${c} ${r}h1v1h-1z`);
      }
    }
    return `<svg class="e-permits-mdoc__qr-code" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${path.join("")}" fill="currentColor"/></svg>`;
  }

  /* a signing moment: date + time, or the date alone when only a day is known */
  const signedOn = (value) => {
    const date = toDate(value);
    return date && (date.getHours() || date.getMinutes()) ? mdocsStamp(date) : mdocsDate(value);
  };
  const sectionTitle = (title) => (title ? `<h2 class="e-permits-mdoc__section-title" data-flow-head>${esc(title)}</h2>` : "");
  const OUTCOME_TONES = {
    approved: { tone: "positive", icon: "circle-checkmark-filled" },
    refused: { tone: "danger", icon: "circle-error-filled" },
    suspended: { tone: "warning", icon: "pause" },
    info: { tone: "info", icon: "circle-info-filled" }
  };
  const CHIP_TONES = { success: "positive", positive: "positive", warning: "warning", danger: "danger", brand: "info", info: "info", accent: "info", neutral: "neutral" };

  const MODULES = {
    /* header — variant full (arms · issuer · contacts in a column) | compact (one band) | emblem (centred, acts and
       certificates); AC-02 / AC-03 */
    header(d, cfg = {}) {
      const variant = ["full", "compact", "emblem"].includes(cfg.variant) ? cfg.variant : "full";
      const who = d.issuer;
      const contacts = [who.address, who.phone ? `Tel.: ${who.phone}` : "", who.email ? `Email: ${who.email}` : "", who.web].filter(filled);
      return `
          <header class="e-permits-mdoc__head e-permits-mdoc__head--${variant}" data-mdoc-module="header" data-mdoc-zone="${zoneOf(cfg, "locked")}">
            <span class="e-permits-mdoc__arms" aria-hidden="true"><img src="${ASSETS}logos/gov.svg" alt=""></span>
            <div class="e-permits-mdoc__issuer">
              <p class="e-permits-mdoc__country">Republica Moldova</p>
              <p class="e-permits-mdoc__authority">${esc(who.name)}</p>
              ${d.office ? `<p class="e-permits-mdoc__office">${esc(d.office)}</p>` : ""}
            </div>
            <ul class="e-permits-mdoc__contact" aria-label="Datele de contact ale autorității emitente">${contacts.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
          </header>`;
    },
    /* continuation header — pages 2+ (AC-07): issuer line · the document line of the type */
    continuation(d, cfg = {}) {
      return `<div class="e-permits-mdoc__cont" data-mdoc-module="continuation" data-mdoc-zone="${zoneOf(cfg, "locked")}"><p class="e-permits-mdoc__cont-issuer">${esc(d.issuerLine)}</p><p class="e-permits-mdoc__cont-doc">${esc(d.contLine)}</p></div>`;
    },
    /* title block — overline (document type, only when the title does not already say it) · status chip · title ·
       decision line · number / date pairs (AC-04 / AC-05); align start | center */
    title(d, cfg = {}) {
      const align = cfg.align === "center" ? "center" : "start";
      const chip = d.status?.label ? `<span class="e-permits-mdoc-chip e-permits-mdoc-chip--${CHIP_TONES[d.status.tone] || "neutral"}">${esc(d.status.label)}</span>` : "";
      const overline = d.overline ? `<p class="e-permits-mdoc-title__overline">${esc(d.overline)}</p>` : "";
      return `
          <div class="e-permits-mdoc-title e-permits-mdoc-title--${align}" data-mdoc-module="title" data-mdoc-zone="${zoneOf(cfg, "locked")}">
            ${overline || chip ? `<div class="e-permits-mdoc-title__top">${overline}${chip}</div>` : ""}
            <h1 class="e-permits-mdoc__title">${esc(d.title)}</h1>
            ${d.subline ? `<p class="e-permits-mdoc-title__subline">${esc(d.subline)}</p>` : ""}
            ${d.meta.length ? `<dl class="e-permits-mdoc__meta">${d.meta.map(([label, value]) => `<div><dt>${esc(label)}</dt> <dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
          </div>`;
    },
    /* party block — applicant / beneficiary / representative, 1–3 columns */
    parties(d, cfg = {}) {
      const list = (d.parties || []).filter((party) => party && filled(party.name));
      if (!list.length) return "";
      return `
          <section class="e-permits-mdoc-parties e-permits-mdoc-parties--n${Math.min(list.length, 3)}" data-mdoc-module="parties" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="keep">
            ${list.map((party) => `<div class="e-permits-mdoc-party"><p class="e-permits-mdoc__label">${esc(party.role)}</p><p class="e-permits-mdoc-party__name">${esc(party.name)}</p>${(party.lines || []).filter(filled).map((line) => `<p class="e-permits-mdoc-party__line">${esc(line)}</p>`).join("")}</div>`).join("")}
          </section>`;
    },
    /* key–value data grid — one module per group { title?, rows: [[label, value | [values]]], columns: 1 | 2 } */
    kv(d, cfg = {}, group = cfg.group || {}) {
      const rows = (group.rows || []).filter(([, value]) => filled(value));
      if (!rows.length) return "";
      const cols = group.columns === 2 ? 2 : 1;
      return `
          <section class="e-permits-mdoc-kv e-permits-mdoc-kv--${cols}col" data-mdoc-module="kv" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="split">
            ${sectionTitle(group.title)}
            <dl class="e-permits-mdoc-kv__list" data-flow-items>${rows.map(([label, value]) => `<div class="e-permits-mdoc-kv__row"><dt>${esc(label)}</dt> <dd>${cellValue(value)}</dd></div>`).join("")}</dl>
          </section>`;
    },
    /* every data group of the document, in order */
    groups(d, cfg = {}) {
      return (d.groups || []).map((group) => MODULES.kv(d, cfg, group)).join("");
    },
    /* pre-built rows (the act's configured fields: heading rows, grids with a repeated header — act-view docGridRows) */
    rows(d, cfg = {}) {
      if (!d.rowsHtml) return "";
      return `
          <section class="e-permits-mdoc-kv e-permits-mdoc-kv--rows" data-mdoc-module="kv" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="split">
            <table class="e-permits-mdoc-kv__table"><colgroup><col class="e-permits-doc-page__label-col"><col></colgroup><tbody data-flow-items>${d.rowsHtml}</tbody></table>
          </section>`;
    },
    /* table — repeated items { title?, columns: [{ label, align: "end", width: "num|narrow|medium" }], rows: [[…]],
       total?: [label, value] }; the header row repeats on every page */
    table(d, cfg = {}) {
      return (d.tables || []).filter((table) => table.rows?.length).map((table) => {
        const cols = table.columns || [];
        const end = (index) => (cols[index]?.align === "end" ? ' class="is-number"' : "");
        return `
          <section class="e-permits-mdoc-table" data-mdoc-module="table" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="split">
            ${sectionTitle(table.title)}
            <table class="e-permits-mdoc-table__grid"><colgroup>${cols.map((col) => `<col${col.width ? ` class="e-permits-mdoc-table__col--${col.width}"` : ""}>`).join("")}</colgroup>
              <thead><tr>${cols.map((col, index) => `<th scope="col"${end(index)}>${esc(col.label)}</th>`).join("")}</tr></thead>
              <tbody data-flow-items>${table.rows.map((row) => `<tr>${row.map((value, index) => `<td${end(index)}>${cellValue(value)}</td>`).join("")}</tr>`).join("")}${table.total ? `<tr class="is-total"><td colspan="${Math.max(1, cols.length - 1)}">${esc(table.total[0])}</td><td class="is-number">${esc(table.total[1])}</td></tr>` : ""}</tbody>
            </table>
          </section>`;
      }).join("");
    },
    /* text body — { title?, paragraphs: [], points: [] } (numbered points with a hanging number) or { html } */
    text(d, cfg = {}) {
      const text = d[cfg.key || "text"];
      if (!text) return "";
      const body = text.html || [
        ...(text.paragraphs || []).filter(filled).map((line) => `<p>${esc(line)}</p>`),
        ...(text.points || []).filter(filled).map((line, index) => `<p class="e-permits-mdoc-text__point"><span class="e-permits-mdoc-text__num">${index + 1}.</span><span>${esc(line)}</span></p>`)
      ].join("");
      if (!body) return "";
      return `
          <section class="e-permits-mdoc-text${cfg.key === "closing" ? " e-permits-mdoc-text--closing" : ""}" data-mdoc-module="text" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="split">
            ${sectionTitle(text.title)}
            <div class="e-permits-mdoc-text__flow" data-flow-items>${body}</div>
          </section>`;
    },
    /* decision / outcome callout — { tone: approved | refused | suspended | info, title, text } */
    outcome(d, cfg = {}) {
      const outcome = d.outcome;
      if (!outcome?.title) return "";
      const look = OUTCOME_TONES[outcome.tone] || OUTCOME_TONES.info;
      return `
          <section class="e-permits-mdoc-outcome e-permits-mdoc-outcome--${look.tone}" data-mdoc-module="outcome" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="keep">
            ${spriteIcon(look.icon, "icon e-permits-mdoc-outcome__icon")}
            <div class="e-permits-mdoc-outcome__body"><p class="e-permits-mdoc-outcome__title">${esc(outcome.title)}</p>${outcome.text ? `<p class="e-permits-mdoc-outcome__text">${esc(outcome.text)}</p>` : ""}</div>
          </section>`;
    },
    /* signature block — 1–n signers { role, name, signedAt?, provider?, pending? }: „Semnat electronic de (funcția)
       (nume)” (US-310 AC-07/08) + the MSign line when signed; pending = dashed line „Spre semnare” */
    signatures(d, cfg = {}) {
      const signers = (d.signers || []).filter((signer) => signer && (filled(signer.role) || filled(signer.name)));
      if (!signers.length) return "";
      return `
          <section class="e-permits-mdoc-signatures" data-mdoc-module="signatures" data-mdoc-zone="${zoneOf(cfg, "locked")}" data-flow="keep" data-flow-with-prev>
            ${signers.map((signer) => `<div class="e-permits-mdoc-sign${signer.pending ? " is-pending" : ""}">
              <p class="e-permits-mdoc-sign__lead">${spriteIcon("signature", "icon")}<span>${signer.pending ? "Spre semnare de" : "Semnat electronic de"}</span></p>
              ${signer.role ? `<p class="e-permits-mdoc-sign__role">${esc(signer.role)}</p>` : ""}
              ${signer.name ? `<p class="e-permits-mdoc-sign__name">${esc(signer.name)}</p>` : ""}
              ${signer.signedAt && toDate(signer.signedAt) ? `<p class="e-permits-mdoc-sign__meta">${esc(`${signer.provider || "MSign"} · ${signedOn(signer.signedAt)}`)}</p>` : signer.pending ? '<p class="e-permits-mdoc-sign__meta">În așteptarea semnăturii MSign</p>' : ""}
            </div>`).join("")}
          </section>`;
    },
    /* attachments list — [{ name, meta? }] */
    attachments(d, cfg = {}) {
      const list = (d.attachments || []).filter((item) => item && filled(item.name));
      if (!list.length) return "";
      return `
          <section class="e-permits-mdoc-files" data-mdoc-module="attachments" data-mdoc-zone="${zoneOf(cfg, "editable")}" data-flow="split">
            ${sectionTitle(d.attachmentsTitle || "Acte anexate")}
            <ol class="e-permits-mdoc-files__list" data-flow-items>${list.map((item, index) => `<li><span class="e-permits-mdoc-files__num">${index + 1}</span><span class="e-permits-mdoc-files__name">${esc(item.name)}</span>${item.meta ? `<span class="e-permits-mdoc-files__meta">${esc(item.meta)}</span>` : ""}</li>`).join("")}</ol>
          </section>`;
    },
    /* footer — identical on every page (AC-08): QR (AC-15) · verification link · the type's legal block with the
       generation time (AC-10 / AC-11) · „Pagina X din Y” (AC-09) */
    footer(d, cfg = {}) {
      return `
          <footer class="e-permits-doc-page__footer e-permits-mdoc__footer" data-mdoc-module="footer" data-mdoc-zone="${zoneOf(cfg, "locked")}">
            <span class="e-permits-mdoc__qr" role="img" aria-label="${esc(d.qrLabel)}">${qrSvg(d.qrUrl)}</span>
            <div class="e-permits-mdoc__verify">
              <p class="e-permits-mdoc__label">Verificare</p>
              <p class="e-permits-mdoc__link">${esc(d.qrUrl.replace(/^https?:\/\//, ""))}</p>
              <div class="e-permits-mdoc__legal">${d.legal.map((line) => `<p>${esc(line)}</p>`).join("")}</div>
            </div>
            <p class="e-permits-mdoc__page"><span data-doc-page-label>Pagina 1 din 1</span></p>
          </footer>`;
    }
  };

  /* TEMPLATES — each document type = ONLY its ordered list of modules (+ the data from mdocData). */
  const CHROME_END = [{ module: "footer" }];
  const TEMPLATES = {
    cerere: [
      { module: "continuation" }, { module: "header", variant: "full", place: "head" }, { module: "title", align: "start", place: "head" },
      { module: "parties" }, { module: "text", key: "intro" }, { module: "groups" }, { module: "rows" }, { module: "table" },
      { module: "attachments" }, { module: "text", key: "closing" }, { module: "signatures" }, ...CHROME_END
    ],
    notificare: [
      { module: "continuation" }, { module: "header", variant: "compact", place: "head" }, { module: "title", align: "start", place: "head" },
      { module: "text", key: "intro" }, { module: "outcome" }, { module: "groups" }, { module: "rows" }, { module: "table" },
      { module: "text", key: "closing" }, ...CHROME_END
    ],
    "decizie-refuz": [
      { module: "continuation" }, { module: "header", variant: "full", place: "head" }, { module: "title", align: "start", place: "head" },
      { module: "outcome" }, { module: "parties" }, { module: "text", key: "intro" }, { module: "groups" }, { module: "rows" },
      { module: "text", key: "points" }, { module: "text", key: "closing" }, { module: "signatures" }, ...CHROME_END
    ],
    act: [
      { module: "continuation" }, { module: "header", variant: "emblem", place: "head" }, { module: "title", align: "center", place: "head" },
      { module: "parties" }, { module: "groups" }, { module: "rows" }, { module: "table" }, { module: "text", key: "closing" },
      { module: "signatures" }, ...CHROME_END
    ],
    certificat: [
      { module: "continuation" }, { module: "header", variant: "emblem", place: "head" }, { module: "title", align: "center", place: "head" },
      { module: "parties" }, { module: "text", key: "intro" }, { module: "groups" }, { module: "rows" }, { module: "table" },
      { module: "text", key: "closing" }, ...CHROME_END
    ]
  };
  TEMPLATES["decizie-suspendare"] = TEMPLATES["decizie-refuz"];

  /* the data every module reads, from the caller's spec (the old spec keys keep working: groups, rowsHtml,
     introHtml, closingHtml, signers, qrUrl, repeatHtml, pageClass) */
  function mdocData(spec = {}) {
    const type = MDOCS_TYPES[spec.type] ? spec.type : "cerere";
    const who = { ...issuer(spec.authority || ""), ...(spec.issuer || {}) };
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
    const valid = spec.validUntil ? (toDate(spec.validUntil) ? ["Valabil până la", mdocsDate(spec.validUntil)] : ["Valabil:", String(spec.validUntil).toLocaleLowerCase("ro")]) : null;
    const meta = type === "certificat" ? [["Nr. de înregistrare:", number], ["Data înregistrării:", date]]
      : isAct ? [["Nr.", number], ["Eliberat:", date], ...(valid ? [valid] : [])]
      : isDecision ? (date ? [["Data deciziei:", date]] : [])
      : [["Nr.", number], ["Data:", date]];
    const contLine = type === "certificat" ? `CERTIFICAT CONSTATATOR Nr. de înregistrare: ${number} din ${date}`
      : isAct ? `${title} · Nr. ${number}`
      : isDecision ? `${title} · ${requestLine}`
      : `${title} Nr ${number} din ${date}`;
    const legal = spec.legal || (type === "certificat" ? [LEGAL.sia, `Data și ora generării: ${generated}.`, LEGAL.personal]
      : isAct ? [LEGAL.evo(generated), LEGAL.rap, LEGAL.personal]
      : [LEGAL.evo(generated), isDecision ? LEGAL.replicaSigned : LEGAL.replica, LEGAL.personal]);
    const qrUrl = spec.qrUrl || verifyUrl(type, number);
    const typeLabel = MDOCS_TYPES[type];
    const textOf = (value, html) => (value ? (Array.isArray(value) ? { paragraphs: value } : value) : html ? { html } : null);
    return {
      type, typeLabel, number, date, title, issuer: who, office: spec.office || "",
      overline: spec.overline ?? (title.toLocaleLowerCase("ro").startsWith(typeLabel.toLocaleLowerCase("ro")) ? "" : typeLabel),
      status: spec.status || null,
      subline: isDecision ? `${requestLine} pentru ${requestSubject(request)}` : (spec.subline || ""),
      meta, contLine,
      issuerLine: [who.name, spec.office].filter(Boolean).join(" · "),
      parties: spec.parties || [],
      intro: textOf(spec.intro, spec.introHtml),
      closing: textOf(spec.closing, spec.closingHtml),
      points: spec.points ? { title: spec.pointsTitle || "", points: spec.points } : null,
      text: spec.text || null,
      groups: spec.groups || [],
      rowsHtml: spec.rowsHtml || "",
      tables: spec.tables || (spec.table ? [spec.table] : []),
      outcome: spec.outcome || null,
      attachments: spec.attachments || [],
      attachmentsTitle: spec.attachmentsTitle || "",
      /* the act names its signers (US-310 AC-07/08; default the authority head), signed with MSign on the issue date */
      signers: isAct ? (spec.signers && spec.signers.length ? spec.signers : [who.head]).map((signer) => (signer ? { signedAt: spec.signedAt || spec.date, ...signer } : signer)) : (spec.signers || []),
      legal, qrUrl,
      qrLabel: `Cod QR: ${typeLabel} ${number}, ${date}, ${who.name}. Legătura de verificare: ${qrUrl}`
    };
  }

  /* one A4 page shell + the template's modules (header / title on page 1, the flow, the footer, the continuation
     template); paginate() then flows the modules over as many pages as they need */
  function renderDoc(template, data, { pageClass = "", repeatHtml = "" } = {}) {
    const list = Array.isArray(template) ? template : TEMPLATES[template] || TEMPLATES.cerere;
    const parts = { head: [], flow: [], cont: "", footer: "" };
    list.forEach((cfg) => {
      const render = MODULES[cfg.module];
      if (!render) return;
      const html = render(data, cfg);
      if (!html) return;
      if (cfg.module === "continuation") parts.cont = html;
      else if (cfg.module === "footer") parts.footer = html;
      else (cfg.place === "head" ? parts.head : parts.flow).push(html);
    });
    return `
      <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page e-permits-mdoc e-permits-mdoc--${data.type}${pageClass ? ` ${pageClass}` : ""}" data-doc-type="${data.type}" data-doc-cont="${esc(data.contLine)}">
        ${repeatHtml}
        <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
          ${parts.cont ? `<template class="e-permits-doc-page__cont-tpl">${parts.cont}</template>` : ""}
          ${parts.head.join("")}
          <div class="e-permits-mdoc__flow">${parts.flow.join("")}</div>
          ${parts.footer}
        </div>
      </div>`;
  }

  function mdocsHtml(spec = {}) {
    const data = mdocData(spec);
    return renderDoc(spec.template || data.type, data, { pageClass: spec.pageClass || "", repeatHtml: spec.repeatHtml || "" });
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

  window.GEAPDocPreview = {
    fit, paginate, print, printIcon, signatureHtml, mdocsHtml, mdocsRows, mdocsNumber, mdocsDate, verifyUrl, mdocsState, issuer, MDOCS_TYPES,
    /* the document system (mdocs-system-v1): modules, templates, data, page shell, QR — the specimen (mdoc-sys) and
       any new document type compose these */
    mdoc: { MODULES, TEMPLATES, data: mdocData, render: renderDoc, qrSvg, stamp: mdocsStamp }
  };
})();
