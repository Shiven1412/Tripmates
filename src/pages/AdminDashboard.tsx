import { useCallback, useEffect, useState } from 'react';
import { adminMetrics, creatorTrips, marketplaceItems } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { getCurrentUser, setCurrentUser } from '../lib/auth';

type VerificationSubmission = {
  id: string;
  user_id: string;
  legal_name: string;
  aadhaar_last4: string;
  aadhaar_image_path: string;
  selfie_image_path: string;
  submitted_at: string;
};

type ReviewSubmission = VerificationSubmission & { aadhaarUrl: string; selfieUrl: string };

export default function AdminDashboard() {
  const [verificationQueue, setVerificationQueue] = useState<ReviewSubmission[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const loadVerificationQueue = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setVerificationError('Supabase is not configured.');
      setVerificationLoading(false);
      return;
    }
    setVerificationLoading(true);
    const { data, error } = await client
      .from('identity_verifications')
      .select('id, user_id, legal_name, aadhaar_last4, aadhaar_image_path, selfie_image_path, submitted_at')
      .eq('status', 'PENDING')
      .order('submitted_at', { ascending: true });
    if (error) {
      setVerificationError(error.message);
      setVerificationQueue([]);
      setVerificationLoading(false);
      return;
    }

    const signed = await Promise.all((data ?? []).map(async (item) => {
      const [aadhaar, selfie] = await Promise.all([
        client.storage.from('identity-verification').createSignedUrl(item.aadhaar_image_path, 300),
        client.storage.from('identity-verification').createSignedUrl(item.selfie_image_path, 300),
      ]);
      if (aadhaar.error || selfie.error || !aadhaar.data?.signedUrl || !selfie.data?.signedUrl) return null;
      return { ...item, aadhaarUrl: aadhaar.data.signedUrl, selfieUrl: selfie.data.signedUrl } as ReviewSubmission;
    }));
    setVerificationQueue(signed.filter((item): item is ReviewSubmission => item !== null));
    setVerificationError(signed.some((item) => item === null) ? 'One or more private image links could not be generated. Refresh the queue or check Storage policies.' : '');
    setVerificationLoading(false);
  }, []);

  useEffect(() => { void loadVerificationQueue(); }, [loadVerificationQueue]);

  const reviewVerification = async (submission: ReviewSubmission, status: 'APPROVED' | 'REJECTED') => {
    if (!supabase) return;
    setReviewingId(submission.id);
    setVerificationError('');
    const { error } = await supabase.from('identity_verifications').update({
      status,
      reviewer_note: reviewNote[submission.id]?.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', submission.id);
    if (error) {
      setVerificationError(error.message);
    } else {
      if (status === 'APPROVED') {
        const user = getCurrentUser();
        if (user?.id === submission.user_id) setCurrentUser({ ...user, identityVerified: true });
      }
      setVerificationQueue((current) => current.filter((item) => item.id !== submission.id));
    }
    setReviewingId('');
  };

  const cards = [
    { label: 'Users', value: adminMetrics.totalUsers.toLocaleString(), accent: '#3B82F6' },
    { label: 'Active Trips', value: adminMetrics.activeTrips.toLocaleString(), accent: '#10B981' },
    { label: 'Verification Queue', value: verificationLoading ? '…' : String(verificationQueue.length), accent: '#F59E0B' },
    { label: 'Reports', value: adminMetrics.pendingReports.toString(), accent: '#EF4444' },
  ];

  return (
    <div className="pt-16 pb-24 md:pb-8 min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <p className="tag mb-2">Admin Dashboard</p>
          <h1 className="font-bold text-3xl">Operations and platform health</h1>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F3F4F6' }}>
              <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>{card.label}</div>
              <div className="font-bold text-3xl" style={{ color: card.accent }}>{card.value}</div>
            </div>
          ))}
        </div>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold text-slate-900">Identity verification review</h2><p className="mt-1 text-sm text-slate-500">Private Aadhaar and selfie images; signed preview links expire after five minutes.</p></div>
            <button type="button" onClick={() => void loadVerificationQueue()} disabled={verificationLoading} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{verificationLoading ? 'Refreshing…' : 'Refresh queue'}</button>
          </div>
          {verificationError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{verificationError}</p>}
          {verificationLoading ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Loading pending identity reviews…</p> : verificationQueue.length ? <div className="space-y-5">{verificationQueue.map((submission) => <article key={submission.id} className="rounded-2xl border border-slate-200 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{submission.legal_name}</h3><p className="mt-1 text-xs text-slate-500">Aadhaar ending •••• {submission.aadhaar_last4} · {new Date(submission.submitted_at).toLocaleString()}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending</span></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><a href={submission.aadhaarUrl} target="_blank" rel="noreferrer" className="group">{submission.aadhaar_image_path.toLowerCase().endsWith('.pdf') ? <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-center"><span className="text-4xl">📄</span><span className="mt-2 text-sm font-semibold text-slate-800">Aadhaar PDF</span><span className="mt-1 text-xs text-emerald-700">Open secure document ↗</span></div> : <img src={submission.aadhaarUrl} alt="Private Aadhaar document preview" className="h-56 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"/>}<span className="mt-2 block text-xs font-medium text-slate-600">Aadhaar document · secure link</span></a><a href={submission.selfieUrl} target="_blank" rel="noreferrer" className="group"><img src={submission.selfieUrl} alt="Private verification selfie preview" className="h-56 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"/><span className="mt-2 block text-xs font-medium text-slate-600">Verification selfie · secure link</span></a></div>
            <label className="mt-4 block text-xs font-medium text-slate-600">Review note<input value={reviewNote[submission.id] ?? ''} onChange={(event) => setReviewNote((current) => ({ ...current, [submission.id]: event.target.value }))} maxLength={500} placeholder="Optional note, visible to the applicant if rejected" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={Boolean(reviewingId)} onClick={() => void reviewVerification(submission, 'REJECTED')} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">{reviewingId === submission.id ? 'Saving…' : 'Reject'}</button><button type="button" disabled={Boolean(reviewingId)} onClick={() => void reviewVerification(submission, 'APPROVED')} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{reviewingId === submission.id ? 'Saving…' : 'Approve verification'}</button></div>
          </article>)}</div> : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No identity submissions are waiting for review.</p>}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Only authenticated ADMIN accounts can see this queue or review the documents. Verify identity using your organization’s authorized process before approving; do not download or retain copies unnecessarily.</p>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-5 border" style={{ borderColor: '#F3F4F6' }}>
            <h3 className="font-bold text-lg mb-4">Creator Trips</h3>
            <div className="space-y-4">
              {creatorTrips.map((trip) => (
                <div key={trip.id} className="p-4 rounded-2xl" style={{ background: '#F9FAFB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{trip.title}</div>
                    <span className="tag text-[10px]">{trip.category}</span>
                  </div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>by {trip.creator} · {trip.audience.toLocaleString()} audience</div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span>Revenue</span>
                    <span className="font-semibold">{trip.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border" style={{ borderColor: '#F3F4F6' }}>
            <h3 className="font-bold text-lg mb-4">Marketplace</h3>
            <div className="space-y-3">
              {marketplaceItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: '#F9FAFB' }}>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>{item.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{item.price.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: '#F59E0B' }}>⭐ {item.rating}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
