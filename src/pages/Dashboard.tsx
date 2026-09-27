import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { fetchMyTrips, fetchPublishedTrips, fetchTravelers, fetchTripsCreatedBy, type PublicTraveler, type PublicTrip } from '../lib/supabaseData';
import { getTripCoverImage } from '../lib/tripImages';

const formatDate = (start: string | null, end: string | null) => {
  if (!start) return 'Flexible dates';
  const display = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  return end ? `${display(start)} – ${display(end)}` : display(start);
};
const totalBudget = (trip: PublicTrip) => Number(trip.budget_accommodation ?? 0) + Number(trip.budget_transport ?? 0) + Number(trip.budget_food ?? 0) + Number(trip.budget_activities ?? 0) + Number(trip.budget_other ?? 0);
const money = (amount: number) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : 'Budget not set';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [joinedTrips, setJoinedTrips] = useState<Array<{ id: string; name: string; place: string; date: string; banner: string }>>([]);
  const [publishedTrips, setPublishedTrips] = useState<PublicTrip[]>([]);
  const [travelers, setTravelers] = useState<PublicTraveler[]>([]);
  const [createdTripCount, setCreatedTripCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [joined, published, people, mine] = await Promise.all([
        fetchMyTrips(), fetchPublishedTrips(), fetchTravelers(), currentUser ? fetchTripsCreatedBy(currentUser.id) : Promise.resolve([]),
      ]);
      if (!active) return;
      setJoinedTrips(joined);
      setPublishedTrips(published);
      setTravelers(people.filter((person) => person.id !== currentUser?.id).slice(0, 3));
      setCreatedTripCount(mine.length);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [currentUser]);

  const nextTrip = joinedTrips[0];
  const recommendations = publishedTrips;
  const stats = [
    { label: 'Trips joined', value: String(joinedTrips.length), icon: '✈️', color: '#3B82F6' },
    { label: 'Trips created', value: String(createdTripCount), icon: '🧭', color: '#10B981' },
    { label: 'Travel interests', value: String(currentUser?.interests?.length ?? 0), icon: '🌿', color: '#8B5CF6' },
    { label: 'Travelers', value: String(travelers.length), icon: '🤝', color: '#F59E0B' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8"><div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="dashboard-welcome relative mb-7 overflow-hidden rounded-[32px] bg-slate-950 px-6 py-9 shadow-xl md:px-10 md:py-12"><img src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1800&h=850&fit=crop&auto=format" alt="Mountain lake travel landscape" className="absolute inset-0 h-full w-full object-cover opacity-65"/><div className="dashboard-welcome-overlay absolute inset-0"/><div className="relative z-10 max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">✦ YOUR NEXT CHAPTER STARTS HERE</span><h1 className="dashboard-welcome-title mt-4 text-3xl font-bold tracking-tight md:text-5xl">Welcome back, {currentUser?.fullName?.split(' ')[0] || 'traveler'}.</h1><p className="dashboard-welcome-copy mt-3 max-w-xl text-sm leading-relaxed md:text-base">Your people, your plans, and a whole world of shared adventures—ready when you are.</p><div className="mt-6 flex flex-wrap gap-3"><button className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300" onClick={() => navigate('/discover')}>Find your next trip →</button><button className="rounded-full border border-white/50 bg-slate-950/35 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-slate-950/60" onClick={() => navigate('/ai-assistant')}>✦ Ask TripMates AI</button></div></div></section>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map((stat, index) => <div key={stat.label} className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${index === 0 ? 'md:rounded-l-[26px]' : ''}`}><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{stat.label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: `${stat.color}18` }}>{stat.icon}</span></div><div className="text-3xl font-bold" style={{ color: stat.color }}>{loading ? '—' : stat.value}</div><div className="mt-2 h-1 w-12 rounded-full" style={{ background: stat.color }}/></div>)}</div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {nextTrip ? <div className="grid sm:grid-cols-[220px_1fr]"><img src={nextTrip.banner || getTripCoverImage(nextTrip.place)} alt={nextTrip.name} className="h-48 w-full object-cover sm:h-full"/><div className="p-6"><span className="tag text-xs">Your next trip</span><h2 className="mt-2 text-xl font-bold">{nextTrip.name}</h2><p className="mt-1 text-sm text-slate-500">{nextTrip.place} · {nextTrip.date}</p><button className="btn-primary mt-4 px-5 py-2 text-sm" onClick={() => navigate('/trips')}>Open trip groups →</button></div></div> : <div className="p-8"><div className="mb-3 text-3xl">🧭</div><h2 className="text-xl font-bold">No joined trips yet</h2><p className="mt-2 text-sm text-slate-500">Browse published groups and request to join your next adventure.</p><button className="btn-primary mt-4 px-5 py-2 text-sm" onClick={() => navigate('/trips')}>Explore trips</button></div>}
          </section>
          <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Published trips to explore</h2><button className="text-sm font-semibold text-emerald-700" onClick={() => navigate('/trips')}>See all →</button></div>
            {loading ? <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Loading trips…</div> : !recommendations.length ? <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">No public trips yet. Publish trips with status OPEN and visibility PUBLIC to list them here.<button className="ml-2 font-semibold text-emerald-700" onClick={() => window.location.reload()}>Refresh</button></div> : <div className="grid gap-4 sm:grid-cols-2">{recommendations.map((trip) => <article key={trip.id} onClick={() => navigate('/discover')} className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative h-36 overflow-hidden"><img src={trip.cover_image || getTripCoverImage(trip.destination, trip.trip_type)} alt={`${trip.destination} trip`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800">{trip.trip_type || 'Trip'}</span></div><div className="p-4"><h3 className="font-bold">{trip.title}</h3><p className="mt-1 text-sm text-slate-500">📍 {trip.destination}</p><p className="mt-2 text-xs text-slate-500">{formatDate(trip.start_date, trip.end_date)} · {trip.member_count}/{trip.max_members ?? 8} travelers</p><div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold">{money(totalBudget(trip))}</span><span className="text-xs font-semibold text-emerald-700">Discover →</span></div></div></article>)}</div>}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-sm font-bold">Your travel profile</h2><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">🧭</div><div><div className="font-semibold">{currentUser?.travelPersonality || 'Travel style not set'}</div><div className="text-xs text-slate-500">{currentUser?.city || 'City not set'}</div></div></div><button className="mt-4 text-xs font-semibold text-emerald-700" onClick={() => navigate('/profile')}>Complete your profile →</button></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">TripMates</h2><button className="text-xs font-semibold text-emerald-700" onClick={() => navigate('/tripmates')}>See all →</button></div>{travelers.length ? <div className="space-y-4">{travelers.map((person: PublicTraveler) => <button key={person.id} onClick={() => navigate('/tripmates')} className="flex w-full items-center gap-3 text-left">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{person.full_name.charAt(0)}</div>}<span className="min-w-0"><span className="block truncate text-sm font-semibold">{person.full_name}</span><span className="block truncate text-xs text-slate-500">{person.city || 'City not set'} · {person.travel_personality || 'Traveler'}</span></span></button>)}</div> : <p className="text-sm text-slate-500">Other public travelers will appear here.</p>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-sm font-bold">Quick actions</h2><div className="grid grid-cols-2 gap-2">{[
            { label: 'Create trip', icon: '✈️', to: '/create-trip' }, { label: 'Find people', icon: '👥', to: '/tripmates' }, { label: 'AI assistant', icon: '✨', to: '/ai-assistant' }, { label: 'Get verified', icon: '✅', to: '/verification' }, { label: 'Messages', icon: '💬', to: '/messages' }, { label: 'Community', icon: '🌍', to: '/community' },
          ].map((action) => <button key={action.label} className="rounded-xl p-3 text-center text-xs font-medium hover:bg-slate-50" onClick={() => navigate(action.to)}><span className="mb-1 block text-xl">{action.icon}</span>{action.label}</button>)}</div></section>
        </aside>
      </div>
    </div></div>
  );
}
