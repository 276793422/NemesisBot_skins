#!/usr/bin/env bash
# 构建 openlikebuddy 皮肤 → dist/openlikebuddy.nbskin（单文件 ZIP，nbskin v1）
# 两步：1) ui-src 里 npm install/build（Vue 应用 → 皮肤包 app/）
#       2) pack.mjs 打包（零依赖 Node 手写 ZIP，三平台行为一致——tar/zip CLI
#          各平台方言差异大，见 pack.mjs 头注）。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_SRC="$SCRIPT_DIR/../ui-src"

if [ ! -d "$UI_SRC/node_modules" ]; then
  echo "[build] npm install in ui-src ..."
  (cd "$UI_SRC" && npm install)
fi

echo "[build] npm run build in ui-src ..."
(cd "$UI_SRC" && npm run build)

node "$SCRIPT_DIR/pack.mjs"
