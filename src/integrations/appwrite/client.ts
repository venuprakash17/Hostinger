import { Client, Account, Databases, Storage, Functions } from 'appwrite';

// Initialize Appwrite Client
export const appwriteClient = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'http://localhost/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// Initialize Appwrite Services
export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);
export const functions = new Functions(appwriteClient);

// Database ID - You'll set this in Appwrite dashboard
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';

// Collection IDs - These will be created in Appwrite
export const COLLECTIONS = {
  COLLEGES: 'colleges',
  PROFILES: 'profiles',
  USER_ROLES: 'user_roles',
  NOTIFICATIONS: 'notifications',
  QUIZZES: 'quizzes',
  QUIZ_QUESTIONS: 'quiz_questions',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  CODING_PROBLEMS: 'coding_problems',
  CODING_SUBMISSIONS: 'coding_submissions',
  ATTENDANCE: 'attendance',
  PLACEMENT_SESSIONS: 'placement_sessions',
  DEPARTMENTS: 'departments',
  SECTIONS: 'sections',
  FACULTY_SECTIONS: 'faculty_sections',
  COMPANIES: 'companies',
  COMPANY_CODING_PROBLEMS: 'company_coding_problems',
  COMPANY_GD_TOPICS: 'company_gd_topics',
  COMPANY_INTERVIEW_QUESTIONS: 'company_interview_questions',
  COMPANY_QUIZZES: 'company_quizzes',
  STUDENT_PROFILES: 'student_profiles',
  STUDENT_EDUCATION: 'student_education',
  STUDENT_PROJECTS: 'student_projects',
  STUDENT_SKILLS: 'student_skills',
  STUDENT_CERTIFICATIONS: 'student_certifications',
  STUDENT_ACHIEVEMENTS: 'student_achievements',
  STUDENT_EXTRACURRICULAR: 'student_extracurricular',
  HOBBIES: 'hobbies',
  RESUME_VERSIONS: 'resume_versions',
  RESUME_ANALYTICS: 'resume_analytics',
} as const;

// Storage Bucket IDs
export const STORAGE_BUCKETS = {
  RESUMES: 'resumes',
  COMPANY_MATERIALS: 'company_materials',
} as const;

