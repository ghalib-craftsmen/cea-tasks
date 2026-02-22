import axios from '../../lib/axios';
import type {
  WorkLocationResponse,
  WorkLocationUpdate,
  WorkLocationAdminUpdate,
  WFHPeriodResponse,
  WFHPeriodCreate,
  SpecialDayResponse,
  SpecialDayCreate,
  SpecialDayCheck,
} from '../../types';

const API_BASE = '/api';

// Work Location Endpoints

export async function getMyLocation(date: string): Promise<WorkLocationResponse> {
  const response = await axios.get<WorkLocationResponse>(`${API_BASE}/me/location`, {
    params: { date },
  });
  return response.data;
}

export async function updateMyLocation(data: WorkLocationUpdate): Promise<WorkLocationResponse> {
  const response = await axios.put<WorkLocationResponse>(`${API_BASE}/me/location`, data);
  return response.data;
}

export async function updateUserLocation(data: WorkLocationAdminUpdate): Promise<WorkLocationResponse> {
  const response = await axios.put<WorkLocationResponse>(`${API_BASE}/work-location`, data);
  return response.data;
}

// WFH Period Endpoints

export async function getWFHPeriods(): Promise<WFHPeriodResponse[]> {
  const response = await axios.get<WFHPeriodResponse[]>(`${API_BASE}/wfh-periods`);
  return response.data;
}

export async function createWFHPeriod(data: WFHPeriodCreate): Promise<WFHPeriodResponse> {
  const response = await axios.post<WFHPeriodResponse>(`${API_BASE}/wfh-periods`, data);
  return response.data;
}

export async function deleteWFHPeriod(periodId: number): Promise<void> {
  await axios.delete(`${API_BASE}/wfh-periods/${periodId}`);
}

// Special Days Endpoints

export async function getSpecialDays(): Promise<SpecialDayResponse[]> {
  const response = await axios.get<SpecialDayResponse[]>(`${API_BASE}/special-days`);
  return response.data;
}

export async function createSpecialDay(data: SpecialDayCreate): Promise<SpecialDayResponse> {
  const response = await axios.post<SpecialDayResponse>(`${API_BASE}/special-days`, data);
  return response.data;
}

export async function deleteSpecialDay(dayId: number): Promise<void> {
  await axios.delete(`${API_BASE}/special-days/${dayId}`);
}

export async function checkSpecialDay(date: string): Promise<SpecialDayCheck> {
  const response = await axios.get<SpecialDayCheck>(`${API_BASE}/special-days/check`, {
    params: { date },
  });
  return response.data;
}
