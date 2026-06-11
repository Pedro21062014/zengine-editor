#!/bin/bash
# ZEngine Editor - GitHub Release Script
# Creates a new GitHub repository and publishes releases

set -e

GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"
REPO_NAME="zengine-editor"
REPO_DESC="ZEngine Editor - Complete 3D Game Editor Engine with AI Assistant"
VERSION="1.0.0"
OWNER="zengine-team"

echo "=========================================="
echo "  ZEngine Editor - GitHub Release v${VERSION}"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ============================================================
# Step 1: Create GitHub Repository
# ============================================================
echo ""
echo "[1/4] Creating GitHub repository..."

HTTP_CODE=$(curl -s -o /tmp/gh-create-repo.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"${REPO_NAME}\",
    \"description\": \"${REPO_DESC}\",
    \"homepage\": \"https://github.com/${OWNER}/${REPO_NAME}\",
    \"private\": false,
    \"has_issues\": true,
    \"has_projects\": true,
    \"has_wiki\": true,
    \"auto_init\": false,
    \"license_template\": \"mit\"
  }")

if [ "$HTTP_CODE" = "201" ]; then
    echo "  Repository created: https://github.com/$(cat /tmp/gh-create-repo.json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["full_name"])' 2>/dev/null || echo "${OWNER}/${REPO_NAME}")"
elif [ "$HTTP_CODE" = "422" ]; then
    echo "  Repository already exists, continuing..."
else
    echo "  Warning: Repository creation returned HTTP ${HTTP_CODE}"
    cat /tmp/gh-create-repo.json 2>/dev/null || true
fi

# Get the actual repo owner from the response
REPO_FULL=$(cat /tmp/gh-create-repo.json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("full_name",""))' 2>/dev/null || echo "")
if [ -z "$REPO_FULL" ]; then
    # Try to get the authenticated user
    GH_USER=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/user | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("login",""))' 2>/dev/null || echo "zengine-team")
    REPO_FULL="${GH_USER}/${REPO_NAME}"
fi

echo "  Using repository: ${REPO_FULL}"

# ============================================================
# Step 2: Initialize git and push
# ============================================================
echo ""
echo "[2/4] Pushing code to GitHub..."

# Initialize git if not already
if [ ! -d ".git" ]; then
    git init
fi

# Create .gitignore
cat > .gitignore << 'GIEOF'
node_modules/
.next/
out/
dist/
build-deb/
build-appimage/
*.deb
*.AppImage
*.exe
*.blockmap
*.tar.gz
download/
dev.log
server.log
.zscripts/
db/
agent-ctx/
worklog.md
GIEOF

git add -A
git commit -m "v${VERSION} - ZEngine Editor: Complete 3D Game Editor Engine with AI" --allow-empty

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/${REPO_FULL}.git"

# Push
git branch -M main
git push -u origin main --force 2>/dev/null || {
    echo "  Push failed. Trying with token in URL..."
    git push -u origin main --force
}

echo "  Code pushed to GitHub"

# ============================================================
# Step 3: Create Release
# ============================================================
echo ""
echo "[3/4] Creating GitHub release v${VERSION}..."

RELEASE_BODY="# ZEngine Editor v${VERSION}

## Features

- **3D Viewport** - Complete Three.js-based 3D scene editor with orbit controls, grid, axes, and transform gizmos
- **19 Built-in 3D Elements** - Cube, Sphere, Cylinder, Cone, Torus, Plane, Capsule, Ring, Icosahedron, Octahedron, Dodecahedron, Tetrahedron, Torus Knot, and more
- **4 Light Types** - Directional, Point, Spot, and Ambient lights with shadow support
- **5 Material Types** - Standard, Phong, Lambert, Basic, and Wireframe materials
- **AI Assistant** - Connect your OpenAI/Anthropic/Google API key and let AI write game scripts for you
- **Multi-language Code Editor** - Monaco Editor with support for JavaScript, TypeScript, Python, Lua, C#, and GLSL
- **Game Preview & Debugger** - Play/Pause/Step through your game with FPS counter and debug console
- **Scene Hierarchy** - Tree view with drag-reorder, visibility/lock toggles, and context menu
- **Properties Panel** - Edit transform, appearance, lighting, shadows, and scripts
- **Lightweight** - Built with Next.js and Three.js for optimal performance

## Downloads

| Platform | File |
|----------|------|
| Windows | ZEngine-Editor-${VERSION}-Setup.exe |
| Linux (Debian/Ubuntu) | zengine-editor_${VERSION}_amd64.deb |
| Linux (AppImage) | ZEngine-Editor-${VERSION}-x86_64.AppImage |

## Quick Start

1. Download the installer for your platform
2. Install and launch ZEngine Editor
3. Add 3D objects from the Scene Hierarchy panel
4. Write scripts in the Code Editor
5. Use the AI Assistant to generate game logic
6. Preview your game with the Play button
"

RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO_FULL}/releases" \
  -d "{
    \"tag_name\": \"v${VERSION}\",
    \"target_commitish\": \"main\",
    \"name\": \"ZEngine Editor v${VERSION}\",
    \"body\": $(echo "$RELEASE_BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),
    \"draft\": false,
    \"prerelease\": false
  }")

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id",""))' 2>/dev/null || echo "")

if [ -z "$RELEASE_ID" ]; then
    echo "  Error: Could not create release"
    echo "$RELEASE_RESPONSE" | head -20
    exit 1
fi

echo "  Release created: v${VERSION} (ID: ${RELEASE_ID})"

# ============================================================
# Step 4: Upload Release Assets
# ============================================================
echo ""
echo "[4/4] Uploading release assets..."

upload_asset() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    
    if [ ! -f "$file_path" ]; then
        echo "  Skipping ${file_name} (file not found)"
        return
    fi
    
    echo "  Uploading ${file_name}..."
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Content-Type: application/octet-stream" \
      "https://uploads.github.com/repos/${REPO_FULL}/releases/${RELEASE_ID}/assets?name=${file_name}" \
      --data-binary @"${file_path}")
    
    if [ "$HTTP_CODE" = "201" ]; then
        echo "  Uploaded: ${file_name}"
    else
        echo "  Failed to upload ${file_name} (HTTP ${HTTP_CODE})"
    fi
}

# Upload any available build artifacts
for f in "$PROJECT_DIR/download/"*.exe "$PROJECT_DIR/download/"*.deb "$PROJECT_DIR/download/"*.AppImage "$PROJECT_DIR/download/"*.tar.gz; do
    if [ -f "$f" ]; then
        upload_asset "$f"
    fi
done

echo ""
echo "=========================================="
echo "  Release published successfully!"
echo "=========================================="
echo ""
echo "  Repository: https://github.com/${REPO_FULL}"
echo "  Release:    https://github.com/${REPO_FULL}/releases/tag/v${VERSION}"
echo ""
