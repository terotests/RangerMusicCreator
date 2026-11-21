#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Measures how far each sample is from its note and stores it as 'c' (cents)
in a sample map; the Orchestra corrects the playback rate by it.

The pitch is tracked with YIN over the part of the note that is heard: from
just after the onset ('o') to --window seconds later (default 1.5; use about
0.3 for staccato sets, whose pitch is still settling when the note is cut).
The energy-weighted median of the track is the sample's pitch, so vibrato and
the scoop of the attack average out. A section chord built from samples that
were corrected by noisy guesses beats like an out-of-tune reed organ.

  python3 scripts/measure-tuning.py samples/jazz cl_stac --window 0.3
  (add --dry to only print the changes)
"""
import json, os, subprocess, sys
import numpy as np

argv = sys.argv[1:]
dry = '--dry' in argv
window = 1.5
if '--window' in argv:
    k = argv.index('--window')
    window = float(argv[k + 1])
    del argv[k:k + 2]
args = [a for a in argv if a != '--dry']
root, sets = args[0], args[1:]
path = os.path.join(root, 'map.json')
m = json.load(open(path))
RATE = 44100


def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def yin(frame, f_exp):
    """Frequency of one frame, searched within ±1.3x of the expected note."""
    w = len(frame) // 2
    tmin, tmax = int(RATE / (f_exp * 1.3)), int(RATE / (f_exp / 1.3)) + 2
    d = np.array([np.sum((frame[:w] - frame[t:t + w]) ** 2) for t in range(tmax + 1)])
    cm = np.ones_like(d)
    cm[1:] = d[1:] * np.arange(1, tmax + 1) / np.maximum(np.cumsum(d[1:]), 1e-12)
    t = tmin + int(np.argmin(cm[tmin:tmax]))
    q = cm[t]
    if 0 < t < tmax:
        a, b, c = cm[t - 1], cm[t], cm[t + 1]
        t = t + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
    return RATE / t, q


for s in sets:
    for smp in m[s]['samples']:
        x = load(os.path.join(root, smp['f']))
        o = smp.get('o', 0)
        f = 440 * 2 ** ((smp['m'] - 69) / 12)
        size = max(2048, int(4 * RATE / f))
        vals, ws = [], []
        for st in range(int((o + 0.025) * RATE), min(len(x), int((o + window) * RATE)) - size, 256):
            frame = x[st:st + size]
            e = float(np.sum(frame ** 2))
            if e < 1e-6:
                continue
            f0, q = yin(frame, f)
            if q < 0.2:
                vals.append(1200 * np.log2(f0 / f))
                ws.append(e)
        if len(vals) < 5:
            continue
        vals, ws = np.array(vals), np.array(ws)
        i = np.argsort(vals)
        cw = np.cumsum(ws[i])
        c = int(round(vals[i][np.searchsorted(cw, cw[-1] / 2)]))
        old = smp.get('c', 0)
        if abs(c - old) >= 5:
            print(f"{s:10s} {smp['f'].split('/')[-1]:45s} c {old:+4d} -> {c:+4d}")
        if not dry:
            if abs(c) >= 3:
                smp['c'] = c
            else:
                smp.pop('c', None)
if not dry:
    json.dump(m, open(path, 'w'), separators=(',', ':'))
