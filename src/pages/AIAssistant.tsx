import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import {
  chatWithTripMates,
  generateDestinationInsights,
  getLiveWeatherInsight,
  getTravelSuggestion,
  type LiveWeatherInsight,
} from '../lib/aiService';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const starterPrompts = [
  'Plan a 4-day trip that fits my budget',
  'What should I pack for a mountain trip?',
  'Suggest activities for a relaxed beach break',
];

export default function AIAssistant() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi${user?.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}! I’m your TripMates travel assistant. I can help plan itineraries, compare destinations, and think through budgets. What are you planning?` },
  ]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [destination, setDestination] = useState(user?.city?.split(',')[0] || '');
  const [suggestion, setSuggestion] = useState<Awaited<ReturnType<typeof getTravelSuggestion>> | null>(null);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof generateDestinationInsights>> | null>(null);
  const [weather, setWeather] = useState<LiveWeatherInsight | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const conversationEnd = useRef<HTMLDivElement | null>(null);

  const profile = useMemo(() => ({
    city: user?.city,
    interests: user?.interests ?? [],
    budget: user?.budget,
    travelStyle: user?.travelPersonality,
  }), [user]);

  const sendMessage = async (content = messageDraft) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(nextMessages);
    setMessageDraft('');
    setSending(true);
    const reply = await chatWithTripMates({ messages: nextMessages, profile });
    setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    setSending(false);
    window.setTimeout(() => conversationEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
  };

  const runPlanner = async () => {
    const place = destination.trim();
    if (!place) {
      setPlannerError('Enter a destination to get trip insights.');
      return;
    }
    setPlannerLoading(true);
    setPlannerError('');
    try {
      const [nextSuggestion, nextInsights, nextWeather] = await Promise.all([
        getTravelSuggestion({ destination: place, interests: profile.interests, budget: profile.budget, city: profile.city, travelStyle: profile.travelStyle }),
        generateDestinationInsights(place),
        getLiveWeatherInsight(place).catch(() => null),
      ]);
      setSuggestion(nextSuggestion);
      setInsights(nextInsights);
      setWeather(nextWeather);
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'Could not load destination insights.');
    } finally {
      setPlannerLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-24 md:px-6 md:pb-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><span className="tag">TripMates AI</span><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Your travel co-pilot</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Get trip planning help, destination context, weather-aware ideas, and recommendations based on your travel profile.</p></div>
          <button type="button" onClick={() => navigate('/create-trip')} className="btn-primary px-5 py-3 text-sm">Create a trip →</button>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xl">✦</div><div><h2 className="font-bold text-slate-900">Ask TripMates AI</h2><p className="text-xs text-slate-500">Travel planning chat</p></div><span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Profile-aware</span></header>
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 md:p-5">
              {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>{message.content}</div></div>)}
              {sending && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Thinking through your trip…</div></div>}
              <div ref={conversationEnd} />
            </div>
            {messages.length === 1 && <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">{starterPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800">{prompt}</button>)}</div>}
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2 border-t border-slate-200 p-4"><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Ask about destinations, budgets, itineraries…" maxLength={1200} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"/><button disabled={sending || !messageDraft.trim()} className="btn-primary shrink-0 px-5 py-3 text-sm disabled:opacity-50">Send</button></form>
            <p className="px-4 pb-3 text-[11px] text-slate-400">AI suggestions can be inaccurate. Confirm bookings, weather alerts, visa, health, and safety information with official sources.</p>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4"><h2 className="font-bold text-slate-900">Destination planner</h2><p className="mt-1 text-sm text-slate-500">Recommendations use your saved travel style and interests.</p></div>
              <div className="flex gap-2"><input value={destination} onChange={(event) => setDestination(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runPlanner(); }} placeholder="e.g. Goa, Kyoto, Ladakh" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"/><button type="button" onClick={() => void runPlanner()} disabled={plannerLoading} className="btn-primary shrink-0 px-4 py-3 text-sm disabled:opacity-50">{plannerLoading ? 'Planning…' : 'Explore'}</button></div>
              {plannerError && <p role="alert" className="mt-3 text-sm text-rose-700">{plannerError}</p>}
              {plannerLoading && <div className="mt-5 space-y-3 animate-pulse"><div className="h-20 rounded-xl bg-slate-100"/><div className="h-16 rounded-xl bg-slate-100"/></div>}

              {suggestion && !plannerLoading && <article className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold text-slate-900">{suggestion.destination}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">{suggestion.bestMonth}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{suggestion.reason}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/80 p-3"><div className="text-slate-500">Suggested budget</div><div className="mt-1 font-bold text-slate-800">{suggestion.budget}</div></div><div className="rounded-xl bg-white/80 p-3"><div className="text-slate-500">Suggested duration</div><div className="mt-1 font-bold text-slate-800">{suggestion.duration}</div></div></div>
                {weather && <div className="mt-3 rounded-xl bg-white/80 p-3"><div className="text-xs font-semibold text-emerald-800">Best season: {weather.seasonal.bestSeason}</div><p className="mt-1 text-xs leading-relaxed text-slate-600">{weather.seasonal.weatherSummary}</p><p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">Current conditions: {weather.condition}, {Math.round(weather.temperatureC)}°C in {weather.location}. Forecast data is current, not a guarantee for future travel dates.</p></div>}
                <div className="mt-3 flex flex-wrap gap-1.5">{suggestion.activities.map((activity) => <span key={activity} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600">{activity}</span>)}</div>
                <button type="button" onClick={() => navigate('/create-trip')} className="mt-4 text-xs font-semibold text-emerald-800">Use this idea to create a trip →</button>
              </article>}
            </section>

            {insights && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="font-bold text-slate-900">Destination field notes</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{[
              ['Local food', insights.localCuisine],
              ['Culture', insights.culturalTips],
              ['Getting around', insights.transportTips],
              ['Safety reminders', insights.safetyTips],
              ['Nearby ideas', insights.nearbyPlaces],
            ].map(([title, items]) => <div key={String(title)}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3><ul className="space-y-1.5 text-sm text-slate-600">{(items as string[]).slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul></div>)}</div></section>}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Your travel context</h2><div className="mt-3 flex flex-wrap gap-2">{[profile.travelStyle, profile.budget, ...(profile.interests.slice(0, 5))].filter(Boolean).map((item) => <span key={item} className="tag">{item}</span>)}{!profile.travelStyle && !profile.budget && !profile.interests.length && <span className="text-sm text-slate-500">Add travel preferences in your profile to personalize recommendations.</span>}</div><button type="button" onClick={() => navigate('/profile')} className="mt-4 text-sm font-semibold text-emerald-700">Update profile preferences →</button></section>
          </div>
        </div>
      </div>
    </main>
  );
}
