// eKYC library pass round 2 (2026-10-14) · set screens IDS to width W: full-width frames → FILL, overlays/drawers/toasts re-anchored, modal-background scroll-content follows, over-wide tables scale their FIXED columns down. One width per block column (1920 where any screen is wider than 1440).
// Run: new AF("IDS", "W", code)([...screenIds], 1920)
" not in line and "<<S:refit>>" not in line: continue
    try: o=json.loads(line)
    except: continue
    def walk(x):
        if isinstance(x,str):
            for m in re.finditer(r"<<S:(\w+)>>(.*?)
