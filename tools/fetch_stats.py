#!/usr/bin/env python3
"""Baja la tabla "Estadísticas > Clubes" de la ficha de Wikipedia de cada jugador y guarda,
por jugador, los partidos de la temporada 2026 y 2025 y los totales de carrera.
Genera data/players_stats.json. Se puede cortar y retomar: lo ya bajado no se vuelve a pedir.

Uso: python3 tools/fetch_stats.py
"""
import json, os, re, subprocess, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "User-Agent: football-sim-data-import/0.1 (personal hobby project)"
OUT = os.path.join(ROOT, "data", "players_stats.json")
meta = json.load(open(os.path.join(ROOT, "data", "players_meta.json"), encoding="utf-8"))
stats = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

SEASON = re.compile(r"^(?:'''|\[\[[^|\]]*\|)?\s*((?:19|20)\d\d(?:[-/](?:19|20)?\d\d)?)\s*(?:'''|\]\])?$")


def cells_of(row):
    """Celdas de una fila de wikitabla, expandiendo colspan."""
    out = []
    for line in row.split("\n"):
        line = line.strip()
        if not line or line[0] not in "|!" or line.startswith("|-") or line.startswith("|}") or line.startswith("{|"):
            continue
        for c in re.split(r"\|\||!!", line[1:]):
            span = 1
            m = re.match(r'\s*(?:[a-z-]+="[^"]*"\s*)*colspan\s*=\s*"?(\d+)"?[^|]*\|(.*)$', c)
            if m:
                span, c = int(m.group(1)), m.group(2)
            elif re.match(r'\s*(?:rowspan|style|align|width)\s*=', c) and "|" in c:
                c = c.split("|", 1)[1]
            c = re.sub(r"<ref.*?(</ref>|/>)", "", c)
            c = re.sub(r"\{\{[^}]*\}\}|'''|''|<[^>]+>", "", c).strip()
            out.extend([c] * span if span > 1 else [c])
    return out


def parse(t):
    i = t.find("== Estadísticas")
    if i < 0:
        i = t.find("==Estadísticas")
    if i < 0:
        return None
    sec = t[i:]
    j = sec.find("\n|}")
    sec = sec[: j if j > 0 else 20000]
    upd = re.search(r"(?:ctualizad[oa][^.\n]*?)((?:19|20)\d\d)", sec[:800])
    seasons = []
    for row in re.split(r"\n\|-[^\n]*", sec):
        cs = cells_of(row)
        for k, c in enumerate(cs):
            m = SEASON.match(c)
            if not m:
                continue
            nums = []
            for x in cs[k + 1:]:
                x = x.strip()
                if re.fullmatch(r"\d{1,3}", x):
                    nums.append(int(x))
                elif x in ("—", "-", "–", ""):
                    nums.append(None)
            vals = [v for v in nums if v is not None]
            if not nums or nums[0] is None and not vals:
                break
            g = 3 if len(nums) % 3 == 0 else 2 if len(nums) % 2 == 0 else 3
            total = nums[-g] if len(nums) >= 2 * g and nums[-g] is not None else (nums[0] or 0)
            seasons.append({"s": m.group(1), "apps": total, "lg": nums[0] or 0, "gls": (nums[1] or 0) if len(nums) > 1 else 0})
            break
    if not seasons:
        return None
    def yr(s):
        p = re.findall(r"\d{2,4}", s)
        last = p[-1]
        return int(last) + (2000 if len(last) == 2 else 0)
    by = {}
    for s in seasons:
        by.setdefault(yr(s["s"]), []).append(s)
    pick = lambda y: sum(x["apps"] for x in by.get(y, []))
    return {"upd": int(upd.group(1)) if upd else None, "a26": pick(2026) + (pick(2027) if any("26" in x["s"] for x in by.get(2027, [])) else 0),
            "a25": pick(2025), "g26": sum(x["gls"] for x in by.get(2026, [])), "car": sum(s["apps"] for s in seasons), "n": len(seasons)}


LEAD = re.compile(r"(?i:juega|jugaba|se desempeña|se desempeñaba|desempeña|ocupa)\s+(?:como|de|en la posición de|en el puesto de)\s+((?:\[\[[^\]]*\]\]|[^.;\n\[])+?)(?=[.;\n]| en (?:el|la|los|las|[A-Z\[])| y (?:su|actualmente|milita)|,)")
def lead_pos(t):
    """Puesto según la primera frase del artículo (más precisa que la ficha en muchos casos)."""
    body = re.sub(r"\{\{[^{}]*\}\}", "", t)
    k = body.find("'''")
    m = LEAD.search(body[k if k >= 0 else 0:][:4000])
    if not m:
        return None
    x = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", m.group(1))
    return re.sub(r"\s+", " ", x).strip().lower()[:80] or None


def main():
    titles = [t for t, m in meta.items() if m.get("ok") and not (isinstance(stats.get(t), dict) and "lead" in stats[t])]
    print("por bajar:", len(titles), flush=True)
    for i in range(0, len(titles), 20):
        batch = titles[i:i + 20]
        r = subprocess.run(["curl", "-sS", "-m", "60", "-H", UA, "--get", "https://es.wikipedia.org/w/api.php",
                            "--data-urlencode", "action=query", "--data-urlencode", "prop=revisions", "--data-urlencode", "rvprop=content",
                            "--data-urlencode", "rvslots=main", "--data-urlencode", "format=json", "--data-urlencode", "formatversion=2",
                            "--data-urlencode", "redirects=1", "--data-urlencode", "titles=" + "|".join(batch)], capture_output=True)
        try:
            d = json.loads(r.stdout.decode("utf-8"))["query"]
        except Exception:
            print("lote", i, "rechazado, espero", flush=True); time.sleep(30); continue
        back = {}
        for k in ("normalized", "redirects"):
            for x in d.get(k, []):
                back[x["to"]] = back.get(x["from"], x["from"])
        for pg in d.get("pages", []):
            src = back.get(pg["title"], pg["title"]); src = back.get(src, src)
            txt = (pg.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            if src in meta:
                stats[src] = {**(parse(txt) or {}), "lead": lead_pos(txt)} if txt else {"lead": None}
        for t in batch:
            if not isinstance(stats.get(t), dict) or "lead" not in stats[t]: stats[t] = {"lead": None}
        json.dump(stats, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
        if i % 200 == 0:
            print(i, "listos", flush=True)
        time.sleep(4)
    ok = [s for s in stats.values() if s and "a26" in s]
    print("con frase de puesto:", sum(1 for s in stats.values() if s and s.get("lead")), "| con estadísticas:", len(ok), "de", len(stats), "| actualizadas a 2026:", sum(1 for s in ok if s.get("upd") == 2026), "| con partidos en 2026:", sum(1 for s in ok if s["a26"] > 0))


if __name__ == "__main__":
    main()
