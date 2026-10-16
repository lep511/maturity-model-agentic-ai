#!/bin/bash
# ============================================================
# extract_link.sh
# Scans JSON, JSONL and Markdown files in a directory and extracts
# every link that points to the Agentic AI Lens documentation,
# writing a JSON array of {"file_name", "link"} objects.
# Duplicate (file, link) pairs are emitted once.
#
# Usage: ./extract_link.sh <directory> [output.json]
# ============================================================
set -euo pipefail

# --- Arguments ---
DIRECTORY="${1:-.}"
OUTPUT_FILE="${2:-links_output.json}"

# --- Prefix filter: only links into the Lens documentation are checked ---
readonly URL_PREFIX="https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens"

# --- Validations ---
if [[ ! -d "$DIRECTORY" ]]; then
  echo "❌ Error: Directory '$DIRECTORY' does not exist." >&2
  exit 1
fi
command -v grep  >/dev/null 2>&1 || { echo "❌ 'grep' is required."  >&2; exit 1; }
command -v sed   >/dev/null 2>&1 || { echo "❌ 'sed' is required."   >&2; exit 1; }

# --- Processing ---
echo "🔍 Scanning JSON and Markdown files in: $DIRECTORY"
echo "🎯 Keeping links that start with: $URL_PREFIX"

# Pattern that captures:
#   1. URLs inside href='...' or href="..."
#   2. Markdown link targets (...)
#   3. Bare URLs starting with http:// or https://
URL_PATTERN='href=["'"'"'][^"'"'"']*["'"'"']|https?://[^"'"'"' \t\n<>)\\]+'

results=()            # JSON objects, in discovery order
declare -A seen=()    # "file|link" -> 1, for de-duplication

while IFS= read -r -d '' src_file; do
  filename=$(realpath --relative-to="$PWD" "$src_file" 2>/dev/null || echo "$src_file")

  while IFS= read -r match; do
    # For href="..." / href='...' keep only the URL
    if [[ "$match" == href=* ]]; then
      url=$(echo "$match" | sed -E "s/href=[\"']([^\"']+)[\"']/\1/")
    else
      url="$match"
    fi

    # Strip trailing punctuation that often follows a URL in prose
    url="${url%%[\'\".,;:]}"

    # Keep only URLs with the desired prefix
    [[ "$url" == "${URL_PREFIX}"* ]] || continue

    key="${filename}|${url}"
    [[ -n "${seen[$key]:-}" ]] && continue
    seen[$key]=1

    url_escaped=$(printf '%s' "$url" | sed 's/\\/\\\\/g; s/"/\\"/g')
    file_escaped=$(printf '%s' "$filename" | sed 's/\\/\\\\/g; s/"/\\"/g')
    results+=("  {\"file_name\": \"$file_escaped\", \"link\": \"$url_escaped\"}")
  done < <(grep -oE "$URL_PATTERN" "$src_file" 2>/dev/null || true)

done < <(find "$DIRECTORY" -maxdepth 5 -type f \( -name "*.json" -o -name "*.jsonl" -o -name "*.md" \) \
  -not -path "*/.git/*" -not -path "*/.cache/*" -not -path "*/node_modules/*" \
  -not -name "links_output.json" -not -name "links_checked.json" -print0 | sort -z)

# --- Write output ---
if [[ ${#results[@]} -eq 0 ]]; then
  echo "⚠️  No links with prefix '$URL_PREFIX' found in '$DIRECTORY'."
  echo "[]" > "$OUTPUT_FILE"
else
  {
    echo "["
    for i in "${!results[@]}"; do
      if (( i < ${#results[@]} - 1 )); then
        echo "${results[$i]},"
      else
        echo "${results[$i]}"
      fi
    done
    echo "]"
  } > "$OUTPUT_FILE"
  echo "✅ Extracted ${#results[@]} unique link(s) with prefix '$URL_PREFIX'."
fi

echo "📄 Output saved to: $OUTPUT_FILE"
