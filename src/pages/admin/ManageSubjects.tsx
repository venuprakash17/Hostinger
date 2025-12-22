import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, Trash2, Search, Upload, Download } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { apiClient } from "@/integrations/api/client";
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
import { useUserRole } from "@/hooks/useUserRole";

interface DepartmentOption {
  id: number;
  name: string;
  code: string | null;
}

interface Subject {
  id: number;
  name: string;
  code: string | null;
  college_id: number;
  department_id: number | null;
  semester_id: number | null;
  year: string | null;
  credits: number | null;
  is_active: boolean;
  department_name?: string;
  department_code?: string | null;
  semester_name?: string;
}

export default function ManageSubjects() {
  const { isAdmin, isSuperAdmin, isHOD } = useUserRole();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collegeId, setCollegeId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [credits, setCredits] = useState<string>("");
  const [createSemesterDialogOpen, setCreateSemesterDialogOpen] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [newSemesterNumber, setNewSemesterNumber] = useState("");
  const [creatingSemester, setCreatingSemester] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    department_id: null as number | null,
    semester_id: null as number | null,
    year: null as string | null,
    credits: null as number | null,
  });

  useEffect(() => {
    fetchUserProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
    // For HOD, auto-set department when profile loads
    if (isHOD && !isSuperAdmin && !isAdmin) {
      fetchUserProfile().then(() => {
        // Department will be auto-set from profile
      });
    }
  }, [isSuperAdmin, isHOD, isAdmin]);

  useEffect(() => {
    if (collegeId) {
      fetchSubjects();
      fetchDepartments();
      fetchSemesters();
    } else {
      setSubjects([]);
      setDepartments([]);
      setSemesters([]);
    }
  }, [collegeId]);

  const fetchUserProfile = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile.college_id) {
        setCollegeId(profile.college_id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<any[]>('/colleges');
      setColleges(data || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      // For HOD, backend automatically filters by department, so we don't need to pass department_id
      // The backend get_subjects endpoint handles HOD filtering automatically
      const data = await apiClient.getSubjects(collegeId || undefined);
      // Enrich with department and semester names
      const enriched = await Promise.all((data || []).map(async (subject: any) => {
        const dept = departments.find(d => d.id === subject.department_id);
        const sem = semesters.find(s => s.id === subject.semester_id);
        return {
          ...subject,
          department_name: dept?.name || 'N/A',
          department_code: dept?.code || null,
          semester_name: sem?.name || 'N/A'
        };
      }));
      setSubjects(enriched);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast.error(error.message || 'Failed to fetch subjects');
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.getDepartments(collegeId || undefined);
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

  useEffect(() => {
    if (departments.length > 0 && semesters.length > 0) {
      fetchSubjects();
    }
  }, [departments, semesters]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name) {
      toast.error("Subject name is required");
      setLoading(false);
      return;
    }

    if (!selectedDepartmentId) {
      toast.error("Please select a department");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        name,
        code: code || undefined,
        department_id: selectedDepartmentId,
        semester_id: selectedSemesterId || undefined,
        year: selectedYear || undefined,
        credits: credits ? parseInt(credits) : undefined,
      };

      // For super admin, college_id is required
      if (isSuperAdmin && !collegeId) {
        toast.error("Please select a college");
        setLoading(false);
        return;
      }

      if (isSuperAdmin) {
        payload.college_id = collegeId;
      }

      await apiClient.createSubject(payload);
      toast.success("Subject created successfully!");
      
      // Clear form
      setName("");
      setCode("");
      setSelectedDepartmentId(null);
      setSelectedSemesterId(null);
      setSelectedYear("");
      setCredits("");
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setEditFormData({
      name: subject.name,
      code: subject.code || "",
      department_id: subject.department_id,
      semester_id: subject.semester_id,
      year: subject.year || null,
      credits: subject.credits,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    setLoading(true);
    try {
      await apiClient.put(`/academic/subjects/${selectedSubject.id}`, editFormData);
      toast.success("Subject updated successfully!");
      setEditDialogOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subject");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    setLoading(true);
    try {
      await apiClient.put(`/academic/subjects/${id}`, { is_active: false });
      toast.success("Subject deactivated successfully!");
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeId) {
      toast.error("Select a college before creating a semester");
      return;
    }

    if (!newSemesterName.trim()) {
      toast.error("Semester name is required");
      return;
    }

    if (!newSemesterNumber.trim()) {
      toast.error("Semester number is required");
      return;
    }

    const parsedNumber = parseInt(newSemesterNumber, 10);
    if (Number.isNaN(parsedNumber) || parsedNumber <= 0) {
      toast.error("Semester number must be a positive number");
      return;
    }

    try {
      setCreatingSemester(true);
      const payload: any = {
        name: newSemesterName.trim(),
        number: parsedNumber,
      };

      if (isSuperAdmin) {
        payload.college_id = collegeId;
      }

      const created = await apiClient.createSemester(payload);
      toast.success("Semester created successfully!");
      setCreateSemesterDialogOpen(false);
      setNewSemesterName("");
      setNewSemesterNumber("");
      await fetchSemesters();
      if (created?.id) {
        setSelectedSemesterId(created.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create semester");
    } finally {
      setCreatingSemester(false);
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Manage Subjects</h1>
          <p className="text-muted-foreground">
            Create and manage subjects for your departments
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Subject Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Subject
            </CardTitle>
            <CardDescription>
              Add a new subject to a department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="college">College *</Label>
                  <Select
                    value={collegeId?.toString() || ""}
                    onValueChange={(value) => {
                      const parsed = value ? parseInt(value, 10) : null;
                      setCollegeId(parsed);
                      setSelectedDepartmentId(null);
                      setSelectedSemesterId(null);
                    }}
                  >
                    <SelectTrigger id="college">
                      <SelectValue placeholder="Select College" />
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

              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Data Structures"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Subject Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CS301"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={selectedDepartmentId?.toString() || ""}
                  onValueChange={(value) => setSelectedDepartmentId(value ? parseInt(value) : null)}
                  required
                  disabled={isHOD && !isSuperAdmin && !isAdmin}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name} {dept.code && `(${dept.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isHOD && !isSuperAdmin && !isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Department is auto-set to your department
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="semester">Semester</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-sm"
                    onClick={() => setCreateSemesterDialogOpen(true)}
                    disabled={!collegeId}
                  >
                    Add semester
                  </Button>
                </div>
                <Select
                  value={selectedSemesterId?.toString() || "none"}
                  onValueChange={(value) => setSelectedSemesterId(value === "none" ? null : parseInt(value))}
                >
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Select Semester (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {semesters.map((sem) => (
                      <SelectItem key={sem.id} value={sem.id.toString()}>
                        {sem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Academic Year *</Label>
                <Select
                  value={selectedYear || "none"}
                  onValueChange={(value) => setSelectedYear(value === "none" ? "" : value)}
                  required
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Year</SelectItem>
                    <SelectItem value="1st">1st Year</SelectItem>
                    <SelectItem value="2nd">2nd Year</SelectItem>
                    <SelectItem value="3rd">3rd Year</SelectItem>
                    <SelectItem value="4th">4th Year</SelectItem>
                    <SelectItem value="5th">5th Year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the academic year for this subject. Only students in this year and section will be shown for attendance.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="3"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Subject"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subjects List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              Manage existing subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredSubjects.length === 0 ? (
                <div className="py-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No subjects found matching your search" : "No subjects found. Create one to get started."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{subject.code || "N/A"}</TableCell>
                        <TableCell>
                          {subject.department_name || "N/A"}
                          {subject.department_code ? ` (${subject.department_code})` : ""}
                        </TableCell>
                        <TableCell>{subject.year || "N/A"}</TableCell>
                        <TableCell>{subject.semester_name || "N/A"}</TableCell>
                        <TableCell>{subject.credits || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(subject)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSubject(subject.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Subject Name</Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Data Structures"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_code">Subject Code</Label>
              <Input
                id="edit_code"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                placeholder="CS301"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_department">Department</Label>
              <Select
                value={editFormData.department_id?.toString() || "none"}
                onValueChange={(value) => setEditFormData({ ...editFormData, department_id: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger id="edit_department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name} {dept.code && `(${dept.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_semester">Semester</Label>
              <Select
                value={editFormData.semester_id?.toString() || "none"}
                onValueChange={(value) => setEditFormData({ ...editFormData, semester_id: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger id="edit_semester">
                  <SelectValue placeholder="Select Semester (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {semesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id.toString()}>
                      {sem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_year">Academic Year *</Label>
              <Select
                value={editFormData.year || "none"}
                onValueChange={(value) => setEditFormData({ ...editFormData, year: value === "none" ? null : value })}
                required
              >
                <SelectTrigger id="edit_year">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Year</SelectItem>
                  <SelectItem value="1st">1st Year</SelectItem>
                  <SelectItem value="2nd">2nd Year</SelectItem>
                  <SelectItem value="3rd">3rd Year</SelectItem>
                  <SelectItem value="4th">4th Year</SelectItem>
                  <SelectItem value="5th">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_credits">Credits</Label>
              <Input
                id="edit_credits"
                type="number"
                min="0"
                value={editFormData.credits || ""}
                onChange={(e) => setEditFormData({ ...editFormData, credits: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="3"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createSemesterDialogOpen} onOpenChange={setCreateSemesterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Semester</DialogTitle>
            <DialogDescription>
              Define a new semester to associate with subjects.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSemester} className="space-y-4">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="semester_college">College *</Label>
                <Select
                  value={collegeId?.toString() || ""}
                  onValueChange={(value) => {
                    const parsed = value ? parseInt(value, 10) : null;
                    setCollegeId(parsed);
                    setSelectedDepartmentId(null);
                    setSelectedSemesterId(null);
                  }}
                >
                  <SelectTrigger id="semester_college">
                    <SelectValue placeholder="Select College" />
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

            <div className="space-y-2">
              <Label htmlFor="new_semester_name">Semester Name *</Label>
              <Input
                id="new_semester_name"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="Semester 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_semester_number">Semester Number *</Label>
              <Input
                id="new_semester_number"
                type="number"
                min={1}
                value={newSemesterNumber}
                onChange={(e) => setNewSemesterNumber(e.target.value)}
                placeholder="1"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateSemesterDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingSemester || !collegeId}>
                {creatingSemester ? "Creating..." : "Create Semester"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

