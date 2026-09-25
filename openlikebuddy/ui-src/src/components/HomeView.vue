<script setup lang="ts">
/**
 * 主页 — Buddy 骨架：品牌标题 + 3 场景标签（日常办公/代码开发/设计创意）+ 输入盒。
 * 从主页发送 = 建新会话并发送首条消息。
 */
import { nextTick, ref } from 'vue'
import Composer from './Composer.vue'
import { store, sendCurrent, loadCurrentHistory, refreshSessions } from '../store'

const SCENES = [
  { label: '日常办公', hint: '帮我整理一份本周工作摘要模板' },
  { label: '代码开发', hint: '帮我写一个 Bash 脚本，批量重命名当前目录下的图片文件' },
  { label: '设计创意', hint: '为一个咖啡品牌想三个 slogan，并说明创意点' },
]

const sending = ref(false)

async function sendHome(text?: string) {
  const content = (text ?? store.input).trim()
  if (!content || store.busy || sending.value) return
  sending.value = true
  store.view = 'chat'
  store.messages = []
  await sendCurrent(content)
  // 首条消息已发：刷新列表让新会话出现，选中它
  try {
    await refreshSessions(true)
    if (!store.currentSessionId && store.sessions.length > 0) {
      store.currentSessionId = store.sessions[0].id
      await loadCurrentHistory()
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="nb-home">
    <div class="nb-home-brand">
      <span class="nb-home-brand-logo" />
      Buddy
    </div>

    <div class="nb-home-tags">
      <button
        v-for="sc in SCENES"
        :key="sc.label"
        class="nb-home-tag"
        :title="sc.hint"
        @click="sendHome(sc.hint)"
      >
        {{ sc.label }}
      </button>
    </div>

    <div class="nb-home-composer-wrap">
      <Composer inset placeholder="有什么可以帮你？" />
    </div>
  </div>
</template>
