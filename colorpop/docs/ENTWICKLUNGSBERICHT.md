# Entwicklungsbericht – Color Pop Quest (Vertical Slice v0.1)

**Aktualisierung 16.10.2026:** Die Weiterentwicklung mit 127 Tests, Spezialfusion/Energie,
Missionen, fairen Boss-Phasen und gestaffelter Belohnung ist in [GAMEFEEL_2.md](GAMEFEEL_2.md)
dokumentiert. Die folgenden Abschnitte beschreiben den vorherigen Entwicklungsstand.

## Ausgangslage

Das Projektverzeichnis war leer – es gab kein bestehendes Wortspiel. Das Projekt wurde daher neu mit
**Vite + React 19 + TypeScript (strict) + Tailwind CSS 4** aufgesetzt, ergänzt um `motion` (Animationen)
und Vitest/Testing Library (Tests). Der Projektstand ist per Git versioniert.

## Umfang – was spielbar ist

| Bereich | Status |
| ------- | ------ |
| 6×6-Buchstabenfeld, Verbinden per Ziehen (Touch/Maus) **und** per Antippen | fertig |
| 8-fach-Nachbarschaft, Zurückziehen, keine Doppelnutzung, min. 3 Buchstaben | fertig |
| Deutsches Wörterbuch (140.774 Formen, Umlaute, ß→SS, Flexionen, Eigennamen gefiltert) | fertig |
| Pop-Animation, Fallen (Federphysik), Nachfüllen von oben | fertig |
| Anti-Sackgassen-System (Prüfung nach jedem Zug, 3-stufige Rettung) | fertig |
| Punkte, Längenmultiplikator, Spezialsteine (Bombe, Blitz, Gold), Feuer, Eis, Ruß | fertig |
| Bosskampf „Brutzel, der Glutkobold“ mit 5 Angriffen, Wut-Phase, Ankündigung | fertig |
| 6 Items, Inventar mit exakt 3 Slots, Kauf/Freischaltung | fertig |
| 3 normale Level (Punkte-, Kristall-, Feuerziel) + Bosskampf | fertig |
| Bonuswort-Events mit pausierbarem Countdown | fertig |
| Hauptmenü, Abenteuerkarte, Level-Detail, Spiel, Inventar, Ergebnis, Einstellungen, Pause | fertig |
| Einstiegs-Tutorial (animierte Hand zeigt ein echtes Wort), sanfter Hinweis nach 16 s Inaktivität | fertig |
| Prozeduraler Sound, Sound-/Animationseinstellung, `prefers-reduced-motion` | fertig |
| Lokales Speichern: Fortschritt **und** laufende Partie (Fortsetzen nach Neuladen) | fertig |

Es gibt keine funktionslosen Buttons im Spiel.

## Spielregeln im Detail

**Kraft eines Wortes** = round(Summe der Buchstabenwerte × Längenmultiplikator) + Extras + Item-Boni,
danach × Bonus-Multiplikator. Im Bosskampf ist Kraft = Schaden, in Leveln gibt es Kraft × 10 Punkte.

- Buchstabenwerte: 1 (E N I S R A T D H U L), 2 (G O M B C K W), 3 (F Z P V Ä Ö Ü), 4 (J X Y Q) – als kleine Zahl auf dem Stein.
- Längenmultiplikator: 3 → ×1 · 4 → ×1,25 · 5 → ×1,6 · 6 → ×2 · 7 → ×2,5 · 8+ → ×3 (+0,5 je weiterem Buchstaben).
- 6 Buchstaben → **Bombenstein** (räumt die 8 Nachbarn), 7 → **Blitzstein** (räumt die Reihe), 8+ → beide.
- **Goldstein** (selten im Nachschub, max. 2 auf dem Feld): +2 Kraft und +10 Münzen.
- Spezialsteine lösen Ketten aus, jeder Stein höchstens einmal – deterministisch und begrenzt. Blockierte
  Steine werden von Spezialeffekten nur **befreit**, nicht zerstört.
- **Eis/Ruß**: blockiert; bricht, wenn ein orthogonaler Nachbar entfernt wird.
- **Feuer**: benutzbar; alle 3 Züge springt das älteste Feuer auf einen Nachbarn (max. 8). Jeder brennende
  Stein verstärkt Bossangriffe um +1.

**Boss Brutzel** (220 LP im Modus Normal; Spieler 60 LP): greift nach genau 3 gültigen Wörtern an.
Muster: Funkenspucke (10) → Glutregen (5 + 3 Feuer) → Funkenspucke → Rußwolke (5 + 2 Ruß).
Ab ≤50 % LP **wütend**: Flammenwalze (14) → Feuersturm (6 + 4 Feuer) → Funkenspucke.
Werte gelten für „Normal“; die Modi skalieren LP und Schaden (siehe unten).
Der nächste Angriff steht immer mit Name, Wirkung und Countdown in der Sprechblase; beim letzten Wort davor
pulsiert sie rot („Achtung – gleich!“). Ist der Boss besiegt, greift er nicht mehr an.

**Items** (je exakte Werte im Tooltip):

| Item | Wirkung |
| ---- | ------- |
| Goldenes Alphabet | +1 Kraft je Wert-2-Buchstabe, +2 je Wert-3/4-Buchstabe |
| Wortklinge | +25 % Kraft bei 5–6 Buchstaben, +60 % ab 7 |
| Schutzschild | erlittener Schaden −40 % (aufgerundet, min. 1) – nur im Kampf |
| Feuerring | +4 Kraft je brennendem Stein im Wort; Feuer verstärkt Angriffe nicht mehr |
| Blitzkern | jedes 3. gültige Wort +5 Kraft |
| Lebenskristall | nach jedem 4. gültigen Wort +5 LP – nur im Kampf |

Start-Items: Wortklinge, Schutzschild, Lebenskristall. Belohnungen: Level 1 → Goldenes Alphabet,
Level 2 → Blitzkern, Level 3 → Feuerring (alternativ früher mit Münzen kaufbar). Während eines Levels ist
die Ausrüstung gesperrt (auch in der Engine: `equipItem(..., inFight)` lehnt ab; der Spielzustand kopiert die Ausrüstung).

## Hybrides Wortsystem (Gameplay-Überarbeitung)

| Worttyp | Erkennung | Belohnung |
| ------- | --------- | --------- |
| **Zielwort** | sichtbar in der Zielleiste (Entspannt 3, Normal 2, Experte 0) | normaler Schaden/Punkte, Combo +1 |
| **Geheimwort** | jedes andere neue Wort ab 4 Buchstaben – nie vorab gelistet | +30 % Kraft (min. +2), +2 Münzen, Combo +1 |
| **Seltener Fund** | neues Wort ab 6 Buchstaben (oder ab 5, wenn kein Alltagswort) | +60 % Kraft (min. +4), +5 Münzen, Combo +1 |
| **Blitzwort** | freiwillige Herausforderung mit 12-s-Blitzleiste | 3× Kraft, +8 Münzen; im Kampf wird Brutzel **betäubt** (Angriff 1 Wort später) |
| Wiederholung | bereits gespieltes Wort | keine Extras, Combo zurückgesetzt |
| freies 3er-Wort | neues 3-Buchstaben-Wort | normal, Combo bleibt |

- **Belohnungen nur einmal:** Jedes Wort wird pro Level in `foundWords` vermerkt.
- **Combo:** aufeinanderfolgende Ziel-/Geheimwörter → ×1,1 / ×1,2 / ×1,3 / ×1,4 / max. ×1,5.
- **Zielwörter sind immer erreichbar:** Nach *jeder* Brettveränderung (Schwerkraft, Spezialsteine, Bossangriff,
  Feuer, Rettung) prüft `refreshTargets` alle Ziele per Pfadsuche, ersetzt unerreichbare/gelöste durch
  bildbare Alltagswörter (bevorzugt noch nicht gefundene) und webt notfalls ein Wort in Steine ein, die kein
  anderes Ziel und nicht das Blitzwort benötigen. Das kostet weder Zug noch Münzen noch LP und löst keinen Angriff aus.
- **Zielwörter führen zum Levelziel:** In Feuer- bzw. Kristall-Leveln werden Ziele bevorzugt, die durch
  brennende Steine bzw. neben Kristallen verlaufen.
- **Live-Hilfe ohne Lösung:** Beim Ziehen leuchten die bereits passenden Buchstaben im Ziel-Chip auf;
  ob ein Wort ein Geheimwort ist, bleibt bis zum Abschicken eine Überraschung.

### Schwierigkeitsmodi (ein gemeinsamer Kern, reine Daten in `content.ts`)

| | Entspannt | Normal | Experte |
| - | - | - | - |
| Zielwörter | 3 (3–5 Buchstaben) | 2 (4–6 Buchstaben) | keine |
| Züge | +4 | ± 0 | −2 |
| Levelziele / Sterne | ×0,85 | ×1 | ×1,25 |
| Boss-LP / -Schaden | ×0,75 / ×0,75 | ×1 / ×1 | ×1,2 / ×1,15 |
| Hinweis nach Inaktivität | 2 Buchstaben nach 14 s | 2 Buchstaben nach 14 s | 1 Buchstabe nach 25 s |

Der Modus wird vor dem Level gewählt (Level-Detail oder Einstellungen) und im Spielzustand gespeichert,
damit fortgesetzte Partien konsistent bleiben.

### Buchstabengenerierung

- Gewichte überarbeitet (C seltener, A/O/L häufiger), höchstens 2× C und höchstens 4 „schwere“ Buchstaben
  (Wert ≥ 3 oder C) gleichzeitig.
- Nachfüllen in „Wortform“: Mit 65 % Wahrscheinlichkeit wird ein kurzes Alltagswort entlang neu
  nachgefallener Steine eingewoben (nur neue Steine werden verändert).
- Messung (20 Partien × 25 Züge): spielbare Alltagswörter je Brett vorher Ø 21,2 (Minimum 2),
  nachher Ø 25,5 (Minimum 7).

### Belohnungs-Feedback

Gestaffeltes Platzen in Wortreihenfolge, Partikel und Funkenring, Punkte-Flyups in Worttyp-Farbe,
eigene Banner und Sounds für Ziel / Geheimwort / Seltenen Fund / Blitzwort / Wiederholung, Combo-Anzeige,
Münz-Flyups, weißer Blitz und Konfetti bei langen Wörtern, federndes Einrasten nachgefallener Steine mit
leisem Aufsetz-Sound, hochwertige Blitzleiste mit Energiebalken, großer Siegesmoment („Level geschafft!“ /
„Brutzel besiegt!“ mit Strahlen und doppeltem Konfetti) vor dem Ergebnis-Panel. Alle Effekte respektieren
„Animationen reduziert“ bzw. die System-Einstellung; Sounds sind abschaltbar.

## Anti-Sackgassen-System

Nach **jedem vollständig abgewickelten Zug** (inkl. Bossangriff und Feuerausbreitung) prüft
`ensurePlayable`, ob mindestens **2 Alltagswörter** tatsächlich spielbar sind (blockierte Felder zählen nicht).
Sonst, ohne Kosten für den Spieler (kein Zug, keine Münzen, kein Schaden, Bonus-Timer pausiert):

1. bis zu 8× kostenlos mischen (blockierte Steine bleiben an ihrem Platz),
2. gezielt bis zu 3 Alltagswörter entlang echter Pfade einschreiben,
3. letzte Stufe: Blockaden in zwei Reihen brechen und „HAUS“ + „ROT“ setzen (garantiert lösbar).

Alle Schleifen sind begrenzt (Versuchszähler, DFS-Budget). Der Generator erzeugt keine reinen Zufallsfelder:
Er webt 3 Alltagswörter ein, hält die Vokalquote bei 32–50 % und begrenzt Buchstaben-Häufungen.
Getestet u. a. mit reinen X-/Q-Brettern, komplett vereisten Brettern und 200 zufälligen Müll-Brettern.

## Blitzwörter (Bonus-Events)

Frühestens nach dem 2. Wort, danach in Abständen: ein Alltagswort (4–6 Buchstaben), das **auf dem aktuellen
Brett nachweislich bildbar** ist. Der 12-s-Countdown startet erst, wenn das Banner eingeblendet ist und
läuft nur, solange das Brett ruht, das Spiel nicht pausiert und der Tab sichtbar ist. Lösung → 3× Kraft.
Ablauf → verschwindet ohne Strafe. Wird das Wort durch einen Zug unbildbar, endet das Event ebenfalls straffrei.
Banner und Wortanzeige teilen sich eine Zeile, damit sich das Brett nie verschiebt.

## Balancing

`src/game/simulate.ts` spielt Partien mit Bots („casual“: zufällige Alltagswörter mit 3–5 Buchstaben,
zielbewusst; „strong“: stärkstes Wort ≤ 8 Buchstaben). Ergebnisse (je 30 Seeds) beim Feintuning:

Nach der Gameplay-Überarbeitung (casual-Bot spielt zu 75 % sichtbare Zielwörter, sonst Alltagswörter; je 24 Seeds):

| Modus | Boss mit Startausrüstung | Boss ohne Items | Level 1 / 2 / 3 |
| ----- | ------------------------ | --------------- | --------------- |
| Entspannt | 100 %, Ø 17,5 Wörter, Ø 45 LP Rest | 46 % | 100 / 100 / 96 % |
| Normal | 100 %, Ø 19 Wörter, Ø 40 LP Rest | 13 % | 100 / 92 / 79 % |
| Experte | 100 %, Ø 25 Wörter, Ø 22 LP Rest | 0 % | 92 / 88 / 50 % |

Alle 20 Dreier-Kombinationen (Normal): 100 % Siege, Ø 14,5–18,8 Wörter → keine Kombination dominiert.
Weil Zielwörter + Combo das Spiel deutlich zugänglicher machen, wurde Brutzel von 150 auf 220 LP und die
Angriffe um je +1 angehoben.

Der Test `balance.test.ts` sichert diese Eigenschaften dauerhaft ab.

## Tests (alle automatisiert, `npm test`)

| Datei | Abgedeckt |
| ----- | --------- |
| `core.test.ts` | Wörterbuch (Flexionen, Umlaute, ß, Unsinn/Abkürzungen), Nachbarschaft, Pfadregeln, Doppelnutzung, Schwerkraft & Nachfüllen, Solver |
| `generator.test.ts` | 150 Seeds lösbar, Determinismus, Rettung bei absichtlich unlösbaren/blockierten Brettern, Terminierung |
| `engine.test.ts` | Wortprüfung im Zug, Entfernen, Punkte/Multiplikatoren, Spezialsteine & Ketten, Gold, alle 6 Item-Effekte, 3-Slot-Regel, Boss-KI (Rhythmus, Muster, Ankündigung = Ausführung, Wut, Feuer, Ruß, Schild), Heilung, Sieg/Niederlage, Levelziele, Rettung ohne Kosten, Bonus-Timer |
| `save.test.ts` | Speichern/Laden, kaputte/manipulierte Daten, Storage-Ausfall, Belohnungen, Kauf, Partie fortsetzen (deterministisch) |
| `balance.test.ts` | Bot-Simulation: Boss schaffbar, keine dominante Kombination, Level fair in Entspannt/Normal, Modi korrekt gestaffelt |
| `words.test.ts` | Worttypen, Zielwort-Pools ohne Exoten, Ziele in allen Modi/Leveln immer bildbar (Start + 30 Züge inkl. Boss/Feuer/Rettung), Ersatz unerreichbarer Ziele, Injektion schont andere Ziele, gefundene Wörter nicht erneut als Ziel, Geheimwörter nicht gelistet, Belohnung nur einmal, Boss-Schaden (Ziel/Geheim/Combo/Blitz-Betäubung), Modi-Skalierung, keine Zug-/LP-Kosten durch Korrekturen, Wort-Nachfüllung berührt nur neue Steine |
| `Board.test.tsx` | Eingabe (jsdom): Ziehen, diagonal, Zurückziehen, zu kurz, Tipp-Modus, blockierte Steine |

## Manuelle Prüfung im Browser (tatsächlich durchgeführt)

Im eingebauten Browser mit Pointer-Events (`pointerType: touch`) und echten Klicks:
Hauptmenü → Karte → Level 1 (Ziehen, Tipp-Modus, ungültiges Wort, Spezialstein, Bonus-Event, Sieg)
→ Level 2 (Eis) → Level 3 (Feuer) → Inventar (3-Slot-Sperre, Ablegen/Ausrüsten) → Bosskampf
(Ankündigung, Angriff mit Schild-Reduktion, Bonus 3×, Wut-Phase, Feuer/Ruß) → Sieg; Niederlage-Bildschirm;
Neuladen mitten im Kampf → „Fortsetzen“ stellt den exakten Zustand wieder her; reduzierte Bewegung.
Bildschirmgrößen: 360×640, 375×812, 390×780, 1280×800 – ohne Scrollen im Spielbildschirm.

Während der Tests gefundene und behobene Fehler: veraltete Auswahl bei sehr schnellen Wischgesten,
vorzeitiges Absenden im Tipp-Modus, Layout-Sprung beim Bonus-Banner, Sprechblase verdeckte den Boss,
Umbruch des „Fortsetzen“-Buttons, Toast-Überlauf auf schmalen Geräten, Eigennamen im Wörterbuch.

**Nach der Gameplay-Überarbeitung** zusätzlich im Browser geprüft: Migration einer alten laufenden Partie
(bekommt gültige Ziele), Live-Hervorhebung im Ziel-Chip beim Ziehen, gelöstes Ziel → neues Ziel, Geheimwort
und Seltener Fund mit Banner/Partikeln/Combo, Siegesmoment + erweiterte Ergebnis-Statistik, Modusauswahl im
Level-Detail, vollständiger Bosskampf „Entspannt“ (Blitzwort, Wut-Phase, Sieg), Bosskampf „Normal“ auf
360×640, komplette Runde Level 2 „Experte“ (keine Zielleiste, 12 Züge).
Dabei behoben: dasselbe Wort kam direkt wieder als Ziel; Level-Detail und Ergebnis-Panel waren auf 360×640
nicht scrollbar (Start-Button abgeschnitten); 1-px-Überhang im Spielbildschirm.

Hinweis: Der Browser-Bereich war während der Tests ausgeblendet; dadurch laufen Animationen dort gedrosselt.
Zwischenzustände von Animationen wurden daher teils per DOM-Abfrage statt per Screenshot geprüft.

Nicht geprüft: echte iOS/Android-Hardware (Haptik, Audio-Freigabe, Safe-Areas), Leistung auf Low-End-Geräten.

## Bekannte Grenzen / nächste Schritte

- Wörterbuch: Schnittmenge zweier Quellen plus Eigennamen-Filter; vereinzelt bleiben seltene oder
  fachsprachliche Formen gültig, ebenso Ortsnamen, die Wiktionary mit Genus führt (z. B. „Korea“). Für eine Veröffentlichung Lizenzlage (GPL-Wortliste) klären, siehe ASSETS.md.
- Keine Musik (nur Soundeffekte), keine Haptik außer `navigator.vibrate` auf Android.
- Nur ein Boss und eine Welt; Item-Stufen/Upgrades und weitere Welten sind konzeptionell vorbereitet
  (Level-/Boss-Definitionen sind reine Daten in `content.ts`).
- Kein Server/Cloud-Save (bewusst: lokales Speichern zuerst).
