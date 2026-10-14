#!/bin/zsh
# Asks for an Anthropic key without showing it, and saves it for the acceptance harness's live-model runs to
# supabase/functions/.env.local (gitignored; readable only by you). Run it in a real terminal:
#   zsh e2e/set-model-key.sh
f="${0:A:h}/../supabase/functions/.env.local"
read -rs "K?Anthropic key (paste, then Return; nothing will show): "
echo
if [ -z "$K" ]; then
  echo "Nothing saved."
  exit 1
fi
printf 'ANTHROPIC_API_KEY=%s\n' "$K" > "$f" && chmod 600 "$f" && echo "Saved to supabase/functions/.env.local"
unset K
