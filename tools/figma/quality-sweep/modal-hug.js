// Quality sweep · Ghișeu (2026-10-16, user feedback on 11650:7061): small modals show ALL content (code: the modal grows
// with its content up to 24px from the viewport top / bottom; only beyond that the body scrolls).
// For every `Overlay`/`Container` (absolute, full-screen scrim) → `Dialog` in a block screen:
//   body (the FILL + clip child between header and footer) → HUG, Dialog → HUG; if Dialog > VIEW − 48 → FIXED VIEW − 48
//   and body FILL (= the code's scrolled state). Dialog re-centred in the 900 viewport at whole pixels (absolute inside
//   the scrim, constraints CENTER). Screen-root absolute layers that sat on the old dialog (open lists moved out of the
//   dialog, flow anchors) move by the same delta. OPT.dry → report only. Snapshot: shared plugin data qsweep/modalhug on the Dialog.
const MODAL_HUG = async (BLOCKS, OPT) => {
  OPT = OPT || {}; const VIEW = 900; const out = [];
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  for (const id of BLOCKS) {
    const b = await figma.getNodeByIdAsync(id); const scr = b.children.find((c) => /^Desktop · /.test(c.name)); if (!scr) continue;
    const ovs = scr.children.filter((c) => c.layoutPositioning === "ABSOLUTE" && c.width === scr.width && "children" in c);
    for (const ov of ovs) {
      const dlg = ov.children.find((c) => c.name === "Dialog"); if (!dlg) continue;
      const body = dlg.children.find((c) => c.layoutSizingVertical === "FILL" && c.clipsContent);
      const need = body ? body.children.filter((k) => k.visible && k.layoutPositioning !== "ABSOLUTE").reduce((s, k, i, a) => s + k.height + (i ? body.itemSpacing : 0), 0) + body.paddingTop + body.paddingBottom : null;
      const r = { b: b.name.slice(8), dlg: dlg.id, h: dlg.height, body: body ? body.height : null, need };
      const small = dlg.width < 1000;
      const hugged = body && body.layoutSizingVertical === "HUG";
      const centred = dlg.y === Math.round((VIEW - dlg.height) / 2);
      if (!body && !(OPT.all && small && dlg.layoutSizingVertical === "HUG" && !centred)) { r.ok = 1; out.push(r); continue; }
      if (body && need <= body.height + 0.5 && !(OPT.all && small && (!hugged || !centred))) { r.ok = 1; out.push(r); continue; }
      if (OPT.dry) { out.push(r); continue; }
      const old = { x: dlg.x, y: dlg.y, h: dlg.height, bodyH: body ? body.height : null, bodyV: body ? body.layoutSizingVertical : null, dlgV: dlg.layoutSizingVertical, abs: dlg.layoutPositioning };
      if (!dlg.getSharedPluginData("qsweep", "modalhug")) dlg.setSharedPluginData("qsweep", "modalhug", JSON.stringify(old));
      const ax = dlg.absoluteTransform[0][2], ay = dlg.absoluteTransform[1][2];
      if (dlg.width >= 1000) { // full-window sheet: keep its place, grow it to the content, grow the screen under it
        const gapB = scr.height - (dlg.absoluteTransform[1][2] - scr.absoluteTransform[1][2] + dlg.height);
        body.layoutSizingVertical = "HUG"; dlg.layoutSizingVertical = "HUG";
        const sb = scr.children.find((c) => c.name === "Body"); const delta = dlg.height - old.h;
        if (sb && delta > 0) sb.minHeight = (sb.minHeight || sb.height) + delta;
        for (const o of ovs) o.resize(o.width, scr.height);
        r.new = `sheet ${dlg.height} scr ${scr.height} gapB ${Math.round(gapB)}`; out.push(r); continue;
      }
      if (body) body.layoutSizingVertical = "HUG"; dlg.layoutSizingVertical = "HUG";
      if (body && dlg.height > VIEW - 48) { dlg.layoutSizingVertical = "FIXED"; dlg.resize(dlg.width, VIEW - 48); body.layoutSizingVertical = "FILL"; r.scroll = 1; }
      dlg.layoutPositioning = "ABSOLUTE"; dlg.x = Math.round((ov.width - dlg.width) / 2); dlg.y = Math.round((VIEW - dlg.height) / 2);
      dlg.constraints = { horizontal: "CENTER", vertical: "MIN" };
      const dy = dlg.absoluteTransform[1][2] - ay, dx = dlg.absoluteTransform[0][2] - ax;
      r.new = `${dlg.height} @${dlg.y}`; r.dy = dy;
      const sx = scr.absoluteTransform[0][2], sy = scr.absoluteTransform[1][2];
      for (const c of scr.children) {
        if (c === ov || c.layoutPositioning !== "ABSOLUTE") continue;
        const cx = c.absoluteTransform[0][2], cy = c.absoluteTransform[1][2];
        if (cx >= ax - 2 && cx <= ax + dlg.width + 2 && cy >= ay - 2 && cy <= ay + old.h + 2) { c.x += dx; c.y += dy; r.moved = (r.moved || []).concat(c.name.slice(0, 24)); }
      }
      out.push(r);
    }
  }
  return out;
};
