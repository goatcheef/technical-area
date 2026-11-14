#!/usr/bin/env python3
"""Importa los clubes que no tienen plantel en el juego base: la tercera categoría
(los 10 más grandes de la Primera B y del Federal A 2026) y los rivales sudamericanos
de la Libertadores y la Sudamericana. Genera data/clubs_extra.json y agrega los escudos
a src/data/crests.json. Los planteles de estos clubes se generan en tools/build-db.ts.

Uso: python3 tools/import_extra.py
"""
import base64, json, os, re, subprocess, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_wiki as iw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "User-Agent: football-sim-data-import/0.1 (personal hobby project)"

# [título en es.wikipedia, nombre, corto, código, país, reputación, (color1, color2)]
FOREIGN = [
    ('Clube de Regatas do Flamengo', 'Flamengo', 'Flamengo', 'FLA', 'Brasil', 90, ('#c4161c', '#111111')),
    ('Sociedade Esportiva Palmeiras', 'Palmeiras', 'Palmeiras', 'PAL', 'Brasil', 89, ('#006437', '#ffffff')),
    ('Botafogo de Futebol e Regatas', 'Botafogo', 'Botafogo', 'BOT', 'Brasil', 85, ('#111111', '#ffffff')),
    ('Clube Atlético Mineiro', 'Atlético Mineiro', 'Atl. Mineiro', 'CAM', 'Brasil', 84, ('#111111', '#ffffff')),
    ('São Paulo Futebol Clube', 'São Paulo', 'São Paulo', 'SAO', 'Brasil', 84, ('#ffffff', '#d10a11')),
    ('Fluminense Football Club', 'Fluminense', 'Fluminense', 'FLU', 'Brasil', 83, ('#7a1531', '#006b3f')),
    ('Sport Club Internacional', 'Internacional', 'Internacional', 'INT', 'Brasil', 83, ('#d6001c', '#ffffff')),
    ('Grêmio Foot-Ball Porto Alegrense', 'Grêmio', 'Grêmio', 'GRE', 'Brasil', 82, ('#0d80bf', '#111111')),
    ('Sport Club Corinthians Paulista', 'Corinthians', 'Corinthians', 'COR', 'Brasil', 82, ('#ffffff', '#111111')),
    ('Cruzeiro Esporte Clube', 'Cruzeiro', 'Cruzeiro', 'CRU', 'Brasil', 81, ('#2f529e', '#ffffff')),
    ('Club Atlético Peñarol', 'Peñarol', 'Peñarol', 'PEÑ', 'Uruguay', 80, ('#ffd400', '#111111')),
    ('Club Nacional de Football', 'Nacional', 'Nacional', 'NAC', 'Uruguay', 79, ('#ffffff', '#1d3f8f')),
    ('Liga Deportiva Universitaria (Quito)', 'Liga de Quito', 'LDU', 'LDU', 'Ecuador', 79, ('#ffffff', '#c8102e')),
    ('Independiente del Valle', 'Independiente del Valle', 'Ind. del Valle', 'IDV', 'Ecuador', 79, ('#111111', '#1d4f9c')),
    ('Club Olimpia', 'Olimpia', 'Olimpia', 'OLI', 'Paraguay', 77, ('#111111', '#ffffff')),
    ('Club Cerro Porteño', 'Cerro Porteño', 'Cerro Porteño', 'CCP', 'Paraguay', 77, ('#1d3f8f', '#c8102e')),
    ('Club Libertad', 'Libertad', 'Libertad', 'LIB', 'Paraguay', 76, ('#111111', '#ffffff')),
    ('Club Social y Deportivo Colo-Colo', 'Colo-Colo', 'Colo-Colo', 'CLC', 'Chile', 77, ('#ffffff', '#111111')),
    ('Club Universidad de Chile', 'Universidad de Chile', 'U. de Chile', 'UCH', 'Chile', 76, ('#1d3f8f', '#c8102e')),
    ('Atlético Nacional', 'Atlético Nacional', 'Atl. Nacional', 'ATN', 'Colombia', 77, ('#0a7d3b', '#ffffff')),
    ('Millonarios Fútbol Club', 'Millonarios', 'Millonarios', 'MIL', 'Colombia', 75, ('#1d3f8f', '#ffffff')),
    ('Club Universitario de Deportes', 'Universitario', 'Universitario', 'UNV', 'Perú', 75, ('#f3ead0', '#7a1531')),
    ('Club Bolívar', 'Bolívar', 'Bolívar', 'BOL', 'Bolivia', 73, ('#75aadb', '#ffffff')),
]
T3_COLORS = ['#d6001c', '#1d4f9c', '#0a7d3b', '#ffd400', '#111111', '#75aadb', '#7a1531', '#ff7a00']
# Tercera categoría: código único (los clásicos se buscan por código y no puede repetir el de otro club) y colores
# reales, del campo «colores», el apodo o el uniforme titular de la ficha del club (data/raw/). Un club que no
# figure acá toma las tres primeras letras y un color de T3_COLORS: hay que agregarlo.
T3 = {
    'Arsenal Fútbol Club': ('ARS', ('#27bef8', '#d6001c')),  # celeste con banda roja
    'Club Social y Cultural Deportivo Laferrere': ('LAF', ('#0a7d3b', '#ffffff')),  # verde y blanco
    'Club Atlético Talleres (Remedios de Escalada)': ('TRE', ('#d6001c', '#ffffff')),  # rojo y blanco
    'Club Villa Dálmine': ('VIL', ('#400080', '#ffffff')),  # violeta
    'Club Atlético Argentino (Merlo)': ('AME', ('#75aadb', '#ffffff')),  # celeste y blanco
    'Club Deportivo Armenio': ('ARM', ('#d90012', '#0033a0')),  # rojo, azul y naranja (bandera de Armenia)
    'Club Social y Deportivo Merlo': ('MER', ('#1d4f9c', '#ffffff')),  # azul y blanco
    'Real Pilar Fútbol Club': ('RPI', ('#111111', '#fd99d9')),  # negro, blanco y rosa
    'Club Sportivo Dock Sud': ('DOC', ('#1d3f8f', '#ffcc00')),  # azul y amarillo
    'Club Atlético Excursionistas': ('EXC', ('#007744', '#ffffff')),  # verde y blanco
    'Club Atlético Sarmiento (Resistencia)': ('SRE', ('#d6001c', '#ffd400')),  # «Aurirrojo»: amarillo y rojo
    'Club Atlético Boca Unidos': ('BUN', ('#d6001c', '#ffd400')),  # «Aurirrojo»
    'Club Olimpo': ('OLM', ('#ffd400', '#111111')),  # amarillo y negro
    'Club Atlético Douglas Haig': ('DOU', ('#d6001c', '#111111')),  # rojo y negro
    'Club Sportivo Belgrano (San Francisco)': ('SPB', ('#0a7d3b', '#ffffff')),  # «La Verde»
    'Club Social y Atlético Guillermo Brown': ('GBR', ('#ffffff', '#1a2b57')),  # blanco y azul
    'Centro Juventud Antoniana': ('JUV', ('#1d3f8f', '#ffffff')),  # azul, blanco y marrón
    'Club Sol de América (Formosa)': ('SOL', ('#1d4f9c', '#ffd400')),  # azul y amarillo
    'Club Cipolletti': ('CIP', ('#ffffff', '#111111')),  # albinegro
    'Club Atlético Huracán Las Heras': ('HLH', ('#ffffff', '#d6001c')),  # blanco y rojo
}


def thumb(title, dst):
    """Descarga la miniatura PNG del escudo que figura en la ficha del club."""
    if os.path.exists(dst) and os.path.getsize(dst) > 500:
        return True
    txt = iw.fetch(title)[:7000]
    m = re.search(r"^\s*\|\s*(?:Imagen principal|[Ee]scudo|[Ii]magen|[Ll]ogo)\s*=\s*(?:\[\[)?(?:Archivo:|File:|Imagen:)?([^|\]\n]+\.(?:svg|png|jpg|jpeg|gif))", txt, re.M | re.I)
    if not m:
        return False
    url = "https://es.wikipedia.org/wiki/Especial:FilePath/" + urllib.parse.quote(m.group(1).strip().replace(" ", "_")) + "?width=128"
    for _ in range(3):
        subprocess.run(["curl", "-sS", "-m", "40", "-L", "-H", UA, "-o", dst, url], capture_output=True)
        time.sleep(1.5)
        head = open(dst, "rb").read(4) if os.path.exists(dst) else b""
        if head[:4] == b"\x89PNG" or head[:2] == b"\xff\xd8":
            return True
        time.sleep(4)
    if os.path.exists(dst):
        os.remove(dst)
    return False


def manager_of(title):
    txt = iw.fetch(title)
    mm = re.search(r"^\|\s*[Ee]ntrenador\s*=\s*(.+)$", txt, re.M)
    if not mm:
        return None
    return iw.link(iw.strip_refs(re.sub(r"\{\{.*?\}\}", "", mm.group(1))))[1].replace("'", "").strip() or None


def main():
    base = json.load(open(os.path.join(ROOT, "data", "clubs_raw.json"), encoding="utf-8"))
    next_id = len(base) + 1
    out = []
    for page, zone, rep0 in (("Campeonato de Primera B 2026 (Argentina)", "A", 47), ("Torneo Federal A 2026", "B", 46)):
        teams = sorted(iw.parse_teams(iw.fetch(page)), key=lambda t: -t["capacity"])[:10]
        for i, t in enumerate(teams):
            out.append(dict(id=next_id, wiki=t["wiki"], name=t["name"], short=t["name"], city=t["city"], stadium=t["stadium"],
                            capacity=t["capacity"], division=3, zone=zone, rep=rep0 - i // 3, country="Argentina",
                            colors=list(T3[t["wiki"]][1]) if t["wiki"] in T3 else [T3_COLORS[next_id % len(T3_COLORS)], "#ffffff"]))
            if t["wiki"] in T3:
                out[-1]["code"] = T3[t["wiki"]][0]
            next_id += 1
    # nombres repetidos dentro de la tercera: se aclara la ciudad
    names = [c["name"] for c in out]
    for c in out:
        if names.count(c["name"]) > 1 or any(c["name"] == b["name"] for b in base):
            c["name"] = c["short"] = f'{c["name"]} ({c["city"]})'
    for w, n, s, code, country, rep, cols in FOREIGN:
        out.append(dict(id=next_id, wiki=w, name=n, short=s, code=code, city=country, stadium="", capacity=40000,
                        division=0, zone="", rep=rep, country=country, colors=list(cols)))
        next_id += 1
    crests = json.load(open(os.path.join(ROOT, "src", "data", "crests.json")))
    os.makedirs(os.path.join(ROOT, "data", "crests"), exist_ok=True)
    for c in out:
        c["manager"] = manager_of(c["wiki"]) or "Cuerpo técnico interino"
        dst = os.path.join(ROOT, "data", "crests", "%d.png" % c["id"])
        ok = thumb(c["wiki"], dst)
        if ok:
            data = open(dst, "rb").read()
            mime = "image/png" if data[:4] == b"\x89PNG" else "image/jpeg"
            crests[str(c["id"])] = "data:%s;base64,%s" % (mime, base64.b64encode(data).decode())
        if not c.get("code"):
            c["code"] = re.sub(r"[^A-Z]", "", c["short"].upper())[:3] or "TER"
        print("%3d %d %-28s %-22s escudo:%s DT:%s" % (c["id"], c["division"], c["name"][:28], c["city"][:22], "sí" if ok else "no", c["manager"]), flush=True)
    json.dump(out, open(os.path.join(ROOT, "data", "clubs_extra.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(crests, open(os.path.join(ROOT, "src", "data", "crests.json"), "w"))
    print("clubes extra:", len(out), "| escudos totales:", len(crests))


if __name__ == "__main__":
    main()
