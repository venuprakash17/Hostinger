import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FileQuestion, Loader2, Clock, Users, Calendar, BookOpen, Timer, GraduationCap } from "lucide-react";
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
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
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
    selectedSectionIds: [] as number[], // Multi-select sections (optional)
    year: "",
    selectedYears: [] as string[], // Multi-select years (required)
    questions: [] as Question[],
    code_snippet: "",
    per_question_timer_enabled: false,
    timer_enabled: true, // Overall quiz timer
    makeAvailableImmediately: false, // Make quiz available immediately
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
      console.log("Profile data:", profile);
      
      if (profile?.college_id) {
        // For faculty, fetch sections from their department
        // Use department_id if available, otherwise filter by department name
        const departmentId = profile.department_id || undefined;
        
        console.log(`Fetching sections for college_id: ${profile.college_id}, department_id: ${departmentId}, department: ${profile.department}`);
        
        // Fetch sections - backend will filter by college, we'll filter by department on frontend
        const data = await apiClient.getSections(profile.college_id, departmentId, undefined, false);
        
        console.log(`Received ${data?.length || 0} sections from API`);
        
        // Filter sections by faculty's department if department is specified
        let filteredSections = data || [];
        if (profile.department && !departmentId) {
          // Filter by department name if we don't have department_id
          filteredSections = filteredSections.filter((section: any) => 
            section.department_name === profile.department
          );
          console.log(`Filtered to ${filteredSections.length} sections for department: ${profile.department}`);
        }
        
        // Sort sections by year, then section name
        const sortedSections = filteredSections.sort((a: any, b: any) => {
          // First sort by year
          const yearA = a.year || '';
          const yearB = b.year || '';
          if (yearA !== yearB) return yearA.localeCompare(yearB);
          
          // Then by section name
          return (a.name || '').localeCompare(b.name || '');
        });
        
        console.log(`Setting ${sortedSections.length} sections. Years found:`, [...new Set(sortedSections.map((s: any) => s.year).filter(Boolean))]);
        setSections(sortedSections);
      } else {
        console.warn("No college_id found in profile");
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to load sections. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  // Group sections by year
  const sectionsByYear = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sections.forEach((section: any) => {
      const year = section.year || 'Other';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(section);
    });
    return grouped;
  }, [sections]);

  // Get available years - use only "1st" format (standardized)
  const availableYears = useMemo(() => {
    // Always provide standard year options in "1st", "2nd", "3rd", "4th" format
    return ['1st', '2nd', '3rd', '4th'];
  }, []);

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

    // Validate selection - must select at least one year
    if (formData.selectedYears.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please select at least one year", 
        variant: "destructive" 
      });
      return;
    }
    
    // If sections are selected, validate they belong to selected years
    // But be lenient - if section doesn't have year info, allow it
    if (formData.selectedSectionIds.length > 0) {
      const invalidSections = formData.selectedSectionIds.filter(sectionId => {
        const section = sections.find((s: any) => s.id === sectionId);
        // If section doesn't exist, it's invalid
        if (!section) return true;
        // If section has no year info, allow it (user explicitly selected it)
        if (!section.year) return false;
        // If section has year info, check if it matches selected years
        return !formData.selectedYears.includes(section.year);
      });
      
      if (invalidSections.length > 0) {
        toast({ 
          title: "Error", 
          description: "Selected sections must belong to the selected years. Please check your selections.", 
          variant: "destructive" 
        });
        return;
      }
    }

    // If not making available immediately, require start time
    if (!formData.makeAvailableImmediately && !formData.start_time) {
      toast({ 
        title: "Error", 
        description: "Please set a start time for when the quiz will be available, or enable 'Make Available Immediately'", 
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
      // If editing, update the quiz
      if (editingQuiz) {
        const quizData: any = {
          title: formData.title,
          description: formData.description || undefined,
          subject: formData.subject || undefined,
          duration_minutes: formData.timer_enabled ? formData.duration_minutes : 0,
          total_marks: calculatedMarks || formData.total_marks,
          questions: formData.questions.map(q => ({
            question: q.question,
            question_type: q.question_type,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            correct_answer_text: q.correct_answer_text,
            is_true: q.is_true,
            marks: q.marks || 1,
            timer_seconds: q.timer_seconds || undefined,
          })),
          expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
          start_time: formData.makeAvailableImmediately ? new Date().toISOString() : (formData.start_time ? new Date(formData.start_time).toISOString() : undefined),
          question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
        };
        
        await apiClient.updateQuiz(editingQuiz.id, quizData);
        toast({ 
          title: "Success", 
          description: "Quiz updated successfully" 
        });
        setOpen(false);
        setEditingQuiz(null);
        setFormData({ 
          title: "", 
          description: "", 
          subject: "", 
          duration_minutes: 30, 
          total_marks: 100,
          expiry_date: "",
          start_time: "",
          section_id: undefined,
          selectedSectionIds: [],
          year: "",
          selectedYears: [],
          questions: [],
          code_snippet: "",
          per_question_timer_enabled: false,
          timer_enabled: true,
        });
        fetchQuizzes();
        return;
      }
      
      // Determine scope and assignment based on selections
      // If only years selected (no sections) → department scope with year(s)
      // If years + sections selected → create quiz for each section
      
      if (formData.selectedSectionIds.length === 0) {
        // No sections selected - assign to all sections in selected year(s)
        // If single year, create one quiz; if multiple years, create one quiz per year
        const yearsToCreate = formData.selectedYears;
        
        if (yearsToCreate.length === 1) {
          // Single year - create one quiz for all sections in that year
      const quizData: any = {
        title: formData.title,
        description: formData.description || undefined,
        subject: formData.subject || undefined,
            duration_minutes: formData.timer_enabled ? formData.duration_minutes : 0,
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
            scope_type: "department", // All sections in the department for this year
            section_id: undefined,
            year: yearsToCreate[0],
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
        start_time: formData.makeAvailableImmediately ? new Date().toISOString() : (formData.start_time ? new Date(formData.start_time).toISOString() : undefined),
        question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
      };
      
      if (userProfile?.college_id) {
        quizData.college_id = userProfile.college_id;
      }
      if (userProfile?.department) {
        quizData.department = userProfile.department;
      }
          
          await apiClient.createQuiz(quizData);
        } else {
          // Multiple years - create one quiz per year
          const quizzesCreated = [];
          
          for (const selectedYear of yearsToCreate) {
            const quizData: any = {
              title: formData.title + (yearsToCreate.length > 1 ? ` (${selectedYear})` : ''),
              description: formData.description || undefined,
              subject: formData.subject || undefined,
              duration_minutes: formData.timer_enabled ? formData.duration_minutes : 0,
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
              scope_type: "department",
              section_id: undefined,
              year: selectedYear,
              expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
              start_time: formData.makeAvailableImmediately ? new Date().toISOString() : (formData.start_time ? new Date(formData.start_time).toISOString() : undefined),
              question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
            };
            
            if (userProfile?.college_id) {
              quizData.college_id = userProfile.college_id;
            }
            if (userProfile?.department) {
              quizData.department = userProfile.department;
      }
      
      await apiClient.createQuiz(quizData);
            quizzesCreated.push(selectedYear);
          }
          
          toast({ 
            title: "Success", 
            description: `Created ${quizzesCreated.length} quiz(es) for ${quizzesCreated.join(', ')} year(s)` 
          });
          setOpen(false);
          setEditingQuiz(null);
          setFormData({ 
            title: "", 
            description: "", 
            subject: "", 
            duration_minutes: 30, 
            total_marks: 100,
            expiry_date: "",
            start_time: "",
            section_id: undefined,
            selectedSectionIds: [],
            year: "",
            selectedYears: [],
            questions: [],
            code_snippet: "",
            per_question_timer_enabled: false,
            timer_enabled: true,
          });
          fetchQuizzes();
          return;
        }
      } else {
        // Specific sections selected - create one quiz per section
        const sectionsToCreate = formData.selectedSectionIds;
        
        for (const sectionIdToUse of sectionsToCreate) {
          const selectedSection = sections.find((s: any) => s.id === sectionIdToUse);
          const quizData: any = {
            title: formData.title + (sectionsToCreate.length > 1 ? ` - ${selectedSection?.name || ''}` : ''),
            description: formData.description || undefined,
            subject: formData.subject || undefined,
            duration_minutes: formData.timer_enabled ? formData.duration_minutes : 0,
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
            scope_type: "section",
            section_id: sectionIdToUse,
            year: selectedSection?.year || undefined,
          expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
          start_time: formData.makeAvailableImmediately ? new Date().toISOString() : (formData.start_time ? new Date(formData.start_time).toISOString() : undefined),
          question_timers: Object.keys(questionTimers).length > 0 ? questionTimers : undefined,
          };
          
          if (userProfile?.college_id) {
            quizData.college_id = userProfile.college_id;
          }
          if (userProfile?.department) {
            quizData.department = userProfile.department;
          }
          
          await apiClient.createQuiz(quizData);
        }
        
        toast({ 
          title: "Success", 
          description: `Created ${sectionsToCreate.length} quiz(es) for selected section(s)` 
        });
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
          selectedSectionIds: [],
          year: "",
          selectedYears: [],
          selectAllYears: false,
          selectAllSectionsForYear: false,
          questions: [],
          code_snippet: "",
          per_question_timer_enabled: false,
          timer_enabled: true,
        });
        fetchQuizzes();
        return;
      }
      
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
        selectedSectionIds: [],
        year: "",
        selectedYears: [],
        selectAllYears: false,
        selectAllSectionsForYear: false,
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

  const handleEdit = async (quiz: Quiz) => {
    try {
      // Fetch full quiz details including questions
      const fullQuiz = await apiClient.getQuiz(quiz.id);
      
      // Normalize year format - convert "1" to "1st", "2" to "2nd", etc.
      const normalizeYear = (year: string | undefined): string => {
        if (!year) return "";
        // If already in "1st" format, return as is
        if (year.includes("st") || year.includes("nd") || year.includes("rd") || year.includes("th")) {
          return year;
        }
        // Convert numeric to ordinal format
        const yearNum = parseInt(year);
        if (yearNum === 1) return "1st";
        if (yearNum === 2) return "2nd";
        if (yearNum === 3) return "3rd";
        if (yearNum === 4) return "4th";
        return year; // Return as is if not 1-4
      };
      
      const normalizedYear = normalizeYear(fullQuiz.year);
      
      // Populate form with quiz data
      setFormData({
        title: fullQuiz.title || "",
        description: fullQuiz.description || "",
        subject: fullQuiz.subject || "",
        duration_minutes: fullQuiz.duration_minutes || 30,
        total_marks: fullQuiz.total_marks || 100,
        expiry_date: fullQuiz.expiry_date ? new Date(fullQuiz.expiry_date).toISOString().split('T')[0] : "",
        start_time: fullQuiz.start_time ? new Date(fullQuiz.start_time).toISOString().slice(0, 16) : "",
        section_id: fullQuiz.section_id,
        selectedSectionIds: fullQuiz.section_id ? [fullQuiz.section_id] : [],
        year: normalizedYear,
        selectedYears: normalizedYear ? [normalizedYear] : [],
        questions: (fullQuiz.questions || []).map((q: any) => ({
          question: q.question || "",
          question_type: q.question_type || "mcq",
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          correct_answer_text: q.correct_answer_text,
          is_true: q.is_true,
          marks: q.marks || 1,
          timer_seconds: q.timer_seconds,
        })) as Question[],
        code_snippet: fullQuiz.code_snippet || "",
        per_question_timer_enabled: fullQuiz.per_question_timer_enabled || false,
        timer_enabled: (fullQuiz.duration_minutes || 0) > 0,
        makeAvailableImmediately: false, // Reset when editing
      });
      
      setEditingQuiz(fullQuiz);
      setOpen(true);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quiz",
        variant: "destructive",
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

  // getSectionName removed - sections are no longer used for quiz assignment

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

                {/* Assignment Section - Department, Year and Section */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Assign to Class</h3>
                  </div>
                  
                  {/* Department Display */}
                  {userProfile?.department && (
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold">Branch/Department:</Label>
                        <Badge variant="secondary">{userProfile.department}</Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {/* Display all years and sections for the branch */}
                    <div className="space-y-4">
                      {/* Year Selection */}
                      <div className="space-y-2">
                        <Label>Select Year(s) *</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Select year(s) to assign the quiz. If no specific sections are selected, the quiz will be available to all students in the selected year(s).
                        </p>
                        {availableYears.length === 0 ? (
                          <div className="p-4 border border-dashed rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground text-center">
                              No years found in your department. 
                              {sections.length === 0 ? (
                                <span> Please ensure sections are created for your department ({userProfile?.department || 'your branch'}).</span>
                              ) : (
                                <span> Sections exist but may not have year information set.</span>
                              )}
                            </p>
                            {sections.length > 0 && (
                              <p className="text-xs text-muted-foreground text-center mt-2">
                                Found {sections.length} section(s) without year information.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {availableYears.map((year) => (
                              <div key={year} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <Checkbox
                                  id={`year-${year}`}
                                  checked={formData.selectedYears.includes(year)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({
                                        ...formData,
                                        selectedYears: [...formData.selectedYears, year],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        selectedYears: formData.selectedYears.filter(y => y !== year),
                                        // Remove sections from deselected year
                                        selectedSectionIds: formData.selectedSectionIds.filter(id => {
                                          const section = sections.find((s: any) => s.id === id);
                                          return section?.year !== year;
                                        }),
                                      });
                                    }
                                  }}
                                />
                                <Label htmlFor={`year-${year}`} className="cursor-pointer font-medium flex-1">
                                  {year} Year
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                        {formData.selectedYears.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            ✓ {formData.selectedYears.length} year(s) selected
                          </p>
                        )}
                      </div>

                      {/* Section Selection - Optional */}
                      {formData.selectedYears.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Select Specific Sections (Optional)</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                If you select specific sections, the quiz will only be visible to students in those sections. 
                                If no sections are selected, all students in the selected year(s) will see the quiz.
                              </p>
                            </div>
                          </div>
                          
                          {sections.length === 0 ? (
                            <div className="p-4 border border-dashed rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground text-center">
                                No sections found in your department. Please contact your administrator to create sections.
                              </p>
                            </div>
                          ) : (
                            <div className="max-h-80 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/20">
                              {formData.selectedYears.map((selectedYear) => {
                                const yearSections = sectionsByYear[selectedYear] || [];
                                
                                // If no sections for this year but sections exist, show all sections for that year
                                // This handles the case where sections don't have year info set
                                const sectionsToShow = yearSections.length > 0 
                                  ? yearSections 
                                  : (sectionsByYear['Other'] || sections); // Show all sections if year not set
                                
                                if (sectionsToShow.length === 0) {
                                  return (
                                    <div key={selectedYear} className="text-sm text-muted-foreground p-3 bg-background rounded border border-dashed">
                                      No sections found for {selectedYear} Year in your department
                                    </div>
                                  );
                                }
                                
                                return (
                                <div key={selectedYear} className="space-y-3">
                                  <div className="font-semibold text-base text-primary border-b-2 border-primary/30 pb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                      <GraduationCap className="h-4 w-4" />
                                      {selectedYear} Year
                                      {yearSections.length === 0 && sections.length > 0 && (
                                        <span className="text-xs text-muted-foreground font-normal">
                                          (All sections - year info not set)
                                        </span>
                                      )}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        const yearSectionIds = sectionsToShow.map((s: any) => s.id);
                                        const allSelected = yearSectionIds.every((id: number) => 
                                          formData.selectedSectionIds.includes(id)
                                        );
                                        if (allSelected) {
                                          // Deselect all sections from this year
                                          setFormData({
                                            ...formData,
                                            selectedSectionIds: formData.selectedSectionIds.filter(
                                              id => !yearSectionIds.includes(id)
                                            ),
                                          });
                                        } else {
                                          // Select all sections from this year
                                          setFormData({
                                            ...formData,
                                            selectedSectionIds: [
                                              ...formData.selectedSectionIds.filter(
                                                id => !yearSectionIds.includes(id)
                                              ),
                                              ...yearSectionIds,
                                            ],
                                          });
                                        }
                                      }}
                                    >
                                            {sectionsToShow.every((s: any) => 
                                              formData.selectedSectionIds.includes(s.id)
                                            ) ? 'Deselect All' : 'Select All'}
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 ml-2">
                                      {sectionsToShow.map((section: any) => (
                                      <div key={section.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-background transition-colors">
                                        <Checkbox
                                          id={`section-${section.id}`}
                                          checked={formData.selectedSectionIds.includes(section.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setFormData({
                                                ...formData,
                                                selectedSectionIds: [...formData.selectedSectionIds, section.id],
                                              });
                                            } else {
                                              setFormData({
                                                ...formData,
                                                selectedSectionIds: formData.selectedSectionIds.filter(id => id !== section.id),
                                              });
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`section-${section.id}`} className="cursor-pointer text-sm font-medium">
                                          {section.name}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-2">
                                    {sectionsToShow.filter((s: any) => formData.selectedSectionIds.includes(s.id)).length} of {sectionsToShow.length} sections selected
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          )}
                          
                          {formData.selectedSectionIds.length > 0 && (
                            <div className="text-sm font-medium text-primary">
                              ✓ {formData.selectedSectionIds.length} section(s) selected across all years
                            </div>
                          )}
                    </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Assignment Info */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2">
                        Assignment Info:
                      </p>
                      {formData.selectedYears.length === 0 ? (
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Please select at least one year above.
                        </p>
                      ) : formData.selectedSectionIds.length === 0 ? (
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          This quiz will be visible to <strong>all students</strong> in <strong>{formData.selectedYears.join(', ')} year(s)</strong> in your branch/department (all sections).
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            This quiz will be visible to students in <strong>{formData.selectedSectionIds.length} selected section(s)</strong> from <strong>{formData.selectedYears.join(', ')} year(s)</strong>.
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Selected sections: {sections
                              .filter((s: any) => formData.selectedSectionIds.includes(s.id))
                              .map((s: any) => `${s.name} (${s.year})`)
                              .join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
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
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50 mb-4">
                    <Checkbox
                      id="makeAvailableImmediately"
                      checked={formData.makeAvailableImmediately}
                      onCheckedChange={(checked) => {
                        setFormData({ 
                          ...formData, 
                          makeAvailableImmediately: checked === true,
                          // If enabling, clear start_time; if disabling, set to current time as default
                          start_time: checked ? "" : (formData.start_time || new Date().toISOString().slice(0, 16))
                        });
                      }}
                    />
                    <Label htmlFor="makeAvailableImmediately" className="cursor-pointer font-medium flex-1">
                      Make Available Immediately
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2 mb-4 ml-6">
                    If enabled, the quiz will be available to students right away. Otherwise, set a start time below.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time {!formData.makeAvailableImmediately && "*"}</Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        disabled={formData.makeAvailableImmediately}
                        required={!formData.makeAvailableImmediately}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.makeAvailableImmediately 
                          ? "Quiz will be available immediately (start time will be set to now)"
                          : "Quiz will be available to students starting from this date and time"}
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
                    onClick={() => {
                      setOpen(false);
                      setEditingQuiz(null);
                      setFormData({ 
                        title: "", 
                        description: "", 
                        subject: "", 
                        duration_minutes: 30, 
                        total_marks: 100,
                        expiry_date: "",
                        start_time: "",
                        section_id: undefined,
                        selectedSectionIds: [],
                        year: "",
                        selectedYears: [],
                        questions: [],
        code_snippet: "",
        per_question_timer_enabled: false,
        timer_enabled: true,
        makeAvailableImmediately: false,
      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                    disabled={
                      (!editingQuiz && formData.questions.length === 0) || 
                      (!editingQuiz && formData.selectedYears.length === 0)
                    }
                  >
                    {editingQuiz ? (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Update Quiz {formData.questions.length > 0 && `(${formData.questions.length} questions)`}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create & Assign Quiz {formData.questions.length > 0 && `(${formData.questions.length} questions)`}
                      </>
                    )}
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
                  {/* Section badge removed - quizzes now assigned to department + year (all sections) */}
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(quiz)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
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
