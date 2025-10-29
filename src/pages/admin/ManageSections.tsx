import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Section {
  id: string;
  name: string;
  year: number;
  semester: number;
  department_id: string;
  departments?: { name: string };
}

interface FacultyAssignment {
  id: string;
  faculty_id: string;
  section_id: string;
  subject: string;
  profiles?: { full_name: string; email: string };
}

export default function ManageSections() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    year: "",
    semester: ""
  });

  const [assignData, setAssignData] = useState({
    facultyId: "",
    sectionId: "",
    subject: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [deptRes, sectRes, assignRes] = await Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("sections").select("*, departments(name)"),
      supabase.from("faculty_sections").select("*")
    ]);

    if (deptRes.data) setDepartments(deptRes.data);
    if (sectRes.data) setSections(sectRes.data);
    
    // Fetch assignments with faculty details
    if (assignRes.data) {
      const assignmentsWithProfiles = await Promise.all(
        assignRes.data.map(async (assignment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", assignment.faculty_id)
            .single();
          
          return { ...assignment, profiles: profile };
        })
      );
      setAssignments(assignmentsWithProfiles);
    }
    
    // Fetch faculty users
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "faculty");
    
    if (userRoles) {
      const facultyIds = userRoles.map(ur => ur.user_id);
      const { data: facultyProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", facultyIds);
      
      if (facultyProfiles) setFaculty(facultyProfiles);
    }

    setLoading(false);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("sections").insert({
      name: formData.name,
      department_id: formData.departmentId,
      year: parseInt(formData.year),
      semester: parseInt(formData.semester)
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Section created successfully");
      setDialogOpen(false);
      setFormData({ name: "", departmentId: "", year: "", semester: "" });
      fetchData();
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("faculty_sections").insert({
      faculty_id: assignData.facultyId,
      section_id: assignData.sectionId,
      subject: assignData.subject
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Faculty assigned successfully");
      setAssignDialogOpen(false);
      setAssignData({ facultyId: "", sectionId: "", subject: "" });
      fetchData();
    }
  };

  const handleDeleteSection = async (id: string) => {
    const { error } = await supabase.from("sections").delete().eq("id", id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Section deleted");
      fetchData();
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Manage Sections</h1>
            <p className="text-muted-foreground">Create sections and assign faculty</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Section</DialogTitle>
                <DialogDescription>Add a new section to the department</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div className="space-y-2">
                  <Label>Section Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="A, B, C..."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({...formData, departmentId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      placeholder="1, 2, 3, 4"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Input
                      type="number"
                      value={formData.semester}
                      onChange={(e) => setFormData({...formData, semester: e.target.value})}
                      placeholder="1-8"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">Create Section</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Assign Faculty
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Faculty to Section</DialogTitle>
                <DialogDescription>Map faculty members to sections and subjects</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAssignFaculty} className="space-y-4">
                <div className="space-y-2">
                  <Label>Faculty</Label>
                  <Select value={assignData.facultyId} onValueChange={(v) => setAssignData({...assignData, facultyId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name} ({f.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={assignData.sectionId} onValueChange={(v) => setAssignData({...assignData, sectionId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.departments?.name} - {s.name} (Year {s.year}, Sem {s.semester})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={assignData.subject}
                    onChange={(e) => setAssignData({...assignData, subject: e.target.value})}
                    placeholder="Data Structures, DBMS, etc."
                    required
                  />
                </div>

                <Button type="submit" className="w-full">Assign Faculty</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>All sections in your college</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(section => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium">{section.name}</TableCell>
                  <TableCell>{section.departments?.name}</TableCell>
                  <TableCell>{section.year}</TableCell>
                  <TableCell>{section.semester}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faculty Assignments</CardTitle>
          <CardDescription>Faculty members assigned to sections</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Section</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(assignment => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.profiles?.full_name}</TableCell>
                  <TableCell>{assignment.subject}</TableCell>
                  <TableCell>
                    {sections.find(s => s.id === assignment.section_id)?.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
