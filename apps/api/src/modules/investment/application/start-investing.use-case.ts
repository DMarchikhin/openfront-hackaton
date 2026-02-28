import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserInvestment } from '../domain/user-investment.entity';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';
import { ExecuteInvestmentUseCase } from './execute-investment.use-case';

@Injectable()
export class StartInvestingUseCase {
  private readonly logger = new Logger(StartInvestingUseCase.name);

  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
    private readonly executeInvestmentUseCase: ExecuteInvestmentUseCase,
  ) {}

  async execute(userId: string, strategyId: string, userAmount?: number) {
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

    // Fire-and-forget: trigger agent to start allocating funds
    if (userAmount && userAmount > 0) {
      void this.executeInvestmentUseCase.execute(investment.id, userAmount).catch((err: Error) => {
        this.logger.error(`Agent trigger failed for investment ${investment.id}: ${err.message}`);
      });
    }

    return {
      investmentId: investment.id,
      strategyId: strategy.id,
      strategyName: strategy.name,
      status: investment.status,
      activatedAt: investment.activatedAt.toISOString(),
      agentMessage: userAmount ? 'Agent is processing your investment...' : undefined,
    };
  }
}
