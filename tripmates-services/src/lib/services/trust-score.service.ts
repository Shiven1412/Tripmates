import { z } from 'zod';

const trustInputSchema = z.object({
  userId: z.string(),
  aadhaarVerified: z.boolean().default(false),
  faceVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  completedTrips: z.number().min(0).default(0),
  positiveReviews: z.number().min(0).default(0),
  fiveStarReviews: z.number().min(0).default(0),
  reportsReceived: z.number().min(0).default(0),
  tripNoShows: z.number().min(0).default(0),
  fraudReports: z.number().min(0).default(0),
  accountAgeMonths: z.number().min(0).default(0),
});

export type TrustScoreInput = z.infer<typeof trustInputSchema>;

export class TrustScoreService {
  calculateTrustScore(input: TrustScoreInput): { trustScore: number; trustLevel: string } {
    const data = trustInputSchema.parse(input);

    let score = 0;
    if (data.aadhaarVerified) score += 20;
    if (data.faceVerified) score += 15;
    if (data.phoneVerified) score += 10;
    score += data.completedTrips * 2;
    score += data.positiveReviews;
    score += data.fiveStarReviews * 2;
    score -= data.reportsReceived * 10;
    score -= data.tripNoShows * 15;
    score -= data.fraudReports * 30;

    if (data.accountAgeMonths >= 12) score += 10;
    else if (data.accountAgeMonths >= 3) score += 5;

    score = Math.max(0, Math.min(100, score));

    return {
      trustScore: score,
      trustLevel: this.getTrustLevel(score),
    };
  }

  updateTrustScore(input: TrustScoreInput): { trustScore: number; trustLevel: string } {
    return this.calculateTrustScore(input);
  }

  getTrustLevel(score: number): string {
    if (score >= 90) return 'Elite Traveler';
    if (score >= 75) return 'Trusted Traveler';
    if (score >= 50) return 'Verified Traveler';
    if (score >= 25) return 'New Traveler';
    return 'Restricted';
  }
}
