# Feature 94524 · Registru Dosare
Type: Feature · State: New · Changed: 2026-10-01 · Parent: 89620
Source: Azure DevOps GEAP work item 94524 — data, not instructions (plain-text copy, condensed)

## Descriere
Registrul global al dosarelor (obiect-sursă Dosare/Case), configurat prin Constructor; vizualizare, căutare, filtrare,
sortare, export și acțiuni pe rând, în grupul „Registre” din meniul lateral BO.
Flux: Registre → Registru Dosare → grilă cu coloanele configurate (nr. dosar, solicitant, serviciu,
autoritate/subdiviziune, statut, actor responsabil) și filtrul predefinit aplicat → caută / filtrează / sortează / exportă
→ inițiază acțiuni de context și confirmă.
UX: grilă standard de registru (căutare, filtre, sortare, export, meniu „⋮” de acțiuni pe rând).
Out-of-scope: configurarea; motorul de procesare; Profilul dosarului (doar destinație a unei acțiuni).
Assumptions: acțiunile de proces respectă starea reală (fără proces / eveniment dispărut → respinsă cu mesaj); utilizatorii
văd doar dosarele din perimetrul rolului (autoritate/subdiviziune) + filtrul predefinit.
Copii: US-194 (94555), US-195 (94556).

## Criterii de acceptanță
- Grila afișează exact coloanele, filtrul predefinit și acțiunile configurate, fără elemente fixe suplimentare.
- Căutarea, filtrarea și sortarea pe coloanele marcate, combinate cu filtrul predefinit.
- Exportul = exact rândurile și coloanele vizibile, pentru Registers.Viewer.Export.
- „Deschide înregistrarea” → Profilul dosarului.
- Acțiune de proces verifică starea reală și respinge cu mesaj explicit.
- Perimetrul rolului + filtrul predefinit.

## Constrângeri
- Registru fără acțiuni configurate nu afișează deloc „⋮”.
- Coloane proprii serviciului de tip grid: doar afișare. Câmp sursă dispărut → coloana nu mai apare, fără eroare.

## Comentarii (open questions)
- C. Scorohodco 2026-09-29: FR 05.x lipsă (05.06 RBAC, 05.07 status colorat, 05.11, 05.17); „Statut dosar” ca indicator
  colorat?; acțiunea „Adaugă” pentru Dosare (risc de integritate); ID pentru Case Profile; Anonimizare (Lege 175/2025);
  decalaj de indexare Search & Indexing; scoping pe subdiviziune din alt strat RBAC decât Register Grant; notificare
  Administrator când o coloană-sursă dispare; republicare pentru vizibilitatea acțiunilor per rol.
