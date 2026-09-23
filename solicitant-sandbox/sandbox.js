/* ==========================================================================
   Solicitant / Reprezentant sandbox

   Drives the real e-permits-acte-permisive.html — same markup, same CSS, same
   JS — by synthesising the flow schema it already loads from
   data/acte-permisive.json and serving that instead.

   Nothing here re-implements a screen. The page renders the auth gate, the
   instance picker and "Date solicitant" exactly as it always does; the sandbox
   only changes the inputs.

   How the injection works: the real page fetches its schema at runtime. The
   sandbox fetches the page's HTML, prepends one script carrying the synthesised
   schema and patching window.fetch for that single URL, then writes the result
   into the iframe. That script also restores ?flow=full and the entry hash,
   which document.open() drops.
   ========================================================================== */

(function () {
  "use strict";

  var PAGE_URL = "../e-permits-acte-permisive.html?flow=full";
  var SCHEMA_URL = "../data/acte-permisive.json";

  /* ---------- toggle definitions ---------- */

  var TOGGLES = [
    { id: "authenticated", label: "Autentificat", hint: "Utilizatorul a trecut prin MPass",
      options: [{ v: "yes", l: "Da" }, { v: "no", l: "Nu" }], value: "yes" },

    { id: "requiresAuth", label: "Serviciul cere autentificare", hint: "auth.required",
      options: [{ v: "yes", l: "Da" }, { v: "no", l: "Nu" }], value: "yes" },

    { id: "eligibility", label: "Eligibilitate serviciu", hint: "auth.availableFor",
      options: [{ v: "PF", l: "Doar PF" }, { v: "PJ", l: "Doar PJ" }, { v: "BOTH", l: "PF + PJ" }], value: "BOTH" },

    { id: "selfPf", label: "Instanță proprie PF", hint: "scenario: self-pf",
      options: [{ v: "yes", l: "Da" }, { v: "no", l: "Nu" }], value: "yes" },

    { id: "adminPj", label: "PJ administrate direct", hint: "scenario: self-pj",
      options: [{ v: "none", l: "Niciuna" }, { v: "one", l: "Una" }, { v: "many", l: "Mai multe" }], value: "one" },

    { id: "mpower", label: "Împuterniciri MPower", hint: "populează lista colapsată",
      options: [{ v: "none", l: "Niciuna" }, { v: "one", l: "Una" }, { v: "several", l: "Mai multe" }], value: "several" },

    { id: "proxyAllowed", label: "Procură notarială permisă", hint: "proxyOption",
      options: [{ v: "yes", l: "Da" }, { v: "no", l: "Nu" }], value: "yes" },

    { id: "pjStatus", label: "Statut companie PJ", hint: "aplicat instanțelor PJ",
      options: [{ v: "active", l: "Activă" }, { v: "in_liquidation", l: "În lichidare" }], value: "active" },

    { id: "blocksLiquidation", label: "Serviciul blochează „în lichidare”", hint: "regulă de eligibilitate",
      options: [{ v: "yes", l: "Da" }, { v: "no", l: "Nu" }], value: "yes" },
  ];

  var state = {};
  TOGGLES.forEach(function (t) { state[t.id] = t.value; });

  var baseFlow = null;

  /* ---------- schema synthesis ---------- */

  function allowedTypes() {
    if (state.eligibility === "PF") return ["PF"];
    if (state.eligibility === "PJ") return ["PJ"];
    return ["PF", "PJ"];
  }

  function bySubjectScenario(scenario) {
    return (baseFlow.subjects || []).filter(function (s) { return s.scenario === scenario; });
  }

  /* extra direct-admin PJs, cloned from the real one so every field stays
     shaped exactly as the page expects */
  function extraAdminPj(template, index) {
    var names = ["SRL Global Trader", "Bricolaj Prim SRL", "Constructor Grup SRL"];
    var codes = ["1012600000002", "1012600000021", "1012600000022"];
    var clone = JSON.parse(JSON.stringify(template));
    clone.id = index === 0 ? template.id : "self-pj-extra-" + index;
    clone.name = names[index] || names[0];
    clone.idValue = codes[index] || codes[0];
    return clone;
  }

  function buildSubjects() {
    var allowed = allowedTypes();
    var out = [];

    if (state.selfPf === "yes") out = out.concat(bySubjectScenario("self-pf"));

    var pjTemplate = bySubjectScenario("self-pj")[0];
    if (pjTemplate) {
      var pjCount = state.adminPj === "one" ? 1 : state.adminPj === "many" ? 3 : 0;
      for (var i = 0; i < pjCount; i++) out.push(extraAdminPj(pjTemplate, i));
    }

    if (state.mpower !== "none") {
      var pool = bySubjectScenario("mpower-pf").concat(bySubjectScenario("mpower-pj"));
      /* interleave PF/PJ so a single-eligibility service still finds one */
      var pf = bySubjectScenario("mpower-pf");
      var pj = bySubjectScenario("mpower-pj");
      var mixed = [];
      for (var k = 0; k < Math.max(pf.length, pj.length); k++) {
        if (pj[k]) mixed.push(pj[k]);
        if (pf[k]) mixed.push(pf[k]);
      }
      var eligible = mixed.filter(function (s) { return allowed.indexOf(s.type) !== -1; });
      out = out.concat(state.mpower === "one" ? eligible.slice(0, 1) : eligible.slice(0, 6));
    }

    /* company status is a property of the PJ, the block is the service's rule —
       both must be true for the row to become unselectable */
    var blocks = state.pjStatus === "in_liquidation" && state.blocksLiquidation === "yes";
    out = out.map(function (s) {
      var clone = JSON.parse(JSON.stringify(s));
      if (clone.type === "PJ") {
        clone.companyStatus = state.pjStatus;
        if (blocks) {
          clone.selectable = false;
          clone.blockedReason = "Companie în lichidare — acest serviciu nu poate fi solicitat în numele ei.";
        }
      }
      return clone;
    });

    return out;
  }

  function buildSchema() {
    var flow = JSON.parse(JSON.stringify(baseFlow));
    var allowed = allowedTypes();

    flow.auth = flow.auth || {};
    flow.auth.required = state.requiresAuth === "yes";
    flow.auth.availableFor = allowed;

    flow.subjects = buildSubjects();

    flow.proxyOption = state.proxyAllowed === "yes"
      ? Object.assign({}, baseFlow.proxyOption, { visibleWhenAnyOf: allowed })
      : Object.assign({}, baseFlow.proxyOption, { visibleWhenAnyOf: [] });

    /* the default must be one that actually survived the filters */
    var firstSelectable = flow.subjects.filter(function (s) {
      return s.selectable !== false && allowed.indexOf(s.type) !== -1;
    })[0];
    flow.defaultSubjectId = firstSelectable ? firstSelectable.id : null;

    return flow;
  }

  /* ---------- outcome, so the sandbox can explain itself ---------- */

  function describeOutcome(flow) {
    var allowed = allowedTypes();
    var eligible = (flow.subjects || []).filter(function (s) { return allowed.indexOf(s.type) !== -1; });
    var selectable = eligible.filter(function (s) { return s.selectable !== false; });
    var blocked = eligible.filter(function (s) { return s.selectable === false; });
    var proxy = state.proxyAllowed === "yes";
    var gated = state.requiresAuth === "yes" && state.authenticated === "no";

    if (gated) {
      return { screen: "Auth gate", tone: "info",
        text: "Serviciul cere autentificare și utilizatorul nu este autentificat. Badge-urile „Disponibil pentru” arată " + allowed.join(" + ") + "." };
    }
    if (!eligible.length && !proxy) {
      return { screen: "Picker — fundătură", tone: "warn",
        text: "Nicio identitate eligibilă și fără procură notarială. Ecranul explică de ce și ce ar debloca situația." };
    }
    if (!eligible.length && proxy) {
      return { screen: "Picker — doar procură", tone: "warn",
        text: "Nicio identitate eligibilă; singura cale rămasă este procura notarială." };
    }
    if (!selectable.length && blocked.length) {
      return { screen: "Picker — totul blocat", tone: "warn",
        text: blocked.length + " instanță(e) PJ în lichidare, blocate de acest serviciu." + (proxy ? " Procura notarială rămâne disponibilă." : "") };
    }
    if (selectable.length === 1 && !proxy) {
      return { screen: "Picker → o singură opțiune", tone: "info",
        text: "O singură identitate eligibilă, deci în pasul „Date solicitant” linkul „Schimbă” lipsește complet." };
    }
    return { screen: "Picker → " + selectable.length + " opțiuni", tone: "ok",
      text: selectable.length + " identități selectabile" + (blocked.length ? ", " + blocked.length + " blocate" : "") + (proxy ? ", plus procura notarială" : "") + "." };
  }

  /* ---------- rendering the control panel ---------- */

  var panel = document.querySelector("[data-sandbox-toggles]");
  var frame = document.querySelector("[data-sandbox-frame]");
  var outcome = document.querySelector("[data-sandbox-outcome]");
  var schemaOut = document.querySelector("[data-sandbox-schema]");

  function renderToggles() {
    panel.innerHTML = TOGGLES.map(function (t, i) {
      return (
        '<div class="sbx-toggle">' +
          '<div class="sbx-toggle__head">' +
            '<span class="sbx-toggle__index">' + (i + 1) + "</span>" +
            '<span class="sbx-toggle__label">' + t.label +
              '<span class="sbx-toggle__hint">' + t.hint + "</span>" +
            "</span>" +
          "</div>" +
          '<div class="sbx-seg" role="group" aria-label="' + t.label + '">' +
            t.options.map(function (o) {
              return '<button type="button" class="sbx-seg__btn' + (state[t.id] === o.v ? " is-on" : "") + '"' +
                ' data-toggle="' + t.id + '" data-value="' + o.v + '"' +
                ' aria-pressed="' + (state[t.id] === o.v) + '">' + o.l + "</button>";
            }).join("") +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- driving the real page ---------- */

  var pageHtml = null;

  /* Runs inline in <head>, so it executes during parse — before the page's own
     deferred script. Two jobs:
       1. serve the synthesised schema instead of data/acte-permisive.json
       2. restore ?flow=full and the entry hash, which document.open() drops
          (it resets the document URL to the caller's) — the page reads both
          from location, so they have to be put back before it boots. */
  function buildInject(authed, flow) {
    /* The schema is embedded directly rather than passed through window.name —
       one less channel to go wrong, and it is guaranteed to be present before
       the page's own script runs. `<` is escaped so a value can never close
       this script tag early. */
    var payload = JSON.stringify({ frontOfficeFlows: [flow] }).replace(/</g, "\\u003c");
    return (
      "<script>(function(){" +
      "try{history.replaceState(null,'','?flow=full" + (authed ? "#choice-authenticated" : "") + "');}catch(e){}" +
      "var DATA=" + payload + ";" +
      "var of=window.fetch;" +
      "window.fetch=function(u){" +
      "if(String(u).indexOf('acte-permisive.json')!==-1){" +
      "return Promise.resolve(new Response(JSON.stringify(DATA)," +
      "{status:200,headers:{'Content-Type':'application/json'}}));}" +
      "return of.apply(this,arguments);};" +
      "})();<\/script>"
    );
  }

  function paint() {
    var flow = buildSchema();

    var info = describeOutcome(flow);
    outcome.className = "sbx-outcome sbx-outcome--" + info.tone;
    outcome.innerHTML = '<strong>' + info.screen + "</strong><span>" + info.text + "</span>";

    schemaOut.textContent = JSON.stringify({
      "auth.required": flow.auth.required,
      "auth.availableFor": flow.auth.availableFor,
      "subjects": (flow.subjects || []).map(function (s) {
        return s.name + " [" + s.type + "/" + s.scenario + "]" + (s.selectable === false ? " BLOCKED" : "");
      }),
      "proxyOption.visibleWhenAnyOf": flow.proxyOption.visibleWhenAnyOf,
      "defaultSubjectId": flow.defaultSubjectId,
    }, null, 2);

    /* Authenticated users land on the picker, guests on the auth gate — the
       page already keys off this hash, so no new mechanism is needed. Both the
       flow query and the hash have to live on the iframe's URL, because the
       page reads them from location; document.open() preserves that URL. */
    var authed = state.authenticated === "yes" || state.requiresAuth === "no";
    var html = pageHtml.replace(/<head([^>]*)>/i, "<head$1>" + buildInject(authed, flow));

    var doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }

  panel.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-toggle]");
    if (!btn) return;
    state[btn.dataset.toggle] = btn.dataset.value;
    renderToggles();
    paint();
  });

  document.querySelector("[data-sandbox-reset]").addEventListener("click", function () {
    TOGGLES.forEach(function (t) { state[t.id] = t.value; });
    renderToggles();
    paint();
  });

  /* ---------- presets, so compound cases are one click ---------- */

  var PRESETS = [
    { label: "PJ-only + guest + fără procură",
      set: { eligibility: "PJ", authenticated: "no", requiresAuth: "yes", proxyAllowed: "no" } },
    { label: "Zero identități eligibile",
      set: { eligibility: "PJ", authenticated: "yes", selfPf: "yes", adminPj: "none", mpower: "none", proxyAllowed: "no" } },
    { label: "Doar procura rămâne",
      set: { eligibility: "PJ", authenticated: "yes", selfPf: "yes", adminPj: "none", mpower: "none", proxyAllowed: "yes" } },
    { label: "PJ în lichidare, blocat",
      set: { eligibility: "PJ", authenticated: "yes", adminPj: "one", mpower: "none", pjStatus: "in_liquidation", blocksLiquidation: "yes", proxyAllowed: "no" } },
    { label: "În lichidare, dar permis",
      set: { eligibility: "PJ", authenticated: "yes", adminPj: "one", mpower: "none", pjStatus: "in_liquidation", blocksLiquidation: "no", proxyAllowed: "no" } },
    { label: "O singură identitate (fără „Schimbă”)",
      set: { eligibility: "PF", authenticated: "yes", selfPf: "yes", adminPj: "none", mpower: "none", proxyAllowed: "no" } },
    { label: "Fără autentificare necesară",
      set: { requiresAuth: "no", authenticated: "no", eligibility: "BOTH", selfPf: "yes", adminPj: "one", mpower: "several" } },
  ];

  var presetBar = document.querySelector("[data-sandbox-presets]");
  presetBar.innerHTML = PRESETS.map(function (p, i) {
    return '<button type="button" class="sbx-preset" data-preset="' + i + '">' + p.label + "</button>";
  }).join("");
  presetBar.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-preset]");
    if (!btn) return;
    var preset = PRESETS[Number(btn.dataset.preset)];
    Object.keys(preset.set).forEach(function (k) { state[k] = preset.set[k]; });
    renderToggles();
    paint();
  });

  /* Test seam: lets a harness sweep every toggle combination through the pure
     schema logic without driving the UI 1728 times. Not used by the sandbox. */
  window.__sandboxProbe = {
    toggles: TOGGLES,
    setState: function (next) { Object.keys(next).forEach(function (k) { state[k] = next[k]; }); },
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    buildSchema: buildSchema,
    describeOutcome: describeOutcome,
    ready: function () { return Boolean(baseFlow); },
  };

  /* ---------- boot ---------- */

  Promise.all([
    fetch(PAGE_URL).then(function (r) { return r.text(); }),
    fetch(SCHEMA_URL).then(function (r) { return r.json(); }),
  ]).then(function (results) {
    pageHtml = results[0];
    baseFlow = (results[1].frontOfficeFlows || [])[0];
    /* the page resolves its own assets relative to the document, and the
       iframe document has this folder as its base — point it back up one */
    if (!/<base /i.test(pageHtml)) {
      pageHtml = pageHtml.replace(/<head([^>]*)>/i, '<head$1><base href="../">');
    }
    renderToggles();
    paint();
  }).catch(function (error) {
    outcome.className = "sbx-outcome sbx-outcome--warn";
    outcome.innerHTML = "<strong>Nu am putut încărca pagina reală</strong><span>" + error.message + "</span>";
  });
})();
