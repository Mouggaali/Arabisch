import io, json, re, sys
def addw(path, rows):
    d = json.load(io.open(path, encoding='utf-8'))
    n = max([int(re.search(r'w(\d+)$', w['id']).group(1)) for w in d['woorden']] + [0])
    for r in rows:
        n += 1
        x = {"id": f"{d['id']}-w{n:02d}", "ar": r[0], "tr": r[1], "nl": r[2] if isinstance(r[2], list) else [r[2]], "soort": r[3]}
        if len(r) > 4: x["notitie"] = r[4]
        if d.get('dialect') == 'darija': x["review"] = {"status": "onzeker", "note": "Darija bevestigen."}
        d['woorden'].append(x)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
