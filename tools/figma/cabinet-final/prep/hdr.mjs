import { openChrome } from "/Users/user/Desktop/e-permits-vibe/tools/figma/cabinet/cdp.mjs";
import fs from "node:fs";
const states = process.argv[2].split(","); const widths = (process.argv[3]||"1440,375").split(",").map(Number);
const c = await openChrome(); const out = fs.existsSync(process.argv[4]) ? JSON.parse(fs.readFileSync(process.argv[4])) : {};
const EXPR = `(() => {
  const T = e => e ? e.textContent.replace(/\\s+/g,' ').trim() : '';
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const h1 = document.querySelector('h1');
  const hdr = h1 && (h1.closest('.e-permits-page-header, header, .cab-detail__header') || h1.parentElement);
  const o = { h1: T(h1), crumb: [...document.querySelectorAll('nav[aria-label*="readcrumb"] a, .breadcrumb a, .breadcrumb-item')].filter(vis).map(T) };
  o.loc = T(document.querySelector('.cab-detail__location, .e-permits-page-header__location, [class*=location]'));
  o.actions = [...document.querySelectorAll('main button, main a.btn')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return r.top + scrollY < 400 && b.closest('[class*=header], [class*=actions]'); }).map(b => ({ t: T(b), cls: b.className.toString().slice(0,80), icons: [...b.querySelectorAll('use')].map(u => (u.getAttribute('href')||'').split('#')[1]) }));
  o.meta = [...document.querySelectorAll('[class*=meta] dt, [class*=__meta-item], [class*=meta-item]')].filter(vis).slice(0,8).map(e => T(e)).slice(0,8);
  o.alert = T(document.querySelector('.cab-alert, [class*=alert-card], .alert-card'))?.slice(0,300);
  o.dialog = [...document.querySelectorAll('[role=dialog], dialog[open], .modal.show')].filter(vis).map(d => T(d).slice(0, 500));
  o.main = T(document.querySelector('main')).slice(0, 1200);
  return o;
})()`;
for (const s of states) for (const w of widths) { await c.open(s, w); out[s + "@" + w] = await c.ev(EXPR); }
c.close(); fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1)); console.log("ok");
