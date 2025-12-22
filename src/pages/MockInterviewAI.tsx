/**
 * AI Mock Interview Page
 * 100% FREE - Uses Browser Speech API + Ollama
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mic, MicOff, Volume2, CheckCircle2, XCircle, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SetupScreen } from '@/components/mock-interview/SetupScreen';
import { InterviewScreen } from '@/components/mock-interview/InterviewScreen';
import { FeedbackDisplay } from '@/components/mock-interview/FeedbackDisplay';
import { FinalReport } from '@/components/mock-interview/FinalReport';

type InterviewStage = 'setup' | 'interview' | 'feedback' | 'final';

interface InterviewData {
  jobRole: string;
  companyName: string;
  jobDescription: string;
  experienceLevel: string;
  resumeData: any;
}

interface QuestionData {
  question: string;
  questionType: string;
  questionNumber: number;
  totalQuestions: number;
}

interface AnswerAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
  improved_answer: string;
  communication_tips: string[];
}

interface InterviewAnswer {
  question: string;
  answer: string;
  analysis: AnswerAnalysis;
  questionNumber: number;
}

export default function MockInterviewAI() {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<AnswerAnalysis | null>(null);
  const [allAnswers, setAllAnswers] = useState<InterviewAnswer[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);
  const { toast } = useToast();

  const handleSetupComplete = (data: InterviewData) => {
    setInterviewData(data);
    setStage('interview');
  };

  const handleQuestionReceived = (question: QuestionData) => {
    setCurrentQuestion(question);
    setCurrentAnswer('');
    setCurrentAnalysis(null);
  };

  // Load first question when interview starts
  useEffect(() => {
    if (stage === 'interview' && interviewData?.resumeData?.firstQuestion) {
      handleQuestionReceived(interviewData.resumeData.firstQuestion);
    }
  }, [stage, interviewData]);

  const handleAnswerAnalyzed = (analysis: AnswerAnalysis) => {
    setCurrentAnalysis(analysis);
    
    // Save answer with analysis
    if (currentQuestion && currentAnswer) {
      const answer: InterviewAnswer = {
        question: currentQuestion.question,
        answer: currentAnswer,
        analysis,
        questionNumber: currentQuestion.questionNumber,
      };
      setAllAnswers(prev => [...prev, answer]);
    }
    
    setStage('feedback');
  };

  const handleContinueToNext = async () => {
    if (currentQuestion && currentQuestion.questionNumber < currentQuestion.totalQuestions) {
      // Generate next question
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
        
        const formData = new FormData();
        formData.append('question_number', currentQuestion.questionNumber.toString());
        formData.append('previous_answers', JSON.stringify(allAnswers));
        formData.append('job_role', interviewData?.jobRole || '');
        formData.append('experience_level', interviewData?.experienceLevel || 'fresher');
        if (interviewData?.resumeData) {
          formData.append('resume_data', JSON.stringify(interviewData.resumeData));
        }
        if (interviewData?.jobDescription) {
          formData.append('job_description', interviewData.jobDescription);
        }
        
        const response = await fetch(`${API_BASE}/mock-interview-ai/generate-question`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const nextQuestion = await response.json();
          handleQuestionReceived(nextQuestion);
          setStage('interview');
          setCurrentAnalysis(null);
          setCurrentAnswer('');
        } else {
          throw new Error('Failed to generate next question');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to generate next question. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      // All questions done, generate final report
      handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
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
      
      const response = await fetch(`${API_BASE}/mock-interview-ai/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          all_answers: allAnswers,
          resume_data: interviewData?.resumeData,
          job_description: interviewData?.jobDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const report = await response.json();
      setFinalReport(report);
      setStage('final');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate final report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRestart = () => {
    setStage('setup');
    setInterviewData(null);
    setCurrentQuestion(null);
    setCurrentAnswer('');
    setCurrentAnalysis(null);
    setAllAnswers([]);
    setFinalReport(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Mock Interview</h1>
        <p className="text-muted-foreground">
          Practice your interview skills with our AI interviewer. 100% free, powered by open-source AI.
        </p>
      </div>

      {stage === 'setup' && (
        <SetupScreen onComplete={handleSetupComplete} />
      )}

      {stage === 'interview' && interviewData && currentQuestion && (
        <InterviewScreen
          question={currentQuestion}
          interviewData={interviewData}
          onAnswerChange={setCurrentAnswer}
          onAnswerSubmit={handleAnswerAnalyzed}
          onQuestionReceived={handleQuestionReceived}
          allAnswers={allAnswers}
        />
      )}

      {stage === 'feedback' && currentAnalysis && currentQuestion && (
        <FeedbackDisplay
          question={currentQuestion}
          answer={currentAnswer}
          analysis={currentAnalysis}
          questionNumber={currentQuestion.questionNumber}
          totalQuestions={currentQuestion.totalQuestions}
          onContinue={handleContinueToNext}
        />
      )}

      {stage === 'final' && finalReport && (
        <FinalReport
          report={finalReport}
          allAnswers={allAnswers}
          interviewData={interviewData}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

