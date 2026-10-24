#!/usr/bin/env python3
"""Copy the no-inner-shadow step (lib part of tools/figma/quality-sweep/no-inner-shadow.js) into every capture / swap
script that is pasted into use_figma (they must stay self-contained). Replaces the block between the markers
`// >>> no-inner-shadow step` … `// <<< no-inner-shadow step`; files without markers get it inserted before ANCHOR.
Run from the repo root: python3 tools/figma/quality-sweep/sync-no-inner-shadow.py"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / "tools/figma/quality-sweep/no-inner-shadow.js"
# file → anchor line prefix the block is inserted before (first install only)
TARGETS = {
    "tools/figma/tokenize.js": "const TOKENIZE=",
    "tools/figma/swap-to-instances.js": "for (const rid of ROOTS) {",
    "tools/figma/swap-builder-address.js": "for (const rid of ROOTS) {",
    "tools/figma/ghiseu/swap-ghiseu.js": "for (const rid of ROOTS)",
    "tools/figma/swap-workplace-registry.js": "for (const rid of ROOTS) {",
    "tools/figma/users-board/registry-pass.js": "  const g = (id) => figma.getNodeByIdAsync(id);",  # inside its async (ROOT) => { … } body
}
src = SRC.read_text()
lib = src[src.index("const NIS_kind"):src.index("// ---- sweep")].rstrip()
block = ("// >>> no-inner-shadow step (2026-10-24) — copy of tools/figma/quality-sweep/no-inner-shadow.js (lib part); re-sync with\n"
         "// `python3 tools/figma/quality-sweep/sync-no-inner-shadow.py`. Captures turn CSS inset box-shadows into INNER_SHADOW effects:\n"
         "// dividers → one-side stroke, rings → INSIDE stroke, the rest removed. Guarded so two pasted copies never clash.\n"
         "globalThis.NO_INNER_SHADOW = globalThis.NO_INNER_SHADOW || (() => {\n" + lib + "\nreturn NO_INNER_SHADOW;\n})();\n"
         "// <<< no-inner-shadow step\n")
pat = re.compile(r"// >>> no-inner-shadow step.*?// <<< no-inner-shadow step\n", re.S)
for rel, anchor in TARGETS.items():
    p = ROOT / rel; s = p.read_text()
    if pat.search(s): s2 = pat.sub(lambda m: block, s)
    elif anchor and anchor in s: i = s.index(anchor); s2 = s[:i] + block + s[i:]
    else: print("SKIP (no markers / anchor):", rel); continue
    if s2 != s: p.write_text(s2); print("updated", rel)
    else: print("ok", rel)
