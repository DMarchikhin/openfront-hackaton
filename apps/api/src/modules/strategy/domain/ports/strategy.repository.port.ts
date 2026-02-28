import { InvestmentStrategy } from '../investment-strategy.entity';
import { RiskLevel } from '../../../../shared/enums';

export interface StrategyRepositoryPort {
  findAll(): Promise<InvestmentStrategy[]>;
  findByRiskLevel(level: RiskLevel): Promise<InvestmentStrategy[]>;
  findById(id: string): Promise<InvestmentStrategy | null>;
}
