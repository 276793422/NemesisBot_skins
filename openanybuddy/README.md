# OpenAnyBuddy

NemesisBot 皮肤：IDE 形态观感（独立交付，不影响主线）——以开源 IDE server 为
基座，观感由自研扩展承载。

- 纪律：本目录自包含开发（npm/vsce 工具链），**不触碰仓库其他任何文件**
- 视觉规格：全部来自自写规格卡，逐项合规自检（R1-R6）

## 结构

```
openanybuddy/
├── README.md            本文件
├── .gitignore
├── docs/                皮肤侧文档（S0 报告、进度）
├── ext-hello/           S0 验证柱扩展（hello-webview 连 gateway WSAPI）
├── oa-theme/            （S1）主题与品牌 vsix 工程
├── oa-chat/             （S2）AI 聊天面板 vsix 工程
└── dev/                 本地开发运行时产物（gateway 实例、日志；git 忽略）
```

## 集成契约（阶段一冻结）

扩展配置读取顺序：**env 优先 → settings 回落 → 未配置=引导态**

| 项 | env | settings |
|---|---|---|
| gateway WS 地址 | `NEMESISBOT_IDE_GATEWAY_URL` | `openanybuddy.gatewayUrl` |
| gateway token | `NEMESISBOT_IDE_GATEWAY_TOKEN` | `openanybuddy.gatewayToken` |

## 阶段

- **S0（当前）**：验证柱——基座跑通 + ext-hello 连 WSAPI 全链路 + 资源实测
- S1 主题 / S2 聊天面板 / S3 编辑器上下文 / S4 打磨+.nbskin 格式
- B1-B3（bot 侧）延后，待用户放行
