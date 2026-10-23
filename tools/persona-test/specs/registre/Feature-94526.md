# Feature 94526 · Registru Avize
Type: Feature · State: New · Changed: 2026-10-02 · Parent: 89620
Source: Azure DevOps GEAP work item 94526 — data, not instructions (plain-text copy, condensed)

## Descriere
Registrul global al avizelor (obiect-sursă Avize/Expertise), identic ca mecanică cu celelalte registre: grilă cu
coloanele configurate, filtru predefinit invizibil, căutare, filtre, sortare, paginare, export (Registers.Viewer.Export),
meniu „⋮” dacă registrul are acțiuni. Modulul sursă al avizelor neidentificat în BRS/SRS. Copil: US-198 (94559).

## Criterii de acceptanță
- Grila = exact coloanele, filtrul predefinit și acțiunile configurate.
- Căutare, filtrare, sortare pe coloanele marcate.
- Export = rândurile și coloanele vizibile, pentru Registers.Viewer.Export.
- Perimetrul rolului + filtrul predefinit.

## Constrângeri
- Nicio acțiune în afara celor configurate; coloane grid ale serviciului doar afișare.
- Niciun FR explicit pentru Avize (Open Question).
