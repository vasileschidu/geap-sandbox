#!/usr/bin/env python3
"""Component audit → one shareable HTML page (served on the sandbox, not an artifact).

Usage: python3 tools/ui-qa/component-audit-html.py <audit dir>
The dir holds report-after.json (+ optional report-before.json) and decisions.json (the per-control
proposals); writes <dir>/index.html. Self-contained page in the artifact look (own tokens, light + dark,
Google Fonts), so it can be shared outside the organisation without the claude.ai artifact viewer.
"""
import collections, html, json, os, sys

D = sys.argv[1]
after = json.load(open(os.path.join(D, "report-after.json")))
before_p = os.path.join(D, "report-before.json")
before = json.load(open(before_p)) if os.path.exists(before_p) else None
decisions = json.load(open(os.path.join(D, "decisions.json")))
depth = "../" * (os.path.normpath(D).count(os.sep) + 1)
e = lambda s: html.escape(str(s))
DATE = after["generated"][:10]

AREAS = ["Front office", "EVO Cabinet", "RAP"]
AREA = lambda st: "Front office" if st.startswith("fo-") else "EVO Cabinet" if st.startswith(("pp-", "sm-")) else "RAP" if st.startswith("rap-") else "Other"
VPS = [("desktop", "1440"), ("mobile", "375"), ("edge", "760")]


def size_majors(rep):
    c = collections.Counter()
    if not rep:
        return c
    for key, v in rep["states"].items():
        st, vp = key.split("/")
        for f in v.get("findings", []):
            if f["severity"] == "major" and f["rule"] != "non-library-control":
                c[(AREA(st), vp)] += 1
    return c


sa, sb = size_majors(after), size_majors(before)

groups = collections.OrderedDict()
for key, v in after["states"].items():
    st, vp = key.split("/")
    for f in v.get("findings", []):
        cls = f["measured"].split("> ", 1)[-1].strip()
        g = groups.setdefault((AREA(st), cls), {"rule": f["rule"], "states": set()})
        g["states"].add(st)
open_types = sum(1 for g in groups.values() if g["rule"] == "non-library-control")


def state_href(st):
    page = "rap-evo/index.html" if st.startswith("rap-") else "cabinet-evo/index.html" if st.startswith(("pp-", "sm-")) else "e-permits-acte-permisive.html"
    return f"{depth}{page}?state={st}"


def state_link(st):
    return f'<a class="state" href="{e(state_href(st))}" target="_blank" rel="noopener">{e(st)}</a>'


PROPOSAL = {
    "swap": ("Swap to library", "accent"),
    "document": ("Document as product", "neutral"),
    "decide": ("Your decision", "warn"),
    "check": ("Check", "neutral"),
}

# ---- sections ----
area_rows = ""
for a in AREAS:
    n_types = sum(1 for (ar, _), g in groups.items() if ar == a and g["rule"] == "non-library-control")
    cells = ""
    for vp in ("mobile", "edge"):
        b, n = sb[(a, vp)], sa[(a, vp)]
        cells += f'<td class="num"><span class="was">{b}</span><span class="arrow" aria-hidden="true">→</span><span class="now ok">{n}</span></td>'
    area_rows += f'<tr><th scope="row">{e(a)}</th>{cells}<td class="num"><span class="now">{n_types}</span></td></tr>'

decide_html = ""
for a in AREAS:
    items = [d for d in decisions if d["area"] == a]
    if not items:
        continue
    rows = ""
    for d in items:
        sts = set()
        for cls in d["classes"]:
            for (ar, c), g in groups.items():
                if ar == a and cls in c:
                    sts |= g["states"]
        label, tone = PROPOSAL[d["proposal"]]
        links = " ".join(state_link(s) for s in sorted(sts)[:4])
        if len(sts) > 4:
            links += f' <span class="muted">+{len(sts) - 4}</span>'
        note = f'<p class="note">{e(d["note"])}</p>' if d.get("note") else ""
        rows += (
            f'<tr><td><strong>{e(d["control"])}</strong><p class="cls">{e(" · ".join(c.lstrip(".") for c in d["classes"]))}</p></td>'
            f'<td>{e(d["where"])}</td><td>{e(d["library"])}</td>'
            f'<td><span class="pill pill--{tone}">{e(label)}</span>{note}</td><td class="links">{links}</td></tr>'
        )
    decide_html += (
        f'<h3>{e(a)}</h3><div class="scroll"><table class="decide"><thead><tr><th>Control</th><th>Where</th>'
        f'<th>Closest library component</th><th>Proposal</th><th>Demo states</th></tr></thead><tbody>{rows}</tbody></table></div>'
    )

by_state = collections.OrderedDict()
for key, v in after["states"].items():
    st, vp = key.split("/")
    by_state.setdefault(st, {})[vp] = v
screen_rows = ""
for st, vps in by_state.items():
    cells, seen, items = "", set(), ""
    for vp, _w in VPS:
        v = vps.get(vp)
        if not v:
            cells += '<td class="num muted">–</td>'
            continue
        n = sum(1 for f in v.get("findings", []) if f["severity"] == "major")
        b = sum(1 for f in (before["states"].get(f"{st}/{vp}", {}).get("findings", []) if before else []) if f["severity"] == "major")
        was = f'<span class="was">{b}</span><span class="arrow" aria-hidden="true">→</span>' if b != n else ""
        cells += f'<td class="num">{was}<span class="now">{n}</span></td>'
        for f in v.get("findings", []):
            k = (f["measured"], f["rule"])
            if k in seen:
                continue
            seen.add(k)
            sev = "bad" if f["severity"] == "major" else "neutral"
            items += f'<li><span class="pill pill--{sev}">{e(f["severity"])}</span><span class="cls">{e(f["measured"])}</span><span class="muted">„{e(f.get("text", "")[:60])}”</span></li>'
    detail = (f'<details><summary>{len(seen)} control{"s" if len(seen) != 1 else ""}</summary><ul class="flags">{items}</ul></details>'
              if seen else '<span class="muted">none</span>')
    screen_rows += f'<tr><th scope="row">{state_link(st)}</th>{cells}<td>{detail}</td></tr>'

fixed = [
    ("Telefon read-only field", "Date solicitant: text 14 → 16px, check icon 20 → 24px, the same as Email."),
    ("Phones 721–760px wide", "The front office field rules stopped at 720px. They now apply up to 760, so these fields are 48px instead of 40."),
    ("List and picker searches", "CAEM / subgenre list search and „Caută fișier”: 40 → 48px, 16px text, 24px icon."),
    ("Search icons", "Address, cadastral, Cabinet and RAP searches use the library 24px icon at the 48px size."),
]
fixed_html = "".join(f"<li><strong>{e(t)}</strong><span>{e(d)}</span></li>" for t, d in fixed)

total_b, total_a = sum(sb.values()), sum(sa.values())

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>GEAP Component Audit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Which GEAP prototype controls are library components, and whether form fields are 40px on desktop and 48px on phones.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap">
<style>
/* Layout: one 1040px reading column — verdict strip, then the decisions table as the working core, the per-screen ledger last */
:root {{
  --bg: #f5f6f8;
  --surface: #ffffff;
  --fg: #14171c;
  --muted: #5d6573;
  --line: #dde1e7;
  --accent: #0b57c9;
  --accent-soft: #e7effb;
  --ok: #157a46;
  --ok-soft: #e4f4ea;
  --warn: #9a5b00;
  --warn-soft: #fdf1dc;
  --bad: #b42318;
  --bad-soft: #fde8e6;
  --font-display: "Bricolage Grotesque", "Onest", system-ui, sans-serif;
  --font-body: "Onest", system-ui, -apple-system, "Segoe UI", sans-serif;
  color-scheme: light;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --bg: #0f1216; --surface: #171b21; --fg: #e9ecf1; --muted: #9aa3b2; --line: #2a303a;
    --accent: #7fb0ff; --accent-soft: #16243b; --ok: #5fd08f; --ok-soft: #12291c;
    --warn: #f0b45a; --warn-soft: #2e2312; --bad: #ff8a80; --bad-soft: #351a18;
    color-scheme: dark;
  }}
}}
:root[data-theme="dark"] {{
  --bg: #0f1216; --surface: #171b21; --fg: #e9ecf1; --muted: #9aa3b2; --line: #2a303a;
  --accent: #7fb0ff; --accent-soft: #16243b; --ok: #5fd08f; --ok-soft: #12291c;
  --warn: #f0b45a; --warn-soft: #2e2312; --bad: #ff8a80; --bad-soft: #351a18;
  color-scheme: dark;
}}
* {{ box-sizing: border-box; }}
body {{ background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--font-body); margin: 0; }}
[hidden] {{ display: none !important; }}
.page {{ margin: 0 auto; max-width: 1040px; padding-block: 48px 72px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
.eyebrow {{ color: var(--muted); font-size: 12px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; margin: 0; }}
h1 {{ font: 700 clamp(30px, 5vw, 44px)/1.08 var(--font-display); letter-spacing: -.02em; margin: 8px 0 0; text-wrap: balance; }}
h2 {{ font: 600 22px/1.25 var(--font-display); letter-spacing: -.01em; margin: 0; text-wrap: balance; }}
h3 {{ font-size: 15px; font-weight: 600; margin: 24px 0 8px; }}
.lead {{ color: var(--muted); font-size: 17px; margin: 12px 0 0; max-width: 62ch; }}
.facts {{ display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 20px 0 0; padding: 0; list-style: none; color: var(--muted); font-size: 14px; }}
.facts b {{ color: var(--fg); font-weight: 500; }}
.verdict {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-block: 1px solid var(--line); }}
.verdict > div {{ padding: 20px 20px 20px 0; min-width: 0; }}
.verdict > div + div {{ border-left: 1px solid var(--line); padding-left: 20px; }}
.big {{ font: 600 36px/1.1 var(--font-display); font-variant-numeric: tabular-nums; letter-spacing: -.02em; }}
.big .was {{ color: var(--muted); font-size: 24px; }}
.big .ok {{ color: var(--ok); }}
.verdict p {{ color: var(--muted); font-size: 14px; margin: 6px 0 0; }}
section {{ display: grid; gap: 12px; min-width: 0; }}
section > .sub {{ color: var(--muted); margin: 0; max-width: 70ch; }}
.scroll {{ overflow-x: auto; min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 14px; }}
th, td {{ padding: 12px 16px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }}
thead th {{ color: var(--muted); font-size: 12px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }}
tbody tr:last-child > * {{ border-bottom: 0; }}
tbody th {{ font-weight: 500; }}
table.decide {{ min-width: 860px; }}
table.ledger {{ min-width: 620px; }}
.num {{ font-variant-numeric: tabular-nums; white-space: nowrap; }}
.was {{ color: var(--muted); }}
.arrow {{ color: var(--muted); padding: 0 6px; }}
.now {{ font-weight: 600; }}
.now.ok {{ color: var(--ok); }}
.cls {{ color: var(--muted); font-size: 13px; margin: 4px 0 0; overflow-wrap: anywhere; }}
.note {{ color: var(--muted); font-size: 13px; margin: 6px 0 0; }}
.muted {{ color: var(--muted); }}
.links {{ white-space: nowrap; }}
a {{ color: var(--accent); text-underline-offset: 2px; }}
a:focus-visible, summary:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }}
a.state {{ font-weight: 500; text-decoration: none; }}
a.state:hover {{ text-decoration: underline; }}
.pill {{ display: inline-block; border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 20px; padding: 0 10px; white-space: nowrap; }}
.pill--accent {{ background: var(--accent-soft); color: var(--accent); }}
.pill--warn {{ background: var(--warn-soft); color: var(--warn); }}
.pill--bad {{ background: var(--bad-soft); color: var(--bad); }}
.pill--neutral {{ background: var(--bg); color: var(--muted); box-shadow: inset 0 0 0 1px var(--line); }}
.toc {{ display: flex; flex-wrap: wrap; gap: 8px; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 2; background: var(--bg); padding-block: 12px; border-bottom: 1px solid var(--line); }}
.toc a {{ background: var(--surface); border: 1px solid var(--line); border-radius: 999px; color: var(--fg); font-size: 14px; font-weight: 500; padding: 6px 14px; text-decoration: none; }}
.toc a:hover {{ border-color: var(--accent); color: var(--accent); }}
section {{ scroll-margin-top: 72px; }}
.fixed {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }}
.fixed li {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: grid; gap: 4px; min-width: 0; }}
.fixed span {{ color: var(--muted); font-size: 14px; }}
details summary {{ cursor: pointer; color: var(--accent); font-weight: 500; }}
.flags {{ display: grid; gap: 8px; list-style: none; margin: 10px 0 0; padding: 0; }}
.flags li {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }}
.flags .cls {{ margin: 0; }}
.run {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; overflow-x: auto; font-size: 13px; white-space: pre; }}
footer {{ color: var(--muted); font-size: 13px; border-top: 1px solid var(--line); padding-top: 16px; }}
@media (max-width: 720px) {{
  .page {{ padding-block: 32px 56px; gap: 32px; }}
  .verdict {{ grid-template-columns: minmax(0, 1fr); }}
  .verdict > div {{ padding: 16px 0; }}
  .verdict > div + div {{ border-left: 0; border-top: 1px solid var(--line); padding-left: 0; }}
  .fixed {{ grid-template-columns: minmax(0, 1fr); }}
  th, td {{ padding: 10px 12px; }}
}}
@media (prefers-reduced-motion: reduce) {{ * {{ scroll-behavior: auto; }} }}
</style>
</head>
<body>
<main class="page">
  <header>
    <p class="eyebrow">GEAP 2.0 prototype · UI QA</p>
    <h1>Component audit</h1>
    <p class="lead">Do the screens use only library components, and are form fields the right size: 40px on desktop, and 48px with 16px text on phones?</p>
    <ul class="facts">
      <li><b>{e(DATE)}</b></li>
      <li><b>27</b> demo states</li>
      <li>widths <b>1440 · 375 · 760</b></li>
      <li>Front office · EVO Cabinet · RAP</li>
    </ul>
  </header>

  <div class="verdict" role="list">
    <div role="listitem"><div class="big"><span class="was">{total_b}</span> → <span class="ok">{total_a}</span></div><p>phone size problems, all areas</p></div>
    <div role="listitem"><div class="big">{open_types}</div><p>non-library control types still open</p></div>
    <div role="listitem"><div class="big">{len(after["states"])}</div><p>screens measured (state × width)</p></div>
  </div>

  <nav class="toc" aria-label="Contents">
    <a href="#h-open">1 · Decide</a><a href="#h-fixed">2 · Fixed</a><a href="#h-areas">3 · By area</a><a href="#h-screens">4 · Every screen</a><a href="#h-how">5 · How it is checked</a>
  </nav>

  <section aria-labelledby="h-open">
    <h2 id="h-open">1 · What needs your decision</h2>
    <p class="sub">Controls that are not library components. Nothing here is changed yet: each one is either swapped to the library component, or kept and documented as a product component.</p>
    {decide_html}
  </section>

  <section aria-labelledby="h-fixed">
    <h2 id="h-fixed">2 · Already fixed</h2>
    <p class="sub">Phones only. Desktop is unchanged.</p>
    <ul class="fixed">{fixed_html}</ul>
  </section>

  <section aria-labelledby="h-areas">
    <h2 id="h-areas">3 · Result by area</h2>
    <div class="scroll"><table>
      <thead><tr><th>Area</th><th>Size problems · 375</th><th>Size problems · 760</th><th>Non-library control types</th></tr></thead>
      <tbody>{area_rows}</tbody>
    </table></div>
  </section>

  <section aria-labelledby="h-screens">
    <h2 id="h-screens">4 · Every screen</h2>
    <p class="sub">Major findings per width, before → after: non-library controls plus size problems. A state opens the prototype on that screen.</p>
    <div class="scroll"><table class="ledger">
      <thead><tr><th>State</th><th>1440</th><th>375</th><th>760</th><th>Flagged controls</th></tr></thead>
      <tbody>{screen_rows}</tbody>
    </table></div>
  </section>

  <section aria-labelledby="h-how">
    <h2 id="h-how">5 · How it is checked</h2>
    <p class="sub">The checker opens each demo state in headless Chrome at three widths and compares every control with the Component Inventory. It runs with the code QA on every UI change.</p>
    <div class="run">node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs --states fo-02,pp-01,rap-01 --out tools/ui-qa/out/components
python3 tools/ui-qa/component-audit-html.py {e(D)}</div>
  </section>

  <footer>Generated {e(after["generated"][:16].replace("T", " "))} UTC from <span>report-after.json</span>. Allow-list: tools/ui-qa/specs/component-audit.json.</footer>
</main>
</body>
</html>
"""
open(os.path.join(D, "index.html"), "w").write(page)
print("wrote", os.path.join(D, "index.html"))
