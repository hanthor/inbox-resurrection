#!/bin/sh
# Re-fetch press reference screenshots (reference only, do not redistribute).
# Usage: ./fetch.sh   (downloads into screenshots/press/)
set -e
mkdir -p "$(dirname "$0")/press"
cd "$(dirname "$0")/press"
while IFS='|' read -r name url; do
  case "$url" in *.png*|*.jpg*|*.jpeg*|*.webp*|*.gif*) ;; *) continue;; esac
  ext=$(printf '%s' "$url" | sed 's/.*\.//;s/?.*//' | cut -c1-4)
  out="$name.$ext"
  if [ -f "$out" ]; then echo "skip $out"; continue; fi
  curl -sL --max-time 60 -o "$out" "$url" && echo "got $out"
done < ../urls.txt
