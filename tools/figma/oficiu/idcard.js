// oficiu-board-v1 (2026-10-26) · raw captured identity cards (holder, read-only) → `Identity card · selected (FO)` Static.
// Stored in figma.root shared plugin data „ofc”/„idcard”; call with screen ids. Scope = the screen's Overlay (the request window).
async (IDS) => {
  figma.skipInvisibleInstanceChildren = true;
  const set = await figma.getNodeByIdAsync("11848:340972");
  const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
  const under = (n, a) => { for (let p = n.parent; p; p = p.parent) if (p === a) return true; return false; };
  const fonts = async (n) => { for (const t of (n.type === "TEXT" ? [n] : n.findAll((x) => x.type === "TEXT"))) { if (!t.characters.length) { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); continue; } for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); } };
  const biz = await figma.importComponentByKeyAsync("13c704752d82ff4667a4a021d2f4b93fa9168ec6");
  const out = [];
  for (const id of IDS) {
    const s0 = await figma.getNodeByIdAsync(id); if (!s0) continue;
    const s = s0.children.find((c) => c.name === "Overlay") || s0;
    const T = (n) => n.type === "TEXT" && !inI(n);
    const all = s.findAll((n) => n.type === "FRAME" && !inI(n) && typeof n.cornerRadius === "number" && n.cornerRadius >= 12 && n.paddingLeft === 16 && n.height < 120 && n.width > 300
      && n.findOne((x) => T(x) && /^(IDNP|IDNO)$/.test(x.characters)) && n.findOne((x) => x.type === "FRAME" && !inI(x) && Math.round(x.width) === 32 && Math.round(x.height) === 32));
    const cards = all.filter((c) => !all.some((o) => o !== c && under(o, c)));
    for (const f of cards) {
      const texts = f.findAll(T);
      const idLab = texts.find((x) => /^(IDNP|IDNO)$/.test(x.characters)).characters;
      let val = (texts.find((x) => /^\d{8,13}$/.test(x.characters.trim())) || {}).characters;
      const vb = f.findOne((x) => x.type === "INSTANCE" && /^btn · \d{8,13}$/.test(x.name) && !inI(x));
      if (!val && vb) val = vb.name.replace("btn · ", "");
      const av = f.findOne((x) => x.type === "FRAME" && !inI(x) && Math.round(x.width) === 32);
      const ini = av.findOne(T);
      const nameT = texts.find((x) => x !== ini && x.characters !== val && !/^(IDNP|IDNO)$/.test(x.characters) && !/^\d+$/.test(x.characters.trim()));
      const i = set.children.find((c) => c.name === "Mode=Static").createInstance();
      const k = (nm) => Object.keys(i.componentProperties).find((q) => q.split("#")[0] === nm);
      i.setProperties({ [k("Name")]: nameT ? nameT.characters : "", [k("ID label")]: idLab });
      const cp = i.findOne((x) => x.name === "Copy");
      if (cp && val) {
        const vk = cp.type === "INSTANCE" ? Object.keys(cp.componentProperties).find((q) => q.split("#")[0] === "Value") : null;
        if (vk) cp.setProperties({ [vk]: val.trim() }); else { const vt = cp.findOne((x) => x.type === "TEXT"); if (vt) { await fonts(vt); vt.characters = val.trim(); } }
      }
      const a = i.findOne((x) => x.name === "Avatar");
      if (ini && ini.characters.trim()) { const t = a.findOne((x) => x.type === "TEXT"); if (t) { await fonts(t); t.characters = ini.characters.trim(); } }
      else { try { a.setProperties({ "🎚️ Type": "Icon" }); } catch (e) {} const ic = a.findOne((x) => x.type === "INSTANCE"); if (ic && idLab === "IDNO") ic.swapComponent(biz); }
      i.name = "Identity card · " + (nameT ? nameT.characters : idLab);
      const p = f.parent; const idx = p.children.indexOf(f); const sh = f.layoutSizingHorizontal; p.insertChild(idx, i);
      if (p.layoutMode && p.layoutMode !== "NONE") { try { i.layoutSizingHorizontal = sh === "FIXED" ? "FIXED" : "FILL"; if (sh === "FIXED") i.resize(f.width, i.height); } catch (e) {} } else { i.x = f.x; i.y = f.y; }
      const nm = nameT ? nameT.characters : ""; f.remove(); out.push(id + " " + idLab + " " + (val || "?") + " " + nm);
    }
  }
  return out;
}
