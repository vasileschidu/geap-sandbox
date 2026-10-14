// eKYC library pass round 3 (2026-10-14) · 1920 list screens: wide FIXED containers (and GRID wrappers) → FILL; tables span the content width (extra goes to the description-like column).
// Run on the current page: new AF(code)()
" not in line: continue
    try: o=json.loads(line)
    except: continue
    def walk(x):
        if isinstance(x,str):
            for m in re.finditer(r"<<S:(\w+)>>(.*?)
