'use client'

import { useCallback, useState, useMemo } from 'react'
import {
  useGameStore,
  selectSelectedObject,
  type GameObject3D,
  type MaterialType,
  type GameObjectType,
} from '@/lib/game-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronRight,
  ChevronDown,
  Box,
  Lightbulb,
  Camera,
  Sun,
  FileCode,
  Palette,
  Layers,
  Move3D,
  Shield,
  Info,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'standard', label: 'Standard (PBR)' },
  { value: 'phong', label: 'Phong' },
  { value: 'lambert', label: 'Lambert' },
  { value: 'basic', label: 'Basic (Unlit)' },
  { value: 'wireframe', label: 'Wireframe' },
]

const LIGHT_TYPES: Set<string> = new Set([
  'directional_light',
  'point_light',
  'spot_light',
  'ambient_light',
])

const OBJECT_TYPE_LABELS: Record<string, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  plane: 'Plane',
  capsule: 'Capsule',
  ring: 'Ring',
  icosahedron: 'Icosahedron',
  octahedron: 'Octahedron',
  dodecahedron: 'Dodecahedron',
  tetrahedron: 'Tetrahedron',
  torus_knot: 'Torus Knot',
  directional_light: 'Directional Light',
  point_light: 'Point Light',
  spot_light: 'Spot Light',
  ambient_light: 'Ambient Light',
  camera: 'Camera',
  empty: 'Empty Object',
  custom_model: 'Custom Model',
}

// ============================================================================
// Vector3 Input Component
// ============================================================================

interface Vector3InputProps {
  label: string
  value: { x: number; y: number; z: number }
  onChange: (value: { x: number; y: number; z: number }) => void
  step?: number
  icon?: React.ReactNode
}

function Vector3Input({ label, value, onChange, step = 0.1, icon }: Vector3InputProps) {
  const handleChange = useCallback(
    (axis: 'x' | 'y' | 'z', rawValue: string) => {
      const num = parseFloat(rawValue)
      if (isNaN(num)) return
      onChange({ ...value, [axis]: num })
    },
    [value, onChange]
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-400">
            X
          </span>
          <Input
            type="number"
            value={value.x}
            onChange={(e) => handleChange('x', e.target.value)}
            step={step}
            className="h-7 pl-5 text-xs"
          />
        </div>
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-400">
            Y
          </span>
          <Input
            type="number"
            value={value.y}
            onChange={(e) => handleChange('y', e.target.value)}
            step={step}
            className="h-7 pl-5 text-xs"
          />
        </div>
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-400">
            Z
          </span>
          <Input
            type="number"
            value={value.z}
            onChange={(e) => handleChange('z', e.target.value)}
            step={step}
            className="h-7 pl-5 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface SectionProps {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 w-full py-1.5 px-1 hover:bg-muted/50 rounded-sm transition-colors"
        >
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          }
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-xs font-semibold tracking-tight">{title}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-2 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// Properties Panel Component
// ============================================================================

export default function PropertiesPanel() {
  // ---- Store selectors ----
  const selectedObjectId = useGameStore((s) => s.editor.selectedObjectId)
  const selectedObject = useGameStore(selectSelectedObject)
  const updateGameObject = useGameStore((s) => s.updateGameObject)
  const removeGameObject = useGameStore((s) => s.removeGameObject)
  const codeFiles = useGameStore((s) => s.codeFiles)

  // ---- Computed ----
  const isLight = useMemo(
    () => selectedObject ? LIGHT_TYPES.has(selectedObject.type) : false,
    [selectedObject]
  )

  // ---- Handlers ----
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { name: e.target.value })
    },
    [selectedObject, updateGameObject]
  )

  const handlePositionChange = useCallback(
    (value: { x: number; y: number; z: number }) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { position: value })
    },
    [selectedObject, updateGameObject]
  )

  const handleRotationChange = useCallback(
    (value: { x: number; y: number; z: number }) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { rotation: value })
    },
    [selectedObject, updateGameObject]
  )

  const handleScaleChange = useCallback(
    (value: { x: number; y: number; z: number }) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { scale: value })
    },
    [selectedObject, updateGameObject]
  )

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { color: e.target.value })
    },
    [selectedObject, updateGameObject]
  )

  const handleMaterialChange = useCallback(
    (value: string) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { material: value as MaterialType })
    },
    [selectedObject, updateGameObject]
  )

  const handleVisibilityToggle = useCallback(
    (checked: boolean) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { visible: checked })
    },
    [selectedObject, updateGameObject]
  )

  const handleLockToggle = useCallback(
    (checked: boolean) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { locked: !checked })
    },
    [selectedObject, updateGameObject]
  )

  const handleCastShadowToggle = useCallback(
    (checked: boolean) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { castShadow: checked })
    },
    [selectedObject, updateGameObject]
  )

  const handleReceiveShadowToggle = useCallback(
    (checked: boolean) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { receiveShadow: checked })
    },
    [selectedObject, updateGameObject]
  )

  const handleDelete = useCallback(() => {
    if (!selectedObject) return
    removeGameObject(selectedObject.id)
  }, [selectedObject, removeGameObject])

  // ---- Light-specific property handlers ----
  const handleLightIntensityChange = useCallback(
    (values: number[]) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, {
        properties: { ...selectedObject.properties, intensity: values[0] },
      })
    },
    [selectedObject, updateGameObject]
  )

  const handleLightDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      const num = parseFloat(e.target.value)
      if (isNaN(num)) return
      updateGameObject(selectedObject.id, {
        properties: { ...selectedObject.properties, distance: num },
      })
    },
    [selectedObject, updateGameObject]
  )

  const handleLightAngleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      const num = parseFloat(e.target.value)
      if (isNaN(num)) return
      updateGameObject(selectedObject.id, {
        properties: { ...selectedObject.properties, angle: num },
      })
    },
    [selectedObject, updateGameObject]
  )

  const handleLightColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, {
        properties: { ...selectedObject.properties, lightColor: e.target.value },
      })
    },
    [selectedObject, updateGameObject]
  )

  // ---- Script handler ----
  const handleScriptNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedObject) return
      updateGameObject(selectedObject.id, { script: e.target.value })
    },
    [selectedObject, updateGameObject]
  )

  // ---- Get light properties ----
  const lightIntensity = useMemo(() => {
    if (!selectedObject) return 1
    return (selectedObject.properties.intensity as number) ?? 1
  }, [selectedObject])

  const lightDistance = useMemo(() => {
    if (!selectedObject) return 10
    return (selectedObject.properties.distance as number) ?? 10
  }, [selectedObject])

  const lightAngle = useMemo(() => {
    if (!selectedObject) return 30
    return (selectedObject.properties.angle as number) ?? 30
  }, [selectedObject])

  const lightColor = useMemo(() => {
    if (!selectedObject) return '#ffffff'
    return (selectedObject.properties.lightColor as string) ?? '#ffffff'
  }, [selectedObject])

  // ---- Render empty state ----
  if (!selectedObject) {
    return (
      <div className="flex flex-col h-full bg-background border-l">
        <div className="px-3 py-2 border-b">
          <h2 className="text-sm font-semibold tracking-tight">Properties</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
          <Box className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No object selected</p>
          <p className="text-xs mt-1 text-center">
            Select an object in the scene hierarchy or viewport to view its properties
          </p>
        </div>
      </div>
    )
  }

  const obj = selectedObject
  const typeLabel = OBJECT_TYPE_LABELS[obj.type] ?? obj.type

  // Get type icon
  const TypeIcon = obj.type.includes('light')
    ? Sun
    : obj.type === 'camera'
      ? Camera
      : Box

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="px-3 py-2 border-b">
        <h2 className="text-sm font-semibold tracking-tight">Properties</h2>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">

          {/* ---- Object Info Section ---- */}
          <Section title="Object Info" icon={<Info className="w-3.5 h-3.5" />} defaultOpen={true}>
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input
                type="text"
                value={obj.name}
                onChange={handleNameChange}
                className="h-7 text-xs"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Type</Label>
              <div className="flex items-center gap-2 h-7 px-2 rounded-md border bg-muted/30">
                <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">{typeLabel}</span>
              </div>
            </div>

            {/* ID */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">ID</Label>
              <div className="h-7 px-2 flex items-center rounded-md border bg-muted/30">
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {obj.id}
                </span>
              </div>
            </div>

            {/* Visibility & Lock toggles */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="visibility-toggle"
                  checked={obj.visible}
                  onCheckedChange={handleVisibilityToggle}
                  className="scale-75"
                />
                <Label htmlFor="visibility-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                  {obj.visible
                    ? <Eye className="w-3 h-3" />
                    : <EyeOff className="w-3 h-3 text-destructive" />
                  }
                  Visible
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="lock-toggle"
                  checked={!obj.locked}
                  onCheckedChange={handleLockToggle}
                  className="scale-75"
                />
                <Label htmlFor="lock-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                  {obj.locked
                    ? <Lock className="w-3 h-3 text-destructive" />
                    : <Unlock className="w-3 h-3" />
                  }
                  Unlocked
                </Label>
              </div>
            </div>
          </Section>

          <Separator />

          {/* ---- Transform Section ---- */}
          <Section title="Transform" icon={<Move3D className="w-3.5 h-3.5" />} defaultOpen={true}>
            <Vector3Input
              label="Position"
              value={obj.position}
              onChange={handlePositionChange}
              step={0.1}
            />
            <Vector3Input
              label="Rotation"
              value={obj.rotation}
              onChange={handleRotationChange}
              step={1}
            />
            <Vector3Input
              label="Scale"
              value={obj.scale}
              onChange={handleScaleChange}
              step={0.1}
            />
          </Section>

          <Separator />

          {/* ---- Appearance Section ---- */}
          <Section title="Appearance" icon={<Palette className="w-3.5 h-3.5" />} defaultOpen={true}>
            {/* Color Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Color</Label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={obj.color}
                    onChange={handleColorChange}
                    className="w-8 h-8 rounded-md border cursor-pointer p-0.5"
                  />
                </div>
                <Input
                  type="text"
                  value={obj.color}
                  onChange={(e) => {
                    if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                      updateGameObject(obj.id, { color: e.target.value })
                    }
                  }}
                  className="h-7 text-xs font-mono flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Material Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Material</Label>
              <Select
                value={obj.material}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger className="w-full h-7 text-xs">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((mat) => (
                    <SelectItem key={mat.value} value={mat.value}>
                      {mat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Separator />

          {/* ---- Lighting Section (only for light types) ---- */}
          {isLight && (
            <>
              <Section title="Lighting" icon={<Lightbulb className="w-3.5 h-3.5" />} defaultOpen={true}>
                {/* Intensity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Intensity</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {lightIntensity.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[lightIntensity]}
                    onValueChange={handleLightIntensityChange}
                    min={0}
                    max={20}
                    step={0.1}
                    className="py-1"
                  />
                </div>

                {/* Light Color */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Light Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lightColor}
                      onChange={handleLightColorChange}
                      className="w-8 h-8 rounded-md border cursor-pointer p-0.5"
                    />
                    <Input
                      type="text"
                      value={lightColor}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                          updateGameObject(obj.id, {
                            properties: { ...obj.properties, lightColor: e.target.value },
                          })
                        }
                      }}
                      className="h-7 text-xs font-mono flex-1"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Distance (point/spot only) */}
                {(obj.type === 'point_light' || obj.type === 'spot_light') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Distance</Label>
                    <Input
                      type="number"
                      value={lightDistance}
                      onChange={handleLightDistanceChange}
                      step={0.5}
                      min={0}
                      className="h-7 text-xs"
                    />
                  </div>
                )}

                {/* Angle (spot only) */}
                {obj.type === 'spot_light' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Angle (degrees)</Label>
                    <Input
                      type="number"
                      value={lightAngle}
                      onChange={handleLightAngleChange}
                      step={1}
                      min={0}
                      max={90}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </Section>
              <Separator />
            </>
          )}

          {/* ---- Shadow Section ---- */}
          <Section title="Shadow" icon={<Shield className="w-3.5 h-3.5" />} defaultOpen={true}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Cast Shadow</Label>
              <Switch
                checked={obj.castShadow}
                onCheckedChange={handleCastShadowToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Receive Shadow</Label>
              <Switch
                checked={obj.receiveShadow}
                onCheckedChange={handleReceiveShadowToggle}
              />
            </div>
          </Section>

          <Separator />

          {/* ---- Script Section ---- */}
          <Section title="Script" icon={<FileCode className="w-3.5 h-3.5" />} defaultOpen={false}>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Script Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={obj.script || ''}
                  onChange={handleScriptNameChange}
                  placeholder="No script assigned"
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    // Open the script in the code editor by switching to code tab
                    if (obj.script) {
                      const file = codeFiles.find(
                        (f) => f.name === obj.script || f.path.includes(obj.script)
                      )
                      if (file) {
                        // Could switch to code tab, but that's handled by the editor layout
                      }
                    }
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
            {!obj.script && (
              <p className="text-[10px] text-muted-foreground">
                Enter a script file name to link this object to a script
              </p>
            )}
          </Section>

          <Separator />

          {/* ---- Danger Zone ---- */}
          <div className="pt-1 pb-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Object
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
