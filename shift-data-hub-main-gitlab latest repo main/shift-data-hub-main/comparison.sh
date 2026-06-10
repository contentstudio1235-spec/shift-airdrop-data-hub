#!/bin/bash

GITLAB_REPO="shift-data-hub-main-gitlab latest repo main"

echo "════════════════════════════════════════════════════════════════"
echo "COMPARING CURRENT vs GITLAB REPO"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Key source files
files=(
  "src/index.ts"
  "src/services/heliusWebhookHandler.ts"
  "src/services/xpEngine.ts"
  "src/db/pool.ts"
  "frontend/lib/api.ts"
  "package.json"
)

for file in "${files[@]}"; do
  current_path="$file"
  gitlab_path="$GITLAB_REPO/$file"
  
  if [ -f "$current_path" ] && [ -f "$gitlab_path" ]; then
    current_size=$(stat -f%z "$current_path" 2>/dev/null || stat -c%s "$current_path" 2>/dev/null)
    gitlab_size=$(stat -f%z "$gitlab_path" 2>/dev/null || stat -c%s "$gitlab_path" 2>/dev/null)
    
    if cmp -s "$current_path" "$gitlab_path"; then
      echo "✅ $file - IDENTICAL"
    else
      diff_lines=$(diff "$current_path" "$gitlab_path" 2>/dev/null | wc -l)
      echo "⚠️  $file - DIFFERENT"
      echo "   Current: $current_size bytes | GitLab: $gitlab_size bytes | Diff lines: $diff_lines"
    fi
  else
    echo "❌ $file - NOT FOUND in one repo"
  fi
  echo ""
done

# Compare migrations
echo "════════════════════════════════════════════════════════════════"
echo "DATABASE MIGRATIONS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Current migrations:"
ls -1 src/db/migrations/ | grep -E "^\d{3}_"
echo ""
echo "GitLab migrations:"
ls -1 "$GITLAB_REPO/src/db/migrations/" | grep -E "^\d{3}_"
