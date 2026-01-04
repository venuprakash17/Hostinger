/**
 * Interview Screen - Main interview interface with voice
 * Features: AI voice questions, microphone input, live transcript
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, MicOff, Volume2, VolumeX, User, Clock, Keyboard, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InterviewerAvatar } from './InterviewerAvatar';
import { ttsService } from '@/utils/ttsService';

interface QuestionData {
  question: string;
  questionType: string;
  questionNumber: number;
  totalQuestions: number;
}

interface InterviewScreenProps {
  question: QuestionData;
  interviewData: any;
  onAnswerChange: (answer: string) => void;
  onAnswerSubmit: (analysis: any) => void;
  onQuestionReceived: (question: QuestionData) => void;
  allAnswers: any[];
}

export function InterviewScreen({
  question,
  interviewData,
  onAnswerChange,
  onAnswerSubmit,
  onQuestionReceived,
  allAnswers,
}: InterviewScreenProps) {
  // Safety check - ensure question exists and has required properties
  if (!question || !question.question) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading question...</p>
        </CardContent>
      </Card>
    );
  }

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedAnswer, setTypedAnswer] = useState(''); // For typed input
  const [inputMode, setInputMode] = useState<'voice' | 'type' | 'both'>('both'); // Input mode
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Initialize Web Speech API
  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: 'Browser Not Supported',
        description: 'Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
    }

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(prev => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          toast({
            title: 'No Speech Detected',
            description: 'Please speak into your microphone.',
            variant: 'destructive',
          });
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [inputMode, typedAnswer, onAnswerChange]);

  // Speak question using browser TTS
  useEffect(() => {
    if (question && question.question) {
      speakQuestion(question.question);
    }
    // Reset answer when question changes
    setTranscript('');
    setTypedAnswer('');
    setTimeElapsed(0);
    // Cleanup on unmount
    return () => {
      ttsService.stop();
    };
  }, [question?.question]);

  // Update parent with combined answer when transcript or typedAnswer changes
  // Use a ref to track if we should update to avoid unnecessary calls
  const answerUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Debounce the parent update to avoid too many calls
    if (answerUpdateTimeoutRef.current) {
      clearTimeout(answerUpdateTimeoutRef.current);
    }
    
    answerUpdateTimeoutRef.current = setTimeout(() => {
      if (inputMode === 'both') {
        const combined = (typedAnswer.trim() + ' ' + transcript.trim()).trim();
        onAnswerChange(combined);
      } else if (inputMode === 'voice') {
        onAnswerChange(transcript);
      } else {
        onAnswerChange(typedAnswer);
      }
    }, 100); // Small debounce to batch updates
    
    return () => {
      if (answerUpdateTimeoutRef.current) {
        clearTimeout(answerUpdateTimeoutRef.current);
      }
    };
  }, [transcript, typedAnswer, inputMode, onAnswerChange]);

  // Timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

  const speakQuestion = async (text: string) => {
    try {
      setIsSpeaking(true);
      await ttsService.speak(text, {
        rate: 0.88, // Natural speaking pace
        pitch: 0.85, // Lower pitch for more masculine, natural voice
        volume: 1.0,
      });
      setIsSpeaking(false);
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not available in your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmitAnswer = async () => {
    // Combine typed answer and transcript
    const finalAnswer = (typedAnswer.trim() + ' ' + transcript.trim()).trim();
    
    if (!finalAnswer) {
      toast({
        title: 'No Answer',
        description: 'Please provide an answer (type or speak) before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Helper function to get API base URL (already includes /api/v1)
      const getAPIBase = () => {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
          return 'http://localhost:8000/api/v1';
        }
        return envUrl || 'http://localhost:8000/api/v1';
      };
      
      const API_BASE = getAPIBase();
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE}/mock-interview-ai/analyze-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question.question,
          answer: finalAnswer,
          question_number: question.questionNumber,
          resume_data: interviewData?.resumeData,
          job_description: interviewData?.jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        const errorMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
        
        // Check if it's an Ollama availability issue
        if (response.status === 503 || errorMessage.includes('Ollama')) {
          throw new Error('AI service is not available. Please ensure Ollama is installed and running. See console for details.');
        }
        
        throw new Error(errorMessage);
      }

      const analysis = await response.json();
      
      // Validate analysis has required fields
      if (!analysis || typeof analysis.score === 'undefined') {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      onAnswerSubmit(analysis);
      // Final answer is already updated via useEffect, but ensure it's set here too
      // This is safe as it's in an async handler, not during render
      
    } catch (error: any) {
      console.error('Error analyzing answer:', error);
      toast({
        title: 'Error Analyzing Answer',
        description: error.message || 'Failed to analyze answer. Please check if Ollama is running and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* AI Interviewer Side */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex flex-col items-center gap-3">
              <InterviewerAvatar isSpeaking={isSpeaking} isListening={isListening} />
              <div className="text-center">
                <div className="text-lg font-semibold">AI Interviewer</div>
                <Badge variant="secondary" className="text-xs mt-1">
                  Question {question?.questionNumber || 1} of {question?.totalQuestions || 12}
                </Badge>
              </div>
            </CardTitle>
            {isSpeaking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="h-4 w-4 animate-pulse" />
                Speaking...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {question.questionType && (
              <Badge variant="outline" className="mb-2">
                {question.questionType.charAt(0).toUpperCase() + question.questionType.slice(1)}
              </Badge>
            )}
            <p className="text-lg leading-relaxed">{question.question || 'Loading question...'}</p>
          </div>

          <Button
            variant="outline"
            onClick={() => speakQuestion(question.question)}
            disabled={isSpeaking}
            className="w-full"
          >
            {isSpeaking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speaking...
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Replay Question
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Candidate Side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Answer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Answer Time</span>
            </div>
            <span className="text-lg font-bold">{formatTime(timeElapsed)}</span>
          </div>

          {/* Microphone Control - Only show if voice mode is enabled */}
          {(inputMode === 'voice' || inputMode === 'both') && (
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={toggleListening}
                disabled={isAnalyzing}
                className={`w-24 h-24 rounded-full ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isListening ? 'Listening... Speak your answer' : 'Click to start recording'}
              </p>
            </div>
          )}

          {/* Answer Input - Type or Voice */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Your Answer</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inputMode === 'type' || inputMode === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode(inputMode === 'type' ? 'both' : 'type')}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Type
                </Button>
                <Button
                  type="button"
                  variant={inputMode === 'voice' || inputMode === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInputMode(inputMode === 'voice' ? 'both' : 'voice')}
                >
                  <Mic className="h-4 w-4 mr-1" />
                  Voice
                </Button>
              </div>
            </div>

            {/* Typed Answer Input */}
            {(inputMode === 'type' || inputMode === 'both') && (
              <Textarea
                placeholder={inputMode === 'both' 
                  ? "Type your answer here... (Voice input will be added below)" 
                  : "Type your answer here..."}
                value={typedAnswer}
                onChange={(e) => {
                  setTypedAnswer(e.target.value);
                }}
                className="min-h-[120px] resize-none"
                disabled={isAnalyzing}
              />
            )}

            {/* Voice Transcript Display */}
            {(inputMode === 'voice' || inputMode === 'both') && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Voice Transcript {inputMode === 'both' && '(will be combined with typed text)'}
                </Label>
                <div className="min-h-[100px] p-4 border rounded-lg bg-muted/50">
                  {transcript ? (
                    <p className="text-sm leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {isListening ? 'Listening...' : 'Click microphone to start voice input'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Combined Answer Preview (if both modes) */}
            {inputMode === 'both' && (typedAnswer || transcript) && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Combined Answer Preview:</Label>
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm">
                  {(typedAnswer.trim() + ' ' + transcript.trim()).trim() || 'Start typing or speaking...'}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitAnswer}
            disabled={(!transcript.trim() && !typedAnswer.trim()) || isAnalyzing || isListening}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Answer...
              </>
            ) : (
              'Submit Answer'
            )}
          </Button>

          <Alert>
            <AlertDescription className="text-xs">
              💡 Tip: You can type your answer, use voice input, or both! Click the microphone to start voice recording, or type directly in the text area. Both inputs will be combined when you submit.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

