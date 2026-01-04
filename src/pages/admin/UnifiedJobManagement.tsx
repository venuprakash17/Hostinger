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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus, Edit, Trash2, Users, Download, Upload, 
  CheckCircle2, XCircle, Clock, ArrowRight, Building2,
  Briefcase, TrendingUp, BarChart3, FileSpreadsheet, Save
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Job {
  id: number;
  company: string;
  company_name?: string;
  role: string;
  title?: string;
  description: string;
  location: string | null;
  ctc: string | null;
  company_logo?: string | null;
  apply_link?: string | null;
  eligibility_type: string;
  eligible_branches: string[] | null;
  eligible_user_ids: number[] | null;
  eligible_years: string[] | null;
  requirements: string[];
  deadline: string;
  is_active: boolean;
  college_id: number;
}

interface JobRound {
  id: number;
  job_id: number;
  name: string;
  order: number;
  description?: string;
  is_active: boolean;
}

interface RoundStudent {
  application_id: number;
  student_id: number;
  student_name: string | null;
  email: string | null;
  roll_number: string | null;
  status: string;
  remarks: string | null;
  updated_at: string | null;
}

interface AnalyticsData {
  total_jobs: number;
  total_applications: number;
  selected_count: number;
  overall_selection_rate: number;
  jobs: Array<{
    job_id: number;
    company: string;
    role: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
    company_logo?: string | null;
  }>;
  round_wise_stats: Array<{
    job_id: number;
    job_title: string;
    round_id: number;
    round_name: string;
    round_order: number;
    total_students: number;
    qualified: number;
    rejected: number;
    absent: number;
    pending: number;
    pass_rate: number;
  }>;
  year_wise_stats: Array<{
    year: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
  }>;
  branch_wise_stats: Array<{
    branch: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
  }>;
}

interface Department {
  id: number;
  name: string;
  code?: string;
  college_id?: number;
}

export default function UnifiedJobManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rounds, setRounds] = useState<JobRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<JobRound | null>(null);
  const [students, setStudents] = useState<RoundStudent[]>([]);
  const [roundStudentCounts, setRoundStudentCounts] = useState<Record<number, number>>({});
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "rounds" | "students" | "analytics">("jobs");
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Dialogs
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [deleteJobDialogOpen, setDeleteJobDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [bulkRoundDialogOpen, setBulkRoundDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false);
  const [studentIdsInput, setStudentIdsInput] = useState("");
  const [bulkJobUploadDialogOpen, setBulkJobUploadDialogOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [bulkPromoteDialogOpen, setBulkPromoteDialogOpen] = useState(false);
  const [bulkPromoteInput, setBulkPromoteInput] = useState("");
  
  // Forms
  const [jobFormData, setJobFormData] = useState({
    company_name: "",
    role: "",
    description: "",
    location: "",
    ctc: "",
    company_logo: "",
    apply_link: "",
    eligibility_type: "all_students" as "all_students" | "branch" | "specific_students",
    eligible_branches: [] as string[],
    eligible_user_ids: [] as number[],
    eligible_years: [] as string[],
    requirements: [] as string[],
    deadline: "",
    is_active: true,
  });

  const [roundFormData, setRoundFormData] = useState({
    name: "",
    order: 1,
    description: "",
    is_active: true,
  });
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);

  const [bulkRoundsData, setBulkRoundsData] = useState("");

  useEffect(() => {
    fetchJobs();
    fetchAnalytics();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile?.college_id) {
        const data = await apiClient.getDepartments(profile.college_id);
        setDepartments(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      fetchRounds(selectedJob.id);
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedRound) {
      fetchRoundStudents(selectedRound.id);
      setActiveTab("students");
    }
  }, [selectedRound]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listJobs({ is_active: true });
      setJobs(data || []);
    } catch (error: any) {
      toast.error("Failed to load jobs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRounds = async (jobId: number) => {
    try {
      const data = await apiClient.listJobRounds(jobId);
      setRounds(data || []);
      
      // Fetch student counts for each round
      if (data && data.length > 0) {
        const counts: Record<number, number> = {};
        await Promise.all(
          data.map(async (round) => {
            try {
              const students = await apiClient.getRoundStudents(round.id);
              counts[round.id] = students?.length || 0;
            } catch (error) {
              // If error fetching, set count to 0
              counts[round.id] = 0;
            }
          })
        );
        setRoundStudentCounts(counts);
      }
      
      // Auto-select Round 0 (Applied) if no round is selected and Round 0 exists
      if (data && data.length > 0 && !selectedRound) {
        const round0 = data.find(r => r.order === 0);
        if (round0) {
          setSelectedRound(round0);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load rounds");
      console.error(error);
    }
  };

  const fetchRoundStudents = async (roundId: number) => {
    try {
      const data = await apiClient.getRoundStudents(roundId);
      setStudents(data || []);
      
      // Update the count for this round
      setRoundStudentCounts(prev => ({
        ...prev,
        [roundId]: data?.length || 0
      }));
    } catch (error: any) {
      toast.error("Failed to load students");
      console.error(error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiClient.getJobAnalytics();
      setAnalytics(data);
    } catch (error: any) {
      console.error("Failed to load analytics:", error);
    }
  };

  const handleCreateJob = async () => {
    if (!jobFormData.company_name || !jobFormData.role || !jobFormData.deadline) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Determine eligibility type based on selections
      let finalEligibilityType = jobFormData.eligibility_type;
      if (jobFormData.eligible_branches.length > 0) {
        finalEligibilityType = "branch";
      } else if (jobFormData.eligible_years.length > 0) {
        finalEligibilityType = "all_students"; // Years filter but all branches
      }

      const jobPayload: any = {
        title: jobFormData.role,
        company: jobFormData.company_name,
        role: jobFormData.role,
        description: jobFormData.description,
        location: jobFormData.location || null,
        ctc: jobFormData.ctc || null,
        company_logo: jobFormData.company_logo || null,
        apply_link: jobFormData.apply_link || null,
        deadline: new Date(jobFormData.deadline).toISOString(),
        requirements: jobFormData.requirements.filter(r => r.trim() !== ""),
        is_active: jobFormData.is_active,
        eligibility_type: finalEligibilityType,
        eligible_branches: jobFormData.eligible_branches.length > 0 ? jobFormData.eligible_branches : null,
        eligible_user_ids: jobFormData.eligibility_type === "specific_students" ? jobFormData.eligible_user_ids : null,
        eligible_years: jobFormData.eligible_years.length > 0 ? jobFormData.eligible_years : null,
      };
      
      // Only include college_id for new jobs (not updates)
      if (!editingJobId) {
        jobPayload.college_id = 1; // Will be set by backend based on user role
      }

      if (editingJobId) {
        // Update existing job
        await apiClient.updateJob(editingJobId, jobPayload);
        toast.success("Job updated successfully");
      } else {
        // Create new job
        await apiClient.createJob(jobPayload);
        toast.success("Job created successfully");
      }
      
      setJobDialogOpen(false);
      setEditingJobId(null);
      resetJobForm();
      fetchJobs();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingJobId ? 'update' : 'create'} job`);
    }
  };

  const handleEditJob = (job: Job) => {
    // Load job data into form
    const deadlineDate = job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : "";
    
    setJobFormData({
      company_name: job.company || "",
      role: job.role || "",
      description: job.description || "",
      location: job.location || "",
      ctc: job.ctc || "",
      company_logo: job.company_logo || "",
      apply_link: job.apply_link || "",
      eligibility_type: (job.eligibility_type || "all_students") as "all_students" | "branch" | "specific_students",
      eligible_branches: Array.isArray(job.eligible_branches) ? job.eligible_branches : [],
      eligible_user_ids: Array.isArray(job.eligible_user_ids) ? job.eligible_user_ids : [],
      eligible_years: Array.isArray(job.eligible_years) ? job.eligible_years : [],
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      deadline: deadlineDate,
      is_active: job.is_active ?? true,
    });
    
    setEditingJobId(job.id);
    setJobDialogOpen(true);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      await apiClient.deleteJob(jobToDelete.id);
      toast.success(`Job "${jobToDelete.company} - ${jobToDelete.role}" deleted successfully`);
      setDeleteJobDialogOpen(false);
      setJobToDelete(null);
      
      // Clear selected job if it was the deleted one
      if (selectedJob?.id === jobToDelete.id) {
        setSelectedJob(null);
        setActiveTab("jobs");
      }
      
      fetchJobs();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete job");
    }
  };

  const handleCreateRound = async () => {
    if (!selectedJob || !roundFormData.name.trim()) {
      toast.error("Please select a job and enter round name");
      return;
    }

    try {
      await apiClient.createJobRound(selectedJob.id, roundFormData);
      toast.success("Round created successfully");
      setRoundDialogOpen(false);
      setRoundFormData({ name: "", order: rounds.length + 1, description: "", is_active: true });
      fetchRounds(selectedJob.id);
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to create round");
    }
  };

  const handleCreateSelectedRound = async () => {
    if (!selectedJob) {
      toast.error("Please select a job first");
      return;
    }

    try {
      // Calculate the next order (after the highest existing round)
      const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order)) : 0;
      const nextOrder = maxOrder + 1;
      
      const selectedRoundData = {
        name: "Selected",
        order: nextOrder,
        description: "Final selection round for selected students",
        is_active: true
      };
      
      await apiClient.createJobRound(selectedJob.id, selectedRoundData);
      toast.success("Selected round created successfully");
      fetchRounds(selectedJob.id);
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to create selected round");
    }
  };

  const handleBulkCreateRounds = async () => {
    if (!selectedJob || !bulkRoundsData.trim()) {
      toast.error("Please select a job and enter round names");
      return;
    }

    try {
      const roundNames = bulkRoundsData
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (roundNames.length === 0) {
        toast.error("Please enter at least one round name");
        return;
      }

      let order = rounds.length + 1;
      for (const name of roundNames) {
        await apiClient.createJobRound(selectedJob.id, {
          name,
          order,
          description: "",
          is_active: true,
        });
        order++;
      }

      toast.success(`Created ${roundNames.length} rounds successfully`);
      setBulkRoundDialogOpen(false);
      setBulkRoundsData("");
      fetchRounds(selectedJob.id);
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to create rounds");
    }
  };

  const handleBulkUploadRoundResults = async (file: File) => {
    if (!selectedRound) return;

    try {
      const result = await apiClient.bulkUploadRoundResults(selectedRound.id, file);
      toast.success(result.message || "Upload completed successfully");
      setUploadDialogOpen(false);
      fetchRoundStudents(selectedRound.id);
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    }
  };

  const handleAddStudents = async () => {
    if (!selectedRound || !studentIdsInput.trim()) {
      toast.error("Please enter at least one roll number");
      return;
    }

    try {
      // Parse comma-separated roll numbers
      const rollNumbers = studentIdsInput
        .split(',')
        .map(roll => roll.trim())
        .filter(roll => roll.length > 0);

      if (rollNumbers.length === 0) {
        toast.error("Please enter valid roll numbers");
        return;
      }

      const result = await apiClient.addStudentsToRound(selectedRound.id, rollNumbers);
      
      if (result.success_count > 0) {
        const createdCount = result.success?.filter((s: any) => s.application_created).length || 0;
        let message = `Successfully added ${result.success_count} student(s)`;
        if (createdCount > 0) {
          message += ` (${createdCount} application${createdCount > 1 ? 's' : ''} auto-created for external applicants)`;
        }
        toast.success(message);
      }
      
      if (result.failed_count > 0) {
        const failedDetails = result.failed?.slice(0, 5).map((f: any) => 
          `${f.roll_number}: ${f.error}`
        ).join(', ') || '';
        toast.warning(`${result.failed_count} student(s) failed: ${failedDetails}`);
      }

      setAddStudentsDialogOpen(false);
      setStudentIdsInput("");
      fetchRoundStudents(selectedRound.id);
      // Refresh rounds to update counts
      if (selectedJob) {
        fetchRounds(selectedJob.id);
      }
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to add students");
    }
  };

  const handleBulkPromoteByInput = async () => {
    if (!selectedRound || !bulkPromoteInput.trim()) {
      toast.error("Please enter roll numbers or student IDs");
      return;
    }

    try {
      // Parse comma-separated roll numbers or student IDs
      const inputs = bulkPromoteInput
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      if (inputs.length === 0) {
        toast.error("Please enter valid roll numbers or student IDs");
        return;
      }

      // Try to parse as student IDs first, then treat as roll numbers
      const studentIds: number[] = [];
      const rollNumbers: string[] = [];

      for (const input of inputs) {
        const parsedId = parseInt(input);
        if (!isNaN(parsedId) && parsedId > 0) {
          studentIds.push(parsedId);
        } else {
          rollNumbers.push(input);
        }
      }

      // Get student IDs from roll numbers
      if (rollNumbers.length > 0) {
        // Find students by roll number in current round
        for (const rollNumber of rollNumbers) {
          const student = students.find(s => s.roll_number === rollNumber);
          if (student) {
            studentIds.push(student.student_id);
          }
        }
      }

      if (studentIds.length === 0) {
        toast.error("No valid students found. Please check the roll numbers or student IDs.");
        return;
      }

      const result = await apiClient.bulkPromoteJobRoundStudents(selectedRound.id, studentIds);
      toast.success(result.message || `Promoted ${result.promoted_count} students successfully`);
      setBulkPromoteDialogOpen(false);
      setBulkPromoteInput("");
      
      // Refresh data and update counts
      if (selectedRound) {
        fetchRoundStudents(selectedRound.id);
        // Refresh rounds to update counts for all rounds
        if (selectedJob) {
          fetchRounds(selectedJob.id);
        }
      }
      if (selectedJob) {
        fetchRounds(selectedJob.id);
      }
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to promote students");
    }
  };

  const resetJobForm = () => {
    setJobFormData({
      company_name: "",
      role: "",
      description: "",
      location: "",
      ctc: "",
      company_logo: "",
      apply_link: "",
      eligibility_type: "all_students",
      eligible_branches: [],
      eligible_user_ids: [],
      eligible_years: [],
      requirements: [],
      deadline: "",
      is_active: true,
    });
    setEditingJobId(null);
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job & Placement Management</h1>
          <p className="text-muted-foreground">Unified interface for jobs, rounds, students, and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const blob = await apiClient.downloadJobTemplate();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `job_upload_template.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Template downloaded successfully");
              } catch (error: any) {
                toast.error(error.message || "Failed to download template");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBulkJobUploadDialogOpen(true);
              setUploadResults(null);
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => {
            resetJobForm();
            setJobDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs">
            <Briefcase className="h-4 w-4 mr-2" />
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="rounds" disabled={!selectedJob}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Rounds ({rounds.length})
          </TabsTrigger>
          <TabsTrigger value="students" disabled={!selectedRound}>
            <Users className="h-4 w-4 mr-2" />
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select or Create Job</CardTitle>
              <CardDescription>
                Choose a job to manage rounds and track students. Only jobs created by your college are shown here.
                Super Admin jobs (off-campus) are not displayed in this management interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No college-managed jobs found.</p>
                  <p className="text-sm">Create your first job to get started with round management and student tracking.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job) => (
                    <Card
                      key={job.id}
                      className={`hover:border-primary hover:shadow-md transition-all ${
                        selectedJob?.id === job.id ? "border-primary border-2 shadow-md" : ""
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {job.company_logo && (
                            <img src={job.company_logo} alt={job.company} className="h-12 w-12 object-contain" />
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{job.company}</CardTitle>
                            <CardDescription>{job.role}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditJob(job);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setJobToDelete(job);
                                setDeleteJobDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {job.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="h-4 w-4" />
                              {job.location}
                            </div>
                          )}
                          {job.ctc && (
                            <div className="text-muted-foreground">CTC: {job.ctc}</div>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant={job.is_active ? "default" : "secondary"}>
                              {job.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                                setActiveTab("rounds");
                              }}
                            >
                              Manage
                            </Button>
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

        {/* Rounds Tab */}
        <TabsContent value="rounds" className="space-y-4">
          {selectedJob ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Rounds - {selectedJob.company}</CardTitle>
                      <CardDescription>
                        Manage placement rounds for {selectedJob.role}
                        <br />
                        <span className="text-xs text-muted-foreground mt-1 block">
                          <strong>Round 0 (Applied)</strong> is the default round where you add all students who applied. 
                          Track their progress through subsequent rounds.
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setBulkRoundDialogOpen(true)}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Bulk Add
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleCreateSelectedRound}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Add Selected Round
                      </Button>
                      <Button onClick={() => {
                        setEditingRoundId(null);
                        // Calculate next order (skip 0 as it's reserved for "Applied")
                        const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order)) : 0;
                        setRoundFormData({ name: "", order: maxOrder + 1, description: "", is_active: true });
                        setRoundDialogOpen(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Round
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {rounds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Loading rounds...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rounds.map((round) => (
                        <div
                          key={round.id}
                          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                            selectedRound?.id === round.id ? "border-primary border-2" : ""
                          }`}
                          onClick={() => setSelectedRound(round)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shrink-0 ${
                              round.order === 0 
                                ? "bg-blue-500 text-white" 
                                : "bg-primary text-primary-foreground"
                            }`}>
                              {round.order === 0 ? "0" : round.order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold">{round.name}</h3>
                                {round.order === 0 && (
                                  <Badge variant="default" className="text-xs">
                                    Step 0 - All Applicants
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs font-mono">
                                  ID: {round.id}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  (Students tracked by ID, not name)
                                </span>
                              </div>
                              {round.description && (
                                <p className="text-sm text-muted-foreground">{round.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {round.order !== 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRound(round);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {round.order === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Default Round
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRound(round);
                                setActiveTab("students");
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Students ({roundStudentCounts[round.id] ?? 0})
                            </Button>
                            {round.order !== 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm("Delete this round?")) {
                                    try {
                                      await apiClient.deleteJobRound(round.id);
                                      toast.success("Round deleted");
                                      fetchRounds(selectedJob.id);
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to delete");
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Please select a job first to manage rounds
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {selectedRound ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Students - Round {selectedRound.order}: {selectedRound.name}</CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                          Round ID: {selectedRound.id}
                        </Badge>
                      </div>
                      <CardDescription>
                        Track student progress in {selectedJob?.company} - {selectedJob?.role}
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Round ID: {selectedRound.id} is used for tracking - name changes won't affect student associations)
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBulkPromoteInput("");
                          setBulkPromoteDialogOpen(true);
                        }}
                        disabled={!rounds.find(r => r.order === (selectedRound?.order || 0) + 1)}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Bulk Promote
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStudentIdsInput("");
                          setAddStudentsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Students
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student) => (
                          <TableRow key={student.application_id}>
                            <TableCell>{student.student_id}</TableCell>
                            <TableCell>{student.student_name || "N/A"}</TableCell>
                            <TableCell>{student.email || "N/A"}</TableCell>
                            <TableCell>{student.roll_number || "N/A"}</TableCell>
                            <TableCell>
                              {student.updated_at ? new Date(student.updated_at).toLocaleDateString() : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Please select a round first to view students
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_jobs}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Applications</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_applications}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Selected</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.selected_count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Selection Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overall_selection_rate}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Round Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.round_wise_stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="round_name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="qualified" fill="#82ca9d" name="Qualified" />
                        <Bar dataKey="rejected" fill="#ff6b6b" name="Rejected" />
                        <Bar dataKey="absent" fill="#ffa500" name="Absent" />
                        <Bar dataKey="pending" fill="#8884d8" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading analytics...
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Job Dialog */}
      <Dialog open={jobDialogOpen} onOpenChange={(open) => {
        setJobDialogOpen(open);
        if (!open) {
          resetJobForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJobId ? "Edit Job" : "Create New Job"}</DialogTitle>
            <DialogDescription>
              {editingJobId ? "Update job posting details" : "Add a new job posting for your college students"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingJobId && (
              <div className="space-y-2">
                <Label>Job ID</Label>
                <Input
                  value={editingJobId.toString()}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Job ID is automatically assigned and cannot be changed
                </p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  placeholder="e.g., Google, Microsoft"
                  value={jobFormData.company_name}
                  onChange={(e) => setJobFormData({ ...jobFormData, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Input
                  placeholder="e.g., Software Engineer"
                  value={jobFormData.role}
                  onChange={(e) => setJobFormData({ ...jobFormData, role: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Job description..."
                value={jobFormData.description}
                onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g., Bangalore"
                  value={jobFormData.location}
                  onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTC</Label>
                <Input
                  placeholder="e.g., ₹12 LPA"
                  value={jobFormData.ctc}
                  onChange={(e) => setJobFormData({ ...jobFormData, ctc: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={jobFormData.company_logo}
                onChange={(e) => setJobFormData({ ...jobFormData, company_logo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Apply Link</Label>
              <Input
                placeholder="https://example.com/apply"
                value={jobFormData.apply_link}
                onChange={(e) => setJobFormData({ ...jobFormData, apply_link: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                External application URL where students can apply for this job
              </p>
            </div>
            <div className="space-y-2">
              <Label>Deadline *</Label>
              <Input
                type="date"
                value={jobFormData.deadline}
                onChange={(e) => setJobFormData({ ...jobFormData, deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Eligible Branches</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select specific branches. Only students from selected branches will be able to view this job.
                Leave empty to allow all branches.
              </p>
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Loading branches...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 border rounded-md">
                  {departments.map((dept) => {
                    const branchIdentifier = dept.code || dept.name;
                    const isSelected = jobFormData.eligible_branches.includes(dept.name) || 
                                      (dept.code && jobFormData.eligible_branches.includes(dept.code));
                    return (
                      <div key={dept.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`branch-${dept.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Add both name and code if available (backend matches both)
                              const newBranches = [...jobFormData.eligible_branches];
                              if (!newBranches.includes(dept.name)) {
                                newBranches.push(dept.name);
                              }
                              if (dept.code && !newBranches.includes(dept.code)) {
                                newBranches.push(dept.code);
                              }
                              setJobFormData({
                                ...jobFormData,
                                eligible_branches: newBranches,
                              });
                            } else {
                              // Remove both name and code
                              setJobFormData({
                                ...jobFormData,
                                eligible_branches: jobFormData.eligible_branches.filter(
                                  (b) => b !== dept.name && b !== (dept.code || "")
                                ),
                              });
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`branch-${dept.id}`} 
                          className="text-sm cursor-pointer"
                        >
                          {dept.name} {dept.code && `(${dept.code})`}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
              {jobFormData.eligible_branches.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  {jobFormData.eligible_branches.length} branch(es) selected
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Eligible Years</Label>
              <div className="flex gap-4">
                {["1st", "2nd", "3rd", "4th", "5th"].map((year) => (
                  <div key={year} className="flex items-center space-x-2">
                    <Checkbox
                      id={year}
                      checked={jobFormData.eligible_years.includes(year)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setJobFormData({
                            ...jobFormData,
                            eligible_years: [...jobFormData.eligible_years, year],
                          });
                        } else {
                          setJobFormData({
                            ...jobFormData,
                            eligible_years: jobFormData.eligible_years.filter((y) => y !== year),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={year}>{year}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setJobDialogOpen(false);
              resetJobForm();
            }}>Cancel</Button>
            <Button onClick={handleCreateJob}>
              <Save className="h-4 w-4 mr-2" />
              {editingJobId ? "Update Job" : "Create Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation Dialog */}
      <AlertDialog open={deleteJobDialogOpen} onOpenChange={setDeleteJobDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job posting for{" "}
              <strong>{jobToDelete?.company} - {jobToDelete?.role}</strong> and all associated data
              including rounds, student applications, and tracking information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Round Dialog */}
      <Dialog open={roundDialogOpen} onOpenChange={(open) => {
        setRoundDialogOpen(open);
        if (!open) {
          setEditingRoundId(null);
          const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order)) : 0;
        setRoundFormData({ name: "", order: maxOrder + 1, description: "", is_active: true });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoundId ? "Edit Round" : "Create Round"}</DialogTitle>
            <DialogDescription>
              {editingRoundId ? (
                <>
                  Update round details for {selectedJob?.company}. 
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Round ID: {editingRoundId} - Student associations use this ID, so name changes won't affect tracking.
                  </span>
                </>
              ) : (
                `Add a new round for ${selectedJob?.company}`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingRoundId && (
              <div className="space-y-2">
                <Label>Round ID</Label>
                <Input
                  value={editingRoundId.toString()}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Round ID is used to track students. Changing the name won't affect student associations.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Round Name *</Label>
              <Input
                placeholder="e.g., Aptitude, Quiz, Technical"
                value={roundFormData.name}
                onChange={(e) => setRoundFormData({ ...roundFormData, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                You can change this name anytime. Student tracking uses the Round ID, not the name.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Order *</Label>
              <Input
                type="number"
                min="1"
                value={roundFormData.order}
                onChange={(e) => setRoundFormData({ ...roundFormData, order: parseInt(e.target.value) || 1 })}
                disabled={editingRoundId !== null && rounds.find(r => r.id === editingRoundId)?.order === 0}
              />
              {editingRoundId !== null && rounds.find(r => r.id === editingRoundId)?.order === 0 && (
                <p className="text-xs text-muted-foreground">
                  Round 0 (Applied) is the default round and cannot be modified.
                </p>
              )}
              {!editingRoundId && (
                <p className="text-xs text-muted-foreground">
                  Order 0 is reserved for "Applied" round (automatically created). Start from 1.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={roundFormData.description}
                onChange={(e) => setRoundFormData({ ...roundFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRoundDialogOpen(false);
              setEditingRoundId(null);
              const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order)) : 0;
              setRoundFormData({ name: "", order: maxOrder + 1, description: "", is_active: true });
            }}>Cancel</Button>
            <Button onClick={handleCreateRound}>
              {editingRoundId ? "Update Round" : "Create Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Rounds Dialog */}
      <Dialog open={bulkRoundDialogOpen} onOpenChange={setBulkRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add Rounds</DialogTitle>
            <DialogDescription>Add multiple rounds at once (one per line)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Round Names (one per line) *</Label>
              <Textarea
                placeholder="Aptitude&#10;Quiz&#10;Technical Interview&#10;HR Round&#10;Final Selection"
                value={bulkRoundsData}
                onChange={(e) => setBulkRoundsData(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRoundDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkCreateRounds}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Create All Rounds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Results Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Round Results</DialogTitle>
            <DialogDescription>Upload Excel file with round results for {selectedRound?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBulkUploadRoundResults(file);
                  }
                }}
                className="hidden"
                id="round-upload"
              />
              <Label htmlFor="round-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select Excel/CSV file</p>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Promote Dialog */}
      <Dialog open={bulkPromoteDialogOpen} onOpenChange={(open) => {
        setBulkPromoteDialogOpen(open);
        if (!open) {
          setBulkPromoteInput("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Promote to Next Round</DialogTitle>
            <DialogDescription>
              Promote students from Round {selectedRound?.order}: {selectedRound?.name} to the next round using roll numbers or student IDs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Roll Numbers or Student IDs (Comma-separated) *</Label>
              <Textarea
                placeholder="e.g., CSE001-001, CSE001-002, 42, 43, 44"
                value={bulkPromoteInput}
                onChange={(e) => setBulkPromoteInput(e.target.value)}
                rows={6}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter roll numbers (e.g., CSE001-001) or student IDs (e.g., 42) separated by commas.
                <br />
                Students will be promoted to the next round.
              </p>
            </div>
            {rounds.find(r => r.order === (selectedRound?.order || 0) + 1) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold mb-1">Next Round:</p>
                <p className="text-xs text-muted-foreground">
                  Round {rounds.find(r => r.order === (selectedRound?.order || 0) + 1)?.order}: {rounds.find(r => r.order === (selectedRound?.order || 0) + 1)?.name}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkPromoteDialogOpen(false);
              setBulkPromoteInput("");
            }}>Cancel</Button>
            <Button onClick={handleBulkPromoteByInput}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Promote Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students Dialog */}
      <Dialog open={addStudentsDialogOpen} onOpenChange={(open) => {
        setAddStudentsDialogOpen(open);
        if (!open) {
          setStudentIdsInput("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Students to Round</DialogTitle>
            <DialogDescription>
              Add students to Round {selectedRound?.order}: {selectedRound?.name} using their Roll Numbers.
              Student data will be fetched from the backend automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Roll Numbers (Comma-separated) *</Label>
              <Textarea
                placeholder="e.g., CSE001-001, CSE001-002, CSE001-003, CSE001-004"
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                rows={6}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter student roll numbers separated by commas. The system will:
                <br />• Verify students exist (by roll number)
                <br />• Auto-create application records for students who applied externally (if needed)
                <br />• Fetch student data from backend automatically
                <br />• Create round entries with PENDING status
                <br />• Skip students already in this round
                <br />
                <br />
                <strong>Note:</strong> Students who applied externally (using the apply link) will have their application record created automatically when added to a round.
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold mb-1">Current Round:</p>
              <p className="text-xs text-muted-foreground">
                Round ID: {selectedRound?.id} | Round Name: {selectedRound?.name}
                <br />
                Job: {selectedJob?.company} - {selectedJob?.role}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddStudentsDialogOpen(false);
              setStudentIdsInput("");
            }}>Cancel</Button>
            <Button onClick={handleAddStudents}>
              <Plus className="h-4 w-4 mr-2" />
              Add Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Jobs Dialog */}
      <Dialog open={bulkJobUploadDialogOpen} onOpenChange={setBulkJobUploadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Jobs</DialogTitle>
            <DialogDescription>
              Upload multiple jobs at once using Excel or CSV file. Download the template first to see the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!uploadResults ? (
              <>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const result = await apiClient.bulkUploadJobs(file);
                          setUploadResults(result);
                          if (result.success_count > 0) {
                            toast.success(`Successfully uploaded ${result.success_count} job(s)`);
                            fetchJobs();
                            fetchAnalytics();
                          }
                          if (result.failed_count > 0) {
                            toast.error(`${result.failed_count} job(s) failed to upload`);
                          }
                        } catch (error: any) {
                          console.error("Bulk upload error:", error);
                          let errorMessage = "Upload failed";
                          
                          // Try to extract detailed error message from FastAPI validation errors
                          if (error.message) {
                            try {
                              // FastAPI 422 errors return an array of validation errors
                              const errorObj = typeof error.message === 'string' ? JSON.parse(error.message) : error.message;
                              if (Array.isArray(errorObj)) {
                                // Format validation errors nicely
                                const validationErrors = errorObj.map((err: any) => {
                                  const field = err.loc?.join('.') || 'unknown';
                                  const msg = err.msg || 'Invalid value';
                                  return `${field}: ${msg}`;
                                }).join(', ');
                                errorMessage = `Validation errors: ${validationErrors}`;
                              } else if (errorObj.detail) {
                                // Single error detail
                                if (Array.isArray(errorObj.detail)) {
                                  errorMessage = errorObj.detail.map((e: any) => 
                                    `${e.loc?.join('.') || 'field'}: ${e.msg || 'Invalid'}`
                                  ).join(', ');
                                } else {
                                  errorMessage = errorObj.detail;
                                }
                              } else if (typeof errorObj === 'string') {
                                errorMessage = errorObj;
                              }
                            } catch (parseError) {
                              // If parsing fails, use the original message
                              errorMessage = error.message || "Upload failed";
                            }
                          }
                          
                          toast.error(errorMessage);
                          setUploadResults({
                            success_count: 0,
                            failed_count: 0,
                            success: [],
                            failed: []
                          });
                        }
                      }
                    }}
                    className="hidden"
                    id="job-bulk-upload"
                  />
                  <Label htmlFor="job-bulk-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select Excel/CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: .xlsx, .xls, .csv
                    </p>
                  </Label>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                    Upload Instructions:
                  </h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Download the template first to see the required format</li>
                    <li>Required fields: title, company, role</li>
                    <li>Branches: Use comma-separated values (e.g., "CSE,ECE,IT")</li>
                    <li>Years: Use comma-separated values (e.g., "1st,2nd,3rd")</li>
                    <li>Requirements: Use semicolon-separated values</li>
                    <li>Deadline: Format as YYYY-MM-DD</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Successful</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResults.success_count || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {uploadResults.failed_count || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {uploadResults.failed && uploadResults.failed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Failed Jobs:</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadResults.failed.slice(0, 10).map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.row || idx + 1}</TableCell>
                              <TableCell className="text-sm text-red-600">
                                {item.error || item.message || "Unknown error"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {uploadResults.failed.length > 10 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Showing first 10 of {uploadResults.failed.length} errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {uploadResults.success && uploadResults.success.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-green-600">Successfully Uploaded:</h4>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                      <div className="text-sm space-y-1">
                        {uploadResults.success.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{item.company || item.title || `Job ${item.row || idx + 1}`}</span>
                          </div>
                        ))}
                        {uploadResults.success.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            And {uploadResults.success.length - 5} more...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {uploadResults ? (
              <>
                <Button variant="outline" onClick={() => {
                  setBulkJobUploadDialogOpen(false);
                  setUploadResults(null);
                }}>
                  Close
                </Button>
                <Button onClick={() => {
                  setUploadResults(null);
                }}>
                  Upload Another
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setBulkJobUploadDialogOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
