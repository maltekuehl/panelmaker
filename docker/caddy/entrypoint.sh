#!/bin/sh
# Writes the generated Caddyfile snippets from env vars, then starts Caddy.
#
#   both BASIC_AUTH_USER and BASIC_AUTH_PASSWORD set  -> gate on, /api/health stays open
#   neither set                                       -> gate off (the default)
#   only one set                                      -> refuse to start
set -e

generated="/etc/caddy/generated"
mkdir -p "$generated"

if [ -n "${ACME_EMAIL:-}" ]; then
  printf 'email %s\n' "$ACME_EMAIL" > "$generated/global.caddy"
else
  echo "# no ACME_EMAIL" > "$generated/global.caddy"
fi

user="${BASIC_AUTH_USER:-}"
password="${BASIC_AUTH_PASSWORD:-}"

if [ -z "$user" ] && [ -z "$password" ]; then
  echo "# basic auth off" > "$generated/basic-auth.caddy"
  echo "basic-auth: gate off (set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD to enable)"
elif [ -z "$user" ] || [ -z "$password" ]; then
  echo "basic-auth: set both BASIC_AUTH_USER and BASIC_AUTH_PASSWORD, or neither" >&2
  exit 1
else
  case "$user" in
    *[!A-Za-z0-9._-]*)
      echo "basic-auth: BASIC_AUTH_USER may only contain letters, digits, '.', '_' and '-'" >&2
      exit 1
      ;;
  esac
  hash="$(caddy hash-password --plaintext "$password")"
  cat > "$generated/basic-auth.caddy" <<CADDY
@gated not path /api/health
basic_auth @gated {
	$user $hash
}
CADDY
  echo "basic-auth: gate on for user '$user'"
fi

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
