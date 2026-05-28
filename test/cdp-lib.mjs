// Zero-dependency Chrome DevTools Protocol client + static file server.
//
// No npm install required: drives the locally installed Chrome over CDP using
// only Node's built-in modules (http, child_process, and the global
// WebSocket available in Node >= 22). Set BLEEDBLEND_CHROME to override the
// Chrome binary path.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = process.env.BLEEDBLEND_CHROME ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// Serve files under rootDir. Used to serve the real ./src so tests exercise
// the actual shipped files, plus generated test pages.
export function startServer(port, rootDir) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, url);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

export async function launchChrome(port) {
  if (!fs.existsSync(CHROME)) {
    throw new Error(`Chrome not found at "${CHROME}". Set BLEEDBLEND_CHROME to the binary path.`);
  }
  const userDir = `${tmpDir()}/bbchrome-${port}`;
  fs.rmSync(userDir, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--disable-extensions', '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore' });
  const deadline = Date.now() + 15000;
  let wsUrl = null;
  while (Date.now() < deadline) {
    try {
      const j = await fetchJson(`http://localhost:${port}/json/version`);
      if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(150);
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome did not become ready'); }
  return { proc, wsUrl };
}

function tmpDir() {
  return process.env.TMPDIR ? process.env.TMPDIR.replace(/\/$/, '') : '/tmp';
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal CDP client over the browser websocket using flatten sessions.
export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.method + ': ' + JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) {
          if (l.method === msg.method && (l.sessionId == null || l.sessionId === msg.sessionId)) l.fn(msg.params, msg.sessionId);
        }
      }
    });
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    return new CDP(ws);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
  on(method, fn, sessionId) {
    const l = { method, fn, sessionId };
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter((x) => x !== l); };
  }
  once(method, sessionId, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const off = this.on(method, (p) => { off(); clearTimeout(t); resolve(p); }, sessionId);
      const t = setTimeout(() => { off(); reject(new Error('timeout waiting ' + method)); }, timeoutMs);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

// Open a fresh page target with console/exception capture wired up.
export async function openPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  const errors = [];
  cdp.on('Runtime.exceptionThrown', (p) => {
    errors.push('exception: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'unknown'));
  }, sessionId);
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') errors.push('console.error: ' + p.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }, sessionId);
  return { targetId, sessionId, errors };
}

export async function evaluate(cdp, sessionId, expression, awaitPromise = true) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sessionId);
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
