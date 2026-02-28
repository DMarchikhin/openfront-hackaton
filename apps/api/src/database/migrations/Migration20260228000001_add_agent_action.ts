import { Migration } from '@mikro-orm/migrations';

export class Migration20260228000001_add_agent_action extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "agent_action" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "investment_id" uuid NOT NULL,
        "user_id" varchar(255) NOT NULL,
        "action_type" text CHECK ("action_type" IN ('supply', 'withdraw', 'rebalance', 'rate_check')) NOT NULL,
        "strategy_id" uuid NOT NULL,
        "chain" varchar(255) NOT NULL,
        "protocol" varchar(255) NOT NULL,
        "asset" varchar(255) NOT NULL,
        "amount" varchar(255) NOT NULL,
        "gas_cost_usd" double precision,
        "expected_apy_before" double precision,
        "expected_apy_after" double precision,
        "rationale" varchar(1000) NOT NULL,
        "status" text CHECK ("status" IN ('pending', 'executed', 'failed', 'skipped')) NOT NULL,
        "tx_hash" varchar(255),
        "executed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "agent_action_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE INDEX "agent_action_investment_id_idx" ON "agent_action" ("investment_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "agent_action";`);
  }
}
