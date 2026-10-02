/**
 * core/case-flow.js — the case (dosar) process engine.
 *
 * Source: "Case (Dosar) logic and actions" (prototype extraction of the two BPMN flows
 * plus US-113…US-129, US-156). Two separate pieces of state per case:
 *   statusId — the coarse status published to Evo Cabinet (5 values)
 *   stateId  — the node of the BPMN process the case is resting on
 * The UI is driven by stateId; statusId is derived.
 *
 * Node ids are LOCAL to each flow: the Complex and the Simplified flow are described
 * separately and never share a behaviour map. Decision and server nodes are traversed
 * automatically; a case only ever rests on a human or terminal node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).caseFlow = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* §1 — the five published statuses (labels from the US documents) */
  var STATUS = { 0: "Inițiat", 2: "În lucru", 3: "Suspendat", 4: "Plată suplimentară", 9: "Finalizat" };

  /* §3 — lanes → internal roles (null = not a back-office role) */
  var LANES = {
    lane1: { title: "Solicitant", role: null },
    lane2: { title: "Specialist Ghișeu", role: "operator-ghiseu" },
    lane3: { title: "Asistent tehnic", role: "asistent-tehnic" },
    lane4: { title: "Expert", role: "expert" },
    lane5: { title: "Specialist", role: "specialist" },
    lane6: { title: "GEAP Modul Distribuire", role: null },
    lane7: { title: "Director", role: "director" },
    lane8: { title: "Supervizor", role: "supervizor" }
  };

  /* §9 rule 2 — role bans on top of lane gating, by action category */
  var ROLE_BANS = {
    "adm-c": "*",
    "adm-l": "*",
    expert: "*",
    "operator-ghiseu": ["examinare", "adaugTaxe", "avizare", "proiectDecizie", "coordonare", "semnare", "eliberare"],
    director: ["distribuire", "redistribuire", "examinare", "adaugTaxe", "avizare", "solInfo", "proiectDecizie"]
  };

  var SUSPENDED = "@suspended";

  /* §4 — human steps of Flux Complex Standard, with US names and transitions.
     kind: advance (moves forward) · return (sends back) · branch (a second way forward).
     form: the step whose data the dialog collects (§12). */
  function complexFlow() {
    return {
      id: "complex",
      name: "Flux Complex Standard",
      file: null,
      order: ["node5", "node6", "node8", "RecordState1", "node10", "node9", "node15", "node16", "node14", "node17", "RecordState2", "node19", "node20"],
      nodes: {
        start: { kind: "server", next: "node3" },
        node3: { kind: "decision", question: "Distribuire automată?", guard: "IsAutoDistribution", yes: "node6", no: "node5" },
        node5: {
          kind: "human", lane: "lane8", statusId: 2, us: "US-114", name: "Distribuirea dosarului (manuală)",
          bpmn: "Selectează specialistul cu instrucțiuni", form: "distribuire",
          transitions: [{ id: "distribuie", label: "Distribuie", target: "node6", kind: "advance", category: "distribuire", icon: "person" }]
        },
        node6: {
          kind: "human", lane: "lane5", statusId: 2, us: "US-115", name: "Verificarea datelor dosarului", bpmn: "Verifică date",
          transitions: [
            { id: "dosarExaminat", label: "Dosar examinat", target: "node12", kind: "advance", category: "examinare", form: "decizie", icon: "checkmark-large", blockable: true },
            { id: "suspendare", label: "Suspendare termen", target: "node8", kind: "branch", category: "suspendare", form: "suspendare", icon: "pause" }
          ],
          /* §6 — operations: they do not move the case */
          operations: [
            { id: "taxaExaminare", label: "Taxă de examinare", us: "US-117", category: "adaugTaxe", form: "taxa", icon: "receipt-bill" },
            { id: "aviz", label: "Avize interinstituționale", us: "US-119", category: "avizare", form: "aviz", icon: "share-android" }
          ]
        },
        node8: {
          kind: "human", lane: "lane5", statusId: 2, us: "US-126/127", name: "Inițierea suspendării termenului",
          bpmn: "Indică motiv, setează termen", form: "suspendare",
          transitions: [{ id: "confirmaSuspendarea", label: "Confirmă suspendarea", target: "node7", kind: "advance", category: "suspendare", icon: "pause" }]
        },
        node7: { kind: "decision", question: "Suspendare cu coordonare și semnare?", guard: "SuspensionWithCoordination", yes: "RecordState1", no: SUSPENDED },
        RecordState1: {
          kind: "human", lane: "lane8", statusId: 2, us: "US-128", name: "Coordonarea deciziei de suspendare", bpmn: "Coordonează decizia de suspendare",
          transitions: [
            { id: "coordoneaza", label: "Coordonează", target: "node10", kind: "advance", category: "coordonare", icon: "check-all" },
            { id: "returneazaSpecialist", label: "Returnează la Specialist", target: "node8", kind: "return", category: "coordonare", icon: "arrow-left" }
          ]
        },
        node10: {
          /* §8: Suspendat from here on (US-116 — status changes at the end of variant B).
             The BPMN file has no forward exit from this node; "Semnează decizia" is the
             prototype's patch (open item 3). */
          kind: "human", lane: "lane7", statusId: 3, us: "US-129", name: "Verificarea și semnarea deciziei de suspendare",
          bpmn: "Verifică și semnează decizia de suspendare",
          transitions: [
            { id: "semneazaSuspendarea", label: "Semnează decizia", target: "RecordState4", kind: "advance", category: "semnare", icon: "signature", patched: true },
            { id: "returneazaSupervizor", label: "Returnează la Supervizor", target: "RecordState1", kind: "return", category: "semnare", icon: "arrow-left" }
          ]
        },
        RecordState4: { kind: "server", next: SUSPENDED },
        node12: { kind: "decision", question: "Necesită Avizare?", guard: "WithExpertise", choice: { aprobare: "node9", respingere: "node14" } },
        node9: {
          kind: "human", lane: "lane5", statusId: 2, us: "US-117", name: "Setarea taxei", bpmn: "Setează taxă", form: "taxa",
          transitions: [{ id: "confirmaTaxa", label: "Confirmă taxa", target: "node15", kind: "advance", category: "adaugTaxe", icon: "receipt-bill" }]
        },
        node15: {
          kind: "human", lane: "lane3", statusId: 4, us: "US-156", name: "Generarea taxelor automate",
          bpmn: "Modifică taxe și creează notă de plată", form: "nota",
          transitions: [{ id: "genereazaNota", label: "Generează nota de plată", target: "RecordState5", kind: "advance", category: "adaugTaxe", icon: "receipt-check" }]
        },
        RecordState5: { kind: "server", next: "node16" },
        node16: {
          kind: "human", lane: "lane1", statusId: 4, us: "US-17", name: "Achitare notă de plată (MPay)", bpmn: "Achită MPay",
          transitions: [{ id: "achitat", label: "Plata a fost confirmată", target: "node17", kind: "advance", category: "plata", icon: "receipt-check" }]
        },
        node14: {
          kind: "human", lane: "lane5", statusId: 2, us: "US-121", name: "Crearea proiectului deciziei de respingere",
          bpmn: "Creează proiectul deciziei de respingere", form: "respingere",
          transitions: [
            { id: "inainteRespingere", label: "Înainte", target: "RecordState2", kind: "advance", category: "proiectDecizie", icon: "document" },
            { id: "cerereIncompletaR", label: "Cerere incompletă", target: "node6", kind: "return", category: "proiectDecizie", icon: "arrow-left" }
          ]
        },
        node17: {
          kind: "human", lane: "lane5", statusId: 2, us: "US-120", name: "Crearea proiectului de act permisiv",
          bpmn: "Creează proiectul actului", form: "act",
          transitions: [
            { id: "inainteAct", label: "Înainte", target: "RecordState8", kind: "advance", category: "proiectDecizie", icon: "document" },
            { id: "cerereIncompletaA", label: "Cerere incompletă", target: "node6", kind: "return", category: "proiectDecizie", icon: "arrow-left" }
          ]
        },
        RecordState8: { kind: "server", next: "RecordState2" },
        RecordState2: {
          kind: "human", lane: "lane8", statusId: 2, us: "US-122", name: "Coordonarea actului/deciziei", bpmn: "Coordonează",
          transitions: [{ id: "coordoneazaDecizia", label: "Coordonează", target: "node18", kind: "advance", category: "coordonare", icon: "check-all" }]
        },
        node18: { kind: "decision", question: "Aprobare secundară?", guard: "SecondaryApproval", yes: "node19", no: "node20" },
        node19: {
          kind: "human", lane: "lane7", statusId: 9, us: "US-123", name: "Verifică și semnează MSign", bpmn: "Semnează actul/decizia MSign",
          transitions: [{ id: "semneazaDirector", label: "Semnează (MSign)", target: "node21", kind: "advance", category: "semnare", icon: "signature" }]
        },
        node20: {
          kind: "human", lane: "lane8", statusId: 9, us: "US-123", name: "Semnează MSign", bpmn: "Semnează actul/decizia MSign",
          transitions: [{ id: "semneaza", label: "Semnează (MSign)", target: "node21", kind: "advance", category: "semnare", icon: "signature" }]
        },
        node21: { kind: "decision", question: "Eliberarea pe hârtie?", guard: "IsPaperPermit", yes: "end", no: "end" },
        end: { kind: "terminal", statusId: 9, name: "Dosar finalizat" }
      }
    };
  }

  /* §2 / §4 — Flux Simplificat fără Supervizor: no Supervisor; the Specialist distributes
     and signs simple decisions; no coordination step; suspension is signed by the
     Director only. */
  function simplifiedFlow() {
    var f = complexFlow();
    var n = f.nodes;
    f.id = "simplified";
    f.name = "Flux Simplificat fără Supervizor";
    f.file = "data/flows/ProcesFluxSimplificatFaraSupervizor.json";
    n.node5.lane = "lane5";
    n.node20.lane = "lane5";
    n.node7.yes = "node10";
    delete n.RecordState1;
    delete n.RecordState2;
    n.node10.transitions = [
      { id: "semneazaSuspendarea", label: "Semnează decizia", target: "RecordState4", kind: "advance", category: "semnare", icon: "signature" },
      { id: "returneazaSpecialist", label: "Returnează la Specialist", target: "node8", kind: "return", category: "semnare", icon: "arrow-left" }
    ];
    n.RecordState8.next = "node18";
    n.node14.transitions[0].target = "node18";
    f.order = f.order.filter(function (id) { return n[id]; });
    return f;
  }

  var FLOWS = { complex: complexFlow(), simplified: simplifiedFlow() };

  function getFlow(id) { return FLOWS[id] || FLOWS.complex; }

  /* §4 critical engine behaviour — walk decision and server nodes until a human or
     terminal node (or the suspended pseudo-state) is reached */
  function resolve(flow, target, vars, choice) {
    var seen = 0;
    var id = target;
    while (seen++ < 50) {
      if (id === SUSPENDED) return { stateId: "node6", suspended: true };
      var node = flow.nodes[id];
      if (!node) throw new Error("case-flow: unknown node " + id + " in " + flow.id);
      if (node.kind === "human" || node.kind === "terminal") return { stateId: id, suspended: false };
      if (node.kind === "server") { id = node.next; continue; }
      if (node.choice) { id = node.choice[choice] || node.choice.aprobare; continue; }
      id = vars && vars[node.guard] ? node.yes : node.no;
    }
    throw new Error("case-flow: no resting node from " + target);
  }

  function statusId(flow, state) {
    if (state.suspended) return 3;
    var node = flow.nodes[state.stateId];
    return node ? node.statusId : 0;
  }

  function laneOf(flow, stateId) {
    var node = flow.nodes[stateId];
    return node && node.lane ? LANES[node.lane] : null;
  }

  function banned(role, category) {
    var bans = ROLE_BANS[role];
    if (!bans) return false;
    return bans === "*" || bans.indexOf(category) !== -1;
  }

  /* §6–§9 — what the current role may do at the current step.
     ctx: { role, vars, pendingFees, activeReviews }
     returns { step, lane, items: [{ id, label, kind, icon, form, target, disabled, reason, demo }], note } */
  function available(flow, state, ctx) {
    var node = flow.nodes[state.stateId];
    var lane = laneOf(flow, state.stateId);
    var out = { step: node, lane: lane, items: [], note: "" };
    if (!node || node.kind === "terminal") {
      out.note = "Dosarul este finalizat. Nu mai există acțiuni de proces.";
      return out;
    }
    if (!lane.role) {
      out.note = "Acest pas aparține rolului " + lane.title + ". Dosarul așteaptă acțiunea lui; nu puteți acționa din back office.";
    } else if (lane.role !== ctx.role) {
      out.note = "Acest pas aparține rolului " + lane.title + ". Nu puteți acționa din rolul dvs.";
    } else if (ROLE_BANS[ctx.role] === "*") {
      out.note = "Rolul dvs. are acces doar la vizualizare.";
    }
    var mayAct = lane.role && lane.role === ctx.role && ROLE_BANS[ctx.role] !== "*";

    if (mayAct) {
      var kindOrder = { advance: 0, branch: 1, return: 2 };
      node.transitions.slice().sort(function (a, b) { return kindOrder[a.kind] - kindOrder[b.kind]; }).forEach(function (t) {
        if (banned(ctx.role, t.category)) return;
        /* US-116: no suspension button while the case is already suspended */
        if (t.id === "suspendare" && state.suspended) return;
        var item = { id: t.id, label: t.label, kind: t.kind, icon: t.icon, form: t.form || node.form || null, disabled: false, reason: "", patched: !!t.patched };
        item.target = describeTarget(flow, t, ctx.vars);
        if (t.blockable) {
          /* §7 — advancing is blocked, never hidden */
          if (state.suspended) { item.disabled = true; item.reason = "Dosarul este suspendat. Examinarea se reia după completarea informațiilor."; }
          else if (ctx.pendingFees > 0) { item.disabled = true; item.reason = "Există taxe în așteptare. Se poate avansa după ce toate sunt achitate, anulate sau expirate."; }
          else if (ctx.activeReviews > 0) { item.disabled = true; item.reason = "Există avize interinstituționale active. Se poate avansa după ce toate sunt finalizate, revocate sau expirate."; }
        }
        out.items.push(item);
      });
      (node.operations || []).forEach(function (o) {
        if (banned(ctx.role, o.category)) return;
        if (state.suspended) return;
        out.items.push({ id: o.id, label: o.label, kind: "operation", icon: o.icon, form: o.form, disabled: false, reason: "", target: "Dosarul rămâne la acest pas" });
      });
      if (state.suspended && state.stateId === "node6") {
        /* stand-in for the info-supplement sub-process (open item 6) */
        out.items.push({ id: "reiaExaminarea", label: "Reia examinarea", kind: "operation", icon: "checkmark-large", form: null, disabled: false, reason: "", target: "Informațiile au fost completate", demo: true });
      }
    }
    if (state.stateId === "node16") {
      /* the applicant pays in MPay; the prototype simulates the confirmation */
      out.items.push({ id: "achitat", label: "Simulează achitarea (MPay)", kind: "advance", icon: "receipt-check", form: null, disabled: false, reason: "", target: describeTarget(flow, node.transitions[0], ctx.vars), demo: true });
    }
    return out;
  }

  function describeTarget(flow, t, vars) {
    if (t.target === "node12") return "Aprobare sau respingere";
    var r = resolve(flow, t.target, vars, "aprobare");
    if (r.suspended) return "Dosar suspendat";
    var node = flow.nodes[r.stateId];
    var lane = laneOf(flow, r.stateId);
    return node.kind === "terminal" ? node.name : node.name + (lane ? " · " + lane.title : "");
  }

  /* apply one transition or operation; returns the next state (state is not mutated) */
  function apply(flow, state, actionId, opts) {
    opts = opts || {};
    var node = flow.nodes[state.stateId];
    var next = { stateId: state.stateId, suspended: !!state.suspended, decision: state.decision || null, resumed: !!state.resumed };
    if (actionId === "reiaExaminarea") { next.suspended = false; next.resumed = true; return next; }
    var t = (node.transitions || []).filter(function (x) { return x.id === actionId; })[0];
    if (!t) return next; /* an operation: the case stays where it is */
    var r = resolve(flow, t.target, opts.vars, opts.choice);
    next.stateId = r.stateId;
    if (r.suspended) next.suspended = true;
    if (t.target === "node12") next.decision = opts.choice === "respingere" ? "respingere" : "aprobare";
    return next;
  }

  /* where a case of the list (by its coarse list status) rests in the process */
  function initialState(flow, listStatus, opts) {
    opts = opts || {};
    switch (listStatus) {
      case "depus":
        return opts.hasSpecialist ? { stateId: "node6", suspended: false } : resolve(flow, "node3", opts.vars);
      case "inExaminare":
        return { stateId: "node6", suspended: !!opts.suspended };
      case "spreCoordonare":
        return flow.nodes.RecordState2 ? { stateId: "RecordState2", suspended: false } : resolve(flow, "node18", opts.vars);
      case "spreSemnare":
        return resolve(flow, "node18", opts.vars);
      case "semnat": case "eliberat": case "respins": case "arhivat":
        return { stateId: "end", suspended: false };
      default:
        return null;
    }
  }

  /* the list's coarse status for a resting node (keeps the registry in step) */
  function listStatus(flow, state) {
    if (state.stateId === "end") return state.decision === "respingere" ? "respins" : "semnat";
    if (state.stateId === "node5") return "depus";
    if (state.stateId === "RecordState2") return "spreCoordonare";
    if (state.stateId === "node19" || state.stateId === "node20") return "spreSemnare";
    return "inExaminare";
  }

  return {
    STATUS: STATUS,
    LANES: LANES,
    ROLE_BANS: ROLE_BANS,
    getFlow: getFlow,
    resolve: resolve,
    statusId: statusId,
    laneOf: laneOf,
    available: available,
    apply: apply,
    initialState: initialState,
    listStatus: listStatus
  };
});
