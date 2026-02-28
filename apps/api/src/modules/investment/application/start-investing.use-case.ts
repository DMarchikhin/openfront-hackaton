import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserInvestment } from '../domain/user-investment.entity';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';

@Injectable()
export class StartInvestingUseCase {
  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  async execute(userId: string, strategyId: string) {
    const strategy = await this.strategyRepo.findById(strategyId);
    if (!strategy) throw new NotFoundException('Strategy not found');

    const existing = await this.investmentRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException(
        'You already have an active investment. Use the switch endpoint instead.',
      );
    }

    const investment = UserInvestment.create(userId, strategyId);
    await this.investmentRepo.save(investment);

    return {
      investmentId: investment.id,
      strategyId: strategy.id,
      strategyName: strategy.name,
      status: investment.status,
      activatedAt: investment.activatedAt.toISOString(),
    };
  }
}
