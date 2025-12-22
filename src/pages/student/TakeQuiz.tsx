import { useState, useEffect, useRef } from "react";
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
  per_question_timer_enabled: boolean;
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
  
  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);
  
  useEffect(() => {
    if (attempt && quiz && !attempt.is_submitted) {
      // Load existing answers
      if (attempt.answers) {
        const answerMap: Record<number, any> = {};
        attempt.answers.forEach((ans) => {
          answerMap[ans.question_index] = ans.answer;
        });
        setAnswers(answerMap);
      }
      
      // Start overall timer if quiz has duration
      if (quiz.duration_minutes > 0) {
        const startTime = new Date(attempt.started_at).getTime();
        const durationMs = quiz.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, durationMs - elapsed);
        setOverallTimeLeft(Math.floor(remaining / 1000));
        
        overallTimerRef.current = setInterval(() => {
          setOverallTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              handleAutoSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      
      // Start per-question timer if enabled
      if (quiz.per_question_timer_enabled && quiz.questions[currentQuestionIndex]) {
        const question = quiz.questions[currentQuestionIndex];
        const timerSeconds = question.timer_seconds || 
                            (quiz.question_timers && quiz.question_timers[currentQuestionIndex.toString()]) ||
                            null;
        if (timerSeconds) {
          setQuestionTimeLeft(timerSeconds);
          questionStartTimeRef.current = Date.now();
          
          questionTimerRef.current = setInterval(() => {
            setQuestionTimeLeft((prev) => {
              if (prev === null || prev <= 1) {
                // Auto-advance to next question
                handleNextQuestion();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    }
    
    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [attempt, quiz, currentQuestionIndex]);
  
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
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };
  
  const startAttempt = async (quizId: number) => {
    try {
      const attemptData = await apiClient.startQuizAttempt(quizId);
      setAttempt(attemptData);
    } catch (error: any) {
      console.error("Error starting attempt:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start quiz",
        variant: "destructive",
      });
    }
  };
  
  const handleAnswerChange = (value: any) => {
    setAnswers({ ...answers, [currentQuestionIndex]: value });
    
    // Track time spent on question
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    setTimeSpent({ ...timeSpent, [currentQuestionIndex]: elapsed });
  };
  
  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      // Save current answer
      saveAnswer();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      questionStartTimeRef.current = Date.now();
      
      // Reset question timer
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      setQuestionTimeLeft(null);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      saveAnswer();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      questionStartTimeRef.current = Date.now();
      
      // Reset question timer
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      setQuestionTimeLeft(null);
    }
  };
  
  const saveAnswer = async () => {
    if (!attempt || !quiz) return;
    
    const answer = answers[currentQuestionIndex];
    if (answer === undefined) return;
    
    const question = quiz.questions[currentQuestionIndex];
    const timeSpentOnQuestion = timeSpent[currentQuestionIndex] || 0;
    
    const answerData = {
      question_index: currentQuestionIndex,
      question_type: question.question_type,
      answer: answer,
      time_spent_seconds: timeSpentOnQuestion,
    };
    
    try {
      const currentAnswers = attempt.answers || [];
      const updatedAnswers = [...currentAnswers];
      const existingIndex = updatedAnswers.findIndex(a => a.question_index === currentQuestionIndex);
      
      if (existingIndex >= 0) {
        updatedAnswers[existingIndex] = answerData;
      } else {
        updatedAnswers.push(answerData);
      }
      
      await apiClient.updateQuizAttempt(attempt.id, { answers: updatedAnswers });
    } catch (error: any) {
      console.error("Error saving answer:", error);
    }
  };
  
  const handleAutoSubmit = async () => {
    if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    await saveAnswer();
    await submitQuiz(true);
  };
  
  const submitQuiz = async (autoSubmit = false) => {
    if (!attempt) return;
    
    try {
      setSubmitting(true);
      await saveAnswer();
      
      const submittedAttempt = await apiClient.submitQuiz(attempt.id);
      setAttempt(submittedAttempt);
      setShowResults(true);
      
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
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
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
                          <p className="text-sm text-muted-foreground">Your answer: {answer?.answer || 'Not answered'}</p>
                          <p className="text-sm text-muted-foreground">Correct answer: {question.correct_answer}</p>
                        </div>
                      )}
                      
                      {question.question_type === 'true_false' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Your answer: {answer?.answer ? 'True' : 'False'}</p>
                          <p className="text-sm text-muted-foreground">Correct answer: {question.is_true ? 'True' : 'False'}</p>
                        </div>
                      )}
                      
                      {question.question_type === 'fill_blank' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Your answer: {answer?.answer || 'Not answered'}</p>
                          <p className="text-sm text-muted-foreground">Correct answer: {question.correct_answer_text}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <Button onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quiz.questions.length) * 100;
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              {quiz.subject && <p className="text-muted-foreground">{quiz.subject}</p>}
            </div>
          </div>
          
          {/* Timers */}
          <div className="flex items-center gap-4">
            {overallTimeLeft !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono font-semibold text-primary">
                  {formatTime(overallTimeLeft)}
                </span>
              </div>
            )}
            {questionTimeLeft !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-lg">
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
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      saveAnswer();
                      setCurrentQuestionIndex(index);
                      questionStartTimeRef.current = Date.now();
                    }}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                      index === currentQuestionIndex
                        ? 'border-primary bg-primary text-primary-foreground'
                        : answers[index] !== undefined
                        ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
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
              
              {/* Question */}
              <div>
                <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
                
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
                    value={answers[currentQuestionIndex]?.toString() || ''}
                    onValueChange={(value) => handleAnswerChange(value === 'true')}
                  >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                    </div>
                  </RadioGroup>
                )}
                
                {/* Fill in the Blank */}
                {currentQuestion.question_type === 'fill_blank' && (
                  <Input
                    value={answers[currentQuestionIndex] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer"
                    className="max-w-md"
                  />
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

