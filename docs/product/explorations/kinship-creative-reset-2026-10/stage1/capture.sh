#!/bin/zsh
# Stage 1 stills. Usage: ./capture.sh out.png "dir=a&screen=today&photo=1" [w h scale]
# Needs Google Chrome and a static server on :8094 serving the explorations folder.
OUT=$1; Q=$2; W=${3:-393}; H=${4:-852}; SC=${5:-3}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for i in 1 2 3; do
  "$CHROME" --headless=new --user-data-dir=/tmp/ks1-profile-$$-$i --disable-gpu --hide-scrollbars --force-device-scale-factor=$SC --window-size=$W,$H --virtual-time-budget=12000 --run-all-compositor-stages-before-draw --screenshot="$OUT" "http://localhost:8094/kinship-creative-reset-2026-10/stage1/compose.html?$Q" >/dev/null 2>&1
  rm -rf /tmp/ks1-profile-$$-$i
  if [ -s "$OUT" ]; then PX=$((W*H*SC*SC*4)); SZ=$(stat -f%z "$OUT"); [ $((SZ*1000/PX)) -gt 30 ] && exit 0; fi
done
echo "capture failed: $OUT" >&2
