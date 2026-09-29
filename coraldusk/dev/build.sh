#!/usr/bin/env bash
# 打包 coraldusk 皮肤 → dist/coraldusk.nbskin
set -e
cd "$(dirname "$0")"
node pack.mjs
