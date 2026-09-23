/**
 * api/client.js — the only thing the view talks to.
 *
 * Today it resolves against the in-process mock server. Pointing it at a real
 * backend means replacing `transport` and deleting the fixture loading; the
 * view does not change, because it only ever sees the returned shapes.
 *
 * Every call is async and returns a promise, so the swap does not turn
 * synchronous code asynchronous later.
 */
(function (root, factory) {
  var isNode = typeof module === "object" && module.exports;
  var deps = isNode
    ? { endpoints: require("./endpoints.js"), mockServer: require("./mock-server.js") }
    : { endpoints: (root.GEAP || {}).endpoints, mockServer: (root.GEAP || {}).mockServer };
  Object.keys(deps).forEach(function (k) {
    if (!deps[k]) throw new Error("api/client.js requires api/" + k + " to be loaded first");
  });
  var api = factory(deps, isNode);
  if (isNode) module.exports = api;
  else ((root.GEAP = root.GEAP || {}).client = api);
})(typeof self !== "undefined" ? self : this, function (deps, isNode) {
  "use strict";

  /* Fixture loading differs by host; nothing else does. */
  function loadFixtures(basePath) {
    var names = Object.keys(deps.endpoints.FIXTURES);

    if (isNode) {
      var fs = require("fs");
      var path = require("path");
      var out = {};
      names.forEach(function (name) {
        var file = path.resolve(basePath || process.cwd(), deps.endpoints.FIXTURES[name]);
        out[name] = JSON.parse(fs.readFileSync(file, "utf8"));
      });
      return Promise.resolve(out);
    }

    var prefix = basePath || "";
    return Promise.all(names.map(function (name) {
      return fetch(prefix + deps.endpoints.FIXTURES[name], { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("failed to load " + deps.endpoints.FIXTURES[name] + " (" + r.status + ")");
          return r.json();
        });
    })).then(function (loaded) {
      var out = {};
      names.forEach(function (name, i) { out[name] = loaded[i]; });
      return out;
    });
  }

  function createClient(options) {
    var opts = options || {};
    var ready = null;
    var server = null;

    function init() {
      if (!ready) {
        ready = loadFixtures(opts.basePath).then(function (fixtures) {
          server = deps.mockServer.createMockServer(fixtures);
          return server;
        });
      }
      return ready;
    }

    /* Non-2xx becomes a rejection carrying the status, so callers handle
       transport failures the same way they will against a real backend. */
    function unwrap(response) {
      if (response.status >= 200 && response.status < 300) return response.body;
      var err = new Error((response.body && response.body.error) || ("request failed: " + response.status));
      err.status = response.status;
      throw err;
    }

    function call(fn) {
      return init().then(function (s) { return unwrap(fn(s)); });
    }

    return {
      listClassifiers: function (query) {
        return call(function (s) { return s.listClassifiers(query); });
      },
      getClassifier: function (id, query) {
        return call(function (s) { return s.getClassifier(id, query); });
      },
      classifierActions: function (body) {
        return call(function (s) { return s.classifierActions(body); });
      },
      getCatalog: function () {
        return call(function (s) { return s.getCatalog(); });
      },
      getCompartments: function (query) {
        return call(function (s) { return s.getCompartments(query); });
      }
    };
  }

  return { createClient: createClient };
});
