import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { UserInvestment } from '../domain/user-investment.entity';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { InvestmentStatus } from '../../../shared/enums';

@Injectable()
export class InvestmentRepository implements InvestmentRepositoryPort {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(UserInvestment)
    private readonly repo: EntityRepository<UserInvestment>,
  ) {}

  async save(investment: UserInvestment): Promise<void> {
    await this.em.persistAndFlush(investment);
  }

  async findActiveByUserId(userId: string): Promise<UserInvestment | null> {
    return this.repo.findOne({ userId, status: InvestmentStatus.ACTIVE });
  }

  async findById(id: string): Promise<UserInvestment | null> {
    return this.repo.findOne({ id });
  }
}
