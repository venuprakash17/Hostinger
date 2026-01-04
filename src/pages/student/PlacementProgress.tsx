import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, CheckCircle2, XCircle, Clock, ArrowRight, 
  Building2, MapPin, Calendar, TrendingUp, Info, RefreshCw
} from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";

interface JobApplication {
  job_id: number;
  job_title: string;
  company: string;
  role: string;
  location?: string;
  rounds: Array<{
    round_id: number;
    round_name: string;
    round_order: number;
    status: string;
    remarks?: string;
    rejection_reasons?: string[];
    updated_at?: string;
  }>;
  current_round?: string;
  status: string;
}

export default function PlacementProgress() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "selected" | "rejected">("all");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh interval: 30 seconds
  const REFRESH_INTERVAL = 30000;

  useEffect(() => {
    fetchProgress();
    
    // Set up auto-refresh
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        fetchProgress(true); // Silent refresh
      }, REFRESH_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshEnabled]);

  const fetchProgress = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const data = await apiClient.getStudentJobStatus();
      const newApplications = data.applications || [];
      
      // Check if there are any changes (compare round statuses and counts)
      const hasChanges = 
        applications.length !== newApplications.length ||
        applications.some((app, idx) => {
          const newApp = newApplications[idx];
          if (!newApp || app.job_id !== newApp.job_id) return true;
          if (app.rounds?.length !== newApp.rounds?.length) return true;
          return app.rounds?.some((round, rIdx) => {
            const newRound = newApp.rounds?.[rIdx];
            return !newRound || 
              round.status !== newRound.status ||
              round.updated_at !== newRound.updated_at;
          });
        });
      
      setApplications(newApplications);
      setLastUpdated(new Date());
      
      // Show notification if there are changes and it's a silent refresh
      if (silent && hasChanges && applications.length > 0) {
        toast.success("Placement progress updated", {
          description: "Your application status has been updated.",
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error("Error fetching progress:", error);
      if (!silent) {
        toast.error("Failed to load placement progress");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchProgress(false);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock },
      CLEARED: { label: "Cleared", variant: "default" as const, icon: CheckCircle2 },
      IN_PROGRESS: { label: "In Progress", variant: "default" as const, icon: Clock },
      REJECTED: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
      QUALIFIED: { label: "Qualified", variant: "default" as const, icon: CheckCircle2 },
      ABSENT: { label: "Absent", variant: "outline" as const, icon: XCircle },
      SELECTED: { label: "Selected", variant: "default" as const, icon: CheckCircle2 },
    };

    const item = config[status as keyof typeof config] || config.PENDING;
    const Icon = item.icon;

    return (
      <Badge variant={item.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  const getOverallStatus = (app: JobApplication): string => {
    if (!app.rounds || app.rounds.length === 0) {
      return "PENDING";
    }
    
    // Check if any round is rejected
    if (app.rounds.some(r => r.status === "REJECTED")) {
      return "REJECTED";
    }
    
    // Check if student is in "Selected" round and it's cleared
    const selectedRound = app.rounds.find(r => r.round_name.toLowerCase() === "selected");
    if (selectedRound && selectedRound.status === "CLEARED") {
      return "SELECTED";
    }
    
    // Check if all rounds are cleared (student completed all rounds)
    const allCleared = app.rounds.every(r => r.status === "CLEARED");
    if (allCleared) {
      return "SELECTED";
    }
    
    // Check if student is in progress in any round
    const inProgress = app.rounds.some(r => r.status === "IN_PROGRESS");
    if (inProgress) {
      return "PENDING"; // Still active/ongoing
    }
    
    return "PENDING";
  };

  const filteredApplications = applications.filter(app => {
    const overallStatus = getOverallStatus(app);
    if (activeTab === "all") return true;
    if (activeTab === "active") return overallStatus === "PENDING";
    if (activeTab === "selected") return overallStatus === "SELECTED";
    if (activeTab === "rejected") return overallStatus === "REJECTED";
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your placement progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Placement Progress</h1>
          <p className="text-muted-foreground">
            Track your progress through placement rounds for college-managed jobs
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {autoRefreshEnabled && ` (Auto-refresh every ${REFRESH_INTERVAL / 1000}s)`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefreshEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAutoRefreshEnabled(!autoRefreshEnabled);
              if (autoRefreshEnabled && intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }}
          >
            {autoRefreshEnabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({applications.filter(a => getOverallStatus(a) === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="selected">
            Selected ({applications.filter(a => getOverallStatus(a) === "SELECTED").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({applications.filter(a => getOverallStatus(a) === "REJECTED").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No applications found in this category.</p>
                <p className="text-sm mt-2">
                  {activeTab === "all" 
                    ? "You haven't applied to any college-managed jobs yet."
                    : `No ${activeTab} applications at this time.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((app) => {
              const overallStatus = getOverallStatus(app);
              return (
                <Card key={app.job_id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{app.company}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {app.role} {app.location && `• ${app.location}`}
                        </CardDescription>
                      </div>
                      {getStatusBadge(overallStatus)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {app.rounds && app.rounds.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <Info className="h-4 w-4" />
                          <span>Round-wise Progress (Updated by College Admin)</span>
                        </div>
                        <div className="space-y-3">
                          {app.rounds.map((round, idx) => {
                            const isLast = idx === app.rounds.length - 1;
                            const getStatusIcon = () => {
                              switch (round.status) {
                                case "CLEARED":
                                  return <CheckCircle2 className="h-5 w-5 text-green-500" />;
                                case "IN_PROGRESS":
                                  return <Clock className="h-5 w-5 text-blue-500" />;
                                case "REJECTED":
                                  return <XCircle className="h-5 w-5 text-red-500" />;
                                case "QUALIFIED":
                                  return <CheckCircle2 className="h-5 w-5 text-green-500" />;
                                case "ABSENT":
                                  return <XCircle className="h-5 w-5 text-orange-500" />;
                                default:
                                  return <Clock className="h-5 w-5 text-muted-foreground" />;
                              }
                            };

                            const getConnectorColor = () => {
                              switch (round.status) {
                                case "CLEARED":
                                  return "bg-green-500";
                                case "IN_PROGRESS":
                                  return "bg-blue-500";
                                case "REJECTED":
                                  return "bg-red-500";
                                default:
                                  return "bg-muted";
                              }
                            };

                            return (
                              <div key={round.round_id} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  {getStatusIcon()}
                                  {!isLast && (
                                    <div className={`w-0.5 h-8 mt-1 ${getConnectorColor()}`} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">{round.round_name}</h4>
                                      {round.rejection_reasons && round.rejection_reasons.length > 0 && (
                                        <div className="mt-1">
                                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                                            Rejected by College Admin:
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {round.rejection_reasons.map((reason: string, idx: number) => (
                                              <Badge 
                                                key={idx} 
                                                variant="destructive" 
                                                className="text-xs"
                                              >
                                                {reason}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {round.remarks && !round.rejection_reasons && (
                                        <p className="text-sm text-muted-foreground mt-1">{round.remarks}</p>
                                      )}
                                      {round.updated_at && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Updated: {new Date(round.updated_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                    {getStatusBadge(round.status)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No rounds have been created for this job yet.</p>
                        <p className="text-sm mt-2">Check back later for updates.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {applications.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  About Placement Progress
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This section shows your progress through placement rounds for jobs managed by your college.
                  Round statuses are updated by college administrators. Super Admin jobs (off-campus) are not
                  tracked here but can be viewed in the Jobs section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
