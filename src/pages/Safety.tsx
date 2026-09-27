import { useEffect, useState } from 'react';
import { useCurrentUser } from '../lib/auth';
import { fetchMyTrips } from '../lib/supabaseData';

export default function Safety() {
  const user = useCurrentUser();
  const [trips, setTrips] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [locationSharing, setLocationSharing] = useState(false);
  useEffect(() => { let active = true; void fetchMyTrips().then((rows) => { if (active) setTrips(rows.map(({ id, name, date }) => ({ id, name, date }))); }); return () => { active = false; }; }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-8"><div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="mb-2 text-3xl font-bold">Safety Center</h1><p className="mb-8 text-slate-600">Manage your safety information and find emergency resources.</p>
      <section className="mb-5 rounded-3xl border border-red-100 bg-white p-6 text-center"><div className="mb-2 text-4xl">🆘</div><h2 className="text-lg font-bold">Emergency services</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-600">TripMates does not dispatch emergency services or share your live location. If you need urgent help in India, call 112 directly.</p><a href="tel:112" className="mt-5 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white">Call 112</a></section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-bold">Account details</h2><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">Email</span><span className="text-right">{user?.email || 'Not available'}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Phone verification</span><span className="text-right text-slate-500">Not configured</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Identity verification</span><span className="text-right text-slate-500">Not configured</span></div></div></section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">Location sharing</h2><p className="mt-1 text-xs text-slate-500">Live location sharing is not connected yet; this switch does not transmit your location.</p></div><button aria-pressed={locationSharing} onClick={() => setLocationSharing((value) => !value)} className={`relative h-7 w-12 rounded-full ${locationSharing ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${locationSharing ? 'left-6' : 'left-1'}`} /></button></div></section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-3 font-bold">Emergency contacts</h2><p className="text-sm text-slate-500">No emergency contacts have been saved. Emergency contact management is not connected yet.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-3 font-bold">Your trips</h2>{trips.length ? <ul className="space-y-3">{trips.map((trip) => <li key={trip.id} className="flex justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-medium">{trip.name}</span><span className="text-slate-500">{trip.date}</span></li>)}</ul> : <p className="text-sm text-slate-500">No joined trips to show.</p>}</section>
    </div></div>
  );
}
