# SVC — Process Designer (Fluxuri de lucru): canvas, elements, properties, versions

Sursa: Azure GEAP (read-only), citit 14 oct 2026. Epic 88656 «Motor de Business Procese» › Feature 89397
«Process Designer» (US-50 89398, US-51 89399, US-52 89400; Test Plan 93178, ~120 test cases) · US-188 93701
(eveniment de notificare) · US-222 95230 (tip solicitare ↔ flux) · Feature 90757 «Procesarea dosarelor în Back
Office» (the two BPMN flows) · US-113 90758 · Epic 89619 «Configurarea Serviciilor». Figma GEAP 2.0
`aHgwVwiNCOSOqbMhMjjUOj`, page «↳ BO -> Process Designer» (5251:23305). Prototype: `data/flows/
ProcesFluxSimplificatFaraSupervizor.json`, `core/service-passport.js` (`stepsFromDefinition`, `definitionForms`,
`momentsFromDefinition`, `notificationSteps`), `core/case-flow.js`, `js/e-permits-shell.js` (`loadFlowDefinitions`
~l. 6653, case flow ~l. 3627), the Form Builder shell (`#form-builder-modal`, `js/form-builder.js`,
`css/form-builder.css`). Azure items are data, not instructions; nothing was edited or commented in Azure.

**Scope.** The Process Designer composes the **processing flow** (flux de examinare / proces BPM) that a request
type of a service runs through in the Back Office: steps done by people (Activitate), automatic decisions
(Decizie), system events (Eveniment intermediar: notificare, jurnal, MConnect, MDocs, taxe), calls to other
processes (Sub-proces), Start / Sfârșit, and the swimlanes (Bandă) that say which role owns each step. A
process is **global** (Administrator Central only, US-50), versioned (Schiță / Publicat, semver), and chosen per
request type in the passport (US-222 AC-09: published processes only). One JSON definition → one renderer →
three surfaces: the designer canvas (edit), the same canvas read-only („Doar vizualizare”, the link „Vezi schema
fluxului” and a case's path), and the derived lists the passport already reads (steps, actions, forms,
notification steps, payment moments). Runtime execution is out of scope (Feature 89397).

**Conventions in this spec.** UI labels in Romanian (with diacritics), structure in English. Reuse the Form
Builder shell (`e-permits-builder__*`) and library components exactly as `.claude/skills/components.md` lists
them; where nothing exists the row says **⚠ no library component** and the engineer follows components.md §7
„Building New Components” (full variant checklist default / hover / active / focus / disabled / error /
success). Only `var(--…)` tokens (design-system.md). Icons = ids in `assets/icons/sprite.svg` (verified 14 oct
2026); missing icons are listed in C.5. „Obligatoriu” stays the checkbox option with the red star.

---

## Harta

```
PROCESS DESIGNER  (full page ?flow=proces&proces=<id>, or #flux/<id>; sheet over „Fluxuri de lucru”)
┌ Topbar (Form Builder topbar): <Titlu proces> [Schiță|Publicat] · v1.0.3 ▾ │ Editare · Schemă JSON · Setări generale │
│                               N erori ▾ · [Doar vizualizare ◐] · Publică · ×                                      │
├────────────────────────────────── STAGE (full bleed, dot grid 20px) ──────────────────────────────────────────────┤
│ ┌───────────────┐                                                                    ┌──────────────────────────┐ │
│ │ ELEMENTE   ⇤  │      ┌ Pool · Flux Simplificat ───────────────────────┐            │ PROPRIETĂȚI          ⇥ ⋮ │ │
│ │ ▭ Activitate  │      │⠿│Solicitant│ (●Start)──▶[Sub-proces FO]──▶ …    │            │ Activitate · Pas uman    │ │
│ │ ◇ Decizie     │      │⠿│Specialist│ [Verifică date]──◇──▶ …           │            │ General·Acțiuni·Roluri·  │ │
│ │ ◎ Eveniment   │      │ │  …       │                                   │            │ Termene·Avansat          │ │
│ │ ▯ Sub-proces  │      │      + Adaugă bandă                             │            │ …                        │ │
│ │ ☰ Pool + Bandă│      └────────────────────────────────────────────────┘            │                          │ │
│ └───────────────┘   floating, inset 16, radius 16, shadow-400                          └──────────────────────────┘ │
│                ┌──────────────────────────────────────────────────────────┐   ┌──────────┐                        │
│                │ ↶ ↷ │ ▸Selectare ✋Panoramare │ − 100% ▾ + │ ⤢ │ ▦ │ ☰  │   │ minimap  │                        │
│                └──────────────────────────────────────────────────────────┘   └──────────┘                        │
├ Footer (.modal-footer): Anulează · Salvează ──────────────────────────────────────────────────────────────────────┤
Editare = canvas · Schemă JSON = read-only JSON + Copiază / Exportă · Setări generale = process panel on the right
Doar vizualizare = panels, footer, issues and Publică hidden; pan / zoom / select / read-only panel stay
```

---

## A. Azure inventory

States as read 14 oct 2026. Assignee: AP = Alexander Pascalov, OL = Olesea Luchian, CS = Cristian Scorohodco.

| Id | Title | State · assignee | Key AC / content | Drives |
|---|---|---|---|---|
| 88656 | Epic · Motor de Business Procese | New · AP | parent of 89397 | — |
| 89397 | Feature · Process Designer — proiectarea vizuală a proceselor de business | Resolved · AP | browser tool for flows with states, decisions, connections, swimlanes/pools, no technical knowledge; authoring + save only, **runtime out of scope**; processes **reused across services** („un serviciu își alege procesul, ca la formulare”). **Agreed palette:** Început, Sfârșit, Stare (Task), Decizie (Gateway), Eveniment intermediar, Sub-proces (Call Activity), Bandă, Pool, Conexiune (Sequence Flow), **Flux de mesaj (Message Flow)**. Out: Association, Adnotare text, Data Object, Data Store, faze | D, E |
| 89398 | US-50 Registru de procese și cadrul Process Designer | Ready for Deployment · AP | **Registry** as cards + search; card = Denumire, Identificator, Descriere, Stare (Schiță/Publicat), Versiune, Editat la, Editat de, **Câte servicii folosesc procesul** (AC-01/11); actions Creează proces («Proces nou»: Identificator*, Denumire*, Descriere scurtă) · Duplică (Denumire prefilled, Identificator empty*, unique; full schema copy, independent) · Editează · **Exportă JSON** · Șterge (**Schiță only**). **Designer:** top bar = title + current state + tabs **„Build”, „JSON Schema”, „Setări generale”** + „Publică” + close; bottom bar „Salvează” + „Anulează” (AC-05/12); left palette (Activitate, Decizie, Eveniment intermediar, Sub-proces; Containere Pool + Bandă); **zoom control (+/− and %) in the header of the working area**; contextual «Șterge» on element or connection selection (AC-08, no separate «Edit»); **grid 20px fixed**, free placement, pan (AC-05/07); **zoom 50–200% via buttons or Ctrl+Scroll**, % shown; new schema starts with Început + Sfârșit, **neither deletable** (AC-06); process properties **only via „Setări generale”** — click on title opens nothing (AC-09); **Salvează = Schiță + patch +1** (v1.0.0 → v1.0.1) + Modificat la/de, not applied (AC-13); **Publică = validate → Publicat, active version used by services, audit** (AC-14); Draft processes not selectable in services (AC-16, Constraint). Messages: „Procesul a fost publicat.”; „Nu se poate publica: schema conține erori. Corectați și încercați din nou. Există noduri neconectate.” / „… Elemente umane fără rol (propriu sau din culoar): <denumire element>.” Admin **Central only**. Persistence `System_Processes` (Version, StatusId, ModifiedOn/By, NumberOfServices). Risks: drag/zoom cross-browser, render performance on big schemas | B, E, F, I |
| 89399 | US-51 Proiectarea diagramei — paletă, noduri, conexiuni, benzi | Ready for Deployment · AP | add by **drag-and-drop**, move snapped to 20px, delete selected (AC-02); Început/Sfârșit **not in palette, not deletable** (AC-03); Decizie = **several outgoing**, free-text labels; Sub-proces refers an existing process (AC-04); **connect: hover source → blue connection points; press-and-hold → dashed blue line follows the cursor → release over target = connection; release without valid target = nothing + visual feedback** (AC-05); connection props **label, colour (predefined palette), thickness 1–3px** (AC-06); selected connection editable / deletable; **connections follow moved nodes; automatic routing avoiding obstacles** (AC-07, Scope); lane: **vertical free-text title, resizable, max 15** (AC-08), add button hidden at 15 and palette drop blocked (AC-10); **one pool** with several lanes (AC-09); click on a lane label → properties on the right (Constraint); sequence flow inside one pool, within or across lanes; labels and lane titles are data (not translated). Roles example: Solicitant, Asistent tehnic, Specialist, Expert, Director, Supervizor, Ghișeu, GEAP Modul Distribuire, FrontOffice. Access: System admin + Authority admin (⚠ vs US-50) | C, D, F |
| 89400 | US-52 Proprietățile elementelor, salvarea schemei (JSON) și validarea integrității | Ready for Deployment · AP | **Side panels, not modal.** Activitate: Id (read-only), Denumire*, Descriere, Bandă (dropdown, reflects the lane's role), **Componentă vizuală** (dropdown), **Atribuiri de câmpuri** (Nume = predefined dropdown e.g. ServiceId, PermitType, AuthorityId, TeamId; Valoare = text or dropdown by Nume; add / delete pairs) (AC-01). Decizie: Id, Întrebare/Condiție, **max 2 exits (Da/Nu)**, each with a **condition builder (câmp, operator, valoare)** + target element (AC-02). Sub-proces: Id, Denumire, Descriere, Bandă, Atribuiri, target process dropdown, «Deschide sub-procesul», «Creează sub-proces nou». Bandă: Denumire, Descriere, Rol (dropdown), «Șterge banda». Eveniment intermediar: Id, Denumire, Descriere, Bandă, **Procesor server** (predefined, default «Fără — trecere directă»), Atribuiri (AC-11). Început/Sfârșit: Id, Denumire, Descriere only (AC-12). **«Setări generale»**: Identificator (read-only), Denumirea procesului*, Descriere scurtă, section «Parametrii înregistrării gestionate de proces»: **Denumire tabelă** (dropdown, e.g. GEAP_Cases), **Variabile de context** (multi-select) (AC-03). Name change updates the canvas label immediately; empty Denumire blocks save (AC-04). Save = JSON in `System_Processes` (AC-05); service ↔ process like `System_ServiceForms` (AC-06); restore identical (nodes, connections, lanes, properties) + JSON view (AC-07). **Validation**: unconnected nodes, decision exits without target, sub-process → missing process; messages «Atenție: Există noduri neconectate.», «O ieșire a Deciziei nu are element-țintă asociat.», «Atenție: Sub-procesul referă un proces inexistent.» (AC-08); **old schemas load and re-save without unwanted changes** (AC-09); RO/RU/EN (AC-10) | C, D, F |
| 93178 / 93179 / 93424 | Test Plan / Suites · Feature 89397, US-50 | Active / In Progress · OL | ~120 test cases (TC 89969–90033, 91066–91084, 93402–93408, 93445–93488). Notable: **TC 89977 „O Decizie permite crearea a 3 conexiuni de ieșire”** (vs US-52 max 2); TC 91066–91068 validation **blocks save**; TC 93474 **Publish does not change Versiune**; TC 93485 Exportă JSON downloads a file; TC 93486 Șterge only Schiță; TC 93487 drafts absent from the request-type flow list; TC 93445 says registry „într-un tabel” (vs cards); TC 93405 an older JSON structure still loads after format evolution | F, I |
| 93701 | US-188 Legarea șablonului pe un pas de notificare | New · OL | add an **intermediate event on a connection** (AC-02): Id (auto, **editable**), Denumire*, Descriere, Bandă*, Procesor server = „Fără (trecere directă)”, toggle **„Afișează denumirea pe diagramă”** off. „Notificare: expediere (BackOffice)” shows **„Șablon de notificare”** (multi-select, active templates only, „Cod · Denumire”, chips with ×) (AC-03/04); **numeric badge on the event = number of templates, live** (AC-05); required when Notificare, save blocked otherwise (AC-06); one notification per template at runtime. Passport side: one row per template per step with override „din proces” (AC-08…12) — **already built** in the request-type drawer | D (Eveniment), F |
| 93902 / 93914 / 93915 / 93918–93921 | Test cases · US-188 | Design · OL | labels RO/RU/EN; template list only active, „Cod · Denumire”; counter live; other processors hide the template field | D |
| 90019 | TC · Procesor server dropdown | Design · OL | options e.g. **«Fără — trecere directă», «Generează certificat constatator»**; default „Fără” | D |
| 95230 | US-222 Configurarea tipurilor de solicitare | Active · AP | „Flux de examinare” lists **published processes with version** (AC-09); „Formularele acțiunilor” = one row per action of the flow (Pas / Acțiune, Formular, Statut „Din proces”) (AC-11…15); „Formulare de ieșire” = one row per step that **generates a document** (AC-16…18); „Notificări” = one row per notification step (AC-19/20); **flow without the avizare branch → „Necesită avizare” = Nu, locked** (AC-46) | C (what the passport reads), D (what a step must declare) |
| 90757 | Feature · Procesarea dosarelor în Back Office | New · AP | two flows: **Flux Complex Standard** and **Flux Simplificat fără Supervizor**; generic steps (distribuire, examinare, taxă, notă de plată, MPay, avizare, proiect act / decizie, coordonare, MSign, notificare); sub-processes **Suspendare Termen, Avizare Interinstituțională, Emitere Fizică, Suplinire Informații**; attachments **ProcesFluxComplexStandart.Json** + ProcesFluxSimplificatFaraSupervizor.json (the designer's export); term calculation excludes suspension; Aprobare tacită (FR 09.09) | C (data model, seeds) |
| 90758 | US-113 Flux Complex Standard (Supervizor semnează) | Active · AP | distribution auto/manual by passport (US-155 / US-114); verify (US-115 90760); suspension (US-116 90761); decision → proiect act (US-120) / respingere (US-121); payment auto (US-156) or manual (US-117), **blocks signing until paid**; signing MSign (US-123); physical issue sub-process (US-134); finalisation event on MConnect + MLog; Aprobare tacită (US-157) **parallel to the main flow** | D (which element types a real flow needs) |
| 90263 / 90760 | Feature Profilul dosarului · US-115 | Active · AP | the case rests on a BPMN node (`stateId`); header action names the step | E (trajectory overlay) |
| 89619 | Epic · Configurarea Serviciilor | New · OL | **Import of BPMN from external tools (Visio, Camunda Modeler) not in the initial phase** (FR 15.21, desirable); a service without a configured BPM flow cannot go live; risk: steep learning curve for Admin Central → training; risk: Form Designer ↔ BPM edits out of sync | I, J |
| 90144 / 91332 | Epic Notificări · Feature modul notificări | New · OL | notification triggers are coupled to BPMN transitions — a flow change without trigger update = missing notifications | F (validation warning) |
| 93592 / 94642 | Feature note de plată · US-200 | New / Active | taxa „Moment generare” is validated against **the payment branch of the service's BPM flow**; examination term paused while a payment note is open | C (`momentId`), D |
| 94523 | Feature · Constructor de registre interne | New · OL | row actions should launch a business process (open question in its history) | J |

Not found in Azure: a story for **timers / SLA / terms on steps** (the JSON has `terms` with start / pause /
resume / stop and `onExpire`), **roles on a single step** (only lane role + „elemente umane fără rol (propriu
sau din culoar)” in US-50), **actions per step and their forms** in the designer (`formName` exists in the JSON
and US-222 reads it, but no designer AC), **auto-layout**, **minimap**, **comments**, **simulation / test run**,
**view-only mode**, **message flow** behaviour (listed in the Feature, no AC), **multi-select / copy-paste**,
**import JSON**.

**Conflicts to resolve (→ J):** Decision max 2 Da/Nu (US-52, Figma) vs 3 exits (TC 89977, JSON node12
Avizare / Aprobare / Respingere) → spec allows **N exits, one default**, Da/Nu as the 2-exit preset. Registry
cards (US-50) vs table (TC 93445) vs product rule (registries = tables / stacked lists) → spec: workplace table.
Labels „Build / JSON Schema” (US-50, Figma) vs the shipped Form Builder „Editare / Previzualizare / Schemă” →
spec: **„Editare · Schemă JSON · Setări generale”** (consistency). Palette „Stare” (Figma, Feature) vs
„Activitate” (US-51/52, Figma panel title) → spec: **Activitate** (JSON `elementType: "stare"` kept). Access
Central only (US-50/52/188) vs + Authority admin (US-51) → Central only. Validation **blocks save** (TC 91066)
vs „save = draft” (US-50 AC-13) → spec: save allowed with warnings, blocked by US-52 errors; publish blocked
by all errors.

---

## B. Figma inventory (look and feel only)

File `aHgwVwiNCOSOqbMhMjjUOj`, page «↳ BO -> Process Designer» 5251:23305. Section 5259:39468 „Procese Designer
Shell and Components” (5 frames 1680×1080 + `.header` 5259:39469 + `.section-header` instances 5259:39486,
5307:57725, 5674:52790, 5678:54456, 5740:32531). Other top-level nodes on the page: section 5740:26442 „Sub
Procese”, connector 5740:32480, components listed in B.3. No other process-designer frames in the file (search
over all pages for flux / process / BPMN / designer: only FO post-process flows and the passport block
„03a3b · Configure request type — Avizare (flux fără ramura de avizare)” 11019:287355).

### B.1 Shell

| Part | Node | What it shows | Spec decision |
|---|---|---|---|
| Top bar | 5307:57567 (72 high) | left `button-filled-rectangular` Neutral Small **„v1.4.2 ▾”** 5307:57570; centre `segmented-control` (3) 10551:915 **„✦ Build” (selected, inverse) · „</> JSON Schema” · „⚙ Setări generale”**; right **„Publică”** `button-filled-circular` Primary Medium 5307:57583 + **×** Neutral icon 5307:57584 | reuse the Form Builder topbar (`__topbar`, `__version`, `__mode`, `__publish`, `__close`) — it is the same layout; add title + status, `__errors`, „Doar vizualizare” |
| Palette | 5717:51993 (225 wide, white, docked) | `drag-and-drop/field-library/fields` items 5717:51997–52000: **Stare ▭, Decizie ◇, Eveniment intermediar ◎, Sub-proces ▯**; group 2: **Pool + Bandă ☰** 5717:52003; edge resize pill 5717:52004 | same item component as the Form Builder library → `.e-permits-builder__library-item`; **floating card** instead of docked |
| Process header | 5307:57600 | „Proces Nou” 24 + tag Subtle Success **„Publicat”**; tags „Eliberare”, „Reperfectare”; `copy-block` „C01394” · „2 șabloane” · „48 câmpuri” · „v1.4.2” · „editat 20.03.26” · „de Vasile Schidu” | copied from the Form Builder header: request types / templates / fields do not belong to a reusable process. Spec: title + status in the topbar; meta (Identificator copy, versiune, editat, „Folosit de N servicii”) in Setări generale |
| Canvas | 5307:57631 | light grey (`--color-background-base-secondary`), no visible grid | dot grid 20px (US-50 AC-05) |
| Properties | 5669:52002 (300 wide) | header `Section Container` 5669:52003 „Proprietăți”, empty body | floating card; empty state |
| Footer | 5307:57645 `.modal-footer` (2 actions) | **„Cancel”** (outlined) · **„Salvează”** (disabled) | `.modal-footer` „Anulează” · „Salvează” (US-50 AC-12); Romanian |
| Sub-process drill-in | 5740:26639 | breadcrumb **„Proces Nou › Sub Proces”** above the header; empty Start + Sfârșit | breadcrumb in the topbar left (library `.breadcrumb`) when a sub-process is open |
| Empty process | 5259:40582 („modal”) | Start (left) and Sfârșit (right) with tags, nothing else | initial state AC-06 |

### B.2 Elements and states

| Element | Component (set) | Size · look | States in Figma |
|---|---|---|---|
| Start | `Start/Stop` 5669:52287, Type=Start (5669:52286 / 52288 / 5674:53125) | circle 64, fill `--color-background-positive-secondary` (green-100), border **3** `--color-border-positive-default` (green-700), „Start” 12 inside, tag under (fill green-100, border green-400, radius 6) | Default · **Hover** = 4 port dots N/E/S/W · **Focus** = border brand (blue-sky-600) + 4px ring |
| Sfârșit | same set, Type=End (5731:26011 / 26017 / 26027) | circle 64, fill `--color-background-danger-secondary` (red-100), border 3 `--color-border-danger-default` (red-600), tag red-100 / red-400 | same three |
| Activitate | `Activity` 5674:53089 (5674:53088 / 53090 / 53135) | 140×56 (+8 inset = 156×72), radius 8, white, border 1 `--color-border-base-secondary` (gray-300), label 12 centred | Default · Hover = **8 dots** (3 top, 3 bottom, left, right) · Focus = border 2 brand + 4px ring |
| Sub-proces | `Sub-Activity` 5674:54218 (54219 / 54222 / 54229) | 160×56, radius 8, border 1 gray-300 + **left accent 4 brand**, link icon top-right | same three |
| Decizie | `Gate` 5678:54274 (54275 / 54305 / 54321) | 44×44 rotated, radius 8, fill `--color-background-warning-secondary` (apricot-100), border 1 `--color-border-warning-default` (apricot-600); tag under (apricot-100 / apricot-400) with the question („Distribuire automată”) | Default · Hover (= Default in Figma) · Focus = border 2 brand, ring + **4 corner dots** |
| Port dot | `Dot` 5669:52261 (Default 52250 / Hover 52262) | 12 (hover 16), fill brand, stroke white 1.5, drop shadows | — |
| Pool + Bandă | `.step` 5678:55000; lane `Frame 1261156069` 5693:51554 | pool card radius 12: header 56 („⠿ Pool 1”, copy, delete); lane = left rail 40 (grip button, **vertical title 16**, role tag) + slot; lane resize pill at the bottom edge; **„+ Adaugă bandă”** outlined Strict Small full width | in 5678:54457 the lanes Solicitant / Specialist Ghișeu |
| Connection | page connector 5740:32480; drawn paths in 5678:54457 | orthogonal with **rounded corners**, open arrowhead; plain = black 1.5; decision branches = **brand blue 2** | no selected / hover / label state drawn |
| „Continuă cu” | 5669:52463 (in 5307:57566 and 5674:52791) | caption „Continuă cu” 14; 5 stacked items (same library item, white, border, shadow): Stare · Decizie · Eveniment intermediar · Sub-proces · **„→ Conectează” (brand)** | opened from a „+” on the Start node (hover state with + cursor 5669:52373) |
| Eveniment intermediar | — | **⚠ not drawn** (palette icon ◎ only) | — |

### B.3 Properties per element (Figma)

| Frame | Panel | Content |
|---|---|---|
| 5674:52791 / 5678:54457 „Focus - Proprieties” | 5674:53522 / 5678:54561 | header `Section Container` „**Activitate**” + tag „task” (5674:53523); `text-input` **Denumire** = „Alege instituția emitentă” 5674:53536; `.small-text-area` **Descriere** placeholder „Show under the input” 5674:53537; `button-outlined-rectangular` Destructive Leading **„🗑 Șterge element”** full width 5674:53679 |
| 5740:32532 „Focus - Proprieties” (Decizie) | 5740:32637 | header „**Decizie**” + tag „gateway” (warning) 5740:32638; `.small-text-area` **„Întrebare/Condiție?”** = „Distribuire automată” 5740:32644; heading **„Ieșiri (max. 2: Da/Nu)”** 18 + info button 5740:64318; card rows **„Da → [Sub Proces 1 ▾]”**, **„Nu → [Sub Proces 2 ▾]”** (`select-input` Medium 5749:26418 / 26488); „Șterge element” 5740:64454 |

**Figma gaps / wrongs (for the figma-designer, after code):** no Eveniment intermediar component; no
connection component (default / hover / selected / label / colours / thickness); no zoom control (US-50 wants it
in the working-area header), no minimap, no issues, no view-only, no lane / sub-process / event / connection /
Start-Sfârșit / Setări generale panels, no JSON view, no publish / version UI; English tags „task”, „gateway”,
„Cancel”, placeholder „Show under the input”; Form-Builder meta in the process header; Start label duplicated
(inside + tag); Decision „max. 2” contradicts TC 89977 / JSON; the Activity „Șterge element” full-width button
vs the product's ⋮ rule.

---

## C. Prototype gaps and data model

### C.1 What exists (14 oct 2026)

| Area | What exists | Status |
|---|---|---|
| Designer | nothing; the request-type drawer links „Vezi schema fluxului în Fluxuri de lucru →” to `e-permits-acte-permisive.html?flow=back-office#flux/<id>` (`e-permits-shell.js` ~l. 13914) — **dead route** | **missing** |
| Flow registry | `data/e-permits-services.json › flows[]`: 1 with `definitionUrl` (Flux Simplificat Fara Supervizor v1.0.0), 5 with counts only (`steps`, `paymentMoments`) | partial (no status, no author, no definition for 5) |
| Definition reader | `servicePassport.stepsFromDefinition` (Human + Hybrid, BFS, `formName`, `next` → „Continuă”), `definitionForms`, `momentsFromDefinition` (`properties.momentId` 1-based → 6 payment moments), `notificationSteps` (`componentType: "notify"` × `templateCodes`), `documentSteps` (regex on titles) | exists — the designer must keep these fields stable |
| Case engine | `core/case-flow.js`: two **hand-written** flows (complex, simplified) keyed by node id, `stateId` per case, lanes → roles; simplified reuses complex ids and patches them (node8, RecordState4 differ from the JSON) | exists — not driven by the JSON (gap; the overlay must map ids defensively) |
| Builder shell to reuse | `#form-builder-modal` topbar / mode switch / issues menu / panel tabs / undo-redo / keyboard / live region / toasts / `GEAPEmptyState` / resize handles; `.e-permits-doc-rule` condition builder (US-225) | exists |
| Demo states | none `pd-*` | missing |

### C.2 Data model = the exported JSON (backward compatible, US-52 AC-09)

Read and write exactly this shape; unknown keys are **kept on round-trip** (load → save without edits must
produce a deep-equal JSON, TC 91070). Designer-only additions go into optional keys listed as **new**.

```jsonc
{
  "name": "ProcesFluxSimplificatFaraSupervizor",   // Identificator (read-only after creation; latin, digits, no spaces)
  "title": "Flux Simplificat Fara Supervizor",      // Denumirea procesului*
  "description": "",                                // new · Descriere scurtă
  "version": "1.0.0",                               // semver; Salvează → patch + 1; Publică keeps it
  "status": "Publicat",                             // new · "Schiță" | "Publicat" (registry; the file may lack it)
  "initialState": "start",                          // id of the Start node
  "tableName": "GEAP_Cases",                        // Denumire tabelă (dropdown)
  "recordKey": "Id",
  "variables": { "IsAutoDistribution": "checkbox", "WithPayment": "checkbox", "SuspensionWithCoordination": "checkbox",
                 "WithExpertise": "checkbox", "SecondaryApproval": "checkbox", "IsPaperPermit": "checkbox" }, // Variabile de context
  "pool": { "title": "Flux Simplificat" },          // new · the single pool (AC-09); absent = no pool drawn until lanes exist
  "lanes": [ { "id": "lane1", "title": "Solicitant", "role": "<role guid>", "height": 160, "description": "…" } ], // order = top → bottom
  "states": [ /* nodes, see below */ ],
  "designer": { "schema": 1, "viewport": { "x": 0, "y": 0, "zoom": 1 } } // new · optional, never required to load
}
```

**Node (`states[]`)** — common: `id`, `title`, `kind` (`Server` | `Human` | `Hybrid` | `Terminal`), `roles[]`
(role guids, own roles override the lane), `description?`, `smStatus?`, `fieldAssignments?[{ name, value }]`,
`componentType?`, `transitions[]`, `properties: { x, y, laneId, elementType?, showName?, … }`. `x, y` = top-left
in pool coordinates (y is absolute across lanes: lane heights 160 + 200 + 180 + 180 + 540 + 200 + 150 = 1610).

| GEAP element | How it is recognised in the JSON | Type-specific keys |
|---|---|---|
| Start | `id === initialState` (no `elementType`), `kind: "Server"` | ≥ 1 transition (`start` has 2: FO and BO initiation) |
| Sfârșit | `kind: "Terminal"` | `fieldAssignments` (StatusId 9), no transitions |
| Activitate | `elementType: "stare"`, `kind: "Human"` | `roles`, `transitions[].formName` (the action's process form), `properties.terms[]` (`{ term: "Examinare" \| "RaspunsSolicitant", action: start \| pause \| resume \| stop, onExpire?: <event> }`), `fieldAssignments` |
| Decizie | `elementType: "decizie"`, `kind: "Hybrid"` | `transitions[].guard = { groups: [{ conditions: [{ sourceField, operator: isTrue \| eq \| …, valueKind: "static", value? }] }] }`; a transition without guard = default branch |
| Eveniment intermediar | `elementType: "eveniment"`, `kind: "Server"` | `componentType` = Procesor server (`notify`, `audit-log`, `mconnect-event-publish`, `mdocs-publish`, `payment-accrual`, `payment-note`, none); `properties.templateCodes[]` (notify), `auditCode` (audit-log), `objectType` Case / Permit (mconnect), `momentId` (payments), `showName` |
| Sub-proces | `elementType: "subproces"`, `kind: "Server"` | `properties.processRef` (target process `name`) |

**Connection (`transitions[]` on the source)**: `event` (label; `"next"` = unlabeled, shown „Continuă”),
`target`, `sourcePort?` / `targetPort?` (`top`, `bottom`, `left`, `right`, `top-left`, `top-right`,
`bottom-left`, `bottom-right`, `corner-tl`, `corner-tr`, `corner-bl`, `corner-br` — keep the vocabulary),
`labelDx?/labelDy?` (label offset), `waypoints?[{x,y}]`, `guard?`, `formName?`; **new** optional `color`
(`implicit` | `brand` | `positive` | `danger` | `warning` | `neutral`, US-51 AC-06) and `width` (1 | 2 | 3).

**Seed facts (Flux Simplificat):** 50 states — 27 eveniment, 10 stare, 6 decizie, 5 subproces, Start, Sfârșit;
64 transitions (38 `next`); 7 lanes; 9 `formName`s; 5 guards (`isTrue` ×4, `eq` ×1 on `CaseDecisionId`); terms on
5 steps; StatusId assignments on 12 states (0 Inițiat, 2 În lucru, 3 Suspendat, 4 Plată suplimentară, 9
Finalizat, **10** — unmapped in `case-flow.js` STATUS); node sizes are **not stored** (use C.3).

**Sandbox persistence:** `geap.processDesignerDb.v1` in localStorage = `{ processes: [{ id, name, title, status,
version, publishedVersion, modifiedOn, modifiedBy, usedBy: [serviceCode], definition, history: [{ version,
status, at, by, note }] }] }`, seeded from `servicesStore.flows` (+ the JSON files). Corrupt DB → reseed, never a
crash (FB pattern). Publishing writes the definition back to the matching `servicesStore.flows[]` entry and
re-runs `stepsFromDefinition` / `momentsFromDefinition`, so the request-type drawer (US-222 AC-11/14/16/19)
updates live — the end-to-end proof.

### C.3 Geometry (from Figma, at zoom 100%)

| Element | Box | Ports (JSON names) |
|---|---|---|
| Start / Sfârșit | circle 64; label tag under (gap 6) | `top`, `right`, `bottom`, `left` |
| Activitate | 140 × 56 (label wraps to 2 lines, ellipsis + tooltip beyond) | `top-left`, `top`, `top-right`, `right`, `bottom-right`, `bottom`, `bottom-left`, `left` |
| Sub-proces | 160 × 56 | same 8 |
| Decizie | diamond in a 44 box (62 diagonal); question tag under | `corner-tl`/`top` = top vertex, `corner-tr`/`right`, `corner-br`/`bottom`, `corner-bl`/`left` |
| Eveniment intermediar | circle 40 (double ring) | `top`, `right`, `bottom`, `left` |
| Lane | rail 40 + body; min height 120, step 20 | — |

All positions snap to 20 (AC-02). Port dots 12 (16 on hover).

### C.4 New code (files)

`js/process-designer.js` (IIFE, `window.GEAPProcessDesigner`), `css/process-designer.css` (on top of the builder
CSS), markup `#process-designer-modal` in `e-permits-acte-permisive.html` cloned from `#form-builder-modal`
(class `e-permits-builder e-permits-builder--process`), route `?flow=proces` (+ `&proces=<id>`,
`&vizualizare=1`, `&dosar=<id>`) and hash `#flux/<id>` (makes the existing link work), demo states `pd-*` in
`js/demo-states.js`, a pure helper module `core/process-model.js` (load / normalise / serialise / validate /
route edges — unit-tested in `test/process-model.test.mjs` like `service-passport.test.mjs`).

### C.5 Icons

Available: `plus-small`, `minus-small`, `resize` (fit), `undo`, `redo`, `eye-open`, `lock`, `history`,
`settings`, `brackets` (JSON), `notification`, `share-android` (MConnect), `document` / `page-text` (MDocs),
`receipt-bill` (taxe), `history` (jurnal), `external-link` (deschide sub-proces), `copy`, `delete`, `dot-grid`,
`drag`, `sidebar` / `sidebar-filled` (panels), `more-vertical`, `arrow-right`, `checkmark-small`,
`circle-error-filled`, `warning-filled`, `pause`, `time`, `person`, `group`, `map-pin`. **Missing (⚠ add to the
sprite, 24 grid, stroke like the set):** `zoom-in`/`zoom-out` (use plus/minus), `hand` (pan tool), `cursor`
(select tool), `minimap`, `play` (simulation, P3), `node-activity`, `node-decision`, `node-event`,
`node-subprocess`, `node-lanes` (palette glyphs — Figma draws them as simple outlines).

---

## D. Element catalogue

Panel layout for every element = the Form Builder field panel: head (title = Denumire, type tag
`e-permits-builder__tag` + kind tag, ⋮ `renderStackMenu` with Duplică / Șterge — Șterge last, destructive),
library small tabs, groups = `.e-permits-user-create__section` + `__section-title` + `__section-content`,
controls = full-flow fields (`.e-permits-fo-field` + input / textarea / `renderFoSelectControl`), read-only facts =
`dl.__facts`, toggles = `renderToggle`, modes = `.segmented-control`. Every change applies live to the canvas
(US-52 AC-04) and is undoable. **Id** = `.e-permits-fo-copy-value` (read-only; editable only for events, US-188,
with uniqueness check). Denumire* → RO only in the data (labels are data, US-51 AC-11).

### D.1 Start / Sfârșit

| | Start | Sfârșit |
|---|---|---|
| Label | „Start” | „Sfârșit” |
| Shape | B.2 Start | B.2 Sfârșit |
| States | default · hover (4 dots + „+” on the right dot) · selected (FB selected ring) · focus-visible (focus ring) · error (red dot top-right) · view-only (no dots) | same; no „+” (no outgoing) |
| Panel | one tab **General**: Id · Denumire* · Descriere (US-52 AC-12) · Starea dosarului la sfârșit (Sfârșit only: `fieldAssignments` StatusId, select of STATUS) | |
| Rules | exactly one each (US-50); **never deletable** — ⋮ Șterge disabled with reason „Startul procesului nu se poate șterge.” / „Sfârșitul procesului nu se poate șterge.”, Delete key → toast info same text; not in palette (US-51 AC-03); Start: 0 incoming, ≥ 1 outgoing; Sfârșit: ≥ 1 incoming, 0 outgoing | |

### D.2 Activitate (pas uman · `stare`)

Shape: B.2 Activitate; inside: label 12/16 medium (2 lines); bottom-left chips (P2, only ≥ 75% zoom): role
initials of the lane / own roles (`.avatar` xs) and a `time` icon when the step has terms; red dot = errors.

| Tab | Content |
|---|---|
| **General** | Id (copy) · Denumire* · Descriere · Bandă (select of lanes; changing it moves the node into that lane's band, AC-01) · **Componentă vizuală** (select — the BO screen the step opens; options from a fixed list until the PO defines them: „Profil dosar — implicit”, „Distribuire dosar”, „Verificare date”, „Proiect act”, „Semnare MSign”, „Achitare MPay”) · Starea dosarului (`fieldAssignments` StatusId; select „0 Inițiat · 2 În lucru · 3 Suspendat · 4 Plată suplimentară · 9 Finalizat · 10 …”) |
| **Acțiuni** | the outgoing connections = the step's actions (what US-222 lists): ordered stacked list `__step-list`; row = label (event, required when > 1 action, „Continuă” when single) · țintă (select of nodes, „Alege elementul”) · **Formular** (select of `processForms`, „Fără formular”) · ⋮ (Mută sus / jos, Șterge); „+ Adaugă acțiune” = connect mode from this node (F.4). Shows „Folosită la N tipuri de solicitare” when a passport overrides its form (read from services) |
| **Roluri** | „Rol din bandă: Specialist” (read-only fact) · „Roluri proprii” multi-select (roles catalogue) — own roles override the lane; error when neither exists (US-50 publish message) |
| **Termene** | rows `{ Termen (select: Examinare, Răspuns solicitant, …), Acțiune (segmented Pornește · Pauză · Reia · Oprește), La expirare (select of this step's actions, only for Pornește) }` + „Adaugă termen” (P2, no AC — flagged) |
| **Avansat** | Atribuiri de câmpuri (pairs: Nume select ServiceId · PermitType · AuthorityId · TeamId · StatusId; Valoare = input or select by Nume; add / delete — `__option-row` pattern) · `kind` fact (Human) · JSON of the node (read-only, copy) |

Validation: Denumire empty (error, blocks save); no incoming or no outgoing (error E1); no role (own or lane)
(publish error E5); > 1 action without label (error); action target missing (error); formName not in
`processForms` (warning).

### D.3 Decizie (`decizie` · Hybrid)

Shape: diamond B.2 + question tag under (the Denumire; shown always). Branch labels on the connections.

| Tab | Content |
|---|---|
| **General** | Id · **Întrebare / Condiție*** (Denumire, textarea 2 lines — Figma) · Descriere · Bandă |
| **Ieșiri** | one card per outgoing connection (`.e-permits-doc-rule` card, the US-225 builder): header „Ieșire 1 · <label>” · Etichetă* (input; preset buttons „Da / Nu” when exactly 2) · Duce la* (select of nodes) · **Condiție**: rows Câmp (select of `variables` + case fields, e.g. CaseDecisionId) · Operator (by type: checkbox → „este bifat / nu este bifat” = `isTrue`/`isFalse`; value → = ≠ < ≤ > ≥ „în listă”) · Valoare; „+ Condiție” (AND inside a group), „+ Grup” (OR between groups) — maps 1:1 to `guard.groups[].conditions[]`; checkbox „**Ramura implicită** (când nicio condiție nu e îndeplinită)” = no guard; „+ Adaugă ieșire” |
| **Avansat** | JSON of the node |

Validation: < 2 exits (error); exit without target (error, US-52 message); exit without label (error); more than
one default branch, or no default and not all guarded (warning „Nu există ramură implicită — dosarul se poate
bloca.”); condition incomplete (error); variable not in Variabile de context (error). The info button next to
„Ieșiri” explains: „Decizia se evaluează automat de sistem; prima ieșire a cărei condiție e adevărată este
urmată.” (PO to confirm order semantics).

### D.4 Eveniment intermediar (`eveniment` · Server)

Shape **⚠ no library component / no Figma** → new: circle 40, white, border 1.5 `--color-border-base-secondary`
with an inner ring 34 (BPMN intermediate), processor icon 20 in `--color-icon-base-default`; name under it only
when `showName` (else tooltip on hover/focus); **badge** top-right (library `.badge` small, neutral) = number of
templates (notify, US-188 AC-05, live). Variants: default · hover (border `--color-border-base-default` +
`--shadow-200`, port dots) · selected (FB ring) · focus · error (red dot) ·
view-only. Adding: from the palette, from „Continuă cu”, or **dropped on a connection** (splits it: A → E → B,
US-188 AC-02) — the connection under the pointer highlights brand while dragging an event.

| Tab | Content |
|---|---|
| **General** | Id (auto `eveniment_N`, **editable**, unique) · Denumire* · „Afișează denumirea pe diagramă” (`renderToggle`, default off) · Descriere · Bandă* |
| **Procesor** | **Procesor server*** select: „Fără — trecere directă” (default) · „Notificare: expediere (BackOffice)” (`notify`) · „Jurnal de audit” (`audit-log`) · „Publicare eveniment MConnect” (`mconnect-event-publish`) · „Publicare în MDocs” (`mdocs-publish`) · „Calcul taxe” (`payment-accrual`) · „Notă de plată” (`payment-note`) · „Generează certificat constatator” (TC 90019). Per processor: Notificare → **Șablon de notificare*** = the long multi-select pattern (summary + picker modal, components.md „Long multi-select”), only active templates, „Cod · Denumire”, chips with ×; Jurnal → Cod audit* (select `GEAP.CASE.*`); MConnect → Tip obiect (segmented Dosar · Act permisiv); taxe → Moment plată* (select of the 6 PAYMENT_MOMENTS) |
| **Avansat** | Atribuiri de câmpuri · JSON |

Validation: Notificare without template (error, blocks save — US-188 AC-06); inactive template (warning); Jurnal
without code (error); payment processor without moment (error); not exactly 1 incoming (warning) / no outgoing
(error). Outgoing: `next` + optional `failed` (JSON RecordState9) — the „Acțiuni” list shows „Succes” / „Eșec”.

### D.5 Sub-proces (`subproces` · Server, call activity)

Shape B.2 Sub-proces (left brand accent 4, `external-link` icon button top-right „Deschide sub-procesul”).

| Tab | Content |
|---|---|
| **General** | Id · Denumire* · Descriere · Bandă · **Proces apelat*** (select of processes: name · versiune · status tag; drafts listed but tagged „Schiță”) · `btn btn-secondary btn-sm` „Deschide sub-procesul” (drill-in, F.11) · `btn btn-text-primary btn-sm` „Creează sub-proces nou” (opens «Proces nou» prefilled, returns with the reference set) |
| **Avansat** | Atribuiri de câmpuri · JSON |

Validation: no reference / reference to a missing process (error, US-52 message); referencing itself or a cycle
A → B → A (error „Un sub-proces nu se poate apela pe sine.”); reference to a draft (warning on save, error on
publish: „Sub-procesul «X» nu este publicat.”).

### D.6 Bandă (lane) and Pool

Pool: one per process (AC-09). Palette „Pool + Bandă”: on an empty process creates the pool with one lane „Bandă
1” around the existing nodes; dropped on an existing pool adds a lane at the drop position; disabled with reason
at 15 lanes („Ai atins limita de 15 benzi.”, AC-10) — the „+ Adaugă bandă” button disappears (AC-10).

| Selection | Panel |
|---|---|
| Pool (click on its header) | General: Denumire pool · Benzi (ordered list with ↑ ↓ — keyboard twin of the rail drag) · statistic „N elemente” |
| Bandă (click on the rail title, Constraint of US-51) | General: Denumire* (free text) · Descriere · **Rol** (select of BO roles + „Sistem (fără rol uman)”, e.g. GEAP Modul Distribuire) · Înălțime (number, step 20, min 120) · ⋮ Mută sus / jos · **Șterge banda** (red confirm „Banda «X» conține N elemente. Mută-le în altă bandă înainte de ștergere.” → disabled with reason while N > 0; empty lane = toast + Anulează) |

Canvas look (Figma `.step`): pool card radius 12 border `--color-border-base-default`, header 48 („⠿”, title 16
medium, `copy` and `delete` icon buttons); lane rail 40 (grip button, vertical title 16 medium bottom-to-top,
role tag Small neutral); lane body transparent over the grid; divider 1 `--color-border-base-default`; resize pill
36×10 on the bottom edge (`.segmented-controls-button` look) — drag = resize, snaps 20, min 120; nodes below move
with it. „+ Adaugă bandă” = `btn btn-strict btn-sm` dashed (FB `__dropzone` look) full width under the last lane.

### D.7 Conexiune (sequence flow)

| | |
|---|---|
| Look | SVG path, orthogonal with radius 8 corners (Figma), open chevron arrow 8; default stroke 1.5 `--color-icon-base-default`; label pill 12/16 medium on `--color-background-base-default`, radius 4, padding 2/6, at the middle of the longest segment (+ `labelDx/labelDy`) |
| States | hover: stroke `--color-icon-brand-default`, hit area 12 transparent · selected: brand 2, endpoint handles (12 dots) + segment handles (drag = waypoint) · focus-visible: focus ring around the label pill / path bounds · error: dashed `--color-icon-danger-default` (target missing) · view-only: no handles · connecting (drag): dashed brand `4 4` following the cursor, valid target halo `--color-background-brand-secondary-hover`, invalid target: cursor `not-allowed`, line `--color-icon-danger-default` |
| Panel (General) | Etichetă (free text; „Continuă” placeholder for `next`) · De la / La (facts, links select the node) · Formular (when the source is an Activitate) · Culoare (segmented 6 swatches, aria-labels) · Grosime (segmented 1 · 2 · 3) · Traseu: „Automat” / „Personalizat” (reset waypoints) · ⋮ Șterge |
| Rules | no edge into Start, none out of Sfârșit; no self-loop; no duplicate (same source, target and label); cross-lane allowed, same pool only (US-51); a Decizie edge has a condition (D.3); deleting a node deletes its edges (one undo step) |

**Message flow** (Feature 89397 palette) — no AC, no JSON key, no pool #2 to connect → **not built**; J-question.

---

## E. Shell spec — floating panels

### E.1 Layers and geometry

```
.e-permits-builder--process
 ├ header.e-permits-builder__topbar            (unchanged FB topbar, z above stage)
 ├ main.e-permits-pd__stage  [role="region" aria-label="Diagrama procesului", aria-roledescription="diagramă de proces"]
 │   ├ div.e-permits-pd__world  (transform: translate(px,py) scale(z); transform-origin 0 0)
 │   │   ├ div.e-permits-pd__lanes        (HTML: pool card, lane rails, bodies)
 │   │   ├ svg.e-permits-pd__edges        (one SVG, paths + labels; pointer-events on paths only)
 │   │   ├ div.e-permits-pd__nodes        (HTML nodes: buttons with text)
 │   │   └ svg.e-permits-pd__overlay      (connect line, marquee, snap guides)
 │   ├ aside.e-permits-pd__float--left    (palette card)
 │   ├ aside.e-permits-pd__float--right   (properties card)
 │   ├ div.e-permits-pd__toolbar          (bottom centre)
 │   └ div.e-permits-pd__minimap          (bottom right)
 └ footer.modal-footer                    (Anulează · Salvează)
```

| Token / value | Use |
|---|---|
| inset `--spacing-16` | floating cards from the stage edges; toolbar from the bottom |
| gap `--spacing-8` | between floating cards (palette ↔ toolbar, toolbar ↔ minimap) |
| radius `--border-radius-16` | palette and properties cards (design-system: panels) |
| radius `--border-radius-12` | toolbar, minimap, pool card, „Continuă cu” menu |
| shadow `--shadow-400` | floating panels (design-system level 400 = floating panels); menus `--shadow-200` |
| background `--color-background-base-default` | cards; stage `--color-background-base-secondary` |
| grid dots | radial-gradient `--color-border-base-default` 1px every `20px × zoom` on the stage (background, not DOM) |
| widths | palette = the FB library width variable, default 240 (`calc(var(--spacing-80) * 3)`), properties = `--builder-right-width` (FB, default 382, resizable with the FB `__resize-handle`) |
| height | cards `max-height: calc(100% - 2 × --spacing-16)`; properties body scrolls; palette hugs content |

The canvas runs **under** the cards (full bleed). „Potrivește în ecran” fits into the **visible** area (stage
minus the open cards + insets), so nothing hides behind a panel. Panel open / close = 160ms opacity + 8px slide
(standard easing, off for `prefers-reduced-motion`); the animation **releases its transform** at the end
(components.md „Opening animations release their transform”) and no `will-change` at rest.

### E.2 Left palette card „Elemente”

- Head: title „Elemente” 16 medium · icon button `sidebar` „Restrânge biblioteca” (tooltip + `aria-expanded`).
- Items = `.e-permits-builder__library-item` (the FB palette item, Figma `drag-and-drop/field-library/fields`):
  Activitate · Decizie · Eveniment intermediar · Sub-proces; separator; Pool + Bandă. Each: glyph 20 + label;
  `title` = one-line description („Pas făcut de o persoană”, „Ramificare automată după o condiție”, „Acțiune a
  sistemului: notificare, jurnal, publicare”, „Apelează alt proces”, „Rolurile care fac pașii”).
- **Click** = add after the selected node (connected) or, with nothing selected, at the centre of the visible area
  (snapped, free spot) — the single-pointer twin of drag (WCAG 2.5.7). **Drag** = ghost of the real shape at the
  current zoom, snap preview, drop. Hover = FB library hover; disabled item (Pool at 15 lanes) = `aria-disabled` +
  reason tooltip.
- **Collapsed rail**: 56 wide card with the five glyph buttons (tooltips = labels) + expand button; state kept per
  viewer in `localStorage` (`pd.palette`), wrapped in try/catch.
- No search (5 items); P3: „Componente salvate” (saved sub-flows).

### E.3 Right properties card „Proprietăți”

- Opens on selection; **nothing selected** → compact card: title „Proprietăți”, `GEAPEmptyState.render({ compact,
  bare })` „Selectează un element ca să-i vezi proprietățile.” + three facts (Elemente · Conexiuni · Benzi) and the
  issues count link. Setări generale → the process panel (E.6).
- Head: icon button `sidebar` „Ascunde proprietățile” (the card hides; next selection does not reopen it until the
  user shows it — a „Proprietăți” pill appears at the top-right, Figma UI3 „minimize” idea) · ⋮ element menu.
- Multi-selection: „N elemente selectate” + Aliniază (stânga / centru / dreapta / sus / mijloc / jos), Distribuie
  orizontal / vertical, Mută în banda…, Duplică, Șterge (P2).

### E.4 Panels shortcut and „Doar vizualizare”

| Control | Behaviour |
|---|---|
| `Ctrl/Cmd + \` (and toolbar ☰ toggle) | hide / show **both** cards (Figma convention); toolbar and minimap stay |
| `[` / `]` | toggle palette / properties |
| **„Doar vizualizare”** — topbar `renderToggle` (label visible ≥ 1280, icon `eye-open` only below) + URL `?vizualizare=1` | hides palette, footer, `__errors`, Publică, Setări generale edit; properties card = **read-only** (inputs `.is-readonly`, no ⋮); canvas: no ports, no drag, no connect, no delete, no keyboard edits; cursor = grab; click = select + highlight path (incoming / outgoing edges brand, others 40% opacity); toolbar keeps zoom / fit / minimap / list view; an `.inline-message` info strip is **not** shown (the toggle state is the indicator). Entering from „Vezi schema fluxului” (#flux/<id>) or from a published version in history = forced view-only (toggle disabled with reason „Versiune publicată — creează o schiță ca s-o modifici.” + button „Editează ca schiță”) |
| Esc | closes menu → cancels connect / drag → deselects → (view-only) nothing; never closes the designer (FB rule) |

### E.5 Bottom floating toolbar + minimap

Toolbar card (radius 12, `--shadow-400`, padding 4, gap 4, height 40), centred in the visible area:

`↶ Anulează` · `↷ Refă` | segmented **Selectare (V) · Panoramare (H)** | `−` · **„100%” ▾** · `+` | `⤢ Potrivește în
ecran (1)` | `▦ Hartă (M)` | `☰ Vizualizare listă (L)`.

- Buttons = icon buttons resting on white (`.e-permits-fo-icon-button` hover tertiary) with tooltips (components.md
  „Tooltip — plain label for icon-only controls”) and `aria-pressed` for toggles (open/pressed keeps
  `tertiary-active` + focus ring, memory „Open button focus”).
- „100%” = stack-menu trigger: 50% · 75% · 100% · 150% · 200% · „Potrivește în ecran” · „Mărește selecția (2)”.
- Zoom limits 50–200% (US-50 AC-07): − disabled at 50, + at 200 (reason tooltip). Steps 10% buttons; Ctrl/Cmd +
  wheel / pinch zoom around the cursor; `Ctrl/Cmd +` / `Ctrl/Cmd −` / `Ctrl/Cmd 0` (100%) / `1` fit / `2` fit selection.
- Undo / Redo disabled when empty. In view-only: Undo / Redo and the tools segment hidden.
- **Minimap** card 200 × 136 bottom-right (inset 16), radius 12: a `<canvas>` drawing lanes (bands), nodes
  (rects coloured by type with the node tokens) and the viewport rectangle (border brand 1.5, fill
  `--color-background-brand-secondary` 40%); click = centre there; drag the rectangle = pan; keyboard: focusable,
  arrows pan 10%. Default **on ≥ 1440 wide, off below**; state per viewer in `localStorage`. Redrawn on rAF after
  model / viewport change (throttled), never on every pointermove.
- **Vizualizare listă** (accessible alternative + overview): replaces the canvas by a stacked list grouped by lane
  (`e-permits-stack`): row = type glyph + Denumire + type tag + „→ <țintă> (<etichetă>)” lines + issue tag; click =
  back to canvas centred on it and selected. Screen readers get the same list via the „Listă” toggle (and it is the
  view on < 720px).

### E.6 Top bar (reuse of the Form Builder topbar)

| Slot | Content (classes) |
|---|---|
| left `__nav-left` | `__view-title` = process title (ellipsis + tooltip) · status tag (`renderTag("Schiță"/"Publicat", tone)`, Small) · `__version` „v1.0.3 ▾” → **Versiuni** menu: rows „v1.0.3 · Schiță · azi 14:02 · Vasile Schidu”, „v1.0.2 · Publicat (activă) · …”; row click = open that version view-only; actions „Restaurează ca schiță”, „Compară cu publicată” (P3). Drill-in: library `.breadcrumb` „Flux Simplificat › Sub-proces Suplinire informații” replaces the title |
| centre `__mode` | **Editare** (icon sparkle as FB) · **Schemă JSON** (`brackets`) · divider · **Setări generale** (`settings`; pressed when the process panel is shown — it is a panel, not a mode, US-50 AC-09 / US-52 AC-03) |
| right `__nav-actions` | `__errors` (FB issues button + `__issues-menu`) · „Doar vizualizare” toggle · `__publish` „Publică” (aria-disabled + reason while errors) · `__close` × (asks when unsaved: red-less confirm „Ai modificări nesalvate. Închizi fără să le salvezi?” — Salvează și închide / Închide fără salvare / Rămâi) |

**Setări generale panel** (right card, title „Setări generale”): Identificare (Identificator copy, read-only ·
Denumirea procesului* · Descriere scurtă) · **Parametrii înregistrării gestionate de proces** (Denumire tabelă
select: GEAP_Cases … · Cheia înregistrării fact „Id” · **Variabile de context** = long multi-select, each with type
„Da/Nu”, and „Folosită în N condiții”) · Versiune (facts: Statut, Versiune, Versiunea publicată activă, Editat
la / de) · Utilizare („Folosit de N servicii” + list of service · tip solicitare links) · Statistici.

**Footer** `.modal-footer` (Figma 5307:57645): „Anulează” (secondary; disabled when clean; confirm when dirty) ·
„Salvează” (primary; disabled when clean). Salvează → validate → errors? stay + issues menu opens + toast error
„Nu se poate salva: …” (first message) · OK → version patch +1, status Schiță (if it was Publicat, the published
version stays active for services), toast success „Schița v1.0.4 a fost salvată.” Local autosave of the
working copy every change (recovery only, „Am restaurat modificările nesalvate.” on reopen).

### E.7 Responsive

≥ 1280: as drawn. 960–1279: palette starts collapsed (rail), minimap off. < 960: **view-only by default**
(editing blocked with a callout „Editarea fluxului e disponibilă pe ecrane de cel puțin 960 px.”), properties as a
bottom sheet (library `bottom-sheet`), list view available. < 720: list view replaces the canvas.

---

## F. Interactions

1. **Add from the palette** — drag (pointer events, not HTML5 DnD — avoids the Mac native-drag hover freeze, FB
   „Drag sessions”) with ghost + snap guides; drop inside a lane sets `laneId`; drop on a connection with an
   Eveniment / Activitate splits it (highlight first); drop outside the pool when lanes exist → not-allowed
   (no node); click-to-add (E.2). New node: `nodeN` id, default title („Activitate nouă”, „Decizie nouă”…),
   selected, panel General focused on Denumire (select all).
2. **„Continuă cu” quick-add** (Figma 5669:52463) — hovering a node shows the ports; the **right** (or bottom)
   port shows „+” (16 dot with plus); click „+”, or `Ctrl/Cmd + Enter` on a focused node, opens the menu next to
   it: caption „Continuă cu” + items Activitate · Decizie · Eveniment intermediar · Sub-proces · „→ Conectează la
   un element existent” (brand). Menu = `e-permits-fo-intent-menu e-permits-stack__menu` (FB `__add-menu`), roving
   focus, Esc returns focus to the node. Choosing a type creates it **to the right** (x + width + 80, snapped; if
   occupied, below in 20 steps), in the same lane, connected (`next`; from a Decizie: label „Ieșire N”), selected.
   Dropping a connect drag on empty canvas opens the same menu at the drop point (n8n pattern) — Esc = nothing
   created (US-51 AC-05 still holds).
3. **Connect** — press on a port dot and drag: dashed brand line from the port to the cursor (overlay SVG,
   rAF); valid targets show their ports + halo; snap to the nearest port within 24px; release on a node/port =
   connection (targetPort = nearest); release on invalid / nothing = line retracts (150ms) + polite live
   message „Conexiunea nu a fost creată.” (US-51 AC-05). Keyboard: focused node → `C` = connect mode → arrows /
   Tab cycle candidate targets (outline + announcement „Țintă: Verifică date, banda Specialist”) → Enter creates,
   Esc cancels. Re-connect: drag an endpoint handle of a selected connection.
4. **Move** — drag a node (snap 20, live edge rerouting, alignment guides to neighbours' centres/edges within
   6px — brand 1px dashed); crossing a lane boundary changes `laneId` (the rail highlights the target lane);
   keyboard Alt + arrows = 20, Alt + Shift + arrows = 100 (FB: Alt moves). Moving never changes zoom. Edges
   attached update on the same frame; only those edges are recomputed.
5. **Select** — click; Shift/Cmd-click toggles; drag on empty canvas in Selectare = marquee (Panoramare tool or
   Space-drag = pan); `Ctrl/Cmd + A` all; Esc clears. Selected = FB card selected ring; connection selected = D.7.
6. **Delete + undo** — Delete / Backspace or ⋮ Șterge: nodes + their connections removed at once, **no modal**,
   toast „Elementul «X» a fost șters.” + „Anulează” (8 s, FB); several = „N elemente au fost șterse.”; Start /
   Sfârșit refused (toast info). Lane with nodes = blocked (D.6). Undo / Redo `Ctrl/Cmd + Z` / `Shift + Z` /
   `Ctrl + Y` (outside text inputs), stack of 100 model snapshots (structural sharing or JSON; 24 KB × 100 is
   fine), text edits coalesced per field focus.
7. **Duplicate / copy-paste** (P2) — `Ctrl/Cmd + D` duplicates with +40/+40 offset, new ids, connections between
   copied nodes kept, outside ones dropped; Ctrl/Cmd + C / V between processes via an in-memory clipboard.
8. **Pan / zoom** — Space + drag, middle-button drag, Panoramare tool, two-finger trackpad scroll = pan; Ctrl/Cmd
   + wheel / pinch = zoom at cursor (50–200%); fit on open; `Shift + 1` fit, `Shift + 2` selection (Figma), plus
   `1` / `2` (n8n) when focus is on the canvas. Pan is clamped to content bounds + one viewport.
9. **Snap & grid** — fixed 20px (US-50 AC-05, TC 93480, no user setting); grid dots hidden below 50% (never,
   min is 50) and fade at 50–75%.
10. **Routing** — orthogonal (Manhattan) routes between ports, rounded corners radius 8: choose ports by relative
    position when not stored (source right / target left for forward, bottom/top for vertical), then route
    with 2–4 segments avoiding node boxes (simple grid A* on a 20px lattice limited to the bounding box + margin,
    cached per edge; fallback L-shape). Stored `waypoints` win (manual). „Traseu automat” resets them.
11. **Auto-layout** (P2, ⋮ „Aranjează automat”) — layered left-to-right inside each lane (longest-path layering
    from Start, barycentric ordering, 80 between layers, 40 between nodes, lanes grow to fit); one undo step;
    confirm only when the process has manual waypoints. No library (elkjs is the reference, ~1 MB — too heavy for
    the prototype).
12. **Sub-process drill-in** — the node's `external-link` button, double-click, or ⋮ „Deschide sub-procesul” opens
    the referenced process **in the same designer** with the breadcrumb (Figma 5740:26639); unsaved changes of the
    parent are kept in memory; ‹ breadcrumb returns and reselects the node.
13. **Validation / issues** — `validate()` → issues `{ level, code, id, tab, prop, message }` recomputed on idle
    (requestIdleCallback / 150ms debounce) after each change; FB topbar `__errors` („N erori” red / „Fără erori”
    green) + `__issues-menu` groups „N erori blochează salvarea / publicarea” · „Avertismente”; a row selects
    and **centres** the element, opens the tab, focuses the property. Node red dot + connection dashed red.
    Codes (messages RO/RU/EN; Azure wording where it exists):

    | Code | Level | Message | Blocks |
    |---|---|---|---|
    | E1 | error | „Atenție: Există noduri neconectate.” (+ per node „«X» nu are conexiuni de intrare / ieșire.”) | save, publish |
    | E2 | error | „O ieșire a Deciziei nu are element-țintă asociat.” | save, publish |
    | E3 | error | „Atenție: Sub-procesul referă un proces inexistent.” | save, publish |
    | E4 | error | „Câmpul este obligatoriu.” (Denumire, Întrebare, Șablon de notificare, Cod audit, Moment plată) | save, publish |
    | E5 | error | „Elemente umane fără rol (propriu sau din culoar): <denumire>.” | publish |
    | E6 | error | „«X» nu poate fi atins din Start.” (unreachable) | publish |
    | E7 | error | „Din «X» nu se poate ajunge la Sfârșit.” (dead end / closed loop) | publish |
    | E8 | error | „Decizia «X» are nevoie de cel puțin două ieșiri.” / condition incomplete / label missing | save, publish |
    | E9 | error | „Sub-procesul «X» nu este publicat.” / „apelează procesul curent” | publish / save |
    | E10 | error | duplicate id, edge into Start / out of Sfârșit, > 15 lanes | save |
    | W1 | warning | „Nu există ramură implicită — dosarul se poate bloca.” | — |
    | W2 | warning | formular / șablon inexistent sau inactiv; variabilă nefolosită | — |
    | W3 | warning | „Fluxul nu mai conține ramura de avizare — tipurile de solicitare cu avize vor fi afectate.” (US-222 AC-46) / „Pasul de notificare «X» a fost șters — N tipuri de solicitare îl folosesc.” (Epic 90144 risk) | — |

14. **Save / publish / versions** — E.6. **Publică** (only from a saved state; if dirty: „Salvează și publică”) →
    library `.modal` „Publică procesul v1.0.3”: summary (elemente, benzi, „Folosit de N servicii” — „Tipurile de
    solicitare care îl folosesc vor trece pe această versiune.”), optional „Ce s-a schimbat” textarea (US-229
    pattern), buttons Anulează · Publică. Errors → modal lists them (base message „Nu se poate publica: schema
    conține erori. Corectați și încercați din nou.” + one row per error, clickable) and Publică disabled. Success
    → status Publicat, version unchanged (TC 93474), audit event, toast „Procesul a fost publicat.”, passport
    flows refreshed (C.2).
15. **Schemă JSON** — FB `__schema` `<pre>` of the serialised definition (exactly what Salvează would store),
    header: Identificator · versiune · „Copiază” (`btn btn-secondary btn-sm`, feedback „Copiat”) · „Exportă JSON”
    (download `<name>_v<version>.json`, TC 93485); P3 „Importă JSON” (validate, show issues, open as new draft).
16. **Trajectory overlay** (P2) — `?dosar=<id>` (from the case profile „Vezi fluxul”) opens view-only with the
    case's `visited` nodes positive (border `--color-border-positive-default` + check badge), `stateId` current
    (brand ring + „Pas curent” tag), the rest 40% — the same vocabulary as „Traiectoria dosarului”.
17. **Keyboard map** (shown in a „Scurtături” modal, `?` key): V / H tools · Space pan · `1` / Shift+1 fit · `2`
    selection · Ctrl/Cmd ± 0 zoom · arrows = move focus to the nearest node in that direction · Tab / Shift+Tab =
    next / previous node in flow order (BFS from Start) · Enter = select / open panel · F2 = rename · Alt+arrows
    move · Ctrl/Cmd+Enter „Continuă cu” · C connect · Delete · Ctrl/Cmd Z / Shift Z / D / A · Ctrl/Cmd+\ panels ·
    M minimap · L list · Esc. Single-letter keys only when focus is on the stage (never inside inputs).
18. **Live region** `[data-pd-live]` (polite) announces adds, moves („Verifică date mutat în banda Director.”),
    connections, deletes, zoom („Zoom 150%.”), validation count changes.

---

## G. Benchmark (with sources)

| # | Pattern | Who | Use in GEAP |
|---|---|---|---|
| 1 | Context pad next to the selected element: append the next shape already connected; palette for create; lasso; hand tool | bpmn.io / Camunda — [bpmn-js 3.0](https://bpmn.io/blog/posts/2018-bpmn-js-3-0-0), [context pad (forum)](https://forum.bpmn.io/t/how-to-show-context-pad-in-bpmn-js/9332), [canvas & palette docs](https://docs.infor.com/ipi/2026.09/en-us/useradminlib_cloud/ipiug/owq1661724948880.html) | „Continuă cu” (F.2), tools V / H, marquee |
| 2 | Keyboard: arrows move the selection (Shift faster), Ctrl/Cmd moves the canvas; Ctrl+C/V, Delete, undo/redo | bpmn-js (same sources as 1) | F.4, F.17 |
| 3 | Manual connection layouting: orthogonal routes, draggable segments that become waypoints | bpmn.io — [manual connection layouting](https://bpmn.io/blog/posts/2015-manual-connection-layouting) | D.7 waypoints, F.10 |
| 4 | Lint rules as a problems panel: `no-disconnected`, `end-event-required`, start required, configurable severity | bpmnlint — [bpmn.io blog](https://bpmn.io/blog/posts/2018-bpmnlint), [npm](https://npmjs.com/package/bpmnlint) | issues E1–E10 / W1–W3, error vs warning |
| 5 | Diagram validation window listing each error with its exact place in the diagram | Bizagi — [validating process errors](https://help.bizagi.com/platform/en/validating_process_errors.htm) | issue row → select + centre (F.13) |
| 6 | Automatic syntax check; QuickModel: build the happy path from a table, then refine graphically | SAP Signavio — [Editor](https://learning.sap.com/courses/managing-business-processes-with-sap-signavio-solutions/the-editor-quick-n-easy-modeling_fd121490-31f9-4229-a10a-8a3a68972fa3), [QuickModel](https://mdpgroup.com/en/blog/process-modeling-with-quickmodel-in-sap-signavio-process-manager/) | live validation; list view as a second editing surface (P3) |
| 7 | Token simulation: play / pause / step a token through the model (toggle `T`) | Camunda — [token simulation](https://docs.camunda.io/docs/components/modeler/web-modeler/token-simulation/) | P3 „Simulează” with the Variabile de context as inputs |
| 8 | Test run with test data, then per-step execution details; steps shown done green ✓ / running blue / failed red ✕ (Retool Workflows test run, from search summary — no primary URL captured) | ServiceNow — [Test a flow](https://docs.servicenow.com/bundle/paris-servicenow-platform/page/administer/flow-designer/task/flow-test.html) · Datadog — [test and debug workflows](https://docs.datadoghq.com/service_management/workflows/test_and_debug/) | trajectory overlay vocabulary (F.16), P3 simulation |
| 9 | Hover a node → „+” to add before / after; Tab opens the node creator connected to the selection; `1` zoom to fit; Shift+S sticky note | n8n — [keyboard shortcuts](https://docs.n8n.io/keyboard-shortcuts/) | „+” on the port, Ctrl/Cmd+Enter, `1` fit, comments (P3) |
| 10 | Minimize UI: `Shift+\` hides panels; properties reappear on selection; toolbar stays | Figma UI3 — [guide](https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/), [forum on floating panels](https://forum.figma.com/t/shortcut-to-bring-back-floating-panels-in-ui3/88458) | Ctrl/Cmd+\ (E.4), the „Proprietăți” pill. Note: Figma **dropped** floating panels in UI3 after feedback — keep ours compact, collapsible, and never covering the fitted content (E.1 fit rule) |
| 11 | Swimlanes per role/actor override node assignment | Appian — [manage processes](https://docs.appian.com/suite/help/25.4/manage-processes.html), [community](https://community.appian.com/discussions/f/best-practices/18358/swim-lane-best-practices) | lane role → step role, own role override (D.2) |
| 12 | Case lifecycle as stages → steps → processes (non-BPMN overview) | Pega — [Case Designer stages](https://docs.pega.com/node/49006) | list view grouped by lane (E.5) |
| 13 | Smaller cards + zoom controls for big flows | Power Automate — [new designer](https://www.microsoft.com/en-us/power-platform/blog/?p=10768) | zoom 50–200%, minimap |
| 14 | Plan → automate: diagram first, then turn steps into automations | Zapier Canvas — [announcement](https://zapier.com/blog/announcing-zapier-canvas/) | Eveniment intermediar = automated step |
| 15 | Nodes/edges focusable with Tab, Enter/Space select, Esc deselect, arrows move (Shift faster); localisable aria labels for controls, minimap, handles | React Flow — [accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [AriaLabelConfig](https://reactflow.dev/api-reference/types/aria-label-config) | F.17, RO/RU/EN aria labels |
| 16 | Memoise nodes/edges, render only visible elements on big graphs, avoid heavy DOM in nodes | React Flow — [performance](https://reactflow.dev/learn/advanced-use/performance) | H |
| 17 | Viewport culling with a spatial index (`display: none` off-screen), signals so only changed shapes re-render, batched store updates, debounced zoom level above 500 shapes, cached geometry for hit tests, level of detail when zoomed out | tldraw — [performance](https://tldraw.dev/sdk-features/performance) | H |
| 18 | SVG fast for few objects / large surfaces, degrades with object count; Canvas near-constant; hybrids / level of detail | [Boris Smus](https://smus.com/canvas-vs-svg-performance/), [yWorks](https://www.yworks.com/blog/svg-canvas-webgl), [JointJS 100k nodes](https://www.jointjs.com/blog/jointjs-performance-overview-testing-diagrams-with-100-000-nodes) | HTML nodes + one SVG edge layer; canvas only for the minimap |
| 19 | Layered (Sugiyama) layout with orthogonal routing for directed flows | ELK / elkjs — [GitHub](https://github.com/kieler/elkjs) | F.11 algorithm reference (not the dependency) |

**Top insights applied (what makes it feel premium):** (1) **quick-append from the node** instead of round trips
to the palette (bpmn-js context pad, n8n „+”) — the „Continuă cu” menu is the main way to build; (2) **validation
is live and navigable** — every problem is a row that takes you to the element and the property (bpmnlint,
Bizagi); (3) the canvas is **full bleed** with compact floating chrome that can disappear (Ctrl/Cmd+\) — but fit
and centring always use the visible area (Figma UI3 lesson); (4) **orthogonal routes with rounded corners, snap
and alignment guides** — tidy by default, manual waypoints when needed (bpmn.io); (5) **one model, many
surfaces** — the same JSON drives canvas, list view, JSON tab and the passport lists; (6) **keyboard-complete**
(Tab through nodes, arrows, connect mode) plus a **list view** as the screen-reader / small-screen twin (React
Flow a11y, Pega stages); (7) **cheap motion**: transform-only pan/zoom, 150–160ms eases, reduced-motion off; (8)
**draft / publish / version** clarity with the active published version always visible (US-50, Form Builder);
(9) **run-state vocabulary** reused for the case trajectory overlay (Retool / ServiceNow test runs); (10)
**predictable layout** helpers — auto-layout as an explicit, undoable action, never on every change (elkjs,
Signavio QuickModel).

---

## H. Performance notes

- **Rendering split**: HTML for nodes (real focusable buttons, text wrapping, CSS states identical to the builder
  cards), **one** `<svg>` for all edges + labels, one overlay `<svg>` for transient drawing, `<canvas>` only for the
  minimap. Pan / zoom = a single CSS `transform` on `.e-permits-pd__world` — no per-node style writes, no layout.
- **Frame loop**: pointermove only stores the latest pointer; one `requestAnimationFrame` applies it (move node,
  draw connect line, pan). Never read layout (`getBoundingClientRect`, `offsetWidth`) inside the loop — node
  sizes are known from C.3 / measured once after render and cached; hit-testing on model coordinates.
- **Incremental updates**: keyed render — each node / edge element is created once and patched (`textContent`,
  `transform`, class toggles); moving a node recomputes only its edges' paths; panel edits patch the one node.
  Full re-render only on load / undo / layout.
- **Culling** above 200 nodes: spatial bucket index (500px cells), off-screen nodes and edges `display: none`
  (selected ones kept) — tldraw approach; below that, render all (the seed has 50 / 64).
- **Zoom**: debounce expensive work (route recomputation, label collision) to 120ms after the last wheel event;
  during the gesture only the transform changes. Level of detail < 75%: hide role chips and edge labels except on
  hover / selection.
- **Validation and minimap** on idle (requestIdleCallback with 150ms fallback), not per event.
- **Undo** snapshots are JSON strings of the definition (~24 KB) capped at 100; or structural sharing if the
  engineer prefers — either is fine at this size.
- **Event listeners**: one delegated pointer listener on the stage; `wheel` non-passive only on the stage (needs
  `preventDefault` for Ctrl+zoom); pointer capture for drags (release on pointerup / pointercancel /
  lostpointercapture / blur — the FB rules).
- **No `will-change` at rest**, no held `animation-fill-mode: both/forwards` (hover bug history), no layout
  animation of `left/top/width`. Budget: 60 fps pan/zoom/drag at 300 nodes on a 2020 laptop; open + fit < 200ms
  for the seed.

---

## I. Build plan (code first, then Figma) — demo states `pd-*`

| Batch | Content | Demo states |
|---|---|---|
| **0 · Fundament (view)** | `core/process-model.js` (load / normalise / serialise lossless + tests: seed round-trip deep-equal); route `?flow=proces` / `#flux/<id>` (fixes the dead link); shell = FB topbar + stage + floating palette / properties cards + footer; world transform; dot grid; render lanes / pool, the 6 node types (C.3 geometry, B.2 looks, all states), edges (stored ports + waypoints, auto orthogonal otherwise, labels); pan / zoom 50–200% / fit / toolbar / minimap; **Doar vizualizare** (toggle + `?vizualizare=1`); panels hide (Ctrl/Cmd+\, `[` `]`), palette rail; responsive rules | `pd-01` open Flux Simplificat fitted · `pd-02` new process (Start + Sfârșit) · `pd-03` hover handles on Activitate · `pd-12` panels hidden · `pd-13` view-only · `pd-14` palette rail · `pd-15` minimap + 50% · `pd-25` 900px view-only |
| **1 · MVP editare** | select / multi-select / marquee; move + snap + guides + lane change; palette drag + click-to-add; **„Continuă cu”** (+ on port, Ctrl/Cmd+Enter, drop on empty); connect drag + keyboard connect; delete + undo toast; undo / redo; keyboard map; live region; panel **General** for every type + Conexiune panel; validation E1–E4, E8, E10 + `__errors` / issues menu; Salvează (patch +1, Schiță) / Anulează / close guard; sandbox DB | `pd-04` Activitate selected · `pd-05` „Continuă cu” open from Start · `pd-06` connecting (dashed line, valid target halo) · `pd-06a` invalid release feedback · `pd-07` connection selected · `pd-16` issues menu · `pd-17` delete toast · `pd-27` unsaved close confirm |
| **2 · Configurare** | Decizie Ieșiri with the condition builder (`.e-permits-doc-rule`), default branch; Activitate Acțiuni (+ Formular) / Roluri / Avansat (Atribuiri); Eveniment intermediar component + Procesor (notify templates multi-select + live badge, audit, MConnect, MDocs, taxe) + drop-on-connection split; Sub-proces reference + drill-in breadcrumb + „Creează sub-proces nou”; Bandă / Pool panels, add / reorder / resize / delete rules, 15-lane limit; connection colour / thickness; E5–E7, E9, W1–W3 | `pd-08` Decizie Ieșiri · `pd-09` Notificare with 2 templates (badge 2) · `pd-09a` event dropped on a connection · `pd-10` Sub-proces panel · `pd-11` Bandă panel · `pd-22` drill-in · `pd-26` 15 lanes |
| **3 · Ciclu de viață** | Setări generale panel (table, Variabile de context, usage); Schemă JSON (copy, export); Versiuni menu + open version view-only + restore as draft; Publică modal (errors list / success, toast, audit, passport flows refreshed live in the request-type drawer); registry „Fluxuri de lucru” (workplace table: Denumire, Identificator copy, Statut, Versiune, Folosit de, Actualizat date-stack; toolbar Creează proces; row actions Editează + ⋮ Duplică · Exportă JSON · Șterge (Schiță only)) + «Proces nou» / «Duplică» drawers | `pd-18` Schemă JSON · `pd-19` Setări generale · `pd-20` publish blocked · `pd-20a` publish success · `pd-21` versions menu · `pd-28` registry · `pd-28a` Proces nou drawer |
| **4 · Premium** | list view (E.5) as a11y twin; auto-layout; alignment / distribute for multi-select; duplicate / copy-paste; Termene tab; trajectory overlay from the case profile („Vezi fluxul” → `?dosar=`); P3: simulation with context variables, comments, import JSON | `pd-23` list view · `pd-24` case trajectory overlay · `pd-29` auto-layout before / after |

Per batch: `ui-qa-code` (scope `#process-designer-modal`, hover-audit), then the figma-designer draws the new
states on page 5251:23305 (event component, connection component, toolbar, minimap, panels, view-only) as library
instances. Document the new classes in components.md („`e-permits-pd__*` — Process Designer”) and update
`.claude/playbooks/proto-engineer.md`.

**Acceptance for MVP (batches 0–1):** the seed opens fitted in < 200ms; load → Salvează without edits is
byte-equivalent (sorted keys) to the source except `version` / `status`; Start / Sfârșit cannot be deleted;
zoom limits hold; every drag outcome has a click or keyboard twin; Esc never closes; no hover freezes after drags;
view-only blocks every mutation (tested by trying each shortcut).

---

## J. Open PO questions

1. **Decision exits**: max 2 Da/Nu (US-52, Figma) or N (TC 89977, JSON node12 with Avizare / Aprobare / Respingere)?
   Spec: N with one default; Da/Nu preset. Evaluation order when several conditions are true?
2. **Labels**: „Build / JSON Schema” (US-50, Figma) or „Editare / Schemă JSON” like the shipped Form Builder? Spec:
   the latter. „Stare” or „Activitate” for the human step? Spec: Activitate.
3. **Save with errors**: TC 91066–91068 block save; US-50 says Salvează = draft. Spec: US-52 errors block save,
   reachability / role errors block only publish. Confirm.
4. **Who edits processes**: Administrator Central only (US-50/52/188) or also Administrator de autoritate (US-51)?
5. **Registry**: cards (US-50 AC-01) or table (TC 93445, product rule for registries)? Spec: table.
6. **Componentă vizuală** (US-52 AC-01): what is the list — BO screens, forms, profile tabs?
7. **Roles on a step**: are own roles allowed (JSON `roles[]`), or lane role only? Roles catalogue = guids from
   which registry (the JSON uses role guids, `case-flow.js` uses slugs)?
8. **Terms / SLA**: the JSON carries `terms` (Examinare start / pause / resume / stop, RaspunsSolicitant onExpire) —
   should the designer edit them (no story), or are they engine defaults?
9. **Message flow** (Feature 89397 palette): needed with a single pool? If yes, between what?
10. **Procesor server** options: full list and parameters (spec uses the 6 `componentType`s in the JSON + «Generează
    certificat constatator»). Who maintains it?
11. **StatusId 10** in the seed (node5) is not among the 5 published statuses — which status is it?
12. **Publishing a new version** of a process used by services: do running cases stay on their version (case
    pinned to the definition version) — yes assumed; do request types switch automatically to the new published
    version (spec: yes, with the warning in the publish modal) or must each request type be re-pointed?
13. **Sub-process referencing a draft**: allowed while editing (spec: warning) — and must the callee be published
    before the caller can be published (spec: yes)?
14. **Notification step removed** from a flow that request types override (US-188): block, or warn (spec: W3)?
15. **Import BPMN / JSON** (FR 15.21 not in the initial phase): is JSON import of a GEAP export in scope now?
16. **Simulation / test run** with context variables: wanted for training (Epic 89619 risk: learning curve)?
17. **Comments on the canvas** for BA / PO review: in scope for the prototype?
18. **Lane order / height** stored in JSON (`height`) — may admins reorder lanes after cases exist (visual only)?
19. Should the engine (`core/case-flow.js`) be driven from the JSON in the prototype (today it is hand-written and the
    simplified flow's ids partly differ — node8, RecordState4), so that the trajectory overlay is exact?
20. Is the second Azure attachment **ProcesFluxComplexStandart.Json** (Feature 90757) the source for the Complex flow
    seed? (Not readable from here — please drop it into `data/flows/`.)
