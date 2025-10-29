import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, UserCheck, UserX, Clock } from "lucide-react";
import { ExcelImport } from "@/components/ExcelImport";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

export default function ManageAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStudents(data || []);
      const initialAttendance: Record<string, string> = {};
      data?.forEach(student => {
        initialAttendance[student.id] = "present";
      });
      setAttendance(initialAttendance);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!subject) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
      student_id: studentId,
      subject,
      date,
      status,
      marked_by: user?.id
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRecords, {
        onConflict: "student_id,subject,date"
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Attendance marked successfully" });
    }
  };

  const handleExcelImport = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Map Excel data to attendance records
    const records = data.map(row => ({
      student_id: row.student_id || row.StudentID,
      subject: row.subject || row.Subject,
      date: row.date || row.Date,
      status: row.status || row.Status || 'present',
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Mark Attendance</h1>

      <ExcelImport
        onImport={handleExcelImport}
        templateColumns={['student_id', 'subject', 'date', 'status']}
        title="Import Attendance from Excel"
        description="Upload attendance records in bulk using Excel"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject name"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student List</CardTitle>
          <Button onClick={handleSubmit}>Submit Attendance</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading students...</p>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground">No students found</p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{student.full_name || student.email}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                  <Select
                    value={attendance[student.id]}
                    onValueChange={(value) => setAttendance({ ...attendance, [student.id]: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          Present
                        </span>
                      </SelectItem>
                      <SelectItem value="absent">
                        <span className="flex items-center gap-2">
                          <UserX className="h-4 w-4 text-red-500" />
                          Absent
                        </span>
                      </SelectItem>
                      <SelectItem value="late">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          Late
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
