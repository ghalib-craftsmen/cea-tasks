import { api } from '../../lib/axios';
import type { AuditLogResponse } from '../../types';

export interface AuditLogFilters {
  date?: string;
  target_user_id?: number;
  action_type?: string;
  limit?: number;
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogResponse[]> {
  const response = await api.get<AuditLogResponse[]>('/audit-logs', {
    params: filters,
  });
  return response.data;
}
