// Inner-shadow dividers → real strokes (2026-10-23, ghiseu-comments-fixes-v1).
// Captures (generate_figma_design) turn the code's `box-shadow: inset 0 -1px 0 var(--color-border-…)`
// into an INNER_SHADOW effect (offset ±1, radius 0, spread 0) — a fake 1 px divider. This finds them
// and (APPLY) replaces each one with a single-side stroke bound to border/base/default (bottom for y −1,
// top for y +1, right for x −1, left for x +1), stroke align INSIDE, strokesIncludedInLayout false →
// layout unchanged. The toolbar above a visible filter box (filter-bar-v2: the line moves under the box)
// loses the shadow without a stroke. Never touches other strokes / strokeAlign of other nodes.
// Run via use_figma; set APPLY. First run 2026-10-23: GEAP 98 (Ghișeu 95 + Process Designer 3 „Filtrare dosare”), Cabinet / EVO-WEB / FOD / eKYC 0. Skips nodes inside instances (fix the main component instead).
const APPLY = false;
const SKIP = /archive|arhiv|draft|ciorn|^-+$|^—|separator/i;
const isDivider = (e) => e.type === "INNER_SHADOW" && e.visible !== false && (e.radius || 0) === 0 && (e.spread || 0) === 0 &&
  ((Math.abs(e.offset.y) === 1 && e.offset.x === 0) || (Math.abs(e.offset.x) === 1 && e.offset.y === 0));
const inInstance = (n) => { for (let p = n.parent; p && p.type !== "PAGE"; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const hasVisibleFilterBoxAfter = (n) => {
  const p = n.parent; if (!p || !("children" in p)) return false; const i = p.children.indexOf(n);
  return p.children.slice(i + 1).some((s) => s.visible && /filter|filtr/i.test(s.name) && /bar|box|advanced|avansat/i.test(s.name));
};
let BORDER = null; // Foundations border/base/default (key 9fa253aa…); local copy first (eKYC / FOD keep local tokens)
const locals = await figma.variables.getLocalVariablesAsync("COLOR");
BORDER = locals.find((v) => v.name === "border/base/default") || null;
if (!BORDER) { try { BORDER = await figma.variables.importVariableByKeyAsync("9fa253aab4b44e39a049a0cbbd163e4c61e129b6"); } catch (e) { BORDER = null; } }
if (!BORDER) BORDER = await figma.variables.getVariableByIdAsync("VariableID:9fa253aab4b44e39a049a0cbbd163e4c61e129b6/1296:283"); // GEAP (key import fails there)
const res = { border: BORDER && BORDER.id, found: 0, fixed: 0, removed: 0, skippedInInstance: 0, groups: {}, ids: [] };
for (const page of figma.root.children) {
  if (SKIP.test(page.name)) continue;
  await page.loadAsync();
  const hits = page.findAll((n) => "effects" in n && Array.isArray(n.effects) && n.effects.some(isDivider));
  for (const n of hits) {
    if (inInstance(n)) { res.skippedInInstance++; continue; }
    res.found++;
    const e = n.effects.find(isDivider);
    const side = e.offset.y === -1 ? "bottom" : e.offset.y === 1 ? "top" : e.offset.x === -1 ? "right" : "left";
    const drop = side === "bottom" && hasVisibleFilterBoxAfter(n);
    const key = page.name.slice(0, 28) + " | " + n.type + " | " + n.name.slice(0, 30) + " | " + side + (drop ? " (drop)" : "") + (n.strokes && n.strokes.length ? " | HAS STROKE" : "");
    res.groups[key] = (res.groups[key] || 0) + 1;
    if (res.ids.length < 40) res.ids.push(n.id);
    if (!APPLY) continue;
    n.effects = n.effects.filter((x) => x !== e && !isDivider(x));
    if (drop) { res.removed++; continue; }
    if (n.strokes && n.strokes.length) { res.groups[key + " → effect removed, stroke kept"] = 1; continue; }
    if (!BORDER) throw new Error("no border/base/default variable");
    const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.851, g: 0.851, b: 0.851 } }, "color", BORDER);
    n.strokes = [paint];
    n.strokeAlign = "INSIDE";
    n.strokeTopWeight = side === "top" ? 1 : 0; n.strokeBottomWeight = side === "bottom" ? 1 : 0;
    n.strokeLeftWeight = side === "left" ? 1 : 0; n.strokeRightWeight = side === "right" ? 1 : 0;
    if ("strokesIncludedInLayout" in n) n.strokesIncludedInLayout = false;
    res.fixed++;
  }
}
return res;
