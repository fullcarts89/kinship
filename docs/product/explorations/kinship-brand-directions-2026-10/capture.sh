#!/bin/zsh
# Stills for review (never a substitute for the interactive prototypes). Usage: ./capture.sh out.png "query" [w h] [page]
# Needs Google Chrome and the static server on :8093 (python3 -m http.server 8093 --directory docs/product/explorations).
OUT=$1; Q=$2; W=${3:-393}; H=${4:-852}; PAGE=${5:-prototype.html}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for i in 1 2 3; do
  "$CHROME" --headless=new --user-data-dir=/tmp/kb-profile-$$-$i --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=$W,$H --virtual-time-budget=9000 --run-all-compositor-stages-before-draw --screenshot="$OUT" "http://localhost:8093/kinship-brand-directions-2026-10/$PAGE?capture=1&$Q" >/dev/null 2>&1
  rm -rf /tmp/kb-profile-$$-$i
  [ -s "$OUT" ] && [ $(stat -f%z "$OUT") -gt 20000 ] && exit 0
done
echo "capture failed: $OUT" >&2
