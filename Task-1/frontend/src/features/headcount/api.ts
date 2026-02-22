import { api } from '../../lib/axios';
import type {
  HeadcountSummary,
  MealUserList,
} from '../../types';

export async function getHeadcountSummary(teamId?: number): Promise<HeadcountSummary> {
  const params = teamId ? { team_id: teamId } : {};
  const response = await api.get<HeadcountSummary>('/headcount', { params });
  return response.data;
}

export async function getMealUsers(mealType: string, teamId?: number): Promise<MealUserList> {
  const params = teamId ? { team_id: teamId } : {};
  const response = await api.get<MealUserList>(`/headcount/${mealType}`, { params });
  return response.data;
}
