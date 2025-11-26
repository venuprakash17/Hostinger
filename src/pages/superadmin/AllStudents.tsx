import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Search, Database, Download, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatYear } from "@/utils/yearFormat";

interface Student {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  section: string | null;
  roll_number: string | null;
  present_year: string | null;
  college_id: number | null;
  roles: Array<{ role: string; college_id: number | null }>;
  is_active: boolean;
  created_at: string;
}

interface College {
  id: number;
  name: string;
  code: string;
}

export default function AllStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    byCollege: {} as Record<string, number>,
    byDepartment: {} as Record<string, number>,
    byYear: {} as Record<string, number>
  });

  useEffect(() => {
    fetchColleges();
    fetchAllStudents();
  }, []);

  useEffect(() => {
    fetchAllStudents();
  }, [selectedCollege]);

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<College[]>('/colleges');
      setColleges(data || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      const endpoint = selectedCollege 
        ? `/users/all-students?college_id=${selectedCollege}`
        : '/users/all-students';
      const data = await apiClient.get<Student[]>(endpoint);
      setStudents(data || []);
      
      // Calculate stats
      const stats = {
        total: data?.length || 0,
        byCollege: {} as Record<string, number>,
        byDepartment: {} as Record<string, number>,
        byYear: {} as Record<string, number>
      };
      
      data?.forEach(student => {
        const collegeName = colleges.find(c => c.id === student.college_id)?.name || 'Unknown';
        stats.byCollege[collegeName] = (stats.byCollege[collegeName] || 0) + 1;
        
        if (student.department) {
          stats.byDepartment[student.department] = (stats.byDepartment[student.department] || 0) + 1;
        }
        
        if (student.present_year) {
          stats.byYear[student.present_year] = (stats.byYear[student.present_year] || 0) + 1;
        }
      });
      
      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search) ||
      student.roll_number?.toLowerCase().includes(search) ||
      student.department?.toLowerCase().includes(search) ||
      student.section?.toLowerCase().includes(search)
    );
  });

  const getCollegeName = (collegeId: number | null) => {
    if (!collegeId) return "N/A";
    const college = colleges.find(c => c.id === collegeId);
    return college ? `${college.name} (${college.code})` : `College ID: ${collegeId}`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Roll Number', 'Department', 'Section', 'Year', 'College', 'Created At'];
    const rows = filteredStudents.map(s => [
      s.id,
      s.full_name || '',
      s.email,
      s.roll_number || '',
      s.department || '',
      s.section || '',
      s.present_year || '',
      getCollegeName(s.college_id),
      new Date(s.created_at).toLocaleDateString()
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">All Students Database</h1>
            <p className="text-muted-foreground">
              View and manage all students across all colleges
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllStudents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Database Info & Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all colleges</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Colleges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byCollege).length}</div>
            <p className="text-xs text-muted-foreground">With students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byDepartment).length}</div>
            <p className="text-xs text-muted-foreground">Unique departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono text-muted-foreground">SQLite</div>
            <p className="text-xs text-muted-foreground">backend/elevate_edu.db</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, roll number, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Filter by College</label>
              <Select 
                value={selectedCollege?.toString() || "all"} 
                onValueChange={(value) => setSelectedCollege(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map(college => (
                    <SelectItem key={college.id} value={college.id.toString()}>
                      {college.name} ({college.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students ({filteredStudents.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} of {stats.total} students
            {selectedCollege && ` in selected college`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading students from database...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">{student.id}</TableCell>
                      <TableCell className="font-medium">{student.full_name || "N/A"}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.roll_number || "N/A"}</TableCell>
                      <TableCell>{student.department || "N/A"}</TableCell>
                      <TableCell>{student.section || "N/A"}</TableCell>
                      <TableCell>
                        {student.present_year ? (
                          <Badge variant="outline">{formatYear(student.present_year)}</Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{getCollegeName(student.college_id)}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? "default" : "secondary"}>
                          {student.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

