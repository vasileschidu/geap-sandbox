# Build body specs from the CDP probe (acts.json / reqs.json). Usage: python3 spec.py probe.json state@width screenId bp [mode after only]
import json, sys
SM = {'success':'Success','danger':'Danger','pending':'Pending','upcoming':'Upcoming','':'Pending'}
def tl(items):
    out = []
    for it in items:
        txt = it['text'] or []
        plain = ''.join(x[0] for x in txt if x[1] != 2).strip()
        link = next((x[0] for x in txt if x[1] == 2), None)
        out.append([SM[it['mod']], it['title'], it['stamp'], plain or None, link])
    return out
def sec(s):
    o = {'t': s['title']}
    if 'rows' in s:
        o['rows'] = [[r['l'], r.get('vt') or r['v'], 'Copy' if r['copy'] else 'Link' if r['link'] else 'Tag' if r['tag'] else 'Text'] for r in s['rows']]
    elif 'ben' in s:
        b = s['ben']; o['ben'] = {'name': b['name'], 'idl': b['idl'], 'id': b['id']}
        if 'initials' in (b.get('avcls') or ''): o['ben']['initials'] = b['initials']
    elif 'tl' in s:
        o['tl'] = tl(s['tl']['items'])
    else:
        return None
    return o
def build(probe, key, screen, bp, mode='replace', only=None, after=None):
    secs = [sec(s) for s in probe[key] if s['title'] and (only is None or s['title'] in only)]
    secs = [s for s in secs if s]
    sp = {'screen': screen, 'bp': bp, 'mode': mode, 'secs': secs}
    if after: sp['after'] = after
    return sp
if __name__ == '__main__':
    p = json.load(open(sys.argv[1]))
    print(json.dumps(build(p, sys.argv[2], sys.argv[3], sys.argv[4]), ensure_ascii=False))
