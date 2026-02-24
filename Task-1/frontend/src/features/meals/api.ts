import { api } from '../../lib/axios';
import type {
  MealRecord,
  ParticipationUpdate,
  EventMealCreate,
  EventMealResponse,
} from '../../types';

export async function getTodaysParticipation(date?: string): Promise<MealRecord> {
  const response = await api.get<MealRecord>('/meals/today', {
    params: date ? { date } : undefined,
  });
  return response.data;
}

export async function updateParticipation(
  updateData: ParticipationUpdate
): Promise<MealRecord> {
  const response = await api.put<MealRecord>('/meals/participation', updateData);
  return response.data;
}

// Event Meals

export async function getEventMeals(date?: string): Promise<EventMealResponse[]> {
  const response = await api.get<EventMealResponse[]>('/event-meals', {
    params: date ? { date } : undefined,
  });
  return response.data;
}

export async function createEventMeal(data: EventMealCreate): Promise<EventMealResponse> {
  const response = await api.post<EventMealResponse>('/event-meals', data);
  return response.data;
}

export async function deleteEventMeal(id: number): Promise<void> {
  await api.delete(`/event-meals/${id}`);
}
