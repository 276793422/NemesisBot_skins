<script setup lang="ts">
/**
 * 全局搜索窗 — 800×640 独立窗（20px 标题条 + 40px 输入 + 结果列表）。
 * 搜索范围：会话 + 页面导航 + 动作。↑↓ 导航，Enter 执行。
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { NbIcon } from '../icons'
import {
  store,
  showSearch,
  switchSession,
  newTask,
  showSettings,
  showOffice,
  stubToast,
  type MainView,
} from '../store'

interface Item {
  label: string
  hint: string
  icon: string
  run: () => void
}

const q = ref('')
const cursor = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const NAV_PAGES: { key: MainView; label: string; icon: string }[] = [
  { key: 'home', label: '主页', icon: 'chat' },
  { key: 'assistants', label: '助理', icon: 'bot' },
  { key: 'projects', label: '项目', icon: 'folder' },
  { key: 'experts', label: '专家', icon: 'star' },
  { key: 'automation', label: '自动化', icon: 'zap' },
]

const ACTIONS: Item[] = [
  { label: '新建任务', hint: '动作', icon: 'plus', run: () => newTask() },
  { label: '打开设置', hint: '动作', icon: 'gear', run: () => (showSettings.value = true) },
  { label: '新建文档（Office）', hint: '动作', icon: 'doc', run: () => showOffice.value = true },
]

const results = computed<Item[]>(() => {
  const kw = q.value.trim().toLowerCase()
  const out: Item[] = []
  for (const a of ACTIONS) {
    if (!kw || a.label.toLowerCase().includes(kw)) out.push(a)
  }
  for (const p of NAV_PAGES) {
    if (kw && p.label.toLowerCase().includes(kw)) {
      out.push({ label: p.label, hint: '页面', icon: p.icon, run: () => (store.view = p.key) })
    }
  }
  if (kw) {
    for (const s of store.sessions) {
      if (s.title.toLowerCase().includes(kw)) {
        out.push({
          label: s.title,
          hint: '会话',
          icon: 'chat',
          run: () => void switchSession(s.id),
        })
      }
    }
  }
  return out.slice(0, 30)
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    cursor.value = Math.min(cursor.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    cursor.value = Math.max(cursor.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const it = results.value[cursor.value]
    if (it) {
      showSearch.value = false
      it.run()
    }
  }
}

function hover(i: number) {
  cursor.value = i
}

watch(q, () => {
  cursor.value = 0
})

onMounted(() => nextTick(() => inputEl.value?.focus()))
</script>

<template>
  <div class="nb-winlayer" @click.self="showSearch = false">
    <div class="nb-win nb-search">
      <div class="nb-win-titlebar nb-search-titlebar" />
      <div class="nb-search-inputwrap">
        <div class="nb-search-input">
          <NbIcon name="search" />
          <input
            ref="inputEl"
            v-model="q"
            placeholder="搜索会话、页面或执行动作…"
            @keydown="onKey"
          />
        </div>
      </div>
      <div class="nb-search-body">
        <div v-if="results.length === 0" style="display: flex; justify-content: center; padding: 40px">
          <span class="nb-spin" />
        </div>
        <div v-else class="nb-search-group">
          <div
            v-for="(it, i) in results"
            :key="`${it.hint}-${it.label}`"
            class="nb-search-item"
            :class="{ 'nb-search-item--hover': i === cursor }"
            @mouseenter="hover(i)"
            @click="showSearch = false; it.run()"
          >
            <NbIcon :name="it.icon" :size="15" />
            <span class="nb-search-item-label">{{ it.label }}</span>
            <span class="nb-search-item-hint">{{ it.hint }}</span>
          </div>
        </div>
      </div>
      <div class="nb-search-foot">
        <span><span class="kbd">↑</span> <span class="kbd">↓</span> 导航</span>
        <span><span class="kbd">Enter</span> 打开</span>
        <span><span class="kbd">Esc</span> 关闭</span>
      </div>
    </div>
  </div>
</template>
