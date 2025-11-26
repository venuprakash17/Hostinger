import { useState, useEffect } from "react";
import { Briefcase, MapPin, Calendar, IndianRupee, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { JobFilters } from "@/components/filters/JobFilters";

interface Job {
  id: number;
  company: string;
  role: string;
  location: string;
  ctc: string;
  job_type: string;
  deadline: string;
  description: string;
  requirements: string[];
  selection_rounds: string[];
  is_active: boolean;
  status?: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jobType, setJobType] = useState("all");
  const [location, setLocation] = useState("");
  const [minCTC, setMinCTC] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listJobs({ is_active: true });
      // Fetch user's applications to determine which jobs are already applied
      const applications = await apiClient.getMyApplications().catch(() => []);
      const appliedJobIds = new Set(applications.map((app: any) => app.job_id));
      
      const jobsWithStatus = data.map((job: any) => ({
        ...job,
        status: appliedJobIds.has(job.id) ? "Applied" : "Not Applied",
        logo: job.company?.charAt(0)?.toUpperCase() || "J",
        totalApplicants: job.total_applicants || 0,
        shortlisted: job.shortlisted || 0,
      }));
      
      setJobs(jobsWithStatus);
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === "" ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = jobType === "all" || job.job_type === jobType;
    
    const matchesLocation = !location || 
      (job.location && job.location.toLowerCase().includes(location.toLowerCase()));
    
    const matchesCTC = !minCTC || (job.ctc && job.ctc.toLowerCase().includes(minCTC.toLowerCase()));
    
    const matchesTab = activeTab === "all" || 
      (activeTab === "on-campus" && job.job_type === "On-Campus") ||
      (activeTab === "off-campus" && job.job_type === "Off-Campus") ||
      (activeTab === "internship" && job.job_type === "Internship");
    
    return matchesSearch && matchesType && matchesLocation && matchesCTC && matchesTab;
  });

  const clearFilters = () => {
    setJobType("all");
    setLocation("");
    setMinCTC("");
  };

  const handleApply = async (jobId: number) => {
    try {
      setApplying(jobId);
      await apiClient.applyForJob(jobId);
      
      toast({
        title: "Application Submitted Successfully! ✅",
        description: `Your application has been submitted. We'll notify you about the next steps.`,
      });

      // Update local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: "Applied" } : job
        )
      );
      
      setSelectedJob(null);
    } catch (error: any) {
      console.error("Error applying for job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Jobs & Placement</h1>
        <p className="text-muted-foreground mt-1">Explore opportunities and track applications</p>
      </div>

      {/* Search and Filter */}
      <JobFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        jobType={jobType}
        onJobTypeChange={setJobType}
        location={location}
        onLocationChange={setLocation}
        minCTC={minCTC}
        onMinCTCChange={setMinCTC}
        onClearFilters={clearFilters}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="on-campus">On-Campus</TabsTrigger>
          <TabsTrigger value="off-campus">Off-Campus</TabsTrigger>
          <TabsTrigger value="internship">Internship</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {loading ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading jobs...</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                    onClick={() => setSelectedJob(job)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{job.logo}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{job.company}</CardTitle>
                        <CardDescription>{job.role}</CardDescription>
                      </div>
                    </div>
                  </div>
                  {job.totalApplicants && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {job.totalApplicants} applicants • {job.shortlisted} shortlisted
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      {job.ctc}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={job.job_type === "On-Campus" ? "default" : "secondary"}>
                      {job.job_type}
                    </Badge>
                    {job.status === "Applied" && (
                      <Badge className="bg-success text-success-foreground">Applied</Badge>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={job.status === "Applied" ? "outline" : "default"}
                    disabled={applying === job.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (job.status !== "Applied") handleApply(job.id);
                    }}
                  >
                    {applying === job.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Applying...
                      </>
                    ) : job.status === "Applied" ? "View Application" : "Apply Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No jobs found matching your criteria</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-16 w-16 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{selectedJob?.logo}</span>
              </div>
              <div>
                <DialogTitle className="text-2xl">{selectedJob?.company}</DialogTitle>
                <DialogDescription className="text-lg">{selectedJob?.role}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedJob.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CTC</p>
                  <p className="font-medium">{selectedJob.ctc}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-medium">{new Date(selectedJob.deadline).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge>{selectedJob.job_type}</Badge>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Job Description</h3>
                <p className="text-muted-foreground">{selectedJob.description || "No description available"}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="space-y-1">
                  {selectedJob.requirements && Array.isArray(selectedJob.requirements) ? (
                    selectedJob.requirements.map((req, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {req}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No specific requirements listed</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Selection Rounds</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.selection_rounds && Array.isArray(selectedJob.selection_rounds) ? (
                    selectedJob.selection_rounds.map((round, idx) => (
                      <Badge key={idx} variant="outline">{round}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Selection rounds not specified</span>
                  )}
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                variant={selectedJob.status === "Applied" ? "outline" : "default"}
                disabled={applying === selectedJob.id}
                onClick={() => {
                  if (selectedJob.status !== "Applied") handleApply(selectedJob.id);
                }}
              >
                {applying === selectedJob.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Applying...
                  </>
                ) : selectedJob.status === "Applied" ? "Application Submitted" : "Apply for this Position"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
