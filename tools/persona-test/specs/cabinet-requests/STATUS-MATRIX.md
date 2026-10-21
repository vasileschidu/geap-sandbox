# EVO Cabinet · „Solicitările mele” — status matrix (stories vs prototype)

Compiled 2026-10-20 from Azure DevOps (GEAP + one MCabinet item) — raw texts are in this folder (`US-<n>.md`,
`Feature-<id>.md`, `MCabinet-95895.md`) plus the Feature 90817 attachment
`attachments/matrice-statute-actiuni-solicitare.xlsx` (the official „Matrice acțiuni contextuale”, transcribed in §0).
Prototype read: `cabinet-evo/solicitari.js`, `cabinet-evo/notificari.js`, `data/cabinet-evo-solicitari.json`,
`js/demo-states.js` (sm-*, nt-*), `core/case-flow.js`. Nothing was edited.

## Sources

| Item | Title | State | Role in this matrix |
|---|---|---|---|
| Feature 90817 | Solicitările mele în EVO Cabinet | Active | scope, statuses, actions per status, contestație, notifications |
| US-18 (88206) | Finalizarea depunerii în FOD2 → EVO Cabinet | New | landing after filing, auto-submit of signed+paid drafts |
| US-19 (88207) | Lista solicitărilor depuse | Active | statuses, BO→EVO mapping, countdowns, row actions, tacit mark, notifications AC-20/21 |
| US-21 (88494) | Salvare schiță și reluare din EVO Cabinet | Active | draft message + timer from first save |
| US-24 (88527) | Suplinire informații din EVO Cabinet / FO | Active | „Suplinire informații”, expiry → În derulare |
| US-25 (88528) | Suplinire S4 — motivul suspendării | Active | S4 fields (FO side) |
| US-28 (88531) | Suplinire S8 — confirmare | Resolved | notification on suplinire, status back |
| US-29 (88532) | Continuarea / eliminarea schiței | Resolved | „Continuă schița” / „Elimină schița”, auto-removal |
| US-135 (90946) | Notă de plată și achitare MPay | Closed | „Achitare”, MPay return, expired fee |
| US-158 (91295) | Căutare, filtrare, sortare, paginare | Resolved | filters / empty / error |
| US-159 (91297) | Reguli acces beneficiar / reprezentant | New | MPower read-only |
| US-161 (91355) | Profilul dosarului | Active | tabs Date generale / Date solicitare / Taxe / Act-Decizie |
| Feature 90818 | Acte permisive în EVO Cabinet | New | post-processes + contestație from /permits |
| Feature 91426 | Notificări Solicitant EVO | New | notifications compartment (no child stories yet) |
| Feature 89533 | Post-Procese | Active | request types (reperfectare, prelungire, duplicat, suspendare, reluare, retragere) |
| US-55 (89470), US-191 (94132), US-58 (89552), US-62 (89601) | post-process initiation / retragere / reperfectare | New / Resolved | post-process request content |
| US-16 (88204), US-134 (90945), US-166 (91535) | livrare / emitere fizică / MDelivery | Resolved / Active / New | paper delivery |
| US-17 (88205) | Notă de plată în schiță | Resolved | fee note statuses in draft |
| US-126 (90795), US-129 (90797) | suspendare fără / cu decizie | New | why a dossier is suspended, notification content |
| US-157 (91270) | Aprobare tacită (automat) | New | „Aprobat Tacit”, act de constatare to the applicant |
| US-118 (90763), Feature 93592, Feature 94407 | taxă în examinare / notă de plată | Active / New | fee during exam, expiry, note statuses |
| Feature 95770, US-253 (95791) | suplinire în BO | New | suplinire expiry, notifications |
| US-237 (95775), US-238 (95776), US-256 (95839), US-248 (95786) | ghișeu fee / draft (BO) | New | statut + substatut model (Respins formal / Plată expirată, Schiță / Eliminat) — reference only |
| **MCabinet 95895** | Solicitările mele: Sesizările mele + nota de plată expirată | Approved | **„Plată expirată”** status (contradicts US-19 AC-07) |

Not found in Azure: any story for the applicant **withdrawing / cancelling a submitted request** („retragere
cerere”, „anulare cerere”), a **Contestație** request story (only US-55 „altele decât Contestare”), child stories of
Feature 91426, stories for post-processes „Suspendare valabilitate” / „Reluare valabilitate” (Feature 89533 says
„postprocesul încă nu deține US”).

---

## 0. The official matrix (Feature 90817 attachment, verbatim)

| Statut | Acțiuni contextuale | Redirect FOD2 | Eliminare | Cronometru | Observații |
|---|---|---|---|---|---|
| Schiță | Continuare, Eliminare | Da | Da | Da | nedepusă în BO; cronometru până la eliminarea automată; continuare → FOD2; eliminare → mesaj de confirmare |
| În derulare | Vizualizare detalii | Nu | Nu | Da | depuse, în avizare, returnate după achitare / după suplinire, după expirarea avizărilor, **după expirarea perioadei de achitare**, **după expirarea perioadei de suplinire**; cronometru = perioada de examinare |
| Spre achitare | Vizualizare detalii, Achitare | Nu | Nu | Da | taxe adăugate în examinare (altele decât cele la inițiere); Achitare → MPay; cronometru = perioada admisă de achitare |
| Informații suplimentare | Vizualizare detalii, Suplinire info | Da | Nu | Da | Suplinire → FOD2; cronometru = perioada admisă pentru suplinire |
| Finalizat | Vizualizare detalii, Descărcare din MDocs, Contestație | Da (contestație) | Nu | **Da (doar pe perioada admisă pentru contestație)** | examinare finalizată (semnare act/decizie); contestație doar unde serviciul o permite |

BO → EVO mapping (US-19 Assumptions): „Dosar în derulare” + „Dosar la expert” → **În derulare**; „În așteptarea plății” →
**Spre achitare**; „Dosar suspendat” → **Informații suplimentare**; „Dosar finalizat” + „Dosar arhivat” → **Finalizat**.
Prototype engine `core/case-flow.js` STATUS: `0 Inițiat · 2 În lucru · 3 Suspendat · 4 Plată suplimentară · 9 Finalizat`
→ EVO: 0 and 2 → În derulare, 3 → Informații suplimentare, 4 → Spre achitare, 9 → Finalizat; Schiță has no BO status
(request not yet in BO). Unmapped BO states: „Aprobat Tacit” (US-157 AC-09), „Act permisiv spre imprimare / spre
eliberare”, „Livrare MDelivery” (US-134 / US-166), „Respins formal · Plată expirată” (US-237, ghișeu) — see PO questions.

---

## 1. STATUS MATRIX

Tones below = the prototype's REQUEST_UI convention (`solicitari.js` ~l.262): tag neutral / info / warning / success;
row alert warning = applicant must act, info = waiting, danger = expired. „—” = nothing.

### 1.1 Schiță

| Variant | List row | Profile | Notifications | ACs | Prototype |
|---|---|---|---|---|---|
| **S1 Schiță activă** (nesemnată / neachitată) | Tag „Schiță” neutral · alert warning „Schița se elimină automat pe **{data}** · mai sunt N zile…” (countdown from **first save**, never reset) · primary „Continuă” → FOD2 last saved step · ⋮ Detalii, Elimină schița (danger) · date „Creată {data}” | Header meta Creată / Se elimină automat · Stadiu: „Schiță nedepusă · se elimină automat pe …” + step · actions Continuă schița (primary), Elimină schița · tabs Date generale, Date solicitare (no certificate) · no Taxe, no Act | „Schița a fost salvată” (prototype) | US-19 AC-05, AC-09, AC-10 · US-29 AC-01/02 · US-21 AC-03/04 · matrix row 1 | sm-01b, sm-02, sm-03 ✔ |
| S1-pp Schiță de postproces | as S1, Tipul = Reperfectare/…, „Nr. actului anterior” | as S1 | as S1 | US-29 Constraints („toate tipurile de postprocese”) · US-161 AC-08 | sm-03c ✔ |
| S1-del Eliminare manuală | confirm dialog → row disappears · toast | — | — | US-29 AC-01 · Feature 90817 | sm-03a (profile), sm-03b (row) ✔ |
| **S2 Schiță expirată → eliminată automat** | row disappears; **„utilizatorul este notificat”** | profile unreachable | notification of auto-removal (text not specified) | US-29 AC-02 · US-19 AC-05 · US-21 edge case | ✔ 2026-10-20: d-cuptor (expires < today → not listed), sm-03d (deep link → „eliminată automat” notice), nt-01d („Schița a fost eliminată automat”) |
| S3 Schiță cu notă de plată „În așteptare” (taxă la inițiere sau MDelivery, nedepusă) | Schiță + countdown; draft fee note status visible? | Taxe tab with note „În așteptare” (US-161 AC-18 shows Taxe if a note exists) | note generated (US-17) | US-17 AC-01/04 · US-161 AC-18 | ✔ 2026-10-20: d-aroma, sm-03g (Taxe „În așteptare”; Stadiu text; confirm „Elimină” says the note is cancelled) |
| S4 Schiță semnată + achitată, nedepusă (grație → auto-transmisă) | still Schiță until the BO auto-submit; on failure stays Schiță, can be retransmitted manually | — | submission notification after auto-submit | US-18 AC-09 · US-29 („schițele nesemnate și neachitate” have the timer) | ✔ 2026-10-20: d-gustul, sm-03h („Semnat electronic” tag in row + Stadiu, timeline signed → paid → „Confirmarea depunerii”); the removal date still shows (PO Q5 open) |
| S5 Durată neconfigurată | countdown absent or generic placeholder | — | — | US-29 AC-02 Erori | ✘ (low) |
| S6 Erori | „Continuă” redirect fails → message + „Reîncercați”; „Elimină” fails → message + „Reîncercați” | same in profile | — | US-29 AC-01 Erori | ✔ 2026-10-20: sm-03e („Continuă schița” → „Schița nu s-a deschis…” + „Reîncercați”, also ⋮ / row, `?redirectionare=eroare`), sm-03f (first „Elimină” fails → message + „Reîncercați” in the dialog, `?eliminare=eroare`) |

### 1.2 În derulare

| Variant | List row | Profile | Notifications | ACs | Prototype |
|---|---|---|---|---|---|
| **D1 În examinare** | Tag „În derulare” info · alert info „Răspuns până la **{termen}** · countdown” (examination term, recalculated after suspension / payment) · no primary · ⋮ Detalii, Descarcă certificatul constatator · no „pending action” mark | Stadiu „În examinare · termen …” · Date generale (Termenul de examinare) · Date solicitare (certificat constatator, Livrare, Taxe la inițiere) · Taxe if a note exists · no Act | „Solicitarea a fost depusă” | US-19 AC-08, AC-09 · US-161 AC-06, AC-14 · US-18 AC-10 | sm-01, sm-02a, sm-04 ✔ |
| D1-new Just filed (landing from FOD2) | first row, „is-new”, success notice „Cererea a fost depusă…” | — | submission | US-18 AC-04/10 | sm-08, sm-08b ✔ |
| D1-pp Postproces în examinare (Prelungire / Reperfectare) | as D1, Tip = postproces | Nr. actului anterior | — | US-161 AC-08 · Feature 89533 | list only (d-lab-prelungire); profile sm-07a (reperfectare, MPower) ✔ |
| **D2 Revenit după achitare** | back to D1, term recalculated | Taxe: Achitat + Data achitării | „Plata a fost confirmată … nota de plată nr. [X] a fost achitată cu succes” | US-135 AC-04…09 · US-19 AC-08 | sm-04e ✔ (notice), nt-01 event ✔ |
| **D3 Revenit după suplinire** | back to D1, term recalculated | Data suspendării stays (AC-05) | „actualizare cu succes” to applicant | US-24 AC-19/20 · US-28 AC-03/04 | ✔ 2026-10-20: d-livada, sm-04j (Stadiu „Informațiile … au fost transmise”, timeline suspended → transmise → „Examinare reluată”), nt-01e („Informațiile au fost transmise”) |
| **D4 Revenit după expirarea suplinirii** (BO reactivates) | back to D1; „Suplinire informații” gone | — | expiry notification (Feature 95770: „solicitantul și Specialistul responsabil sunt notificați prin MNotify”) | US-19 AC-06 · US-24 AC-03 · Feature 95770 | ✔ 2026-10-20: d-prut-exp + `normalize()` (an „info” past its term → „În derulare”, the danger branch is gone), sm-04i (Stadiu + timeline „Suspendare încheiată” → „Examinare reluată”, Data suspendării kept), nt-01f („Termenul de suplinire a expirat”) |
| **D5 Revenit după expirarea notei de plată** (US-19 version) | status → „În derulare”, „Achitare” disappears | Taxe: Expirat | expiry notification (US-237 AC-20 analogue) | US-19 AC-07 · matrix row 2 | ✘ — prototype keeps „Spre achitare” + danger alert (sm-04g/g1); MCabinet 95895 says „Plată expirată” → PO Q1 |
| **D6 Disponibilă aprobarea tacită** | icon + „Disponibilă aprobarea tacită” (tooltip = explanatory note) · alert info „Termenul de examinare a expirat pe …” · no countdown | Stadiu „În examinare · termenul a expirat…” + mark | — | US-19 AC-15 · Feature 90817 | sm-01k, sm-04a ✔ (but see Aprobat tacit, PO Q2) |
| D7 Emitere fizică (spre imprimare / eliberare la ghișeu / Livrare MDelivery) | unspecified — BO state after signing, before „Dosar finalizat” | Livrare: „Pe hârtie la instituția emitentă” / „Pe hârtie prin MDelivery” + adresă | courier handover „notifică Solicitantul” (US-166) | US-134 · US-166 · US-16 · US-161 AC-16 | ✔ 2026-10-20 (profile only): `delivery` per dossier — Livrare shows EVO Cabinet + „Pe hârtie prin MDelivery” + address (d-fresh, sm-04l) or „Pe hârtie la instituția emitentă” + place (d-livada); timeline „Act emis” says where. The in-between BO states stay PO Q4 |

### 1.3 Spre achitare

| Variant | List row | Profile | Notifications | ACs | Prototype |
|---|---|---|---|---|---|
| **P1 Notă emisă în examinare** | Tag „Spre achitare” warning · pending-action mark · alert warning „Achitați taxa până la **{data}** · countdown” · primary „Achitare” → MPay (pre-filled nr. cont, sumă, beneficiar) · ⋮ Detalii, Descarcă certificatul | Stadiu „Spre achitare · {sumă} până la …” · MPay badge button · Taxe tab: Nr. notă, Nr. dosar, Statutul notei „În așteptare”, Suma, Data creării | „Aveți o notă de plată de achitat” with the pay link (EVO + e-mail) | US-19 AC-07, AC-09 · US-135 AC-01/02/03 · US-161 AC-18…21 | sm-01a, sm-02b, sm-04c, sm-04d, nt-01c ✔ |
| P1-av Taxă de avizare | as P1; after payment → În derulare | — | — | US-135 AC-05 | ✘ (no avizare fee sample; low) |
| P2 Plată anulată / eroare MPay | status unchanged, retry from „Achitare” or the notification | fee „În proces” (US-135) | — | US-135 AC-10/11 | sm-04f ✔ (notice text) |
| P3 Achitată | → D2 | | | US-135 AC-04/07/08 | sm-04e ✔ |
| **P4 Notă expirată** | US-19 AC-07: → În derulare (D5) · MCabinet 95895: „Plată expirată”, text „Nota de plată a expirat”, no pay button, in Finalizate · link/button on an expired fee → „Taxa a expirat. Achitarea nu mai este posibilă.” (US-135 AC-14) | Taxe: Expirat | expiry notification | US-19 AC-07 · US-135 AC-14 · MCabinet 95895 C | sm-04g, sm-04g1, nt-01a — **status kept „Spre achitare”** (third variant) → PO Q1 |
| P5 Notă anulată (dosar returnat înainte de achitare) | → În derulare | Taxe: Anulat | — | Feature 94407 · Feature 93592 | ✘ (low) |

### 1.4 Informații suplimentare

| Variant | List row | Profile | Notifications | ACs | Prototype |
|---|---|---|---|---|---|
| **I1 Suspendat, suplinire activă** | Tag „Informații suplimentare” warning · pending-action mark · alert warning „Trimiteți informațiile cerute până la **{data}** · countdown” · primary „Suplinire informații” → FOD2 S4 · ⋮ Detalii, Descarcă certificatul | Stadiu „Necesită informații suplimentare · până la …” + reason · Date generale: Data suspendării, Termenul de examinare · action „Suplinește informații” | „Autoritatea a cerut informații suplimentare” — must contain **motivul suspendării + neconformitățile depistate** (US-126 AC-16); for a signed suspension decision, the link to the decision (US-129 AC-12) | US-19 AC-06, AC-09, AC-10 · US-24 AC-01/02 · US-161 AC-05/06 · US-126 · US-129 | sm-01a, sm-02c, sm-04b ✔ |
| I1-err Redirect fails | error + „Reîncercați” | same in profile | — | US-24 AC-04 | sm-04h, sm-04h1 ✔ |
| I1-why Motivul suspendării | — (shown in FO S4: Număr dosar, Autoritatea, Subdiviziunea, Tipul solicitării, Motivul suspendării, „Examinare suspendată până la”) | prototype shows the free text only | — | US-25 · US-126 reasons: „Detalii solicitare incorecte/incomplete”, „Documente adiționale incorecte/incomplete”, „Alte” | partial (reason text only, no category) |
| **I2 Termen de suplinire expirat** | → În derulare (D4) | — | expiry notification | US-19 AC-06 · US-24 AC-03 | ✔ 2026-10-20 → D4 (sm-04i) |

### 1.5 Finalizat

**outcome-tag-v1 (2026-10-21, user):** a finalized request shows ONE tag = its outcome — „Aprobat” success,
„Aprobat tacit” blue, „Respins” danger (any other `result` as it is; „Finalizat” only when the outcome is unknown) —
never „Finalizat” + outcome; screen readers hear „Aprobat (finalizată)”. The „Statut” filter lists the same labels
(Aprobat / Aprobat tacit / Respins instead of „Finalizat”).

| Variant | List row | Profile | Notifications | ACs | Prototype |
|---|---|---|---|---|---|
| **F1 Aprobat — act emis** | Tag „Aprobat” success (only; outcome-tag-v1) · primary „Vezi actul” · ⋮ Detalii, Descarcă actul (MDocs), Depune contestație (in window) · **countdown of the appeal window** (matrix) | Stadiu „Aprobată pe … · actul este disponibil” · actions Vezi actul, Descarcă actul, Depune contestație · tab **Act**: Titlul, Nr. dosar, Beneficiar, Valabil din, Valabil până la (only if limited), Data emiterii, Emisă de, Numărul actului, Subdiviziunea de examinare, service-specific fields | „Actul permisiv a fost emis” | US-19 AC-16 · US-161 AC-22…30 · Feature 90817 | sm-01c, sm-02d, sm-05, sm-05l, sm-05n ✔ · appeal countdown ✘ |
| **F2 Respins** | Tag „Respins” danger (only; outcome-tag-v1) · ⋮ Detalii, Descarcă decizia (MDocs), Depune contestație (in window) · appeal countdown | Stadiu „Respinsă pe …” + appeal until · tab **Decizie**: Motivul refuzului (oblig.), Temei legal, Recomandări (only if filled) | „Solicitarea a fost respinsă” | US-19 AC-16 · US-161 AC-31…35 · Feature 90817 | sm-02e, sm-05a, sm-05m ✔ · appeal countdown in row ✔ 2026-10-20: info alert „Puteți depune contestație până la … · countdown · Depune contestație →” (sm-05o; 30 days = assumption, PO Q3) |
| F2-x Fereastra de contestație închisă | no Contestație, no countdown | — | — | matrix · Feature 90817 | data d-izvoras / d-bistro (implicit) ✔ |
| F3 Postproces fără act nou (Retragere / Suspendare / Reluare) | Tag „Aprobat” (only), Descarcă decizia | tab Decizie (content of the decision) | „Decizia a fost emisă” | Feature 89533 („modifică statutul actului fără act nou”) | sm-05b (retragere) ✔ · suspendare sm-05q, reluare sm-05r ✔ 2026-10-20 |
| F3-r Postproces cu act nou (Reperfectare / Prelungire / Duplicat) | as F1, Nr. actului generat + anterior | | | US-161 AC-07/08 | sm-05n (reperfectare) ✔ · prelungire sm-04k (in examination) · duplicat sm-05p (Act: „Exemplar — Duplicat al actului …”, validity of the original) ✔ 2026-10-20 |
| **F4 Aprobat tacit** | Tag „Aprobat tacit” blue (only; outcome-tag-v1, demo `?tacit-dosar=`, sm-05t / sm-05u — tag only, the rest open) · US-157: dossier → „Aprobat Tacit”, act de constatare sent to the applicant (EVO + e-mail); no EVO mapping defined | download of the act de constatare (MDocs) — not in US-161 | „Actul de constatare a aprobării tacite” (US-157 AC-07) | US-157 AC-07/09 · US-160 (RAP) | ✘ (only the pre-state D6 exists; its text „vă anunțăm imediat ce decizia este emisă” contradicts US-157) |
| F5 Plată expirată (MCabinet 95895) | status „Plată expirată”, „Nota de plată a expirat” under the service name, in „Finalizate” | no extra message / button | — | MCabinet 95895 C | ✘ → PO Q1 |
| F6 Contestație (request type) | a request of Tip „Contestație” goes through the same statuses | Tipul dosarului = Contestație | — | US-161 enum · Feature 90817 | ✘ no sample; FO ignores `?contestatie=` |

### 1.6 Cross-cutting

| Case | Expected | ACs | Prototype |
|---|---|---|---|
| Reprezentant cu MPower valabil | same list / actions as beneficiary, authorization card | US-159 AC-03 · US-19 AC-18 | sm-07, sm-07a ✔ |
| MPower expirat / revocat | read-only: only Nr. dosar, Serviciu, Data depunerii, Statut la expirare; no actions, no live updates; info message | US-159 AC-05…08 · US-19 AC-19 · US-158 AC-15 | sm-07b, nt-01b ✔ |
| MPower indisponibil | „A apărut o eroare. Verificarea drepturilor de reprezentare nu a putut fi efectuată. Încercați din nou.” | US-159 AC-10 | sm-07c ✔ |
| Beneficiar — depusă de un reprezentant cu împuternicire expirată | live status + all actions | US-19 AC-17 · US-159 AC-02 | ✔ 2026-10-20: d-depozit-reperf `filedBy`, sm-05s (Date solicitare: Beneficiar + „Depusă de reprezentant” + MPower card „Expirată”; timeline „Semnată … de Mihai Rusu în baza împuternicirii MPower”; every action kept) |
| Erori listă / căutare / descărcare | texts per AC | US-19 AC-13/14 · US-158 AC-13/14 | sm-06, sm-06a, sm-01e, sm-05c ✔ |
| Sesizările mele tab | tabs „Servicii publice” / „Sesizările mele” | MCabinet 95895 A/B | ✘ (out of GEAP scope; PO Q) |

---

## 2. Covered (demo state → what it shows)

- **List:** sm-01 (all statuses), sm-01a (Necesită atenție), sm-01b (Schiță), sm-01c (Statut = Aprobat + Respins), sm-01d/e (search hit / no result), sm-01f/m (sort), sm-01g/h/i/n (filters, invalid range), sm-01j/l (pager), sm-01k (tacit tooltip), sm-01s (avatar menu).
- **Row menus:** sm-02 Schiță · sm-02a În derulare · sm-02b Spre achitare · sm-02c Informații suplimentare · sm-02d Finalizat aprobat · sm-02e Finalizat respins.
- **Schiță:** sm-03 profile · sm-03a delete from profile · sm-03b delete from row · sm-03c post-process draft · sm-08a draft-saved landing.
- **În derulare / Spre achitare / Info:** sm-04 (D1), sm-04a (D6 tacit available), sm-04b (I1), sm-04c/d (P1 + MPay stand-in), sm-04e (P3 paid), sm-04f (P2 cancelled), sm-04g/g1 (P4 expired — status kept), sm-04h/h1 (I1 redirect error).
- **Finalizat:** sm-05 / 05l (F1 + Act tab), sm-05a / 05m (F2 + Decizie), sm-05b (F3 retragere), sm-05c (download error), sm-05e…h, 05j, 05k (Date solicitare / documents / Taxe), sm-05n (reperfectare act fields), sm-05d / 05i (Actele mele).
- **Errors / access:** sm-06, sm-06a, sm-07, sm-07a, sm-07b, sm-07c.
- **Landing:** sm-08, sm-08b.
- **Notifications:** nt-01 (events), nt-01a (expired fee message), nt-01b (read-only rep.), nt-01c (pay from notification).
- **Status-matrix gaps closed (2026-10-20, proto-engineer):** sm-03d (draft removed automatically) · sm-03e / sm-03f
  (Continuă / Elimină errors + „Reîncercați”) · sm-03g (draft with a pending payment note) · sm-03h (signed + paid draft)
  · sm-04i (suplinire expired → În derulare) · sm-04j (suplinire sent) · sm-04k (Prelungire) · sm-04l (paper delivery,
  MDelivery) · sm-05o (appeal countdown on a refused row) · sm-05p (Emitere duplicat) · sm-05q (Suspendarea valabilității)
  · sm-05r (Reluarea valabilității) · sm-05s (filed by a representative, MPower expired) · sm-08a (US-21 text) · nt-01d
  (draft removed) · nt-01e (suplinire sent) · nt-01f (suplinire expired) · nt-01g (suspension with „Motivul suspendării” +
  „Neconformități depistate”, US-126 AC-16). The draft profile carries the US-21 message „Schița salvată dar nefinisată va
  fi ștearsă automat în decursul a 30 de zile.” (sm-03…03h; „a” added for Romanian grammar).
- **Row actions + row click (2026-10-20, row-kebab-v1, user):** every row's actions sit in ONE icon-only ⋮ („Acțiuni ⌄”
  was „too ambiguous”; phones: absolute in the card's top-right corner); a row with only „Detalii” keeps the lone
  „👁 Detalii”. A click / Enter on ANY row — drafts included — opens the request's details (draft = sm-03i), never the
  FO flow: „Continuă schița”, „Suplinire informații”, „Achită”, „Depune contestație” stay explicit (⋮, the alert's
  inline link, the details page). S1 above: the draft row's „Continuă” is the ⋮ item / profile button, not the row.
- Prototype additions **not in any story** (fine, but undocumented for the PO): the „Stadiul solicitării” card with the
  vertical trajectory (US-161 has no such section), the „Necesită atenție” chip, „Ai nevoie de ajutor?” section,
  „Descarcă certificatul constatator” in ⋮ of open requests.

---

## 3. Gaps to build (proto-engineer, in priority order)

Ids follow the existing numbering; new data rows go in `data/cabinet-evo-solicitari.json › perspectives.pj-global-trader.dosare`.

1. **sm-04i — Informații suplimentare expirat → În derulare (US-19 AC-06, US-24 AC-03).** New dossier `d-nistru-exp`
   (status `derulare`, `suspended` set, `info.until` < today, `resumed: "expirat"`). Row: D1 + no „Suplinire informații”.
   Profile: Data suspendării kept; Stadiu text e.g. „Termenul de suplinire a expirat pe {data}. Examinarea a fost
   reluată fără informațiile cerute.” (wording to confirm). Notification in notificari.js: „Termenul de suplinire a
   expirat” (Feature 95770). **Remove** the `info` danger branch in REQUEST_UI (`Termenul de suplinire a expirat pe …`)
   — the stories never show an expired „Informații suplimentare” row.
2. **Expired payment note — rebuild sm-04g / sm-04g1 after PO Q1.** Today: Spre achitare + danger alert. If PO picks
   US-19 AC-07 → row = În derulare, no „Achitare”, Taxe „Expirat”. If PO picks MCabinet 95895 → new status
   `plataExpirata` (label „Plată expirată”, under the title „Nota de plată a expirat”, no pay button, no extra message
   in the profile, counted in „Finalizate”, not in „Necesită atenție”). Keep nt-01a (US-135 AC-14 text
   „Taxa a expirat. Achitarea nu mai este posibilă.” from the notification link).
3. **Appeal countdown on Finalizat rows (matrix: „Cronometru: Da, doar pe perioada admisă pentru contestație”).**
   `deadlineOf()` returns nothing for `finalizat`; add an info alert while `canAppeal`: e.g. „Puteți depune contestație
   până la **{data}** · mai sunt N zile” (wording to confirm) — states sm-02d / sm-02e / sm-05a pick it up.
4. **sm-05o — Aprobat tacit (US-157 AC-07/09).** After PO Q2. Dossier `d-gara-tacit` finalizat, `result: "tacit"`,
   mark „Aprobat tacit” (the RAP blue tag), primary „Descarcă actul de constatare” (MDocs), Act tab = Act de constatare
   a aprobării tacite (fields as RAP US-160). Notification „Actul de constatare a aprobării tacite a fost emis”.
   Fix D6 Stadiu text (`statusNow` derulare+tacit): drop „vă anunțăm imediat ce decizia este emisă”.
5. **sm-03d — Schiță eliminată automat (US-29 AC-02, US-21).** Notification „Schița a fost eliminată automat”
   (wording to confirm) + the row absent; and a near-expiry draft (≤ 1 day, countdown in hours) to show the urgent
   state. Fix the draft-saved notice (sm-08a) to the US-21 AC-03 text: „Schița salvată dar nefinisată va fi ștearsă
   automat în decursul {Timp setat}.” (currently „Schița a fost salvată. O puteți continua oricând până la eliminarea
   automată.”).
6. **sm-03e / sm-03f — draft errors (US-29 AC-01).** `?redirectionare=eroare` on „Continuă” → message + „Reîncercați”
   (reuse `redirectError`, text for drafts e.g. „Schița nu s-a deschis. Datele salvate nu s-au pierdut.”);
   `?eliminare=eroare` → message + „Reîncercați” in the confirm dialog.
7. **sm-04j — Revenit după suplinire (US-24 AC-19/20, US-28 AC-03/04).** `?suplinit=d-nistru` return: row → În
   derulare, success notice; add the missing notificari.js event „Informațiile au fost transmise cu succes” (the
   file header claims US-24 AC-19 but `eventsOf` has no such event).
8. **Notification content for suspension (US-126 AC-16, US-129 AC-12).** The info notification text must carry the
   reason + „Neconformități depistate”; add the suspension-reason category (one of the three US-126 values) to
   `d-nistru.info` and show it in the Stadiu card (`Motivul suspendării: Documente adiționale incorecte/incomplete`).
9. **Paper delivery (US-16, US-161 AC-16, US-134/166).** Data field `delivery` per dossier; Livrare section shows the
   selected method(s): „Livrare EVO Cabinet”, „Pe hârtie la instituția emitentă”, „Pe hârtie prin MDelivery” +
   address (Raion, Localitate, Stradă, Număr, Bloc, Apartament/oficiu, Cod poștal). Add one finalised dossier with
   MDelivery (sm-05p) after PO Q4 on the in-between statuses.
10. **Draft with pending fee note / signed+paid draft (US-17, US-18 AC-09).** sm-03g: Schiță with Taxe tab
    (note „În așteptare”); sm-03h: signed + paid, awaiting auto-submission (no removal countdown — PO Q5).
11. **Post-process coverage (US-161 enum).** Profiles for Prelungire (d-lab-prelungire exists, no demo state →
    sm-04k), Emitere duplicat, Suspendarea / Reluarea valabilității (decision-only, like retragere), Contestație
    (after PO Q3).
12. **Beneficiary view of a request filed by a representative (US-19 AC-17, US-161 AC-11).** One dossier with
    `filedBy` ≠ user: Date solicitare shows the representative separately; live + actions.
13. **Small:** `statuses.*.tag` in the JSON (`status-tag--brand / --accent …`) is stale vs REQUEST_UI tones —
    align or drop; `core/case-flow.js` gives node „Verifică și semnează MSign” statusId 9 (Finalizat) before the
    signature, while US-161 AC-22 shows Act/Decizie only after signing.

---

## 4. PO questions (contradictions between stories)

1. **Expired payment note — three answers.** US-19 AC-07 + the Feature matrix: status returns to **„În derulare”**,
   „Achitare” disappears. MCabinet 95895 (Approved): status **„Plată expirată”**, listed under **Finalizate**.
   US-237 (ghișeu, draft stage): **„Respins formal” / substatut „Plată expirată”**. The prototype keeps a third
   variant (Spre achitare + „Taxa a expirat…”). Which one is the EVO Cabinet rule, and does the dossier continue
   examination or end?
2. **Tacit approval.** US-19 AC-15 / Feature 90817: a mark „Disponibilă aprobarea tacită” on a request (status not
   changed). US-157 AC-09: the dossier moves to **„Aprobat Tacit”** and the act de constatare is sent to the applicant.
   Which EVO status does „Aprobat Tacit” map to (Finalizat + mark „Aprobat tacit”?), what is the explanatory hover
   text, and is the act de constatare downloadable from the request profile (US-161 has no field for it)?
3. **Where is a contestație started?** Feature 90817 / matrix: from „Solicitările mele” (Finalizat). Feature 90818:
   from „Acte permisive”. For Respins there is no act, so it must be in „Solicitările mele”; for Aprobat — both?
   Appeal period per service (prototype assumes 30 days). No Contestație story exists yet.
4. **Paper issuance states.** After signing, BO states „Act permisiv spre imprimare / spre eliberare”,
   „Livrare MDelivery” (US-134/166) are not in the US-19 mapping. Are they „În derulare” or already „Finalizat”
   (act downloadable)? Which notification does the applicant get at courier handover / failed delivery?
5. **Draft timer for signed + paid drafts.** US-29: the countdown applies to „schițele nesemnate și neachitate”;
   US-18 AC-09 auto-submits them after a grace period. Should these drafts show a countdown, a different message, or
   „Confirmă depunerea”?
6. **Fee status vocabulary.** US-161: În așteptare / Achitat / Anulat / Expirat · US-135: „În proces” → „Achitat” ·
   Feature 94407 / US-237: Emisă / Achitată / Parțial achitată / Neachitată / Expirată / Anulată / Rambursată. Which
   labels does the citizen see in the Taxe tab?
7. **Withdrawal / cancellation of a submitted request by the applicant.** Not in any story (Feature 90817: no way
   back after „Finalizează”). Is „Retrage cererea” out of scope? Same for a BO-cancelled request — which status?
8. **Suspension visibility.** US-161 shows only „Data suspendării”; should the profile also show the suspension
   reason category, „Neconformități depistate” and „Examinare suspendată până la” (they exist in FO S4, US-25), and
   the signed suspension decision (US-129 AC-12) under documents?
9. **Table vs stacked rows.** US-19 AC-02/03 require a table with sortable column headers; the prototype (user
   decision 2026-10-20) uses stacked act-style rows + a sort menu. Confirm the deviation with the PO.
10. **„Sesizările mele” tab (MCabinet 95895 A/B).** Is it in scope for the GEAP prototype?
11. **„Stadiul solicitării” + trajectory.** Prototype-only (no story). Accept as design addition, or remove?
12. **Notification texts.** No story fixes the applicant notification wording (Feature 91426 has no child stories);
    the prototype texts are invented — need PO/BA sign-off, plus the missing events: draft auto-removed, suplinire
    succeeded / expired, note reminder / expired, tacit act, courier handover.
