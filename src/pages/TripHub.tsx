import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchPublishedTrips, fetchTripMembershipStatuses, requestToJoinTrip, type PublicTrip } from '../lib/supabaseData';

const tripDate = (trip: PublicTrip) => {
  if (!trip.start_date) return 'Flexible dates';
  const format = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  return trip.end_date ? `${format(trip.start_date)} – ${format(trip.end_date)}` : format(trip.start_date);
};
const totalBudget = (trip: PublicTrip) => Number(trip.budget_accommodation ?? 0) + Number(trip.budget_transport ?? 0) + Number(trip.budget_food ?? 0) + Number(trip.budget_activities ?? 0) + Number(trip.budget_other ?? 0);
const money = (amount: number) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : 'Budget not set';

export default function TripHub() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [membership, setMembership] = useState<Record<string, 'APPROVED' | 'PENDING'>>({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchPublishedTrips(), fetchTripMembershipStatuses()]).then(([published, states]) => {
      if (!active) return;
      setTrips(published);
      setMembership(states);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const requestJoin = async (trip: PublicTrip) => {
    setRequesting(trip.id);
    const result = await requestToJoinTrip(trip.id);
    setRequesting('');
    if (!result.success) { window.alert(result.error?.message || 'Could not send your request.'); return; }
    setMembership((previous) => ({ ...previous, [trip.id]: 'PENDING' }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8"><div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="tag mb-2">Trip groups</p><h1 className="text-3xl font-bold">Published trips</h1><p className="mt-2 text-sm text-slate-600">Open a joined group card to reach its chat, expenses, files, location, itinerary, and members.</p></div><div className="flex flex-wrap gap-2"><button className="btn-outline px-4 py-3 text-sm" onClick={() => navigate('/trip-requests')}>📨 Join requests</button><button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate('/create-trip')}>+ Create a trip</button></div></div>
      {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading published trips…</div> : !trips.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="mb-3 text-4xl">🧭</div><h2 className="text-xl font-bold">No public trips have been published yet</h2><p className="mt-2 text-sm text-slate-500">Trips appear when their status is OPEN and visibility is PUBLIC.</p><button className="btn-outline mt-5 px-5 py-3 text-sm" onClick={() => window.location.reload()}>Refresh trips</button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{trips.map((trip) => {
        const status = membership[trip.id];
        const budget = totalBudget(trip);
        return <article key={trip.id} role={status === 'APPROVED' ? 'button' : undefined} tabIndex={status === 'APPROVED' ? 0 : undefined} onClick={() => { if (status === 'APPROVED') navigate(`/trips/${trip.id}`); }} onKeyDown={(event) => { if (status === 'APPROVED' && (event.key === 'Enter' || event.key === ' ')) navigate(`/trips/${trip.id}`); }} className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${status === 'APPROVED' ? 'cursor-pointer transition hover:shadow-md' : ''}`}>
          {trip.cover_image ? <img src={trip.cover_image} alt="" className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-emerald-100 to-sky-100 text-5xl">✈️</div>}
          <div className="p-5"><div className="mb-2 flex items-start justify-between gap-2"><h2 className="text-lg font-bold">{trip.title}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{trip.trip_type || 'Trip'}</span></div><p className="text-sm text-slate-600">📍 {trip.destination}</p><p className="mt-1 text-sm text-slate-500">📅 {tripDate(trip)}</p>{trip.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{trip.description}</p>}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="truncate text-slate-500">Hosted by {trip.creator_name}</span><span className="shrink-0 text-slate-600">👥 {trip.member_count}/{trip.max_members ?? 8}</span></div>
            <div className="mt-3 flex items-center justify-between gap-2"><span className="font-semibold">{money(budget)} <span className="text-xs font-normal text-slate-500">per traveler</span></span>{status === 'APPROVED' ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Open group chat →</span> : status === 'PENDING' ? <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Request pending</span> : <button disabled={requesting === trip.id} className="btn-primary px-3 py-2 text-xs disabled:opacity-50" onClick={(event) => { event.stopPropagation(); void requestJoin(trip); }}>{requesting === trip.id ? 'Sending…' : 'Request to join'}</button>}</div>
          </div>
        </article>;
      })}</div>}
    </div></div>
  );
}
