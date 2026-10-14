// Read-only: image fills inside blocks. Icon-sized (<=48) vs larger.
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
figma.skipInvisibleInstanceChildren = true;
const inBlock = (n) => { for (let p = n.parent; p && p.type !== "PAGE"; p = p.parent) if (/^Block · |^Bloc /.test(p.name)) return p.name.slice(0, 30); return null; };
const icons = {}, big = {}; let ni = 0, nb = 0, inInst = 0;
for (const n of page.findAll((x) => "fills" in x && Array.isArray(x.fills) && x.fills.some((f) => f.type === "IMAGE" && f.visible !== false))) {
  const b = inBlock(n); if (!b) continue;
  const h = n.fills.find((f) => f.type === "IMAGE").imageHash?.slice(0, 4);
  const iconSized = n.width <= 48 && n.height <= 48;
  if (n.id.includes(";")) inInst++;
  const key = `${h} ${Math.round(n.width)}x${Math.round(n.height)}`;
  if (iconSized) { ni++; (icons[key] ||= []).push(n.id); } else { nb++; (big[key] ||= []).push(n.id); }
}
return { page: page.name, icons: ni, big: nb, inInst, iconGroups: Object.fromEntries(Object.entries(icons).map(([k, v]) => [k, v.length + " e.g. " + v.slice(0, 2).join(",")])), bigGroups: Object.fromEntries(Object.entries(big).map(([k, v]) => [k, v.length + " e.g. " + v[0]])) };
