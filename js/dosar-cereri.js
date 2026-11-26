/* ==========================================================================================================
   GEAPCaseRequests — „Redeschiderea dosarului” + „Radierea dosarului” (red-rad-v1, 2026-11-25)
   Feature 97301 (US-411 97572 solicitarea redeschiderii · US-412 97573 confirmarea redeschiderii) and Feature 97414
   (US-409 97570 solicitarea radierii · US-410 97571 confirmarea radierii). BackOffice only, desktop.
   ONE request model for both, the same flow as „Retragerea cererii” (js/retragere.js — the reason field is shared):
     1. Registru Dosare › ⋮ › „Redeschide” / „Radiază” (registre.js row + card menu, hooks below) → the library dialog
        #case-action-modal: lead naming the dossier (its number stays in the content, „no code in modal header”), the
        required reason (GEAPRetragere.reasonFieldHtml, „Câmpul este obligatoriu.”), Anulează · Trimite → success toast
        „… a fost trimisă spre confirmare.”, the request „În confirmare” (Inițiat de / la), the journal event.
     2. „Sarcinile mele” (shell, Supervizor / Director) = the confirmation tasks (tabs Radiere · Redeschidere) → the task
        dialog (dossier, reason, Inițiat de / la, „Deschide dosarul”) → „Confirmă …” (second dialog: Anulează keeps it
        „În confirmare”, Confirmă applies) or „Respinge” (required „Motivul respingerii”).
     3. Confirmed: redeschidere → statut „Redeschis”, marker „Dosar redeschis”, back to the specialist who examined it at the
        decision step (core/case-flow.js „redeschis” = node6), the issued act „Redeschis” in Registrul actelor permisive;
        radiere → marker „Dosar radiat” (registre `struck`), nothing deleted, linked register records deactivated.
   Rights (registre.js PERMS): reopen / strike = request; confirm-reopen (Supervizor, Director, Administrator central) /
   confirm-strike (Supervizor, Administrator central). Direct calls without the right → „Acces interzis”:
   #registru/reg-dosare/<id>/redeschidere|radiere (registre.js route) · #sarcina/<id> (here).
   Store: registre localStorage `e-permits-registre-v1` › requests { [id]: request } over the SEED below.
   Demo switches (?state= links): red-contestatie=<dossier,…> (an active appeal: Redeschide hidden, confirmation refused).
   ========================================================================================================== */
(function () {
  "use strict";
  if (window.GEAPCaseRequests) return;

  const params = new URLSearchParams(window.location.search);
  const G = () => window.GEAPRegistre || {};
  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const W = () => window.GEAPRetragere || null;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tag = (label, tone, opts) => window.GEAPTag?.html(label, tone, opts) || esc(label);
  const REG = "reg-dosare";
  const MODAL = "#case-action-modal";

  /* ---------------------------------------------------------------- the two kinds */
  const KINDS = {
    reopen: {
      control: "ReopenCase", key: "reopen", route: "redeschidere", perm: "reopen", confirmPerm: "confirm-reopen",
      action: "Redeschide", title: "Redeschiderea dosarului", noun: "redeschiderea", Noun: "Redeschiderea",
      task: "Confirmarea redeschiderii", tab: "redeschidere", field: "Motivul redeschiderii", stateLabel: "Starea redeschiderii",
      marker: "Dosar redeschis", markerTone: "brand", markerIcon: "undo", confirmLabel: "Confirmă redeschiderea",
      placeholder: "De ex. eroare materială în decizie: suprafața încăperilor preluată greșit din cerere"
    },
    strike: {
      control: "StrikeCase", key: "strike", route: "radiere", perm: "strike", confirmPerm: "confirm-strike",
      action: "Radiază", title: "Radierea dosarului", noun: "radierea", Noun: "Radierea",
      task: "Confirmarea radierii", tab: "radiere", field: "Motivul radierii", stateLabel: "Starea radierii",
      marker: "Dosar radiat", markerTone: "danger", markerIcon: "circle-x", confirmLabel: "Confirmă radierea",
      placeholder: "De ex. dosar depus din eroare, dublură a altui dosar"
    }
  };
  const kindOfControl = (control) => Object.values(KINDS).find((k) => k.control === control) || null;
  const STATES = { confirmare: ["În confirmare", "warning"], confirmata: ["Confirmată", "success"], respinsa: ["Respinsă", "danger"] };
  const stateTag = (state) => tag(STATES[state]?.[0] || state, STATES[state]?.[1] || "neutral");

  /* ---------------------------------------------------------------- seed (CSP Chișinău = the supervisor's perimeter) */
  /* pending: a reopen asked by a specialist (eliberat), one created by SIA GEAP at an approved appeal (US-412 AC-04, respins),
     two strikes (în examinare, așteaptă plata) · decided: a confirmed strike (marker „Dosar radiat”, US-409 AC-05) and a
     rejected reopen (the dossier stays „Eliberat” and can be asked again, US-412 AC-18) */
  const SEED = [
    { id: "S-2026-000412", kind: "reopen", caseId: "D-2026-004719", state: "confirmare", at: "2026-11-23T10:14:00", by: "Stela Bradu", role: "Specialist",
      reason: "Eroare materială în actul emis: suprafața încăperilor a fost preluată greșit din cerere (48 m² în loc de 84 m²)." },
    { id: "S-2026-000415", kind: "reopen", caseId: "D-2026-004734", state: "confirmare", at: "2026-11-24T16:02:00", by: "SIA GEAP", role: "Sistem",
      reason: "Contestație aprobată în baza dosarului D-2026-004802", appeal: "D-2026-004802" },
    { id: "S-2026-000409", kind: "strike", caseId: "D-2026-004566", state: "confirmare", at: "2026-11-22T09:40:00", by: "Mihai Grosu", role: "Specialist",
      reason: "Dosar depus din eroare, dublură a dosarului D-2026-004559 (aceeași cerere, înregistrată de două ori la ghișeu)." },
    { id: "S-2026-000411", kind: "strike", caseId: "D-2026-004507", state: "confirmare", at: "2026-11-24T11:25:00", by: "Tamara Bragagiu", role: "Specialist",
      reason: "Solicitantul a decedat; moștenitorii au confirmat în scris că nu continuă procedura." },
    { id: "S-2026-000398", kind: "strike", caseId: "D-2026-004561", state: "confirmata", at: "2026-11-12T14:05:00", by: "Andrei Lazăr", role: "Specialist",
      reason: "Societatea solicitantă a fost radiată din Registrul de stat al persoanelor juridice.",
      decidedAt: "2026-11-13T09:30:00", decidedBy: "Elena Caragia", decidedRole: "Supervizor" },
    { id: "S-2026-000401", kind: "reopen", caseId: "D-2026-004713", state: "respinsa", at: "2026-11-10T15:20:00", by: "Stela Bradu", role: "Specialist",
      reason: "Solicitantul a cerut corectarea adresei din act.",
      decidedAt: "2026-11-11T08:45:00", decidedBy: "Elena Caragia", decidedRole: "Supervizor",
      rejectReason: "Corectarea adresei se face prin reperfectarea actului, nu prin redeschiderea dosarului." }
  ];

  /* ---------------------------------------------------------------- requests */
  const store = () => G().store?.() || {};
  function all() {
    const own = store().requests || {};
    const map = new Map(SEED.map((r) => [r.id, r]));
    Object.values(own).forEach((r) => map.set(r.id, { ...(map.get(r.id) || {}), ...r }));
    return [...map.values()];
  }
  const ofCase = (caseId, kind) => all().filter((r) => r.caseId === caseId && (!kind || r.kind === kind)).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const latest = (caseId, kind) => ofCase(caseId, kind)[0] || null;
  const pending = (caseId, kind) => ofCase(caseId, kind).find((r) => r.state === "confirmare") || null;
  const confirmed = (caseId, kind) => ofCase(caseId, kind).find((r) => r.state === "confirmata") || null;
  const byId = (id) => all().find((r) => r.id === id) || null;
  function save(req) {
    const st = store();
    st.requests = st.requests || {};
    st.requests[req.id] = req;
    G().save?.();
  }

  /* ---------------------------------------------------------------- dossier facts */
  const caseRow = (caseId) => (A().dossierStore?.()?.runtimeRows || []).find((r) => r.id === caseId) || null;
  const statuses = () => A().dossierStore?.()?.statuses || {};
  const statusTag = (status) => tag(statuses()[status]?.label || status, statuses()[status]?.tone || "neutral");
  const appealIds = () => (params.get("red-contestatie") || "").split(",").map((v) => v.trim()).filter(Boolean);
  const hasAppeal = (caseId) => appealIds().includes(caseId);
  const archived = (row) => row.src?.status === "arhivat" || (row.arhStare !== undefined && row.arhStare !== "Activ");
  const FINISHED = ["eliberat", "respins"];

  /* US-411 AC-03…06 · US-409 AC-03…06: hidden (never disabled) when the rule says „nu apare” */
  function visible(action, row) {
    const k = kindOfControl(action.control);
    if (!k) return undefined;
    const st = row.src?.status;
    if (archived(row) || row.struck) return false;
    if (k.key === "reopen") return FINISHED.includes(st) && !hasAppeal(row.id) && !pending(row.id, "reopen");
    /* „orice statut, cu excepția dosarelor la care actul semnat a fost deja emis” = Eliberat */
    return st !== "eliberat" && !pending(row.id, "strike");
  }
  const actionState = (action) => (kindOfControl(action.control) ? "" : undefined);

  /* ---------------------------------------------------------------- markers + cards */
  const isStruck = (caseId) => Boolean(confirmed(caseId, "strike"));
  /* the marker tags after the status tag (register row, record card meta, dossier profile header) */
  function markersHtml(caseId) {
    return [confirmed(caseId, "reopen") && KINDS.reopen, confirmed(caseId, "strike") && KINDS.strike].filter(Boolean)
      .map((k) => tag(k.marker, k.markerTone, { icon: k.markerIcon })).join("");
  }
  /* AC-14 (US-412) / AC-09 (US-410): one details card per kind with the latest request — state, reason, who / when, the
     decision; the reason is shown read-only (it never changes, US-410 AC-13, US-411 Constraints) */
  function cardsHtml(caseId, renderCard) {
    const R = renderCard || A().renderInfoCard;
    if (!R) return "";
    const stamp = G().stamp || ((v) => v);
    const row = caseRow(caseId);
    return Object.values(KINDS).map((k) => {
      const req = latest(caseId, k.key);
      if (!req) return "";
      const decided = req.state !== "confirmare";
      const rows = [
        [k.stateLabel, stateTag(req.state)],
        [k.field, `<span>${esc(req.reason)}</span>`],
        ["Inițiat de", esc(`${req.by}${req.role ? ` · ${req.role}` : ""}`)],
        ["Inițiat la", esc(stamp(req.at))],
        decided ? [req.state === "confirmata" ? "Confirmat de" : "Respins de", esc(`${req.decidedBy}${req.decidedRole ? ` · ${req.decidedRole}` : ""}`)] : null,
        decided ? [req.state === "confirmata" ? "Confirmat la" : "Respins la", esc(stamp(req.decidedAt))] : null,
        req.state === "respinsa" ? ["Motivul respingerii", `<span>${esc(req.rejectReason)}</span>`] : null
      ];
      if (req.state === "confirmata" && k.key === "reopen") {
        rows.push(["Data redeschiderii", esc(stamp(req.decidedAt))]);
        if (req.prevDecision) rows.push(["Decizia anterioară", esc(req.prevDecision)]);
      }
      if (req.state === "confirmata" && k.key === "strike") {
        rows.push(["Data radierii", esc(stamp(req.decidedAt))]);
        rows.push(["Înregistrări legate", "<span>Marcate ca dezactivate, fără ștergere</span>"]);
        rows.push(["Arhivare", "<span>După politica de păstrare, de la data marcajului „Dosar radiat”</span>"]);
      }
      if (req.state === "confirmare" && row) rows.splice(1, 0, ["Statutul dosarului la trimitere", statusTag(req.prevStatus || row.status)]);
      return R(k.title, rows.filter(Boolean));
    }).join("");
  }

  /* AC-11 (US-412): the issued act of a reopened (approved) dossier reads „Redeschis” in Registrul actelor permisive */
  function actStatus(act) {
    const req = all().find((r) => r.kind === "reopen" && r.state === "confirmata" && r.caseId === act.dossier);
    return req ? "Redeschis" : null;
  }

  /* ---------------------------------------------------------------- 1. the request dialog (US-411 / US-409) */
  let open = null; /* { mode: "submit" | "task" | "confirm" | "reject", kind, caseId, reqId } */
  const modal = () => document.querySelector(MODAL);
  const footer = (buttons) => `<div class="modal-buttons">${buttons}</div>`;
  const btn = (label, attrs, cls = "btn-neutral") => `<button class="btn ${cls} btn-rounded" type="button" ${attrs}><span>${esc(label)}</span></button>`;

  function openSubmit(k, row) {
    open = { mode: "submit", kind: k.key, caseId: row.id };
    const lead = k.key === "reopen"
      ? `Trimiți spre confirmare redeschiderea dosarului finalizat <strong>${esc(row.nr)}</strong>. După confirmare, dosarul revine la specialistul care l-a examinat, la pasul în care selectează decizia, în același dosar și cu istoricul păstrat.`
      : `Trimiți spre confirmare radierea dosarului <strong>${esc(row.nr)}</strong>. Dosarul nu se șterge: după confirmare primește marcajul „Dosar radiat” și rămâne în registru, cu documentele lui.`;
    G().openModal({
      kind: "confirm",
      title: k.title,
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">${lead}</p>
        ${U().renderInfoNote?.(k.key === "reopen" ? "Motivul rămâne permanent în Jurnalul de audit și nu se poate șterge." : "Motivul rămâne permanent în Jurnalul de audit și nu se mai modifică după confirmare.") || ""}
        ${W()?.reasonFieldHtml({ id: "crq-reason", label: k.field, placeholder: k.placeholder }) || ""}`,
      footer: footer(`${btn("Anulează", "data-case-close")}${btn("Trimite", "data-crq-submit", k.key === "strike" ? "btn-destructive" : "btn-primary")}`)
    });
    W()?.bindReason(modal());
  }
  function submit() {
    const k = KINDS[open.kind];
    const row = G().findRow?.(REG, open.caseId);
    const reason = W()?.readReason(modal(), "obligatoriu");
    if (reason === null || reason === undefined) return;
    /* the record's real state is checked again (Epic 89620 AC) */
    if (!row || visible({ control: k.control }, row) === false) { refuse(`${k.Noun} dosarului ${open.caseId} nu a fost trimisă: dosarul a fost modificat între timp. Reîncarcă registrul și verifică statutul.`); return; }
    const st = store();
    st.seq = (st.seq || 40) + 1;
    const who = G().persona?.() || {};
    const req = { id: `S-2026-${String(420 + st.seq).padStart(6, "0")}`, kind: k.key, caseId: row.id, state: "confirmare", at: G().nowIso(), by: G().userName(), role: who.roleLabel || "", reason, prevStatus: row.src?.status };
    save(req);
    /* AC-13 (US-411 / US-409): user, type, dossier, reason, timestamp (the journal stamps who / when) */
    G().logEvent(REG, row, {
      user: req.by, role: req.role, type: k.key === "reopen" ? "Solicitarea redeschiderii" : "Solicitarea radierii", category: "modificare",
      detail: `Motivul: ${reason.replace(/[.!?]?$/, (p) => p || ".")} Sarcina ${req.id} „${k.task}” a fost creată.`,
      changes: [{ field: k.stateLabel, before: "—", after: "În confirmare" }]
    });
    finish(`${k.Noun} a fost trimisă spre confirmare.`);
  }

  /* ---------------------------------------------------------------- 2. the confirmation task (US-412 / US-410) */
  const canConfirm = (k, who = G().persona?.() || {}) => Boolean(who.can?.(k.confirmPerm));
  /* the perimeter of the confirmer: the authority (+ subdivision for local roles), as the registers */
  function inPerimeter(row, who) {
    if (who.all) return true;
    if (who.authority && who.authority !== "ANSP") return false;
    return !who.subdivision || row.subdiviziune === who.subdivision;
  }
  /* Sarcinile mele rows: pending requests the user may confirm, in the perimeter, not asked by the user himself */
  function tasks() {
    const who = G().persona?.() || {};
    const me = G().userName?.() || "";
    return all().filter((r) => r.state === "confirmare").map((r) => {
      const k = KINDS[r.kind];
      const row = caseRow(r.caseId);
      if (!row || !canConfirm(k, who) || !inPerimeter(row, who) || r.by === me) return null;
      return {
        id: r.id, nrSarcina: r.id, tipSarcina: k.tab, statut: row.status, dosarNr: row.id, sursa: row.sursa, tipDosar: row.tipDosar,
        numeSolicitant: row.numeSolicitant, companie: row.companie, serviciu: row.serviciu,
        initiat: r.by, initiatRol: r.role, initiatLa: r.at, motiv: r.reason
      };
    }).filter(Boolean).sort((a, b) => String(b.initiatLa).localeCompare(String(a.initiatLa)));
  }
  const isTask = (id) => Boolean(byId(id));

  function openTask(id) {
    const req = byId(id);
    const row = req && caseRow(req.caseId);
    if (!req || !row) return false;
    const k = KINDS[req.kind];
    if (!canConfirm(k)) { A().showShellToast?.("Acces interzis: rolul tău nu are permisiunea de confirmare.", "error"); return true; }
    open = { mode: "task", kind: k.key, caseId: row.id, reqId: req.id };
    const stamp = G().stamp;
    const auto = req.by === "SIA GEAP";
    const lead = auto
      ? "SIA GEAP a creat redeschiderea dosarului la semnarea deciziei de aprobare a contestației. Verifică dosarul și motivul, apoi confirmă sau respinge."
      : `${esc(req.by)} cere ${k.noun} dosarului. Verifică dosarul și motivul, apoi confirmă sau respinge.`;
    const rows = [
      ["Numărul dosarului", A().renderProfileCopyCode?.(row.nrDosar, `Copiază ${row.nrDosar}`) || esc(row.nrDosar)],
      ["Statut dosar", `${statusTag(row.status)}${markersHtml(row.id)}`],
      ["Solicitant", esc(row.companie || row.numeSolicitant || "—")],
      [k.field, `<span>${esc(req.reason)}</span>`],
      ["Inițiat de", esc(`${req.by}${req.role ? ` · ${req.role}` : ""}`)],
      ["Inițiat la", esc(stamp(req.at))],
      [k.stateLabel, stateTag(req.state)]
    ];
    G().openModal({
      kind: "task",
      title: k.task,
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">${lead}</p>
        <div class="e-permits-dosar-profil__card">${rows.map(G().detailRow).join("")}</div>
        <div><button class="btn btn-neutral btn-sm" type="button" data-crq-open-case>${G().icon("document", 16, "icon")}<span>Deschide dosarul</span></button></div>`,
      footer: footer(`${btn("Respinge", "data-crq-reject")}${btn(k.confirmLabel, "data-crq-confirm", k.key === "strike" ? "btn-destructive" : "btn-primary")}`)
    });
    return true;
  }
  /* AC-06 (US-412) / AC-05 (US-410): „Confirmi … dosarului?” — tu form; the number stays in the content */
  function openConfirm() {
    const k = KINDS[open.kind];
    const row = caseRow(open.caseId);
    open.mode = "confirm";
    const holder = row.specialist?.nume || "specialistul care l-a examinat";
    const act = row.status === "eliberat" && row.nrActEmis ? ` Actul permisiv ${esc(row.nrActEmis)} trece în statutul „Redeschis” în Registrul actelor permisive; fișierul semnat se anulează la semnarea noului fișier.` : "";
    const lead = k.key === "reopen"
      ? `Dosarul <strong>${esc(row.nrDosar)}</strong> trece în statutul „Redeschis” și revine la ${esc(holder)}, la pasul în care selectează decizia.${act}`
      : `Dosarul <strong>${esc(row.nrDosar)}</strong> primește marcajul „Dosar radiat”. Nu se șterge nimic: dosarul rămâne în registrul «Dosare», cu documentele lui, iar înregistrările de registru legate se marchează ca dezactivate. Marcajul nu se mai poate scoate.`;
    G().openModal({
      kind: "confirm",
      title: k.key === "reopen" ? "Confirmi redeschiderea dosarului?" : "Confirmi radierea dosarului?",
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">${lead}</p>`,
      footer: footer(`${btn("Anulează", "data-case-close")}${btn("Confirmă", "data-crq-confirm-final", k.key === "strike" ? "btn-destructive" : "btn-primary")}`)
    });
  }
  function openReject() {
    const k = KINDS[open.kind];
    const row = caseRow(open.caseId);
    open.mode = "reject";
    const lead = k.key === "reopen"
      ? `Redeschiderea dosarului <strong>${esc(row.nrDosar)}</strong> se închide, iar dosarul rămâne în statutul „${esc(statuses()[row.status]?.label || row.status)}”.`
      : `Radierea dosarului <strong>${esc(row.nrDosar)}</strong> se închide, iar dosarul rămâne fără marcajul „Dosar radiat”. Se poate trimite o radiere nouă.`;
    G().openModal({
      kind: "confirm",
      title: k.key === "reopen" ? "Respingi redeschiderea?" : "Respingi radierea?",
      subtitle: row.serviciu,
      body: `<p class="e-permits-passport__lead">${lead}</p>
        ${W()?.reasonFieldHtml({ id: "crq-reject-reason", label: "Motivul respingerii", placeholder: "De ex. motivul nu justifică o procedură excepțională" }) || ""}`,
      footer: footer(`${btn("Anulează", "data-case-close")}${btn("Respinge", "data-crq-reject-final", "btn-destructive")}`)
    });
    W()?.bindReason(modal());
  }
  function decide(accept) {
    const k = KINDS[open.kind];
    const req = byId(open.reqId);
    const row = caseRow(open.caseId);
    if (!req || !row || req.state !== "confirmare") { refuse("Sarcina a fost deja procesată de alt utilizator."); return; }
    let rejectReason = "";
    if (!accept) {
      rejectReason = W()?.readReason(modal(), "obligatoriu");
      if (rejectReason === null || rejectReason === undefined) return;
    }
    /* US-412 AC-19: an appeal or an archiving meanwhile → refused, the request stays „În confirmare” */
    if (accept && k.key === "reopen" && (hasAppeal(row.id) || row.status === "arhivat")) { refuse("Dosarul nu mai poate fi redeschis."); return; }
    const who = G().persona?.() || {};
    const at = G().nowIso();
    const decidedBy = G().userName();
    const prevLabel = statuses()[row.status]?.label || row.status;
    const reg = G().findRow?.(REG, row.id) || { id: row.id };
    const st = store();
    if (!accept) {
      save({ ...req, state: "respinsa", decidedAt: at, decidedBy, decidedRole: who.roleLabel || "", rejectReason });
      G().logEvent(REG, reg, {
        user: decidedBy, role: who.roleLabel, type: k.key === "reopen" ? "Respingerea redeschiderii" : "Respingerea radierii", category: "modificare",
        detail: `Decizia: respinsă. Motivul respingerii: ${rejectReason}`,
        changes: [{ field: k.stateLabel, before: "În confirmare", after: "Respinsă" }, { field: "Statut", before: prevLabel, after: prevLabel }]
      });
      finish(`${k.Noun} dosarului ${row.nrDosar} a fost respinsă.`, { tasks: true, tone: "info" });
      return;
    }
    if (k.key === "reopen") {
      const decision = row.decizia === "respingere" || row.status === "respins" ? "Respingere" : `Aprobare${row.nrActEmis ? ` · act ${row.nrActEmis}` : ""}`;
      save({ ...req, state: "confirmata", decidedAt: at, decidedBy, decidedRole: who.roleLabel || "", prevStatus: row.status, prevDecision: decision });
      st.patches = st.patches || {};
      st.patches[row.id] = { ...(st.patches[row.id] || {}), status: "redeschis" };
      Object.assign(row, { status: "redeschis", profil: null, flowState: null });
      G().logEvent(REG, reg, {
        user: decidedBy, role: who.roleLabel, type: "Confirmarea redeschiderii", category: "modificare",
        detail: `Decizia: confirmată. Decizia anterioară: ${decision}. Dosarul revine la ${row.specialist?.nume || "specialistul care l-a examinat"}, la pasul de selectare a deciziei.`,
        changes: [
          { field: k.stateLabel, before: "În confirmare", after: "Confirmată" },
          { field: "Statut", before: prevLabel, after: "Redeschis" },
          { field: "Dosar redeschis", before: "Nu", after: "Da" },
          { field: "Data redeschiderii", before: "—", after: G().stamp(at) }
        ]
      });
      finish(`Redeschiderea a fost confirmată. Dosarul ${row.nrDosar} a revenit la ${row.specialist?.nume || "specialist"}.`, { tasks: true });
      return;
    }
    save({ ...req, state: "confirmata", decidedAt: at, decidedBy, decidedRole: who.roleLabel || "" });
    st.struck = st.struck || {};
    st.struck[`${REG}:${row.id}`] = { at, by: decidedBy, reason: req.reason };
    G().logEvent(REG, reg, {
      user: decidedBy, role: who.roleLabel, type: "Confirmarea radierii", category: "modificare",
      detail: `Decizia: confirmată. Motivul radierii: ${req.reason}`,
      changes: [{ field: k.stateLabel, before: "În confirmare", after: "Confirmată" }, { field: "Dosar radiat", before: "Nu", after: "Da" }, { field: "Data radierii", before: "—", after: G().stamp(at) }]
    });
    G().logEvent(REG, reg, {
      user: "SIA GEAP", role: "Sistem", type: "Aplicarea marcajului „Dosar radiat”", category: "sistem",
      detail: "Înregistrările de registru legate de dosar (note de plată, avize) au fost marcate ca dezactivate, fără ștergere."
    });
    finish(`Radierea a fost confirmată. Dosarul ${row.nrDosar} este radiat.`, { tasks: true, tone: "info" });
  }

  /* ---------------------------------------------------------------- after an action */
  function refuse(message) {
    G().closeModal?.();
    open = null;
    window.GEAPToast?.show ? window.GEAPToast.show({ type: "error", message, duration: 0, key: "crq-refused" }) : U().showShellToast?.(message, "error");
  }
  /* toast-tone-v1: a confirmation that ENDS / cancels something (dossier struck, request rejected) = the neutral info toast */
  function finish(message, { tasks: changed = false, tone = "success" } = {}) {
    G().save?.();
    G().closeModal?.();
    open = null;
    U().showShellToast?.(message, tone);
    G().refresh?.(REG);
    G().renderCard?.();
    if (changed) document.dispatchEvent(new CustomEvent("geap:tasks-changed"));
    A().refreshNav?.();
  }

  /* the dialog's own buttons (the registre dialog handles data-case-close / data-reg-confirm) */
  document.addEventListener("click", (event) => {
    if (!open || !event.target.closest?.(MODAL)) return;
    const t = event.target;
    if (t.closest("[data-crq-submit]")) { submit(); return; }
    if (t.closest("[data-crq-confirm]")) { openConfirm(); return; }
    if (t.closest("[data-crq-reject]")) { openReject(); return; }
    if (t.closest("[data-crq-confirm-final]")) { decide(true); return; }
    if (t.closest("[data-crq-reject-final]")) { decide(false); return; }
    if (t.closest("[data-crq-open-case]")) {
      const caseId = open.caseId;
      G().closeModal?.();
      open = null;
      document.dispatchEvent(new CustomEvent("geap:task-open-case", { detail: { caseId } }));
    }
  });

  /* ---------------------------------------------------------------- registre.js hooks */
  function run(action, def, row) {
    const k = kindOfControl(action.control);
    if (!k) return false;
    if (visible(action, row) === false) { U().showShellToast?.(`${k.action}: acțiunea nu este disponibilă pentru acest dosar.`, "info"); return true; }
    openSubmit(k, row);
    return true;
  }
  /* #registru/reg-dosare/<id>/redeschidere|radiere = the direct call (US-411 / US-409 AC-01 / AC-02) */
  const routeKind = (segment) => Object.values(KINDS).find((k) => k.route === segment) || null;

  /* ---------------------------------------------------------------- routes: #sarcini · #sarcina/<id> */
  const DENIED_TEXT = {
    reopen: "Rolul tău nu are permisiunea de confirmare a redeschiderii dosarelor. Permisiunea se acordă de Administratorul central, per rol.",
    strike: "Rolul tău nu are permisiunea de confirmare a radierii dosarelor. Permisiunea se acordă de Administratorul central, per rol."
  };
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    const m = hash.match(/^#sarcin(?:i|a\/([^/]+))$/);
    if (!m) return false;
    Promise.resolve(G().load?.()).then(() => {
      const nav = document.querySelector('[data-nav-item][data-nav-id="my-tasks"]');
      if (!m[1]) { if (nav) nav.click(); else G().showPage?.("Sarcinile mele", window.GEAPEmptyState?.render({ title: "Acces interzis", text: "Rolul tău nu are sarcini de confirmare.", icon: "lock" }) || ""); return; }
      const req = byId(decodeURIComponent(m[1]));
      const k = req && KINDS[req.kind];
      const row = req && caseRow(req.caseId);
      const who = G().persona?.() || {};
      /* US-412 / US-410 AC-01: the task opened directly without the confirmation permission (or outside the perimeter) */
      if (!k || !row || !canConfirm(k, who) || !inPerimeter(row, who)) {
        document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
        G().showPage?.("Sarcinile mele", window.GEAPEmptyState?.render({ title: "Acces interzis", text: DENIED_TEXT[req?.kind || "strike"], icon: "lock" }) || "Acces interzis");
        return;
      }
      if (nav) nav.click();
      setTimeout(() => openTask(req.id), 50);
    });
    return true;
  });

  window.GEAPCaseRequests = {
    KINDS, SEED, all, ofCase, latest, pending, confirmed, byId,
    visible, actionState, run, routeKind, isStruck, markersHtml, cardsHtml, actStatus,
    tasks, isTask, openTask, canConfirm
  };
})();
