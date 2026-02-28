import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentAction } from '../domain/agent-action.entity';
import { AgentActionRepositoryPort } from '../domain/ports/agent-action.repository.port';
import { InvestmentRepositoryPort } from '../domain/ports/investment.repository.port';
import { StrategyRepositoryPort } from '../../strategy/domain/ports/strategy.repository.port';
import { AgentActionType, AgentActionStatus } from '../../../shared/enums';

@Injectable()
export class ExecuteInvestmentUseCase {
  private readonly logger = new Logger(ExecuteInvestmentUseCase.name);

  constructor(
    @Inject('InvestmentRepositoryPort')
    private readonly investmentRepo: InvestmentRepositoryPort,
    @Inject('AgentActionRepositoryPort')
    private readonly agentActionRepo: AgentActionRepositoryPort,
    @Inject('StrategyRepositoryPort')
    private readonly strategyRepo: StrategyRepositoryPort,
  ) {}

  async execute(investmentId: string, userAmount: number): Promise<{ investmentId: string; status: string; message: string }> {
    const investment = await this.investmentRepo.findById(investmentId);
    if (!investment) throw new NotFoundException('Investment not found');

    const strategy = await this.strategyRepo.findById(investment.strategyId);
    if (!strategy) throw new NotFoundException('Strategy not found');

    // Fire-and-forget agent trigger
    void this.triggerAgent({
      investmentId,
      userId: investment.userId,
      strategy,
      userAmount,
      walletAddress: process.env.WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    });

    return {
      investmentId,
      status: 'executing',
      message: 'Agent is processing your investment...',
    };
  }

  async triggerRebalance(params: {
    investmentId: string;
    userId: string;
    walletAddress: string;
    totalAmountUsd: number;
    previousStrategy: { id: string; name: string; poolAllocations: any[]; allowedChains: string[] };
    newStrategy: { id: string; name: string; riskLevel: string; poolAllocations: any[]; rebalanceThreshold: number; allowedChains: string[] };
  }): Promise<void> {
    const agentServiceUrl = process.env.AGENT_SERVICE_URL;

    if (agentServiceUrl) {
      // Trigger agent service — agent responds 202 immediately, runs in background, POSTs callback when done
      try {
        const response = await fetch(`${agentServiceUrl}/rebalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(5_000),
        });
        if (response.status !== 202) throw new Error(`Agent service returned ${response.status}`);
        // Don't parse body — results arrive via callback to POST /investments/:id/actions/report
      } catch (err) {
        this.logger.error(`Agent rebalance failed: ${(err as Error).message}`);
        await this.createFailedAction(params.investmentId, params.userId, params.newStrategy.id, (err as Error).message);
      }
    } else {
      this.logger.log(`AGENT_SERVICE_URL not set — creating pending rebalance action for ${params.investmentId}`);
      const withdrawAction = AgentAction.create({
        investmentId: params.investmentId,
        userId: params.userId,
        actionType: AgentActionType.WITHDRAW,
        strategyId: params.previousStrategy.id,
        chain: params.previousStrategy.allowedChains[0] ?? 'base',
        protocol: 'Aave v3',
        asset: 'USDC',
        amount: String(params.totalAmountUsd),
        rationale: `Rebalance queued: withdraw from ${params.previousStrategy.name}. Set AGENT_SERVICE_URL to enable live execution.`,
      });
      await this.agentActionRepo.save(withdrawAction);

      const supplyAction = AgentAction.create({
        investmentId: params.investmentId,
        userId: params.userId,
        actionType: AgentActionType.SUPPLY,
        strategyId: params.newStrategy.id,
        chain: params.newStrategy.allowedChains[0] ?? 'base',
        protocol: 'Aave v3',
        asset: 'USDC',
        amount: String(params.totalAmountUsd),
        rationale: `Rebalance queued: supply to ${params.newStrategy.name} pools. Set AGENT_SERVICE_URL to enable live execution.`,
      });
      await this.agentActionRepo.save(supplyAction);
    }
  }

  private async triggerAgent(params: {
    investmentId: string;
    userId: string;
    strategy: { id: string; name: string; riskLevel: string; poolAllocations: any[]; rebalanceThreshold: number; allowedChains: string[] };
    userAmount: number;
    walletAddress: string;
  }): Promise<void> {
    const agentServiceUrl = process.env.AGENT_SERVICE_URL;

    if (agentServiceUrl) {
      // Trigger agent service via HTTP — agent responds 202 immediately, runs in background, POSTs callback when done
      try {
        const response = await fetch(`${agentServiceUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(5_000),
        });

        if (response.status !== 202) {
          throw new Error(`Agent service returned ${response.status}`);
        }
        // Don't parse body — results arrive via callback to POST /investments/:id/actions/report
      } catch (err) {
        this.logger.error(`Agent service call failed: ${(err as Error).message}`);
        await this.createFailedAction(params.investmentId, params.userId, params.strategy.id, (err as Error).message);
      }
    } else {
      // No agent service configured — create pending record for demo/dev mode
      this.logger.log(`AGENT_SERVICE_URL not set — creating pending action for investment ${params.investmentId}`);
      const action = AgentAction.create({
        investmentId: params.investmentId,
        userId: params.userId,
        actionType: AgentActionType.RATE_CHECK,
        strategyId: params.strategy.id,
        chain: params.strategy.allowedChains[0] ?? 'base',
        protocol: 'Aave v3',
        asset: 'USDC',
        amount: String(params.userAmount),
        rationale: `Agent queued: will allocate $${params.userAmount} across ${params.strategy.name} pools. Set AGENT_SERVICE_URL to enable live execution.`,
      });
      await this.agentActionRepo.save(action);
    }
  }

  async reportAgentResults(
    investmentId: string,
    userId: string,
    strategyId: string,
    actions: Array<{
      actionType?: string;
      pool?: { chain: string; protocol: string; asset: string };
      amountUsd?: number;
      expectedApy?: number;
      gasCostUsd?: number;
      status?: string;
      txHash?: string;
      rationale: string;
    }>,
  ): Promise<void> {
    await this.saveAgentActions(investmentId, userId, strategyId, actions);
  }

  private async saveAgentActions(
    investmentId: string,
    userId: string,
    strategyId: string,
    actions: Array<{
      actionType?: string;
      pool?: { chain: string; protocol: string; asset: string };
      amountUsd?: number;
      expectedApy?: number;
      gasCostUsd?: number;
      status?: string;
      txHash?: string;
      rationale: string;
    }>,
  ): Promise<void> {
    for (const a of actions) {
      const action = AgentAction.create({
        investmentId,
        userId,
        actionType: (a.actionType as AgentActionType) ?? AgentActionType.SUPPLY,
        strategyId,
        chain: a.pool?.chain ?? 'base',
        protocol: a.pool?.protocol ?? 'Aave v3',
        asset: a.pool?.asset ?? 'USDC',
        amount: String(a.amountUsd ?? 0),
        rationale: a.rationale,
        gasCostUsd: a.gasCostUsd,
        expectedApyAfter: a.expectedApy,
      });

      if (a.status === 'executed' && a.txHash) {
        action.markExecuted(a.txHash);
      } else if (a.status === 'failed') {
        action.markFailed('Agent reported failure');
      } else if (a.status === 'skipped') {
        action.markSkipped(a.rationale);
      }

      await this.agentActionRepo.save(action);
    }
  }

  private async createFailedAction(investmentId: string, userId: string, strategyId: string, reason: string): Promise<void> {
    const action = AgentAction.create({
      investmentId,
      userId,
      actionType: AgentActionType.RATE_CHECK,
      strategyId,
      chain: 'base',
      protocol: 'Aave v3',
      asset: 'USDC',
      amount: '0',
      rationale: `Agent execution failed: ${reason}`,
    });
    action.markFailed(reason);
    await this.agentActionRepo.save(action);
  }
}
