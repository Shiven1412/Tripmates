import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../lib/auth';
import { confirmExpensePayment, fetchExpenseWallet, reportExpensePayment, type WalletExpenseRow } from '../lib/supabaseData';

const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
const upiLink = (upiId: string, name: string, amount: number, title: string) => `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(title)}`;

export default function Wallet() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [rows, setRows] = useState<WalletExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await fetchExpenseWallet());
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => rows.reduce((sum, row) => {
    sum.spent += Number(row.expense.amount);
    for (const share of row.expense.shares) {
      if (share.user_id === currentUser?.id && share.status !== 'PAID' && row.expense.paid_by !== currentUser.id) sum.owe += Number(share.owed_amount);
      if (row.expense.paid_by === currentUser?.id && share.user_id !== currentUser.id && share.status !== 'PAID') sum.owed += Number(share.owed_amount);
    }
    return sum;
  }, { spent: 0, owe: 0, owed: 0 }), [rows, currentUser?.id]);

  const reportPayment = async (expenseId: string) => {
    setBusy(expenseId); setError('');
    const result = await reportExpensePayment(expenseId);
    setBusy('');
    if (result.error) { setError(result.error.message); return; }
    await load();
  };

  const confirmPayment = async (expenseId: string, userId: string) => {
    setBusy(expenseId); setError('');
    const result = await confirmExpensePayment(expenseId, userId);
    setBusy('');
    if (result.error) { setError(result.error.message); return; }
    await load();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 pt-20 md:pb-8"><div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="tag mb-2">Across your joined trips</p><h1 className="text-3xl font-bold">Expense Splitter</h1><p className="mt-2 text-sm text-slate-600">Trip members report when they have paid. The expense payer or trip owner confirms settlement.</p></div><button className="btn-outline px-4 py-2 text-sm" onClick={() => navigate('/profile')}>{currentUser?.upiId ? `Your UPI: ${currentUser.upiId}` : 'Add your UPI ID'}</button></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">{[{ label: 'Group expenses', value: totals.spent }, { label: 'You owe', value: totals.owe }, { label: 'Owed to you', value: totals.owed }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs text-slate-500">{item.label}</span><strong className="mt-1 block text-xl">{money(item.value)}</strong></div>)}</div>
      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading your trip expenses…</div> : !rows.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><div className="mb-3 text-4xl">🧾</div><h2 className="text-xl font-bold">No trip expenses yet</h2><p className="mt-2 text-sm text-slate-500">Expenses added in a group's Expenses tab will appear here for everyone in that trip.</p><button className="btn-primary mt-5 px-4 py-2.5 text-sm" onClick={() => navigate('/trips')}>Open your trip groups</button></div> : <div className="space-y-6">{rows.map(({ tripId, tripTitle, tripOwnerId, expense }) => {
        const canConfirm = expense.paid_by === currentUser?.id || tripOwnerId === currentUser?.id;
        const myShare = expense.shares.find((share) => share.user_id === currentUser?.id);
        return <article key={`${tripId}-${expense.id}`} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{tripTitle}</p><h2 className="mt-1 text-lg font-bold">{expense.title}</h2><p className="text-sm text-slate-500">{expense.category} · Paid by {expense.payer_name}</p>{expense.payer_upi_id && <p className="mt-1 text-xs text-slate-600">Payee UPI: <strong>{expense.payer_upi_id}</strong></p>}</div><strong className="text-lg">{money(Number(expense.amount))}</strong></div>
          {expense.payer_upi_id && myShare && myShare.status === 'PENDING' && expense.paid_by !== currentUser?.id && <a className="mb-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" href={upiLink(expense.payer_upi_id, expense.payer_name, Number(myShare.owed_amount), expense.title)}>Pay {money(Number(myShare.owed_amount))} with UPI</a>}
          {!expense.payer_upi_id && myShare && myShare.status === 'PENDING' && expense.paid_by !== currentUser?.id && <p className="mb-3 text-xs text-amber-700">The payer has not added a UPI ID to their profile yet.</p>}
          <div className="space-y-2">{expense.shares.map((share) => <div key={share.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><div><span className="text-sm font-medium">{share.name}</span><span className="ml-2 text-sm text-slate-500">{money(Number(share.owed_amount))}</span></div><div className="flex items-center gap-2"><span className={`text-xs font-semibold ${share.status === 'PAID' ? 'text-emerald-700' : share.status === 'PAYMENT_REPORTED' ? 'text-blue-700' : 'text-amber-700'}`}>{share.status === 'PAID' ? 'Confirmed paid' : share.status === 'PAYMENT_REPORTED' ? 'Reported paid' : 'Unpaid'}</span>{share.user_id === currentUser?.id && share.status === 'PENDING' && expense.paid_by !== currentUser.id && <button disabled={busy === expense.id} className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => void reportPayment(expense.id)}>{busy === expense.id ? 'Saving…' : 'I paid'}</button>}{share.status === 'PAYMENT_REPORTED' && canConfirm && <button disabled={busy === expense.id} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => void confirmPayment(expense.id, share.user_id)}>{busy === expense.id ? 'Saving…' : `Confirm ${share.name} paid`}</button>}</div></div>)}</div>
        </article>;
      })}</div>}
    </div></div>
  );
}
