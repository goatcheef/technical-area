#!/usr/bin/env python3
"""Descarga los escudos (miniatura PNG) de cada club desde Wikimedia y genera src/data/crests.json."""
import base64, json, os, re, subprocess, time, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "User-Agent: football-sim-data-import/0.1 (personal hobby project)"
clubs = json.load(open(os.path.join(ROOT, "data", "clubs_raw.json"), encoding="utf-8"))
os.makedirs(os.path.join(ROOT, "data", "crests"), exist_ok=True)
out, missing = {}, []
for i, c in enumerate(clubs, 1):
    fn = os.path.join(ROOT, "data", "raw", re.sub(r"[^\w]+", "_", c["wiki"]) + ".wiki")
    txt = open(fn, encoding="utf-8").read()[:6000]
    m = re.search(r"^\s*\|\s*(?:Imagen principal|[Ee]scudo|[Ii]magen)\s*=\s*(?:\[\[)?(?:Archivo:|File:|Imagen:)?([^|\]\n]+\.(?:svg|png|jpg|jpeg|gif))", txt, re.M | re.I)
    dst = os.path.join(ROOT, "data", "crests", "%d.png" % i)
    if not (os.path.exists(dst) and os.path.getsize(dst) > 500):
        if not m:
            missing.append(c["name"]); continue
        name = m.group(1).strip().replace(" ", "_")
        url = "https://es.wikipedia.org/wiki/Especial:FilePath/" + urllib.parse.quote(name) + "?width=128"
        for attempt in range(3):
            subprocess.run(["curl", "-sS", "-m", "40", "-L", "-H", UA, "-o", dst, url], capture_output=True)
            time.sleep(1.2)
            head = open(dst, "rb").read(8) if os.path.exists(dst) else b""
            if head[:4] in (b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1", b"GIF8") or head[:3] == b"\xff\xd8\xff":
                break
            time.sleep(4)
        else:
            if os.path.exists(dst): os.remove(dst)
            missing.append(c["name"] + " (" + name + ")"); continue
    data = open(dst, "rb").read()
    mime = "image/png" if data[:4] == b"\x89PNG" else "image/jpeg" if data[:2] == b"\xff\xd8" else "image/gif"
    out[i] = "data:%s;base64,%s" % (mime, base64.b64encode(data).decode())
json.dump(out, open(os.path.join(ROOT, "src", "data", "crests.json"), "w"))
print("escudos:", len(out), "| faltan:", missing, "| KB:", sum(len(v) for v in out.values()) // 1024)
