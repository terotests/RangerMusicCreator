#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Renders the Symphony page's repertoire (scores/*.mid) from Mutopia Project
LilyPond sources (https://github.com/MutopiaProject/MutopiaProject, folder ftp/).

  pip install lilypond
  python3 scripts/build-scores.py /path/to/MutopiaProject [name ...]

Each source is upgraded with convert-ly, then every \\score block is rewritten
to `\\score { \\articulate \\unfoldRepeats { music } \\midi { } }` (repeats
played out, staccatos and ornaments realised, no PDF) and rendered to MIDI.
LICENSES.md lists the edition and licence of every file.
"""
import os, re, shutil, subprocess, sys, tempfile

try:
    import lilypond
    BIN = os.path.dirname(str(lilypond.executable()))
except ImportError:
    BIN = ''
LY = os.path.join(BIN, 'lilypond')
CONVERT = os.path.join(BIN, 'convert-ly')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scores')

# Its own score file uses old helper functions, so the parts are put together here.
MOZART = r'''
\include "violin1.ly"
\include "violin2.ly"
\include "viola.ly"
\include "cello.ly"
\score {
  \new StaffGroup <<
    \new Staff = "Violin 1" { \set Staff.instrumentName = "Violin 1" \violinOne }
    \new Staff = "Violin 2" { \set Staff.instrumentName = "Violin 2" \violinTwo }
    \new Staff = "Viola" { \set Staff.instrumentName = "Viola" \viola }
    \new Staff = "Cello" { \set Staff.instrumentName = "Cello" \cello }
  >>
}
'''

# out name -> (source .ly under ftp/, which \score in it (0 = first), use articulate)
PIECES = {
    # Bach
    'bach-air': ('BachJS/BWV1068/bach-air/bach-air-lys/bach-air-score.ly', None, True),
    'bach-prelude-c': ('BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.ly', None, True),
    'bach-toccata': ('BachJS/BWV565/ToccataFugue/ToccataFugue.ly', None, True),
    'bach-sheep': ('BachJS/BWV208/Sheep/Sheep.ly', 0, True),
    'bach-double': ('BachJS/BWV1043/concerto-in-d-minor/concerto-in-d-minor-lys/score.ly', 0, True),
    'bach-brandenburg5': ('BachJS/BWV1050/brand5-3/brand5-3-lys/score.ly', None, True),
    'bach-minuet-g': ('BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04.ly', None, True),
    'bach-invention1': ('BachJS/BWV772/bach-invention-01/bach-invention-01.ly', None, True),
    # Vivaldi, The Four Seasons
    'vivaldi-spring-1': ('VivaldiA/O8/spring/spring-lys/spring-score.ly', 0, True),
    'vivaldi-summer-3': ('VivaldiA/O8/summer/summer-lys/summer-score.ly', 2, True),
    'vivaldi-autumn-1': ('VivaldiA/O8/autumn/autumn-lys/autumn-score.ly', 0, True),
    'vivaldi-winter-1': ('VivaldiA/O8/winter/winter-lys/winter-score.ly', 0, True),
    'vivaldi-winter-2': ('VivaldiA/O8/winter/winter-lys/winter-score.ly', 1, True),
    # Chopin
    'chopin-nocturne-9-2': ('ChopinFF/O9/chopin_nocturne_op9_n2/chopin_nocturne_op9_n2.ly', None, True),
    'chopin-prelude-4': ('ChopinFF/O28/Chop-28-4/Chop-28-4.ly', None, True),
    'chopin-prelude-15': ('ChopinFF/O28/Chop-28-15/Chop-28-15-lys/chopin_prelude_op28_no15.ly', None, True),
    'chopin-prelude-7': ('ChopinFF/O28/Chop-28-7/Chop-28-7-lys/chopin_prelude_op28_no7.ly', None, True),
    'chopin-waltz-64-1': ('ChopinFF/O64/chopin_valse_op64_no1/chopin_valse_op64_no1-lys/chopin_valse_op64_no1.ly', None, True),
    'chopin-waltz-69-2': ('ChopinFF/O69/w10-h-moll-cfi/w10-h-moll-cfi.ly', None, True),
    'chopin-fantaisie': ('ChopinFF/O66/chopin_fantaisie-impromptu/chopin_fantaisie-impromptu.ly', None, True),
    'chopin-revolutionary': ('ChopinFF/O10/op-10-12-wfi/op-10-12-wfi.ly', None, True),
    # More
    'beethoven-moonlight-1': ('BeethovenLv/O27/moonlight/moonlight-lys/moonlight1-a4.ly', None, True),
    'beethoven-moonlight-3': ('BeethovenLv/O27/moonlight/moonlight-lys/moonlight3-a4.ly', 1, True),
    'beethoven-pathetique-2': ('BeethovenLv/O13/pathetique-2/pathetique-2.ly', None, True),
    'beethoven-pathetique-1': ('BeethovenLv/O13/pathetique-1/pathetique-1.ly', None, True),
    'beethoven-appassionata-3': ('BeethovenLv/O57/LVB_Sonate_57_3/LVB_Sonate_57_3-lys/LVB_Sonate_57_3.ly', 1, True),
    'beethoven-tempest-1': ('BeethovenLv/O31/LVB_Sonate_31no2_1/LVB_Sonate_31no2_1.ly', None, True),
    'beethoven-symphony7-2': ('BeethovenLv/O92/Symphony7_2/Symphony7_2-lys/Symphony7_2.ly', None, True),
    'debussy-clair': ('DebussyC/L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.ly', None, True),
    'debussy-arabesque-1': ('DebussyC/L66/debussy_Arabesque_1/debussy_Arabesque_1.ly', None, True),
    'satie-gymnopedie-1': ('SatieE/gymnopedie_1/gymnopedie_1.ly', None, True),
    'mozart-nachtmusik': ('MozartWA/KV525/eine-kleine-nachtmusik-mvt1/eine-kleine-nachtmusik-mvt1-lys/eine-kleine-nachtmusik-mvt1.ly', None, True, MOZART),
}


def skip_string(t, i):
    i += 1
    while i < len(t) and t[i] != '"':
        i += 2 if t[i] == '\\' else 1
    return i + 1


def skip_comment(t, i):
    if t.startswith('%{', i):
        j = t.find('%}', i + 2)
        return len(t) if j < 0 else j + 2
    j = t.find('\n', i)
    return len(t) if j < 0 else j + 1


def match_brace(t, i):
    """t[i] == '{' (or '<<'): index just past the matching close."""
    depth = 0
    while i < len(t):
        c = t[i]
        if c == '"':
            i = skip_string(t, i)
            continue
        if c == '%':
            i = skip_comment(t, i)
            continue
        if c == '\\':
            i += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError('unbalanced braces')


def rewrite_score(body):
    """Body of a \\score block (without its braces) -> MIDI-only body."""
    music, keep, i, last = [], [], 0, 0
    while i < len(body):
        c = body[i]
        if c == '"':
            i = skip_string(body, i)
            continue
        if c == '%':
            i = skip_comment(body, i)
            continue
        if c == '{':
            i = match_brace(body, i)
            continue
        m = re.match(r'\\(layout|midi|header)\s*\{', body[i:])
        if m:
            music.append(body[last:i])
            end = match_brace(body, i + m.end() - 1)
            if m.group(1) == 'header':
                keep.append(body[i:end])
            i = last = end
            continue
        i += 2 if c == '\\' else 1
    music.append(body[last:])
    return '\n'.join(keep), ''.join(music)


def transform(text, which, articulate):
    out, i, n = [], 0, 0
    for m in re.finditer(r'\\score\s*\{', text):
        if m.start() < i:
            continue
        start = m.end() - 1
        end = match_brace(text, start)
        header, music = rewrite_score(text[start + 1:end - 1])
        if which is None or which == n:
            wrap = '\\articulate ' if articulate else ''
            new = f'\\score {{\n{header}\n{wrap}\\unfoldRepeats {{ {music} }}\n\\midi {{ }}\n}}'
        else:
            new = ''
        out.append(text[i:m.start()])
        out.append(new)
        i = end
        n += 1
    out.append(text[i:])
    res = ''.join(out)
    if articulate:
        res = re.sub(r'(\\version\s*"[^"]*")', r'\1\n\\include "articulate.ly"', res, count=1)
        if '\\include "articulate.ly"' not in res:
            res = '\\include "articulate.ly"\n' + res
    return res


# Old syntax that convert-ly leaves behind in some sources.
FIXES = [
    (r'\\applyMusic\s*#unfold-repeats', r'\\unfoldRepeats'),
    (r'#\(\s*(override|revert)-auto-beam-setting[^\n]*', ''),
    (r"#'bound-details\s*#'left\s*#'text", 'bound-details.left.text'),
    (r'\\note\s*#"(\d+\.*)"', r'\\note {\1}'),
    (r'#\$(\w+)', r'#\1'),
    (r'(?<=[^\s-])-\|', '-!'),
]


def fix(path):
    t = open(path, encoding='utf-8', errors='replace').read()
    for a, b in FIXES:
        t = re.sub(a, b, t)
    open(path, 'w', encoding='utf-8').write(t)


def build(root, name, spec):
    rel, which, articulate = spec[:3]
    custom = spec[3] if len(spec) > 3 else None
    src = os.path.join(root, 'ftp', rel)
    piece_dir = os.path.dirname(src)
    with tempfile.TemporaryDirectory() as tmp:
        work = os.path.join(tmp, 'p')
        shutil.copytree(piece_dir, work, ignore=shutil.ignore_patterns('Makefile', '*.pdf', '*.mid', '*.png'))
        for dp, _, fs in os.walk(work):
            for f in fs:
                if f.endswith('.ly') or f.endswith('.ily'):
                    path = os.path.join(dp, f)
                    subprocess.run([CONVERT, '-e', '-q', path], capture_output=True)
                    fix(path)
        target = os.path.join(work, os.path.basename(src))
        for art in ([True, False] if articulate else [False]):
            text = '\\version "2.24.0"\n' + custom if custom else open(target, encoding='utf-8', errors='replace').read()
            open(os.path.join(work, '_midi.ly'), 'w').write(transform(text, which, art))
            r = subprocess.run([LY, '-dmidi-extension=mid', '--loglevel=ERROR', '-o', os.path.join(tmp, 'out'), '_midi.ly'], cwd=work, capture_output=True, text=True, timeout=600)
            mids = sorted(os.path.join(dp, f) for dp, _, fs in os.walk(tmp) for f in fs if f.endswith('.mid'))
            if mids:
                shutil.copy(mids[0], os.path.join(OUT, name + '.mid'))
                return 'ok' + ('' if art else ' (no articulate)') + (f' [{len(mids)} midi files]' if len(mids) > 1 else '')
        return 'FAILED: ' + r.stderr.strip()[-600:]


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mutopia'
    names = sys.argv[2:] or list(PIECES)
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        try:
            print(n, build(root, n, PIECES[n]), flush=True)
        except Exception as err:
            print(n, 'FAILED:', err, flush=True)


if __name__ == '__main__':
    main()
