import { UserInvestment } from '../user-investment.entity';

export interface InvestmentRepositoryPort {
  save(investment: UserInvestment): Promise<void>;
  findActiveByUserId(userId: string): Promise<UserInvestment | null>;
  findById(id: string): Promise<UserInvestment | null>;
}
