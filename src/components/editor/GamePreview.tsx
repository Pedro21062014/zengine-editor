'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '@/lib/game-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Square,
  Camera,
  Maximize2,
  Minimize2,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  Terminal,
  SkipForward,
} from 'lucide-react'
import * as THREE from 'three'

// ============================================================================
// Debug Console
// ============================================================================

function DebugConsole() {
  const debugMessages = useGameStore((s) => s.debugMessages)
  const clearDebugMessages = useGameStore((s) => s.clearDebugMessages)

  const iconMap = {
    log: <Terminal className="w-3 h-3 text-muted-foreground" />,
    warn: <AlertTriangle className="w-3 h-3 text-yellow-500" />,
    error: <AlertCircle className="w-3 h-3 text-red-500" />,
    info: <Info className="w-3 h-3 text-blue-400" />,
  }

  const colorMap = {
    log: 'text-foreground',
    warn: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-400',
  }

  return (
    <div className="flex flex-col h-full border-t border-border">
      <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Console</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {debugMessages.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={clearDebugMessages}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {debugMessages.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">
              No console output
            </div>
          ) : (
            debugMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 px-3 py-1 hover:bg-muted/30 border-b border-border/30 ${
                  msg.type === 'error' ? 'bg-red-500/5' : msg.type === 'warn' ? 'bg-yellow-500/5' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0">{iconMap[msg.type]}</span>
                <span className={`break-all ${colorMap[msg.type]}`}>
                  {msg.message}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                  {msg.source}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Performance Overlay
// ============================================================================

function PerformanceOverlay({ fps }: { fps: number }) {
  return (
    <div className="absolute top-2 left-2 bg-black/70 text-green-400 font-mono text-[10px] px-2 py-1 rounded pointer-events-none z-10">
      <div>FPS: {fps}</div>
    </div>
  )
}

// ============================================================================
// Game Preview Component
// ============================================================================

export default function GamePreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animFrameRef = useRef<number>(0)
  const objectMapRef = useRef<Map<string, THREE.Object3D>>(new Map())

  const isPlaying = useGameStore((s) => s.editor.isPlaying)
  const isPaused = useGameStore((s) => s.editor.isPaused)
  const fps = useGameStore((s) => s.editor.fps)
  const setEditorState = useGameStore((s) => s.setEditorState)
  const togglePlay = useGameStore((s) => s.togglePlay)
  const togglePause = useGameStore((s) => s.togglePause)
  const addDebugMessage = useGameStore((s) => s.addDebugMessage)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localFps, setLocalFps] = useState(0)
  const fpsFrames = useRef(0)
  const fpsTime = useRef(0)

  // ---- Build Three.js scene from store ----
  const buildScene = useCallback(() => {
    const state = useGameStore.getState()
    const activeScene = state.project.scenes.find(
      (s) => s.id === state.project.activeSceneId
    )
    if (!sceneRef.current || !activeScene) return

    const scene = sceneRef.current
    const existingIds = new Set<string>()

    // Add/update objects
    for (const obj of activeScene.objects) {
      existingIds.add(obj.id)
      let mesh = objectMapRef.current.get(obj.id)

      if (!mesh) {
        // Create new mesh
        let geometry: THREE.BufferGeometry | null = null
        let isLight = false
        let lightObj: THREE.Light | null = null

        switch (obj.type) {
          case 'cube':
            geometry = new THREE.BoxGeometry(1, 1, 1)
            break
          case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, 32, 32)
            break
          case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
            break
          case 'cone':
            geometry = new THREE.ConeGeometry(0.5, 1, 32)
            break
          case 'torus':
            geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 48)
            break
          case 'plane':
            geometry = new THREE.PlaneGeometry(1, 1)
            break
          case 'capsule':
            geometry = new THREE.CapsuleGeometry(0.3, 0.5, 8, 16)
            break
          case 'ring':
            geometry = new THREE.RingGeometry(0.3, 0.5, 32)
            break
          case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(0.5)
            break
          case 'octahedron':
            geometry = new THREE.OctahedronGeometry(0.5)
            break
          case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(0.5)
            break
          case 'tetrahedron':
            geometry = new THREE.TetrahedronGeometry(0.5)
            break
          case 'torus_knot':
            geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 64, 16)
            break
          case 'directional_light':
            lightObj = new THREE.DirectionalLight(obj.color, 1)
            isLight = true
            break
          case 'point_light':
            lightObj = new THREE.PointLight(obj.color, 1, 10)
            isLight = true
            break
          case 'spot_light':
            lightObj = new THREE.SpotLight(obj.color, 1, 10, Math.PI / 4)
            isLight = true
            break
          case 'ambient_light':
            lightObj = new THREE.AmbientLight(obj.color, 0.5)
            isLight = true
            break
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1)
        }

        if (isLight && lightObj) {
          lightObj.position.set(obj.position.x, obj.position.y, obj.position.z)
          lightObj.castShadow = obj.castShadow
          scene.add(lightObj)
          objectMapRef.current.set(obj.id, lightObj)
          mesh = lightObj
        } else if (geometry) {
          const material = new THREE.MeshStandardMaterial({
            color: obj.color,
            wireframe: obj.material === 'wireframe',
          })
          const meshObj = new THREE.Mesh(geometry, material)
          meshObj.castShadow = obj.castShadow
          meshObj.receiveShadow = obj.receiveShadow
          scene.add(meshObj)
          objectMapRef.current.set(obj.id, meshObj)
          mesh = meshObj
        }
      }

      if (mesh) {
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
        mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z)
        mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
        mesh.visible = obj.visible
      }
    }

    // Remove objects not in scene anymore
    for (const [id, obj] of objectMapRef.current) {
      if (!existingIds.has(id)) {
        scene.remove(obj)
        objectMapRef.current.delete(id)
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (obj.material instanceof THREE.Material) obj.material.dispose()
        }
      }
    }
  }, [])

  // ---- Initialize preview renderer ----
  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1a2e')

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(1)
    containerRef.current.appendChild(renderer.domElement)

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer

    // Ambient light
    const ambient = new THREE.AmbientLight('#ffffff', 0.4)
    scene.add(ambient)

    // Directional light for shadows
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8)
    dirLight.position.set(5, 10, 5)
    dirLight.castShadow = true
    scene.add(dirLight)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
    }
  }, [])

  // ---- Resize ----
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width === 0 || height === 0) return
        cameraRef.current!.aspect = width / height
        cameraRef.current!.updateProjectionMatrix()
        rendererRef.current!.setSize(width, height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // ---- Animation loop (game mode) ----
  useEffect(() => {
    if (!isPlaying || !rendererRef.current || !sceneRef.current || !cameraRef.current) return

    buildScene()

    const startTime = performance.now()
    let lastFrameTime = startTime

    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate)

      if (isPaused) return

      const delta = (time - lastFrameTime) / 1000
      lastFrameTime = time

      // Simple game loop: rotate all meshes slowly
      const state = useGameStore.getState()
      const activeScene = state.project.scenes.find(
        (s) => s.id === state.project.activeSceneId
      )
      if (activeScene) {
        for (const obj of activeScene.objects) {
          const mesh = objectMapRef.current.get(obj.id)
          if (mesh && obj.visible) {
            // Simple rotation animation
            mesh.rotation.y += delta * 0.5
          }
        }
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!)

      // FPS counting
      fpsFrames.current++
      if (time - fpsTime.current >= 1000) {
        const currentFps = fpsFrames.current
        setLocalFps(currentFps)
        setEditorState({ fps: currentFps })
        fpsFrames.current = 0
        fpsTime.current = time
      }
    }

    fpsTime.current = startTime
    fpsFrames.current = 0
    animFrameRef.current = requestAnimationFrame(animate)

    addDebugMessage({ type: 'info', message: 'Game started', source: 'Engine' })

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      addDebugMessage({ type: 'info', message: 'Game stopped', source: 'Engine' })
    }
  }, [isPlaying, isPaused, buildScene, setEditorState, addDebugMessage])

  // ---- Screenshot ----
  const takeScreenshot = useCallback(() => {
    if (!rendererRef.current) return
    rendererRef.current.render(sceneRef.current!, cameraRef.current!)
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `screenshot-${Date.now()}.png`
    link.href = dataUrl
    link.click()
    addDebugMessage({ type: 'info', message: 'Screenshot saved', source: 'Engine' })
  }, [addDebugMessage])

  // ---- Fullscreen toggle ----
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // ---- Step frame (when paused) ----
  const stepFrame = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return
    // Advance one frame
    const state = useGameStore.getState()
    const activeScene = state.project.scenes.find(
      (s) => s.id === state.project.activeSceneId
    )
    if (activeScene) {
      for (const obj of activeScene.objects) {
        const mesh = objectMapRef.current.get(obj.id)
        if (mesh && obj.visible) {
          mesh.rotation.y += 0.016 * 0.5
        }
      }
    }
    rendererRef.current.render(sceneRef.current, cameraRef.current)
    addDebugMessage({ type: 'info', message: 'Stepped 1 frame', source: 'Debug' })
  }, [addDebugMessage])

  return (
    <div className="flex flex-col h-full">
      {/* Preview Controls */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/30 border-b border-border">
        <Button
          variant={isPlaying ? 'destructive' : 'default'}
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <>
              <Square className="w-3 h-3" /> Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Play
            </>
          )}
        </Button>
        {isPlaying && (
          <>
            <Button
              variant={isPaused ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={togglePause}
            >
              <Pause className="w-3 h-3" /> {isPaused ? 'Resume' : 'Pause'}
            </Button>
            {isPaused && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1"
                onClick={stepFrame}
              >
                <SkipForward className="w-3 h-3" /> Step
              </Button>
            )}
          </>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={takeScreenshot}
          title="Screenshot"
        >
          <Camera className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={toggleFullscreen}
          title="Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3 h-3" />
          ) : (
            <Maximize2 className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 relative bg-black">
        {isPlaying ? (
          <div ref={containerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Play className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Game Preview</p>
            <p className="text-sm opacity-60 mt-1">
              Press Play to preview your game
            </p>
          </div>
        )}
        {isPlaying && (
          <PerformanceOverlay fps={localFps} />
        )}
      </div>

      {/* Debug Console */}
      <div className="h-40">
        <DebugConsole />
      </div>
    </div>
  )
}
