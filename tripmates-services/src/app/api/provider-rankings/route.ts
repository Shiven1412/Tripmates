import { NextResponse } from 'next/server';

const payload = [
  { providerId: 'provider-1', rankingScore: 94, rankingTier: 'Top Rated' },
  { providerId: 'provider-2', rankingScore: 88, rankingTier: 'Recommended' },
  { providerId: 'provider-3', rankingScore: 74, rankingTier: 'Good Provider' },
];

export async function GET() {
  return NextResponse.json({ data: payload, count: payload.length });
}
