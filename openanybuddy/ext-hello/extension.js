//! extension.js — S0 hello-webview validation pillar.
//!
//! Proves the OpenAnyBuddy chain end to end:
//!   IDE 基座 server (base) -> extension host (this file, Node) -> WebSocket
//!   -> NemesisBot gateway WSAPI (chat.send) -> reply frames -> webview panel.
//!
//! Config resolution follows the frozen integration contract (plan §3.4):
//!   env NEMESISBOT_IDE_GATEWAY_URL / NEMESISBOT_IDE_GATEWAY_TOKEN
//!   > settings openanybuddy.gatewayUrl / openanybuddy.gatewayToken
//!   > (S0 only) defaults below; the real oa-chat shows a guided empty state.

'use strict';

const vscode = require('vscode');
const WebSocket = require('ws');

// S0 dev defaults (scratch gateway started by skins/openanybuddy/dev tooling).
const S0_DEFAULT_URL = 'ws://172.23.112.1:49080';
const S0_DEFAULT_TOKEN = 's0-dev-token';

/** @type {WebSocket|null} */
let ws = null;
/** @type {vscode.WebviewPanel|null} */
let panel = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let connDesc = '';

function log(...args) {
    console.log('[oa-hello]', ...args);
}

function resolveConn() {
    const envUrl = process.env.NEMESISBOT_IDE_GATEWAY_URL;
    const envTok = process.env.NEMESISBOT_IDE_GATEWAY_TOKEN;
    const cfg = vscode.workspace.getConfiguration('openanybuddy');
    const url = envUrl || cfg.get('gatewayUrl') || S0_DEFAULT_URL;
    const token = envTok || cfg.get('gatewayToken') || S0_DEFAULT_TOKEN;
    const source = envUrl || envTok ? 'env' : cfg.get('gatewayUrl') ? 'settings' : 's0-default';
    // base form: ws://host:port  ->  ws://host:port/ws?token=...
    const full = url.replace(/\/+$/, '') + '/ws' + (token ? '?token=' + encodeURIComponent(token) : '');
    return { full, source };
}

function sendFrame(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const text = JSON.stringify(obj);
        ws.send(text);
        postToPanel({ kind: 'frame', dir: 'out', text });
        log('>>', text);
    }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        sendFrame({
            type: 'system', module: 'heartbeat', cmd: 'ping',
            data: {}, timestamp: new Date().toISOString(),
        });
    }, 25000);
}

function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, 3000);
}

function connect() {
    const { full, source } = resolveConn();
    connDesc = `${full}  (source: ${source})`;
    setStatus('connecting');
    log('connecting to', connDesc);
    try { if (ws) { ws.removeAllListeners(); ws.close(); } } catch (_) { /* noop */ }

    ws = new WebSocket(full);
    ws.on('open', () => {
        log('connected');
        setStatus('connected');
        startHeartbeat();
    });
    ws.on('message', (data) => {
        const text = data.toString();
        log('<<', text);
        postToPanel({ kind: 'frame', dir: 'in', text });
    });
    ws.on('close', (code) => {
        log('closed', code);
        stopHeartbeat();
        setStatus('disconnected');
        if (panel) scheduleReconnect();
    });
    ws.on('error', (err) => {
        log('error:', err.message);
        postToPanel({ kind: 'frame', dir: 'in', text: '[ws error] ' + err.message });
    });
}

function setStatus(value) {
    postToPanel({ kind: 'status', value, url: connDesc });
}

function postToPanel(msg) {
    if (panel) { panel.webview.postMessage(msg); }
}

function getHtml(webview) {
    const nonce = String(Math.random()).slice(2);
    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
         padding: 10px; font-size: 13px; }
  .row { display: flex; gap: 6px; margin: 8px 0; }
  input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border); padding: 5px 8px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground);
           border: none; padding: 5px 12px; cursor: pointer; }
  #dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%;
         background: var(--vscode-charts-red); margin-right: 5px; }
  .ok   #dot { background: var(--vscode-charts-green); }
  .wait #dot { background: var(--vscode-charts-yellow); }
  #log { white-space: pre-wrap; background: var(--vscode-editor-background);
         border: 1px solid var(--vscode-panel-border); padding: 8px; margin-top: 8px;
         min-height: 200px; max-height: 400px; overflow-y: auto; font-family: monospace; }
  .in  { color: var(--vscode-charts-blue); }
  .out { color: var(--vscode-charts-orange); }
  #url { color: var(--vscode-descriptionForeground); word-break: break-all; }
</style>
</head>
<body class="wait">
  <h3 style="margin:0 0 4px 0;">OpenAnyBuddy S0 · gateway bridge</h3>
  <div><span id="dot"></span><span id="st">connecting…</span></div>
  <div id="url"></div>
  <div class="row">
    <input id="msg" placeholder="发给 gateway 的消息（chat.send）…">
    <button id="send">发送</button>
    <button id="reconn">重连</button>
  </div>
  <div id="log"></div>
<script nonce="${nonce}">
  const vsapi = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  function append(dir, text) {
    const d = document.createElement('div');
    d.className = dir === 'in' ? 'in' : 'out';
    d.textContent = (dir === 'in' ? '<< ' : '>> ') + text;
    $('log').appendChild(d);
    $('log').scrollTop = $('log').scrollHeight;
  }
  $('send').onclick = () => {
    const v = $('msg').value.trim();
    if (!v) return;
    vsapi.postMessage({ cmd: 'send', content: v });
    $('msg').value = '';
  };
  $('msg').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('send').onclick(); });
  $('reconn').onclick = () => vsapi.postMessage({ cmd: 'reconnect' });
  window.addEventListener('message', (ev) => {
    const m = ev.data;
    if (m.kind === 'status') {
      $('st').textContent = m.value + (m.url ? ' · ' + m.url : '');
      document.body.className = m.value === 'connected' ? 'ok' : m.value === 'connecting' ? 'wait' : '';
    } else if (m.kind === 'frame') {
      append(m.dir, m.text);
    }
  });
</script>
</body>
</html>`;
}

function openPanel() {
    if (panel) { panel.reveal(); return; }
    panel = vscode.window.createWebviewPanel(
        'oaHello', 'OpenAnyBuddy S0 Bridge',
        vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.webview.html = getHtml(panel.webview);
    panel.webview.onDidReceiveMessage((m) => {
        if (m.cmd === 'send') {
            sendFrame({ type: 'message', module: 'chat', cmd: 'send', data: { content: m.content } });
        } else if (m.cmd === 'reconnect') {
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            connect();
        }
    });
    panel.onDidDispose(() => { panel = null; }, null);
}

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('oaHello.open', openPanel)
    );
    log('activating — auto-connect per plan §3.4 contract');
    connect();
    openPanel(); // S0: auto-open for hands-free validation
}

function deactivate() {
    stopHeartbeat();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try { if (ws) ws.close(); } catch (_) { /* noop */ }
}

module.exports = { activate, deactivate };
