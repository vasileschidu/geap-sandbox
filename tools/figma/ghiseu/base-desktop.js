// Ghișeu (2026-10-16) · base BO desktop screen (1440) for the „Dosare noi” list: clone of the W01 shell (gov bar ·
// Body = sidebar instance + Main [Shell header · Page]) with the Ghișeu sidebar component and the captured registry
// (`Section - Conținut principal` > Container) as the Page. Then run swap-workplace-registry.js on the page.
// Paste as use_figma code with CAP = capture root id, NAME = screen name; returns { screen, page }.
const CAP = "PUT:CAPTURE-ROOT"; const NAME = "PUT:NAME"; const X = 0, Y = 0;
figma.skipInvisibleInstanceChildren = false;
const g = (id) => figma.getNodeByIdAsync(id);
const page = await g("11589:327039"); await figma.setCurrentPageAsync(page);
const cap = await g(CAP);
const scr = (await g("11527:1206")).clone(); page.appendChild(scr); scr.x = X; scr.y = Y; scr.name = NAME;
const body = scr.children.find((c) => c.name === "Body"); const main = body.children.find((c) => c.name === "Main");
const sb = body.children.find((c) => c.type === "INSTANCE"); sb.swapComponent(await g("11595:241745")); sb.name = "Sidebar · Desk clerk"; try { sb.layoutSizingVertical = "FILL"; } catch (e) {}
const hdr = main.children.find((c) => c.name === "Shell header");
const tt = hdr.findOne((n) => n.type === "TEXT" && n.characters === "Fluxuri de lucru"); if (tt) { await figma.loadFontAsync(tt.fontName); tt.characters = "Dosare noi"; }
const old = main.children.find((c) => /^Page/.test(c.name)); const idx = main.children.indexOf(old); old.remove();
const sec = cap.findOne((n) => n.name === "Section - Conținut principal"); const content = sec.children[0];
main.insertChild(idx, content); content.name = "Page · Dosare noi"; content.layoutSizingHorizontal = "FILL"; content.layoutSizingVertical = "FILL";
cap.remove();
return { screen: scr.id, page: content.id, h: scr.height };
