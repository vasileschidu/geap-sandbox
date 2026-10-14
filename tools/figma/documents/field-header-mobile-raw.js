// Document field header on phones — CAPTURED (raw) variant, FOD guest lane (code ≤720, e9858260).
// Params (prepend): const SECTION_ID = "756:25760";
// Field row = HORIZONTAL [text column, „btn · Adaugă fișier” / „Încarcă”] → VERTICAL, gap 16, both FILL (button full width).
// Label row „Text” = [label TEXT, star frame „obligatoriu” | „tag · Opțional”]; the capture stacked them VERTICALLY when the
// label wrapped (star / tag alone on a line) → HORIZONTAL: one line → label HUG + marker right after (centre);
// wraps → label FILL + marker bottom-aligned on the last line (Figma has no inline icon after wrapped text).
const sec = await figma.getNodeByIdAsync(SECTION_ID); let pg = sec; while (pg.type !== "PAGE") pg = pg.parent; await figma.setCurrentPageAsync(pg);
figma.skipInvisibleInstanceChildren = false;
for (const st of ["Regular", "Medium", "SemiBold"]) { try { await figma.loadFontAsync({ family: "Onest", style: st }); } catch (e) {} }
const screens = sec.findAll((n) => n.type === "FRAME" && Math.round(n.width) === 375 && /^Mobil/.test(n.name));
const out = [];
for (const s of screens) {
  let rows = 0, one = 0, wrap = 0;
  for (const b of s.findAll((n) => n.type === "INSTANCE" && /^btn · (Adaugă fișier|Încarcă)/.test(n.name))) {
    const row = b.parent; if (row.layoutMode !== "HORIZONTAL") { if (row.layoutMode === "VERTICAL" && row.parent.layoutMode === "VERTICAL") row.layoutSizingHorizontal = "FILL"; continue; }
    const col = row.children.find((c) => c !== b && c.type === "FRAME");
    row.layoutMode = "VERTICAL"; row.itemSpacing = 16; row.counterAxisAlignItems = "MIN"; row.primaryAxisAlignItems = "MIN";
    if (col) { col.layoutSizingHorizontal = "FILL"; col.layoutSizingVertical = "HUG";
      // the description kept its captured 185px width → FILL the column (frames) and its text (HEIGHT)
      for (const k of col.findAll((n) => n.type === "FRAME" && n.name === "Paragraph")) { k.layoutSizingHorizontal = "FILL"; for (const t of k.children) if (t.type === "TEXT") { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; } } }
    row.layoutSizingHorizontal = "FILL"; // HORIZONTAL → VERTICAL swaps the axes: the row's width became HUG (141 px)
    b.layoutSizingHorizontal = "FILL"; row.layoutSizingVertical = "HUG"; rows++;
  }
  for (const t of s.findAll((n) => n.type === "FRAME" && n.name === "Text" && n.children.some((c) => c.type === "TEXT") && n.children.some((c) => c.name === "obligatoriu" || /^tag · Opțional/.test(c.name)))) {
    const lab = t.children.find((c) => c.type === "TEXT"); const mk = t.children.find((c) => c !== lab && c.visible);
    t.layoutMode = "HORIZONTAL"; t.itemSpacing = mk.type === "INSTANCE" ? 8 : 6; t.layoutSizingHorizontal = "FILL"; t.layoutSizingVertical = "HUG"; t.primaryAxisAlignItems = "MIN";
    lab.layoutSizingHorizontal = "HUG"; lab.textAutoResize = "WIDTH_AND_HEIGHT";
    const room = t.parent.width - t.parent.paddingLeft - t.parent.paddingRight; // t.width can be stale right after FIXED → FILL
    if (lab.width + t.itemSpacing + mk.width <= room + 0.5) { t.counterAxisAlignItems = "CENTER"; one++; }
    else { lab.layoutSizingHorizontal = "FILL"; lab.textAutoResize = "HEIGHT"; t.counterAxisAlignItems = "MAX"; wrap++; }
  }
  if (rows || one || wrap) out.push(s.id + " " + s.name.slice(0, 16) + " rows" + rows + " one" + one + " wrap" + wrap + " h" + Math.round(s.height));
}
return out;
