import { useEffect, useState } from 'react';
import { respondToTripJoinRequest, fetchTripJoinRequests, type TripJoinRequest } from '../lib/supabaseData';

export default function TripRequests() {
  const [requests, setRequests] = useState<TripJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setRequests(await fetchTripJoinRequests());
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const respond = async (request: TripJoinRequest, accept: boolean) => {
    const key = `${request.tripId}:${request.requesterId}`;
    setBusyKey(key);
    setError('');
    const result = await respondToTripJoinRequest(request.tripId, request.requesterId, accept);
    setBusyKey('');
    if (result.error) { setError(result.error.message); return; }
    setRequests((current) => current.filter((item) => item.tripId !== request.tripId || item.requesterId !== request.requesterId));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="tag mb-2">Trip owner tools</p><h1 className="text-3xl font-bold">Join requests</h1><p className="mt-2 text-sm text-slate-600">Review travelers who have requested to join your trip groups.</p></div>
          <button className="btn-outline px-4 py-2 text-sm" onClick={() => void load()}>Refresh</button>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading join requests…</div> : !requests.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="mb-3 text-4xl">📨</div><h2 className="text-xl font-bold">No pending requests</h2><p className="mt-2 text-sm text-slate-500">Requests for trips you created will appear here.</p></div>
        ) : <div className="space-y-4">{requests.map((request) => {
          const key = `${request.tripId}:${request.requesterId}`;
          return <article key={key} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
            {request.requesterAvatar ? <img src={request.requesterAvatar} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">{request.requesterName.charAt(0)}</div>}
            <div className="min-w-0 flex-1"><h2 className="font-bold">{request.requesterName}</h2><p className="text-sm text-slate-500">{request.requesterCity || 'City not set'} · wants to join <span className="font-medium text-slate-700">{request.tripTitle}</span></p><time className="mt-1 block text-xs text-slate-400">Requested {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.requestedAt))}</time></div>
            <div className="flex gap-2"><button disabled={busyKey === key} className="btn-primary px-4 py-2 text-sm disabled:opacity-50" onClick={() => void respond(request, true)}>{busyKey === key ? 'Saving…' : 'Accept'}</button><button disabled={busyKey === key} className="btn-outline px-4 py-2 text-sm disabled:opacity-50" onClick={() => void respond(request, false)}>Decline</button></div>
          </article>;
        })}</div>}
      </div>
    </div>
  );
}