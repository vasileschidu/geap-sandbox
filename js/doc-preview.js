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
   Used by: Ghișeu previews (js/ghiseu.js), the BO dossier document modal (js/e-permits-shell.js),
   RAP „Forma de tipar a actului” (rap-evo/rap-evo.js).
   ===================================================================================== */
(function () {
  "use strict";

  const PAGE_WIDTH = 794; /* 210mm at 96 dpi */
  const pagesOf = (canvas) => canvas.querySelectorAll(".e-permits-doc-peek__page");

  function fit(canvas) {
    const pages = canvas ? pagesOf(canvas) : [];
    if (!pages.length || !canvas.clientWidth) return;
    const style = window.getComputedStyle(canvas);
    const room = canvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    pages.forEach((page) => { page.style.zoom = String(Math.min(1, room / PAGE_WIDTH)); });
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
    const continuation = (from) => {
      const page = document.createElement("div");
      page.className = from.className;
      if (repeat) from.querySelectorAll(`:scope > :is(${repeat})`).forEach((part) => page.append(part.cloneNode(true)));
      const surface = document.createElement("div");
      surface.className = from.querySelector(".e-permits-doc-page__surface").className;
      const cont = document.createElement("p");
      cont.className = "e-permits-doc-page__cont";
      cont.textContent = first.dataset.docCont || "";
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

  window.GEAPDocPreview = { fit, paginate, print, printIcon };
})();
