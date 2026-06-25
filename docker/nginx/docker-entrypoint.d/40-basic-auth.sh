#!/bin/sh
# Generate the HTTP basic-auth user file for the reverse proxy from env vars.
# Runs via nginx's /docker-entrypoint.d/ hook before the server starts.
#
# The nginx:alpine image ships neither `htpasswd` (apache2-utils) nor the
# openssl CLI, so we use nginx's RFC 2307 {PLAIN} scheme, which needs no
# hashing tool. The password lives plaintext inside the container only; it is
# only ever the gate credential, never a user account secret.
set -e

BASIC_AUTH_USER="${BASIC_AUTH_USER:-panelmaker}"
BASIC_AUTH_PASSWORD="${BASIC_AUTH_PASSWORD:-panelmaker}"

htpasswd_file="/etc/nginx/.htpasswd"
printf '%s:{PLAIN}%s\n' "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD" > "$htpasswd_file"
# nginx worker processes drop to the unprivileged `nginx` user and must be
# able to read this file at the access phase, so it cannot be root-only (0600).
chmod 644 "$htpasswd_file"

echo "basic-auth: wrote $htpasswd_file for user '$BASIC_AUTH_USER'"
