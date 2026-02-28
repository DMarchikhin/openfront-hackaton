import { RiskAssessment } from '../risk-assessment.entity';

export interface RiskAssessmentRepositoryPort {
  save(assessment: RiskAssessment): Promise<void>;
  findByUserId(userId: string): Promise<RiskAssessment | null>;
}
