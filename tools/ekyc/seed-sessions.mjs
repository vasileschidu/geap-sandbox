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

/* each alert names what it is about (kind + ref) — the dashboard card opens the screen where
   it can be acted on (js/ekyc.js ALERT_TARGETS); the ids match data/ekyc-config.json */
const alerts = [
  { id: "al-1", severity: "Critică", kind: "provider", ref: "prv-vonage", title: "Furnizor indisponibil: Vonage Verify — SMS OTP", text: "8 verificări de disponibilitate eșuate consecutiv. Pasul „Verificare telefon” este omis în TELCO_SIM_SUBSTANTIAL.", at: iso(add(NOW, -11 * 60)) },
  { id: "al-2", severity: "Avertisment", kind: "provider", ref: "prv-facetec", title: "Furnizor degradat: FaceTec — 3D Face Match", text: "Latența p95 a depășit 4,2 s față de pragul de 2,5 s în ultimele 30 de minute.", at: iso(add(NOW, -44 * 60)) },
  { id: "al-3", severity: "Avertisment", kind: "rejection", ref: "micb-web", title: "Rată de respingere peste prag — MICB Web Onboarding", text: "22% respingeri în ultimele 7 zile (2 din 9 decizii), peste pragul de 20% configurat pentru client.", at: iso(add(NOW, -50 * 60)) },
  { id: "al-6", severity: "Avertisment", kind: "review-overdue", ref: "KYC-47073", title: "Revizie manuală peste termen: KYC-47073", text: "Termenul de 8 ore a expirat azi la 10:42, iar sesiunea este încă în lucru. Alte 2 sesiuni așteaptă alocarea.", at: iso(add(NOW, -4 * 3600 - 10 * 60)) },
  { id: "al-7", severity: "Avertisment", kind: "root-ca", ref: "ca-age-mtls-g1", title: "Certificat root CA expiră în 48 de zile: AGE Clients mTLS CA G1", text: "Valabil până la 30 noiembrie 2026. După expirare, clienții cu mTLS emis de G1 nu se mai pot conecta.", at: iso(add(NOW, -6 * 3600)) },
  { id: "al-4", severity: "Informativ", kind: "use-case", ref: "PENSION_CONFIRM_SUBST", title: "Flux fără pași configurați: Confirmarea identității pensionarilor", text: "Cazul de utilizare PENSION_CONFIRM_SUBST are 0 pași. Nu poate fi rulat de niciun client.", at: iso(add(NOW, -3 * 3600)) },
  { id: "al-5", severity: "Informativ", kind: "sdk", ref: "unsupported", title: "Versiuni SDK ieșite din suport încă în uz", text: "4.0.3 (iOS), 3.8.5 (Android) și 2.2.0 (Web) au generat 41 de sesiuni în ultimele 7 zile.", at: iso(add(NOW, -5 * 3600)) }
];

const providers = [
  { name: "Regula Vision — Document AI", state: "Operațional", latency: 1.1 },
  { name: "Regula — NFC eMRTD", state: "Operațional", latency: 0.8 },
  { name: "iProov — Liveness", state: "Operațional", latency: 1.6 },
  { name: "FaceTec — 3D Face Match", state: "Degradat", latency: 4.2 },
  { name: "Vonage Verify — SMS OTP", state: "Indisponibil", latency: null },
  { name: "ASP — Registrul de stat al populației", state: "Operațional", latency: 0.6 }
];

/* ---------- batch 2 (2026-10-13): manual review, evidence, external data, audit ----------
   A SECOND random stream, so everything above (IDs, scores, dates — the batch 1 demo states)
   stays byte-identical. Adds: operators, session.subject, session.evidence, session.external,
   session.review (US-06-01…08), session.evidenceAccess and the audit log (US-07-03…05). */
let seed2 = 20261014;
const rnd2 = () => { seed2 = (seed2 * 1664525 + 1013904223) >>> 0; return seed2 / 4294967296; };
const pick2 = (a) => a[Math.floor(rnd2() * a.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd2() * 10)).join("");
const ME = "Anastasia Cojocaru";
const operators = [
  { name: ME, state: "Disponibil" },
  { name: "Elena Ciobanu", state: "Disponibil" },
  { name: "Mihai Rotaru", state: "Ocupat" },
  { name: "Ana Grosu", state: "Disponibil" },
  { name: "Ion Bivol", state: "Absent" }
];
const AUDITORS = ["Victor Lungu", "Doina Cebotari"];
const FIRST = ["Ion", "Maria", "Andrei", "Elena", "Vasile", "Natalia", "Sergiu", "Cristina", "Dumitru", "Olga", "Victor", "Tatiana", "Alexandru", "Irina", "Nicolae", "Ludmila"];
const LAST = ["Popescu", "Rusu", "Ceban", "Munteanu", "Lungu", "Cojocaru", "Țurcan", "Bivol", "Moraru", "Guțu", "Sârbu", "Botnari", "Croitoru", "Melnic"];
const STREETS = ["str. Ștefan cel Mare 12, ap. 4", "bd. Dacia 47, ap. 118", "str. Mihai Eminescu 5", "str. Alba Iulia 89, ap. 21", "str. Independenței 3, ap. 56", "bd. Moscova 14, ap. 9"];
const CITIES = ["mun. Chișinău", "mun. Bălți", "or. Orhei", "or. Cahul", "or. Ungheni", "or. Comrat"];
const fmtDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const all = [...active, ...history];
all.forEach((s) => {
  const birth = new Date(1958 + Math.floor(rnd2() * 46), Math.floor(rnd2() * 12), 1 + Math.floor(rnd2() * 28));
  const first = pick2(FIRST);
  s.subject = { name: `${first} ${pick2(LAST)}`, idnp: `2${String(birth.getFullYear()).slice(2)}${digits(10)}`, birthDate: fmtDate(birth) };
  const issued = new Date(2016 + Math.floor(rnd2() * 9), Math.floor(rnd2() * 12), 1 + Math.floor(rnd2() * 28));
  const doc = { type: "Buletin de identitate", number: `B${digits(8)}`, issued: fmtDate(issued), expiry: fmtDate(new Date(issued.getFullYear() + 10, issued.getMonth(), issued.getDate())), address: `${pick2(STREETS)}, ${pick2(CITIES)}` };
  const has = (code) => s.steps.some((x) => x.code === code && (x.status === "done" || x.status === "failed"));
  const at = (code) => s.steps.find((x) => x.code === code)?.completedAt || s.startedAt;
  const items = [];
  if (has("document_scan")) {
    items.push({ id: `${s.id}-doc-f`, kind: "document-front", label: "Act de identitate — față", format: "JPEG", size: `${(0.9 + rnd2()).toFixed(1).replace(".", ",")} MB`, at: at("document_scan"), step: "document_scan" });
    items.push({ id: `${s.id}-doc-b`, kind: "document-back", label: "Act de identitate — verso", format: "JPEG", size: `${(0.8 + rnd2()).toFixed(1).replace(".", ",")} MB`, at: at("document_scan"), step: "document_scan" });
  }
  if (has("nfc_chip")) items.push({ id: `${s.id}-nfc`, kind: "nfc", label: "Fotografie din cipul NFC (DG2)", format: "JPEG 2000", size: "24 KB", at: at("nfc_chip"), step: "nfc_chip" });
  if (has("face_match")) items.push({ id: `${s.id}-selfie`, kind: "selfie", label: "Selfie", format: "JPEG", size: `${(0.4 + rnd2() * 0.5).toFixed(1).replace(".", ",")} MB`, at: at("face_match"), step: "face_match" });
  if (has("liveness")) items.push({ id: `${s.id}-live`, kind: "liveness", label: "Video liveness", format: "MP4", size: `${(2 + rnd2() * 3).toFixed(1).replace(".", ",")} MB`, at: at("liveness"), step: "liveness", seconds: Math.round(30 + rnd2() * 30) / 10 });
  s.evidence = items.length ? { items, document: has("document_scan") ? doc : null, storage: { location: "MCloud · stocare criptată (AES-256)", retention: "5 ani de la încheierea sesiunii", hash: hex(16) } } : null;
  /* RSP via MConnect: looked up by the IDNP read from the document */
  if (has("document_scan")) {
    const down = rnd2() < 0.08;
    const diff = !down && rnd2() < 0.12 ? pick2(["address", "expiry"]) : "";
    s.external = down
      ? { source: "RSP · MConnect", state: "Indisponibil", at: iso(add(new Date(at("document_scan")), 4)), error: "RSP nu a răspuns prin MConnect în 10 s (3 încercări)." }
      : { source: "RSP · MConnect", state: "Disponibil", at: iso(add(new Date(at("document_scan")), 3)), requestId: `mc-${hex(10)}`, ms: 300 + Math.floor(rnd2() * 900),
        record: { name: s.subject.name, idnp: s.subject.idnp, birthDate: s.subject.birthDate, docNumber: doc.number, docState: diff === "expiry" ? "Declarat nevalabil (pierdut)" : "Valabil", expiry: doc.expiry, address: diff === "address" ? `${pick2(STREETS)}, ${pick2(CITIES)}` : doc.address } };
  }
});

/* manual review — the sessions the scoring sent to an operator (US-06-01…08) */
const PLAN = [
  { mode: "single", status: "Alocată", who: [[ME, "Alocată"]] },
  { mode: "single", status: "În lucru", who: [[ME, "Preluată"]], diff: "address" },
  { mode: "single", status: "În lucru", who: [[ME, "Preluată"]], rspDown: true },
  { mode: "single", status: "Alocată", who: [["Elena Ciobanu", "Alocată"]] },
  { mode: "single", status: "Finalizată", who: [[ME, "Acceptat"]], callback: "Livrat" },
  { mode: "single", status: "Finalizată", who: [[ME, "Respins"]], callback: "Eșuat" },
  { mode: "multi", status: "Finalizată", who: [["Elena Ciobanu", "Acceptat"], ["Mihai Rotaru", "Respins"], ["Ana Grosu", "Acceptat"]], callback: "Livrat", why: "Risc ridicat: nivel de asigurare Ridicat" },
  { mode: "single", status: "Nealocată", who: [], notify: "Eșuată" },
  { mode: "multi", status: "În lucru", who: [[ME, "Preluată"], ["Elena Ciobanu", "Acceptat"], ["Mihai Rotaru", "Alocată"]], why: "Contestație a deciziei automate" },
  { mode: "single", status: "În lucru", who: [["Mihai Rotaru", "Preluată"]] },
  { mode: "multi", status: "În lucru", who: [["Ana Grosu", "Respins"], ["Ion Bivol", "Preluată"], ["Elena Ciobanu", "Alocată"]], why: "Risc ridicat: nivel de asigurare Ridicat" },
  { mode: "single", status: "Alocată", who: [["Ion Bivol", "Alocată"]] },
  { mode: "single", status: "Finalizată", who: [["Ana Grosu", "Respins"]], callback: "Livrat" },
  { mode: "single", status: "În lucru", who: [["Ana Grosu", "Preluată"]] },
  { mode: "single", status: "Nealocată", who: [] },
  { mode: "single", status: "Alocată", who: [["Mihai Rotaru", "Alocată"]] }
];
const REASONS = {
  Acceptat: [["match-rsp", "Dovezile concordă cu datele din RSP", "Fotografia din document, selfie-ul și datele din RSP concordă; diferența de scor vine din calitatea slabă a imaginii documentului."], ["manual-face", "Potrivire facială confirmată manual", "Am comparat manual selfie-ul cu fotografia din cip; trăsăturile corespund, iar scorul automat a fost afectat de iluminare."]],
  Respins: [["face-mismatch", "Selfie-ul nu corespunde documentului", "Trăsăturile din selfie diferă de fotografia din document (forma feței, urechile); liveness-ul arată o a doua persoană în cadru."], ["rsp-mismatch", "Date neconcordante cu RSP", "Numărul documentului apare în RSP ca declarat nevalabil (pierdut); sesiunea nu poate fi acceptată."]]
};
const candidates = [...active.filter((s) => s.status === "În revizie manuală"), ...history.filter((s) => s.decision === "Revizuire manuală")];
candidates.forEach((s, i) => {
  const plan = PLAN[i % PLAN.length];
  /* a live session in review has a weighted score between the two thresholds (that is why it
     went to an operator): scale its step scores into that band */
  if (active.includes(s)) {
    const sc = useCases.find((u) => u.code === s.useCaseCode).scoring;
    const done = s.steps.filter((x) => x.score != null);
    const w = done.reduce((a, x) => a + x.weight, 0) || 1;
    const avg = done.reduce((a, x) => a + x.score * x.weight, 0) / w;
    const target = sc.reject + 0.06 + rnd2() * (sc.accept - sc.reject - 0.12);
    done.forEach((x) => { x.score = r2(Math.min(0.99, x.score * target / avg)); });
    s.events.forEach((e) => { const step = done.find((x) => e.type === `Pas finalizat: ${x.label}`); if (step) e.detail = `${step.provider} · scor ${step.score.toFixed(2).replace(".", ",")}`; });
  }
  const sentAt = new Date(s.completedAt || s.lastActivityAt);
  /* finished reviews were allocated a minute or two after the scoring; open ones were picked
     up from the backlog in the last hours (SLA: 8 h from allocation; one is overdue) */
  const open = plan.status !== "Finalizată";
  const backlog = Math.max(sentAt.getTime(), add(NOW, -(90 * 60 + (i % 5) * 40 * 60 + (i === 9 ? 8 * 3600 : 0))).getTime());
  const live = active.includes(s);
  const allocatedAt = !open ? add(sentAt, 60 + Math.floor(rnd2() * 120))
    : live ? new Date(Math.min(add(sentAt, 10 + Math.floor(rnd2() * 50)).getTime(), add(NOW, -15).getTime()))
      : new Date(Math.min(backlog, add(NOW, -75 * 60).getTime()));
  const cap = (d, sec) => (open ? new Date(Math.min(d.getTime(), add(NOW, -sec).getTime())) : d);
  const hist = history.includes(s);
  const assignees = plan.who.map(([name, state], k) => {
    const a = { name, allocatedAt: iso(add(allocatedAt, k * 7)), state: state === "Alocată" ? "Alocată" : state === "Preluată" ? "Preluată" : "Decizie înregistrată" };
    if (a.state !== "Alocată") a.takenAt = iso(cap(add(allocatedAt, 300 + k * 240 + Math.floor(rnd2() * 600)), 600));
    if (a.state === "Decizie înregistrată") {
      const [code, label, text] = pick2(REASONS[state]);
      Object.assign(a, { decision: state, decidedAt: iso(cap(add(new Date(a.takenAt), 600 + Math.floor(rnd2() * 1500)), 120)), reasonCode: code, reasonLabel: label, reason: text });
    }
    return a;
  });
  const review = {
    id: `REV-2026-${String(4100 + i * 7).padStart(5, "0")}`, mode: plan.mode, rule: plan.mode === "multi" ? "Majoritate (2 din 3)" : "Un operator",
    why: plan.why || "Scor între pragul de respingere și cel de acceptare", sentAt: iso(sentAt), dueAt: plan.status === "Nealocată" ? null : iso(add(allocatedAt, 8 * 3600)),
    allocation: plan.status === "Nealocată" ? "În așteptare — niciun operator disponibil" : "Aleatorie", allocatedAt: plan.status === "Nealocată" ? null : iso(allocatedAt),
    status: plan.status, assignees,
    notification: { channel: "MNotify · SMS", to: `+373 6•• •• ${digits(3)}`, state: plan.notify || "Livrată", at: iso(add(sentAt, 20)), attempts: plan.notify ? 3 : 1 }
  };
  if (plan.status === "Finalizată") {
    const votes = assignees.map((a) => a.decision);
    const final = votes.filter((v) => v === "Acceptat").length * 2 > votes.length ? "Acceptat" : "Respins";
    const last = assignees.map((a) => a.decidedAt).sort().pop();
    review.result = { decision: final, at: last };
    const failed = plan.callback === "Eșuat";
    review.callback = { url: `https://api.${s.clientId}.md/ekyc/callback`, state: failed ? "Eșuat" : "Livrat", attempts: failed ? 3 : 1, at: iso(add(new Date(last), failed ? 900 : 2)), http: failed ? "503 Service Unavailable" : "200 OK", next: failed ? "Reîncercare automată epuizată — retrimitere manuală" : "" };
    if (hist) s.decision = final;
  }
  if (plan.rspDown && s.external) s.external = { source: "RSP · MConnect", state: "Indisponibil", at: s.external.at, error: "RSP nu a răspuns prin MConnect în 10 s (3 încercări)." };
  if (plan.diff && s.external?.record) s.external.record.address = "str. Calea Ieșilor 61, ap. 14, mun. Chișinău";
  s.review = review;
  /* MLog (US-06-02 CA-3): allocation, notification, operator actions, result, callback */
  const ev = [];
  if (review.allocatedAt) ev.push({ at: review.allocatedAt, type: plan.mode === "multi" ? "Revizie multi-operator alocată aleatoriu" : "Revizie alocată aleatoriu", status: "Reușit", detail: assignees.map((a) => a.name).join(", "), user: "Motor de alocare" });
  ev.push({ at: review.notification.at, type: "Solicitant notificat: revizie manuală", status: review.notification.state === "Livrată" ? "Reușit" : "Eșuat", detail: `${review.notification.channel} · ${review.notification.to}${review.notification.state === "Livrată" ? "" : " · 3 încercări eșuate"}`, user: "Platforma eKYC" });
  assignees.forEach((a) => {
    if (a.takenAt) ev.push({ at: a.takenAt, type: "Revizie preluată", status: "Reușit", detail: review.id, user: a.name });
    if (a.decidedAt) ev.push({ at: a.decidedAt, type: `Decizie operator: ${a.decision}`, status: a.decision === "Acceptat" ? "Reușit" : "Eșuat", detail: a.reasonLabel, user: a.name });
  });
  if (review.result) {
    ev.push({ at: review.result.at, type: `Decizie finală: ${review.result.decision}`, status: review.result.decision === "Acceptat" ? "Reușit" : "Eșuat", detail: plan.mode === "multi" ? `${review.rule} · ${assignees.filter((a) => a.decision === review.result.decision).length} din ${assignees.length}` : "Decizia operatorului", user: "Platforma eKYC" });
    ev.push({ at: review.callback.at, type: "Rezultat transmis clientului", status: review.callback.state === "Livrat" ? "Reușit" : "Eșuat", detail: `${review.callback.http} · ${review.callback.attempts} ${review.callback.attempts === 1 ? "încercare" : "încercări"}`, user: "Platforma eKYC" });
  }
  s.events = [...ev, ...s.events].sort((a, b) => (a.at < b.at ? 1 : -1));
});

/* who opened stored evidence (US-07-03 / US-07-05 CA-3) and the audit log (US-07-04 CA-3) */
const ACCESS_REASONS = ["Investigație", "Contestație", "Audit periodic", "Solicitare a unei autorități"];
const accessLog = [];
history.filter(() => rnd2() < 0.18).forEach((s) => {
  const who = pick2(AUDITORS);
  const when = add(new Date(s.completedAt), 3600 * (2 + Math.floor(rnd2() * 40)));
  if (when > NOW) return;
  const entry = { at: iso(when), user: who, role: "Auditor", action: "Acces la dovezi", sessionId: s.id, reason: pick2(ACCESS_REASONS), ref: `INV-2026-${digits(3)}`, until: iso(add(when, 15 * 60)) };
  s.evidenceAccess = [...(s.evidenceAccess || []), entry];
  accessLog.push(entry);
});
candidates.forEach((s) => s.review.assignees.filter((a) => a.takenAt).forEach((a) => {
  const entry = { at: iso(add(new Date(a.takenAt), 40)), user: a.name, role: "Operator (revizie)", action: "Acces la dovezi", sessionId: s.id, reason: "Revizie alocată", ref: s.review.id };
  s.evidenceAccess = [...(s.evidenceAccess || []), entry];
  accessLog.push(entry);
}));
for (let k = 0; k < 9; k += 1) {
  const when = add(NOW, -Math.floor(3600 + rnd2() * 9 * 86400));
  const kind = pick2(["search", "search", "export", "detail"]);
  const s = pick2(history);
  accessLog.push(kind === "search"
    ? { at: iso(when), user: pick2(AUDITORS), role: "Auditor", action: "Căutare în sesiuni", sessionId: "", reason: pick2([`IDNP ${s.subject.idnp.slice(0, 4)}•••••••••`, `client ${s.clientId}`, "decizie: Respins · ultimele 30 de zile"]), ref: `${2 + Math.floor(rnd2() * 30)} rezultate` }
    : kind === "export"
      ? { at: iso(when), user: pick2(AUDITORS), role: "Auditor", action: "Export raport", sessionId: "", reason: pick2(["CSV · sesiuni", "JSON · raport statistic"]), ref: "fără date personale" }
      : { at: iso(when), user: pick2(AUDITORS), role: "Auditor", action: "Vizualizare detalii sesiune", sessionId: s.id, reason: pick2(ACCESS_REASONS), ref: "" });
}
accessLog.sort((a, b) => (a.at < b.at ? 1 : -1));

const out = { now: iso(NOW), clients, useCases: useCases.map(({ clients: c, ...u }) => ({ ...u, clients: c })), providers, alerts, operators, active, history, accessLog };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("active", active.length, "history", history.length, "reviews", candidates.length, "access", accessLog.length);
