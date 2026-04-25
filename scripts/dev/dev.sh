#!/bin/bash
set -e
MODE="${1:-lite}"
echo "Starting development in $MODE mode..."
case "$MODE" in
  lite)
    pnpm dev:lite
    ;;
  module)
    pnpm infra:up:integrated
    pnpm dev:module
    ;;
  integrated)
    pnpm infra:up:integrated
    pnpm dev:integrated
    ;;
  local-prod)
    pnpm dev:local-prod
    ;;
  *)
    echo "Unknown mode: $MODE. Use: lite, module, integrated, local-prod"
    exit 1
    ;;
esac
