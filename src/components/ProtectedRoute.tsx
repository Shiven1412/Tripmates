import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getCurrentUser, hydrateCurrentUser, setCurrentUser, shouldRedirectToOnboarding, useCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

export type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: Array<'USER' | 'TRAVEL_AGENT' | 'ADMIN'>;
};

export default function ProtectedRoute({ children, allowedRoles = ['USER', 'TRAVEL_AGENT', 'ADMIN'] }: ProtectedRouteProps) {
  const location = useLocation();
  const user = useCurrentUser() ?? getCurrentUser();
  const requiresAdmin = allowedRoles.length === 1 && allowedRoles[0] === 'ADMIN';
  const [adminCheck, setAdminCheck] = useState<'checking' | 'allowed' | 'denied'>(requiresAdmin ? 'checking' : 'allowed');
  const [hydratingProfile, setHydratingProfile] = useState(false);

  useEffect(() => {
    if (!user || user.onboardingComplete) {
      setHydratingProfile(false);
      return;
    }

    let active = true;
    setHydratingProfile(true);

    void hydrateCurrentUser(user).then((hydratedUser) => {
      if (!active) return;
      setHydratingProfile(false);
      if (hydratedUser.onboardingComplete && location.pathname === '/onboarding') {
        window.location.replace('/dashboard');
      }
    }).catch(() => {
      if (active) setHydratingProfile(false);
    });

    return () => {
      active = false;
    };
  }, [user?.id, user?.onboardingComplete, location.pathname]);

  useEffect(() => {
    if (!requiresAdmin || !user) {
      setAdminCheck(requiresAdmin ? 'denied' : 'allowed');
      return;
    }
    let active = true;
    setAdminCheck('checking');
    const verifyRole = async () => {
      if (!supabase) {
        if (active) setAdminCheck(user.role === 'ADMIN' ? 'allowed' : 'denied');
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== user.id) {
        if (active) setAdminCheck('denied');
        return;
      }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const isAdmin = !error && profile?.role === 'ADMIN';
      if (active) {
        if (isAdmin) setCurrentUser({ ...user, role: 'ADMIN' });
        setAdminCheck(isAdmin ? 'allowed' : 'denied');
      }
    };
    void verifyRole();
    return () => { active = false; };
  }, [requiresAdmin, user?.id]);

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (hydratingProfile) {
    return <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-sm text-slate-300">Loading your profile…</div>;
  }

  if (shouldRedirectToOnboarding(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (requiresAdmin && adminCheck === 'checking') {
    return <div className="min-h-screen bg-[#FAFAFA] px-6 pt-24 text-center text-sm text-slate-500">Checking administrator access…</div>;
  }

  if (requiresAdmin && adminCheck === 'denied') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
