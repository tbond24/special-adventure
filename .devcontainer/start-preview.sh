#!/usr/bin/env bash
# Codespaces lifecycle hook. Start only the isolated development server.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

port="${VACANCY_DEV_PORT:-8776}"
if [[ ! "$port" =~ ^[0-9]{1,5}$ ]]; then
  printf 'Invalid VACANCY_DEV_PORT\n' >&2
  exit 1
fi
port=$((10#$port))
if (( port < 1 || port > 65535 )); then
  printf 'Invalid VACANCY_DEV_PORT\n' >&2
  exit 1
fi

# Opening another editor can overlap container startup. Serialize both hooks.
exec 9>"/tmp/vacancy-preview-${port}.lock"
flock -x 9
ready() {
  curl --max-time 1 -fsSI "http://127.0.0.1:${port}/" 2>/dev/null |
    tr -d '\r' | grep -qi '^X-Vacancy-Preview-Isolated: synthetic-no-hosted-backend$'
}
if ready; then
  printf 'Vacancy preview already ready on port %s.\n' "$port"
  exit 0
fi

log="/tmp/vacancy-preview-${port}.log"
# Close the lock descriptor in the child so later attachments do not hang.
nohup env VACANCY_DEV_HOST="${VACANCY_DEV_HOST:-0.0.0.0}" VACANCY_DEV_PORT="$port" \
  node scripts/dev-server.mjs >>"$log" 2>&1 < /dev/null 9>&- &
preview_pid=$!
for attempt in {1..30}; do
  if ready; then
    printf 'Vacancy preview ready: http://localhost:%s/\n' "$port"
    exit 0
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    wait "$preview_pid" || true
    printf 'Preview could not start; inspect %s. Existing processes were preserved.\n' "$log" >&2
    exit 1
  fi
  sleep 0.2
done
printf 'Preview is not ready; inspect %s.\n' "$log" >&2
exit 1
