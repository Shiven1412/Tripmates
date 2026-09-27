export type ExpenseCategory =
  | 'Hotel'
  | 'Homestay'
  | 'Food'
  | 'Cab'
  | 'Bike Rental'
  | 'Scooty Rental'
  | 'Fuel'
  | 'Tickets'
  | 'Activities'
  | 'Other';

export type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'CUSTOM';

export type ExpenseMember = {
  userId: string;
  name: string;
  percentage?: number;
  customAmount?: number;
};

export type ExpenseSplitInput = {
  expenseId: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string;
  category: ExpenseCategory;
  splitMethod: SplitMethod;
  members: ExpenseMember[];
};

export type ExpenseParticipant = {
  userId: string;
  name: string;
  owedAmount: number;
  status: 'PENDING' | 'PAID';
};

export type ExpenseSummary = {
  totalExpense: number;
  youAreOwed: number;
  youOwe: number;
};

export class ExpenseService {
  createExpense(input: ExpenseSplitInput) {
    return {
      ...input,
      createdAt: new Date().toISOString(),
    };
  }

  splitExpense(input: ExpenseSplitInput) {
    const normalizedMembers = [...input.members];
    let participantResults: ExpenseParticipant[] = [];

    if (input.splitMethod === 'EQUAL') {
      const equalShare = Number((input.amount / normalizedMembers.length).toFixed(2));
      participantResults = normalizedMembers.map((member) => ({
        userId: member.userId,
        name: member.name,
        owedAmount: equalShare,
        status: 'PENDING',
      }));
    }

    if (input.splitMethod === 'PERCENTAGE') {
      participantResults = normalizedMembers.map((member) => {
        const share = ((member.percentage ?? 0) / 100) * input.amount;
        return {
          userId: member.userId,
          name: member.name,
          owedAmount: Number(share.toFixed(2)),
          status: 'PENDING',
        };
      });
    }

    if (input.splitMethod === 'CUSTOM') {
      participantResults = normalizedMembers.map((member) => {
        const share = member.customAmount ?? 0;
        return {
          userId: member.userId,
          name: member.name,
          owedAmount: Number(share.toFixed(2)),
          status: 'PENDING',
        };
      });
    }

    const summary: ExpenseSummary = {
      totalExpense: input.amount,
      youAreOwed: participantResults.filter((participant) => participant.userId !== input.paidBy).reduce((total, participant) => total + participant.owedAmount, 0),
      youOwe: 0,
    };

    return {
      expenseId: input.expenseId,
      tripId: input.tripId,
      title: input.title,
      category: input.category,
      totalAmount: input.amount,
      participants: participantResults,
      summary,
    };
  }

  calculateBalances(expenses: ExpenseSplitInput[]): Record<string, number> {
    const balances: Record<string, number> = {};

    for (const expense of expenses) {
      const result = this.splitExpense(expense);
      for (const participant of result.participants) {
        balances[participant.userId] = (balances[participant.userId] ?? 0) - participant.owedAmount;
      }
      balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;
    }

    return balances;
  }
}
