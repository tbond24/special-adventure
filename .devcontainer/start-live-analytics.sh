#!/usr/bin/env bash
# Manual opt-in only. Never called by the synthetic-preview lifecycle hooks.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec 9>/tmp/vacancy-live-analytics-8780.lock
flock -x 9
ready(){ curl --max-time 1 -fsSI http://127.0.0.1:8780/ 2>/dev/null | tr -d '\r' | rg -qi '^X-Vacancy-Analytics-Viewer: production-read-only$'; }
if ready; then exit 0;fi
nohup setsid node scripts/live-analytics-server.mjs --live-production --codespaces >>/tmp/vacancy-live-analytics-8780.log 2>&1 < /dev/null 9>&- &
viewer_pid=$!
for attempt in {1..30};do
 if ready;then printf 'Live analytics ready: http://localhost:8780/ (keep port private)\n';exit 0;fi
 if ! kill -0 "$viewer_pid" 2>/dev/null;then wait "$viewer_pid" || true;printf 'Live viewer did not start; existing processes preserved.\n' >&2;exit 1;fi
 sleep 0.2
done
printf 'Live viewer readiness failed.\n' >&2
exit 1
