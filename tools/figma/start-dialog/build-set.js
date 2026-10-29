// Dialog / Start process — local copy for files that do not get the GEAP 2.0 component (not published).
// Run via use_figma. Part 1 builds the 6 variants + set; part 2 (refs.js) binds text properties.
// Source set: GEAP 2.0 13858:16011. Needs library imports (Foundations keys below) + local Close button · phone + Message · subtle.
const CFG = { closePhone: '1175:45920', msgWarn: '1054:200', msgErr: '1117:3009', section: '1176:56449' };
const K = {
  bg:'ec2921da40a6853a80b0d299be5bc8b1a11fcc89', text:'c37576ba1791b00ac80a9a55579913b69d0b8b8f', tert:'9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f', sec:'5d1a031c4c310a753a2c49f91c89db7ddb8a2287',
  s0:'09bbd3605451b3c79ea224d8e2e42a6830817f77', s2:'4e3c603781105ce160a1dc8d8ea7e97128057074', s8:'69ac88e41c0fea695fc5c4fd33f0188d1172dc59', s16:'22028a118574e28e30382d57efffac20e14398f0', s20:'8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c', s24:'49c6a5e43fd55f8fa058dfc13851df2854db5d83', s56:'f3817bc19ba08eb020f2f88300b05dacbfa26b49', s64:'43464c51e14946ad337f86a0c002e2db5a167fd7',
  r16:'5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0', r999:'cd76e9200ec61264fe73c9484085ef475ac6c345',
  stH4:'6437d48337bf6d1b766873db20b097b9b08cabf4', stSmall:'1f35541006807f80d766d8eb6ef5ae95d4f5cf6e', stBody:'392200dc0245a58de37af35126f75e6aba9c1fd7', stBodyPh:'5fba761eed1c65191ba443035bbc35635e9a38d7', stCap:'8d8e3878d547d107cf6de81a24255f71485db63f', stCapPh:'1216436736482ee77081dda7a8b07da9717067b3',
  eff:'0f8db7d3be943869e9b2fd420fb6036884b875ba',
  btnClose:'75b4a0af7e74a50fdf81c4760885754d4571b512', btnCancel:'757e78a64cf1977fc43cadc80a4c4a4a227cb10f', btnStart:'a6b4d812cccab6aa0d8375610a54af191c41ee69',
  x16:'3f8e0ba57dfa5f76123ad5a4285b9172f3562f41', arrow:'d4bcc2d06aae1f996b75052e41d3755a1c1e4978', card:'aca711a43986722b21edbab93c36fc4a14991ba4', clock:'813049fe3d9919c577e30403d3322903d59422b1', sign:'4ec9fd805e3a6c16f0d8c022c9b63f8eedfed58a' };
const vcache = {}; const V = async k => vcache[k] || (vcache[k] = await figma.variables.importVariableByKeyAsync(k));
const bind = async (n, f, k) => n.setBoundVariable(f, await V(K[k]));
const paintFill = async (n, k) => { n.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', await V(K[k]))]; };
const pk = (i, pre) => Object.keys(i.componentProperties).find(x => x.startsWith(pre));
const frame = async (name, mode, pad, gap) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = mode; f.clipsContent = false;
  const [t, r, b, l] = pad; await bind(f, 'paddingTop', t); await bind(f, 'paddingRight', r); await bind(f, 'paddingBottom', b); await bind(f, 'paddingLeft', l); if (gap) await bind(f, 'itemSpacing', gap); return f; };
const text = async (name, chars, styleKey, fillKey) => { const st = await figma.importStyleByKeyAsync(K[styleKey]); await figma.loadFontAsync(st.fontName); const t = figma.createText(); t.name = name; t.fontName = st.fontName; t.characters = chars; await t.setTextStyleIdAsync(st.id); await paintFill(t, fillKey); return t; };
const imp = async k => figma.importComponentByKeyAsync(k);

async function build(tone, bp) {
  const ph = bp === 'Phone';
  const root = figma.createComponent(); root.name = `Tone=${tone}, Breakpoint=${bp}`;
  root.layoutMode = 'VERTICAL'; root.itemSpacing = 0; root.paddingTop = root.paddingBottom = root.paddingLeft = root.paddingRight = 0; root.primaryAxisSizingMode = 'AUTO'; root.counterAxisSizingMode = 'FIXED'; root.resize(ph ? 375 : 590, 100); root.clipsContent = true;
  await paintFill(root, 'bg'); await bind(root, 'topLeftRadius', 'r16'); await bind(root, 'topRightRadius', 'r16'); if (!ph) { await bind(root, 'bottomLeftRadius', 'r16'); await bind(root, 'bottomRightRadius', 'r16'); } else { root.bottomLeftRadius = 0; root.bottomRightRadius = 0; }
  const es = await figma.importStyleByKeyAsync(K.eff); await root.setEffectStyleIdAsync(es.id);
  // header
  const hd = await frame('modal--header', 'VERTICAL', ph ? ['s16', 's56', 's0', 's16'] : ['s20', 's64', 's0', 's20'], 's2'); root.appendChild(hd); hd.layoutSizingHorizontal = 'FILL'; hd.layoutSizingVertical = 'HUG';
  const ti = await text('Title', 'Reperfectare act', 'stH4', 'text'); hd.appendChild(ti); ti.layoutSizingHorizontal = 'FILL'; ti.textAutoResize = 'HEIGHT';
  const su = await text('Subtitle', 'Cafeneaua „Izvoraș”, mun. Bălți', 'stSmall', 'tert'); hd.appendChild(su); su.layoutSizingHorizontal = 'FILL'; su.textAutoResize = 'HEIGHT';
  // close
  let cl;
  if (ph) { const m = await figma.getNodeByIdAsync(CFG.closePhone); cl = m.createInstance(); root.appendChild(cl); cl.layoutPositioning = 'ABSOLUTE'; cl.constraints = { horizontal: 'MAX', vertical: 'MIN' }; cl.x = 319; cl.y = 12; }
  else { const m = await imp(K.btnClose); cl = m.createInstance(); root.appendChild(cl); const x16 = await imp(K.x16); cl.setProperties({ [pk(cl, '🔄 Leading Icon: 16')]: x16.id }); cl.layoutPositioning = 'ABSOLUTE'; cl.constraints = { horizontal: 'MAX', vertical: 'MIN' }; cl.x = 538; cl.y = 20; }
  cl.name = 'Close';
  // content
  const ct = await frame('modal-content', 'VERTICAL', ph ? ['s16', 's16', 's24', 's16'] : ['s16', 's20', 's24', 's20'], 's16'); root.appendChild(ct); ct.layoutSizingHorizontal = 'FILL'; ct.layoutSizingVertical = 'HUG';
  if (tone === 'Default') { const tx = await text('Text', 'Modifici datele actului permisiv. Actul emis se atașează automat.', ph ? 'stBodyPh' : 'stBody', 'text'); ct.appendChild(tx); tx.layoutSizingHorizontal = 'FILL'; tx.textAutoResize = 'HEIGHT'; }
  else { const m = await figma.getNodeByIdAsync(tone === 'Warning' ? CFG.msgWarn : CFG.msgErr); const nt = m.createInstance(); nt.name = 'Notice'; ct.appendChild(nt); nt.layoutSizingHorizontal = 'FILL'; nt.isExposedInstance = true;
    const tk = Object.keys(nt.componentProperties).find(k => k.startsWith('Text#')); nt.setProperties({ [tk]: tone === 'Warning' ? 'Actul nu va fi valabil pe durata suspendării; nu poți desfășura activitatea autorizată.' : 'Actul își pierde valabilitatea definitiv; nu poți desfășura activitatea autorizată.' }); }
  const fc = await frame('Facts', 'HORIZONTAL', ['s0', 's0', 's0', 's0'], 's16'); ct.appendChild(fc); fc.layoutSizingHorizontal = 'FILL'; fc.layoutSizingVertical = 'HUG'; fc.layoutWrap = 'WRAP'; await bind(fc, 'counterAxisSpacing', 's8');
  for (const [nm, ik, lb] of [['Fact · fee', 'card', 'Fără taxă'], ['Fact · term', 'clock', '5 zile lucrătoare'], ['Fact · sign', 'sign', 'Semnare MSign']]) {
    const f = await frame(nm, 'HORIZONTAL', ['s0', 's0', 's0', 's0'], 's8'); fc.appendChild(f); f.layoutSizingHorizontal = 'HUG'; f.layoutSizingVertical = 'HUG'; f.counterAxisAlignItems = 'CENTER';
    const ic = (await imp(K[ik])).createInstance(); ic.name = 'Icon'; f.appendChild(ic); ic.resize(20, 20);
    const lt = await text('Label', lb, 'stSmall', 'sec'); f.appendChild(lt); lt.textAutoResize = 'WIDTH_AND_HEIGHT'; }
  // footer
  const ft = await frame('modal--footer', 'VERTICAL', ph ? ['s0', 's16', 's16', 's16'] : ['s0', 's20', 's20', 's20'], 's8'); root.appendChild(ft); ft.layoutSizingHorizontal = 'FILL'; ft.layoutSizingVertical = 'HUG'; ft.counterAxisAlignItems = ph ? 'MIN' : 'MAX';
  const br = await frame('modal-buttons', 'HORIZONTAL', ['s0', 's0', 's0', 's0'], 's8'); ft.appendChild(br); br.layoutSizingHorizontal = ph ? 'FILL' : 'HUG'; br.layoutSizingVertical = 'HUG';
  const cn = (await imp(K.btnCancel)).createInstance(); cn.name = 'Cancel'; br.appendChild(cn);
  const st = (await imp(K.btnStart)).createInstance(); st.name = 'Start'; br.appendChild(st);
  const ar = await imp(K.arrow);
  const sp = { [pk(st, '🔄 Trailing Icon: 20')]: ar.id }; if (tone === 'Destructive') sp['🖌️ Style'] = 'Destructive'; if (ph) sp['🎚️ Size'] = 'Large'; st.setProperties(sp);
  if (ph) { cn.setProperties({ '🎚️ Size': 'Large' }); cn.layoutSizingHorizontal = 'FILL'; st.layoutSizingHorizontal = 'FILL'; }
  const cp = await text('Caption', 'Vei continua în formularul cererii.', ph ? 'stCapPh' : 'stCap', 'tert'); ft.appendChild(cp);
  if (ph) { cp.layoutSizingHorizontal = 'FILL'; cp.textAutoResize = 'HEIGHT'; cp.textAlignHorizontal = 'CENTER'; } else cp.textAutoResize = 'WIDTH_AND_HEIGHT';
  return root;
}
const comps = [];
for (const bp of ['Desktop', 'Phone']) for (const tone of ['Default', 'Warning', 'Destructive']) comps.push(await build(tone, bp));
const sec = await figma.getNodeByIdAsync(CFG.section);
const set = figma.combineAsVariants(comps, sec); set.name = 'Dialog / Start process';
set.layoutMode = 'NONE';
// layout grid of variants
let x = 0; comps.forEach((c, i) => { c.x = (i % 3) * 670; c.y = i < 3 ? 0 : 420; });
set.resizeWithoutConstraints(3 * 670 - 80, 420 + 460);
let maxB = 0; for (const c of sec.children) if (c !== set) maxB = Math.max(maxB, c.y + c.height);
set.x = 80; set.y = maxB + 80; sec.resizeWithoutConstraints(Math.max(sec.width, set.x + set.width + 80), set.y + set.height + 80);
return { set: set.id, vars: comps.map(c => c.id + ' ' + c.name + ' ' + Math.round(c.height)) };
