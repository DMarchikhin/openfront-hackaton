import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserInvestment } from '../domain/user-investment.entity';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';

@Injectable()
export class SwitchStrategyUseCase {
  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  async execute(userId: string, newStrategyId: string) {
    const newStrategy = await this.strategyRepo.findById(newStrategyId);
    if (!newStrategy) throw new NotFoundException('Strategy not found');

    const current = await this.investmentRepo.findActiveByUserId(userId);
    if (!current) {
      throw new BadRequestException('No active investment found. Use the start endpoint instead.');
    }

    if (current.strategyId === newStrategyId) {
      throw new BadRequestException('You are already invested in this strategy.');
    }

    const oldStrategy = await this.strategyRepo.findById(current.strategyId);

    current.deactivate();
    await this.investmentRepo.save(current);

    const next = UserInvestment.create(userId, newStrategyId);
    await this.investmentRepo.save(next);

    return {
      previousStrategy: { id: current.strategyId, name: oldStrategy?.name ?? current.strategyId },
      newStrategy: { id: newStrategy.id, name: newStrategy.name },
      status: next.status,
      activatedAt: next.activatedAt.toISOString(),
    };
  }
}
