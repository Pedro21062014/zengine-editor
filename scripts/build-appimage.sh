#!/bin/bash
# ZEngine Editor - Build AppImage manually
# Creates a portable Linux AppImage

set -e

echo "=========================================="
echo "  Building ZEngine Editor AppImage"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="1.0.0"
APP_NAME="ZEngine Editor"
APPDIR="$PROJECT_DIR/build-appimage/zengine-editor.AppDir"

cd "$PROJECT_DIR"

echo "[1/5] Creating AppDir structure..."
rm -rf "$PROJECT_DIR/build-appimage"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/lib"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/opt/zengine-editor"

echo "[2/5] Copying application files..."
# Copy built application
if [ -d "$PROJECT_DIR/out" ]; then
    cp -r "$PROJECT_DIR/out/"* "$APPDIR/opt/zengine-editor/"
elif [ -d "$PROJECT_DIR/.next" ]; then
    mkdir -p "$APPDIR/opt/zengine-editor/.next"
    cp -r "$PROJECT_DIR/.next/"* "$APPDIR/opt/zengine-editor/.next/"
    cp -r "$PROJECT_DIR/public" "$APPDIR/opt/zengine-editor/"
    cp "$PROJECT_DIR/package.json" "$APPDIR/opt/zengine-editor/"
fi
cp -r "$PROJECT_DIR/electron" "$APPDIR/opt/zengine-editor/"

echo "[3/5] Creating AppRun and desktop entry..."
# AppRun
cat > "$APPDIR/AppRun" << 'RUNEOF'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
exec "${HERE}/usr/bin/zengine-editor" "$@"
RUNEOF
chmod +x "$APPDIR/AppRun"

# Desktop entry
cat > "$APPDIR/zengine-editor.desktop" << EOF
[Desktop Entry]
Name=ZEngine Editor
Comment=Complete 3D Game Editor Engine with AI
Exec=zengine-editor
Icon=zengine-editor
Terminal=false
Type=Application
Categories=Development;IDE;Graphics;3DGraphics;
StartupNotify=true
EOF

# Launcher script
cat > "$APPDIR/usr/bin/zengine-editor" << 'LAUNCHEOF'
#!/bin/bash
APPDIR="$(dirname "$(readlink -f "$0")")/../.."
exec "${APPDIR}/opt/zengine-editor/zengine-editor" "$@"
LAUNCHEOF
chmod +x "$APPDIR/usr/bin/zengine-editor"

# Icon
if [ -f "$PROJECT_DIR/public/logo.svg" ]; then
    cp "$PROJECT_DIR/public/logo.svg" "$APPDIR/zengine-editor.svg"
    cp "$PROJECT_DIR/public/logo.svg" "$APPDIR/usr/share/icons/hicolor/256x256/apps/zengine-editor.svg"
fi

echo "[4/5] Downloading appimagetool..."
if [ ! -f "$PROJECT_DIR/build-appimage/appimagetool" ]; then
    wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" \
        -O "$PROJECT_DIR/build-appimage/appimagetool" 2>/dev/null || {
        echo "Warning: Could not download appimagetool. Creating directory-based AppImage instead."
        echo "To complete, run: chmod +x build-appimage/appimagetool && ./build-appimage/appimagetool $APPDIR"
    }
    chmod +x "$PROJECT_DIR/build-appimage/appimagetool" 2>/dev/null || true
fi

echo "[5/5] Building AppImage..."
OUTPUT="$PROJECT_DIR/download/ZEngine-Editor-${VERSION}-x86_64.AppImage"
mkdir -p "$PROJECT_DIR/download"

if [ -x "$PROJECT_DIR/build-appimage/appimagetool" ]; then
    "$PROJECT_DIR/build-appimage/appimagetool" "$APPDIR" "$OUTPUT"
    echo ""
    echo "  AppImage created: $OUTPUT"
else
    # Fallback: create a self-extracting archive
    echo "Creating portable archive instead..."
    tar -czf "$PROJECT_DIR/download/ZEngine-Editor-${VERSION}-x86_64.tar.gz" -C "$PROJECT_DIR/build-appimage" "zengine-editor.AppDir"
    echo ""
    echo "  Portable archive: $PROJECT_DIR/download/ZEngine-Editor-${VERSION}-x86_64.tar.gz"
    echo "  Extract and run: ./zengine-editor.AppDir/AppRun"
fi

echo ""
echo "=========================================="
echo "  Build complete!"
echo "=========================================="
