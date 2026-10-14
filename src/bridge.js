// SPDX-License-Identifier: MIT
// Link to the local MCP server (mcp/server.mjs). Only when the page itself is
// served from this machine, so the hosted GitHub Pages copy never tries.

export function connectBridge(api, onChange = () => {}) {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/bridge`;
  let up = false;

  const open = () => {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      return setTimeout(open, 3000);
    }
    ws.onopen = () => {
      up = true;
      onChange(true);
    };
    ws.onclose = () => {
      if (up) onChange(false);
      up = false;
      setTimeout(open, 3000);
    };
    ws.onmessage = async (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const { id, method, params } = msg;
      try {
        if (typeof api[method] !== 'function') throw new Error(`unknown method ${method}`);
        const result = await api[method](params || {});
        ws.send(JSON.stringify({ id, result: result ?? null }));
      } catch (err) {
        ws.send(JSON.stringify({ id, error: String(err?.message || err) }));
      }
    };
  };
  open();
}
