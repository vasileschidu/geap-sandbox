"""Act row swap spec from the code measurements (measure-act-rows.mjs → measure.json).
Usage: python3 tools/figma/act-row/build-spec.py <measure.json> > spec.json
One entry per demo state: rows in screen order = [title, tag, tone, [meta parts], notice|None, menu|None];
notice = [bold, rest]; menu = [width, [[label, icon, disabled(0/1), reason]]]."""
import json, sys
TONE = {"success": "Success", "accent": "Accent", "neutral": "Neutral", "danger": "Danger", "warning": "Warning", "brand": "Brand"}
d = json.load(open(sys.argv[1]))
out = {}
for key, v in d.items():
    st = key.split("@")[0]
    rows = []
    for r in v["rows"]:
        cls = r["tag"][1].split()
        tone = next((TONE[c.split("--")[1]] for c in cls if c.startswith("status-tag--") and c.split("--")[1] in TONE), "Neutral")
        notice = None
        if r["pending"]:
            txt = " ".join(r["pending"][0].split())
            i = txt.find(" în curs")
            notice = [txt[: i + 8], txt[i + 8 :]] if i > 0 else ["", txt]
        menu = None
        if r["menu"]:
            menu = [round(r["menu"][0][2]), [[it[0], it[1], 1 if it[2] == "true" else 0, it[3]] for it in r["menu"][2]]]
        rows.append([" ".join(r["title"][0].split()), r["tag"][0].strip(), tone, [" ".join(p[0].split()) for p in r["meta"][1]], notice, menu])
    nc = v.get("newCard")
    out[st] = {"rows": rows, "new": nc[2].split("\n") if nc else None, "subject": v["subject"][1].split("\n") if v.get("subject") else None}
json.dump(out, sys.stdout, ensure_ascii=False, separators=(",", ":"))
