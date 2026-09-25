<script setup lang="ts">
/**
 * 自动化页 — tasks.cron.*（定时任务）+ workflow.*（工作流）。
 */
import { onMounted, ref } from 'vue'
import { NbIcon } from '../icons'
import { store, loadAutomation, toggleCron, runCronNow, runWorkflow, toast } from '../store'

onMounted(() => loadAutomation())

const seg = ref<'cron' | 'workflow'>('cron')

async function onToggle(c: { id: string; enabled: boolean }) {
  try {
    await toggleCron(c as any)
  } catch (e) {
    toast(`切换失败：${e}`)
  }
}

async function onRunCron(c: { id: string; name: string }) {
  try {
    await runCronNow(c as any)
  } catch (e) {
    toast(`触发失败：${e}`)
  }
}

async function onRunWf(name: string) {
  try {
    await runWorkflow(name)
  } catch (e) {
    toast(`触发失败：${e}`)
  }
}
</script>

<template>
  <div class="nb-page">
    <div class="nb-page-head">
      <span class="nb-page-title">自动化<span class="nb-page-sub">定时任务与工作流</span></span>
      <div class="nb-seg">
        <button
          class="nb-seg-btn"
          :class="{ 'nb-seg-btn--active': seg === 'cron' }"
          @click="seg = 'cron'"
        >
          定时任务
        </button>
        <button
          class="nb-seg-btn"
          :class="{ 'nb-seg-btn--active': seg === 'workflow' }"
          @click="seg = 'workflow'"
        >
          工作流
        </button>
      </div>
    </div>
    <div class="nb-page-body">
      <!-- 定时任务 -->
      <template v-if="seg === 'cron'">
        <div v-if="store.crons.length === 0" class="nb-empty">
          <span class="nb-empty-ico"><NbIcon name="clock" :size="22" /></span>
          <span class="nb-empty-title">暂无定时任务</span>
          <span class="nb-empty-hint">在管理后台的「Cron」页可以创建定时任务</span>
        </div>
        <div v-else class="nb-cardgrid">
          <div v-for="c in store.crons" :key="c.id" class="nb-card">
            <div class="nb-card-top">
              <span class="nb-card-ico"><NbIcon name="clock" :size="18" /></span>
              <div class="nb-card-names">
                <div class="nb-card-title">{{ c.name }}</div>
                <div class="nb-card-desc" style="-webkit-line-clamp: 1; font-family: var(--nb-mono)">
                  {{ c.schedule }}
                </div>
              </div>
              <span class="nb-badge" :class="c.enabled ? 'nb-badge--green' : ''">
                {{ c.enabled ? '已启用' : '已停用' }}
              </span>
            </div>
            <div class="nb-card-foot">
              <button class="nb-btn nb-btn--sm" @click="onRunCron(c)">立即运行</button>
              <span
                class="nb-switch"
                :class="{ 'nb-switch--on': c.enabled }"
                style="margin-left: auto"
                title="启用/停用"
                @click="onToggle(c)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 工作流 -->
      <template v-else>
        <div v-if="store.workflows.length === 0" class="nb-empty">
          <span class="nb-empty-ico"><NbIcon name="zap" :size="22" /></span>
          <span class="nb-empty-title">暂无工作流</span>
          <span class="nb-empty-hint">在管理后台的「工作流」页可以创建 DAG 工作流</span>
        </div>
        <div v-else class="nb-cardgrid">
          <div v-for="w in store.workflows" :key="w.name" class="nb-card">
            <div class="nb-card-top">
              <span class="nb-card-ico"><NbIcon name="zap" :size="18" /></span>
              <div class="nb-card-names">
                <div class="nb-card-title">{{ w.name }}</div>
              </div>
            </div>
            <div class="nb-card-desc">{{ w.desc || '（无描述）' }}</div>
            <div class="nb-card-foot">
              <button class="nb-btn nb-btn--sm nb-btn--primary" @click="onRunWf(w.name)">运行</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
