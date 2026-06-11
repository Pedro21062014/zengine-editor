'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGameStore } from '@/lib/game-store';
import type { AIConfig, AIProvider, CodeLanguage } from '@/lib/game-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bot,
  Send,
  Settings,
  Copy,
  Code,
  Sparkles,
  Eye,
  EyeOff,
  User,
  Loader2,
  Check,
  FileCode,
  MessageSquare,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

type AIViewTab = 'chat' | 'settings';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  custom: 'Custom',
};

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3.5-sonnet-20241022'],
  google: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  custom: [],
};

// Map language names for syntax highlighter
const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  lua: 'lua',
  csharp: 'csharp',
  glsl: 'glsl',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  cs: 'csharp',
};

// ---------------------------------------------------------------------------
// CodeBlock component for rendering code in AI responses
// ---------------------------------------------------------------------------
function CodeBlock({
  language,
  code,
  onCopyToEditor,
}: {
  language: string;
  code: string;
  onCopyToEditor: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied to clipboard');
  };

  const syntaxLang = LANG_MAP[language?.toLowerCase()] || language || 'text';

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-muted/80 px-3 py-1.5 border-b border-border/50">
        <span className="text-xs text-muted-foreground font-medium">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3 text-green-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy code</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => onCopyToEditor(code)}
              >
                <FileCode className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert into editor</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {/* Code content */}
      <SyntaxHighlighter
        language={syntaxLang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          fontSize: '12px',
          lineHeight: '1.5',
          background: '#1e1e2e',
        }}
        showLineNumbers={true}
        lineNumberStyle={{ color: '#555', minWidth: '2em' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AIPanel Component
// ---------------------------------------------------------------------------
export default function AIPanel() {
  const aiConfig = useGameStore((s) => s.aiConfig);
  const updateAIConfig = useGameStore((s) => s.updateAIConfig);
  const codeFiles = useGameStore((s) => s.codeFiles);
  const updateCodeFile = useGameStore((s) => s.updateCodeFile);
  const addCodeFile = useGameStore((s) => s.addCodeFile);

  const [activeTab, setActiveTab] = useState<AIViewTab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Copy code into the active file in the code editor
  const handleCopyToEditor = useCallback(
    (code: string) => {
      if (codeFiles.length === 0) {
        // No files exist yet — create a new one
        const newFile = {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          name: 'AI_Generated.ts',
          language: 'typescript' as CodeLanguage,
          content: code,
          path: 'scripts/AI_Generated.ts',
        };
        addCodeFile(newFile);
        toast.success('Created new file with AI-generated code');
      } else {
        // Append to the first file or replace — user choice is to insert into the most recently active
        // We'll update the first file for simplicity
        const targetFile = codeFiles[0];
        updateCodeFile(targetFile.id, { content: code });
        toast.success(`Code inserted into ${targetFile.name}`);
      }
    },
    [codeFiles, addCodeFile, updateCodeFile]
  );

  // Send message to AI
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!aiConfig.apiKey && aiConfig.provider !== 'custom') {
        toast.error('Please set your API key in the settings');
        setActiveTab('settings');
        return;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        // Build the messages array for the API
        const apiMessages = [
          {
            role: 'system' as const,
            content:
              aiConfig.systemPrompt ||
              'You are a helpful game development assistant. Write clean, well-commented code. When providing code examples, always use fenced code blocks with the language specified.',
          },
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          { role: 'user' as const, content: content.trim() },
        ];

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            config: {
              provider: aiConfig.provider,
              apiKey: aiConfig.apiKey,
              model: aiConfig.model,
              baseUrl: aiConfig.baseUrl,
              temperature: aiConfig.temperature,
              maxTokens: aiConfig.maxTokens,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API returned ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          role: 'assistant',
          content: data.content || data.message || 'No response received.',
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          role: 'assistant',
          content: `⚠️ **Error:** ${errorMessage}\n\nPlease check your API settings and try again.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        toast.error('AI request failed');
      } finally {
        setIsLoading(false);
      }
    },
    [aiConfig, messages]
  );

  // Generate Script — ask AI to create a game script
  const handleGenerateScript = useCallback(() => {
    const prompt =
      'Generate a complete game script component. Include initialization, update loop, and cleanup methods. Use best practices and add helpful comments.';
    sendMessage(prompt);
  }, [sendMessage]);

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  // Handle key down in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage]
  );

  // Clear chat
  const handleClearChat = useCallback(() => {
    setMessages([]);
    toast.success('Chat cleared');
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full bg-background">
        {/* Tab Switcher Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="size-3.5" />
              Chat
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setActiveTab('settings')}
            >
              <Wrench className="size-3.5" />
              Settings
            </Button>
          </div>
          {activeTab === 'chat' && messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleClearChat}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            {/* Messages Area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Bot className="size-8 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground max-w-[250px] mb-6">
                      Ask questions about game development, generate scripts, or debug your code.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={handleGenerateScript}
                        disabled={isLoading}
                      >
                        <Sparkles className="size-3" />
                        Generate Script
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => sendMessage('Explain how to create a player controller with movement and jumping')}
                        disabled={isLoading}
                      >
                        <Code className="size-3" />
                        Player Controller
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => sendMessage('How do I implement collision detection in a 3D game?')}
                        disabled={isLoading}
                      >
                        <Bot className="size-3" />
                        Collision Help
                      </Button>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 border border-border/50'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:text-primary prose-code:before:content-[''] prose-code:after:content-['']">
                          <ReactMarkdown
                            components={{
                              code(props) {
                                const { children, className, ...rest } = props;
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');

                                // If it's a fenced code block with a language tag
                                if (match) {
                                  return (
                                    <CodeBlock
                                      language={match[1]}
                                      code={codeString}
                                      onCopyToEditor={handleCopyToEditor}
                                    />
                                  );
                                }

                                // Check if it's a multi-line code block (no language tag)
                                if (codeString.includes('\n')) {
                                  return (
                                    <CodeBlock
                                      language="text"
                                      code={codeString}
                                      onCopyToEditor={handleCopyToEditor}
                                    />
                                  );
                                }

                                // Inline code
                                return (
                                  <code
                                    className={className}
                                    {...rest}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="size-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="bg-muted/50 border border-border/50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-t bg-muted/20 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleGenerateScript}
                disabled={isLoading}
              >
                <Sparkles className="size-3" />
                Generate Script
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() =>
                  sendMessage(
                    'Review the following code and suggest improvements:\n\n' +
                    (codeFiles.length > 0
                      ? codeFiles[0].content.slice(0, 500)
                      : '// No code files yet')
                  )
                }
                disabled={isLoading || codeFiles.length === 0}
              >
                <Code className="size-3" />
                Review Code
              </Button>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isLoading
                        ? 'Waiting for response...'
                        : 'Ask AI anything about game development...'
                    }
                    disabled={isLoading}
                    rows={1}
                    className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] max-h-[120px]"
                    style={{
                      height: 'auto',
                      overflow: 'hidden',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-5">
              {/* Provider Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="size-4" />
                    Provider Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Provider */}
                  <div className="space-y-2">
                    <Label className="text-xs">Provider</Label>
                    <Select
                      value={aiConfig.provider}
                      onValueChange={(val) =>
                        updateAIConfig({ provider: val as AIProvider })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(PROVIDER_LABELS) as [AIProvider, string][]
                        ).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label className="text-xs">API Key</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={aiConfig.apiKey}
                        onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                        className="pr-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 size-9"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <Label className="text-xs">Model</Label>
                    {PROVIDER_MODELS[aiConfig.provider].length > 0 ? (
                      <Select
                        value={aiConfig.model}
                        onValueChange={(val) => updateAIConfig({ model: val })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDER_MODELS[aiConfig.provider].map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="gpt-4"
                        value={aiConfig.model}
                        onChange={(e) => updateAIConfig({ model: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Base URL (for custom provider) */}
                  {aiConfig.provider === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Base URL</Label>
                      <Input
                        placeholder="https://api.example.com/v1"
                        value={aiConfig.baseUrl}
                        onChange={(e) => updateAIConfig({ baseUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the base URL for your custom API endpoint.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generation Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Generation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Temperature</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {aiConfig.temperature.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[aiConfig.temperature]}
                      min={0}
                      max={2}
                      step={0.05}
                      onValueChange={(val) =>
                        updateAIConfig({ temperature: val[0] })
                      }
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <Label className="text-xs">Max Tokens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={128000}
                      value={aiConfig.maxTokens}
                      onChange={(e) =>
                        updateAIConfig({
                          maxTokens: parseInt(e.target.value) || 2048,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of tokens in the AI response.
                    </p>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label className="text-xs">System Prompt</Label>
                    <textarea
                      value={aiConfig.systemPrompt}
                      onChange={(e) =>
                        updateAIConfig({ systemPrompt: e.target.value })
                      }
                      placeholder="You are a helpful game development assistant..."
                      rows={3}
                      className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      Instructions given to the AI about how to behave.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div
                      className={`size-2 rounded-full ${
                        aiConfig.apiKey ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                    <span>
                      {aiConfig.apiKey
                        ? `Connected to ${PROVIDER_LABELS[aiConfig.provider]} (${aiConfig.model})`
                        : 'No API key configured — set your key above to start chatting'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  );
}
