/**
 * openlikebuddy 皮肤自带应用入口。
 * 顺序：tokens（变量定义）→ wb（组件样式）。
 */
import { createApp } from 'vue'
import App from './App.vue'
import './tokens.css'
import './app.css'

createApp(App).mount('#app')
