# Ranger Music Creator

An automatic music generator that looks like a mixing desk. Press **PLAY** (or
one of the eight style buttons) and it composes for as long as you let it:
intros, builds, drops and breakdowns, new melodies, key changes, echo throws
and fills, all from musical rules and a random seed. No AI model, no samples:
every sound is synthesised in the browser, so the music is royalty free and
safe to put in a game (see [LICENSES.md](LICENSES.md)).

![The desk](docs/desk.png)

Visual inspiration: a video/audio streaming mixer desk and the skinned
[EVG Player](https://github.com/terotests/EVGMusicPlayer) (the screen skins
are its ice, lime and ember).

## Run it

```sh
npm start          # http://127.0.0.1:8140/
npm test           # composer tests (Node 20+)
```

No build step and no dependencies: it is plain ES modules and Web Audio, so
any static file server works too. The GitHub Pages workflow publishes `main`.

## The desk

| Area | What it does |
| --- | --- |
| STYLE SWITCHER 1–8 | Lo-fi, Deep House, Synthwave, Ambient, Chiptune, Liquid DnB, Dub, Adventure. A change lands on the next bar. |
| TRANSITION | **NEXT** jumps to the next section, **BREAK** / **BUILD** queue one, **JOURNEY** lets it drift between styles by itself, **PLAY** starts and pauses. |
| PERFORM | **FREEZE** loops the current section, **ECHO THROW** sends everything into a runaway dub echo, **FILTER SWEEP**, **HALF-TIME**. |
| SONG | **NEW SONG** (new seed), **REC** to a WAV file, **LINK** copies a link with the seed and style, **SURPRISE ME**. |
| AUDIO EFFECT | Auto mixing (the faders ride themselves per section), echo, reverb, tape wobble; knobs for echo and reverb return, **SURPRISE** and **TEMPO**. |
| AMBIENCE | Rain, wind, ocean, birds, night, fire, vinyl, city. **AUTO** lets each style pick. |
| AUDIO MIXER | Per part: send (echo + reverb), **NEW** (rewrite that part), solo, mute, fader with meter. |
| Screen | Spectrum, scope, the song's structure and active layers, and a log of what the composer just did. |
| SEQUENCER | The bar that is playing, part by part. |

Keys: space play/pause, 1–8 styles, N next, F freeze, E echo throw, B break, R new song.

## How it composes

- `src/styles.js`: each style is rules, not a song: tempo range, swing,
  modes, chord progressions, drum/bass/comping pattern pools, instrument
  voices, which layers come in at which energy, mix and effects.
- `src/composer.js`: plans one bar at a time and returns plain events.
  Sections follow a weighted walk (intro → verse → build → drop → break …),
  each with an energy that decides which layers play. At section boundaries
  it may change key, chords, groove, bassline, melody or tempo, go
  half-time, or quote a public-domain theme; inside sections it mutates
  hats and melody variations and adds fills, echo throws and a silence
  before drops. The **SURPRISE** knob scales all of it. Melodies are short
  motifs with an answer phrase (inversion, sequence, ornament, rhythm
  shift), snapped to chord tones on strong beats.
- `src/player.js`: look-ahead scheduler on the audio clock, swing and
  humanising, side-chain ducking from the kick.
- `src/engine.js`: channel strips, ping-pong echo with filtered feedback,
  generated reverb, master glue compressor, saturation, tape wobble, limiter.
- `src/instruments.js`, `src/ambient.js`: all the sounds.

The same seed and style give the same song, so a game can ship a seed
instead of an audio file:

```js
window.ranger.play({ style: 'chip', seed: 1234 });
window.ranger.next();   // jump to the next section
window.ranger.pause();
```

`Composer` has no audio dependencies and runs in Node as well.

## License

MIT, see [LICENSE](LICENSE). Sound sources and melodic seeds: [LICENSES.md](LICENSES.md).
