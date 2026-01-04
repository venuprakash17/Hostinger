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
import { Plus, Code, Trash2, Loader2, Code2, CheckCircle2, ArrowUp } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";

interface CodingProblem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags?: string[];
  constraints?: string;
  is_active?: boolean;
  created_at?: string;
}

export default function ManageCodingProblems() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [assignedSections, setAssignedSections] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    constraints: "",
    sample_input: "",
    sample_output: "",
    tags: [] as string[],
    expiry_date: "",
    section: "", // Section name (e.g., "A", "B") - optional
    year: "", // Year (1, 2, 3, 4) - optional
    test_cases: [] as Array<{stdin: string; expected_output: string; is_public: boolean}>
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProblems();
    fetchUserInfo();
    fetchSections();
    fetchAssignedSections();
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
        // For faculty, fetch sections from their department/branch only
        const departmentId = profile.department_id || undefined;
        
        // Fetch sections - backend will filter by college, we'll filter by department on frontend
        const data = await apiClient.getSections(profile.college_id, departmentId, undefined, false);
        
        // Filter sections by faculty's department if department is specified
        let filteredSections = data || [];
        if (profile.department && !departmentId) {
          // Filter by department name if we don't have department_id
          filteredSections = filteredSections.filter((section: any) => 
            section.department_name === profile.department
          );
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
        
        setSections(sortedSections);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchAssignedSections = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.user_id) {
        // Get assigned students which includes section info
        const data = await apiClient.getFacultyAssignedStudents(profile.user_id);
        if (data?.sections) {
          setAssignedSections(data.sections || []);
        }
      }
    } catch (error) {
      console.error("Error fetching assigned sections:", error);
      // If API fails, we'll use all sections instead
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listCodingProblems({ is_active: true });
      setProblems(data || []);
    } catch (error: any) {
      console.error("Error fetching coding problems:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to load coding problems.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({ title: "Error", description: "Title and description are required", variant: "destructive" });
      return;
    }

    if (formData.test_cases.length === 0) {
      toast({ title: "Error", description: "At least one test case is required", variant: "destructive" });
      return;
    }
    
    try {
      const problemData: any = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        constraints: formData.constraints || undefined,
        sample_input: formData.sample_input || undefined,
        sample_output: formData.sample_output || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        is_active: true,
        test_cases: formData.test_cases.map(tc => ({
          stdin: tc.stdin,
          expected_output: tc.expected_output,
          is_public: tc.is_public
        })),
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined
      };
      
      // Add college_id
      if (userProfile?.college_id) {
        problemData.college_id = userProfile.college_id;
      }
      if (userProfile?.department) {
        problemData.department = userProfile.department;
      }
      
      // Visibility Logic:
      // 1. Both section and year empty → whole college
      // 2. Only section given (e.g., "A") → all sections with that name in branch (HOD) or assigned sections (faculty)
      // 3. Section + year → only those specific sections
      // 4. Nothing → all students assigned to faculty
      
      if (!formData.section && !formData.year) {
        // Both empty → whole college
        problemData.scope_type = "college";
      } else if (formData.section && !formData.year) {
        // Only section given → all sections with that name
        problemData.scope_type = "section";
        problemData.section = formData.section; // Section name (e.g., "A")
        // For faculty: only assigned sections with this name
        // For HOD: all sections with this name in department
      } else if (formData.section && formData.year) {
        // Section + year → specific sections
        problemData.scope_type = "section";
        problemData.section = formData.section;
        problemData.year = parseInt(formData.year);
        problemData.year_str = `${formData.year}${formData.year === "1" ? 'st' : formData.year === "2" ? 'nd' : formData.year === "3" ? 'rd' : 'th'}`;
      } else if (!formData.section && formData.year) {
        // Only year → department-wide for that year
        problemData.scope_type = "department";
        problemData.year = parseInt(formData.year);
        problemData.year_str = `${formData.year}${formData.year === "1" ? 'st' : formData.year === "2" ? 'nd' : formData.year === "3" ? 'rd' : 'th'}`;
      } else {
        // Default: all students assigned to faculty
        problemData.scope_type = "section";
        // Will be filtered by backend based on faculty assignments
      }
      
      await apiClient.createCodingProblem(problemData);
      
      toast({ title: "Success", description: "Coding problem created successfully" });
      setOpen(false);
      setFormData({ 
        title: "", 
        description: "", 
        difficulty: "Easy", 
        constraints: "", 
        sample_input: "",
        sample_output: "",
        tags: [],
        expiry_date: "",
        section: "",
        year: "",
        test_cases: []
      });
      fetchProblems();
    } catch (error: any) {
      console.error("Error creating coding problem:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create coding problem", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this problem?")) return;

    try {
      await apiClient.deleteCodingProblem(id);
      toast({ title: "Success", description: "Problem deleted successfully" });
      fetchProblems();
    } catch (error: any) {
      console.error("Error deleting coding problem:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete problem", 
        variant: "destructive" 
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-500";
      case "Medium": return "text-yellow-500";
      case "Hard": return "text-red-500";
      default: return "";
    }
  };

  // Get unique section names from assigned sections or all sections
  const getAvailableSectionNames = () => {
    const sourceSections = userRoles.includes("faculty") && assignedSections.length > 0 
      ? assignedSections 
      : sections;
    
    const uniqueNames = new Set<string>();
    sourceSections.forEach((s: any) => {
      if (s.name) uniqueNames.add(s.name);
    });
    return Array.from(uniqueNames).sort();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Coding Problems</h1>
        <div className="flex gap-2">
          <FileUpload
            endpoint="/bulk-upload/coding-problems"
            accept=".xlsx,.xls,.csv,.json"
            label="Bulk Upload"
            description="Upload coding problems from Excel/CSV/JSON"
            templateUrl="/bulk-upload/templates/coding-problem?format=xlsx"
            templateFileName="coding_problem_upload_template.xlsx"
            onSuccess={() => {
              toast({ title: "Success", description: "Coding problems uploaded successfully" });
              fetchProblems();
            }}
            onError={(error) => {
              toast({ 
                title: "Upload Error", 
                description: error.message || "Failed to upload coding problems",
                variant: "destructive"
              });
            }}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Problem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Coding Problem</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Problem Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    required
                  />
                </div>
                <div>
                  <Label>Constraints</Label>
                  <Textarea
                    value={formData.constraints}
                    onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
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
                
                <div>
                  <Label>Sample Input</Label>
                  <Textarea
                    value={formData.sample_input}
                    onChange={(e) => setFormData({ ...formData, sample_input: e.target.value })}
                    rows={3}
                    placeholder="Example input"
                  />
                </div>
                
                <div>
                  <Label>Sample Output</Label>
                  <Textarea
                    value={formData.sample_output}
                    onChange={(e) => setFormData({ ...formData, sample_output: e.target.value })}
                    rows={3}
                    placeholder="Expected output"
                  />
                </div>

                {/* Section and Year Columns */}
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label>Section (Optional)</Label>
                    <Select 
                      value={formData.section} 
                      onValueChange={(value) => setFormData({ ...formData, section: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section (e.g., A, B)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (All Sections)</SelectItem>
                        {getAvailableSectionNames().map((name) => (
                          <SelectItem key={name} value={name}>
                            Section {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for all sections. If only section is given, visible to all {formData.section} sections in your branch.
                    </p>
                  </div>
                  <div>
                    <Label>Year (Optional)</Label>
                    <Select 
                      value={formData.year} 
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (All Years)</SelectItem>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for all years. If both empty, visible to whole college.
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">Visibility Rules:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Both empty → Whole college</li>
                    <li>Only section → All {formData.section || "selected"} sections in your branch</li>
                    <li>Section + Year → Only {formData.section || "selected"} section of {formData.year ? `${formData.year}${formData.year === "1" ? "st" : formData.year === "2" ? "nd" : formData.year === "3" ? "rd" : "th"}` : "selected"} year</li>
                    <li>Only year → All sections of {formData.year ? `${formData.year}${formData.year === "1" ? "st" : formData.year === "2" ? "nd" : formData.year === "3" ? "rd" : "th"}` : "selected"} year in your department</li>
                  </ul>
                </div>

                {/* Test Cases Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Test Cases *</h3>
                      <p className="text-xs text-muted-foreground">
                        Add test cases for evaluating solutions. Public test cases are visible to students.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formData.test_cases.length} test case{formData.test_cases.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {formData.test_cases.length === 0 && (
                    <Card className="p-6 border-dashed">
                      <div className="text-center text-muted-foreground">
                        <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No test cases added yet</p>
                        <p className="text-xs mt-1">Add at least one test case to enable code evaluation</p>
                      </div>
                    </Card>
                  )}
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formData.test_cases.map((testCase, index) => (
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
                              setFormData({
                                ...formData,
                                test_cases: formData.test_cases.filter((_, i) => i !== index)
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
                              Input (stdin) *
                            </Label>
                            <Textarea
                              value={testCase.stdin}
                              onChange={(e) => {
                                const updated = [...formData.test_cases];
                                updated[index].stdin = e.target.value;
                                setFormData({ ...formData, test_cases: updated });
                              }}
                              rows={4}
                              className="font-mono text-xs resize-none"
                              placeholder="Enter test input"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Expected Output *
                            </Label>
                            <Textarea
                              value={testCase.expected_output}
                              onChange={(e) => {
                                const updated = [...formData.test_cases];
                                updated[index].expected_output = e.target.value;
                                setFormData({ ...formData, test_cases: updated });
                              }}
                              rows={4}
                              className="font-mono text-xs resize-none"
                              placeholder="Enter expected output"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={testCase.is_public}
                              onChange={(e) => {
                                const updated = [...formData.test_cases];
                                updated[index].is_public = e.target.checked;
                                setFormData({ ...formData, test_cases: updated });
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
                                const updated = [...formData.test_cases];
                                [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                setFormData({ ...formData, test_cases: updated });
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
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        test_cases: [
                          ...formData.test_cases,
                          { stdin: "", expected_output: "", is_public: true }
                        ]
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test Case
                  </Button>
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
                    Problem will be hidden after this date
                  </p>
                </div>

                <Button type="submit" className="w-full">Add Problem</Button>
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
              <p className="text-muted-foreground">Loading coding problems...</p>
            </CardContent>
          </Card>
        ) : problems.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coding problems yet. Add your first problem!</p>
            </CardContent>
          </Card>
        ) : (
          problems.map((problem) => (
            <Card key={problem.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{problem.title}</CardTitle>
                    <span className={`text-sm font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{problem.description}</p>
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {problem.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(problem.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
