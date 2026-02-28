import 'dotenv/config';
// Allow claude CLI to spawn as a child process even when started from within a Claude Code session
delete process.env.CLAUDECODE;
import http from 'http';
import { executeInvestment, rebalanceInvestment, ExecuteInvestmentParams, RebalanceParams } from './index.js';

const PORT = parseInt(process.env.AGENT_PORT ?? '3002', 10);

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
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/health') {
    return send(res, 200, { status: 'ok' });
  }

  if (method === 'POST' && url === '/execute') {
    const params = (await readBody(req)) as ExecuteInvestmentParams;
    console.log(`[agent] execute investment=${params.investmentId} amount=${params.userAmount}`);
    send(res, 202, { status: 'accepted', investmentId: params.investmentId });

    // Background execution + callback
    executeInvestment(params)
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
      })
      .catch((err) => {
        console.error(`[agent] execution failed for ${params.investmentId}:`, (err as Error).message);
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

    // Background execution + callback
    rebalanceInvestment(params)
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
      })
      .catch((err) => {
        console.error(`[agent] rebalance failed for ${params.investmentId}:`, (err as Error).message);
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

  return send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[agent] HTTP server listening on http://localhost:${PORT}`);
  console.log(`[agent] Endpoints: POST /execute  POST /rebalance  GET /health`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[agent] ERROR: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }
  console.log(`[agent] ANTHROPIC_API_KEY: set ✓`);
  console.log(`[agent] AAVE_MCP_URL: ${process.env.AAVE_MCP_URL ?? 'http://localhost:8080/mcp/sse (default)'}`);
});
