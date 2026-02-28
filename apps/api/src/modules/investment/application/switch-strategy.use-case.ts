import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserInvestment } from '../domain/user-investment.entity';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';
import { ExecuteInvestmentUseCase } from './execute-investment.use-case';

@Injectable()
export class SwitchStrategyUseCase {
  private readonly logger = new Logger(SwitchStrategyUseCase.name);

  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
    private readonly executeInvestmentUseCase: ExecuteInvestmentUseCase,
  ) {}

  async execute(userId: string, newStrategyId: string, totalAmountUsd = 0) {
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

    // Fire-and-forget rebalance trigger
    void this.executeInvestmentUseCase
      .triggerRebalance({
        investmentId: next.id,
        userId,
        walletAddress: process.env.WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000',
        totalAmountUsd,
        previousStrategy: {
          id: current.strategyId,
          name: oldStrategy?.name ?? current.strategyId,
          poolAllocations: oldStrategy?.poolAllocations ?? [],
          allowedChains: oldStrategy?.allowedChains ?? [],
        },
        newStrategy: {
          id: newStrategy.id,
          name: newStrategy.name,
          riskLevel: newStrategy.riskLevel,
          poolAllocations: newStrategy.poolAllocations,
          rebalanceThreshold: newStrategy.rebalanceThreshold,
          allowedChains: newStrategy.allowedChains,
        },
      })
      .catch((err: Error) => this.logger.error(`Rebalance trigger failed: ${err.message}`));

    return {
      previousStrategy: { id: current.strategyId, name: oldStrategy?.name ?? current.strategyId },
      newStrategy: { id: newStrategy.id, name: newStrategy.name },
      status: next.status,
      activatedAt: next.activatedAt.toISOString(),
      agentMessage: 'Rebalancing agent is processing your strategy switch...',
    };
  }
}
