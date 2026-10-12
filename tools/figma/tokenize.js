// TOKENIZE(roots) — copy of the Figma text node „tokenize (nu șterge)” (10012:328, ↳ BO -> Clasificatoare).
// Binds padding/gap to Foundations spacing variables (snap to nearest; tie → larger) and applies the
// Foundations Desktop text styles to every text outside instances. Returns stats.
// Use: paste this file into a use_figma call, then `return await TOKENIZE([await figma.getNodeByIdAsync(id)])`.
// Run it on every capture after swap-to-instances (captures bind colours + spacing, but carry NO text styles).
const SP={0:"09bbd3605451b3c79ea224d8e2e42a6830817f77",2:"4e3c603781105ce160a1dc8d8ea7e97128057074",4:"983c5b4d9a4e5fa988f0154c9bf4290c7aec9635",6:"82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39",8:"69ac88e41c0fea695fc5c4fd33f0188d1172dc59",12:"ee4801fea560b76dffab59bd8ee6e31e3b636570",16:"22028a118574e28e30382d57efffac20e14398f0",20:"8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c",24:"49c6a5e43fd55f8fa058dfc13851df2854db5d83",32:"d1bd20c7a50c986d517b076fed38101f5b33c1ff",40:"7cafa764a9b0b1eb7a8fe2bec67721b5c331cf83",48:"2a030f2d03121ff975816aa58b5b51e550b62df9",56:"f3817bc19ba08eb020f2f88300b05dacbfa26b49",64:"43464c51e14946ad337f86a0c002e2db5a167fd7",80:"6b41a484af89fb00350dc4422ac7fb5e7cf8687a",96:"1cf54ac625fd82238d651a7306f641a7b8f7cdbf",120:"3a33dc48c02f36d1cb1d21d2cf090ee088049a91"};
const TS={cs:"3ab233d194ba36d0b9986734fdb9d55967dd1448",cm:"8d8e3878d547d107cf6de81a24255f71485db63f",cm5:"f28b7696292db20f926d7897d94e584ceb392ceb",bs:"1f35541006807f80d766d8eb6ef5ae95d4f5cf6e",bs5:"057521fde838188af42abf69eb3789f676421047",bd:"392200dc0245a58de37af35126f75e6aba9c1fd7",bd5:"e069d3c303536b6b965b5e68074b3200d638b7b3",bl:"ead7c03fa8d45f21306e772b0576a2c3df1d7237",bl5:"2c789c4dd09bd642000ba0e56c332dd666c211de",h5:"75e7dfdca13a793cb25b8e6cb5949ad59c850c85",h4:"6437d48337bf6d1b766873db20b097b9b08cabf4",h3:"baf5f0238882e79bcbabaffcb185862f572c5bcf",h2:"5efe3a2cf8678d3a30f6fd88b1af8e7343507863",h1:"3a7a84f17af9b1b17bb6b59d7e5f389216e347ac",
  /* Mobile headings (Foundations): H1 32/40, H2 28/36, H3 22/30, H4 18/26, H5 16/24 — used with TOKENIZE(roots, {mobile:true}) */
  mh1:"67a58071b24c3d987cfa512cd21ea553b94fb1fe",mh2:"5f4035653c5454e65bfc3dc16a0710ebbac5fb37",mh3:"922cb277740e44493176f9044fe3465b237c95b5",mh4:"47680a7a1dbc31b424527363885d6fcaec37c88e",mh5:"275607150544ddbd2d097c727da7f0baaaf7d7fe"};
const VV={}; const gvar=async v=>{const k=SP[v]; return VV[v]||=await figma.variables.importVariableByKeyAsync(k);};
const SS={}; const gst=async k=>SS[k]||=await figma.importStyleByKeyAsync(TS[k]);
const scale=Object.keys(SP).map(Number).sort((a,b)=>a-b);
const snap=v=>{let best=scale[0];for(const s of scale){const d=Math.abs(s-v),bd=Math.abs(best-v);if(d<bd||(d===bd&&s>best))best=s;}return best;};
const W=s=>/Bold|SemiBold/.test(s)?600:/Medium/.test(s)?500:400;
const styleFor=(size,wt)=>size<=10?"cs":size<=12?(wt>=500?"cm5":"cm"):size<=14?(wt>=500?"bs5":"bs"):size<=16?(wt>=500?"bd5":"bd"):size<=18?(wt>=600?"h5":wt>=500?"bl5":"bl"):size<=20?"h4":size<=24?"h3":size<=32?"h2":size<=48?"h1":null;
let MOBILE=false;
const mobileStyleFor=(size,wt)=>wt>=600&&size>=16?(size>=30?"mh1":size>=25?"mh2":size>=20?"mh3":size>=17?"mh4":"mh5"):styleFor(size,wt);
const inInst=n=>{let p=n.parent;while(p&&p.type!=="PAGE"){if(p.type==="INSTANCE")return true;p=p.parent;}return false;};
const isDecor=n=>{let p=n;while(p&&p.type!=="PAGE"){if(/^(\.header|Graphycs)$/.test(p.name))return true;p=p.parent;}return false;};
const st={pad:0,snapped:0,sb:0,margin:0,vp:0,one:0,text:0,textSkip:0};
const fixFrame=async f=>{
  if(f.layoutMode==="NONE") return;
  if(f.itemSpacing>120 && f.children.filter(c=>c.layoutPositioning!=="ABSOLUTE").length===2){ f.primaryAxisAlignItems="SPACE_BETWEEN"; f.itemSpacing=0; st.sb++; }
  if(/^margin$/.test(f.name)&&f.paddingLeft>120&&Math.abs(f.paddingLeft-f.paddingRight)<2){ const cw=f.width-f.paddingLeft-f.paddingRight; for(const c of f.children){ if(c.layoutPositioning==="ABSOLUTE") continue; c.layoutSizingHorizontal="FIXED"; c.resize(cw,c.height); if(c.type==="TEXT") c.textAutoResize="HEIGHT"; } f.paddingLeft=0; f.paddingRight=0; if(f.layoutMode==="VERTICAL") f.counterAxisAlignItems="CENTER"; else f.primaryAxisAlignItems="CENTER"; st.margin++; }
  if(/^(Overlay|Modal overlay|modal-overlay)/i.test(f.name)&&(f.paddingTop>120||f.paddingLeft>120)){
    const kids=f.children.filter(c=>c.layoutPositioning!=="ABSOLUTE"&&!/scrim/i.test(c.name));
    if(kids.length===1){ const vp=figma.createFrame(); vp.name="viewport"; vp.fills=[]; vp.layoutMode="VERTICAL"; vp.primaryAxisAlignItems="CENTER"; vp.counterAxisAlignItems="CENTER"; vp.clipsContent=false;
      f.insertChild(f.children.indexOf(kids[0]),vp); vp.resize(f.width,Math.min(1024,f.height)); vp.layoutSizingHorizontal="FIXED"; vp.layoutSizingVertical="FIXED"; vp.appendChild(kids[0]);
      f.paddingTop=f.paddingLeft=f.paddingRight=f.paddingBottom=0; f.primaryAxisAlignItems="MIN"; f.counterAxisAlignItems="MIN"; st.vp++; } }
  if([f.paddingTop,f.paddingBottom,f.paddingLeft,f.paddingRight].some(v=>v===1)){ const b1=await figma.variables.importVariableByKeyAsync("e06116ffefa61d661228f8951cb103076fb97e25"); for(const k of ["paddingTop","paddingBottom","paddingLeft","paddingRight"]) if(f[k]===1) f.setBoundVariable(k,b1); st.one++; }
  for(const k of ["paddingTop","paddingBottom","paddingLeft","paddingRight","itemSpacing"]){
    if(k==="itemSpacing"&&f.primaryAxisAlignItems==="SPACE_BETWEEN") continue;
    let v=Math.round(f[k]); if(v<0) v=0; const s=snap(v); if(s!==v) st.snapped++;
    if(s===0){ if(f[k]!==0) f[k]=0; continue; }
    if(f.boundVariables&&f.boundVariables[k]) continue;
    f.setBoundVariable(k, await gvar(s)); st.pad++; }
  if(f.layoutWrap==="WRAP"&&f.counterAxisSpacing){ const s=snap(Math.round(f.counterAxisSpacing)); if(s) f.setBoundVariable("counterAxisSpacing",await gvar(s)); }
};
const fixText=async t=>{
  if(isDecor(t)){ st.textSkip++; return; }
  const segs=t.getStyledTextSegments(["fontSize","fontName","textStyleId"]);
  for(const s of segs){ if(s.textStyleId) continue; const k=(MOBILE?mobileStyleFor:styleFor)(s.fontSize,W(s.fontName.style)); if(!k){ st.textSkip++; continue; }
    const style=await gst(k); await figma.loadFontAsync(style.fontName); await t.setRangeTextStyleIdAsync(s.start,s.end,style.id); st.text++; } };
const TOKENIZE=async (roots,opt={})=>{ MOBILE=Boolean(opt.mobile); for(const r of roots){ const frames=[r,...(r.findAll?r.findAll(n=>(n.type==="FRAME"||n.type==="COMPONENT")&&!inInst(n)):[])]; for(const f of frames) if(f.type==="FRAME"||f.type==="COMPONENT") await fixFrame(f);
  const texts=r.findAllWithCriteria?r.findAllWithCriteria({types:["TEXT"]}).filter(t=>!inInst(t)):[]; for(const t of texts) await fixText(t); } return st; };
