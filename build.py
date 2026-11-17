#!/usr/bin/env python3
"""Samler src/ til én selvstændig index.html.

Brug:  python3 build.py
"""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
shell = (src / "shell.html").read_text(encoding="utf-8")
geom = (src / "geom.js").read_text(encoding="utf-8") + "\n" + (src / "tools.js").read_text(encoding="utf-8") + "\n" + (src / "tools2.js").read_text(encoding="utf-8") + "\n" + (src / "tools3.js").read_text(encoding="utf-8") + "\n" + (src / "tools4.js").read_text(encoding="utf-8") + "\n" + (src / "tools5.js").read_text(encoding="utf-8")
app = (src / "app.js").read_text(encoding="utf-8")
import re, collections, sys
names = collections.Counter(re.findall(r"^(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=)", geom + "\n" + app, re.M))
dups = sorted({a or b for (a, b), n in names.items() if n > 1})
if dups:
    sys.exit("Fejl: samme navn er defineret flere gange (de overskriver hinanden): " + ", ".join(dups))
out = shell.replace("/*GEOM*/", geom).replace("/*APP*/", app)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"Skrev index.html ({len(out):,} tegn)")
