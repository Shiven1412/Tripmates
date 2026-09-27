import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const tripCreateSchema = z.object({
  title: z.string().min(3).max(80),
  destination: z.string().min(2),
  description: z.string().min(20).max(2000),
  budget: z.coerce.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
  maxMembers: z.coerce.number().int().min(2).max(50),
});

export const sponsorSchema = z.object({
  amount: z.coerce.number().min(1),
  currency: z.string().default('INR'),
});
