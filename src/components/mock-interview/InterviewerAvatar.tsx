/**
 * Professional Animated Interviewer Avatar
 * Uses CSS animations and SVG for a professional interview look
 */

import { useEffect, useState } from 'react';

interface InterviewerAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export function InterviewerAvatar({ isSpeaking, isListening }: InterviewerAvatarProps) {
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (isSpeaking || isListening) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 4);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isSpeaking, isListening]);

  return (
    <div className="relative w-40 h-40 mx-auto mb-4">
      {/* Professional Interviewer Avatar */}
      <div className="relative w-full h-full">
        {/* Animated speaking/listening indicator rings */}
        {(isSpeaking || isListening) && (
          <>
            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse" style={{ animationDuration: '1.5s' }} />
          </>
        )}

        {/* Professional Avatar Container */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-900 border-4 border-blue-200 dark:border-blue-800 shadow-2xl overflow-hidden">
          {/* Professional Interviewer SVG */}
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 w-full h-full"
            style={{
              filter: isSpeaking ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Professional Suit/Blazer */}
            <rect x="50" y="100" width="100" height="90" rx="8" fill="#1e3a8a" />
            <rect x="60" y="110" width="80" height="60" rx="4" fill="#ffffff" />
            
            {/* Head - Professional */}
            <circle cx="100" cy="65" r="38" fill="#fdbcb4" />
            
            {/* Hair - Professional business style */}
            <path
              d="M 62 55 Q 100 40 138 55 Q 145 42 132 38 Q 100 25 68 38 Q 55 42 62 55 Z"
              fill="#1a1a1a"
            />
            
            {/* Eyes - Professional, attentive */}
            <circle
              cx={isSpeaking ? "87" : "90"}
              cy="68"
              r="5"
              fill="#1a1a1a"
              style={{
                animation: isSpeaking ? 'blink 0.6s infinite' : 'none',
              }}
            />
            <circle
              cx={isSpeaking ? "113" : "110"}
              cy="68"
              r="5"
              fill="#1a1a1a"
              style={{
                animation: isSpeaking ? 'blink 0.6s infinite' : 'none',
              }}
            />
            
            {/* Eyebrows */}
            <path d="M 82 60 Q 90 58 98 60" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            <path d="M 102 60 Q 110 58 118 60" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            
            {/* Mouth - Animated when speaking */}
            {isSpeaking ? (
              <ellipse
                cx="100"
                cy="88"
                rx="10"
                ry="6"
                fill="#1a1a1a"
                style={{
                  animation: 'speak 0.25s infinite alternate',
                }}
              />
            ) : isListening ? (
              <path
                d="M 90 88 Q 100 92 110 88"
                stroke="#1a1a1a"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M 90 88 Q 100 85 110 88"
                stroke="#1a1a1a"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            )}
            
            {/* Professional Tie */}
            <rect x="93" y="110" width="14" height="35" rx="2" fill="#0f172a" />
            <polygon points="88,110 100,125 112,110" fill="#0f172a" />
            
            {/* Professional Collar */}
            <path d="M 70 110 L 85 120 L 100 110" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M 100 110 L 115 120 L 130 110" stroke="#ffffff" strokeWidth="2" fill="none" />
          </svg>

          {/* Status indicator badge */}
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
              isSpeaking 
                ? 'bg-blue-500 text-white animate-pulse' 
                : isListening 
                ? 'bg-green-500 text-white animate-pulse'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {isSpeaking ? '🎤 Speaking...' : isListening ? '👂 Listening...' : '✨ Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.2; transform: scaleY(0.1); }
        }
        
        @keyframes speak {
          0% { rx: 10; ry: 6; }
          100% { rx: 12; ry: 8; }
        }
      `}</style>
    </div>
  );
}

