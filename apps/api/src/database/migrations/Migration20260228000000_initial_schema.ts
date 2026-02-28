import { Migration } from '@mikro-orm/migrations';

export class Migration20260228000000_initial_schema extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "quiz_question" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "text" varchar(500) NOT NULL,
        "display_order" int NOT NULL,
        "options" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "quiz_question_display_order_unique" UNIQUE ("display_order")
      );
    `);

    this.addSql(`
      CREATE TABLE "investment_strategy" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "risk_level" text CHECK ("risk_level" IN ('conservative', 'balanced', 'growth')) NOT NULL,
        "description" varchar(1000) NOT NULL,
        "pool_allocations" jsonb NOT NULL DEFAULT '[]',
        "expected_apy_min" double precision NOT NULL,
        "expected_apy_max" double precision NOT NULL,
        "rebalance_threshold" double precision NOT NULL,
        "allowed_chains" text[] NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "investment_strategy_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "investment_strategy_name_unique" UNIQUE ("name")
      );
    `);

    this.addSql(`
      CREATE TABLE "risk_assessment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" varchar(255) NOT NULL,
        "answers" jsonb NOT NULL DEFAULT '[]',
        "total_score" int NOT NULL DEFAULT 0,
        "risk_level" text CHECK ("risk_level" IN ('conservative', 'balanced', 'growth')),
        "completed_at" timestamptz,
        CONSTRAINT "risk_assessment_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(`
      CREATE TABLE "user_investment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" varchar(255) NOT NULL,
        "strategy_id" uuid NOT NULL,
        "status" text CHECK ("status" IN ('active', 'inactive')) NOT NULL,
        "activated_at" timestamptz NOT NULL,
        "deactivated_at" timestamptz,
        CONSTRAINT "user_investment_pkey" PRIMARY KEY ("id")
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "user_investment";`);
    this.addSql(`DROP TABLE IF EXISTS "risk_assessment";`);
    this.addSql(`DROP TABLE IF EXISTS "investment_strategy";`);
    this.addSql(`DROP TABLE IF EXISTS "quiz_question";`);
  }
}
