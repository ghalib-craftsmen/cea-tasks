import axios from '../../lib/axios';
import type { User, Team } from '../../types';

export async function getCurrentUser(): Promise<User> {
  const response = await axios.get<User>('/api/me');
  return response.data;
}

export async function getTeams(): Promise<Team[]> {
  const response = await axios.get<Team[]>('/api/teams');
  return response.data;
}
