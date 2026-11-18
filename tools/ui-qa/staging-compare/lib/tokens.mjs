// Raw computed values → Foundations token names (read from OUR page's :root, i.e. css/main.css as rendered),
// so findings speak in tokens: 16px → --spacing-16, rgb(…) → --color-text-base-primary.
export const READ_TOKENS = () => {
  const out = {};
  const rs = getComputedStyle(document.documentElement);
  for (let i = 0; i < rs.length; i++) { const k = rs[i]; if (k.startsWith("--")) out[k] = rs.getPropertyValue(k).trim(); }
  /* colours normalised by the browser: paint each colour token once */
  const probe = document.body.appendChild(document.createElement("i"));
  const colours = {};
  for (const [k, v] of Object.entries(out)) {
    if (!/^#|^rgb|^hsl|^color\(|^transparent$/i.test(v)) continue;
    probe.style.color = ""; probe.style.color = v;
    if (probe.style.color) colours[k] = getComputedStyle(probe).color;
  }
  probe.remove();
  return { raw: out, colours };
};

const normColour = (c) => String(c || "").replace(/\s+/g, "").toLowerCase().replace(/^rgba\((\d+),(\d+),(\d+),1\)$/, "rgb($1,$2,$3)");

/* the documented scale (design-system.md tables): font-size/fs-N, line-height/lh-N, --spacing-N … — some of these are
   used with fallbacks but not defined in css/main.css (token debt), they are still Foundations values */
export function docScale(md) {
  const out = {};
  for (const m of md.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([\d.]+px)/gm)) {
    const name = m[1].startsWith("--") ? m[1] : "--" + m[1].replace(/\//g, "-");
    out[name] = m[2];
  }
  return out;
}

export function tokenIndex({ raw, colours }) {
  const byColour = new Map();
  /* semantic names before primitives (--color-… before --gray-200) */
  const rank = (k) => (k.startsWith("--color-") ? 0 : 1);
  for (const [k, v] of Object.entries(colours).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].length - b[0].length)) {
    const n = normColour(v); if (!byColour.has(n)) byColour.set(n, []); byColour.get(n).push(k);
  }
  const byPx = { spacing: new Map(), radius: new Map(), size: new Map(), line: new Map(), border: new Map() };
  for (const [k, v] of Object.entries(raw)) {
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(v); if (!m) continue;
    const n = Number(m[1]);
    const fam = /^--spacing-/.test(k) ? "spacing" : /radius/.test(k) ? "radius" : /^--font-size/.test(k) ? "size" : /^--line-height/.test(k) ? "line" : /^--border-width/.test(k) ? "border" : null;
    if (!fam) continue;
    if (!byPx[fam].has(n)) byPx[fam].set(n, []);
    byPx[fam].get(n).push(k);
  }
  /* prefer the name that carries the number (--border-width-1 for 1px), then the shortest */
  for (const fam of Object.keys(byPx)) for (const [n, list] of byPx[fam]) list.sort((a, b) => (b.endsWith("-" + n) - a.endsWith("-" + n)) || a.length - b.length);
  const shadows = new Map(); for (const [k, v] of Object.entries(raw)) if (/shadow/.test(k) && /\d/.test(v)) shadows.set(v.replace(/\s+/g, " "), k);

  /* the family of a measured property */
  const famOf = (prop) => /padding|gap|margin|^x$|gap-|centre|inset|text-start/.test(prop) ? "spacing" : /radius/.test(prop) ? "radius" : /font-size|placeholder-size/.test(prop) ? "size" : /line-height/.test(prop) ? "line" : /border-.*-width/.test(prop) ? "border" : null;
  const ctxOf = (prop) => /background|bg/.test(prop) ? "background" : /border/.test(prop) ? "border" : /icon/.test(prop) ? "icon" : "text";

  /* token(s) for a raw value; null when the value is not a token value (off-scale / off-palette) */
  const lookup = (prop, value) => {
    if (value == null || value === "" || value === "none" || value === "normal" || /^auto$/.test(value)) return { known: true, name: "" };
    const s = String(value);
    if (/^rgba?\(/.test(s)) {
      if (/rgba\([^)]*,\s*0\)$/.test(s)) return { known: true, name: "transparent" };
      const names = byColour.get(normColour(s)) || [];
      const ctx = ctxOf(prop);
      const order = [ctx, ...["text", "background", "border", "icon"].filter((x) => x !== ctx)];
      const pref = order.map((c) => names.find((n) => n.startsWith(`--color-${c}-`))).find(Boolean) || names.find((n) => n.startsWith("--color-")) || names[0];
      return { known: names.length > 0, name: pref || "" };
    }
    if (/shadow/.test(prop)) { const k = shadows.get(s.replace(/\s+/g, " ")); return { known: !!k || s === "none", name: k || "" }; }
    const fam = famOf(prop);
    if (fam && /^(-?[\d.]+px\s+)+-?[\d.]+px$/.test(s)) { const parts = s.split(/\s+/).map((x) => lookup(prop, x)); return { known: parts.every((x) => x.known), name: parts.every((x) => x.name) ? parts.map((x) => x.name).join(" ") : "" }; }
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(s);
    if (fam && m) {
      const n = Math.abs(Number(m[1]));
      if (n === 0) return { known: true, name: "0" };
      const hit = [...byPx[fam].entries()].find(([v]) => Math.abs(v - n) <= 0.05);
      return { known: !!hit, name: hit ? hit[1][0] : "" };
    }
    return { known: true, name: "" };
  };
  const label = (prop, value) => { const t = lookup(prop, value); return t.name && t.name !== "0" ? `${value} (${t.name})` : String(value ?? "—"); };
  return { lookup, label };
}
