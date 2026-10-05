/* Demo links: open the prototype on the exact screen a Figma frame shows.
   ?state=<id> (ids in js/demo-states.js, e.g. svc-04q) picks the role, the page /
   tab hash and replays the clicks that open the modal, drawer or menu on it.
   Loaded in <head>, before the page scripts: the role and hash are in place
   before the shell routes. The state runs once; the address then drops ?state so
   a refresh lands on the plain page. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("state");
  const states = window.GEAP_DEMO_STATES || {};
  const state = id && states[id];
  if (!id) return;
  if (!state) {
    console.warn(`[demo-links] Unknown state "${id}"`);
    return;
  }

  /* a clean start: the prototype keeps edits in this browser (created users,
     profile changes, filters, the form-builder sandbox), so a link opened after
     someone played with the demo would show another screen. Only this
     prototype's own keys go — github.io shares one origin between projects. */
  const OWN_KEY = /^(e-permits-|geap\.)/;
  [window.localStorage, window.sessionStorage].forEach((store) => {
    try {
      Object.keys(store).filter((key) => OWN_KEY.test(key)).forEach((key) => store.removeItem(key));
    } catch (error) { /* private mode: nothing stored */ }
  });

  if (state.as) {
    try { window.sessionStorage.setItem("e-permits-back-office-assignment", state.as); } catch (error) { /* private mode */ }
  }
  if (state.flow && params.get("flow") !== state.flow) params.set("flow", state.flow);
  const search = `?${params.toString()}`;
  history.replaceState(null, "", `${window.location.pathname}${search}${state.hash || window.location.hash}`);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const find = (selector, text) => [...document.querySelectorAll(selector)]
    .find((el) => visible(el) && (!text || el.textContent.replace(/\s+/g, " ").includes(text)));
  const waitFor = async (selector, text, timeout = 10000) => {
    const start = performance.now();
    for (;;) {
      const el = find(selector, text);
      if (el) return el;
      if (performance.now() - start > timeout) throw new Error(`not found: ${selector}${text ? ` "${text}"` : ""}`);
      await sleep(100);
    }
  };

  /* the actions a state may use; each waits for its element first */
  const h = {
    wait: sleep,
    find: waitFor,
    click: async (selector, text) => { const el = await waitFor(selector, text); el.click(); await sleep(450); return el; },
    nth: async (selector, index) => {
      await waitFor(selector);
      const el = [...document.querySelectorAll(selector)].filter(visible)[index];
      el.click(); await sleep(450); return el;
    },
    /* typing: input + focusout, like a person leaving the field */
    fill: async (selector, value, { leave = true } = {}) => {
      const el = await waitFor(selector);
      el.focus();
      el.value = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.closest(".search-input")?.classList.toggle("has-value", !!value);
      if (leave) el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      await sleep(400);
      return el;
    },
    /* a native <select> behind the library dropdown */
    choose: async (selector, value) => {
      await waitFor(selector).catch(() => null);
      const el = document.querySelector(selector);
      const select = el.tagName === "SELECT" ? el : el.querySelector("select");
      select.value = value ?? [...select.options].find((o) => o.value && !o.disabled)?.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(450);
      return select;
    },
    /* hover tooltips: the same pointer event a mouse sends */
    hover: async (selector, text) => {
      const el = await waitFor(selector, text);
      el.scrollIntoView({ block: "center" });
      el.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      await sleep(800);
      return el;
    },
    focus: async (selector, text) => { const el = await waitFor(selector, text); el.focus(); await sleep(300); return el; },
    scroll: async (selector, text) => { const el = await waitFor(selector, text); el.scrollIntoView({ block: "center" }); await sleep(300); return el; },
    hash: async (hash) => { window.location.hash = hash; await sleep(900); }
  };

  const run = async () => {
    try {
      if (state.ready) await waitFor(state.ready, null, 15000);
      await sleep(state.delay ?? 600);
      if (state.run) await state.run(h);
      document.documentElement.dataset.demoState = id;
    } catch (error) {
      console.warn(`[demo-links] "${id}" stopped: ${error.message}`);
      document.documentElement.dataset.demoState = `${id}:error`;
    } finally {
      const clean = new URLSearchParams(window.location.search);
      clean.delete("state");
      const query = clean.toString();
      history.replaceState(history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  };

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
