import { useState } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import Footer from './components/Footer';
import Nav from './components/Nav';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import DiscoverTrips from './pages/DiscoverTrips';
import DiscoverPeople from './pages/DiscoverPeople';
import CreateTrip from './pages/CreateTrip';
import TripHub from './pages/TripHub';
import TripGroupPage from './pages/TripGroupPage';
import TripRequests from './pages/TripRequests';
import TripMatesDirectory from './pages/TripMatesDirectory';
import MessagesPage from './pages/MessagesPage';
import Wallet from './pages/Wallet';
import Community from './pages/Community';
import Safety from './pages/Safety';
import Profile from './pages/Profile';
import HotelBooking from './pages/HotelBooking';
import CabRental from './pages/CabRental';
import ScootyRental from './pages/ScootyRental';
import MapPage from './pages/MapPage';
import SeasonalTrips from './pages/SeasonalTrips';
import AdminDashboard from './pages/AdminDashboard';
import AIAssistant from './pages/AIAssistant';
import Verification from './pages/Verification';
import FloatingAIChat from './components/FloatingAIChat';

function Root() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <Nav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div>
        <Outlet />
      </div>
      <Footer />
      <FloatingAIChat />
    </div>
  );
}

function AuthLayout() {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
}

function withProtected(Component: React.ComponentType, allowedRoles?: Array<'USER' | 'TRAVEL_AGENT' | 'ADMIN'>) {
  return () => (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Component />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: 'dashboard', Component: withProtected(Dashboard) },
      { path: 'discover', Component: withProtected(DiscoverTrips) },
      { path: 'people', Component: withProtected(DiscoverPeople) },
      { path: 'tripmates', Component: withProtected(TripMatesDirectory) },
      { path: 'messages', Component: withProtected(MessagesPage) },
      { path: 'trips', Component: withProtected(TripHub) },
      { path: 'trips/:tripId', Component: withProtected(TripGroupPage) },
      { path: 'trip-requests', Component: withProtected(TripRequests) },
      { path: 'create-trip', Component: withProtected(CreateTrip) },
      { path: 'wallet', Component: withProtected(Wallet) },
      { path: 'community', Component: withProtected(Community) },
      { path: 'safety', Component: withProtected(Safety) },
      { path: 'profile', Component: withProtected(Profile) },
      { path: 'hotel-booking', Component: withProtected(HotelBooking) },
      { path: 'cab-rental', Component: withProtected(CabRental) },
      { path: 'scooty-rental', Component: withProtected(ScootyRental) },
      { path: 'map', Component: withProtected(MapPage) },
      { path: 'seasonal-trips', Component: withProtected(SeasonalTrips) },
      { path: 'ai-assistant', Component: withProtected(AIAssistant) },
      { path: 'verification', Component: withProtected(Verification) },
      { path: 'admin', Component: withProtected(AdminDashboard, ['ADMIN']) },
    ],
  },
  {
    path: '/',
    Component: AuthLayout,
    children: [
      { path: 'auth', Component: Auth },
      { path: 'onboarding', Component: Onboarding },
    ],
  },
]);
