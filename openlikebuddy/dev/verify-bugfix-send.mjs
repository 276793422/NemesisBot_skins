// BUG 修复验证（2026-09-26「launcher 态发送右侧无反应」）：
// 1) 清空全部会话 → 未选中态（launcher）
// 2) 直接输入并发送（全程不点侧栏会话）
// 3) 断言时序：用户气泡即时回显 → 侧栏即时出现新会话行 → typing/工具卡实时可见
//    → 助手回复自动落地（无需任何点击）
// 4) 回复落地后点侧栏行：无重复、无串台
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
  await cmd('Page.navigate', { url: 'http://127.0.0.1:49010/' });
  await sleep(3500);

  const st0 = await evalJs(`(() => ({
    skin: document.documentElement.getAttribute('data-skin'),
    auth: !!document.querySelector('.auth-card'),
  }))()`);
  console.log('initial:', JSON.stringify(st0));
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

  // ① 删光全部会话 → currentId 回落 null（未选中态）
  await evalJs(`window.confirm = () => true; 'ok'`);
  for (let i = 0; i < 30; i++) {
    const n = await evalJs(`document.querySelectorAll('.nb-sb-row-del').length`);
    if (!n) break;
    await evalJs(`(async () => { const d = document.querySelector('.nb-sb-row-del'); if (d) d.click(); return 'ok'; })()`, true);
    await sleep(450);
  }
  await sleep(800);
  const st1 = await evalJs(`(() => ({
    rows: document.querySelectorAll('.nb-sb-row-del').length,
    empty: !!document.querySelector('.nb-sb-empty'),
    launcherMode: !!document.querySelector('.nb-launcher-mode'),
    msgs: document.querySelectorAll('.message').length,
  }))()`);
  console.log('after purge:', JSON.stringify(st1));
  if (st1.rows !== 0 || !st1.launcherMode) {
    console.error('FAIL: 未进入未选中 launcher 态');
    ws.close(); process.exit(1);
  }
  await cmd('Page.captureScreenshot', {}).then((r) => fs.writeFileSync(SHOTS + '/bugfix-0-launcher-empty.png', Buffer.from(r.data, 'base64')));

  // ② 直接输入并发送（不点任何侧栏元素）
  const sent = await evalJs(`(async () => {
    const ta = document.querySelector('.chat-input-area textarea');
    if (!ta) return 'no-textarea';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '验证会话锚定修复：请用 exec 工具执行 echo nbbugfix-2026 并告诉我输出');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    const btn = document.querySelector('.chat-input-area button.btn-primary');
    if (!btn) return 'no-send-btn';
    btn.click();
    return 'sent';
  })()`, true);
  console.log('send:', sent);
  if (sent !== 'sent') { console.error('FAIL: 发送失败'); ws.close(); process.exit(1); }

  // ③ 时序轮询（全程零点击）：气泡 / 侧栏行 / typing / 工具卡 / 回复落地
  const flags = { userBubble: false, sidebarRow: false, typing: false, toolCards: false, roundText: false, reply: false };
  let firstToolAt = -1, replyAt = -1;
  const t0 = Date.now();
  let pendingShot = false;
  while (Date.now() - t0 < 120000) {
    const s = await evalJs(`(() => ({
      user: document.querySelectorAll('.message.user .message-bubble').length,
      rows: document.querySelectorAll('.nb-sb-row-del').length, // 仅会话行有删除钮（本机行没有）
      typing: !!document.querySelector('.typing-indicator'),
      tools: document.querySelectorAll('.message.assistant .tool-cards .tool-call-card').length,
      grouped: !!document.querySelector('.message.assistant .tool-group-toggle'),
      round: document.querySelectorAll('.message.assistant .round-text').length,
      md: document.querySelectorAll('.message.assistant .markdown-body').length,
    }))()`);
    if (s.user > 0) flags.userBubble = true;
    if (s.rows > 0) flags.sidebarRow = true;
    if (s.typing) flags.typing = true;
    if (s.tools > 0 || s.grouped) { flags.toolCards = true; if (firstToolAt < 0) firstToolAt = Date.now() - t0; }
    if (s.round > 0) flags.roundText = true;
    if (s.md > 0 && !flags.reply) { flags.reply = true; replyAt = Date.now() - t0; }
    if (flags.userBubble && (flags.toolCards || flags.typing) && !pendingShot) {
      pendingShot = true;
      await cmd('Page.captureScreenshot', {}).then((r) => fs.writeFileSync(SHOTS + '/bugfix-1-pending.png', Buffer.from(r.data, 'base64')));
    }
    if (flags.reply) break;
    await sleep(500);
  }
  const elapsed = Date.now() - t0;
  console.log('flags:', JSON.stringify(flags), 'toolAt=', firstToolAt, 'replyAt=', replyAt, 'totalMs=', elapsed);

  // ④ 回复落地后点侧栏行：无重复、无串台
  const before = await evalJs(`({
    msgs: document.querySelectorAll('.message').length,
    md: document.querySelectorAll('.message.assistant .markdown-body').length,
  })`);
  await evalJs(`(async () => { const r = document.querySelector('.nb-sb-group .nb-sb-row'); if (r) r.click(); return 'ok'; })()`, true);
  await sleep(1200);
  const after = await evalJs(`(() => ({
    msgs: document.querySelectorAll('.message').length,
    md: document.querySelectorAll('.message.assistant .markdown-body').length,
    userText: (document.querySelector('.message.user .message-bubble') || {}).textContent || '',
    replyHead: ((document.querySelectorAll('.message.assistant .markdown-body')[0] || {}).textContent || '').slice(0, 60),
    rows: document.querySelectorAll('.nb-sb-row-del').length,
  }))()`);
  console.log('post-click:', JSON.stringify({ before, after }));
  await cmd('Page.captureScreenshot', {}).then((r) => fs.writeFileSync(SHOTS + '/bugfix-2-final.png', Buffer.from(r.data, 'base64')));

  const ok =
    flags.userBubble && flags.sidebarRow && (flags.typing || flags.toolCards) && flags.reply &&
    after.msgs === before.msgs && after.md === before.md && after.rows > 0;
  console.log(ok ? 'ALL PASS' : 'VERIFY FAIL');
  ws.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
