# Feature 94523 · Constructor de registre interne GEAP
Type: Feature · State: New · Changed: 2026-10-02 · Parent: 89620
Source: Azure DevOps GEAP work item 94523 — data, not instructions (plain-text copy, condensed)

## Descriere (rezumat)
Mecanismul generic AdminPortal: creare registru (obiect-sursă, perimetru Global/Autoritate/Serviciu, registru-părinte
opțional, denumire RO/RU/EN, descriere, cod Obiect.Perimetru.Denumire generat), constructor de coloane (antet, lățime,
aliniere, vizibilă implicit, sortabilă, filtrabilă + tip filtru Text/Alegere unică/Alegere multiplă/Interval de date),
filtru predefinit (reguli coloană+operator+valoare, Și/Sau, invizibil în BO), până la 12 acțiuni pe rând (Deschide
înregistrarea / Completează un formular / Pornește procesul / Avansează procesul / Control personalizat; primele două
indisponibile pentru Acte permisive), pictogramă din set fix de 20, vizibilă rolurilor. Statut Schiță / Publicat /
Depreciat, versiune vX.Y.Z, publicare cu „Ce s-a schimbat”, Register Grant per rol + opțional autoritate (imediat).
UX: listă „Registre” cu taburi Globale / Pe autoritate / Pe serviciu; profil registru cu taburi Informații / Coloane / Acces;
constructor pe ecran complet cu taburi Coloane / Filtru / Acțiuni.
Permisiuni (grup „Registre” în Roluri): Vizualizarea registrelor, Crearea, Editarea, Publicarea, Deprecierea, Istoricul
versiunilor, Restaurarea, Exportul unei versiuni, Gestionarea accesului; „Exportul datelor din registru” = consum BO.
Copii: US-146 (91178) Creare, US-147 (91179) Listă AdminPortal, US-148 (91180) Editare, US-149 (91181) Configurare,
US-150 (91182) Publicare + istoric, US-193 (94528) Depreciere/reactivare, US-220 Acces (ciornă).

## Criterii de acceptanță (rezumat)
- Creare + configurare completă + publicare pe oricare obiect, fără cod.
- Registru-părinte: coloane + acțiuni copiate o dată.
- Fără coloane nu se publică („Registrul nu are nicio coloană”, „Publică” inactiv); publicare respinsă la coloană sortabilă/filtrabilă nesuportată, filtru predefinit incorect, acțiune invalidă.
- Registru Publicat modificat → Schiță; BO vede ultima versiune publicată.
- Register Grant intră în vigoare imediat.
- Admin Local nu vede/creează registre globale, nu accesează prin adresă registre din afara perimetrului.
- Reactivare fără coloane respinsă. Toate operațiunile jurnalizate cu cod, denumire, versiune.

## Comentarii (open questions)
- C. Scorohodco 2026-09-29 (13 puncte): obiecte-sursă suplimentare; perimetru subdiviziune lipsă; motivul creării + cadrul
  legal; filtrele întâi, apoi coloane și „default sort order”; exemple de acțiuni (CRUD); Registrul Aplicanților /
  Obiectelor Autorizate (FR 10.01, FR 08.08); populare din surse externe; partajare MConnect; maparea acțiunilor la
  Add/Modify/Archive/Anonymize; tip dedicat Anonimizării (Lege 175/2025, Global-Admin-only); vizibilitatea acțiunilor e
  versionată vs Grant imediat; aprobarea actualizărilor automate (FR 10.03–10.05); versionare valori (FR 10.06); de unde 12.
- O. Luchian 2026-09-29 (răspunsuri): obiectele-sursă = doar din dezvoltator, de adăugat „Titular act”; Serviciu necesar
  pentru Registrul medicamentelor / NIAC; Descriere = motivul creării; filtru predefinit (ex. Autoritatea ascunsă dar
  filtrabilă), filtre tip query Azure DevOps; sortare implicită = coloană + regulă; **acțiuni de adăugat: Anonimizare,
  Arhivare, Radiere dosar, Modificare statut act, Modificare punct proces**; import CSV ca sursă; export MConnect
  marcat public + anonimizare; propunere: import date în registre.
- O. Luchian 2026-09-29: un registru generat poate fi folosit ca un clasificator (clasificator de tip Registru GEAP).
