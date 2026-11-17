# CLAUDE.md: Darb, Arabische leeromgeving

Interactieve leermethode Arabisch voor een Nederlandstalige leerling: schrift beheerst, A0 voor grammatica en woordenschat, doel minimaal B1.
Opgezet als schoolmethode, met een vaste lesopbouw, een systematische grammaticalijn, thematische woordenschat en veel herhaling.
**Alle UI-teksten, uitleg en vertalingen zijn Nederlands.**

## Vastgelegde keuzes (stap 1, 2026-11-01)
| Onderwerp | Keuze |
|---|---|
| Variant | **Fusha** als hoofdspoor, met een **Marokkaans Darija**-spoor vanaf jaar 1 periode 3 (D-lessen) |
| Techniek | Vanilla HTML, CSS en JS (ES-modules), **geen build-stap en geen backend**. Voortgang in `localStorage` met export en import (JSON). Lokale server via `start.bat` |
| Tijd | 5–7 uur per week. Ongeveer 1,5 eenheid per week, 40 studieweken per jaar. B1 na 3 jaar |
| Transliteratie | **Optioneel.** Instelling `auto` volgt de les (`translitStandaard`): aan in jaar 1 periode 1–2, daarna uit. Bij Darija altijd aan |
| Design | `scroll-glass`-skill (liquid glass). Grammatica: *live surface*. Engine en glas staan in `vendor/` |

Het leerplan staat in **`leerplan.md`** (goedgekeurd). Wijzig de opbouw alleen daar en draai daarna de generator (zie hieronder). Leg elke wijziging vast in het wijzigingslog onderaan `leerplan.md`.

## Starten
- **Online:** https://mouggaali.github.io/Arabisch/ (GitHub Pages, repository `Mouggaali/Arabisch`). Installeerbaar als app en offline bruikbaar.
- **Lokaal:** dubbelklik `start.bat`. Dat start `py -m http.server 8080` en opent http://localhost:8080.
- Een server is nodig: browsers blokkeren `fetch()` van lesbestanden via `file://`.
- In Claude Code: `.claude/launch.json` → configuratie `darb`.
- Na het wijzigen van een bestand cacht de browser soms de oude versie. Doe dan `await fetch(pad, {cache:'reload'})` voor elk gewijzigd bestand, of een harde refresh.
- Voortgang staat per adres in de browser: localhost en de online versie delen niets. Gebruik export/import in Instellingen.

## Online, offline en publiceren
- `sw.js` (service worker):
  - De app-schil gaat in productie cache-first.
  - `content/` gaat stale-while-revalidate (cache `darb-content`).
  - Google Fonts gaan in een runtimecache.
  - Lokaal (`VERSION = 'dev'`) gaat alles network-first, zodat wijzigingen direct zichtbaar zijn.
- `js/app.js` registreert de service worker alleen over https of op localhost. Bij een nieuwe versie verschijnt een toast met "Herladen".
- Instellingen → "Alle lessen offline beschikbaar maken" zet alle lesbestanden in `darb-content`.
- `node tools/build-dist.mjs` bouwt `dist/`:
  - Alleen de app, zonder `tools/`, `leerplan.md` en `CLAUDE.md`.
  - Stempelt `VERSION` (een hash) en `SHELL` in `sw.js`.
  - `dist/` staat in `.gitignore`.
- **Publiceren:** `publiceer.bat` controleert de inhoud, commit en pusht naar `main`. Daarna bouwt `.github/workflows/pages.yml` de site en publiceert hem. Eenmalig nodig: Settings → Pages → Source "GitHub Actions".
- Iconen staan in `icons/` (zellige-ster, gegenereerd met Pillow). Het manifest is `manifest.webmanifest`.
- **Herinnering:** Instellingen → Herinnering. Er is geen server, dus er is geen push.
  - `app.js` (`syncReminder`) schrijft de laatste oefendag, de reeks en de instelling naar cache `darb-status`, en registreert `periodicSync` `darb-herinnering`.
  - `sw.js` toont bij `periodicsync` een melding als er vandaag nog niet geoefend is. Een `notificationclick` opent `#/kaarten`.
  - Werkt alleen in Chrome op Android met de app geïnstalleerd. Elders is er alleen een testmelding.

## Mappenstructuur
```
index.html              schil: .world (licht), main#view; laadt vendor + js/app.js; manifest + iconen
start.bat               lokale server + browser
publiceer.bat           inhoud controleren, commit en push → GitHub Pages
sw.js                   service worker (offline, installeerbaar); manifest.webmanifest; icons/
.github/workflows/pages.yml   bouwt dist/ en publiceert op GitHub Pages bij een push naar main
leerplan.md             bron van waarheid voor de opbouw (jaren, periodes, eenheden)
vendor/                 scrollcraft.css/js (MIT, NIET bewerken) + glass.css/js + LICENSE-scrollcraft.txt
css/app.css             eigen thema (tokens), componenten, Arabische typografie
js/
  app.js                opstart, hash-router, rail/tabbalk, badge
  core/                 GEEN DOM-weergave (behalve util.h/toast)
    util.js             h() elementbouwer, ar()/tr(), rich() (mini-opmaak), bidi(), icon(), datums
    store.js            ENIGE module die localStorage aanraakt (sleutel arabisch.v1, versie + migrate)
    content.js          laadt content/*.json (curriculum, lessen, werkwoorden), cache
    arabic.js           normaliseren/vergelijken (harakat, hamza-hints, eindklinker), Nederlands vergelijken
    srs.js              SM-2 spaced repetition (kaarten, dueToday, grade, lapseWord)
    speech.js           Web Speech API (Arabische stem kiezen, fallback)
    conjugate.js        generator māḍī/muḍāriʿ/manṣūb/majzūm/gebiedende wijs (amr) voor regelmatige werkwoorden van vorm I–VIII en X; expliciete tabellen (vormen) voor zwakke werkwoorden
  ui/                   components.js (playButton, answerField, textArea, meter, reviewFlag), keyboard.js,
                        world.js (signature), translit.js, theme.js
  exercises/            één module per oefentype + runner.js (feedback, toetsmodus, score)
  views/                today (dagdoel, reeks, weekplanning), lessons, lesson (diepe links #/les/<id>/<onderdeel>/<woord-id|grammatica-nr>),
                        flashcards, trainer (#/trainer/<werkwoord>), progress (planning), settings (+ controlelijst), search (#/zoeken/<term>),
                        progress-model.js (afgeleide cijfers, geen DOM)
content/
  curriculum.json       GEGENEREERD uit leerplan.md, niet met de hand bewerken
  tags.json             labels van grammatica-tags (voor dashboard en toetsuitslag)
  werkwoorden.json      werkwoorden voor de trainer
  zoekindex.json        GEGENEREERD door tools/build-search-index.mjs (woorden, grammatica, lessen, werkwoorden), niet met de hand bewerken
  jaar-<j>/periode-<p>/<code>.json   uitgewerkte eenheden, bijv. jaar-1/periode-1/l01.json
tools/build-curriculum.mjs   leerplan.md + content/tags.json → content/curriculum.json
tools/selftest.js            browsertest: run() (alles goed), runFout() (alles fout: feedback, uitleg, tag, flashcard), runTrainer(), ids()
tools/build-dist.mjs         bouwt dist/ voor publicatie en stempelt de cacheversie in sw.js (bouwt eerst de zoekindex opnieuw)
tools/build-search-index.mjs content/*.json → content/zoekindex.json; draai na het wijzigen van lesinhoud
tools/validate.mjs           structuurcontrole van alle lesbestanden (node tools/validate.mjs)
tools/serve.mjs              statische server voor dist/ (+ tools/selftest.js) voor de Playwright-tests
tests/darb.spec.mjs          Playwright-browsertests; playwright.config.mjs, package.json (alleen voor de tests)
tools/dedupe-words.py        verwijdert woordkaarten die validate.mjs als dubbel meldt uit de nieuwere les, plus verwijzingen ernaar (py tools/dedupe-words.py)
tools/lesson_lib.py          Python-helpers om lesbestanden compact te genereren (mk, iv, vv, words, save …)
tools/add_words.py           voegt woordkaarten toe aan een bestaand lesbestand (na dedupe)
```

## Lesinhoud toevoegen (fase 4)
1. Maak `content/jaar-<j>/periode-<p>/<code>.json`, bijvoorbeeld `l02.json`, `h01.json`, `d01.json` of `pt1.json`.
   - Gebruik `l01.json` als sjabloon.
   - Het id is `j<j>-p<p>-<code>`, bijvoorbeeld `j1-p1-l02`.
2. Voeg nieuwe grammatica-tags toe aan `content/tags.json`.
3. Draai `node tools/build-curriculum.mjs`. De eenheid krijgt dan `bestand` en is te openen in de app.
4. Controleer in de browser:
   - alle vier de onderdelen
   - elke oefenset, zowel goed als fout beantwoord
   - de toets
   - de controlelijst

### Schema van een lesbestand
```jsonc
{
  "id": "j1-p1-l01", "code": "L01", "type": "les",       // les | herhaling | darija | periodetoets | evaluatie
  "titel": "...", "thema": "...", "translitStandaard": true, "dialect": "fusha",   // "darija" bij D-lessen
  "leerdoelen": ["... (zonder 'Ik kan')"],
  "woorden": [{ "id": "j1-p1-l01-w01", "ar": "...", "tr": "...", "nl": ["..."], "soort": "...", "notitie": "...", "review": {...} }],
  "grammatica": [{ "titel": "...", "blokken": [
      { "type": "tekst", "md": ["alinea", "..."] },
      { "type": "tabel", "kop": [...], "rijen": [["ar|translit", "nl", ...]], "arKolommen": [0, 2] },
      { "type": "voorbeelden", "items": [{ "ar", "tr", "nl" }] },
      { "type": "waarom", "md": "..." },   // het WAAROM achter de regel, verplicht bij elk grammaticapunt
      { "type": "letop", "md": "..." } ] }],
  "oefeningen": [{ "titel": "...", "items": [ <oefen-item> ] }],
  "toets": { "drempel": 0.7, "items": [ <oefen-item> ] }
}
```
In tekstvelden is de mini-opmaak toegestaan:
- `**vet**`
- `*cursief*`
- `{ar|عربي}` voor Arabisch in een Nederlandse zin
- `{tr|...}` voor transliteratie

### Oefentypes (elk item heeft `type`, `tag`, `uitleg`; optioneel `woord` = woord-id dat bij een fout terugkomt in de flashcards)
| type | velden |
|---|---|
| `meerkeuze` | `vraag`, `ar?`, `tr?`, `opties[]`, `juist` (index) |
| `luisteren` | `vraag`, `tekst` (wordt uitgesproken), `opties[]`, `juist` |
| `invullen` | `zin` met `___`, `nl?`, `tr?`, `antwoord[]`, `woordbank?[]` |
| `vertalen` | `richting` `nl-ar`/`ar-nl`, `bron`, `tr?`, `antwoorden[]` (alle goede varianten!) |
| `vervoegen` | `instructie`, `rijen[{label, ar?, antwoord, tr?}]` **of** `werkwoord` + `tijd` + `personen?` |
| `koppelen` | `paren[{ar, nl, woord?}]` (4–6 paren) |
| `ordenen` | `woorden[]` in de juiste volgorde, `nl`, `ook?[[...]]` voor alternatieve volgordes |
| `schrijven` | zelfbeoordeling: `modus` `schrijven`/`spreken`, `opdracht`, `woorden?[]`, `minimum?` (woorden), `model[{ar,tr,nl}]`, `checklist[]` (≥ 3). Goed bij ≥ 70% afgevinkt. Alleen in oefensets (set "Zelf schrijven" / "Zelf spreken"), nooit in de toets; telt niet mee voor de 5 oefenvormen. Helper `sb()` in `tools/lesson_lib.py` |

**Opties bij het nakijken:**
- `eind: true` geldt voor vormen die alleen in de eindklinker verschillen (حالُكَ / حالُكِ). Dan moet ook die klinker kloppen.
- `streng: true` dwingt een volledige vergelijking af, inclusief harakat.

**Standaard bij het nakijken:**
- Arabisch wordt vergeleken zonder harakat.
- Hamza-, ة- en ى-fouten zijn fout, met een gerichte hint.

**Eisen per les:**
- Elke les gebruikt minimaal 5 van de 8 automatisch nagekeken oefenvormen (vertalen telt in beide richtingen). `schrijven` telt niet mee.
- Een toets heeft 12–15 items.

## Arabische conventies (kwaliteitseisen)
- **Volledige vocalisatie** in jaar 1 en 2. Controleer elk woord op spelling, harakat, shadda en hamza.
- **Transliteratie** volgens DIN 31635 met j voor ج: ʾ ṯ j ḥ ḫ ḏ š ṣ ḍ ṭ ẓ ʿ ġ q, lange klinkers ā ī ū, lidwoord geassimileerd (aš-šams).
  - Woordenlijsten gebruiken de pausavorm (bi-ḫayr).
  - Voorbeeldzinnen gebruiken de volledige uitspraak (bi-ḫayrin).
  - Darija gebruikt hetzelfde systeem, met ə.
- **Onzeker = markeren, nooit gokken.** Zet `"review": { "status": "onzeker", "note": "wat er gecontroleerd moet worden" }` op het woord, voorbeeld of item.
  - Het item verschijnt dan in de app op de pagina **Controlelijst** (`#/controle`).
  - **Alle Darija-inhoud** krijgt standaard een review-markering.
- Verzin geen regels of vertalingen. Twijfel je over een regionale variant, noem de standaard (MSA) en markeer de rest.
- De vervoegingsgenerator (`core/conjugate.js`) dekt alleen **regelmatige werkwoorden van vorm I–VIII en X** (veld `vorm`; vorm I heeft ook `madi`/`mudari`-stamklinkers) waarvan de 3e wortelletter geen ت of ن is. Vorm VIII met assimilatie (اِتَّصَلَ، اِضْطَرَبَ) en vorm IX horen een expliciete tabel te krijgen.
  - Zwakke werkwoorden, hamza-werkwoorden (behalve de hamza van vorm IV), verdubbelde werkwoorden en werkwoorden met assimilatie krijgen in `werkwoorden.json` een veld `vormen: { madi: {ana:{ar,tr},...}, mudari: {...} }`, plus `zwak` (hol, defectief, …) en `notitie`.
  - De generator gebruikt dat veld automatisch.
  - Een persoon mag `alt: [...]` hebben: spellingvarianten die ook goed zijn (قَرَؤوا ~ قَرَأُوا).
  - `validate.mjs` eist bij `vormen` beide tijden met alle 13 personen.
  - Er zijn 23 zwakke werkwoorden, gegenereerd met een script uit de sessie van 2026-11-15. Pas bij correcties de JSON direct aan en draai daarna `runTrainer()`.
  - Wijzen in `TENSES`: `madi`, `mudari`, `mansub`, `majzum` en `amr` (alleen de 2e personen).
    - Bij regelmatige werkwoorden leidt `conjugate.js` manṣūb, majzūm en amr af van de muḍāriʿ.
    - Zwakke werkwoorden hebben voor elke wijs een eigen tabel in `vormen`.
    - Een onbekende tijd geeft een fout. Een zwak werkwoord zonder tabel geeft lege vormen.

## Architectuurafspraken
- **Inhoud ≠ code.** Geen Arabische lesinhoud in JS. Nieuwe inhoud vraagt geen codewijziging.
- **Voortgang ≠ inhoud.** `store.js` bewaart alleen id's, scores, SRS-kaarten (met een kopie van ar/tr/nl, zodat flashcards zonder de lesbestanden werken) en tags.
  - Verandert het formaat, verhoog dan `VERSION` en schrijf een stap in `migrate()`.
- **Views** schrijven alleen naar `main`. Afgeleide cijfers horen in `progress-model.js`.
- **Oefentype toevoegen:**
  1. Maak een module in `js/exercises/` met `render(item, ctx) → { el, ready(), check() → {ok, gegeven, juist, hint?, deels?}, focus?, autoSubmit? }`.
  2. Registreer de module in `TYPES` in `runner.js`.
  3. Documenteer de module in de tabel hierboven.
- `h()` slaat `null`/`false` over, maar `Element.replaceChildren()` doet dat niet. Geef daar `''` mee in plaats van `null`.
- Voor Nederlandse tekst met losse Arabische stukken: gebruik `rich()` met `{ar|...}`, of `bidi()` voor platte tekst. Anders loopt de leesrichting door elkaar.
- Arabisch altijd met `lang="ar" dir="rtl"`. Het lettertype is Noto Naskh Arabic, met Amiri en Traditional Arabic als fallback. Gebruik een ruime regelafstand (≥ 1.9), zodat harakat niet botsen.

## Design (scroll-glass)
- **Grammatica:** live surface.
  - Glazen rail links op desktop, glazen tabbalk onderaan op telefoon (< 860 px).
  - Capsules rechtsboven: transliteratie, toetsenbord, instellingen.
- **Signature (`ui/world.js`):** vier lichten achter het glas, één per lesonderdeel.
  | Onderdeel | Kleur |
  |---|---|
  | woordenschat | blauw |
  | grammatica | saffraan |
  | oefenen | roze |
  | toets | koraal |
  - Het licht van het actieve onderdeel glijdt achter het paneel waar je werkt.
  - Na een antwoord kleurt het kort groen of rood.
  - Op het dashboard is de grootte van een licht de beheersing van dat onderdeel.
- **Kleuren:** één accent (zellige-turkoois). Lesdeel-kleuren en goed/fout zijn datakleuren.
- **Regels:**
  - Nooit glas in glas.
  - Velden zijn ingelaten (`.answer-field`, `.inset`).
  - Geen `data-sc-cue`/`data-sc-reveal` om glas heen.
  - Hover alleen bij `(hover: hover)`.
  - `prefers-reduced-motion` wordt gerespecteerd.

## Fasen en status
| Fase | Inhoud | Status |
|---|---|---|
| 1 | Vier vragen (variant, techniek, tijd, transliteratie) | ✔ 2026-11-01 |
| 2 | `leerplan.md` (3 jaar, 12 periodes, 228 eenheden) | ✔ goedgekeurd 2026-11-01 |
| 3 | Skelet + volledige voorbeeldles L01 + trainer + flashcards + dashboard | ✔ 2026-11-01, getest in de browser (desktop, 375 px, licht/donker) |
| 4 | Overige lessen, blok voor blok, met een controle na elk blok | ✔ 2026-11-03. Alle 228 eenheden uitgewerkt (144 lessen, 36 herhalingen, 30 Darija, 12 periodetoetsen, 6 niveau-evaluaties; ± 2.990 woordkaarten), gevalideerd en elk blok automatisch getest (100%). 684 onderdelen gemarkeerd op de controlelijst voor een moedertaalspreker |

**Automatische inhoudstest (na elk blok):** draai in de browserconsole `const t = await import('/tools/selftest.js'); await t.run(['j1-p1-l05', ...])`. Elk oefen- en toetsitem wordt dan met het juiste antwoord uit het JSON-bestand beantwoord, en elk item moet "Goed!" geven. Zo vang je antwoorden die de normalisatie niet herkent (leestekens, hamza, eindklinker).
- `await t.runFout(await t.ids({ jaar: 1, periode: 2 }))` beantwoordt alles fout en controleert:
  - "Niet goed"
  - de uitleg in de feedback
  - de tag-fout (+1)
  - dat het woord terugkomt in de flashcards (vervaldatum vandaag, lagere ef)
  - in de toets: ✗ met de uitleg

  De voortgang wordt vooraf bewaard en achteraf teruggezet.
- `await t.runTrainer()` controleert alle werkwoorden van de trainer.

**Browsertests met Playwright** (`tests/darb.spec.mjs`, `playwright.config.mjs`, `tools/serve.mjs`):
- Ze testen de gebouwde versie (`dist/`, met service worker), op poort 4173.
- Eenmalig installeren: `npm install` en `npx playwright install chromium webkit firefox`.
- `npx playwright test` draait een steekproef van 5 eenheden in Chromium, Safari/WebKit (iPhone 13) en Firefox (± 4 min):
  - alle pagina's zonder consolefouten en zonder horizontaal scrollen op 375 px
  - zoeken en een diepe link
  - `run`/`runFout` op de steekproef
  - `runTrainer`
  - offline na "Alle lessen offline beschikbaar maken" (alleen Chromium)
- `DARB_FULL=1 npx playwright test --project=chromium` test alle 228 eenheden (PowerShell: `$env:DARB_FULL=1`). Dat duurt een paar uur.
- **In GitHub Actions:**
  - `pages.yml` draait de steekproef vóór elke publicatie. Slaagt die niet, dan wordt er niet gepubliceerd.
  - `tests-volledig.yml` draait elke maandag om 03:00 UTC de volledige test. Hij is ook met de hand te starten.
  - Het verslag staat als artefact bij de run.

**Controle na elke ontwikkelfase:**
- Lessen worden correct weergegeven.
- Elk oefentype geeft de juiste feedback, zowel bij goed als bij fout.
- Toetsscores worden opgeslagen en de voortgang blijft na herladen behouden.
- Flashcards en SRS werken.
- RTL en harakat zijn correct.
- Mobiel (375 px) zonder horizontaal scrollen.
- Console zonder fouten.
- Controlelijst bijgewerkt.

**Bekende beperkingen:**
- Audio werkt alleen als het systeem of de browser een Arabische stem heeft. Zonder stem tonen de luisteroefeningen de tekst als terugval.
- Darija-TTS is onbetrouwbaar.
