/**
 * Resume Optimization Service
 * Handles API calls to backend for resume optimization, ATS scoring, and PDF generation
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface OptimizedResumeResponse {
  optimized_resume: any;
  improvements_made: string[];
}

export interface ATSScoreResponse {
  score: number;
  breakdown: Record<string, number>;
  recommendations: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  section_feedback?: Record<string, string>;
}

export interface ResumeData {
  profile?: any;
  summary?: string;
  education?: any[];
  work_experience?: any[];
  projects?: any[];
  skills?: Record<string, string[]>;
  certifications?: any[];
  achievements?: any[];
  extracurricular?: any[];
  hobbies?: any[];
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('access_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Optimize resume using AI
 */
export async function optimizeResume(
  resumeData: ResumeData,
  targetRole?: string,
  jobDescription?: string
): Promise<OptimizedResumeResponse> {
  return apiRequest<OptimizedResumeResponse>('/resume/optimize', {
    method: 'POST',
    body: JSON.stringify({
      resume_data: resumeData,
      target_role: targetRole,
      job_description: jobDescription,
    }),
  });
}

/**
 * Calculate ATS score using AI
 */
export async function calculateATSScore(
  resumeData: ResumeData,
  jobDescription?: string
): Promise<ATSScoreResponse> {
  return apiRequest<ATSScoreResponse>('/resume/ats-score-ai', {
    method: 'POST',
    body: JSON.stringify({
      resume_data: resumeData,
      job_description: jobDescription,
    }),
  });
}

/**
 * Generate PDF from resume data
 */
export async function generateResumePDF(
  resumeData: ResumeData,
  template: string = 'fresher_classic',
  filename?: string
): Promise<Blob> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/resume/generate-pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resume_data: resumeData,
      template,
      filename,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `PDF generation failed: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string = 'resume.pdf') {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

