// FO Finalizare „Certificatul Constatator” card on phones (code ≤720 `.e-permits-fo-finish-doc`, e9858260):
// grid 24 · 1fr, gaps 12, padding 12, copy padding-top 2, „Vezi documentul” in column 2 under the text (start, hug, btn-sm 32).
// Params (prepend): const CARDS = ["3686:54676", …]; const EYE = "<20/eye-open component id in this file>";
// Input = the captured raw card: VERTICAL Container [row(document-icon, text column), (hidden check), button full width].
figma.skipInvisibleInstanceChildren = false;
const out = [];
for (const id of CARDS) {
  const card = await figma.getNodeByIdAsync(id); if (!card) { out.push(id + " missing"); continue; }
  const h0 = Math.round(card.height);
  const col = card.children.find((c) => c.type === "FRAME" && c.layoutMode === "VERTICAL"); // Container
  const row = col && col.children.find((c) => c.type === "FRAME" && c.layoutMode === "HORIZONTAL");
  if (row) {
    const icon = row.children.find((c) => c.type === "INSTANCE"); const text = row.children.find((c) => c.type === "FRAME");
    card.insertChild(0, icon); col.insertChild(0, text); row.remove();
    text.layoutSizingHorizontal = "FILL"; text.layoutSizingVertical = "HUG"; // it was FILL in the old row → 20px gap
  }
  card.name = "Finalizare · document (mobil)"; col.name = "Coloană";
  card.layoutMode = "HORIZONTAL"; card.itemSpacing = 12; card.counterAxisAlignItems = "MIN";
  card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 12;
  col.layoutSizingHorizontal = "FILL"; col.layoutSizingVertical = "HUG"; col.itemSpacing = 12; col.paddingTop = 2; col.counterAxisAlignItems = "MIN";
  card.layoutSizingVertical = "HUG";
  const btn = col.children.find((c) => c.type === "INSTANCE" && /^button/.test(c.name));
  if (btn) {
    const P = (p) => Object.keys(btn.componentProperties).find((k) => k.startsWith(p));
    btn.setProperties({ [P("🎚️ Size")]: "Small" });
    btn.setProperties({ [P("🔄 Leading Icon: 16")]: EYE });
    btn.layoutSizingHorizontal = "HUG";
  }
  out.push(id + " " + h0 + "→" + Math.round(card.height));
}
return out;
