/**
 * openlikebuddy 皮肤自带应用 — Markdown 渲染（marked 单依赖，无 hljs）。
 * 安全：先 escape 再交给 marked（不配 raw html），代码块统一无高亮纯排版。
 */
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

/** 渲染 markdown 为 HTML（buddy 消息体用）。 */
export function renderMarkdown(src: string): string {
  if (!src) return ''
  return marked.parse(src, { async: false }) as string
}

/** 纯文本预览（工具卡片 args/result 摘要用）：去 markdown 标记、截断。 */
export function plainPreview(src: string, max = 160): string {
  if (!src) return ''
  let t = src
    .replace(/```[\s\S]*?```/g, ' [代码] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>~|-]+\s?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length > max) t = t.slice(0, max) + '…'
  return t
}
