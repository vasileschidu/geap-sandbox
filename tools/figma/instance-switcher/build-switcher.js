// Call 2 — „Instance switcher · menu” (native SLOT „Content”) + „Instance switcher” set (Context × Type × State).
// Run: CFG + prelude.js + compose.js + this file. Refuses to run twice.
if (holder.children.some(n => n.name === "Instance switcher")) return { skipped: true };
const out = {};
let menu = holder.children.find(n => n.type === "COMPONENT" && n.name === "Instance switcher · menu");
if (!menu) {
// ---- menu surface: .e-permits-fo-avatar-menu / .e-permits-shell__profile-menu (364, r16, menu shadow, clips like the code)
menu = figma.createComponent(); menu.name = "Instance switcher · menu";
menu.resize(364, 100); menu.layoutMode = "VERTICAL"; menu.primaryAxisSizingMode = "AUTO"; menu.counterAxisSizingMode = "FIXED";
fill(menu, "bgDefault"); menu.cornerRadius = 16; rad(menu, "r16"); await menu.setEffectStyleIdAsync(FX.menu.id); menu.clipsContent = true;
holder.appendChild(menu);
const slot = menu.createSlot(); slot.name = "Content"; slot.layoutMode = "VERTICAL"; slot.itemSpacing = 0; slot.fills = [];
slot.layoutSizingHorizontal = "FILL"; slot.layoutSizingVertical = "HUG";
await composeFO(slot, FO_DEFAULT);
menu.description = "Instance-switcher dropdown surface (364 wide, radius 16, Drop Shadow/300 = library menu shadow). Content is a native SLOT „Content”: fill it with „Instance switcher · menu · profile”, groups of „… · role” / „… · more” cards and the library Neutral „Ieșire” button (FO) or the BO groups + contextual-menu links + footer. Default content = FO fo-01s. Mobile: resize the instance to 343 (100vw − 32).";
}
out.menu = menu.id;
// ---- trigger: .e-permits-fo-auth__avatar (FO, 256×52; mobile 32) / .e-permits-shell__user-trigger (BO, 256×54)
const trig = async (ctx, type, state) => {
  const mob = type === "Mobile", H = ctx === "BO" ? 54 : 52;
  // root = transparent, unclipped (the Open menu hangs outside it); the visible button is the clipping „Trigger” frame —
  // Figma draws shadow SPREAD (the focus ring) only on frames that clip content.
  const c = figma.createComponent(); c.name = `Context=${ctx}, Type=${type}, State=${state}`;
  c.resize(mob ? 32 : 256, mob ? 32 : H); c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED";
  c.fills = []; c.clipsContent = false;
  const tr = al("HORIZONTAL", "Trigger"); c.appendChild(tr); tr.layoutSizingHorizontal = "FILL"; tr.layoutSizingVertical = "FILL";
  tr.counterAxisAlignItems = "CENTER"; if (mob) pad(tr, 0, 0, 0, 0); else pad(tr, 6, 8, 6, 8);
  tr.cornerRadius = 12; rad(tr, "r12"); tr.clipsContent = true;
  fill(tr, { Default: "bgDefault", Hover: "bgTertiary", Open: "bgSecondary" }[state]);
  if (state === "Open") await tr.setEffectStyleIdAsync(FX.ring.id);
  const inner = al("HORIZONTAL", "Container"); inner.counterAxisAlignItems = "CENTER"; gap(inner, 12); tr.appendChild(inner); inner.layoutSizingHorizontal = "FILL";
  inner.appendChild(await avatar("Initials", mob ? "Small" : "Medium", "brand", "AC"));
  const copy = al("VERTICAL", "Copy"); gap(copy, 2); inner.appendChild(copy); copy.layoutSizingHorizontal = "FILL";
  const nm = await txt("small500", "Anastasia Cojocaru", "textDefault", "Name");
  const dt = ctx === "BO" ? await txt("cap", "Administrator central • ANSP", "textSecondary", "Detail") : await txt("small", "Persoană fizică", "textTertiary", "Detail");
  for (const t of [nm, dt]) { copy.appendChild(t); t.layoutSizingHorizontal = "FILL"; t.textTruncation = "ENDING"; t.maxLines = 1; t.layoutSizingVertical = "HUG"; }
  const ch = icon(state === "Open" ? ICON.chevT20 : ICON.chevB20, "iconTertiary"); ch.name = "Chevron"; inner.appendChild(ch);
  if (mob) { copy.visible = false; ch.visible = false; }
  if (state === "Open") {
    const m = menu.createInstance(); m.name = "Menu"; c.appendChild(m); m.layoutPositioning = "ABSOLUTE";
    if (mob) m.resize(343, m.height);
    // code: right edge = trigger right edge, top = trigger bottom + 8. Mobile: right edge = header content edge (16 from the screen);
    // the library header-evo-mobile puts the avatar AT the content edge (the code's 40px menu button is not in Figma) → align to the trigger.
    m.x = mob ? 32 - 343 : 256 - 364; m.y = (mob ? 32 : H) + 8;
    m.constraints = { horizontal: "MAX", vertical: "MIN" };
    if (ctx === "BO") await composeBO(m.findOne(n => n.type === "SLOT"), BO_DEFAULT);
    m.isExposedInstance = true;
  }
  return c;
};
const vars = [];
for (const [ctx, type] of [["FO", "Desktop"], ["FO", "Mobile"], ["BO", "Desktop"]])
  for (const s of ["Default", "Hover", "Open"]) { const v = await trig(ctx, type, s); holder.appendChild(v); vars.push(v); }
const TS = figma.combineAsVariants(vars, holder); TS.name = "Instance switcher";
const tk = {
  name: TS.addComponentProperty("Name", "TEXT", "Anastasia Cojocaru"),
  detail: TS.addComponentProperty("Detail", "TEXT", "Persoană fizică"),
  menu: TS.addComponentProperty("Show menu", "BOOLEAN", true),
};
for (const v of TS.children) {
  v.findOne(n => n.name === "Name" && n.type === "TEXT").componentPropertyReferences = { characters: tk.name };
  v.findOne(n => n.name === "Detail" && n.type === "TEXT").componentPropertyReferences = { characters: tk.detail };
  const av = v.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"); av.isExposedInstance = true;
  const m = v.children.find(n => n.name === "Menu"); if (m) m.componentPropertyReferences = { visible: tk.menu };
}
TS.editComponentProperty(tk.menu, { defaultValue: true });
// layout: one row per Context/Type, the Open variant last with room for its hanging menu
const rows = { "FO/Desktop": 60, "FO/Mobile": 760, "BO/Desktop": 1460 };
for (const v of TS.children) {
  const p = v.variantProperties, col = ["Default", "Hover", "Open"].indexOf(p.State);
  v.x = 60 + col * 360 + (p.State === "Open" ? 120 : 0) + (p.Type === "Mobile" && p.State === "Open" ? 160 : 0); v.y = rows[p.Context + "/" + p.Type];
}
TS.resizeWithoutConstraints(1300, 2560); TS.clipsContent = false;
fill(TS, "bgDefault"); TS.strokes = [paint("borderBase")]; TS.dashPattern = [6, 4]; TS.cornerRadius = 16; rad(TS, "r16");
TS.description = "Header instance switcher — FO / Cabinet EVO .e-permits-fo-auth__avatar (256×52, mobile 32) and BO .e-permits-shell__user-trigger (256×54). State Open = Focus Ring/Medium + secondary fill + chevron up (code [aria-expanded=true]) and carries the exposed „Instance switcher · menu” hanging from it at the code geometry: right edge = trigger right, 8 below (mobile: 343 wide, right edge = trigger right = header content edge, 16 from the screen; the code header has a 40px menu button right of the trigger, the library header-evo-mobile has none, so the trigger sits at the content edge). Fill the menu's „Content” slot per screen; turn „Show menu” off when the menu is drawn elsewhere. Hover = tertiary. Avatar = exposed library avatar (Initials / Icon + suitcase, warning tone for MPower). The ring sits on the clipping „Trigger” frame (Figma draws shadow spread only on clipping frames).";
out.switcher = TS.id;
probe.remove();
return out;
