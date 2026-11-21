#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Builds samples/jazz/ (the jazz and big band pages' extra instruments) from
a checkout of VS Chamber Orchestra: Community Edition (CC0,
https://github.com/sgossner/VSCO-2-CE).

  python3 scripts/build-jazz-samples.py /path/to/VSCO-2-CE

Each sample is trimmed (leading silence off, tail cut and faded), its pitch is
measured to store a fine-tune in cents, and it is written as MP3 next to a
map.json in the same format as samples/vsco2/map.json. Needs ffmpeg and numpy.
"""
import json, os, re, subprocess, sys
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/vsco'
OUT = os.path.join(os.path.dirname(__file__), '..', 'samples', 'jazz')
RATE = 44100
PCS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def vsco_note(name):
    """VSCO names put C3 at MIDI 60 ('A#1' -> 46)."""
    m = re.match(r'([A-G])(#|s|b)?(-?\d)$', name)
    pc = PCS[m.group(1)] + (1 if m.group(2) in ('#', 's') else -1 if m.group(2) == 'b' else 0)
    return pc + 12 * (int(m.group(3)) + 2)


# set -> list of (path, midi or None, layer, rr), max seconds, pitched?
def sets():
    out = {}
    files = open(os.path.join(SRC, '.files')).read().split('\n') if os.path.exists(os.path.join(SRC, '.files')) else None
    if files is None:
        files = []
        for root, _, names in os.walk(SRC):
            for n in names:
                files.append(os.path.relpath(os.path.join(root, n), SRC))

    def grab(key, pattern, parse, max_s, pitched=True):
        rx = re.compile(pattern)
        items = []
        for f in sorted(files):
            m = rx.search(f)
            if not m:
                continue
            r = parse(m)
            if r is not None:
                items.append((f, *r))
        out[key] = {'items': items, 'max': max_s, 'pitched': pitched}

    # Upright piano: file index NNN is key 21 + 2*NNN (MappingChart.txt); dyn1..3 are the layers.
    grab('piano', r'Keys/Upright Piano/Player_dyn(\d)_rr1_(\d{3})\.wav$',
         lambda m: (21 + 2 * int(m.group(2)), int(m.group(1)) - 1, 1) if 29 <= 21 + 2 * int(m.group(2)) <= 97 else None, 4.5)
    grab('tp_mute', r'Brass/Trumpet/straightM-sus/.*_([A-G]#?\d)_v(\d)_rr1\.wav$',
         lambda m: (vsco_note(m.group(1)), 0 if m.group(2) == '1' else 1, 1), 3.5)
    grab('tp_vib', r'Brass/Trumpet/susvib/.*_([A-G]#?\d)_v(\d)_rr1\.wav$',
         lambda m: (vsco_note(m.group(1)), 0 if m.group(2) == '1' else 1, 1), 3.5)
    grab('tb_vib', r'Brass/OldTrombone/Vibrato/Trombone_Vibrato_([A-G]#?\d)_v1_([12])\.wav$',
         lambda m: (vsco_note(m.group(1)), 0, int(m.group(2))), 3.5)
    grab('tb_short', r'Brass/OldTrombone/Short/Trombone_Short_([A-G]#?\d)_v([24])_1\.wav$',
         lambda m: (vsco_note(m.group(1)), 0 if m.group(2) == '2' else 1, 1), 1.2)
    grab('tb_fall', r'Brass/OldTrombone/Fall/Trombone_Fall_([A-G]#?\d)_1\.wav$',
         lambda m: (vsco_note(m.group(1)), 0, 1), 2.0)
    grab('cl_stac', r'Woodwinds/Clarinet/stac/DCClar_stac_([A-G]#?\d)_v([13])_rr1_sum\.wav$',
         lambda m: (vsco_note(m.group(1)), 0 if m.group(2) == '1' else 1, 1), 1.0)
    grab('xylo', r'Percussion/Xylo/Xylo_Medium_([A-G]\d)_ff_01_far\.wav$',
         lambda m: (vsco_note(m.group(1)), 0, 1), 1.6)
    grab('tblock', r'Percussion/TB_hit_([A-G]\d)_v\d_rr1\.wav$',
         lambda m: (vsco_note(m.group(1)), 0, 1), 0.8)
    # Unpitched kit pieces (layer = strength order).
    dyn = {'pp': 0, 'mp': 1, 'f': 2, 'fff': 3}
    grab('ride', r'Percussion/susCymb1-hitstick_(pp|mp|f|fff)_rr(\d)\.wav$',
         lambda m: (None, dyn[m.group(1)], int(m.group(2))), 3.0, False)
    grab('bell', r'Percussion/susCymb1-hit-bell_(pp|mf|fff)\.wav$',
         lambda m: (None, {'pp': 0, 'mf': 1, 'fff': 2}[m.group(1)], 1), 2.5, False)
    grab('sn_tap', r'Percussion/Snare2-taps_v(\d)_rr(\d)_Sum\.wav$',
         lambda m: (None, int(m.group(1)) - 1, int(m.group(2))), 0.6, False)
    grab('tom', r'Percussion/Snare2-HitNS_v(\d)_rr(\d)_Sum\.wav$',
         lambda m: (None, {'1': 0, '3': 1, '5': 2, '6': 3}[m.group(1)], int(m.group(2))), 1.0, False)
    return out


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def trim(x, max_s):
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1
    above = np.nonzero(mono > peak * 0.01)[0]
    start = max(0, above[0] - int(0.004 * RATE)) if len(above) else 0
    tail = np.nonzero(mono > peak * 0.003)[0]
    end = min(len(x), (tail[-1] if len(tail) else len(x)) + int(0.05 * RATE), start + int(max_s * RATE))
    y = x[start:end].copy()
    fade = min(len(y), int(0.08 * RATE))
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return y


def pitch(x, expect):
    """Fine-tune in cents against the expected MIDI note, from autocorrelation."""
    mono = x.mean(axis=1)
    a = int(0.08 * RATE)
    seg = mono[a:a + int(0.25 * RATE)]
    if len(seg) < 2048:
        return 0
    seg = seg - seg.mean()
    f0 = 440 * 2 ** ((expect - 69) / 12)
    lo, hi = int(RATE / (f0 * 1.06)), int(RATE / (f0 / 1.06)) + 1
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    if hi >= len(ac):
        return 0
    lag = lo + int(np.argmax(ac[lo:hi]))
    if 0 < lag < len(ac) - 1:
        y0, y1, y2 = ac[lag - 1], ac[lag], ac[lag + 1]
        d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) or 1)
        lag = lag + d
    f = RATE / lag
    c = 1200 * np.log2(f / f0)
    return int(round(c)) if abs(c) < 60 else 0


def main():
    os.makedirs(OUT, exist_ok=True)
    out_map = {}
    for key, spec in sets().items():
        if not spec['items']:
            continue
        os.makedirs(os.path.join(OUT, key), exist_ok=True)
        samples = []
        for f, m, layer, rr in spec['items']:
            x = trim(load(os.path.join(SRC, f)), spec['max'])
            base = re.sub(r'[^A-Za-z0-9_#-]+', '_', os.path.splitext(os.path.basename(f))[0]).replace('#', 's')
            rel = f'{key}/{base}.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-i', '-',
                            '-codec:a', 'libmp3lame', '-q:a', '6', os.path.join(OUT, rel)], input=x.tobytes(), check=True)
            s = {'f': rel, 'v': layer, 'rr': rr}
            if m is not None:
                s['m'] = m
                c = pitch(x, m) if key not in ('tblock', 'xylo') else 0
                if c:
                    s['c'] = c
            samples.append(s)
        layers = len({s['v'] for s in samples})
        # Kit layers are renumbered 0..n-1 by strength.
        order = sorted({s['v'] for s in samples})
        for s in samples:
            s['v'] = order.index(s['v'])
        out_map[key] = {'layers': layers, 'samples': samples}
        print(key, len(samples), 'samples')
    with open(os.path.join(OUT, 'map.json'), 'w') as fh:
        json.dump(out_map, fh, separators=(',', ':'))


if __name__ == '__main__':
    main()
