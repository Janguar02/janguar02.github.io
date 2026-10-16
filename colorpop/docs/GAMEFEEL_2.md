# Game Feel & Reward 2.0 — Arbeitsstand 16.10.2026

## Analyse und Prioritäten

Architektur, Engine, Animationen und Entwicklungsbericht wurden vor den Änderungen gelesen.
Der Ausgangsstand bestand aus 104 erfolgreichen Tests und einem sauberen Git-Arbeitsverzeichnis.
Im Browser wurden zuerst normale Wörter und Zielwörter gespielt; der vollständige Bosskampf
wurde nach den ersten Änderungen geprüft.

Bereits vorhanden: drei Spezialsteinarten, begrenzte deterministische Ketten, Wortklassen,
Combo, Bossmuster mit Wutphase, Zielwort-Reparatur, drei Item-Slots und Ergebnisbildschirm.
Die Schwäche lag in der Gewichtung: mehrere Sounds pro Fund, Konfetti bei gewöhnlichen
Entdeckungen, große Schriftzüge nebeneinander, ein später Erfolgszustand des Ziel-Chips und
ähnliche Animationen für alle Bossangriffe. Außerdem konnte der Wutwechsel einen bereits
angekündigten Angriff austauschen. Die Vorschau unterschätzte Spezialketten.

Prioritäten:

1. Belohnungen gewichten, visuelle Konkurrenz reduzieren, Zielerfolg früher zeigen.
2. Bestehende Spezialsteine erweitern; Vorschau und Auflösung aus denselben Regeln berechnen.
3. Bossabsicht verlässlich halten und Treffer/Angriffe unterscheiden.
4. Eine erfüllbare optionale Mission und verdiente Spezialenergie ergänzen.
5. Abschluss kürzen, Überspringen und direkten nächsten Levelstart ermöglichen.
6. Begleiter als eigenen visuellen Entwurf ausarbeiten, anschließend Regressionen prüfen.

## Umgesetzte Regeln und Darstellung

- Kurze Wörter: kleinere Zahlen, kurze Pop-/Fallfolge. Zielwörter: sofort grüner Chip mit
  Haken, Punkteflug zum Fortschritt und animierter Ersatz. Geheimwörter: Goldakzente und
  eigener Klang. Ab sieben Buchstaben: „WORTMEISTER!“, verstärkte Zahl, kurzer sanfter Impuls.
- Ein großer Belohnungsschriftzug gleichzeitig. Er wird bei einer Spezialkombination ersetzt,
  statt einen zweiten überlappenden Schriftzug einzublenden. Missions-/Energieerfolg steht in
  der Zusatzleiste. Kein Konfetti mehr bei gewöhnlichen Geheim-/Seltenfunden; kein mehrfaches
  Abspielen des Blitzwort-Sounds. Combo-Glow ist begrenzt/entfernt.
- Board-Impulse remounten das Brett nicht mehr. Dadurch werden bestehende Steine beim Treffer
  nicht versehentlich nochmals als neue, von oben einfallende Steine behandelt.
- **Bombe + Blitz im gewählten Wort:** Blitz räumt zusätzlich seine Spalte. Nur zufällig
  mitgeräumte Spezialsteine aktivieren diese Fusion nicht. Normale Ketten bleiben erhalten.
- **Energie (0–5/6):** neues Wort ab sechs Buchstaben oder seltener Fund +2; jede dritte
  Combo-Stufe +1. Bei sechs entsteht ein zusätzlicher Blitzstein im Nachschub, Rest bleibt
  erhalten. Dieser Stein aktiviert sich erst in einem späteren Zug. Wiederholungen erzeugen
  weder Energie noch durch Länge verdiente Spezialsteine.
- **Mission:** höchstens eine, ohne Countdown. Kategorien: Länge, Gold im Wort, Feuer im Wort,
  zwei verschiedene Vokale, drei neue Wörter in Folge. Erfolg gibt sechs Münzen; neue Mission
  frühestens drei Wörter später. Konservative Generierung anhand echter Alltagswortpfade,
  erneute Prüfung nach Rettung und Zielkorrektur. Unmögliche Missionen verfallen ohne Kosten.
- **Boss:** angekündigter Angriff bleibt über den Wutwechsel gesperrt; anschließend beginnt
  das Wutmuster. Starke Treffer ab 25 Kraft werfen Brutzel mit eigener Überraschungsmimik
  zurück. Flammenstoß, Regen und Ruß haben unterschiedliche Bewegungen/Partikelformen.
- **Abschluss:** kurze Siegessequenz mit „Zur Auswertung“, danach schnell gestaffelte Sterne,
  Münzen und Item. Die Ergebnisanimation lässt sich sofort überspringen, die Navigation ist
  immer verfügbar. „Nächstes Level“ startet direkt; Karte/Ausrüstung bleibt erreichbar.
- Speichermigration ergänzt Energie, Missionsfortschritt und Zähler. Ungültige neue Werte
  werden begrenzt/verworfen; ungültige gesperrte Bossangriffe werden entfernt.
- Bereits gefundene Wörter werden nicht erneut zu belohnten Zielen, auch nicht bei einem
  veralteten Ziel in einer fortgesetzten Partie. Wiederholte Blitzwörter geben keinen Bonus.
- Inventar und Einstellungen werden separat geladen. Hauptbundle: rund 498,5 kB minifiziert,
  rund 159,8 kB gzip; keine neue Laufzeitbibliothek.

## Architektur und Sicherheit

`specials.ts` enthält die gemeinsame, rein lesende Kettenauflösung. `previewWordPower` in
`scoring.ts` verwendet sie für die genaue Kraft; dieselbe Berechnung verwendet die Engine.
Die Reihenfolge bleibt Wort → verdiente Belohnungen → alte Spezialsteine → Schwerkraft/
Nachschub/neue Spezialsteine → Boss → Feuer → kostenlose Rettung → Zielprüfung → Missionsprüfung
→ Blitzwortprüfung. Jede Spezialaktivierung ist über eine Menge auf höchstens einmal begrenzt.
Missionen verbrauchen keinen Zufall und verändern keine Buchstaben.

Alle drei Modi und die drei Ausrüstungsslots bleiben erhalten. Die vorhandenen unterschiedlichen
Punkte-, Eis-, Feuer- und Bossziele wurden weiterverwendet. Es wurde keine zweite Engine aufgebaut.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `npm run typecheck` | erfolgreich |
| `npm run lint` | Exit 0, 20 Warnungen aus bestehenden Bereichen; keine Fehler |
| `npm test` | 127 Tests in 9 Dateien erfolgreich |
| `npm run build` | erfolgreich, keine Bundlegrößenwarnung nach Aufteilung |
| `git diff --check` | keine Whitespacefehler; Git meldet nur Zeilenenden-Normalisierung |

Die ursprünglichen 104 Testfälle bleiben erhalten. Zwei Erwartungen wurden bewusst an die
neuen Regeln angepasst: Wut darf den angekündigten Angriff nicht austauschen; ein altes Ziel
darf ein bereits gefundenes Wort nicht nochmals belohnen. Zusätzlich gibt es 23 Tests für
Fusion, Vollbrett-Kette, genaue Kraft inklusive Gold außerhalb des Wortes, begrenzte Energie,
Combo, Missionen, einmalige Belohnungen, Speichermigration, Bossabsicht, Überspringen und
gesperrte Touch-Eingabe während der Auflösung. Die bisherigen Balancing-Tests mit 16 Seeds
und allen 20 Dreier-Ausrüstungen bestehen weiterhin; es wurden keine neuen Gewinnquoten behauptet.

Im Browser mit echten Klick-/Tipp-Eingaben:

- Ausgangsstand: Zielwörter und normale Auflösung in Level 1.
- Normal: Level 1 bis Sieg, Blitzwort, Mission und Alphabet-Freischaltung; direkter Start von Level 2.
- Normal: Level 2 bis Sieg und Blitzkern-Freischaltung; zwischendurch Verlassen/Fortsetzen,
  anschließend identische Stein-IDs, Buchstaben, Spezialsteine und Blockaden bestätigt.
- Normal: vollständiger Bosskampf bis Sieg, Wutphase, Angriffsmuster, Heilung/Schild und drei Slots.
- Normal: Feuerlevel bis 8/10, Feuer-/Gold-/Folgemissionen, Geheimwort mit Bombe und Energie-Blitz.
  Diese Partie wurde zugunsten gezielter Effektprüfungen beendet; kein vollständiger Sieg behauptet.
- Reproduzierbare Entwicklungsszenen: SCHNECKE mit 85 Kraft, „WORTMEISTER!“, anschließend Bombe
  und Blitz im Nachschub; HAUS mit Bombe+Blitz, Vorschau 17 und Kreuzschlag.
- 360 × 640: Boss- und normale Spielansicht ohne horizontalen/vertikalen Überhang nach Korrektur;
  Item-Slots sichtbar. Ergebnisansicht ist scrollbar, Navigation erreichbar. Kreuzschlag-Banner
  liegt vollständig innerhalb der Breite und ersetzt den vorherigen Schriftzug.
- Produktionsbuild wird zusätzlich lokal über `npm run preview` geöffnet. Test-URLs führen dort
  nur zum normalen Hauptmenü; die Entwickler-Szenen sind nicht im Produkt erreichbar.

Keine echte Smartphone-Hardware, keine belastbare Framerate-/Low-End-Messung und kein
subjektiver Hörtest aller Soundmischungen. Browser-Screenshots bestätigen Layout und ausgewählte
Animationszustände, keine lückenlose Frame-für-Frame-Prüfung. Außerhalb der genannten Tests wurde
keine neue Vollrunde in jedem Modus behauptet.

## Begleiter und nächster Produkt-Schritt

Siehe `BEGLEITER_KONZEPT.md` und `pippa-entwurf.svg`: Pippa ist ein eigener Papierfalter-Entwurf
mit Assetbriefing und einem abschaltbaren Integrationskonzept. Noch keine finale Figur im HUD.
Vor einer Integration sind finale, bei 48 px geprüfte Posen und Animationen nötig. Kein externer
Assetdownload, keine neuen Fremdlizenzen.

Der implementierte Stand ist konsistent und getestet. Sinnvolle nächste Produktarbeit: echte
Touch-Geräte und Soundmischung prüfen, anschließend finale Begleiter-Assets produzieren und
abschaltbar integrieren. Die bisher dokumentierte Prüfung der Wörterbuchlizenzen bleibt offen.

## Reproduzierbare Entwickler-Einstiege

Nur bei `npm run dev`:

- `/?playtest=l1` / `l2` / `l3` / `boss1`: direkter Einstieg in ein echtes Level.
- `/?playtest=boss1&scenario=master`: SCHNECKE entlang 0,1,2,3,4,5,10,9.
- `/?playtest=boss1&scenario=chain`: HAUS entlang 0,1,2,3 mit Bombe und Blitz.

Die Eingabe läuft weiterhin über das normale Brett. Diese Szenen dienen der visuellen QA,
nicht dem Balancing. Sie benutzen den normalen lokalen Entwicklungs-Spielstand; für eine
Fortsetzungsprüfung ohne erneuten Szenenstart die URL ohne Parameter öffnen und „Fortsetzen“ wählen.
