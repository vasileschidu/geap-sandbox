// Build `Form Designer / Top bar` (code .e-permits-builder__topbar, js/form-builder.js): Mode=Edit / Preview, 1440 × 72.
// Left: version (button-filled-rectangular Neutral Small, trailing chevron) · centre: library segmented-control 3
// (Editare / Previzualizare / Schemă with icons) · right: „1 eroare” (button-outlined-rectangular Destructive Small, record),
// „Acest serviciu” (button-filled-circular Neutral Medium, lock), „Publică” (Primary Medium Disabled), × (button-filled-circular
// Neutral Small icon-only, 16/cross-large = library modal-close). White, bottom border 1, padding 0 24, gap 16.
// Needs fd-lib.js. Holder: section „Form & Process Designer” 12645:8499 on 🧩 Local components (was 12282:434927, removed 2026-10-24).
const holder = await node("12645:8499"); await figma.setCurrentPageAsync(holder.parent);
const I = {
  chevDown16: await node("5:937"), cross16: await figma.importComponentByKeyAsync("702ca0ec74127496b4a43eebae4a967cbd0569ad"),
  lock: await figma.importComponentByKeyAsync("fbeb6d2d8c3e69de17f8bd7272cfaee829cf2ed2"), eye: await figma.importComponentByKeyAsync("faa2ea508755b47b8354bf6bb7d659776a525294"),
  spark: await figma.importComponentByKeyAsync("3686511afca85e8ff0b387a86587ce6ac0e5fe19"), code: await figma.importComponentByKeyAsync("174b3b722c360d29a78bd6d31bc37c298f585a6d"),
};
const recSet = await node("549:25866"); const rec = recSet.type === "COMPONENT_SET" ? (recSet.children.find((c) => /filled=on/.test(c.name)) || recSet.children[0]) : recSet;
const OUT = await figma.importComponentSetByKeyAsync("4ca8aa0074c54a1d27230b1cd03785b5f788af96");
const setIcon = (i, prefix, comp) => { const k = Object.keys(i.componentProperties).find((x) => x.includes(prefix)); if (k) i.setProperties({ [k]: comp.id }); return !!k; };
const mk = async (mode) => {
  const c = figma.createComponent(); c.name = `Mode=${mode}`;
  c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(1440, 72);
  c.counterAxisAlignItems = "CENTER"; await pad(c, 0, 24, 0, 24); await gap(c, 16); await fill(c, K.bgDefault);
  await stroke(c, K.border, { b: 1 });
  const left = await frame("Left", "H", { gap: 12, align: "CENTER" }); append(c, left, { h: "FILL" });
  const ver = await inst(ID.btnFilledRect, { Style: "Neutral", Icon: "Trailing", Size: "Small", State: "Default" }, { "Label": "v1.4.2" }); ver.name = "Version"; append(left, ver);
  setIcon(ver, "Trailing Icon: 16", I.chevDown16);
  const seg = await inst(SETKEY.seg, { "Segment Count": "3", Breakpoint: "Desktop" }); seg.name = "Mode"; append(c, seg);
  const ctl = seg.children.filter((k) => /^Control/.test(k.name));
  const labels = ["Editare", "Previzualizare", "Schemă"], icons = [I.spark, I.eye, I.code];
  for (let n = 0; n < 3; n++) {
    const on = (mode === "Edit" && n === 0) || (mode === "Preview" && n === 1);
    props(ctl[n], { "Label": labels[n], "Mode": on ? "On" : "Off", "Leading Icon": true, "Separator": (mode === "Edit" && n === 1) || (mode === "Preview" && n === 1) });
    const ic = ctl[n].findOne((k) => k.type === "INSTANCE"); if (ic) ic.swapComponent(icons[n]);
  }
  const right = await frame("Actions", "H", { gap: 12, align: "CENTER", justify: "MAX" }); append(c, right, { h: "FILL" });
  const err = await inst(OUT, { Style: "Destructive", Icon: "Leading", Size: "Small", State: "Default" }, { "Label": "1 eroare" }); err.name = "Errors"; append(right, err);
  setIcon(err, "Leading Icon: 16", rec);
  const scope = await inst(ID.btnFilledCirc, { Style: "Neutral", Icon: "Leading", Size: "Medium", State: "Default" }, { "Label": "Acest serviciu" }); scope.name = "Service scope"; append(right, scope);
  setIcon(scope, "Leading Icon: 20", I.lock);
  const pub = await inst(ID.btnFilledCirc, { Style: "Primary", Icon: "None", Size: "Medium", State: "Disabled" }, { "Label": "Publică" }); pub.name = "Publish"; append(right, pub);
  const close = await inst(ID.btnFilledCirc, { Style: "Neutral", Icon: "Only", Size: "Small", State: "Default" }); close.name = "Close"; append(right, close);
  setIcon(close, "Leading Icon: 16", I.cross16);
  for (const k of [ver, seg, err, scope, pub, close]) k.isExposedInstance = true;
  return c;
};
const a = await mk("Edit"), b = await mk("Preview");
holder.appendChild(a); holder.appendChild(b);
const set = figma.combineAsVariants([a, b], holder);
set.name = "Form Designer / Top bar"; set.layoutMode = "VERTICAL"; set.itemSpacing = 40; set.paddingTop = set.paddingRight = set.paddingBottom = set.paddingLeft = 40;
set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO"; set.x = 80; set.y = 500;
set.description = "Form Designer top bar (code .e-permits-builder__topbar): version, Editare / Previzualizare / Schemă (library segmented control), „1 eroare”, „Acest serviciu”, „Publică” (disabled while there are errors), close.";
return { set: set.id, v: set.children.map((c) => c.id + " " + c.name), segIcons: a.findAll((n) => n.type === "INSTANCE" && /^(20|24|code|sparkles)/.test(n.name)).map((n) => n.name + " " + n.width) };
