import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Code2, FileQuestion, Calendar, BarChart3, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Student {
  id: number;
  email: string;
  full_name?: string;
  roll_number?: string;
  department?: string;
  section?: string;
  present_year?: string;
}

interface ProgressData {
  student: Student;
  coding_practice: {
    total_submissions: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
  quizzes: Array<{
    quiz_id: number;
    title: string;
    total_marks: number;
  }>;
  attendance: {
    total_classes: number;
    present: number;
    absent: number;
    percentage: number;
  };
  labs: {
    total_submissions: number;
    completed: number;
    in_progress: number;
  };
}

export default function StudentProgressView() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchProgress();
    }
  }, [studentId]);

  const fetchProgress = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const user = await apiClient.getCurrentUser();
      const data = await apiClient.getStudentProgress(user.id, parseInt(studentId));
      setProgress(data);
    } catch (error: any) {
      console.error("Error fetching student progress:", error);
      toast.error(error.message || "Failed to load student progress");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">Loading student progress...</div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="container py-8">
        <div className="text-center py-12 text-muted-foreground">
          Student progress not found
        </div>
      </div>
    );
  }

  const { student, coding_practice, quizzes, attendance, labs } = progress;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/faculty/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Student Progress</h1>
          <p className="text-muted-foreground">
            {student.full_name || student.email}
          </p>
        </div>
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{student.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{student.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roll Number</p>
              <p className="font-medium">{student.roll_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{student.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Section</p>
              <p className="font-medium">{student.section || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <Badge variant="secondary">{student.present_year || "N/A"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coding Practice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Coding Practice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{coding_practice.total_submissions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Accepted
              </p>
              <p className="text-2xl font-bold text-green-600">{coding_practice.accepted}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rejected
              </p>
              <p className="text-2xl font-bold text-red-600">{coding_practice.rejected}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-600">{coding_practice.pending}</p>
            </div>
          </div>
          {coding_practice.total_submissions > 0 && (
            <div className="mt-4">
              <Progress
                value={(coding_practice.accepted / coding_practice.total_submissions) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Success Rate:{" "}
                {((coding_practice.accepted / coding_practice.total_submissions) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Classes</p>
              <p className="text-2xl font-bold">{attendance.total_classes}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Present
              </p>
              <p className="text-2xl font-bold text-green-600">{attendance.present}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Absent
              </p>
              <p className="text-2xl font-bold text-red-600">{attendance.absent}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendance %</p>
              <p className="text-2xl font-bold">{attendance.percentage.toFixed(1)}%</p>
            </div>
          </div>
          {attendance.total_classes > 0 && (
            <div className="mt-4">
              <Progress value={attendance.percentage} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Lab Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{labs.total_submissions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Completed
              </p>
              <p className="text-2xl font-bold text-green-600">{labs.completed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                In Progress
              </p>
              <p className="text-2xl font-bold text-yellow-600">{labs.in_progress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quizzes.map((quiz) => (
                <div key={quiz.quiz_id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Marks: {quiz.total_marks}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

