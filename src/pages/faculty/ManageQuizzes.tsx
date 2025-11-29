import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FileQuestion, Loader2, Upload, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileUpload } from "@/components/ui/file-upload";
import { QuestionBuilder, Question } from "@/components/quiz/QuestionBuilder";

interface Quiz {
  id: number;
  title: string;
  description?: string;
  subject?: string;
  duration_minutes: number;
  total_marks: number;
  is_active: boolean;
  created_at?: string;
  questions?: Question[] | Array<any>;
}

export default function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    duration_minutes: 30,
    total_marks: 100,
    expiry_date: "",
    scope_type: "section" as "college" | "department" | "section",
    section_id: undefined as number | undefined,
    year: "",
    questions: [] as Question[],
    code_snippet: "",
    per_question_timer_enabled: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
    fetchUserInfo();
    fetchSections();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      setUserProfile(profile);
      const roles = await apiClient.getCurrentUserRoles();
      setUserRoles(roles.map((r: any) => r.role));
      
      // Set default scope based on role
      if (roles.some((r: any) => r.role === "admin")) {
        setFormData(prev => ({ ...prev, scope_type: "college" }));
      } else if (roles.some((r: any) => r.role === "hod")) {
        setFormData(prev => ({ ...prev, scope_type: "department" }));
      } else {
        setFormData(prev => ({ ...prev, scope_type: "section" }));
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.college_id) {
        const data = await apiClient.getSections(profile.college_id);
        setSections(data || []);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listQuizzes({ is_active: true });
      setQuizzes(data || []);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to load quizzes. Note: Only super admins can manage quizzes.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Quiz title is required", variant: "destructive" });
      return;
    }

    if (formData.questions.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one question to the quiz", 
        variant: "destructive" 
      });
      return;
    }
    
    // Auto-calculate total marks from questions
    const calculatedMarks = formData.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    // Build question_timers object from questions with timers
    const questionTimers: Record<string, number> = {};
    formData.questions.forEach((q, index) => {
      if (q.timer_seconds && q.timer_seconds > 0) {
        questionTimers[index.toString()] = q.timer_seconds;
      }
    });
    
    try {
      const quizData: any = {
        title: formData.title,
        description: formData.description || undefined,
        subject: formData.subject || undefined,
        duration_minutes: formData.duration_minutes,
        total_marks: calculatedMarks || formData.total_marks,
        questions: formData.questions.map(q => ({
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
        scope_type: formData.scope_type,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
        code_snippet: formData.code_snippet || undefined,
        question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
        per_question_timer_enabled: formData.per_question_timer_enabled || Object.keys(questionTimers).length > 0,
      };
      
      // Add scope-specific fields
      if (userProfile?.college_id) {
        quizData.college_id = userProfile.college_id;
      }
      if (userProfile?.department) {
        quizData.department = userProfile.department;
      }
      if (formData.scope_type === "section" && formData.section_id) {
        quizData.section_id = formData.section_id;
      }
      // Year is important for visibility - make it more prominent
      if (formData.year) {
        quizData.year = formData.year;
      } else if (userProfile?.present_year) {
        // Auto-set to current year if not specified
        quizData.year = userProfile.present_year;
      }
      
      await apiClient.createQuiz(quizData);
      
      toast({ title: "Success", description: "Quiz created successfully" });
      setOpen(false);
      setFormData({ 
        title: "", 
        description: "", 
        subject: "", 
        duration_minutes: 30, 
        total_marks: 100,
        expiry_date: "",
        scope_type: formData.scope_type,
        section_id: undefined,
        year: "",
        questions: [],
        code_snippet: "",
        per_question_timer_enabled: false,
      });
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create quiz", 
        variant: "destructive" 
      });
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await apiClient.updateQuiz(id, {
        is_active: !currentStatus
      });
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error updating quiz:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update quiz", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      await apiClient.deleteQuiz(id);
      toast({ title: "Success", description: "Quiz deleted successfully" });
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete quiz", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Quizzes</h1>
        <div className="flex gap-2">
          <FileUpload
            endpoint="/bulk-upload/quizzes"
            accept=".xlsx,.xls,.csv,.json"
            label="Bulk Upload"
            description="Upload quizzes from Excel/CSV/JSON"
            onSuccess={() => {
              toast({ title: "Success", description: "Quizzes uploaded successfully" });
              fetchQuizzes();
            }}
            onError={(error) => {
              toast({ 
                title: "Upload Error", 
                description: error.message || "Failed to upload quizzes",
                variant: "destructive"
              });
            }}
          />
          <Button variant="outline" onClick={() => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1';
            window.open(`${apiBaseUrl}/bulk-upload/templates/quiz?format=xlsx`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Quiz Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.total_marks}
                      onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 100 })}
                      required
                    />
                  </div>
                </div>
                
                {/* Scope Selection */}
                <div>
                  <Label>Scope</Label>
                  <Select 
                    value={formData.scope_type} 
                    onValueChange={(value: "college" | "department" | "section") => {
                      setFormData({ ...formData, scope_type: value, section_id: undefined });
                    }}
                    disabled={userRoles.includes("super_admin")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.includes("admin") && <SelectItem value="college">Entire College</SelectItem>}
                      {(userRoles.includes("admin") || userRoles.includes("hod")) && (
                        <SelectItem value="department">Department/Year</SelectItem>
                      )}
                      <SelectItem value="section">Specific Section</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.scope_type === "college" && "Visible to all students in your college"}
                    {formData.scope_type === "department" && "Visible to students in your department and year"}
                    {formData.scope_type === "section" && "Visible to students in selected section"}
                  </p>
                </div>

                {/* Section Selection (for faculty) */}
                {formData.scope_type === "section" && (
                  <div>
                    <Label>Section</Label>
                    <Select 
                      value={formData.section_id?.toString() || ""} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, section_id: value ? parseInt(value) : undefined });
                      }}
                      required={formData.scope_type === "section"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id.toString()}>
                            {section.name} {section.year && `(${section.year})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Year Selection - Available for all scope types */}
                <div>
                  <Label>Year *</Label>
                  <Select 
                    value={formData.year || userProfile?.present_year || ""} 
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
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
                    {formData.scope_type === "college" && " (across your entire college)"}
                    {formData.scope_type === "department" && " (in your department)"}
                    {formData.scope_type === "section" && " (in the selected section)"}
                  </p>
                </div>

                {/* Expiry Date */}
                <div>
                  <Label>Expiry Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Quiz will be hidden after this date
                  </p>
                </div>

                {/* Code Snippet Section */}
                <div className="border-t pt-4">
                  <Label>Code Snippet (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Display code before questions. Students will see this code and answer questions based on it.
                  </p>
                  <Textarea
                    value={formData.code_snippet}
                    onChange={(e) => setFormData({ ...formData, code_snippet: e.target.value })}
                    rows={8}
                    placeholder="// Enter code here&#10;function example() {&#10;  return 'Hello World';&#10;}"
                    className="font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="per-question-timer"
                      checked={formData.per_question_timer_enabled}
                      onChange={(e) => setFormData({ ...formData, per_question_timer_enabled: e.target.checked })}
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
                    questions={formData.questions}
                    onChange={(questions) => {
                      setFormData({ ...formData, questions });
                      // Auto-update total marks
                      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
                      setFormData(prev => ({ ...prev, total_marks: totalMarks }));
                    }}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={formData.questions.length === 0}
                >
                  Create Quiz {formData.questions.length > 0 && `(${formData.questions.length} questions)`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading quizzes...</p>
            </CardContent>
          </Card>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quizzes yet. Create your first quiz!</p>
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{quiz.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    {quiz.subject && <span>Subject: {quiz.subject}</span>}
                    <span>Duration: {quiz.duration_minutes} min</span>
                    <span>Marks: {quiz.total_marks}</span>
                    {quiz.questions && <span>Questions: {quiz.questions.length}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={quiz.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleActive(quiz.id, quiz.is_active)}
                  >
                    {quiz.is_active ? "Active" : "Inactive"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/faculty/quiz/${quiz.id}/questions`)}>
                    <FileQuestion className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(quiz.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
