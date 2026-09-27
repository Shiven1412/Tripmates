import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../lib/auth';
import { prepareImageUpload } from '../lib/media';
import { createUploadId } from '../lib/ids';

const BUCKET = 'identity-verification';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type VerificationRecord = {
  id: string;
  legal_name: string;
  aadhaar_last4: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_note: string | null;
  submitted_at: string;
};

function makeObjectPath(userId: string, kind: 'aadhaar' | 'selfie', file: File) {
  const extension = file.type === 'application/pdf' ? 'pdf' : 'jpg';
  return `${userId}/${kind}/${createUploadId()}.${extension}`;
}

export default function Verification() {
  const user = useCurrentUser();
  const aadhaarInput = useRef<HTMLInputElement | null>(null);
  const selfieInput = useRef<HTMLInputElement | null>(null);
  const [legalName, setLegalName] = useState(user?.fullName ?? '');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase || !user) {
        setLoading(false);
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError('Sign in with your Supabase account to submit identity documents securely.');
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('identity_verifications')
        .select('id, legal_name, aadhaar_last4, status, reviewer_note, submitted_at')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      if (data) {
        setRecord(data as VerificationRecord);
        setLegalName(data.legal_name);
        setAadhaarLast4(data.aadhaar_last4);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  const selectImage = (file: File | undefined, kind: 'aadhaar' | 'selfie') => {
    if (!file) return;
    setError('');
    const isAadhaarPdf = kind === 'aadhaar' && file.type === 'application/pdf';
    if (!file.type.startsWith('image/') && !isAadhaarPdf) {
      setError(kind === 'aadhaar' ? 'Upload a PDF or a JPG, PNG, or WebP image.' : 'Upload a JPG, PNG, or WebP selfie image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Each image must be 10MB or smaller.');
      return;
    }
    if (kind === 'aadhaar') setAadhaarFile(file);
    else setSelfieFile(file);
  };

  const submit = async () => {
    setError('');
    setNotice('');
    if (!supabase) {
      setError('Supabase is not configured. Identity verification is unavailable.');
      return;
    }
    if (!user) {
      setError('Sign in before submitting identity verification.');
      return;
    }
    if (legalName.trim().length < 2) {
      setError('Enter your name as it appears on your Aadhaar.');
      return;
    }
    if (!/^\d{4}$/.test(aadhaarLast4)) {
      setError('Enter only the last four digits of your Aadhaar number.');
      return;
    }
    if (!aadhaarFile || !selfieFile) {
      setError('Upload both the Aadhaar image and a clear selfie to continue.');
      return;
    }
    if (!consent) {
      setError('Confirm that you consent to secure storage and manual review of these documents.');
      return;
    }

    setSubmitting(true);
    const uploadedPaths: string[] = [];
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Your secure Supabase session has expired. Sign in again.');
      const ownerId = authData.user.id;
      const previousPaths = record
        ? await supabase.from('identity_verifications').select('aadhaar_image_path, selfie_image_path').eq('id', record.id).maybeSingle()
        : { data: null, error: null };
      if (previousPaths.error) throw previousPaths.error;
      const [aadhaarPrepared, selfiePrepared] = await Promise.all([
        aadhaarFile.type === 'application/pdf' ? Promise.resolve(aadhaarFile) : prepareImageUpload(aadhaarFile, 1800),
        prepareImageUpload(selfieFile, 1200),
      ]);
      const aadhaarPath = makeObjectPath(ownerId, 'aadhaar', aadhaarFile);
      const selfiePath = makeObjectPath(ownerId, 'selfie', selfieFile);
      const aadhaarUpload = await supabase.storage.from(BUCKET).upload(aadhaarPath, aadhaarPrepared, { contentType: aadhaarPrepared.type, cacheControl: '0', upsert: false });
      if (aadhaarUpload.error) throw aadhaarUpload.error;
      uploadedPaths.push(aadhaarPath);
      const selfieUpload = await supabase.storage.from(BUCKET).upload(selfiePath, selfiePrepared, { contentType: selfiePrepared.type, cacheControl: '0', upsert: false });
      if (selfieUpload.error) throw selfieUpload.error;
      uploadedPaths.push(selfiePath);

      const submission = {
        user_id: ownerId,
        legal_name: legalName.trim(),
        document_type: 'AADHAAR',
        aadhaar_last4: aadhaarLast4,
        aadhaar_image_path: aadhaarPath,
        selfie_image_path: selfiePath,
        status: 'PENDING',
        reviewer_note: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
      };
      const write = record
        ? await supabase.from('identity_verifications').update(submission).eq('id', record.id).select('id, legal_name, aadhaar_last4, status, reviewer_note, submitted_at').single()
        : await supabase.from('identity_verifications').insert(submission).select('id, legal_name, aadhaar_last4, status, reviewer_note, submitted_at').single();
      if (write.error) throw write.error;

      // Old files are private and user-scoped. New paths are persisted before cleanup.
      if (previousPaths.data) {
        const stale = [previousPaths.data.aadhaar_image_path, previousPaths.data.selfie_image_path].filter((path): path is string => Boolean(path) && !uploadedPaths.includes(path));
        if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
      }

      setRecord(write.data as VerificationRecord);
      setAadhaarFile(null);
      setSelfieFile(null);
      if (aadhaarInput.current) aadhaarInput.current.value = '';
      if (selfieInput.current) selfieInput.current.value = '';
      setNotice('Your documents were uploaded to private Supabase Storage and your request is pending review.');
    } catch (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
      const message = uploadError instanceof Error ? uploadError.message : 'Could not submit verification. Please try again.';
      setError(message.toLowerCase().includes('bucket not found') ? 'The private identity-verification storage bucket is missing. Apply the latest User/supabase/schema.sql in Supabase SQL Editor.' : message);
    } finally {
      setSubmitting(false);
    }
  };

  const canResubmit = !record || record.status !== 'APPROVED';
  const statusStyles = record?.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : record?.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-24 md:px-6 md:pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <span className="tag">Trust & safety</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Get verified</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Submit your Aadhaar image and a current selfie for manual identity review. Your documents are stored in a private Supabase bucket, accessible to your account and authorized reviewers only, and are not exposed on your public profile.</p>
        </div>

        {record && <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification status</div><div className="mt-1 text-sm text-slate-700">Aadhaar ending in •••• {record.aadhaar_last4} · submitted {new Date(record.submitted_at).toLocaleDateString()}</div>{record.reviewer_note && <p className="mt-2 text-sm text-slate-600">Reviewer note: {record.reviewer_note}</p>}</div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyles}`}>{record.status === 'APPROVED' ? 'Verified' : record.status === 'REJECTED' ? 'Needs changes' : 'Pending review'}</span>
        </section>}

        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading your verification status…</div> : <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Name as shown on Aadhaar<input value={legalName} onChange={(event) => setLegalName(event.target.value)} autoComplete="name" disabled={!canResubmit || submitting} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 disabled:bg-slate-100" /></label>
            <label className="text-sm font-medium text-slate-700">Aadhaar last four digits<input value={aadhaarLast4} onChange={(event) => setAadhaarLast4(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="off" disabled={!canResubmit || submitting} placeholder="1234" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 disabled:bg-slate-100" /></label>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input ref={aadhaarInput} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], 'aadhaar')} />
              <div className="text-sm font-semibold text-slate-800">Aadhaar document</div><p className="mt-1 text-xs text-slate-500">Upload a PDF or a clear image. Mask the first 8 digits before upload if possible.</p>
              <button type="button" disabled={!canResubmit || submitting} onClick={() => aadhaarInput.current?.click()} className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{aadhaarFile?.name || 'Choose Aadhaar PDF or image'}</button>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input ref={selfieInput} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(event) => selectImage(event.target.files?.[0], 'selfie')} />
              <div className="text-sm font-semibold text-slate-800">Current selfie</div><p className="mt-1 text-xs text-slate-500">Use a well-lit, unfiltered photo with your face clearly visible.</p>
              <button type="button" disabled={!canResubmit || submitting} onClick={() => selfieInput.current?.click()} className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{selfieFile?.name || 'Choose or take selfie'}</button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><strong>Privacy notice:</strong> TripMates stores these images in private Supabase Storage. Access is limited to your account and authorized reviewers. Do not upload the full Aadhaar number when a masked copy is available. This submission is not automatic government identity validation; an authorized review must approve it before your account is marked verified.</div>
          {canResubmit && <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={submitting} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"/><span>I consent to TripMates securely storing these images in private Supabase Storage and allowing authorized reviewers to access them for identity verification. I understand that I should upload a masked Aadhaar copy where possible.</span></label>}
          {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}
          {canResubmit && <div className="mt-6 flex justify-end"><button type="button" disabled={submitting} onClick={() => void submit()} className="btn-primary px-6 py-3 disabled:opacity-50">{submitting ? 'Uploading securely…' : record ? 'Resubmit for review' : 'Submit for verification'}</button></div>}
          {!canResubmit && <p className="mt-5 text-sm font-medium text-emerald-800">Your verification is approved. Your documents remain private.</p>}
        </section>}
      </div>
    </main>
  );
}
