/**
 * Sanitizes authentication error messages to prevent information leakage
 * Maps internal Supabase errors to safe, user-friendly messages
 */
export function getSafeAuthError(error: any): string {
  // Log the actual error server-side for debugging
  console.error('Auth error:', error);
  
  const errorMessage = error?.message || '';
  
  // Map of internal error patterns to safe user messages
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please verify your email',
    'User already registered': 'An account with this email already exists',
    'Password should be at least': 'Password must be at least 8 characters',
    'duplicate key value': 'This account already exists',
    'violates foreign key constraint': 'Invalid selection. Please try again',
    'violates unique constraint': 'This information is already registered',
    'invalid input syntax': 'Invalid information provided',
    'Email rate limit exceeded': 'Too many attempts. Please try again later'
  };
  
  // Check if error message matches any known patterns
  for (const [pattern, safeMessage] of Object.entries(errorMap)) {
    if (errorMessage.includes(pattern)) {
      return safeMessage;
    }
  }
  
  // Default safe message for unknown errors
  return 'An error occurred. Please try again or contact support if the issue persists.';
}
