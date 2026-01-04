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
  Plus, Edit, Trash2, Users, Download, Upload, 
  CheckCircle2, XCircle, Clock, ArrowRight, Building2
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: number;
  title: string;
  company: string;
  role: string;
  company_logo?: string | null;
}

interface JobRound {
  id: number;
  job_id: number;
  name: string;
  order: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
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

export default function JobRoundManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rounds, setRounds] = useState<JobRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<JobRound | null>(null);
  const [students, setStudents] = useState<RoundStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast: toastHook } = useToast();

  const [roundFormData, setRoundFormData] = useState({
    name: "",
    order: 1,
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchRounds(selectedJob.id);
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedRound) {
      fetchRoundStudents(selectedRound.id);
    }
  }, [selectedRound, statusFilter]);

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
    } catch (error: any) {
      toast.error("Failed to load rounds");
      console.error(error);
    }
  };

  const fetchRoundStudents = async (roundId: number) => {
    try {
      const filter = statusFilter !== "all" ? statusFilter : undefined;
      const data = await apiClient.getRoundStudents(roundId, filter);
      setStudents(data || []);
    } catch (error: any) {
      toast.error("Failed to load students");
      console.error(error);
    }
  };

  const handleCreateRound = async () => {
    if (!selectedJob) return;
    
    if (!roundFormData.name.trim()) {
      toast.error("Round name is required");
      return;
    }

    try {
      await apiClient.createJobRound(selectedJob.id, roundFormData);
      toast.success("Round created successfully");
      setRoundDialogOpen(false);
      setRoundFormData({ name: "", order: rounds.length + 1, description: "", is_active: true });
      fetchRounds(selectedJob.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create round");
    }
  };

  const handleDeleteRound = async (roundId: number) => {
    if (!confirm("Are you sure you want to delete this round? This will also delete all student progress for this round.")) {
      return;
    }

    try {
      await apiClient.deleteJobRound(roundId);
      toast.success("Round deleted successfully");
      if (selectedJob) {
        fetchRounds(selectedJob.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete round");
    }
  };

  const handleDownloadTemplate = async (roundId: number) => {
    try {
      const blob = await apiClient.downloadRoundTemplate(roundId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `round_template_${roundId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to download template");
    }
  };

  const handleBulkUpload = async (file: File) => {
    if (!selectedRound) return;

    try {
      const result = await apiClient.bulkUploadRoundResults(selectedRound.id, file);
      toast.success(result.message || "Upload completed successfully");
      setUploadDialogOpen(false);
      fetchRoundStudents(selectedRound.id);
      if (selectedJob) {
        fetchRounds(selectedJob.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock },
      QUALIFIED: { label: "Qualified", variant: "default" as const, icon: CheckCircle2 },
      REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
      ABSENT: { label: "Absent", variant: "outline" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCounts = () => {
    const counts = {
      PENDING: 0,
      QUALIFIED: 0,
      REJECTED: 0,
      ABSENT: 0,
    };

    students.forEach((s) => {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Round Management</h1>
          <p className="text-muted-foreground">Manage placement rounds and track student progress</p>
        </div>
      </div>

      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Job</CardTitle>
          <CardDescription>Choose a job to manage its rounds</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedJob?.id.toString() || ""}
            onValueChange={(value) => {
              const job = jobs.find((j) => j.id === parseInt(value));
              setSelectedJob(job || null);
              setSelectedRound(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  <div className="flex items-center gap-2">
                    {job.company_logo && (
                      <img src={job.company_logo} alt={job.company} className="h-6 w-6 object-contain" />
                    )}
                    <span>{job.company} - {job.role}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedJob && (
        <>
          {/* Rounds List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rounds</CardTitle>
                  <CardDescription>Manage rounds for {selectedJob.company} - {selectedJob.role}</CardDescription>
                </div>
                <Button onClick={() => {
                  setRoundFormData({ name: "", order: rounds.length + 1, description: "", is_active: true });
                  setRoundDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Round
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No rounds created yet. Add your first round.</p>
              ) : (
                <div className="space-y-2">
                  {rounds.map((round) => (
                    <div
                      key={round.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedRound(round)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                          {round.order}
                        </div>
                        <div>
                          <h3 className="font-semibold">{round.name}</h3>
                          {round.description && (
                            <p className="text-sm text-muted-foreground">{round.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTemplate(round.id);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Template
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRound(round);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRound(round);
                            setStudentsDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Students
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRound(round.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Round Dialog */}
      <Dialog open={roundDialogOpen} onOpenChange={setRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Round</DialogTitle>
            <DialogDescription>Add a new round for {selectedJob?.company}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Round Name *</Label>
              <Input
                placeholder="e.g., Aptitude, Quiz, Technical, HR"
                value={roundFormData.name}
                onChange={(e) => setRoundFormData({ ...roundFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Order *</Label>
              <Input
                type="number"
                min="1"
                value={roundFormData.order}
                onChange={(e) => setRoundFormData({ ...roundFormData, order: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description for this round"
                value={roundFormData.description}
                onChange={(e) => setRoundFormData({ ...roundFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoundDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRound}>Create Round</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Round Results</DialogTitle>
            <DialogDescription>
              Upload Excel file with round results for {selectedRound?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBulkUpload(file);
                  }
                }}
                className="hidden"
                id="round-upload"
              />
              <Label htmlFor="round-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select Excel/CSV file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Download template first to ensure correct format
                </p>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Students Dialog */}
      <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Students - {selectedRound?.name}</DialogTitle>
            <DialogDescription>View and filter students in this round</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 ml-auto">
                <Badge variant="secondary">{statusCounts.PENDING} Pending</Badge>
                <Badge variant="default">{statusCounts.QUALIFIED} Qualified</Badge>
                <Badge variant="destructive">{statusCounts.REJECTED} Rejected</Badge>
                <Badge variant="outline">{statusCounts.ABSENT} Absent</Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>{student.remarks || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
