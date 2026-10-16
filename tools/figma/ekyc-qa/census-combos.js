// eKYC BO QA — READ-ONLY census of hand-built control + label combos (2026-10-16): a raw FRAME (outside instances) whose
// direct children include a switch / checkbox / radio instance AND raw text (a TEXT or a frame with texts) — i.e. a
// switch-label / checkbox-label / radio-label drawn by hand. Run: new AF("__OPT", code)({ page }).
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const setName = (i) => { const m = i.mainComponent; if (!m) return ""; return m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name; };
const H = {};
for (const f of page.findAll((n) => n.type === "FRAME" && !inI(n) && n.children.some((k) => k.type === "INSTANCE" && /^(switch|checkbox|radio)$/i.test(setName(k))))) {
  if (!/^Block · /.test((() => { let p = f; while (p.parent && p.parent.type !== "SECTION") p = p.parent; return p.name; })())) continue;
  const ctl = f.children.find((k) => k.type === "INSTANCE" && /^(switch|checkbox|radio)$/i.test(setName(k)));
  const txt = f.children.filter((k) => k !== ctl && (k.type === "TEXT" || (k.type === "FRAME" && k.findOne((t) => t.type === "TEXT"))));
  if (!txt.length) continue;
  const others = f.children.filter((k) => k !== ctl && !txt.includes(k)).map((k) => k.type[0] + ":" + k.name.slice(0, 12));
  const t = txt.map((k) => (k.type === "TEXT" ? [k] : k.findAll((x) => x.type === "TEXT")).map((x) => x.characters.slice(0, 18)).join("/")).join(" + ");
  const key = setName(ctl) + " · " + f.layoutMode + " gap" + f.itemSpacing + " · texts " + txt.length + (others.length ? " · other " + others.join(",") : "") + " · " + f.name.slice(0, 20);
  const e = (H[key] = H[key] || { n: 0, ids: [] }); e.n++; if (e.ids.length < 3) e.ids.push(f.id + " „" + t.slice(0, 40) + "”");
}
return { page: page.name, combos: Object.entries(H).sort((a, b) => b[1].n - a[1].n).map(([k, e]) => e.n + " " + k + " ← " + e.ids.join(" | ")) };
