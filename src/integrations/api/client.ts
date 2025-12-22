/**
 * API Client for REST Backend
 * Replaces Appwrite client
 */

// Force localhost in development to prevent production URL issues
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If in development and URL contains production IP, use localhost
  if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
    console.warn('[API Client] Production URL detected in dev mode, using localhost instead');
    return 'http://localhost:8000/api/v1';
  }
  return envUrl || 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Log API base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[API Client] API Base URL:', API_BASE_URL);
  console.log('[API Client] Environment variable:', import.meta.env.VITE_API_BASE_URL);
}

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// API Client class
class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('Request timeout after 30 seconds for:', url);
      controller.abort();
    }, 30000); // 30 second timeout (increased from 10s)

    try {
      console.log(`[API Client] Making ${options.method || 'GET'} request to: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include credentials for CORS
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[API Client] Response status: ${response.status} for ${url}`);
      
      // Handle network errors - response.status === 0 means no response received
      if (response.status === 0) {
        console.error('[API Client] No response received (status 0) - connection failed');
        throw new Error('Failed to connect to server. Please check your connection.');
      }

      // Handle token refresh on 401
      if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request
          const newToken = getToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            // Create new AbortController for retry
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
            try {
              const retryResponse = await fetch(url, {
                ...options,
                headers,
                credentials: 'include', // Include credentials for CORS
                signal: retryController.signal,
              });
              clearTimeout(retryTimeoutId);
              if (!retryResponse.ok) {
                throw new Error(`API error: ${retryResponse.statusText}`);
              }
              const retryText = await retryResponse.text();
              return retryText ? JSON.parse(retryText) : ({} as T);
            } catch (retryError: any) {
              clearTimeout(retryTimeoutId);
              throw retryError;
            }
          }
        }
        throw new Error('Authentication failed');
      }

      // Read response text once (can't read stream twice)
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          // Try to parse as JSON first
          if (responseText) {
            const errorData = JSON.parse(responseText);
            // FastAPI returns errors with 'detail' field
            errorMessage = errorData.detail || errorData.message || errorMessage;
          }
        } catch (parseError) {
          // If JSON parsing fails, use text as error message
          errorMessage = responseText || errorMessage;
        }
        
        console.log(`[API Client] HTTP error ${response.status} for ${url}:`, errorMessage);
        
        // Provide better error messages for common status codes
        if (response.status === 401 || response.status === 403) {
          if (errorMessage.includes('Not authenticated') || errorMessage.includes('Not authorized')) {
            errorMessage = 'Authentication required. Please log in again.';
          }
        }
        
        const error = new Error(errorMessage || `API error: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      // Parse successful response
      try {
        if (!responseText || responseText.trim() === '') {
          // If response is empty, check if we expect a list
          // Only treat as list if it's a query endpoint (has ?) or ends with the base path
          const isListEndpoint = (endpoint.includes('/quizzes?') || endpoint.includes('/coding-problems?') || endpoint.includes('/global-content?') || endpoint.includes('/company-training?')) ||
                                (endpoint === '/quizzes' || endpoint === '/coding-problems' || endpoint === '/global-content') ||
                                (endpoint.includes('/quizzes/') && !endpoint.match(/\/quizzes\/\d+$/)) ||
                                (endpoint.includes('/coding-problems/') && !endpoint.match(/\/coding-problems\/\d+$/)) ||
                                (endpoint.includes('/company-training/companies?') || endpoint.includes('/company-training/roles?') || 
                                 endpoint.includes('/company-training/practice-sections?') || endpoint.includes('/company-training/rounds?') ||
                                 endpoint.includes('/company-training/round-contents?'));
          if (isListEndpoint) {
            return [] as T;
          }
          return {} as T;
        }
        const parsed = JSON.parse(responseText);
        // Only treat as list if it's a query endpoint or base path, not a single resource
        const isListEndpoint = (endpoint.includes('/quizzes?') || endpoint.includes('/coding-problems?') || endpoint.includes('/global-content?') || endpoint.includes('/company-training?')) ||
                                (endpoint === '/quizzes' || endpoint === '/coding-problems' || endpoint === '/global-content') ||
                                (endpoint.includes('/quizzes/') && !endpoint.match(/\/quizzes\/\d+$/)) ||
                                (endpoint.includes('/coding-problems/') && !endpoint.match(/\/coding-problems\/\d+$/)) ||
                                (endpoint.includes('/company-training/companies?') || endpoint.includes('/company-training/roles?') || 
                                 endpoint.includes('/company-training/practice-sections?') || endpoint.includes('/company-training/rounds?') ||
                                 endpoint.includes('/company-training/round-contents?'));
        if (isListEndpoint) {
          return (Array.isArray(parsed) ? parsed : []) as unknown as T;
        }
        return parsed;
      } catch (parseError) {
        // If response is empty or not JSON, check if we expect a list
        const isListEndpoint = (endpoint.includes('/quizzes?') || endpoint.includes('/coding-problems?') || endpoint.includes('/global-content?') || endpoint.includes('/company-training?')) ||
                                (endpoint === '/quizzes' || endpoint === '/coding-problems' || endpoint === '/global-content') ||
                                (endpoint.includes('/quizzes/') && !endpoint.match(/\/quizzes\/\d+$/)) ||
                                (endpoint.includes('/coding-problems/') && !endpoint.match(/\/coding-problems\/\d+$/)) ||
                                (endpoint.includes('/company-training/companies?') || endpoint.includes('/company-training/roles?') || 
                                 endpoint.includes('/company-training/practice-sections?') || endpoint.includes('/company-training/rounds?') ||
                                 endpoint.includes('/company-training/round-contents?'));
        if (isListEndpoint) {
          return [] as T;
        }
        return {} as T;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        console.error('Request timeout - backend may not be responding');
        throw new Error('Request timeout - please check your connection.');
      }
      
      // Handle network errors - only catch actual fetch/network failures, not HTTP errors
      // Check if it's a real network error (fetch failed completely) vs HTTP error (got response)
      const isConnectionError = (
        // TypeError with "Failed to fetch" means fetch() itself failed (network issue)
        (error.name === 'TypeError' && error.message.includes('Failed to fetch')) ||
        // Explicit connection errors
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('ERR_NETWORK_CHANGED') ||
        // NetworkError means the request couldn't be made
        error.name === 'NetworkError' ||
        // Network request failed means no response received
        (error.message?.includes('network') && error.message?.includes('request failed'))
      );
      
      if (isConnectionError) {
        // Only throw connection error for actual network failures
        console.error('[API Client] Network connection error:', {
          endpoint,
          errorName: error.name,
          errorMessage: error.message,
          url
        });
        throw new Error('Failed to connect to server. Please check your connection.');
      }
      
      // Handle CORS errors specifically
      if (error.message && error.message.includes('CORS')) {
        console.error('[API Client] CORS error detected:', error.message);
        throw new Error('CORS error: Backend may not be allowing requests from this origin. Please refresh the page and try again. If the issue persists, check backend CORS settings.');
      }
      
      // Log other errors with full details
      console.error('[API Client] Request error:', {
        endpoint,
        url,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    const url = `${this.baseURL}/auth/login`;
    console.log('[API Client] Starting login request to:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[API Client] Login timeout - aborting request');
      controller.abort();
    }, 10000); // 10 second timeout for login
    
    try {
      console.log('[API Client] Making fetch request...');
      const fetchStartTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
        credentials: 'include',
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`[API Client] Fetch completed in ${fetchDuration}ms, status: ${response.status}`);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('[API Client] Response not OK:', response.status);
        const errorText = await response.text();
        let errorMessage = 'Invalid email or password';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('[API Client] Error message:', errorMessage);
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }
      
      console.log('[API Client] Parsing response JSON...');
      const data = await response.json();
      console.log('[API Client] Response parsed, checking tokens...');
      
      // Validate response has tokens
      if (!data.access_token || !data.refresh_token) {
        console.error('[API Client] Missing tokens in response:', data);
        throw new Error('Invalid response from server: missing tokens');
      }
      
      console.log('[API Client] Setting tokens...');
      setTokens(data.access_token, data.refresh_token);
      console.log('[API Client] Login successful, tokens set');
      
      // Return minimal data - don't fetch user here
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer'
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      console.error('[API Client] Login error:', error.name, error.message);
      
      // Check for connection errors first (these happen immediately)
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('ERR_CONNECTION_REFUSED') ||
          error.message?.includes('ERR_NETWORK_CHANGED') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('load failed') ||
          error.cause?.code === 'ECONNREFUSED') {
        console.error('[API Client] Network error detected - backend may not be running');
        throw new Error('Backend server is not running. Please start the backend server on port 8000.');
      }
      
      // Check for timeout/abort errors
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.error('[API Client] Request was aborted (timeout)');
        throw new Error('Login request timed out. The backend server may be slow or not responding. Please check if the server is running on port 8000.');
      }
      
      throw error;
    }
  }

  async signup(email: string, password: string, fullName?: string) {
    return this.request<{
      id: number;
      email: string;
      is_active: boolean;
      is_verified: boolean;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async logout() {
    clearTokens();
  }

  async getCurrentUser() {
    try {
      // Use direct fetch with timeout to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const accessToken = getToken();
        if (!accessToken) {
          clearTimeout(timeoutId);
          return null;
        }

        const response = await fetch(`${this.baseURL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            // Unauthorized - clear tokens
            clearTokens();
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          // Timeout - return null gracefully
          return null;
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Silently handle connection errors for /auth/me
      // This endpoint is called on page load and should fail gracefully
      if (error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to connect to server') ||
        error.message.includes('Request timeout') ||
        error.message.includes('AbortError')
      )) {
        // Backend not running or timeout - return null (no user)
        return null;
      }
      throw error; // Re-throw other errors (like 401 Unauthorized)
    }
  }

  async getCurrentUserProfile() {
    return this.request<{
      id: number;
      email: string;
      full_name: string | null;
      department: string | null;
      section: string | null;
      roll_number: string | null;
      college_id: number | null;
      roles: Array<{
        role: string;
        college_id: number | null;
      }>;
    }>('/users/me/profile');
  }

  async getCurrentUserRoles() {
    try {
      // Use direct fetch with timeout to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      try {
        const accessToken = getToken();
        if (!accessToken) {
          clearTimeout(timeoutId);
          return [];
        }

        const response = await fetch(`${this.baseURL}/users/me/roles`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            clearTokens();
            return [];
          }
          return [];
        }

        return await response.json();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          // Timeout - return empty array
          return [];
        }
        // Any other error - return empty array
        return [];
      }
    } catch (error: any) {
      // Always return empty array on error - don't block login
      console.warn('getCurrentUserRoles error:', error.message);
      return [];
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });
  }

  async updateCurrentUserProfile(data: { full_name?: string }) {
    return this.request<{
      id: number;
      email: string;
      full_name: string | null;
      department: string | null;
      section: string | null;
      roll_number: string | null;
      college_id: number | null;
      roles: Array<{ role: string; college_id: number | null }>;
    }>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Jobs
  async listJobs(filters?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
    job_type?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.job_type) params.append('job_type', filters.job_type);
    if (filters?.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    return this.request(`/jobs${queryString ? `?${queryString}` : ''}`);
  }

  async getJob(jobId: number) {
    return this.request(`/jobs/${jobId}`);
  }

  async applyForJob(jobId: number) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST'
    });
  }

  async getMyApplications() {
    return this.request('/jobs/applications/my');
  }

  async createJob(data: {
    title: string;
    company: string;
    role: string;
    description?: string;
    location?: string;
    ctc?: string;
    eligibility_type?: "all_students" | "branch" | "specific_students";
    eligible_branches?: string[];
    eligible_user_ids?: number[];
    job_type?: "On-Campus" | "Off-Campus" | "Internship";
    requirements?: string[];
    rounds?: string[];
    deadline?: string;
    is_active?: boolean;
    college_id: number;
  }) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateJob(jobId: number, data: {
    title?: string;
    company?: string;
    role?: string;
    description?: string;
    location?: string;
    ctc?: string;
    eligibility_type?: "all_students" | "branch" | "specific_students";
    eligible_branches?: string[];
    eligible_user_ids?: number[];
    job_type?: "On-Campus" | "Off-Campus" | "Internship";
    requirements?: string[];
    rounds?: string[];
    deadline?: string;
    is_active?: boolean;
    college_id?: number;
  }) {
    return this.request(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteJob(jobId: number) {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE'
    });
  }

  async bulkDeleteJobs(jobIds: number[]) {
    return this.request('/jobs/bulk-delete', {
      method: 'POST',
      body: JSON.stringify(jobIds)
    });
  }

  async bulkUpdateJobStatus(jobIds: number[], isActive: boolean) {
    return this.request('/jobs/bulk-update-status', {
      method: 'POST',
      body: JSON.stringify({ job_ids: jobIds, is_active: isActive })
    });
  }

  async listColleges() {
    return this.request('/colleges');
  }

  // Institution methods
  async listInstitutions() {
    return this.request('/institutions');
  }

  async getInstitution(institutionId: number) {
    return this.request(`/institutions/${institutionId}`);
  }

  async createInstitution(data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) {
    return this.request('/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInstitution(institutionId: number, data: {
    name?: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    is_active?: string;
  }) {
    return this.request(`/institutions/${institutionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInstitution(institutionId: number) {
    return this.request(`/institutions/${institutionId}`, {
      method: 'DELETE',
    });
  }

  async getInstitutionStats(institutionId: number) {
    return this.request(`/institutions/${institutionId}/stats`);
  }

  async bulkUploadJobs(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/jobs/bulk-upload', {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header, browser will set multipart/form-data with boundary
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
  }

  async downloadJobTemplate() {
    const token = getToken();
    const url = `${this.baseURL}/jobs/template`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    // Get the blob from response
    const blob = await response.blob();
    
    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'job_upload_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true };
  }

  // Resume - ATS Score & Cover Letter
  async calculateATSScore(data: {
    resume_data: {
      personal_info?: any;
      education?: any[];
      experience?: any[];
      projects?: any[];
      skills?: string[];
      certifications?: any[];
      achievements?: any[];
    };
    job_description?: string;
    target_role?: string;
  }) {
    return this.request('/resume/ats-score', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateCoverLetter(data: {
    resume_data: {
      personal_info?: any;
      education?: any[];
      experience?: any[];
      projects?: any[];
      skills?: string[];
      certifications?: any[];
      achievements?: any[];
    };
    job_description: string;
    company_name?: string;
    role?: string;
  }) {
    return this.request('/resume/cover-letter', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Job Aggregation
  async syncJobsFromSources(data: {
    sources: string[];
    keywords?: string[];
    location?: string;
    max_results?: number;
    college_id?: number;
  }) {
    return this.request('/job-aggregation/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAggregatedJobs(filters?: {
    source?: string;
    is_imported?: boolean;
    college_id?: number;
    skip?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.source) params.append('source', filters.source);
    if (filters?.is_imported !== undefined) params.append('is_imported', filters.is_imported.toString());
    if (filters?.college_id) params.append('college_id', filters.college_id.toString());
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return this.request(`/job-aggregation${queryString ? `?${queryString}` : ''}`);
  }

  async importAggregatedJob(aggregationId: number) {
    return this.request(`/job-aggregation/${aggregationId}/import`, {
      method: 'POST'
    });
  }

  // Mock Interviews
  async createMockInterview(data: {
    title: string;
    interview_type?: 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral';
    description?: string;
    student_id: number;
    interviewer_id?: number;
    interviewer_name?: string;
    scheduled_at: string;
    duration_minutes?: number;
    meeting_link?: string;
    venue?: string;
  }) {
    return this.request('/mock-interviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMyInterviews(filters?: {
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status_filter', filters.status);
    const queryString = params.toString();
    return this.request(`/mock-interviews/my${queryString ? `?${queryString}` : ''}`);
  }

  async getScheduledInterviews(filters?: {
    student_id?: number;
    interviewer_id?: number;
    date_from?: string;
    date_to?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.student_id) params.append('student_id', filters.student_id.toString());
    if (filters?.interviewer_id) params.append('interviewer_id', filters.interviewer_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const queryString = params.toString();
    return this.request(`/mock-interviews/scheduled${queryString ? `?${queryString}` : ''}`);
  }

  async getInterview(interviewId: number) {
    return this.request(`/mock-interviews/${interviewId}`);
  }

  async updateInterview(interviewId: number, data: {
    title?: string;
    interview_type?: 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral';
    description?: string;
    scheduled_at?: string;
    duration_minutes?: number;
    meeting_link?: string;
    venue?: string;
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  }) {
    return this.request(`/mock-interviews/${interviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async addInterviewFeedback(interviewId: number, data: {
    feedback?: string;
    rating?: number;
    strengths?: string[];
    areas_for_improvement?: string[];
    technical_score?: number;
    communication_score?: number;
    problem_solving_score?: number;
    notes?: string;
    recording_url?: string;
  }) {
    return this.request(`/mock-interviews/${interviewId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async startInterview(interviewId: number) {
    return this.request(`/mock-interviews/${interviewId}/start`, {
      method: 'PUT'
    });
  }

  async cancelInterview(interviewId: number) {
    return this.request(`/mock-interviews/${interviewId}/cancel`, {
      method: 'PUT'
    });
  }

  async deleteInterview(interviewId: number) {
    return this.request(`/mock-interviews/${interviewId}`, {
      method: 'DELETE'
    });
  }

  // Year Promotion
  async requestPromotion(data: {
    from_year: '1st' | '2nd' | '3rd' | '4th';
    to_year: '2nd' | '3rd' | '4th' | '5th';
    fee_amount?: number;
    payment_reference?: string;
    notes?: string;
  }) {
    return this.request('/promotion/request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMyPromotionRequests() {
    return this.request('/promotion/requests/my');
  }

  async getPendingPromotionRequests(college_id?: number) {
    const params = new URLSearchParams();
    if (college_id) params.append('college_id', college_id.toString());
    const queryString = params.toString();
    return this.request(`/promotion/requests/pending${queryString ? `?${queryString}` : ''}`);
  }

  async approvePromotion(promotionId: number, data: {
    status: 'approved' | 'rejected';
    notes?: string;
  }) {
    return this.request(`/promotion/requests/${promotionId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async bulkPromoteStudents(data: {
    user_ids: number[];
    from_year: '1st' | '2nd' | '3rd' | '4th';
    to_year: '2nd' | '3rd' | '4th' | '5th';
    fee_amount?: number;
    auto_approve?: boolean;
  }) {
    return this.request('/promotion/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Hall Tickets
  async generateHallTicket(data: {
    exam_id: number;
    exam_type: 'quiz' | 'coding' | 'mock_test' | 'placement';
    exam_title: string;
    user_id: number;
    exam_date: string;
    exam_time?: string;
    duration_minutes?: number;
    venue?: string;
    room_number?: string;
    seat_number?: string;
    address?: string;
    instructions?: string[];
  }) {
    return this.request('/hall-tickets/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateBulkHallTickets(data: {
    exam_id: number;
    exam_type: 'quiz' | 'coding' | 'mock_test' | 'placement';
    exam_title: string;
    exam_date: string;
    exam_time?: string;
    duration_minutes?: number;
    venue?: string;
    user_ids: number[];
    instructions?: string[];
  }) {
    return this.request('/hall-tickets/generate/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMyHallTickets(filters?: {
    exam_type?: 'quiz' | 'coding' | 'mock_test' | 'placement';
  }) {
    const params = new URLSearchParams();
    if (filters?.exam_type) params.append('exam_type', filters.exam_type);
    const queryString = params.toString();
    return this.request(`/hall-tickets/my${queryString ? `?${queryString}` : ''}`);
  }

  async getHallTicket(ticketId: number) {
    return this.request(`/hall-tickets/${ticketId}`);
  }

  async downloadHallTicket(ticketId: number) {
    const url = `${this.baseURL}/hall-tickets/${ticketId}/download`;
    const token = getToken();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `hall_ticket_${ticketId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Training Sessions
  async getTrainingSessions(filters?: {
    college_id?: number;
    session_type?: string;
    is_active?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.college_id) params.append('college_id', filters.college_id.toString());
    if (filters?.session_type) params.append('session_type', filters.session_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const queryString = params.toString();
    return this.request(`/training-sessions${queryString ? `?${queryString}` : ''}`);
  }

  async createTrainingSession(data: {
    title: string;
    description?: string;
    session_type: string;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
    target_type: string;
    target_departments?: string[];
    target_years?: string[];
    target_sections?: string[];
    college_id?: number;
  }) {
    return this.request('/training-sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTrainingSession(sessionId: number, data: {
    title?: string;
    description?: string;
    session_type?: string;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
    target_type?: string;
    target_departments?: string[];
    target_years?: string[];
    target_sections?: string[];
  }) {
    return this.request(`/training-sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTrainingSession(sessionId: number) {
    return this.request(`/training-sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  // Attendance
  async markAttendance(records: Array<{
    student_id: number;
    subject_id?: number;
    subject: string;
    date: string;
    status: string;
    semester_id?: number;
    period_number?: number;
    section?: string;
    section_id?: number;
    notes?: string;
  }>) {
    return this.request('/attendance/', {
      method: 'POST',
      body: JSON.stringify({ records })
    });
  }

  async getAttendance(filters?: {
    student_id?: number;
    subject?: string;
    subject_id?: number;
    date_from?: string;
    date_to?: string;
    section?: string;
    section_id?: number;
    period_number?: number;
    department?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.student_id) params.append('student_id', filters.student_id.toString());
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.section) params.append('section', filters.section);
    if (filters?.section_id) params.append('section_id', filters.section_id.toString());
    if (filters?.period_number !== undefined) params.append('period_number', filters.period_number.toString());
    if (filters?.department) params.append('department', filters.department);
    
    const queryString = params.toString();
    return this.request(`/attendance${queryString ? `?${queryString}` : ''}`);
  }

  async getStudentsForAttendance(filters?: {
    department?: string;
    section?: string;
    section_id?: number;
    subject_id?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.section) params.append('section', filters.section);
    if (filters?.section_id) params.append('section_id', filters.section_id.toString());
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    
    const queryString = params.toString();
    return this.request(`/attendance/students${queryString ? `?${queryString}` : ''}`);
  }

  async updateAttendance(attendanceId: number, status: string, notes?: string) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }

  async approveAttendance(attendanceId: number, approvalStatus: string, approvalNotes?: string) {
    return this.request(`/attendance/${attendanceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ 
        approval_status: approvalStatus,
        approval_notes: approvalNotes 
      })
    });
  }

  async deleteAttendance(attendanceId: number) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'DELETE'
    });
  }

  async getAttendanceAnalytics(filters?: {
    student_id?: number;
    subject_id?: number;
    section_id?: number;
    department?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.student_id) params.append('student_id', filters.student_id.toString());
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    if (filters?.section_id) params.append('section_id', filters.section_id.toString());
    if (filters?.department) params.append('department', filters.department);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    
    const queryString = params.toString();
    return this.request(`/attendance/analytics${queryString ? `?${queryString}` : ''}`);
  }

  // Academic Management
  async getAcademicYears() {
    return this.request('/academic/academic-years');
  }

  async createAcademicYear(data: {
    name: string;
    start_date: string;
    end_date: string;
    is_current?: boolean;
  }) {
    return this.request('/academic/academic-years', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getDepartments(collegeId?: number) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    const queryString = params.toString();
    return this.request(`/academic/departments${queryString ? `?${queryString}` : ''}`);
  }

  async createDepartment(data: {
    name: string;
    code?: string;
    branch_id?: string;
    hod_id?: number;
    college_id?: number;
    number_of_years?: number;
    vertical?: string;
  }) {
    return this.request('/academic/departments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSemesters(collegeId?: number) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    const queryString = params.toString();
    return this.request(`/academic/semesters${queryString ? `?${queryString}` : ''}`);
  }

  async createSemester(data: {
    name: string;
    number: number;
    academic_year_id?: number;
    start_date?: string;
    end_date?: string;
    college_id?: number;
  }) {
    return this.request('/academic/semesters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSubjects(collegeId?: number, departmentId?: number, semesterId?: number) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    if (departmentId) params.append('department_id', departmentId.toString());
    if (semesterId) params.append('semester_id', semesterId.toString());
    const queryString = params.toString();
    return this.request(`/academic/subjects${queryString ? `?${queryString}` : ''}`);
  }

  async createSubject(data: {
    name: string;
    code?: string;
    department_id?: number;
    semester_id?: number;
    year?: string;
    credits?: number;
    college_id?: number;
  }) {
    return this.request('/academic/subjects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSections(collegeId?: number, departmentId?: number, semesterId?: number, includeInactive?: boolean) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    if (departmentId) params.append('department_id', departmentId.toString());
    if (semesterId) params.append('semester_id', semesterId.toString());
    if (includeInactive) params.append('include_inactive', 'true');
    const queryString = params.toString();
    return this.request(`/academic/sections${queryString ? `?${queryString}` : ''}`);
  }

  async createSection(data: {
    name: string;
    department_id: number;
    semester_id?: number;
    year?: number;
    college_id?: number;
  }) {
    return this.request('/academic/sections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSection(sectionId: number, data: {
    name?: string;
    department_id?: number;
    semester_id?: number;
    year?: number;
    is_active?: boolean;
  }) {
    return this.request(`/academic/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getSubjectAssignments(facultyId?: number, subjectId?: number, sectionId?: number) {
    const params = new URLSearchParams();
    if (facultyId) params.append('faculty_id', facultyId.toString());
    if (subjectId) params.append('subject_id', subjectId.toString());
    if (sectionId) params.append('section_id', sectionId.toString());
    const queryString = params.toString();
    return this.request(`/academic/subject-assignments${queryString ? `?${queryString}` : ''}`);
  }

  // Auto-populate sections from student data
  async autoPopulateSections(collegeId?: number) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    const queryString = params.toString();
    return this.request(`/academic/sections/auto-populate${queryString ? `?${queryString}` : ''}`, {
      method: 'POST'
    });
  }

  // Assign sections to faculty
  async assignSectionsToFaculty(facultyId: number, sectionIds: number[]) {
    return this.request('/academic/faculty-sections/assign', {
      method: 'POST',
      body: JSON.stringify({ faculty_id: facultyId, section_ids: sectionIds })
    });
  }

  // Get faculty assigned students
  async getFacultyAssignedStudents(facultyId: number) {
    return this.request(`/academic/faculty-sections/${facultyId}/students`);
  }

  // Get student progress
  async getStudentProgress(facultyId: number, studentId: number) {
    return this.request(`/academic/faculty-sections/${facultyId}/students/${studentId}/progress`);
  }

  // Academic Year Migration
  async previewMigration(fromAcademicYearId: number, toAcademicYearId: number, collegeId: number) {
    return this.request(`/academic/migrations/preview?from_academic_year_id=${fromAcademicYearId}&to_academic_year_id=${toAcademicYearId}&college_id=${collegeId}`);
  }

  async promoteStudents(data: {
    academic_year_id: number;
    college_id?: number;
    promotion_rules: Array<{ from_year: string; to_year: string }>;
    auto_approve?: boolean;
  }) {
    return this.request('/academic/migrations/promote-students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async archiveOldAcademicYear(data: {
    from_academic_year_id: number;
    to_academic_year_id: number;
    college_id: number;
    archive_sections?: boolean;
    archive_subjects?: boolean;
    archive_assignments?: boolean;
  }) {
    return this.request('/academic/migrations/archive-old-year', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMigrations(collegeId?: number, status?: string) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    if (status) params.append('status_filter', status);
    return this.request(`/academic/migrations${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getMigration(migrationId: number) {
    return this.request(`/academic/migrations/${migrationId}`);
  }

  async bulkUploadAcademicStructure(
    file: File,
    academicYearId?: number,
    collegeId?: number,
    createSubjectsIfMissing?: boolean,
    createSectionsIfMissing?: boolean
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYearId) formData.append('academic_year_id', academicYearId.toString());
    if (collegeId) formData.append('college_id', collegeId.toString());
    if (createSubjectsIfMissing !== undefined) formData.append('create_subjects_if_missing', createSubjectsIfMissing.toString());
    if (createSectionsIfMissing !== undefined) formData.append('create_sections_if_missing', createSectionsIfMissing.toString());

    return this.request('/bulk-upload/academic-structure', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type with boundary for FormData
      body: formData,
    });
  }

  async autoDistributeStudents(data: {
    college_id?: number;
    department_id?: number;
    year?: string;
    max_students_per_section?: number;
  }) {
    return this.request('/academic/sections/auto-distribute-students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reassign faculty data to another faculty
  async reassignFacultyData(data: {
    from_faculty_id: number;
    to_faculty_id: number;
    reassign_coding_problems?: boolean;
    reassign_quizzes?: boolean;
    reassign_labs?: boolean;
    reassign_lab_problems?: boolean;
    reassign_lab_assignments?: boolean;
  }) {
    return this.request('/users/reassign-faculty-data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Bulk upload subjects
  async bulkUploadSubjects(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/bulk-upload/subjects', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
  }

  async createSubjectAssignment(data: {
    faculty_id: number;
    subject_id: number;
    semester_id?: number;
    section?: string;
    section_id?: number;
  }) {
    return this.request('/academic/subject-assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getPeriods(collegeId?: number) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    const queryString = params.toString();
    return this.request(`/academic/periods${queryString ? `?${queryString}` : ''}`);
  }

  async createPeriod(data: {
    number: number;
    name?: string;
    start_time?: string;
    end_time?: string;
    college_id?: number;
  }) {
    return this.request('/academic/periods', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Global Content - Quizzes
  async listQuizzes(filters?: {
    is_active?: boolean;
    scope_type?: 'svnapro' | 'college';
  }) {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.scope_type) params.append('scope_type', filters.scope_type);
    const queryString = params.toString();
    return this.request(`/global-content/quizzes${queryString ? `?${queryString}` : ''}`);
  }

  async getQuiz(quizId: number) {
    return this.request(`/global-content/quizzes/${quizId}`);
  }

  // Quiz Attempts
  async startQuizAttempt(quizId: number) {
    return this.request(`/global-content/quizzes/${quizId}/attempt`, {
      method: 'POST'
    });
  }

  async updateQuizAttempt(attemptId: number, data: { answers?: any[] }) {
    return this.request(`/global-content/quiz-attempts/${attemptId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async submitQuiz(attemptId: number) {
    return this.request(`/global-content/quiz-attempts/${attemptId}/submit`, {
      method: 'POST'
    });
  }

  async getQuizAttempt(attemptId: number) {
    return this.request(`/global-content/quiz-attempts/${attemptId}`);
  }

  async createQuiz(data: {
    title: string;
    description?: string;
    subject?: string;
    duration_minutes?: number;
    total_marks?: number;
    questions?: Array<any>;
    is_active?: boolean;
    start_time?: string;
    end_time?: string;
    expiry_date?: string;
    scope_type?: 'svnapro' | 'college' | 'department' | 'section';
    college_id?: number;
    department?: string;
    section_id?: number;
    year?: string;
  }) {
    return this.request('/global-content/quizzes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateQuiz(quizId: number, data: {
    title?: string;
    description?: string;
    subject?: string;
    duration_minutes?: number;
    total_marks?: number;
    questions?: Array<any>;
    is_active?: boolean;
    start_time?: string;
    end_time?: string;
    expiry_date?: string;
    scope_type?: 'svnapro' | 'college' | 'department' | 'section';
    college_id?: number;
    department?: string;
    section_id?: number;
    year?: string;
  }) {
    return this.request(`/global-content/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteQuiz(quizId: number) {
    return this.request(`/global-content/quizzes/${quizId}`, {
      method: 'DELETE'
    });
  }

  async bulkUploadQuestions(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/bulk-upload/questions', {
      method: 'POST',
      body: formData
    });
  }

  // Global Content - Coding Problems (for super admin global content management)
  async listGlobalCodingProblems(filters?: {
    difficulty?: string;
    is_active?: boolean;
    scope_type?: 'svnapro' | 'college';
  }) {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.scope_type) params.append('scope_type', filters.scope_type);
    const queryString = params.toString();
    return this.request(`/global-content/coding-problems${queryString ? `?${queryString}` : ''}`);
  }

  async downloadQuestionTemplate(format: 'xlsx' | 'csv' | 'json' = 'xlsx') {
    const token = getToken();
    const url = `${this.baseURL}/bulk-upload/templates/questions?format=${format}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    // Get the blob from response
    const blob = await response.blob();
    
    // Determine file extension
    const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'xlsx';
    const filename = `question_upload_template.${extension}`;
    
    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true };
  }

  // Coding Problems - Super Admin only, year-based visibility
  async listCodingProblems(filters?: {
    difficulty?: string;
    is_active?: boolean;
    year?: number;
    language?: string;
    tags?: string;
    complexity?: string;
    scope_type?: string;
    solved?: boolean;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.language) params.append('language', filters.language);
    if (filters?.tags) params.append('tags', filters.tags);
    if (filters?.complexity) params.append('complexity', filters.complexity);
    if (filters?.scope_type) params.append('scope_type', filters.scope_type);
    if (filters?.solved !== undefined) params.append('solved', filters.solved.toString());
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return this.request(`/coding-problems${queryString ? `?${queryString}` : ''}`);
  }

  async getCodingProblem(problemId: number) {
    return this.request(`/coding-problems/${problemId}`);
  }

  // User Saved Code (per-language code storage)
  async getSavedCode(problemId: number, language: string) {
    return this.request(`/coding-problems/${problemId}/saved-code/${language}`);
  }

  async saveCode(problemId: number, language: string, code: string) {
    return this.request(`/coding-problems/${problemId}/save-code`, {
      method: 'POST',
      body: JSON.stringify({ language, code })
    });
  }

  // Code Execution
  async executeCode(problemId: number, language: string, code: string, stdin?: string) {
    return this.request(`/coding-problems/${problemId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ language, code, stdin })
    });
  }

  async runTestCase(problemId: number, language: string, code: string, testCaseIndex: number) {
    return this.request(`/coding-problems/${problemId}/run-test-case`, {
      method: 'POST',
      body: JSON.stringify({ language, code, test_case_index: testCaseIndex })
    });
  }

  // Submit Solution
  async submitSolution(problemId: number, language: string, code: string) {
    return this.request(`/coding-problems/${problemId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language, code })
    });
  }

  // Get Submissions
  async getProblemSubmissions(problemId: number) {
    return this.request(`/coding-problems/${problemId}/submissions`);
  }

  async trackCodingActivity(data: {
    problem_id: number;
    problem_code?: string;
    time_spent_seconds: number;
    session_time_seconds: number;
    is_final?: boolean;
    action?: string;
  }) {
    return this.request('/analytics/coding-activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Comprehensive Analytics API Methods
  async trackActivity(data: {
    activity_type: string;
    activity_category?: string;
    entity_type?: string;
    entity_id?: number;
    entity_name?: string;
    metadata?: any;
    duration_seconds?: number;
    active_time_seconds?: number;
    status?: string;
    result?: any;
    session_id?: string;
    page_url?: string;
  }) {
    return this.request('/analytics/track/activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startSession(data: {
    session_id: string;
    user_agent?: string;
    ip_address?: string;
  }) {
    return this.request('/analytics/track/session/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(data: {
    session_id: string;
    active_time_seconds: number;
    idle_time_seconds: number;
    page_url?: string;
    action_count?: number;
  }) {
    return this.request('/analytics/track/session/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endSession(sessionId: string) {
    return this.request(`/analytics/track/session/end?session_id=${sessionId}`, {
      method: 'POST',
    });
  }

  async getMyProgress() {
    return this.request('/analytics/student/my-progress');
  }

  async getStudentDetailedAnalytics(studentId: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/student/${studentId}/detailed${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getFeatureAnalytics(featureName: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/feature/${featureName}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getComprehensiveDashboard(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/dashboard/comprehensive${params.toString() ? `?${params.toString()}` : ''}`);
  }

  // Drill-Down Analytics API Methods
  async getAdminOverview(collegeId?: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/drilldown/admin/overview${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getDepartmentDrilldown(department: string, collegeId?: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (collegeId) params.append('college_id', collegeId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/drilldown/admin/department/${encodeURIComponent(department)}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getYearDrilldown(year: string, department?: string, collegeId?: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (collegeId) params.append('college_id', collegeId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/drilldown/admin/year/${encodeURIComponent(year)}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getSectionDrilldown(sectionId: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/drilldown/admin/section/${sectionId}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getStudentDrilldown(studentId: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/drilldown/admin/student/${studentId}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getSubmissionDetails(problemId: number, submissionId: number) {
    return this.request(`/coding-problems/${problemId}/submissions/${submissionId}`);
  }

  async createCodingProblem(data: {
    title: string;
    description: string;
    input_format?: string;
    output_format?: string;
    difficulty?: string;
    tags?: string[];
    constraints?: string;
    sample_input?: string;
    sample_output?: string;
    year: number;
    allowed_languages?: string[];
    restricted_languages?: string[];
    recommended_languages?: string[];
    starter_code_python?: string;
    starter_code_c?: string;
    starter_code_cpp?: string;
    starter_code_java?: string;
    starter_code_javascript?: string;
    time_limit?: number;
    memory_limit?: number;
    test_cases?: Array<{stdin: string; expected_output: string; is_public: boolean}>;
    is_active?: boolean;
    expiry_date?: string;
  }) {
    return this.request('/coding-problems', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCodingProblem(problemId: number, data: {
    title?: string;
    description?: string;
    input_format?: string;
    output_format?: string;
    difficulty?: string;
    tags?: string[];
    constraints?: string;
    sample_input?: string;
    sample_output?: string;
    year?: number;
    allowed_languages?: string[];
    restricted_languages?: string[];
    recommended_languages?: string[];
    starter_code_python?: string;
    starter_code_c?: string;
    starter_code_cpp?: string;
    starter_code_java?: string;
    starter_code_javascript?: string;
    time_limit?: number;
    memory_limit?: number;
    test_cases?: Array<{stdin: string; expected_output: string; is_public: boolean}>;
    is_active?: boolean;
    expiry_date?: string;
  }) {
    return this.request(`/coding-problems/${problemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCodingProblem(problemId: number) {
    return this.request(`/coding-problems/${problemId}`, {
      method: 'DELETE'
    });
  }

  // Duplicate Management
  async findDuplicateProblems() {
    return this.request('/coding-problems/duplicates/find');
  }

  async clearDuplicateProblems(keepLatest: boolean = true) {
    return this.request(`/coding-problems/duplicates/clear?keep_latest=${keepLatest}`, {
      method: 'POST'
    });
  }

  // Generic CRUD methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Notifications
  async createNotification(data: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    college_id?: number;
    department?: string;
    section?: string;
    present_year?: string;
    user_ids?: number[];
  }) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listNotifications(filters?: {
    skip?: number;
    limit?: number;
    college_id?: number;
    is_active?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.college_id !== undefined) params.append('college_id', filters.college_id.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    const queryString = params.toString();
    return this.request(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async getMyNotifications(filters?: {
    is_read?: boolean;
    skip?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return this.request(`/notifications/my${queryString ? `?${queryString}` : ''}`);
  }

  async markNotificationRead(notificationId: number) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  async toggleNotificationActive(notificationId: number) {
    return this.request(`/notifications/${notificationId}/toggle-active`, {
      method: 'PUT'
    });
  }

  async getNotificationRecipients(notificationId: number) {
    return this.request(`/notifications/${notificationId}/recipients`);
  }

  // Announcements/Popups
  async getMyAnnouncements() {
    // Announcements are non-critical, so we'll let the regular timeout handle it
    // and catch errors gracefully in the component
    return this.request('/announcements/my');
  }

  async markAnnouncementSeen(announcementId: number) {
    return this.request(`/announcements/${announcementId}/mark-seen`, {
      method: 'POST'
    });
  }

  async createAnnouncement(data: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    college_id?: number;
    department?: string;
    section?: string;
    present_year?: string;
    role?: 'student' | 'faculty' | 'admin' | 'hod' | 'super_admin';
  }) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listAnnouncements(filters?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    const queryString = params.toString();
    return this.request(`/announcements${queryString ? `?${queryString}` : ''}`);
  }

  async getAnnouncement(announcementId: number) {
    return this.request(`/announcements/${announcementId}`);
  }

  async updateAnnouncement(announcementId: number, data: {
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    is_active?: boolean;
  }) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAnnouncement(announcementId: number) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'DELETE'
    });
  }

  // ==================== Coding Labs API ====================

  async createLab(data: any) {
    return this.request('/coding-labs/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listLabs(params?: { mode?: string; difficulty?: string; topic?: string; is_published?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.mode) queryParams.append('mode', params.mode);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.topic) queryParams.append('topic', params.topic);
    if (params?.is_published !== undefined) queryParams.append('is_published', String(params.is_published));
    
    return this.request(`/coding-labs/?${queryParams.toString()}`);
  }

  async getLab(labId: number) {
    return this.request(`/coding-labs/${labId}`);
  }

  async updateLab(labId: number, data: any) {
    return this.request(`/coding-labs/${labId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteLab(labId: number) {
    return this.request(`/coding-labs/${labId}`, {
      method: 'DELETE'
    });
  }

  async createProblem(labId: number, data: any) {
    return this.request(`/coding-labs/${labId}/problems`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listProblems(labId: number) {
    return this.request(`/coding-labs/${labId}/problems`);
  }

  async getProblem(problemId: number) {
    return this.request(`/coding-labs/problems/${problemId}`);
  }

  async updateProblem(problemId: number, data: any) {
    return this.request(`/coding-labs/problems/${problemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProblem(problemId: number) {
    return this.request(`/coding-labs/problems/${problemId}`, {
      method: 'DELETE'
    });
  }

  async createTestCase(problemId: number, data: any) {
    return this.request(`/coding-labs/problems/${problemId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listTestCases(problemId: number, includeHidden = false) {
    return this.request(`/coding-labs/problems/${problemId}/test-cases?include_hidden=${includeHidden}`);
  }

  async updateTestCase(testCaseId: number, data: any) {
    return this.request(`/coding-labs/test-cases/${testCaseId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTestCase(testCaseId: number) {
    return this.request(`/coding-labs/test-cases/${testCaseId}`, {
      method: 'DELETE'
    });
  }

  async createLabSubmission(data: { lab_id: number; problem_id: number; code: string; language: string; is_final_submission?: boolean }) {
    return this.request('/coding-labs/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listSubmissions(params?: { lab_id?: number; problem_id?: number; user_id?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.lab_id) queryParams.append('lab_id', String(params.lab_id));
    if (params?.problem_id) queryParams.append('problem_id', String(params.problem_id));
    if (params?.user_id) queryParams.append('user_id', String(params.user_id));
    
    return this.request(`/coding-labs/submissions?${queryParams.toString()}`);
  }

  async getSubmission(submissionId: number) {
    return this.request(`/coding-labs/submissions/${submissionId}`);
  }

  async executeLabCode(data: { code: string; language: string; input_data?: string; time_limit_seconds?: number; memory_limit_mb?: number }) {
    return this.request('/coding-labs/execute', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async runSampleTest(problemId: number, code: string, language: string) {
    return this.request(`/coding-labs/problems/${problemId}/run-sample`, {
      method: 'POST',
      body: JSON.stringify({ code, language })
    });
  }

  // ========== Company Training API Methods ==========
  
  // Companies
  async listCompanies(isActive?: boolean) {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return this.request(`/company-training/companies?${params.toString()}`);
  }

  async getCompany(companyId: number) {
    return this.request(`/company-training/companies/${companyId}`);
  }

  async createCompany(data: {
    name: string;
    logo_url?: string;
    description?: string;
    website?: string;
    is_active?: boolean;
  }) {
    return this.request('/company-training/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCompany(companyId: number, data: {
    name?: string;
    logo_url?: string;
    description?: string;
    website?: string;
    is_active?: boolean;
  }) {
    return this.request(`/company-training/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCompany(companyId: number) {
    return this.request(`/company-training/companies/${companyId}`, {
      method: 'DELETE'
    });
  }

  // Company Roles
  async listRoles(companyId?: number, isActive?: boolean) {
    const params = new URLSearchParams();
    if (companyId) params.append('company_id', companyId.toString());
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return this.request(`/company-training/roles?${params.toString()}`);
  }

  async getRole(roleId: number) {
    return this.request(`/company-training/roles/${roleId}`);
  }

  async createRole(data: {
    company_id: number;
    role_name: string;
    description?: string;
    difficulty?: string;
    scope_type?: string;
    target_departments?: string[];
    target_years?: string[];
    target_sections?: string[];
    is_active?: boolean;
  }) {
    return this.request('/company-training/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRole(roleId: number, data: {
    company_id?: number;
    role_name?: string;
    description?: string;
    difficulty?: string;
    scope_type?: string;
    target_departments?: string[];
    target_years?: string[];
    target_sections?: string[];
    is_active?: boolean;
  }) {
    return this.request(`/company-training/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRole(roleId: number) {
    return this.request(`/company-training/roles/${roleId}`, {
      method: 'DELETE'
    });
  }

  // Practice Sections
  async listPracticeSections(roleId?: number, isActive?: boolean) {
    const params = new URLSearchParams();
    if (roleId) params.append('role_id', roleId.toString());
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return this.request(`/company-training/practice-sections?${params.toString()}`);
  }

  async getPracticeSection(sectionId: number) {
    return this.request(`/company-training/practice-sections/${sectionId}`);
  }

  async createPracticeSection(data: {
    role_id: number;
    section_name: string;
    description?: string;
    order_index?: number;
    is_active?: boolean;
  }) {
    return this.request('/company-training/practice-sections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePracticeSection(sectionId: number, data: {
    role_id?: number;
    section_name?: string;
    description?: string;
    order_index?: number;
    is_active?: boolean;
  }) {
    return this.request(`/company-training/practice-sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePracticeSection(sectionId: number) {
    return this.request(`/company-training/practice-sections/${sectionId}`, {
      method: 'DELETE'
    });
  }

  // Rounds
  async listRounds(practiceSectionId?: number, roundType?: string, isActive?: boolean) {
    const params = new URLSearchParams();
    if (practiceSectionId) params.append('practice_section_id', practiceSectionId.toString());
    if (roundType) params.append('round_type', roundType);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return this.request(`/company-training/rounds?${params.toString()}`);
  }

  async getRound(roundId: number) {
    return this.request(`/company-training/rounds/${roundId}`);
  }

  async createRound(data: {
    practice_section_id: number;
    round_type: 'quiz' | 'coding' | 'gd' | 'interview';
    round_name: string;
    description?: string;
    order_index?: number;
    is_active?: boolean;
    quiz_id?: number;
    coding_problem_id?: number;
  }) {
    return this.request('/company-training/rounds', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRound(roundId: number, data: {
    practice_section_id?: number;
    round_type?: 'quiz' | 'coding' | 'gd' | 'interview';
    round_name?: string;
    description?: string;
    order_index?: number;
    is_active?: boolean;
    quiz_id?: number;
    coding_problem_id?: number;
  }) {
    return this.request(`/company-training/rounds/${roundId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRound(roundId: number) {
    return this.request(`/company-training/rounds/${roundId}`, {
      method: 'DELETE'
    });
  }

  // Round Contents
  async listRoundContents(roundId?: number, isActive?: boolean) {
    const params = new URLSearchParams();
    if (roundId) params.append('round_id', roundId.toString());
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    return this.request(`/company-training/round-contents?${params.toString()}`);
  }

  async getRoundContent(contentId: number) {
    return this.request(`/company-training/round-contents/${contentId}`);
  }

  async createRoundContent(data: {
    round_id: number;
    gd_topic?: string;
    gd_description?: string;
    key_points?: string[];
    best_points?: string[];
    dos_and_donts?: { dos?: string[]; donts?: string[] };
    question?: string;
    expected_answer?: string;
    question_type?: string;
    tips?: string[];
    quiz_question?: string;
    quiz_options?: string[];
    correct_answer?: string;
    coding_title?: string;
    coding_description?: string;
    coding_difficulty?: string;
    order_index?: number;
    is_active?: boolean;
  }) {
    return this.request('/company-training/round-contents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRoundContent(contentId: number, data: {
    round_id?: number;
    gd_topic?: string;
    gd_description?: string;
    key_points?: string[];
    best_points?: string[];
    dos_and_donts?: { dos?: string[]; donts?: string[] };
    question?: string;
    expected_answer?: string;
    question_type?: string;
    tips?: string[];
    quiz_question?: string;
    quiz_options?: string[];
    correct_answer?: string;
    coding_title?: string;
    coding_description?: string;
    coding_difficulty?: string;
    order_index?: number;
    is_active?: boolean;
  }) {
    return this.request(`/company-training/round-contents/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRoundContent(contentId: number) {
    return this.request(`/company-training/round-contents/${contentId}`, {
      method: 'DELETE'
    });
  }

  // Bulk upload for company training round contents
  async bulkUploadCompanyTrainingQuizQuestions(roundId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.baseURL}/bulk-upload/company-training/round-contents/quiz?round_id=${roundId}`;
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  async bulkUploadCompanyTrainingCodingProblems(roundId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.baseURL}/bulk-upload/company-training/round-contents/coding?round_id=${roundId}`;
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  // ==================== Resume Analytics API ====================

  async trackResumeAnalytics(data: {
    activity_type: string;
    ats_score?: number;
    previous_ats_score?: number;
    target_role?: string;
    company_name?: string;
    job_description_provided?: boolean;
    duration_seconds?: number;
    tokens_used?: number;
    estimated_cost?: number;
    recommendations?: string[];
    missing_keywords?: string[];
    strengths?: string[];
    improvements?: string[];
    status?: string;
    error_message?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request('/resume/analytics/track', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getResumeAnalyticsOverview(params?: {
    college_id?: number;
    department?: string;
    section_id?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.college_id) queryParams.append('college_id', params.college_id.toString());
    if (params?.department) queryParams.append('department', params.department);
    if (params?.section_id) queryParams.append('section_id', params.section_id.toString());
    return this.request(`/resume/analytics/overview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  }

  async getStudentsResumeAnalytics(params?: {
    college_id?: number;
    department?: string;
    section_id?: number;
    needs_optimization?: boolean;
    min_ats_score?: number;
    max_ats_score?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.college_id) queryParams.append('college_id', params.college_id.toString());
    if (params?.department) queryParams.append('department', params.department);
    if (params?.section_id) queryParams.append('section_id', params.section_id.toString());
    if (params?.needs_optimization !== undefined) queryParams.append('needs_optimization', params.needs_optimization.toString());
    if (params?.min_ats_score !== undefined) queryParams.append('min_ats_score', params.min_ats_score.toString());
    if (params?.max_ats_score !== undefined) queryParams.append('max_ats_score', params.max_ats_score.toString());
    return this.request(`/resume/analytics/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  }

  async getStudentResumeAnalyticsDetailed(studentId: number, params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    return this.request(`/resume/analytics/students/${studentId}/detailed${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL);

// Export helpers for compatibility
export const authHelpers = {
  signIn: async (email: string, password: string) => {
    try {
      console.log('[authHelpers] signIn called for:', email);
      console.log('[authHelpers] Calling apiClient.login...');
      
      // Login first - this will set tokens
      // Don't await getCurrentUser - it's not necessary for login to succeed
      const result = await apiClient.login(email, password);
      
      console.log('[authHelpers] apiClient.login completed successfully');
      
      // Login succeeded, tokens are set
      // Return a minimal user object immediately - no need to fetch user details
      // The actual user fetch can happen later if needed
      return {
        id: 0,
        email: email,
        is_active: true,
        is_verified: true
      };
    } catch (error: any) {
      console.error('[authHelpers] signIn error:', error.message, error);
      // Re-throw to let Login.tsx handle it
      throw error;
    }
  },
  
  signUp: async (email: string, password: string, fullName?: string) => {
    return apiClient.signup(email, password, fullName);
  },
  
  signOut: async () => {
    apiClient.logout();
  },
  
  getUser: async () => {
    try {
      return await apiClient.getCurrentUser();
    } catch (error: any) {
      // Silently handle connection errors - backend may not be running
      const errorMsg = error.message || '';
      if (errorMsg.includes('Failed to fetch') || 
          errorMsg.includes('ERR_CONNECTION_REFUSED') ||
          errorMsg.includes('ERR_NETWORK_CHANGED') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('network changed')) {
        // Backend not running or network issue - return null (no user logged in)
        return null;
      }
      // For other errors, also return null (user not logged in)
      return null;
    }
  },
  
  onAuthStateChange: (callback: (user: any) => void) => {
    // Only check auth state once, not continuously
    // Continuous polling causes blinking/re-renders
    const checkAuth = async () => {
      const user = await authHelpers.getUser();
      callback(user);
    };
    
    checkAuth();
    
    // Return a no-op cleanup function
    return () => {};
  },
};

// Database helpers (will be implemented as API endpoints are added)
export const dbHelpers = {
  selectWithFilters: async <T>(collection: string, filters: any): Promise<T[]> => {
    // TODO: Implement when API endpoints are ready
    console.warn(`API endpoint for ${collection} not yet implemented`);
    return [];
  },
};

export default apiClient;

