import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentUser, updateCurrentUserProfile } from '../lib/auth';

const STEPS = [
  { title: 'Basic Info', subtitle: 'Tell us about yourself' },
  { title: 'Lifestyle', subtitle: 'Your habits and preferences' },
  { title: 'Travel Interests', subtitle: 'What do you love doing?' },
  { title: 'Budget', subtitle: 'Your comfort zone' },
  { title: 'Group Preference', subtitle: 'Who do you want to travel with?' },
  { title: 'Verification', subtitle: 'Build trust in the community' },
];

const INTERESTS = ['Trekking', 'Camping', 'Road Trips', 'Food Tours', 'Luxury Travel', 'Photography', 'Adventure Sports', 'Sightseeing', 'Scuba Diving', 'Yoga Retreats', 'Music Festivals', 'Nightlife'];
const LIFESTYLES = [
  { key: 'smoking', label: 'Smoking', options: ['Smoker', 'Non-smoker', "Don't mind"] },
  { key: 'drinking', label: 'Drinking', options: ['Drinker', 'Non-drinker', 'Social only'] },
  { key: 'sleep', label: 'Sleep Schedule', options: ['Early bird', 'Night owl', 'Flexible'] },
  { key: 'food', label: 'Food Preference', options: ['Veg', 'Non-veg', 'Vegan', 'Any'] },
];

const defaultForm = {
  fullName: '',
  age: '',
  city: '',
  travelPersonality: '',
  lifestyle: {} as Record<string, string>,
  interests: [] as string[],
  budget: '',
  groupPreference: '',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interest: string) =>
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));

  const handleInput = (field: keyof typeof defaultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const canContinue = () => {
    if (step === 0) {
      return form.fullName.trim() && form.city.trim();
    }
    if (step === 1) {
      return Object.keys(form.lifestyle).length === LIFESTYLES.length;
    }
    if (step === 2) {
      return form.interests.length > 0;
    }
    if (step === 3) {
      return Boolean(form.budget);
    }
    if (step === 4) {
      return Boolean(form.groupPreference);
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      navigate('/auth', { replace: true });
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const updated = await updateCurrentUserProfile({
        fullName: form.fullName.trim() || currentUser.fullName,
        age: Number(form.age) || currentUser.age,
        city: form.city.trim() || currentUser.city,
        travelPersonality: form.travelPersonality.trim() || currentUser.travelPersonality,
        lifestyle: form.lifestyle,
        interests: form.interests,
        budget: form.budget || currentUser.budget,
        groupPreference: form.groupPreference || currentUser.groupPreference,
        identityVerified: true,
      });

      if (!updated) {
        setError('Your profile could not be saved. Please try again.');
        setSubmitting(false);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch {
      setError('Something went wrong while saving your profile.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-slate-950 text-slate-50">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-emerald-300 text-sm font-bold">T</span>
          </div>
          <span className="font-bold text-white">TripMates</span>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium mb-2" style={{ color: '#6B7280' }}>
            <span>Step {step + 1} of {STEPS.length}</span>
            <span style={{ color: '#10B981' }}>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #10B981, #3B82F6)' }} />
          </div>
          <div className="flex gap-1 mt-3">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                style={{ background: i <= step ? '#10B981' : '#E5E7EB' }} />
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-3xl p-8 shadow-sm border border-slate-800">
          <h2 className="font-bold text-2xl mb-1 text-white" style={{ letterSpacing: '-0.02em' }}>{STEPS[step].title}</h2>
          <p className="text-sm mb-8 text-slate-300">{STEPS[step].subtitle}</p>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="onboarding-full-name" className="block text-sm font-medium mb-2">Full Name</label>
                <input id="onboarding-full-name" type="text" value={form.fullName} onChange={(e) => handleInput('fullName', e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-black transition-colors" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }} />
              </div>
              <div>
                <label htmlFor="onboarding-age" className="block text-sm font-medium mb-2">Age</label>
                <input id="onboarding-age" type="number" value={form.age} onChange={(e) => handleInput('age', e.target.value)} placeholder="24" className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-black transition-colors" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }} />
              </div>
              <div>
                <label htmlFor="onboarding-city" className="block text-sm font-medium mb-2">City</label>
                <input id="onboarding-city" type="text" value={form.city} onChange={(e) => handleInput('city', e.target.value)} placeholder="City, country" className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-black transition-colors" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }} />
              </div>
              <div>
                <label htmlFor="onboarding-travel-personality" className="block text-sm font-medium mb-2">Travel Personality</label>
                <input id="onboarding-travel-personality" type="text" value={form.travelPersonality} onChange={(e) => handleInput('travelPersonality', e.target.value)} placeholder="Explorer / Backpacker / Luxury Nomad" className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-black transition-colors" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {LIFESTYLES.map((item) => (
                <div key={item.key}>
                  <label className="block text-sm font-medium mb-3">{item.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {item.options.map((opt) => (
                      <button key={opt} type="button" className="personality-chip" style={form.lifestyle[item.key] === opt ? { borderColor: '#10B981', background: '#F0FDF4', color: '#059669' } : {}} onClick={() => setForm((prev) => ({ ...prev, lifestyle: { ...prev.lifestyle, [item.key]: opt } }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button key={interest} type="button" className="personality-chip" style={form.interests.includes(interest) ? { borderColor: '#10B981', background: '#F0FDF4', color: '#059669' } : {}} onClick={() => toggleInterest(interest)}>
                    {interest}
                  </button>
                ))}
              </div>
              {form.interests.length > 0 && (
                <p className="text-xs mt-4" style={{ color: '#10B981' }}>{form.interests.length} selected</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              {[
                { key: 'budget', label: 'Budget', desc: '₹1,000 – ₹3,000/day', icon: '🎒' },
                { key: 'moderate', label: 'Moderate', desc: '₹3,000 – ₹8,000/day', icon: '🏨' },
                { key: 'luxury', label: 'Luxury', desc: '₹8,000+/day', icon: '✨' },
              ].map((item) => (
                <button key={item.key} type="button" className="flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all" style={form.budget === item.key ? { borderColor: '#10B981', background: '#F0FDF4' } : { borderColor: '#E5E7EB', background: 'white' }} onClick={() => handleInput('budget', item.key)}>
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm" style={{ color: '#6B7280' }}>{item.desc}</div>
                  </div>
                  {form.budget === item.key && <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}><span className="text-white text-xs">✓</span></div>}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'mixed', label: 'Mixed Group', icon: '👥' },
                { key: 'male', label: 'Male Only', icon: '👨' },
                { key: 'female', label: 'Female Only', icon: '👩' },
                { key: 'lgbtq', label: 'LGBTQ+ Friendly', icon: '🏳️‍🌈' },
              ].map((item) => (
                <button key={item.key} type="button" className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all" style={form.groupPreference === item.key ? { borderColor: '#10B981', background: '#F0FDF4' } : { borderColor: '#E5E7EB', background: 'white' }} onClick={() => handleInput('groupPreference', item.key)}>
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-sm font-medium text-center">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border-2 border-dashed cursor-pointer hover:border-black transition-colors" style={{ borderColor: '#E5E7EB' }}>
                <div className="text-center">
                  <div className="text-3xl mb-2">🪪</div>
                  <div className="font-semibold text-sm mb-1">Upload Aadhaar Card</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Your ID is encrypted and never shared</div>
                </div>
              </div>
              <div className="p-5 rounded-2xl border-2 border-dashed cursor-pointer hover:border-black transition-colors" style={{ borderColor: '#E5E7EB' }}>
                <div className="text-center">
                  <div className="text-3xl mb-2">🤳</div>
                  <div className="font-semibold text-sm mb-1">Face Verification</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>Quick selfie to confirm your identity</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
                <span style={{ color: '#10B981' }}>🔒</span>
                <p className="text-xs" style={{ color: '#065F46' }}>Your data is stored securely and used only for community trust verification. We never share personal documents with other users.</p>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button type="button" className="btn-outline flex-1 py-3.5" onClick={() => setStep((s) => s - 1)}>← Back</button>
          )}
          <button
            type="button"
            className="btn-primary flex-1 py-3.5 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => {
              if (step < STEPS.length - 1) {
                if (canContinue()) setStep((s) => s + 1);
                return;
              }
              void handleSubmit();
            }}
            disabled={submitting || (step < STEPS.length - 1 && !canContinue())}>
            {submitting ? 'Saving…' : step === STEPS.length - 1 ? '🎉 Complete Setup' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
