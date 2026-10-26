import { openChrome } from "/Users/user/Desktop/e-permits-vibe/tools/figma/cabinet/cdp.mjs";
import fs from "node:fs";
const c = await openChrome(); const out = {};
const EXPR = `(() => { const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top+scrollY), Math.round(b.width), Math.round(b.height)]; };
  const sk = [...document.querySelectorAll('.skeleton')].filter(e => e.getClientRects().length).map(e => [e.className.replace('skeleton ','').slice(0,60), ...r(e), getComputedStyle(e).borderRadius]);
  const rows = [...document.querySelectorAll('.cab-skeleton-row')].filter(e => e.getClientRects().length).slice(0,2).map(e => { const s = getComputedStyle(e); return [...r(e), s.padding, s.borderRadius, s.borderWidth, s.borderColor]; });
  const cards = [...document.querySelectorAll('.cab-skeleton-profile .e-permits-dosar-profil__card, .cab-skeleton-profile [class*=card]')].filter(e => e.getClientRects().length).map(e => r(e));
  const h1 = document.querySelector('h1'); const tb = document.querySelector('.cab-toolbar, [class*=toolbar]');
  return { sk: sk.slice(0,60), rows, cards, h1: h1 && h1.textContent.trim(), docH: document.documentElement.scrollHeight }; })()`;
for (const s of process.argv[2].split(",")) for (const w of [1440, 375]) { await c.open(s, w); out[s+"@"+w] = await c.ev(EXPR); }
c.close(); fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log("ok");
