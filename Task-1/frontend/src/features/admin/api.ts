import { api } from '../../lib/axios';
import type {
  UserParticipation,
  ParticipationUpdateRequest,
} from '../../types';

export async function getAllParticipation(): Promise<UserParticipation[]> {
  const response = await api.get<UserParticipation[]>('/admin/participation');
  return response.data;
}

export async function updateUserParticipation(
  updateData: ParticipationUpdateRequest
): Promise<UserParticipation> {
  const response = await api.put<UserParticipation>('/admin/participation', updateData);
  return response.data;
}
