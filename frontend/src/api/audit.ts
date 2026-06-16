/**
 * 审计日志 API
 */

const BASE_URL = '/api';

export interface AuditStats {
  total: number;
  by_type: Record<string, number>;
  by_thread: Record<string, number>;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  thread_id: string;
  event_type: string;
  event_data: any;
  duration_ms: number | null;
  metadata: any;
}

export interface EventType {
  type: string;
  label: string;
  icon: string;
  color: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

export const auditApi = {
  getStats: () => request<AuditStats>('/audit/stats'),

  getLogs: (params?: { thread_id?: string; event_type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.thread_id) query.set('thread_id', params.thread_id);
    if (params?.event_type) query.set('event_type', params.event_type);
    query.set('limit', String(params?.limit ?? 100));
    return request<{ count: number; logs: AuditEntry[] }>(`/audit/logs?${query}`);
  },

  getLogsByThread: (threadId: string, limit = 100) =>
    request<{ thread_id: string; count: number; logs: AuditEntry[] }>(
      `/audit/logs/${threadId}?limit=${limit}`
    ),

  getEventTypes: () => request<{ event_types: EventType[] }>('/audit/event-types'),
};
