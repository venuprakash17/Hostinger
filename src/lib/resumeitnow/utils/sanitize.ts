/**
 * Input Sanitization Utility
 * Sanitizes user inputs before sending to OpenAI API
 * Prevents injection attacks and ensures data quality
 */

/**
 * Sanitize text input
 * - Removes potentially harmful content
 * - Limits length
 * - Trims whitespace
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize resume text (for ATS analysis)
 */
export function sanitizeResumeText(text: string): string {
  return sanitizeInput(text, 50000); // Allow longer for full resumes
}

/**
 * Sanitize job description
 */
export function sanitizeJobDescription(jobDescription: string): string {
  return sanitizeInput(jobDescription, 20000); // Allow longer for job descriptions
}

/**
 * Sanitize resume data object
 */
export function sanitizeResumeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized: any = { ...data };

  // Sanitize profile
  if (sanitized.profile) {
    sanitized.profile = {
      ...sanitized.profile,
      full_name: sanitized.profile.full_name ? sanitizeInput(sanitized.profile.full_name, 200) : '',
      email: sanitized.profile.email ? sanitizeInput(sanitized.profile.email, 255) : '',
      phone_number: sanitized.profile.phone_number ? sanitizeInput(sanitized.profile.phone_number, 50) : '',
      linkedin_profile: sanitized.profile.linkedin_profile ? sanitizeInput(sanitized.profile.linkedin_profile, 500) : '',
      github_portfolio: sanitized.profile.github_portfolio ? sanitizeInput(sanitized.profile.github_portfolio, 500) : '',
    };
  }

  // Sanitize education
  if (Array.isArray(sanitized.education)) {
    sanitized.education = sanitized.education.map((edu: any) => ({
      ...edu,
      institution_name: edu.institution_name ? sanitizeInput(edu.institution_name, 200) : '',
      degree: edu.degree ? sanitizeInput(edu.degree, 200) : '',
      field_of_study: edu.field_of_study ? sanitizeInput(edu.field_of_study, 200) : '',
      relevant_coursework: edu.relevant_coursework ? sanitizeInput(edu.relevant_coursework, 1000) : '',
    }));
  }

  // Sanitize projects
  if (Array.isArray(sanitized.projects)) {
    sanitized.projects = sanitized.projects.map((proj: any) => ({
      ...proj,
      project_title: proj.project_title ? sanitizeInput(proj.project_title, 200) : '',
      description: proj.description ? sanitizeInput(proj.description, 2000) : '',
      role_contribution: proj.role_contribution ? sanitizeInput(proj.role_contribution, 1000) : '',
      technologies_used: Array.isArray(proj.technologies_used)
        ? proj.technologies_used.map((tech: string) => sanitizeInput(tech, 100))
        : proj.technologies_used,
    }));
  }

  // Sanitize skills
  if (Array.isArray(sanitized.skills)) {
    sanitized.skills = sanitized.skills.map((skill: any) => ({
      ...skill,
      category: skill.category ? sanitizeInput(skill.category, 50) : '',
      skills: Array.isArray(skill.skills)
        ? skill.skills.map((s: string) => sanitizeInput(s, 100))
        : skill.skills,
    }));
  }

  return sanitized;
}

/**
 * Validate resume data structure
 */
export function validateResumeData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push('Resume data is required');
    return { valid: false, errors };
  }

  // Validate profile
  if (data.profile) {
    if (!data.profile.full_name || data.profile.full_name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    if (!data.profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.profile.email)) {
      errors.push('Valid email is required');
    }
  } else {
    errors.push('Profile information is required');
  }

  // Validate education
  if (!data.education || !Array.isArray(data.education) || data.education.length === 0) {
    errors.push('At least one education entry is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

