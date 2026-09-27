const services = [
  "Homes & stay listings",
  "Cab and scooter bookings",
  "Guides and local experiences",
  "Trip planning & logistics",
];

const metrics = [
  { value: "12k+", label: "providers onboarded" },
  { value: "96%", label: "provider satisfaction" },
  { value: "< 4 min", label: "avg. booking response" },
  { value: "24/7", label: "operational support" },
];

const pillars = [
  {
    title: "Shared backend",
    body: "One PostgreSQL database and one Prisma schema drive both the traveler and provider experiences without duplicating the source of truth.",
  },
  {
    title: "Role based access",
    body: "Users, providers, admins, and travel agents each receive scoped permissions based on role and verified business status.",
  },
  {
    title: "Marketplace operations",
    body: "Listings, availability, booking flow, payouts, reviews, and communication stay aligned across all service categories.",
  },
];

const flow = [
  "Create provider profile",
  "Verify business and identity",
  "Publish listings and availability",
  "Receive bookings and manage payouts",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <header className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between rounded-full border border-black/5 bg-white/80 px-5 py-3 shadow-[0_8px_30px_rgba(17,17,17,0.04)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-white">
              T
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-[#111111]/70 uppercase">
                TripMates
              </p>
              <p className="text-xs text-[#111111]/50">Services</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-[#111111]/70 md:flex">
            <a href="#platform">Platform</a>
            <a href="#services">Services</a>
            <a href="#workflow">Workflow</a>
            <a href="#architecture">Architecture</a>
          </nav>
          <button className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2d2d2d]">
            Join as provider
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-[#10b981]/30 bg-[#ecfdf5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#047857]">
              Shared platform architecture
            </div>
            <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-6xl">
              The travel services layer for every TripMates journey.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#3a3a3a]">
              Built to help travelers discover verified local providers while keeping provider operations, bookings, and trust data connected to the same TripMates backend.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="rounded-full bg-[#10b981] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:bg-[#059669]">
                Become a provider
              </button>
              <button className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition hover:border-black/15 hover:bg-[#f3f3f3]">
                Explore marketplace
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {services.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-sm text-[#111111]/75"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-8 h-60 w-60 rounded-full bg-[#10b981]/12 blur-3xl" />
            <div className="absolute -right-4 bottom-0 h-48 w-48 rounded-full bg-[#111111]/8 blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="rounded-[24px] bg-[#f3f3f0] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#111111]/50">
                      Provider dashboard
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">TripMates Services</h2>
                  </div>
                  <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                    Verified
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-black/5 bg-white p-4">
                      <p className="text-2xl font-semibold tracking-[-0.05em]">{metric.value}</p>
                      <p className="mt-1 text-xs text-[#111111]/60">{metric.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-black/5 bg-[#111111] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">This week</span>
                    <span className="text-sm font-medium">₹82,400</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-[#10b981]" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-left text-xs text-white/70">
                    <div>
                      <p className="text-white/50">Bookings</p>
                      <p className="mt-1 text-base font-semibold text-white">64</p>
                    </div>
                    <div>
                      <p className="text-white/50">Revenue</p>
                      <p className="mt-1 text-base font-semibold text-white">₹24k</p>
                    </div>
                    <div>
                      <p className="text-white/50">Rating</p>
                      <p className="mt-1 text-base font-semibold text-white">4.9</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]/50">
            Why this works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111] sm:text-4xl">
            One ecosystem, not two disconnected systems.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_10px_30px_rgba(17,17,17,0.04)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdf5] text-lg text-[#047857]">
                ✓
              </div>
              <h3 className="text-xl font-semibold text-[#111111]">{pillar.title}</h3>
              <p className="mt-3 leading-7 text-[#3a3a3a]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="bg-[#111111] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Service categories
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Market-ready offerings across the full travel journey.
              </h2>
            </div>
            <p className="max-w-xl text-white/70">
              Every listing type plugs into the same booking, payout, review, and verification engine.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Stay & homestays",
              "Taxi & cab bookings",
              "Scooters & local rides",
              "Tour guide services",
              "Treks & adventure",
              "Camping & travel logistics",
              "Photography & content",
              "Travel concierge",
            ].map((item) => (
              <div key={item} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                <div className="mb-3 h-10 w-10 rounded-full bg-[#10b981]/15" />
                <p className="text-lg font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]/50">
            Provider workflow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111] sm:text-4xl">
            From onboarding to payout in a few guided steps.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {flow.map((step, index) => (
            <div key={step} className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.04)]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                {index + 1}
              </div>
              <p className="text-lg font-medium text-[#111111]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="architecture" className="bg-[#f0fdf8] py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]/50">
              Shared backend
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111] sm:text-4xl">
              A single source of truth for traveler trust and provider operations.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[30px] border border-[#10b981]/20 bg-white p-6 shadow-[0_12px_35px_rgba(16,185,129,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#047857]">
                Data layer
              </p>
              <ul className="mt-4 space-y-3 text-[#3a3a3a]">
                <li>• Prisma models for users, providers, listings, bookings, reviews, wallets, and verification.</li>
                <li>• PostgreSQL database shared across consumer and provider apps.</li>
                <li>• Supabase authentication and profile sync for consistent user identity.</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.04)]">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#111111]/60">
                Access control
              </p>
              <ul className="mt-4 space-y-3 text-[#3a3a3a]">
                <li>• User roles mapped to traveler, provider, and admin permissions.</li>
                <li>• Provider onboarding gated by verification stage and business status.</li>
                <li>• Booking, payout, and review operations scoped to the right service owner.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_10px_25px_rgba(17,17,17,0.04)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]/50">
              TripMates Services
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
              Launch a trusted provider marketplace.
            </h3>
          </div>
          <button className="rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2f2f2f]">
            Start building
          </button>
        </div>
      </footer>
    </main>
  );
}
