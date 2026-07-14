#!/usr/bin/env bash
# 一键部署到GitHub Pages。
# 注意：next build会清空out/（包括out/.git），所以每次部署都在out/里重新init一个临时git仓库再强推。
# 用法：bash scripts/deploy-pages.sh
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build:pages
cd out
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push -f https://github.com/liudan-29/shared-checkin.git gh-pages
echo "部署完成: https://liudan-29.github.io/shared-checkin/"
