import { useState, useEffect } from "react";
import { Calendar, Clock, Video, MapPin, Plus, Loader2, Search, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
}

interface Student {
  id: number;
  email: string;
  full_name?: string;
}

export default function ManageMockInterviews() {
  const [interviews, setInterviews] = useState<MockInterview[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    interview_type: 'mock' as 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral',
    description: '',
    student_id: 0,
    interviewer_id: undefined as number | undefined,
    interviewer_name: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_link: '',
    venue: '',
  });

  useEffect(() => {
    fetchInterviews();
    fetchStudents();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getScheduledInterviews({});
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

  const fetchStudents = async () => {
    try {
      const data = await apiClient.listUsers({ role: 'student' });
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.student_id || !formData.scheduled_at) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.createMockInterview({
        title: formData.title,
        interview_type: formData.interview_type,
        description: formData.description || undefined,
        student_id: formData.student_id,
        interviewer_id: formData.interviewer_id,
        interviewer_name: formData.interviewer_name || undefined,
        scheduled_at: formData.scheduled_at,
        duration_minutes: formData.duration_minutes,
        meeting_link: formData.meeting_link || undefined,
        venue: formData.venue || undefined,
      });

      toast({
        title: "Success",
        description: "Interview scheduled successfully",
      });

      setOpen(false);
      setFormData({
        title: '',
        interview_type: 'mock',
        description: '',
        student_id: 0,
        interviewer_id: undefined,
        interviewer_name: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_link: '',
        venue: '',
      });
      fetchInterviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive",
      });
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Mock Interviews</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage mock interviews for students</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Mock Interview</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Technical Interview - Round 1"
                  required
                />
              </div>

              <div>
                <Label>Interview Type *</Label>
                <Select 
                  value={formData.interview_type} 
                  onValueChange={(value: any) => setFormData({ ...formData, interview_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock Interview</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="managerial">Managerial</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Student *</Label>
                <Select 
                  value={formData.student_id.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, student_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.full_name || student.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Scheduled Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  min={15}
                  max={180}
                />
              </div>

              <div>
                <Label>Meeting Link (Zoom/Google Meet)</Label>
                <Input
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>

              <div>
                <Label>Venue (for offline interviews)</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Room number, Building name, etc."
                />
              </div>

              <div>
                <Label>Interviewer Name</Label>
                <Input
                  value={formData.interviewer_name}
                  onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                  placeholder="Name of the interviewer"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Additional details about the interview"
                />
              </div>

              <Button type="submit" className="w-full">Schedule Interview</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search interviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Interviews Table */}
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
            <p className="text-muted-foreground">No interviews scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Interviews ({filteredInterviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((interview) => (
                    <TableRow key={interview.id}>
                      <TableCell className="font-medium">{interview.title}</TableCell>
                      <TableCell>Student #{interview.student_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(interview.scheduled_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{interview.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {interview.meeting_link && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                                Join
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

