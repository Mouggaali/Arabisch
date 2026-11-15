"""Compacte helpers om lesbestanden te schrijven (zelfde schema als CLAUDE.md)."""
import io, json, os

import pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent / "content")
DAR = {"status": "onzeker", "note": "Darija bevestigen."}

def mk(tag, vraag, opties, uitleg, **kw):
    return dict(type="meerkeuze", tag=tag, vraag=vraag, opties=opties, juist=0, uitleg=uitleg, **kw)
def lu(tag, tekst, vraag, opties, uitleg):
    return dict(type="luisteren", tag=tag, tekst=tekst, vraag=vraag, opties=opties, juist=0, uitleg=uitleg)
def iv(tag, zin, nl, wb, ant, uitleg, **kw):
    it = dict(type="invullen", tag=tag, zin=zin, nl=nl, antwoord=ant if isinstance(ant, list) else [ant], uitleg=uitleg)
    if wb: it["woordbank"] = wb
    it.update(kw); return it
def na(tag, bron, ants, uitleg, **kw):
    return dict(type="vertalen", richting="nl-ar", tag=tag, bron=bron, antwoorden=ants if isinstance(ants, list) else [ants], uitleg=uitleg, **kw)
def an(tag, bron, ants, uitleg, **kw):
    return dict(type="vertalen", richting="ar-nl", tag=tag, bron=bron, antwoorden=ants if isinstance(ants, list) else [ants], uitleg=uitleg, **kw)
def sb(tag, opdracht, model, checklist, uitleg, modus="schrijven", woorden=None, minimum=None, **kw):
    """Schrijven/spreken met zelfbeoordeling. model = [(ar, tr, nl), ...]; checklist = ['...', ...]."""
    it = dict(type="schrijven", modus=modus, tag=tag, opdracht=opdracht,
              model=[{"ar": m[0], "tr": m[1], "nl": m[2]} for m in model], checklist=checklist, uitleg=uitleg)
    if woorden: it["woorden"] = woorden
    if minimum: it["minimum"] = minimum
    it.update(kw); return it
def ko(tag, paren, uitleg="Herhaal de woordenlijst."):
    ps = []
    for p in paren:
        d = {"ar": p[0], "nl": p[1]}
        if len(p) > 2: d["woord"] = p[2]
        ps.append(d)
    return dict(type="koppelen", tag=tag, paren=ps, uitleg=uitleg)
def vv(tag, instr, rijen, uitleg, **kw):
    rs = []
    for r in rijen:
        d = {"label": r[0], "antwoord": r[1], "tr": r[2]}
        if len(r) > 3 and r[3]: d["eind"] = True
        rs.append(d)
    return dict(type="vervoegen", tag=tag, instructie=instr, rijen=rs, uitleg=uitleg, **kw)
def od(tag, nl, woorden, uitleg):
    return dict(type="ordenen", tag=tag, nl=nl, woorden=woorden, uitleg=uitleg)

def tekst(*md): return {"type": "tekst", "md": list(md) if len(md) > 1 else md[0]}
def tabel(kop, rijen, ar): return {"type": "tabel", "kop": kop, "rijen": rijen, "arKolommen": ar}
def waarom(md): return {"type": "waarom", "md": md}
def letop(md): return {"type": "letop", "md": md}
def vb(*items):
    out = []
    for i in items:
        d = {"ar": i[0], "tr": i[1], "nl": i[2]}
        if len(i) > 3 and i[3]: d["review"] = {"status": "onzeker", "note": i[3]}
        out.append(d)
    return {"type": "voorbeelden", "items": out}
def gram(titel, *blokken): return {"titel": titel, "blokken": list(blokken)}

def words(lid, rows, darija=False):
    """rows: (ar, tr, nl|[nl], soort[, notitie])"""
    out = []
    for i, r in enumerate(rows, 1):
        d = {"id": f"{lid}-w{i:02d}", "ar": r[0], "tr": r[1], "nl": r[2] if isinstance(r[2], list) else [r[2]], "soort": r[3]}
        if len(r) > 4 and r[4]: d["notitie"] = r[4]
        if darija: d["review"] = dict(DAR)
        out.append(d)
    return out

def w(lid, n): return f"{lid}-w{n:02d}"

def save(j, p, code, typ, titel, thema, leerdoelen, woorden, grammatica, oefeningen, toets, darija=False, woordenUitleg=None, translit=None):
    lid = f"j{j}-p{p}-{code.lower()}"
    d = {"id": lid, "code": code, "type": typ}
    if darija: d["dialect"] = "darija"
    d.update({"titel": titel, "thema": thema, "translitStandaard": bool(darija) if translit is None else translit, "leerdoelen": leerdoelen, "woorden": woorden})
    if woordenUitleg: d["woordenUitleg"] = woordenUitleg
    d.update({"grammatica": grammatica, "oefeningen": [{"titel": t, "items": its} for t, its in oefeningen], "toets": {"drempel": 0.7, "items": toets}})
    folder = f"{ROOT}/jaar-{j}/periode-{p}"
    os.makedirs(folder, exist_ok=True)
    io.open(f"{folder}/{code.lower()}.json", "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    n_t = len(toets); assert 12 <= n_t <= 15 or 30 <= n_t <= 45, (code, n_t)
    print(code, "ok", n_t)
