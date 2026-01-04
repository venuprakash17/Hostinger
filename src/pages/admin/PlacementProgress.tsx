import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase, 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle,
  TrendingUp,
  Filter,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Job {
  id: number;
  company: string;
  company_name?: string;
  role: string;
  rounds?: string[];
  selection_rounds?: string[];
  eligibility_type: string;
  eligible_branches?: string[] | null;
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
    profile?: {
      roll_number: string | null;
      department: string | null;
      section: string | null;
      present_year: string | null;
    };
  };
  job?: Job;
}

export default function PlacementProgress() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editRound, setEditRound] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchApplications(selectedJobId);
    } else {
      setApplications([]);
    }
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listJobs({ is_active: true });
      setJobs(data || []);
      // Auto-select first job if available
      if (data && data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error(error.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId: number) => {
    try {
      const data = await apiClient.getJobApplications(jobId);
      // Enrich with job details
      const job = jobs.find(j => j.id === jobId);
      const enriched = (data || []).map(app => ({
        ...app,
        job: job || undefined
      }));
      setApplications(enriched);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error(error.message || 'Failed to fetch applications');
      setApplications([]);
    }
  };

  const handleEditApplication = (application: JobApplication) => {
    setSelectedApplication(application);
    setEditStatus(application.status);
    setEditRound(application.current_round || "");
    setEditNotes(application.notes || "");
    setEditDialogOpen(true);
  };

  const handleSaveApplication = async () => {
    if (!selectedApplication) return;

    try {
      await apiClient.updateJobApplication(selectedApplication.id, {
        status: editStatus,
        current_round: editRound || null,
        notes: editNotes || null,
      });
      toast.success("Application updated successfully!");
      setEditDialogOpen(false);
      if (selectedJobId) {
        await fetchApplications(selectedJobId);
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.message || 'Failed to update application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "selected":
      case "offer":
        return "bg-green-500 text-white";
      case "shortlisted":
      case "interview":
        return "bg-blue-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "applied":
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "selected":
      case "offer":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const rounds = selectedJob?.rounds || selectedJob?.selection_rounds || [];

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.user?.profile?.roll_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === "Applied").length,
    shortlisted: applications.filter(a => a.status === "Shortlisted").length,
    interview: applications.filter(a => a.status === "Interview").length,
    selected: applications.filter(a => a.status === "Selected" || a.status === "Offer").length,
    rejected: applications.filter(a => a.status === "Rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Placement Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">Track student progress through placement rounds</p>
        </div>
      </div>

      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Placement</CardTitle>
          <CardDescription>Choose a placement to track student progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedJobId?.toString() || ""}
            onValueChange={(value) => setSelectedJobId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a placement..." />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  {job.company || job.company_name} - {job.role}
                  {job.eligibility_type === "branch" && job.eligible_branches && (
                    <span className="text-muted-foreground ml-2">
                      ({job.eligible_branches.length} branch{job.eligible_branches.length !== 1 ? 'es' : ''})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedJob && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Applicants</CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Applied</CardDescription>
                <CardTitle className="text-2xl">{stats.applied}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Shortlisted</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{stats.shortlisted}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Interview</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{stats.interview}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Selected</CardDescription>
                <CardTitle className="text-2xl text-green-600">{stats.selected}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Rejected</CardDescription>
                <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selection Rounds Info */}
          {rounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selection Rounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {rounds.map((round, idx) => (
                    <Badge key={idx} variant="outline" className="px-3 py-1">
                      {idx + 1}. {round}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applications Table */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading applications...</p>
              </CardContent>
            </Card>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {applications.length === 0 
                    ? "No applications for this placement yet"
                    : "No applications match your filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Student Applications</CardTitle>
                <CardDescription>
                  Track progress for {selectedJob.company || selectedJob.company_name} - {selectedJob.role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Applied Date</TableHead>
                        <TableHead>Current Round</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {app.user?.full_name || app.user?.email || `User #${app.user_id}`}
                              </div>
                              {app.user?.email && app.user?.full_name && (
                                <div className="text-sm text-muted-foreground">{app.user.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {app.user?.profile?.roll_number || "N/A"}
                          </TableCell>
                          <TableCell>
                            {app.user?.profile?.department || "N/A"}
                          </TableCell>
                          <TableCell>
                            {new Date(app.applied_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {app.current_round || (
                              <span className="text-muted-foreground">Not started</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(app.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(app.status)}
                                {app.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditApplication(app)}
                            >
                              Update Progress
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Application Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Application Progress</DialogTitle>
            <DialogDescription>
              Update the student's progress through the placement rounds
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-base font-semibold">Student Information</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="font-medium">
                    {selectedApplication.user?.full_name || selectedApplication.user?.email || `User #${selectedApplication.user_id}`}
                  </p>
                  {selectedApplication.user?.email && selectedApplication.user?.full_name && (
                    <p className="text-sm text-muted-foreground">
                      Email: {selectedApplication.user.email}
                    </p>
                  )}
                  {selectedApplication.user?.profile?.roll_number && (
                    <p className="text-sm text-muted-foreground">
                      Roll Number: {selectedApplication.user.profile.roll_number}
                    </p>
                  )}
                  {selectedApplication.user?.profile?.department && (
                    <p className="text-sm text-muted-foreground">
                      Department: {selectedApplication.user.profile.department}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="status">
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
              </div>

              {rounds.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="round">Current Round</Label>
                  <Select value={editRound} onValueChange={setEditRound}>
                    <SelectTrigger id="round">
                      <SelectValue placeholder="Select current round" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not started</SelectItem>
                      {rounds.map((round, idx) => (
                        <SelectItem key={idx} value={round}>
                          Round {idx + 1}: {round}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Feedback</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about the student's performance or feedback..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApplication}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
