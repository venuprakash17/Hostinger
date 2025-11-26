/**
 * Faculty My Labs Page
 * Display all labs assigned to the current faculty member
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Users, Calendar, Clock, Search, 
  Eye, ClipboardList, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { labManagementAPI, FacultyLab } from '@/integrations/api/labManagement';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

export default function MyLabs() {
  const navigate = useNavigate();
  const { isFaculty } = useUserRole();
  const [labs, setLabs] = useState<FacultyLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isFaculty) {
      toast.error('Access denied');
      navigate('/faculty/dashboard');
      return;
    }

    // Get current user ID from token
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        setCurrentUserId(userId);
        if (userId) {
          fetchLabs(userId);
        }
      } catch (error) {
        console.error('Failed to decode token:', error);
        // Fallback: try to get from API
        fetchUserAndLabs();
      }
    } else {
      fetchUserAndLabs();
    }
  }, [isFaculty]);

  const fetchUserAndLabs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUserId(user.id);
        await fetchLabs(user.id);
      }
    } catch (error) {
      toast.error('Failed to load user information');
    }
  };

  const fetchLabs = async (userId?: number) => {
    try {
      setLoading(true);
      const userIdToUse = userId || currentUserId;
      if (!userIdToUse) {
        toast.error('User ID not found');
        return;
      }
      const labsData = await labManagementAPI.getFacultyLabs(userIdToUse);
      setLabs(labsData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load labs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter(lab =>
    lab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.subject?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.department?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Labs</h1>
          <p className="text-muted-foreground mt-2">
            Labs assigned to you for teaching and attendance
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search labs by title, subject, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredLabs.length} {filteredLabs.length === 1 ? 'Lab' : 'Labs'}
        </Badge>
      </div>

      {/* Labs Grid */}
      {filteredLabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Labs Assigned</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? 'No labs match your search criteria'
                : 'You have not been assigned to any labs yet. Contact your administrator.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabs.map((lab) => (
            <Card key={lab.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{lab.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {lab.description || 'No description'}
                    </CardDescription>
                  </div>
                  {lab.is_published ? (
                    <Badge variant="default" className="ml-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      Draft
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject & Department Info */}
                <div className="space-y-2">
                  {lab.subject && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Subject:</span>
                      <span>{lab.subject.name}</span>
                      {lab.subject.code && (
                        <Badge variant="outline" className="text-xs">
                          {lab.subject.code}
                        </Badge>
                      )}
                    </div>
                  )}
                  {lab.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Department:</span>
                      <span>{lab.department.name}</span>
                      {lab.department.code && (
                        <Badge variant="outline" className="text-xs">
                          {lab.department.code}
                        </Badge>
                      )}
                    </div>
                  )}
                  {lab.year && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Year:</span>
                      <span>{lab.year}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/coding-labs/${lab.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/faculty/labs/${lab.id}/attendance`)}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

