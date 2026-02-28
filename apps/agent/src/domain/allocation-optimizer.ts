export interface PoolAllocation {
  chain: string;
  protocol: string;
  asset: string;
  allocationPercentage: number;
}

export interface AllocationDecision {
  pool: PoolAllocation;
  amountUsd: number;
  expectedApy: number;
  gasCostUsd: number;
  shouldExecute: boolean;
  rationale: string;
}

export interface ComputeParams {
  poolAllocations: PoolAllocation[];
  totalAmountUsd: number;
  currentRates: Map<string, number>;
  gasPrice: number;
  rebalanceThreshold: number;
  currentApy?: number;
}

export class AllocationOptimizer {
  private poolKey(pool: PoolAllocation): string {
    return `${pool.chain}:${pool.protocol}:${pool.asset}`;
  }

  computeAllocations(params: ComputeParams): AllocationDecision[] {
    const { poolAllocations, totalAmountUsd, currentRates, gasPrice, rebalanceThreshold, currentApy } = params;

    return poolAllocations.map((pool) => {
      const amountUsd = totalAmountUsd * (pool.allocationPercentage / 100);
      const expectedApy = currentRates.get(this.poolKey(pool)) ?? 0;
      const annualYieldUsd = amountUsd * (expectedApy / 100);
      const gasCostUsd = gasPrice;

      if (expectedApy === 0 || annualYieldUsd <= gasCostUsd) {
        return {
          pool,
          amountUsd,
          expectedApy,
          gasCostUsd,
          shouldExecute: false,
          rationale: `Skipped: gas cost ($${gasCostUsd.toFixed(4)}) exceeds projected annual yield ($${annualYieldUsd.toFixed(4)})`,
        };
      }

      if (currentApy !== undefined && Math.abs(expectedApy - currentApy) < rebalanceThreshold) {
        return {
          pool,
          amountUsd,
          expectedApy,
          gasCostUsd,
          shouldExecute: false,
          rationale: `Skipped: APY improvement ${(expectedApy - currentApy).toFixed(2)}% is below rebalance threshold ${rebalanceThreshold}%`,
        };
      }

      return {
        pool,
        amountUsd,
        expectedApy,
        gasCostUsd,
        shouldExecute: true,
        rationale: `Supply $${amountUsd.toFixed(2)} to ${pool.protocol} on ${pool.chain} at ${expectedApy}% APY (gas: $${gasCostUsd.toFixed(4)}, annual yield: $${annualYieldUsd.toFixed(2)})`,
      };
    });
  }
}
