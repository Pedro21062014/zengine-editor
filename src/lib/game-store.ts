import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export type GameObjectType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule'
  | 'ring'
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'tetrahedron'
  | 'torus_knot'
  | 'directional_light'
  | 'point_light'
  | 'spot_light'
  | 'ambient_light'
  | 'camera'
  | 'empty'
  | 'custom_model';

export type MaterialType =
  | 'standard'
  | 'phong'
  | 'lambert'
  | 'basic'
  | 'wireframe';

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type GameObject3D = {
  id: string;
  name: string;
  type: GameObjectType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  visible: boolean;
  locked: boolean;
  children: string[];
  parentId: string | null;
  properties: Record<string, unknown>;
  script: string;
  material: MaterialType;
  castShadow: boolean;
  receiveShadow: boolean;
};

export type EnvironmentState = {
  backgroundColor: string;
  ambientLightIntensity: number;
  fogEnabled: boolean;
  fogDensity: number;
  fogColor: string;
};

export type SceneState = {
  id: string;
  name: string;
  objects: GameObject3D[];
  environment: EnvironmentState;
  gravity: Vector3;
};

export type RenderQuality = 'low' | 'medium' | 'high' | 'ultra';

export type PhysicsEngine = 'none' | 'basic' | 'cannon' | 'ammo' | 'rapier';

export type ProjectSettings = {
  renderQuality: RenderQuality;
  physics: PhysicsEngine;
  shadows: boolean;
  antialiasing: boolean;
  vrSupport: boolean;
  pixelRatio: number;
  toneMapping: 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces';
};

export type ProjectState = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  scenes: SceneState[];
  activeSceneId: string;
  settings: ProjectSettings;
};

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'lua'
  | 'csharp'
  | 'glsl';

export type CodeFile = {
  id: string;
  name: string;
  language: CodeLanguage;
  content: string;
  path: string;
};

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export type AIConfig = {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
};

export type DebugMessageType = 'log' | 'warn' | 'error' | 'info';

export type DebugMessage = {
  id: string;
  type: DebugMessageType;
  message: string;
  timestamp: number;
  source: string;
};

export type ModelFormat = 'glb' | 'gltf' | 'obj' | 'fbx' | 'stl';

export type ModelAsset = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  downloadUrl: string;
  format: ModelFormat;
  fileSize: number;
  vertices: number;
  author: string;
  license: string;
  source: 'sketchfab' | 'poly' | 'custom' | 'local';
  tags: string[];
};

export type ModelAPIConfig = {
  provider: 'sketchfab' | 'poly' | 'custom';
  apiKey: string;
  baseUrl: string;
};

export type EditorTab = 'scene' | 'code' | 'ai' | 'preview' | 'models';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export type EditorPanel =
  | 'hierarchy'
  | 'inspector'
  | 'assets'
  | 'console'
  | 'timeline'
  | 'none';

export type EditorState = {
  selectedObjectId: string | null;
  activePanel: EditorPanel;
  activeTab: EditorTab;
  isPlaying: boolean;
  isPaused: boolean;
  fps: number;
  showGrid: boolean;
  showAxes: boolean;
  snapToGrid: boolean;
  gridSize: number;
  cameraPosition: Vector3;
  gizmoMode: GizmoMode;
};

// ============================================================================
// Full Store State
// ============================================================================

export type GameEditorStore = {
  // Core state slices
  project: ProjectState;
  editor: EditorState;
  codeFiles: CodeFile[];
  aiConfig: AIConfig;
  debugMessages: DebugMessage[];
  modelAPIConfig: ModelAPIConfig;
  importedModels: ModelAsset[];
  isLoadingModel: boolean;

  // Snapshot for play mode — allows resetting the scene after stopping
  sceneSnapshot: SceneState | null;

  // ---- GameObject actions ----
  addGameObject: (object: Omit<GameObject3D, 'id'> & { id?: string }) => void;
  removeGameObject: (objectId: string) => void;
  updateGameObject: (objectId: string, updates: Partial<GameObject3D>) => void;
  selectObject: (objectId: string | null) => void;
  duplicateObject: (objectId: string) => void;

  // ---- Code file actions ----
  addCodeFile: (file: Omit<CodeFile, 'id'> & { id?: string }) => void;
  removeCodeFile: (fileId: string) => void;
  updateCodeFile: (fileId: string, updates: Partial<CodeFile>) => void;

  // ---- AI config actions ----
  setAIConfig: (config: AIConfig) => void;
  updateAIConfig: (updates: Partial<AIConfig>) => void;

  // ---- Debug console actions ----
  addDebugMessage: (message: Omit<DebugMessage, 'id' | 'timestamp'>) => void;
  clearDebugMessages: () => void;

  // ---- Editor state actions ----
  setEditorState: (updates: Partial<EditorState>) => void;

  // ---- Scene actions ----
  setScene: (sceneId: string, updates: Partial<SceneState>) => void;
  addScene: (scene: Omit<SceneState, 'id'> & { id?: string }) => void;
  removeScene: (sceneId: string) => void;
  setActiveScene: (sceneId: string) => void;

  // ---- Play mode actions ----
  togglePlay: () => void;
  togglePause: () => void;
  resetScene: () => void;

  // ---- Model API actions ----
  setModelAPIConfig: (config: ModelAPIConfig) => void;
  updateModelAPIConfig: (updates: Partial<ModelAPIConfig>) => void;
  addImportedModel: (model: ModelAsset) => void;
  removeImportedModel: (modelId: string) => void;
  setIsLoadingModel: (loading: boolean) => void;
};

// ============================================================================
// Default values
// ============================================================================

const defaultVector3: Vector3 = { x: 0, y: 0, z: 0 };

const defaultEnvironment: EnvironmentState = {
  backgroundColor: '#1a1a2e',
  ambientLightIntensity: 0.4,
  fogEnabled: false,
  fogDensity: 0.01,
  fogColor: '#1a1a2e',
};

const defaultSceneId = uuidv4();

const defaultScene: SceneState = {
  id: defaultSceneId,
  name: 'Main Scene',
  objects: [],
  environment: { ...defaultEnvironment },
  gravity: { x: 0, y: -9.81, z: 0 },
};

const defaultProjectId = uuidv4();
const now = new Date().toISOString();

const defaultProject: ProjectState = {
  id: defaultProjectId,
  name: 'Untitled Project',
  description: '',
  createdAt: now,
  updatedAt: now,
  scenes: [{ ...defaultScene, objects: [] }],
  activeSceneId: defaultSceneId,
  settings: {
    renderQuality: 'high',
    physics: 'none',
    shadows: true,
    antialiasing: true,
    vrSupport: false,
    pixelRatio: 1,
    toneMapping: 'aces',
  },
};

const defaultEditor: EditorState = {
  selectedObjectId: null,
  activePanel: 'hierarchy',
  activeTab: 'scene',
  isPlaying: false,
  isPaused: false,
  fps: 0,
  showGrid: true,
  showAxes: true,
  snapToGrid: false,
  gridSize: 1,
  cameraPosition: { x: 5, y: 5, z: 5 },
  gizmoMode: 'translate',
};

const defaultAIConfig: AIConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4',
  baseUrl: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful game development assistant.',
};

const defaultModelAPIConfig: ModelAPIConfig = {
  provider: 'sketchfab',
  apiKey: '',
  baseUrl: 'https://api.sketchfab.com/v3',
};

// ============================================================================
// Helper — deep clone for snapshots
// ============================================================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// Store
// ============================================================================

export const useGameEditorStore = create<GameEditorStore>((set, get) => ({
  // ---- Initial state ----
  project: deepClone(defaultProject),
  editor: { ...defaultEditor },
  codeFiles: [],
  aiConfig: { ...defaultAIConfig },
  debugMessages: [],
  modelAPIConfig: { ...defaultModelAPIConfig },
  importedModels: [],
  isLoadingModel: false,
  sceneSnapshot: null,

  // ---- GameObject actions ----

  addGameObject: (objectData) => {
    const id = objectData.id ?? uuidv4();
    const newObject: GameObject3D = {
      ...objectData,
      id,
      position: { ...objectData.position },
      rotation: { ...objectData.rotation },
      scale: { ...objectData.scale },
      children: [...(objectData.children ?? [])],
      properties: { ...(objectData.properties ?? {}) },
    } as GameObject3D;

    set((state) => {
      const project = { ...state.project };
      const scenes = project.scenes.map((scene) => {
        if (scene.id !== project.activeSceneId) return scene;
        // If the new object has a parentId, add this object's id to parent's children
        const updatedObjects = scene.objects.map((obj) => {
          if (newObject.parentId && obj.id === newObject.parentId) {
            return { ...obj, children: [...obj.children, id] };
          }
          return obj;
        });
        return {
          ...scene,
          objects: [...updatedObjects, newObject],
        };
      });
      return {
        project: { ...project, scenes, updatedAt: new Date().toISOString() },
      };
    });
  },

  removeGameObject: (objectId) => {
    set((state) => {
      const project = { ...state.project };
      const scenes = project.scenes.map((scene) => {
        if (scene.id !== project.activeSceneId) return scene;

        // Find the object to get its parentId
        const objectToRemove = scene.objects.find((o) => o.id === objectId);
        if (!objectToRemove) return scene;

        // Collect all descendant IDs (recursive)
        const descendantIds = new Set<string>();
        const collectDescendants = (parentId: string) => {
          const children = scene.objects.filter((o) => o.parentId === parentId);
          for (const child of children) {
            descendantIds.add(child.id);
            collectDescendants(child.id);
          }
        };
        collectDescendants(objectId);

        // Remove the object and all its descendants
        const idsToRemove = new Set<string>([objectId]);
        descendantIds.forEach((id) => idsToRemove.add(id));
        const updatedObjects = scene.objects
          .filter((obj) => !idsToRemove.has(obj.id))
          .map((obj) => {
            // Remove objectId from any parent's children array
            if (obj.children.includes(objectId)) {
              return {
                ...obj,
                children: obj.children.filter((cid) => cid !== objectId),
              };
            }
            return obj;
          });

        return { ...scene, objects: updatedObjects };
      });

      const editor = { ...state.editor };
      if (editor.selectedObjectId === objectId) {
        editor.selectedObjectId = null;
      }

      return {
        project: { ...project, scenes, updatedAt: new Date().toISOString() },
        editor,
      };
    });
  },

  updateGameObject: (objectId, updates) => {
    set((state) => {
      const project = { ...state.project };
      const scenes = project.scenes.map((scene) => {
        if (scene.id !== project.activeSceneId) return scene;
        const objects = scene.objects.map((obj) => {
          if (obj.id !== objectId) return obj;
          return {
            ...obj,
            ...updates,
            // Deep merge vector types so partial updates like { position: { y: 2 } } still keep x and z
            position: updates.position
              ? { ...obj.position, ...updates.position }
              : obj.position,
            rotation: updates.rotation
              ? { ...obj.rotation, ...updates.rotation }
              : obj.rotation,
            scale: updates.scale
              ? { ...obj.scale, ...updates.scale }
              : obj.scale,
            properties: updates.properties
              ? { ...obj.properties, ...updates.properties }
              : obj.properties,
          };
        });
        return { ...scene, objects };
      });
      return {
        project: { ...project, scenes, updatedAt: new Date().toISOString() },
      };
    });
  },

  selectObject: (objectId) => {
    set((state) => ({
      editor: { ...state.editor, selectedObjectId: objectId },
    }));
  },

  duplicateObject: (objectId) => {
    const state = get();
    const scene = state.project.scenes.find(
      (s) => s.id === state.project.activeSceneId
    );
    if (!scene) return;

    const original = scene.objects.find((o) => o.id === objectId);
    if (!original) return;

    const newId = uuidv4();
    const duplicated: GameObject3D = {
      ...deepClone(original),
      id: newId,
      name: `${original.name} (Copy)`,
      parentId: original.parentId,
      children: [],
      position: {
        x: original.position.x + 1,
        y: original.position.y,
        z: original.position.z,
      },
    };

    set((state) => {
      const project = { ...state.project };
      const scenes = project.scenes.map((scene) => {
        if (scene.id !== project.activeSceneId) return scene;
        const objects = scene.objects.map((obj) => {
          // Add new id to parent's children
          if (duplicated.parentId && obj.id === duplicated.parentId) {
            return { ...obj, children: [...obj.children, newId] };
          }
          return obj;
        });
        return { ...scene, objects: [...objects, duplicated] };
      });
      return {
        project: { ...project, scenes, updatedAt: new Date().toISOString() },
        editor: { ...state.editor, selectedObjectId: newId },
      };
    });
  },

  // ---- Code file actions ----

  addCodeFile: (fileData) => {
    const id = fileData.id ?? uuidv4();
    const newFile: CodeFile = { ...fileData, id };
    set((state) => ({
      codeFiles: [...state.codeFiles, newFile],
    }));
  },

  removeCodeFile: (fileId) => {
    set((state) => ({
      codeFiles: state.codeFiles.filter((f) => f.id !== fileId),
    }));
  },

  updateCodeFile: (fileId, updates) => {
    set((state) => ({
      codeFiles: state.codeFiles.map((f) =>
        f.id === fileId ? { ...f, ...updates } : f
      ),
    }));
  },

  // ---- AI config actions ----

  setAIConfig: (config) => {
    set({ aiConfig: { ...config } });
  },

  updateAIConfig: (updates) => {
    set((state) => ({
      aiConfig: { ...state.aiConfig, ...updates },
    }));
  },

  // ---- Debug console actions ----

  addDebugMessage: (messageData) => {
    const message: DebugMessage = {
      ...messageData,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    set((state) => ({
      debugMessages: [...state.debugMessages, message],
    }));
  },

  clearDebugMessages: () => {
    set({ debugMessages: [] });
  },

  // ---- Editor state actions ----

  setEditorState: (updates) => {
    set((state) => ({
      editor: { ...state.editor, ...updates },
    }));
  },

  // ---- Scene actions ----

  setScene: (sceneId, updates) => {
    set((state) => {
      const scenes = state.project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        return { ...scene, ...updates };
      });
      return {
        project: {
          ...state.project,
          scenes,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  addScene: (sceneData) => {
    const id = sceneData.id ?? uuidv4();
    const newScene: SceneState = {
      ...sceneData,
      id,
      objects: sceneData.objects?.map((o) => ({ ...o })) ?? [],
      environment: { ...sceneData.environment },
      gravity: { ...sceneData.gravity },
    };
    set((state) => ({
      project: {
        ...state.project,
        scenes: [...state.project.scenes, newScene],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  removeScene: (sceneId) => {
    set((state) => {
      const scenes = state.project.scenes.filter((s) => s.id !== sceneId);
      // If the removed scene was active, switch to the first remaining scene
      const activeSceneId =
        state.project.activeSceneId === sceneId && scenes.length > 0
          ? scenes[0].id
          : state.project.activeSceneId;
      return {
        project: {
          ...state.project,
          scenes,
          activeSceneId,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  setActiveScene: (sceneId) => {
    set((state) => {
      const sceneExists = state.project.scenes.some((s) => s.id === sceneId);
      if (!sceneExists) return state;
      return {
        project: {
          ...state.project,
          activeSceneId: sceneId,
          updatedAt: new Date().toISOString(),
        },
        editor: { ...state.editor, selectedObjectId: null },
      };
    });
  },

  // ---- Play mode actions ----

  togglePlay: () => {
    set((state) => {
      const wasPlaying = state.editor.isPlaying;

      if (wasPlaying) {
        // Stopping play mode — restore snapshot
        const snapshot = state.sceneSnapshot;
        if (snapshot) {
          const scenes = state.project.scenes.map((scene) => {
            if (scene.id !== snapshot.id) return scene;
            return deepClone(snapshot);
          });
          return {
            project: {
              ...state.project,
              scenes,
              updatedAt: new Date().toISOString(),
            },
            editor: {
              ...state.editor,
              isPlaying: false,
              isPaused: false,
            },
            sceneSnapshot: null,
          };
        }
        return {
          editor: {
            ...state.editor,
            isPlaying: false,
            isPaused: false,
          },
          sceneSnapshot: null,
        };
      } else {
        // Starting play mode — snapshot the active scene
        const activeScene = state.project.scenes.find(
          (s) => s.id === state.project.activeSceneId
        );
        const snapshot = activeScene ? deepClone(activeScene) : null;
        return {
          editor: {
            ...state.editor,
            isPlaying: true,
            isPaused: false,
          },
          sceneSnapshot: snapshot,
        };
      }
    });
  },

  togglePause: () => {
    set((state) => {
      if (!state.editor.isPlaying) return state;
      return {
        editor: {
          ...state.editor,
          isPaused: !state.editor.isPaused,
        },
      };
    });
  },

  resetScene: () => {
    set((state) => {
      const sceneId = state.project.activeSceneId;
      const scenes = state.project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          objects: [],
          environment: { ...defaultEnvironment },
          gravity: { ...defaultVector3, y: -9.81 },
        };
      });
      return {
        project: {
          ...state.project,
          scenes,
          updatedAt: new Date().toISOString(),
        },
        editor: { ...state.editor, selectedObjectId: null },
        sceneSnapshot: null,
      };
    });
  },

  // ---- Model API actions ----

  setModelAPIConfig: (config) => {
    set({ modelAPIConfig: { ...config } });
  },

  updateModelAPIConfig: (updates) => {
    set((state) => ({
      modelAPIConfig: { ...state.modelAPIConfig, ...updates },
    }));
  },

  addImportedModel: (model) => {
    set((state) => ({
      importedModels: [...state.importedModels, model],
    }));
  },

  removeImportedModel: (modelId) => {
    set((state) => ({
      importedModels: state.importedModels.filter((m) => m.id !== modelId),
    }));
  },

  setIsLoadingModel: (loading) => {
    set({ isLoadingModel: loading });
  },
}));

// ============================================================================
// Convenience selectors
// ============================================================================

/** Get the currently active scene */
export const selectActiveScene = (state: GameEditorStore): SceneState | undefined =>
  state.project.scenes.find((s) => s.id === state.project.activeSceneId);

/** Get a specific game object by ID from the active scene */
export const selectGameObject = (
  state: GameEditorStore,
  objectId: string
): GameObject3D | undefined => {
  const scene = selectActiveScene(state);
  return scene?.objects.find((o) => o.id === objectId);
};

/** Get the currently selected game object */
export const selectSelectedObject = (
  state: GameEditorStore
): GameObject3D | undefined => {
  if (!state.editor.selectedObjectId) return undefined;
  return selectGameObject(state, state.editor.selectedObjectId);
};

// Alias for convenience — other components import useGameStore
export const useGameStore = useGameEditorStore;
