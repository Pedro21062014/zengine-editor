import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIConfigPayload {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  config: AIConfigPayload;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, config } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: 'AI configuration is required' },
        { status: 400 }
      );
    }

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    let responseContent: string;

    switch (config.provider) {
      case 'openai':
        responseContent = await callOpenAI(messages, config);
        break;
      case 'anthropic':
        responseContent = await callAnthropic(messages, config);
        break;
      case 'google':
        responseContent = await callGoogle(messages, config);
        break;
      case 'custom':
        responseContent = await callCustom(messages, config);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${config.provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ content: responseContent });
  } catch (error) {
    console.error('AI Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// OpenAI API
// ---------------------------------------------------------------------------
async function callOpenAI(messages: ChatMessage[], config: AIConfigPayload): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from OpenAI';
}

// ---------------------------------------------------------------------------
// Anthropic API
// ---------------------------------------------------------------------------
async function callAnthropic(messages: ChatMessage[], config: AIConfigPayload): Promise<string> {
  // Anthropic requires the system prompt as a top-level field
  const systemMessage = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: config.maxTokens ?? 2048,
      system: systemMessage?.content || '',
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'No response from Anthropic';
}

// ---------------------------------------------------------------------------
// Google Gemini API
// ---------------------------------------------------------------------------
async function callGoogle(messages: ChatMessage[], config: AIConfigPayload): Promise<string> {
  const model = config.model || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === 'system');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 2048,
      },
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } }
        : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Google API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Google';
}

// ---------------------------------------------------------------------------
// Custom API (OpenAI-compatible)
// ---------------------------------------------------------------------------
async function callCustom(messages: ChatMessage[], config: AIConfigPayload): Promise<string> {
  if (!config.baseUrl) {
    throw new Error('Base URL is required for custom provider');
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model || 'default',
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Custom API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();

  // Try OpenAI-compatible response format first
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  // Try Anthropic-compatible response format
  if (data.content?.[0]?.text) {
    return data.content[0].text;
  }

  // Try Google-compatible response format
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  // Fallback: return the whole response as a string
  return JSON.stringify(data);
}
