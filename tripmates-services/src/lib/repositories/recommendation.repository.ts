export interface RecommendationRecord {
  id: string;
  userId: string;
  targetUserId?: string;
  destination?: string;
  score: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class RecommendationRepository {
  private readonly memory: RecommendationRecord[] = [];

  async save(record: Omit<RecommendationRecord, 'createdAt'> & { createdAt?: Date }): Promise<RecommendationRecord> {
    const created = { ...record, createdAt: record.createdAt ?? new Date() };
    this.memory.push(created);
    return created;
  }

  async findByUser(userId: string, limit = 10): Promise<RecommendationRecord[]> {
    return this.memory
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async findByDestination(destination: string): Promise<RecommendationRecord[]> {
    return this.memory.filter((item) => item.destination === destination);
  }
}
