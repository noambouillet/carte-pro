#!/usr/bin/env bash

set -euo pipefail

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is not installed."
  echo "Install it from https://mkcert.dev/ and run this script again."
  exit 1
fi

mkdir -p "$CERT_DIR"

if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
  echo "Certificates already exist in $CERT_DIR."
  exit 0
fi

mkcert -install

if [[ -n "${CI:-}" ]]; then
  LAN_IP="127.0.0.1"
else
  if command -v ipconfig >/dev/null 2>&1; then
    LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  elif command -v hostname >/dev/null 2>&1; then
    LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  else
    LAN_IP=""
  fi

  if [[ -z "${LAN_IP:-}" ]]; then
    read -r -p "Enter your LAN IP address: " LAN_IP
  fi
fi

if [[ -z "${LAN_IP:-}" ]]; then
  echo "Could not automatically determine your LAN IP."
  read -r -p "Enter your LAN IP address: " LAN_IP
fi

echo "Generating HTTPS certificate for:"
echo "  localhost"
echo "  127.0.0.1"
echo "  $LAN_IP"

mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" localhost 127.0.0.1 "$LAN_IP"

echo
echo "Certificates generated:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
echo
echo "LAN IP: $LAN_IP"
