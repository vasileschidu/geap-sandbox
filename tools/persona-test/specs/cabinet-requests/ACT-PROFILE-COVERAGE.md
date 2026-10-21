# Act profile — EVO Cabinet „Actele mele permisive” › ?act=<id> — coverage (act-profile-v1, 2026-10-21)

Screen: `cabinet-evo/index.html?view=acte&act=<id>[&as=<subject>]` · renderer `cabinet-evo/cabinet-evo.js` › `renderDetail`
· doc `.claude/skills/components.md` › „Act profile — EVO Cabinet (act-profile-v1)”.
Sources (Azure GEAP, read-only): Feature 90818, US-55 (89470), US-162 (91373), US-161 (91355), US-159 (91297),
US-143 (91141), US-144 (91142).
Links: `https://vasileschidu.github.io/geap-sandbox/cabinet-evo/index.html?state=<id>`.

## Demo states

| State | Act (perspective) | What it shows |
|---|---|---|
| pp-01d | act-izvoras (SRL Global Trader) | Valabil, 704 days left, Postprocese, Vezi solicitarea, Ce permite actul (object fallback), Istoric with a duplicate |
| pp-01e | act-lab-10 | Valabil with a post-process in progress: Postprocese disabled + notice „Prelungire în curs … Vezi solicitarea →” |
| pp-01i | act-bistro | Expirat: „A expirat la …”, notice + „Depune o solicitare nouă →”, Istoric „Valabilitate încheiată” |
| pp-01j | act-piata-mare | Suspendat at the holder's request (reason, decision), „se reia automat” + request link, Data suspendării, Valabil până la |
| pp-01k | act-cantina | Retras at the holder's request (reason, decision), no Postprocese |
| pp-01l | act-licenta-demo | Valabil, tacit approval: badge + Data aprobării tacite + Istoric step |
| pp-01m / pp-01o | act-izvoras | „Vizualizare act” = the MDocs A4 dialog (Descarcă · Închide) |
| pp-01n | act-piata-mare | the A4 of a Suspendat act (watermark) |
| pp-01q | act-licenta-susp | the open menu: „Postprocese” (desktop) / „⋯” overflow (phones) |
| pp-01x / pp-01y | act-depozit-10 | Ce permite actul + „Substanțe controlate” grid on the page, collapsed / expanded |
| pp-01z | act-depozit-10 | the multi-page A4 with the grid |
| pp-01v | Lumina Office (expired MPower) | the restriction — no act, no profile reachable |
| **pp-03** | act-ana-anulat (pf-anastasia) | Anulat **by the authority**: reason, decision, contestație term → „Vezi solicitarea →” (d-ana-anulare) |
| **pp-03a** | act-cofetaria | paper act: offline notice, no Postprocese, Seria documentului tipărit, Istoric „Act emis pe hârtie” |
| **pp-03b** | act-licenta-susp | Suspendat **by the authority**: reason, decision, „Cere reluarea valabilității →” (Reluare eligible) |
| **pp-03c** | act-vita-farm (pj-vita-plant, MPower) | Valabil expiring in 45 days: „Inițiază prelungirea →”; representative → Beneficiar first |
| **pp-03d** | act-izvoras | Istoric scrolled into view |

pp-01y / pp-01z were already taken (act-fields states, 2026-10-19), so the new states are pp-03 … pp-03d.

## Coverage — AC → where it shows

| Source | Requirement | Where | State(s) |
|---|---|---|---|
| F 90818 | act number, act name, dossier no. (link to the request) | facts card Nr. (copy) · h1 + subtitle · Detalii › Numărul dosarului electronic + „Vezi solicitarea” | pp-01d |
| F 90818 | Autoritatea emitentă + Subdiviziunea emitentă | section „Autoritatea emitentă” | pp-01d |
| F 90818 | Data emiterii, expiry + days left | Detalii › Data emiterii · facts „Valabil până la … (N zile rămase)” | pp-01d, pp-03c |
| F 90818 / US-162 AC-07 | status Valabil / Expirat / Suspendat / Retras / Anulat, colour | Small tag in the facts card (green / amber / red) | pp-01d, pp-01i, pp-01j, pp-01k, pp-03 |
| F 90818 / US-143 | view, download from MDocs | „Vezi act permisiv” → A4 dialog, „Descarcă” | pp-01m, pp-01z |
| F 90818 / US-55 AC-08…11 | post-processes by passport + status | „Postprocese ⌄” only with eligible items; none for Expirat / Retras / Anulat | pp-01d, pp-01q, pp-01k, pp-03 |
| US-55 AC-14 | ineligible = hidden or disabled with reason | Postprocese disabled + notice; in „⋯” every item disabled with the reason line | pp-01e (desktop + 375) |
| F 90818 | paper act = offline notice + no post-processes | notice + no Postprocese | pp-03a |
| F 90818 / US-159 | representative loses access when MPower expires | restriction notice, no list, no profile | pp-01v |
| F 90818 | the initiator of a suspension / withdrawal matters; contestație on the dossier for authority-initiated changes | notice „decisă la cererea titularului / de <autoritate>”, contestație term + request link; Istoric „din inițiativa …” | pp-01j, pp-03b, pp-03 |
| US-55 AC-07 | full act data (number, service, provider, holder, dates, status) | header + Detalii + Autoritatea + Beneficiar | pp-01d |
| US-162 AC-04 | mandatory fields | all on the page (Beneficiar IDNx with copy) | pp-01d |
| US-162 AC-05 | optional fields hidden when empty | Seria / Valabil din / Valabil până la / rows of Ce permite actul only with a value | pp-01k (no Seria), pp-01d (no Valabil din) |
| US-162 AC-08 | tacit badge + date | „Aprobare tacită” tag + Detalii › Data aprobării tacite + Istoric | pp-01l |
| US-162 AC-12 | „Vizualizează act” for every status | „Vezi act permisiv” in every state | all |
| US-162 AC-14 | Istoric complet (request, tacit, issue) | „Istoric” trajectory | pp-03d, pp-01l |
| US-162 AC-17 | suspension / withdrawal dates only for those statuses | Suspendat: Data suspendării + „Suspendat până la”; Retras: „Retras la”; + Anulat „Anulat la” | pp-01j, pp-01k, pp-03 |
| US-161 AC-23…26 | Valabil din, Valabil până la (absent if unlimited), Numărul actului, Data emiterii | Detalii + facts card; unlimited → „Valabilitate nelimitată” (no demo act) | pp-01d |
| US-161 AC-29 | service-specific fields read-only ON the page | „Ce permite actul” (+ passport groups, grids) | pp-01d, pp-01x, pp-01y |
| US-159 AC-03 | representative with valid MPower = full access | profile with actions; Beneficiar first | pp-03c |
| — (brief) | next steps | notice links: Cere reluarea / Inițiază prelungirea / Depune o solicitare nouă / Vezi solicitarea; Istoric dashed next step | pp-03b, pp-03c, pp-01i |

Out of scope here (RAP public page only): US-162 AC-01/03/09/11/13/15/16, US-144 (public extract).

## Decisions

1. Each fact once: number + status + ONE status date live in the facts card; Detalii carries the rest. „Valabil până la”
   is the facts card's date for Valabil / Expirat and a Detalii row for Suspendat / Retras / Anulat; the withdrawal /
   annulment date is the facts card's date (US-162 AC-17 field shown once, labelled „Retras la” / „Anulat la”).
2. „Data eliberării” → „Data emiterii” (US-161 AC-26); „Valabil din” only when it differs (it never does in the demo data).
3. „Cod” (authority code) removed — no story asks for it; the DEMO service authority is now ANSP (it was the
   placeholder „Autoritate emitentă”).
4. „Vezi act permisiv” opens the A4 document directly; the old „Vizualizare act” data dialog repeated the page.
   Cabinet footer: Descarcă · Închide (RAP keeps Imprimă · Închide).
5. Beneficiar: after the authority for the owner (already named in the header avatar), first for a representative.
6. „Ce permite actul”: the first configured group takes this name, the next keep their passport titles.
7. Header: look and feel of the user's YouTube reference only (grey grouped buttons, facts card); the authority
   „channel” row was built and rejected the same day. Actions left-aligned, one line, overflow „⋯” on narrow widths.
8. Full container width for the act and the request profiles (user, 2026-10-21); notices keep ~75ch lines.
9. Data: profile extras live in `data/cabinet-evo.json › actProfiles` (where the status dates already were), not in
   `acte-permisive.json` (shared with the FO / Ghișeu); new acts act-ana-anulat / act-vita-farm were added there.
10. pp-01j data aligned with its decision (D-ANSP-2026-0791: suspended 5 June → 15 December 2026; was 8 Sept → 8 Dec).

## Open PO questions

1. **Reason / initiator data model** — where does the act get „who decided and why” (decision record on the act,
   or only on the post-process dossier)? The prototype stores `statusChange { initiator, reason, decision, dosarId }`.
2. **Contestație from the act or the dossier?** Feature 90818 lists „Contestație” among the act's post-processes, the
   brief says it belongs to the dossier. Built: the notice points to the request („Vezi solicitarea →”). Is it also
   available for Anulat (the Feature names Retras and Suspendat only)?
3. **Authority-initiated dossiers in „Solicitările mele”** — does the holder see them (needed for the contestație)?
   Demo: d-ana-anulare, `initiatedBy: "autoritate"`.
4. **Istoric scope** — only the act's own requests, or every dossier linked to it (incl. refused post-processes,
   drafts)? Built: issue, tacit, approved post-processes, one in progress, expiry; refused / drafts left out.
5. **Paper acts**: is an MDocs A4 available for an act issued on paper (registered as historical)? Built: the button
   stays (US-162 AC-12 „every status”). The data has a GEAP „Reluare” request on the paper act (d-dulce-reluare) —
   contradicts „no digital post-processes”; hidden from its Istoric.
6. **Expiry prompt threshold** — 60 days (proposal).
7. **Share by e-mail / copy link** — not built (no story); no „⋯” item on desktop.
8. **act-vita**: a Reperfectare is in examination (d-vita-reperf) but the act is not locked (`pending` missing in the
   act data) — data or rule?
