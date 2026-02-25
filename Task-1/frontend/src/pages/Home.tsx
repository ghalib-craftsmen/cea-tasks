const FOOD_ITEMS = [
  { emoji: '🍽️', left: '4%',  top: '78%', duration: '22s', delay: '0s',    anim: 'driftUpRight' },
  { emoji: '🥗',  left: '15%', top: '88%', duration: '18s', delay: '3.5s',  anim: 'driftUp'      },
  { emoji: '🍜',  left: '27%', top: '72%', duration: '25s', delay: '7s',    anim: 'driftUpLeft'  },
  { emoji: '🥘',  left: '38%', top: '91%', duration: '20s', delay: '1.5s',  anim: 'driftUpRight' },
  { emoji: '🍱',  left: '50%', top: '81%', duration: '23s', delay: '9s',    anim: 'driftUp'      },
  { emoji: '🥙',  left: '63%', top: '85%', duration: '19s', delay: '5s',    anim: 'driftUpLeft'  },
  { emoji: '🍲',  left: '74%', top: '75%', duration: '26s', delay: '12s',   anim: 'driftUpRight' },
  { emoji: '🍛',  left: '87%', top: '92%', duration: '21s', delay: '4s',    anim: 'driftUp'      },
  { emoji: '🥞',  left: '94%', top: '68%', duration: '17s', delay: '8s',    anim: 'driftUpLeft'  },
  { emoji: '🥦',  left: '9%',  top: '55%', duration: '24s', delay: '15s',   anim: 'driftUpRight' },
  { emoji: '🍅',  left: '33%', top: '62%', duration: '20s', delay: '11s',   anim: 'driftUp'      },
  { emoji: '🥕',  left: '57%', top: '60%', duration: '22s', delay: '6s',    anim: 'driftUpLeft'  },
  { emoji: '🍖',  left: '79%', top: '64%', duration: '19s', delay: '14s',   anim: 'driftUpRight' },
  { emoji: '🫕',  left: '21%', top: '42%', duration: '23s', delay: '2s',    anim: 'driftUp'      },
  { emoji: '🧅',  left: '45%', top: '48%', duration: '21s', delay: '17s',   anim: 'driftUpLeft'  },
  { emoji: '🍳',  left: '68%', top: '40%', duration: '18s', delay: '10s',   anim: 'driftUpRight' },
  { emoji: '🧆',  left: '89%', top: '50%', duration: '26s', delay: '13s',   anim: 'driftUp'      },
  { emoji: '🥩',  left: '48%', top: '32%', duration: '20s', delay: '19s',   anim: 'driftUpLeft'  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Set your preference',
    desc: 'Employees choose their meal preference for the next day before the 9 PM cutoff — in seconds.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Team lead reviews',
    desc: 'Team leads approve responses and get a clear snapshot of their team\'s daily participation.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Ops gets the count',
    desc: 'Operations receives consolidated headcount data to coordinate and place food orders accurately.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
];

const ROLES = [
  {
    role: 'Employee',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    icon: '👤',
    desc: 'Set meal preferences before the 9 PM cutoff. Track your own participation history at a glance.',
  },
  {
    role: 'Team Lead',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    icon: '👥',
    desc: "Review and approve your team's responses. Get a consolidated team headcount overview.",
  },
  {
    role: 'Logistics',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    icon: '📦',
    desc: 'Access headcount data across all teams to coordinate and place accurate food orders.',
  },
  {
    role: 'Admin',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    icon: '⚙️',
    desc: 'Full control over users, teams, approvals, and organization-wide system settings.',
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes driftUp {
          0%   { transform: translateY(0px) rotate(0deg);  opacity: 0; }
          8%   { opacity: 0.13; }
          92%  { opacity: 0.13; }
          100% { transform: translateY(-32vh) rotate(12deg); opacity: 0; }
        }
        @keyframes driftUpLeft {
          0%   { transform: translateY(0px) translateX(0px) rotate(0deg);    opacity: 0; }
          8%   { opacity: 0.13; }
          92%  { opacity: 0.13; }
          100% { transform: translateY(-28vh) translateX(-60px) rotate(-18deg); opacity: 0; }
        }
        @keyframes driftUpRight {
          0%   { transform: translateY(0px) translateX(0px) rotate(0deg);   opacity: 0; }
          8%   { opacity: 0.13; }
          92%  { opacity: 0.13; }
          100% { transform: translateY(-30vh) translateX(60px) rotate(20deg); opacity: 0; }
        }
      `}</style>

      {/* ── Food watermark layer (fixed, behind everything) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          zIndex: 40, pointerEvents: 'none',
          overflow: 'hidden', userSelect: 'none',
        }}
      >
        {FOOD_ITEMS.map(({ emoji, left, top, duration, delay, anim }) => (
          <span
            key={`${emoji}-${left}`}
            style={{
              position: 'absolute', left, top,
              fontSize: '3rem', lineHeight: 1,
              opacity: 0,
              animation: `${anim} ${duration} ease-in-out ${delay} infinite`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* ── All page content sits above the watermark ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ════════════════════════════════════
            NAVBAR
        ════════════════════════════════════ */}
        <nav className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">

              {/* Logo */}
              <a href="/" className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm shadow-orange-200">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-orange-600">Craft</span><span className="text-gray-900">Meal</span>
                </span>
              </a>

              {/* Nav links */}
              <div className="hidden md:flex items-center gap-7">
                <a href="#features"     className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Features</a>
                <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">How it works</a>
                <a href="#roles"        className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">Roles</a>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <a href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Log in
                </a>
                <a
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all shadow-sm shadow-orange-200"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* ════════════════════════════════════
            HERO
        ════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/50 to-white pt-24 pb-32 sm:pt-32 sm:pb-40">

          {/* Decorative blurred blobs */}
          <div aria-hidden="true" className="absolute -top-48 -right-48 w-[560px] h-[560px] rounded-full bg-orange-200/25 blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">

              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-orange-200 text-orange-700 text-sm font-semibold shadow-sm shadow-orange-100 mb-8">
                <span className="text-base leading-none">🍽️</span>
                Workplace Meal Management
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-[3.75rem] font-extrabold text-gray-900 tracking-tight leading-[1.07] mb-6">
                Smart meal planning
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                  for your teams
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
                CraftMeal helps organizations manage daily meal preferences, track headcount,
                and coordinate food planning — all in one beautifully simple platform.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
                <a
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Get started free
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <a
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:-translate-y-0.5"
                >
                  Log in to your account
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-sm text-gray-500">
                {[
                  'Daily meal preferences',
                  'Real-time headcount',
                  'Role-based access',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            FEATURES
        ════════════════════════════════════ */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider mb-4">
                Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything your team needs</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Manage meals across your entire organization with purpose-built tools for every role.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {[
                {
                  gradient: 'from-orange-500 to-amber-400',
                  shadow: 'shadow-orange-100',
                  hoverBorder: 'hover:border-orange-200 hover:shadow-orange-50',
                  icon: (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: 'Meal Preferences',
                  desc: 'Employees set their daily meal choices before the cutoff. Lunch, snacks, dinner — all tracked with a single tap.',
                },
                {
                  gradient: 'from-blue-500 to-blue-400',
                  shadow: 'shadow-blue-100',
                  hoverBorder: 'hover:border-blue-200 hover:shadow-blue-50',
                  icon: (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  ),
                  title: 'Team Headcount',
                  desc: 'Real-time headcount tracking per team. Filter by meal type and monitor participation rates across the org.',
                },
                {
                  gradient: 'from-emerald-500 to-green-400',
                  shadow: 'shadow-green-100',
                  hoverBorder: 'hover:border-emerald-200 hover:shadow-emerald-50',
                  icon: (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  ),
                  title: 'Reports & Analytics',
                  desc: 'Visual charts and breakdowns for admins. Understand participation trends and plan orders with confidence.',
                },
              ].map(({ gradient, shadow, hoverBorder, icon, title, desc }) => (
                <div
                  key={title}
                  className={`group p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-default ${hoverBorder}`}
                >
                  <div className={`h-12 w-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 shadow-md ${shadow} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            HOW IT WORKS
        ════════════════════════════════════ */}
        <section id="how-it-works" className="py-24 bg-gradient-to-b from-orange-50/70 via-amber-50/30 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
                How it works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">From preference to plate</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Three steps and your team's meal coordination is handled.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {/* Connector line (desktop) */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-orange-200 via-amber-300 to-orange-200"
              />

              {HOW_IT_WORKS.map(({ step, title, desc, icon }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
                      {icon}
                    </div>
                    <span className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            ROLES
        ════════════════════════════════════ */}
        <section id="roles" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wider mb-4">
                Built for every role
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Tailored for your responsibilities</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Each user gets a personalized experience based on what they actually need.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {ROLES.map(({ role, badgeBg, badgeText, icon, desc }) => (
                <div
                  key={role}
                  className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-lg hover:border-orange-100 hover:-translate-y-1 transition-all duration-300 cursor-default"
                >
                  <div className="text-3xl mb-4 leading-none">{icon}</div>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${badgeBg} ${badgeText} mb-3`}>
                    {role}
                  </span>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            CTA BANNER
        ════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 py-24">
          {/* Decorative blob */}
          <div aria-hidden="true" className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-5xl mb-6">🍽️</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
              Ready to simplify your
              <br />team's meal planning?
            </h2>
            <p className="text-orange-100 text-lg mb-10 max-w-xl mx-auto">
              Eliminate daily coordination chaos. CraftMeal keeps everyone on the same plate.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all shadow-xl hover:-translate-y-0.5"
            >
              Get started for free
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </section>

        {/* ════════════════════════════════════
            FOOTER
        ════════════════════════════════════ */}
        <footer className="bg-gray-950 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
                  </svg>
                </div>
                <span className="text-base font-bold">
                  <span className="text-orange-400">Craft</span><span className="text-white">Meal</span>
                </span>
              </div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Abdullah Al Ghalib. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
