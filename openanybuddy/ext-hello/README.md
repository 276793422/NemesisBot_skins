# oa-hello (S0 验证柱扩展)

最小 webview 扩展：extension host 持 WebSocket 连 gateway WSAPI（`chat.send`），
帧原样桥到 webview 面板显示。S0 用完保留作 oa-chat 的桥接参考。

配置解析顺序（契约见计划 §3.4）：env → settings → S0 默认值。

打包：`npx --yes @vscode/vsce package --allow-missing-repository`
安装：`<base>/bin/<基座 server> --install-extension oa-hello-0.0.1.vsix`
