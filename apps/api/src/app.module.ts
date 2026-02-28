import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from '../mikro-orm.config';
import { QuizModule } from './modules/quiz/quiz.module';

@Module({
  imports: [
    MikroOrmModule.forRoot(config),
    QuizModule,
  ],
})
export class AppModule {}
