import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchPublishedTrips, type PublicTrip } from '../lib/supabaseData';
import GoogleMap from '@/components/GoogleMap';

export default function MapPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; void fetchPublishedTrips().then((results) => { if (active) { setTrips(results); setLoading(false); } }); return () => { active = false; }; }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-8"><div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="tag mb-2">Trip destinations</p><h1 className="mb-2 text-3xl font-bold">Explore destinations</h1><p className="mb-6 text-sm text-slate-600">Map markers are based on real published trip destinations. Live locations are only shared from a trip group by members who opt in.</p>
      <div className="mb-6"><GoogleMap markers={trips.map((trip) => ({ id: trip.id, label: `${trip.title} · ${trip.destination}`, place: trip.destination }))} className="h-[480px]" /></div>
      <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Published trip destinations</h2><button className="text-sm font-semibold text-emerald-700" onClick={() => navigate('/trips')}>View all trips →</button></div>
        {loading ? <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Loading destinations…</div> : !trips.length ? <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">No public trip destinations yet.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{trips.map((trip) => <button key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{trip.trip_type || 'Trip'}</span><h3 className="mt-2 font-bold">{trip.title}</h3><p className="mt-1 text-sm text-slate-500">📍 {trip.destination}</p></button>)}</div>}
      </section>
    </div></div>
  );
}
