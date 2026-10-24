// GEAP 2.0 local-components-page-v2 (2026-10-24). Stored copy: root shared plugin data lc2/convert. See README.md.
// ARGS: {items:[{id, rename?, keepName?}]}  main COMPONENT inside a screen -> instance in place, main returned for placing
const done=[];
for (const it of ARGS.items){
  const M=await figma.getNodeByIdAsync(it.id); if(!M||M.type!=="COMPONENT") {done.push([it.id,"skip"]);continue;}
  const P=M.parent; const idx=P.children.indexOf(M);
  const snap={lp:M.layoutPositioning,h:M.layoutSizingHorizontal,v:M.layoutSizingVertical,x:M.x,y:M.y,w:M.width,hh:M.height,g:M.layoutGrow,a:M.layoutAlign,c:M.constraints,vis:M.visible,name:M.name,lock:M.locked};
  const inst=M.createInstance();
  P.insertChild(idx,inst);
  inst.name=snap.name; inst.visible=snap.vis;
  const inAL = P.type!=="SECTION" && P.type!=="PAGE" && P.layoutMode && P.layoutMode!=="NONE";
  if(inAL && snap.lp==="ABSOLUTE") inst.layoutPositioning="ABSOLUTE";
  if(!inAL || snap.lp==="ABSOLUTE"){ inst.x=snap.x; inst.y=snap.y; try{inst.constraints=snap.c}catch(e){} }
  if(inAL && snap.lp!=="ABSOLUTE"){ inst.layoutAlign=snap.a; inst.layoutGrow=snap.g; }
  inst.resize(snap.w,snap.hh);
  if(inAL){ try{inst.layoutSizingHorizontal=snap.h}catch(e){} try{inst.layoutSizingVertical=snap.v}catch(e){} }
  done.push([it.id,inst.id,Math.round(inst.width)+"x"+Math.round(inst.height),snap.w+"x"+snap.hh]);
  if(it.rename) M.name=it.rename;
  // park on local page (section set by place)
  const S=JSON.parse(figma.root.getSharedPluginData("localcomp","sections"));
  const sec=await figma.getNodeByIdAsync(S[it.cat]); sec.appendChild(M); M.x=80; M.y=-99999; 
}
return done;
