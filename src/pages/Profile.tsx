import { useEffect, useRef, useState } from 'react';
import { getCurrentUser, updateCurrentUserProfile, useCurrentUser } from '../lib/auth';
import { fetchTripsCreatedBy, getCurrentProfile } from '../lib/supabaseData';
import { uploadImage } from '../lib/media';
import { supabase } from '../lib/supabase';

const INTEREST_OPTIONS = ['Trekking', 'Camping', 'Road Trips', 'Food Tours', 'Luxury Travel', 'Photography', 'Adventure Sports', 'Sightseeing', 'Scuba Diving', 'Yoga Retreats', 'Music Festivals', 'Nightlife'];
type ProfileForm = {
  fullName: string;
  age: number;
  city: string;
  travelPersonality: string;
  bio: string;
  lifestyle: Record<string, string>;
  interests: string[];
  budget: string;
  groupPreference: string;
  upiId: string;
};

type ProfileStory = { id: string; body: string; location: string | null; image_url: string | null; created_at: string };

function profileFormFrom(user: ReturnType<typeof useCurrentUser> | null | undefined): ProfileForm {
  return {
    fullName: user?.fullName ?? '',
    age: user?.age ?? 0,
    city: user?.city ?? '',
    travelPersonality: user?.travelPersonality ?? '',
    bio: user?.bio ?? '',
    lifestyle: user?.lifestyle ?? {},
    interests: user?.interests ?? [],
    budget: user?.budget ?? '',
    groupPreference: user?.groupPreference ?? '',
    upiId: user?.upiId ?? '',
  };
}

export default function Profile() {
  const currentUser = useCurrentUser();
  const [name, setName] = useState(currentUser?.fullName || 'TripMate');
  const [form, setForm] = useState<ProfileForm>(() => profileFormFrom(currentUser));
  const [editing, setEditing] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [storyDraft, setStoryDraft] = useState({ body: '', location: '' });
  const [storyActionBusy, setStoryActionBusy] = useState('');
  const [storiesExpanded, setStoriesExpanded] = useState(() => window.localStorage.getItem('tripmates-profile-stories-expanded') === 'true');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pointerOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const user = currentUser ?? getCurrentUser();
      if (!user) return;
      if (active) {
        setName(user.fullName);
        setForm(profileFormFrom(user));
      }
      const [profile, trips] = await Promise.all([getCurrentProfile(), fetchTripsCreatedBy(user.id)]);
      if (!active) return;
      setTripCount(trips.length);
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          if (active) setIdentityVerified(Boolean(user.identityVerified));
          const { data: ownStories, error: storiesError } = await supabase.from('community_posts')
            .select('id, body, location, image_url, created_at')
            .eq('author_id', authData.user.id)
            .order('created_at', { ascending: false });
          if (active && !storiesError) setStories((ownStories ?? []) as ProfileStory[]);
          if (storiesError) console.error('Could not load your community stories', storiesError);
        }
      }
      if (profile) {
        const updated: ProfileForm = {
          ...profileFormFrom(user),
          fullName: user.fullName || profile.full_name || '',
          age: user.age || profile.age || 0,
          city: user.city || profile.city || '',
          bio: user.bio || profile.bio || '',
          travelPersonality: user.travelPersonality || profile.travel_personality || '',
          lifestyle: profile.lifestyle || user.lifestyle || {},
          interests: profile.interests || user.interests || [],
          budget: profile.budget || user.budget || '',
          groupPreference: profile.group_preference || user.groupPreference || '',
          upiId: user.upiId || profile.upi_id || '',
        };
        setForm(updated);
        setName(updated.fullName || 'TripMate');
      }
    };
    void load();
    return () => { active = false; };
  }, [currentUser]);

  const toggleInterest = (interest: string) => setForm((previous) => ({
    ...previous,
    interests: previous.interests.includes(interest)
      ? previous.interests.filter((item) => item !== interest)
      : [...previous.interests, interest],
  }));

  const save = async () => {
    setSaving(true);
    setError('');
    const updated = await updateCurrentUserProfile({
      fullName: form.fullName.trim(),
      age: form.age || undefined,
      city: form.city.trim(),
      travelPersonality: form.travelPersonality.trim(),
      bio: form.bio.trim(),
      lifestyle: form.lifestyle,
      interests: form.interests,
      budget: form.budget,
      groupPreference: form.groupPreference,
      upiId: form.upiId.trim(),
    });
    setSaving(false);
    if (!updated) {
      setError('Profile could not be saved.');
      return;
    }
    setName(updated.fullName);
    setEditing(false);
  };

  const startStoryEdit = (story: ProfileStory) => {
    setEditingStoryId(story.id);
    setStoryDraft({ body: story.body, location: story.location || '' });
  };

  const saveStory = async (storyId: string) => {
    if (!supabase || !storyDraft.body.trim()) return;
    setStoryActionBusy(storyId);
    const { data, error: updateError } = await supabase.from('community_posts').update({ body: storyDraft.body.trim(), location: storyDraft.location.trim() || null }).eq('id', storyId).select('id, body, location, image_url, created_at').single();
    setStoryActionBusy('');
    if (updateError) { setError(updateError.message); return; }
    setStories((current) => current.map((story) => story.id === storyId ? data as ProfileStory : story));
    setEditingStoryId(null);
  };

  const deleteStory = async (story: ProfileStory) => {
    if (!supabase || !window.confirm('Delete this community story? This cannot be undone.')) return;
    setStoryActionBusy(story.id);
    const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', story.id);
    setStoryActionBusy('');
    if (deleteError) { setError(deleteError.message); return; }
    setStories((current) => current.filter((item) => item.id !== story.id));
    setEditingStoryId(null);
  };

  const handleAvatarSelection = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result));
      setCropZoom(1);
      setDragOffset({ x: 0, y: 0 });
      setAvatarUploadOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedAvatar = async () => {
    if (!avatarPreview) return;
    const image = new Image();
    image.src = avatarPreview;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The selected image could not be read.'));
    });

    const canvas = document.createElement('canvas');
    const size = 420;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setAvatarSaving(true);
    setError('');
    try {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom;
      const pixelsPerPreviewUnit = cropSize / size;
      const maxX = image.naturalWidth - cropSize;
      const maxY = image.naturalHeight - cropSize;
      const sourceX = Math.max(0, Math.min(maxX, (image.naturalWidth - cropSize) / 2 - dragOffset.x * pixelsPerPreviewUnit));
      const sourceY = Math.max(0, Math.min(maxY, (image.naturalHeight - cropSize) / 2 - dragOffset.y * pixelsPerPreviewUnit));
      ctx.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('The profile photo could not be processed.');
      const file = new File([blob], 'tripmates-avatar.jpg', { type: 'image/jpeg' });
      const avatarUrl = await uploadImage(file, 'avatars');
      const updated = await updateCurrentUserProfile({ avatar: avatarUrl });
      if (!updated) throw new Error('Profile photo could not be saved.');

      setAvatarUploadOpen(false);
      setAvatarPreview(null);
      setName(updated.fullName);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Profile photo could not be saved.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = event.clientX - pointerOrigin.current.x;
    const deltaY = event.clientY - pointerOrigin.current.y;
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    setDragOffset((current) => ({ x: current.x + deltaX / 2, y: current.y + deltaY / 2 }));
  };

  const handlePointerUp = () => setIsDragging(false);

  const summary = [form.travelPersonality, form.interests.slice(0, 2).join(', '), form.budget].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <section className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-700 to-sky-700 p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white/80 bg-white/20 text-4xl font-bold text-white shadow-lg transition hover:scale-[1.01]">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span>{name.charAt(0).toUpperCase()}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-xs font-medium opacity-0 transition group-hover:opacity-100">Edit</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarSelection(event.target.files?.[0] ?? null)} />
            <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold">{name}</h1>{identityVerified && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">✓ Identity verified</span>}</div><p className="mt-1 text-white/80">{summary || 'Complete your travel profile'}{form.city ? ` · ${form.city}` : ''}</p></div>
            <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel' : 'Edit profile'}</button>
          </div>
        </section>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-sm text-slate-500">Trips created</div><div className="mt-1 text-2xl font-bold">{tripCount}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-sm text-slate-500">Travel interests</div><div className="mt-1 text-2xl font-bold">{form.interests.length}</div></div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <button type="button" aria-expanded={storiesExpanded} onClick={() => { setStoriesExpanded((expanded) => { window.localStorage.setItem('tripmates-profile-stories-expanded', String(!expanded)); return !expanded; }); }} className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block text-base font-bold">Your travel stories</span><span className="mt-1 block text-xs text-slate-500">{storiesExpanded ? 'Stories you’ve shared with the Community.' : 'Expand to view, edit, or delete your posts.'}</span></span><span className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{stories.length}</span><span className="text-slate-500 transition-transform" style={{ transform: storiesExpanded ? 'rotate(180deg)' : 'none' }}>⌄</span></span></button>
          {storiesExpanded && (!stories.length ? <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Your Community posts will appear here after you publish them.</div> : <div className="mt-4 space-y-3">{stories.map((story) => <article key={story.id} className="rounded-2xl border border-slate-200 p-4">
            {editingStoryId === story.id ? <div className="space-y-3"><textarea value={storyDraft.body} onChange={(event) => setStoryDraft((current) => ({ ...current, body: event.target.value }))} maxLength={4000} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><input value={storyDraft.location} onChange={(event) => setStoryDraft((current) => ({ ...current, location: event.target.value }))} maxLength={160} placeholder="Location (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingStoryId(null)} className="btn-outline px-3 py-2 text-xs">Cancel</button><button type="button" disabled={storyActionBusy === story.id || !storyDraft.body.trim()} onClick={() => void saveStory(story.id)} className="btn-primary px-3 py-2 text-xs disabled:opacity-50">{storyActionBusy === story.id ? 'Saving…' : 'Save story'}</button></div></div> : <><div className="flex items-start justify-between gap-3"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{story.body}</p><div className="flex shrink-0 gap-2"><button type="button" onClick={() => startStoryEdit(story)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button><button type="button" disabled={storyActionBusy === story.id} onClick={() => void deleteStory(story)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{storyActionBusy === story.id ? 'Deleting…' : 'Delete'}</button></div></div>{story.location && <div className="mt-2 text-xs text-slate-500">📍 {story.location}</div>}{story.image_url && <img src={story.image_url} alt="Community story" className="mt-3 max-h-56 w-full rounded-xl object-cover"/>}<time className="mt-3 block text-[11px] text-slate-400">{new Date(story.created_at).toLocaleString()}</time></>}
          </article>)}</div>)}
        </section>

        {avatarUploadOpen && avatarPreview && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Crop profile photo</div>
                <div className="text-xs text-slate-500">Zoom, drag and keep the portion you want.</div>
              </div>
              <button type="button" onClick={() => setAvatarUploadOpen(false)} className="text-sm text-slate-600">Close</button>
            </div>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <div className="relative mx-auto aspect-square w-full max-w-[420px] cursor-grab overflow-hidden rounded-[24px] bg-slate-200" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                  <img src={avatarPreview} alt="Crop preview" className="absolute inset-0 h-full w-full object-cover" style={{ transform: `scale(${cropZoom}) translate(${dragOffset.x}px, ${dragOffset.y}px)`, transition: isDragging ? 'none' : 'transform 150ms ease' }} />
                  <div className="pointer-events-none absolute inset-0 m-auto h-[70%] w-[70%] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Zoom
                  <input type="range" min="1" max="3" step="0.1" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} className="mt-2 w-full accent-emerald-500" />
                </label>
                <button type="button" disabled={avatarSaving} onClick={() => void saveCroppedAvatar()} className="btn-primary w-full justify-center disabled:opacity-50">{avatarSaving ? 'Uploading…' : 'Save photo'}</button>
                <button type="button" disabled={avatarSaving} onClick={() => { setAvatarUploadOpen(false); setAvatarPreview(null); }} className="btn-outline w-full justify-center disabled:opacity-50">Discard</button>
              </div>
            </div>
          </div>
        )}

        {editing && <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-5 text-lg font-bold">Edit profile</h2>
          {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Full name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
            <label className="text-sm font-medium">Age<input type="number" min="18" value={form.age || ''} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
            <label className="text-sm font-medium">City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
            <label className="text-sm font-medium">Travel style<input value={form.travelPersonality} onChange={(event) => setForm({ ...form, travelPersonality: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
            <label className="text-sm font-medium">Budget<select value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"><option value="">Choose a budget</option><option value="budget">Budget</option><option value="moderate">Moderate</option><option value="luxury">Luxury</option></select></label>
            <label className="text-sm font-medium">UPI ID<input value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} placeholder="name@bank" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          </div>
          <label className="mt-4 block text-sm font-medium">About<textarea rows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
          <div className="mt-5"><div className="mb-3 text-sm font-medium">Interests</div><div className="flex flex-wrap gap-2">{INTEREST_OPTIONS.map((interest) => <button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`rounded-full border px-3 py-2 text-sm ${form.interests.includes(interest) ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{interest}</button>)}</div></div>
          <div className="mt-6 flex justify-end"><button disabled={saving} className="btn-primary px-5 py-3 text-sm disabled:opacity-50" onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </section>}

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-bold">About</h2><p className="text-sm leading-relaxed text-slate-600">{form.bio || 'No profile summary added yet.'}</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-bold">Travel preferences</h2><div className="space-y-2 text-sm"><p>Budget: <span className="font-medium">{form.budget || 'Not set'}</span></p>{Object.entries(form.lifestyle).filter(([, value]) => Boolean(value)).map(([key, value]) => <p key={key} className="capitalize">{key}: <span className="font-medium">{value}</span></p>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2"><h2 className="mb-4 font-bold">Interests</h2><div className="flex flex-wrap gap-2">{form.interests.length ? form.interests.map((interest) => <span key={interest} className="tag">{interest}</span>) : <span className="text-sm text-slate-500">No interests added yet.</span>}</div></section>
        </div>
      </div>
    </div>
  );
}
