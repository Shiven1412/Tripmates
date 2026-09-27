import { getCurrentUser } from './auth';
import { supabase } from './supabase';

export type AppTrip = {
  id: string;
  title: string;
  destination: string;
  description?: string | null;
  category: string;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string;
  created_by?: string;
  status?: string;
  visibility?: string;
  trip_type?: string | null;
  max_members?: number;
  cover_image?: string | null;
  activities?: string[];
  creator_name?: string;
  creator_avatar?: string | null;
  creator_city?: string | null;
  member_count?: number;
  budget_accommodation?: number;
  budget_transport?: number;
  budget_food?: number;
  budget_activities?: number;
  budget_other?: number;
  gender_preference?: string;
  smoking_friendly?: boolean;
  drinking_friendly?: boolean;
  food_preference?: string;
};

export type PublicTrip = AppTrip & {
  start_date: string | null;
  end_date: string | null;
  creator_name: string;
  member_count: number;
};

export async function fetchPublishedTrips(): Promise<PublicTrip[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trips')
    .select('*')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch published trips', error);
    return [];
  }
  const trips = (data ?? []).filter((trip) => !trip.visibility || trip.visibility === 'PUBLIC');
  if (!trips.length) return [];

  const tripIds = trips.map((trip) => trip.id);
  const creatorIds = [...new Set(trips.map((trip) => trip.created_by))];
  const [memberships, profiles] = await Promise.all([
    supabase.from('trip_members').select('trip_id, status').in('trip_id', tripIds).eq('status', 'APPROVED'),
    supabase.from('public_profiles').select('id, full_name, avatar_url, city').in('id', creatorIds),
  ]);
  if (memberships.error) console.error('Failed to load published trip member counts', memberships.error);
  if (profiles.error) console.error('Failed to load published trip organizers', profiles.error);
  const counts = new Map<string, number>();
  for (const membership of memberships.data ?? []) counts.set(membership.trip_id, (counts.get(membership.trip_id) ?? 0) + 1);
  const organizers = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  return trips.map((trip) => {
    const organizer = organizers.get(trip.created_by);
    return {
      ...trip,
      creator_name: organizer?.full_name || 'TripMate',
      creator_avatar: organizer?.avatar_url ?? null,
      creator_city: organizer?.city ?? null,
      member_count: counts.get(trip.id) ?? 0,
    } as PublicTrip;
  });
}

export async function fetchTripMembershipStatuses(): Promise<Record<string, 'APPROVED' | 'PENDING'>> {
  if (!supabase) return {};
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return {};
  const { data, error } = await supabase.from('trip_members')
    .select('trip_id, status')
    .eq('user_id', authData.user.id)
    .in('status', ['APPROVED', 'PENDING']);
  if (error) {
    console.error('Failed to load trip memberships', error);
    return {};
  }
  const statuses = Object.fromEntries((data ?? []).map((row) => [row.trip_id, row.status as 'APPROVED' | 'PENDING']));
  const { data: ownedTrips, error: ownedTripsError } = await supabase.from('trips').select('id').eq('created_by', authData.user.id);
  if (!ownedTripsError) for (const trip of ownedTrips ?? []) statuses[trip.id] = 'APPROVED';
  return statuses;
}

export async function fetchTripsCreatedBy(userId: string): Promise<PublicTrip[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trips')
    .select('*, trip_members(status)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch profile trips', error);
    return [];
  }
  return (data ?? []).map((trip) => {
    const memberships = (trip.trip_members ?? []) as Array<{ status: string }>;
    return {
      ...trip,
      creator_name: getCurrentUser()?.fullName ?? '',
      creator_avatar: getCurrentUser()?.avatar ?? null,
      creator_city: getCurrentUser()?.city ?? null,
      member_count: memberships.filter((member) => member.status === 'APPROVED').length,
    } as PublicTrip;
  });
}

export type PublicTraveler = {
  id: string;
  full_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  travel_personality: string | null;
  interests: string[] | null;
  avatar_url: string | null;
};

export type FriendshipState = 'NONE' | 'SENT' | 'RECEIVED' | 'FRIENDS';

export async function fetchTravelers(): Promise<PublicTraveler[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('public_profiles')
    .select('id, full_name, age, city, bio, travel_personality, interests, avatar_url')
    .order('full_name');
  if (error) {
    console.error('Failed to load travelers', error);
    return [];
  }
  return (data ?? []) as PublicTraveler[];
}

export async function fetchFriendshipStates(peerIds: string[]): Promise<Record<string, FriendshipState>> {
  if (!supabase || !peerIds.length) return {};
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return {};
  const { data, error } = await supabase.from('travel_requests')
    .select('sender_id, recipient_id, status')
    .eq('request_type', 'MATCH')
    .in('status', ['PENDING', 'APPROVED'])
    .or(`sender_id.eq.${authData.user.id},recipient_id.eq.${authData.user.id}`);
  if (error) {
    console.error('Failed to load friend requests', error);
    return {};
  }
  const states: Record<string, FriendshipState> = {};
  for (const request of data ?? []) {
    const peerId = request.sender_id === authData.user.id ? request.recipient_id : request.sender_id;
    if (!peerIds.includes(peerId)) continue;
    states[peerId] = request.status === 'APPROVED'
      ? 'FRIENDS'
      : request.sender_id === authData.user.id ? 'SENT' : 'RECEIVED';
  }
  return states;
}

export async function sendFriendRequest(peerId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to send a friend request.') };
  const { error } = await supabase.from('travel_requests').insert({
    sender_id: authData.user.id,
    recipient_id: peerId,
    request_type: 'MATCH',
    status: 'PENDING',
  });
  return { error };
}

export async function respondToFriendRequest(requesterId: string, accept: boolean) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to respond to requests.') };
  const { error } = await supabase.from('travel_requests')
    .update({ status: accept ? 'APPROVED' : 'REJECTED' })
    .eq('sender_id', requesterId)
    .eq('recipient_id', authData.user.id)
    .eq('request_type', 'MATCH')
    .eq('status', 'PENDING');
  return { error };
}

export async function respondToIncomingFriendRequest(requesterId: string, accept: boolean) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to respond to requests.') };
  const { error } = await supabase.from('travel_requests')
    .update({ status: accept ? 'APPROVED' : 'REJECTED' })
    .eq('sender_id', requesterId)
    .eq('recipient_id', authData.user.id)
    .eq('request_type', 'MATCH')
    .eq('status', 'PENDING');
  return { error };
}

export async function fetchFriends(): Promise<PublicTraveler[]> {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];
  const { data: requests, error } = await supabase.from('travel_requests')
    .select('sender_id, recipient_id')
    .eq('request_type', 'MATCH')
    .eq('status', 'APPROVED')
    .or(`sender_id.eq.${authData.user.id},recipient_id.eq.${authData.user.id}`);
  if (error) {
    console.error('Failed to load friends', error);
    return [];
  }
  const friendIds = [...new Set((requests ?? []).map((request) => request.sender_id === authData.user.id ? request.recipient_id : request.sender_id))];
  if (!friendIds.length) return [];
  const { data: friends, error: friendsError } = await supabase.from('public_profiles')
    .select('id, full_name, age, city, bio, travel_personality, interests, avatar_url')
    .in('id', friendIds)
    .order('full_name');
  if (friendsError) {
    console.error('Failed to load friend profiles', friendsError);
    return [];
  }
  return (friends ?? []) as PublicTraveler[];
}

export type TripChatMessage = {
  id: string;
  trip_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type TripMember = {
  id: string;
  full_name: string;
  city: string | null;
  avatar_url: string | null;
  upi_id: string | null;
  role: string;
};

export type TripLiveLocation = {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  updated_at: string;
  full_name: string;
  avatar_url: string | null;
};

export type TripItineraryItem = {
  id: string;
  title: string;
  details: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
};

export type TripFile = {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
};

export type TripExpense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paid_by: string;
  split_method: 'EQUAL' | 'PERCENTAGE' | 'CUSTOM';
  created_at: string;
  payer_name: string;
  payer_upi_id: string | null;
  shares: Array<{ user_id: string; owed_amount: number; status: 'PENDING' | 'PAYMENT_REPORTED' | 'PAID'; name: string }>;
};

export async function fetchTripById(tripId: string): Promise<PublicTrip | null> {
  if (!supabase) return null;
  const { data: trip, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (error || !trip) {
    if (error) console.error('Failed to load trip', error);
    return null;
  }
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('trip_member_profiles').select('full_name, avatar_url, city').eq('id', trip.created_by).maybeSingle(),
    supabase.from('trip_members').select('user_id, status').eq('trip_id', tripId).eq('status', 'APPROVED'),
  ]);
  const approvedMemberIds = new Set((membershipResult.data ?? []).map((member) => member.user_id));
  if (trip.created_by) approvedMemberIds.add(trip.created_by);
  return {
    ...trip,
    creator_name: profileResult.data?.full_name || 'TripMate',
    creator_avatar: profileResult.data?.avatar_url ?? null,
    creator_city: profileResult.data?.city ?? null,
    member_count: approvedMemberIds.size,
  } as PublicTrip;
}

export async function fetchTripMembers(tripId: string): Promise<TripMember[]> {
  if (!supabase) return [];
  const { data: members, error } = await supabase.from('trip_members').select('user_id, role, status').eq('trip_id', tripId).eq('status', 'APPROVED');
  if (error) return [];
  const membershipRows = members ?? [];
  const { data: trip } = await supabase.from('trips').select('created_by').eq('id', tripId).maybeSingle();
  if (trip?.created_by && !membershipRows.some((member) => member.user_id === trip.created_by)) {
    membershipRows.push({ user_id: trip.created_by, role: 'OWNER', status: 'APPROVED' });
  }
  if (!membershipRows.length) return [];
  const { data: profiles } = await supabase.from('trip_member_profiles').select('id, full_name, city, avatar_url, upi_id').in('id', membershipRows.map((member) => member.user_id));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return membershipRows.map((member) => {
    const profile = profileById.get(member.user_id);
    return { id: member.user_id, full_name: profile?.full_name || 'TripMate', city: profile?.city ?? null, avatar_url: profile?.avatar_url ?? null, upi_id: profile?.upi_id ?? null, role: member.role };
  });
}

export async function fetchTripLiveLocations(tripId: string): Promise<TripLiveLocation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trip_member_locations')
    .select('user_id, latitude, longitude, accuracy_meters, updated_at')
    .eq('trip_id', tripId)
    .eq('is_sharing', true)
    .gte('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
  if (error) { console.error('Failed to load shared locations', error); return []; }
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: profiles } = await supabase.from('trip_member_profiles')
    .select('id, full_name, avatar_url')
    .in('id', rows.map((row) => row.user_id));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    full_name: profileById.get(row.user_id)?.full_name || 'TripMate',
    avatar_url: profileById.get(row.user_id)?.avatar_url ?? null,
  })) as TripLiveLocation[];
}

export async function updateTripLiveLocation(tripId: string, position: { latitude: number; longitude: number; accuracy?: number }) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to share your location.') };
  const { error } = await supabase.from('trip_member_locations').upsert({
    trip_id: tripId,
    user_id: authData.user.id,
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy_meters: position.accuracy ?? null,
    is_sharing: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trip_id,user_id' });
  return { error };
}

export async function stopTripLiveLocation(tripId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to manage location sharing.') };
  const { error } = await supabase.from('trip_member_locations')
    .update({ is_sharing: false, updated_at: new Date().toISOString() })
    .eq('trip_id', tripId).eq('user_id', authData.user.id);
  return { error };
}

export function subscribeToTripLiveLocations(tripId: string, onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel(`trip-location-${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_member_locations', filter: `trip_id=eq.${tripId}` }, onChange)
    .subscribe();
  return () => { void supabase?.removeChannel(channel); };
}

export async function fetchTripItinerary(tripId: string): Promise<TripItineraryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trip_itinerary_items').select('*').eq('trip_id', tripId).order('starts_at', { ascending: true, nullsFirst: false });
  if (error) { console.error('Failed to fetch itinerary', error); return []; }
  return (data ?? []) as TripItineraryItem[];
}

export async function addTripItineraryItem(tripId: string, item: { title: string; details?: string; location?: string; startsAt?: string; endsAt?: string }) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to add itinerary items.') };
  const { error } = await supabase.from('trip_itinerary_items').insert({ trip_id: tripId, title: item.title.trim(), details: item.details?.trim() || null, location: item.location?.trim() || null, starts_at: item.startsAt || null, ends_at: item.endsAt || null, created_by: authData.user.id });
  return { error };
}

export async function fetchTripFiles(tripId: string): Promise<TripFile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('trip_files').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
  if (error) { console.error('Failed to fetch trip files', error); return []; }
  const files = (data ?? []) as TripFile[];
  const protectedFiles = await Promise.all(files.map(async (file) => {
    const storedPath = file.file_url.includes('/trip-files/')
      ? decodeURIComponent(file.file_url.split('/trip-files/').pop() || '')
      : file.file_url;
    const { data: signed, error: signedError } = await supabase!.storage.from('trip-files').createSignedUrl(storedPath, 60 * 60);
    return !signedError && signed?.signedUrl ? { ...file, file_url: signed.signedUrl } : file;
  }));
  return protectedFiles;
}

export async function addTripFile(tripId: string, file: File) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to upload a trip file.') };
  const objectPath = `${tripId}/${authData.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error: uploadError } = await supabase.storage.from('trip-files').upload(objectPath, file, { contentType: file.type || 'application/octet-stream' });
  if (uploadError) return { error: uploadError };
  const { error } = await supabase.from('trip_files').insert({ trip_id: tripId, name: file.name, file_url: objectPath, file_type: file.type || null, uploaded_by: authData.user.id });
  return { error };
}

export async function fetchTripExpenses(tripId: string): Promise<TripExpense[]> {
  if (!supabase) return [];
  const { data: expenses, error } = await supabase.from('trip_expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
  if (error || !expenses?.length) { if (error) console.error('Failed to fetch expenses', error); return []; }
  const expenseIds = expenses.map((expense) => expense.id);
  const [{ data: shares }, members] = await Promise.all([
    supabase.from('trip_expense_shares').select('expense_id, user_id, owed_amount, status').in('expense_id', expenseIds),
    fetchTripMembers(tripId),
  ]);
  const names = new Map(members.map((member) => [member.id, member.full_name]));
  const membersById = new Map(members.map((member) => [member.id, member]));
  return expenses.map((expense) => ({
    ...expense,
    payer_name: names.get(expense.paid_by) || 'TripMate',
    payer_upi_id: membersById.get(expense.paid_by)?.upi_id ?? null,
    shares: (shares ?? []).filter((share) => share.expense_id === expense.id).map((share) => ({ ...share, name: names.get(share.user_id) || 'TripMate' })),
  })) as TripExpense[];
}

export async function addTripExpense(tripId: string, input: { title: string; amount: number; category: string; splitMethod: 'EQUAL' | 'PERCENTAGE' | 'CUSTOM'; customShares?: Record<string, number> }) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to add an expense.') };
  const members = await fetchTripMembers(tripId);
  if (!members.length) return { error: new Error('No approved trip members are available to split this expense.') };
  if (input.splitMethod === 'CUSTOM') {
    const customCents = members.map((member) => {
      const share = input.customShares?.[member.id] ?? 0;
      return Number.isFinite(share) && share >= 0 ? Math.round(share * 100) : -1;
    });
    if (customCents.some((share) => share < 0) || customCents.reduce((sum, share) => sum + share, 0) !== Math.round(input.amount * 100)) {
      return { error: new Error('Custom member shares must be non-negative and add up to the expense total.') };
    }
  }
  const { data: expense, error } = await supabase.from('trip_expenses').insert({ trip_id: tripId, title: input.title.trim(), amount: input.amount, category: input.category, paid_by: authData.user.id, split_method: input.splitMethod }).select('id').single();
  if (error || !expense) return { error: error ?? new Error('Expense could not be created.') };
  const totalCents = Math.round(input.amount * 100);
  const baseCents = Math.floor(totalCents / members.length);
  const remainingCents = totalCents - baseCents * members.length;
  const shares = members.map((member, index) => ({
    expense_id: expense.id,
    user_id: member.id,
    owed_amount: input.splitMethod === 'CUSTOM'
      ? Number((input.customShares?.[member.id] ?? 0).toFixed(2))
      : (baseCents + (index < remainingCents ? 1 : 0)) / 100,
    status: member.id === authData.user.id ? 'PAID' : 'PENDING',
  }));
  const { error: shareError } = await supabase.from('trip_expense_shares').insert(shares);
  return { error: shareError };
}

export async function reportExpensePayment(expenseId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to report your payment.') };
  const { error } = await supabase.from('trip_expense_shares').update({ status: 'PAYMENT_REPORTED' })
    .eq('expense_id', expenseId).eq('user_id', authData.user.id).eq('status', 'PENDING');
  return { error };
}

export async function confirmExpensePayment(expenseId: string, userId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to confirm payment.') };
  const { error } = await supabase.from('trip_expense_shares').update({ status: 'PAID' })
    .eq('expense_id', expenseId).eq('user_id', userId).eq('status', 'PAYMENT_REPORTED');
  return { error };
}

export type WalletExpenseRow = {
  tripId: string;
  tripTitle: string;
  tripOwnerId: string;
  expense: TripExpense;
};

export async function fetchExpenseWallet(): Promise<WalletExpenseRow[]> {
  const client = supabase;
  if (!client) return [];
  const [joinedTrips, user] = await Promise.all([fetchMyTrips(), client.auth.getUser()]);
  const createdTrips = user.data.user ? await fetchTripsCreatedBy(user.data.user.id) : [];
  const trips = new Map<string, { id: string; name: string; ownerId: string }>();
  joinedTrips.filter((trip) => trip.joinStatus === 'joined').forEach((trip) => trips.set(trip.id, { id: trip.id, name: trip.name, ownerId: '' }));
  createdTrips.forEach((trip) => trips.set(trip.id, { id: trip.id, name: trip.title, ownerId: user.data.user?.id || '' }));
  const rows = await Promise.all([...trips.values()].map(async (trip) => ({ ...trip, expenses: await fetchTripExpenses(trip.id) })));
  return rows.flatMap((row) => row.expenses.map((expense) => ({ tripId: row.id, tripTitle: row.name, tripOwnerId: row.ownerId, expense })));
}

export async function fetchTripMessages(tripId: string): Promise<Array<{ id: string; senderId: string; from: string; avatar: string | null; text: string; time: string; self?: boolean }>> {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const { data: messages, error } = await supabase
    .from('trip_messages')
    .select('id, trip_id, sender_id, body, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load trip messages', error);
    return [];
  }

  const senderIds = [...new Set((messages ?? []).map((message) => message.sender_id))];
  const { data: profiles } = senderIds.length
    ? await supabase.from('trip_member_profiles').select('id, full_name, avatar_url').in('id', senderIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (messages ?? []).map((message) => ({
    id: message.id,
    senderId: message.sender_id,
    from: message.sender_id === authData.user.id ? 'You' : profileById.get(message.sender_id)?.full_name || 'TripMate',
    avatar: profileById.get(message.sender_id)?.avatar_url ?? null,
    text: message.body,
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.created_at)),
    self: message.sender_id === authData.user.id,
  }));
}

export async function sendTripMessage(tripId: string, body: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to send messages.') };

  const { error } = await supabase.from('trip_messages').insert({
    trip_id: tripId,
    sender_id: authData.user.id,
    body: body.trim(),
  });
  return { error };
}

export function subscribeToTripMessages(tripId: string, onMessage: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`trip-chat-${tripId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'trip_messages',
      filter: `trip_id=eq.${tripId}`,
    }, onMessage)
    .subscribe();

  return () => { void supabase?.removeChannel(channel); };
}

export async function fetchDirectMessages(peerId: string): Promise<Array<{ from: string; text: string; time: string; self?: boolean }>> {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const currentUser = authData.user;
  if (authError || !currentUser) return [];

  const { data: messages, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, recipient_id, body, created_at')
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to load direct messages', error);
    return [];
  }

  const senderIds = [...new Set((messages ?? []).map((message) => message.sender_id).filter((id) => id !== currentUser.id))];
  const { data: profiles } = senderIds.length
    ? await supabase.from('public_profiles').select('id, full_name').in('id', senderIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  return (messages ?? []).map((message) => ({
    from: message.sender_id === currentUser.id ? 'You' : names.get(message.sender_id) || 'TripMate',
    text: message.body,
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.created_at)),
    self: message.sender_id === currentUser.id,
  }));
}

export async function sendDirectMessage(recipientId: string, body: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to send messages.') };

  const { data: friendship, error: friendshipError } = await supabase.from('travel_requests')
    .select('id')
    .eq('request_type', 'MATCH')
    .eq('status', 'APPROVED')
    .or(`and(sender_id.eq.${authData.user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${authData.user.id})`)
    .maybeSingle();
  if (friendshipError || !friendship) return { error: new Error('You can message this traveler after they accept your friend request.') };

  const { error } = await supabase.from('direct_messages').insert({
    sender_id: authData.user.id,
    recipient_id: recipientId,
    body: body.trim(),
  });
  return { error };
}

export function subscribeToDirectMessages(onMessage: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel('direct-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, onMessage)
    .subscribe();
  return () => { void supabase?.removeChannel(channel); };
}

export async function getCurrentProfile() {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to load profile', error);
    return null;
  }

  return data;
}

export async function syncProfileFromAuth(fullName?: string, avatarUrl?: string) {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const currentUser = getCurrentUser();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authData.user.id,
        full_name: fullName || currentUser?.fullName || authData.user.email?.split('@')[0] || 'TripMate',
        email: authData.user.email || currentUser?.email || '',
        onboarding_complete: Boolean(authData.user.user_metadata?.onboarding_complete ?? currentUser?.onboardingComplete ?? false),
        avatar_url: currentUser?.avatar || avatarUrl || authData.user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to sync profile', error);
    return null;
  }

  return data;
}

type UserTripGroup = {
  id: string;
  name: string;
  place: string;
  date: string;
  members: number;
  accent: string;
  banner: string;
  lastMessage: string;
  unread: number;
  joinStatus: 'joined' | 'requested';
  messages: Array<{ from: string; text: string; time: string; self?: boolean }>;
};

export async function fetchMyTrips(): Promise<UserTripGroup[]> {
  const client = supabase;
  if (!client) {
    return [];
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    return [];
  }

  const { data, error } = await client
    .from('trip_members')
    .select('status, trip_id, trips:trip_id(*)')
    .eq('user_id', authData.user.id)
    .in('status', ['APPROVED', 'PENDING'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch trips', error);
    return [];
  }

  const rows = data ?? [];
  const groups: Array<UserTripGroup | null> = await Promise.all(
    rows.map(async (row): Promise<UserTripGroup | null> => {
      const relation: unknown = row.trips;
      const relatedTrip = Array.isArray(relation) ? relation[0] : relation;
      const trip = relatedTrip as (AppTrip & { start_date?: string | null; end_date?: string | null; description?: string | null }) | null;
      if (!trip) return null;

      const { count, error: countError } = await client
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip.id);

      if (countError) {
        console.error('Failed to count members', countError);
      }

      return {
        id: trip.id,
        name: trip.title,
        place: trip.destination,
        date: formatDateRange(trip.start_date ?? trip.startDate ?? null, trip.end_date ?? trip.endDate ?? null),
        members: count ?? 1,
        accent: '#10B981',
        banner: 'https://images.unsplash.com/photo-1566323124620-d22adb71d2a2?w=1200&h=300&fit=crop&auto=format',
        lastMessage: trip.description || 'Trip is ready for planning.',
        unread: 0,
        joinStatus: row.status === 'APPROVED' ? 'joined' : 'requested',
        messages: [],
      };
    }),
  );

  return groups.filter((group): group is UserTripGroup => group !== null);
}

export async function createTrip(draft: {
  title: string;
  shortDescription: string;
  destination?: string;
  city?: string;
  country?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  maxMembers?: number;
  visibility?: string;
  coverImage?: string;
  budgetAccommodation?: number;
  budgetTransport?: number;
  budgetFood?: number;
  budgetActivities?: number;
  budgetOther?: number;
  activities?: string[];
  genderPreference?: string;
  smokingFriendly?: boolean;
  drinkingFriendly?: boolean;
  foodPreference?: string;
}) {
  if (!supabase) {
    return { trip: null, error: new Error('Supabase is not configured.') };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { trip: null, error: new Error('You must be signed in to create a trip.') };
  }

  const destination = draft.destination || [draft.city, draft.state, draft.country].filter(Boolean).join(', ');
  const payload = {
    title: draft.title,
    destination: destination || 'TripMates destination',
    description: draft.shortDescription,
    category: draft.tripType === 'Travel Date' ? 'TRAVEL_DATE' : 'TRIP',
    trip_type: draft.tripType || null,
    start_date: draft.startDate || null,
    end_date: draft.endDate || null,
    status: 'OPEN',
    visibility: draft.visibility === 'Private' || draft.visibility === 'Invite Only' ? 'PRIVATE' : 'PUBLIC',
    max_members: draft.maxMembers || 8,
    cover_image: draft.coverImage || null,
    activities: draft.activities || [],
    budget_accommodation: draft.budgetAccommodation || 0,
    budget_transport: draft.budgetTransport || 0,
    budget_food: draft.budgetFood || 0,
    budget_activities: draft.budgetActivities || 0,
    budget_other: draft.budgetOther || 0,
    gender_preference: draft.genderPreference || 'Mixed',
    smoking_friendly: Boolean(draft.smokingFriendly),
    drinking_friendly: Boolean(draft.drinkingFriendly),
    food_preference: draft.foodPreference || 'Any',
    created_by: authData.user.id,
  };

  const { data, error } = await supabase.from('trips').insert(payload).select().single();

  if (error) {
    return { trip: null, error };
  }

  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: data.id,
      user_id: authData.user.id,
      role: 'OWNER',
      status: 'APPROVED',
    });

  if (memberError) {
    console.error('Trip created but owner membership failed', memberError);
  }

  return { trip: data, error: null };
}

export async function deleteTripAsOwner(tripId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to delete this trip.') };
  const { error } = await supabase.from('trips').delete().eq('id', tripId).eq('created_by', authData.user.id);
  return { error };
}

export async function removeTripMemberAsOwner(tripId: string, memberId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to manage trip members.') };
  if (authData.user.id === memberId) return { error: new Error('Trip owners cannot remove themselves. Delete the trip if it should be closed.') };
  const { error } = await supabase.from('trip_members')
    .update({ status: 'REJECTED' })
    .eq('trip_id', tripId)
    .eq('user_id', memberId)
    .eq('role', 'MEMBER')
    .eq('status', 'APPROVED');
  return { error };
}

export async function requestToJoinTrip(tripId: string) {
  if (!supabase) {
    return { success: false, error: new Error('Supabase is not configured.') };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: new Error('You must be signed in to join a trip.') };
  }

  const { error } = await supabase
    .from('trip_members')
    .upsert(
      {
        trip_id: tripId,
        user_id: authData.user.id,
        role: 'MEMBER',
        status: 'PENDING',
      },
      { onConflict: 'trip_id,user_id' },
    );

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

export type TripJoinRequest = {
  tripId: string;
  tripTitle: string;
  requesterId: string;
  requesterName: string;
  requesterCity: string | null;
  requesterAvatar: string | null;
  requestedAt: string;
};

export async function fetchTripJoinRequests(): Promise<TripJoinRequest[]> {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];
  const { data: trips, error: tripsError } = await supabase.from('trips').select('id, title').eq('created_by', authData.user.id);
  if (tripsError || !trips?.length) {
    if (tripsError) console.error('Failed to load owned trips', tripsError);
    return [];
  }
  const { data: requests, error } = await supabase.from('trip_members')
    .select('trip_id, user_id, created_at')
    .in('trip_id', trips.map((trip) => trip.id))
    .eq('status', 'PENDING')
    .eq('role', 'MEMBER')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load trip join requests', error);
    return [];
  }
  const requesterIds = [...new Set((requests ?? []).map((request) => request.user_id))];
  const profilesResult = requesterIds.length
    ? await supabase.from('public_profiles').select('id, full_name, city, avatar_url').in('id', requesterIds)
    : { data: [] };
  const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const ownedTripNames = new Map(trips.map((trip) => [trip.id, trip.title]));
  return (requests ?? []).map((request) => {
    const requester = names.get(request.user_id);
    return {
      tripId: request.trip_id,
      tripTitle: ownedTripNames.get(request.trip_id) || 'Trip group',
      requesterId: request.user_id,
      requesterName: requester?.full_name || 'TripMate',
      requesterCity: requester?.city ?? null,
      requesterAvatar: requester?.avatar_url ?? null,
      requestedAt: request.created_at,
    };
  });
}

export async function respondToTripJoinRequest(tripId: string, requesterId: string, accept: boolean) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Sign in to manage trip requests.') };
  const { error } = await supabase.from('trip_members')
    .update({ status: accept ? 'APPROVED' : 'REJECTED' })
    .eq('trip_id', tripId)
    .eq('user_id', requesterId)
    .eq('role', 'MEMBER')
    .eq('status', 'PENDING');
  return { error };
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return 'Flexible dates';
  if (!startDate) return endDate || 'Flexible dates';
  if (!endDate) return startDate;

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${startDate} → ${endDate}`;
    }

    const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
    return `${fmt.format(start)}–${fmt.format(end)}`;
  } catch {
    return `${startDate} → ${endDate}`;
  }
}
