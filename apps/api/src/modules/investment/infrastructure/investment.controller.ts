import { Body, Controller, Get, HttpCode, HttpException, Inject, InternalServerErrorException, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { StartInvestingUseCase } from '../application/start-investing.use-case';
import { SwitchStrategyUseCase } from '../application/switch-strategy.use-case';
import { ExecuteInvestmentUseCase } from '../application/execute-investment.use-case';
import { GetPortfolioUseCase } from '../application/get-portfolio.use-case';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { AgentActionRepositoryPort } from '../domain/ports/agent-action.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';

class StartInvestingDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  strategyId: string;

  @IsString()
  @IsNotEmpty()
  userAmount: string;
}

class SwitchStrategyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  newStrategyId: string;

  @IsString()
  @IsNotEmpty()
  userAmount: string;
}

class ExecuteInvestmentDto {
  @IsUUID()
  investmentId: string;

  @IsString()
  @IsNotEmpty()
  userAmount: string;
}

@Controller('investments')
export class InvestmentController {
  constructor(
    private readonly startInvestingUseCase: StartInvestingUseCase,
    private readonly switchStrategyUseCase: SwitchStrategyUseCase,
    private readonly executeInvestmentUseCase: ExecuteInvestmentUseCase,
    private readonly getPortfolioUseCase: GetPortfolioUseCase,
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('AgentActionRepositoryPort')
    private readonly agentActionRepo: AgentActionRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  @Get('portfolio')
  async getPortfolio(@Query('userId') userId: string) {
    if (!userId) throw new NotFoundException('userId query param required');
    try {
      const portfolio = await this.getPortfolioUseCase.execute(userId);
      if (!portfolio) throw new NotFoundException('No active investment found');
      return portfolio;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to read on-chain balance');
    }
  }

  @Post('start')
  @HttpCode(201)
  async start(@Body() body: StartInvestingDto) {
    return this.startInvestingUseCase.execute(body.userId, body.strategyId, parseFloat(body.userAmount));
  }

  @Patch('switch')
  async switch(@Body() body: SwitchStrategyDto) {
    return this.switchStrategyUseCase.execute(body.userId, body.newStrategyId, parseFloat(body.userAmount));
  }

  @Get('active')
  async getActive(@Query('userId') userId: string) {
    if (!userId) throw new NotFoundException('userId query param required');

    const investment = await this.investmentRepo.findActiveByUserId(userId);
    if (!investment) throw new NotFoundException('No active investment found');

    const strategy = await this.strategyRepo.findById(investment.strategyId);
    if (!strategy) throw new NotFoundException('Strategy not found');

    const actions = await this.agentActionRepo.findByInvestmentId(investment.id);
    const lastAction = actions.at(-1);

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
      totalActions: actions.length,
      lastAgentAction: lastAction
        ? { actionType: lastAction.actionType, status: lastAction.status, executedAt: lastAction.executedAt.toISOString() }
        : null,
    };
  }

  @Post('execute')
  @HttpCode(202)
  async execute(@Body() body: ExecuteInvestmentDto) {
    return this.executeInvestmentUseCase.execute(body.investmentId, parseFloat(body.userAmount));
  }

  @Get(':investmentId/actions')
  async getActions(@Param('investmentId') investmentId: string) {
    const actions = await this.agentActionRepo.findByInvestmentId(investmentId);
    return {
      investmentId,
      actions: actions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        chain: a.chain,
        protocol: a.protocol,
        asset: a.asset,
        amount: a.amount,
        gasCostUsd: a.gasCostUsd,
        expectedApyBefore: a.expectedApyBefore,
        expectedApyAfter: a.expectedApyAfter,
        rationale: a.rationale,
        status: a.status,
        txHash: a.txHash,
        executedAt: a.executedAt.toISOString(),
      })),
    };
  }
}
