#!/bin/bash
set -e
echo "Running database seed scripts..."
pnpm --filter @grip-health/database db:seed
echo "Seeding complete."
