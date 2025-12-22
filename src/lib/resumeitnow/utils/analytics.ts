/**
 * Usage Analytics for ResumeItNow
 * Tracks API usage, costs, and performance metrics
 * Sends data to backend for admin analytics
 */

import { apiClient } from '@/integrations/api/client';

interface AnalyticsEvent {
  type: 'ats_check' | 'cover_letter' | 'role_optimization' | 'pdf_generation' | 'text_enhancement';
  timestamp: number;
  tokensUsed?: number;
  cost?: number;
  duration?: number;
  success: boolean;
  error?: string;
  atsScore?: number;
  previousAtsScore?: number;
  targetRole?: string;
  companyName?: string;
  jobDescriptionProvided?: boolean;
  recommendations?: string[];
  missingKeywords?: string[];
  strengths?: string[];
  improvements?: string[];
  metadata?: Record<string, any>;
}

class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  /**
   * Track an analytics event
   */
  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('📊 Analytics Event:', fullEvent);
    }

    // Send to backend for admin analytics (fire and forget)
    this.sendToBackend(fullEvent).catch(err => {
      // Silently fail - analytics shouldn't break the app
      if (import.meta.env.DEV) {
        console.warn('Failed to send analytics to backend:', err);
      }
    });
  }

  /**
   * Send analytics event to backend
   */
  private async sendToBackend(event: AnalyticsEvent): Promise<void> {
    try {
      await apiClient.trackResumeAnalytics({
        activity_type: event.type,
        ats_score: event.atsScore,
        previous_ats_score: event.previousAtsScore,
        target_role: event.targetRole,
        company_name: event.companyName,
        job_description_provided: event.jobDescriptionProvided || false,
        duration_seconds: event.duration ? Math.round(event.duration / 1000) : undefined,
        tokens_used: event.tokensUsed,
        estimated_cost: event.cost,
        recommendations: event.recommendations,
        missing_keywords: event.missingKeywords,
        strengths: event.strengths,
        improvements: event.improvements,
        status: event.success ? 'success' : 'failed',
        error_message: event.error,
        metadata: event.metadata,
      });
    } catch (error) {
      // Silently fail - don't break the app if analytics fails
      if (import.meta.env.DEV) {
        console.warn('Analytics backend error:', error);
      }
    }
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    totalEvents: number;
    byType: Record<string, number>;
    successRate: number;
    totalCost: number;
    totalTokens: number;
    averageDuration: number;
  } {
    const byType: Record<string, number> = {};
    let totalCost = 0;
    let totalTokens = 0;
    let totalDuration = 0;
    let successCount = 0;

    this.events.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
      if (event.cost) totalCost += event.cost;
      if (event.tokensUsed) totalTokens += event.tokensUsed;
      if (event.duration) totalDuration += event.duration;
      if (event.success) successCount++;
    });

    return {
      totalEvents: this.events.length,
      byType,
      successRate: this.events.length > 0 ? (successCount / this.events.length) * 100 : 0,
      totalCost,
      totalTokens,
      averageDuration: this.events.length > 0 ? totalDuration / this.events.length : 0,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker();

/**
 * Track ATS check
 */
export function trackATSCheck(
  success: boolean,
  duration?: number,
  tokensUsed?: number,
  error?: string,
  atsScore?: number,
  previousAtsScore?: number,
  recommendations?: string[],
  missingKeywords?: string[],
  strengths?: string[],
  improvements?: string[],
  jobDescriptionProvided?: boolean
): void {
  // Estimate cost: gpt-4o-mini pricing ($0.15/$0.60 per 1M tokens)
  const cost = tokensUsed ? (tokensUsed / 1000000) * 0.15 : 0;

  analytics.track({
    type: 'ats_check',
    success,
    duration,
    tokensUsed,
    cost,
    error,
    atsScore,
    previousAtsScore,
    recommendations,
    missingKeywords,
    strengths,
    improvements,
    jobDescriptionProvided,
  });
}

/**
 * Track cover letter generation
 */
export function trackCoverLetter(
  success: boolean,
  duration?: number,
  tokensUsed?: number,
  error?: string,
  companyName?: string,
  targetRole?: string
): void {
  const cost = tokensUsed ? (tokensUsed / 1000000) * 0.15 : 0;

  analytics.track({
    type: 'cover_letter',
    success,
    duration,
    tokensUsed,
    cost,
    error,
    companyName,
    targetRole,
    jobDescriptionProvided: true, // Cover letters always have job descriptions
  });
}

/**
 * Track role optimization
 */
export function trackRoleOptimization(
  success: boolean,
  duration?: number,
  tokensUsed?: number,
  error?: string,
  targetRole?: string,
  jobDescriptionProvided?: boolean
): void {
  const cost = tokensUsed ? (tokensUsed / 1000000) * 0.15 : 0;

  analytics.track({
    type: 'role_optimization',
    success,
    duration,
    tokensUsed,
    cost,
    error,
    targetRole,
    jobDescriptionProvided,
  });
}

/**
 * Track PDF generation
 */
export function trackPDFGeneration(
  success: boolean,
  duration?: number,
  error?: string,
  metadata?: Record<string, any>
): void {
  analytics.track({
    type: 'pdf_generation',
    success,
    duration,
    error,
    metadata,
  });
}

/**
 * Track text enhancement
 */
export function trackTextEnhancement(success: boolean, duration?: number, tokensUsed?: number, error?: string): void {
  const cost = tokensUsed ? (tokensUsed / 1000000) * 0.15 : 0;

  analytics.track({
    type: 'text_enhancement',
    success,
    duration,
    tokensUsed,
    cost,
    error,
  });
}

