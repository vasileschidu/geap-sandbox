/* Preview (records-v2): same act, two renderings of the data modal. Left = grids as tables (today);
   right = grids as records (act.gridDisplay = "records"). Switch (?act=ozon|radio|farmacie|forestier): the first is the
   real rap-0015, the others are demo acts rebuilt from their PDFs (act-records-preview-data.js). */
(async () => {
  const toneOf = { Valabil: "success", Suspendat: "warning", Expirat: "danger", Retras: "danger", Anulat: "danger" };
  const data = await (await fetch("../data/rap-evo.json?v=act-fields-v1")).json();
  const find = (node) => {
    if (Array.isArray(node)) { for (const part of node) { const hit = find(part); if (hit) return hit; } return null; }
    if (node && typeof node === "object") {
      if (node.id === "rap-0015" && node.permit) return node;
      for (const part of Object.values(node)) { const hit = find(part); if (hit) return hit; }
    }
    return null;
  };
  const record = find(data);
  const profile = record.profile;
  const ozonRequest = {
    title: "Date solicitare",
    fields: [
      { label: "Tipul solicitării", value: "Autorizare nouă" },
      {
        label: "Genuri de activitate (CAEM)",
        columns: ["Activitatea", "Cod CAEM Rev. 2", "Tip activitate", "Începând cu"],
        rows: [
          ["Comerț cu amănuntul al produselor frigorifice", "47.11", "Principală", "12 august 2026"],
          ["Instalarea echipamentelor de refrigerare", "43.22", "Secundară", "12 august 2026"],
          ["Repararea echipamentelor de refrigerare", "33.12", "Secundară", "1 septembrie 2026"]
        ]
      },
      { label: "Numărul cererii", value: "S-2026-004871" },
      { label: "Data depunerii", value: "30 iulie 2026" },
      { label: "Solicitant", value: "ECOFRIG TEHNOLOGII S.R.L." },
      { label: "Reprezentant", value: "Ion C. (IDNP mascat)" }
    ]
  };
  const ozon = {
    label: "Substanțe ozon (rap-0015)",
    act: {
      id: record.id,
      name: record.permit.name,
      number: record.permit.number,
      status: record.status,
      tone: toneOf[record.status],
      authority: record.authority.name,
      office: profile.office,
      beneficiary: { name: record.beneficiary.name, person: false, idType: record.beneficiary.identifierType, id: record.beneficiary.identifier },
      issuedDate: profile.issuedDate,
      validFrom: profile.validFrom,
      validUntil: profile.validUntil
    },
    groups: [ozonRequest, ...profile.document.sections]
  };
  const acts = { ozon, ...window.RRP_ACTS };
  const shortLabel = { ozon: "Substanțe ozon", radio: "Emițătoare radio", farmacie: "Licență farmaceutică", forestier: "Tăieri forestiere" };
  const params = new URLSearchParams(location.search);
  let current = acts[params.get("act") || params.get("state")] ? (params.get("act") || params.get("state")) : "ozon";

  const render = () => {
    const picked = acts[current];
    document.querySelectorAll("[data-rrp]").forEach((stage) => {
      const view = window.GEAPActView.create({});
      stage.innerHTML = view.dataPreviewHtml({
        ...picked.act,
        groups: window.GEAPActView.normalizeFields(picked.groups),
        gridDisplay: stage.dataset.rrp === "records" ? "records" : null
      });
      stage.querySelector(".modal").removeAttribute("aria-labelledby");
    });
  };

  const switchHost = document.querySelector("[data-rrp-switch]");
  switchHost.innerHTML = window.GEAPViewSwitch.html({
    key: "rrp-act",
    label: "Act afișat",
    value: current,
    items: Object.keys(acts).map((key) => [key, shortLabel[key]])
  }).replace("segmented-control--compact ", "");
  window.GEAPViewSwitch.on("rrp-act", (value) => {
    current = value;
    const next = new URL(location.href);
    next.searchParams.set("act", value);
    history.replaceState(null, "", next);
    render();
  });
  render();
})();
