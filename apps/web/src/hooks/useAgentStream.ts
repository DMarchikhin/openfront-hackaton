'use client';

import { useEffect, useRef, useState } from 'react';
import { AGENT_URL, ChatMessage } from '@/lib/api';

export function useAgentStream(
  investmentId: string | null,
): { messages: ChatMessage[]; isConnected: boolean } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const textBufferIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!investmentId) {
      return;
    }

    const es = new EventSource(`${AGENT_URL}/stream/${investmentId}`);
    esRef.current = es;

    const addMessage = (msg: Record<string, unknown>): string => {
      const id = crypto.randomUUID();
      const full = { ...msg, id, timestamp: Date.now() } as ChatMessage;
      setMessages((prev) => [...prev, full]);
      return id;
    };

    const updateMessage = (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? ({ ...m, ...patch } as ChatMessage) : m)),
      );
    };

    es.addEventListener('connected', () => {
      // SSE open — don't set isStreaming yet; wait for actual content
    });

    es.addEventListener('thinking', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { text: string };
      textBufferIdRef.current = null;
      addMessage({ type: 'thinking', text: data.text });
    });

    es.addEventListener('text', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { text: string };
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'text' && last.id === textBufferIdRef.current) {
          // Coalesce consecutive text events into the same message
          return prev.map((m) =>
            m.id === last.id ? ({ ...m, text: (m as Extract<ChatMessage, { type: 'text' }>).text + data.text } as ChatMessage) : m,
          );
        }
        // New text message
        const id = crypto.randomUUID();
        textBufferIdRef.current = id;
        return [...prev, { id, type: 'text', text: data.text, timestamp: Date.now() } as ChatMessage];
      });
    });

    es.addEventListener('tool_start', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { tool: string };
      textBufferIdRef.current = null;
      addMessage({ type: 'tool_start', tool: data.tool });
    });

    es.addEventListener('tool_progress', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { tool: string; elapsed: number };
      textBufferIdRef.current = null;
      setMessages((prev) => {
        // Find the most recent tool_start or tool_progress for this tool and update it
        const idx = [...prev].reverse().findIndex(
          (m) => (m.type === 'tool_start' || m.type === 'tool_progress') &&
            (m as Extract<ChatMessage, { type: 'tool_start' }>).tool === data.tool,
        );
        if (idx !== -1) {
          const realIdx = prev.length - 1 - idx;
          return prev.map((m, i) =>
            i === realIdx
              ? ({ ...m, type: 'tool_progress', tool: data.tool, elapsed: data.elapsed } as ChatMessage)
              : m,
          );
        }
        // No existing pill — create one
        const id = crypto.randomUUID();
        return [...prev, { id, type: 'tool_progress', tool: data.tool, elapsed: data.elapsed, timestamp: Date.now() } as ChatMessage];
      });
    });

    es.addEventListener('tool_result', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { tool: string; summary: string };
      textBufferIdRef.current = null;
      setMessages((prev) => {
        // Replace the most recent tool_start/tool_progress for this tool with tool_result
        const idx = [...prev].reverse().findIndex(
          (m) =>
            (m.type === 'tool_start' || m.type === 'tool_progress') &&
            (m as Extract<ChatMessage, { type: 'tool_start' }>).tool === data.tool,
        );
        if (idx !== -1) {
          const realIdx = prev.length - 1 - idx;
          return prev.map((m, i) =>
            i === realIdx
              ? ({ ...m, type: 'tool_result', tool: data.tool, summary: data.summary } as ChatMessage)
              : m,
          );
        }
        const id = crypto.randomUUID();
        return [...prev, { id, type: 'tool_result', tool: data.tool, summary: data.summary, timestamp: Date.now() } as ChatMessage];
      });
    });

    es.addEventListener('status', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { description: string };
      textBufferIdRef.current = null;
      addMessage({ type: 'status', description: data.description });
    });

    es.addEventListener('result', (e) => {
      setIsStreaming(true);
      const data = JSON.parse(e.data) as { text: string; duration?: number; turns?: number };
      textBufferIdRef.current = null;
      addMessage({ type: 'result', text: data.text, duration: data.duration, turns: data.turns });
      // Browser notification
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Autopilot Savings', { body: 'Agent finished allocating your funds!' });
      }
    });

    es.addEventListener('error', (e) => {
      setIsStreaming(true);
      textBufferIdRef.current = null;
      try {
        const data = JSON.parse((e as MessageEvent).data) as { message: string };
        addMessage({ type: 'error', message: data.message });
      } catch {
        // SSE connection error (not a data error) — ignore silently
      }
    });

    es.addEventListener('done', () => {
      setIsStreaming(false);
      // Keep EventSource alive for follow-up chat messages
    });

    es.onerror = () => {
      setIsStreaming(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [investmentId]);

  // Request notification permission on first mount
  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  return { messages, isConnected: isStreaming };
}
