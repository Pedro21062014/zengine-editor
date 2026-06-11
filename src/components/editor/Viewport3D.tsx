'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import {
  useGameEditorStore,
  selectActiveScene,
  type GameObject3D,
  type GameObjectType,
  type MaterialType,
} from '@/lib/game-store'

// ============================================================================
// Props
// ============================================================================

interface Viewport3DProps {
  className?: string
}

// ============================================================================
// Geometry Factory
// ============================================================================

const MESH_TYPES: Set<string> = new Set([
  'cube',
  'sphere',
  'cylinder',
  'cone',
  'torus',
  'plane',
  'capsule',
  'ring',
  'icosahedron',
  'octahedron',
  'dodecahedron',
  'tetrahedron',
  'torus_knot',
])

const LIGHT_TYPES: Set<string> = new Set([
  'directional_light',
  'point_light',
  'spot_light',
  'ambient_light',
])

function isMeshType(type: GameObjectType): boolean {
  return MESH_TYPES.has(type)
}

function isLightType(type: GameObjectType): boolean {
  return LIGHT_TYPES.has(type)
}

function createGeometryForType(type: GameObjectType): THREE.BufferGeometry | null {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1)
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 32)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 32)
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.2, 16, 48)
    case 'plane':
      return new THREE.PlaneGeometry(1, 1)
    case 'capsule':
      return new THREE.CapsuleGeometry(0.3, 0.5, 16, 32)
    case 'ring':
      return new THREE.RingGeometry(0.3, 0.5, 32)
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.5)
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.5)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.5)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.5)
    case 'torus_knot':
      return new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16)
    default:
      return null
  }
}

function createMaterialForType(materialType: MaterialType, color: string): THREE.Material {
  const threeColor = new THREE.Color(color)
  switch (materialType) {
    case 'phong':
      return new THREE.MeshPhongMaterial({ color: threeColor })
    case 'lambert':
      return new THREE.MeshLambertMaterial({ color: threeColor })
    case 'basic':
      return new THREE.MeshBasicMaterial({ color: threeColor })
    case 'wireframe':
      return new THREE.MeshBasicMaterial({ color: threeColor, wireframe: true })
    case 'standard':
    default:
      return new THREE.MeshStandardMaterial({ color: threeColor })
  }
}

/** Serialize the visual-relevant properties of a GameObject3D for change detection */
function serializeVisualState(obj: GameObject3D): string {
  return JSON.stringify({
    t: obj.type,
    p: obj.position,
    r: obj.rotation,
    s: obj.scale,
    c: obj.color,
    v: obj.visible,
    m: obj.material,
    cs: obj.castShadow,
    rs: obj.receiveShadow,
  })
}

// ============================================================================
// Component
// ============================================================================

export default function Viewport3D({ className }: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ================================================================
    // Scene
    // ================================================================
    const scene = new THREE.Scene()

    const initialState = useGameEditorStore.getState()
    const initialScene = selectActiveScene(initialState)
    scene.background = new THREE.Color(
      initialScene?.environment.backgroundColor ?? '#1a1a2e'
    )

    // Fog
    if (initialScene?.environment.fogEnabled) {
      scene.fog = new THREE.FogExp2(
        new THREE.Color(initialScene.environment.fogColor),
        initialScene.environment.fogDensity
      )
    }

    // ================================================================
    // Camera
    // ================================================================
    const containerWidth = container.clientWidth || 1
    const containerHeight = container.clientHeight || 1

    const camera = new THREE.PerspectiveCamera(
      60,
      containerWidth / containerHeight,
      0.1,
      2000
    )
    const camPos = initialState.editor.cameraPosition
    camera.position.set(camPos.x, camPos.y, camPos.z)
    camera.lookAt(0, 0, 0)

    // ================================================================
    // Renderer
    // ================================================================
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerWidth, containerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    // ================================================================
    // Orbit Controls
    // ================================================================
    const orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.dampingFactor = 0.1
    orbitControls.minDistance = 0.5
    orbitControls.maxDistance = 500
    orbitControls.target.set(0, 0, 0)

    // ================================================================
    // Transform Controls (gizmo)
    // ================================================================
    let isTransforming = false
    const transformControls = new TransformControls(camera, renderer.domElement)
    transformControls.setSize(0.75)

    // Disable orbit controls while using transform gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value
    })

    // Sync transform changes back to store
    transformControls.addEventListener('objectChange', () => {
      const obj = transformControls.object
      if (!obj || !obj.userData.objectId) return

      isTransforming = true
      useGameEditorStore.getState().updateGameObject(obj.userData.objectId, {
        position: {
          x: parseFloat(obj.position.x.toFixed(6)),
          y: parseFloat(obj.position.y.toFixed(6)),
          z: parseFloat(obj.position.z.toFixed(6)),
        },
        rotation: {
          x: parseFloat(obj.rotation.x.toFixed(6)),
          y: parseFloat(obj.rotation.y.toFixed(6)),
          z: parseFloat(obj.rotation.z.toFixed(6)),
        },
        scale: {
          x: parseFloat(obj.scale.x.toFixed(6)),
          y: parseFloat(obj.scale.y.toFixed(6)),
          z: parseFloat(obj.scale.z.toFixed(6)),
        },
      })
      isTransforming = false

      // Keep box helper in sync during transform
      if (boxHelper) {
        boxHelper.update()
      }
    })

    scene.add(transformControls.getHelper())

    // Set initial gizmo mode
    const initialGizmoMode = initialState.editor.gizmoMode
    transformControls.setMode(initialGizmoMode)

    // ================================================================
    // Lighting
    // ================================================================
    const sceneAmbientLight = new THREE.AmbientLight(
      0xffffff,
      initialScene?.environment.ambientLightIntensity ?? 0.4
    )
    scene.add(sceneAmbientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(5, 10, 7)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -15
    directionalLight.shadow.camera.right = 15
    directionalLight.shadow.camera.top = 15
    directionalLight.shadow.camera.bottom = -15
    directionalLight.shadow.bias = -0.0001
    scene.add(directionalLight)

    // ================================================================
    // Helpers
    // ================================================================
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
    gridHelper.visible = initialState.editor.showGrid
    scene.add(gridHelper)

    const axesHelper = new THREE.AxesHelper(5)
    axesHelper.visible = initialState.editor.showAxes
    scene.add(axesHelper)

    // ================================================================
    // Raycaster for click selection
    // ================================================================
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    // ================================================================
    // Object tracking
    // ================================================================
    const objectMap = new Map<string, THREE.Object3D>() // id -> Three.js Object3D
    const objectStateMap = new Map<string, string>() // id -> serialized visual state
    let lastActiveSceneId: string | null = null
    let boxHelper: THREE.BoxHelper | null = null

    // Geometry cache (keyed by type — one geometry instance per type, reused across meshes)
    const geometryCache = new Map<string, THREE.BufferGeometry>()

    function getGeometry(type: GameObjectType): THREE.BufferGeometry | null {
      const cached = geometryCache.get(type)
      if (cached) return cached

      const geo = createGeometryForType(type)
      if (geo) {
        geometryCache.set(type, geo)
      }
      return geo
    }

    // ================================================================
    // Create / Update / Remove Three.js objects
    // ================================================================

    function createThreeObject(obj: GameObject3D): THREE.Object3D | null {
      // ---- Light objects ----
      if (isLightType(obj.type)) {
        return createLightObject(obj)
      }

      // ---- Mesh objects ----
      if (isMeshType(obj.type)) {
        const geometry = getGeometry(obj.type)
        if (!geometry) return null

        const material = createMaterialForType(obj.material, obj.color)
        const mesh = new THREE.Mesh(geometry, material)
        applyObjectTransform(mesh, obj)
        mesh.castShadow = obj.castShadow
        mesh.receiveShadow = obj.receiveShadow
        mesh.userData.objectId = obj.id
        return mesh
      }

      // ---- Empty / Camera / Custom Model — invisible placeholder ----
      const placeholder = new THREE.Object3D()
      applyObjectTransform(placeholder, obj)
      placeholder.userData.objectId = obj.id

      // Add a small wireframe indicator for empties so they're visible in the editor
      if (obj.type === 'empty') {
        const indicatorGeo = new THREE.OctahedronGeometry(0.15)
        const indicatorMat = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          wireframe: true,
        })
        const indicatorMesh = new THREE.Mesh(indicatorGeo, indicatorMat)
        placeholder.add(indicatorMesh)
      }

      return placeholder
    }

    function createLightObject(obj: GameObject3D): THREE.Object3D {
      let light: THREE.Light

      switch (obj.type) {
        case 'directional_light': {
          const dl = new THREE.DirectionalLight(new THREE.Color(obj.color), 1.0)
          dl.castShadow = obj.castShadow
          dl.shadow.mapSize.width = 1024
          dl.shadow.mapSize.height = 1024
          dl.shadow.camera.near = 0.5
          dl.shadow.camera.far = 50
          dl.shadow.camera.left = -10
          dl.shadow.camera.right = 10
          dl.shadow.camera.top = 10
          dl.shadow.camera.bottom = -10
          light = dl
          break
        }
        case 'point_light': {
          light = new THREE.PointLight(new THREE.Color(obj.color), 1.0, 50)
          break
        }
        case 'spot_light': {
          const sl = new THREE.SpotLight(
            new THREE.Color(obj.color),
            1.0,
            50,
            Math.PI / 6
          )
          sl.castShadow = obj.castShadow
          light = sl
          break
        }
        case 'ambient_light': {
          light = new THREE.AmbientLight(new THREE.Color(obj.color), 0.5)
          break
        }
        default: {
          light = new THREE.AmbientLight(new THREE.Color(obj.color), 0.5)
        }
      }

      light.position.set(obj.position.x, obj.position.y, obj.position.z)
      light.visible = obj.visible
      light.userData.objectId = obj.id

      // Add a small wireframe sphere so lights are visible in the editor
      const helperGeo = new THREE.SphereGeometry(0.15, 8, 8)
      const helperMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(obj.color),
        wireframe: true,
      })
      const helperMesh = new THREE.Mesh(helperGeo, helperMat)
      helperMesh.raycast = () => {} // make helper non-pickable
      light.add(helperMesh)

      return light
    }

    function applyObjectTransform(
      obj: THREE.Object3D,
      data: Pick<GameObject3D, 'position' | 'rotation' | 'scale' | 'visible'>
    ): void {
      obj.position.set(data.position.x, data.position.y, data.position.z)
      obj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z)
      obj.scale.set(data.scale.x, data.scale.y, data.scale.z)
      obj.visible = data.visible
    }

    function updateThreeObject(threeObj: THREE.Object3D, obj: GameObject3D): void {
      // Skip position/rotation/scale if TransformControls is currently modifying this object
      if (!isTransforming || threeObj !== transformControls.object) {
        applyObjectTransform(threeObj, obj)
      }

      // Update mesh properties
      if (threeObj instanceof THREE.Mesh) {
        threeObj.castShadow = obj.castShadow
        threeObj.receiveShadow = obj.receiveShadow

        const mat = threeObj.material
        if (mat instanceof THREE.Material) {
          if ('color' in mat && (mat as THREE.MeshStandardMaterial).color instanceof THREE.Color) {
            ;(mat as THREE.MeshStandardMaterial).color.set(obj.color)
          }
          if ('wireframe' in mat) {
            ;(mat as THREE.MeshBasicMaterial).wireframe = obj.material === 'wireframe'
          }
        }
      }

      // Update light properties
      if (threeObj instanceof THREE.Light) {
        if ('color' in threeObj && threeObj.color instanceof THREE.Color) {
          threeObj.color.set(obj.color)
        }
        if ('castShadow' in threeObj) {
          threeObj.castShadow = obj.castShadow
        }
        // Update helper sphere color
        const helperChild = threeObj.children[0]
        if (
          helperChild instanceof THREE.Mesh &&
          helperChild.material instanceof THREE.MeshBasicMaterial
        ) {
          helperChild.material.color.set(obj.color)
        }
      }
    }

    function disposeObject(obj: THREE.Object3D): void {
      if (obj instanceof THREE.Mesh) {
        // Do NOT dispose cached geometries — they are shared
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose()
        }
      }
      // Dispose child helper meshes (light indicators, empty indicators)
      for (const child of obj.children) {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose()
          if (child.material instanceof THREE.Material) child.material.dispose()
        }
      }
    }

    // ================================================================
    // Sync objects from store → Three.js scene
    // ================================================================

    function syncObjects(): void {
      const state = useGameEditorStore.getState()
      const activeScene = selectActiveScene(state)

      // If there's no active scene, clear everything
      if (!activeScene) {
        clearAllObjects()
        return
      }

      // If the active scene changed, clear and rebuild
      if (activeScene.id !== lastActiveSceneId) {
        clearAllObjects()
        lastActiveSceneId = activeScene.id
      }

      const currentObjects = activeScene.objects
      const currentIds = new Set(currentObjects.map((o) => o.id))

      // ---- Remove objects that no longer exist ----
      for (const [id, threeObj] of objectMap) {
        if (!currentIds.has(id)) {
          // Detach transform controls if this was selected
          if (transformControls.object === threeObj) {
            transformControls.detach()
          }
          scene.remove(threeObj)
          disposeObject(threeObj)
          objectMap.delete(id)
          objectStateMap.delete(id)
        }
      }

      // ---- Add or update objects ----
      for (const obj of currentObjects) {
        const serialized = serializeVisualState(obj)
        const existingObj = objectMap.get(obj.id)

        if (!existingObj) {
          // New object — create it
          const threeObj = createThreeObject(obj)
          if (threeObj) {
            scene.add(threeObj)
            objectMap.set(obj.id, threeObj)
            objectStateMap.set(obj.id, serialized)
          }
        } else {
          // Existing object — check if visual state changed
          const prevSerialized = objectStateMap.get(obj.id)
          if (prevSerialized !== serialized) {
            // Check if type or material type changed — requires full recreation
            const prevParsed = prevSerialized ? JSON.parse(prevSerialized) : null
            if (prevParsed && (prevParsed.t !== obj.type || prevParsed.m !== obj.material)) {
              // Type or material changed — remove old, create new
              if (transformControls.object === existingObj) {
                transformControls.detach()
              }
              scene.remove(existingObj)
              disposeObject(existingObj)
              const threeObj = createThreeObject(obj)
              if (threeObj) {
                scene.add(threeObj)
                objectMap.set(obj.id, threeObj)
                objectStateMap.set(obj.id, serialized)
              }
            } else {
              // Just update properties in place
              updateThreeObject(existingObj, obj)
              objectStateMap.set(obj.id, serialized)
            }
          }
        }
      }

      // Update selection visuals
      updateSelection()
    }

    function clearAllObjects(): void {
      if (transformControls.object) {
        transformControls.detach()
      }
      for (const [id, threeObj] of objectMap) {
        scene.remove(threeObj)
        disposeObject(threeObj)
      }
      objectMap.clear()
      objectStateMap.clear()
      removeBoxHelper()
    }

    // ================================================================
    // Selection
    // ================================================================

    function removeBoxHelper(): void {
      if (boxHelper) {
        scene.remove(boxHelper)
        boxHelper.dispose()
        boxHelper = null
      }
    }

    function updateSelection(): void {
      const currentSelectedId = useGameEditorStore.getState().editor.selectedObjectId

      // Always remove old box helper first
      removeBoxHelper()

      if (currentSelectedId) {
        const threeObj = objectMap.get(currentSelectedId)
        if (threeObj) {
          // Attach transform controls to the selected object
          transformControls.attach(threeObj)

          // Create a BoxHelper for the outline highlight
          try {
            boxHelper = new THREE.BoxHelper(threeObj, 0x00ff88)
            boxHelper.raycast = () => {} // prevent box helper from being pickable
            scene.add(boxHelper)
          } catch {
            // BoxHelper can fail on objects without geometry (e.g. pure Object3D)
            boxHelper = null
          }
        } else {
          transformControls.detach()
        }
      } else {
        transformControls.detach()
      }
    }

    // ================================================================
    // Click / Pointer Selection
    // ================================================================

    function onPointerDown(event: PointerEvent): void {
      // Don't process selection while dragging the transform gizmo
      if (transformControls.dragging) return

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      // Collect all pickable meshes (exclude helpers, gizmos, etc.)
      const pickableMeshes: THREE.Mesh[] = []
      objectMap.forEach((obj) => {
        if (obj instanceof THREE.Mesh) {
          pickableMeshes.push(obj)
        }
      })

      const intersects = raycaster.intersectObjects(pickableMeshes, false)

      if (intersects.length > 0) {
        const hitObject = intersects[0].object
        const objectId = hitObject.userData.objectId as string | undefined
        if (objectId) {
          useGameEditorStore.getState().selectObject(objectId)
        }
      } else {
        // Click on empty space — deselect
        useGameEditorStore.getState().selectObject(null)
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    // ================================================================
    // Animation Loop
    // ================================================================

    let animFrameId = 0
    let fpsFrameCount = 0
    let fpsLastTime = performance.now()
    let isViewportVisible = true

    function animate(): void {
      animFrameId = requestAnimationFrame(animate)

      // Skip rendering when not visible
      if (!isViewportVisible) return

      orbitControls.update()

      // Keep box helper updated (especially during transform)
      if (boxHelper) {
        boxHelper.update()
      }

      renderer.render(scene, camera)

      // FPS calculation — update store once per second
      fpsFrameCount++
      const now = performance.now()
      const elapsed = now - fpsLastTime
      if (elapsed >= 1000) {
        const fps = Math.round((fpsFrameCount * 1000) / elapsed)
        useGameEditorStore.getState().setEditorState({ fps })
        fpsFrameCount = 0
        fpsLastTime = now
      }
    }

    animate()

    // ================================================================
    // Resize Handling
    // ================================================================

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width === 0 || height === 0) continue
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
    })
    resizeObserver.observe(container)

    // ================================================================
    // Visibility (pause rendering when off-screen)
    // ================================================================

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isViewportVisible = entry.isIntersecting
        }
      },
      { threshold: 0 }
    )
    intersectionObserver.observe(renderer.domElement)

    function onDocumentVisibilityChange(): void {
      isViewportVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', onDocumentVisibilityChange)

    // ================================================================
    // Store Subscription — react to state changes imperatively
    // ================================================================

    const unsubscribe = useGameEditorStore.subscribe((state, prevState) => {
      const activeScene = selectActiveScene(state)
      const prevActiveScene = selectActiveScene(prevState)

      // ---- Scene objects changed ----
      const sceneChanged =
        activeScene?.id !== prevActiveScene?.id ||
        (activeScene !== undefined &&
          prevActiveScene !== undefined &&
          activeScene.objects !== prevActiveScene.objects)

      if (sceneChanged) {
        syncObjects()
      }

      // ---- Selection changed ----
      if (state.editor.selectedObjectId !== prevState.editor.selectedObjectId) {
        updateSelection()
      }

      // ---- Gizmo mode changed ----
      if (state.editor.gizmoMode !== prevState.editor.gizmoMode) {
        transformControls.setMode(state.editor.gizmoMode)
      }

      // ---- Grid visibility ----
      if (state.editor.showGrid !== prevState.editor.showGrid) {
        gridHelper.visible = state.editor.showGrid
      }

      // ---- Axes visibility ----
      if (state.editor.showAxes !== prevState.editor.showAxes) {
        axesHelper.visible = state.editor.showAxes
      }

      // ---- Background color ----
      if (
        activeScene &&
        prevActiveScene &&
        activeScene.environment.backgroundColor !==
          prevActiveScene.environment.backgroundColor
      ) {
        scene.background = new THREE.Color(activeScene.environment.backgroundColor)
      }

      // ---- Fog ----
      if (activeScene && prevActiveScene) {
        const env = activeScene.environment
        const prevEnv = prevActiveScene.environment
        if (
          env.fogEnabled !== prevEnv.fogEnabled ||
          env.fogDensity !== prevEnv.fogDensity ||
          env.fogColor !== prevEnv.fogColor
        ) {
          if (env.fogEnabled) {
            scene.fog = new THREE.FogExp2(
              new THREE.Color(env.fogColor),
              env.fogDensity
            )
          } else {
            scene.fog = null
          }
        }
      }

      // ---- Ambient light intensity ----
      if (
        activeScene &&
        prevActiveScene &&
        activeScene.environment.ambientLightIntensity !==
          prevActiveScene.environment.ambientLightIntensity
      ) {
        sceneAmbientLight.intensity = activeScene.environment.ambientLightIntensity
      }

      // ---- Camera position (only update when not playing — avoid overriding user orbit) ----
      if (
        !state.editor.isPlaying &&
        (state.editor.cameraPosition.x !== prevState.editor.cameraPosition.x ||
          state.editor.cameraPosition.y !== prevState.editor.cameraPosition.y ||
          state.editor.cameraPosition.z !== prevState.editor.cameraPosition.z)
      ) {
        camera.position.set(
          state.editor.cameraPosition.x,
          state.editor.cameraPosition.y,
          state.editor.cameraPosition.z
        )
      }
    })

    // ---- Initial sync of objects from store ----
    syncObjects()

    // ================================================================
    // Cleanup on unmount
    // ================================================================

    return () => {
      // Stop animation loop
      cancelAnimationFrame(animFrameId)

      // Unsubscribe from store
      unsubscribe()

      // Disconnect observers
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onDocumentVisibilityChange)

      // Remove event listeners
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)

      // Detach transform controls
      transformControls.detach()
      transformControls.dispose()

      // Dispose all tracked Three.js objects
      for (const [, threeObj] of objectMap) {
        scene.remove(threeObj)
        disposeObject(threeObj)
      }
      objectMap.clear()
      objectStateMap.clear()

      // Remove box helper
      removeBoxHelper()

      // Dispose cached geometries
      for (const [, geo] of geometryCache) {
        geo.dispose()
      }
      geometryCache.clear()

      // Dispose scene helpers
      gridHelper.dispose()
      axesHelper.dispose()

      // Dispose renderer and remove canvas from DOM
      renderer.dispose()
      renderer.forceContextLoss()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      // Dispose orbit controls
      orbitControls.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    />
  )
}
