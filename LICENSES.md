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

Rules for adding material:

- New sounds should stay synthesised. If a sample is ever added, it must be
  CC0 or public domain, and gets a row here with its source URL and licence.
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
