import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { GetStrategiesUseCase } from '../application/get-strategies.use-case';
import { StrategyRepositoryPort } from '../domain/ports/strategy.repository.port';
import { Inject } from '@nestjs/common';

@Controller('strategies')
export class StrategyController {
  constructor(
    private readonly getStrategiesUseCase: GetStrategiesUseCase,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  @Get()
  async getAll(@Query('riskLevel') riskLevel?: string) {
    const strategies = await this.getStrategiesUseCase.execute(riskLevel);
    return { strategies: strategies.map((s) => this.toDto(s)) };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const strategy = await this.strategyRepo.findById(id);
    if (!strategy) throw new NotFoundException('Strategy not found');
    return this.toDto(strategy);
  }

  private toDto(s: any) {
    return {
      id: s.id,
      name: s.name,
      riskLevel: s.riskLevel,
      description: s.description,
      expectedApyMin: s.expectedApyMin,
      expectedApyMax: s.expectedApyMax,
      rebalanceThreshold: s.rebalanceThreshold,
      allowedChains: s.allowedChains,
      poolAllocations: s.poolAllocations.map((p: any) => ({
        chain: p.chain,
        protocol: p.protocol,
        asset: p.asset,
        allocationPercentage: p.allocationPercentage,
      })),
    };
  }
}
