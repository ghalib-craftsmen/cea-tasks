import { api } from '../../lib/axios';
import type {
  UserParticipation,
  ParticipationUpdateRequest,
  PendingUser,
  ApproveUserRequest,
  AdminUser,
} from '../../types';

export async function getAllParticipation(teamId?: number): Promise<UserParticipation[]> {
  const params = teamId ? { team_id: teamId } : {};
  const response = await api.get<UserParticipation[]>('/participation', { params });
  return response.data;
}

export async function updateUserParticipation(
  updateData: ParticipationUpdateRequest
): Promise<UserParticipation> {
  const response = await api.put<UserParticipation>('/participation', updateData);
  return response.data;
}

export async function getPendingUsers(): Promise<PendingUser[]> {
  const response = await api.get<PendingUser[]>('/admin/pending-users');
  return response.data;
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUser[]>('/admin/users');
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

export async function deleteUser(userId: number): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/admin/users/${userId}`);
  return response.data;
}

export async function updateUser(userId: number, data: { role?: string; team_id?: number | null }): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>(`/admin/users/${userId}`, data);
  return response.data;
}
