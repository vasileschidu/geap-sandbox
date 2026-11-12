/* =====================================================================================
   Administrarea autorităților și subdiviziunilor (aut-v1, 2026-11-02) — Azure Feature 89938:
   US-87 (89957) sincronizare din RSSP · US-88 (89958) creare manuală (IDNO + MConnect) · US-89 (89959) lista ·
   US-90 (89960) actualizare · US-91 (89961) conversie manuală → RSSP · US-92 (89962) activare / inactivare + cascadă ·
   US-93 (89963) creare subdiviziune · US-94 (89965) actualizare subdiviziune · US-95 (89964) lista subdiviziunilor ·
   US-96 (89966) activare / inactivare subdiviziune · US-112 (90593) sincronizare automată.

   No new component — every piece is an existing pattern:
     · two lists on the BO registry engine (`window.GEAPShellRegistries.autoritati` / `.subdiviziuni`): search, the
       „Filtrare” chip (facets), sortable headers, CSV export, primary „Adaugă …”; the subdivisions list is grouped by
       authority (engine `groupBy`). Above the authorities toolbar: „Ultima sincronizare” + notices; before the primary:
       „Sincronizează din RSSP” (library neutral Small);
     · profiles = the shared profile panel (page header with the top-bar back chevron, actions right, tabs);
     · create / edit = the ONE drawer (`.drawer-overlay > .drawer`, step strip for „Adaugă autoritate”);
     · confirmations = askConfirm; the cascade confirm + the sync report = the library dialog (#case-action-modal).
   Routes: #authorities · #subdivisions (menu) · #autoritate/<id>/<tab> · #subdiviziune/<id>/<tab>.
   Demo switches (?…): rssp=indisponibil|intrerupt|in-curs|auto-esuat|niciodata · mconnect=indisponibil ·
   autoritati=gol · subdiviziuni=gol · duplicat=1 (IDNO registered meanwhile) · conflict=1 (edited by someone else).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20, cls = "icon") => `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || U().renderTag?.(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const params = new URLSearchParams(window.location.search);
  const RSSP_MODE = params.get("rssp") || "";
  const KIND_A = "autoritati";
  const KIND_S = "subdiviziuni";
  const NAV_A = "authorities";
  const NAV_S = "subdivisions";
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const pad = (n) => String(n).padStart(2, "0");
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const longDate = (iso) => { if (!iso) return ""; const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const stamp = (iso) => (iso ? `${longDate(iso)}, ${String(iso).slice(11, 16)}` : "");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const userName = () => A().currentUserName?.() || "Vasile Schidu";
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));
  const fold = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null, syncing: null, lastSync: null, journal: [] };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (S.loading) return S.loading;
    S.loading = fetch("data/autoritati.json", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      S.data = d;
      S.lastSync = RSSP_MODE === "niciodata" ? null : d.lastSync;
      if (params.get("autoritati") === "gol") { d.authorities = []; d.subdivisions = []; S.lastSync = null; }
      if (params.get("subdiviziuni") === "gol") d.subdivisions = [];
      if (RSSP_MODE === "niciodata") d.authorities.forEach((a) => { a.lastSync = null; });
      if (RSSP_MODE === "in-curs") S.syncing = { by: "SIA GEAP", mode: "automată", at: "2026-11-02T09:00:04" };
      d.authorities.forEach((a) => { a.events = seedEvents(a); });
      d.subdivisions.forEach((s) => { s.version = 1; s.events = [{ at: "2026-09-14T10:20:00", user: "Vasile Schidu", type: "Creare subdiviziune", status: "Reușit", detail: `${s.name} – ${authOf(s.authorityId)?.code || ""}` }]; });
      if (RSSP_MODE === "auto-esuat") {
        S.journal.unshift({ at: "2026-11-02T03:00:00", user: "SIA GEAP", type: "Sincronizare automată neinițiată", status: "Eșuat", detail: "RSSP indisponibil (timeout 30 s). Se reia la următorul ciclu programat." });
      }
      return d;
    });
    return S.loading;
  }
  function seedEvents(a) {
    const list = [{ at: a.createdAt, user: a.createdBy, type: a.source === "RSSP" ? "Creare la sincronizarea serviciilor" : "Creare autoritate", status: "Reușit", detail: a.source === "RSSP" ? "Importată din RSSP (US-111)" : `IDNO ${a.idno} · date preluate din MConnect` }];
    if (a.lastSync) list.unshift({ at: a.lastSync, user: "SIA GEAP", type: "Sincronizare automată din RSSP", status: "Reușit", detail: "Fără modificări" });
    if (RSSP_MODE === "auto-esuat" && a.source === "RSSP") list.unshift({ at: "2026-11-02T03:00:00", user: "SIA GEAP", type: "Sincronizare automată neinițiată", status: "Eșuat", detail: "RSSP indisponibil" });
    return list;
  }
  const D = () => S.data || { authorities: [], subdivisions: [], types: [], subTypes: [], approvedBy: [], raioane: [] };
  const authOf = (id) => D().authorities.find((a) => a.id === id) || null;
  const subOf = (id) => D().subdivisions.find((s) => s.id === id) || null;
  const subsOf = (authId) => D().subdivisions.filter((s) => s.authorityId === authId).sort((x, y) => x.name.localeCompare(y.name, "ro"));
  const isRssp = (a) => a?.source === "RSSP";
  const displayName = (name, authId) => (name ? `${name} – ${authOf(authId)?.nameRo || ""}`.replace(/ – $/, "") : "");
  const ADDR_KEYS = ["raion", "localitate", "strada", "casa", "bloc", "etaj", "oficiu", "postal"];
  const addressOf = (v) => ADDR_KEYS.map((k) => String(v[k] || "").trim()).filter(Boolean).join(", ");
  const raionOf = (name) => D().raioane.find((r) => r.name === name) || null;
  const localityOf = (raion, name) => raionOf(raion)?.localities.find((l) => l.name === name) || null;

  /* ---------------------------------------------------------------- who */
  const who = () => {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    return { central, local, admin: central || local, authorityId: local && a.authority ? `aut-${a.authority}` : "", roleLabel: a.roleLabel || "" };
  };
  const canSeeSub = (s) => who().central || (who().local && s.authorityId === who().authorityId);
  function audit(target, type, detail, { status = "Reușit", user = userName() } = {}) {
    const e = { at: nowIso(), user, type, status, detail };
    if (target) (target.events ||= []).unshift(e);
    S.journal.unshift(e);
    return e;
  }

  /* ---------------------------------------------------------------- sync lock (US-87 AC-18, US-90 AC-04/05, US-112 AC-10) */
  const SYNC_BUSY = "O sincronizare din RSSP este în curs. Butonul revine la finalizarea ei.";
  const syncBusy = () => Boolean(S.syncing);

  /* ================================================================ LIST — Autorități (US-89) */
  const yesNo = (v) => (v ? tag("Da", "success") : tag("Nu", "neutral"));
  const rowOfAuthority = (a) => ({
    id: a.id, idno: a.idno || "", denumire: a.nameRo, cod: a.code, website: a.website || "", tip: a.type || "",
    telefon: (a.phones || [])[0] || "", telefoane: a.phones || [], adresa: a.address || "", activ: a.active ? "Da" : "Nu",
    sursa: isRssp(a) ? "Sincronizată din RSSP" : "Creată manual", a
  });
  function authoritiesDb() {
    if (!S.data) load().then(() => refreshIfOpen(KIND_A, NAV_A));
    const central = who().central;
    return {
      kind: KIND_A,
      fixedWidths: true,
      fieldCount: 7,
      /* US-89 AC-04: by Denumire, ascending */
      defaultSort: "denumire",
      defaultSortDirection: "asc",
      columns: {
        idno: { label: "IDNO", width: 168, sortable: true },
        denumire: { label: "Denumire", width: 360, sortable: true },
        website: { label: "Website", width: 168 },
        tip: { label: "Tip", width: 232, fill: true, sortable: true },
        telefon: { label: "Telefon", width: 160 },
        adresa: { label: "Adresă", width: 264, fill: true },
        activ: { label: "Activ", width: 88, sortable: true },
        ...(central ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND_A]: {
          title: "Autorități",
          selectable: false,
          searchPlaceholder: "Caută după IDNO, denumire, cod, tip sau adresă",
          columns: ["idno", "denumire", "website", "tip", "telefon", "adresa", "activ", ...(central ? ["actiuni"] : [])],
          primaryAction: central ? { id: "aut-new", label: "Adaugă autoritate" } : null,
          toolbarLabel: "Filtrare autorități",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: S.data && central ? D().authorities.map(rowOfAuthority) : []
    };
  }
  const authorityMenu = (row) => {
    const a = row.a;
    const items = [];
    if (isRssp(a)) {
      items.push({ label: "Sincronizează din RSSP", icon: "rotate-arrow", attrs: syncBusy() ? `aria-disabled="true" data-tooltip-reason="${esc(SYNC_BUSY)}"` : `data-aut-sync-one="${esc(a.id)}"` });
      /* US-89 AC-22 / US-92 AC-03: an RSSP authority changes Activ only through the sync */
      items.push({ label: a.active ? "Inactivează" : "Activează", icon: a.active ? "pause" : "rotate-arrow", danger: a.active, attrs: 'aria-disabled="true" data-tooltip-reason="Autoritatea este sincronizată din RSSP: starea se modifică doar prin sincronizare."' });
    } else {
      items.push(a.active
        ? { label: "Inactivează", icon: "pause", danger: true, attrs: `data-aut-deactivate="${esc(a.id)}"` }
        : { label: "Activează", icon: "rotate-arrow", attrs: `data-aut-activate="${esc(a.id)}"` });
    }
    const html = U().renderRowActions?.({ menu: items, label: a.nameRo }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  };
  /* a multi-value cell (aut-more-v1): first value + library Badge solid-neutral „+N” (= Users › Roluri) */
  const multiValue = (values, label) => {
    const list = (values || []).filter(Boolean);
    if (!list.length) return "";
    const all = list.join(", ");
    return `<span class="e-permits-workplace__user-roles"><span data-cell-tooltip="${esc(list[0])}">${esc(list[0])}</span>${list.length > 1 ? `<span class="badge badge--solid-neutral badge--lg" data-tag-more tabindex="0" data-cell-tooltip="${esc(all)}" data-cell-tooltip-always aria-label="${esc(`${label}: ${all}`)}">+${list.length - 1}</span>` : ""}</span>`;
  };
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND_A] = {
    build: authoritiesDb,
    get facets() {
      return [
        { key: "tip", label: "Tipul autorității", get: (row) => row.tip || "—" },
        { key: "activ", label: "Activ", get: (row) => row.activ },
        { key: "sursa", label: "Sursa datelor", get: (row) => row.sursa }
      ];
    },
    /* US-89 AC-08: IDNO, Denumire, Cod, Tip, Adresă, Activ */
    searchText: (row) => [row.idno, row.denumire, row.cod, row.tip, row.adresa, row.activ === "Da" ? "activ" : "inactiv"].join(" "),
    sortValue: (row, key) => String(row[key] ?? ""),
    renderCell: (row, key) => {
      switch (key) {
        /* same two-line cell as the dosar number (renderNrDosar): copy code + `__source` line */
        case "idno": return `
          <div class="e-permits-workplace__case-cell">
            ${row.idno ? (A().renderListCode?.(row.idno, { label: `Copiază IDNO ${row.idno}` }) || esc(row.idno)) : `<span>${dash}</span>`}
            <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(row.sursa)}">${esc(isRssp(row.a) ? "RSSP" : "Creată manual")}</span></span>
          </div>`;
        case "denumire": return `
          <div class="e-permits-workplace__case-cell">
            <span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>
            <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(row.cod)}">${esc(row.cod)}</span></span>
          </div>`;
        /* AC-06: empty optional cells stay empty */
        case "website": return row.website ? `<span data-cell-tooltip="${esc(row.website)}">${esc(row.website.replace(/^https?:\/\//, ""))}</span>` : "";
        /* more than one number: the first + the canonical „+N” of the Users roles column (tooltip lists them all) */
        case "telefon": return row.telefon ? multiValue(row.telefoane, "Telefon") : "";
        case "tip": return row.tip ? `<span data-cell-tooltip="${esc(row.tip)}">${esc(row.tip)}</span>` : dash;
        case "adresa": return `<span data-cell-tooltip="${esc(row.adresa)}">${esc(row.adresa)}</span>`;
        case "activ": return yesNo(row.activ === "Da");
        case "actiuni": return authorityMenu(row);
        default: return esc(row[key] ?? "");
      }
    },
    openRow: (id) => openAuthority(id),
    rowLabel: (row) => `${row.denumire} — deschide profilul autorității`,
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!S.data) return E?.render({ title: "Se încarcă autoritățile…", loading: true, bare: true });
      if (!who().central) return E?.render({ title: "Acces interzis", text: DENIED, icon: "lock", bare: true });
      /* US-89 AC-09 */
      if (query || filtered) return E?.noResults?.("Nu s-au găsit rezultate pentru criteriile introduse", { text: "Caută după IDNO, denumire, cod, tip sau adresă ori schimbă filtrele.", bare: true, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      /* AC-07 */
      return E?.render({ title: "Nu există autorități înregistrate", text: "Autoritățile se creează la sincronizarea serviciilor din RSSP sau manual.", icon: "admin-authority", bare: true, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="aut-new">' + icon("plus-large", 20, "icon small") + "<span>Adaugă autoritate</span></button>" });
    },
    exportRows: (rows) => exportCsv(rows, "autoritati.csv", ["IDNO", "Denumire", "Cod", "Website", "Tip", "Telefon", "Adresă", "Activ"], (r) => [r.idno, r.denumire, r.cod, r.website, r.tip, r.telefoane.join(" "), r.adresa, r.activ], "autorități"),
    exportState: () => (who().central && S.data && D().authorities.length ? {} : { hidden: true })
  };

  /* ================================================================ LIST — Subdiviziuni (US-95) */
  const rowOfSub = (s) => ({
    id: s.id, denumire: s.name, afisata: displayName(s.name, s.authorityId), autoritate: authOf(s.authorityId)?.nameRo || "",
    raion: s.raion || "", localitate: s.localitate || "", adresa: addressOf(s), strada: ["strada", "casa", "bloc", "etaj", "oficiu", "postal"].map((k) => String(s[k] || "").trim()).filter(Boolean).join(", "), telefon: s.phone || "", email: s.email || "",
    aprobat: s.approvedBy || "", activ: s.active ? "Da" : "Nu", s
  });
  function subdivisionsDb() {
    if (!S.data) load().then(() => refreshIfOpen(KIND_S, NAV_S));
    const w = who();
    return {
      kind: KIND_S,
      fixedWidths: true,
      fieldCount: 8,
      defaultSort: "denumire",
      defaultSortDirection: "asc",
      columns: {
        denumire: { label: "Denumire", width: 200, sortable: true },
        raion: { label: "Raionul", width: 160, sortable: true },
        localitate: { label: "Localitate", width: 116, sortable: true },
        adresa: { label: "Adresa", width: 220, fill: true },
        telefon: { label: "Telefonul", width: 132 },
        email: { label: "Adresa de e-mail", width: 180, fill: true },
        aprobat: { label: "Aprobat de", width: 124, sortable: true },
        activ: { label: "Activ", width: 96, sortable: true },
        actiuni: { label: "", width: 56, pin: "end" }
      },
      views: {
        [KIND_S]: {
          title: "Subdiviziuni",
          selectable: false,
          /* AC-02: the authority's name heads its group */
          groupBy: "autoritate",
          groupIcon: "admin-authority", /* the authority glyph = the sidebar „Autorități” icon, not the document one */
          searchPlaceholder: "Caută după denumirea afișată",
          columns: ["denumire", "raion", "localitate", "adresa", "telefon", "email", "aprobat", "activ", "actiuni"],
          primaryAction: w.admin ? { id: "sub-new", label: "Adaugă subdiviziune" } : null,
          toolbarLabel: "Filtrare subdiviziuni",
          exportLabel: "Exportă CSV"
        }
      },
      /* AC-01a: Administrator local = only the subdivisions of his authority */
      runtimeRows: S.data && w.admin ? D().subdivisions.filter(canSeeSub).map(rowOfSub) : []
    };
  }
  const subActions = (s, { from = "list", menuOnly = false } = {}) => {
    const edit = { label: "Editează", attrs: `data-sub-edit="${esc(s.id)}" data-sub-from="${from}"` };
    const menu = [...(menuOnly ? [edit] : []), s.active
      ? { label: "Inactivează", icon: "pause", danger: true, attrs: `data-sub-deactivate="${esc(s.id)}"` }
      : { label: "Activează", icon: "rotate-arrow", attrs: `data-sub-activate="${esc(s.id)}"` }];
    return U().renderRowActions?.({ primary: menuOnly ? null : edit, menu, label: displayName(s.name, s.authorityId) }) || "";
  };
  window.GEAPShellRegistries[KIND_S] = {
    build: subdivisionsDb,
    get facets() {
      return [
        /* AC-05: partial text on the authority (the facet's own search) */
        { key: "autoritate", label: "Autoritatea", search: true, get: (row) => row.autoritate },
        { key: "raion", label: "Raionul", search: true, get: (row) => row.raion || "—" },
        { key: "localitate", label: "Localitatea", search: true, get: (row) => row.localitate || "—" },
        { key: "activ", label: "Activ", get: (row) => row.activ }
      ];
    },
    /* AC-06: „Denumirea afișată” (subdivision – authority) */
    searchText: (row) => row.afisata,
    sortValue: (row, key) => String(row[key] ?? ""),
    renderCell: (row, key) => {
      switch (key) {
        case "denumire": return `<span data-cell-tooltip="${esc(row.afisata)}">${esc(row.denumire)}</span>`;
        /* the street part in the cell (Raionul / Localitate have their own columns); the full address in the tooltip */
        case "adresa": return row.adresa ? `<span data-cell-tooltip="${esc(row.adresa)}" data-cell-tooltip-always>${esc(row.strada || row.adresa)}</span>` : "";
        case "email": return row.email ? `<span data-cell-tooltip="${esc(row.email)}">${esc(row.email)}</span>` : "";
        case "activ": return yesNo(row.s.active);
        case "actiuni": return `<span class="e-permits-workplace__row-actions">${subActions(row.s, { menuOnly: true }).replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        default: return esc(row[key] ?? "");
      }
    },
    openRow: (id) => openSub(id, "general", { from: "list" }),
    rowLabel: (row) => `${row.afisata} — deschide profilul subdiviziunii`,
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!S.data) return E?.render({ title: "Se încarcă subdiviziunile…", loading: true, bare: true });
      if (!who().admin) return E?.render({ title: "Acces interzis", text: DENIED, icon: "lock", bare: true });
      /* US-95 AC-11 */
      if (query || filtered) return E?.noResults?.("Nu au fost găsite rezultate pentru criteriile selectate", { text: "Caută după denumirea afișată ori schimbă filtrele.", bare: true, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E?.render({ title: "Nu există subdiviziuni", text: "Subdiviziunile se creează manual, pentru o autoritate activă.", icon: "admin-subdivision", bare: true, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="sub-new">' + icon("plus-large", 20, "icon small") + "<span>Adaugă subdiviziune</span></button>" });
    },
    exportRows: (rows) => exportCsv(rows, "subdiviziuni.csv", ["Autoritatea", "Denumire", "Denumirea afișată", "Raionul", "Localitate", "Adresa", "Telefonul", "Adresa de e-mail", "Aprobat de", "Activ"], (r) => [r.autoritate, r.denumire, r.afisata, r.raion, r.localitate, r.adresa, r.telefon, r.email, r.aprobat, r.activ], "subdiviziuni"),
    exportState: () => (who().admin && S.data && D().subdivisions.some(canSeeSub) ? {} : { hidden: true })
  };

  function exportCsv(rows, name, head, line, what) {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const text = `﻿${[head, ...rows.map(line)].map((l) => l.map(cell).join(";")).join("\r\n")}`;
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    audit(null, `Export listă ${what}`, `${rows.length} înregistrări · căutarea și filtrele aplicate`);
    toast(`Am exportat ${rows.length} ${what} în ${name}.`);
  }
  function refreshIfOpen(kind, nav) {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${kind}"]`);
    if (!reg || reg.closest("[hidden]")) return;
    const st = A().workplaceState;
    if (st) { st.rows = (kind === KIND_A ? authoritiesDb() : subdivisionsDb()).runtimeRows; A().renderWorkplace?.(); }
    syncChrome();
    if (!st) document.querySelector(`[data-nav-item][data-nav-id="${nav}"]`)?.click();
  }
  const refreshLists = () => { refreshIfOpen(KIND_A, NAV_A); refreshIfOpen(KIND_S, NAV_S); };

  /* ---------------------------------------------------------------- list chrome: sync meta + „Sincronizează din RSSP”
     sync-meta-v1 (2026-11-02, user: not a line above the toolbar — small, next to the button): the last successful sync
     as the „Salvat …” status meta (`.e-permits-fo-draft-status` 12/16 secondary + 16 icon), immediately left of the sync
     button; the full sentence in the plain tooltip + for screen readers. US-89 AC-11/12/13, US-112 AC-06/07. */
  const MON = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
  const shortStamp = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return `${d} ${MON[m - 1]}${y === new Date().getFullYear() ? "" : ` ${y}`}, ${String(iso).slice(11, 16)}`; };
  const MODE_SHORT = { "automată": "automat", "manuală": "manual", "individuală": "individual" };
  function syncMetaHtml() {
    const last = S.lastSync;
    const lastLong = last ? `Ultima sincronizare reușită din RSSP: ${stamp(last.at)} (${last.mode}).` : "Autoritățile nu au fost sincronizate niciodată din RSSP.";
    let tone = "ok", iconName = "time", short = last ? `Sincronizat ${shortStamp(last.at)} · ${MODE_SHORT[last.mode] || last.mode}` : "Niciodată sincronizat", long = lastLong;
    if (!last) { tone = "none"; iconName = "time"; }
    /* US-112 AC-07: the failed automatic run (the central admins are also notified, header bell) */
    if (RSSP_MODE === "auto-esuat") {
      tone = "warning"; iconName = "circle-error";
      short = "Sincronizare automată eșuată · 03:00";
      long = `Sincronizarea automată din 2 noiembrie 2026, 03:00 nu a pornit: RSSP indisponibil. Se reia la următorul ciclu programat. ${lastLong}`;
    }
    /* sync-meta-v2 (user): no tooltip repeating the line — the full sentence only for screen readers */
    return `<p class="e-permits-fo-draft-status e-permits-aut-sync-meta e-permits-aut-sync-meta--${tone}" data-aut-sync-meta>
      <span class="e-permits-fo-draft-status__saved" aria-hidden="true">${icon(iconName, 16)}<span>${esc(short)}</span></span>
      <span class="u-visually-hidden">${esc(long)}</span>
    </p>`;
  }
  function syncButtonHtml() {
    const busy = syncBusy();
    const reason = busy ? `${SYNC_BUSY}${S.syncing.mode === "automată" ? " (sincronizare automată, pornită de SIA GEAP)" : ""}` : "";
    return `<button class="btn btn-neutral btn-sm e-permits-workplace__primary-action e-permits-aut-tool" type="button" data-aut-sync-all${busy ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""}>${busy ? '<span class="spinner spinner--extra-small spinner--neutral" aria-hidden="true"></span>' : icon("rotate-arrow", 20, "icon small")}<span>${busy ? "Sincronizare în curs…" : "Sincronizează din RSSP"}</span></button>`;
  }
  function syncChrome() {
    const reg = document.querySelector("[data-workplace]");
    if (!reg) return;
    const on = reg.dataset.registryKind === KIND_A && who().central && Boolean(S.data);
    reg.querySelectorAll("[data-aut-sync]").forEach((b) => b.remove());
    /* sync-meta-v2: the meta line directly UNDER the button, right-aligned to it */
    if (on) reg.querySelector("[data-workplace-add-product]")?.insertAdjacentHTML("beforebegin", `<div class="e-permits-aut-sync" data-aut-sync>${syncButtonHtml()}${syncMetaHtml()}</div>`);
  }
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.autObserved) return;
    reg.dataset.autObserved = "1";
    new MutationObserver(() => syncChrome()).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind"] });
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => { if (reg.dataset.registryKind === KIND_A && !reg.querySelector("[data-aut-sync]")) syncChrome(); }).observe(tbody, { childList: true });
  };

  /* „Acces interzis” (US-89 AC-01, US-90 AC-01, US-95 AC-01, US-94 AC-01a, US-96 AC-01a) */
  function showDenied(title) {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(title, window.GEAPEmptyState?.render({ title: "Acces interzis", text: DENIED, icon: "lock" }) || DENIED);
  }

  /* ================================================================ PROFILE — autoritate (US-90 / US-91 / US-92 / US-87 AC-14) */
  const P = { kind: null, id: null, tab: "general", from: "list" };
  const A_TABS = [["general", "Date generale", "page-text"], ["subdiviziuni", "Subdiviziuni", ""], ["jurnal", "Jurnal", ""]];
  const S_TABS = [["general", "Date generale", "page-text"], ["jurnal", "Jurnal", ""]];
  async function openAuthority(id, tab = "general", { push = true } = {}) {
    await load();
    const a = authOf(id);
    if (!who().central || !a) { showDenied(a ? a.nameRo : "Autorități"); return; }
    Object.assign(P, { kind: "a", id, tab: A_TABS.some(([t]) => t === tab) ? tab : "general", from: "list" });
    A().setActiveNav?.(NAV_A);
    A().openProfilePanel?.();
    renderProfile();
    A().writeHash?.(`#autoritate/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  async function openSub(id, tab = "general", { push = true, from = "list" } = {}) {
    await load();
    const s = subOf(id);
    if (!s || !who().admin || !canSeeSub(s)) { showDenied(s ? s.name : "Subdiviziuni"); return; }
    Object.assign(P, { kind: "s", id, tab: S_TABS.some(([t]) => t === tab) ? tab : "general", from: from === "authority" && who().central ? "authority" : "list" });
    A().setActiveNav?.(P.from === "authority" ? NAV_A : NAV_S);
    A().openProfilePanel?.();
    renderProfile();
    A().writeHash?.(`#subdiviziune/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  const profileOpen = () => Boolean(P.id) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "aut-panel";
  const btn = (label, attrs, { tone = "neutral", iconName = "", reason = "" } = {}) =>
    `<button class="btn btn-${tone} btn-sm" type="button" ${attrs}${reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""}>${iconName ? icon(iconName, 20, "icon small") : ""}<span>${esc(label)}</span></button>`;
  const fixedMenu = (items, label) => (U().renderStackMenu?.(items, label) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>");
  function authorityActions(a) {
    const busy = syncBusy() ? SYNC_BUSY : "";
    const off = busy ? `aria-disabled="true" data-tooltip-reason="${esc(busy)}"` : "";
    /* one primary + ⋮ (fits a phone header): US-87 AC-14 sync / US-90 AC-09 MConnect live in the ⋮ */
    if (isRssp(a)) {
      /* US-90 AC-25: Tip is the only editable field of an RSSP authority */
      return `${btn("Editează tipul", `data-aut-edit="${esc(a.id)}"`, { tone: "primary", iconName: "edit", reason: busy })}
        ${fixedMenu([{ label: "Sincronizează din RSSP", icon: "rotate-arrow", attrs: off || `data-aut-sync-one="${esc(a.id)}"` }], a.nameRo)}`;
    }
    const menu = [
      { label: "Sincronizare MConnect", icon: "rotate-arrow", attrs: off || `data-aut-mconnect="${esc(a.id)}"` },
      a.active
        ? { label: "Inactivează", icon: "pause", danger: true, attrs: `data-aut-deactivate="${esc(a.id)}"` }
        : { label: "Activează", icon: "rotate-arrow", attrs: `data-aut-activate="${esc(a.id)}"` }
    ];
    return `${btn("Editează", `data-aut-edit="${esc(a.id)}"`, { tone: "primary", iconName: "edit", reason: busy })}
      ${fixedMenu(menu, a.nameRo)}`;
  }
  function renderProfile({ keepFocus = "" } = {}) {
    const els = A().els || {};
    if (!els.dosarProfilTitleRow) return;
    if (P.kind === "a") renderAuthorityProfile(els); else renderSubProfile(els);
    if (keepFocus) document.querySelector(keepFocus)?.focus();
  }
  function tabsHtml(list, counts) {
    return list.map(([id, label, ic]) => {
      const active = id === P.tab;
      return `<button class="tab-button${active ? " active" : ""}" id="aut-tab-${id}" type="button" role="tab" aria-controls="aut-panel" aria-selected="${active}" tabindex="${active ? 0 : -1}" data-aut-tab="${id}">
        ${ic ? icon(ic) : ""}<span>${label}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}
      </button>`;
    }).join("");
  }
  function panelBody(els, html) {
    const body = els.dosarProfilPanelBody;
    body.id = "aut-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `aut-tab-${P.tab}`);
    body.innerHTML = html;
    A().syncStackMetaRows?.(body);
  }
  function renderAuthorityProfile(els) {
    const a = authOf(P.id);
    if (!a) return;
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      back: { label: "Autorități", attr: "data-aut-back-list" },
      title: a.nameRo,
      actions: authorityActions(a)
    });
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["IDNO", A().renderProfileCopyCode?.(a.idno, `Copiază IDNO ${a.idno}`) || esc(a.idno)],
      ["Activ", yesNo(a.active)],
      ["Sursa datelor", esc(isRssp(a) ? "Sincronizată din RSSP" : "Creată manual")],
      ["Ultima sincronizare", a.lastSync ? esc(stamp(a.lastSync)) : "Niciodată sincronizată"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabsHtml(A_TABS, { subdiviziuni: subsOf(a.id).length });
    panelBody(els, P.tab === "subdiviziuni" ? authoritySubsTab(a) : P.tab === "jurnal" ? journalTab(a) : authorityInfoTab(a));
  }
  const card = (title, rows) => A().renderInfoCard?.(title, rows.filter(Boolean), { sticky: true }) || ""; /* phones: sticky section headers */
  const val = (v) => (v === null || v === undefined || v === "" ? dash : esc(v));
  function authorityNotices(a) {
    return [
      syncBusy() && U().renderNotice?.("info", "<strong>Sincronizare din RSSP în curs.</strong> Datele autorității nu pot fi modificate până la finalizarea ei.", { icon: "time" }),
      /* US-91 AC-11: the conversion indicator */
      a.convertedAt && U().renderNotice?.("info", `<strong>Convertită în autoritate sincronizată din RSSP</strong> la ${esc(stamp(a.convertedAt))} (SIA GEAP): IDNO-ul a fost găsit în RSSP. Câmpurile sincronizate sunt acum read-only; Tipul autorității și subdiviziunile rămân editabile. Starea anterioară este în Jurnal.`),
      isRssp(a) && !a.convertedAt && U().renderInfoNote?.("Datele vin din RSSP și se actualizează doar prin sincronizare. Se editează aici Tipul autorității și subdiviziunile."),
      !a.active && U().renderNotice?.("warning", `<strong>Autoritate inactivă.</strong> Nu poate fi aleasă pentru atribuiri noi sau dosare noi; dosarele existente continuă.${isRssp(a) ? " Starea se modifică doar prin sincronizare cu RSSP." : ""}`),
      !isRssp(a) && a.mconnectMissing?.length && U().renderNotice?.("warning", `<strong>MConnect nu a returnat ${esc(a.mconnectMissing.map(fieldName).join(", "))}.</strong> Câmpurile rămân editabile și obligatorii până la o sincronizare MConnect care le returnează.`)
    ].filter(Boolean).join("");
  }
  const FIELD_NAMES = { nameRo: "Denumirea (RO)", code: "Codul autorității", address: "Adresa", nameRu: "Denumirea (RU)", nameEn: "Denumirea (EN)", descRo: "Descrierea (RO)", descRu: "Descrierea (RU)", descEn: "Descrierea (EN)", email: "Email", website: "Website", lat: "Latitudine", lng: "Longitudine", postal: "Index poștal", phones: "Telefon", logo: "Logo", accounts: "Conturi bancare", type: "Tipul autorității", active: "Activ", published: "Publicat" };
  const fieldName = (k) => FIELD_NAMES[k] || k;
  const fmtValue = (k, v) => (k === "phones" ? (v || []).join(", ") : k === "accounts" ? (v || []).map((x) => `${x.iban} · ${x.bic}`).join("; ") : k === "logo" ? v?.name || "" : typeof v === "boolean" ? (v ? "Da" : "Nu") : String(v ?? ""));
  function authorityInfoTab(a) {
    const notices = authorityNotices(a);
    const link = (url) => (url ? `<a class="link link-primary link-sm" href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ""))}</a>` : dash);
    return `${notices ? `<div class="e-permits-aut__notices">${notices}</div>` : ""}
      ${card("Date de identificare", [
        ["IDNO", A().renderProfileCopyCode?.(a.idno, `Copiază IDNO ${a.idno}`) || esc(a.idno)],
        ["Denumirea (RO)", val(a.nameRo)],
        ["Codul autorității", val(a.code)],
        ["Tipul autorității", val(a.type)],
        ["Adresa", val(a.address)]
      ])}
      ${card("Denumiri și descriere", [
        ["Denumirea (RU)", val(a.nameRu)],
        ["Denumirea (EN)", val(a.nameEn)],
        ["Descrierea (RO)", val(a.descRo)],
        ["Descrierea (RU)", val(a.descRu)],
        ["Descrierea (EN)", val(a.descEn)]
      ])}
      ${card("Contacte și localizare", [
        ["Email", val(a.email)],
        ["Telefon", (a.phones || []).length ? esc(a.phones.join(", ")) : dash],
        ["Website", link(a.website)],
        ["Latitudine", val(a.lat)],
        ["Longitudine", val(a.lng)],
        ["Index poștal", val(a.postal)]
      ])}
      ${card("Conturi bancare și logo", [
        ...((a.accounts || []).length ? a.accounts.map((x, i) => [`Cont ${i + 1}`, `${esc(x.iban)} · ${esc(x.bic)}`]) : [["Conturi bancare", dash]]),
        ["Logo", a.logo ? `${esc(a.logo.name)} · ${esc(a.logo.size)}` : dash]
      ])}
      ${card("Stare", [
        ["Activ", yesNo(a.active)],
        ["Publicat", yesNo(a.published)],
        ["Sursa datelor", esc(isRssp(a) ? "Sincronizată din RSSP" : "Creată manual în GEAP")],
        ["Ultima sincronizare", a.lastSync ? esc(stamp(a.lastSync)) : "Niciodată sincronizată"],
        ["Creată", esc(`${stamp(a.createdAt)} · ${a.createdBy}`)]
      ])}`;
  }
  function authoritySubsTab(a) {
    const subs = subsOf(a.id);
    const add = a.active
      ? btn("Adaugă subdiviziune", `data-sub-new-for="${esc(a.id)}"`, { tone: "secondary", iconName: "plus-large" })
      : btn("Adaugă subdiviziune", "", { tone: "secondary", iconName: "plus-large", reason: "Subdiviziuni noi se creează doar pentru autoritățile active." });
    const items = subs.map((s) => ({
      plainTitle: s.name,
      title: esc(s.name),
      rowAttrs: `data-sub-open="${esc(s.id)}"`,
      badges: [s.active ? tag("Activ", "success") : tag("Inactiv", "neutral")],
      meta: [esc(s.type.replace("Subdiviziune de ", "")), esc([s.localitate, s.raion].filter(Boolean).join(", ") || "Fără adresă"), esc(s.approvedBy)],
      actionsHtml: subActions(s, { from: "authority" })
    }));
    const activeN = subs.filter((s) => s.active).length;
    return A().renderStackedList?.("Subdiviziuni", [{ label: "", items }], {
      meta: subs.length ? `${plural(subs.length, "subdiviziune", "subdiviziuni")} · ${activeN} active` : "",
      actionHtml: add,
      empty: a.active ? "Autoritatea nu are încă subdiviziuni. Adaugă prima subdiviziune." : "Autoritatea nu are subdiviziuni.",
      icon: "building"
    }) || "";
  }
  const journalTab = (x) => A().renderEventTimeline?.("Jurnalul evenimentelor", x.events || [], { meta: "Jurnalizat prin MLog", empty: "Nu există evenimente." }) || "";

  /* ---------------------------------------------------------------- PROFILE — subdiviziune (US-94 / US-96) */
  function renderSubProfile(els) {
    const s = subOf(P.id);
    if (!s) return;
    const a = authOf(s.authorityId);
    const backToAuth = P.from === "authority";
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      back: backToAuth ? { label: a?.code || "Autoritate", attr: "data-sub-back-auth" } : { label: "Subdiviziuni", attr: "data-sub-back-list" },
      title: displayName(s.name, s.authorityId),
      actions: `${btn("Editează", `data-sub-edit="${esc(s.id)}" data-sub-from="profile"`, { tone: "primary", iconName: "edit" })}
        ${fixedMenu([s.active
          ? { label: "Inactivează", icon: "pause", danger: true, attrs: `data-sub-deactivate="${esc(s.id)}"` }
          : { label: "Activează", icon: "rotate-arrow", attrs: `data-sub-activate="${esc(s.id)}"` }], s.name)}`
    });
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["Autoritatea", esc(a?.nameRo || "")],
      ["Activ", yesNo(s.active)],
      ["Tipul", esc(s.type)],
      ["Aprobat de", esc(s.approvedBy)]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabsHtml(S_TABS, {});
    panelBody(els, P.tab === "jurnal" ? journalTab(s) : subInfoTab(s, a));
  }
  function subInfoTab(s, a) {
    const notice = !s.active ? U().renderNotice?.("warning", `<strong>Subdiviziune inactivă${s.inactiveCause === "authority" ? " (prin inactivarea autorității)" : ""}.</strong> Nu poate fi aleasă la gestionarea utilizatorilor sau în configurarea serviciilor; lucrul pe dosarele existente continuă.`) || "" : "";
    return `${notice ? `<div class="e-permits-aut__notices">${notice}</div>` : ""}
      ${card("Date generale", [
        ["Denumirea subdiviziunii", val(s.name)],
        ["Denumirea (EN)", val(s.nameEn)],
        ["Denumirea (RU)", val(s.nameRu)],
        ["Autoritatea", esc(a?.nameRo || "")],
        ["Denumirea afișată", esc(displayName(s.name, s.authorityId))],
        ["Tipul subdiviziunii", val(s.type)],
        ["Codul prefixului pentru număr act permisiv", val(s.prefix)],
        ["Activ", yesNo(s.active)]
      ])}
      ${card("Adresă", [
        ["Țara", "Republica Moldova"],
        ["Raionul", val(s.raion)],
        ["Localitatea", val(s.localitate)],
        ["Strada", val(s.strada)],
        ["Casa", val(s.casa)],
        ["Blocul", val(s.bloc)],
        ["Etajul", val(s.etaj)],
        ["Oficiul", val(s.oficiu)],
        ["Codul poștal", val(s.postal)],
        ["Adresa subdiviziunii", val(addressOf(s))]
      ])}
      ${card("Aprobare și contacte", [
        ["Aprobat de", val(s.approvedBy)],
        ["Telefonul", val(s.phone)],
        ["Adresa de e-mail", val(s.email)]
      ])}
      ${card("Localități subordonate", (s.raioane || []).length ? s.raioane.map((r, i) => [`Raion ${i + 1}`, esc(r)]) : [["Raioane", "Niciun raion: subdiviziunea nu participă la atribuirea automată după localitate."]])}`;
  }

  /* ================================================================ the ONE drawer */
  let drawer = null;
  let F = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-aut-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" tabindex="-1" data-aut-drawer-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="aut-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="aut-drawer-title" data-aut-drawer-title></h2>
              <p class="drawer__subtitle" data-aut-drawer-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-aut-drawer-close>${icon("cross-large", 16, "icon small")}</button>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-aut-steps hidden></nav>
          <div class="drawer__body" data-aut-drawer-body></div>
          <footer class="drawer__footer" data-aut-drawer-footer></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onDrawerClick);
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    /* Localități subordonate: the shared FO multi-select reports its picks (no re-render: the menu stays open) */
    drawer.addEventListener("fo-multiselect-change", (event) => { if (F && F.mode === "sub") { F.v.raioane = event.detail.values; F.dirty = true; } });
    return drawer;
  }
  function openDrawer(state) {
    F = { back: document.activeElement, errors: {}, dirty: false, ...state };
    const d = ensureDrawer();
    renderDrawer();
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus: () => d.querySelector("[data-aut-autofocus]") || d.querySelector(".drawer") });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); }
    requestAnimationFrame(() => (d.querySelector("[data-aut-autofocus]") || d.querySelector(".drawer"))?.focus());
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    const back = F?.back;
    F = null;
    if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer);
    else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); }
    if (back?.isConnected) back.focus();
  }
  /* AC-16 (US-88) / AC-28 (US-90) / AC-21-22 (US-94): closing a changed form asks first */
  function requestClose() {
    if (!F) return;
    if (!F.dirty || F.locked) { closeDrawer(); return; }
    U().askConfirm?.({ title: "Închizi fără salvare?", text: "Modificările nesalvate vor fi pierdute. Continui?", confirmLabel: "Da", cancelLabel: "Nu", destructive: true }, closeDrawer);
  }
  function renderDrawer(focusSel = "") {
    if (!F) return;
    const d = ensureDrawer();
    const active = document.activeElement;
    const keep = focusSel || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const top = d.querySelector(".drawer__body")?.scrollTop || 0;
    const view = DRAWERS[F.mode];
    d.querySelector(".drawer").classList.toggle("drawer--lg", Boolean(view.lg?.()));
    d.querySelector("[data-aut-drawer-title]").textContent = view.title();
    const sub = d.querySelector("[data-aut-drawer-subtitle]");
    sub.textContent = view.subtitle?.() || ""; sub.hidden = !sub.textContent;
    const steps = d.querySelector("[data-aut-steps]");
    const strip = view.steps?.();
    steps.hidden = !strip; steps.innerHTML = strip || "";
    d.querySelector("[data-aut-drawer-body]").innerHTML = view.body();
    d.querySelector("[data-aut-drawer-footer]").innerHTML = view.footer();
    window.GEAPFormRender?.bind?.(d.querySelector("[data-aut-drawer-body]"));
    d.querySelector(".drawer__body").scrollTop = focusSel === "top" ? 0 : top;
    if (keep && keep !== "top") {
      const el = d.querySelector(keep);
      el?.focus?.();
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
    }
  }

  /* ---- form vocabulary (the BO drawer: .e-permits-fo-field in .e-permits-user-create__grid) */
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const req = () => U().requiredMark?.() || "";
  function textField(key, label, value, { required = false, max = 0, hint = "", span = 12, error = "", inputmode = "", placeholder = "", attr = "data-aut-field", id = `aut-${key}`, type = "text", autofocus = false } = {}) {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field${span ? ` e-permits-user-create__field e-permits-user-create__field--${span}` : ""}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="${type}" value="${esc(value)}" autocomplete="off"${max ? ` maxlength="${max}"` : ""}${inputmode ? ` inputmode="${inputmode}"` : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${describedBy ? ` aria-describedby="${describedBy}"` : ""}${autofocus ? " data-aut-autofocus" : ""} ${attr}="${key}">
        </div>
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(key, label, value, { max = 500, error = "" } = {}) {
    const id = `aut-${key}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <div class="e-permits-fo-field__label-counter"><label for="${id}">${esc(label)}</label><span class="e-permits-fo-field__counter" data-aut-counter="${id}">${String(value || "").length} / ${max}</span></div>
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="2" maxlength="${max}"${error ? ` aria-invalid="true" aria-describedby="${id}-error"` : ""} data-aut-field="${key}">${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : ""}
      </div>`;
  }
  function selectField(key, label, options, value, { required = false, placeholder = "", hint = "", error = "", span = 12, disabled = false } = {}) {
    const id = `aut-${key}`;
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`; }).join("")}`;
    return `
      <div class="e-permits-fo-field${span ? ` e-permits-user-create__field e-permits-user-create__field--${span}` : ""}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-aut-field="${key}"`, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const roField = (label, html, span = 12, { required = false } = {}) => `
    <div class="e-permits-fo-field${span ? ` e-permits-user-create__field e-permits-user-create__field--${span}` : ""}">
      <span class="e-permits-cfg-ro__label">${esc(label)}${required ? req() : ""}</span>
      <div class="e-permits-cfg-ro">${html || dash}</div>
    </div>`;
  const toggleField = (key, label, checked, description = "") => `
    <div class="e-permits-user-create__field e-permits-user-create__field--6">${U().renderToggle?.({ label, description, checked, attrs: `data-aut-field="${key}"` }) || ""}</div>`;
  const section = (title, content, note = "") => `
    <section class="e-permits-user-create__section">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${note}${content}</div>
    </section>`;
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const footer = (label, attrs, { reason = "", cancel = "Anulează" } = {}) => `
    <div class="modal-buttons">
      <button class="btn btn-neutral btn-rounded" type="button" data-aut-drawer-close>${esc(cancel)}</button>
      <button class="btn btn-primary btn-rounded" type="button" ${attrs}${reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""}>${esc(label)}</button>
    </div>`;

  /* ---- validation (US-88 AC-18…23, US-90 AC-15…22, US-93 AC-13/14, US-94 AC-14/16/17) */
  const RX = {
    idno: /^\d{13}$/,
    e164: /^\+\d{7,15}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    url: /^https?:\/\/[^\s/?#]+\.[^\s/?#]+[^\s]*$/i,
    iban: /^MD[0-9A-Z]{22}$/,
    bic: /^[0-9A-Z]{8,11}$/,
    phoneMd: /^(\+373\d{8}|0\d{8})$/,
    decimal: /^-?\d{1,3}(\.\d{1,7})?$/
  };
  const missing = (label) => `Câmpul ${label} este obligatoriu.`;

  /* ---------------------------------------------------------------- „Adaugă autoritate” (US-88) — step 1 IDNO, step 2 the form */
  const emptyAuthority = () => ({ idno: "", nameRo: "", code: "", address: "", nameRu: "", nameEn: "", descRo: "", descRu: "", descEn: "", email: "", website: "", lat: "", lng: "", postal: "", phones: [""], logo: null, accounts: [], type: "", active: true, published: true });
  const AUTH_STEPS = ["IDNO", "Datele autorității"];
  function idnoProblem(v) {
    if (!v) return "";
    if (!/^\d*$/.test(v)) return "IDNO conține doar cifre.";
    if (v.length !== 13) return `IDNO are exact 13 cifre (acum ${v.length}).`;
    return "";
  }
  function authorityForm(v, { create = false, rssp = false, locked = false, missingKeys = [] } = {}) {
    const e = F.errors;
    const ro = locked || rssp;
    const mc = F.fromMconnect || {};
    /* US-88 AC-09/10, US-90 AC-07/13: the three MConnect fields are read-only when MConnect returned them */
    const mcField = (key, label, max) => (!ro && (create ? !mc[key] : missingKeys.includes(key))
      ? textField(key, label, v[key], { required: true, max, error: e[key], span: key === "code" ? 6 : 12 })
      : roField(label, esc(v[key]), key === "code" ? 6 : 12, { required: true }));
    const phones = (v.phones || []).map((p, i) => ro ? "" : `
      <div class="e-permits-aut-repeat__row">
        ${textField(`phone-${i}`, i ? `Telefon ${i + 1}` : "Telefon", p, { required: !i, error: e[`phone-${i}`], attr: "data-aut-phone", id: `aut-phone-${i}`, span: 0, inputmode: "tel", placeholder: "+37322123456", max: 16 })}
        ${i ? `<button class="btn btn-neutral btn-md btn-icon-only e-permits-aut-repeat__remove" type="button" aria-label="Elimină telefonul ${i + 1}" data-tooltip-label="Elimină" data-aut-phone-remove="${i}">${icon("delete", 20, "icon small")}</button>` : ""}
      </div>`).join("");
    const accounts = (v.accounts || []).map((x, i) => ro ? "" : `
      <div class="e-permits-aut-repeat__row e-permits-aut-repeat__row--account">
        ${textField(`iban-${i}`, `IBAN ${i + 1}`, x.iban, { error: e[`iban-${i}`], attr: "data-aut-iban", id: `aut-iban-${i}`, span: 0, placeholder: "MD24TRPCCC518430A01427AA", max: 24 })}
        ${textField(`bic-${i}`, "Cod bancă (BIC)", x.bic, { error: e[`bic-${i}`], attr: "data-aut-bic", id: `aut-bic-${i}`, span: 0, placeholder: "TREZMD2X", max: 11 })}
        <button class="btn btn-neutral btn-md btn-icon-only e-permits-aut-repeat__remove" type="button" aria-label="Elimină contul ${i + 1}" data-tooltip-label="Elimină" data-aut-account-remove="${i}">${icon("delete", 20, "icon small")}</button>
      </div>`).join("");
    const typeOnly = rssp && !locked;
    /* US-90 AC-24 / AC-25: an RSSP authority — only Tipul autorității; the rest stays on the profile */
    if (typeOnly) {
      return `
        <div class="e-permits-aut-form-note">${U().renderInfoNote?.("Autoritate sincronizată din RSSP: aici se modifică doar Tipul autorității. Celelalte date se actualizează prin sincronizare; subdiviziunile se gestionează în tabul „Subdiviziuni”.") || ""}</div>
        ${section("Tipul autorității", grid(
          roField("IDNO", esc(v.idno), 6),
          roField("Codul autorității", esc(v.code), 6),
          roField("Denumirea (RO)", esc(v.nameRo)),
          selectField("type", "Tipul autorității", D().types, v.type, { required: true, placeholder: "Alege tipul", error: e.type })
        ))}`;
    }
    return `
      ${section("Date de identificare", grid(
        roField("IDNO", esc(v.idno), 6, { required: true }),
        mcField("code", "Codul autorității (denumirea scurtă)", 250),
        mcField("nameRo", "Denumirea (RO)", 250),
        mcField("address", "Adresa", 250)
      ))}
      ${section("Tip și stare", grid(
        locked ? roField("Tipul autorității", esc(v.type), 12, { required: true }) : selectField("type", "Tipul autorității", D().types, v.type, { required: true, placeholder: "Alege tipul", error: e.type }),
        create ? toggleField("active", "Activ", v.active) : roField("Activ", v.active ? "Da" : "Nu", 6),
        ro ? roField("Publicat", v.published ? "Da" : "Nu", 6) : toggleField("published", "Publicat", v.published)
      ))}
      ${section("Denumiri și descriere", ro ? grid(roField("Denumirea (RU)", esc(v.nameRu)), roField("Denumirea (EN)", esc(v.nameEn)), roField("Descrierea (RO)", esc(v.descRo))) : grid(
        textField("nameRu", "Denumirea (RU)", v.nameRu, { max: 250, span: 6 }),
        textField("nameEn", "Denumirea (EN)", v.nameEn, { max: 250, span: 6 }),
        areaField("descRo", "Descrierea (RO)", v.descRo),
        areaField("descRu", "Descrierea (RU)", v.descRu),
        areaField("descEn", "Descrierea (EN)", v.descEn)
      ))}
      ${section("Contacte", ro ? grid(roField("Email", esc(v.email), 6), roField("Telefon", esc((v.phones || []).join(", ")), 6), roField("Website", esc(v.website))) : `
        ${grid(
          textField("email", "Email", v.email, { required: true, max: 254, span: 6, error: e.email, placeholder: "utilizator@domeniu.md", inputmode: "email" }),
          textField("website", "Website", v.website, { max: 255, span: 6, error: e.website, placeholder: "https://autoritate.gov.md" })
        )}
        <div class="e-permits-aut-repeat" role="group" aria-label="Telefoane">${phones}
          <button class="btn btn-secondary btn-md e-permits-aut-repeat__add" type="button" data-aut-phone-add>${icon("plus-large", 20, "icon small")}<span>Adaugă telefon</span></button>
        </div>`)}
      ${section("Localizare", ro ? grid(roField("Latitudine", esc(v.lat), 4), roField("Longitudine", esc(v.lng), 4), roField("Index poștal", esc(v.postal), 4)) : grid(
        textField("lat", "Latitudine", v.lat, { span: 4, error: e.lat, placeholder: "47.024512", inputmode: "decimal" }),
        textField("lng", "Longitudine", v.lng, { span: 4, error: e.lng, placeholder: "28.832157", inputmode: "decimal" }),
        textField("postal", "Index poștal", v.postal, { span: 4, max: 10, placeholder: "MD-2001" })
      ))}
      ${section("Conturi bancare", ro ? grid(roField("Conturi bancare", esc((v.accounts || []).map((x) => `${x.iban} · ${x.bic}`).join("; ")))) : `
        <div class="e-permits-aut-repeat" role="group" aria-label="Conturi bancare">${accounts}
          <button class="btn btn-secondary btn-md e-permits-aut-repeat__add" type="button" data-aut-account-add>${icon("plus-large", 20, "icon small")}<span>Adaugă cont bancar</span></button>
        </div>`)}
      ${section("Logo", ro ? grid(roField("Logo", v.logo ? esc(`${v.logo.name} · ${v.logo.size}`) : "")) : `
        <div class="e-permits-aut-logo">
          ${v.logo ? `<div class="e-permits-aut-logo__file">${icon("page-text")}<span class="e-permits-aut-logo__name">${esc(v.logo.name)}</span><span class="e-permits-aut-logo__meta">${esc(v.logo.size)}</span><button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Elimină logo-ul" data-tooltip-label="Elimină" data-aut-logo-remove>${icon("delete", 20, "icon small")}</button></div>`
            : `<button class="btn btn-secondary btn-md" type="button" data-aut-logo-pick>${icon("plus-large", 20, "icon small")}<span>Adaugă fișier</span></button>`}
          <input class="u-visually-hidden" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" tabindex="-1" aria-hidden="true" data-aut-logo-input>
          ${e.logo ? errorHtml("aut-logo", e.logo) : '<p class="e-permits-fo-field__hint">PNG, JPG sau SVG, cel mult 2 MB, minimum 100 × 100 px. Fără logo, autoritatea se salvează fără imagine.</p>'}
        </div>`)}`;
  }
  const DRAWERS = {
    create: {
      lg: () => F.step === 2,
      title: () => "Adaugă autoritate",
      subtitle: () => (F.step === 1 ? "Autoritățile specifice GEAP, neacoperite de RSSP. Datele de bază vin din MConnect, după IDNO." : `IDNO ${F.v.idno} · datele preluate din MConnect sunt read-only`),
      steps: () => A().renderStepStrip?.(AUTH_STEPS, { step: F.step, maxStep: F.step }, "data-aut-goto") || "",
      body: () => (F.step === 1 ? createStep1() : `${F.errors.form ? `<div class="e-permits-aut-form-note">${U().renderNotice?.("error", esc(F.errors.form), { role: "alert" }) || ""}</div>` : ""}${authorityForm(F.v, { create: true })}`),
      footer: () => (F.step === 1
        ? `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-aut-drawer-close>Închide</button><button class="btn btn-primary btn-rounded" type="button" data-aut-mconnect-fetch${F.v.idno && !idnoProblem(F.v.idno) && !F.busy ? "" : ` aria-disabled="true" data-tooltip-reason="${esc(F.busy ? "Se interoghează MConnect…" : "Introdu un IDNO de 13 cifre.")}"`}>${F.busy ? '<span class="spinner spinner--extra-small spinner--neutral" aria-hidden="true"></span>' : ""}<span>Extrage MConnect</span></button></div>`
        : footer("Salvează", "data-aut-create-save", { cancel: "Închide" }))
    },
    edit: {
      lg: () => !isRssp(authOf(F.id)),
      title: () => (isRssp(authOf(F.id)) ? "Editează tipul autorității" : "Editează autoritatea"),
      subtitle: () => authOf(F.id)?.nameRo || "",
      body: () => {
        const a = authOf(F.id);
        const lock = F.locked ? `<div class="e-permits-aut-form-note">${U().renderNotice?.("warning", "<strong>A pornit o sincronizare din RSSP.</strong> Câmpurile sunt blocate până la finalizare; modificările nesalvate nu se aplică și nu se păstrează.", { role: "alert", icon: "time" }) || ""}</div>` : "";
        return `${lock}${authorityForm(F.v, { rssp: isRssp(a), locked: F.locked, missingKeys: a.mconnectMissing || [] })}`;
      },
      footer: () => footer("Salvează", "data-aut-edit-save", { reason: F.locked ? SYNC_BUSY : "" })
    },
    sub: {
      lg: () => true,
      title: () => (F.id ? "Editează subdiviziunea" : "Adaugă subdiviziune"),
      subtitle: () => (F.id ? displayName(subOf(F.id)?.name, subOf(F.id)?.authorityId) : F.lockAuthority ? authOf(F.v.authorityId)?.nameRo || "" : "Se creează pentru o autoritate activă."),
      body: () => subForm(),
      footer: () => footer("Salvează", "data-sub-save")
    }
  };
  function createStep1() {
    const v = F.v;
    const problem = F.errors.idno || "";
    return `
      ${section("Identificare", grid(
        textField("idno", "IDNO", v.idno, { required: true, max: 13, inputmode: "numeric", placeholder: "13 cifre", error: problem, hint: "Codul fiscal al autorității. Verificăm dacă nu există deja în GEAP, apoi extragem datele din MConnect.", autofocus: true })
      ))}
      ${F.mcError ? `<div class="e-permits-aut-form-note">${U().renderNotice?.("error", F.mcError, { role: "alert" }) || ""}</div>` : ""}`;
  }
  function mconnectAnswer(idno) {
    if (params.get("mconnect") === "indisponibil") return { error: "<strong>MConnect este indisponibil.</strong> Nu am putut prelua datele; nu s-a înregistrat nimic. Încearcă din nou peste câteva minute." };
    const m = D().mconnect?.[idno];
    if (!m) return { error: `<strong>IDNO ${esc(idno)} nu este valid în MConnect.</strong> Verifică cifrele; nu s-a înregistrat nimic.` };
    return { data: m };
  }
  function fetchMconnect() {
    const v = F.v;
    const problem = idnoProblem(v.idno);
    if (!v.idno || problem) { F.errors.idno = problem || missing("IDNO"); renderDrawer("#aut-idno"); return; }
    /* AC-06: the IDNO is already in GEAP */
    const dup = D().authorities.find((a) => a.idno === v.idno);
    if (dup) { F.errors.idno = `IDNO ${v.idno} există deja în GEAP: ${dup.nameRo}. Nu se poate crea a doua oară.`; F.mcError = ""; renderDrawer("#aut-idno"); return; }
    F.busy = true; F.mcError = ""; F.errors = {};
    renderDrawer();
    setTimeout(() => {
      if (!F) return;
      F.busy = false;
      const res = mconnectAnswer(v.idno);
      if (res.error) { F.mcError = res.error; renderDrawer("#aut-idno"); return; }
      F.fromMconnect = { nameRo: Boolean(res.data.nameRo), code: Boolean(res.data.code), address: Boolean(res.data.address) };
      F.v = { ...emptyAuthority(), idno: v.idno, nameRo: res.data.nameRo || "", code: res.data.code || "", address: res.data.address || "" };
      F.step = 2; F.dirty = false;
      renderDrawer("top");
      requestAnimationFrame(() => drawer?.querySelector("#aut-code, #aut-nameRo, #aut-address, #aut-type")?.focus());
    }, 600);
  }
  function validateAuthority(v, { create = false, rssp = false, missingKeys = [] } = {}) {
    const e = {};
    const need = (k, label) => { if (!String(v[k] || "").trim()) e[k] = missing(label); };
    if (!v.type) e.type = missing("Tipul autorității");
    if (rssp) return e;
    const mc = F.fromMconnect || {};
    if (create ? !mc.nameRo : missingKeys.includes("nameRo")) need("nameRo", "Denumirea (RO)");
    if (create ? !mc.code : missingKeys.includes("code")) need("code", "Codul autorității");
    if (create ? !mc.address : missingKeys.includes("address")) need("address", "Adresa");
    need("email", "Email");
    if (v.email && (!RX.email.test(v.email) || v.email.length > 254)) e.email = "Email invalid: folosește formatul utilizator@domeniu.md.";
    if (v.website && (!RX.url.test(v.website) || v.website.length > 255)) e.website = "Website invalid: începe cu https:// sau http:// și are un domeniu cu punct.";
    (v.phones || []).forEach((p, i) => {
      if (!p && !i) e[`phone-${i}`] = missing("Telefon");
      else if (p && !RX.e164.test(p)) e[`phone-${i}`] = "Format E.164: + urmat de 7–15 cifre, ex. +37322123456.";
    });
    if (v.lat && !RX.decimal.test(v.lat)) e.lat = "Număr zecimal, ex. 47.024512.";
    if (v.lng && !RX.decimal.test(v.lng)) e.lng = "Număr zecimal, ex. 28.832157.";
    (v.accounts || []).forEach((x, i) => {
      if (x.iban && !RX.iban.test(x.iban)) e[`iban-${i}`] = "IBAN: 24 de caractere, începe cu MD.";
      if (x.iban && !x.bic) e[`bic-${i}`] = "Codul băncii este obligatoriu când IBAN-ul este completat.";
      else if (x.bic && !RX.bic.test(x.bic)) e[`bic-${i}`] = "8–11 caractere alfanumerice, ex. TREZMD2X.";
    });
    return e;
  }
  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = drawer?.querySelector('[aria-invalid="true"], .is-error button, .is-error input');
      el?.scrollIntoView?.({ block: "center" });
      el?.focus?.();
    });
  }
  function saveCreate() {
    const v = F.v;
    v.phones = (v.phones || []).map((p) => p.trim());
    F.errors = validateAuthority(v, { create: true });
    if (Object.keys(F.errors).length) { renderDrawer(); focusFirstError(); return; }
    /* AC-17: registered by someone else between MConnect and Salvează */
    if (params.get("duplicat") === "1" || D().authorities.some((a) => a.idno === v.idno)) {
      F.errors = { form: `O autoritate cu IDNO ${v.idno} a fost înregistrată între timp de alt utilizator. Nu am creat o înregistrare duplicată; închide formularul și caut-o în listă.` };
      renderDrawer("top");
      return;
    }
    const id = `aut-${fold(v.code).replace(/[^a-z0-9]/g, "") || "nou"}-${Date.now().toString(36).slice(-4)}`;
    const a = { id, ...clone(v), phones: v.phones.filter(Boolean), accounts: (v.accounts || []).filter((x) => x.iban || x.bic), source: "GEAP", lastSync: null, createdAt: nowIso(), createdBy: userName(), mconnectMissing: Object.entries(F.fromMconnect || {}).filter(([, ok]) => !ok).map(([k]) => k), events: [] };
    D().authorities.push(a);
    /* AC-25 */
    audit(a, "Creare autoritate", `IDNO ${a.idno} · ${Object.keys(FIELD_NAMES).filter((k) => fmtValue(k, a[k])).map(fieldName).join(", ")}`);
    closeDrawer();
    refreshLists();
    /* AC-24: the new authority at once + the way to its subdivisions */
    openAuthority(id, "subdiviziuni");
    toast(`Autoritatea ${a.code} a fost creată. Adaugă subdiviziunile ei.`);
  }
  function startEditAuthority(id) {
    const a = authOf(id);
    if (!a) return;
    if (syncBusy()) { toast(SYNC_BUSY, "info"); return; }
    openDrawer({ mode: "edit", id, v: { ...clone(a), phones: (a.phones || []).length ? clone(a.phones) : [""], accounts: clone(a.accounts || []) } });
  }
  function saveEdit() {
    const a = authOf(F.id);
    if (!a || F.locked) return;
    const v = F.v;
    v.phones = (v.phones || []).map((p) => p.trim());
    F.errors = validateAuthority(v, { rssp: isRssp(a), missingKeys: a.mconnectMissing || [] });
    if (Object.keys(F.errors).length) { renderDrawer(); focusFirstError(); return; }
    const keys = isRssp(a) ? ["type"] : ["type", "nameRu", "nameEn", "descRo", "descRu", "descEn", "email", "phones", "website", "lat", "lng", "postal", "logo", "accounts", "published", ...(a.mconnectMissing || [])];
    const next = { ...v, phones: v.phones.filter(Boolean), accounts: (v.accounts || []).filter((x) => x.iban || x.bic) };
    const changed = keys.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(next[k] ?? null));
    if (!changed.length) { closeDrawer(); return; }
    /* US-90 AC-29: every changed field, before → after */
    audit(a, "Actualizare autoritate", changed.map((k) => `${fieldName(k)}: ${fmtValue(k, a[k]) || "—"} → ${fmtValue(k, next[k]) || "—"}`).join(" · "));
    changed.forEach((k) => { a[k] = clone(next[k]); });
    closeDrawer();
    refreshLists();
    renderProfile();
    toast(`Datele autorității ${a.code} au fost salvate.`);
  }

  /* ---------------------------------------------------------------- „Sincronizare MConnect” (US-90 AC-09…14, AC-30) */
  function syncMconnect(id) {
    const a = authOf(id);
    if (!a || isRssp(a)) return;
    if (syncBusy()) { toast(SYNC_BUSY, "info"); return; }
    const res = mconnectAnswer(a.idno);
    if (res.error) { window.GEAPToast?.show ? window.GEAPToast.show({ type: "error", message: res.error.replace(/<[^>]+>/g, ""), duration: 0, key: "aut-mc" }) : toast(res.error, "error"); return; }
    const before = { nameRo: a.nameRo, code: a.code, address: a.address };
    const missingNow = ["nameRo", "code", "address"].filter((k) => !res.data[k]);
    const changes = ["nameRo", "code", "address"].filter((k) => res.data[k] && res.data[k] !== a[k]);
    changes.forEach((k) => { a[k] = res.data[k]; });
    a.mconnectMissing = missingNow;
    audit(a, "Sincronizare MConnect", changes.length ? changes.map((k) => `${fieldName(k)}: ${before[k]} → ${a[k]}`).join(" · ") : `Fără modificări${missingNow.length ? ` · nereturnate: ${missingNow.map(fieldName).join(", ")}` : ""}`);
    refreshLists();
    renderProfile();
    toast(changes.length ? `Am actualizat din MConnect: ${changes.map(fieldName).join(", ")}.` : missingNow.length ? `MConnect nu a returnat ${missingNow.map(fieldName).join(", ")}: câmpul rămâne editabil.` : "Datele din MConnect sunt deja la zi.", missingNow.length ? "info" : "success");
  }

  /* ---------------------------------------------------------------- activate / inactivate an authority (US-92) */
  function askDeactivateAuthority(id) {
    const a = authOf(id);
    if (!a || isRssp(a) || !a.active) return;
    const active = subsOf(a.id).filter((s) => s.active);
    /* AC-04: the warning + the active subdivisions that follow it */
    const list = active.length
      ? `<div class="e-permits-aut-cascade">
          <p class="e-permits-aut-cascade__title">Se inactivează automat ${plural(active.length, "subdiviziune activă", "subdiviziuni active")}:</p>
          <ul class="e-permits-aut-cascade__list" role="list">${active.map((s) => `<li class="e-permits-aut-cascade__item">${icon("building", 20)}<span>${esc(s.name)}</span></li>`).join("")}</ul>
        </div>`
      : '<p class="e-permits-aut-cascade__title">Autoritatea nu are subdiviziuni active.</p>';
    G().openModal?.({
      kind: "aut-cascade",
      title: `Inactivezi autoritatea ${a.code}?`,
      subtitle: a.nameRo,
      body: `<div class="e-permits-aut-confirm">${U().renderNotice?.("warning", "Autoritatea și subdiviziunile ei nu vor mai putea fi alese pentru atribuiri noi sau dosare noi. Dosarele existente continuă; combinațiile (rol, subdiviziune) ale utilizatorilor se marchează „Inactiv”.") || ""}${list}</div>`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Nu</button><button class="btn btn-destructive btn-rounded" type="button" data-aut-deactivate-confirm="${esc(a.id)}">Da, inactivează</button></div>`
    });
  }
  function setAuthorityActive(a, on, { by = userName(), quiet = false } = {}) {
    const affected = [];
    a.active = on;
    subsOf(a.id).forEach((s) => {
      if (!on && s.active) { s.active = false; s.inactiveCause = "authority"; affected.push(s); audit(s, "Inactivare subdiviziune", `Cauza: Inactivare autoritate ${a.code}`, { user: by }); }
      /* AC-13: only those inactivated by the authority come back */
      if (on && !s.active && s.inactiveCause === "authority") { s.active = true; s.inactiveCause = null; affected.push(s); audit(s, "Activare subdiviziune", `Cauza: Reactivare autoritate ${a.code}`, { user: by }); }
    });
    audit(a, on ? "Activare autoritate" : "Inactivare autoritate", affected.length ? `Subdiviziuni ${on ? "reactivate" : "inactivate"}: ${affected.map((s) => `${s.name} (${on ? "Inactiv → Activ" : "Activ → Inactiv"})`).join(", ")}` : "Fără subdiviziuni afectate", { user: by });
    if (!quiet) {
      refreshLists();
      if (profileOpen()) renderProfile();
    }
    return affected;
  }
  function deactivateAuthority(id) {
    const a = authOf(id);
    G().closeModal?.();
    if (!a) return;
    const n = setAuthorityActive(a, false).length;
    toast(`Autoritatea ${a.code} a fost inactivată${n ? ` împreună cu ${plural(n, "subdiviziune", "subdiviziuni")}` : ""}.`);
  }
  /* AC-02: „Activează” runs at once, no confirmation */
  function activateAuthority(id) {
    const a = authOf(id);
    if (!a || isRssp(a) || a.active) return;
    const n = setAuthorityActive(a, true).length;
    toast(`Autoritatea ${a.code} a fost activată${n ? `; ${plural(n, "subdiviziune reactivată", "subdiviziuni reactivate")}` : ""}.`);
  }

  /* ---------------------------------------------------------------- subdivisions: activate / inactivate (US-96) */
  function askSubActive(id, on) {
    const s = subOf(id);
    if (!s || !canSeeSub(s)) return;
    const authority = authOf(s.authorityId);
    if (on && authority && !authority.active) { toast(`Autoritatea ${authority.code} este inactivă: activează întâi autoritatea.`, "info"); return; }
    U().askConfirm?.({
      title: on ? `Confirmi reactivarea subdiviziunii ${s.name}?` : `Confirmi inactivarea subdiviziunii ${s.name}?`,
      text: on ? "Subdiviziunea redevine selectabilă la utilizatori și în configurarea serviciilor." : "Nu va mai putea fi aleasă la utilizatori sau în configurarea serviciilor; lucrul pe dosarele existente continuă.",
      confirmLabel: "Confirmă",
      cancelLabel: "Anulează",
      destructive: !on
    }, () => {
      s.active = on;
      s.inactiveCause = on ? null : "manual";
      audit(s, on ? "Activare subdiviziune" : "Inactivare subdiviziune", `${s.id} · ${s.name}`);
      refreshLists();
      if (profileOpen()) renderProfile();
      toast(on ? "Subdiviziunea a fost activată cu succes." : "Subdiviziunea a fost inactivată cu succes.");
    });
  }

  /* ---------------------------------------------------------------- subdivision form (US-93 / US-94) */
  const emptySub = (authorityId = "") => ({ name: "", nameEn: "", nameRu: "", authorityId, type: "", prefix: "", active: true, raion: "", localitate: "", strada: "", casa: "", bloc: "", etaj: "", oficiu: "", postal: "", approvedBy: "", phone: "", email: "", raioane: [] });
  function startSub({ id = "", authorityId = "", from = "list" } = {}) {
    if (!who().admin) return;
    if (id) {
      const s = subOf(id);
      if (!s || !canSeeSub(s)) { showDenied("Subdiviziuni"); return; }
      openDrawer({ mode: "sub", id, from, base: clone(s), v: clone(s), lockAuthority: true });
      return;
    }
    const local = who().local;
    const pre = authorityId || (local ? who().authorityId : "");
    openDrawer({ mode: "sub", id: "", from, v: emptySub(pre), lockAuthority: Boolean(authorityId) });
  }
  function subForm() {
    const v = F.v;
    const e = F.errors;
    const editing = Boolean(F.id);
    /* AC-08: Administrator local sees only his authority; only active authorities take new subdivisions */
    const options = D().authorities.filter((a) => a.active && (who().central || a.id === who().authorityId)).sort((x, y) => x.nameRo.localeCompare(y.nameRo, "ro")).map((a) => [a.id, a.nameRo]);
    const raion = raionOf(v.raion);
    const locality = localityOf(v.raion, v.localitate);
    return `
      ${e.form ? `<div class="e-permits-aut-form-note">${U().renderNotice?.("error", esc(e.form), { role: "alert" }) || ""}</div>` : ""}
      ${section("Date generale", grid(
        textField("name", "Denumirea subdiviziunii", v.name, { required: true, max: 250, error: e.name, autofocus: !editing }),
        textField("nameEn", "Denumirea (EN)", v.nameEn, { required: true, max: 250, span: 6, error: e.nameEn }),
        textField("nameRu", "Denumirea (RU)", v.nameRu, { required: true, max: 250, span: 6, error: e.nameRu }),
        F.lockAuthority ? roField("Autoritatea", esc(authOf(v.authorityId)?.nameRo || ""), 12, { required: true }) : selectField("authorityId", "Autoritatea", options, v.authorityId, { required: true, placeholder: "Alege autoritatea", error: e.authorityId }),
        roField("Denumirea afișată", `<span data-sub-display>${esc(displayName(v.name, v.authorityId))}</span>`),
        selectField("type", "Tipul subdiviziunii", D().subTypes, v.type, { required: true, placeholder: "Alege tipul", span: 6, error: e.type, hint: "Doar subdiviziunile de avizare apar la etapa de avizare a dosarelor." }),
        textField("prefix", "Codul prefixului pentru număr act permisiv", v.prefix, { span: 6, max: 20, hint: "Opțional; folosit la numerotarea actelor." }),
        editing ? roField("Activ", v.active ? "Da" : "Nu", 6) : toggleField("active", "Activ", v.active)
      ))}
      ${section("Adresă", grid(
        roField("Țara", "Republica Moldova", 6),
        selectField("raion", "Raionul", D().raioane.map((r) => r.name), v.raion, { required: true, placeholder: "Alege raionul", span: 6, error: e.raion }),
        selectField("localitate", "Localitatea", (raion?.localities || []).map((l) => l.name), v.localitate, { required: true, placeholder: raion ? "Alege localitatea" : "Alege întâi raionul", span: 6, error: e.localitate, disabled: !raion }),
        selectField("strada", "Strada", locality?.streets || [], v.strada, { placeholder: locality ? "Alege strada" : "Alege întâi localitatea", span: 6, disabled: !locality }),
        textField("casa", "Casa", v.casa, { span: 4, max: 10 }),
        textField("bloc", "Blocul", v.bloc, { span: 4, max: 10 }),
        textField("etaj", "Etajul", v.etaj, { span: 4, max: 10 }),
        textField("oficiu", "Oficiul", v.oficiu, { span: 6, max: 10 }),
        textField("postal", "Codul poștal", v.postal, { span: 6, max: 10, placeholder: "MD-2001" }),
        roField("Adresa subdiviziunii", `<span data-sub-address>${esc(addressOf(v))}</span>`)
      ))}
      ${section("Aprobare", grid(
        selectField("approvedBy", "Aprobat de", D().approvedBy, v.approvedBy, { required: true, placeholder: "Alege cine aprobă", error: e.approvedBy })
      ))}
      ${section("Date de contact", grid(
        textField("phone", "Telefonul", v.phone, { span: 6, error: e.phone, inputmode: "tel", placeholder: "+37322123456", max: 12 }),
        textField("email", "Adresa de e-mail", v.email, { span: 6, error: e.email, inputmode: "email", placeholder: "utilizator@domeniu.md", max: 254 })
      ))}
      ${section("Localități subordonate", grid(`<div class="e-permits-user-create__field">${window.GEAPFormRender?.fieldHtml({ id: "sub-raioane", type: "multiselect", label: "Raioane din aria de competență", options: D().raioane.map((r) => r.name), value: v.raioane || [], placeholder: "Alege raioanele", countOne: "raion selectat", countMany: "raioane selectate", removeLabel: "Elimină raionul", searchLabel: "Caută raion", searchAria: "Caută raion", hint: "Opțional. Fără raioane, subdiviziunea nu este luată în considerare la atribuirea automată a dosarelor după localitate.", span: 12 }) || ""}</div>`))}`;
  }
  function validateSub(v) {
    const e = {};
    const need = (k, label) => { if (!String(v[k] || "").trim()) e[k] = missing(label); };
    need("name", "Denumirea subdiviziunii"); need("nameEn", "Denumirea (EN)"); need("nameRu", "Denumirea (RU)");
    need("authorityId", "Autoritatea"); need("type", "Tipul subdiviziunii"); need("raion", "Raionul"); need("localitate", "Localitatea"); need("approvedBy", "Aprobat de");
    if (v.phone && !RX.phoneMd.test(v.phone.replace(/\s/g, ""))) e.phone = "Format telefon invalid.";
    if (v.email && !RX.email.test(v.email)) e.email = "Format e-mail invalid.";
    return e;
  }
  function saveSub({ confirmedDup = false } = {}) {
    const v = F.v;
    F.errors = validateSub(v);
    if (Object.keys(F.errors).length) { renderDrawer(); focusFirstError(); return; }
    const editing = F.id ? subOf(F.id) : null;
    /* US-94 AC-20 */
    if (editing && params.get("conflict") === "1") { F.errors = { form: "Datele au fost modificate de alt utilizator. Reîncarcă pagina pentru a vizualiza versiunea curentă." }; renderDrawer("top"); return; }
    /* US-93 AC-25 / US-94 AC-18: non-blocking duplicate warning */
    const nameChanged = !editing || fold(editing.name) !== fold(v.name);
    const dup = nameChanged && D().subdivisions.some((s) => s.id !== F.id && s.authorityId === v.authorityId && fold(s.name) === fold(v.name));
    if (dup && !confirmedDup) {
      U().askConfirm?.({ title: "Denumire existentă", text: "Există deja o subdiviziune cu această denumire în cadrul autorității. Confirmi salvarea?", confirmLabel: "Confirmă", cancelLabel: "Anulează" }, () => saveSub({ confirmedDup: true }));
      return;
    }
    const data = { ...clone(v) };
    if (editing) {
      const keys = ["name", "nameEn", "nameRu", "type", "prefix", ...ADDR_KEYS, "approvedBy", "phone", "email"];
      const changed = keys.filter((k) => String(editing[k] || "") !== String(data[k] || ""));
      const added = data.raioane.filter((r) => !editing.raioane.includes(r));
      const removed = editing.raioane.filter((r) => !data.raioane.includes(r));
      /* AC-24: every field before → after, each raion added / removed on its own */
      if (changed.length) audit(editing, "Actualizare subdiviziune", changed.map((k) => `${SUB_FIELDS[k] || k}: ${editing[k] || "—"} → ${data[k] || "—"}`).join(" · "));
      added.forEach((r) => audit(editing, "Actualizare subdiviziune", `Localități subordonate: adăugat ${r}`));
      removed.forEach((r) => audit(editing, "Actualizare subdiviziune", `Localități subordonate: eliminat ${r}`));
      Object.assign(editing, data, { active: editing.active, authorityId: editing.authorityId });
      editing.version = (editing.version || 1) + 1;
      const id = editing.id;
      const from = P.kind === "s" ? P.from : F.from === "authority" ? "authority" : "list";
      closeDrawer();
      refreshLists();
      /* AC-23 */
      openSub(id, "general", { from });
      toast("Subdiviziunea a fost actualizată cu succes.");
      return;
    }
    const id = `sub-${fold(v.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "noua"}-${Date.now().toString(36).slice(-4)}`;
    const s = { id, ...data, inactiveCause: data.active ? null : "manual", version: 1, events: [] };
    D().subdivisions.push(s);
    audit(s, "Creare subdiviziune", `${displayName(s.name, s.authorityId)} · autor ${who().roleLabel || "Administrator"}`);
    const fromAuthority = F.lockAuthority && F.from === "authority";
    closeDrawer();
    refreshLists();
    /* AC-26: back to where the form was opened */
    if (fromAuthority) openAuthority(s.authorityId, "subdiviziuni");
    else openSub(id, "general", { from: "list" });
    toast("Subdiviziunea a fost creată cu succes.");
  }
  const SUB_FIELDS = { name: "Denumirea subdiviziunii", nameEn: "Denumirea (EN)", nameRu: "Denumirea (RU)", type: "Tipul subdiviziunii", prefix: "Codul prefixului", raion: "Raionul", localitate: "Localitatea", strada: "Strada", casa: "Casa", bloc: "Blocul", etaj: "Etajul", oficiu: "Oficiul", postal: "Codul poștal", approvedBy: "Aprobat de", phone: "Telefonul", email: "Adresa de e-mail" };

  /* ---------------------------------------------------------------- drawer events */
  function onDrawerInput(event) {
    const t = event.target;
    if (!F || !(t instanceof Element)) return;
    const key = t.dataset.autField;
    if (key && t.type !== "checkbox" && t.tagName !== "SELECT") {
      F.v[key] = t.value;
      F.dirty = true;
      if (key === "idno") {
        const p = idnoProblem(t.value);
        F.errors.idno = p; F.mcError = "";
        renderDrawer("#aut-idno");
        return;
      }
      if (F.errors[key]) { delete F.errors[key]; renderDrawer(); return; }
      const counter = drawer.querySelector(`[data-aut-counter="${t.id}"]`);
      if (counter) counter.textContent = `${t.value.length} / ${t.maxLength}`;
      /* US-93 AC-09 / AC-20: the two derived fields follow live */
      const disp = drawer.querySelector("[data-sub-display]");
      if (disp) disp.textContent = displayName(F.v.name, F.v.authorityId);
      const addr = drawer.querySelector("[data-sub-address]");
      if (addr) addr.textContent = addressOf(F.v);
      return;
    }
    const i = Number(t.id.split("-").pop());
    if (t.matches("[data-aut-phone]")) { F.v.phones[i] = t.value; F.dirty = true; if (F.errors[`phone-${i}`]) { delete F.errors[`phone-${i}`]; renderDrawer(); } return; }
    if (t.matches("[data-aut-iban]")) { F.v.accounts[i].iban = t.value.toUpperCase().replace(/\s/g, ""); F.dirty = true; if (F.errors[`iban-${i}`]) { delete F.errors[`iban-${i}`]; renderDrawer(); } return; }
    if (t.matches("[data-aut-bic]")) { F.v.accounts[i].bic = t.value.toUpperCase().replace(/\s/g, ""); F.dirty = true; if (F.errors[`bic-${i}`]) { delete F.errors[`bic-${i}`]; renderDrawer(); } }
  }
  function onDrawerChange(event) {
    const t = event.target;
    if (!F || !(t instanceof Element)) return;
    if (t.matches("[data-aut-logo-input]")) { pickLogo(t.files?.[0]); t.value = ""; return; }
    const key = t.dataset.autField;
    if (!key) return;
    if (t.type === "checkbox") { F.v[key] = t.checked; F.dirty = true; return; }
    if (t.tagName !== "SELECT") return;
    const prev = F.v[key];
    F.v[key] = t.value;
    F.dirty = true;
    delete F.errors[key];
    /* US-93 AC-17 / AC-18, US-94 AC-06 / AC-07: the address cascade resets what depends on it */
    if (key === "raion") { F.v.localitate = ""; F.v.strada = ""; }
    if (key === "localitate") F.v.strada = "";
    /* US-94 AC-10a: changing the type of an existing subdivision asks first */
    if (key === "type" && F.mode === "sub" && F.id && prev && prev !== t.value) {
      U().askConfirm?.({ title: "Schimbi tipul subdiviziunii?", text: "Modificarea tipului subdiviziunii poate afecta vizibilitatea acesteia în procesele de avizare pentru dosarele în curs. Confirmi modificarea?", confirmLabel: "Confirmă", cancelLabel: "Anulează" }, () => renderDrawer(`#aut-${key}`));
      watchCancel(() => { if (F) { F.v.type = prev; renderDrawer(`#aut-${key}`); } });
    }
    renderDrawer(`#aut-${key}`);
  }
  /* askConfirm has no cancel callback: the confirm modal closing without its OK button = cancelled */
  function watchCancel(onCancel) {
    const modal = document.querySelector("#service-confirm-modal");
    if (!modal) return;
    let ok = false;
    const okBtn = modal.querySelector("[data-service-confirm-ok]");
    const mark = () => { ok = true; };
    okBtn?.addEventListener("click", mark, { once: true });
    const obs = new MutationObserver(() => {
      if (modal.getAttribute("aria-hidden") === "true" || !modal.classList.contains("is-active")) {
        obs.disconnect();
        okBtn?.removeEventListener("click", mark);
        if (!ok) onCancel();
      }
    });
    setTimeout(() => obs.observe(modal, { attributes: true, attributeFilter: ["class", "aria-hidden"] }), 0);
  }
  function pickLogo(file) {
    if (!file) return;
    const okType = /\.(png|jpe?g|svg)$/i.test(file.name);
    if (!okType) { F.errors.logo = "Format neacceptat: alege un fișier PNG, JPG sau SVG."; renderDrawer(); return; }
    if (file.size > 2 * 1024 * 1024) { F.errors.logo = "Fișierul depășește 2 MB."; renderDrawer(); return; }
    const done = () => { delete F.errors.logo; F.v.logo = { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }; F.dirty = true; renderDrawer(); };
    if (/\.svg$/i.test(file.name)) { done(); return; }
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); if (img.naturalWidth < 100 || img.naturalHeight < 100) { F.errors.logo = `Imaginea are ${img.naturalWidth} × ${img.naturalHeight} px; minimum 100 × 100 px.`; renderDrawer(); return; } done(); };
    img.onerror = () => { F.errors.logo = "Fișierul nu poate fi citit ca imagine."; renderDrawer(); };
    img.src = URL.createObjectURL(file);
  }
  function onDrawerClick(event) {
    const t = event.target;
    if (!(t instanceof Element) || !F) return;
    if (t.closest("[data-aut-drawer-close]")) { requestClose(); return; }
    if (t.closest("[aria-disabled='true']")) return;
    if (t.closest("[data-aut-mconnect-fetch]")) { fetchMconnect(); return; }
    const go = t.closest("[data-aut-goto]");
    if (go && Number(go.dataset.autGoto) === 1) { F.step = 1; F.errors = {}; renderDrawer("#aut-idno"); return; }
    if (t.closest("[data-aut-create-save]")) { saveCreate(); return; }
    if (t.closest("[data-aut-edit-save]")) { saveEdit(); return; }
    if (t.closest("[data-sub-save]")) { saveSub(); return; }
    if (t.closest("[data-aut-phone-add]")) { F.v.phones.push(""); F.dirty = true; renderDrawer(`#aut-phone-${F.v.phones.length - 1}`); return; }
    const pr = t.closest("[data-aut-phone-remove]");
    if (pr) { F.v.phones.splice(Number(pr.dataset.autPhoneRemove), 1); F.errors = {}; F.dirty = true; renderDrawer(); drawer.querySelector("[data-aut-phone-add]")?.focus(); return; }
    if (t.closest("[data-aut-account-add]")) { F.v.accounts.push({ iban: "", bic: "" }); F.dirty = true; renderDrawer(`#aut-iban-${F.v.accounts.length - 1}`); return; }
    const ar = t.closest("[data-aut-account-remove]");
    if (ar) { F.v.accounts.splice(Number(ar.dataset.autAccountRemove), 1); F.errors = {}; F.dirty = true; renderDrawer(); drawer.querySelector("[data-aut-account-add]")?.focus(); return; }
    if (t.closest("[data-aut-logo-pick]")) { drawer.querySelector("[data-aut-logo-input]")?.click(); return; }
    if (t.closest("[data-aut-logo-remove]")) { F.v.logo = null; F.dirty = true; renderDrawer(); drawer.querySelector("[data-aut-logo-pick]")?.focus(); return; }
  }
  /* US-90 AC-05: a sync that starts while the edit drawer is open locks it at once */
  function lockOpenForms() {
    if (F && F.mode === "edit") { F.locked = true; renderDrawer(); }
  }

  /* ================================================================ RSSP sync (US-87, US-91, US-112) */
  function askSync(ids = null) {
    if (!who().central) return;
    if (syncBusy()) { toast(SYNC_BUSY, "info"); return; }
    const one = ids && ids.length === 1 ? authOf(ids[0]) : null;
    U().askConfirm?.({
      title: one ? `Confirmi sincronizarea autorității ${one.code} din RSSP?` : "Confirmi sincronizarea autorităților din RSSP?",
      text: one ? "Datele autorității se actualizează din RSSP după IDNO. Tipul și subdiviziunile nu se modifică." : "GEAP actualizează din RSSP, după IDNO, toate autoritățile care au IDNO. Nu se creează autorități noi; tipul și subdiviziunile nu se modifică.",
      confirmLabel: "Da",
      cancelLabel: "Nu"
    }, () => runSync(ids));
  }
  function runSync(ids = null) {
    /* AC-15: RSSP down at the start → nothing starts, nothing changes */
    if (RSSP_MODE === "indisponibil") {
      audit(null, "Sincronizare din RSSP neinițiată", "RSSP indisponibil (timeout)", { status: "Eșuat" });
      window.GEAPToast?.show ? window.GEAPToast.show({ type: "error", message: "RSSP nu răspunde (timeout după 30 de secunde). Sincronizarea nu a pornit și nu s-a modificat nimic. Încearcă din nou mai târziu.", duration: 0, key: "aut-sync" }) : toast("RSSP indisponibil", "error");
      return;
    }
    S.syncing = { by: userName(), mode: "manuală", at: nowIso() };
    audit(null, "Inițiere sincronizare din RSSP", ids ? `Individuală: ${ids.map((id) => authOf(id)?.code).join(", ")}` : "În masă");
    syncChrome();
    if (profileOpen()) renderProfile();
    setTimeout(() => {
      const report = applySync(ids);
      S.syncing = null;
      refreshLists();
      syncChrome();
      if (profileOpen()) renderProfile();
      showReport(report, ids);
    }, 1200);
  }
  function applySync(ids) {
    const at = nowIso();
    const pool = D().authorities.filter((a) => a.idno && (!ids || ids.includes(a.id)));
    const r = { at, updated: [], unchanged: [], failed: [], notFound: [], activity: [], converted: [] };
    pool.forEach((a, index) => {
      /* AC-16: RSSP lost midway — what is done stays, the rest fails with „RSSP indisponibil” */
      if (RSSP_MODE === "intrerupt" && index >= 4) { r.failed.push({ a, reason: "RSSP indisponibil" }); audit(a, "Sincronizare din RSSP", "RSSP indisponibil", { status: "Eșuat" }); return; }
      const answer = D().rssp?.[a.idno];
      if (!answer) {
        if (isRssp(a)) { a.lastSync = at; r.unchanged.push({ a }); audit(a, "Sincronizare din RSSP", "Fără modificări"); }
        else r.notFound.push({ a });
        return;
      }
      if (answer.error) { r.failed.push({ a, reason: answer.error }); audit(a, "Sincronizare din RSSP", answer.error, { status: "Eșuat" }); return; }
      const changes = Object.entries(answer.changes || {}).filter(([k, v]) => JSON.stringify(a[k]) !== JSON.stringify(v));
      /* US-91: a manual authority whose IDNO is in RSSP becomes an RSSP authority, in place */
      if (!isRssp(a)) {
        const snapshot = Object.keys(FIELD_NAMES).map((k) => `${fieldName(k)}: ${fmtValue(k, a[k]) || "—"}`).join(" · ");
        a.source = "RSSP"; a.convertedAt = at; a.mconnectMissing = [];
        r.converted.push({ a });
        audit(a, "Conversie: creată manual → sincronizată din RSSP", `Starea anterioară: ${snapshot}`, { user: "SIA GEAP" });
      }
      const activeChange = changes.find(([k]) => k === "active");
      const fieldChanges = changes.filter(([k]) => k !== "active").map(([k, v]) => ({ k, before: fmtValue(k, a[k]), after: fmtValue(k, v) }));
      changes.filter(([k]) => k !== "active").forEach(([k, v]) => { a[k] = clone(v); });
      if (activeChange) {
        /* AC-12 / AC-13 (US-87), AC-15 / AC-16 (US-92): the same cascade as by hand, author SIA GEAP */
        const affected = setAuthorityActive(a, activeChange[1], { by: "SIA GEAP", quiet: true });
        r.activity.push({ a, on: activeChange[1], affected });
        fieldChanges.push({ k: "active", before: activeChange[1] ? "Nu" : "Da", after: activeChange[1] ? "Da" : "Nu" });
      }
      a.lastSync = at;
      if (fieldChanges.length) { r.updated.push({ a, changes: fieldChanges }); audit(a, "Sincronizare din RSSP", fieldChanges.map((c) => `${fieldName(c.k)}: ${c.before || "—"} → ${c.after || "—"}`).join(" · ")); }
      else { r.unchanged.push({ a }); audit(a, "Sincronizare din RSSP", "Fără modificări"); }
    });
    /* AC-16 / AC-17: „Ultima sincronizare” only when something succeeded */
    if (r.updated.length || r.unchanged.length) S.lastSync = { at, mode: ids ? "individuală" : "manuală" };
    audit(null, "Rezultat sincronizare din RSSP", `Actualizate ${r.updated.length} · fără modificări ${r.unchanged.length} · eșuate ${r.failed.length} · negăsite ${r.notFound.length}`, { status: r.failed.length ? "Eșuat" : "Reușit" });
    return r;
  }
  function showReport(r, ids) {
    const item = (a, meta, badges = []) => ({ plainTitle: a.nameRo, title: esc(a.nameRo), badges, meta });
    const list = (title, items, empty) => (items.length ? A().renderStackedList?.(title, [{ label: "", items }], { meta: plural(items.length, "autoritate", "autorități") }) : "") || (empty ? "" : "");
    const warnings = [
      ...r.activity.map(({ a, on, affected }) => U().renderNotice?.("warning", `<strong>${esc(a.nameRo)} a fost ${on ? "activată" : "inactivată"} în RSSP.</strong> ${affected.length ? `${plural(affected.length, "subdiviziune", "subdiviziuni")} ${on ? "reactivate" : "inactivate"} automat: ${esc(affected.map((s) => s.name).join(", "))}.` : "Nicio subdiviziune afectată."}`)),
      ...r.converted.map(({ a }) => U().renderNotice?.("info", `<strong>${esc(a.nameRo)}</strong> era creată manual; IDNO-ul a fost găsit în RSSP, așa că este acum sincronizată din RSSP (câmpurile sincronizate devin read-only).`))
    ].filter(Boolean).join("");
    const body = `
      ${warnings ? `<div class="e-permits-aut__notices">${warnings}</div>` : ""}
      ${list("Găsite în RSSP · actualizate", r.updated.map(({ a, changes }) => item(a, changes.map((c) => esc(`${fieldName(c.k)}: ${c.after || "—"}`)), [tag("Actualizată", "success")])))}
      ${list("Găsite în RSSP · eșuate", r.failed.map(({ a, reason }) => item(a, [esc(reason)], [tag("Eșuată", "danger")])))}
      ${list("Găsite în RSSP · fără modificări", r.unchanged.map(({ a }) => item(a, [esc(`IDNO ${a.idno}`)])))}
      ${list("Negăsite în RSSP", r.notFound.map(({ a }) => item(a, [esc(`IDNO ${a.idno} nu există în RSSP`)], [tag("Negăsită", "warning")])))}
      ${!r.updated.length && !r.failed.length && !r.unchanged.length && !r.notFound.length ? window.GEAPEmptyState?.render({ title: "Nicio autoritate cu IDNO", text: "Autoritățile fără IDNO nu participă la sincronizare.", icon: "rotate-arrow", compact: true }) || "" : ""}`;
    G().openModal?.({
      kind: "aut-report",
      title: "Rezultatul sincronizării din RSSP",
      subtitle: `${stamp(r.at)} · ${ids ? "individuală" : `${plural(r.updated.length + r.failed.length + r.unchanged.length + r.notFound.length, "autoritate", "autorități")} cu IDNO`}`,
      body,
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
  }

  /* ================================================================ delegated events */
  const closeMenus = () => {
    document.querySelectorAll("[data-stack-menu]:not([hidden])").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-stack-menu-trigger][aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  };
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest("[data-aut-drawer]")) return;
    const hit = (sel) => t.closest(sel);
    if (hit('[data-workplace-add-product="aut-new"]')) { event.preventDefault(); if (who().central) openDrawer({ mode: "create", step: 1, v: emptyAuthority(), fromMconnect: null }); return; }
    if (hit('[data-workplace-add-product="sub-new"]')) { event.preventDefault(); startSub({ from: "list" }); return; }
    if (hit("[aria-disabled='true']") && (hit("[data-aut-sync-all]") || hit("[data-aut-sync-one]") || hit("[data-aut-edit]") || hit("[data-aut-mconnect]") || hit("[data-sub-new-for]"))) return;
    if (hit("[data-aut-sync-all]")) { askSync(null); return; }
    const one = hit("[data-aut-sync-one]");
    if (one) { closeMenus(); askSync([one.dataset.autSyncOne]); return; }
    const deact = hit("[data-aut-deactivate]");
    if (deact) { closeMenus(); askDeactivateAuthority(deact.dataset.autDeactivate); return; }
    const deactOk = hit("[data-aut-deactivate-confirm]");
    if (deactOk) { deactivateAuthority(deactOk.dataset.autDeactivateConfirm); return; }
    const act = hit("[data-aut-activate]");
    if (act) { closeMenus(); activateAuthority(act.dataset.autActivate); return; }
    const sd = hit("[data-sub-deactivate]");
    if (sd) { closeMenus(); askSubActive(sd.dataset.subDeactivate, false); return; }
    const sa = hit("[data-sub-activate]");
    if (sa) { closeMenus(); askSubActive(sa.dataset.subActivate, true); return; }
    const se = hit("[data-sub-edit]");
    if (se) { event.stopPropagation(); closeMenus(); startSub({ id: se.dataset.subEdit, from: se.dataset.subFrom === "authority" ? "authority" : P.kind === "s" ? P.from : "list" }); return; }
    const sn = hit("[data-sub-new-for]");
    if (sn) { startSub({ authorityId: sn.dataset.subNewFor, from: "authority" }); return; }
    if (hit("[data-aut-back-list]")) { event.preventDefault(); P.id = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV_A}"]`)?.click(); return; }
    if (hit("[data-sub-back-list]")) { event.preventDefault(); P.id = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV_S}"]`)?.click(); return; }
    if (hit("[data-sub-back-auth]")) { event.preventDefault(); const s = subOf(P.id); if (s) openAuthority(s.authorityId, "subdiviziuni"); return; }
    if (!profileOpen()) return;
    const so = hit("[data-sub-open]");
    if (so && !hit("button, a, [data-stack-menu]")) { openSub(so.dataset.subOpen, "general", { from: "authority" }); return; }
    const tab = hit("[data-aut-tab]");
    if (tab) {
      P.tab = tab.dataset.autTab;
      renderProfile({ keepFocus: `[data-aut-tab="${P.tab}"]` });
      A().writeHash?.(P.kind === "a" ? `#autoritate/${P.id}/${P.tab}` : `#subdiviziune/${P.id}/${P.tab}`);
      return;
    }
    const ed = hit("[data-aut-edit]");
    if (ed) { startEditAuthority(ed.dataset.autEdit); return; }
    const mc = hit("[data-aut-mconnect]");
    if (mc) { closeMenus(); syncMconnect(mc.dataset.autMconnect); }
  });
  /* the stacked subdivision row opens with Enter / Space too (the shared row keydown clicks it) */
  document.addEventListener("keydown", (event) => {
    const tabBtn = event.target.closest?.("[data-aut-tab]");
    if (!tabBtn || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const all = [...tabBtn.parentElement.querySelectorAll("[data-aut-tab]")];
    const i = all.indexOf(tabBtn);
    const next = event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : all[(i + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    event.preventDefault();
    next?.click();
  });

  /* ================================================================ routes */
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash === `#${NAV_A}`) {
      if (who().central && document.querySelector(`[data-nav-item][data-nav-id="${NAV_A}"]`)) return false;
      showDenied("Autorități");
      return true;
    }
    if (hash === `#${NAV_S}`) {
      if (who().admin && document.querySelector(`[data-nav-item][data-nav-id="${NAV_S}"]`)) return false;
      showDenied("Subdiviziuni");
      return true;
    }
    let m = hash.match(/^#autoritate\/([^/]+)(?:\/([^/]+))?$/);
    if (m) { openAuthority(decodeURIComponent(m[1]), m[2] || "general", { push: false }); return true; }
    m = hash.match(/^#subdiviziune\/([^/]+)(?:\/([^/]+))?$/);
    if (m) { openSub(decodeURIComponent(m[1]), m[2] || "general", { push: false, from: P.kind === "a" ? "authority" : "list" }); return true; }
    return false;
  });

  /* US-112 AC-07 / AC-08 / AC-11: the central admins are notified (the header bell) */
  (window.GEAPNotifSources = window.GEAPNotifSources || []).push(() => (who().central && RSSP_MODE === "auto-esuat" ? [{
    id: "aut-auto-sync-2026-11-02",
    title: "Sincronizarea automată cu RSSP nu a pornit",
    line: "RSSP indisponibil la 03:00 · se reia la următorul ciclu",
    at: "2026-11-02T03:00:00",
    href: `#${NAV_A}`
  }] : []));

  const boot = () => { observeRegistry(); load(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  /* for demo states / probes */
  window.GEAPAutoritati = {
    load, openAuthority, openSub, state: S, authOf, subOf,
    /* US-90 AC-05 demo: an automatic sync starts while the edit drawer is open */
    startAutoSync: () => { S.syncing = { by: "SIA GEAP", mode: "automată", at: nowIso() }; lockOpenForms(); syncChrome(); if (profileOpen()) renderProfile(); }
  };
})();
