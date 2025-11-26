/**
 * Lab Management API Client
 * Integrated College Management System APIs
 */

import { apiClient } from './client';

export interface LabStudent {
  id: number;
  email: string;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  section: string | null;
  present_year: string | null;
}

export interface FacultyLab {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  department_id: number | null;
  section_id: number | null;
  semester_id: number | null;
  year: string | null;
  is_published: boolean;
  is_active: boolean;
  created_at: string | null;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  department?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface AttendanceRecord {
  student_id: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface LabAttendanceBulkCreate {
  lab_id: number;
  date: string; // YYYY-MM-DD
  attendance_records: AttendanceRecord[];
  session_number?: number;
}

export interface LabAttendanceResponse {
  id: number;
  lab_id: number;
  faculty_id: number;
  student_id: number;
  date: string;
  status: string;
  notes: string | null;
  session_number: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface LabAttendanceSummary {
  lab_id: number;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
  date: string;
}

class LabManagementAPI {
  /**
   * Assign faculty to a lab (Admin only)
   */
  async assignFacultyToLab(labId: number, facultyId: number): Promise<{ message: string; assignment_id: number }> {
    return apiClient.request(`/lab-management/labs/${labId}/assign-faculty?faculty_id=${facultyId}`, {
      method: 'POST',
    });
  }

  /**
   * Remove faculty assignment from a lab (Admin only)
   */
  async removeFacultyFromLab(labId: number, facultyId: number): Promise<{ message: string }> {
    return apiClient.request(`/lab-management/labs/${labId}/assign-faculty/${facultyId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all labs assigned to a faculty member
   */
  async getFacultyLabs(facultyId: number): Promise<FacultyLab[]> {
    return apiClient.request(`/lab-management/faculty/${facultyId}/labs`);
  }

  /**
   * Get students for a lab (auto-filtered by lab's department/year/subject/section)
   */
  async getLabStudents(labId: number): Promise<LabStudent[]> {
    return apiClient.request(`/lab-management/labs/${labId}/students`);
  }

  /**
   * Mark attendance for a lab session (Faculty)
   */
  async markLabAttendance(labId: number, attendanceData: LabAttendanceBulkCreate): Promise<LabAttendanceResponse[]> {
    return apiClient.request(`/lab-management/labs/${labId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  /**
   * Get attendance history for a lab
   */
  async getLabAttendanceHistory(
    labId: number,
    options?: { start_date?: string; end_date?: string }
  ): Promise<LabAttendanceResponse[]> {
    const params = new URLSearchParams();
    if (options?.start_date) params.append('start_date', options.start_date);
    if (options?.end_date) params.append('end_date', options.end_date);

    return apiClient.request(`/lab-management/labs/${labId}/attendance-history?${params.toString()}`);
  }

  /**
   * Get attendance summary for a specific date
   */
  async getLabAttendanceSummary(labId: number, date: string): Promise<LabAttendanceSummary> {
    return apiClient.request(`/lab-management/labs/${labId}/attendance-summary/${date}`);
  }
}

export const labManagementAPI = new LabManagementAPI();

