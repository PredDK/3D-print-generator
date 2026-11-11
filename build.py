#!/usr/bin/env python3
"""Samler src/ til én selvstændig index.html.

Brug:  python3 build.py
"""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
shell = (src / "shell.html").read_text(encoding="utf-8")
geom = (src / "geom.js").read_text(encoding="utf-8") + "\n" + (src / "tools.js").read_text(encoding="utf-8")
app = (src / "app.js").read_text(encoding="utf-8")
out = shell.replace("/*GEOM*/", geom).replace("/*APP*/", app)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"Skrev index.html ({len(out):,} tegn)")
