import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, CheckCircle2, XCircle } from "lucide-react";
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

interface Faculty {
  id: number;
  email: string;
  full_name?: string;
}

interface Section {
  id: number;
  name: string;
  display_name?: string;
  department_id: number;
  department_name?: string;
  year?: number;
  year_str?: string;
}

export default function AssignSectionsToFaculty() {
  const { isAdmin, isHOD, isSuperAdmin } = useUserRole();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetchUserProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (collegeId || (!isSuperAdmin && collegeId !== null)) {
      fetchFaculties();
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
      // Filter for faculty only
      const facultyUsers = (users || []).filter((user: any) => {
        return user.roles?.some((role: any) => role.role === "faculty");
      });
      setFaculties(facultyUsers);
    } catch (error) {
      console.error("Error fetching faculties:", error);
      toast.error("Failed to load faculties");
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

    if (selectedSectionIds.size === 0) {
      toast.error("Please select at least one section");
      return;
    }

    setLoading(true);
    try {
      await apiClient.assignSectionsToFaculty(selectedFacultyId, Array.from(selectedSectionIds));
      toast.success(`Successfully assigned ${selectedSectionIds.size} section(s) to faculty`);
      setSelectedSectionIds(new Set());
      setSelectedFacultyId(null);
    } catch (error: any) {
      console.error("Error assigning sections:", error);
      toast.error(error.message || "Failed to assign sections");
    } finally {
      setLoading(false);
    }
  };

  const selectedFaculty = faculties.find((f) => f.id === selectedFacultyId);

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Assign Sections to Faculty</h1>
          <p className="text-muted-foreground">
            Assign sections to faculty members so they can view and manage their students
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>
            Select a faculty member and assign sections they will manage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              onValueChange={(value) => {
                setSelectedFacultyId(value ? parseInt(value) : null);
                setSelectedSectionIds(new Set());
              }}
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

          {selectedFacultyId && (
            <>
              <div className="space-y-2">
                <Label>Select Sections *</Label>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {sections.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sections available</p>
                  ) : (
                    <div className="space-y-2">
                      {sections.map((section) => (
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
                              {section.display_name || `${section.name} - ${section.department_name || ""}`}
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

              <Button onClick={handleAssign} disabled={loading || selectedSectionIds.size === 0} className="w-full">
                {loading ? "Assigning..." : `Assign ${selectedSectionIds.size} Section(s)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

