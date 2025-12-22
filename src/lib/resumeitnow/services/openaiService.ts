/**
 * OpenAI Service for ResumeItNow Integration
 * Replaces OpenRouter with direct OpenAI API calls
 */

import { handleOpenAIError } from '../utils/errorHandler';
import { retryWithBackoff } from '../utils/retryHandler';
import { checkOpenAIConfig } from '../utils/envCheck';
import { getCachedATSResult, cacheATSResult, getCachedCoverLetter, cacheCoverLetter } from '../utils/cache';
import { sanitizeInput, sanitizeResumeText, sanitizeJobDescription, sanitizeResumeData, validateResumeData } from '../utils/sanitize';
import { trackATSCheck, trackCoverLetter, trackRoleOptimization, trackTextEnhancement } from '../utils/analytics';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Log configuration warning on import
if (typeof window !== 'undefined') {
  checkOpenAIConfig();
}

export interface ATSAnalysisResult {
  score: number;
  keywords: string[];
  suggestions: string[];
  strengths?: string[];
  improvements?: string[];
  missingKeywords?: string[];
}

export interface EnhancementResult {
  enhanced: string;
}

/**
 * Analyze resume for ATS compatibility using OpenAI
 */
export async function analyzeATSWithOpenAI(
  resumeText: string,
  jobDescription?: string
): Promise<ATSAnalysisResult> {
  const configCheck = checkOpenAIConfig();
  if (!configCheck.configured) {
    throw new Error(configCheck.message);
  }

  // Sanitize inputs
  const sanitizedResumeText = sanitizeResumeText(resumeText);
  const sanitizedJobDescription = jobDescription ? sanitizeJobDescription(jobDescription) : undefined;

  // Check cache first (use sanitized inputs for cache key)
  const cached = getCachedATSResult(sanitizedResumeText, sanitizedJobDescription);
  if (cached) {
    console.log('✅ Using cached ATS analysis result');
    trackATSCheck(true, 0, 0); // Cached result - no API call
    return cached as ATSAnalysisResult;
  }

  const startTime = Date.now();
  const prompt = sanitizedJobDescription
    ? `Analyze this resume text and job description for ATS compatibility. Extract relevant keywords (maximum of 10), calculate an ATS score (0-100), and provide suggestions for improvement. Resume: "${sanitizedResumeText}". Job Description: "${sanitizedJobDescription}". Return the response in JSON format with keys: score (number), keywords (array of strings, only important ones), suggestions (array of strings), strengths (array of strings), improvements (array of strings), missingKeywords (array of strings).`
    : `Analyze this resume text for general ATS compatibility. Extract relevant keywords (maximum of 10), calculate an ATS score (0-100), and provide suggestions for improvement. Resume: "${sanitizedResumeText}". Return the response in JSON format with keys: score (number), keywords (array of strings, only important ones), suggestions (array of strings), strengths (array of strings), improvements (array of strings), missingKeywords (array of strings).`;

  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using cost-effective model
          messages: [
            {
              role: 'system',
              content: 'You are an expert ATS (Applicant Tracking System) analyst. Analyze resumes for ATS compatibility and provide actionable feedback. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Lower temperature for more consistent analysis
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI API error: ${res.statusText} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Parse JSON response
    const result = JSON.parse(content) as ATSAnalysisResult;

    // Ensure all required fields exist
    const finalResult: ATSAnalysisResult = {
      score: result.score || 0,
      keywords: result.keywords || [],
      suggestions: result.suggestions || [],
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      missingKeywords: result.missingKeywords || [],
    };

    // Cache the result (10 minutes TTL)
    cacheATSResult(sanitizedResumeText, sanitizedJobDescription, finalResult);

    // Track analytics (tokensUsed already extracted above)
    const duration = Date.now() - startTime;
    trackATSCheck(
      true,
      duration,
      tokensUsed,
      undefined, // error
      finalResult.score,
      undefined, // previousAtsScore - would need to be passed in or retrieved
      finalResult.suggestions,
      finalResult.missingKeywords,
      finalResult.strengths,
      finalResult.improvements,
      !!jobDescription
    );

    return finalResult;
  } catch (error) {
    console.error('Error calling OpenAI API for ATS analysis:', error);
    const duration = Date.now() - startTime;
    trackATSCheck(
      false,
      duration,
      0,
      error instanceof Error ? error.message : String(error),
      undefined, // atsScore
      undefined, // previousAtsScore
      undefined, // recommendations
      undefined, // missingKeywords
      undefined, // strengths
      undefined, // improvements
      !!jobDescription
    );
    const errorInfo = handleOpenAIError(error);
    throw new Error(errorInfo.message);
  }
}

/**
 * Enhance text using OpenAI
 */
export async function enhanceTextWithOpenAI(description: string): Promise<EnhancementResult> {
  const configCheck = checkOpenAIConfig();
  if (!configCheck.configured) {
    throw new Error(configCheck.message);
  }

  // Sanitize input
  const sanitizedDescription = sanitizeInput(description, 500);

  const startTime = Date.now();
  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional resume writer. Enhance the given description to be more impactful and professional while maintaining truthfulness. Use only bold(**) and bullet point(-) markdown where necessary. Do not use phrases like "here are..." or anything, just give the straight message. Strictly under 450 characters.',
            },
            {
              role: 'user',
              content: `Please enhance this description to be more professional and impactful: ${sanitizedDescription}`,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI API error: ${res.statusText} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const enhanced = data.choices[0]?.message?.content;

    if (!enhanced) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Track analytics
    const duration = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;
    trackTextEnhancement(true, duration, tokensUsed);

    return { enhanced };
  } catch (error) {
    console.error('Error calling OpenAI API for enhancement:', error);
    const duration = Date.now() - startTime;
    trackTextEnhancement(false, duration, 0, error instanceof Error ? error.message : String(error));
    const errorInfo = handleOpenAIError(error);
    throw new Error(errorInfo.message);
  }
}

/**
 * Generate role-based resume enhancement using OpenAI
 */
export async function enhanceResumeForRoleWithOpenAI(
  resumeData: any,
  targetRole: string,
  jobDescription?: string
): Promise<any> {
  const configCheck = checkOpenAIConfig();
  if (!configCheck.configured) {
    throw new Error(configCheck.message);
  }

  // Validate and sanitize resume data
  const validation = validateResumeData(resumeData);
  if (!validation.valid) {
    throw new Error(`Invalid resume data: ${validation.errors.join(', ')}`);
  }

  const sanitizedData = sanitizeResumeData(resumeData);
  const sanitizedRole = sanitizeInput(targetRole, 200);
  const sanitizedJobDesc = jobDescription ? sanitizeJobDescription(jobDescription) : undefined;

  const systemPrompt = `You are an expert resume writer specializing in tailoring resumes for specific job roles. Enhance the resume specifically for the role: ${sanitizedRole}. ${sanitizedJobDesc ? `Job Description:\n${sanitizedJobDesc}\n\n` : ''}Enhance the resume by: 1. Rewriting the professional summary to align perfectly with ${sanitizedRole} requirements, 2. Highlighting relevant projects and skills, 3. Adding role-specific keywords naturally, 4. Improving project descriptions with role-focused achievements, 5. Ensuring all content aligns with ${sanitizedRole} expectations. Return ONLY valid JSON.`;

  const userPrompt = `Enhance this resume for ${sanitizedRole}:\n\nPROFILE:\n${JSON.stringify(sanitizedData.profile, null, 2)}\n\nEDUCATION:\n${JSON.stringify(sanitizedData.education, null, 2)}\n\nPROJECTS:\n${JSON.stringify(sanitizedData.projects, null, 2)}\n\nSKILLS:\n${JSON.stringify(sanitizedData.skills, null, 2)}`;

  const startTime = Date.now();
  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI API error: ${res.statusText} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Parse JSON response
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    // Track analytics
    const duration = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;
    trackRoleOptimization(
      true,
      duration,
      tokensUsed,
      undefined, // error
      sanitizedRole,
      !!sanitizedJobDesc
    );

    return result;
  } catch (error) {
    console.error('Error calling OpenAI API for role enhancement:', error);
    const duration = Date.now() - startTime;
    trackRoleOptimization(
      false,
      duration,
      0,
      error instanceof Error ? error.message : String(error),
      sanitizedRole,
      !!sanitizedJobDesc
    );
    const errorInfo = handleOpenAIError(error);
    throw new Error(errorInfo.message);
  }
}

/**
 * Generate cover letter using OpenAI
 */
export async function generateCoverLetterWithOpenAI(
  resumeData: any,
  jobDescription: string,
  companyName: string,
  role: string
): Promise<string> {
  const configCheck = checkOpenAIConfig();
  if (!configCheck.configured) {
    throw new Error(configCheck.message);
  }

  // Sanitize inputs
  const sanitizedData = sanitizeResumeData(resumeData);
  const sanitizedJobDesc = sanitizeJobDescription(jobDescription);
  const sanitizedCompany = sanitizeInput(companyName, 200);
  const sanitizedRole = sanitizeInput(role, 200);

  // Check cache first
  const cached = getCachedCoverLetter(sanitizedData, sanitizedJobDesc, sanitizedCompany, sanitizedRole);
  if (cached) {
    console.log('✅ Using cached cover letter');
    trackCoverLetter(true, 0, 0); // Cached result
    return cached;
  }

  const systemPrompt = `You are a professional cover letter writer. Create a compelling, personalized cover letter that highlights the candidate's relevant experience and skills for the position.`;

  const userPrompt = `Write a professional cover letter for:
- Position: ${sanitizedRole}
- Company: ${sanitizedCompany}
- Job Description: ${sanitizedJobDesc}

Candidate Information:
${JSON.stringify(sanitizedData, null, 2)}

Make the cover letter:
1. Professional and engaging
2. Tailored to the specific role and company
3. Highlighting relevant experience and skills
4. Showing enthusiasm for the position
5. Approximately 3-4 paragraphs`;

  const startTime = Date.now();
  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenAI API error: ${res.statusText} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const coverLetter = data.choices[0]?.message?.content;

    if (!coverLetter) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Cache the result (30 minutes TTL)
    cacheCoverLetter(sanitizedData, sanitizedJobDesc, sanitizedCompany, sanitizedRole, coverLetter);

    // Track analytics
    const duration = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;
    trackCoverLetter(
      true,
      duration,
      tokensUsed,
      undefined, // error
      sanitizedCompany,
      sanitizedRole
    );

    return coverLetter;
  } catch (error) {
    console.error('Error calling OpenAI API for cover letter:', error);
    const duration = Date.now() - startTime;
    trackCoverLetter(
      false,
      duration,
      0,
      error instanceof Error ? error.message : String(error),
      sanitizedCompany,
      sanitizedRole
    );
    const errorInfo = handleOpenAIError(error);
    throw new Error(errorInfo.message);
  }
}


