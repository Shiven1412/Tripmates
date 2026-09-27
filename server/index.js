import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();
const PORT = Number(process.env.PORT || 4000);
const prisma = new PrismaClient({
  log: ['error'],
});

const dbConfigured = Boolean(process.env.DATABASE_URL);
const aiRequestsByClient = new Map();
const uploadDirectory = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
    cb(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image uploads are allowed.'));
  },
});

const inMemoryTrips = [
  {
    id: 'trip-1',
    title: 'Spiti Valley Circuit',
    shortDescription: 'A thoughtful high-altitude loop blending quiet monasteries, campsites, and unforgettable mountain views.',
    description: 'A thoughtful high-altitude loop blending quiet monasteries, campsites, and unforgettable mountain views.',
    destination: 'Kaza, Himachal Pradesh',
    country: 'India',
    state: 'Himachal Pradesh',
    city: 'Kaza',
    meetingPoint: 'Shimla Bus Stand',
    tripType: 'Backpacking',
    visibility: 'Invite Only',
    coverImage: 'https://images.unsplash.com/photo-1566323124620-d22adb71d2a2?w=1200&h=900&fit=crop',
    startDate: '2026-11-15',
    endDate: '2026-11-22',
    totalBudget: 18000,
    budgetType: 'Moderate',
    accommodationType: 'Hotel',
    transportType: 'Cab',
    activities: ['Trekking', 'Photography', 'Cafe Hopping'],
    maxMembers: 8,
    rules: 'No smoking indoors. Respect local customs. Be punctual for departures.',
    verificationRequired: true,
    consentRequired: true,
    emergencyContact: true,
    insuranceRecommended: true,
    aadhaarRequired: true,
    faceVerification: true,
    createdBy: 'demo-user',
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const tripSchema = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(20).max(180).optional().default(''),
  description: z.string().trim().min(20).max(3000).optional().default(''),
  destination: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).optional().default('India'),
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
  accommodationType: z.string().trim().min(2).default('Hotel'),
  transportType: z.string().trim().min(2).default('Cab'),
  maxMembers: z.number().int().min(2).max(50),
  activities: z.array(z.string().trim()).default([]),
  rules: z.string().trim().min(10).default(''),
  verificationRequired: z.boolean().default(true),
  consentRequired: z.boolean().default(true),
  emergencyContact: z.boolean().default(true),
  insuranceRecommended: z.boolean().default(true),
  aadhaarRequired: z.boolean().default(true),
  faceVerification: z.boolean().default(true),
  createdBy: z.string().trim().min(1).default('demo-user'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

const prepareTripPayload = (body) => {
  const normalized = {
    ...body,
    title: String(body.title || '').trim(),
    destination: String(body.destination || '').trim(),
    description: String(body.description || body.shortDescription || '').trim(),
    shortDescription: String(body.shortDescription || body.description || '').trim(),
    country: String(body.country || 'India').trim(),
    state: String(body.state || '').trim(),
    city: String(body.city || '').trim(),
    meetingPoint: String(body.meetingPoint || '').trim(),
    tripType: String(body.tripType || 'Backpacking').trim(),
    visibility: body.visibility || 'Invite Only',
    coverImage: String(body.coverImage || '').trim(),
    startDate: body.startDate || new Date().toISOString().slice(0, 10),
    endDate: body.endDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    totalBudget: Number(body.totalBudget || 0),
    budgetType: body.budgetType || 'Moderate',
    maxMembers: Number(body.maxMembers || 2),
    activities: Array.isArray(body.activities) ? body.activities : [],
    rules: String(body.rules || '').trim(),
    verificationRequired: body.verificationRequired !== false,
    consentRequired: body.consentRequired !== false,
    emergencyContact: body.emergencyContact !== false,
    insuranceRecommended: body.insuranceRecommended !== false,
    aadhaarRequired: body.aadhaarRequired !== false,
    faceVerification: body.faceVerification !== false,
    createdBy: String(body.createdBy || 'demo-user').trim(),
    status: body.status || 'DRAFT',
  };

  return tripSchema.parse(normalized);
};

const serializeTrip = (trip) => ({
  ...trip,
  createdAt: trip.createdAt || new Date().toISOString(),
  updatedAt: trip.updatedAt || trip.createdAt || new Date().toISOString(),
});

const getTripMatches = (trip) => {
  const sample = [
    { name: 'Priya Mehta', trustScore: 98, travelPersonality: 'Explorer', compatibility: 94, completedTrips: 12 },
    { name: 'Rahul Sharma', trustScore: 96, travelPersonality: 'Road Tripper', compatibility: 91, completedTrips: 9 },
    { name: 'Neha Kapoor', trustScore: 99, travelPersonality: 'Backpacker', compatibility: 89, completedTrips: 15 },
  ];

  return sample.map((match) => ({
    ...match,
    tripId: trip.id,
    matchQuality: Math.min(98, Math.round((match.compatibility + (trip.maxMembers || 6)) / 2)),
  }));
};

const getWeatherSnapshot = (city) => ({
  city: city || 'Destination',
  temperature: 18,
  condition: 'Clear skies',
  humidity: 62,
  bestSeason: 'Autumn',
  crowdLevel: 'Moderate',
  festivalCalendar: ['Diwali', 'Losar Festival'],
});

const getItineraryPlan = (trip) => ({
  tripTitle: trip.title,
  dayWiseItinerary: [
    { day: 1, title: 'Arrival and meet-up', summary: 'Check-in, welcome dinner and group intro.' },
    { day: 2, title: 'Local exploration', summary: 'Walk trail, coffee break, and photo loop.' },
    { day: 3, title: 'Adventure block', summary: 'Adventure activity and group challenge.' },
  ],
  costBreakdown: {
    accommodation: Math.round((trip.totalBudget || 15000) * 0.35),
    transport: Math.round((trip.totalBudget || 15000) * 0.25),
    food: Math.round((trip.totalBudget || 15000) * 0.2),
    activities: Math.round((trip.totalBudget || 15000) * 0.15),
    misc: Math.round((trip.totalBudget || 15000) * 0.05),
  },
  packingChecklist: ['Warm layers', 'Power bank', 'Waterproof shell', 'Camera', 'Headlamp'],
  foodRecommendations: ['Local thali', 'Street breakfast', 'Tea house tasting'],
  nearbyAttractions: ['Sunrise lookout', 'Heritage trail', 'Local market lane'],
});

const loadTrips = async () => {
  if (!dbConfigured) return [...inMemoryTrips];

  try {
    const prismaTrips = await prisma.trip.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return prismaTrips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      shortDescription: trip.description,
      description: trip.description,
      destination: trip.destination,
      country: 'India',
      state: '',
      city: trip.destination,
      meetingPoint: '',
      tripType: trip.tripType || 'MIXED',
      visibility: 'Invite Only',
      coverImage: trip.imageUrl || '',
      startDate: trip.startDate.toISOString().slice(0, 10),
      endDate: trip.endDate.toISOString().slice(0, 10),
      totalBudget: Number(trip.budget || 0),
      budgetType: 'Moderate',
      accommodationType: 'Hotel',
      transportType: 'Cab',
      activities: [],
      maxMembers: trip.maxMembers,
      rules: 'Community standards apply.',
      verificationRequired: true,
      consentRequired: true,
      emergencyContact: true,
      insuranceRecommended: true,
      aadhaarRequired: true,
      faceVerification: true,
      createdBy: trip.ownerId,
      status: trip.status,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.warn('Database unavailable; using in-memory fallback.', error.message);
    return [...inMemoryTrips];
  }
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    service: 'tripmates-api',
    environment: process.env.NODE_ENV || 'development',
    database: dbConfigured ? 'configured' : 'mock-fallback',
    ai: process.env.GEMINI_API_KEY ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/trips', async (_req, res) => {
  const trips = await loadTrips();
  res.json({ trips: trips.map(serializeTrip), count: trips.length });
});

app.post('/api/trips', async (req, res) => {
  try {
    const payload = prepareTripPayload(req.body || {});

    const trip = {
      id: randomUUID(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryTrips.unshift(trip);

    if (dbConfigured) {
      try {
        const owner = await prisma.user.findFirst();
        if (owner) {
          await prisma.trip.create({
            data: {
              ownerId: owner.id,
              title: trip.title,
              description: trip.description || trip.shortDescription,
              destination: trip.destination,
              imageUrl: trip.coverImage || null,
              startDate: new Date(trip.startDate),
              endDate: new Date(trip.endDate),
              budget: trip.totalBudget,
              tripType: 'MIXED',
              maxMembers: trip.maxMembers,
              status: trip.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
            },
          });
        }
      } catch (error) {
        console.warn('Prisma trip write skipped.', error.message);
      }
    }

    return res.status(201).json({ message: 'Trip created successfully.', trip: serializeTrip(trip) });
  } catch (error) {
    const issues = error.issues || [{ message: 'Invalid trip payload.' }];
    return res.status(400).json({
      message: 'Trip validation failed.',
      errors: issues.map((entry) => ({ field: entry.path?.join('.') || 'unknown', message: entry.message })),
    });
  }
});

app.get('/api/trips/:id', async (req, res) => {
  const trips = await loadTrips();
  const trip = trips.find((item) => item.id === req.params.id);

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found.' });
  }

  return res.json({ trip: serializeTrip(trip) });
});

app.post('/api/trips/:id/publish', async (req, res) => {
  const trips = await loadTrips();
  const trip = trips.find((item) => item.id === req.params.id);

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found.' });
  }

  trip.status = 'PUBLISHED';
  trip.updatedAt = new Date().toISOString();

  return res.json({ message: 'Trip published successfully.', trip: serializeTrip(trip) });
});

app.post('/api/trips/:id/draft', async (req, res) => {
  const trips = await loadTrips();
  const trip = trips.find((item) => item.id === req.params.id);

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found.' });
  }

  trip.status = 'DRAFT';
  trip.updatedAt = new Date().toISOString();

  return res.json({ message: 'Trip moved to draft.', trip: serializeTrip(trip) });
});

app.get('/api/destinations', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();

  const suggestions = [
    { city: 'Gulmarg', country: 'India', state: 'Jammu & Kashmir' },
    { city: 'Kaza', country: 'India', state: 'Himachal Pradesh' },
    { city: 'Ubud', country: 'Indonesia', state: 'Bali' },
    { city: 'Goa', country: 'India', state: 'Goa' },
    { city: 'Kyoto', country: 'Japan', state: 'Kyoto Prefecture' },
  ].filter((item) => !query || `${item.city} ${item.state} ${item.country}`.toLowerCase().includes(query));

  return res.json({ suggestions: suggestions.slice(0, 6) });
});

app.get('/api/weather', (req, res) => {
  const city = String(req.query.city || 'Gulmarg');
  return res.json({ weather: getWeatherSnapshot(city) });
});

app.get('/api/trips/:id/recommendations', async (req, res) => {
  const trips = await loadTrips();
  const trip = trips.find((item) => item.id === req.params.id);

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found.' });
  }

  return res.json({
    tripId: trip.id,
    averageChemistry: 91,
    matches: getTripMatches(trip),
    filters: ['Budget Match', 'Travel Style Match', 'Adventure Match', 'Lifestyle Match'],
  });
});

app.post('/api/trips/:id/ai-plan', async (req, res) => {
  const trips = await loadTrips();
  const trip = trips.find((item) => item.id === req.params.id);

  if (!trip) {
    return res.status(404).json({ message: 'Trip not found.' });
  }

  return res.json({ plan: getItineraryPlan(trip) });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file supplied.' });
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(201).json({
    message: 'Image uploaded successfully.',
    file: {
      name: req.file.originalname,
      url,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

app.post('/api/ai/generate', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 5000) {
    return res.status(400).json({ message: 'Prompt must contain between 1 and 5000 characters.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ message: 'AI service is not configured on the server.' });
  }

  const client = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recentRequests = (aiRequestsByClient.get(client) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recentRequests.length >= 20) {
    return res.status(429).json({ message: 'AI request limit reached. Please try again shortly.' });
  }
  recentRequests.push(now);
  aiRequestsByClient.set(client, recentRequests);

  const temperature = Number(req.body?.temperature);
  const maxOutputTokens = Number(req.body?.maxOutputTokens);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: Number.isFinite(temperature) ? Math.max(0, Math.min(1, temperature)) : 0.5,
          maxOutputTokens: Number.isFinite(maxOutputTokens) ? Math.max(32, Math.min(1200, maxOutputTokens)) : 800,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      const contentType = response.headers.get('content-type') || 'unknown content type';
      const safeExcerpt = responseBody.replaceAll(process.env.GEMINI_API_KEY, '[redacted]')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
      console.warn(`Gemini returned non-JSON content (HTTP ${response.status}, ${contentType}): ${safeExcerpt}`);
      const isNetworkBlockPage = /zscaler|web filter|access denied|blocked by/i.test(safeExcerpt);
      const message = isNetworkBlockPage
        ? 'Your network security gateway is blocking Google Gemini. Ask IT to allow generativelanguage.googleapis.com or provide an approved Gemini proxy. Do not disable TLS certificate checks.'
        : `Gemini returned an unreadable response (HTTP ${response.status}, ${contentType}). ${safeExcerpt}`;
      return res.status(502).json({ message });
    }
    if (!response.ok) {
      const providerMessage = String(data?.error?.message || 'No provider detail supplied.')
        .replaceAll(process.env.GEMINI_API_KEY, '[redacted]')
        .slice(0, 240);
      console.warn(`Gemini service returned status ${response.status}: ${providerMessage}`);
      const message = response.status === 401 || response.status === 403
        ? 'Gemini rejected the server API key or its permissions.'
        : response.status === 404
          ? 'The configured Gemini model was not found. Check GEMINI_MODEL.'
          : response.status === 429
            ? 'Gemini rate limit reached. Please retry shortly.'
            : `Gemini service error (${response.status}): ${providerMessage}`;
      return res.status(response.status === 429 ? 429 : 502).json({ message });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) return res.status(502).json({ message: 'AI returned an empty response.' });
    return res.json({ text });
  } catch (error) {
    const networkCode = error?.cause?.code;
    console.warn('Gemini request failed:', networkCode || error?.name || 'UnknownError');
    const message = error?.name === 'TimeoutError'
      ? 'AI request timed out. Please retry shortly.'
      : networkCode === 'SELF_SIGNED_CERT_IN_CHAIN' || networkCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
        ? 'The server does not trust the Gemini TLS certificate. Configure NODE_USE_SYSTEM_CA or NODE_EXTRA_CA_CERTS; do not disable certificate verification.'
        : networkCode === 'ENOTFOUND' || networkCode === 'ECONNRESET' || networkCode === 'ETIMEDOUT'
          ? 'The server could not reach Gemini. Check network and DNS access.'
          : 'AI generation is temporarily unavailable.';
    return res.status(502).json({ message });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }

  if (error) {
    const status = error.message === 'Only image uploads are allowed.' ? 415 : 500;
    return res.status(status).json({ message: status === 415 ? error.message : 'Unexpected server error.' });
  }

  return res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`TripMates API running on http://localhost:${PORT}`);
});
