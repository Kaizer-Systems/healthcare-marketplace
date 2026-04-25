#!/bin/bash
set -e
echo "Setting up local development environment..."
echo "Checking required tools..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }
echo "Installing dependencies..."
pnpm install
echo "Setup complete."
