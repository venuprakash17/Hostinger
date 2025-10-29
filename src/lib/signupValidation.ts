import { z } from 'zod';

/**
 * Comprehensive validation schema for student signup
 * Prevents malformed data and potential security issues
 */
export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, and basic punctuation'),
  
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  
  confirmPassword: z.string(),
  
  rollNumber: z
    .string()
    .trim()
    .min(3, 'Roll number must be at least 3 characters')
    .max(50, 'Roll number must be less than 50 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Roll number can only contain letters, numbers, and hyphens')
    .toUpperCase(),
  
  department: z
    .string()
    .uuid('Please select a valid department'),
  
  section: z
    .string()
    .uuid('Please select a valid section')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export type SignupFormData = z.infer<typeof signupSchema>;
