#!/bin/zsh
# Stills (review fallback only). Usage: ./capture.sh out.png "query" [w h]. Needs Google Chrome and a static server on :8093.
OUT=$1; Q=$2; W=${3:-393}; H=${4:-852}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for i in 1 2 3; do
  "$CHROME" --headless=new --user-data-dir=/tmp/kcr-profile-$$-$i --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=$W,$H --virtual-time-budget=9000 --run-all-compositor-stages-before-draw --screenshot="$OUT" "http://localhost:8093/kinship-creative-reset-2026-10/gallery.html?capture=1&$Q" >/dev/null 2>&1
  rm -rf /tmp/kcr-profile-$$-$i
  [ -s "$OUT" ] && [ $(stat -f%z "$OUT") -gt 20000 ] && exit 0
done
echo "capture failed: $OUT" >&2
