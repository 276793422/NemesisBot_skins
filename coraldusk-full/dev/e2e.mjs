// coraldusk-full 皮肤 CDP E2E（plan §5.3 脚本 E2E 矩阵 + P1 截图）。
//
// 前置（由 run-e2e 准备，见 README）：
//   - gateway 已在 --url 指定地址运行（隔离 NEMESISBOT_HOME，无 dashboard 鉴权）
//   - ui.skin=coraldusk-full + ui.skins.allow_scripts=true（首次跑）
//   - exe 同级 skins/ 已装 coraldusk.nbskin + coraldusk-full.nbskin
//
// 用法：node dev/e2e.mjs --url http://127.0.0.1:18790 [--shots ../shots]
// 退出码 0=全过；1=有失败（逐条列差异）。零依赖（Node ≥22 全局 WebSocket/fetch）。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ---------- 参数 ----------
function argOf(name, def) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : def
}
const BASE = argOf('--url', 'http://127.0.0.1:18790')
const SHOTS = resolve(import.meta.dirname, argOf('--shots', '../shots'))
const CDP_PORT = 9339
const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- Chrome（headless CDP） ----------
function findChrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]
  return candidates.find((p) => existsSync(p))
}

async function withChrome(fn) {
  const exe = findChrome()
  if (!exe) throw new Error('未找到 Chrome/Edge（无法跑 CDP E2E）')
  const profile = join(SHOTS, '.cdp-profile')
  const chrome = spawn(exe, [
    '--headless=new', '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' })
  try {
    // 轮询 CDP 就绪（SAC/慢机重试）
    let version = null
    for (let i = 0; i < 40 && !version; i++) {
      await sleep(250)
      try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json() } catch { /* retry */ }
    }
    if (!version) throw new Error('CDP 端口未就绪')
    return await fn()
  } finally {
    try { chrome.kill() } catch { /* noop */ }
    await sleep(300)
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }) } catch { /* 下次覆盖 */ }
  }
}

// ---------- CDP 会话 ----------
async function cdpTab(url) {
  // 新版 Chrome /json/new?url= 不保证导航——取首个 page target 再显式
  // Page.navigate（实测 about:blank 启动 tab 一定存在）。
  const tabs = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = tabs.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let seq = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  const send = (method, params = {}) => new Promise((r) => {
    const id = ++seq
    pending.set(id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
  if (url) {
    await send('Page.enable')
    await send('Page.navigate', { url })
    await sleep(1500)
  }
  return {
    send,
    close: () => ws.close(),
    /** 页面内求值；表达式可 async。返回 value。 */
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.result?.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text))
      return r.result?.result?.value
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(SHOTS, file), Buffer.from(r.result.data, 'base64'))
    },
    async emulateScheme(scheme) {
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: scheme }],
      })
    },
    async reload() {
      await send('Page.reload')
      await sleep(1200)
    },
  }
}

/** 页面内轮询求值直到 truthy（超时抛错并带最后值）。 */
async function waitFor(tab, expr, label, timeoutMs = 15000) {
  const t0 = Date.now()
  let last
  while (Date.now() - t0 < timeoutMs) {
    try { last = await tab.eval(expr); if (last) return last } catch { /* 页面跳转中重试 */ }
    await sleep(300)
  }
  throw new Error(`等待超时: ${label}（最后值=${JSON.stringify(last)}）`)
}

// ---------- WSAPI 客户端（setup/断言用） ----------
function wsapi(portWs) {
  return (module, cmd, data) => new Promise((r, j) => {
    const ws = new WebSocket(portWs)
    const reqId = 'e2e-' + Math.random().toString(36).slice(2)
    const t = setTimeout(() => { ws.close(); j(new Error(`WSAPI 超时 ${module}.${cmd}`)) }, 10000)
    ws.onopen = () => ws.send(JSON.stringify({ type: 'request', module, cmd, reqId, data: data ?? {} }))
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'response' && msg.reqId === reqId) {
        clearTimeout(t); ws.close()
        msg.ok === false ? j(new Error(msg.error ?? 'WSAPI 错误')) : r(msg.data ?? msg)
      }
    }
    ws.onerror = () => { clearTimeout(t); j(new Error('WS 连接失败')) }
  })
}

// ---------- HTTP 端点断言 ----------
async function endpoint(path) {
  const res = await fetch(BASE + path)
  return { status: res.status, ctype: res.headers.get('content-type') ?? '', skinId: res.headers.get('x-skin-id') ?? '', text: res.status === 200 ? await res.text() : '' }
}

// ---------- 主流程 ----------
mkdirSync(SHOTS, { recursive: true })
const api = wsapi(BASE.replace('http', 'ws') + '/ws')
const browserBroken = await withChrome(async () => {
  const tab = await cdpTab(BASE + '/')
  try {
    // ---- S0 认证通过（服务端 token 空 = 任意 token 过闸；走真实 autoLogin
    // 路径：localStorage 种 token → reload → testConnection → authenticated）----
    await tab.eval(`localStorage.setItem('nemesisbot_auth_token', 'e2e')`)
    await tab.reload()
    // ---- S1 应用启动（原生壳在场） ----
    await waitFor(tab, `!!document.querySelector('.sidebar')`, '原生侧栏（应用启动）')

    // ---- S2 脚本同意卡（allow_scripts=true + 带脚本包首激活） ----
    await tab.eval(`location.hash = '#/settings'`)
    await waitFor(tab, `[...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === '皮肤')`, '设置页 tab')
    await tab.eval(`[...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === '皮肤').click()`)
    const consent = await waitFor(tab, `!!document.querySelector('[data-test="script-consent"]')`, '脚本同意卡')
    record('S2 同意卡出现（逐包首激活）', !!consent)
    await tab.shot('s2-consent-card.png')
    await tab.eval(`document.querySelector('[data-test="script-allow"]').click()`)

    // ---- S3 脚本注入 + P3-a 合并导航 ----
    await waitFor(tab, `document.documentElement.getAttribute('data-nb-skin-state') === 'active'`, '脚本 active 标记')
    const s3 = await tab.eval(`(() => {
      const nav = document.querySelector('[data-nb-skin-nav]')
      const titles = [...document.querySelectorAll('.nbk-nav-group-title')].map(e => e.textContent)
      const ids = [...document.querySelectorAll('.nbk-nav-item')].map(e => e.getAttribute('data-nbk-id'))
      return {
        scriptEl: !!document.querySelector('script[data-nb-skin-script]'),
        shell: document.documentElement.getAttribute('data-nb-shell'),
        skinAttr: document.documentElement.getAttribute('data-skin'),
        nativeHidden: getComputedStyle(document.querySelector('aside.sidebar')).display === 'none',
        titles, ids,
      }
    })()`)
    record('S3 脚本元素已注入', s3.scriptEl)
    record('S3 友好壳激活 + 原生侧栏隐藏', s3.shell === 'friendly' && s3.nativeHidden, `shell=${s3.shell} nativeHidden=${s3.nativeHidden}`)
    record('S3 合并分组（主页/能力/高级/设置/安全）', ['主页', '能力', '高级', '设置', '安全'].every(t => s3.titles.includes(t)), `titles=${JSON.stringify(s3.titles)}`)
    record('S3 导航项齐全', ['chat', 'overview', 'usage', 'logs', 'memory', 'skills', 'mcp', 'channels', 'workflows', 'cluster', 'forge', 'settings', 'security', 'scanner', 'sandbox'].every(id => s3.ids.includes(id)), `ids=${s3.ids.length}项`)
    await tab.shot('s3-friendly-shell.png')

    // ---- S4 契约 navigate（点导航项跳路由；高亮等 renderNav 重绘完成） ----
    await tab.eval(`document.querySelector('[data-nbk-id="overview"]').click()`)
    await waitFor(tab, `document.querySelector('[data-nbk-id="overview"]')?.classList.contains('active')`, 'overview 跳转 + 高亮跟随')
    record('S4 navigate 跳转 + 高亮跟随', true)

    // ---- S5 友好设置表单（P3-b） ----
    await tab.eval(`document.querySelector('.nbk-nav-foot button').click()`)
    await waitFor(tab, `!!document.querySelector('[data-nb-skin-form] .nbk-form-body .nbk-field')`, '表单字段渲染')
    const s5 = await tab.eval(`(() => ({
      tabs: document.querySelectorAll('.nbk-tab').length,
      switches: document.querySelectorAll('.nbk-switch').length,
      sliders: document.querySelectorAll('.nbk-range').length,
      selects: document.querySelectorAll('.nbk-select').length,
      inputs: document.querySelectorAll('.nbk-input').length,
      passwords: document.querySelectorAll('.nbk-input[type="password"]').length,
      labels: document.querySelectorAll('.nbk-field-label').length,
    }))()`)
    record('S5 表单页签+四类控件', s5.tabs >= 10 && s5.switches > 0 && s5.sliders > 0 && s5.selects > 0 && s5.inputs > 0, JSON.stringify(s5))
    // 密码框在「工具」页（brave.api_key 等 secret 字段）——切页断言
    await tab.eval(`[...document.querySelectorAll('.nbk-tab')].find(b => b.textContent.trim() === '工具').click()`)
    await waitFor(tab, `document.querySelectorAll('[data-nb-skin-form] .nbk-input[type="password"]').length > 0`, '工具页密码框')
    await tab.shot('s5-friendly-form.png')
    // 写回一发：温度滑块 change → config.set_field 落账
    await tab.eval(`(() => {
      const s = document.querySelector('.nbk-range'); s.value = '0.9'
      s.dispatchEvent(new Event('change')); return true
    })()`)
    await sleep(800)
    const s5w = await tab.eval(`document.querySelector('.nbk-form-body')?.textContent.includes('已保存')`)
    record('S5 写回走契约 API（已保存回显）', !!s5w)
    await tab.eval(`document.querySelector('.nbk-form-head button').click()`) // 关闭

    // ---- S6 双壳切换（P3-c） ----
    await tab.eval(`document.querySelector('[data-nb-skin-shell-chip]').click()`)
    const s6 = await tab.eval(`(() => ({
      shell: document.documentElement.getAttribute('data-nb-shell'),
      navHidden: getComputedStyle(document.querySelector('.nbk-nav')).display === 'none',
      nativeVisible: getComputedStyle(document.querySelector('aside.sidebar')).display !== 'none',
      stored: localStorage.getItem('nemesisbot_skin_shell'),
    }))()`)
    record('S6 切经典壳：皮肤导航隐藏 + 原生侧栏回归', s6.shell === 'classic' && s6.navHidden && s6.nativeVisible, JSON.stringify(s6))
    await tab.shot('s6-classic-shell.png')

    // ---- S7 持久化：刷新后仍 classic + 脚本免重同意自动运行 ----
    await tab.reload()
    await waitFor(tab, `document.documentElement.getAttribute('data-nb-skin-state') === 'active'`, '刷新后脚本自动运行（同意已缓存）')
    const s7 = await tab.eval(`(() => ({
      shell: document.documentElement.getAttribute('data-nb-shell'),
      consentCard: !!document.querySelector('[data-test="script-consent"]'),
      navThere: !!document.querySelector('.nbk-nav'),
    }))()`)
    record('S7 刷新后双壳持久化 + 免重同意', s7.shell === 'classic' && s7.navThere && !s7.consentCard, JSON.stringify(s7))

    // ---- S8 总闸关闭 = 刷新边界（live 注入态退出 → reload，脚本不复活） ----
    await tab.eval(`location.hash = '#/settings'`)
    await waitFor(tab, `[...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === '皮肤')`, '设置页 tab')
    await tab.eval(`[...document.querySelectorAll('.tab')].find(b => b.textContent.trim() === '皮肤').click()`)
    await waitFor(tab, `!!document.querySelector('[data-test="script-switch"] input')`, '脚本总闸')
    await tab.eval(`const i = document.querySelector('[data-test="script-switch"] input'); i.checked = false; i.dispatchEvent(new Event('change'))`)
    // 页面将自动 reload —— 等 reload 后原生壳回来
    await waitFor(tab, `!!document.querySelector('.sidebar')`, '总闸关闭触发刷新', 20000)
    await sleep(1500)
    const s8 = await tab.eval(`(() => ({
      scriptEl: !!document.querySelector('script[data-nb-skin-script]'),
      nav: !!document.querySelector('.nbk-nav'),
      state: document.documentElement.getAttribute('data-nb-skin-state'),
      skin: document.documentElement.getAttribute('data-skin'),
    }))()`)
    record('S8 关总闸=刷新边界：脚本不复活、纯 CSS 观感保持', !s8.scriptEl && !s8.nav && s8.skin === 'coraldusk-full', JSON.stringify(s8))
    const epScript = await endpoint('/skins/active/script')
    record('S8 脚本端点 403（总闸关）', epScript.status === 403, `status=${epScript.status}`)

    // ---- S9 P1 纯 CSS 皮肤（coraldusk）：激活 + 无脚本 + 明暗截图 ----
    // 激活走 WSAPI skins.set_active（写 config + 翻内存锁双管；config.set_field
    // 只写盘不翻锁，运行期 active.css 不切）。
    await api('skins', 'set_active', { id: 'coraldusk' })
    await tab.reload()
    await waitFor(tab, `document.documentElement.getAttribute('data-skin') === 'coraldusk'`, 'coraldusk 激活')
    const s9 = await tab.eval(`!!document.querySelector('script[data-nb-skin-script]')`)
    record('S9 纯 CSS 包零脚本元素', !s9)
    const epCss = await endpoint('/skins/active.css')
    record('S9 active.css 200 + X-Skin-Id', epCss.status === 200 && epCss.skinId === 'coraldusk', `status=${epCss.status} id=${epCss.skinId}`)
    await tab.eval(`location.hash = '#/'`)
    await sleep(1200)
    await tab.emulateScheme('dark')
    await sleep(400)
    await tab.shot('s9-coraldusk-home-dark.png')
    await tab.emulateScheme('light')
    await sleep(400)
    await tab.shot('s9-coraldusk-home-light.png')

    // ---- S10 端点契约回位：总闸重开 → 脚本端点 200；关皮肤 → active.css 404 ----
    await api('config', 'set_field', { path: 'ui.skins.allow_scripts', value: true })
    await api('skins', 'set_active', { id: 'default' })
    const ep2 = await endpoint('/skins/active.css')
    record('S10 复位 ui.skin=default → active.css 404（关皮肤语义）', ep2.status === 404, `status=${ep2.status}`)
    return null
  } catch (e) {
    return e
  } finally {
    tab.close()
  }
})

if (browserBroken) {
  record('E2E 主流程', false, String(browserBroken.message ?? browserBroken))
}

const failed = results.filter((r) => !r.ok)
console.log(`\n==== E2E 结果: ${results.length - failed.length}/${results.length} 过 ====`)
if (failed.length) {
  console.log('失败项:')
  for (const f of failed) console.log(`  ✗ ${f.name} — ${f.detail}`)
  process.exit(1)
}
