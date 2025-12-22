/**
 * Error Handler for ResumeItNow Services
 * Provides user-friendly error messages
 */

export interface ErrorInfo {
  message: string;
  actionable: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Handle OpenAI API errors and return user-friendly messages
 */
export function handleOpenAIError(error: any): ErrorInfo {
  const errorMessage = error?.message || String(error);
  
  // API Key errors
  if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    return {
      message: 'OpenAI API key is missing or invalid',
      actionable: 'Please configure VITE_OPENAI_API_KEY in your .env file. Get your key from https://platform.openai.com/api-keys',
      severity: 'error',
    };
  }
  
  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      message: 'Rate limit exceeded',
      actionable: 'Too many requests. Please wait a few moments and try again.',
      severity: 'warning',
    };
  }
  
  // Quota errors
  if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
    return {
      message: 'OpenAI account quota exceeded',
      actionable: 'Please check your OpenAI account billing and add credits.',
      severity: 'error',
    };
  }
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      message: 'Network error',
      actionable: 'Please check your internet connection and try again.',
      severity: 'warning',
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return {
      message: 'Request timed out',
      actionable: 'The request took too long. Please try again.',
      severity: 'warning',
    };
  }
  
  // Invalid response format
  if (errorMessage.includes('Invalid response') || errorMessage.includes('JSON')) {
    return {
      message: 'Invalid response from AI service',
      actionable: 'The AI service returned an unexpected response. Please try again.',
      severity: 'warning',
    };
  }
  
  // Generic error
  return {
    message: 'An error occurred',
    actionable: 'Please try again. If the problem persists, contact support.',
    severity: 'error',
  };
}

/**
 * Handle PDF generation errors
 */
export function handlePDFError(error: any): ErrorInfo {
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('font') || errorMessage.includes('Font')) {
    return {
      message: 'PDF font error',
      actionable: 'There was an issue with PDF font rendering. Please try again.',
      severity: 'warning',
    };
  }
  
  if (errorMessage.includes('size') || errorMessage.includes('memory')) {
    return {
      message: 'PDF too large',
      actionable: 'The resume is too large to generate. Please reduce the content and try again.',
      severity: 'warning',
    };
  }
  
  return {
    message: 'PDF generation failed',
    actionable: 'There was an error generating the PDF. Please try again.',
    severity: 'error',
  };
}

/**
 * Handle file extraction errors
 */
export function handleExtractionError(error: any): ErrorInfo {
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('PDF') || errorMessage.includes('parse')) {
    return {
      message: 'Could not extract text from PDF',
      actionable: 'The PDF file may be corrupted or password-protected. Please try a different file.',
      severity: 'error',
    };
  }
  
  if (errorMessage.includes('DOCX') || errorMessage.includes('Word')) {
    return {
      message: 'Could not extract text from DOCX',
      actionable: 'The DOCX file may be corrupted. Please try converting to PDF or TXT format.',
      severity: 'error',
    };
  }
  
  return {
    message: 'File extraction failed',
    actionable: 'Could not read the file. Please ensure it\'s a valid PDF, DOCX, or TXT file.',
    severity: 'error',
  };
}

