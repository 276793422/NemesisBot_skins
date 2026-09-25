/**
 * openlikebuddy 皮肤自带应用 — 后端协议薄客户端。
 *
 * 与 Dashboard（web/src/composables/useWebSocket.ts）同一套 WS 协议，
 * 此处独立实现（buddy 是自包含 UI，不 import bot 前端代码）：
 *   - 连接  ws(s)://host/ws?token=<token>，30s 心跳，指数退避重连
 *   - 请求  {type:'request', module, cmd, reqId, data} → response 帧按
 *           reqId 关联（{data} resolve / {error} reject）
 *   - 历史  {type:'message', module:'chat', cmd:'history_request',
 *           data:{request_id, limit, session_id}} → history_response 帧
 *           按 request_id 关联
 *   - 发送  {type:'message', module:'chat', cmd:'send',
 *           data:{content, session_id}}
 *   - 接收  cmd:'receive'（{role, content, session_id?, seq?, model?}）、
 *           cmd:'error'；工具事件 {type:'push', cmd:'tool_event'}
 *   - 停止  request('agent','cancel')
 * 鉴权模型与 Dashboard 一致：token 存 localStorage `nemesisbot_auth_token`
 * （同源共享 = 与管理后台单点登录），WS 握手 close code 1008/4001 = 密钥无效。
 */
import { reactive } from 'vue'

export type ConnStatus = 'connecting' | 'connected' | 'disconnected'

export const conn = reactive({
  status: 'disconnected' as ConnStatus,
  /** 密钥被服务端拒绝（1008/4001）——登录卡展示错误的依据。 */
  authInvalid: false,
})

type Handler = (data: any) => void
const handlers = new Set<Handler>()

let ws: WebSocket | null = null
let token = ''
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000
let manualClose = false

const pending = new Map<
  string,
  { resolve: (v: any) => void; reject: (e: string) => void; timer: ReturnType<typeof setTimeout> | null }
>()
const pendingHistories = new Map<string, (frame: any) => void>()

function reqId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 注册帧订阅；返回退订函数。 */
export function onMessage(h: Handler): () => void {
  handlers.add(h)
  return () => handlers.delete(h)
}

function dispatch(data: any) {
  handlers.forEach((h) => {
    try {
      h(data)
    } catch (e) {
      console.error('[buddy] handler error', e)
    }
  })
}

function raw(msg: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

/** Promise 化 request/response（30s 缺省超时，0 = 不超时）。 */
export function request(module: string, cmd: string, data?: any, timeoutMs = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject('未连接')
      return
    }
    const id = reqId()
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            pending.delete(id)
            reject(`timeout: ${module}.${cmd}`)
          }, timeoutMs)
        : null
    pending.set(id, { resolve, reject, timer })
    raw({ type: 'request', module, cmd, reqId: id, data: data ?? {} })
  })
}

/** 拉取会话历史（history_request / history_response 按 request_id 关联）。 */
export function loadHistory(
  sessionId: string | null,
  limit = 200,
  beforeIndex?: number,
): Promise<{ messages: any[]; has_more?: boolean }> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject('未连接')
      return
    }
    const id = reqId()
    const timer = setTimeout(() => {
      pendingHistories.delete(id)
      reject('timeout: chat.history_request')
    }, 30000)
    pendingHistories.set(id, (frame) => {
      clearTimeout(timer)
      resolve(frame)
    })
    const data: any = { request_id: id, limit }
    if (sessionId) data.session_id = sessionId
    if (beforeIndex != null) data.before_index = beforeIndex
    raw({ type: 'message', module: 'chat', cmd: 'history_request', data })
  })
}

/** 发送一条用户消息（agent loop 处理后 receive 帧回推）。 */
export function sendChat(content: string, sessionId: string | null) {
  const data: any = { content }
  if (sessionId) data.session_id = sessionId
  raw({ type: 'message', module: 'chat', cmd: 'send', data })
}

/** 停止当前 agent 轮次。返回取消的轮次数。 */
export async function stopGeneration(): Promise<number> {
  const res = await request('agent', 'cancel')
  return (res && res.cancelled) || 0
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    raw({
      type: 'system',
      module: 'heartbeat',
      cmd: 'ping',
      data: {},
      timestamp: new Date().toISOString(),
    })
  }, 30000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function scheduleReconnect() {
  if (manualClose || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (!manualClose) connect(token)
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, 30000)
}

/** 建立 WS 连接（token 失效 → conn.authInvalid = true，不自动重连）。 */
export function connect(tok: string) {
  token = tok
  manualClose = false
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    manualClose = true
    ws.close()
    ws = null
  }
  conn.status = 'connecting'
  conn.authInvalid = false

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(tok)}`
  ws = new WebSocket(url)

  ws.onopen = () => {
    conn.status = 'connected'
    reconnectDelay = 1000
    startHeartbeat()
  }

  ws.onmessage = (ev) => {
    let data: any
    try {
      data = JSON.parse(ev.data as string)
    } catch {
      return
    }
    // response 帧关联
    if (data.type === 'response' && data.reqId) {
      const p = pending.get(data.reqId)
      if (p) {
        if (p.timer) clearTimeout(p.timer)
        pending.delete(data.reqId)
        if (data.error) p.reject(String(data.error))
        else p.resolve(data.data)
        return
      }
    }
    // 历史响应关联（bot 实际回 cmd:'history'，兼容别名 history_response）
    if (
      data.type === 'message' &&
      (data.cmd === 'history' || data.cmd === 'history_response') &&
      data.data?.request_id
    ) {
      const h = pendingHistories.get(data.data.request_id)
      if (h) {
        pendingHistories.delete(data.data.request_id)
        h(data.data)
        return
      }
    }
    dispatch(data)
  }

  ws.onclose = (ev) => {
    stopHeartbeat()
    conn.status = 'disconnected'
    if (ev.code === 1008 || ev.code === 4001) {
      conn.authInvalid = true
      localStorage.removeItem('nemesisbot_auth_token')
      return
    }
    scheduleReconnect()
  }

  ws.onerror = () => {
    /* onclose 跟进 */
  }
}

export function disconnect() {
  manualClose = true
  stopHeartbeat()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  ws?.close()
  ws = null
  conn.status = 'disconnected'
}

/** 试连校验密钥（登录卡用；不落全局连接）。 */
export function testToken(tok: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const testWs = new WebSocket(
      `${proto}//${window.location.host}/ws?token=${encodeURIComponent(tok)}`,
    )
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      try {
        testWs.close()
      } catch {
        /* noop */
      }
      resolve(ok)
    }
    testWs.onopen = () => finish(true)
    testWs.onerror = () => finish(false)
    testWs.onclose = (ev) => finish(!(ev.code === 1008 || ev.code === 4001))
    setTimeout(() => finish(false), 5000)
  })
}
