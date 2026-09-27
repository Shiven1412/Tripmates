import { z } from 'zod';
import { personalityInputSchema, type PersonalityInput } from '../schemas/recommendation.schemas';

export type PersonalityResult = {
  personality: string;
  score: number;
};

export class PersonalityService {
  calculatePersonality(input: PersonalityInput): PersonalityResult {
    const data = personalityInputSchema.parse(input);
    const mapped = {
      Explorer: data.nature * 0.3 + data.adventure * 0.3 + data.social * 0.2 + data.culture * 0.2,
      'Adventure Seeker': data.adventure * 0.5 + data.nature * 0.25 + data.roadTrip * 0.25,
      Backpacker: data.budgetDriven * 0.4 + data.nature * 0.3 + data.roadTrip * 0.2 + data.social * 0.1,
      'Luxury Nomad': data.luxury * 0.6 + data.food * 0.2 + data.social * 0.2,
      'Digital Nomad': data.digitalNomad * 0.6 + data.luxury * 0.15 + data.social * 0.15 + data.nature * 0.1,
      Foodie: data.food * 0.5 + data.culture * 0.25 + data.social * 0.15 + data.luxury * 0.1,
      'Road Tripper': data.roadTrip * 0.55 + data.nature * 0.2 + data.adventure * 0.15 + data.budgetDriven * 0.1,
      'Culture Hunter': data.culture * 0.5 + data.food * 0.2 + data.nature * 0.15 + data.social * 0.15,
    };

    const winner = Object.entries(mapped).sort(([, a], [, b]) => b - a)[0];
    const score = Math.round(Math.min(100, winner[1]));

    return {
      personality: winner[0],
      score,
    };
  }
}
