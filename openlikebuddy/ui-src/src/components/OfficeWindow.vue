<script setup lang="ts">
/**
 * Office 文档窗壳 — **UI 接口预留**（bot 无文档编辑产品）。
 * 形态规格：48px Tab 栏（标签/未保存圆点/加号）+ 48px 标题栏
 * （文件名/保存状态/对话按钮）+ 文档区（占位）+ 右侧对话面板（可用，
 * 复用当前会话）+ 首开冷启动加载页（吉祥物轨道 + 340×6 进度条）。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { NbIcon } from '../icons'
import ChatView from './ChatView.vue'
import { showOffice, officeColdstart, stubToast, store } from '../store'

interface DocTab {
  id: number
  title: string
  dirty: boolean
}

let tabSeq = 0
const tabs = ref<DocTab[]>([{ id: ++tabSeq, title: '未命名文档', dirty: false }])
const activeTab = ref(tabs.value[0].id)
const chatOpen = ref(true)
const chatWidth = ref(360)
const dragging = ref(false)

let coldTimer: ReturnType<typeof setInterval> | null = null
const coldProgress = ref(0)

onMounted(() => {
  if (officeColdstart.value) {
    coldProgress.value = 0
    coldTimer = setInterval(() => {
      coldProgress.value = Math.min(coldProgress.value + 8 + Math.random() * 10, 96)
    }, 120)
    setTimeout(endCold, 1400)
  }
})

function endCold() {
  if (coldTimer) {
    clearInterval(coldTimer)
    coldTimer = null
  }
  coldProgress.value = 100
  setTimeout(() => (officeColdstart.value = false), 220)
}

onUnmounted(() => {
  if (coldTimer) clearInterval(coldTimer)
})

function addTab() {
  stubToast('新建文档')
}

function closeTab(id: number) {
  const t = tabs.value.find((x) => x.id === id)
  if (t?.dirty && !window.confirm('文档未保存（演示态），仍要关闭？')) return
  tabs.value = tabs.value.filter((x) => x.id !== id)
  if (tabs.value.length === 0) {
    showOffice.value = false
    return
  }
  if (activeTab.value === id) activeTab.value = tabs.value[tabs.value.length - 1].id
}

// 对话面板拖宽（4px resizer，office-shell 规格）
function onResizeStart(e: MouseEvent) {
  dragging.value = true
  const startX = e.clientX
  const startW = chatWidth.value
  const move = (ev: MouseEvent) => {
    chatWidth.value = Math.min(Math.max(startW - (ev.clientX - startX), 280), 560)
  }
  const up = () => {
    dragging.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<template>
  <div class="nb-office">
    <!-- Tab 栏 48 -->
    <div class="nb-office-tabbar">
      <div class="nb-office-tabs">
        <div
          v-for="t in tabs"
          :key="t.id"
          class="nb-office-tab"
          :class="{ 'nb-office-tab--active': t.id === activeTab }"
          @click="activeTab = t.id"
        >
          <span class="nb-office-tab-title">{{ t.title }}</span>
          <span class="nb-office-tab-dirty" :style="t.dirty ? '' : 'opacity: 0'" />
          <button class="nb-win-close" style="width: 18px; height: 18px" @click.stop="closeTab(t.id)">
            <NbIcon name="close" :size="10" />
          </button>
        </div>
        <button class="nb-office-tab-add" title="新建文档" @click="addTab">
          <NbIcon name="plus" :size="14" />
        </button>
      </div>
      <button class="nb-win-close" title="退出 Office" @click="showOffice = false">
        <NbIcon name="close" :size="12" />
      </button>
    </div>

    <!-- 标题栏 48 -->
    <div class="nb-office-titlebar">
      <div>
        <span class="nb-office-filename">{{ tabs.find((t) => t.id === activeTab)?.title ?? '' }}</span>
        <span class="nb-office-save-status">接口预留 · 文档编辑功能未接入</span>
      </div>
      <div class="nb-office-title-actions">
        <button class="nb-office-chat-btn" @click="chatOpen = !chatOpen">
          <NbIcon name="chat" :size="13" /> 对话
        </button>
      </div>
    </div>

    <!-- 主体：文档区 + 对话面板 -->
    <div class="nb-office-body">
      <div class="nb-office-doc">
        <div class="nb-office-doc-stage">
          <div style="text-align: center; user-select: none">
            <div
              style="width: 72px; height: 72px; border-radius: 20px; background: var(--nb-inset); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--nb-text-3)"
            >
              <NbIcon name="doc" :size="34" />
            </div>
            <div style="font-size: 15px; font-weight: 600; color: var(--nb-text-2); margin-bottom: 6px">
              文档编辑接口预留
            </div>
            <div style="font-size: 12px; color: var(--nb-text-3)">
              NemesisBot 暂无文档产品 · 窗壳与对话面板已按设计规格就位
            </div>
          </div>
        </div>
      </div>

      <template v-if="chatOpen">
        <div
          class="nb-office-resizer"
          :class="{ 'nb-office-resizer--drag': dragging }"
          :style="{ right: chatWidth + 'px' }"
          @mousedown.prevent="onResizeStart"
        />
        <div class="nb-office-chatpane" :style="{ flexBasis: chatWidth + 'px', width: chatWidth + 'px' }">
          <div class="nb-office-chat-header">
            <span class="nb-office-chat-brand">
              <span class="nb-office-chat-avatar" />
              Buddy
            </span>
            <button class="nb-iconbtn" title="收起对话面板" @click="chatOpen = false">
              <NbIcon name="close" :size="13" />
            </button>
          </div>
          <div style="flex: 1; min-height: 0; display: flex; flex-direction: column">
            <ChatView v-if="store.currentSessionId || store.messages.length > 0" />
            <div v-else class="nb-empty">
              <span class="nb-empty-ico"><NbIcon name="chat" :size="22" /></span>
              <span class="nb-empty-title">暂无进行中的对话</span>
              <span class="nb-empty-hint">从主窗新建任务后，可在此继续与 Buddy 讨论文档内容</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 冷启动加载页 -->
    <div v-if="officeColdstart" class="nb-coldstart" :class="{ 'nb-coldstart--fading': coldProgress >= 100 }">
      <div class="nb-coldstart-stack">
        <div class="nb-coldstart-hero">
          <div class="nb-coldstart-mascot">
            <div class="nb-coldstart-mascot-orb" />
          </div>
          <p class="nb-coldstart-text">正在准备 Office</p>
          <p class="nb-coldstart-subtext">首次加载组件与文档服务（演示动画）</p>
        </div>
        <div class="nb-coldstart-progress">
          <div class="nb-coldstart-track">
            <div class="nb-coldstart-bar" :style="{ width: coldProgress + '%' }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
