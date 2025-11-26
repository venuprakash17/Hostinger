/**
 * Proctoring API Client
 * Production-grade API methods for proctoring features
 */

import { apiClient } from './client';

export interface ViolationCreate {
  lab_id: number;
  violation_type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'copy_paste' | 'devtools';
  severity: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
  description?: string;
  time_spent_seconds?: number;
  problem_id?: number;
  submission_id?: number;
  timestamp?: string;
}

export interface ViolationResponse {
  id: number;
  lab_id: number;
  user_id: number;
  session_id?: number;
  violation_type: string;
  severity: string;
  timestamp: string;
  details?: Record<string, any>;
  time_spent_seconds?: number;
}

export interface SessionResponse {
  id: number;
  lab_id: number;
  user_id: number;
  started_at: string;
  total_violations: number;
  tab_switches: number;
  fullscreen_exits: number;
  is_active: boolean;
}

export interface ViolationSummary {
  total_violations: number;
  total_sessions: number;
  active_sessions: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_user: Record<number, number>;
}

class ProctoringAPI {
  /**
   * Create or update a proctoring session
   */
  async createSession(labId: number): Promise<SessionResponse> {
    return apiClient.request(`/proctoring/sessions`, {
      method: 'POST',
      body: JSON.stringify({ lab_id: labId }),
    });
  }

  /**
   * Record a proctoring violation
   */
  async recordViolation(violation: ViolationCreate): Promise<ViolationResponse> {
    return apiClient.request(`/proctoring/violations`, {
      method: 'POST',
      body: JSON.stringify(violation),
    });
  }

  /**
   * Get all sessions for a lab (Faculty/Admin only)
   */
  async getLabSessions(labId: number, activeOnly: boolean = false): Promise<SessionResponse[]> {
    return apiClient.request(`/proctoring/sessions/${labId}?active_only=${activeOnly}`);
  }

  /**
   * Get violations for a lab (Faculty/Admin only)
   */
  async getLabViolations(
    labId: number,
    options?: {
      userId?: number;
      violationType?: string;
      severity?: string;
      limit?: number;
    }
  ): Promise<ViolationResponse[]> {
    const params = new URLSearchParams();
    if (options?.userId) params.append('user_id', options.userId.toString());
    if (options?.violationType) params.append('violation_type', options.violationType);
    if (options?.severity) params.append('severity', options.severity);
    if (options?.limit) params.append('limit', options.limit.toString());

    return apiClient.request(`/proctoring/violations/${labId}?${params.toString()}`);
  }

  /**
   * Get violation summary for a lab (Faculty/Admin only)
   */
  async getViolationSummary(labId: number): Promise<ViolationSummary> {
    return apiClient.request(`/proctoring/summary/${labId}`);
  }

  /**
   * End a proctoring session
   */
  async endSession(sessionId: number): Promise<SessionResponse> {
    return apiClient.request(`/proctoring/sessions/${sessionId}/end`, {
      method: 'PUT',
    });
  }
}

export const proctoringAPI = new ProctoringAPI();

