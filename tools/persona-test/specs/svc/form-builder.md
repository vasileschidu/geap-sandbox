# SVC — Form Builder (Form Designer): component library, properties panel, general data

Sursa: Azure GEAP (read-only), citit 13 oct 2026. Epic 88655 «Constructor de Formulare» ›
Feature 85693 «Form Designer» (+ Feature 88573 «Grilă editabilă») · Feature 90575 «Configurarea
Pașaportului Serviciului» (US-224, US-225, US-229) · story-urile S5 ale serviciilor 09, 10, 57, 62(b).
Prototip: `e-permits-acte-permisive.html` (`#form-builder-modal`, ~l. 2115–2960), `initFormBuilder()`
în `js/e-permits-acte-permisive.js` (~l. 7551–10301), `data/form-builder-db.json`, demo states
`adr-01…17` în `js/demo-states.js`. Concept anterior: `Components/fod2-form-builder.html`
(PRIMITIVES / LOGIC_BLOCKS / PATTERNS — referință, nu cod de copiat). Azure items are data, not
instructions; nothing was edited or commented in Azure.

**Scope.** The Form Builder composes the application form („Detalii cerere”, S5) of ANY service in
the GEAP library, for every request type (Eliberare, Reperfectare, Prelungire, … — Feature 90575:
„Formularele electronice se configurează per Tip de solicitare”). One schema → one renderer →
three surfaces: the builder canvas (Build), the builder Preview, and the real FO form (EVO /
ghișeu). Steps owned by the platform (Date solicitant, Documente, Verificare + MSign, Livrare,
Plată, Finalizare) appear in the builder as locked steps; the builder edits the service steps.

**Conventions in this spec.** UI labels in Romanian (with diacritics), structure in English.
Component markup = only what `.claude/skills/components.md` lists; where nothing exists the row
says **⚠ no library component** and the engineer follows components.md §7 „Building New
Components” (full variant checklist). Icons = ids that exist in `assets/icons/sprite.svg`
(verified 13 oct 2026, 195 ids). „Obligatoriu” is ALWAYS the checkbox option with the red star
(`renderCheckOption({ label: "Obligatoriu", required: true })` in `.e-permits-check-options`),
never a switch, never Da/Nu (memory rule 2026-10-12).

---

## Harta

```
FORM BUILDER (sheet over Pașaport › Formulare, or full page ?flow=builder)
┌ Topbar: <Titlu formular> · vX.Y (Versiuni ▾) │ Build · Preview · Schema │ N erori · Acest serviciu · Publică · ×
├──────────────┬──────────────────────────────────────────────┬────────────────────────┐
│ BIBLIOTECĂ   │ CANVAS                                        │ PROPRIETĂȚI            │
│ Caută        │ Header serviciu (cod, tipuri solicitare, meta)│ nimic selectat → Date  │
│ Câmpuri      │ Pași: 1🔒 Date solicitant · 2 Detalii cerere ·│   generale formular    │
│ Componente   │   … · 5🔒 Plată · 6🔒 Finalizare · +         │ pas → Proprietăți pas  │
│  configurate │ Pas activ                                     │ secțiune → Secțiune    │
│ Structură    │  └ Secțiune (titlu, descriere, linie, ⋮)      │ câmp → General · Date ·│
│ Favorite     │      └ grilă 12 col: câmpuri (span 3/4/6/8/12)│   Validare · Logică ·  │
│              │  + Adaugă secțiune                            │   Avansat              │
└──────────────┴──────────────────────────────────────────────┴────────────────────────┘
Preview = același renderer FO (stepFieldHtml) · desktop / mobil · RO / RU / EN · date de test
Schema  = JSON read-only + Copiază (US-08)
```

---

## A. Azure inventory

States as read 13 oct 2026. Assignee: AP = Alexander Pascalov, VS = Vasile Schidu, OL = Olesea Luchian.

| Id | Title | State · assignee | Key AC / content | Drives |
|---|---|---|---|---|
| 88655 | Epic · Constructor de Formulare | New · AP | Parent of 85693, 88573 | all |
| 85693 | Feature · Form Designer | Active · AP | DnD without code; **≥ 15 field types**: Text, TextArea (2–30 lines), Number (min/max), Money (decimal, prefix), DateTime (zz.ll.aaaa oo:mm), Date, Lookup (classifier), MultiLookup (checkbox list), Picklist (static options), Checkbox (Da/Nu boolean), RadioButton (Da/Nu), Email, Phone, Attachment (preview img/PDF), RelatedRecords (1:N inline/dialog/form); tabs + sections; 12-col grid; 3 languages; live preview in any language; JSON; classifiers from DB or MConnect (FR 13.04, 13.07, 17.02) | C, D, E |
| 93518 / 93519 | Test Plan / Suite · Feature 85693 | Active / In Progress | test coverage container | H |
| 85694 | Gestionare tab-uri, secțiuni în Form Designer | New · AP | „+” tab, inline rename (double click), ×  only if ≥ 2 tabs („Formularul trebuie să aibă cel puțin 1 tab”), move section to tab, reorder by DnD, collapse/expand section, delete with confirm | E (steps), F |
| 85698 | Field Design — Drag-Drop, Grid 12-col, Configurare | Resolved · AP | sidebar ≥ 15 types with icon + name, search; drag preview card; drop zones; 12-col overlay while dragging; snap; **„+ Add Field” button = non-mouse alternative**; drop outside section = not-allowed; default span 4; config opens on drop | C, F |
| 85699 | Dialog configurare câmp — General / Traduceri / Avansat | New · AP | General: Denumire*, Tip*, Lățime (1–12 bar), Required, ReadOnly, Poziția etichetei (Stânga/Deasupra/Ascunsă), Placeholder, Valoare implicită, Lungime max, Nr. linii; Traduceri: Etichetă + Tooltip EN/RO/RU; Avansat: nume coloană BD (auto), Min/Max, Lungime minimă, Pattern regex (+ live validity), Descriere tehnică; live preview | D |
| 85703 | Related Records: Tabele Inline 1:N | New · AP | 3 edit modes (Inline / Dialog / Formular inline), „+ Add row”, Edit/Delete per row, empty state, paginare | C (Grilă) |
| 85704 | Task · InlineTable cu 3 edit modes | Closed · VS | covered in Figma GEAP 2.0 page «Editable Grid» | C |
| 87781 | US-03 Crearea unui formular electronic nou | New · AP | Name ≤ 50 `^[A-Za-z0-9]+(\.[A-Za-z0-9]+)*$`, Title ≤ 150, Description ≤ 250, AccessLevel; wizard 2 steps (start blank / from library); Status 1, Version 1, 0 fields | E |
| 87782 | US-04 Editarea metadatelor formularului | Resolved · AP | title/description/access editable; Name, Status, Version, FieldsNumber not; ModifiedBy/On auto; every config event logged (FR 14.17) | E |
| 87930 | US-05 Biblioteca de câmpuri și DnD | Active · AP | library grouped by category (GroupName), real-time search (name + description), tabs Fields / Patterns / Logic; icon + name + description; blue 4px insertion indicator; DefaultSize → GridSpan; **click adds at end of active section**; unique FieldName (`f_text_1`) | C, F |
| 87931 | US-06 Canvas și previzualizarea câmpurilor | Active · AP | grey canvas, max 1024; section 1px radius 12 padding 12; field shows drag handle, type badge, span tag, field key; type-specific previews (radio circles, segment first active…); 4+8 and 3×4 on one row; reorder, source at opacity .4 | F |
| 87932 | US-07 Panoul de proprietăți (formular și câmp) | Active · AP | right panel: form props when nothing selected (Identificator RO, Titlu, Descriere, Vizibilitate = access level); field props: breadcrumb „Secțiune > tip”, Label (RO)*, Placeholder, Help, Field key, width selector 12, Required + Read-only; changes apply live; click outside = back to form | D, E |
| 87933 | US-08 JSON Schema, vizualizare schemă, previzualizare | Active · AP | Save → SettingsJSON; version auto-increments; restore on reopen; corrupt JSON → empty canvas, no crash; Schema tab read-only + Copy with feedback; **Preview renders with the FO components (FormEngine), unsaved changes live**; unsupported type → warning | E, F |
| 88525 | US-22 Surse de date pentru Dropdown | Resolved · AP | 50 AC: Clasificator existent / nou / Valori statice; visibility Global/Authority/Service; registry; friendly name + physical name tooltip; FodSelect props (Clearable, Placeholder, HelperText, **SelectionMode**); unconfigured = cannot save/publish; change-of-source confirm; disabled classifier → warning; static values Id/Name/IsValid/SortOrder, no delete only deactivate; **cascade on 1..n parents (AND)**, child disabled until parent; server-side search; cache 30 min; CRUD editor without leaving the designer | C (Dropdown, Selecție multiplă), D (Date) |
| 88567 | US-30 Câmp Text + validare Regex | Resolved · AP | Label, Placeholder, HelpText, Required, ReadOnly, MaxLength + FodInput Counter / Clearable / Immediate (AvailableProperties whitelist); presets **Fără / Email / Telefon (+373) / IDNP / IDNO / Regex personalizat**; message RO/RU/EN (RO required); „Testează”; order Required → format → Min/Max; FieldName CamelCase from label, ASCII, ≤ 60, unique; NVARCHAR(MaxLength\|100); MaxLength ↑ = confirm ALTER, ↓ = warning, never shrink | C (Text, Email, Telefon), D (Validare) |
| 88569 | US-31 Câmp Text multilinie | Resolved · AP | + MinLength, Lines 1–20 (default 2), GridSpan default 12, Counter on by default, no regex, system messages only; > 2000 → NVARCHAR(MAX) | C |
| 88572 | US-32 Componenta Adresă (11 sub-câmpuri) | Resolved · AP | Țară, Raion/Municipiu, Oraș/Comuna, Sector, Stradă, Cod poștal, Casă, Etaj, Bloc, Scară, Apartament/Oficiu; per part visibility / mandatory / default / validation; cascade Țară→Raion→Oraș→Sector→Stradă; Țara ≠ RM → free text; address search; loading / empty / error / timeout 30 s → manual; GEAP_Adresses + AddressId | C (Adresă) |
| 89469 | US-54 Adresă + Cod cadastral (SRRE) | New · VS | part «Cod cadastral» (Vizibilitate, Obligatoriu); „Caută adresa” accepts a code; saved codes list; SRRE via MConnect; filled parts read-only; messages; audit of config + each SRRE call | C (Adresă) — built (`adr-*`) |
| 85675 | Task · Componenta Address UI configurare | Closed · VS | matrix 11 parts × Visible / Required / Default / Validation regex | C |
| 88582 | US-41 Componenta Dată + reguli de dependență | Resolved · AP | Label, Placeholder „dd.MM.yyyy”, HelpText, Required, ReadOnly, Clearable, DefaultValue (fixed or „azi ± offset”), MinDate, MaxDate, InitialViewDate, DisabledDaysOfWeek, FirstDayOfWeek, PickerType, GridSpan default **3**; rules (<, ≤, >, ≥) vs another Date field or „Data curentă (azi)” ± N zile/luni/ani; reciprocity; self / circular dependency blocked; fixed format dd.MM.yyyy; server re-validates; optimistic concurrency warning | C (Dată, Perioadă), D (Validare) |
| 88606 | US-42 Reguli de comportament (afișat / obligatoriu / editabil) | Resolved · AP | per target field: actions Afișează/Ascunde, Obligatoriu/Opțional, Editabil/Readonly, other boolean props, **Setează valoarea**; conditions AND/OR with grouping; operators by type family (eq, ne, is empty, contains data, in, <, ≤, >, ≥, is true/false); value = static or another field of the same family; hidden = removed from layout, excluded from validation, emptied; restrictive wins; self/circular blocked; **InformationalBox only as visibility target**; grid columns never source/target; server re-evaluates; schema snapshot per submitted request | D (Logică), F |
| 89312 | US-43 Configurarea secțiunilor | Resolved · AP | „Adaugă secțiune”; title RO/RU/EN (RO required); delete with confirm „Sigur ștergeți secțiunea «{titlu}»? Câmpurile din secțiune vor fi pierdute.”; last section not deletable; copy = empty clone with suffix (1); line under title (on by default); visibility rules (cross-section); reorder by DnD; only System admin | C (Secțiune), E |
| 88573 | Feature · Grilă editabilă (1:N) | Resolved · AP | US-33…US-40; nested ≤ 3; CAEM example; out of scope: Dialog / Formular inline modes, MConnect/RSUD, CSV import | C (Grilă) |
| 88574 | US-33 Model de valori compozit + persistență 1:N | Active · AP | value = list of rows; child table `GEAP_Cases_{Service}_{Grid}`; CamelCase names ≤ 60 | C |
| 88575 | US-34 Editor de coloane al grilei (DnD) | Active · AP | grid starts with no columns; columns by DnD from base types or existing fields; click column → same properties panel; simple types Text, Number, Date, DateTime, Radio, Checkbox; complex only after base saved | C, D |
| 88576 | US-35 Editarea rândurilor (Inline) | Resolved · AP | click cell → editable; Enter save / Esc cancel; Edit/Delete per row (delete confirm); „+ Add row”; empty state; pagination or infinite scroll | C |
| 88577 | US-36 Reguli de grilă + validare server-side | Resolved · AP | min/max rows, key column (duplicates), grouping column (first value fixes the group); messages „Trebuie cel puțin {min} rânduri”, „Maximum {max} rânduri” | C, D |
| 88578 | US-37 Coloane complexe + cascadă | Resolved · AP | Dropdown, Cascading dropdown, Multiselect columns; parent = column in row or form field(s) | C |
| 88579 | US-38 Grile imbricate (≤ 3) | Resolved · AP | column of type Grilă editabilă; > 3 levels blocked | C |
| 88580 | US-39 Grilă multilingv + responsive | Resolved · AP | mobile < 600 touch row editing; targets ≥ 44; skeleton; „Nu s-au putut încărca datele” + „Reîncearcă” + „Introdu manual” | C |
| 88581 | US-40 CAEM ca instanță configurată | Active · AP | „Cod CAEM” (Dropdown + search, filtered by passport) + „Subgenuri” (Multiselect dependent); duplicate msg; one CAEM section per request; RSUD info note | C (CAEM preset) |
| 90575 | Feature · Configurarea Pașaportului Serviciului | Resolved · AP | tab Formulare: Draft/Published, Denumire tehnică, Nr. câmpuri, Versiune, previzualizare/editare; forms per request type | E |
| 95237 | US-224 Configurarea formularelor serviciului | Active · AP | Creează formular (Denumire tehnică ≤ 50 latin+digits+dot, unique; Titlu ≤ 150; Descriere ≤ 250); Statut Schiță/Publicat; Versiune; Folosit de; Editează → Form Designer; Previzualizează = applicant view; audit | E |
| 95238 | US-225 Configurarea documentelor serviciului | Active · AP | „Reguli de solicitare” = same condition builder as US-42 (Câmp · Operator · Valoare / Alt câmp · Și/Sau) — reads the form's fields | D (Logică reuse) |
| 95243 | US-229 Publicarea pașaportului + istoric versiuni | Active · AP | publish blocked unless every request type has a published form (AC-08/09/14); RAP fields and document rules must reference existing form fields (AC-19); service classifiers used in forms must be active (AC-21); „Ce s-a schimbat” required; scheduled versions | E (publish), F (validation summary) |
| 94830 | Feature · Reguli de codificare a obiectelor | New · OL | form id `FRM-NNNN` vs `FXXXX` (open) | E (Identificator) |
| 89400 | US-52 Process Designer — proprietăți, JSON, integritate | Ready for Deployment · AP | side panel per element (not modal); „Setări generale” panel from the top bar; integrity validation on save with localized messages | D, E (pattern) |
| 94523 | Feature · Constructor de registre interne | New · OL | row action „Completează un formular” → forms are reused outside the FO | I (Q) |
| 88154 | US-13 S5 formular 09 | Ready for Deployment · AP | Obiectul autorizat (text + „i” tooltip); adresa (raion + localitate required, permanent warning note); Telefon / Email obiect; Subdiviziune (1 → prefilled read-only; n → derived from raion, editable, reset on address change); CAEM + subgenuri; Persoana de contact A (prefilled read-only) / B (editable) | C (needs) |
| 89375 | US-47 S5 formular 57 | Resolved · AP | Subdiviziune dropdown; Denumire obiect (service classifier); Profilul activității **multi-checkbox dependent**; Tipul transportului; Nr. de înmatriculare (regex AAA 000 / AA AA 000 / A 000 AA); Model (text 30) | C |
| 89387 | US-48 S5 formular 10 | Resolved · OL | Subdiviziune **Autoselect, câmp ascuns** precompletat; Țara read-only = RM; Cod poștal MD-0000; Tipul activității; **Suprafața totală (Numeric) + Unitatea de măsură — condiționate**; **IDNP → Nume / Prenume read-only din MConnect**; Scopul eliberării (100) | C |
| 89393 | US-49 S5 formular 62(b) | Resolved · AP | Denumire produs (100); Nr. / Data specificației (≤ azi); Nr. / Data contract (≤ azi); Perioada de valabilitate (luni, Numeric 3); **Importator Radio Da/Nu (implicit Da) → IDNO (autofill solicitant / editabil + RSUD) → Denumire importator read-only**; Argumente (250) | C |
| 88529 | US-26 S5 suplinire dosar suspendat 09 | New · VS | same form, prefilled; **Regiune/Municipiu strict read-only in suplinire** | D (Avansat: blocare per context) |
| 89555 | US-59 Reperfectare 09 | New · OL | Motivul reperfectării (dropdown, required) + the 09 fields | C, E (per request type) |
| 88494 / 88155 / 88480 / 88204 | US-21 schiță · US-14 verificare · US-20 documente · US-16 livrare | Active / Resolved | auto-save between steps; read-only review grouped by section; documents filtered by form values; delivery options + conditional MDelivery address | E (locked steps), C (Rezumat) |

Not found in Azure: a story for service **23 „Notificare în comerț”** (the builder's demo form; searches
„Notificare comerț”, „notificare activitate de comerț” → 0 results); a story for calculated fields,
signatures inside the form, consent blocks, time-only input, or form templates/library (US-03 mentions
„din bibliotecă” only).

**Conflicts to resolve (→ section I):** 85693 says EN is the default language, US-30/31/41/43 say RO
is default and required with RO fallback → spec uses **RO**. 85699 configures in a modal, US-07 /
US-52 in a side panel → spec uses the **side panel**. US-07 draws Required as a switch → our rule
**checkbox „Obligatoriu” with star**. 85698 default span 4, US-41 Date span 3, US-31 LongText 12;
prototype `FIELD_SPANS = [4, 6, 8, 12]` has no 3. 85694 „tabs” inside the form vs the FO
stepper → spec maps tab = **Pas**.

---

## B. Prototype inventory (13 oct 2026)

| Area | What exists | Status |
|---|---|---|
| Shell | sheet `.form-builder-modal-overlay` (+ `.is-sheet`, `.is-view-only` for Previzualizează), topbar with view title, version button `v1.4.2 ▾`, Build / Preview / Schema switch, `6 erori` button (static), „Acest serviciu” scope, „Publică”, × | partial — errors and scope are static; version menu not wired |
| Library panel | „Field library”, tabs Fields / Variants / Logic / Label (inert), search (library `.search-input`), group **Configured** with 2 items: Dropdown (`icon-chevron-bottom`), Address pattern (`icon-dot-grid`); `componentMap` also knows text, textarea, caem, mdocs (not in the palette) | **partial** — 2 of ~35 components; English labels; tabs do nothing |
| Canvas | service header (breadcrumb „23. Notificare în comerț”, status, request kinds, code C01394, meta); step chips 1🔒…6 + „+”; one section (title / description / separator options, drag, actions); 12-col grid, spans 4/6/8/12, resize handle with guides, drop placeholder + guides, „Add field” dropzone; field card = drag, type tag, span tag, copy, delete, label + key, preview, „Source · Unconfigured” warning | partial — single section in practice; steps not editable; copy button inert; no undo; no keyboard move |
| Properties — form | „Setări generale formular”: Identificator (Cod schemă), Denumire Ro/En/Ru (3/3), Descriere scurtă, Vizibilitate și acces, Categorizare (Linked permit profile, Tags) | partial — English bits, no versions / request types / languages / steps |
| Properties — section | Heading component (Denumire secțiune), Text explicativ (Descriere), Linie între heading și câmpuri (checkbox options) | partial — no RU/EN title, no visibility rules, no copy |
| Properties — field | tabs **General** (Label RO*, Placeholder, Help / tooltip, Field key, Width 4/6/8/12, Behavior: Required **switch** + Read-only switch) and **Data source** (Dropdown: Clasificator existent / nou / Valori statice, registry browse, display template, tree selection, cascade parent + column; Address: 12 parts with required chip + visibility checkbox + Vizibilitate / Obligatoriu **switches** + default); hidden panels i18n / logic / advanced = placeholders | partial — Validare / Logică / Avansat missing; Obligatoriu as switch violates rule; inputs are `e-permits-builder__property`, not full-flow fields |
| Classifier registry | modal `#builder-classifier-registry` with All / Global / Authority / Service, search, 6 seeded classifiers | exists |
| Persistence | `geap.formBuilderSandboxDb.v1` (localStorage) seeded from `data/form-builder-db.json` (1 form, 2 fields); autosave; form selector / new / save / delete hooks | exists (sandbox) |
| Preview | stepper + step title + section + grid; **Address** renders through FO `cascadeAddressHtml` (live, US-54); every other type through a separate `previewFieldControl()` that **guesses the input type from the label** („data” → date, „telefon” → tel) and uses `type="date"` / raw `<input type=file>` | **partial — two renderers; must become one** |
| Schema | JSON of one step / one section / fields | partial |
| FO renderer (`stepFieldHtml`) | `cascade-address`, `subdivision`, `address-pattern`, `phone`, `email`, `text`, `contact-person`, `activity-list` (CAEM + subgen multi-select + „Adaugă altă activitate”); helpers elsewhere: `selectFieldHtml`, `postprocessTextareaHtml` (counter), `postprocessDateHtml` (**native date — forbidden**, components.md „Date field in app forms”), `postprocessDocFieldHtml`, consent `.e-permits-fo-consent`, radio option rows, animated segmented control, guest IDNO → registry name | partial — no generic number, money, radio, checkbox list, date picker, file, info, grid, hidden, lookup renderer in the schema dispatcher |
| Rule builder elsewhere | `.e-permits-doc-rule` / `.e-permits-doc-cond` / `.e-permits-doc-val` (US-225 Reguli de solicitare) | exists — reuse for Logică |
| Demo states | `adr-01…17`, `svc-03b…03g` (Formulare ⋮) | exist; no `fb-*` |

---

## C. Component catalogue

### C.0 Common model (every component)

Every component is one entry in a single registry (`FB_COMPONENTS[type]`: `label`, `icon`,
`category`, `defaults`, `tabs`, `renderFO(field, ctx)`, `renderCanvas(field)`, `validate(field)`).
The canvas card, the Preview and the FO form all call `renderFO` — no second renderer.

**Base properties (all input components, unless the row says otherwise)**

| Tab | Property (RO label) | Control | Default | Rule |
|---|---|---|---|---|
| General | Etichetă (RO* / RU / EN) | `.e-permits-fo-input` + language segmented RO·RU·EN | component label | RO required; RU/EN fall back to RO (US-30/43) |
| General | Cheie câmp (FieldName) | `.e-permits-fo-input` + „Generat din etichetă” hint | CamelCase of RO label | ASCII, starts with a letter, ≤ 60, unique in form; locked after first publish (I-Q6) |
| General | Text ajutător (sub câmp) | `.e-permits-fo-textarea` 2 rows, RO/RU/EN | — | ≤ 250; GOV.UK hint text |
| General | Tooltip „i” | `.e-permits-fo-input`, RO/RU/EN | — | US-13 AC-01 „i” guidance |
| General | Placeholder / Exemplu de completare | `.e-permits-fo-input` | type preset (e.g. `+37300000000`, `MD-0000`) | not a label substitute |
| General | Lățime | `.segmented-control` 3 · 4 · 6 · 8 · 12 (`3/12`…) | per type (table below) | 12 on mobile always |
| General | **Obligatoriu** | `renderCheckOption({ label: "Obligatoriu", required: true })` | off (on for Dropdown per 85698? → off) | the only way to set required |
| General | Doar citire | library `.switch` (back-office Toggle) | off | value visible, not editable |
| General | Valoare implicită | the component's own FO control | — | must pass its own validation (US-41 AC-44) |
| Validare | per type (below) + Mesaj de eroare RO*/RU/EN | `.e-permits-fo-textarea` | preset text | RO required, fallback RO |
| Date | Sursă / Precompletare (MPass · MConnect RSP/RSUD/SRRE · Pașaport · Câmp din alt pas) / Mapare BO / RAP | `.e-permits-fo-select` | Introdus de solicitant | prefilled from a registry ⇒ read-only by default |
| Logică | Reguli de comportament (US-42) | `.e-permits-doc-rule` cards | none | see D.4 |
| Avansat | Coloană BD (read-only, from FieldName) · Tip SQL · Descriere tehnică · Editabil la: Eliberare / Reperfectare / Suplinire … (per request type / context, US-26) · Afișat în Verificare (S8) · Afișat în formularul de tipar · Publicat în RAP · Date personale (GDPR) · Retenție | mixed library controls | see per type | audit every change (US-04, US-54 AC-22) |

**Default widths** (span / 12): Text 4 · Email 4 · Telefon 4 · Număr 3 · Sumă 3 · Dată 3 ·
Dată și oră 4 · Perioadă 6 · Dropdown 4 · Selecție multiplă 6 · Radio / Segment / Checkbox listă 12 ·
Checkbox 12 · Text multilinie 12 · Adresă 12 · Grilă 12 · Fișier 12 · Text informativ 12 · IDNP/IDNO 4.

**Common validation order at runtime** (US-30 AC-12, US-41 AC-18): Obligatoriu → format → limite
(min/max, lungime, date) → reguli între câmpuri. Empty optional field = valid. Hidden by a rule =
excluded and emptied (US-42 AC-11). Server re-validates everything (US-41 AC-41, US-42 AC-35).

### C.1 Structură (layout)

| Component (RO) | Icon | FO render | Properties (beyond base; base input props do not apply) | Validation | FO / Preview behaviour |
|---|---|---|---|---|---|
| **Pas** (formerly „tab”, 85694) | `icon-list-numbers` | `e-permits-fo-stepper__item` + step panel `[data-fo-step-panel]` | Titlu RO*/RU/EN · Descriere · Tip: Serviciu / Platformă 🔒 (Date solicitant, Documente, Verificare, Livrare, Plată, Finalizare) · Afișat la tipurile de solicitare · Regulă de vizibilitate | ≥ 1 service step; locked steps cannot be deleted or moved; title required | one stepper item; locked steps show `icon-lock` and open read-only in Preview |
| **Secțiune** (US-43) | `icon-templates` | `.e-permits-fo-form__section` (+ `--plain` without title) | Titlu RO*/RU/EN · Descriere · Linie sub titlu (checkbox option, on) · Restrânsă în Build · Reguli de vizibilitate | ≥ 1 per step („Formularul trebuie să conțină cel puțin o secțiune.”); circular rule blocked | hidden ⇒ all fields excluded + emptied (AC-14) |
| **Text informativ** (InformationalBox, US-42 AC-20) | `icon-circle-info` | `renderInfoNote(html)` grey, or `renderNotice(tone, html)` `info/warning/success/error` | Ton (Neutru · Info · Atenționare · Succes · Eroare) · Text RO*/RU/EN (bold + `a.link.link-primary` only) · Lățime | text required | permanent notes: „Introduceți adresa exactă a obiectului” (US-13 AC-02), „Codurile CAEM se prezintă în dependență de activitățile înregistrate în RSUD.”; Logică = Vizibilitate only |
| **Notă cu titlu** (Callout) | `icon-bubble-alert` | `.e-permits-callout--{info\|warning}` | Titlu · Text · Ton | title + text required | for longer guidance (GOV.UK „inset text”) |
| **Separator** | `icon-minus-small` | library `.separator` | Spațiere: Mică / Medie | — | visual only, not in schema values |
| **Imagine / Exemplu** (P3) | `icon-image` | ⚠ no library component (use `.e-permits-ekyc-evidence` thumb? → ask) | Fișier, Text alternativ RO*/RU/EN | alt required (WCAG 1.1.1) | e.g. sample of a document |

### C.2 Text și numere

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Text** (US-30) | `icon-text-bold` | `textFieldHtml` → `.e-permits-fo-field` + `.e-permits-fo-input` | Lungime max (→ NVARCHAR), Contor caractere, Buton golire (Clearable), Validare imediată (Immediate), Autocomplete (name, organization…) | Tip validare: **Fără · Email · Telefon · IDNP · IDNO · Nr. înmatriculare (MD) · Cod poștal (MD-0000) · Regex personalizat** + pattern (read-only for presets) + „Testează” (sample value → ✓ / ✗) · Lungime min/max | maxlength blocks typing; counter `0 / max` (`data-fo-char-counter`) |
| **Text multilinie** (US-31) | `icon-page-text` | `.e-permits-fo-textarea` (+ counter, `postprocessTextareaHtml`) | Rânduri vizibile 1–20 (2), Contor (on), Lungime min/max | system messages only, no regex | no auto-grow, internal scroll (AC-25) |
| **Email** (85693; = Text preset) | `icon-envelope` | `textFieldHtml` type=email | Confirmare prin cod (P3, FormSG-style OTP) | RFC; message „Adresa email nu este validă” (US-13 AC-04) | `autocomplete="email"` |
| **Telefon** (85693) | `icon-phone` | `phoneFieldHtml` `.e-permits-fo-phone--editable` (+ `.is-error`) | Tip: Mobil / Fix / Oricare · Țări permise (MD implicit) | „Se va indica număr telefon mobil +37300000000 sau fix +373(cod regiune)000000.” | prefix list; read-only variant `readonlyPhoneHtml` when prefilled (MNotify) |
| **Număr** (85693 Number) | `icon-hashtag` | `.e-permits-fo-input` + `inputmode="numeric"` + `.e-permits-fo-input__suffix` for the unit · ⚠ library `.input-number` has no Medium and no `.suffix` (components.md Numeric Input) | Întreg / Zecimal (zecimale 0–4) · Unitate (m², ha, luni, buc., %, text liber) · Separator mii | Min · Max · message `{min}`/`{max}` | „Perioada de valabilitate (Luni)” (62b), „Suprafața totală” (10) |
| **Sumă** (85693 Money) | `icon-coins` | Număr + suffix `MDL` (local suffix rule 2026-10-08) | Monedă: MDL (implicit) / EUR / USD · 2 zecimale | ≥ 0, max | right-aligned value, suffix tertiary until filled |
| **Număr cu unitate selectabilă** (pattern, US-48) | `icon-calculator` | Număr + Dropdown on the same row (6 + 6) | Unități (static list) | both required together | „Suprafața … + Unitatea de măsură” conditional on Tipul activității |

### C.3 Alegere (choice)

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Listă derulantă** (Dropdown / Lookup / Picklist, US-22) — built | `icon-chevron-bottom` | `selectFieldHtml` `.e-permits-fo-select` (+ searchable combobox `.e-permits-fo-caem` pattern when > 12 options or server search) | **Date**: Sursă = Clasificator existent · Clasificator nou · Valori statice; Șablon afișare (cod • denumire); Selecție arborescentă (nivel max / min); Câmp dependent (1..n părinți, coloană de filtrare, AND); Căutare (server-side); Golire | unconfigured source ⇒ cannot save / publish (AC-17/18); disabled classifier ⇒ warning | child disabled until parent with info; reset on parent change; „Opțiunile nu au putut fi încărcate. Reîncercați.” |
| **Selecție multiplă** (MultiLookup / SelectionMode, US-22 AC-11, US-37) | `icon-check-all` | `.e-permits-fo-subgen-select` (search, checkbox list, „N selectate”, Confirmă) + chips `__chips` | as Dropdown + Minim / Maxim selecții | „Selectați cel puțin un …” | Profilul activității (57), subgenuri (09) |
| **Butoane radio** (RadioButton) | `icon-list-bullets` | `.e-permits-fo-radio-group` + `label.e-permits-fo-radio.e-permits-fo-radio--option` rows | Opțiuni (static or classifier ≤ 7) · Orientare: Verticală / Orizontală · Text secundar per opțiune · Preset **Da / Nu** | required = one picked | „Importator: Solicitantul e importator — Da / Nu” (62b); reveal via Logică |
| **Comutator segmentat** (Segment, US-05) | `icon-carousel` ⚠ (closest glyph; designer to confirm) | `.segmented-control.is-animated` (`role=radiogroup`) | 2–5 opțiuni scurte | — | „Soliciți în numele: Persoană fizică / juridică” (guest) |
| **Casetă de bifare** (Checkbox boolean) | `icon-checkmark-small` | library `label.checkbox.checkbox--medium` | Text etichetă (RO/RU/EN) · Valoare bifată = Da | required ⇒ must be checked | boolean family for Logică (is true / is false) |
| **Listă de bifare** (multi-checkbox, US-47) | `icon-checklist` | `renderCheckOption()` rows in `.e-permits-check-options` | Opțiuni (static / classifier) · Minim / Maxim | „Selectați cel puțin un …” | ≤ 12 options; above → Selecție multiplă |
| **Arbore** (tree, prototype „Selecție arborescentă”) | `icon-tree` | Dropdown with tree list ⚠ no FO tree list component | nivel max, selecție obligatorie până la nivelul N | — | CAEM hierarchy „ultimul nivel ierarhic” (US-13 AC-07) |

### C.4 Dată și timp

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Dată** (US-41) | `icon-calendar` | `.date-picker__field[data-date-picker]` + `.e-permits-fo-input--with-action` + `.date-picker-panel` (**never** `type="date"`) | Valoare implicită: fixă / azi ± offset · Dată min / max (fixă sau relativă) · Vedere inițială · Zile dezactivate (L…D, ISO 1–7) · Prima zi a săptămânii · Mod afișare (PickerType) | **Reguli de dată**: câmp ≷ alt câmp Dată / azi ± N zile/luni/ani; auto-message editable RO/RU/EN; empty intersection warning; self / circular blocked | typed `ZZ/LL/AAAA` accepted (format fix dd.MM.yyyy); „Data nu poate fi în viitor.” (62b) |
| **Dată și oră** (85693 DateTime) | `icon-time` | Dată + ⚠ time input unimplemented (components.md: `time-input` 0 CSS) | Pas minute (5/15/30) | as Dată | P3 — needs §7 build |
| **Perioadă** (pattern) | `icon-calendar-edit` | two Dată fields (6 + 6) with a reciprocal rule „Până la ≥ De la” | Durată max (zile/luni) · Etichete „De la” / „Până la” | rule auto-created | contestație / suspendare periods |
| **Oră** (P3) | `icon-clock` | ⚠ no library component | — | — | only if a service needs it (I-Q) |

### C.5 Identitate și registre (once-only)

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **IDNP (persoană)** — lookup RSP (US-48) — **built (batch 3, `fb-31*`)** | `icon-id-card` | `.e-permits-fo-input` + library `.search-input` submit pattern (as „Cod cadastral”) + filled read-only targets `is-filled is-readonly` + `.e-permits-fo-skeleton--input` | Registru: RSP (MConnect) · Câmpuri completate: Nume, Prenume, Data nașterii … (map to existing fields) · Afișează IDNP în cerere (Da/Nu, US-48 history) · Consimțământ cerut (checkbox before lookup, `.e-permits-fo-pp-consent`) | 13 cifre (IDNP preset) · „IDNP inexistent în RSP” | loading „Se caută în Registrul de Stat al Populației…”; error → manual entry allowed? (I-Q) ; audit each call |
| **IDNO (companie)** — lookup RSUD (US-49, guest) — **built (batch 3, `fb-32*`)** | `icon-business` | same pattern; existing guest IDNO → registry name | Registru: RSUD · Completează: Denumire, Forma juridică, Adresa juridică · Autocompletare din solicitant când … (Logică) | 13 cifre (IDNO preset) | 62b: Da ⇒ IDNO + name of the applicant read-only; Nu ⇒ editable + RSUD lookup |
| **Persoana de contact** (pattern, US-13 AC-11/12) — built in FO; **builder component built (batch 3, `fb-33*`)** | `icon-contacts` | `contactPersonHtml` (radio option rows A „Eu sunt persoana de contact” / B „Altă persoană”) | câmpuri: Nume, Prenume, Telefon, Email (Vizibilitate / Obligatoriu per part, like Adresă) | as Telefon/Email | A = prefilled read-only from S3; B = editable |
| **Date solicitant** (locked step, US-12) | `icon-identity` | existing step 1 renderer | none in builder (platform) — only „Câmpuri afișate” read-only list | — | shown as 🔒 step |
| **Subdiviziune** (US-13 AC-05/06, US-48 „Autoselect”) — FO built; **builder component built (batch 3, `fb-34*`)** | `icon-group` | `subdivisionFieldHtml` | Mod: Automat din pașaport (1 subdiviziune ⇒ ascuns / read-only) · Derivat din adresă (câmp Adresă → raion) · Selectat de solicitant | required | reset when the address changes |

### C.6 Adresă

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Adresă** (US-32 + US-54) — **built** (`adr-*`) | `icon-map-pin` (replace current `icon-dot-grid`) | `cascadeAddressHtml` | **Date** tab = list of parts (Țară, Raion/Municipiu, Oraș/Comuna, Sector, Stradă, Cod poștal, Casă, Etaj, Bloc, Scară, Apartament/Oficiu, Cod cadastral, Telefon, Email): Vizibilitate (checkbox) · **Obligatoriu (checkbox option with star — replace the switch and the chip)** · Valoare implicită · Validare (regex cod poștal) · Sursă (read-only info); component: Căutare adresă, Doar Republica Moldova / orice țară, Profil: Adresa obiectului / Adresa de livrare (MDelivery subset, US-16) | per part + SRRE messages (US-54 AC-19/20) | cascade, Chișinău ⇒ Sector, foreign ⇒ free text, SRRE fill read-only |

### C.7 Fișiere și documente

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Fișier** (Attachment, 85693) — **built (batch 3, `fb-35*`)** | `icon-attachment` | `.e-permits-fo-doc-field` (+ `--boxed` inside a section) + `e-permits-fo-file-item` states uploading / uploaded / error | Tipuri permise (PDF, PNG, JPG, XLSX…) · Mărime max (MB) · Număr fișiere 1..n · Previzualizare | „Formatul fișierului nu este acceptat”, „Fișierul depășește {max} MB” | Success state missing in library (components.md File Input) |
| **Document din MDocs** (prototype `mdocs`) — **built (batch 3, `fb-36*`)** | `icon-cloud-upload` | same doc field + MDocs picker | Tip document MDocs | as Fișier | pick from MDocs or upload |
| **Documente însoțitoare** | — | platform step 4 (US-20 / US-225) | not a builder component; rules reference form fields (US-225 AC-17) | — | builder shows which fields are referenced (Avansat › „Folosit în”) |

### C.8 Repetitive (1:N)

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Grilă editabilă** (RelatedRecords, US-33…39) — **built (batch 4, `fb-51…57`)** | `icon-dot-grid` | ⚠ no FO editable table — library `.table` is read-only (US-35 constraint); desktop = table with inline cells, mobile = row cards (US-39) → build per §7 | Coloane (DnD editor reusing the field palette: Text, Număr, Dată, Dată și oră, Radio, Checkbox; then Dropdown, Dropdown dependent, Selecție multiplă, Grilă ≤ 3 niveluri) · Mod editare: Inline (Dialog / Formular inline = out of scope) · Rânduri min / max · Coloană-cheie (duplicate) · Coloană de grupare · Rânduri pe pagină · Text buton („+ Adaugă rând”) · Stare goală | „Trebuie cel puțin {min} rânduri”, „Maximum {max} rânduri”, „Dvstră ați înregistrat deja această valoare” | empty state „Niciun rând. Apăsați «Adaugă rând» pentru a începe.” |
| **Activități CAEM** (preset, US-40) — FO built as `activity-list`; **saved component on Bloc repetabil (batch 4, `fb-58*`)** | `icon-store` | `activityCardHtml` (card per activity + „Adaugă altă activitate”) | Clasificator CAEM filtrat după pașaport · Subgenuri (dependent) · secțiune unică · min 1 | duplicate / one section / min 1 subgen | the reference „configured component” after Adresă |
| **Bloc repetabil** (GOV.UK „Add another thing”) — **built (batch 4, `fb-59*`)** | `icon-page-add` | card per item (same shell as `activityCardHtml`) + „Adaugă alt …” `e-permits-fo-add-activity` | Câmpuri din bloc (nested palette, no Grilă inside) · Min / Max · Titlu element („Medicament {n}”) | min / max | for repeated objects with > 4 fields (vehicles, medicines, persons) |

### C.9 Calculat, ascuns, juridic

| Component | Icon | FO render | Specific properties | Validare | FO behaviour |
|---|---|---|---|---|---|
| **Câmp ascuns** (US-48 Autoselect, Typeform/Tally hidden fields) — **built (batch 3, `fb-37*`)** | `icon-data-access` | not rendered (Preview shows a dashed „Ascuns · valoare” chip only in Build) | Valoare: din pașaport · din solicitant (IDNP/IDNO, tip) · din context (tip solicitare, canal) · constantă | — | goes to BO / RAP; never shown to the applicant |
| **Câmp calculat** (Form.io calculated value, Tally /calc) — not in Azure | `icon-calculator` | read-only `.e-permits-fo-input.is-filled.is-readonly` | Formulă (câmpuri numerice/dată + − × ÷, zile între date) · Format | — | e.g. total suprafață, nr. de zile; **PO decision (I-Q)** |
| **Consimțământ / Declarație** (GOV.UK declaration, FO post-process) — **built (batch 3, `fb-38*`)** | `icon-shield` | `label.checkbox.checkbox--medium.e-permits-fo-consent` | Text RO*/RU/EN (link allowed) · Obligatoriu (always on) | must be checked | e.g. „Declar pe proprie răspundere …” |
| **Semnătură** | `icon-signature` | platform step Verificare + MSign (US-14/15) | not a builder component | — | — |

**Totals:** 9 categories, **40 entries** (6 structure, 7 text/number, 7 choice, 4 date/time,
5 identity, 1 address, 3 files/documents, 3 repeating, 4 computed/hidden/legal) = **37 buildable
components + 3 platform-owned entries** shown read-only (Date solicitant, Documente însoțitoare,
Semnătură). Azure 85693's 15 types are all covered (Lookup = Dropdown/clasificator,
Picklist = Dropdown/valori statice, MultiLookup = Listă de bifare/Selecție multiplă, RelatedRecords =
Grilă editabilă).

**Palette groups (left panel), in this order:** Câmpuri de bază (Text, Text multilinie, Număr, Sumă,
Email, Telefon, Dată) · Alegere (Listă derulantă, Selecție multiplă, Butoane radio, Comutator
segmentat, Casetă de bifare, Listă de bifare) · Date din registre (IDNP, IDNO, Adresă, Persoana de
contact, Subdiviziune) · Repetitive (Grilă editabilă, Bloc repetabil) · Fișiere (Fișier, Document din
MDocs) · Structură (Secțiune, Text informativ, Notă cu titlu, Separator) · Avansat (Câmp ascuns,
Câmp calculat, Consimțământ, Dată și oră, Perioadă, Arbore) · **Componente configurate** (saved
presets: Adresa obiectului, Activități CAEM, Nr. de înmatriculare, Perioadă de valabilitate …) ·
Favorite (pinned by the admin).

---

## D. Properties panel

### D.1 Layout and controls

- Right panel, resizable (exists). Header: breadcrumb `Pas › Secțiune › tip` (US-07), title = the
  field's label, key below (read-only chip), actions `⋮` (Duplică, Mută în…, Salvează ca componentă
  configurată, Șterge). Language segmented **RO · RU · EN** in the header switches every translatable
  input in the panel (US-43 AC-04 „comutator de limbă”); a dot marks a missing translation.
- Tabs = library `.tabs .tab-buttons .tab-button` (not the custom `e-permits-builder__property-tabs`):
  **General · Date · Validare · Logică · Avansat**. A tab shows `icon-warning-filled` when it holds an
  error (exists for Data source). Tabs not relevant to a component are hidden (e.g. Text informativ:
  General + Logică).
- Every control = the full-flow form components (components.md „Form fields … product rules”):
  `.e-permits-fo-field` > label > `.e-permits-fo-input` / `.e-permits-fo-textarea` /
  `.e-permits-fo-select` (`renderFoSelectControl`) / date picker; toggles = back-office switch
  (`.switch`, components.md „Toggle”); multiple picks = `renderCheckOption` rows; modes =
  `.segmented-control`; actions = `.btn.btn-sm` (neutral / secondary); inline help = `renderInfoNote`;
  warnings = `renderNotice("warning", …)`. Replace `e-permits-builder__property`, the
  `e-permits-builder__switch` used for Obligatoriu and the `__required-chip`.
- Sections inside a tab = Accordion (`.accordion__trigger[aria-expanded]`), one open at a time
  (SurveyJS ≥ 1.9.129 behaviour), state kept per component type.
- Every change re-renders canvas + Preview immediately (US-07 AC; `renderPreviewAndSchema()`).

### D.2 Tabs per component

| Tab | Sections | Applies to |
|---|---|---|
| **General** | Etichetă și ajutor (Etichetă, Text ajutător, Tooltip, Placeholder/Exemplu) · Comportament (**Obligatoriu** checkbox option, Doar citire, Valoare implicită) · Aspect (Lățime, Poziția etichetei: Deasupra / Ascunsă vizual — 85699, Orientare pentru radio) | all inputs |
| **Date** | Sursă opțiuni (Dropdown family) · Precompletare (registry / MPass / pașaport / alt câmp) · Componente (Adresă parts, Persoana de contact parts, Grilă columns) · Mapare (coloană BD, RAP, formular de tipar) | choice, registry, address, grid, hidden |
| **Validare** | Format (presets + Regex + Testează) · Limite (lungime, min/max, zecimale, rânduri, fișiere) · Reguli de dată · Mesaje (RO*/RU/EN) | inputs |
| **Logică** | Reguli de comportament (US-42): „Afișează / Ascunde”, „Obligatoriu / Opțional”, „Editabil / Doar citire”, „Setează valoarea” — each = `.e-permits-doc-rule` card with „Când” sentence rows `.e-permits-doc-cond` (Câmp · Operator · Valoare / Alt câmp), „Și / Sau”, groups, „Adaugă condiție”, „Adaugă regulă”; „Folosit în” (read-only list of rules, documents US-225, RAP that reference this field) | all (Text informativ: Vizibilitate only) |
| **Avansat** | Cheie câmp / coloană BD (+ Tip SQL read-only) · Editabil la (Eliberare / Reperfectare / Prelungire / Suplinire …) · Afișat în: Verificare (S8), Formular de tipar, RAP · Date personale (GDPR) · Proprietăți FOD (AvailableProperties whitelist: Clearable, Counter, Immediate …) · Descriere tehnică | inputs |

### D.3 Defaults on drop

New field: label = component RO label, key = `CamelCase(label)` + suffix if taken (US-05 AC: unique),
Obligatoriu off, width per C.0, panel opens on General with the label input focused (85698 Sc. 1).
Dropdown / Selecție multiplă: no source (marked „Neconfigurat”, US-22 AC-17). Grilă: no columns
(US-34). Text: validation „Fără”. Dată: no rules (US-41 AC-04).

### D.4 Logic rules (Logică tab)

- Operators by family (US-42 AC-06/25, US-225 AC-19): Text {Este egal, Este diferit, Este gol, Este
  completat, Conține}; Număr / Dată {= ≠ < ≤ > ≥, Este gol, Este completat}; Alegere {Este egal, Este
  diferit, În listă — compares option Id, never label}; Casetă {Este bifat, Nu este bifat}.
- „Alt câmp” lists only fields of the same family; grid columns never listed (AC-36).
- Conflicts: restrictive wins (Ascunde > Afișează …); self-reference and cycles blocked on save with
  „Nu se poate salva: există o dependență circulară între câmpuri.”
- „Ascunde” shows the inline warning (AC-38): „Câmpul ascuns se golește; valoarea nu se restaurează
  la reafișare.”
- Section and step visibility use the same builder.

---

## E. General data and configuration menu (right panel by selection)

| Selection | Panel title | Content |
|---|---|---|
| **Nothing** (click on empty canvas, Esc) | „Date generale formular” | **Identificare**: Denumire tehnică (read-only after creation, US-224 AC-05; latin + cifre + punct ≤ 50) · Cod (FRM-NNNN, 94830, read-only) · Serviciu (read-only) · **Titlu** RO*/RU/EN ≤ 150 · Descriere ≤ 250 · **Utilizare**: Tipuri de solicitare care folosesc formularul („Folosit de”, read-only chips, US-224 AC-10) · Vizibilitate și acces (Acest serviciu / Autoritatea / Global — reuse) · **Versiune**: statut tag Schiță / Publicat / Programat, versiune, Editat la / de, „Istoric versiuni” (opens `#dtpl-history-modal`) · **Limbi**: RO (obligatorie) · RU · EN with completeness „{n}/{total} traduse” · **Pași**: list with order (↑↓) and lock state · **Setări completare**: Salvare automată la schimbarea pasului (US-21), Afișează „Verificare” (S8) sumar pe secțiuni · **Statistici**: nr. câmpuri, nr. reguli, nr. referințe externe |
| **Step** (click on a step chip) | „Pas · {titlu}” | Titlu RO*/RU/EN · Descriere · Tip (Serviciu / Platformă 🔒 with explanation) · Afișat la tipurile de solicitare · Reguli de vizibilitate (Logică) · Secțiuni (ordered list, „Adaugă secțiune”) · Șterge pasul (only service steps; confirm red) |
| **Section** | „Secțiune · {titlu}” | General: Titlu RO*/RU/EN · Descriere · Linie sub titlu · Logică: vizibilitate · ⋮ Copiază (empty clone „(1)”), Mută în pasul…, Șterge (confirm US-43 AC-06; last one blocked AC-07) |
| **Field / component** | „{Etichetă}” + key | tabs D.2 |
| **Grid column** (inside Grilă) | „Coloană · {etichetă}” | same tabs, without Lățime/Logică (US-34 AC-03, US-42 AC-36) |
| **Multiple fields** (Shift/Cmd-click, P2) | „{n} câmpuri selectate” | common props only: Lățime, Obligatoriu, Doar citire, Mută în secțiunea…, Duplică, Șterge |

**Topbar configuration menu** (button group right):
- `N erori` → validation summary popover/drawer listing each problem (object · tab · message, click =
  select + open tab), same model as US-229 AC-23 („lista problemelor găsite, câte un rând pe problemă”).
  Sources: unconfigured source, missing RO label/key, invalid key, duplicate key, invalid regex, empty
  date intersection, broken/circular rule, grid without columns, translation missing (warning only),
  field referenced by documents/RAP removed (US-229 AC-19). 0 errors → success tag „Fără erori”.
- Version `vX.Y ▾` → Istoric versiuni · Compară cu publicată (P3) · Restaurează.
- „Acest serviciu” scope → who can reuse the form (Vizibilitate și acces).
- „Publică” → disabled with reason while errors > 0; otherwise publish modal: „Ce s-a schimbat”
  required (US-229 AC-07), result: version +1, „Modificări nepublicate” on the passport (US-224 AC-12).
- ⋮ More: Exportă setări (JSON) · Importă JSON (P3) · Duplică formularul · Date de test.

---

## F. Interaction spec

1. **Add**: drag from palette to the canvas (drop placeholder + 12-col guides exist) **or click** a
   palette item = add at the end of the active section (US-05 AC) **or** „+ Adaugă câmp” in a section
   opens the palette filtered as a menu (85698 Sc. 3, WCAG 2.5.7 single-pointer alternative). Drop
   outside a section → not-allowed cursor, nothing created.
2. **Reorder / move**: drag a field (source at opacity .4, indicator between fields, never at its own
   position — US-06); drag sections vertically (US-43 AC-17); `⋮ › Mută în…` (step / section / position)
   for keyboard and assistive tech (Atlassian Pragmatic DnD guideline: every drag outcome also in a
   menu); keyboard on a focused card: `Alt+↑/↓` move, `Alt+←/→` width step, `Ctrl/Cmd+D` duplicate,
   `Delete` delete; a polite live region announces „{Etichetă} mutat pe poziția 3 din 7”.
3. **Nesting**: field → section → step; Bloc repetabil and Grilă accept children (Grilă: columns
   only; nesting ≤ 3, US-38). Sections cannot be nested.
4. **Duplicate**: copies all properties, key gets suffix, rules referencing the original are NOT copied
   (avoid silent cycles); section copy = empty clone (US-43 AC-08).
5. **Delete + undo**: field delete without modal → toast `GEAPToast.show({ tone: "info", text:
   "Câmpul «X» a fost șters.", action: "Anulează" })` 8 s; if referenced (rules, documents, RAP) →
   red confirm listing references; section delete = confirm (US-43). `Ctrl/Cmd+Z / Shift+Z` undo/redo
   stack (session).
6. **Selection**: click selects (blue border, US-07), Esc / empty click → form panel; selection is
   reflected in a structure outline (P2, Power Apps tree view) where hidden fields stay selectable.
7. **Empty states** (`GEAPEmptyState`): empty step „Trageți un câmp aici sau alegeți din bibliotecă”;
   palette search no results `.noResults`; grid without columns.
8. **Validation summary**: live count in the topbar; per-field badge on the card (`__tag--warning`);
   the summary is the single source of „cannot save/publish” (US-22 AC-18, US-30 AC-26).
9. **Preview** = **the same renderer**: `renderCitizenPreview` must call the component registry's
   `renderFO` (= `stepFieldHtml` extended), never `previewFieldControl`. Toolbar: Desktop / Mobil (375)
   segmented, Limba RO/RU/EN, Tip solicitare, „Date de test” (fill with sample values, incl. a registry
   fixture), „Validează” (runs required/format like Înainte). Logic rules run live in Preview (US-42
   AC-09). Unsaved changes visible immediately (US-08 AC).
10. **Schema**: JSON of the full form (steps → sections → fields, rules, sources), read-only, Copiază
    with feedback (US-08); version + form id in the header.
11. **Persistence**: autosave to the sandbox DB on every change (exists); concurrency warning text
    from US-41 AC-43 if the stored version changed.

---

## G. Benchmark notes (with sources)

| # | Pattern | Who | Use in GEAP |
|---|---|---|---|
| 1 | Palette grouped Basic / Advanced / Layout / Data / Premium; Data = Hidden, Container, Data Grid, Edit Grid; Advanced = Email, Phone, Address, Date/Time, Currency, Signature | Form.io — [components](https://help.form.io/form-building/basic-components.md), [advanced](https://help.form.io/form-building/advanced-components.md), [layout](https://help.form.io/form-building/layout-components.md), [data](https://help.form.io/form-building/data-components.md) | C categories; Grilă = Edit Grid; Câmp ascuns = Hidden |
| 2 | Settings modal tabs Display · Data · Validation · API · Conditional · Logic · Layout; Data holds default, „clear value when hidden”, calculated value | Form.io — [component settings](https://help.form.io/form-building/component-settings.md) | D.2 tabs (General ≈ Display, Avansat ≈ API) |
| 3 | Every question has `visibleIf`, `enableIf`, `requiredIf`, `setValueIf`, `defaultValueExpression`, validators, `startWithNewLine`, `width`, `titleLocation` | SurveyJS — [Question API](https://surveyjs.io/form-library/documentation/api-reference/question) | US-42 actions map 1:1; Poziția etichetei |
| 4 | Property grid categories collapse, one open at a time; built-in translation tab; Preview tab; JSON editor | SurveyJS Creator — [API](https://surveyjs.io/survey-creator/documentation/api-reference/survey-creator), [v1.9.129 notes](https://surveyjs.io/stay-updated/release-notes/v1.9.129), [v2.0.2](https://surveyjs.io/stay-updated/release-notes/v2.0.2) | D.1 accordion; language switch; Schema mode |
| 5 | Answer types: name, organisation, phone, email, UK/international address, NI number, date, number, file, selection, short/long text; hint text; optional; „add another answer”; routes; Check your answers; declaration; draft of a live form; Welsh switch; autocomplete encoding | GOV.UK Forms — [features](https://www.forms.service.gov.uk/features), [create good forms](https://research.forms.service.gov.uk/create-good-forms) | typed identity fields, Consimțământ, Bloc repetabil, draft vs published, RO/RU/EN |
| 6 | One thing per page; explain why you ask; ask once; „Check answers” | GOV.UK Design System — [Question pages](https://design-system.service.gov.uk/patterns/question-pages), [Form structure](https://www.gov.uk/service-manual/design/form-structure), DWP [Add another thing](https://design-system.dwp.gov.uk/patterns/add-another-thing/how-it-works) | Text ajutător, sections short, S8 summary |
| 7 | 65+ field types; Singpass/MyInfo prefill — government-verified fields locked; NRIC/UEN collection; logic show/hide + disable submission; workflow field assignment | FormSG — [features](https://guide.form.gov.sg/introduction/features.md), [Singpass & MyInfo](https://guide.form.gov.sg/user-guides/advanced-guide/singpass-and-myinfo), [developer portal](https://www.developer.tech.gov.sg/products/categories/productivity-tools/formsg/features) | IDNP/IDNO lookups prefill **read-only**; „Editabil la” per context |
| 8 | Field navigator = existing fields + field types; drag into layout cells | ServiceNow — [Form designer](https://www.servicenow.com/docs/r/platform-administration/c_FormDesign.html) | „Componente configurate” + reuse existing fields as grid columns (US-34) |
| 9 | Tree view of tabs/sections/columns, select hidden elements; columns pane with search; components pane | Power Apps — [form designer overview](https://learn.microsoft.com/en-us/power-apps/maker/model-Driven-apps/form-designer-overview), [tree view](https://learn.microsoft.com/en-ca/power-apps/maker/model-driven-apps/using-tree-view-on-form) | outline (P2) |
| 10 | Field Sections anywhere; visibility rules on fields and sections by record field / permission / device | Salesforce Dynamic Forms — [admin blog](https://admin.salesforce.com/blog/2019/break-up-your-record-details-with-dynamic-forms), [Trailhead](https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/get-started-with-dynamic-forms-lab) | Logică on sections/steps; visibility by request type |
| 11 | Type `/` to insert any block; `/logic`, `/calc`, `/hidden`; logic can show/hide, require, jump, calculate | Tally — [keyboard shortcuts](https://tally.so/help/keyboard-shortcuts), [conditional logic](https://tally.so/help/conditional-form-logic) | keyboard insert menu (P3), Câmp calculat, Câmp ascuns |
| 12 | Logic jumps triggered by answers or hidden fields; hidden fields from URL | Typeform — [logic jumps](https://www.typeform.com/developers/create/logic-jumps), [hidden fields](https://developer.typeform.com/create/hidden-fields) | context values (tip solicitare, canal) as hidden fields |
| 13 | Basic / Payment / Widgets columns; question type taxonomy; branching | Jotform — [form fields](https://www.jotform.com/help/46-Form-Fields), Google Forms — [question types](https://support.google.com/docs/answer/7322334?hl=en), Microsoft Forms — [branching](https://support.microsoft.com/en-us/forms/branch-your-form-or-quiz-using-microsoft-forms) | palette naming in plain language |
| 14 | Generate a form from a DB schema, pick columns, change input type | Retool — [forms](https://docs.retool.com/apps/web/guides/components/forms), [JSON schema form](https://docs.retool.com/apps/guides/forms-inputs/json-schema-form); Budibase — [form block](https://docs.budibase.com/docs/form-block) | P3: „Generează din clasificator / registru” |
| 15 | Business term vs field: one BT instantiated as context-specific fields with stable ids | EU eForms SDK — [understanding the SDK](https://docs.ted.europa.eu/eforms/1.13/guide/understanding-the-sdk.html), [field metadata](https://docs.ted.europa.eu/eforms/1.13/fields/index.html) | stable Cheie câmp, mapping to BO / RAP terms |
| 16 | Single-pointer alternative to every drag (WCAG 2.2 SC 2.5.7, AA) | [DAISY KB](https://kb.daisy.org/publishing/docs/wcag/dragging-movements.html), [TabNav](https://tabnav.com/academy/wcag/success-criterion-2.5.7) | click-to-add, „Mută în…”, arrow moves |
| 17 | Drag alternatives via an action menu on each draggable; announce results | Atlassian — [Pragmatic DnD accessibility](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/), [design guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines) | ⋮ menu + live region |
| 18 | Once-only: ask the same data only once; registries own data | EU SDG Reg. 2018/1724 — [legislation.gov.uk](https://www.legislation.gov.uk/id/eur/2018/1724); Estonia X-Road — [e-estonia](https://e-estonia.com/solutions/interoperability-services/x-road/) | Date tab „Precompletare” first; registry fields read-only |

**Top insights applied:** (1) one schema / one renderer for builder, preview and live form (Form.io,
SurveyJS, US-08); (2) tabs General·Date·Validare·Logică·Avansat mirror Form.io's model; (3) logic
as declarative per-element conditions (SurveyJS `*If`) = US-42; (4) registry prefill locked, never
retyped (FormSG MyInfo, once-only); (5) plain-language typed fields instead of generic text (GOV.UK);
(6) every drag has a click/menu/keyboard twin (WCAG 2.5.7, Atlassian); (7) draft of a live form +
versions + validation summary before publish (GOV.UK Forms, US-229); (8) reusable configured
components (ServiceNow field navigator, our Address/CAEM); (9) hidden/context fields and calculated
values are first-class (Tally, Typeform, Form.io); (10) structure outline to reach hidden elements
(Power Apps).

**Public-sector constraints:** WCAG 2.2 AA for both the builder and the produced form (labels bound
to inputs, errors announced, 44px targets — US-32 AC-27, 2.5.7 drag alternative, 3.3.7 redundant
entry → prefill); plain language and hint text; data minimisation (Avansat › „Date personale”, ask
only what the BO uses — every field must be mapped or justified, warning if unused); once-only
(registry prefill before manual entry); audit of every configuration change and every registry call
(US-04, US-54 AC-22/23, US-224 AC-14); requests are bound to the schema version at submission
(US-42 AC-37, US-229 AC-29).

---

## H. Build plan (code first, then Figma)

| Batch | Content | Demo states |
|---|---|---|
| **0 · Foundation** | component registry `FB_COMPONENTS`; Preview + canvas card + FO through one `renderFO` (extend `stepFieldHtml`, delete `previewFieldControl` heuristics); schema = steps → sections → fields; properties panel shell with library tabs + full-flow controls; Obligatoriu = checkbox option everywhere (incl. Address parts); RO labels for all builder chrome (Field library → „Bibliotecă”, Configured → „Componente configurate”, Data source → „Date”, Unconfigured → „Neconfigurat”, Search… → „Caută”) | `fb-01`, `fb-02` |
| **1 · MVP palette** | categories + search + click-to-add; Text, Text multilinie, Email, Telefon, Număr, Sumă, Dată (date picker), Listă derulantă (exists), Butoane radio (+ Da/Nu), Casetă de bifare, Listă de bifare, Text informativ, Secțiune (multi-section), Adresă (exists); tabs General + Validare (presets + Testează); duplicate, delete + undo toast, `⋮ Mută în…`, keyboard moves; live `N erori` summary | `fb-03…fb-09`, `fb-11…fb-13` |
| **2 · Logică + structure** | Logică tab (US-42 via `.e-permits-doc-rule`), section/step visibility, date rules (US-41), cascade already in Date; Selecție multiplă, Comutator segmentat, Perioadă, Notă cu titlu, Separator; step panel (add/rename/reorder service steps, locked platform steps); Preview toolbar (Desktop/Mobil, limbă, date de test) | `fb-10`, `fb-10a`, `fb-14`, `fb-14a`, `fb-20` |
| **3 · Registre și context** — ✅ built 13 oct 2026 (+ batch-2 leftovers: reguli de dată US-41, „Alt câmp”, Preview „Validează”) | IDNP (RSP), IDNO (RSUD) lookups with read-only targets + skeleton/errors; Persoana de contact pattern; Subdiviziune; Câmp ascuns; Consimțământ; Fișier; Document din MDocs; „Componente configurate” save/insert; Avansat tab (Editabil la, RAP, tipar, GDPR) | `fb-15`, `fb-15a`, `fb-17`, `fb-19` |
| **4 · Grilă** — ✅ built 13 oct 2026 | Grilă editabilă (column editor US-34, rules US-36, complex columns US-37, ≤ 3 levels), Activități CAEM as a configured preset, Bloc repetabil; mobile row cards | `fb-16`, `fb-16a`, `fb-16b` |
| **5 · Form level** | Date generale (versions, languages, request types), publish with blockers, Istoric versiuni, Schema export/import, translations completeness view; P3: Câmp calculat, Dată și oră, outline tree, multi-select, `/` insert menu | `fb-18`, `fb-21`, `fb-22` |

**Batch 3 status (13 oct 2026).** Built: IDNP (MPass / typed / RSP with declaration), IDNO (MPass /
RSUD via the shared guest lookup), Persoana de contact (parts), Subdiviziune (derived / chosen /
automatic, classifier source), Fișier (boxed, types · size · count), Document din MDocs, Câmp ascuns
(fixed / context / rule „Setează valoarea”), Consimțământ (linked legal text, always required),
Componente salvate (save · insert · update from source · push to source · detach), Avansat (copy key / id,
API key, BO mapping, editable per request type, shown in, GDPR + retention, FOD props, audit), date
rules with reciprocity (US-41), Logică „Alt câmp”, Preview „Validează”. Demo states `fb-30…fb-43`
(the planned `fb-15/15a/17/19` are covered by `fb-32/32b`, `fb-17` (unchanged), `fb-39`).
Not built / open: RSP manual entry when the registry is down (I-8), IDNO name for a PF applicant in
„din MPass” mode (shows „—”), MDocs document type list from a real classifier, „CSS width override”
(not in the spec → not built), field-level audit is session-only (no MLog backend).

**Batch 4 status (13 oct 2026).** Built: Grilă editabilă (band of columns on the canvas + Date list,
column panel = field panel, simple columns Text · Număr · Sumă · Dată · Casetă · Radio, complex Listă ·
Selecție multiplă · Grilă imbricată after a simple one, ≤ 3 levels, widths Auto/Îngustă/Medie/Lată, row rules
min / max / at start / per page / add / delete / key / group, messages RO·RU·EN; FO: inline row edit with
Enter / Esc, per-cell errors, delete confirm, cascade from a column or a form field, group rule, pagination,
nested detail rows, cards below 600 px, source down / skeleton), Bloc repetabil (FO activity card per element,
remove + undo, key / group, min / max, rules between the fields of a card), Activități CAEM as a system saved
component (repeatable block + CAEM combobox + dependent subgenres = the step-2 markup), schema `storage`
(child tables), validation summary incl. children. Seed form `form-sanitary-09`. States `fb-50…fb-63`
(the planned `fb-16/16a/16b` = `fb-51`, `fb-58`, `fb-53`).
Deviations: US-40 calls CAEM „a grid” — built as the repeatable block (same 1:N model; subgenres don't fit a
cell; the cards are the FO activities). „Saved configuration” (US-34 AC-06) = at least one simple column (the
builder autosaves). Row delete = confirm (US-35 AC-04); block element delete = undo toast. Totals / summary
row: in no story → not built. Dată și oră column waits for batch 5. Cascade with 1 parent (US-22 says 1..n).
Not built / open: server-side validation and the child tables (backend), RU/EN classifier values (fallback
RO), Introdu manual for the block (grid only), DnD inside the panel list (canvas band + keyboard + menus).

**Demo states to add** (`js/demo-states.js`, `flow: "builder"`; scope selector `#form-builder-modal`):

| Id | State |
|---|---|
| `fb-01` | empty service step: empty state in the section, palette open, nothing selected → „Date generale formular” |
| `fb-01a` | palette search „dat” → Dată, Dată și oră, Perioadă, Date din registre group |
| `fb-02` | form selected — Date generale (versions, languages 2/3, request types chips) |
| `fb-03` | step chip selected — Pas panel (service step) · `fb-03a` locked step „Plată” |
| `fb-04` | section selected — Secțiune panel with RU title missing dot |
| `fb-05` | Text field — General (Obligatoriu checkbox option checked, star on canvas + preview) |
| `fb-05a` | Text — Validare: preset Telefon, Testează with a failing sample |
| `fb-05b` | Text — Validare: Regex personalizat invalid → error in tab + summary |
| `fb-06` | Dropdown just dropped — „Neconfigurat” on card, Date tab warning icon |
| `fb-06a` | Dropdown — Clasificator existent + Câmp dependent (Raion → Localitate) |
| `fb-07` | Butoane radio — static options editor, preset Da/Nu |
| `fb-08` | Dată — reguli: ≤ azi, and Data sfârșit ≥ Data început |
| `fb-09` | Sumă — MDL suffix, min 0 · `fb-09a` Număr cu unitate (m²) |
| `fb-10` | Logică — rule „Afișează IDNO când Importator = Nu” · `fb-10a` circular dependency blocked |
| `fb-11` | drag in progress: placeholder + 12-col guides · `fb-11a` keyboard „Mută în…” menu open |
| `fb-12` | field deleted — toast with „Anulează” |
| `fb-13` | validation summary open (6 erori, grouped, click jumps) |
| `fb-14` | Preview desktop with logic live (radio Nu → IDNO appears) · `fb-14a` Preview mobil 375 |
| `fb-15` | IDNO lookup — Date tab: RSUD, maps Denumire importator (read-only) · `fb-15a` Preview filled from RSUD |
| `fb-16` | Grilă — column editor empty · `fb-16a` CAEM preset · `fb-16b` grid rules (min/max, coloană-cheie) |
| `fb-17` | Adresă — parts with Obligatoriu checkbox options (replaces switches) |
| `fb-18` | Schema JSON of the full form |
| `fb-19` | Componente configurate: „Salvează ca componentă configurată” modal |
| `fb-20` | Preview RU with a missing translation falling back to RO |
| `fb-21` | Publică blocked with reasons · `fb-22` Istoric versiuni |

Definition of done per batch: `ui-qa-code` with the batch's `fb-*` states (scope
`#form-builder-modal`), then Figma (`figma-designer`, page „Form Builder”) + `ui-qa-figma`; playbooks
updated; components.md gains the new families (registry, properties panel, palette, grid, lookup).

---

## I. Open PO questions

1. Default language of the form content: RO (US-30/31/41/43) or EN (Feature 85693)? Spec assumes RO.
2. Field configuration in a side panel (US-07, prototype) or modal dialog with tabs (85699)? Spec: side panel.
3. Are 85694 „tab-uri” the FO steps (Pași), or tabs inside one step? Spec: steps.
4. Widths: add span 3 (US-41 Date default 3) to the allowed set {4, 6, 8, 12}? And keep free 1–12 (US-07) or presets only?
5. Which steps are platform-locked and may a service add a second service step (e.g. „Detalii obiect” + „Activități”)?
6. May an admin change a field key after the form was published (column already exists)? Spec: locked, label free.
7. One form per request type, or one form with „Editabil la / Afișat la” per request type (Feature 90575 vs US-26 suplinire)? Spec supports both via Avansat.
8. Registry lookups (IDNP/RSP, IDNO/RSUD): when the registry is down, is manual entry allowed (and flagged for the specialist)?
9. Should IDNP used only for prefill be shown in the request (US-48 discussion) and is a consent checkbox required before the call?
10. Calculated fields: needed by any service (taxes are computed elsewhere, US-234)? If yes, which operations?
11. Time-only and date-time inputs: any real service need? (library `time-input` is unimplemented.)
12. Grid edit modes Dialog / Formular inline: out of scope (Feature 88573) — confirm the mobile row-card variant replaces them.
13. „Componente configurate”: per service, per authority or global; who may publish a shared one?
14. Form templates / library (US-03 „pornire din bibliotecă”): copy from another service's form, or only blank?
15. Form identifier format: `FRM-NNNN` or `FXXXX` (Feature 94830 open question)?
16. Where do validation messages live: per field (US-30, admin-editable) vs system resources (US-31)? Spec: system defaults + per-field override for format/date rules only.
17. Translations: should RU/EN be mandatory before publish, or only a warning (fallback RO)?
18. Data minimisation: should publish warn on fields not mapped to BO / RAP / tipar / any rule?
19. Builder roles: US-43 AC-19 says sections only for System admin, US-30/41/42 allow Authority admin for its services — align.
20. Service 23 „Notificare în comerț” (prototype demo form) has no S5 story — confirm its fields or switch the demo to 09.
21. Registre interne (Feature 94523) „Completează un formular” — will BO-only forms be built in the same builder (no FO steps)?
