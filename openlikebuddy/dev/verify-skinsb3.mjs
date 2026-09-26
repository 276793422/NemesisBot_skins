// 复查验证：launcher 态工具条退场（模板 v-if）+ flyout 全列 + 首屏截图
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
  const evalJs = async (expr, awaitP = false) => {
    const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: awaitP });
    return r.result ? r.result.value : undefined;
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: 'http://127.0.0.1:49010/' });
  await sleep(3500);

  const st = await evalJs(`(() => ({
    skin: document.documentElement.getAttribute('data-skin'),
    sidebar: !!document.querySelector('.nb-sb'),
    auth: !!document.querySelector('.auth-card'),
    hash: location.hash,
  }))()`);
  console.log('state:', JSON.stringify(st));
  if (st.auth) {
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

  // ① launcher 态：空会话自动选中 → 工具条应不在 DOM（模板 v-if，非 CSS 藏）
  const launcher = await evalJs(`(() => {
    const mode = document.querySelector('.nb-launcher-mode');
    const vt = document.querySelector('.voice-toolbar');
    const launcherEl = document.querySelector('.nb-launcher');
    return {
      launcherMode: !!mode,
      voiceToolbarInDom: !!vt,
      voiceToolbarDisplay: vt ? getComputedStyle(vt).display : null,
      launcherEl: !!launcherEl,
      launcherBrand: launcherEl ? launcherEl.textContent.trim().slice(0, 20) : null,
    };
  })()`);
  console.log('launcher check:', JSON.stringify(launcher));

  // ② flyout 全列（全量构建 25 项）
  await evalJs(`(async () => {
    document.querySelectorAll('.nb-sb-item')[4].click();
    await new Promise(r => setTimeout(r, 250));
    return 'ok';
  })()`, true);
  const flyout = await evalJs(`document.querySelectorAll('.nb-sb-flyout-item').length`);
  console.log('flyout items:', flyout);
  await evalJs(`document.body.click()`);
  await sleep(300);

  // 截图（launcher 空态首屏）
  await cmd('Page.captureScreenshot', {}).then((r) => {
    fs.writeFileSync('C:/AI/NemesisBot_Rust/skins/openlikebuddy/dev/shots/v2-final-launcher-dark.png', Buffer.from(r.data, 'base64'));
  });
  console.log('shot saved');

  ws.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
