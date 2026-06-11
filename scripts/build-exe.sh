#!/bin/bash
# ZEngine Editor - Build Windows .exe setup (cross-compile from Linux)
# Requires: wine, electron-builder

set -e

echo "=========================================="
echo "  Building ZEngine Editor Windows Setup"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="1.0.0"

cd "$PROJECT_DIR"

echo "[1/4] Installing electron-builder..."
npm install --save-dev electron-builder@latest 2>/dev/null || true

echo "[2/4] Building Next.js..."
npx next build

echo "[3/4] Exporting static site..."
npx next export -o out 2>/dev/null || mkdir -p out

echo "[4/4] Building Windows installer..."
npx electron-builder --win nsis --x64 --config electron/electron-builder.json

echo ""
mkdir -p "$PROJECT_DIR/download"
cp -v "$PROJECT_DIR/dist/"*.exe "$PROJECT_DIR/download/" 2>/dev/null || true

echo "=========================================="
echo "  Windows Setup created!"
echo "=========================================="
ls -la "$PROJECT_DIR/download/"*.exe 2>/dev/null || echo "  Check dist/ directory"
