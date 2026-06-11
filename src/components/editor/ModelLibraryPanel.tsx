'use client'

import { useState, useCallback, useRef } from 'react'
import { useGameStore, type ModelAsset, type ModelAPIConfig } from '@/lib/game-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Download,
  Settings,
  Upload,
  Grid3X3,
  List,
  Loader2,
  Box,
  Eye,
  X,
  Key,
  Server,
  RefreshCw,
  Package,
  Trash2,
} from 'lucide-react'

// ============================================================================
// Model Card
// ============================================================================

function ModelCard({
  model,
  onImport,
  isImporting,
}: {
  model: ModelAsset & { downloadable?: boolean }
  onImport: (model: ModelAsset) => void
  isImporting: boolean
}) {
  const formatColor: Record<string, string> = {
    glb: 'bg-green-500/15 text-green-500',
    gltf: 'bg-blue-500/15 text-blue-500',
    obj: 'bg-orange-500/15 text-orange-500',
    fbx: 'bg-purple-500/15 text-purple-500',
    stl: 'bg-red-500/15 text-red-500',
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatVerts = (n: number) => {
    if (n === 0) return 'N/A'
    if (n < 1000) return `${n}`
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`
    return `${(n / 1000000).toFixed(1)}M`
  }

  return (
    <Card className="group overflow-hidden border border-border hover:border-primary/40 transition-all duration-200">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted/50 relative overflow-hidden">
        {model.thumbnailUrl ? (
          <img
            src={model.thumbnailUrl}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Format badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              formatColor[model.format] || 'bg-gray-500/15 text-gray-500'
            }`}
          >
            {model.format.toUpperCase()}
          </span>
        </div>
        {/* Source badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white">
            {model.source}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium truncate" title={model.name}>
          {model.name}
        </h4>
        {model.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {model.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          <span>{model.author}</span>
          <span>|</span>
          <span>{formatVerts(model.vertices)} verts</span>
          <span>|</span>
          <span>{formatSize(model.fileSize)}</span>
        </div>
        {/* Tags */}
        {model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {model.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[9px] h-4 px-1.5"
              >
                {tag}
              </Badge>
            ))}
            {model.tags.length > 3 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                +{model.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        {/* Import button */}
        <Button
          size="sm"
          className="w-full mt-3 h-7 text-xs gap-1.5"
          onClick={() => onImport(model)}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              Import to Scene
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}

// ============================================================================
// API Settings Panel
// ============================================================================

function APISettings({
  config,
  onUpdate,
  onClose,
}: {
  config: ModelAPIConfig
  onUpdate: (updates: Partial<ModelAPIConfig>) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 bg-background z-20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">API Settings</h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium flex items-center gap-1.5">
            <Server className="w-3 h-3" /> Provider
          </label>
          <Select
            value={config.provider}
            onValueChange={(v) => onUpdate({ provider: v as ModelAPIConfig['provider'] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sketchfab">Sketchfab</SelectItem>
              <SelectItem value="poly">Poly Pizza</SelectItem>
              <SelectItem value="custom">Custom API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium flex items-center gap-1.5">
            <Key className="w-3 h-3" /> API Key
            {config.provider === 'sketchfab' && (
              <span className="text-muted-foreground">(optional for free models)</span>
            )}
          </label>
          <Input
            type="password"
            placeholder="Enter API key..."
            value={config.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        {/* Custom Base URL */}
        {config.provider === 'custom' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <Server className="w-3 h-3" /> Base URL
            </label>
            <Input
              placeholder="https://api.example.com/v1"
              value={config.baseUrl}
              onChange={(e) => onUpdate({ baseUrl: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        )}

        {/* Info */}
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p><strong>Sketchfab:</strong> Free models available without API key. Key enables download access.</p>
          <p><strong>Poly Pizza:</strong> Free 3D models. No API key required.</p>
          <p><strong>Custom:</strong> Connect to your own model hosting API.</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Model Library Panel
// ============================================================================

export default function ModelLibraryPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [models, setModels] = useState<(ModelAsset & { downloadable?: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSettings, setShowSettings] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const modelAPIConfig = useGameStore((s) => s.modelAPIConfig)
  const updateModelAPIConfig = useGameStore((s) => s.updateModelAPIConfig)
  const addGameObject = useGameStore((s) => s.addGameObject)
  const addImportedModel = useGameStore((s) => s.addImportedModel)
  const addDebugMessage = useGameStore((s) => s.addDebugMessage)
  const setIsLoadingModel = useGameStore((s) => s.setIsLoadingModel)

  // ---- Search models ----
  const searchModels = useCallback(
    async (query: string, pageNum: number = 1) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          q: query,
          provider: modelAPIConfig.provider,
          apiKey: modelAPIConfig.apiKey,
          page: String(pageNum),
        })

        if (modelAPIConfig.provider === 'custom' && modelAPIConfig.baseUrl) {
          params.set('baseUrl', modelAPIConfig.baseUrl)
        }

        const response = await fetch(`/api/models?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch models')
        }

        if (pageNum === 1) {
          setModels(data.models || [])
        } else {
          setModels((prev) => [...prev, ...(data.models || [])])
        }
        setHasMore(data.hasNext || false)
        setPage(pageNum)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to search models'
        setError(message)
        addDebugMessage({ type: 'error', message: `Model search error: ${message}`, source: 'Models' })
      } finally {
        setIsLoading(false)
      }
    },
    [modelAPIConfig, addDebugMessage]
  )

  // ---- Import model to scene ----
  const importModel = useCallback(
    async (model: ModelAsset) => {
      setImportingId(model.id)
      setIsLoadingModel(true)

      try {
        addDebugMessage({
          type: 'info',
          message: `Importing model: ${model.name} (${model.format.toUpperCase()})`,
          source: 'Models',
        })

        // Add to imported models list
        addImportedModel(model)

        // Create a game object in the scene for this model
        addGameObject({
          name: model.name,
          type: 'custom_model',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: '#888888',
          visible: true,
          locked: false,
          children: [],
          parentId: null,
          properties: {
            modelUrl: model.downloadUrl,
            modelFormat: model.format,
            modelSource: model.source,
            modelId: model.id,
            vertices: model.vertices,
            author: model.author,
          },
          script: '',
          material: 'standard',
          castShadow: true,
          receiveShadow: true,
        })

        addDebugMessage({
          type: 'log',
          message: `Model "${model.name}" added to scene. The 3D model will be loaded when the viewport renders.`,
          source: 'Models',
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to import model'
        addDebugMessage({ type: 'error', message, source: 'Models' })
      } finally {
        setImportingId(null)
        setIsLoadingModel(false)
      }
    },
    [addGameObject, addImportedModel, addDebugMessage, setIsLoadingModel]
  )

  // ---- Upload local model ----
  const handleLocalUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['glb', 'gltf', 'obj', 'fbx', 'stl'].includes(ext || '')) {
        addDebugMessage({
          type: 'error',
          message: `Unsupported format: .${ext}. Supported: .glb, .gltf, .obj, .fbx, .stl`,
          source: 'Models',
        })
        return
      }

      setIsLoadingModel(true)
      addDebugMessage({
        type: 'info',
        message: `Loading local file: ${file.name}`,
        source: 'Models',
      })

      try {
        // Read the file as data URL
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Create model asset
        const modelAsset: ModelAsset = {
          id: `local-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: `Local file: ${file.name}`,
          thumbnailUrl: '',
          downloadUrl: dataUrl,
          format: ext as ModelAsset['format'],
          fileSize: file.size,
          vertices: 0,
          author: 'Local',
          license: 'Own',
          source: 'local',
          tags: ['local', ext || ''],
        }

        addImportedModel(modelAsset)

        // Add game object
        addGameObject({
          name: modelAsset.name,
          type: 'custom_model',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: '#888888',
          visible: true,
          locked: false,
          children: [],
          parentId: null,
          properties: {
            modelUrl: dataUrl,
            modelFormat: ext,
            modelSource: 'local',
            modelId: modelAsset.id,
          },
          script: '',
          material: 'standard',
          castShadow: true,
          receiveShadow: true,
        })

        addDebugMessage({
          type: 'log',
          message: `Local model "${modelAsset.name}" loaded into scene`,
          source: 'Models',
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load local model'
        addDebugMessage({ type: 'error', message, source: 'Models' })
      } finally {
        setIsLoadingModel(false)
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [addGameObject, addImportedModel, addDebugMessage, setIsLoadingModel]
  )

  // ---- Load on mount ----
  const hasLoadedRef = useRef(false)
  if (!hasLoadedRef.current && models.length === 0) {
    hasLoadedRef.current = true
    searchModels('')
  }

  const importedModels = useGameStore((s) => s.importedModels)
  const removeImportedModel = useGameStore((s) => s.removeImportedModel)

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Model Library</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => fileInputRef.current?.click()}
            title="Upload local model"
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.fbx,.stl"
            className="hidden"
            onChange={handleLocalUpload}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowSettings(true)}
            title="API Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search 3D models..."
            className="pl-8 h-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchModels(searchQuery)
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 flex-1"
            onClick={() => searchModels(searchQuery)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Search className="w-3 h-3" />
            )}
            Search
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Error */}
          {error && (
            <div className="mb-3 p-2 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-500">
              {error}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] ml-2"
                onClick={() => searchModels(searchQuery)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {/* Results */}
          {models.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">
                  {models.length} models found
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2">
                  {models.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onImport={importModel}
                      isImporting={importingId === model.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => importModel(model)}
                    >
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {model.thumbnailUrl ? (
                          <img
                            src={model.thumbnailUrl}
                            alt={model.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Box className="w-4 h-4 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{model.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {model.format.toUpperCase()} | {model.author}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        disabled={importingId === model.id}
                      >
                        {importingId === model.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 h-7 text-xs"
                  onClick={() => searchModels(searchQuery, page + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : null}
                  Load More
                </Button>
              )}
            </>
          )}

          {/* Empty state */}
          {!isLoading && models.length === 0 && !error && (
            <div className="text-center py-8">
              <Box className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No models found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try a different search or upload a local model
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && models.length === 0 && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Searching models...</p>
            </div>
          )}
        </div>

        {/* Imported Models Section */}
        {importedModels.length > 0 && (
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Imported Models</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {importedModels.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {importedModels.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 text-xs"
                >
                  <Box className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate">{model.name}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                    {model.format.toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeImportedModel(model.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* API Settings Overlay */}
      {showSettings && (
        <APISettings
          config={modelAPIConfig}
          onUpdate={updateModelAPIConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
