import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, Edit, Trash2, X, Loader2, Building2, MapPin, Calendar, IndianRupee, Users, CheckCircle2, Download, Search, Filter, CheckSquare, Square } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";

interface Job {
  id: number;
  title: string;
  company: string;
  role: string;
  description: string | null;
  location: string | null;
  ctc: string | null;
  eligibility_type: "all_students" | "branch" | "specific_students";
  eligible_branches: string[] | null;
  eligible_user_ids: number[] | null;
  job_type: "On-Campus" | "Off-Campus" | "Internship";
  requirements: string[] | null;
  rounds: string[] | null;
  deadline: string | null;
  is_active: boolean;
  college_id: number | null;
  posted_date: string;
  created_at: string;
  updated_at: string | null;
}

export default function ManageJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    search: "",
    job_type: "",
    is_active: undefined as boolean | undefined,
  });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    role: "",
    description: "",
    location: "",
    ctc: "",
    eligibility_type: "all_students" as "all_students" | "branch" | "specific_students",
    eligible_branches: [] as string[],
    eligible_user_ids: [] as number[],
    job_type: "On-Campus" as "On-Campus" | "Off-Campus" | "Internship",
    requirements: [] as string[],
    rounds: [] as string[],
    deadline: "",
    is_active: true,
  });

  const [tempRequirement, setTempRequirement] = useState("");
  const [tempRound, setTempRound] = useState("");
  const [tempBranch, setTempBranch] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.job_type) params.job_type = filters.job_type;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
      
      const data = await apiClient.listJobs(params);
      setJobs(data || []);
      setSelectedJobs(new Set()); // Clear selection when filters change
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.company.trim() || !formData.role.trim()) {
      toast({
        title: "Error",
        description: "Title, company, and role are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.eligibility_type === "branch" && formData.eligible_branches.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one eligible branch",
        variant: "destructive",
      });
      return;
    }

    if (formData.eligibility_type === "specific_students" && formData.eligible_user_ids.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one eligible user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const jobData: any = {
        title: formData.title,
        company: formData.company,
        role: formData.role,
        description: formData.description || undefined,
        location: formData.location || undefined,
        ctc: formData.ctc || undefined,
        eligibility_type: formData.eligibility_type,
        eligible_branches: formData.eligibility_type === "branch" ? formData.eligible_branches : undefined,
        eligible_user_ids: formData.eligibility_type === "specific_students" ? formData.eligible_user_ids : undefined,
        job_type: formData.job_type,
        requirements: formData.requirements.length > 0 ? formData.requirements : undefined,
        rounds: formData.rounds.length > 0 ? formData.rounds : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        is_active: formData.is_active,
        // college_id is optional - NULL means global (available to all students)
      };

      if (editingJob) {
        await apiClient.updateJob(editingJob.id, jobData);
        toast({ title: "Success", description: "Job updated successfully" });
      } else {
        await apiClient.createJob(jobData);
        toast({ title: "Success", description: "Job created successfully" });
      }

      setOpen(false);
      setEditingJob(null);
      resetForm();
      fetchJobs();
    } catch (error: any) {
      console.error("Error saving job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save job",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company,
      role: job.role,
      description: job.description || "",
      location: job.location || "",
      ctc: job.ctc || "",
      eligibility_type: job.eligibility_type,
      eligible_branches: job.eligible_branches || [],
      eligible_user_ids: job.eligible_user_ids || [],
      job_type: job.job_type,
      requirements: job.requirements || [],
      rounds: job.rounds || [],
      deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 16) : "",
      is_active: job.is_active,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      await apiClient.deleteJob(id);
      toast({ title: "Success", description: "Job deleted successfully" });
      fetchJobs();
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      company: "",
      role: "",
      description: "",
      location: "",
      ctc: "",
      eligibility_type: "all_students",
      eligible_branches: [],
      eligible_user_ids: [],
      job_type: "On-Campus",
      requirements: [],
      rounds: [],
      deadline: "",
      is_active: true,
    });
    setTempRequirement("");
    setTempRound("");
    setTempBranch("");
    setTempUserId("");
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
        rounds: [...formData.rounds, tempRound.trim()],
      });
      setTempRound("");
    }
  };

  const removeRound = (index: number) => {
    setFormData({
      ...formData,
      rounds: formData.rounds.filter((_, i) => i !== index),
    });
  };

  const addBranch = () => {
    if (tempBranch.trim()) {
      setFormData({
        ...formData,
        eligible_branches: [...formData.eligible_branches, tempBranch.trim()],
      });
      setTempBranch("");
    }
  };

  const removeBranch = (index: number) => {
    setFormData({
      ...formData,
      eligible_branches: formData.eligible_branches.filter((_, i) => i !== index),
    });
  };

  const addUserId = () => {
    const userId = parseInt(tempUserId);
    if (!isNaN(userId) && userId > 0) {
      if (!formData.eligible_user_ids.includes(userId)) {
        setFormData({
          ...formData,
          eligible_user_ids: [...formData.eligible_user_ids, userId],
        });
        setTempUserId("");
      } else {
        toast({
          title: "Error",
          description: "User ID already added",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid user ID",
        variant: "destructive",
      });
    }
  };

  const removeUserId = (userId: number) => {
    setFormData({
      ...formData,
      eligible_user_ids: formData.eligible_user_ids.filter((id) => id !== userId),
    });
  };


  const getEligibilityDisplay = (job: Job) => {
    if (job.eligibility_type === "all_students") {
      return "All Students";
    } else if (job.eligibility_type === "branch") {
      return `Branches: ${job.eligible_branches?.join(", ") || "N/A"}`;
    } else {
      return `${job.eligible_user_ids?.length || 0} Specific Students`;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    } else {
      setSelectedJobs(new Set());
    }
  };

  const handleSelectJob = (jobId: number, checked: boolean) => {
    const newSelected = new Set(selectedJobs);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one job to delete",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedJobs.size} job(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.bulkDeleteJobs(Array.from(selectedJobs));
      toast({
        title: "Success",
        description: `Deleted ${selectedJobs.size} job(s) successfully`,
      });
      setSelectedJobs(new Set());
      fetchJobs();
    } catch (error: any) {
      console.error("Error deleting jobs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete jobs",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdateStatus = async (isActive: boolean) => {
    if (selectedJobs.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one job",
        variant: "destructive",
      });
      return;
    }

    const action = isActive ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${action} ${selectedJobs.size} job(s)?`)) {
      return;
    }

    try {
      await apiClient.bulkUpdateJobStatus(Array.from(selectedJobs), isActive);
      toast({
        title: "Success",
        description: `${selectedJobs.size} job(s) ${isActive ? "activated" : "deactivated"} successfully`,
      });
      setSelectedJobs(new Set());
      fetchJobs();
    } catch (error: any) {
      console.error("Error updating job status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage job postings (available to all registered students)
          </p>
        </div>
        <div className="flex gap-2">
          <FileUpload
            endpoint="/jobs/bulk-upload"
            accept=".xlsx,.xls,.csv"
            label="Bulk Upload Jobs"
            description="Upload multiple jobs from Excel/CSV file"
            onSuccess={(result) => {
              toast({ 
                title: "Success", 
                description: result.message || `Successfully uploaded ${result.success_count || 0} jobs` 
              });
              fetchJobs();
            }}
            onError={(error) => {
              toast({
                title: "Upload Error",
                description: error.message || "Failed to upload jobs",
                variant: "destructive",
              });
            }}
          />
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await apiClient.downloadJobTemplate();
                toast({ 
                  title: "Success", 
                  description: "Template downloaded successfully" 
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to download template",
                  variant: "destructive",
                });
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setEditingJob(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
                <DialogDescription>
                  {editingJob
                    ? "Update job details below"
                    : "Fill in all the details to create a new job posting"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ Jobs created here are available to <strong>all registered students</strong> across all colleges.
                    </p>
                  </div>
                  <div>
                    <Label>Job Type *</Label>
                    <Select
                      value={formData.job_type}
                      onValueChange={(value: "On-Campus" | "Off-Campus" | "Internship") =>
                        setFormData({ ...formData, job_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On-Campus">On-Campus</SelectItem>
                        <SelectItem value="Off-Campus">Off-Campus</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Job Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company *</Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="e.g., Google"
                        required
                      />
                    </div>
                    <div>
                      <Label>Role *</Label>
                      <Input
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="e.g., Software Engineer"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Job description and responsibilities..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Hyderabad, Remote"
                      />
                    </div>
                    <div>
                      <Label>CTC</Label>
                      <Input
                        value={formData.ctc}
                        onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                        placeholder="e.g., ₹12 LPA or ₹10-15 LPA"
                      />
                    </div>
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Eligibility Criteria</h3>
                  <div>
                    <Label>Eligibility Type *</Label>
                    <Select
                      value={formData.eligibility_type}
                      onValueChange={(value: "all_students" | "branch" | "specific_students") =>
                        setFormData({
                          ...formData,
                          eligibility_type: value,
                          eligible_branches: [],
                          eligible_user_ids: [],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_students">All Students</SelectItem>
                        <SelectItem value="branch">Specific Branches</SelectItem>
                        <SelectItem value="specific_students">Specific Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.eligibility_type === "branch" && (
                    <div>
                      <Label>Eligible Branches *</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={tempBranch}
                          onChange={(e) => setTempBranch(e.target.value)}
                          placeholder="e.g., CSE, ECE, IT"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addBranch();
                            }
                          }}
                        />
                        <Button type="button" onClick={addBranch}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {formData.eligible_branches.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.eligible_branches.map((branch, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {branch}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeBranch(index)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.eligibility_type === "specific_students" && (
                    <div>
                      <Label>Eligible User IDs *</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          type="number"
                          value={tempUserId}
                          onChange={(e) => setTempUserId(e.target.value)}
                          placeholder="Enter user ID"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addUserId();
                            }
                          }}
                        />
                        <Button type="button" onClick={addUserId}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {formData.eligible_user_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.eligible_user_ids.map((userId) => (
                            <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                              User ID: {userId}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeUserId(userId)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Requirements</h3>
                  <div className="flex gap-2">
                    <Input
                      value={tempRequirement}
                      onChange={(e) => setTempRequirement(e.target.value)}
                      placeholder="e.g., Bachelor's degree in Computer Science"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRequirement();
                        }
                      }}
                    />
                    <Button type="button" onClick={addRequirement}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.requirements.length > 0 && (
                    <div className="space-y-2">
                      {formData.requirements.map((req, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="text-sm">{req}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRequirement(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selection Rounds */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Selection Rounds</h3>
                  <div className="flex gap-2">
                    <Input
                      value={tempRound}
                      onChange={(e) => setTempRound(e.target.value)}
                      placeholder="e.g., Online Test, Technical Interview, HR Round"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRound();
                        }
                      }}
                    />
                    <Button type="button" onClick={addRound}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.rounds.length > 0 && (
                    <div className="space-y-2">
                      {formData.rounds.map((round, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="text-sm">{round}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRound(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dates and Status */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Application Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        Active (visible to students)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingJob ? "Update Job" : "Create Job"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setEditingJob(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading jobs...</p>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first job posting to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>All Jobs ({jobs.length})</CardTitle>
                <CardDescription>Manage job postings (available to all registered students)</CardDescription>
              </div>
              {selectedJobs.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkUpdateStatus(true)}
                  >
                    Make Active ({selectedJobs.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkUpdateStatus(false)}
                  >
                    Make Inactive ({selectedJobs.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedJobs.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, company, or role..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="min-w-[150px]">
                  <Label>Job Type</Label>
                  <Select
                    value={filters.job_type || "all"}
                    onValueChange={(value) => setFilters({ ...filters, job_type: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="On-Campus">On-Campus</SelectItem>
                      <SelectItem value="Off-Campus">Off-Campus</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label>Status</Label>
                  <Select
                    value={filters.is_active === undefined ? "all" : filters.is_active ? "active" : "inactive"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setFilters({ ...filters, is_active: undefined });
                      } else {
                        setFilters({ ...filters, is_active: value === "active" });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFilters({ search: "", job_type: "", is_active: undefined })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedJobs.size === jobs.length && jobs.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>CTC</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={(checked) => handleSelectJob(job.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.company}</TableCell>
                      <TableCell>{job.role}</TableCell>
                      <TableCell>
                        {job.location ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {job.ctc ? (
                          <div className="flex items-center gap-1 text-sm">
                            <IndianRupee className="h-3 w-3" />
                            {job.ctc}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.job_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {getEligibilityDisplay(job)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {job.deadline ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(job.deadline).toLocaleDateString()}
                          </div>
                        ) : (
                          "No deadline"
                        )}
                      </TableCell>
                      <TableCell>
                        {job.is_active ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(job)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(job.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

