import { z } from 'zod';
import { providerRankingInputSchema, type ProviderRankingInput } from '../schemas/recommendation.schemas';

export type ProviderRankResult = {
  rankingScore: number;
  rankingTier: string;
};

export class ProviderRankingService {
  calculateProviderRank(input: ProviderRankingInput): ProviderRankResult {
    const data = providerRankingInputSchema.parse(input);

    const ratingScore = (data.averageRating / 5) * 30;
    const completionScore = Math.min(100, data.bookingsCompleted / 2.5) * 0.2;
    const responseScore = Math.max(0, 100 - data.responseTimeMinutes) * 0.15;
    const trustScore = data.trustScore * 0.15;
    const completenessScore = data.profileCompleteness * 0.1;
    const activityScore = data.recentActivity * 0.1;

    const total = ratingScore + completionScore + responseScore + trustScore + completenessScore + activityScore;
    const rankingScore = Math.max(0, Math.min(100, Math.round(total)));

    return {
      rankingScore,
      rankingTier: this.getRankingTier(rankingScore),
    };
  }

  rankProviders(providers: ProviderRankingInput[]): ProviderRankingInput[] {
    return providers
      .map((provider) => ({ ...provider, _score: this.calculateProviderRank(provider).rankingScore }))
      .sort((a, b) => (b as ProviderRankingInput & { _score: number })._score - (a as ProviderRankingInput & { _score: number })._score);
  }

  private getRankingTier(score: number): string {
    if (score >= 90) return 'Top Rated';
    if (score >= 75) return 'Recommended';
    if (score >= 60) return 'Good Provider';
    return 'Standard';
  }
}
