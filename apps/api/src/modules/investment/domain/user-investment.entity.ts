import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { InvestmentStatus } from '../../../shared/enums';

@Entity()
export class UserInvestment {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuidv4();

  @Property()
  userId: string;

  @Property({ type: 'uuid' })
  strategyId: string;

  @Enum(() => InvestmentStatus)
  status: InvestmentStatus;

  @Property()
  activatedAt: Date;

  @Property({ nullable: true })
  deactivatedAt: Date | null = null;

  static create(userId: string, strategyId: string): UserInvestment {
    const inv = new UserInvestment();
    inv.userId = userId;
    inv.strategyId = strategyId;
    inv.status = InvestmentStatus.ACTIVE;
    inv.activatedAt = new Date();
    return inv;
  }

  activate(strategyId: string): void {
    if (this.status === InvestmentStatus.ACTIVE) {
      throw new Error('Investment is already active');
    }
    this.strategyId = strategyId;
    this.status = InvestmentStatus.ACTIVE;
    this.activatedAt = new Date();
    this.deactivatedAt = null;
  }

  deactivate(): void {
    if (this.status === InvestmentStatus.INACTIVE) {
      throw new Error('Investment is already inactive');
    }
    this.status = InvestmentStatus.INACTIVE;
    this.deactivatedAt = new Date();
  }
}
