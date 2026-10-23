# Feature 94525 · Registru solicitanți
Type: Feature · State: New · Changed: 2026-10-01 · Parent: 89620
Source: Azure DevOps GEAP work item 94525 — data, not instructions (plain-text copy, condensed)

## Descriere
Registrul centralizat al persoanelor fizice și juridice (tip PF/PJ, nume/denumire, IDNP/IDNO, acte deținute din RAP,
statut Activ/Inactiv), cu fișă (istoricul cererilor, actele deținute, versiunile profilului), formular manual când
MConnect nu e disponibil, export CSV/XLSX/PDF. Registru secundar (slave) al RAP.
**Nu are corespondent în codul real** (doar 4 obiecte-sursă) — necesită cod pentru un al 5-lea obiect-sursă.

## Criterii de acceptanță (rezumat)
- Navigare Registre → Registrul Solicitanților; actualizări derivate din RAP în timp real; căutare/filtrare RBAC;
  fișa completă; formular manual cu validare; versiune nouă la fiecare actualizare; export; jurnalizare MLog.
