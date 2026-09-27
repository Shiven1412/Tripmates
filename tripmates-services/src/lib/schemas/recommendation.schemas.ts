import { z } from 'zod';

export const budgetEnum = z.enum(['LOW', 'MID', 'HIGH', 'LUXURY']);
export const travelStyleEnum = z.enum(['BACKPACKER', 'BALANCED', 'LUXURY', 'ADVENTURE', 'FAMILY']);
export const personalityEnum = z.enum([
  'Explorer',
  'Adventure Seeker',
  'Backpacker',
  'Luxury Nomad',
  'Digital Nomad',
  'Foodie',
  'Road Tripper',
  'Culture Hunter',
]);
export const tripTypeEnum = z.enum(['TREKKING', 'BEACH', 'CULTURAL', 'ADVENTURE', 'FOOD', 'DIGITAL_NOMAD', 'MIXED']);

export const compatibilityInputSchema = z.object({
  id: z.string(),
  budget: budgetEnum,
  travelStyle: travelStyleEnum,
  drinking: z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH']),
  smoking: z.enum(['NO', 'OCCASIONAL', 'YES']),
  partying: z.enum(['LOW', 'MODERATE', 'HIGH']),
  adventureLevel: z.number().min(0).max(10),
  foodPreferences: z.array(z.string()).default([]),
  socialEnergy: z.number().min(0).max(10),
});

export const providerRankingInputSchema = z.object({
  averageRating: z.number().min(0).max(5),
  bookingsCompleted: z.number().min(0),
  responseTimeMinutes: z.number().min(0),
  trustScore: z.number().min(0).max(100),
  profileCompleteness: z.number().min(0).max(100),
  recentActivity: z.number().min(0).max(100),
});

export const personalityInputSchema = z.object({
  adventure: z.number().min(0).max(100),
  culture: z.number().min(0).max(100),
  luxury: z.number().min(0).max(100),
  food: z.number().min(0).max(100),
  nature: z.number().min(0).max(100),
  social: z.number().min(0).max(100),
  roadTrip: z.number().min(0).max(100),
  digitalNomad: z.number().min(0).max(100),
  budgetDriven: z.number().min(0).max(100),
});

export const seasonalRecommendationInputSchema = z.object({
  month: z.number().min(1).max(12),
  interests: z.array(z.string()).default([]),
  budget: budgetEnum,
  tripType: tripTypeEnum,
  travelPersonality: z.string(),
});

export type CompatibilityInput = z.infer<typeof compatibilityInputSchema>;
export type ProviderRankingInput = z.infer<typeof providerRankingInputSchema>;
export type PersonalityInput = z.infer<typeof personalityInputSchema>;
export type SeasonalRecommendationInput = z.infer<typeof seasonalRecommendationInputSchema>;
