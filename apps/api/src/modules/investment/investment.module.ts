import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserInvestment } from './domain/user-investment.entity';
import { InvestmentRepository } from './infrastructure/investment.repository';
import { StartInvestingUseCase } from './application/start-investing.use-case';
import { SwitchStrategyUseCase } from './application/switch-strategy.use-case';
import { InvestmentController } from './infrastructure/investment.controller';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [MikroOrmModule.forFeature([UserInvestment]), StrategyModule],
  controllers: [InvestmentController],
  providers: [
    {
      provide: 'InvestmentRepositoryPort',
      useClass: InvestmentRepository,
    },
    StartInvestingUseCase,
    SwitchStrategyUseCase,
  ],
})
export class InvestmentModule {}
