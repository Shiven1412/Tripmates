import { NextResponse } from 'next/server';

import { TrustScoreService } from '@/lib/services/trust-score.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const service = new TrustScoreService();

  const payload = service.calculateTrustScore({
    userId,
    aadhaarVerified: true,
    faceVerified: true,
    phoneVerified: true,
    completedTrips: 10,
    positiveReviews: 18,
    fiveStarReviews: 9,
    reportsReceived: 0,
    tripNoShows: 0,
    fraudReports: 0,
    accountAgeMonths: 20,
  });

  return NextResponse.json({ userId, ...payload });
}
