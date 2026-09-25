<script setup lang="ts">
/**
 * 登录卡 — Buddy 登录观感；鉴权为 bot 真实访问密钥（与 Dashboard 同一 token）。
 * Buddy 的账号密码/短信登录为账号体系的一部分：UI 接口预留（置灰展示）。
 */
import { ref } from 'vue'
import { NbIcon } from '../icons'
import { testToken } from '../protocol'
import { stubToast } from '../store'

const emit = defineEmits<{ (e: 'authed', token: string): void }>()

const token = ref('')
const testing = ref(false)
const error = ref('')

async function submit() {
  const t = token.value.trim()
  if (!t || testing.value) return
  testing.value = true
  error.value = ''
  try {
    const ok = await testToken(t)
    if (ok) {
      localStorage.setItem('nemesisbot_auth_token', t)
      emit('authed', t)
    } else {
      error.value = '访问密钥无效或服务不可达'
    }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="nb-auth">
    <div class="nb-auth-card">
      <span class="nb-auth-logo" />
      <div class="nb-auth-title">登录 Buddy</div>
      <div class="nb-auth-desc">输入网关访问密钥（与管理后台相同的 token）</div>
      <input
        v-model="token"
        class="nb-input"
        type="password"
        placeholder="访问密钥"
        @keydown.enter="submit"
      />
      <div v-if="error" class="nb-auth-error">{{ error }}</div>
      <button class="nb-btn nb-btn--primary" style="width: 100%" :disabled="testing || !token.trim()" @click="submit">
        {{ testing ? '验证中…' : '进入' }}
      </button>
      <div class="nb-set-divider" />
      <button
        class="nb-btn nb-btn--ghost"
        style="width: 100%; opacity: 0.55"
        title="账号体系未开通：UI 接口预留"
        @click="stubToast('账号密码登录')"
      >
        手机号 / 账号登录（即将上线）
      </button>
      <div class="nb-auth-foot">密钥在工作空间 config.json 的 security 段设置</div>
    </div>
  </div>
</template>
