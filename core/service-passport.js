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
        return { id: "rt-" + (index + 1), name: sub.title, source: "RSSP", flow: null, forms: [] };
      }),
      forms: [], payments: [], dependencies: [], classifiers: [], templates: [],
      notifications: [], settings: null, events: []
    };
  }

  /* ---- request types -------------------------------------------------- */
  function requestTypeState(requestType) {
    if (!requestType.flow) return { label: "Fără flux", tone: "warning" };
    if (!(requestType.forms || []).length) return { label: "Fără formulare", tone: "warning" };
    return { label: "Configurat", tone: "success" };
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
    paymentActions: paymentActions,
    canPublish: canPublish,
    activationConflict: activationConflict,
    canDelete: canDelete
  };
});
