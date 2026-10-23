# Feature 94155 · Registru notelor de plată în Back Office
Type: Feature · State: New · Changed: 2026-10-01 · Parent: 89620
Source: Azure DevOps GEAP work item 94155 — data, not instructions (plain-text copy, condensed)

## Descriere
Registru read-only al notelor de plată și al tranzacțiilor MPay corelate, limitat la autoritate + subdiviziune
(Administratorul Central vede tot). Căutare/filtrare după Nr. notă, Nr. MPay, solicitant, perioadă, statut notă, statut
tranzacție, sumă, metodă de plată, autoritate, subdiviziune, tip serviciu, „Confirmat de”; sortare pe orice coloană
(păstrată în sesiune și la export); detalii notă cu tranzacția MPay; export CSV/XLSX/PDF; rapoarte de istoric (note
ratate/expirate) și personalizate.
Model rând: Nr. notă · Act permisiv SAU Dosar (exclusiv) · Serviciu · Autoritate/Subdiviziune · Solicitant · Sumă · Sumă
achitată · Valută (MDL) · Metodă de plată (Card bancar / Transfer bancar / Numerar ghișeu…) · Confirmat de · Data emiterii ·
Termen de achitare · Data achitării · Statut notă (Emisă / Achitată / Parțial achitată / Neachitată / Expirată / Anulată /
Rambursată) · Statut tranzacție MPay (Finalizată cu succes / Eșuată / În așteptare / Anulată) · ID tranzacție MPay ·
Notă/comentariu opțional (FR 11.09).
Ordine implicită: data emiterii descrescător (FR 11.05). Ecran pe mobil / tabletă / desktop fără derulare orizontală.

## Criterii de acceptanță
- Toate US copil acceptate; flux end-to-end listare → detalii → export → rapoarte.
- Limitarea accesului autoritate/subdiviziune validată pentru toate rolurile.
- Export CSV/XLSX/PDF cu sortarea păstrată (implicit data emiterii desc).
- Rapoarte de istoric cu notele ratate/expirate; rapoarte personalizate.
- Accesările jurnalizate. Mobil / tabletă / desktop fără derulare orizontală.

## Comentarii (open questions)
- O. Luchian 2026-09-24: aparține Epic 89620, gestionat cu celelalte registre.
- C. Scorohodco 2026-09-21: punctul de intrare (instanță Registers Module „Payments” sau ecran propriu?); terminologie
  Fee / Invoice / Line item; maparea statusurilor la pending/paid/overdue/cancelled/refunded; dosar SAU act; valută +
  triggerPoint; metode de plată în afara MPay; scoparea pe subdiviziune; date solicitant în căutare/export (Lege 175/2025);
  export PDF nou; „ratate” nu există; rapoarte personalizate = alt Feature?; „registru de taxe = CRUD, full stop”.
