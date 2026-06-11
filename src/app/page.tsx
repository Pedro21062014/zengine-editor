'use client'

import { useGameStore, type EditorTab } from '@/lib/game-store'
import SceneHierarchy from '@/components/editor/SceneHierarchy'
import PropertiesPanel from '@/components/editor/PropertiesPanel'
import Viewport3D from '@/components/editor/Viewport3D'
import CodeEditorPanel from '@/components/editor/CodeEditorPanel'
import AIPanel from '@/components/editor/AIPanel'
import GamePreview from '@/components/editor/GamePreview'
import { Toolbar } from '@/components/editor/Toolbar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Box,
  Code2,
  Bot,
  Play,
} from 'lucide-react'

// ============================================================================
// Tab definitions
// ============================================================================

const editorTabs: { id: EditorTab; label: string; icon: React.ElementType }[] = [
  { id: 'scene', label: 'Scene', icon: Box },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'preview', label: 'Preview', icon: Play },
]

// ============================================================================
// Main Page
// ============================================================================

export default function Home() {
  const activeTab = useGameStore((s) => s.editor.activeTab)
  const setEditorState = useGameStore((s) => s.setEditorState)
  const objectCount = useGameStore((s) =>
    s.project.scenes.reduce((acc, sc) => acc + sc.objects.length, 0)
  )
  const fileCount = useGameStore((s) => s.codeFiles.length)

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Scene Hierarchy (always visible) */}
        <div className="w-64 min-w-[200px] max-w-[300px] border-r border-border flex-shrink-0">
          <SceneHierarchy />
        </div>

        {/* Center - Tabbed Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setEditorState({ activeTab: v as EditorTab })}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Tab Bar */}
            <div className="flex items-center border-b border-border bg-muted/30 px-2">
              <TabsList className="bg-transparent h-8 p-0 gap-0">
                {editorTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <TabsContent value="scene" className="flex-1 m-0 overflow-hidden">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={100} minSize={30}>
                  <Viewport3D className="w-full h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
              <CodeEditorPanel />
            </TabsContent>

            <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
              <AIPanel />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <GamePreview />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Properties (always visible) */}
        <div className="w-72 min-w-[220px] max-w-[380px] border-l border-border flex-shrink-0">
          <PropertiesPanel />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center h-6 px-3 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
        <span className="font-medium">ZEngine Editor</span>
        <span className="mx-2">|</span>
        <span>v1.0.0</span>
        <span className="mx-2">|</span>
        <span>Three.js + WebGL</span>
        <div className="flex-1" />
        <span className="mr-2">
          {objectCount} objects
        </span>
        <span className="mr-2">
          {fileCount} files
        </span>
        <span>Ready</span>
      </footer>
    </div>
  )
}
