import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AgentAction } from '../domain/agent-action.entity';
import { AgentActionRepositoryPort } from '../domain/ports/agent-action.repository.port';

@Injectable()
export class AgentActionRepository implements AgentActionRepositoryPort {
  constructor(
    @InjectRepository(AgentAction)
    private readonly repo: EntityRepository<AgentAction>,
    private readonly em: EntityManager,
  ) {}

  async save(action: AgentAction): Promise<void> {
    await this.em.persistAndFlush(action);
  }

  async findByInvestmentId(investmentId: string): Promise<AgentAction[]> {
    return this.repo.find({ investmentId }, { orderBy: { executedAt: 'ASC' } });
  }
}
