#!/usr/bin/env python3
"""Component audit → one shareable HTML page (served on the sandbox, no artifact).

Usage: python3 tools/ui-qa/component-audit-html.py <audit dir>
The dir holds report-after.json (+ optional report-before.json) and decisions.json (the per-control
proposals); writes <dir>/index.html. Styles = the prototype's own tokens (css/main.css + Onest).
"""
import collections, html, json, os, sys

D = sys.argv[1]
after = json.load(open(os.path.join(D, "report-after.json")))
before_p = os.path.join(D, "report-before.json")
before = json.load(open(before_p)) if os.path.exists(before_p) else None
decisions = json.load(open(os.path.join(D, "decisions.json")))
depth = "../" * (os.path.normpath(D).count(os.sep) + 1)
e = lambda s: html.escape(str(s))

AREA = lambda st: "Front office" if st.startswith("fo-") else "EVO Cabinet" if st.startswith(("pp-", "sm-")) else "RAP" if st.startswith("rap-") else "Other"
VP = {"desktop": "1440", "mobile": "375", "edge": "760"}

def size_majors(rep):
    c = collections.Counter()
    for key, v in rep["states"].items():
        st, vp = key.split("/")
        for f in v.get("findings", []):
            if f["severity"] == "major" and f["rule"] != "non-library-control":
                c[(AREA(st), vp)] += 1
    return c

sa, sb = size_majors(after), size_majors(before) if before else collections.Counter()

groups = collections.OrderedDict()
for key, v in after["states"].items():
    st, vp = key.split("/")
    for f in v.get("findings", []):
        cls = f["measured"].split("> ", 1)[-1].strip()
        g = groups.setdefault((AREA(st), cls), {"rule": f["rule"], "sev": f["severity"], "text": f.get("text", ""), "states": set(), "vps": set()})
        g["states"].add(st); g["vps"].add(vp)

def tag(text, tone):
    return f'<span class="ca-tag ca-tag--{tone}">{e(text)}</span>'

def state_link(st):
    page = "rap-evo/index.html" if st.startswith("rap-") else "cabinet-evo/index.html" if st.startswith(("pp-", "sm-")) else "e-permits-acte-permisive.html"
    return f'<a href="{depth}{page}?state={e(st)}" target="_blank" rel="noopener">{e(st)}</a>'

areas = ["Front office", "EVO Cabinet", "RAP"]
result_rows = ""
for a in areas:
    n_types = sum(1 for (ar, _), g in groups.items() if ar == a and g["rule"] == "non-library-control")
    cells = "".join(f'<td><span class="ca-muted">{sb[(a, vp)]}</span> → <strong>{sa[(a, vp)]}</strong></td>' for vp in ("mobile", "edge"))
    result_rows += f"<tr><th scope=row>{e(a)}</th>{cells}<td><strong>{n_types}</strong></td></tr>"

dec_html = ""
for a in areas:
    rows = ""
    for d in [d for d in decisions if d["area"] == a]:
        g_states = set()
        for cls in d["classes"]:
            for (ar, c), g in groups.items():
                if ar == a and cls in c:
                    g_states |= g["states"]
        tone = {"swap": "brand", "document": "neutral", "decide": "warning", "check": "neutral"}[d["proposal"]]
        label = {"swap": "Swap to library", "document": "Document as product", "decide": "Your decision", "check": "Check"}[d["proposal"]]
        links = ", ".join(state_link(s) for s in sorted(g_states)[:4]) + (f' <span class="ca-muted">+{len(g_states)-4}</span>' if len(g_states) > 4 else "")
        rows += (f'<tr><td><strong>{e(d["control"])}</strong><div class="ca-code">{e(" · ".join(d["classes"]))}</div></td>'
                 f'<td>{e(d["where"])}</td><td>{e(d["library"])}</td><td>{tag(label, tone)}<div class="ca-note">{e(d["note"])}</div></td><td>{links}</td></tr>')
    if rows:
        dec_html += f'<h3>{e(a)}</h3><div class="ca-scroll"><table><thead><tr><th>Control</th><th>Where</th><th>Closest library component</th><th>Proposal</th><th>Demo states</th></tr></thead><tbody>{rows}</tbody></table></div>'

per_state = ""
by_state = collections.OrderedDict()
for key, v in after["states"].items():
    st, vp = key.split("/")
    by_state.setdefault(st, {})[vp] = v
for st, vps in by_state.items():
    cells, seen, items = "", set(), ""
    for vp in ("desktop", "mobile", "edge"):
        v = vps.get(vp)
        if not v:
            cells += "<td>–</td>"; continue
        a = sum(1 for f in v.get("findings", []) if f["severity"] == "major")
        b = sum(1 for f in (before["states"].get(f"{st}/{vp}", {}).get("findings", []) if before else []) if f["severity"] == "major")
        cells += f'<td>{"<span class=ca-muted>" + str(b) + "</span> → " if b != a else ""}<strong>{a}</strong></td>'
        for f in v.get("findings", []):
            k = (f["measured"], f["rule"])
            if k in seen: continue
            seen.add(k)
            items += f'<li>{tag(f["severity"], "danger" if f["severity"]=="major" else "neutral")} <span class="ca-code">{e(f["measured"])}</span> <span class="ca-muted">„{e(f.get("text","")[:60])}”</span></li>'
    detail = f'<details><summary>{len(seen)} control{"s" if len(seen)!=1 else ""}</summary><ul class="ca-list">{items}</ul></details>' if seen else '<span class="ca-muted">none</span>'
    per_state += f"<tr><th scope=row>{state_link(st)}</th>{cells}<td>{detail}</td></tr>"
per_state = f'<div class="ca-scroll"><table><thead><tr><th>State</th><th>1440</th><th>375</th><th>760</th><th>Flagged controls</th></tr></thead><tbody>{per_state}</tbody></table></div>'

fixed = "".join(f"<li>{x}</li>" for x in [
    "<strong>Telefon read-only field</strong> (Date solicitant): text 14 → 16px, check icon 20 → 24px, same as Email.",
    "<strong>Front office phone field rules</strong> applied only up to 720px — now up to 760, so fields 721–760 wide are 48px instead of 40.",
    "<strong>CAEM / subgenre list searches and „Caută fișier”</strong> (document picker): 40 → 48px, 16px text, 24px icon.",
    "<strong>Address, cadastral, Cabinet and RAP searches</strong>: the library 24px search icon at the 48px size.",
])

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Component audit · {e(after["generated"][:10])}</title>
<link rel="stylesheet" href="{depth}assets/fonts/Onest.css">
<link rel="stylesheet" href="{depth}css/main.css">
<style>
  body {{ background: var(--color-background-base-secondary, #f6f6f6); color: var(--color-text-base-default, #121212); font-family: var(--font-family-primary-font, Onest), sans-serif; margin: 0; }}
  .ca {{ box-sizing: border-box; margin: 0 auto; max-width: 1120px; padding: var(--spacing-48, 48px) var(--spacing-24, 24px) var(--spacing-64, 64px); }}
  .ca h1 {{ font-size: var(--font-size-fs-32, 32px); line-height: var(--line-height-lh-40, 40px); font-weight: 600; letter-spacing: -0.32px; margin: 0; }}
  .ca h2 {{ font-size: var(--font-size-fs-20, 20px); line-height: var(--line-height-lh-28, 28px); font-weight: 600; margin: 0 0 var(--spacing-16, 16px); }}
  .ca h3 {{ font-size: var(--font-size-fs-16, 16px); line-height: var(--line-height-lh-24, 24px); font-weight: 600; margin: var(--spacing-24, 24px) 0 var(--spacing-8, 8px); }}
  .ca p, .ca li {{ font-size: var(--font-size-fs-14, 14px); line-height: var(--line-height-lh-20, 20px); }}
  .ca-lead {{ color: var(--color-text-base-secondary, #383838); margin: var(--spacing-8, 8px) 0 0; max-width: 720px; }}
  .ca-meta {{ display: flex; flex-wrap: wrap; gap: var(--spacing-8, 8px); margin-top: var(--spacing-16, 16px); }}
  .ca-card {{ background: var(--color-background-base-default, #fff); border: var(--border-width-1, 1px) solid var(--color-border-base-default, #d9d9d9); border-radius: var(--border-radius-16, 16px); margin-top: var(--spacing-24, 24px); padding: var(--spacing-24, 24px); }}
  .ca-kpis {{ display: grid; gap: var(--spacing-16, 16px); grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: var(--spacing-24, 24px); }}
  .ca-kpi {{ background: var(--color-background-base-default, #fff); border: var(--border-width-1, 1px) solid var(--color-border-base-default, #d9d9d9); border-radius: var(--border-radius-16, 16px); padding: var(--spacing-16, 16px) var(--spacing-24, 24px); }}
  .ca-kpi strong {{ display: block; font-size: var(--font-size-fs-32, 32px); line-height: var(--line-height-lh-40, 40px); font-weight: 600; }}
  .ca-kpi span {{ color: var(--color-text-base-secondary, #383838); font-size: var(--font-size-fs-14, 14px); }}
  .ca-scroll {{ overflow-x: auto; }}
  .ca table {{ border-collapse: collapse; font-size: var(--font-size-fs-14, 14px); line-height: var(--line-height-lh-20, 20px); width: 100%; }}
  .ca th, .ca td {{ border-bottom: var(--border-width-1, 1px) solid var(--color-border-base-default, #d9d9d9); padding: var(--spacing-12, 12px) var(--spacing-12, 12px) var(--spacing-12, 12px) 0; text-align: left; vertical-align: top; }}
  .ca thead th {{ color: var(--color-text-base-secondary, #383838); font-weight: 500; }}
  .ca tbody tr:last-child > * {{ border-bottom: 0; }}
  .ca-code {{ color: var(--color-text-base-secondary, #383838); font-size: var(--font-size-fs-14, 14px); margin-top: var(--spacing-4, 4px); overflow-wrap: anywhere; }}
  .ca-note {{ color: var(--color-text-base-secondary, #383838); margin-top: var(--spacing-4, 4px); }}
  .ca-muted {{ color: var(--color-text-base-tertiary, #757575); }}
  .ca a {{ color: var(--color-text-brand-default, #0058d2); }}
  .ca-tag {{ border: var(--border-width-1, 1px) solid; border-radius: var(--border-radius-4, 4px); display: inline-block; font-size: var(--font-size-fs-14, 14px); font-weight: 500; line-height: var(--line-height-lh-20, 20px); padding: 0 var(--spacing-8, 8px); white-space: nowrap; }}
  .ca-tag--brand {{ background: var(--color-background-brand-secondary, #e6eefa); border-color: var(--color-border-brand-secondary, #b3cdf2); color: var(--color-text-brand-default, #0058d2); }}
  .ca-tag--warning {{ background: var(--color-background-warning-secondary, #fef0c7); border-color: var(--color-border-warning-secondary, #fedf89); color: var(--color-text-warning-default, #b54708); }}
  .ca-tag--danger {{ background: var(--color-background-danger-secondary, #fee4e2); border-color: var(--color-border-danger-secondary, #fecdca); color: var(--color-text-danger-default, #b42318); }}
  .ca-tag--neutral {{ background: var(--color-background-base-secondary, #f6f6f6); border-color: var(--color-border-base-default, #d9d9d9); color: var(--color-text-base-secondary, #383838); }}
  .ca summary {{ cursor: pointer; font-size: var(--font-size-fs-14, 14px); }}
  .ca-list {{ display: flex; flex-direction: column; gap: var(--spacing-8, 8px); list-style: none; margin: var(--spacing-12, 12px) 0 0; padding: 0; }}
  .ca-run {{ background: var(--color-background-base-secondary, #f6f6f6); border-radius: var(--border-radius-8, 8px); font-size: var(--font-size-fs-14, 14px); overflow-x: auto; padding: var(--spacing-16, 16px); white-space: pre; }}
  @media (max-width: 760px) {{
    .ca {{ padding: var(--spacing-32, 32px) var(--spacing-16, 16px) var(--spacing-48, 48px); }}
    .ca h1 {{ font-size: 28px; line-height: 36px; }}
    .ca-kpis {{ grid-template-columns: minmax(0, 1fr); }}
    .ca-card {{ border-radius: var(--border-radius-12, 12px); padding: var(--spacing-16, 16px); }}
    .ca table {{ min-width: 640px; }}
  }}
</style>
</head>
<body>
<main class="ca">
  <h1>Component audit</h1>
  <p class="ca-lead">Do the GEAP prototype screens use only library components, and are form fields the right size: 40px on desktop, 48px with 16px text on phones?</p>
  <div class="ca-meta">{tag(after["generated"][:10], "neutral")} {tag("27 demo states", "neutral")} {tag("1440 · 375 · 760", "neutral")} {tag("Front office · EVO Cabinet · RAP", "neutral")}</div>

  <div class="ca-kpis">
    <div class="ca-kpi"><strong>{sum(sb.values())} → {sum(sa.values())}</strong><span>phone size problems (all areas)</span></div>
    <div class="ca-kpi"><strong>{sum(1 for g in groups.values() if g["rule"] == "non-library-control")}</strong><span>non-library control types still open</span></div>
    <div class="ca-kpi"><strong>{len(after["states"])}</strong><span>screens measured (state × width)</span></div>
  </div>

  <section class="ca-card">
    <h2>Result by area</h2>
    <div class="ca-scroll"><table>
      <thead><tr><th>Area</th><th>Size problems, 375</th><th>Size problems, 760</th><th>Non-library control types</th></tr></thead>
      <tbody>{result_rows}</tbody>
    </table></div>
  </section>

  <section class="ca-card">
    <h2>Fixed</h2>
    <p class="ca-muted">Phones only; desktop unchanged.</p>
    <ul>{fixed}</ul>
  </section>

  <section class="ca-card">
    <h2>Open: controls that are not library components</h2>
    <p class="ca-muted">Listed, not changed. Each needs a decision: swap to the library component, or keep it and document it as a product component.</p>
    {dec_html}
  </section>

  <section class="ca-card">
    <h2>Every screen</h2>
    <p class="ca-muted">Major findings per width, before → after (non-library controls + size problems). The state opens the prototype; open „controls” for the list.</p>
    {per_state}
  </section>

  <section class="ca-card">
    <h2>How it is checked</h2>
    <p>Tool <span class="ca-code">tools/ui-qa/component-audit.mjs</span>, allow-list <span class="ca-code">tools/ui-qa/specs/component-audit.json</span>, agent <span class="ca-code">.claude/agents/component-auditor.md</span>. It runs with the code QA on every UI change. This page: <span class="ca-code">python3 tools/ui-qa/component-audit-html.py {e(D)}</span>.</p>
    <div class="ca-run">node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs --states fo-02,pp-01,rap-01 --out tools/ui-qa/out/components</div>
  </section>
</main>
</body>
</html>
"""
open(os.path.join(D, "index.html"), "w").write(page)
print("wrote", os.path.join(D, "index.html"))
