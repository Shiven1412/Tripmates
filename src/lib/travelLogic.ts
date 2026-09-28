export type TravelPersonality =
  | 'Explorer'
  | 'Backpacker'
  | 'Luxury Nomad'
  | 'Foodie'
  | 'Culture Hunter'
  | 'Adventure Seeker'
  | 'Road Tripper'
  | 'Digital Nomad';

export const personalityCatalog: Record<TravelPersonality, { description: string; traits: string[]; accent: string }> = {
  Explorer: {
    description: 'Off-trail, uncharted horizons',
    traits: ['Adventurous', 'Curious', 'Independent'],
    accent: '#10B981',
  },
  Backpacker: {
    description: 'Light pack, heavy memories',
    traits: ['Budget-smart', 'Flexible', 'Social'],
    accent: '#F59E0B',
  },
  'Luxury Nomad': {
    description: 'Comfort meets discovery',
    traits: ['Refined', 'Curated', 'Premium'],
    accent: '#8B5CF6',
  },
  Foodie: {
    description: 'Eat your way around the world',
    traits: ['Gourmet', 'Open-minded', 'Passionate'],
    accent: '#EF4444',
  },
  'Culture Hunter': {
    description: 'Art, history, and depth',
    traits: ['Intellectual', 'Mindful', 'Curious'],
    accent: '#6366F1',
  },
  'Adventure Seeker': {
    description: 'Maximize adrenaline and stories',
    traits: ['Bold', 'Energetic', 'Risk-taker'],
    accent: '#3B82F6',
  },
  'Road Tripper': {
    description: 'The journey is the destination',
    traits: ['Free-spirited', 'Spontaneous', 'Flexible'],
    accent: '#0EA5E9',
  },
  'Digital Nomad': {
    description: 'Work hard, travel harder',
    traits: ['Disciplined', 'Adaptable', 'Networked'],
    accent: '#14B8A6',
  },
};

export type CompatibilityInput = {
  budget?: string | null;
  travelStyle?: string | null;
  lifestyle?: Record<string, string | undefined> | null;
  interests?: string[] | null;
};

export function calculateCompatibility(a: CompatibilityInput, b: CompatibilityInput) {
  const dimensions: number[] = [];
  const budgetA = normalizePreference(a.budget);
  const budgetB = normalizePreference(b.budget);
  if (budgetA && budgetB) {
    const sameBudget = budgetA === budgetB;
    const adjacentBudget = (budgetA === 'budget' && budgetB === 'moderate') || (budgetA === 'moderate' && budgetB === 'budget') || (budgetA === 'moderate' && budgetB === 'luxury') || (budgetA === 'luxury' && budgetB === 'moderate');
    dimensions.push(sameBudget ? 1 : adjacentBudget ? 0.8 : 0.6);
  }

  const styleA = normalizePreference(a.travelStyle);
  const styleB = normalizePreference(b.travelStyle);
  if (styleA && styleB) {
    const exactMatch = styleA === styleB;
    const includesMatch = styleA.includes(styleB) || styleB.includes(styleA);
    dimensions.push(exactMatch ? 1 : includesMatch ? 0.8 : 0.6);
  }

  const interestsA = new Set((a.interests ?? []).map(normalizePreference).filter(Boolean));
  const interestsB = new Set((b.interests ?? []).map(normalizePreference).filter(Boolean));
  if (interestsA.size && interestsB.size) {
    const sharedCount = [...interestsA].filter((interest) => interestsB.has(interest)).length;
    const uniqueInterests = new Set([...interestsA, ...interestsB]);
    dimensions.push(uniqueInterests.size ? sharedCount / uniqueInterests.size : 0);
  }

  const sharedLifestyleKeys = Object.keys(a.lifestyle ?? {}).filter((key) => {
    return Boolean(a.lifestyle?.[key]?.trim() && b.lifestyle?.[key]?.trim());
  });
  if (sharedLifestyleKeys.length) {
    const matchingPreferences = sharedLifestyleKeys.filter((key) => {
      return normalizePreference(a.lifestyle?.[key]) === normalizePreference(b.lifestyle?.[key]);
    }).length;
    dimensions.push(matchingPreferences / sharedLifestyleKeys.length);
  }

  if (!dimensions.length) return null;
  return Math.round((dimensions.reduce((total, score) => total + score, 0) / dimensions.length) * 100);
}

export function calculateTripMatchScore(profile: CompatibilityInput | null | undefined, trip: CompatibilityInput | null | undefined) {
  if (!profile || !trip) return 0;
  const score = calculateCompatibility(profile, trip);
  if (score === null) return 0;
  return Math.max(0, Math.min(100, score));
}

function normalizePreference(value?: string | null) {
  return value?.trim().toLocaleLowerCase() || '';
}

export function getPersonalityFromAnswers(answers: Record<string, string | string[]>) {
  const scores: Record<TravelPersonality, number> = {
    Explorer: 0,
    Backpacker: 0,
    'Luxury Nomad': 0,
    Foodie: 0,
    'Culture Hunter': 0,
    'Adventure Seeker': 0,
    'Road Tripper': 0,
    'Digital Nomad': 0,
  };

  const interests = Array.isArray(answers.interests) ? answers.interests : [];
  const style = String(answers.travelStyle ?? 'Balanced');

  if (interests.includes('Trekking') || interests.includes('Camping') || style.includes('Adventure')) scores.Explorer += 2;
  if (interests.includes('Road Trips') || interests.includes('Backpacking')) scores['Road Tripper'] += 2;
  if (interests.includes('Luxury Travel') || style.includes('Luxury')) scores['Luxury Nomad'] += 2;
  if (interests.includes('Food Tours') || interests.includes('Food')) scores.Foodie += 2;
  if (interests.includes('Cultural Visits') || interests.includes('Sightseeing')) scores['Culture Hunter'] += 2;
  if (interests.includes('Adventure Sports') || style.includes('Adventure')) scores['Adventure Seeker'] += 2;
  if (interests.includes('Remote Work') || interests.includes('Yoga Retreats')) scores['Digital Nomad'] += 2;
  if (answers.budget === 'budget' || answers.budget === 'moderate') scores.Backpacker += 2;
  if (answers.budget === 'luxury') scores['Luxury Nomad'] += 2;

  if (answers.sleep === 'Night owl') scores['Digital Nomad'] += 1;
  if (answers.sleep === 'Early bird') scores.Explorer += 1;

  const personality = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as TravelPersonality;
  return personality;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
