import { api } from '../../lib/axios';
import type {
  UserParticipation,
  ParticipationUpdateRequest,
} from '../../types';

export async function getAllParticipation(teamId?: number): Promise<UserParticipation[]> {
  const params = teamId ? { team_id: teamId } : {};
  const response = await api.get<UserParticipation[]>('/participation', { params });
  return response.data;
}

export async function updateUserParticipation(
  updateData: ParticipationUpdateRequest
): Promise<UserParticipation> {
  const response = await api.put<UserParticipation>('/admin/participation', updateData);
  return response.data;
}
