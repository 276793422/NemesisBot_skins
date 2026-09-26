# OpenLikeBuddy 皮肤

NemesisBot 的 **Buddy 设计语言**桌面观感皮肤。**皮肤的语义 = 给当前应用
（Dashboard）换观感**：同一个 URL、同一个应用、同一批会话，装上后在原地
变装——顶栏/侧栏/状态栏/居中聊天列/气泡/输入盒/全部管理页统一为 Buddy
骨架规格，`skins.set_active` 免重启热切。**v0.5 起皮肤包只含 theme 载荷**
（`skin/openlikebuddy.css`，经 `/skins/active.css` 注入当前页）。含亮 /
暗双变体。

> 历史注记：v0.4 曾按「皮肤包自带独立应用」形态交付（`app/` + `ui-src/`，
> 服务于 `/skins/{id}/app/`）。该形态违背皮肤语义（皮肤不是「另一个页面」），
> 已从皮肤系统中整体移除（路由/打包/管理入口全删）；`ui-src/` 与 `app/`
> 作为设计参考**留在仓库但不进 `.nbskin` 包、系统内无任何入口**。

## 皮肤包内容

```
openlikebuddy/
├── manifest.json            # nbskin v1 元数据（entry 指向 theme 载荷）
├── skin/
│   └── openlikebuddy.css    # theme 载荷：当前 Dashboard 的 Buddy 观感
├── ui-src/                  # [历史参考] 独立应用源码（不进包，无系统入口）
├── app/                     # [历史参考] 独立应用构建产物（不进包，无系统入口）
├── dev/
│   ├── build.sh / build.bat # node dev/pack.mjs 一行封装
│   ├── pack.mjs             # 零依赖 Node ZIP 打包器（manifest + theme only）
│   └── shots/               # E2E 截图（headless Edge CDP 验收留档）
└── dist/
    └── openlikebuddy.nbskin # 产出（单文件 ZIP，部署物）
```

## 构建

```bash
bash dev/build.sh        # 或 Windows: dev\build.bat
```

产出 `dist/openlikebuddy.nbskin`（= ZIP：`manifest.json` +
`skin/openlikebuddy.css`，未签名 v1——签名由官方 CI 统一铸叶签署）。

## 部署与使用

皮肤包放 **exe 同级目录的 `skins/` 下**（与 `static/` 同策略，不放 home）：

```
<exe目录>/skins/openlikebuddy.nbskin
```

打开 Dashboard → **设置 → 皮肤** tab → openlikebuddy 卡「设为默认观感」，
当前页面免刷新原地换装；「恢复默认」一键回内置观感。`config.json` 的
`ui.skin` 记录激活 id（`default`/空 = 无皮肤）。

## 关键视觉规格（设计定稿数值）

| 槽 | 亮色 | 暗色 |
|---|---|---|
| 品牌青 accent | `#00C29A`（hover `#40D1B3`） | `#22CBA8`（hover `#4CF0CE`） |
| 主按钮 / 新任务 | **黑底白字** `rgba(0,0,0,.9)` | **白底黑字** `rgba(255,255,255,.9)` |
| 标题栏 38 / 状态栏 22 | `#F5F5F5` / `#F8F8F8` | `#1A1A1A` / `#1A1A1A` |
| 侧栏 220 / 内容 | `#F7F7F8` / `#FFFFFF` | `#141414` / `#1F1F1F` |
| 侧栏密度 | 新建任务 36px r8 + 导航 28px r6 + 分组头 20px + 行 24px r4 | 同 |
| 主页 | 品牌 + 场景标签 80×32 r16 gap12 + 输入盒 min(560px,80%) r12 | 同 |
| 聊天列 | 832px 居中列 + 浮动圆角输入盒 r12 | 同 |
| 边框 | `#DEDEDE` / `#EBEBEB` | `#3D3D3D` / `#2E2E2E` |
| 圆角 | sm4 / md6 / lg8 / xl12 / pop16 | 同 |
| 字体 | PingFang SC / Microsoft YaHei 系统栈 | 同 |

明暗跟随 Dashboard 自身的主题切换（`data-theme` 属性），皮肤与明暗解耦。

## 骨架槽位（v0.5：前端结构槽 + 皮肤 CSS 品牌化）

WB 招牌布局元素（带内容的顶栏/状态栏、主页品牌启动器、左侧会话栏）是
**DOM 结构**，纯 CSS 造不出来——只换配色看不见「布局换了」。v0.5 起前端
提供骨架槽位（v0.6 增左侧栏，共四个），皮肤包仍是纯 CSS：

| 槽位 | 位置 | 内容 |
|---|---|---|
| `nb-titlebar` | `.app-layout` 顶（38px） | 品牌方块 + 品牌名（左）· 连接状态（右） |
| `nb-statusbar` | `.app-layout` 底（22px） | 连接 · 版本 · 活跃模型（左）· 就绪态（右） |
| `nb-launcher` | ChatPanel 空会话主页 | 品牌大标 + 场景标签（点击预填输入框）+ 居中输入盒 |
| `nb-sb`（SkinSidebar） | 替换主导航 Sidebar | ＋新建对话 + 4 导航（人格/代码开发/Skills/定时任务）+ 「更多」flyout（全部管理页）+ 会话历史（今天/昨天/7 天内/更早时间分组，行=标题+相对时间+hover 删除）+ 空间（本机）+ footer（用户 + 设置齿轮） |

- **渲染条件**：`skinState.id` 非空（皮肤激活）才挂载；`:where(html[data-skin])`
  门控的基线样式在 `components.css`（`:where()` 零特异性 = 兜底观感，任何
  皮肤包 `html[data-skin="id"]` 同选择器稳定覆盖，不依赖 CSS 注入时序）——
  无皮肤时选择器不命中，默认观感零变化。
- **功能可达性**：SkinSidebar 收起主导航后，全部管理页经「更多」flyout 可达
  （25 项，内部滚动）；会话列表与 SessionSidebar 数据同源（session store），
  双侧栏互斥（ChatView/ChatPanel 在皮肤激活时让位）。
- **槽位数据**：manifest 新字段 `brand`（品牌名，空回落 id）与 `scenes`
  （场景标签数组，空不渲染标签行），经 WSAPI `skins.detail` → useSkin
  `skinState.meta` 下发。状态栏版本/模型来自 `GET /api/status`（`?token=`
  鉴权，useSSE 同款惯例）。
- **品牌化**：皮肤 CSS 用同选择器覆盖 token（`--nb-titlebar-bg` /
  `--nb-statusbar-bg` / `--nb-chrome-border` 等）+ 布局 token
  （`--sidebar-width: 220px`）。
- **语义不变**：同一 URL、同一应用、原地换装；launcherMode 在历史加载中
  不渲染（加载完成且会话为空才出现），有内容会话自动退场、双条常驻。

## 诚实边界

- UsageView 的 echarts 图表配色（canvas JS 配色，CSS 够不着）
- TerminalView 的 xterm 终端配色（保持终端语义）
- `chat/index.html` 独立聊天页未接皮肤加载器
- 移动端 ≤768px 保持配色、不做骨架
- 历史参考的 ui-src 独立应用**不再维护**（其中的账号/商店/Office 等 stub
  形态仅为当年复刻留档，与皮肤系统无关）
