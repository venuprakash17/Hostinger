import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Users, Upload, Edit, Search, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileUpload } from "@/components/ui/file-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/integrations/api/client";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface User {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  section: string | null;
  roll_number: string | null;
  staff_id: string | null;
  college_id: number | null;
  present_year?: string | null;
  roles: Array<{ role: string; college_id: number | null }>;
  handled_years?: string[] | null;
  handled_sections?: string[] | null;
}

export default function ManageUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "hod" | "faculty" | "student">("faculty");
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [colleges, setColleges] = useState<Array<{id: number; name: string; code: string}>>([]);
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Edit functionality state
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    department: "",
    section: "",
    roll_number: "",
    staff_id: "",
    college_id: null as number | null,
    role: "",
    present_year: "",
    subject_assignments: [] as Array<{ subject_id: number; semester_id?: number; section?: string; section_id?: number }>,
    handled_years: [] as string[],
    handled_sections: [] as string[],
  });
  
  // For subject assignments (faculty)
  const [subjects, setSubjects] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  
  // Check if current role is a staff role
  const isStaffRole = role === 'faculty' || role === 'hod' || role === 'admin' || role === 'super_admin';

  useEffect(() => {
    fetchColleges();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedCollegeFilter !== null) {
      fetchUsers();
    }
  }, [selectedCollegeFilter]);

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<Array<{id: number; name: string; code: string}>>('/colleges');
      setColleges(data || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
      toast.error('Failed to fetch colleges');
    }
  };

  const fetchUsers = async () => {
    try {
      let endpoint = '/users';
      if (selectedCollegeFilter !== null) {
        endpoint = `/users?college_id=${selectedCollegeFilter}`;
      }
      const data = await apiClient.get<User[]>(endpoint);
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to fetch users');
    }
  };

  const fetchDepartmentsForCollege = async (collegeId: number) => {
    try {
      const data = await apiClient.get<any[]>(`/colleges/${collegeId}/departments`);
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSections = async (collegeId: number) => {
    try {
      const data = await apiClient.get<any[]>(`/colleges/${collegeId}/sections`);
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await apiClient.get<any[]>('/subjects');
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSemesters = async () => {
    try {
      const data = await apiClient.get<any[]>('/semesters');
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };

  const handleOpenEditDialog = async (user: User) => {
    setSelectedUser(user);

    // Fetch departments and sections for the user's college (or all colleges if no college)
    if (user.college_id) {
      await fetchDepartmentsForCollege(user.college_id);
      await fetchSections(user.college_id);
    } else {
      // If user has no college, fetch departments/sections for first college or all
      if (colleges.length > 0) {
        await fetchDepartmentsForCollege(colleges[0].id);
        await fetchSections(colleges[0].id);
      }
    }
    
    // Fetch subjects and semesters
    await fetchSubjects();
    await fetchSemesters();
    
    // Fetch subject assignments if user is faculty
    let subjectAssignments = [];
    if (user.roles.some(r => r.role === 'faculty')) {
      try {
        const assignments = await apiClient.getSubjectAssignments(user.id);
        subjectAssignments = (assignments || []).map((a: any) => ({
          subject_id: a.subject_id,
          semester_id: a.semester_id,
          section: a.section,
          section_id: a.section_id,
        }));
      } catch (error) {
        console.error('Error fetching subject assignments:', error);
      }
    }
    
    // Get handled_years and handled_sections from user object
    const handledYears = user.handled_years || [];
    const handledSections = user.handled_sections || [];
    
    // Get current role (primary role)
    const currentRole = user.roles[0]?.role || "";
    
    setEditFormData({
      full_name: user.full_name || "",
      department: user.department || "",
      section: user.section || "",
      roll_number: user.roll_number || "",
      staff_id: user.staff_id || "",
      college_id: user.college_id,
      role: currentRole,
      present_year: user.present_year || "",
      subject_assignments: subjectAssignments,
      handled_years: handledYears,
      handled_sections: handledSections,
    });
    setEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    try {
      await apiClient.put(`/users/${selectedUser.id}`, editFormData);
      toast.success("User updated successfully!");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const sectionNameOptions = useMemo(() => {
    const names = new Set<string>();
    sections.forEach((section: any) => {
      if (section?.name) {
        names.add(section.name);
      }
    });
    return Array.from(names).sort();
  }, [sections]);

  const getFilteredSections = (assignment: { subject_id?: number; semester_id?: number }) => {
    if (!assignment.subject_id) {
      return [];
    }

    const subject = subjects.find(s => s.id === assignment.subject_id);
    if (!subject) {
      return [];
    }

    if (!subject.department_id) {
      return sections;
    }

    let filtered = sections.filter((section: any) => 
      section.department_id === subject.department_id
    );

    if (assignment.semester_id) {
      filtered = filtered.filter((section: any) => 
        !section.semester_id || section.semester_id === assignment.semester_id
      );
    }

    return filtered;
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.staff_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation: For staff roles, either staff_id or email must be provided
    // For non-staff roles, email is required
    if (isStaffRole) {
      if (!staffId && !email) {
        toast.error("Either Staff ID or Email is required for staff roles");
        setLoading(false);
        return;
      }
    } else {
      if (!email) {
        toast.error("Email is required");
        setLoading(false);
        return;
      }
    }

    if (!fullName) {
      toast.error("Full name is required");
      setLoading(false);
      return;
    }

    // For staff roles with staff_id, password is not required (will be set to staff_id)
    if (!isStaffRole || !staffId) {
      if (!password) {
        toast.error("Password is required");
        setLoading(false);
        return;
      }
    }

    try {
      const payload: any = {
        full_name: fullName,
        role,
        department: department || undefined,
        section: role === 'student' ? section || undefined : undefined,
        roll_number: role === 'student' ? rollNumber || undefined : undefined,
        present_year: role === 'student' ? undefined : undefined,
      };

      // Add email only if provided (not required for staff with staff_id)
      if (email) {
        payload.email = email;
      }

      // Add password only if provided (not required for staff with staff_id)
      if (password) {
        payload.password = password;
      }

      // Add staff_id for staff roles
      if (isStaffRole && staffId) {
        payload.staff_id = staffId;
      }

      // Build endpoint with college_id if provided
      let endpoint = '/users';
      if (collegeId) {
        endpoint = `/users?college_id=${collegeId}`;
      }

      await apiClient.post(endpoint, payload);
      const successMessage = staffId 
        ? `${role === 'hod' ? 'HOD' : role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'College Admin' : role.charAt(0).toUpperCase() + role.slice(1)} created successfully! Login ID: ${staffId}@staff.elevate.edu, Password: ${staffId}`
        : `${role === 'hod' ? 'HOD' : role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'College Admin' : role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`;
      toast.success(successMessage);
      
      // Clear form
      setEmail("");
      setPassword("");
      setFullName("");
      setCollegeId(null);
      setDepartment("");
      setSection("");
      setRollNumber("");
      setStaffId("");
      setRole("faculty");
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Edit className="h-4 w-4 mr-2" />
            Manage Users
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
                Add any user type for any college. Select college when creating admin, HOD, faculty, or students.
              </CardDescription>
            </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Quick Start Guide</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Staff ID:</strong> For faculty/HOD/admin, you can use Staff ID for easy login (ID as both username and password)</li>
                <li><strong>College:</strong> Required for admin and students, optional for HOD/faculty</li>
                <li><strong>Department:</strong> Required for HOD (one HOD per department), optional for faculty/students</li>
                <li><strong>Subject Assignments:</strong> Add subjects for faculty members after creation</li>
              </ul>
            </AlertDescription>
          </Alert>
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

            {isStaffRole && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="staffId">
                    Staff ID <span className="text-muted-foreground">(Recommended for easy login)</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>If Staff ID is provided, the user can login using their Staff ID as both username and password. Email will be auto-generated.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="staffId"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g., STAFF001, HOD001, ADMIN001"
                  className={staffId ? "border-green-500" : ""}
                />
                {staffId && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                      Login credentials: <strong>{staffId}</strong> / <strong>{staffId}</strong> (Email: {staffId}@staff.elevate.edu)
                    </AlertDescription>
                  </Alert>
                )}
                {!staffId && (
                  <p className="text-sm text-muted-foreground">
                    Leave empty to use custom email and password instead.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email {isStaffRole && !staffId ? '(Required if Staff ID not provided)' : isStaffRole ? '(Optional if Staff ID provided)' : '(Required)'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@college.edu"
                required={!isStaffRole || !staffId}
                disabled={isStaffRole && !!staffId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {isStaffRole && staffId ? '(Optional - will be set to Staff ID if not provided)' : '(Required)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required={!isStaffRole || !staffId}
                minLength={6}
                disabled={isStaffRole && !!staffId}
              />
              {isStaffRole && staffId && (
                <p className="text-sm text-muted-foreground">
                  Password will be automatically set to: {staffId}
                </p>
              )}
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
                  <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                  <SelectItem value="admin">College Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(role === 'admin' || role === 'hod' || role === 'faculty' || role === 'student') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="college">
                    College {role === 'admin' ? '(Required)' : role === 'student' ? '(Required)' : '(Optional)'}
                  </Label>
                  {(role === 'admin' || role === 'student') && !collegeId && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <Select 
                  value={collegeId?.toString() || ""} 
                  onValueChange={(value) => setCollegeId(value ? parseInt(value) : null)}
                >
                  <SelectTrigger id="college" className={((role === 'admin' || role === 'student') && !collegeId) ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map(college => (
                      <SelectItem key={college.id} value={college.id.toString()}>
                        {college.name} ({college.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!colleges.length && (
                  <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                      No colleges found. Please create a college first from the Colleges section.
                    </AlertDescription>
                  </Alert>
                )}
                {(role === 'admin' || role === 'student') && !collegeId && colleges.length > 0 && (
                  <p className="text-sm text-destructive">College selection is required for {role === 'admin' ? 'admin' : 'student'} users.</p>
                )}
              </div>
            )}

            {(role === 'student' || role === 'hod' || role === 'faculty') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="department">
                    Department {role === 'hod' ? '(Required - one HOD per department)' : '(Optional)'}
                  </Label>
                  {role === 'hod' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Each department can have only one HOD. If you assign a new HOD to a department that already has one, the previous HOD will be replaced.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Computer Science, Electronics, Mechanical"
                  required={role === 'hod'}
                  className={role === 'hod' && !department ? "border-destructive" : ""}
                />
                {role === 'hod' && !department && (
                  <p className="text-sm text-destructive">Department is required for HOD users.</p>
                )}
              </div>
            )}

            {role === 'student' && (
              <>
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
              <FileUpload
                endpoint="/bulk-upload/students"
                accept=".csv,.xlsx,.xls"
                label="Upload Students CSV/Excel"
                description={selectedCollegeFilter ? `Upload a CSV file to bulk add students to ${colleges.find(c => c.id === selectedCollegeFilter)?.name || 'selected college'}.` : "Upload a CSV file to bulk add students. Please select a college from the filter above first, or the upload will fail."}
                templateUrl="/bulk-upload/template/students"
                templateFileName="student_upload_template.csv"
                queryParams={selectedCollegeFilter ? { college_id: selectedCollegeFilter } : undefined}
                disabled={!selectedCollegeFilter}
                onSuccess={(result) => {
                  toast.success(`Successfully imported ${result.success_count} students!`);
                  fetchUsers();
                }}
              />
              {!selectedCollegeFilter && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Please select a college from the filter above before uploading students.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Manage Users
              </CardTitle>
              <CardDescription>
                Edit any user in the system across all colleges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email, name, roll number, staff ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select 
                    value={selectedCollegeFilter?.toString() || "all"} 
                    onValueChange={(value) => setSelectedCollegeFilter(value === "all" ? null : parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by college" />
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

                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No users found matching your search" : "No users found. Create users first."}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Staff ID</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || "N/A"}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {user.roles[0]?.role || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || "N/A"}</TableCell>
                            <TableCell>{user.staff_id || "N/A"}</TableCell>
                            <TableCell>{user.roll_number || "N/A"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditDialog(user)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit User Details</DialogTitle>
            <DialogDescription>
              Update information for {selectedUser?.email}
              {selectedUser?.roles.some(r => r.role === 'hod') && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  (HOD - Head of Department)
                </span>
              )}
              {selectedUser?.roles.some(r => r.role === 'faculty') && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  (Faculty Member)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                value={selectedUser?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_role">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger id="edit_role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                  <SelectItem value="admin">College Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_college_id">College</Label>
              <Select
                value={editFormData.college_id?.toString() || "none"}
                onValueChange={async (value) => {
                  const newCollegeId = value === "none" ? null : parseInt(value);
                  setEditFormData({
                    ...editFormData,
                    college_id: newCollegeId,
                    department: "", // Clear department when college changes
                  });
                  // Reload departments and sections for the new college
                  if (newCollegeId) {
                    await fetchDepartmentsForCollege(newCollegeId);
                    await fetchSections(newCollegeId);
                  } else {
                    setDepartments([]);
                    setSections([]);
                  }
                }}
              >
                <SelectTrigger id="edit_college_id">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No College</SelectItem>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id.toString()}>
                      {college.name} ({college.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (selectedUser.roles.some(r => r.role === 'faculty') || selectedUser.roles.some(r => r.role === 'hod') || selectedUser.roles.some(r => r.role === 'admin') || selectedUser.roles.some(r => r.role === 'super_admin')) && (
              <div className="space-y-2">
                <Label htmlFor="edit_staff_id">Staff ID</Label>
                <Input
                  id="edit_staff_id"
                  value={editFormData.staff_id}
                  onChange={(e) => setEditFormData({ ...editFormData, staff_id: e.target.value })}
                  placeholder="e.g., STAFF001"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit_present_year">Present Year</Label>
              <Select
                value={editFormData.present_year || "none"}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    present_year: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="edit_present_year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="1st">1st Year</SelectItem>
                  <SelectItem value="2nd">2nd Year</SelectItem>
                  <SelectItem value="3rd">3rd Year</SelectItem>
                  <SelectItem value="4th">4th Year</SelectItem>
                  <SelectItem value="5th">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_department">Department</Label>
              <Select
                value={editFormData.department || "none"}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    department: value === "none" ? "" : value,
                  })
                }
                disabled={!editFormData.college_id}
              >
                <SelectTrigger id="edit_department">
                  <SelectValue placeholder={editFormData.college_id ? "Select department" : "Select college first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select later</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem
                      key={dept.id}
                      value={dept.code || dept.name}
                    >
                      {dept.name}
                      {dept.code ? ` (${dept.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editFormData.college_id && (
                <p className="text-xs text-muted-foreground">Select a college first to see departments</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_section">Section</Label>
              <Input
                id="edit_section"
                value={editFormData.section}
                onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                placeholder="A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_roll_number">Roll Number</Label>
              <Input
                id="edit_roll_number"
                value={editFormData.roll_number}
                onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                placeholder="21CS001"
              />
            </div>

            {selectedUser && (selectedUser.roles.some(r => r.role === 'faculty') || selectedUser.roles.some(r => r.role === 'hod')) && (
              <>
                <div className="space-y-2">
                  <Label>Years Handled</Label>
                  <div className="flex flex-wrap gap-2">
                    {['1st', '2nd', '3rd', '4th', '5th'].map((year) => (
                      <Button
                        key={year}
                        type="button"
                        variant={editFormData.handled_years.includes(year) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const updated = editFormData.handled_years.includes(year)
                            ? editFormData.handled_years.filter(y => y !== year)
                            : [...editFormData.handled_years, year];
                          setEditFormData({ ...editFormData, handled_years: updated });
                        }}
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                </div>

                {sectionNameOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sections Handled</Label>
                    <div className="flex flex-wrap gap-2">
                      {sectionNameOptions.map((sec) => (
                        <Button
                          key={sec}
                          type="button"
                          variant={editFormData.handled_sections.includes(sec) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updated = editFormData.handled_sections.includes(sec)
                              ? editFormData.handled_sections.filter(s => s !== sec)
                              : [...editFormData.handled_sections, sec];
                            setEditFormData({ ...editFormData, handled_sections: updated });
                          }}
                        >
                          {sec}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedUser && selectedUser.roles.some(r => r.role === 'faculty') && (
              <div className="space-y-4 border p-4 rounded-lg">
                <Label>Subject Assignments</Label>
                {editFormData.subject_assignments.map((assignment, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Subject</Label>
                      <Select
                        value={assignment.subject_id?.toString() || ""}
                        onValueChange={(value) => {
                          const updated = [...editFormData.subject_assignments];
                          updated[index].subject_id = parseInt(value);
                          if (updated[index].section_id) {
                            const filteredSections = getFilteredSections(updated[index]);
                            const currentSection = filteredSections.find((s: any) => s.id === updated[index].section_id);
                            if (!currentSection) {
                              updated[index].section_id = undefined;
                              updated[index].section = "";
                            }
                          }
                          setEditFormData({ ...editFormData, subject_assignments: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name} {subject.code ? `(${subject.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Semester</Label>
                      <Select
                        value={assignment.semester_id?.toString() || "none"}
                        onValueChange={(value) => {
                          const updated = [...editFormData.subject_assignments];
                          updated[index].semester_id = value && value !== "none" ? parseInt(value) : undefined;
                          if (updated[index].section_id) {
                            const filteredSections = getFilteredSections(updated[index]);
                            const currentSection = filteredSections.find((s: any) => s.id === updated[index].section_id);
                            if (!currentSection) {
                              updated[index].section_id = undefined;
                              updated[index].section = "";
                            }
                          }
                          setEditFormData({ ...editFormData, subject_assignments: updated });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {semesters.map((semester) => (
                            <SelectItem key={semester.id} value={semester.id.toString()}>
                              {semester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Section</Label>
                      <Select
                        value={assignment.section_id?.toString() || "none"}
                        onValueChange={(value) => {
                          const updated = [...editFormData.subject_assignments];
                          if (value && value !== "none") {
                            const sectionObj = sections.find((section: any) => section.id.toString() === value);
                            updated[index].section_id = parseInt(value, 10);
                            updated[index].section = sectionObj?.name || "";
                          } else {
                            updated[index].section_id = undefined;
                            updated[index].section = "";
                          }
                          setEditFormData({ ...editFormData, subject_assignments: updated });
                        }}
                        disabled={!assignment.subject_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={assignment.subject_id ? "Select Section" : "Select subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {getFilteredSections(assignment).length > 0 ? (
                            getFilteredSections(assignment).map((section: any) => (
                              <SelectItem key={section.id} value={section.id.toString()}>
                                {section.name}
                                {section.year ? ` (Year ${section.year})` : ''}
                                {section.department_name ? ` - ${section.department_name}` : ''}
                                {section.semester_name ? ` - ${section.semester_name}` : ''}
                              </SelectItem>
                            ))
                          ) : assignment.subject_id ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No sections available for this subject
                            </div>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditFormData({ 
                        ...editFormData, 
                        subject_assignments: editFormData.subject_assignments.filter((_, i) => i !== index)
                      })}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFormData({ 
                    ...editFormData, 
                    subject_assignments: [...editFormData.subject_assignments, { subject_id: 0, section: "", section_id: undefined }]
                  })}
                >
                  + Add Subject Assignment
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
