/** Lab Monitoring Dashboard - Real-time student activity */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, Code2, AlertTriangle, Eye } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

interface StudentActivity {
  user_id: number;
  lab_id: number;
  problem_id?: number;
  current_code?: string;
  language?: string;
  time_spent_seconds: number;
  attempt_count: number;
  last_activity: string;
  is_active: boolean;
  tab_switches: number;
  fullscreen_exits: number;
}

export default function LabMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFaculty, isAdmin, isSuperAdmin, isHOD } = useUserRole();
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [lab, setLab] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Check permissions
    if (!isHOD && !isFaculty && !isAdmin && !isSuperAdmin) {
      toast.error('Access denied');
      navigate('/coding-labs');
      return;
    }

    fetchLab();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const fetchLab = async () => {
    try {
      const data = await apiClient.getLab(Number(id));
      setLab(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab');
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || (import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1').replace(/^https?:\/\//, 'ws://').replace(/\/api\/v1$/, '');
    const wsUrl = `${wsBaseUrl}/ws/coding-labs/${id}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      toast.success('Connected to monitoring');
      // Request current activities
      ws.send(JSON.stringify({ type: 'get_activities' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'activities' || data.type === 'activity_update') {
        setActivities(data.activities || []);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error');
    };

    ws.onclose = () => {
      setConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (id) connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/coding-labs/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Lab Monitoring</h1>
            <p className="text-muted-foreground mt-2">
              {lab?.title || 'Real-time student activity'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" onClick={() => navigate(`/coding-labs/${id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Lab
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.is_active).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time Spent</p>
                <p className="text-2xl font-bold">
                  {activities.length > 0
                    ? formatTime(
                        Math.round(
                          activities.reduce((sum, a) => sum + a.time_spent_seconds, 0) /
                            activities.length
                        )
                      )
                    : '0m'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious Activity</p>
                <p className="text-2xl font-bold">
                  {
                    activities.filter(
                      a => a.tab_switches > 0 || a.fullscreen_exits > 0
                    ).length
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Violations Button */}
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/coding-labs/${id}/violations`)}>
          View Detailed Violations
        </Button>
      </div>

      {/* Student Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Student Activities</CardTitle>
          <CardDescription>Real-time monitoring of student progress</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold">No active students</p>
              <p className="text-muted-foreground mt-2">
                Students will appear here when they start working on the lab
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.user_id} className={activity.is_active ? '' : 'opacity-60'}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={activity.is_active ? 'default' : 'secondary'}>
                            {activity.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="font-semibold">User ID: {activity.user_id}</span>
                          {activity.language && (
                            <Badge variant="outline">{activity.language}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <Clock className="h-4 w-4 inline mr-1" />
                            Time: {formatTime(activity.time_spent_seconds)}
                          </div>
                          <div>
                            <Code2 className="h-4 w-4 inline mr-1" />
                            Attempts: {activity.attempt_count}
                          </div>
                          {activity.tab_switches > 0 && (
                            <div className="text-yellow-600">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              Tab switches: {activity.tab_switches}
                            </div>
                          )}
                          {activity.fullscreen_exits > 0 && (
                            <div className="text-red-600">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              Fullscreen exits: {activity.fullscreen_exits}
                            </div>
                          )}
                        </div>
                        {activity.current_code && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Current Code:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                              {activity.current_code.substring(0, 200)}
                              {activity.current_code.length > 200 && '...'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

