import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { useUserRole } from "@/hooks/useUserRole";
import { apiClient } from "@/integrations/api/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DepartmentOption {
  id: number;
  name: string;
  code?: string | null;
}

interface SemesterOption {
  id: number;
  name: string;
  number: number;
}

interface Section {
  id: number;
  name: string;
  department_id: number;
  department_name?: string | null;
  semester_id?: number | null;
  semester_name?: string | null;
  college_id: number;
  year?: number | null;
  is_active: boolean;
  created_at: string;
}

export default function ManageSections() {
  const { isSuperAdmin, isAdmin, isHOD } = useUserRole();

  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    semesterId: "",
    year: "",
  });

  useEffect(() => {
    fetchProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
  }, [isSuperAdmin, isHOD]);

  useEffect(() => {
    if (collegeId || isHOD) {
      fetchDepartments();
      fetchSemesters();
      fetchSections();
    } else {
      setDepartments([]);
      setSemesters([]);
      setSections([]);
    }
  }, [collegeId, isHOD]);

  const fetchProfile = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile.college_id && !isSuperAdmin) {
        setCollegeId(profile.college_id);
      }
      // For HOD, fetch their department and auto-set it
      if (isHOD && profile.department) {
        const depts = await apiClient.getDepartments(profile.college_id);
        const hodDept = depts?.find((d: any) => d.name === profile.department);
        if (hodDept && formData.departmentId === "") {
          setFormData(prev => ({ ...prev, departmentId: hodDept.id.toString() }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<any[]>('/colleges');
      setColleges(data || []);
      if (!collegeId && data?.length === 1) {
        setCollegeId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch colleges:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.getDepartments(collegeId || undefined);
      setDepartments(
        (data || []).map((dept: any) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code || null,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchSemesters = async () => {
    try {
      const data = await apiClient.getSemesters(collegeId || undefined);
      setSemesters(
        (data || []).map((sem: any) => ({
          id: sem.id,
          name: sem.name,
          number: sem.number,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch semesters:", error);
    }
  };

  const fetchSections = async () => {
    if (!collegeId) return;
    setLoading(true);
    try {
      const data = await apiClient.getSections(collegeId);
      setSections(data || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      toast.error("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      departmentId: "",
      semesterId: "",
      year: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeId && isSuperAdmin) {
      toast.error("Select a college before creating sections");
      return;
    }

    if (!formData.departmentId) {
      toast.error("Department is required");
      return;
    }

    try {
      await apiClient.createSection({
        name: formData.name.trim(),
        department_id: parseInt(formData.departmentId, 10),
        semester_id: formData.semesterId ? parseInt(formData.semesterId, 10) : undefined,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
        college_id: isSuperAdmin ? collegeId || undefined : undefined,
      });
      toast.success("Section created successfully");
      setCreateDialogOpen(false);
      resetForm();
      fetchSections();
    } catch (error: any) {
      console.error("Failed to create section:", error);
      toast.error(error.message || "Failed to create section");
    }
  };

  const handleOpenEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      departmentId: section.department_id.toString(),
      semesterId: section.semester_id ? section.semester_id.toString() : "",
      year: section.year ? section.year.toString() : "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    try {
      await apiClient.updateSection(editingSection.id, {
        name: formData.name.trim(),
        department_id: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        semester_id: formData.semesterId ? parseInt(formData.semesterId, 10) : undefined,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
      });
      toast.success("Section updated successfully");
      setEditDialogOpen(false);
      setEditingSection(null);
      resetForm();
      fetchSections();
    } catch (error: any) {
      console.error("Failed to update section:", error);
      toast.error(error.message || "Failed to update section");
    }
  };

  const handleToggleSection = async (section: Section) => {
    try {
      await apiClient.updateSection(section.id, {
        is_active: !section.is_active,
      });
      toast.success(section.is_active ? "Section deactivated" : "Section activated");
      fetchSections();
    } catch (error: any) {
      console.error("Failed to toggle section:", error);
      toast.error(error.message || "Failed to update section status");
    }
  };

  const departmentLookup = useMemo(() => {
    const lookup = new Map<number, string>();
    departments.forEach((dept) => lookup.set(dept.id, dept.name));
    return lookup;
  }, [departments]);

  const semesterLookup = useMemo(() => {
    const lookup = new Map<number, string>();
    semesters.forEach((sem) => lookup.set(sem.id, sem.name));
    return lookup;
  }, [semesters]);

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Manage Sections</h1>
            <p className="text-muted-foreground">
              Define class sections that faculty can use when taking attendance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <div className="w-64">
              <Label className="sr-only" htmlFor="select-college">
                College
              </Label>
              <Select
                value={collegeId?.toString() || ""}
                onValueChange={(value) => setCollegeId(value ? parseInt(value, 10) : null)}
              >
                <SelectTrigger id="select-college">
                  <SelectValue placeholder="Select college" />
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

          <Button onClick={handleOpenCreate} disabled={!collegeId}>
            <Plus className="mr-2 h-4 w-4" />
            Create Section
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            {collegeId ? "All sections defined for this college" : "Select a college to view sections"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {loading ? "Loading sections..." : "No sections found. Create one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>{section.department_name || departmentLookup.get(section.department_id) || "—"}</TableCell>
                    <TableCell>{section.semester_name || (section.semester_id ? semesterLookup.get(section.semester_id) : "—")}</TableCell>
                    <TableCell>{section.year || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={section.is_active ? "default" : "secondary"}>
                        {section.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(section)}
                      >
                        <Settings2 className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSection(section)}
                      >
                        {section.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Section Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Section</DialogTitle>
            <DialogDescription>
              Define a new section that can be linked to subjects and attendance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSection} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name *</Label>
              <Input
                id="section-name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="A, B, C..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-department">Department *</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, departmentId: value }))}
                required
                disabled={isHOD}
              >
                <SelectTrigger id="section-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}{dept.code ? ` (${dept.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isHOD && (
                <p className="text-xs text-muted-foreground">
                  Department is automatically set to your department
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-semester">Semester (optional)</Label>
              <Select
                value={formData.semesterId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, semesterId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger id="section-semester">
                  <SelectValue placeholder="Select semester" />
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
              <Label htmlFor="section-year">Academic Year (optional)</Label>
              <Input
                id="section-year"
                type="number"
                min={1}
                max={10}
                value={formData.year}
                onChange={(event) => setFormData((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="1"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={!collegeId}>
                Create Section
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update section details or deactivate it if it is no longer needed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSection} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section-name">Section Name *</Label>
              <Input
                id="edit-section-name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-section-department">Department *</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, departmentId: value }))}
                required
                disabled={isHOD}
              >
                <SelectTrigger id="edit-section-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}{dept.code ? ` (${dept.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isHOD && (
                <p className="text-xs text-muted-foreground">
                  Department cannot be changed (scoped to your department)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-section-semester">Semester (optional)</Label>
              <Select
                value={formData.semesterId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, semesterId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger id="edit-section-semester">
                  <SelectValue placeholder="Select semester" />
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
              <Label htmlFor="edit-section-year">Academic Year (optional)</Label>
              <Input
                id="edit-section-year"
                type="number"
                min={1}
                max={10}
                value={formData.year}
                onChange={(event) => setFormData((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="1"
              />
            </div>

            <DialogFooter>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
