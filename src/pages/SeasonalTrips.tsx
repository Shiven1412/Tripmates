import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { getLiveWeatherInsight, getTravelSuggestion } from '../lib/aiService';
import type { LiveWeatherInsight } from '../lib/aiService';

type SeasonalIdea = {
  season: string;
  destination: string;
  image: string;
  activities: string[];
  advice: Awaited<ReturnType<typeof getTravelSuggestion>>;
};

const ideas = [
  { season: 'Summer', destination: 'Leh, Ladakh', image: 'https://images.unsplash.com/photo-1566323124620-d22adb71d2a2?w=1200&h=800&fit=crop&auto=format', activities: ['Trekking', 'Photography', 'Road Trips'] },
  { season: 'Winter', destination: 'Jaipur, India', image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1200&h=800&fit=crop&auto=format', activities: ['Culture', 'Food Tours', 'Sightseeing'] },
  { season: 'Monsoon', destination: 'Munnar, India', image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&h=800&fit=crop&auto=format', activities: ['Nature', 'Photography', 'Slow Travel'] },
  { season: 'Spring', destination: 'Kyoto, Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=800&fit=crop&auto=format', activities: ['Culture', 'Walking', 'Food Tours'] },
];

function getCurrentSeason(date = new Date()) {
  const month = date.getMonth();
  if ([2, 3, 4].includes(month)) return 'Spring';
  if ([5, 6, 7].includes(month)) return 'Summer';
  if ([8, 9, 10].includes(month)) return 'Monsoon';
  return 'Winter';
}

export default function SeasonalTrips() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<SeasonalIdea[]>([]);
  const [active, setActive] = useState(0);
  const [weather, setWeather] = useState<LiveWeatherInsight | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentSeason = useMemo(() => getCurrentSeason(), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const generated = await Promise.all(ideas.map(async (idea) => {
        const advice = await getTravelSuggestion({ destination: idea.destination, interests: user?.interests ?? idea.activities, budget: user?.budget ?? 'moderate', city: user?.city, travelStyle: user?.travelPersonality, season: idea.season });
        return { ...idea, advice };
      }));
      if (!alive) return;
      setRecommendations(generated);
      const suggestedIndex = generated.findIndex((idea) => idea.season === currentSeason);
      setActive(suggestedIndex >= 0 ? suggestedIndex : 0);
      setLoading(false);
    };
    void load().catch((loadError) => {
      if (!alive) return;
      setError(loadError instanceof Error ? loadError.message : 'Seasonal recommendations are unavailable.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [user, currentSeason]);

  useEffect(() => {
    const destination = recommendations[active]?.destination;
    if (!destination) return;
    let alive = true;
    setWeatherLoading(true);
    void getLiveWeatherInsight(destination).then((result) => { if (alive) setWeather(result); }).catch(() => { if (alive) setWeather(null); }).finally(() => { if (alive) setWeatherLoading(false); });
    return () => { alive = false; };
  }, [active, recommendations]);

  const selected = recommendations[active];
  const move = (direction: -1 | 1) => setActive((index) => (index + direction + Math.max(recommendations.length, 1)) % Math.max(recommendations.length, 1));

  return (
    <main className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><span className="tag">AI seasonal discovery</span><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Find your season to go</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Destination ideas use your saved interests and budget. Weather is live at the destination right now; seasonal advice is an AI-generated planning guide.</p></div><span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">Right now: {currentSeason}</span></header>
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {loading ? <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><div className="h-[420px] animate-pulse rounded-3xl bg-slate-200"/><div className="h-[420px] animate-pulse rounded-3xl bg-slate-200"/></div> : selected ? <div className="grid items-stretch gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative min-h-[390px] overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-xl md:min-h-[500px]"><img src={selected.image} alt={selected.destination} className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent"/><div className="absolute inset-x-0 top-0 flex items-center justify-between p-5"><span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur">{selected.season} escape {selected.season === currentSeason ? '· best match now' : ''}</span><div className="flex gap-2"><button type="button" onClick={() => move(-1)} aria-label="Previous seasonal destination" className="h-10 w-10 rounded-full border border-white/30 bg-black/20 text-lg backdrop-blur hover:bg-black/40">‹</button><button type="button" onClick={() => move(1)} aria-label="Next seasonal destination" className="h-10 w-10 rounded-full border border-white/30 bg-black/20 text-lg backdrop-blur hover:bg-black/40">›</button></div></div><div className="absolute inset-x-0 bottom-0 p-6 md:p-9"><div className="mb-3 flex flex-wrap gap-2">{selected.activities.map((activity) => <span key={activity} className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">{activity}</span>)}</div><h2 className="text-3xl font-bold md:text-5xl">{selected.advice.destination}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">{selected.advice.reason}</p><div className="mt-5 flex flex-wrap items-center gap-4"><div><div className="text-xs text-white/60">Suggested budget</div><div className="font-bold">{selected.advice.budget}</div></div><div className="h-9 w-px bg-white/20"/><div><div className="text-xs text-white/60">Suggested duration</div><div className="font-bold">{selected.advice.duration}</div></div><button type="button" onClick={() => navigate('/create-trip')} className="ml-auto rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-400">Plan this trip →</button></div></div></section>
          <aside className="flex flex-col gap-5"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live weather</div><h3 className="mt-1 text-lg font-bold text-slate-900">{weather?.location || selected.destination}</h3></div><div className="text-right"><div className="text-3xl font-bold text-slate-900">{weather ? `${Math.round(weather.temperatureC)}°` : '—'}</div><div className="text-xs text-slate-500">{weather?.condition || (weatherLoading ? 'Loading forecast…' : 'Live data unavailable')}</div></div></div>{weather?.forecast && <div className="mt-4 grid grid-cols-3 gap-2">{weather.forecast.map((day) => <div key={day.date} className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-[11px] text-slate-500">{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</div><div className="mt-1 text-sm font-semibold text-slate-800">{Math.round(day.maxC)}° / {Math.round(day.minC)}°</div><div className="mt-1 text-[10px] text-slate-500">{day.precipitationMm}mm rain</div></div>)}</div>}<p className="mt-3 text-xs leading-relaxed text-slate-500">{weather?.seasonal.weatherSummary || 'Live weather data is temporarily unavailable. Check a local forecast before you travel.'}</p></section>
            <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI seasonal guide</div><h3 className="mt-1 text-lg font-bold text-slate-900">Best time: {selected.advice.bestMonth}</h3><div className="mt-4"><div className="mb-2 text-xs font-semibold text-slate-600">Try these experiences</div><div className="flex flex-wrap gap-2">{selected.advice.activities.map((activity) => <span key={activity} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">{activity}</span>)}</div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="mb-2 text-xs font-semibold text-slate-600">Weather idea</div><p className="text-sm leading-relaxed text-slate-600">{selected.advice.weather}</p></div><p className="mt-4 text-[11px] text-slate-400">AI recommendations are starting points, not booking or safety guarantees. Confirm details with official local sources.</p></section></aside>
        </div> : <div className="rounded-3xl bg-white p-8 text-center text-slate-600">No seasonal recommendations available right now.</div>}
        {!loading && recommendations.length > 0 && <div className="mt-6 flex items-center justify-center gap-2">{recommendations.map((idea, index) => <button type="button" key={idea.season} onClick={() => setActive(index)} aria-label={`Show ${idea.season} trip`} className={`h-2.5 rounded-full transition-all ${active === index ? 'w-8 bg-emerald-600' : 'w-2.5 bg-slate-300'}`} />)}</div>}
        {!loading && recommendations.length > 0 && <section className="mt-10"><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Explore every season</h2><p className="mt-1 text-sm text-slate-500">Swipe or select a season to see its personalized destination guide.</p></div><div className="flex snap-x gap-4 overflow-x-auto pb-3">{recommendations.map((idea, index) => <button type="button" key={idea.season} onClick={() => setActive(index)} className={`group min-w-[220px] snap-start overflow-hidden rounded-2xl border text-left transition md:min-w-[260px] ${active === index ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}><div className="relative h-32"><img src={idea.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{idea.season}</span></div><div className="p-3"><div className="font-semibold text-slate-900">{idea.advice.destination}</div><div className="mt-1 text-xs text-slate-500">Best: {idea.advice.bestMonth} · {idea.advice.budget}</div></div></button>)}</div></section>}
      </div>
    </main>
  );
}
