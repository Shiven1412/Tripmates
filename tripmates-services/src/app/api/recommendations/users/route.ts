import { NextResponse } from 'next/server';

const payload = [
  { userId: 'user-2', score: 96 },
  { userId: 'user-3', score: 91 },
  { userId: 'user-4', score: 88 },
  { userId: 'user-5', score: 83 },
  { userId: 'user-6', score: 80 },
];

export async function GET() {
  return NextResponse.json({ data: payload, count: payload.length });
}
