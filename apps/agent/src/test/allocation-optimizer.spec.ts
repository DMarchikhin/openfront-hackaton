import { AllocationOptimizer, PoolAllocation, AllocationDecision } from '../domain/allocation-optimizer';

describe('AllocationOptimizer', () => {
  const optimizer = new AllocationOptimizer();

  const usdcBase: PoolAllocation = {
    chain: 'base',
    protocol: 'Aave v3',
    asset: 'USDC',
    allocationPercentage: 60,
  };

  const usdcPolygon: PoolAllocation = {
    chain: 'polygon',
    protocol: 'Aave v3',
    asset: 'USDC',
    allocationPercentage: 40,
  };

  const singlePool: PoolAllocation = {
    chain: 'base',
    protocol: 'Aave v3',
    asset: 'USDC',
    allocationPercentage: 100,
  };

  describe('computeAllocations()', () => {
    it('returns correct USDC amounts for 60/40 split of $1000', () => {
      const rates = new Map([
        ['base:Aave v3:USDC', 5.2],
        ['polygon:Aave v3:USDC', 4.8],
      ]);

      const results = optimizer.computeAllocations({
        poolAllocations: [usdcBase, usdcPolygon],
        totalAmountUsd: 1000,
        currentRates: rates,
        gasPrice: 0.001,
        rebalanceThreshold: 0.5,
      });

      expect(results).toHaveLength(2);
      expect(results[0].amountUsd).toBe(600);
      expect(results[1].amountUsd).toBe(400);
    });

    it('marks allocations as shouldExecute=true when yield exceeds gas cost', () => {
      const rates = new Map([['base:Aave v3:USDC', 5.2]]);

      const results = optimizer.computeAllocations({
        poolAllocations: [singlePool],
        totalAmountUsd: 1000,
        currentRates: rates,
        gasPrice: 0.001, // ~$0.02 gas cost, annual yield = $52
        rebalanceThreshold: 0.5,
      });

      expect(results[0].shouldExecute).toBe(true);
    });

    it('skips pools where gas cost exceeds projected annual yield improvement', () => {
      const rates = new Map([['base:Aave v3:USDC', 0.001]]);

      const results = optimizer.computeAllocations({
        poolAllocations: [singlePool],
        totalAmountUsd: 1,       // only $1 — annual yield = ~$0.00001
        currentRates: rates,
        gasPrice: 100,            // very high gas
        rebalanceThreshold: 0.5,
      });

      expect(results[0].shouldExecute).toBe(false);
      expect(results[0].rationale).toContain('gas');
    });

    it('returns empty array when all pools fail cost-benefit check', () => {
      const rates = new Map([
        ['base:Aave v3:USDC', 0.001],
        ['polygon:Aave v3:USDC', 0.001],
      ]);

      const results = optimizer.computeAllocations({
        poolAllocations: [usdcBase, usdcPolygon],
        totalAmountUsd: 0.01,
        currentRates: rates,
        gasPrice: 1000,
        rebalanceThreshold: 0.5,
      });

      const executable = results.filter((r) => r.shouldExecute);
      expect(executable).toHaveLength(0);
    });

    it('respects rebalanceThreshold — skips if APY difference is below threshold', () => {
      // currentApy 5.1%, newApy 5.2% → difference 0.1% < threshold 0.5%
      const rates = new Map([['base:Aave v3:USDC', 5.2]]);

      const results = optimizer.computeAllocations({
        poolAllocations: [singlePool],
        totalAmountUsd: 1000,
        currentRates: rates,
        gasPrice: 0.001,
        rebalanceThreshold: 0.5,
        currentApy: 5.1,          // already invested at 5.1%
      });

      expect(results[0].shouldExecute).toBe(false);
      expect(results[0].rationale).toContain('threshold');
    });

    it('handles single-pool 100% allocation', () => {
      const rates = new Map([['base:Aave v3:USDC', 5.0]]);

      const results = optimizer.computeAllocations({
        poolAllocations: [singlePool],
        totalAmountUsd: 500,
        currentRates: rates,
        gasPrice: 0.001,
        rebalanceThreshold: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].amountUsd).toBe(500);
      expect(results[0].pool).toMatchObject({ chain: 'base', protocol: 'Aave v3', asset: 'USDC' });
    });

    it('uses pool key for rate lookup and defaults to 0 when rate not found', () => {
      const rates = new Map<string, number>(); // empty — no rates

      const results = optimizer.computeAllocations({
        poolAllocations: [singlePool],
        totalAmountUsd: 1000,
        currentRates: rates,
        gasPrice: 0.001,
        rebalanceThreshold: 0.5,
      });

      expect(results[0].expectedApy).toBe(0);
      expect(results[0].shouldExecute).toBe(false);
    });
  });
});
