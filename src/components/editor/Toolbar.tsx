'use client'

import { useGameStore } from '@/lib/game-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Play,
  Pause,
  Square,
  Grid3X3,
  Axis3D,
  Move3D,
  RotateCcw,
  Maximize2,
  Magnet,
  RotateCw,
  FlipHorizontal2,
  type LucideIcon,
} from 'lucide-react'
import type { GizmoMode } from '@/lib/game-store'

// ============================================================================
// Toolbar Button Helper
// ============================================================================

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
  variant?: 'default' | 'destructive'
}

function ToolbarButton({ icon: Icon, label, active, onClick, variant }: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-7 w-7 p-0 ${active ? 'bg-primary/15' : ''}`}
            onClick={onClick}
          >
            <Icon className={`w-4 h-4 ${variant === 'destructive' ? 'text-destructive' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Toolbar Component
// ============================================================================

export function Toolbar() {
  const isPlaying = useGameStore((s) => s.editor.isPlaying)
  const isPaused = useGameStore((s) => s.editor.isPaused)
  const showGrid = useGameStore((s) => s.editor.showGrid)
  const showAxes = useGameStore((s) => s.editor.showAxes)
  const gizmoMode = useGameStore((s) => s.editor.gizmoMode)
  const snapToGrid = useGameStore((s) => s.editor.snapToGrid)
  const fps = useGameStore((s) => s.editor.fps)
  const projectName = useGameStore((s) => s.project.name)

  const togglePlay = useGameStore((s) => s.togglePlay)
  const togglePause = useGameStore((s) => s.togglePause)
  const resetScene = useGameStore((s) => s.resetScene)
  const setEditorState = useGameStore((s) => s.setEditorState)

  return (
    <div className="flex items-center h-9 px-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Project Name */}
      <div className="flex items-center gap-2 mr-3">
        <span className="text-xs font-semibold tracking-tight truncate max-w-[120px]">
          {projectName}
        </span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Play Controls */}
      <div className="flex items-center gap-0.5 mx-2">
        <ToolbarButton
          icon={Play}
          label={isPlaying ? 'Stop' : 'Play'}
          active={isPlaying && !isPaused}
          onClick={togglePlay}
          variant={isPlaying ? 'destructive' : undefined}
        />
        <ToolbarButton
          icon={Pause}
          label="Pause"
          active={isPaused}
          onClick={togglePause}
        />
        <ToolbarButton
          icon={RotateCcw}
          label="Reset Scene"
          onClick={resetScene}
        />
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Gizmo Mode */}
      <div className="flex items-center gap-0.5 mx-2">
        <ToolbarButton
          icon={Maximize2}
          label="Translate (W)"
          active={gizmoMode === 'translate'}
          onClick={() => setEditorState({ gizmoMode: 'translate' as GizmoMode })}
        />
        <ToolbarButton
          icon={RotateCw}
          label="Rotate (E)"
          active={gizmoMode === 'rotate'}
          onClick={() => setEditorState({ gizmoMode: 'rotate' as GizmoMode })}
        />
        <ToolbarButton
          icon={FlipHorizontal2}
          label="Scale (R)"
          active={gizmoMode === 'scale'}
          onClick={() => setEditorState({ gizmoMode: 'scale' as GizmoMode })}
        />
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* View Toggles */}
      <div className="flex items-center gap-0.5 mx-2">
        <ToolbarButton
          icon={Grid3X3}
          label="Toggle Grid"
          active={showGrid}
          onClick={() => setEditorState({ showGrid: !showGrid })}
        />
        <ToolbarButton
          icon={Axis3D}
          label="Toggle Axes"
          active={showAxes}
          onClick={() => setEditorState({ showAxes: !showAxes })}
        />
        <ToolbarButton
          icon={Magnet}
          label="Snap to Grid"
          active={snapToGrid}
          onClick={() => setEditorState({ snapToGrid: !snapToGrid })}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* FPS Counter */}
      <div className="flex items-center gap-1.5 mr-2">
        <span className="text-[10px] font-mono text-muted-foreground">
          {fps} FPS
        </span>
      </div>

      {/* Play Mode Indicator */}
      {isPlaying && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-medium text-green-600">
            {isPaused ? 'PAUSED' : 'PLAYING'}
          </span>
        </div>
      )}
    </div>
  )
}
