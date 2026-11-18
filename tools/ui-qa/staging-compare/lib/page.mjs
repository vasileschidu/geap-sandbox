// In-page library for staging-compare (injected into BOTH pages as window.__sc).
// Works across different DOMs: everything is found by role + accessible name / visible text, through open
// shadow roots (staging = Blazor + MUD web components, ours = plain library markup).
// Exported as a function source; run.mjs injects `(${PAGE_SC})(opts)`.
export const PAGE_SC = (opts) => {
  const o = opts || {};
  /* ------------------------------------------------------------------ deep DOM (light + open shadow roots) */
  const kids = (n) => {
    const out = [];
    /* a shadow host renders its shadow tree; light children appear through its <slot>s (never twice) */
    if (n.shadowRoot) out.push(...n.shadowRoot.children);
    else if (n.tagName === "SLOT") { const a = n.assignedElements({ flatten: true }); out.push(...(a.length ? a : n.children)); }
    else out.push(...n.children);
    return out;
  };
  const deepAll = (root, acc = []) => { for (const c of kids(root)) { if (/^(STYLE|SCRIPT|TEMPLATE|LINK|META)$/.test(c.tagName)) continue; acc.push(c); deepAll(c, acc); } return acc; };
  const parentOf = (n) => n.parentElement || (n.getRootNode && n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);
  const closestDeep = (n, sel) => { for (let x = n; x; x = parentOf(x)) { try { if (x.matches && x.matches(sel)) return x; } catch (e) { return null; } } return null; };
  const containsDeep = (a, b) => { for (let x = b; x; x = parentOf(x)) if (x === a) return true; return false; };
  /* deep query: plain CSS, or „text:<name>” = the smallest visible control/element whose accessible name or text equals */
  const $$ = (sel, root) => {
    const base = root || document.documentElement;
    if (sel.startsWith("text:")) {
      const want = norm(sel.slice(5));
      const hits = deepAll(base).filter((e) => vis(e) && (norm(accName(e)) === want || norm(ownText(e)) === want));
      return hits.filter((h) => !hits.some((x) => x !== h && containsDeep(h, x)));
    }
    let parts = sel.split(/\s*>>>\s*/); let ctx = [base];
    for (const p of parts) {
      const next = [];
      for (const c of ctx) {
        const scopes = [c, ...deepAll(c).filter((e) => e.shadowRoot).map((e) => e.shadowRoot)];
        for (const s of scopes) { try { next.push(...s.querySelectorAll(p)); } catch (e) { return []; } }
      }
      ctx = [...new Set(next)];
    }
    return ctx;
  };
  const $ = (sel, root) => $$(sel, root).find(vis) || null;

  /* ------------------------------------------------------------------ visibility, names */
  const vis = (el) => {
    if (!el || !el.isConnected || !el.getBoundingClientRect) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    /* visually-hidden (clip 1×1) */
    if (r.width <= 2 && r.height <= 2) return false;
    for (let x = el; x; x = parentOf(x)) { const c = getComputedStyle(x); if (c.display === "none" || c.visibility === "hidden" || +c.opacity === 0) return false; if (x.hasAttribute && x.hasAttribute("hidden")) return false; }
    return true;
  };
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[*•]+/g, " ").replace(/\S*\d\S*/g, "#").replace(/[„”"“'’:;.,!?()……›‹⌄]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const ownText = (el) => [...(el.childNodes || [])].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" ").replace(/\s+/g, " ").trim();
  /* visible text of an element, through shadow roots and slots, skipping visually hidden parts */
  const visText = (el) => {
    let t = "";
    const walk = (n) => {
      if (n.nodeType === 3) { t += n.nodeValue + " "; return; }
      if (n.nodeType !== 1 || /^(STYLE|SCRIPT|TEMPLATE)$/.test(n.tagName)) return;
      if (n !== el && !vis(n) && getComputedStyle(n).display !== "contents") return;
      if (n.shadowRoot) { for (const c of n.shadowRoot.childNodes) walk(c); return; }
      if (n.tagName === "SLOT") { const a = n.assignedNodes({ flatten: true }); for (const c of (a.length ? a : n.childNodes)) walk(c); return; }
      for (const c of n.childNodes) walk(c);
    };
    walk(el);
    return t.replace(/\s+/g, " ").trim();
  };
  /* a field's name: its label / aria-label (on it, its host or wrapper), never its current value */
  const fieldName = (el, input) => {
    const ph0 = input.getAttribute && input.getAttribute("placeholder"); if (ph0 && !/^select an option$/i.test(ph0)) return ph0;
    for (const n of [input, el, parentOf(el), parentOf(el) && parentOf(parentOf(el))].filter(Boolean)) {
      const a = n.getAttribute && (n.getAttribute("aria-label") || ""); if (a && !/^select an option$/i.test(a)) return a;
    }
    for (const n of [input, el]) { const lb = n.getAttribute && n.getAttribute("aria-labelledby"); if (lb) { const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim(); if (t) return t; } }
    if (input.id) { const l = document.querySelector(`label[for="${CSS.escape(input.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
    const ph = input.getAttribute && input.getAttribute("placeholder"); if (ph && !/^select an option$/i.test(ph)) return ph;
    /* the visible text just before the field (a label without for=) */
    let p = el; for (let d = 0; p && d < 3; d++, p = parentOf(p)) { let s = p.previousElementSibling; while (s && !vis(s)) s = s.previousElementSibling; if (s) { const t = visText(s); if (t && t.length <= 40) return t; break; } }
    return "";
  };
  const accName = (el) => {
    if (!el || !el.getAttribute) return "";
    const lab = el.getAttribute("aria-label"); if (lab) return lab.trim();
    const lb = el.getAttribute("aria-labelledby");
    if (lb) { const t = lb.split(/\s+/).map((id) => (el.getRootNode().getElementById?.(id) || document.getElementById(id))?.textContent || "").join(" ").trim(); if (t) return t; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
      return (el.getAttribute("placeholder") || el.getAttribute("title") || "").trim();
    }
    const t = visText(el); if (t) return t;
    /* a web-component host: the name of its inner control */
    if (el.shadowRoot) { const inner = el.shadowRoot.querySelector("button, a, input, [role]"); if (inner && inner !== el) { const n = inner.getAttribute("aria-label") || inner.getAttribute("title"); if (n) return n.trim(); } }
    return (el.getAttribute("title") || el.getAttribute("alt") || el.getAttribute("placeholder") || "").trim();
  };

  /* ------------------------------------------------------------------ paint helpers */
  const transparent = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);
  const paints = (el) => { const cs = getComputedStyle(el); return !transparent(cs.backgroundColor) || ["Top", "Right", "Bottom", "Left"].some((d) => parseFloat(cs["border" + d + "Width"]) > 0 && cs["border" + d + "Style"] !== "none" && !transparent(cs["border" + d + "Color"])) || /inset/.test(cs.boxShadow) || (cs.boxShadow !== "none" && cs.boxShadow); };
  const sameBox = (a, b, tol = 1.5) => Math.abs(a.left - b.left) <= tol && Math.abs(a.top - b.top) <= tol && Math.abs(a.width - b.width) <= tol && Math.abs(a.height - b.height) <= tol;
  /* the element that draws the control: a web-component host → the painted element inside it with the same box */
  const paintTarget = (el) => {
    if (!el.shadowRoot && !/-/.test(el.tagName)) return el;
    const r = el.getBoundingClientRect();
    const inner = deepAll(el).filter((n) => vis(n) && sameBox(n.getBoundingClientRect(), r, 2));
    return inner.find(paints) || inner.find((n) => /^(BUTTON|A|INPUT)$/.test(n.tagName)) || inner[0] || el;
  };
  /* a field's frame: the first box (≤ 3 levels up, through shadow roots) with a border / inset ring */
  const framed = (n) => { const cs = getComputedStyle(n); return ["Top", "Right", "Bottom", "Left"].filter((d) => parseFloat(cs["border" + d + "Width"]) > 0 && cs["border" + d + "Style"] !== "none").length >= 3 || /inset/.test(cs.boxShadow) || (!transparent(cs.backgroundColor) && parseFloat(cs.borderTopLeftRadius) > 0); };
  const fieldBox = (input) => { let b = input; for (let i = 0; b && i < 4; i++, b = parentOf(b)) if (framed(b)) return b; return input; };

  /* ------------------------------------------------------------------ classification */
  const CONTROL = "button, a[href], [role=button], [role=link], [role=tab], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=option], [role=checkbox], [role=radio], [role=switch], summary, [tabindex='0']";
  const FIELD = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]), textarea, select, [role=combobox]:not(button), [role=searchbox], [role=textbox]";
  const TAG = ".status-tag, .tag, .badge, [class*='-tag ']:not([class*='tags']), [class$='-tag'], mud-tag, mud-badge";
  const isCustomControl = (el) => /-/.test(el.tagName) && el.shadowRoot && !!el.shadowRoot.querySelector("button, a[href], [role=button]") && /BUTTON|LINK|CHIP|TAB|MENU/i.test(el.tagName);
  const isControl = (el) => { try { return el.matches(CONTROL) || isCustomControl(el); } catch (e) { return false; } };
  const isField = (el) => { try { return el.matches(FIELD) || /^MUD-(SELECT|INPUT|TEXTAREA|SEARCH)/.test(el.tagName); } catch (e) { return false; } };
  /* a tag is a small text pill: ≤ 32 high, no control (a checkbox row that carries a tag class is not a tag) */
  const isTag = (el) => { try { return el.matches(TAG) && el.getBoundingClientRect().height <= 32 && !el.querySelector("input, [role=checkbox], button"); } catch (e) { return false; } };
  /* the outermost control that is still „one” control (a host and its inner button count once) */
  const outerControl = (el) => { let top = el; for (let x = parentOf(el); x; x = parentOf(x)) { if (x.tagName === "TR" || x.tagName === "TD" || (x.getAttribute && x.getAttribute("role") === "row")) break; /* a clickable row is not the control of its cells */ if (isControl(x) && sameBox(x.getBoundingClientRect(), el.getBoundingClientRect(), 3)) top = x; else if (isControl(x)) return null; } return top; };

  /* ------------------------------------------------------------------ collection → semantic keys */
  const collect = (scopeSel, ignoreSel) => {
    const roots = (scopeSel ? $$(scopeSel) : [document.body]).filter((e) => vis(e) || (getComputedStyle(e).display === "contents" && deepAll(e).some(vis)));
    const root = roots[0] || document.body;
    const ign = (el) => ignoreSel && closestDeep(el, ignoreSel);
    const all = deepAll(root).filter((e) => vis(e) && !ign(e));
    const items = []; const used = new Set(); const keyCount = {};
    const add = (key, kind, el, extra) => {
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (keyCount[key] > 1) return; /* first occurrence wins (DOM order = reading order) */
      items.push({ key, kind, el, ...(extra || {}) }); used.add(el);
    };
    /* tables: column headers, the first body row, its cells and their parts */
    const tables = all.filter((e) => e.tagName === "TABLE" || e.getAttribute("role") === "table" || e.getAttribute("role") === "grid");
    const inTable = new Set();
    for (const t of tables.slice(0, 2)) {
      if (!items.some((x) => x.key === "table")) add("table", "table", t);
      const heads = deepAll(t).filter((e) => vis(e) && (e.tagName === "TH" || e.getAttribute("role") === "columnheader") && !closestDeep(e, "tbody"));
      const colKeys = heads.map((h, i) => { const tx = norm(visText(h)); return tx ? tx : i === heads.length - 1 ? "@last" : "@" + i; });
      heads.forEach((h, i) => add("col:" + colKeys[i], "colheader", h));
      const row = deepAll(t).find((e) => vis(e) && (e.tagName === "TR" || e.getAttribute("role") === "row") && !deepAll(e).some((c) => c.tagName === "TH" && vis(c)) && closestDeep(e, "tbody, [role=rowgroup]"));
      if (row) {
        add("row:first", "row", row);
        const cells = deepAll(row).filter((e) => vis(e) && (e.tagName === "TD" || e.getAttribute("role") === "cell" || e.getAttribute("role") === "gridcell") && closestDeep(e, "tr, [role=row]") === row);
        cells.forEach((c, i) => {
          const ck = colKeys[i] || "@" + i;
          add(`cell:${ck}`, "cell", c);
          const inner = deepAll(c).filter(vis);
          let ti = 0, ci = 0, ii = 0;
          const ctrls = inner.filter((e) => isControl(e) && outerControl(e) === e);
          for (const e of ctrls) add(`cell:${ck}:control${ci++}`, "control", e);
          const tags = inner.filter((e) => isTag(e) && !inner.some((p) => p !== e && isTag(p) && containsDeep(p, e)));
          for (const e of tags) add(`cell:${ck}:tag`, "tag", e);
          const leaves = inner.filter((e) => ownText(e) && !tags.some((t2) => containsDeep(t2, e)) && !/^(SVG|USE|PATH)$/i.test(e.tagName)).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          /* one text per visual line (the deepest element of the line) */
          const lines = [];
          for (const e of leaves) { const r = e.getBoundingClientRect(); const same = lines.find((l) => Math.abs(l.r.top - r.top) < 4); if (!same) lines.push({ e, r }); }
          for (const l of lines) add(`cell:${ck}:text${ti++}`, "text", l.e);
          const icons = inner.filter((e) => e.tagName.toLowerCase() === "svg" && !ctrls.some((x) => containsDeep(x, e)));
          for (const e of icons.slice(0, 2)) add(`cell:${ck}:icon${ii++}`, "icon", e);
        });
      }
      deepAll(t).forEach((e) => inTable.add(e)); inTable.add(t);
    }
    for (const el of all) {
      if (inTable.has(el) || used.has(el)) continue;
      const tag = el.tagName;
      /* headings */
      const hl = /^H([1-4])$/.exec(tag) || (el.getAttribute("role") === "heading" ? [0, el.getAttribute("aria-level") || "2"] : null);
      if (hl) { add(hl[1] === "1" ? "heading:h1" : "heading:" + norm(visText(el)), "heading", el); continue; }
      /* breadcrumbs */
      const crumbs = closestDeep(el, "[aria-label*=readcrumb], [aria-label=Navigare], .breadcrumbs, mud-breadcrumb, nav.fod-breadcrumb");
      if (crumbs && (isControl(el) || el.tagName === "MUD-BREADCRUMB-ITEM" || (el.tagName === "LI" && !el.querySelector("a")))) { const t = norm(visText(el)); if (t) add("crumb:" + t, "crumb", el); continue; }
      /* fields: the frame + the text inside */
      if (isField(el)) {
        if (closestDeep(parentOf(el) || el, FIELD) && closestDeep(parentOf(el) || el, FIELD) !== el) continue;
        const input = /^MUD-/.test(tag) ? (deepAll(el).find((n) => vis(n) && n.matches?.("input, select, textarea, [role=combobox], button")) || el) : el;
        const name = norm(fieldName(el, input));
        const fk = "field:" + (name || "@" + items.filter((i) => i.kind === "field").length);
        const box = fieldBox(input);
        add(fk, "field", box, { input });
        if (input !== box) add(fk + "::text", "fieldtext", input);
        /* an action inside the field (search submit, clear ×) */
        const acts = deepAll(box).filter((n) => vis(n) && isControl(n) && n !== input && outerControl(n) === n);
        acts.forEach((a, i) => add(fk + "::action" + i, "control", a));
        acts.forEach((a) => { used.add(a); deepAll(a).forEach((x) => used.add(x)); });
        const icons = deepAll(box).filter((n) => n.tagName.toLowerCase() === "svg" && vis(n) && !acts.some((a) => containsDeep(a, n)));
        icons.slice(0, 1).forEach((ic) => add(fk + "::icon", "icon", ic));
        continue;
      }
      if (used.has(el) || [...used].some((u) => u !== el && (isControl(u) || u.matches?.(FIELD)) && containsDeep(u, el))) continue;
      /* controls */
      if (isControl(el)) {
        if (outerControl(el) !== el) continue;
        if (closestDeep(parentOf(el) || el, FIELD)) continue;
        const nm = norm(accName(el));
        const ctx = closestDeep(el, "[role=menu], [role=listbox], [role=dialog], [role=tablist], nav, .pagination, [class*=pager], [class*=pagination]");
        const k = "control:" + (nm || "@icon" + (ctx ? ":" + norm(ctx.getAttribute("aria-label") || ctx.tagName) : "") + ":" + items.filter((i) => i.kind === "control" && i.key.includes("@icon")).length);
        /* an item of an open list / menu is an option (item-height rule), not a button */
        const inList = closestDeep(el, "[role=listbox], [role=menu], [role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], li[role], [class*=dropdown__item], [class*=select__option]");
        const chip = /CHIP/.test(el.tagName) || /\bchip\b|__chip|-chip/.test(String(el.className)) || el.hasAttribute("aria-haspopup") || (el.hasAttribute("aria-expanded") && !inList);
        add(k, inList ? "option" : "control", el, { chip });
        continue;
      }
      /* tags */
      if (isTag(el)) { add("tag:" + norm(visText(el)), "tag", el); continue; }
      /* static texts (labels, section titles, counters): matched on their text; the value next to a label */
      const own = ownText(el);
      if (own && own.length <= 80) {
        const t = norm(visText(el));
        if (!t || t === "#") continue;
        add("text:" + t, "text", el);
        /* key–value: the next text leaf in the same small row is the value of this label */
        for (let p = parentOf(el), d = 0; p && d < 3; p = parentOf(p), d++) {
          const leaves = deepAll(p).filter((n) => vis(n) && ownText(n) && !/^(SVG|USE)$/i.test(n.tagName));
          if (leaves.length < 2) continue;
          if (leaves.length > 4) break;
          if (leaves[0] === el || containsDeep(leaves[0], el)) { const v = leaves.find((n) => n !== el && !containsDeep(el, n) && !containsDeep(n, el)); if (v) add("value:" + t, "value", v); }
          break;
        }
      }
    }
    window.__scItems = items;
    return items.map((it, i) => ({ i, key: it.key, kind: it.kind, name: (accName(it.el) || visText(it.el)).slice(0, 60) }));
  };

  /* ------------------------------------------------------------------ measurement */
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const firstSvg = (el) => deepAll(el).find((n) => n.tagName.toLowerCase() === "svg" && vis(n)) || (el.tagName.toLowerCase() === "svg" ? el : null);
  const svgInfo = (svg) => {
    if (!svg) return null;
    const r = svg.getBoundingClientRect(); const cs = getComputedStyle(svg);
    /* the drawn shape: a <use> → its referenced symbol's first shape (same document); else the first shape */
    let shape = svg.querySelector("path, circle, rect, line, polyline, polygon");
    const use = svg.querySelector("use");
    if (!shape && use) { const href = use.getAttribute("href") || use.getAttribute("xlink:href") || ""; const id = href.split("#")[1]; const sym = id && (svg.getRootNode().getElementById?.(id) || document.getElementById(id)); shape = sym && sym.querySelector("path, circle, rect, line, polyline, polygon"); }
    const scs = shape ? getComputedStyle(shape) : cs;
    const strokeOn = !transparent(scs.stroke) && scs.stroke !== "none";
    const fillOn = !transparent(scs.fill) && scs.fill !== "none";
    const strokeAttr = shape && (shape.getAttribute("stroke-width") || (shape.closest("[stroke-width]")?.getAttribute("stroke-width")));
    const vb = svg.viewBox?.baseVal; const scale = vb && vb.width ? r.width / vb.width : 1;
    return {
      width: px(r.width), height: px(r.height),
      paint: strokeOn ? "stroke" : fillOn ? "fill" : "none",
      colour: strokeOn ? scs.stroke : fillOn ? scs.fill : cs.color,
      strokeWidth: strokeOn ? Math.round(parseFloat(strokeAttr || scs.strokeWidth) * 100) / 100 : null,
      strokeWidthRendered: strokeOn ? Math.round(parseFloat(strokeAttr || scs.strokeWidth) * scale * 100) / 100 : null
    };
  };
  const fontOf = (el) => { const cs = getComputedStyle(el); return { "font-family": cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), "font-size": cs.fontSize, "line-height": cs.lineHeight, "font-weight": cs.fontWeight, color: cs.color, "letter-spacing": cs.letterSpacing, "text-transform": cs.textTransform }; };
  const BOX = ["padding-top", "padding-right", "padding-bottom", "padding-left", "border-top-left-radius", "border-bottom-right-radius", "cursor", "opacity", "text-decoration-line", "justify-content", "align-items", "gap"];
  /* a row = the table row, or a small flex row around the element (≤ 3× its height, ≤ 96px) */
  const rowOf = (el) => closestDeep(el, "tr, [role=row]") || (() => { const h = el.getBoundingClientRect().height; for (let p = parentOf(el), d = 0; p && d < 4; p = parentOf(p), d++) { const cs = getComputedStyle(p); const ph = p.getBoundingClientRect().height; if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection) && ph >= h && ph <= Math.max(96, h * 3)) return p; } return null; })();
  /* what the eye sees: the background behind the element (its own, else the nearest painted ancestor) */
  const bgEff = (el) => { for (let n = el; n; n = parentOf(n)) { const b = getComputedStyle(n).backgroundColor; if (!transparent(b)) return b; } return "rgb(255, 255, 255)"; };
  /* the drawn edge, whatever draws it (border or an inset ring): „1px rgb(…)”, or per side when sides differ */
  const edgeOf = (el) => {
    const cs = getComputedStyle(el);
    const side = (d) => { const w = parseFloat(cs["border" + d + "Width"]); return w > 0 && cs["border" + d + "Style"] !== "none" && !transparent(cs["border" + d + "Color"]) ? `${w}px ${cs["border" + d + "Color"]}` : ""; };
    const sides = { top: side("Top"), right: side("Right"), bottom: side("Bottom"), left: side("Left") };
    const ring = /inset/.test(cs.boxShadow) && (cs.boxShadow.match(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset/) || cs.boxShadow.match(/inset\s+0px\s+0px\s+0px\s+([\d.]+)px/));
    const vals = Object.values(sides);
    if (vals.every((x) => x && x === vals[0])) return vals[0];
    if (vals.every((x) => !x)) { if (ring && ring[2]) return `${ring[2]}px ${ring[1]}`; return "none"; }
    return Object.entries(sides).filter(([, x]) => x).map(([k, x]) => `${k} ${x}`).join(" · ");
  };
  const outerShadow = (cs) => cs.boxShadow === "none" ? "none" : (cs.boxShadow.split(/,(?![^(]*\))/).map((x) => x.trim()).filter((x) => !/inset/.test(x)).join(", ") || "none");
  const measure = (i, contentLeft) => {
    const it = window.__scItems[i]; if (!it || !it.el.isConnected) return null;
    const el = it.kind === "field" || it.kind === "text" || it.kind === "value" || it.kind === "icon" ? it.el : paintTarget(it.el);
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const v = { w: px(r.width), h: px(r.height) };
    if (it.kind !== "icon") {
      for (const k of BOX) v[k] = cs.getPropertyValue(k).trim();
      v["edge"] = edgeOf(el); v["background-color"] = bgEff(el); v["box-shadow"] = outerShadow(cs);
      /* texts: the font of the text itself; boxes: the font of their label (the deepest text inside) */
      /* the element that carries the label text: its own text, or a <slot> whose assigned text renders there
         (slotted text inherits from the slot's flat-tree parent); icon-only controls have no type to compare */
      const carries = (n) => ownText(n) || (n.tagName === "SLOT" && n.assignedNodes({ flatten: true }).some((t) => t.nodeType === 3 && t.nodeValue.trim()));
      const label = it.kind === "text" || it.kind === "value" || it.kind === "fieldtext" ? el : (carries(el) ? el : deepAll(el).filter((n) => (n.tagName === "SLOT" || vis(n)) && carries(n))[0] || (carries(it.el) ? it.el : null));
      if (label) Object.assign(v, fontOf(label));
      if (it.kind === "fieldtext" && el.placeholder !== undefined) { const p = getComputedStyle(el, "::placeholder"); v["placeholder-color"] = p.color; v["placeholder-size"] = p.fontSize; }
    }
    if (it.kind === "text" || it.kind === "value") for (const k of [...BOX, "edge", "background-color", "box-shadow"]) delete v[k];
    if (it.kind === "text" || it.kind === "value" || it.kind === "fieldtext") { delete v.w; }
    /* a field: the frame is compared as a whole; its text start / icon place are measured from the frame */
    if (it.kind === "fieldtext") { for (const k of ["padding-top", "padding-right", "padding-bottom", "padding-left", "edge", "border-top-left-radius", "border-bottom-right-radius", "gap", "justify-content", "align-items", "box-shadow"]) delete v[k]; const box = fieldBox(el); const br = box.getBoundingClientRect(); v["text-start"] = px(r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) - br.left); }
    if (it.kind === "field") for (const k of ["padding-top", "padding-right", "padding-bottom", "padding-left", "gap", "justify-content", "align-items", "font-size", "line-height", "font-weight", "color", "letter-spacing", "text-transform", "font-family"]) delete v[k];
    /* table cells: their box only (the texts inside are measured as their own items) */
    if (it.kind === "cell" || it.kind === "row") for (const k of ["font-size", "line-height", "font-weight", "color", "letter-spacing", "text-transform", "font-family", "cursor", "justify-content", "align-items", "gap"]) delete v[k];
    const svg = it.kind === "icon" ? svgInfo(el) : (it.kind === "text" || it.kind === "value" ? null : svgInfo(firstSvg(el)));
    if (svg) { v["icon.size"] = `${svg.width}×${svg.height}`; v["icon.paint"] = svg.paint; v["icon.colour"] = svg.colour; if (svg.strokeWidth !== null) v["icon.stroke"] = svg.strokeWidth; }
    /* geometry: left edge from the content edge, centre offset from its row */
    v["x"] = px(r.left - contentLeft);
    if (/::(icon|action)/.test(it.key)) { const fb = it.key.split("::")[0]; const box = (window.__scItems.find((x) => x.key === fb) || {}).el; if (box) { const br = box.getBoundingClientRect(); v["x"] = px(r.left - br.left); v["right-inset"] = px(br.right - r.right); } }
    const row = it.kind === "row" || it.kind === "cell" ? null : rowOf(it.el);
    if (row) { const rr = row.getBoundingClientRect(); v["centre-dy"] = px((r.top + r.height / 2) - (rr.top + rr.height / 2)); }
    const doc = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    return { key: it.key, kind: it.kind, chip: !!it.chip, v, rect: doc, painted: !transparent(cs.backgroundColor) || (v.edge && v.edge !== "none") };
  };
  const contentLeft = () => { const h = $("h1"); return h ? h.getBoundingClientRect().left : 0; };

  /* ------------------------------------------------------------------ style snapshot (hover / focus) */
  const snap = (el) => {
    const t = paintTarget(el);
    const pick = (n, pseudo) => { const c = getComputedStyle(n, pseudo || null); return [c.backgroundColor, c.borderTopColor, c.color, c.boxShadow, c.outlineStyle, c.outlineWidth, c.outlineColor, c.textDecorationLine, c.opacity, c.transform].join("|"); };
    const nodes = [t, el !== t ? el : null, ...deepAll(t).filter(vis).slice(0, 4)].filter(Boolean);
    return nodes.map((n) => pick(n) + pick(n, "::before") + pick(n, "::after")).join("#");
  };
  const look = (el) => { const t = paintTarget(el); const c = getComputedStyle(t); return { bg: c.backgroundColor, color: c.color, border: c.borderTopColor, shadow: c.boxShadow, outline: c.outlineStyle === "none" ? "none" : `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} offset ${c.outlineOffset}`, deco: c.textDecorationLine, cursor: getComputedStyle(el).cursor }; };
  /* the mouse target: a field's input (not its icon), else the element; disabled controls are skipped */
  const disabled = (el) => [el, paintTarget(el)].some((n) => n.disabled || (n.getAttribute && n.getAttribute("aria-disabled") === "true") || n.hasAttribute?.("disabled"));
  const centre = (i) => { const it = window.__scItems[i]; if (!it || !vis(it.el)) return null; if (disabled(it.el)) return { disabled: true }; const t = it.kind === "field" && it.input && vis(it.input) ? it.input : it.el; t.scrollIntoView({ block: "center", inline: "nearest" }); const r = t.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, it.kind === "field" ? r.width / 2 : 24), y: r.top + r.height / 2 }; };
  const hitAt = (x, y) => { let n = document.elementFromPoint(x, y); while (n && n.shadowRoot) { const d = n.shadowRoot.elementFromPoint(x, y); if (!d || d === n) break; n = d; } return n; };
  /* is the element (or its painted part) what the mouse is on? else name the layer on top */
  const coverAt = (i, x, y) => { const it = window.__scItems[i]; const n = hitAt(x, y); if (!n || containsDeep(it.el, n) || containsDeep(n, it.el) || (it.input && containsDeep(it.input, n))) return ""; return (n.tagName.toLowerCase() + "." + String(n.className || "").split(" ")[0]).slice(0, 60); };
  /* the element the cursor really shows: through shadow roots; over slotted TEXT the light-DOM hit is the host, but the
     text renders (and takes its cursor) inside the shadow tree → the deepest shadow element under the point */
  const cursorAt = (x, y) => {
    let n = document.elementFromPoint(x, y);
    while (n && n.shadowRoot) {
      let d = n.shadowRoot.elementFromPoint(x, y);
      if (!d || d === n) { const under = deepAll(n).filter((e) => { if (!vis(e) && e.tagName !== "SLOT") return false; const r = e.getBoundingClientRect(); return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }); d = under[under.length - 1]; if (d && d.tagName === "SLOT") d = parentOf(d); }
      if (!d || d === n) break; n = d;
    }
    return n ? getComputedStyle(n).cursor : "";
  };
  const activeDeep = () => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; };
  /* which collected item holds the focused element */
  const focusedItem = () => { const a = activeDeep(); if (!a || a === document.body) return null; const idx = window.__scItems.findIndex((it) => it.el === a || containsDeep(it.el, a) || (it.input && it.input === a)); const r = a.getBoundingClientRect(); return { i: idx, key: idx > -1 ? window.__scItems[idx].key : null, name: (accName(a) || a.tagName).slice(0, 40), tag: a.tagName.toLowerCase(), rect: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } }; };
  /* focus look: outline / ring on the focused element, its paint target or the field frame */
  const focusLook = () => {
    const a = activeDeep(); if (!a || a === document.body) return null;
    const cands = [a, paintTarget(a), fieldBox(a), parentOf(a)].filter(Boolean);
    for (const n of cands) { const c = getComputedStyle(n); if (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) return { by: "outline", value: `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor}`, offset: c.outlineOffset }; if (c.boxShadow && c.boxShadow !== "none") return { by: "box-shadow", value: c.boxShadow }; }
    return { by: "none", value: "" };
  };
  const blur = () => { activeDeep()?.blur?.(); document.activeElement?.blur?.(); return true; };

  /* ------------------------------------------------------------------ open surfaces (menus, dropdowns, sheets, dialogs, tooltips) */
  const SURF = "[role=menu], [role=listbox], [role=dialog], [role=tooltip], [aria-modal=true], .dropdown-menu, .bottom-sheet__panel, .modal, .tooltip, [class*=popover], [class*=-pop]:not([class*=-popup-trigger]), [class*=__pop], [class*=dropdown__menu], [class*=fod-dropdown], [class*=fod-dialog]:not(.fod-dialog-container):not(.fod-dialog-host), [class*=sheet__panel]";
  const surfaces = () => {
    /* a surface floats (fixed / absolute / popover / top layer) — an inline listbox (language switcher) is page content */
    const floats = (e) => { for (let x = e, d = 0; x && d < 4; x = parentOf(x), d++) { const p = getComputedStyle(x).position; if (p === "fixed" || p === "absolute") return true; if (x.matches && (x.matches(":popover-open") || x.matches("dialog[open]"))) return true; } return false; };
    const list = deepAll(document.documentElement).filter((e) => { try { return e.matches(SURF) && vis(e) && floats(e); } catch (x) { return false; } });
    const tops = list.filter((s) => !list.some((x) => x !== s && containsDeep(x, s)));
    return tops.slice(0, 4).map((s0) => {
      /* an unpainted wrapper → the painted card inside it */
      let s = s0;
      if (!paints(s0)) { const r0 = s0.getBoundingClientRect(); const p = deepAll(s0).find((n) => vis(n) && paints(n) && n.getBoundingClientRect().width >= r0.width * 0.8 && n.getBoundingClientRect().height >= r0.height * 0.6); if (p) s = p; }
      const r = s.getBoundingClientRect(); const cs = getComputedStyle(s);
      /* items = the children of the list: the container with the most (≥ 3) visible children of one tag; else roles */
      let items = deepAll(s).filter((e) => vis(e) && e.matches("[role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]"));
      if (items.length < 2) {
        let best = [];
        for (const c of [s, ...deepAll(s)]) { if (!vis(c)) continue; const ch = kids(c).filter(vis); const byTag = {}; ch.forEach((x) => { (byTag[x.tagName] = byTag[x.tagName] || []).push(x); }); for (const g of Object.values(byTag)) if (g.length >= 3 && g.length > best.length) best = g; }
        if (best.length) items = best;
      }
      /* clipped: cut by the viewport or by an ancestor that clips */
      let clipped = r.top < -0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5 ? "viewport" : "";
      /* a position:fixed box escapes the overflow of its ancestors (unless one of them is transformed / contained) */
      let escaped = getComputedStyle(s).position === "fixed";
      for (let p = parentOf(s); p && !clipped && p !== document.documentElement; p = parentOf(p)) { const c = getComputedStyle(p); if (escaped && c.transform === "none" && c.filter === "none" && !/paint|layout|strict|content/.test(c.contain)) { continue; } if (c.position === "fixed") escaped = true; if (/(hidden|clip|auto|scroll)/.test(c.overflow + c.overflowX + c.overflowY) && p !== document.body) { const pr = p.getBoundingClientRect(); if (r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5 || r.left < pr.left - 0.5 || r.right > pr.right + 0.5) clipped = (p.className && String(p.className).split(" ")[0]) || p.tagName.toLowerCase(); } }
      const tip = s.matches("[role=tooltip], .tooltip") || /tooltip/i.test(s.tagName + s.className);
      const ih = items.map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10);
      const first = items[0] ? getComputedStyle(items[0]) : null;
      return {
        kind: tip ? "tooltip" : [s, s0].some((x) => x.matches("[role=dialog], [aria-modal=true], .modal, [class*=fod-dialog], .bottom-sheet__panel, [class*=sheet], mud-modal, mud-dialog") || /DIALOG|MODAL|SHEET/.test(x.tagName) || (x.getRootNode() instanceof ShadowRoot && /MODAL|DIALOG|SHEET/.test(x.getRootNode().host.tagName))) ? "dialog" : s.matches("[role=dialog], [aria-modal=true], .modal, [class*=fod-dialog], .bottom-sheet__panel") ? "dialog" : "menu",
        name: (s.getAttribute("aria-label") || s.className || s.tagName).toString().slice(0, 60),
        rect: { x: r.left + scrollX, y: r.top + scrollY, w: Math.round(r.width), h: Math.round(r.height) },
        radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, bg: cs.backgroundColor, border: cs.borderTopWidth + " " + cs.borderTopColor,
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
        items: items.length, itemHeights: [...new Set(ih)].slice(0, 6), itemFont: first ? `${first.fontSize}/${first.lineHeight}` : "",
        textAlign: cs.textAlign, clipped
      };
    });
  };
  const scopeRoot = (scopeSel) => (scopeSel ? $$(scopeSel) : [document.body]).find((e) => vis(e) || (getComputedStyle(e).display === "contents" && deepAll(e).some(vis))) || document.body;
  /* a per-pair override: the element for a selector inside the scope; kind control → the control that holds it */
  const pick = (sel, scopeSel, kind) => {
    const root = scopeRoot(scopeSel);
    let el = $$(sel, root).find(vis) || null;
    if (el && kind === "control" && !isControl(el)) { for (let x = el; x; x = parentOf(x)) if (isControl(x)) { el = x; break; } }
    if (el && kind === "control") el = outerControl(el) || el;
    /* a field: its frame — up from the element, or down into a web component that draws it in its shadow tree */
    if (el && kind === "field") { const up = fieldBox(el); el = framed(up) ? up : (deepAll(el).find((n) => vis(n) && framed(n) && sameBox(n.getBoundingClientRect(), el.getBoundingClientRect(), 4)) || up); }
    return el;
  };
  /* vw = the visible width (clientWidth): on a phone, content wider than the screen stretches innerWidth itself */
  const scrollInfo = () => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, vw: document.documentElement.clientWidth, iw: innerWidth });

  window.__sc = { coverAt, $, $$, pick, scopeRoot, vis, norm, accName, collect, measure, contentLeft, snap, look, centre, cursorAt, focusedItem, focusLook, blur, surfaces, scrollInfo, deepAll, paintTarget };
  return true;
};
