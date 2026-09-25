<script setup lang="ts">
/**
 * 侧栏 — Buddy 结构：新建任务 + 5 导航项（助理/项目/专家/自动化/更多）+
 * 任务分组（会话按时间归组）+ 空间分组（集群节点）+ footer（头像/设置）。
 */
import { ref, computed } from 'vue'
import { NbIcon } from '../icons'
import {
  store,
  sessionGroups,
  sessionRelTime,
  newTask,
  switchSession,
  deleteSession,
  loadSpaces,
  showSettings,
  settingsTab,
  showAccountMenu,
  showCheckin,
  openOffice,
  stubToast,
  toast,
} from '../store'
import type { MainView } from '../store'

const NAVS: { key: MainView; label: string; icon: string }[] = [
  { key: 'assistants', label: '助理', icon: 'bot' },
  { key: 'projects', label: '项目', icon: 'folder' },
  { key: 'experts', label: '专家', icon: 'star' },
  { key: 'automation', label: '自动化', icon: 'zap' },
]

const showMore = ref(false)

const MORE_ITEMS = [
  { label: '新建文档', icon: 'doc', action: 'office' },
  { label: '管理后台', icon: 'external', action: 'dashboard' },
  { label: '关于', icon: 'info', action: 'about' },
]

function onMore(item: { action: string }) {
  showMore.value = false
  if (item.action === 'office') {
    openOffice()
  } else if (item.action === 'dashboard') {
    window.open('/', '_blank')
  } else if (item.action === 'about') {
    showSettings.value = true
    settingsTab.value = 'about'
  }
}

function openSpace() {
  loadSpaces().then(() => {
    if (store.spaces.length === 0) toast('未发现集群节点（单机模式）')
    else stubToast('空间')
  })
}

const userInitial = computed(() => '本')

async function onDelete(id: string, title: string) {
  if (!window.confirm(`删除会话「${title}」？此操作不可恢复。`)) return
  try {
    await deleteSession(id)
  } catch (e) {
    toast(`删除失败：${e}`)
  }
}
</script>

<template>
  <aside class="nb-sidebar">
    <button class="nb-newtask" @click="newTask" title="新建任务">
      <NbIcon name="plus" :size="14" />
      新建任务
    </button>

    <nav>
      <button
        v-for="nav in NAVS"
        :key="nav.key"
        class="nb-nav-item"
        :class="{ 'nb-nav-item--active': store.view === nav.key }"
        @click="store.view = nav.key"
      >
        <NbIcon :name="nav.icon" />
        {{ nav.label }}
      </button>

      <div class="nb-nav-more-wrap">
        <button
          class="nb-nav-item"
          :class="{ 'nb-nav-item--active': showMore }"
          @click="showMore = !showMore"
        >
          <NbIcon name="grid" />
          更多
        </button>
        <div v-if="showMore" class="nb-flyout">
          <button v-for="it in MORE_ITEMS" :key="it.label" class="nb-flyout-item" @click="onMore(it)">
            <NbIcon :name="it.icon" :size="15" />
            {{ it.label }}
          </button>
        </div>
      </div>
    </nav>

    <div class="nb-side-scroll">
      <!-- 任务分组：会话按时间归组 -->
      <div v-for="g in sessionGroups" :key="g.label">
        <div
          class="nb-side-section"
          @click="store.groupOpen['任务'] = !store.groupOpen['任务']"
        >
          <span class="nb-side-section-label">
            <span
              class="nb-side-section-caret"
              :class="{ 'nb-side-section-caret--open': store.groupOpen['任务'] !== false }"
            >
              <NbIcon name="chevR" :size="10" />
            </span>
            {{ g.label }}
          </span>
        </div>
        <template v-if="store.groupOpen['任务'] !== false">
          <div
            v-for="s in g.items"
            :key="s.id"
            class="nb-session-row"
            :class="{ 'nb-session-row--active': s.id === store.currentSessionId && store.view === 'chat' }"
            @click="switchSession(s.id)"
          >
            <span class="nb-session-row-title" :title="s.title">{{ s.title }}</span>
            <span class="nb-session-row-time">{{ sessionRelTime(s) }}</span>
            <span
              class="nb-session-row-del"
              title="删除会话"
              @click.stop="onDelete(s.id, s.title)"
            >
              <NbIcon name="trash" :size="10" />
            </span>
          </div>
        </template>
      </div>
      <div v-if="store.sessions.length === 0" class="nb-side-empty">暂无任务</div>

      <!-- 空间分组：集群节点 -->
      <div
        class="nb-side-section"
        style="margin-top: 20px"
        @click="store.groupOpen['空间'] = !store.groupOpen['空间']"
      >
        <span class="nb-side-section-label">
          <span
            class="nb-side-section-caret"
            :class="{ 'nb-side-section-caret--open': store.groupOpen['空间'] !== false }"
          >
            <NbIcon name="chevR" :size="10" />
          </span>
          空间
        </span>
        <span
          class="nb-side-section-caret"
          title="刷新节点"
          @click.stop="openSpace"
        >
          <NbIcon name="refresh" :size="11" />
        </span>
      </div>
      <template v-if="store.groupOpen['空间'] !== false">
        <div
          v-for="sp in store.spaces"
          :key="sp.id"
          class="nb-session-row"
          :title="`${sp.name}（${sp.online ? '在线' : '离线'}${sp.role ? ' · ' + sp.role : ''}）`"
        >
          <span class="nb-dot" :class="sp.online ? 'nb-dot--ok' : ''" />
          <span class="nb-session-row-title">{{ sp.name }}</span>
        </div>
        <div v-if="store.spaces.length === 0" class="nb-side-empty" @click="openSpace" style="cursor: pointer">
          本机
        </div>
      </template>
    </div>

    <div class="nb-side-footer">
      <button
        class="nb-avatar"
        title="账号"
        @click.stop="
          showCheckin = false;
          showAccountMenu = !showAccountMenu
        "
      >
        <NbIcon name="user" :size="14" />
      </button>
      <div class="nb-side-user">
        <span class="nb-side-user-name">本机用户</span>
        <span class="nb-side-user-sub">账号未开通</span>
      </div>
      <button class="nb-iconbtn" title="设置" @click="showSettings = true">
        <NbIcon name="gear" />
      </button>
    </div>
  </aside>
</template>
