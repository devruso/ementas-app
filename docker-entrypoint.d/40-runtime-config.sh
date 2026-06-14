#!/bin/sh
set -eu

runtime_api_url="${VITE_API_URL:-${API_URL:-}}"

if [ -n "$runtime_api_url" ]; then
cat <<EOF >/usr/share/nginx/html/runtime-config.js
window.__EMENTAS_RUNTIME_CONFIG__ = Object.freeze({
  apiUrl: "$runtime_api_url"
});
EOF
else
cat <<'EOF' >/usr/share/nginx/html/runtime-config.js
window.__EMENTAS_RUNTIME_CONFIG__ = Object.freeze({});
EOF
fi