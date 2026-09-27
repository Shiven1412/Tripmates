export type CompatibilityProfile = {
  interests: string[];
  budget: string;
  travelStyle: string;
  ageGroup: string;
  favoriteDestinations: string[];
  activityPreferences: string[];
  pastJoinedTrips: number;
};

export function calculateTripCompatibilityScore(profile: CompatibilityProfile | null | undefined, trip: { destination?: string; tripType?: string; budgetType?: string; activities?: string[]; startDate?: string; endDate?: string; city?: string; country?: string; maxMembers?: number } | null | undefined) {
  const safeProfile = profile ?? {
    interests: [],
    budget: 'moderate',
    travelStyle: 'balanced',
    ageGroup: '25-34',
    favoriteDestinations: [],
    activityPreferences: [],
    pastJoinedTrips: 0,
  };

  const tripDestinations = [trip?.destination, trip?.city, trip?.country].filter(Boolean).join(' ');
  const tripActivities = trip?.activities ?? [];
  const interestMatches = tripActivities.filter((act) => safeProfile.interests.some((interest) => interest.toLowerCase().includes(act.toLowerCase()) || act.toLowerCase().includes(interest.toLowerCase()))).length;
  const favoriteDestinationMatch = tripDestinations ? safeProfile.favoriteDestinations.some((destination) => tripDestinations.toLowerCase().includes(destination.toLowerCase())) : false;
  const budgetPref = safeProfile.budget?.toLowerCase() ?? 'moderate';
  const tripBudget = trip?.budgetType?.toLowerCase() ?? 'moderate';
  const budgetAlignment = budgetPref === tripBudget ? 1 : budgetPref === 'budget' && tripBudget === 'moderate' ? 0.8 : budgetPref === 'luxury' && tripBudget === 'moderate' ? 0.75 : 0.9;
  const styleMatch = safeProfile.travelStyle && trip?.tripType ? (safeProfile.travelStyle.toLowerCase() === trip.tripType.toLowerCase() || trip.tripType.toLowerCase().includes(safeProfile.travelStyle.toLowerCase())) ? 1 : 0.8 : 0.8;
  const activityScore = Math.min(1, (interestMatches + safeProfile.activityPreferences.filter((activity) => tripActivities.some((item) => item.toLowerCase().includes(activity.toLowerCase()) || activity.toLowerCase().includes(item.toLowerCase()))).length) / Math.max(1, Math.min(4, tripActivities.length || 4)));
  const experienceBoost = Math.min(1, (safeProfile.pastJoinedTrips || 0) / 12);
  const finals = Math.min(98, Math.max(45, Math.round((budgetAlignment * 25) + (styleMatch * 20) + (favoriteDestinationMatch ? 12 : 8) + (activityScore * 25) + (experienceBoost * 15) + (safeProfile.ageGroup ? 5 : 0)))) ;

  const reasons = [
    budgetAlignment > 0.8 ? 'Similar budget expectations' : 'Budget is within a comfortable range',
    activityScore > 0.5 ? 'Adventure interests match' : 'Travel style is broadly aligned',
    favoriteDestinationMatch ? 'Favorite destinations overlap' : 'Destination is in a familiar travel lane',
    styleMatch > 0.8 ? 'Preferred travel duration and pace fit well' : 'Trip structure suits a flexible travel profile',
  ];

  return {
    score: finals,
    reasons,
    label: finals >= 85 ? 'Excellent Match' : finals >= 70 ? 'Good Match' : finals >= 55 ? 'Promising Match' : 'Needs Review',
  };
}
