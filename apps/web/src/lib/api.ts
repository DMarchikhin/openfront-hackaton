const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

// --- Types ---

export interface QuizOption {
  label: string;
  value: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  displayOrder: number;
  options: QuizOption[];
}

export interface QuizSubmitRequest {
  userId: string;
  answers: { questionId: string; selectedValue: number }[];
}

export interface QuizResult {
  assessmentId: string;
  riskLevel: 'conservative' | 'balanced' | 'growth';
  totalScore: number;
  maxPossibleScore: number;
  description: string;
}

export interface PoolAllocation {
  chain: string;
  protocol: string;
  asset: string;
  allocationPercentage: number;
}

export interface Strategy {
  id: string;
  name: string;
  riskLevel: 'conservative' | 'balanced' | 'growth';
  description: string;
  expectedApyMin: number;
  expectedApyMax: number;
  rebalanceThreshold: number;
  allowedChains: string[];
  poolAllocations: PoolAllocation[];
}

export interface ActiveInvestment {
  investmentId: string;
  strategy: Strategy;
  status: 'active' | 'inactive';
  activatedAt: string;
  agentMessage?: string;
  totalActions?: number;
  lastAgentAction?: { actionType: string; status: string; executedAt: string } | null;
}

export interface AgentAction {
  id: string;
  actionType: 'supply' | 'withdraw' | 'rebalance' | 'rate_check';
  chain: string;
  protocol: string;
  asset: string;
  amount: string;
  gasCostUsd: number | null;
  expectedApyBefore: number | null;
  expectedApyAfter: number | null;
  rationale: string;
  status: 'pending' | 'executed' | 'failed' | 'skipped';
  txHash: string | null;
  executedAt: string;
}

export interface AgentActionsResponse {
  investmentId: string;
  actions: AgentAction[];
}

export interface ExecuteInvestmentResponse {
  investmentId: string;
  status: 'executing';
  message: string;
}

export interface StartInvestingRequest {
  userId: string;
  strategyId: string;
  userAmount: string;
}

export interface SwitchStrategyRequest {
  userId: string;
  newStrategyId: string;
  userAmount: string;
}

// --- API functions ---

export const fetchQuizQuestions = () =>
  request<{ questions: QuizQuestion[] }>('/quiz/questions');

export const submitQuiz = (body: QuizSubmitRequest) =>
  request<QuizResult>('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchStrategies = (riskLevel?: string) =>
  request<{ strategies: Strategy[] }>(
    `/strategies${riskLevel ? `?riskLevel=${riskLevel}` : ''}`,
  );

export const fetchStrategyById = (id: string) =>
  request<Strategy>(`/strategies/${id}`);

export const startInvesting = (body: StartInvestingRequest) =>
  request<ActiveInvestment>('/investments/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const switchStrategy = (body: SwitchStrategyRequest) =>
  request('/investments/switch', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const fetchActiveInvestment = (userId: string) =>
  request<ActiveInvestment>(`/investments/active?userId=${userId}`);

export const executeInvestment = (investmentId: string, userAmount: number) =>
  request<ExecuteInvestmentResponse>('/investments/execute', {
    method: 'POST',
    body: JSON.stringify({ investmentId, userAmount: String(userAmount) }),
  });

export const fetchAgentActions = (investmentId: string) =>
  request<AgentActionsResponse>(`/investments/${investmentId}/actions`);

// --- Portfolio types ---

export interface PoolAction {
  id: string;
  actionType: string;
  amountUsd: number;
  expectedApyAfter: number | null;
  status: string;
  txHash: string | null;
  rationale: string;
  executedAt: string;
}

export interface PoolPosition {
  pool: { chain: string; protocol: string; asset: string };
  onChainBalanceUsd: number;
  totalSuppliedUsd: number;
  totalWithdrawnUsd: number;
  netInvestedUsd: number;
  earnedYieldUsd: number;
  latestApyPercent: number | null;
  allocationPercent: number;
  actions: PoolAction[];
}

export interface PortfolioResponse {
  investmentId: string;
  strategyName: string;
  riskLevel: string;
  totalValueUsd: number;
  totalInvestedUsd: number;
  totalEarnedUsd: number;
  walletBalanceUsd: number;
  investedBalanceUsd: number;
  smartAccountAddress: string;
  pools: PoolPosition[];
}

export const fetchPortfolio = (userId: string) =>
  request<PortfolioResponse>(`/investments/portfolio?userId=${userId}`);

// --- Agent streaming types + chat ---

export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3002';

export type ChatMessage =
  | { id: string; type: 'thinking'; text: string; timestamp: number }
  | { id: string; type: 'text'; text: string; timestamp: number }
  | { id: string; type: 'tool_start'; tool: string; timestamp: number }
  | { id: string; type: 'tool_progress'; tool: string; elapsed: number; timestamp: number }
  | { id: string; type: 'tool_result'; tool: string; summary: string; timestamp: number }
  | { id: string; type: 'status'; description: string; timestamp: number }
  | { id: string; type: 'result'; text: string; duration?: number; turns?: number; timestamp: number }
  | { id: string; type: 'error'; message: string; timestamp: number }
  | { id: string; type: 'user'; text: string; timestamp: number };

export interface SendAgentMessageContext {
  strategyName: string;
  strategyId: string;
  riskLevel: string;
  walletAddress: string;
}

export const sendAgentMessage = (
  investmentId: string,
  userId: string,
  message: string,
  context: SendAgentMessageContext,
): Promise<{ status: string; investmentId: string }> =>
  fetch(`${AGENT_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investmentId, userId, message, context }),
  }).then((r) => r.json());
