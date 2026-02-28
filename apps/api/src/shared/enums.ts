export enum RiskLevel {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  GROWTH = 'growth',
}

export enum InvestmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum AgentActionType {
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw',
  REBALANCE = 'rebalance',
  RATE_CHECK = 'rate_check',
}

export enum AgentActionStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
