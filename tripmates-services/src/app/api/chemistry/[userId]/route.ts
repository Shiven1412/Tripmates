import { NextResponse } from 'next/server';

import { TripChemistryService } from '@/lib/services/trip-chemistry.service';
import { compatibilityInputSchema } from '@/lib/schemas/recommendation.schemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  return NextResponse.json(
    { error: 'Chemistry requires two real profile inputs. Submit them with POST.', userId },
    { status: 405 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  try {
    const body = await request.json();
    const userA = compatibilityInputSchema.parse(body.userA);
    const userB = compatibilityInputSchema.parse(body.userB);
    if (userA.id !== userId) {
      return NextResponse.json({ error: 'The first profile must match the route userId.' }, { status: 400 });
    }

    const result = new TripChemistryService().calculateCompatibility(userA, userB);
    return NextResponse.json({ userId, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid chemistry profile input.' },
      { status: 400 },
    );
  }
}
