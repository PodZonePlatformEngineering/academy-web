#!/bin/sh
# Secrets gate — architecture v2 §5 (no credentials in the public bundle).
#
# Ported verbatim from the GitHub Pages workflow's post-build grep so the
# Cloudflare Pages build keeps the identical guarantee. Cloudflare Pages has
# no separate post-build step, so `build:cf` runs the build and then this
# script. It scans dist/ recursively, which covers the CF-nested layout
# (dist/academy-web/) as well as the flat GitHub Pages layout (dist/).
#
# client_secret must only trip on an assigned string literal (a real leak):
# the bundled Stack SDK legitimately carries the bare token as an OAuth
# parameter name with runtime values.
set -eu

DIR="${1:-dist}"

PATTERNS="postgres(ql)?://|ep-[a-z0-9-]+\.[a-z]{2}-[a-z]+-[0-9]+\.aws\.neon\.tech|AKIA[0-9A-Z]{16}|-----BEGIN|ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|github_pat_|\bsk-[A-Za-z0-9_-]{24}|\bssk_|eyJhbGciOi|client_secret[\"']?[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9_-]{8}|GOCSPX-"

if grep -rInE "$PATTERNS" "$DIR"; then
  echo "Secret-like pattern found in built bundle — §5 violation, refusing to deploy" >&2
  exit 1
fi
echo "Bundle clean."
