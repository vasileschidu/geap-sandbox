# payload_modal.py <state> → {B, d, m, kind} for the modal column (profile behind + data / document modal)
import json, subprocess, sys
SPEC = "tools/figma/rap/out/spec.json"
US = "\nAzure: US-139 91135 · US-140 91136 · US-141 91137 · US-142 91140 · US-143 91141 · US-145 91143 · US-162 91373"
B = {
 "rap-03": ("„Vizualizare act” · data modal", "„Vezi act permisiv” opens the BO detail modal (library modal Medium, title „Vizualizare act” + subtitle = the act name only (no act number in the header; it stays in Date generale)): Date generale (authority, office, beneficiary, act number, Stare, dates) and Câmpuri specifice actului (the act's public, service-configured fields), read-only note, footer „Descarcă” (export icon — arrow into a tray) · „Închide”. Matches the existing EVO design 20607:34846. Stories: US-162 AC-12, US-163."),
 "rap-03g": ("Data modal · long name (collapsed)", "A long act name in the subtitle is clamped to 1 line (2 on phones) and becomes a toggle with „Mai mult”. Stories: US-162."),
 "rap-03h": ("Data modal · long name (expanded)", "„Mai mult” expands the whole name in the header („Mai puțin” collapses it); the body scrolls. Stories: US-162."),
 "rap-03i": ("Data modal · many fields (first 8)", "30 service-configured fields in 3 form sections: the first 8 rows (with their section heading) + „Arată toate câmpurile (30)” (text button). The demo scrolls the body to the toggle. Stories: US-162 / US-163, US-221."),
 "rap-03j": ("Data modal · many fields (all)", "After „Arată toate câmpurile (30)”: all 30 fields by form section (Datele economice ale unității · Genul de activitate · Suprafața/Volumul/Capacitatea), toggle „Arată mai puține câmpuri”. In code the body scrolls; Figma shows the whole content. Stories: US-162 / US-163."),
 "rap-03m": ("Data modal · tacit approval, person", "PF act with Aprobare tacită: Beneficiar = the anonymised name, „Data aprobării tacite” row (date + blue badge) before „Data eliberării”; no IDNP anywhere (US-145). Stories: US-162 AC-08, US-145."),
 "rap-03n": ("Data modal · Suspendat", "Suspendat: amber tag in Stare, „Data suspendării actului permisiv” and „Suspendat până la data de” in date order before „Data expirării” (US-162 AC-17). Stories: US-162."),
 "rap-03o": ("Data modal · Retras", "Retras: red tag, „Data retragerii actului permisiv” before „Data expirării” (US-162 AC-17); this act has no public specific fields → only Date generale + note. Stories: US-162."),
 "rap-03a": ("Printable form · generating", "„Descarcă” closes the data modal and opens the document modal „Forma de tipar a actului”: MDocs generates the act on demand — spinner + „Se generează documentul” / „MDocs pregătește actul. Poate dura câteva secunde.”; only „Închide”; „Vezi act permisiv” is aria-disabled meanwhile (AC-03). Stories: US-143."),
 "rap-03l": ("Printable form · valid act (A4)", "The MDocs A4 form zoomed to the canvas: arms, REPUBLICA MOLDOVA, authority + office, act name, number + date, table (beneficiary + IDNO, the act's fields by form section, dates, dossier, printed series), closing text, signature line (MSign) + QR with the permanent link, footer „Generat prin MDocs … · Pagina 1 din 1”; footer „Imprimă” · „Închide”. Stories: US-143."),
 "rap-03k": ("Printable form · 3 pages", "A long act (30 fields) continues on more A4 pages: same shell, „… · continuare” line on top, the closing text + signature on the last page, „Pagina k din n” in every footer (3 pages desktop; the canvas scrolls). Stories: US-143."),
 "rap-03b": ("Printable form · Suspendat watermark", "A status other than Valabil prints the status word across the page (amber SUSPENDAT, 16 % opacity, −35°) — AC-14. Stories: US-143."),
 "rap-03f": ("Printable form · Retras watermark", "Retras = red RETRAS watermark (Expirat / Anulat red too — US-162 AC-07). Stories: US-143."),
 "rap-03e": ("Printable form · person, anonymised", "PF act: the page shows only the anonymised name „S. V***”, never an IDNP (US-145). Stories: US-143, US-145."),
 "rap-03c": ("Printable form · MDocs unavailable", "MDocs down (AC-10): bare empty state with the error icon „Documentul nu poate fi generat momentan” + „Vă rugăm să încercați mai târziu.”; only „Închide”. Stories: US-143 AC-10."),
 "rap-03d": ("Printable form · RAP data unavailable", "RAP API down (AC-11): „Datele actului nu sunt disponibile momentan” + „Vă rugăm să încercați mai târziu.”; only „Închide”. Stories: US-143 AC-11."),
}
def C(st, w): return json.loads(subprocess.check_output(["python3", "tools/figma/rap/compact.py", SPEC, f"{st}@{w}", st]))
st = sys.argv[1]; title, note = B[st]
spec = json.load(open(SPEC))
out = {"col": "col04", "B": {"id": st, "title": title, "note": note + US}}
for w, k in ((1440, "d"), (375, "m")):
    v = spec[f"{st}@{w}"]; prof = C(st, w); prof["id"] = st
    o = {"profile": prof, "id": st}
    if v.get("dataModal"):
        dm = v["dataModal"]; out["kind"] = "data"
        o["data"] = {k2: dm[k2] for k2 in ("title", "number", "name", "clamp", "more", "note")}
        o["data"]["sections"] = [{"title": s["title"], "items": [{kk: vv for kk, vv in it.items() if vv not in (False, [], None)} for it in s["items"]]} for s in dm["sections"]]
        for s in o["data"]["sections"]:
            for it in s["items"]:
                if it.get("label") == "Data aprobării tacite": it["tacit"] = True; it.pop("tag", None); it["value"] = it["value"].replace("Aprobare tacită", "").strip()
    else:
        am = v["docModal"]; out["kind"] = "doc"
        o["doc"] = {k2: am[k2] for k2 in ("title", "number", "name", "loading", "state")}
        o["doc"]["pages"] = [{k2: p[k2] for k2 in ("wm", "wmTone", "cont", "country", "authority", "office", "h1", "number", "rows", "closing", "sign", "qr", "footer") if p.get(k2)} for p in am["pages"]]
    out[k] = o
if out["m"]["profile"] == {**out["d"]["profile"], "crumbs": out["m"]["profile"]["crumbs"], "docH": out["m"]["profile"]["docH"]}:
    out["m"]["profile"] = {"crumbs": out["m"]["profile"]["crumbs"], "fromD": True}
for key in ("data", "doc"):
    if key in out["m"] and out["m"][key] == out["d"][key]: out["m"][key] = "fromD"
print(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
