<script setup lang="ts">
/**
 * 助理页 — 人格系统（persona.* WSAPI：list/activate）。
 */
import { onMounted } from 'vue'
import { NbIcon } from '../icons'
import { store, loadPersonas, activatePersona, stubToast } from '../store'

onMounted(() => loadPersonas())

async function onActivate(name: string) {
  try {
    await activatePersona(name)
  } catch (e) {
    stubToast(`切换失败：${e}`)
  }
}
</script>

<template>
  <div class="nb-page">
    <div class="nb-page-head">
      <span class="nb-page-title">助理<span class="nb-page-sub">切换 Bot 的人格（IDENTITY/SOUL/USER 模板）</span></span>
      <button class="nb-btn nb-btn--ghost nb-btn--sm" @click="stubToast('助理商店')">
        <NbIcon name="external" :size="13" /> 助理商店
      </button>
    </div>
    <div class="nb-page-body">
      <div v-if="store.personas.length === 0" class="nb-empty">
        <span class="nb-empty-ico"><NbIcon name="bot" :size="22" /></span>
        <span class="nb-empty-title">暂无已安装的助理</span>
        <span class="nb-empty-hint">在管理后台的「人格」页可以从远程仓库搜索安装人格模板</span>
      </div>
      <div v-else class="nb-cardgrid">
        <div v-for="p in store.personas" :key="p.name" class="nb-card">
          <div class="nb-card-top">
            <span class="nb-card-ico"><NbIcon name="bot" :size="18" /></span>
            <div class="nb-card-names">
              <div class="nb-card-title">{{ p.name }}</div>
            </div>
            <span v-if="p.active" class="nb-badge nb-badge--green">使用中</span>
          </div>
          <div class="nb-card-desc">{{ p.desc || '（无描述）' }}</div>
          <div class="nb-card-foot">
            <button
              v-if="!p.active"
              class="nb-btn nb-btn--sm nb-btn--primary"
              @click="onActivate(p.name)"
            >
              启用
            </button>
            <button v-else class="nb-btn nb-btn--sm" disabled>当前助理</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
