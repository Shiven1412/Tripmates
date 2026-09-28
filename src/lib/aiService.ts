type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const rateLimitMap = new Map<string, number>();

const safeJsonParse = <T>(value: string | null, fallback: T | null): T | null => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getApiCandidates = () => {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const candidates = new Set<string>();
  if (import.meta.env.DEV) candidates.add('');
  if (configured) candidates.add(configured);
  if (origin) candidates.add(origin);

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  if (!localHosts.has(hostname)) {
    candidates.add(`http://${hostname}:4000`);
    candidates.add(`http://${hostname}`);
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    candidates.add('http://127.0.0.1:4000');
    candidates.add('http://localhost:4000');
  }

  if (origin && !/:(?:5173|4173|3000|8080)$/.test(origin)) {
    candidates.add(`${origin}:4000`);
  }

  return [...candidates].filter(Boolean);
};

async function requestGemini(prompt: string, options: { temperature?: number; maxOutputTokens?: number } = {}): Promise<string> {
  const candidates = getApiCandidates();
  let lastError: Error | null = null;

  for (const apiBase of candidates) {
    try {
      const response = await fetch(`${apiBase ? `${apiBase}/api/ai/generate` : '/api/ai/generate'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...options }),
      });
      const result = await response.json().catch(() => ({})) as { text?: string; message?: string };
      if (response.ok && result.text) return result.text;

      const message = result.message || `AI request failed with status ${response.status}.`;
      lastError = new Error(message);
      if (response.status >= 500 && apiBase !== candidates.at(-1)) continue;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('AI generation failed.');
}

const normalizeLocation = (location: string) => location.trim() || 'Goa';

const readCache = <T>(key: string, ttlMs: number): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
};

const writeCache = <T>(key: string, value: T, ttlMs: number) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const withinRateLimit = (key: string) => {
  const now = Date.now();
  const last = rateLimitMap.get(key) ?? 0;
  if (now - last < 2500) return false;
  rateLimitMap.set(key, now);
  return true;
};

const fallbackWeather = (location: string) => {
  const city = normalizeLocation(location);
  const seasonMap: Record<string, { bestSeason: string; summary: string; nextThreeMonths: string[]; tips: string[]; activities: string[] }> = {
    goa: {
      bestSeason: 'November to February',
      summary: 'Pleasant tropical weather with moderate humidity, warm beaches, and calmer evenings.',
      nextThreeMonths: [
        'October: warm and humid, peak monsoon retreat with occasional rain.',
        'November: ideal beach weather with dry, sunny afternoons.',
        'December: cool nights, bright days, and festive travel buzz.',
      ],
      tips: ['Carry light cotton layers and sunscreen.', 'Book accommodation early for weekends.', 'Keep cash for beach shacks and small local stops.'],
      activities: ['Beach hopping', 'Water sports', 'Sunset cafes', 'Old Goa heritage walks'],
    },
    ladakh: {
      bestSeason: 'June to September',
      summary: 'Cool mountain air, crisp skies, and dry conditions suited for high-altitude travel.',
      nextThreeMonths: [
        'June: clear roads and snowline views with cool evenings.',
        'July: monsoon patches, dramatic landscapes, and fewer crowds.',
        'August: comfortable daytime trekking conditions with occasional rain.',
      ],
      tips: ['Pack warm layers even in summer.', 'Acclimatize before intense trekking.', 'Check road openings and fuel availability.'],
      activities: ['High altitude treks', 'Monastery visits', 'Stargazing', 'Road trip scenic stops'],
    },
    manali: {
      bestSeason: 'March to June',
      summary: 'Fresh alpine air with mild daytime temperatures and comfortable hiking conditions.',
      nextThreeMonths: [
        'April: spring blossoms and cool evenings.',
        'May: clear skies and strong mountain views.',
        'June: warm days with moderate outdoor comfort.',
      ],
      tips: ['Carry a light waterproof layer for mountain weather.', 'Book early if planning a weekend getaway.', 'Consider acclimatization before difficult hikes.'],
      activities: ['Trekking', 'River walks', 'Cafe hopping', 'Nature drives'],
    },
  };

  const resolved = seasonMap[city.toLowerCase()] ?? {
    bestSeason: 'October to March',
    summary: 'Comfortable travel weather with a balanced mix of daylight, breezes, and mild crowd levels.',
    nextThreeMonths: [
      'This month: pleasant conditions with moderate travel comfort.',
      'Next month: weather remains stable with good outdoor potential.',
      'Following month: temperatures trend mild and travel-friendly.',
    ],
    tips: ['Pack a light layer for evenings.', 'Check local forecasts before booking a day trip.', 'Keep a flexible plan for outdoor activities.'],
    activities: ['Local sightseeing', 'Food walks', 'Nature trails', 'Sunset viewpoints'],
  };

  return resolved;
};

const buildPrompt = (location: string, context: Record<string, unknown> = {}) => `
You are TripMates AI. Return valid JSON only with keys: bestSeason, weatherSummary, nextThreeMonthsForecast, travelTips, bestActivities.
Location: ${normalizeLocation(location)}
Context: ${JSON.stringify(context)}
Requirements:
- bestSeason should be a readable range like "November to February".
- weatherSummary should be 1-2 sentences.
- nextThreeMonthsForecast should be an array of 3 object entries with month and summary strings.
- travelTips should be an array of 3-5 short bullet strings.
- bestActivities should be an array of 3-6 short activity strings.
- Keep suggestions relevant to travel planning.
`.trim();

type WeatherInsightShape = {
  bestSeason: string;
  weatherSummary: string;
  nextThreeMonthsForecast: Array<{ month: string; summary: string }>;
  travelTips: string[];
  bestActivities: string[];
};

export async function getTripWeatherInsight(location: string, context: Record<string, unknown> = {}): Promise<WeatherInsightShape> {
  const cacheKey = `weather:${normalizeLocation(location).toLowerCase()}:${JSON.stringify(context)}`;
  const cached = readCache<WeatherInsightShape>(cacheKey, 1000 * 60 * 60 * 6);
  if (cached) return cached as never;

  if (!withinRateLimit(`weather:${location}`)) {
    const fallback = fallbackWeather(location);
    writeCache(cacheKey, fallback, 1000 * 60 * 60 * 6);
    return {
      bestSeason: fallback.bestSeason,
      weatherSummary: fallback.summary,
      nextThreeMonthsForecast: fallback.nextThreeMonths.map((entry, index) => ({ month: ['This month', 'Next month', 'Month after'][index] ?? `Month ${index + 1}`, summary: entry })),
      travelTips: fallback.tips,
      bestActivities: fallback.activities,
    };
  }

  try {
    const content = await requestGemini(buildPrompt(location, context), { temperature: 0.5, maxOutputTokens: 800 });
    const parsed = safeJsonParse<{ bestSeason?: string; weatherSummary?: string; nextThreeMonthsForecast?: Array<{ month?: string; summary?: string }>; travelTips?: string[]; bestActivities?: string[] }>(content.match(/\{[\s\S]*\}/)?.[0] ?? null, null as unknown as { bestSeason?: string; weatherSummary?: string; nextThreeMonthsForecast?: Array<{ month?: string; summary?: string }>; travelTips?: string[]; bestActivities?: string[] } | null);

    if (parsed && parsed.bestSeason && parsed.weatherSummary) {
      const normalized = {
        bestSeason: parsed.bestSeason,
        weatherSummary: parsed.weatherSummary,
        nextThreeMonthsForecast: Array.isArray(parsed.nextThreeMonthsForecast) && parsed.nextThreeMonthsForecast.length ? parsed.nextThreeMonthsForecast.map((item) => ({ month: item.month || 'Next month', summary: item.summary || 'Travel-friendly weather forecast.' })) : [{ month: 'Next month', summary: 'Weather remains favorable for planning.' }],
        travelTips: Array.isArray(parsed.travelTips) && parsed.travelTips.length ? parsed.travelTips : ['Check daily conditions before departure.', 'Carry suitable light layers.', 'Keep plans flexible around local conditions.'],
        bestActivities: Array.isArray(parsed.bestActivities) && parsed.bestActivities.length ? parsed.bestActivities : ['Sightseeing', 'Local food trails', 'Nature walks'],
      };
      writeCache(cacheKey, normalized, 1000 * 60 * 60 * 6);
      return normalized;
    }
  } catch (error) {
    console.warn('Gemini weather generation failed, using local fallback.', error);
  }

  const fallback = fallbackWeather(location);
  writeCache(cacheKey, fallback, 1000 * 60 * 60 * 6);
  return {
    bestSeason: fallback.bestSeason,
    weatherSummary: fallback.summary,
    nextThreeMonthsForecast: fallback.nextThreeMonths.map((entry, index) => ({ month: ['This month', 'Next month', 'Month after'][index] ?? `Month ${index + 1}`, summary: entry })),
    travelTips: fallback.tips,
    bestActivities: fallback.activities,
  };
}

export type LiveWeatherInsight = {
  location: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  condition: string;
  forecast: Array<{ date: string; minC: number; maxC: number; precipitationMm: number }>;
  seasonal: Awaited<ReturnType<typeof getTripWeatherInsight>>;
};

const weatherCodeLabel = (code: number) => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
};

export async function getLiveWeatherInsight(location: string): Promise<LiveWeatherInsight> {
  const query = normalizeLocation(location);
  const cacheKey = `live-weather:${query.toLowerCase()}`;
  const cached = readCache<LiveWeatherInsight>(cacheKey, 1000 * 60 * 30);
  if (cached) return cached;

  const geocodeResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  if (!geocodeResponse.ok) throw new Error('Could not find weather coordinates for this destination.');
  const geocode = await geocodeResponse.json() as { results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }> };
  const place = geocode.results?.[0];
  if (!place) throw new Error('No weather location found. Try entering a city name.');

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    forecast_days: '3',
    timezone: 'auto',
  });
  const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!forecastResponse.ok) throw new Error('Live weather is temporarily unavailable.');
  const weather = await forecastResponse.json() as {
    current?: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number };
    daily?: { time: string[]; temperature_2m_min: number[]; temperature_2m_max: number[]; precipitation_sum: number[] };
  };
  if (!weather.current || !weather.daily) throw new Error('The forecast response was incomplete.');

  const seasonal = await getTripWeatherInsight(query, {
    currentConditions: `${weather.current.temperature_2m}°C, ${weatherCodeLabel(weather.current.weather_code)}`,
    forecast: weather.daily.time.map((date, index) => ({ date, minC: weather.daily?.temperature_2m_min[index], maxC: weather.daily?.temperature_2m_max[index] })),
  });
  const result: LiveWeatherInsight = {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    temperatureC: weather.current.temperature_2m,
    apparentTemperatureC: weather.current.apparent_temperature,
    humidityPercent: weather.current.relative_humidity_2m,
    condition: weatherCodeLabel(weather.current.weather_code),
    forecast: weather.daily.time.map((date, index) => ({
      date,
      minC: weather.daily!.temperature_2m_min[index],
      maxC: weather.daily!.temperature_2m_max[index],
      precipitationMm: weather.daily!.precipitation_sum[index],
    })),
    seasonal,
  };
  writeCache(cacheKey, result, 1000 * 60 * 30);
  return result;
}

export async function getTravelSuggestion(input: { destination?: string; interests?: string[]; budget?: string; city?: string; travelStyle?: string; season?: string; pastTrips?: string[] }): Promise<{ destination: string; reason: string; bestMonth: string; weather: string; budget: string; duration: string; activities: string[] }> {
  const key = `suggestion:${JSON.stringify(input)}`;
  const cached = readCache(key, 1000 * 60 * 60 * 12);
  if (cached) return cached as never;

  const destination = input.destination || input.city || 'Goa';
  const reason = `This destination matches your profile with ${input.interests?.join(', ') || 'adventure-led'} preferences and a ${input.budget || 'moderate'} travel budget.`;
  const fallback = {
    destination: destination,
    reason,
    bestMonth: 'October',
    weather: 'Pleasant conditions with mild rainfall and comfortable daytime temperatures.',
    budget: '₹8,000 - ₹12,000',
    duration: '4-5 days',
    activities: ['Nature walks', 'Local cuisine', 'Sunrise viewpoints', 'Relaxed sightseeing'],
  };

  if (!withinRateLimit(`suggestion:${destination}`)) {
    writeCache(key, fallback, 1000 * 60 * 60 * 12);
    return fallback;
  }

  try {
    const content = await requestGemini(`Return valid JSON only with keys: destination, reason, bestMonth, weather, budget, duration, activities. User profile: ${JSON.stringify(input)}`);
    const parsed = safeJsonParse<{ destination?: string; reason?: string; bestMonth?: string; weather?: string; budget?: string; duration?: string; activities?: string[] }>(content.match(/\{[\s\S]*\}/)?.[0] ?? '', null as unknown as { destination?: string; reason?: string; bestMonth?: string; weather?: string; budget?: string; duration?: string; activities?: string[] } | null);
    if (parsed && parsed.destination && parsed.reason) {
      const recommendation = {
        destination: parsed.destination,
        reason: parsed.reason,
        bestMonth: parsed.bestMonth || 'October',
        weather: parsed.weather || 'Pleasant conditions.',
        budget: parsed.budget || '₹8,000 - ₹12,000',
        duration: parsed.duration || '4-5 days',
        activities: Array.isArray(parsed.activities) && parsed.activities.length ? parsed.activities : fallback.activities,
      };
      writeCache(key, recommendation, 1000 * 60 * 60 * 12);
      return recommendation;
    }
  } catch (error) {
    console.warn('Gemini suggestion generation failed.', error);
  }

  writeCache(key, fallback, 1000 * 60 * 60 * 12);
  return fallback;
}

export async function generateTripDescription(input: { destination: string; budget: string; duration: string; activities: string[] }): Promise<{ title: string; summary: string; highlights: string[]; expectations: string[]; packing: string[] }> {
  const key = `tripDescription:${JSON.stringify(input)}`;
  const cached = readCache(key, 1000 * 60 * 60 * 24);
  if (cached) return cached as never;

  const fallback = {
    title: `${input.destination} Weekend Escape`,
    summary: `A thoughtfully planned ${input.duration} trip to ${input.destination} designed for a relaxed, immersive getaway with the right mix of exploration and downtime.`,
    highlights: ['Curated local experiences', 'Comfortable pacing', 'Flexible group planning'],
    expectations: ['Easygoing group energy', 'Balanced sightseeing and downtime', 'Budget-conscious choices'],
    packing: ['Light layers', 'Comfortable shoes', 'Power bank', 'Travel adapter'],
  };

  if (!withinRateLimit(`description:${input.destination}`)) {
    writeCache(key, fallback, 1000 * 60 * 60 * 24);
    return fallback;
  }

  try {
    const content = await requestGemini(`Return valid JSON only with keys title, summary, highlights, expectations, packing. Destination: ${input.destination}; Budget: ${input.budget}; Duration: ${input.duration}; Activities: ${input.activities.join(', ')}`);
    const parsed = safeJsonParse<{ title?: string; summary?: string; highlights?: string[]; expectations?: string[]; packing?: string[] }>(content.match(/\{[\s\S]*\}/)?.[0] ?? '', null as unknown as { title?: string; summary?: string; highlights?: string[]; expectations?: string[]; packing?: string[] } | null);
    if (parsed && parsed.title) {
      const result = {
        title: parsed.title,
        summary: parsed.summary || fallback.summary,
        highlights: Array.isArray(parsed.highlights) && parsed.highlights.length ? parsed.highlights : fallback.highlights,
        expectations: Array.isArray(parsed.expectations) && parsed.expectations.length ? parsed.expectations : fallback.expectations,
        packing: Array.isArray(parsed.packing) && parsed.packing.length ? parsed.packing : fallback.packing,
      };
      writeCache(key, result, 1000 * 60 * 60 * 24);
      return result;
    }
  } catch (error) {
    console.warn('Gemini trip description generation failed.', error);
  }

  writeCache(key, fallback, 1000 * 60 * 60 * 24);
  return fallback;
}

export async function generateDestinationInsights(destination: string): Promise<{ localCuisine: string[]; culturalTips: string[]; transportTips: string[]; safetyTips: string[]; nearbyPlaces: string[] }> {
  const key = `destination:${destination}`;
  const cached = readCache(key, 1000 * 60 * 60 * 12);
  if (cached) return cached as never;

  const fallback = {
    localCuisine: ['Local street food', 'Regional specialties'],
    culturalTips: ['Respect local customs and dress codes.', 'Learn a few key local phrases.'],
    transportTips: ['Use local transport apps when available.', 'Keep digital and cash backup options.'],
    safetyTips: ['Keep valuables secure in busy areas.', 'Share your itinerary with the group.'],
    nearbyPlaces: ['Scenic lookout', 'Popular heritage walk', 'Local market hub'],
  };

  if (!withinRateLimit(`insights:${destination}`)) {
    writeCache(key, fallback, 1000 * 60 * 60 * 12);
    return fallback;
  }

  try {
    const content = await requestGemini(`Return valid JSON only with keys localCuisine, culturalTips, transportTips, safetyTips, nearbyPlaces. Destination: ${destination}`);
    const parsed = safeJsonParse<{ localCuisine?: string[]; culturalTips?: string[]; transportTips?: string[]; safetyTips?: string[]; nearbyPlaces?: string[] }>(content.match(/\{[\s\S]*\}/)?.[0] ?? '', null as unknown as { localCuisine?: string[]; culturalTips?: string[]; transportTips?: string[]; safetyTips?: string[]; nearbyPlaces?: string[] } | null);
    if (parsed && parsed.localCuisine) {
      const result = {
        localCuisine: parsed.localCuisine || fallback.localCuisine,
        culturalTips: parsed.culturalTips || fallback.culturalTips,
        transportTips: parsed.transportTips || fallback.transportTips,
        safetyTips: parsed.safetyTips || fallback.safetyTips,
        nearbyPlaces: parsed.nearbyPlaces || fallback.nearbyPlaces,
      };
      writeCache(key, result, 1000 * 60 * 60 * 12);
      return result;
    }
  } catch (error) {
    console.warn('Gemini destination insights failed.', error);
  }

  writeCache(key, fallback, 1000 * 60 * 60 * 12);
  return fallback;
}

export async function generateIceBreakers(): Promise<string[]> {
  const cacheKey = 'iceBreakers';
  const cached = readCache(cacheKey, 1000 * 60 * 60 * 24);
  if (cached) return cached as never;

  const fallback = ['Favorite trip memory?', 'Dream destination?', 'One item you never travel without?', 'Best local food you’ve tasted?'];
  writeCache(cacheKey, fallback, 1000 * 60 * 60 * 24);
  return fallback;
}

const APP_HELP = [
  {
    title: 'Create and publish a trip',
    phrases: ['create a trip', 'creating a trip', 'publish a trip', 'trip creator', 'save a trip draft'],
    content: 'From the top navigation choose + Create Trip or open My Trips. In the trip wizard complete Basic Details, Destination and dates, Trip Preferences, Activities, Budget, Stay & Transport, Group Matching, and Rules & Safety. Quick actions in the right preview panel can generate copy, review the plan, explore travelers, or save the draft. Use Save draft & exit to continue later; drafts are stored in this browser. At Review & Publish, check title, trip type, destination, valid start/end dates, cover upload, and description, then choose Publish Trip. You need to be signed in and Supabase must be configured.',
  },
  {
    title: 'Admin dashboard',
    phrases: ['admin dashboard', 'access admin', 'open admin', 'admin page', 'admin panel'],
    content: 'The Admin Dashboard route is /admin. If your authenticated Supabase profile has role ADMIN, open Travel Services → Admin Dashboard or enter /admin in the address bar after signing in. If access is denied, ask the TripMates project administrator to assign ADMIN to your own public.profiles.role row; do not change roles using a public client or another user account. The dashboard includes the private identity verification review queue.',
  },
  {
    title: 'Discover and join trips',
    phrases: ['discover trips', 'find a trip', 'join a trip', 'request to join'],
    content: 'Open Discover in the main navigation. Search by title, activities, or organizer; filter by destination, trip style, budget, and start date. Choose Request to join on a public trip. The owner must approve the request before group chat, itinerary, files, expenses, and shared live map are available. You can review pending requests in Trip Requests.',
  },
  {
    title: 'AI travel assistant',
    phrases: ['ai assistant', 'travel assistant', 'ask ai', 'ai chat'],
    content: 'Use the floating ✦ chat button from any signed-in page for travel planning and in-app help. Open AI Assistant from Travel Services or dashboard for the full chat, destination planner, seasonal guidance, and live weather. Recommendations are generated from saved interests, travel style, and budget when available.',
  },
  {
    title: 'Profile and community stories',
    phrases: ['edit my profile', 'profile photo', 'community story', 'delete my story', 'edit my story'],
    content: 'Open Profile to edit traveler details, interests, and photo. Your own Community stories are listed in the Your travel stories section; expand it to edit text/location or delete a post. Community stories are managed separately from your profile details.',
  },
  {
    title: 'Identity verification',
    phrases: ['get verified', 'verify my identity', 'upload aadhaar', 'verification status'],
    content: 'Open Get Verified from Travel Services or the Dashboard. Enter your legal name, last four Aadhaar digits, upload a PDF or image of a masked Aadhaar document and a current selfie, and consent to private storage and manual review. The request status appears there. Identity is not verified automatically; an authorized administrator reviews it.',
  },
  {
    title: 'Trip group management',
    phrases: ['remove a trip member', 'remove member', 'delete my trip', 'delete a trip', 'manage trip members'],
    content: 'Open a trip you own and go to Members. Use Remove beside a member to revoke their approved membership. The owner can use Delete trip in the trip header to permanently delete the group and its related data. Both actions require confirmation.',
  },
  {
    title: 'Wallet and expenses',
    phrases: ['split expenses', 'pay expense', 'wallet', 'upi'],
    content: 'Open a joined trip group and select Expenses to add a shared expense, split it equally or enter custom shares, and track payment reports and confirmation. Wallet contains your broader expense/settlement views. A payer or trip owner confirms a reported payment; a report by itself is not final confirmation.',
  },
  {
    title: 'Theme settings',
    phrases: ['dark mode', 'light mode', 'change theme', 'theme setting'],
    content: 'Use the sun/moon button in the top navigation to switch light/dark mode. The choice is saved on this device and remains after refresh.',
  },
  {
    title: 'Messaging and community',
    phrases: ['send a message', 'messages page', 'community page', 'post a story'],
    content: 'Open Messages from the bottom navigation on mobile or Travel Services on desktop for direct conversations. Use Community to post a travel story, optionally attach a photo and location, and like or comment on posts. Your own stories can be edited or removed from Profile.',
  },
  {
    title: 'Safety and travel services',
    phrases: ['safety page', 'hotel booking', 'book a cab', 'scooty rental', 'seasonal discovery'],
    content: 'Open Travel Services to find Safety, Hotels, Cabs, Scooty, Map, Seasonal discovery, and AI Assistant. Seasonal discovery offers profile-informed trip ideas and current conditions. Service pages present available options; check provider availability and terms before making external bookings.',
  },
];

const normalizeQuestion = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function findAppHelp(question: string): string | null {
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;
  const isHowTo = /\b(how|where|which|can i|how do i|how to|access|open)\b/.test(normalized);
  const match = APP_HELP.find((entry) => entry.phrases.some((phrase) => normalized.includes(phrase)));
  if (!match || (!isHowTo && !/\b(help|guide|steps|use|using)\b/.test(normalized))) return null;
  return match.content;
}

function getRelevantAppHelp(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const query = normalizeQuestion(messages.slice(-3).map((message) => message.content).join(' '));
  return APP_HELP.map((entry) => ({ entry, score: entry.phrases.reduce((score, phrase) => score + (query.includes(phrase) ? phrase.length : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => `${entry.title}: ${entry.content}`);
}

export async function chatWithTripMates(input: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile?: { city?: string; interests?: string[]; budget?: string; travelStyle?: string };
}): Promise<string> {
  const lastQuestion = input.messages.at(-1)?.content ?? '';
  const inAppHelp = findAppHelp(lastQuestion);
  if (inAppHelp) return inAppHelp;

  const history = input.messages.slice(-12).map((message) => `${message.role === 'user' ? 'Traveler' : 'TripMates AI'}: ${message.content.slice(0, 1200)}`).join('\n');
  const help = getRelevantAppHelp(input.messages);
  const prompt = `You are TripMates AI, the in-app product guide and travel planner for TripMates. Answer the actual latest question specifically, using recent conversation context. If the user asks how to use TripMates, prefer the supplied product documentation and name the exact page/navigation labels. If app docs do not answer, say so and give the correct route if known rather than inventing a feature. For travel planning, give tailored, practical advice and ask at most one relevant follow-up. Never claim to book, verify identity, or know live conditions unless connected data is supplied. Direct official-source checks for visas, safety, health, and transport rules.\nRelevant TripMates feature guide:\n${help.join('\n') || 'No directly matched help article; answer from the app context or state that you are unsure.'}\nTraveler profile: ${JSON.stringify(input.profile ?? {})}\nConversation:\n${history}\nTripMates AI:`;
  try {
    return await requestGemini(prompt, { temperature: 0.65, maxOutputTokens: 500 });
  } catch (error) {
    console.warn('TripMates AI chat unavailable; using local response.', error);
    const lastMessage = lastQuestion.toLowerCase();
    const connectionIssue = error instanceof Error ? error.message : '';
    const networkNotice = /network security gateway|generativelanguage\.googleapis\.com|TLS certificate/i.test(connectionIssue)
      ? 'Your network security policy is blocking Gemini; I’m answering from the built-in TripMates guide instead. Ask your IT team for approved access to Google Gemini.'
      : 'Live AI is temporarily unavailable; I’m answering from the built-in TripMates guide instead.';
    if (lastMessage.includes('admin')) return APP_HELP.find((entry) => entry.title === 'Admin dashboard')!.content;
    if (lastMessage.includes('weather') || lastMessage.includes('forecast')) {
      return `${networkNotice} For live weather, open Create Trip → Destination and select “Check weather” after entering a city. Seasonal guidance and a 3-day forecast are shown there. Current conditions change quickly; which destination do you want to check?`;
    }
    if (lastMessage.includes('pack')) return `${networkNotice} For ${input.profile?.travelStyle || 'a general trip'}, bring weather-appropriate layers, comfortable walking shoes, required medicines, ID, chargers, and a power bank. Check the destination forecast before finalizing. What kind of trip are you packing for?`;
    if (lastMessage.includes('budget') || lastMessage.includes('cost') || lastMessage.includes('cheap')) return `${networkNotice} To keep a ${input.profile?.budget || 'moderate'} trip on budget, set transport, stay, food, and activity estimates separately in Create Trip → Budget, then compare the per-traveler total. Share your destination, dates, and target amount and I can help structure a budget.`;
    if (lastMessage.includes('itinerary') || lastMessage.includes('plan') || lastMessage.includes('days')) return `${networkNotice} A useful ${input.profile?.travelStyle || 'balanced'} itinerary alternates one main activity with flexible time each day: arrival and local orientation, a full activity day, a lighter local-food/culture day, then a buffer and departure. Tell me the destination and trip length to tailor that outline.`;
    if (lastMessage.includes('destination') || lastMessage.includes('where') || lastMessage.includes('trip')) return `${networkNotice} Your profile suggests ${input.profile?.interests?.slice(0, 3).join(', ') || 'exploration'} and a ${input.profile?.budget || 'flexible'} budget. Try Seasonal Discovery for destination ideas, or Discover to browse real published groups. What dates or region are you considering?`;
    const excerpt = lastQuestion.trim().slice(0, 100);
    return `${networkNotice} I received “${excerpt}”. I can still guide you through creating trips, managing a group, profiles, verification, and discovery. For another travel question, include a destination or topic such as food, transport, activities, or safety.`;
  }
}

export async function explainCompatibilityScore(score: number, reasons: string[]): Promise<string> {
  const key = `compatibility:${score}:${JSON.stringify(reasons)}`;
  const cached = readCache(key, 1000 * 60 * 60 * 24);
  if (cached) return cached as never;

  const fallback = `This match is strong because ${reasons.slice(0, 2).join(' and ')}.`;
  if (!withinRateLimit(`compat:${score}`)) {
    writeCache(key, fallback, 1000 * 60 * 60 * 24);
    return fallback;
  }

  try {
    const content = await requestGemini(`Return plain text only. Explain a compatibility score of ${score}% for a travel trip match using these reasons: ${reasons.join(', ')}. Keep it to 2 sentences, natural and practical.`);
    if (content.trim()) {
      writeCache(key, content.trim(), 1000 * 60 * 60 * 24);
      return content.trim();
    }
  } catch (error) {
    console.warn('Gemini compatibility explanation failed.', error);
  }

  writeCache(key, fallback, 1000 * 60 * 60 * 24);
  return fallback;
}

export const AI_CONFIG = {
  usesServerManagedKey: true,
};
