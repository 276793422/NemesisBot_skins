<script setup lang="ts">
/**
 * 对话视图 — 消息列（用户灰胶囊 / 助手 markdown 通栏 / 工具卡 / 错误）
 * + 底部输入盒。头部：会话标题（可重命名）。
 */
import { ref, nextTick, watch, computed } from 'vue'
import { NbIcon } from '../icons'
import Composer from './Composer.vue'
import { renderMarkdown } from '../markdown'
import {
  store,
  prefs,
  renameSession,
  toast,
} from '../store'
import { conn } from '../protocol'

const scrollEl = ref<HTMLElement | null>(null)
const renaming = ref(false)
const renameText = ref('')

const headTitle = computed(() => {
  const s = store.sessions.find((x) => x.id === store.currentSessionId)
  return s?.title ?? '新任务'
})

function startRename() {
  const s = store.sessions.find((x) => x.id === store.currentSessionId)
  if (!s) return
  renaming.value = true
  renameText.value = s.title
}

async function commitRename() {
  renaming.value = false
  const t = renameText.value.trim()
  const s = store.sessions.find((x) => x.id === store.currentSessionId)
  if (!s || !t || t === s.title) return
  try {
    await renameSession(s.id, t)
  } catch (e) {
    toast(`重命名失败：${e}`)
  }
}

watch(
  () => [store.messages.length, store.messages[store.messages.length - 1]?.content],
  () => {
    if (!prefs.autoscroll) return
    nextTick(() => {
      const el = scrollEl.value
      if (el) el.scrollTop = el.scrollHeight
    })
  },
)

function argsOf(ev: any): string {
  if (ev.argsPreview) return ev.argsPreview
  return ''
}

function stateText(s: string): string {
  return s === 'running' ? '执行中…' : s === 'ok' ? '完成' : '失败'
}
</script>

<template>
  <div class="nb-chat">
    <div class="nb-chat-head">
      <template v-if="renaming">
        <input
          v-model="renameText"
          class="nb-input"
          style="height: 28px; max-width: 320px"
          @keydown.enter="commitRename"
          @blur="commitRename"
          @vue:mounted="(e: any) => e.el?.focus?.()"
        />
      </template>
      <template v-else>
        <span class="nb-chat-head-title" style="cursor: text" title="点击重命名" @dblclick="startRename">
          {{ headTitle }}
        </span>
      </template>
      <div class="nb-chat-head-actions">
        <button class="nb-iconbtn" title="重命名" @click="startRename">
          <NbIcon name="edit" :size="14" />
        </button>
      </div>
    </div>

    <div ref="scrollEl" class="nb-chat-scroll">
      <div class="nb-chat-col">
        <template v-for="(m, i) in store.messages" :key="i">
          <!-- 工具调用卡 -->
          <div v-if="m.toolEvents.length > 0" class="nb-toolcard">
            <button
              class="nb-toolcard-head"
              @click="m.toolsOpen = m.toolsOpen === undefined ? true : !m.toolsOpen"
            >
              <NbIcon
                class="nb-toolcard-chevron"
                :class="{ 'nb-toolcard-chevron--open': m.toolsOpen }"
                name="chevR"
                :size="10"
              />
              <span class="nb-toolcard-name">工具调用 × {{ m.toolEvents.length }}</span>
              <span class="nb-toolcard-state">
                {{ m.toolEvents.map((t: any) => t.tool).join('、') }}
              </span>
            </button>
            <div v-if="m.toolsOpen" class="nb-toolcard-body">
              <div v-for="t in m.toolEvents" :key="t.callId" style="margin-bottom: 8px">
                <div>
                  <b style="color: var(--nb-text-1)">{{ t.tool }}</b>
                  <span style="margin-left: 6px; color: var(--nb-text-3)">
                    {{ stateText(t.state) }}
                    <template v-if="t.durationMs"> · {{ (t.durationMs / 1000).toFixed(1) }}s</template>
                  </span>
                </div>
                <pre v-if="argsOf(t)">{{ argsOf(t) }}</pre>
                <pre v-if="t.resultPreview">{{ t.resultPreview }}</pre>
              </div>
            </div>
          </div>

          <!-- 用户 -->
          <div v-if="m.role === 'user'" class="nb-msg nb-msg--user">
            <div class="nb-msg-user-bubble">{{ m.content }}</div>
          </div>

          <!-- 助手 -->
          <div
            v-else-if="m.role === 'assistant'"
            class="nb-msg nb-msg--assistant"
          >
            <div class="nb-msg-assistant-body">
              <div class="nb-md" v-html="renderMarkdown(m.content)" />
              <div v-if="m.model || m.sourceNode" class="nb-msg-meta">
                <span v-if="m.model" class="nb-msg-model">{{ m.model }}</span>
                <span v-if="m.sourceNode" :title="'来源节点'">
                  <NbIcon name="globe" :size="11" /> {{ m.sourceNode }}
                </span>
              </div>
            </div>
          </div>

          <!-- 系统/错误 -->
          <div v-else-if="m.role === 'system'" class="nb-msg nb-msg--system">
            <span class="nb-msg-system-line">{{ m.content }}</span>
          </div>
          <div v-else-if="m.role === 'error'" class="nb-msg nb-msg--error">
            <div class="nb-msg-user-bubble">{{ m.content }}</div>
          </div>
        </template>

        <!-- 流式占位 -->
        <div v-if="store.busy" class="nb-msg nb-msg--assistant">
          <div class="nb-msg-assistant-body">
            <span class="nb-typing"><i /><i /><i /></span>
          </div>
        </div>

        <div v-if="store.historyLoading" style="display: flex; justify-content: center; padding: 16px">
          <span class="nb-spin" />
        </div>

        <div v-if="conn.status !== 'connected'" style="text-align: center; padding: 12px">
          <span style="font-size: 12px; color: var(--nb-orange)">连接已断开，重连后可继续对话</span>
        </div>
      </div>
    </div>

    <div style="flex: 0 0 auto; padding: 8px 24px 16px">
      <div style="max-width: 832px; margin: 0 auto">
        <Composer :placeholder="store.busy ? '生成中…可点击停止' : '继续对话…'" />
      </div>
    </div>
  </div>
</template>
