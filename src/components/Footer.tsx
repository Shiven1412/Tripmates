import { Link } from 'react-router';

const footerLinks = [
  { label: 'Explore', to: '/discover' },
  { label: 'Trips', to: '/trips' },
  { label: 'Travelers', to: '/tripmates' },
  { label: 'Safety', to: '/safety' },
  { label: 'Profile', to: '/profile' },
];

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-lg text-white shadow-lg shadow-emerald-500/30">
              ✈
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-slate-900">TripMates</div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Travel together</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            Discover compatible travelers, build smarter itineraries, and create travel memories with a trusted community.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:w-[520px] lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Navigate</h3>
            <nav className="space-y-2 text-sm text-slate-600">
              {footerLinks.map((item) => (
                <div key={item.to}>
                  <Link to={item.to} className="transition-colors hover:text-slate-900">
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Support</h3>
            <nav className="space-y-2 text-sm text-slate-600">
              <div><Link to="/ai-assistant" className="transition-colors hover:text-slate-900">AI assistant</Link></div>
              <div><Link to="/verification" className="transition-colors hover:text-slate-900">Verification</Link></div>
              <div><Link to="/wallet" className="transition-colors hover:text-slate-900">Wallet</Link></div>
            </nav>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Community</h3>
            <nav className="space-y-2 text-sm text-slate-600">
              <div><Link to="/community" className="transition-colors hover:text-slate-900">Community</Link></div>
              <div><Link to="/messages" className="transition-colors hover:text-slate-900">Messages</Link></div>
              <div><Link to="/auth" className="transition-colors hover:text-slate-900">Sign in</Link></div>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-sm text-slate-500 sm:flex-row">
          <span>© 2026 TripMates. Built for every journey.</span>
          <div className="flex items-center gap-4">
            <span>Privacy-first</span>
            <span>Verified travelers</span>
            <span>App-ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
