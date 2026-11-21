# Where every sound and note comes from

The goal is music anyone can use anywhere, games included, with no royalties
and no attribution required. So the generator ships **no samples, no loops
and no recordings**. Everything you hear is made at play time from code in
this repository, and everything the composer writes comes from rules and a
random seed.

| What | Source | Licence |
| --- | --- | --- |
| Drums (kick, snare, clap, rim, hats, shaker, toms, taiko, crash, chip drums) | Synthesised from oscillators and generated noise, `src/instruments.js` | MIT (this repo) |
| Instruments (basses, pads, e-piano, stabs, plucks, leads, bells, strings, chip voices) | Subtractive and FM synthesis, `src/instruments.js` | MIT (this repo) |
| Ambience (rain, wind, ocean, birds, night, fire, vinyl, city) | Generated noise beds plus randomly timed synthetic events, `src/ambient.js` | MIT (this repo) |
| Reverb | Impulse response generated at run time (decaying filtered noise), `src/engine.js` | MIT (this repo) |
| Styles, drum and bass patterns, chord progressions | Written for this project as rules and pattern strings, `src/styles.js`. Short rhythmic patterns and chord progressions such as I–V–vi–IV are common musical building blocks, not owned melodies. | MIT (this repo) |
| Melodies (`src/themes.js`) | Phrases of public-domain tunes, written out by ear for this project (no published edition, arrangement or recording was copied) and set in 4/4. The composer plays a phrase in the tune's own mode, puts its own chords under it and varies it. | Public domain melodies; the encoding is MIT |

Melodies in detail:

| Seed | Work | Why it is public domain |
| --- | --- | --- |
| ODE TO JOY | Ludwig van Beethoven, Symphony No. 9 (1824) | Composer died 1827 |
| FRERE JACQUES | Traditional French round, 18th century | Traditional |
| GREENSLEEVES | Traditional English, 16th century | Traditional |
| SCARBOROUGH FAIR | Traditional English ballad | Traditional (the seed is not taken from any modern arrangement) |
| MOUNTAIN KING | Edvard Grieg, Peer Gynt (1875) | Composer died 1907 |
| GYMNOPEDIE | Erik Satie, Gymnopédie No. 1 (1888) | Composer died 1925 |
| SWAN THEME | P. I. Tchaikovsky, Swan Lake (1876) | Composer died 1893 |
| AMAZING GRACE | Hymn tune "New Britain", American, first printed 1829 | Traditional, published before 1900 (the tune only; no lyrics are used) |
| CANON | Johann Pachelbel, Canon in D (c. 1680) | Composer died 1706 |
| MORNING MOOD | Edvard Grieg, Peer Gynt (1875) | Composer died 1907 |
| WHEN THE SAINTS | Traditional American spiritual | Traditional (not taken from any recorded arrangement) |
| AULD LANG SYNE | Traditional Scottish air, 18th century | Traditional |

## Symphony (`symphony.html`)

The symphony page is the one exception to "no samples": it plays real
orchestral recordings, and they are public domain.

| What | Source | Licence |
| --- | --- | --- |
| Orchestra samples (`samples/vsco2/`: string sections, solo contrabass, horn, trumpet, trombone, tuba, flute, oboe, clarinet, bassoon, harp, glockenspiel, timpani, cymbals, bass drum, snare, gong, triangle) | [VS Chamber Orchestra: Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios (recorded by Sam Gossner and Simon Dalzell). Trimmed, tuned, looped and converted to MP3 for this project. | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain, no attribution required; credited here anyway) |
| Hall reverb | Impulse response generated at run time, `src/symphony/orchestra.js` | MIT (this repo) |
| Original themes and all orchestration | Written by rules and a seed, `src/symphony/composer.js` | MIT (this repo) |

Classics (`src/symphony/classics.js`): only the compositions are used. The
melodies are written out by ear and harmonised and orchestrated for this
project; no recording, published edition or arrangement was copied. A piece
is included only if its composer died more than 70 years ago (free in
Finland and the EU) and it was published before 1930 (free in the US).

| Piece | Work | Why it is public domain |
| --- | --- | --- |
| THE BLUE DANUBE | Johann Strauss II, An der schönen blauen Donau (1866) | Composer died 1899 |
| ALSO SPRACH ZARATHUSTRA | Richard Strauss, introduction (1896) | Composer died 1949: free in the EU since 1 Jan 2020; published 1896, free in the US |
| MARS OSTINATO | After Gustav Holst, The Planets: Mars (1914–16). Only the 5/4 rhythm is taken; the harmonies and build are written here | Composer died 1934: free in the EU since 2005; published 1921, free in the US |
| ODE TO JOY | Ludwig van Beethoven, Symphony No. 9 (1824) | Composer died 1827 |
| NEW WORLD LARGO | Antonín Dvořák, Symphony No. 9 (1893) | Composer died 1904 |
| IN THE HALL OF THE MOUNTAIN KING | Edvard Grieg, Peer Gynt (1875) | Composer died 1907 |
| MORNING MOOD | Edvard Grieg, Peer Gynt (1875) | Composer died 1907 |
| SWAN LAKE | P. I. Tchaikovsky, Swan Lake (1876) | Composer died 1893 |

Not included: Jean Sibelius (died 1957) is protected in Finland until the
end of 2027, so Finlandia and the rest wait until 1 January 2028. Film music
(John Williams and others) is protected; the scenes only follow the general
habits of the style. Recordings of classical works are protected separately
from the compositions (in Finland 70 years from release), which is why none
are used. MIDI scores loaded with MIDI SCORE stay in the browser and are
never added to this repository: check each file's licence before publishing
what you make with it.

## Ragtime and Big Band (`ragtime.html`, `bigband.html`)

These pages use the same rule as the symphony: only CC0 samples and
public-domain compositions.

| What | Source | Licence |
| --- | --- | --- |
| Band samples (`samples/jazz/`: upright piano, muted and vibrato trumpet, 1950s tenor trombone sustains, shorts and falls, staccato clarinet, xylophone, temple blocks, suspended cymbal played as a ride, snare taps and snare-off hits used as a tom) | [VS Chamber Orchestra: Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios (the upright piano recorded by Simon Dalzell of Ivy Audio, the trombone set is VSCO's unreleased 'OldTrombone' test). Trimmed, pitch-checked and converted to MP3 by `scripts/build-jazz-samples.py`. They also use some `samples/vsco2/` sets (trumpet, trombone, clarinet, bassoon, tuba, pizzicato bass, bass drum, snare, cymbals). | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Hi-hat | Synthesised from generated noise, `src/jazz/band.js` | MIT (this repo) |
| Original rags and swing tunes, all band arrangements | Written by rules and a seed, `src/jazz/ragtime.js`, `src/jazz/bigband.js`. Chord progressions such as I–vi–ii–V, the 12-bar blues or the ragtime III7–VI7–II7–V7 circle are common building blocks, not owned works. | MIT (this repo) |

Public-domain pieces:

| Piece | Work | Source of the notes | Why it is public domain |
| --- | --- | --- | --- |
| THE ENTERTAINER | Scott Joplin (1902) | `scores/joplin-entertainer.mid`, made with LilyPond from the [Mutopia Project](https://www.mutopiaproject.org/) edition (`ftp/JoplinS/entertainer`), placed in the public domain by its typesetter | Composer died 1917; published 1902 |
| MAPLE LEAF RAG | Scott Joplin (1899) | `scores/joplin-maple-leaf-rag.mid`, Mutopia `ftp/JoplinS/maple`, public domain | Composer died 1917; published 1899 |
| THE EASY WINNERS | Scott Joplin (1901) | `scores/joplin-easy-winners.mid`, Mutopia `ftp/JoplinS/winners`, public domain | Composer died 1917; published 1901 |
| PINEAPPLE RAG | Scott Joplin (1908) | `scores/joplin-pineapple-rag.mid`, Mutopia `ftp/JoplinS/PineappleRag`, public domain | Composer died 1917; published 1908 |
| PEACHERINE RAG | Scott Joplin (1901) | `scores/joplin-peacherine-rag.mid`, Mutopia `ftp/JoplinS/peacherine`, public domain | Composer died 1917; published 1901 |
| MAPLE LEAF RAG (SWING) | Scott Joplin (1899), its first two strains swung by the big band | The same MIDI file | As above |
| WHEN THE SAINTS GO MARCHING IN | Traditional American spiritual | Written out by ear in `src/jazz/bigband.js` | Traditional |

Left out on purpose: swing-era arrangements and most swing standards are
still protected (for example Gershwin's songs in the US, Ferde Grofé's
orchestration of Rhapsody in Blue, W. C. Handy's blues in Finland until the
end of 2028, Glenn Miller's and Benny Goodman's band arrangements). Only the
general habits of the style are used: close-harmony section writing, riffs,
shout choruses, walking bass and the ride-cymbal beat.

## Space Age and Synthwave (`spaceage.html`, `synthwave.html`)

| What | Source | Licence |
| --- | --- | --- |
| Space Age samples (`samples/space/`: marimba, high and low bongos, open congas, claves, guiro, maracas) | [VS Chamber Orchestra: Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios, including its 'VSCO 1 Percussion' folder. Trimmed and converted to MP3 by `scripts/build-space-samples.py`. The page also uses `samples/vsco2/` (violins, violas, cellos, flute, harp, glockenspiel, timpani, pizzicato bass, cymbal) and `samples/jazz/` (upright piano, muted and vibrato trumpet, trombone, ride, snare taps). | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Vibraphone, drawbar organ, theremin, flying saucer, birds; every Synthwave sound (saw lead, arpeggiator, pads, strings, FM electric piano, bell, synth brass, vowel choir, drum machine with gated snare, toms, noise sweeps) | Synthesised at play time from oscillators and noise, `src/retro/voices.js` and `src/instruments.js` | MIT (this repo) |
| Original tunes and all arrangements | Written by rules and a seed, `src/retro/composer.js`, `src/retro/space.js`, `src/retro/synthwave.js`. Only the habits of the styles are used (beguine, cha-cha and bossa rhythms, theremin over strings, I–V–vi–IV and i–VI–III–VII loops, gated snares, octave basses); no melody, recording or arrangement by anyone else. | MIT (this repo) |

Public-domain pieces:

| Piece | Work | Source of the notes | Why it is public domain |
| --- | --- | --- | --- |
| GREENSLEEVES | Traditional English, 16th century | Written out by ear in `src/retro/space.js` | Traditional |
| IN THE HALL OF THE MOUNTAIN KING | Edvard Grieg, Peer Gynt (1875) | The theme written out by ear in `src/retro/synthwave.js` | Composer died 1907 |
| TOCCATA IN D MINOR | BWV 565, attributed to J. S. Bach | The opening written out by ear in `src/retro/synthwave.js`; the rest of the track is generated | Composer died 1750 |
| ODE TO JOY (remix theme) | Ludwig van Beethoven, Symphony No. 9 (1824) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1827 |
| NEW WORLD LARGO (remix theme) | Antonín Dvořák, Symphony No. 9, Largo (1893) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1904 |
| MORNING MOOD (remix theme) | Edvard Grieg, Peer Gynt (1875) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1907 |
| CANON IN D (remix theme) | Johann Pachelbel, Canon in D (c. 1680) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1706 |
| EINE KLEINE NACHTMUSIK (remix theme) | Wolfgang Amadeus Mozart, Serenade K. 525 (1787) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1791 |
| SWAN LAKE (remix theme) | Pyotr Ilyich Tchaikovsky, Swan Lake (1876) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1893 |
| MOUNTAIN KING (remix theme) | Edvard Grieg, Peer Gynt (1875) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1907 |
| SYMPHONY NO. 40 (remix theme) | Wolfgang Amadeus Mozart, Symphony No. 40 (1788) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1791 |
| SAKURA (remix theme) | Sakura Sakura, traditional Japanese | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Traditional (Edo period) |
| GREENSLEEVES (remix theme) | Traditional English, 16th century | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Traditional |
| MINUET IN G (remix theme) | Christian Petzold, Minuet in G (1725), long attributed to J. S. Bach | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Composer died 1733 |
| AMAZING GRACE (remix theme) | Amazing Grace, hymn tune "New Britain" (1829) | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Tune published 1829; traditional words not used |
| SCARBOROUGH FAIR (remix theme) | Scarborough Fair, traditional English | 8 bars written out by ear in `src/retro/themes.js`, remixed by `src/retro/composer.js` | Traditional |

Left out on purpose: the space-age and 1980s hits themselves (Les Baxter,
Martin Denny, Esquivel, film and TV themes, synth-pop records) are still
protected, as are modern synth covers of the classics above. Only style
traits are used.

Rules for adding material:

- New sounds on the desk should stay synthesised. Samples (the symphony
  page) must be CC0 or public domain, and get a row here with their source
  URL and licence.
- New melodies must be public domain (composer dead for more than 70
  years, or traditional), written out by ear rather than copied from a
  modern edition, and get a row in the table above.
- No AI-generated audio or models.

Recordings, set files and MIDI exports you make with the app are your own;
this project claims nothing in them. Melodies you load with MIDI IN stay in
your browser and set files and are never added to this repository: only load
music you have the rights to use.

## Pop Machine (`popmachine.html`)

| What | Source | Licence |
| --- | --- | --- |
| Every sound (harpsichord, staccato synth lead, Moog-style bass, supersaw, pluck, pumping pad, FM piano, power-chord guitar, tambourine and the Synthwave voices and drum machine) | Synthesised at play time, `src/pop/bands.js`, `src/retro/voices.js`, `src/instruments.js` | MIT (this repo) |
| Songs, arrangements, chord-loop notes and machine motifs | Written by rules and a seed, `src/pop/`. Chord loops are common property; only the habits of the styles are used. | MIT (this repo) |

Public-domain riffs (one or two bars each, written out by ear in `src/pop/riffs.js`):

| Riff | Work | Why it is public domain |
| --- | --- | --- |
| PRELUDE IN C | J. S. Bach, Prelude in C major, BWV 846 (1722) | Composer died 1750 |
| CELLO SUITE NO. 1 | J. S. Bach, Cello Suite No. 1, Prelude, BWV 1007 | Composer died 1750 |
| INVENTION NO. 1 | J. S. Bach, Invention No. 1, BWV 772 (1723) | Composer died 1750 |
| LITTLE FUGUE | J. S. Bach, Fugue in G minor, BWV 578 | Composer died 1750 |
| TOCCATA IN D MINOR | BWV 565, attributed to J. S. Bach | Composer died 1750 |
| CANON IN D | Johann Pachelbel (c. 1680) | Composer died 1706 |
| SPRING | Antonio Vivaldi, The Four Seasons (1725) | Composer died 1741 |
| SYMPHONY NO. 40 | W. A. Mozart (1788) | Composer died 1791 |
| RONDO ALLA TURCA | W. A. Mozart, Piano Sonata K. 331 (1783) | Composer died 1791 |
| FÜR ELISE | Ludwig van Beethoven, WoO 59 (1810) | Composer died 1827 |
| MOUNTAIN KING | Edvard Grieg, Peer Gynt (1875) | Composer died 1907 |
| FLIGHT OF THE BUMBLEBEE | Nikolai Rimsky-Korsakov, The Tale of Tsar Saltan (1900) | Composer died 1908 |

Left out on purpose: the synth-pop and film hits the styles are named after
(1970s synth instrumentals, 1980s TV and film themes, Eurodance and EDM
records) are protected. Their melodies, recordings and arrangements are not
used; only general traits are (staccato synth riffs, sequencer basses,
gated drums, key changes, build-ups and drops).

The MCP server uses [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
(MIT), [`ws`](https://github.com/websockets/ws) (MIT) and
[`zod`](https://github.com/colinhacks/zod) (MIT). The browser app does not use them.
