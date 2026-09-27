import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { createTrip, fetchTravelers, fetchTripsCreatedBy, type PublicTrip, type PublicTraveler } from '../lib/supabaseData';
import { generateTripDescription, getLiveWeatherInsight, type LiveWeatherInsight } from '../lib/aiService';
import { uploadImage } from '../lib/media';

const wizardSteps = [
  'Basic Details',
  'Destination',
  'Trip Preferences',
  'Activities',
  'Budget',
  'Stay & Transport',
  'Group Matching',
  'Rules & Safety',
  'Review & Publish',
];

const tripTypes = ['Backpacking', 'Road Trip', 'Trekking', 'Camping', 'Luxury Travel', 'Adventure', 'Digital Nomad', 'Sightseeing'];
const activityOptions = ['Trekking', 'Camping', 'Bike Ride', 'Road Trip', 'Photography', 'Nightlife', 'Food Tour', 'Sightseeing', 'Boating', 'Scuba Diving', 'Water Sports', 'Cafe Hopping', 'Shopping', 'Wildlife Safari', 'Mountain Climbing'];
const visibilityOptions = ['Public', 'Private', 'Invite Only'];
const budgetTypes = ['Budget', 'Moderate', 'Luxury'];
const defaultDraft = {
  title: '',
  shortDescription: '',
  coverImage: '',
  tripType: '',
  visibility: 'Public',
  destination: '',
  country: '',
  state: '',
  city: '',
  meetingPoint: '',
  startDate: '',
  endDate: '',
  budgetType: '',
  budgetAccommodation: 0,
  budgetTransport: 0,
  budgetFood: 0,
  budgetActivities: 0,
  budgetOther: 0,
  advancePayment: 0,
  groupWallet: false,
  genderPreference: '',
  foodPreference: 'Any',
  smokingFriendly: false,
  drinkingFriendly: false,
  partyFriendly: false,
  ageRange: [18, 60],
  travelPace: '',
  experienceLevel: '',
  activities: [],
  accommodationType: '',
  transportType: '',
  maxMembers: 6,
  rules: '',
  verificationRequired: false,
  consentRequired: false,
  emergencyContact: false,
  insuranceRecommended: false,
  aadhaarRequired: false,
  faceVerification: false,
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function CreateTrip() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverObjectUrlRef = useRef<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(defaultDraft);
  const [draftRestored, setDraftRestored] = useState(false);
  const [myTrips, setMyTrips] = useState<PublicTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [weather, setWeather] = useState<LiveWeatherInsight | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [showTravelerPanel, setShowTravelerPanel] = useState(false);
  const [travelers, setTravelers] = useState<PublicTraveler[]>([]);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const draftStorageKey = `tripmates-trip-draft:${currentUser?.id ?? 'guest'}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { draft?: typeof defaultDraft; step?: number };
        if (parsed.draft && typeof parsed.draft === 'object') {
          setDraft({ ...defaultDraft, ...parsed.draft });
          setStep(Math.max(0, Math.min(wizardSteps.length - 1, Number(parsed.step) || 0)));
          setCoverPreview(typeof parsed.draft.coverImage === 'string' ? parsed.draft.coverImage : '');
        }
      }
    } catch (error) {
      console.warn('Could not restore the saved trip draft.', error);
    }
    setDraftRestored(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftRestored) return;
    window.localStorage.setItem(draftStorageKey, JSON.stringify({ draft, step }));
  }, [draft, draftRestored, draftStorageKey, step]);

  useEffect(() => () => {
    if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    if (!currentUser) { setMyTrips([]); setLoadingTrips(false); return () => { active = false; }; }
    setLoadingTrips(true);
    void fetchTripsCreatedBy(currentUser.id).then((trips) => {
      if (active) { setMyTrips(trips); setLoadingTrips(false); }
    });
    return () => { active = false; };
  }, [currentUser]);

  const tripDuration = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return '—';
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff + 1} days`;
  }, [draft.startDate, draft.endDate]);

  const progress = ((step + 1) / wizardSteps.length) * 100;
  const expectedTotalBudget = draft.budgetAccommodation + draft.budgetTransport + draft.budgetFood + draft.budgetActivities + draft.budgetOther;

  const updateDraft = <K extends keyof typeof defaultDraft>(key: K, value: (typeof defaultDraft)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleActivity = (activity: string) => {
    setDraft((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((item) => item !== activity)
        : [...prev.activities, activity],
    }));
  };

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    setCoverError('');
    if (!file.type.startsWith('image/')) {
      setCoverError('Choose an image file for the trip cover.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCoverError('The image must be 10MB or smaller.');
      return;
    }

    if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current);
    const localPreview = URL.createObjectURL(file);
    coverObjectUrlRef.current = localPreview;
    setCoverPreview(localPreview);
    setCoverUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setCoverPreview(imageUrl);
      setDraft((previous) => ({ ...previous, coverImage: imageUrl }));
      URL.revokeObjectURL(localPreview);
      coverObjectUrlRef.current = null;
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'Cover image upload failed.');
    } finally {
      setCoverUploading(false);
    }
  };

  const loadWeather = async () => {
    const location = draft.city.trim() || draft.destination.trim();
    if (!location) {
      setWeatherError('Enter a destination city before checking its weather.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError('');
    try {
      setWeather(await getLiveWeatherInsight(location));
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Weather data is temporarily unavailable.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const generateDescription = async () => {
    const destination = draft.destination.trim() || draft.city.trim();
    if (!destination) {
      setPublishError('Add a destination before generating trip copy.');
      return;
    }
    setDescriptionLoading(true);
    setPublishError('');
    try {
      const duration = draft.startDate && draft.endDate ? tripDuration : '4-5 days';
      const generated = await generateTripDescription({
        destination,
        budget: draft.budgetType || 'moderate',
        duration,
        activities: draft.activities,
      });
      setDraft((previous) => ({
        ...previous,
        title: previous.title.trim() ? previous.title : generated.title.slice(0, 120),
        shortDescription: generated.summary.slice(0, 180),
      }));
    } finally {
      setDescriptionLoading(false);
    }
  };

  const openTravelerPanel = async () => {
    setShowTravelerPanel(true);
    if (travelers.length) return;
    setTravelersLoading(true);
    try {
      setTravelers(await fetchTravelers());
    } finally {
      setTravelersLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-800">Start with a quick template</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Weekend escape', type: 'Sightseeing', activities: ['Food Tour', 'Photography', 'Cafe Hopping'] },
                  { label: 'Outdoor adventure', type: 'Trekking', activities: ['Trekking', 'Camping', 'Photography'] },
                  { label: 'Road trip', type: 'Road Trip', activities: ['Road Trip', 'Sightseeing', 'Food Tour'] },
                ].map((template) => (
                  <button key={template.label} type="button" onClick={() => setDraft((previous) => ({ ...previous, tripType: template.type, activities: template.activities, maxMembers: 6 }))} className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 transition hover:border-emerald-400">
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trip Title</label>
              <input
                value={draft.title}
                onChange={(e) => updateDraft('title', e.target.value)}
                placeholder="e.g. Ladakh High Passes"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Short Description</label>
              <textarea
                rows={4}
                value={draft.shortDescription}
                onChange={(e) => updateDraft('shortDescription', e.target.value)}
                placeholder="Tell travelers why this trip is worth joining"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <button type="button" disabled={descriptionLoading} onClick={() => void generateDescription()} className="font-semibold text-emerald-700 disabled:opacity-50">
                  {descriptionLoading ? 'Generating…' : '✨ Generate with AI'}
                </button>
                <span>{draft.shortDescription.length}/180</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trip Cover Image</label>
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { void handleCoverUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); void handleCoverUpload(event.dataTransfer.files?.[0]); }}
                className="relative overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-slate-50 transition hover:border-emerald-500 hover:bg-emerald-50/40"
              >
                {coverPreview ? (
                  <div className="relative h-56">
                    <img src={coverPreview} alt="Trip cover preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-10">
                      <span className="text-sm font-medium text-white">{coverUploading ? 'Uploading image…' : draft.coverImage ? 'Cover image ready' : 'Preview only — upload did not complete'}</span>
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">Change</button>
                    </div>
                    {coverUploading && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/40"><div className="h-full w-1/2 animate-pulse bg-emerald-500" /></div>}
                  </div>
                ) : (
                  <button type="button" disabled={coverUploading} onClick={() => coverInputRef.current?.click()} className="flex w-full items-center justify-between gap-4 p-4 text-left disabled:opacity-60">
                    <span className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl">📷</span>
                      <span><span className="block text-sm font-semibold text-slate-800">Upload cover image</span><span className="block text-xs text-slate-500">Drag and drop or browse · JPG, PNG, WebP · 10MB max</span></span>
                    </span>
                    <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Browse</span>
                  </button>
                )}
              </div>
              {coverError && <p role="alert" className="mt-2 text-sm text-red-600">{coverError}</p>}
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Trip Type</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {tripTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateDraft('tripType', type)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                      draft.tripType === type ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Visibility</label>
              <div className="flex flex-wrap gap-3">
                {visibilityOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateDraft('visibility', option)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      draft.visibility === option ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Destination Search</label>
              <input value={draft.destination} onChange={(event) => updateDraft('destination', event.target.value)} placeholder="Search or enter a destination, e.g. Ladakh" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
                <input value={draft.country} onChange={(e) => updateDraft('country', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">State</label>
                <input value={draft.state} onChange={(e) => updateDraft('state', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
                <input value={draft.city} onChange={(e) => updateDraft('city', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Meeting Point</label>
                <input value={draft.meetingPoint} onChange={(e) => updateDraft('meetingPoint', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Start Date</label>
                <input type="date" value={draft.startDate} onChange={(e) => updateDraft('startDate', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">End Date</label>
                <input type="date" value={draft.endDate} onChange={(e) => updateDraft('endDate', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Planning outlook</div>
                  <div className="mt-1 text-sm text-slate-600">Live conditions and destination-specific seasonal guidance</div>
                </div>
                <button type="button" onClick={() => void loadWeather()} disabled={weatherLoading} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {weatherLoading ? 'Checking…' : 'Check weather'}
                </button>
              </div>
              {weatherError && <p role="alert" className="mt-3 text-sm text-amber-700">{weatherError}</p>}
              {weatherLoading && <div className="mt-4 grid animate-pulse gap-3 md:grid-cols-3"><div className="h-20 rounded-xl bg-slate-100" /><div className="h-20 rounded-xl bg-slate-100" /><div className="h-20 rounded-xl bg-slate-100" /></div>}
              {weather && !weatherLoading && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Now · {weather.location}</div><div className="mt-1 text-lg font-semibold text-slate-900">{Math.round(weather.temperatureC)}°C · {weather.condition}</div><div className="text-xs text-slate-500">Feels like {Math.round(weather.apparentTemperatureC)}°C · humidity {weather.humidityPercent}%</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Best season</div><div className="mt-1 text-lg font-semibold text-emerald-700">{weather.seasonal.bestSeason}</div><div className="text-xs text-slate-600">Seasonal recommendation</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Next 3 days</div><div className="mt-1 space-y-1">{weather.forecast.map((day) => <div key={day.date} className="flex justify-between gap-2 text-xs text-slate-700"><span>{day.date}</span><span>{Math.round(day.minC)}°–{Math.round(day.maxC)}° · {day.precipitationMm}mm</span></div>)}</div></div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{weather.seasonal.weatherSummary}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Travel tips</div><ul className="space-y-1 text-sm text-slate-600">{weather.seasonal.travelTips.slice(0, 3).map((tip) => <li key={tip}>• {tip}</li>)}</ul></div>
                    <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Good-fit activities</div><div className="flex flex-wrap gap-2">{weather.seasonal.bestActivities.slice(0, 4).map((activity) => <span key={activity} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">{activity}</span>)}</div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Interactive Map Preview</div>
                <div className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">Live</div>
              </div>
              <div className="relative h-44 overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.13),_transparent_50%)]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-500 shadow-lg" />
                <div className="absolute bottom-3 right-3 rounded-2xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">{draft.city}</div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Gender Preference</label>
              <div className="flex flex-wrap gap-2">
                {['Mixed', 'Male Only', 'Female Only', 'LGBTQ+ Friendly'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateDraft('genderPreference', option)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium ${
                      draft.genderPreference === option ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Food preference</label>
              <select value={draft.foodPreference} onChange={(event) => updateDraft('foodPreference', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white md:max-w-sm">
                <option>Any</option><option>Vegetarian</option><option>Non-vegetarian</option><option>Vegan</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Choose a preference for shared meal planning; “Any” is inclusive of all diets.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Smoking Friendly', 'smokingFriendly'],
                ['Drinking Friendly', 'drinkingFriendly'],
                ['Party Friendly', 'partyFriendly'],
              ].map(([label, key]) => (
                <button
                  key={label}
                  onClick={() => updateDraft(key as keyof typeof defaultDraft, !draft[key as keyof typeof defaultDraft])}
                  className={`rounded-2xl border p-4 text-left transition ${
                    Boolean(draft[key as keyof typeof defaultDraft]) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-2 text-xs opacity-80">{Boolean(draft[key as keyof typeof defaultDraft]) ? 'Enabled' : 'Disabled'}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Age Range</label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-600">
                  <span>18</span>
                  <span>{draft.ageRange[0]} - {draft.ageRange[1]}</span>
                  <span>60</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={60}
                  value={draft.ageRange[1]}
                  onChange={(e) => updateDraft('ageRange', [draft.ageRange[0], Number(e.target.value)])}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Travel Pace</label>
                <select value={draft.travelPace} onChange={(e) => updateDraft('travelPace', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white">
                  <option>Relaxed</option>
                  <option>Moderate</option>
                  <option>Fast-Paced</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Experience</label>
                <select value={draft.experienceLevel} onChange={(e) => updateDraft('experienceLevel', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Experienced</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Max Members</label>
                <input type="number" min={2} max={20} value={draft.maxMembers} onChange={(e) => updateDraft('maxMembers', Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Select Activities</label>
              <div className="flex flex-wrap gap-2">
                {activityOptions.map((activity) => (
                  <button
                    key={activity}
                    onClick={() => toggleActivity(activity)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                      draft.activities.includes(activity) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-medium text-slate-700">Selected Activities</div>
              <div className="flex flex-wrap gap-2">
                {draft.activities.length > 0 ? (
                  draft.activities.map((activity) => (
                    <span key={activity} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">{activity}</span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No activities selected yet</span>
                )}
              </div>

            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Budget Type</label>
              <div className="flex flex-wrap gap-2">
                {budgetTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateDraft('budgetType', type)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium ${
                      draft.budgetType === type ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Hotel / accommodation budget (₹)</label>
                <input type="number" min="0" value={draft.budgetAccommodation} onChange={(e) => updateDraft('budgetAccommodation', Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Travel / transport budget (₹)</label>
                <input type="number" min="0" value={draft.budgetTransport} onChange={(e) => updateDraft('budgetTransport', Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {([
                ['Food budget (₹)', 'budgetFood'],
                ['Activities budget (₹)', 'budgetActivities'],
                ['Other / contingency (₹)', 'budgetOther'],
              ] as const).map(([label, key]) => <div key={key}>
                <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                <input type="number" min="0" value={draft[key]} onChange={(event) => updateDraft(key, Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Advance Payment Required</label>
                <input type="number" value={draft.advancePayment} onChange={(e) => updateDraft('advancePayment', Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
              </div>
              <div className="flex items-end">
                <label className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Group Wallet Funding
                  <input type="checkbox" checked={draft.groupWallet} onChange={(e) => updateDraft('groupWallet', e.target.checked)} className="h-4 w-4 accent-emerald-500" />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="text-sm text-emerald-800">Expected total trip budget</div><div className="mt-1 text-2xl font-bold text-emerald-900">{formatCurrency(expectedTotalBudget)}</div><div className="mt-1 text-xs text-emerald-700">Per traveler estimate: {formatCurrency(expectedTotalBudget / Math.max(1, draft.maxMembers))} across {draft.maxMembers} planned members.</div></div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Accommodation Type</label>
                <select value={draft.accommodationType} onChange={(e) => updateDraft('accommodationType', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white">
                  <option>Hostel</option>
                  <option>Hotel</option>
                  <option>Resort</option>
                  <option>Homestay</option>
                  <option>Camping</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Transport Type</label>
                <select value={draft.transportType} onChange={(e) => updateDraft('transportType', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white">
                  <option>Self Drive</option>
                  <option>Cab</option>
                  <option>Bike Rental</option>
                  <option>Scooty Rental</option>
                  <option>Bus</option>
                  <option>Train</option>
                  <option>Flight</option>
                </select>
              </div>
            </div>

            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Provider quotes are not connected yet. Enter your expected accommodation and transport costs in the Budget step.</p>
          </div>
        );
      case 6:
        return (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Find your travel group</h3>
            <p className="mb-5 text-sm text-slate-600">Preview real traveler profiles without leaving your trip plan. Your draft stays saved while you explore.</p>
            <button type="button" className="btn-primary px-5 py-3 text-sm" onClick={() => void openTravelerPanel()}>Explore travelers</button>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trip Rules</label>
              <textarea value={draft.rules} onChange={(e) => updateDraft('rules', e.target.value)} rows={5} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Identity Verification Required', 'verificationRequired'],
                ['Aadhaar Verification', 'aadhaarRequired'],
                ['Face Verification', 'faceVerification'],
                ['Emergency Contact Mandatory', 'emergencyContact'],
                ['Consent Agreement Required', 'consentRequired'],
                ['Insurance Recommended', 'insuranceRecommended'],
              ].map(([label, key]) => (
                <label key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(draft[key as keyof typeof defaultDraft])}
                    onChange={(e) => updateDraft(key as keyof typeof defaultDraft, e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <div className="rounded-[28px] bg-slate-50 p-5">
              <div className="mb-5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Trip overview</div>
              <div className="space-y-5 text-sm text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Trip</span><strong className="text-slate-900">{draft.title}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Destination</span><strong className="text-slate-900">{draft.city}, {draft.country}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Dates</span><strong className="text-slate-900">{draft.startDate} → {draft.endDate}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Expected total budget</span><strong className="text-slate-900">{formatCurrency(expectedTotalBudget)}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Activities</span><strong className="text-slate-900">{draft.activities.join(', ') || 'None selected'}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Accommodation</span><strong className="text-slate-900">{draft.accommodationType}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Transport</span><strong className="text-slate-900">{draft.transportType}</strong></div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span>Members</span><strong className="text-slate-900">{draft.maxMembers} max</strong></div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pt-16 pb-24 md:pb-8">
      {!showComposer ? (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase">Trip planning</div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 md:text-5xl">My Trips</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 md:text-base">Track your group plans, review upcoming adventures, and launch your next unforgettable journey.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setShowComposer(true); setStep(0); }} className="btn-primary py-2.5 text-sm">+ Create Adventure</button>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {['All trips', 'Upcoming', 'Drafts', 'Past', 'Saved'].map((tab, idx) => (
              <button key={tab} className={`rounded-full px-4 py-2 text-sm font-medium ${idx === 0 ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_360px]">
            <div className="space-y-5">
              {loadingTrips ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading your trips…</div> : myTrips.length ? myTrips.map((trip) => (
                <article key={trip.id} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                  {trip.cover_image ? <img src={trip.cover_image} alt="" className="h-56 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-emerald-50 text-4xl">✈️</div>}
                  <div className="p-5"><h2 className="text-xl font-semibold text-slate-900">{trip.title}</h2><p className="mt-1 text-sm text-slate-500">{trip.destination} · {trip.start_date || 'Flexible dates'}</p><p className="mt-3 line-clamp-2 text-sm text-slate-600">{trip.description || 'No description provided.'}</p><button onClick={() => navigate('/trips')} className="btn-primary mt-4 px-4 py-2 text-xs">View all published groups →</button></div>
                </article>
              )) : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><div className="mb-3 text-4xl">🧭</div><h2 className="font-bold text-lg">You haven’t created a trip yet</h2><p className="mt-2 text-sm text-slate-500">Publish your first group and it will show up here.</p><button onClick={() => { setShowComposer(true); setStep(0); }} className="btn-primary mt-5 px-4 py-2 text-sm">Create a trip</button></div>}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Overview</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{myTrips.length}</div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✈️</div>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between"><span>Trips published</span><strong className="text-slate-900">{myTrips.length}</strong></div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">Quick actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Create', '✦'],
                    ['Drafts', '📝'],
                    ['Matches', '🤝'],
                    ['Safety', '🛡️'],
                  ].map(([label, icon]) => (
                    <button key={label} onClick={() => {
                      if (label === 'Create') { setShowComposer(true); setStep(0); }
                      else if (label === 'Drafts') { setShowComposer(true); }
                      else navigate(label === 'Matches' ? '/people' : '/safety');
                    }} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white">
                      <div className="text-lg">{icon}</div>
                      <div className="mt-2">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button onClick={() => setShowComposer(false)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">← Back to My Trips</button><button type="button" onClick={() => { setStep(0); document.getElementById('trip-quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm">✦ Quick actions</button></div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
            <div className="grid lg:grid-cols-[260px_minmax(0,1fr)_360px]">
              <aside className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Trip creator</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">Create Adventure</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-lg">✦</div>
                </div>

                <div className="space-y-3">
                  {wizardSteps.map((label, index) => {
                    const active = index === step;
                    const completed = index < step;
                    return (
                      <button
                        key={label}
                        onClick={() => index <= step && setStep(index)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                          active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : completed ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${
                          active || completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {completed ? '✓' : index + 1}
                        </div>
                        <div className="text-sm font-medium">{label}</div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="p-5 md:p-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Step {step + 1}</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{wizardSteps[step]}</h2>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>{step + 1} / {wizardSteps.length}</div>
                    <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                {renderStep()}

                {showTravelerPanel && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="traveler-panel-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTravelerPanel(false); }}>
                    <section className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                      <header className="flex items-center justify-between border-b border-slate-200 p-5">
                        <div><h3 id="traveler-panel-title" className="text-lg font-bold text-slate-900">Explore travelers</h3><p className="mt-1 text-sm text-slate-500">Public profiles from the TripMates community</p></div>
                        <button type="button" onClick={() => setShowTravelerPanel(false)} aria-label="Close traveler panel" className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
                      </header>
                      <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
                        {travelersLoading ? <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Loading traveler profiles…</div> : travelers.length ? travelers.map((traveler) => (
                          <article key={traveler.id} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                            {traveler.avatar_url ? <img src={traveler.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{traveler.full_name?.charAt(0)?.toUpperCase() || 'T'}</div>}
                            <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{traveler.full_name || 'TripMate'}{traveler.age ? ` · ${traveler.age}` : ''}</div><div className="mt-0.5 text-xs text-slate-500">{traveler.city || 'Location not shared'}{traveler.travel_personality ? ` · ${traveler.travel_personality}` : ''}</div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{traveler.bio || 'Traveler profile'}</p>{traveler.interests?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{traveler.interests.slice(0, 4).map((interest) => <span key={interest} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{interest}</span>)}</div> : null}</div>
                          </article>
                        )) : <div className="rounded-2xl bg-slate-50 p-8 text-center"><div className="mb-2 text-3xl">🧭</div><div className="font-semibold text-slate-800">No public profiles available yet</div><p className="mt-1 text-sm text-slate-500">You can continue your trip plan and check again later.</p></div>}
                      </div>
                      <footer className="border-t border-slate-200 p-4 text-right"><button type="button" onClick={() => setShowTravelerPanel(false)} className="btn-primary px-5 py-2.5 text-sm">Back to my trip</button></footer>
                    </section>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
                  {publishError && <p role="alert" className="basis-full text-sm text-red-600">{publishError}</p>}
                  <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || publishing} className="btn-outline flex-1 disabled:cursor-not-allowed disabled:opacity-40">Back</button>
                  <button type="button" onClick={() => { window.localStorage.setItem(draftStorageKey, JSON.stringify({ draft, step })); setShowComposer(false); }} disabled={publishing} className="btn-outline flex-1 disabled:opacity-40">Save draft & exit</button>
                  <button type="button" disabled={publishing || coverUploading} onClick={async () => {
                    setPublishError('');
                    if (step < wizardSteps.length - 1) {
                      setStep((s) => s + 1);
                      return;
                    }

                    if (!draft.title.trim() || !draft.tripType || !(draft.destination.trim() || draft.city.trim())) {
                      setPublishError('Add a trip title, trip type, and destination before publishing.');
                      setStep(0);
                      return;
                    }
                    if (!draft.startDate || !draft.endDate || new Date(draft.endDate) < new Date(draft.startDate)) {
                      setPublishError('Choose valid trip dates. The end date must not be before the start date.');
                      setStep(1);
                      return;
                    }
                    if (draft.shortDescription.length > 180) {
                      setPublishError('Keep the trip description within 180 characters.');
                      setStep(0);
                      return;
                    }

                    setPublishing(true);
                    try {
                      const result = await createTrip({
                        title: draft.title.trim(),
                        shortDescription: draft.shortDescription.trim(),
                        destination: draft.destination.trim() || [draft.city, draft.state, draft.country].filter(Boolean).join(', '),
                        city: draft.city,
                        country: draft.country,
                        state: draft.state,
                        startDate: draft.startDate,
                        endDate: draft.endDate,
                        tripType: draft.tripType,
                        maxMembers: draft.maxMembers,
                        visibility: draft.visibility,
                        coverImage: draft.coverImage,
                        budgetAccommodation: draft.budgetAccommodation,
                        budgetTransport: draft.budgetTransport,
                        budgetFood: draft.budgetFood,
                        budgetActivities: draft.budgetActivities,
                        budgetOther: draft.budgetOther,
                        activities: draft.activities,
                        genderPreference: draft.genderPreference || 'Mixed',
                        smokingFriendly: draft.smokingFriendly,
                        drinkingFriendly: draft.drinkingFriendly,
                        foodPreference: draft.foodPreference,
                      });
                      if (result.error) {
                        setPublishError(result.error.message || 'Could not create the trip.');
                        return;
                      }
                      window.localStorage.removeItem(draftStorageKey);
                      setDraft(defaultDraft);
                      setStep(0);
                      setShowComposer(false);
                      navigate('/trips');
                    } catch (error) {
                      setPublishError(error instanceof Error ? error.message : 'Could not create the trip.');
                    } finally {
                      setPublishing(false);
                    }
                  }} className="btn-primary flex-1 justify-center disabled:opacity-50">
                    {publishing ? 'Publishing…' : step === wizardSteps.length - 1 ? 'Publish Trip' : 'Continue'}
                  </button>
                </div>
              </main>

              <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Live preview</div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{draft.visibility}</span>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  {coverPreview ? <img src={coverPreview} alt={draft.title ? `${draft.title} cover` : 'Trip cover preview'} className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-100 to-sky-100 text-4xl">🧭</div>}
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{draft.tripType}</span>
                      <div className="text-sm font-semibold text-slate-900">{draft.maxMembers} seats</div>
                    </div>
                    <h3 className="text-xl font-semibold tracking-[-0.04em] text-slate-900">{draft.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{draft.city}, {draft.country}</p>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span>{draft.startDate || 'Start date'}</span>
                      <span>{draft.endDate || 'End date'}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Budget</span>
                      <strong className="text-slate-900">{formatCurrency(expectedTotalBudget)}</strong>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.activities.slice(0, 3).map((activity) => (
                        <span key={activity} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{activity}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div id="trip-quick-actions" className="mt-5 rounded-[24px] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/60 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-slate-900">Quick actions</div><span className="text-xs text-slate-400">Trip tools</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={descriptionLoading} onClick={() => { setStep(0); void generateDescription(); }} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-left transition hover:border-emerald-300 disabled:opacity-50"><span className="block text-lg">✨</span><span className="mt-1 block text-xs font-semibold text-slate-800">AI trip copy</span></button>
                    <button type="button" onClick={() => { setShowComposer(true); setStep(8); }} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300"><span className="block text-lg">🧾</span><span className="mt-1 block text-xs font-semibold text-slate-800">Review plan</span></button>
                    <button type="button" onClick={() => void openTravelerPanel()} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300"><span className="block text-lg">👥</span><span className="mt-1 block text-xs font-semibold text-slate-800">Explore people</span></button>
                    <button type="button" onClick={() => { window.localStorage.setItem(draftStorageKey, JSON.stringify({ draft, step })); setPublishError('Draft saved on this device.'); }} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300"><span className="block text-lg">💾</span><span className="mt-1 block text-xs font-semibold text-slate-800">Save draft</span></button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
