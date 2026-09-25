<script setup lang="ts">
/**
 * 项目页 — projects.* WSAPI（list/create/remove/rename/open_dir）。
 * 项目 = 目录 + 独立 agent loop（running 徽标）。
 */
import { onMounted, ref } from 'vue'
import { NbIcon } from '../icons'
import {
  store,
  loadProjects,
  createProject,
  removeProject,
  stubToast,
  toast,
} from '../store'
import { request } from '../protocol'

onMounted(() => loadProjects())

const creating = ref(false)
const newName = ref('')
const newPath = ref('')

async function onCreate() {
  const name = newName.value.trim()
  const path = newPath.value.trim()
  if (!name || !path) {
    toast('请填写项目名称与目录路径')
    return
  }
  try {
    await createProject(name, path)
    creating.value = false
    newName.value = ''
    newPath.value = ''
  } catch (e) {
    toast(`创建失败：${e}`)
  }
}

async function onRemove(p: { id: string; name: string }) {
  if (!window.confirm(`移除项目「${p.name}」？仅解除分组，不删除任何文件。`)) return
  try {
    await removeProject(p.id)
    toast(`已移除：${p.name}`)
  } catch (e) {
    toast(`移除失败：${e}`)
  }
}

async function onOpen(p: { id: string; name: string }) {
  try {
    await request('projects', 'open_dir', { project_id: p.id })
  } catch (e) {
    toast(`打开失败：${e}`)
  }
}
</script>

<template>
  <div class="nb-page">
    <div class="nb-page-head">
      <span class="nb-page-title">项目<span class="nb-page-sub">把工作目录交给独立的 Agent 循环</span></span>
      <button class="nb-btn nb-btn--primary nb-btn--sm" @click="creating = true">
        <NbIcon name="plus" :size="13" /> 新建项目
      </button>
    </div>
    <div class="nb-page-body">
      <div v-if="creating" class="nb-card" style="max-width: 480px; margin-bottom: 16px">
        <div class="nb-card-title">新建项目</div>
        <input v-model="newName" class="nb-input" placeholder="项目名称" />
        <input v-model="newPath" class="nb-input" placeholder="目录绝对路径，如 C:\works\demo" />
        <div class="nb-card-foot" style="justify-content: flex-end">
          <button class="nb-btn nb-btn--sm" @click="creating = false">取消</button>
          <button class="nb-btn nb-btn--sm nb-btn--primary" @click="onCreate">创建</button>
        </div>
      </div>

      <div v-if="store.projects.length === 0 && !creating" class="nb-empty">
        <span class="nb-empty-ico"><NbIcon name="folder" :size="22" /></span>
        <span class="nb-empty-title">暂无项目</span>
        <span class="nb-empty-hint">新建项目后，Bot 会在该目录上运行独立的任务循环</span>
      </div>
      <div v-else class="nb-cardgrid">
        <div v-for="p in store.projects" :key="p.id" class="nb-card">
          <div class="nb-card-top">
            <span class="nb-card-ico"><NbIcon name="folder" :size="18" /></span>
            <div class="nb-card-names">
              <div class="nb-card-title">{{ p.name }}</div>
              <div class="nb-card-desc" style="-webkit-line-clamp: 1" :title="p.path">{{ p.path }}</div>
            </div>
            <span v-if="p.running" class="nb-badge nb-badge--green">运行中</span>
          </div>
          <div class="nb-card-foot">
            <button class="nb-btn nb-btn--sm" @click="onOpen(p)">
              <NbIcon name="external" :size="12" /> 打开目录
            </button>
            <button class="nb-btn nb-btn--sm nb-btn--danger" @click="onRemove(p)">移除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
