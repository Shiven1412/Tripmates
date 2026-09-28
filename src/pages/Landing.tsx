import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import AppLogo from '../components/AppLogo';
import { isAuthenticated, useCurrentUser } from '../lib/auth';
import { fetchPublishedTrips, type PublicTrip } from '../lib/supabaseData';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1464198016405-33fd4527b89d?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1661198852527-9f86d5e95630?w=1600&h=900&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1776571662253-d5b0732e37c0?w=1600&h=900&fit=crop&auto=format',
];

const PERSONALITIES = [
  { emoji: '🏔️', name: 'Explorer', desc: 'Off-trail, uncharted horizons', color: '#10B981', bg: '#F0FDF4', traits: ['Adventurous', 'Curious', 'Independent'] },
  { emoji: '⚡', name: 'Thrill Seeker', desc: 'Adrenaline is the currency', color: '#3B82F6', bg: '#EFF6FF', traits: ['Bold', 'Energetic', 'Risk-taker'] },
  { emoji: '🎒', name: 'Backpacker', desc: 'Light pack, heavy memories', color: '#F59E0B', bg: '#FFFBEB', traits: ['Frugal', 'Flexible', 'Social'] },
  { emoji: '✨', name: 'Luxury Nomad', desc: 'Comfort meets discovery', color: '#8B5CF6', bg: '#F5F3FF', traits: ['Refined', 'Curated', 'Premium'] },
  { emoji: '🍜', name: 'Foodie Voyager', desc: 'Eat your way around the world', color: '#EF4444', bg: '#FEF2F2', traits: ['Gourmet', 'Open-minded', 'Passionate'] },
  { emoji: '🏛️', name: 'Culture Hunter', desc: 'Art, history, and depth', color: '#6366F1', bg: '#EEF2FF', traits: ['Intellectual', 'Mindful', 'Curious'] },
  { emoji: '🚗', name: 'Road Tripper', desc: 'The journey is the destination', color: '#0EA5E9', bg: '#F0F9FF', traits: ['Free-spirited', 'Spontaneous'] },
  { emoji: '💻', name: 'Digital Nomad', desc: 'Work hard, travel harder', color: '#14B8A6', bg: '#F0FDFA', traits: ['Disciplined', 'Adaptable', 'Networked'] },
];

const DESTINATIONS = [
  { name: 'Ladakh', country: 'India', url: 'https://images.unsplash.com/photo-1566323124620-d22adb71d2a2?w=600&h=800&fit=crop&auto=format', span: 'row-span-2' },
  { name: 'Bali', country: 'Indonesia', url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop&auto=format', span: '' },
  { name: 'Japan', country: 'Tokyo', url: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=600&h=400&fit=crop&auto=format', span: '' },
  { name: 'Goa', country: 'India', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&h=400&fit=crop&auto=format', span: '' },
  { name: 'Meghalaya', country: 'India', url: 'https://images.unsplash.com/photo-1566375465495-f3ef2854592d?w=600&h=400&fit=crop&auto=format', span: 'col-span-2' },
];

export default function Landing() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [heroIdx, setHeroIdx] = useState(0);
  const [activePtype, setActivePtype] = useState(0);
  const [featuredTrips, setFeaturedTrips] = useState<PublicTrip[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { setFeaturedTrips([]); return () => { active = false; }; }
    void fetchPublishedTrips().then((trips) => { if (active) setFeaturedTrips(trips); });
    return () => { active = false; };
  }, [user]);

  return (
    <div className="landing-shell w-full overflow-x-clip bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="relative flex min-h-[68vh] w-full flex-col items-center justify-center overflow-hidden pt-16 md:min-h-[72vh]">
        {HERO_IMAGES.map((url, i) => (
          <div
            key={url}
            className="absolute inset-0 bg-gray-900"
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === heroIdx ? 1 : 0,
              transition: 'opacity 1.2s ease',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-slate-950/65" />

        <div className="absolute left-4 top-24 animate-float md:left-16">
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm md:px-4 md:text-sm">
            🏔️ Trekking to Everest Base Camp
          </div>
        </div>
        <div className="absolute right-4 top-32 animate-float md:right-16">
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm md:px-4 md:text-sm">
            🌏 Preference-based matching
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md md:mb-8 md:text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Meet travelers who share your style
          </div>

          <div className="mb-5 flex justify-center md:mb-6">
            <div className="flex items-center justify-center rounded-[22px] border border-white/20 bg-white/10 px-5 py-4 shadow-[0_25px_80px_rgba(15,23,42,0.35)] backdrop-blur-md ring-1 ring-white/10 md:rounded-[28px] md:px-7 md:py-5">
              <AppLogo className="scale-100 md:scale-110" dark={false} />
            </div>
          </div>

          <h1 className="mb-4 font-serif text-white leading-none md:mb-6" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', letterSpacing: '-0.04em' }}>
            Travel with People,<br />
            <span style={{ fontStyle: 'italic', color: '#86efac' }}>Not Strangers.</span>
          </h1>

          <p className="mx-auto mb-7 max-w-xl text-sm font-light leading-relaxed text-slate-200 md:mb-10 md:text-xl">
            Join verified travelers who share your style, budget, interests, and personality.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button className="btn-green px-6 py-3.5 text-sm md:px-8 md:py-4 md:text-base" onClick={() => navigate(isAuthenticated() ? '/discover' : '/auth')}>
              Find your next trip →
            </button>
            <button className="btn-outline border border-white/30 bg-white/5 px-6 py-3.5 text-sm text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm hover:bg-white hover:text-slate-950 md:px-8 md:py-4 md:text-base" onClick={() => navigate(isAuthenticated() ? '/ai-assistant' : '/auth')}>
              Ask TripMates AI
            </button>
          </div>

          <p className="mt-6 cursor-pointer text-xs text-white/60 transition-colors hover:text-white/80 md:text-sm" onClick={() => document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' })}>
            ↓ Explore Destinations
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setHeroIdx(i)} className="rounded-full transition-all" style={{ width: i === heroIdx ? 24 : 8, height: 8, background: i === heroIdx ? '#10B981' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
      </section>

      {user && <section className="bg-gradient-to-b from-emerald-50 to-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><span className="tag">Your TripMates home</span><h2 className="mt-3 text-2xl font-bold md:text-3xl">Welcome back, {user.fullName.split(' ')[0]} ✨</h2><p className="mt-1 text-sm text-slate-600">Picked for your {user.travelPersonality || 'travel'} style · {user.interests?.slice(0, 2).join(' + ') || 'discover new interests'}</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate('/ai-assistant')} className="rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800">Ask TripMates AI</button><button type="button" onClick={() => navigate('/discover')} className="btn-primary px-4 py-2.5 text-sm">Discover trips →</button></div></div>
          {featuredTrips.length ? <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            {(() => { const trip = featuredTrips[featuredIndex % featuredTrips.length]; return <div className="grid md:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[280px] bg-slate-200 md:min-h-[360px]">{trip.cover_image ? <img src={trip.cover_image} alt={trip.title} className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-200 to-sky-200 text-6xl">🧭</div>}<span className="absolute left-5 top-5 rounded-full bg-slate-950/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">Featured group · {trip.trip_type || 'Adventure'}</span></div>
              <div className="flex flex-col justify-center p-6 md:p-9"><div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">A new story is waiting</div><h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{trip.title}</h3><p className="mt-2 text-sm text-slate-500">📍 {trip.destination} · {trip.start_date || 'Flexible dates'}</p><p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">{trip.description || 'Meet your next travel crew and build an adventure together.'}</p><div className="mt-6 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Hosted by <strong className="text-slate-800">{trip.creator_name}</strong></span><button type="button" onClick={() => navigate('/trips')} className="btn-primary px-5 py-3 text-sm">Explore trips →</button></div><div className="mt-6 flex items-center gap-2">{featuredTrips.slice(0, 8).map((item, index) => <button key={item.id} type="button" onClick={() => setFeaturedIndex(index)} aria-label={`Show ${item.title}`} className={`h-2 rounded-full transition-all ${index === featuredIndex ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300'}`}/>)}</div></div>
            </div>; })()}
          </div> : <div className="flex flex-col items-start justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center"><div><h3 className="text-lg font-bold">Your next travel story starts here</h3><p className="mt-1 text-sm text-slate-600">Explore seasonal ideas or create a trip with people who share your travel style.</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate('/seasonal-trips')} className="btn-outline px-4 py-2.5 text-sm">Seasonal ideas</button><button type="button" onClick={() => navigate('/create-trip')} className="btn-primary px-4 py-2.5 text-sm">Create a trip</button></div></div>}
        </div>
      </section>}

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <span className="tag mb-4">How TripMates Works</span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
            Four steps to your<br /><em>perfect travel crew</em>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { step: '01', title: 'Create Profile', desc: 'Set your personality, interests, and travel style', icon: '👤' },
            { step: '02', title: 'Verify Identity', desc: 'Aadhaar & face verification for community trust', icon: '🛡️' },
            { step: '03', title: 'Match Travelers', desc: 'AI-powered compatibility scoring finds your people', icon: '🤝' },
            { step: '04', title: 'Travel Together', desc: 'Plan, split expenses, and create lifelong memories', icon: '🌏' },
          ].map((item, i) => (
            <div key={i} className="card-hover rounded-3xl border border-slate-200 bg-white p-7">
              <div className="mb-4 text-3xl">{item.icon}</div>
              <div className="mb-2 text-xs font-bold tracking-widest" style={{ color: '#10B981' }}>{item.step}</div>
              <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/80">Travel Personality System</span>
            <h2 className="font-serif text-4xl text-white md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
              Which traveler<br /><em style={{ color: '#86efac' }}>are you?</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {PERSONALITIES.map((personality, i) => (
              <button key={i} className="rounded-2xl border-2 p-5 text-left transition-all duration-200" style={{ background: i === activePtype ? personality.bg : 'rgba(255,255,255,0.06)', borderColor: i === activePtype ? personality.color : 'rgba(255,255,255,0.1)' }} onClick={() => setActivePtype(i)}>
                <div className="mb-3 text-3xl">{personality.emoji}</div>
                <h3 className="mb-1 text-sm font-bold" style={{ color: i === activePtype ? personality.color : 'white' }}>{personality.name}</h3>
                <p className="text-xs leading-relaxed" style={{ color: i === activePtype ? '#374151' : 'rgba(255,255,255,0.5)' }}>{personality.desc}</p>
                {i === activePtype && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {personality.traits.map((trait) => (
                      <span key={trait} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: personality.color + '20', color: personality.color }}>{trait}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <span className="tag mb-4">Trip Chemistry™</span>
            <h2 className="mb-6 font-serif text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
              Know your <em>compatibility</em><br />before you book
            </h2>
            <p className="mb-8 text-base leading-relaxed text-slate-600">
              Trip chemistry compares the travel preferences saved in each traveler’s profile. Scores are shown only when real profile data is available.
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              {['Budget and travel style', 'Shared interests', 'Lifestyle preferences'].map((dimension) => <li key={dimension}>✓ {dimension}</li>)}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <div className="flex h-48 w-64 flex-col items-center justify-center text-center">
                <div className="mb-3 text-5xl">🧭</div>
                <div className="text-lg font-bold text-slate-900">Personalized chemistry</div>
                <div className="mt-2 text-sm text-slate-600">Built from saved traveler profiles</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[
                'https://images.unsplash.com/photo-1599828586134-fbaff96c63d5?w=60&h=60&fit=crop&auto=format',
                'https://images.unsplash.com/photo-1464198016405-33fd4527b89d?w=60&h=60&fit=crop&auto=format',
                'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=60&h=60&fit=crop&auto=format',
              ].map((url, i) => (
                <img key={i} src={url} alt="traveler" className="h-12 w-12 rounded-full border-2 border-white object-cover" style={{ marginLeft: i > 0 ? -8 : 0 }} />
              ))}
              <span className="ml-2 text-sm font-medium text-slate-600">Meet your travel community</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8">
          <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.34em] text-emerald-500">System specification &amp; guidelines</div>
              <h2 className="text-4xl font-black tracking-[-0.06em] text-slate-900 md:text-6xl">TripMates</h2>
              <p className="mt-2 text-base text-slate-500">We don&apos;t match destinations. We match travelers.</p>
            </div>
            <div className="text-right text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              <div>v1.0.0 (release)</div>
              <div className="mt-2">Representation scale 1:1</div>
              <div className="mt-2">Proprietary intellectual property</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500"><span>01</span><span>Primary logo lockup</span></div>
                <p className="text-sm leading-relaxed text-slate-500">The flagship horizontal signature. Designed for clarity, combining the emerald route symbol, high-geometry wordmark, and core brand tagline.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <svg width="48" height="48" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[32px] font-black tracking-[-0.08em] text-slate-900">TripMates</div>
                    <div className="text-[12px] font-medium text-slate-500">We don&apos;t match destinations. We match travelers.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500"><span>02</span><span>Standalone symbol</span></div>
                <p className="text-sm leading-relaxed text-slate-500">The core geometric asset. A pure emblem of unified pathways, perfect for avatars, product marks, and compact displays.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="flex h-52 items-center justify-center rounded-2xl bg-slate-900">
                  <svg width="120" height="120" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500"><span>03</span><span>Monochrome + dark variants</span></div>
                <p className="text-sm leading-relaxed text-slate-500">Pure black composition and dark-mode contrast ensure the brand remains robust in utility, print, and app contexts.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <svg width="36" height="36" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#111111" strokeWidth="2" strokeLinecap="round"/></svg>
                    <div className="text-xl font-black tracking-[-0.06em] text-slate-900">TripMates</div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Monochrome lockup</div>
                </div>
                <div className="rounded-2xl bg-slate-900 p-6 text-white">
                  <div className="mb-4 flex items-center gap-3">
                    <svg width="36" height="36" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/></svg>
                    <div className="text-xl font-black tracking-[-0.06em] text-white">TripMates</div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Dark theme lockup</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500"><span>04</span><span>App icon ecosystem</span></div>
                <p className="text-sm leading-relaxed text-slate-500">Sized and tuned for mobile environments, app marketplaces, and browser tabs while preserving logo clarity.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="mx-auto mb-4 flex h-[88px] w-[88px] items-center justify-center rounded-[18px] bg-slate-900 shadow-lg shadow-slate-900/10">
                    <svg width="52" height="52" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Large 512px</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="mx-auto mb-4 flex h-[62px] w-[62px] items-center justify-center rounded-[16px] bg-slate-900 shadow-lg shadow-slate-900/10">
                    <svg width="38" height="38" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Medium 128px</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="mx-auto mb-4 flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-slate-900 shadow-lg shadow-slate-900/10">
                    <svg width="24" height="24" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80.8667 41.8702C80.0638 32.6258 75.7219 24.0484 68.747 17.9277C61.772 11.807 52.7028 8.61575 43.4315 9.01977C34.1602 9.42379 25.403 13.3919 18.987 20.0961C12.5711 26.8004 8.99195 35.7229 8.9964 45.0021C8.9964 66.1066 30.9895 88.0301 40.5977 96.6069M96.2037 74.8193C97.9965 73.0268 99.0036 70.5956 99.0036 68.0605C99.0036 65.5254 97.9965 63.0942 96.2037 61.3017C94.411 59.5091 91.9795 58.502 89.4442 58.502C86.9089 58.502 84.4775 59.5091 82.6847 61.3017L64.6384 79.3552C63.5684 80.4245 62.7853 81.7462 62.3612 83.1982L58.5945 96.1129C58.4815 96.5001 58.4747 96.9105 58.5748 97.3012C58.675 97.692 58.8783 98.0486 59.1635 98.3338C59.4487 98.619 59.8054 98.8223 60.1962 98.9224C60.5869 99.0225 60.9974 99.0157 61.3847 98.9028L74.3006 95.1364C75.7527 94.7124 77.0745 93.9293 78.1439 92.8594L96.2037 74.8193ZM58.5001 45.0024C58.5001 52.458 52.4555 58.502 44.9991 58.502C37.5427 58.502 31.4981 52.458 31.4981 45.0024C31.4981 37.5467 37.5427 31.5027 44.9991 31.5027C52.4555 31.5027 58.5001 37.5467 58.5001 45.0024Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Small 64px</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500"><span>05</span><span>Color specification palette</span></div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: 'Primary Accent', hex: '#10B981', rgb: 'RGB: 16, 185, 129', tint: 'Theme anchor / brand mark', bg: '#10B981', text: '#111111' },
                { name: 'Midnight Dark', hex: '#111111', rgb: 'RGB: 17, 17, 17', tint: 'Primary text / dark BG', bg: '#111111', text: '#FFFFFF' },
                { name: 'Canvas White', hex: '#FFFFFF', rgb: 'RGB: 255, 255, 255', tint: 'Primary canvas / light BG', bg: '#FFFFFF', text: '#111111' },
              ].map((swatch) => (
                <div key={swatch.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="h-24" style={{ background: swatch.bg }} />
                  <div className="space-y-2 p-4">
                    <div className="text-base font-bold text-slate-900">{swatch.name}</div>
                    <div className="text-xs text-slate-500">{swatch.tint}</div>
                    <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">HEX: {swatch.hex}</div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{swatch.rgb}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F0FDF4] py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <span className="tag mb-4 bg-white">Safety First</span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
            Trust is our<br /><em>foundation</em>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { icon: '🪪', label: 'Aadhaar Verified' },
              { icon: '🤳', label: 'Face Verification' },
              { icon: '🆘', label: 'Emergency SOS' },
              { icon: '📋', label: 'Trip Consent Agreements' },
              { icon: '⭐', label: 'Community Ratings' },
              { icon: '🔒', label: 'Trusted Community' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#D1FAE5] bg-white p-5 shadow-sm">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium text-[#065F46]">✓ {item.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-10" onClick={() => navigate('/safety')}>Learn About Safety →</button>
        </div>
      </section>

      <section id="destinations" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <span className="tag mb-4">Top Destinations</span>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl" style={{ letterSpacing: '-0.02em' }}>
            Where will you<br /><em>go next?</em>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3" style={{ gridAutoRows: '200px' }}>
          {DESTINATIONS.map((dest) => (
            <div key={dest.name} className={`group relative cursor-pointer overflow-hidden rounded-2xl ${dest.span}`} style={{ background: '#ddd' }}>
              <img src={dest.url} alt={dest.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="text-lg font-bold">{dest.name}</div>
                <div className="text-sm text-white/80">{dest.country}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 font-serif text-4xl text-white md:text-5xl">Ready to find <em className="text-emerald-300">your people?</em></h2>
          <p className="mb-8 text-white/70">Meet travelers who make every destination better.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button className="btn-green px-8 py-4" onClick={() => navigate('/auth')}>Get Started Free →</button>
            <button className="btn-outline px-8 py-4" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }} onClick={() => navigate('/discover')}>Browse Trips</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-500 md:flex-row">
          <span>© 2026 TripMates. We match travelers, not just destinations.</span>
          <div className="flex gap-5"><button type="button" onClick={() => navigate('/safety')} className="hover:text-slate-900">Safety</button><button type="button" onClick={() => navigate('/profile')} className="hover:text-slate-900">Your profile</button></div>
        </div>
      </footer>
    </div>
  );
}
