#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Local MCP server for Ranger Music Creator.
//
// It serves the app on http://127.0.0.1:8140/ and keeps a WebSocket bridge to
// the open page, so an MCP client (Claude Code, Claude Desktop, ...) can play,
// mix, record and export while you listen. Talks MCP over stdio; logs go to
// stderr only.
//
//   claude mcp add ranger -- node /path/to/RangerMusicCreator/mcp/server.mjs
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { serveStatic, port } from '../scripts/serve.mjs';
import { STYLES, LAYERS } from '../src/styles.js';
import { AMBIENCES } from '../src/ambient.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = resolve(process.env.RANGER_OUT || join(root, 'recordings'));
const url = `http://127.0.0.1:${port}/`;
const log = (...a) => console.error('[ranger]', ...a);

// ---- page bridge --------------------------------------------------------
let page = null;
let nextId = 1;
const pending = new Map();
let listenError = null;

const http = createServer(serveStatic);
const wss = new WebSocketServer({ noServer: true });
http.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin || '';
  if (new URL(req.url, 'http://x').pathname !== '/bridge' || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    page = ws;
    log('page connected');
    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
    });
    ws.on('close', () => {
      if (page === ws) page = null;
      log('page disconnected');
    });
  });
});
http.on('error', (err) => {
  listenError = err.code === 'EADDRINUSE' ? `Port ${port} is already in use (is \`npm start\` running?). Stop it, or set PORT for both.` : String(err.message);
  log(listenError);
});
http.listen(port, '127.0.0.1', () => log(`app on ${url}`));

function call(method, params = {}, timeoutMs = 20000) {
  if (listenError) return Promise.reject(new Error(listenError));
  if (!page || page.readyState !== 1) {
    return Promise.reject(new Error(`No Ranger desk is open. Open ${url} in a browser and click the page once so audio can start, then try again.`));
  }
  const id = nextId++;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rej(new Error(`${method} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve: res, reject: rej, timer });
    page.send(JSON.stringify({ id, method, params }));
  });
}

// ---- helpers ------------------------------------------------------------
const ok = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: 'text', text: String(err?.message || err) }] });
const tool = (fn) => async (args) => {
  try {
    return ok(await fn(args || {}));
  } catch (err) {
    return fail(err);
  }
};
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
async function saveFile(name, data) {
  await mkdir(outDir, { recursive: true });
  const path = join(outDir, basename(name));
  await writeFile(path, data);
  return path;
}

const styleIds = STYLES.map((s) => s.id);
const channels = [...LAYERS, 'amb'];
const range = {
  from_marker: z.number().int().optional().describe('Start at this tape marker id (a section marker runs to the next section).'),
  to_marker: z.number().int().optional().describe('End at this tape marker id.'),
  from_seconds: z.number().optional().describe('Start, in seconds of tape time.'),
  to_seconds: z.number().optional().describe('End, in seconds of tape time.'),
  last_seconds: z.number().optional().describe('The last N seconds of the tape.'),
};

// ---- tools --------------------------------------------------------------
const mcp = new McpServer({ name: 'ranger-music-creator', version: '0.2.0' });
const reg = (name, description, inputSchema, fn) => mcp.registerTool(name, { description, inputSchema }, tool(fn));

reg('get_status', 'What is playing now: style, section, key, tempo, controls, channels, ambience, tape length, recent events.', {}, () => call('status'));
reg(
  'play',
  `Start or resume playback. Optionally pick a style (${styleIds.join(', ')}) or a seed for a new song.`,
  { style: z.enum(styleIds).optional(), seed: z.number().int().optional() },
  (a) => call('play', clean(a))
);
reg('pause', 'Pause playback (the tape keeps what was recorded).', {}, () => call('pause'));
reg('set_style', 'Switch style on the next bar.', { style: z.enum(styleIds) }, (a) => call('setStyle', a));
reg(
  'queue_section',
  'Queue the next song section.',
  { section: z.enum(['next', 'intro', 'verse', 'build', 'drop', 'break', 'bridge']) },
  (a) => call('queue', a)
);
reg(
  'set_controls',
  'Set desk controls. Knobs are 0..1 (surprise, tempo, echo, reverb, volume); toggles are booleans (echo_on, reverb_on, auto_mix, tape_wobble, journey, freeze, half_time, auto_ambience).',
  {
    surprise: z.number().min(0).max(1).optional(),
    tempo: z.number().min(0).max(1).optional(),
    echo: z.number().min(0).max(1).optional(),
    reverb: z.number().min(0).max(1).optional(),
    volume: z.number().min(0).max(1).optional(),
    echo_on: z.boolean().optional(),
    reverb_on: z.boolean().optional(),
    auto_mix: z.boolean().optional(),
    tape_wobble: z.boolean().optional(),
    journey: z.boolean().optional(),
    freeze: z.boolean().optional(),
    half_time: z.boolean().optional(),
    auto_ambience: z.boolean().optional(),
  },
  (a) => call('set', clean(a))
);
reg(
  'set_channel',
  'Change one mixer channel: fader level 0..1, effect send 0..1, mute, solo, or instrument (see list_instruments; "auto" lets the style choose).',
  {
    channel: z.enum(channels),
    level: z.number().min(0).max(1).optional(),
    send: z.number().min(0).max(1).optional(),
    mute: z.boolean().optional(),
    solo: z.boolean().optional(),
    instrument: z.string().optional(),
  },
  (a) => call('channel', clean(a))
);
reg('list_instruments', 'Instrument choices per channel and what each channel uses now.', {}, () => call('instruments'));
reg('new_part', 'Write a new part for one channel (the ♻ key): new drum pattern, bassline, chords, melody, arp, or ambience.', { part: z.enum(channels) }, (a) => call('newPart', a));
reg('hold_part', 'HOLD a channel: the composer keeps its current part through section changes and surprises.', { part: z.enum(LAYERS), on: z.boolean().default(true) }, (a) => call('hold', a));
reg(
  'set_ambience',
  `Choose ambience sounds (${AMBIENCES.map((a) => a.id).join(', ')}), or auto=true to let the desk pick.`,
  { sounds: z.array(z.enum(AMBIENCES.map((a) => a.id))).optional(), auto: z.boolean().optional() },
  (a) => call('ambience', clean(a))
);
reg('loop', 'Repeat the last N bars exactly (song stops advancing). bars=0 releases the loop.', { bars: z.number().int().min(0).max(16).default(4) }, (a) => call('loop', a));
reg('echo_throw', 'Throw the last beat into the echo (a dub-style effect).', {}, () => call('echoThrow'));
reg('filter_sweep', 'Sweep the master filter down and back up over a bar.', {}, () => call('filterSweep'));
reg(
  'new_song',
  'Start a fresh song (new seed), optionally in another style or with a given seed.',
  { style: z.enum(styleIds).optional(), seed: z.number().int().optional() },
  (a) => call('newSong', clean(a))
);
reg('bookmark', 'Drop a ★ bookmark on the tape at the current moment.', {}, () => call('bookmark'));
reg('list_markers', 'Markers on the session tape: every section start (with style, key, tempo) and every bookmark, with ids and times.', {}, () => call('markers'));
reg('go_back', 'Jump the song back to a section marker: the composer continues from that exact musical state.', { marker: z.number().int() }, (a) => call('goBack', a));
reg('listen', 'Play back part of the tape (defaults to the last 30 seconds). Live playback is paused while previewing.', range, (a) => call('listen', clean(a)));
reg(
  'export_wav',
  `Save part of the tape (default: the whole tape) as a WAV file in ${outDir}. Returns the file path.`,
  { ...range, name: z.string().optional().describe('File name, without folder.') },
  async (a) => {
    const r = await call('exportWav', clean({ ...a, name: undefined }), 120000);
    const path = await saveFile(a.name || `ranger-${r.style}-${r.seed}-${stamp()}.wav`, Buffer.from(r.wav_base64, 'base64'));
    return { path, seconds: r.seconds };
  }
);
reg(
  'export_midi',
  `Save the played bars (default: everything this session; or a tape range) as a MIDI file in ${outDir}. Returns the file path.`,
  { ...range, name: z.string().optional() },
  async (a) => {
    const r = await call('exportMidi', clean({ ...a, name: undefined }), 60000);
    const path = await saveFile(a.name || `ranger-${r.style}-${r.seed}-${stamp()}.mid`, Buffer.from(r.midi_base64, 'base64'));
    return { path };
  }
);
reg(
  'import_midi',
  'Load a MIDI file from disk; its melody becomes a theme the composer quotes and varies. Use only music you have the rights to.',
  { path: z.string(), name: z.string().optional() },
  async (a) => {
    const buf = await readFile(resolve(a.path));
    return call('importMidi', { midi_base64: buf.toString('base64'), name: a.name || basename(a.path).replace(/\.midi?$/i, '') });
  }
);
reg('store_theme', 'Store what is playing (the loop, or the last 4 bars) as a theme in theme memory (slot 1-4, default first free).', { slot: z.number().int().min(1).max(4).optional() }, (a) => call('storeTheme', clean(a)));
reg('recall_theme', 'Recall a stored theme: it becomes the base theme and the composer only varies it (THEME LOCK).', { slot: z.number().int().min(1).max(4) }, (a) => call('recallTheme', a));
reg('list_memory', 'The four theme memory slots.', {}, () => call('memory'));
reg('theme_lock', 'THEME LOCK on/off: keep chords, bass and melody, vary only the arrangement.', { on: z.boolean() }, (a) => call('themeLock', a));
reg(
  'save_set',
  `Save the whole set (song state, mix, instruments, holds, theme memory) as a JSON file in ${outDir}.`,
  { name: z.string().optional() },
  async (a) => {
    const set = await call('saveSet');
    const path = await saveFile(a.name || `ranger-set-${stamp()}.json`, JSON.stringify(set, null, 2));
    return { path };
  }
);
reg('load_set', 'Load a set JSON file saved by save_set or the SAVE SET key.', { path: z.string() }, async (a) => {
  const set = JSON.parse(await readFile(resolve(a.path), 'utf8'));
  return call('loadSet', { set });
});

await mcp.connect(new StdioServerTransport());
log('MCP ready on stdio');
