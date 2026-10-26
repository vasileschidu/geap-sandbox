import { openChrome } from "/Users/user/Desktop/e-permits-vibe/tools/figma/cabinet/cdp.mjs";
import fs from "node:fs";
const states = process.argv[2].split(","); const c = await openChrome();
const SPEC = fs.readFileSync(new URL('./ctxspec.js', import.meta.url), 'utf8');
const GEO = `(() => { const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const pg = [...document.querySelectorAll('.e-permits-doc-page')].find(p => p.getClientRects().length);
  const dlg = pg && pg.closest('[role=dialog], .modal, dialog');
  const box = dlg && (dlg.querySelector('.modal') || dlg);
  const wm = [...document.querySelectorAll('[class*=watermark]')].filter(e => e.getClientRects().length).map(e => e.className + ':' + e.textContent.trim());
  const sig = dlg && dlg.querySelector('.e-permits-doc-signature, [class*=signature]');
  const canvas = pg && pg.parentElement;
  return { vw: innerWidth, vh: innerHeight, dialog: r(box), page: r(pg), canvas: r(canvas && canvas.closest('[class*=canvas], [class*=viewer]')), scale: pg ? getComputedStyle(pg).transform : null, wm, sig: sig ? [sig.className, sig.textContent.replace(/\\s+/g,' ').trim(), r(sig)] : null, title: dlg ? (dlg.querySelector('h2,h1,.modal-title')||{}).textContent : null, footer: dlg ? [...dlg.querySelectorAll('footer button, .modal-footer button, [class*=footer] button')].map(b => b.textContent.trim() + '|' + b.className.toString().slice(0,60)) : [] }; })()`;
const out = {};
for (const s of states) { await c.open(s, 1440); out[s] = { spec: JSON.parse(await c.ev(SPEC) || "null"), geo: await c.ev(GEO) }; await c.open(s, 375); out[s].geoM = await c.ev(GEO); }
c.close(); fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1)); console.log("ok");
