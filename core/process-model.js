/**
 * core/process-model.js — Process Designer data model (Feature 89397, US-50/51/52).
 *
 * The model IS the exported flow JSON (data/flows/*.json): the designer reads and writes that
 * shape and keeps every unknown key (US-52 AC-09 / TC 91070). Pure functions only — no DOM —
 * so Node runs them (tools/process-designer/roundtrip.mjs):
 *   parse(text) / serialize(def)   lossless; serialize(parse(text)) === text for GEAP exports
 *   typeOf(state, def)             start | end | activity | decision | event | subprocess
 *   SIZE / ports / portPoint       geometry at zoom 100 % (spec C.3)
 *   lanesLayout / laneAt           horizontal bands, y absolute from the first lane's top
 *   route(...)                     orthogonal connector with rounded corners (spec F.10)
 *   validate(def, ctx)             issues E1–E10 / W1 (spec F.13, Azure wording)
 *   newDefinition / fromFlowSteps  a new process (Start + Sfârșit) / a flow known only by steps
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).processModel = api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ serialisation
     The GEAP export layout (ProcesFluxSimplificatFaraSupervizor.json): 2-space indent; top-level
     values on their own lines; arrays of objects one element per line; a state object one key per
     line; inside a state, an array with several objects one per line, everything else inline as
     `{ "k": v, … }` / `[a, b]`. Reproducing it is what makes „open → save” byte-identical. */
  function isPlainObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function hasNested(obj) { return Object.keys(obj).some(function (k) { return obj[k] !== null && typeof obj[k] === "object"; }); }

  function inline(v) {
    if (Array.isArray(v)) return "[" + v.map(inline).join(", ") + "]";
    if (isPlainObject(v)) {
      var keys = Object.keys(v);
      if (!keys.length) return "{}";
      return "{ " + keys.map(function (k) { return JSON.stringify(k) + ": " + inline(v[k]); }).join(", ") + " }";
    }
    return JSON.stringify(v);
  }
  function pad(n) { return new Array(n + 1).join(" "); }
  /* depth: root 0 → its values 1 → elements of states / lanes 2 → state values 3. The value of a
     key is rendered one level deeper than its object, elements of arrays one deeper than the array:
     the helper above folds both into one counter that matches the export (states[] items = 2,
     their values = 3 → inline unless an array of several objects). */
  function serialize(def) {
    return blockRoot(def) + "\n";
  }
  function blockRoot(def) {
    var keys = Object.keys(def);
    return "{\n" + keys.map(function (k) { return "  " + JSON.stringify(k) + ": " + valueAt(def[k], 1); }).join(",\n") + "\n}";
  }
  /* level 1 = top-level value; level 2 = element of a top-level array / value of a top-level object;
     level 3 = value inside such an element */
  function valueAt(v, level) {
    var ind = pad(level * 2);
    var inner = pad((level + 1) * 2);
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      var objects = v.every(isPlainObject);
      if (level === 1 && objects) return "[\n" + v.map(function (item) { return inner + elementAt(item, level + 1); }).join(",\n") + "\n" + ind + "]";
      if (level === 3 && objects && v.length > 1) return "[\n" + v.map(function (item) { return inner + inline(item); }).join(",\n") + "\n" + ind + "]";
      return inline(v);
    }
    if (isPlainObject(v)) {
      var keys = Object.keys(v);
      if (!keys.length) return "{}";
      if (level === 1) return "{\n" + keys.map(function (k) { return inner + JSON.stringify(k) + ": " + inline(v[k]); }).join(",\n") + "\n" + ind + "}";
      return inline(v);
    }
    return JSON.stringify(v);
  }
  /* an element of a top-level array: multiline when it holds arrays / objects (a state), else inline (a lane) */
  function elementAt(item, level) {
    if (!hasNested(item)) return inline(item);
    var ind = pad(level * 2);
    var inner = pad((level + 1) * 2);
    return "{\n" + Object.keys(item).map(function (k) { return inner + JSON.stringify(k) + ": " + valueAt(item[k], level + 1); }).join(",\n") + "\n" + ind + "}";
  }

  /* where a key goes back when an edit re-adds it (the export's order): an edit and its reverse
     must write the same bytes even when the reverse re-creates a key the edit deleted */
  var KEY_ORDER = {
    root: ["name", "title", "description", "version", "status", "initialState", "states", "lanes", "pool", "tableName", "recordKey", "variables", "designer"],
    state: ["id", "fieldAssignments", "title", "smStatus", "kind", "roles", "description", "componentType", "transitions", "properties"],
    properties: ["x", "y", "elementType", "laneId", "visualComponent", "auditCode", "objectType", "templateCodes", "processRef", "terms", "momentId", "showName"],
    transition: ["event", "target", "guard", "formName", "labelDx", "labelDy", "waypoints", "sourcePort", "targetPort", "color", "width"],
    lane: ["id", "title", "role", "height", "description"],
    condition: ["sourceField", "operator", "valueKind", "value"],
    term: ["term", "action", "onExpire"]
  };
  function putKey(obj, key, value, kind) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) { obj[key] = value; return obj; }
    var order = KEY_ORDER[kind] || [];
    var rank = order.indexOf(key);
    var keys = Object.keys(obj);
    var at = keys.length;
    if (rank >= 0) {
      for (var i = 0; i < keys.length; i++) {
        var r = order.indexOf(keys[i]);
        if (r > rank) { at = i; break; }
      }
    }
    var entries = keys.map(function (k) { return [k, obj[k]]; });
    entries.splice(at, 0, [key, value]);
    keys.forEach(function (k) { delete obj[k]; });
    entries.forEach(function (e) { obj[e[0]] = e[1]; });
    return obj;
  }
  /* set or remove (undefined / "" / [] / null = remove) */
  function setKey(obj, key, value, kind) {
    var empty = value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length);
    if (empty) { delete obj[key]; return obj; }
    return putKey(obj, key, value, kind);
  }

  function parse(text) {
    var def = JSON.parse(text);
    if (!isPlainObject(def)) throw new Error("Definiția procesului nu este un obiect JSON.");
    if (!Array.isArray(def.states)) def.states = [];
    return def;
  }

  /* ------------------------------------------------------------------ element types */
  var TYPES = ["start", "end", "activity", "decision", "event", "subprocess"];
  var ELEMENT_TYPE = { stare: "activity", decizie: "decision", eveniment: "event", subproces: "subprocess" };
  var TYPE_TO_ELEMENT = { activity: "stare", decision: "decizie", event: "eveniment", subprocess: "subproces" };
  var TYPE_KIND = { activity: "Human", decision: "Hybrid", event: "Server", subprocess: "Server" };
  function typeOf(state, def) {
    if (!state) return "";
    if (def && state.id === def.initialState) return "start";
    if (state.kind === "Terminal") return "end";
    var et = state.properties && state.properties.elementType;
    if (ELEMENT_TYPE[et]) return ELEMENT_TYPE[et];
    if (state.kind === "Human") return "activity";
    if (state.kind === "Hybrid") return "decision";
    return "event";
  }

  /* the export's geometry (spec C.3): properties.x / y = top-left of THIS box. It is only the anchor:
     the centre it gives is where the element sits. */
  var SIZE = {
    start: { w: 64, h: 64 },
    end: { w: 64, h: 64 },
    activity: { w: 140, h: 56 },
    subprocess: { w: 160, h: 56 },
    decision: { w: 44, h: 44 },
    event: { w: 40, h: 40 }
  };
  /* what the canvas draws around that centre (2026-10-14, user: the site-map card look): activities and
     sub-processes are cards (type tag + id chip + 2-line title); the other shapes keep the export size */
  var VIEW = {
    start: SIZE.start,
    end: SIZE.end,
    activity: { w: 184, h: 94 },
    subprocess: { w: 184, h: 94 },
    decision: SIZE.decision,
    event: SIZE.event
  };
  /* the diamond's vertices sit 31 px from its centre (44 × √2 / 2) */
  var DIAMOND = 31;
  var PORTS = {
    start: ["top", "right", "bottom", "left"],
    end: ["top", "right", "bottom", "left"],
    event: ["top", "right", "bottom", "left"],
    decision: ["corner-tl", "corner-tr", "corner-br", "corner-bl"],
    activity: ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"],
    subprocess: ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"]
  };
  /* stored port names that other shapes do not have map onto the nearest one */
  var PORT_ALIAS = {
    decision: { top: "corner-tl", right: "corner-tr", bottom: "corner-br", left: "corner-bl", "top-left": "corner-tl", "top-right": "corner-tr", "bottom-right": "corner-br", "bottom-left": "corner-bl" },
    round: { "corner-tl": "top", "corner-tr": "right", "corner-br": "bottom", "corner-bl": "left", "top-left": "top", "top-right": "top", "bottom-right": "bottom", "bottom-left": "bottom" },
    box: { "corner-tl": "top", "corner-tr": "right", "corner-br": "bottom", "corner-bl": "left" }
  };
  function normalPort(type, port) {
    if (!port) return "";
    if ((PORTS[type] || []).indexOf(port) >= 0) return port;
    var group = type === "decision" ? "decision" : (type === "activity" || type === "subprocess") ? "box" : "round";
    return PORT_ALIAS[group][port] || "";
  }
  /* the centre of an element (from its stored top-left + the export size) */
  function centerOf(state, def) {
    var a = SIZE[typeOf(state, def)] || SIZE.activity;
    var p = state.properties || {};
    return { x: (Number(p.x) || 0) + a.w / 2, y: (Number(p.y) || 0) + a.h / 2 };
  }
  /* write a centre back as the stored top-left (the export's convention) */
  function place(state, def, cx, cy) {
    var a = SIZE[typeOf(state, def)] || SIZE.activity;
    state.properties = state.properties || {};
    state.properties.x = cx - a.w / 2;
    state.properties.y = cy - a.h / 2;
  }
  /* the drawn box: VIEW size around the centre */
  function box(state, def) {
    var t = typeOf(state, def);
    var v = VIEW[t] || VIEW.activity;
    var c = centerOf(state, def);
    return { x: c.x - v.w / 2, y: c.y - v.h / 2, w: v.w, h: v.h, type: t };
  }
  function center(b) { return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
  /* a port's point on the shape and the direction a connection leaves / enters it */
  function portPoint(b, port) {
    var c = center(b);
    if (b.type === "decision") {
      if (port === "corner-tl") return { x: c.x, y: c.y - DIAMOND, dx: 0, dy: -1 };
      if (port === "corner-tr") return { x: c.x + DIAMOND, y: c.y, dx: 1, dy: 0 };
      if (port === "corner-br") return { x: c.x, y: c.y + DIAMOND, dx: 0, dy: 1 };
      return { x: c.x - DIAMOND, y: c.y, dx: -1, dy: 0 };
    }
    var q = b.w / 4;
    switch (port) {
      case "top": return { x: c.x, y: b.y, dx: 0, dy: -1 };
      case "bottom": return { x: c.x, y: b.y + b.h, dx: 0, dy: 1 };
      case "left": return { x: b.x, y: c.y, dx: -1, dy: 0 };
      case "right": return { x: b.x + b.w, y: c.y, dx: 1, dy: 0 };
      case "top-left": return { x: b.x + q, y: b.y, dx: 0, dy: -1 };
      case "top-right": return { x: b.x + b.w - q, y: b.y, dx: 0, dy: -1 };
      case "bottom-left": return { x: b.x + q, y: b.y + b.h, dx: 0, dy: 1 };
      case "bottom-right": return { x: b.x + b.w - q, y: b.y + b.h, dx: 0, dy: 1 };
      default: return { x: b.x + b.w, y: c.y, dx: 1, dy: 0 };
    }
  }
  /* the side facing the other shape: forward = right → left, mostly vertical = bottom → top */
  function facingPorts(a, b) {
    var ca = center(a), cb = center(b);
    var dx = cb.x - ca.x, dy = cb.y - ca.y;
    var side = Math.abs(dx) >= Math.abs(dy) * 0.9 ? (dx >= 0 ? ["right", "left"] : ["left", "right"]) : (dy >= 0 ? ["bottom", "top"] : ["top", "bottom"]);
    return { source: normalPort(a.type, side[0]), target: normalPort(b.type, side[1]) };
  }
  /* the port of a shape nearest to a point (re-connect, drop on a node) */
  function nearestPort(b, pt) {
    var best = "", dist = Infinity;
    (PORTS[b.type] || PORTS.activity).forEach(function (port) {
      var p = portPoint(b, port);
      var d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < dist) { dist = d; best = port; }
    });
    return { port: best, dist: dist };
  }

  /* ------------------------------------------------------------------ lanes */
  var LANE_MIN = 120;
  var LANE_MAX = 15;
  function lanesLayout(def) {
    var top = 0;
    return (def.lanes || []).map(function (lane) {
      var h = Math.max(LANE_MIN, Number(lane.height) || 160);
      var out = { id: lane.id, top: top, height: h, lane: lane };
      top += h;
      return out;
    });
  }
  function laneAt(def, y) {
    var layout = lanesLayout(def);
    for (var i = 0; i < layout.length; i++) {
      if (y >= layout[i].top && y < layout[i].top + layout[i].height) return layout[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ routing (spec F.10)
     Orthogonal routes between ports: a 16 px stub out of each port, then the cheapest of a few
     candidate shapes (straight, L, Z) that does not cross another shape; stored waypoints win. */
  var STUB = 16;
  var CLEAR = 8;
  function segHitsBox(a, b, r) {
    var minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxX > r.x && minX < r.x + r.w && maxY > r.y && minY < r.y + r.h;
  }
  function pathHits(points, obstacles) {
    var hits = 0;
    for (var i = 0; i < points.length - 1; i++) {
      for (var j = 0; j < obstacles.length; j++) if (segHitsBox(points[i], points[i + 1], obstacles[j])) hits += 1;
    }
    return hits;
  }
  function simplify(points) {
    var out = [];
    points.forEach(function (p) {
      var q = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
      var last = out[out.length - 1];
      if (last && last.x === q.x && last.y === q.y) return;
      if (out.length >= 2) {
        var prev = out[out.length - 2];
        if ((prev.x === last.x && last.x === q.x) || (prev.y === last.y && last.y === q.y)) { out[out.length - 1] = q; return; }
      }
      out.push(q);
    });
    return out;
  }
  function pathLength(points) {
    var n = 0;
    for (var i = 0; i < points.length - 1; i++) n += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
    return n;
  }
  /* elbows through fixed points: keep the direction of the previous segment as long as possible */
  function throughPoints(points, firstHorizontal) {
    var out = [points[0]];
    var horizontal = firstHorizontal;
    for (var i = 1; i < points.length; i++) {
      var p = out[out.length - 1], q = points[i];
      if (p.x !== q.x && p.y !== q.y) {
        out.push(horizontal ? { x: q.x, y: p.y } : { x: p.x, y: q.y });
        horizontal = !horizontal;
      } else horizontal = p.y === q.y;
      out.push(q);
    }
    return out;
  }
  /* from: { x, y, dx, dy } port; to: same (dx/dy = the direction OUT of the target shape) */
  function route(from, to, obstacles, waypoints) {
    var s = { x: from.x + from.dx * STUB, y: from.y + from.dy * STUB };
    var t = { x: to.x + to.dx * STUB, y: to.y + to.dy * STUB };
    var obs = (obstacles || []).map(function (r) { return { x: r.x - CLEAR, y: r.y - CLEAR, w: r.w + CLEAR * 2, h: r.h + CLEAR * 2 }; });
    if (waypoints && waypoints.length) {
      var mid = [s].concat(waypoints.map(function (w) { return { x: Number(w.x) || 0, y: Number(w.y) || 0 }; }), [t]);
      return simplify([from].concat(throughPoints(mid, from.dx !== 0), [to]));
    }
    var mx = Math.round((s.x + t.x) / 2), my = Math.round((s.y + t.y) / 2);
    var cands = [];
    if (s.x === t.x || s.y === t.y) cands.push([s, t]);
    cands.push([s, { x: t.x, y: s.y }, t]);
    cands.push([s, { x: s.x, y: t.y }, t]);
    cands.push([s, { x: mx, y: s.y }, { x: mx, y: t.y }, t]);
    cands.push([s, { x: s.x, y: my }, { x: t.x, y: my }, t]);
    /* detours around: above / below / left / right of both stubs */
    var top = Math.min(s.y, t.y) - 40, bottom = Math.max(s.y, t.y) + 40, left = Math.min(s.x, t.x) - 40, right = Math.max(s.x, t.x) + 40;
    (obs || []).forEach(function (r) { /* shapes in the way push the detour further out */
      if (r.x < right && r.x + r.w > left) { top = Math.min(top, r.y - 24); bottom = Math.max(bottom, r.y + r.h + 24); }
    });
    cands.push([s, { x: s.x, y: top }, { x: t.x, y: top }, t]);
    cands.push([s, { x: s.x, y: bottom }, { x: t.x, y: bottom }, t]);
    cands.push([s, { x: left, y: s.y }, { x: left, y: t.y }, t]);
    cands.push([s, { x: right, y: s.y }, { x: right, y: t.y }, t]);
    var best = null, bestCost = Infinity;
    cands.forEach(function (c) {
      var full = simplify([from].concat(c, [to]));
      /* never leave a port backwards into its own shape, never enter the target from behind */
      if (full.length >= 2) {
        var a = full[0], b = full[1];
        if ((b.x - a.x) * from.dx < 0 || (b.y - a.y) * from.dy < 0) return;
        var y = full[full.length - 1], z = full[full.length - 2];
        if ((z.x - y.x) * to.dx < 0 || (z.y - y.y) * to.dy < 0) return;
      }
      var inner = full.slice(1, -1);
      var cost = pathLength(full) + (full.length - 2) * 30 + pathHits(inner.length > 1 ? inner : full, obs) * 2000;
      if (cost < bestCost) { bestCost = cost; best = full; }
    });
    return best || simplify([from, s, t, to]);
  }
  /* SVG path with rounded corners (radius 8, never more than half a segment) */
  function pathD(points, radius) {
    var r0 = radius == null ? 8 : radius;
    if (!points || !points.length) return "";
    var d = "M" + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length - 1; i++) {
      var p = points[i - 1], c = points[i], n = points[i + 1];
      var l1 = Math.abs(c.x - p.x) + Math.abs(c.y - p.y), l2 = Math.abs(n.x - c.x) + Math.abs(n.y - c.y);
      var r = Math.min(r0, l1 / 2, l2 / 2);
      var ax = c.x - Math.sign(c.x - p.x) * r, ay = c.y - Math.sign(c.y - p.y) * r;
      var bx = c.x + Math.sign(n.x - c.x) * r, by = c.y + Math.sign(n.y - c.y) * r;
      d += " L" + round1(ax) + " " + round1(ay) + " Q" + c.x + " " + c.y + " " + round1(bx) + " " + round1(by);
    }
    var last = points[points.length - 1];
    return d + " L" + last.x + " " + last.y;
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  /* where the label sits: the middle of the longest segment */
  function labelPoint(points) {
    var best = 0, at = { x: points[0].x, y: points[0].y, horizontal: true };
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[i], b = points[i + 1];
      var len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (len > best) { best = len; at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, horizontal: a.y === b.y }; }
    }
    return at;
  }

  /* ------------------------------------------------------------------ new definitions */
  function newDefinition(opts) {
    var o = opts || {};
    return {
      name: o.name || "ProcesNou",
      title: o.title || "Proces nou",
      description: o.description || "",
      version: "1.0.0",
      initialState: "start",
      states: [
        { id: "start", title: "Start", smStatus: 0, kind: "Server", roles: [], transitions: [], properties: { x: 120, y: 48, laneId: "lane1" } },
        { id: "end", fieldAssignments: [{ name: "StatusId", value: "9" }], title: "Sfârșit", smStatus: 0, kind: "Terminal", roles: [], transitions: [], properties: { x: 760, y: 48, laneId: "lane1" } }
      ],
      lanes: [{ id: "lane1", title: "Bandă 1", role: "", height: 160 }],
      tableName: "GEAP_Cases",
      recordKey: "Id",
      variables: {}
    };
  }
  /* a flow of the services registry that has only steps (no definition): a readable diagram —
     Start → steps (decisions for automatic steps) → Sfârșit, in one lane, left to right */
  function fromFlowSteps(flow) {
    var def = newDefinition({ name: String(flow.id || "flux").replace(/[^A-Za-z0-9]/g, ""), title: flow.name || "Flux" });
    def.version = String(flow.version || "1.0.0").replace(/^v/, "");
    if (!/^\d+\.\d+\.\d+$/.test(def.version)) def.version = def.version.split(".").concat(["0", "0", "0"]).slice(0, 3).join(".");
    /* one lane, the examiner's (role guid of the seed's Specialist lane) */
    def.lanes = [{ id: "lane1", title: "Specialist", role: "61b20cc3-baaa-4823-9822-c01399bb8c68", height: 200 }];
    var start = def.states[0], end = def.states[1];
    start.properties = { x: 40, y: 68, laneId: "lane1" };
    var x = 180;
    var prev = start;
    (flow.steps || []).forEach(function (step, i) {
      var auto = Boolean(step.auto);
      var id = "node" + (i + 1);
      var st = {
        id: id, title: step.name, kind: auto ? "Hybrid" : "Human", roles: [],
        transitions: [],
        properties: { x: x, y: auto ? 78 : 72, elementType: auto ? "decizie" : "stare", laneId: "lane1" }
      };
      prev.transitions.push({ event: "next", target: id });
      def.states.splice(def.states.length - 1, 0, st);
      x += (auto ? 44 : 140) + (auto ? 120 : 160);
      prev = st;
      st.__actions = (step.actions || []).map(function (a) { return a; });
    });
    prev.transitions.push({ event: "next", target: "end" });
    /* actions of a step = its labelled exits (all lead on; the order is the registry's) */
    def.states.forEach(function (st) {
      if (!st.__actions) return;
      var acts = st.__actions; delete st.__actions;
      if (acts.length > 1 && st.transitions.length === 1) {
        var target = st.transitions[0].target;
        st.transitions = acts.map(function (a) { var t = { event: a.name, target: target }; if (a.defaultForm) t.formName = a.defaultForm; return t; });
      } else if (acts.length === 1 && acts[0].defaultForm) st.transitions[0].formName = acts[0].defaultForm;
    });
    end.properties = { x: x, y: 68, laneId: "lane1" };
    return def;
  }

  /* ------------------------------------------------------------------ validation (spec F.13) */
  var MSG = {
    E1: "Atenție: Există noduri neconectate.",
    E2: "O ieșire a Deciziei nu are element-țintă asociat.",
    E3: "Atenție: Sub-procesul referă un proces inexistent.",
    E4: "Câmpul este obligatoriu.",
    PUBLISH: "Nu se poate publica: schema conține erori. Corectați și încercați din nou."
  };
  var TYPE_LABEL = { start: "Start", end: "Sfârșit", activity: "Activitate", decision: "Decizie", event: "Eveniment intermediar", subprocess: "Sub-proces" };
  function nameOf(state, def) {
    var t = typeOf(state, def);
    return String(state.title || "").trim() || TYPE_LABEL[t] || state.id;
  }
  /* ------------------------------------------------------------------ conditions (Decizie guard)
     guard = { groups: [{ conditions: [{ sourceField, operator, valueKind: "static", value? }] }] }:
     conditions inside a group = AND, groups = OR; a transition without guard = the default branch */
  var OPERATORS = [["isTrue", "este bifat"], ["isFalse", "nu este bifat"], ["eq", "este egal cu"], ["ne", "este diferit de"], ["lt", "mai mic decât"], ["le", "mai mic sau egal cu"], ["gt", "mai mare decât"], ["ge", "mai mare sau egal cu"], ["in", "este în lista"]];
  var BOOL_OPS = ["isTrue", "isFalse"];
  var VALUE_OPS = ["eq", "ne", "lt", "le", "gt", "ge", "in"];
  /* fields of the managed record a condition may read besides the context variables (the seed's
     CaseDecisionId 1 Aprobare · 2 Respingere) */
  var CASE_FIELDS = [["CaseDecisionId", "Decizia dosarului", "value"], ["StatusId", "Starea dosarului", "value"], ["ServiceId", "Serviciul", "value"], ["PermitType", "Tipul actului", "value"], ["AuthorityId", "Autoritatea", "value"], ["TeamId", "Echipa", "value"]];
  function fieldKind(def, name) {
    var v = (def.variables || {})[name];
    if (v) return v === "checkbox" ? "bool" : "value";
    var f = CASE_FIELDS.filter(function (x) { return x[0] === name; })[0];
    return f ? f[2] : "";
  }
  function guardProblems(guard, def) {
    var out = [];
    if (!guard) return out;
    (guard.groups || []).forEach(function (g, gi) {
      (g.conditions || []).forEach(function (cnd, ci) {
        var at = "cond." + gi + "." + ci;
        if (!cnd.sourceField) { out.push({ prop: at + ".field", message: "condiția nu are câmp." }); return; }
        if (!fieldKind(def, cnd.sourceField)) out.push({ prop: at + ".field", message: "«" + cnd.sourceField + "» nu este în Variabilele de context." });
        if (!cnd.operator) out.push({ prop: at + ".op", message: "condiția nu are operator." });
        else if (VALUE_OPS.indexOf(cnd.operator) >= 0 && (cnd.value === undefined || String(cnd.value).trim() === "")) out.push({ prop: at + ".value", message: "condiția nu are valoare." });
      });
      if (!(g.conditions || []).length) out.push({ prop: "cond." + gi, message: "un grup de condiții este gol." });
    });
    return out;
  }
  function usedVariables(def) {
    var read = {};
    (def.states || []).forEach(function (s) {
      (s.transitions || []).forEach(function (tr) {
        ((tr.guard || {}).groups || []).forEach(function (g) { (g.conditions || []).forEach(function (cnd) { if (cnd.sourceField) read[cnd.sourceField] = (read[cnd.sourceField] || 0) + 1; }); });
      });
    });
    return read;
  }
  /* the inter-institutional approval branch (US-222 AC-46): a step / exit / sub-process about avizare */
  function hasAvizare(def) {
    return (def.states || []).some(function (s) {
      if (/aviz/i.test(String(s.title || "")) || /aviz/i.test(String((s.properties || {}).processRef || ""))) return true;
      return (s.transitions || []).some(function (tr) { return /aviz/i.test(String(tr.event || "")); });
    });
  }

  /* ctx: { processes: [name], self: name, published?: [name], templates?: [code], forms?: [name],
     base?: published definition, usedBy?: number of services } */
  function validate(def, ctx) {
    var c = ctx || {};
    var issues = [];
    var states = def.states || [];
    var byId = {};
    var dupes = {};
    states.forEach(function (s) { if (byId[s.id]) dupes[s.id] = true; byId[s.id] = s; });
    var incoming = {};
    states.forEach(function (s) { (s.transitions || []).forEach(function (t) { if (byId[t.target]) incoming[t.target] = (incoming[t.target] || 0) + 1; }); });
    var lanes = {};
    (def.lanes || []).forEach(function (l) { lanes[l.id] = l; });
    var push = function (code, level, blocks, target, message, extra) {
      issues.push(Object.assign({ code: code, level: level, blocks: blocks, kind: "node", id: target, tab: "general", prop: "", message: message }, extra || {}));
    };
    var known = c.processes || null;

    states.forEach(function (s) {
      var t = typeOf(s, def);
      var name = nameOf(s, def);
      var outs = s.transitions || [];
      var nm = { name: name, type: t };
      if (dupes[s.id]) push("E10", "error", "save", s.id, "Identificatorul «" + s.id + "» se repetă.", Object.assign({ prop: "id" }, nm));
      /* E4 — required texts */
      if (!String(s.title || "").trim()) push("E4", "error", "save", s.id, t === "decision" ? "Întrebarea deciziei este obligatorie." : "Denumirea este obligatorie.", Object.assign({ prop: "title" }, nm));
      /* E1 — unconnected */
      if (t !== "start" && !incoming[s.id]) push("E1", "error", "save", s.id, "«" + name + "» nu are conexiuni de intrare.", nm);
      if (t !== "end" && !outs.length) push("E1", "error", "save", s.id, "«" + name + "» nu are conexiuni de ieșire.", nm);
      /* E10 — structure */
      if (t === "end" && outs.length) push("E10", "error", "save", s.id, "Sfârșitul procesului nu poate avea conexiuni de ieșire.", nm);
      outs.forEach(function (tr, i) {
        var edge = { kind: "edge", id: s.id + ":" + i, name: name + " → " + (byId[tr.target] ? nameOf(byId[tr.target], def) : "?"), type: "edge" };
        if (!tr.target || !byId[tr.target]) {
          push(t === "decision" ? "E2" : "E1", "error", "save", edge.id, t === "decision" ? MSG.E2 : "Conexiunea din «" + name + "» nu are element-țintă.", edge);
          return;
        }
        if (tr.target === s.id) push("E10", "error", "save", edge.id, "O conexiune nu poate lega elementul de el însuși.", edge);
        if (typeOf(byId[tr.target], def) === "start") push("E10", "error", "save", edge.id, "Startul procesului nu poate avea conexiuni de intrare.", edge);
      });
      /* E8 — decisions: ≥ 2 exits, labels, complete conditions on declared variables */
      if (t === "decision") {
        var exits = Object.assign({ tab: "exits" }, nm);
        if (outs.length < 2) push("E8", "error", "save", s.id, "Decizia «" + name + "» are nevoie de cel puțin două ieșiri.", exits);
        outs.forEach(function (tr, i) {
          if (!String(tr.event || "").trim() || tr.event === "next") push("E8", "error", "save", s.id, "Ieșirea " + (i + 1) + " a deciziei «" + name + "» nu are etichetă.", Object.assign({}, exits, { prop: "exit." + i + ".event" }));
          guardProblems(tr.guard, def).forEach(function (pr) {
            push("E8", "error", "save", s.id, "Ieșirea " + (i + 1) + " a deciziei «" + name + "»: " + pr.message, Object.assign({}, exits, { prop: "exit." + i + "." + pr.prop }));
          });
        });
        var defaults = outs.filter(function (tr) { return !tr.guard; }).length;
        if (outs.length >= 2 && defaults !== 1) push("W1", "warning", "", s.id, defaults ? "Decizia «" + name + "» are " + defaults + " ramuri fără condiție — doar una poate fi implicită." : "Nu există ramură implicită — dosarul se poate bloca.", exits);
      }
      /* activities: several actions need labels („next” reads „Continuă”); forms known (W2); terms (no story) */
      if (t === "activity" && outs.length > 1) {
        outs.forEach(function (tr, i) {
          if (!String(tr.event || "").trim()) push("E8", "error", "save", s.id + ":" + i, "Acțiunea " + (i + 1) + " a activității «" + name + "» nu are etichetă.", { kind: "edge", name: name, type: "edge", prop: "event" });
        });
      }
      if (t === "activity" && c.forms) {
        outs.forEach(function (tr, i) {
          if (tr.formName && c.forms.indexOf(tr.formName) < 0) push("W2", "warning", "", s.id, "Formularul «" + tr.formName + "» al acțiunii " + (i + 1) + " nu există în catalogul formularelor de proces.", Object.assign({ tab: "actions", prop: "action." + i + ".formName" }, nm));
        });
      }
      ((s.properties || {}).terms || []).forEach(function (term, i) {
        if (!term.term || !term.action) push("E4", "error", "save", s.id, "Termenul " + (i + 1) + " al pasului «" + name + "» nu este complet.", Object.assign({ tab: "terms", prop: "term." + i }, nm));
        else if (term.onExpire && !outs.some(function (tr) { return tr.event === term.onExpire; })) push("W2", "warning", "", s.id, "La expirarea termenului " + (i + 1) + ", pasul «" + name + "» nu are acțiunea «" + term.onExpire + "».", Object.assign({ tab: "terms", prop: "term." + i }, nm));
      });
      /* E3 / E9 — sub-processes */
      if (t === "subprocess") {
        var ref = (s.properties || {}).processRef;
        if (!ref) push("E4", "error", "save", s.id, "Alege procesul apelat.", Object.assign({ prop: "processRef" }, nm));
        else if (c.self && ref === c.self) push("E9", "error", "save", s.id, "Un sub-proces nu se poate apela pe sine.", Object.assign({ prop: "processRef" }, nm));
        else if (known && known.indexOf(ref) < 0) push("E3", "error", "save", s.id, MSG.E3, Object.assign({ prop: "processRef" }, nm));
        else if (c.published && c.published.indexOf(ref) < 0) push("E9", "error", "publish", s.id, "Sub-procesul «" + ref + "» nu este publicat.", Object.assign({ prop: "processRef" }, nm));
      }
      /* E4 — processor parameters (US-188 AC-06 …) */
      if (t === "event") {
        var p = s.properties || {};
        var proc = Object.assign({ tab: "processor" }, nm);
        if (s.componentType === "notify" && !(p.templateCodes || []).length) push("E4", "error", "save", s.id, "Alege cel puțin un șablon de notificare.", Object.assign({ prop: "templateCodes" }, proc));
        if (s.componentType === "notify" && c.templates) (p.templateCodes || []).forEach(function (code) {
          if (c.templates.indexOf(code) < 0) push("W2", "warning", "", s.id, "Șablonul «" + code + "» nu există sau este inactiv — notificarea nu se trimite.", Object.assign({ prop: "templateCodes" }, proc));
        });
        if (s.componentType === "audit-log" && !p.auditCode) push("E4", "error", "save", s.id, "Alege codul de audit.", Object.assign({ prop: "auditCode" }, proc));
        if ((s.componentType === "payment-accrual" || s.componentType === "payment-note") && !p.momentId) push("E4", "error", "save", s.id, "Alege momentul plății.", Object.assign({ prop: "momentId" }, proc));
      }
      /* E5 — a human step needs a role, its own or its lane's (US-50 publish message) */
      if (t === "activity") {
        var lane = lanes[(s.properties || {}).laneId];
        if (!(s.roles || []).length && !(lane && lane.role)) push("E5", "error", "publish", s.id, "Elemente umane fără rol (propriu sau din culoar): " + name + ".", Object.assign({ tab: "roles", prop: "roles" }, nm));
      }
    });
    if ((def.lanes || []).length > LANE_MAX) push("E10", "error", "save", "", "Un proces poate avea cel mult 15 benzi.", { kind: "process", name: "Proces" });
    if (!states.some(function (s) { return typeOf(s, def) === "start"; })) push("E10", "error", "save", "", "Procesul nu are Start.", { kind: "process", name: "Proces" });
    if (!states.some(function (s) { return typeOf(s, def) === "end"; })) push("E10", "error", "save", "", "Procesul nu are Sfârșit.", { kind: "process", name: "Proces" });

    /* E6 / E7 — reachability (publish only) */
    var fwd = {};
    var seen = {};
    var queue = [def.initialState];
    while (queue.length) {
      var id = queue.shift();
      if (!id || seen[id] || !byId[id]) continue;
      seen[id] = true;
      (byId[id].transitions || []).forEach(function (tr) { queue.push(tr.target); });
    }
    var back = {};
    states.forEach(function (s) { (s.transitions || []).forEach(function (tr) { (back[tr.target] = back[tr.target] || []).push(s.id); }); });
    var toEnd = {};
    queue = states.filter(function (s) { return typeOf(s, def) === "end"; }).map(function (s) { return s.id; });
    while (queue.length) {
      var e = queue.shift();
      if (toEnd[e]) continue;
      toEnd[e] = true;
      (back[e] || []).forEach(function (src) { queue.push(src); });
    }
    void fwd;
    /* W2 — context variables nobody reads; W3 — what request types lose against the published version */
    var read = usedVariables(def);
    Object.keys(def.variables || {}).forEach(function (v) {
      if (!read[v]) push("W2", "warning", "", "", "Variabila de context «" + v + "» nu este folosită în nicio condiție.", { kind: "process", name: "Setări generale", prop: "variables" });
    });
    if (c.base) {
      var users = c.usedBy || 0;
      if (hasAvizare(c.base) && !hasAvizare(def)) push("W3", "warning", "", "", "Fluxul nu mai conține ramura de avizare — tipurile de solicitare cu avize vor fi afectate.", { kind: "process", name: "Proces" });
      (c.base.states || []).forEach(function (old) {
        if (old.componentType !== "notify" || byId[old.id]) return;
        push("W3", "warning", "", "", "Pasul de notificare «" + nameOf(old, c.base) + "» a fost șters" + (users ? " — " + users + (users === 1 ? " serviciu îl folosește." : " servicii îl folosesc.") : "."), { kind: "process", name: "Proces" });
      });
    }
    states.forEach(function (s) {
      var t = typeOf(s, def);
      var nm = { name: nameOf(s, def), type: t };
      if (t !== "start" && incoming[s.id] && !seen[s.id]) push("E6", "error", "publish", s.id, "«" + nm.name + "» nu poate fi atins din Start.", nm);
      if (t !== "end" && (s.transitions || []).length && !toEnd[s.id]) push("E7", "error", "publish", s.id, "Din «" + nm.name + "» nu se poate ajunge la Sfârșit.", nm);
    });
    return issues;
  }
  function blocksSave(issue) { return issue.level === "error" && issue.blocks === "save"; }

  /* ------------------------------------------------------------------ lanes: reorder / resize / remove
     y is absolute across lanes (from the first lane's top), so every lane operation moves the nodes
     of the lanes it shifts; a node keeps its offset inside its own lane. */
  function laneOffsets(def) {
    var tops = {};
    lanesLayout(def).forEach(function (l) { tops[l.id] = l; });
    return tops;
  }
  function shiftState(s, def, dy) {
    if (!dy) return;
    var c = centerOf(s, def);
    place(s, def, c.x, c.y + dy);
  }
  /* order = lane ids top → bottom */
  function reorderLanes(def, order) {
    var before = laneOffsets(def);
    var byId = {};
    (def.lanes || []).forEach(function (l) { byId[l.id] = l; });
    def.lanes = order.map(function (id) { return byId[id]; }).filter(Boolean);
    var after = laneOffsets(def);
    (def.states || []).forEach(function (s) {
      var id = (s.properties || {}).laneId;
      if (before[id] && after[id]) shiftState(s, def, after[id].top - before[id].top);
    });
    return def;
  }
  /* the lowest height that still holds the lane's nodes (+ 20 under the last one) */
  function laneMinHeight(def, laneId) {
    var l = laneOffsets(def)[laneId];
    if (!l) return LANE_MIN;
    var need = LANE_MIN;
    (def.states || []).forEach(function (s) {
      if ((s.properties || {}).laneId !== laneId) return;
      var b = box(s, def);
      need = Math.max(need, Math.ceil((b.y + b.h - l.top + 20) / 20) * 20);
    });
    return need;
  }
  function resizeLane(def, laneId, height) {
    var layout = lanesLayout(def);
    var at = -1;
    layout.forEach(function (l, i) { if (l.id === laneId) at = i; });
    if (at < 0) return 0;
    var h = Math.max(laneMinHeight(def, laneId), Math.round((Number(height) || LANE_MIN) / 20) * 20);
    var dy = h - layout[at].height;
    def.lanes[at].height = h;
    var below = {};
    layout.slice(at + 1).forEach(function (l) { below[l.id] = true; });
    (def.states || []).forEach(function (s) { if (below[(s.properties || {}).laneId]) shiftState(s, def, dy); });
    return h;
  }
  /* remove a lane; its nodes go to `moveTo` (centred vertically there, x kept) */
  function removeLane(def, laneId, moveTo) {
    var before = laneOffsets(def);
    var gone = before[laneId];
    if (!gone) return def;
    var target = moveTo && before[moveTo] ? moveTo : "";
    var moving = (def.states || []).filter(function (s) { return (s.properties || {}).laneId === laneId; });
    def.lanes = (def.lanes || []).filter(function (l) { return l.id !== laneId; });
    var after = laneOffsets(def);
    (def.states || []).forEach(function (s) {
      var id = (s.properties || {}).laneId;
      if (id !== laneId && before[id] && after[id]) shiftState(s, def, after[id].top - before[id].top);
    });
    /* moved nodes keep their offset inside the lane (clamped into the target, which grows to fit) */
    moving.forEach(function (s) {
      if (!target) return;
      var l = after[target];
      var b = box(s, def);
      var c = centerOf(s, def);
      var offset = Math.min(Math.max(c.y - gone.top, b.h / 2 + 20), Math.max(b.h / 2 + 20, gone.height - b.h / 2 - 20));
      s.properties.laneId = target;
      place(s, def, c.x, Math.round((l.top + offset) / 20) * 20);
    });
    if (target) resizeLane(def, target, Math.max(after[target].height, laneMinHeight(def, target)));
    return def;
  }

  /* ------------------------------------------------------------------ split a connection (US-188 AC-02)
     A → B becomes A → N → B: the first part keeps the label, guard, form and source port; the new
     part leaves N unlabelled into B's port. */
  function splitEdge(def, srcId, index, node) {
    var src = (def.states || []).filter(function (s) { return s.id === srcId; })[0];
    var t = src && (src.transitions || [])[index];
    if (!t) return null;
    var oldTarget = t.target;
    var tail = { event: "next", target: oldTarget };
    if (t.targetPort) tail.targetPort = t.targetPort;
    t.target = node.id;
    delete t.targetPort;
    delete t.waypoints;
    delete t.labelDx;
    delete t.labelDy;
    node.transitions = [tail];
    def.states.push(node);
    return node;
  }

  /* ------------------------------------------------------------------ auto-layout (spec F.11)
     Layered left to right inside each lane: longest-path layers from Start (back edges ignored),
     columns as wide as their widest shape + 80, nodes of one lane and layer stacked (40 apart,
     ordered by their predecessors), lanes grow to fit. Only x / y, lane heights and manual
     waypoints change. */
  function autoLayout(def) {
    var states = def.states || [];
    var byId = {};
    states.forEach(function (s) { byId[s.id] = s; });
    /* back edges by DFS from Start (then from anything not reached) */
    var back = {};
    var mark = {};
    function dfs(id) {
      mark[id] = 1;
      (byId[id].transitions || []).forEach(function (tr, i) {
        if (!byId[tr.target]) return;
        if (mark[tr.target] === 1) back[id + ":" + i] = true;
        else if (!mark[tr.target]) dfs(tr.target);
      });
      mark[id] = 2;
    }
    if (byId[def.initialState]) dfs(def.initialState);
    states.forEach(function (s) { if (!mark[s.id]) dfs(s.id); });
    /* longest path layers on the remaining DAG (Kahn) */
    var indeg = {};
    var layer = {};
    states.forEach(function (s) { indeg[s.id] = 0; layer[s.id] = 0; });
    states.forEach(function (s) { (s.transitions || []).forEach(function (tr, i) { if (byId[tr.target] && !back[s.id + ":" + i]) indeg[tr.target] += 1; }); });
    var queue = states.filter(function (s) { return !indeg[s.id]; }).map(function (s) { return s.id; });
    var order = [];
    while (queue.length) {
      var id = queue.shift();
      order.push(id);
      (byId[id].transitions || []).forEach(function (tr, i) {
        if (!byId[tr.target] || back[id + ":" + i]) return;
        layer[tr.target] = Math.max(layer[tr.target], layer[id] + 1);
        indeg[tr.target] -= 1;
        if (!indeg[tr.target]) queue.push(tr.target);
      });
    }
    /* the end sits in the last column */
    var maxLayer = 0;
    states.forEach(function (s) { maxLayer = Math.max(maxLayer, layer[s.id]); });
    states.forEach(function (s) { if (typeOf(s, def) === "end") layer[s.id] = maxLayer; });
    /* columns */
    var colW = [];
    states.forEach(function (s) { var w = (VIEW[typeOf(s, def)] || VIEW.activity).w; colW[layer[s.id]] = Math.max(colW[layer[s.id]] || 0, w); });
    var colX = [];
    var x = 40;
    for (var li = 0; li <= maxLayer; li++) { var w = colW[li] || 40; colX[li] = x + w / 2; x += w + 80; }
    /* cells (lane × layer), ordered by the mean row of the predecessors */
    var lanes = def.lanes || [];
    var laneIds = lanes.length ? lanes.map(function (l) { return l.id; }) : [""];
    var laneOf = function (s) { var id = (s.properties || {}).laneId; return laneIds.indexOf(id) >= 0 ? id : laneIds[0]; };
    var preds = {};
    states.forEach(function (s) { (s.transitions || []).forEach(function (tr) { (preds[tr.target] = preds[tr.target] || []).push(s.id); }); });
    var rank = {};
    order.forEach(function (id, i) { rank[id] = i; });
    var cells = {};
    order.forEach(function (id) { var k = laneOf(byId[id]) + "|" + layer[id]; (cells[k] = cells[k] || []).push(id); });
    var slot = {};
    var laneNeed = {};
    Object.keys(cells).forEach(function (k) {
      var ids = cells[k];
      var score = function (id) { var p = preds[id] || []; return p.length ? p.reduce(function (n, pid) { return n + (slot[pid] || 0) + rank[pid] / 1000; }, 0) / p.length : rank[id] / 1000; };
      ids.sort(function (a, b) { return score(a) - score(b); });
      var h = 0;
      ids.forEach(function (id, i) { slot[id] = i; h += (VIEW[typeOf(byId[id], def)] || VIEW.activity).h + (i ? 40 : 0); });
      var lane = k.split("|")[0];
      laneNeed[lane] = Math.max(laneNeed[lane] || 0, h);
    });
    /* lane heights grow to fit (never shrink below what they were, never below the minimum) */
    lanes.forEach(function (l) { l.height = Math.max(LANE_MIN, Number(l.height) || 160, Math.ceil(((laneNeed[l.id] || 0) + 80) / 20) * 20); });
    var tops = {};
    var top = 0;
    laneIds.forEach(function (id, i) { tops[id] = top; top += lanes.length ? lanes[i].height : 0; });
    Object.keys(cells).forEach(function (k) {
      var ids = cells[k];
      var lane = k.split("|")[0];
      var lh = lanes.length ? lanes[laneIds.indexOf(lane)].height : 0;
      var total = ids.reduce(function (n, id, i) { return n + (VIEW[typeOf(byId[id], def)] || VIEW.activity).h + (i ? 40 : 0); }, 0);
      var y = tops[lane] + Math.max(40, (lh - total) / 2);
      ids.forEach(function (id) {
        var s = byId[id];
        var v = VIEW[typeOf(s, def)] || VIEW.activity;
        place(s, def, Math.round(colX[layer[id]] / 20) * 20, Math.round((y + v.h / 2) / 20) * 20);
        if (lanes.length) s.properties.laneId = lane;
        y += v.h + 40;
      });
    });
    states.forEach(function (s) { (s.transitions || []).forEach(function (tr) { delete tr.waypoints; }); });
    return def;
  }
  function hasWaypoints(def) {
    return (def.states || []).some(function (s) { return (s.transitions || []).some(function (tr) { return tr.waypoints && tr.waypoints.length; }); });
  }

  /* ------------------------------------------------------------------ paths (case trajectory overlay)
     the shortest chain of connections through the given stops, in order */
  function pathThrough(def, stops) {
    var byId = {};
    (def.states || []).forEach(function (s) { byId[s.id] = s; });
    var nodes = [];
    var edges = [];
    var from = def.initialState;
    var list = (stops || []).filter(function (id) { return byId[id]; });
    list.forEach(function (to) {
      if (to === from) return;
      var prev = {};
      prev[from] = null;
      var queue = [from];
      while (queue.length && !(to in prev)) {
        var id = queue.shift();
        (byId[id].transitions || []).forEach(function (tr, i) {
          if (byId[tr.target] && !(tr.target in prev)) { prev[tr.target] = { id: id, i: i }; queue.push(tr.target); }
        });
      }
      if (!(to in prev)) return;
      var chainN = [];
      var chainE = [];
      for (var at = to; prev[at]; at = prev[at].id) { chainN.unshift(at); chainE.unshift(prev[at].id + ":" + prev[at].i); }
      nodes = nodes.concat(chainN);
      edges = edges.concat(chainE);
      from = to;
    });
    if (byId[def.initialState]) nodes.unshift(def.initialState);
    return { nodes: nodes.filter(function (id, i) { return nodes.indexOf(id) === i; }), edges: edges.filter(function (k, i) { return edges.indexOf(k) === i; }) };
  }

  /* ------------------------------------------------------------------ versions */
  function bumpPatch(version) {
    var parts = String(version || "1.0.0").replace(/^v/, "").split(".").map(function (n) { return Number(n) || 0; });
    while (parts.length < 3) parts.push(0);
    parts[2] += 1;
    return parts.slice(0, 3).join(".");
  }

  return {
    parse: parse,
    serialize: serialize,
    KEY_ORDER: KEY_ORDER,
    putKey: putKey,
    setKey: setKey,
    TYPES: TYPES,
    TYPE_LABEL: TYPE_LABEL,
    TYPE_TO_ELEMENT: TYPE_TO_ELEMENT,
    TYPE_KIND: TYPE_KIND,
    typeOf: typeOf,
    nameOf: nameOf,
    SIZE: SIZE,
    VIEW: VIEW,
    centerOf: centerOf,
    place: place,
    DIAMOND: DIAMOND,
    PORTS: PORTS,
    normalPort: normalPort,
    box: box,
    center: center,
    portPoint: portPoint,
    facingPorts: facingPorts,
    nearestPort: nearestPort,
    LANE_MIN: LANE_MIN,
    LANE_MAX: LANE_MAX,
    lanesLayout: lanesLayout,
    laneAt: laneAt,
    route: route,
    pathD: pathD,
    labelPoint: labelPoint,
    newDefinition: newDefinition,
    fromFlowSteps: fromFlowSteps,
    MSG: MSG,
    validate: validate,
    blocksSave: blocksSave,
    OPERATORS: OPERATORS,
    BOOL_OPS: BOOL_OPS,
    VALUE_OPS: VALUE_OPS,
    CASE_FIELDS: CASE_FIELDS,
    fieldKind: fieldKind,
    guardProblems: guardProblems,
    usedVariables: usedVariables,
    hasAvizare: hasAvizare,
    reorderLanes: reorderLanes,
    laneMinHeight: laneMinHeight,
    resizeLane: resizeLane,
    removeLane: removeLane,
    splitEdge: splitEdge,
    autoLayout: autoLayout,
    hasWaypoints: hasWaypoints,
    pathThrough: pathThrough,
    bumpPatch: bumpPatch
  };
});
