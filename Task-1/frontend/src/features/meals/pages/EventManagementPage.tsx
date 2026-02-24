import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getCurrentUser } from '../../users/api';
import { getEventMeals, createEventMeal, deleteEventMeal, getEventRSVPStats } from '../api';
import type { EventMealCreate, EventMealResponse, EventRSVPStats } from '../../../types';
import { Toast } from '../../../components/ui/toastUtils';
import { Spinner } from '../../../components/ui/Spinner';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// ── RSVP Stats Panel ──────────────────────────────────────────────────────────

function RSVPStatsPanel({ eventId }: { eventId: number }) {
  const { data: stats, isLoading } = useQuery<EventRSVPStats>({
    queryKey: ['rsvp-stats', eventId],
    queryFn: () => getEventRSVPStats(eventId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) return null;

  const total = stats.accepted_count + stats.declined_count + stats.pending_count;
  const acceptedPct = total > 0 ? Math.round((stats.accepted_count / total) * 100) : 0;

  return (
    <div className="px-6 pb-5 pt-2 bg-gray-50 border-t border-gray-100">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          ✓ Accepted: {stats.accepted_count}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          ✕ Declined: {stats.declined_count}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
          ⏳ Pending: {stats.pending_count}
        </span>
        {total > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 ml-auto">
            {acceptedPct}% response rate
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${acceptedPct}%` }}
          />
        </div>
      )}

      {/* Three columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Accepted */}
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1.5 uppercase tracking-wide">Accepted ({stats.accepted_count})</p>
          {stats.accepted.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No one yet</p>
          ) : (
            <ul className="space-y-1">
              {stats.accepted.map((u) => (
                <li key={u.user_id} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Declined */}
        <div>
          <p className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">Declined ({stats.declined_count})</p>
          {stats.declined.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No one yet</p>
          ) : (
            <ul className="space-y-1">
              {stats.declined.map((u) => (
                <li key={u.user_id} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Awaiting ({stats.pending_count})</p>
          {stats.pending.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Everyone responded</p>
          ) : (
            <ul className="space-y-1">
              {stats.pending.map((u) => (
                <li key={u.user_id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Event Row ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  onDelete,
  isDeleting,
}: {
  event: EventMealResponse;
  onDelete: (id: number, title: string) => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 shrink-0">
          🎉 {formatDate(event.date)}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
          {event.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{event.description}</p>
          )}
        </div>

        {/* RSVP toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            expanded
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          RSVP Stats
        </button>

        <button
          onClick={() => onDelete(event.id, event.title)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>

      {/* RSVP panel — expands inline */}
      {expanded && <RSVPStatsPanel eventId={event.id} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function EventManagementPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics';

  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [form, setForm] = useState<EventMealCreate>({ date: '', title: '', description: '' });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['event-meals', filterDate || 'all'],
    queryFn: () => getEventMeals(filterDate || undefined),
    enabled: isAuthenticated && isAuthorized,
  });

  const createMutation = useMutation({
    mutationFn: (data: EventMealCreate) => createEventMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-meals'] });
      Toast.success('Event meal created! Employees will be notified.');
      setForm({ date: '', title: '', description: '' });
      setShowForm(false);
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to create event meal.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEventMeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-meals'] });
      Toast.success('Event meal deleted.');
    },
    onError: () => {
      Toast.error('Failed to delete event meal.');
    },
  });

  const isLoading = eventsLoading;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!isAuthorized) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.title.trim()) {
      Toast.error('Date and title are required.');
      return;
    }
    createMutation.mutate({ ...form, description: form.description || undefined });
  };

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Delete event meal "${title}"? This will also remove all RSVP responses.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Meals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create special event meals. Employees receive an invitation and can accept or decline.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Event
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Create Event Meal</h2>
          <p className="text-xs text-gray-500 mb-4">
            All employees will receive an RSVP notification once this is saved.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Ramadan Iftar Gathering"
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Additional details about the event"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ date: '', title: '', description: '' }); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create & Notify Employees'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by date:</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {filterDate && (
          <button onClick={() => setFilterDate('')} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Clear
          </button>
        )}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-16 text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">No event meals found</p>
          <p className="text-xs mt-1">{filterDate ? 'No events for this date.' : 'Create your first event meal above.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
