import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion, Code2, MessageSquare, Briefcase, CheckCircle2, XCircle, Lightbulb, AlertCircle, Clock, Zap, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Round {
  id: number;
  practice_section_id: number;
  round_type: 'quiz' | 'coding' | 'gd' | 'interview';
  round_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  quiz_id?: number;
  coding_problem_id?: number;
  contents?: RoundContent[];
}

interface RoundContent {
  id: number;
  round_id: number;
  gd_topic?: string;
  gd_description?: string;
  key_points?: string[];
  best_points?: string[];
  dos_and_donts?: { dos?: string[]; donts?: string[] };
  question?: string;
  expected_answer?: string;
  question_type?: string;
  tips?: string[];
  quiz_question?: string;
  quiz_options?: string[];
  correct_answer?: string;
  // Advanced Quiz features
  quiz_question_type?: 'mcq' | 'fill_blank' | 'true_false';
  quiz_timer_seconds?: number;
  quiz_marks?: number;
  quiz_option_a?: string;
  quiz_option_b?: string;
  quiz_option_c?: string;
  quiz_option_d?: string;
  quiz_correct_answer_text?: string;
  quiz_is_true?: boolean;
  coding_title?: string;
  coding_description?: string;
  coding_difficulty?: string;
  coding_input_format?: string;
  coding_output_format?: string;
  coding_constraints?: string;
  coding_sample_input?: string;
  coding_sample_output?: string;
  coding_time_limit?: number;
  coding_memory_limit?: number;
  // Advanced Coding exam features
  coding_exam_timer_enabled?: boolean;
  coding_exam_duration_minutes?: number;
  coding_test_cases?: Array<{
    stdin: string;
    expected_output: string;
    is_public?: boolean;
  }>;
  coding_starter_code_python?: string;
  coding_starter_code_c?: string;
  coding_starter_code_cpp?: string;
  coding_starter_code_java?: string;
  coding_starter_code_javascript?: string;
  order_index: number;
  is_active: boolean;
}

export default function CompanyTrainingRound() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const [round, setRound] = useState<Round | null>(null);
  const [contents, setContents] = useState<RoundContent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Quiz state
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, any>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const quizTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<number, { correct: boolean; points: number }>>({});
  
  // Advanced Coding exam state
  const [codingExamMode, setCodingExamMode] = useState(false);
  const [codingExamTimeLeft, setCodingExamTimeLeft] = useState<number | null>(null);
  const codingExamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [codingExamStartTime, setCodingExamStartTime] = useState<number | null>(null);
  
  const startCodingExam = (content: RoundContent) => {
    if (!content.coding_exam_timer_enabled || !content.coding_exam_duration_minutes) {
      // No exam mode, just navigate to coding
      navigateToCoding(content);
      return;
    }
    
    setCodingExamMode(true);
    setCodingExamStartTime(Date.now());
    const durationSeconds = content.coding_exam_duration_minutes * 60;
    setCodingExamTimeLeft(durationSeconds);
    
    codingExamTimerRef.current = setInterval(() => {
      setCodingExamTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleCodingExamAutoSubmit(content);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleCodingExamAutoSubmit = (content: RoundContent) => {
    if (codingExamTimerRef.current) clearInterval(codingExamTimerRef.current);
    toast({
      title: "Exam Time Up",
      description: "Your coding exam has been auto-submitted due to time limit.",
      variant: "destructive",
    });
    // Still navigate to coding but with exam context
    navigateToCoding(content, true);
  };
  
  const exitCodingExam = () => {
    if (codingExamTimerRef.current) clearInterval(codingExamTimerRef.current);
    setCodingExamMode(false);
    setCodingExamTimeLeft(null);
    setCodingExamStartTime(null);
  };
  
  const navigateToCoding = (content: RoundContent, examMode = false) => {
    const problemData = {
      id: content.id,
      title: content.coding_title || 'Coding Problem',
      description: content.coding_description || '',
      input_format: content.coding_input_format,
      output_format: content.coding_output_format,
      constraints: content.coding_constraints,
      sample_input: content.coding_sample_input,
      sample_output: content.coding_sample_output,
      difficulty: content.coding_difficulty || 'Medium',
      test_cases: content.coding_test_cases || [],
      starter_code_python: content.coding_starter_code_python,
      starter_code_c: content.coding_starter_code_c,
      starter_code_cpp: content.coding_starter_code_cpp,
      starter_code_java: content.coding_starter_code_java,
      starter_code_javascript: content.coding_starter_code_javascript,
      time_limit: content.coding_time_limit,
      memory_limit: content.coding_memory_limit,
      exam_mode: examMode || content.coding_exam_timer_enabled,
      exam_duration_minutes: content.coding_exam_duration_minutes,
      exam_start_time: codingExamStartTime || Date.now(),
    };
    sessionStorage.setItem('company_training_problem', JSON.stringify(problemData));
    navigate('/coding?source=company-training');
  };

  useEffect(() => {
    if (roundId) {
      fetchRound(parseInt(roundId));
    }
    
    // Cleanup timers on unmount
    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (codingExamTimerRef.current) clearInterval(codingExamTimerRef.current);
    };
  }, [roundId]);

  const fetchRound = async (id: number) => {
    try {
      setLoading(true);
      const roundResponse = await apiClient.getRound(id);
      
      // Handle round response (should be object, but handle array just in case)
      let roundData: Round;
      if (Array.isArray(roundResponse)) {
        if (roundResponse.length === 0) {
          throw new Error("Round not found");
        }
        roundData = roundResponse[0] as Round;
      } else {
        roundData = roundResponse as Round;
      }
      
      if (!roundData || !roundData.id) {
        throw new Error("Invalid round data received");
      }
      
      setRound(roundData);
      
      // Fetch contents
      const contentsResponse = await apiClient.listRoundContents(id, true);
      let contentsData: RoundContent[] = [];
      if (Array.isArray(contentsResponse)) {
        contentsData = contentsResponse;
      } else if (contentsResponse && typeof contentsResponse === 'object') {
        if ('data' in contentsResponse && Array.isArray(contentsResponse.data)) {
          contentsData = contentsResponse.data;
        }
      }
      
      setContents(contentsData.sort((a: RoundContent, b: RoundContent) => a.order_index - b.order_index));
    } catch (error: any) {
      console.error("Error fetching round:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load round",
        variant: "destructive",
      });
      setRound(null);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!round) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Round not found</p>
          <Button onClick={() => navigate('/company-training')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Company Training
          </Button>
        </CardContent>
      </Card>
    );
  }

  const startQuiz = () => {
    const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
    if (quizContents.length === 0) {
      toast({ title: "Error", description: "No quiz questions available", variant: "destructive" });
      return;
    }
    
    setQuizMode(true);
    setCurrentQuizIndex(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResults({});
    
    // Start overall timer if any question has timer
    const hasTimers = quizContents.some(c => c.quiz_timer_seconds);
    if (hasTimers) {
      // Calculate total time from all question timers
      const totalSeconds = quizContents.reduce((sum, c) => sum + (c.quiz_timer_seconds || 0), 0);
      setQuizTimeLeft(totalSeconds);
      
      quizTimerRef.current = setInterval(() => {
        setQuizTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            handleQuizAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Start per-question timer if current question has one
    startQuestionTimer(quizContents[0]);
  };
  
  const startQuestionTimer = (content: RoundContent) => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    if (content.quiz_timer_seconds) {
      setQuestionTimeLeft(content.quiz_timer_seconds);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            handleNextQuizQuestion();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQuestionTimeLeft(null);
    }
  };
  
  const handleNextQuizQuestion = () => {
    const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
    if (currentQuizIndex < quizContents.length - 1) {
      const nextIndex = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIndex);
      startQuestionTimer(quizContents[nextIndex]);
    } else {
      // Last question, show submit dialog
      setShowSubmitDialog(true);
    }
  };
  
  const handlePrevQuizQuestion = () => {
    if (currentQuizIndex > 0) {
      const prevIndex = currentQuizIndex - 1;
      setCurrentQuizIndex(prevIndex);
      const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
      startQuestionTimer(quizContents[prevIndex]);
    }
  };
  
  const handleQuizAutoSubmit = () => {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    submitQuiz(true);
  };
  
  const submitQuiz = async (autoSubmit = false) => {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
    const results: Record<number, { correct: boolean; points: number }> = {};
    let totalScore = 0;
    let maxScore = 0;
    
    quizContents.forEach((content, idx) => {
      const userAnswer = quizAnswers[content.id];
      const marks = content.quiz_marks || 1;
      maxScore += marks;
      
      let isCorrect = false;
      if (content.quiz_question_type === 'mcq') {
        isCorrect = userAnswer === content.correct_answer;
      } else if (content.quiz_question_type === 'fill_blank') {
        isCorrect = userAnswer?.toLowerCase().trim() === content.quiz_correct_answer_text?.toLowerCase().trim();
      } else if (content.quiz_question_type === 'true_false') {
        isCorrect = userAnswer === (content.quiz_is_true ? 'true' : 'false');
      } else if (content.correct_answer) {
        // Legacy support
        isCorrect = userAnswer === content.correct_answer;
      }
      
      const points = isCorrect ? marks : 0;
      totalScore += points;
      results[content.id] = { correct: isCorrect, points };
    });
    
    setQuizResults(results);
    setQuizSubmitted(true);
    setShowSubmitDialog(false);
    
    toast({
      title: autoSubmit ? "Quiz Auto-Submitted" : "Quiz Submitted",
      description: `Score: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)`,
    });
  };
  
  const exitQuiz = () => {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setQuizMode(false);
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizResults({});
    setCurrentQuizIndex(0);
    setQuizTimeLeft(null);
    setQuestionTimeLeft(null);
  };
  
  const renderQuizRound = () => {
    // If linked to external quiz, redirect to that
    if (round.quiz_id) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <FileQuestion className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Quiz Available</h3>
            <p className="text-muted-foreground mb-4">
              This round is linked to a quiz created by faculty with full features including timers and scoring.
            </p>
            <Button onClick={() => navigate(`/quiz/${round.quiz_id}`)} size="lg">
              <FileQuestion className="h-4 w-4 mr-2" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
    
    if (quizMode && !quizSubmitted) {
      // Advanced Quiz Taking Mode
      const currentContent = quizContents[currentQuizIndex];
      if (!currentContent) return null;
      
      return (
        <div className="space-y-6">
          {/* Timer Display */}
          {(quizTimeLeft !== null || questionTimeLeft !== null) && (
            <Card className="border-primary">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {quizTimeLeft !== null && (
                      <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Overall: {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                    {questionTimeLeft !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold text-orange-600">Question: {questionTimeLeft}s</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">Question {currentQuizIndex + 1} of {quizContents.length}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Question Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5" />
                  Question {currentQuizIndex + 1}
                  {currentContent.quiz_marks && (
                    <Badge variant="secondary">{currentContent.quiz_marks} {currentContent.quiz_marks === 1 ? 'mark' : 'marks'}</Badge>
                  )}
                </CardTitle>
                {currentContent.quiz_question_type && (
                  <Badge>{currentContent.quiz_question_type.replace('_', ' ').toUpperCase()}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 text-lg">Question:</h4>
                <p className="text-muted-foreground text-base">{currentContent.quiz_question}</p>
              </div>
              
              {/* MCQ Question */}
              {currentContent.quiz_question_type === 'mcq' && (
                <RadioGroup
                  value={quizAnswers[currentContent.id] || ''}
                  onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [currentContent.id]: value })}
                >
                  {['quiz_option_a', 'quiz_option_b', 'quiz_option_c', 'quiz_option_d'].map((optKey, idx) => {
                    const option = currentContent[optKey as keyof RoundContent] as string;
                    if (!option) return null;
                    return (
                      <div key={idx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value={String.fromCharCode(65 + idx)} id={`option-${idx}`} />
                        <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                          <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
              
              {/* Fill in the Blank */}
              {currentContent.quiz_question_type === 'fill_blank' && (
                <div className="space-y-2">
                  <Label htmlFor="fill-blank-answer">Your Answer:</Label>
                  <Input
                    id="fill-blank-answer"
                    value={quizAnswers[currentContent.id] || ''}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, [currentContent.id]: e.target.value })}
                    placeholder="Type your answer here..."
                  />
                </div>
              )}
              
              {/* True/False */}
              {currentContent.quiz_question_type === 'true_false' && (
                <RadioGroup
                  value={quizAnswers[currentContent.id] || ''}
                  onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [currentContent.id]: value })}
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="true" id="true-option" />
                    <Label htmlFor="true-option" className="flex-1 cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="false" id="false-option" />
                    <Label htmlFor="false-option" className="flex-1 cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}
              
              {/* Legacy MCQ (using quiz_options array) */}
              {!currentContent.quiz_question_type && currentContent.quiz_options && currentContent.quiz_options.length > 0 && (
                <RadioGroup
                  value={quizAnswers[currentContent.id] || ''}
                  onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [currentContent.id]: value })}
                >
                  {currentContent.quiz_options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={String.fromCharCode(65 + idx)} id={`legacy-option-${idx}`} />
                      <Label htmlFor={`legacy-option-${idx}`} className="flex-1 cursor-pointer">
                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevQuizQuestion}
                  disabled={currentQuizIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exitQuiz}>
                    Exit Quiz
                  </Button>
                  {currentQuizIndex === quizContents.length - 1 ? (
                    <Button onClick={() => setShowSubmitDialog(true)}>
                      Submit Quiz
                    </Button>
                  ) : (
                    <Button onClick={handleNextQuizQuestion}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Submit Dialog */}
          <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to submit your quiz? You won't be able to change your answers after submission.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => submitQuiz()}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }
    
    if (quizMode && quizSubmitted) {
      // Results View
      return (
        <div className="space-y-6">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Quiz Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizContents.map((content, idx) => {
                const result = quizResults[content.id];
                const userAnswer = quizAnswers[content.id];
                return (
                  <Card key={content.id} className={result?.correct ? 'border-green-500/50' : 'border-red-500/50'}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                        <div className="flex items-center gap-2">
                          {result?.correct ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <Badge variant={result?.correct ? 'default' : 'destructive'}>
                            {result?.points || 0}/{content.quiz_marks || 1}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="font-medium">{content.quiz_question}</p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Your Answer: </span>
                        <span className="font-medium">{userAnswer || 'Not answered'}</span>
                      </div>
                      {content.quiz_question_type === 'mcq' && content.correct_answer && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Correct Answer: </span>
                          <span className="font-medium text-green-600">{content.correct_answer}</span>
                        </div>
                      )}
                      {content.quiz_question_type === 'fill_blank' && content.quiz_correct_answer_text && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Correct Answer: </span>
                          <span className="font-medium text-green-600">{content.quiz_correct_answer_text}</span>
                        </div>
                      )}
                      {content.quiz_question_type === 'true_false' && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Correct Answer: </span>
                          <span className="font-medium text-green-600">{content.quiz_is_true ? 'True' : 'False'}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              <div className="pt-4 border-t">
                <Button onClick={exitQuiz} className="w-full">
                  Back to Round
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Default View - Show Start Quiz Button
    return (
      <div className="space-y-4">
        {quizContents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No quiz questions available yet</p>
              <p className="text-sm text-muted-foreground">Quiz questions will appear here once they are added</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5" />
                  Quiz Round
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This quiz contains {quizContents.length} question{quizContents.length !== 1 ? 's' : ''}.
                    {quizContents.some(c => c.quiz_timer_seconds) && ' Some questions have timers.'}
                  </p>
                  <Button onClick={startQuiz} size="lg" className="w-full">
                    <FileQuestion className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Preview Questions */}
            <div className="space-y-4">
              {quizContents.map((content, idx) => (
                <Card key={content.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Question {idx + 1} Preview</CardTitle>
                      {content.quiz_question_type && (
                        <Badge>{content.quiz_question_type.replace('_', ' ').toUpperCase()}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{content.quiz_question}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCodingRound = () => {
    if (round.coding_problem_id) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <Code2 className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Coding Problem Available</h3>
            <p className="text-muted-foreground mb-4">
              This round is linked to a coding problem from coding practice with full features including test cases and starter code.
            </p>
            <Button onClick={() => navigate(`/coding?problem=${round.coding_problem_id}`)} size="lg">
              <Code2 className="h-4 w-4 mr-2" />
              Start Coding
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {contents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No coding problems available yet</p>
              <p className="text-sm text-muted-foreground">Coding problems will appear here once they are added</p>
            </CardContent>
          </Card>
        ) : (
          contents.map((content) => (
            <Card key={content.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{content.coding_title || "Coding Problem"}</CardTitle>
                  {content.coding_difficulty && (
                    <Badge variant="outline">{content.coding_difficulty}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.coding_description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{content.coding_description}</p>
                  </div>
                )}
                {content.coding_input_format && (
                  <div>
                    <h4 className="font-semibold mb-2">Input Format:</h4>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {content.coding_input_format}
                    </div>
                  </div>
                )}
                {content.coding_output_format && (
                  <div>
                    <h4 className="font-semibold mb-2">Output Format:</h4>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {content.coding_output_format}
                    </div>
                  </div>
                )}
                {content.coding_constraints && (
                  <div>
                    <h4 className="font-semibold mb-2">Constraints:</h4>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {content.coding_constraints}
                    </div>
                  </div>
                )}
                {(content.coding_sample_input || content.coding_sample_output) && (
                  <div>
                    <h4 className="font-semibold mb-2">Example:</h4>
                    <div className="space-y-3">
                      {content.coding_sample_input && (
                        <div>
                          <div className="text-sm font-medium mb-1 text-muted-foreground">Input:</div>
                          <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {content.coding_sample_input}
                          </div>
                        </div>
                      )}
                      {content.coding_sample_output && (
                        <div>
                          <div className="text-sm font-medium mb-1 text-muted-foreground">Output:</div>
                          <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {content.coding_sample_output}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(content.coding_time_limit || content.coding_memory_limit) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                    {content.coding_time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Time Limit: {content.coding_time_limit}s
                      </span>
                    )}
                    {content.coding_memory_limit && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        Memory Limit: {content.coding_memory_limit}MB
                      </span>
                    )}
                  </div>
                )}
                {content.coding_exam_timer_enabled && content.coding_exam_duration_minutes && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Timer className="h-5 w-5" />
                      <span className="font-semibold">Exam Mode: {content.coding_exam_duration_minutes} minute{content.coding_exam_duration_minutes !== 1 ? 's' : ''} time limit</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This is a timed coding exam. The timer will start when you begin coding.
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t">
                  {codingExamMode && codingExamTimeLeft !== null ? (
                    <Card className="border-primary mb-4">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Timer className="h-5 w-5 text-primary" />
                            <span className="font-semibold">
                              Exam Time Remaining: {Math.floor(codingExamTimeLeft / 60)}:{(codingExamTimeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" onClick={exitCodingExam}>
                            Exit Exam
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  <Button 
                    onClick={() => {
                      if (content.coding_exam_timer_enabled && content.coding_exam_duration_minutes) {
                        startCodingExam(content);
                      } else {
                        navigateToCoding(content);
                      }
                    }}
                    className="w-full"
                    size="lg"
                  >
                    <Code2 className="h-4 w-4 mr-2" />
                    {content.coding_exam_timer_enabled ? 'Start Coding Exam' : 'Start Coding'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderGDRound = () => {
    return (
      <div className="space-y-4">
        {contents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No GD topics available yet</p>
              <p className="text-sm text-muted-foreground">GD topics will appear here once they are added</p>
            </CardContent>
          </Card>
        ) : (
          contents.map((content) => (
            <Card key={content.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {content.gd_topic || "GD Topic"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.gd_description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{content.gd_description}</p>
                  </div>
                )}
                
                {content.key_points && content.key_points.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Key Points to Discuss:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {content.key_points.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.best_points && content.best_points.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Best Points to Include:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {content.best_points.map((point, idx) => (
                        <li key={idx} className="text-sm">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.dos_and_donts && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {content.dos_and_donts.dos && content.dos_and_donts.dos.length > 0 && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Do's:
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {content.dos_and_donts.dos.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {content.dos_and_donts.donts && content.dos_and_donts.donts.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-red-600 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Don'ts:
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {content.dos_and_donts.donts.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderInterviewRound = () => {
    // Group by question type
    const groupedContents = contents.reduce((acc, content) => {
      const type = content.question_type || 'general';
      if (!acc[type]) acc[type] = [];
      acc[type].push(content);
      return acc;
    }, {} as Record<string, RoundContent[]>);

    return (
      <div className="space-y-6">
        {contents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No interview questions available yet</p>
              <p className="text-sm text-muted-foreground">Interview questions will appear here once they are added</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={Object.keys(groupedContents)[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.keys(groupedContents).map((type) => (
                <TabsTrigger key={type} value={type} className="capitalize">
                  {type.replace('_', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(groupedContents).map(([type, typeContents]) => (
              <TabsContent key={type} value={type} className="space-y-4 mt-4">
                {typeContents.map((content, index) => (
                  <Card key={content.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {content.question || `Question ${index + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {content.expected_answer && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Expected Answer:
                          </h4>
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <p className="text-muted-foreground whitespace-pre-wrap">{content.expected_answer}</p>
                          </div>
                        </div>
                      )}

                      {content.tips && content.tips.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            Tips:
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {content.tips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    );
  };

  const renderRoundContent = () => {
    switch (round.round_type) {
      case 'quiz':
        return renderQuizRound();
      case 'coding':
        return renderCodingRound();
      case 'gd':
        return renderGDRound();
      case 'interview':
        return renderInterviewRound();
      default:
        return <p className="text-muted-foreground">Unknown round type</p>;
    }
  };

  const getRoundIcon = () => {
    switch (round.round_type) {
      case 'quiz': return <FileQuestion className="h-6 w-6" />;
      case 'coding': return <Code2 className="h-6 w-6" />;
      case 'gd': return <MessageSquare className="h-6 w-6" />;
      case 'interview': return <Briefcase className="h-6 w-6" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              {getRoundIcon()}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{round.round_name}</h1>
              <Badge variant="outline" className="mt-1 capitalize">
                {round.round_type}
              </Badge>
            </div>
          </div>
          {round.description && (
            <p className="text-muted-foreground mt-2">{round.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {renderRoundContent()}
    </div>
  );
}

