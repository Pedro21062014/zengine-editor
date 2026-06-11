'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore, selectActiveScene, selectSelectedObject } from '@/lib/game-store';
import type { CodeFile, CodeLanguage } from '@/lib/game-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileCode,
  Plus,
  Trash2,
  Save,
  Play,
  FolderTree,
  X,
  Download,
  ChevronRight,
  ChevronDown,
  File,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Language map for Monaco
// ---------------------------------------------------------------------------
const LANGUAGE_MAP: Record<CodeLanguage, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  lua: 'lua',
  csharp: 'csharp',
  glsl: 'glsl',
};

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  lua: 'Lua',
  csharp: 'C#',
  glsl: 'GLSL',
};

const LANGUAGE_EXTENSIONS: Record<CodeLanguage, string> = {
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  lua: '.lua',
  csharp: '.cs',
  glsl: '.glsl',
};

// ---------------------------------------------------------------------------
// File tree node
// ---------------------------------------------------------------------------
interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: FileTreeNode[];
  file?: CodeFile;
}

function buildFileTree(files: CodeFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existingNode = current.find((n) => n.name === part && !isLast === !n.isDir);
      if (existingNode) {
        current = existingNode.children;
      } else if (!isLast) {
        const dirNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: true,
          children: [],
        };
        current.push(dirNode);
        current = dirNode.children;
      } else {
        current.push({
          name: part,
          path: file.path,
          isDir: false,
          children: [],
          file,
        });
      }
    }
  }
  // Sort: directories first, then files, alphabetical within each group
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: sortNodes(node.children),
    }));
  };
  return sortNodes(root);
}

// ---------------------------------------------------------------------------
// FileTreeItem component
// ---------------------------------------------------------------------------
function FileTreeItem({
  node,
  depth,
  activeFileId,
  onSelectFile,
  onDeleteFile,
}: {
  node: FileTreeNode;
  depth: number;
  activeFileId: string | null;
  onSelectFile: (file: CodeFile) => void;
  onDeleteFile: (fileId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          className="flex w-full items-center gap-1 rounded-sm px-2 py-1 text-sm hover:bg-accent/50 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <FolderTree className="size-3.5 shrink-0 text-amber-500" />
          <span className="truncate text-muted-foreground">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
            />
          ))}
      </div>
    );
  }

  const isActive = node.file?.id === activeFileId;

  return (
    <div
      className={`group flex items-center gap-1 rounded-sm px-2 py-1 text-sm cursor-pointer transition-colors ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => node.file && onSelectFile(node.file)}
    >
      <FileCode className="size-3.5 shrink-0 text-emerald-500" />
      <span className="truncate flex-1">{node.name}</span>
      {node.file && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(node.file!.id);
          }}
          title="Delete file"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CodeEditorPanel
// ---------------------------------------------------------------------------
export default function CodeEditorPanel() {
  const codeFiles = useGameStore((s) => s.codeFiles);
  const addCodeFile = useGameStore((s) => s.addCodeFile);
  const removeCodeFile = useGameStore((s) => s.removeCodeFile);
  const updateCodeFile = useGameStore((s) => s.updateCodeFile);
  const selectedObjectId = useGameStore((s) => s.editor.selectedObjectId);
  const scenes = useGameStore((s) => s.project.scenes);
  const activeSceneId = useGameStore((s) => s.project.activeSceneId);
  const updateGameObject = useGameStore((s) => s.updateGameObject);

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState<CodeLanguage>('typescript');
  const [newFilePath, setNewFilePath] = useState('scripts/');
  const [isCompiling, setIsCompiling] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  // Resolve the active scene and selected object
  const activeScene = scenes.find((s) => s.id === activeSceneId);
  const selectedObject = activeScene?.objects.find((o) => o.id === selectedObjectId);

  const openFileTab = useCallback(
    (fileId: string) => {
      setActiveFileId(fileId);
      setOpenTabs((prev) => {
        if (prev.includes(fileId)) return prev;
        return [...prev, fileId];
      });
    },
    []
  );

  // When a game object is selected and has a script, open or switch to its script file
  useEffect(() => {
    if (selectedObject && selectedObject.script) {
      const scriptFileId = selectedObject.script;
      const file = codeFiles.find((f) => f.id === scriptFileId);
      if (file) {
        openFileTab(file.id);
      }
    }
  }, [selectedObjectId, codeFiles, openFileTab]);

  // Auto-select first file if no active file
  useEffect(() => {
    if (!activeFileId && codeFiles.length > 0 && openTabs.length === 0) {
      openFileTab(codeFiles[0].id);
    }
  }, [codeFiles, activeFileId, openTabs.length, openFileTab]);

  const closeTab = useCallback(
    (fileId: string) => {
      const newTabs = openTabs.filter((id) => id !== fileId);
      setOpenTabs(newTabs);
      if (activeFileId === fileId) {
        setActiveFileId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
      }
    },
    [openTabs, activeFileId]
  );

  const activeFile = codeFiles.find((f) => f.id === activeFileId) ?? null;

  // Save file handler — Ctrl+S
  const saveFile = useCallback(() => {
    if (!activeFile || !editorRef.current) return;
    const currentValue = editorRef.current.getValue();
    updateCodeFile(activeFile.id, { content: currentValue });

    // If this file is the script of the selected game object, also update the object
    if (selectedObject && selectedObject.script === activeFile.id) {
      // The script field on the object is the file ID, so no content change needed there
      // But the code file content is updated via updateCodeFile above
    }

    toast.success(`Saved ${activeFile.name}`);
  }, [activeFile, updateCodeFile, selectedObject]);

  // Register Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add Ctrl+S keybinding inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });

    // Configure dark theme for Monaco
    monaco.editor.defineTheme('game-editor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.lineHighlightBackground': '#2a2d3e',
        'editorCursor.foreground': '#d4d4d4',
        'editor.inactiveSelectionBackground': '#3a3d4e',
      },
    });
    monaco.editor.setTheme('game-editor-dark');
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!activeFileId || value === undefined) return;
      // Update store on change (debounced by Monaco)
      updateCodeFile(activeFileId, { content: value });
    },
    [activeFileId, updateCodeFile]
  );

  // Add new file
  const handleAddFile = () => {
    if (!newFileName.trim()) {
      toast.error('File name is required');
      return;
    }

    const fileName = newFileName.includes('.')
      ? newFileName
      : `${newFileName}${LANGUAGE_EXTENSIONS[newFileLanguage]}`;

    const path = newFilePath.endsWith('/')
      ? `${newFilePath}${fileName}`
      : `${newFilePath}/${fileName}`;

    const newFile: CodeFile = {
      id: uuidv4(),
      name: fileName,
      language: newFileLanguage,
      content: getBoilerplate(newFileLanguage, fileName),
      path,
    };

    addCodeFile(newFile);
    openFileTab(newFile.id);

    // Reset form
    setNewFileName('');
    setNewFilePath('scripts/');
    setNewFileLanguage('typescript');
    setAddDialogOpen(false);
    toast.success(`Created ${fileName}`);
  };

  // Delete file
  const handleDeleteFile = (fileId: string) => {
    const file = codeFiles.find((f) => f.id === fileId);
    if (!file) return;
    removeCodeFile(fileId);
    closeTab(fileId);
    toast.success(`Deleted ${file.name}`);
  };

  // Export / Compile
  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      // Simulate a compile/export process
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const totalLines = codeFiles.reduce((acc, f) => acc + f.content.split('\n').length, 0);
      toast.success(`Compiled ${codeFiles.length} file(s), ${totalLines} total lines`);
    } catch {
      toast.error('Compilation failed');
    } finally {
      setIsCompiling(false);
    }
  };

  // Build file tree
  const fileTree = buildFileTree(codeFiles);

  // Get the monaco language ID for the active file
  const monacoLanguage = activeFile ? LANGUAGE_MAP[activeFile.language] : 'plaintext';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full bg-background">
        {/* File Tree Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-56 border-r flex flex-col bg-muted/30 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Explorer
              </span>
              <div className="flex items-center gap-1">
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-6">
                      <Plus className="size-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>New File</DialogTitle>
                      <DialogDescription>
                        Create a new script file for your project.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="file-name">File Name</Label>
                        <Input
                          id="file-name"
                          placeholder="PlayerController"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddFile();
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="file-language">Language</Label>
                        <Select
                          value={newFileLanguage}
                          onValueChange={(val) => setNewFileLanguage(val as CodeLanguage)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.entries(LANGUAGE_LABELS) as [CodeLanguage, string][]
                            ).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="file-path">Path</Label>
                        <Input
                          id="file-path"
                          placeholder="scripts/"
                          value={newFilePath}
                          onChange={(e) => setNewFilePath(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddFile}>Create File</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="py-1">
                {fileTree.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <File className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">No files yet</p>
                    <p className="text-xs text-muted-foreground/70">
                      Click + to create a file
                    </p>
                  </div>
                ) : (
                  fileTree.map((node) => (
                    <FileTreeItem
                      key={node.path}
                      node={node}
                      depth={0}
                      activeFileId={activeFileId}
                      onSelectFile={(file) => openFileTab(file.id)}
                      onDeleteFile={handleDeleteFile}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar + Toolbar */}
          <div className="flex items-center border-b bg-muted/20 shrink-0">
            {/* Sidebar toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  <FolderTree className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Explorer</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Tabs */}
            <ScrollArea className="flex-1">
              <div className="flex items-center h-9">
                {openTabs.map((tabId) => {
                  const file = codeFiles.find((f) => f.id === tabId);
                  if (!file) return null;
                  const isActive = tabId === activeFileId;
                  return (
                    <div
                      key={tabId}
                      className={`group flex items-center gap-1.5 px-3 h-full cursor-pointer border-r text-xs whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-background text-foreground border-b-2 border-b-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                      onClick={() => setActiveFileId(tabId)}
                    >
                      <FileCode className="size-3 shrink-0 text-emerald-500" />
                      <span>{file.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tabId);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-1 px-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={saveFile}
                    disabled={!activeFile}
                  >
                    <Save className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save (Ctrl+S)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleCompile}
                    disabled={isCompiling || codeFiles.length === 0}
                  >
                    {isCompiling ? (
                      <div className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compile / Export</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      const content = codeFiles.map((f) => `// File: ${f.path}\n${f.content}`).join('\n\n// ─────────────────────────────\n\n');
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'project-export.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Project exported');
                    }}
                    disabled={codeFiles.length === 0}
                  >
                    <Download className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Project</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Selected Object Indicator */}
          {selectedObject && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 border-b text-xs text-muted-foreground">
              <FileCode className="size-3" />
              <span>
                Editing script for: <strong className="text-foreground">{selectedObject.name}</strong>
              </span>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 min-h-0">
            {activeFile ? (
              <Editor
                key={activeFile.id}
                height="100%"
                language={monacoLanguage}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="game-editor-dark"
                options={{
                  minimap: { enabled: true, maxColumn: 80 },
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                  fontLigatures: true,
                  tabSize: 2,
                  renderLineHighlight: 'all',
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    indentation: true,
                  },
                  scrollBeyondLastLine: false,
                  padding: { top: 8 },
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  formatOnPaste: true,
                  suggest: {
                    showKeywords: true,
                    showSnippets: true,
                  },
                }}
                loading={
                  <div className="flex items-center justify-center h-full bg-[#1e1e2e] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading editor...</span>
                    </div>
                  </div>
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-[#1e1e2e] text-muted-foreground">
                <div className="text-center space-y-3">
                  <FileCode className="size-12 mx-auto opacity-30" />
                  <div>
                    <p className="text-sm font-medium">No file open</p>
                    <p className="text-xs mt-1 opacity-70">
                      Select a file from the explorer or create a new one
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-3 py-1 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              {activeFile && (
                <>
                  <span>{LANGUAGE_LABELS[activeFile.language]}</span>
                  <span>UTF-8</span>
                  <span>{activeFile.path}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeFile && (
                <>
                  <span>
                    Ln{' '}
                    {editorRef.current?.getPosition()?.lineNumber ?? 1}, Col{' '}
                    {editorRef.current?.getPosition()?.column ?? 1}
                  </span>
                  <span>{codeFiles.length} file(s)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Boilerplate code templates for new files
// ---------------------------------------------------------------------------
function getBoilerplate(language: CodeLanguage, fileName: string): string {
  const className = fileName.replace(/\.\w+$/, '');

  switch (language) {
    case 'javascript':
      return `// ${fileName}
// JavaScript game script

class ${className} {
  constructor() {
    this.enabled = true;
  }

  onStart() {
    console.log('${className} started');
  }

  onUpdate(deltaTime) {
    // Called every frame
  }

  onDestroy() {
    // Cleanup
  }
}

module.exports = ${className};
`;

    case 'typescript':
      return `// ${fileName}
// TypeScript game script

interface ${className}Config {
  enabled: boolean;
  speed: number;
}

class ${className} {
  public enabled: boolean = true;
  private config: ${className}Config;

  constructor(config?: Partial<${className}Config>) {
    this.config = { enabled: true, speed: 1.0, ...config };
  }

  onStart(): void {
    console.log('${className} started');
  }

  onUpdate(deltaTime: number): void {
    // Called every frame
  }

  onDestroy(): void {
    // Cleanup
  }
}

export default ${className};
`;

    case 'python':
      return `# ${fileName}
# Python game script

class ${className}:
    """Game script component."""

    def __init__(self):
        self.enabled = True

    def on_start(self):
        """Called when the script starts."""
        print("${className} started")

    def on_update(self, delta_time: float):
        """Called every frame."""
        pass

    def on_destroy(self):
        """Called when the script is destroyed."""
        pass
`;

    case 'lua':
      return `-- ${fileName}
-- Lua game script

local ${className} = {}
${className}.__index = ${className}

function ${className}.new()
    local self = setmetatable({}, ${className})
    self.enabled = true
    return self
end

function ${className}:onStart()
    print("${className} started")
end

function ${className}:onUpdate(deltaTime)
    -- Called every frame
end

function ${className}:onDestroy()
    -- Cleanup
end

return ${className}
`;

    case 'csharp':
      return `// ${fileName}
// C# game script

using System;

public class ${className} : MonoBehaviour
{
    public bool Enabled = true;

    void Start()
    {
        Console.WriteLine("${className} started");
    }

    void Update()
    {
        // Called every frame
        float deltaTime = Time.deltaTime;
    }

    void OnDestroy()
    {
        // Cleanup
    }
}
`;

    case 'glsl':
      return `// ${fileName}
// GLSL shader

#ifdef VERTEX
uniform mat4 modelViewProjection;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTexCoord;

out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    vNormal = aNormal;
    vTexCoord = aTexCoord;
    gl_Position = modelViewProjection * vec4(aPosition, 1.0);
}
#endif

#ifdef FRAGMENT
uniform vec3 uColor;
uniform float uTime;

in vec3 vNormal;
in vec2 vTexCoord;

out vec4 fragColor;

void main() {
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normalize(vNormal), light), 0.0);
    vec3 color = uColor * (0.3 + 0.7 * diff);
    fragColor = vec4(color, 1.0);
}
#endif
`;

    default:
      return `// ${fileName}\n`;
  }
}
