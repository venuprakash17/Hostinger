/** Lab Detail Page - Student Interface */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor } from '@/components/coding-labs/CodeEditor';
import { ArrowLeft, BookOpen, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';

interface Problem {
  id: number;
  title: string;
  description: string;
  problem_statement: string;
  starter_code?: string;
  allowed_languages: string[];
  default_language: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  points: number;
  order_index: number;
}

interface Lab {
  id: number;
  title: string;
  description: string;
  mode: string;
  difficulty: string;
  is_proctored: boolean;
  enforce_fullscreen: boolean;
  detect_tab_switch: boolean;
  camera_proctoring: boolean;
  time_limit_minutes?: number;
}

export default function LabDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lab, setLab] = useState<Lab | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchLab();
      fetchProblems();
      fetchSubmissions();
    }
  }, [id]);

  // Proctoring: Request camera access if enabled
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    if (lab?.is_proctored && lab?.camera_proctoring) {
      requestCameraAccess().then((s) => {
        stream = s;
      });
    }
    
    return () => {
      // Cleanup camera stream on unmount or when disabled
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    };
  }, [lab?.is_proctored, lab?.camera_proctoring]);

  // Note: Fullscreen enforcement is now handled by ProctoringService
  // This effect is kept for backward compatibility but ProctoringService handles it better

  const requestCameraAccess = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }, 
        audio: false 
      });
      setCameraStream(stream);
      setCameraError(null);
      toast.success('Camera access granted for proctoring');
      return stream;
    } catch (error: any) {
      setCameraError(error.message);
      toast.error('Camera access is required for this proctored exam. Please enable camera access.');
      console.error('Camera access error:', error);
      return null;
    }
  };

  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        toast.success('Entered fullscreen mode');
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
        toast.success('Entered fullscreen mode');
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
        toast.success('Entered fullscreen mode');
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
        toast.success('Entered fullscreen mode');
      } else {
        toast.warning('Fullscreen is not supported in this browser. Please enable it manually.');
      }
    } catch (error: any) {
      toast.error('Could not enter fullscreen mode. Please enable it manually.');
      console.error('Fullscreen error:', error);
    }
  };

  const fetchLab = async () => {
    try {
      const data = await apiClient.getLab(Number(id));
      setLab(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab');
      navigate('/coding-labs');
    }
  };

  const fetchProblems = async () => {
    try {
      const data = await apiClient.listProblems(Number(id));
      setProblems(data);
      if (data.length > 0) {
        setSelectedProblem(data[0]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const data = await apiClient.listSubmissions({ lab_id: Number(id) });
      setSubmissions(data);
    } catch (error: any) {
      // Silent fail - submissions are optional
    }
  };

  const handleSubmission = (submission: any) => {
    toast.success(`Submission successful! Score: ${submission.score}/${submission.max_score}`);
    fetchSubmissions();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lab...</p>
        </div>
      </div>
    );
  }

  if (!lab || problems.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Lab not found</p>
            <Button onClick={() => navigate('/coding-labs')} className="mt-4">
              Back to Labs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/coding-labs')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{lab.title}</h1>
                <p className="text-sm text-muted-foreground">{lab.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{lab.difficulty}</Badge>
              <Badge variant="outline">{lab.mode}</Badge>
              {lab.is_proctored && (
                <>
                  <Badge variant="destructive">Proctored</Badge>
                  {lab.camera_proctoring && (
                    <Badge variant="outline" className="text-xs">
                      📷 Camera Required
                    </Badge>
                  )}
                  {lab.enforce_fullscreen && (
                    <Badge variant="outline" className="text-xs">
                      🖥️ Fullscreen Required
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Problems Sidebar */}
        <div className="w-80 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-4">Problems</h2>
            <div className="space-y-2">
              {problems.map((problem, index) => {
                const submission = submissions.find(s => s.problem_id === problem.id);
                const isSelected = selectedProblem?.id === problem.id;
                
                return (
                  <Card
                    key={problem.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedProblem(problem)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Problem {index + 1}</span>
                            {submission && (
                              submission.status === 'accepted' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )
                            )}
                          </div>
                          <p className="text-sm font-semibold">{problem.title}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{problem.time_limit_seconds}s</span>
                            <span>•</span>
                            <span>{problem.points} pts</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Problem and Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProblem && (
            <Tabs defaultValue="problem" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="problem">Problem</TabsTrigger>
                <TabsTrigger value="editor">Code</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
              </TabsList>

              <TabsContent value="problem" className="flex-1 overflow-y-auto p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedProblem.title}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge>{selectedProblem.difficulty}</Badge>
                        <span>Time Limit: {selectedProblem.time_limit_seconds}s</span>
                        <span>Memory Limit: {selectedProblem.memory_limit_mb}MB</span>
                        <span>Points: {selectedProblem.points}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <h3>Description</h3>
                      <p className="whitespace-pre-wrap">{selectedProblem.description}</p>
                      
                      <h3 className="mt-6">Problem Statement</h3>
                      <p className="whitespace-pre-wrap">{selectedProblem.problem_statement}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="editor" className="flex-1 overflow-hidden relative">
                <div className="h-full">
                  <CodeEditor
                    problemId={selectedProblem.id}
                    labId={lab.id}
                    starterCode={selectedProblem.starter_code}
                    defaultLanguage={selectedProblem.default_language}
                    allowedLanguages={selectedProblem.allowed_languages}
                    timeLimitSeconds={selectedProblem.time_limit_seconds}
                    memoryLimitMb={selectedProblem.memory_limit_mb}
                    isProctored={lab.is_proctored}
                    enforceFullscreen={lab.enforce_fullscreen}
                    detectTabSwitch={lab.detect_tab_switch}
                    onSubmission={handleSubmission}
                  />
                  {lab.is_proctored && lab.camera_proctoring && (
                    <div className="absolute top-4 right-4 z-10">
                      {cameraStream ? (
                        <div className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                          <span>📷</span>
                          <span>Camera Active</span>
                        </div>
                      ) : cameraError ? (
                        <div className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                          <span>📷</span>
                          <span>Camera Required</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                          <span>📷</span>
                          <span>Requesting Camera...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="submissions" className="flex-1 overflow-y-auto p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>My Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.filter(s => s.problem_id === selectedProblem.id).length === 0 ? (
                      <p className="text-muted-foreground">No submissions yet</p>
                    ) : (
                      <div className="space-y-4">
                        {submissions
                          .filter(s => s.problem_id === selectedProblem.id)
                          .map((submission) => (
                            <Card key={submission.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      Attempt {submission.attempt_number}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(submission.submitted_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge
                                      variant={
                                        submission.status === 'accepted' ? 'default' : 'destructive'
                                      }
                                    >
                                      {submission.status}
                                    </Badge>
                                    <p className="text-sm mt-1">
                                      {submission.score} / {submission.max_score} pts
                                    </p>
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
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

