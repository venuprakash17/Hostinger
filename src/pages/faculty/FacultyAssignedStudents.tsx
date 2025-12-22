import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Search, Eye, BarChart3 } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: number;
  email: string;
  full_name?: string;
  roll_number?: string;
  department?: string;
  section?: string;
  section_id?: number;
  section_display_name?: string;
  present_year?: string;
  college_id?: number;
}

interface Section {
  id: number;
  name: string;
  display_name?: string;
  department_id: number;
  year?: number;
  year_str?: string;
}

export default function FacultyAssignedStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  useEffect(() => {
    fetchAssignedStudents();
  }, []);

  const fetchAssignedStudents = async () => {
    setLoading(true);
    try {
      // Get current user ID
      const profile = await apiClient.getCurrentUserProfile();
      const user = await apiClient.getCurrentUser();
      
      const data = await apiClient.getFacultyAssignedStudents(user.id);
      setStudents(data.students || []);
      setSections(data.sections || []);
    } catch (error: any) {
      console.error("Error fetching assigned students:", error);
      toast.error(error.message || "Failed to load assigned students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSection = !selectedSectionId || student.section_id === selectedSectionId;
    
    return matchesSearch && matchesSection;
  });

  const handleViewProgress = (studentId: number) => {
    const user = apiClient.getCurrentUser();
    user.then((u) => {
      navigate(`/faculty/students/${studentId}/progress`);
    });
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">My Assigned Students</h1>
          <p className="text-muted-foreground">
            View and manage students from your assigned sections
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.length}</div>
            <p className="text-sm text-muted-foreground">Across all sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigned Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sections.length}</div>
            <p className="text-sm text-muted-foreground">Sections you manage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredStudents.length}</div>
            <p className="text-sm text-muted-foreground">Currently visible</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Students from your assigned sections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-64">
              <select
                value={selectedSectionId || ""}
                onChange={(e) => setSelectedSectionId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.display_name || section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {students.length === 0
                ? "No students assigned to your sections yet"
                : "No students match your search criteria"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.roll_number || "N/A"}</TableCell>
                    <TableCell>{student.department || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.section_display_name || student.section || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{student.present_year || "N/A"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProgress(student.id)}
                        className="gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        View Progress
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

