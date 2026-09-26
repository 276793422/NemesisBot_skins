// CDP 验收：demo(49010) 皮肤激活态左侧栏 WB 形态（暗/亮双主题截图）
const CDP_PORT = 9333;
const BASE = 'http://127.0.0.1:49010';
const AUTH_KEY = 'buddy2026';
const OUT = process.argv[2] || 'C:/AI/NemesisBot_Rust/skins/openlikebuddy/dev/shots';

import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

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

function send(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
}

function waitMsg(ws, id, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout ' + id)), timeoutMs);
    const onMsg = (raw) => {
      const m = JSON.parse(raw.data);
      if (m.id === id) { clearTimeout(timer); ws.removeEventListener('message', onMsg); resolve(m); }
    };
    ws.addEventListener('message', onMsg);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const targets = await httpJson('/json/list');
  let page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) { console.error('no page target'); process.exit(1); }
  const WebSocket = require('C:/AI/NemesisBot_Rust/web/node_modules/ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  let id = 0;
  const cmd = async (method, params = {}) => {
    const mid = ++id;
    send(ws, mid, method, params);
    return (await waitMsg(ws, mid)).result;
  };
  const evalJs = async (expr, awaitP = false) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP });
    return r.result ? r.result.value : undefined;
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // 1. 打开首页（清掉旧 token，从登录态走）
  await evalJs(`localStorage.clear(); 'ok'`);
  await cmd('Page.navigate', { url: BASE + '/' });
  await sleep(2500);

  // 2. 登录（AuthOverlay：输入框 + 按钮）
  const login = await evalJs(`(async () => {
    const inp = document.querySelector('.auth-card input.form-input') || document.querySelector('input[type=password], input.form-input');
    if (!inp) return 'no-input:' + location.href;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, '${AUTH_KEY}');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const btn = document.querySelector('.auth-card button.btn') || document.querySelector('button.btn');
    if (!btn) return 'no-btn';
    btn.click();
    await new Promise(r => setTimeout(r, 1800));
    return 'logged-in:' + location.href;
  })()`, true);
  console.log('login:', login);
  await sleep(2000);

  // 3. 断言：皮肤激活 + 左侧栏结构
  const checks = await evalJs(`(() => {
    const html = document.documentElement;
    const q = (s) => document.querySelector(s);
    const qa = (s) => Array.from(document.querySelectorAll(s));
    return {
      skin: html.getAttribute('data-skin'),
      theme: html.getAttribute('data-theme'),
      sidebar: !!q('.nb-sb'),
      newtask: q('.nb-sb-newtask') ? q('.nb-sb-newtask').textContent.trim() : null,
      navs: qa('.nb-sb-item').map(e => e.textContent.trim()),
      sections: qa('.nb-sb-section').map(e => e.textContent.trim()),
      rows: qa('.nb-sb-row').length,
      footer: q('.nb-sb-footer') ? q('.nb-sb-footer').textContent.trim().slice(0, 40) : null,
      titlebar: q('.nb-titlebar') ? q('.nb-titlebar').textContent.trim() : null,
      statusbar: q('.nb-statusbar') ? q('.nb-statusbar').textContent.trim() : null,
      mainNavOld: !!q('.sidebar:not(.nb-sb)'),
      sessionSidebar: !!q('.session-sidebar, [class*="session-list"]'),
    };
  })()`);
  console.log('CHECKS:', JSON.stringify(checks, null, 1));

  // 4. 截图暗色
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync(OUT + '/v2-home-dark-skinsb.png', Buffer.from(r.data, 'base64'));
  });
  console.log('dark shot saved');

  // 5. 切亮色（SettingsView 主题切换；直接调 localStorage + data-theme 属性最稳）
  await evalJs(`(async () => {
    localStorage.setItem('nemesisbot_theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    await new Promise(r => setTimeout(r, 300));
    return document.documentElement.getAttribute('data-theme');
  })()`, true);
  await sleep(500);
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync(OUT + '/v2-home-light-skinsb.png', Buffer.from(r.data, 'base64'));
  });
  console.log('light shot saved');

  ws.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
