# payload.py <block-id> → the JSON a list/profile block call pastes: {B (label/note), d (desktop S), m (mobile S, rows shared)}
import json, subprocess, sys
SPEC = "tools/figma/rap/out/spec.json"
SANDBOX = "https://vasileschidu.github.io/geap-sandbox/rap-evo/index.html"
US = "Azure: US-139 91135 · US-140 91136 · US-141 91137 · US-142 91140 · US-143 91141 · US-145 91143 · US-162 91373"
BLOCKS = {
 "rap-01": ("Registry list (default)", "rap-01", "The public register of permissive acts (EVO): breadcrumb, title + intro, search („Caută după nr. dosar sau denumire”) + „Filtru” (BO advanced-filter button), 16 rows per page. Row = beneficiary (PF anonymised „S. V***” + masked IDNP, PJ name + IDNO), act name (link to the profile, one line + ellipsis), authority code + name, act no. + „Dosar: …”, „Valabil până la” + „emis …”, Statut = BO Tag · Small; a tacitly approved act shows the blue „Aprobare tacită” badge instead. Pagination 5 pages. Phones: the table runs edge to edge and scrolls sideways (first column on the 16 edge); search + chip row of the phone filter. Stories: US-139 (list), US-140 (search), US-142 (row → profile).", None),
 "rap-01q": ("Search results („alcool”)", "rap-01q", "Typing in the search filters the register live (no button): „alcool” → 336 results, same table, pagination recounted. No demo state — URL only (type into the field). Stories: US-140.", SANDBOX),
 "rap-01e": ("Long act name · tooltip on hover", "rap-01e", "A very long act name (ozone-substances authorisation) stays on one line with an ellipsis; hover shows the shared dark tooltip with the full name (desktop only — on phones the full name is on the profile). Figma comment A. 1968942771. Stories: US-139.", None),
 "rap-01f": ("Tacit approval in the list", "rap-01f", "A tacitly approved act (Aprobare tacită = true, still Valabil) shows only the blue Small „Aprobare tacită” badge in the Statut column (column 125 wide so the 100-wide tag fits). Row hovered. Figma comment G. 1868591457. Stories: US-139 AC-02 (to confirm with the PO: badge „alături de Status” vs alone).", None),
 "rap-01a": ("Filter open (bar of facets)", "rap-01a", "„Filtru” = the BO advanced filter: the button keeps the focus ring while open; a bordered bar shows one chip per facet (Statut · Denumire act · Autoritate · Tip beneficiar) and the hint „Alege valorile, apoi aplică filtrele.” Phones (≤760): no toolbar button — the chip row under the search is the filter (first chip „Filtre” = all filters). Stories: US-141.", None),
 "rap-01b": ("Facet popover · Statut", "rap-01b", "A chip opens its checklist popover (270, dropdown-effect, 8 under the chip): values as status tags incl. „Aprobat tacit” (US-141), „Confirmă” stages the facet, „Șterge” clears it. Phones: the same facet opens the library bottom sheet (title · „Resetează” · ×, 44 rows, „Arată N de rezultate”). Stories: US-141.", None),
 "rap-01c": ("Filters applied", "rap-01c", "After „Aplică filtrele”: selected chips are black with their count, the button shows the total (3), the bar shows „224 rezultate · Șterge filtrele”. Phones: chips + „Filtre” count, „196 de rezultate · Șterge filtrele” 4 under the row. Stories: US-141.", None),
 "rap-01h": ("Filter „Aprobat tacit”", "rap-01h", "The Statut facet has the pseudo-value „Aprobat tacit” (acts with Aprobare tacită = true, whatever their status) — applied: 98 results, every row with the blue badge. Stories: US-141.", None),
 "rap-01d": ("No results (filters)", "rap-01d", "A filter combination with no rows: shared empty state (dashed box, search icon) „Ne pare rău, nu am găsit niciun rezultat” + „Modificați căutarea sau ștergeți filtrele aplicate.” + „Șterge filtrele”; the table and pagination are hidden. Stories: US-140, US-141.", None),
 "rap-01g": ("Company acts („Vezi toate (N)”)", "rap-01g", "From a company profile „Vezi toate (4) →” opens the list filtered to the company (?idno=…): the search holds the IDNO, a grey company card (avatar, name, IDNO) and a separate grey card with the counts Total acte / Active (green) / Inactive (amber), then the company's own acts. Stories: US-139 / US-142.", None),
 "rap-04": ("Phones · filter chip row", "rap-04", "Phone mode of the facet filter (≤760, opt-in mobileSheets): no toolbar button, the search takes the row; one chip row 12 under it, scrolling sideways to the screen edge (first chip on the 16 margin): „Filtre” (filter icon) + one chip per facet. Desktop for this id = the BO bar (as rap-01a). Stories: US-141.", None),
 "rap-04a": ("Phones · Statut sheet", "rap-04a", "Tapping the Statut chip opens its bottom sheet (library Bottom Sheet: radius 24 top, hugs up to 90%): title „Statut” · „Resetează” · close 32, 44 rows with status tags, sticky footer with a top divider and the full-width large „Arată N de rezultate” (live count). Desktop: the popover (as rap-01b). Stories: US-141.", None),
 "rap-04b": ("Phones · Autoritate sheet with search", "rap-04b", "Facets with more than 7 values get the library search (40, inset 4/16/8) above the list; typing „agen” narrows the authorities. Desktop: the popover with its search. Stories: US-141.", None),
 "rap-04c": ("Phones · all-filters sheet", "rap-04c", "„Filtre” opens the all-filters sheet (90% high): one 56 row per facet (label 16/24 medium + the ticked values 14/20 grey + chevron), dividers between sections, an open section lists its options; one „Arată N de rezultate”. Desktop: the BO bar (as rap-01a). Stories: US-141.", None),
 "rap-04d": ("Phones · filters applied", "rap-04d", "Applied on phones: „Filtre” black with the total, facet chips with their counts, „N de rezultate · Șterge filtrele” 4 under the row. Stories: US-141.", None),
 "rap-02": ("Act profile · company (valid)", "rap-02", "BO page header (breadcrumb, title, meta Numărul actului (copy) · Stare (tag) · Valabil din data · Data expirării, separators), „Vezi act permisiv” (primary md, eye), then BO sections over grey cards: Beneficiar (avatar + name + IDNO copy + „Vezi toate (4) →” at the right), Detalii act (8 rows, full-month dates), Autoritatea emitentă (Denumire · Cod · Oficiul · Telefon · E-mail links). Phones: ‹ breadcrumb, meta 2×2 without separators, label-over-value rows, link under the name. Stories: US-142, US-162.", None),
 "rap-02a": ("Act profile · person, long name", "rap-02a", "PF beneficiary: anonymised name „S. V***” + masked IDNP (not copyable, no link), long act name wraps in the title (never truncated on its own page). Stories: US-142, US-145.", None),
 "rap-02b": ("Act profile · Suspendat", "rap-02b", "Status Suspendat (US-162 AC-17): amber tag; the header meta shows „Suspendat până la” beside Stare instead of „Valabil din data”; Detalii act adds „Data suspendării actului permisiv” and „Suspendat până la data de” in date order before „Data expirării”. Stories: US-142, US-162 AC-17.", None),
 "rap-02d": ("Act profile · very long act name", "rap-02d", "The ozone-substances authorisation: the title wraps on 2 / 6 lines, the Denumire row wraps as whole words; one-act company (no „Vezi toate”). Figma comment A. 1968942771. Stories: US-142.", None),
 "rap-02g": ("Act profile · tacit approval", "rap-02g", "Aprobare tacită = true: the blue badge beside the Stare tag in the header, and ONE row „Data aprobării tacite” (date + badge) right above „Data eliberării” in Detalii act. Stories: US-139 AC-02, US-142 / US-162 AC-08.", None),
 "rap-02h": ("Act profile · Retras", "rap-02h", "Status Retras (US-162 AC-17): red tag; the header meta shows „Retras la” beside Stare instead of „Valabil din data”; Detalii act adds „Data retragerii actului permisiv” in date order before „Data expirării”. Stories: US-142, US-162 AC-07 / AC-17.", None),
 "rap-02c": ("Act not found", "rap-02c", "Unknown ?act= (expired link): shared empty state „Actul nu a fost găsit” + „Linkul nu mai este valabil sau actul nu există în registru.” + „Înapoi la registru” (neutral sm). Stories: US-142 AC-16.", None),
}
def S(state, w):
    return json.loads(subprocess.check_output(["python3", "tools/figma/rap/compact.py", SPEC, f"{state}@{w}", state]))
bid = sys.argv[1]; title, state, note, link = BLOCKS[bid]
d = S(state, 1440); m = S(state, 375)
if "rows" in m and m.get("rows") == d.get("rows"): m.pop("rows"); m["rowsFromDesktop"] = True
d["id"] = m["id"] = bid
import os
DEF = json.load(open("tools/figma/rap/out/rows-default.json")) if os.path.exists("tools/figma/rap/out/rows-default.json") else None
if bid == "rap-01": json.dump(d["rows"], open("tools/figma/rap/out/rows-default.json", "w"), ensure_ascii=False)
elif DEF is not None:
    for o in (d, m):
        if o.get("rows") == DEF: o.pop("rows"); o.pop("rowsFromDesktop", None); o["rowsRef"] = "default"
B = {"id": bid, "title": title, "note": note + "\n" + US}
if link: B["link"] = link
BASE_D = {"h1":"Registrul actelor permisive","sub":"Urmărește dosarele depuse pentru acte permisive și interacționează cu autoritățile.","search":{"value":"","placeholder":"Caută după nr. dosar sau denumire"},"filter":{"expanded":False,"count":None,"hidden":False},"summary":"Showing 1 to 16 of 1567 results","pageSize":"16","pages":[{"t":"Previous","active":False,"disabled":True},{"t":"1","active":True,"disabled":False},{"t":"2","active":False,"disabled":False},{"t":"3","active":False,"disabled":False},{"t":"4","active":False,"disabled":False},{"t":"5","active":False,"disabled":False},{"t":"Next","active":False,"disabled":False}],"view":"list","docH":1342,"rowsRef":"default"}
BASE_M = {"h1":"Registrul actelor permisive","sub":"Urmărește dosarele depuse pentru acte permisive și interacționează cu autoritățile.","search":{"value":"","placeholder":"Caută după nr. dosar sau denumire"},"filter":{"expanded":False,"count":None,"hidden":True},"bar":{"sheets":True,"chips":[{"all":True,"label":"Filtre","n":"","sel":False,"open":False},{"all":False,"label":"Statut","n":"","sel":False,"open":False},{"all":False,"label":"Denumire act","n":"","sel":False,"open":False},{"all":False,"label":"Autoritate","n":"","sel":False,"open":False},{"all":False,"label":"Tip beneficiar","n":"","sel":False,"open":False}],"meta":[]},"summary":None,"pageSize":None,"pages":[{"t":"Previous","active":False,"disabled":True},{"t":"Next","active":False,"disabled":False}],"view":"list","docH":1434,"rowsRef":"default"}
base = None
if d.get("view") in ("profile", "notfound"):
    for k in list(m.keys()):
        if k != "id" and k in d and m[k] == d[k]: m.pop(k)
    m["fromD"] = True
if d.get("view") == "list":
    base = "list"
    for o, B0 in ((d, BASE_D), (m, BASE_M)):
        for k in list(o.keys()):
            if k in B0 and o[k] == B0[k]: o.pop(k)
col = "col03" if bid == "rap-01g" else ("col02" if bid.startswith("rap-02") else "col01")
out = {"col": col, "B": B, "d": d, "m": m}
if bid.startswith("rap-04"): out["d"] = {"skip": True}; m.pop("rowsFromDesktop", None); m["rowsRef"] = "default"
if base: out["base"] = base
print(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
