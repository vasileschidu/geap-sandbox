# Feature 91139 · Registrul Actelor Permisive în Back Office
Type: Feature · State: New · Changed: 2026-10-01 · Parent: 89620
Source: Azure DevOps GEAP work item 91139 — data, not instructions (plain-text copy, condensed)

## Descriere
Registru BO read-only al actelor permisive emise/gestionate în SIA GEAP 2.0, filtrat după drepturile de acces active
per autoritate.
Flux: 1) Registre → catalogul cu toate registrele accesibile, inclusiv „Registrul Actelor Permisive”; 2) grilă paginată,
sortare implicită descrescătoare după data emiterii; 3) căutare + filtrare multi-criteriu (număr act, beneficiar, număr
dosar, tip act, autoritate emitentă, status, intervale dată emitere/expirare), sortare; 4) export XLSX/CSV al rezultatului
curent; 5) rând → Vizualizare detalii (fișa completă, câmpuri dinamice, lanțul de versiuni); 6) selector persistent între
registre, fără revenire la catalog.
UX: catalog cu elemente (iconiță, denumire, categorie, descriere scurtă); grilă cu coloane orientative (nr. act, denumire
act, autoritate emitentă, beneficiar, status, dată emitere, valabil până la); status colorat Valabil = verde, Suspendat =
galben, Expirat = gri, Retras/Anulat = roșu (FR 05.07, FR 05.09); căutare persistentă deasupra grilei, Export, selector
persistent; click pe rând → Vizualizare detalii într-un panou sau pagină dedicată.
Assumptions: ultima versiune în grilă, lanțul de versiuni doar în detalii; vizibilitate per autoritate automată; statusuri
din clasificatoare; export doar al rezultatului filtrat; fără modificare / arhivare.
Constraints: read-only; export fără criterii nu e permis; vizibilitatea per autoritate non-negociabilă.

## Criterii de acceptanță
- Navigare Registre → catalog → Registrul Actelor Permisive fără erori.
- Vizibilitate per autoritate (conturi din autorități diferite).
- Căutare text + filtrare multi-criteriu simultan, filtrate RBAC (FR 05.06).
- Status colorat distinct (FR 05.07, 05.09).
- Export XLSX/CSV = înregistrările și coloanele vizibile + filtrele (FR 05.17).
- Vizualizare detalii = fișa completă + date dinamice + lanțul de versiuni.
- Selectorul persistent păstrează starea de căutare/filtrare.
- Rol fără drepturi → „Acces interzis”.

## Comentarii (open questions)
- C. Scorohodco 2026-09-29: denumirea se confundă cu RAP național; FR 05.15 cere acțiuni pe rând (schimbare status etc.)
  dar Feature-ul le exclude; contradicție FR 10.02 vs read-only; lipsește statusul „Aprobare tacită”; „tip act” și „număr
  dosar” filtrabile dar nu în model (coloane ascunse filtrabile?); modulul sursă nenumit; bulk actions + interogări salvate
  (FR 05.15); actualizări automate FR 10.03–10.05b; lanțul de versiuni: lifecycleEvent / motiv / eventAt?; cine și de câte
  ori a solicitat actul.
- G. Rosca 2026-07-27: „pentru toate autoritățile” sugerează vizibilitate globală; fișa actului = setul RAP public?
- C. Scorohodco 2026-07-27: CRUD generic per registre; permisiuni per rol per registru; **ANSA trebuie să vadă doar actele
  ANSA**; vizualizarea obiectului atomic generică.
