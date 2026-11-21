#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Stores each sample's onset (seconds of soft lead-in before the note speaks)
as 'o' in a sample map, so bands that play in time (jazz, space age) can start
the sample there. Some VSCO sustains, the clarinet above all, take 100-450 ms
to speak, which sounds late against a swing beat.

  python3 scripts/measure-onsets.py samples/vsco2 cl_sus fl_sus ...
"""
import json, os, subprocess, sys
import numpy as np

root, sets = sys.argv[1], sys.argv[2:]
path = os.path.join(root, 'map.json')
m = json.load(open(path))
for s in sets:
    for smp in m[s]['samples']:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(root, smp['f']), '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'],
                             capture_output=True, check=True).stdout
        x = np.abs(np.frombuffer(raw, dtype=np.float32))
        env = np.convolve(x, np.ones(441) / 441, 'same')
        t = np.argmax(env > 0.25 * env.max()) / 44100 - 0.015
        if t > 0.02:
            smp['o'] = round(float(t), 3)
        else:
            smp.pop('o', None)
    print(s, 'median onset', np.median([smp.get('o', 0) for smp in m[s]['samples']]))
json.dump(m, open(path, 'w'), separators=(',', ':'))
