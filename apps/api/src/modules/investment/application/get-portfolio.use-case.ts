import { Inject, Injectable, Logger } from '@nestjs/common';
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { AgentActionRepositoryPort } from '../domain/ports/agent-action.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';
import { AgentAction } from '../domain/agent-action.entity';
import { AgentActionStatus, AgentActionType } from '../../../shared/enums';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const AUSDC_ADDRESS = '0xf53B60F4006cab2b3C4688ce41fD5362427A2A66' as const;
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)']);

export interface PoolAction {
  id: string;
  actionType: string;
  amountUsd: number;
  expectedApyAfter: number | null;
  status: string;
  txHash: string | null;
  rationale: string;
  executedAt: string;
}

export interface PoolPosition {
  pool: { chain: string; protocol: string; asset: string };
  onChainBalanceUsd: number;
  totalSuppliedUsd: number;
  totalWithdrawnUsd: number;
  netInvestedUsd: number;
  earnedYieldUsd: number;
  latestApyPercent: number | null;
  allocationPercent: number;
  actions: PoolAction[];
}

export interface PortfolioResponse {
  investmentId: string;
  strategyName: string;
  riskLevel: string;
  totalValueUsd: number;
  totalInvestedUsd: number;
  totalEarnedUsd: number;
  walletBalanceUsd: number;
  investedBalanceUsd: number;
  smartAccountAddress: string;
  pools: PoolPosition[];
}

@Injectable()
export class GetPortfolioUseCase {
  private readonly logger = new Logger(GetPortfolioUseCase.name);

  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('AgentActionRepositoryPort')
    private readonly agentActionRepo: AgentActionRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<PortfolioResponse | null> {
    const investment = await this.investmentRepo.findActiveByUserId(userId);
    if (!investment) return null;

    const strategy = await this.strategyRepo.findById(investment.strategyId);
    const allActions = await this.agentActionRepo.findByInvestmentId(investment.id);

    const smartAccountAddress = process.env.OPENFORT_SMART_ACCOUNT_ADDRESS ?? '';
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const [walletBalanceRaw, aTokenBalanceRaw] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [smartAccountAddress as `0x${string}`],
      }),
      publicClient.readContract({
        address: AUSDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [smartAccountAddress as `0x${string}`],
      }),
    ]);

    const walletBalanceUsd = Number(walletBalanceRaw) / 1e6;
    const investedBalanceUsd = Number(aTokenBalanceRaw) / 1e6;

    // Group actions by (chain, protocol, asset)
    const poolMap = new Map<string, AgentAction[]>();
    for (const action of allActions) {
      const key = `${action.chain}|${action.protocol}|${action.asset}`;
      if (!poolMap.has(key)) poolMap.set(key, []);
      poolMap.get(key)!.push(action);
    }

    const pools: PoolPosition[] = [];
    for (const [key, actions] of poolMap.entries()) {
      const [chain, protocol, asset] = key.split('|');

      const executedSupplies = actions.filter(
        (a) => a.actionType === AgentActionType.SUPPLY && a.status === AgentActionStatus.EXECUTED,
      );
      const executedWithdrawals = actions.filter(
        (a) => a.actionType === AgentActionType.WITHDRAW && a.status === AgentActionStatus.EXECUTED,
      );

      const totalSuppliedUsd = executedSupplies.reduce(
        (sum, a) => sum + parseFloat(a.amount) / 1e6,
        0,
      );
      const totalWithdrawnUsd = executedWithdrawals.reduce(
        (sum, a) => sum + parseFloat(a.amount) / 1e6,
        0,
      );
      const netInvestedUsd = totalSuppliedUsd - totalWithdrawnUsd;

      // For now single-pool: on-chain balance is aToken balance
      const onChainBalanceUsd = investedBalanceUsd;
      const earnedYieldUsd = Math.max(0, onChainBalanceUsd - netInvestedUsd);

      const actionsWithApy = actions
        .filter((a) => a.expectedApyAfter !== null)
        .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
      const latestApyPercent = actionsWithApy[0]?.expectedApyAfter ?? null;

      const allocation = strategy?.poolAllocations.find(
        (p) => p.chain === chain && p.protocol === protocol && p.asset === asset,
      );

      const sortedActions = [...actions].sort(
        (a, b) => b.executedAt.getTime() - a.executedAt.getTime(),
      );

      pools.push({
        pool: { chain, protocol, asset },
        onChainBalanceUsd,
        totalSuppliedUsd,
        totalWithdrawnUsd,
        netInvestedUsd,
        earnedYieldUsd,
        latestApyPercent,
        allocationPercent: allocation?.allocationPercentage ?? 100,
        actions: sortedActions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          amountUsd: parseFloat(a.amount) / 1e6,
          expectedApyAfter: a.expectedApyAfter,
          status: a.status,
          txHash: a.txHash,
          rationale: a.rationale,
          executedAt: a.executedAt.toISOString(),
        })),
      });
    }

    const totalInvestedUsd = pools.reduce((sum, p) => sum + p.netInvestedUsd, 0);
    const totalValueUsd = walletBalanceUsd + investedBalanceUsd;
    const totalEarnedUsd = Math.max(0, investedBalanceUsd - totalInvestedUsd);

    return {
      investmentId: investment.id,
      strategyName: strategy?.name ?? 'Unknown',
      riskLevel: strategy?.riskLevel ?? 'unknown',
      totalValueUsd,
      totalInvestedUsd,
      totalEarnedUsd,
      walletBalanceUsd,
      investedBalanceUsd,
      smartAccountAddress,
      pools,
    };
  }
}
