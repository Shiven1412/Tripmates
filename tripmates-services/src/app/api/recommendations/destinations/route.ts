import { NextResponse } from 'next/server';

import { SeasonRecommendationService } from '@/lib/services/season-recommendation.service';

export async function GET() {
  const service = new SeasonRecommendationService();
  return NextResponse.json(service.getRecommendations({
    month: 6,
    interests: ['Trekking', 'Nature'],
    budget: 'MID',
    tripType: 'ADVENTURE',
    travelPersonality: 'Explorer',
  }));
}
