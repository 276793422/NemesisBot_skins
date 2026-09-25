<script setup lang="ts">
/**
 * 账号菜单 — **UI 接口预留**：头像弹出菜单 + 加油站签到气泡 stub。
 * 真实项：退出登录（清访问密钥）；stub 项：个人账号/签到/会员。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { NbIcon } from '../icons'
import {
  showAccountMenu,
  showCheckin,
  showSettings,
  settingsTab,
  stubToast,
  logout,
} from '../store'

const rootEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    showAccountMenu.value = false
    showCheckin.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

function openAppearance() {
  showAccountMenu.value = false
  showSettings.value = true
  settingsTab.value = 'appearance'
}

const CHECKIN_DAYS = [1, 1, 1, 0, 0, 0, 0]

function onCheckin() {
  showAccountMenu.value = false
  showCheckin.value = true
}
</script>

<template>
  <div ref="rootEl">
    <!-- 头像菜单 -->
    <div v-if="showAccountMenu" class="nb-acct-layer" style="background: transparent">
      <div class="nb-acct-pop" style="left: 12px; bottom: 44px">
        <div class="nb-acct-head">
          <span class="nb-avatar"><NbIcon name="user" :size="16" /></span>
          <div>
            <div class="nb-acct-name">本机用户</div>
            <span class="nb-acct-tag">未登录 · 接口预留</span>
          </div>
        </div>
        <div class="nb-acct-divider" />
        <button class="nb-acct-item" @click="onCheckin">
          <NbIcon name="gift" :size="15" /> 加油站签到
        </button>
        <button class="nb-acct-item" @click="stubToast('个人账号'); showAccountMenu = false">
          <NbIcon name="user" :size="15" /> 个人账号
        </button>
        <button class="nb-acct-item" @click="openAppearance">
          <NbIcon name="palette" :size="15" /> 外观
        </button>
        <button
          class="nb-acct-item"
          @click="
            showAccountMenu = false;
            showSettings = true;
            settingsTab = 'general'
          "
        >
          <NbIcon name="gear" :size="15" /> 设置
        </button>
        <div class="nb-acct-divider" />
        <button
          class="nb-acct-item"
          style="color: var(--nb-red)"
          @click="showAccountMenu = false; logout()"
        >
          <NbIcon name="login" :size="15" /> 退出登录
        </button>
      </div>

      <!-- 签到气泡 stub（头像下方 300px 气泡） -->
      <div v-if="showCheckin" class="nb-checkin-bubble" style="left: 12px; bottom: 44px">
        <div class="nb-checkin-title">Buddy 加油站</div>
        <div class="nb-checkin-desc">连续签到领能量 · 账号体系未开通，此为界面接口预留</div>
        <div class="nb-checkin-grid">
          <div
            v-for="(d, i) in CHECKIN_DAYS"
            :key="i"
            class="nb-checkin-cell"
            :class="{ 'nb-checkin-cell--done': d }"
          >
            {{ d ? '✓' : i + 1 }}
          </div>
        </div>
        <button class="nb-btn nb-btn--primary" style="width: 100%" @click="stubToast('签到')">签到</button>
      </div>
    </div>
  </div>
</template>
