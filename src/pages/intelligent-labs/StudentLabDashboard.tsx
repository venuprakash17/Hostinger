/**
 * Student Lab Dashboard - CodeTantra-like Daily Sessions View
 * Shows daily sessions, progress, exercises, and tests
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, BookOpen, FileText, Video, Code2, 
  CheckCircle2, Clock, TrendingUp, Award, Play,
  Download, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import { intelligentLabAPI, DailySession, StudentLabProgress, StudentSessionProgress } from '@/integrations/api/intelligentLab';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StudentLabDashboard() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const [lab, setLab] = useState<any>(null);
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [progress, setProgress] = useState<StudentLabProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DailySession | null>(null);
  const [sessionProgress, setSessionProgress] = useState<StudentSessionProgress | null>(null);

  useEffect(() => {
    if (labId) {
      fetchLabData();
    }
  }, [labId]);

  const fetchLabData = async () => {
    try {
      setLoading(true);
      const [labData, sessionsData, progressData] = await Promise.all([
        apiClient.getLab(Number(labId)),
        intelligentLabAPI.listDailySessions(Number(labId)),
        intelligentLabAPI.getStudentLabProgress(Number(labId))
      ]);
      
      setLab(labData);
      setSessions(sessionsData);
      setProgress(progressData);
      
      // Set current session if available
      if (progressData.current_session_id) {
        const currentSession = sessionsData.find(s => s.id === progressData.current_session_id);
        if (currentSession) {
          setSelectedSession(currentSession);
          fetchSessionProgress(currentSession.id);
        }
      } else if (sessionsData.length > 0) {
        // Set first incomplete session
        const incompleteSession = sessionsData.find(s => !s.is_completed);
        if (incompleteSession) {
          setSelectedSession(incompleteSession);
          fetchSessionProgress(incompleteSession.id);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionProgress = async (sessionId: number) => {
    try {
      const progressData = await intelligentLabAPI.getStudentSessionProgress(sessionId);
      setSessionProgress(progressData);
    } catch (error: any) {
      console.error('Failed to load session progress:', error);
    }
  };

  const handleSessionSelect = (session: DailySession) => {
    setSelectedSession(session);
    fetchSessionProgress(session.id);
  };

  const handleStartExercise = (problemId: number) => {
    navigate(`/coding-labs/${labId}/problems/${problemId}`);
  };

  const handleViewMaterial = (material: any) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank');
    } else if (material.file_path) {
      // Download file
      window.open(material.file_path, '_blank');
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'slide':
        return <FileText className="h-5 w-5" />;
      case 'video_link':
        return <Video className="h-5 w-5" />;
      case 'code_file':
        return <Code2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{lab?.title || 'Lab Dashboard'}</h1>
        <p className="text-muted-foreground mt-1">{lab?.description || 'Daily sessions and exercises'}</p>
      </div>

      {/* Overall Progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Your progress through this lab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion</span>
                  <span className="font-semibold">{progress.completion_percentage.toFixed(1)}%</span>
                </div>
                <Progress value={progress.completion_percentage} className="h-2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sessions</p>
                  <p className="text-2xl font-bold">{progress.sessions_completed}/{progress.sessions_total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exercises</p>
                  <p className="text-2xl font-bold">{progress.exercises_completed}/{progress.total_exercises}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tests Passed</p>
                  <p className="text-2xl font-bold">{progress.tests_passed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{progress.overall_percentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sessions</CardTitle>
              <CardDescription>Your learning schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-colors ${
                      selectedSession?.id === session.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSessionSelect(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(session.session_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <h4 className="font-semibold">{session.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{session.problem_count} exercises</span>
                            <span>{session.materials.length} materials</span>
                          </div>
                        </div>
                        {session.is_completed && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="exercises">Exercises</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedSession.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(selectedSession.session_date), 'EEEE, MMMM dd, yyyy')}
                      {selectedSession.session_time && ` at ${selectedSession.session_time}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedSession.description && (
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-muted-foreground">{selectedSession.description}</p>
                      </div>
                    )}
                    {selectedSession.instructions && (
                      <div>
                        <h4 className="font-semibold mb-2">Instructions</h4>
                        <p className="text-muted-foreground">{selectedSession.instructions}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Exercises</p>
                        <p className="text-xl font-bold">{selectedSession.problem_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Points</p>
                        <p className="text-xl font-bold">{selectedSession.total_points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Materials</CardTitle>
                    <CardDescription>PDFs, slides, videos, and notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSession.materials.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No materials available</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedSession.materials.map((material) => (
                          <Card key={material.id} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getMaterialIcon(material.material_type)}
                                  <div>
                                    <h4 className="font-semibold">{material.title}</h4>
                                    {material.description && (
                                      <p className="text-sm text-muted-foreground">{material.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline">{material.material_type}</Badge>
                                      {material.is_required && (
                                        <Badge variant="destructive">Required</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMaterial(material)}
                                >
                                  {material.file_url ? (
                                    <>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exercises" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Coding Exercises</CardTitle>
                    <CardDescription>Practice problems for this session</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                      Exercises will be loaded from the session. Click "Start Exercise" to begin.
                    </p>
                    {/* Exercises list would be loaded here */}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                {sessionProgress ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Session Progress</CardTitle>
                      <CardDescription>Your progress for this session</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Completion</span>
                            <span className="font-semibold">{sessionProgress.completion_percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={sessionProgress.completion_percentage} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Exercises Completed</p>
                            <p className="text-2xl font-bold">
                              {sessionProgress.exercises_completed}/{sessionProgress.exercises_attempted}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-2xl font-bold">
                              {sessionProgress.total_score}/{sessionProgress.max_score}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Time Spent</p>
                            <p className="text-2xl font-bold">
                              {sessionProgress.time_spent_minutes.toFixed(1)} min
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="text-2xl font-bold">
                              {sessionProgress.is_completed ? (
                                <span className="text-success">Completed</span>
                              ) : (
                                <span className="text-muted-foreground">In Progress</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No progress data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Select a session to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

