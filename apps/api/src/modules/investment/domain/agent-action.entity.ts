import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { AgentActionType, AgentActionStatus } from '../../../shared/enums';

@Entity()
export class AgentAction {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuidv4();

  @Property({ type: 'uuid' })
  investmentId: string;

  @Property()
  userId: string;

  @Enum(() => AgentActionType)
  actionType: AgentActionType;

  @Property({ type: 'uuid' })
  strategyId: string;

  @Property()
  chain: string;

  @Property()
  protocol: string;

  @Property()
  asset: string;

  @Property()
  amount: string;

  @Property({ nullable: true })
  gasCostUsd: number | null = null;

  @Property({ nullable: true })
  expectedApyBefore: number | null = null;

  @Property({ nullable: true })
  expectedApyAfter: number | null = null;

  @Property({ length: 1000 })
  rationale: string;

  @Enum(() => AgentActionStatus)
  status: AgentActionStatus;

  @Property({ nullable: true })
  txHash: string | null = null;

  @Property({ onCreate: () => new Date() })
  executedAt: Date = new Date();

  static create(params: {
    investmentId: string;
    userId: string;
    actionType: AgentActionType;
    strategyId: string;
    chain: string;
    protocol: string;
    asset: string;
    amount: string;
    rationale: string;
    gasCostUsd?: number;
    expectedApyBefore?: number;
    expectedApyAfter?: number;
  }): AgentAction {
    const action = new AgentAction();
    action.investmentId = params.investmentId;
    action.userId = params.userId;
    action.actionType = params.actionType;
    action.strategyId = params.strategyId;
    action.chain = params.chain;
    action.protocol = params.protocol;
    action.asset = params.asset;
    action.amount = params.amount;
    action.rationale = params.rationale;
    action.status = AgentActionStatus.PENDING;
    action.gasCostUsd = params.gasCostUsd ?? null;
    action.expectedApyBefore = params.expectedApyBefore ?? null;
    action.expectedApyAfter = params.expectedApyAfter ?? null;
    return action;
  }

  markExecuted(txHash: string): void {
    this.status = AgentActionStatus.EXECUTED;
    this.txHash = txHash;
  }

  markFailed(reason: string): void {
    this.status = AgentActionStatus.FAILED;
    this.rationale = `${this.rationale} | FAILED: ${reason}`;
  }

  markSkipped(reason: string): void {
    this.status = AgentActionStatus.SKIPPED;
    this.rationale = `${this.rationale} | SKIPPED: ${reason}`;
  }
}
