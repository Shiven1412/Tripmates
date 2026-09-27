import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { signInWithEmail, signUpWithEmail, useCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

const CAROUSEL_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&h=1100&fit=crop&auto=format', caption: 'Friends trekking the Himalayas' },
  { url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=1100&fit=crop&auto=format', caption: 'Bali rice terraces at dawn' },
  { url: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=800&h=1100&fit=crop&auto=format', caption: 'Tokyo night life & culture' },
];

export default function Auth() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [authError, setAuthError] = useState('');
  const [isStartingGoogleAuth, setIsStartingGoogleAuth] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setAuthError('Google sign-in is unavailable until Supabase is configured.');
      return;
    }
    setAuthError('');
    setIsStartingGoogleAuth(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setAuthError(error.message);
      setIsStartingGoogleAuth(false);
    }
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    if (!email.trim() || !password.trim()) return;

    const result = mode === 'signup'
      ? await signUpWithEmail({ fullName: fullName || 'TripMate', email, password })
      : await signInWithEmail({ email, password });

    if (result.error) {
      window.alert(result.error.message || 'Authentication failed.');
      return;
    }

    if (mode === 'signup') {
      window.location.replace('/onboarding');
      return;
    }

    window.location.replace('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - carousel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {CAROUSEL_IMAGES.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-gray-900"
            style={{
              backgroundImage: `url(${img.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === imgIdx ? 1 : 0,
              transition: 'opacity 1s ease',
            }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <span className="font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl">TripMates</span>
          </div>

          <div>
            <h2 className="font-serif text-4xl mb-4" style={{ letterSpacing: '-0.02em' }}>
              "We don't match<br /><em style={{ color: '#86efac' }}>destinations.</em><br />We match travelers."
            </h2>
            <p className="text-white/60 text-sm">{CAROUSEL_IMAGES[imgIdx].caption}</p>
            <div className="flex gap-2 mt-6">
              {CAROUSEL_IMAGES.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === imgIdx ? 24 : 8, height: 8, background: i === imgIdx ? '#10B981' : 'rgba(255,255,255,0.4)' }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                'https://images.unsplash.com/photo-1599828586134-fbaff96c63d5?w=40&h=40&fit=crop&auto=format',
                'https://images.unsplash.com/photo-1464198016405-33fd4527b89d?w=40&h=40&fit=crop&auto=format',
                'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=40&h=40&fit=crop&auto=format',
              ].map((url, i) => (
                <img key={i} src={url} alt="" className="w-10 h-10 rounded-full border-2 border-white/30 object-cover" />
              ))}
            </div>
            <p className="text-white/70 text-sm">Find your next travel community</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-16 lg:px-16" style={{ background: '#FAFAFA' }}>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2 mb-10 lg:hidden cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="font-bold text-lg">TripMates</span>
          </div>

          <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : 'Join TripMates'}
          </h1>
          <p className="mb-8" style={{ color: '#6B7280' }}>
            {mode === 'login' ? 'Sign in to continue your adventure' : 'Find your perfect travel companions'}
          </p>

          {/* Social auth */}
          <div className="space-y-3 mb-6">
            <button className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border font-medium text-sm transition-all hover:bg-gray-50"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
              onClick={() => void handleGoogleSignIn()}
              disabled={isStartingGoogleAuth}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isStartingGoogleAuth ? 'Redirecting to Google…' : 'Continue with Google'}
            </button>
          </div>

          {authError && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</p>}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }}></div>
            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }}></div>
          </div>

          <div className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input type="text" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all focus:border-black"
                  style={{ borderColor: '#E5E7EB', background: 'white' }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all focus:border-black"
                style={{ borderColor: '#E5E7EB', background: 'white' }} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Password</label>
                {mode === 'login' && <button type="button" className="text-sm" style={{ color: '#10B981' }} onClick={() => navigate('/auth')}>Forgot password?</button>}
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all focus:border-black"
                style={{ borderColor: '#E5E7EB', background: 'white' }} />
            </div>
          </div>

          <button type="button" className="btn-primary w-full justify-center mt-6 py-4 rounded-2xl text-base"
            onClick={handleSubmit}>
            {mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>

          <p className="text-center text-sm mt-6" style={{ color: '#6B7280' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button className="font-semibold underline" style={{ color: '#111111' }}
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
