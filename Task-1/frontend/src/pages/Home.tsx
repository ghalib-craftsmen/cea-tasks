export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-orange-600">Craft</span><span className="text-gray-900">Meal</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="h-20 w-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-xl">
                <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
                </svg>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
              Simplify your workplace
              <br />
              <span className="text-orange-600">meal planning</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              CraftMeal helps teams manage daily meal preferences, track headcount,
              and streamline food planning — all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-md"
              >
                Get Started
              </a>
              <a
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Log in
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-3 text-gray-600">Manage meals across your entire organization effortlessly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all">
              <div className="mx-auto h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Meal Preferences</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Employees set their daily meal choices with a single tap. Lunch, snacks, dinner — all covered.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all">
              <div className="mx-auto h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Headcount</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Real-time headcount tracking per team. Filter by meal type, team, and see participation stats.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all">
              <div className="mx-auto h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Analytics</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Visual charts and breakdowns for admins. Understand participation trends at a glance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Built for every role</h2>
            <p className="mt-3 text-gray-600">Tailored experience based on your responsibilities.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mb-4">
                Employee
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Set your meal preferences for tomorrow before the 9 PM cutoff.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 mb-4">
                Team Lead
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Manage your team's participation and view team headcount.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 mb-4">
                Logistics
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Access headcount data across all teams for planning.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 mb-4">
                Admin
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Full control over users, teams, approvals, and system settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Abdullah Al Ghalib. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
