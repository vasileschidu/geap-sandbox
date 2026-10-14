// Document field header on phones (code ≤720, e9858260): the red star stays with the label's last line, the „Opțional”
// tag follows the label, „Adaugă fișier” / „Încarcă” goes full width under label + description.
// Params (prepend): const SCREENS = ["6226:42630", …];  (mobile screen frames, 375 wide)
// The header is a library text-input with its Input hidden (Label + 👁️ Mandatory Star / Badge tag). Figma cannot put an icon
// after the last word of WRAPPED text, so: label fits on one line → Label text HUG + Input Label HUG (star / tag right after
// the text, as in code); label wraps → text FILL and Input Label + Label row counterAxis MAX (star / tag on the last line,
// at the label column's right edge = the code's 18px star reserve). Instance overrides used: sizing + counterAxisAlignItems.
figma.skipInvisibleInstanceChildren = false;
for (const st of ["Regular", "Medium", "SemiBold"]) { try { await figma.loadFontAsync({ family: "Onest", style: st }); } catch (e) {} }
const out = [];
for (const sid of SCREENS) {
  const s = await figma.getNodeByIdAsync(sid); if (!s) { out.push(sid + " missing"); continue; }
  let one = 0, wrap = 0, btn = 0;
  const heads = s.findAll((n) => n.type === "INSTANCE" && n.name === "text-input" && n.children.find((c) => c.name === "Input" && !c.visible) && n.children.find((c) => c.name === "Label" && c.visible));
  for (const h of heads) {
    const lf = h.children.find((c) => c.name === "Label"); const il = lf.children.find((c) => c.name === "Input Label");
    const lab = il.children.find((c) => c.type === "TEXT"); const star = il.children.find((c) => c.type === "INSTANCE" && c.visible);
    const tag = lf.children.find((c) => c.type === "INSTANCE" && c.visible);
    const room = lf.width - (star ? star.width + il.itemSpacing : 0) - (tag ? tag.width + lf.itemSpacing : 0);
    lab.layoutSizingHorizontal = "HUG";
    if (lab.width <= room + 0.5) { il.layoutSizingHorizontal = "HUG"; il.counterAxisAlignItems = "CENTER"; lf.counterAxisAlignItems = "CENTER"; one++; }
    else { il.layoutSizingHorizontal = "FILL"; lab.layoutSizingHorizontal = "FILL"; lab.textAutoResize = "HEIGHT"; il.counterAxisAlignItems = "MAX"; lf.counterAxisAlignItems = "MAX"; wrap++; }
    // Known limit: the marker sits bottom-aligned → its centre is (24 − 12) / 2 = 6 px under the last line's centre (tag: 2).
    // Tried and rejected: bottom padding on Input Label (moves the 48px text too); shortening the label box (an instance
    // text with textAutoResize NONE snaps back to the main's height, resize() is ignored).
  }
  for (const b of s.findAll((n) => n.type === "INSTANCE" && /^button/.test(n.name) && n.findOne((t) => t.type === "TEXT" && /^(Adaugă fișier|Încarcă)/.test(t.characters)))) {
    if (b.parent.layoutMode === "VERTICAL" && b.layoutSizingHorizontal !== "FILL") { b.layoutSizingHorizontal = "FILL"; btn++; }
  }
  out.push(sid + " one" + one + " wrap" + wrap + " btn" + btn + " h" + Math.round(s.height));
}
return out;
