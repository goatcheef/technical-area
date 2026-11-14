#!/usr/bin/env python3
"""Cruza los planteles con las listas de las selecciones juveniles argentinas (Wikipedia)
y genera data/prospects.json: jugadores jóvenes convocados y en qué categorías."""
import json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = [("p3", "Mundial Sub-20 2025", 5, True), ("p5", "Sudamericano Sub-20 2025", 4, True), ("p1", "Selección Sub-20", 3, False),
       ("p7", "Mundial Sub-17 2026", 4, True), ("p4", "Mundial Sub-17 2025", 4, True), ("p2", "Selección Sub-17", 3, False),
       ("p10", "Selección Sub-23", 3, False), ("p9", "Selección Sub-15", 2, False)]
norm = lambda s: unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
def arg_section(t):
    m = re.search(r"^(=+)\s*(\{\{[^}]*\}\}\s*)?\[?\[?Argentina[^=\n]*=+\s*$", t, re.M)
    if not m: return ""
    rest = t[m.end():]
    n = re.search(r"^={1,%d}[^=]" % len(m.group(1)), rest, re.M)
    return rest[: n.start()] if n else rest
texts = []
for f, label, w, anexo in SRC:
    t = open(os.path.join(ROOT, "data", "raw", "sel", f + ".wiki"), encoding="utf-8").read()
    if anexo: t = arg_section(t)
    texts.append((label, w, norm(t)))
    print("%-26s %6d caracteres" % (label, len(t)))
clubs = json.load(open(os.path.join(ROOT, "data", "clubs_raw.json"), encoding="utf-8"))
out = {}
for c in clubs:
    for p in c["players"]:
        if not p.get("birth") or int(p["birth"][:4]) < 2003: continue
        keys = {norm(p["name"])}
        if p.get("wiki"): keys.add(norm(re.sub(r"\s*\(.*\)", "", p["wiki"])))
        keys = {k for k in keys if len(k.split()) >= 2}
        hits = [(label, w) for label, w, t in texts if any(re.search(r"(?<![a-z])" + re.escape(k) + r"(?![a-z])", t) for k in keys)]
        if hits:
            out["%s|%s" % (c["wiki"], p["name"])] = {"club": c["name"], "div": c["division"], "birth": p["birth"], "pos": p["pos"], "score": max(w for _, w in hits) + 0.5 * (len(hits) - 1), "sel": [l for l, _ in hits]}
json.dump(out, open(os.path.join(ROOT, "data", "prospects.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("juveniles convocados encontrados:", len(out), "| Primera:", sum(1 for v in out.values() if v["div"] == 1))
for k, v in sorted(out.items(), key=lambda kv: (-kv[1]["score"], kv[0])):
    if v["div"] == 1: print("%4.1f  %-26s %-22s %s  %s" % (v["score"], k.split("|")[1], v["club"], v["birth"][:4], ", ".join(v["sel"])))
