/**
 * core/service-passport.js — Pașaportul Serviciului domain rules.
 *
 * Sources: Feature 90575 (Configurarea Pașaportului Serviciului), User Story
 * 90576 [US-111] (sincronizare din RSSP) and Feature 93591 (Plăți și tarife).
 * Pure functions: no DOM, no globals, every branch reachable from Node
 * (test/service-passport.test.mjs). The shell only renders what these return.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).servicePassport = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TITLE_MAX = 250;
  var OBJECTIVE_MAX = 350;
  var DURATION_MAX = 255;

  /* US-111 texts, verbatim where the story gives them */
  var MESSAGES = {
    required: "Câmpul «Cod serviciu RSSP» este obligatoriu.",
    unavailable: "Serviciul RSSP este momentan indisponibil. Încercați mai târziu.",
    notFound: function (code) { return "Serviciul cu codul " + code + " nu a fost găsit în RSSP."; },
    invalid: "RSSP a returnat un răspuns invalid: structura datelor nu corespunde contractului GET api/public-service/code/{cod}."
  };

  /* RSSP `types` bitmask: bit 1 → tip solicitant 1, bit 2 → tip solicitant 2.
     ⚠ Which bit is PF and which PJ is an assumption to confirm with RSSP. */
  var APPLICANT_TYPES = [
    { bit: 1, id: 1, label: "Persoană fizică" },
    { bit: 2, id: 2, label: "Persoană juridică" }
  ];

  var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

  function ro(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value.ro || "";
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) : text;
  }

  /* title → Denumirea serviciului: RO only, spaces normalised, ≤ 250 chars */
  function normalizeTitle(title) {
    return truncate(ro(title).replace(/\s+/g, " ").trim(), TITLE_MAX);
  }

  function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (match, entity) {
      if (entity[0] === "#") {
        var code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return isFinite(code) ? String.fromCharCode(code) : match;
      }
      var named = ENTITIES[entity.toLowerCase()];
      return named == null ? match : named;
    });
  }

  /* objective → Descrierea serviciului: RO only, HTML stripped (not rendered),
     entities decoded, ≤ 350 chars */
  function plainObjective(objective) {
    var text = ro(objective)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|li|div|h\d)>/gi, " ")
      .replace(/<[^>]*>/g, "");
    return truncate(decodeEntities(text).replace(/\s+/g, " ").trim(), OBJECTIVE_MAX);
  }

  function applicantTypes(mask) {
    var value = Number(mask) || 0;
    return APPLICANT_TYPES.filter(function (type) { return (value & type.bit) === type.bit; });
  }

  function toNumber(value) {
    var n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    return isFinite(n) ? n : null;
  }

  /* first cost with durationValue > 0, rounded up and capped at 255;
     WorkDay → zile lucrătoare, anything else → zile calendaristice */
  function subServiceDuration(costs) {
    var first = (costs || []).filter(function (cost) { return toNumber(cost.durationValue) > 0; })[0];
    if (!first) return null;
    return {
      value: Math.min(Math.ceil(toNumber(first.durationValue)), DURATION_MAX),
      unit: first.durationUnit === "WorkDay" ? "zile lucrătoare" : "zile calendaristice"
    };
  }

  function subServicePrice(costs) {
    var first = (costs || [])[0];
    if (!first) return null;
    var price = toNumber(first.price);
    return price == null ? null : { amount: price, currency: first.currency || "MDL" };
  }

  /* subServices[] is the only array actually imported; disabled ones are dropped */
  function importSubServices(subServices) {
    var all = subServices || [];
    var kept = all.filter(function (sub) { return !sub.isDisabled; });
    return {
      ignored: all.length - kept.length,
      items: kept.map(function (sub) {
        return {
          id: sub.id || null,
          title: normalizeTitle(sub.title),
          type: normalizeTitle(sub.subServiceType && sub.subServiceType.title),
          duration: subServiceDuration(sub.costs),
          price: subServicePrice(sub.costs)
        };
      })
    };
  }

  function deliveryOptions(rssp) {
    var options = [];
    if (rssp.eService) options.push("Electronic");
    if (rssp.allowsMDelivery) options.push("MDelivery");
    return options;
  }

  function validateResponse(rssp) {
    return Boolean(
      rssp && typeof rssp === "object" &&
      typeof rssp.code === "string" && rssp.code &&
      normalizeTitle(rssp.title) &&
      rssp.organization && typeof rssp.organization.idno === "string" && rssp.organization.idno
    );
  }

  /* The RSSP-owned half of a passport. Read-only in GEAP. */
  function mapRsspService(rssp) {
    var subs = importSubServices(rssp.subServices);
    return {
      code: rssp.code,
      mpowerCode: rssp.allowsMPower ? rssp.code : null,
      title: normalizeTitle(rssp.title),
      objective: plainObjective(rssp.objective),
      isPermissiveAct: Boolean(rssp.isPermissiveAct),
      paid: Boolean(rssp.allowsMPay),
      allowsMDelivery: Boolean(rssp.allowsMDelivery),
      allowsMPower: Boolean(rssp.allowsMPower),
      delivery: deliveryOptions(rssp),
      applicantTypes: applicantTypes(rssp.types).map(function (type) { return type.label; }),
      subServices: subs.items,
      ignoredSubServices: subs.ignored,
      documents: (rssp.documents || []).map(function (doc) {
        return { title: normalizeTitle(doc.title), required: doc.type === "required" };
      }),
      validity: (rssp.validityPeriods || []).map(function (period) {
        return { validFor: period.validFor, description: plainObjective(period.description) };
      }),
      rsspStatus: rsspStatus(rssp)
    };
  }

  /* ⚠ US-111 risk: Publicat / Statut / Activ have no confirmed mapping in the
     RSSP JSON. Assumed here: isActive === false → Inactiv, published === false
     → Nepublicat, otherwise Publicat. GEAP only reflects it (read-only). */
  function rsspStatus(rssp) {
    if (rssp.isActive === false) return "Inactiv";
    if (rssp.published === false) return "Nepublicat";
    return "Publicat";
  }

  function authorityFromRssp(org) {
    return {
      id: "aut-" + org.idno,
      idno: org.idno,
      code: org.code || "",
      name: normalizeTitle(org.name),
      shortName: org.code || normalizeTitle(org.name),
      address: org.address || "",
      source: "RSSP"
    };
  }

  function event(now, user, type, status, detail) {
    return { at: now, user: user, type: type, status: status, detail: detail };
  }

  /**
   * US-111 end to end, minus the network. `lookup(code)` returns
   * { status: "ok", data } | { status: "unavailable" } | { status: "notFound" }.
   * Never mutates its inputs; the caller commits `services`/`authorities`.
   */
  function syncService(input) {
    var code = String(input.code == null ? "" : input.code).trim();
    var now = input.now;
    var user = input.user;

    if (!code) {
      /* no call to RSSP, nothing logged: this is field validation */
      return { ok: false, reason: "required", message: MESSAGES.required, events: [] };
    }

    var fail = function (reason, message) {
      return {
        ok: false, reason: reason, message: message,
        events: [event(now, user, "Sincronizare serviciu", "Eșuat", "Cod " + code + ": " + message)]
      };
    };

    var response = input.lookup(code);
    if (!response || response.status === "unavailable") return fail("unavailable", MESSAGES.unavailable);
    if (response.status === "notFound") return fail("notFound", MESSAGES.notFound(code));
    if (!validateResponse(response.data)) return fail("invalid", MESSAGES.invalid);

    var rssp = response.data;
    var mapped = mapRsspService(rssp);
    var services = input.services || [];
    var authorities = input.authorities || [];
    var existing = services.filter(function (s) { return s.code === mapped.code; })[0] || null;
    var authority = authorities.filter(function (a) { return a.idno === rssp.organization.idno; })[0] || null;
    var authorityCreated = !authority;
    if (!authority) authority = authorityFromRssp(rssp.organization);

    var service = Object.assign({}, existing || { geap: emptyGeapConfig(mapped) }, {
      rssp: mapped,
      code: mapped.code,
      title: mapped.title,
      authorityId: authority.id,
      status: mapped.rsspStatus,
      lastSync: now,
      syncedBy: user
    });

    var events = [event(now, user, "Sincronizare serviciu", "Reușit", "Cod " + code + " preluat din RSSP")];
    events.push(existing
      ? event(now, user, "Actualizare serviciu", "Reușit", "Datele RSSP ale serviciului au fost actualizate")
      : event(now, user, "Creare serviciu", "Reușit", "Pașaport nou: " + mapped.title));
    events.push(authorityCreated
      ? event(now, user, "Creare autoritate", "Reușit", authority.name + " (IDNO " + authority.idno + ")")
      : event(now, user, "Legare cu autoritate", "Reușit", authority.name + " (IDNO " + authority.idno + ")"));

    return {
      ok: true,
      kind: existing ? "updated" : "created",
      service: service,
      authority: authority,
      authorityCreated: authorityCreated,
      summary: {
        code: mapped.code,
        title: mapped.title,
        applicantTypes: mapped.applicantTypes,
        subServices: mapped.subServices.length,
        ignoredSubServices: mapped.ignoredSubServices,
        documents: mapped.documents.length,
        flags: {
          "Act permisiv": mapped.isPermissiveAct,
          "Serviciu cu plată (MPay)": mapped.paid,
          "MDelivery": mapped.allowsMDelivery,
          "MPower": mapped.allowsMPower
        }
      },
      events: events
    };
  }

  /* A brand-new passport: request types seeded from RSSP sub-services, with
     no process flow or forms yet (the GEAP half is configured afterwards). */
  function emptyGeapConfig(mapped) {
    return {
      version: "v1.0.0",
      requestTypes: mapped.subServices.map(function (sub, index) {
        /* the examination term starts from the RSSP duration; editable in GEAP */
        return {
          id: "rt-" + (index + 1), name: sub.title, source: "RSSP", flow: null, form: null,
          term: sub.duration ? { value: sub.duration.value, unit: sub.duration.unit } : null,
          actions: {}
        };
      }),
      forms: [], payments: [], dependencies: [], classifiers: [], templates: [],
      notifications: [], settings: null, events: []
    };
  }

  /* ---- request types -------------------------------------------------- */
  function requestTypeState(requestType) {
    if (!requestType.flow) return { label: "Fără flux", tone: "warning" };
    if (!requestType.form) return { label: "Fără formular", tone: "warning" };
    return { label: "Configurat", tone: "success" };
  }

  /* ---- forms per process action ----------------------------------------
     Each action of the flow opens the process's default form (or none). A
     request type may override it; overrides are stored by "step/action" key
     and only when they differ from the default. NO_FORM = explicitly none. */
  var NO_FORM = "__none";

  function actionKey(step, action) {
    return step.id + "/" + action.id;
  }

  function actionForm(step, action, overrides) {
    var key = actionKey(step, action);
    var map = overrides || {};
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return { form: map[key] === NO_FORM ? null : map[key], overridden: true };
    }
    return { form: action.defaultForm || null, overridden: false };
  }

  function setActionForm(overrides, step, action, value) {
    var next = Object.assign({}, overrides || {});
    var key = actionKey(step, action);
    var isDefault = value === "" || value == null ||
      value === (action.defaultForm || NO_FORM);
    if (isDefault) delete next[key];
    else next[key] = value;
    return next;
  }

  function flowActions(flow) {
    var list = [];
    ((flow && flow.steps) || []).forEach(function (step) {
      step.actions.forEach(function (action) { list.push({ step: step, action: action }); });
    });
    return list;
  }

  /* ---- flow definitions (the process designer's JSON) ------------------
     States of kind Human (a person acts) and Hybrid (a decision, evaluated by
     the system) are the steps; their transitions are the actions. A
     transition's formName is the process default form of that action. Steps
     are listed in process order (breadth-first from the initial state). */
  function slugify(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function eventLabel(event) {
    var text = normalizeTitle(event || "");
    return text === "next" ? "Continuă" : text;
  }

  function stepsFromDefinition(def) {
    var byId = {};
    (def.states || []).forEach(function (state) { byId[state.id] = state; });
    var lanes = {};
    (def.lanes || []).forEach(function (lane) { lanes[lane.id] = normalizeTitle(lane.title || ""); });

    var order = [];
    var seen = {};
    var queue = [def.initialState];
    while (queue.length) {
      var id = queue.shift();
      if (!id || seen[id] || !byId[id]) continue;
      seen[id] = true;
      order.push(byId[id]);
      (byId[id].transitions || []).forEach(function (t) { queue.push(t.target); });
    }
    (def.states || []).forEach(function (state) { if (!seen[state.id]) order.push(state); });

    return order.filter(function (state) {
      return state.kind === "Human" || state.kind === "Hybrid";
    }).map(function (state) {
      var used = {};
      return {
        id: state.id,
        name: normalizeTitle(state.title),
        auto: state.kind === "Hybrid",
        lane: lanes[(state.properties || {}).laneId] || "",
        actions: (state.transitions || []).map(function (t, index) {
          var base = slugify(t.event) || "actiune";
          var actionId = used[base] ? base + "-" + (index + 1) : base;
          used[base] = true;
          return { id: actionId, name: eventLabel(t.event), defaultForm: t.formName || null, target: t.target, index: index };
        })
      };
    });
  }

  function definitionForms(def) {
    var names = [];
    (def.states || []).forEach(function (state) {
      (state.transitions || []).forEach(function (t) {
        if (t.formName && names.indexOf(t.formName) === -1) names.push(t.formName);
      });
    });
    return names;
  }

  /* overrides left over from another flow do not count */
  function overrideCount(requestType, flow) {
    return flowActions(flow).filter(function (item) {
      return actionForm(item.step, item.action, requestType.actions).overridden;
    }).length;
  }

  /* ---- payments (Feature 93591) ---------------------------------------- */
  function paymentActions(payment) {
    var acts = [];
    if (payment.state === "Schiță") {
      acts.push("publish", "delete");
    } else if (payment.active) {
      acts.push("deactivate");
    } else {
      acts.push("activate");
      if (!payment.usage) acts.push("delete");
    }
    return acts;
  }

  /* An automatic payment needs ≥ 1 published tariff before it can be published */
  function canPublish(payment) {
    if (payment.generation === "Automat" && !(payment.tariffs || []).length) {
      return { ok: false, message: "O plată automată necesită cel puțin un tarif înainte de publicare." };
    }
    return { ok: true };
  }

  /* Only one active payment per Tip solicitare + Moment generare */
  function activationConflict(payments, payment) {
    return (payments || []).filter(function (other) {
      return other.id !== payment.id && other.active && other.state === "Publicat" &&
        other.requestType === payment.requestType && other.moment === payment.moment;
    })[0] || null;
  }

  /* ---- eAPL sync (registrul local al actelor permisive) -----------------
     Some services are synced from RSSP, eAPL or both (BO: „se poate integra cu
     RSSP și cu eAPL"). eAPL only enriches an existing service with its local
     data; a new service is always created from RSSP (US-111). */
  var EAPL_MESSAGES = {
    unavailable: "Serviciul eAPL este momentan indisponibil. Încercați mai târziu.",
    notFound: function (code) { return "Serviciul cu codul " + code + " nu a fost găsit în eAPL."; },
    newService: "Un serviciu nou se creează doar din RSSP. Alege sursa RSSP sau RSSP + eAPL."
  };

  function syncFromEapl(input) {
    var code = String(input.code || "").trim();
    var event = function (status, detail) {
      return { at: input.now, user: input.user, type: "Sincronizare serviciu (eAPL)", status: status, detail: detail };
    };
    if (!code) return { ok: false, message: MESSAGES.required, events: [] };
    if (!input.service) return { ok: false, reason: "newService", message: EAPL_MESSAGES.newService, events: [] };
    var answer = input.lookup(code) || {};
    if (answer.status === "unavailable") {
      return { ok: false, reason: "unavailable", message: EAPL_MESSAGES.unavailable, events: [event("Eșuat", EAPL_MESSAGES.unavailable)] };
    }
    if (answer.status !== "ok" || !answer.data) {
      var notFound = EAPL_MESSAGES.notFound(code);
      return { ok: false, reason: "notFound", message: notFound, events: [event("Eșuat", notFound)] };
    }
    var data = answer.data;
    var service = Object.assign({}, input.service, {
      lastSync: input.now,
      syncedBy: input.user,
      eapl: {
        authority: data.localAuthority,
        fee: data.localFee || null,
        term: data.localTerm || null,
        register: data.register || "eAPL",
        updatedOn: data.updatedOn || null,
        syncedAt: input.now
      }
    });
    return {
      ok: true,
      service: service,
      summary: { authority: data.localAuthority, fee: data.localFee || null, term: data.localTerm || null },
      events: [event("Reușit", (data.localAuthority && data.localAuthority.name) || code)]
    };
  }

  /* ---- payment editor rules (Feature «Plăți și tarife») ----------------- */
  var PAYMENT_MOMENTS = ["La inițierea solicitării", "La examinare", "La avizare", "La luarea deciziei", "După semnare act", "După emitere act"];
  var INITIATION = PAYMENT_MOMENTS[0];

  /* the designer JSON marks payment steps with properties.momentId (1-based) */
  function momentsFromDefinition(def) {
    var found = [];
    (def.states || []).forEach(function (state) {
      var id = (state.properties || {}).momentId;
      var name = PAYMENT_MOMENTS[id - 1];
      if (name && found.indexOf(name) === -1) found.push(name);
    });
    return found;
  }

  /* a moment needs a payment branch in the request type's flow — except the
     initiation of the request (BO/FO), where the branch is always present */
  function momentAllowed(flow, moment) {
    if (moment === INITIATION) return true;
    return Boolean(flow) && (flow.paymentMoments || []).indexOf(moment) !== -1;
  }

  /* eligible = published + active, global or this service's; an automatic
     payment cannot take a tariff whose formula needs user-entered variables */
  function tariffEligibility(tariff, serviceCode, generation) {
    if (tariff.scope !== "global" && tariff.scope !== serviceCode) return { ok: false, reason: "Tarif al altui serviciu" };
    if (tariff.state !== "Publicat") return { ok: false, reason: "Tarif nepublicat" };
    if (!tariff.active) return { ok: false, reason: "Tarif inactiv" };
    if (generation === "Automat" && tariff.userVariables) {
      return { ok: false, reason: "Formula cere variabile completate la generarea notei — doar plată manuală" };
    }
    return { ok: true };
  }

  function positiveInt(value, max) {
    var text = String(value == null ? "" : value).trim();
    return /^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= max;
  }

  /* field → message; empty object = valid. publish adds the tariff rule. */
  function validatePayment(payment, context) {
    var ctx = context || {};
    var errors = {};
    if (!payment.requestType) errors.requestType = "Selectează tipul de solicitare.";
    if (!payment.moment) {
      errors.moment = "Selectează momentul generării.";
    } else if (!momentAllowed(ctx.flow, payment.moment)) {
      errors.moment = ctx.flow
        ? "Fluxul „" + ctx.flow.name + "” nu are ramificație de plată la momentul „" + payment.moment + "”."
        : "Tipul de solicitare nu are flux de procesare — doar „" + INITIATION + "” e disponibil.";
    }
    if (payment.moment === INITIATION && payment.generation !== "Automat") {
      errors.generation = "La inițierea solicitării plata e întotdeauna automată.";
    }
    if (!positiveInt(payment.term, 365)) errors.term = "Introdu termenul de achitare, între 1 și 365 de zile.";
    if (payment.generation === "Automat" && (payment.exemptions || []).length) {
      errors.exemptions = "O plată automată nu poate avea elemente de scutire.";
    }
    if (payment.recurring) {
      if (!payment.recurring.frequency) errors.frequency = "Selectează frecvența recurenței.";
      else if (payment.recurring.frequency === "Interval" && !positiveInt(payment.recurring.months, 120)) {
        errors.frequency = "Introdu intervalul în luni, între 1 și 120.";
      }
      if (!positiveInt(payment.recurring.noticeDays, 365)) errors.noticeDays = "Introdu numărul de zile, între 1 și 365.";
    }
    if (ctx.publish) {
      var check = canPublish(payment);
      if (!check.ok) errors.tariffs = check.message;
    }
    return errors;
  }

  /* save: a draft stays a draft; editing a published payment bumps its
     version (notes generated earlier keep the old one) */
  function applyPaymentEdit(payment, draft, meta) {
    var next = Object.assign({}, payment || {}, draft);
    if (!payment) {
      next.version = 1;
      next.state = meta.publish ? "Publicat" : "Schiță";
      next.active = false;
      next.usage = 0;
    } else if (payment.state === "Publicat") {
      next.version = (payment.version || 1) + 1;
    } else if (meta.publish) {
      next.state = "Publicat";
    }
    next.modifiedAt = meta.at;
    next.modifiedBy = meta.user;
    return next;
  }

  /* ---- taxes = tariff + application rule (revised 2026-10-02) -------------
     Tariffs are the price list, consumed mostly from RSSP / eAPL. A tax is ONE
     tariff plus the rule the registries do not carry: request type, moment,
     automatic / manual, an optional condition (a classifier value chosen at the
     initiation of the request, e.g. the reason of a reperfectare), how the sum
     is computed (the tariff as is — ~80% of cases — or a reduction of it; a
     formula belongs to the tariff, never to the tax: one formula level only),
     the payment term, exemptions and recurrence. Taxes of the same request type
     and moment end up on one payment note. */
  var TAX_CALC = ["tarif", "reducere"];
  var TAX_CALC_LABELS = { tarif: "Suma tarifului", reducere: "Reducere" };

  /* null / empty values = always applies */
  function conditionApplies(condition, answers) {
    if (!condition || !condition.classifier || !(condition.values || []).length) return true;
    var answer = (answers || {})[condition.classifier];
    return answer != null && condition.values.indexOf(answer) !== -1;
  }

  /* two conditions can be true for the same request */
  function conditionsOverlap(a, b) {
    var always = function (c) { return !c || !c.classifier || !(c.values || []).length; };
    if (always(a) || always(b)) return true;
    if (a.classifier !== b.classifier) return true;
    return a.values.some(function (value) { return b.values.indexOf(value) !== -1; });
  }

  /* the same tariff cannot be charged twice for one request: another active
     tax with the same tariff, request type and moment whose condition overlaps */
  function taxConflict(taxes, tax) {
    return (taxes || []).filter(function (other) {
      return other.id !== tax.id && other.active && other.state === "Publicat" &&
        other.tariffId === tax.tariffId && other.requestType === tax.requestType &&
        other.moment === tax.moment && conditionsOverlap(other.condition, tax.condition);
    })[0] || null;
  }

  /* the tariff's own sum: its amount, or its formula on the case values
     (those may be missing until the payment note is generated) */
  function tariffAmount(tariff, values) {
    if (tariff && tariff.formula) return evaluateFormula(tariff.expression, values || {}, tariff.rounding);
    var base = Number(tariff && tariff.amount);
    return tariff && String(tariff.amount == null ? "" : tariff.amount).trim() !== "" && isFinite(base) ? { ok: true, value: base } : { ok: false, error: "Tarif fără sumă." };
  }

  /* the sum of a tax = the tariff's sum, optionally reduced by a percent */
  function taxAmount(tax, tariff, values) {
    var sum = tariffAmount(tariff, values);
    var calc = tax.calc || { mode: "tarif" };
    if (calc.mode !== "reducere" || !sum.ok) return sum;
    var percent = Number(calc.percent);
    if (!isFinite(percent)) return { ok: false, error: "Reducere nevalidă." };
    return { ok: true, value: Math.round(sum.value * (100 - percent)) / 100 };
  }

  /* service tariffs no tax uses yet — the ones still to configure */
  function unconfiguredTariffs(tariffs, taxes, serviceCode) {
    var used = (taxes || []).map(function (tax) { return tax.tariffId; });
    return (tariffs || []).filter(function (t) { return t.scope === serviceCode && used.indexOf(t.id) === -1; });
  }

  /* "Aplică ca atare": the tariff as is, automatic at the initiation of the
     request it came with (RSSP / eAPL carry the request type) */
  function defaultTaxForTariff(tariff, context) {
    var ctx = context || {};
    return {
      tariffId: tariff.id,
      requestType: tariff.requestType || ctx.requestType || "",
      moment: INITIATION,
      generation: "Automat",
      condition: null,
      calc: { mode: "tarif" },
      term: ctx.term || 5,
      exemptions: [],
      removable: false,
      recurring: null
    };
  }

  function canPublishTax(tax) {
    return tax.tariffId ? { ok: true } : { ok: false, message: "Alege tariful taxei înainte de publicare." };
  }

  /* the payment rules plus tariff, condition and calculation */
  function validateTax(tax, context) {
    var ctx = context || {};
    var errors = validatePayment(Object.assign({}, tax, { tariffs: [tax.tariffId].filter(Boolean) }), { flow: ctx.flow });
    if (!tax.tariffId) errors.tariffId = "Alege tariful din care se calculează taxa.";
    else if (ctx.tariff) {
      var eligible = tariffEligibility(ctx.tariff, ctx.serviceCode, tax.generation);
      if (!eligible.ok) errors.tariffId = eligible.reason + ".";
    }
    var c = tax.condition;
    if (c) {
      if (!c.classifier) errors.conditionClassifier = "Alege clasificatorul de care depinde taxa.";
      else if (!(c.values || []).length) errors.conditionValues = "Bifează cel puțin o valoare pentru care se aplică taxa.";
    }
    var calc = tax.calc || { mode: "tarif" };
    if (TAX_CALC.indexOf(calc.mode) === -1) errors.calc = "Alege modul de calcul.";
    if (calc.mode === "reducere" && !positiveInt(calc.percent, 100)) errors.percent = "Introdu reducerea în procente, între 1 și 100.";
    return errors;
  }

  /* ---- tariff classifier (Feature «Gestionarea clasificatorului de tarife») ----
     One model for global and service tariffs. RSSP / eAPL tariffs keep their
     registry fields read-only. Editing a published tariff creates a new
     version (payment notes keep the version they were generated with). */
  var TARIFF_LOCKED_FIELDS = ["name", "amount", "currency", "requestType", "iban", "legalBasis"];
  var ROUNDING = {
    "2 zecimale": function (v) { return Math.round(v * 100) / 100; },
    "1 zecimală": function (v) { return Math.round(v * 10) / 10; },
    "Fără zecimale (întreg)": function (v) { return Math.round(v); },
    "Rotunjire în sus la leu": function (v) { return Math.ceil(v); }
  };

  function tariffLocked(tariff, field) {
    return (tariff.source === "RSSP" || tariff.source === "eAPL") && TARIFF_LOCKED_FIELDS.indexOf(field) !== -1;
  }

  function formulaVariables(expression) {
    var found = [];
    String(expression || "").replace(/\{([a-z0-9_]+)\}/gi, function (match, name) {
      if (found.indexOf(name) === -1) found.push(name);
      return match;
    });
    return found;
  }

  /* safe arithmetic only: numbers, + - * / ( ) after the {variables} are filled */
  function evaluateFormula(expression, values, rounding) {
    var text = String(expression || "").trim();
    if (!text) return { ok: false, error: "Formula este goală." };
    var missing = formulaVariables(text).filter(function (name) {
      return values == null || values[name] === "" || values[name] == null || !isFinite(Number(values[name]));
    });
    if (missing.length) return { ok: false, error: "Completează valoarea de test pentru: " + missing.join(", ") + "." };
    var filled = text.replace(/\{([a-z0-9_]+)\}/gi, function (match, name) { return "(" + Number(values[name]) + ")"; });
    if (!/^[\d\s+\-*/().,]+$/.test(filled)) return { ok: false, error: "Formula poate conține doar numere, variabile {nume} și + − × ÷ ( )." };
    var result;
    try {
      /* eslint-disable-next-line no-new-func */
      result = Function("return (" + filled.replace(/,/g, ".") + ");")();
    } catch (error) {
      return { ok: false, error: "Formula nu este validă." };
    }
    if (typeof result !== "number" || !isFinite(result)) return { ok: false, error: "Formula nu dă un număr." };
    var round = ROUNDING[rounding] || ROUNDING["2 zecimale"];
    return { ok: true, value: round(result) };
  }

  /* options.variables = the formula variable catalogue (keys); a formula may use only these */
  function validateTariff(tariff, options) {
    var errors = {};
    var known = options && options.variables;
    var isService = tariff.scope && tariff.scope !== "global";
    if (!String(tariff.name || "").trim()) errors.name = "Introdu denumirea tarifului (RO).";
    if (!tariff.type) errors.type = "Selectează tipul tarifului.";
    if (!tariff.formula && !/^\d+([.,]\d{1,2})?$/.test(String(tariff.amount == null ? "" : tariff.amount).trim())) errors.amount = "Introdu suma, un număr cu cel mult două zecimale.";
    if (!tariff.currency) errors.currency = "Selectează valuta.";
    if (isService && !tariff.requestType) errors.requestType = "Selectează tipul solicitării.";
    if (isService && !tariff.personType) errors.personType = "Selectează tipul persoanei.";
    if (tariff.iban && !/^MD\d{2}[A-Z0-9]{20}$/.test(String(tariff.iban).replace(/\s+/g, ""))) errors.iban = "IBAN-ul nu este valid (MD + 22 caractere).";
    if (tariff.formula) {
      if (!String(tariff.expression || "").trim()) {
        errors.expression = "Introdu expresia formulei.";
      } else {
        var probe = {};
        formulaVariables(tariff.expression).forEach(function (name) { probe[name] = 1; });
        var unknown = known ? formulaVariables(tariff.expression).filter(function (name) { return known.indexOf(name) === -1; }) : [];
        var check = evaluateFormula(tariff.expression, probe, tariff.rounding);
        if (unknown.length) errors.expression = "Variabila " + unknown.map(function (name) { return "{" + name + "}"; }).join(", ") + " nu există în catalog. Elimin-o și alege una din listă.";
        else if (!check.ok) errors.expression = check.error;
      }
      if (!tariff.rounding) errors.rounding = "Selectează regula de rotunjire.";
    }
    if (!tariff.validFrom) errors.validFrom = "Introdu data de la care tariful este valabil.";
    if (tariff.validFrom && tariff.validTo && tariff.validTo < tariff.validFrom) errors.validTo = "„Valabil până la” nu poate fi înainte de „Valabil de la”.";
    return errors;
  }

  var TARIFF_TRACKED = [
    ["name", "Denumire"], ["nameRu", "Denumire RU"], ["nameEn", "Denumire EN"], ["type", "Tip"], ["amount", "Sumă"],
    ["currency", "Valută"], ["legalBasis", "Temei legal"], ["iban", "IBAN"], ["requestType", "Tip solicitare"],
    ["personType", "Tip persoană"], ["subdivision", "Subdiviziune"], ["formula", "Formulă"], ["expression", "Expresie"],
    ["rounding", "Rotunjire"], ["validFrom", "Valabil de la"], ["validTo", "Valabil până la"]
  ];

  function tariffChanges(before, after) {
    return TARIFF_TRACKED.filter(function (pair) {
      return String(before[pair[0]] == null ? "" : before[pair[0]]) !== String(after[pair[0]] == null ? "" : after[pair[0]]);
    }).map(function (pair) {
      return pair[0] === "amount" ? "Sumă " + before.amount + " → " + after.amount : pair[1];
    });
  }

  function applyTariffEdit(existing, draft, meta) {
    var next = Object.assign({}, existing || {}, draft);
    if (!existing) {
      next.version = 1;
      next.state = meta.publish ? "Publicat" : "Schiță";
      next.active = true;
      next.source = next.source || "GEAP";
      next.versions = [{ version: 1, at: meta.at, by: meta.user, note: "Creat" }];
    } else {
      var changes = tariffChanges(existing, next);
      if (existing.state === "Publicat" && changes.length) {
        next.version = (existing.version || 1) + 1;
        next.versions = (existing.versions || []).concat([{ version: next.version, at: meta.at, by: meta.user, note: changes.join(", ") }]);
      } else if (existing.state !== "Publicat" && meta.publish) {
        next.state = "Publicat";
      }
    }
    next.modifiedAt = meta.at;
    next.modifiedBy = meta.user;
    return next;
  }

  /* draft: publish, delete · published: activate / deactivate (+ delete if unused) */
  function tariffActions(tariff, usage) {
    var acts = [];
    if (tariff.state !== "Publicat") acts.push("publish");
    acts.push(tariff.active ? "deactivate" : "activate");
    if (!usage) acts.push("delete");
    return acts;
  }

  function tariffValidOn(tariff, day) {
    return (!tariff.validFrom || tariff.validFrom <= day) && (!tariff.validTo || tariff.validTo >= day);
  }

  /* payment account: the tariff's own IBAN, else the authority's principal
     active account, else any active account */
  function tariffPayAccount(tariff, accounts, authorityId) {
    if (tariff.iban) return { iban: tariff.iban, source: "tarif" };
    var own = (accounts || []).filter(function (a) { return a.authorityId === authorityId && a.active; });
    var principal = own.filter(function (a) { return a.principal; })[0];
    if (principal) return { iban: principal.iban, source: "principal" };
    if (own[0]) return { iban: own[0].iban, source: "activ" };
    return { iban: null, source: "lipsă" };
  }

  /* RSSP: one tariff per enabled sub-service with a price; eAPL: the local fee.
     Registry fields are overwritten (new version when they change), GEAP-owned
     fields (type, subdivision, validity…) are kept. */
  function syncServiceTariffs(input) {
    var list = (input.tariffs || []).map(function (t) { return Object.assign({}, t); });
    var result = { created: 0, updated: 0, unchanged: 0 };
    var nextCode = function () {
      var max = list.reduce(function (m, t) { var n = parseInt(String(t.code || "").replace(/\D/g, ""), 10); return n > m ? n : m; }, 0);
      return "TRF-" + String(max + 1).padStart(3, "0");
    };
    (input.incoming || []).forEach(function (item) {
      var match = list.filter(function (t) { return t.scope === input.serviceCode && t.source === input.source && t.externalId === item.externalId; })[0];
      /* only what the registry sends is overwritten */
      var fields = {};
      ["name", "amount", "currency", "requestType", "iban", "legalBasis"].forEach(function (key) {
        if (item[key] !== undefined) fields[key] = item[key];
      });
      if (!match) {
        list.push(Object.assign({
          id: "tf-" + input.source.toLowerCase() + "-" + input.serviceCode + "-" + item.externalId, code: nextCode(),
          externalId: item.externalId, scope: input.serviceCode, source: input.source, nameRu: "", nameEn: "",
          type: item.type || "Taxă de stat", personType: item.personType || "Persoană juridică", subdivision: null,
          formula: false, userVariables: false, expression: "", rounding: "2 zecimale", validFrom: input.today,
          validTo: null, state: "Publicat", active: true, version: 1,
          versions: [{ version: 1, at: input.now, by: "Sincronizare " + input.source, note: "Importat din " + input.source }],
          modifiedAt: input.now, modifiedBy: "Sincronizare " + input.source,
          currency: "MDL", requestType: null, iban: "", legalBasis: ""
        }, fields));
        result.created += 1;
        return;
      }
      var changes = tariffChanges(match, Object.assign({}, match, fields));
      if (!changes.length) { result.unchanged += 1; return; }
      Object.assign(match, fields, {
        version: (match.version || 1) + 1, modifiedAt: input.now, modifiedBy: "Sincronizare " + input.source,
        versions: (match.versions || []).concat([{ version: (match.version || 1) + 1, at: input.now, by: "Sincronizare " + input.source, note: changes.join(", ") }])
      });
      result.updated += 1;
    });
    result.tariffs = list;
    return result;
  }

  /* Physical delete: draft, or published but never used; otherwise deactivate */
  function canDelete(payment) {
    return payment.state === "Schiță" || !payment.usage;
  }

  return {
    MESSAGES: MESSAGES,
    APPLICANT_TYPES: APPLICANT_TYPES,
    normalizeTitle: normalizeTitle,
    plainObjective: plainObjective,
    applicantTypes: applicantTypes,
    subServiceDuration: subServiceDuration,
    importSubServices: importSubServices,
    mapRsspService: mapRsspService,
    syncService: syncService,
    requestTypeState: requestTypeState,
    NO_FORM: NO_FORM,
    actionKey: actionKey,
    actionForm: actionForm,
    setActionForm: setActionForm,
    flowActions: flowActions,
    overrideCount: overrideCount,
    stepsFromDefinition: stepsFromDefinition,
    definitionForms: definitionForms,
    paymentActions: paymentActions,
    canPublish: canPublish,
    activationConflict: activationConflict,
    canDelete: canDelete,
    tariffLocked: tariffLocked,
    formulaVariables: formulaVariables,
    evaluateFormula: evaluateFormula,
    validateTariff: validateTariff,
    applyTariffEdit: applyTariffEdit,
    tariffActions: tariffActions,
    tariffValidOn: tariffValidOn,
    tariffPayAccount: tariffPayAccount,
    syncServiceTariffs: syncServiceTariffs,
    syncFromEapl: syncFromEapl,
    EAPL_MESSAGES: EAPL_MESSAGES,
    PAYMENT_MOMENTS: PAYMENT_MOMENTS,
    momentsFromDefinition: momentsFromDefinition,
    momentAllowed: momentAllowed,
    tariffEligibility: tariffEligibility,
    validatePayment: validatePayment,
    applyPaymentEdit: applyPaymentEdit,
    TAX_CALC: TAX_CALC,
    TAX_CALC_LABELS: TAX_CALC_LABELS,
    conditionApplies: conditionApplies,
    conditionsOverlap: conditionsOverlap,
    taxConflict: taxConflict,
    taxAmount: taxAmount,
    tariffAmount: tariffAmount,
    unconfiguredTariffs: unconfiguredTariffs,
    defaultTaxForTariff: defaultTaxForTariff,
    canPublishTax: canPublishTax,
    validateTax: validateTax
  };
});
