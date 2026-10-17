# compact.py <spec.json> <state>@<width> [id] → the S object the Figma list/profile builders take
import json, sys
d = json.load(open(sys.argv[1])); k = sys.argv[2]; v = d[k]; sid = sys.argv[3] if len(sys.argv) > 3 else k.split('@')[0]
S = {"id": sid}
if v["view"] == "list":
    S.update(h1=v["h1"], sub=v["sub"], search={"value": v["search"]["value"], "placeholder": v["search"]["placeholder"]},
             filter={"expanded": v["filterBtn"]["expanded"] == "true", "count": v["filterBtn"]["count"], "hidden": v["filterBtn"].get("hidden", False)})
    if v.get("tooltip"): S["tooltip"] = v["tooltip"]
    if v.get("sheet"): S["sheet"] = v["sheet"]
    if v.get("bar"): S["bar"] = {"sheets": v["bar"].get("sheets", False), "chips": [{k2: c.get(k2) for k2 in ("all", "label", "n", "sel", "open")} for c in v["bar"]["chips"]], "meta": [{"k": m["k"], "t": m["t"]} for m in v["bar"]["meta"]]}
    if v.get("pop"): S["pop"] = {"label": v["pop"]["label"], "rect": v["pop"]["rect"], "search": v["pop"].get("search"), "options": v["pop"]["options"], "buttons": v["pop"]["buttons"]}
    if v.get("company"): S["company"] = {k2: v["company"][k2] for k2 in ("name", "idType", "id", "metrics")}
    if v.get("rows"):
        S["rows"] = []
        for r in v["rows"]:
            o = {k2: r.get(k2) for k2 in ("person", "name", "ident", "masked", "act", "code", "auth", "nr", "dosar", "until", "issued", "hover")}
            tags = r.get("tags") or [[r.get("status"), r.get("tone")]]
            o["status"] = tags[0][0].split(", ")[-1]; o["tone"] = tags[0][1]
            if len(tags) > 1: o["tacit"] = True
            S["rows"].append({k2: x for k2, x in o.items() if x not in (False, None)})
        S["summary"] = v.get("summary"); S["pageSize"] = v.get("pageSize"); S["pages"] = v.get("pages")
    if v.get("empty") and not v.get("rows"): S["empty"] = {k2: v["empty"][k2] for k2 in ("title", "text", "action")}
elif v["view"] == "profile":
    TONE = {"success": "Success", "warning": "Warning", "neutral": "Neutral", "danger": "Danger", "info": "Info"}
    def fix(o):
        o = dict(o)
        for suf in ("Aprobare tacită", "Aprobat tacit"):
            if o.get("value", "").endswith(suf) and o["value"] != suf: o["value"] = o["value"][: -len(suf)].strip(); o["tacit"] = True
        if o.get("tag"): o["tone"] = TONE.get(o["tag"], "Neutral"); o["tag"] = True
        if o.get("label") in ("Telefon", "E-mail"): o["link"] = True
        return {k: v2 for k, v2 in o.items() if v2 not in (False, None) and k not in ("rect", "rowStart")}
    S.update(h1=v["h1"], crumbs=v["crumbs"], meta=[fix(m) for m in v["meta"]],
             benef={k2: v["benef"][k2] for k2 in ("person", "name", "idType", "id", "copy", "acts")},
             sections=[{"title": s["title"], "rows": [fix(r) for r in s["rows"]]} for s in v["sections"]],
             button=v["button"]["t"])
else:
    S.update(empty={k2: v["empty"][k2] for k2 in ("title", "text", "action")})
S["view"] = v["view"]; S["docH"] = v["docH"]
print(json.dumps(S, ensure_ascii=False, separators=(",", ":")))
