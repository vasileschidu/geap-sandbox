# FO — fluxul complet (de la catalog la post-procese)

Sursa: Azure GEAP, citit 12 oct 2026. Epic 88733 e-Services · Feature 88734 Generic Application Process
Steps · 88737 Serviciul 09 · 90817 Solicitările mele în EVO Cabinet · 90818 Acte permisive în EVO
Cabinet · 89533 Post-Procese. Design de referință: EVO Cabinet (`iitScYOwMYjDayuyrm3750`, paginile
„Solicitarile mele” `10:19047` și „Acte permisive” `444:9934`). Figma GEAP 2.0: pagina „↳ FO -> Full
Flows - 09” (`2389:45909`) și „↳ FO -> Post-procese” (`8440:119159`).

## Harta

```
INTRĂRI                       DEPUNERE (FOD2)                    IEȘIRI                 EVO CABINET
E1 Catalog → pagina serv. ─┐                                   ┌→ X1 S11 depusă ──→ Solicitările mele
E2 Link direct (fără sesiune)┼→ S2 MPass → S3 instanță ─┬→ S4…S11 ┤  X2 Salvează schița ─→ (Schiță)
E3 Notificare (MNotify/push)┘                           │         └→ X3 Ieșire/abandon ─→ transmitere automată (US-18 AC-09)
E4 Solicitările mele: Continuă schița / Suplinire ──────┘
E5 Catalog (are acte) → „Ce vrei să soliciți?” (US-191) → Solicitare nouă | post-proces
E6 Actele mele permisive → ⋮ post-proces (US-55) ───────→ FOD2 post-proces → S11 → Solicitările mele
E7 Solicitările mele → Achitare → MPay → înapoi în Solicitările mele (US-135, US-19 AC-07)
```

## Etape și story-uri

| # | Etapă | US | Prototip (stare) | Figma |
|---|---|---|---|---|
| E1 | Catalog servicii: căutare, filtre, pagina serviciului, „Solicită online” | US-10 88202, US-09 AC-01…03 | **lipsă** | doar schițe vechi (Post-procese › Entry points) |
| E2 | MPass: redirect, loading, eroare + „Reîncercați”, sesiune expirată | US-11 88203 | `fo-01` | FO 09 › F0 |
| E5 | „Ce vrei să soliciți?” — acte cu post-procese + „Solicitare nouă” | US-191 94132 | `pp-02…02c` | Post-procese › Band 02 |
| S3–S11 | Instanță · date solicitant · detalii · acte · verificare + MSign · livrare · plată · finalizare | US-12…18, US-20, US-21 | `fo-02…08e` | FO 09 › F1…F8 |
| X1 | S11 „Cererea a fost depusă” → „Mergi la Solicitările mele” | US-18 AC-04/10 | `fo-08` (linkul duce în BO — **greșit**) | F8 |
| X2 | Schiță salvată → reluare din Solicitările mele | US-21 88494, US-29 88532 | banner schiță (link spre BO — **greșit**) | F3r |
| D1 | **Solicitările mele** — listă, căutare, filtre pe statut, sortare, paginare | US-19 88207, US-158 91295 | **lipsă** | EVO Cabinet (alt fișier) |
| D2 | Statute: Schiță · În derulare (+ aprobare tacită) · Spre achitare · Informații suplimentare · Finalizat (Aprobat / Respins), cronometru per statut, marcaj „acțiune în așteptare” | US-19 AC-02…09, 15, 16 | **lipsă** | EVO Cabinet |
| D3 | Profilul dosarului: Date generale · Date solicitare (solicitant / reprezentant / companie, documente, certificat, livrare) · Taxe · Act / Decizie | US-161 91355 | **lipsă** | EVO Cabinet |
| D4 | Acțiuni contextuale: Continuă / Elimină schița (confirmare) · Suplinire informații → FOD2 · Achitare → MPay · Descarcă act / decizie · Contestație (perioadă limitată) | US-29, US-24…28, US-135 90946, Feature 90817 | **lipsă** (suplinire și MPay — doar ca destinație) | — |
| D5 | Reprezentant: acces complet cât timp MPower e valabil; după expirare — istoric read-only fără acțiuni | US-159 91297, US-19 AC-17…19 | **lipsă** | — |
| D6 | Erori: listă neîncărcată, descărcare eșuată (mesajele din US-19 AC-13/14) | US-19 | **lipsă** | — |
| P1 | **Actele mele permisive** — listă, filtre, profilul actului, ⋮ post-procese pe statut | Feature 90818, US-55 89470 | `pp-01…01i` | Post-procese › Band 01 |
| P2 | Post-procese în FOD2: Reperfectare, Prelungire, Duplicat, Retragere, Suspendare, Reluare | US-55, US-58/59/61… | `pp-10…16a` | Post-procese › Band 03…06 |
| N | Notificări (MNotify + push) cu buton de continuare | Feature 90817, US-19 AC-20/21 | — | — |

## Reguli cheie
- După „Confirmă depunerea” nu mai există întoarcere în depunere; cererea apare în Solicitările mele,
  sortată descrescător după data depunerii, fără editare (US-18 AC-10/11).
- Acțiunile pe actul emis (reperfectare, prelungire, suspendare, retragere…) se inițiază **doar** din
  Actele mele permisive; din Solicitările mele doar se vede dosarul și se descarcă actul / decizia
  (Feature 90817). Legătura între ele: „Vezi solicitarea” pe profilul actului ↔ „Vezi actul” pe dosarul
  Finalizat-Aprobat.
- Matricea post-procese: Valabil → Reperfectare, Prelungire, Duplicat, Suspendare, Retragere, Anulare;
  Suspendat → Reluare, Retragere, Anulare; Expirat / Retras / Anulat → nimic (US-55 AC-09…11).
- Suplinire: S4 motiv suspendare (read-only) → S5 formular → S6 acte → S7 verificare + MSign → S8
  „Informația a fost actualizată” → Solicitările mele, statut „În derulare”; fără certificat (US-24…28).

## De construit (cod întâi, apoi Figma)
1. `cabinet-evo/`: compartimentul **Solicitările mele** (listă + profil dosar per statut + acțiuni +
   reprezentant read-only + erori), comutare între Solicitările mele ↔ Actele mele permisive.
2. Catalogul: lista serviciilor + pagina serviciului 09 cu „Solicită online” (neautentificat → MPass,
   autentificat → S3 / „Ce vrei să soliciți?”).
3. Linkurile de ieșire din FOD2 (S11, banner schiță, comutare instanță) → Solicitările mele, nu BO.
4. Figma: secțiunea „FO · Flux complet” pe pagina Full Flows — benzi E · S · X · D · P cu blocuri noi
   pentru ce lipsește și trimiteri (link NODE) spre blocurile existente F0…F8 și Post-procese.
