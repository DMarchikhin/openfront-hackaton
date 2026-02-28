import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserInvestment } from './domain/user-investment.entity';
import { AgentAction } from './domain/agent-action.entity';
import { InvestmentRepository } from './infrastructure/investment.repository';
import { AgentActionRepository } from './infrastructure/agent-action.repository';
import { StartInvestingUseCase } from './application/start-investing.use-case';
import { SwitchStrategyUseCase } from './application/switch-strategy.use-case';
import { ExecuteInvestmentUseCase } from './application/execute-investment.use-case';
import { InvestmentController } from './infrastructure/investment.controller';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [MikroOrmModule.forFeature([UserInvestment, AgentAction]), StrategyModule],
  controllers: [InvestmentController],
  providers: [
    {
      provide: 'InvestmentRepositoryPort',
      useClass: InvestmentRepository,
    },
    {
      provide: 'AgentActionRepositoryPort',
      useClass: AgentActionRepository,
    },
    StartInvestingUseCase,
    SwitchStrategyUseCase,
    ExecuteInvestmentUseCase,
  ],
})
export class InvestmentModule {}
