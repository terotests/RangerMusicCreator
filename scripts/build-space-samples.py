#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Builds samples/space/ (the Space Age page's exotica percussion and marimba)
from a checkout of VS Chamber Orchestra: Community Edition (CC0,
https://github.com/sgossner/VSCO-2-CE). Same trimming and map format as
scripts/build-jazz-samples.py, whose functions it reuses.

  python3 scripts/build-space-samples.py /path/to/VSCO-2-CE
"""
import importlib.util, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('jazz', os.path.join(HERE, 'build-jazz-samples.py'))
J = importlib.util.module_from_spec(spec)
spec.loader.exec_module(J)

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/vsco'
OUT = os.path.join(HERE, '..', 'samples', 'space')
P1 = 'VSCO 1 Percussion/'


def sets():
    files = []
    for root, _, names in os.walk(SRC):
        if '/.git' in root:
            continue
        for n in names:
            files.append(os.path.relpath(os.path.join(root, n), SRC))
    out = {}

    def grab(key, pattern, parse, max_s, pitched=True):
        rx = re.compile(pattern)
        items = []
        for f in sorted(files):
            m = rx.search(f)
            if m:
                r = parse(m)
                if r is not None:
                    items.append((f, *r))
        out[key] = {'items': items, 'max': max_s, 'pitched': pitched}

    grab('marimba', r'Percussion/Marimba/Marimba_hit_Outrigger_([A-G]\d)_loud_01\.wav$',
         lambda m: (J.vsco_note(m.group(1)), 0, 1), 2.5)
    # Unpitched: layer = strength (or which drum), rr = take.
    for hi, name in ((1, 'High'), (0, 'Low')):
        k = 'hi' if hi else 'lo'
        grab('bongo_' + k, re.escape(P1) + r'drums/other/Bongos/' + name + r'Bongo(\d)\.wav$',
             lambda m: (None, 0, int(m.group(1))), 0.8, False)
        grab('conga_' + k, re.escape(P1) + r'drums/other/ethnic/congo/open/ethnic' + name + r'Open_hit_(pp|mp|f)_(\d)\.wav$',
             lambda m: (None, {'pp': 0, 'mp': 1, 'f': 2}[m.group(1)], int(m.group(2))), 1.0, False)
    grab('claves', re.escape(P1) + r'varWood/claves_(mp|mf|ff)(?:_(\d))?\.wav$',
         lambda m: (None, {'mp': 0, 'mf': 1, 'ff': 2}[m.group(1)], int(m.group(2) or 1)), 0.5, False)
    grab('guiro', re.escape(P1) + r'varWood/guiro_short(\d?)\.wav$',
         lambda m: (None, 0, int(m.group(1) or 1)), 0.8, False)
    grab('maraca', re.escape(P1) + r'varWood/maraca(\d)\.wav$',
         lambda m: (None, 0, int(m.group(1))), 0.5, False)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    out_map = {}
    for key, spec in sets().items():
        if not spec['items']:
            continue
        os.makedirs(os.path.join(OUT, key), exist_ok=True)
        samples = []
        for f, m, layer, rr in spec['items']:
            x = J.trim(J.load(os.path.join(SRC, f)), spec['max'])
            base = re.sub(r'[^A-Za-z0-9_#-]+', '_', os.path.splitext(os.path.basename(f))[0]).replace('#', 's')
            rel = f'{key}/{base}.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(J.RATE), '-i', '-',
                            '-codec:a', 'libmp3lame', '-q:a', '6', os.path.join(OUT, rel)], input=x.tobytes(), check=True)
            s = {'f': rel, 'v': layer, 'rr': rr}
            if m is not None:
                s['m'] = m
            samples.append(s)
        order = sorted({s['v'] for s in samples})
        for s in samples:
            s['v'] = order.index(s['v'])
        out_map[key] = {'layers': len(order), 'samples': samples}
        print(key, len(samples), 'samples')
    with open(os.path.join(OUT, 'map.json'), 'w') as fh:
        json.dump(out_map, fh, separators=(',', ':'))


if __name__ == '__main__':
    main()
