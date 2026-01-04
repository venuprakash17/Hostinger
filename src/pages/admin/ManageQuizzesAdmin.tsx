/**
 * College Admin Quiz Management
 * Enhanced quiz module with Question Bank, bulk assignment, and analytics
 */

import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit, Trash2, FileQuestion, Loader2, Clock, Users, Calendar, BookOpen, Timer, 
  GraduationCap, Database, Shuffle, Minus, BarChart3, Download, Eye, CheckCircle2, XCircle,
  AlertCircle, Settings, Play, Pause, Square, Upload, FileSpreadsheet
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUserRole } from "@/hooks/useUserRole";

interface QuestionBankItem {
  id: number;
  question_text: string;
  question_type: "MCQ" | "TRUE_FALSE";
  options?: string[];
  correct_answer: string;
  marks: number;
  difficulty?: string;
  topic?: string;
  subject?: string;
  negative_marking: number;
  is_active: boolean;
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  subject?: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks?: number;
  is_active: boolean;
  status: "draft" | "published" | "archived";
  start_time?: string;
  end_time?: string;
  expiry_date?: string;
  assigned_branches?: number[];
  assigned_sections?: number[];
  allow_negative_marking: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  questions?: any[];
  created_at?: string;
  attempts_count?: number;
  average_score?: number;
  pass_percentage?: number;
}

interface Department {
  id: number;
  name: string;
  code?: string;
}

interface Section {
  id: number;
  name: string;
  department_id: number;
  department?: Department;
  year?: number;
}

export default function ManageQuizzesAdmin() {
  const { isAdmin, isSuperAdmin, isHod, isFaculty } = useUserRole();
  const [activeTab, setActiveTab] = useState<"quizzes" | "question-bank" | "analytics">("quizzes");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [questionBankDialogOpen, setQuestionBankDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [questionUploadDialogOpen, setQuestionUploadDialogOpen] = useState(false);
  const [questionUploadFile, setQuestionUploadFile] = useState<File | null>(null);
  const [questionUploadLoading, setQuestionUploadLoading] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const { toast } = useToast();

  // Quiz form state
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    subject: "",
    duration_minutes: 30,
    total_marks: 100,
    passing_marks: 50,
    start_time: "",
    end_time: "",
    expiry_date: "",
    assigned_branches: [] as number[],
    assigned_sections: [] as number[],
    assign_to_all: false,
    allow_negative_marking: false,
    shuffle_questions: false,
    shuffle_options: false,
    status: "draft" as "draft" | "published" | "archived",
    use_question_bank: false,
    question_bank_ids: [] as number[],
    use_random_questions: false,
    random_question_count: 10,
    questions: [] as any[],
  });

  // Question Bank form state
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "MCQ" as "MCQ" | "TRUE_FALSE",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    marks: 1,
    difficulty: "medium" as "easy" | "medium" | "hard",
    topic: "",
    subject: "",
    negative_marking: 0.0,
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin || isSuperAdmin || isHod || isFaculty) {
      fetchData();
    }
  }, [isAdmin, isSuperAdmin, isHod, isFaculty]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profile = await apiClient.getCurrentUserProfile();
      setUserProfile(profile);
      await Promise.all([
        fetchQuizzes(),
        fetchQuestionBank(),
        fetchDepartments(),
        fetchSections(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const data = await apiClient.getQuizzes(true);
      setQuizzes(data || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const fetchQuestionBank = async () => {
    try {
      const API_BASE = getAPIBase();
      const response = await fetch(`${API_BASE}/question-banks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQuestionBank(data || []);
      }
    } catch (error) {
      console.error("Error fetching question bank:", error);
    }
  };

  const getAPIBase = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
      return 'http://localhost:8000/api/v1';
    }
    return envUrl || 'http://localhost:8000/api/v1';
  };

  const fetchDepartments = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.college_id) {
        const data = await apiClient.getDepartments(profile.college_id);
        // Filter departments based on role
        if (isHod || isFaculty) {
          // HOD/Faculty can only see their own department
          const filtered = data?.filter((d: Department) => d.id === profile.department_id) || [];
          setDepartments(filtered);
        } else {
          setDepartments(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.college_id) {
        const departmentId = isHod || isFaculty ? profile.department_id : undefined;
        const data = await apiClient.getSections(profile.college_id, departmentId);
        setSections(data || []);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      // Validate form
      if (!quizForm.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Quiz title is required",
          variant: "destructive",
        });
        return;
      }

      if (quizForm.use_question_bank && quizForm.question_bank_ids.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select questions from question bank",
          variant: "destructive",
        });
        return;
      }

      if (!quizForm.use_question_bank && quizForm.questions.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one question",
          variant: "destructive",
        });
        return;
      }

      // Calculate total marks if not set
      let totalMarks = quizForm.total_marks;
      if (quizForm.use_question_bank) {
        const selectedQuestions = questionBank.filter(q => quizForm.question_bank_ids.includes(q.id));
        totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
      } else {
        totalMarks = quizForm.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      }

      const quizData: any = {
        title: quizForm.title,
        description: quizForm.description || undefined,
        subject: quizForm.subject || undefined,
        duration_minutes: quizForm.duration_minutes,
        total_marks: totalMarks,
        passing_marks: quizForm.passing_marks,
        start_time: quizForm.start_time ? new Date(quizForm.start_time).toISOString() : undefined,
        end_time: quizForm.end_time ? new Date(quizForm.end_time).toISOString() : undefined,
        expiry_date: quizForm.expiry_date ? new Date(quizForm.expiry_date).toISOString() : undefined,
        is_active: quizForm.status === "published",
        scope_type: isAdmin || isSuperAdmin ? "college" : isHod ? "department" : "section",
        allow_negative_marking: quizForm.allow_negative_marking,
        shuffle_questions: quizForm.shuffle_questions,
        shuffle_options: quizForm.shuffle_options,
        status: quizForm.status,
        use_random_questions: quizForm.use_random_questions,
        random_question_count: quizForm.use_random_questions ? quizForm.random_question_count : undefined,
        question_bank_ids: quizForm.use_question_bank ? quizForm.question_bank_ids : undefined,
      };

      // Handle bulk assignment based on role
      if (isAdmin || isSuperAdmin) {
        // Admin can assign to all or specific branches/sections
        if (quizForm.assign_to_all) {
          quizData.assigned_branches = departments.map(d => d.id);
        } else {
          if (quizForm.assigned_branches.length > 0) {
            quizData.assigned_branches = quizForm.assigned_branches;
          }
          if (quizForm.assigned_sections.length > 0) {
            quizData.assigned_sections = quizForm.assigned_sections;
          }
        }
      } else if (isHod) {
        // HOD can assign to all sections in their department
        const hodDepartmentId = userProfile?.department_id;
        if (hodDepartmentId) {
          if (quizForm.assign_to_all) {
            // Assign to all sections in HOD's department
            const deptSections = sections.filter(s => s.department_id === hodDepartmentId);
            quizData.assigned_sections = deptSections.map(s => s.id);
          } else if (quizForm.assigned_sections.length > 0) {
            // Validate sections belong to HOD's department
            const validSections = quizForm.assigned_sections.filter(sId => {
              const section = sections.find(s => s.id === sId);
              return section?.department_id === hodDepartmentId;
            });
            quizData.assigned_sections = validSections;
          }
        }
      } else if (isFaculty) {
        // Faculty can only assign to their assigned sections
        const facultySections = sections; // Already filtered by department
        if (quizForm.assigned_sections.length > 0) {
          quizData.assigned_sections = quizForm.assigned_sections;
        } else {
          // Default to all sections faculty has access to
          quizData.assigned_sections = sections.map(s => s.id);
        }
      }

      // Add manual questions if not using question bank
      if (!quizForm.use_question_bank) {
        quizData.questions = quizForm.questions.map(q => ({
          question: q.question,
          question_type: q.question_type || "mcq",
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          is_true: q.is_true,
          marks: q.marks || 1,
          negative_marking: q.negative_marking || 0,
        }));
      }

      if (editingQuiz) {
        await apiClient.updateQuiz(editingQuiz.id, quizData);
        toast({ title: "Success", description: "Quiz updated successfully" });
      } else {
        await apiClient.createQuiz(quizData);
        toast({ title: "Success", description: "Quiz created successfully" });
      }

      setQuizDialogOpen(false);
      setEditingQuiz(null);
      resetQuizForm();
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!questionForm.question_text.trim()) {
        toast({
          title: "Validation Error",
          description: "Question text is required",
          variant: "destructive",
        });
        return;
      }

      if (questionForm.question_type === "MCQ") {
        if (!questionForm.option_a || !questionForm.option_b || !questionForm.option_c || !questionForm.option_d) {
          toast({
            title: "Validation Error",
            description: "All 4 options are required for MCQ",
            variant: "destructive",
          });
          return;
        }
      }

      const questionData: any = {
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        correct_answer: questionForm.correct_answer,
        marks: questionForm.marks,
        difficulty: questionForm.difficulty,
        topic: questionForm.topic || undefined,
        subject: questionForm.subject || undefined,
        negative_marking: questionForm.negative_marking,
        is_active: questionForm.is_active,
      };

      if (questionForm.question_type === "MCQ") {
        questionData.options = [
          questionForm.option_a,
          questionForm.option_b,
          questionForm.option_c,
          questionForm.option_d,
        ];
      } else {
        questionData.options = ["True", "False"];
      }

      const API_BASE = getAPIBase();
      const response = await fetch(`${API_BASE}/question-banks`, {
        method: editingQuestion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(editingQuestion ? { ...questionData, id: editingQuestion.id } : questionData),
      });

      if (!response.ok) {
        throw new Error("Failed to save question");
      }

      toast({
        title: "Success",
        description: editingQuestion ? "Question updated successfully" : "Question added to bank",
      });

      setQuestionBankDialogOpen(false);
      setEditingQuestion(null);
      resetQuestionForm();
      fetchQuestionBank();
    } catch (error: any) {
      console.error("Error creating question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create question",
        variant: "destructive",
      });
    }
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: "",
      description: "",
      subject: "",
      duration_minutes: 30,
      total_marks: 100,
      passing_marks: 50,
      start_time: "",
      end_time: "",
      expiry_date: "",
      assigned_branches: [],
      assigned_sections: [],
      assign_to_all: false,
      allow_negative_marking: false,
      shuffle_questions: false,
      shuffle_options: false,
      status: "draft",
      use_question_bank: false,
      question_bank_ids: [],
      use_random_questions: false,
      random_question_count: 10,
      questions: [],
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: "",
      question_type: "MCQ",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      marks: 1,
      difficulty: "medium",
      topic: "",
      subject: "",
      negative_marking: 0.0,
      is_active: true,
    });
  };

  const addManualQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        {
          question: "",
          question_type: "mcq",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          correct_answer: "A",
          marks: 1,
          negative_marking: 0,
        },
      ],
    });
  };

  const removeManualQuestion = (index: number) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((_, i) => i !== index),
    });
  };

  const updateManualQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizForm.questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizForm({ ...quizForm, questions: updated });
  };

  if (!isAdmin && !isSuperAdmin && !isHod && !isFaculty) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-muted-foreground">Only Admins, HODs, and Faculty can access this page</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage quizzes with Question Bank, bulk assignment, and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab("question-bank")}
          >
            <Database className="h-4 w-4 mr-2" />
            Question Bank
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => {
              resetQuizForm();
              setEditingQuiz(null);
              setQuizDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="quizzes">
            <BookOpen className="h-4 w-4 mr-2" />
            Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="question-bank">
            <Database className="h-4 w-4 mr-2" />
            Question Bank ({questionBank.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Quizzes</CardTitle>
              <CardDescription>Manage quizzes assigned to branches and sections</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No quizzes found. Create your first quiz!
                      </TableCell>
                    </TableRow>
                  ) : (
                    quizzes.map((quiz) => (
                      <TableRow key={quiz.id}>
                        <TableCell className="font-medium">{quiz.title}</TableCell>
                        <TableCell>{quiz.subject || "-"}</TableCell>
                        <TableCell>{quiz.duration_minutes} min</TableCell>
                        <TableCell>{quiz.total_marks}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              quiz.status === "published"
                                ? "default"
                                : quiz.status === "draft"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {quiz.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {quiz.assigned_branches && quiz.assigned_branches.length > 0 ? (
                            <span className="text-sm">
                              {quiz.assigned_branches.length} branch(es)
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>{quiz.attempts_count || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingQuiz(quiz);
                                // Populate form with quiz data
                                setQuizForm({
                                  title: quiz.title,
                                  description: quiz.description || "",
                                  subject: quiz.subject || "",
                                  duration_minutes: quiz.duration_minutes,
                                  total_marks: quiz.total_marks,
                                  passing_marks: quiz.passing_marks || 50,
                                  start_time: quiz.start_time ? new Date(quiz.start_time).toISOString().slice(0, 16) : "",
                                  end_time: quiz.end_time ? new Date(quiz.end_time).toISOString().slice(0, 16) : "",
                                  expiry_date: quiz.expiry_date ? new Date(quiz.expiry_date).toISOString().slice(0, 16) : "",
                                  assigned_branches: quiz.assigned_branches || [],
                                  assigned_sections: quiz.assigned_sections || [],
                                  assign_to_all: false,
                                  allow_negative_marking: quiz.allow_negative_marking,
                                  shuffle_questions: quiz.shuffle_questions,
                                  shuffle_options: quiz.shuffle_options,
                                  status: quiz.status,
                                  use_question_bank: false,
                                  question_bank_ids: [],
                                  use_random_questions: false,
                                  random_question_count: 10,
                                  questions: quiz.questions || [],
                                });
                                setQuizDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this quiz?")) {
                                  try {
                                    await apiClient.deleteQuiz(quiz.id);
                                    toast({ title: "Success", description: "Quiz deleted" });
                                    fetchQuizzes();
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete quiz",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="question-bank" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Question Bank</CardTitle>
                  <CardDescription>Reusable questions for quiz creation</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetQuestionForm();
                    setEditingQuestion(null);
                    setQuestionBankDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionBank.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No questions in bank. Add your first question!
                      </TableCell>
                    </TableRow>
                  ) : (
                    questionBank.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-md truncate">{q.question_text}</TableCell>
                        <TableCell>
                          <Badge variant={q.question_type === "MCQ" ? "default" : "secondary"}>
                            {q.question_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{q.marks}</TableCell>
                        <TableCell>{q.difficulty || "-"}</TableCell>
                        <TableCell>{q.subject || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingQuestion(q);
                                setQuestionForm({
                                  question_text: q.question_text,
                                  question_type: q.question_type,
                                  option_a: q.options?.[0] || "",
                                  option_b: q.options?.[1] || "",
                                  option_c: q.options?.[2] || "",
                                  option_d: q.options?.[3] || "",
                                  correct_answer: q.correct_answer,
                                  marks: q.marks,
                                  difficulty: (q.difficulty as any) || "medium",
                                  topic: q.topic || "",
                                  subject: q.subject || "",
                                  negative_marking: q.negative_marking,
                                  is_active: q.is_active,
                                });
                                setQuestionBankDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (confirm("Delete this question?")) {
                                  try {
                                    const API_BASE = getAPIBase();
                                    const response = await fetch(
                                      `${API_BASE}/question-banks/${q.id}`,
                                      {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                                        },
                                      }
                                    );
                                    if (response.ok) {
                                      toast({ title: "Success", description: "Question deleted" });
                                      fetchQuestionBank();
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete question",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizzes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quizzes.reduce((sum, q) => sum + (q.attempts_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quizzes.length > 0
                    ? (
                        quizzes.reduce((sum, q) => sum + (q.average_score || 0), 0) / quizzes.length
                      ).toFixed(1)
                    : "0"}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Pass %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell className="font-medium">{quiz.title}</TableCell>
                      <TableCell>{quiz.attempts_count || 0}</TableCell>
                      <TableCell>{quiz.average_score?.toFixed(1) || "-"}%</TableCell>
                      <TableCell>{quiz.pass_percentage?.toFixed(1) || "-"}%</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const API_BASE = getAPIBase();
                              const response = await fetch(
                                `${API_BASE}/quiz-analytics/quiz/${quiz.id}/export`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                                  },
                                }
                              );
                              if (response.ok) {
                                const data = await response.json();
                                // Create download
                                const blob = new Blob([data.csv_data], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = data.filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                toast({ title: "Success", description: "Results exported" });
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to export results",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quiz Creation/Edit Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create New Quiz"}</DialogTitle>
            <DialogDescription>
              Create a quiz and assign it to branches and sections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  placeholder="Quiz description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={quizForm.subject}
                    onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                    placeholder="e.g., Mathematics, Programming"
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={quizForm.duration_minutes}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, duration_minutes: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    id="total_marks"
                    type="number"
                    min="1"
                    value={quizForm.total_marks}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, total_marks: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="passing_marks">Passing Marks</Label>
                  <Input
                    id="passing_marks"
                    type="number"
                    min="0"
                    value={quizForm.passing_marks}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, passing_marks: parseInt(e.target.value) || 50 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={quizForm.start_time}
                    onChange={(e) => setQuizForm({ ...quizForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={quizForm.end_time}
                    onChange={(e) => setQuizForm({ ...quizForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="datetime-local"
                  value={quizForm.expiry_date}
                  onChange={(e) => setQuizForm({ ...quizForm, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Assignment */}
            <div className="space-y-4">
              {(isAdmin || isSuperAdmin) && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assign_to_all"
                    checked={quizForm.assign_to_all}
                    onCheckedChange={(checked) =>
                      setQuizForm({ ...quizForm, assign_to_all: checked as boolean })
                    }
                  />
                  <Label htmlFor="assign_to_all" className="font-medium">
                    Assign to All Branches and Sections
                  </Label>
                </div>
              )}

              {(isHod || isFaculty) && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assign_to_all_sections"
                    checked={quizForm.assign_to_all}
                    onCheckedChange={(checked) =>
                      setQuizForm({ ...quizForm, assign_to_all: checked as boolean })
                    }
                  />
                  <Label htmlFor="assign_to_all_sections" className="font-medium">
                    {isHod ? "Assign to All Sections in Department" : "Assign to All My Sections"}
                  </Label>
                </div>
              )}

              {!quizForm.assign_to_all && (
                <>
                  {(isAdmin || isSuperAdmin) && (
                    <div>
                      <Label>Select Branches (Departments)</Label>
                      <ScrollArea className="h-32 border rounded-md p-2">
                        {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`branch-${dept.id}`}
                            checked={quizForm.assigned_branches.includes(dept.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setQuizForm({
                                  ...quizForm,
                                  assigned_branches: [...quizForm.assigned_branches, dept.id],
                                });
                              } else {
                                setQuizForm({
                                  ...quizForm,
                                  assigned_branches: quizForm.assigned_branches.filter(
                                    (id) => id !== dept.id
                                  ),
                                  assigned_sections: quizForm.assigned_sections.filter(
                                    (sId) => sections.find((s) => s.id === sId)?.department_id !== dept.id
                                  ),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`branch-${dept.id}`} className="font-normal cursor-pointer">
                            {dept.name} {dept.code && `(${dept.code})`}
                          </Label>
                        </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  <div>
                    <Label>
                      {isAdmin || isSuperAdmin
                        ? "Select Specific Sections (Optional)"
                        : isHod
                        ? "Select Sections in Your Department"
                        : "Select Your Sections"}
                    </Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      {sections
                        .filter((s) => {
                          // For Admin/SuperAdmin: filter by selected branches
                          if (isAdmin || isSuperAdmin) {
                            return (
                              quizForm.assigned_branches.length === 0 ||
                              quizForm.assigned_branches.includes(s.department_id)
                            );
                          }
                          // For HOD/Faculty: show all their sections (already filtered in fetchSections)
                          return true;
                        })
                        .map((section) => (
                          <div key={section.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`section-${section.id}`}
                              checked={quizForm.assigned_sections.includes(section.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setQuizForm({
                                    ...quizForm,
                                    assigned_sections: [...quizForm.assigned_sections, section.id],
                                  });
                                } else {
                                  setQuizForm({
                                    ...quizForm,
                                    assigned_sections: quizForm.assigned_sections.filter(
                                      (id) => id !== section.id
                                    ),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`section-${section.id}`} className="font-normal cursor-pointer">
                              {section.name} - {section.department?.name || ""}
                            </Label>
                          </div>
                        ))}
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Quiz Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold">Quiz Settings</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Negative Marking</Label>
                  <p className="text-sm text-muted-foreground">
                    Deduct marks for wrong answers
                  </p>
                </div>
                <Switch
                  checked={quizForm.allow_negative_marking}
                  onCheckedChange={(checked) =>
                    setQuizForm({ ...quizForm, allow_negative_marking: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shuffle Questions</Label>
                  <p className="text-sm text-muted-foreground">
                    Randomize question order for each student
                  </p>
                </div>
                <Switch
                  checked={quizForm.shuffle_questions}
                  onCheckedChange={(checked) =>
                    setQuizForm({ ...quizForm, shuffle_questions: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shuffle Options</Label>
                  <p className="text-sm text-muted-foreground">
                    Randomize option order for MCQ questions
                  </p>
                </div>
                <Switch
                  checked={quizForm.shuffle_options}
                  onCheckedChange={(checked) =>
                    setQuizForm({ ...quizForm, shuffle_options: checked })
                  }
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={quizForm.status}
                  onValueChange={(value: any) => setQuizForm({ ...quizForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use_question_bank"
                    checked={quizForm.use_question_bank}
                    onCheckedChange={(checked) =>
                      setQuizForm({ ...quizForm, use_question_bank: checked as boolean })
                    }
                  />
                  <Label htmlFor="use_question_bank">Use Question Bank</Label>
                </div>
              </div>

              {quizForm.use_question_bank ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use_random"
                      checked={quizForm.use_random_questions}
                      onCheckedChange={(checked) =>
                        setQuizForm({ ...quizForm, use_random_questions: checked as boolean })
                      }
                    />
                    <Label htmlFor="use_random">Use Random Questions</Label>
                  </div>

                  {quizForm.use_random_questions && (
                    <div>
                      <Label htmlFor="random_count">Number of Random Questions</Label>
                      <Input
                        id="random_count"
                        type="number"
                        min="1"
                        value={quizForm.random_question_count}
                        onChange={(e) =>
                          setQuizForm({
                            ...quizForm,
                            random_question_count: parseInt(e.target.value) || 10,
                          })
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label>Select Questions from Bank</Label>
                    <ScrollArea className="h-64 border rounded-md p-4">
                      <div className="space-y-2">
                        {questionBank.map((q) => (
                          <div key={q.id} className="flex items-start space-x-2 p-2 border rounded">
                            <Checkbox
                              id={`qb-${q.id}`}
                              checked={quizForm.question_bank_ids.includes(q.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setQuizForm({
                                    ...quizForm,
                                    question_bank_ids: [...quizForm.question_bank_ids, q.id],
                                  });
                                } else {
                                  setQuizForm({
                                    ...quizForm,
                                    question_bank_ids: quizForm.question_bank_ids.filter(
                                      (id) => id !== q.id
                                    ),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`qb-${q.id}`} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium">{q.question_text}</div>
                              <div className="text-xs text-muted-foreground">
                                {q.question_type} • {q.marks} marks • {q.difficulty || "medium"}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={addManualQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setQuestionUploadDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Upload Questions
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const API_BASE = getAPIBase();
                            const response = await fetch(`${API_BASE}/bulk-upload/templates/questions?format=xlsx`, {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                              },
                            });
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = 'question_upload_template.xlsx';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              toast({ title: "Success", description: "Template downloaded" });
                            }
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: "Failed to download template",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {quizForm.questions.length} question{quizForm.questions.length !== 1 ? 's' : ''} added
                    </div>
                  </div>

                  {quizForm.questions.map((q, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Question {idx + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualQuestion(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Question Type</Label>
                          <Select
                            value={q.question_type || "mcq"}
                            onValueChange={(value) =>
                              updateManualQuestion(idx, "question_type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">MCQ</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Question Text *</Label>
                          <Textarea
                            value={q.question || ""}
                            onChange={(e) => updateManualQuestion(idx, "question", e.target.value)}
                            placeholder="Enter question"
                            rows={2}
                          />
                        </div>

                        {q.question_type === "mcq" ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Option A *</Label>
                                <Input
                                  value={q.option_a || ""}
                                  onChange={(e) => updateManualQuestion(idx, "option_a", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Option B *</Label>
                                <Input
                                  value={q.option_b || ""}
                                  onChange={(e) => updateManualQuestion(idx, "option_b", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Option C *</Label>
                                <Input
                                  value={q.option_c || ""}
                                  onChange={(e) => updateManualQuestion(idx, "option_c", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Option D *</Label>
                                <Input
                                  value={q.option_d || ""}
                                  onChange={(e) => updateManualQuestion(idx, "option_d", e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Correct Answer</Label>
                              <Select
                                value={q.correct_answer || "A"}
                                onValueChange={(value) =>
                                  updateManualQuestion(idx, "correct_answer", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label>Correct Answer</Label>
                            <Select
                              value={q.is_true ? "true" : "false"}
                              onValueChange={(value) =>
                                updateManualQuestion(idx, "is_true", value === "true")
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Marks</Label>
                            <Input
                              type="number"
                              min="1"
                              value={q.marks || 1}
                              onChange={(e) =>
                                updateManualQuestion(idx, "marks", parseInt(e.target.value) || 1)
                              }
                            />
                          </div>
                          {quizForm.allow_negative_marking && (
                            <div>
                              <Label>Negative Marking</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={q.negative_marking || 0}
                                onChange={(e) =>
                                  updateManualQuestion(
                                    idx,
                                    "negative_marking",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuiz}>
              {editingQuiz ? "Update Quiz" : "Create Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Bank Dialog */}
      <Dialog open={questionBankDialogOpen} onOpenChange={setQuestionBankDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add Question to Bank"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable question for quiz creation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="qb_question_text">Question Text *</Label>
              <Textarea
                id="qb_question_text"
                value={questionForm.question_text}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, question_text: e.target.value })
                }
                placeholder="Enter question"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="qb_question_type">Question Type *</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value: any) =>
                  setQuestionForm({ ...questionForm, question_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {questionForm.question_type === "MCQ" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qb_option_a">Option A *</Label>
                    <Input
                      id="qb_option_a"
                      value={questionForm.option_a}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, option_a: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="qb_option_b">Option B *</Label>
                    <Input
                      id="qb_option_b"
                      value={questionForm.option_b}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, option_b: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="qb_option_c">Option C *</Label>
                    <Input
                      id="qb_option_c"
                      value={questionForm.option_c}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, option_c: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="qb_option_d">Option D *</Label>
                    <Input
                      id="qb_option_d"
                      value={questionForm.option_d}
                      onChange={(e) =>
                        setQuestionForm({ ...questionForm, option_d: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="qb_correct_answer_mcq">Correct Answer</Label>
                  <Select
                    value={questionForm.correct_answer}
                    onValueChange={(value) =>
                      setQuestionForm({ ...questionForm, correct_answer: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="qb_correct_answer_tf">Correct Answer</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) =>
                    setQuestionForm({ ...questionForm, correct_answer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qb_marks">Marks</Label>
                <Input
                  id="qb_marks"
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="qb_negative_marking">Negative Marking</Label>
                <Input
                  id="qb_negative_marking"
                  type="number"
                  min="0"
                  step="0.1"
                  value={questionForm.negative_marking}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      negative_marking: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qb_difficulty">Difficulty</Label>
                <Select
                  value={questionForm.difficulty}
                  onValueChange={(value: any) =>
                    setQuestionForm({ ...questionForm, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qb_subject">Subject</Label>
                <Input
                  id="qb_subject"
                  value={questionForm.subject}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, subject: e.target.value })
                  }
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="qb_topic">Topic</Label>
              <Input
                id="qb_topic"
                value={questionForm.topic}
                onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                placeholder="e.g., Algebra, OOP"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionBankDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuestion}>
              {editingQuestion ? "Update Question" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Quizzes</DialogTitle>
            <DialogDescription>
              Upload quizzes from Excel, CSV, or JSON file. Supports all quiz features including bulk assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-upload-file">Select File</Label>
              <div className="mt-2">
                <Input
                  id="bulk-upload-file"
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBulkUploadFile(file);
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">File Format:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Required columns: title, duration_minutes, total_marks
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Optional columns: description, subject, passing_marks, start_time, end_time, expiry_date, 
                allow_negative_marking, shuffle_questions, shuffle_options, status, assigned_branches (comma-separated IDs), 
                assigned_sections (comma-separated IDs)
              </p>
              <p className="text-sm text-muted-foreground">
                Questions can be included as JSON in a "questions" column, or use Question Bank IDs in "question_bank_ids" column.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const API_BASE = getAPIBase();
                    const response = await fetch(`${API_BASE}/bulk-upload/templates/quiz?format=xlsx`, {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                      },
                    });
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'quiz_bulk_upload_template.xlsx';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast({ title: "Success", description: "Template downloaded" });
                    } else {
                      const error = await response.json();
                      throw new Error(error.detail || 'Download failed');
                    }
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to download template",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!bulkUploadFile) {
                  toast({
                    title: "Error",
                    description: "Please select a file",
                    variant: "destructive",
                  });
                  return;
                }

                setBulkUploadLoading(true);
                try {
                  const formData = new FormData();
                  formData.append('file', bulkUploadFile);

                  const API_BASE = getAPIBase();
                  const response = await fetch(`${API_BASE}/bulk-upload/quizzes`, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    },
                    body: formData,
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Upload failed');
                  }

                  const result = await response.json();
                  toast({
                    title: "Success",
                    description: result.message || `Uploaded ${result.success_count} quizzes successfully`,
                  });

                  if (result.failed_count > 0) {
                    console.error("Failed quizzes:", result.failed);
                  }

                  setBulkUploadDialogOpen(false);
                  setBulkUploadFile(null);
                  fetchQuizzes();
                } catch (error: any) {
                  console.error("Bulk upload error:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to upload quizzes",
                    variant: "destructive",
                  });
                } finally {
                  setBulkUploadLoading(false);
                }
              }}
              disabled={!bulkUploadFile || bulkUploadLoading}
            >
              {bulkUploadLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Upload Dialog (for quiz-specific questions) */}
      <Dialog open={questionUploadDialogOpen} onOpenChange={setQuestionUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Questions to Quiz</DialogTitle>
            <DialogDescription>
              Upload questions directly to this quiz. These questions will NOT be added to the Question Bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="question-upload-file">Select File</Label>
              <div className="mt-2">
                <Input
                  id="question-upload-file"
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setQuestionUploadFile(file);
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">File Format:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Required columns: question, question_type
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                For MCQ: option_a, option_b, option_c, option_d, correct_answer (A/B/C/D)
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                For True/False: is_true (true/false) or correct_answer (A=True, B=False)
              </p>
              <p className="text-sm text-muted-foreground">
                Optional: marks (default: 1), negative_marking (default: 0), timer_seconds
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!questionUploadFile) {
                  toast({
                    title: "Error",
                    description: "Please select a file",
                    variant: "destructive",
                  });
                  return;
                }

                setQuestionUploadLoading(true);
                try {
                  // Parse file client-side
                  const fileExt = questionUploadFile.name.toLowerCase().split('.').pop();
                  let parsedQuestions: any[] = [];

                  if (fileExt === 'json') {
                    const text = await questionUploadFile.text();
                    parsedQuestions = JSON.parse(text);
                    if (!Array.isArray(parsedQuestions)) {
                      throw new Error("JSON must be an array of question objects");
                    }
                  } else if (fileExt === 'csv') {
                    // Use backend API for CSV parsing (handles quoted values properly)
                    const formData = new FormData();
                    formData.append('file', questionUploadFile);
                    
                    const API_BASE = getAPIBase();
                    const response = await fetch(`${API_BASE}/bulk-upload/questions`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                      },
                      body: formData,
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.detail || 'Failed to parse questions');
                    }

                    const result = await response.json();
                    if (result.errors && result.errors.length > 0) {
                      console.warn("Question parsing errors:", result.errors);
                      toast({
                        title: "Warning",
                        description: `${result.questions.length} questions parsed, ${result.errors.length} errors. Check console for details.`,
                        variant: "default",
                      });
                    }
                    parsedQuestions = result.questions || [];
                  } else if (fileExt === 'xlsx' || fileExt === 'xls') {
                    // Use the backend API to parse Excel (more reliable)
                    const formData = new FormData();
                    formData.append('file', questionUploadFile);
                    
                    const API_BASE = getAPIBase();
                    const response = await fetch(`${API_BASE}/bulk-upload/questions`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                      },
                      body: formData,
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.detail || 'Failed to parse questions');
                    }

                    const result = await response.json();
                    if (result.errors && result.errors.length > 0) {
                      console.warn("Question parsing errors:", result.errors);
                      toast({
                        title: "Warning",
                        description: `${result.questions.length} questions parsed, ${result.errors.length} errors. Check console for details.`,
                        variant: "default",
                      });
                    }
                    parsedQuestions = result.questions || [];
                  } else {
                    throw new Error("Unsupported file format");
                  }

                  if (parsedQuestions.length === 0) {
                    throw new Error("No valid questions found in file");
                  }

                  // Convert parsed questions to quiz question format
                  // The backend already returns questions in the correct format, but we ensure all fields are present
                  const convertedQuestions = parsedQuestions.map((q: any) => {
                    const questionType = (q.question_type || q.questiontype || 'mcq').toLowerCase();
                    const questionObj: any = {
                      question: q.question || q.question_text || '',
                      question_type: questionType,
                      marks: q.marks !== undefined && q.marks !== null 
                        ? (typeof q.marks === 'string' ? parseInt(q.marks) || 1 : (typeof q.marks === 'number' ? q.marks : 1))
                        : 1,
                      negative_marking: q.negative_marking !== undefined && q.negative_marking !== null 
                        ? (typeof q.negative_marking === 'string' ? parseFloat(q.negative_marking) || 0 : (typeof q.negative_marking === 'number' ? q.negative_marking : 0))
                        : 0,
                      timer_seconds: q.timer_seconds !== undefined && q.timer_seconds !== null
                        ? (typeof q.timer_seconds === 'string' ? parseInt(q.timer_seconds) : (typeof q.timer_seconds === 'number' ? q.timer_seconds : undefined))
                        : undefined,
                    };

                    if (questionType === 'mcq') {
                      questionObj.option_a = q.option_a || '';
                      questionObj.option_b = q.option_b || '';
                      questionObj.option_c = q.option_c || '';
                      questionObj.option_d = q.option_d || '';
                      questionObj.correct_answer = (q.correct_answer || 'A').toUpperCase();
                    } else if (questionType === 'true_false' || questionType === 'truefalse') {
                      // Handle both is_true and correct_answer formats
                      if (q.is_true !== undefined && q.is_true !== null && q.is_true !== '') {
                        const isTrue = typeof q.is_true === 'string' 
                          ? q.is_true.toLowerCase() === 'true' || q.is_true === '1' || q.is_true.toLowerCase() === 't'
                          : Boolean(q.is_true);
                        questionObj.is_true = isTrue;
                        questionObj.correct_answer = isTrue ? 'True' : 'False';
                      } else if (q.correct_answer) {
                        const correctAnswer = String(q.correct_answer).toUpperCase();
                        if (correctAnswer === 'A' || correctAnswer === 'TRUE' || correctAnswer === 'T') {
                          questionObj.is_true = true;
                          questionObj.correct_answer = 'True';
                        } else {
                          questionObj.is_true = false;
                          questionObj.correct_answer = 'False';
                        }
                      } else {
                        questionObj.is_true = true;
                        questionObj.correct_answer = 'True';
                      }
                    } else if (questionType === 'fill_blank' || questionType === 'fillblank') {
                      questionObj.correct_answer_text = q.correct_answer_text || q.correct_answer || '';
                    }

                    return questionObj;
                  });

                  // Add to quiz form
                  setQuizForm({
                    ...quizForm,
                    questions: [...quizForm.questions, ...convertedQuestions],
                  });

                  toast({
                    title: "Success",
                    description: `Added ${convertedQuestions.length} questions to quiz`,
                  });

                  setQuestionUploadDialogOpen(false);
                  setQuestionUploadFile(null);
                } catch (error: any) {
                  console.error("Question upload error:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to upload questions",
                    variant: "destructive",
                  });
                } finally {
                  setQuestionUploadLoading(false);
                }
              }}
              disabled={!questionUploadFile || questionUploadLoading}
            >
              {questionUploadLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
