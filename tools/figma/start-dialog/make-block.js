// Cabinet „Start dialog” block maker. Stored in root shared plugin data sd/mk; run:
//   const mk = await new (Object.getPrototypeOf(async function(){}).constructor)(figma.root.getSharedPluginData('sd','mk'))();
//   await mk({ src, id, title, dialog:{tone,title,subtitle,text,notice,fee,term,sign,caption}, note, inPlace, noteTitle })
const SET = '1518:3214';
const set = await figma.getNodeByIdAsync(SET);
const variant = (tone, bp) => set.children.find(c => c.name === 'Tone=' + tone + ', Breakpoint=' + bp);
const pkey = (i, pre) => Object.keys(i.componentProperties).find(k => k.startsWith(pre + '#'));
async function setTxt(t, s) { for (const f of t.getRangeAllFontNames(0, Math.max(1, t.characters.length))) await figma.loadFontAsync(f); t.characters = s; }
function dlg(d, bp) {
  const inst = variant(d.tone, bp).createInstance(); const sp = {};
  const m = { Title: d.title, Subtitle: d.subtitle, Fee: d.fee, Term: d.term, Signing: d.sign || 'Semnare MSign', Caption: d.caption };
  if (d.tone === 'Default') m.Text = d.text;
  for (const [k, v] of Object.entries(m)) sp[pkey(inst, k)] = v;
  sp[pkey(inst, 'Show signing')] = d.sign !== null;
  inst.setProperties(sp);
  if (d.tone !== 'Default') { const n = inst.findOne(x => x.name === 'Notice' && x.type === 'INSTANCE'); n.setProperties({ [Object.keys(n.componentProperties).find(k => k.startsWith('Text#'))]: d.notice }); }
  return inst;
}
return async function mk(a) {
  const src = await figma.getNodeByIdAsync(a.src);
  const blk = a.inPlace ? src : src.clone();
  blk.name = 'Block · ' + a.id;
  const label = blk.children.find(c => c.name.startsWith('Screen label'));
  label.name = 'Screen label · ' + a.id;
  const idf = label.findOne(x => x.name === 'ID'); await setTxt(idf.findOne(x => x.type === 'TEXT'), a.id);
  await setTxt(label.findOne(x => x.name === 'Title'), a.title);
  const st = label.findOne(x => x.name === 'Status' && x.type === 'INSTANCE'); const sm = await st.getMainComponentAsync(); if (sm.parent && sm.parent.type === 'COMPONENT_SET') st.swapComponent(sm.parent.children[0]);
  const lk = label.findOne(x => x.name === 'Link · prototype'); const old = lk.getRangeHyperlink(0, lk.characters.length);
  if (old && old.value) lk.setRangeHyperlink(0, lk.characters.length, { type: 'URL', value: old.value.replace(/state=[^&]+/, 'state=' + a.id) });
  const scr = blk.children.find(c => c.name.startsWith('Screens'));
  const res = {};
  for (const s of scr.children) {
    const desk = s.name.startsWith('Desktop');
    s.name = (desk ? 'Desktop · ' : 'Mobile · ') + a.id;
    const ov = s.children.find(x => x.name.startsWith('Overlay'));
    for (const c of [...ov.children]) c.remove();
    const inst = dlg(a.dialog, desk ? 'Desktop' : 'Phone'); ov.appendChild(inst); inst.name = 'Start dialog · ' + a.dialog.title;
    if (desk) {
      s.layoutSizingVertical = 'FIXED'; s.resize(1440, 900); s.clipsContent = true;
      ov.resize(1440, 900); ov.x = 0; ov.y = 0;
      inst.x = 425; inst.y = Math.round((900 - inst.height) / 2);
    } else { inst.x = 0; inst.y = 812 - inst.height; }
    if (a.dropAnchors) for (const an of s.children.filter(x => x.name.startsWith('anchor'))) an.remove();
    res[desk ? 'desk' : 'mob'] = s.id; res[desk ? 'ovD' : 'ovM'] = ov.id; res[desk ? 'dlgD' : 'dlgM'] = inst.id;
  }
  const note = blk.children.find(c => c.name.startsWith('Note'));
  note.name = 'Note · ' + a.id;
  const ts = note.findAll(x => x.type === 'TEXT'); const nt = note.findOne(x => x.name === 'Note title'), nx = note.findOne(x => x.name === 'Note text');
  await setTxt(nt, a.id + ' · ' + a.noteTitle); await setTxt(nx, a.note);
  res.block = blk.id; res.h = Math.round(blk.height);
  return res;
};
