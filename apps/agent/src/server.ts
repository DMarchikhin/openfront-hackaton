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
    try {
      const params = (await readBody(req)) as ExecuteInvestmentParams;
      console.log(`[agent] execute investment=${params.investmentId} amount=${params.userAmount}`);
      const result = await executeInvestment(params);
      return send(res, 200, result);
    } catch (err) {
      console.error('[agent] /execute error:', (err as Error).message);
      return send(res, 500, { error: (err as Error).message });
    }
  }

  if (method === 'POST' && url === '/rebalance') {
    try {
      const params = (await readBody(req)) as RebalanceParams;
      console.log(`[agent] rebalance investment=${params.investmentId} ${params.previousStrategy.name} → ${params.newStrategy.name}`);
      const result = await rebalanceInvestment(params);
      return send(res, 200, result);
    } catch (err) {
      console.error('[agent] /rebalance error:', (err as Error).message);
      return send(res, 500, { error: (err as Error).message });
    }
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
