/**
 * Intelligent Lab Module API Client
 * CodeTantra-like features for lab management
 */

import { apiClient } from './client';

export interface SessionMaterial {
  id: number;
  session_id: number;
  title: string;
  description?: string;
  material_type: 'pdf' | 'slide' | 'code_file' | 'note' | 'video_link' | 'document';
  file_path?: string;
  file_url?: string;
  file_size?: number;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface DailySession {
  id: number;
  lab_id: number;
  title: string;
  description?: string;
  instructions?: string;
  session_date: string;
  session_time?: string;
  duration_minutes?: number;
  order_index: number;
  is_active: boolean;
  is_completed: boolean;
  allow_hints: boolean;
  time_limit_minutes?: number;
  total_points: number;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  materials: SessionMaterial[];
  problem_count: number;
}

export interface LabTest {
  id: number;
  lab_id: number;
  session_id?: number;
  title: string;
  description?: string;
  test_type: 'quiz' | 'coding_test' | 'mixed';
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  auto_lock: boolean;
  allow_backtracking: boolean;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  total_points: number;
  passing_score: number;
  is_proctored: boolean;
  require_fullscreen: boolean;
  detect_tab_switch: boolean;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  question_count: number;
  attempt_count: number;
}

export interface TestQuestion {
  id: number;
  test_id: number;
  question_type: 'mcq' | 'multiple_select' | 'true_false' | 'short_answer' | 'coding';
  question_text: string;
  question_image_url?: string;
  options?: Array<{ text: string; is_correct: boolean }>;
  correct_answer?: string;
  problem_id?: number;
  points: number;
  negative_marking: number;
  order_index: number;
  created_at: string;
}

export interface TestAnswer {
  id: number;
  attempt_id: number;
  question_id: number;
  answer_text?: string;
  selected_options?: number[];
  code?: string;
  language?: string;
  is_correct?: boolean;
  points_earned: number;
  max_points?: number;
  feedback?: string;
  answered_at: string;
  graded_at?: string;
}

export interface TestAttempt {
  id: number;
  test_id: number;
  user_id: number;
  started_at: string;
  submitted_at?: string;
  auto_submitted_at?: string;
  is_submitted: boolean;
  is_auto_submitted: boolean;
  is_graded: boolean;
  total_score: number;
  max_score?: number;
  percentage: number;
  is_passed: boolean;
  tab_switches: number;
  fullscreen_exits: number;
  created_at: string;
  graded_at?: string;
  answers: TestAnswer[];
}

export interface StudentSessionProgress {
  id: number;
  session_id: number;
  user_id: number;
  materials_viewed?: number[];
  materials_completed?: number[];
  exercises_attempted: number;
  exercises_completed: number;
  exercises_passed: number;
  total_score: number;
  max_score: number;
  time_spent_minutes: number;
  first_accessed_at: string;
  last_accessed_at?: string;
  completed_at?: string;
  is_completed: boolean;
  completion_percentage: number;
}

export interface StudentLabProgress {
  id: number;
  lab_id: number;
  user_id: number;
  sessions_completed: number;
  sessions_total: number;
  completion_percentage: number;
  total_exercises: number;
  exercises_attempted: number;
  exercises_completed: number;
  exercises_passed: number;
  tests_attempted: number;
  tests_passed: number;
  average_test_score: number;
  total_score: number;
  max_score: number;
  overall_percentage: number;
  total_time_spent_minutes: number;
  is_completed: boolean;
  current_session_id?: number;
  first_accessed_at: string;
  last_accessed_at?: string;
  completed_at?: string;
}

export interface LeaderboardEntry {
  user_id: number;
  user_name?: string;
  rank: number;
  score: number;
  completion_percentage: number;
  exercises_completed: number;
  tests_passed: number;
}

export interface LabLeaderboard {
  lab_id: number;
  rankings: LeaderboardEntry[];
  total_participants: number;
  average_score: number;
  top_score: number;
  last_updated: string;
}

class IntelligentLabAPI {
  private baseURL = '/api/v1/intelligent-labs';

  // ==================== Daily Sessions ====================

  async createDailySession(labId: number, sessionData: Partial<DailySession>): Promise<DailySession> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  async listDailySessions(labId: number): Promise<DailySession[]> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/sessions`);
  }

  async getDailySession(sessionId: number): Promise<DailySession> {
    return apiClient.request(`${this.baseURL}/sessions/${sessionId}`);
  }

  async updateDailySession(sessionId: number, sessionData: Partial<DailySession>): Promise<DailySession> {
    return apiClient.request(`${this.baseURL}/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    });
  }

  async addSessionMaterial(sessionId: number, materialData: Partial<SessionMaterial>): Promise<SessionMaterial> {
    return apiClient.request(`${this.baseURL}/sessions/${sessionId}/materials`, {
      method: 'POST',
      body: JSON.stringify(materialData)
    });
  }

  // ==================== Lab Tests ====================

  async createLabTest(labId: number, testData: Partial<LabTest>): Promise<LabTest> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/tests`, {
      method: 'POST',
      body: JSON.stringify(testData)
    });
  }

  async listLabTests(labId: number): Promise<LabTest[]> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/tests`);
  }

  async getLabTest(testId: number): Promise<LabTest & { questions: TestQuestion[] }> {
    return apiClient.request(`${this.baseURL}/tests/${testId}`);
  }

  async updateLabTest(testId: number, testData: Partial<LabTest>): Promise<LabTest> {
    return apiClient.request(`${this.baseURL}/tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify(testData)
    });
  }

  // ==================== Test Attempts ====================

  async startTestAttempt(testId: number): Promise<TestAttempt> {
    return apiClient.request(`${this.baseURL}/tests/${testId}/attempt`, {
      method: 'POST'
    });
  }

  async submitAnswer(attemptId: number, answerData: Partial<TestAnswer>): Promise<TestAnswer> {
    return apiClient.request(`${this.baseURL}/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify(answerData)
    });
  }

  async submitTest(attemptId: number): Promise<TestAttempt> {
    return apiClient.request(`${this.baseURL}/attempts/${attemptId}/submit`, {
      method: 'POST'
    });
  }

  // ==================== Student Progress ====================

  async getStudentLabProgress(labId: number): Promise<StudentLabProgress> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/progress`);
  }

  async getStudentSessionProgress(sessionId: number): Promise<StudentSessionProgress> {
    return apiClient.request(`${this.baseURL}/sessions/${sessionId}/progress`);
  }

  // ==================== Leaderboard ====================

  async getLabLeaderboard(labId: number): Promise<LabLeaderboard> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/leaderboard`);
  }

  // ==================== Student Assignment ====================

  async assignStudentsToLab(labId: number, studentIds: number[]): Promise<{ message: string; student_ids: number[] }> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/assign-students`, {
      method: 'POST',
      body: JSON.stringify(studentIds),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async listLabStudents(labId: number): Promise<Array<{
    id: number;
    student_id: number;
    student_name?: string;
    student_email: string;
    assigned_at: string;
    enrollment_date?: string;
    completion_deadline?: string;
  }>> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/students`);
  }

  async removeStudentFromLab(labId: number, studentId: number): Promise<{ message: string }> {
    return apiClient.request(`${this.baseURL}/labs/${labId}/students/${studentId}`, {
      method: 'DELETE'
    });
  }
}

export const intelligentLabAPI = new IntelligentLabAPI();

