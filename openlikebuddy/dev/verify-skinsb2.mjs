// CDP 验收②：更多 flyout + 新建对话后会话历史出现 + 管理页可达
import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const CDP_PORT = 9333;
const BASE = 'http://127.0.0.1:49010';
const AUTH_KEY = 'buddy2026';
const OUT = 'C:/AI/NemesisBot_Rust/skins/openlikebuddy/dev/shots';

function httpJson(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: CDP_PORT, path, method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }
    );
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
    const res = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout ' + method)), 30000);
      const onMsg = (raw) => {
        const m = JSON.parse(raw.data);
        if (m.id === mid) { clearTimeout(timer); ws.removeEventListener('message', onMsg); resolve(m); }
      };
      ws.addEventListener('message', onMsg);
    });
    return res.result;
  };
  const evalJs = async (expr, awaitP = false) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP });
    return r.result ? r.result.value : undefined;
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // 已有 localStorage token（前一轮登录过）——直接进
  await cmd('Page.navigate', { url: BASE + '/' });
  await sleep(3000);
  const state = await evalJs(`(() => ({
    skin: document.documentElement.getAttribute('data-skin'),
    sidebar: !!document.querySelector('.nb-sb'),
    auth: !!document.querySelector('.auth-card'),
  }))()`);
  console.log('state:', JSON.stringify(state));
  if (state.auth) {
    // 需要重新登录
    await evalJs(`(async () => {
      const inp = document.querySelector('.auth-card input.form-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${AUTH_KEY}');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      document.querySelector('.auth-card button.btn').click();
      await new Promise(r => setTimeout(r, 1800));
      return 'ok';
    })()`, true);
    await sleep(1500);
  }

  // 1. 更多 flyout 展开 + 截图
  await evalJs(`(async () => {
    const items = document.querySelectorAll('.nb-sb-item');
    items[4].click();
    await new Promise(r => setTimeout(r, 300));
    return 'opened';
  })()`, true);
  await sleep(400);
  const flyout = await evalJs(`(() => {
    const f = document.querySelector('.nb-sb-flyout');
    return f ? { items: f.querySelectorAll('.nb-sb-flyout-item').length, sample: Array.from(f.querySelectorAll('.nb-sb-flyout-item')).slice(0,5).map(e=>e.textContent.trim()) } : null;
  })()`);
  console.log('flyout:', JSON.stringify(flyout));
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync(OUT + '/v2-flyout.png', Buffer.from(r.data, 'base64'));
  });

  // 2. 点 flyout 里「模型」→ 管理页可达（皮肤激活态下页面渲染 + 左侧栏仍在）
  await evalJs(`(async () => {
    const items = Array.from(document.querySelectorAll('.nb-sb-flyout-item'));
    const m = items.find(e => e.textContent.trim() === '模型');
    m.click();
    await new Promise(r => setTimeout(r, 1200));
    return location.hash;
  })()`, true);
  await sleep(800);
  const modelsPage = await evalJs(`(() => ({
    hash: location.hash,
    sidebarStill: !!document.querySelector('.nb-sb'),
    mainContent: (document.querySelector('.main-content') || document.body).textContent.slice(0, 120),
  }))()`);
  console.log('models page:', JSON.stringify(modelsPage, null, 1));
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync(OUT + '/v2-models-page.png', Buffer.from(r.data, 'base64'));
  });

  // 3. 回聊天页 → 点「新建对话」→ 会话列表出现
  await evalJs(`(async () => {
    location.hash = '#/';
    await new Promise(r => setTimeout(r, 800));
    document.querySelector('.nb-sb-newtask').click();
    await new Promise(r => setTimeout(r, 1500));
    return location.hash;
  })()`, true);
  await sleep(1000);
  const afterNew = await evalJs(`(() => {
    const rows = Array.from(document.querySelectorAll('.nb-sb-row')).map(e => e.textContent.trim());
    const sections = Array.from(document.querySelectorAll('.nb-sb-section')).map(e => e.textContent.trim());
    return { hash: location.hash, sections, rows, empty: document.querySelector('.nb-sb-empty')?.textContent || null };
  })()`);
  console.log('after new task:', JSON.stringify(afterNew, null, 1));
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync(OUT + '/v2-with-session.png', Buffer.from(r.data, 'base64'));
  });

  ws.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
