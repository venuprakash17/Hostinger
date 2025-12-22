import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Trash2, Edit, ChevronRight, FileQuestion, Code2, MessageSquare, Briefcase, X, Save, Upload, Download, FileText, CheckCircle2, AlertCircle, ArrowLeft, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { QuestionBuilder, Question } from "@/components/quiz/QuestionBuilder";

interface Company {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
  website?: string;
  is_active: boolean;
}

interface CompanyRole {
  id: number;
  company_id: number;
  role_name: string;
  description?: string;
  difficulty?: string;
  scope_type: string;
  target_departments?: string[];
  target_years?: string[];
  target_sections?: string[];
  is_active: boolean;
  company?: Company;
}

interface PracticeSection {
  id: number;
  role_id: number;
  section_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  rounds?: Round[];
}

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
  order_index: number;
  is_active: boolean;
}

export default function ManageCompanyTraining() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CompanyRole | null>(null);
  const [sections, setSections] = useState<PracticeSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<PracticeSection | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [contents, setContents] = useState<RoundContent[]>([]);
  
  // Quiz questions state (for QuestionBuilder)
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

  // Dialog states
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);

  // Bulk upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({ name: "", logo_url: "", description: "", website: "", is_active: true });
  const [roleForm, setRoleForm] = useState({ 
    company_id: 0, 
    role_name: "", 
    description: "", 
    difficulty: "", 
    scope_type: "svnapro",
    target_departments: [] as string[],
    target_years: [] as string[],
    target_sections: [] as string[],
    is_active: true 
  });
  const [sectionForm, setSectionForm] = useState({ role_id: 0, section_name: "", description: "", order_index: 0, is_active: true });
  const [roundForm, setRoundForm] = useState({ 
    practice_section_id: 0, 
    round_type: 'quiz' as 'quiz' | 'coding' | 'gd' | 'interview',
    round_name: "", 
    description: "", 
    order_index: 0, 
    is_active: true,
    quiz_id: undefined as number | undefined,
    coding_problem_id: undefined as number | undefined
  });
  
  // For selecting existing quizzes/coding problems
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [availableCodingProblems, setAvailableCodingProblems] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingCodingProblems, setLoadingCodingProblems] = useState(false);
  const [quizSearchQuery, setQuizSearchQuery] = useState("");
  const [codingSearchQuery, setCodingSearchQuery] = useState("");
  const [contentForm, setContentForm] = useState<Partial<RoundContent>>({
    round_id: 0,
    gd_topic: "",
    gd_description: "",
    key_points: [],
    best_points: [],
    dos_and_donts: { dos: [], donts: [] },
    question: "",
    expected_answer: "",
    question_type: "",
    tips: [],
    quiz_question: "",
    quiz_options: [],
    correct_answer: "",
    coding_title: "",
    coding_description: "",
    coding_difficulty: "",
    coding_input_format: "",
    coding_output_format: "",
    coding_constraints: "",
    coding_sample_input: "",
    coding_sample_output: "",
    coding_test_cases: [],
    coding_starter_code_python: "",
    coding_starter_code_c: "",
    coding_starter_code_cpp: "",
    coding_starter_code_java: "",
    coding_starter_code_javascript: "",
    coding_time_limit: 5,
    coding_memory_limit: 256,
    order_index: 0,
    is_active: true
  });

  const { toast: showToast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchRoles(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedRole) {
      fetchSections(selectedRole.id);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (selectedSection) {
      fetchRounds(selectedSection.id);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (selectedRound) {
      fetchContents(selectedRound.id);
    }
  }, [selectedRound]);

  useEffect(() => {
    if (roundDialogOpen && roundForm.round_type === 'quiz') {
      fetchAvailableQuizzes();
    }
  }, [roundDialogOpen, roundForm.round_type]);

  useEffect(() => {
    if (roundDialogOpen && roundForm.round_type === 'coding') {
      fetchAvailableCodingProblems();
    }
  }, [roundDialogOpen, roundForm.round_type]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listCompanies();
      setCompanies(data || []);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (companyId: number) => {
    try {
      const data = await apiClient.listRoles(companyId);
      setRoles(data || []);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchSections = async (roleId: number) => {
    try {
      const data = await apiClient.listPracticeSections(roleId);
      setSections(data || []);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchRounds = async (sectionId: number) => {
    try {
      const data = await apiClient.listRounds(sectionId);
      setRounds(data || []);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchContents = async (roundId: number) => {
    try {
      const data = await apiClient.listRoundContents(roundId);
      setContents(data || []);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchAvailableQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const data = await apiClient.listQuizzes({ is_active: true });
      setAvailableQuizzes(data || []);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const fetchAvailableCodingProblems = async () => {
    try {
      setLoadingCodingProblems(true);
      const data = await apiClient.listCodingProblems({ is_active: true });
      setAvailableCodingProblems(data || []);
    } catch (error: any) {
      console.error("Error fetching coding problems:", error);
    } finally {
      setLoadingCodingProblems(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      await apiClient.createCompany(companyForm);
      showToast({ title: "Success", description: "Company created successfully" });
      setCompanyDialogOpen(false);
      setCompanyForm({ name: "", logo_url: "", description: "", website: "", is_active: true });
      fetchCompanies();
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateRole = async () => {
    try {
      await apiClient.createRole(roleForm);
      showToast({ title: "Success", description: "Role created successfully" });
      setRoleDialogOpen(false);
      setRoleForm({ 
        company_id: 0, 
        role_name: "", 
        description: "", 
        difficulty: "", 
        scope_type: "svnapro",
        target_departments: [],
        target_years: [],
        target_sections: [],
        is_active: true 
      });
      if (selectedCompany) fetchRoles(selectedCompany.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateSection = async () => {
    try {
      await apiClient.createPracticeSection(sectionForm);
      showToast({ title: "Success", description: "Practice section created successfully" });
      setSectionDialogOpen(false);
      setSectionForm({ role_id: 0, section_name: "", description: "", order_index: 0, is_active: true });
      if (selectedRole) fetchSections(selectedRole.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateRound = async () => {
    try {
      await apiClient.createRound(roundForm);
      showToast({ title: "Success", description: "Round created successfully" });
      setRoundDialogOpen(false);
      setRoundForm({ 
        practice_section_id: 0, 
        round_type: 'quiz',
        round_name: "", 
        description: "", 
        order_index: 0, 
        is_active: true,
        quiz_id: undefined,
        coding_problem_id: undefined
      });
      if (selectedSection) fetchRounds(selectedSection.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateContent = async () => {
    try {
      await apiClient.createRoundContent(contentForm as any);
      showToast({ title: "Success", description: "Content created successfully" });
      setContentDialogOpen(false);
      setContentForm({
        round_id: 0,
        gd_topic: "",
        gd_description: "",
        key_points: [],
        best_points: [],
        dos_and_donts: { dos: [], donts: [] },
        question: "",
        expected_answer: "",
        question_type: "",
        tips: [],
        quiz_question: "",
        quiz_options: [],
        correct_answer: "",
        coding_title: "",
        coding_description: "",
        coding_difficulty: "",
        coding_input_format: "",
        coding_output_format: "",
        coding_constraints: "",
        coding_sample_input: "",
        coding_sample_output: "",
        coding_test_cases: [],
        coding_starter_code_python: "",
        coding_starter_code_c: "",
        coding_starter_code_cpp: "",
        coding_starter_code_java: "",
        coding_starter_code_javascript: "",
        coding_time_limit: 5,
        coding_memory_limit: 256,
        order_index: 0,
        is_active: true
      });
      if (selectedRound) fetchContents(selectedRound.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      await apiClient.deleteCompany(id);
      showToast({ title: "Success", description: "Company deleted successfully" });
      fetchCompanies();
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await apiClient.deleteRole(id);
      showToast({ title: "Success", description: "Role deleted successfully" });
      if (selectedCompany) fetchRoles(selectedCompany.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm("Are you sure you want to delete this practice section?")) return;
    try {
      await apiClient.deletePracticeSection(id);
      showToast({ title: "Success", description: "Practice section deleted successfully" });
      if (selectedRole) fetchSections(selectedRole.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRound = async (id: number) => {
    if (!confirm("Are you sure you want to delete this round?")) return;
    try {
      await apiClient.deleteRound(id);
      showToast({ title: "Success", description: "Round deleted successfully" });
      if (selectedSection) fetchRounds(selectedSection.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteContent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    try {
      await apiClient.deleteRoundContent(id);
      showToast({ title: "Success", description: "Content deleted successfully" });
      if (selectedRound) fetchContents(selectedRound.id);
    } catch (error: any) {
      showToast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Bulk Upload Functions
  const downloadTemplate = (type: 'quiz' | 'coding' | 'gd' | 'interview') => {
    let template: any[] = [];
    let filename = '';

    switch (type) {
      case 'quiz':
        template = [{
          question: 'What is 2+2?',
          option_a: '3',
          option_b: '4',
          option_c: '5',
          option_d: '6',
          correct_answer: 'B'
        }];
        filename = 'quiz_questions_template.xlsx';
        break;
      case 'coding':
        template = [{
          title: 'Two Sum',
          description: 'Given an array of integers and a target value, return indices of the two numbers such that they add up to target.',
          difficulty: 'Easy',
          input_format: 'First line n, second line n integers, third line target',
          output_format: 'Two indices separated by space',
          constraints: '2 <= n <= 10^5',
          sample_input: '4\n2 7 11 15\n9',
          sample_output: '0 1',
          time_limit: '5',
          memory_limit: '256',
          starter_code_python: 'def solve():\n    # Write your code here\n    pass',
          starter_code_c: '// Write your code here',
          starter_code_cpp: '// Write your code here',
          starter_code_java: '// Write your code here',
          starter_code_javascript: '// Write your code here',
          test_cases: '[{"stdin": "4\\n2 7 11 15\\n9", "expected_output": "0 1", "is_public": true}]'
        }];
        filename = 'coding_problems_template.xlsx';
        break;
      case 'gd':
        template = [{
          topic: 'Should AI replace human jobs?',
          description: 'Discuss the impact of AI on employment',
          key_points: 'Economic impact|Job displacement|New opportunities|Skill requirements',
          best_points: 'Focus on reskilling|Emphasize collaboration|Highlight new roles',
          dos: 'Be respectful|Listen actively|Support with facts',
          donts: 'Interrupt others|Be aggressive|Ignore counterarguments'
        }];
        filename = 'gd_topics_template.xlsx';
        break;
      case 'interview':
        template = [{
          question: 'Tell me about yourself',
          question_type: 'tell_me_about_yourself',
          expected_answer: 'I am a software engineer with 3 years of experience...',
          tips: 'Be concise|Highlight relevant experience|Show enthusiasm'
        }];
        filename = 'interview_questions_template.xlsx';
        break;
    }

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
    showToast({ title: "Success", description: "Template downloaded successfully" });
  };

  const handleBulkUpload = async () => {
    if (!uploadFile || !selectedRound) {
      showToast({ title: "Error", description: "Please select a round and upload file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      if (selectedRound.round_type === 'quiz') {
        // Use the new bulk upload API endpoint for quiz questions
        const result = await apiClient.bulkUploadCompanyTrainingQuizQuestions(selectedRound.id, uploadFile);
        showToast({ 
          title: "Upload Complete", 
          description: result.message || `Successfully uploaded ${result.created_count || 0} questions. ${result.errors?.length ? `${result.errors.length} errors occurred.` : ''}` 
        });
        if (selectedRound) fetchContents(selectedRound.id);
      } else if (selectedRound.round_type === 'coding') {
        // Use the new bulk upload API endpoint for coding problems
        const result = await apiClient.bulkUploadCompanyTrainingCodingProblems(selectedRound.id, uploadFile);
        showToast({ 
          title: "Upload Complete", 
          description: result.message || `Successfully uploaded ${result.created_count || 0} problems. ${result.errors?.length ? `${result.errors.length} errors occurred.` : ''}` 
        });
        if (selectedRound) fetchContents(selectedRound.id);
      } else {
        // Legacy bulk upload for GD and Interview (keep existing logic)
        const data = await uploadFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showToast({ title: "Error", description: "File is empty", variant: "destructive" });
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData as any[]) {
          try {
            const contentData: any = { round_id: selectedRound.id, order_index: 0 };

            if (selectedRound.round_type === 'gd') {
              contentData.gd_topic = row.topic || row.gd_topic;
              contentData.gd_description = row.description || row.gd_description;
              contentData.key_points = (row.key_points || '').split('|').filter(Boolean);
              contentData.best_points = (row.best_points || '').split('|').filter(Boolean);
              contentData.dos_and_donts = {
                dos: (row.dos || '').split('|').filter(Boolean),
                donts: (row.donts || '').split('|').filter(Boolean)
              };
            } else if (selectedRound.round_type === 'interview') {
              contentData.question = row.question;
              contentData.question_type = row.question_type || 'general';
              contentData.expected_answer = row.expected_answer || row.answer;
              contentData.tips = (row.tips || '').split('|').filter(Boolean);
            }

            await apiClient.createRoundContent(contentData);
            successCount++;
          } catch (error: any) {
            console.error("Error creating content:", error);
            errorCount++;
          }
        }

        showToast({ 
          title: "Upload Complete", 
          description: `Successfully uploaded ${successCount} items. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}` 
        });
        
        setUploadFile(null);
        setBulkUploadDialogOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (selectedRound) fetchContents(selectedRound.id);
      }
    } catch (error: any) {
      showToast({ title: "Error", description: error.message || "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getRoundIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <FileQuestion className="h-5 w-5" />;
      case 'coding': return <Code2 className="h-5 w-5" />;
      case 'gd': return <MessageSquare className="h-5 w-5" />;
      case 'interview': return <Briefcase className="h-5 w-5" />;
      default: return null;
    }
  };

  const getRoundColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'coding': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'gd': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'interview': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted';
    }
  };

  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Button variant="ghost" size="sm" onClick={() => {
        setSelectedCompany(null);
        setSelectedRole(null);
        setSelectedSection(null);
        setSelectedRound(null);
      }}>
        <Home className="h-4 w-4" />
      </Button>
      {selectedCompany && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium">{selectedCompany.name}</span>
        </>
      )}
      {selectedRole && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedRole.role_name}</span>
        </>
      )}
      {selectedSection && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedSection.section_name}</span>
        </>
      )}
      {selectedRound && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedRound.round_name}</span>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Company Training Management
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage company-specific training content</p>
        </div>
        <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
              <DialogDescription>Add a new company for training</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="e.g., Infosys"
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={companyForm.logo_url}
                  onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  placeholder="Company description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <Button onClick={handleCreateCompany} className="w-full">
                Create Company
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Breadcrumb />

      {/* Main Content */}
      {!selectedCompany ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary/50"
              onClick={() => {
                setSelectedCompany(company);
                setRoleForm({ ...roleForm, company_id: company.id });
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="h-12 w-12 object-contain rounded-lg" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{company.name}</CardTitle>
                      <Badge variant={company.is_active ? "default" : "secondary"} className="mt-1">
                        {company.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {company.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{company.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : !selectedRole ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedCompany.logo_url && (
                <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="h-10 w-10 object-contain" />
              )}
              <div>
                <h2 className="text-2xl font-semibold">{selectedCompany.name} - Roles</h2>
                <p className="text-sm text-muted-foreground">Create roles for this company</p>
              </div>
            </div>
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Role</DialogTitle>
                  <DialogDescription>Add a new role for {selectedCompany.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Role Name *</Label>
                    <Input
                      value={roleForm.role_name}
                      onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                      placeholder="e.g., System Engineer"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="Role description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Difficulty</Label>
                      <Select
                        value={roleForm.difficulty}
                        onValueChange={(value) => setRoleForm({ ...roleForm, difficulty: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Scope Type</Label>
                      <Select
                        value={roleForm.scope_type}
                        onValueChange={(value) => setRoleForm({ ...roleForm, scope_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="svnapro">SvnaPro</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="section">Section</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateRole} className="w-full">
                    Create Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <Card 
                key={role.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary/50"
                onClick={() => {
                  setSelectedRole(role);
                  setSectionForm({ ...sectionForm, role_id: role.id });
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{role.role_name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        {role.difficulty && (
                          <Badge variant="outline" className="capitalize">{role.difficulty}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{role.scope_type}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {role.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{role.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : !selectedSection ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{selectedRole.role_name} - Practice Sections</h2>
              <p className="text-sm text-muted-foreground">Create practice sections for this role</p>
            </div>
            <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Practice Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Practice Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Section Name *</Label>
                    <Input
                      value={sectionForm.section_name}
                      onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                      placeholder="e.g., Practice Set 1"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={sectionForm.description}
                      onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Order Index</Label>
                    <Input
                      type="number"
                      value={sectionForm.order_index}
                      onChange={(e) => setSectionForm({ ...sectionForm, order_index: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <Button onClick={handleCreateSection} className="w-full">
                    Create Section
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {sections.sort((a, b) => a.order_index - b.order_index).map((section) => (
              <Card 
                key={section.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-primary"
                onClick={() => {
                  setSelectedSection(section);
                  setRoundForm({ ...roundForm, practice_section_id: section.id });
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{section.order_index}</span>
                        {section.section_name}
                      </CardTitle>
                      {section.description && (
                        <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : !selectedRound ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{selectedSection.section_name} - Rounds</h2>
              <p className="text-sm text-muted-foreground">Create rounds for this practice section</p>
            </div>
            <Dialog open={roundDialogOpen} onOpenChange={setRoundDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Round
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Round</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Round Type *</Label>
                    <Select
                      value={roundForm.round_type}
                      onValueChange={(value: any) => setRoundForm({ ...roundForm, round_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="gd">Group Discussion</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Round Name *</Label>
                    <Input
                      value={roundForm.round_name}
                      onChange={(e) => setRoundForm({ ...roundForm, round_name: e.target.value })}
                      placeholder="e.g., Aptitude Test"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={roundForm.description}
                      onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                      rows={3}
                      placeholder="Round description"
                    />
                  </div>
                  {(roundForm.round_type === 'quiz' || roundForm.round_type === 'coding') && (
                    <div>
                      <Label>
                        {roundForm.round_type === 'quiz' ? 'Link to Existing Quiz (Recommended)' : 'Link to Existing Coding Problem (Recommended)'}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {roundForm.round_type === 'quiz' 
                          ? 'Select a quiz created by faculty to use all its features (timers, questions, scoring, etc.). Leave empty to add custom quiz questions.'
                          : 'Select a coding problem from coding practice to use all its features (test cases, starter code, etc.). Leave empty to add custom coding problems.'}
                      </p>
                      {roundForm.round_type === 'quiz' ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Search quizzes..."
                            value={quizSearchQuery}
                            onChange={(e) => setQuizSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                          <Select
                            value={roundForm.quiz_id?.toString() || "none"}
                            onValueChange={(value) => {
                              setRoundForm({ 
                                ...roundForm, 
                                quiz_id: value && value !== "none" ? parseInt(value) : undefined 
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a quiz" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              <SelectItem value="none">None (Add Custom Questions)</SelectItem>
                              {loadingQuizzes ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                availableQuizzes
                                  .filter((q: any) => 
                                    !quizSearchQuery || 
                                    q.title?.toLowerCase().includes(quizSearchQuery.toLowerCase())
                                  )
                                  .map((quiz: any) => (
                                    <SelectItem key={quiz.id} value={quiz.id.toString()}>
                                      {quiz.title} {quiz.duration_minutes && `(${quiz.duration_minutes} min)`}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="Search coding problems..."
                            value={codingSearchQuery}
                            onChange={(e) => setCodingSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                          <Select
                            value={roundForm.coding_problem_id?.toString() || "none"}
                            onValueChange={(value) => {
                              setRoundForm({ 
                                ...roundForm, 
                                coding_problem_id: value && value !== "none" ? parseInt(value) : undefined 
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a coding problem" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              <SelectItem value="none">None (Add Custom Problems)</SelectItem>
                              {loadingCodingProblems ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                availableCodingProblems
                                  .filter((p: any) => 
                                    !codingSearchQuery || 
                                    p.title?.toLowerCase().includes(codingSearchQuery.toLowerCase())
                                  )
                                  .map((problem: any) => (
                                    <SelectItem key={problem.id} value={problem.id.toString()}>
                                      {problem.title} ({problem.difficulty || 'N/A'})
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <Label>Order Index</Label>
                    <Input
                      type="number"
                      value={roundForm.order_index}
                      onChange={(e) => setRoundForm({ ...roundForm, order_index: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  {(roundForm.round_type === 'gd' || roundForm.round_type === 'interview') && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Note:</strong> After creating this round, you can add content directly using the "Add Content" or "Bulk Upload" buttons. 
                        {roundForm.round_type === 'gd' && ' Add GD topics with key points, best points, and do\'s/don\'ts.'}
                        {roundForm.round_type === 'interview' && ' Add interview questions with expected answers and tips.'}
                      </p>
                    </div>
                  )}
                  <Button onClick={handleCreateRound} className="w-full">
                    Create Round
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {rounds.sort((a, b) => a.order_index - b.order_index).map((round) => (
              <Card 
                key={round.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01]"
                onClick={() => {
                  setSelectedRound(round);
                  setContentForm({ ...contentForm, round_id: round.id });
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getRoundColor(round.round_type)}`}>
                        {getRoundIcon(round.round_type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-muted-foreground">#{round.order_index}</span>
                          {round.round_name}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize">{round.round_type}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRound(round.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {round.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{round.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${getRoundColor(selectedRound.round_type)}`}>
                {getRoundIcon(selectedRound.round_type)}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{selectedRound.round_name}</h2>
                <Badge variant="outline" className="capitalize">{selectedRound.round_type}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedRound.round_type === 'quiz' && !selectedRound.quiz_id && (
                <Dialog open={quizDialogOpen} onOpenChange={(open) => {
                  setQuizDialogOpen(open);
                  if (open && selectedRound) {
                    // Load existing quiz questions when dialog opens
                    const quizContents = contents.filter(c => c.quiz_question || c.quiz_question_type);
                    const questions: Question[] = quizContents.map(c => {
                      const q: Question = {
                        question: c.quiz_question || '',
                        question_type: (c.quiz_question_type || 'mcq') as 'mcq' | 'fill_blank' | 'true_false',
                        marks: c.quiz_marks || 1,
                      };
                      if (c.quiz_timer_seconds) q.timer_seconds = c.quiz_timer_seconds;
                      if (c.quiz_question_type === 'mcq') {
                        q.option_a = c.quiz_option_a;
                        q.option_b = c.quiz_option_b;
                        q.option_c = c.quiz_option_c;
                        q.option_d = c.quiz_option_d;
                        q.correct_answer = c.correct_answer as "A" | "B" | "C" | "D";
                      } else if (c.quiz_question_type === 'fill_blank') {
                        q.correct_answer_text = c.quiz_correct_answer_text;
                      } else if (c.quiz_question_type === 'true_false') {
                        q.is_true = c.quiz_is_true;
                      }
                      return q;
                    });
                    setQuizQuestions(questions);
                  } else if (!open) {
                    setQuizQuestions([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <FileQuestion className="h-4 w-4 mr-2" />
                      Manage Questions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Manage Quiz Questions</DialogTitle>
                      <DialogDescription>
                        Add and manage quiz questions for {selectedRound.round_name}. Same interface as faculty quiz creation.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Questions</h3>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <QuestionBuilder
                        questions={quizQuestions}
                        onChange={(questions) => {
                          setQuizQuestions(questions);
                        }}
                      />
                      <div className="flex gap-2 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setQuizDialogOpen(false);
                            setQuizQuestions([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={async () => {
                            if (quizQuestions.length === 0) {
                              showToast({ title: "Error", description: "Please add at least one question", variant: "destructive" });
                              return;
                            }
                            try {
                              // Convert Question[] to RoundContent[] and create them
                              let successCount = 0;
                              let errorCount = 0;
                              const maxOrder = contents.length > 0 ? Math.max(...contents.map(c => c.order_index)) : -1;
                              
                              for (let idx = 0; idx < quizQuestions.length; idx++) {
                                const q = quizQuestions[idx];
                                try {
                                  const contentData: any = {
                                    round_id: selectedRound!.id,
                                    order_index: maxOrder + idx + 1,
                                    is_active: true,
                                    quiz_question: q.question,
                                    quiz_question_type: q.question_type,
                                    quiz_marks: q.marks || 1,
                                  };
                                  
                                  if (q.timer_seconds) {
                                    contentData.quiz_timer_seconds = q.timer_seconds;
                                  }
                                  
                                  if (q.question_type === 'mcq') {
                                    contentData.quiz_option_a = q.option_a;
                                    contentData.quiz_option_b = q.option_b;
                                    contentData.quiz_option_c = q.option_c;
                                    contentData.quiz_option_d = q.option_d;
                                    contentData.correct_answer = q.correct_answer;
                                  } else if (q.question_type === 'fill_blank') {
                                    contentData.quiz_correct_answer_text = q.correct_answer_text;
                                  } else if (q.question_type === 'true_false') {
                                    contentData.quiz_option_a = "True";
                                    contentData.quiz_option_b = "False";
                                    contentData.quiz_is_true = q.is_true;
                                    contentData.correct_answer = q.is_true ? "A" : "B";
                                  }
                                  
                                  await apiClient.createRoundContent(contentData);
                                  successCount++;
                                } catch (error: any) {
                                  console.error("Error creating question:", error);
                                  errorCount++;
                                }
                              }
                              
                              showToast({ 
                                title: "Success", 
                                description: `Created ${successCount} questions${errorCount > 0 ? `. ${errorCount} errors occurred.` : ''}` 
                              });
                              setQuizDialogOpen(false);
                              setQuizQuestions([]);
                              if (selectedRound) fetchContents(selectedRound.id);
                            } catch (error: any) {
                              showToast({ title: "Error", description: error.message || "Failed to save questions", variant: "destructive" });
                            }
                          }}
                        >
                          Save Questions ({quizQuestions.length})
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    disabled={(selectedRound.round_type === 'quiz' && !!selectedRound.quiz_id) || 
                              (selectedRound.round_type === 'coding' && !!selectedRound.coding_problem_id)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload {selectedRound.round_type === 'quiz' ? 'Quiz Questions' : selectedRound.round_type === 'coding' ? 'Coding Problems' : selectedRound.round_type === 'gd' ? 'GD Topics' : 'Interview Questions'}</DialogTitle>
                    <DialogDescription>
                      Upload an Excel file to add multiple items at once
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Upload File (Excel)</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                      {uploadFile && (
                        <p className="text-sm text-muted-foreground mt-1">Selected: {uploadFile.name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadTemplate(selectedRound.round_type)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                      <Button
                        onClick={handleBulkUpload}
                        disabled={!uploadFile || uploading}
                        className="flex-1"
                      >
                        {uploading ? (
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
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Format Guide</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        {selectedRound.round_type === 'quiz' && (
                          <>
                            <li>Columns: question, question_type, option_a, option_b, option_c, option_d, correct_answer, correct_answer_text, is_true, marks, timer_seconds</li>
                            <li>question_type: mcq, fill_blank, or true_false</li>
                            <li>For MCQ: Provide all 4 options and correct_answer (A/B/C/D)</li>
                            <li>For fill_blank: Provide correct_answer_text</li>
                            <li>For true_false: Provide is_true (true/false) or correct_answer (A=True, B=False)</li>
                            <li>marks: Points for this question (default: 1)</li>
                            <li>timer_seconds: Optional timer per question</li>
                          </>
                        )}
                        {selectedRound.round_type === 'coding' && (
                          <>
                            <li>Columns: title, description, difficulty, input_format, output_format, constraints, sample_input, sample_output</li>
                            <li>difficulty: Easy, Medium, or Hard</li>
                          </>
                        )}
                        {selectedRound.round_type === 'gd' && (
                          <>
                            <li>Columns: topic, description, key_points, best_points, dos, donts</li>
                            <li>Separate multiple items with | (pipe) character</li>
                          </>
                        )}
                        {selectedRound.round_type === 'interview' && (
                          <>
                            <li>Columns: question, question_type, expected_answer, tips</li>
                            <li>question_type: technical, hr, behavioral, tell_me_about_yourself</li>
                            <li>Separate multiple tips with | (pipe) character</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={(selectedRound.round_type === 'quiz' && !!selectedRound.quiz_id) || 
                              (selectedRound.round_type === 'coding' && !!selectedRound.coding_problem_id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Content for {selectedRound.round_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedRound.round_type === 'gd' && (
                      <>
                        <div>
                          <Label>GD Topic *</Label>
                          <Input
                            value={contentForm.gd_topic || ''}
                            onChange={(e) => setContentForm({ ...contentForm, gd_topic: e.target.value })}
                            placeholder="e.g., Should AI replace human jobs?"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={contentForm.gd_description || ''}
                            onChange={(e) => setContentForm({ ...contentForm, gd_description: e.target.value })}
                            placeholder="GD topic description"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Key Points (one per line)</Label>
                          <Textarea
                            value={(contentForm.key_points || []).join('\n')}
                            onChange={(e) => setContentForm({ 
                              ...contentForm, 
                              key_points: e.target.value.split('\n').filter(l => l.trim()) 
                            })}
                            placeholder="Key point 1&#10;Key point 2"
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label>Best Points (one per line)</Label>
                          <Textarea
                            value={(contentForm.best_points || []).join('\n')}
                            onChange={(e) => setContentForm({ 
                              ...contentForm, 
                              best_points: e.target.value.split('\n').filter(l => l.trim()) 
                            })}
                            placeholder="Best point 1&#10;Best point 2"
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Do's (one per line)</Label>
                            <Textarea
                              value={(contentForm.dos_and_donts?.dos || []).join('\n')}
                              onChange={(e) => setContentForm({ 
                                ...contentForm, 
                                dos_and_donts: { 
                                  ...contentForm.dos_and_donts, 
                                  dos: e.target.value.split('\n').filter(l => l.trim()) 
                                } 
                              })}
                              placeholder="Do 1&#10;Do 2"
                              rows={4}
                            />
                          </div>
                          <div>
                            <Label>Don'ts (one per line)</Label>
                            <Textarea
                              value={(contentForm.dos_and_donts?.donts || []).join('\n')}
                              onChange={(e) => setContentForm({ 
                                ...contentForm, 
                                dos_and_donts: { 
                                  ...contentForm.dos_and_donts, 
                                  donts: e.target.value.split('\n').filter(l => l.trim()) 
                                } 
                              })}
                              placeholder="Don't 1&#10;Don't 2"
                              rows={4}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {selectedRound.round_type === 'interview' && (
                      <>
                        <div>
                          <Label>Question *</Label>
                          <Textarea
                            value={contentForm.question || ''}
                            onChange={(e) => setContentForm({ ...contentForm, question: e.target.value })}
                            placeholder="e.g., Tell me about yourself"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Question Type</Label>
                          <Select
                            value={contentForm.question_type || ''}
                            onValueChange={(value) => setContentForm({ ...contentForm, question_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technical">Technical</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="behavioral">Behavioral</SelectItem>
                              <SelectItem value="tell_me_about_yourself">Tell Me About Yourself</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Expected Answer</Label>
                          <Textarea
                            value={contentForm.expected_answer || ''}
                            onChange={(e) => setContentForm({ ...contentForm, expected_answer: e.target.value })}
                            placeholder="Expected answer or best answer"
                            rows={6}
                          />
                        </div>
                        <div>
                          <Label>Tips (one per line)</Label>
                          <Textarea
                            value={(contentForm.tips || []).join('\n')}
                            onChange={(e) => setContentForm({ 
                              ...contentForm, 
                              tips: e.target.value.split('\n').filter(l => l.trim()) 
                            })}
                            placeholder="Tip 1&#10;Tip 2"
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {selectedRound.round_type === 'quiz' && !selectedRound.quiz_id && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
                        <p className="text-sm text-yellow-900 dark:text-yellow-100">
                          <strong>Note:</strong> This round is not linked to a quiz. Use the "Manage Questions" button below to add questions using the same interface as faculty quiz creation.
                        </p>
                      </div>
                    )}
                    {selectedRound.round_type === 'quiz' && selectedRound.quiz_id && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                        <p className="text-sm text-green-900 dark:text-green-100">
                          This round is linked to Quiz ID: {selectedRound.quiz_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Students will access the full quiz with all features (timers, questions, etc.)
                        </p>
                      </div>
                    )}

                    {selectedRound.round_type === 'coding' && !selectedRound.coding_problem_id && (
                      <>
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
                          <p className="text-sm text-yellow-900 dark:text-yellow-100">
                            <strong>Note:</strong> This round is not linked to a coding problem. You can add custom coding problems here, or link to an existing problem when editing the round.
                          </p>
                        </div>
                        <div>
                          <Label>Problem Title *</Label>
                          <Input
                            value={contentForm.coding_title || ''}
                            onChange={(e) => setContentForm({ ...contentForm, coding_title: e.target.value })}
                            placeholder="Coding problem title"
                          />
                        </div>
                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            value={contentForm.coding_description || ''}
                            onChange={(e) => setContentForm({ ...contentForm, coding_description: e.target.value })}
                            placeholder="Problem description"
                            rows={6}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Difficulty</Label>
                            <Select
                              value={contentForm.coding_difficulty || ''}
                              onValueChange={(value) => setContentForm({ ...contentForm, coding_difficulty: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Time Limit (seconds)</Label>
                              <Input
                                type="number"
                                value={contentForm.coding_time_limit || 5}
                                onChange={(e) => setContentForm({ ...contentForm, coding_time_limit: parseInt(e.target.value) || 5 })}
                              />
                            </div>
                            <div>
                              <Label>Memory Limit (MB)</Label>
                              <Input
                                type="number"
                                value={contentForm.coding_memory_limit || 256}
                                onChange={(e) => setContentForm({ ...contentForm, coding_memory_limit: parseInt(e.target.value) || 256 })}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Input Format</Label>
                          <Textarea
                            value={contentForm.coding_input_format || ''}
                            onChange={(e) => setContentForm({ ...contentForm, coding_input_format: e.target.value })}
                            placeholder="e.g., First line n, second line n integers"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Output Format</Label>
                          <Textarea
                            value={contentForm.coding_output_format || ''}
                            onChange={(e) => setContentForm({ ...contentForm, coding_output_format: e.target.value })}
                            placeholder="e.g., Print the result"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Constraints</Label>
                          <Textarea
                            value={contentForm.coding_constraints || ''}
                            onChange={(e) => setContentForm({ ...contentForm, coding_constraints: e.target.value })}
                            placeholder="e.g., 1 <= n <= 10^5"
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Sample Input</Label>
                            <Textarea
                              value={contentForm.coding_sample_input || ''}
                              onChange={(e) => setContentForm({ ...contentForm, coding_sample_input: e.target.value })}
                              placeholder="Sample input"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Sample Output</Label>
                            <Textarea
                              value={contentForm.coding_sample_output || ''}
                              onChange={(e) => setContentForm({ ...contentForm, coding_sample_output: e.target.value })}
                              placeholder="Sample output"
                              rows={3}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Starter Code</Label>
                          <Tabs defaultValue="python" className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                              <TabsTrigger value="python">Python</TabsTrigger>
                              <TabsTrigger value="c">C</TabsTrigger>
                              <TabsTrigger value="cpp">C++</TabsTrigger>
                              <TabsTrigger value="java">Java</TabsTrigger>
                              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                            </TabsList>
                            <TabsContent value="python" className="mt-2">
                              <Textarea
                                value={contentForm.coding_starter_code_python || ''}
                                onChange={(e) => setContentForm({ ...contentForm, coding_starter_code_python: e.target.value })}
                                placeholder="# Write your code here"
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </TabsContent>
                            <TabsContent value="c" className="mt-2">
                              <Textarea
                                value={contentForm.coding_starter_code_c || ''}
                                onChange={(e) => setContentForm({ ...contentForm, coding_starter_code_c: e.target.value })}
                                placeholder="// Write your code here"
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </TabsContent>
                            <TabsContent value="cpp" className="mt-2">
                              <Textarea
                                value={contentForm.coding_starter_code_cpp || ''}
                                onChange={(e) => setContentForm({ ...contentForm, coding_starter_code_cpp: e.target.value })}
                                placeholder="// Write your code here"
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </TabsContent>
                            <TabsContent value="java" className="mt-2">
                              <Textarea
                                value={contentForm.coding_starter_code_java || ''}
                                onChange={(e) => setContentForm({ ...contentForm, coding_starter_code_java: e.target.value })}
                                placeholder="// Write your code here"
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </TabsContent>
                            <TabsContent value="javascript" className="mt-2">
                              <Textarea
                                value={contentForm.coding_starter_code_javascript || ''}
                                onChange={(e) => setContentForm({ ...contentForm, coding_starter_code_javascript: e.target.value })}
                                placeholder="// Write your code here"
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </TabsContent>
                          </Tabs>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <Label className="text-sm font-semibold mb-2 block">Test Cases (JSON format)</Label>
                          <Textarea
                            value={JSON.stringify(contentForm.coding_test_cases || [], null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setContentForm({ ...contentForm, coding_test_cases: parsed });
                              } catch {
                                // Invalid JSON, keep as is
                              }
                            }}
                            placeholder='[{"stdin": "5\n1 2 3 4 5", "expected_output": "15", "is_public": true}]'
                            rows={6}
                            className="font-mono text-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Format: Array of objects with stdin, expected_output, and is_public (boolean)
                          </p>
                        </div>
                      </>
                    )}

                    {(selectedRound.round_type === 'gd' || selectedRound.round_type === 'interview' || 
                      (selectedRound.round_type === 'quiz' && !selectedRound.quiz_id) ||
                      (selectedRound.round_type === 'coding' && !selectedRound.coding_problem_id)) && (
                      <>
                        <div>
                          <Label>Order Index</Label>
                          <Input
                            type="number"
                            value={contentForm.order_index || 0}
                            onChange={(e) => setContentForm({ ...contentForm, order_index: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <Button onClick={handleCreateContent} className="w-full">
                          Create Content
                        </Button>
                      </>
                    )}
                    {((selectedRound.round_type === 'quiz' && selectedRound.quiz_id) ||
                      (selectedRound.round_type === 'coding' && selectedRound.coding_problem_id)) && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          This round is linked to an existing {selectedRound.round_type === 'quiz' ? 'quiz' : 'coding problem'}. 
                          No additional content needed.
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="space-y-3">
            {selectedRound.round_type === 'quiz' && selectedRound.quiz_id ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileQuestion className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Linked Quiz</h3>
                  <p className="text-muted-foreground mb-4">
                    This round is linked to Quiz ID: {selectedRound.quiz_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students will access the full quiz with all features including timers, questions, and scoring.
                  </p>
                </CardContent>
              </Card>
            ) : selectedRound.round_type === 'coding' && selectedRound.coding_problem_id ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Code2 className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Linked Coding Problem</h3>
                  <p className="text-muted-foreground mb-4">
                    This round is linked to Coding Problem ID: {selectedRound.coding_problem_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students will access the full coding problem with test cases, starter code, and all features from coding practice.
                  </p>
                </CardContent>
              </Card>
            ) : contents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No content available yet</p>
                  {selectedRound.round_type === 'quiz' && !selectedRound.quiz_id && (
                    <p className="text-sm text-muted-foreground mt-2">Click "Manage Questions" to add quiz questions</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              contents.sort((a, b) => a.order_index - b.order_index).map((content) => (
                <Card key={content.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {content.gd_topic && <CardTitle>{content.gd_topic}</CardTitle>}
                        {content.question && <CardTitle>{content.question}</CardTitle>}
                        {content.quiz_question && (
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {content.quiz_question}
                              {content.quiz_question_type && (
                                <Badge variant="secondary" className="text-xs">
                                  {content.quiz_question_type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              )}
                              {content.quiz_marks && (
                                <Badge variant="outline" className="text-xs">
                                  {content.quiz_marks} {content.quiz_marks === 1 ? 'mark' : 'marks'}
                                </Badge>
                              )}
                              {content.quiz_timer_seconds && (
                                <Badge variant="outline" className="text-xs">
                                  <Timer className="h-3 w-3 mr-1" />
                                  {content.quiz_timer_seconds}s
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                        )}
                        {content.coding_title && <CardTitle>{content.coding_title}</CardTitle>}
                        {content.question_type && (
                          <Badge variant="outline" className="mt-2 capitalize">{content.question_type}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteContent(content.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {content.quiz_question && (
                      <>
                        {content.quiz_question_type === 'mcq' && (
                          <div className="space-y-2">
                            {['quiz_option_a', 'quiz_option_b', 'quiz_option_c', 'quiz_option_d'].map((optKey, idx) => {
                              const option = content[optKey as keyof RoundContent] as string;
                              if (!option) return null;
                              return (
                                <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                                  <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                                  <span className="flex-1">{option}</span>
                                  {content.correct_answer === String.fromCharCode(65 + idx) && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {content.quiz_question_type === 'fill_blank' && content.quiz_correct_answer_text && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <span className="text-sm font-medium text-green-600">Correct Answer: </span>
                            <span className="text-sm">{content.quiz_correct_answer_text}</span>
                          </div>
                        )}
                        {content.quiz_question_type === 'true_false' && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <span className="text-sm font-medium text-green-600">Correct Answer: </span>
                            <span className="text-sm">{content.quiz_is_true ? 'True' : 'False'}</span>
                          </div>
                        )}
                      </>
                    )}
                    {content.expected_answer && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Expected Answer:
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.expected_answer}</p>
                      </div>
                    )}
                    {content.gd_description && (
                      <p className="text-sm text-muted-foreground">{content.gd_description}</p>
                    )}
                    {content.key_points && content.key_points.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Key Points:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {content.key_points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {content.best_points && content.best_points.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-2 text-blue-600">Best Points:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {content.best_points.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {content.tips && content.tips.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {content.tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
