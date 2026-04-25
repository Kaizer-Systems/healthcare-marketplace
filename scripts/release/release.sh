#!/bin/bash
set -e
echo "Release script placeholder"
echo "Steps: lint → typecheck → test → build → docker push"
pnpm lint
pnpm typecheck
pnpm test
pnpm build
echo "Release checks passed."
