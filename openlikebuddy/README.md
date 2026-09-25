# OpenLikeBuddy 皮肤

NemesisBot 的 **Buddy 设计语言**桌面观感皮肤。**v0.4 = 完整独立应用**：
`app/` 内是一个独立的 Vue 3 应用，按主窗骨架（38px 标题栏 / 220px 侧栏 /
22px 状态栏）与全部页面形态交付，由 skins 后端直接从 `.nbskin` ZIP 内服务于
`/skins/openlikebuddy/app/`。**bot 底层零改动**——纯 UI 层直连后台 WS；不装
皮肤时这个 UI 不存在。另含 theme 载荷（`skin/openlikebuddy.css`）可为原版
Dashboard 提供同款观感。含亮 / 暗双变体。

## 功能总表

| 功能 | openlikebuddy 实现 | 后端 |
|---|---|---|
| 登录 | 访问密钥登录卡（与 Dashboard 同 token，localStorage 单点登录） | 真实 WS 鉴权 |
| 主页（品牌 + 3 场景标签 + 输入盒） | 同形态（日常办公/代码开发/设计创意） | 发送即建会话 |
| 新建任务 + 任务分组（今天/昨天/7天内/更早） | 同形态 | sessions.list |
| 空间分组 | 集群节点列表（在线点 + 角色） | cluster.nodes.list |
| 助理页 | 人格卡 + 启用 | persona.list/activate |
| 项目页 | 项目卡（路径/运行中徽标）+ 新建/移除/打开目录 | projects.* |
| 专家页 | 技能卡 + 卸载；**专家商店 = UI 接口预留** | skills.installed/uninstall |
| 自动化页 | 定时任务（开关/立即运行）+ 工作流（运行）分段 | tasks.cron.* + workflow.run_now |
| 更多菜单 | 新建文档（Office 壳）/ 管理后台 / 关于 | — |
| 对话 | 832px 居中列、markdown、工具调用折叠卡、模型徽标、停止、重命名 | chat.send/receive + agent.cancel + sessions.rename |
| 设置独立窗（32px 标题条 + 200px 导航） | 通用 / 外观 / 账号 / 管理后台 / 关于 五页 | 外观=主题切换真实生效 |
| 外观（主题选择 + 预览图 + 升级条） | 明/暗/跟随系统主题卡 + 预览 + **升级条 = stub** | prefs localStorage |
| 全局搜索 Ctrl+K（800×640） | 搜会话 + 页面 + 动作，↑↓/Enter 键盘导航 | — |
| Office 文档窗 | **窗壳完整（48px Tab 栏 + 标题栏 + 对话面板 + 冷启动动画），文档编辑 = UI 接口预留** | 对话面板真实可用 |
| 账号（头像菜单/签到气泡/会员） | **UI 接口预留**（菜单/气泡形态完整）；退出登录真实 | 清 token |

原则：**NemesisBot 有的功能全部直连真实 WSAPI；NemesisBot 没有的（账号体系、
Office 编辑、商店支付）一律留好 UI 接口**（形态在、点击提示「UI 接口已预留」）。

## 结构

```
openlikebuddy/
├── manifest.json            # nbskin v1 元数据（theme entry + app/ 声明）
├── skin/
│   └── openlikebuddy.css    # theme 载荷：原版 Dashboard 的 Buddy 观感
├── app/                     # app 载荷：Vue 构建产物（ui-src 构建输出，勿手改）
├── ui-src/                  # 独立 Vue 3 应用源码（自带 package.json）
│   └── src/
│       ├── tokens.css       # nb-* token 体系（亮/暗双主题全套定稿）
│       ├── app.css          # 13 分区组件样式（骨架/侧栏/主页/对话/页/窗/office）
│       ├── icons.ts         # ~35 个 stroke SVG 功能组件（NbIcon）
│       ├── protocol.ts      # WS 协议薄客户端（独立实现，不 import bot 前端）
│       ├── store.ts         # reactive 应用状态（不引 Pinia）
│       ├── markdown.ts      # marked 渲染（breaks + gfm）
│       ├── App.vue          # 外壳：标题栏/侧栏/状态栏/独立窗/快捷键/启动流
│       └── components/      # SideBar / HomeView / ChatView / Composer /
│                            # AssistantsView / ProjectsView / ExpertsView /
│                            # AutomationView / SettingsWindow / SearchWindow /
│                            # OfficeWindow / AccountMenu / AuthCard
├── dev/
│   ├── build.sh / build.bat # npm build（ui-src → app/）+ pack.mjs 打包
│   ├── pack.mjs             # 零依赖 Node ZIP 打包器
│   └── shots/               # E2E 截图（headless Edge CDP 验收留档）
└── dist/
    └── openlikebuddy.nbskin # 产出（单文件 ZIP，部署物）
```

## 构建

```bash
bash dev/build.sh        # 或 Windows: dev\build.bat
# = (首次 npm install) + npm run build（ui-src → ../app）+ node dev/pack.mjs
```

产出 `dist/openlikebuddy.nbskin`（= ZIP：`manifest.json` + `skin/openlikebuddy.css`
+ `app/**`，未签名 v1）。

## 部署与访问

皮肤包放 **exe 同级目录的 `skins/` 下**（与 `static/` 同策略，不放 home）：

```
<exe目录>/skins/openlikebuddy.nbskin
```

重启 gateway 后访问：

```
http://127.0.0.1:49000/skins/openlikebuddy/app/
```

`config.json` 的 `ui.skin: "openlikebuddy"` 只影响 `/skins/active.css`（原版
Dashboard 的 theme 观感），与 app 形态无关——app 按显式 id 访问。

## 服务形态（skins 后端，crates/nemesis-web/src/skins.rs）

- `GET /skins/{id}/app` → **303** 到带尾斜杠形态
- `GET /skins/{id}/app/` → ZIP 内 `app/index.html`
- `GET /skins/{id}/app/{*rest}` → ZIP 内 `app/{rest}`（按扩展名给 MIME，no-cache）
- 路径守卫：拒绝 `..` 成分 / 空段 / 反斜杠（防穿越）；app 服务在鉴权层外
  （与静态资源同信任级——页面壳公开，数据全部走鉴权 WS）
- **`<base href>` 交互**：服务端 BridgeSubpathService 会对无 `<base>` 的 HTML
  注入 `<base href="/">`（直连形态），这会把皮肤 app 的相对资产解析回根路径。
  对策 = app 的 index.html **自带 `<base href="./">`**（注入器见 `<base ` 即
  跳过），配合入口 303 归一到尾斜杠，`./assets/...` 恒解析到
  `/skins/{id}/app/assets/`。经 `/d/<node_id>/` 桥前缀访问同样正确（相对解析
  跟随浏览器地址，设备侧剥前缀）。

## 关键视觉规格（设计定稿数值）

| 槽 | 亮色 | 暗色 |
|---|---|---|
| 品牌青 accent | `#00C29A`（hover `#40D1B3`） | `#22CBA8`（hover `#4CF0CE`） |
| 主按钮 / 新任务 | **黑底白字** `rgba(0,0,0,.9)` | **白底黑字** `rgba(255,255,255,.9)` |
| 标题栏 38 / 状态栏 22 | `#F5F5F5` / `#F8F8F8` | `#1A1A1A` / `#1A1A1A` |
| 侧栏 220 / 内容 | `#F7F7F8` / `#FFFFFF` | `#141414` / `#1F1F1F` |
| 侧栏密度 | 新建任务 36px r8 + 导航 28px r6 + 分组头 20px + 行 24px r4 | 同 |
| 主页 | 品牌 200×32 + 场景标签 80×32 r16 gap12 + 输入盒 min(560px,80%) r12 | 同 |
| 设置窗 760×560 / 搜索窗 800×640 | 32px/20px 标题条 + 导航 200px | 同 |
| Office 壳 | Tab 栏 48（脏点 6px）+ 标题栏 48 + 对话面板 280–560 可拖 + 冷启动（吉祥物 130×140 + 进度 340×6） | 同 |
| 边框 | `#DEDEDE` / `#EBEBEB` | `#3D3D3D` / `#2E2E2E` |
| 圆角 | sm4 / md6 / lg8 / xl12 / pop16 | 同 |
| 字体 | PingFang SC / Microsoft YaHei 系统栈，13px 基准 | 同 |

主题切换：`data-nb-theme` 属性驱动（`light` / `dark`），「跟随系统」监听
`prefers-color-scheme`。

## 验证方式（本包验收时用过，可复跑）

1. **WSAPI 契约探针**：Node 裸 WS 客户端对网关逐个发 `system.version` /
   `models.list` / `sessions.list` / `persona.*` / `projects.*` /
   `skills.installed` / `tasks.cron.list` / `workflow.list` /
   `cluster.nodes.list`，核对响应形状与 store.ts 提取字段一一对应；
   `system.commands` 全量命令核对动作命令存在性
2. **CDP 端到端**：headless Edge（`--remote-debugging-port`）注入 token →
   逐视图断言（骨架尺寸 38/220/22、五导航、会话渲染、历史消息、四导航页
   卡片、设置五分页、主题切换落 `data-nb-theme`、Office 冷启动、Ctrl+K/Esc、
   窗口规格 800×640 / 760×560），零 JS 错误
3. **截图留档**：`dev/shots/01-04`（亮/暗主页、暗色对话、搜索窗）

## 诚实边界

- **UI 接口预留项**（bot 无对应能力，形态在、点击提示）：账号登录/签到/会员、
  Office 文档编辑、专家/助理商店、更多主题
- 语音输入、图片粘贴等扩展输入形态未做（基础形态优先）
- app 内 markdown 代码块无语法高亮（单依赖 marked，保持皮肤包轻量）
