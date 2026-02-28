import { RiskAssessment } from '../../../src/modules/quiz/domain/risk-assessment.entity';
import { RiskLevel } from '../../../src/shared/enums';

describe('RiskAssessment', () => {
  describe('addAnswer()', () => {
    it('accumulates totalScore across answers', () => {
      const assessment = RiskAssessment.create('user-1');
      assessment.addAnswer('q-1', 2);
      assessment.addAnswer('q-2', 1);
      expect(assessment.totalScore).toBe(3);
      expect(assessment.answers).toHaveLength(2);
    });

    it('throws on duplicate questionId', () => {
      const assessment = RiskAssessment.create('user-1');
      assessment.addAnswer('q-1', 2);
      expect(() => assessment.addAnswer('q-1', 1)).toThrow('already been answered');
    });
  });

  describe('complete()', () => {
    it('calculates Conservative for 0–33% score range', () => {
      const assessment = RiskAssessment.create('user-1');
      // 3/10 = 30% → Conservative
      assessment.addAnswer('q-1', 0);
      assessment.addAnswer('q-2', 0);
      assessment.addAnswer('q-3', 1);
      assessment.addAnswer('q-4', 1);
      assessment.addAnswer('q-5', 1);
      assessment.complete(5, 10);
      expect(assessment.getRiskLevel()).toBe(RiskLevel.CONSERVATIVE);
    });

    it('calculates Balanced for 34–66% score range', () => {
      const assessment = RiskAssessment.create('user-1');
      // 5/10 = 50% → Balanced
      assessment.addAnswer('q-1', 1);
      assessment.addAnswer('q-2', 1);
      assessment.addAnswer('q-3', 1);
      assessment.addAnswer('q-4', 1);
      assessment.addAnswer('q-5', 1);
      assessment.complete(5, 10);
      expect(assessment.getRiskLevel()).toBe(RiskLevel.BALANCED);
    });

    it('calculates Growth for 67–100% score range', () => {
      const assessment = RiskAssessment.create('user-1');
      // 8/10 = 80% → Growth
      assessment.addAnswer('q-1', 2);
      assessment.addAnswer('q-2', 2);
      assessment.addAnswer('q-3', 2);
      assessment.addAnswer('q-4', 2);
      assessment.addAnswer('q-5', 0);
      assessment.complete(5, 10);
      expect(assessment.getRiskLevel()).toBe(RiskLevel.GROWTH);
    });

    it('throws if not all questions are answered', () => {
      const assessment = RiskAssessment.create('user-1');
      assessment.addAnswer('q-1', 2);
      expect(() => assessment.complete(5, 10)).toThrow('Expected 5 answers');
    });

    it('sets completedAt on completion', () => {
      const assessment = RiskAssessment.create('user-1');
      for (let i = 1; i <= 5; i++) assessment.addAnswer(`q-${i}`, 1);
      assessment.complete(5, 10);
      expect(assessment.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('getRiskLevel()', () => {
    it('throws if assessment is not completed', () => {
      const assessment = RiskAssessment.create('user-1');
      expect(() => assessment.getRiskLevel()).toThrow('not completed');
    });
  });
});
