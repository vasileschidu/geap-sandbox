// Seed for the eKYC back office prototype (deterministic). Run: node tools/ekyc/seed-sessions.mjs data/ekyc-sessions.json
import fs from "node:fs";

let seed = 20261013;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const add = (d, s) => new Date(d.getTime() + s * 1000);
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
const r2 = (x) => Math.round(x * 100) / 100;

const NOW = new Date(2026, 9, 13, 14, 52, 0);

const clients = [
  { id: "orange-selfcare", name: "Orange Self-Care", org: "Orange Moldova SA" },
  { id: "maib-app", name: "MAIB App", org: "maib SA" },
  { id: "micb-web", name: "MICB Web Onboarding", org: "Moldindconbank SA" },
  { id: "mpay-gov", name: "MPay — servicii publice", org: "Agenția de Guvernare Electronică" },
  { id: "moldcell-app", name: "Moldcell App", org: "Moldcell SA" },
  { id: "victoriabank-online", name: "Victoriabank Online", org: "Victoriabank SA" },
  { id: "asito-online", name: "Asito Online", org: "Asito SA" },
  { id: "iute-credit", name: "Iute Credit", org: "Iute Credit Moldova SRL" }
];

const STEPS = {
  document_scan: { label: "Scanare document", provider: "Regula Vision — Document AI", fallback: "Veriff", threshold: 0.65 },
  nfc_chip: { label: "Citire cip NFC", provider: "Regula — NFC eMRTD", threshold: 0.9 },
  liveness: { label: "Detecție liveness", provider: "iProov — Liveness", threshold: 0.75 },
  face_match: { label: "Potrivire facială", provider: "FaceTec — 3D Face Match", fallback: "Innovatrics DOT", threshold: 0.75 },
  phone_verification: { label: "Verificare telefon", provider: "Vonage Verify — SMS OTP", threshold: 0.5 },
  registry_check: { label: "Verificare în RSP", provider: "ASP — Registrul de stat al populației", threshold: 0.9 }
};
const WEIGHTS = { document_scan: 0.3, nfc_chip: 0.2, liveness: 0.25, face_match: 0.35, phone_verification: 0.05, registry_check: 0.1 };

const useCases = [
  { code: "TELCO_SIM_SUBSTANTIAL", name: "Activare SIM prepaid", ial: "Substanțial", clients: ["orange-selfcare", "moldcell-app"], steps: ["document_scan", "liveness", "face_match", "phone_verification"], optional: ["phone_verification"], scoring: { name: "Standard telecom", accept: 0.8, reject: 0.45, minConfidence: 0.6 } },
  { code: "BANK_ONBOARDING_HIGH", name: "Onboarding bancar la distanță", ial: "Ridicat", clients: ["maib-app", "micb-web", "victoriabank-online"], steps: ["document_scan", "nfc_chip", "liveness", "face_match", "registry_check"], optional: [], scoring: { name: "Standard bancar — deschidere cont", accept: 0.85, reject: 0.45, minConfidence: 0.6 } },
  { code: "KYC_REFRESH_LOW", name: "Reverificare periodică (KYC refresh)", ial: "Scăzut", clients: ["maib-app", "victoriabank-online", "orange-selfcare"], steps: ["liveness", "face_match"], optional: [], scoring: { name: "Reverificare simplă", accept: 0.75, reject: 0.4, minConfidence: 0.5 } },
  { code: "GOV_SERVICES_HIGH", name: "Acces la servicii publice", ial: "Ridicat", clients: ["mpay-gov"], steps: ["document_scan", "nfc_chip", "liveness", "face_match"], optional: [], scoring: { name: "Servicii publice — nivel ridicat", accept: 0.88, reject: 0.5, minConfidence: 0.7 } },
  { code: "INSURANCE_ONBOARDING_SUBST", name: "Onboarding asigurări", ial: "Substanțial", clients: ["asito-online"], steps: ["document_scan", "liveness", "face_match"], optional: [], scoring: { name: "Asigurări — standard", accept: 0.8, reject: 0.45, minConfidence: 0.6 } },
  { code: "CREDIT_ONLINE_SUBST", name: "Credit online", ial: "Substanțial", clients: ["iute-credit", "micb-web"], steps: ["document_scan", "liveness", "face_match", "registry_check"], optional: [], scoring: { name: "Creditare — standard", accept: 0.82, reject: 0.45, minConfidence: 0.6 } }
];

const devices = [
  { type: "Telefon", platform: "Android", model: "Samsung Galaxy A54", os: "Android 14", app: "3.12.0" },
  { type: "Telefon", platform: "iOS", model: "iPhone 14", os: "iOS 18.2", app: "4.2.1" },
  { type: "Tabletă", platform: "iOS", model: "iPad Air (M2)", os: "iPadOS 18.1", app: "4.2.1" },
  { type: "Desktop", platform: "Web", model: "Chrome 129 · Windows 11", os: "Windows 11", app: "SDK Web 2.4.0" },
  { type: "Telefon", platform: "Android", model: "Xiaomi Redmi Note 13", os: "Android 14", app: "3.12.0" },
  { type: "Telefon", platform: "iOS", model: "iPhone 12", os: "iOS 17.6", app: "4.1.8" }
];
const ip = () => `${pick([89, 92, 178, 188, 195])}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}`;
const deviceRecord = (at) => {
  if (rnd() < 0.07) return null; // „fără date dispozitiv”
  const d = pick(devices);
  return { ...d, integrity: rnd() < 0.9 ? "Integritate OK" : "Integritate compromisă", ip: ip(), syncedAt: iso(add(at, 20)) };
};
const ucFor = () => pick(useCases);
const clientFor = (uc) => { const id = pick(uc.clients); return clients.find((c) => c.id === id); };

let nr = 48190;
const steps = (uc, start, upto, { failAt = -1, scoreBias = 0 } = {}) => {
  let t = add(start, 30 + Math.floor(rnd() * 60));
  return uc.steps.map((code, i) => {
    const def = STEPS[code];
    const step = { code, label: def.label, provider: def.provider, threshold: def.threshold, optional: uc.optional.includes(code), weight: WEIGHTS[code] };
    if (def.fallback) step.fallback = def.fallback;
    if (i < upto) {
      t = add(t, 40 + Math.floor(rnd() * 200));
      const failed = i === failAt;
      step.status = failed ? "failed" : "done";
      step.score = r2(failed ? def.threshold - 0.1 - rnd() * 0.2 : Math.min(0.99, def.threshold + 0.08 + rnd() * 0.2 + scoreBias));
      step.completedAt = iso(t);
    } else if (i === upto && failAt < 0) step.status = "current";
    else step.status = "pending";
    return step;
  });
};

const events = (s, list) => list.map(([at, type, status, detail, user]) => ({ at, type, status, detail, user: user || "Platforma eKYC" })).sort((a, b) => (a.at < b.at ? 1 : -1));

/* ---------- active ---------- */
const ACTIVE_STATUS = [
  ["În desfășurare", 14], ["Așteaptă utilizatorul", 8], ["Așteaptă furnizorul", 7], ["În revizie manuală", 4], ["Inițiată", 5]
];
const active = [];
for (const [status, count] of ACTIVE_STATUS) {
  for (let k = 0; k < count; k += 1) {
    const uc = ucFor();
    const client = clientFor(uc);
    const start = add(NOW, -(60 + Math.floor(rnd() * 3900)));
    const upto = status === "Inițiată" ? 0 : status === "În revizie manuală" ? uc.steps.length : Math.min(uc.steps.length - 1, 1 + Math.floor(rnd() * (uc.steps.length - 1)));
    const st = steps(uc, start, upto);
    if (status === "În revizie manuală") st.forEach((x) => { x.status = "done"; });
    const last = st.filter((x) => x.completedAt).map((x) => x.completedAt).sort().pop();
    const lastActivity = status === "Inițiată" ? iso(add(start, 5)) : iso(add(new Date(last || start), 20 + Math.floor(rnd() * 120)));
    const id = `KYC-${nr += 1}`;
    const s = {
      id, correlationId: `${hex(8)}-${hex(5)}`, clientId: client.id, useCaseCode: uc.code, status, ial: uc.ial,
      startedAt: iso(start), lastActivityAt: lastActivity > iso(NOW) ? iso(add(NOW, -30)) : lastActivity, flowVersion: `v${pick(["4.1", "4.2", "3.9"])}`,
      steps: st, device: status === "Inițiată" ? null : deviceRecord(start)
    };
    const ev = [[s.startedAt, "Sesiune inițiată", "Reușit", `${client.name} · ${uc.code}`]];
    st.filter((x) => x.completedAt).forEach((x) => ev.push([x.completedAt, `Pas finalizat: ${x.label}`, "Reușit", `${x.provider} · scor ${x.score.toFixed(2).replace(".", ",")}`]));
    if (s.device) ev.push([s.device.syncedAt, "Dispozitiv înregistrat", "Reușit", `${s.device.model} · ${s.device.os}`]);
    if (status === "Așteaptă furnizorul") ev.push([s.lastActivityAt, "Cerere trimisă furnizorului", "În așteptare", st.find((x) => x.status === "current")?.provider || ""]);
    if (status === "În revizie manuală") ev.push([s.lastActivityAt, "Trimisă în revizie manuală", "În așteptare", "Scorul ponderat este între pragul de respingere și cel de acceptare."]);
    s.events = events(s, ev);
    active.push(s);
  }
}

/* ---------- historical ---------- */
const history = [];
const HIST = [["Acceptat", 62], ["Respins", 18], ["Revizuire manuală", 12], ["Abandonată", 10], ["Expirată", 8], ["Eroare", 6]];
const OPERATORS = ["Elena Ciobanu", "Mihai Rotaru", "Ana Grosu"];
for (const [kind, count] of HIST) {
  for (let k = 0; k < count; k += 1) {
    const uc = ucFor();
    const client = clientFor(uc);
    const daysAgo = Math.floor(rnd() * rnd() * 32);
    const start = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 8 + Math.floor(rnd() * 12), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
    if (start > NOW) start.setHours(start.getHours() - 6);
    const finished = ["Acceptat", "Respins", "Revizuire manuală"].includes(kind);
    const failAt = kind === "Respins" && rnd() < 0.6 ? Math.floor(rnd() * uc.steps.length) : -1;
    const upto = finished ? (failAt >= 0 ? failAt + 1 : uc.steps.length) : kind === "Eroare" ? Math.floor(rnd() * uc.steps.length) : Math.floor(rnd() * (uc.steps.length));
    let st = steps(uc, start, upto, { failAt, scoreBias: kind === "Acceptat" ? 0.05 : kind === "Respins" ? -0.2 : -0.08 });
    st = st.map((x) => (x.status === "current" ? { ...x, status: kind === "Eroare" ? "failed" : "pending" } : x));
    if (kind === "Eroare") { const c = st.find((x) => x.status === "failed"); if (c) { delete c.score; c.error = "Furnizorul nu a răspuns după 3 încercări (timeout 30 s)."; c.completedAt = iso(add(start, 400)); } }
    const lastStep = st.filter((x) => x.completedAt).map((x) => x.completedAt).sort().pop();
    const end = kind === "Expirată" ? add(start, 30 * 60) : add(new Date(lastStep || start), 30 + Math.floor(rnd() * 90));
    const done = st.filter((x) => x.status === "done" || (x.status === "failed" && x.score != null));
    const totalW = done.reduce((a, x) => a + x.weight, 0) || 1;
    let finalScore = done.length ? r2(done.reduce((a, x) => a + x.score * x.weight, 0) / totalW) : null;
    if (kind === "Acceptat") finalScore = Math.max(finalScore, uc.scoring.accept + 0.01 + r2(rnd() * 0.08));
    if (kind === "Revizuire manuală") finalScore = r2(uc.scoring.reject + 0.05 + rnd() * (uc.scoring.accept - uc.scoring.reject - 0.1));
    if (kind === "Respins" && finalScore != null) finalScore = Math.min(finalScore, uc.scoring.reject - 0.02);
    finalScore = finalScore == null || !finished ? null : r2(Math.min(0.99, finalScore));
    /* keep the breakdown honest: the step scores average to the final score */
    if (finalScore != null && done.length) {
      const avg = done.reduce((a, x) => a + x.score * x.weight, 0) / totalW;
      if (Math.abs(avg - finalScore) > 0.005) done.forEach((x) => { x.score = r2(Math.min(0.99, x.score * finalScore / avg)); });
    }
    const status = finished ? "Finalizată" : kind;
    const decision = finished ? kind : "Fără decizie";
    const id = `KYC-${nr - 900 - history.length * 3}`;
    const s = {
      id, correlationId: `${hex(8)}-${hex(5)}`, clientId: client.id, useCaseCode: uc.code, status, decision, ial: uc.ial,
      startedAt: iso(start), completedAt: iso(end), durationSeconds: Math.round((end - start) / 1000), finalScore,
      flowVersion: `v${pick(["4.1", "4.2", "3.9"])}`, steps: st, device: deviceRecord(start),
      scoring: { ...uc.scoring, aggregation: "Medie ponderată" },
      job: finished || kind === "Eroare" ? { id: `job_${hex(8)}`, worker: `wrk-eu-0${1 + Math.floor(rnd() * 4)}`, startedAt: iso(add(start, 15)), completedAt: iso(end), attempts: kind === "Eroare" ? 3 : 1 + (rnd() < 0.15 ? 1 : 0) } : null
    };
    if (kind === "Revizuire manuală") s.review = { by: pick(OPERATORS), state: rnd() < 0.5 ? "În așteptare" : "Preluată" };
    const ev = [[s.startedAt, "Sesiune inițiată", "Reușit", `${client.name} · ${uc.code}`]];
    st.filter((x) => x.completedAt).forEach((x) => ev.push([x.completedAt, `Pas ${x.status === "failed" ? "eșuat" : "finalizat"}: ${x.label}`, x.status === "failed" ? "Eșuat" : "Reușit", x.error || `${x.provider} · scor ${x.score.toFixed(2).replace(".", ",")}`]));
    const endEv = {
      Acceptat: ["Decizie: Acceptat", "Reușit", `Scor final ${finalScore?.toFixed(2).replace(".", ",")} ≥ prag de acceptare ${uc.scoring.accept.toFixed(2).replace(".", ",")}`],
      Respins: ["Decizie: Respins", "Eșuat", `Scor final ${finalScore?.toFixed(2).replace(".", ",") ?? "—"} sub pragul de respingere ${uc.scoring.reject.toFixed(2).replace(".", ",")}`],
      "Revizuire manuală": ["Trimisă în revizie manuală", "În așteptare", "Scorul final este între pragurile de respingere și de acceptare."],
      "Abandonată": ["Sesiune abandonată", "Eșuat", "Utilizatorul a închis fluxul înainte de ultimul pas."],
      "Expirată": ["Sesiune expirată", "Eșuat", "Fără activitate 30 de minute (parametrul session.ttl)."],
      Eroare: ["Eroare la verificare", "Eșuat", "Jobul de verificare a eșuat după 3 încercări."]
    }[kind];
    ev.push([s.completedAt, ...endEv]);
    s.events = events(s, ev);
    history.push(s);
  }
}

const alerts = [
  { id: "al-1", severity: "Critică", title: "Furnizor indisponibil: Vonage Verify — SMS OTP", text: "8 verificări de disponibilitate eșuate consecutiv. Pasul „Verificare telefon” este omis în TELCO_SIM_SUBSTANTIAL.", at: iso(add(NOW, -11 * 60)), link: "Deschide furnizorul" },
  { id: "al-2", severity: "Avertisment", title: "Furnizor degradat: FaceTec — 3D Face Match", text: "Latența p95 a depășit 4,2 s față de pragul de 2,5 s în ultimele 30 de minute.", at: iso(add(NOW, -44 * 60)), link: "Deschide furnizorul" },
  { id: "al-3", severity: "Avertisment", title: "Rată de respingere peste prag — MICB Web Onboarding", text: "38% respingeri în ultima oră, peste pragul configurat de 35% (alerts.rejection.rate.threshold).", at: iso(add(NOW, -50 * 60)) },
  { id: "al-4", severity: "Informativ", title: "Flux fără pași configurați: Verificare comerciant (pilot)", text: "Cazul de utilizare MERCHANT_PILOT are 0 pași. Nu poate fi rulat de niciun client.", at: iso(add(NOW, -3 * 3600)) },
  { id: "al-5", severity: "Informativ", title: "Versiuni SDK ieșite din suport încă în uz", text: "3.9.4 (iOS) și 2.3.0 (Web) au generat 41 de sesiuni în ultimele 7 zile.", at: iso(add(NOW, -5 * 3600)) }
];

const providers = [
  { name: "Regula Vision — Document AI", state: "Operațional", latency: 1.1 },
  { name: "Regula — NFC eMRTD", state: "Operațional", latency: 0.8 },
  { name: "iProov — Liveness", state: "Operațional", latency: 1.6 },
  { name: "FaceTec — 3D Face Match", state: "Degradat", latency: 4.2 },
  { name: "Vonage Verify — SMS OTP", state: "Indisponibil", latency: null },
  { name: "ASP — Registrul de stat al populației", state: "Operațional", latency: 0.6 }
];

const out = { now: iso(NOW), clients, useCases: useCases.map(({ clients: c, ...u }) => ({ ...u, clients: c })), providers, alerts, active, history };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("active", active.length, "history", history.length);
