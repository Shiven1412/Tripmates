import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import GoogleMap from '@/components/GoogleMap';
import {
  addTripExpense,
  addTripFile,
  addTripItineraryItem,
  fetchTripById,
  fetchTripExpenses,
  fetchTripFiles,
  fetchTripItinerary,
  fetchTripMembers,
  fetchTripMessages,
  fetchTripLiveLocations,
  reportExpensePayment,
  confirmExpensePayment,
  deleteTripAsOwner,
  removeTripMemberAsOwner,
  sendTripMessage,
  stopTripLiveLocation,
  subscribeToTripLiveLocations,
  subscribeToTripMessages,
  updateTripLiveLocation,
  type PublicTrip,
  type TripExpense,
  type TripFile,
  type TripItineraryItem,
  type TripMember,
} from '../lib/supabaseData';

type Tab = 'chat' | 'expenses' | 'files' | 'location' | 'itinerary' | 'members';
type ChatMessage = { from: string; text: string; time: string; self?: boolean };

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'expenses', label: 'Expenses', icon: '💸' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'itinerary', label: 'Itinerary', icon: '🗓️' },
  { id: 'members', label: 'Members', icon: '👥' },
];

const currency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
const localDateTime = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Time not set';
const upiPaymentLink = (upiId: string, name: string, amount: number, note: string) => `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

export default function TripGroupPage() {
  const { tripId = '' } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [files, setFiles] = useState<TripFile[]>([]);
  const [itinerary, setItinerary] = useState<TripItineraryItem[]>([]);
  const [liveLocations, setLiveLocations] = useState<Awaited<ReturnType<typeof fetchTripLiveLocations>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [addingItinerary, setAddingItinerary] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [memberActionBusy, setMemberActionBusy] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({ title: '', amount: '', category: 'Other', splitMethod: 'EQUAL' as 'EQUAL' | 'PERCENTAGE' | 'CUSTOM' });
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [itineraryDraft, setItineraryDraft] = useState({ title: '', details: '', location: '', startsAt: '', endsAt: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const lastLocationWrite = useRef(0);
  const isOwner = Boolean(trip && currentUser?.id === trip.created_by);
  const approvedMember = Boolean(currentUser && members.some((member) => member.id === currentUser.id));

  const loadTrip = useCallback(async () => {
    if (!tripId) { setError('Trip group not found.'); setLoading(false); return; }
    const [loadedTrip, loadedMembers] = await Promise.all([fetchTripById(tripId), fetchTripMembers(tripId)]);
    setTrip(loadedTrip);
    setMembers(loadedMembers);
    if (!loadedTrip) setError('This trip group is unavailable or you do not have permission to view it.');
    setLoading(false);
  }, [tripId]);

  const loadMessages = useCallback(async () => {
    setMessages(await fetchTripMessages(tripId));
  }, [tripId]);

  const loadExpenses = useCallback(async () => setExpenses(await fetchTripExpenses(tripId)), [tripId]);
  const loadFiles = useCallback(async () => setFiles(await fetchTripFiles(tripId)), [tripId]);
  const loadItinerary = useCallback(async () => setItinerary(await fetchTripItinerary(tripId)), [tripId]);
  const loadLiveLocations = useCallback(async () => {
    const locations = await fetchTripLiveLocations(tripId);
    setLiveLocations(locations);
    if (currentUser) setSharingLocation(locations.some((location) => location.user_id === currentUser.id));
  }, [tripId, currentUser?.id]);

  useEffect(() => { void loadTrip(); }, [loadTrip]);
  useEffect(() => {
    if (!approvedMember && !isOwner) return;
    void loadMessages();
    const unsubscribe = subscribeToTripMessages(tripId, () => void loadMessages());
    return unsubscribe;
  }, [tripId, approvedMember, isOwner, loadMessages]);
  useEffect(() => { if (approvedMember || isOwner) { void loadExpenses(); void loadFiles(); void loadItinerary(); } }, [approvedMember, isOwner, loadExpenses, loadFiles, loadItinerary]);
  useEffect(() => {
    if (!approvedMember && !isOwner) return;
    void loadLiveLocations();
    const unsubscribe = subscribeToTripLiveLocations(tripId, () => void loadLiveLocations());
    return unsubscribe;
  }, [tripId, approvedMember, isOwner, loadLiveLocations]);

  useEffect(() => {
    if (!sharingLocation || !navigator.geolocation) return;
    let watchId: number | undefined;
    setLocationBusy(true);
    watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (now - lastLocationWrite.current < 15000) return;
      lastLocationWrite.current = now;
      const result = await updateTripLiveLocation(tripId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      if (result.error) setError(result.error.message);
      else await loadLiveLocations();
      setLocationBusy(false);
    }, (geoError) => {
      setError(geoError.message || 'Location permission was not granted.');
      setSharingLocation(false);
      void stopTripLiveLocation(tripId);
      setLocationBusy(false);
    }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, [sharingLocation, tripId, loadLiveLocations]);

  const totals = useMemo(() => {
    return expenses.reduce((summary, expense) => {
      summary.spent += Number(expense.amount);
      for (const share of expense.shares) {
        if (share.user_id === currentUser?.id && share.status !== 'PAID') summary.owe += Number(share.owed_amount);
      }
      if (expense.paid_by === currentUser?.id) {
        summary.owed += expense.shares.filter((share) => share.user_id !== currentUser?.id && share.status !== 'PAID').reduce((sum, share) => sum + Number(share.owed_amount), 0);
      }
      return summary;
    }, { spent: 0, owe: 0, owed: 0 });
  }, [expenses, currentUser?.id]);

  const sendMessage = async () => {
    const text = messageDraft.trim();
    if (!text || sendingMessage) return;
    setSendingMessage(true);
    const result = await sendTripMessage(tripId, text);
    setSendingMessage(false);
    if (result.error) { setError(result.error.message); return; }
    setMessageDraft('');
    await loadMessages();
  };

  const submitExpense = async () => {
    const amount = Number(expenseDraft.amount);
    if (!expenseDraft.title.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Enter an expense title and a positive amount.'); return; }
    if (expenseDraft.splitMethod === 'CUSTOM') {
      const requested = members.reduce((sum, member) => sum + Number(customShares[member.id] || 0), 0);
      if (Math.abs(requested - amount) > 0.01) { setError('Custom member shares must add up to the full expense amount.'); return; }
    }
    setAddingExpense(true);
    setError('');
    const result = await addTripExpense(tripId, {
      ...expenseDraft,
      amount,
      customShares: Object.fromEntries(Object.entries(customShares).map(([id, share]) => [id, Number(share)])),
    });
    setAddingExpense(false);
    if (result.error) { setError(result.error.message); return; }
    setExpenseDraft({ title: '', amount: '', category: 'Other', splitMethod: 'EQUAL' });
    await loadExpenses();
  };

  const settleShare = async (expenseId: string) => {
    if (!currentUser) return;
    const result = await reportExpensePayment(expenseId);
    if (result.error) { setError(result.error.message); return; }
    await loadExpenses();
  };

  const confirmSharePayment = async (expenseId: string, userId: string) => {
    const result = await confirmExpensePayment(expenseId, userId);
    if (result.error) { setError(result.error.message); return; }
    await loadExpenses();
  };

  const removeMember = async (member: TripMember) => {
    if (!isOwner || member.id === currentUser?.id) return;
    if (!window.confirm(`Remove ${member.full_name} from this trip? They will lose access to group tools.`)) return;
    setMemberActionBusy(member.id);
    const result = await removeTripMemberAsOwner(tripId, member.id);
    setMemberActionBusy('');
    if (result.error) { setError(result.error.message); return; }
    await loadTrip();
  };

  const deleteTrip = async () => {
    const tripToDelete = trip;
    if (!isOwner || !tripToDelete) return;
    if (!window.confirm(`Permanently delete “${tripToDelete.title}” and its group data? This action cannot be undone.`)) return;
    setMemberActionBusy('delete-trip');
    const result = await deleteTripAsOwner(tripId);
    setMemberActionBusy('');
    if (result.error) { setError(result.error.message); return; }
    navigate('/trips', { replace: true });
  };

  const toggleLocationSharing = async () => {
    if (sharingLocation) {
      setSharingLocation(false);
      const result = await stopTripLiveLocation(tripId);
      if (result.error) setError(result.error.message);
      await loadLiveLocations();
      return;
    }
    if (!navigator.geolocation) { setError('This browser does not support geolocation.'); return; }
    setError('');
    setSharingLocation(true);
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Files must be 10 MB or smaller.'); return; }
    setUploadingFile(true);
    setError('');
    const result = await addTripFile(tripId, file);
    setUploadingFile(false);
    if (result.error) { setError(`${result.error.message}. Run the latest Supabase schema to create trip file storage.`); return; }
    if (fileInput.current) fileInput.current.value = '';
    await loadFiles();
  };

  const saveItineraryItem = async () => {
    if (!itineraryDraft.title.trim()) { setError('Enter a timeline item title.'); return; }
    setAddingItinerary(true);
    setError('');
    const result = await addTripItineraryItem(tripId, itineraryDraft);
    setAddingItinerary(false);
    if (result.error) { setError(result.error.message); return; }
    setItineraryDraft({ title: '', details: '', location: '', startsAt: '', endsAt: '' });
    await loadItinerary();
  };

  if (loading) return <div className="min-h-screen bg-[#FAFAFA] px-6 pt-24 text-sm text-slate-500">Loading trip group…</div>;
  if (!trip) return <div className="min-h-screen bg-[#FAFAFA] px-6 pt-24"><div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Trip group unavailable</h1><p className="mt-2 text-sm text-slate-500">{error || 'This group may be private or your membership has not been approved.'}</p><button className="btn-outline mt-5 px-4 py-2" onClick={() => navigate('/trips')}>Back to trips</button></div></div>;
  if (!approvedMember && !isOwner) return <div className="min-h-screen bg-[#FAFAFA] px-6 pt-24"><div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Members-only trip group</h1><p className="mt-2 text-sm text-slate-500">Group chat, expenses, itinerary, and files are available after the trip owner approves your request.</p><button className="btn-outline mt-5 px-4 py-2" onClick={() => navigate('/trips')}>Browse trips</button></div></div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8"><div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <button className="mb-4 text-sm font-semibold text-emerald-700" onClick={() => navigate('/trips')}>← All trips</button>
      <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {trip.cover_image && <img src={trip.cover_image} alt="Trip cover" className="h-52 w-full object-cover" />}
        <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="tag mb-2">{trip.trip_type || 'Trip group'}</p><h1 className="text-2xl font-bold">{trip.title}</h1><p className="mt-1 text-sm text-slate-500">{trip.destination} · {trip.start_date || 'Flexible dates'}{trip.end_date ? ` – ${trip.end_date}` : ''}</p></div><div className="flex items-center gap-2"><div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">👥 {members.length} members</div>{isOwner && <button type="button" disabled={memberActionBusy === 'delete-trip'} onClick={() => void deleteTrip()} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{memberActionBusy === 'delete-trip' ? 'Deleting…' : 'Delete trip'}</button>}</div></div>{trip.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{trip.description}</p>}</div>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">{tabs.map((tab) => <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><span>{tab.icon}</span>{tab.label}</button>)}</div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {activeTab === 'location' && <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Live trip map</h2><p className="text-xs text-slate-500">Location is private to approved group members. Sharing is off until you enable it.</p></div><button onClick={() => void toggleLocationSharing()} className={`rounded-xl px-4 py-2 text-sm font-semibold ${sharingLocation ? 'bg-rose-600 text-white' : 'bg-emerald-700 text-white'}`}>{sharingLocation ? 'Stop sharing my location' : 'Share my live location'}</button></div>{locationBusy && <p className="mb-3 text-xs text-slate-500">Waiting for location permission / GPS…</p>}<GoogleMap markers={[{ id: `trip-${trip.id}`, label: `${trip.title} · ${trip.destination}`, place: trip.destination, color: '#d97706' }, ...liveLocations.map((location) => ({ id: location.user_id, label: `${location.full_name}${location.user_id === currentUser?.id ? ' (You)' : ''}`, latitude: location.latitude, longitude: location.longitude, color: location.user_id === currentUser?.id ? '#059669' : '#2563eb' }))]} className="h-[360px]" />{!liveLocations.length && <p className="mt-3 text-xs text-slate-500">No group members are currently sharing. Location stops updating when sharing is turned off or becomes stale.</p>}</section>}
      <section className="min-h-[440px] rounded-3xl border border-slate-200 bg-white p-4 md:p-6">
        {activeTab === 'chat' && <div className="flex min-h-[400px] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">{messages.length ? messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.self ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${message.self ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}><div className="mb-1 text-xs font-semibold opacity-70">{message.from}</div><p className="whitespace-pre-wrap text-sm">{message.text}</p><time className="mt-1 block text-right text-[10px] opacity-60">{message.time}</time></div></div>) : <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500">No messages yet. Start planning with your group.</div>}</div>
          <div className="flex gap-2 border-t border-slate-100 pt-4"><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }} placeholder="Message the group…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm" /><button disabled={!messageDraft.trim() || sendingMessage} className="btn-primary px-5 py-3 text-sm disabled:opacity-50" onClick={() => void sendMessage()}>{sendingMessage ? 'Sending…' : 'Send'}</button></div>
        </div>}

        {activeTab === 'expenses' && <div>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Group spending</div>
              <strong className="mt-1 block text-lg">{currency(totals.spent)}</strong>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="text-xs text-amber-700">You owe</div>
              <strong className="mt-1 block text-lg">{currency(totals.owe)}</strong>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700">Owed to you</div>
              <strong className="mt-1 block text-lg">{currency(totals.owed)}</strong>
            </div>
          </div>
          <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <h2 className="mb-3 font-bold">Add a shared expense</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={expenseDraft.title} onChange={(event) => setExpenseDraft({ ...expenseDraft, title: event.target.value })} placeholder="Expense description" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input type="number" min="0.01" step="0.01" value={expenseDraft.amount} onChange={(event) => setExpenseDraft({ ...expenseDraft, amount: event.target.value })} placeholder="Amount ₹" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <select value={expenseDraft.category} onChange={(event) => setExpenseDraft({ ...expenseDraft, category: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                {['Hotel', 'Homestay', 'Food', 'Cab', 'Bike Rental', 'Scooty Rental', 'Fuel', 'Tickets', 'Activities', 'Other'].map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={expenseDraft.splitMethod} onChange={(event) => setExpenseDraft({ ...expenseDraft, splitMethod: event.target.value as 'EQUAL' | 'CUSTOM' })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <option value="EQUAL">Split equally</option>
                <option value="CUSTOM">Custom shares</option>
              </select>
            </div>
            {expenseDraft.splitMethod === 'CUSTOM' && <div className="mt-3 grid gap-2 sm:grid-cols-2">{members.map((member) => <label key={member.id} className="text-xs text-slate-600">{member.full_name}<input type="number" min="0" step="0.01" value={customShares[member.id] ?? ''} onChange={(event) => setCustomShares((current) => ({ ...current, [member.id]: event.target.value }))} placeholder="Share ₹" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>)}</div>}
            <button disabled={addingExpense} className="btn-primary mt-3 px-4 py-2.5 text-sm disabled:opacity-50" onClick={() => void submitExpense()}>{addingExpense ? 'Saving…' : 'Add expense'}</button>
          </div>
          {!expenses.length ? <p className="py-8 text-center text-sm text-slate-500">No shared expenses recorded yet.</p> : <div className="space-y-3">{expenses.map((expense) => <article key={expense.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{expense.title}</h3><p className="mt-1 text-xs text-slate-500">{expense.category} · Paid by {expense.payer_name} · {localDateTime(expense.created_at)}</p>{expense.payer_upi_id && <p className="mt-1 text-xs font-medium text-emerald-700">UPI ID: {expense.payer_upi_id}</p>}</div><strong>{currency(Number(expense.amount))}</strong></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{expense.shares.map((share) => <div key={share.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><div><span>{share.name}</span>{members.find((member) => member.id === share.user_id)?.upi_id && <div className="text-[10px] text-slate-500">UPI: {members.find((member) => member.id === share.user_id)?.upi_id}</div>}</div><span className="flex flex-wrap items-center gap-2">{currency(Number(share.owed_amount))}<span className={`text-xs ${share.status === 'PAID' ? 'text-emerald-700' : share.status === 'PAYMENT_REPORTED' ? 'text-blue-700' : 'text-amber-700'}`}>{share.status === 'PAID' ? 'Confirmed paid' : share.status === 'PAYMENT_REPORTED' ? 'Reported paid · awaiting confirmation' : 'Unpaid'}</span>{share.user_id === currentUser?.id && share.status === 'PENDING' && expense.payer_upi_id && expense.paid_by !== currentUser?.id && <a className="text-xs font-semibold text-emerald-700" href={upiPaymentLink(expense.payer_upi_id, expense.payer_name, Number(share.owed_amount), expense.title)}>Pay with UPI</a>}{share.user_id === currentUser?.id && share.status === 'PENDING' && expense.paid_by !== currentUser?.id && <button className="text-xs font-semibold text-emerald-700" onClick={() => void settleShare(expense.id)}>I paid</button>}{share.status === 'PAYMENT_REPORTED' && (isOwner || expense.paid_by === currentUser?.id) && <button className="text-xs font-semibold text-blue-700" onClick={() => void confirmSharePayment(expense.id, share.user_id)}>Confirm paid</button>}</span></div>)}</div></article>)}</div>}
        </div>}

        {activeTab === 'files' && <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold">Shared trip files</h2><p className="text-sm text-slate-500">Upload bookings, permits, and other trip documents (10 MB max).</p></div>
            <input ref={fileInput} type="file" className="hidden" onChange={(event) => void uploadFile(event.target.files?.[0])} />
            <button disabled={uploadingFile} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50" onClick={() => fileInput.current?.click()}>{uploadingFile ? 'Uploading…' : '+ Upload file'}</button>
          </div>
          {!files.length ? <p className="py-10 text-center text-sm text-slate-500">No files shared yet.</p> : <div className="space-y-2">{files.map((file) => <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><span className="text-2xl">📄</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{file.name}</span><span className="text-xs text-slate-500">{file.file_type || 'File'} · {localDateTime(file.created_at)}</span></span><span className="text-sm text-emerald-700">Open ↗</span></a>)}</div>}
        </div>}

        {activeTab === 'location' && <div>
          <h2 className="text-lg font-bold">Trip destination</h2>
          <p className="mt-1 text-sm text-slate-500">Live map and opt-in group location sharing are above.</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <div className="text-xs text-slate-500">Destination</div>
            <div className="mt-1 text-xl font-bold">📍 {trip.destination}</div>
            {trip.creator_city && <div className="mt-2 text-sm text-slate-500">Trip organizer: {trip.creator_name} · {trip.creator_city}</div>}
          </div>
        </div>}

        {activeTab === 'itinerary' && <div>
          <div className="mb-5">
            <h2 className="text-lg font-bold">Trip itinerary</h2>
            <p className="text-sm text-slate-500">The trip creator sets the schedule and locations.</p>
          </div>
          {isOwner && <div className="mb-5 rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-3 font-semibold">Add itinerary event</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={itineraryDraft.title} onChange={(event) => setItineraryDraft({ ...itineraryDraft, title: event.target.value })} placeholder="Event / activity" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input value={itineraryDraft.location} onChange={(event) => setItineraryDraft({ ...itineraryDraft, location: event.target.value })} placeholder="Location (optional)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <label className="text-xs text-slate-500">Starts<input type="datetime-local" value={itineraryDraft.startsAt} onChange={(event) => setItineraryDraft({ ...itineraryDraft, startsAt: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
              <label className="text-xs text-slate-500">Ends<input type="datetime-local" value={itineraryDraft.endsAt} onChange={(event) => setItineraryDraft({ ...itineraryDraft, endsAt: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
            </div>
            <textarea value={itineraryDraft.details} onChange={(event) => setItineraryDraft({ ...itineraryDraft, details: event.target.value })} placeholder="Notes (optional)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <button disabled={addingItinerary} className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50" onClick={() => void saveItineraryItem()}>{addingItinerary ? 'Saving…' : 'Add event'}</button>
          </div>}
          {!itinerary.length ? <p className="py-8 text-center text-sm text-slate-500">No itinerary items yet.</p> : <ol className="space-y-3">{itinerary.map((item) => <li key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 p-4"><span className="mt-0.5 text-xl">🗓️</span><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-emerald-700">{localDateTime(item.starts_at)}{item.ends_at ? ` – ${localDateTime(item.ends_at)}` : ''}</p>{item.location && <p className="mt-1 text-sm text-slate-500">📍 {item.location}</p>}{item.details && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.details}</p>}</div></li>)}</ol>}</div>}

        {activeTab === 'members' && <div>
          <h2 className="text-lg font-bold">Trip members ({members.length})</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{member.full_name.charAt(0)}</div>}<div className="min-w-0 flex-1"><div className="truncate font-semibold">{member.full_name}{member.id === currentUser?.id ? ' (You)' : ''}</div><div className="text-xs text-slate-500">{member.city || 'City not set'} · {member.role === 'OWNER' ? 'Trip creator' : 'Member'}</div></div>{isOwner && member.role !== 'OWNER' && <button type="button" disabled={Boolean(memberActionBusy)} onClick={() => void removeMember(member)} className="shrink-0 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{memberActionBusy === member.id ? 'Removing…' : 'Remove'}</button>}</div>)}</div></div>}
      </section>
    </div></div>
  );
}