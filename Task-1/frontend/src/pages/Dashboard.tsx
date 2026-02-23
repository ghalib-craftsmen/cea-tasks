import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';
import { getTodaysParticipation } from '../features/meals/api';
import { getHeadcountSummary } from '../features/headcount/api';
import { getMyLocation, checkSpecialDay } from '../features/locations/api';

const PIE_COLORS = ['#16a34a', '#dc2626'];

const MEAL_ICONS: Record<string, string> = {
  Lunch: '🥗', Snacks: '🍿', Iftar: '🌙', EventDinner: '🎉', OptionalDinner: '🍽️',
};
const MEAL_LABELS: Record<string, string> = {
  Lunch: 'Lunch', Snacks: 'Snacks', Iftar: 'Iftar', EventDinner: 'Event Dinner', OptionalDinner: 'Optional Dinner',
};

function MealSelectionPills({ mealData }: { mealData: { date: string; meals: Record<string, boolean> } }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Tomorrow's Meal Plan</h2>
        <span className="text-xs text-gray-400">{mealData.date}</span>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(mealData.meals).map(([mealType, selected]) => (
            <div
              key={mealType}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                selected
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
              }`}
            >
              <span>{MEAL_ICONS[mealType] ?? '🍴'}</span>
              <span>{MEAL_LABELS[mealType] ?? mealType}</span>
              {selected && (
                <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { isAuthenticated } = useAuth();

  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const tomorrowDisplay = new Date(tomorrow + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const { data: mealData, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
  });

  const canViewHeadcount = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics' || currentUser?.role === 'TeamLead';
  const isAdminOrLogistics = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics';
  const isTeamLead = currentUser?.role === 'TeamLead';

  const { data: headcountData, isLoading: headcountLoading } = useQuery({
    queryKey: ['headcount', isTeamLead ? currentUser?.team_id : undefined],
    queryFn: () => getHeadcountSummary(isTeamLead && currentUser?.team_id ? currentUser.team_id : undefined),
    enabled: canViewHeadcount,
  });

  const { data: locationData } = useQuery({
    queryKey: ['myLocation', tomorrow],
    queryFn: () => getMyLocation(tomorrow),
    enabled: isAuthenticated && !isAdminOrLogistics,
  });

  const { data: specialDay } = useQuery({
    queryKey: ['specialDay', tomorrow],
    queryFn: () => checkSpecialDay(tomorrow),
    enabled: isAuthenticated && !isAdminOrLogistics,
  });

  const selectedMealsCount = mealData ? Object.values(mealData.meals).filter(Boolean).length : 0;
  const totalMealsCount = mealData ? Object.keys(mealData.meals).length : 0;
  const totalEmployees = headcountData?.total_employees || 0;
  const optedInPercentage = headcountData?.meal_counts?.[0]?.opted_in_percentage || 0;
  const isWFH = locationData?.location === 'WFH';

  // WFH = automatically opted out of all meals
  const effectiveSelectedMealsCount = isWFH ? 0 : selectedMealsCount;
  const effectiveMealData = mealData && isWFH
    ? { ...mealData, meals: Object.fromEntries(Object.keys(mealData.meals).map(k => [k, false])) as Record<string, boolean> }
    : mealData;

  const barChartData = headcountData?.meal_counts?.map((mc) => ({
    name: mc.meal_type,
    'Opted In': mc.opted_in,
    'Opted Out': mc.opted_out,
  })) || [];

  const firstMeal = headcountData?.meal_counts?.[0];
  const pieChartData = firstMeal
    ? [
        { name: 'Opted In', value: firstMeal.opted_in },
        { name: 'Opted Out', value: firstMeal.opted_out },
      ]
    : [];

  // ─── Admin / Logistics dashboard ────────────────────────────────────────────
  if (isAdminOrLogistics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {currentUser?.name || currentUser?.username}! Here's an overview of your meal planning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Meals</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {mealsLoading ? '...' : selectedMealsCount}
                </p>
              </div>
              <div className="text-4xl">🍽️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {headcountLoading ? '...' : totalEmployees}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Participation</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {headcountLoading ? '...' : `${Math.round(optedInPercentage)}%`}
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {mealData?.date || new Date().toISOString().split('T')[0]}
                </p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </div>
        </div>

        {mealData && <MealSelectionPills mealData={mealData} />}

        {headcountData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">All Meals Participation</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Opted In" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Opted Out" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {firstMeal?.meal_type || 'Lunch'} Breakdown
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {pieChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Headcount Summary</h2>
              <div className="space-y-4">
                {headcountData.meal_counts.map((mealCount) => (
                  <div key={mealCount.meal_type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">🍽️</span>
                      <div>
                        <p className="font-medium text-gray-900">{mealCount.meal_type}</p>
                        <p className="text-sm text-gray-500">
                          {mealCount.opted_in} opted in, {mealCount.opted_out} opted out
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {mealCount.opted_in_percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">participation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Employee / TeamLead dashboard ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {currentUser?.name}
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {currentUser?.team_name ? `${currentUser.team_name} · ` : ''}
            {currentUser?.role === 'TeamLead' ? 'Team Lead' : currentUser?.role}
          </p>
        </div>
        {specialDay?.type && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            specialDay.type === 'Closed' ? 'bg-red-100 text-red-700' :
            specialDay.type === 'Holiday' ? 'bg-amber-100 text-amber-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {specialDay.type}{specialDay.note ? ` — ${specialDay.note}` : ''}
          </span>
        )}
      </div>

      {/* Food waste disclaimer — employees only */}
      {!canViewHeadcount && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex gap-3">
            <span className="text-2xl shrink-0">♻️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Help us reduce food waste</p>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                Every unnotified meal contributes to unnecessary food waste. Please update your meal
                participation <span className="font-semibold">before the daily cutoff</span> so the
                kitchen can prepare just the right amount. Even a small change in your plan —
                skipping lunch or opting out of snacks — makes a real difference when reported early.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-amber-700 list-disc list-inside">
                <li>Update your meal status as soon as you know your plans for the day.</li>
                <li>Working from home? Make sure your location and meal selection match.</li>
                <li>Last-minute changes cause over-ordering and wasted food.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* WFH opt-out notice */}
      {isWFH && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3">
          <span className="text-xl shrink-0">🏠</span>
          <div>
            <p className="text-sm font-semibold text-violet-800">Working from home — meals opted out</p>
            <p className="text-sm text-violet-700 mt-0.5 leading-relaxed">
              Your work location is set to <span className="font-semibold">WFH</span> for tomorrow.
              Employees working from home are automatically considered opted out of all meals.
              To participate in meals, update your location to <span className="font-semibold">Office</span>.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl border shadow-sm p-5 ${isWFH ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Meals opted in</p>
          <p className={`mt-2 text-3xl font-bold ${isWFH ? 'text-gray-400' : 'text-gray-900'}`}>
            {mealsLoading ? '—' : effectiveSelectedMealsCount}
            <span className="text-base font-normal text-gray-400"> / {totalMealsCount}</span>
          </p>
          {isWFH && <p className="mt-1 text-xs text-violet-500 font-medium">WFH — opted out</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tomorrow</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 leading-snug">{tomorrowDisplay}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</p>
          <p className={`mt-2 text-lg font-bold ${isWFH ? 'text-violet-700' : 'text-blue-700'}`}>
            {isWFH ? '🏠 WFH' : '🏢 Office'}
          </p>
        </div>

        {canViewHeadcount ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Participation</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {headcountLoading ? '—' : `${Math.round(optedInPercentage)}%`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Team</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 leading-snug truncate">
              {currentUser?.team_name || '—'}
            </p>
          </div>
        )}
      </div>

      {/* Tomorrow's meal plan */}
      {effectiveMealData && <MealSelectionPills mealData={effectiveMealData} />}

      {/* Quick actions + how it works — employees only */}
      {!canViewHeadcount && (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/meals"
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-green-300 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl shrink-0 group-hover:bg-green-100 transition-colors">
                🍽️
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Update Meal Participation</p>
                <p className="text-xs text-gray-500 mt-0.5">Choose which meals you'll have tomorrow</p>
              </div>
              <svg className="ml-auto w-4 h-4 text-gray-300 group-hover:text-green-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/locations"
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-2xl shrink-0 group-hover:bg-violet-100 transition-colors">
                📍
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Update Work Location</p>
                <p className="text-xs text-gray-500 mt-0.5">Let us know if you'll be in office or WFH</p>
              </div>
              <svg className="ml-auto w-4 h-4 text-gray-300 group-hover:text-violet-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* How it works */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">1</div>
                <p className="text-sm font-semibold text-gray-800">Set your location</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tell the system whether you'll be at the office or working from home for tomorrow.
                  This helps match your headcount to the right kitchen.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">2</div>
                <p className="text-sm font-semibold text-gray-800">Choose your meals</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Opt in or out of each meal — Lunch, Snacks, Iftar, or special event meals —
                  based on your plans for the day.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">3</div>
                <p className="text-sm font-semibold text-gray-800">Submit before the cutoff</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Save your choices before the daily cutoff time so the kitchen can prepare the right
                  quantity. Late changes may not be reflected.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TeamLead charts */}
      {canViewHeadcount && headcountData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Team's Meal Participation</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Opted In" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Opted Out" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                {firstMeal?.meal_type || 'Lunch'} Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {pieChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Headcount Summary</h2>
            <div className="space-y-4">
              {headcountData.meal_counts.map((mealCount) => (
                <div key={mealCount.meal_type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <p className="font-medium text-gray-900">{mealCount.meal_type}</p>
                      <p className="text-sm text-gray-500">
                        {mealCount.opted_in} opted in, {mealCount.opted_out} opted out
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {mealCount.opted_in_percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">participation</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
