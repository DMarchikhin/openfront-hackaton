import { Inject, Injectable } from '@nestjs/common';
import { InvestmentStrategy } from '../domain/investment-strategy.entity';
import { StrategyRepositoryPort } from '../domain/ports/strategy.repository.port';
import { RiskLevel } from '../../../shared/enums';

@Injectable()
export class GetStrategiesUseCase {
  constructor(
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  async execute(riskLevel?: string): Promise<InvestmentStrategy[]> {
    if (riskLevel && Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
      return this.strategyRepo.findByRiskLevel(riskLevel as RiskLevel);
    }
    return this.strategyRepo.findAll();
  }
}
