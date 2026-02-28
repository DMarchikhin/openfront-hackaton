'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentAction, ActiveInvestment, ChatMessage } from '@/lib/api';
import { AgentActions } from './AgentActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const QUICK_ACTIONS = ['Check my APY', 'Gas prices', "What's my balance?", 'Explain last action'];

function Md({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-muted rounded p-2 overflow-x-auto text-xs my-2 font-mono">{children}</pre>,
        table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold bg-muted">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        hr: () => <hr className="my-2 border-border" />,
        a: ({ href, children }) => <a href={href} className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

interface AgentChatProps {
  investmentId: string;
  actions: AgentAction[];
  isProcessing: boolean;
  onSendMessage?: (message: string) => void;
  investment: ActiveInvestment | null;
  streamMessages: ChatMessage[];
  isConnected: boolean;
}

// Format a tool name for display: mcp__aave__aave_get_reserves → aave_get_reserves
function formatTool(tool: string): string {
  const parts = tool.split('__');
  return parts[parts.length - 1] ?? tool;
}

function ThinkingMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
  return (
    <div className="text-xs text-muted-foreground italic">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>🧠</span>
        <span className="underline underline-offset-2">{expanded ? 'Agent thinking' : 'Agent thinking...'}</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <p className="mt-1 ml-5 text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
      )}
      {!expanded && (
        <p className="mt-0.5 ml-5 text-muted-foreground/60">{preview}</p>
      )}
    </div>
  );
}

function ToolPill({ message }: { message: ChatMessage }) {
  if (message.type === 'tool_start') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border rounded-full px-3 py-1 w-fit">
        <span className="animate-spin h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full flex-shrink-0" />
        <span>Calling <code className="font-mono">{formatTool(message.tool)}</code>…</span>
      </div>
    );
  }
  if (message.type === 'tool_progress') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border rounded-full px-3 py-1 w-fit">
        <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full flex-shrink-0" />
        <span><code className="font-mono">{formatTool(message.tool)}</code> · {message.elapsed.toFixed(1)}s</span>
      </div>
    );
  }
  if (message.type === 'tool_result') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 w-fit">
        <span>✓</span>
        <span><code className="font-mono">{formatTool(message.tool)}</code> · {message.summary}</span>
      </div>
    );
  }
  return null;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case 'thinking':
      return <ThinkingMessage text={message.text} />;

    case 'text':
      return (
        <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] leading-relaxed shadow-sm">
          <div className="text-sm"><Md>{message.text}</Md></div>
        </div>
      );

    case 'tool_start':
    case 'tool_progress':
    case 'tool_result':
      return <ToolPill message={message} />;

    case 'status':
      return (
        <div className="flex items-center gap-3 text-xs text-muted-foreground py-1">
          <div className="flex-1 h-px bg-border" />
          <span>{message.description}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      );

    case 'result':
      return (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 text-sm text-green-800">
          <div className="font-semibold mb-1 text-green-700">Execution complete</div>
          <div className="text-sm text-green-800"><Md>{message.text}</Md></div>
          {(message.duration != null || message.turns != null) && (
            <div className="flex gap-3 mt-2 text-xs text-green-600">
              {message.duration != null && <span>{(message.duration / 1000).toFixed(0)}s</span>}
              {message.turns != null && <span>{message.turns} turns</span>}
            </div>
          )}
        </div>
      );

    case 'error':
      return (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 text-sm text-red-700">
          <span className="font-semibold">Error: </span>{message.message}
        </div>
      );

    case 'user':
      return (
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%] leading-relaxed">
            {message.text}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function AgentChat({ investmentId, actions, isProcessing, onSendMessage, investment, streamMessages, isConnected }: AgentChatProps) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine stream messages with local user messages (user bubbles shown immediately)
  const allMessages = [...streamMessages, ...localMessages].sort((a, b) => a.timestamp - b.timestamp);
  const hasLiveMessages = allMessages.length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Add user bubble immediately
    const userMsg: ChatMessage = { id: crypto.randomUUID(), type: 'user', text: trimmed, timestamp: Date.now() };
    setLocalMessages((prev) => [...prev, userMsg]);
    onSendMessage?.(trimmed);
    setInputText('');
    inputRef.current?.focus();
  }, [onSendMessage]);

  const handleChip = useCallback((chip: string) => {
    handleSend(chip);
  }, [handleSend]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputText);
  }, [inputText, handleSend]);

  // Reset local messages when a new agent run starts
  useEffect(() => {
    if (isProcessing && streamMessages.length === 0) {
      setLocalMessages([]);
    }
  }, [isProcessing, streamMessages.length]);

  const inputDisabled = isConnected;

  return (
    <Card className="overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Agent activity</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-green-600">Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Ready</span>
            </>
          )}
        </div>
      </div>

      {/* Message list */}
      <div className="overflow-y-auto max-h-[520px] px-5 py-4 space-y-3">
        {hasLiveMessages ? (
          allMessages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
            </div>
          ))
        ) : (
          // Fall back to persisted AgentActions when no live messages
          <AgentActions actions={actions} isProcessing={isProcessing} variant="inline" />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat input + quick-action chips */}
      <div className="border-t px-5 py-3 space-y-2">
        {/* Quick-action chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((chip) => (
            <Badge
              key={chip}
              variant="secondary"
              onClick={() => !inputDisabled && handleChip(chip)}
              className={`cursor-pointer text-xs ${inputDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary/80'}`}
            >
              {chip}
            </Badge>
          ))}
        </div>

        {/* Text input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={inputDisabled}
            placeholder={inputDisabled ? 'Agent is running…' : 'Ask the agent anything…'}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={inputDisabled || !inputText.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
