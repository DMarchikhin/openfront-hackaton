import { QuizQuestion } from '../quiz-question.entity';

export interface QuizQuestionRepositoryPort {
  findAllOrdered(): Promise<QuizQuestion[]>;
}
