<script setup lang="ts">
/**
 * 输入盒 — 主页大输入（home token：渐变 inset 槽）与对话页输入共用。
 */
import { ref, watch, nextTick, computed } from 'vue'
import { NbIcon } from '../icons'
import { store, sendCurrent, stop, prefs } from '../store'
import { conn } from '../protocol'

const props = defineProps<{ inset?: boolean; autoFocus?: boolean; placeholder?: string }>()

const ta = ref<HTMLTextAreaElement | null>(null)

function autosize() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onKeydown(e: KeyboardEvent) {
  const wantSend = prefs.sendEnter
    ? e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey
    : e.key === 'Enter' && (e.ctrlKey || e.metaKey)
  if (wantSend) {
    e.preventDefault()
    void sendCurrent()
  }
}

const placeholder = computed(
  () => props.placeholder ?? (conn.status === 'connected' ? '给 Buddy 发送任务…' : '等待连接…'),
)

watch(
  () => store.input,
  () => nextTick(autosize),
)
</script>

<template>
  <div class="nb-composer" :class="{ 'nb-composer--slot': inset }">
    <textarea
      ref="ta"
      v-model="store.input"
      class="nb-composer-text"
      rows="2"
      :placeholder="placeholder"
      @keydown="onKeydown"
    />
    <div class="nb-composer-bar">
      <div class="nb-composer-tools">
        <span v-if="store.model" class="nb-composer-model" :title="`当前模型：${store.model}`">
          <NbIcon name="cpu" :size="12" />
          <span>{{ store.model }}</span>
        </span>
      </div>
      <button
        v-if="store.busy"
        class="nb-send nb-send--stop"
        title="停止生成"
        @click="stop"
      >
        <NbIcon name="stop" :size="13" />
      </button>
      <button
        v-else
        class="nb-send"
        :disabled="!store.input.trim() || conn.status !== 'connected'"
        title="发送"
        @click="sendCurrent()"
      >
        <NbIcon name="send" :size="13" />
      </button>
    </div>
  </div>
</template>
