# CoralDusk Full（P3 行为层脚本皮肤）

CoralDusk 的完整形态：纯 CSS 观感（与 `skins/coraldusk` 同源载荷）+ **行为层
脚本**——new_ui 式合并导航、友好设置表单、简洁/经典双壳。

## 打包

```bash
node dev/pack.mjs        # → dist/coraldusk-full.nbskin
```

## 安装与启用

1. Dashboard → 设置 → 皮肤 → 导入 `dist/coraldusk-full.nbskin`
2. 激活 `coraldusk-full`：脚本载荷触达 **脚本同意卡**（manifest 带
   `script`，P2a 语义）——同意后脚本注入执行，拒绝则纯 CSS 观感
3. `ui.skins.allow_scripts` = false 时脚本端点 403（纯 CSS，无同意卡）

## 行为面（全部走 `window.NemesisSkin` v1 契约）

| 能力 | 实现 |
|------|------|
| P3-a 导航重组 | `nav.model()` 取结构化模型 → 按 主页/能力/高级/设置/安全 归组渲染自有侧栏（原生侧栏 CSS 隐藏但在场）；跳转全部 `navigate(id)` |
| P3-b 友好设置 | `config.schema(page)` 渲染控件（boolean→开关 / number+range→滑块 / enum→下拉 / string→输入，secret→密码框），初值 `config.current()`，写回 `config.set(path, value)` |
| P3-c 双壳 | 右下角切换钮 + 侧栏底部按钮；`localStorage nemesisbot_skin_shell` 持久化；classic 壳只保留切换钮 |

## 降级链

- 契约缺失 / 版本不符 / 运行期异常 → 不做任何 DOM 手术，
  `html[data-nb-skin-state="degraded:<原因>"]` 如实标注；页面保持纯 CSS
  观感（CSS 载荷不依赖脚本）
- 成功 → `data-nb-skin-state="active"`
- 壳样式由脚本注入 `<style data-nb-skin-shell-style>` 承载：脚本死了壳样式
  一起消失，绝不留下「隐藏原生侧栏的孤儿 CSS」

## 兼容声明

manifest `compat`: `{ dashboard: ">=0.1", nemesisskin: "1" }`——要求宿主契约
v1。宿主升级 v2 后本脚本按降级链退到纯 CSS（不做猜测式兼容）。
