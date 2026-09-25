<script setup lang="ts">
/**
 * 应用外壳 — Buddy 主窗装配：标题栏 38 + 侧栏 220 + 内容区 + 状态栏 22，
 * 叠加独立窗（设置/全局搜索/Office 壳）与账号菜单、Toast。
 * 连接：localStorage 取访问密钥 → WS 接入 → 首连拉取基础数据。
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { NbIcon } from './icons'
import SideBar from './components/SideBar.vue'
import HomeView from './components/HomeView.vue'
import ChatView from './components/ChatView.vue'
import AssistantsView from './components/AssistantsView.vue'
import ProjectsView from './components/ProjectsView.vue'
import ExpertsView from './components/ExpertsView.vue'
import AutomationView from './components/AutomationView.vue'
import SettingsWindow from './components/SettingsWindow.vue'
import SearchWindow from './components/SearchWindow.vue'
import OfficeWindow from './components/OfficeWindow.vue'
import AccountMenu from './components/AccountMenu.vue'
import AuthCard from './components/AuthCard.vue'
import {
  store,
  conn,
  toasts,
  showSearch,
  showSettings,
  showOffice,
  showAccountMenu,
  showCheckin,
  applyTheme,
  toast,
  refreshSessions,
  loadModels,
  loadSpaces,
  loadVersion,
  wireProtocol,
} from './store'
import { connect, disconnect } from './protocol'

const booting = ref(true)

/** 首连/重连后拉基础数据（会话/模型/空间/版本）。 */
async function loadBootData() {
  await Promise.all([
    refreshSessions().catch(() => undefined),
    loadModels(),
    loadSpaces(),
    loadVersion(),
  ])
}

function onAuthed(token: string) {
  store.authed = true
  connect(token)
}

// 连接状态接线：失效 → 回登录卡；断线重连成功 → 静默刷数据
watch(
  () => conn.status,
  (s, old) => {
    if (s === 'connected' && !store.authed) store.authed = true
    if (s === 'connected' && old && old !== 'connecting') void loadBootData()
  },
)
watch(
  () => conn.authInvalid,
  (bad) => {
    if (bad && store.authed) {
      store.authed = false
      disconnect()
      toast('访问密钥已失效，请重新输入')
    }
  },
)

// 全局快捷键：Ctrl/Cmd+K 搜索，Esc 逐层收窗
function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (store.authed) showSearch.value = true
    return
  }
  if (e.key === 'Escape') {
    if (showSearch.value) showSearch.value = false
    else if (showAccountMenu.value || showCheckin.value) {
      showAccountMenu.value = false
      showCheckin.value = false
    }
  }
}

onMounted(async () => {
  applyTheme()
  wireProtocol()
  window.addEventListener('keydown', onKey)

  const saved = localStorage.getItem('nemesisbot_auth_token')
  if (saved) {
    store.authed = true
    connect(saved)
    // 等握手出结果：连上 / 被拒 / 超时
    const deadline = Date.now() + 6000
    while (
      conn.status !== 'connected' &&
      !conn.authInvalid &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 80))
    }
    if (conn.status === 'connected') await loadBootData()
    else store.authed = conn.status === 'connected'
  }
  booting.value = false
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  disconnect()
})

function connText(): string {
  if (conn.status === 'connected') return '已连接'
  if (conn.status === 'connecting') return '连接中…'
  return '未连接'
}
</script>

<template>
  <!-- 冷启动遮罩 -->
  <div v-if="booting" class="nb-boot" />

  <!-- 登录卡（真实访问密钥鉴权） -->
  <AuthCard v-else-if="!store.authed" @authed="onAuthed" />

  <!-- 主窗 -->
  <div v-else class="nb-app">
    <!-- 标题栏 38 -->
    <div class="nb-titlebar">
      <div class="nb-titlebar-brand">
        <span class="nb-titlebar-logo" />
        Buddy
      </div>
      <div class="nb-titlebar-actions">
        <span
          class="nb-dot"
          :class="{
            'nb-dot--ok': conn.status === 'connected',
            'nb-dot--run': conn.status === 'connecting',
          }"
        />
        <span style="font-size: 12px; color: var(--nb-text-3)">{{ connText() }}</span>
        <button class="nb-iconbtn" title="全局搜索（Ctrl+K）" @click="showSearch = true">
          <NbIcon name="search" :size="14" />
        </button>
      </div>
    </div>

    <!-- 主体：侧栏 220 + 内容 -->
    <div class="nb-body">
      <SideBar />
      <main class="nb-content">
        <HomeView v-if="store.view === 'home'" />
        <ChatView v-else-if="store.view === 'chat'" />
        <AssistantsView v-else-if="store.view === 'assistants'" />
        <ProjectsView v-else-if="store.view === 'projects'" />
        <ExpertsView v-else-if="store.view === 'experts'" />
        <AutomationView v-else-if="store.view === 'automation'" />
      </main>
    </div>

    <!-- 状态栏 22 -->
    <div class="nb-statusbar">
      <span
        class="nb-dot"
        :class="{
          'nb-dot--ok': conn.status === 'connected',
          'nb-dot--bad': conn.status === 'disconnected',
          'nb-dot--run': conn.status === 'connecting',
        }"
      />
      <span>{{ connText() }}</span>
      <span v-if="store.version">v{{ store.version }}</span>
      <span v-if="store.model">{{ store.model }}</span>
      <span class="nb-statusbar-spacer" />
      <span v-if="store.busy" style="color: var(--nb-orange)">Agent 执行中…</span>
      <span v-else style="opacity: 0.65">就绪</span>
    </div>

    <!-- 独立窗与浮层 -->
    <SettingsWindow v-if="showSettings" />
    <SearchWindow v-if="showSearch" />
    <OfficeWindow v-if="showOffice" />
    <AccountMenu />

    <!-- Toast -->
    <div class="nb-toasts">
      <div v-for="t in toasts" :key="t.id" class="nb-toast">{{ t.text }}</div>
    </div>
  </div>
</template>
