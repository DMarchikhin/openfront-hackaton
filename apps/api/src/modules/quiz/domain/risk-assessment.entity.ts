import { Embeddable, Embedded, Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { RiskLevel } from '../../../shared/enums';

@Embeddable()
export class QuizAnswer {
  @Property()
  questionId: string;

  @Property()
  score: number;

  constructor(questionId: string, score: number) {
    this.questionId = questionId;
    this.score = score;
  }
}

@Entity()
export class RiskAssessment {
  @PrimaryKey({ type: 'uuid' })
  id: string = uuidv4();

  @Property()
  userId: string;

  @Embedded(() => QuizAnswer, { array: true })
  answers: QuizAnswer[] = [];

  @Property({ default: 0 })
  totalScore: number = 0;

  @Enum({ items: () => RiskLevel, nullable: true })
  riskLevel: RiskLevel | null = null;

  @Property({ nullable: true })
  completedAt: Date | null = null;

  static create(userId: string): RiskAssessment {
    const assessment = new RiskAssessment();
    assessment.userId = userId;
    return assessment;
  }

  addAnswer(questionId: string, scoreWeight: number): void {
    const alreadyAnswered = this.answers.some((a) => a.questionId === questionId);
    if (alreadyAnswered) {
      throw new Error(`Question ${questionId} has already been answered`);
    }
    this.answers.push(new QuizAnswer(questionId, scoreWeight));
    this.totalScore += scoreWeight;
  }

  complete(totalQuestions: number, maxPossibleScore: number): void {
    if (this.answers.length !== totalQuestions) {
      throw new Error(`Expected ${totalQuestions} answers, got ${this.answers.length}`);
    }
    const percentage = maxPossibleScore > 0 ? (this.totalScore / maxPossibleScore) * 100 : 0;
    if (percentage <= 33) {
      this.riskLevel = RiskLevel.CONSERVATIVE;
    } else if (percentage <= 66) {
      this.riskLevel = RiskLevel.BALANCED;
    } else {
      this.riskLevel = RiskLevel.GROWTH;
    }
    this.completedAt = new Date();
  }

  getRiskLevel(): RiskLevel {
    if (!this.riskLevel) {
      throw new Error('Assessment not completed yet');
    }
    return this.riskLevel;
  }
}
