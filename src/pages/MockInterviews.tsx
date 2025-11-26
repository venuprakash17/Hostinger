import { useState, useEffect } from "react";
import { Calendar, Clock, Video, MapPin, CheckCircle2, XCircle, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MockInterview {
  id: number;
  title: string;
  interview_type: 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral';
  description?: string;
  student_id: number;
  interviewer_id?: number;
  interviewer_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
  venue?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  feedback?: string;
  rating?: number;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  strengths?: string[];
  areas_for_improvement?: string[];
}

export default function MockInterviews() {
  const [interviews, setInterviews] = useState<MockInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      const data = await apiClient.getMyInterviews(filters);
      setInterviews(data || []);
    } catch (error: any) {
      console.error("Error fetching interviews:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load interviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async (id: number) => {
    try {
      await apiClient.startInterview(id);
      toast({
        title: "Success",
        description: "Interview started successfully",
      });
      fetchInterviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start interview",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      case 'scheduled': return 'bg-blue-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredInterviews = interviews;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mock Interviews</h1>
          <p className="text-muted-foreground mt-1">View and manage your scheduled interviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interviews List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading interviews...</p>
          </CardContent>
        </Card>
      ) : filteredInterviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No interviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredInterviews.map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{interview.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview
                      {interview.interviewer_name && ` • ${interview.interviewer_name}`}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(interview.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(interview.status)}
                      {interview.status.replace('_', ' ').charAt(0).toUpperCase() + interview.status.replace('_', ' ').slice(1)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {interview.description && (
                  <p className="text-sm text-muted-foreground mb-4">{interview.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(interview.scheduled_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(interview.scheduled_at).toLocaleTimeString()} ({interview.duration_minutes} min)
                    </span>
                  </div>
                  {interview.meeting_link && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        Join Meeting
                      </a>
                    </div>
                  )}
                  {interview.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{interview.venue}</span>
                    </div>
                  )}
                </div>

                {interview.status === 'completed' && interview.feedback && (
                  <div className="mb-4 p-4 bg-muted rounded-md">
                    <h4 className="font-medium mb-2">Feedback</h4>
                    <p className="text-sm text-muted-foreground mb-2">{interview.feedback}</p>
                    {interview.rating && (
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm">Overall Rating: <strong>{interview.rating}/10</strong></span>
                        {interview.technical_score && (
                          <span className="text-sm">Technical: <strong>{interview.technical_score}/100</strong></span>
                        )}
                        {interview.communication_score && (
                          <span className="text-sm">Communication: <strong>{interview.communication_score}/100</strong></span>
                        )}
                      </div>
                    )}
                    {interview.strengths && interview.strengths.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Strengths:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {interview.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {interview.status === 'scheduled' && (
                    <Button variant="default" size="sm" onClick={() => handleStartInterview(interview.id)}>
                      Start Interview
                    </Button>
                  )}
                  {interview.meeting_link && interview.status !== 'completed' && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

