// GEAP 2.0 local-components-page-v2 (2026-10-24). Stored copy: root shared plugin data lc2/place. See README.md.
// ARGS: {cat, ids}: put ids in new rows at the bottom of the section (existing items untouched), grow section, restack page sections 80 apart
const S=JSON.parse(figma.root.getSharedPluginData("localcomp","sections"));
const sec=await figma.getNodeByIdAsync(S[ARGS.cat]);
const mine=new Set(ARGS.ids);
const others=sec.children.filter(c=>!mine.has(c.id));
let bottom=0; for(const c of others) bottom=Math.max(bottom,c.y+c.height);
let x=80,y=Math.round(bottom+80),rowH=0,W=sec.width-80;
for(const id of ARGS.ids){const c=await figma.getNodeByIdAsync(id); if(c.parent!==sec) sec.appendChild(c);
  const w=Math.round(c.width),h=Math.round(c.height);
  if(x>80 && x+w>80+5600){x=80;y+=rowH+80;rowH=0;}
  c.x=x;c.y=y;x+=w+80;rowH=Math.max(rowH,h);W=Math.max(W,x-80);}
sec.resizeWithoutConstraints(Math.round(Math.max(sec.width,W+80)),Math.round(y+rowH+80));
const page=sec.parent; const secs=page.children.filter(c=>c.type==="SECTION"&&Math.abs(c.x)<1).sort((a,b)=>a.y-b.y);
let yy=secs[0].y; for(const s of secs){ s.y=yy; yy+=s.height+80; }
return {sec:[sec.id,sec.width,sec.height]};
