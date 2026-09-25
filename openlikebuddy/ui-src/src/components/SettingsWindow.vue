<script setup lang="ts">
/**
 * 设置独立窗 — Buddy 形态：32px 标题条（右上门形关闭）+ 200px 导航列 + 主体。
 * 分页：通用 / 外观（主题商店）/ 账号（stub）/ 管理后台 / 关于。
 */
import { NbIcon } from '../icons'
import {
  prefs,
  persistPrefs,
  applyTheme,
  store,
  conn,
  showSettings,
  settingsTab,
  stubToast,
  toast,
} from '../store'

const TABS = [
  { key: 'general', label: '通用', icon: 'gear' },
  { key: 'appearance', label: '外观', icon: 'palette' },
  { key: 'account', label: '账号', icon: 'user' },
  { key: 'admin', label: '管理后台', icon: 'external' },
  { key: 'about', label: '关于', icon: 'info' },
]

const THEMES = [
  { id: 'light', label: '亮色', badge: 'FREE', fill: '#f2f2f2', accent: '#00C29A' },
  { id: 'dark', label: '暗色', badge: 'FREE', fill: '#1f1f1f', accent: '#22CBA8' },
  { id: 'auto', label: '跟随系统', badge: 'FREE', fill: 'linear-gradient(105deg, #f2f2f2 50%, #1f1f1f 50%)', accent: '#00C29A' },
]

function setTheme(id: string) {
  prefs.theme = id as any
  persistPrefs()
  applyTheme()
}

function onUpgrade() {
  stubToast('会员升级')
}

function openAdmin() {
  window.open('/', '_blank')
}

const host = window.location.host
</script>

<template>
  <div class="nb-winlayer" @click.self="showSettings = false">
    <div class="nb-win nb-settings">
      <div class="nb-win-titlebar">
        <span class="nb-win-title">设置</span>
        <button class="nb-win-close" title="关闭" @click="showSettings = false">
          <NbIcon name="close" :size="12" />
        </button>
      </div>
      <div class="nb-settings-body">
        <nav class="nb-settings-nav">
          <button
            v-for="t in TABS"
            :key="t.key"
            class="nb-settings-nav-item"
            :class="{ 'nb-settings-nav-item--active': settingsTab === t.key }"
            @click="settingsTab = t.key"
          >
            <NbIcon :name="t.icon" :size="15" />
            {{ t.label }}
          </button>
        </nav>

        <div class="nb-settings-content">
          <!-- 通用 -->
          <template v-if="settingsTab === 'general'">
            <div class="nb-set-group">
              <div class="nb-set-group-title">对话</div>
              <div class="nb-set-row">
                <div>
                  <div class="nb-set-row-label">自动滚动</div>
                  <div class="nb-set-row-desc">生成回复时自动滚动到底部</div>
                </div>
                <span
                  class="nb-switch"
                  :class="{ 'nb-switch--on': prefs.autoscroll }"
                  @click="prefs.autoscroll = !prefs.autoscroll; persistPrefs()"
                />
              </div>
              <div class="nb-set-divider" />
              <div class="nb-set-row">
                <div>
                  <div class="nb-set-row-label">Enter 发送消息</div>
                  <div class="nb-set-row-desc">关闭后使用 Ctrl+Enter 发送</div>
                </div>
                <span
                  class="nb-switch"
                  :class="{ 'nb-switch--on': prefs.sendEnter }"
                  @click="prefs.sendEnter = !prefs.sendEnter; persistPrefs()"
                />
              </div>
            </div>
            <div class="nb-set-group">
              <div class="nb-set-group-title">连接</div>
              <div class="nb-kv"><span>状态</span><b>{{ conn.status === 'connected' ? '已连接' : conn.status === 'connecting' ? '连接中…' : '已断开' }}</b></div>
              <div class="nb-kv"><span>当前模型</span><b>{{ store.model || '—' }}</b></div>
              <div class="nb-kv"><span>可选模型</span><b>{{ store.models.length }} 个</b></div>
            </div>
          </template>

          <!-- 外观：主题商店 -->
          <template v-else-if="settingsTab === 'appearance'">
            <div class="nb-appear-preview">
              <div class="nb-appear-preview-inner">
                <div class="nb-appear-preview-side">
                  <span class="nb-appear-preview-bar" style="width: 80%" />
                  <span class="nb-appear-preview-bar" style="width: 60%" />
                  <span class="nb-appear-preview-bar" style="width: 70%" />
                </div>
                <div class="nb-appear-preview-main">
                  <span class="nb-appear-preview-accent" />
                  <span class="nb-appear-preview-bar" style="width: 45%" />
                  <span class="nb-appear-preview-bar" style="width: 65%" />
                </div>
              </div>
            </div>
            <div class="nb-appear-head">
              <span class="nb-appear-title">主题</span>
              <span class="nb-appear-desc">选择界面外观，跟随系统将自动切换明暗</span>
            </div>
            <div class="nb-appear-grid">
              <div
                v-for="t in THEMES"
                :key="t.id"
                class="nb-theme-card"
                :class="{ 'nb-theme-card--selected': prefs.theme === t.id }"
                @click="setTheme(t.id)"
              >
                <div class="nb-theme-card-thumb">
                  <span class="nb-theme-card-thumb-fill" :style="{ background: t.fill }" />
                </div>
                <div class="nb-theme-card-name">
                  {{ t.label }}
                  <span class="nb-badge nb-badge--free" style="height: 15px; font-size: 9px; padding: 0 5px">{{ t.badge }}</span>
                </div>
              </div>
              <div class="nb-theme-card">
                <div class="nb-appear-coming">更多主题<br />敬请期待</div>
                <div class="nb-theme-card-name" style="justify-content: center">即将上线</div>
              </div>
            </div>
            <!-- 会员升级条（账号 stub：点击提示接口预留） -->
            <div class="nb-upgrade-bar">
              <div class="nb-upgrade-main">
                <div class="nb-upgrade-title">解锁全部主题</div>
                <div class="nb-upgrade-desc">升级会员，获取更多专属外观</div>
              </div>
              <button class="nb-btn nb-btn--primary" @click="onUpgrade">升级</button>
            </div>
          </template>

          <!-- 账号（stub） -->
          <template v-else-if="settingsTab === 'account'">
            <div class="nb-set-group">
              <div class="nb-set-row" style="padding: 12px 0">
                <span class="nb-avatar" style="width: 44px; height: 44px">
                  <NbIcon name="user" :size="22" />
                </span>
                <div style="flex: 1">
                  <div class="nb-set-row-label">本机用户</div>
                  <div class="nb-set-row-desc">账号体系未开通 · 登录接口已预留</div>
                </div>
                <button class="nb-btn nb-btn--ghost" disabled>登录</button>
              </div>
            </div>
            <div class="nb-set-group">
              <div class="nb-set-group-title">会员</div>
              <div class="nb-set-row">
                <div>
                  <div class="nb-set-row-label">Buddy 会员</div>
                  <div class="nb-set-row-desc">付费订阅功能（签到/升级/专属主题），接口已预留</div>
                </div>
                <button class="nb-btn" @click="stubToast('会员订阅')">了解详情</button>
              </div>
            </div>
          </template>

          <!-- 管理后台 -->
          <template v-else-if="settingsTab === 'admin'">
            <div class="nb-set-group">
              <div class="nb-set-row">
                <div>
                  <div class="nb-set-row-label">打开管理后台</div>
                  <div class="nb-set-row-desc">模型管理 / 集群 / 日志 / 安全 / 终端等完整管理面（同源免登录）</div>
                </div>
                <button class="nb-btn nb-btn--primary" @click="openAdmin">
                  <NbIcon name="external" :size="13" /> 打开
                </button>
              </div>
            </div>
          </template>

          <!-- 关于 -->
          <template v-else-if="settingsTab === 'about'">
            <div class="nb-set-group">
              <div class="nb-set-row" style="padding: 16px 0">
                <span class="nb-home-brand-logo" style="width: 40px; height: 40px; border-radius: 10px" />
                <div style="flex: 1">
                  <div class="nb-set-row-label" style="font-size: 15px; font-weight: 600">Buddy</div>
                  <div class="nb-set-row-desc">NemesisBot 桌面观感皮肤（独立 Vue 应用）</div>
                </div>
              </div>
              <div class="nb-kv"><span>应用版本</span><b>openlikebuddy v0.4.0</b></div>
              <div class="nb-kv"><span>NemesisBot 版本</span><b>{{ store.version || '—' }}</b></div>
              <div class="nb-kv"><span>服务地址</span><b>{{ host }}</b></div>
            </div>
            <div class="nb-set-group">
              <div class="nb-set-group-title">快捷键</div>
              <div class="nb-kv"><span>全局搜索</span><b><span class="kbd">Ctrl</span> <span class="kbd">K</span></b></div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
