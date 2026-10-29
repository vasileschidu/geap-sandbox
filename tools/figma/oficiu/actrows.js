// oficiu-board-v1 (2026-10-26) · captured act-search rows („List Item” cards of the ex-officio act search) → local `Act row`
// 11846:340996 (Default / Locked / Menu open, Desktop): Title, Line 2 = holder · IDNO, meta = Number (exposed Copy value
// Compact) · Authority slot = service · Subdivision slot = „emis la …” · Validity, square ⋮ = `More` (Show more), status
// tag Subtle + code tone, locked notice text, open menu from the captured „Menu - Postprocese …” (items + separator + Danger 1).
// Stored in figma.root shared plugin data „ofc”/„actrows”; call with screen ids.
async (IDS) => {
  figma.skipInvisibleInstanceChildren = false;
  const set = await figma.getNodeByIdAsync("11846:340996");
  const V = (st) => set.children.find((c) => c.name === "State=" + st + ", Screen=Desktop");
  const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
  const NUM = /^[A-Z]{3}-\d{4}-\d{5}$/;
  const TONE = { Valabil: "Success", Suspendat: "Accent", Expirat: "Neutral", Retras: "Danger", Anulat: "Danger", Respins: "Danger" };
  const ICON = { prelung: "12280:366498", reperf: "68:2953", duplicat: "9884:20151", suspend: "12268:364500", relu: "367:16380", contest: "12280:366500", retrag: "12268:364503" };
  const iconFor = (l) => { const k = Object.keys(ICON).find((q) => l.toLowerCase().includes(q)); return k ? ICON[k] : "68:2953"; };
  const K = (i, nm) => Object.keys(i.componentProperties).find((q) => q.split("#")[0] === nm);
  const out = [];
  for (const id of IDS) {
    const s = await figma.getNodeByIdAsync(id); if (!s) continue;
    const root = s.children.find((c) => c.name === "Overlay") || s;
    const rows = root.findAll((n) => n.type === "FRAME" && n.name === "List Item" && !inI(n) && n.width >= 600 && n.strokes && n.strokes.length);
    const menus = root.findAll((n) => n.type === "FRAME" && /^Menu - Postprocese/.test(n.name) && !inI(n));
    let done = 0;
    for (const r of rows) {
      const texts = r.findAll((x) => x.type === "TEXT" && !inI(x) && x.visible !== false).map((x) => x.characters.replace(/\s+/g, " ").trim()).filter(Boolean);
      const numInst = r.findOne((x) => x.type === "INSTANCE" && /^btn · [A-Z]{3}-\d{4}-\d{5}$/.test(x.name));
      const number = numInst ? numInst.name.replace("btn · ", "") : (texts.find((t) => NUM.test(t)) || "");
      const tagI = r.findOne((x) => x.type === "INSTANCE" && /^tag · /.test(x.name) && !inI(x));
      const tag = tagI ? tagI.name.replace("tag · ", "") : "";
      const title = texts[0];
      const line2 = texts.find((t) => /· (IDNO|IDNP) /.test(t)) || "";
      const service = texts.find((t) => t !== title && t !== line2 && !/^emis la|^valabil|^expirat|^retras/i.test(t) && !NUM.test(t) && t !== tag && !/în curs/.test(t) && t.length > 12) || "";
      const emis = texts.find((t) => /^emis la/.test(t)) || "";
      const valid = texts.find((t) => /^(valabil până|expirat la|retras la|suspendat)/i.test(t)) || "";
      const noticeT = (() => { const n = r.findOne((x) => (x.type === "INSTANCE" || x.type === "FRAME") && x.findAll && x.findAll((y) => y.type === "TEXT" && /în curs/.test(y.characters)).length > 0 && x !== r && x.width > 300); if (!n) return ""; return n.findAll((y) => y.type === "TEXT").map((y) => y.characters).join(" ").replace(/\s+/g, " ").trim(); })();
      const more = !!r.findOne((x) => /^Button - Postprocese|More actions|Postprocese din oficiu/.test(x.name));
      const menu = menus.find((m) => m.name.includes(title));
      const st = menu ? "Menu open" : (noticeT ? "Locked" : "Default");
      const i = V(st).createInstance();
      const p = {};
      p[K(i, "Title")] = title; p[K(i, "Line 2")] = line2; p[K(i, "Show line 2")] = !!line2; p[K(i, "Show icon")] = false;
      p[K(i, "Authority")] = service || " "; p[K(i, "Show authority")] = !!service;
      p[K(i, "Subdivision")] = emis || " "; p[K(i, "Show subdivision")] = !!emis;
      p[K(i, "Validity")] = valid || " "; p[K(i, "Show validity")] = !!valid;
      p[K(i, "Show action")] = false; p[K(i, "Show more")] = more || !!menu; p[K(i, "Show extra tag")] = false; p[K(i, "Break before subdivision")] = false;
      i.setProperties(p);
      const num = i.findOne((x) => x.type === "INSTANCE" && x.name === "Number"); if (num && number) num.setProperties({ [K(num, "Value")]: number });
      const stI = i.findOne((x) => x.type === "INSTANCE" && x.name === "Status");
      if (stI && tag) stI.setProperties({ "⌨️ Label#387:32": tag, "🖌️ Style": TONE[tag] || "Neutral", "🎚️ Type": "Subtle" });
      if (noticeT) { const no = i.findOne((x) => x.type === "INSTANCE" && x.name === "Notice"); if (no) no.setProperties({ [K(no, "Text")]: noticeT }); }
      if (menu) {
        const mo = i.findOne((x) => x.type === "INSTANCE" && x.name === "More"); if (mo) mo.setProperties({ "🎚️ State": "Active" });
        const labels = menu.findAll((x) => x.type === "FRAME" && x.name === "Menu Item").map((m) => m.findAll((y) => y.type === "TEXT").map((y) => y.characters).join(" ").trim());
        const danger = labels.filter((l) => /^Retragere|^Anulare/.test(l)); const normal = labels.filter((l) => !danger.includes(l));
        const M = i.findOne((x) => x.type === "INSTANCE" && x.name === "Menu");
        const mp = {}; mp[K(M, "Show separator")] = danger.length > 0 && normal.length > 0; mp[K(M, "Show danger 1")] = danger.length > 0; mp[K(M, "Show danger 2")] = false; M.setProperties(mp);
        for (let k = 1; k <= 7; k++) { const it = M.findOne((x) => x.name === "Item " + k); if (!it) continue; const l = normal[k - 1]; it.visible = !!l; if (l) it.setProperties({ [K(it, "Label")]: l, [K(it, "Icon")]: iconFor(l), "State": "Default" }); }
        if (danger[0]) { const d1 = M.findOne((x) => x.name === "Danger 1"); if (d1) d1.setProperties({ [K(d1, "Label")]: danger[0], [K(d1, "Icon")]: iconFor(danger[0]) }); }
        menu.remove();
      }
      i.name = "Act row · " + title;
      const par = r.parent; const idx = par.children.indexOf(r); par.insertChild(idx, i);
      if (par.layoutMode && par.layoutMode !== "NONE") i.layoutSizingHorizontal = "FILL"; else { i.x = r.x; i.y = r.y; i.resize(r.width, i.height); }
      r.remove(); done++;
    }
    out.push(s.name + " rows " + done + " menus " + menus.length);
  }
  return out;
}
