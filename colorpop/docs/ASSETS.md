# Assets, Herkunft & Lizenzen

## Wörterbuch (`public/dict/de-words.txt`)

Das Spielwörterbuch ist die **Schnittmenge** zweier unabhängiger Quellen. Ein Wort ist nur gültig, wenn
es in beiden vorkommt – das filtert Tippfehler, Fragmente und Exoten aus beiden Listen heraus.

| Quelle | Inhalt | Lizenz |
| ------ | ------ | ------ |
| igerman98 / de_DE_frami (Björn Jacke, Franz Michael Baumann), bezogen als expandierte Wortliste über das npm-Paket `@cspell/dict-de-de` 4.1.3 | Hunspell-Rechtschreibwörterbuch inkl. aller Flexionsformen | GPL-2.0 oder GPL-3.0 oder OASIS-OGPL (Wörterbuch), Paket LGPL-3.0 |
| `all-the-german-words` 1.1.0 (npm) | ~1,6 Mio. Formen aus de.wiktionary.org und der Letterpress-Wortliste | MIT (Paket); Wiktionary-Inhalte CC BY-SA |
| de.wiktionary.org Kategorien „Vorname/Nachname/Toponym/Eigenname (Deutsch)“ | Sperrliste für reine Eigennamen (siehe unten) | CC BY-SA 4.0 |

Aufbereitung (Build-Skript, einmalig ausgeführt):

1. Nur Einträge aus Buchstaben (A–Z, Ä Ö Ü, ß), höchstens ein Großbuchstabe (entfernt Abkürzungen wie „USA“).
2. Normalisierung: Großschreibung, **ß → SS** (wie im Großsatz üblich); Umlaute bleiben eigene Steine.
3. Länge 3–10 Buchstaben, mindestens ein Vokal (entfernt „LKW“, „KFZ“, „PKW“ …).
4. Schnittmenge beider Quellen.
5. Eigennamen-Filter (`scripts/apply-name-filter.mjs`, Liste `scripts/data/proper-nouns.txt`): Wörter, die
   Wiktionary **nur** als Vorname, Nachname, Ortsname oder Eigenname führt (nicht zusätzlich als Substantiv mit
   Genus, Verb, Adjektiv, Adverb …), sowie ihre Genitiv-s-Form werden entfernt – außer das Hunspell-Wörterbuch
   kennt das Wort auch kleingeschrieben (schützt „alles“, „dir“, „ihm“, „heiß“). „Rose“, „Koch“, „Wolf“ bleiben
   gültig, „Achim“, „Peter“, „Berlin“ nicht. Ergebnis: 3.790 Einträge entfernt, **140.774 Wörter**.

**Hinweis zur Veröffentlichung:** Die GPL-Lizenz des Hunspell-Wörterbuchs erstreckt sich nach gängiger
Auslegung auf die Wortliste als Datei, nicht auf den separat geladenen Programmcode. Vor einer kommerziellen
Veröffentlichung sollte das juristisch geprüft oder die Liste durch eine eigene/lizenzierte ersetzt werden.

## Kuratierte Alltagswörter (`src/game/data/commonWords.ts`)

Eigene, handverlesene Liste (~730 Wörter). Wird für faire Brettgenerierung, Rettung, Bonus-Challenges
und Hinweise genutzt. Jedes Wort ist per Test gegen das Wörterbuch geprüft.

## Schriften

| Schrift | Herkunft | Lizenz |
| ------- | -------- | ------ |
| Fredoka (500/600/700) | `@fontsource/fredoka` | SIL Open Font License 1.1 |
| Nunito (700/800) | `@fontsource/nunito` | SIL Open Font License 1.1 |

Die Schriften werden lokal gebündelt (kein Google-Fonts-Abruf zur Laufzeit).

## Grafiken

Alle Grafiken sind **eigens für dieses Projekt im Code erstellt** (SVG/CSS), es werden keine fremden
Bilddateien verwendet:

- Boss „Brutzel, der Glutkobold“ mit Treffer-, Überraschungs-, Regen-, Ruß- und weiteren Stimmungen (`src/ui/art/Brutzel.tsx`)
- Eigener Begleiter-Entwurf „Pippa, die Wortfalterin“ (`docs/pippa-entwurf.svg`), noch kein finales Spielasset; Briefing in `docs/BEGLEITER_KONZEPT.md`
- Boss „Frostel, der Schneewicht“ mit denselben Stimmungen inkl. Schmelz-Niederlage (`src/ui/art/Frostel.tsx`)
- Icon-Set und 9 Item-Symbole (`src/ui/art/Icons.tsx`)
- 5 Steindesigns als reine Farbwerte (`src/game/progression.ts`) und Kapitel-Inseln der Karte (`src/ui/screens/WorldMap.tsx`)
- Logo aus Spielsteinen (`src/ui/art/Logo.tsx`)
- Hintergründe je Welt und Abenteuerkarte (`src/ui/art/Backdrop.tsx`, `src/ui/screens/WorldMap.tsx`)
- Buchstabensteine, Spezialsteine, Feuer/Eis/Ruß-Overlays (CSS + SVG in `src/index.css`, `Board.tsx`)

Keine Emojis als Spielgrafik. Keine Figuren, Namen oder Oberflächen aus Bookworm, Candy Crush oder Royal Match.

## Sound

Alle Soundeffekte werden zur Laufzeit per WebAudio synthetisiert (`src/audio/sfx.ts`) – keine Audiodateien,
keine Fremdlizenzen.

## Bibliotheken

React 19, motion (Animationen), Tailwind CSS 4, Vite, Vitest, Testing Library – jeweils MIT-Lizenz.
