# Verwijdert woordkaarten die de validator als dubbel meldt (uit de nieuwere les)
# en haalt verwijzingen ernaar weg. Draai vanuit de projectmap.
import io, json, glob, re, subprocess

out = subprocess.run(["node", "tools/validate.mjs"], capture_output=True, text=True, encoding="utf-8").stdout
dups = re.findall(r"^(\w+): woord (.+?) staat ook in", out, re.M)
files = {}
for p in glob.glob("content/jaar-*/periode-*/*.json"):
    code = re.search(r"([a-z]+\d+)\.json$", p).group(1).upper()
    files[code] = p
gone = set()
for code, ar in dups:
    p = files[code]
    d = json.load(io.open(p, encoding="utf-8"))
    gone |= {w["id"] for w in d["woorden"] if w["ar"] == ar}
    d["woorden"] = [w for w in d["woorden"] if w["ar"] != ar]
    io.open(p, "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

def walk(o):
    if isinstance(o, dict):
        if o.get("woord") in gone:
            del o["woord"]
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)

for p in files.values():
    d = json.load(io.open(p, encoding="utf-8"))
    before = json.dumps(d, ensure_ascii=False)
    walk(d)
    if json.dumps(d, ensure_ascii=False) != before:
        io.open(p, "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
print("verwijderd:", len(gone), sorted(gone))
