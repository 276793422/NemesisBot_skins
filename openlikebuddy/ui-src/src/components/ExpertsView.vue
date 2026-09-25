<script setup lang="ts">
/**
 * 专家页 — 技能系统（skills.* WSAPI：installed/uninstall）。
 */
import { onMounted } from 'vue'
import { NbIcon } from '../icons'
import { store, loadSkills, uninstallSkill, stubToast, toast } from '../store'

onMounted(() => loadSkills())

async function onUninstall(name: string) {
  if (!window.confirm(`卸载技能「${name}」？`)) return
  try {
    await uninstallSkill(name)
  } catch (e) {
    toast(`卸载失败：${e}`)
  }
}
</script>

<template>
  <div class="nb-page">
    <div class="nb-page-head">
      <span class="nb-page-title">专家<span class="nb-page-sub">已安装的技能包，让 Agent 掌握专门能力</span></span>
      <button class="nb-btn nb-btn--ghost nb-btn--sm" @click="stubToast('专家商店')">
        <NbIcon name="external" :size="13" /> 专家商店
      </button>
    </div>
    <div class="nb-page-body">
      <div v-if="store.skills.length === 0" class="nb-empty">
        <span class="nb-empty-ico"><NbIcon name="star" :size="22" /></span>
        <span class="nb-empty-title">暂无已安装的技能</span>
        <span class="nb-empty-hint">在管理后台的「技能」页可以从远程 Registry 搜索安装</span>
      </div>
      <div v-else class="nb-cardgrid">
        <div v-for="s in store.skills" :key="s.name" class="nb-card">
          <div class="nb-card-top">
            <span class="nb-card-ico"><NbIcon name="star" :size="18" /></span>
            <div class="nb-card-names">
              <div class="nb-card-title">{{ s.name }}</div>
            </div>
            <span v-if="s.from" class="nb-badge">{{ s.from }}</span>
          </div>
          <div class="nb-card-desc">{{ s.desc || '（无描述）' }}</div>
          <div class="nb-card-foot">
            <button class="nb-btn nb-btn--sm nb-btn--danger" @click="onUninstall(s.name)">卸载</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
