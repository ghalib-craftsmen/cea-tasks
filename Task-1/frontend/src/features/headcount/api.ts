import { api } from '../../lib/axios';
import type {
  HeadcountSummary,
  MealUserList,
} from '../../types';

export async function getHeadcountSummary(): Promise<HeadcountSummary> {
  const response = await api.get<HeadcountSummary>('/headcount');
  return response.data;
}

export async function getMealUsers(mealType: string): Promise<MealUserList> {
  const response = await api.get<MealUserList>(`/headcount/${mealType}`);
  return response.data;
}
