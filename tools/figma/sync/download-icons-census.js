// Read-only census of download / export / upload / external-link icon instances per page (use_figma).
// PAGES = array of page ids. Returns rows: page | icon | host | label → count + sample id.
// Host = nearest ancestor INSTANCE (button / menu item / row); label = first text in the host (or in the parent row).
const PAGES = __PAGES__;
const RE = /(^|\/)(download|page-download|circle-download|external-link|export|upload|arrow-down)\b|arrow-inbox|arrow-outbox|cloud-download/i;
const out = [];
for (const pid of PAGES) {
  const page = await figma.getNodeByIdAsync(pid);
  await figma.setCurrentPageAsync(page);
  const agg = {};
  const icons = page.findAllWithCriteria({ types: ["INSTANCE"] }).filter((n) => RE.test(n.name) && n.width <= 32);
  for (const ic of icons) {
    let host = ic.parent, hostInst = null;
    while (host && host.type !== "PAGE") { if (host.type === "INSTANCE") { hostInst = host; break; } host = host.parent; }
    let label = "";
    const scope = hostInst || ic.parent;
    if (scope) {
      const t = scope.findOne ? scope.findOne((n) => n.type === "TEXT" && n.visible && n.characters.trim()) : null;
      label = t ? t.characters.trim().slice(0, 40) : "";
      if (!label && scope.parent && scope.parent.findOne) { const t2 = scope.parent.findOne((n) => n.type === "TEXT" && n.visible && n.characters.trim()); label = t2 ? "~" + t2.characters.trim().slice(0, 40) : ""; }
    }
    let hostSet = "";
    if (hostInst) hostSet = hostInst.name.slice(0, 40);
    const k = [ic.name.slice(0, 40), hostSet, label].join(" | ");
    (agg[k] = agg[k] || { n: 0, id: ic.id }).n++;
  }
  for (const [k, v] of Object.entries(agg)) out.push(page.name.slice(0, 18) + " | " + k + " → " + v.n + " " + v.id);
}
return out;
