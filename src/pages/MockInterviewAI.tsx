/**
 * AI Mock Interview Page
 * 100% FREE - Uses Browser Speech API + Ollama
 */

import { useState, useEffect, useCallback } from 'react';
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
import { InterviewWelcome } from '@/components/mock-interview/InterviewWelcome';
import { QuestionsPreview } from '@/components/mock-interview/QuestionsPreview';
import { InterviewScreen } from '@/components/mock-interview/InterviewScreen';
import { FeedbackDisplay } from '@/components/mock-interview/FeedbackDisplay';
import { FinalReport } from '@/components/mock-interview/FinalReport';

type InterviewStage = 'setup' | 'welcome' | 'preview' | 'interview' | 'feedback' | 'final';

interface InterviewData {
  jobRole: string;
  companyName: string;
  jobDescription: string;
  experienceLevel: string;
  interviewRound: string;
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
  best_answer: string; // Ideal answer for this question
  communication_tips: string[];
}

interface InterviewAnswer {
  question: string;
  answer: string;
  analysis: AnswerAnalysis;
  questionNumber: number;
  attemptNumber?: number;
}

export default function MockInterviewAI() {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuestionData[]>([]); // Store all questions
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<AnswerAnalysis | null>(null);
  const [allAnswers, setAllAnswers] = useState<InterviewAnswer[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<Map<number, number>>(new Map()); // Track attempts per question
  const [previousScores, setPreviousScores] = useState<Map<number, number>>(new Map()); // Track previous scores
  const [finalReport, setFinalReport] = useState<any>(null);
  const { toast } = useToast();

  // Memoize callbacks to prevent unnecessary re-renders
  const handleAnswerChange = useCallback((answer: string) => {
    setCurrentAnswer(answer);
  }, []);

  const handleSetupComplete = (data: InterviewData) => {
    setInterviewData(data);
    
    // Extract all questions from the response
    if (data.resumeData?.firstQuestion?.all_questions) {
      const questions = data.resumeData.firstQuestion.all_questions.map((q: any) => ({
        question: q.question,
        questionType: q.type || q.category || 'general',
        questionNumber: q.question_number,
        totalQuestions: q.total_questions,
      }));
      setAllQuestions(questions);
    } else if (data.resumeData?.firstQuestion) {
      // Fallback if structure is different
      const firstQ = data.resumeData.firstQuestion;
      setCurrentQuestion({
        question: firstQ.question,
        questionType: firstQ.question_type || 'general',
        questionNumber: firstQ.question_number || 1,
        totalQuestions: firstQ.total_questions || 12,
      });
    }
    
    // Show welcome screen first
    setStage('welcome');
  };

  const handleStartInterview = () => {
    // Show questions preview first if questions are available
    if (allQuestions.length > 0) {
      setStage('preview');
    } else {
      // If no questions loaded, try to load first question and go directly to interview
      // This handles edge case where questions might not be in expected format
      if (interviewData?.resumeData?.firstQuestion) {
        const firstQ = interviewData.resumeData.firstQuestion;
        setCurrentQuestion({
          question: firstQ.question || firstQ.question_text,
          questionType: firstQ.question_type || firstQ.type || 'general',
          questionNumber: firstQ.question_number || 1,
          totalQuestions: firstQ.total_questions || 12,
        });
      }
      setStage('interview');
    }
  };

  const handleStartFromPreview = () => {
    // Load first question and start interview
    if (allQuestions.length > 0) {
      setCurrentQuestion(allQuestions[0]);
    }
    setStage('interview');
  };

  const handleBackToWelcome = () => {
    setStage('welcome');
  };

  const handleQuestionReceived = useCallback((question: QuestionData) => {
    setCurrentQuestion(question);
    setCurrentAnswer('');
    setCurrentAnalysis(null);
  }, []);

  // Load first question when interview starts (if not already loaded)
  useEffect(() => {
    if (stage === 'interview' && !currentQuestion && allQuestions.length > 0) {
      setCurrentQuestion(allQuestions[0]);
    }
  }, [stage, allQuestions]);

  const handleAnswerAnalyzed = (analysis: AnswerAnalysis) => {
    setCurrentAnalysis(analysis);
    
    // Track attempts and previous scores
    if (currentQuestion) {
      const questionNum = currentQuestion.questionNumber;
      const currentAttempts = questionAttempts.get(questionNum) || 0;
      setQuestionAttempts(prev => new Map(prev).set(questionNum, currentAttempts + 1));
      
      // Store previous score if this is a retry
      if (currentAttempts > 0) {
        const prevScore = previousScores.get(questionNum);
        if (prevScore !== undefined) {
          setPreviousScores(prev => new Map(prev).set(questionNum, prevScore));
        }
      } else {
        // First attempt - store current score as previous for future retries
        setPreviousScores(prev => new Map(prev).set(questionNum, analysis.score));
      }
      
      // Save answer with analysis (replace if retry)
      if (currentAnswer) {
        const answer: InterviewAnswer = {
          question: currentQuestion.question,
          answer: currentAnswer,
          analysis,
          questionNumber: questionNum,
          attemptNumber: currentAttempts + 1,
        };
        
        // If retry, replace the previous answer for this question
        setAllAnswers(prev => {
          const filtered = prev.filter(a => a.questionNumber !== questionNum);
          return [...filtered, answer];
        });
      }
    }
    
    setStage('feedback');
  };

  const handleRetryQuestion = () => {
    // Go back to interview screen with same question
    setCurrentAnswer('');
    setCurrentAnalysis(null);
    setStage('interview');
    
    toast({
      title: 'Retry Question',
      description: 'Take your time and give your best answer!',
    });
  };

  const handleContinueToNext = async () => {
    if (!currentQuestion) return;
    
    const nextQuestionNumber = currentQuestion.questionNumber + 1;
    
    // Use pre-loaded questions if available
    if (allQuestions.length > 0 && nextQuestionNumber <= allQuestions.length) {
      const nextQuestion = allQuestions[nextQuestionNumber - 1];
      handleQuestionReceived(nextQuestion);
      setStage('interview');
      setCurrentAnalysis(null);
      setCurrentAnswer('');
      return;
    }
    
    // Fallback: Generate next question if not pre-loaded
    if (nextQuestionNumber <= (currentQuestion.totalQuestions || 12)) {
      try {
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
        formData.append('question_number', (nextQuestionNumber - 1).toString());
        formData.append('previous_answers', JSON.stringify(allAnswers));
        formData.append('job_role', interviewData?.jobRole || '');
        formData.append('experience_level', interviewData?.experienceLevel || 'fresher');
        formData.append('interview_round', interviewData?.interviewRound || 'technical');
        if (interviewData?.companyName) {
          formData.append('company_name', interviewData.companyName);
        }
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
    setQuestionAttempts(new Map());
    setPreviousScores(new Map());
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

      {stage === 'welcome' && interviewData && (
        <InterviewWelcome
          companyName={interviewData.companyName || 'General'}
          jobRole={interviewData.jobRole}
          experienceLevel={interviewData.experienceLevel}
          interviewRound={interviewData.interviewRound || 'technical'}
          totalQuestions={allQuestions.length > 0 ? allQuestions[0].totalQuestions : 12}
          onStart={handleStartInterview}
        />
      )}

      {stage === 'preview' && interviewData && allQuestions.length > 0 && (
        <QuestionsPreview
          questions={allQuestions.map((q: any) => ({
            question: q.question,
            questionType: q.questionType || q.type,
            questionNumber: q.questionNumber || q.question_number,
            totalQuestions: q.totalQuestions || q.total_questions,
            category: q.category,
            round: q.round || interviewData.interviewRound,
          }))}
          companyName={interviewData.companyName || 'General'}
          jobRole={interviewData.jobRole}
          experienceLevel={interviewData.experienceLevel}
          interviewRound={interviewData.interviewRound || 'technical'}
          onStart={handleStartFromPreview}
          onBack={handleBackToWelcome}
        />
      )}

      {stage === 'interview' && interviewData && currentQuestion && currentQuestion.question && (
        <InterviewScreen
          question={currentQuestion}
          interviewData={interviewData}
          onAnswerChange={handleAnswerChange}
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
          attemptNumber={questionAttempts.get(currentQuestion.questionNumber) || 1}
          previousScore={previousScores.get(currentQuestion.questionNumber)}
          onContinue={handleContinueToNext}
          onRetry={handleRetryQuestion}
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

