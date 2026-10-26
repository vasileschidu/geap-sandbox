// EVO Cabinet: clone a block (label, ID, title, Status „In development”, Prototype ↗, note). Stored in „cfin”/„clone”.
// Run: const CL = eval("(" + figma.root.getSharedPluginData("cfin","clone") + ")"); await CL({ src, id, title, note, state, parent: <SECTION id, not the band>, x, y })
async (o) => {
  const src = await figma.getNodeByIdAsync(o.src);
  const b = src.clone(); (o.parent ? await figma.getNodeByIdAsync(o.parent) : src.parent).appendChild(b);
  b.name = "Block · " + o.id; b.x = o.x ?? src.x; b.y = o.y ?? src.y;
  await figma.loadFontAsync({family:"Onest",style:"Regular"}); await figma.loadFontAsync({family:"Onest",style:"Medium"}); await figma.loadFontAsync({family:"Onest",style:"SemiBold"});
  const lab = b.children[0], note = b.children[b.children.length-1];
  lab.name = "Screen label · " + o.id; note.name = "Note · " + o.id;
  const pk = (i,p) => Object.keys(i.componentProperties).find(k=>k.split("#")[0]===p);
  lab.setProperties({[pk(lab,"ID")]: o.id, [pk(lab,"Title")]: o.title});
  const link = lab.findOne(n=>n.type==="TEXT" && n.name==="Link · prototype");
  if (link) { await figma.loadFontAsync(link.fontName); link.hyperlink = {type:"URL", value:"https://vasileschidu.github.io/geap-sandbox/cabinet-evo/index.html?state=" + (o.state||o.id)}; }
  note.setProperties({[pk(note,"Title")]: o.id + " · " + o.title, [pk(note,"Text")]: o.note});
  const st = lab.findOne(n=>n.type==="INSTANCE" && /Status/.test(n.name)); if (st) st.setProperties({Value:"In development"});
  const scr = b.findChild(n=>n.name.startsWith("Screens"));
  const ids = scr.children.map(s => { s.name = s.name.split(" · ")[0] + " · " + o.id; return s.id; });
  return {block: b.id, screens: ids};
}
