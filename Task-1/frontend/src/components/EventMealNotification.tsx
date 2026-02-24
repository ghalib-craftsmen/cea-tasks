import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';
import { getPendingRSVPs, submitRSVP } from '../features/meals/api';
import type { EventMealResponse } from '../types';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

interface NotificationCardProps {
  event: EventMealResponse;
  onRespond: (response: 'accepted' | 'declined') => void;
  isPending: boolean;
}

function NotificationCard({ event, onRespond, isPending }: NotificationCardProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
      {/* Accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
            🎉
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Event Meal Invitation</p>
            <h3 className="mt-0.5 text-base font-bold text-gray-900 leading-snug">{event.title}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{formatDate(event.date)}</p>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onRespond('accepted')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
          <button
            onClick={() => onRespond('declined')}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decline
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-gray-400">You can change your response later.</p>
      </div>
    </div>
  );
}

export function EventMealNotification() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  // Only show for Employee and TeamLead — Admin/Logistics manage events, not attend them
  const shouldShow =
    isAuthenticated &&
    (currentUser?.role === 'Employee' || currentUser?.role === 'TeamLead');

  const { data: pendingEvents = [] } = useQuery({
    queryKey: ['pending-rsvps'],
    queryFn: getPendingRSVPs,
    enabled: shouldShow,
    refetchInterval: 60_000,      // re-check every minute
    refetchOnWindowFocus: true,   // check when user returns to tab
    staleTime: 30_000,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, response }: { eventId: number; response: 'accepted' | 'declined' }) =>
      submitRSVP(eventId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-rsvps'] });
    },
  });

  // Show only the first pending event (queue-style: one at a time)
  const nextEvent: EventMealResponse | undefined = pendingEvents[0];

  if (!shouldShow || !nextEvent) return null;

  return (
    <NotificationCard
      event={nextEvent}
      onRespond={(response) => rsvpMutation.mutate({ eventId: nextEvent.id, response })}
      isPending={rsvpMutation.isPending}
    />
  );
}
