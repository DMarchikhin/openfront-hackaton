import { Inject, Injectable } from '@nestjs/common';
import { RiskAssessment } from '../domain/risk-assessment.entity';
import { QuizQuestionRepositoryPort } from '../domain/ports/quiz-question.repository.port';
import { RiskAssessmentRepositoryPort } from '../domain/ports/risk-assessment.repository.port';

interface AnswerInput {
  questionId: string;
  selectedValue: number;
}

const RISK_DESCRIPTIONS: Record<string, string> = {
  conservative:
    'You prefer stability and predictability. We will keep your savings in low-risk pools with steady, reliable returns.',
  balanced:
    'You are comfortable with some movement in exchange for better returns. We will spread your savings across a mix of stable and higher-yield pools.',
  growth:
    'You are focused on maximizing returns. We will actively move your savings to wherever the best yield is available.',
};

@Injectable()
export class SubmitQuizUseCase {
  constructor(
    @Inject('QuizQuestionRepositoryPort')
    private readonly quizQuestionRepo: QuizQuestionRepositoryPort,
    @Inject('RiskAssessmentRepositoryPort')
    private readonly riskAssessmentRepo: RiskAssessmentRepositoryPort,
  ) {}

  async execute(
    userId: string,
    answers: AnswerInput[],
  ): Promise<{
    assessmentId: string;
    riskLevel: string;
    totalScore: number;
    maxPossibleScore: number;
    description: string;
  }> {
    const questions = await this.quizQuestionRepo.findAllOrdered();
    const maxPossibleScore = questions.reduce((sum, q) => {
      const maxWeight = Math.max(...q.options.map((o) => o.scoreWeight));
      return sum + maxWeight;
    }, 0);

    const assessment = RiskAssessment.create(userId);
    for (const answer of answers) {
      assessment.addAnswer(answer.questionId, answer.selectedValue);
    }
    assessment.complete(questions.length, maxPossibleScore);

    await this.riskAssessmentRepo.save(assessment);

    const riskLevel = assessment.getRiskLevel();
    return {
      assessmentId: assessment.id,
      riskLevel,
      totalScore: assessment.totalScore,
      maxPossibleScore,
      description: RISK_DESCRIPTIONS[riskLevel] ?? '',
    };
  }
}
