import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import config from '../../../mikro-orm.config';
import { QuizQuestion, QuizOption } from '../../modules/quiz/domain/quiz-question.entity';
import { InvestmentStrategy, PoolAllocation } from '../../modules/strategy/domain/investment-strategy.entity';
import { RiskLevel } from '../../shared/enums';

async function seed(): Promise<void> {
  const orm = await MikroORM.init({ ...config, allowGlobalContext: true });
  const em = orm.em.fork();

  const migrator = orm.getMigrator();
  await migrator.up();

  // Clear existing seed data
  await em.nativeDelete(QuizQuestion, {});
  await em.nativeDelete(InvestmentStrategy, {});

  // ── Quiz Questions ──────────────────────────────────────────────────────────
  const questions = [
    new QuizQuestion(
      'How would you feel if your savings balance dropped 10% temporarily?',
      1,
      [
        new QuizOption('Very uncomfortable — I need my money safe', 0),
        new QuizOption('Slightly concerned, but I could wait it out', 1),
        new QuizOption('Not worried — short-term dips are normal', 2),
      ],
    ),
    new QuizQuestion(
      'How long are you willing to leave your funds invested without withdrawing?',
      2,
      [
        new QuizOption('Less than 3 months', 0),
        new QuizOption('3–12 months', 1),
        new QuizOption('More than a year', 2),
      ],
    ),
    new QuizQuestion(
      'Would you accept a higher risk of occasional losses in exchange for potentially higher returns?',
      3,
      [
        new QuizOption('No — I prefer predictable, stable returns', 0),
        new QuizOption('Maybe — if the upside is significant', 1),
        new QuizOption('Yes — I prioritize maximum growth', 2),
      ],
    ),
    new QuizQuestion(
      'How do you feel about your savings being spread across multiple blockchain networks?',
      4,
      [
        new QuizOption('I prefer everything on one trusted network', 0),
        new QuizOption('I am okay with 2–3 networks if it helps yields', 1),
        new QuizOption('Diversification across networks sounds good to me', 2),
      ],
    ),
    new QuizQuestion(
      'If a better yield opportunity appeared overnight, should we move your funds automatically?',
      5,
      [
        new QuizOption('No — only move after I approve it manually', 0),
        new QuizOption('Yes, but only if the improvement is significant', 1),
        new QuizOption('Yes — always optimize for the best rate', 2),
      ],
    ),
  ];

  for (const q of questions) {
    em.persist(q);
  }

  // ── Investment Strategies ───────────────────────────────────────────────────
  const safeHarbor = new InvestmentStrategy(
    'Safe Harbor',
    RiskLevel.CONSERVATIVE,
    'Your savings stay on Ethereum, the most established blockchain network, earning steady yield through Aave. Minimal movement, maximum predictability.',
    [new PoolAllocation('ethereum', 'Aave v3', 'USDC', 100)],
    3,
    5,
    2,
    ['ethereum'],
  );

  const steadyGrowth = new InvestmentStrategy(
    'Steady Growth',
    RiskLevel.BALANCED,
    'A balanced split between Ethereum and Base gives you stable earnings with a bit more upside. The agent rebalances when a meaningfully better rate appears.',
    [
      new PoolAllocation('ethereum', 'Aave v3', 'USDC', 60),
      new PoolAllocation('base', 'Aave v3', 'USDC', 40),
    ],
    5,
    8,
    1.5,
    ['ethereum', 'base'],
  );

  const maxYield = new InvestmentStrategy(
    'Max Yield',
    RiskLevel.GROWTH,
    'Your savings chase the highest available rate across Base, Polygon, and Ethereum. The agent moves funds aggressively whenever a better opportunity arises.',
    [
      new PoolAllocation('base', 'Aave v3', 'USDC', 40),
      new PoolAllocation('polygon', 'Aave v3', 'USDC', 40),
      new PoolAllocation('ethereum', 'Aave v3', 'USDC', 20),
    ],
    7,
    12,
    1,
    ['ethereum', 'base', 'polygon'],
  );

  em.persist(safeHarbor);
  em.persist(steadyGrowth);
  em.persist(maxYield);

  await em.flush();

  console.log('✅ Seeded 5 quiz questions and 3 investment strategies');
  await orm.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
