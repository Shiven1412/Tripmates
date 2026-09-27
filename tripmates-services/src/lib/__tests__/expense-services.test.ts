import { describe, expect, it } from 'vitest';

import { ExpenseService } from '../services/expense.service';
import { SettlementService } from '../services/settlement.service';
import { UpiService } from '../services/upi.service';

describe('ExpenseService', () => {
  it('splits equal expenses correctly across trip members', () => {
    const service = new ExpenseService();
    const result = service.splitExpense({
      expenseId: 'exp-1',
      tripId: 'trip-1',
      title: 'Hotel Booking',
      amount: 9000,
      paidBy: 'rahul',
      category: 'Hotel',
      splitMethod: 'EQUAL',
      members: [
        { userId: 'rahul', name: 'Rahul' },
        { userId: 'rajesh', name: 'Rajesh' },
        { userId: 'ravi', name: 'Ravi' },
      ],
    });

    expect(result.participants).toHaveLength(3);
    expect(result.participants[0].owedAmount).toBe(3000);
    expect(result.summary.totalExpense).toBe(9000);
    expect(result.summary.youAreOwed).toBe(6000);
    expect(result.summary.youOwe).toBe(0);
  });

  it('supports percentage split and custom split', () => {
    const service = new ExpenseService();

    const percent = service.splitExpense({
      expenseId: 'exp-2',
      tripId: 'trip-1',
      title: 'Cab',
      amount: 10000,
      paidBy: 'rahul',
      category: 'Cab',
      splitMethod: 'PERCENTAGE',
      members: [
        { userId: 'rahul', name: 'Rahul', percentage: 50 },
        { userId: 'rajesh', name: 'Rajesh', percentage: 30 },
        { userId: 'ravi', name: 'Ravi', percentage: 20 },
      ],
    });

    const custom = service.splitExpense({
      expenseId: 'exp-3',
      tripId: 'trip-1',
      title: 'Food',
      amount: 9000,
      paidBy: 'rahul',
      category: 'Food',
      splitMethod: 'CUSTOM',
      members: [
        { userId: 'rahul', name: 'Rahul', customAmount: 5000 },
        { userId: 'rajesh', name: 'Rajesh', customAmount: 2500 },
        { userId: 'ravi', name: 'Ravi', customAmount: 1500 },
      ],
    });

    expect(percent.participants[0].owedAmount).toBe(5000);
    expect(custom.participants[0].owedAmount).toBe(5000);
  });
});

describe('SettlementService', () => {
  it('creates settlement records in pending confirmation state', () => {
    const service = new SettlementService();
    const settlement = service.createSettlement({
      expenseId: 'exp-1',
      payerId: 'rajesh',
      receiverId: 'rahul',
      amount: 3000,
    });

    expect(settlement.status).toBe('PENDING_CONFIRMATION');
    expect(settlement.amount).toBe(3000);
  });
});

describe('UpiService', () => {
  it('generates a valid UPI deep link', () => {
    const service = new UpiService();
    const result = service.generateUpiLink('rahul@ybl', 'Rahul', 3000);

    expect(result).toContain('upi://pay');
    expect(result).toContain('pa=rahul%40ybl');
    expect(result).toContain('am=3000');
  });
});
