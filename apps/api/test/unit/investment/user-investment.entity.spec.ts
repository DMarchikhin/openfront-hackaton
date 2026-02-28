import { UserInvestment } from '../../../src/modules/investment/domain/user-investment.entity';
import { InvestmentStatus } from '../../../src/shared/enums';

describe('UserInvestment', () => {
  describe('create() factory', () => {
    it('returns a new active investment', () => {
      const inv = UserInvestment.create('user-1', 'strategy-uuid');
      expect(inv.userId).toBe('user-1');
      expect(inv.strategyId).toBe('strategy-uuid');
      expect(inv.status).toBe(InvestmentStatus.ACTIVE);
      expect(inv.activatedAt).toBeInstanceOf(Date);
      expect(inv.deactivatedAt).toBeNull();
    });
  });

  describe('activate()', () => {
    it('sets status to active and records activatedAt', () => {
      const inv = UserInvestment.create('user-1', 'strategy-1');
      inv.deactivate();
      inv.activate('strategy-2');
      expect(inv.status).toBe(InvestmentStatus.ACTIVE);
      expect(inv.strategyId).toBe('strategy-2');
      expect(inv.activatedAt).toBeInstanceOf(Date);
    });

    it('throws if already active', () => {
      const inv = UserInvestment.create('user-1', 'strategy-1');
      expect(() => inv.activate('strategy-2')).toThrow('already active');
    });
  });

  describe('deactivate()', () => {
    it('sets status to inactive and records deactivatedAt', () => {
      const inv = UserInvestment.create('user-1', 'strategy-1');
      inv.deactivate();
      expect(inv.status).toBe(InvestmentStatus.INACTIVE);
      expect(inv.deactivatedAt).toBeInstanceOf(Date);
    });

    it('throws if already inactive', () => {
      const inv = UserInvestment.create('user-1', 'strategy-1');
      inv.deactivate();
      expect(() => inv.deactivate()).toThrow('already inactive');
    });
  });
});
