#!/bin/sh
# Publish web/ to the gh-pages branch (no Actions runners needed).
# Usage: ./scripts/publish-pages.sh
set -e
ROOT=$(git rev-parse --show-toplevel)
TMP=$(mktemp -d)
git --work-tree="$TMP" checkout main -- web
cp "$TMP"/web/index.html "$TMP"/web/styles.css "$TMP"/web/app.js "$TMP"/web/backend.js "$ROOT/../__pages_tmp/" 2>/dev/null || true
rm -rf "$TMP"
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
