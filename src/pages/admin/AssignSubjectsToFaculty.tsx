import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Users } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Faculty {
  id: number;
  email: string;
  full_name?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  year?: string;
}

interface Section {
  id: number;
  name: string;
  display_name?: string;
  department_id: number;
  year?: number;
  year_str?: string;
}

export default function AssignSubjectsToFaculty() {
  const { isAdmin, isHOD, isSuperAdmin } = useUserRole();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [colleges, setColleges] = useState<any[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (collegeId || (!isSuperAdmin && collegeId !== null)) {
      fetchFaculties();
      fetchSubjects();
      fetchSections();
    }
  }, [collegeId]);

  const fetchUserProfile = async () => {
    try {
      const profile = await apiClient.getCurrentUserProfile();
      if (profile.college_id && !isSuperAdmin) {
        setCollegeId(profile.college_id);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<any[]>("/colleges");
      setColleges(data || []);
    } catch (error) {
      console.error("Error fetching colleges:", error);
    }
  };

  const fetchFaculties = async () => {
    try {
      const users = await apiClient.getUsers(collegeId || undefined);
      const facultyUsers = (users || []).filter((user: any) => {
        return user.roles?.some((role: any) => role.role === "faculty");
      });
      setFaculties(facultyUsers);
    } catch (error) {
      console.error("Error fetching faculties:", error);
      toast.error("Failed to load faculties");
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await apiClient.getSubjects(collegeId || undefined);
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
    }
  };

  const fetchSections = async () => {
    try {
      const data = await apiClient.getSections(collegeId || undefined);
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Failed to load sections");
    }
  };

  const handleOpenAssignDialog = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    setSelectedSectionIds(new Set());
    setSelectedYear("");
    setAssignDialogOpen(true);
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSectionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleAssign = async () => {
    if (!selectedFacultyId) {
      toast.error("Please select a faculty member");
      return;
    }

    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    if (selectedSectionIds.size === 0) {
      toast.error("Please select at least one section");
      return;
    }

    if (!selectedYear) {
      toast.error("Please select a year");
      return;
    }

    setLoading(true);
    try {
      // Assign subject to faculty for each selected section
      const assignments = Array.from(selectedSectionIds).map((sectionId) =>
        apiClient.createSubjectAssignment({
          faculty_id: selectedFacultyId,
          subject_id: selectedSubjectId,
          section_id: sectionId,
        })
      );

      await Promise.all(assignments);
      toast.success(
        `Successfully assigned subject to faculty for ${selectedSectionIds.size} section(s)`
      );
      setAssignDialogOpen(false);
      setSelectedSectionIds(new Set());
      setSelectedSubjectId(null);
      setSelectedYear("");
    } catch (error: any) {
      console.error("Error assigning subject:", error);
      toast.error(error.message || "Failed to assign subject");
    } finally {
      setLoading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const filteredSections = selectedSubject
    ? sections.filter((s) => {
        // Filter sections by subject's department and year
        if (selectedSubject.department_id && s.department_id !== selectedSubject.department_id) {
          return false;
        }
        if (selectedSubject.year && s.year_str !== selectedSubject.year) {
          return false;
        }
        return true;
      })
    : sections;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Assign Subjects to Faculty</h1>
          <p className="text-muted-foreground">
            Assign subjects to faculty members with specific sections and years
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faculty Selection</CardTitle>
          <CardDescription>Select a faculty member to assign subjects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Select
                value={collegeId?.toString() || ""}
                onValueChange={(value) => setCollegeId(value ? parseInt(value) : null)}
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
            <Label htmlFor="faculty">Select Faculty *</Label>
            <Select
              value={selectedFacultyId?.toString() || ""}
              onValueChange={(value) => setSelectedFacultyId(value ? parseInt(value) : null)}
            >
              <SelectTrigger id="faculty">
                <SelectValue placeholder="Select Faculty Member" />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                    {faculty.full_name || faculty.email} ({faculty.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedFacultyId && (
        <Card>
          <CardHeader>
            <CardTitle>Available Subjects</CardTitle>
            <CardDescription>
              Click on a subject to assign it with sections and year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No subjects available
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code || "N/A"}</TableCell>
                      <TableCell>{subject.department_name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{subject.year || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignDialog(subject.id)}
                        >
                          Assign Sections
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Subject: {selectedSubject?.name}</DialogTitle>
            <DialogDescription>
              Select sections and year for this subject assignment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Year *</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Year</SelectItem>
                  <SelectItem value="2nd">2nd Year</SelectItem>
                  <SelectItem value="3rd">3rd Year</SelectItem>
                  <SelectItem value="4th">4th Year</SelectItem>
                  <SelectItem value="5th">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Sections *</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                {filteredSections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No matching sections available</p>
                ) : (
                  <div className="space-y-2">
                    {filteredSections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                      >
                        <Checkbox
                          checked={selectedSectionIds.has(section.id)}
                          onCheckedChange={() => handleSectionToggle(section.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {section.display_name || section.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {section.year_str || (section.year ? `${section.year} year` : "")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedSectionIds.size} section(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading || selectedSectionIds.size === 0 || !selectedYear}
            >
              {loading ? "Assigning..." : `Assign to ${selectedSectionIds.size} Section(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

