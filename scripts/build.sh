#!/bin/bash
# ZEngine Editor - Build Script
# Creates .exe (Windows), .deb (Debian/Ubuntu), .AppImage (Linux)
# Requires: Node.js 18+, npm, electron-builder

set -e

echo "=========================================="
echo "  ZEngine Editor - Build Script v1.0.0"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
DOWNLOAD_DIR="$PROJECT_DIR/download"

cd "$PROJECT_DIR"

# Install build dependencies if needed
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js 18+"
    exit 1
fi

echo ""
echo "[1/5] Installing build dependencies..."
npm install --save-dev electron@latest electron-builder@latest --legacy-peer-deps 2>/dev/null || true

echo ""
echo "[2/5] Building Next.js application..."
npx next build

echo ""
echo "[3/5] Exporting static pages..."
npx next export -o out 2>/dev/null || mkdir -p out && cp -r .next/static out/ 2>/dev/null || true

echo ""
echo "[4/5] Building desktop packages..."

# Determine which platform to build for
PLATFORM="${1:-all}"

case "$PLATFORM" in
  win|windows)
    echo "Building Windows .exe installer..."
    npx electron-builder --win --x64 --config electron/electron-builder.json
    ;;
  deb|debian)
    echo "Building Debian .deb package..."
    npx electron-builder --linux deb --x64 --config electron/electron-builder.json
    ;;
  appimage)
    echo "Building AppImage..."
    npx electron-builder --linux AppImage --x64 --config electron/electron-builder.json
    ;;
  linux)
    echo "Building Linux packages (.deb + .AppImage)..."
    npx electron-builder --linux --x64 --config electron/electron-builder.json
    ;;
  all)
    echo "Building all platforms..."
    npx electron-builder --win --linux --x64 --config electron/electron-builder.json
    ;;
  *)
    echo "Usage: $0 {all|win|deb|appimage|linux}"
    echo ""
    echo "Targets:"
    echo "  all       - Build all platforms (.exe + .deb + .AppImage)"
    echo "  win       - Build Windows .exe installer"
    echo "  deb       - Build Debian .deb package"
    echo "  appimage  - Build Linux AppImage"
    echo "  linux     - Build both .deb and .AppImage"
    exit 1
    ;;
esac

echo ""
echo "[5/5] Copying artifacts to download directory..."
mkdir -p "$DOWNLOAD_DIR"
if [ -d "$DIST_DIR" ]; then
  cp -v "$DIST_DIR"/*.{exe,deb,AppImage,blockmap,yml} "$DOWNLOAD_DIR/" 2>/dev/null || true
fi

echo ""
echo "=========================================="
echo "  Build complete!"
echo "=========================================="
echo ""
echo "Output files:"
ls -la "$DOWNLOAD_DIR/"*.{exe,deb,AppImage} 2>/dev/null || echo "  No artifacts found in $DOWNLOAD_DIR"
echo ""
echo "Full build output: $DIST_DIR"
