#!/bin/bash
# kids-learn 를 GitHub Pages(gh-pages 브랜치)로 배포.
#   npm run deploy
# 정적 빌드 → out/ 를 gh-pages 로 강제 푸시. (gh CLI 로그인 필요)
set -e
cd "$(dirname "$0")/.."

REPO="https://github.com/kimthegooner/kids-learn.git"

echo "▶ building (basePath=/kids-learn)…"
rm -rf out
NEXT_PUBLIC_BASE_PATH=/kids-learn npm run build

echo "▶ pushing to gh-pages…"
cd out
touch .nojekyll
git init -b gh-pages -q
git add -A
git -c user.email="deploy@local" -c user.name="deploy" commit -q -m "deploy $(date +%Y-%m-%d)"
git push -f -q "$REPO" gh-pages

echo "✓ deployed → https://kimthegooner.github.io/kids-learn/"
