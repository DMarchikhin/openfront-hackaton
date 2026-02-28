import { InvestmentStrategy, PoolAllocation } from '../../../src/modules/strategy/domain/investment-strategy.entity';
import { RiskLevel } from '../../../src/shared/enums';

function makeStrategy(riskLevel: RiskLevel, allocations: PoolAllocation[]): InvestmentStrategy {
  return new InvestmentStrategy(
    'Test Strategy',
    riskLevel,
    'A test strategy',
    allocations,
    5,
    8,
    1.5,
    ['ethereum'],
  );
}

describe('InvestmentStrategy', () => {
  describe('matchesRiskLevel()', () => {
    it('returns true for matching level', () => {
      const strategy = makeStrategy(RiskLevel.BALANCED, [
        new PoolAllocation('ethereum', 'Aave v3', 'USDC', 100),
      ]);
      expect(strategy.matchesRiskLevel(RiskLevel.BALANCED)).toBe(true);
    });

    it('returns false for non-matching level', () => {
      const strategy = makeStrategy(RiskLevel.BALANCED, [
        new PoolAllocation('ethereum', 'Aave v3', 'USDC', 100),
      ]);
      expect(strategy.matchesRiskLevel(RiskLevel.CONSERVATIVE)).toBe(false);
      expect(strategy.matchesRiskLevel(RiskLevel.GROWTH)).toBe(false);
    });
  });

  describe('validateAllocations()', () => {
    it('passes when percentages sum to 100', () => {
      const strategy = makeStrategy(RiskLevel.BALANCED, [
        new PoolAllocation('ethereum', 'Aave v3', 'USDC', 60),
        new PoolAllocation('base', 'Aave v3', 'USDC', 40),
      ]);
      expect(() => strategy.validateAllocations()).not.toThrow();
    });

    it('throws when percentages do not sum to 100', () => {
      const strategy = makeStrategy(RiskLevel.BALANCED, [
        new PoolAllocation('ethereum', 'Aave v3', 'USDC', 60),
        new PoolAllocation('base', 'Aave v3', 'USDC', 30),
      ]);
      expect(() => strategy.validateAllocations()).toThrow('sum to 100');
    });
  });
});
