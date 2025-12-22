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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Shield, UserPlus, Search, X, Upload, Filter, ArrowUpDown, Building2, MapPin, Calendar, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUpload } from "@/components/ui/file-upload";

interface Institution {
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
  institution_id: number | null;
  roles: Array<{ role: string; institution_id: number | null }>;
  is_active: boolean;
  created_at: string;
}

interface Admin {
  id: number;
  email: string;
  full_name: string | null;
  institution_id: number | null;
  roles: Array<{ role: string; institution_id: number | null }>;
  is_active: boolean;
  created_at: string;
}

type SortField = "name" | "code" | "city" | "state" | "created_at";
type SortDirection = "asc" | "desc";

export default function ManageInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounced search term for institutions
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Separate search for students/admins
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearchTerm, 300);
  const debouncedAdminSearch = useDebounce(adminSearchTerm, 300);
  
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
    full_name: ""
  });
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    full_name: ""
  });

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      fetchStudents();
      fetchAdmins();
    }
  }, [selectedInstitution]);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listInstitutions();
      setInstitutions(data);
    } catch (error: any) {
      console.error('Error fetching institutions:', error);
      toast.error(error.message || 'Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedInstitution) return;
    
    try {
      setStudentsLoading(true);
      const allUsers = await apiClient.get<any[]>(`/users?institution_id=${selectedInstitution.id}`);
      const institutionStudents = allUsers.filter((user: any) => 
        user.roles?.some((r: any) => r.role === 'institution_student' && r.institution_id === selectedInstitution.id)
      );
      setStudents(institutionStudents);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!selectedInstitution) return;
    
    try {
      setAdminsLoading(true);
      const allUsers = await apiClient.get<any[]>(`/users?institution_id=${selectedInstitution.id}`);
      const institutionAdmins = allUsers.filter((user: any) => 
        user.roles?.some((r: any) => r.role === 'institution_admin' && r.institution_id === selectedInstitution.id)
      );
      setAdmins(institutionAdmins);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      toast.error(error.message || 'Failed to fetch admins');
    } finally {
      setAdminsLoading(false);
    }
  };

  // Get unique states and cities for filters
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    institutions.forEach(inst => {
      if (inst.state) states.add(inst.state);
    });
    return Array.from(states).sort();
  }, [institutions]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    institutions.forEach(inst => {
      if (inst.city) cities.add(inst.city);
    });
    return Array.from(cities).sort();
  }, [institutions]);

  // Filter and sort institutions
  const filteredAndSortedInstitutions = useMemo(() => {
    const filtered = institutions.filter(institution => {
      // Use debounced search term for better performance
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !debouncedSearchTerm || 
        institution.name.toLowerCase().includes(searchLower) ||
        institution.code.toLowerCase().includes(searchLower) ||
        institution.city?.toLowerCase().includes(searchLower) ||
        institution.state?.toLowerCase().includes(searchLower);
      
      const matchesState = !filterState || institution.state === filterState;
      const matchesCity = !filterCity || institution.city === filterCity;
      const matchesStatus = !filterStatus || 
        (filterStatus === "active" && institution.is_active === "true") ||
        (filterStatus === "inactive" && institution.is_active !== "true");
      
      return matchesSearch && matchesState && matchesCity && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (sortField === "created_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || "";
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [institutions, debouncedSearchTerm, filterState, filterCity, filterStatus, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedInstitutions.length / itemsPerPage);
  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedInstitutions.slice(start, end);
  }, [filteredAndSortedInstitutions, currentPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = institutions.length;
    const active = institutions.filter(i => i.is_active === "true").length;
    const inactive = total - active;
    const totalStudents = students.length;
    const totalAdmins = admins.length;
    
    return { total, active, inactive, totalStudents, totalAdmins };
  }, [institutions, students, admins]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Name and code are required");
      return;
    }

    try {
      const createData = {
        ...formData,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pincode: formData.pincode || undefined,
      };
      await apiClient.createInstitution(createData);
      toast.success("Institution created successfully!");
      setDialogOpen(false);
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        is_active: "true"
      });
      fetchInstitutions();
    } catch (error: any) {
      console.error('Error creating institution:', error);
      toast.error(error.message || 'Failed to create institution');
    }
  };

  const handleUpdate = async () => {
    if (!selectedInstitution) return;

    try {
      await apiClient.updateInstitution(selectedInstitution.id, formData);
      toast.success("Institution updated successfully!");
      setEditDialogOpen(false);
      fetchInstitutions();
      if (selectedInstitution) {
        const updated = await apiClient.getInstitution(selectedInstitution.id);
        setSelectedInstitution(updated);
      }
    } catch (error: any) {
      console.error('Error updating institution:', error);
      toast.error(error.message || 'Failed to update institution');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this institution? This action cannot be undone and will affect all associated users and data.")) {
      return;
    }

    try {
      await apiClient.deleteInstitution(id);
      toast.success("Institution deleted successfully!");
      if (selectedInstitution?.id === id) {
        setSelectedInstitution(null);
      }
      fetchInstitutions();
    } catch (error: any) {
      console.error('Error deleting institution:', error);
      toast.error(error.message || 'Failed to delete institution');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedInstitution || !studentFormData.email || !studentFormData.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      const response = await apiClient.post<Student>(
        `/users?institution_id=${selectedInstitution.id}`,
        {
          ...studentFormData,
          role: "institution_student"
        }
      );
      
      toast.success("Student added successfully!");
      setStudentDialogOpen(false);
      setStudentFormData({
        email: "",
        password: "",
        full_name: ""
      });
      await fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedInstitution || !adminFormData.email || !adminFormData.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      const response = await apiClient.post<Admin>(
        `/users?institution_id=${selectedInstitution.id}`,
        {
          ...adminFormData,
          role: "institution_admin"
        }
      );
      
      toast.success("Admin added successfully!");
      setAdminDialogOpen(false);
      setAdminFormData({
        email: "",
        password: "",
        full_name: ""
      });
      await fetchAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error(error.message || 'Failed to add admin');
    }
  };

  const openEditDialog = (institution: Institution) => {
    setSelectedInstitution(institution);
    setFormData({
      name: institution.name,
      code: institution.code,
      address: institution.address || "",
      city: institution.city || "",
      state: institution.state || "",
      pincode: institution.pincode || "",
      is_active: institution.is_active
    });
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterState("");
    setFilterCity("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm) return students;
    return students.filter(student =>
      student.email.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
  }, [students, debouncedStudentSearch]);

  const filteredAdmins = useMemo(() => {
    if (!debouncedAdminSearch) return admins;
    const searchLower = debouncedAdminSearch.toLowerCase();
    return admins.filter(admin =>
      admin.email.toLowerCase().includes(searchLower) ||
      admin.full_name?.toLowerCase().includes(searchLower)
    );
  }, [admins, debouncedAdminSearch]);

  const exportToCSV = () => {
    const headers = ["Name", "Code", "City", "State", "Address", "Pincode", "Status", "Created At"];
    const rows = filteredAndSortedInstitutions.map(inst => [
      inst.name,
      inst.code,
      inst.city || "",
      inst.state || "",
      inst.address || "",
      inst.pincode || "",
      inst.is_active === "true" ? "Active" : "Inactive",
      new Date(inst.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `institutions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading institutions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Institutions</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage institutions with admin and student roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Institution
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Institutions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Badge variant="default" className="h-8 w-8 rounded-full flex items-center justify-center">
                {stats.active}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <Badge variant="secondary" className="h-8 w-8 rounded-full flex items-center justify-center">
                {stats.inactive}
              </Badge>
            </div>
          </CardContent>
        </Card>
        {selectedInstitution && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Selected Institution</p>
                  <p className="text-lg font-bold truncate max-w-[150px]">{selectedInstitution.name}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Institutions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Institutions ({filteredAndSortedInstitutions.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search institutions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={filterState} onValueChange={(value) => { setFilterState(value); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterCity} onValueChange={(value) => { setFilterCity(value); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-2">
                    Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("code")}>
                  <div className="flex items-center gap-2">
                    Code
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("city")}>
                  <div className="flex items-center gap-2">
                    City
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("state")}>
                  <div className="flex items-center gap-2">
                    State
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-2">
                    Created
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInstitutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No institutions found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInstitutions.map((institution) => (
                  <TableRow
                    key={institution.id}
                    className={selectedInstitution?.id === institution.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
                    onClick={() => setSelectedInstitution(institution)}
                  >
                    <TableCell className="font-medium">{institution.name}</TableCell>
                    <TableCell><Badge variant="outline">{institution.code}</Badge></TableCell>
                    <TableCell>{institution.city || "-"}</TableCell>
                    <TableCell>{institution.state || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={institution.is_active === "true" ? "default" : "secondary"}>
                        {institution.is_active === "true" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(institution.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(institution);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(institution.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedInstitutions.length)} of {filteredAndSortedInstitutions.length} institutions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Institution Details */}
      {selectedInstitution && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedInstitution.name}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">{selectedInstitution.code}</Badge>
                  </div>
                  {selectedInstitution.city && selectedInstitution.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedInstitution.city}, {selectedInstitution.state}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => openEditDialog(selectedInstitution)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Institution
              </Button>
            </div>
          </CardHeader>

          <Tabs defaultValue="students" className="space-y-4">
            <TabsList>
              <TabsTrigger value="students">
                <Users className="h-4 w-4 mr-2" />
                Students ({students.length})
              </TabsTrigger>
              <TabsTrigger value="admins">
                <Shield className="h-4 w-4 mr-2" />
                Admins ({admins.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button onClick={() => setStudentDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>

              {/* Bulk Upload Section */}
              <div className="mb-6">
                <FileUpload
                  endpoint="/bulk-upload/institution-students"
                  accept=".csv,.xlsx,.xls"
                  label="Bulk Upload Students"
                  description="Upload a CSV or Excel file to bulk add students to this institution. Make sure to download the template first to ensure correct format."
                  templateUrl="/bulk-upload/template/institution-students"
                  templateFileName="institution_student_upload_template.csv"
                  queryParams={{ institution_id: selectedInstitution.id }}
                  onSuccess={(result) => {
                    toast.success(`Successfully imported ${result.success_count} students!`);
                    fetchStudents();
                  }}
                  onError={(error) => {
                    toast.error(error.message || 'Failed to upload students');
                  }}
                />
              </div>

              {studentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading students...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Badge variant={student.is_active ? "default" : "secondary"}>
                              {student.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(student.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="admins" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search admins..."
                    value={adminSearchTerm}
                    onChange={(e) => setAdminSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button onClick={() => setAdminDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </div>

              {adminsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading admins...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No admins found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdmins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            {admin.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            <Badge variant={admin.is_active ? "default" : "secondary"}>
                              {admin.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(admin.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Create Institution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Institution</DialogTitle>
            <DialogDescription>
              Add a new institution to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Institution name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Unique code"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Pincode"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Institution Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Institution</DialogTitle>
            <DialogDescription>
              Update institution details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Institution name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Unique code"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-pincode">Pincode</Label>
              <Input
                id="edit-pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Pincode"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.is_active} onValueChange={(value) => setFormData({ ...formData, is_active: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Add a new student to {selectedInstitution?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student-email">Email *</Label>
              <Input
                id="student-email"
                type="email"
                value={studentFormData.email}
                onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                placeholder="student@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-password">Password *</Label>
              <Input
                id="student-password"
                type="password"
                value={studentFormData.password}
                onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
                placeholder="Password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-name">Full Name</Label>
              <Input
                id="student-name"
                value={studentFormData.full_name}
                onChange={(e) => setStudentFormData({ ...studentFormData, full_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent}>Add Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Add a new admin to {selectedInstitution?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminFormData.email}
                onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password *</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminFormData.password}
                onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                placeholder="Password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                value={adminFormData.full_name}
                onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdmin}>Add Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
