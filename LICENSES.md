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

### Repertoire: works played from the score

The CLASSICS tab lists these works by composer. Each is played note for note
from a MIDI file made with LilyPond from a [Mutopia Project](https://www.mutopiaproject.org/)
edition (`scripts/build-scores.py`, sources from
[github.com/MutopiaProject/MutopiaProject](https://github.com/MutopiaProject/MutopiaProject)),
and arranged at play time for the piano, the strings or the full orchestra
(`src/symphony/repertoire.js`). The compositions are public domain. Most
editions are public domain too; the ones marked CC BY-SA 3.0 are free to use
with credit to their typesetter, and the MIDI files made from them carry the
same licence. Only the notes of those editions are used.

| Work | Composer and source | Score | Public domain because |
| --- | --- | --- | --- |
| AIR ON THE G STRING | J. S. Bach, Orchestral Suite No. 3 in D, BWV 1068: Air (c. 1730) | `scores/bach-air.mid`, Mutopia `ftp/BachJS/BWV1068/bach-air` (Mutopia-2008/10/28-242), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by Jeff Covey | Composer died 1750 |
| PRELUDE IN C MAJOR | J. S. Bach, The Well-Tempered Clavier I, BWV 846 (1722) | `scores/bach-prelude-c.mid`, Mutopia `ftp/BachJS/BWV846/wtk1-prelude1` (Mutopia-2011/09/12-5), public domain | Composer died 1750 |
| TOCCATA AND FUGUE IN D MINOR | J. S. Bach, Organ, BWV 565 | `scores/bach-toccata.mid`, Mutopia `ftp/BachJS/BWV565/ToccataFugue` (Mutopia-2011/09/11-1780), public domain | Composer died 1750 |
| SHEEP MAY SAFELY GRAZE | J. S. Bach, Hunting Cantata, BWV 208: aria (1713) | `scores/bach-sheep.mid`, Mutopia `ftp/BachJS/BWV208/Sheep` (Mutopia-2011/10/25-1794), public domain | Composer died 1750 |
| DOUBLE VIOLIN CONCERTO | J. S. Bach, Concerto for Two Violins in D minor, BWV 1043: Vivace | `scores/bach-double.mid`, Mutopia `ftp/BachJS/BWV1043/concerto-in-d-minor` (Mutopia-2015/09/02-3), public domain | Composer died 1750 |
| BRANDENBURG CONCERTO NO. 5 | J. S. Bach, BWV 1050: Allegro (1721) | `scores/bach-brandenburg5.mid`, Mutopia `ftp/BachJS/BWV1050/brand5-3` (Mutopia-2015/09/29-548), public domain | Composer died 1750 |
| MINUET IN G | J. S. Bach, Notebook for Anna Magdalena Bach, BWV Anh. 114 (1725; by Christian Petzold) | `scores/bach-minuet-g.mid`, Mutopia `ftp/BachJS/BWVAnh114/anna-magdalena-04` (Mutopia-2017/01/19-75), public domain | Composer died 1750 |
| INVENTION NO. 1 | J. S. Bach, Two-Part Invention in C, BWV 772 (1723) | `scores/bach-invention1.mid`, Mutopia `ftp/BachJS/BWV772/bach-invention-01` (Mutopia-2008/06/15-40), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by Jeff Covey | Composer died 1750 |
| SPRING · ALLEGRO | Antonio Vivaldi, The Four Seasons, Op. 8 No. 1, RV 269 (1725) | `scores/vivaldi-spring-1.mid`, Mutopia `ftp/VivaldiA/O8/spring` (Mutopia-2010/02/08-301), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by a Mutopia contributor | Composer died 1741 |
| SUMMER · PRESTO | Antonio Vivaldi, The Four Seasons, Op. 8 No. 2, RV 315 (1725) | `scores/vivaldi-summer-3.mid`, Mutopia `ftp/VivaldiA/O8/summer` (Mutopia-2010/02/08-336), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by a Mutopia contributor | Composer died 1741 |
| AUTUMN · ALLEGRO | Antonio Vivaldi, The Four Seasons, Op. 8 No. 3, RV 293 (1725) | `scores/vivaldi-autumn-1.mid`, Mutopia `ftp/VivaldiA/O8/autumn` (Mutopia-2010/02/08-350), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by a Mutopia contributor | Composer died 1741 |
| WINTER · ALLEGRO NON MOLTO | Antonio Vivaldi, The Four Seasons, Op. 8 No. 4, RV 297 (1725) | `scores/vivaldi-winter-1.mid`, Mutopia `ftp/VivaldiA/O8/winter` (Mutopia-2010/02/08-351), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by a Mutopia contributor | Composer died 1741 |
| WINTER · LARGO | Antonio Vivaldi, The Four Seasons, Op. 8 No. 4, RV 297 (1725) | `scores/vivaldi-winter-2.mid`, Mutopia `ftp/VivaldiA/O8/winter` (Mutopia-2010/02/08-351), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by a Mutopia contributor | Composer died 1741 |
| NOCTURNE IN E-FLAT | Frédéric Chopin, Op. 9 No. 2 (1832) | `scores/chopin-nocturne-9-2.mid`, Mutopia `ftp/ChopinFF/O9/chopin_nocturne_op9_n2` (Mutopia-2014/12/18-1590), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), typeset by Renato Biolcati Rinaldi | Composer died 1849 |
| PRELUDE IN E MINOR | Frédéric Chopin, Op. 28 No. 4 (1839) | `scores/chopin-prelude-4.mid`, Mutopia `ftp/ChopinFF/O28/Chop-28-4` (Mutopia-2016/10/28-468), public domain | Composer died 1849 |
| “RAINDROP” PRELUDE | Frédéric Chopin, Op. 28 No. 15 in D-flat (1839) | `scores/chopin-prelude-15.mid`, Mutopia `ftp/ChopinFF/O28/Chop-28-15` (Mutopia-2015/01/16-471), public domain | Composer died 1849 |
| PRELUDE IN A MAJOR | Frédéric Chopin, Op. 28 No. 7 (1839) | `scores/chopin-prelude-7.mid`, Mutopia `ftp/ChopinFF/O28/Chop-28-7` (Mutopia-2015/01/17-470), public domain | Composer died 1849 |
| “MINUTE” WALTZ | Frédéric Chopin, Waltz in D-flat, Op. 64 No. 1 (1847) | `scores/chopin-waltz-64-1.mid`, Mutopia `ftp/ChopinFF/O64/chopin_valse_op64_no1` (Mutopia-2015/01/17-483), public domain | Composer died 1849 |
| WALTZ IN B MINOR | Frédéric Chopin, Op. 69 No. 2 (1829, published 1852) | `scores/chopin-waltz-69-2.mid`, Mutopia `ftp/ChopinFF/O69/w10-h-moll-cfi` (Mutopia-2013/03/23-511), public domain | Composer died 1849 |
| FANTAISIE-IMPROMPTU | Frédéric Chopin, Op. 66 in C-sharp minor (1834, published 1855) | `scores/chopin-fantaisie.mid`, Mutopia `ftp/ChopinFF/O66/chopin_fantaisie-impromptu` (Mutopia-2009/09/05-1693), public domain | Composer died 1849 |
| “REVOLUTIONARY” ÉTUDE | Frédéric Chopin, Étude in C minor, Op. 10 No. 12 (1831) | `scores/chopin-revolutionary.mid`, Mutopia `ftp/ChopinFF/O10/op-10-12-wfi` (Mutopia-2018/05/15-743), public domain | Composer died 1849 |
| EINE KLEINE NACHTMUSIK | W. A. Mozart, Serenade in G, K. 525: Allegro (1787) | `scores/mozart-nachtmusik.mid`, Mutopia `ftp/MozartWA/KV525/eine-kleine-nachtmusik-mvt1` (Mutopia-2007/01/01-900), public domain | Composer died 1791 |
| FÜR ELISE | L. van Beethoven, Bagatelle in A minor, WoO 59 (1810) | `scores/beethoven-elise.mid`, Mutopia `ftp/BeethovenLv/WoO59/fur_Elise_WoO59` (Mutopia-2015/08/18-931), public domain | Composer died 1827 |
| CLAIR DE LUNE | Claude Debussy, Suite bergamasque (1905) | `scores/debussy-clair.mid`, Mutopia `ftp/DebussyC/L75/debussy_Ste_Bergamesq_Clair` (Mutopia-2010/12/21-1778), public domain | Composer died 1918 |
| ARABESQUE NO. 1 | Claude Debussy, Deux arabesques (1891) | `scores/debussy-arabesque-1.mid`, Mutopia `ftp/DebussyC/L66/debussy_Arabesque_1` (Mutopia-2011/10/25-1777), public domain | Composer died 1918 |
| GYMNOPÉDIE NO. 1 | Erik Satie, Trois Gymnopédies (1888) | `scores/satie-gymnopedie-1.mid`, Mutopia `ftp/SatieE/gymnopedie_1` (Mutopia-2014/12/14-37), public domain | Composer died 1925 |

| What | Source | Licence |
| --- | --- | --- |
| Concert grand (`samples/grand/`: Steinway Model B, whole-tone steps from A#0 to G#7, three velocity layers) | [Versilian Community Sample Library](https://github.com/sgossner/VCSL) by Versilian Studios, `Chordophones/Zithers/Grand Piano, Steinway B/Sus`. Trimmed and converted to MP3 by `scripts/build-piano-samples.py`. | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

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
| NEW WORLD LARGO (APOLLO tab) | Antonín Dvořák, Symphony No. 9, Largo (1893) | The 8 bars in `src/retro/themes.js`, read from the free score; bridge generated | Composer died 1904 |
| ZARATHUSTRA 1970 (APOLLO tab) | Richard Strauss, Also sprach Zarathustra, Op. 30 (1896) | The three trumpet calls written out from the free score in `src/retro/apollo.js`; the four closing bars and the arrangement are written here | Composer died 1949 (public domain in the EU since 2020); published 1896 |
| BLUE DANUBE DOCKING (APOLLO tab) | Johann Strauss II, An der schönen blauen Donau, Op. 314 (1867) | The first waltz theme written out from the free score in `src/retro/apollo.js`; bridge generated | Composer died 1899 |

APOLLO originals: COUNTDOWN, TRANQUILITY BASE, AQUARIUS LIFEBOAT and SPLASHDOWN (`src/retro/apollo.js`) are written for this repo in the style of 1969–70 and are MIT like the rest. No song or recording from 1969–70 is used; the mission names are only titles. The Moog-style lead, radio beeps and kick drum are synthesised (`src/retro/voices.js`, `src/instruments.js`).

RADIO 1969 (`src/retro/radio.js`): ROCK 1969, SOUL 1969, BLUES SHUFFLE, SOUL JAZZ and SUNSHINE POP play ten tunes written for this repo in the manner of 1969 (Highway Signal, Fuzz Rendezvous, Come Home Soon, Mission Groove, Telemetry Blues, Slow Burn, Eagle Strut, Late Edition, Silver Sunday, Flower Orbit). Only the habits of the styles are used (fuzz riffs, backbeat tambourine, the 12-bar shuffle, the organ trio, sunshine-pop harmony); no melody, recording or arrangement from the period. MIT. The electric guitar and tambourine are synthesised (`src/retro/voices.js`); the snare is the Pop Machine's synthesised snare.

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
