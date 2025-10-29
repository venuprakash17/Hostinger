import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck, UserX, Calendar as CalendarIcon } from "lucide-react";
import { ExcelImport } from "@/components/ExcelImport";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
  full_name: string;
  email: string;
  roll_number: string;
}

interface Assignment {
  id: string;
  section_id: string;
  subject: string;
  sections?: {
    name: string;
    year: number;
    semester: number;
    departments?: { name: string };
  };
}

export default function ManageAttendance() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacultyAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      fetchSectionStudents();
    }
  }, [selectedAssignment]);

  const fetchFacultyAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("faculty_sections")
      .select(`
        *,
        sections (
          name,
          year,
          semester,
          departments (name)
        )
      `)
      .eq("faculty_id", user.id);

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setAssignments(data);
      if (data.length > 0) {
        setSelectedAssignment(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchSectionStudents = async () => {
    const assignment = assignments.find(a => a.id === selectedAssignment);
    if (!assignment) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, roll_number")
      .eq("section", assignment.section_id)
      .order("roll_number");

    if (error) {
      toast.error(error.message);
    } else {
      setStudents(data || []);
      const initialAttendance: Record<string, string> = {};
      data?.forEach(student => {
        initialAttendance[student.id] = "present";
      });
      setAttendance(initialAttendance);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) {
      toast.error("Please select a class assignment");
      return;
    }

    const assignment = assignments.find(a => a.id === selectedAssignment);
    if (!assignment) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      subject: assignment.subject,
      date,
      status,
      section_id: assignment.section_id,
      marked_by: user?.id
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRecords, {
        onConflict: "student_id, subject, date, section_id"
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Attendance marked successfully");
    }
  };

  const handleExcelImport = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const assignment = assignments.find(a => a.id === selectedAssignment);
    
    const records = data.map(row => ({
      student_id: row.student_id || row.StudentID,
      subject: assignment?.subject || row.subject || row.Subject,
      date: row.date || row.Date,
      status: row.status || row.Status || 'present',
      section_id: assignment?.section_id,
      marked_by: user?.id
    })).filter(record => record.student_id && record.subject && record.date);

    if (records.length === 0) {
      throw new Error("No valid records found in Excel file");
    }

    const { error } = await supabase
      .from("attendance")
      .upsert(records);

    if (error) throw error;
  };

  const markAll = (status: string) => {
    const newAttendance: Record<string, string> = {};
    students.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present"
    }));
  };

  const currentAssignment = assignments.find(a => a.id === selectedAssignment);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Take attendance for your assigned classes</p>
        </div>
      </div>

      <ExcelImport
        onImport={handleExcelImport}
        templateColumns={['student_id', 'subject', 'date', 'status']}
        title="Import Attendance from Excel"
        description="Upload attendance records in bulk using Excel"
      />

      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>Select class and date for attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map(assignment => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.sections?.departments?.name} - Section {assignment.sections?.name} - {assignment.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {currentAssignment && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Subject:</strong> {currentAssignment.subject}</p>
              <p className="text-sm"><strong>Section:</strong> {currentAssignment.sections?.name}</p>
              <p className="text-sm"><strong>Year:</strong> {currentAssignment.sections?.year}, Semester {currentAssignment.sections?.semester}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll("present")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Mark All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
              <UserX className="mr-2 h-4 w-4" />
              Mark All Absent
            </Button>
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.roll_number}</TableCell>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        attendance[student.id] === "present" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {attendance[student.id] === "present" ? "Present" : "Absent"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAttendance(student.id)}
                      >
                        Toggle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSubmit} size="lg">
                Submit Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {students.length === 0 && !loading && selectedAssignment && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No students found in this section
          </CardContent>
        </Card>
      )}
    </div>
  );
}
