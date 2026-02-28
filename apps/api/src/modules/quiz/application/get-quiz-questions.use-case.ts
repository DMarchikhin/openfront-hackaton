import { Inject, Injectable } from '@nestjs/common';
import { QuizQuestion } from '../domain/quiz-question.entity';
import { QuizQuestionRepositoryPort } from '../domain/ports/quiz-question.repository.port';

@Injectable()
export class GetQuizQuestionsUseCase {
  constructor(
    @Inject('QuizQuestionRepositoryPort')
    private readonly quizQuestionRepo: QuizQuestionRepositoryPort,
  ) {}

  async execute(): Promise<QuizQuestion[]> {
    return this.quizQuestionRepo.findAllOrdered();
  }
}
