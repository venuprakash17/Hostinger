import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bell, AlertCircle, Info, CheckCircle, Loader2, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  college_id?: number;
  department?: string;
  section?: string;
  present_year?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface College {
  id: number;
  name: string;
  code: string;
}

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "error",
    college_id: "",
    department: "",
    section: "",
    present_year: "",
    role: "",
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const data = await apiClient.get<College[]>("/colleges");
      setColleges(data || []);
    } catch (error: any) {
      console.error("Error fetching colleges:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listAnnouncements({ limit: 1000 });
      setAnnouncements(response.announcements || []);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      
      const announcementData: any = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
      };
      
      // Add targeting options
      if (formData.college_id && formData.college_id !== "all") {
        announcementData.college_id = parseInt(formData.college_id);
      }
      if (formData.department) {
        announcementData.department = formData.department;
      }
      if (formData.section) {
        announcementData.section = formData.section;
      }
      if (formData.present_year && formData.present_year !== "all") {
        announcementData.present_year = formData.present_year;
      }
      if (formData.role && formData.role !== "all") {
        announcementData.role = formData.role;
      }
      
      if (editingAnnouncement) {
        await apiClient.updateAnnouncement(editingAnnouncement.id, announcementData);
        toast({
          title: "Success",
          description: "Announcement updated successfully",
        });
      } else {
        await apiClient.createAnnouncement(announcementData);
        toast({
          title: "Success",
          description: "Announcement created successfully",
        });
      }
      
      setOpen(false);
      setEditingAnnouncement(null);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save announcement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      college_id: announcement.college_id?.toString() || "all",
      department: announcement.department || "",
      section: announcement.section || "",
      present_year: announcement.present_year || "all",
      role: announcement.role || "all",
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await apiClient.deleteAnnouncement(id);
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      await apiClient.updateAnnouncement(announcement.id, {
        is_active: !announcement.is_active
      });
      toast({
        title: "Success",
        description: `Announcement ${announcement.is_active ? "deactivated" : "activated"}`,
      });
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error toggling announcement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update announcement",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "info",
      college_id: "all",
      department: "",
      section: "",
      present_year: "all",
      role: "all",
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "error": return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Create popup announcements that show once per user based on their role, branch, etc.
          </p>
        </div>
        <Dialog 
          open={open} 
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingAnnouncement(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAnnouncement(null); resetForm(); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
              </DialogTitle>
              <DialogDescription>
                Create a popup that will show once to users matching the targeting criteria
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                />
              </div>
              
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  placeholder="Announcement message"
                  required
                />
              </div>
              
              <div>
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Targeting Options</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Leave options empty or set to "All" to target everyone. Combine options to narrow targeting.
                  </p>
                </div>

                <div>
                  <Label>College</Label>
                  <Select 
                    value={formData.college_id || "all"} 
                    onValueChange={(value) => setFormData({ ...formData, college_id: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select college (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colleges</SelectItem>
                      {colleges.map((college) => (
                        <SelectItem key={college.id} value={college.id.toString()}>
                          {college.name} ({college.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Role</Label>
                  <Select 
                    value={formData.role || "all"} 
                    onValueChange={(value) => setFormData({ ...formData, role: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="hod">HODs</SelectItem>
                      <SelectItem value="super_admin">Super Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Computer Science, Electronics (optional)"
                  />
                </div>

                <div>
                  <Label>Section</Label>
                  <Input
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g., A, B, C (optional)"
                  />
                </div>

                <div>
                  <Label>Year</Label>
                  <Select 
                    value={formData.present_year || "all"} 
                    onValueChange={(value) => setFormData({ ...formData, present_year: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1st">1st Year</SelectItem>
                      <SelectItem value="2nd">2nd Year</SelectItem>
                      <SelectItem value="3rd">3rd Year</SelectItem>
                      <SelectItem value="4th">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingAnnouncement ? "Update Announcement" : "Create Announcement"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingAnnouncement(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading announcements...</p>
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No announcements yet. Create your first announcement!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Announcements ({announcements.length})</CardTitle>
              <CardDescription>Manage popup announcements that show once per user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Targeting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getIcon(announcement.type)}
                            <div>
                              <p className="font-medium">{announcement.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {announcement.message}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{announcement.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {announcement.role && <div>Role: {announcement.role}</div>}
                            {announcement.department && <div>Dept: {announcement.department}</div>}
                            {announcement.section && <div>Section: {announcement.section}</div>}
                            {announcement.present_year && <div>Year: {announcement.present_year}</div>}
                            {!announcement.role && !announcement.department && !announcement.section && !announcement.present_year && (
                              <span className="text-muted-foreground">All users</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={announcement.is_active ? "default" : "secondary"}>
                            {announcement.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(announcement)}
                            >
                              {announcement.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(announcement)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(announcement.id)}
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

