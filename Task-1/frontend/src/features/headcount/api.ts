import { api } from '../../lib/axios';
import type {
  HeadcountSummary,
  MealUserList,
  HeadcountAggregationResponse,
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

export async function getHeadcountAggregation(date?: string): Promise<HeadcountAggregationResponse> {
  const params = date ? { date } : {};
  const response = await api.get<HeadcountAggregationResponse>('/headcount/aggregation', { params });
  return response.data;
}
