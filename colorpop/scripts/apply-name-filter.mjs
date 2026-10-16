// Removes pure proper nouns from the game dictionary.
// scripts/data/proper-nouns.txt was built from de.wiktionary.org categories
// Vorname/Nachname/Toponym/Eigenname (Deutsch), minus every word that Wiktionary also
// lists as a common noun (Substantiv m/f/n), verb, adjective, adverb, … and minus every
// word the Hunspell list contains in lowercase (alles, dir, ihm, heiß …). Genitive -s
// forms of the remaining names are included after the same checks.
// Usage: node scripts/apply-name-filter.mjs
import fs from 'node:fs'

const dictPath = new URL('../public/dict/de-words.txt', import.meta.url)
const names = new Set(fs.readFileSync(new URL('./data/proper-nouns.txt', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean))
const commonSrc = fs.readFileSync(new URL('../src/game/data/commonWords.ts', import.meta.url), 'utf8')
const common = new Set(commonSrc.split('`')[1].split(/\s+/).filter(Boolean))

const words = fs.readFileSync(dictPath, 'utf8').split(/\r?\n/).filter(Boolean)
const kept = words.filter((w) => common.has(w) || !names.has(w))
fs.writeFileSync(dictPath, kept.join('\n') + '\n')
console.log(`removed ${words.length - kept.length} proper nouns, ${kept.length} words remain`)
