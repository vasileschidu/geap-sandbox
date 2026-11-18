#!/usr/bin/env python3
"""Dev-facing review page from a staging-compare run (2026-11-18).
Usage: python3 tools/ui-qa/staging-compare/review-page.py <run folder with report.json> <out folder, e.g. reviews/rap-staging>
Writes <out>/index.html + <out>/crops/*.png (one finding per element, repeats folded into „Also on”, each copyable as a ticket line).
Commit <out> and push to sandbox: GitHub Pages serves it at https://vasileschidu.github.io/geap-sandbox/<out>/"""
import json, os, sys, shutil
src, out = sys.argv[1:3]
tplp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'review-page.tpl.html')
os.makedirs(os.path.join(out, 'crops'), exist_ok=True)
d = json.load(open(os.path.join(src, 'report.json')))
imgs, rows = {}, []
for x in (f for f in d['findings'] if not f.get('repeatOf')):
    p = x.get('crop')
    if p and os.path.exists(os.path.join(src, p)):
        if p not in imgs:
            name = os.path.basename(p)
            shutil.copy(os.path.join(src, p), os.path.join(out, 'crops', name)); imgs[p] = 'crops/' + name
    else:
        p = None
    rows.append({k: x.get(k) for k in ['id','screen','viewport','key','kind','prop','rule','severity','staging','ours','note','alsoOn']} | {'crop': p})
screens = {s['screen']: (s['staging'].get('url') if isinstance(s.get('staging'), dict) else None) for s in d['screens']}
data = {'run': d['run'], 'counts': d['counts'], 'rows': rows, 'screens': screens}
body = open(tplp).read().replace('/*DATA*/null', json.dumps(data, ensure_ascii=False)).replace('/*IMGS*/null', json.dumps(imgs))
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="robots" content="noindex">\n'
        + body.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + '\n</body>\n</html>\n')
open(os.path.join(out, 'index.html'), 'w').write(html)
print(f'{len(rows)} findings, {len(imgs)} crops → {out}/index.html')
