/**
 * CoralDusk Full — 行为层皮肤脚本（P3-a 导航重组 / P3-b 友好表单 / P3-c 双壳）。
 *
 * 只对宿主契约 `window.NemesisSkin`（v1）编程：`nav.model()` 取结构化导航、
 * `navigate(id)` 跳转、`config.schema(page)` 取字段 schema、`config.current()`
 * /`config.set(path, value)` 读写配置。绝不抓取宿主内部 DOM——唯一的 DOM
 * 锚点是容器标记 `[data-nb-shell]`（root/main/sidebar/mobile-overlay 四标记，
 * 契约一部分，宿主 contract.spec 有守护测试）。
 *
 * **降级链**：契约缺失 / 版本不符 / 运行期异常 → 不做任何 DOM 手术，
 * `html[data-nb-skin-state="degraded:<原因>"]` 如实标注，页面保持纯 CSS
 * 观感（coraldusk.css 载荷照常生效）；成功则标注 `active`。
 *
 * **双壳**：`friendly`（本脚本渲染的合并导航侧栏，原生侧栏 CSS 隐藏但
 * 在场）与 `classic`（原生侧栏，本脚本只保留右下角切换钮），localStorage
 * `nemesisbot_skin_shell` 持久化。所有壳样式由本脚本注入的 <style> 承载
 * ——脚本死了壳样式一起消失，不会留下「隐藏原生侧栏的孤儿 CSS」。
 */
(function () {
  'use strict'

  var html = document.documentElement
  function degrade(reason) {
    try { html.setAttribute('data-nb-skin-state', 'degraded:' + reason) } catch (_) { /* noop */ }
  }

  // ---- 契约协商（降级链第一闸）----
  var api = window.NemesisSkin
  if (!api) { degrade('contract-missing'); return }
  if (api.version !== 1) { degrade('contract-version-' + api.version); return }

  try { main(api) } catch (e) {
    degrade('error:' + (e && e.message ? e.message : String(e)))
    html.removeAttribute('data-nb-shell') // 装配中途异常：撤销壳属性，不留半套状态
    return
  }
  html.setAttribute('data-nb-skin-state', 'active')

  // ------------------------------------------------------------------

  function main(api) {
    var SHELL_KEY = 'nemesisbot_skin_shell'

    // ---- P3-a：合并导航分组（按契约 id 归组；末尾兜底组保证「分组表
    // 未认领的模型 id」照样可达——宿主新增页面不会因皮肤分组表滞后而
    // 隐藏；feature 裁剪构建不在模型的 id 天然收敛为空组）----
    var GROUPS = [
      { title: null, ids: ['chat'] },
      { title: '主页', ids: ['overview', 'usage', 'logs', 'memory'] },
      { title: null, ids: ['persona', 'models'] },
      { title: '能力', ids: ['skills', 'mcp', 'hooks', 'commands', 'plugins', 'subagents', 'channels', 'workflows', 'persona-shop'] },
      { title: '高级', ids: ['cluster', 'forge', 'local-models', 'coding', 'board', 'terminal', 'sdk'] },
      { title: '设置', ids: ['settings', 'tasks', 'tools', 'proxy-settings'] },
      { title: '安全', ids: ['security', 'scanner', 'sandbox'] },
      { title: null, ids: ['about', 'license'] },
    ]

    function groupedNav() {
      var model = api.nav.model()
      var byId = {}
      var claimed = {}
      model.forEach(function (i) { byId[i.id] = i })
      var groups = GROUPS.map(function (g) {
        return {
          title: g.title,
          items: g.ids.map(function (id) { claimed[id] = true; return byId[id] }).filter(Boolean),
        }
      })
      var rest = model.filter(function (i) { return !claimed[i.id] })
      if (rest.length) groups.push({ title: null, items: rest })
      return groups.filter(function (g) { return g.items.length > 0 })
    }

    function currentRouteId() {
      var hash = location.hash.replace(/^#/, '') || '/'
      var path = hash.split('?')[0] || '/'
      var hit = api.nav.model().filter(function (i) { return i.route === path })[0]
      return hit ? hit.id : ''
    }

    // ---- 壳样式（脚本注入：随脚本生死，不进 CSS 载荷）。选择器只锚
    // 契约标记 [data-nb-shell]，绝不引用宿主内部类名——宿主重构类名
    // 不破皮肤（破标记 = contract.spec 红，先于皮肤烂掉被发现）。----
    var CSS = [
      'html[data-skin="coraldusk-full"][data-nb-shell="friendly"] [data-nb-shell="sidebar"]{display:none!important}',
      'html[data-skin="coraldusk-full"][data-nb-shell="friendly"] [data-nb-shell="mobile-overlay"]{display:none!important}',
      '.nbk-nav{position:fixed;top:0;left:0;bottom:0;width:224px;z-index:60;display:flex;flex-direction:column;',
      'background:var(--nb-surface,#252a33);border-right:1px solid var(--nb-border,rgba(255,255,255,.08));',
      'padding:14px 10px calc(14px + 44px);overflow-y:auto;transition:transform .3s cubic-bezier(.16,1,.3,1)}',
      '.nbk-nav-group-title{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--nb-text-dim,#7a756f);margin:14px 10px 6px}',
      '.nbk-nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;margin:1px 0;border-radius:10px;cursor:pointer;',
      'color:var(--nb-text,#f0ebe5);font-size:13.5px;transition:background .2s,transform .2s cubic-bezier(.34,1.56,.64,1)}',
      '.nbk-nav-item:hover{background:var(--nb-hover,rgba(255,255,255,.06));transform:translateX(2px)}',
      '.nbk-nav-item.active{background:var(--nb-accent-soft,rgba(232,112,90,.16));color:var(--nb-accent,#e8705a)}',
      '.nbk-nav-item svg{flex:0 0 auto;opacity:.85}',
      '.nbk-nav-foot{position:absolute;left:10px;right:10px;bottom:12px;display:flex;gap:8px}',
      '.nbk-btn{flex:1;padding:8px 10px;border-radius:12px;border:1px solid var(--nb-border,rgba(255,255,255,.08));',
      'background:transparent;color:var(--nb-text,#f0ebe5);font-size:12.5px;cursor:pointer;transition:border-color .2s,background .2s}',
      '.nbk-btn:hover{border-color:var(--nb-accent,#e8705a);background:var(--nb-hover,rgba(255,255,255,.06))}',
      '.nbk-chip{position:fixed;right:16px;bottom:16px;z-index:70;padding:8px 14px;border-radius:999px;border:none;cursor:pointer;',
      'background:var(--nb-accent,#e8705a);color:#fff;font-size:12.5px;box-shadow:0 6px 18px rgba(0,0,0,.25);',
      'transition:transform .2s cubic-bezier(.34,1.56,.64,1)}',
      '.nbk-chip:hover{transform:translateY(-2px)}',
      'html[data-nb-shell="classic"] .nbk-nav{display:none}',
      '.nbk-form-overlay{position:fixed;inset:0;z-index:80;background:rgba(10,12,16,.55);display:flex;align-items:center;justify-content:center}',
      '.nbk-form-panel{width:min(680px,92vw);max-height:82vh;display:flex;flex-direction:column;border-radius:16px;',
      'background:var(--nb-surface,#252a33);border:1px solid var(--nb-border,rgba(255,255,255,.08));box-shadow:0 18px 48px rgba(0,0,0,.4)}',
      '.nbk-form-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--nb-border,rgba(255,255,255,.08))}',
      '.nbk-form-head b{color:var(--nb-text,#f0ebe5);font-size:15px}',
      '.nbk-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:12px 20px 0}',
      '.nbk-tab{padding:6px 12px;border-radius:999px;border:1px solid var(--nb-border,rgba(255,255,255,.08));background:transparent;',
      'color:var(--nb-text-dim,#b8b2aa);font-size:12.5px;cursor:pointer;transition:all .2s}',
      '.nbk-tab.on{background:var(--nb-accent,#e8705a);border-color:var(--nb-accent,#e8705a);color:#fff}',
      '.nbk-form-body{overflow-y:auto;padding:14px 20px 20px;display:flex;flex-direction:column;gap:14px}',
      '.nbk-field{display:flex;flex-direction:column;gap:6px}',
      '.nbk-field-label{display:flex;justify-content:space-between;color:var(--nb-text,#f0ebe5);font-size:13px}',
      '.nbk-field-label code{color:var(--nb-text-dim,#7a756f);font-size:11px}',
      '.nbk-switch{position:relative;width:42px;height:23px;border-radius:999px;border:none;cursor:pointer;transition:background .2s;',
      'background:var(--nb-border,rgba(255,255,255,.15));align-self:flex-start}',
      '.nbk-switch::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}',
      '.nbk-switch.on{background:var(--nb-accent,#e8705a)}',
      '.nbk-switch.on::after{transform:translateX(19px)}',
      '.nbk-range{width:100%;accent-color:var(--nb-accent,#e8705a)}',
      '.nbk-select,.nbk-input{padding:8px 10px;border-radius:10px;border:1px solid var(--nb-border,rgba(255,255,255,.1));',
      'background:var(--nb-bg,#1a1d23);color:var(--nb-text,#f0ebe5);font-size:13px;outline:none}',
      '.nbk-select:focus,.nbk-input:focus{border-color:var(--nb-accent,#e8705a)}',
      '.nbk-hint{color:var(--nb-text-dim,#7a756f);font-size:11.5px}',
      '.nbk-ok{color:#6dd89c}',
      '.nbk-err{color:#e87a7a}',
      '@media (prefers-color-scheme:light), (min-width:0){html[data-skin="coraldusk-full"][data-theme="light"] .nbk-nav{background:#fff;border-color:rgba(0,0,0,.06)}}',
    ].join('')

    // ---- DOM 装配（先脱管构建，最后统一上树——见文件尾启动段）----
    var style = document.createElement('style')
    style.setAttribute('data-nb-skin-shell-style', '')
    style.textContent = CSS

    var nav = document.createElement('nav')
    nav.className = 'nbk-nav'
    nav.setAttribute('data-nb-skin-nav', '') // 自家产物标记（自清理用）

    function svgIcon(d) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      s.setAttribute('width', '16'); s.setAttribute('height', '16')
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none')
      s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2')
      s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round')
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', d)
      s.appendChild(p)
      return s
    }

    function renderNav() {
      nav.textContent = ''
      var current = currentRouteId()
      groupedNav().forEach(function (g) {
        if (g.title) {
          var t = document.createElement('div')
          t.className = 'nbk-nav-group-title'
          t.textContent = g.title
          nav.appendChild(t)
        }
        g.items.forEach(function (item) {
          var a = document.createElement('a')
          a.className = 'nbk-nav-item' + (item.id === current ? ' active' : '')
          a.setAttribute('data-nbk-id', item.id)
          a.appendChild(svgIcon(item.icon))
          var span = document.createElement('span')
          span.textContent = item.label
          a.appendChild(span)
          a.addEventListener('click', function () { api.navigate(item.id) })
          nav.appendChild(a)
        })
      })
      // 底部操作区：友好设置（P3-b）+ 经典壳切换（P3-c）
      var foot = document.createElement('div')
      foot.className = 'nbk-nav-foot'
      var formBtn = document.createElement('button')
      formBtn.className = 'nbk-btn'
      formBtn.textContent = '✦ 友好设置'
      formBtn.addEventListener('click', openForm)
      var shellBtn = document.createElement('button')
      shellBtn.className = 'nbk-btn'
      shellBtn.textContent = '▤ 经典壳'
      shellBtn.addEventListener('click', function () { setShell('classic') })
      foot.appendChild(formBtn); foot.appendChild(shellBtn)
      nav.appendChild(foot)
    }

    // ---- P3-c：双壳 ----
    function setShell(mode) {
      localStorage.setItem(SHELL_KEY, mode)
      html.setAttribute('data-nb-shell', mode)
      chip.textContent = mode === 'friendly' ? '▤ 经典壳' : '✦ 简洁壳'
      renderNav()
    }

    var chip = document.createElement('button')
    chip.className = 'nbk-chip'
    chip.setAttribute('data-nb-skin-shell-chip', '')
    chip.addEventListener('click', function () {
      setShell(html.getAttribute('data-nb-shell') === 'friendly' ? 'classic' : 'friendly')
    })

    // 路由高亮跟随：Vue Router 的 hash 模式走 history.pushState——不触发
    // hashchange，所以包一层 pushState/replaceState（通用 Web 平台 API，
    // 非宿主内部）；popstate/hashchange 兜底浏览器前进后退。包装器内的
    // 重渲染吞异常——皮肤高亮失败绝不能把异常注入宿主导航调用链。
    var _renderNav = renderNav
    function renderNavSafe() {
      try { _renderNav() } catch (_) { /* 高亮重绘失败不影响导航本身 */ }
    }
    ;['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m]
      history[m] = function () {
        var r = orig.apply(this, arguments)
        renderNavSafe()
        return r
      }
    })
    window.addEventListener('popstate', renderNavSafe)
    window.addEventListener('hashchange', renderNavSafe)

    // ---- P3-b：友好设置表单 ----
    var overlay = null
    function closeForm() {
      if (overlay) { overlay.remove(); overlay = null }
    }

    function valueAt(cfg, path) {
      var cur = cfg
      var parts = path.split('.')
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = cur[parts[i]]
      }
      return cur
    }

    function openForm() {
      closeForm()
      overlay = document.createElement('div')
      overlay.className = 'nbk-form-overlay'
      overlay.setAttribute('data-nb-skin-form', '')
      var panel = document.createElement('div')
      panel.className = 'nbk-form-panel'

      var head = document.createElement('div')
      head.className = 'nbk-form-head'
      var title = document.createElement('b')
      title.textContent = '✦ 友好设置'
      var close = document.createElement('button')
      close.className = 'nbk-btn'
      close.textContent = '✕ 关闭'
      close.addEventListener('click', closeForm)
      head.appendChild(title); head.appendChild(close)
      panel.appendChild(head)

      var tabs = document.createElement('div')
      tabs.className = 'nbk-tabs'
      var body = document.createElement('div')
      body.className = 'nbk-form-body'
      var status = document.createElement('div')
      status.className = 'nbk-hint'

      Promise.all([api.config.current(), api.config.pages()]).then(function (r) {
        var cfg = r[0]
        var pages = r[1]
        var pageButtons = {}
        function selectPage(pid) {
          Object.keys(pageButtons).forEach(function (k) {
            pageButtons[k].classList.toggle('on', k === pid)
          })
          renderPage(pid)
        }
        function renderPage(pid) {
          body.textContent = ''
          status.textContent = ''
          status.className = 'nbk-hint'
          var page = api.config.schema(pid)
          if (!page) { status.textContent = '页不可用'; return }
          page.fields.forEach(function (f) { body.appendChild(renderField(f, cfg)) })
        }
        pages.forEach(function (pid) {
          var b = document.createElement('button')
          b.className = 'nbk-tab'
          var sch = api.config.schema(pid)
          b.textContent = sch ? sch.title : pid
          b.addEventListener('click', function () { selectPage(pid) })
          tabs.appendChild(b)
          pageButtons[pid] = b
        })
        panel.appendChild(tabs)
        panel.appendChild(body)
        panel.appendChild(status)
        var first = pages[0]
        if (first) selectPage(first)
      }, function () {
        status.textContent = '⚠ 配置读取失败（WS 未连接？）——表单不可用'
        status.className = 'nbk-hint nbk-err'
        panel.appendChild(tabs); panel.appendChild(status)
      })

      overlay.appendChild(panel)
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeForm() })
      document.body.appendChild(overlay)
    }

    function renderField(f, cfg) {
      var wrap = document.createElement('div')
      wrap.className = 'nbk-field'
      var label = document.createElement('label')
      label.className = 'nbk-field-label'
      var name = document.createElement('span')
      name.textContent = f.label
      var code = document.createElement('code')
      code.textContent = f.key
      label.appendChild(name); label.appendChild(code)
      wrap.appendChild(label)

      var current = valueAt(cfg, f.key)
      var value = current === undefined ? f.default : current
      var hint = document.createElement('span')
      hint.className = 'nbk-hint'

      function save(v) {
        hint.textContent = '保存中…'
        hint.className = 'nbk-hint'
        api.config.set(f.key, v).then(function () {
          hint.textContent = '✓ 已保存'
          hint.className = 'nbk-hint nbk-ok'
        }, function () {
          hint.textContent = '✕ 保存失败'
          hint.className = 'nbk-hint nbk-err'
        })
      }

      if (f.type === 'boolean') {
        var sw = document.createElement('button')
        sw.className = 'nbk-switch' + (value ? ' on' : '')
        sw.setAttribute('role', 'switch')
        sw.addEventListener('click', function () {
          var on = !sw.classList.contains('on')
          sw.classList.toggle('on', on)
          save(on)
        })
        wrap.appendChild(sw)
      } else if (f.type === 'number' && f.range) {
        var row = document.createElement('div')
        var slider = document.createElement('input')
        slider.type = 'range'
        slider.className = 'nbk-range'
        slider.min = String(f.range.min); slider.max = String(f.range.max)
        slider.step = String(f.range.step || 1)
        slider.value = String(value)
        var num = document.createElement('span')
        num.textContent = String(value)
        num.style.marginLeft = '8px'
        num.style.color = 'var(--nb-accent,#e8705a)'
        slider.addEventListener('input', function () { num.textContent = slider.value })
        slider.addEventListener('change', function () { save(Number(slider.value)) })
        row.appendChild(slider); row.appendChild(num)
        wrap.appendChild(row)
      } else if (f.type === 'enum') {
        var sel = document.createElement('select')
        sel.className = 'nbk-select'
        ;(f.options || []).forEach(function (opt) {
          var o = document.createElement('option')
          o.value = opt; o.textContent = opt
          if (opt === value) o.selected = true
          sel.appendChild(o)
        })
        sel.addEventListener('change', function () { save(sel.value) })
        wrap.appendChild(sel)
      } else {
        var input = document.createElement('input')
        input.className = 'nbk-input'
        input.type = f.secret ? 'password' : 'text'
        input.value = value == null ? '' : String(value)
        var timer = null
        input.addEventListener('change', function () { save(input.value) })
        input.addEventListener('input', function () {
          if (timer) clearTimeout(timer)
          timer = setTimeout(function () { save(input.value) }, 800)
        })
        wrap.appendChild(input)
        if (f.secret) {
          hint.textContent = '密码框渲染；不回显明文'
          wrap.appendChild(hint)
          return wrap
        }
      }
      wrap.appendChild(hint)
      return wrap
    }

    // ---- 启动：先在脱管节点上完成全部装配（renderNav / chip 文案 /
    // localStorage / html 属性），最后一步才统一上树——此后不再有任何可抛
    // 步骤，「降级 = 零 DOM 手术」由结构保证，不靠事后清理。 ----
    setShell(localStorage.getItem(SHELL_KEY) === 'classic' ? 'classic' : 'friendly')
    document.head.appendChild(style)
    document.body.appendChild(nav)
    document.body.appendChild(chip)
  }
})()
