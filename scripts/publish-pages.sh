#!/bin/sh
# Publish web/ to the gh-pages branch (no Actions runners needed).
# Usage: ./scripts/publish-pages.sh
set -e
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
git checkout --orphan __pages_tmp 2>/dev/null || git checkout __pages_tmp
git rm -rf -q .
git checkout main -- web
cp web/index.html web/styles.css web/app.js web/backend.js .
touch .nojekyll
git add index.html styles.css app.js backend.js .nojekyll
git commit -q -m "Publish web app to GitHub Pages"
git branch -f gh-pages __pages_tmp
git push origin gh-pages
git checkout -q main
rm -f index.html styles.css app.js backend.js .nojekyll
echo published
