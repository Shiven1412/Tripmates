import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { fetchFriendshipStates, fetchTravelers, fetchTripsCreatedBy, respondToIncomingFriendRequest, sendFriendRequest, type FriendshipState, type PublicTraveler, type PublicTrip } from '../lib/supabaseData';

export default function TripMatesDirectory() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [travelers, setTravelers] = useState<PublicTraveler[]>([]);
  const [friendships, setFriendships] = useState<Record<string, FriendshipState>>({});
  const [profileTrips, setProfileTrips] = useState<PublicTrip[]>([]);
  const [selected, setSelected] = useState<PublicTraveler | null>(null);
  const profileCardRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!currentUser) { setLoading(false); return; }
      const people = (await fetchTravelers()).filter((person) => person.id !== currentUser.id);
      const [states, ownTrips] = await Promise.all([
        fetchFriendshipStates(people.map((person) => person.id)),
        fetchTripsCreatedBy(currentUser.id),
      ]);
      if (!active) return;
      setTravelers(people);
      setFriendships(states);
      setProfileTrips(ownTrips);
      setSelected((existing) => people.find((person) => person.id === existing?.id) ?? null);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    const dismissOnOutsideClick = (event: MouseEvent) => {
      if (profileCardRef.current && !profileCardRef.current.contains(event.target as Node)) setSelected(null);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    document.addEventListener('mousedown', dismissOnOutsideClick);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('mousedown', dismissOnOutsideClick);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selected) { setProfileTrips([]); return; }
    void fetchTripsCreatedBy(selected.id).then((trips) => { if (active) setProfileTrips(trips); });
    return () => { active = false; };
  }, [selected?.id]);

  const filtered = travelers.filter((person) => `${person.full_name} ${person.city ?? ''} ${person.travel_personality ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const actOnRequest = async (person: PublicTraveler, accept: boolean) => {
    setBusy(true);
    const state = friendships[person.id];
    const result = state === 'RECEIVED'
      ? await respondToIncomingFriendRequest(person.id, accept)
      : await sendFriendRequest(person.id);
    setBusy(false);
    if (result.error) { window.alert(result.error.message || 'Could not update friend request.'); return; }
    setFriendships((previous) => ({ ...previous, [person.id]: state === 'RECEIVED' ? (accept ? 'FRIENDS' : 'NONE') : 'SENT' }));
  };

  const photo = (person: PublicTraveler, size = 'h-14 w-14') => person.avatar_url
    ? <img src={person.avatar_url} alt={person.full_name} className={`${size} rounded-full object-cover`} />
    : <div className={`${size} flex items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800`}>{person.full_name.charAt(0).toUpperCase()}</div>;

  const travelerMeta = (person: PublicTraveler) => {
    const meta = [
      person.age ? `${person.age}y` : 'Age n/a',
      person.city || 'City n/a',
      person.travel_personality || 'Traveler',
    ];
    return meta;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="tag mb-2">Meet the community</p><h1 className="text-3xl font-bold">TripMates</h1><p className="mt-2 text-sm text-slate-600">Explore traveler profiles, their public trips, and connect before you travel.</p></div>
          <button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate('/messages')}>💬 Messages</button>
        </div>
        <div className="mb-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search travelers by name, city, or travel style" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 md:max-w-lg" /></div>
        {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading TripMates…</div> : !filtered.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="text-xl font-bold">No travelers found</h2><p className="mt-2 text-sm text-slate-500">Try another search or check back when more people join.</p></div> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((person) => {
              const state = friendships[person.id] ?? 'NONE';
              const tagList = travelerMeta(person);
              return <button key={person.id} aria-pressed={selected?.id === person.id} onClick={() => setSelected((current) => current?.id === person.id ? null : person)} className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === person.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3">{photo(person)}<div className="min-w-0"><div className="truncate font-bold">{person.full_name || 'TripMate'}</div><div className="truncate text-sm text-slate-500">{person.city || 'City not set'}</div></div></div>
                <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{person.travel_personality || 'Traveler'}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{person.age ? `${person.age} years` : 'Age not set'}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">{tagList.map((meta) => <span key={meta} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{meta}</span>)}</div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{person.bio || 'No bio added yet.'}</p>
                <div className="mt-4 text-xs font-semibold text-emerald-700">{state === 'FRIENDS' ? '✓ Friend' : state === 'SENT' ? 'Request sent' : state === 'RECEIVED' ? 'Accept request' : 'View profile →'}</div>
              </button>;
            })}</div>

            <aside ref={profileCardRef} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 lg:sticky lg:top-20">
              {selected ? <>
                {selected.avatar_url ? <img src={selected.avatar_url} alt={`${selected.full_name}'s profile`} className="mb-5 h-64 w-full rounded-2xl bg-slate-100 object-cover object-center" /> : <div className="mb-5 flex h-48 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 text-7xl font-bold text-emerald-800">{selected.full_name.charAt(0).toUpperCase()}</div>}
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3">{photo(selected, 'h-12 w-12')}<div><h2 className="text-xl font-bold">{selected.full_name || 'TripMate'}</h2><p className="text-sm text-slate-500">{selected.travel_personality || 'Traveler'}</p></div></div><button type="button" onClick={() => setSelected(null)} aria-label="Close traveler profile" className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">×</button></div>
                <div className="mt-3 flex flex-wrap gap-2">{selected.age && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{selected.age} years</span>}{selected.city && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{selected.city}</span>}{selected.travel_personality && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">{selected.travel_personality}</span>}<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">✓ Verified</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Veg</div><div className="mt-1 font-semibold">No</div></div><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Non-veg</div><div className="mt-1 font-semibold">Yes</div></div><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Smoking</div><div className="mt-1 font-semibold">No</div></div><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Drinking</div><div className="mt-1 font-semibold">Social</div></div><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Party</div><div className="mt-1 font-semibold">Occasional</div></div><div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Sleep</div><div className="mt-1 font-semibold">Flexible</div></div></div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{selected.bio || 'This traveler has not added a profile summary yet.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">{(selected.interests ?? []).map((interest) => <span key={interest} className="tag text-xs">{interest}</span>)}</div>
                <div className="mt-6 flex items-center justify-between"><h3 className="font-bold">Public trips</h3><span className="text-xs text-slate-500">{profileTrips.length} created</span></div>
                <div className="mt-3 space-y-2">{profileTrips.length ? profileTrips.map((trip) => <button key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-300"><div className="font-semibold text-sm">{trip.title}</div><div className="mt-1 text-xs text-slate-500">{trip.destination} · {trip.start_date || 'Flexible dates'}</div></button>) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No public trips created yet.</p>}</div>
                <div className="mt-5">{friendships[selected.id] === 'FRIENDS' ? <button className="btn-primary w-full justify-center py-3" onClick={() => navigate(`/messages?user=${selected.id}`)}>Message friend</button> : friendships[selected.id] === 'RECEIVED' ? <div className="flex gap-2"><button disabled={busy} className="btn-primary flex-1 justify-center py-3 disabled:opacity-50" onClick={() => void actOnRequest(selected, true)}>Accept request</button><button disabled={busy} className="btn-outline flex-1 py-3 disabled:opacity-50" onClick={() => void actOnRequest(selected, false)}>Decline</button></div> : <button disabled={busy || friendships[selected.id] === 'SENT'} className="btn-primary w-full justify-center py-3 disabled:opacity-50" onClick={() => void actOnRequest(selected, true)}>{friendships[selected.id] === 'SENT' ? 'Friend request sent' : busy ? 'Sending…' : 'Send friend request'}</button>}</div>
              </> : <div className="py-10 text-center text-sm text-slate-500">Choose a TripMate card to view their profile.</div>}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
