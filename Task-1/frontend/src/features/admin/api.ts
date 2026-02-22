import { api } from '../../lib/axios';
import type {
  UserParticipation,
  ParticipationUpdateRequest,
  PendingUser,
  ApproveUserRequest,
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

export async function getPendingUsers(): Promise<PendingUser[]> {
  const response = await api.get<PendingUser[]>('/admin/pending-users');
  return response.data;
}

export async function approveUser(data: ApproveUserRequest): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>('/admin/approve-user', data);
  return response.data;
}

export async function rejectUser(userId: number): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>('/admin/reject-user', { user_id: userId });
  return response.data;
}
