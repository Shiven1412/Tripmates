export type SettlementStatus = 'PENDING_CONFIRMATION' | 'SETTLED' | 'REJECTED';

export type SettlementRecord = {
  expenseId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  status: SettlementStatus;
  settledAt?: string;
};

export class SettlementService {
  createSettlement(input: Omit<SettlementRecord, 'status' | 'settledAt'>): SettlementRecord {
    return {
      ...input,
      status: 'PENDING_CONFIRMATION',
      settledAt: undefined,
    };
  }

  confirmSettlement(settlement: SettlementRecord): SettlementRecord {
    return {
      ...settlement,
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
    };
  }

  rejectSettlement(settlement: SettlementRecord): SettlementRecord {
    return {
      ...settlement,
      status: 'REJECTED',
      settledAt: undefined,
    };
  }
}
