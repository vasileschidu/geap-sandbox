// GEAP 2.0 local-components-page-v2 (2026-10-24). Stored copy: root shared plugin data lc2/setconv. See README.md.
// ARGS {id, cat, frameName}: component set shown in a spec area -> frame of variant instances in its place; set moved to the components page
const S=await figma.getNodeByIdAsync(ARGS.id); const P=S.parent; const idx=P.children.indexOf(S);
const F=figma.createFrame(); P.insertChild(idx,F); F.name=ARGS.frameName||(S.name+" · variants");
const pAL = P.type!=="SECTION" && P.type!=="PAGE" && P.layoutMode && P.layoutMode!=="NONE";
F.fills=JSON.parse(JSON.stringify(S.fills)); F.strokes=[]; // the purple dashed set outline is an editor marker of a SET (raw colour) — not copied to a plain frame
F.strokesIncludedInLayout=false;
F.cornerRadius=S.cornerRadius; F.clipsContent=S.clipsContent; F.effects=JSON.parse(JSON.stringify(S.effects));
const lm=S.layoutMode; const res=[];
if(lm==="NONE"){ F.resize(S.width,S.height); for(const v of S.children){const i=v.createInstance(); F.appendChild(i); i.x=v.x; i.y=v.y; res.push(i.id);} }
else {
  F.layoutMode=lm;
  for(const k of ["paddingTop","paddingRight","paddingBottom","paddingLeft"]) F[k]=S[k];
  if(lm!=="GRID"){ F.itemSpacing=S.itemSpacing; F.primaryAxisAlignItems=S.primaryAxisAlignItems; F.counterAxisAlignItems=S.counterAxisAlignItems; F.layoutWrap=S.layoutWrap; if(S.layoutWrap==="WRAP") F.counterAxisSpacing=S.counterAxisSpacing; }
  else { F.gridRowCount=S.gridRowCount; F.gridColumnCount=S.gridColumnCount; F.gridRowGap=S.gridRowGap; F.gridColumnGap=S.gridColumnGap;
    try{F.gridRowSizes=JSON.parse(JSON.stringify(S.gridRowSizes));}catch(e){} try{F.gridColumnSizes=JSON.parse(JSON.stringify(S.gridColumnSizes));}catch(e){} }
  for(const [k,a] of Object.entries(S.boundVariables||{})){ if(k==="fills"||k==="strokes") continue; try{const v=await figma.variables.getVariableByIdAsync(a.id); F.setBoundVariable(k,v);}catch(e){res.push("bv-fail "+k)} }
  F.primaryAxisSizingMode=S.primaryAxisSizingMode; F.counterAxisSizingMode=S.counterAxisSizingMode;
  if(S.primaryAxisSizingMode==="FIXED"||S.counterAxisSizingMode==="FIXED") F.resize(S.width,S.height);
  for(const v of S.children){const i=v.createInstance(); F.appendChild(i);
    if(lm==="GRID"){ i.gridRowSpan=v.gridRowSpan; i.gridColumnSpan=v.gridColumnSpan; try{ i.setGridChildPosition(v.gridRowAnchorIndex, v.gridColumnAnchorIndex);}catch(e){res.push("grid-fail "+e.message)} i.gridChildHorizontalAlign=v.gridChildHorizontalAlign; i.gridChildVerticalAlign=v.gridChildVerticalAlign; }
    else { i.layoutAlign=v.layoutAlign; i.layoutGrow=v.layoutGrow; }
    res.push(i.id);}
}
if(!pAL){ F.x=S.x; F.y=S.y; } else { F.layoutAlign=S.layoutAlign; F.layoutGrow=S.layoutGrow; }
const geo=[Math.round(F.x),Math.round(F.y),Math.round(F.width),Math.round(F.height)], sgeo=[Math.round(S.x),Math.round(S.y),Math.round(S.width),Math.round(S.height)];
const SEC=JSON.parse(figma.root.getSharedPluginData("localcomp","sections")); const sec=await figma.getNodeByIdAsync(SEC[ARGS.cat]); sec.appendChild(S); S.x=80; S.y=-99999;
return {frame:F.id, geo, sgeo, inst:res};
