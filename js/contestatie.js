/* ==========================================================================================================
   GEAPContestatie — „Contestarea dosarelor” (con-v1, 2026-11-26; Feature 97299: US-418 97583 FrontOffice, US-419 97584
   Ghișeu, US-420 97585 Proces Contestație). ONE rule set for every side, as GEAPRetragere does for the withdrawal:
     config(raw)        the service's «Contestare» block (Admin › Serviciu › Setări › «Contestare», US-221: «Serviciu
                        contestabil», «Tipuri de solicitare contestabile», «Decizii contestabile», «Termen admisibil de
                        contestare (zile)», «Tipul zilelor de contestare») → { appealable, types, decisions, days, dayType }
     requestState(d, service, { allowed, today })   the Cabinet request (data/cabinet-evo-solicitari.json) → hidden
                        { show: false } (not the applicant's, service not appealable, type / decision not appealable, term
                        expired — US-418 AC-01…03) · blocked { show, reason } (an appeal already in processing — AC-11) ·
                        available { show, until }
     reasonFieldHtml    „Motivele contestației” = the shared FO textarea (GEAPRetragere.reasonFieldHtml: label, red star,
                        counter, „Câmpul este obligatoriu.” — AC-06)
   BackOffice (US-420): the seeded appeal dossiers on the shell's generated dossiers (decorate), the read-only „Dosarul
   contestat” + „Cererea de contestare” cards of an appeal dossier and the „Contestație” card of a contested one (AC-04),
   the decision labels „Aprobarea contestației” / „Respingerea contestației” (AC-06) and the signed decision (onSigned):
   approval → GEAPCaseRequests.fromAppeal = the reopen „În confirmare” + the task „Confirmarea redeschiderii” (AC-09),
   rejection → no task, the contested decision stays in force (AC-10); the contested dossier keeps its status (AC-13).
   Demo overrides (every side, ?state= links): con-contestabil=0 · con-decizii=respingere|aprobare,respingere ·
   con-tipuri=primar,reperfectare,… · con-zile=<n> · con-in-procesare=<Cabinet dossier id, …> (an appeal in processing).
   ========================================================================================================== */
(function () {
  "use strict";
  if (window.GEAPContestatie) return;

  const params = new URLSearchParams(window.location.search);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ids = (key) => (params.get(key) || "").split(",").map((v) => v.trim()).filter(Boolean);
  const tag = (label, tone, opts) => window.GEAPTag?.html(label, tone, opts) || esc(label);

  /* ---------------------------------------------------------------- the passport block (US-221 «Contestare») */
  const TYPES = [["primar", "Emitere primară"], ["prelungire", "Prelungire"], ["reperfectare", "Reperfectare"], ["duplicat", "Emitere duplicat"],
    ["suspendare", "Suspendare valabilitate"], ["reluare", "Reluarea valabilității"], ["retragere", "Retragere"], ["anulare", "Anulare"]];
  const DECISIONS = [["respingere", "Decizie de respingere"], ["aprobare", "Decizie de aprobare"]];
  /* the seeded services: appealable, every request type, negative decisions only (request-act-modal-link-v1: the Cabinet
     offered the appeal only against a refusal) — „Decizii contestabile” may add the positive ones (con-decizii) */
  const DEFAULT = { appealable: true, types: TYPES.map(([k]) => k), decisions: ["respingere"], days: 30, dayType: "calendaristice" };
  function config(raw = {}) {
    const c = {
      appealable: Boolean(raw.appealable ?? DEFAULT.appealable),
      types: Array.isArray(raw.types) && raw.types.length ? raw.types : DEFAULT.types,
      decisions: Array.isArray(raw.decisions) && raw.decisions.length ? raw.decisions : DEFAULT.decisions,
      days: Number(raw.days) || DEFAULT.days,
      dayType: raw.dayType || DEFAULT.dayType
    };
    if (params.get("con-contestabil") === "0") c.appealable = false;
    if (ids("con-decizii").length) c.decisions = ids("con-decizii");
    if (ids("con-tipuri").length) c.types = ids("con-tipuri");
    if (Number(params.get("con-zile"))) c.days = Number(params.get("con-zile"));
    return c;
  }

  /* ---------------------------------------------------------------- the Cabinet request (FO + EVO Cabinet) */
  const addDays = (iso, n) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  /* the decision of a finished request: refused / the authority's own suspension, withdrawal, annulment = negative;
     an approved request (issued act, the holder's own post-process) = positive */
  function decisionOf(dosar) {
    if (!dosar || dosar.status !== "finalizat" || !dosar.finalized) return null;
    const negative = dosar.result === "respins" || (Boolean(dosar.decisionOnly) && dosar.initiatedBy === "autoritate" && /^(suspendare|retragere|anulare)$/.test(dosar.pp || ""));
    return negative ? "respingere" : dosar.result === "aprobat" ? "aprobare" : null;
  }
  const typeOf = (dosar) => dosar?.pp || "primar";
  /* the number of the contested decision: the refusal / the authority's decision, else the issued act */
  const decisionNr = (dosar) => dosar?.decision?.nr || dosar?.actNr || "";
  function decisionLabel(dosar) {
    const kind = decisionOf(dosar);
    if (kind === "respingere" && dosar.result === "respins") return "Decizie de respingere";
    if (kind === "respingere") return { suspendare: "Decizie de suspendare a valabilității", retragere: "Decizie de retragere a actului permisiv", anulare: "Decizie de anulare a actului permisiv" }[dosar.pp] || "Decizia autorității";
    return "Decizie de aprobare";
  }
  /* AC-11: an appeal of this request is already in processing (demo: con-in-procesare=<id>, or filed and returned in this
     page view — ?contestat= — kept in memory only, so one demo state never leaks into the next) */
  const filed = {};
  function remember(dosarId, appealNr) { filed[dosarId] = appealNr; }
  const pendingNr = (dosar) => (ids("con-in-procesare").includes(dosar?.id) ? appealNumber(dosar) : filed[dosar?.id] || "");
  /* the new appeal dossier's number (generated at filing, AC-10): the contested number's service + a new sequence */
  function appealNumber(dosar) {
    const m = String(dosar?.nr || "").match(/^GEAP-(\d{4})-(\d{3})-(\d+)$/);
    return m ? `GEAP-2026-${m[2]}-${String(Number(m[3]) + 611).padStart(5, "0")}` : "GEAP-2026-009-04815";
  }

  /* { show:false } hidden · { show, reason } blocked · { show, until } available (US-418 AC-01…03, AC-11) */
  function requestState(dosar, service, { allowed = true, today = "" } = {}) {
    const cfg = config(service?.appeal || {});
    const kind = decisionOf(dosar);
    /* why = the FO's explanation when the flow is opened anyway (the Cabinet simply hides the action) */
    if (!dosar || !allowed) return { show: false, reason: "", why: "" };
    if (!cfg.appealable) return { show: false, reason: "", why: "Serviciul nu este contestabil: setările serviciului nu permit contestarea deciziilor." };
    if (!kind) return { show: false, reason: "", why: "Cererea nu are încă o decizie a autorității. Contestația se depune după emiterea deciziei." };
    if (!cfg.types.includes(typeOf(dosar)) || !cfg.decisions.includes(kind)) return { show: false, reason: "", why: "Decizia nu este indicată drept contestabilă în setările serviciului." };
    const until = addDays(dosar.finalized, cfg.days);
    if (today && until < today) return { show: false, reason: "", until, why: `Termenul admisibil de contestare (${cfg.days} de zile ${cfg.dayType === "lucratoare" ? "lucrătoare " : ""}de la emiterea deciziei) a expirat.` };
    const nr = pendingNr(dosar);
    if (nr) return { show: true, reason: `Contestația ${nr} este în procesare. O decizie are cel mult o contestație în procesare.`, until, pending: nr };
    return { show: true, reason: "", until };
  }

  const REASON_PLACEHOLDER = "De ex. spațiul de producție are fluxuri separate de la 1 septembrie; anexez planul și procesul-verbal de recepție";
  function reasonFieldHtml({ id = "con-reason", value = "" } = {}) {
    return window.GEAPRetragere?.reasonFieldHtml({ id, label: "Motivele contestației", placeholder: REASON_PLACEHOLDER, mode: "obligatoriu", value }) || "";
  }

  /* ---------------------------------------------------------------- BackOffice: the appeal dossiers (US-420) */
  /* five generated dossiers of CSP Chișinău become appeal dossiers (no new rows: the registers keep their pages), each
     linked to a dossier with a decision. by = the channel (US-418 Online / US-419 Ghișeu). */
  const SEED = [
    /* approved, signed and communicated → SIA GEAP created the reopen of D-2026-004734 (dosar-cereri S-2026-000415) */
    { id: "D-2026-004693", contested: "D-2026-004734", status: "finalizat", decision: "aprobare", channel: "Online", filedAt: "2026-06-18T10:12:00", signedAt: "2026-07-02",
      reasons: "Cererea a fost respinsă pentru lipsa avizului de securitate la incendiu, deși avizul nr. 412 din 3 mai 2026 a fost anexat la cerere (pagina 7 a dosarului).", docs: 2 },
    /* under examination at the specialist (me) */
    { id: "D-2026-004598", contested: "D-2026-004729", status: "inExaminare", channel: "Online", filedAt: "2026-07-02T09:40:00",
      reasons: "Termenul de valabilitate a fost refuzat pe motiv că laboratorul nu este acreditat; buletinul de analiză nr. 2211 este emis de un laborator acreditat (certificat MOLDAC LÎ-118).", docs: 1 },
    /* waiting for the signature — the approval / the rejection of the appeal */
    { id: "D-2026-004647", contested: "D-2026-004726", status: "spreSemnare", decision: "aprobare", channel: "Ghișeu", filedAt: "2026-06-26T14:05:00",
      reasons: "Refuzul invocă lipsa contractului de gestionare a deșeurilor; contractul nr. 77/2026 a fost depus la ghișeu odată cu cererea.", docs: 1 },
    { id: "D-2026-004631", contested: "D-2026-004722", status: "spreSemnare", decision: "respingere", channel: "Online", filedAt: "2026-06-24T11:30:00",
      reasons: "Actul permisiv a fost emis doar pentru încăperea de la parter; solicit includerea depozitului de la subsol, prevăzut în cerere.", docs: 0 },
    /* just filed at the desk, waiting for the distribution */
    { id: "D-2026-004474", contested: "D-2026-004716", status: "depus", channel: "Ghișeu", filedAt: "2026-07-08T15:20:00",
      reasons: "Condiția privind programul de lucru (08:00–20:00) nu era cerută de lege pentru acest tip de activitate.", docs: 1 }
  ];
  const DECISION_LABEL = { aprobare: "Aprobarea contestației", respingere: "Respingerea contestației" };
  let rowsRef = [];
  let dbRef = null;
  function decorate(rows, db) {
    rowsRef = rows || [];
    dbRef = db || null;
    SEED.forEach((s) => {
      const row = rowsRef.find((r) => r.id === s.id);
      const contested = rowsRef.find((r) => r.id === s.contested);
      if (!row || !contested) return;
      Object.assign(row, {
        tipDosar: "Contestație",
        serviciu: contested.serviciu,
        numeSolicitant: contested.numeSolicitant,
        companie: contested.companie,
        subdiviziune: contested.subdiviziune,
        sursa: s.channel === "Online" ? "FO" : "BO",
        dataDepunerii: s.filedAt.slice(0, 10),
        /* the appeal's own examination term (data/ghiseu.json „Contestație” = 30 de zile) */
        termenExaminare: addDays(s.filedAt, 30),
        termenZile: 22,
        status: s.status,
        decizia: s.status === "finalizat" ? s.decision : s.status === "spreSemnare" ? "proiect" : "none",
        nrActEmis: null,
        dataSemnarii: s.signedAt || null,
        alerte: [],
        nedistribuit: s.status === "depus",
        contestatie: {
          contested: contested.id, channel: s.channel, filedAt: s.filedAt, reasons: s.reasons, docs: s.docs,
          decision: s.decision || null, signedAt: s.signedAt || null
        }
      });
      if (s.status === "depus") { row.specialist = null; row.repartizatDe = null; }
    });
  }
  const isAppeal = (row) => Boolean(row?.contestatie);
  const rowOf = (id) => rowsRef.find((r) => r.id === id) || null;
  const PROCESSING = ["depus", "inExaminare", "asteaptaPlata", "spreCoordonare", "spreSemnare"];
  /* the appeals of a contested dossier, newest first; „în procesare” = not finished yet (US-412 AC-19 / US-411 AC-04) */
  const appealsOf = (caseId) => rowsRef.filter((r) => r.contestatie?.contested === caseId).sort((a, b) => String(b.contestatie.filedAt).localeCompare(String(a.contestatie.filedAt)));
  const pendingFor = (caseId) => appealsOf(caseId).find((r) => PROCESSING.includes(r.status)) || null;

  /* the decision of the contested dossier, read-only */
  function contestedDecisionHtml(contested, longDate) {
    if (!contested) return "—";
    const d = contested.decizia === "respingere" ? ["Respingere", "danger"] : ["Aprobare", "success"];
    const meta = [contested.nrActEmis ? `act ${contested.nrActEmis}` : "", contested.dataSemnarii ? longDate(contested.dataSemnarii) : ""].filter(Boolean).join(" · ");
    return `<span>${tag(d[0], d[1])}${meta ? ` <span class="e-permits-dosar-profil__termen-meta">${esc(meta)}</span>` : ""}</span>`;
  }
  /* US-420 AC-04 (appeal dossier): „Dosarul contestat” + „Cererea de contestare” — read-only; AC-13 the contested status
     stays as it was. A contested dossier: „Contestație” = its appeal(s), with the link to the appeal dossier. */
  function cardsHtml(row, renderCard, { copy, statusTag, stamp, open, longDate } = {}) {
    if (!row || !renderCard) return "";
    const st = dbRef?.statuses || {};
    const sTag = statusTag || ((key) => tag(st[key]?.label || key, st[key]?.tone || "neutral"));
    const cp = copy || ((v) => esc(v));
    const at = stamp || ((v) => esc(v));
    const link = open || ((id) => cp(id));
    const day = longDate || ((v) => v);
    if (isAppeal(row)) {
      const c = row.contestatie;
      const contested = rowOf(c.contested);
      const decided = c.decision && row.status === "finalizat";
      const reopen = decided && c.decision === "aprobare" ? window.GEAPCaseRequests?.ofCase?.(c.contested, "reopen")?.find((r) => r.appeal === row.id) : null;
      return renderCard("Dosarul contestat", [
        ["Numărul dosarului", link(c.contested)],
        ["Serviciul", esc(contested?.serviciu || row.serviciu)],
        ["Decizia contestată", contestedDecisionHtml(contested, day)],
        ["Statutul dosarului", contested ? sTag(contested.status) : "—"]
      ]) + renderCard("Cererea de contestare", [
        ["Tip solicitare", esc("Contestație")],
        ["Motivele contestației", `<span>${esc(c.reasons)}</span>`],
        ["Documente justificative", esc(c.docs ? `${c.docs} ${c.docs === 1 ? "document" : "documente"} · fila Documente` : "Fără documente")],
        ["Canalul depunerii", esc(c.channel)],
        ["Data depunerii", at(c.filedAt)],
        ["Decizia asupra contestației", decided ? tag(DECISION_LABEL[c.decision], c.decision === "aprobare" ? "success" : "danger") : row.status === "spreSemnare" || row.status === "spreCoordonare" ? `<span>${esc(DECISION_LABEL[c.decision] || "—")} <span class="e-permits-dosar-profil__termen-meta">proiect</span></span>` : "—"],
        ...(reopen ? [["Redeschiderea dosarului contestat", `<span>${tag(reopen.state === "confirmare" ? "În confirmare" : reopen.state === "confirmata" ? "Confirmată" : "Respinsă", reopen.state === "confirmare" ? "warning" : reopen.state === "confirmata" ? "success" : "danger")} <span class="e-permits-dosar-profil__termen-meta">sarcina ${esc(reopen.id)}</span></span>`]] : [])
      ]);
    }
    const appeals = appealsOf(row.id);
    if (!appeals.length) return "";
    const a = appeals[0];
    return renderCard("Contestație", [
      ["Dosarul de contestație", link(a.id)],
      ["Statutul contestației", sTag(a.status)],
      ["Data depunerii", at(a.contestatie.filedAt)],
      ["Canalul depunerii", esc(a.contestatie.channel)],
      ["Decizia asupra contestației", a.status === "finalizat" && a.contestatie.decision ? tag(DECISION_LABEL[a.contestatie.decision], a.contestatie.decision === "aprobare" ? "success" : "danger") : "—"]
    ]);
  }

  /* US-420 AC-09 / AC-10: the signed decision. Approval → the reopen of the contested dossier „În confirmare” + the task
     (dosar-cereri), rejection → nothing; returns { task } for the toast */
  function onSigned(row, decision, { at } = {}) {
    if (!isAppeal(row)) return null;
    row.contestatie.decision = decision;
    row.contestatie.signedAt = at || row.contestatie.signedAt;
    if (decision !== "aprobare") return { task: null };
    const req = window.GEAPCaseRequests?.fromAppeal?.({ caseId: row.contestatie.contested, appealId: row.id, at });
    return { task: req };
  }

  /* the shell may have built its dossiers before this deferred module ran: decorate them now (idempotent) */
  const early = window.GEAPShellApi?.dossierStore?.();
  if (early?.runtimeRows) decorate(early.runtimeRows, early);

  window.GEAPContestatie = {
    TYPES, DECISIONS, DECISION_LABEL, config, decisionOf, decisionLabel, decisionNr, typeOf, requestState, appealNumber, remember, pendingNr,
    reasonFieldHtml, decorate, isAppeal, appealsOf, pendingFor, cardsHtml, onSigned, SEED
  };
})();
