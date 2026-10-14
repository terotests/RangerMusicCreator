// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP server lists tools and asks for the desk when no page is open', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../mcp/server.mjs', import.meta.url))],
    env: { ...process.env, PORT: '18141' },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const n of ['get_status', 'play', 'loop', 'export_wav', 'export_midi', 'store_theme', 'save_set', 'go_back']) assert.ok(names.includes(n), n);
    const r = await client.callTool({ name: 'get_status', arguments: {} });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /Open http:\/\/127\.0\.0\.1:18141\//);
  } finally {
    await client.close();
  }
});
