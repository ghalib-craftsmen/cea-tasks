import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getDashboardSummary } from '../../admin/api';
import { getCurrentUser } from '../../users/api';
import { Spinner } from '../../../components/ui/Spinner';

const MEAL_TYPES = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'] as const;
const MEAL_LABELS: Record<string, string> = {
  Lunch: 'Lunch', Snacks: 'Snacks', Iftar: 'Iftar', EventDinner: 'Event Dinner', OptionalDinner: 'Optional Dinner',
};
const MEAL_ICONS: Record<string, string> = {
  Lunch: '🍱', Snacks: '🍿', Iftar: '🌙', EventDinner: '🎉', OptionalDinner: '🍽️',
};

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accent?: 'green' | 'blue' | 'amber' | 'purple';
}) {
  const accentMap = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  const cardClass = accent ? accentMap[accent] : 'bg-white border-gray-200 text-gray-900';
  const valueClass = accent
    ? { green: 'text-green-800', blue: 'text-blue-800', amber: 'text-amber-800', purple: 'text-purple-800' }[accent]
    : 'text-gray-900';

  return (
    <div className={`rounded-xl border shadow-sm p-6 ${cardClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className={`mt-2 text-4xl font-bold ${valueClass}`}>{value}</p>
          {sub && <p className="mt-1 text-sm opacity-60">{sub}</p>}
        </div>
        <span className="text-3xl" aria-hidden="true">{icon}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function OperationalDashboardPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMealType, setSelectedMealType] = useState<string>('Lunch');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const canAccess =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Logistics' ||
    currentUser?.role === 'TeamLead';

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    enabled: isAuthenticated && !!canAccess,
    staleTime: 60_000, // treat as fresh for 1 min — small JSON payload
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser && !canAccess) return <Navigate to="/dashboard" replace />;

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 font-medium">Failed to load dashboard summary.</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const wfhOverLimitPct = summary.total_employees > 0
    ? Math.round((summary.wfh_over_limit_count / summary.total_employees) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operational Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live overview · {formatDate(summary.today_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Meal:</span>
          <select
            value={selectedMealType}
            onChange={(e) => setSelectedMealType(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MEAL_TYPES.map((meal) => (
              <option key={meal} value={meal}>{MEAL_ICONS[meal]} {MEAL_LABELS[meal]}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Today's Headcount"
          value={summary.today_meal_counts?.[selectedMealType] ?? summary.today_headcount}
          sub={`of ${summary.total_employees} employees · ${MEAL_LABELS[selectedMealType]}`}
          icon={MEAL_ICONS[selectedMealType]}
          accent="green"
        />
        <StatCard
          label="Tomorrow's Forecast"
          value={summary.tomorrow_meal_counts?.[selectedMealType] ?? summary.tomorrow_forecast}
          sub={`${formatDate(summary.tomorrow_date)} · ${MEAL_LABELS[selectedMealType]}`}
          icon="📅"
          accent="blue"
        />
        <StatCard
          label="Total Employees"
          value={summary.total_employees}
          sub="approved accounts"
          icon="👥"
        />
        <StatCard
          label="WFH Policy Alerts"
          value={summary.wfh_over_limit_count}
          sub={`${wfhOverLimitPct}% over ${summary.wfh_allowance}-day limit`}
          icon="⚠️"
          accent={summary.wfh_over_limit_count > 0 ? 'amber' : undefined}
        />
      </div>

      {/* WFH Compliance Alert Banner */}
      {summary.wfh_over_limit_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <span className="text-2xl shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {summary.wfh_over_limit_count} employee{summary.wfh_over_limit_count > 1 ? 's' : ''} exceeded the WFH allowance this month
            </p>
            <p className="text-sm text-amber-700 mt-1">
              The monthly WFH allowance is <strong>{summary.wfh_allowance} days</strong>. Review affected employees in the Participation view.
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="shrink-0 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            Review
          </Link>
        </div>
      )}

      {/* Two-column bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Event Meals */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Event Meals</h2>
            <Link
              to="/admin/events"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Manage →
            </Link>
          </div>
          {summary.upcoming_events.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              <span className="text-3xl">🎉</span>
              <p className="mt-2 text-sm">No upcoming event meals in the next 30 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.upcoming_events.map((event) => (
                <li key={event.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-800 leading-none">
                      {new Date(event.date + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{event.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.date)}</p>
                  </div>
                  <span className="text-xl shrink-0">🍽️</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { to: '/headcount', icon: '👥', label: 'View Headcount', sub: 'Meal participation breakdown by team' },
              { to: '/admin/dashboard', icon: '⚙️', label: 'Manage Participation', sub: 'Edit meal choices per employee' },
              { to: '/admin/audit-logs', icon: '📋', label: 'Audit Logs', sub: 'Track who changed what and when' },
              { to: '/admin/events', icon: '🎉', label: 'Event Meals', sub: 'Create or review special event meals' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl shrink-0">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.sub}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
