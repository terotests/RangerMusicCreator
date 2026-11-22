#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Builds samples/grand/ (the concert grand of the Symphony page) from a checkout
of the Versilian Community Sample Library (CC0, https://github.com/sgossner/VCSL),
folder 'Chordophones/Zithers/Grand Piano, Steinway B/Sus'.

  python3 scripts/build-piano-samples.py /path/to/VCSL

The Steinway B is sampled every whole tone (A#0..G#7) in three velocity layers
(vl2..vl4). Each note is trimmed (silence off, tail cut by register and faded)
and written as MP3 with a map.json in the samples/vsco2/map.json format.
Needs ffmpeg and numpy.
"""
import json, os, re, subprocess, sys
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/vcsl'
DIR = os.path.join(SRC, 'Chordophones', 'Zithers', 'Grand Piano, Steinway B', 'Sus')
OUT = os.path.join(os.path.dirname(__file__), '..', 'samples', 'grand')
RATE = 44100
PCS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    m = re.match(r'([A-G])(#?)(\d)$', name)
    return PCS[m.group(1)] + (1 if m.group(2) else 0) + 12 * (int(m.group(3)) + 1)


def max_len(m):
    """Low strings ring long, the top octaves die away fast."""
    return float(np.interp(m, [22, 48, 72, 96, 108], [11, 9, 6.5, 3.5, 2.5]))


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def trim(x, max_s):
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1
    above = np.nonzero(mono > peak * 0.02)[0]
    start = max(0, above[0] - int(0.003 * RATE)) if len(above) else 0
    tail = np.nonzero(mono > peak * 0.002)[0]
    end = min(len(x), (tail[-1] if len(tail) else len(x)) + int(0.05 * RATE), start + int(max_s * RATE))
    y = x[start:end].copy()
    fade = min(len(y), int(0.6 * RATE))
    y[-fade:] *= (np.linspace(1, 0, fade) ** 2)[:, None]
    return y


def main():
    os.makedirs(os.path.join(OUT, 'piano'), exist_ok=True)
    rx = re.compile(r'JHPiano_Sus_Close_([A-G]#?\d)_vl(\d)_rr1\.wav$')
    samples = []
    for f in sorted(os.listdir(DIR)):
        g = rx.match(f)
        if not g:
            continue
        m = midi(g.group(1))
        layer = int(g.group(2)) - 2
        x = trim(load(os.path.join(DIR, f)), max_len(m))
        rel = f"piano/{g.group(1).replace('#', 's')}_v{layer}.mp3"
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(RATE), '-i', '-',
                        '-codec:a', 'libmp3lame', '-q:a', '7', os.path.join(OUT, rel)], input=x.tobytes(), check=True)
        samples.append({'f': rel, 'v': layer, 'rr': 1, 'm': m})
    samples.sort(key=lambda s: (s['m'], s['v']))
    with open(os.path.join(OUT, 'map.json'), 'w') as fh:
        json.dump({'piano': {'layers': 3, 'samples': samples}}, fh, separators=(',', ':'))
    print(len(samples), 'samples')


if __name__ == '__main__':
    main()
