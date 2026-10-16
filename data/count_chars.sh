#!/bin/bash
# ============================================================
# count_chars.sh
# Counts characters (including spaces) in each JSON/JSONL file
# inside a directory. If a file exceeds 2500 characters, it is
# saved to an output JSON with "file_name" and "count" fields.
# The lens metadata files under data/lens/ are legitimately
# large and are skipped.
#
# Usage: ./count_chars.sh <directory> [output.json] [--threshold N]
# ============================================================

set -euo pipefail

# --- Arguments ---
DIRECTORY="${1:-.}"
OUTPUT_FILE="${2:-large_files.json}"
THRESHOLD=2500

# --- Extra options ---
shift $(( $# >= 2 ? 2 : $# ))
while [[ $# -gt 0 ]]; do
  case "$1" in
    --threshold) THRESHOLD="$2"; shift 2 ;;
    *) echo "⚠️  Unknown option: $1" >&2; shift ;;
  esac
done

# --- Validations ---
if [[ ! -d "$DIRECTORY" ]]; then
  echo "❌ Error: Directory '$DIRECTORY' does not exist." >&2
  exit 1
fi

# --- Processing ---
echo "🔍 Scanning JSON files in: $DIRECTORY"
echo "📏 Threshold: $THRESHOLD characters"

results=()

while IFS= read -r -d '' json_file; do
  # Show relative path from data/ onwards instead of full absolute path
  filename=$(realpath "$json_file" | sed 's|.*/data/|data/|')

  # Count characters including spaces (wc -m handles multibyte/UTF-8 correctly)
  char_count=$(wc -m < "$json_file")

  # Remove leading whitespace that wc may add
  char_count="${char_count// /}"

  if (( char_count > THRESHOLD )); then
    echo "  ⚠️  $filename → $char_count chars (exceeds $THRESHOLD)"

    # Escape special characters for valid JSON
    file_escaped=$(printf '%s' "$filename" | sed 's/\\/\\\\/g; s/"/\\"/g')
    results+=("  {\"file_name\": \"$file_escaped\", \"count\": $char_count}")
  else
    echo "  ✅ $filename → $char_count chars (OK)"
  fi

done < <(find "$DIRECTORY" -maxdepth 5 -type f \( -name "*.json" -o -name "*.jsonl" \) \
  -not -name "manifest.json" -not -path "*data/lens/*" -not -path "*/.cache/*" \
  -not -path "*/.git/*" -not -path "*/node_modules/*" -print0)

# --- Write output ---
if [[ ${#results[@]} -eq 0 ]]; then
  echo ""
  echo "✅ No files exceeded the $THRESHOLD character threshold."
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

  echo ""
  echo "📄 Output saved to: $OUTPUT_FILE"

  # Fail the workflow if any files exceeded the threshold
  # exit 1 causes GitHub Actions to mark the step as failed (red ❌)
  echo "❌ ${#results[@]} file(s) exceeded the $THRESHOLD character threshold." >&2
  exit 1
fi

echo "📄 Output saved to: $OUTPUT_FILE"