import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InvestmentStrategy } from './domain/investment-strategy.entity';
import { StrategyRepository } from './infrastructure/strategy.repository';
import { GetStrategiesUseCase } from './application/get-strategies.use-case';
import { StrategyController } from './infrastructure/strategy.controller';

@Module({
  imports: [MikroOrmModule.forFeature([InvestmentStrategy])],
  controllers: [StrategyController],
  providers: [
    {
      provide: 'StrategyRepositoryPort',
      useClass: StrategyRepository,
    },
    GetStrategiesUseCase,
  ],
  exports: ['StrategyRepositoryPort'],
})
export class StrategyModule {}
