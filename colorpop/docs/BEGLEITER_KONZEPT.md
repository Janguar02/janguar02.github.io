# Pippa, die Wortfalterin — visueller Entwurf

Pippa sammelt keine Schätze, sondern gute Wortideen. Ihre Silhouette entsteht aus einem
gefalteten, cremefarbenen Lesezeichen: zwei asymmetrische Papierflügel, ein kleiner
mintfarbener Rücken und zwei eingerollte violette Papierfühler. Die Flügelspitzen erinnern
an umgeschlagene Buchseiten. Keine Tierkopie, keine Emoji-Mimik und keine Fantasy-Ausrüstung.

Der eigene SVG-Entwurf in `pippa-entwurf.svg` ist ein **Art-Direction-Entwurf**, kein finales
Spielasset. Er zeigt Ruhe, Entdeckung und Jubel. Er ist bewusst noch nicht ins HUD eingebaut:
Auf 360 × 640 haben Brett, Bossabsicht und Ausrüstung Vorrang.

## Verhalten und Platzierung für eine spätere Integration

- 44–56 px am Rand des Zielbereichs, ohne Überlagerung des Bretts; im Bosskampf höchstens
  eine kleine Reaktion neben der Lebensanzeige.
- Seltenes/langes Wort: Fühler richten sich auf, Flügel öffnen sich für 450 ms.
- Combo-Meilenstein: einmaliges kurzes Klatschen der Papierflügel; keine Dauerschleife.
- Starker Bossangriff: Flügel kurz schützend vor den Körper; keine Warnung zusätzlich zum Telegraphen.
- Knapper Sieg: erst ein erleichtertes Einatmen, dann ein leises Flügelnicken.
- Texte nur bei Bedarf: „Das hat gefunkelt.“, „Ein Wort mit Flügeln.“, „Gerade noch!“
- Einstellungen: **Aus / Still / Lebendig**, standardmäßig Still; Still beschränkt sich auf
  eine wechselnde Pose. Reduzierte Bewegung verwendet statische Posen. Kein Einfluss auf Regeln,
  Zufallsgenerator, Belohnungen oder Bonus-Timer.

## Benötigte Produktionsassets

1. Finales Vektor-Master mit abgestimmten plastischen Papierkanten, Glanz und Kontaktschatten;
   Freigabe in 48 px und auf hellem/dunklem Hintergrund.
2. Getrennte Ebenen für beide Flügel, Körper, Gesicht und Fühler; Pivot-Punkte und sichere Außenmaße.
3. Sechs fertige Posen: Ruhe, Aha, Jubel, Schreck, Erleichterung, Abschiedsgruß.
4. Animationen von 300–600 ms mit identischen Ausgangs-/Endposen; statische Alternativen.
5. Falls Raster verwendet wird: transparente WebP/PNG bei 1×/2×/3×, keine abgeschnittenen Schatten.

Entwurf und Texte wurden für dieses Projekt erstellt. Keine externen Charakterassets oder Lizenzen.
