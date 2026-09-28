import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchDirectMessages, fetchFriends, sendDirectMessage, subscribeToDirectMessages, type PublicTraveler } from '../lib/supabaseData';

type Message = { from: string; text: string; time: string; self?: boolean };

export default function MessagesPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<PublicTraveler[]>([]);
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('user') || '';
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});
  const selected = friends.find((friend) => friend.id === selectedId);
  const filteredFriends = friends.filter((friend) =>
    friend.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (friend.city || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchFriends().then((loadedFriends) => {
      if (!active) return;
      setFriends(loadedFriends);
      const nextSelection = loadedFriends.some((friend) => friend.id === selectedId) ? selectedId : loadedFriends[0]?.id || '';
      setSelectedId(nextSelection);
      setMobileChatOpen(Boolean(nextSelection && isMobile));
      if (nextSelection) {
        navigate(`/messages?user=${encodeURIComponent(nextSelection)}`, { replace: true });
      } else {
        navigate('/messages', { replace: true });
      }
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
      if (active) {
        setMessages(history);
        setUnreadByFriend((prev) => ({ ...prev, [selected.id]: 0 }));
        setLoadingMessages(false);
      }
    };
    void refresh();
    const unsubscribe = subscribeToDirectMessages(() => void refresh());
    return () => { active = false; unsubscribe(); };
  }, [selected?.id]);

  useEffect(() => {
    if (!friends.length) return;
    let active = true;
    const refreshUnreadCounts = async () => {
      const nextCounts = await Promise.all(
        friends.map(async (friend) => {
          const history = await fetchDirectMessages(friend.id);
          const incoming = history.filter((message) => !message.self).length;
          return [friend.id, incoming] as const;
        }),
      );
      if (active) {
        setUnreadByFriend(Object.fromEntries(nextCounts));
      }
    };
    void refreshUnreadCounts();
    return () => { active = false; };
  }, [friends]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId) {
      const params = new URLSearchParams(window.location.search);
      const currentId = params.get('user');
      if (currentId !== selectedId) {
        navigate(`/messages?user=${encodeURIComponent(selectedId)}`, { replace: true });
      }
    }
  }, [selectedId, navigate]);

  useEffect(() => {
    if (isMobile) {
      setMobileChatOpen(Boolean(selectedId));
    } else {
      setMobileChatOpen(false);
    }
  }, [isMobile, selectedId]);

  const selectFriend = (friendId: string) => {
    setSelectedId(friendId);
    setMobileChatOpen(true);
    navigate(`/messages?user=${encodeURIComponent(friendId)}`, { replace: true });
  };

  const goToList = () => {
    setSelectedId('');
    setMobileChatOpen(false);
    navigate('/messages', { replace: true });
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

  const renderChatView = () => (
    <>
      {selected ? (
        <div className={`flex h-full min-h-[560px] flex-col ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-white text-slate-900'}`}>
          <div className={`flex items-center gap-3 border-b p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            <button type="button" onClick={goToList} className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg lg:hidden ${isDark ? 'border-slate-700 text-slate-200 bg-slate-900' : 'border-slate-200 text-slate-700 bg-white'}`}>←</button>
            {avatar(selected, 'h-11 w-11')}
            <div className="min-w-0 flex-1">
              <div className={`truncate text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selected.full_name}</div>
              <div className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selected.city || 'City not set'} · Active now</div>
            </div>
            <button type="button" onClick={() => navigate('/tripmates')} className="hidden text-sm font-medium text-emerald-500 lg:inline-block">View profile</button>
          </div>

          <div className={`flex flex-1 flex-col gap-3 overflow-y-auto p-4 ${isDark ? 'bg-slate-950' : 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),_#f8fafc]'}`}>
            {loadingMessages ? (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading conversation…</p>
            ) : messages.length ? (
              messages.map((message, index) => (
                <div key={`${message.from}-${index}`} className={`flex ${message.self ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.self ? 'bg-emerald-500 text-white' : isDark ? 'border border-slate-800 bg-slate-900 text-slate-100' : 'border border-slate-200 bg-white text-slate-900'}`}>
                    <p>{message.text}</p>
                    <p className={`mt-1 text-[10px] ${message.self ? 'text-white/70' : isDark ? 'text-slate-400' : 'text-slate-400'}`}>{message.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="m-auto max-w-sm text-center">
                <div className="mb-3 text-4xl">💬</div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No messages yet. Start the conversation with {selected.full_name.split(' ')[0]}.</p>
              </div>
            )}
          </div>

          <div className={`border-t p-3 md:p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }}
                placeholder="Message..."
                className={`flex-1 rounded-full border px-4 py-3 text-sm outline-none transition ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:border-emerald-500' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'}`}
              />
              <button disabled={!draft.trim() || sending} className="btn-primary px-5 py-3 text-sm disabled:opacity-50" onClick={() => void sendMessage()}>
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex min-h-[560px] items-center justify-center p-10 text-center text-sm ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-white text-slate-500'}`}>
          Select an accepted friend to open your conversation.
        </div>
      )}
    </>
  );

  return (
    <div className={`min-h-screen pb-24 pt-16 md:pb-8 ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-[#f4f7f6] text-slate-900'}`}>
      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6">
        <div className="mb-5">
          <p className={`tag mb-2 ${isDark ? 'bg-slate-800 text-emerald-300' : ''}`}>Your connections</p>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Messages</h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Private chats are available with accepted friends.</p>
        </div>

        {isMobile && mobileChatOpen ? (
          renderChatView()
        ) : (
          <div className={`grid min-h-[620px] overflow-hidden rounded-[28px] border shadow-sm lg:grid-cols-[320px_1fr] ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <aside className={`border-b p-3 lg:border-b-0 lg:border-r ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/60'}`}>
              <div className="mb-3 flex items-center justify-between px-2">
                <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Chats</div>
                <button type="button" className="text-xs font-semibold text-emerald-500" onClick={() => navigate('/tripmates')}>Find people</button>
              </div>

              <div className={`mb-3 rounded-full border px-3 py-2 shadow-sm ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  <span aria-hidden="true">⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search chats"
                    className={`w-full border-0 bg-transparent text-sm outline-none ${isDark ? 'text-slate-50 placeholder:text-slate-400' : 'text-slate-700 placeholder:text-slate-400'}`}
                  />
                </div>
              </div>

              {loadingFriends ? (
                <p className={`p-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading friends…</p>
              ) : !filteredFriends.length ? (
                <div className="p-4">
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No chats match your search.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => {
                    const unreadCount = friend.id === selectedId ? 0 : unreadByFriend[friend.id] ?? 0;
                    return (
                      <button
                        key={friend.id}
                        onClick={() => selectFriend(friend.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedId === friend.id ? (isDark ? 'border-emerald-500/40 bg-slate-800' : 'border-emerald-200 bg-emerald-50') : (isDark ? 'border-transparent hover:bg-slate-800' : 'border-transparent hover:bg-white')}`}
                      >
                        {avatar(friend, 'h-12 w-12')}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{friend.full_name}</div>
                            {unreadCount > 0 && (
                              <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <div className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{friend.city || friend.travel_personality || 'TripMate'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <main className="min-h-[560px]">{renderChatView()}</main>
          </div>
        )}
      </div>
    </div>
  );
}
