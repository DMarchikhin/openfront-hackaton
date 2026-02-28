import { AgentAction } from '../agent-action.entity';

export interface AgentActionRepositoryPort {
  save(action: AgentAction): Promise<void>;
  findByInvestmentId(investmentId: string): Promise<AgentAction[]>;
}
