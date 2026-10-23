// Alert card → EVO Cabinet act / request profile blocks (act-alert-card-v1, 2026-10-22).
// Stored in figma.root shared plugin data „aac”/„run”; call: eval("(" + src + ")")(SPECS) with
// SPECS = [{ b: blockId, kind: "req"|"act", d: {s, ic, t, x, btn: [{l, k: "p"|"q", i}]}, m: {...} (optional, else d), rm: [header labels] }]
async (SPECS) => {
  figma.skipInvisibleInstanceChildren = false;
  const SET = await figma.getNodeByIdAsync("1259:4099");
  const sets = await figma.teamLibrary.getVariablesInLibraryCollectionAsync("8ee1cae7f6a1ffaa46863d26583e97be34627f73");
  const cols = await figma.teamLibrary.getVariablesInLibraryCollectionAsync("723ad7975012d44e7cc92ace2fc1aa4bc7db576a");
  const V = async (n) => figma.variables.importVariableByKeyAsync([...sets, ...cols].find(v => v.name === n).key);
  const sp = { 0: await V("spacings/spacing-0"), 16: await V("spacings/spacing-16"), 24: await V("spacings/spacing-24") };
  const white = await V("background/base/default");
  const toneVar = { Info: await V("icon/brand/default"), Warning: await V("icon/warning/default"), Danger: await V("icon/danger/default"), Success: await V("icon/positive/default") };
  const outlined = (await figma.importComponentSetByKeyAsync("d7a0779b1fb70ccfc95c66ab762d577273913015")).children.find(c => c.name === "🖌️ Style=Strict, 📍 Icon=None, 🎚️ Size=Medium, 🎚️ State=Default");
  const ICON = { card: "aca711a43986722b21edbab93c36fc4a14991ba4", upload: "b4bbf26d902db55cb68ac1160c52d1972fef7246" };
  let timeG = null;
  try { timeG = await figma.importComponentByKeyAsync("c011c86f5295f10ef4889c8dd954bc1daa48a02b"); } catch (e) { timeG = null; }
  const paint = (v) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }, "color", v);
  const log = [];
  for (const S of SPECS) {
    const block = await figma.getNodeByIdAsync(S.b);
    const row = block.children.find(c => c.name.startsWith("Screens"));
    for (const scr of row.children) {
      const mob = scr.name.startsWith("Mobile"); if (!mob && !scr.name.startsWith("Desktop")) continue;
      const D = mob ? (S.m || S.d) : S.d;
      const main = scr.children.find(c => c.name === "Main"); const cont = main.children.find(c => c.name === "Container");
      const panel = cont.children.find(c => c.name === "Panel"); const ph = cont.children.find(c => c.name === "Page header");
      for (const old of panel.children.filter(c => c.name === "Alert")) old.remove();
      const stat = panel.children.find(c => c.name === "Section · Status");
      if (stat) for (const w of stat.children.filter(c => c.name === "Callout wrap")) w.remove();
      for (const n of panel.findAll(n => n.name === "Callout wrap" || n.name === "Profile notice")) n.remove();
      const acts = ph && ph.children.find(c => c.name === "Actions");
      if (acts && S.rm) { for (const c of [...acts.children]) if (S.rm.includes(c.name)) c.remove(); if (!acts.children.some(c => c.visible)) acts.remove(); }
      if (!D) { log.push(S.b + (mob ? " m" : " d") + " no alert"); continue; }
      const nb = D.btn ? D.btn.length : 0;
      const vname = `Status=${D.s}, Layout=${mob ? "Stacked" : "Row"}, Buttons=${["None", "One", "Two"][nb]}`;
      const variant = SET.children.find(v => v.name === vname);
      const inst = variant.createInstance(); inst.name = "Alert card";
      const wrap = figma.createFrame(); wrap.name = "Alert"; wrap.fills = []; wrap.clipsContent = false; wrap.layoutMode = "VERTICAL";
      for (const k of ["paddingTop", "paddingLeft", "paddingRight"]) wrap.setBoundVariable(k, sp[0]);
      wrap.setBoundVariable("paddingBottom", sp[(S.kind === "req" && !mob) ? 24 : 16]);
      panel.insertChild(0, wrap); wrap.layoutSizingHorizontal = "FILL"; wrap.layoutSizingVertical = "HUG";
      wrap.appendChild(inst); inst.layoutSizingHorizontal = "FILL";
      panel.setBoundVariable("paddingTop", sp[mob ? 16 : 24]);
      const props = {}; for (const k of Object.keys(inst.componentProperties)) { if (k.startsWith("Title#")) props[k] = D.t; if (k.startsWith("Text#")) props[k] = D.x; }
      inst.setProperties(props);
      if (D.ic === "time" && timeG) {
        const ic = inst.findOne(n => n.name === "Icon" && n.type === "INSTANCE"); ic.swapComponent(timeG);
        for (const v of ic.findAll(n => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION")) if (Array.isArray(v.fills) && v.fills.length) v.fills = [paint(toneVar[D.s])];
      }
      const bt = inst.findAll(n => n.type === "INSTANCE" && /button$/i.test(n.name));
      const setBtn = async (b, spec) => {
        if (spec.k === "q") { b.swapComponent(outlined); b.fills = [paint(white)]; }
        const p = { "⌨️ Label#156:0": spec.l };
        if (spec.i) { const g = await figma.importComponentByKeyAsync(ICON[spec.i]); p["📍 Icon"] = "Leading"; const key = Object.keys(b.componentProperties).find(k => k.startsWith("🔄 Leading Icon: 20")); p[key] = g.id; }
        b.setProperties(p); b.layoutSizingVertical = "FIXED"; b.resize(b.width, 40); b.layoutSizingHorizontal = "HUG";
      };
      if (nb === 1) await setBtn(bt.find(b => b.name === "Button"), D.btn[0]);
      if (nb === 2) { await setBtn(bt.find(b => b.name === "Quiet button"), D.btn.find(x => x.k === "q")); await setBtn(bt.find(b => b.name === "Primary button"), D.btn.find(x => x.k === "p")); }
      log.push(S.b + (mob ? " m " : " d ") + Math.round(inst.width) + "x" + Math.round(inst.height) + (D.ic === "time" && !timeG ? " NO-TIME-GLYPH" : ""));
    }
  }
  return log;
}
