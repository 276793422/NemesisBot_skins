// 诊断：newtask 按钮的 computed bg + CSS 加载顺序
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const http = require('node:http');

function httpJson(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 9333, path, method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = ''; res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const targets = await httpJson('/json/list');
  const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const WebSocket = require('C:/AI/NemesisBot_Rust/web/node_modules/ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  let id = 0;
  const cmd = async (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return (await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout ' + method)), 30000);
      const onMsg = (raw) => { const m = JSON.parse(raw.data); if (m.id === mid) { clearTimeout(timer); ws.removeEventListener('message', onMsg); resolve(m); } };
      ws.addEventListener('message', onMsg);
    })).result;
  };
  await cmd('Runtime.enable');
  const r = await cmd('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.nb-sb-newtask');
      if (!btn) return 'no-btn';
      const cs = getComputedStyle(btn);
      const nodes = Array.from(document.querySelectorAll('head > style, head > link[rel=stylesheet]')).map((el) => ({
        tag: el.tagName,
        href: el.href ? el.href.split('/').pop() : 'inline:' + (el.textContent || '').slice(0, 50).replace(/\\n/g, ' '),
      }));
      return JSON.stringify({
        bg: cs.backgroundColor,
        theme: document.documentElement.getAttribute('data-theme'),
        skin: document.documentElement.getAttribute('data-skin'),
        headNodes: nodes,
      }, null, 1);
    })()`,
    returnByValue: true,
  });
  console.log(r.result.value);
  ws.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
