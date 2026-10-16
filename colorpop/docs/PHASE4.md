# Phase 4 – Progression, Strategie, Bosse & Wortmeister-Momente

Stand: 16.10.2026. Baut auf „Game Feel 2.0“ auf (Energie, Missionen, Fusion, Bossabsicht-Sperre); diese
Systeme wurden übernommen, nicht neu gebaut. Der zuvor nicht committete Stand wurde zuerst gesichert.

## Bestandsaufnahme vor den Änderungen

- Stabil: Engine, Wortsystem (Ziel/Geheim/Blitz), Combo, Energie, Missionen, Rettung, 3 Modi, 127 Tests.
- Lücken: keine Langzeit-Progression, nur 4 Level und 1 Boss, Items fast nur Prozentboni ohne Rollen,
  keine Ausrüstungsvorschau, „Wortmeister“ nur als Schriftzug.
- Im Browser gefunden: Im Ergebnis-Panel überdeckte die Item-Karte den Münzbetrag.

## Progression

| System | Regeln |
| ------ | ------ |
| Spielerlevel | XP bis zum nächsten Level: 80, 120, 160 … (+40 je Stufe). Anzeige in Hauptmenü, Karte, Ergebnis. |
| XP-Quellen | Sieg 40 (Boss 80) beim ersten Abschluss, sonst 15/30 · Sterne × 10 (Wiederholung × 5) · 2 je Geheimwort (max. 10) · Wortmeister-Momente 25–60 · Niederlage nach ≥ 5 Wörtern: 10. Nichts ohne Spielleistung. |
| Levelaufstieg | L2 50 Münzen · L3 Steindesign „Minzdrops“ · L4 80 Münzen · L5 „Pfirsichbrause“ · L6 Item **Zeitsand** · L7 „Mitternacht“ · L8/L9 150 Münzen · L10 „Goldprägung“ |
| Erfolge | Jeder Wortmeister-Moment zählt dauerhaft; beim ersten Mal Münzbonus. „Combo-Rausch“ schaltet die **Combo-Glocke** frei. |
| Kosmetik | 5 Steindesigns (CSS-Variablen auf dem Brett, Spezial-/Feuer-/Eisoptik bleibt eindeutig), Auswahl im Inventar. |
| Karte | 2 Kapitel („Pop-Archipel“, „Frostfeder-Gipfel“) mit je 6 Stationen und Boss am Ende; Kapitel 2 öffnet sich nach Brutzel. |

Doppelte Belohnungen sind ausgeschlossen: `applyRunResult` wird pro beendeter Partie genau einmal
aufgerufen (Sperre in der Spielansicht), Level-Belohnungen hängen am einmaligen Überschreiten einer Stufe,
Erst-Erfolge an `achievements[m]`. Alte Spielstände (4 Level) bleiben freigeschaltet; neue Felder werden
beim Laden validiert (`parseSave`, `loadRun`).

## 12 Level mit Einführungskurve

| # | Level | Typ | Neu eingeführt |
| - | ----- | --- | -------------- |
| 1 | Bonbon-Bucht | Punkte | Wörter verbinden |
| 2 | Zuckerwatte-Steg | 3 Wörter mit 5+ Buchstaben | lange Wörter → Spezialsteine |
| 3 | Kristallklippen | 12 Kristalle befreien | Blockaden |
| 4 | Goldgrotte | 4 Goldsteine sammeln | Gold (höhere Goldrate) |
| 5 | Glutpfad | 10 Feuer löschen | Feuer |
| 6 | **Brutzels Vulkan** | Boss | Bosskampf |
| 7 | Funkenfeld | 3 Spezialsteine auslösen | Spezialsteine gezielt einsetzen |
| 8 | Eisfeuer-Pass | 10 Kristalle (+ Feuer) | erste Kombination zweier Mechaniken |
| 9 | Geheimbibliothek | 6 Geheimwörter | Geheimwörter bewusst suchen |
| 10 | Rußwald | 1200 Punkte mit Ruß-Startblockaden | Ruß |
| 11 | Lange Leitung | 5 lange Wörter + Kristalle | Kombination |
| 12 | **Frostels Eisthron** | Boss | Panzer, 3 Phasen |

Jede Einführung erscheint einmal als Karte vor dem Level (gespeichert in `introsSeen`). Zielwörter
unterstützen das jeweilige Levelziel (durch Feuer, neben Kristallen, über Gold/Spezialsteine, 5+ Buchstaben).

## Item-System: Rollen statt Prozentlisten

9 Items, je mit Rolle (Angriff, Verteidigung, Heilung, Kontrolle, Combo), exaktem Regeltext und Freischaltweg.
Neu und bewusst **mechanisch statt prozentual**:

- **Tauwind** (Kontrolle): Wörter tauen auch diagonal auf, +2 Kraft je befreitem Stein, Eispanzer 40 % schwächer.
- **Combo-Glocke** (Combo): Wiederholungen brechen die Combo nicht, Maximum ×1,8, jede 4. Stufe +1 Energie.
- **Zeitsand** (Kontrolle): Bosse greifen alle 4 statt 3 Wörter an, Level +2 Züge.

Sieben erklärte **Synergien** (z. B. „Freie Bahn“: Tauwind + Wortklinge, „Taktgeber“: Combo-Glocke + Blitzkern)
– keine versteckten Setboni, nur echte Regelwechselwirkungen. Jedes Item, das in einem Zug tatsächlich
beigetragen hat, leuchtet im Slot auf und zeigt seinen Beitrag (z. B. „Tauwind +4“, „Schild −5“, „Combo gehalten“).

**Ausrüstungsvorschau** im Level-Detail: Rollen der drei Slots, aktive Synergien, bei Bossen Charakter,
Phasen, alle Angriffe, drei Taktikhinweise sowie Konter (✓ ausgerüstet / empfehlenswert / noch gesperrt).

Balancing (Bot „casual“, Modus Normal): Alle 84 Dreier-Kombinationen besiegen Brutzel (≥ 60 %, im Test
fixiert); im Mittel je Item 15,5–18,7 Wörter bis zum Sieg. Gegen Frostel entscheidet die Ausrüstung: mit Schild 90 %,
Lebenskristall 81 %, Zeitsand 68 % durchschnittliche Siegquote; Feuerring (Brutzel-Konter) 33 %.

## Bosse

- **Brutzel** (Kapitel 1): unverändert zwei Phasen, Feuer verstärkt Angriffe, Blitzwort betäubt.
- **Frostel, der Schneewicht** (Kapitel 2, neue SVG-Figur mit allen Stimmungen): 300 LP, drei Phasen
  (Schneeball/Eisfleck/Eispanzer → ab 60 % Schneesturm → ab 30 % Lawine). Der **Eispanzer** schluckt
  25 Schaden; wer ihn mit EINEM Wort bricht, betäubt Frostel (Angriff ein Wort später) und erhält
  „Panzerbrecher“. Eingefrorene Steine tauen durch Wörter daneben auf (max. 10 Eissteine).
- Taktische Fragen entstehen dadurch tatsächlich: kurzes Wort jetzt oder Energie/langes Wort für den
  Panzerbruch? Feuer löschen oder angreifen? Schild oder Zeitsand gegen die Lawine?
- Phasenwechsel sperren den bereits angekündigten Angriff (bestehende Regel, auf 3 Phasen verallgemeinert).
- Automatische Brettkorrekturen lösen weiterhin keine Gegneraktion aus und kosten nichts.

Messung (casual, Startausrüstung, Normal): Brutzel Ø 18 Wörter, Ø 44 LP Rest; Frostel Ø 29 Wörter,
Ø 33 LP Rest; Experte: Frostel 75 % Siege, Ø 9 LP Rest.

## Wortmeister-Momente (oberste Belohnungsstufe)

Wortriese (8+ Buchstaben), Dreiklang (3 verschiedene lange Wörter in Folge), Rarität (seltenes Wort ab 7),
Kettenreaktion (12+ Steine), Combo-Rausch (8er-Combo), Panzerbrecher, Finale Wucht (Bosssieg mit
Blitzwort/Spezialstein/40+ Kraft), Unberührt (Bosssieg ohne LP-Verlust).

Abstufung: normale Wörter kurze Zahl/Ton · Ziel/Geheim/Selten eigene Schriftzüge · Momente eigene Karte
mit Fanfare, Lichtblitz und Konfetti, XP und Erfolg. Jeder Moment höchstens einmal pro Partie; mehrere
Momente in einem Zug teilen sich **eine** Karte (stärkster als Titel). Die Karte ist antippbar und
dauert 1,5 s (reduziert: kürzer, ohne Konfetti/Blitz).

## Tests

156 automatisierte Tests (10 Dateien). Neu in `progression.test.ts` (28 Tests): XP-Kurve, einmalige
Levelaufstiegs-Belohnungen, Zeitsand ab Level 6, Erfolge nur einmal mit Münzen, XP nur aus Spielleistung,
`applyRunResult`, Bereinigung manipulierter Progressionsdaten, Freischaltung alter Spielstände, alle
12 Level × 3 Modi starten spielbar, Setups (Ruß/Spezialsteine), neue Levelziele, Frostel (Panzer, Bruch +
Betäubung, Phasen mit Sperre, Einfrieren + kostenlose Rettung), alle Item-Rollen, Tauwind, Combo-Glocke,
Zeitsand, Schild-Meldung, Synergien/Konter, alle Momente, Dreiklang über die Engine, Unberührt, Speichern
und Fortsetzen mit neuen Feldern, ältere Läufe ohne neue Felder.
`balance.test.ts` simuliert jetzt alle 11 Nicht-Boss-Level in Entspannt und Normal (≥ 70 %), alle 84
Item-Kombinationen gegen Brutzel und Frostel-Fairness.

`npm run typecheck`, `npm run lint` (Exit 0, nur bestehende Warnungen im Board), `npm test`,
`npm run build` (Hauptbundle 317 kB, Karte/Inventar/Einstellungen nachgeladen) – alle erfolgreich.

## Tatsächlich durchgeführte Browserprüfungen

- 390 × 844: Hauptmenü mit Spielerlevel, Karte (Kapitel, XP-Leiste, Sterne), Level-Detail mit Einführung,
  Rollen und Synergie, Einführungskarte im Level, Level 2 bis Sieg mit „Dreiklang“, Ergebnis mit Momenten,
  XP, Levelaufstieg und Freischaltungen (keine Überlappung mehr), Bosskampf Frostel: Eispanzer-Anzeige,
  eingefrorene Steine, Schild-Aktivierung, Panzerbruch durch FREIGEBIG, Sieg mit schmelzender Figur.
- 360 × 640: Bosskampf ohne Überhang (Zellen 40 px), zusammengefasste Moment-Karte („Wortriese! + Rarität“),
  Inventar mit Rollen, freigespielter Combo-Glocke und Steindesigns, Level „Eisfeuer-Pass“ im Design „Minzdrops“.
- Produktionsbuild: neuer Spielstand zeigt 11 gesperrte Stationen und Kapitel 2, kein Debug-Hook.

Der Browser-Bereich war während der Prüfung ausgeblendet; Animationen laufen dort gedrosselt. Zwischen-
zustände wurden deshalb teils über den DOM statt per Screenshot bestätigt (z. B. Text der Moment-Karte).
Nicht geprüft: echte Smartphones, Audio-Hörtest, Framerate auf schwachen Geräten. Der Bot-gestützte
Level-Test nutzt die Entwickler-Einstiege (`?playtest=…`), die im Produkt nicht erreichbar sind.

## Bekannte Grenzen / nächste Schritte

- Sehr lange Wörter mit hoher Combo können Bosse in einem Zug stark treffen (z. B. 163 Schaden) – bewusst
  belohnend, aber für Experte ggf. deckeln.
- Begleiterin Pippa bleibt ein Entwurf (siehe `BEGLEITER_KONZEPT.md`).
- Steindesigns sind rein kosmetisch; weitere Kosmetik (Brettrahmen, Effektfarben) wäre ein natürlicher Ausbau.
- Lizenzprüfung der GPL-Wortliste weiterhin offen (siehe `ASSETS.md`).
