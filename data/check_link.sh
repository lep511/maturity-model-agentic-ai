#!/bin/bash

# ============================================================
# check_links.sh
# Lee el JSON generado por extract_links.sh y verifica si
# cada link responde correctamente o da error.
#
# Uso: ./check_links.sh <links.json> [output.json] [opciones]
#
# Opciones:
#   --timeout  N   Segundos de timeout por request (default: 10)
#   --retries  N   Reintentos ante fallo de red (default: 2)
#   --parallel N   Peticiones simultáneas (default: 5)
# ============================================================

set -euo pipefail

# --- Colores ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Defaults ---
INPUT_FILE="${1:-links_output.json}"
OUTPUT_FILE="${2:-links_checked.json}"
TIMEOUT=10
RETRIES=2
PARALLEL=5

# --- Parsear opciones extra ---
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout)  TIMEOUT="$2";  shift 2 ;;
    --retries)  RETRIES="$2";  shift 2 ;;
    --parallel) PARALLEL="$2"; shift 2 ;;
    *) echo "⚠️  Opción desconocida: $1" >&2; shift ;;
  esac
done

# --- Validaciones ---
if [[ ! -f "$INPUT_FILE" ]]; then
  echo -e "${RED}❌ Error: El archivo '$INPUT_FILE' no existe.${NC}" >&2
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo -e "${RED}❌ Se requiere 'curl'.${NC}" >&2; exit 1; }
command -v grep >/dev/null 2>&1 || { echo -e "${RED}❌ Se requiere 'grep'.${NC}" >&2; exit 1; }
command -v sed  >/dev/null 2>&1 || { echo -e "${RED}❌ Se requiere 'sed'.${NC}" >&2; exit 1; }

# --- Funciones de utilidad ---

# Clasifica el HTTP status code
classify_status() {
  local code="$1"
  if [[ "$code" == "000" || -z "$code" ]]; then
    echo "unreachable"
  elif (( code >= 200 && code < 300 )); then
    echo "ok"
  elif (( code >= 300 && code < 400 )); then
    echo "redirect"
  elif (( code >= 400 && code < 500 )); then
    echo "client_error"
  elif (( code >= 500 )); then
    echo "server_error"
  else
    echo "unknown"
  fi
}

# Ícono visual según status
status_icon() {
  case "$1" in
    ok)           echo "✅" ;;
    redirect)     echo "↩️ " ;;
    client_error) echo "❌" ;;
    server_error) echo "🔥" ;;
    unreachable)  echo "🚫" ;;
    *)            echo "❓" ;;
  esac
}

# Color según status
status_color() {
  case "$1" in
    ok)           echo "$GREEN" ;;
    redirect)     echo "$YELLOW" ;;
    client_error) echo "$RED" ;;
    server_error) echo "$RED" ;;
    unreachable)  echo "$RED" ;;
    *)            echo "$NC" ;;
  esac
}

# Verifica un link y escribe resultado en un archivo temporal
check_link() {
  local file_name="$1"
  local url="$2"
  local tmp_file="$3"

  local http_code
  local curl_exit=0
  local error_msg=""
  local final_url=""
  local response_time=""

  # Medir tiempo + obtener código HTTP + URL final tras redirecciones
  local start_ts end_ts
  start_ts=$(date +%s%3N 2>/dev/null || echo 0)

  http_code=$(curl \
    --silent \
    --output /dev/null \
    --write-out "%{http_code}" \
    --location \
    --max-redirs 5 \
    --connect-timeout "$TIMEOUT" \
    --max-time "$((TIMEOUT * 2))" \
    --retry "$RETRIES" \
    --retry-delay 2 \
    --user-agent "Mozilla/5.0 (LinkChecker/1.0)" \
    "$url" 2>/dev/null) || curl_exit=$?

  end_ts=$(date +%s%3N 2>/dev/null || echo 0)
  response_time=$(( end_ts - start_ts ))

  # Capturar URL final (por si hubo redirect)
  final_url=$(curl \
    --silent \
    --output /dev/null \
    --write-out "%{url_effective}" \
    --location \
    --max-redirs 5 \
    --connect-timeout "$TIMEOUT" \
    --max-time "$((TIMEOUT * 2))" \
    --user-agent "Mozilla/5.0 (LinkChecker/1.0)" \
    "$url" 2>/dev/null) || true

  if [[ $curl_exit -ne 0 || -z "$http_code" ]]; then
    http_code="000"
    error_msg="No se pudo conectar (curl exit: $curl_exit)"
  fi

  local status
  status=$(classify_status "$http_code")
  local icon
  icon=$(status_icon "$status")
  local color
  color=$(status_color "$status")

  # Escapar para JSON
  local url_esc file_esc final_esc err_esc
  url_esc=$(printf '%s'   "$url"        | sed 's/\\/\\\\/g; s/"/\\"/g')
  file_esc=$(printf '%s'  "$file_name"  | sed 's/\\/\\\\/g; s/"/\\"/g')
  final_esc=$(printf '%s' "$final_url"  | sed 's/\\/\\\\/g; s/"/\\"/g')
  err_esc=$(printf '%s'   "$error_msg"  | sed 's/\\/\\\\/g; s/"/\\"/g')

  # Escribir resultado JSON en archivo temporal
  cat > "$tmp_file" <<EOF
{
    "file_name": "$file_esc",
    "link": "$url_esc",
    "http_code": $http_code,
    "status": "$status",
    "final_url": "$final_esc",
    "response_time_ms": $response_time,
    "error": "$err_esc"
  }
EOF

  # Imprimir en consola (con lock para salida limpia en paralelo)
  {
    flock 200
    echo -e "${icon} ${color}[${http_code}]${NC} ${BOLD}${status}${NC} — ${CYAN}${url}${NC}  ${YELLOW}(${response_time}ms)${NC}"
    if [[ -n "$error_msg" ]]; then
      echo -e "   └─ ⚠️  $error_msg"
    elif [[ "$final_url" != "$url" && -n "$final_url" ]]; then
      echo -e "   └─ ↪  Redirigido a: $final_url"
    fi
  } 200>/tmp/check_links_lock
}

export -f check_link classify_status status_icon status_color
export TIMEOUT RETRIES RED GREEN YELLOW CYAN BOLD NC

# --- Extraer pares file_name + link del JSON de entrada ---
# Parseo simple sin jq: extrae valores de "file_name" y "link"
mapfile -t file_names < <(grep '"file_name"' "$INPUT_FILE" | sed 's/.*"file_name"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/')
mapfile -t links      < <(grep '"link"'      "$INPUT_FILE" | sed 's/.*"link"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/')

total=${#links[@]}

if [[ $total -eq 0 ]]; then
  echo -e "${YELLOW}⚠️  No se encontraron links en '$INPUT_FILE'.${NC}"
  echo "[]" > "$OUTPUT_FILE"
  exit 0
fi

echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  🔗 Verificador de Links${NC}"
echo -e "${BOLD}============================================${NC}"
echo -e "  📂 Entrada  : $INPUT_FILE"
echo -e "  💾 Salida   : $OUTPUT_FILE"
echo -e "  🔢 Total    : $total link(s)"
echo -e "  ⏱  Timeout  : ${TIMEOUT}s | 🔄 Reintentos: $RETRIES | ⚡ Paralelo: $PARALLEL"
echo -e "${BOLD}--------------------------------------------${NC}"

# --- Directorio temporal ---
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR" /tmp/check_links_lock' EXIT
touch /tmp/check_links_lock

# --- Ejecutar verificaciones en paralelo (semáforo manual) ---
declare -a pids=()
declare -a tmp_files=()

for (( i=0; i<total; i++ )); do
  tmp_file="$TMP_DIR/result_${i}.json"
  tmp_files+=("$tmp_file")

  check_link "${file_names[$i]:-unknown}" "${links[$i]}" "$tmp_file" &
  pids+=($!)

  # Control de paralelismo
  if (( ${#pids[@]} >= PARALLEL )); then
    wait "${pids[0]}"
    pids=("${pids[@]:1}")
  fi
done

# Esperar los restantes
for pid in "${pids[@]}"; do
  wait "$pid"
done

# --- Ensamblar JSON de salida ---
{
  echo "["
  last=$(( total - 1 ))
  for (( i=0; i<total; i++ )); do
    if [[ -f "${tmp_files[$i]}" ]]; then
      content=$(cat "${tmp_files[$i]}")
      if (( i < last )); then
        echo "  $content,"
      else
        echo "  $content"
      fi
    fi
  done
  echo "]"
} > "$OUTPUT_FILE"

# --- Resumen estadístico ---
ok_count=0; redir_count=0; err_count=0; unreach_count=0

for tmp_f in "${tmp_files[@]}"; do
  [[ -f "$tmp_f" ]] || continue
  s=$(grep '"status"' "$tmp_f" | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/')
  case "$s" in
    ok)                        ok_count=$(( ok_count + 1 ))       ;;
    redirect)                  redir_count=$(( redir_count + 1 )) ;;
    client_error|server_error) err_count=$(( err_count + 1 ))     ;;
    unreachable)               unreach_count=$(( unreach_count + 1 )) ;;
  esac
done

echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  📊 Resumen${NC}"
echo -e "${BOLD}--------------------------------------------${NC}"
echo -e "  ${GREEN}✅ OK (2xx)       : $ok_count${NC}"
echo -e "  ${YELLOW}↩️  Redirect (3xx) : $redir_count${NC}"
echo -e "  ${RED}❌ Error (4xx/5xx): $err_count${NC}"
echo -e "  ${RED}🚫 Sin conexión   : $unreach_count${NC}"
echo -e "  Total            : $total"
echo -e "${BOLD}============================================${NC}"
echo -e "📄 Resultado guardado en: ${CYAN}$OUTPUT_FILE${NC}"