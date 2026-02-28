import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Post, Query } from '@nestjs/common';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { StartInvestingUseCase } from '../application/start-investing.use-case';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';

class StartInvestingDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  strategyId: string;
}

@Controller('investments')
export class InvestmentController {
  constructor(
    private readonly startInvestingUseCase: StartInvestingUseCase,
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  @Post('start')
  @HttpCode(201)
  async start(@Body() body: StartInvestingDto) {
    return this.startInvestingUseCase.execute(body.userId, body.strategyId);
  }

  @Get('active')
  async getActive(@Query('userId') userId: string) {
    if (!userId) throw new NotFoundException('userId query param required');

    const investment = await this.investmentRepo.findActiveByUserId(userId);
    if (!investment) throw new NotFoundException('No active investment found');

    const strategy = await this.strategyRepo.findById(investment.strategyId);
    if (!strategy) throw new NotFoundException('Strategy not found');

    return {
      investmentId: investment.id,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        riskLevel: strategy.riskLevel,
        expectedApyMin: strategy.expectedApyMin,
        expectedApyMax: strategy.expectedApyMax,
        poolAllocations: strategy.poolAllocations.map((p) => ({
          chain: p.chain,
          protocol: p.protocol,
          asset: p.asset,
          allocationPercentage: p.allocationPercentage,
        })),
      },
      status: investment.status,
      activatedAt: investment.activatedAt.toISOString(),
    };
  }
}
