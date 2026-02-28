import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { InvestmentStrategy } from '../domain/investment-strategy.entity';
import { StrategyRepositoryPort } from '../domain/ports/strategy.repository.port';
import { RiskLevel } from '../../../shared/enums';

@Injectable()
export class StrategyRepository implements StrategyRepositoryPort {
  constructor(
    @InjectRepository(InvestmentStrategy)
    private readonly repo: EntityRepository<InvestmentStrategy>,
  ) {}

  async findAll(): Promise<InvestmentStrategy[]> {
    return this.repo.findAll({ orderBy: { name: 'ASC' } });
  }

  async findByRiskLevel(level: RiskLevel): Promise<InvestmentStrategy[]> {
    return this.repo.find({ riskLevel: level }, { orderBy: { name: 'ASC' } });
  }

  async findById(id: string): Promise<InvestmentStrategy | null> {
    return this.repo.findOne({ id });
  }
}
