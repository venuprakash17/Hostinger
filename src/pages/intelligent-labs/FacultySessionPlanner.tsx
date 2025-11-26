/**
 * Faculty Session Planner - CodeTantra-like Session Management
 * Create and manage daily lab sessions with materials and exercises
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Calendar, Plus, FileText, Video, Code2, Edit, Trash2, 
  Save, Upload, Loader2, Clock, Award
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { intelligentLabAPI, DailySession, SessionMaterial } from '@/integrations/api/intelligentLab';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FacultySessionPlanner() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const [lab, setLab] = useState<any>(null);
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DailySession | null>(null);
  
  // Session form state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    instructions: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_time: '',
    duration_minutes: '',
    order_index: 0,
    mode: 'practice' as 'practice' | 'assignment' | 'exam',
    allow_hints: true,
    allow_multiple_attempts: true,
    max_attempts: undefined as number | undefined,
    time_limit_minutes: '',
    is_proctored: false,
    enforce_fullscreen: false,
    detect_tab_switch: false,
    camera_proctoring: false, // Added camera proctoring
    total_points: 100,
    passing_score: 60
  });

  // Material form state
  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    material_type: 'pdf' as 'pdf' | 'slide' | 'code_file' | 'note' | 'video_link' | 'document',
    file_url: '',
    is_required: false
  });

  useEffect(() => {
    if (labId) {
      fetchLabData();
    }
  }, [labId]);

  const fetchLabData = async () => {
    try {
      setLoading(true);
      const [labData, sessionsData] = await Promise.all([
        apiClient.getLab(Number(labId)),
        intelligentLabAPI.listDailySessions(Number(labId))
      ]);
      
      setLab(labData);
      setSessions(sessionsData.sort((a, b) => 
        new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      ));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-configure settings based on mode
  const handleModeChange = (newMode: 'practice' | 'assignment' | 'exam') => {
    setSessionForm(prev => {
      const updates: any = { mode: newMode };
      
      if (newMode === 'exam') {
        // Exam mode: strict settings
        updates.allow_hints = false;
        updates.allow_multiple_attempts = false;
        updates.max_attempts = 1;
        updates.is_proctored = true;
        updates.enforce_fullscreen = true;
        updates.detect_tab_switch = true;
        updates.camera_proctoring = false; // Can be enabled manually
      } else if (newMode === 'assignment') {
        // Assignment mode: moderate settings
        updates.allow_hints = true; // Can be changed
        updates.allow_multiple_attempts = true;
        updates.max_attempts = 3; // Default 3 attempts
        updates.is_proctored = false; // Optional - can be enabled
        updates.enforce_fullscreen = false;
        updates.detect_tab_switch = false;
        updates.camera_proctoring = false;
      } else {
        // Practice mode: relaxed settings
        updates.allow_hints = true;
        updates.allow_multiple_attempts = true;
        updates.max_attempts = undefined; // Unlimited
        updates.is_proctored = false; // Can be enabled if needed
        updates.enforce_fullscreen = false;
        updates.detect_tab_switch = false;
        updates.camera_proctoring = false;
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleCreateSession = async () => {
    try {
      const sessionData = {
        ...sessionForm,
        duration_minutes: sessionForm.duration_minutes ? parseInt(sessionForm.duration_minutes) : undefined,
        time_limit_minutes: sessionForm.time_limit_minutes ? parseInt(sessionForm.time_limit_minutes) : undefined,
        order_index: sessions.length,
        camera_proctoring: sessionForm.camera_proctoring || false
      };
      
      await intelligentLabAPI.createDailySession(Number(labId), sessionData);
      toast.success('Session created successfully');
      setSessionDialogOpen(false);
      resetSessionForm();
      fetchLabData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create session');
    }
  };

  const handleAddMaterial = async () => {
    if (!selectedSession) return;
    
    try {
      await intelligentLabAPI.addSessionMaterial(selectedSession.id, materialForm);
      toast.success('Material added successfully');
      setMaterialDialogOpen(false);
      resetMaterialForm();
      fetchLabData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add material');
    }
  };

  const resetSessionForm = () => {
    setSessionForm({
      title: '',
      description: '',
      instructions: '',
      session_date: format(new Date(), 'yyyy-MM-dd'),
      session_time: '',
      duration_minutes: '',
      order_index: 0,
      mode: 'practice',
      allow_hints: true,
      allow_multiple_attempts: true,
      max_attempts: undefined,
      time_limit_minutes: '',
      is_proctored: false,
      enforce_fullscreen: false,
      detect_tab_switch: false,
      camera_proctoring: false,
      total_points: 100,
      passing_score: 60
    });
  };

  const resetMaterialForm = () => {
    setMaterialForm({
      title: '',
      description: '',
      material_type: 'pdf',
      file_url: '',
      is_required: false
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Planner</h1>
          <p className="text-muted-foreground mt-1">{lab?.title || 'Manage daily lab sessions'}</p>
        </div>
        <Button onClick={() => setSessionDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Daily Session
        </Button>
      </div>

      {/* Sessions Calendar View */}
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No sessions created yet</p>
              <Button onClick={() => setSessionDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle>{session.title}</CardTitle>
                      {session.mode && (
                        <Badge 
                          variant={session.mode === 'exam' ? 'destructive' : session.mode === 'assignment' ? 'default' : 'secondary'}
                        >
                          {session.mode === 'exam' ? 'Exam' : session.mode === 'assignment' ? 'Assignment' : 'Practice'}
                        </Badge>
                      )}
                      {session.is_completed && (
                        <Badge variant="outline" className="bg-success/10 text-success">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {format(new Date(session.session_date), 'EEEE, MMMM dd, yyyy')}
                      {session.session_time && ` at ${session.session_time}`}
                      {session.duration_minutes && ` • ${session.duration_minutes} minutes`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session);
                        setMaterialDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Material
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-4">{session.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span>{session.problem_count} exercises</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{session.materials.length} materials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>{session.total_points} points</span>
                  </div>
                </div>
                {session.materials.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-semibold mb-2">Materials:</p>
                    <div className="flex flex-wrap gap-2">
                      {session.materials.map((material) => (
                        <Badge key={material.id} variant="outline">
                          {material.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Daily Session</DialogTitle>
            <DialogDescription>
              Create a new daily lab session with date, time, and materials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="e.g., Day 1: Introduction to Python"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                placeholder="Session description..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={sessionForm.instructions}
                onChange={(e) => setSessionForm({ ...sessionForm, instructions: e.target.value })}
                placeholder="Instructions for students..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session_date">Session Date *</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={sessionForm.session_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="session_time">Session Time</Label>
                <Input
                  id="session_time"
                  type="time"
                  value={sessionForm.session_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: e.target.value })}
                  placeholder="90"
                />
              </div>
              <div>
                <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                <Input
                  id="time_limit_minutes"
                  type="number"
                  value={sessionForm.time_limit_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, time_limit_minutes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Mode Selection - Controls feature enablement */}
            <div>
              <Label htmlFor="mode">Session Mode *</Label>
              <Select
                value={sessionForm.mode}
                onValueChange={(value: 'practice' | 'assignment' | 'exam') => handleModeChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice - Learning mode with hints</SelectItem>
                  <SelectItem value="assignment">Assignment - Regular graded work</SelectItem>
                  <SelectItem value="exam">Exam - Strict proctored assessment</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {sessionForm.mode === 'practice' && 'Hints enabled, unlimited attempts, no proctoring'}
                {sessionForm.mode === 'assignment' && 'Hints optional, limited attempts, optional proctoring'}
                {sessionForm.mode === 'exam' && 'No hints, single attempt, full proctoring enabled'}
              </p>
            </div>

            {/* Auto-configured Settings (based on mode) */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold">Session Settings</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_hints">Allow Hints</Label>
                  <p className="text-xs text-muted-foreground">Students can view hints</p>
                </div>
                <Switch
                  id="allow_hints"
                  checked={sessionForm.allow_hints}
                  onCheckedChange={(checked) => setSessionForm({ ...sessionForm, allow_hints: checked })}
                  disabled={sessionForm.mode === 'exam'}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_multiple_attempts">Multiple Attempts</Label>
                  <p className="text-xs text-muted-foreground">Allow multiple submissions</p>
                </div>
                <Switch
                  id="allow_multiple_attempts"
                  checked={sessionForm.allow_multiple_attempts}
                  onCheckedChange={(checked) => setSessionForm({ ...sessionForm, allow_multiple_attempts: checked })}
                  disabled={sessionForm.mode === 'exam'}
                />
              </div>

              {sessionForm.allow_multiple_attempts && (
                <div>
                  <Label htmlFor="max_attempts">Max Attempts</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    value={sessionForm.max_attempts || ''}
                    onChange={(e) => setSessionForm({ 
                      ...sessionForm, 
                      max_attempts: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder={sessionForm.mode === 'practice' ? 'Unlimited' : '3'}
                    disabled={sessionForm.mode === 'exam'}
                  />
                </div>
              )}

              {/* Proctoring Settings - Available for all modes */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Proctoring Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_proctored">Enable Proctoring</Label>
                    <p className="text-xs text-muted-foreground">Monitor student activity</p>
                  </div>
                  <Switch
                    id="is_proctored"
                    checked={sessionForm.is_proctored}
                    onCheckedChange={(checked) => setSessionForm({ ...sessionForm, is_proctored: checked })}
                  />
                </div>

                {sessionForm.is_proctored && (
                  <>
                    <div className="flex items-center justify-between mt-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="enforce_fullscreen">Enforce Fullscreen</Label>
                        <p className="text-xs text-muted-foreground">Require fullscreen mode</p>
                      </div>
                      <Switch
                        id="enforce_fullscreen"
                        checked={sessionForm.enforce_fullscreen}
                        onCheckedChange={(checked) => setSessionForm({ ...sessionForm, enforce_fullscreen: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="detect_tab_switch">Detect Tab Switch</Label>
                        <p className="text-xs text-muted-foreground">Track tab switching</p>
                      </div>
                      <Switch
                        id="detect_tab_switch"
                        checked={sessionForm.detect_tab_switch}
                        onCheckedChange={(checked) => setSessionForm({ ...sessionForm, detect_tab_switch: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="camera_proctoring">Camera Proctoring</Label>
                        <p className="text-xs text-muted-foreground">Require camera access</p>
                      </div>
                      <Switch
                        id="camera_proctoring"
                        checked={sessionForm.camera_proctoring}
                        onCheckedChange={(checked) => setSessionForm({ ...sessionForm, camera_proctoring: checked })}
                      />
                    </div>
                  </>
                )}

                <div className="mt-3">
                  <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit_minutes"
                    type="number"
                    value={sessionForm.time_limit_minutes}
                    onChange={(e) => setSessionForm({ ...sessionForm, time_limit_minutes: e.target.value })}
                    placeholder="Optional - no limit if empty"
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set a time limit for this session (optional)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_points">Total Points</Label>
                  <Input
                    id="total_points"
                    type="number"
                    value={sessionForm.total_points}
                    onChange={(e) => setSessionForm({ ...sessionForm, total_points: parseFloat(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <Label htmlFor="passing_score">Passing Score</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    value={sessionForm.passing_score}
                    onChange={(e) => setSessionForm({ ...sessionForm, passing_score: parseFloat(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={!sessionForm.title || !sessionForm.session_date}>
              <Save className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session Material</DialogTitle>
            <DialogDescription>
              Add PDFs, slides, videos, or notes to the session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="material_title">Title *</Label>
              <Input
                id="material_title"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                placeholder="e.g., Lecture Slides - Day 1"
              />
            </div>
            <div>
              <Label htmlFor="material_type">Material Type *</Label>
              <Select
                value={materialForm.material_type}
                onValueChange={(value: any) => setMaterialForm({ ...materialForm, material_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="slide">Presentation Slides</SelectItem>
                  <SelectItem value="video_link">Video Link</SelectItem>
                  <SelectItem value="code_file">Code File</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_url">File URL or Link *</Label>
              <Input
                id="material_url"
                value={materialForm.file_url}
                onChange={(e) => setMaterialForm({ ...materialForm, file_url: e.target.value })}
                placeholder="https://example.com/file.pdf or YouTube link"
              />
            </div>
            <div>
              <Label htmlFor="material_description">Description</Label>
              <Textarea
                id="material_description"
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMaterial} 
              disabled={!materialForm.title || !materialForm.file_url}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

