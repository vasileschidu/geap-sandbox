# Manual verification checklist

Run after each refactor step. Derived from the shipped code, not from a spec —
`baseline/interactions.md` did not exist when this was written, so every check
below was read out of the HTML/JS. If you add `interactions.md` later, reconcile
against it.

Serve from the repo root: `python3 -m http.server 8934`.

**Scope rule.** 22 entries. Each is 5–10 of the highest-risk interactions on that
page, not full coverage. Priority order within each page: storage → navigation →
table engines → everything else.

---

## Before you start: reset state

Four keys persist across reloads and will mask regressions. Clear them first, and
re-clear whenever a check behaves oddly:

```js
localStorage.removeItem("e-permits-created-users");
localStorage.removeItem("e-permits-user-profile-overrides");
localStorage.removeItem("geap.formBuilderSandboxDb.v1");
localStorage.removeItem("cookieConsent");
sessionStorage.removeItem("e-permits-back-office-assignment");
```

Keep DevTools open on Console for every page. A clean console is part of every
check — the front-office schema loader fails silently, so a `console.warn` is the
only signal you get.

**The two table engines.** Engine 1 is the workplace table in
`js/e-permits-shell.js` (pages 5, 10, 20). Engine 2 is the register table in
`rap-evo/rap-evo.js` (pages 14, 15). Anything touching sort, pagination,
selection, grouping or filtering in those files needs both engines re-run in full.

---

## 1. `index.html` — demo launcher

- [ ] All 8 cards render; none has an empty label or missing icon.
- [ ] Each of the 8 links resolves to a real page, not a 404: the three `?flow=`
      variants, `cabinet-evo/`, `msupport/`, `solicitant-sandbox/`, `rap-evo/`,
      `geap-sitemap.html`.
- [ ] `solicitant-sandbox/` link is present (it is the newest, and uncommitted).
- [ ] Page-reveal skeleton clears; no permanent grey blocks.
- [ ] Console clean.

## 2. `e-permits-acte-permisive.html` — flow home (no `?flow`)

- [ ] With no query string, the in-page flow home renders (not the wizard, not the
      shell). `<body>` carries `data-demo-flow="home"`.
- [ ] All 5 demo items navigate correctly.
- [ ] Arriving with a stale hash (e.g. `#request-step-4`) does **not** leave you on
      a wizard step. The hash is stripped by `history.replaceState`.
- [ ] Reload holds the flow home; it does not bounce to another flow.
- [ ] Console clean.

## 3. `?flow=full` — front-office wizard (steps 1–6)

Highest-traffic flow. Six of these are navigation.

- [ ] Auth gate renders first; the MPass CTA leaves for `mpass-test.html`.
- [ ] Instance picker: own-identity rows, MPower proxy group, notarial-proxy row.
      Blocked rows are `disabled` with a visible reason; the zero-eligible empty
      state renders when nothing qualifies.
- [ ] Step chips 1→6 advance and the hash tracks each one
      (`#request-step-2` … `#request-step-6`).
- [ ] **Back** on each step moves to the correct previous step. Step 4 goes back to
      2 in one branch and 3 in another — verify both.
- [ ] Browser back/forward across steps does not desync the stepper from the panel.
- [ ] Deep-link `#request-step-5` directly in a fresh tab: it lands on step 5 with
      the stepper in sync.
- [ ] Step 3: attach a document via the picker modal, both tabs (library + upload).
- [ ] Step 5 (delivery, newly built): courier options render, selecting one
      discloses its address block, the cascade address summary fills.
- [ ] Step 6 (payment, newly built): invoice table, totals, MPay button.
- [ ] Confirm step 7 is still absent — the flow ends at step 6. This is a known
      gap, not a regression.

## 4. `?flow=builder` — form builder — **STORAGE**

Writes `geap.formBuilderSandboxDb.v1`.

- [ ] With the key cleared, the builder seeds from `data/form-builder-db.json`.
- [ ] Make an edit, reload: the edit survives. Inspect the key and confirm it is
      valid JSON with a `forms` array.
- [ ] Corrupt the key (set it to `"{"`), reload: the builder falls back to the seed
      instead of throwing.
- [ ] Three modes switch: Build / Preview / Schema.
- [ ] Field drag from the library onto the canvas; drop guides appear.
- [ ] Field resize handles work; `.is-field-resizing` clears on release.
- [ ] Inspector `general` and `source` panels populate for a selected field.
      (`i18n`, `logic`, `advanced` are known shells.)
- [ ] Technical-name validation shows its success and error box.
- [ ] `#builder` deep-link opens the builder directly.

## 5. `?flow=back-office` — shell + workplace table — **ENGINE 1 + STORAGE**

The densest page. Writes `e-permits-back-office-assignment` (sessionStorage).

- [ ] Role switch: pick a different assignment. The whole sidebar swaps between the
      `specialist` and `central-admin` menus.
- [ ] Reload: the chosen role persists via sessionStorage. Open a new tab: it
      resets to default. Both behaviours are correct.
- [ ] Four workplace views load (Dosarele mele, Nedistribuite, Inițiate în oficiu,
      Spre printare) with correct row counts.
- [ ] **Sort**: click a sortable header. Default is `dataDepunerii` desc. Confirm
      asc/desc toggle, the arrow icon, and `aria-sort` on the `<th>`.
- [ ] **Pagination**: page forward/back; change page size (16/32/48). The
      "N of M" range text tracks.
- [ ] **Selection**: select-all checkbox, then individual rows. Select-all
      reflects mixed state correctly.
- [ ] **Grouping**: toggle group-by-serviciu. Group separators render and rows stay
      in their groups after a re-sort.
- [ ] Status tabs (9, including 2 dividers) filter rows and show counts.
- [ ] Search narrows rows; clearing restores the full set.
- [ ] Empty state appears for a filter combination with no matches.

## 6. Back office → dosar profile (`#dosar/<id>/<tab>`) — **NAVIGATION**

- [ ] Click a row: the profile opens and the hash becomes `#dosar/<id>/<tab>`.
- [ ] All 7 tabs render content; the hash updates as you switch.
- [ ] Deep-link `#dosar/<id>/taxe` in a fresh tab: it opens that dosar on that tab.
- [ ] Back out of the profile: the hash clears to the bare path and the table is
      still in the view, sort and page you left it in.
- [ ] An invalid id in the hash does not throw or leave a blank canvas.

## 7. Back office → user profile (`#utilizator/<id>/<tab>`) — **NAV + STORAGE**

Writes `e-permits-created-users` and `e-permits-user-profile-overrides`.

- [ ] Open a user; hash becomes `#utilizator/<id>/<tab>`; 5 tabs present.
- [ ] Inline-edit a field, save. Reload: the edit persists via
      `e-permits-user-profile-overrides`.
- [ ] Add a role combination, then remove it. Both toast. Both survive reload.
- [ ] Permissions tab: grant one, revoke another. The grouped counts update.
      Reload and confirm persistence.
- [ ] Create a user via the drawer (IDNP lookup against the RSSP fixture). The new
      user appears in the registry and in `e-permits-created-users`.
- [ ] Clear both keys and reload: the registry returns to the seed with no orphan
      rows and no console error.
- [ ] Delegări and Jurnal tabs still show the empty state. Known gap.

## 8. `acte-permisive/index.html` — stale 3-item launcher

- [ ] Renders with its inline styles; all 3 links resolve.
- [ ] Console clean.

## 9. `acte-permisive/09/index.html` — iframe shim

- [ ] The iframe loads the full flow with `?service=acte-permisive&flow=full`.
- [ ] The wizard inside the frame is interactive, not a blank frame.

## 10. `e-permits-shell.html` — legacy standalone shell — **ENGINE 1**

Same engine as page 5, different host page. Refactors to `js/e-permits-shell.js`
break here first because this page has fewer panels wired.

- [ ] The workplace table renders against the hardcoded 12-column `<thead>`.
- [ ] Sort, pagination and selection behave as on page 5.
- [ ] Role modal opens and switches the nav.
- [ ] Confirm no console error from the missing panels (no dosar/user/role profile,
      no user-create drawer on this page).
- [ ] Two hotlinked Figma asset URLs are expected to 404 here. Known, pre-existing.

## 11. `geap-sitemap.html` — React sitemap

Self-contained; does not load `main.css`. A CSS refactor cannot break it — a
CDN or offline problem can.

- [ ] React loads from cdnjs (fails offline — expected).
- [ ] All 5 views switch: roleworkplace, requests, postproc, front, back.
- [ ] Role filter (spec / sup / adml / admc) changes the visible tree.
- [ ] Zoom and the flags toggle work; focus dimming applies.
- [ ] Console clean.

## 12. `mpass-test.html` — MPass consent — **NAVIGATION**

- [ ] Arriving from the wizard, "Continuă autentificarea" returns to
      `?flow=full#choice-authenticated` and the picker shows as authenticated.
- [ ] "Înapoi la serviciu" returns to the same URL with the hash stripped.
- [ ] A `?return=` pointing off-origin is rejected and the fallback is used.
      Try `?return=https://example.com`.
- [ ] A malformed `?return=` falls back rather than throwing.

## 13. `table-cells.html` — cell gallery

The `.cell` family is used by both table engines, so a change here implies
re-running pages 5 and 14.

- [ ] Both sample tables render in the "In context" section.
- [ ] Copy-to-clipboard on a `.cell__copy` sets `.is-copied` and shows the tooltip.
- [ ] Masked copy (`--masked`) reveals the real value on copy, not the mask.
- [ ] Truncation, media, code, dot, tags and action cells all render.
- [ ] Console clean.

## 14. `rap-evo/index.html` — register list — **ENGINE 2 + NAVIGATION**

Real query params and `pushState`. The only page in the project with true browser
history, so back/forward is the top risk.

- [ ] Table renders 14 records; summary says 1567 total.
- [ ] Search debounces (~120 ms) and narrows rows. The clear button empties it and
      removes `?idno` from the URL.
- [ ] Filter drawer: all 4 sections expand, search within a section, counts update.
- [ ] Date ranges including the two "single date" checkboxes.
- [ ] Apply filters, then Reset all: chips clear and the full set returns.
- [ ] Pagination and page size (16/32/48).
- [ ] Company drill-down: click a company beneficiary. The URL gains
      `?idno=<identifier>` via `pushState`, search fills with the identifier, and
      the company summary card appears.
- [ ] **Browser back** from that state restores the unfiltered list. `popstate`
      re-runs `syncViewFromUrl`.
- [ ] Empty state renders for a no-match filter.
- [ ] "Prelungit" status has no CSS class and falls through unstyled. Known gap.

## 15. `rap-evo` permit profile (`?act=<id>`) — **ENGINE 2 + NAVIGATION**

- [ ] Click a row: profile opens, URL gains `?act=<id>` via `pushState`.
- [ ] Hero, beneficiary card, detail rows and the timeline all render; timeline
      shows `--complete` and `--current` states.
- [ ] Back button in the UI returns to the list and drops `?act`.
- [ ] **Browser back** does the same without a blank screen.
- [ ] Deep-link `?act=<id>` in a fresh tab opens the profile directly.
- [ ] An unknown `?act` id falls back to the list rather than a blank view.
- [ ] "Vizualizare actul" fires a toast. Known stub.

## 16. `cabinet-evo/index.html` — citizen permit list

- [ ] 6 permit cards render.
- [ ] All 5 filter chips filter correctly; badge counts are right; the `suspendat`
      chip carries the accent badge.
- [ ] Search narrows the cards; the empty state appears at zero matches.
- [ ] The front-office header and avatar menu render, including the MPower proxy
      stack (this page reuses the FO header verbatim, so FO CSS changes land here).
- [ ] Status tags map correctly, including `anulat` → "Retras".
- [ ] Cards are focusable but inert on click. Known gap.

## 17. `msupport/index.html` — support widget

- [ ] Launcher FAB opens the panel; the greeting bubble shows and closes.
- [ ] Both demo surfaces switch: citizen and business.
- [ ] All 3 states traverse: type → form → done.
- [ ] Validation: submit empty. Required name and description show inline errors.
- [ ] Attach a file over 10 MB or with a disallowed extension: both rejected with a
      message.
- [ ] Character limits enforced (80 name, 1000 description).
- [ ] Done state shows the loader, then the tick and a reference id.
- [ ] The widget reuses `.e-permits-fo-select`, `.btn`, `.chip` and
      `.message--inline` — re-check after any library change.

## 18. `solicitant-sandbox/index.html` — schema sandbox — **NAV + FETCH PATCH**

Uncommitted. It rewrites the real page's HTML and patches `window.fetch`, so it
breaks whenever the front-office schema shape or load path changes.

- [ ] The right-hand iframe loads the real wizard, not an error card.
- [ ] All 9 toggles change the outcome text.
- [ ] All 7 presets apply and each produces its described outcome.
- [ ] The 6 outcome descriptions render with the right tone (info / warn / ok).
- [ ] The generated schema panel updates as toggles change.
- [ ] `window.__sandboxProbe` is defined in the console.
- [ ] If the frame shows "Nu am putut încărca pagina reală", the fetch patch has
      broken — that is the signal to check the schema URL.

## 19. `Components/e-permits-acte-permisive.html` — mirror of pages 3–5

This copy is **out of sync** with root: the HTML is 7 lines behind and the JS 488
lines behind. Treat drift as expected, breakage as not.

- [ ] All three `?flow=` variants load without a console error.
- [ ] The wizard reaches at least step 5 (this copy predates the delivery and
      payment work).
- [ ] Note any *new* divergence from root introduced by your refactor.

## 20. `Components/e-permits-shell.html` — mirror of page 10 — **ENGINE 1**

- [ ] Workplace table renders; sort and pagination work.
- [ ] Role modal opens.
- [ ] Console clean apart from the two known Figma asset 404s.

## 21. `Components/fod2-form-builder.html` and `-shell.html`

Off-system explorations. The first uses its own tokens and must **not** inherit
design-system changes; the second must.

- [ ] Both load; React comes from cdnjs (fails offline — expected).
- [ ] `fod2-form-builder.html` still renders in its own palette (orange accent,
      Fraunces). If a `main.css` change bled into it, that is a regression.
- [ ] `-shell.html` picks up token changes as intended.
- [ ] Three modes and the prop tabs switch in both.

## 22. `Components/*.html` — 58 component demos (smoke pass)

Do not click through all 58. After a CSS or token refactor, open these six, which
between them exercise every state axis that has broken before:

- [ ] `buttons.html` — all variants, sizes, hover/active/focus/disabled, loading.
- [ ] `dropdown.html` — custom select: open, keyboard, selected, disabled, and the
      destructive variant's border and accent.
- [ ] `input-date-picker.html` — day states: today, selected, in-range, outside,
      disabled.
- [ ] `progress-tracker.html` — completed / current / blocked. `--incomplete` has
      no rules of its own. Known gap.
- [ ] `modals.html` — all sizes; the close button must be `display: flex`.
- [ ] `table.html` — all table variants and the sort button.
- [ ] Spot-check that the docs chrome (header, sidebar, TOC) still injects on each.

`Components/index.html`, `Components/geap-sitemap.html` and
`Components/acte-permisive/*` are duplicates of pages already covered; open them
only if you changed something they alone depend on.

---

## Known gaps — do not report these as regressions

| Page | Gap |
|---|---|
| 3 | Step 7 "Finalizare" has no panel; the flow ends at step 6 |
| 5 | Five central-admin nav items land on a blank placeholder |
| 7 | Delegări and Jurnal tabs render the generic empty state |
| 10, 20 | Two hotlinked Figma asset URLs 404 |
| 14 | "Prelungit" status has no CSS class |
| 15 | "Vizualizare actul" fires a toast instead of opening a document |
| 16 | Permit cards are focusable but have no click handler |
| 22 | `.progress-step--incomplete` has no styling rules |
| 3 | Front-office schema load fails silently — watch the console |

## Also worth knowing

- The permit-profile tabs (`?flow=back-office` → Acte permisive) only toggle
  `.active`; there is no panel switching, so all 6 tabs show the same content.
- `css/main.css` and `Components/css/main.css` must stay byte-identical.
  `cmp css/main.css Components/css/main.css` after any CSS change.
