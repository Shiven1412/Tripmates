import { NextResponse } from 'next/server';

const payload = [
  { tripId: 'trip-1', score: 92, reason: 'Adventure and budget fit' },
  { tripId: 'trip-2', score: 89, reason: 'Culture and food affinity' },
  { tripId: 'trip-3', score: 84, reason: 'Group travel compatibility' },
];

export async function GET() {
  return NextResponse.json({ data: payload, count: payload.length });
}
