import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AppRole = 'USER' | 'TRAVEL_AGENT' | 'ADMIN';

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  onboardingComplete: boolean;
  avatar?: string;
  age?: number;
  city?: string;
  travelPersonality?: string;
  bio?: string;
  lifestyle?: Record<string, string>;
  interests?: string[];
  budget?: string;
  groupPreference?: string;
  upiId?: string;
  upiVerified?: boolean;
  profileVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  identityVerified?: boolean;
};

const AUTH_STORAGE_KEY = 'tripmates-auth-user';
const AUTH_SESSION_KEY = 'tripmates-auth-user-session';
const AUTH_CHANGE_EVENT = 'tripmates-auth-change';

function notifyAuthChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function readStoredUser(key: string): AppUser | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AppUser>;
    return normalizeAppUser(parsed);
  } catch {
    return null;
  }
}

function writeStoredUser(user: AppUser) {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(user);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.sessionStorage.setItem(AUTH_SESSION_KEY, serialized);
}

function clearStoredUser() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function normalizeAppUser(input: Partial<AppUser> & { id?: string; email?: string; fullName?: string; role?: AppRole; onboardingComplete?: boolean; avatar?: string; age?: number; city?: string; travelPersonality?: string; bio?: string; lifestyle?: Record<string, string>; interests?: string[]; budget?: string; groupPreference?: string; identityVerified?: boolean }): AppUser | null {
  if (!input?.id || !input?.email) return null;

  const lifestyle = input.lifestyle && Object.keys(input.lifestyle).length > 0 ? input.lifestyle : {
    smoking: 'Non-smoker',
    drinking: 'Social only',
    sleep: 'Flexible',
    food: 'Non-veg',
  };

  return {
    id: input.id,
    fullName: input.fullName || input.email.split('@')[0] || 'TripMate',
    email: input.email,
    role: input.role || 'USER',
    onboardingComplete: Boolean(input.onboardingComplete),
    avatar: input.avatar,
    age: Number.isFinite(input.age) ? Number(input.age) : 25,
    city: input.city || 'Mumbai, India',
    travelPersonality: input.travelPersonality || 'Explorer',
    bio: input.bio || 'Passionate explorer who believes the best trips happen when you travel with the right people.',
    lifestyle,
    interests: Array.isArray(input.interests) && input.interests.length > 0 ? input.interests : ['Trekking', 'Photography', 'Camping'],
    budget: input.budget || 'moderate',
    groupPreference: input.groupPreference || 'mixed',
    upiId: input.upiId,
    upiVerified: Boolean(input.upiVerified),
    profileVisibility: input.profileVisibility || 'PUBLIC',
    identityVerified: Boolean(input.identityVerified),
  };
}

export function getCurrentUser(): AppUser | null {
  const localUser = readStoredUser(AUTH_STORAGE_KEY);
  if (localUser) return localUser;
  return readStoredUser(AUTH_SESSION_KEY);
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}

export function shouldRedirectToOnboarding(user: AppUser | null) {
  return Boolean(user && !user.onboardingComplete);
}

export function setCurrentUser(user: AppUser) {
  if (typeof window === 'undefined') return;
  writeStoredUser(user);
  notifyAuthChange();
}

async function hydrateUserFromProfile(user: AppUser): Promise<AppUser> {
  if (!supabase) return user;
  const { data, error } = await supabase.from('profiles')
    .select('full_name, avatar_url, role, identity_verified, onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return user;

  const hydrated = normalizeAppUser({
    ...user,
    fullName: data.full_name || user.fullName,
    avatar: data.avatar_url || user.avatar,
    role: (data.role as AppRole) || user.role,
    identityVerified: Boolean(data.identity_verified),
    onboardingComplete: Boolean(data.onboarding_complete ?? user.onboardingComplete),
  });
  if (hydrated) setCurrentUser(hydrated);
  return hydrated ?? user;
}

export function logout() {
  if (typeof window === 'undefined') return;
  clearStoredUser();
  notifyAuthChange();

  if (supabase) {
    void supabase.auth.signOut();
  }
}

export const DEV_SEED_EMAIL = 'seed@tripmates.app';
export const DEV_SEED_PASSWORD = 'Password123!';

export function getDevSeedUser(overrides: Partial<AppUser> = {}): AppUser {
  return normalizeAppUser({
    id: 'seed-user-1',
    fullName: 'Aarav Nair',
    email: DEV_SEED_EMAIL,
    role: 'USER',
    onboardingComplete: true,
    avatar: 'https://images.unsplash.com/photo-1599828586134-fbaff96c63d5?w=200&h=200&fit=crop&auto=format',
    age: 28,
    city: 'Mumbai, India',
    travelPersonality: 'Explorer',
    bio: 'Passionate explorer who believes the best trips happen when you travel with the right people.',
    lifestyle: {
      smoking: 'Non-smoker',
      drinking: 'Social only',
      sleep: 'Flexible',
      food: 'Non-veg',
    },
    interests: ['Trekking', 'Photography', 'Camping', 'Road Trips', 'Local Food'],
    budget: 'moderate',
    groupPreference: 'mixed',
    ...overrides,
  }) as AppUser;
}

export function isDevSeedCredentials(email: string, password: string) {
  return email.trim().toLowerCase() === DEV_SEED_EMAIL.toLowerCase() && password === DEV_SEED_PASSWORD;
}

export function createDemoUser(overrides: Partial<AppUser> = {}): AppUser {
  return getDevSeedUser({
    id: 'demo-user-1',
    fullName: 'Arjun Sharma',
    email: 'arjun@tripmates.app',
    ...overrides,
  });
}

export function useCurrentUser() {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser());

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();

    const handleAuthChange = () => syncUser();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY || event.key === AUTH_SESSION_KEY || event.key === null) {
        syncUser();
      }
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    if (!supabase) {
      return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const previousUser = getCurrentUser();
        const nextUser = normalizeAppUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'TripMate',
          role: (session.user.user_metadata?.role as AppRole) || 'USER',
          onboardingComplete: Boolean(session.user.user_metadata?.onboarding_complete),
          avatar: previousUser?.id === session.user.id ? previousUser.avatar : session.user.user_metadata?.avatar_url,
          identityVerified: Boolean(session.user.user_metadata?.identity_verified),
        });

        if (nextUser) {
          setCurrentUser(nextUser);
          window.setTimeout(() => { void hydrateUserFromProfile(nextUser); }, 0);
        }
      } else {
        clearStoredUser();
        notifyAuthChange();
      }

      syncUser();
    });

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
      subscription.unsubscribe();
    };
  }, []);

  return user;
}

export async function updateCurrentUserProfile(profile: Partial<AppUser>) {
  const current = getCurrentUser() ?? getDevSeedUser();
  const next = normalizeAppUser({
    ...current,
    ...profile,
    email: profile.email || current.email,
    role: profile.role || current.role,
  });

  if (!next) {
    return null;
  }

  setCurrentUser(next);

  if (supabase) {
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: next.fullName,
          avatar_url: next.avatar || null,
          city: next.city || null,
          bio: next.bio || null,
          travel_personality: next.travelPersonality || null,
          interests: next.interests || [],
          budget: next.budget || null,
          group_preference: next.groupPreference || null,
          lifestyle: next.lifestyle || {},
          upi_id: next.upiId || null,
          upi_verified: Boolean(next.upiVerified),
          profile_visibility: next.profileVisibility || 'PUBLIC',
          identity_verified: Boolean(next.identityVerified),
          onboarding_complete: true,
        },
      });

      await supabase
        .from('profiles')
        .upsert(
          {
            id: next.id,
            full_name: next.fullName,
            email: next.email,
            onboarding_complete: true,
            avatar_url: next.avatar || null,
            city: next.city || null,
            bio: next.bio || null,
            travel_personality: next.travelPersonality || null,
            interests: next.interests || [],
            budget: next.budget || null,
            group_preference: next.groupPreference || null,
            lifestyle: next.lifestyle || {},
            upi_id: next.upiId || null,
            upi_verified: Boolean(next.upiVerified),
            profile_visibility: next.profileVisibility || 'PUBLIC',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
    } catch (error) {
      console.error('Profile update failed', error);
    }
  }

  return next;
}

export async function signUpWithEmail({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}) {
  if (!email.trim() || !password.trim()) {
    return { user: null, error: new Error('Email and password are required.') };
  }

  if (!supabase) {
    const fallbackUser = createDemoUser({ fullName: fullName || 'TripMate', email });
    setCurrentUser(fallbackUser);
    return { user: fallbackUser, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
        role: 'USER',
        onboarding_complete: false,
      },
    },
  });

  if (error) {
    return { user: null, error };
  }

  const nextUser = normalizeAppUser({
    id: data.user?.id || 'pending-user',
    email: data.user?.email || email,
    fullName: fullName || data.user?.email?.split('@')[0] || 'TripMate',
    role: 'USER',
    onboardingComplete: false,
  });

  if (nextUser) {
    setCurrentUser(nextUser);
  }

  const hydratedUser = nextUser ? await hydrateUserFromProfile(nextUser) : null;
  return { user: hydratedUser, error: null };
}

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  if (!email.trim() || !password.trim()) {
    return { user: null, error: new Error('Email and password are required.') };
  }

  if (isDevSeedCredentials(email, password)) {
    const seedUser = getDevSeedUser();
    setCurrentUser(seedUser);
    return { user: seedUser, error: null };
  }

  if (!supabase) {
    const fallbackUser = createDemoUser({ email });
    setCurrentUser(fallbackUser);
    return { user: fallbackUser, error: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, error };
  }

  const nextUser = normalizeAppUser({
    id: data.user?.id || 'pending-user',
    email: data.user?.email || email,
    fullName: data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'TripMate',
    role: (data.user?.user_metadata?.role as AppRole) || 'USER',
    onboardingComplete: Boolean(data.user?.user_metadata?.onboarding_complete),
    avatar: data.user?.user_metadata?.avatar_url,
  });

  if (nextUser) {
    setCurrentUser(nextUser);
  }

  const hydratedUser = nextUser ? await hydrateUserFromProfile(nextUser) : null;
  return { user: hydratedUser, error: null };
}
