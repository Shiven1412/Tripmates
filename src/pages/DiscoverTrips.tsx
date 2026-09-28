import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { fetchPublishedTrips, fetchTripMembershipStatuses, requestToJoinTrip, type PublicTrip } from '../lib/supabaseData';
import { getTripCoverImage } from '../lib/tripImages';
import { calculateCompatibility } from '../lib/travelLogic';

const STYLES = ['All', 'Trekking', 'Beach', 'Culture', 'Digital Nomad', 'Adventure', 'Nature', 'Road Trip'];
const GENDER_FILTERS = ['All', 'Mixed', 'Male Only', 'Female Only', 'LGBTQ+ Friendly'];
const DIET_FILTERS = ['Any', 'Vegetarian', 'Non-vegetarian', 'Vegan'];
const currency = (amount: number) => amount > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : 'Budget not set';
const tripDate = (trip: PublicTrip) => {
  if (!trip.start_date) return 'Flexible dates';
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = trip.end_date ? new Date(`${trip.end_date}T00:00:00`) : null;
  const format = (date: Date) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  return end ? `${format(start)} – ${format(end)}` : format(start);
};

export default function DiscoverTrips() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [memberships, setMemberships] = useState<Record<string, 'APPROVED' | 'PENDING'>>({});
  const [activeStyle, setActiveStyle] = useState('All');
  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [smokingFilter, setSmokingFilter] = useState('Any');
  const [drinkingFilter, setDrinkingFilter] = useState('Any');
  const [dietFilter, setDietFilter] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState('');

  const loadTrips = async () => {
    setLoading(true);
    const [allTrips, joinedTrips] = await Promise.all([fetchPublishedTrips(), fetchTripMembershipStatuses()]);
    setTrips(allTrips);
    setMemberships(joinedTrips);
    setLoading(false);
  };

  useEffect(() => { void loadTrips(); }, []);

  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const query = search.trim().toLocaleLowerCase();
    const destinationQuery = destination.trim().toLocaleLowerCase();
    const haystack = `${trip.title} ${trip.destination} ${trip.description ?? ''} ${trip.creator_name} ${(trip.activities ?? []).join(' ')}`.toLocaleLowerCase();
    const budget = Number(trip.budget_accommodation ?? 0) + Number(trip.budget_transport ?? 0) + Number(trip.budget_food ?? 0) + Number(trip.budget_activities ?? 0) + Number(trip.budget_other ?? 0);
    return (!query || haystack.includes(query))
      && (!destinationQuery || trip.destination.toLocaleLowerCase().includes(destinationQuery))
      && (activeStyle === 'All' || trip.trip_type?.toLocaleLowerCase().includes(activeStyle.toLocaleLowerCase()) || (trip.activities ?? []).some((activity) => activity.toLocaleLowerCase().includes(activeStyle.toLocaleLowerCase())))
      && (!budgetLimit || !budget || budget <= Number(budgetLimit))
      && (!fromDate || !trip.start_date || trip.start_date >= fromDate)
      && (genderFilter === 'All' || (trip.gender_preference || 'Mixed') === genderFilter)
      && (smokingFilter === 'Any' || Boolean(trip.smoking_friendly) === (smokingFilter === 'Smoke-friendly'))
      && (drinkingFilter === 'Any' || Boolean(trip.drinking_friendly) === (drinkingFilter === 'Alcohol-friendly'))
      && (dietFilter === 'Any' || !trip.food_preference || trip.food_preference === 'Any' || trip.food_preference === dietFilter);
  }), [trips, search, destination, activeStyle, budgetLimit, fromDate, genderFilter, smokingFilter, drinkingFilter, dietFilter]);

  const clearFilters = () => {
    setSearch('');
    setDestination('');
    setBudgetLimit('');
    setFromDate('');
    setActiveStyle('All');
    setGenderFilter('All');
    setSmokingFilter('Any');
    setDrinkingFilter('Any');
    setDietFilter('Any');
  };

  const getCompatibilityScore = (trip: PublicTrip) => {
    if (!currentUser) return 0;
    const tripBudget = Number(trip.budget_accommodation ?? 0) + Number(trip.budget_transport ?? 0) + Number(trip.budget_food ?? 0) + Number(trip.budget_activities ?? 0) + Number(trip.budget_other ?? 0);
    const tripBudgetTier = tripBudget < 15000 ? 'budget' : tripBudget < 30000 ? 'moderate' : 'luxury';

    const userProfile = {
      budget: currentUser.budget || 'moderate',
      travelStyle: currentUser.travelPersonality || 'Explorer',
      lifestyle: currentUser.lifestyle || { smoking: 'Non-smoker', drinking: 'Social only', food: 'Non-veg' },
      interests: currentUser.interests || [],
    };

    const tripProfile = {
      budget: tripBudgetTier,
      travelStyle: trip.trip_type || 'Adventure',
      lifestyle: {
        smoking: trip.smoking_friendly ? 'Smoke-friendly' : 'Smoke-free',
        drinking: trip.drinking_friendly ? 'Alcohol-friendly' : 'Alcohol-free',
        food: trip.food_preference || 'Any',
      },
      interests: trip.activities || [],
    };

    const score = calculateCompatibility(userProfile, tripProfile);
    return typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0;
  };

  const requestJoin = async (trip: PublicTrip) => {
    setRequestingId(trip.id);
    const result = await requestToJoinTrip(trip.id);
    setRequestingId('');
    if (!result.success) { window.alert(result.error?.message || 'Could not request to join this trip.'); return; }
    setMemberships((previous) => ({ ...previous, [trip.id]: 'PENDING' }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="tag mb-2">Live from the TripMates community</p><h1 className="text-3xl font-bold">Discover trips</h1><p className="mt-2 text-sm text-slate-600">Browse published groups and request to join trips that fit your plans.</p></div>
          <button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate('/create-trip')}>+ Publish a trip</button>
        </div>

        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Find your kind of trip</h2>
              <p className="mt-0.5 text-xs text-slate-500">Filter by activities, group preferences, and food.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowFilters((value) => !value)} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 md:hidden">
                Filters {showFilters ? '▲' : '▼'}
              </button>
              <button type="button" onClick={clearFilters} className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Clear filters</button>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-out ${showFilters || window.innerWidth >= 768 ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0 md:max-h-[1200px] md:opacity-100'}`}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, activities, organizer…" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
              <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Filter by destination" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
              <input type="number" min="0" value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} placeholder="Max total budget ₹" className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Trips starting on or after" className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
              <label className="block text-xs font-semibold text-slate-600">Gender group<select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)} style={{ appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px)', backgroundSize: '5px 5px', backgroundRepeat: 'no-repeat', paddingRight: '2.25rem' }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"><option>All</option>{GENDER_FILTERS.slice(1).map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="block text-xs font-semibold text-slate-600">Smoking<select value={smokingFilter} onChange={(event) => setSmokingFilter(event.target.value)} style={{ appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px)', backgroundSize: '5px 5px', backgroundRepeat: 'no-repeat', paddingRight: '2.25rem' }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"><option>Any</option><option>Smoke-friendly</option><option>Smoke-free</option></select></label>
              <label className="block text-xs font-semibold text-slate-600">Alcohol<select value={drinkingFilter} onChange={(event) => setDrinkingFilter(event.target.value)} style={{ appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px)', backgroundSize: '5px 5px', backgroundRepeat: 'no-repeat', paddingRight: '2.25rem' }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"><option>Any</option><option>Alcohol-friendly</option><option>Alcohol-free</option></select></label>
              <label className="block text-xs font-semibold text-slate-600">Food preference<select value={dietFilter} onChange={(event) => setDietFilter(event.target.value)} style={{ appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px)', backgroundSize: '5px 5px', backgroundRepeat: 'no-repeat', paddingRight: '2.25rem' }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">{DIET_FILTERS.map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">{STYLES.map((style) => <button key={style} onClick={() => setActiveStyle(style)} className={`rounded-full border px-4 py-2 text-sm font-medium ${activeStyle === style ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{style}</button>)}</div>

        {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading published trips…</div> : !filteredTrips.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="mb-3 text-4xl">🧭</div><h2 className="text-xl font-bold">No published trips match those filters</h2><p className="mt-2 text-sm text-slate-500">Clear a filter, or be the first to publish a trip group.</p><button className="btn-outline mt-5 px-4 py-2 text-sm" onClick={clearFilters}>Clear filters</button></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredTrips.map((trip) => {
            const budget = Number(trip.budget_accommodation ?? 0) + Number(trip.budget_transport ?? 0) + Number(trip.budget_food ?? 0) + Number(trip.budget_activities ?? 0) + Number(trip.budget_other ?? 0);
            const status = memberships[trip.id];
            const compatibility = getCompatibilityScore(trip);
            return <article key={trip.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="group relative h-48 overflow-hidden bg-slate-200"><img src={trip.cover_image || getTripCoverImage(trip.destination, trip.trip_type)} alt={`${trip.destination} travel`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"/><span className="absolute bottom-3 left-4 text-sm font-semibold text-white">Explore {trip.destination}</span></div>
              <div className="p-5"><div className="mb-2 flex items-start justify-between gap-2"><h2 className="text-lg font-bold">{trip.title}</h2><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{trip.trip_type || 'Trip'}</span></div>
                <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-2.5 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compatibility</span>
                  <span className={`text-sm font-bold ${compatibility >= 80 ? 'text-emerald-700' : compatibility >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{compatibility}%</span>
                </div>
                <p className="text-sm text-slate-600">📍 {trip.destination}</p><p className="mt-1 text-sm text-slate-500">📅 {tripDate(trip)}</p>
                {trip.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{trip.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Trip group preferences">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">👥 {trip.gender_preference || 'Mixed'}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">🚭 {trip.smoking_friendly ? 'Smoking friendly' : 'Smoke-free'}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">🍷 {trip.drinking_friendly ? 'Alcohol friendly' : 'Alcohol-free'}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">🥗 {trip.food_preference || 'Any food'}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="truncate text-slate-500">By {trip.creator_name}</span><span className="shrink-0 text-slate-600">👥 {trip.member_count}/{trip.max_members ?? 8}</span></div>
                <div className="mt-3 flex items-center justify-between"><strong className="text-slate-900">{currency(budget)} <span className="text-xs font-normal text-slate-500">per traveler</span></strong>
                  {status === 'APPROVED' ? <button className="btn-outline px-3 py-2 text-xs" onClick={() => navigate('/trips')}>Joined</button> : status === 'PENDING' ? <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Request pending</span> : <button disabled={requestingId === trip.id} className="btn-primary px-3 py-2 text-xs disabled:opacity-50" onClick={() => void requestJoin(trip)}>{requestingId === trip.id ? 'Sending…' : 'Request to join'}</button>}
                </div>
              </div>
            </article>;
          })}</div>
        )}
      </div>
    </div>
  );
}
