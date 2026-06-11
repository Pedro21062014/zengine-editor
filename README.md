# ZEngine Editor v1.0.0

**Complete 3D Game Editor Engine with AI Assistant**

A full-featured, lightweight 3D game editor built with Next.js, Three.js, and TypeScript. Create 3D games visually with an AI-powered code assistant, multi-language code editor, and real-time game preview with debugging.

![ZEngine Editor](https://img.shields.io/badge/ZEngine-Editor-00d4aa?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## Features

### 3D Viewport
- Full Three.js-based 3D scene editor with orbit controls
- Transform gizmos (Translate / Rotate / Scale)
- Grid and axes helpers
- Shadow support with PCF shadow mapping
- Real-time FPS counter

### 19 Built-in 3D Elements
| Meshes | Lights | Other |
|--------|--------|-------|
| Cube | Directional Light | Camera |
| Sphere | Point Light | Empty Object |
| Cylinder | Spot Light | |
| Cone | Ambient Light | |
| Torus | | |
| Plane | | |
| Capsule | | |
| Ring | | |
| Icosahedron | | |
| Octahedron | | |
| Dodecahedron | | |
| Tetrahedron | | |
| Torus Knot | | |

### 5 Material Types
- Standard (PBR)
- Phong
- Lambert
- Basic (unlit)
- Wireframe

### AI Assistant
- Connect your API key from OpenAI, Anthropic, Google, or custom endpoints
- Choose your model (GPT-4, Claude, Gemini, etc.)
- AI generates game scripts, reviews code, and helps debug
- Insert AI-generated code directly into your project
- Quick actions: Generate Script, Player Controller, Collision Help

### Multi-language Code Editor
- Monaco Editor (same as VS Code)
- Support for: JavaScript, TypeScript, Python, Lua, C#, GLSL
- File tree with add/delete
- Ctrl+S save
- Boilerplate templates for each language
- Export all scripts

### Game Preview & Debugger
- Play / Pause / Step-through game preview
- FPS counter and performance overlay
- Debug console with log, warn, error, info
- Screenshot capture
- Fullscreen mode
- Non-destructive play mode (scene resets on stop)

### Scene Hierarchy
- Tree view with parent-child hierarchy
- Click to select, right-click context menu
- Add/Duplicate/Delete/Rename objects
- Visibility and lock toggles
- Search/filter

### Properties Panel
- Transform: Position, Rotation, Scale (X/Y/Z)
- Appearance: Color picker, Material selector
- Lighting: Intensity, Distance, Angle (for lights)
- Shadows: Cast/Receive toggle
- Script: Attached script editor link
- Collapsible sections

## Installation

### Windows
Download `ZEngine-Editor-1.0.0-Setup.exe` and run the installer.

### Linux (Debian/Ubuntu)
```bash
sudo dpkg -i zengine-editor_1.0.0_amd64.deb
sudo apt-get install -f  # Install dependencies
```

### Linux (AppImage)
```bash
chmod +x ZEngine-Editor-1.0.0-x86_64.AppImage
./ZEngine-Editor-1.0.0-x86_64.AppImage
```

### From Source
```bash
git clone https://github.com/zengine-team/zengine-editor.git
cd zengine-editor
npm install
npm run dev
```

## Building from Source

### Prerequisites
- Node.js 18+
- npm or bun

### Build All Platforms
```bash
./scripts/build.sh all
```

### Build Specific Platform
```bash
./scripts/build.sh win       # Windows .exe
./scripts/build.sh deb       # Debian .deb
./scripts/build.sh appimage  # Linux AppImage
./scripts/build.sh linux     # Both .deb and AppImage
```

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **3D Engine**: Three.js r184
- **Code Editor**: Monaco Editor
- **State Management**: Zustand
- **UI Components**: shadcn/ui, Radix UI
- **Desktop**: Electron (for packaged builds)

## License
MIT
