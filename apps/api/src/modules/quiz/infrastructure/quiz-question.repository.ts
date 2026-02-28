import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { QuizQuestion } from '../domain/quiz-question.entity';
import { QuizQuestionRepositoryPort } from '../domain/ports/quiz-question.repository.port';

@Injectable()
export class QuizQuestionRepository implements QuizQuestionRepositoryPort {
  constructor(
    @InjectRepository(QuizQuestion)
    private readonly repo: EntityRepository<QuizQuestion>,
  ) {}

  async findAllOrdered(): Promise<QuizQuestion[]> {
    return this.repo.findAll({ orderBy: { displayOrder: 'ASC' } });
  }
}
