/**
 * LocalStorage utility for resume form data persistence
 * Prevents data loss when components re-render
 */

const STORAGE_KEY_PREFIX = 'resume_draft_';

export const resumeStorage = {
  // Save form data to localStorage
  save: (formName: string, data: any) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${formName}`;
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  // Load form data from localStorage
  load: <T = any>(formName: string): T | null => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${formName}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      // Return data if less than 7 days old
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed.data as T;
      }
      
      // Clear old data
      localStorage.removeItem(key);
      return null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  },

  // Clear form data from localStorage
  clear: (formName: string) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${formName}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },

  // Clear all resume drafts
  clearAll: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear all localStorage:', error);
    }
  },
};

