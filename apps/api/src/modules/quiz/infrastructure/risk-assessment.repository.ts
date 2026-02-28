import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { RiskAssessment } from '../domain/risk-assessment.entity';
import { RiskAssessmentRepositoryPort } from '../domain/ports/risk-assessment.repository.port';

@Injectable()
export class RiskAssessmentRepository implements RiskAssessmentRepositoryPort {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(RiskAssessment)
    private readonly repo: EntityRepository<RiskAssessment>,
  ) {}

  async save(assessment: RiskAssessment): Promise<void> {
    await this.em.persistAndFlush(assessment);
  }

  async findByUserId(userId: string): Promise<RiskAssessment | null> {
    return this.repo.findOne({ userId });
  }
}
