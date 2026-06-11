'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useGameStore, selectActiveScene, type GameObject3D, type GameObjectType } from '@/lib/game-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Box,
  Circle,
  Triangle,
  Diamond,
  Hexagon,
  Cylinder,
  Cone,
  Star,
  Lightbulb,
  Sun,
  Camera,
  CircleDot,
  Trash2,
  Copy,
  Edit3,
  ArrowUp,
  ArrowDown,
  MoveRight,
  FolderPlus,
} from 'lucide-react'

// ============================================================================
// Object type configuration
// ============================================================================

interface ObjectTypeConfig {
  label: string
  icon: React.ElementType
  category: 'mesh' | 'light' | 'other'
}

const OBJECT_TYPES: Record<string, ObjectTypeConfig> = {
  cube: { label: 'Cube', icon: Box, category: 'mesh' },
  sphere: { label: 'Sphere', icon: Circle, category: 'mesh' },
  cylinder: { label: 'Cylinder', icon: Cylinder, category: 'mesh' },
  cone: { label: 'Cone', icon: Cone, category: 'mesh' },
  torus: { label: 'Torus', icon: Circle, category: 'mesh' },
  plane: { label: 'Plane', icon: Triangle, category: 'mesh' },
  capsule: { label: 'Capsule', icon: Cylinder, category: 'mesh' },
  ring: { label: 'Ring', icon: Circle, category: 'mesh' },
  icosahedron: { label: 'Icosahedron', icon: Diamond, category: 'mesh' },
  octahedron: { label: 'Octahedron', icon: Diamond, category: 'mesh' },
  dodecahedron: { label: 'Dodecahedron', icon: Hexagon, category: 'mesh' },
  tetrahedron: { label: 'Tetrahedron', icon: Triangle, category: 'mesh' },
  torus_knot: { label: 'Torus Knot', icon: Star, category: 'mesh' },
  directional_light: { label: 'Directional Light', icon: Sun, category: 'light' },
  point_light: { label: 'Point Light', icon: Lightbulb, category: 'light' },
  spot_light: { label: 'Spot Light', icon: Lightbulb, category: 'light' },
  ambient_light: { label: 'Ambient Light', icon: Sun, category: 'light' },
  camera: { label: 'Camera', icon: Camera, category: 'other' },
  empty: { label: 'Empty', icon: CircleDot, category: 'other' },
}

const DEFAULT_COLORS: Record<string, string> = {
  cube: '#4a90d9',
  sphere: '#5cb85c',
  cylinder: '#f0ad4e',
  cone: '#d9534f',
  torus: '#9b59b6',
  plane: '#95a5a6',
  capsule: '#1abc9c',
  ring: '#e67e22',
  icosahedron: '#2ecc71',
  octahedron: '#3498db',
  dodecahedron: '#e74c3c',
  tetrahedron: '#f39c12',
  torus_knot: '#8e44ad',
  directional_light: '#fffbe6',
  point_light: '#ffe0b2',
  spot_light: '#ffcc80',
  ambient_light: '#fff9c4',
  camera: '#80cbc4',
  empty: '#bdbdbd',
}

const MESH_TYPES: GameObjectType[] = [
  'cube', 'sphere', 'cylinder', 'cone', 'torus', 'plane',
  'capsule', 'ring', 'icosahedron', 'octahedron', 'dodecahedron',
  'tetrahedron', 'torus_knot',
]

const LIGHT_TYPES: GameObjectType[] = [
  'directional_light', 'point_light', 'spot_light', 'ambient_light',
]

const OTHER_TYPES: GameObjectType[] = ['camera', 'empty']

// ============================================================================
// Helper: build tree structure from flat list
// ============================================================================

interface TreeNode {
  object: GameObject3D
  children: TreeNode[]
}

function buildTree(objects: GameObject3D[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create a node for each object
  for (const obj of objects) {
    map.set(obj.id, { object: obj, children: [] })
  }

  // Link children to parents
  for (const obj of objects) {
    const node = map.get(obj.id)!
    if (obj.parentId && map.has(obj.parentId)) {
      map.get(obj.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// ============================================================================
// Tree Item Component
// ============================================================================

interface TreeItemProps {
  node: TreeNode
  depth: number
  selectedObjectId: string | null
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onRename: (id: string, currentName: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onReparent: (id: string, direction: 'in' | 'out') => void
  allObjects: GameObject3D[]
  renamingId: string | null
  renamingValue: string
  onRenamingValueChange: (value: string) => void
  onRenamingCommit: () => void
  onRenamingCancel: () => void
}

function TreeItem({
  node,
  depth,
  selectedObjectId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDuplicate,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onReparent,
  allObjects,
  renamingId,
  renamingValue,
  onRenamingValueChange,
  onRenamingCommit,
  onRenamingCancel,
}: TreeItemProps) {
  const { object } = node
  const isSelected = selectedObjectId === object.id
  const isExpanded = expandedIds.has(object.id)
  const hasChildren = node.children.length > 0
  const isRenaming = renamingId === object.id
  const typeConfig = OBJECT_TYPES[object.type]
  const IconComponent = typeConfig?.icon ?? Box

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onRenamingCommit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onRenamingCancel()
      }
    },
    [onRenamingCommit, onRenamingCancel]
  )

  const handleContextMenuAddChild = useCallback(() => {
    onAddChild(object.id)
  }, [onAddChild, object.id])

  const handleContextMenuRename = useCallback(() => {
    onRename(object.id, object.name)
  }, [onRename, object.id, object.name])

  const handleContextMenuDuplicate = useCallback(() => {
    onDuplicate(object.id)
  }, [onDuplicate, object.id])

  const handleContextMenuDelete = useCallback(() => {
    onDelete(object.id)
  }, [onDelete, object.id])

  const handleMoveUp = useCallback(() => {
    onMoveUp(object.id)
  }, [onMoveUp, object.id])

  const handleMoveDown = useCallback(() => {
    onMoveDown(object.id)
  }, [onMoveDown, object.id])

  const handleReparentIn = useCallback(() => {
    onReparent(object.id, 'in')
  }, [onReparent, object.id])

  const handleReparentOut = useCallback(() => {
    onReparent(object.id, 'out')
  }, [onReparent, object.id])

  const handleClick = useCallback(() => {
    onSelect(object.id)
  }, [onSelect, object.id])

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleExpand(object.id)
    },
    [onToggleExpand, object.id]
  )

  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleVisibility(object.id)
    },
    [onToggleVisibility, object.id]
  )

  const handleToggleLock = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleLock(object.id)
    },
    [onToggleLock, object.id]
  )

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            className={`
              flex items-center gap-1 py-1 px-1 rounded-sm cursor-pointer select-none
              transition-colors duration-75 group
              ${isSelected
                ? 'bg-primary/15 text-primary-foreground'
                : 'hover:bg-muted/60'}
              ${object.locked ? 'opacity-60' : ''}
            `}
            style={{ paddingLeft: `${depth * 16 + 4}px` }}
            onClick={handleClick}
          >
            {/* Expand/collapse chevron */}
            <button
              type="button"
              className={`
                flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-sm
                hover:bg-muted transition-colors
                ${hasChildren ? '' : 'invisible'}
              `}
              onClick={handleToggleExpand}
              tabIndex={-1}
            >
              {hasChildren && (
                isExpanded
                  ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  : <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>

            {/* Type icon */}
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              <IconComponent className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  type="text"
                  value={renamingValue}
                  onChange={(e) => onRenamingValueChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={onRenamingCommit}
                  autoFocus
                  className="w-full bg-background border border-ring rounded px-1 py-0 text-xs outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-xs truncate block">{object.name}</span>
              )}
            </div>

            {/* Visibility toggle */}
            <button
              type="button"
              className={`
                flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm
                opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-muted
              `}
              onClick={handleToggleVisibility}
              tabIndex={-1}
            >
              {object.visible
                ? <Eye className="w-3 h-3 text-muted-foreground" />
                : <EyeOff className="w-3 h-3 text-destructive" />
              }
            </button>

            {/* Lock toggle */}
            <button
              type="button"
              className={`
                flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm
                opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-muted
              `}
              onClick={handleToggleLock}
              tabIndex={-1}
            >
              {object.locked
                ? <Lock className="w-3 h-3 text-destructive" />
                : <Unlock className="w-3 h-3 text-muted-foreground" />
              }
            </button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={handleContextMenuRename}>
            <Edit3 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={handleContextMenuDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={handleContextMenuAddChild}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Child Object
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleMoveUp}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Move Up
          </ContextMenuItem>
          <ContextMenuItem onClick={handleMoveDown}>
            <ArrowDown className="mr-2 h-4 w-4" />
            Move Down
          </ContextMenuItem>
          <ContextMenuItem onClick={handleReparentIn}>
            <MoveRight className="mr-2 h-4 w-4 rotate-[-90deg]" />
            Reparent In
          </ContextMenuItem>
          <ContextMenuItem onClick={handleReparentOut}>
            <MoveRight className="mr-2 h-4 w-4 rotate-90" />
            Reparent Out
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleContextMenuDelete} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeItem
              key={child.object.id}
              node={child}
              depth={depth + 1}
              selectedObjectId={selectedObjectId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onReparent={onReparent}
              allObjects={allObjects}
              renamingId={renamingId}
              renamingValue={renamingValue}
              onRenamingValueChange={onRenamingValueChange}
              onRenamingCommit={onRenamingCommit}
              onRenamingCancel={onRenamingCancel}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ============================================================================
// Main SceneHierarchy Component
// ============================================================================

export default function SceneHierarchy() {
  // ---- Store selectors ----
  const scenes = useGameStore((s) => s.project.scenes)
  const activeSceneId = useGameStore((s) => s.project.activeSceneId)
  const selectedObjectId = useGameStore((s) => s.editor.selectedObjectId)
  const addGameObject = useGameStore((s) => s.addGameObject)
  const removeGameObject = useGameStore((s) => s.removeGameObject)
  const updateGameObject = useGameStore((s) => s.updateGameObject)
  const selectObject = useGameStore((s) => s.selectObject)
  const duplicateObject = useGameStore((s) => s.duplicateObject)
  const setActiveScene = useGameStore((s) => s.setActiveScene)

  // ---- Local state ----
  const [searchQuery, setSearchQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ---- Derived state ----
  const activeScene = useGameStore(selectActiveScene)
  const objects = activeScene?.objects ?? []

  // Auto-expand root items using memoized initial state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const rootIds = objects
      .filter((obj) => !obj.parentId)
      .map((obj) => obj.id)
    return new Set(rootIds)
  })

  // Keep expanded IDs in sync when new root objects appear
  const prevObjectCountRef = useRef(objects.length)
  if (objects.length !== prevObjectCountRef.current) {
    prevObjectCountRef.current = objects.length
    const rootIds = objects
      .filter((obj) => !obj.parentId)
      .map((obj) => obj.id)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      for (const id of rootIds) {
        next.add(id)
      }
      return next
    })
  }

  // ---- Search filtering ----
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects
    const query = searchQuery.toLowerCase()
    const matchingIds = new Set<string>()

    // Find objects matching the query
    for (const obj of objects) {
      if (obj.name.toLowerCase().includes(query) || obj.type.toLowerCase().includes(query)) {
        matchingIds.add(obj.id)
        // Add all ancestors
        let current = obj
        while (current.parentId) {
          matchingIds.add(current.parentId)
          current = objects.find((o) => o.id === current.parentId)!
          if (!current) break
        }
        // Add all descendants
        const addDescendants = (parentId: string) => {
          const children = objects.filter((o) => o.parentId === parentId)
          for (const child of children) {
            matchingIds.add(child.id)
            addDescendants(child.id)
          }
        }
        addDescendants(obj.id)
      }
    }

    return objects.filter((obj) => matchingIds.has(obj.id))
  }, [objects, searchQuery])

  // ---- Tree building ----
  const tree = useMemo(() => buildTree(filteredObjects), [filteredObjects])

  // ---- Handlers ----
  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelect = (id: string) => {
    selectObject(id)
  }

  const handleToggleVisibility = (id: string) => {
    const obj = objects.find((o) => o.id === id)
    if (obj) {
      updateGameObject(id, { visible: !obj.visible })
    }
  }

  const handleToggleLock = (id: string) => {
    const obj = objects.find((o) => o.id === id)
    if (obj) {
      updateGameObject(id, { locked: !obj.locked })
    }
  }

  const handleRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenamingValue(currentName)
  }

  const handleRenamingCommit = () => {
    if (renamingId && renamingValue.trim()) {
      updateGameObject(renamingId, { name: renamingValue.trim() })
    }
    setRenamingId(null)
    setRenamingValue('')
  }

  const handleRenamingCancel = () => {
    setRenamingId(null)
    setRenamingValue('')
  }

  const handleDuplicate = (id: string) => {
    duplicateObject(id)
  }

  const handleDelete = (id: string) => {
    removeGameObject(id)
  }

  const handleAddChild = (parentId: string) => {
    const parent = objects.find((o) => o.id === parentId)
    if (!parent) return
    const newType: GameObjectType = 'empty'
    const config = OBJECT_TYPES[newType]
    addGameObject({
      name: `${config.label} ${objects.length + 1}`,
      type: newType,
      position: { x: parent.position.x, y: parent.position.y, z: parent.position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: DEFAULT_COLORS[newType] ?? '#888888',
      visible: true,
      locked: false,
      children: [],
      parentId: parentId,
      properties: {},
      script: '',
      material: 'standard',
      castShadow: true,
      receiveShadow: true,
    })
    // Expand parent to show the new child
    setExpandedIds((prev) => new Set(prev).add(parentId))
  }

  const handleAddObject = (type: GameObjectType) => {
    const config = OBJECT_TYPES[type]
    if (!config) return
    addGameObject({
      name: `${config.label} ${objects.length + 1}`,
      type,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: DEFAULT_COLORS[type] ?? '#888888',
      visible: true,
      locked: false,
      children: [],
      parentId: null,
      properties: {},
      script: '',
      material: 'standard',
      castShadow: true,
      receiveShadow: true,
    })
  }

  const handleMoveUp = (id: string) => {
    const obj = objects.find((o) => o.id === id)
    if (!obj) return
    const siblings = objects.filter((o) => o.parentId === obj.parentId)
    const index = siblings.findIndex((s) => s.id === id)
    if (index <= 0) return
    // Swap positions with the previous sibling (shift by -1 on X)
    const prevSibling = siblings[index - 1]
    updateGameObject(id, {
      position: { x: prevSibling.position.x, y: obj.position.y, z: obj.position.z },
    })
    updateGameObject(prevSibling.id, {
      position: { x: obj.position.x, y: prevSibling.position.y, z: prevSibling.position.z },
    })
    // Also visually swap in the list by selecting the moved object
    selectObject(id)
  }

  const handleMoveDown = (id: string) => {
    const obj = objects.find((o) => o.id === id)
    if (!obj) return
    const siblings = objects.filter((o) => o.parentId === obj.parentId)
    const index = siblings.findIndex((s) => s.id === id)
    if (index < 0 || index >= siblings.length - 1) return
    const nextSibling = siblings[index + 1]
    updateGameObject(id, {
      position: { x: nextSibling.position.x, y: obj.position.y, z: obj.position.z },
    })
    updateGameObject(nextSibling.id, {
      position: { x: obj.position.x, y: nextSibling.position.y, z: nextSibling.position.z },
    })
    selectObject(id)
  }

  const handleReparent = (id: string, direction: 'in' | 'out') => {
    const obj = objects.find((o) => o.id === id)
    if (!obj) return

    if (direction === 'out') {
      // Move out of parent - become a root object
      if (!obj.parentId) return
      updateGameObject(id, { parentId: null })
      // Remove from old parent's children
      const oldParent = objects.find((o) => o.id === obj.parentId)
      if (oldParent) {
        updateGameObject(oldParent.id, {
          children: oldParent.children.filter((cid) => cid !== id),
        })
      }
    } else {
      // Move in - become child of the previous sibling
      const siblings = objects.filter((o) => o.parentId === obj.parentId)
      const index = siblings.findIndex((s) => s.id === id)
      if (index <= 0) return
      const newParent = siblings[index - 1]
      // Remove from old parent's children
      if (obj.parentId) {
        const oldParent = objects.find((o) => o.id === obj.parentId)
        if (oldParent) {
          updateGameObject(oldParent.id, {
            children: oldParent.children.filter((cid) => cid !== id),
          })
        }
      }
      // Set new parent
      updateGameObject(id, { parentId: newParent.id })
      updateGameObject(newParent.id, {
        children: [...newParent.children, id],
      })
      // Expand the new parent
      setExpandedIds((prev) => new Set(prev).add(newParent.id))
    }
  }

  const handleSceneChange = (sceneId: string) => {
    setActiveScene(sceneId)
  }

  // ---- Keyboard shortcut: focus search ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Only if the hierarchy panel is likely visible
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h2 className="text-sm font-semibold tracking-tight">Scene Hierarchy</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>Meshes</DropdownMenuLabel>
            {MESH_TYPES.map((type) => {
              const config = OBJECT_TYPES[type]
              const Icon = config.icon
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleAddObject(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {config.label}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Lights</DropdownMenuLabel>
            {LIGHT_TYPES.map((type) => {
              const config = OBJECT_TYPES[type]
              const Icon = config.icon
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleAddObject(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {config.label}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Other</DropdownMenuLabel>
            {OTHER_TYPES.map((type) => {
              const config = OBJECT_TYPES[type]
              const Icon = config.icon
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleAddObject(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {config.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scene selector */}
      {scenes.length > 1 && (
        <div className="px-3 py-2 border-b">
          <Select value={activeSceneId} onValueChange={handleSceneChange}>
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue placeholder="Select Scene" />
            </SelectTrigger>
            <SelectContent>
              {scenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  {scene.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Tree view */}
      <ScrollArea className="flex-1">
        <div className="py-1" role="tree" aria-label="Scene hierarchy">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Box className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">
                {searchQuery ? 'No matching objects' : 'No objects in scene'}
              </p>
              {!searchQuery && (
                <p className="text-xs mt-1">Click &quot;Add&quot; to create one</p>
              )}
            </div>
          ) : (
            tree.map((node) => (
              <TreeItem
                key={node.object.id}
                node={node}
                depth={0}
                selectedObjectId={selectedObjectId}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onSelect={handleSelect}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onReparent={handleReparent}
                allObjects={objects}
                renamingId={renamingId}
                renamingValue={renamingValue}
                onRenamingValueChange={setRenamingValue}
                onRenamingCommit={handleRenamingCommit}
                onRenamingCancel={handleRenamingCancel}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer: object count */}
      <div className="px-3 py-1.5 border-t text-xs text-muted-foreground">
        {objects.length} object{objects.length !== 1 ? 's' : ''} in scene
      </div>
    </div>
  )
}
