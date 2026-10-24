// GEAP 2.0 local-components-page-v2 (2026-10-24). Stored copy: root shared plugin data lc2/mcswap. See README.md.
// ARGS {host:"I<modal>;<nested>", variant:"Spacing=0, Height=Hug"} -> nested per-state content swapped to Modal content / Body, its children cloned into the slot
figma.skipInvisibleInstanceChildren=false;
const B=JSON.parse(figma.root.getSharedPluginData("lc2","body"));
const body=await figma.getNodeByIdAsync(B[ARGS.variant]);
const N=await figma.getNodeByIdAsync(ARGS.host); if(!N) return {err:"no host"};
const old=await N.getMainComponentAsync(); if(old.parent && old.parent.id===body.parent.id) return {skip:"already body"};
const modal=await figma.getNodeByIdAsync(ARGS.host.slice(1).split(";")[0]);
let pg=modal; while(pg.type!=="PAGE") pg=pg.parent;
const snap={h:N.layoutSizingHorizontal,v:N.layoutSizingVertical,w:N.width,hh:N.height,clip:N.clipsContent};
const kids=[];
for(const c of N.children){ const k=c.clone(); pg.appendChild(k); kids.push({k,h:c.layoutSizingHorizontal,v:c.layoutSizingVertical,lp:c.layoutPositioning,x:c.x,y:c.y,w:c.width,hh:c.height,vis:c.visible}); }
const ref=N.componentPropertyReferences&&N.componentPropertyReferences.mainComponent;
if(ref) modal.setProperties({[ref]:body.id}); else N.swapComponent(body);
const N2=await figma.getNodeByIdAsync(ARGS.host);
const slot=N2.children.find(c=>c.type==="SLOT");
for(const d of [...slot.children]) d.remove();
for(const o of kids){ slot.appendChild(o.k); o.k.visible=o.vis;
  if(o.lp==="ABSOLUTE"){o.k.layoutPositioning="ABSOLUTE";o.k.x=o.x;o.k.y=o.y;}
  else { try{o.k.layoutSizingHorizontal=o.h}catch(e){} try{o.k.layoutSizingVertical=o.v}catch(e){} } }
try{N2.layoutSizingHorizontal=snap.h}catch(e){} try{N2.layoutSizingVertical=snap.v}catch(e){}
if(snap.clip!==N2.clipsContent){ try{N2.clipsContent=snap.clip}catch(e){} }
return {host:ARGS.host, old:old.name, size:[Math.round(snap.w)+"x"+Math.round(snap.hh), Math.round(N2.width)+"x"+Math.round(N2.height)], kids:slot.children.length, clip:[snap.clip,N2.clipsContent], modal:[modal.id,Math.round(modal.width)+"x"+Math.round(modal.height)]};
