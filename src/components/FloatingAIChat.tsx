import { useEffect, useRef, useState } from 'react';
import { chatWithTripMates } from '../lib/aiService';
import { useCurrentUser } from '../lib/auth';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function FloatingAIChat() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Need a hand planning? Ask me about destinations, budgets, packing, and itineraries.' }]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setShowNudge(true);
      window.setTimeout(() => setShowNudge(false), 9000);
    }, 180_000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (open) window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  }, [messages, open]);

  if (!user) return null;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setDraft('');
    setSending(true);
    const reply = await chatWithTripMates({ messages: next, profile: { city: user.city, interests: user.interests, budget: user.budget, travelStyle: user.travelPersonality } });
    setMessages([...next, { role: 'assistant', content: reply }]);
    setSending(false);
  };

  return (
    <div className="fixed bottom-24 right-4 z-[120] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && <section className="flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-label="TripMates AI chat">
        <header className="flex items-center gap-3 bg-slate-950 px-4 py-3 text-white"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-lg">✦</div><div className="min-w-0 flex-1"><div className="text-sm font-bold">Ask me</div><div className="text-[11px] text-white/60">TripMates travel assistant</div></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10">✕</button></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">{messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-emerald-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'}`}>{message.content}</p></div>)}{sending && <div className="text-xs text-slate-500">Thinking…</div>}<div ref={endRef}/></div>
        <form onSubmit={(event) => void send(event)} className="flex gap-2 border-t border-slate-200 bg-white p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder="Ask about your next trip…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-500"/><button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Send</button></form>
      </section>}
      {showNudge && !open && <div className="animate-fade-in flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 shadow-lg"><span className="text-sm">Need travel inspiration?</span><button type="button" onClick={() => { setShowNudge(false); setOpen(true); }} className="text-xs font-bold text-emerald-700">Ask me</button><button type="button" onClick={() => setShowNudge(false)} aria-label="Dismiss reminder" className="ml-1 text-slate-400">✕</button></div>}
      <button type="button" onClick={() => { setOpen((current) => !current); setShowNudge(false); }} aria-label={open ? 'Close TripMates AI chat' : 'Ask TripMates AI'} aria-expanded={open} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-2xl text-white shadow-[0_12px_36px_rgba(16,185,129,0.4)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25 motion-reduce:animate-none"/><span className="relative">{open ? '×' : '✦'}</span></button>
    </div>
  );
}
