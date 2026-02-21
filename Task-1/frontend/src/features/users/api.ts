import axios from '../../lib/axios';
import type { User, Team } from '../../types';

export async function getCurrentUser(): Promise<User> {
  const response = await axios.get<User>('/me');
  return response.data;
}

export async function getTeams(): Promise<Team[]> {
  const response = await axios.get<Team[]>('/teams');
  return response.data;
}
