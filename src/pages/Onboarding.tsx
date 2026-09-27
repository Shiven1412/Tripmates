import { useState } from 'react';
import { useNavigate } from 'react-router';

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

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<Record<string, string>>({});
  const [budget, setBudget] = useState('');
  const [groupPref, setGroupPref] = useState('');

  const toggleInterest = (i: string) =>
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: '#FAFAFA' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="font-bold">TripMates</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium mb-2" style={{ color: '#6B7280' }}>
            <span>Step {step + 1} of {STEPS.length}</span>
            <span style={{ color: '#10B981' }}>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #10B981, #3B82F6)' }} />
          </div>
          <div className="flex gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all"
                style={{ background: i <= step ? '#10B981' : '#E5E7EB' }} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border" style={{ borderColor: '#F3F4F6' }}>
          <h2 className="font-bold text-2xl mb-1" style={{ letterSpacing: '-0.02em' }}>{STEPS[step].title}</h2>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>{STEPS[step].subtitle}</p>

          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              {[
                { label: 'Full Name', placeholder: 'Your name', type: 'text' },
                { label: 'Age', placeholder: '24', type: 'number' },
                { label: 'City', placeholder: 'City, country', type: 'text' },
                { label: 'Travel Personality', placeholder: 'Explorer / Backpacker / Luxury Nomad', type: 'text' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-black transition-colors"
                    style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }} />
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Lifestyle */}
          {step === 1 && (
            <div className="space-y-6">
              {LIFESTYLES.map(item => (
                <div key={item.key}>
                  <label className="block text-sm font-medium mb-3">{item.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {item.options.map(opt => (
                      <button key={opt}
                        className="personality-chip"
                        style={lifestyle[item.key] === opt ? { borderColor: '#10B981', background: '#F0FDF4', color: '#059669' } : {}}
                        onClick={() => setLifestyle(p => ({ ...p, [item.key]: opt }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 2 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button key={interest}
                    className="personality-chip"
                    style={selectedInterests.includes(interest) ? { borderColor: '#10B981', background: '#F0FDF4', color: '#059669' } : {}}
                    onClick={() => toggleInterest(interest)}>
                    {interest}
                  </button>
                ))}
              </div>
              {selectedInterests.length > 0 && (
                <p className="text-xs mt-4" style={{ color: '#10B981' }}>{selectedInterests.length} selected</p>
              )}
            </div>
          )}

          {/* Step 4: Budget */}
          {step === 3 && (
            <div className="grid gap-4">
              {[
                { key: 'budget', label: 'Budget', desc: '₹1,000 – ₹3,000/day', icon: '🎒' },
                { key: 'moderate', label: 'Moderate', desc: '₹3,000 – ₹8,000/day', icon: '🏨' },
                { key: 'luxury', label: 'Luxury', desc: '₹8,000+/day', icon: '✨' },
              ].map(item => (
                <button key={item.key}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all"
                  style={budget === item.key
                    ? { borderColor: '#10B981', background: '#F0FDF4' }
                    : { borderColor: '#E5E7EB', background: 'white' }}
                  onClick={() => setBudget(item.key)}>
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm" style={{ color: '#6B7280' }}>{item.desc}</div>
                  </div>
                  {budget === item.key && <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}><span className="text-white text-xs">✓</span></div>}
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Group Preference */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'mixed', label: 'Mixed Group', icon: '👥' },
                { key: 'male', label: 'Male Only', icon: '👨' },
                { key: 'female', label: 'Female Only', icon: '👩' },
                { key: 'lgbtq', label: 'LGBTQ+ Friendly', icon: '🏳️‍🌈' },
              ].map(item => (
                <button key={item.key}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all"
                  style={groupPref === item.key
                    ? { borderColor: '#10B981', background: '#F0FDF4' }
                    : { borderColor: '#E5E7EB', background: 'white' }}
                  onClick={() => setGroupPref(item.key)}>
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-sm font-medium text-center">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 6: Verification */}
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
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button className="btn-outline flex-1 py-3.5" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <button
            className="btn-primary flex-1 py-3.5 justify-center"
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : navigate('/dashboard')}>
            {step === STEPS.length - 1 ? '🎉 Complete Setup' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
