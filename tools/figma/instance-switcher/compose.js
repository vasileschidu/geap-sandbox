// Compose the menu body (slot content) from the local item components. Needs prelude.js.
// FO spec: { profile: { name, detail, idLabel, idValue, avatar }, groups: [{ title, items: [role | more] }] }
// BO spec: { profile: { name, detail /* e-mail */, avatar }, groups: [{ title, toggle?: { label, expanded }, items: [role] }], links: [{ label, icon }] }
// role: { title, metaLabel, meta, selected, hover, tag, avatar }   more: { kind: "more", label, expanded, counter, avatars }
// avatar: { type: "Initials" | "Icon", initials, tone: "brand" | "warning" | "soft" }
const findLocal = name => page.findOne(n => (n.type === "COMPONENT_SET" || n.type === "COMPONENT") && n.name === name);
const C = { profile: findLocal("Instance switcher · menu · profile"), role: findLocal("Instance switcher · menu · role"), more: findLocal("Instance switcher · menu · more") };
const CM = await figma.importComponentByKeyAsync("eca4c78b40aec0ddac890e7f006907d81868c1ab"); // contextual-menu
const linkSet = (CM.findOne(n => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && /menu-item-action/.test(n.mainComponent.parent.name)) || {}).mainComponent.parent;
const ICON2 = { person20: await figma.importComponentByKeyAsync("4559c5554720e8594551a8bef25d9982aa3f9f76") };
const setProps = (inst, map) => {
  const defs = inst.componentProperties, out = {};
  for (const [k, d] of Object.entries(defs)) {
    const nm = k.split("#")[0].replace(/^[^A-Za-z]+/, "");
    if (map[nm] !== undefined && map[nm] !== null) out[k] = d.type === "BOOLEAN" ? !!map[nm] : map[nm];
  }
  if (Object.keys(out).length) inst.setProperties(out);
};
const styleAvatar = async (av, a) => {
  if (!av || !a) return;
  const tk = Object.keys(av.componentProperties).find(k => /Type$/.test(k) && av.componentProperties[k].type === "VARIANT");
  if (av.componentProperties[tk].value !== a.type) av.setProperties({ [tk]: a.type });
  const tone = a.tone || "brand";
  av.fills = [paint({ brand: "bgBrand", warning: "bgWarning", soft: "bgBrandSecHover", counter: "bgTertiary" }[tone])];
  if (a.type === "Initials") {
    const t = av.children.find(c => c.type === "TEXT");
    for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName);
    t.characters = a.initials || "AC"; t.fills = [paint(tone === "counter" ? "textSecondary" : "textOnColor")];
  } else {
    const ic = av.children.find(c => c.type === "INSTANCE" && /^\d+\//.test(c.name));
    if (ic) {
      if (tone !== "soft" && !/business/.test(ic.name)) { const w = ic.width; ic.swapComponent(w >= 24 ? ICON.suitcase24 : ICON.suitcase20); ic.resize(w, w); }
      recolorVectors(ic, tone === "soft" ? "iconBrand" : "iconOnColor");
    }
  }
};
const roleItem = async (ctx, it) => {
  const r = vp(C.role, { Context: ctx, State: it.selected ? (it.hover ? "Selected hover" : "Selected") : (it.hover ? "Hover" : "Default") }).createInstance();
  r.name = "Role · " + it.title;
  setProps(r, { Title: it.title, "Meta label": it.metaLabel, Meta: it.meta || "", "Show tag": !!it.tag });
  await styleAvatar(r.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), it.avatar || (ctx === "BO" ? null : { type: "Initials", initials: "AC" }));
  return r;
};
const moreItem = async it => {
  const m = vp(C.more, { Expanded: it.expanded ? "True" : "False", State: it.hover ? "Hover" : "Default" }).createInstance();
  m.name = "More · " + it.label;
  setProps(m, { Label: it.label, "Show avatars": it.avatars !== false });
  if (it.counter) { const c = m.findOne(n => n.type === "INSTANCE" && n.name === "Counter"); const t = c && c.findOne(n => n.type === "TEXT"); if (t) { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); t.characters = it.counter; } }
  return m;
};
const logout = () => {
  const b = vp(SET.btnFilledRect, { Style: "Neutral", Icon: "Trailing", Size: "Medium", State: "Default" }).createInstance();
  b.name = "Logout"; b.setProperties({ [propKey(SET.btnFilledRect, /Label/)]: "Ieșire", [propKey(SET.btnFilledRect, /Trailing Icon: 20/)]: ICON.logout20.id });
  return b;
};
const clearSlot = slot => { for (const ch of [...slot.children]) ch.remove(); };
const addFill = (parent, node) => { parent.appendChild(node); node.layoutSizingHorizontal = "FILL"; return node; };
const profileItem = async (ctx, p) => {
  const i = vp(C.profile, { Context: ctx }).createInstance(); i.name = "Profile";
  setProps(i, { Name: p.name, Detail: p.detail, "ID label": p.idLabel || "IDNO", "ID value": p.idValue || "", "Show ID": !!p.idValue });
  await styleAvatar(i.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), p.avatar);
  return i;
};
const composeFO = async (slot, spec) => {
  clearSlot(slot);
  addFill(slot, await profileItem("FO", spec.profile));
  const groups = addFill(slot, al("VERTICAL", "Groups")); pad(groups, 16, 16, 16, 16); gap(groups, 24);
  for (const g of spec.groups) {
    const gf = addFill(groups, al("VERTICAL", "Group · " + g.title)); gap(gf, 12);
    addFill(gf, await txt("small500", g.title, "textSecondary", "Title"));
    const list = addFill(gf, al("VERTICAL", "List")); gap(list, 8);
    for (const it of g.items) addFill(list, it.kind === "more" ? await moreItem(it) : await roleItem("FO", it));
  }
  const foot = addFill(slot, al("VERTICAL", "Footer")); pad(foot, 8, 16, 16, 16);
  addFill(foot, logout());
};
const composeBO = async (slot, spec) => {
  clearSlot(slot);
  addFill(slot, await profileItem("BO", spec.profile));
  const groups = addFill(slot, al("VERTICAL", "Groups")); pad(groups, 20, 16, 20, 16); gap(groups, 24); stroke(groups, "borderBase", 1, ["strokeBottomWeight"]);
  for (const g of spec.groups) {
    const gf = addFill(groups, al("VERTICAL", "Group · " + g.title)); gap(gf, 12);
    const t = addFill(gf, await txt("small500", g.title, "textSecondary", "Title")); t.textTruncation = "ENDING"; t.maxLines = 1; t.layoutSizingVertical = "HUG";
    if (g.toggle) addFill(gf, await moreItem({ label: g.toggle.label, expanded: g.toggle.expanded, avatars: false }));
    if (g.items.length) { const list = addFill(gf, al("VERTICAL", "List")); gap(list, 6); for (const it of g.items) addFill(list, await roleItem("BO", it)); }
  }
  const links = addFill(slot, al("VERTICAL", "Links")); pad(links, 8, 8, 8, 8); gap(links, 4); stroke(links, "borderBase", 1, ["strokeBottomWeight"]);
  for (const l of spec.links || BO_DEFAULT.links) {
    const li = addFill(links, vp(linkSet, { "Leading Element": "Icon", State: "Default" }).createInstance()); li.name = "Link · " + l.label;
    setProps(li, { "Option Label": l.label });
    const ic = li.findOne(n => n.type === "INSTANCE" && /^\d+\//.test(n.name));
    if (ic && l.icon) { const w = ic.width; ic.swapComponent(l.icon); ic.resize(w, w); }
  }
  const foot = addFill(slot, al("VERTICAL", "Footer")); pad(foot, 16, 16, 16, 16);
  addFill(foot, logout());
};
const FO_DEFAULT = {
  profile: { name: "SRL Global Trader", detail: "Persoană juridică", idLabel: "IDNO", idValue: "1012600000002", avatar: { type: "Icon" } },
  groups: [
    { title: "Alege alt rol", items: [
      { title: "Anastasia Cojocaru", metaLabel: "IDNP", meta: "2990000000001", avatar: { type: "Initials", initials: "AC" } },
      { title: "SRL Global Trader", metaLabel: "IDNO", meta: "1012600000002", selected: true, avatar: { type: "Icon" } } ] },
    { title: "Cu împuternicire MPower", items: [{ kind: "more", label: "Arată mai multe", counter: "+7" }] } ],
};
const BO_DEFAULT = {
  profile: { name: "Anastasia Cojocaru", detail: "anastasia.cojocaru@egov.md", avatar: { type: "Initials", initials: "AC" } },
  groups: [
    { title: "Agenția Națională pentru Sănătate Publică (ANSP)", toggle: { label: "Arată mai puține", expanded: true }, items: [
      { title: "Specialist", meta: "CSP Chișinău" }, { title: "Specialist", meta: "CSP Bălți" }, { title: "Supervizor", meta: "CSP Chișinău" },
      { title: "Director", meta: "CSP Chișinău" }, { title: "Administrator central", meta: "Administrația centrală ANSP", selected: true },
      { title: "Administrator local", meta: "ANSP" } ] },
    { title: "Agenția Națională Transport Auto (ANTA)", items: [{ title: "Specialist", meta: "CSP Chișinău" }] } ],
  links: [{ label: "Profilul meu", icon: ICON2.person20 }, { label: "Setări generale", icon: ICON.settings20 }],
};
