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
}

export interface StartInvestingRequest {
  userId: string;
  strategyId: string;
}

export interface SwitchStrategyRequest {
  userId: string;
  newStrategyId: string;
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
