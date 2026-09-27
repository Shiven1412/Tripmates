import { useEffect, useState } from 'react';
import { useCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { calculateCompatibility } from '../lib/travelLogic';

type Person = {
  id: string;
  name: string;
  city: string;
  personality: string;
  compatibility: number | null;
  img?: string;
  interests: string[];
  bio: string;
};

export default function DiscoverPeople() {
  const currentUser = useCurrentUser();
  const [people, setPeople] = useState<Person[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>('grid');
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadProfiles = async () => {
      if (!supabase || !currentUser) {
        if (active) { setPeople([]); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, full_name, city, travel_personality, interests, budget, lifestyle, bio, avatar_url')
        .neq('id', currentUser.id);
      if (error) {
        console.error('Could not load traveler profiles', error);
        if (active) { setPeople([]); setLoading(false); }
        return;
      }
      const viewer = {
        budget: currentUser.budget,
        travelStyle: currentUser.travelPersonality,
        lifestyle: currentUser.lifestyle,
        interests: currentUser.interests,
      };
      const nextPeople = (data ?? []).map((profile) => {
        const interests = profile.interests ?? [];
        return {
          id: profile.id,
          name: profile.full_name || 'TripMate',
          city: profile.city || 'Location not set',
          personality: profile.travel_personality || 'Travel style not set',
          compatibility: calculateCompatibility(viewer, {
            budget: profile.budget,
            travelStyle: profile.travel_personality,
            lifestyle: profile.lifestyle,
            interests,
          }),
          img: profile.avatar_url || undefined,
          interests,
          bio: profile.bio || 'This traveler has not added a bio yet.',
        };
      }).sort((a, b) => (b.compatibility ?? -1) - (a.compatibility ?? -1));
      if (active) { setPeople(nextPeople); setLoading(false); }
    };
    void loadProfiles();
    return () => { active = false; };
  }, [currentUser]);

  const person = people[currentIdx % Math.max(people.length, 1)];
  const handleConnect = (id: string) => setConnected((previous) => new Set([...previous, id]));
  const changePerson = () => setCurrentIdx((index) => (index + 1) % Math.max(people.length, 1));
  const photo = (profile: Person, className: string) => profile.img
    ? <img src={profile.img} alt={profile.name} className={className} />
    : <div className={`${className} flex items-center justify-center bg-emerald-100 text-4xl font-bold text-emerald-800`}>{profile.name.charAt(0).toUpperCase()}</div>;

  return (
    <div className="landing-shell pt-16 pb-24 md:pb-8 min-h-screen" style={{ background: '#FAFAFA' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: '-0.02em' }}>People You Should Travel With</h1>
            <p style={{ color: '#6B7280' }}>Chemistry is calculated from profile preferences saved in your database.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={viewMode === 'grid' ? { background: '#111111', color: 'white' } : { background: 'white', border: '1px solid #E5E7EB' }} onClick={() => setViewMode('grid')}>⊞ Grid</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={viewMode === 'swipe' ? { background: '#111111', color: 'white' } : { background: 'white', border: '1px solid #E5E7EB' }} onClick={() => setViewMode('swipe')}>❤️ Match</button>
          </div>
        </div>

        {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-600">Loading traveler profiles…</div> : !people.length ? (
          <div className="rounded-2xl border bg-white p-10 text-center">
            <h2 className="mb-2 text-xl font-bold">No public traveler profiles yet</h2>
            <p className="text-sm text-slate-600">Once other travelers complete their profiles, they will appear here with preference-based chemistry scores.</p>
          </div>
        ) : viewMode === 'swipe' && person ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm">
              <div className="relative overflow-hidden rounded-3xl border bg-white shadow-xl" style={{ borderColor: '#F3F4F6' }}>
                <div className="relative">
                  {photo(person, 'h-96 w-full object-cover')}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold">{person.name}</h3>
                    <p className="text-sm text-white/80">{person.city} · {person.personality}</p>
                  </div>
                  <div className="absolute bottom-4 right-4 rounded-xl bg-white/90 px-3 py-1.5 text-center">
                    <div className="text-lg font-bold text-emerald-600">{person.compatibility === null ? '—' : `${person.compatibility}%`}</div><div className="text-[10px] text-gray-600">{person.compatibility === null ? 'add preferences' : 'match'}</div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-4 text-sm leading-relaxed text-gray-700">{person.bio}</p>
                  <div className="mb-4 flex flex-wrap gap-2">{person.interests.map((interest) => <span key={interest} className="tag text-xs">{interest}</span>)}</div>
                  <button className="btn-primary w-full justify-center py-3" onClick={() => handleConnect(person.id)}>{connected.has(person.id) ? '✓ Connection requested' : 'Connect'}</button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-4"><button className="h-12 w-12 rounded-full border bg-white text-xl" onClick={changePerson} aria-label="Skip traveler">×</button><button className="h-12 w-12 rounded-full bg-emerald-600 text-xl text-white" onClick={() => { handleConnect(person.id); changePerson(); }} aria-label="Connect with traveler">♥</button></div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((candidate) => (
              <div key={candidate.id} className="card-hover overflow-hidden rounded-3xl border bg-white" style={{ borderColor: '#F3F4F6' }}>
                <div className="relative">
                  {photo(candidate, 'h-56 w-full object-cover')}
                  <div className="absolute bottom-3 left-3 text-white drop-shadow"><div className="font-bold">{candidate.name}</div><div className="text-sm">{candidate.city}</div></div>
                  <div className="absolute right-3 top-3 rounded-xl bg-white px-2.5 py-1 text-center"><div className="text-sm font-bold text-emerald-600">{candidate.compatibility === null ? '—' : `${candidate.compatibility}%`}</div><div className="text-[9px] text-gray-600">{candidate.compatibility === null ? 'incomplete' : 'match'}</div></div>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center gap-2"><span className="tag text-xs">{candidate.personality}</span></div>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-600">{candidate.bio}</p>
                  <div className="mb-4 flex flex-wrap gap-1.5">{candidate.interests.slice(0, 4).map((interest) => <span key={interest} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{interest}</span>)}</div>
                  <button className="w-full rounded-xl py-2.5 text-sm font-semibold" style={connected.has(candidate.id) ? { background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0' } : { background: '#111111', color: 'white' }} onClick={() => handleConnect(candidate.id)}>{connected.has(candidate.id) ? '✓ Connection requested' : 'Connect →'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
