#!/bin/sh
# Writes the optional HTTP basic auth gate for the reverse proxy from env vars.
# Runs via nginx's /docker-entrypoint.d/ hook before the server starts, and
# always writes /etc/nginx/basic-auth.conf, which nginx.conf includes.
#
#   both BASIC_AUTH_USER and BASIC_AUTH_PASSWORD set  -> gate on
#   neither set                                       -> gate off (the default)
#   only one set                                      -> refuse to start
#
# The nginx:alpine image ships neither `htpasswd` (apache2-utils) nor the
# openssl CLI, so we use nginx's RFC 2307 {PLAIN} scheme, which needs no
# hashing tool. The password lives plaintext inside the container only; it is
# only ever the gate credential, never a user account secret.
set -e

conf_file="/etc/nginx/basic-auth.conf"
htpasswd_file="/etc/nginx/.htpasswd"
user="${BASIC_AUTH_USER:-}"
password="${BASIC_AUTH_PASSWORD:-}"

if [ -z "$user" ] && [ -z "$password" ]; then
  rm -f "$htpasswd_file"
  echo "auth_basic off;" > "$conf_file"
  echo "basic-auth: gate off (set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD to enable)"
  exit 0
fi

if [ -z "$user" ] || [ -z "$password" ]; then
  echo "basic-auth: set both BASIC_AUTH_USER and BASIC_AUTH_PASSWORD, or neither" >&2
  exit 1
fi

printf '%s:{PLAIN}%s\n' "$user" "$password" > "$htpasswd_file"
# nginx worker processes drop to the unprivileged `nginx` user and must be
# able to read this file at the access phase, so it cannot be root-only (0600).
chmod 644 "$htpasswd_file"
printf 'auth_basic "PanelMaker";\nauth_basic_user_file %s;\n' "$htpasswd_file" > "$conf_file"

echo "basic-auth: gate on for user '$user'"
