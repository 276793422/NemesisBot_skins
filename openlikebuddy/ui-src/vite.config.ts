import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// openlikebuddy 皮肤自带应用（Buddy 观感 UI）。
// 构建产物输出到皮肤包的 app/ 目录，随 pack.mjs 打进 .nbskin。
// base './'：产物经 /skins/openlikebuddy/app/ 服务，相对路径自洽。
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: '../app',
    emptyOutDir: true,
    target: 'es2020',
  },
})
