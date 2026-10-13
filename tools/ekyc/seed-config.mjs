// Seed for the eKYC back office — batch 3, Configurare + Administrare (deterministic).
// Run: node tools/ekyc/seed-config.mjs data/ekyc-config.json
// Reads data/ekyc-sessions.json so clients, use cases, scoring names and providers match the
// monitoring screens (same ids, same names). Demo-state ids depend on this file.
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] || "data/ekyc-config.json";
const sessions = JSON.parse(fs.readFileSync(path.join(path.dirname(out), "ekyc-sessions.json"), "utf8"));

let seed = 20261014;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const add = (d, s) => new Date(d.getTime() + s * 1000);
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`;
const NOW = new Date(2026, 9, 13, 14, 52, 0);
const daysAgo = (d, h = 10, m = 0) => { const x = new Date(NOW); x.setDate(x.getDate() - d); x.setHours(h, m, 0, 0); return x; };
const ADMINS = ["Anastasia Cojocaru", "Cristina Moraru"];
const by = () => pick(ADMINS);
const ev = (at, type, detail, user = by(), status = "Reușit") => ({ at: iso(at), type, status, detail, user });

/* ---- Organizații (US-UI-06) ---- */
const organizations = [
  ["org-age", "Agenția de Guvernare Electronică", "1006601000094", "Victor Lungu", "victor.lungu@egov.md", "+373 22 820 015", true, 410],
  ["org-orange", "Orange Moldova SA", "1002600002354", "Diana Popa", "diana.popa@orange.md", "+373 22 975 104", true, 380],
  ["org-maib", "maib SA", "1002600003778", "Radu Ceban", "radu.ceban@maib.md", "+373 22 450 603", true, 371],
  ["org-micb", "Moldindconbank SA", "1002600028291", "Irina Vasilache", "irina.vasilache@micb.md", "+373 22 576 782", true, 352],
  ["org-moldcell", "Moldcell SA", "1002600047108", "Alexandru Gaina", "a.gaina@moldcell.md", "+373 22 206 206", true, 340],
  ["org-vb", "Victoriabank SA", "1002600001338", "Elena Stratan", "elena.stratan@vb.md", "+373 22 576 100", true, 333],
  ["org-asito", "Asito SA", "1003600043519", "Sergiu Rotari", "sergiu.rotari@asito.md", "+373 22 228 803", true, 290],
  ["org-iute", "Iute Credit Moldova SRL", "1012600029087", "Mariana Cojocari", "mariana.cojocari@iutecredit.md", "+373 22 999 444", true, 264],
  ["org-moldtelecom", "Moldtelecom SA", "1002600048013", "Vadim Bostan", "vadim.bostan@moldtelecom.md", "+373 22 570 570", true, 210],
  ["org-cnas", "Casa Națională de Asigurări Sociale", "1003600156380", "Tatiana Lupu", "tatiana.lupu@cnas.gov.md", "+373 22 257 702", true, 64],
  ["org-microinvest", "OCN Microinvest SRL", "1003600118102", "", "", "", false, 152]
].map(([id, name, idno, contactName, contactEmail, contactPhone, active, age]) => {
  const createdAt = daysAgo(age, 9, 30);
  return { id, name, idno, contactName, contactEmail, contactPhone, active, createdAt: iso(createdAt), updatedAt: iso(add(createdAt, 86400 * Math.floor(age / 3))), updatedBy: by() };
});
const ORG_OF = { "Orange Moldova SA": "org-orange", "maib SA": "org-maib", "Moldindconbank SA": "org-micb", "Agenția de Guvernare Electronică": "org-age", "Moldcell SA": "org-moldcell", "Victoriabank SA": "org-vb", "Asito SA": "org-asito", "Iute Credit Moldova SRL": "org-iute" };

/* ---- Furnizori de verificare (US-UI-09) — the providers of the session steps + 2 backups ---- */
const providers = [
  ["prv-regula-doc", "Regula Vision — Document AI", "Regula Forensics", "Verificare document", "https://docreader.regula.ekyc.gov.md/api/v2/process", "Cheie API", 20000, 2, 5, 60, 1, "Operațional", 1.1, true],
  ["prv-regula-nfc", "Regula — NFC eMRTD", "Regula Forensics", "Citire cip NFC", "https://nfc.regula.ekyc.gov.md/api/v1/chip", "Cheie API", 15000, 1, 5, 60, 1, "Operațional", 0.8, true],
  ["prv-iproov", "iProov — Liveness", "iProov", "Detecție liveness", "https://eu.rp.secure.iproov.me/api/v2/claim/verify", "OAuth 2.0 (client credentials)", 30000, 2, 4, 90, 1, "Operațional", 1.6, true],
  ["prv-facetec", "FaceTec — 3D Face Match", "FaceTec", "Potrivire facială", "https://facetec.ekyc.gov.md/match-3d-2d", "Cheie API", 25000, 2, 5, 120, 1, "Degradat", 4.2, true],
  ["prv-vonage", "Vonage Verify — SMS OTP", "Vonage", "Verificare telefon", "https://api.nexmo.com/v2/verify", "Basic (utilizator + parolă)", 10000, 3, 3, 300, 1, "Indisponibil", null, true],
  ["prv-asp-rsp", "ASP — Registrul de stat al populației", "MConnect (AGE)", "Registru de stat", "https://mconnect.gov.md/api/rsp/v3/person", "mTLS (certificat client)", 8000, 2, 10, 60, 1, "Operațional", 0.6, true],
  ["prv-veriff", "Veriff", "Veriff", "Verificare document", "https://stationapi.veriff.com/v1/sessions", "Cheie API + semnătură HMAC", 30000, 1, 5, 120, 2, "Operațional", 2.3, true],
  ["prv-innovatrics", "Innovatrics DOT", "Innovatrics", "Potrivire facială", "https://dot.innovatrics.ekyc.gov.md/api/v1/face/match", "Cheie API", 20000, 1, 5, 120, 2, "Operațional", 1.4, false]
].map(([id, name, system, type, endpoint, auth, timeoutMs, retries, cbThreshold, cbReset, priority, health, latency, active], i) => ({
  id, name, system, type, endpoint, auth, credentialsSet: true, credentialsUpdatedAt: iso(daysAgo(30 + i * 11, 11)),
  timeoutMs, retries, cbThreshold, cbReset, priority, health, latency, lastHealthCheck: iso(add(NOW, -(20 + i * 7))), active,
  createdAt: iso(daysAgo(300 - i * 9, 10)), updatedAt: iso(daysAgo(6 + i * 3, 15, 10)), updatedBy: by()
}));
const PROVIDER_BY_NAME = Object.fromEntries(providers.map((p) => [p.name, p.id]));

/* ---- Configurări scoring (US-UI-10) — the configurations the sessions were scored with ---- */
const SCORING_RULES = {
  "Standard telecom": [
    ["Pondere potrivire facială", "FACE_MATCH", "Pondere", 0.35, ""],
    ["Penalizare document aproape expirat", "DOCUMENT_SCAN", "Penalizare", 0.05, "document.expiresInDays < 30"],
    ["Bonus telefon confirmat", "PHONE_VERIFICATION", "Bonus", 0.02, "phone.verified == true"]
  ],
  "Standard bancar — deschidere cont": [
    ["Pondere document", "DOCUMENT_SCAN", "Pondere", 0.3, ""],
    ["Pondere potrivire facială", "FACE_MATCH", "Pondere", 0.35, ""],
    ["Bonus cip NFC valid", "NFC_CHIP", "Bonus", 0.03, "nfc.chipVerified == true && nfc.passiveAuth == \"OK\""],
    ["Penalizare dispozitiv nou", "", "Penalizare", 0.04, "device.firstSeenDays < 1"]
  ],
  "Reverificare simplă": [],
  "Servicii publice — nivel ridicat": [
    ["Pondere liveness", "LIVENESS", "Pondere", 0.3, ""],
    ["Penalizare liveness la limită", "LIVENESS", "Penalizare", 0.06, "steps.LIVENESS.score < 0.8"]
  ],
  "Asigurări — standard": [["Pondere potrivire facială", "FACE_MATCH", "Pondere", 0.35, ""]],
  "Creditare — standard": [
    ["Penalizare RSP neconcordant", "REGISTRY_CHECK", "Penalizare", 0.1, "registry.match == false"],
    ["Bonus client existent", "", "Bonus", 0.02, "client.knownSubject == true"]
  ]
};
const SCORING_DESC = {
  "Standard telecom": "Activarea cartelelor SIM prepaid: accent pe potrivirea facială, telefonul confirmat aduce un bonus mic.",
  "Standard bancar — deschidere cont": "Deschiderea de conturi la distanță (nivel ridicat): documentul și potrivirea facială cântăresc cel mai mult, cipul NFC valid aduce bonus.",
  "Reverificare simplă": "Reverificarea periodică a clienților existenți: doar liveness și potrivire facială, fără reguli suplimentare.",
  "Servicii publice — nivel ridicat": "Acces la servicii publice cu nivel de asigurare ridicat: praguri stricte, liveness la limită penalizat.",
  "Asigurări — standard": "Încheierea polițelor de asigurare online.",
  "Creditare — standard": "Credite online: neconcordanța cu RSP penalizează puternic scorul."
};
const scoringByName = new Map();
sessions.useCases.forEach((uc) => { if (!scoringByName.has(uc.scoring.name)) scoringByName.set(uc.scoring.name, uc.scoring); });
const scoring = [...scoringByName.values()].map((s, i) => {
  const id = `scr-${String(i + 1).padStart(2, "0")}`;
  const createdAt = daysAgo(260 - i * 20, 10);
  return {
    id, name: s.name, description: SCORING_DESC[s.name] || "", accept: s.accept, reject: s.reject, minConfidence: s.minConfidence,
    aggregation: "Medie ponderată", active: true, createdAt: iso(createdAt), updatedAt: iso(daysAgo(9 + i * 4, 16)), updatedBy: by(),
    rules: (SCORING_RULES[s.name] || []).map(([name, stepType, ruleType, value, condition], k) => ({ id: `${id}-r${k + 1}`, order: k + 1, name, stepType, ruleType, value, condition, enabled: !(s.name === "Standard bancar — deschidere cont" && k === 3) }))
  };
});
scoring.push({ id: "scr-07", name: "Bancar — strict (pilot)", description: "Variantă mai strictă pentru pilotul de credite ipotecare; nu este atribuită niciunui client.", accept: 0.9, reject: 0.55, minConfidence: 0.75, aggregation: "Minimul scorurilor", active: false, createdAt: iso(daysAgo(40, 11)), updatedAt: iso(daysAgo(12, 14, 20)), updatedBy: "Cristina Moraru", rules: [] });
const SCORING_OF = Object.fromEntries(scoring.map((s) => [s.name, s.id]));

/* ---- Cazuri de utilizare (US-UI-08) — the use cases of the sessions + a draft without steps ---- */
const STEP = {
  document_scan: ["DOCUMENT_SCAN", "Scanare document", "Regula Vision — Document AI", ["Veriff"], 45, 2, false],
  nfc_chip: ["NFC_CHIP", "Citire cip NFC", "Regula — NFC eMRTD", [], 30, 1, false],
  liveness: ["LIVENESS", "Detecție liveness", "iProov — Liveness", [], 60, 2, false],
  face_match: ["FACE_MATCH", "Potrivire facială", "FaceTec — 3D Face Match", ["Innovatrics DOT"], 30, 2, false],
  phone_verification: ["PHONE_VERIFICATION", "Verificare telefon", "Vonage Verify — SMS OTP", [], 120, 3, true],
  registry_check: ["REGISTRY_CHECK", "Verificare în RSP", "ASP — Registrul de stat al populației", [], 15, 2, true]
};
const VETO = {
  expired: ["Document expirat", "document.expiryDate < session.startedAt", "Critică"],
  liveness: ["Liveness eșuat", "steps.LIVENESS.passed == false", "Critică"],
  minor: ["Subiect minor", "subject.age < 18", "Critică"],
  country: ["Țara documentului nu este permisă", "document.issuingCountry not in client.allowedCountries", "Avertisment"],
  device: ["Dispozitiv compromis", "device.integrity == \"compromised\" && device.platform != \"Web\"", "Avertisment"],
  rsp: ["Persoană decedată în RSP", "registry.person.status == \"DECEDAT\"", "Critică"]
};
const VETO_OF = {
  TELCO_SIM_SUBSTANTIAL: ["expired", "liveness", "device"],
  BANK_ONBOARDING_HIGH: ["expired", "liveness", "minor", "country", "rsp"],
  KYC_REFRESH_LOW: [],
  GOV_SERVICES_HIGH: ["expired", "liveness", "country"],
  INSURANCE_ONBOARDING_SUBST: ["expired", "minor"],
  CREDIT_ONLINE_SUBST: ["expired", "liveness", "minor", "rsp"]
};
const UC_DESC = {
  TELCO_SIM_SUBSTANTIAL: "Identificarea abonatului la activarea unei cartele SIM prepaid, cerută de legea comunicațiilor electronice.",
  BANK_ONBOARDING_HIGH: "Deschiderea unui cont bancar fără vizită la sucursală; nivel de asigurare ridicat, cu cipul NFC al actului.",
  KYC_REFRESH_LOW: "Reconfirmarea periodică a identității clienților existenți (selfie + liveness).",
  GOV_SERVICES_HIGH: "Accesul la serviciile publice care cer o identitate verificată la nivel ridicat.",
  INSURANCE_ONBOARDING_SUBST: "Încheierea online a polițelor de asigurare.",
  CREDIT_ONLINE_SUBST: "Acordarea creditelor de consum online, cu verificare în RSP."
};
const VERSIONS = { TELCO_SIM_SUBSTANTIAL: "4.2", BANK_ONBOARDING_HIGH: "4.2", KYC_REFRESH_LOW: "3.9", GOV_SERVICES_HIGH: "4.1", INSURANCE_ONBOARDING_SUBST: "4.1", CREDIT_ONLINE_SUBST: "4.2" };
const useCases = sessions.useCases.map((uc, i) => {
  const version = VERSIONS[uc.code] || "4.1";
  const [maj, min] = version.split(".").map(Number);
  const steps = uc.steps.map((code, k) => {
    const [type, label, provider, fallbacks, timeout, retries, async] = STEP[code];
    return { id: `${uc.code.toLowerCase()}-s${k + 1}`, type, label, mandatory: !uc.optional.includes(code), async, provider: PROVIDER_BY_NAME[provider], fallbacks: fallbacks.map((f) => PROVIDER_BY_NAME[f]), timeout, retries };
  });
  const veto = (VETO_OF[uc.code] || []).map((key, k) => { const [name, condition, severity] = VETO[key]; return { id: `${uc.code.toLowerCase()}-v${k + 1}`, name, condition, severity, enabled: !(uc.code === "BANK_ONBOARDING_HIGH" && key === "country") }; });
  const createdAt = daysAgo(250 - i * 15, 10);
  /* version history, newest first: the current one + up to 3 older */
  const versions = [];
  const changes = ["Prag liveness ajustat după pilot", "Furnizor de rezervă adăugat pentru potrivirea facială", "Regulă veto „Document expirat” adăugată", "Ordinea pașilor schimbată: liveness înainte de potrivire"];
  for (let k = 0; k < 4; k += 1) {
    const v = min - k >= 0 ? `${maj}.${min - k}` : `${maj - 1}.${9 + (min - k) + 1}`;
    versions.push({ version: v, at: iso(daysAgo(8 + k * 37 + i * 2, 11 + k, 15)), by: by(), change: k === 3 ? "Versiunea inițială a fluxului" : changes[(k + i) % changes.length], current: k === 0 });
  }
  return {
    code: uc.code, name: uc.name, description: UC_DESC[uc.code] || "", ial: uc.ial, version, active: true, steps, veto, versions,
    createdAt: iso(createdAt), updatedAt: versions[0].at, updatedBy: versions[0].by
  };
});
useCases.push({ code: "PENSION_CONFIRM_SUBST", name: "Confirmarea identității pensionarilor", description: "Confirmarea anuală a identității beneficiarilor de pensii care locuiesc peste hotare (CNAS). Fluxul este în lucru.", ial: "Substanțial", version: "0.1", active: false, steps: [], veto: [], versions: [{ version: "0.1", at: iso(daysAgo(3, 10, 40)), by: "Cristina Moraru", change: "Caz de utilizare creat (fără pași)", current: true }], createdAt: iso(daysAgo(3, 10, 40)), updatedAt: iso(daysAgo(3, 10, 40)), updatedBy: "Cristina Moraru" });

/* ---- Clienți / Relying Parties (US-UI-07) ---- */
const HOSTS = {
  "orange-selfcare": ["selfcare.orange.md", "md.orange.selfcare", "195.22.224.0/24"],
  "maib-app": ["online.maib.md", "md.maib.app", "185.181.228.0/24"],
  "micb-web": ["onboarding.micb.md", "", "89.28.18.32/28"],
  "mpay-gov": ["mpay.gov.md", "", "10.20.0.0/16"],
  "moldcell-app": ["my.moldcell.md", "md.moldcell.app", "178.168.40.0/24"],
  "victoriabank-online": ["online.victoriabank.md", "md.victoriabank.mobile", "212.56.198.0/26"],
  "asito-online": ["online.asito.md", "", "92.115.140.12"],
  "iute-credit": ["iutecredit.md", "md.iutecredit.app", "194.177.10.0/24"]
};
const clients = sessions.clients.map((c, i) => {
  const [host, scheme, cidr] = HOSTS[c.id];
  const useCaseCodes = sessions.useCases.filter((uc) => uc.clients.includes(c.id)).map((uc) => uc.code);
  const firstUc = sessions.useCases.find((uc) => uc.clients.includes(c.id));
  const createdAt = daysAgo(240 - i * 17, 10, 20);
  return {
    id: c.id, name: c.name, orgId: ORG_OF[c.org], mpassClientId: uuid(),
    redirectUris: [`https://${host}/ekyc/callback`, ...(scheme ? [`${scheme}://ekyc/result`] : [])],
    scopes: ["openid", "profile", "ekyc.session", ...(firstUc.steps.includes("nfc_chip") ? ["ekyc.nfc"] : []), "ekyc.result"],
    callbackUrl: `https://api.${host.replace(/^(selfcare|online|onboarding|my)\./, "")}/webhooks/ekyc`,
    ipWhitelist: [cidr, ...(i % 3 === 0 ? [`${cidr.split(".").slice(0, 3).join(".")}.200`] : [])].filter((x, k, a) => a.indexOf(x) === k),
    countries: c.id === "mpay-gov" ? ["MDA"] : ["MDA", "ROU", ...(i % 2 ? ["UKR"] : [])],
    maxSessions: [200, 150, 100, 500, 200, 150, 50, 80][i] || 100,
    useCases: useCaseCodes, scoringId: SCORING_OF[firstUc.scoring.name], active: true,
    createdAt: iso(createdAt), updatedAt: iso(daysAgo(5 + i * 6, 14, 5)), updatedBy: by()
  };
});
clients.push({ id: "moldtelecom-myaccount", name: "Moldtelecom MyAccount", orgId: "org-moldtelecom", mpassClientId: uuid(), redirectUris: ["https://my.moldtelecom.md/ekyc/callback"], scopes: ["openid", "profile", "ekyc.session", "ekyc.result"], callbackUrl: "https://api.moldtelecom.md/webhooks/ekyc", ipWhitelist: ["91.208.120.0/24"], countries: ["MDA"], maxSessions: 100, useCases: ["TELCO_SIM_SUBSTANTIAL"], scoringId: SCORING_OF["Standard telecom"], active: false, createdAt: iso(daysAgo(120, 9, 45)), updatedAt: iso(daysAgo(33, 17, 10)), updatedBy: "Cristina Moraru" });
clients.forEach((c) => {
  const created = new Date(c.createdAt);
  c.events = [
    ...(c.active ? [] : [ev(new Date(c.updatedAt), "Client dezactivat", "Integrarea a fost suspendată la cererea organizației.", c.updatedBy)]),
    ev(new Date(c.updatedAt), "Configurație actualizată", "Redirect URIs · IP whitelist", c.updatedBy),
    ev(add(created, 3600), "Client activat", "Primul test de integrare reușit."),
    ev(created, "Client creat", `${c.name} · ${c.id}`)
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
});

/* ---- Parametri platformă (US-UI-11) ---- */
const PARAMS = [
  ["Sesiuni", "session.ttlMinutes", "Durata maximă a unei sesiuni", "După acest interval fără decizie, sesiunea expiră (minute).", "number", "30"],
  ["Sesiuni", "session.idleTimeoutMinutes", "Expirare la inactivitate", "Minute fără nicio acțiune a utilizatorului până la închiderea fluxului.", "number", "10"],
  ["Sesiuni", "session.resumeAllowed", "Reluarea sesiunii întrerupte", "Utilizatorul poate relua fluxul din același dispozitiv, dacă sesiunea nu a expirat.", "boolean", "true"],
  ["Sesiuni", "session.maxAttemptsPerSubject", "Încercări pe subiect într-o zi", "Câte sesiuni poate porni aceeași persoană (după IDNP) în 24 de ore.", "number", "5"],
  ["Revizie manuală", "review.slaHours", "Termen de revizie", "Ore de la trimiterea în revizie până la termenul-limită al operatorului.", "number", "8"],
  ["Revizie manuală", "review.multiOperatorRule", "Regula multi-operator", "Cum se agregă deciziile în revizia cu mai mulți operatori.", "string", "Majoritate (2 din 3)"],
  ["Revizie manuală", "review.evidenceAccessMinutes", "Durata accesului la dovezi", "Minute cât durează accesul acordat unui auditor sau supervizor la dovezile unei sesiuni.", "number", "15"],
  ["Alerte", "alerts.errorRatePercent", "Prag alertă rată de eroare", "Peste acest procent de sesiuni cu eroare (fereastra de 1 h) apare o alertă critică.", "number", "5"],
  ["Alerte", "alerts.providerLatencyP95Seconds", "Prag alertă latență furnizor", "Latența p95 (secunde) peste care un furnizor este marcat „Degradat”.", "number", "3"],
  ["Alerte", "alerts.channels", "Canale de notificare a alertelor", "Unde se trimit alertele critice: listă de e-mailuri și notificare MNotify.", "json", "{\"email\":[\"noc@egov.md\",\"ekyc-ops@egov.md\"],\"mnotify\":true,\"minSeverity\":\"Critică\"}"],
  ["Limite tehnice", "limits.maxUploadMb", "Dimensiunea maximă a unei imagini", "Megaocteți pentru o fotografie de document sau un selfie trimis de SDK.", "number", "10"],
  ["Limite tehnice", "limits.apiRatePerMinute", "Limită de apeluri API pe client", "Cereri pe minut acceptate de la un client înainte de răspunsul 429.", "number", "600"],
  ["Limite tehnice", "limits.retryBackoff", "Politica de reîncercare a joburilor", "Pauza inițială, factorul de creștere și pauza maximă între reîncercări (ms).", "json", "{\"initialMs\":500,\"factor\":2,\"maxMs\":8000}"],
  ["Funcționalități", "features.nfcRequiredHigh", "NFC obligatoriu la nivel ridicat", "Cazurile de utilizare cu nivel ridicat cer citirea cipului actului.", "boolean", "true"],
  ["Funcționalități", "features.webFallback", "Continuare în browser", "Dacă aplicația nu are SDK-ul mobil, fluxul continuă în SDK-ul Web.", "boolean", "true"],
  ["Funcționalități", "features.videoArchive", "Arhivarea video-ului liveness", "Păstrează înregistrarea video completă, nu doar cadrele cheie.", "boolean", "false"],
  ["Integrări", "integrations.mconnect.rspEndpoint", "Adresa RSP în MConnect", "Serviciul MConnect prin care se interoghează Registrul de stat al populației.", "string", "https://mconnect.gov.md/api/rsp/v3"],
  ["Integrări", "integrations.mnotify.templateReview", "Șablon MNotify — rezultat revizie", "Codul șablonului MNotify trimis solicitantului după revizia manuală.", "string", "EKYC_REVIEW_RESULT"],
  ["Integrări", "integrations.mlog.level", "Nivel de jurnalizare MLog", "Nivelul minim al evenimentelor trimise în MLog.", "string", "INFO"],
  ["Păstrarea datelor", "evidence.retentionDays", "Păstrarea dovezilor", "Zile cât se păstrează imaginile și video-ul unei sesiuni finalizate.", "number", "90"],
  ["Păstrarea datelor", "audit.retentionDays", "Păstrarea jurnalului de audit", "Zile cât se păstrează jurnalul de acces și de audit.", "number", "1825"]
];
const INACTIVE_PARAMS = new Set(["features.videoArchive", "session.maxAttemptsPerSubject"]);
const parameters = PARAMS.map(([category, key, name, description, type, value], i) => ({ key, name, description, type, value, category, active: !INACTIVE_PARAMS.has(key), createdAt: iso(daysAgo(300 - i, 10)), updatedAt: iso(add(daysAgo(2 + ((i * 7) % 60), 9 + (i % 8), (i * 13) % 60), 0)), updatedBy: pick([...ADMINS, "Sergiu Munteanu"]) }));

/* ---- Versiuni SDK (US-UI-12) — the app versions seen on the session devices ---- */
const SDK = [
  ["iOS", "4.2.1", "Remediere: blocarea camerei pe iPhone 12 la detecția liveness.", 21, true, true],
  ["iOS", "4.2.0", "Citire NFC mai rapidă pe iOS 18; ecran nou de consimțământ.", 46, false, true],
  ["iOS", "4.1.8", "Ultima versiune a ramurii 4.1; compatibilă cu iOS 16.", 112, false, true],
  ["iOS", "4.0.3", "Ramura 4.0, fără suport pentru documentele noi (2026).", 260, false, false],
  ["Android", "3.12.0", "Suport pentru actul de identitate 2026; liveness pasiv.", 18, true, true],
  ["Android", "3.11.2", "Remedieri NFC pe Samsung Galaxy A.", 63, false, true],
  ["Android", "3.10.0", "Android 15; reîncercare automată la pierderea conexiunii.", 140, false, true],
  ["Android", "3.8.5", "Ramura 3.8, fără verificarea integrității dispozitivului.", 300, false, false],
  ["Web", "2.5.0-rc.1", "Versiune de test: captură document din webcam cu ghidaj nou.", 4, false, true],
  ["Web", "2.4.0", "SDK Web pentru onboarding din browser (desktop și mobil).", 35, true, true],
  ["Web", "2.3.1", "Remediere: orientarea camerei pe Safari iOS.", 98, false, true],
  ["Web", "2.2.0", "Ramura 2.2, fără liveness pasiv.", 210, false, false]
];
const sdk = SDK.map(([platform, version, description, age, recommended, supported], i) => ({
  id: `sdk-${platform.toLowerCase()}-${version.replace(/[^0-9a-z]/gi, "")}`, version, platform, description, releaseDate: iso(daysAgo(age, 12)).slice(0, 10),
  recommended, supported, downloadUrl: `https://sdk.ekyc.gov.md/${platform.toLowerCase()}/${version}`, createdAt: iso(daysAgo(age, 12, 30)), updatedAt: iso(daysAgo(Math.max(1, age - 3), 15)), updatedBy: by()
}));

/* ---- Certificate root CA de încredere (US-05-09-B) — mTLS clients ---- */
const thumb = () => Array.from({ length: 16 }, () => hex(2).toUpperCase()).join(":");
const trustedCas = [
  ["ca-moldsign-2021", "MoldSign Root CA 2021", "CN=MoldSign Root CA 2021, O=STISC, C=MD", "CN=MoldSign Root CA 2021, O=STISC, C=MD", "RSA 4096", daysAgo(1780, 0), add(daysAgo(1780, 0), 86400 * 7305), "Activ", null, ["mpay-gov"]],
  ["ca-age-mtls-g1", "AGE Clients mTLS CA G1", "CN=AGE Clients mTLS CA G1, O=Agenția de Guvernare Electronică, C=MD", "CN=MoldSign Root CA 2021, O=STISC, C=MD", "RSA 3072", daysAgo(1450, 0), add(NOW, 86400 * 48), "Activ", { role: "old", partner: "ca-age-mtls-g2", startedAt: iso(daysAgo(6, 10, 5)), until: iso(add(NOW, 86400 * 24)) }, ["orange-selfcare", "moldcell-app", "asito-online"]],
  ["ca-age-mtls-g2", "AGE Clients mTLS CA G2", "CN=AGE Clients mTLS CA G2, O=Agenția de Guvernare Electronică, C=MD", "CN=MoldSign Root CA 2021, O=STISC, C=MD", "ECDSA P-384", daysAgo(8, 0), add(daysAgo(8, 0), 86400 * 3652), "Activ", { role: "new", partner: "ca-age-mtls-g1", startedAt: iso(daysAgo(6, 10, 5)), until: iso(add(NOW, 86400 * 24)) }, []],
  ["ca-maib-partner", "maib Partner Root CA", "CN=maib Partner Root CA, O=maib SA, C=MD", "CN=maib Partner Root CA, O=maib SA, C=MD", "RSA 4096", daysAgo(900, 0), add(daysAgo(900, 0), 86400 * 3652), "Activ", null, ["maib-app"]],
  ["ca-digicert-g2", "DigiCert Global Root G2", "CN=DigiCert Global Root G2, OU=www.digicert.com, O=DigiCert Inc, C=US", "CN=DigiCert Global Root G2, OU=www.digicert.com, O=DigiCert Inc, C=US", "RSA 2048", new Date(2013, 7, 1), new Date(2038, 0, 15), "Activ", null, ["micb-web", "victoriabank-online", "iute-credit"]],
  ["ca-orange-2019", "Orange Moldova Issuing CA 2019", "CN=Orange Moldova Issuing CA 2019, O=Orange Moldova SA, C=MD", "CN=Orange Moldova Root CA, O=Orange Moldova SA, C=MD", "RSA 2048", daysAgo(2400, 0), add(NOW, 86400 * 210), "Inactiv", null, []],
  ["ca-stisc-test-2020", "STISC Test CA 2020", "CN=STISC Test CA 2020, O=STISC, C=MD", "CN=STISC Test CA 2020, O=STISC, C=MD", "RSA 2048", daysAgo(2100, 0), daysAgo(180, 0), "Inactiv", null, []]
].map(([id, name, subject, issuer, keyAlgorithm, from, to, status, rotation, usedBy], i) => {
  const uploadedAt = add(from > daysAgo(30) ? from : daysAgo(400 - i * 40, 9), 3600 * 3);
  const events = [ev(uploadedAt, "Certificat înregistrat", `${name} · amprentă SHA-256 verificată`)];
  if (rotation?.role === "new") events.unshift(ev(new Date(rotation.startedAt), "Rotație inițiată", "Înlocuiește „AGE Clients mTLS CA G1”; ambele certificate sunt acceptate până la finalul tranziției.", "Anastasia Cojocaru"));
  if (rotation?.role === "old") events.unshift(ev(new Date(rotation.startedAt), "Rotație inițiată", "Va fi înlocuit de „AGE Clients mTLS CA G2”.", "Anastasia Cojocaru"));
  if (status === "Inactiv") events.unshift(ev(daysAgo(150 - i * 10, 12), "Certificat dezactivat", i === 6 ? "Certificat de test, expirat." : "Organizația a trecut pe certificatul AGE.", "Cristina Moraru"));
  return { id, name, subject, issuer, serial: hex(16).toUpperCase(), thumbprint: thumb(), keyAlgorithm, validFrom: iso(from).slice(0, 10), validTo: iso(to).slice(0, 10), status, rotation, usedBy, uploadedAt: iso(uploadedAt), uploadedBy: events[events.length - 1].user, events: events.sort((a, b) => (a.at < b.at ? 1 : -1)) };
});

/* ---- Utilizatori (US-UI-13) — from MPass; roles from the identity system ---- */
const AGENTS = [
  ["Chrome 141, Windows 11", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.66 Safari/537.36"],
  ["Edge 141, Windows 11", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.3537.57"],
  ["Firefox 143, Ubuntu", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0"],
  ["Safari 18, macOS", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"],
  ["Safari, iPhone (iOS 18)", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"]
];
const ROLE = { admin: "Administrator platformă", operator: "Operator (revizie)", supervisor: "Supervizor", auditor: "Auditor" };
const USERS = [
  ["Anastasia Cojocaru", "anastasia.cojocaru@egov.md", ["admin", "operator", "supervisor", "auditor"], "Activ", 0, 420, 3, 0],
  ["Cristina Moraru", "cristina.moraru@egov.md", ["admin"], "Activ", 0, 395, 2, 1],
  ["Sergiu Munteanu", "sergiu.munteanu@egov.md", ["supervisor"], "Activ", 1, 300, 2, 2],
  ["Olga Bejan", "olga.bejan@egov.md", ["supervisor", "auditor"], "Activ", 0, 250, 1, 3],
  ["Elena Ciobanu", "elena.ciobanu@egov.md", ["operator"], "Activ", 0, 280, 2, 0],
  ["Mihai Rotaru", "mihai.rotaru@egov.md", ["operator"], "Activ", 2, 275, 1, 4],
  ["Ana Grosu", "ana.grosu@egov.md", ["operator"], "Activ", 0, 190, 1, 0],
  ["Ion Bivol", "ion.bivol@egov.md", ["operator"], "Suspendat", 0, 260, 0, 1],
  ["Natalia Popescu", "natalia.popescu@cna.md", ["auditor"], "Activ", 0, 120, 1, 2],
  ["Dorin Ceban", "dorin.ceban@egov.md", ["auditor"], "Blocat", 5, 98, 0, 1],
  ["Andrei Țurcanu", "andrei.turcanu@egov.md", ["operator"], "Activ", 0, 2, 0, 0]
];
const users = USERS.map(([name, email, roles, status, failedLogins, age, activeN, revokedN], i) => {
  const id = `usr-${String(i + 1).padStart(2, "0")}`;
  const createdAt = daysAgo(age, 9, 10 + i);
  const work = [];
  const lastLogin = status === "Activ" && age > 2 ? add(NOW, -(600 + i * 1700)) : status === "Activ" ? null : daysAgo(4 + i, 9, 12);
  for (let k = 0; k < activeN + revokedN + (age > 2 ? 2 : 0); k += 1) {
    const revoked = k >= activeN && k < activeN + revokedN;
    const expired = k >= activeN + revokedN;
    const issued = !revoked && !expired ? add(lastLogin || NOW, -k * 5400) : daysAgo(1 + k * 3, 8 + k, 20);
    const [short, ua] = AGENTS[(i + k) % AGENTS.length];
    work.push({
      id: `${id}-t${k + 1}`, ip: `${pick([10, 172])}.${16 + (i % 8)}.${Math.floor(rnd() * 250)}.${Math.floor(rnd() * 250)}`, browser: short, userAgent: ua,
      issuedAt: iso(issued), expiresAt: iso(add(issued, 3600)), absoluteExpiresAt: iso(add(issued, 43200)),
      lastActivityAt: iso(add(issued, 300 + Math.floor(rnd() * 2400))), revoked: revoked || expired,
      revokedReason: revoked ? pick(["Revocată de administrator", "Deconectare de pe toate dispozitivele"]) : expired ? "Expirată" : "",
      current: i === 0 && k === 0
    });
  }
  /* active sessions keep a future expiry */
  work.forEach((w) => { if (!w.revoked) { w.lastActivityAt = iso(add(NOW, -(60 + Math.floor(rnd() * 600)))); w.expiresAt = iso(add(NOW, 1800 + Math.floor(rnd() * 1800))); } });
  const events = [ev(createdAt, "Cont creat la prima autentificare MPass", `Roluri din MPass: ${roles.map((r) => ROLE[r]).join(", ")}`, "MPass")];
  if (status === "Suspendat") events.unshift(ev(daysAgo(3, 16, 40), "Cont suspendat", "Concediu de lungă durată; accesul se reactivează la revenire.", "Cristina Moraru"));
  if (status === "Blocat") events.unshift(ev(daysAgo(1, 8, 55), "Cont blocat automat", "5 autentificări eșuate consecutive.", "Platforma eKYC", "Eșuat"));
  if (revokedN) events.unshift(ev(daysAgo(2, 13, 5), "Sesiune de lucru revocată", "Sesiune rămasă deschisă pe un calculator partajat.", "Anastasia Cojocaru"));
  return {
    id, name, email, mpassId: uuid(), roles: roles.map((r) => ROLE[r]), status, failedLogins,
    lastLoginAt: lastLogin ? iso(lastLogin) : null, createdAt: iso(createdAt), sessions: work.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1)), events: events.sort((a, b) => (a.at < b.at ? 1 : -1))
  };
});

/* ---- audit trails for the screens that show one ---- */
useCases.forEach((uc) => { uc.events = uc.versions.map((v) => ({ at: v.at, type: `Versiunea v${v.version} publicată`, status: "Reușit", detail: v.change, user: v.by })); });
scoring.forEach((s) => { s.events = [ev(new Date(s.updatedAt), "Configurație actualizată", `Prag acceptare ${String(s.accept).replace(".", ",")} · prag respingere ${String(s.reject).replace(".", ",")}`, s.updatedBy), ev(new Date(s.createdAt), "Configurație creată", s.name)]; });
providers.forEach((p) => { p.events = [ev(new Date(p.lastHealthCheck), "Verificare de sănătate", `${p.health}${p.latency != null ? ` · ${String(p.latency).replace(".", ",")} s` : " · fără răspuns"}`, "Platforma eKYC", p.health === "Indisponibil" ? "Eșuat" : "Reușit"), ev(new Date(p.updatedAt), "Configurație actualizată", "Timeout · reîncercări", p.updatedBy), ev(new Date(p.createdAt), "Furnizor adăugat", p.name)]; });

const data = { now: sessions.now, organizations, clients, useCases, providers, scoring, parameters, sdk, trustedCas, users };
fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(`wrote ${out}: ${organizations.length} organizații, ${clients.length} clienți, ${useCases.length} cazuri, ${providers.length} furnizori, ${scoring.length} scoring, ${parameters.length} parametri, ${sdk.length} SDK, ${trustedCas.length} CA, ${users.length} utilizatori`);
