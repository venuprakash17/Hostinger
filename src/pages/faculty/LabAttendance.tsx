/**
 * Lab Attendance Marking Page
 * Faculty can mark attendance for students in their assigned labs
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Save, Users, Calendar, Clock, 
  CheckCircle2, XCircle, AlertCircle, FileText 
} from 'lucide-react';
import { labManagementAPI, LabStudent, AttendanceRecord } from '@/integrations/api/labManagement';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

export default function LabAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFaculty } = useUserRole();
  const [lab, setLab] = useState<any>(null);
  const [students, setStudents] = useState<LabStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, { status: string; notes: string }>>({});

  useEffect(() => {
    if (!isFaculty) {
      toast.error('Access denied');
      navigate('/faculty/dashboard');
      return;
    }

    if (id) {
      fetchLab();
      fetchStudents();
    }
  }, [id]);

  const fetchLab = async () => {
    try {
      const labData = await apiClient.getLab(Number(id));
      setLab(labData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load lab');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsData = await labManagementAPI.getLabStudents(Number(id));
      setStudents(studentsData);
      
      // Initialize attendance records with 'present' as default
      const initialRecords: Record<number, { status: string; notes: string }> = {};
      studentsData.forEach(student => {
        initialRecords[student.id] = { status: 'present', notes: '' };
      });
      setAttendanceRecords(initialRecords);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSubmit = async () => {
    if (!id) return;

    try {
      setSaving(true);
      
      const records: AttendanceRecord[] = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        student_id: Number(studentId),
        status: data.status as 'present' | 'absent' | 'late' | 'excused',
        notes: data.notes || undefined
      }));

      await labManagementAPI.markLabAttendance(Number(id), {
        lab_id: Number(id),
        date: attendanceDate,
        attendance_records: records,
        session_number: sessionNumber
      });

      toast.success('Attendance marked successfully!');
      navigate(`/faculty/my-labs`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'excused':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusCounts = () => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(attendanceRecords).forEach(record => {
      counts[record.status as keyof typeof counts]++;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/my-labs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Labs
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mark Attendance</h1>
            <p className="text-muted-foreground mt-2">
              {lab?.title || 'Lab Attendance'}
            </p>
          </div>
        </div>
      </div>

      {/* Lab Info */}
      {lab && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Lab:</span>
                <p className="font-semibold">{lab.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Students:</span>
                <p className="font-semibold">{students.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-semibold">{new Date(attendanceDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Session:</span>
                <p className="font-semibold">#{sessionNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{statusCounts.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{statusCounts.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.excused}</p>
              <p className="text-sm text-muted-foreground">Excused</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date and Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Attendance Date</Label>
              <Input
                id="date"
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="session">Session Number</Label>
              <Input
                id="session"
                type="number"
                min="1"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Mark attendance for each student. Students are automatically filtered by lab's department, year, subject, and section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">No students found</p>
                <p className="text-muted-foreground mt-2">
                  No students match this lab's criteria (department/year/subject/section)
                </p>
              </div>
            ) : (
              students.map((student) => (
                <Card key={student.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{student.full_name || student.email}</h4>
                          {student.roll_number && (
                            <Badge variant="outline">{student.roll_number}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {student.department && (
                            <span>Dept: {student.department}</span>
                          )}
                          {student.section && (
                            <span>Section: {student.section}</span>
                          )}
                          {student.present_year && (
                            <span>Year: {student.present_year}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select
                          value={attendanceRecords[student.id]?.status || 'present'}
                          onValueChange={(value) => handleStatusChange(student.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Textarea
                        placeholder="Notes (optional)"
                        value={attendanceRecords[student.id]?.notes || ''}
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/faculty/my-labs')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || students.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>
    </div>
  );
}

