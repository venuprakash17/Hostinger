import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { FileQuestion, Code2, Plus, Edit, Trash2, Loader2, ArrowUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuestionBuilder, Question } from "@/components/quiz/QuestionBuilder";

interface Quiz {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  duration_minutes: number;
  total_marks: number;
  questions: Question[] | any[];
  is_active: boolean;
  year: string | null;
  expiry_date: string | null;
  created_at: string;
  scope_type: string;
  code_snippet?: string | null;
  question_timers?: Record<string, number> | null;
  per_question_timer_enabled?: boolean;
}

interface CodingProblem {
  id: number;
  title: string;
  description: string;
  input_format?: string | null;
  output_format?: string | null;
  constraints?: string | null;
  sample_input?: string | null;
  sample_output?: string | null;
  difficulty: string | null;
  tags: string[];
  is_active: boolean;
  year: number | string | null;
  expiry_date: string | null;
  created_at: string;
  scope_type?: string;
  allowed_languages?: string[];
  restricted_languages?: string[];
  recommended_languages?: string[];
  starter_code_python?: string | null;
  starter_code_c?: string | null;
  starter_code_cpp?: string | null;
  starter_code_java?: string | null;
  starter_code_javascript?: string | null;
  time_limit?: number;
  memory_limit?: number;
  test_cases?: Array<{
    stdin: string;
    expected_output: string;
    is_public?: boolean;
  }>;
}

export default function ManageGlobalContent() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const { toast } = useToast();

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    subject: "",
    duration_minutes: 30,
    total_marks: 100,
    year: "",
    expiry_date: "",
    questions: [] as Question[],
    code_snippet: "",
    per_question_timer_enabled: false,
  });

  const [problemForm, setProblemForm] = useState({
    title: "",
    description: "",
    input_format: "",
    output_format: "",
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    tags: [] as string[],
    constraints: "",
    sample_input: "",
    sample_output: "",
    year: 1 as number,
    allowed_languages: ["python", "c", "cpp", "java", "javascript"] as string[],
    restricted_languages: [] as string[],
    recommended_languages: [] as string[],
    starter_code_python: "",
    starter_code_c: "",
    starter_code_cpp: "",
    starter_code_java: "",
    starter_code_javascript: "",
    time_limit: 5,
    memory_limit: 256,
    test_cases: [] as Array<{stdin: string; expected_output: string; is_public: boolean}>,
    expiry_date: "",
  });

  useEffect(() => {
    fetchQuizzes();
    fetchCodingProblems();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const data = await apiClient.listQuizzes({});
      setQuizzes(data || []);
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to fetch quizzes',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCodingProblems = async () => {
    try {
      // Use new endpoint - no scope_type needed
      const data = await apiClient.listCodingProblems({});
      setCodingProblems(data || []);
    } catch (error: any) {
      console.error('Error fetching coding problems:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to fetch coding problems',
        variant: "destructive"
      });
    }
  };

  const handleFindDuplicates = async () => {
    try {
      const duplicates = await apiClient.findDuplicateProblems();
      if (duplicates.length === 0) {
        toast({
          title: "No Duplicates",
          description: "No duplicate problems found.",
          variant: "default"
        });
      } else {
        toast({
          title: "Duplicates Found",
          description: `Found ${duplicates.length} duplicate problem(s). Click "Clear Duplicates" to remove them.`,
          variant: "default"
        });
      }
      return duplicates;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to find duplicates',
        variant: "destructive"
      });
      return [];
    }
  };

  const handleClearDuplicates = async (keepLatest: boolean = true) => {
    try {
      const result = await apiClient.clearDuplicateProblems(keepLatest);
      toast({
        title: "Success",
        description: result.message || `Cleared ${result.deleted_count} duplicate(s).`,
        variant: "default"
      });
      fetchCodingProblems(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to clear duplicates',
        variant: "destructive"
      });
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizForm.title.trim()) {
      toast({
        title: "Error",
        description: "Quiz title is required",
        variant: "destructive"
      });
      return;
    }

    if (!quizForm.year) {
      toast({
        title: "Error",
        description: "Year is required for SvnaPro content",
        variant: "destructive"
      });
      return;
    }

    if (quizForm.questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question to the quiz",
        variant: "destructive"
      });
      return;
    }

    // Auto-calculate total marks from questions if not set
    const calculatedMarks = quizForm.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // Build question_timers object from questions with timers
    const questionTimers: Record<string, number> = {};
    quizForm.questions.forEach((q, index) => {
      if (q.timer_seconds && q.timer_seconds > 0) {
        questionTimers[index.toString()] = q.timer_seconds;
      }
    });

    try {
      const quizData = {
        title: quizForm.title,
        description: quizForm.description || undefined,
        subject: quizForm.subject || undefined,
        duration_minutes: quizForm.duration_minutes,
        total_marks: calculatedMarks || quizForm.total_marks,
        questions: quizForm.questions.map(q => ({
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          marks: q.marks || 1,
          timer_seconds: q.timer_seconds || undefined,
        })),
        is_active: true,
        scope_type: "svnapro",
        year: quizForm.year,
        expiry_date: quizForm.expiry_date ? new Date(quizForm.expiry_date).toISOString() : undefined,
        code_snippet: quizForm.code_snippet || undefined,
        question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
        per_question_timer_enabled: quizForm.per_question_timer_enabled || Object.keys(questionTimers).length > 0,
      };

      if (editingQuiz) {
        await apiClient.updateQuiz(editingQuiz.id, quizData);
        toast({ title: "Success", description: "Quiz updated successfully" });
      } else {
        await apiClient.createQuiz(quizData);
        toast({ title: "Success", description: "Quiz created successfully" });
      }

      setQuizOpen(false);
      setEditingQuiz(null);
      setQuizForm({
        title: "",
        description: "",
        subject: "",
        duration_minutes: 30,
        total_marks: 100,
        year: "",
        expiry_date: "",
        questions: [],
        code_snippet: "",
        per_question_timer_enabled: false,
      });
      fetchQuizzes();
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create quiz',
        variant: "destructive"
      });
    }
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive"
      });
      return;
    }

    if (!problemForm.year || problemForm.year < 1 || problemForm.year > 4) {
      toast({
        title: "Error",
        description: "Year must be between 1 and 4",
        variant: "destructive"
      });
      return;
    }

    // Validate test cases
    if (!problemForm.test_cases || problemForm.test_cases.length === 0) {
      toast({
        title: "Error",
        description: "At least one test case is required to evaluate solutions",
        variant: "destructive"
      });
      return;
    }

    // Validate each test case has input and expected output
    const invalidTestCases = problemForm.test_cases.filter(
      tc => !tc.stdin.trim() || !tc.expected_output.trim()
    );
    if (invalidTestCases.length > 0) {
      toast({
        title: "Error",
        description: `Test case(s) ${invalidTestCases.map((_, i) => problemForm.test_cases.indexOf(invalidTestCases[i]) + 1).join(', ')} are missing input or expected output`,
        variant: "destructive"
      });
      return;
    }

    try {
      const problemData = {
        title: problemForm.title,
        description: problemForm.description,
        input_format: problemForm.input_format || undefined,
        output_format: problemForm.output_format || undefined,
        difficulty: problemForm.difficulty,
        tags: problemForm.tags,
        constraints: problemForm.constraints || undefined,
        sample_input: problemForm.sample_input || undefined,
        sample_output: problemForm.sample_output || undefined,
        year: problemForm.year,
        allowed_languages: problemForm.allowed_languages,
        restricted_languages: problemForm.restricted_languages.length > 0 ? problemForm.restricted_languages : undefined,
        recommended_languages: problemForm.recommended_languages.length > 0 ? problemForm.recommended_languages : undefined,
        starter_code_python: problemForm.starter_code_python || undefined,
        starter_code_c: problemForm.starter_code_c || undefined,
        starter_code_cpp: problemForm.starter_code_cpp || undefined,
        starter_code_java: problemForm.starter_code_java || undefined,
        starter_code_javascript: problemForm.starter_code_javascript || undefined,
        time_limit: problemForm.time_limit,
        memory_limit: problemForm.memory_limit,
        test_cases: problemForm.test_cases.length > 0 ? problemForm.test_cases : undefined,
        is_active: true,
        expiry_date: problemForm.expiry_date ? new Date(problemForm.expiry_date).toISOString() : undefined,
        scope_type: "svnapro", // Super Admin creates SvnaPro problems
      };

      // Validate allowed languages
      if (!problemForm.allowed_languages || problemForm.allowed_languages.length === 0) {
        toast({
          title: "Error",
          description: "At least one language must be allowed",
          variant: "destructive"
        });
        return;
      }

      console.log('Submitting problem data:', problemData);

      if (editingProblem) {
        await apiClient.updateCodingProblem(editingProblem.id, problemData);
        toast({ title: "Success", description: "Coding problem updated successfully" });
      } else {
        await apiClient.createCodingProblem(problemData);
        toast({ title: "Success", description: "Coding problem created successfully" });
      }

      setProblemOpen(false);
      setEditingProblem(null);
      setProblemForm({
        title: "",
        description: "",
        input_format: "",
        output_format: "",
        difficulty: "Medium",
        tags: [],
        constraints: "",
        sample_input: "",
        sample_output: "",
        year: 1,
        allowed_languages: ["python", "c", "cpp", "java", "javascript"],
        restricted_languages: [],
        recommended_languages: [],
        starter_code_python: "",
        starter_code_c: "",
        starter_code_cpp: "",
        starter_code_java: "",
        starter_code_javascript: "",
        time_limit: 5,
        memory_limit: 256,
        test_cases: [],
        expiry_date: "",
      });
      fetchCodingProblems();
    } catch (error: any) {
      console.error('Error creating coding problem:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create coding problem';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    // Convert questions to Question format if needed
    const formattedQuestions: Question[] = (quiz.questions || []).map((q: any, index: number) => ({
      question: q.question || "",
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
      correct_answer: (q.correct_answer || "A") as "A" | "B" | "C" | "D",
      marks: q.marks || 1,
      timer_seconds: q.timer_seconds || (quiz.question_timers && quiz.question_timers[index.toString()]) || undefined,
    }));
    
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      subject: quiz.subject || "",
      duration_minutes: quiz.duration_minutes,
      total_marks: quiz.total_marks,
      year: quiz.year || "",
      expiry_date: quiz.expiry_date ? new Date(quiz.expiry_date).toISOString().slice(0, 16) : "",
      questions: formattedQuestions,
      code_snippet: (quiz as any).code_snippet || "",
      per_question_timer_enabled: (quiz as any).per_question_timer_enabled || false,
    });
    setQuizOpen(true);
  };

  const handleEditProblem = (problem: CodingProblem) => {
    setEditingProblem(problem);
    // Convert test_cases from database format to form format
    const testCases = (problem.test_cases || []).map((tc: any) => ({
      stdin: tc.stdin || tc.input || "",
      expected_output: tc.expected_output || tc.output || "",
      is_public: tc.is_public !== undefined ? tc.is_public : true
    }));
    
    // Parse year to integer
    const parseYear = (year: string | number | null): number => {
      if (typeof year === 'number') return year;
      if (!year) return 1;
      const str = String(year).toLowerCase().trim();
      if (str.startsWith('1')) return 1;
      if (str.startsWith('2')) return 2;
      if (str.startsWith('3')) return 3;
      if (str.startsWith('4')) return 4;
      const num = parseInt(str);
      return (num >= 1 && num <= 4) ? num : 1;
    };
    
    setProblemForm({
      title: problem.title,
      description: problem.description,
      input_format: problem.input_format || "",
      output_format: problem.output_format || "",
      difficulty: (problem.difficulty as "Easy" | "Medium" | "Hard") || "Medium",
      tags: problem.tags || [],
      constraints: problem.constraints || "",
      sample_input: problem.sample_input || "",
      sample_output: problem.sample_output || "",
      year: parseYear(problem.year),
      allowed_languages: problem.allowed_languages || ["python", "c", "cpp", "java", "javascript"],
      restricted_languages: problem.restricted_languages || [],
      recommended_languages: problem.recommended_languages || [],
      starter_code_python: problem.starter_code_python || "",
      starter_code_c: problem.starter_code_c || "",
      starter_code_cpp: problem.starter_code_cpp || "",
      starter_code_java: problem.starter_code_java || "",
      starter_code_javascript: problem.starter_code_javascript || "",
      time_limit: problem.time_limit || 5,
      memory_limit: problem.memory_limit || 256,
      test_cases: testCases,
      expiry_date: problem.expiry_date ? new Date(problem.expiry_date).toISOString().slice(0, 16) : "",
    });
    setProblemOpen(true);
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      await apiClient.deleteQuiz(id);
      toast({ title: "Success", description: "Quiz deleted successfully" });
      fetchQuizzes();
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete quiz',
        variant: "destructive"
      });
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this coding problem?")) return;

    try {
      await apiClient.deleteCodingProblem(id);
      toast({ title: "Success", description: "Coding problem deleted successfully" });
      fetchCodingProblems();
    } catch (error: any) {
      console.error('Error deleting coding problem:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to delete coding problem',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Content Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage SvnaPro quizzes and coding problems visible to all students based on year
        </p>
      </div>

      <Tabs defaultValue="quizzes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quizzes">
            <FileQuestion className="h-4 w-4 mr-2" />
            Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="coding">
            <Code2 className="h-4 w-4 mr-2" />
            Coding Problems ({codingProblems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">SvnaPro Quizzes</h2>
              <p className="text-sm text-muted-foreground">
                Create quizzes that will be visible to students of the selected year across all colleges
              </p>
            </div>
            <Dialog open={quizOpen} onOpenChange={(open) => {
              setQuizOpen(open);
              if (!open) {
                setEditingQuiz(null);
                setQuizForm({
                  title: "",
                  description: "",
                  subject: "",
                  duration_minutes: 30,
                  total_marks: 100,
                  year: "",
                  expiry_date: "",
                  questions: [],
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create SvnaPro Quiz"}</DialogTitle>
                  <CardDescription>
                    This quiz will be visible to all students of the selected year across all colleges
                  </CardDescription>
                </DialogHeader>
                <form onSubmit={handleCreateQuiz} className="space-y-4">
                  <div>
                    <Label>Year *</Label>
                    <Select
                      value={quizForm.year}
                      onValueChange={(value) => setQuizForm({ ...quizForm, year: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st">1st Year</SelectItem>
                        <SelectItem value="2nd">2nd Year</SelectItem>
                        <SelectItem value="3rd">3rd Year</SelectItem>
                        <SelectItem value="4th">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only students of this year will see this quiz
                    </p>
                  </div>

                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={quizForm.title}
                      onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                      placeholder="Quiz title"
                      required
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={quizForm.description}
                      onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                      rows={3}
                      placeholder="Quiz description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={quizForm.subject}
                        onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={quizForm.duration_minutes}
                        onChange={(e) => setQuizForm({ ...quizForm, duration_minutes: parseInt(e.target.value) || 30 })}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Total Marks</Label>
                      <Input
                        type="number"
                        value={quizForm.total_marks}
                        onChange={(e) => setQuizForm({ ...quizForm, total_marks: parseInt(e.target.value) || 100 })}
                        min={1}
                      />
                    </div>
                    <div>
                      <Label>Expiry Date (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={quizForm.expiry_date}
                        onChange={(e) => setQuizForm({ ...quizForm, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Code Snippet Section */}
                  <div className="border-t pt-4">
                    <Label>Code Snippet (Optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Display code before questions. Students will see this code and answer questions based on it.
                    </p>
                    <Textarea
                      value={quizForm.code_snippet}
                      onChange={(e) => setQuizForm({ ...quizForm, code_snippet: e.target.value })}
                      rows={8}
                      placeholder="// Enter code here&#10;function example() {&#10;  return 'Hello World';&#10;}"
                      className="font-mono text-sm"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="per-question-timer"
                        checked={quizForm.per_question_timer_enabled}
                        onChange={(e) => setQuizForm({ ...quizForm, per_question_timer_enabled: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="per-question-timer" className="cursor-pointer">
                        Enable per-question timer (timers set in individual questions will be used)
                      </Label>
                    </div>
                  </div>

                  {/* Question Builder */}
                  <div className="border-t pt-4">
                    <QuestionBuilder
                      questions={quizForm.questions}
                      onChange={(questions) => {
                        setQuizForm({ ...quizForm, questions });
                        // Auto-update total marks
                        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
                        setQuizForm(prev => ({ ...prev, total_marks: totalMarks }));
                      }}
                    />
                  </div>

                  <div className="flex gap-2 border-t pt-4">
                    <Button type="submit" className="flex-1" disabled={quizForm.questions.length === 0}>
                      {editingQuiz ? "Update Quiz" : "Create Quiz"} {quizForm.questions.length > 0 && `(${quizForm.questions.length} questions)`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setQuizOpen(false);
                        setEditingQuiz(null);
                        setQuizForm({
                          title: "",
                          description: "",
                          subject: "",
                          duration_minutes: 30,
                          total_marks: 100,
                          year: "",
                          expiry_date: "",
                          questions: [],
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <FileUpload
            endpoint="/bulk-upload/quizzes"
            accept=".json,.xlsx,.csv"
            label="Bulk Upload Quizzes"
            description="Upload quizzes via Excel, CSV, or JSON"
            templateUrl="/bulk-upload/template/quizzes"
            templateFileName="quiz_upload_template.json"
            onSuccess={() => {
              fetchQuizzes();
            }}
          />

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading quizzes...</p>
              </CardContent>
            </Card>
          ) : quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No quizzes found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        {quiz.year && (
                          <Badge variant="outline" className="mt-2">
                            {typeof quiz.year === 'string' ? (quiz.year.charAt(0).toUpperCase() + quiz.year.slice(1)) : quiz.year} Year
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuiz(quiz)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {quiz.description && (
                        <p className="text-muted-foreground line-clamp-2">{quiz.description}</p>
                      )}
                      {quiz.subject && (
                        <p><strong>Subject:</strong> {quiz.subject}</p>
                      )}
                      <p><strong>Duration:</strong> {quiz.duration_minutes} minutes</p>
                      <p><strong>Total Marks:</strong> {quiz.total_marks}</p>
                      <p><strong>Questions:</strong> {quiz.questions?.length || 0}</p>
                      <p><strong>Status:</strong> {quiz.is_active ? "Active" : "Inactive"}</p>
                      {quiz.expiry_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(quiz.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coding" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">SvnaPro Coding Problems</h2>
              <p className="text-sm text-muted-foreground">
                Create coding problems that will be visible to students of the selected year across all colleges
              </p>
            </div>
            <Dialog open={problemOpen} onOpenChange={(open) => {
              setProblemOpen(open);
              if (!open) {
                setEditingProblem(null);
                setProblemForm({
                  title: "",
                  description: "",
                  input_format: "",
                  output_format: "",
                  difficulty: "Medium",
                  tags: [],
                  constraints: "",
                  sample_input: "",
                  sample_output: "",
                  year: 1,
                  allowed_languages: ["python", "c", "cpp", "java", "javascript"],
                  restricted_languages: [],
                  recommended_languages: [],
                  starter_code_python: "",
                  starter_code_c: "",
                  starter_code_cpp: "",
                  starter_code_java: "",
                  starter_code_javascript: "",
                  time_limit: 5,
                  memory_limit: 256,
                  test_cases: [],
                  expiry_date: "",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Coding Problem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProblem ? "Edit Coding Problem" : "Create SvnaPro Coding Problem"}</DialogTitle>
                  <CardDescription>
                    This problem will be visible to all students of the selected year across all colleges
                  </CardDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProblem} className="space-y-6">
                  {/* Basic Information Section */}
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={problemForm.title}
                        onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                        placeholder="Problem title"
                        required
                      />
                    </div>

                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        value={problemForm.description}
                        onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                        rows={5}
                        placeholder="Detailed problem description"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Year * (1-4)</Label>
                        <Select
                          value={String(problemForm.year)}
                          onValueChange={(value) => setProblemForm({ ...problemForm, year: Number(value) })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Year 1</SelectItem>
                            <SelectItem value="2">Year 2</SelectItem>
                            <SelectItem value="3">Year 3</SelectItem>
                            <SelectItem value="4">Year 4</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Students of this year and below will see this problem
                        </p>
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select
                          value={problemForm.difficulty}
                          onValueChange={(value: "Easy" | "Medium" | "Hard") => setProblemForm({ ...problemForm, difficulty: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Input/Output Format Section */}
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Input/Output Format</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Input Format</Label>
                        <Textarea
                          value={problemForm.input_format}
                          onChange={(e) => setProblemForm({ ...problemForm, input_format: e.target.value })}
                          rows={4}
                          placeholder="Describe the input format (e.g., First line contains N, next N lines contain integers)"
                        />
                      </div>
                      <div>
                        <Label>Output Format</Label>
                        <Textarea
                          value={problemForm.output_format}
                          onChange={(e) => setProblemForm({ ...problemForm, output_format: e.target.value })}
                          rows={4}
                          placeholder="Describe the output format (e.g., Print a single integer)"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Constraints</Label>
                      <Textarea
                        value={problemForm.constraints}
                        onChange={(e) => setProblemForm({ ...problemForm, constraints: e.target.value })}
                        rows={3}
                        placeholder="Problem constraints (e.g., 1 ≤ N ≤ 10^5, 1 ≤ A[i] ≤ 10^9)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sample Input</Label>
                        <Textarea
                          value={problemForm.sample_input}
                          onChange={(e) => setProblemForm({ ...problemForm, sample_input: e.target.value })}
                          rows={3}
                          className="font-mono text-sm"
                          placeholder="5&#10;1 2 3 4 5"
                        />
                      </div>
                      <div>
                        <Label>Sample Output</Label>
                        <Textarea
                          value={problemForm.sample_output}
                          onChange={(e) => setProblemForm({ ...problemForm, sample_output: e.target.value })}
                          rows={3}
                          className="font-mono text-sm"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Execution Control Section */}
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Execution Control</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Time Limit (seconds) *</Label>
                        <Input
                          type="number"
                          value={problemForm.time_limit}
                          onChange={(e) => setProblemForm({ ...problemForm, time_limit: Number(e.target.value) })}
                          min="1"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">Maximum execution time</p>
                      </div>
                      <div>
                        <Label>Memory Limit (MB) *</Label>
                        <Input
                          type="number"
                          value={problemForm.memory_limit}
                          onChange={(e) => setProblemForm({ ...problemForm, memory_limit: Number(e.target.value) })}
                          min="64"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">Maximum memory usage</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Expiry Date (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={problemForm.expiry_date}
                        onChange={(e) => setProblemForm({ ...problemForm, expiry_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Problem will be hidden after this date</p>
                    </div>
                  </div>

                  {/* Language Configuration Section */}
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Language Configuration</h3>
                    
                    <div>
                      <Label>Allowed Languages *</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["python", "c", "cpp", "java", "javascript"].map((lang) => (
                          <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={problemForm.allowed_languages.includes(lang)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProblemForm({
                                    ...problemForm,
                                    allowed_languages: [...problemForm.allowed_languages, lang]
                                  });
                                } else {
                                  setProblemForm({
                                    ...problemForm,
                                    allowed_languages: problemForm.allowed_languages.filter(l => l !== lang),
                                    restricted_languages: problemForm.restricted_languages.filter(l => l !== lang),
                                    recommended_languages: problemForm.recommended_languages.filter(l => l !== lang)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{lang === 'cpp' ? 'C++' : lang === 'js' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Restricted Languages (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Languages that MUST be used. If empty, any allowed language can be used.</p>
                      <div className="flex flex-wrap gap-2">
                        {problemForm.allowed_languages.map((lang) => (
                          <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={problemForm.restricted_languages.includes(lang)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProblemForm({
                                    ...problemForm,
                                    restricted_languages: [...problemForm.restricted_languages, lang]
                                  });
                                } else {
                                  setProblemForm({
                                    ...problemForm,
                                    restricted_languages: problemForm.restricted_languages.filter(l => l !== lang)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{lang === 'cpp' ? 'C++' : lang === 'js' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Recommended Languages (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Languages recommended but not required.</p>
                      <div className="flex flex-wrap gap-2">
                        {problemForm.allowed_languages.map((lang) => (
                          <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={problemForm.recommended_languages.includes(lang)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProblemForm({
                                    ...problemForm,
                                    recommended_languages: [...problemForm.recommended_languages, lang]
                                  });
                                } else {
                                  setProblemForm({
                                    ...problemForm,
                                    recommended_languages: problemForm.recommended_languages.filter(l => l !== lang)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{lang === 'cpp' ? 'C++' : lang === 'js' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Test Cases Section - Enhanced HackerRank/HackerEarth Style */}
                  <div className="space-y-4 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Test Cases</h3>
                        <p className="text-xs text-muted-foreground">
                          Add test cases for evaluating solutions. Public test cases are visible to students during practice.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {problemForm.test_cases.length} test case{problemForm.test_cases.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {problemForm.test_cases.length === 0 && (
                      <Card className="p-6 border-dashed">
                        <div className="text-center text-muted-foreground">
                          <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No test cases added yet</p>
                          <p className="text-xs mt-1">Add at least one test case to enable code evaluation</p>
                        </div>
                      </Card>
                    )}
                    
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {problemForm.test_cases.map((testCase, index) => (
                        <Card key={index} className="p-4 border-2 hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={testCase.is_public ? "default" : "secondary"} className="text-xs">
                                Test Case {index + 1} - {testCase.is_public ? "Public" : "Hidden"}
                              </Badge>
                              {testCase.is_public && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                  Visible to Students
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setProblemForm({
                                  ...problemForm,
                                  test_cases: problemForm.test_cases.filter((_, i) => i !== index)
                                });
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium flex items-center gap-1">
                                <Code2 className="h-3 w-3" />
                                Input (stdin)
                              </Label>
                              <Textarea
                                value={testCase.stdin}
                                onChange={(e) => {
                                  const updated = [...problemForm.test_cases];
                                  updated[index].stdin = e.target.value;
                                  setProblemForm({ ...problemForm, test_cases: updated });
                                }}
                                rows={4}
                                className="font-mono text-xs resize-none"
                                placeholder="Enter test input (e.g., 5&#10;1 2 3 4 5)"
                              />
                              {testCase.stdin && (
                                <p className="text-xs text-muted-foreground">
                                  {testCase.stdin.split('\n').length} line{testCase.stdin.split('\n').length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Expected Output
                              </Label>
                              <Textarea
                                value={testCase.expected_output}
                                onChange={(e) => {
                                  const updated = [...problemForm.test_cases];
                                  updated[index].expected_output = e.target.value;
                                  setProblemForm({ ...problemForm, test_cases: updated });
                                }}
                                rows={4}
                                className="font-mono text-xs resize-none"
                                placeholder="Enter expected output (e.g., 15)"
                              />
                              {testCase.expected_output && (
                                <p className="text-xs text-muted-foreground">
                                  {testCase.expected_output.split('\n').length} line{testCase.expected_output.split('\n').length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={testCase.is_public}
                                onChange={(e) => {
                                  const updated = [...problemForm.test_cases];
                                  updated[index].is_public = e.target.checked;
                                  setProblemForm({ ...problemForm, test_cases: updated });
                                }}
                                className="rounded"
                              />
                              <span className="text-xs group-hover:text-foreground transition-colors">
                                {testCase.is_public ? (
                                  <span className="text-green-600 font-medium">Public - Students can see this test case</span>
                                ) : (
                                  <span className="text-muted-foreground">Hidden - Only used for evaluation</span>
                                )}
                              </span>
                            </label>
                            {index > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = [...problemForm.test_cases];
                                  [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                  setProblemForm({ ...problemForm, test_cases: updated });
                                }}
                                className="h-7 text-xs"
                              >
                                <ArrowUp className="h-3 w-3 mr-1" />
                                Move Up
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProblemForm({
                            ...problemForm,
                            test_cases: [
                              ...problemForm.test_cases,
                              { stdin: "", expected_output: "", is_public: true }
                            ]
                          });
                        }}
                        className="flex-1 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Public Test Case
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProblemForm({
                            ...problemForm,
                            test_cases: [
                              ...problemForm.test_cases,
                              { stdin: "", expected_output: "", is_public: false }
                            ]
                          });
                        }}
                        className="flex-1 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Hidden Test Case
                      </Button>
                    </div>
                    
                    {problemForm.test_cases.length > 0 && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Badge variant="default" className="text-xs">Public: {problemForm.test_cases.filter(tc => tc.is_public).length}</Badge>
                            <Badge variant="secondary" className="text-xs">Hidden: {problemForm.test_cases.filter(tc => !tc.is_public).length}</Badge>
                          </div>
                          <span className="text-muted-foreground ml-auto">
                            Tip: Add at least 2-3 public test cases for students to practice
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-lg font-semibold">Starter Code Templates</Label>
                    <p className="text-xs text-muted-foreground mb-4">Provide boilerplate code for each language. Students will see this code when they select a language.</p>
                    <Tabs defaultValue={problemForm.allowed_languages[0] || "python"} className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        {["python", "c", "cpp", "java", "javascript"].map((lang) => {
                          if (!problemForm.allowed_languages.includes(lang)) return null;
                          return (
                            <TabsTrigger key={lang} value={lang} className="text-xs">
                              {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JS' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                      {["python", "c", "cpp", "java", "javascript"].map((lang) => {
                        if (!problemForm.allowed_languages.includes(lang)) return null;
                        const fieldMap: Record<string, keyof typeof problemForm> = {
                          'python': 'starter_code_python',
                          'c': 'starter_code_c',
                          'cpp': 'starter_code_cpp',
                          'java': 'starter_code_java',
                          'javascript': 'starter_code_javascript'
                        };
                        const field = fieldMap[lang];
                        if (!field) return null;
                        return (
                          <TabsContent key={lang} value={lang} className="mt-4">
                            <Textarea
                              value={problemForm[field] as string}
                              onChange={(e) => setProblemForm({ ...problemForm, [field]: e.target.value })}
                              rows={12}
                              className="font-mono text-sm"
                              placeholder={`// Starter code for ${lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}\n// Example:\n${lang === 'python' ? 'def solve():\n    pass' : lang === 'c' || lang === 'cpp' ? '#include <stdio.h>\n\nint main() {\n    return 0;\n}' : lang === 'java' ? 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}' : 'function solve() {\n    \n}'}`}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              This code will be pre-filled when students select {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </p>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingProblem ? "Update Problem" : "Create Problem"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProblemOpen(false);
                        setEditingProblem(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-4 items-end">
            <FileUpload
              endpoint="/bulk-upload/coding-problems"
              accept=".json,.xlsx,.csv"
              label="Bulk Upload Coding Problems"
              description="Upload coding problems via Excel, CSV, or JSON"
              templateUrl="/bulk-upload/templates/coding-problem"
              templateFileName="coding_problem_upload_template.xlsx"
              onSuccess={() => {
                fetchCodingProblems();
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const duplicates = await handleFindDuplicates();
                  if (duplicates.length > 0) {
                    if (confirm(`Found ${duplicates.length} duplicate(s). Do you want to clear them? (This will keep the latest version of each duplicate.)`)) {
                      await handleClearDuplicates(true);
                    }
                  }
                }}
              >
                Find & Clear Duplicates
              </Button>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading coding problems...</p>
              </CardContent>
            </Card>
          ) : codingProblems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No coding problems found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {codingProblems.map((problem) => (
                <Card key={problem.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{problem.title}</CardTitle>
                        {problem.year && (
                          <Badge variant="outline" className="mt-2">
                            Year {typeof problem.year === 'number' ? problem.year : (typeof problem.year === 'string' ? (problem.year as string).charAt(0).toUpperCase() + (problem.year as string).slice(1).replace(/st|nd|rd|th/, '') : String(problem.year))}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProblem(problem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProblem(problem.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground line-clamp-3">{problem.description}</p>
                      {problem.difficulty && (
                        <p><strong>Difficulty:</strong> {problem.difficulty}</p>
                      )}
                      {problem.tags && Array.isArray(problem.tags) && problem.tags.length > 0 && (
                        <p><strong>Tags:</strong> {problem.tags.join(", ")}</p>
                      )}
                      {problem.allowed_languages && Array.isArray(problem.allowed_languages) && problem.allowed_languages.length > 0 && (
                        <p className="text-xs"><strong>Languages:</strong> {problem.allowed_languages.map((l: string) => l === 'cpp' ? 'C++' : l === 'javascript' ? 'JS' : l.charAt(0).toUpperCase() + l.slice(1)).join(", ")}</p>
                      )}
                      {problem.restricted_languages && Array.isArray(problem.restricted_languages) && problem.restricted_languages.length > 0 && (
                        <p className="text-xs text-orange-600"><strong>Restricted:</strong> {problem.restricted_languages.map((l: string) => l === 'cpp' ? 'C++' : l === 'javascript' ? 'JS' : l.charAt(0).toUpperCase() + l.slice(1)).join(", ")}</p>
                      )}
                      {problem.time_limit && (
                        <p className="text-xs"><strong>Time:</strong> {problem.time_limit}s | <strong>Memory:</strong> {problem.memory_limit || 'N/A'}MB</p>
                      )}
                      <p><strong>Status:</strong> {problem.is_active ? "Active" : "Inactive"}</p>
                      {problem.expiry_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(problem.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
