// Swap the controls of a Form Designer (builder) full-page capture to library instances —
// the Address pattern inspector (US-54 adr-01…, adr-12…). Paste as the `code` of use_figma after
// replacing ROOTS. Builder-only pieces (canvas cards, field chips, drag handles, the Build/Preview/
// Schema mode switch) have no library component and stay as captured layout (tokenized).
//   checkbox (20px, blue = checked)          → checkbox (lib key e915a93e…) Size Medium
//   switch (48×28 pill, blue = on)            → switch 2009:19057
//   type tags „text / număr / dropdown”       → tag-filled Subtle Neutral Small
//   „Publică”                                 → button-filled-circular Primary Medium
//   „Șterge câmpul”                           → button-outlined-rectangular Destructive Leading Medium + trash
//   tabs „General / Data”                     → tab-item-s (Selected = brand label)
//   „Search Input - Caută în librărie”        → search-input-rectangular Medium
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const g = (id) => figma.getNodeByIdAsync(id);
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const CB = await figma.importComponentSetByKeyAsync("e915a93ec9c4b91546cfb5788ededa656f98069a");
const BO = await figma.importComponentSetByKeyAsync("4ca8aa0074c54a1d27230b1cd03785b5f788af96");
const TAB = await figma.importComponentSetByKeyAsync("0294516b83af6616fbab5bb29510032a2ef03d80");
const TRASH = await figma.importComponentSetByKeyAsync("b5e9b87b18af497ebc71fea18f72e47f32d892bb");
const SW = await g("2009:19057"), TAG = await g("10602:106194"), CIRC = await g("8382:91415"), SEARCH = await g("9285:37474");
const trash = TRASH.children.find((c) => /filled=off/.test(c.name) && /stroke=1.5/.test(c.name)) || TRASH.children[0];
const blue = (n) => { const f = n && n.fills && n.fills !== figma.mixed && n.fills[0]; return Boolean(f && f.type === "SOLID" && f.color.b > 0.6 && f.color.r < 0.2); };
const txt = (n) => (n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const propKey = (inst, prefix) => Object.keys(inst.componentProperties).find((k) => k.startsWith(prefix));
const setP = (inst, map) => { const o = {}; for (const [p, v] of Object.entries(map)) { const k = propKey(inst, p); if (k) o[k] = v; } inst.setProperties(o); };
const place = (old, inst) => { const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst); if (!p.layoutMode || p.layoutMode === "NONE") { inst.x = old.x; inst.y = old.y; } old.remove(); return inst; };
const report = {};
for (const rid of ROOTS) {
  const root = await g(rid); const c = {};
  const bump = (k) => { c[k] = (c[k] || 0) + 1; };
  for (const f of root.findAll((n) => n.type === "FRAME")) {
    if (f.removed) continue;
    const name = f.name, w = Math.round(f.width), h = Math.round(f.height), t = txt(f);
    if (/^Label - Vizibilitate/.test(name) && f.children[0] && Math.round(f.children[0].width) === 20) {
      const i = V(CB, { "Mode": blue(f.children[0]) ? "Checked" : "Unchecked", "State": "Default", "Size": "Medium" }).createInstance(); i.name = "checkbox · vizibil"; place(f, i); bump("checkbox"); continue;
    }
    if (name === "Text" && w === 48 && h === 28 && f.children.length === 1) {
      const i = V(SW, { "State": "Default", "Checked": blue(f) ? "True" : "False" }).createInstance(); i.name = "switch"; place(f, i); bump("switch"); continue;
    }
    if (name === "Italic Text" && /^(text|număr|dropdown|dată|email|telefon)$/.test(t)) {
      const i = V(TAG, { "Type": "Subtle", "Style": "Neutral", "Icon": "None", "Size": "Small" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "tag · " + t; place(f, i); bump("tag"); continue;
    }
    if (name === "Button" && t === "Publică") { const i = V(CIRC, { "Style": "Primary", "Icon": "None", "Size": "Medium", "State": "Default" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "btn · Publică"; place(f, i); bump("btn"); continue; }
    if (name === "Button" && t === "Șterge câmpul") {
      const i = V(BO, { "Style": "Destructive", "Icon": "Leading", "Size": "Medium", "State": "Default" }).createInstance(); setP(i, { "⌨️ Label": t, "🔄 Leading Icon: 20": trash.id });
      i.name = "btn · Șterge câmpul"; place(f, i); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} bump("btn"); continue;
    }
    if (name === "Tab" && f.parent && /Secțiuni proprietăți/.test(f.parent.name)) {
      const sel = /Data/.test(t); const i = V(TAB, { "Type": sel ? "Selected" : "Unselected" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "tab · " + t; place(f, i); bump("tab"); continue;
    }
    if (/^Search Input - Caută în librărie/.test(name)) {
      const i = V(SEARCH, { "State": "Default", "Size": "Medium", "Button": "False" }).createInstance(); setP(i, { "👁️ Label": false, "👁️ Assistive Text": false, "⌨️ Placeholder": "Search..." });
      i.name = "search · librărie"; place(f, i); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} bump("search"); continue;
    }
  }
  report[rid] = c;
}
return report;
