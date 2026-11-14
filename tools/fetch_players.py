#!/usr/bin/env python3
"""Baja la ficha de Wikipedia de cada jugador (en lotes) y extrae señales reales:
puesto, año de debut, clubes, selección y tamaño del artículo. Genera data/players_meta.json."""
import json, os, re, subprocess, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "User-Agent: football-sim-data-import/0.1 (personal hobby project)"
OUT = os.path.join(ROOT, "data", "players_meta.json")
clubs = json.load(open(os.path.join(ROOT, "data", "clubs_raw.json"), encoding="utf-8"))
titles = sorted({p["wiki"] for c in clubs for p in c["players"] if p.get("wiki")})
meta = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

BIG = r"Liga|Premier|Serie A|Bundesliga|Ligue|Real Madrid|Barcelona|Atlético de Madrid|Sevilla|Valencia|Villarreal|Betis|Milan|Inter|Juventus|Roma|Napoli|Lazio|Fiorentina|Paris|Manchester|Chelsea|Arsenal|Liverpool|Tottenham|Benfica|Porto|Sporting|Ajax|PSV|Bayern|Borussia|Leverkusen|Marsella|Lyon|Mónaco|Zenit|Flamengo|Palmeiras"
def field(t, name):
    m = re.search(r"^\|\s*" + name + r"\s*=\s*(.*)$", t, re.M | re.I)
    return m.group(1).strip() if m else ""
def extract(t):
    head = t[:6000]
    if not re.search(r"Ficha de (deportista|futbolista)", head, re.I) or not re.search(r"f[uú]tbol", head, re.I):
        return {"ok": False}
    pos = re.sub(r"\[\[[^\]|]*\|", "", field(head, "posici[oó]n")).replace("[[", "").replace("]]", "")
    pos = re.sub(r"<.*", "", pos).lower()[:80]
    ini = re.search(r"(19|20)\d\d", field(head, "inicio") or field(head, "añodebut") or field(head, "debut"))
    caps = re.search(r"\d+", field(head, "veces internacional") or field(head, "partidosselección") or "")
    sel = field(head, "selecci[oó]n").lower()
    eq = head[head.lower().find("equipos"):] if "equipos" in head.lower() else ""
    eq = eq[: eq.find("\n}}")] if "\n}}" in eq else eq[:1500]
    lines = [l for l in eq.split("\n") if l.strip().startswith("*")]
    foreign = sum(1 for l in lines if re.search(r"Bandera\|(ESP|ITA|ING|ALE|FRA|POR|NED|BRA|RUS)|" + "España|Italia|Inglaterra|Alemania|Francia|Portugal", l)) + sum(1 for l in lines if re.search(BIG, l) and "Argentin" not in l)
    return {"ok": True, "pos": pos, "debut": int(ini.group(0)) if ini else None, "caps": int(caps.group(0)) if caps and "sub" not in sel else 0,
            "youthcaps": bool(caps) and "sub" in sel, "clubs": len(lines), "foreign": min(foreign, 6), "len": len(t)}

todo = [t for t in titles if t not in meta]
for i in range(0, len(todo), 20):
    batch = todo[i:i + 20]
    r = subprocess.run(["curl", "-sS", "-m", "60", "-H", UA, "--get", "https://es.wikipedia.org/w/api.php",
                        "--data-urlencode", "action=query", "--data-urlencode", "prop=revisions", "--data-urlencode", "rvprop=content",
                        "--data-urlencode", "rvslots=main", "--data-urlencode", "format=json", "--data-urlencode", "formatversion=2",
                        "--data-urlencode", "redirects=1", "--data-urlencode", "titles=" + "|".join(batch)], capture_output=True)
    try:
        d = json.loads(r.stdout.decode("utf-8"))["query"]
    except Exception:
        print("fallo lote", i, r.stdout[:120]); time.sleep(25); continue
    back = {}
    for k in ("normalized", "redirects"):
        for x in d.get(k, []):
            back[x["to"]] = back.get(x["from"], x["from"])
    for pg in d.get("pages", []):
        src = back.get(pg["title"], pg["title"])
        src = back.get(src, src)
        txt = (pg.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        meta[src] = extract(txt) if txt else {"ok": False}
    for t in batch:
        meta.setdefault(t, {"ok": False})
    json.dump(meta, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    time.sleep(5)
# SEGUNDA PASADA: homónimos. Si el título no llevó a un futbolista, se prueba con "(futbolista)".
retry = [t for t in titles if not meta.get(t, {}).get("ok") and "(" not in t and not meta.get(t, {}).get("retried")]
for i in range(0, len(retry), 20):
    batch = retry[i:i + 20]
    r = subprocess.run(["curl", "-sS", "-m", "60", "-H", UA, "--get", "https://es.wikipedia.org/w/api.php",
                        "--data-urlencode", "action=query", "--data-urlencode", "prop=revisions", "--data-urlencode", "rvprop=content",
                        "--data-urlencode", "rvslots=main", "--data-urlencode", "format=json", "--data-urlencode", "formatversion=2",
                        "--data-urlencode", "redirects=1", "--data-urlencode", "titles=" + "|".join(t + " (futbolista)" for t in batch)], capture_output=True)
    try:
        d = json.loads(r.stdout.decode("utf-8"))["query"]
    except Exception:
        print("fallo lote", i); time.sleep(25); continue
    back = {}
    for k in ("normalized", "redirects"):
        for x in d.get(k, []):
            back[x["to"]] = back.get(x["from"], x["from"])
    for pg in d.get("pages", []):
        src = back.get(pg["title"], pg["title"]); src = back.get(src, src)
        txt = (pg.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        base = src.replace(" (futbolista)", "")
        if txt and base in meta:
            e = extract(txt)
            if e.get("ok"): meta[base] = e
    for t in batch:
        if not meta.setdefault(t, {"ok": False}).get("ok"): meta[t]["retried"] = True
    json.dump(meta, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    time.sleep(5)
ok = [m for m in meta.values() if m.get("ok")]
print("jugadores con ficha:", len(ok), "de", len(titles), "| con puesto:", sum(1 for m in ok if m["pos"]), "| con debut:", sum(1 for m in ok if m["debut"]))
