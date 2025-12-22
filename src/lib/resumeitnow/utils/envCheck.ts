/**
 * Environment Configuration Checker
 * Validates that required environment variables are configured
 */

export interface ConfigCheck {
  configured: boolean;
  message: string;
  missingVars: string[];
}

/**
 * Check if OpenAI API key is configured
 */
export function checkOpenAIConfig(): ConfigCheck {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  const missingVars: string[] = [];
  
  if (!key || key === 'your-openai-api-key-here' || key.trim() === '') {
    missingVars.push('VITE_OPENAI_API_KEY');
    return {
      configured: false,
      message: 'OpenAI API key not configured. ResumeItNow AI features (ATS checking, cover letters, role optimization) will not work. Please set VITE_OPENAI_API_KEY in your .env file.',
      missingVars,
    };
  }
  
  return {
    configured: true,
    message: 'OpenAI API key is configured.',
    missingVars: [],
  };
}

/**
 * Get all configuration status
 */
export function checkAllConfig(): ConfigCheck {
  const openAICheck = checkOpenAIConfig();
  
  if (!openAICheck.configured) {
    return openAICheck;
  }
  
  return {
    configured: true,
    message: 'All required configuration is set.',
    missingVars: [],
  };
}

/**
 * Show configuration warning in console
 */
export function logConfigWarning(): void {
  const check = checkOpenAIConfig();
  if (!check.configured) {
    console.warn('⚠️ ResumeItNow Configuration Warning:', check.message);
    console.warn('📝 Get your OpenAI API key from: https://platform.openai.com/api-keys');
  }
}

