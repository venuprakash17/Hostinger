import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Users, Upload, Edit, Trash2, Search, User, Mail, Building2, GraduationCap, BookOpen, Calendar, Hash, X, Plus, AlertCircle, Loader2 } from "lucide-react";
import { ExcelImport } from "@/components/ExcelImport";
import { FileUpload } from "@/components/ui/file-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DepartmentOption {
  id: number;
  name: string;
  code: string | null;
}

interface User {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  section: string | null;
  roll_number: string | null;
  college_id: number | null;
  roles: Array<{ role: string; college_id: number | null }>;
  handled_years?: string[] | null;
  handled_sections?: string[] | null;
}

export default function ManageUsers() {
  const { isSuperAdmin, isAdmin, isHOD, loading: roleLoading, userRoles } = useUserRole();
  
  // Debug logging
  useEffect(() => {
    console.log('[ManageUsers] Role Debug:', {
      isSuperAdmin,
      isAdmin,
      roleLoading,
      userRoles,
      rolesCount: userRoles?.length
    });
  }, [isSuperAdmin, isAdmin, roleLoading, userRoles]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"faculty" | "hod" | "admin">("faculty");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    department: "",
    section: "",
    roll_number: "",
    subject_assignments: [] as Array<{ subject_id: number; semester_id?: number }>,
    handled_years: [] as string[],
    handled_sections: [] as string[],
  });
  
  // For subject assignments (faculty)
  const [subjects, setSubjects] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ subject_id: number; semester_id?: number }>>([]);
  const [handledYears, setHandledYears] = useState<string[]>([]);
  const [handledSections, setHandledSections] = useState<string[]>([]);
  const [reassignToFacultyId, setReassignToFacultyId] = useState<number | null>(null);
  const [reassignOptions, setReassignOptions] = useState({
    reassign_coding_problems: true,
    reassign_quizzes: true,
    reassign_labs: true,
    reassign_lab_problems: true,
  });
  const [reassigning, setReassigning] = useState(false);
  const sectionNameOptions = useMemo(() => {
    const names = new Set<string>();
    sections.forEach((section: any) => {
      if (section?.name) {
        names.add(section.name);
      }
    });
    return Array.from(names).sort();
  }, [sections]);

  // Memoize filtered users for better performance - MUST be at component top level
  const filteredUsers = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    return users.filter(user => 
      !debouncedSearchTerm || 
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name?.toLowerCase().includes(searchLower)) ||
      (user.roll_number?.toLowerCase().includes(searchLower))
    );
  }, [users, debouncedSearchTerm]);

  // Helper function to get filtered sections for a subject assignment
  const getFilteredSections = (assignment: { subject_id?: number; semester_id?: number }) => {
    if (!assignment.subject_id) {
      return []; // Don't show sections until subject is selected
    }

    const subject = subjects.find(s => s.id === assignment.subject_id);
    if (!subject) {
      return []; // Don't show sections if subject not found
    }

    // If subject has no department_id, show all sections (backward compatibility)
    if (!subject.department_id) {
      console.warn('Subject has no department_id:', subject);
      return sections;
    }

    // Filter sections by department
    let filtered = sections.filter((section: any) => 
      section.department_id === subject.department_id
    );

    // Further filter by semester if provided
    if (assignment.semester_id) {
      filtered = filtered.filter((section: any) => 
        !section.semester_id || section.semester_id === assignment.semester_id
      );
    }

    return filtered;
  };

  useEffect(() => {
    if (!editDialogOpen || sections.length === 0) return;
    setEditFormData((prev) => ({
      ...prev,
      subject_assignments: prev.subject_assignments.map((assignment) => {
        if (!assignment.section_id && assignment.section) {
          const match = sections.find((section: any) => section.name === assignment.section);
          if (match) {
            return { ...assignment, section_id: match.id };
          }
        }
        return assignment;
      }),
    }));
  }, [sections, editDialogOpen]);

  useEffect(() => {
    fetchUserProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
  }, [isSuperAdmin]);

useEffect(() => {
  if (isSuperAdmin && selectedCollegeId) {
    fetchDepartmentsForCollege(selectedCollegeId);
    fetchSections(selectedCollegeId);
    fetchSemesters();
    fetchSubjects();
  }
}, [isSuperAdmin, selectedCollegeId]);

  useEffect(() => {
    if (collegeId) {
      fetchDepartmentsForCollege(collegeId);
      fetchSemesters();
      fetchSubjects();
      fetchSections();
      fetchUsers();
    } else if (isSuperAdmin) {
      // Super admin can fetch all users even without collegeId
      fetchUsers();
    }
  }, [collegeId, isSuperAdmin]);
  
  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<any[]>('/colleges');
      setColleges(data || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };
  
  const fetchDepartmentsForCollege = async (targetCollegeId?: number | null) => {
    try {
      const data = await apiClient.getDepartments(targetCollegeId || undefined);
      setDepartments((data || []).map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || null,
      })));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };
  
  const fetchSemesters = async (targetCollegeId?: number | null) => {
    try {
      const idToUse = targetCollegeId ?? (isSuperAdmin ? selectedCollegeId : collegeId);
      const data = await apiClient.getSemesters(idToUse || undefined);
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };
  
  const fetchSubjects = async (targetCollegeId?: number | null) => {
    try {
      const idToUse = targetCollegeId ?? (isSuperAdmin ? selectedCollegeId : collegeId);
      const matchingDept = department
        ? departments.find(d => d.code === department || d.name === department)
        : undefined;
      const data = await apiClient.getSubjects(
        idToUse || undefined,
        matchingDept ? matchingDept.id : undefined
      );
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSections = async (targetCollegeId?: number | null) => {
    try {
      const idToUse = targetCollegeId ?? (isSuperAdmin ? selectedCollegeId : collegeId);
      const data = await apiClient.getSections(idToUse || undefined);
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  useEffect(() => {
    if (department) {
      fetchSubjects();
    }
  }, [department]);

  const fetchUserProfile = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      console.log('[ManageUsers] User profile:', profile);
      if (profile.college_id) {
        console.log('[ManageUsers] Setting collegeId to:', profile.college_id);
        setCollegeId(profile.college_id);
      } else {
        console.warn('[ManageUsers] No college_id in profile - admin may not be associated with a college');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      if (!collegeId && !isSuperAdmin && !isHOD) {
        setUsers([]);
        return;
      }
      
      // Fetch users for the college/department
      const params = new URLSearchParams();
      if (collegeId && !isSuperAdmin && !isHOD) {
        params.append('college_id', collegeId.toString());
      }
      // For HOD, backend automatically filters by department and role (students/faculty only)
      // No need to pass additional params - backend handles it
      
      const queryString = params.toString();
      const url = `/users${queryString ? `?${queryString}` : ''}`;
      console.log('[ManageUsers] Fetching users from:', url, 'collegeId:', collegeId, 'isHOD:', isHOD);
      const data = await apiClient.get<User[]>(url);
      console.log('[ManageUsers] Received users:', data?.length || 0, 'users');
      console.log('[ManageUsers] Users breakdown:', {
        total: data?.length || 0,
        hod: data?.filter(u => u.roles.some(r => r.role === 'hod')).length || 0,
        faculty: data?.filter(u => u.roles.some(r => r.role === 'faculty')).length || 0,
        student: data?.filter(u => u.roles.some(r => r.role === 'student')).length || 0,
        admin: data?.filter(u => u.roles.some(r => r.role === 'admin')).length || 0,
      });
      
      // Additional frontend filtering for HOD (double-check)
      let filteredData = data || [];
      if (isHOD) {
        // HOD should only see students and faculty
        filteredData = filteredData.filter(u => 
          u.roles.some(r => r.role === 'student' || r.role === 'faculty')
        );
        console.log('[ManageUsers] HOD filtered users:', filteredData.length);
      }
      
      setUsers(filteredData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to fetch users');
    }
  };

  const handleOpenEditDialog = async (user: User) => {
    setSelectedUser(user);

    // Ensure branch list is loaded for this user's college (especially for super admin)
    if (user.college_id && (!collegeId || collegeId !== user.college_id)) {
      await fetchDepartmentsForCollege(user.college_id);
      await fetchSections(user.college_id);
    }
    
    // Fetch subject assignments if user is faculty
    let subjectAssignments = [];
    if (user.roles.some(r => r.role === 'faculty')) {
      try {
        const assignments = await apiClient.getSubjectAssignments(user.id);
        // Remove section_id and section - faculty now works at department level only
        subjectAssignments = (assignments || []).map((a: any) => ({
          subject_id: a.subject_id,
          semester_id: a.semester_id,
        }));
      } catch (error) {
        console.error('Error fetching subject assignments:', error);
      }
    }
    
    // Years Handled removed - college admin cannot set this
    
    setEditFormData({
      full_name: user.full_name || "",
      department: user.department || "",
      section: user.section || "",
      roll_number: user.roll_number || "",
      subject_assignments: subjectAssignments,
      handled_years: [], // Removed - college admin cannot set this
      handled_sections: [], // Removed - faculty works at department level only
    });
    // Reset reassign state when opening dialog
    setReassignToFacultyId(null);
    setReassignOptions({
      reassign_coding_problems: true,
      reassign_quizzes: true,
      reassign_labs: true,
      reassign_lab_problems: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    try {
      // Remove department from edit data if user is HOD (HOD cannot change department)
      const dataToSend = { ...editFormData };
      if (selectedUser.roles.some(r => r.role === 'hod')) {
        delete dataToSend.department;
      }
      
      await apiClient.put(`/users/${selectedUser.id}`, dataToSend);
      toast.success("User updated successfully!");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleReassignFacultyData = async () => {
    if (!selectedUser || !reassignToFacultyId) {
      toast.error("Please select a faculty member to reassign data to");
      return;
    }

    if (!confirm(`Are you sure you want to reassign all selected data from ${selectedUser.full_name || selectedUser.email} to the selected faculty? This action cannot be undone.`)) {
      return;
    }

    setReassigning(true);
    try {
      const result = await apiClient.reassignFacultyData({
        from_faculty_id: selectedUser.id,
        to_faculty_id: reassignToFacultyId,
        ...reassignOptions,
      });

      toast.success(
        `Successfully reassigned data! ` +
        `Coding Problems: ${result.reassigned_counts?.coding_problems || 0}, ` +
        `Quizzes: ${result.reassigned_counts?.quizzes || 0}, ` +
        `Labs: ${result.reassigned_counts?.labs || 0}, ` +
        `Lab Problems: ${result.reassigned_counts?.lab_problems || 0}`
      );
      
      setReassignToFacultyId(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to reassign faculty data");
    } finally {
      setReassigning(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !fullName) {
      toast.error("Email and full name are required");
      setLoading(false);
      return;
    }

    // Department is required for HOD
    if (role === 'hod' && !department) {
      toast.error("Department is required for HOD");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
          email, 
        full_name: fullName,
          role,
        department: department || undefined,
      };
      
      // For super admin creating admin, college_id is required
      if (isSuperAdmin && role === 'admin') {
        if (!selectedCollegeId) {
          toast.error("Please select a college for the admin");
          setLoading(false);
          return;
        }
        payload.college_id = selectedCollegeId;
      }
      
      // Add subject assignments for faculty
      if (role === 'faculty' && subjectAssignments.length > 0) {
        payload.subject_assignments = subjectAssignments;
      }
      
      // Years Handled removed - college admin cannot set this
      
      // Only include password if provided
      if (password) {
        payload.password = password;
      }

      await apiClient.post('/users', payload);
      toast.success(`${role === 'hod' ? 'HOD' : role === 'admin' ? 'College Admin' : 'Faculty'} created successfully!`);
      
      // Clear form
        setEmail("");
        setPassword("");
        setFullName("");
        setDepartment("");
        setSection("");
        setRollNumber("");
      setRole("faculty");
      setSubjectAssignments([]);
      setSelectedCollegeId(null);
      fetchUsers();
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
      // TODO: Add API endpoint for bulk import
      // For now, show placeholder
      toast.success(`Bulk import will be processed (API endpoint needed)`);
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
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? "Create and manage users across all colleges" 
              : isHOD
              ? "View and edit faculty and students in your department"
              : "Edit HOD, faculty, and students in your college. Only super admin can create new users."}
          </p>
        </div>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: isSuperAdmin ? '1fr 1fr 1fr' : '1fr' }}>
          {isSuperAdmin && (
            <>
          <TabsTrigger value="single">
            <UserPlus className="h-4 w-4 mr-2" />
                Create User
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="manage">
            <Edit className="h-4 w-4 mr-2" />
            Manage & Edit Users
          </TabsTrigger>
        </TabsList>

        {isSuperAdmin && (
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
              <CardDescription>
                Create new users for any college. Only super admin can create users.
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
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty to auto-generate from user ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    If left empty, password will be auto-generated from user ID in caps
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && <SelectItem value="admin">College Admin</SelectItem>}
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isSuperAdmin && role === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="college">College *</Label>
                    <Select value={selectedCollegeId?.toString() || ""} onValueChange={(value) => setSelectedCollegeId(parseInt(value))}>
                      <SelectTrigger id="college">
                        <SelectValue placeholder="Select a college" />
                      </SelectTrigger>
                      <SelectContent>
                        {colleges.map((college) => (
                          <SelectItem key={college.id} value={college.id.toString()}>
                            {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(role === 'hod' || role === 'faculty') && (
                  <div className="space-y-2">
                    <Label htmlFor="department">Branch / Department {role === 'hod' && <span className="text-red-500">*</span>}</Label>
                    <Select
                      value={department || "none"}
                      onValueChange={(value) => setDepartment(value === "none" ? "" : value)}
                      required={role === 'hod'}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder={role === 'hod' ? "Select department (required)" : "Select branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {role === 'hod' ? null : <SelectItem value="none">Select later</SelectItem>}
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
                    {role === 'hod' && (
                      <p className="text-xs text-muted-foreground">
                        HOD will be automatically assigned to this department. Department cannot be changed after creation.
                      </p>
                    )}
                  </div>
                )}

                {(role === 'hod' || role === 'faculty') && (
                  <>

                    {sectionNameOptions.length > 0 && (
                    <div className="space-y-2">
                        <Label>Sections Handled</Label>
                        <div className="flex flex-wrap gap-2">
                          {sectionNameOptions.map((sec) => (
                            <Button
                              key={sec}
                              type="button"
                              variant={handledSections.includes(sec) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (handledSections.includes(sec)) {
                                  setHandledSections(handledSections.filter(s => s !== sec));
                                } else {
                                  setHandledSections([...handledSections, sec]);
                                }
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

                {role === 'faculty' && (
                  <div className="space-y-4 border p-4 rounded-lg">
                    <Label>Subject Assignments</Label>
                    {subjectAssignments.map((assignment, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Subject</Label>
                          <Select
                            value={assignment.subject_id?.toString() || ""}
                            onValueChange={(value) => {
                              const updated = [...subjectAssignments];
                              updated[index].subject_id = parseInt(value);
                              // Clear section if it doesn't match the new subject's department
                              if (updated[index].section_id) {
                                const filteredSections = getFilteredSections(updated[index]);
                                const currentSection = filteredSections.find((s: any) => s.id === updated[index].section_id);
                                if (!currentSection) {
                                  updated[index].section_id = undefined;
                                  updated[index].section = "";
                                }
                              }
                              setSubjectAssignments(updated);
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
                              const updated = [...subjectAssignments];
                              updated[index].semester_id = value && value !== "none" ? parseInt(value) : undefined;
                              // Clear section if it doesn't match the new semester
                              if (updated[index].section_id) {
                                const filteredSections = getFilteredSections(updated[index]);
                                const currentSection = filteredSections.find((s: any) => s.id === updated[index].section_id);
                                if (!currentSection) {
                                  updated[index].section_id = undefined;
                                  updated[index].section = "";
                                }
                              }
                              setSubjectAssignments(updated);
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
                              const updated = [...subjectAssignments];
                              if (value && value !== "none") {
                                const sectionObj = sections.find((section: any) => section.id.toString() === value);
                                updated[index].section_id = parseInt(value, 10);
                                updated[index].section = sectionObj?.name || "";
                              } else {
                                updated[index].section_id = undefined;
                                updated[index].section = "";
                              }
                              setSubjectAssignments(updated);
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
                          onClick={() => setSubjectAssignments(subjectAssignments.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSubjectAssignments([...subjectAssignments, { subject_id: 0 }])}
                    >
                      + Add Subject Assignment
                    </Button>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="bulk">
          {isSuperAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload Users
                </CardTitle>
                <CardDescription>
                  Upload Excel or CSV files to create multiple users at once. Use the enhanced Excel template for staff uploads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Staff Section - Always show for Super Admin */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Upload Staff (Faculty/HOD/Admin)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload Faculty, HOD, and College Admin with subject assignments, handled years/sections.
                    </p>
                    <FileUpload
                      endpoint="/bulk-upload/staff"
                      accept=".csv,.xlsx,.xls"
                      label="Upload Staff (Faculty/HOD/Admin) CSV/Excel"
                      description="Upload Faculty, HOD, and College Admin with subject assignments, handled years/sections. IMPORTANT: Download the Excel template (not CSV) to get the enhanced version with Instructions and Staff sheets."
                      templateUrl="/bulk-upload/template/staff"
                      templateFileName="staff_upload_template_enhanced.xlsx"
                      queryParams={collegeId ? { college_id: collegeId } : undefined}
                      onSuccess={(result) => {
                        toast.success(`Successfully imported ${result.success_count} staff members!`);
                        fetchUsers();
                      }}
                    />
                    <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded mt-2">
                      💡 <strong>Tip:</strong> Click "Download Excel Template" (not CSV) to get the enhanced template with Instructions and Staff sheets. The CSV version is simpler and doesn't include the instructions.
                    </p>
                  </div>
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Upload Students
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload students to your college in bulk.
                    </p>
                    <FileUpload
                      endpoint="/bulk-upload/students"
                      accept=".csv,.xlsx,.xls"
                      label="Upload Students CSV/Excel"
                      description="Upload a CSV or Excel file to bulk add students to your college"
                      templateUrl="/bulk-upload/template/students"
                      templateFileName="student_upload_template.csv"
                      queryParams={collegeId ? { college_id: collegeId } : undefined}
                      onSuccess={(result) => {
                        toast.success(`Successfully imported ${result.success_count} students!`);
                        fetchUsers();
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Bulk upload is only available for Super Admin users.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Manage Users
              </CardTitle>
              <CardDescription>
                {isSuperAdmin 
                  ? "Edit any user in the system" 
                  : isHOD
                  ? "Edit faculty and students in your department"
                  : "Edit users in your college"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email, name, roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {users.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No users found matching your search" : "No users found. Create users first."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
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
                            <TableCell>{user.roll_number || "N/A"}</TableCell>
                            <TableCell className="text-right">
                              {isSuperAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditDialog(user)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isSuperAdmin ? (
            <>
              <p>• You can create users for any college</p>
          <p>• Created users can log in immediately with their credentials</p>
          <p>• Faculty can be assigned to sections by HODs</p>
          <p>• Student department and section can be updated later</p>
            </>
          ) : (
            <>
              <p>• Only super admin can create new users</p>
              <p>• You can edit existing HOD, faculty, and students in your college</p>
              <p>• Changes are saved immediately</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog - Enhanced Industry Standard UI */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0">
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    Edit User Details
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-base">
                    Update user information, assignments, and permissions
                  </DialogDescription>
                </div>
                {selectedUser && (
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={selectedUser.roles[0]?.role === 'hod' ? 'default' : selectedUser.roles[0]?.role === 'faculty' ? 'secondary' : 'outline'} className="text-xs px-3 py-1">
                      {selectedUser.roles[0]?.role?.toUpperCase() || 'USER'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedUser.email}
                </span>
                  </div>
                )}
              </div>
          </DialogHeader>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 px-6 py-4">
              <form onSubmit={handleEditUser} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                      <Label htmlFor="edit_full_name" className="text-sm font-medium flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Full Name
                      </Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        placeholder="Enter full name"
                        className="h-10"
              />
            </div>

            <div className="space-y-2">
                      <Label htmlFor="edit_department" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        Department / Branch
                      </Label>
                      {/* Show read-only department for HOD */}
                      {selectedUser && selectedUser.roles.some(r => r.role === 'hod') ? (
                        <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground h-10 flex items-center">
                          {editFormData.department || selectedUser.department || "N/A"}
                          <p className="text-xs ml-2 text-muted-foreground">
                            (HOD cannot change department. Delete and recreate to change.)
                          </p>
                        </div>
                      ) : (
              <Select
                value={editFormData.department || "none"}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    department: value === "none" ? "" : value,
                  })
                }
              >
                          <SelectTrigger id="edit_department" className="h-10">
                            <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                            <SelectItem value="none">Not assigned</SelectItem>
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
                      )}
            </div>

            <div className="space-y-2">
                      <Label htmlFor="edit_section" className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Section
                      </Label>
              <Input
                id="edit_section"
                value={editFormData.section}
                onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                        placeholder="e.g., A, B, C"
                        className="h-10"
              />
            </div>

            <div className="space-y-2">
                      <Label htmlFor="edit_roll_number" className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5" />
                        Roll Number
                      </Label>
              <Input
                id="edit_roll_number"
                value={editFormData.roll_number}
                onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                        placeholder="e.g., 21CS001"
                        className="h-10"
              />
                    </div>
                  </div>
            </div>

                <Separator />

                {/* Faculty/HOD Specific Sections */}
            {selectedUser && (selectedUser.roles.some(r => r.role === 'faculty') || selectedUser.roles.some(r => r.role === 'hod')) && (
              <>
                    {/* Teaching Assignments Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2">
                        <div className="p-1.5 rounded-md bg-blue-500/10">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold">Teaching Assignments</h3>
                      </div>

                      {/* Years Handled removed - college admin cannot set this */}

                      {/* Note: Sections Handled removed - Faculty now works at department level only */}
                    </div>

                    <Separator />

                    {/* Subject Assignments Section */}
                    {selectedUser.roles.some(r => r.role === 'faculty') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-green-500/10">
                              <BookOpen className="h-4 w-4 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold">Subject Assignments</h3>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditFormData({ 
                              ...editFormData, 
                              subject_assignments: [...editFormData.subject_assignments, { subject_id: 0 }]
                            })}
                            className="h-9"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Assignment
                          </Button>
                        </div>

                        {editFormData.subject_assignments.length === 0 ? (
                          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
                            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm font-medium text-muted-foreground mb-1">No subject assignments</p>
                            <p className="text-xs text-muted-foreground">Click "Add Assignment" to assign subjects to this faculty member</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                {editFormData.subject_assignments.map((assignment, index) => (
                              <Card key={index} className="p-4 border-2">
                                <div className="flex gap-3 items-start">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-muted-foreground">Subject *</Label>
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
                                        <SelectTrigger className="h-9">
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
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-muted-foreground">Semester</Label>
                      <Select
                        value={assignment.semester_id?.toString() || "none"}
                        onValueChange={(value) => {
                          const updated = [...editFormData.subject_assignments];
                          updated[index].semester_id = value && value !== "none" ? parseInt(value) : undefined;
                          setEditFormData({ ...editFormData, subject_assignments: updated });
                        }}
                      >
                                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Semester" />
                        </SelectTrigger>
                        <SelectContent>
                                          <SelectItem value="none">All Semesters</SelectItem>
                          {semesters.map((semester) => (
                            <SelectItem key={semester.id} value={semester.id.toString()}>
                              {semester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                                  </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setEditFormData({ 
                        ...editFormData, 
                        subject_assignments: editFormData.subject_assignments.filter((_, i) => i !== index)
                      })}
                    >
                                    <X className="h-4 w-4" />
                    </Button>
                  </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Reassign Faculty Data Section - Only for faculty */}
                {selectedUser && selectedUser.roles.some(r => r.role === 'faculty') && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2">
                        <div className="p-1.5 rounded-md bg-orange-500/10">
                          <User className="h-4 w-4 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-semibold">Reassign Faculty Data</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        If this faculty member is being replaced, you can reassign all their data (coding problems, quizzes, labs) to another faculty member. The new faculty can then edit and manage this data.
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Reassign to Faculty</Label>
                          <Select
                            value={reassignToFacultyId?.toString() || ""}
                            onValueChange={(value) => setReassignToFacultyId(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select faculty member" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(u => u.roles.some(r => r.role === 'faculty') && u.id !== selectedUser.id)
                                .map((faculty) => (
                                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                                    {faculty.full_name || faculty.email} ({faculty.department || 'N/A'})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Data to Reassign</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="reassign_coding"
                                checked={reassignOptions.reassign_coding_problems}
                                onChange={(e) =>
                                  setReassignOptions({ ...reassignOptions, reassign_coding_problems: e.target.checked })
                                }
                                className="rounded"
                              />
                              <Label htmlFor="reassign_coding" className="font-normal">Coding Problems</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="reassign_quizzes"
                                checked={reassignOptions.reassign_quizzes}
                                onChange={(e) =>
                                  setReassignOptions({ ...reassignOptions, reassign_quizzes: e.target.checked })
                                }
                                className="rounded"
                              />
                              <Label htmlFor="reassign_quizzes" className="font-normal">Quizzes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="reassign_labs"
                                checked={reassignOptions.reassign_labs}
                                onChange={(e) =>
                                  setReassignOptions({ ...reassignOptions, reassign_labs: e.target.checked })
                                }
                                className="rounded"
                              />
                              <Label htmlFor="reassign_labs" className="font-normal">Coding Labs</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="reassign_lab_problems"
                                checked={reassignOptions.reassign_lab_problems}
                                onChange={(e) =>
                                  setReassignOptions({ ...reassignOptions, reassign_lab_problems: e.target.checked })
                                }
                                className="rounded"
                              />
                              <Label htmlFor="reassign_lab_problems" className="font-normal">Lab Problems</Label>
                            </div>
                          </div>
                        </div>
                <Button
                  type="button"
                  variant="outline"
                          onClick={handleReassignFacultyData}
                          disabled={!reassignToFacultyId || reassigning}
                          className="w-full"
                        >
                          {reassigning ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Reassigning...
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              Reassign Data to Selected Faculty
                            </>
                          )}
                </Button>
              </div>
                    </div>
                  </>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Changes will be saved immediately upon submission
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="h-10">
                Cancel
              </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-10 min-w-[120px]"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Update User
                        </>
                      )}
              </Button>
                  </div>
                </div>
          </form>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
