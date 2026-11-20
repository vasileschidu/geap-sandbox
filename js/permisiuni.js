/* =====================================================================================
   Administrare › Permisiuni (perm-v1, 2026-11-19) — Feature 97290 „Gestionarea permisiunilor în GEAP”,
   US-393 (97291) list · search · filters · sort · export · US-394 (97292) details: description RO / RU / EN + roles.
   Data: data/permisiuni.json (ID, cod, data creării, descrieri) over the role permission catalog
   (data/e-permits-users.json › profile.permissionCatalog = the names) and the roles of the Roles screen
   (`GEAPShellApi.roleRows()` = roleAdminDb: state + permissions, so roles ↔ permissions stay consistent).

   NO new engine — the list is the BO registry (`window.GEAPShellRegistries.permisiuni`, menu
   `shellView: "permisiuni-registry"`, nav id `permisiuni`):
     · columns ID · Cod · Denumire · Descriere (1 line + tooltip; none = Small warning tag „Fără descriere”) · Data creării
       („8 iulie 2026”), default sort Data creării, newest first (AC-07), every column sortable except Descriere;
     · search ID / cod / denumire / descriere in RO, RU, EN (case + diacritics insensitive, AC-09/10);
     · Filtrare = facets „Data creării” (plain De la / Până la range) + „Rol” (the roles that use it);
     · „Exportă” = the toolbar icon button with a format menu XLSX / CSV (everything search + filters show, AC-17…19);
       success toast + Jurnalul de audit „Export” (AC-22);
     · a row (click / Enter / Space) opens the details = the ONE drawer (default 800): Date generale (read-only),
       Descriere RO / RU / EN (the classifier textarea + counter), „Roluri” = read-only stacked list with the state tag.
   Access: Administrator central always; Administrator local only when granted (demo `?permisiuni=acordat`); everyone
   else → „Nu aveți permisiunea de a accesa această pagină.” (AC text kept). Demo switches ?permisiuni= acordat · gol ·
   eroare (the save fails). Routes #permisiuni and #permisiuni/<ID>.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const pad = (n) => String(n).padStart(2, "0");
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ""; };
  const dotDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}.${m[2]}.${m[1]}` : ""; };
  const timeOf = (iso) => String(iso || "").slice(11, 16);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;

  const KIND = "permisiuni";
  const NAV = "permisiuni";
  const TITLE = "Permisiuni";
  /* AC-quoted strings, kept word for word (the „Nu aveți” of the AC is the one exception to the „tu” tone) */
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
  const EMPTY = "Nu există permisiuni.";
  const NO_MATCH = "Nu s-a găsit nicio permisiune.";
  const SAVED = "Descrierea a fost salvată.";
  const SAVE_ERROR = "Descrierea nu a fost salvată. Încearcă din nou.";
  const DESC_MAX = 500;
  const LANGS = [["ro", "Descriere în română"], ["ru", "Descriere în rusă"], ["en", "Descriere în engleză"]];
  const COLS = [["nr", "ID"], ["cod", "Cod"], ["denumire", "Denumire"], ["descriere", "Descriere"], ["creat", "Data creării"]];

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("permisiuni") || "").split(",").map((s) => s.trim()).filter(Boolean));
  const grantedTo = (roleId) => roleId === "central-admin" || (roleId === "local-admin" && demo.has("acordat"));
  function who() {
    const a = A().currentAssignment?.() || {};
    return { has: grantedTo(a.roleId), name: A().currentUserName?.() || "Anastasia Cojocaru", role: a.roleLabel || "Administrator central" };
  }

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      /* the role icons = the ones of the role switcher (data/bo-context.json › roles[].icon), matched by name */
      fetch("data/bo-context.json").then((r) => r.json()).then((ctx) => {
        S.icons = new Map(Object.values(ctx.roles || {}).map((r) => [String(r.label).toLowerCase(), r.icon]));
        if (D.id) renderDetails();
      }).catch(() => {});
      S.loading = fetch("data/permisiuni.json?v=perm-v1").then((r) => r.json()).then((json) => {
        S.data = demo.has("gol") ? { permissions: [] } : json;
        return S.data;
      }).catch(() => { S.data = { permissions: [] }; return S.data; });
    }
    return S.loading;
  }
  const catalogName = () => new Map((A().permissionGroups?.() || []).flatMap((g) => (g.permissions || []).map((p) => [p.id, p.label])));
  const perms = () => S.data?.permissions || [];
  const permOf = (key) => perms().find((p) => p.id === key || p.nr === key) || null;
  /* US-394 AC-13…15: every role that has the permission ticked (inactive ones too); Administrator central always */
  function rolesOf(p) {
    return (A().roleRows?.() || [])
      .filter((r) => r.id === "rol-admc" || (r.functii || []).includes(p.id))
      .map((r) => ({ id: r.id, name: r.denumire, active: r.activ !== false }))
      .sort((a, b) => (a.id === "rol-admc" ? -1 : b.id === "rol-admc" ? 1 : (b.active - a.active) || a.name.localeCompare(b.name, "ro")));
  }
  const rowOf = (p, names) => ({ id: p.id, nr: p.nr, cod: p.cod, denumire: names.get(p.id) || p.cod, descriere: p.descriere?.ro || "", creat: p.creat, roles: rolesOf(p).map((r) => r.name), p });

  /* ---------------------------------------------------------------- the registry (US-393) */
  function registryDb() {
    if (!S.data) load().then(() => refreshList());
    const me = who();
    const names = catalogName();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 5,
      pageSizes: [25, 50, 100],
      defaultSort: "creat",
      defaultSortDirection: "desc",
      columns: {
        nr: { label: "ID", width: 120, sortable: true },
        cod: { label: "Cod", width: 248, sortable: true },
        denumire: { label: "Denumire", width: 280, sortable: true },
        descriere: { label: "Descriere", width: 360, fill: true },
        creat: { label: "Data creării", width: 168, sortable: true }
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după ID, cod, denumire sau descriere",
          columns: ["nr", "cod", "denumire", "descriere", "creat"],
          toolbarLabel: "Filtrare permisiuni",
          exportLabel: "Exportă"
        }
      },
      runtimeRows: S.data && me.has ? perms().map((p) => rowOf(p, names)) : []
    };
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "creat", label: "Data creării", type: "date", presets: [], get: (row) => row.creat },
        { key: "rol", label: "Rol", search: true, get: (row) => row.roles }
      ];
    },
    /* AC-09/10: ID, cod, denumire, descriere (every language); raw + folded = case and diacritics insensitive */
    searchText: (row) => { const d = row.p.descriere || {}; const raw = [row.nr, row.cod, row.denumire, d.ro, d.ru, d.en].join(" "); return `${raw} ${fold(raw)}`; },
    sortValue: (row, key) => (key === "creat" ? `${row.creat}|${row.nr}` : String(row[key] ?? "")),
    renderCell: (row, key) => {
      switch (key) {
        case "nr": return esc(row.nr);
        case "cod": return `<span data-cell-tooltip="${esc(row.cod)}">${esc(row.cod)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        /* Feature risk: a new permission has no description until an administrator writes one */
        case "descriere": return row.descriere ? `<span data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>` : tag("Fără descriere", "warning");
        case "creat": return esc(longDate(row.creat));
        default: return "";
      }
    },
    openRow: (id) => openDetails(id),
    rowLabel: (row) => `${row.denumire} — deschide detaliile permisiunii`,
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock" });
      if (!S.data) return E()?.render({ title: "Se încarcă permisiunile…", loading: true });
      if (query || filtered) return E()?.noResults?.(NO_MATCH, { text: "Caută după ID, cod, denumire sau descriere ori schimbă filtrele.", actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: EMPTY, text: "Permisiunile apar aici după ce dezvoltatorul le adaugă în cod și AdminPortal se actualizează.", icon: "shield-keyhole" });
    },
    /* the shared one-format button steps aside: this list exports XLSX or CSV from its own menu (AC-17) */
    exportState: () => ({ hidden: true })
  };

  const listEl = () => document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
  const listOpen = () => { const reg = listEl(); return Boolean(reg && !reg.hidden && !reg.closest("[hidden]")); };
  function refreshList() {
    const st = A().workplaceState;
    if (!listOpen() || !st) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
    syncChrome();
  }

  /* ---------------------------------------------------------------- export menu (US-393 AC-17…22) */
  function ensureChrome() {
    const tools = document.querySelector("[data-workplace] .e-permits-workplace__table-tools");
    if (!tools || tools.querySelector("[data-perm-export]")) return;
    tools.insertAdjacentHTML("beforeend", `
      <div class="e-permits-stack__menu-wrap e-permits-perm-export" data-perm-export>
        <button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Exportă" data-tooltip-label="Exportă" aria-haspopup="menu" aria-expanded="false" aria-controls="perm-export-menu" data-stack-menu-trigger data-perm-export-trigger>${icon("export", 16)}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="perm-export-menu" role="menu" aria-label="Formate de export" hidden data-stack-menu data-stack-menu-fixed>
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-perm-export-format="xlsx">${icon("table")}<span>XLSX (Excel)</span></button></li>
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-perm-export-format="csv">${icon("page-text")}<span>CSV</span></button></li>
        </ul>
      </div>`);
  }
  function syncChrome() {
    ensureChrome();
    const wrap = document.querySelector("[data-perm-export]");
    if (!wrap) return;
    const on = listOpen() && who().has;
    wrap.hidden = !on;
    const trigger = wrap.querySelector("[data-perm-export-trigger]");
    const n = on ? (A().getVisibleRows?.() || []).length : 0;
    if (n) { trigger.removeAttribute("aria-disabled"); delete trigger.dataset.tooltipReason; }
    else { trigger.setAttribute("aria-disabled", "true"); trigger.dataset.tooltipReason = "Lista afișată este goală."; }
  }
  let chromeQueued = false;
  const queueChrome = () => { if (chromeQueued) return; chromeQueued = true; requestAnimationFrame(() => { chromeQueued = false; syncChrome(); }); };
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.permObserved) return;
    reg.dataset.permObserved = "1";
    new MutationObserver(() => { if (reg.dataset.registryKind === KIND) load().then(() => { if (!A().workplaceState?.rows?.length && perms().length && who().has) refreshList(); else queueChrome(); }); else queueChrome(); }).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind", "hidden"] });
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => queueChrome()).observe(tbody, { childList: true });
  };

  const exportCells = (r) => [r.nr, r.cod, r.denumire, r.descriere, dotDate(r.creat)];
  const fileName = (ext) => window.GEAPObjectId?.exportName?.("Permisiuni", ext) || `Permisiuni.${ext}`;
  function download(blob, name) {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /* a real .xlsx (one sheet, inline strings) — a stored ZIP, no library */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (bytes) => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i += 1) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff];
    const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
    files.forEach(([name, text]) => {
      const nameBytes = enc.encode(name);
      const data = enc.encode(text);
      const crc = crc32(data);
      const head = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)];
      parts.push(new Uint8Array(head), nameBytes, data);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameBytes);
      offset += head.length + nameBytes.length + data.length;
    });
    const size = central.reduce((s, b) => s + b.length, 0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function xlsx(head, lines) {
    const x = (v) => esc(v).replace(/&#39;/g, "&apos;");
    const col = (i) => String.fromCharCode(65 + i);
    const row = (cells, r) => `<row r="${r}">${cells.map((v, i) => `<c r="${col(i)}${r}" t="inlineStr"${r === 1 ? ' s="1"' : ""}><is><t xml:space="preserve">${x(v)}</t></is></c>`).join("")}</row>`;
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="32" customWidth="1"/><col min="3" max="3" width="36" customWidth="1"/><col min="4" max="4" width="70" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/></cols><sheetData>${[head, ...lines].map((c, i) => row(c, i + 1)).join("")}</sheetData></worksheet>`;
    return zip([
      ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Permisiuni" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ["xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>'],
      ["xl/worksheets/sheet1.xml", sheet]
    ]);
  }
  function exportList(format) {
    const me = who();
    if (!me.has) { A().showShellToast?.(DENIED, "error"); return; } /* AC-20: checked on every request */
    const rows = A().getVisibleRows?.() || [];
    if (!rows.length) return;
    const head = COLS.map(([, label]) => label);
    const lines = rows.map(exportCells);
    const name = fileName(format);
    if (format === "xlsx") download(xlsx(head, lines), name);
    else {
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      download(new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" }), name);
    }
    window.GEAPEventTimeline?.log?.({ at: nowIso(), user: me.name, role: me.role, type: "Export", status: "Reușit", detail: `Lista permisiunilor · ${plural(rows.length, "rând exportat", "rânduri exportate")} · ${format.toUpperCase()}` }, { module: "AdminPortal", objectType: "Permisiune", objectId: NAV });
    A().showShellToast?.(`Am exportat ${plural(rows.length, "permisiune", "permisiuni")} în ${name}.`, "success");
  }

  /* ---------------------------------------------------------------- details drawer (US-394) */
  let drawer = null;
  const D = { id: null, draft: null, error: false };
  function ensureDrawer() {
    if (drawer) return drawer;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="drawer-overlay" data-perm-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-perm-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="perm-d-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="perm-d-title" data-perm-d-title></h2>
              <p class="drawer__subtitle">Permisiune</p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-perm-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body e-permits-perm-drawer" data-perm-d-body></div>
          <footer class="drawer__footer"><div class="modal-buttons">
            <button class="btn btn-neutral btn-rounded" type="button" data-perm-close>Anulează</button>
            <button class="btn btn-primary btn-rounded" type="button" data-perm-save>Salvează</button>
          </div></footer>
        </aside>
      </div>`);
    drawer = document.querySelector("[data-perm-drawer]");
    return drawer;
  }
  const dirty = () => { const p = permOf(D.id); return Boolean(p && D.draft && LANGS.some(([k]) => (D.draft[k] || "") !== (p.descriere?.[k] || ""))); };
  function syncSave() {
    const btn = drawer?.querySelector("[data-perm-save]");
    if (!btn) return;
    if (dirty()) { btn.removeAttribute("aria-disabled"); delete btn.dataset.tooltipReason; }
    else { btn.setAttribute("aria-disabled", "true"); btn.dataset.tooltipReason = "Modifică descrierea ca să o poți salva."; }
  }
  const textarea = (key, label, value) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label for="perm-desc-${key}">${esc(label)}</label>
      <div class="e-permits-fo-textarea"><textarea id="perm-desc-${key}" rows="3" maxlength="${DESC_MAX}"${key === "ro" ? ' placeholder="Ex. Ce acțiune permite și unde se aplică."' : ""} data-perm-desc="${key}" data-clas-count-max="${DESC_MAX}">${esc(value)}</textarea></div>
      <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span></span><span class="e-permits-ntpl-count__value" data-clas-count>${value.length}/${DESC_MAX}</span></p>
    </div>`;
  /* perm-roles-pills-v1 (user 2026-11-20): Roluri = grey round pills that wrap, each with the role switcher's icon
     avatar (brand, xs 24); an inactive role = muted avatar + „Inactiv” in its name */
  const roleIconOf = (r) => `icon-${S.icons?.get(String(r.name).toLowerCase()) || "user-account"}`;
  const rolePill = (r) => `
          <li class="e-permits-perm-roles__pill${r.active ? "" : " is-inactive"}">
            <span class="avatar avatar--xs avatar--icon e-permits-perm-roles__avatar" aria-hidden="true"><svg class="icon" width="16" height="16"><use href="assets/icons/sprite.svg#${roleIconOf(r)}"></use></svg></span>
            <span class="e-permits-perm-roles__name">${esc(r.name)}</span>${r.active ? "" : `<span class="e-permits-perm-roles__state">· Inactiv</span>`}
          </li>`;
  function renderDetails() {
    const p = permOf(D.id);
    if (!p || !drawer) return;
    const names = catalogName();
    const name = names.get(p.id) || p.cod;
    const roles = rolesOf(p);
    const none = !LANGS.some(([k]) => (p.descriere?.[k] || "").trim());
    const mod = p.modificat;
    drawer.querySelector("[data-perm-d-title]").textContent = name;
    const dash = '<span class="e-permits-workplace__dash">—</span>';
    drawer.querySelector("[data-perm-d-body]").innerHTML = `
      ${A().renderPassportBlock?.("Date generale", [
        ["ID", esc(p.nr)],
        ["Cod", esc(p.cod)],
        ["Denumire", esc(name)],
        ["Data creării", esc(longDate(p.creat))],
        ["Modificat de", mod ? esc(mod.de) : dash],
        ["Modificat la", mod ? esc(`${longDate(mod.la)}, ${timeOf(mod.la)}`) : dash]
      ]) || ""}
      <section class="e-permits-dosar-profil__section e-permits-perm-desc" aria-labelledby="perm-desc-title">
        <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title" id="perm-desc-title">Descriere</h2></div>
        <div class="e-permits-perm-desc__body">
          ${D.error ? A().renderNotice?.("error", esc(SAVE_ERROR), { role: "alert" }) || "" : none ? A().renderNotice?.("warning", "Permisiunea nu are descriere. Scrie ce permite, ca administratorii să știe ce acordă unui rol.") || "" : ""}
          <div class="e-permits-user-create__grid">${LANGS.map(([k, label]) => textarea(k, label, D.draft[k] || "")).join("")}</div>
        </div>
      </section>
      <section class="e-permits-dosar-profil__section e-permits-perm-roles" aria-labelledby="perm-roles-title">
        <div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title" id="perm-roles-title">Roluri</h2><span class="e-permits-perm-roles__meta">${esc(plural(roles.length, "rol", "roluri"))}</span></div>
        ${roles.length ? `<ul class="e-permits-perm-roles__list">${roles.map(rolePill).join("")}</ul>` : `<p class="e-permits-perm-roles__empty">Niciun rol nu folosește această permisiune.</p>`}
      </section>`;
    syncSave();
  }
  function openDetails(key) {
    const p = permOf(key);
    if (!p || !who().has) return;
    ensureDrawer();
    D.id = p.id;
    D.error = false;
    D.draft = { ...{ ro: "", ru: "", en: "" }, ...(p.descriere || {}) };
    renderDetails();
    drawer.querySelector("[data-perm-d-body]").scrollTop = 0;
    A().writeHash?.(`#${NAV}/${p.nr}`);
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(drawer, { focus: drawer.querySelector(".drawer") }); else drawer.hidden = false;
  }
  function closeDetails(force = false) {
    if (!drawer || drawer.hidden) return;
    const done = () => { D.id = null; D.draft = null; D.error = false; if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer); else drawer.hidden = true; A().restorePageHash?.(); };
    /* AC-11: leaving without saving keeps the previous description — asked first, as every edit drawer */
    if (!force && dirty()) {
      A().askConfirm?.({ title: "Renunți la modificări?", text: "Descrierea rămâne cea salvată anterior.", confirmLabel: "Renunță la modificări", destructive: true, cancelLabel: "Continuă editarea" }, done);
      return;
    }
    done();
  }
  function save() {
    const p = permOf(D.id);
    const me = who();
    if (!p || !dirty()) return;
    if (!me.has) { A().showShellToast?.(DENIED, "error"); return; } /* US-394 AC-02 */
    if (demo.has("eroare")) { D.error = true; renderDetails(); drawer.querySelector("[data-perm-desc]")?.focus(); return; } /* AC-12: the text stays */
    const before = { ...(p.descriere || {}) };
    p.descriere = LANGS.reduce((o, [k]) => ({ ...o, [k]: (D.draft[k] || "").trim() }), {});
    p.modificat = { de: me.name, la: nowIso() };
    D.draft = { ...p.descriere };
    D.error = false;
    const diff = LANGS.filter(([k]) => (before[k] || "") !== p.descriere[k]).map(([k]) => `${k.toUpperCase()}: „${before[k] || "—"}” → „${p.descriere[k] || "—"}”`).join(" · ");
    window.GEAPEventTimeline?.log?.({ at: p.modificat.la, user: me.name, role: me.role, type: "Editare", status: "Reușit", detail: `Permisiunea ${p.nr} · ${diff}` }, { module: "AdminPortal", objectType: "Permisiune", objectId: p.nr });
    /* as every BO edit drawer (classifier value, user): saved → the drawer closes, the list shows the new description at
       once (AC-10) and the success toast confirms (the toast layer sits under an open drawer) */
    closeDetails(true);
    refreshList();
    A().showShellToast?.(SAVED, "success");
  }

  /* ---------------------------------------------------------------- events */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    const fmt = t.closest("[data-perm-export-format]");
    if (fmt) { exportList(fmt.dataset.permExportFormat); return; }
    const trig = t.closest("[data-perm-export-trigger]");
    if (trig?.getAttribute("aria-disabled") === "true") { event.stopImmediatePropagation(); return; }
    if (t.closest("[data-perm-close]")) { closeDetails(); return; }
    const sv = t.closest("[data-perm-save]");
    if (sv) { if (sv.getAttribute("aria-disabled") !== "true") save(); }
  }, true);
  document.addEventListener("input", (event) => {
    const area = event.target.closest?.("[data-perm-desc]");
    if (!area || !D.draft) return;
    D.draft[area.dataset.permDesc] = area.value;
    syncSave();
  });
  /* Escape = GEAPDrawer clicks the header × → closeDetails (its unsaved-changes confirm included) */

  /* ---------------------------------------------------------------- menu, routes, denied (US-393 AC-01…03) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Ecranul „Permisiuni” este disponibil Administratorului central și Administratorului local căruia i s-a acordat permisiunea.", icon: "lock" }) || DENIED);
    const me = who();
    window.GEAPEventTimeline?.log?.({ at: nowIso(), user: me.name, role: me.role, type: "Acces ecran Permisiuni", status: "Refuzat", detail: "Acces refuzat: rolul nu are permisiunea de gestionare a permisiunilor." }, { module: "AdminPortal", objectType: "Ecran", objectId: NAV });
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    const m = /^#permisiuni(?:\/([^/]+))?$/.exec(h || "");
    if (!m) return false;
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
    load().then(() => {
      if (!nav || !who().has) { showDenied(); return; }
      nav.click();
      if (m[1]) setTimeout(() => openDetails(decodeURIComponent(m[1])), 300);
    });
    return true;
  });
  /* the menu item only for the roles that hold the permission (a local administrator only when granted) */
  const installNavHook = () => {
    const prev = window.GEAPShellNavHook;
    if (prev?.permWrapped) return;
    const hook = (profileKey, groups) => {
      const out = prev ? prev(profileKey, groups) : groups;
      const roleId = profileKey === "central-admin" || profileKey === "local-admin" ? profileKey : "";
      if (grantedTo(roleId)) return out;
      return (out || []).map((g) => ({ ...g, items: (g.items || []).filter((i) => i.id !== NAV) })).filter((g) => g.items.length);
    };
    hook.permWrapped = true;
    window.GEAPShellNavHook = hook;
    A().refreshNav?.();
  };
  const boot = () => {
    installNavHook();
    load();
    observeRegistry();
    new MutationObserver(() => observeRegistry()).observe(document.body, { childList: true, subtree: false });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for the demo states */
  window.GEAPPermisiuni = { load, openDetails, closeDetails, perms, rolesOf, refreshList, who };
})();
