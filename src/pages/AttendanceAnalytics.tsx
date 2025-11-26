import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { 
  BarChart3, 
  Calendar, 
  Users, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  X,
  Download,
  Loader2,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string | null;
  student_email: string | null;
  student_roll_number: string | null;
  subject: string;
  date: string;
  status: string;
  section_id: string | null;
}

interface AnalyticsData {
  summary: {
    total_records: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    attendance_percentage: number;
  };
  by_subject: Record<string, { total: number; present: number; absent: number; late: number }>;
  by_date: Record<string, { total: number; present: number; absent: number; late: number }>;
  by_student: Array<{
    student_id: number;
    student_name: string | null;
    roll_number: string | null;
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  }>;
  total_students?: number;
  total_classes?: number;
  section_wise_stats?: Array<{
    section_id: number;
    section_name: string;
    total_students: number;
    total_records: number;
    present: number;
    absent: number;
    late: number;
    present_percentage: number;
  }>;
  period_wise_stats?: Array<{
    period_number: number;
    total_records: number;
    present: number;
    absent: number;
    late: number;
    present_percentage: number;
  }>;
}

interface Department {
  id: number;
  name: string;
  code?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
}

interface Section {
  id: number;
  name: string;
  department_id?: number;
}

interface Period {
  id: number;
  number: number;
  name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export default function AttendanceAnalytics() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    student_id: "",
    subject_id: "",
    subject: "",
    department: "",
    section_id: "",
    section: "",
    period_number: "",
    date_from: "",
    date_to: "",
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const { isAdmin, isFaculty, isHOD } = useUserRole();

  useEffect(() => {
    fetchAnalytics();
    fetchFilterOptions();
  }, [filters]);

  const fetchFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      // Fetch departments, subjects, sections, periods if needed
      // These would come from respective API endpoints
    } catch (error: any) {
      console.error("Error fetching filter options:", error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filters.student_id) filterParams.student_id = parseInt(filters.student_id);
      if (filters.subject_id) filterParams.subject_id = parseInt(filters.subject_id);
      if (filters.section_id) filterParams.section_id = parseInt(filters.section_id);
      if (filters.department) filterParams.department = filters.department;
      if (filters.date_from) filterParams.date_from = filters.date_from;
      if (filters.date_to) filterParams.date_to = filters.date_to;

      const data = await apiClient.getAttendanceAnalytics(filterParams);
      setAnalytics(data);
    } catch (error: any) {
      console.error("Error fetching attendance analytics:", error);
      toast.error(error.message || "Failed to load attendance analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      student_id: "",
      subject_id: "",
      subject: "",
      department: "",
      section_id: "",
      section: "",
      period_number: "",
      date_from: "",
      date_to: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-success text-success-foreground";
      case "absent":
        return "bg-destructive text-destructive-foreground";
      case "late":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive attendance analytics and insights</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Analytics</h1>
        <p className="text-muted-foreground mt-1">Comprehensive attendance analytics and insights</p>
      </div>

      {/* Summary Cards */}
      {analytics?.summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-4xl">{analytics.summary.total_records}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Present</CardDescription>
              <CardTitle className="text-4xl text-success">{analytics.summary.present_count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Absent</CardDescription>
              <CardTitle className="text-4xl text-destructive">{analytics.summary.absent_count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Attendance %</CardDescription>
              <CardTitle className="text-4xl">{analytics.summary.attendance_percentage.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filters</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
                placeholder="Filter by department"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={filters.subject}
                onChange={(e) => handleFilterChange("subject", e.target.value)}
                placeholder="Filter by subject"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Data */}
      {analytics && (
        <>
          {/* Subject-wise Chart */}
          {Object.keys(analytics.by_subject).length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Attendance by Subject</CardTitle>
                <CardDescription>Percentage breakdown by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(analytics.by_subject).map(([subject, data]) => ({
                    subject,
                    percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
                    present: data.present,
                    absent: data.absent,
                    late: data.late
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Student-wise Table */}
          {analytics.by_student && analytics.by_student.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Student-wise Attendance</CardTitle>
                <CardDescription>Detailed breakdown by student</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.by_student.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">{student.student_name || "N/A"}</TableCell>
                          <TableCell>{student.roll_number || "N/A"}</TableCell>
                          <TableCell className="text-center text-success">{student.present}</TableCell>
                          <TableCell className="text-center text-destructive">{student.absent}</TableCell>
                          <TableCell className="text-center text-warning">{student.late}</TableCell>
                          <TableCell className="text-center">{student.total}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {student.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!analytics && !loading && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No attendance data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
