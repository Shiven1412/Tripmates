import { z } from 'zod';

export const createTripInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(20).max(180),
  description: z.string().trim().min(20).max(3000),
  destination: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).default('India'),
  state: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  meetingPoint: z.string().trim().optional().default(''),
  tripType: z.string().trim().min(2),
  visibility: z.enum(['Public', 'Private', 'Invite Only']),
  coverImage: z.string().url().or(z.literal('')).optional().default(''),
  startDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid start date'),
  endDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid end date'),
  totalBudget: z.number().positive(),
  budgetType: z.enum(['Budget', 'Moderate', 'Luxury']),
  accommodationType: z.string().trim().min(2),
  transportType: z.string().trim().min(2),
  maxMembers: z.number().int().min(2).max(50),
  activities: z.array(z.string().trim()).default([]),
  rules: z.string().trim().min(10),
  verificationRequired: z.boolean().default(true),
  consentRequired: z.boolean().default(true),
  emergencyContact: z.boolean().default(true),
  insuranceRecommended: z.boolean().default(true),
  aadhaarRequired: z.boolean().default(true),
  faceVerification: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export const tripQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});

export const weatherSchema = z.object({
  city: z.string().trim().min(2),
});

export function buildTripSummary(trip) {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dateRange: `${trip.startDate} → ${trip.endDate}`,
    budget: trip.totalBudget,
    tripType: trip.tripType,
    members: trip.maxMembers,
    visibility: trip.visibility,
    status: trip.status,
  };
}
