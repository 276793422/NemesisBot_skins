# bot —— NemesisBot 官方皮肤包

程序中唯一的内置官方皮肤，与全部第三方皮肤走**同一声明式结构引擎**（无独立代码路径）。

## 内容

| 文件 | 作用 |
|---|---|
| `manifest.json` | 包元数据（`structure` 字段指向结构载荷） |
| `skin/bot.css` | 结构基线观感 + 官方扩展（E-Stop 三态 / 签名徽标 / Full Access 徽标），`html[data-skin="bot"]` 前缀 |
| `skin/structure.html` | 四槽声明式结构（sidebar / titlebar / statusbar / **chat**），`data-nb-*` 原语标注；chat 槽（v3）= 三方结构重写聊天区的参考实现（消息流 + 空态品牌 + 输入区整区接管，原 launcher 语义折叠于空态） |
| `dev/pack.mjs` | 零依赖 Node 打包器（`node dev/pack.mjs` → `dist/bot.nbskin`） |

## 语义

- **默认出厂观感 = `ui.skin` 留空**（原生 Vue UI，零皮肤）；激活 bot 包 = 换成结构引擎渲染的同构骨架（行为与原生全量对齐：导航 / 会话历史 / E-Stop / 主题 / 退出 / 设置齿轮 / 场景启动器）。
- **CSS 皮肤 = 换色**（只带 `entry`：CSS 生效、布局回归原生组件）；**结构皮肤 = 换骨架 + 换色**（`entry` + `structure`：声明式结构经引擎渲染；槽位可选声明——chrome 四槽 + v3 内容区槽 chat / `page:<route>`，声明什么替换什么，未声明区域走内置 UI）。
- 原语规范与投影字段：`docs/REPORT/2026-09-27_skin-structure-engine-v2.md` + `web/src/skins/types.ts`。
- 包内**绝不执行任意代码**：结构经引擎清洗（script/on*/javascript: 全剥），数据只读自投影，交互只经动作白名单。

## 改动流程

改 `skin/` 下任一文件 → `node dev/pack.mjs` 重打 → 部署 `dist/bot.nbskin` 到 exe 同级 `skins/` → Dashboard 设置页「皮肤」tab 激活（或 `config.json` `ui.skin: "bot"`）。
