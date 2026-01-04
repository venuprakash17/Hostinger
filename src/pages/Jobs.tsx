import { useState, useEffect } from "react";
import { Briefcase, MapPin, Calendar, IndianRupee, Loader2, Users, CheckCircle2, ExternalLink, ArrowRight, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { JobFilters } from "@/components/filters/JobFilters";

// Component to show round status for students
function JobRoundStatus({ jobId }: { jobId: number }) {
  const [roundStatus, setRoundStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await apiClient.getStudentJobStatus();
        const jobStatus = data.applications?.find((app: any) => app.job_id === jobId);
        if (jobStatus) {
          setRoundStatus(jobStatus);
        }
      } catch (error) {
        console.error("Error fetching round status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [jobId]);

  if (loading) {
    return (
      <div className="mt-4 p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Loading round status...</p>
      </div>
    );
  }

  if (!roundStatus || !roundStatus.rounds || roundStatus.rounds.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <ArrowRight className="h-5 w-5" />
        Application Status
      </h3>
      <div className="space-y-3">
        {roundStatus.rounds.map((round: any, idx: number) => {
          const isLast = idx === roundStatus.rounds.length - 1;
          const getStatusIcon = () => {
            switch (round.status) {
              case "QUALIFIED":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
              case "REJECTED":
                return <XCircle className="h-5 w-5 text-red-500" />;
              case "ABSENT":
                return <XCircle className="h-5 w-5 text-orange-500" />;
              default:
                return <Clock className="h-5 w-5 text-muted-foreground" />;
            }
          };

          const getStatusBadge = () => {
            switch (round.status) {
              case "QUALIFIED":
                return <Badge className="bg-green-500 text-white">Qualified</Badge>;
              case "REJECTED":
                return <Badge variant="destructive">Rejected</Badge>;
              case "ABSENT":
                return <Badge variant="outline" className="border-orange-500 text-orange-500">Absent</Badge>;
              default:
                return <Badge variant="secondary">Pending</Badge>;
            }
          };

          return (
            <div key={round.round_id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {getStatusIcon()}
                {!isLast && (
                  <div className={`w-0.5 h-8 mt-1 ${
                    round.status === "QUALIFIED" ? "bg-green-500" : 
                    round.status === "REJECTED" || round.status === "ABSENT" ? "bg-red-500" : 
                    "bg-muted"
                  }`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{round.round_name}</h4>
                    {round.remarks && (
                      <p className="text-sm text-muted-foreground mt-1">{round.remarks}</p>
                    )}
                    {round.updated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated: {new Date(round.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Job {
  id: number;
  title: string;
  company: string;
  role: string;
  location: string;
  ctc: string;
  job_type: string;
  deadline: string;
  description: string;
  requirements: string[];
  rounds: string[];
  selection_rounds?: string[];
  apply_link: string | null;
  company_logo?: string | null;
  is_active: boolean;
  status?: string;
  logo?: string;
  totalApplicants?: number;
  shortlisted?: number;
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
      
      // Debug: Log the data received
      console.log("[Jobs] Fetched jobs data:", data);
      console.log("[Jobs] Number of jobs:", Array.isArray(data) ? data.length : 0);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error("[Jobs] Expected array but got:", typeof data, data);
        setJobs([]);
        return;
      }
      
      // Fetch user's applications to determine which jobs are already applied
      const applications = await apiClient.getMyApplications().catch(() => []);
      const appliedJobIds = new Set(applications.map((app: any) => app.job_id));
      
      const jobsWithStatus = data.map((job: any) => {
        const processedJob = {
          ...job,
          status: appliedJobIds.has(job.id) ? "Applied" : "Not Applied",
          logo: job.company?.charAt(0)?.toUpperCase() || "J",
          company_logo: job.company_logo || null,
          totalApplicants: job.total_applicants || 0,
          shortlisted: job.shortlisted || 0,
          // Ensure rounds is available (could be rounds or selection_rounds)
          rounds: job.rounds || job.selection_rounds || [],
          // Ensure apply_link is properly set (check multiple possible field names)
          apply_link: job.apply_link || job.applyLink || job.apply_url || null,
        };
        
        // Log jobs with apply links for debugging
        if (processedJob.apply_link) {
          console.log(`[Jobs] Job ${processedJob.id} (${processedJob.company}) has apply_link:`, processedJob.apply_link);
        }
        
        return processedJob;
      });
      
      console.log("[Jobs] Processed jobs:", jobsWithStatus.length);
      const jobsWithLinks = jobsWithStatus.filter(j => j.apply_link);
      console.log("[Jobs] Jobs with apply links:", jobsWithLinks.length);
      setJobs(jobsWithStatus);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load jobs",
        variant: "destructive",
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" ||
      job.company?.toLowerCase().includes(searchLower) ||
      job.role?.toLowerCase().includes(searchLower) ||
      job.title?.toLowerCase().includes(searchLower) ||
      (job.description && job.description.toLowerCase().includes(searchLower));
    
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
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      toast({
        title: "Error",
        description: "Job not found",
        variant: "destructive",
      });
      return;
    }
    
    // If job has external apply link, ALWAYS redirect to it (even if already applied)
    if (job.apply_link) {
      // Ensure the link has http:// or https://
      let applyUrl = job.apply_link.trim();
      if (!applyUrl.startsWith('http://') && !applyUrl.startsWith('https://')) {
        applyUrl = 'https://' + applyUrl;
      }
      
      console.log("[Jobs] Opening external apply link for job", jobId, ":", applyUrl);
      console.log("[Jobs] Job details:", { company: job.company, role: job.role, apply_link: job.apply_link });
      
      // Open in new tab
      const newWindow = window.open(applyUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        // Popup blocked - show error
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to open the application link, or click the link in the job details.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Opening Application",
          description: "Redirecting to external application page in a new tab...",
        });
      }
      return;
    }

    // Otherwise, apply through platform
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
              <Card key={job.id} className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
                    onClick={() => setSelectedJob(job)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {job.company_logo ? (
                        <img 
                          src={job.company_logo} 
                          alt={job.company} 
                          className="h-14 w-14 rounded-lg object-contain flex-shrink-0 shadow-md border"
                          onError={(e) => {
                            // Fallback to letter logo if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`h-14 w-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md ${job.company_logo ? 'hidden' : ''}`}>
                        <span className="text-white font-bold text-xl">{job.logo}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold line-clamp-1">{job.company}</CardTitle>
                        <CardDescription className="line-clamp-1">{job.role}</CardDescription>
                        {job.title && job.title !== job.role && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{job.title}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {job.totalApplicants !== undefined && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{job.totalApplicants} applied</span>
                      </div>
                      {job.shortlisted !== undefined && job.shortlisted > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{job.shortlisted} shortlisted</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {job.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    )}
                    {job.ctc && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IndianRupee className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-foreground">{job.ctc}</span>
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={job.job_type === "On-Campus" ? "default" : job.job_type === "Internship" ? "secondary" : "outline"}>
                      {job.job_type}
                    </Badge>
                    {job.status === "Applied" && (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Applied
                      </Badge>
                    )}
                    {job.apply_link && (
                      <Badge variant="outline" className="text-xs">
                        External Link
                      </Badge>
                    )}
                  </div>

                  <Button 
                    className="w-full font-semibold" 
                    variant={job.status === "Applied" && !job.apply_link ? "outline" : "default"}
                    size="lg"
                    disabled={applying === job.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      // If job has apply_link, always redirect (even if already applied)
                      if (job.apply_link) {
                        handleApply(job.id);
                      } else if (job.status === "Applied") {
                        // Already applied through platform, no external link
                        toast({
                          title: "Already Applied",
                          description: "You have already applied for this position through the platform.",
                        });
                      } else {
                        // Apply through platform
                        handleApply(job.id);
                      }
                    }}
                  >
                    {applying === job.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Applying...
                      </>
                    ) : job.apply_link ? (
                      // Always show "Apply on Company Website" if external link exists
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {job.status === "Applied" ? "Apply on Company Website" : "Apply on Company Website"}
                      </>
                    ) : job.status === "Applied" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        View Application
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Apply Now
                      </>
                    )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-4 mb-4 pb-4 border-b">
              {selectedJob?.company_logo ? (
                <img 
                  src={selectedJob.company_logo} 
                  alt={selectedJob.company} 
                  className="h-20 w-20 rounded-xl object-contain shadow-lg flex-shrink-0 border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`h-20 w-20 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg flex-shrink-0 ${selectedJob?.company_logo ? 'hidden' : ''}`}>
                <span className="text-white font-bold text-3xl">{selectedJob?.logo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold mb-1">{selectedJob?.company}</DialogTitle>
                <DialogDescription className="text-lg font-medium">{selectedJob?.role}</DialogDescription>
                {selectedJob?.title && selectedJob.title !== selectedJob.role && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedJob.title}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={selectedJob?.job_type === "On-Campus" ? "default" : selectedJob?.job_type === "Internship" ? "secondary" : "outline"}>
                    {selectedJob?.job_type}
                  </Badge>
                  {selectedJob?.status === "Applied" && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Applied
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                {selectedJob.location && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{selectedJob.location}</p>
                    </div>
                  </div>
                )}
                {selectedJob.ctc && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">CTC</p>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{selectedJob.ctc}</p>
                    </div>
                  </div>
                )}
                {selectedJob.deadline && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Deadline</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{new Date(selectedJob.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {selectedJob.totalApplicants !== undefined && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Applicants</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{selectedJob.totalApplicants}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Description
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedJob.description || "No description available"}</p>
                  </div>
                </div>

                {selectedJob.requirements && Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Requirements</h3>
                    <ul className="space-y-2">
                      {selectedJob.requirements.map((req, idx) => (
                        <li key={idx} className="text-muted-foreground flex items-start gap-3">
                          <span className="text-primary mt-1.5 font-bold">•</span>
                          <span className="flex-1">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedJob.selection_rounds || selectedJob.rounds) && Array.isArray(selectedJob.selection_rounds || selectedJob.rounds) && (selectedJob.selection_rounds || selectedJob.rounds || []).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Selection Process</h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedJob.selection_rounds || selectedJob.rounds || []).map((round, idx) => (
                        <Badge key={idx} variant="outline" className="px-3 py-1">
                          {idx + 1}. {round}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Round Status for Applied Jobs */}
                {selectedJob.status === "Applied" && (
                  <div className="mt-4">
                    <JobRoundStatus jobId={selectedJob.id} />
                  </div>
                )}

                {selectedJob.apply_link && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          External Application Required
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                          This job requires applying through the company's website. Click the button below to open the application page.
                        </p>
                        <a 
                          href={selectedJob.apply_link.startsWith('http://') || selectedJob.apply_link.startsWith('https://') 
                            ? selectedJob.apply_link 
                            : `https://${selectedJob.apply_link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Ensure link opens correctly
                            const url = selectedJob.apply_link.startsWith('http://') || selectedJob.apply_link.startsWith('https://')
                              ? selectedJob.apply_link
                              : `https://${selectedJob.apply_link}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          {selectedJob.apply_link}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                size="lg"
                variant={selectedJob.status === "Applied" && !selectedJob.apply_link ? "outline" : "default"}
                disabled={applying === selectedJob.id}
                onClick={() => {
                  // If job has apply_link, always redirect (even if already applied)
                  if (selectedJob.apply_link) {
                    handleApply(selectedJob.id);
                  } else if (selectedJob.status === "Applied") {
                    // Already applied through platform, no external link
                    toast({
                      title: "Already Applied",
                      description: "You have already applied for this position through the platform.",
                    });
                  } else {
                    // Apply through platform
                    handleApply(selectedJob.id);
                  }
                }}
              >
                {applying === selectedJob.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Applying...
                  </>
                ) : selectedJob.apply_link ? (
                  // Always show "Apply on Company Website" if external link exists
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply on Company Website
                  </>
                ) : selectedJob.status === "Applied" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Application Submitted
                  </>
                ) : (
                  <>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Apply for this Position
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
