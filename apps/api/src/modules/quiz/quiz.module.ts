import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { QuizQuestion } from './domain/quiz-question.entity';
import { RiskAssessment } from './domain/risk-assessment.entity';
import { QuizQuestionRepository } from './infrastructure/quiz-question.repository';
import { RiskAssessmentRepository } from './infrastructure/risk-assessment.repository';
import { GetQuizQuestionsUseCase } from './application/get-quiz-questions.use-case';
import { SubmitQuizUseCase } from './application/submit-quiz.use-case';
import { QuizController } from './infrastructure/quiz.controller';

@Module({
  imports: [MikroOrmModule.forFeature([QuizQuestion, RiskAssessment])],
  controllers: [QuizController],
  providers: [
    {
      provide: 'QuizQuestionRepositoryPort',
      useClass: QuizQuestionRepository,
    },
    {
      provide: 'RiskAssessmentRepositoryPort',
      useClass: RiskAssessmentRepository,
    },
    GetQuizQuestionsUseCase,
    SubmitQuizUseCase,
  ],
})
export class QuizModule {}
