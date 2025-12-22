import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FileQuestion, Loader2, Clock, Users, Calendar, BookOpen, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  start_time?: string;
  expiry_date?: string;
  questions?: Question[] | Array<any>;
  year?: string;
  section_id?: number;
  scope_type?: string;
  per_question_timer_enabled?: boolean;
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
    start_time: "",
    section_id: undefined as number | undefined,
    year: "",
    questions: [] as Question[],
    code_snippet: "",
    per_question_timer_enabled: false,
    timer_enabled: true, // Overall quiz timer
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
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.college_id) {
        // Fetch all sections from the college (and department if faculty has one)
        // The backend will automatically filter based on user role
        const data = await apiClient.getSections(profile.college_id, undefined, undefined, false);
        // Sort sections by year, then department, then name for better organization
        const sortedSections = (data || []).sort((a: any, b: any) => {
          // First sort by year
          const yearA = a.year || '';
          const yearB = b.year || '';
          if (yearA !== yearB) return yearA.localeCompare(yearB);
          
          // Then by department name
          const deptA = a.department_name || '';
          const deptB = b.department_name || '';
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          
          // Finally by section name
          return (a.name || '').localeCompare(b.name || '');
        });
        setSections(sortedSections);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      // Request college-scoped quizzes so faculty can see all quizzes in their college
      const data = await apiClient.listQuizzes({ is_active: true, scope_type: 'college' });
      setQuizzes(data || []);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to load quizzes.", 
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

    if (!formData.section_id || !formData.year) {
      toast({ 
        title: "Error", 
        description: "Please select both section and year to assign this quiz", 
        variant: "destructive" 
      });
      return;
    }

    if (!formData.start_time) {
      toast({ 
        title: "Error", 
        description: "Please set a start time for when the quiz will be available", 
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
        duration_minutes: formData.timer_enabled ? formData.duration_minutes : 0, // 0 means no timer
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
        scope_type: "section", // Always section-level for faculty
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : undefined,
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
      if (formData.section_id) {
        quizData.section_id = formData.section_id;
      }
      if (formData.year) {
        quizData.year = formData.year;
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
        start_time: "",
        section_id: undefined,
        year: "",
        questions: [],
        code_snippet: "",
        per_question_timer_enabled: false,
        timer_enabled: true,
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

  const getSectionName = (sectionId?: number) => {
    if (!sectionId) return "N/A";
    const section = sections.find(s => s.id === sectionId);
    return section ? `${section.name}${section.year ? ` (${section.year})` : ''}` : "Unknown";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileQuestion className="h-8 w-8 text-primary" />
            Manage Quizzes
          </h1>
          <p className="text-muted-foreground mt-1">Create and assign quizzes to your classes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create New Quiz</DialogTitle>
                <p className="text-sm text-muted-foreground">Assign quiz to specific class (year + section)</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Quiz Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Data Structures Midterm Exam"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Brief description of the quiz"
                    />
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Data Structures"
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
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-calculated from questions</p>
                  </div>
                </div>

                {/* Assignment Section - Year and Section */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Assign to Class</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Section *</Label>
                      <Select 
                        value={formData.section_id?.toString() || ""} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, section_id: value ? parseInt(value) : undefined });
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {sections.length === 0 ? (
                            <SelectItem value="" disabled>No sections available</SelectItem>
                          ) : (
                            sections.map((section) => {
                              const displayName = `${section.name}${section.year ? ` - ${section.year}` : ''}${section.department_name ? ` (${section.department_name})` : ''}`;
                              return (
                                <SelectItem key={section.id} value={section.id.toString()}>
                                  {displayName}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Only students in this section will see this quiz. All available sections from your college/department are shown.
                      </p>
                    </div>
                    <div>
                      <Label>Year *</Label>
                      <Select 
                        value={formData.year || ""} 
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
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Assignment Info:</strong> This quiz will be visible only to students in <strong>{getSectionName(formData.section_id)}</strong> section of <strong>{formData.year || "selected"} year</strong>.
                    </p>
                  </div>
                </div>

                {/* Timer Settings */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Timer className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Timer Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="timer-enabled" className="text-base font-medium cursor-pointer">
                          Enable Quiz Timer
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Set a time limit for the entire quiz
                        </p>
                      </div>
                      <Switch
                        id="timer-enabled"
                        checked={formData.timer_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, timer_enabled: checked })}
                      />
                    </div>
                    {formData.timer_enabled && (
                      <div>
                        <Label>Duration (minutes) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                          required={formData.timer_enabled}
                          className="max-w-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Students will have this much time to complete the quiz
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="per-question-timer" className="text-base font-medium cursor-pointer">
                          Enable Per-Question Timer
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Set individual timers for each question (configured in question builder)
                        </p>
                      </div>
                      <Switch
                        id="per-question-timer"
                        checked={formData.per_question_timer_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, per_question_timer_enabled: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Schedule</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Quiz will be available to students starting from this date and time
                      </p>
                    </div>
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
                  </div>
                </div>

                {/* Code Snippet Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Code Snippet (Optional)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Display code before questions. Students will see this code and answer questions based on it.
                  </p>
                  <Textarea
                    value={formData.code_snippet}
                    onChange={(e) => setFormData({ ...formData, code_snippet: e.target.value })}
                    rows={8}
                    placeholder="// Enter code here&#10;function example() {&#10;  return 'Hello World';&#10;}"
                    className="font-mono text-sm"
                  />
                </div>

                {/* Question Builder */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Questions</h3>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {formData.questions.length} question{formData.questions.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
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

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                    disabled={formData.questions.length === 0 || !formData.section_id || !formData.year}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create & Assign Quiz {formData.questions.length > 0 && `(${formData.questions.length} questions)`}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading quizzes...</p>
            </CardContent>
          </Card>
        ) : quizzes.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground mb-4">Create your first quiz and assign it to a class</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-all border-2 hover:border-primary/50 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="text-lg leading-tight flex-1">{quiz.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => toggleActive(quiz.id, quiz.is_active)}
                      title={quiz.is_active ? "Deactivate" : "Activate"}
                    >
                      {quiz.is_active ? (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDelete(quiz.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quiz.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {quiz.subject && (
                    <Badge variant="secondary" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {quiz.subject}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {quiz.duration_minutes} min
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {quiz.total_marks} marks
                  </Badge>
                  {quiz.questions && (
                    <Badge variant="outline" className="text-xs">
                      {quiz.questions.length} Q
                    </Badge>
                  )}
                  {quiz.year && (
                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                      {quiz.year}
                    </Badge>
                  )}
                  {quiz.section_id && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                      {getSectionName(quiz.section_id)}
                    </Badge>
                  )}
                  {quiz.scope_type && (
                    <Badge 
                      variant={quiz.scope_type === "svnapro" ? "default" : "secondary"}
                      className={`text-xs ${quiz.scope_type === "svnapro" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
                    >
                      {quiz.scope_type === "svnapro" ? "SvnaPro" : "College"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {quiz.created_at && new Date(quiz.created_at).toLocaleDateString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Quiz Details",
                          description: `${quiz.title} - ${quiz.questions?.length || 0} questions, ${quiz.total_marks} marks`,
                        });
                      }}
                    >
                      <FileQuestion className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </div>
                  {quiz.start_time && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Available from: </span>
                      <span className={new Date(quiz.start_time) > new Date() ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                        {new Date(quiz.start_time).toLocaleString()}
                        {new Date(quiz.start_time) > new Date() && " (Upcoming)"}
                        {new Date(quiz.start_time) <= new Date() && " (Available)"}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
