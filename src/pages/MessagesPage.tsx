import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchDirectMessages, fetchFriends, sendDirectMessage, subscribeToDirectMessages, type PublicTraveler } from '../lib/supabaseData';

type Message = { from: string; text: string; time: string; self?: boolean };

export default function MessagesPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<PublicTraveler[]>([]);
  const [selectedId, setSelectedId] = useState(new URLSearchParams(window.location.search).get('user') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const selected = friends.find((friend) => friend.id === selectedId);

  useEffect(() => {
    let active = true;
    void fetchFriends().then((loadedFriends) => {
      if (!active) return;
      setFriends(loadedFriends);
      setSelectedId((current) => loadedFriends.some((friend) => friend.id === current) ? current : loadedFriends[0]?.id || '');
      setLoadingFriends(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let active = true;
    const refresh = async () => {
      setLoadingMessages(true);
      const history = await fetchDirectMessages(selected.id);
      if (active) { setMessages(history); setLoadingMessages(false); }
    };
    void refresh();
    const unsubscribe = subscribeToDirectMessages(() => void refresh());
    return () => { active = false; unsubscribe(); };
  }, [selected?.id]);

  const selectFriend = (friendId: string) => {
    setSelectedId(friendId);
    navigate(`/messages?user=${encodeURIComponent(friendId)}`, { replace: true });
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    const result = await sendDirectMessage(selected.id, body);
    setSending(false);
    if (result.error) { window.alert(result.error.message || 'Could not send the message.'); return; }
    setDraft('');
    setMessages(await fetchDirectMessages(selected.id));
  };

  const avatar = (friend: PublicTraveler, className: string) => friend.avatar_url
    ? <img src={friend.avatar_url} alt={friend.full_name} className={`${className} rounded-full object-cover`} />
    : <div className={`${className} flex items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800`}>{friend.full_name.charAt(0).toUpperCase()}</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6"><p className="tag mb-2">Your connections</p><h1 className="text-3xl font-bold">Messages</h1><p className="mt-2 text-sm text-slate-600">Private chats are available with accepted friends.</p></div>
        <div className="grid min-h-[600px] overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid-cols-[300px_1fr]">
          <aside className="border-b border-slate-200 p-3 lg:border-b-0 lg:border-r">
            <div className="px-2 py-3 font-bold">Friends</div>
            {loadingFriends ? <p className="p-3 text-sm text-slate-500">Loading friends…</p> : !friends.length ? <div className="p-4"><p className="text-sm text-slate-500">No accepted friends yet. Send a request from TripMates and chat once they accept.</p><button className="btn-outline mt-4 px-4 py-2 text-sm" onClick={() => navigate('/tripmates')}>Find TripMates</button></div> : (
              <div className="space-y-2">{friends.map((friend) => <button key={friend.id} onClick={() => selectFriend(friend.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selectedId === friend.id ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}>
                {avatar(friend, 'h-11 w-11')}<div className="min-w-0"><div className="truncate text-sm font-semibold">{friend.full_name}</div><div className="truncate text-xs text-slate-500">{friend.city || friend.travel_personality || 'TripMate'}</div></div>
              </button>)}</div>
            )}
          </aside>
          <main className="flex min-h-[600px] flex-col">
            {selected ? <>
              <button className="flex items-center gap-3 border-b border-slate-200 p-5 text-left" onClick={() => navigate('/tripmates')}>
                {avatar(selected, 'h-12 w-12')}<span><strong className="block">{selected.full_name}</strong><small className="text-slate-500">{selected.city || 'City not set'} · View profile</small></span>
              </button>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5" style={{ maxHeight: '520px' }}>
                {loadingMessages ? <p className="text-sm text-slate-500">Loading conversation…</p> : messages.length ? messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.self ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.self ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}><p>{message.text}</p><p className={`mt-1 text-[10px] ${message.self ? 'text-white/60' : 'text-slate-400'}`}>{message.time}</p></div></div>) : <div className="m-auto text-center"><p className="text-sm text-slate-500">No messages yet. Say hello to {selected.full_name.split(' ')[0]}.</p></div>}
              </div>
              <div className="flex gap-3 border-t border-slate-200 p-4"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }} placeholder="Write a message…" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" /><button disabled={!draft.trim() || sending} className="btn-primary px-5 py-3 text-sm disabled:opacity-50" onClick={() => void sendMessage()}>{sending ? 'Sending…' : 'Send'}</button></div>
            </> : <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-slate-500">Select an accepted friend to open your conversation.</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
