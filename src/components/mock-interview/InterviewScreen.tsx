/**
 * Interview Screen - Main interview interface with voice
 * Features: AI voice questions, microphone input, live transcript
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mic, MicOff, Volume2, VolumeX, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
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

        setTranscript(prev => {
          const newTranscript = prev + finalTranscript;
          onAnswerChange(newTranscript);
          return newTranscript;
        });
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
  }, []);

  // Speak question using browser TTS
  useEffect(() => {
    if (question && question.question) {
      speakQuestion(question.question);
    }
  }, [question]);

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

  const speakQuestion = (text: string) => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
    if (!transcript.trim()) {
      toast({
        title: 'No Answer',
        description: 'Please provide an answer before submitting.',
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
          answer: transcript,
          question_number: question.questionNumber,
          resume_data: interviewData?.resumeData,
          job_description: interviewData?.jobDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze answer');

      const analysis = await response.json();
      onAnswerSubmit(analysis);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze answer. Please try again.',
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
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl ${
                  isSpeaking ? 'animate-pulse' : ''
                }`}>
                  🤖
                </div>
                {isSpeaking && (
                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                )}
              </div>
              <div>
                <div>AI Interviewer</div>
                <Badge variant="secondary" className="text-xs">
                  Question {question.questionNumber} of {question.totalQuestions}
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
            <Badge variant="outline" className="mb-2">
              {question.questionType.charAt(0).toUpperCase() + question.questionType.slice(1)}
            </Badge>
            <p className="text-lg leading-relaxed">{question.question}</p>
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

          {/* Microphone Control */}
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

          {/* Live Transcript */}
          <div className="space-y-2">
            <Label>Your Answer (Live Transcript)</Label>
            <div className="min-h-[120px] p-4 border rounded-lg bg-muted/50">
              {transcript ? (
                <p className="text-sm leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isListening ? 'Listening...' : 'Your answer will appear here as you speak'}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitAnswer}
            disabled={!transcript.trim() || isAnalyzing || isListening}
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
              💡 Tip: Click the microphone, speak your answer clearly, then click it again to stop. Review your transcript before submitting.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

