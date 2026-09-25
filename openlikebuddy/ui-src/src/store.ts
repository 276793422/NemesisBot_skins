/**
 * openlikebuddy — 全局状态（轻量 reactive store，不引 Pinia）。
 *
 * 结构对齐 WB：主窗视图切换（主页/对话/助理/项目/专家/自动化）、
 * 任务分组（会话按时间归组）、空间分组（集群节点）、
 * 独立窗（设置/全局搜索/Office 壳）、账号 UI 接口（stub）。
 */
import { reactive, ref, computed } from 'vue'
import { onMessage, conn, request, loadHistory, sendChat, stopGeneration } from './protocol'

// ── 类型 ──

export interface WbMessage {
  role: 'user' | 'assistant' | 'error' | 'system'
  content: string
  timestamp: string
  model?: string
  sourceNode?: string
  toolEvents: WbToolEvent[]
  toolsOpen?: boolean
}

export interface WbToolEvent {
  callId: string
  tool: string
  state: 'running' | 'ok' | 'error'
  argsPreview?: string
  resultPreview?: string
  durationMs?: number
}

export interface WbSession {
  id: string
  title: string
  lastTime: string
  messageCount: number
  model: string
}

export interface WbPersona {
  name: string
  desc: string
  active: boolean
}

export interface WbProject {
  id: string
  name: string
  path: string
  createdAt: string
  running: boolean
}

export interface WbSkill {
  name: string
  desc: string
  from: string
}

export interface WbCron {
  id: string
  name: string
  schedule: string
  enabled: boolean
}

export interface WbWorkflow {
  name: string
  desc: string
  enabled: boolean
}

export interface WbSpace {
  id: string
  name: string
  online: boolean
  isLocal: boolean
  role: string
}

export type MainView = 'home' | 'chat' | 'assistants' | 'projects' | 'experts' | 'automation'

// ── 状态 ──

export const store = reactive({
  /** 是否已通过访问密钥鉴权。 */
  authed: false,
  /** 主窗当前视图。 */
  view: 'home' as MainView,
  /** 会话列表（最近活跃在前）。 */
  sessions: [] as WbSession[],
  currentSessionId: null as string | null,
  messages: [] as WbMessage[],
  busy: false,
  historyLoading: false,
  input: '',
  /** 当前模型名（会话回填 / 回复徽标）。 */
  model: '',
  /** 可选模型清单（composer 选择器）。 */
  models: [] as string[],
  /** 空间分组 = 集群节点（失败静默 = 单机无空间）。 */
  spaces: [] as WbSpace[],
  /** 分组折叠态。 */
  groupOpen: reactive<Record<string, boolean>>({ 任务: true, 空间: true }),

  /** 导航页数据（惰性加载）。 */
  personas: [] as WbPersona[],
  personasLoaded: false,
  projects: [] as WbProject[],
  projectsLoaded: false,
  skills: [] as WbSkill[],
  skillsLoaded: false,
  crons: [] as WbCron[],
  workflows: [] as WbWorkflow[],
  automationLoaded: false,

  /** 版本信息（system.version）。 */
  version: '',
})

// ── 窗口管理（独立窗 = overlay） ──

export const showSettings = ref(false)
export const settingsTab = ref<string>('general')
export const showSearch = ref(false)
export const showOffice = ref(false)
/** Office 冷启动进行中（每次打开 office 播一次）。 */
export const officeColdstart = ref(false)
/** 打开 Office 窗壳（每次首播冷启动）。 */
export function openOffice() {
  showOffice.value = true
  officeColdstart.value = true
}

/** 账号菜单（挂侧栏头像下）。 */
export const showAccountMenu = ref(false)
/** 签到气泡（stub）。 */
export const showCheckin = ref(false)

// ── 设置（本页偏好，localStorage） ──

export const prefs = reactive({
  theme: (localStorage.getItem('nemesisbot_buddy_theme') || 'auto') as 'light' | 'dark' | 'auto',
  autoscroll: persistBool('nb_buddy_autoscroll', true),
  sendEnter: persistBool('nb_buddy_send_enter', true),
})

function persistBool(key: string, dflt: boolean): boolean {
  const v = localStorage.getItem(key)
  return v === null ? dflt : v === '1'
}

export function persistPrefs() {
  localStorage.setItem('nemesisbot_buddy_theme', prefs.theme)
  localStorage.setItem('nb_buddy_autoscroll', prefs.autoscroll ? '1' : '0')
  localStorage.setItem('nb_buddy_send_enter', prefs.sendEnter ? '1' : '0')
}

export function applyTheme() {
  let t = prefs.theme
  if (t === 'auto') {
    t = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  document.documentElement.setAttribute('data-nb-theme', t)
}

// ── Toast ──

export const toasts = ref<{ id: number; text: string }[]>([])
let toastSeq = 0
export function toast(text: string) {
  const id = ++toastSeq
  toasts.value.push({ id, text })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2400)
}

/** 账号类功能的统一 stub 提示。 */
export function stubToast(what: string) {
  toast(`${what}：UI 接口已预留`)
}

/** 退出登录：清访问密钥回登录卡（WS 断开由 authInvalid/重连逻辑接管）。 */
export function logout() {
  localStorage.removeItem('nemesisbot_auth_token')
  store.authed = false
  store.currentSessionId = null
  store.messages = []
  store.sessions = []
  toast('已退出登录')
}

// ── 会话 ──

function sessionTitle(s: any): string {
  // bot 对未命名会话给通用 title「新对话」——首条消息更能代表任务（Buddy 同款）
  const raw = (s.title && s.title !== '新对话' ? s.title : s.firstMessage) || '(空会话)'
  return raw.length > 40 ? raw.slice(0, 40) + '…' : raw
}

export function applySessionList(rows: any[]) {
  store.sessions = rows.map((s) => ({
    id: s.id,
    title: sessionTitle(s),
    lastTime: s.lastTime || s.startTime || '',
    messageCount: s.messageCount ?? 0,
    model: s.model || '',
  }))
  store.sessions.sort((a, b) => (a.lastTime < b.lastTime ? 1 : -1))
  const cur = store.sessions.find((x) => x.id === store.currentSessionId)
  if (cur?.model) store.model = cur.model
}

export async function refreshSessions(force = false) {
  try {
    const res = await request('sessions', 'list')
    const rows = Array.isArray(res) ? res : (res?.sessions ?? [])
    applySessionList(rows)
  } catch {
    if (force) throw new Error('sessions.list failed')
  }
}

/** 任务分组：会话按时间归组（今天/昨天/7 天内/更早）。 */
export const sessionGroups = computed(() => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayMs = 86400000
  const groups: { label: string; items: WbSession[] }[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '7 天内', items: [] },
    { label: '更早', items: [] },
  ]
  for (const s of store.sessions) {
    const t = s.lastTime ? Date.parse(s.lastTime) : NaN
    if (Number.isNaN(t)) groups[3].items.push(s)
    else if (t >= startOfToday) groups[0].items.push(s)
    else if (t >= startOfToday - dayMs) groups[1].items.push(s)
    else if (t >= startOfToday - 7 * dayMs) groups[2].items.push(s)
    else groups[3].items.push(s)
  }
  return groups.filter((g) => g.items.length > 0)
})

function relTime(iso: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} 天前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

export function sessionRelTime(s: WbSession): string {
  return relTime(s.lastTime)
}

export function setCurrentSession(id: string | null) {
  store.currentSessionId = id
  store.messages = []
  store.busy = false
  const s = store.sessions.find((x) => x.id === id)
  if (s?.model) store.model = s.model
}

export function appendMessage(m: Omit<WbMessage, 'toolEvents'>) {
  store.messages.push({ ...m, toolEvents: [] })
}

export async function loadCurrentHistory() {
  if (store.historyLoading) return
  store.historyLoading = true
  try {
    const res = await loadHistory(store.currentSessionId)
    const rows: any[] = Array.isArray(res?.messages) ? res.messages : []
    store.messages = rows
      .filter((r) => ['user', 'assistant', 'system', 'error'].includes(r.role))
      .map((r) => ({
        role: r.role,
        content: r.content ?? '',
        timestamp: r.timestamp || '',
        model: r.model,
        sourceNode: r.source_node,
        toolEvents: [],
      }))
  } finally {
    store.historyLoading = false
  }
}

// ── WS 推送接线（App 挂载时调用一次） ──

let pendingTools: WbToolEvent[] = []

export function wireProtocol() {
  onMessage((data: any) => {
    if (data.type === 'push' && data.cmd === 'tool_event') {
      const t = data.data?.tool ?? data.data
      if (t?.tool) {
        const ev: WbToolEvent = {
          callId: t.callId ?? `${t.tool}-${Date.now()}`,
          tool: t.tool,
          state: t.state ?? 'running',
          argsPreview: t.argsPreview ?? t.args_preview,
          resultPreview: t.resultPreview ?? t.result_preview,
          durationMs: t.durationMs ?? t.duration_ms,
        }
        const i = pendingTools.findIndex((x) => x.callId === ev.callId)
        if (i >= 0) pendingTools[i] = ev
        else pendingTools.push(ev)
        // 进度占位只留最新一条
        const msgs = store.messages
        while (
          msgs.length > 0 &&
          msgs[msgs.length - 1].role === 'system' &&
          msgs[msgs.length - 1].content.startsWith('⚙')
        ) {
          msgs.pop()
        }
        msgs.push({
          role: 'system',
          content: `⚙ ${ev.tool} ${ev.state === 'running' ? '执行中…' : ev.state === 'ok' ? '完成' : '失败'}`,
          timestamp: new Date().toISOString(),
          toolEvents: [],
        })
      }
      return
    }

    if (data.type === 'message' && data.module === 'chat') {
      if (data.cmd === 'receive') {
        const d = data.data ?? {}
        const sid = d.session_id
        if (sid && store.currentSessionId && sid !== store.currentSessionId) {
          if (!store.sessions.some((s) => s.id === sid)) void refreshSessions()
          return
        }
        const role = (d.role || 'assistant') as WbMessage['role']
        const last = store.messages[store.messages.length - 1]
        if (last && last.role === role && last.content === d.content) return
        const m: WbMessage = {
          role,
          content: d.content ?? '',
          timestamp: d.timestamp || new Date().toISOString(),
          model: d.model,
          sourceNode: d.source_node,
          toolEvents: pendingTools,
          toolsOpen: pendingTools.length > 0 ? false : undefined,
        }
        pendingTools = []
        store.messages.push(m)
        if (role === 'assistant') {
          store.busy = false
          if (m.model) store.model = m.model
          void refreshSessions()
        }
        return
      }
      if (data.cmd === 'error') {
        store.busy = false
        pendingTools = []
        store.messages.push({
          role: 'error',
          content: data.data?.content || String(data.data?.error || '请求失败'),
          timestamp: new Date().toISOString(),
          toolEvents: [],
        })
        return
      }
    }

    if (data.type === 'system' && data.module === 'error' && data.cmd === 'notify') {
      store.messages.push({
        role: 'error',
        content: data.data?.message || data.data?.content || '服务通知',
        timestamp: new Date().toISOString(),
        toolEvents: [],
      })
    }
  })
}

// ── 动作 ──

export async function sendCurrent(text?: string) {
  const content = (text ?? store.input).trim()
  if (!content || store.busy) return
  store.input = ''
  appendMessage({ role: 'user', content, timestamp: new Date().toISOString() })
  store.busy = true
  sendChat(content, store.currentSessionId)
  if (store.currentSessionId && !store.sessions.some((s) => s.id === store.currentSessionId)) {
    void refreshSessions()
  }
}

export async function stop() {
  const n = await stopGeneration()
  if (n > 0) {
    store.busy = false
    pendingTools = []
    appendMessage({ role: 'system', content: '已停止生成', timestamp: new Date().toISOString() })
  }
}

/** 新任务：回主页（发送首条消息时创建会话）。 */
export function newTask() {
  store.view = 'home'
  setCurrentSession(null)
  store.input = ''
}

export async function switchSession(id: string) {
  if (id === store.currentSessionId && store.view === 'chat') return
  setCurrentSession(id)
  store.view = 'chat'
  await loadCurrentHistory()
}

export async function renameSession(id: string, title: string) {
  await request('sessions', 'rename', { session_id: id, title })
  const s = store.sessions.find((x) => x.id === id)
  if (s) s.title = title
}

export async function deleteSession(id: string) {
  await request('sessions', 'delete', { session_id: id })
  if (id === store.currentSessionId) setCurrentSession(null)
  await refreshSessions()
}

export async function setDefaultModel(name: string) {
  await request('models', 'set_default', { name })
  store.model = name
  toast(`默认模型已切换：${name}`)
}

// ── 导航页数据加载（惰性 + 静默失败） ──

function arr(v: any, ...keys: string[]): any[] {
  if (Array.isArray(v)) return v
  for (const k of keys) {
    if (Array.isArray(v?.[k])) return v[k]
  }
  return []
}

export async function loadPersonas(force = false) {
  if (store.personasLoaded && !force) return
  try {
    const [list, cur] = await Promise.all([
      request('persona', 'list'),
      request('persona', 'current').catch(() => null),
    ])
    const activeName =
      cur?.name ?? cur?.persona?.name ?? (typeof cur === 'string' ? cur : '')
    store.personas = arr(list, 'personas', 'items').map((p: any) => ({
      name: p.name ?? p.id ?? '?',
      desc: p.description ?? p.desc ?? p.title ?? '',
      active: !!(p.is_active ?? p.active) || (activeName ? p.name === activeName : false),
    }))
    store.personasLoaded = true
  } catch {
    store.personas = []
  }
}

export async function activatePersona(name: string) {
  await request('persona', 'activate', { name })
  toast(`人格已切换：${name}`)
  await loadPersonas(true)
}

export async function loadProjects(force = false) {
  if (store.projectsLoaded && !force) return
  try {
    const res = await request('projects', 'list')
    store.projects = arr(res, 'projects').map((p: any) => ({
      id: p.id,
      name: p.name,
      path: p.path ?? '',
      createdAt: p.created_at ?? '',
      running: !!p.running,
    }))
    store.projectsLoaded = true
  } catch {
    store.projects = []
  }
}

export async function createProject(name: string, path: string) {
  await request('projects', 'create', { name, path })
  toast(`项目已创建：${name}`)
  await loadProjects(true)
}

export async function removeProject(id: string) {
  await request('projects', 'remove', { project_id: id })
  await loadProjects(true)
}

export async function loadSkills(force = false) {
  if (store.skillsLoaded && !force) return
  try {
    const res = await request('skills', 'installed')
    store.skills = arr(res, 'skills', 'items').map((s: any) => ({
      name: s.name ?? s.id ?? '?',
      desc: s.description ?? s.desc ?? s.summary ?? '',
      from: s.source ?? s.from ?? '',
    }))
    store.skillsLoaded = true
  } catch {
    store.skills = []
  }
}

export async function uninstallSkill(name: string) {
  await request('skills', 'uninstall', { name })
  toast(`技能已卸载：${name}`)
  await loadSkills(true)
}

export async function loadAutomation(force = false) {
  if (store.automationLoaded && !force) return
  const [cron, wf] = await Promise.all([
    request('tasks', 'cron.list').catch(() => null),
    request('workflow', 'list').catch(() => null),
  ])
  store.crons = arr(cron, 'jobs', 'crons', 'items').map((c: any, i: number) => ({
    id: c.id ?? c.name ?? String(i),
    name: c.name ?? c.id ?? '(未命名)',
    schedule: c.schedule ?? c.cron ?? c.expression ?? '',
    enabled: c.enabled ?? !c.disabled ?? true,
  }))
  store.workflows = arr(wf, 'workflows', 'items').map((w: any) => ({
    name: w.name ?? w.id ?? '?',
    desc: w.description ?? w.desc ?? '',
    enabled: w.enabled ?? true,
  }))
  store.automationLoaded = true
}

export async function toggleCron(c: WbCron) {
  await request('tasks', 'cron.toggle', { id: c.id, enabled: !c.enabled })
  c.enabled = !c.enabled
}

export async function runCronNow(c: WbCron) {
  await request('tasks', 'cron.run', { id: c.id })
  toast(`已触发：${c.name}`)
}

export async function runWorkflow(name: string) {
  await request('workflow', 'run_now', { name })
  toast(`工作流已触发：${name}`)
}

// ── 空间（集群节点） ──

export async function loadSpaces() {
  try {
    const res = await request('cluster', 'nodes.list')
    const rows = arr(res, 'nodes', 'items')
    store.spaces = rows.map((n: any) => ({
      id: n.id ?? n.node_id ?? n.name,
      name: n.name ?? n.node_name ?? n.id ?? '?',
      online: n.online ?? n.is_online ?? false,
      isLocal: !!(n.isLocal ?? n.is_local),
      role: n.role ?? '',
    }))
  } catch {
    store.spaces = []
  }
}

// ── 模型 ──

export async function loadModels() {
  try {
    const res = await request('models', 'list')
    const rows = arr(res, 'models', 'model_list', 'items')
    store.models = rows
      .map((m: any) => m.name ?? m.model ?? m.id)
      .filter((n: any): n is string => !!n)
    // 无活跃会话时，composer 显示默认模型
    if (!store.model) {
      const dflt = rows.find((m: any) => m.is_default)
      store.model = dflt?.name ?? dflt?.model ?? ''
    }
  } catch {
    store.models = []
  }
}

// ── 版本 ──

export async function loadVersion() {
  try {
    const res = await request('system', 'version')
    store.version = res?.version ?? res?.bot_version ?? ''
  } catch {
    store.version = ''
  }
}

export { conn }
