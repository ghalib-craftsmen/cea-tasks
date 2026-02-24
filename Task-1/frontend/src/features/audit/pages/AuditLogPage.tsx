import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAuditLogs } from '../api';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  meal_update:     { label: 'Meal Update',     color: 'bg-blue-100 text-blue-800' },
  opt_in:          { label: 'Bulk Opt-In',     color: 'bg-green-100 text-green-800' },
  opt_out:         { label: 'Bulk Opt-Out',    color: 'bg-red-100 text-red-800' },
  location_change: { label: 'Location Change', color: 'bg-purple-100 text-purple-800' },
};

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function tryParseValue(raw: string): string {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === 'object' && obj !== null) {
      const opted = Object.entries(obj)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      if (opted.length > 0) return `Opted in: ${opted.join(', ')}`;
      return 'All opted out';
    }
  } catch {
    // plain string
  }
  return raw;
}

export function AuditLogPage() {
  const { isAuthenticated, user } = useAuth();

  const isAuthorized =
    user?.role === 'Admin' || user?.role === 'Logistics' || user?.role === 'TeamLead';

  const [filterDate, setFilterDate] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUserId, setFilterUserId] = useState('');

  const parsedUserId = filterUserId.trim() !== '' ? parseInt(filterUserId.trim(), 10) : undefined;
  const validUserId = parsedUserId !== undefined && !isNaN(parsedUserId) ? parsedUserId : undefined;

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filterDate, filterAction, validUserId],
    queryFn: () =>
      getAuditLogs({
        date: filterDate || undefined,
        action_type: filterAction || undefined,
        target_user_id: validUserId,
        limit: 200,
      }),
    enabled: isAuthenticated && isAuthorized,
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAuthorized) return <Navigate to="/dashboard" replace />;

  const hasActiveFilters = filterDate || filterAction || filterUserId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track who changed what and when for meal participation and work location updates.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        {/* Date filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Clear
            </button>
          )}
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* User ID filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">User ID:</label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 3"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterUserId && (
            <button onClick={() => setFilterUserId('')} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Clear
            </button>
          )}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={() => { setFilterDate(''); setFilterAction(''); setFilterUserId(''); }}
            className="text-xs text-red-400 hover:text-red-600 underline"
          >
            Clear all
          </button>
        )}

        <button
          onClick={() => refetch()}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No audit records found</p>
            <p className="text-xs mt-1">
              {hasActiveFilters ? 'Try removing some filters.' : 'Changes to meals and locations will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Affected</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">New Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action_type] ?? { label: log.action_type, color: 'bg-gray-100 text-gray-700' };
                  const isSelfEdit = log.actor_user_id === log.target_user_id;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900">
                            {log.actor_name ?? `#${log.actor_user_id}`}
                          </span>
                          {!isSelfEdit && (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                              Admin/Lead edit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">
                            {log.target_name ?? `#${log.target_user_id}`}
                          </span>
                          <span className="text-xs text-gray-400">ID: {log.target_user_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {log.date ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {tryParseValue(log.new_value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {logs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {logs.length} record{logs.length !== 1 ? 's' : ''} (newest first)
          </div>
        )}
      </div>
    </div>
  );
}
