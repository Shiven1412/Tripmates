import { describe, expect, it } from 'vitest';

import { PersonalityService } from '../services/personality.service';
import { ProviderRankingService } from '../services/provider-ranking.service';
import { SeasonRecommendationService } from '../services/season-recommendation.service';
import { TripChemistryService } from '../services/trip-chemistry.service';
import { TrustScoreService } from '../services/trust-score.service';

describe('TripChemistryService', () => {
  it('returns a bounded score and breakdown', () => {
    const service = new TripChemistryService();
    const result = service.calculateCompatibility(
      {
        id: 'user-1',
        budget: 'MID',
        travelStyle: 'BALANCED',
        drinking: 'MODERATE',
        smoking: 'NO',
        partying: 'LOW',
        adventureLevel: 7,
        foodPreferences: ['North Indian', 'Cafe'],
        socialEnergy: 4,
      },
      {
        id: 'user-2',
        budget: 'MID',
        travelStyle: 'BALANCED',
        drinking: 'MODERATE',
        smoking: 'NO',
        partying: 'LOW',
        adventureLevel: 8,
        foodPreferences: ['North Indian', 'Street Food'],
        socialEnergy: 5,
      },
    );

    expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.compatibilityScore).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('budgetMatch');
    expect(result.breakdown).toHaveProperty('socialMatch');
    expect(result.badge).toMatch(/Perfect|Excellent|Good|Moderate|Weak/);
  });
});

describe('TrustScoreService', () => {
  it('calculates trust levels deterministically', () => {
    const service = new TrustScoreService();
    const result = service.calculateTrustScore({
      userId: 'user-1',
      aadhaarVerified: true,
      faceVerified: true,
      phoneVerified: true,
      completedTrips: 12,
      positiveReviews: 18,
      fiveStarReviews: 10,
      reportsReceived: 0,
      tripNoShows: 0,
      fraudReports: 0,
      accountAgeMonths: 18,
    });

    expect(result.trustScore).toBeGreaterThanOrEqual(0);
    expect(result.trustScore).toBeLessThanOrEqual(100);
    expect(service.getTrustLevel(result.trustScore)).toBe('Elite Traveler');
  });
});

describe('ProviderRankingService', () => {
  it('ranks providers based on weighted score', () => {
    const service = new ProviderRankingService();
    const result = service.calculateProviderRank({
      averageRating: 4.8,
      bookingsCompleted: 220,
      responseTimeMinutes: 12,
      trustScore: 92,
      profileCompleteness: 86,
      recentActivity: 90,
    });

    expect(result.rankingScore).toBeGreaterThanOrEqual(0);
    expect(result.rankingScore).toBeLessThanOrEqual(100);
    expect(result.rankingTier).toBe('Top Rated');
  });
});

describe('SeasonRecommendationService', () => {
  it('produces destination recommendations for the current month', () => {
    const service = new SeasonRecommendationService();
    const result = service.getRecommendations({
      month: 6,
      interests: ['Trekking', 'Nature'],
      budget: 'MID',
      tripType: 'ADVENTURE',
      travelPersonality: 'Explorer',
    });

    expect(result.destinations.length).toBeGreaterThan(0);
    expect(result.destinations[0]).toHaveProperty('destination');
    expect(result.destinations[0].matchScore).toBeGreaterThanOrEqual(0);
  });
});

describe('PersonalityService', () => {
  it('maps questionnaire results to a valid personality', () => {
    const service = new PersonalityService();
    const result = service.calculatePersonality({
      adventure: 90,
      culture: 70,
      luxury: 30,
      food: 85,
      nature: 80,
      social: 50,
      roadTrip: 60,
      digitalNomad: 40,
      budgetDriven: 65,
    });

    expect(['Explorer', 'Adventure Seeker', 'Backpacker', 'Luxury Nomad', 'Digital Nomad', 'Foodie', 'Road Tripper', 'Culture Hunter']).toContain(result.personality);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
