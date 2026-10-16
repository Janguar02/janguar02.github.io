# Color Pop Quest

Ein farbenfrohes Wort-Puzzle-Abenteuer (Vertical Slice): Buchstaben auf einem 6×6-Feld verbinden,
deutsche Wörter bilden, Steine platzen lassen – und Brutzel, den frechen Glutkobold, besiegen.

## Starten

```bash
npm install
```

```bash
npm run dev
```

| Befehl              | Zweck                                       |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Entwicklungsserver (Vite)                   |
| `npm test`          | Alle automatisierten Tests (Vitest)         |
| `npm run typecheck` | TypeScript-Prüfung                          |
| `npm run build`     | Typecheck + Produktionsbuild nach `dist/`   |
| `npm run preview`   | Produktionsbuild lokal ansehen              |

Der Build ist statisch (`base: './'`) und kann auf jedem Webserver liegen.

## Architektur

```
src/
  game/            reine Spiellogik – kein React, deterministisch, voll getestet
    types.ts         Datenmodell (Tile, Board, GameState, LevelDef, …)
    rng.ts           serialisierbarer Zufallsgenerator (mulberry32)
    dictionary.ts    Wörterbuch: sortiertes Array, Binärsuche + Präfix-Bereiche
    grid.ts          Nachbarschaft (8-fach), Pfadprüfung, Schwerkraft & Nachfüllen
    letters.ts       Buchstabenwerte, gewichtete Nachfüll-Verteilung, Vokal-Balance
    solver.ts        findet alle spielbaren Wörter (DFS mit Präfix-Pruning)
    generator.ts     Brettgenerator + Anti-Sackgassen-Rettung (3 Stufen)
    words.ts         Worttypen (Ziel/Geheim/Selten), Zielwort-Prüfung & -Ersatz, Wort-Nachfüllung
    scoring.ts       Kraft/Schaden, Längenmultiplikator, Item-Boni, Spezialsteine
    items.ts         6 Items, exakte Werte, 3-Slot-Regel
    content.ts       Boss „Brutzel“, 4 Level, Modi (Entspannt/Normal/Experte), Belohnungswerte
    engine.ts        ein kompletter Spielzug → neuer Zustand + Animationsschritte
    save.ts          Spielstand & laufende Partie (localStorage, validiert)
    simulate.ts      Bot für Balancing-Tests
    data/commonWords.ts  kuratierte Alltagswörter (Generierung, Bonus, Hinweise)
  audio/sfx.ts     prozedurale Soundeffekte (WebAudio, keine Audiodateien)
  app/             App-Kontext: Spielstand, Einstellungen, Navigation, Wörterbuch-Laden
  ui/              React-Darstellung
    art/             eigene SVG-Grafiken: Brutzel, Icons, Logo, Hintergründe
    components/      Board (Eingabe & Fallanimation), HUD, Partikel, Ergebnis …
    screens/         Hauptmenü, Karte, Spiel, Inventar, Einstellungen
public/dict/de-words.txt   Wörterbuch (≈140.800 Einträge, wird zur Laufzeit geladen)
```

**Trennung von Logik und Darstellung:** `engine.playWord()` ist eine reine Funktion. Sie liefert den
fertigen Folgezustand und eine geordnete Liste von Schritten (`word`, `clear`, `board`, `bossAttack`,
`rescue`, …). Die UI spielt nur diese Schritte ab – Spielregeln existieren ausschließlich in `src/game`.

Weitere Details: [docs/ENTWICKLUNGSBERICHT.md](docs/ENTWICKLUNGSBERICHT.md) ·
Herkunft & Lizenzen: [docs/ASSETS.md](docs/ASSETS.md)

**Game Feel 2.0:** Gestaffelte Wortbelohnungen, Bombe-Blitz-Kreuzschlag, verdiente Spezialenergie,
eine optionale Wortmission, verlässliche Bossankündigungen und überspringbare Levelabschlüsse.
Regeln, 127 Tests und tatsächlich ausgeführte Browserprüfungen: [docs/GAMEFEEL_2.md](docs/GAMEFEEL_2.md).
Der Begleiter liegt als eigener visueller Entwurf mit Assetbriefing vor.

**Phase 4:** Spielerlevel & XP, 12 Level in 2 Kapiteln, zweiter Boss „Frostel“ (Eispanzer, 3 Phasen),
9 Items mit Rollen und erklärten Synergien, Ausrüstungsvorschau vor Bosskämpfen, Wortmeister-Momente,
Steindesigns. Details, Messwerte und Prüfungen: [docs/PHASE4.md](docs/PHASE4.md).
