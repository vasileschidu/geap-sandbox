# Component audit: front office, EVO Cabinet, RAP (18 October 2026)

**Question:** do the prototype screens use only library components, and are form fields the right size?
The target is 40px fields on desktop, and 48px fields with 16px text on phones.

- **Tool:** `tools/ui-qa/component-audit.mjs`
- **Allow-list:** `tools/ui-qa/specs/component-audit.json`
- **Agent:** `.claude/agents/component-auditor.md`. It runs with `ui-qa-code` on every UI change; see CLAUDE.md › UI QA.
- **Commit with the fixes:** `4892581d`

## Scope

27 demo states, each at three widths: 1440 (desktop), 375 (phone) and 760 (the widest phone, „edge”).

| Area | States |
|---|---|
| Front office request flow | fo-01 … fo-08e |
| EVO Cabinet | pp-01 (Actele mele permisive), sm-01 (Solicitările mele), sm-05 (request profile) |
| RAP | rap-01 (list), rap-02 (act profile) |

## Result

| Area | Phone size problems, 375 | Phone size problems, 760 | Non-library controls (types) |
|---|---|---|---|
| Front office | 31 → **0** | 196 → **0** | 16 |
| EVO Cabinet | 2 → **0** | 2 → **0** | 2 |
| RAP | 1 → **0** | 1 → **0** | 10 |

### Fixed in `4892581d` (phones only; desktop unchanged)

- **Telefon read-only field (Date solicitant):** text 14 → 16px and the check icon 20 → 24px, the same as Email.
- **The front office phone field rules applied only up to 720px wide.** They now apply up to 760, so fields 721–760 wide are 48px instead of 40.
- **CAEM / subgenre list searches and „Caută fișier” (document picker):** 40 → 48px, text 16px, icon 24px.
- **Address, cadastral, Cabinet and RAP searches:** the search icon is now the library's 24px icon at the 48px size.

### Still open: controls that are not library components

These are listed, not changed. Each one needs a decision: switch to the library component, or keep it and document it as a product component.
The full list, with screens and widths, is in [grouped.md](grouped.md).

**Front office**

| Control | Where | Closest library component | Proposal |
|---|---|---|---|
| „Înainte” `.e-permits-fo-next` | step footer, every step | `.btn.btn-primary` large | decide: swap (bigger text and padding) or document as the front office step button |
| „Înapoi” `.e-permits-fo-back-button` | step footer | `.btn-icon` / `.btn.btn-neutral` | same decision as „Înainte” |
| „Salvează ca schiță” `.e-permits-fo-draft-button` | step footer | `.btn.btn-neutral` | same decision as „Înainte” |
| Profile avatar `.e-permits-fo-auth__avatar`, phone menu `.e-permits-fo-auth__menu`, beta ✕ `.e-permits-fo-auth__beta-close` | header | `.btn-icon` | document as the header (EVO header is product-specific) |
| Profile menu items (`__role`, `__cabinet`, `__settings`, `__proxy`, `__logout`) | account switcher | none in code (no menu component) | document as the account switcher |
| „i” `.e-permits-fo-role-info` | Solicitant / Reprezentant | `.btn-icon` small | swap |
| „Adaugă document” `.e-permits-fo-add-doc-button` | Acte necesare | `.btn.btn-neutral.btn-sm` | swap |
| ✕ remove document `.e-permits-fo-document-remove` | attached file | `.btn-icon` | swap |
| Pen „Editează” `.e-permits-fo-summary-section__edit` | Verificare | `.btn.btn-neutral.btn-sm` with the pen icon | swap |

**EVO Cabinet:** only the shared front office header buttons (avatar and phone menu).

**RAP**

| Control | Where | Closest library / product component | Proposal |
|---|---|---|---|
| Page buttons `.rap-page-button` | list pager | library pagination | swap |
| Copy buttons `.rap-copy`, `.rap-profile__copy` | table, profile | documented copy-value component | swap |
| Rows per page `<select class="select">` | list pager | library select | check; may be a false positive of the allow-list |
| Ro / Ru / En `.button` | header | `.btn` text | swap; they also have no hover |
| Header menu items `.rap-header__menu-item`, search icon `.rap-icon-button` | header | `.btn-icon` / menu | document as the public header |
| „Vezi toate actele companiei” `.rap-profile__company-permits` | profile › Beneficiar | text link / `.btn` link variant | document or swap |

## Files

- [grouped.md](grouped.md): every finding grouped by control, with screens and widths.
- [per-screen-after.md](per-screen-after.md): every state and width after the fixes, with selector, measured value, expected value and fix hint.
- [per-screen-before.md](per-screen-before.md): the same before the fixes.
- [report-after.json](report-after.json): raw output of the tool.

## How to re-run

```
node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs \
  --states fo-02,pp-01,rap-01            # or --prefix fo-0
  [--viewports desktop,mobile,edge]
  [--baseline audits/2026-10-18-component-audit/report-after.json]
  --out tools/ui-qa/out/components
```

The prototype must be served on http://localhost:8935.
