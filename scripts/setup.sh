#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

node -e 'if (Number(process.versions.node.split(".")[0]) < 24) { console.error("Node.js 24 veya üzeri gerekli."); process.exit(1); }'
export npm_config_cache=/workspace/.cache/npm
export UV_CACHE_DIR=/workspace/.cache/uv
export UV_TOOL_DIR=/workspace/.tools/uv
export UV_TOOL_BIN_DIR=/workspace/.tools/bin
export PATH="/workspace/.tools/bin:$PATH"

npm ci --no-audit --no-fund
uv tool install 'graphifyy==0.9.92' --no-progress
npm run skills:verify
npm test
npm run build
npm run test:cloud
npm run test:deploy
npm run graph

if command -v chromium >/dev/null 2>&1; then
  CHROMIUM_EXECUTABLE="$(command -v chromium)" npm run test:e2e
  CHROMIUM_EXECUTABLE="$(command -v chromium)" npm run test:e2e:cloud
else
  printf '%s\n' 'Tarayıcı kontrolleri çalışmadı: Chromium gerekli. Sunucu testleri ve derleme tamamlandı.' >&2
  exit 1
fi
