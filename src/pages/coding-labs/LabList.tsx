/** Coding Labs List Page */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, Clock, Users, TrendingUp, Edit, Eye, Activity } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

interface Lab {
  id: number;
  title: string;
  mode: string;
  difficulty: string;
  topic?: string;
  is_published: boolean;
  is_active: boolean;
  total_points: number;
  created_at: string;
  problem_count?: number;
  submission_count?: number;
}

export default function LabList() {
  const navigate = useNavigate();
  const { isFaculty, isAdmin, isSuperAdmin, isHOD, loading: roleLoading } = useUserRole();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const canCreateLab = isHOD || isFaculty || isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!roleLoading) {
      fetchLabs();
    }
  }, [filterMode, filterDifficulty, roleLoading]);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterMode !== 'all') params.mode = filterMode;
      if (filterDifficulty !== 'all') params.difficulty = filterDifficulty;
      if (!canCreateLab) params.is_published = true;

      const data = await apiClient.listLabs(params);
      setLabs(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load labs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter(lab =>
    lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-500',
      medium: 'bg-yellow-500',
      hard: 'bg-orange-500',
      expert: 'bg-red-500',
    };
    return colors[difficulty] || 'bg-gray-500';
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      practice: 'Practice',
      assignment: 'Assignment',
      exam: 'Exam',
    };
    return labels[mode] || mode;
  };

  if (roleLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coding Labs</h1>
          <p className="text-muted-foreground mt-2">
            {canCreateLab 
              ? 'Create and manage coding labs for your students'
              : 'Practice coding problems and improve your skills'}
          </p>
        </div>
        {canCreateLab && (
          <Button onClick={() => navigate('/coding-labs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Lab
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search labs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="practice">Practice</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading labs...</p>
        </div>
      ) : filteredLabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No labs found</p>
            <p className="text-muted-foreground mt-2">
              {canCreateLab
                ? 'Create your first coding lab to get started'
                : 'No labs available at the moment'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabs.map((lab) => (
            <Card
              key={lab.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/coding-labs/${lab.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{lab.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {lab.topic && (
                        <Badge variant="outline" className="mr-2">
                          {lab.topic}
                        </Badge>
                      )}
                      <Badge className={getDifficultyColor(lab.difficulty)}>
                        {lab.difficulty}
                      </Badge>
                    </CardDescription>
                  </div>
                  {!lab.is_published && (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{lab.problem_count || 0} problems</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{lab.submission_count || 0} submissions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{lab.total_points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{getModeLabel(lab.mode)}</Badge>
                    <div className="flex items-center gap-2">
                      {canCreateLab && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/coding-labs/${lab.id}/monitor`);
                            }}
                            title="Monitor students"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/coding-labs/${lab.id}/build`);
                            }}
                            title="Edit lab"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/coding-labs/${lab.id}`);
                        }}
                      >
                        {canCreateLab ? (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </>
                        ) : (
                          'Start'
                        )}{' '}
                        →
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

