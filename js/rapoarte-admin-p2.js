/* =====================================================================================
   Administrare › Rapoarte — PART 2 (rpt-v2, 2026-11-09) — Feature 96502 „Constructor de rapoarte”, child stories
   US-469 Publicarea · US-470 Dezactivarea / activarea · US-471 Istoricul versiunilor și restaurarea + the Feature's
   access grants („per Rol și, opțional, per Autoritate, ca la registre”), the clone („prin alegerea raportului sursă”)
   and the audit records („fiecare operație … în Jurnalul de audit”). Plugs into `window.GEAPRapoarte.hooks` (part 1,
   js/rapoarte-admin.js): publish · headerActions · headerMenu · rowMenu · versionsTab · accessTab · historyTab.

   No new component — the widget / KPI / Registre patterns:
     · publish / restore / version / grant = the library dialog (`GEAPRegistre.openModal`, kinds rpt-publish ·
       rpt-restore · rpt-version · rpt-grant); the changes = the widget „Modificări (N)” stacked list (`.e-permits-wid-changes`
       + `.e-permits-event-diff`); „Ce s-a schimbat” = the library textarea, required;
     · Versiuni / Istoric = `GEAPEventTimeline` (an entry opens its version window / its unique-journal record);
     · Acces = the Registre access tab (`.e-permits-reg-access` + `.e-permits-reg-table__table--access`) in the RAP flat
       table look of the preview (`.e-permits-rpt-table-wrap` + `.e-permits-rpt-table`), lone grey trash → askConfirm, the grant dialog = the Registre „Acordă acces” form (Autoritate optional, roles = renderCheckOption);
     · Dezactivează (red by label) / Activează = the widget status pair, askConfirm destructive for Dezactivează.
   Interpretations (components.md › Rapoarte › Open for PO / BA): a grant without authority = every authority of the
   report (all authorities for a Global one); a copy does not take the source's access grants or versions; a local user
   manages access only on his own authority's report (a global / shared report = read-only, as its configuration).
   ===================================================================================== */
(function () {
  "use strict";

  const R = () => window.GEAPRapoarte;
  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (v) => { const d = v ? new Date(v) : null; return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const time = (v) => { const d = v ? new Date(v) : null; return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const demo = new Set(String(new URLSearchParams(window.location.search).get("raport") || "").split(",").map((s) => s.trim()).filter(Boolean));
  const SAVE_FAILED = "Raportul nu a putut fi salvat.";
  const NOTE_MAX = 500;

  const nameOf = (r) => r.config.names.ro;
  const st = () => R().state();
  const profileOf = () => (st().id && !st().isNew ? R().get(st().id) : null);
  const activeGrants = (r) => r.grants.filter((g) => !g.revokedAt);
  const roleLabel = (id) => R().roles().find((x) => x.id === id)?.label || id;
  const authLong = (id) => R().authorities().find((a) => a.id === id)?.long || "";
  /* after a status / version change: the profile shows the stored configuration again */
  function refreshAll(r) {
    const s = st();
    if (r && s.id === r.id && !s.isNew) { s.draft = clone(r.config); s.base = clone(r.config); s.errors = {}; }
    R().rerender();
    R().refreshList();
  }

  /* ---------------------------------------------------------------- the changes between two configurations
     (the widget „Modificări (N)” list: label · previous value struck through → new value) */
  const strip = (html) => String(html || "").replace(/<[^>]+>/g, "").trim() || "—";
  function diffRows(a, b) {
    const ra = R().configRows(a);
    const rb = R().configRows(b);
    const out = [];
    ["general", "structure"].forEach((g) => {
      const mb = new Map(rb[g]);
      ra[g].forEach(([l, va]) => { if (strip(va) !== strip(mb.get(l))) out.push({ label: l, before: strip(va), after: strip(mb.get(l)) }); });
    });
    /* columns: keyed by name (the „N. ” position prefix dropped); order separately */
    const cols = (rows) => new Map(rows.filter(([l]) => /^\d+\. /.test(l)).map(([l, v]) => [l.replace(/^\d+\. /, ""), strip(v)]));
    const ca = cols(ra.columns);
    const cb = cols(rb.columns);
    ca.forEach((v, k) => { if (!cb.has(k)) out.push({ label: `Coloana „${esc(k)}”`, before: v, after: "—" }); else if (cb.get(k) !== v) out.push({ label: `Coloana „${esc(k)}”`, before: v, after: cb.get(k) }); });
    cb.forEach((v, k) => { if (!ca.has(k)) out.push({ label: `Coloana „${esc(k)}”`, before: "—", after: v }); });
    const order = (m) => [...m.keys()].join(" · ");
    const common = (m, o) => [...m.keys()].filter((k) => o.has(k));
    if (common(ca, cb).join("|") !== common(cb, ca).join("|")) out.push({ label: "Ordinea coloanelor", before: esc(order(ca)), after: esc(order(cb)) });
    return out;
  }
  const diffHtml = (c) => (c.before === "—" ? `<strong>${c.after}</strong>`
    : c.after === "—" ? `<span class="e-permits-event-diff__before">${c.before}</span>`
    : `<span class="e-permits-event-diff"><span class="e-permits-event-diff__before">${c.before}</span><span aria-hidden="true">→</span><span class="u-visually-hidden">devine</span><strong>${c.after}</strong></span>`);
  const changesList = (changes) => A().renderStackedList?.(`Modificări (${changes.length})`, [{ label: "", items: changes.map((c) => ({ plainTitle: strip(c.label), title: c.label, meta: [diffHtml(c)] })) }], { className: "e-permits-wid-changes" }) || "";

  /* „Ce s-a schimbat” — the library textarea, required, counter 500 (the widget publish / restore note) */
  function noteField(id, value, placeholder) {
    const n = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">Ce s-a schimbat${R().ui.req()}</label>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" maxlength="${NOTE_MAX}" aria-required="true" aria-describedby="${id}-hint" placeholder="${esc(placeholder)}" spellcheck="true" data-rpt-note>${esc(value)}</textarea></div>
        <p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>Apare în istoricul versiunilor.</span><span class="e-permits-ntpl-count__value" data-rpt-note-count>${n}/${NOTE_MAX}</span></p>
      </div>`;
  }
  function noteError(field, message) {
    if (!field) return;
    const box = field.closest(".e-permits-fo-textarea");
    const wrap = field.closest(".e-permits-fo-field");
    box?.classList.add("is-error");
    field.setAttribute("aria-invalid", "true");
    wrap.querySelector(".e-permits-fo-field__error")?.remove();
    wrap.querySelector(".e-permits-fo-field__hint")?.setAttribute("hidden", "");
    wrap.insertAdjacentHTML("beforeend", R().ui.errorHtml(field.id, message));
    field.setAttribute("aria-describedby", `${field.id}-error`);
    field.focus();
    field.addEventListener("input", () => {
      box?.classList.remove("is-error"); field.removeAttribute("aria-invalid");
      wrap.querySelector(".e-permits-fo-field__error")?.remove(); wrap.querySelector(".e-permits-fo-field__hint")?.removeAttribute("hidden");
      field.setAttribute("aria-describedby", `${field.id}-hint`);
    }, { once: true });
  }
  const modalFooter = (label, attrs, { disabledReason = "" } = {}) => `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" ${attrs}${disabledReason ? ` aria-disabled="true" data-tooltip-reason="${esc(disabledReason)}"` : ""}>${esc(label)}</button></div>`;

  /* ================================================================ US-469 Publicarea
     problems block it (the same list as the review step); otherwise version + 1, the report becomes Publicat */
  let publishing = null;
  function pubSubject() {
    const s = st();
    const r = publishing.id ? R().get(publishing.id) : null;
    const v = publishing.isNew || (r && R().editable(r)) ? s.draft : r.config;
    return { r, v };
  }
  function openPublish({ isNew = false } = {}) {
    const s = st();
    if (!s.draft && !s.id) return;
    publishing = { id: isNew ? null : s.id, isNew };
    renderPublish("");
  }
  function renderPublish(note) {
    const { r, v } = pubSubject();
    const problems = R().publishProblems(v);
    const cur = r ? R().lastVersion(r) : null;
    const next = (cur?.version || 0) + 1;
    const changes = cur ? diffRows(cur.config, v) : [];
    const noAccess = !r || !activeGrants(r).length;
    G().openModal?.({
      kind: "rpt-publish",
      title: "Publicare raport",
      subtitle: v.names.ro || "Raport nou",
      body: `
        ${problems.length
          ? U().renderNotice?.("error", `<strong>Raportul nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
          : U().renderNotice?.("info", cur
            ? `<strong>Versiunea ${next} o înlocuiește pe versiunea ${esc(String(cur.version))}.</strong> ${changes.length ? "Rapoartele generate de acum folosesc noua versiune; cele generate deja nu se modifică." : "Configurația este aceeași ca în versiunea în vigoare."}`
            : `<strong>Prima publicare: versiunea ${next}.</strong> Raportul apare în meniul «Rapoarte» al rolurilor cu acces.${noAccess ? " Acordă apoi accesul din tabul «Acces»." : ""}`) || ""}
        ${!problems.length && changes.length ? changesList(changes) : ""}
        <div class="e-permits-user-create__grid">${noteField("rpt-publish-note", note, cur ? "De exemplu „Adăugată durata medie de procesare”" : "De exemplu „Prima versiune”")}</div>`,
      footer: modalFooter("Publică", "data-rpt-publish-confirm", { disabledReason: problems.length ? "Rezolvă mai întâi problemele de mai sus." : "" })
    });
  }
  function confirmPublish(button) {
    if (!publishing) return;
    const { r: r0, v } = pubSubject();
    if (button.getAttribute("aria-disabled") === "true") { if (r0) R().audit(r0, "rejected", R().publishProblems(v).join(" ")); return; }
    const field = document.querySelector("#rpt-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { noteError(field, "Descrie ce s-a schimbat."); return; }
    if (demo.has("eroare")) { G().closeModal?.(); publishing = null; toast(SAVE_FAILED, "error"); return; }
    /* a new report / unsaved edits are saved first (silently: one toast for the whole operation) */
    const r = publishing.isNew || (r0 && R().editable(r0) && R().dirty()) ? R().save({ silent: true }) : r0;
    if (!r) { G().closeModal?.(); publishing = null; return; }
    const next = (R().lastVersion(r)?.version || 0) + 1;
    r.versions.push({ nr: r.versions.length + 1, version: next, type: next === 1 ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: clone(r.config) });
    r.status = "Publicat";
    R().audit(r, "publish", `Versiunea ${next} · ${note}`);
    publishing = null;
    G().closeModal?.();
    toast(`Versiunea ${next} a raportului „${nameOf(r)}” a fost publicată.`);
    R().openProfile(r.id, "configurare", { push: false }).then(() => refreshAll(r));
  }

  /* ================================================================ US-470 Dezactivarea / activarea
     nothing is deleted (Feature constraints): configuration, versions and access stay; reports generated earlier keep */
  function setStatus(r, on) {
    if (!r || !R().canEdit(r)) return;
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      r.status = on ? (r.versions.length ? "Publicat" : "Ciornă") : "Dezactivat";
      R().audit(r, on ? "on" : "off");
      toast(on ? `Raportul „${nameOf(r)}” a fost activat.` : `Raportul „${nameOf(r)}” a fost dezactivat.`);
      refreshAll(r);
    };
    if (on) { apply(); return; }
    const where = r.config.level === "Global" ? "al tuturor autorităților" : `al ${r.config.authorities.map(R().authName).join(", ")}`;
    U().askConfirm?.({
      title: `Dezactivezi raportul „${nameOf(r)}”?`,
      text: `Raportul dispare din meniul «Rapoarte» ${where} și nu se mai generează. Nimic nu se șterge: configurația, versiunile și accesul se păstrează, iar rapoartele generate deja nu se modifică. Îl poți activa oricând.`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, apply);
  }

  /* ---------------------------------------------------------------- the menus (row ⋮ + profile header ⋮)
     Clonează for anyone who creates (a global report is cloned at the user's authority); Dezactivează (red by label) /
     Activează for the one who manages the report */
  function menuItems(r, ctx, prefix) {
    return [
      ctx.canCreate && { label: "Clonează", icon: "copy", attrs: `data-rpt-${prefix}clone="${esc(r.id)}"` },
      ctx.canEdit && (r.status === "Dezactivat"
        ? { label: "Activează", icon: "rotate-arrow", attrs: `data-rpt-${prefix}toggle="${esc(r.id)}"` }
        : { label: "Dezactivează", icon: "pause", attrs: `data-rpt-${prefix}toggle="${esc(r.id)}"` })
    ].filter(Boolean);
  }

  /* ================================================================ US-471 Versiuni: list · version window · restore */
  const versionOf = (r, nr) => r.versions.find((v) => String(v.nr) === String(nr)) || null;
  function versionsTab(r) {
    const cur = R().lastVersion(r);
    const list = [...r.versions].reverse();
    const events = list.map((v) => ({
      at: v.at, user: v.by, status: "Reușit", detail: v.note,
      type: `Versiunea ${v.version}${v.nr === cur.nr ? " · curentă" : ""}${/^Restaurare/.test(v.type) ? ` · ${v.type.toLocaleLowerCase("ro")}` : ""}`
    }));
    return `
      ${list.length ? U().renderInfoNote?.(`Rapoartele se generează din ultima versiune publicată: <strong>${esc(String(cur.version))}</strong>. Fiecare publicare crește versiunea cu 1; restaurarea publică o versiune nouă cu configurația celei alese.`) || "" : ""}
      ${window.GEAPEventTimeline?.html("Versiuni publicate", events, { meta: list.length ? plural(list.length, "versiune", "versiuni") : "", empty: "Raportul nu a fost publicat încă.", openAttrs: (item, i) => `data-rpt-ver-view="${list[i].nr}" aria-haspopup="dialog"` }) || ""}`;
  }
  function openVersion(nr) {
    const r = profileOf();
    const v = r && versionOf(r, nr);
    if (!v) return;
    const isCurrent = v.nr === R().lastVersion(r).nr;
    const canRestore = !isCurrent && R().canEdit(r) && r.status !== "Dezactivat";
    G().openModal?.({
      kind: "rpt-version",
      title: `Versiunea ${v.version}${isCurrent ? " · curentă" : ""}`,
      subtitle: nameOf(r),
      body: `
        <div class="e-permits-dosar-profil__card">${[["Tipul modificării", esc(v.type)], ["Data", esc(`${longDate(v.at)}, ${time(v.at)}`)], ["Autor", esc(v.by)], ["Ce s-a schimbat", esc(v.note)]].map((row) => G().detailRow?.(row) || "").join("")}</div>
        ${R().cardHtml(v.config)}
        ${R().readBlocks(v.config)}`,
      footer: `<div class="modal-buttons">${canRestore ? `<button class="btn btn-neutral btn-rounded" type="button" data-rpt-ver-restore="${v.nr}">${icon("rotate-arrow")}<span>Restaurează</span></button>` : ""}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
    document.querySelector("#case-action-modal .modal")?.classList.replace("modal--md", "modal--lg");
  }
  let restoring = null;
  function openRestore(nr) {
    const r = profileOf();
    const v = r && versionOf(r, nr);
    if (!v || !R().canEdit(r)) return;
    restoring = { id: r.id, nr: v.nr };
    const next = R().lastVersion(r).version + 1;
    const changes = diffRows(R().lastVersion(r).config, v.config);
    const loses = R().unpublished(r) || R().dirty();
    G().openModal?.({
      kind: "rpt-restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: nameOf(r),
      body: `
        ${U().renderNotice?.(loses ? "warning" : "info", `<strong>Versiunea ${next} reia configurația versiunii ${v.version}.</strong> Rapoartele se generează din ea imediat după restaurare.${loses ? " Modificările nepublicate se pierd." : ""}`) || ""}
        ${changes.length ? changesList(changes) : ""}
        <div class="e-permits-user-create__grid">${noteField("rpt-restore-note", "", "De ce revii la această versiune")}</div>`,
      footer: modalFooter("Restaurează", "data-rpt-restore-confirm")
    });
  }
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#rpt-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { noteError(field, "Descrie ce s-a schimbat."); return; }
    const r = R().get(restoring.id);
    const v = versionOf(r, restoring.nr);
    restoring = null;
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    const next = R().lastVersion(r).version + 1;
    r.config = clone(v.config);
    r.versions.push({ nr: r.versions.length + 1, version: next, type: `Restaurare (din versiunea ${v.version})`, note, at: nowIso(), by: userName(), config: clone(v.config) });
    r.status = "Publicat";
    R().audit(r, "restore", `Versiunea ${v.version} → versiunea ${next} · ${note}`);
    G().closeModal?.();
    refreshAll(r);
    toast(`Versiunea ${v.version} a fost restaurată ca versiunea ${next}.`);
  }

  /* ================================================================ Acces (Feature: „per Rol și, opțional, per Autoritate,
     ca la registre”; „o acordare fără autoritate dă acces în toate autoritățile”) — the Registre access tab */
  const canGrant = (r) => R().canEdit(r);
  const allAuthText = (r) => (r.config.level === "Global" ? "Toate autoritățile" : "Toate autoritățile raportului");
  function accessTab(r) {
    const list = activeGrants(r);
    const add = canGrant(r) ? `<button class="btn btn-secondary btn-sm" type="button" data-rpt-grant>${icon("plus-large", 16)}<span>Acordă acces</span></button>` : "";
    const rows = list.map((g) => `
      <tr>
        <td><span data-cell-tooltip="${esc(roleLabel(g.role))}">${esc(roleLabel(g.role))}</span></td>
        <td>${g.authority ? `<span data-tooltip-text="${esc(authLong(g.authority))}">${esc(R().authName(g.authority))}</span>` : esc(allAuthText(r))}</td>
        <td>${A().renderDateTime?.(g.at) || esc(`${longDate(g.at)}, ${time(g.at)}`)}</td>
        <td><span data-cell-tooltip="${esc(g.by)}">${esc(g.by)}</span></td>
        <td class="e-permits-reg-table__action">${canGrant(r) ? `<button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Retrage accesul: ${esc(roleLabel(g.role))}, ${esc(g.authority ? R().authName(g.authority) : allAuthText(r).toLocaleLowerCase("ro"))}" data-tooltip-label="Retrage accesul" data-rpt-revoke="${esc(g.id)}">${icon("delete", 16)}</button>` : ""}</td>
      </tr>`).join("");
    const note = [
      "Accesul intră în vigoare imediat și nu face parte din versiunea raportului. Un rol fără autoritate are acces în toate autoritățile raportului.",
      r.status === "Ciornă" ? " Raportul apare în meniul «Rapoarte» al acestor roluri după prima publicare." : "",
      r.status === "Dezactivat" ? " Raportul este dezactivat: nu apare în meniu nici pentru rolurile cu acces." : "",
      !canGrant(r) ? " Accesul la acest raport îl gestionează Administratorul central." : ""
    ].join("");
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Acces</h2>
          <div class="e-permits-passport__heading-tools">
            <span class="e-permits-dosar-profil__section-meta">${esc(plural(list.length, "acordare", "acordări"))}</span>
            ${list.length ? add : ""}
          </div>
        </div>
        <div class="e-permits-reg-access">
          ${U().renderInfoNote?.(note) || ""}
          ${list.length ? `
            <div class="e-permits-workplace__table-wrap e-permits-rpt-table-wrap">
              <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-reg-table__table--access e-permits-rpt-table">
                <caption class="u-visually-hidden">Acordările de acces ale raportului ${esc(nameOf(r))}</caption>
                <thead><tr><th scope="col">Rol</th><th scope="col">Autoritate</th><th scope="col">Acordat la</th><th scope="col">Acordat de</th><th scope="col"><span class="u-visually-hidden">Acțiuni</span></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>` : window.GEAPEmptyState?.render({ title: "Niciun rol nu are acces", text: "Raportul nu apare în meniul «Rapoarte» al utilizatorilor până nu acorzi acces cel puțin unui rol.", icon: "lock", compact: true, actionHtml: add }) || ""}
        </div>
      </section>`;
  }
  /* „Acordă acces” = the Registre grant form in the library dialog: Autoritate (optional; fixed for a local user) + roles */
  const GR = { id: null, authority: "", roles: [] };
  function grantAuthOptions(r) {
    const all = R().authorities();
    return r.config.level === "Global" ? all : all.filter((a) => r.config.authorities.includes(a.id));
  }
  function openGrant() {
    const r = profileOf();
    if (!r || !canGrant(r)) return;
    const me = R().perms();
    Object.assign(GR, { id: r.id, authority: me.central ? "" : me.authority, roles: [] });
    renderGrant();
  }
  function renderGrant(keep = "") {
    const r = R().get(GR.id);
    const me = R().perms();
    const ui = R().ui;
    const has = (role) => activeGrants(r).some((g) => g.role === role && (g.authority || "") === (GR.authority || ""));
    const authField = me.central
      ? ui.selectField("rpt-grant-auth", "data-rpt-grant-auth", "Autoritate", grantAuthOptions(r).map((a) => [a.id, `${a.name} · ${a.long}`]), GR.authority, { span: 12, placeholder: allAuthText(r), hint: "Lasă gol ca să acorzi rolul în toate autoritățile raportului." })
      : `<div class="e-permits-user-create__field e-permits-user-create__field--12 e-permits-wid-vis-field"><span class="e-permits-cfg-ro__label" id="rpt-grant-auth-label">Autoritate</span><div class="e-permits-cfg-ro" aria-labelledby="rpt-grant-auth-label">${esc(R().authName(me.authority))} · ${esc(authLong(me.authority))}</div></div>`;
    const roles = R().roles().filter((x) => me.central || x.id !== "central-admin");
    G().openModal?.({
      kind: "rpt-grant",
      title: "Acordă acces",
      subtitle: nameOf(r),
      body: `
        <div class="e-permits-user-create__grid">
          ${authField}
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12 e-permits-reg-roles">
            <span class="e-permits-cfg-ro__label" id="rpt-grant-roles-label">Rol${ui.req()}</span>
            <div class="e-permits-check-options" role="group" aria-labelledby="rpt-grant-roles-label">
              ${roles.map((x) => {
                const done = has(x.id);
                return U().renderCheckOption?.({ label: done ? `${x.label} (Acces acordat deja)` : x.label, checked: !done && GR.roles.includes(x.id), disabled: done, reason: done ? "Rolul are deja acces pentru autoritatea aleasă." : "", attrs: `value="${esc(x.id)}" data-rpt-grant-role` }) || "";
              }).join("")}
            </div>
            <p class="e-permits-fo-field__hint" aria-live="polite" data-rpt-grant-count>Selectate: ${GR.roles.length}</p>
          </div>
        </div>`,
      footer: modalFooter("Acordă accesul", "data-rpt-grant-save", { disabledReason: GR.roles.length ? "" : "Alege cel puțin un rol." })
    });
    if (keep) requestAnimationFrame(() => document.querySelector(keep)?.focus({ preventScroll: true }));
  }
  function syncGrantFooter() {
    const btn = document.querySelector("#case-action-modal [data-rpt-grant-save]");
    const count = document.querySelector("#case-action-modal [data-rpt-grant-count]");
    if (count) count.textContent = `Selectate: ${GR.roles.length}`;
    if (!btn) return;
    if (GR.roles.length) { btn.removeAttribute("aria-disabled"); btn.removeAttribute("data-tooltip-reason"); }
    else { btn.setAttribute("aria-disabled", "true"); btn.setAttribute("data-tooltip-reason", "Alege cel puțin un rol."); }
  }
  function saveGrant(button) {
    if (button.getAttribute("aria-disabled") === "true") return;
    const r = R().get(GR.id);
    if (!r) return;
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); return; }
    const authority = GR.authority || null;
    GR.roles.forEach((role) => {
      /* an identical grant revoked earlier is reactivated (Registre AC-18) */
      const old = r.grants.find((g) => g.role === role && (g.authority || null) === authority && g.revokedAt);
      if (old) { delete old.revokedAt; delete old.revokedBy; old.at = nowIso(); old.by = userName(); }
      else r.grants.push({ id: `${r.id}-g${r.grants.length + 1}-${Date.now() % 100000}`, role, authority, at: nowIso(), by: userName() });
      R().audit(r, "grant", `${roleLabel(role)} · ${authority ? R().authName(authority) : allAuthText(r)}`);
    });
    const n = GR.roles.length;
    G().closeModal?.();
    R().rerender();
    toast(`Accesul a fost acordat pentru ${plural(n, "rol", "roluri")}. Intră în vigoare imediat.`);
  }
  function revoke(id) {
    const r = profileOf();
    const g = r?.grants.find((x) => x.id === id);
    if (!g || !canGrant(r)) return;
    const where = g.authority ? R().authName(g.authority) : allAuthText(r).toLocaleLowerCase("ro");
    U().askConfirm?.({
      title: `Retragi accesul rolului „${roleLabel(g.role)}”?`,
      text: `Rolul „${roleLabel(g.role)}” (${where}) nu mai vede raportul „${nameOf(r)}” în meniul «Rapoarte». Rapoartele generate deja nu se modifică.`,
      confirmLabel: "Retrage accesul",
      destructive: true
    }, () => {
      g.revokedAt = nowIso(); g.revokedBy = userName();
      R().audit(r, "revoke", `${roleLabel(g.role)} · ${g.authority ? R().authName(g.authority) : allAuthText(r)}`);
      R().rerender();
      toast(`Accesul rolului „${roleLabel(g.role)}” a fost retras.`);
    });
  }

  /* ================================================================ Istoric = the report's entries of the unique Jurnalul de
     audit (Feature AC „fiecare operație … în Jurnalul de audit”); an entry opens its US-262 record */
  const REJECTED = "Publicare respinsă";
  const journalEvent = (h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === REJECTED ? "Eșuat" : "Reușit", detail: h.detail || "" });
  const versionAt = (r, at) => r.versions.filter((x) => String(x.at || "") <= String(at)).pop()?.version || 0;
  const journalCtx = (r, h) => {
    const v = versionAt(r, h.at);
    return {
      module: "BackOffice",
      authority: r.config.level === "Global" ? "" : r.config.authorities.map(R().authName).join(", "),
      objectType: "Raport",
      objectId: r.id,
      objectVersion: v ? `versiunea ${v}` : "ciornă",
      related: /^(Publicarea|Restaurarea)/.test(h.event) ? [{ module: "Rapoarte", type: "Ultima versiune publicată, folosită la generarea rapoartelor", user: "SIA GEAP" }] : []
    };
  };
  function historyTab(r) {
    const T = window.GEAPEventTimeline;
    const events = r.history.slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === REJECTED ? "Respins" : "Reușit", ...(h.event === REJECTED ? { tone: "danger" } : {}), detail: h.detail || "", context: T?.contextOf?.(T.audit(journalEvent(h), journalCtx(r, h))) }));
    return T?.html("Jurnalul de audit", events, { meta: events.length ? "Cele mai noi primele · Jurnalizat prin MLog" : "", empty: "Pentru acest raport nu s-au înregistrat încă operații.", openAttrs: (item, i) => `data-rpt-event="${i}" aria-haspopup="dialog"` }) || "";
  }
  function openJournal(i) {
    const r = profileOf();
    const h = r?.history[Number(i)];
    if (!h) return;
    const record = window.GEAPEventTimeline.audit(journalEvent(h), journalCtx(r, h));
    A().openAuditEventDetail?.(record, { title: h.event, general: [["Denumirea evenimentului", esc(h.event)], ["Raport", esc(`${r.id} · ${nameOf(r)}`)]] });
  }

  /* ================================================================ the hooks */
  function install() {
    const H = R()?.hooks;
    if (!H) return false;
    H.publish = (draft, ctx = {}) => openPublish({ isNew: Boolean(ctx.isNew) });
    /* max 2 visible header actions (Salvează + Publică), the rest in ⋮ */
    H.headerActions = (r, ctx) => (ctx.editable && (!r.versions.length || R().unpublished(r) || ctx.dirty) ? '<button class="btn btn-primary btn-sm" type="button" data-rpt-publish>Publică</button>' : "");
    H.headerMenu = (r, ctx) => menuItems(r, ctx, "");
    H.rowMenu = (r, ctx) => menuItems(r, ctx, "row-");
    H.versionsTab = versionsTab;
    H.accessTab = accessTab;
    H.historyTab = historyTab;
    return true;
  }
  if (!install()) document.addEventListener("DOMContentLoaded", install, { once: true });

  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest || !R()) return;
    const sheet = t.closest("[data-rpt-editor]");
    if (!sheet && t.closest("[data-rpt-publish]")) { openPublish(); return; }
    const pub = t.closest("[data-rpt-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    const cl = t.closest("[data-rpt-clone], [data-rpt-row-clone]");
    if (cl) { R().openNew({ from: cl.dataset.rptClone || cl.dataset.rptRowClone }); return; }
    const tg = t.closest("[data-rpt-toggle], [data-rpt-row-toggle]");
    if (tg) { const r = R().get(tg.dataset.rptToggle || tg.dataset.rptRowToggle); if (r) setStatus(r, r.status === "Dezactivat"); return; }
    const ver = t.closest("[data-rpt-ver-view]");
    if (ver) { openVersion(ver.dataset.rptVerView); return; }
    const rs = t.closest("[data-rpt-ver-restore]");
    if (rs) { openRestore(rs.dataset.rptVerRestore); return; }
    if (t.closest("[data-rpt-restore-confirm]")) { confirmRestore(); return; }
    if (t.closest("[data-rpt-grant]")) { openGrant(); return; }
    const gs = t.closest("[data-rpt-grant-save]");
    if (gs) { saveGrant(gs); return; }
    const rv = t.closest("[data-rpt-revoke]");
    if (rv) { revoke(rv.dataset.rptRevoke); return; }
    const ev = t.closest("[data-rpt-event]");
    if (ev) openJournal(ev.dataset.rptEvent);
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest || !el.closest("#case-action-modal")) return;
    if (el.matches("[data-rpt-grant-role]")) {
      GR.roles = el.checked ? [...new Set([...GR.roles, el.value])] : GR.roles.filter((x) => x !== el.value);
      syncGrantFooter();
      return;
    }
    if (el.matches("[data-rpt-grant-auth]")) {
      GR.authority = el.value;
      /* roles already granted for the new authority become inactive */
      const r = R().get(GR.id);
      GR.roles = GR.roles.filter((role) => !activeGrants(r).some((g) => g.role === role && (g.authority || "") === (GR.authority || "")));
      renderGrant("#rpt-grant-auth");
    }
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.matches?.("[data-rpt-note]")) return;
    const count = el.closest(".e-permits-fo-field")?.querySelector("[data-rpt-note-count]");
    if (count) count.textContent = `${el.value.length}/${NOTE_MAX}`;
  });
})();
