/**
 * Production-Grade Proctoring Service
 * Comprehensive real-time tracking system for student activity monitoring
 */

export interface ProctoringConfig {
  labId: number;
  isProctored: boolean;
  enforceFullscreen: boolean;
  detectTabSwitch: boolean;
  onViolation?: (violation: ProctoringViolation) => void;
  onActivityUpdate?: (activity: StudentActivity) => void;
}

export interface ProctoringViolation {
  type: 'tab_switch' | 'fullscreen_exit' | 'window_blur' | 'copy_paste' | 'devtools';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
}

export interface StudentActivity {
  labId: number;
  problemId?: number;
  currentCode?: string;
  language?: string;
  timeSpentSeconds: number;
  tabSwitches: number;
  fullscreenExits: number;
  violations: ProctoringViolation[];
  lastActivity: Date;
  isActive: boolean;
}

export class ProctoringService {
  private config: ProctoringConfig | null = null;
  private violations: ProctoringViolation[] = [];
  private activityStartTime: Date | null = null;
  private tabSwitchCount = 0;
  private fullscreenExitCount = 0;
  private lastActivityTime: Date = new Date();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isFullscreenEnforced = false;
  private fullscreenWarningShown = false;
  private visibilityHandlers: Map<string, () => void> = new Map();
  private isInitialized = false;

  /**
   * Initialize proctoring service
   */
  initialize(config: ProctoringConfig): void {
    if (this.isInitialized) {
      this.cleanup();
    }

    this.config = config;
    this.violations = [];
    this.activityStartTime = new Date();
    this.tabSwitchCount = 0;
    this.fullscreenExitCount = 0;
    this.lastActivityTime = new Date();
    this.isInitialized = true;

    if (!config.isProctored) {
      return;
    }

    // Create proctoring session in backend
    this.createProctoringSession().catch((error) => {
      console.error('[Proctoring] Failed to create session:', error);
    });

    // Setup tracking
    this.setupTabSwitchDetection();
    this.setupFullscreenEnforcement();
    this.setupWindowBlurDetection();
    this.setupCopyPasteDetection();
    this.setupDevToolsDetection();
    this.setupActivityTracking();
    this.connectWebSocket();

    // Log initialization
    console.log('[Proctoring] Service initialized', {
      labId: config.labId,
      enforceFullscreen: config.enforceFullscreen,
      detectTabSwitch: config.detectTabSwitch,
    });
  }

  /**
   * Create proctoring session in backend
   */
  private async createProctoringSession(): Promise<void> {
    if (!this.config) return;

    try {
      const { proctoringAPI } = await import('@/integrations/api/proctoring');
      await proctoringAPI.createSession(this.config.labId);
    } catch (error) {
      console.error('[Proctoring] Failed to create session:', error);
    }
  }

  /**
   * Setup tab switch detection
   */
  private setupTabSwitchDetection(): void {
    if (!this.config?.detectTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.tabSwitchCount++;
        const violation: ProctoringViolation = {
          type: 'tab_switch',
          timestamp: new Date(),
          severity: this.tabSwitchCount > 3 ? 'high' : this.tabSwitchCount > 1 ? 'medium' : 'low',
          details: {
            count: this.tabSwitchCount,
            duration: this.getTimeSpent(),
          },
        };

        this.recordViolation(violation);
        this.updateActivity();
      } else {
        // Tab switched back - update activity
        this.lastActivityTime = new Date();
        this.updateActivity();
      }
    };

    const handleFocus = () => {
      this.lastActivityTime = new Date();
      this.updateActivity();
    };

    const handleBlur = () => {
      // Window lost focus
      const violation: ProctoringViolation = {
        type: 'window_blur',
        timestamp: new Date(),
        severity: 'medium',
        details: {
          timeSpent: this.getTimeSpent(),
        },
      };
      this.recordViolation(violation);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    this.visibilityHandlers.set('visibilitychange', handleVisibilityChange);
    this.visibilityHandlers.set('focus', handleFocus);
    this.visibilityHandlers.set('blur', handleBlur);
  }

  /**
   * Setup fullscreen enforcement
   */
  private setupFullscreenEnforcement(): void {
    if (!this.config?.enforceFullscreen) return;

    this.isFullscreenEnforced = true;

    // Request fullscreen on initialization
    this.requestFullscreen().catch((error) => {
      console.error('[Proctoring] Failed to enter fullscreen:', error);
    });

    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && this.isFullscreenEnforced) {
        this.fullscreenExitCount++;
        
        const violation: ProctoringViolation = {
          type: 'fullscreen_exit',
          timestamp: new Date(),
          severity: this.fullscreenExitCount > 2 ? 'high' : 'medium',
          details: {
            count: this.fullscreenExitCount,
            timeSpent: this.getTimeSpent(),
          },
        };

        this.recordViolation(violation);

        // Show warning and re-enter fullscreen
        if (!this.fullscreenWarningShown) {
          this.showFullscreenWarning();
          this.fullscreenWarningShown = true;
          setTimeout(() => {
            this.fullscreenWarningShown = false;
          }, 5000);
        }

        // Re-enter fullscreen after short delay
        setTimeout(() => {
          this.requestFullscreen().catch((error) => {
            console.error('[Proctoring] Failed to re-enter fullscreen:', error);
          });
        }, 500);
      }
    };

    // Prevent keyboard shortcuts to exit fullscreen
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F11, Escape (if in fullscreen)
      if (e.key === 'F11' || (e.key === 'Escape' && document.fullscreenElement)) {
        if (this.isFullscreenEnforced) {
          e.preventDefault();
          e.stopPropagation();
          this.showFullscreenWarning();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    this.visibilityHandlers.set('fullscreenchange', handleFullscreenChange);
    this.visibilityHandlers.set('keydown', handleKeyDown);
  }

  /**
   * Request fullscreen mode
   */
  private async requestFullscreen(): Promise<void> {
    const element = document.documentElement;
    
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      } else {
        throw new Error('Fullscreen API not supported');
      }
    } catch (error: any) {
      // User denied or browser doesn't support
      console.warn('[Proctoring] Fullscreen request failed:', error.message);
      throw error;
    }
  }

  /**
   * Show fullscreen warning
   */
  private showFullscreenWarning(): void {
    // Create warning overlay
    const warning = document.createElement('div');
    warning.id = 'proctoring-fullscreen-warning';
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 2rem;
    `;
    
    warning.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
        Fullscreen Mode Required
      </div>
      <div style="font-size: 1rem; margin-bottom: 2rem; max-width: 500px;">
        This exam requires fullscreen mode. Please do not exit fullscreen.
        <br />
        Violations are being tracked and reported.
      </div>
      <div style="font-size: 0.9rem; color: #ccc;">
        Re-entering fullscreen mode...
      </div>
    `;

    document.body.appendChild(warning);

    // Remove warning after 3 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 3000);
  }

  /**
   * Setup window blur detection
   */
  private setupWindowBlurDetection(): void {
    const handleBlur = () => {
      const violation: ProctoringViolation = {
        type: 'window_blur',
        timestamp: new Date(),
        severity: 'medium',
        details: {
          timeSpent: this.getTimeSpent(),
        },
      };
      this.recordViolation(violation);
    };

    window.addEventListener('blur', handleBlur);
    this.visibilityHandlers.set('window_blur', handleBlur);
  }

  /**
   * Setup copy-paste detection
   */
  private setupCopyPasteDetection(): void {
    const handleCopy = (e: ClipboardEvent) => {
      const violation: ProctoringViolation = {
        type: 'copy_paste',
        timestamp: new Date(),
        severity: 'high',
        details: {
          action: 'copy',
          selection: window.getSelection()?.toString().substring(0, 50),
        },
      };
      this.recordViolation(violation);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const violation: ProctoringViolation = {
        type: 'copy_paste',
        timestamp: new Date(),
        severity: 'high',
        details: {
          action: 'paste',
        },
      };
      this.recordViolation(violation);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    this.visibilityHandlers.set('copy', handleCopy);
    this.visibilityHandlers.set('paste', handlePaste);
  }

  /**
   * Setup DevTools detection
   */
  private setupDevToolsDetection(): void {
    let devToolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          const violation: ProctoringViolation = {
            type: 'devtools',
            timestamp: new Date(),
            severity: 'high',
            details: {
              method: widthThreshold ? 'width' : 'height',
            },
          };
          this.recordViolation(violation);
        }
      } else {
        devToolsOpen = false;
      }
    };

    const interval = setInterval(checkDevTools, 1000);
    this.activityCheckInterval = interval as any;
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking(): void {
    // Track mouse movement, keyboard, and scroll
    const updateActivity = () => {
      this.lastActivityTime = new Date();
      this.updateActivity();
    };

    document.addEventListener('mousemove', updateActivity, { passive: true });
    document.addEventListener('keydown', updateActivity, { passive: true });
    document.addEventListener('scroll', updateActivity, { passive: true });
    document.addEventListener('click', updateActivity, { passive: true });

    // Heartbeat to backend every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, 5000) as any;
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    if (!this.config) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('[Proctoring] No access token found');
      return;
    }

    const wsUrl = `ws://localhost:8000/ws/coding-labs/${this.config.labId}?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Proctoring] WebSocket connected');
        this.reconnectAttempts = 0;
        this.wsConnection = ws;
        
        // Request current activities
        ws.send(JSON.stringify({ type: 'get_activities' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            // Heartbeat response
            return;
          }
        } catch (error) {
          console.error('[Proctoring] Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Proctoring] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[Proctoring] WebSocket disconnected');
        this.wsConnection = null;
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.connectWebSocket();
          }, 3000 * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('[Proctoring] Failed to create WebSocket:', error);
    }
  }

  /**
   * Record a violation
   */
  private recordViolation(violation: ProctoringViolation): void {
    this.violations.push(violation);
    
    // Notify callback
    if (this.config?.onViolation) {
      this.config.onViolation(violation);
    }

    // Send to backend via WebSocket
    this.sendActivityUpdate();

    // Also send to REST API for persistence
    this.sendViolationToAPI(violation).catch((error) => {
      console.error('[Proctoring] Failed to send violation to API:', error);
    });

    console.warn('[Proctoring] Violation recorded:', violation);
  }

  /**
   * Send violation to REST API for persistence
   */
  private async sendViolationToAPI(violation: ProctoringViolation): Promise<void> {
    if (!this.config) return;

    try {
      const { proctoringAPI } = await import('@/integrations/api/proctoring');
      
      await proctoringAPI.recordViolation({
        lab_id: this.config.labId,
        violation_type: violation.type,
        severity: violation.severity,
        details: violation.details,
        description: `${violation.type} violation detected`,
        time_spent_seconds: this.getTimeSpent(),
        timestamp: violation.timestamp.toISOString(),
      });
    } catch (error) {
      // Silently fail - violations are also tracked via WebSocket
      console.error('[Proctoring] API error:', error);
    }
  }

  /**
   * Update activity and send to backend
   */
  updateActivity(additionalData?: {
    currentCode?: string;
    language?: string;
    problemId?: number;
  }): void {
    if (!this.config) return;

    const activity: StudentActivity = {
      labId: this.config.labId,
      problemId: additionalData?.problemId,
      currentCode: additionalData?.currentCode,
      language: additionalData?.language,
      timeSpentSeconds: this.getTimeSpent(),
      tabSwitches: this.tabSwitchCount,
      fullscreenExits: this.fullscreenExitCount,
      violations: [...this.violations],
      lastActivity: this.lastActivityTime,
      isActive: true,
    };

    // Notify callback
    if (this.config.onActivityUpdate) {
      this.config.onActivityUpdate(activity);
    }

    // Send to backend
    this.sendActivityUpdate(additionalData);
  }

  /**
   * Send activity update to backend
   */
  private sendActivityUpdate(additionalData?: {
    currentCode?: string;
    language?: string;
    problemId?: number;
  }): void {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.wsConnection.send(
        JSON.stringify({
          type: 'activity_update',
          code: additionalData?.currentCode,
          language: additionalData?.language,
          problem_id: additionalData?.problemId,
          tab_switches: this.tabSwitchCount,
          fullscreen_exits: this.fullscreenExitCount,
          time_spent: this.getTimeSpent(),
          violations_count: this.violations.length,
        })
      );
    } catch (error) {
      console.error('[Proctoring] Failed to send activity update:', error);
    }
  }

  /**
   * Get time spent in seconds
   */
  private getTimeSpent(): number {
    if (!this.activityStartTime) return 0;
    return Math.floor((new Date().getTime() - this.activityStartTime.getTime()) / 1000);
  }

  /**
   * Get current activity summary
   */
  getActivitySummary(): StudentActivity | null {
    if (!this.config) return null;

    return {
      labId: this.config.labId,
      timeSpentSeconds: this.getTimeSpent(),
      tabSwitches: this.tabSwitchCount,
      fullscreenExits: this.fullscreenExitCount,
      violations: [...this.violations],
      lastActivity: this.lastActivityTime,
      isActive: true,
    };
  }

  /**
   * Get violations summary
   */
  getViolationsSummary(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.violations.forEach((violation) => {
      byType[violation.type] = (byType[violation.type] || 0) + 1;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
    });

    return {
      total: this.violations.length,
      byType,
      bySeverity,
    };
  }

  /**
   * Cleanup and stop proctoring
   */
  async cleanup(): Promise<void> {
    // Remove all event listeners
    this.visibilityHandlers.forEach((handler, event) => {
      const [eventName, ...rest] = event.split('_');
      const target = rest.length > 0 ? window : document;
      target.removeEventListener(eventName, handler as any);
    });
    this.visibilityHandlers.clear();

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    // Close WebSocket
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    // Remove warning overlay if exists
    const warning = document.getElementById('proctoring-fullscreen-warning');
    if (warning) {
      warning.remove();
    }

    // End proctoring session in backend
    if (this.config) {
      try {
        const { proctoringAPI } = await import('@/integrations/api/proctoring');
        // Get session ID from WebSocket or create endpoint to get current session
        // For now, session will be ended automatically when connection closes
      } catch (error) {
        console.error('[Proctoring] Failed to end session:', error);
      }
    }

    // Reset state
    this.isInitialized = false;
    this.isFullscreenEnforced = false;
    this.fullscreenWarningShown = false;
    this.reconnectAttempts = 0;

    console.log('[Proctoring] Service cleaned up');
  }
}

// Singleton instance
export const proctoringService = new ProctoringService();

