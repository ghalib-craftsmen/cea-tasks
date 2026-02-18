import { api } from '../../lib/axios';
import type {
  MealRecord,
  ParticipationUpdate,
} from '../../types';

export async function getTodaysParticipation(): Promise<MealRecord> {
  const response = await api.get<MealRecord>('/meals/today');
  return response.data;
}

export async function updateParticipation(
  updateData: ParticipationUpdate
): Promise<MealRecord> {
  const response = await api.put<MealRecord>('/meals/participation', updateData);
  return response.data;
}
