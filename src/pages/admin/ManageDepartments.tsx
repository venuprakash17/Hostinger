import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus, Edit, Trash2, Search } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";

interface Department {
  id: number;
  name: string;
  code: string | null;
  branch_id?: string | null;
  college_id: number;
  is_active: boolean;
  number_of_years?: number | null;
  vertical?: string | null;
  college_name?: string;
}

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

export default function ManageDepartments() {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [viewAllDepartments, setViewAllDepartments] = useState(false); // For super admin to view all

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [numberOfYears, setNumberOfYears] = useState<string>("");
  const [vertical, setVertical] = useState<string>("");
  const [customVertical, setCustomVertical] = useState<string>("");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [editFormData, setEditFormData] = useState({
      name: "",
      code: "",
      branch_id: "",
      number_of_years: "",
      vertical: "",
      custom_vertical: "",
    });

  useEffect(() => {
    fetchUserProfile();
    if (isSuperAdmin) {
      fetchColleges();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      if (viewAllDepartments || !selectedCollegeId) {
        fetchDepartments();
      } else {
        fetchDepartments();
      }
    } else if (collegeId) {
      fetchDepartments();
    }
  }, [collegeId, selectedCollegeId, isSuperAdmin, viewAllDepartments]);
  
  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<any[]>('/colleges');
      setColleges(data || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

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

  const fetchDepartments = async () => {
    try {
      let effectiveCollegeId: number | undefined;
      if (isSuperAdmin) {
        effectiveCollegeId = viewAllDepartments ? undefined : (selectedCollegeId || undefined);
      } else {
        effectiveCollegeId = collegeId || undefined;
      }
      
      console.log('[ManageDepartments] Fetching departments:', {
        isSuperAdmin,
        viewAllDepartments,
        selectedCollegeId,
        effectiveCollegeId,
        collegeId
      });
      
      const data = await apiClient.getDepartments(effectiveCollegeId);
      console.log('[ManageDepartments] Received', data?.length || 0, 'departments');
      
      // Enrich with college names for super admin viewing all departments
      let enriched = data || [];
      if (isSuperAdmin && (viewAllDepartments || !selectedCollegeId) && colleges.length > 0) {
        // Enrich with college names when viewing all or when no college is selected
        enriched = enriched.map((dept: any) => {
          const college = colleges.find(c => c.id === dept.college_id);
          return { ...dept, college_name: college?.name || 'Unknown College' };
        });
      }
      
      console.log('[ManageDepartments] Setting departments:', enriched.length);
      setDepartments(enriched);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error(error.message || 'Failed to fetch departments');
    }
  };
  

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name) {
      toast.error("Department name is required");
      setLoading(false);
      return;
    }

    if (!numberOfYears) {
      toast.error("Please enter the number of years for this department");
      setLoading(false);
      return;
    }

    const yearsValue = parseInt(numberOfYears, 10);
    if (Number.isNaN(yearsValue) || yearsValue <= 0) {
      toast.error("Number of years must be a positive number");
      setLoading(false);
      return;
    }

    const verticalValue = vertical === "Other" ? customVertical.trim() : vertical;
    if (!verticalValue) {
      toast.error("Please select the academic vertical for this department");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        name,
        code: code || undefined,
        branch_id: branchId || undefined,
        number_of_years: yearsValue,
        vertical: verticalValue,
      };

      // For super admin, college_id is required
      if (isSuperAdmin && !selectedCollegeId) {
        toast.error("Please select a college");
        setLoading(false);
        return;
      }

      if (isSuperAdmin) {
        payload.college_id = selectedCollegeId;
      }

      await apiClient.createDepartment(payload);
      toast.success("Department created successfully!");
      
      // Clear form
      setName("");
      setCode("");
      setBranchId("");
      setNumberOfYears("");
      setVertical("");
      setCustomVertical("");
      
      // Refresh departments after creation
      if (isSuperAdmin) {
        if (viewAllDepartments) {
          await fetchDepartments();
        } else if (selectedCollegeId && payload.college_id === selectedCollegeId) {
          await fetchDepartments();
        } else {
          setViewAllDepartments(true);
          setSelectedCollegeId(null);
          await fetchDepartments();
        }
      } else {
        await fetchDepartments();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (dept: Department) => {
    setSelectedDepartment(dept);

    const existingVertical = dept.vertical || "";
    const isPresetVertical = existingVertical && verticalOptions.includes(existingVertical);

    setEditFormData({
      name: dept.name,
      code: dept.code || "",
      branch_id: dept.branch_id || "",
      number_of_years: dept.number_of_years ? dept.number_of_years.toString() : "",
      vertical: isPresetVertical ? existingVertical : existingVertical ? "Other" : "",
      custom_vertical: isPresetVertical ? "" : existingVertical || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;

    setLoading(true);
    const yearsValue = editFormData.number_of_years ? parseInt(editFormData.number_of_years, 10) : NaN;
    if (Number.isNaN(yearsValue) || yearsValue <= 0) {
      toast.error("Number of years must be a positive number");
      setLoading(false);
      return;
    }

    const verticalValue = editFormData.vertical === "Other"
      ? editFormData.custom_vertical.trim()
      : editFormData.vertical;

    if (!verticalValue) {
      toast.error("Please select the academic vertical for this department");
      setLoading(false);
      return;
    }

    try {
      await apiClient.put(`/academic/departments/${selectedDepartment.id}`, {
        name: editFormData.name,
        code: editFormData.code || undefined,
        branch_id: editFormData.branch_id || undefined,
        number_of_years: yearsValue,
        vertical: verticalValue,
      });
      toast.success("Department updated successfully!");
      setEditDialogOpen(false);
      setSelectedDepartment(null);
      await fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    setLoading(true);
    try {
      await apiClient.put(`/academic/departments/${id}`, { is_active: false });
      toast.success("Department deactivated successfully!");
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const searchLower = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(searchLower) ||
      (dept.code && dept.code.toLowerCase().includes(searchLower)) ||
      (dept.vertical && dept.vertical.toLowerCase().includes(searchLower)) ||
      (dept.number_of_years && dept.number_of_years.toString().includes(searchLower)) ||
      (isSuperAdmin && viewAllDepartments && dept.college_name && dept.college_name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Manage Departments</h1>
          <p className="text-muted-foreground">
            Create and manage branches with codes, academic verticals, and number of years.
          </p>
        </div>
      </div>

      <Tabs defaultValue="view" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">View Branches</TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Create Branch
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing Branches</CardTitle>
                  <CardDescription>
                    {isSuperAdmin 
                      ? (viewAllDepartments ? "Viewing branches across all colleges" : "Branches for the selected college")
                      : "Branches available in your college"}
                  </CardDescription>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewAllDepartments ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newViewAll = !viewAllDepartments;
                        setViewAllDepartments(newViewAll);
                        if (newViewAll) {
                          setSelectedCollegeId(null);
                        }
                      }}
                    >
                      {viewAllDepartments ? "View Selected College" : "View All Colleges"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isSuperAdmin && !viewAllDepartments && (
                  <div className="space-y-2">
                    <Label>Filter by College</Label>
                    <Select 
                      value={selectedCollegeId?.toString() || ""} 
                      onValueChange={(value) => {
                        if (value === "" || value === "none") {
                          setSelectedCollegeId(null);
                          setViewAllDepartments(true);
                        } else {
                          setSelectedCollegeId(parseInt(value));
                          setViewAllDepartments(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a college to view branches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Colleges</SelectItem>
                        {colleges.map((college) => (
                          <SelectItem key={college.id} value={college.id.toString()}>
                            {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search branches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {filteredDepartments.length === 0 ? (
                  <div className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No branches match your search." : "No branches found. Create one to get started."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isSuperAdmin && viewAllDepartments && <TableHead>College</TableHead>}
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Branch ID</TableHead>
                        <TableHead>Vertical</TableHead>
                        <TableHead>Years</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepartments.map((dept) => (
                        <TableRow key={dept.id}>
                          {isSuperAdmin && viewAllDepartments && (
                            <TableCell className="font-medium">{dept.college_name || "N/A"}</TableCell>
                          )}
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{dept.code || "N/A"}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 rounded">{dept.branch_id || "N/A"}</code></TableCell>
                          <TableCell>{dept.vertical || "N/A"}</TableCell>
                          <TableCell>{typeof dept.number_of_years === "number" ? dept.number_of_years : "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditDialog(dept)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteDepartment(dept.id)}
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
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Branch
              </CardTitle>
              <CardDescription>
                Define branch code, vertical, and academic duration for your college
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="college">College *</Label>
                    <Select 
                      value={selectedCollegeId?.toString() || ""} 
                      onValueChange={(value) => setSelectedCollegeId(value ? parseInt(value) : null)}
                    >
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
                
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Computer Science"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Branch Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CSE"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchId">Branch ID (Unique Identifier)</Label>
                  <Input
                    id="branchId"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    placeholder="CSE001 (auto-generated from code if not provided)"
                  />
                  <p className="text-sm text-muted-foreground">
                    Unique identifier for this branch. If not provided, will be auto-generated from branch code.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years">Number of Years *</Label>
                  <Input
                    id="years"
                    type="number"
                    min={1}
                    max={10}
                    value={numberOfYears}
                    onChange={(e) => setNumberOfYears(e.target.value)}
                    placeholder="4"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vertical">Vertical *</Label>
                  <Select
                    value={vertical || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setVertical("");
                        setCustomVertical("");
                      } else if (value === "Other") {
                        setVertical("Other");
                      } else {
                        setVertical(value);
                        setCustomVertical("");
                      }
                    }}
                  >
                    <SelectTrigger id="vertical">
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
                  {vertical === "Other" && (
                    <Input
                      className="mt-2"
                      value={customVertical}
                      onChange={(e) => setCustomVertical(e.target.value)}
                      placeholder="Enter vertical name"
                      required
                    />
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Branch"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Department Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDepartment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Department Name</Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Computer Science"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_code">Department Code</Label>
              <Input
                id="edit_code"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                placeholder="CSE"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_branch_id">Branch ID (Unique Identifier)</Label>
              <Input
                id="edit_branch_id"
                value={editFormData.branch_id}
                onChange={(e) => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                placeholder="CSE001"
              />
              <p className="text-sm text-muted-foreground">
                Unique identifier for this branch. Must be unique across all departments.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_years">Number of Years</Label>
              <Input
                id="edit_years"
                type="number"
                min={1}
                max={10}
                value={editFormData.number_of_years}
                onChange={(e) => setEditFormData({ ...editFormData, number_of_years: e.target.value })}
                placeholder="4"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_vertical">Vertical</Label>
              <Select
                value={editFormData.vertical || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setEditFormData({ ...editFormData, vertical: "", custom_vertical: "" });
                  } else if (value === "Other") {
                    setEditFormData({ ...editFormData, vertical: "Other" });
                  } else {
                    setEditFormData({ ...editFormData, vertical: value, custom_vertical: "" });
                  }
                }}
              >
                <SelectTrigger id="edit_vertical">
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
              {editFormData.vertical === "Other" && (
                <Input
                  className="mt-2"
                  value={editFormData.custom_vertical}
                  onChange={(e) => setEditFormData({ ...editFormData, custom_vertical: e.target.value })}
                  placeholder="Enter vertical name"
                  required
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

