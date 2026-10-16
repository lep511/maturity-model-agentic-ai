#!/bin/bash
# ============================================================
# extract_links.sh
# Escanea archivos JSON en un directorio y extrae todos los
# links (URLs), generando un JSON de salida con nombre de
# archivo y link encontrado.
# 
# Uso: ./extract_links.sh <directorio> [archivo_salida.json]
# ============================================================
set -euo pipefail

# --- Argumentos ---
DIRECTORY="${1:-.}"
OUTPUT_FILE="${2:-links_output.json}"

# --- Filtro de prefijo ---
readonly URL_PREFIX="https://maturitymodel.security.aws.dev"

# --- Validaciones ---
if [[ ! -d "$DIRECTORY" ]]; then
  echo "❌ Error: El directorio '$DIRECTORY' no existe." >&2
  exit 1
fi
command -v grep  >/dev/null 2>&1 || { echo "❌ Se requiere 'grep'."  >&2; exit 1; }
command -v sed   >/dev/null 2>&1 || { echo "❌ Se requiere 'sed'."   >&2; exit 1; }

# --- Procesamiento ---
echo "🔍 Escaneando archivos JSON en: $DIRECTORY"
echo "🎯 Filtrando links que empiecen con: $URL_PREFIX"

# Patrón que captura:
#   1. URLs dentro de href='...' o href="..."
#   2. URLs planas que empiecen con http:// o https://
URL_PATTERN='href=["'"'"'][^"'"'"']*["'"'"']|https?://[^"'"'"' \t\n<>)\\]+'

results=()   # array de objetos JSON

while IFS= read -r -d '' json_file; do
  filename=$(realpath "$json_file" | sed 's|.*/data/|data/|')

  # Extrae todas las coincidencias línea a línea
  while IFS= read -r match; do
    # Si el match es un href="..." o href='...' extraemos solo la URL
    if [[ "$match" == href=* ]]; then
      url=$(echo "$match" | sed -E "s/href=[\"']([^\"']+)[\"']/\1/")
    else
      url="$match"
    fi

    # ✅ Filtrar: solo URLs que empiecen con el prefijo deseado
    [[ "$url" == "${URL_PREFIX}"* ]] || continue

    # Escapar caracteres especiales para JSON
    url_escaped=$(printf '%s' "$url" | sed 's/\\/\\\\/g; s/"/\\"/g')
    file_escaped=$(printf '%s' "$filename" | sed 's/\\/\\\\/g; s/"/\\"/g')

    results+=("  {\"file_name\": \"$file_escaped\", \"link\": \"$url_escaped\"}")
  done < <(grep -oE "$URL_PATTERN" "$json_file" 2>/dev/null || true)

done < <(find "$DIRECTORY" -maxdepth 5 -type f \( -name "*.json" -o -name "*.jsonl" \) -print0)

# --- Escribir salida ---
if [[ ${#results[@]} -eq 0 ]]; then
  echo "⚠️  No se encontraron links con prefijo '$URL_PREFIX' en '$DIRECTORY'."
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
  echo "✅ Se extrajeron ${#results[@]} link(s) con prefijo '$URL_PREFIX'."
fi

echo "📄 Resultado guardado en: $OUTPUT_FILE"