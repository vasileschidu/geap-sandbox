# Unsaved changes review — Figma tools (2026-10-21)

Code: commit 9ed3a52d (`#profile-changes-modal`, `registerChangeSource`), components.md „unsaved changes status → review modal”.

Components (GEAP 2.0 aHgwVwiNCOSOqbMhMjjUOj, 🧩 Local components 10566:10080 — since 2026-10-24 Header status sits in section „Navigation & headers” 12645:7593, the review family in „Modals, sheets & drawers” 12645:8487; the old holder 12241:493487 was removed):
- Header status 12241:493506 (State Default/Hover/Focus × Size Caption 12/16 / Inline 14/20; TEXT Text)
- Change row 12241:528864 (Screen Desktop/Phone; Title, Detail, Show divider; exposed Tag, Undo)
- Change group 12241:528943 (Screen; Label, Show row 2/3; exposed Count, Row 1–3)
- Unsaved changes review 12241:529090 (Screen Desktop 590 / Phone bottom sheet 375; Title, Subtitle, Show group 2/3; exposed Group 1–3, Discard all, Save)
eKYC copy (SqMGpRKEppJLcvn7HMzOPR, 🧩 Local components › 10904:162304): Header status 10904:162323, Change row 10904:162346, Change group 10904:162425, review 10904:162572.

Run order (use_figma, prelude + builder stored in figma.root shared plugin data „unsv”: keys / lib / blk):
1. `prelude.js` (= „unsv”/„lib”: variable / style helpers by Foundations key).
2. Components: built once (see the job in the figma-designer playbook, 2026-10-21); eKYC copy built from library KEYS.
3. `blocks.js` (= „unsv”/„blk”): `fillReview(instance, {sub, groups:[{label, rows:[{t, tag, tone, d}]}]})`,
   `setLabel`, `setNote`, `addOverlay` (desktop scrim + centred review), `addPhone` (375 bottom sheet; the phone
   frame is sized 375 BEFORE the sheet fills — measuring at 100 wide made 1795-high phones).
   After addOverlay: overlay → VERTICAL auto-layout, modal ABSOLUTE at whole pixels (gate).
Content per state: probe the code with `probe-content.mjs <states> [width]` (modal subtitle, groups, rows, tag tone, header status).
