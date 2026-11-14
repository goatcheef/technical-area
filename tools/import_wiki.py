#!/usr/bin/env python3
"""Importa clubes y planteles reales desde Wikipedia en español.

Uso: python3 tools/import_wiki.py [--offline]
Genera data/clubs_raw.json (clubes + jugadores sin atributos).
"""
import json, os, re, subprocess, sys, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
UA = "User-Agent: football-sim-data-import/0.1 (personal hobby project)"
OFFLINE = "--offline" in sys.argv


def fetch(title):
    os.makedirs(RAW, exist_ok=True)
    fn = os.path.join(RAW, re.sub(r"[^\w]+", "_", title) + ".wiki")
    if os.path.exists(fn) and os.path.getsize(fn) > 500:
        return open(fn, encoding="utf-8").read()
    if OFFLINE:
        return ""
    url = "https://es.wikipedia.org/w/index.php?" + urllib.parse.urlencode(
        {"title": title, "action": "raw"})
    for attempt in range(4):
        r = subprocess.run(["curl", "-sS", "-m", "40", "-L", "-H", UA, url],
                           capture_output=True)
        txt = r.stdout.decode("utf-8", "replace")
        time.sleep(1.5)
        if txt and not txt.lstrip().startswith("<!DOCTYPE") and "too many requests" not in txt[:200]:
            m = re.match(r"#REDIREC\w+\s*\[\[([^\]|#]+)", txt.strip(), re.I)
            if m:
                txt = fetch(m.group(1).strip())
            open(fn, "w", encoding="utf-8").write(txt)
            return txt
        time.sleep(5 * (attempt + 1))
    return ""


def strip_refs(s):
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S)
    return s


def link(s):
    """Devuelve (titulo, texto) del primer enlace wiki."""
    m = re.search(r"\[\[([^\]|]+)(?:\|([^\]]*))?\]\]", s)
    if not m:
        return None, re.sub(r"[\[\]']", "", s).strip()
    return m.group(1).strip(), (m.group(2) or m.group(1)).strip()


def section(text, start_pat, level=2):
    m = re.search(r"^={%d}\s*%s\s*={%d}\s*$" % (level, start_pat, level), text, re.M)
    if not m:
        return ""
    rest = text[m.end():]
    n = re.search(r"^={1,%d}[^=].*$" % level, rest, re.M)
    return rest[: n.start()] if n else rest


def parse_teams(text):
    sec = strip_refs(section(text, "Equipos participantes"))
    sec = sec.split("===")[0]
    teams = []
    for row in re.split(r"^\|-.*$", sec, flags=re.M):
        cells = [c.strip() for c in re.split(r"^\|", row, flags=re.M)[1:]]
        cells = [c for c in cells if c and not c.startswith("}")]
        if len(cells) < 4:
            continue
        title, short = link(cells[0])
        if not title:
            continue
        _, city = link(cells[1])
        _, stadium = link(cells[2])
        cap = cells[3].split("<br")[0]
        cap = re.sub(r"\{\{esd\|(\d+)\}\}", r"\1", cap)
        cap = cap.replace("{{esd}}", "").replace("&nbsp;", "")
        cap = re.sub(r"align=center\s*\|", "", cap)
        m = re.search(r"\d[\d\. ]*", cap)
        capacity = int(re.sub(r"\D", "", m.group(0))) if m else 10000
        teams.append(dict(wiki=title, name=short, city=city, stadium=stadium, capacity=capacity))
    return teams


def parse_tables(chunk):
    """Lista de (titulo, pj, pts, dg) de plantillas 'Tabla de posiciones equipo'."""
    out = []
    for m in re.finditer(r"\{\{Tabla de posiciones equipo\|([^\n]*)", chunk):
        line = m.group(1)
        g = int(re.search(r"\bg=(\d+)", line).group(1))
        e = int(re.search(r"\be=(\d+)", line).group(1))
        p = int(re.search(r"\bp=(\d+)", line).group(1))
        gf = int(re.search(r"\bgf=(\d+)", line).group(1))
        gc = int(re.search(r"\bgc=(\d+)", line).group(1))
        t, _ = link(re.search(r"eq=(.*)", line).group(1))
        if t:
            out.append((t, g + e + p, 3 * g + e, gf - gc))
    return out


def split_template(body):
    """Divide los parámetros de una plantilla respetando anidamiento."""
    parts, depth, cur, i = [], 0, "", 0
    while i < len(body):
        two = body[i:i + 2]
        if two in ("{{", "[["):
            depth += 1; cur += two; i += 2; continue
        if two in ("}}", "]]"):
            depth -= 1; cur += two; i += 2; continue
        if body[i] == "|" and depth == 0:
            parts.append(cur); cur = ""
        else:
            cur += body[i]
        i += 1
    parts.append(cur)
    return parts


def find_templates(text, name):
    out = []
    for m in re.finditer(r"\{\{\s*" + name + r"\s*\|", text, re.I):
        i, depth = m.end(), 1
        while i < len(text) and depth:
            if text[i:i + 2] == "{{":
                depth += 1; i += 2
            elif text[i:i + 2] == "}}":
                depth -= 1; i += 2
            else:
                i += 1
        out.append((m.start(), text[m.end(): i - 2]))
    return out


NAT = {"AR": "Argentina", "UY": "Uruguay", "PY": "Paraguay", "CO": "Colombia", "CL": "Chile", "BR": "Brasil", "VE": "Venezuela", "EC": "Ecuador", "PE": "Perú", "BO": "Bolivia", "ARG": "Argentina", "URU": "Uruguay", "PAR": "Paraguay", "COL": "Colombia", "CHI": "Chile",
       "BRA": "Brasil", "VEN": "Venezuela", "ECU": "Ecuador", "PER": "Perú", "BOL": "Bolivia",
       "ESP": "España", "ITA": "Italia", "MEX": "México", "USA": "Estados Unidos"}
POS = {"POR": "GK", "ARQ": "GK", "GK": "GK", "DEF": "DF", "DF": "DF", "MED": "MF", "VOL": "MF",
       "MF": "MF", "MC": "MF", "CEN": "MF", "DEL": "FW", "FW": "FW", "ATA": "FW"}


def parse_squad(text):
    text = strip_refs(text)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    tpls = find_templates(text, "Jugador de fútbol")
    if not tpls:
        return []
    # nos quedamos con el primer bloque contiguo (plantel actual); se corta en
    # encabezados de bajas / cedidos / altas
    first = tpls[0][0]
    m = re.search(r"\{\{\s*Equipo de fútbol fin", text[first:], re.I)
    stop = first + m.start() if m else len(text)
    players, seen = [], set()
    for pos, body in tpls:
        if pos > stop:
            break
        d = {}
        for part in split_template(body):
            if "=" in part:
                k, v = part.split("=", 1)
                d[k.strip().lower()] = v.strip()
        nombre = d.get("nombre", d.get("name", ""))
        ptitle, name = link(nombre)
        name = re.sub(r"\{\{.*?\}\}", "", name)
        name = re.sub(r"\s*\(.*?\)", "", name).replace("'", "").strip()
        if not name or name in seen or len(name) < 3:
            continue
        p = POS.get(re.sub(r"[^A-Z]", "", d.get("pos", "").upper())[:3])
        if not p:
            continue
        m = re.search(r"(\d{1,2})\|(\d{1,2})\|(\d{4})", d.get("edad", ""))
        birth = "%s-%02d-%02d" % (m.group(3), int(m.group(2)), int(m.group(1))) if m else None
        if m and not (1980 <= int(m.group(3)) <= 2011):
            birth = None
        nac = re.sub(r"\{\{|\}\}|\[\[|\]\]|bandera\||Bandera\|", "", (d.get("nac") or d.get("nat") or "Argentina")).split("|")[0].strip()
        nac = NAT.get(nac.upper(), nac) or "Argentina"
        num = re.sub(r"\D", "", d.get("no", d.get("num", d.get("número", ""))))
        nota = d.get("nota", "").lower()
        proc = d.get("procedencia", "")
        seen.add(name)
        players.append(dict(name=name, wiki=ptitle, pos=p, birth=birth, nat=nac,
                            num=int(num) if num else None,
                            loan="cedido|in" in nota.replace(" ", ""),
                            captain="{{cap" in nota,
                            youth="inferiores" in proc.lower()))
    return players


def main():
    out = []
    for div, page in ((1, "Campeonato de Primera División 2026 (Argentina)"),
                      (2, "Campeonato de Primera Nacional 2026")):
        text = fetch(page)
        teams = parse_teams(text)
        if div == 1:
            ap = section(text, "Torneo Apertura")
            cl = section(text, "Torneo Clausura")
            za = parse_tables(ap.split("==== Zona B ====")[0])
            zb = parse_tables(ap.split("==== Zona B ====")[1].split("=== Octavos")[0])
            allrows = za + zb + parse_tables(cl.split("=== Octavos")[0])
        else:
            za = parse_tables(section(text, "Zona A"))
            zb = parse_tables(section(text, "Zona B"))
            allrows = za + zb
        zone = {t: "A" for t, *_ in za}
        zone.update({t: "B" for t, *_ in zb})
        ppg = {}
        for t, pj, pts, dg in allrows:
            a = ppg.setdefault(t, [0, 0, 0])
            a[0] += pj; a[1] += pts; a[2] += dg
        for t in teams:
            t["division"] = div
            t["zone"] = zone.get(t["wiki"])
            a = ppg.get(t["wiki"], [0, 0, 0])
            t["ppg2026"] = round(a[1] / a[0], 3) if a[0] else None
            t["gd2026"] = a[2]
            page_txt = fetch(t["wiki"])
            t["players"] = parse_squad(page_txt)
            mm = re.search(r"^\|\s*[Ee]ntrenador\s*=\s*(.+)$", page_txt, re.M)
            t["manager"] = link(strip_refs(re.sub(r"\{\{.*?\}\}", "", mm.group(1))))[1].strip() if mm else None
            mm = re.search(r"^\|\s*[Aa]podo\(?s?\)?\s*=\s*(.+)$", page_txt, re.M)
            t["nick"] = re.sub(r"<.*|\{\{.*?\}\}|\[\[|\]\]|'", "", strip_refs(mm.group(1))).split(",")[0].strip()[:40] if mm else None
            print("%d %-1s %-28s %3d jugadores  cap %6d  ppg %s" % (
                div, t["zone"], t["name"], len(t["players"]), t["capacity"], t["ppg2026"]), flush=True)
            out.append(t)
    json.dump(out, open(os.path.join(ROOT, "data", "clubs_raw.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("clubes:", len(out), "jugadores:", sum(len(t["players"]) for t in out))


if __name__ == "__main__":
    main()
