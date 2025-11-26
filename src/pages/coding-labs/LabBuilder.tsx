/** Lab Builder/Management Page for Faculty, HODs, and Admins */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, Save, Plus, Trash2, Edit, Eye, Play, 
  CheckCircle2, XCircle, Clock, Users, Settings, FileText,
  Code2, TestTube, AlertCircle
} from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Lab {
  id: number;
  title: string;
  description?: string;
  instructions?: string;
  // mode, difficulty, topic removed - now session-level only
  // proctoring settings removed - now session-level only
  department?: string;
  section?: string;
  is_published: boolean;
  is_active: boolean;
  allow_hints: boolean;
  allow_multiple_attempts: boolean;
  max_attempts?: number;
  total_points: number;
  passing_score: number;
  start_date?: string;
  end_date?: string;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  problem_statement: string;
  starter_code?: string;
  solution_code?: string;
  allowed_languages: string[];
  default_language: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  hints?: string[];
  explanation?: string;
  points: number;
  order_index: number;
}

interface TestCase {
  id: number;
  name: string;
  type: string;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
  points: number;
  order_index: number;
}

export default function LabBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFaculty, isAdmin, isSuperAdmin, isHOD } = useUserRole();
  const isEditMode = !!id;

  // Lab state
  const [lab, setLab] = useState<Lab | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<number[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<any[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [hodDepartmentId, setHodDepartmentId] = useState<number | null>(null);
  const [hodCollegeId, setHodCollegeId] = useState<number | null>(null);
  const [allowHints, setAllowHints] = useState(true);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined);
  // Proctoring settings removed - now session-level only
  const [totalPoints, setTotalPoints] = useState(100);
  const [passingScore, setPassingScore] = useState(60);

  // Problem dialog
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(['python']);
  const [defaultLanguage, setDefaultLanguage] = useState('python');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(5);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [problemPoints, setProblemPoints] = useState(100);

  // Test case dialog
  const [testCaseDialogOpen, setTestCaseDialogOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<Record<number, TestCase[]>>({});
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [testCaseName, setTestCaseName] = useState('');
  const [testCaseType, setTestCaseType] = useState('hidden');
  const [inputData, setInputData] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [testCasePoints, setTestCasePoints] = useState(10);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: number; name: string } | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      fetchLab();
      fetchProblems();
    } else {
      setLoading(false);
      // Fetch HOD department and subjects for new lab (only for HOD)
      if (isHOD) {
        fetchHodDepartmentAndSubjects();
      }
    }
  }, [id, isEditMode, isHOD]);

  // Debug: Log subjects when they change
  useEffect(() => {
    console.log('Subjects updated:', subjects.length, subjects);
  }, [subjects]);

  const fetchHodDepartmentAndSubjects = async () => {
    if (!isHOD) return;
    
    try {
      // Get HOD's profile to get department and college
      const profile = await apiClient.getCurrentUserProfile();
      const hodColId = profile.college_id || null;
      setHodCollegeId(hodColId);
      
      // Set department name from profile
      if (profile.department) {
        setDepartment(profile.department);
        
        // Get department ID by looking up departments
        try {
          const departments = await apiClient.getDepartments(hodColId || undefined);
          const hodDept = departments.find((d: any) => d.name === profile.department);
          if (hodDept) {
            setHodDepartmentId(hodDept.id);
            // Fetch subjects for HOD's department (pass collegeId to avoid race condition)
            await fetchSubjectsForDepartment(hodDept.id, hodColId);
          } else {
            console.warn('HOD department not found in departments list:', profile.department);
            // Try fetching subjects without department filter as fallback
            if (hodColId) {
              await fetchSubjectsForDepartment(null, hodColId); // Pass null to skip department filter
            }
          }
        } catch (e) {
          console.error('Failed to fetch departments:', e);
          // Try fetching subjects without department filter as fallback
          if (hodColId) {
            try {
              await fetchSubjectsForDepartment(null, hodColId); // Pass null to skip department filter
            } catch (e2) {
              console.error('Failed to fetch subjects as fallback:', e2);
            }
          }
        }
      }
      
      // Fetch available faculty
      await fetchAvailableFaculty();
    } catch (error: any) {
      console.error('Failed to fetch HOD info:', error);
    }
  };

  const fetchSubjectsForDepartment = async (departmentId: number | null, collegeId?: number | null) => {
    try {
      setLoadingSubjects(true);
      const targetCollegeId = collegeId || hodCollegeId || undefined;
      const targetDeptId = departmentId && departmentId > 0 ? departmentId : undefined;
      
      console.log('Fetching subjects:', { collegeId: targetCollegeId, departmentId: targetDeptId });
      
      const subjectsData = await apiClient.getSubjects(targetCollegeId, targetDeptId);
      console.log('Fetched subjects:', subjectsData);
      
      setSubjects(subjectsData || []);
      
      if (!subjectsData || subjectsData.length === 0) {
        console.warn('No subjects found for department:', targetDeptId, 'college:', targetCollegeId);
      }
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
      toast.error('Failed to load subjects: ' + (error.message || 'Unknown error'));
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectChange = async (subjectId: string) => {
    const subjectIdNum = subjectId === "none" ? null : parseInt(subjectId);
    setSelectedSubjectId(subjectIdNum);
    
    // Clear selected faculty when subject changes
    setSelectedFaculty([]);
    
    // If subject selected, fetch faculty assigned to that subject
    if (subjectIdNum) {
      try {
        setLoadingFaculty(true);
        // Get faculty assignments for this subject
        const assignments = await apiClient.request(`/academic/subject-assignments?subject_id=${subjectIdNum}`);
        
        // Extract unique faculty IDs
        const facultyIds = [...new Set((assignments || []).map((a: any) => a.faculty_id))];
        
        // Get faculty details from users endpoint
        try {
          const allUsers = await apiClient.request('/users');
          const usersList = Array.isArray(allUsers) ? allUsers : [];
          
          const facultyDetails = facultyIds
            .map((facultyId: number) => {
              const user = usersList.find((u: any) => u.id === facultyId);
              if (user) {
                return {
                  id: user.id,
                  name: user.full_name || user.email,
                  email: user.email
                };
              }
              return null;
            })
            .filter(f => f !== null);
          
          setAvailableFaculty(facultyDetails);
        } catch (e) {
          console.error('Failed to fetch faculty details:', e);
          // Still set the IDs even if we can't get details
          setAvailableFaculty(facultyIds.map((id: number) => ({ id, name: `Faculty ${id}`, email: '' })));
        }
        
        // Auto-select all faculty assigned to this subject
        setSelectedFaculty(facultyIds);
        
        toast.success(`Auto-assigned ${facultyIds.length} faculty member(s) from selected subject`);
      } catch (error: any) {
        console.error('Failed to fetch faculty for subject:', error);
        toast.error('Failed to load faculty for selected subject');
      } finally {
        setLoadingFaculty(false);
      }
    } else {
      // If no subject selected, fetch all faculty from department
      await fetchAvailableFaculty();
    }
  };

  const fetchAvailableFaculty = async () => {
    // Only fetch if user is HOD
    if (!isHOD) {
      return;
    }
    
    try {
      setLoadingFaculty(true);
      const faculty = await apiClient.request('/coding-labs/available-faculty');
      setAvailableFaculty(faculty || []);
    } catch (error: any) {
      console.error('Failed to fetch faculty:', error);
      // Only show error if it's not a 403 (forbidden) - means user is not HOD
      if (error.status !== 403 && error.response?.status !== 403) {
        toast.error('Failed to load faculty list');
      }
      setAvailableFaculty([]);
    } finally {
      setLoadingFaculty(false);
    }
  };

  const fetchLab = async () => {
    try {
      const data = await apiClient.getLab(Number(id));
      setLab(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setInstructions(data.instructions || '');
      // Mode, difficulty, topic removed - now session-level
      setDepartment(data.department || '');
      setSection(data.section || '');
      setIsPublished(data.is_published);
      setAllowHints(data.allow_hints);
      setAllowMultipleAttempts(data.allow_multiple_attempts);
      setMaxAttempts(data.max_attempts);
      // Proctoring settings removed - now session-level only
      setTotalPoints(data.total_points);
      setPassingScore(data.passing_score);
      
      // Set subject if linked
      if (data.subject_id) {
        setSelectedSubjectId(data.subject_id);
        // Fetch subjects and faculty for editing
        if (isHOD) {
          await fetchHodDepartmentAndSubjects();
          // Fetch assigned faculty
          try {
            const assignedFaculty = await apiClient.request(`/coding-labs/${id}/faculty`);
            const facultyIds = (assignedFaculty || []).map((f: any) => f.faculty_id);
            setSelectedFaculty(facultyIds);
          } catch (e) {
            console.error('Failed to fetch assigned faculty:', e);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab');
      navigate('/coding-labs');
    }
  };

  const fetchProblems = async () => {
    if (!id) return;
    try {
      const data = await apiClient.listProblems(Number(id));
      setProblems(data);
      // Fetch test cases for each problem
      for (const problem of data) {
        fetchTestCases(problem.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load problems');
    }
  };

  const fetchTestCases = async (problemId: number) => {
    try {
      const data = await apiClient.listTestCases(problemId, true);
      setTestCases(prev => ({ ...prev, [problemId]: data }));
    } catch (error: any) {
      console.error(`Failed to load test cases for problem ${problemId}:`, error);
    }
  };

  const handleSaveLab = async () => {
    if (!title.trim()) {
      toast.error('Lab title is required');
      return;
    }

    setSaving(true);
    try {
      const labData: any = {
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        department: department || undefined,
        section: section || undefined,
        is_published: isPublished,
        // Link to subject if selected
        subject_id: selectedSubjectId || undefined,
        department_id: hodDepartmentId || undefined,
        // Only include faculty_ids if user is HOD and has selected faculty
        faculty_ids: (isHOD && selectedFaculty.length > 0) ? selectedFaculty : undefined,
        allow_hints: allowHints,
        allow_multiple_attempts: allowMultipleAttempts,
        max_attempts: maxAttempts,
        // Proctoring settings removed - now session-level only
        total_points: totalPoints,
        passing_score: passingScore,
      };

      if (isEditMode && id) {
        await apiClient.updateLab(Number(id), labData);
        toast.success('Lab updated successfully');
        // Refresh lab data to show updated subject/faculty
        await fetchLab();
      } else {
        const newLab = await apiClient.createLab(labData);
        toast.success('Lab created successfully');
        navigate(`/coding-labs/${newLab.id}/build`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lab');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProblem = async () => {
    if (!problemTitle.trim() || !problemStatement.trim()) {
      toast.error('Problem title and statement are required');
      return;
    }

    if (!id) {
      toast.error('Please save the lab first');
      return;
    }

    try {
      const problemData: any = {
        title: problemTitle,
        description: problemDescription || problemStatement,
        problem_statement: problemStatement,
        starter_code: starterCode || undefined,
        allowed_languages: allowedLanguages,
        default_language: defaultLanguage,
        time_limit_seconds: timeLimitSeconds,
        memory_limit_mb: memoryLimitMb,
        points: problemPoints,
      };

      if (editingProblem) {
        await apiClient.updateProblem(editingProblem.id, problemData);
        toast.success('Problem updated successfully');
      } else {
        await apiClient.createProblem(Number(id), problemData);
        toast.success('Problem created successfully');
      }

      setProblemDialogOpen(false);
      resetProblemForm();
      fetchProblems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save problem');
    }
  };

  const handleSaveTestCase = async () => {
    if (!testCaseName.trim() || !inputData.trim() || !expectedOutput.trim()) {
      toast.error('Test case name, input, and expected output are required');
      return;
    }

    if (!selectedProblem) {
      toast.error('No problem selected');
      return;
    }

    try {
      const testCaseData: any = {
        name: testCaseName,
        type: testCaseType,
        input_data: inputData,
        expected_output: expectedOutput,
        is_sample: isSample,
        points: testCasePoints,
      };

      if (editingTestCase) {
        await apiClient.updateTestCase(editingTestCase.id, testCaseData);
        toast.success('Test case updated successfully');
      } else {
        await apiClient.createTestCase(selectedProblem.id, testCaseData);
        toast.success('Test case created successfully');
      }

      setTestCaseDialogOpen(false);
      resetTestCaseForm();
      fetchTestCases(selectedProblem.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save test case');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'lab') {
        await apiClient.deleteLab(itemToDelete.id);
        toast.success('Lab deleted successfully');
        navigate('/coding-labs');
      } else if (itemToDelete.type === 'problem') {
        await apiClient.deleteProblem(itemToDelete.id);
        toast.success('Problem deleted successfully');
        fetchProblems();
      } else if (itemToDelete.type === 'testcase') {
        await apiClient.deleteTestCase(itemToDelete.id);
        toast.success('Test case deleted successfully');
        if (selectedProblem) {
          fetchTestCases(selectedProblem.id);
        }
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const resetProblemForm = () => {
    setEditingProblem(null);
    setProblemTitle('');
    setProblemDescription('');
    setProblemStatement('');
    setStarterCode('');
    setAllowedLanguages(['python']);
    setDefaultLanguage('python');
    setTimeLimitSeconds(5);
    setMemoryLimitMb(256);
    setProblemPoints(100);
  };

  const resetTestCaseForm = () => {
    setEditingTestCase(null);
    setTestCaseName('');
    setTestCaseType('hidden');
    setInputData('');
    setExpectedOutput('');
    setIsSample(false);
    setTestCasePoints(10);
  };

  const openProblemDialog = (problem?: Problem) => {
    if (problem) {
      setEditingProblem(problem);
      setProblemTitle(problem.title);
      setProblemDescription(problem.description);
      setProblemStatement(problem.problem_statement);
      setStarterCode(problem.starter_code || '');
      setAllowedLanguages(problem.allowed_languages);
      setDefaultLanguage(problem.default_language);
      setTimeLimitSeconds(problem.time_limit_seconds);
      setMemoryLimitMb(problem.memory_limit_mb);
      setProblemPoints(problem.points);
    } else {
      resetProblemForm();
    }
    setProblemDialogOpen(true);
  };

  const openTestCaseDialog = (problem: Problem, testCase?: TestCase) => {
    setSelectedProblem(problem);
    if (testCase) {
      setEditingTestCase(testCase);
      setTestCaseName(testCase.name);
      setTestCaseType(testCase.type);
      setInputData(testCase.input_data);
      setExpectedOutput(testCase.expected_output);
      setIsSample(testCase.is_sample);
      setTestCasePoints(testCase.points);
    } else {
      resetTestCaseForm();
    }
    setTestCaseDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/coding-labs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? 'Edit Lab' : 'Create New Lab'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditMode ? 'Update lab settings and manage problems' : 'Create a new coding lab for students'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="destructive"
              onClick={() => {
                setItemToDelete({ type: 'lab', id: Number(id), name: lab?.title || '' });
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lab
            </Button>
          )}
          <Button onClick={handleSaveLab} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Lab' : 'Create Lab'}
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Lab Settings
          </TabsTrigger>
          {isEditMode && (
            <>
              <TabsTrigger value="problems">
                <Code2 className="h-4 w-4 mr-2" />
                Problems ({problems.length})
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Lab Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Lab title, description, and category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Lab Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Python Basics Lab"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the lab"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Detailed instructions for students"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="CS, IT, etc."
                      disabled={!!hodDepartmentId}
                    />
                    {hodDepartmentId && (
                      <p className="text-xs text-muted-foreground">Auto-set from your department</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="A, B, etc."
                    />
                  </div>
                </div>

                {/* Subject Selection - Only for HOD */}
                {isHOD && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="subject">Subject</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select a subject to link this lab. Faculty assigned to the subject will be auto-assigned to this lab.
                    </p>
                    {loadingSubjects ? (
                      <div className="text-sm text-muted-foreground">Loading subjects...</div>
                    ) : subjects.length === 0 ? (
                      <div className="space-y-2">
                        <Select disabled>
                          <SelectTrigger id="subject">
                            <SelectValue placeholder="No subjects available" />
                          </SelectTrigger>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          No subjects found in your department. Please create subjects first.
                        </p>
                      </div>
                    ) : (
                      <Select
                        value={selectedSubjectId?.toString() || "none"}
                        onValueChange={handleSubjectChange}
                      >
                        <SelectTrigger id="subject" className="w-full">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Subject</SelectItem>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name} {subject.code ? `(${subject.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Faculty Assignment - Only for HOD */}
                {isHOD && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="faculty">Assign Faculty</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedSubjectId 
                        ? "Faculty assigned to the selected subject are auto-selected. You can modify the selection below."
                        : "Select faculty from your department to assign to this lab"}
                    </p>
                    {loadingFaculty ? (
                      <div className="text-sm text-muted-foreground">Loading faculty...</div>
                    ) : availableFaculty.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No faculty available in your department</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {availableFaculty.map((faculty) => (
                          <div key={faculty.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`faculty-${faculty.id}`}
                              checked={selectedFaculty.includes(faculty.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFaculty([...selectedFaculty, faculty.id]);
                                } else {
                                  setSelectedFaculty(selectedFaculty.filter(id => id !== faculty.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`faculty-${faculty.id}`} className="text-sm cursor-pointer flex-1">
                              {faculty.name} ({faculty.email})
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedFaculty.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedFaculty.length} faculty member(s) selected
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lab Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Lab Configuration</CardTitle>
                <CardDescription>Settings and restrictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Published</Label>
                    <p className="text-sm text-muted-foreground">Make lab visible to students</p>
                  </div>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Hints</Label>
                    <p className="text-sm text-muted-foreground">Students can view hints</p>
                  </div>
                  <Switch checked={allowHints} onCheckedChange={setAllowHints} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Multiple Attempts</Label>
                    <p className="text-sm text-muted-foreground">Allow multiple submissions</p>
                  </div>
                  <Switch checked={allowMultipleAttempts} onCheckedChange={setAllowMultipleAttempts} />
                </div>

                {allowMultipleAttempts && (
                  <div className="space-y-2">
                    <Label htmlFor="maxAttempts">Max Attempts</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      value={maxAttempts || ''}
                      onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Unlimited if empty"
                      min={1}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="totalPoints">Total Points</Label>
                  <Input
                    id="totalPoints"
                    type="number"
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(parseFloat(e.target.value))}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseFloat(e.target.value))}
                    min={0}
                    max={totalPoints}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Note: Proctoring Settings moved to session level */}
            {/* Each session can have its own proctoring settings based on mode */}
          </div>
        </TabsContent>

        {/* Problems Tab */}
        {isEditMode && (
          <TabsContent value="problems">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Problems</CardTitle>
                    <CardDescription>Manage coding problems in this lab</CardDescription>
                  </div>
                  <Button onClick={() => openProblemDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Problem
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {problems.length === 0 ? (
                  <div className="text-center py-12">
                    <Code2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold">No problems yet</p>
                    <p className="text-muted-foreground mt-2">Add your first problem to get started</p>
                    <Button onClick={() => openProblemDialog()} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Problem
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {problems.map((problem, index) => (
                      <Card key={problem.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">Problem {index + 1}</Badge>
                                <CardTitle className="text-lg">{problem.title}</CardTitle>
                              </div>
                              <CardDescription className="mt-2">
                                {problem.description || problem.problem_statement.substring(0, 100)}...
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProblem(problem);
                                  setTestCaseDialogOpen(true);
                                }}
                              >
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Cases ({testCases[problem.id]?.length || 0})
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openProblemDialog(problem)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete({ type: 'problem', id: problem.id, name: problem.title });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Languages:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {problem.allowed_languages.map(lang => (
                                  <Badge key={lang} variant="secondary">{lang}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time Limit:</span>
                              <p>{problem.time_limit_seconds}s</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Memory Limit:</span>
                              <p>{problem.memory_limit_mb}MB</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Points:</span>
                              <p>{problem.points}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Preview Tab */}
        {isEditMode && (
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Lab Preview</CardTitle>
                <CardDescription>How students will see this lab</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      {/* Mode and difficulty moved to session level */}
                      {isPublished && <Badge variant="default">Published</Badge>}
                    </div>
                  </div>
                  {description && <p className="text-muted-foreground">{description}</p>}
                  {instructions && (
                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{instructions}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Problems ({problems.length})</h4>
                    {problems.length === 0 ? (
                      <p className="text-muted-foreground">No problems added yet</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {problems.map((p, i) => (
                          <li key={p.id}>{i + 1}. {p.title} ({p.points} pts)</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button onClick={() => navigate(`/coding-labs/${id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View as Student
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Problem Dialog */}
      <Dialog open={problemDialogOpen} onOpenChange={setProblemDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProblem ? 'Edit Problem' : 'Add Problem'}</DialogTitle>
            <DialogDescription>
              Create a coding problem with test cases
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Problem Title *</Label>
              <Input
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Sum of Two Numbers"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Problem Statement *</Label>
              <Textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Detailed problem statement..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Starter Code</Label>
              <Textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                placeholder="def solution():\n    pass"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={problemPoints}
                  onChange={(e) => setProblemPoints(parseFloat(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Limit (seconds)</Label>
                <Input
                  type="number"
                  value={timeLimitSeconds}
                  onChange={(e) => setTimeLimitSeconds(parseInt(e.target.value))}
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Memory Limit (MB)</Label>
                <Input
                  type="number"
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(parseInt(e.target.value))}
                  min={64}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProblemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProblem}>
              {editingProblem ? 'Update' : 'Create'} Problem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Case Dialog */}
      <Dialog open={testCaseDialogOpen} onOpenChange={setTestCaseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTestCase ? 'Edit Test Case' : 'Add Test Case'}
              {selectedProblem && ` - ${selectedProblem.title}`}
            </DialogTitle>
            <DialogDescription>
              Define input and expected output for evaluation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Case Name *</Label>
              <Input
                value={testCaseName}
                onChange={(e) => setTestCaseName(e.target.value)}
                placeholder="Test Case 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={testCaseType} onValueChange={setTestCaseType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Visible to students)</SelectItem>
                    <SelectItem value="hidden">Hidden (Evaluation only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={testCasePoints}
                  onChange={(e) => setTestCasePoints(parseFloat(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={isSample} onCheckedChange={setIsSample} id="sample" />
              <Label htmlFor="sample">Sample Test Case</Label>
            </div>

            <div className="space-y-2">
              <Label>Input Data *</Label>
              <Textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="5\n10"
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Output *</Label>
              <Textarea
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="15"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestCaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTestCase}>
              {editingTestCase ? 'Update' : 'Create'} Test Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

