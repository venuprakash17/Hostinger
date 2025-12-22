import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MapPin, Users, BarChart3, ArrowLeft, Search, Upload, CheckSquare, Square, ArrowUp, Filter, X, Ban, Unlock, Shield, UserPlus, Briefcase, Building2 } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { formatYear, parseYear, getYearOptions } from "@/utils/yearFormat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";

interface College {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: string;
  created_at: string;
  updated_at: string | null;
}

interface Student {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  section: string | null;
  roll_number: string | null;
  present_year: string | null;
  college_id: number | null;
  roles: Array<{ role: string; college_id: number | null }>;
  is_active: boolean;
  created_at: string;
}

interface Staff {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  department_id: number | null;
  college_id: number | null;
  roles: Array<{ role: string; college_id: number | null }>;
  is_active: boolean;
  created_at: string;
  handled_years?: string | null;
  handled_sections?: string | null;
  staff_id?: string | null;
}

interface Analytics {
  total_students: number;
  total_faculty: number;
  total_admins: number;
  students_by_department: Record<string, number>;
  students_by_section: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const verticalOptions = [
  "B.Tech",
  "B.E",
  "Degree",
  "Medical",
  "Diploma",
  "MBA",
  "MCA",
  "Other",
];

export default function ManageColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>(""); // "active", "blocked", or "" for all
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkPromoteDialogOpen, setBulkPromoteDialogOpen] = useState(false);
  const [deleteYearDialogOpen, setDeleteYearDialogOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string>("");
  const [blockYearDialogOpen, setBlockYearDialogOpen] = useState(false);
  const [yearToBlock, setYearToBlock] = useState<string>("");
  const [blockYearAction, setBlockYearAction] = useState<boolean>(true); // true = block, false = unblock
  const [blockCollegeDialogOpen, setBlockCollegeDialogOpen] = useState(false);
  const [blockCollegeAction, setBlockCollegeAction] = useState<boolean>(true); // true = block, false = unblock
  const [bulkEditData, setBulkEditData] = useState({
    department: "",
    section: "",
    present_year: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_active: "true"
  });
  const [studentFormData, setStudentFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    department: "",
    section: "",
    roll_number: ""
  });
  const [staffFormData, setStaffFormData] = useState({
    email: "",
    full_name: "",
    role: "faculty" as "faculty" | "hod" | "admin",
    department: "",
    user_id: ""
  });
  const [staffEditDialogOpen, setStaffEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffEditFormData, setStaffEditFormData] = useState({
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [departmentEditDialogOpen, setDepartmentEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
  const [departmentEditFormData, setDepartmentEditFormData] = useState({
    name: "",
    code: "",
    branch_id: "",
    number_of_years: "",
    vertical: "",
  });
  const sectionNameOptions = useMemo(() => {
    const names = new Set<string>();
    sections.forEach((section: any) => {
      if (section?.name) {
        names.add(section.name);
      }
    });
    return Array.from(names).sort();
  }, [sections]);

  useEffect(() => {
    fetchColleges();
  }, []);

  useEffect(() => {
    if (selectedCollege) {
      fetchStudents();
      fetchStaff();
      fetchAnalytics();
      fetchDepartments();
      fetchSemesters();
      fetchSubjects();
      fetchSections();
    }
  }, [selectedCollege]);
  
  const fetchDepartments = async (collegeId?: number) => {
    const targetCollegeId = collegeId || selectedCollege?.id;
    if (!targetCollegeId) return;
    try {
      const data = await apiClient.getDepartments(targetCollegeId);
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleOpenDepartmentEditDialog = (dept: any) => {
    setSelectedDepartment(dept);
    const existingVertical = dept.vertical || "";
    setDepartmentEditFormData({
      name: dept.name,
      code: dept.code || "",
      branch_id: dept.branch_id || "",
      number_of_years: dept.number_of_years ? dept.number_of_years.toString() : "",
      vertical: existingVertical,
    });
    setDepartmentEditDialogOpen(true);
  };

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      const yearsValue = departmentEditFormData.number_of_years 
        ? parseInt(departmentEditFormData.number_of_years, 10) 
        : null;
      
      if (yearsValue !== null && (isNaN(yearsValue) || yearsValue <= 0)) {
        toast.error("Number of years must be a positive number");
        return;
      }

      await apiClient.put(`/academic/departments/${selectedDepartment.id}`, {
        name: departmentEditFormData.name,
        code: departmentEditFormData.code || undefined,
        branch_id: departmentEditFormData.branch_id || undefined,
        number_of_years: yearsValue || undefined,
        vertical: departmentEditFormData.vertical || undefined,
      });
      
      toast.success("Department updated successfully!");
      setDepartmentEditDialogOpen(false);
      setSelectedDepartment(null);
      await fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    }
  };

  const handleDeleteDepartment = async (deptId: number, deptName: string) => {
    if (!confirm(`Are you sure you want to delete "${deptName}"? This action cannot be undone and will affect all associated users and data.`)) {
      return;
    }

    try {
      // Deactivate the department instead of hard delete
      await apiClient.put(`/academic/departments/${deptId}`, { is_active: false });
      toast.success(`Department "${deptName}" deactivated successfully!`);
      await fetchDepartments();
      fetchAnalytics(); // Refresh analytics
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Failed to delete department');
    }
  };

  const fetchSemesters = async (collegeId?: number) => {
    const targetCollegeId = collegeId || selectedCollege?.id;
    if (!targetCollegeId) return;
    try {
      const data = await apiClient.getSemesters(targetCollegeId);
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };

  const fetchSubjects = async (collegeId?: number) => {
    const targetCollegeId = collegeId || selectedCollege?.id;
    if (!targetCollegeId) return;
    try {
      const data = await apiClient.getSubjects(targetCollegeId);
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSections = async (collegeId?: number) => {
    const targetCollegeId = collegeId || selectedCollege?.id;
    if (!targetCollegeId) return;
    try {
      const data = await apiClient.getSections(targetCollegeId);
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  useEffect(() => {
    if (!staffEditDialogOpen || sections.length === 0) return;
    setStaffEditFormData((prev) => ({
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
  }, [sections, staffEditDialogOpen]);

  // Refetch when filters or search change (with debounce for search)
  useEffect(() => {
    if (selectedCollege) {
      // Debounce search to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchStudents();
      }, searchTerm ? 500 : 0); // 500ms delay if searching, immediate if clearing
      
      return () => clearTimeout(timeoutId);
    }
  }, [filterDepartment, filterSection, filterYear, filterStatus, debouncedSearchTerm, selectedCollege]);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<College[]>('/colleges');
      setColleges(data || []);
    } catch (error: any) {
      console.error('Error fetching colleges:', error);
      toast.error(error.message || 'Failed to fetch colleges');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCollege) return;
    
    try {
      setStudentsLoading(true);
      const params = new URLSearchParams();
      if (filterDepartment) params.append('department', filterDepartment);
      if (filterSection) params.append('section', filterSection);
      if (filterYear) {
        params.append('present_year', filterYear);
        console.log('DEBUG: Filtering by year:', filterYear);
      }
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) {
        params.append('is_active', filterStatus === 'active' ? 'true' : 'false');
      }
      
      const queryString = params.toString();
      const url = `/users/colleges/${selectedCollege.id}/students${queryString ? `?${queryString}` : ''}`;
      console.log('DEBUG: Fetching students from URL:', url);
      const data = await apiClient.get<Student[]>(url);
      console.log('DEBUG: Received students:', data?.length || 0, 'students');
      setStudents(data || []);
      setSelectedStudents(new Set()); // Clear selections when filtering
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!selectedCollege) return;
    
    try {
      setStaffLoading(true);
      // Fetch all users for this college and filter by role
      const allUsers = await apiClient.get<any[]>(`/users?college_id=${selectedCollege.id}`);
      
      // Filter to get only staff (faculty, HOD, admin) - exclude students
      const staffMembers = (allUsers || []).filter((user: any) => {
        const roles = user.roles || [];
        return roles.some((r: any) => 
          r.role === 'faculty' || r.role === 'hod' || r.role === 'admin'
        );
      });
      
      // Enrich with profile data including handled_years, handled_sections, and department info
      const enrichedStaff = await Promise.all(staffMembers.map(async (s: any) => {
        try {
          // Get full user data with profile
          const userData = await apiClient.get<any>(`/users/${s.id}`);
          const profile = userData?.profile || userData || s;
          
          // Merge all relevant fields from both main response and profile
          const enriched = {
            ...s,
            // Department information (from main response or profile)
            department: userData?.department || profile?.department || s.department || null,
            department_id: userData?.department_id || profile?.department_id || s.department_id || null,
            // Handled years and sections (from profile) - ensure they're strings or arrays
            handled_years: (() => {
              const value = userData?.handled_years || profile?.handled_years || s.handled_years;
              if (!value) return null;
              if (Array.isArray(value)) return value;
              if (typeof value === 'string') return value;
              // If it's something else (object, number, etc.), convert to string or return null
              return null;
            })(),
            handled_sections: (() => {
              const value = userData?.handled_sections || profile?.handled_sections || s.handled_sections;
              if (!value) return null;
              if (Array.isArray(value)) return value;
              if (typeof value === 'string') return value;
              return null;
            })(),
            // Other profile fields that might be missing
            full_name: userData?.full_name || profile?.full_name || s.full_name || null,
            staff_id: userData?.staff_id || profile?.staff_id || s.staff_id || null,
            college_id: userData?.college_id || profile?.college_id || s.college_id || null,
          };
          
          // Debug log to verify department linking
          if (enriched.department_id && enriched.department) {
            console.log(`[Staff] User ${enriched.id} (${enriched.full_name || enriched.email}): department="${enriched.department}", department_id=${enriched.department_id}`);
          } else if (enriched.department && !enriched.department_id) {
            console.warn(`[Staff] User ${enriched.id} (${enriched.full_name || enriched.email}): department="${enriched.department}" but NO department_id`);
          }
          
          return enriched;
        } catch (error) {
          console.error(`[Staff] Error enriching user ${s.id}:`, error);
          return s;
        }
      }));
      
      setStaff(enrichedStaff);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast.error(error.message || 'Failed to fetch staff');
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedCollege) return;
    
    try {
      const data = await apiClient.get<Analytics>(`/users/colleges/${selectedCollege.id}/analytics`);
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleOpenDialog = (college?: College) => {
    if (college) {
      setSelectedCollege(college);
      setFormData({
        name: college.name,
        code: college.code,
        address: college.address || "",
        city: college.city || "",
        state: college.state || "",
        pincode: college.pincode || "",
        is_active: college.is_active || "true"
      });
      setEditDialogOpen(true);
    } else {
      setSelectedCollege(null);
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        is_active: "true"
      });
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditDialogOpen(false);
    setStudentDialogOpen(false);
    setSelectedCollege(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: ""
    });
    setStudentFormData({
      email: "",
      password: "",
      full_name: "",
      department: "",
      section: "",
      roll_number: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error("College name and code are required");
      return;
    }

    try {
      if (selectedCollege) {
        await apiClient.put(`/colleges/${selectedCollege.id}`, formData);
        toast.success("College updated successfully!");
    } else {
        const { is_active, ...createData } = formData;
        await apiClient.post('/colleges', createData);
        toast.success("College created successfully!");
      }
      
      handleCloseDialog();
      await fetchColleges();
    } catch (error: any) {
      console.error('Error saving college:', error);
      toast.error(error.message || 'Failed to save college');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCollege || !staffFormData.email) {
      toast.error("Email is required");
      return;
    }

    if (staffFormData.role === "admin" && !selectedCollege.id) {
      toast.error("College must be selected for admin role");
      return;
    }

    try {
      const payload: any = {
        email: staffFormData.email,
        full_name: staffFormData.full_name || undefined,
        role: staffFormData.role,
        department: staffFormData.department || undefined,
        user_id: staffFormData.user_id || undefined,
      };

      // Add college_id for admin role
      if (staffFormData.role === "admin") {
        payload.college_id = selectedCollege.id;
      }

      // Years and sections will be assigned by college admin later

      const response = await apiClient.post<Staff>(
        `/users${selectedCollege.id ? `?college_id=${selectedCollege.id}` : ''}`,
        payload
      );
      
      toast.success(`${staffFormData.role.charAt(0).toUpperCase() + staffFormData.role.slice(1)} added successfully!`);
      setStaffDialogOpen(false);
      setStaffFormData({
        email: "",
        full_name: "",
        role: "faculty",
        department: "",
        user_id: ""
      });
      await fetchStaff();
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error(error.message || 'Failed to add staff');
    }
  };

  const handleOpenStaffEditDialog = async (member: Staff) => {
    setSelectedStaff(member);
    
    try {
      // Fetch users from list endpoint which includes handled_years and handled_sections
      const allUsers = await apiClient.get<any[]>(`/users?college_id=${selectedCollege?.id}`);
      const userData = allUsers.find((u: any) => u.id === member.id);
      
      if (!userData) {
        toast.error('User not found');
        return;
      }
      
      // Fetch subject assignments if user is faculty
      let subjectAssignments = [];
      if (member.roles.some(r => r.role === 'faculty')) {
        try {
          const assignments = await apiClient.getSubjectAssignments(member.id);
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
      
      // Parse handled_years and handled_sections from the userData
      const handledYears = userData.handled_years ? 
        (Array.isArray(userData.handled_years) ? userData.handled_years : 
         typeof userData.handled_years === 'string' ? userData.handled_years.split(',').map((y: string) => y.trim()).filter(Boolean) : []) : [];
      const handledSections = userData.handled_sections ?
        (Array.isArray(userData.handled_sections) ? userData.handled_sections :
         typeof userData.handled_sections === 'string' ? userData.handled_sections.split(',').map((s: string) => s.trim()).filter(Boolean) : []) : [];
      
      // Get current role (primary role)
      const currentRole = userData.roles?.[0]?.role || member.roles?.[0]?.role || "";
      
      // Fetch departments and sections for the user's college
      if (userData.college_id) {
        await fetchDepartments(userData.college_id);
        await fetchSections(userData.college_id);
      }
      
      // Fetch subjects and semesters
      await fetchSubjects();
      await fetchSemesters();
      
      setStaffEditFormData({
        full_name: userData.full_name || member.full_name || "",
        department: userData.department || member.department || "",
        section: userData.section || "",
        roll_number: userData.roll_number || "",
        staff_id: userData.staff_id || "",
        college_id: userData.college_id || null,
        role: currentRole,
        present_year: userData.present_year || "",
        subject_assignments: subjectAssignments,
        handled_years: handledYears,
        handled_sections: handledSections,
      });
      setStaffEditDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching staff details:', error);
      toast.error(error.message || 'Failed to load staff details');
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setLoading(true);
    try {
      await apiClient.put(`/users/${selectedStaff.id}`, staffEditFormData);
      toast.success("Staff member updated successfully!");
      setStaffEditDialogOpen(false);
      await fetchStaff();
      await fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff member");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCollege || !studentFormData.email || !studentFormData.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      // Create user with college_id as query parameter
      const response = await apiClient.post<Student>(
        `/users?college_id=${selectedCollege.id}`,
        {
          ...studentFormData,
          role: "student"
        }
      );
      
      toast.success("Student added successfully!");
      setStudentDialogOpen(false);
      setStudentFormData({
        email: "",
        password: "",
        full_name: "",
        department: "",
        section: "",
        roll_number: ""
      });
      await fetchStudents();
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    }
  };

  const handleUpdateStudent = async (student: Student) => {
    try {
      await apiClient.put(`/users/${student.id}`, {
        full_name: student.full_name,
        department: student.department,
        section: student.section,
        roll_number: student.roll_number,
        present_year: student.present_year
      });
      toast.success("Student updated successfully!");
      await fetchStudents();
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast.error(error.message || 'Failed to update student');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this college? This action cannot be undone and will affect all associated users and data.")) {
      return;
    }

    try {
      await apiClient.delete(`/colleges/${id}`);
      toast.success("College deleted successfully!");
      if (selectedCollege?.id === id) {
        setSelectedCollege(null);
      }
      fetchColleges();
    } catch (error: any) {
      console.error('Error deleting college:', error);
      toast.error(error.message || 'Failed to delete college');
    }
  };

  const handleBulkEdit = async () => {
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }
    
    try {
      const studentIds = Array.from(selectedStudents);
      const updateData: any = {};
      if (bulkEditData.department) updateData.department = bulkEditData.department;
      if (bulkEditData.section) updateData.section = bulkEditData.section;
      if (bulkEditData.present_year) updateData.present_year = bulkEditData.present_year;
      
      const response = await apiClient.post('/users/bulk-edit', {
        student_ids: studentIds,
        update_data: updateData
      });
      
      toast.success(`Successfully updated ${response.updated_count} students`);
      setBulkEditDialogOpen(false);
      setSelectedStudents(new Set());
      setBulkEditData({ department: "", section: "", present_year: "" });
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk edit students');
    }
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }
    
    try {
      const studentIds = Array.from(selectedStudents);
      const response = await apiClient.post('/users/bulk-promote', {
        student_ids: studentIds
      });
      
      toast.success(`Successfully promoted ${response.promoted_count} students`);
      setBulkPromoteDialogOpen(false);
      setSelectedStudents(new Set());
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk promote students');
    }
  };

  const handleDeleteByYear = async () => {
    if (!selectedCollege || !yearToDelete) {
      toast.error("Please select a year to delete");
      return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ALL ${formatYear(yearToDelete)} year students from ${selectedCollege.name}? This action cannot be undone!`)) {
      return;
    }
    
    try {
      console.log('DEBUG: Deleting students by year:', { college_id: selectedCollege.id, present_year: yearToDelete });
      const response = await apiClient.post('/users/delete-by-year', {
        college_id: selectedCollege.id,
        present_year: yearToDelete
      });
      console.log('DEBUG: Delete response:', response);
      toast.success(`Successfully deleted ${response.deleted_count} ${formatYear(yearToDelete)} year student${response.deleted_count !== 1 ? 's' : ''}`);
      setDeleteYearDialogOpen(false);
      setYearToDelete("");
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      console.error('Error deleting students by year:', error);
      console.error('Error details:', {
        message: error.message,
        status: (error as any).status,
        name: error.name
      });
      const errorMessage = error.message || 'Failed to delete students';
      if (errorMessage.includes('Failed to connect') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Failed to connect to server. Please check your connection.');
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('Not authenticated')) {
        toast.error('Authentication required. Please log in again.');
    } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone!`)) {
      return;
    }
    
    try {
      await apiClient.delete(`/users/${userId}`);
      toast.success(`Successfully deleted ${userName}`);
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      const response = await apiClient.post('/users/block', {
        user_ids: [userId],
        block: block
      });
      toast.success(response.message);
      fetchStudents();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error(error.message || 'Failed to block user');
    }
  };

  const handleBlockYear = async () => {
    if (!selectedCollege || !yearToBlock) {
      toast.error(`Please select a year to ${blockYearAction ? 'block' : 'unblock'}`);
      return;
    }
    
    if (!confirm(`Are you sure you want to ${blockYearAction ? 'block' : 'unblock'} ALL ${formatYear(yearToBlock)} year students from ${selectedCollege.name}?`)) {
      return;
    }
    
    try {
      console.log('Blocking year:', { college_id: selectedCollege.id, present_year: yearToBlock, block: blockYearAction });
      const response = await apiClient.post('/users/block-year', {
        college_id: selectedCollege.id,
        present_year: yearToBlock,
        block: blockYearAction
      });
      toast.success(response.message);
      setBlockYearDialogOpen(false);
      setYearToBlock("");
      setBlockYearAction(true); // Reset to block
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      console.error('Error blocking year:', error);
      const errorMessage = error.message || 'Failed to block users';
      if (errorMessage.includes('Failed to connect') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Failed to connect to server. Please check your connection.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleBlockCollege = async () => {
    if (!selectedCollege) {
      toast.error("Please select a college");
      return;
    }
    
    if (!confirm(`Are you sure you want to ${blockCollegeAction ? 'block' : 'unblock'} ALL users in ${selectedCollege.name}?`)) {
      return;
    }
    
    try {
      const response = await apiClient.post('/users/block-college', {
        college_id: selectedCollege.id,
        block: blockCollegeAction
      });
      toast.success(response.message);
      setBlockCollegeDialogOpen(false);
      setBlockCollegeAction(true); // Reset to block
      fetchStudents();
      fetchAnalytics();
    } catch (error: any) {
      console.error('Error blocking college:', error);
      const errorMessage = error.message || 'Failed to block users';
      if (errorMessage.includes('Failed to connect') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Failed to connect to server. Please check your connection.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  // If a college is selected, show details with tabs
  if (selectedCollege) {
    const departmentData = analytics?.students_by_department 
      ? Object.entries(analytics.students_by_department).map(([name, value]) => ({ name, value }))
      : [];
    
    const sectionData = analytics?.students_by_section
      ? Object.entries(analytics.students_by_section).map(([name, value]) => ({ name, value }))
      : [];

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedCollege(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Colleges
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{selectedCollege.name}</h1>
              <p className="text-muted-foreground mt-1">Code: {selectedCollege.code}</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog(selectedCollege)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit College
          </Button>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Briefcase className="h-4 w-4 mr-2" />
              Staff ({staff.length})
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="info">College Info</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            {/* Filters */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-5 w-5" />
                    Filters & Search
                  </CardTitle>
                  {(filterDepartment || filterSection || filterYear || searchTerm) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {[filterDepartment, filterSection, filterYear, searchTerm].filter(Boolean).length} active
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setFilterDepartment("");
                          setFilterSection("");
                          setFilterYear("");
                          setSearchTerm("");
                          fetchStudents();
                        }}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search Students</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="Search by name, email, roll number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            fetchStudents();
                          }
                        }}
                        className="pl-10 h-10"
                      />
                    </div>
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          fetchStudents();
                        }}
                        className="h-10 w-10 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => fetchStudents()}
                      className="h-10"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Department</Label>
                    <Select value={filterDepartment || "all"} onValueChange={(v) => { setFilterDepartment(v === "all" ? "" : v); }}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {[...new Set(students.map(s => s.department).filter(Boolean))].sort().map(dept => (
                          <SelectItem key={dept} value={dept || "unknown"}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Section</Label>
                    <Select value={filterSection || "all"} onValueChange={(v) => { setFilterSection(v === "all" ? "" : v); }}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {[...new Set(students.map(s => s.section).filter(Boolean))].sort().map(section => (
                          <SelectItem key={section} value={section || "unknown"}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Academic Year</Label>
                    <Select 
                      value={filterYear || "all"} 
                      onValueChange={(v) => { 
                        const newValue = v === "all" ? "" : v;
                        setFilterYear(newValue);
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {getYearOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(filterDepartment || filterSection || filterYear || filterStatus || searchTerm) && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
                      {searchTerm && (
                        <Badge variant="secondary" className="gap-1">
                          Search: "{searchTerm}"
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              fetchStudents();
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filterDepartment && (
                        <Badge variant="secondary" className="gap-1">
                          Department: {filterDepartment}
                          <button
                            onClick={() => {
                              setFilterDepartment("");
                              fetchStudents();
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filterSection && (
                        <Badge variant="secondary" className="gap-1">
                          Section: {filterSection}
                          <button
                            onClick={() => {
                              setFilterSection("");
                              fetchStudents();
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filterYear && (
                        <Badge variant="secondary" className="gap-1">
                          Year: {formatYear(filterYear)}
                          <button
                            onClick={() => {
                              setFilterYear("");
                              fetchStudents();
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {filterStatus && (
                        <Badge variant="secondary" className="gap-1">
                          Status: {filterStatus === 'active' ? 'Active' : 'Blocked'}
                          <button
                            onClick={() => {
                              setFilterStatus("");
                              fetchStudents();
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Summary & Actions Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {!studentsLoading && (
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{students.length}</span> student{students.length !== 1 ? 's' : ''}
                    {(filterDepartment || filterSection || filterYear || filterStatus || searchTerm) && (
                      <span className="ml-1 text-xs">(filtered)</span>
                    )}
                  </div>
                )}
                {selectedStudents.size > 0 && (
                  <Badge variant="default" className="font-semibold">
                    {selectedStudents.size} selected
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedStudents.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setBulkEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bulk Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkPromoteDialogOpen(true)}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bulk Promote
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudents(new Set())}>
                      Clear Selection
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setStudentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
                <Button variant="outline" onClick={() => setDeleteYearDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete by Year
                </Button>
                <Button variant="outline" onClick={() => setBlockYearDialogOpen(true)}>
                  <Ban className="h-4 w-4 mr-2" />
                  Block by Year
                </Button>
                <Button variant="outline" onClick={() => setBlockCollegeDialogOpen(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Block All Users
                </Button>
              </div>
            </div>

            {/* Bulk Upload Section */}
            <div className="mb-6">
              <FileUpload
                endpoint="/bulk-upload/students"
                accept=".csv,.xlsx,.xls"
                label="Upload Students CSV/Excel"
                description="Upload a CSV or Excel file to bulk add students to this college. Make sure to download the template first to ensure correct format."
                templateUrl="/bulk-upload/template/students"
                templateFileName="student_upload_template.csv"
                queryParams={{ college_id: selectedCollege.id }}
                onSuccess={(result) => {
                  fetchStudents();
                  fetchAnalytics();
                }}
              />
            </div>

            <Card>
              <CardContent className="p-0">
                {studentsLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-16 text-center border-dashed border-t">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      {filterDepartment || filterSection || filterYear || filterStatus || searchTerm
                        ? "No students found"
                        : "No students yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      {filterDepartment || filterSection || filterYear || filterStatus || searchTerm
                        ? "Try adjusting your filters or search terms to find students."
                        : "Start by adding students to this college using the upload feature or add student button."}
                    </p>
                    {(filterDepartment || filterSection || filterYear || filterStatus || searchTerm) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterDepartment("");
                          setFilterSection("");
                          setFilterYear("");
                          setFilterStatus("");
                          setSearchTerm("");
                          fetchStudents();
                        }}
                        className="mt-2"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectAll}
                            className="h-8 w-8 p-0"
                          >
                            {selectedStudents.size === students.length ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow 
                          key={student.id}
                          className={!student.is_active ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800" : ""}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStudentSelection(student.id)}
                              className="h-8 w-8 p-0"
                            >
                              {selectedStudents.has(student.id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <StudentRow
                            student={student}
                            onUpdate={handleUpdateStudent}
                            onDelete={handleDeleteUser}
                            onBlock={handleBlockUser}
                          />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Staff Management</h2>
                <p className="text-muted-foreground">Manage faculty, HOD, and admin for {selectedCollege.name}</p>
              </div>
              <Button onClick={() => setStaffDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </div>

            {/* Bulk Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  endpoint="/bulk-upload/staff"
                  accept=".csv,.xlsx,.xls"
                  label="Upload Staff (Faculty/HOD/Admin) CSV/Excel"
                  description={`Upload Faculty, HOD, and College Admin for ${selectedCollege.name}. College ID will be automatically applied from the upload context. Download the Excel template (not CSV) to get the enhanced version with Instructions and Staff sheets.`}
                  templateUrl="/bulk-upload/template/staff"
                  templateFileName="staff_upload_template_enhanced.xlsx"
                  queryParams={{ college_id: selectedCollege.id }}
                  onSuccess={(result) => {
                    toast.success(`Successfully imported ${result.success_count} staff members!`);
                    fetchStaff();
                    fetchAnalytics();
                  }}
                />
                <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded mt-2">
                  💡 <strong>Tip:</strong> College ID <strong>{selectedCollege.id}</strong> will be automatically applied to all uploaded staff members.
                </p>
              </CardContent>
            </Card>

            {/* Staff List */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Members</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {staffLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading staff...</p>
                  </div>
                ) : staff.length === 0 ? (
                  <div className="py-16 text-center border-dashed border-t">
                    <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No staff members yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Start by adding staff members to this college using the upload feature or add staff button.
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
                        <TableHead>Years Handled</TableHead>
                        <TableHead>Sections Handled</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {member.roles.map((r, idx) => (
                                <Badge key={idx} variant="outline">
                                  {r.role.charAt(0).toUpperCase() + r.role.slice(1)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{member.department || "N/A"}</TableCell>
                          <TableCell>
                            {member.handled_years ? (
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  // Safely handle handled_years - could be string, array, or other types
                                  if (Array.isArray(member.handled_years)) {
                                    return member.handled_years;
                                  }
                                  if (typeof member.handled_years === 'string' && member.handled_years.trim()) {
                                    return member.handled_years.split(',').map((y: string) => y.trim()).filter(Boolean);
                                  }
                                  // If it's not a string or array, return empty array
                                  return [];
                                })().map((y: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {String(y)}
                                  </Badge>
                                ))}
                              </div>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>
                            {member.handled_sections ? (
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(member.handled_sections) 
                                  ? member.handled_sections 
                                  : typeof member.handled_sections === 'string' 
                                    ? member.handled_sections.split(',').map((s: string) => s.trim()).filter(Boolean)
                                    : []
                                ).map((s: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleOpenStaffEditDialog(member)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${member.full_name || member.email}?`)) {
                                    apiClient.delete(`/users/${member.id}`)
                                      .then(() => {
                                        toast.success("Staff member deleted successfully");
                                        fetchStaff();
                                        fetchAnalytics();
                                      })
                                      .catch((error: any) => {
                                        toast.error(error.message || 'Failed to delete staff');
                                      });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Department Management</h2>
                <p className="text-muted-foreground">Manage departments/branches for {selectedCollege.name}</p>
              </div>
            </div>

            {/* Bulk Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload Departments
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload multiple departments at once. All departments will be automatically linked to <strong>{selectedCollege.name}</strong> (College ID: {selectedCollege.id}).
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${apiClient.baseURL}/bulk-upload/template/departments?format=xlsx&college_id=${selectedCollege.id}`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                        });
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `departments_${selectedCollege.name.replace(/\s+/g, '_')}_template.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        toast.success("Template downloaded successfully!");
                      } catch (error) {
                        toast.error("Failed to download template");
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <FileUpload
                  endpoint={`/bulk-upload/departments?college_id=${selectedCollege.id}`}
                  accept=".csv,.xlsx,.xls"
                  label="Upload Departments File"
                  description={`Upload departments for ${selectedCollege.name}. The college_id will be automatically set to ${selectedCollege.id}.`}
                  templateUrl={`/bulk-upload/template/departments?format=xlsx`}
                  templateFileName={`departments_${selectedCollege.name.replace(/\s+/g, '_')}_template.xlsx`}
                  onSuccess={(response: any) => {
                    toast.success(`Successfully uploaded ${response.success_count} departments!`);
                    if (response.failed_count > 0) {
                      toast.warning(`${response.failed_count} departments failed to upload. Check console for details.`);
                      console.log("Failed uploads:", response.failed);
                    }
                    fetchDepartments(selectedCollege.id);
                  }}
                  onError={(error: any) => {
                    toast.error(error.message || "Failed to upload departments");
                  }}
                />

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">File Format:</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>Required columns:</strong> <code className="bg-white dark:bg-gray-800 px-1 rounded">name</code>
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>Optional columns:</strong> <code className="bg-white dark:bg-gray-800 px-1 rounded">code</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">branch_id</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">number_of_years</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">vertical</code>
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                    ✅ <strong>Important:</strong> The <code className="bg-white dark:bg-gray-800 px-1 rounded">college_id</code> is automatically set to <strong>{selectedCollege.id}</strong> for all departments. <span className="text-red-600 dark:text-red-400">Do NOT include college_id in your file!</span>
                  </p>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Example (without college_id):</h4>
                  <div className="text-sm font-mono bg-background p-2 rounded overflow-x-auto">
                    <div className="text-muted-foreground"># Note: college_id is NOT included - it's auto-set</div>
                    <div>name,code,branch_id,number_of_years,vertical</div>
                    <div>Computer Science,CSE,CSE001,4,B.Tech</div>
                    <div>Electronics,ECE,ECE001,4,B.Tech</div>
                    <div>Mechanical Engineering,ME,ME001,4,B.E</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Departments Section */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Departments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View all departments for {selectedCollege.name}
                </p>
              </CardHeader>
              <CardContent>
                {departments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Branch ID</TableHead>
                        <TableHead>Vertical</TableHead>
                        <TableHead>Years</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept: any) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{dept.code || "N/A"}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 rounded">{dept.branch_id || "N/A"}</code></TableCell>
                          <TableCell>{dept.vertical || "N/A"}</TableCell>
                          <TableCell>{dept.number_of_years || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDepartmentEditDialog(dept)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No departments found. Use the bulk upload above to add departments.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Department Dialog */}
            <Dialog open={departmentEditDialogOpen} onOpenChange={setDepartmentEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Department</DialogTitle>
                  <DialogDescription>
                    Update department details for {selectedCollege?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Department Name *</Label>
                    <Input
                      id="edit-name"
                      value={departmentEditFormData.name}
                      onChange={(e) => setDepartmentEditFormData({ ...departmentEditFormData, name: e.target.value })}
                      placeholder="Computer Science"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Code</Label>
                    <Input
                      id="edit-code"
                      value={departmentEditFormData.code}
                      onChange={(e) => setDepartmentEditFormData({ ...departmentEditFormData, code: e.target.value })}
                      placeholder="CSE"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-branch-id">Branch ID</Label>
                    <Input
                      id="edit-branch-id"
                      value={departmentEditFormData.branch_id}
                      onChange={(e) => setDepartmentEditFormData({ ...departmentEditFormData, branch_id: e.target.value })}
                      placeholder="CSE001"
                    />
                    <p className="text-sm text-muted-foreground">
                      Unique identifier for this branch
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-years">Number of Years</Label>
                    <Input
                      id="edit-years"
                      type="number"
                      min={1}
                      max={10}
                      value={departmentEditFormData.number_of_years}
                      onChange={(e) => setDepartmentEditFormData({ ...departmentEditFormData, number_of_years: e.target.value })}
                      placeholder="4"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vertical">Vertical</Label>
                    <Select
                      value={departmentEditFormData.vertical || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setDepartmentEditFormData({ ...departmentEditFormData, vertical: "" });
                        } else {
                          setDepartmentEditFormData({ ...departmentEditFormData, vertical: value });
                        }
                      }}
                    >
                      <SelectTrigger id="edit-vertical">
                        <SelectValue placeholder="Select vertical" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select vertical</SelectItem>
                        {verticalOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDepartmentEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditDepartment}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {analytics ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.total_students}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Faculty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.total_faculty}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Admins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.total_admins}</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {departmentData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Students by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {sectionData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Students by Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sectionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>College Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedCollege.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Code</Label>
                    <p className="font-medium">{selectedCollege.code}</p>
                  </div>
                  {selectedCollege.address && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{selectedCollege.address}</p>
                    </div>
                  )}
                  {selectedCollege.city && (
                    <div>
                      <Label className="text-muted-foreground">City</Label>
                      <p className="font-medium">{selectedCollege.city}</p>
                    </div>
                  )}
                  {selectedCollege.state && (
                    <div>
                      <Label className="text-muted-foreground">State</Label>
                      <p className="font-medium">{selectedCollege.state}</p>
                    </div>
                  )}
                  {selectedCollege.pincode && (
                    <div>
                      <Label className="text-muted-foreground">Pincode</Label>
                      <p className="font-medium">{selectedCollege.pincode}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit College Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={() => setEditDialogOpen(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit College</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form fields same as before */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>College Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
                <div className="space-y-2">
                  <Label>College Code *</Label>
                <Input
                  value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                    maxLength={50}
                />
              </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
                <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  maxLength={10}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update College</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Staff Dialog */}
        <Dialog open={staffDialogOpen} onOpenChange={() => setStaffDialogOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Add a faculty, HOD, or admin to {selectedCollege?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    required
                    placeholder="faculty@example.com"
                  />
      </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={staffFormData.role}
                    onValueChange={(value: "faculty" | "hod" | "admin") => setStaffFormData({ ...staffFormData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="hod">HOD (Head of Department)</SelectItem>
                      <SelectItem value="admin">College Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={staffFormData.full_name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, full_name: e.target.value })}
                  placeholder="Dr. John Doe"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={staffFormData.department}
                    onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>User ID (for password)</Label>
                  <Input
                    value={staffFormData.user_id}
                    onChange={(e) => setStaffFormData({ ...staffFormData, user_id: e.target.value })}
                    placeholder="FAC001, HOD001, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Password will be auto-generated from this (in uppercase)
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                💡 <strong>Note:</strong> Years handled, sections handled, and subject assignments will be managed by the college admin after staff creation.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Staff</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Student Dialog */}
        <Dialog open={studentDialogOpen} onOpenChange={() => setStudentDialogOpen(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={studentFormData.email}
                    onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                    required
                  />
      </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={studentFormData.password}
                    onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={studentFormData.full_name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, full_name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={studentFormData.department}
                    onChange={(e) => setStudentFormData({ ...studentFormData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    value={studentFormData.section}
                    onChange={(e) => setStudentFormData({ ...studentFormData, section: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input
                    value={studentFormData.roll_number}
                    onChange={(e) => setStudentFormData({ ...studentFormData, roll_number: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStudentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit Students</DialogTitle>
              <DialogDescription>
                Update {selectedStudents.size} selected students. Leave fields empty to keep current values.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkEdit(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={bulkEditData.department}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, department: e.target.value })}
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  value={bulkEditData.section}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, section: e.target.value })}
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select 
                  value={bulkEditData.present_year || "all"} 
                  onValueChange={(value) => setBulkEditData({ ...bulkEditData, present_year: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Keep current</SelectItem>
                    {getYearOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Students</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Promote Dialog */}
        <Dialog open={bulkPromoteDialogOpen} onOpenChange={setBulkPromoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Promote Students</DialogTitle>
              <DialogDescription>
                Promote {selectedStudents.size} selected students to the next year. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkPromoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkPromote} className="bg-gradient-primary">
                Promote Students
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block by Year Dialog */}
        <Dialog open={blockYearDialogOpen} onOpenChange={setBlockYearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{blockYearAction ? 'Block' : 'Unblock'} Students by Year</DialogTitle>
              <DialogDescription>
                {blockYearAction ? 'Block' : 'Unblock'} all students from a specific year in {selectedCollege?.name}. {blockYearAction ? 'Blocked' : 'Unblocked'} users {blockYearAction ? 'cannot' : 'can'} log in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleBlockYear(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Year to {blockYearAction ? 'Block' : 'Unblock'}</Label>
                <Select 
                  value={yearToBlock || "all"} 
                  onValueChange={(value) => setYearToBlock(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {getYearOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={blockYearAction ? "default" : "outline"}
                  onClick={() => setBlockYearAction(true)}
                  className="flex-1"
                >
                  Block
                </Button>
                <Button
                  type="button"
                  variant={!blockYearAction ? "default" : "outline"}
                  onClick={() => setBlockYearAction(false)}
                  className="flex-1"
                >
                  Unblock
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBlockYearDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant={blockYearAction ? "destructive" : "default"}
                >
                  {blockYearAction ? 'Block' : 'Unblock'} Year
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Block All Users in College Dialog */}
        <Dialog open={blockCollegeDialogOpen} onOpenChange={setBlockCollegeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{blockCollegeAction ? 'Block' : 'Unblock'} All Users in College</DialogTitle>
              <DialogDescription>
                {blockCollegeAction ? 'Block' : 'Unblock'} all users (students, faculty, HOD, admin) in {selectedCollege?.name}. {blockCollegeAction ? 'Blocked' : 'Unblocked'} users {blockCollegeAction ? 'cannot' : 'can'} log in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will {blockCollegeAction ? 'block' : 'unblock'} all users associated with this college. This action can be reversed.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={blockCollegeAction ? "default" : "outline"}
                  onClick={() => setBlockCollegeAction(true)}
                  className="flex-1"
                >
                  Block
                </Button>
                <Button
                  type="button"
                  variant={!blockCollegeAction ? "default" : "outline"}
                  onClick={() => setBlockCollegeAction(false)}
                  className="flex-1"
                >
                  Unblock
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBlockCollegeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant={blockCollegeAction ? "destructive" : "default"}
                  onClick={handleBlockCollege}
                >
                  {blockCollegeAction ? 'Block' : 'Unblock'} All Users
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete by Year Dialog */}
        <Dialog open={deleteYearDialogOpen} onOpenChange={setDeleteYearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Students by Year</DialogTitle>
              <DialogDescription>
                Delete all students from a specific year in {selectedCollege?.name}. This action cannot be undone!
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleDeleteByYear(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Year to Delete</Label>
                <Select 
                  value={yearToDelete || "all"} 
                  onValueChange={(value) => setYearToDelete(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {getYearOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteYearDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Delete All Students
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={staffEditDialogOpen} onOpenChange={setStaffEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Staff Details</DialogTitle>
              <DialogDescription>
                Update information for {selectedStaff?.email}
                {selectedStaff?.roles.some(r => r.role === 'hod') && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    (HOD - Head of Department)
                  </span>
                )}
                {selectedStaff?.roles.some(r => r.role === 'faculty') && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    (Faculty Member)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_staff_email">Email</Label>
                <Input
                  id="edit_staff_email"
                  value={selectedStaff?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff_full_name">Full Name</Label>
                <Input
                  id="edit_staff_full_name"
                  value={staffEditFormData.full_name}
                  onChange={(e) => setStaffEditFormData({ ...staffEditFormData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff_role">Role</Label>
                <Select
                  value={staffEditFormData.role}
                  onValueChange={(value) => setStaffEditFormData({ ...staffEditFormData, role: value })}
                >
                  <SelectTrigger id="edit_staff_role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                    <SelectItem value="admin">College Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Note: Super Admin role is not college-specific and cannot be assigned here</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff_college_id">College</Label>
                <Select
                  value={staffEditFormData.college_id?.toString() || "none"}
                  onValueChange={async (value) => {
                    const newCollegeId = value === "none" ? null : parseInt(value);
                    setStaffEditFormData({
                      ...staffEditFormData,
                      college_id: newCollegeId,
                      department: "", // Clear department when college changes
                    });
                    // Reload departments and sections for the new college
                    if (newCollegeId) {
                      await fetchDepartments(newCollegeId);
                      await fetchSections(newCollegeId);
                      await fetchSubjects(newCollegeId);
                      await fetchSemesters(newCollegeId);
                    } else {
                      setDepartments([]);
                      setSections([]);
                      setSubjects([]);
                      setSemesters([]);
                    }
                  }}
                >
                  <SelectTrigger id="edit_staff_college_id">
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

              {selectedStaff && (selectedStaff.roles.some(r => r.role === 'faculty') || selectedStaff.roles.some(r => r.role === 'hod') || selectedStaff.roles.some(r => r.role === 'admin') || selectedStaff.roles.some(r => r.role === 'super_admin')) && (
                <div className="space-y-2">
                  <Label htmlFor="edit_staff_staff_id">Staff ID</Label>
                  <Input
                    id="edit_staff_staff_id"
                    value={staffEditFormData.staff_id}
                    onChange={(e) => setStaffEditFormData({ ...staffEditFormData, staff_id: e.target.value })}
                    placeholder="e.g., STAFF001"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_staff_present_year">Present Year</Label>
                <Select
                  value={staffEditFormData.present_year || "none"}
                  onValueChange={(value) =>
                    setStaffEditFormData({
                      ...staffEditFormData,
                      present_year: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger id="edit_staff_present_year">
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
                <Label htmlFor="edit_staff_department">Department</Label>
                <Select
                  value={staffEditFormData.department || "none"}
                  onValueChange={(value) =>
                    setStaffEditFormData({
                      ...staffEditFormData,
                      department: value === "none" ? "" : value,
                    })
                  }
                  disabled={!staffEditFormData.college_id}
                >
                  <SelectTrigger id="edit_staff_department">
                    <SelectValue placeholder={staffEditFormData.college_id ? "Select department" : "Select college first"} />
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
                {!staffEditFormData.college_id && (
                  <p className="text-xs text-muted-foreground">Select a college first to see departments</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff_section">Section</Label>
                <Input
                  id="edit_staff_section"
                  value={staffEditFormData.section}
                  onChange={(e) => setStaffEditFormData({ ...staffEditFormData, section: e.target.value })}
                  placeholder="A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_staff_roll_number">Roll Number</Label>
                <Input
                  id="edit_staff_roll_number"
                  value={staffEditFormData.roll_number}
                  onChange={(e) => setStaffEditFormData({ ...staffEditFormData, roll_number: e.target.value })}
                  placeholder="21CS001"
                />
              </div>

              {selectedStaff && (selectedStaff.roles.some(r => r.role === 'faculty') || selectedStaff.roles.some(r => r.role === 'hod')) && (
                <>
                  <div className="space-y-2">
                    <Label>Years Handled</Label>
                    <div className="flex flex-wrap gap-2">
                      {['1st', '2nd', '3rd', '4th', '5th'].map((year) => (
                        <Button
                          key={year}
                          type="button"
                          variant={staffEditFormData.handled_years.includes(year) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updated = staffEditFormData.handled_years.includes(year)
                              ? staffEditFormData.handled_years.filter(y => y !== year)
                              : [...staffEditFormData.handled_years, year];
                            setStaffEditFormData({ ...staffEditFormData, handled_years: updated });
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
                            variant={staffEditFormData.handled_sections.includes(sec) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const updated = staffEditFormData.handled_sections.includes(sec)
                                ? staffEditFormData.handled_sections.filter(s => s !== sec)
                                : [...staffEditFormData.handled_sections, sec];
                              setStaffEditFormData({ ...staffEditFormData, handled_sections: updated });
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

              {selectedStaff && selectedStaff.roles.some(r => r.role === 'faculty') && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <Label>Subject Assignments</Label>
                  {staffEditFormData.subject_assignments.map((assignment, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={assignment.subject_id?.toString() || ""}
                          onValueChange={(value) => {
                            const updated = [...staffEditFormData.subject_assignments];
                            updated[index].subject_id = parseInt(value);
                            setStaffEditFormData({ ...staffEditFormData, subject_assignments: updated });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id.toString()}>
                                {subject.name} ({subject.code || 'N/A'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Select
                          value={assignment.semester_id?.toString() || ""}
                          onValueChange={(value) => {
                            const updated = [...staffEditFormData.subject_assignments];
                            updated[index].semester_id = value ? parseInt(value) : undefined;
                            setStaffEditFormData({ ...staffEditFormData, subject_assignments: updated });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Semester" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {semesters.map((semester) => (
                              <SelectItem key={semester.id} value={semester.id.toString()}>
                                {semester.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-48 space-y-2">
                        <Select
                          value={assignment.section_id?.toString() || ""}
                          onValueChange={(value) => {
                            const updated = [...staffEditFormData.subject_assignments];
                            if (value) {
                              const sectionObj = sections.find((s: any) => s.id.toString() === value);
                              updated[index].section_id = parseInt(value, 10);
                              updated[index].section = sectionObj?.name || "";
                            } else {
                              updated[index].section_id = undefined;
                              updated[index].section = "";
                            }
                            setStaffEditFormData({ ...staffEditFormData, subject_assignments: updated });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {sections.map((section) => (
                              <SelectItem key={section.id} value={section.id.toString()}>
                                {section.name}{section.department_name ? ` • ${section.department_name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setStaffEditFormData({ 
                          ...staffEditFormData, 
                          subject_assignments: staffEditFormData.subject_assignments.filter((_, i) => i !== index)
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
                    onClick={() => setStaffEditFormData({ 
                      ...staffEditFormData, 
                      subject_assignments: [...staffEditFormData.subject_assignments, { subject_id: 0, section_id: undefined, section: "" }]
                    })}
                  >
                    + Add Subject Assignment
                  </Button>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStaffEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Staff"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main colleges list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Colleges</h1>
          <p className="text-muted-foreground mt-1">Create and manage colleges, students, and analytics</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add College
        </Button>
      </div>

        {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading colleges...</p>
          </CardContent>
        </Card>
        ) : colleges.length === 0 ? (
          <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No colleges found. Create your first college!</p>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {colleges.map((college) => (
            <Card 
              key={college.id} 
              data-testid="college-card"
              className="shadow-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCollege(college)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{college.name}</CardTitle>
                <Badge variant="outline">{college.code}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {college.city && college.state && (
                  <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{college.city}, {college.state}</p>
                  </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(college);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(college.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create College Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New College</DialogTitle>
            <DialogDescription>
              Create a new college in the system. All changes are logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">College Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Swarna Bharathi Institute"
                  required
                />
      </div>
              <div className="space-y-2">
                <Label htmlFor="code">College Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SBIT"
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Complete address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Hyderabad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g., Telangana"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g., 500032"
                maxLength={10}
              />
      </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                Add College
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Student Row Component for inline editing
function StudentRow({ 
  student, 
  onUpdate, 
  onDelete, 
  onBlock 
}: { 
  student: Student; 
  onUpdate: (student: Student) => void;
  onDelete: (userId: number, userName: string) => void;
  onBlock: (userId: number, block: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: student.full_name || "",
    department: student.department || "",
    section: student.section || "",
    roll_number: student.roll_number || "",
    present_year: student.present_year || ""
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        ...student,
        ...editData
      });
      setIsEditing(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      full_name: student.full_name || "",
      department: student.department || "",
      section: student.section || "",
      roll_number: student.roll_number || "",
      present_year: student.present_year || ""
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <>
        <TableCell>
          <Input
            value={editData.full_name}
            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
            placeholder="Full Name"
            className="w-full"
          />
        </TableCell>
        <TableCell>{student.email}</TableCell>
        <TableCell>
          <Input
            value={editData.roll_number}
            onChange={(e) => setEditData({ ...editData, roll_number: e.target.value })}
            placeholder="Roll Number"
            className="w-full"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editData.department}
            onChange={(e) => setEditData({ ...editData, department: e.target.value })}
            placeholder="Department"
            className="w-full"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editData.section}
            onChange={(e) => setEditData({ ...editData, section: e.target.value })}
            placeholder="Section"
            className="w-full"
          />
        </TableCell>
        <TableCell>
          <Select 
            value={editData.present_year || "all"} 
            onValueChange={(value) => setEditData({ ...editData, present_year: value === "all" ? "" : value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select Year</SelectItem>
              {getYearOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </>
    );
  }

  return (
    <>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className={!student.is_active ? "text-muted-foreground line-through" : ""}>
            {student.full_name || "N/A"}
          </span>
          {!student.is_active && (
            <Badge variant="destructive" className="text-xs">Blocked</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className={!student.is_active ? "text-muted-foreground line-through" : ""}>
        {student.email}
      </TableCell>
      <TableCell className={!student.is_active ? "text-muted-foreground" : ""}>
        {student.roll_number || "N/A"}
      </TableCell>
      <TableCell className={!student.is_active ? "text-muted-foreground" : ""}>
        {student.department || "N/A"}
      </TableCell>
      <TableCell className={!student.is_active ? "text-muted-foreground" : ""}>
        {student.section || "N/A"}
      </TableCell>
      <TableCell>
        {student.present_year ? (
          <Badge variant={!student.is_active ? "destructive" : "outline"}>
            {formatYear(student.present_year)}
          </Badge>
        ) : (
          "N/A"
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant={student.is_active ? "outline" : "default"}
            onClick={() => {
              // If student is active, block them (block=true). If blocked, unblock them (block=false)
              const shouldBlock = student.is_active;
              onBlock(student.id, shouldBlock);
            }}
            className={student.is_active 
              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
              : "text-green-700 hover:text-green-800 hover:bg-green-50 bg-green-100 dark:bg-green-900"}
          >
            {student.is_active ? (
              <>
                <Ban className="h-4 w-4 mr-1" />
                Block
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-1" />
                Unblock
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => onDelete(student.id, student.full_name || student.email)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </TableCell>
    </>
  );
}
