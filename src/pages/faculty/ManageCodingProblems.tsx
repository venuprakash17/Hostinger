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
import { Plus, Code, Trash2, Loader2, Download } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";

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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    constraints: "",
    sample_input: "",
    sample_output: "",
    tags: [] as string[],
    expiry_date: "",
    scope_type: "section" as "college" | "department" | "section",
    section_id: undefined as number | undefined,
    year: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProblems();
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

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listCodingProblems({ is_active: true });
      setProblems(data || []);
    } catch (error: any) {
      console.error("Error fetching coding problems:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to load coding problems. Note: Only super admins can manage coding problems.", 
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
        scope_type: formData.scope_type,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined
      };
      
      // Add scope-specific fields
      if (userProfile?.college_id) {
        problemData.college_id = userProfile.college_id;
      }
      if (userProfile?.department) {
        problemData.department = userProfile.department;
      }
      if (formData.scope_type === "section" && formData.section_id) {
        problemData.section_id = formData.section_id;
      }
      // Year is important for visibility - make it more prominent
      if (formData.year) {
        problemData.year = formData.year;
      } else if (userProfile?.present_year) {
        // Auto-set to current year if not specified
        problemData.year = userProfile.present_year;
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
        scope_type: formData.scope_type,
        section_id: undefined,
        year: ""
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Coding Problem</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Problem Title</Label>
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
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only students of this year will see this problem
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
