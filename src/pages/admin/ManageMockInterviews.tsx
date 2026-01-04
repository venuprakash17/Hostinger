import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Video, MapPin, Plus, Loader2, Search, CheckCircle2, XCircle, X, Users, Filter, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface MockInterview {
  id: number;
  title: string;
  interview_type: 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral' | 'group_discussion';
  description?: string;
  student_id?: number;
  student_ids?: number[];
  students?: Array<{ id: number; email: string; full_name?: string }>;
  interviewer_id?: number;
  interviewer_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
  venue?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
}

interface Student {
  id: number;
  email: string;
  full_name?: string | null;
  department?: string | null;
  section?: string | null;
  present_year?: string | null;
  roll_number?: string | null;
  college_id?: number | null;
}

interface Faculty {
  id: number;
  name: string;
  email: string;
  department?: string | null;
}

interface DepartmentOption {
  id: number;
  name: string;
  code: string | null;
}

export default function ManageMockInterviews() {
  const [interviews, setInterviews] = useState<MockInterview[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearchName, setStudentSearchName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const { toast } = useToast();

  // Filter states
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    interview_type: 'mock' as 'technical' | 'hr' | 'managerial' | 'mock' | 'behavioral' | 'group_discussion',
    description: '',
    interviewer_id: undefined as number | undefined,
    interviewer_name: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_link: '',
    venue: '',
    use_faculty_interviewer: false, // Toggle between faculty dropdown and name input
  });

  // Fetch user profile to get college_id
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiClient.getCurrentUserProfile();
        if (profile.college_id) {
          setCollegeId(profile.college_id);
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Fetch departments and faculty when college is available
  useEffect(() => {
    if (collegeId) {
      fetchDepartments();
      fetchStudents();
      fetchFaculty();
    }
  }, [collegeId]);

  // Fetch students when filters change
  useEffect(() => {
    if (collegeId) {
      fetchStudents();
    }
  }, [filterDepartment, filterSection, filterYear, studentSearchName, collegeId]);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.getDepartments(collegeId!);
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchFaculty = async () => {
    try {
      const data = await apiClient.getAvailableFaculty();
      setFaculty(data || []);
    } catch (error: any) {
      console.error("Error fetching faculty:", error);
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getScheduledInterviews({});
      setInterviews(data || []);
    } catch (error: any) {
      console.error("Error fetching interviews:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load interviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!collegeId) return;
    
    try {
      setStudentsLoading(true);
      const params = new URLSearchParams();
      if (filterDepartment) params.append('department', filterDepartment);
      if (filterSection) params.append('section', filterSection);
      if (filterYear) params.append('present_year', filterYear);
      if (studentSearchName) params.append('search', studentSearchName);
      params.append('is_active', 'true');
      
      const queryString = params.toString();
      const url = `/users/colleges/${collegeId}/students${queryString ? `?${queryString}` : ''}`;
      const data = await apiClient.get<Student[]>(url);
      setStudents(data || []);
      setAllStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSearchStudentByName = () => {
    // This will trigger useEffect to fetch students with search term
    fetchStudents();
  };

  const handleAddStudent = (student: Student) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      toast({
        title: "Already Added",
        description: "This student is already selected",
      });
      return;
    }
    setSelectedStudents([...selectedStudents, student]);
    toast({
      title: "Added",
      description: `Added ${student.full_name || student.email} to the interview`,
    });
  };

  const handleRemoveStudent = (studentId: number) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  // Get unique sections and years from students
  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    allStudents.forEach(student => {
      if (student.section) sections.add(student.section);
    });
    return Array.from(sections).sort();
  }, [allStudents]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    allStudents.forEach(student => {
      if (student.present_year) years.add(student.present_year);
    });
    return Array.from(years).sort();
  }, [allStudents]);

  const handleApplyFilters = () => {
    fetchStudents();
    setFilterDialogOpen(false);
  };

  const handleClearFilters = () => {
    setFilterDepartment('');
    setFilterSection('');
    setFilterYear('');
    setStudentSearchName('');
    fetchStudents();
    setFilterDialogOpen(false);
  };

  const filteredStudentsForSelection = useMemo(() => {
    return students.filter(student => 
      !selectedStudents.find(selected => selected.id === student.id)
    );
  }, [students, selectedStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || selectedStudents.length === 0 || !formData.scheduled_at) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Title, at least one Student, Scheduled Date & Time)",
        variant: "destructive",
      });
      return;
    }

    try {
      const studentIds = selectedStudents.map(s => s.id);
      
      await apiClient.createMockInterview({
        title: formData.title,
        interview_type: formData.interview_type,
        description: formData.description || undefined,
        student_ids: studentIds,
        student_id: studentIds[0],
        interviewer_id: formData.interviewer_id,
        interviewer_name: formData.interviewer_name || undefined,
        scheduled_at: formData.scheduled_at,
        duration_minutes: formData.duration_minutes,
        meeting_link: formData.meeting_link || undefined,
        venue: formData.venue || undefined,
      });

      toast({
        title: "Success",
        description: `Interview scheduled successfully with ${selectedStudents.length} student(s)`,
      });

      setOpen(false);
      setFormData({
        title: '',
        interview_type: 'mock',
        description: '',
        interviewer_id: undefined,
        interviewer_name: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_link: '',
        venue: '',
        use_faculty_interviewer: false,
      });
      setSelectedStudents([]);
      setStudentSearchName('');
      fetchInterviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive",
      });
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeFiltersCount = [filterDepartment, filterSection, filterYear, studentSearchName].filter(f => f).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Mock Interviews</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage mock interviews and group discussions for students</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Mock Interview / Group Discussion</DialogTitle>
              <DialogDescription>
                Add students to the interview. Use filters to find students by department, section, year, or search by name.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Technical Interview - Round 1"
                  required
                />
              </div>

              <div>
                <Label>Interview Type *</Label>
                <Select 
                  value={formData.interview_type} 
                  onValueChange={(value: any) => setFormData({ ...formData, interview_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock Interview</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="managerial">Managerial</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="group_discussion">Group Discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Students * ({selectedStudents.length} selected)</Label>
                  <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Filter Students</DialogTitle>
                        <DialogDescription>
                          Filter students by department, section, year, or search by name
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Search by Name/Email/Roll Number</Label>
                          <Input
                            placeholder="Search students..."
                            value={studentSearchName}
                            onChange={(e) => setStudentSearchName(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Department</Label>
                          <Select 
                            value={filterDepartment || "all"} 
                            onValueChange={(value) => setFilterDepartment(value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All departments" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All departments</SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.name}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Section</Label>
                          <Select 
                            value={filterSection || "all"} 
                            onValueChange={(value) => setFilterSection(value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All sections" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All sections</SelectItem>
                              {uniqueSections.map((section) => (
                                <SelectItem key={section} value={section}>
                                  {section}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Year</Label>
                          <Select 
                            value={filterYear || "all"} 
                            onValueChange={(value) => setFilterYear(value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All years" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All years</SelectItem>
                              {uniqueYears.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleClearFilters}>
                          Clear All
                        </Button>
                        <Button type="button" onClick={handleApplyFilters}>
                          Apply Filters
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Students List with Checkboxes */}
                <Card className="mt-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Available Students ({filteredStudentsForSelection.length})</CardTitle>
                      {studentsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {filteredStudentsForSelection.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {studentsLoading ? 'Loading students...' : 'No students found. Try adjusting your filters.'}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Section</TableHead>
                              <TableHead>Year</TableHead>
                              <TableHead>Roll Number</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStudentsForSelection.map((student) => (
                              <TableRow 
                                key={student.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleAddStudent(student)}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedStudents.some(s => s.id === student.id)}
                                    onCheckedChange={() => {
                                      if (selectedStudents.some(s => s.id === student.id)) {
                                        handleRemoveStudent(student.id);
                                      } else {
                                        handleAddStudent(student);
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {student.full_name || 'N/A'}
                                </TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.department || 'N/A'}</TableCell>
                                <TableCell>{student.section || 'N/A'}</TableCell>
                                <TableCell>{student.present_year || 'N/A'}</TableCell>
                                <TableCell>{student.roll_number || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Selected students */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-semibold">Selected Students ({selectedStudents.length}):</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                      {selectedStudents.map((student) => (
                        <Badge key={student.id} variant="secondary" className="flex items-center gap-1 py-1 px-2 text-sm">
                          <Users className="h-3 w-3" />
                          <span>{student.full_name || student.email}</span>
                          <span className="text-muted-foreground">({student.department || 'N/A'})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Scheduled Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  min={15}
                  max={180}
                />
              </div>

              <div>
                <Label>Meeting Link (Zoom/Google Meet)</Label>
                <Input
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>

              <div>
                <Label>Venue (for offline interviews)</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Room number, Building name, etc."
                />
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="use_faculty_interviewer"
                    checked={formData.use_faculty_interviewer}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        use_faculty_interviewer: e.target.checked,
                        interviewer_id: e.target.checked ? undefined : formData.interviewer_id,
                        interviewer_name: e.target.checked ? '' : formData.interviewer_name
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use_faculty_interviewer" className="cursor-pointer">
                    Assign Faculty Interviewer (from same college)
                  </Label>
                </div>
                
                {formData.use_faculty_interviewer ? (
                  <Select
                    value={formData.interviewer_id?.toString() || ""}
                    onValueChange={(value) => {
                      const facultyMember = faculty.find(f => f.id.toString() === value);
                      setFormData({ 
                        ...formData, 
                        interviewer_id: parseInt(value),
                        interviewer_name: facultyMember?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((fac) => (
                        <SelectItem key={fac.id} value={fac.id.toString()}>
                          {fac.name} ({fac.email}) {fac.department && `- ${fac.department}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.interviewer_name}
                    onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                    placeholder="Name of the interviewer (external)"
                  />
                )}
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Additional details about the interview"
                />
              </div>

              <Button type="submit" className="w-full">Schedule Interview</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search interviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Interviews Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading interviews...</p>
          </CardContent>
        </Card>
      ) : filteredInterviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No interviews scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Interviews ({filteredInterviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((interview) => {
                    const studentList = interview.students || [];
                    const studentIds = interview.student_ids || (interview.student_id ? [interview.student_id] : []);
                    
                    return (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">{interview.title}</TableCell>
                        <TableCell>
                          {studentList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {studentList.map((student, idx) => (
                                <Badge key={student.id} variant="outline" className="text-xs">
                                  {student.full_name || student.email}
                                  {idx < studentList.length - 1 && ','}
                                </Badge>
                              ))}
                              {studentList.length > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {studentList.length} students
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {studentIds.length > 0 ? `Student ID(s): ${studentIds.join(', ')}` : 'No students'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {interview.interview_type === 'group_discussion' ? 'Group Discussion' :
                             interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(interview.scheduled_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{interview.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {interview.meeting_link && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                                  Join
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
