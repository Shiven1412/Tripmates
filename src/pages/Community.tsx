import { useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createUploadId } from '../lib/ids';

type CommunityPost = {
  id: string;
  author_id: string;
  body: string;
  location: string | null;
  image_url: string | null;
  created_at: string;
  author_name: string;
  avatar_url: string | null;
  likes: number;
  comments: Array<{ id: string; author_name: string; body: string; created_at: string }>;
  liked: boolean;
};

export default function Community() {
  const user = useCurrentUser();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    if (!supabase) { setPosts([]); setLoading(false); return; }
    const { data: authData } = await supabase.auth.getUser();
    const currentId = authData.user?.id;
    const { data: rows, error: postsError } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
    if (postsError) { console.error(postsError); setError(postsError.message); setLoading(false); return; }
    const postIds = (rows ?? []).map((row) => row.id);
    const authorIds = [...new Set((rows ?? []).map((row) => row.author_id))];
    const [profilesResult, likesResult, commentsResult] = await Promise.all([
      authorIds.length ? supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', authorIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from('community_post_likes').select('post_id, user_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from('community_comments').select('id, post_id, author_id, body, created_at').in('post_id', postIds).order('created_at') : Promise.resolve({ data: [] }),
    ]);
    const commenters = [...new Set((commentsResult.data ?? []).map((comment) => comment.author_id))];
    const commenterProfiles = commenters.length ? await supabase.from('public_profiles').select('id, full_name').in('id', commenters) : { data: [] };
    const names = new Map([...(profilesResult.data ?? []), ...(commenterProfiles.data ?? [])].map((profile) => [profile.id, profile.full_name]));
    const avatars = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.avatar_url]));
    const nextPosts = (rows ?? []).map((post) => {
      const postLikes = (likesResult.data ?? []).filter((like) => like.post_id === post.id);
      return {
        ...post,
        author_name: names.get(post.author_id) || 'TripMate',
        avatar_url: avatars.get(post.author_id) || null,
        likes: postLikes.length,
        liked: Boolean(currentId && postLikes.some((like) => like.user_id === currentId)),
        comments: (commentsResult.data ?? []).filter((comment) => comment.post_id === post.id).map((comment) => ({
          id: comment.id, author_name: names.get(comment.author_id) || 'TripMate', body: comment.body, created_at: comment.created_at,
        })),
      } as CommunityPost;
    });
    setPosts(nextPosts);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const preview = URL.createObjectURL(imageFile);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [imageFile]);

  const createPost = async () => {
    if (!supabase || !user || !body.trim()) return;
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    setPosting(true); setError('');
    let imageUrl: string | null = null;
    if (imageFile) {
      setUploadingImage(true);
      const filePath = `${user.id}/${createUploadId()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error: uploadError } = await supabase.storage.from('community-images').upload(filePath, imageFile, { upsert: false, contentType: imageFile.type });
      setUploadingImage(false);
      if (uploadError) { setPosting(false); setError(`Image upload failed: ${uploadError.message}. Create the public community-images storage bucket and apply its policies.`); return; }
      imageUrl = supabase.storage.from('community-images').getPublicUrl(filePath).data.publicUrl;
    }
    const { error: insertError } = await supabase.from('community_posts').insert({ author_id: user.id, body: body.trim(), location: location.trim() || null, image_url: imageUrl });
    setPosting(false);
    if (insertError) { setError(insertError.message); return; }
    setBody(''); setLocation(''); setImageFile(null);
    if (imageInput.current) imageInput.current.value = '';
    await loadPosts();
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!supabase || !user) return;
    const result = post.liked
      ? await supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: user.id });
    if (result.error) { setError(result.error.message); return; }
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: !post.liked, likes: item.likes + (post.liked ? -1 : 1) } : item));
  };

  const addComment = async (postId: string) => {
    if (!supabase || !user) return;
    const comment = commentDrafts[postId]?.trim();
    if (!comment) return;
    const { error: commentError } = await supabase.from('community_comments').insert({ post_id: postId, author_id: user.id, body: comment });
    if (commentError) { setError(commentError.message); return; }
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    await loadPosts();
  };

  const ago = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-16 md:pb-8"><div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between"><div><p className="tag mb-2">Travel stories & tips</p><h1 className="text-3xl font-bold">Community</h1></div></div>
      <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5">
        <textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share a travel story, tip, or question with the community…" className="w-full resize-none text-sm outline-none" />
        <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file && file.size > 5 * 1024 * 1024) { setError('Choose an image smaller than 5 MB.'); event.target.value = ''; return; }
          setError('');
          setImageFile(file);
        }} />
        {imagePreview && <div className="relative mt-3 w-fit"><img src={imagePreview} alt="Selected post preview" className="max-h-56 max-w-full rounded-xl object-cover" /><button aria-label="Remove selected image" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white" onClick={() => { setImageFile(null); if (imageInput.current) imageInput.current.value = ''; }}>Remove</button></div>}
        <div className="mt-3 flex flex-wrap gap-3"><button className="btn-outline px-3 py-2 text-sm" onClick={() => imageInput.current?.click()}>{imageFile ? 'Change image' : '📷 Add photo'}</button><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Add a location (optional)" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={!body.trim() || posting} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50" onClick={() => void createPost()}>{uploadingImage ? 'Uploading image…' : posting ? 'Posting…' : 'Share story'}</button></div>
      </section>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading community posts…</div> : !posts.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><div className="mb-3 text-4xl">🌍</div><h2 className="font-bold">Start the conversation</h2><p className="mt-2 text-sm text-slate-500">Your story will be the first post in the community feed.</p></div> : <div className="space-y-4">{posts.map((post) => <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-5">
        <header className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-bold text-emerald-800">{post.avatar_url ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover" /> : post.author_name.charAt(0)}</div><div><div className="font-semibold">{post.author_name}</div><div className="text-xs text-slate-500">{post.location ? `📍 ${post.location} · ` : ''}{ago(post.created_at)}</div></div></header>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{post.body}</p>
        {post.image_url && <img src={post.image_url} alt="Community post" className="mt-4 max-h-80 w-full rounded-2xl object-cover" />}
        <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3"><button onClick={() => void toggleLike(post)} className={`text-sm font-medium ${post.liked ? 'text-rose-600' : 'text-slate-600'}`}>{post.liked ? '♥ Liked' : '♡ Like'} · {post.likes}</button><button aria-expanded={openComments === post.id} onClick={() => setOpenComments((current) => current === post.id ? null : post.id)} className="text-sm font-medium text-slate-600">💬 {openComments === post.id ? 'Hide comments' : `Comments (${post.comments.length})`}</button></div>
        {openComments === post.id && <section aria-label={`Comments for ${post.author_name}'s post`} className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">{post.comments.length ? post.comments.map((comment) => <div key={comment.id} className="rounded-xl bg-white px-3 py-2 text-sm"><div className="mb-0.5 flex items-center justify-between gap-2"><span className="font-semibold">{comment.author_name}</span><time className="text-[10px] text-slate-400">{ago(comment.created_at)}</time></div><p className="whitespace-pre-wrap">{comment.body}</p></div>) : <p className="py-5 text-center text-sm text-slate-500">No comments yet. Start the conversation.</p>}</div><div className="mt-3 flex gap-2"><input value={commentDrafts[post.id] ?? ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onKeyDown={(event) => { if (event.key === 'Enter') void addComment(post.id); }} /><button className="btn-outline px-3 py-2 text-xs" onClick={() => void addComment(post.id)}>Comment</button></div></section>}
      </article>)}</div>}
    </div></div>
  );
}
