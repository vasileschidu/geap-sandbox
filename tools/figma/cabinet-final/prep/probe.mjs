import { openChrome } from "/Users/user/Desktop/e-permits-vibe/tools/figma/cabinet/cdp.mjs";
import fs from "node:fs";
const states = process.argv[2].split(",");
const widths = (process.argv[3]||"1440,375").split(",").map(Number);
const c = await openChrome();
const out = fs.existsSync(process.argv[4]) ? JSON.parse(fs.readFileSync(process.argv[4])) : {};
const EXPR = `(() => {
  const T = e => e ? e.textContent.replace(/\\s+/g,' ').trim() : '';
  const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const secs = [...document.querySelectorAll('section.e-permits-dosar-profil__section, .cab-section')].filter(vis).filter((s,i,a)=>!a.some(o=>o!==s && o.contains(s)));
  const rich = p => [...p.childNodes].map(n => n.nodeType===3 ? [n.textContent.replace(/\\s+/g,' '),0] : (n.tagName==='A' ? [T(n),2,!!n.querySelector('svg')] : (n.tagName==='STRONG'||n.tagName==='B' ? [T(n),1] : [n.textContent.replace(/\\s+/g,' '),0]))).filter(x=>x[0].trim()!=='' || x[0]===' ');
  return secs.map(s => {
    const o = { title: T(s.querySelector('h2,h3,.e-permits-dosar-profil__section-title')), rect: r(s) };
    const rows = [...s.querySelectorAll('.e-permits-dosar-profil__row')].filter(vis);
    if (rows.length) o.rows = rows.map(x => { const v = x.querySelector('.e-permits-dosar-profil__row-value') || x.children[1]; const lis = v ? [...v.querySelectorAll('li')] : []; return { l: T(x.querySelector('.e-permits-dosar-profil__row-label')||x.children[0]), v: T(v), vt: lis.length ? lis.map(T).join('\\n') : null, copy: !!x.querySelector('.copy-value'), link: !!(v && v.querySelector('a')), tag: v && v.querySelector('.tag') ? T(v.querySelector('.tag')) : null, h: r(x)[3] }; });
    const ben = s.querySelector('.e-permits-fo-selected-role');
    if (ben) o.ben = { name: T(ben.querySelector('strong')), idl: T(ben.querySelector('.e-permits-fo-selected-role__id-label')), id: T(ben.querySelector('.copy-value__text')), icon: (ben.querySelector('use')?.getAttribute('href')||'').split('#')[1], initials: T(ben.querySelector('.avatar')), avcls: ben.querySelector('.avatar')?.className, h: r(ben)[3] };
    const tl = s.querySelector('ol.e-permits-timeline');
    if (tl) o.tl = { h: r(tl)[3], items: [...tl.children].map(li => ({ mod: (li.className.match(/--(\\w+)/)||[])[1]||'', icon: (li.querySelector('.e-permits-timeline__marker use')?.getAttribute('href')||'').split('#')[1]||'', title: T(li.querySelector('.e-permits-timeline__title')), tags: [...li.querySelectorAll('.e-permits-timeline__title .tag')].map(T), stamp: T(li.querySelector('.e-permits-timeline__stamp')), text: li.querySelector('.e-permits-timeline__text') ? rich(li.querySelector('.e-permits-timeline__text')) : null, h: r(li)[3] })) };
    const tbl = s.querySelector('table'); if (tbl) o.table = { rows: tbl.querySelectorAll('tbody tr').length, head: [...tbl.querySelectorAll('thead th')].map(T) };
    if (!o.rows && !o.ben && !o.tl && !o.table) o.text = T(s).slice(0, 300);
    o.cls = s.className;
    return o;
  });
})()`;
for (const s of states) for (const w of widths) {
  await c.open(s, w);
  out[s + "@" + w] = await c.ev(EXPR);
}
c.close();
fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));
console.log("ok", Object.keys(out).length);
