/**
 * Text-to-Speech Service
 * Uses multiple free TTS options with Indian voice preference
 */

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

class TTSService {
  private synth: SpeechSynthesis;
  private indianVoices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
    
    // Reload voices when they become available
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    const voices = this.synth.getVoices();
    
    // Filter for Indian voices (Hindi, English-India, etc.)
    this.indianVoices = voices.filter(voice => {
      const lang = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return (
        lang.includes('hi') || // Hindi
        lang.includes('in') || // India (en-IN)
        name.includes('india') ||
        name.includes('hindi') ||
        name.includes('neural') || // Some neural voices work well
        name.includes('premium') || // Premium voices often better
        lang === 'en-in' // English-India
      );
    });

    // Prefer MASCULINE/MALE voices in this order for a more manly, professional interviewer:
    // 1. Male Indian neural/premium voices (deep, natural)
    // 2. Male English neural/premium voices (professional, clear)
    // 3. Any male voice with neural/premium
    // 4. Deep-sounding male voices
    // 5. Any good quality male voice
    // 6. Fallback to best available voice
    this.preferredVoice = 
      // Male Indian voices
      this.indianVoices.find(v => {
        const name = v.name.toLowerCase();
        return (v.gender === 'male' || name.includes('male') || name.includes('man')) && 
               (name.includes('neural') || name.includes('premium'));
      }) ||
      this.indianVoices.find(v => v.gender === 'male' || v.name.toLowerCase().includes('male')) ||
      // Male English neural/premium voices (best quality)
      voices.find(v => {
        const name = v.name.toLowerCase();
        return v.lang.includes('en') && 
               (v.gender === 'male' || name.includes('male') || name.includes('man') || name.includes('david') || name.includes('daniel') || name.includes('james') || name.includes('mark')) &&
               (name.includes('neural') || name.includes('premium') || name.includes('enhanced'));
      }) ||
      // Deep-sounding male voices (common names)
      voices.find(v => {
        const name = v.name.toLowerCase();
        return (name.includes('david') || name.includes('daniel') || name.includes('james') || 
                name.includes('mark') || name.includes('thomas') || name.includes('michael') ||
                name.includes('john') || name.includes('robert') || name.includes('william')) &&
               (name.includes('neural') || name.includes('premium') || name.includes('enhanced'));
      }) ||
      // Any male voice
      voices.find(v => v.gender === 'male' || v.name.toLowerCase().includes('male')) ||
      // Best quality neural/premium voices (regardless of gender, but prefer deeper)
      voices.find(v => {
        const name = v.name.toLowerCase();
        return (name.includes('neural') || name.includes('premium') || name.includes('enhanced')) &&
               !name.includes('female') && !name.includes('woman');
      }) ||
      // Indian voices as fallback
      this.indianVoices.find(v => v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('premium')) ||
      this.indianVoices[0] ||
      // Any English voice
      voices.find(v => v.lang.includes('en-in')) ||
      voices.find(v => v.lang.includes('en')) ||
      voices[0] ||
      null;
  }

  /**
   * Speak text with Indian voice preference
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use preferred voice
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
        utterance.lang = this.preferredVoice.lang;
      } else {
        utterance.lang = 'en-IN'; // English-India
      }

      // Set options - optimized for natural, manly voice
      utterance.rate = options.rate ?? 0.88; // Slightly slower for natural speech
      utterance.pitch = options.pitch ?? 0.85; // Lower pitch for more masculine, less robotic sound
      utterance.volume = options.volume ?? 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synth.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop() {
    this.synth.cancel();
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Get available Indian voices
   */
  getIndianVoices(): SpeechSynthesisVoice[] {
    return this.indianVoices;
  }

  /**
   * Get current preferred voice name
   */
  getCurrentVoiceName(): string {
    return this.preferredVoice?.name || 'Default';
  }
}

// Export singleton instance
export const ttsService = new TTSService();

