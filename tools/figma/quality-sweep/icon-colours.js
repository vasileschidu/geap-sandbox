// Quality sweep · Ghișeu (2026-10-16, user feedback 11877:26425 / 11876:26272) — icon colours.
// Root cause: raw icons were swapped to library icon instances (swapComponent / importComponentByKeyAsync) that bring the
// icon's DEFAULT fill (icon/default ≈ #121212); the colour of the context (white on a filled avatar / primary button, brand on
// links, tertiary for ⓘ, tone colours in notices / toasts) was never re-applied.
// ICONS(ROOT_IDS, OPT):
//   nested  icon instance (name „NN/…”) inside another instance → expected = the slot's default in the governing variant
//           (node id = last segment of the icon's id, i.e. the icon in the parent main) → resolved vector fill compared; a
//           mismatch is RESET by copying the main's paint (with its variable binding) — never a hand-picked colour
//   loose   icon instance not inside an instance → grouped by context (parent chain) + resolved colour for the code check;
//           OPT.set = [{ id, token }] binds the vector fills to a colour variable (key) measured from the code
// OPT.dry → report only.
const ICONS = async (ROOTS, OPT) => {
  OPT = OPT || {}; figma.skipInvisibleInstanceChildren = false;
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  const res = async (node, p) => { if (!p || p.type !== "SOLID") return null; let c = p.color; const b = p.boundVariables && p.boundVariables.color; if (b) { const v = await figma.variables.getVariableByIdAsync(b.id); if (v) c = v.resolveForConsumer(node).value; } return hex(c); };
  const vecs = (n) => n.findAll((k) => (k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION" || k.type === "ELLIPSE" || k.type === "RECTANGLE") && Array.isArray(k.fills) && k.fills.length && k.visible !== false);
  const out = { nested: 0, reset: 0, loose: {}, err: [] };
  for (const rid of ROOTS) {
    const root = await figma.getNodeByIdAsync(rid);
    for (const ic of root.findAll((n) => n.type === "INSTANCE" && /^\d+\//.test(n.name) && n.visible !== false)) {
      const nested = ic.id.startsWith("I");
      const vs = vecs(ic); if (!vs.length) continue;
      if (nested) {
        out.nested++;
        const slot = await figma.getNodeByIdAsync(ic.id.split(";").pop()); if (!slot || !("findAll" in slot)) continue;
        const sv = vecs(slot); if (!sv.length) continue;
        const want = await res(sv[0], sv[0].fills[0]);
        for (const v of vs) { const got = await res(v, v.fills[0]); if (got && want && got !== want) { if (!OPT.dry) { try { v.fills = sv[0].fills; out.reset++; } catch (e) { out.err.push(ic.id); } } else out.reset++; } }
      } else {
        const got = await res(vs[0], vs[0].fills[0]);
        const ctx = [ic.parent.name, ic.parent.parent && ic.parent.parent.name].map((s) => String(s).slice(0, 22)).join(" < ");
        const k = `${ic.name} @ ${ctx} = ${got}`; (out.loose[k] = out.loose[k] || []).push(ic.id);
      }
    }
  }
  out.loose = Object.entries(out.loose).map(([k, v]) => `${v.length}× ${k} [${v.slice(0, 2).join(",")}]`);
  return out;
};
