import { openChrome } from "/Users/user/Desktop/e-permits-vibe/tools/figma/cabinet/cdp.mjs";
const c = await openChrome();
await c.open(process.argv[2], +(process.argv[3]||1440));
const out = await c.ev(process.argv[4]);
console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1));
c.close();
