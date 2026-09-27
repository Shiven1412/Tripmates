import { seasonalRecommendationInputSchema, type SeasonalRecommendationInput } from '../schemas/recommendation.schemas';

export type SeasonalDestinationResult = {
  destination: string;
  matchScore: number;
  reasons: string[];
};

export type SeasonalRecommendationResult = {
  destinations: SeasonalDestinationResult[];
};

const destinationCatalog = [
  { name: 'Ladakh', bestMonth: 6, budget: 'MID', activities: ['Trekking', 'Nature'], personality: ['Explorer', 'Adventure Seeker'], popularity: 92 },
  { name: 'Spiti', bestMonth: 6, budget: 'MID', activities: ['Trekking', 'Nature'], personality: ['Backpacker', 'Explorer'], popularity: 88 },
  { name: 'Kashmir', bestMonth: 6, budget: 'MID', activities: ['Nature', 'Culture'], personality: ['Culture Hunter', 'Explorer'], popularity: 90 },
  { name: 'Meghalaya', bestMonth: 6, budget: 'LOW', activities: ['Nature', 'Food'], personality: ['Explorer', 'Foodie'], popularity: 84 },
  { name: 'Manali', bestMonth: 12, budget: 'MID', activities: ['Adventure', 'Nature'], personality: ['Adventure Seeker', 'Explorer'], popularity: 91 },
  { name: 'Auli', bestMonth: 12, budget: 'MID', activities: ['Adventure', 'Nature'], personality: ['Adventure Seeker', 'Road Tripper'], popularity: 82 },
  { name: 'Goa', bestMonth: 12, budget: 'MID', activities: ['Food', 'Beach'], personality: ['Foodie', 'Luxury Nomad'], popularity: 87 },
  { name: 'Udaipur', bestMonth: 11, budget: 'MID', activities: ['Culture', 'Food'], personality: ['Culture Hunter', 'Luxury Nomad'], popularity: 80 },
];

export class SeasonRecommendationService {
  getRecommendations(input: SeasonalRecommendationInput): SeasonalRecommendationResult {
    const data = seasonalRecommendationInputSchema.parse(input);
    const now = new Date();
    const currentMonth = data.month || now.getMonth() + 1;

    const scored = destinationCatalog
      .filter((destination) => {
        const monthMatch = destination.bestMonth === currentMonth || Math.abs(destination.bestMonth - currentMonth) <= 2;
        const budgetMatch = destination.budget === data.budget || data.budget === 'MID';
        const interestMatch = destination.activities.some((activity) => data.interests.includes(activity));
        return monthMatch && (budgetMatch || interestMatch);
      })
      .map((destination) => {
        let score = destination.popularity;
        if (destination.bestMonth === currentMonth) score += 15;
        if (data.travelPersonality && destination.personality.includes(data.travelPersonality)) score += 18;
        if (destination.activities.some((activity) => data.interests.includes(activity))) score += 12;
        if (destination.budget === data.budget) score += 10;

        const reasons = [
          `Season match for ${destination.bestMonth}`,
          data.travelPersonality ? `Aligned with ${data.travelPersonality}` : 'Broad trip fit',
          `Budget ${destination.budget} matches your profile`,
        ];

        return {
          destination: destination.name,
          matchScore: Math.min(100, Math.round(score)),
          reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return { destinations: scored.slice(0, 10) };
  }

  getPopularDestinations(month: number): string[] {
    const matches = destinationCatalog.filter((item) => item.bestMonth === month || Math.abs(item.bestMonth - month) <= 2);
    return matches
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10)
      .map((destination) => destination.name);
  }
}
