#!/bin/bash
set -e
echo "=== Grip Health — Setup ==="
echo "Checking Node.js version..."
node -v
echo "Installing dependencies..."
pnpm install
echo "Setup complete. Run 'pnpm dev:lite' to start."
