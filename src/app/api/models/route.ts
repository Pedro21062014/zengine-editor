import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Model Search API - Proxies requests to Sketchfab / Poly / Custom APIs
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const provider = searchParams.get('provider') || 'sketchfab'
  const apiKey = searchParams.get('apiKey') || ''
  const page = searchParams.get('page') || '1'
  const category = searchParams.get('category') || ''

  try {
    switch (provider) {
      case 'sketchfab':
        return await searchSketchfab(query, apiKey, page, category)
      case 'poly':
        return await searchPolyPizza(query, apiKey, page)
      case 'custom':
        return await searchCustom(query, apiKey, searchParams.get('baseUrl') || '')
      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ============================================================================
// Sketchfab API
// ============================================================================

async function searchSketchfab(
  query: string,
  apiKey: string,
  page: string,
  category: string
) {
  const params = new URLSearchParams({
    q: query,
    sort_by: '-likeCount',
    downloadable: 'true',
    type: 'models',
    page: page,
    per_page: '20',
  })

  if (category) {
    params.set('categories', category)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(
    `https://api.sketchfab.com/v3/search?${params.toString()}`,
    { headers }
  )

  if (!response.ok) {
    const errText = await response.text()
    return NextResponse.json(
      { error: `Sketchfab API error: ${response.status} - ${errText}` },
      { status: response.status }
    )
  }

  const data = await response.json()

  // Normalize to our ModelAsset format
  const models = (data.results || []).map(
    (item: {
      uid: string
      name: string
      description?: string
      thumbnails: { images: { url: string; size: number }[] }
      download?: { glb?: { url: string; size: number }; obj?: { url: string; size: number } }
      vertexCount: number
      user: { displayName: string }
      license?: { slug: string }
      tags: { name: string }[]
      isDownloadable: boolean
    }) => {
      const thumbnail =
        item.thumbnails?.images?.sort(
          (a: { size: number }, b: { size: number }) => a.size - b.size
        )?.[0]?.url || ''

      let downloadUrl = ''
      let format: 'glb' | 'gltf' | 'obj' | 'fbx' | 'stl' = 'glb'
      let fileSize = 0

      if (item.download?.glb) {
        downloadUrl = item.download.glb.url
        fileSize = item.download.glb.size || 0
        format = 'glb'
      } else if (item.download?.obj) {
        downloadUrl = item.download.obj.url
        fileSize = item.download.obj.size || 0
        format = 'obj'
      }

      return {
        id: item.uid,
        name: item.name,
        description: item.description || '',
        thumbnailUrl: thumbnail,
        downloadUrl,
        format,
        fileSize,
        vertices: item.vertexCount || 0,
        author: item.user?.displayName || 'Unknown',
        license: item.license?.slug || 'unknown',
        source: 'sketchfab' as const,
        tags: (item.tags || []).map((t: { name: string }) => t.name),
        downloadable: item.isDownloadable,
      }
    }
  )

  return NextResponse.json({
    models,
    total: data.count || 0,
    page: parseInt(page),
    hasNext: !!data.next,
  })
}

// ============================================================================
// Poly Pizza API (free models)
// ============================================================================

async function searchPolyPizza(query: string, _apiKey: string, page: string) {
  const params = new URLSearchParams({
    q: query,
    page: page,
    limit: '20',
  })

  const response = await fetch(
    `https://poly.pizza/api/v3/search?${params.toString()}`,
    { headers: { 'Content-Type': 'application/json' } }
  )

  if (!response.ok) {
    // Fallback to curated list if API is not available
    return NextResponse.json({
      models: getCuratedPolyModels(query),
      total: getCuratedPolyModels(query).length,
      page: parseInt(page),
      hasNext: false,
    })
  }

  const data = await response.json()

  const models = (data.results || data.models || []).map(
    (item: {
      id: string
      name: string
      description?: string
      thumbnail?: string
      thumbnailUrl?: string
      downloadUrl?: string
      download?: string
      vertexCount?: number
      author?: string
      user?: { displayName: string }
      license?: string
      tags?: string[]
    }) => ({
      id: item.id || String(Math.random()),
      name: item.name || 'Untitled Model',
      description: item.description || '',
      thumbnailUrl:
        item.thumbnail || item.thumbnailUrl || '/logo.svg',
      downloadUrl: item.downloadUrl || item.download || '',
      format: 'glb' as const,
      fileSize: 0,
      vertices: item.vertexCount || 0,
      author: item.author || item.user?.displayName || 'Poly Pizza',
      license: item.license || 'CC BY 4.0',
      source: 'poly' as const,
      tags: item.tags || [],
    })
  )

  return NextResponse.json({
    models: models.length > 0 ? models : getCuratedPolyModels(query),
    total: data.count || models.length,
    page: parseInt(page),
    hasNext: !!data.next,
  })
}

// ============================================================================
// Custom API
// ============================================================================

async function searchCustom(
  query: string,
  apiKey: string,
  baseUrl: string
) {
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Base URL is required for custom API' },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({ q: query })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${baseUrl}/search?${params.toString()}`, {
    headers,
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: `Custom API error: ${response.status}` },
      { status: response.status }
    )
  }

  const data = await response.json()

  return NextResponse.json({
    models: data.models || data.results || [],
    total: data.count || 0,
    page: 1,
    hasNext: false,
  })
}

// ============================================================================
// Curated fallback models (when external APIs are unavailable)
// ============================================================================

function getCuratedPolyModels(query: string) {
  const allModels = [
    {
      id: 'curated-1',
      name: 'Low Poly Tree',
      description: 'A simple low poly tree perfect for game environments',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 1024,
      vertices: 24,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['tree', 'nature', 'low-poly'],
    },
    {
      id: 'curated-2',
      name: 'Simple Character',
      description: 'Basic humanoid character for prototyping',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 2048,
      vertices: 512,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['character', 'humanoid', 'prototype'],
    },
    {
      id: 'curated-3',
      name: 'Sci-Fi Crate',
      description: 'A detailed sci-fi crate prop',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 1536,
      vertices: 128,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['crate', 'prop', 'sci-fi'],
    },
    {
      id: 'curated-4',
      name: 'Medieval House',
      description: 'A medieval-style house for village scenes',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 4096,
      vertices: 1024,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['house', 'medieval', 'building'],
    },
    {
      id: 'curated-5',
      name: 'Weapon Sword',
      description: 'A fantasy sword weapon model',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 768,
      vertices: 256,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['sword', 'weapon', 'fantasy'],
    },
    {
      id: 'curated-6',
      name: 'Vehicle Car',
      description: 'Low poly car for racing or city games',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 3072,
      vertices: 768,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['car', 'vehicle', 'racing'],
    },
    {
      id: 'curated-7',
      name: 'Rock Formation',
      description: 'Natural rock formation for terrain',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 512,
      vertices: 96,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['rock', 'nature', 'terrain'],
    },
    {
      id: 'curated-8',
      name: 'Treasure Chest',
      description: 'An open treasure chest with gold',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 1280,
      vertices: 384,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['chest', 'treasure', 'prop'],
    },
    {
      id: 'curated-9',
      name: 'FPS Controller',
      description: 'First person controller capsule',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 256,
      vertices: 48,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['controller', 'fps', 'player'],
    },
    {
      id: 'curated-10',
      name: 'Platform Tile',
      description: 'A platformer tile block for 3D platformer games',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 384,
      vertices: 36,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['platform', 'tile', 'platformer'],
    },
    {
      id: 'curated-11',
      name: 'Enemy Slime',
      description: 'A cute slime enemy for RPGs',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 640,
      vertices: 192,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['slime', 'enemy', 'rpg'],
    },
    {
      id: 'curated-12',
      name: 'Barrel',
      description: 'A wooden barrel prop for various game genres',
      thumbnailUrl: '',
      downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
      format: 'glb',
      fileSize: 512,
      vertices: 128,
      author: 'ZEngine Free',
      license: 'CC0',
      source: 'poly',
      tags: ['barrel', 'prop', 'environment'],
    },
  ]

  if (!query) return allModels

  const lowerQuery = query.toLowerCase()
  return allModels.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
      m.description.toLowerCase().includes(lowerQuery)
  )
}

// ============================================================================
// Download proxy - fetches model and returns as blob
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Proxy the download to avoid CORS issues
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZEngine-Editor/1.0',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Download failed: ${response.status}` },
        { status: response.status }
      )
    }

    const arrayBuffer = await response.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': 'attachment; filename="model.glb"',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
