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

The MCP server uses [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
(MIT), [`ws`](https://github.com/websockets/ws) (MIT) and
[`zod`](https://github.com/colinhacks/zod) (MIT). The browser app does not use them.
