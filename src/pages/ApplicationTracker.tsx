import { useState, useEffect } from "react";
import { Briefcase, Calendar, MapPin, TrendingUp, Filter, Search, Loader2, ExternalLink, CheckCircle2, Clock, XCircle, MessageSquare, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface JobApplication {
  id: number;
  job_id: number;
  user_id: number;
  status: string;
  applied_date?: string;
  current_round?: string | null;
  notes?: string | null;
  resume_version?: string;
  ats_score?: number;
  job?: {
    id: number;
    company: string;
    role: string;
    location: string;
    ctc: string;
    job_type: string;
    deadline: string;
    rounds?: string[];
  };
}

export default function ApplicationTracker() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Get my applications from backend
      const apps = await apiClient.getMyApplications();
      
      // Get all jobs to enrich application data
      const jobs = await apiClient.listJobs({ is_active: true });
      const jobsMap = new Map(jobs.map((j: any) => [j.id, j]));
      
      // Enrich applications with job details
      const enrichedApplications: JobApplication[] = (apps || []).map((app: any) => ({
        ...app,
        job: jobsMap.get(app.job_id) || null,
        applied_date: app.applied_at || app.applied_date,
        status: app.status || "Applied",
        current_round: app.current_round || null,
        notes: app.notes || null,
        ats_score: app.ats_score || null,
        resume_version: app.resume_version || null
      }));
      
      setApplications(enrichedApplications);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied": return "bg-primary text-primary-foreground";
      case "shortlisted": return "bg-success text-success-foreground";
      case "in progress": return "bg-warning text-warning-foreground";
      case "offered": return "bg-success text-success-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied": return <Clock className="h-4 w-4" />;
      case "shortlisted": return <CheckCircle2 className="h-4 w-4" />;
      case "offered": return <CheckCircle2 className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.job?.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job?.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === "Applied").length,
    shortlisted: applications.filter(a => a.status === "Shortlisted").length,
    inProgress: applications.filter(a => a.status === "In Progress").length,
    offered: applications.filter(a => a.status === "Offered").length,
    rejected: applications.filter(a => a.status === "Rejected").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Application Tracker</h1>
        <p className="text-muted-foreground mt-1">Track all your job applications in one place</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Applied</CardDescription>
            <CardTitle className="text-2xl">{stats.applied}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Shortlisted</CardDescription>
            <CardTitle className="text-2xl text-success">{stats.shortlisted}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl text-warning">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Offers</CardDescription>
            <CardTitle className="text-2xl text-success">{stats.offered}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or role..."
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
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      {loading ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No applications found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {applications.length === 0 
                ? "Start applying to jobs to track them here"
                : "No applications match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Your Applications</CardTitle>
            <CardDescription>Track the status of all your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Round</TableHead>
                    <TableHead>ATS Score</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.job?.company || "N/A"}</TableCell>
                      <TableCell>{app.job?.role || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {app.job?.location || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.applied_date 
                          ? new Date(app.applied_date).toLocaleDateString()
                          : "N/A"}
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
                        {app.current_round ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{app.current_round}</span>
                            {app.job?.rounds && app.job.rounds.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {app.job.rounds.indexOf(app.current_round) + 1} of {app.job.rounds.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not started</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {app.ats_score ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{app.ats_score}%</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${app.ats_score}%` }}
                              />
                            </div>
                          </div>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {app.notes ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                View Notes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Progress Notes & Feedback</DialogTitle>
                                <DialogDescription>
                                  Updates from the placement team about your application progress
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Status: {app.status}</span>
                                  </div>
                                  {app.current_round && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">Current Round: {app.current_round}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Notes:</label>
                                  <Textarea
                                    value={app.notes}
                                    readOnly
                                    className="min-h-[150px]"
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-sm text-muted-foreground">No notes yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
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
    </div>
  );
}

