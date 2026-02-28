import { Embeddable, Embedded, Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { RiskLevel } from '../../../shared/enums';

@Embeddable()
export class PoolAllocation {
  @Property()
  chain: string;

  @Property()
  protocol: string;

  @Property()
  asset: string;

  @Property()
  allocationPercentage: number;

  constructor(chain: string, protocol: string, asset: string, allocationPercentage: number) {
    this.chain = chain;
    this.protocol = protocol;
    this.asset = asset;
    this.allocationPercentage = allocationPercentage;
  }
}

@Entity()
export class InvestmentStrategy {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuidv4();

  @Property({ length: 200, unique: true })
  name: string;

  @Enum(() => RiskLevel)
  riskLevel: RiskLevel;

  @Property({ length: 1000 })
  description: string;

  @Embedded(() => PoolAllocation, { array: true })
  poolAllocations: PoolAllocation[] = [];

  @Property()
  expectedApyMin: number;

  @Property()
  expectedApyMax: number;

  @Property()
  rebalanceThreshold: number;

  @Property({ type: 'array' })
  allowedChains: string[] = [];

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  constructor(
    name: string,
    riskLevel: RiskLevel,
    description: string,
    poolAllocations: PoolAllocation[],
    expectedApyMin: number,
    expectedApyMax: number,
    rebalanceThreshold: number,
    allowedChains: string[],
  ) {
    this.name = name;
    this.riskLevel = riskLevel;
    this.description = description;
    this.poolAllocations = poolAllocations;
    this.expectedApyMin = expectedApyMin;
    this.expectedApyMax = expectedApyMax;
    this.rebalanceThreshold = rebalanceThreshold;
    this.allowedChains = allowedChains;
  }

  matchesRiskLevel(level: RiskLevel): boolean {
    return this.riskLevel === level;
  }

  validateAllocations(): void {
    const total = this.poolAllocations.reduce((sum, p) => sum + p.allocationPercentage, 0);
    if (Math.round(total) !== 100) {
      throw new Error(`Pool allocations must sum to 100, got ${total}`);
    }
  }
}
