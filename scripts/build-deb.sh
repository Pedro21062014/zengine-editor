#!/bin/bash
# ZEngine Editor - Build .deb package manually (without electron-builder)
# Creates a Debian package structure for the application

set -e

echo "=========================================="
echo "  Building ZEngine Editor .deb Package"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="1.0.0"
ARCH="amd64"
PKG_NAME="zengine-editor"
PKG_DIR="$PROJECT_DIR/build-deb/${PKG_NAME}_${VERSION}_${ARCH}"

cd "$PROJECT_DIR"

echo "[1/5] Creating package directory structure..."
rm -rf "$PROJECT_DIR/build-deb"
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/opt/zengine-editor"
mkdir -p "$PKG_DIR/usr/bin"
mkdir -p "$PKG_DIR/usr/share/applications"
mkdir -p "$PKG_DIR/usr/share/icons/hicolor/256x256/apps"

echo "[2/5] Creating control file..."
cat > "$PKG_DIR/DEBIAN/control" << EOF
Package: ${PKG_NAME}
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: ${ARCH}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libgbm1, libasound2
Maintainer: ZEngine Team <zengine@example.com>
Description: ZEngine Editor - Complete 3D Game Editor Engine
 A full-featured 3D game editor with AI assistant, code editor,
 scene hierarchy, properties panel, and game preview/debug.
 Built with Next.js, Three.js, and Electron.
Homepage: https://github.com/zengine/editor
EOF

echo "[3/5] Creating post-install script..."
cat > "$PKG_DIR/DEBIAN/postinst" << 'EOF'
#!/bin/bash
update-desktop-database /usr/share/applications 2>/dev/null || true
chmod +x /opt/zengine-editor/zengine-editor 2>/dev/null || true
EOF
chmod 755 "$PKG_DIR/DEBIAN/postinst"

echo "[4/5] Copying application files..."
# Copy the built Next.js app
if [ -d "$PROJECT_DIR/out" ]; then
    cp -r "$PROJECT_DIR/out/"* "$PKG_DIR/opt/zengine-editor/"
elif [ -d "$PROJECT_DIR/.next" ]; then
    mkdir -p "$PKG_DIR/opt/zengine-editor/.next"
    cp -r "$PROJECT_DIR/.next/"* "$PKG_DIR/opt/zengine-editor/.next/"
    cp -r "$PROJECT_DIR/public" "$PKG_DIR/opt/zengine-editor/"
    cp "$PROJECT_DIR/package.json" "$PKG_DIR/opt/zengine-editor/"
fi

# Copy electron files
cp -r "$PROJECT_DIR/electron" "$PKG_DIR/opt/zengine-editor/"

# Create launcher script
cat > "$PKG_DIR/usr/bin/zengine-editor" << 'EOF'
#!/bin/bash
exec /opt/zengine-editor/zengine-editor "$@"
EOF
chmod +x "$PKG_DIR/usr/bin/zengine-editor"

# Create desktop entry
cat > "$PKG_DIR/usr/share/applications/zengine-editor.desktop" << EOF
[Desktop Entry]
Name=ZEngine Editor
Comment=Complete 3D Game Editor Engine with AI
Exec=/usr/bin/zengine-editor
Icon=zengine-editor
Terminal=false
Type=Application
Categories=Development;IDE;Graphics;3DGraphics;
StartupNotify=true
MimeType=application/x-zengine-project;
EOF

# Copy icon
if [ -f "$PROJECT_DIR/public/logo.svg" ]; then
    cp "$PROJECT_DIR/public/logo.svg" "$PKG_DIR/usr/share/icons/hicolor/256x256/apps/zengine-editor.svg"
fi

echo "[5/5] Building .deb package..."
dpkg-deb --build "$PKG_DIR" "$PROJECT_DIR/download/${PKG_NAME}_${VERSION}_${ARCH}.deb"

echo ""
echo "=========================================="
echo "  .deb package created successfully!"
echo "=========================================="
echo ""
echo "  File: $PROJECT_DIR/download/${PKG_NAME}_${VERSION}_${ARCH}.deb"
echo "  Size: $(du -h "$PROJECT_DIR/download/${PKG_NAME}_${VERSION}_${ARCH}.deb" | cut -f1)"
echo ""
echo "  Install with: sudo dpkg -i ${PKG_NAME}_${VERSION}_${ARCH}.deb"
