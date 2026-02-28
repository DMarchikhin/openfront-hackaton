import 'dotenv/config';
// Allow claude CLI to spawn as a child process even when started from within a Claude Code session
delete process.env.CLAUDECODE;
import http from 'http';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { executeInvestment, rebalanceInvestment, ExecuteInvestmentParams, RebalanceParams, StreamEvent } from './index.js';
import { buildChatPrompt, chatToolsAllowList } from './chat-prompt.js';
import { createAaveMcpServer } from './mcp/aave-tools.js';
import { createOpenfortMcpServer } from './mcp/openfort-tools.js';

const PORT = parseInt(process.env.AGENT_PORT ?? '3002', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

// SSE subscriber registry: investmentId → set of active response streams
const activeStreams = new Map<string, Set<http.ServerResponse>>();

// Broadcast a StreamEvent to all SSE subscribers for a given investmentId
function broadcastEvent(investmentId: string, type: string, data: Record<string, unknown>): void {
  const subscribers = activeStreams.get(investmentId);
  if (!subscribers || subscribers.size === 0) return;
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      subscribers.delete(res);
    }
  }
}

// Set CORS headers on every response
function setCors(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  setCors(res);
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

// Remove a subscriber from the activeStreams registry
function removeSubscriber(investmentId: string, res: http.ServerResponse): void {
  const subscribers = activeStreams.get(investmentId);
  if (!subscribers) return;
  subscribers.delete(res);
  if (subscribers.size === 0) {
    activeStreams.delete(investmentId);
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // OPTIONS preflight (CORS)
  if (method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === 'GET' && url === '/health') {
    return send(res, 200, { status: 'ok' });
  }

  // SSE streaming endpoint: GET /stream/:investmentId
  if (method === 'GET' && url?.startsWith('/stream/')) {
    const investmentId = url.slice('/stream/'.length);
    if (!investmentId) {
      return send(res, 400, { error: 'investmentId is required' });
    }

    setCors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Register subscriber
    if (!activeStreams.has(investmentId)) {
      activeStreams.set(investmentId, new Set());
    }
    activeStreams.get(investmentId)!.add(res);

    // Send initial connected event
    res.write('event: connected\ndata: {}\n\n');

    // 15-minute connection timeout
    const timeout = setTimeout(() => {
      removeSubscriber(investmentId, res);
      res.end();
    }, 15 * 60 * 1000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearTimeout(timeout);
      removeSubscriber(investmentId, res);
    });

    // Keep the connection open — do NOT call res.end() here
    return;
  }

  if (method === 'POST' && url === '/execute') {
    const params = (await readBody(req)) as ExecuteInvestmentParams;
    console.log(`[agent] execute investment=${params.investmentId} amount=${params.userAmount}`);
    send(res, 202, { status: 'accepted', investmentId: params.investmentId });

    // onMessage callback: forward StreamEvents to SSE subscribers
    const onMessage = (event: StreamEvent) => {
      broadcastEvent(params.investmentId, event.type, event as unknown as Record<string, unknown>);
    };

    // Background execution + callback
    executeInvestment(params, onMessage)
      .then(async (result) => {
        const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
        await fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: params.userId,
            strategyId: params.strategy.id,
            ...result,
          }),
        });
        console.log(`[agent] callback sent for ${params.investmentId}`);
        broadcastEvent(params.investmentId, 'done', {});
      })
      .catch((err) => {
        console.error(`[agent] execution failed for ${params.investmentId}:`, (err as Error).message);
        broadcastEvent(params.investmentId, 'error', { message: (err as Error).message });
        broadcastEvent(params.investmentId, 'done', {});
        const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
        fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: params.userId,
            strategyId: params.strategy.id,
            actions: [{ actionType: 'rate_check', status: 'failed', rationale: `Agent failed: ${(err as Error).message}` }],
            summary: `Execution failed: ${(err as Error).message}`,
          }),
        }).catch(() => {});
      });
    return;
  }

  if (method === 'POST' && url === '/rebalance') {
    const params = (await readBody(req)) as RebalanceParams;
    console.log(`[agent] rebalance investment=${params.investmentId} ${params.previousStrategy.name} → ${params.newStrategy.name}`);
    send(res, 202, { status: 'accepted', investmentId: params.investmentId });

    const onMessage = (event: StreamEvent) => {
      broadcastEvent(params.investmentId, event.type, event as unknown as Record<string, unknown>);
    };

    // Background execution + callback
    rebalanceInvestment(params, onMessage)
      .then(async (result) => {
        const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
        await fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: params.userId,
            strategyId: params.newStrategy.id,
            ...result,
          }),
        });
        console.log(`[agent] rebalance callback sent for ${params.investmentId}`);
        broadcastEvent(params.investmentId, 'done', {});
      })
      .catch((err) => {
        console.error(`[agent] rebalance failed for ${params.investmentId}:`, (err as Error).message);
        broadcastEvent(params.investmentId, 'error', { message: (err as Error).message });
        broadcastEvent(params.investmentId, 'done', {});
        const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
        fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: params.userId,
            strategyId: params.newStrategy.id,
            actions: [{ actionType: 'rate_check', status: 'failed', rationale: `Rebalance failed: ${(err as Error).message}` }],
            summary: `Rebalance failed: ${(err as Error).message}`,
          }),
        }).catch(() => {});
      });
    return;
  }

  if (method === 'POST' && url === '/chat') {
    const body = (await readBody(req)) as {
      investmentId: string;
      userId: string;
      message: string;
      context: { strategyName: string; strategyId: string; riskLevel: string; walletAddress: string };
    };
    const { investmentId, message, context } = body;
    console.log(`[agent] chat investmentId=${investmentId} message="${message.slice(0, 60)}"`);
    send(res, 202, { status: 'accepted', investmentId });

    const chainId = parseInt(process.env.CHAIN_ID ?? '84532', 10);
    const prompt = buildChatPrompt({ message, chainId, ...context });
    const onMessage = (event: StreamEvent) => {
      broadcastEvent(investmentId, event.type, event as unknown as Record<string, unknown>);
    };

    // Run conversational agent in background (read-only, maxTurns: 5)
    (async () => {
      try {
        const agentQuery = query({
          prompt,
          options: {
            mcpServers: { aave: createAaveMcpServer(), openfort: createOpenfortMcpServer() },
            allowedTools: chatToolsAllowList,
            permissionMode: 'bypassPermissions',
            allowDangerouslySkipPermissions: true,
            maxTurns: 5,
            model: 'claude-sonnet-4-6',
          },
        });
        for await (const msg of agentQuery) {
          // Re-use the same handleSdkMessage logic via broadcastEvent
          if (msg.type === 'stream_event') {
            const ev = (msg as unknown as { event: { type: string; delta?: { type: string; text: string } } }).event;
            if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
              broadcastEvent(investmentId, 'text', { text: ev.delta.text });
            }
          } else if (msg.type === 'assistant') {
            const content = (msg as unknown as { message: { content: Array<{ type: string; text?: string; thinking?: string }> } }).message?.content ?? [];
            for (const block of content) {
              // text blocks are already streamed via stream_event → 'text' above; skip them
              if (block.type === 'thinking' && block.thinking) {
                broadcastEvent(investmentId, 'thinking', { text: block.thinking });
              }
            }
          } else if (msg.type === 'tool_progress') {
            const m = msg as unknown as { elapsed_time_seconds?: number; tool_name?: string };
            if (m.elapsed_time_seconds != null) {
              broadcastEvent(investmentId, 'tool_progress', { tool: m.tool_name ?? 'tool', elapsed: m.elapsed_time_seconds });
            } else {
              broadcastEvent(investmentId, 'tool_start', { tool: m.tool_name ?? 'tool' });
            }
          } else if (msg.type === 'tool_use_summary') {
            const m = msg as unknown as { tool_name?: string; summary?: string };
            broadcastEvent(investmentId, 'tool_result', { tool: m.tool_name ?? 'tool', summary: m.summary ?? '' });
          }
        }
      } catch (err) {
        broadcastEvent(investmentId, 'error', { message: (err as Error).message });
      }
      broadcastEvent(investmentId, 'done', {});
    })();
    return;
  }

  return send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[agent] HTTP server listening on http://localhost:${PORT}`);
  console.log(`[agent] Endpoints: POST /execute  POST /rebalance  POST /chat  GET /stream/:id  GET /health`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[agent] ERROR: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }
  console.log(`[agent] ANTHROPIC_API_KEY: set ✓`);
  console.log(`[agent] AAVE_MCP_URL: ${process.env.AAVE_MCP_URL ?? 'http://localhost:8080/mcp/sse (default)'}`);
  console.log(`[agent] CORS origin: ${CORS_ORIGIN}`);
});
