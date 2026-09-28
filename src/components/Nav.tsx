import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import AppLogo from './AppLogo';
import { logout, useCurrentUser } from '../lib/auth';

type NavProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
};

const primaryNavItems = [
  { label: 'Discover', to: '/discover', icon: '🔍' },
  { label: 'TripMates', to: '/tripmates', icon: '👥' },
  // { label: 'Messages', to: '/messages', icon: '✉️' },
  { label: 'Trips', to: '/trips', icon: '✈️' },
  // { label: 'Join requests', to: '/trip-requests', icon: '📨' },
  { label: 'Community', to: '/community', icon: '💬' },
  { label: 'Wallet', to: '/wallet', icon: '💰' },
  { label: 'Safety', to: '/safety', icon: '🛡️' },
  { label: 'Profile', to: '/profile', icon: '👤' },
];

const desktopPrimaryNavItems = primaryNavItems.filter((item) => !['Wallet', 'Safety'].includes(item.label));
const sidebarItems = [
  { label: 'Safety', to: '/safety', icon: '🛡️' },
  { label: 'Wallet', to: '/wallet', icon: '💰' },
  { label: 'Seasonal', to: '/seasonal-trips', icon: '🌤️' },
  { label: 'Get Verified', to: '/verification', icon: '✅' },
];

const serviceNavItems = [
  { label: 'Hotels', to: '/hotel-booking', icon: '🏨' },
  { label: 'Cabs', to: '/cab-rental', icon: '🚕' },
  { label: 'Scooty', to: '/scooty-rental', icon: '🛵' },
  { label: 'Provider rankings', to: '/hotel-booking', icon: '🏆' },
  { label: 'Trip chemistry', to: '/people', icon: '🧪' },
  { label: 'Trust score & personality', to: '/profile', icon: '🛡️' },
  { label: 'Expense splitting', to: '/wallet', icon: '🧾' },
  { label: 'Settlements & UPI', to: '/wallet', icon: '💸' },
  { label: 'Map', to: '/map', icon: '🗺️' },
  { label: 'Seasonal', to: '/seasonal-trips', icon: '🌤️' },
  { label: 'AI Assistant', to: '/ai-assistant', icon: '✨' },
  { label: 'Get Verified', to: '/verification', icon: '✅' },
];

const mobileItems = [
  { label: 'Discover', to: '/discover', icon: '🔍' },
  { label: 'Trips', to: '/trips', icon: '✈️' },
  { label: 'TripMates', to: '/tripmates', icon: '👥' },
  { label: 'Messages', to: '/messages', icon: '✉️' },
  { label: 'Profile', to: '/profile', icon: '👤' },
];

export default function Nav({ sidebarOpen, setSidebarOpen }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('tripmates-theme') === 'dark');
  const servicesRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const user = useCurrentUser();
  const loggedIn = Boolean(user);
  const availableServiceItems = user?.role === 'ADMIN'
    ? [...serviceNavItems, { label: 'Admin Dashboard', to: '/admin', icon: '🛠️' }]
    : serviceNavItems;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('tripmates-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setServicesDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
    setMenuOpen(false);
    setServicesDropdownOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      isActive ? 'bg-[#111111] text-white shadow-sm' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? '#10B981' : '#9CA3AF',
  });

  return (
    <>
      {!loggedIn ? (
        <nav className="app-navbar fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
            <div className="flex flex-1 items-center justify-start">
              <NavLink to="/" aria-label="TripMates home" className="flex items-center gap-2 text-decoration-none">
                <AppLogo compact dark={!darkMode} className="scale-90" />
              </NavLink>
            </div>

            <div className="hidden md:flex md:flex-1 md:items-center md:justify-center">
              <span className="text-sm font-semibold tracking-[0.2em] text-slate-700 uppercase">TripMates</span>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <button type="button" onClick={() => setDarkMode((mode) => !mode)} className="h-9 w-9 rounded-xl border border-slate-200 bg-white/80 text-sm shadow-sm md:h-10 md:w-10" aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>{darkMode ? '☀' : '☾'}</button>
              <button className="btn-outline hidden px-3 py-2 text-xs md:inline-flex md:px-5 md:text-sm" onClick={() => navigate('/auth')}>Sign in</button>
            </div>
          </div>
        </nav>
      ) : (
        <>
          <nav className="app-navbar fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
            <div className="mx-auto flex h-16 max-w-[100vw] items-center justify-between px-4 md:px-6">
              <div className="flex flex-1 items-center justify-start gap-3 md:hidden">
                <NavLink to="/dashboard" aria-label="TripMates dashboard" className="flex items-center gap-2 text-decoration-none">
                  <AppLogo compact dark={!darkMode} className="scale-90" />
                </NavLink>
              </div>

              <div className="hidden flex-1 items-center justify-start md:flex">
                <NavLink to="/dashboard" aria-label="TripMates dashboard" className="flex items-center gap-2 text-decoration-none">
                  <AppLogo compact dark={!darkMode} className="scale-90" />
                </NavLink>
              </div>

              <div className="flex flex-1 items-center justify-center md:hidden">
                <span className="text-base font-semibold tracking-[0.12em] text-slate-700 uppercase">TripMates</span>
              </div>

              <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
                {desktopPrimaryNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-item rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'is-active bg-[#111111] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
                    }`}
                  >
                    {item.label}
                  </NavLink>
                ))}

                <div className="relative" ref={servicesRef}>
                  <button
                    type="button"
                    aria-expanded={servicesDropdownOpen}
                    aria-haspopup="menu"
                    onClick={() => setServicesDropdownOpen((open) => !open)}
                    className="nav-item inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
                  >
                    <span>Travel Services</span>
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`}>
                      <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {servicesDropdownOpen && (
                    <div
                      role="menu"
                      className="nav-menu-surface absolute right-0 top-full z-[60] mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-xl"
                    >
                      {availableServiceItems.map((item, index) => (
                        <NavLink
                          key={`${item.to}-${item.label}-${index}`}
                          to={item.to}
                          onClick={() => {
                            setServicesDropdownOpen(false);
                            handleNavClick();
                          }}
                          className={({ isActive }) => `nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                            isActive ? 'is-active bg-[#111111] text-white' : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDarkMode((mode) => !mode)}
                  className="theme-toggle hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-base shadow-sm md:flex"
                  aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                >
                  {darkMode ? '☀' : '☾'}
                </button>

                <div className="relative hidden md:block" onMouseEnter={() => setSidebarOpen(true)} onMouseLeave={() => setSidebarOpen(false)}>
                  <button
                    type="button"
                    className="account-menu-trigger flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-xl text-[#111111]"
                    onClick={() => { if (!window.matchMedia('(hover: hover)').matches) setSidebarOpen(!sidebarOpen); }}
                    aria-label="Open account menu"
                    aria-expanded={sidebarOpen}
                  >
                    ☰
                  </button>
                  {sidebarOpen && <aside className="nav-menu-surface absolute right-0 top-full z-[70] mt-2 max-h-[72vh] w-52 overflow-y-auto rounded-[24px] border border-[#E5E7EB] bg-white/95 p-3 shadow-xl backdrop-blur-xl">
                    <div className="space-y-2">{sidebarItems.map((item) => <NavLink key={item.to} to={item.to} onClick={handleNavClick} className={({ isActive }) => linkClass({ isActive })}><span>{item.icon}</span><span>{item.label}</span></NavLink>)}</div>
                    <div className="mt-3 border-t border-[#F3F4F6] pt-3"><button className="btn-outline w-full justify-center text-sm" onClick={handleLogout}>Logout</button></div>
                  </aside>}
                </div>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-slate-900 text-lg text-white shadow-sm md:hidden"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle mobile menu"
                >
                  ☰
                </button>
              </div>
            </div>

            {menuOpen && (
              <div className="mobile-menu-surface max-h-[70vh] overflow-y-auto border-t border-gray-100 bg-white px-4 py-4 md:hidden">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setDarkMode((mode) => !mode)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <span>Theme</span>
                    <span>{darkMode ? '☀ Light' : '☾ Dark'}</span>
                  </button>
                  {[...primaryNavItems, ...availableServiceItems].map((item, index) => (
                    <NavLink
                      key={`${item.to}-${item.label}-${index}`}
                      to={item.to}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
                      onClick={handleNavClick}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                  <button className="btn-outline mt-2 w-full justify-center text-sm" onClick={handleLogout}>Logout</button>
                </div>
              </div>
            )}
          </nav>

          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t" style={{ borderTop: '1px solid #f0f0f0' }}>
            <div className="flex">
              {mobileItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex-1 flex flex-col items-center py-3 gap-0.5"
                  style={mobileLinkClass}
                  onClick={handleNavClick}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
