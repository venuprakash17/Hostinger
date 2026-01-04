import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Users, Upload, Edit, Trash2, Search, User, GraduationCap } from "lucide-react";
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

interface DepartmentOption {
  id: number;
  name: string;
  code: string | null;
}

interface StaffMember {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  college_id: number | null;
  roles: Array<{ role: string; college_id: number | null }>;
  handled_years?: string[] | null;
  handled_sections?: string[] | null;
}

export default function ManageStaff() {
  const { isAdmin, isHOD, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"faculty" | "hod">("faculty");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    department: "",
    subject_assignments: [] as Array<{ subject_id: number; semester_id?: number; section?: string; section_id?: number; year?: string }>,
    handled_years: [] as string[],
    handled_sections: [] as string[],
  });
  
  // For subject assignments (faculty)
  const [subjects, setSubjects] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ subject_id: number; semester_id?: number; section?: string; section_id?: number; year?: string }>>([]);
  const [handledYears, setHandledYears] = useState<string[]>([]);
  const [handledSections, setHandledSections] = useState<string[]>([]);
  
  const sectionNameOptions = useMemo(() => {
    const names = new Set<string>();
    sections.forEach((section: any) => {
      if (section?.name) {
        names.add(section.name);
      }
    });
    return Array.from(names).sort();
  }, [sections]);

  // Helper function to get filtered sections for a subject assignment
  const getFilteredSections = (assignment: { subject_id?: number; semester_id?: number; year?: string }) => {
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

    // Filter by year if provided
    if (assignment.year) {
      // Convert year string (e.g., "1st") to integer (1) for comparison
      const yearMap: { [key: string]: number } = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5 };
      const yearNum = yearMap[assignment.year.toLowerCase()];
      if (yearNum) {
        filtered = filtered.filter((section: any) => section.year === yearNum);
      }
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
  }, []);

  useEffect(() => {
    if (collegeId) {
      fetchDepartmentsForCollege(collegeId);
      fetchSemesters();
      fetchSubjects();
      fetchSections();
      fetchStaff();
    }
  }, [collegeId]);
  
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
  
  const fetchSemesters = async () => {
    try {
      const data = await apiClient.getSemesters(collegeId || undefined);
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };
  
  const fetchSubjects = async () => {
    try {
      const matchingDept = department
        ? departments.find(d => d.code === department || d.name === department)
        : undefined;
      const data = await apiClient.getSubjects(
        collegeId || undefined,
        matchingDept ? matchingDept.id : undefined
      );
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await apiClient.getSections(collegeId || undefined);
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
      if (profile.college_id) {
        setCollegeId(profile.college_id);
      } else {
        console.warn('No college_id in profile - admin may not be associated with a college');
      }
      // Store current user ID to check if HOD is editing themselves
      if (profile.user_id) {
        setCurrentUserId(profile.user_id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      if (!collegeId) {
        setStaff([]);
        return;
      }
      
      const data = await apiClient.get<StaffMember[]>(`/users?college_id=${collegeId}`);
      // Filter to only show faculty and HOD
      const staffMembers = (data || []).filter(user => 
        user.roles.some(r => r.role === 'faculty' || r.role === 'hod')
      );
      setStaff(staffMembers);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast.error(error.message || 'Failed to fetch staff');
    }
  };

  const handleOpenEditDialog = async (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);

    // Fetch subject assignments if user is faculty
    let subjectAssignments = [];
    if (staffMember.roles.some(r => r.role === 'faculty')) {
      try {
        const assignments = await apiClient.getSubjectAssignments(staffMember.id);
        subjectAssignments = (assignments || []).map((a: any) => ({
          subject_id: a.subject_id,
          semester_id: a.semester_id,
          section: a.section,
          section_id: a.section_id,
          year: a.year,
        }));
      } catch (error) {
        console.error('Error fetching subject assignments:', error);
      }
    }
    
    const handledYears = staffMember.handled_years || [];
    const handledSections = staffMember.handled_sections || [];
    
    setEditFormData({
      full_name: staffMember.full_name || "",
      department: staffMember.department || "",
      subject_assignments: subjectAssignments,
      handled_years: handledYears,
      handled_sections: handledSections,
    });
    setEditDialogOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setLoading(true);
    try {
      const payload: any = {
        full_name: editFormData.full_name,
        department: editFormData.department || undefined,
      };

      // Add subject assignments for faculty - filter out invalid ones
      if (selectedStaff.roles.some(r => r.role === 'faculty')) {
        // Filter out assignments with invalid subject_id (0 or undefined)
        const validAssignments = editFormData.subject_assignments.filter(
          (assignment) => assignment.subject_id && assignment.subject_id > 0
        );
        
        if (validAssignments.length > 0) {
          payload.subject_assignments = validAssignments.map(assignment => ({
            subject_id: assignment.subject_id,
            semester_id: assignment.semester_id || undefined,
            section: assignment.section || undefined,
            section_id: assignment.section_id || undefined,
            year: assignment.year || undefined,
          }));
        } else {
          // If no valid assignments, send empty array to clear all assignments
          payload.subject_assignments = [];
        }
      }
      
      // Years Handled removed - college admin cannot set this
      // Sections handled also removed - faculty works at department level only

      await apiClient.put(`/users/${selectedStaff.id}`, payload);
      toast.success("Staff member updated successfully!");
      setEditDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast.error(error.message || "Failed to update staff member");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !fullName) {
      toast.error("Email and full name are required");
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
      
      // Add subject assignments for faculty - filter out invalid ones
      if (role === 'faculty') {
        // Filter out assignments with invalid subject_id (0 or undefined)
        const validAssignments = subjectAssignments.filter(
          (assignment) => assignment.subject_id && assignment.subject_id > 0
        );
        
        if (validAssignments.length > 0) {
          payload.subject_assignments = validAssignments.map(assignment => ({
            subject_id: assignment.subject_id,
            semester_id: assignment.semester_id || undefined,
            section: assignment.section || undefined,
            section_id: assignment.section_id || undefined,
            year: assignment.year || undefined,
          }));
        }
      }
      
      // Years Handled removed - college admin cannot set this
      // Sections handled also removed - faculty works at department level only
      
      // Only include password if provided
      if (password) {
        payload.password = password;
      }

      await apiClient.post('/users', payload);
      toast.success(`${role === 'hod' ? 'HOD' : 'Faculty'} created successfully!`);
      
      // Clear form
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
      setRole("faculty");
      setSubjectAssignments([]);
      setHandledYears([]);
      setHandledSections([]);
      fetchStaff();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast.error(error.message || "Failed to create staff member");
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staff;
    const term = searchTerm.toLowerCase();
    return staff.filter(member => 
      member.email.toLowerCase().includes(term) ||
      member.full_name?.toLowerCase().includes(term) ||
      member.department?.toLowerCase().includes(term) ||
      member.roles.some(r => r.role.toLowerCase().includes(term))
    );
  }, [staff, searchTerm]);

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin && !isHOD) {
    return <div className="flex items-center justify-center min-h-screen">Unauthorized</div>;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Manage Staff</h1>
          <p className="text-muted-foreground">Create and manage Faculty and HOD members</p>
        </div>
      </div>

      <Tabs defaultValue="view" className="space-y-4">
        <TabsList>
          <TabsTrigger value="view">View Staff</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="create">Create Staff</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Manage Faculty and HOD members in your college</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff by name, email, department, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name || "N/A"}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {member.roles.map((r) => (
                            <Badge key={r.role} variant={r.role === 'hod' ? 'default' : 'secondary'} className="mr-1">
                              {r.role === 'hod' ? 'HOD' : 'Faculty'}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>{member.department || "N/A"}</TableCell>
                        <TableCell>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Staff Member</CardTitle>
              <CardDescription>Add a new Faculty or HOD member to your college</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={role} onValueChange={(value: "faculty" | "hod") => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="hod">HOD (Head of Department)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="faculty@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty for auto-generated password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.code || dept.name}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                          <Label className="text-xs">Year</Label>
                          <Select
                            value={assignment.year || "none"}
                            onValueChange={(value) => {
                              const updated = [...subjectAssignments];
                              updated[index].year = value !== "none" ? value : undefined;
                              // Clear section if it doesn't match the new year
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
                            disabled={!assignment.subject_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={assignment.subject_id ? "Select Year" : "Select subject first"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="1st">1st Year</SelectItem>
                              <SelectItem value="2nd">2nd Year</SelectItem>
                              <SelectItem value="3rd">3rd Year</SelectItem>
                              <SelectItem value="4th">4th Year</SelectItem>
                              <SelectItem value="5th">5th Year</SelectItem>
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
                      onClick={() => setSubjectAssignments([...subjectAssignments, { subject_id: 0, section: "", section_id: undefined, year: undefined }])}
                    >
                      + Add Subject Assignment
                    </Button>
                  </div>
                )}

                {(role === 'faculty' || role === 'hod') && (
                  <>
                    <div className="space-y-2">
                      <Label>Years Handled</Label>
                      <div className="flex flex-wrap gap-2">
                        {['1st', '2nd', '3rd', '4th', '5th'].map((year) => (
                          <Button
                            key={year}
                            type="button"
                            variant={handledYears.includes(year) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setHandledYears(
                                handledYears.includes(year)
                                  ? handledYears.filter(y => y !== year)
                                  : [...handledYears, year]
                              );
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
                              variant={handledSections.includes(sec) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setHandledSections(
                                  handledSections.includes(sec)
                                    ? handledSections.filter(s => s !== sec)
                                    : [...handledSections, sec]
                                );
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

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Staff Member"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member details, subject assignments, and handled years/sections
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name *</Label>
              <Input
                id="editFullName"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                required
              />
            </div>

            {/* Hide department field if HOD is editing themselves - they cannot change their department */}
            {!(selectedStaff?.roles.some(r => r.role === 'hod') && isHOD && currentUserId === selectedStaff.id) && (
              <div className="space-y-2">
                <Label htmlFor="editDepartment">Department</Label>
                <Select 
                  value={editFormData.department} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.code || dept.name}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Show read-only department info if HOD is editing themselves */}
            {selectedStaff?.roles.some(r => r.role === 'hod') && isHOD && currentUserId === selectedStaff.id && (
              <div className="space-y-2">
                <Label htmlFor="editDepartment">Department</Label>
                <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                  {editFormData.department || selectedStaff.department || "N/A"}
                  <p className="text-xs mt-1 text-muted-foreground">
                    HOD cannot change their department. To change department, please delete and recreate the HOD account.
                  </p>
                </div>
              </div>
            )}

            {selectedStaff && selectedStaff.roles.some(r => r.role === 'faculty') && (
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
                          // Clear section if it doesn't match the new subject's department
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
                          // Clear section if it doesn't match the new semester
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
                      <Label className="text-xs">Year</Label>
                      <Select
                        value={assignment.year || "none"}
                        onValueChange={(value) => {
                          const updated = [...editFormData.subject_assignments];
                          updated[index].year = value !== "none" ? value : undefined;
                          // Clear section if it doesn't match the new year
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
                        disabled={!assignment.subject_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={assignment.subject_id ? "Select Year" : "Select subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="1st">1st Year</SelectItem>
                          <SelectItem value="2nd">2nd Year</SelectItem>
                          <SelectItem value="3rd">3rd Year</SelectItem>
                          <SelectItem value="4th">4th Year</SelectItem>
                          <SelectItem value="5th">5th Year</SelectItem>
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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFormData({ 
                    ...editFormData, 
                    subject_assignments: [...editFormData.subject_assignments, { subject_id: 0, section: "", section_id: undefined, year: undefined }]
                  })}
                >
                  + Add Subject Assignment
                </Button>
              </div>
            )}

            {selectedStaff && (selectedStaff.roles.some(r => r.role === 'faculty') || selectedStaff.roles.some(r => r.role === 'hod')) && (
              <>
                {/* Years Handled removed - college admin cannot set this */}

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

