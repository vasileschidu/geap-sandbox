// Call 1 — menu items: „Instance switcher · menu · profile”, „… · role”, „… · more”.
// Run: CFG + prelude.js + this file in one use_figma call. Refuses to run twice (returns existing ids).
const existing = holder.children.filter(n => /^Instance switcher · menu · (profile|role|more)$/.test(n.name));
if (existing.length) return { skipped: true, existing: existing.map(n => n.name + " " + n.id) };
const out = {};

// ---- profile (Context FO / BO) — code .e-permits-fo-avatar-menu__profile / .e-permits-shell__switch-profile
const profile = async ctx => {
  const c = figma.createComponent(); c.name = `Context=${ctx}`;
  c.resize(364, 200); c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
  c.counterAxisAlignItems = "CENTER"; pad(c, 20, 24, 20, 24); gap(c, 16); fill(c, "bgDefault");
  stroke(c, "borderBase", 1, ["strokeBottomWeight"]);
  const main = al("VERTICAL", "Main"); main.counterAxisAlignItems = "CENTER"; gap(main, 12); c.appendChild(main); main.layoutSizingHorizontal = "FILL";
  const av = await avatar(ctx === "FO" ? "Icon" : "Initials", "Large", "brand", "AC"); main.appendChild(av);
  const id = al("VERTICAL", "Identity"); id.counterAxisAlignItems = "CENTER"; gap(id, 2); main.appendChild(id); id.layoutSizingHorizontal = "FILL";
  const nm = await txt("h4", ctx === "FO" ? "SRL Global Trader" : "Anastasia Cojocaru", "textDefault", "Name"); nm.textAlignHorizontal = "CENTER"; id.appendChild(nm);
  const meta = al("HORIZONTAL", "Meta"); meta.counterAxisAlignItems = "CENTER"; gap(meta, 6); id.appendChild(meta);
  meta.appendChild(await txt("small", ctx === "FO" ? "Persoană juridică" : "anastasia.cojocaru@egov.md", "textSecondary", "Detail"));
  const dot = figma.createEllipse(); dot.name = "Dot"; dot.resize(4, 4); dot.fills = [paint("iconTertiary")]; meta.appendChild(dot);
  const idf = al("HORIZONTAL", "ID"); idf.counterAxisAlignItems = "CENTER"; gap(idf, 4); meta.appendChild(idf);
  idf.appendChild(await txt("small", "IDNO", "textTertiary", "ID label"));
  const cv = al("HORIZONTAL", "Copy value"); pad(cv, 0, 4, 0, 4); cv.cornerRadius = 6; rad(cv, "r6"); idf.appendChild(cv);
  cv.appendChild(await txt("small500", "1012600000002", "textDefault", "ID value"));
  const act = al("HORIZONTAL", "Actions"); act.counterAxisAlignItems = "CENTER"; gap(act, 12); c.appendChild(act);
  const cab = vp(SET.btnFilledCirc, { Style: "Primary", Icon: "None", Size: "Medium", State: "Default" }).createInstance();
  cab.name = "Cabinet"; act.appendChild(cab); cab.setProperties({ [propKey(SET.btnFilledCirc, /Label/)]: "Cabinetul Personal" });
  const st = vp(SET.btnOutlinedCirc, { Style: "Primary", Icon: "Only", Size: "Medium", State: "Default" }).createInstance();
  st.name = "Settings"; act.appendChild(st); st.setProperties({ [propKey(SET.btnOutlinedCirc, /Leading Icon: 20/)]: ICON.settings20.id });
  if (ctx === "BO") { dot.visible = false; idf.visible = false; act.visible = false; }
  return c;
};
const pFO = await profile("FO"), pBO = await profile("BO");
holder.appendChild(pFO); holder.appendChild(pBO);
const PS = figma.combineAsVariants([pFO, pBO], holder); PS.name = "Instance switcher · menu · profile";
const pk = {
  name: PS.addComponentProperty("Name", "TEXT", "SRL Global Trader"),
  detail: PS.addComponentProperty("Detail", "TEXT", "Persoană juridică"),
  idl: PS.addComponentProperty("ID label", "TEXT", "IDNO"),
  idv: PS.addComponentProperty("ID value", "TEXT", "1012600000002"),
  show: PS.addComponentProperty("Show ID", "BOOLEAN", true),
};
for (const v of PS.children) {
  const f = n => v.findOne(x => x.name === n);
  f("Name").componentPropertyReferences = { characters: pk.name };
  f("Detail").componentPropertyReferences = { characters: pk.detail };
  f("ID label").componentPropertyReferences = { characters: pk.idl };
  f("ID value").componentPropertyReferences = { characters: pk.idv };
  if (v.name === "Context=FO") { f("Dot").componentPropertyReferences = { visible: pk.show }; f("ID").componentPropertyReferences = { visible: pk.show }; }
  f("Avatar").isExposedInstance = true;
}
PS.editComponentProperty(pk.show, { defaultValue: true });
grid(PS, 2);
PS.description = "Header of the instance-switcher menu. FO = .e-permits-fo-avatar-menu__profile (avatar 48, name, kind • ID, Cabinetul Personal + settings); BO = .e-permits-shell__switch-profile (avatar 48, name, e-mail). Avatar is an exposed library avatar (Initials / Icon + suitcase).";
out.profile = PS.id;

// ---- role card (Context FO / BO × State) — .e-permits-fo-avatar-menu__role / .e-permits-shell__role-card
const STATES = ["Default", "Hover", "Selected", "Selected hover"];
const role = async (ctx, state) => {
  const c = figma.createComponent(); c.name = `Context=${ctx}, State=${state}`;
  c.resize(332, 60); c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
  c.counterAxisAlignItems = "CENTER";
  if (ctx === "FO") { pad(c, 12, 24, 12, 16); gap(c, 16); } else { pad(c, 8, 12, 8, 12); gap(c, 12); }
  c.cornerRadius = 12; rad(c, "r12");
  const sel = state.startsWith("Selected");
  fill(c, { Default: "bgDefault", Hover: "bgTertiary", Selected: "bgBrandSec", "Selected hover": "bgBrandSecHover" }[state]);
  stroke(c, sel ? "borderBrand" : "borderBase", 1);
  // BO selected: code = 1px border + 1px inset brand line (2 px total, same card size). Figma: ONE 2 px INSIDE stroke, not in
  // layout, card height fixed to the unselected height below — never an INNER_SHADOW (user 2026-10-24, inner-shadow-sweep-v2).
  const selBO = sel && ctx === "BO";
  const av = ctx === "FO" ? await avatar("Initials", "Small", "brand", "AC") : await avatar("Icon", "Small", "soft");
  c.appendChild(av);
  const copy = al("VERTICAL", "Copy"); gap(copy, 2); c.appendChild(copy); copy.layoutSizingHorizontal = "FILL";
  const head = al("HORIZONTAL", "Heading"); head.counterAxisAlignItems = "CENTER"; gap(head, 8); copy.appendChild(head); head.layoutSizingHorizontal = "FILL";
  const nm = await txt("small500", ctx === "FO" ? "Anastasia Cojocaru" : "Specialist", "textDefault", "Title");
  head.appendChild(nm); nm.textTruncation = "ENDING"; nm.maxLines = 1; nm.layoutSizingHorizontal = "HUG";
  const tag = vp(SET.tagOutlined, { Style: "Accent", Icon: "None", Size: "Small" }) || SET.tagOutlined.defaultVariant;
  const tg = tag.createInstance(); tg.name = "Tag"; head.appendChild(tg);
  const tl = propKey(SET.tagOutlined, /Label/); if (tl) tg.setProperties({ [tl]: "Împuternicire" });
  tg.visible = false;
  const meta = al("HORIZONTAL", "Meta row"); meta.counterAxisAlignItems = "CENTER"; gap(meta, 4); copy.appendChild(meta);
  const ml = await txt("small", "IDNP", "textTertiary", "Meta label"); meta.appendChild(ml);
  const mv = ctx === "FO" ? await txt("small500", "2990000000001", "textDefault", "Meta") : await txt("cap", "CSP Chișinău", "textSecondary", "Meta");
  meta.appendChild(mv);
  if (ctx === "BO") ml.visible = false;
  const ck = icon(ICON.check20, "iconBrand"); ck.name = "Check"; c.appendChild(ck); ck.visible = sel;
  if (selBO) { const h = c.height; c.strokeWeight = 2; c.strokesIncludedInLayout = false; c.counterAxisSizingMode = "FIXED"; c.resize(c.width, h); }
  return c;
};
const roles = [];
for (const ctx of ["FO", "BO"]) for (const s of STATES) { const r = await role(ctx, s); holder.appendChild(r); roles.push(r); }
const RS = figma.combineAsVariants(roles, holder); RS.name = "Instance switcher · menu · role";
const rk = {
  title: RS.addComponentProperty("Title", "TEXT", "Anastasia Cojocaru"),
  ml: RS.addComponentProperty("Meta label", "TEXT", "IDNP"),
  meta: RS.addComponentProperty("Meta", "TEXT", "2990000000001"),
  tag: RS.addComponentProperty("Show tag", "BOOLEAN", false),
};
for (const v of RS.children) {
  const f = n => v.findOne(x => x.name === n);
  f("Title").componentPropertyReferences = { characters: rk.title };
  f("Meta label").componentPropertyReferences = { characters: rk.ml };
  v.findOne(x => x.name === "Meta" && x.type === "TEXT").componentPropertyReferences = { characters: rk.meta };
  f("Tag").componentPropertyReferences = { visible: rk.tag };
  f("Avatar").isExposedInstance = true;
}
RS.editComponentProperty(rk.tag, { defaultValue: false });
grid(RS, 4);
RS.description = "Role / instance card in the switcher menu. FO = .e-permits-fo-avatar-menu__role (avatar 32, name [+ Împuternicire tag], ID label + value, 68 high); BO = .e-permits-shell__role-card (role icon on brand-secondary-hover, role + institution 12/16). Selected = brand border (BO + 1px inset line) on brand-secondary; Selected hover = brand-secondary-hover; Hover = tertiary. BO padding 8/12 is the token value — the code adds 1px (9/13) for the selected 2px border, so BO cards are 56 here vs 58 in code.";
out.role = RS.id;

// ---- more toggle (Expanded × State) — .e-permits-fo-avatar-menu__proxy / BO .e-permits-fo-auth__role-collapse-toggle
const more = async (exp, state) => {
  const c = figma.createComponent(); c.name = `Expanded=${exp}, State=${state}`;
  c.resize(332, 50); c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
  c.counterAxisAlignItems = "CENTER"; pad(c, 8, 4, 8, 16); gap(c, 8);
  c.cornerRadius = 12; rad(c, "r12"); stroke(c, "borderBase", 1);
  fill(c, state === "Hover" ? "bgTertiary" : exp === "True" ? "bgSecondary" : "bgDefault");
  const lb = await txt("small500", exp === "True" ? "Arată mai puține" : "Arată mai multe", "textSecondary", "Label"); c.appendChild(lb); lb.layoutSizingHorizontal = "FILL";
  const right = al("HORIZONTAL", "Right"); right.counterAxisAlignItems = "CENTER"; gap(right, 4); c.appendChild(right);
  const stack = al("HORIZONTAL", "Avatars"); stack.counterAxisAlignItems = "CENTER"; stack.itemSpacing = -8; right.appendChild(stack);
  for (const [t, tone, ini] of [["Icon", "warning"], ["Initials", "warning", "GV"], ["Icon", "warning"], ["Initials", "counter", "+7"]]) {
    const a = await avatar(t, "Small", tone, ini); a.name = tone === "counter" ? "Counter" : "Avatar"; stroke(a, "borderSubtle", 2); stack.appendChild(a);
    if (tone === "counter") a.isExposedInstance = true;
  }
  stack.visible = exp !== "True";
  const arrow = al("HORIZONTAL", "Arrow"); arrow.resize(32, 32); arrow.primaryAxisSizingMode = "FIXED"; arrow.counterAxisSizingMode = "FIXED";
  arrow.primaryAxisAlignItems = "CENTER"; arrow.counterAxisAlignItems = "CENTER"; arrow.cornerRadius = 999; rad(arrow, "rFull"); right.appendChild(arrow);
  const ch = icon(ICON.chevB16, "iconDefault"); ch.name = "Chevron"; arrow.appendChild(ch); if (exp === "True") ch.rotation = 180;
  return c;
};
const mores = [];
for (const e of ["False", "True"]) for (const s of ["Default", "Hover"]) { const m = await more(e, s); holder.appendChild(m); mores.push(m); }
const MS = figma.combineAsVariants(mores, holder); MS.name = "Instance switcher · menu · more";
const mk = { label: MS.addComponentProperty("Label", "TEXT", "Arată mai multe"), av: MS.addComponentProperty("Show avatars", "BOOLEAN", true) };
for (const v of MS.children) {
  v.findOne(x => x.name === "Label").componentPropertyReferences = { characters: mk.label };
  if (v.name.startsWith("Expanded=False")) v.findOne(x => x.name === "Avatars").componentPropertyReferences = { visible: mk.av };
}
MS.editComponentProperty(mk.av, { defaultValue: true });
grid(MS, 2);
MS.description = "Collapsed group toggle in the switcher menu (FO MPower list „Arată mai multe” with an avatar stack + counter; BO institution collapse „Arată mai puține”). Expanded = secondary fill, stack hidden, chevron up. Avatar overlap = -8 gap (code margin -12 + gap 4; no negative spacing token).";
out.more = MS.id;
probe.remove();
return out;
