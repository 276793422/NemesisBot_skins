# S0 验证柱 — 开发日志

日期：2026-09-14 · 纪律：只动 `skins/openanybuddy/` + 计划文档（bot 零触碰）

## 已完成

1. **gateway 隔离实例**（scratch，全部新端口避开 ghost）：
   - home：`skins/openanybuddy/dev/gateway/.nemesisbot/`（`--local` onboard）
   - web：`172.23.112.1:49080`（token `s0-dev-token`）· health：`18795` · websocket 通道关
   - 模型：`testai-1.1` ← TestAIServer `127.0.0.1:8080`
2. **WSAPI 全链路预演通过（Windows 侧）**：
   - `ws://172.23.112.1:49080/ws?token=s0-dev-token` 握手 OPEN
   - chat.send → agent 循环 → TestAIServer → 回帧
   - **回帧形态采证**：`{"type":"message","module":"chat","cmd":"receive","data":{"content":"好的，我知道了","model":"test/testai-1.1","role":"assistant","seq":1,"session_id":"legacy"}}`
3. **WSL→Windows 跨界连通性**：health + web 双 200（vEthernet 172.23.112.1）
4. **ext-hello 扩展**：打包完成 `oa-hello-0.0.1.vsix`（48KB，含 ws 依赖；§3.4 契约解析 env→settings→默认）
5. **WSL→gateway WS 全链路实证（raw client，Node18 无依赖）**：
   - `dev/ws-probe.mjs`：握手 101 + `Sec-WebSocket-Accept` 校验 + chat.send → 回帧（testai-1.1，seq 2）全通
   - **网关安全行为正面采证**：探针首版漏发 mask 位（客户端帧第 2 字节须 `0x80|len`），网关按 RFC 诚实拒绝
     `WebSocket protocol error: Received an unmasked frame from client` 并断连——协议违规拒绝路径有效
6. **下载工程化**：ghproxy.net 单连接中途掐线频发（curl `-r` 与 `-C -` 互斥）→ `dev/resume-segments.sh`
   按盘上字节算剩余区间 + `>>` 追加 + 循环补洞，实测可收敛

## 关键发现（影响计划的证据）

### F1：基座 server 无 Windows 官方包 ⚠️（基座平台路线需拍板）

- v1.109.5 release 资产仅 3 个：linux-arm64 / linux-armhf / linux-x64
- 近 15 个 release 零 win32 资产——**计划里「Windows x64 官方包」为错误输入，已证伪**
- code-server（coder）**有官方 windows-amd64 包**（v4.137.0），可作 Windows 原生备选
- 本机 WSL2 可用 → S0 走 linux-x64 + WSL 推进，不阻塞
- **待用户拍板**（S0 报告附三选项：A=WSL/容器常驻；B=Windows 用 code-server 双基座；C=Windows 暂不提供 IDE 基座）

### F2：ghost socket 实锤（记忆坑位复现）

- 死网关（PID 4992 已不存在）的 LISTEN 残留：49001/49002/18790
- `Get-NetTCPConnection` 仍报 OwningProcess=4992；bind 与连接全失败
- 对策：隔离实例全端口改道（49080/18795）；正常停机（TaskStop→干净释放）不产生 ghost

### F3：G9 绑定折叠语义（gateway 既有设计，非 bug）

- `channels.web.host=0.0.0.0` 在非 cluster 启动时被 `web_bind_and_display_hosts` 折叠为 127.0.0.1
- WSL 可达的正确姿势：绑**具体 vEthernet IP**（如 `172.23.112.1`，按字面绑定）
- 该 IP 随 WSL 重启可能变化（NAT 模式）——B1 阶段 ide_manager 需动态发现
- 入站防火墙：vEthernet (WSL) 接口默认放行（18795@0.0.0.0 实证）

### F4：GFW 下载镜像链实测

- github.com 直连：~115KB/s（限速）
- `mirror.ghproxy.com` / `gh-proxy.com` / `ghfast.top`：DNS 死或超时
- **`ghproxy.net`：可用（206）**——B1 下载器镜像链的第一个实证成员

## 待办

- [x] 基座 tarball 下载完成 → WSL 解压 + 启动（48900，token dev-token）
  - 四段断点续传拼装 76,686,959 字节，`tar -tzf` 完整性 OK
  - 基座 server v1.109.5 Extension host agent listening on 48900
- [x] 安装 oa-hello-0.0.1.vsix → 扩展宿主连 gateway → 全链路
  - `openanybuddy.oa-hello@0.0.1` 安装成功；浏览器 workbench 加载后按 `onStartupFinished` 激活
  - 扩展宿主（WSL 172.23.123.7）→ gateway（172.23.112.1:49080）TCP/WS 连接建立，
    gateway 日志 15:27:01 认领 WebSocket 会话
  - WSL 侧 raw client 独立实证 chat.send→receive 回环（`dev/ws-probe.mjs` PROBE_OK）
- [x] 基座资源实测：服务端+扩展宿主合计 **~272MB RSS**（单窗口闲置；ext host 118MB + 主进程 58MB + 其余 ~96MB）
- [x] S0 报告 + 基座平台路线三选项呈审（见下）

## S0 结论（2026-09-14）

**验证柱成立**：IDE 基座真件 + 自研扩展 + NemesisBot gateway WSAPI 全链打通，
全程未触碰 bot 侧任何文件（纪律遵守）。§3.4 契约三要素（URL/token/连接串）在扩展内按
env→settings→默认 解析链实测可用。

### 基座平台路线（F1，待用户拍板）

| 选项 | 内容 | 代价 | 收益 |
|------|------|------|------|
| **A** | Windows 用户走 WSL2/容器常驻基座 server | WSL2 依赖 + vEthernet IP 动态（B1 需动态发现，F3） | 单一代码基（与 Linux 生产同构）；官方包直供 |
| **B** | Windows 用 code-server（coder，有官方 windows-amd64）双基座 | 双基座差异面（插件 API 兼容层 vs code 皮肤两套 QA） | Windows 原生无 WSL 依赖 |
| **C** | Windows 暂不提供 IDE 基座（Linux/服务器形态先上） | Windows 用户无 IDE 入口 | 零额外成本，最快收口 |

S0 实测数据支持任意选项；**推荐 A**（单一基座 + 生产同构；WSL2 在开发机已验证可用），
B 作为 B1 后按需补充。
