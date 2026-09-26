// 补验：锚定发送下工具卡实时渲染（强制模型走 exec 工具）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const http = require('node:http');
const fs = require('node:fs');

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
const SHOTS = 'C:/AI/NemesisBot_Rust/skins/openlikebuddy/dev/shots';

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
      const timer = setTimeout(() => reject(new Error('timeout ' + method)), 45000);
      const onMsg = (raw) => { const m = JSON.parse(raw.data); if (m.id === mid) { clearTimeout(timer); ws.removeEventListener('message', onMsg); resolve(m); } };
      ws.addEventListener('message', onMsg);
    })).result;
  };
  const evalJs = async (expr, awaitP = false) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP });
    return r.result ? r.result.value : undefined;
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // 新建对话（走「＋新建对话」按钮 → 锚定态发送路径）
  await cmd('Page.navigate', { url: 'http://127.0.0.1:49010/' });
  await sleep(3500);
  const st0 = await evalJs(`(() => ({ auth: !!document.querySelector('.auth-card') }))()`);
  if (st0.auth) {
    await evalJs(`(async () => {
      const inp = document.querySelector('.auth-card input.form-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'buddy2026');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      document.querySelector('.auth-card button.btn').click();
      await new Promise(r => setTimeout(r, 1800));
      return 'ok';
    })()`, true);
    await sleep(2000);
  }
  // 点新建对话 → 干净会话
  await evalJs(`(async () => { const b = document.querySelector('.nb-sb-newtask'); if (b) b.click(); return 'ok'; })()`, true);
  await sleep(800);

  const sent = await evalJs(`(async () => {
    const ta = document.querySelector('.chat-input-area textarea');
    if (!ta) return 'no-textarea';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '请调用 exec 工具，命令为：echo toolflow-check-2026。必须真实执行工具，不要自己编造输出。');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    document.querySelector('.chat-input-area button.btn-primary').click();
    return 'sent';
  })()`, true);
  console.log('send:', sent);

  const flags = { userBubble: false, typing: false, toolCards: false, toolNames: [], roundText: false, reply: false };
  const t0 = Date.now();
  let pendingShot = false;
  while (Date.now() - t0 < 120000) {
    const s = await evalJs(`(() => ({
      user: document.querySelectorAll('.message.user .message-bubble').length,
      typing: !!document.querySelector('.typing-indicator'),
      cards: [...document.querySelectorAll('.message.assistant .tool-cards .tool-call-card')].map(c => c.textContent.slice(0, 40)),
      round: document.querySelectorAll('.message.assistant .round-text').length,
      md: document.querySelectorAll('.message.assistant .markdown-body').length,
    }))()`);
    if (s.user > 0) flags.userBubble = true;
    if (s.typing) flags.typing = true;
    if (s.cards.length > 0 && !flags.toolCards) { flags.toolCards = true; flags.toolNames = s.cards; }
    if (s.round > 0) flags.roundText = true;
    if (s.md > 0 && !flags.reply) flags.reply = true;
    if (flags.toolCards && !pendingShot) {
      pendingShot = true;
      await cmd('Page.captureScreenshot', {}).then((r) => fs.writeFileSync(SHOTS + '/bugfix-3-tools-pending.png', Buffer.from(r.data, 'base64')));
    }
    if (flags.reply) break;
    await sleep(500);
  }
  console.log('flags:', JSON.stringify(flags), 'totalMs=', Date.now() - t0);
  await cmd('Page.captureScreenshot', {}).then((r) => fs.writeFileSync(SHOTS + '/bugfix-4-tools-final.png', Buffer.from(r.data, 'base64')));
  const ok = flags.userBubble && flags.reply;
  console.log(flags.toolCards ? 'TOOL FLOW VERIFIED' : 'NO TOOL ROUND (model chose text-only)', ok ? '/ SEND PATH OK' : '/ FAIL');
  ws.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
