import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, Plus, Edit, Trash2, Eye, Users, Building2, 
  MapPin, Calendar, IndianRupee, CheckCircle2, XCircle 
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { Checkbox } from "@/components/ui/checkbox";

interface Job {
  id: number;
  company: string;
  company_name?: string; // For backward compatibility
  role: string;
  title?: string;
  description: string;
  location: string | null;
  ctc: string | null;
  eligibility_type: string;
  eligible_branches: string[] | null;
  eligible_user_ids: number[] | null;
  eligible_years: string[] | null;
  requirements: string[];
  rounds?: string[]; // Backend uses 'rounds'
  selection_rounds?: string[]; // Legacy support
  deadline: string;
  company_logo?: string | null; // Company logo URL
  is_active: boolean;
  college_id: number;
  created_at: string;
  updated_at: string;
}

interface JobApplication {
  id: number;
  job_id: number;
  user_id: number;
  status: string;
  current_round: string | null;
  applied_at: string;
  notes: string | null;
  user?: {
    email: string;
    full_name: string | null;
  };
}

interface Department {
  id: number;
  name: string;
  code: string | null;
}

export default function ManageJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applicationsDialogOpen, setApplicationsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    company_name: "",
    role: "",
    description: "",
    location: "",
    ctc: "",
    company_logo: "",
    eligibility_type: "all_students" as "all_students" | "branch" | "specific_students",
    eligible_branches: [] as string[],
    eligible_user_ids: [] as number[],
    eligible_years: [] as string[],
    requirements: [] as string[],
    selection_rounds: [] as string[],
    deadline: "",
    is_active: true,
  });
  
  const [tempRequirement, setTempRequirement] = useState("");
  const [tempRound, setTempRound] = useState("");
  const [tempBranch, setTempBranch] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [tempUserId, setTempUserId] = useState("");

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const depts = await apiClient.getDepartments();
      setDepartments(depts || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Job[]>('/jobs?is_active=true');
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error(error.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId: number) => {
    try {
      const data = await apiClient.get<JobApplication[]>(`/jobs/${jobId}/applications`);
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error(error.message || 'Failed to fetch applications');
    }
  };

  const handleOpenDialog = (job?: Job) => {
    if (job) {
      setFormData({
        company_name: job.company || job.company_name || "",
        role: job.role,
        description: job.description || "",
        location: job.location || "",
        ctc: job.ctc || "",
        company_logo: job.company_logo || "",
        eligibility_type: job.eligibility_type as "all_students" | "branch" | "specific_students",
        eligible_branches: job.eligible_branches || [],
        eligible_user_ids: job.eligible_user_ids || [],
        eligible_years: job.eligible_years || [],
        requirements: job.requirements || [],
        selection_rounds: job.rounds || job.selection_rounds || [],
        deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : "",
        is_active: job.is_active,
      });
      setSelectedJob(job);
    } else {
      // Reset form for new job
      setFormData({
        company_name: "",
        role: "",
        description: "",
        location: "",
        ctc: "",
        eligibility_type: "all_students",
        eligible_branches: [],
        eligible_user_ids: [],
        eligible_years: [],
        company_logo: "",
        requirements: [],
        selection_rounds: [],
        deadline: "",
        is_active: true,
      });
      setSelectedJob(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedJob(null);
    setTempRequirement("");
    setTempRound("");
    setTempBranch("");
    setTempUserId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.role || !formData.description || !formData.deadline) {
      toast.error("Please fill in all required fields (Company, Role, Description, Deadline)");
      return;
    }

    // Validate eligibility data
    if (formData.eligibility_type === "branch" && formData.eligible_branches.length === 0) {
      toast.error("Please add at least one branch for branch-based eligibility");
      return;
    }
    
    if (formData.eligibility_type === "specific_students" && formData.eligible_user_ids.length === 0) {
      toast.error("Please add at least one user ID for specific student eligibility");
      return;
    }

    try {
      const jobPayload = {
        title: formData.role, // Backend expects 'title'
        company: formData.company_name, // Backend uses 'company'
        role: formData.role,
        description: formData.description,
        location: formData.location || null,
        ctc: formData.ctc || null,
        company_logo: formData.company_logo || null,
        deadline: new Date(formData.deadline).toISOString(),
        requirements: formData.requirements.filter(r => r.trim() !== ""),
        rounds: formData.selection_rounds.filter(r => r.trim() !== ""), // Backend uses 'rounds'
        is_active: formData.is_active,
        eligibility_type: formData.eligibility_type,
        eligible_branches: formData.eligibility_type === "branch" ? formData.eligible_branches : null,
        eligible_user_ids: formData.eligibility_type === "specific_students" ? formData.eligible_user_ids : null,
        eligible_years: formData.eligible_years.length > 0 ? formData.eligible_years : null,
      };

      if (selectedJob) {
        // Update existing job
        await apiClient.put(`/jobs/${selectedJob.id}`, jobPayload);
        toast.success("Job updated successfully!");
      } else {
        // Create new job - college_id will be set by backend from user's college
        await apiClient.post('/jobs', jobPayload);
        toast.success("Job created successfully!");
      }
      
      handleCloseDialog();
      fetchJobs();
    } catch (error: any) {
      console.error('Error saving job:', error);
      toast.error(error.message || 'Failed to save job');
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.delete(`/jobs/${jobId}`);
      toast.success("Job deleted successfully!");
      fetchJobs();
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error(error.message || 'Failed to delete job');
    }
  };

  const handleViewApplications = async (job: Job) => {
    setSelectedJob(job);
    await fetchApplications(job.id);
    setApplicationsDialogOpen(true);
  };

  const handleUpdateApplicationStatus = async (appId: number, status: string) => {
    try {
      await apiClient.put(`/jobs/applications/${appId}`, { status });
      toast.success("Application status updated!");
      if (selectedJob) {
        await fetchApplications(selectedJob.id);
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.message || 'Failed to update application');
    }
  };

  const addRequirement = () => {
    if (tempRequirement.trim()) {
      setFormData({
        ...formData,
        requirements: [...formData.requirements, tempRequirement.trim()],
      });
      setTempRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    });
  };

  const addRound = () => {
    if (tempRound.trim()) {
      setFormData({
        ...formData,
        selection_rounds: [...formData.selection_rounds, tempRound.trim()],
      });
      setTempRound("");
    }
  };

  const removeRound = (index: number) => {
    setFormData({
      ...formData,
      selection_rounds: formData.selection_rounds.filter((_, i) => i !== index),
    });
  };

  const addBranch = () => {
    if (selectedDepartmentId) {
      const dept = departments.find(d => d.id.toString() === selectedDepartmentId);
      if (dept) {
        const branchName = dept.name;
        if (!formData.eligible_branches.includes(branchName)) {
          setFormData({
            ...formData,
            eligible_branches: [...formData.eligible_branches, branchName],
          });
          setSelectedDepartmentId("");
        }
      }
    } else if (tempBranch.trim() && !formData.eligible_branches.includes(tempBranch.trim())) {
      // Fallback to manual entry if no department selected
      setFormData({
        ...formData,
        eligible_branches: [...formData.eligible_branches, tempBranch.trim()],
      });
      setTempBranch("");
    }
  };

  const removeBranch = (branch: string) => {
    setFormData({
      ...formData,
      eligible_branches: formData.eligible_branches.filter(b => b !== branch),
    });
  };

  const addUserId = () => {
    const userId = parseInt(tempUserId);
    if (!isNaN(userId) && !formData.eligible_user_ids.includes(userId)) {
      setFormData({
        ...formData,
        eligible_user_ids: [...formData.eligible_user_ids, userId],
      });
      setTempUserId("");
    }
  };

  const removeUserId = (userId: number) => {
    setFormData({
      ...formData,
      eligible_user_ids: formData.eligible_user_ids.filter(id => id !== userId),
    });
  };

  const filteredJobs = jobs.filter(job => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return job.is_active;
    if (activeTab === "inactive") return !job.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs & Placement Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage job postings for your college</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add New Job
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({jobs.filter(j => j.is_active).length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({jobs.filter(j => !j.is_active).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading jobs...</p>
              </CardContent>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No jobs found. Create your first job posting!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{job.role}</CardTitle>
                          <Badge variant={job.is_active ? "default" : "secondary"}>
                            {job.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-base text-muted-foreground">
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {job.company || job.company_name}
                            </span>
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.eligibility_type === "all_students" ? "All Students" :
                           job.eligibility_type === "branch" ? `${job.eligible_branches?.length || 0} Branches` :
                           `${job.eligible_user_ids?.length || 0} Students`}
                          {job.eligible_years && job.eligible_years.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              | Years: {job.eligible_years.join(", ")}
                            </span>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {job.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm">
                        {job.ctc && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {job.ctc}
                          </span>
                        )}
                        {job.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewApplications(job)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View Applications
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(job)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(job.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob ? "Edit Job" : "Create New Job"}</DialogTitle>
            <DialogDescription>
              {selectedJob ? "Update job details" : "Add a new job posting for your college students"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  placeholder="e.g., Google, Microsoft"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  placeholder="e.g., Software Engineer, Data Analyst"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the job role, responsibilities, and requirements..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Bangalore, Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctc">CTC/Package</Label>
                <Input
                  id="ctc"
                  placeholder="e.g., ₹12 LPA, ₹8-10 LPA"
                  value={formData.ctc}
                  onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_logo">Company Logo URL</Label>
              <Input
                id="company_logo"
                placeholder="https://example.com/logo.png or /uploads/logo.png"
                value={formData.company_logo}
                onChange={(e) => setFormData({ ...formData, company_logo: e.target.value })}
              />
              {formData.company_logo && (
                <div className="mt-2">
                  <img 
                    src={formData.company_logo} 
                    alt="Company logo preview" 
                    className="h-16 w-16 object-contain border rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a URL or path to the company logo image
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Eligibility Settings */}
            <div className="space-y-4 border-t pt-4">
              <Label>Eligibility Type *</Label>
              <Select
                value={formData.eligibility_type}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  eligibility_type: value,
                  eligible_branches: value !== "branch" ? [] : formData.eligible_branches,
                  eligible_user_ids: value !== "specific_students" ? [] : formData.eligible_user_ids,
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_students">All Students</SelectItem>
                  <SelectItem value="branch">By Branch/Department</SelectItem>
                  <SelectItem value="specific_students">Specific Students (by User ID)</SelectItem>
                </SelectContent>
              </Select>

              {formData.eligibility_type === "branch" && (
                <div className="space-y-2">
                  <Label>Eligible Branches/Departments</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedDepartmentId}
                      onValueChange={setSelectedDepartmentId}
                      disabled={departmentsLoading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select a department"} />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name} {dept.code && `(${dept.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addBranch} disabled={!selectedDepartmentId}>
                      Add
                    </Button>
                  </div>
                  {/* Fallback manual entry */}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Or enter branch name manually (e.g., CSE, ECE)"
                      value={tempBranch}
                      onChange={(e) => setTempBranch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBranch())}
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" onClick={addBranch} disabled={!tempBranch.trim()}>
                      Add Manual
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.eligible_branches.map((branch) => (
                      <Badge key={branch} variant="secondary" className="gap-2">
                        {branch}
                        <button
                          type="button"
                          onClick={() => removeBranch(branch)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {formData.eligible_branches.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Only students from the selected branches will be able to view and apply for this placement.
                    </p>
                  )}
                </div>
              )}

              {/* Year Filter - Independent of eligibility type */}
              <div className="space-y-2">
                <Label>Eligible Years (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select which years can see this job. Leave empty to show to all years.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["1st", "2nd", "3rd", "4th", "5th"].map((year) => (
                    <div key={year} className="flex items-center space-x-2">
                      <Checkbox
                        id={`year-${year}`}
                        checked={formData.eligible_years.includes(year)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              eligible_years: [...formData.eligible_years, year],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              eligible_years: formData.eligible_years.filter((y) => y !== year),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`year-${year}`} className="cursor-pointer">
                        {year}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.eligible_years.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {formData.eligible_years.join(", ")}
                  </div>
                )}
              </div>

              {formData.eligibility_type === "specific_students" && (
                <div className="space-y-2">
                  <Label>Eligible User IDs</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter user ID"
                      value={tempUserId}
                      onChange={(e) => setTempUserId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUserId())}
                    />
                    <Button type="button" onClick={addUserId}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.eligible_user_ids.map((userId) => (
                      <Badge key={userId} variant="secondary" className="gap-2">
                        User #{userId}
                        <button
                          type="button"
                          onClick={() => removeUserId(userId)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="space-y-2 border-t pt-4">
              <Label>Requirements</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Bachelor's degree in Computer Science"
                  value={tempRequirement}
                  onChange={(e) => setTempRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                />
                <Button type="button" onClick={addRequirement}>Add</Button>
              </div>
              <div className="space-y-1 mt-2">
                {formData.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      className="text-destructive hover:text-destructive-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Selection Rounds */}
            <div className="space-y-2 border-t pt-4">
              <Label>Selection Rounds</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Written Test, Technical Round"
                  value={tempRound}
                  onChange={(e) => setTempRound(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRound())}
                />
                <Button type="button" onClick={addRound}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.selection_rounds.map((round, idx) => (
                  <Badge key={idx} variant="outline" className="gap-2">
                    {round}
                    <button
                      type="button"
                      onClick={() => removeRound(idx)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                {selectedJob ? "Update Job" : "Create Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Applications Dialog */}
      <Dialog open={applicationsDialogOpen} onOpenChange={setApplicationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Applications for {selectedJob?.role} at {selectedJob?.company || selectedJob?.company_name}
            </DialogTitle>
            <DialogDescription>
              View and manage student applications for this job
            </DialogDescription>
          </DialogHeader>

          {applications.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Current Round</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">User ID: {app.user_id}</div>
                        {app.user?.email && (
                          <div className="text-sm text-muted-foreground">{app.user.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(app.applied_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {app.current_round || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          app.status === "Selected" || app.status === "Offer" ? "default" :
                          app.status === "Shortlisted" || app.status === "Interview" ? "secondary" :
                          app.status === "Rejected" ? "destructive" : "outline"
                        }
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={app.status}
                        onValueChange={(value) => handleUpdateApplicationStatus(app.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Applied">Applied</SelectItem>
                          <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="Interview">Interview</SelectItem>
                          <SelectItem value="Selected">Selected</SelectItem>
                          <SelectItem value="Offer">Offer</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

