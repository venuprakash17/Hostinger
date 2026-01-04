import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, FileQuestion, AlertCircle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Question {
  question: string;
  question_type: "mcq" | "fill_blank" | "true_false";
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  correct_answer_text?: string;
  is_true?: boolean;
  marks: number;
  timer_seconds?: number;
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  subject?: string;
  duration_minutes: number;
  total_marks: number;
  questions: Question[];
  code_snippet?: string;
  question_timers?: Record<string, number>;
  per_question_timer_enabled?: boolean;
}

interface QuizAttempt {
  id: number;
  quiz_id: number;
  started_at: string;
  submitted_at?: string;
  is_submitted: boolean;
  is_graded: boolean;
  total_score: number;
  max_score?: number;
  percentage: number;
  answers?: Array<{
    question_index: number;
    question_type: string;
    answer: any;
    points_earned?: number;
    max_points?: number;
    is_correct?: boolean;
    time_spent_seconds?: number;
  }>;
}

export default function TakeQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Timers
  const [overallTimeLeft, setOverallTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const overallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const isSubmittingRef = useRef<boolean>(false);
  const saveAnswerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
    
    // Prevent navigation away during quiz (refresh abuse prevention)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attempt && !attempt.is_submitted && !isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = 'Your quiz progress will be saved, but you may lose time if you refresh. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    // Prevent back button navigation
    const handlePopState = (e: PopStateEvent) => {
      if (attempt && !attempt.is_submitted && !isSubmittingRef.current) {
        const confirmed = window.confirm('Are you sure you want to go back? Your progress will be saved.');
        if (!confirmed) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (saveAnswerTimeoutRef.current) clearTimeout(saveAnswerTimeoutRef.current);
    };
  }, [quizId]);
  
  // Get API base URL helper
  const getAPIBase = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
      return 'http://localhost:8000/api/v1';
    }
    return envUrl || 'http://localhost:8000/api/v1';
  };

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizData = await apiClient.getQuiz(parseInt(quizId!));
      setQuiz(quizData);
      
      // Start or resume attempt
      await startAttempt(quizData.id);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quiz",
        variant: "destructive",
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };
  
  const startAttempt = async (quizId: number) => {
    try {
      const attemptData = await apiClient.startQuizAttempt(quizId);
      console.log("Attempt data received:", attemptData);
      console.log("Attempt ID:", attemptData?.id);
      console.log("Attempt type:", typeof attemptData);
      console.log("Is array?", Array.isArray(attemptData));
      
      // Handle case where API returns array instead of object
      if (Array.isArray(attemptData)) {
        console.error("Received array instead of object:", attemptData);
        toast({
          title: "Error",
          description: "Invalid response format from server. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure we have a valid attempt object with an ID
      if (!attemptData || typeof attemptData !== 'object' || !attemptData.id) {
        console.error("Invalid attempt data:", attemptData);
        toast({
          title: "Error",
          description: "Failed to start quiz attempt. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      setAttempt(attemptData);
      
      // Load existing answers
      if (attemptData.answers && Array.isArray(attemptData.answers)) {
        const answerMap: Record<number, any> = {};
        attemptData.answers.forEach((ans: any) => {
          if (ans.question_index !== undefined && ans.answer !== undefined) {
            answerMap[ans.question_index] = ans.answer;
          }
        });
        setAnswers(answerMap);
      }
      
      // Initialize question start time
      questionStartTimeRef.current = Date.now();
    } catch (error: any) {
      console.error("Error starting attempt:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start quiz",
        variant: "destructive",
      });
    }
  };
  
  const saveAnswer = useCallback(async (questionIndex?: number, answerValue?: any) => {
    const index = questionIndex !== undefined ? questionIndex : currentQuestionIndex;
    const value = answerValue !== undefined ? answerValue : answers[index];
    
    if (!attempt || !quiz || !attempt.id) {
      return;
    }
    
    // Only skip if answer is truly undefined (not set yet)
    if (value === undefined) {
      return;
    }
    
    const question = quiz.questions[index];
    if (!question) {
      return;
    }
    
    const timeSpentOnQuestion = timeSpent[index] || 0;
    const normalizedAnswer = value === null ? '' : value;
    
    const answerData = {
      question_index: index,
      question_type: question.question_type,
      answer: normalizedAnswer,
      time_spent_seconds: timeSpentOnQuestion,
    };
    
    try {
      const currentAnswers = attempt.answers || [];
      const updatedAnswers = [...currentAnswers];
      const existingIndex = updatedAnswers.findIndex(a => a.question_index === index);
      
      if (existingIndex >= 0) {
        updatedAnswers[existingIndex] = answerData;
      } else {
        updatedAnswers.push(answerData);
      }
      
      await apiClient.updateQuizAttempt(attempt.id, { answers: updatedAnswers });
      
      // Update attempt state with new answers
      setAttempt({ ...attempt, answers: updatedAnswers });
    } catch (error: any) {
      console.error("Error saving answer:", error);
      // Don't show toast for every save error to avoid spam
    }
  }, [attempt, quiz, answers, timeSpent, currentQuestionIndex]);
  
  const saveAllAnswers = useCallback(async () => {
    if (!attempt || !quiz || !attempt.id) {
      console.log('saveAllAnswers: Missing attempt or quiz', { hasAttempt: !!attempt, hasQuiz: !!quiz, attemptId: attempt?.id });
      return;
    }
    
    console.log('saveAllAnswers: Saving answers', answers);
    const answerPromises: Promise<void>[] = [];
    
    // Save all answered questions (including empty strings for fill-in-the-blank)
    Object.keys(answers).forEach((key) => {
      const index = parseInt(key);
      const value = answers[index];
      console.log(`saveAllAnswers: Question ${index}, value:`, value, 'type:', typeof value);
      // Include empty strings and null values (they're valid answers)
      if (value !== undefined) {
        answerPromises.push(saveAnswer(index, value));
      }
    });
    
    console.log(`saveAllAnswers: Saving ${answerPromises.length} answers`);
    // Wait for all saves to complete (with timeout)
    const results = await Promise.allSettled(answerPromises);
    console.log('saveAllAnswers: All saves completed', results);
  }, [attempt, quiz, answers, saveAnswer]);
  
  const submitQuiz = async (autoSubmit = false) => {
    if (!attempt || isSubmittingRef.current) {
      console.log('Submit blocked - attempt:', !!attempt, 'isSubmitting:', isSubmittingRef.current);
      return;
    }
    
    isSubmittingRef.current = true;
    
    try {
      setSubmitting(true);
      console.log('Starting quiz submission for attempt:', attempt.id);
      
      // Save all answers before submitting
      console.log('Saving all answers before submission...');
      await saveAllAnswers();
      
      // Small delay to ensure saves complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Submitting quiz attempt:', attempt.id);
      const submittedAttempt = await apiClient.submitQuiz(attempt.id);
      console.log('Quiz submitted successfully:', submittedAttempt);
      setAttempt(submittedAttempt);
      setShowResults(true);
      
      // Clear timers
      if (overallTimerRef.current) {
        clearInterval(overallTimerRef.current);
        overallTimerRef.current = null;
      }
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      if (saveAnswerTimeoutRef.current) {
        clearTimeout(saveAnswerTimeoutRef.current);
        saveAnswerTimeoutRef.current = null;
      }
      
      if (autoSubmit) {
        toast({
          title: "Time's Up!",
          description: "Your quiz has been automatically submitted.",
        });
      } else {
        toast({
          title: "Success",
          description: "Quiz submitted successfully!",
        });
      }
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: error.message || error.detail || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
      isSubmittingRef.current = false;
    }
  };
  
  const handleAutoSubmit = useCallback(async () => {
    if (!attempt || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    
    // Clear timers
    if (overallTimerRef.current) {
      clearInterval(overallTimerRef.current);
      overallTimerRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    
    // Save all answers before auto-submitting
    await saveAllAnswers();
    
    // Small delay to ensure saves complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await submitQuiz(true);
    isSubmittingRef.current = false;
  }, [attempt, saveAllAnswers, submitQuiz]);
  
  const handleNextQuestion = useCallback(() => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      saveAnswer().then(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        questionStartTimeRef.current = Date.now();
        
        if (questionTimerRef.current) {
          clearInterval(questionTimerRef.current);
          questionTimerRef.current = null;
        }
        setQuestionTimeLeft(null);
      });
    }
  }, [quiz, currentQuestionIndex, saveAnswer]);
  
  // Start timers when attempt and quiz are loaded
  useEffect(() => {
    if (!attempt || !quiz || attempt.is_submitted || !attempt.id) {
      return;
    }
    
    // Clear any existing timers
    if (overallTimerRef.current) {
      clearInterval(overallTimerRef.current);
      overallTimerRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    
    // Start overall timer if quiz has duration - with server sync
    if (quiz.duration_minutes > 0 && attempt.id) {
      // Fetch server-validated remaining time
      const fetchRemainingTime = async () => {
        try {
            const API_BASE = getAPIBase();
            const response = await fetch(
              `${API_BASE}/global-content/quiz-attempts/${attempt.id}/remaining-time`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
              }
            );
          if (response.ok) {
            const data = await response.json();
            if (data.is_expired) {
              handleAutoSubmit();
              return;
            }
            if (data.remaining_time_seconds !== null && data.remaining_time_seconds !== undefined) {
              setOverallTimeLeft(data.remaining_time_seconds);
            }
          }
        } catch (error) {
          console.error("Error fetching remaining time:", error);
          // Fallback to client-side calculation
          if (attempt.started_at) {
            const startTime = new Date(attempt.started_at).getTime();
            const durationMs = quiz.duration_minutes * 60 * 1000;
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, durationMs - elapsed);
            setOverallTimeLeft(Math.floor(remaining / 1000));
          } else {
            setOverallTimeLeft(quiz.duration_minutes * 60);
          }
        }
      };
      
      // Initial fetch
      fetchRemainingTime();
      
      // Sync with server every 30 seconds
      const syncInterval = setInterval(fetchRemainingTime, 30000);
      
      // Start client-side countdown
      overallTimerRef.current = setInterval(() => {
        setOverallTimeLeft((prev) => {
          if (prev === null || prev === undefined || isNaN(prev) || prev <= 0) {
            if (overallTimerRef.current) {
              clearInterval(overallTimerRef.current);
              overallTimerRef.current = null;
            }
            clearInterval(syncInterval);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Cleanup sync interval
      return () => {
        clearInterval(syncInterval);
      };
    }
    
    // Start per-question timer if enabled (check question_timers or timer_seconds in question)
    const startQuestionTimer = () => {
      if (!quiz.questions[currentQuestionIndex]) {
        return;
      }
      
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      
      const question = quiz.questions[currentQuestionIndex];
      // Check for timer_seconds in question object or question_timers object
      const timerSeconds = question.timer_seconds || 
                          (quiz.question_timers && quiz.question_timers[currentQuestionIndex.toString()]) ||
                          (quiz.question_timers && quiz.question_timers[currentQuestionIndex]) ||
                          null;
      
      // Only start timer if we have a valid timer value
      if (timerSeconds && timerSeconds > 0) {
        setQuestionTimeLeft(timerSeconds);
        questionStartTimeRef.current = Date.now();
        
        questionTimerRef.current = setInterval(() => {
          setQuestionTimeLeft((prev) => {
            if (prev === null || prev === undefined || isNaN(prev) || prev <= 0) {
              if (questionTimerRef.current) {
                clearInterval(questionTimerRef.current);
                questionTimerRef.current = null;
              }
              handleNextQuestion();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // No timer for this question, ensure it's null
        setQuestionTimeLeft(null);
      }
    };
    
    startQuestionTimer();
    
    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (saveAnswerTimeoutRef.current) clearTimeout(saveAnswerTimeoutRef.current);
    };
  }, [attempt, quiz, currentQuestionIndex, handleAutoSubmit, handleNextQuestion]);
  
  const handleAnswerChange = useCallback((value: any) => {
    // Normalize True/False answers - handle both boolean and string
    let normalizedValue = value;
    const currentQ = quiz?.questions[currentQuestionIndex];
    if (currentQ?.question_type === 'true_false') {
      if (typeof value === 'string') {
        normalizedValue = value.toLowerCase() === 'true' || value === 'True';
      } else if (value === 'True' || value === 'False') {
        normalizedValue = value === 'True';
      }
      // value is already boolean, keep as-is
    }
    
    // Update answers state immediately
    setAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers, [currentQuestionIndex]: normalizedValue };
      return newAnswers;
    });
    
    // Track time spent on question
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    setTimeSpent((prevTimeSpent) => ({ ...prevTimeSpent, [currentQuestionIndex]: elapsed }));
    
    // Clear any existing save timeout
    if (saveAnswerTimeoutRef.current) {
      clearTimeout(saveAnswerTimeoutRef.current);
      saveAnswerTimeoutRef.current = null;
    }
    
    // Save answer after a short delay (debounced)
    saveAnswerTimeoutRef.current = setTimeout(() => {
      saveAnswer(currentQuestionIndex, normalizedValue);
      saveAnswerTimeoutRef.current = null;
    }, 1500);
  }, [currentQuestionIndex, saveAnswer, quiz]);
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      saveAnswer().then(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        questionStartTimeRef.current = Date.now();
        
        if (questionTimerRef.current) {
          clearInterval(questionTimerRef.current);
          questionTimerRef.current = null;
        }
        setQuestionTimeLeft(null);
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return "0:00";
    }
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleGoBack = () => {
    if (attempt && !attempt.is_submitted && !isSubmittingRef.current) {
      const confirmed = window.confirm("Are you sure you want to leave? Your progress will be saved, but you won't be able to resume the quiz.");
      if (confirmed) {
        saveAllAnswers();
        navigate('/tests');
      }
    } else {
      navigate('/tests');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!quiz || !attempt) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground">Quiz not found</p>
            <Button onClick={() => navigate('/tests')} className="mt-4">
              Go Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (showResults && attempt.is_submitted) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{attempt.total_score.toFixed(1)} / {attempt.max_score || quiz.total_marks}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">{attempt.percentage.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">{quiz.questions.length}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Review</h3>
              {quiz.questions.map((question, index) => {
                const answer = attempt.answers?.find(a => a.question_index === index);
                const isCorrect = answer?.is_correct;
                
                return (
                  <Card key={index} className={isCorrect ? "border-green-500" : "border-red-500"}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {answer?.points_earned || 0} / {answer?.max_points || question.marks} marks
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="font-medium">{question.question}</p>
                      
                      {question.question_type === 'mcq' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Your answer:</span> {answer?.answer || 'Not answered'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Correct answer:</span> {question.correct_answer || 'N/A'}
                          </p>
                        </div>
                      )}
                      
                      {question.question_type === 'true_false' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Your answer:</span> {answer?.answer !== undefined ? (answer.answer ? 'True' : 'False') : 'Not answered'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Correct answer:</span> {question.is_true ? 'True' : 'False'}
                          </p>
                        </div>
                      )}
                      
                      {question.question_type === 'fill_blank' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Your answer:</span> {answer?.answer || 'Not answered'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Correct answer:</span> {question.correct_answer_text || 'N/A'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <Button onClick={() => navigate('/tests')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  // Store currentQuestion in a ref for use in callbacks
  const currentQuestionRef = useRef(currentQuestion);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);
  
  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground">Question not found</p>
            <Button onClick={handleGoBack} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Debug logging
  console.log('=== QUIZ DEBUG ===');
  console.log('Current Question:', currentQuestion);
  console.log('Question Type:', currentQuestion.question_type);
  console.log('Question Type (string):', String(currentQuestion.question_type));
  console.log('Is Fill Blank (===)?', currentQuestion.question_type === 'fill_blank');
  console.log('Is Fill Blank (==)?', currentQuestion.question_type == 'fill_blank');
  console.log('Has option_a?', !!currentQuestion.option_a);
  console.log('Has correct_answer_text?', !!currentQuestion.correct_answer_text);
  console.log('==================');
  
  const answeredCount = Object.keys(answers).filter(key => answers[parseInt(key)] !== undefined && answers[parseInt(key)] !== null && answers[parseInt(key)] !== '').length;
  const progress = (answeredCount / quiz.questions.length) * 100;
  
  // Debug logging
  console.log('Current Question:', currentQuestion);
  console.log('Question Type:', currentQuestion?.question_type);
  console.log('Is Fill Blank?', currentQuestion?.question_type === 'fill_blank');
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              {quiz.subject && <p className="text-muted-foreground">{quiz.subject}</p>}
            </div>
          </div>
          
          {/* Timers */}
          <div className="flex items-center gap-4">
            {quiz.duration_minutes > 0 && overallTimeLeft !== null && overallTimeLeft >= 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                overallTimeLeft < 60 ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'
              }`}>
                <Clock className={`h-4 w-4 ${overallTimeLeft < 60 ? 'text-red-600' : 'text-primary'}`} />
                <span className={`font-mono font-semibold ${overallTimeLeft < 60 ? 'text-red-600' : 'text-primary'}`}>
                  {formatTime(overallTimeLeft)}
                </span>
              </div>
            )}
            {questionTimeLeft !== null && questionTimeLeft >= 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Timer className="h-4 w-4 text-orange-600" />
                <span className="font-mono font-semibold text-orange-600">
                  {formatTime(questionTimeLeft)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress */}
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {answeredCount} of {quiz.questions.length} questions answered
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((_, index) => {
                  const hasAnswer = answers[index] !== undefined && answers[index] !== null && answers[index] !== '';
                  return (
                    <button
                      key={index}
                      onClick={async () => {
                        await saveAnswer();
                        setCurrentQuestionIndex(index);
                        questionStartTimeRef.current = Date.now();
                        
                        if (questionTimerRef.current) {
                          clearInterval(questionTimerRef.current);
                          questionTimerRef.current = null;
                        }
                        setQuestionTimeLeft(null);
                      }}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                        index === currentQuestionIndex
                          ? 'border-primary bg-primary text-primary-foreground'
                          : hasAnswer
                          ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Question Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </CardTitle>
                <Badge variant="outline">{currentQuestion.marks} marks</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Code Snippet */}
              {quiz.code_snippet && currentQuestionIndex === 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{quiz.code_snippet}</pre>
                </div>
              )}
              
              {/* Question Text */}
              <div className="mb-6">
                <p className="text-lg font-medium">{currentQuestion.question}</p>
              </div>
              
              {/* FILL IN THE BLANK INPUT - Detect fill-in-the-blank by checking if MCQ has no options OR if type is fill_blank */}
              {((currentQuestion.question_type === 'mcq' && !currentQuestion.option_a && !currentQuestion.option_b && !currentQuestion.option_c && !currentQuestion.option_d) || 
                (currentQuestion.question_type !== 'mcq' && currentQuestion.question_type !== 'true_false')) && (
                <div 
                  style={{ 
                    width: '100%', 
                    marginTop: '24px', 
                    marginBottom: '24px', 
                    padding: '32px', 
                    backgroundColor: '#dbeafe', 
                    border: '4px solid #2563eb', 
                    borderRadius: '8px',
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1,
                    position: 'relative',
                    zIndex: 1000
                  }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px' }}>
                      Enter Your Answer
                    </h3>
                    <p style={{ fontSize: '16px', color: '#1e40af' }}>
                      Type your answer in the text box below:
                    </p>
                  </div>
                  <input
                    type="text"
                    value={answers[currentQuestionIndex] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Fill-in-the-blank input changed:', value);
                      setAnswers(prev => ({ ...prev, [currentQuestionIndex]: value }));
                      const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
                      setTimeSpent(prev => ({ ...prev, [currentQuestionIndex]: elapsed }));
                      if (saveAnswerTimeoutRef.current) {
                        clearTimeout(saveAnswerTimeoutRef.current);
                      }
                      saveAnswerTimeoutRef.current = setTimeout(() => {
                        if (attempt?.id && quiz) {
                          saveAnswer(currentQuestionIndex, value).catch(console.error);
                        }
                        saveAnswerTimeoutRef.current = null;
                      }, 1500);
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '4px solid #2563eb';
                      e.target.style.boxShadow = 'none';
                      const answer = answers[currentQuestionIndex];
                      if (answer !== undefined && attempt?.id && quiz) {
                        if (saveAnswerTimeoutRef.current) {
                          clearTimeout(saveAnswerTimeoutRef.current);
                          saveAnswerTimeoutRef.current = null;
                        }
                        saveAnswer(currentQuestionIndex, answer).catch(console.error);
                      }
                    }}
                    placeholder="Type your answer here..."
                    autoFocus
                    autoComplete="off"
                    disabled={submitting || (attempt?.is_submitted ?? false)}
                    style={{
                      width: '100%',
                      height: '70px',
                      fontSize: '24px',
                      padding: '15px 20px',
                      border: '4px solid #2563eb',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      fontWeight: '500',
                      outline: 'none',
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      zIndex: 1001,
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '4px solid #1d4ed8';
                      e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.2)';
                    }}
                  />
                  {answers[currentQuestionIndex] && answers[currentQuestionIndex] !== '' && (
                    <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#bbf7d0', border: '2px solid #16a34a', borderRadius: '8px' }}>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#14532d' }}>
                        ✓ Answer saved: <span style={{ fontWeight: 'bold' }}>{answers[currentQuestionIndex]}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Answer Options Based on Question Type */}
              <div className="mt-6">
                {/* MCQ */}
                {currentQuestion.question_type === 'mcq' && (
                  <RadioGroup
                    value={answers[currentQuestionIndex] || ''}
                    onValueChange={handleAnswerChange}
                  >
                    {currentQuestion.option_a && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                        <RadioGroupItem value="A" id="option-a" />
                        <Label htmlFor="option-a" className="flex-1 cursor-pointer">
                          A. {currentQuestion.option_a}
                        </Label>
                      </div>
                    )}
                    {currentQuestion.option_b && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                        <RadioGroupItem value="B" id="option-b" />
                        <Label htmlFor="option-b" className="flex-1 cursor-pointer">
                          B. {currentQuestion.option_b}
                        </Label>
                      </div>
                    )}
                    {currentQuestion.option_c && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                        <RadioGroupItem value="C" id="option-c" />
                        <Label htmlFor="option-c" className="flex-1 cursor-pointer">
                          C. {currentQuestion.option_c}
                        </Label>
                      </div>
                    )}
                    {currentQuestion.option_d && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                        <RadioGroupItem value="D" id="option-d" />
                        <Label htmlFor="option-d" className="flex-1 cursor-pointer">
                          D. {currentQuestion.option_d}
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                )}
                
                {/* True/False */}
                {currentQuestion.question_type === 'true_false' && (
                  <RadioGroup
                    value={
                      answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null
                        ? String(answers[currentQuestionIndex]).toLowerCase()
                        : ''
                    }
                    onValueChange={(value) => {
                      // Convert string to boolean for True/False
                      const boolValue = value === 'true';
                      handleAnswerChange(boolValue);
                    }}
                  >
                    <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value="true" id="true-option" />
                      <Label htmlFor="true-option" className="flex-1 cursor-pointer text-lg font-medium">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value="false" id="false-option" />
                      <Label htmlFor="false-option" className="flex-1 cursor-pointer text-lg font-medium">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                )}
                
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button onClick={handleNextQuestion}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={() => setShowSubmitDialog(true)} variant="default">
                    Submit Quiz
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your quiz? You won't be able to change your answers after submission.
              <br />
              <br />
              Answered: {answeredCount} / {quiz.questions.length} questions
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitQuiz(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
