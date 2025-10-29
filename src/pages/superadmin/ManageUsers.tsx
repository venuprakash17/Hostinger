import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Users, Upload } from "lucide-react";
import { ExcelImport } from "@/components/ExcelImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManageUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "faculty" | "student">("faculty");
  const [collegeId, setCollegeId] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    const { data } = await supabase.from('colleges').select('*').order('name');
    if (data) setColleges(data);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { email, password, fullName, role }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${role.replace('_', ' ')} account created successfully!`);
        setEmail("");
        setPassword("");
        setFullName("");
        setCollegeId("");
        setDepartment("");
        setSection("");
        setRollNumber("");
        setRole("faculty");
      } else {
        throw new Error(data.error || "Failed to create user");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async (data: any[]) => {
    if (data.length === 0) {
      toast.error("No data to import");
      return;
    }

    setLoading(true);
    try {
      const users = data.map(row => ({
        email: row.email || row.Email,
        password: row.password || row.Password,
        full_name: row.full_name || row['Full Name'] || row.name || row.Name,
        role: (row.role || row.Role || 'student').toLowerCase(),
        college_id: row.college_id || row['College ID'] || null,
        department: row.department || row.Department || null,
        section: row.section || row.Section || null,
        roll_number: row.roll_number || row['Roll Number'] || null,
      }));

      const { data: result, error } = await supabase.functions.invoke('bulk-create-users', {
        body: { users }
      });

      if (error) throw error;

      if (result.success) {
        const { summary, results } = result;
        toast.success(`Created ${summary.successful} users successfully!`);
        
        if (summary.failed > 0) {
          console.error('Failed users:', results.failed);
          toast.error(`${summary.failed} users failed. Check console for details.`);
        }
      } else {
        throw new Error(result.error || "Failed to bulk create users");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create and manage all user accounts across colleges</p>
        </div>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">
            <UserPlus className="h-4 w-4 mr-2" />
            Single User
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
              <CardDescription>
                Add students, faculty, college admins, or super admins
              </CardDescription>
            </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@college.edu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">College Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College (Optional)</Label>
              <Select value={collegeId} onValueChange={setCollegeId}>
                <SelectTrigger id="college">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map(college => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role === 'student' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Computer Science"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g., A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g., 21CS001"
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Import Users
              </CardTitle>
              <CardDescription>
                Upload an Excel file to create multiple users at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelImport
                onImport={handleBulkImport}
                templateColumns={[
                  'email',
                  'password',
                  'full_name',
                  'role',
                  'college_id',
                  'department',
                  'section',
                  'roll_number'
                ]}
                title="Upload Users Excel File"
                description="The Excel file should contain columns: email, password, full_name, role (student/faculty/admin/super_admin), and optional: college_id, department, section, roll_number"
              />

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Column Guidelines:</h4>
                <ul className="text-sm space-y-1">
                  <li><strong>email:</strong> User's email address (required)</li>
                  <li><strong>password:</strong> User's password (required, min 6 chars)</li>
                  <li><strong>full_name:</strong> User's full name (required)</li>
                  <li><strong>role:</strong> student/faculty/admin/super_admin (required)</li>
                  <li><strong>college_id:</strong> UUID of college (optional)</li>
                  <li><strong>department:</strong> For students (optional)</li>
                  <li><strong>section:</strong> For students (optional)</li>
                  <li><strong>roll_number:</strong> For students (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Role Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Super Admin:</strong> Manages multiple colleges, creates all users, full system access</p>
          <p><strong>College Admin:</strong> Manages a single college, can manage departments, faculty, and students</p>
          <p><strong>HOD:</strong> Manages their department, assigns faculty, manages sections</p>
          <p><strong>Faculty:</strong> Manages assigned classes, takes attendance, creates quizzes and assignments</p>
          <p><strong>Student:</strong> Attends classes, takes quizzes, views their data</p>
        </CardContent>
      </Card>
    </div>
  );
}
