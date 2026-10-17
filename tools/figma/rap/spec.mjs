// RAP public registry — DOM spec per demo state × width, the input of the Figma builders (tools/figma/rap/*.js).
// Reads the rendered code (rap-evo/index.html?state=<id> or ?<params>): list toolbar, filter bar, facet popover,
// company summary, table rows, pagination, empty state, act profile (header meta, beneficiary, details, authority),
// not-found; + boxes / computed styles of the key elements (geometry check).
// Usage: node --experimental-websocket --no-warnings tools/figma/rap/spec.mjs \
//   [--states rap-01,rap-02] [--extra "co=idno=1003600012345,q=..."] [--widths 1440,375] [--out tools/figma/rap/out/spec.json]
import { spawn } from "node:child_process";
import fs from "node:fs";
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:8936"); // 8936 = a worktree of the committed HEAD (python -m http.server)
const states = arg("states", "rap-01,rap-01a,rap-01b,rap-01c,rap-01d,rap-02,rap-02a,rap-02b,rap-02c").split(",").filter(Boolean);
// extra = name=querystring pairs separated by ";" (no demo state: URL params, optional search text after "|")
const extra = (arg("extra", "") || "").split(";").filter(Boolean).map(s => { const [name, rest] = s.split("="); const [qs, typed] = s.slice(name.length + 1).split("|"); return { name, qs, typed }; });
const widths = arg("widths", "1440,375").split(",").map(Number);
const OUT = arg("out", "tools/figma/rap/out/spec.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/rapspec-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let seq = 0; const pend = new Map(); let errors = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || { error: m.error }); pend.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text); });
const send = (method, params = {}) => new Promise(r => { const i = ++seq; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const r = await Promise.race([send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }), sleep(15000).then(() => ({ timeout: true }))]); if (r?.timeout) { console.log("  eval timeout"); return null; } if (r?.exceptionDetails) console.log("  eval error", r.exceptionDetails.exception?.description?.slice(0, 200)); return r?.result?.value; };
await send("Runtime.enable"); await send("Page.enable");

const COLLECT = `(() => {
  const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.display !== "none" && c.visibility !== "hidden" && !el.closest("[hidden]"); };
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)]; };
  const T = el => el ? el.textContent.replace(/\\s+/g, " ").trim() : null;
  const q = (s, root = document) => [...root.querySelectorAll(s)].find(vis) || null;
  const qa = (s, root = document) => [...root.querySelectorAll(s)].filter(vis);
  const ST = (el, keys) => { if (!el) return null; const c = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = c[k]; return o; };
  const geo = {};
  const G = (name, sel, keys = ["padding","gap","borderRadius","backgroundColor","border","fontSize","lineHeight","fontWeight","color","height"]) => { const el = q(sel); if (el) geo[name] = [R(el), ST(el, keys)]; };
  const out = { docH: document.documentElement.scrollHeight, vw: innerWidth, title: document.title };
  const listView = q("[data-rap-list-view]");
  const prof = q("[data-rap-profile-view]");
  if (listView) {
    out.view = "list";
    out.h1 = T(q("[data-rap-title]")); out.sub = T(q("[data-rap-subtitle]"));
    const s = q("[data-rap-search]"); out.search = { value: s.value, placeholder: s.placeholder };
    const fb = document.querySelector("[data-rap-filter-toggle]"); out.filterBtn = { hidden: !vis(fb), expanded: fb.getAttribute("aria-expanded"), count: T(q("[data-rap-filter-count]")), label: vis(fb.querySelector("span")) ? T(fb.querySelector("span")) : "", rect: R(fb) };
    const bar = q("[data-rap-filters]");
    if (bar) out.bar = { rect: R(bar), sheets: bar.classList.contains("is-sheets"), chips: qa(".e-permits-workplace__filter-chip", bar).map(c => ({ all: c.classList.contains("e-permits-workplace__filter-chip--all"), label: T(c.querySelector(".chip__label")), n: T(c.querySelector(".badge")) || "", sel: c.classList.contains("is-selected"), open: c.getAttribute("aria-expanded") === "true", rect: R(c) })),
      meta: qa(".e-permits-workplace__filter-meta > *", bar).map(m => ({ k: m.tagName === "BUTTON" ? (m.classList.contains("btn-primary") ? "primary" : "text") : "text-span", t: T(m), rect: R(m) })) };
    const pop = q(".e-permits-workplace__filter-pop");
    if (pop) out.pop = { rect: R(pop), label: pop.getAttribute("aria-label"), search: q("[data-filter-search]", pop)?.placeholder || null,
      options: qa(".e-permits-workplace__filter-option", pop).map(o => ({ v: o.querySelector("input").value, checked: o.querySelector("input").checked, tag: !!o.querySelector(".e-permits-workplace__tag"), tone: (o.querySelector(".e-permits-workplace__tag")?.className.match(/--(\\w+)/) || [])[1] || null })),
      buttons: qa(".e-permits-workplace__filter-footer .btn", pop).map(b => T(b)) };
    const cs = q("[data-rap-company-summary]");
    if (cs) out.company = { rect: R(cs), name: T(q("strong", cs)), idType: T(q(".rap-company-summary__id span", cs)), id: T(q(".rap-company-summary__id code", cs)), metrics: qa(".rap-company-summary__metric", cs).map(m => [T(m.querySelector("strong")), T(m.querySelector("span"))]) };
    const reg = q(".rap-register");
    if (reg) {
      out.rows = qa("tr[data-record-id]").map(tr => { const td = tr.querySelectorAll("td"); return {
        id: tr.dataset.recordId, person: !!tr.querySelector("use[href$='person-filled']"), name: T(td[0].querySelector(".rap-beneficiary__name")), ident: T(td[0].querySelector(".rap-copy__value")), masked: !!td[0].querySelector(".rap-copy--masked"),
        act: T(td[1]), code: T(td[2].querySelector(".rap-cell-stack__primary")), auth: T(td[2].querySelector(".rap-cell-stack__secondary")),
        nr: T(td[3].querySelector(".rap-copy__value")), dosar: T(td[3].querySelector(".rap-cell-stack__secondary")),
        until: T(td[4].querySelector(".rap-cell-stack__primary")), issued: T(td[4].querySelector(".rap-cell-stack__secondary")),
        status: T(td[5]), tone: (td[5].querySelector(".e-permits-workplace__tag")?.className.match(/--(\\w+)/) || [])[1],
        tags: [...td[5].querySelectorAll(".e-permits-workplace__tag")].map(t => [T(t), (t.className.match(/--(\\w+)/) || [])[1]]), hover: tr.matches(":hover"), rect: R(tr) }; });
      out.cols = qa(".rap-table thead th").map(th => [T(th), R(th)[2]]);
      out.table = R(q(".rap-table-scroller"));
      out.summary = T(q("[data-rap-results-summary]")); out.pageSize = q("[data-rap-page-size]")?.value;
      out.pages = qa("[data-rap-pagination] .rap-page-button").map(b => ({ t: T(b), active: b.classList.contains("is-active"), disabled: b.disabled }));
      out.pager = R(q(".rap-pagination"));
    }
    const em = q("[data-rap-empty]");
    if (em) out.empty = { rect: R(em), title: T(q(".e-permits-empty__title", em)), text: T(q(".e-permits-empty__text", em)), action: T(q(".btn", em)) };
    G("toolbar", ".rap-toolbar"); G("searchBox", ".rap-search"); G("filterBtn", "[data-rap-filter-toggle]"); G("bar", "[data-rap-filters]"); G("chip", ".e-permits-workplace__filter-chip");
    G("pop", ".e-permits-workplace__filter-pop"); G("popOption", ".e-permits-workplace__filter-option"); G("popFooter", ".e-permits-workplace__filter-footer");
    G("thead", ".rap-table thead th"); G("td", ".rap-table tbody td"); G("tr", ".rap-table tbody tr"); G("scroller", ".rap-table-scroller"); G("benef", ".rap-beneficiary"); G("avatar", ".rap-beneficiary__avatar");
    G("bname", ".rap-beneficiary__name"); G("bid", ".rap-copy--id"); G("actLink", ".rap-act-link"); G("prim", ".rap-cell-stack__primary"); G("sec", ".rap-cell-stack__secondary"); G("nrCopy", ".rap-copy--act");
    G("tag", ".rap-table .e-permits-workplace__tag"); G("rowAction", ".rap-row-action"); G("pagination", ".rap-pagination"); G("pageBtn", ".rap-page-button.is-active"); G("pageDir", ".rap-page-button--direction");
    G("sizeSel", ".rap-select"); G("empty", "[data-rap-empty] .e-permits-empty"); G("emptyIcon", "[data-rap-empty] .e-permits-empty__icon"); G("company", "[data-rap-company-summary]"); G("companyInner", ".rap-company-summary__inner");
    G("h1", "[data-rap-title]"); G("sub", "[data-rap-subtitle]"); G("crumbs", ".rap-breadcrumbs"); G("main", ".rap-main__container"); G("intro", ".rap-intro");
  }
  if (prof) {
    const nf = q(".e-permits-empty", prof);
    if (nf) { out.view = "notfound"; out.empty = { rect: R(nf), title: T(q(".e-permits-empty__title", prof)), text: T(q(".e-permits-empty__text", prof)), action: T(q(".btn", prof)) }; G("empty", "[data-rap-profile-view] .e-permits-empty"); G("container", ".rap-profile__container"); }
    else {
      out.view = "profile";
      out.h1 = T(q("h1", prof));
      out.crumbs = qa(".breadcrumbs__link", prof).map(T);
      out.meta = qa(".e-permits-page-header__meta-item", prof).map(m => ({ label: T(m.querySelector(".e-permits-page-header__meta-label")), value: T(m.querySelector(".e-permits-page-header__meta-value")).replace(/ Copiază.*$/, ""), copy: !!m.querySelector(".rap-profile__copy"), tag: (m.querySelector(".e-permits-workplace__tag")?.className.match(/--(\\w+)/) || [])[1] || null, rowStart: m.classList.contains("is-row-start"), rect: R(m) }));
      const bc = q(".rap-profile__beneficiary-card", prof);
      out.benef = { person: !!bc.querySelector("use[href$='person-filled']"), name: T(bc.querySelector("strong")), idType: T(bc.querySelector(".rap-profile__beneficiary-meta > span")), id: T(bc.querySelector(".rap-profile__beneficiary-meta code, .rap-profile__beneficiary-meta .rap-profile__copy > span")), copy: !!bc.querySelector(".rap-profile__copy"), acts: T(bc.querySelector(".rap-profile__company-permits")), rect: R(bc), actsRect: R(bc.querySelector(".rap-profile__company-permits")) };
      out.sections = qa(".e-permits-dosar-profil__section", prof).map(s => ({ title: T(s.querySelector(".e-permits-dosar-profil__section-title")), rect: R(s),
        rows: qa(".e-permits-dosar-profil__row", s).map(r => ({ label: T(r.querySelector(".e-permits-dosar-profil__row-label")), value: T(r.querySelector(".e-permits-dosar-profil__row-value")).replace(/ Copiază.*$/, ""), copy: !!r.querySelector(".rap-profile__copy"), tag: (r.querySelector(".e-permits-workplace__tag")?.className.match(/--(\\w+)/) || [])[1] || null, rect: R(r) })),
        links: qa(".rap-profile__support-links .btn", s).map(T) }));
      out.button = { t: T(q("[data-rap-view-document]", prof)), rect: R(q("[data-rap-view-document]", prof)) };
      G("container", ".rap-profile__container"); G("header", ".rap-profile__header"); G("headerBody", ".e-permits-page-header__body"); G("title", ".rap-profile .e-permits-page-header__title");
      G("metaWrap", ".e-permits-page-header__meta"); G("metaItem", ".e-permits-page-header__meta-item"); G("metaItem2", ".e-permits-page-header__meta-item:nth-child(2)"); G("metaLabel", ".e-permits-page-header__meta-label"); G("metaValue", ".e-permits-page-header__meta-value");
      G("btn", "[data-rap-view-document]"); G("panel", ".e-permits-dosar-profil__panel"); G("section", ".e-permits-dosar-profil__section"); G("secTitle", ".e-permits-dosar-profil__section-title");
      G("card", ".e-permits-dosar-profil__card"); G("row", ".e-permits-dosar-profil__row"); G("rowLabel", ".e-permits-dosar-profil__row-label"); G("rowValue", ".e-permits-dosar-profil__row-value");
      G("bcard", ".rap-profile__beneficiary-card"); G("bavatar", ".rap-profile__beneficiary-avatar"); G("bname", ".rap-profile__beneficiary-name-row strong"); G("bnameRow", ".rap-profile__beneficiary-name-row"); G("bmeta", ".rap-profile__beneficiary-meta");
      G("acts", ".rap-profile__company-permits"); G("copy", ".rap-profile__copy"); G("tag", ".rap-profile .e-permits-workplace__tag"); G("links", ".rap-profile__support-links"); G("linkBtn", ".rap-profile__support-links .btn"); G("crumbs", ".rap-profile__breadcrumbs");
    }
  }
  G("hdr", ".rap-header"); G("hdrTop", ".rap-header__top"); G("hdrNav", ".rap-header__navigation"); G("csAvatar", ".rap-company-summary__avatar"); G("csMetrics", ".rap-company-summary__metrics"); G("csMetric", ".rap-company-summary__metric"); G("csMetricN", ".rap-company-summary__metric strong"); G("csMetricL", ".rap-company-summary__metric span"); G("csName", ".rap-company-summary__identity strong"); G("csId", ".rap-company-summary__id");
  const tip = [...document.querySelectorAll(".rap-tooltip, [role=tooltip]")].find(vis); if (tip) out.tooltip = { t: T(tip), rect: R(tip) };
  const sh = q('.e-permits-filter-sheet[aria-hidden="false"] .bottom-sheet__panel') || q(".bottom-sheet__panel");
  if (sh) out.sheet = { rect: R(sh), title: T(q("[data-sheet-title]", sh)), reset: T(q("[data-sheet-reset]", sh)), apply: T(q("[data-sheet-apply]", sh)),
    search: q("[data-filter-search]", sh) ? { placeholder: q("[data-filter-search]", sh).placeholder, value: q("[data-filter-search]", sh).value } : null,
    options: qa(".e-permits-workplace__filter-option", sh).map(o => ({ v: o.querySelector("input").value, checked: o.querySelector("input").checked, tone: (o.querySelector(".e-permits-workplace__tag")?.className.match(/--(\\w+)/) || [])[1] || null })),
    sections: qa(".e-permits-filter-sheet__section", sh).map(se => ({ label: T(se.querySelector(".e-permits-filter-sheet__section-label")), summary: vis(se.querySelector("[data-sheet-summary]")) ? T(se.querySelector("[data-sheet-summary]")) : "", open: se.querySelector("[data-sheet-toggle]").getAttribute("aria-expanded") === "true" })),
    empty: T(q(".e-permits-empty__title", sh)) };
  const dm = q("[data-rap-act-data].is-active .modal");
  if (dm) out.dataModal = { rect: R(dm), title: T(q(".modal--header-title", dm)), number: T(q(".rap-act-subtitle__number", dm))?.replace(/ Copiază.*$/, ""), name: T(q(".rap-act-subtitle__text", dm)), clamp: q("[data-rap-clamp-toggle]", dm) ? q("[data-rap-clamp-toggle]", dm).getAttribute("aria-expanded") : null, more: T(q(".rap-act-subtitle__more", dm)),
    scrollTop: q(".modal-content", dm).scrollTop, scrollH: q(".modal-content", dm).scrollHeight, clientH: q(".modal-content", dm).clientHeight, header: R(q(".modal--header", dm)), footer: R(q(".modal--footer", dm)),
    sections: qa(".e-permits-dosar-profil__section", dm).map(se => ({ title: T(se.querySelector(".e-permits-dosar-profil__section-title")), items: [...se.querySelectorAll(".e-permits-dosar-profil__card > *")].filter(vis).map(r => r.classList.contains("rap-act-data__group") ? { group: T(r) } : r.classList.contains("rap-act-data__toggle") ? { toggle: T(r) } : { label: T(r.querySelector(".e-permits-dosar-profil__row-label")), value: T(r.querySelector(".e-permits-dosar-profil__row-value")).replace(/ Copiază.*$/, ""), copy: !!r.querySelector(".rap-profile__copy"), tag: [...r.querySelectorAll(".e-permits-workplace__tag")].map(t => [T(t), (t.className.match(/--(\\w+)/) || [])[1]]) }) })),
    note: T(q(".info-box", dm)), buttons: qa(".modal--footer .btn", dm).map(T) };
  const am = q("[data-rap-act-modal]:not([hidden]) .rap-act-modal__dialog");
  if (am) out.docModal = { rect: R(am), title: T(q(".e-permits-fo-doc-modal__title", am)), number: T(q(".rap-act-subtitle__number", am))?.replace(/ Copiază.*$/, ""), name: T(q(".rap-act-subtitle__text", am)),
    loading: !!q(".spinner", am), state: q(".e-permits-empty", am) ? { title: T(q(".e-permits-empty__title", am)), text: T(q(".e-permits-empty__text", am)) } : null, canvas: R(q(".rap-act-modal__canvas", am)),
    pages: qa(".rap-act-doc", am).map(p => ({ rect: R(p), zoom: p.style.zoom, wm: T(p.querySelector(".rap-act-doc__watermark")), wmTone: (p.querySelector(".rap-act-doc__watermark")?.className.match(/--(\\w+)/) || [])[1] || null, cont: T(p.querySelector(".rap-act-doc__cont")),
      country: T(p.querySelector(".rap-act-doc__country")), authority: T(p.querySelector(".rap-act-doc__authority")), office: T(p.querySelector(".rap-act-doc__office")), h1: T(p.querySelector("h1")), number: T(p.querySelector(".rap-act-doc__number")),
      rows: [...p.querySelectorAll("tr")].filter(vis).map(tr => tr.classList.contains("rap-act-doc__group") ? { group: T(tr) } : [T(tr.children[0]), T(tr.children[1])]), closing: T(p.querySelector(".rap-act-doc__closing")),
      sign: p.querySelector(".rap-act-doc__sign") ? [T(p.querySelector(".rap-act-doc__label")), T(p.querySelector(".rap-act-doc__strong")), T(p.querySelector(".rap-act-doc__signed"))] : null, qr: T(p.querySelector(".rap-act-doc__qr-text")), footer: T(p.querySelector(".rap-act-doc__footer")) })),
    buttons: qa(".e-permits-fo-doc-modal__footer .btn, .e-permits-fo-doc-modal__footer button", am).map(T) };
  out.geo = geo;
  return out;
})()`;

const jobs = [...states.map(s => ({ name: s, url: `${BASE}/rap-evo/index.html?state=${s}` })), ...extra.map(e => ({ name: e.name, url: `${BASE}/rap-evo/index.html?${e.qs}`, typed: e.typed }))];
const all = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
for (const job of jobs) for (const w of widths) {
  errors = [];
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 500 ? 812 : 900, deviceScaleFactor: 1, mobile: w < 500 });
  await send("Page.navigate", { url: job.url });
  for (let i = 0; i < 120; i++) { await sleep(150); if (await ev(`!!document.querySelector("tr[data-record-id], [data-rap-profile-view]:not([hidden]) h1, [data-rap-profile-view]:not([hidden]) .e-permits-empty, [data-rap-empty]:not([hidden]) .e-permits-empty") && (!location.search.includes("state=") || !!document.documentElement.dataset.demoState)`)) break; }
  await sleep(1500);
  if (job.typed) { await ev(`(() => { const s = document.querySelector("[data-rap-search]"); s.value = ${JSON.stringify(job.typed)}; s.dispatchEvent(new Event("input", { bubbles: true })); })()`); await sleep(600); }
  const info = (await ev(COLLECT)) || {};
  info.demoState = await ev("document.documentElement.dataset.demoState || null");
  info.demoError = await ev("document.documentElement.dataset.demoError || null");
  info.errors = errors.slice();
  all[`${job.name}@${w}`] = info;
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log(job.name, w, info?.view, "rows", info.rows?.length ?? "-", "pop", !!info.pop, "h", info.docH, "demo", info.demoState, info.demoError || "", errors.length ? "ERR " + errors[0] : "");
}
fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
console.log("OUT", OUT); ws.close(); chrome.kill();
