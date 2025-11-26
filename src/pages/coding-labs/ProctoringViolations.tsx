/**
 * Proctoring Violations Dashboard
 * Production-grade detailed violation tracking and reporting
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, AlertTriangle, Clock, Users, TrendingUp, FileText } from 'lucide-react';
import { proctoringAPI, ViolationResponse, ViolationSummary } from '@/integrations/api/proctoring';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

export default function ProctoringViolations() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFaculty, isAdmin, isSuperAdmin } = useUserRole();
  const [violations, setViolations] = useState<ViolationResponse[]>([]);
  const [summary, setSummary] = useState<ViolationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    violationType?: string;
    severity?: string;
    userId?: number;
  }>({});

  useEffect(() => {
    if (!id) return;

    if (!isFaculty && !isAdmin && !isSuperAdmin) {
      toast.error('Access denied');
      navigate('/coding-labs');
      return;
    }

    fetchViolations();
    fetchSummary();
  }, [id, filter]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const data = await proctoringAPI.getLabViolations(Number(id), {
        violationType: filter.violationType,
        severity: filter.severity,
        userId: filter.userId,
        limit: 100,
      });
      setViolations(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await proctoringAPI.getViolationSummary(Number(id));
      setSummary(data);
    } catch (error: any) {
      console.error('Failed to load summary:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getViolationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Tab Switch',
      fullscreen_exit: 'Fullscreen Exit',
      window_blur: 'Window Blur',
      copy_paste: 'Copy/Paste',
      devtools: 'DevTools Open',
    };
    return labels[type] || type;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading && !summary) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading violations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/coding-labs/${id}/monitor`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Monitor
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Proctoring Violations</h1>
            <p className="text-muted-foreground mt-2">Detailed violation tracking and reporting</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Violations</p>
                  <p className="text-2xl font-bold">{summary.total_violations}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{summary.total_sessions}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl font-bold">{summary.active_sessions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Severity</p>
                  <p className="text-2xl font-bold">{summary.by_severity.high || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Violations by Type */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Violations by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(summary.by_type).map(([type, count]) => (
                <div key={type} className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{getViolationTypeLabel(type)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Violations</CardTitle>
              <CardDescription>Detailed violation records with timestamps</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-1 border rounded"
                value={filter.violationType || ''}
                onChange={(e) => setFilter({ ...filter, violationType: e.target.value || undefined })}
              >
                <option value="">All Types</option>
                <option value="tab_switch">Tab Switch</option>
                <option value="fullscreen_exit">Fullscreen Exit</option>
                <option value="window_blur">Window Blur</option>
                <option value="copy_paste">Copy/Paste</option>
                <option value="devtools">DevTools</option>
              </select>
              <select
                className="px-3 py-1 border rounded"
                value={filter.severity || ''}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })}
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold">No violations found</p>
              <p className="text-muted-foreground mt-2">
                {filter.violationType || filter.severity
                  ? 'Try adjusting your filters'
                  : 'All students are following the rules!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {violations.map((violation) => (
                <Card key={violation.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityColor(violation.severity) as any}>
                            {violation.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{getViolationTypeLabel(violation.violation_type)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            User ID: {violation.user_id}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(violation.timestamp).toLocaleString()}
                          </p>
                          {violation.time_spent_seconds && (
                            <p className="mt-1">
                              Time spent: {formatTime(violation.time_spent_seconds)}
                            </p>
                          )}
                        </div>
                        {violation.details && Object.keys(violation.details).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Details:</p>
                            <pre className="bg-muted p-2 rounded mt-1">
                              {JSON.stringify(violation.details, null, 2)}
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

