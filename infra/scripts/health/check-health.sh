#!/bin/bash
echo "Checking API health (port 4000)..."
curl -sf http://localhost:4000/health && echo " OK" || echo " FAILED"
echo "Checking web-marketplace (port 3000)..."
curl -sf http://localhost:3000 >/dev/null && echo " OK" || echo " FAILED"
echo "Checking web-seller (port 3001)..."
curl -sf http://localhost:3001 >/dev/null && echo " OK" || echo " FAILED"
echo "Checking web-admin (port 3002)..."
curl -sf http://localhost:3002 >/dev/null && echo " OK" || echo " FAILED"
