import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from '../mikro-orm.config';
import { QuizModule } from './modules/quiz/quiz.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { InvestmentModule } from './modules/investment/investment.module';

@Module({
  imports: [
    MikroOrmModule.forRoot(config),
    QuizModule,
    StrategyModule,
    InvestmentModule,
  ],
})
export class AppModule {}
